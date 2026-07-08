# 视频生成链路稳定性与成本优化迭代记录

日期：2026-07-07

环境：`/Users/hanmingyu/Downloads/拾贝/拾贝-test-feature-20260705`

分支：`codex/test-feature-env-20260705`

## 背景

视频链接链路已经可以把抖音/小红书公开视频提取成 `LearningSource`，并交给 V2 出题系统。但真实小红书视频样本跑到 `matchingDraft` 阶段后，模型输出的连线题出现重复 `rightId`，导致合同校验失败，整章生成状态变为 `failed_generation`。

同时，真实联调中反复跑同一个视频样本会多次调用 TikHub。TikHub 按调用计费，重复调试和重试会把取源费用放大到超过模型费用。

## 本次修复目标

1. 让连线题生成对模型机械性 ID 重复更稳，不因为可修复结构错误整章失败。
2. 降低重复视频提取带来的 TikHub 调用成本。
3. 保留可审计记录，明确这次改动如何验证、后续如何迭代。

## 修复一：连线题 `rightId` 重复容错

提交：`082a43b fix: harden matching draft pair normalization`

### 问题

模型在 `matchingDraft` 中可能生成这样的结构错误：

```json
{
  "pairs": [
    { "leftId": "l1", "rightId": "r1" },
    { "leftId": "l2", "rightId": "r2" },
    { "leftId": "l3", "rightId": "r2" }
  ]
}
```

这类错误不是视频取源或视觉理解直接造成的，但视频内容块更多、题目阶段更多，会放大模型偶发结构错误的概率。

### 处理方式

- 在 `matchingDraft` prompt 中显式要求每个 `leftId` 和 `rightId` 只能使用一次。
- 新增 `normalizeMatchingDraftOutput`，只修复可确定的机械性重复：
  - `leftItems`、`rightItems`、`pairs` 数量一致。
  - 所有引用 ID 都存在。
  - `leftId` 没有重复。
  - 只有 `rightId` 出现重复，且刚好存在未使用的 `rightId`。
- 无法安全判断的情况仍然交给 validator 失败，不把语义不明的题硬改成通过。

### 影响范围

- `backend/src/v2/generation/prompts/matchingDraft.js`
- `backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- `backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- 对应 V2 prompt 和 pipeline 测试

## 修复二：视频提取缓存

提交：`05b4456 feat: cache video extraction results`

### 问题

同一个公开视频链接在以下场景会重复消耗 TikHub 调用：

- 开发调试反复跑同一个样本。
- 生成题目失败后重试。
- 用户重复提交同一个链接。
- worker 或任务重跑。

### 处理方式

新增两层缓存：

1. `videoSourceCache`
   - 缓存 TikHub 返回的视频元数据、播放地址、字幕轨道等结构化结果。
   - 目标是让同一链接重复提取时不再重复调用 TikHub。
   - 默认 TTL：7 天。

2. `learningSourceCache`
   - 缓存完整 `LearningSource`。
   - 目标是生成题目重试时不重新取源、下载、抽帧、字幕、视觉理解。
   - 默认 TTL：30 天。

缓存 key 使用归一化 URL 和版本号生成。URL 会去掉 hash、规范 host/protocol、排序 query 参数。缓存值读写时会 clone，避免调用方修改缓存对象。

### 成本口径

- 完整缓存命中时记录 `video_learning_source_cache`。
- TikHub 解析缓存命中时，`tikhub_fetch` 的 provider 记录为 `cache:tikhub`，并带 `cacheHit: true`。
- 第二次完整命中时，返回的 `mediaUsage` 只记录本次缓存命中，不复用第一次下载/ASR/视觉理解的成本统计。

### 影响范围

- `backend/src/media/videoExtractionCache.js`
- `backend/src/media/extractVideoLearningSource.js`
- `backend/package.json`
- 对应 media tests

## 验证

已通过：

```bash
node --test backend/src/v2/generation/prompts/promptSchemas.test.js backend/src/v2/generation/pipeline/v2GenerationProgram.test.js
npm --prefix backend run check:video-source
```

关键验证点：

- 重复 `rightId` 的 matching draft 可以在 validator 前被安全修复。
- V2 pipeline 遇到机械性重复 `rightId` 不再整章失败。
- `videoSourceCache` 生效时，两次提取只调用一次 provider。
- `learningSourceCache` 生效时，第二次不再 provider/download/audio。
- 完整视频链路 110 个相关测试通过。

## 当前边界

- 现阶段缓存实现是进程内 TTL cache，适合先降低单 worker 内重复调试、重试和短期重复提交成本。
- 多实例生产部署时，如果需要跨进程共享缓存，应把相同接口接到 Redis、Postgres 或对象存储索引。
- 本次没有实现分布式 singleflight，同一链接在不同进程同时进入时仍可能并发调用 TikHub。
- 本次没有改变题型规划策略，也没有根据视频/文章来源调整出题系统。

## 后续建议

1. 把 `videoExtractionCache` 接入持久化存储，优先 Redis 或现有 Postgres。
2. 增加同一 cache key 的 singleflight/lock，防止并发瞬间重复调用 TikHub。
3. 在质量报告中展示 `cacheHit`、TikHub 实际调用次数、Qwen 视觉调用次数和估算成本。
4. 用真实视频样本回放完整 V2 出题，确认这次连线题容错能让之前失败样本生成完成。

## 2026-07-08 补充：视频 V2 质量 runner 与真实样本回归

提交：

- `326b1c2 chore: add video v2 quality runner`
- `d368316 fix: preserve video content basis in v2 reports`

### 本次新增

- 新增 `backend/scripts/run-video-v2-quality-experiment.mjs`。
- 该 runner 串起：
  - TikHub 视频解析。
  - 本地 ASR / 平台字幕。
  - CRV-style 抽帧。
  - Qwen-VL 视觉增强。
  - V2 出题。
  - HTML/JSON 质量报告。
  - 媒体链路和出题模型成本汇总。
- V2 deterministic source map 现在会优先保留视频提取后的 grouped source blocks，避免把每句字幕重新切成一个 source block。
- V2 source 会保留 `contentBasis`，用于前端展示“已结合视频字幕和画面信息生成”或“本次主要基于视频字幕生成”；后端调试状态仍放在 media/debug 报告中，不直接暴露给用户。

### 真实样本结果

样本：抖音 `多Agent协作通信怎么设计`

产物：

- JSON：`docs/quality-runs/video-link/douyin-multi-agent-communication/runs/20260708-162425-20260708-douyin-multi-agent-communication-visual-runner.json`
- HTML：`docs/quality-runs/video-link/douyin-multi-agent-communication/reports/20260708-162425-20260708-douyin-multi-agent-communication-visual-runner.html`
- Matrix：`docs/quality-runs/video-link/provider-evaluation/provider-matrix-2026-07.md`

结果摘要：

- 状态：completed。
- Source blocks：16。
- Units：3。
- Questions：11。
- TikHub calls：1。
- 媒体链路估算成本：USD 0.001422。
- DeepSeek 出题实际成本：USD 0.005670。
- Qwen-VL：成功，13 frames / 2 grids / 1 visual segment。
- 诊断：1 条 warning，类型为 option tone cue；无运行重试、无结构失败。

### 结论

- “ASR/字幕主链路 + 视觉增强”策略成立：视觉成功时可以补充 source；视觉失败仍应降级到文本主链路。
- TikHub 成本已被控制到单次真实跑 1 call；继续需要持久化缓存和并发 singleflight 来覆盖生产多实例场景。
- 本次 runner 让后续视频样本回归可重复，不再需要手工拼成本报告。
