# 2026-07-11 Lean 高价值生成 Prompt 迭代记录

## 背景

本轮新版本的核心原则是：把用户注意力集中到高价值内容上，为用户减负。

详细版生成链路已经归档在 `archive/detailed-generation-20260709` / `archive/detailed-generation-stable-20260709`，新 worktree 从生产验证过的 `e9e3c95` 开始。本轮不改数据库、不改前端、不改模型供应商，只重构 V2 prompt 的选择标准。

## 高价值知识点口径

高价值知识点是内容主线中最值得被用户带走的关键理解节点。它通常承担核心观点、关键理由、方法原则、适用边界、常见误区或承载主线的关键案例，并且能帮助用户形成更好的理解、判断、行动或避错能力。

Lean 版不是详细版的少题版，而是改变选择顺序：

```text
内容
-> 识别主线
-> 选择少数高价值知识点
-> 为每个知识点选择最值得考察的价值角度
-> 生成少量高质量题目
```

## Prompt 改动

### reviewPathPlan

从“独立学习对象 + source evidence 尽量保留”改为：

- 最高原则：集中用户注意力，为用户减负。
- 先识别内容主线，再只选择主线中最值得带走的关键理解节点。
- 默认不保留背景、铺垫、普通例子、局部事实、漂亮句子、平台 hook，或只因好出题而被选中的点。
- 不因覆盖完整而保留低价值 unit。

### unitKnowledgeMap

从“拆完整 micro inventory”改为：

- 确认当前 unit 最值得考察的价值角度。
- 每个 unit 优先保留 1 个最强价值角度；只有当第二个角度对理解主线明显必要时，最多保留 2 个。
- microKnowledgePoint 表示高价值考察点，不是所有可讲子知识点。

### taskBriefPlan / ecdPlanning

从“覆盖所有 high / medium micro”改为：

- 只选择最值得占用用户注意力的考察角度。
- 每个 unit 通常只生成 1 个核心 questionPlan，必要时最多 2 个。
- 被跳过的角度不是失败；lean 版允许为了减负放弃低增益题目。
- ECD 用来选择少数最能提供掌握证据的任务，不用来覆盖所有可考点。

### matching 准入补充

第一次真实跑发现：lean prompt 让某个 unit 仍规划了 matching，但 source 只能支撑 1 个稳定对应关系，导致 contract validation 失败。

已补充规则：

- 只有当前 source 能支撑至少 2 个稳定对应关系时，才生成 matching。
- 如果只有 1 个关系点，用 multiple_choice 承载该 value angle。

### 选项短标签补充

第二次真实跑完成，但第一题选项退化成 `Workflow / LLM / Agent` 这类短标签，触发弱干扰项诊断。

已补充规则：

- 选项要短，但不能退化成单词、术语或短标签。
- 每个选项都应是能回答题干的可判断短语。

## 测试

### 自动检查

```bash
node --test backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
npm --prefix backend run check:v2
```

结果：

- prompt focused test：19/19 pass。
- V2 check：225/225 pass。

### 真实视频样本

样本：Bilibili「费曼学习法，5分钟搞懂Agent」

基线报告：

- JSON：`docs/quality-runs/video-link/bilibili-feynman-agent/runs/20260708-191349-20260708-bilibili-feynman-agent-user-entry-regression.json`
- HTML：`docs/quality-runs/video-link/bilibili-feynman-agent/reports/20260708-191349-20260708-bilibili-feynman-agent-user-entry-regression.html`

最终 lean 报告：

- JSON：`docs/quality-runs/video-link/bilibili-feynman-agent/runs/20260711-173743-20260711-bilibili-feynman-agent-lean-option-phrases.json`
- HTML：`docs/quality-runs/video-link/bilibili-feynman-agent/reports/20260711-173743-20260711-bilibili-feynman-agent-lean-option-phrases.html`

## 对比结果

| 指标 | 详细版基线 | Lean 版 |
| --- | ---: | ---: |
| 状态 | completed | completed |
| unit 数 | 3 | 3 |
| 题目数 | 8 | 3 |
| 选择题 | 7 | 3 |
| 连线题 | 1 | 0 |
| issueCount | 0 | 0 |
| diagnosticIssueCount | 1 | 0 |
| modelCallCount | 13 | 14 |
| promptTokenCount | 44,412 | 46,207 |
| completionTokenCount | 6,368 | 2,808 |
| totalTokenCount | 50,780 | 49,015 |
| DeepSeek 实际成本 | USD 0.006367492 | USD 0.004937088 |
| 媒体成本 | USD 0 | USD 0 |

## 初步判断

本轮达到了“用户减负”的第一目标：

- 每个 unit 从多题覆盖收缩为 1 道核心题。
- completion token 明显下降。
- 题目不再围绕同一个知识点反复覆盖多个角度。
- 最终真实跑无 contract failure、无诊断问题。

仍需继续观察：

- 是否所有内容类型都适合 1 题 / unit。
- 是否某些高密度内容需要允许 2 题 / unit。
- matching 在 lean 版里会更少出现，需要后续用结构型视频/文章确认是否过度抑制。
- 这只是单个 B 站样本，不能代表文章、短视频、清单型内容的整体效果。
