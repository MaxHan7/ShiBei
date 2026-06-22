# 拾贝 V2 LLM Stage Contracts

> 这份文档把 V2 出题链路写成一组 DSPy-style stage signatures。它不是新的产品需求，而是工程契约：每个阶段只做一件事，只接收必要上下文，只输出下游需要的结构。

## 设计原则

- **ECD 是教育设计原则**：先明确学习对象、可观察证据和任务形态，再生成题目。
- **DSPy-style 是工程组织方式**：把大 prompt 拆成稳定模块，每个模块有 signature、schema、validator 和 eval 指标。
- **默认主链路不使用 qualityJudge 拦截**：当前只保留 deterministic diagnostics 和 HTML 报告，用户要先看完整题目输出。
- **ECD 可以显式化，但必须短结构化**：主链路允许输出 bounded ECD design artifacts，例如 micro knowledge、assessable targets、selected tasks、question briefs；不输出长篇 Chain-of-Thought、候选矩阵或完整 ECD 论文式推理。
- **短结构化工作票据优先**：凡是保留的 ECD 中间字段，都必须服务于下游题目生成、覆盖检查或 HTML 质量诊断；字段应优先使用 enum、id、短句和 compact object。
- **source context 要逐层变窄**：整章规划可以看全文；每个 unit 的 ECD 和题目生成只看当前 unit 的原文窗口。
- **sourceMap 默认确定性生成**：原文切块、block id 和 source anchors 是工程任务，不让模型重新输出整篇文章。模型版 `sourceMap` 只保留作历史回滚和对照实验。
- **runtime 稳定性不写进 prompt**：structured output 空返回、JSON 破损、timeout、provider error 由 `v2-llm-runtime-reliability-contract-zh.md` 里的 adapter/runtime 策略处理。
- **DSPy-style 不等于越拆越多**：stage 粒度以 signature 是否清晰、输出是否稳定、metric 是否变好为准。调用数下降但 token/retry/质量变差，不算架构进步。

## Stage 总览

| Stage | Signature | 默认 source context | 输出去向 |
| --- | --- | --- | --- |
| `sourceMap` | `ArticleInput -> SourceMap` | 原始全文 | 后续所有 source anchor 的基础；默认由代码确定性切分 |
| `reviewPathPlan` | `ArticleMeta + FullSourceBlocks -> ChapterPlan` | 全文 blocks | 前端章节结构 + unit 切分 |
| `unitKnowledgeMap` | `ChapterPlan + PlanSourceWindow -> MicroKnowledgeMap` | 所有 unit anchor 的 union window | ECD 规划 |
| `taskBriefPlan` | `ChapterPlan + MicroKnowledgeMap + PlanSourceWindow -> TaskBriefPlan` | plan union window | 题目 draft stages |
| `QuestionBriefAdapter` | `TaskBriefPlan + MicroKnowledgeMap -> QuestionBriefsByUnit` | 不调用模型；只用计划层结构 | scoped draft stages |
| `multipleChoiceDraftUnitBatch` | `CurrentUnitMCBriefs + CurrentUnitSourceWindow -> MultipleChoiceDraftUnitBatch` | 当前 unit 的 compact window | 前端选择题 |
| `matchingDraftBatch` | `MatchingPlans + UnitSourceWindows -> MatchingDraftBatch` | 每个 unit 的 compact window | 前端连线题 |
| `unitCopyBatch` | `TaskBriefPlan + UnitSourceWindows -> UnitCopyBatch` | 每个 unit 的 compact window | 前端单元页 |
| `questionDraftBatch` | `TaskBriefPlan + UnitSourceWindows -> QuestionDraftBatch` | 每个 unit 的 compact window | 历史/回滚路径 |
| `multipleChoiceDraft` | `MCPlans + UnitSourceWindow + PracticePlan -> MultipleChoiceDraft` | 当前 unit window | 历史/回滚路径 |
| `matchingDraft` | `MatchingPlans + UnitSourceWindow + PracticePlan -> MatchingDraft` | 当前 unit window | 历史/回滚路径 |
| `qualityDiagnostics` | `ReviewPath -> DiagnosticReport` | 已生成 reviewPath | HTML 质量报告 |

## 1. `sourceMap`

> 主链路默认使用 deterministic source map。只有在显式设置 `V2_SOURCE_MAP_MODE=model` 时，才会调用模型版 `sourceMap` prompt。这个阶段不应再消耗模型 token 去复述原文。

**Signature**

```text
ArticleInput -> SourceMap
```

**输入**

- `article.id`
- `article.title`
- `article.author`
- `article.url`
- `article.rawText` 或 `article.cleanedText`

**输出**

- `source`: 文章类型、标题、作者、链接。
- `blocks[]`: 稳定顺序的 source blocks，每个 block 包含 `id / type / text`。

**禁止职责**

- 不生成知识点。
- 不生成题目。
- 不判断题型。
- 不做 ECD 推理。

**代码位置**

- Deterministic source map: `buildDeterministicSourceMap()` in `generateReviewPathV2.js`
- Model prompt（历史/对照路径）: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Schema/validator: `experiments/shibei-v2/backend/src/v2/generation/prompts/sourceMap.js`

**指标**

- block id 稳定。
- block 顺序与原文一致。
- block 不为空。

## 2. `reviewPathPlan`

**Signature**

```text
ArticleMeta + FullSourceBlocks -> ChapterPlan
```

**输入**

- 文章元信息。
- 全文 source blocks。

**输出**

- `title`
- `summaryCard`
- `units[]`
  - `id`
  - `order`
  - `title`
  - `nodeLabel`
  - `shortSummary`
  - `detailSummary`
  - `why`
  - `sourceAnchor`
- `chapterSummary.encouragementText`
- 可选 `generationConstraints`

**source context policy**

- 可以读取全文，因为这是唯一需要做整章切分和全局取舍的阶段。

**禁止职责**

- 不拆 micro knowledge。
- 不输出题目。
- 不选择题型。
- 不把 ECD 全链路写进 JSON。

**关键质量点**

- 相关但独立的大知识点不能合并成一个 unit，例如独立分层模型不应被吞进相邻的宽泛概念 unit。
- `nodeLabel` 是主页节点浮窗短语，不是长摘要。
- `detailSummary` 是知识点完整总结，不是整章概要。

**代码位置**

- Prompt: `buildReviewPathPlanMessages()`
- Schema/validator: `prompts/reviewPathPlan.js`

**指标**

- unit count 是否合理。
- 分层模型、流程、类型集合、边界规则等独立对象是否被保留。
- `sourceAnchor.blockIds` 是否有效。
- `nodeLabel` 是否适合首页浮窗。

## 3. `unitKnowledgeMap`

**Signature**

```text
ChapterPlan + PlanSourceWindow -> MicroKnowledgeMap
```

**输入**

- `reviewPathPlan`
- 所有 unit anchors 的合并 source window。

**输出**

- `units[].unitId`
- `units[].microKnowledgePoints[]`
  - `microId`
  - `title`
  - `summary`
  - `role`
  - `assessmentValue`
  - `suggestedEvidenceAngles`
  - `sourceAnchorId`
  - `sourceSupport`

**source context policy**

- 应读取 plan-level union window，而不是全文。
- 目的不是减少知识点，而是让该阶段只处理已确定 units 相关原文。

**禁止职责**

- 不生成题目。
- 不选择题型。
- 不做 selectedTasks。
- 不为了控制题量删掉重要小知识点。

**micro 拆分标准**

- `microKnowledgePoint` 是 unit 内最小的有意义学习对象，应能在后续形成 learning target 或 evidence angle。
- 如果一句内容包含两个不同掌握表现，例如定义与边界、机制与误区、步骤与目的，应拆成多个 micro。
- 如果多个表述只是同一个意思的重复解释，应合并成一个 micro。
- 根据原文自然存在的内容判断 `role`；不要为了填满某种 role 而虚构 micro。
- 案例只有在承载可迁移判断、误区或机制说明时才作为 micro；纯举例使用 `context_only`。

**assessmentValue 标准**

- `assessmentValue` 只描述小点的考察价值，不表达题目数量。
- `high`：缺少它会导致用户无法掌握该 unit 的核心，后续通常应进入覆盖判断。
- `medium`：能补充重要角度、边界、误区或应用，但不是该 unit 的唯一核心。
- `low`：有学习价值，但不一定需要直接考察。
- `context_only`：背景、铺垫、普通例子或只帮助理解上下文，不直接形成题目。

**evidence angle 标准**

- `suggestedEvidenceAngles` 只写建议观察角度，不选择题型。
- 常见映射：`definition -> definition_grasp`，`boundary -> boundary_discrimination`，`model_layer / relationship -> structure_mapping`，`mechanism -> mechanism_reasoning`，`process_step -> step_purpose_mapping`，`scenario_application -> scenario_transfer`，`misconception -> misconception_detection`。
- `sourceSupport` 写 source 如何支撑这个 micro，不粘贴长原文；它应该能解释为什么该 micro 不是模型臆造。

**代码位置**

- Prompt: `buildUnitKnowledgeMapMessages()`
- Schema/validator: `prompts/unitKnowledgeMap.js`

**指标**

- 每个 unit 都有对应 micro map。
- high/medium 小知识点不被漏掉。
- 分层模型、流程步骤、类型集合等结构型知识点能拆出整体结构、层级作用、关系边界。

## 4. `taskBriefPlan`（当前默认）

**Signature**

```text
ChapterPlan + MicroKnowledgeMap + PlanSourceWindow -> TaskBriefPlan
```

**输入**

- `reviewPathPlan`
- `unitKnowledgeMap`
- plan-level source window

**输出**

模型直接输出的是 compact task brief，稳定工程字段由后端 adapter 补齐。

模型输出：

- `units[].unitId`
- `units[].practiceGoals[]`
  - `kind`
  - `target`
  - `commonMisconception`
  - `microIds`
- `units[].questionPlans[]`
  - `type`
  - `purpose`
  - `goalIndex`，1-based，指向同一 unit 内的 `practiceGoals`
  - `microIds`
  - `relationType` only when `type = matching`

后端 hydration 后的内部合同：

- `units[].unitId`
- `units[].practiceGoals[]`
  - `id`
  - `kind`
  - `target`
  - `commonMisconception`
  - `microIds`
  - `sourceAnchorId`
- `units[].questionPlans[]`
  - `id`
  - `type`
  - `purpose`
  - `practiceGoalId`
  - `microIds`
  - `sourceAnchorId`
  - `relationType` only when `type = matching`

**source context policy**

- 使用 plan union window，不读取全文。

**禁止职责**

- 不生成用户可见题干、选项、解释。
- 不输出 ECD 术语字段、推理链、候选矩阵或长篇解释。
- 不同时输出 `targetIds` 和 `microIds`；当前 compact contract 只保留 `microIds`。
- 不复制 microKnowledgePoint 的正文解释，只引用 micro id。
- 模型不要输出 `practiceGoal.id`、`questionPlan.id`、`practiceGoalId` 或 `sourceAnchorId`；这些字段由后端根据 unit 顺序、`goalIndex` 和 unit anchor 确定性生成。

**关键质量点**

- high/medium micro points 不应被漏掉。
- 先覆盖可观察 evidence，再选择题型。
- matching 是 task affordance 的一种，适合结构关系、层级作用、流程信号、角色职责等。
- 计划层必须短：`target` 和 `commonMisconception` 是 brief，不是用户可见解析。

**代码位置**

- Prompt: `buildTaskBriefPlanMessages()`
- Schema/validator: `prompts/taskBriefPlan.js`

**指标**

- 分层模型、流程步骤、类型集合等结构型 unit 是否仍能选择 matching。
- questionPlans 是否覆盖关键 microIds。
- stage completion tokens 是否低于截断风险区间；当前黄金文章 compact run 为 2,403 completion tokens，一次通过。
- JSON 成功率和 retry 次数。

## 5. `QuestionBriefAdapter` + `multipleChoiceDraftUnitBatch`（当前默认）

**Signature**

```text
TaskBriefPlan + MicroKnowledgeMap -> QuestionBriefsByUnit
CurrentUnitMCBriefs + CurrentUnitSourceWindow -> MultipleChoiceDraftUnitBatch
```

**输入**

- `TaskBriefPlan` 中每个 unit 的 `practiceGoals` 和 `questionPlans`。
- `MicroKnowledgeMap` 中与题目相关的 micro evidence。
- 当前 unit 的 compact source window。

**输出**

- `QuestionBriefAdapter` 输出按 unit 分组的 brief，不调用模型：
  - `unitId`
  - `questionBriefs[]`
  - `practiceGoal.target`
  - `practiceGoal.commonMisconception`
  - `microEvidence[]`
- `multipleChoiceDraftUnitBatch` 输出当前 unit 的选择题：
  - `unitId`
  - `questions[]`
  - 只允许 `type = multiple_choice`

**source context policy**

- 每次模型调用只携带当前 unit 的 compact source window。
- 不接收完整 ECD 字段、候选矩阵或全文章。
- 不接收其他 unit 的题目计划，避免跨 unit 混写和过长 JSON。

**禁止职责**

- 不生成 matching。
- 不新增 question plan。
- 不改变题型。
- 不重新规划知识结构。
- 不输出 ECD 字段或推理链。

**当前实验结论**

- `20260621-201141-v2-dspy-pyramid-scoped-mc-max6` 中，5 次 `multipleChoiceDraftUnitBatch` 调用全部一次通过，无 retry。
- 与 `20260621-193327-v2-compact-task-brief-max6` 相比，总 tokens 从 `83,001` 降到 `66,367`，runtime retry 从 `1` 降到 `0`。
- 结构型 unit 仍保持独立，并产出 matching；说明 scoped MC 没有破坏结构型题型选择。
- 这轮验证了当前更接近 DSPy-style 金字塔：上游负责知识/任务计划，下游按 unit scoped signature 生成题目。

## 6. `matchingDraftBatch`（当前默认，有 matching plan 时调用）

**Signature**

```text
MatchingPlans + UnitSourceWindows -> MatchingDraftBatch
```

**输入**

- 每个含 matching plan 的 unit。
- 该题型实际引用的 `practiceGoals`。
- 该题型的 `questionPlans`。
- 当前 unit 的 compact source window。

**输出**

- `units[].unitId`
- `units[].questions[]`
  - 只允许 `type = matching`
  - 每题左右各 2-4 项，pairs 数量与左右项数量一致

**source context policy**

- 每个 unit 只携带自身 compact source window。
- 不接收完整 ECD 字段、候选矩阵或全文章。

**禁止职责**

- 不生成 multiple-choice。
- 不为了凑题新增 matching plan。
- 不把名词定义机械改成连线。
- 不输出 ECD 字段或推理链。

**当前实验结论**

- `20260621-183909-v2-typed-draft-batches-max6` 中一次通过，无 retry。
- 结构型 unit 生成 matching，说明题型覆盖比 mixed `questionDraftBatch` 更健康。
- 后续仍要优化题干语气，避免“请匹配/以下”这类考试感表达过重。

## 7. `questionDraftBatch`（历史实验/回滚路径，当前默认主链路不调用）

**Signature**

```text
TaskBriefPlan + UnitSourceWindows -> QuestionDraftBatch
```

**输入**

- 每个 unit 的 compact source window。
- 每个 unit 的 `practicePlan` / `questionPlans`。

**输出**

- `units[].unitId`
- `units[].questions[]`
  - multiple-choice 或 matching question

**source context policy**

- 每个 unit 只携带自身 compact source window。

**禁止职责**

- 不新增 question plan。
- 不改变题型。
- 不重新规划知识结构。
- 不输出 ECD 字段或推理链。

**当前实验结论**

- `v2-batched-draft-compact-brief-max6` 证明它能跑通。
- 但该 stage 输出过大，导致总 token 和 retry 上升，matching 覆盖也下降。
- 下一轮建议拆成中等粒度：
  - `multipleChoiceDraftBatch`
  - `matchingDraftBatch`

## 8. `unitCopyBatch`（当前默认）

**Signature**

```text
TaskBriefPlan + UnitSourceWindows -> UnitCopyBatch
```

**输入**

- 每个 unit 的标题、摘要、task brief、compact source window。

**输出**

- `units[].overview.text`
- `units[].summary.title`
- `units[].summary.text`

**禁止职责**

- 不生成题目。
- 不改题目计划。
- 不输出 ECD 字段。

**当前实验结论**

- 相比 `questionDraftBatch`，`unitCopyBatch` 输出短、结构稳定，可以继续保留批量形态。

## 9. `ecdPlanning`（历史实验/对照路径，当前默认主链路不调用）

**Signature**

```text
SingleUnitPlan + MicroKnowledge + UnitSourceWindow -> UnitTaskModel
```

**输入**

- 单个 unit 的 plan。
- 该 unit 的 `microKnowledgePoints`。
- 当前 unit 的 source window。

**输出**

- `units[].assessableTargets[]`
  - `targetId`
  - `learningTarget`
  - `evidenceGoal`
  - `coverageRequirement`
  - `microIds`
- `units[].selectedTasks[]`
  - `questionPlanId`
  - `taskPurpose`
  - `taskAffordance`
  - `targetIds`
  - `microIds`
  - `evidenceGoal`
  - `commonMisconception`
  - `assemblyReason`
- 可选 `skippedTargets[]`

**source context policy**

- 只读取当前 unit window。

**禁止职责**

- 不生成用户可见题干、选项、解释。
- 不重新压缩 `microKnowledgePoints`。
- 不输出 full ECD essay、candidate matrix 或长篇 internal reasoning。

**关键质量点**

- 先覆盖 evidence，再选题型。
- 多个可观察理解角度可以对应多道题，不硬性限制题量。
- matching 是 task affordance 的一种，适合结构关系、层级作用、流程信号、角色职责等。

**代码位置**

- Prompt: `buildEcdPlanningMessages()`
- Schema/validator: `prompts/ecdPlanning.js`
- Normalizer: `normalizeEcdPlanningOutput()`

**指标**

- required targets 是否都进入 selectedTasks。
- selectedTasks 是否覆盖 high/medium micro points。
- 分层模型、流程步骤、类型集合等结构型 unit 是否能选择 matching affordance。

## 8. deterministic `unitPracticePlan` adapter（历史实验/回滚路径）

**Signature**

```text
UnitTaskModel -> PracticePlan
```

**输入**

- `ecdPlanning.selectedTasks`
- `plannedUnit.sourceAnchor`

**输出**

- `practiceGoals[]`
- `questionPlans[]`

**source context policy**

- 不调用模型，不需要 source blocks。

**禁止职责**

- 不新增题目意图。
- 不删改 ECD selectedTasks。
- 不进行质量审查。

**代码位置**

- Adapter: `buildPracticePlanFromEcdContext()` / `alignPracticePlanWithEcdContext()` in `generateReviewPathV2.js`
- Schema/validator: `prompts/unitPracticePlan.js`

**指标**

- `questionPlan.id` 与 `selectedTask.questionPlanId` 对齐。
- `targetIds` / `microIds` 不丢失。
- matching task 保留为 matching。

## 9. `multipleChoiceDraft`（历史 per-unit 路径 / 下一轮可演化为 `multipleChoiceDraftBatch`）

**Signature**

```text
MCPlans + UnitSourceWindow + ECDContext -> MultipleChoiceDraft
```

**输入**

- 当前 unit。
- `practicePlan` 中 type 为 `multiple_choice` 的 plans。
- `ecdContext`。
- 当前 unit source window。

**输出**

- `questions[]`
  - `id`
  - `type = multiple_choice`
  - `stem`
  - `options[4]`
  - `correctOptionId`
  - `explanation`
  - `sourceAnchorId`
- 可保留内部字段到 normalizer 前，例如 `correctUnderstanding / misconception / distractorRationale`，但最终不暴露给 SwiftUI。

**source context policy**

- 只读取当前 unit window。

**禁止职责**

- 不新增 question plan。
- 不改变题型。
- 不写“根据本文/根据文章/文中提到/正确选项 A-D”。
- 不写逐项长解析。

**代码位置**

- Prompt: `buildMultipleChoiceDraftMessages()`
- Schema/validator: `prompts/multipleChoiceDraft.js`
- Public field stripping: `stripInternalQuestionFields()`

**指标**

- 4 个选项且唯一正确答案。
- 干扰项承载真实误区。
- explanation 适合底部反馈浮窗。

## 10. `matchingDraft`（历史 per-unit 路径 / 下一轮可演化为 `matchingDraftBatch`）

**Signature**

```text
MatchingPlans + UnitSourceWindow + ECDContext -> MatchingDraft
```

**输入**

- 当前 unit。
- `practicePlan` 中 type 为 `matching` 的 plans。
- `ecdContext`。
- 当前 unit source window。

**输出**

- `questions[]`
  - `id`
  - `type = matching`
  - `relationType`
  - `stem`
  - `leftItems[2-4]`
  - `rightItems[2-4]`
  - `pairs[2-4]`
  - `explanation`
  - `sourceAnchorId`

**source context policy**

- 只读取当前 unit window。

**禁止职责**

- 不生成机械“名词 -> 定义”配对。
- 不为了凑满 4 对而生成低价值或无原文支撑的关系。
- 不在没有 matching plan 时强行出 matching。

**代码位置**

- Prompt: `buildMatchingDraftMessages()`
- Schema/validator: `prompts/matchingDraft.js`

**指标**

- 左右各 2-4 项，数量一致。
- relationType 能体现关系价值。
- pairs 一一对应。
- 层级-作用、步骤-目的、类型-特征这类结构能稳定生成 matching。

## 11. `unitSummaryDraft`（历史 per-unit 路径，当前由 `unitCopyBatch` 替代）

**Signature**

```text
Unit + Questions + UnitSourceWindow -> UnitOverviewAndSummary
```

**输入**

- 当前 unit。
- 当前 unit 已生成 questions。
- 当前 unit source window。

**输出**

- `overview.text`
- `summary.title`
- `summary.text`

**source context policy**

- 只读取当前 unit window。

**禁止职责**

- 不生成题目。
- 不总结整篇文章。
- 不把第一题答案原样写成开场。

**代码位置**

- Prompt: `buildUnitSummaryDraftMessages()`
- Schema/validator: `prompts/unitSummaryDraft.js`

**指标**

- 文案短、具体、适合移动端。
- overview 与题目分工清楚。

## 12. `qualityDiagnostics` / optional future `qualityJudge`

**当前默认**

- `qualityJudge` 默认停用。
- deterministic guardrails 只产出 diagnostics，不阻断。
- HTML report 用来人工看全部题目。

**未来可选**

- 如果要恢复模型审查，应做 per-unit 或 per-question 小审查，而不是整章一次性审查。
- 第一版仍不应静默丢题；最多产出建议修复。

**代码位置**

- Deterministic diagnostics: `qualityGuardrails.js`
- Optional judge prompt: `buildQualityJudgeMessages()`
- 开关：`V2_ENABLE_QUALITY_JUDGE`

## 当前实现差距

1. `QuestionBriefAdapter` + `multipleChoiceDraftUnitBatch` 与 `matchingDraftBatch` 已替代 `questionDraftBatch` 成为当前默认候选链路；这轮证明“typed adapter + 当前 unit scoped draft”比全单元大 batch 更稳。
2. `taskBriefPlan` 已 compact 化，并在黄金文章中从一次失败重试改善为一次通过；后续仍需在更长文章里观察。
3. 题干语气仍有考试感表达，例如“以下/下列表述”；这属于题干文案层问题，不是当前主链路架构失败。
4. HTML report 还可以更清楚地区分“架构指标”和“题目文案指标”，例如单独统计 forbidden stem phrase。
5. `qualityJudge` prompt 仍存在于代码中，但默认不启用；后续若保留，应改名或迁移为实验性小审查模块，避免误解为主链路。

## 与前端合同的关系

这些中间层不会直接暴露给 SwiftUI。前端仍只消费稳定的 V2 review path contract：

- `summaryCard`
- `units[]`
- `questions[]`
- `sourceAnchorId`
- `chapterSummary`
- `generationMeta` 中可用于开发诊断的非 UI 字段
