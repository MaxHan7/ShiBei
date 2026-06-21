# 拾贝 V2 ECD 字段与 Schema 草案

本文档把 ECD 中层框架转成 V2 后端内部字段与 schema 草案。它不是最终代码实现，而是下一轮后端 prompt/schema 开发前的字段设计依据。

核心原则：

- 前端合同尽量稳定。
- ECD 字段优先作为后端内部中间产物和 HTML 质量报告字段。
- 不把 `learningClaim`、`evidenceNeed`、`taskPurpose` 等内部推理字段直接暴露给 SwiftUI。
- 题目数量不写死，由 `evidenceNeeds` 和 `selectedTasks` 自然形成。

## Implementation Status

- `ecdPlanning.js` 是第一版代码级 ECD 内部规划 schema 模块。
- 该 schema 已接入真实 V2 orchestration：运行顺序为 `sourceMap -> reviewPathPlan -> ecdPlanning -> deterministic unitPracticePlan adapter -> multipleChoiceDraft / matchingDraft -> unitSummaryDraft -> qualityJudge`。
- `ecdPlanning` 输出会写入 `generationMeta.ecdPlanning`，并展示在 V2 HTML 质量报告中，用于人工检查模型是否先建立了学习主张、证据需求、任务计划和组装理由。
- `ecdPlanning.unitAssemblyPlan[].selectedTasks` 现在已经驱动下游 `unitPracticePlan`：编排层会把当前 unit 的 `knowledgeUnit`、`learningClaims`、`evidenceNeeds`、`taskPlans`、`assemblyPlan` 作为 `ecdContext` 传入后续阶段。
- 旧 `unitPracticePlan` 仍作为过渡 adapter 保留，但不再由模型重新规划：它确定性地把 ECD 的 `selectedTasks` 转成现有 `practiceGoals` 和 `questionPlans`，从而保持 SwiftUI 可见字段合同稳定，并减少一层 JSON 生成不稳定性。
- 如果 ECD 只选择 matching，则跳过 `multipleChoiceDraft`；如果 ECD 不选择 matching，则跳过 `matchingDraft`。模型额外发明的 `questionPlans` 会被过滤掉。
- 当前前端只支持 `multiple_choice` 和 `matching`。ECD 中暂未落地的 future affordance 会在过渡期映射为 `multiple_choice`，后续如果新增题型，再单独扩展前端合同。
- `reviewPathPlan.knowledgeObjects[]` 已作为 Domain Modeling 的上游知识对象地图接入。它先保护知识边界，再生成 `units[]`，避免把两个本应独立考察的知识对象合并成一个 unit。
- `units[].sourceKnowledgeObjectIds` 是内部追踪字段，会保留在 `generationMeta.reviewPathPlan.units[]` 中用于质量报告和调试，但不会暴露到 SwiftUI 正式 `units[]` 合同。
- `ecdPlanning.unitSubObjectives[]` 已加入代码级 schema。它把一个 unit 内部继续拆成可考、可观察、可由原文支撑的小目标；`unitLearningClaims[]` 和 `unitEvidenceNeeds[]` 必须引用这些小目标。
- `ecdPlanning.unitEvidenceAngles[]` 已加入代码级 schema。它位于 `unitLearningClaims[]` 和 `unitEvidenceNeeds[]` 之间，用来记录同一个 claim 需要从哪些不同证据角度被观察，例如定义掌握、结构匹配、边界辨析、误区识别和场景迁移。
- `unitEvidenceNeeds[].coverageRequirement` 已加入代码级 schema。`required` evidence 必须被 `unitAssemblyPlan[].selectedTasks[]` 覆盖；`supporting` / `optional` 可以不覆盖，但仍应在 HTML 报告里可见。
- `unitTaskPlan[].angleIds[]` 和 `unitAssemblyPlan[].selectedTasks[].angleIds[]` 已加入代码级 schema。`required` angle 必须被 selected task 覆盖。
- V2 HTML 质量报告已展示 Coverage Matrix 和 Angle Coverage Matrix，用来人工检查每个 sub-objective、claim、angle、evidence 和 selected task 的覆盖关系。
- 2026-06-21 prompt 减重方向：schema 保持稳定，但 prompt 不再把教学质量主要写成“不要/避免/跳过”。工程合同继续硬约束；教学判断改成正向证据目标，例如掌握证据组合、高价值 supporting angle、selectedTasks 不以最低覆盖为目标。

## 总览

| ECD 层级 | 后端阶段草案 | 主要字段 | 前端可见 | 质量报告可见 |
| --- | --- | --- | --- | --- |
| Domain Analysis | `articleUnderstanding` | `coreThesis`、`articleStructure`、`nonReviewableSections` | 部分可见为章节概要 | 是 |
| Domain Modeling | `reviewPathPlan.knowledgeObjects`、`knowledgeModel` | `knowledgeObjectId`、`boundaryDecision`、`unitId`、`title`、`nodeLabel`、`knowledgeShape`、`sourceAnchorId` | 部分可见 | 是 |
| Student Model | `unitSubObjectives`、`unitLearningClaims` | `subObjectiveId`、`importance`、`claimType`、`learningClaim` | 否 | 是 |
| Evidence Model | `unitEvidenceAngles`、`unitEvidenceNeeds` | `angleId`、`angleType`、`coverageRequirement`、`evidenceType`、`observableResponse` | 否 | 是 |
| Task Model | `unitTaskPlan` | `taskPurpose`、`taskAffordance`、`angleIds`、`whyThisTask` | 否 | 是 |
| Assembly Model | `unitAssemblyPlan` | `selectedTasks`、`angleIds`、`assemblyReason` | 否 | 是 |
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

## 3. `unitSubObjectives`

ECD 对应：`Student Model` 的可考小目标层。

作用：防止一个大 unit 只被一个宽泛题目带过。每个 unit 先拆成可观察、可由原文支撑、能转成 evidence 的小目标，再向下生成 claim 和 evidence。

建议 schema：

```json
{
  "unitId": "unit-3",
  "subObjectiveId": "sub-3-1",
  "title": "DMC 三层与作用对应",
  "type": "layer",
  "importance": "required",
  "learningTarget": "用户能把 Dynamics、Mechanics、Components 分别对应到设计目标、行为机制和界面组件。",
  "sourceAnchorId": "anchor-unit-3"
}
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `subObjectiveId` | unit 内部可考小目标 ID | 否 | 是 |
| `title` | 小目标短标题 | 否 | 是 |
| `type` | 小目标类型，例如 definition、layer、mechanism、misconception | 否 | 是 |
| `importance` | `required` / `supporting` / `optional` | 否 | 是 |
| `learningTarget` | 这个小目标具体要求用户能做到什么 | 否 | 是 |
| `sourceAnchorId` | 原文依据 | 否 | 是 |

规则：

- `required` sub-objective 必须至少产生一个 `unitLearningClaims[]`。
- 它不是页面目录，也不是为了增加题量；它是 ECD 的 assessment target，用来保证重要证据不被漏掉。
- 例如 DMC unit 内部至少可以拆为“层级作用对应”和“避免组件清单误区”两个小目标。

## 4. `unitLearningClaims`

ECD 对应：`Student Model`

作用：明确我们希望判断用户是否掌握了什么。

建议 schema：

```json
{
  "unitId": "unit-3",
  "claims": [
    {
      "claimId": "claim-3-1",
      "subObjectiveId": "sub-3-1",
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
| `subObjectiveId` | 对应哪个可考小目标 | 否 | 是 |
| `claimType` | claim 类型 | 否 | 是 |
| `learningClaim` | 用户应掌握的理解 | 否 | 是 |
| `sourceAnchorId` | claim 原文依据 | 否 | 是 |

## 5. `unitEvidenceAngles`

ECD 对应：`Evidence Model` 的证据角度层。

作用：防止一个 claim 被一道宽泛题目浅浅带过。它先记录“这个理解需要从哪些不同角度观察”，再由 `unitEvidenceNeeds[]` 写成具体可观察表现。该层不等于增加固定题量；只有当不同角度能产生不同的可观察 evidence 时，才应该拆分。

建议 schema：

```json
{
  "unitId": "unit-3",
  "angleId": "angle-3-1",
  "subObjectiveId": "sub-3-1",
  "claimId": "claim-3-1",
  "angleType": "structure_mapping",
  "importance": "required",
  "anglePurpose": "确认用户能把 DMC 三层分别对应到正确作用，而不是只记住三个英文名。",
  "sourceAnchorId": "anchor-unit-3"
}
```

建议 `angleType` 枚举：

```text
definition_grasp
structure_mapping
boundary_discrimination
misconception_detection
scenario_transfer
mechanism_reasoning
source_grounding
```

字段说明：

| 字段 | 作用 | 前端可见 | 报告可见 |
| --- | --- | --- | --- |
| `angleId` | evidence angle 稳定 ID | 否 | 是 |
| `subObjectiveId` | 对应哪个可考小目标 | 否 | 是 |
| `claimId` | 对应哪个 learning claim | 否 | 是 |
| `angleType` | 证据角度类型 | 否 | 是 |
| `importance` | required / supporting / optional | 否 | 是 |
| `anglePurpose` | 为什么需要这个角度 | 否 | 是 |
| `sourceAnchorId` | angle 原文依据 | 否 | 是 |

重要规则：

- `importance: "required"` 的 angle 必须被 `unitAssemblyPlan.selectedTasks[].angleIds[]` 覆盖。
- `unitEvidenceNeeds[].angleId` 必须引用一个已存在的 `unitEvidenceAngles[].angleId`。
- 一个知识点可以有多个 required angle，例如 DMC 可以同时需要 `structure_mapping` 和 `misconception_detection`。
- supporting angle 不是默认跳过项；如果它能观察到不同理解表现、误区、场景迁移或结构关系，应优先进入 `selectedTasks`。
- 题目数量由 evidence value 和掌握证据组合自然决定。prompt 应避免让模型以“最低 required 覆盖”为目标。

## 6. `unitEvidenceNeeds`

ECD 对应：`Evidence Model`

作用：明确什么用户表现能支持 learning claim。

建议 schema：

```json
{
  "unitId": "unit-3",
  "evidenceNeeds": [
    {
      "evidenceId": "ev-3-1",
      "subObjectiveId": "sub-3-1",
      "claimId": "claim-3-1",
      "angleId": "angle-3-1",
      "evidenceType": "map_structure_relation",
      "coverageRequirement": "required",
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
| `subObjectiveId` | 对应哪个可考小目标 | 否 | 是 |
| `claimId` | 对应 learning claim | 否 | 是 |
| `angleId` | 对应哪个 evidence angle | 否 | 是 |
| `evidenceType` | evidence 类型 | 否 | 是 |
| `coverageRequirement` | required / supporting / optional | 否 | 是 |
| `evidenceNeed` | 需要观察到的表现 | 否 | 是 |
| `observableResponse` | 具体可观察回答/操作 | 否 | 是 |
| `sourceAnchorId` | evidence 原文依据 | 否 | 是 |

重要规则：

- `coverageRequirement: "required"` 的 evidence 必须被 `unitAssemblyPlan.selectedTasks[].evidenceIds[]` 覆盖。
- `supporting` 和 `optional` 不要求一定出题，但不能影响 required evidence 的覆盖。
- 这不是固定题量规则。一个 task 可以覆盖多个 evidence；一个 unit 也可以因为有多个 required evidence 自然生成多道题。

## 7. `unitTaskPlan`

ECD 对应：`Task Model`

作用：记录每个 evidence 适合用什么任务引出，以及为什么这个任务合适。

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
| `angleIds[]` | 覆盖哪些 evidence angle | 否 | 是 |
| `taskAffordance` | 适合的任务外壳 | 否 | 是 |
| `taskPurpose` | 任务内部目的 | 否 | 是 |
| `whyThisTask` | 为什么选这个任务 | 否 | 是 |

## 8. `unitAssemblyPlan`

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
        "angleIds": ["angle-3-1"],
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
| `angleIds[]` | 该题覆盖哪些 evidence angle | 否 | 是 |
| `assemblyReason` | 该题为什么存在 | 否 | 是 |
| `skippedEvidence[]` | 有哪些 evidence 被跳过及原因 | 否 | 是 |

重要规则：

- `selectedTasks` 不限制数量。
- 一个 task 可以覆盖多个 evidence。
- `coverageRequirement: "required"` 的 evidence 不能跳过。
- `importance: "required"` 的 evidence angle 不能跳过。
- `supporting` evidence 如果能补充不同理解角度，应优先进入 `selectedTasks`；如果不进入，需要在报告中能解释为什么。
- `selectedTasks` 不以最低覆盖为目标，而是要形成足以判断用户掌握程度的任务组合。
- 数量不是独立质量目标，但 evidence value 和掌握证据组合可以自然带来更多题目。

## 9. `questionDraft`

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

## 10. `deliveryState`

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

## 11. `qualityReport`

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
