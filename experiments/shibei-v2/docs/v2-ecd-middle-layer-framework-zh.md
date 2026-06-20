# 拾贝 V2 ECD 中层出题框架

本文档把 Evidence-Centered Design（ECD）从宏观原则落成拾贝 V2 可执行的中层出题框架。它还不是 prompt 文案，也不是代码实现计划；它用于定义后续字段、schema、prompt chain 和质量报告应该围绕什么结构展开。

字段与 schema 草案见：`v2-ecd-field-schema-draft-zh.md`。该文档把本文的四层框架进一步落成后端内部字段、前端可见性和 HTML 质量报告列。

核心原则：

```text
Learning Claim
  -> Evidence Need
  -> Task Purpose
  -> Assembly Reason
```

换成产品语言：

```text
用户要掌握什么？
什么表现能证明用户掌握了？
用什么题型引出这种表现？
为什么最终生成这些题？
```

## 为什么需要中层框架

宏观上，我们已经确认拾贝 V2 不应该让模型直接写题，而应该先建立证据关系。中层框架的作用，是把这个宏观方向变成可操作的判断表。

没有中层框架时，模型容易出现这些问题：

- 把文章摘要当成知识点目标。
- 题目像阅读理解，而不是复习训练。
- 选择题干扰项只是凑数，不承载真实误区。
- 连线题被过度过滤，DMC 这类高价值结构题出不来。
- 每个 unit 机械套题量，而不是根据证据需求自然生成。

ECD 依据：

- `Student Model`：先定义我们想判断用户具有什么理解。
- `Evidence Model`：再定义什么表现能支持这个判断。
- `Task Model`：再设计能引出这些表现的任务。
- `Assembly Model`：最后解释多个任务如何组合成一次复习。

## 四层映射总表

| 拾贝层级 | ECD 对应 | 核心问题 | 内部产物 |
| --- | --- | --- | --- |
| Learning Claim | Student Model | 用户应该掌握什么？ | `learningClaim`、`claimType` |
| Evidence Need | Evidence Model | 什么表现能证明掌握？ | `evidenceNeed`、`observableResponse` |
| Task Purpose | Task Model | 用什么题型引出表现？ | `taskPurpose`、`taskAffordance` |
| Assembly Reason | Assembly Model | 为什么生成这些题？ | `selectedTasks`、`assemblyReason` |

## 题目数量原则

题目数量当前不作为质量目标，也不写死。

规则：

- 不规定每个 unit 必须固定几道题。
- 不为了控制数量删掉有价值题。
- 不为了凑数量生成低价值题。
- 先判断 claim 和 evidence，再自然形成 task 组合。

ECD 对应：`Assembly Model`

解释：

Assembly 负责组合任务，但组合的前提是已有 claim、evidence 和 task。题目数量是任务组合的结果，不应该先验决定。

## Learning Claim 类型表

ECD 对应：`Student Model`

这张表回答：拾贝希望对用户作出哪些“理解状态”的判断？

| Claim 类型 | 含义 | 适合的知识形状 | 示例 |
| --- | --- | --- | --- |
| `concept_understanding` 概念理解 | 用户知道一个概念真正指什么 | core_concept | 理解“游戏化”不是简单加积分徽章 |
| `structure_understanding` 结构理解 | 用户知道多个部分之间如何组成一个模型 | layered_framework、type_set | 区分 DMC 动力层、机制层、组件层 |
| `boundary_understanding` 边界理解 | 用户知道一个方法或概念什么时候适用/不适用 | boundary_rule | 知道什么时候不能把游戏元素直接当成动机设计 |
| `process_understanding` 流程理解 | 用户知道步骤及每一步作用 | process_steps | 理解一个设计流程中每步解决什么问题 |
| `cause_effect_understanding` 因果理解 | 用户知道原因、机制和结果之间的关系 | cause_effect | 知道为什么只堆组件可能无法提升体验 |
| `scenario_transfer` 场景迁移 | 用户能把知识迁移到新情境 | scenario_rule | 能判断一个产品场景应该优先优化机制还是组件 |
| `misconception_recognition` 误区识别 | 用户能排除看似合理但错误的理解 | misconception、boundary_rule | 识别“加排行榜就是完整游戏化设计”的误区 |
| `source_grounded_understanding` 原文依据理解 | 用户能把知识判断和原文依据联系起来 | source_anchor | 能回到原文看到该知识点的支撑段落 |

后续字段建议：

```json
{
  "claimType": "structure_understanding",
  "learningClaim": "用户能区分 DMC 三层分别承担的设计作用。"
}
```

## Evidence Need 类型表

ECD 对应：`Evidence Model`

这张表回答：用户做出什么表现，能证明上面的 claim？

| Evidence 类型 | 证明什么 | 可观察表现 | 示例 |
| --- | --- | --- | --- |
| `select_core_claim` | 概念理解 | 用户能选出最准确的核心理解 | 选出游戏化关注体验目标而非只加组件 |
| `distinguish_boundary` | 边界理解 | 用户能区分适用/不适用场景 | 判断一个做法是否误把组件当动机 |
| `map_structure_relation` | 结构理解 | 用户能把结构部分和作用匹配 | 动力层 -> 体验方向 |
| `apply_to_scenario` | 场景迁移 | 用户能在新情境里判断正确行动 | 判断某产品问题应该从机制层入手 |
| `identify_misconception` | 误区识别 | 用户能识别看似合理但错误的说法 | 排除“组件越多越游戏化”的说法 |
| `map_step_purpose` | 流程理解 | 用户能把步骤和目的对应 | 某流程步骤 -> 它解决的问题 |
| `map_signal_action` | 信号/动作理解 | 用户能把信号和应采取动作对应 | 某系统信号 -> 对应处理方式 |
| `ground_answer_in_source` | 原文依据理解 | 用户能查看到支撑题目的原文片段 | 查看原文跳到正确高亮段 |

后续字段建议：

```json
{
  "evidenceNeed": "用户能把 DMC 三层和各自设计作用匹配起来。",
  "observableResponse": "完成 layer_role_matching 连线题。"
}
```

## Task Purpose 类型表

ECD 对应：`Task Model`

这张表回答：现有题型如何承载 evidence？

### 选择题内部目的

前端仍显示为选择题，但后端要知道它承担哪种 evidence。

| Task Purpose | 对应 Evidence | 用途 | 好题特征 |
| --- | --- | --- | --- |
| `light_understanding` | select_core_claim | 检查核心概念理解 | 题干短、自足，不写“根据文章” |
| `boundary_check` | distinguish_boundary | 检查适用边界 | 选项围绕同一边界，不是泛泛对错 |
| `misconception_check` | identify_misconception | 暴露常见误区 | 至少一个干扰项承载真实误区 |
| `scenario_application` | apply_to_scenario | 检查迁移使用 | 场景具体，但不需要用户回忆原文措辞 |
| `counterexample_check` | identify_misconception / distinguish_boundary | 检查用户能否排除反例 | 反例要像真实错误做法，不是明显荒谬项 |

### 连线题内部目的

前端仍显示为连线题，但后端要知道它匹配的关系类型。

| Task Purpose | 对应 Evidence | 用途 | 好题特征 |
| --- | --- | --- | --- |
| `layer_role_matching` | map_structure_relation | 层级与作用匹配 | DMC 三层 -> 各自设计作用 |
| `type_feature_matching` | map_structure_relation | 类型与特征匹配 | 类型集合 -> 典型特征 |
| `step_purpose_matching` | map_step_purpose | 步骤与目的匹配 | 流程步骤 -> 解决的问题 |
| `signal_action_matching` | map_signal_action | 信号与动作匹配 | 信号 -> 应采取动作 |
| `role_responsibility_matching` | map_structure_relation | 角色与职责匹配 | 角色 -> 负责的边界 |

## Assembly Reason 规则

ECD 对应：`Assembly Model`

这张表不规定题目数量，而是要求系统解释为什么最终生成这些 task。

每个 unit 的 assembly 需要回答：

1. 这个 unit 有哪些 learning claims？
2. 每个 claim 需要哪些 evidence？
3. 哪些 evidence 可以由同一道 task 覆盖？
4. 哪些 evidence 没有高价值 task，因此跳过？
5. 最终生成的每道题为什么存在？

后续字段建议：

```json
{
  "selectedTasks": [
    {
      "id": "task-1",
      "taskPurpose": "layer_role_matching",
      "coversEvidence": ["map_structure_relation"],
      "assemblyReason": "DMC 是分层模型，用户能匹配层级与作用即可直接证明结构理解。"
    }
  ]
}
```

## DMC 模型示例

这个例子用于验证中层框架是否能解决当前问题：DMC 本应出连线题，但现有系统没有生成。

### 文章知识对象

```json
{
  "unitTitle": "DMC 模型区分体验目标、行为机制和界面组件",
  "knowledgeShape": "layered_framework"
}
```

ECD 对应：`Domain Modeling`

说明：先把 DMC 识别为分层模型，而不是普通概念定义。

### Learning Claim

```json
{
  "claimType": "structure_understanding",
  "learningClaim": "用户能区分 DMC 三层分别承担的设计作用。"
}
```

ECD 对应：`Student Model`

说明：我们要判断的不是用户是否记住“三层名称”，而是是否理解三层的设计作用。

### Evidence Need

```json
{
  "evidenceNeed": "用户能把动力层、机制层、组件层分别匹配到正确作用。",
  "observableResponse": "完成层级与作用的连线匹配。"
}
```

ECD 对应：`Evidence Model`

说明：匹配三层和作用，是证明结构理解的直接证据。

### Task Purpose

```json
{
  "taskPurpose": "layer_role_matching",
  "taskAffordance": "matching"
}
```

ECD 对应：`Task Model`

说明：连线题比选择题更直接地引出这个 evidence。

### Assembly Reason

```json
{
  "assemblyReason": "该 unit 的核心 claim 是结构理解，layer_role_matching 能直接验证用户是否理解三层模型的关系，因此生成连线题。"
}
```

ECD 对应：`Assembly Model`

说明：这道题不是为了满足固定题量，而是因为它直接服务于 evidence。

## HTML 质量报告应展示的中层字段

为了让人工审题能看到 AI 的设计理由，后续报告至少应显示：

| 报告列 | ECD 对应 | 用途 |
| --- | --- | --- |
| `claimType` | Student Model | 看题目想判断哪种理解 |
| `learningClaim` | Student Model | 看题目服务的学习判断 |
| `evidenceNeed` | Evidence Model | 看题目要收集什么证据 |
| `knowledgeShape` | Domain Modeling | 看题型选择是否符合知识形状 |
| `taskPurpose` | Task Model | 看选择题/连线题承担什么任务 |
| `assemblyReason` | Assembly Model | 看这道题为什么存在 |
| `sourceAnchorId` | Evidence Support | 看题目是否有原文支撑 |

这样审题时可以定位问题发生在哪一层：

- 如果 `learningClaim` 错，是知识建模问题。
- 如果 `evidenceNeed` 弱，是证据设计问题。
- 如果 `taskPurpose` 不匹配，是任务选择问题。
- 如果这些都对但题目不好，是题目生成问题。

## 下一步落地顺序

1. 先把本文档的四张表纳入字段合同。
2. 再调整 prompt chain，让模型先输出中层字段。
3. 再让题目 draft 阶段基于中层字段生成题目。
4. 再升级 HTML 报告，展示每道题的 ECD 设计理由。
5. 最后用黄金样稿人工对照，不先横向扩文章。

## 当前不做

- 不写死题目数量。
- 不把质量诊断改成拦截。
- 不加入质量改写角色。
- 不新增前端题型。
- 不参考旧版蓝图或旧版题型标准。
