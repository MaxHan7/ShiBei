# 拾贝 V2 ECD 字段与 Schema 草案

本文档把 ECD 中层框架转成 V2 后端内部字段与 schema 草案。它不是最终代码实现，而是下一轮后端 prompt/schema 开发前的字段设计依据。

核心原则：

- 前端合同尽量稳定。
- ECD 字段优先作为后端内部中间产物和 HTML 质量报告字段。
- 不把 `learningClaim`、`evidenceNeed`、`taskPurpose` 等内部推理字段直接暴露给 SwiftUI。
- 题目数量不写死，由 `evidenceNeeds` 和 `selectedTasks` 自然形成。

## Implementation Status

- `ecdPlanning.js` 是第一版代码级 ECD 内部规划 schema 模块。
- 该 schema 已接入真实 V2 model orchestration：运行顺序为 `sourceMap -> reviewPathPlan -> ecdPlanning -> unitPracticePlan -> multipleChoiceDraft / matchingDraft -> unitSummaryDraft -> qualityJudge`。
- `ecdPlanning` 输出会写入 `generationMeta.ecdPlanning`，并展示在 V2 HTML 质量报告中，用于人工检查模型是否先建立了学习主张、证据需求、任务计划和组装理由。
- `ecdPlanning.unitAssemblyPlan[].selectedTasks` 现在已经驱动下游 `unitPracticePlan`：编排层会把当前 unit 的 `knowledgeUnit`、`learningClaims`、`evidenceNeeds`、`taskPlans`、`assemblyPlan` 作为 `ecdContext` 传入后续阶段。
- 旧 `unitPracticePlan` 仍作为过渡 adapter 保留：它把 ECD 的 `selectedTasks` 转成现有 `practiceGoals` 和 `questionPlans`，从而保持 SwiftUI 可见字段合同稳定。
- 如果 ECD 只选择 matching，则跳过 `multipleChoiceDraft`；如果 ECD 不选择 matching，则跳过 `matchingDraft`。模型额外发明的 `questionPlans` 会被过滤掉。
- 当前前端只支持 `multiple_choice` 和 `matching`。ECD 中暂未落地的 future affordance 会在过渡期映射为 `multiple_choice`，后续如果新增题型，再单独扩展前端合同。
- `reviewPathPlan.knowledgeObjects[]` 已作为 Domain Modeling 的上游知识对象地图接入。它先保护知识边界，再生成 `units[]`，避免把两个本应独立考察的知识对象合并成一个 unit。
- `units[].sourceKnowledgeObjectIds` 是内部追踪字段，会保留在 `generationMeta.reviewPathPlan.units[]` 中用于质量报告和调试，但不会暴露到 SwiftUI 正式 `units[]` 合同。

## 总览

| ECD 层级 | 后端阶段草案 | 主要字段 | 前端可见 | 质量报告可见 |
| --- | --- | --- | --- | --- |
| Domain Analysis | `articleUnderstanding` | `coreThesis`、`articleStructure`、`nonReviewableSections` | 部分可见为章节概要 | 是 |
| Domain Modeling | `reviewPathPlan.knowledgeObjects`、`knowledgeModel` | `knowledgeObjectId`、`boundaryDecision`、`unitId`、`title`、`nodeLabel`、`knowledgeShape`、`sourceAnchorId` | 部分可见 | 是 |
| Student Model | `unitLearningClaims` | `claimType`、`learningClaim` | 否 | 是 |
| Evidence Model | `unitEvidenceNeeds` | `evidenceType`、`evidenceNeed`、`observableResponse` | 否 | 是 |
| Task Model | `unitTaskPlan` | `taskPurpose`、`taskAffordance`、`whyThisTask` | 否 | 是 |
| Assembly Model | `unitAssemblyPlan` | `selectedTasks`、`assemblyReason` | 否 | 是 |
| Presentation / Response | `questionDraft`、runtime state | `question`、`options`、`answer`、`explanation`、`sourceAnchorId` | 是 | 是 |
| Delivery / Summary | runtime + generated summary | `nextActivity`、`unitSummary`、`chapterCompletionMessage` | 是 | 可选 |

## 1. `articleUnderstanding`

ECD 对应：`Domain Analysis`

作用：先理解文章，不生成题目。

建议 schema：

```json
{
  "coreThesis": "文章围绕游戏化设计从功能可用性转向体验质量展开。",
  "articleStructure": [
    {
      "id": "section-1",
      "title": "游戏化概念与体验目标",
      "role": "core_argument",
      "sourceAnchorIds": ["anchor-1", "anchor-2"]
    }
  ],
  "reviewableSections": ["section-1", "section-2"],
  "nonReviewableSections": [
    {
      "sourceAnchorId": "anchor-0",
      "reason": "背景铺垫，不形成独立复习知识点。"
    }
  ]
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `coreThesis` | 整篇文章核心命题 | 可转成章节概要 | 是 |
| `articleStructure[]` | 文章结构和段落角色 | 否 | 是 |
| `reviewableSections[]` | 可形成知识点的段落 | 否 | 是 |
| `nonReviewableSections[]` | 不强行出题的段落 | 否 | 是 |

## 2. `knowledgeModel`

ECD 对应：`Domain Modeling`

作用：把文章内容建模成可复习 unit。

在生成 `knowledgeModel.units[]` 之前，先生成 `reviewPathPlan.knowledgeObjects[]`。它不是前端页面字段，而是用来保护知识边界的内部地图：

```json
{
  "knowledgeObjects": [
    {
      "id": "ko_3",
      "title": "DMC模型：游戏元素的金字塔结构",
      "nodeLabel": "DMC模型",
      "knowledgeShape": "layered_framework",
      "roleInArticle": "core_argument",
      "sourceBlockIds": ["p-025", "p-026"],
      "boundaryDecision": "standalone_unit",
      "boundaryReason": "DMC 是独立分层模型，有自己的证据关系和自然连线题价值。"
    }
  ]
}
```

`boundaryDecision` 的含义：

| 值 | 含义 |
| --- | --- |
| `standalone_unit` | 这个知识对象有独立 claim/evidence/task 价值，应成为或支撑一个独立 unit。 |
| `merge_fragment` | 这个知识对象只是另一个 unit 的组成片段，可合并。 |
| `context_only` | 只作为上下文，不强行出题。 |

规则：一个 visible unit 不应合并多个 `standalone_unit` 知识对象。比如“游戏化定义”和“DMC 模型”虽然相关，但如果 DMC 有独立的分层结构和匹配价值，就必须保留为独立 unit。

建议 schema：

```json
{
  "units": [
    {
      "unitId": "unit-3",
      "title": "DMC 模型区分体验目标、行为机制和界面组件",
      "nodeLabel": "DMC 三层模型",
      "shortSummary": "DMC 把游戏化设计拆成目标、机制和组件三个层次。",
      "detailSummary": "DMC 模型提醒设计者先明确用户体验目标，再设计参与机制，最后选择界面组件，避免把游戏化简化成堆积分和徽章。",
      "knowledgeShape": "layered_framework",
      "sourceAnchorId": "anchor-unit-3"
    }
  ]
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `unitId` | unit 稳定 ID | 是 | 是 |
| `title` | unit 标题，可用于列表/详情 | 是 | 是 |
| `nodeLabel` | 主页节点浮窗短语 | 是 | 是 |
| `shortSummary` | 短摘要 | 是 | 是 |
| `detailSummary` | 完整知识点描述 | 是 | 是 |
| `knowledgeShape` | 知识形状，决定 evidence/task | 否 | 是 |
| `sourceAnchorId` | 知识点原文依据 | 间接用于查看原文 | 是 |

建议 `knowledgeShape` 枚举：

```text
core_concept
layered_framework
process_steps
type_set
boundary_rule
scenario_rule
cause_effect
comparison_pair
signal_action
role_boundary
misconception
```

## 3. `unitLearningClaims`

ECD 对应：`Student Model`

作用：明确我们希望判断用户是否掌握了什么。

建议 schema：

```json
{
  "unitId": "unit-3",
  "claims": [
    {
      "claimId": "claim-3-1",
      "claimType": "structure_understanding",
      "learningClaim": "用户能区分 DMC 三层分别承担的设计作用。",
      "sourceAnchorId": "anchor-unit-3"
    }
  ]
}
```

建议 `claimType` 枚举：

```text
concept_understanding
structure_understanding
boundary_understanding
process_understanding
cause_effect_understanding
scenario_transfer
misconception_recognition
source_grounded_understanding
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `claimId` | claim 稳定 ID | 否 | 是 |
| `claimType` | claim 类型 | 否 | 是 |
| `learningClaim` | 用户应掌握的理解 | 否 | 是 |
| `sourceAnchorId` | claim 原文依据 | 否 | 是 |

## 4. `unitEvidenceNeeds`

ECD 对应：`Evidence Model`

作用：明确什么用户表现能支持 learning claim。

建议 schema：

```json
{
  "unitId": "unit-3",
  "evidenceNeeds": [
    {
      "evidenceId": "ev-3-1",
      "claimId": "claim-3-1",
      "evidenceType": "map_structure_relation",
      "evidenceNeed": "用户能把动力层、机制层、组件层分别匹配到正确作用。",
      "observableResponse": "完成层级与作用的连线匹配。",
      "sourceAnchorId": "anchor-unit-3"
    }
  ]
}
```

建议 `evidenceType` 枚举：

```text
select_core_claim
distinguish_boundary
map_structure_relation
apply_to_scenario
identify_misconception
map_step_purpose
map_signal_action
ground_answer_in_source
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `evidenceId` | evidence 稳定 ID | 否 | 是 |
| `claimId` | 对应 learning claim | 否 | 是 |
| `evidenceType` | evidence 类型 | 否 | 是 |
| `evidenceNeed` | 需要观察到的表现 | 否 | 是 |
| `observableResponse` | 具体可观察回答/操作 | 否 | 是 |
| `sourceAnchorId` | evidence 原文依据 | 否 | 是 |

## 5. `unitTaskPlan`

ECD 对应：`Task Model`

作用：为 evidence 选择合适任务，不直接写题。

建议 schema：

```json
{
  "unitId": "unit-3",
  "recommendedTasks": [
    {
      "taskPlanId": "tp-3-1",
      "evidenceIds": ["ev-3-1"],
      "taskAffordance": "matching",
      "taskPurpose": "layer_role_matching",
      "whyThisTask": "DMC 是分层模型，连线题能直接观察用户是否理解层级和作用的对应关系。"
    }
  ]
}
```

建议 `taskAffordance` 枚举：

```text
multiple_choice
matching
future_sorting
future_correction
future_source_location
```

建议 `taskPurpose` 枚举：

```text
light_understanding
boundary_check
misconception_check
scenario_application
counterexample_check
layer_role_matching
type_feature_matching
step_purpose_matching
signal_action_matching
role_responsibility_matching
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `taskPlanId` | task plan 稳定 ID | 否 | 是 |
| `evidenceIds[]` | 覆盖哪些 evidence | 否 | 是 |
| `taskAffordance` | 适合的任务外壳 | 否 | 是 |
| `taskPurpose` | 任务内部目的 | 否 | 是 |
| `whyThisTask` | 为什么选这个任务 | 否 | 是 |

## 6. `unitAssemblyPlan`

ECD 对应：`Assembly Model`

作用：选择最终要生成的 tasks，并解释组合原因。不写死题目数量。

建议 schema：

```json
{
  "unitId": "unit-3",
  "selectedTasks": [
    {
      "questionPlanId": "qp-3-1",
      "taskPlanId": "tp-3-1",
      "evidenceIds": ["ev-3-1"],
      "taskAffordance": "matching",
      "taskPurpose": "layer_role_matching",
      "assemblyReason": "该 task 直接覆盖 DMC 结构理解的核心 evidence，因此进入本 unit。"
    }
  ],
  "skippedEvidence": [
    {
      "evidenceId": "ev-3-2",
      "reason": "没有高价值任务承载，避免生成低价值题。"
    }
  ]
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `selectedTasks[]` | 最终生成哪些题 | 否 | 是 |
| `questionPlanId` | 题目计划 ID | 否 | 是 |
| `assemblyReason` | 该题为什么存在 | 否 | 是 |
| `skippedEvidence[]` | 有哪些 evidence 被跳过及原因 | 否 | 是 |

重要规则：

- `selectedTasks` 不限制数量。
- 一个 task 可以覆盖多个 evidence。
- 一个 evidence 如果没有高价值 task，可以跳过。
- 数量不是质量目标，evidence value 才是质量目标。

## 7. `questionDraft`

ECD 对应：`Presentation Process / Task Instance`

作用：基于 task plan 生成用户可见题目。

前端合同保持现有方向：

```json
{
  "id": "q-3-1",
  "unitId": "unit-3",
  "type": "matching",
  "stem": "把 DMC 模型的层级和它们在设计中的作用配对。",
  "pairs": [
    {
      "left": "动力层",
      "right": "定义用户最终体验到的方向"
    }
  ],
  "explanation": "DMC 的重点是先区分不同层级承担的设计作用，而不是直接堆界面组件。",
  "sourceAnchorId": "anchor-unit-3",
  "generationMeta": {
    "claimIds": ["claim-3-1"],
    "evidenceIds": ["ev-3-1"],
    "taskPurpose": "layer_role_matching",
    "assemblyReason": "该题直接证明用户是否理解 DMC 三层的作用关系。"
  }
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `type` | 前端题型 | 是 | 是 |
| `stem` | 题干 | 是 | 是 |
| `options` / `pairs` | 选项或连线项 | 是 | 是 |
| `explanation` | 答后浮窗解释 | 是 | 是 |
| `sourceAnchorId` | 查看原文定位 | 是 | 是 |
| `generationMeta.claimIds` | 题目对应 claim | 否 | 是 |
| `generationMeta.evidenceIds` | 题目对应 evidence | 否 | 是 |
| `generationMeta.taskPurpose` | 题目任务目的 | 否 | 是 |
| `generationMeta.assemblyReason` | 题目存在理由 | 否 | 是 |

## 8. `deliveryState`

ECD 对应：`Assessment Delivery / Response Processing / Activity Selection`

作用：描述用户做题、查看原文、收藏题、继续复习时的上下文。

建议 runtime schema 草案：

```json
{
  "entryContext": {
    "source": "chapter_review",
    "returnTarget": "current_question",
    "continueTarget": "next_question"
  },
  "questionState": {
    "questionId": "q-3-1",
    "status": "answered",
    "selectedAnswer": "option-b",
    "feedbackVisible": true
  },
  "activitySelection": {
    "nextActivity": "unit_summary",
    "reason": "当前 unit 的 selectedTasks 已完成。"
  }
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `entryContext.source` | 从哪里进入 | 否/运行时 | 可选 |
| `returnTarget` | 返回时去哪 | 否/运行时 | 可选 |
| `continueTarget` | 继续时去哪 | 否/运行时 | 可选 |
| `questionState` | 当前题状态 | 是/运行时 | 可选 |
| `nextActivity` | 下一步活动 | 是/运行时 | 可选 |

这部分不是 prompt 生成重点，但要进入产品工程设计，避免查看原文返回后丢失已作答状态。

## 9. `qualityReport`

ECD 对应：`Validity / Calibration`

作用：让人工审查能看到每道题的设计理由。

HTML 报告建议新增列：

| 列名 | 来源字段 | ECD 对应 |
| --- | --- | --- |
| `Claim Type` | `claimType` | Student Model |
| `Learning Claim` | `learningClaim` | Student Model |
| `Evidence Type` | `evidenceType` | Evidence Model |
| `Evidence Need` | `evidenceNeed` | Evidence Model |
| `Knowledge Shape` | `knowledgeShape` | Domain Modeling |
| `Task Purpose` | `taskPurpose` | Task Model |
| `Why This Task` | `whyThisTask` | Task Model |
| `Assembly Reason` | `assemblyReason` | Assembly Model |
| `Source Anchor` | `sourceAnchorId` | Evidence Support |
| `Diagnostics` | quality diagnostics | Calibration |

人工审查问题：

- 如果题目质量差，是 claim 错、evidence 弱、task 不匹配，还是题目写坏？
- 如果没有 matching，是 knowledgeShape 没识别出来，还是 task planner 过滤过度？
- 如果干扰项弱，是 misconception 没生成，还是 draft 阶段没有使用？

## 实施顺序建议

1. 先把本字段草案和现有 `v2-backend-field-contract-zh.md` 对齐。
2. 再设计 schema 文件，不直接改运行链路。
3. 再升级 HTML 质量报告，先显示这些字段。
4. 再改 prompt chain，让模型生成这些内部字段。
5. 最后用黄金文章复测。

## 当前不做

- 不改 SwiftUI 前端合同。
- 不增加新 UI 题型。
- 不限制每个 unit 的题目数量。
- 不恢复质量拦截。
- 不加入质量改写角色。
