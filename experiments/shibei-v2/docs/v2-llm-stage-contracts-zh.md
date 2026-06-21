# 拾贝 V2 LLM Stage Contracts

> 这份文档把 V2 出题链路写成一组 DSPy-style stage signatures。它不是新的产品需求，而是工程契约：每个阶段只做一件事，只接收必要上下文，只输出下游需要的结构。

## 设计原则

- **ECD 是教育设计原则**：先明确学习对象、可观察证据和任务形态，再生成题目。
- **DSPy-style 是工程组织方式**：把大 prompt 拆成稳定模块，每个模块有 signature、schema、validator 和 eval 指标。
- **默认主链路不使用 qualityJudge 拦截**：当前只保留 deterministic diagnostics 和 HTML 报告，用户要先看完整题目输出。
- **不要全量输出 ECD 中间思考**：只保留能防止漏知识点、方便调试的中间层，例如 micro knowledge、assessable targets、selected tasks。
- **source context 要逐层变窄**：整章规划可以看全文；每个 unit 的 ECD 和题目生成只看当前 unit 的原文窗口。
- **runtime 稳定性不写进 prompt**：structured output 空返回、JSON 破损、timeout、provider error 由 `v2-llm-runtime-reliability-contract-zh.md` 里的 adapter/runtime 策略处理。
- **DSPy-style 不等于越拆越多**：stage 粒度以 signature 是否清晰、输出是否稳定、metric 是否变好为准。调用数下降但 token/retry/质量变差，不算架构进步。

## Stage 总览

| Stage | Signature | 默认 source context | 输出去向 |
| --- | --- | --- | --- |
| `sourceMap` | `ArticleInput -> SourceMap` | 原始全文 | 后续所有 source anchor 的基础 |
| `reviewPathPlan` | `ArticleMeta + FullSourceBlocks -> ChapterPlan` | 全文 blocks | 前端章节结构 + unit 切分 |
| `unitKnowledgeMap` | `ChapterPlan + PlanSourceWindow -> MicroKnowledgeMap` | 所有 unit anchor 的 union window | ECD 规划 |
| `taskBriefPlan` | `ChapterPlan + MicroKnowledgeMap + PlanSourceWindow -> TaskBriefPlan` | plan union window | 题目 draft stages |
| `questionDraftBatch` | `TaskBriefPlan + UnitSourceWindows -> QuestionDraftBatch` | 每个 unit 的 compact window | 实验性前端题目 |
| `unitCopyBatch` | `TaskBriefPlan + UnitSourceWindows -> UnitCopyBatch` | 每个 unit 的 compact window | 前端单元页 |
| `multipleChoiceDraft` | `MCPlans + UnitSourceWindow + PracticePlan -> MultipleChoiceDraft` | 当前 unit window | 历史/回滚路径 |
| `matchingDraft` | `MatchingPlans + UnitSourceWindow + PracticePlan -> MatchingDraft` | 当前 unit window | 历史/回滚路径 |
| `qualityDiagnostics` | `ReviewPath -> DiagnosticReport` | 已生成 reviewPath | HTML 质量报告 |

## 1. `sourceMap`

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

- Prompt: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Schema/validator: `experiments/shibei-v2/backend/src/v2/generation/prompts/sourceMap.js`
- Deterministic fallback: `buildDeterministicSourceMap()` in `generateReviewPathV2.js`

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

- 相关但独立的大知识点不能合并成一个 unit，例如 DMC 模型不应被吞进“游戏化核心概念”。
- `nodeLabel` 是主页节点浮窗短语，不是长摘要。
- `detailSummary` 是知识点完整总结，不是整章概要。

**代码位置**

- Prompt: `buildReviewPathPlanMessages()`
- Schema/validator: `prompts/reviewPathPlan.js`

**指标**

- unit count 是否合理。
- DMC/分层模型/流程等独立对象是否被保留。
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

**代码位置**

- Prompt: `buildUnitKnowledgeMapMessages()`
- Schema/validator: `prompts/unitKnowledgeMap.js`

**指标**

- 每个 unit 都有对应 micro map。
- high/medium 小知识点不被漏掉。
- DMC 这类结构型知识点能拆出整体结构、层级作用、关系边界。

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

**关键质量点**

- high/medium micro points 不应被漏掉。
- 先覆盖可观察 evidence，再选择题型。
- matching 是 task affordance 的一种，适合结构关系、层级作用、流程信号、角色职责等。
- 计划层必须短：`target` 和 `commonMisconception` 是 brief，不是用户可见解析。

**代码位置**

- Prompt: `buildTaskBriefPlanMessages()`
- Schema/validator: `prompts/taskBriefPlan.js`

**指标**

- DMC 这类结构型 unit 是否仍能选择 matching。
- questionPlans 是否覆盖关键 microIds。
- stage completion tokens 是否低于截断风险区间。
- JSON 成功率和 retry 次数。

## 5. `questionDraftBatch`（当前实验性默认，尚未证明是最终架构）

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

## 6. `unitCopyBatch`（当前默认）

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

## 7. `ecdPlanning`（历史实验/对照路径，当前默认主链路不调用）

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
- DMC 这类结构型 unit 是否能选择 matching affordance。

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
  - `leftItems[4]`
  - `rightItems[4]`
  - `pairs[4]`
  - `explanation`
  - `sourceAnchorId`

**source context policy**

- 只读取当前 unit window。

**禁止职责**

- 不生成机械“名词 -> 定义”配对。
- 不生成少于 4 对的题。
- 不在没有 matching plan 时强行出 matching。

**代码位置**

- Prompt: `buildMatchingDraftMessages()`
- Schema/validator: `prompts/matchingDraft.js`

**指标**

- 左右各 4 项。
- relationType 能体现关系价值。
- pairs 一一对应。
- DMC 层级-作用这类结构能稳定生成 matching。

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

1. `questionDraftBatch` 粒度过大：调用数少，但 JSON 体量、retry、total tokens 上升，且 matching 覆盖下降。
2. 下一轮应该按 DSPy-style signature 边界拆成 `multipleChoiceDraftBatch` 与 `matchingDraftBatch`，而不是继续扩大一个 batch prompt。
3. `taskBriefPlan` 已 compact 化，但仍是高负载阶段；需要继续看 completion tokens 和 retry 是否稳定。
4. HTML report 还没有足够清楚地区分“调用数下降”和“总 token / retry / 质量是否真正变好”。
5. `qualityJudge` prompt 仍存在于代码中，但默认不启用；后续若保留，应改名或迁移为实验性小审查模块，避免误解为主链路。

## 与前端合同的关系

这些中间层不会直接暴露给 SwiftUI。前端仍只消费稳定的 V2 review path contract：

- `summaryCard`
- `units[]`
- `questions[]`
- `sourceAnchorId`
- `chapterSummary`
- `generationMeta` 中可用于开发诊断的非 UI 字段
