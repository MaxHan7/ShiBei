# 拾贝 V2 后端前端联调基础设施 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不继续大改出题质量链路的前提下，把 V2 后端生成系统补齐成可接 SwiftUI 前端的稳定基础设施：前端能看到生成进度，生成状态能持久化，失败能按成熟策略恢复或清晰失败，输入 token 有保护上限，最终返回给前端的数据合同稳定且轻量。

**Architecture:** 沿用旧版已经存在的 `chapters + generation_jobs + current_stage + generationMeta.stages` 基础思路，但给 V2 建立独立的生成进度合同、失败策略、输入保护和生产 serializer。V2 出题 pipeline 继续保持 DSPy 风格的金字塔结构：上游输出必要中间结构，下游按 unit scoped context 生成题目；ECD 继续作为 prompt 设计原则融入各阶段，不把 ECD 思考链大量暴露给前端。

**Tech Stack:** Node.js backend under `experiments/shibei-v2/backend/`, existing PostgreSQL-backed `db.js` queue helpers, V2 generation modules under `src/v2/generation/`, V2 frontend contract docs under `experiments/shibei-v2/docs/`.

---

## 当前背景

最近一轮 V2 质量实验已经把核心出题链路收敛到相对可用状态：

- `taskBriefPlan` 已改成按 unit scoped context 传递，避免每个下游任务重复吃整篇原文。
- `sourceMap` 默认 deterministic，避免让模型重吐整篇原文。
- `generationMeta` 已有 debug / production 分流方向，生产返回应继续瘦身。
- `unitKnowledgeMap` 已引入 compact retry，用短 `summary` 和 `primaryEvidenceAngle` 降低 JSON 失败风险。
- 最近一轮测试报告为：
  - `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/20260624-165557-v2-unit-map-compact-retry-rerun.html`
  - `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/20260624-165557-v2-unit-map-compact-retry-rerun.json`

这份计划不再优先抠题目质量细节，而是先补齐“真实产品可运行”的五个后端技术点。

## 旧版可参考点

当前旧版 backend 已有一套可以参考但需要 V2 化的基础设施：

- `experiments/shibei-v2/backend/src/db.js`
  - `generation_jobs` 表保存 `status`、`current_stage`、`queue_status`、`attempt_count`、`max_attempts`、`locked_until`、`available_at`、`last_error`。
  - `enqueueGenerationJob`、`claimNextGenerationJob`、`completeGenerationJob`、`failGenerationJob` 已经具备队列、锁、重试延迟的雏形。
- `experiments/shibei-v2/backend/src/generationJobRunner.js`
  - 旧版 worker 会调用 `updateStoredChapterStage`，把 `currentStage` 和 `generationMeta.stages` 写回 chapter。
  - 旧版 `isRetryableGenerationError` 已经把部分不可重试错误排除。
- `experiments/shibei-v2/backend/src/generation/types.js`
  - 旧版阶段文案只有 `extracting_content`、`generating_points`、`generating_questions` 等粗粒度状态。

结论：

- 可以复用旧版“job queue + chapter status + stage timeline”的工程结构。
- 不应该直接复用旧版阶段枚举，因为 V2 pipeline 阶段更多，前端也需要更细的动态提示。
- 不应该直接复用旧版失败文案，因为 V2 要区分输入过长、模型暂时失败、结构化输出失败、质量生成失败、网络/服务不可用等。

## 业界失败策略参考

本计划的失败策略参考以下成熟资料：

- AWS Builders Library, [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)：重试必须配合 timeout、backoff、jitter，并优先保证 API 幂等，避免副作用重复执行。
- Azure Architecture Center, [Transient Fault Handling](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults)：只对瞬时故障做有限重试，并按业务操作选择合适延迟。
- Azure Architecture Center, [Retry Storm antipattern](https://learn.microsoft.com/en-us/azure/architecture/antipatterns/retry-storm/)：限制重试次数和持续时间，避免无界 retry 形成风暴。
- Google Cloud, [Retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy)：推荐对符合响应条件和幂等条件的请求使用 exponential backoff with jitter。
- Azure Architecture Center, [Circuit Breaker pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)：当下游持续失败时，retry 和 circuit breaker 可以配合使用，避免继续打爆不可用服务。

落到拾贝 V2：

- 不对所有错误盲目重试。
- 模型调用内部可做短重试；整章 job 层只重试瞬时错误。
- 用户看到的是“正在重试/生成失败可重新生成”的产品状态，不暴露底层 JSON parse 等工程细节。
- 提交生成任务要幂等，避免同一篇文章重复创建多个正在生成的章节。

## 五个技术点和优先级

### 1. 前端可见的 V2 生成进度

用户明确要求：前端需要知道模型正在做哪一步，并用动态提示告诉用户。

目标：

- SwiftUI 全部章节页在生成中卡片、生成中弹窗、通知页都可以读取同一份 `generationProgress`。
- 不让前端猜阶段，不让前端直接读模型内部 stage 名。
- 进度文案既能表达真实工作，也不能暴露不适合用户理解的技术细节。

建议阶段合同：

```ts
type V2GenerationStatus =
  | "queued"
  | "running"
  | "retrying"
  | "completed"
  | "failed";

type V2GenerationStage =
  | "accepted"
  | "extracting_source"
  | "planning_review_path"
  | "mapping_knowledge"
  | "planning_practice"
  | "generating_questions"
  | "generating_unit_copy"
  | "finalizing"
  | "completed"
  | "failed";

type V2GenerationProgress = {
  jobId: string;
  chapterId: string;
  status: V2GenerationStatus;
  stage: V2GenerationStage;
  displayText: string;
  progress: number | null;
  retryCount: number;
  canRetry: boolean;
  updatedAt: string;
  failureCode?: string;
  failureMessage?: string;
};
```

建议用户文案：

- `accepted`: "已收到文章，准备生成"
- `extracting_source`: "正在整理正文"
- `planning_review_path`: "正在拆分章节脉络"
- `mapping_knowledge`: "正在提取关键知识点"
- `planning_practice`: "正在规划练习重点"
- `generating_questions`: "正在生成复习题"
- `generating_unit_copy`: "正在整理单元总结"
- `finalizing`: "正在收尾"
- `retrying`: "生成遇到波动，正在自动重试"
- `completed`: "已生成"
- `failed`: "生成失败，请稍后重试"

执行步骤：

- [ ] 新增 `experiments/shibei-v2/backend/src/v2/generation/generationProgress.js`。
- [ ] 在该文件内定义 V2 stage 到用户文案和粗略 progress 的映射。
- [ ] 在 `runV2GenerationProgram` 或外层 job runner 中接受 `onProgress(event)`。
- [ ] 在每个 pipeline 关键边界调用 `onProgress`，不要每次模型 retry 都向前端刷太多噪声。
- [ ] 更新 `runV2GenerationJob`，把 V2 progress 写入 chapter 的 `generationMeta.v2Progress` 和 `generationMeta.stages`。
- [ ] 更新 server serializer，让章节列表/章节详情返回 `generationProgress`。
- [ ] 测试：模拟 V2 job，断言 stage 顺序、文案、失败态、retrying 态都稳定。

关键文件：

- `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js`
- `experiments/shibei-v2/backend/src/server.js`
- `experiments/shibei-v2/backend/src/v2/serializers/reviewPathClientSerializer.js`
- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationProgress.js`
- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationProgress.test.js`

### 2. V2 生成状态持久化

用户要求：可以参考旧版本方案，但要看旧版有没有问题并优化。

旧版优点：

- 已有 `generation_jobs` 表，可以保存 job 状态、锁、重试次数、payload。
- 已有 chapter 上的 `generationMeta.stages` 时间线。
- 已有 worker 断点恢复和 interrupted 标记雏形。

旧版不足：

- stage 粒度是旧版生成链路，不对应 V2。
- chapter JSON 和 job 状态之间边界不够明确，容易把工程 meta 混到前端合同。
- 没有明确“同一文章重复提交”的幂等策略。
- 前端无法稳定拿到“当前生成中 job”的统一 DTO。

V2 建议：

- `generation_jobs` 继续作为 job source of truth。
- `chapters.chapter_json.generationMeta.v2Progress` 作为前端快速读取的当前展示状态。
- `generationMeta.stageRuntime`、`modelUsage`、`qualityDiagnostics` 只在 debug report / internal JSON 里保留，不进入生产 serializer。
- 提交生成时用 `deviceId + sourceUrl/contentHash` 做幂等键，避免重复点击创建多个相同 job。

执行步骤：

- [ ] 审查 `db.js` 是否需要新增 `idempotency_key` 或可先放进 `payload_json.clientRequestId`。
- [ ] 设计 V2 job payload：`{ inputType, sourceUrl, rawText?, contentHash, createdFrom, clientRequestId }`。
- [ ] 设计 V2 job state：`queued/running/retrying/completed/failed`。
- [ ] 给 `getGenerationJob` 或新的 V2 endpoint 增加 `generationProgress` 序列化。
- [ ] 断电/重启恢复：`running + locked_until expired` 的 job 继续可被 worker claim。
- [ ] App 启动后章节列表能看到上次未完成 job 的当前状态。
- [ ] 测试：重复提交同一文章不会创建重复 running job；worker 重启后能恢复 queued/running-expired job。

关键文件：

- `experiments/shibei-v2/backend/src/db.js`
- `experiments/shibei-v2/backend/src/generationJobRunner.js`
- `experiments/shibei-v2/backend/src/server.js`
- 新增或扩展 V2 job tests。

### 3. V2 失败策略和重试策略

用户要求：网上查业界通用专业做法，按成熟方案来。

V2 失败分类：

```ts
type V2GenerationFailureKind =
  | "input_too_long"
  | "unsupported_source"
  | "source_fetch_failed"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "structured_output_failed"
  | "contract_validation_failed"
  | "unknown";
```

是否重试：

- 不重试：
  - `input_too_long`
  - `unsupported_source`
  - 明确 4xx 用户输入错误
  - schema / contract 明确说明是内部 bug 时不在 job 层无限重试
- 可短重试：
  - provider timeout
  - provider 429
  - provider 5xx
  - 网络瞬时失败
  - 单 stage JSON parse failure，已由 `modelPromptCaller` 做内部 retry
- 可 job 层重试：
  - provider timeout / unavailable / 429 且整章 job 仍未超过上限
  - 不对明显 prompt/schema bug 做多次整章重试

建议策略：

- 模型 stage 内部 retry：保持现有 `V2_MODEL_JSON_RETRIES`，用于 JSON parse / empty structured text 等轻量重试。
- 整章 job retry：最多 2-3 次，使用 capped exponential backoff + jitter。
- Retry delay 示例：
  - 第 1 次：5-10 秒随机
  - 第 2 次：20-40 秒随机
  - 第 3 次：60-120 秒随机
- 如果 provider 连续失败率过高，后续再加 circuit breaker；MVP 先记录为后续项，不一定马上实现。
- 用户可见状态：
  - 自动重试中：显示“生成遇到波动，正在自动重试”
  - 最终失败：显示明确可操作文案，“生成失败，请稍后重试”或“文章太长，请缩短后再试”

执行步骤：

- [ ] 新增 `experiments/shibei-v2/backend/src/v2/generation/generationFailures.js`。
- [ ] 统一把 provider / validation / input errors 映射成 `V2GenerationFailureKind`。
- [ ] 给 `failGenerationJob` 调用传入 `retryDelayMs`，计算 capped exponential backoff + jitter。
- [ ] 加 `shouldRetryV2GenerationFailure(error, job)`，避免 retry storm。
- [ ] 在 `generationProgress` 中返回 `retryCount`、`canRetry` 和用户文案。
- [ ] 测试：429/timeout 会进入 retrying；input too long 不重试；contract validation 不无限重试；retry delay 有上限并带 jitter。

关键文件：

- `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js`
- `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- `experiments/shibei-v2/backend/src/db.js`
- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationFailures.js`
- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationFailures.test.js`

### 4. 输入 token / 文章长度保护

用户要求：MVP 先限制在约 6000 字以内。

目标：

- 在生成前就拦截明显过长输入，不等模型调用失败或成本爆炸。
- 前端上传页能显示明确原因。
- 后端仍保留可配置上限，方便后续扩展长文。

建议规则：

```ts
const V2_MAX_ARTICLE_CHARS = 6000;
```

注意：

- MVP 可以按字符数粗略限制，不需要一开始做精确 tokenizer。
- 后续如果要支持长文，再做 chunking / hierarchical summarization。
- 对微信链接正文提取后也要做长度检查，而不是只检查用户粘贴输入。

执行步骤：

- [ ] 新增 `experiments/shibei-v2/backend/src/v2/generation/generationLimits.js`。
- [ ] 实现 `validateV2ArticleInput({ title, text })`，超过 `V2_MAX_ARTICLE_CHARS` 返回 `input_too_long`。
- [ ] 在 V2 generation job 进入模型 pipeline 前调用。
- [ ] 在 API 响应中返回用户可见文案：“这篇文章目前太长，建议控制在 6000 字以内。”
- [ ] 更新上传页/全部章节生成中逻辑需要使用该失败文案。
- [ ] 测试：5999 字通过，6001 字阻断；提取后的正文超限也阻断；阻断不消耗模型调用。

关键文件：

- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationLimits.js`
- 新增 `experiments/shibei-v2/backend/src/v2/generation/generationLimits.test.js`
- `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js`
- `experiments/shibei-v2/backend/src/server.js`

### 5. 生产 serializer / 前端合同收口

用户确认：按之前建议执行。

目标：

- 前端只拿它需要显示和交互的字段。
- 实验 meta、debug diagnostics、model usage、prompt stage runtime 不进生产接口。
- HTML 质量报告仍保留完整 debug 数据。

生产接口应返回：

- chapter id/title/status/current progress
- unit id/title/short title/summary
- review cards
- questions
- source anchors
- completion copy
- favorite/source navigation 所需字段

生产接口不返回：

- `modelUsage`
- `costSummary`
- `stageRuntime`
- prompt payload
- hidden ECD middle-layer fields
- `qualityDiagnostics`
- debug retry details

执行步骤：

- [ ] 审查 `reviewPathClientSerializer.js` 当前输出字段。
- [ ] 新增 `generationMetaMode: "production"` 下的 serializer 快照测试。
- [ ] 确认前端需要的生成中字段来自 `generationProgress`，不是 debug meta。
- [ ] 更新 `v2-backend-field-contract-zh.md`，明确 `debug only` / `client visible`。
- [ ] 质量实验 runner 继续保存完整 JSON，不受生产 serializer 影响。
- [ ] 测试：生产 serializer 不含 debug 字段；debug report 仍能看到 token、runtime、diagnostics。

关键文件：

- `experiments/shibei-v2/backend/src/v2/serializers/reviewPathClientSerializer.js`
- `experiments/shibei-v2/backend/src/v2/serializers/reviewPathClientSerializer.test.js`
- `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
- `experiments/shibei-v2/backend/src/v2/generation/tests/runV2QualityExperiment.js`

## 推荐执行顺序

### Checkpoint 0：保存当前 prompt 稳定性工作

目的：当前 `unitKnowledgeMap compact retry` 是一个有效回溯点，先单独提交，避免后续基础设施改动混在一起。

- [ ] 运行 `npm --prefix experiments/shibei-v2/backend run check`。
- [ ] 提交当前未提交的 prompt 稳定性改动和质量报告。
- [ ] commit message 建议：`Stabilize V2 unit knowledge map compact retry`

### Checkpoint 1：进度合同 + 文章长度上限

优先级最高，因为它直接 unblock SwiftUI 接后端。

- [ ] 新增 `generationProgress.js`。
- [ ] 新增 `generationLimits.js`。
- [ ] 把 V2 pipeline stage 映射成用户可见阶段。
- [ ] 在 V2 job runner/pipeline 里记录 progress。
- [ ] 加 6000 字上限。
- [ ] 更新字段合同文档。
- [ ] 测试通过后提交。

验收：

- 前端可以通过章节列表或 job API 看到“正在整理正文 / 正在提取关键知识点 / 正在生成复习题”等文案。
- 超过 6000 字的输入不调用模型，直接返回可理解失败。

### Checkpoint 2：持久化和幂等提交

优先级第二，因为它决定用户退出/重启后能否继续看到生成状态。

- [x] 复用并扩展 `generation_jobs`，新增 `idempotency_key`。
- [x] 设计 V2 `clientRequestId/sourceUrl/contentHash/rawText` 幂等 key 构造。
- [x] 实现同一 device + idempotency key 的 pending job 去重基础能力。
- [ ] App 重启后仍能读到当前生成状态。
- [ ] 测试通过后提交。

验收：

- 同一文章重复点击开始生成，不产生多个 running job。
- worker 中断后，expired running job 可以被重新 claim。

### Checkpoint 3：失败策略和自动重试

优先级第三，建立在持久化 job 状态之上。

- [ ] 新增失败分类。
- [ ] 实现 `shouldRetryV2GenerationFailure`。
- [ ] 实现 capped exponential backoff + jitter。
- [ ] 明确不可重试错误。
- [ ] 加 `retrying` 用户可见状态。
- [ ] 测试通过后提交。

验收：

- provider timeout/429/5xx 会有限重试。
- input too long / unsupported source 不重试。
- 重试次数和 delay 有上限。
- 用户不会看到工程内部 JSON parse 细节。

### Checkpoint 4：生产 serializer 收口

优先级第四，用于正式联调 SwiftUI。

- [ ] 补齐 serializer tests。
- [ ] 更新 field contract 文档。
- [ ] 确认前端 mock / SwiftUI 只依赖生产字段。
- [ ] 测试通过后提交。

验收：

- 生产响应轻量、稳定。
- 质量实验仍保留完整 debug 信息。

### Checkpoint 5：端到端联调 dry run

这一步不一定马上做，但应该作为进入 SwiftUI 真联调前的门槛。

- [ ] 用本地后端提交一篇 6000 字以内文章。
- [ ] 前端轮询或刷新看到生成进度。
- [ ] 生成完成后章节卡片从 `generating` 变成 `completed`。
- [ ] 故意制造 provider failure，检查 retrying 和 failed UI。
- [ ] 故意提交超长文章，检查 input too long UI。
- [ ] 记录一份联调报告。

## 不在本轮做的事情

- 不继续改 ECD / DSPy prompt 出题质量细节。
- 不做长文章 chunking。
- 不做多 provider failover。
- 不做自动质量改写员。
- 不把 qualityJudge 重新接回主链路。
- 不把 V2 直接替换线上旧版。

## 风险和注意事项

- 进度 `progress` 百分比只能是粗略值，不能承诺真实剩余时间。前端文案应以阶段提示为主。
- job 层 retry 不能过多，否则会造成成本不可控和 retry storm。
- 生产 serializer 不能为了“前端方便”泄露 debug meta，否则之后很难删。
- 6000 字上限是 MVP 产品策略，不是技术永久限制；后续长文支持要单独设计。
- 旧版 `generation_jobs` 可以参考，但 V2 需要新合同，避免旧状态文案和新页面不一致。

## 测试计划

- [ ] `npm --prefix experiments/shibei-v2/backend run check`
- [ ] 单元测试：
  - `generationProgress.test.js`
  - `generationLimits.test.js`
  - `generationFailures.test.js`
  - `reviewPathClientSerializer.test.js`
- [ ] API/集成测试：
  - 创建生成 job。
  - 查询生成 progress。
  - 超长输入被拒绝。
  - transient failure 进入 retrying。
  - non-retryable failure 直接 failed。
  - completed job 返回可用于 SwiftUI 的 production DTO。
- [ ] 手工联调：
  - SwiftUI 全部章节页生成中卡片展示动态阶段。
  - 上传页开始生成后跳转全部章节页。
  - 失败通知和失败详情页能拿到 failureCode/failureMessage。

## 文档更新计划

- [ ] 更新 `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`：
  - 增加 `generationProgress`。
  - 标记 `client visible` 和 `debug only`。
- [ ] 更新 `experiments/shibei-v2/docs/v2-llm-runtime-reliability-contract-zh.md`：
  - 增加 V2 失败分类、重试策略、输入上限。
- [ ] 更新质量 run README：
  - 记录本轮基础设施计划和后续执行结果。

## 建议给前端的最终合同草案

```json
{
  "chapterId": "chapter-001",
  "status": "running",
  "title": "hooks 会在 Claude Code 生命周期中的特定点触发",
  "generationProgress": {
    "jobId": "job-001",
    "chapterId": "chapter-001",
    "status": "running",
    "stage": "mapping_knowledge",
    "displayText": "正在提取关键知识点",
    "progress": 0.42,
    "retryCount": 0,
    "canRetry": false,
    "updatedAt": "2026-06-24T12:00:00.000Z"
  }
}
```

失败示例：

```json
{
  "chapterId": "chapter-001",
  "status": "failed",
  "generationProgress": {
    "jobId": "job-001",
    "chapterId": "chapter-001",
    "status": "failed",
    "stage": "failed",
    "displayText": "文章太长，请缩短后再试",
    "progress": null,
    "retryCount": 0,
    "canRetry": false,
    "updatedAt": "2026-06-24T12:00:00.000Z",
    "failureCode": "input_too_long",
    "failureMessage": "这篇文章目前太长，建议控制在 6000 字以内。"
  }
}
```

## 建议执行选择

1. 先执行 Checkpoint 0-1：保存当前改动，然后补进度合同和 6000 字上限。
2. 再执行 Checkpoint 2-3：做持久化、幂等、失败重试。
3. 最后执行 Checkpoint 4-5：生产 serializer 和 SwiftUI 联调 dry run。

我建议下一步先从 Checkpoint 0-1 开始，因为它最小、最确定，也最直接服务前端联调。
