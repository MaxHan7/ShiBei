# 拾贝 V2 Evidence-Centered Design 产品与 AI 出题系统分析

本文档记录 Evidence-Centered Design（ECD）对拾贝 V2 的启发。它不是具体 prompt 文案，也不是马上要执行的代码计划；它是我们讨论 V2 AI 出题系统大方向时的上层原则。

当前结论：ECD 非常适合拾贝 V2，因为拾贝不是单纯“生成几道题”，而是在帮助用户复习一篇文章后，逐步形成对文章核心知识的理解。V2 的 AI 系统应该先建立“我们希望用户理解什么”的证据链，再决定“用什么题目让用户表现出这种理解”。

中层出题框架见：`v2-ecd-middle-layer-framework-zh.md`。该文档把 ECD 进一步落成拾贝的 `Learning Claim -> Evidence Need -> Task Purpose -> Assembly Reason` 四层表。

## 阅读来源

本轮主要参考以下 ECD 核心资料：

- Mislevy, Steinberg, Almond: *On the Structure of Educational Assessments*
  https://cresst.org/wp-content/uploads/TR597.pdf
- Mislevy, Riconscente: *Evidence-Centered Assessment Design: Layers, Structures, and Terminology*
  https://padi.sri.com/downloads/TR9_ECD.pdf
- Mislevy: *A Brief Introduction to Evidence-Centered Design*
  https://files.eric.ed.gov/fulltext/ED483399.pdf
- Mislevy, Haertel: *Implications of Evidence-Centered Design for Educational Testing*
  https://csaa.wested.org/wp-content/uploads/2020/01/2006_Implications_of_Evidence_Centered_Design_for_Educational_Testing.pdf

## ECD 的核心思想

ECD 把 assessment 看成一种“证据推理”：

1. 我们想对学习者作出什么判断？
2. 哪些可观察表现可以支持这个判断？
3. 什么任务或情境可以引出这些表现？
4. 这些任务如何组合，才能覆盖我们真正关心的能力？

这和传统“先写题，再看题好不好”的方式不同。ECD 要求在任务生成前，先把学习目标、证据、任务之间的关系显性化。

对拾贝来说，这意味着：

- 不应该让模型直接从文章生成题目。
- 应先让模型理解文章、拆出知识点、判断每个知识点需要用户掌握什么。
- 再判断什么用户行为能证明这种掌握。
- 最后才选择题型并生成题干、选项、连线项和反馈。

## ECD 术语到拾贝 V2 的映射

| ECD 概念 | 原意 | 拾贝 V2 映射 |
| --- | --- | --- |
| Domain Analysis | 理解领域内容、概念、工具、表达方式 | AI 先读文章，理解文章核心命题、结构、术语、案例和作者论证方式 |
| Domain Modeling | 把领域内容组织成可评估的 claims/evidence/tasks | 拆知识点，标注知识形状、学习目标、常见误区、关系结构 |
| Student Model | 我们想判断学习者具有什么能力 | `learningClaim`：用户需要理解的核心点 |
| Evidence Model | 什么表现能证明这种能力 | `evidenceNeed`：正确选择、场景判断、连线关系、误区识别 |
| Task Model | 用什么任务引出这些表现 | `taskAffordance`：选择题、场景题、连线题、总结页说明 |
| Assembly Model | 多个任务如何组合 | 每个 unit 的 task 组合如何覆盖对应 learning claim 的 evidence needs |
| Presentation Process | 如何呈现任务并收集回答 | SwiftUI 题卡、选项卡、连线卡、答后浮窗、查看原文 |
| Response Processing | 如何解释用户回答 | 正误、匹配结果、收藏、查看原文上下文、反馈浮窗 |
| Summary Scoring | 如何累计判断用户状态 | unit/chapter 进度、完成状态、错题/收藏、复习状态 |
| Activity Selection | 接下来给用户什么 | 继续下一题、进入单元总结、进入章节总结、恢复当前节点 |

## 对拾贝 V2 的大方向启发

### 1. AI 系统的第一角色不是“出题者”，而是“文章理解者”

当前问题是：如果系统太早进入出题阶段，它会容易生成阅读理解式问题，比如“根据文章，哪个说法正确”。这类题表面相关，但没有建立证据链。

ECD 视角下，第一阶段应该只做文章理解：

- 文章核心主张是什么？
- 文章分成哪些知识段落？
- 哪些是必须复习的知识，哪些只是背景、例子或铺垫？
- 每个知识点依赖哪些原文片段？
- 作者真正希望读者带走的理解是什么？

这一阶段不应该生成题干和选项。

### 2. 知识点不是“文章摘要”，而是一个可训练的 learning claim

同一段文章可以摘要成一句话，但摘要不等于复习目标。

例如 DMC 模型：

- 普通摘要：DMC 模型包括动力层、机制层和组件层。
- ECD 式 learning claim：用户能区分 DMC 三层分别承担的设计作用，并避免把游戏化理解成单纯堆可见组件。

第二种才是能指导出题的结构。

因此每个 unit 应该有：

- `nodeLabel`：主页节点浮窗短标题。
- `shortSummary`：章节详情中短摘要。
- `detailSummary`：完整知识点描述。
- `learningClaim`：这个知识点要让用户真正掌握什么。
- `knowledgeShape`：知识形状，例如分层模型、流程步骤、类型集合、边界规则、信号集合。
- `commonMisconceptions`：用户最可能误解什么。
- `sourceAnchorId`：这个判断由哪段原文支撑。

### 3. 题型选择应该来自知识形状，而不是固定配额

ECD 里任务模型由 claim 和 evidence 决定。拾贝不应该机械规定“每个 unit 一道选择题一道连线题”，也不应该机械排斥连线题。

更合适的逻辑是：

- 分层模型、类型集合、流程步骤、信号集合、角色职责：优先考虑连线题。
- 误区明显、边界容易混淆：优先考虑选择题。
- 需要迁移到真实工作/生活判断：优先考虑场景选择题。
- 纯背景信息或缺少可训练关系：可以只做轻量理解选择题，甚至减少题量。

DMC 模型适合连线题，因为它不是“名词 -> 定义”的低价值配对，而是“模型层级 -> 设计作用”的关系匹配。

### 4. 选择题的干扰项应该是证据设计的一部分

ECD 关注的是“用户做出什么表现，能让我们判断他理解了什么”。选择题里的错误选项不应只是凑数，而应该承载可诊断的误区。

对于每道选择题，模型在生成用户可见选项前，应先内部写清：

- 正确理解是什么？
- 常见误区是什么？
- 用户选错时，错在哪里？
- 这个错法对应哪个知识边界？

前端仍然只显示一段 explanation，不显示完整逐项解析。但后端生成时要先有这层分析。

### 5. 查看原文不是装饰，而是 evidence support

题目必须有原文证据。用户点击查看原文时，应该跳到支撑这道题的原文片段。

ECD 视角下，`sourceAnchorId` 不是附属字段，而是证据链的一环：

- 题目考察的 claim 来源于原文。
- 正确答案由原文支持。
- 干扰项不能和原文事实冲突。
- 高亮片段必须与题目对应，不能跳到不相关段落。

后续 prompt 和 runner 应该在报告里清楚展示每题的 source anchor 是否精确。

### 6. 答后浮窗是 formative feedback，不是判卷解析

拾贝的答后浮窗不是学校考试的逐项解析，而是复习产品里的即时反馈。

所以 explanation 应该：

- 合并“正确理解”和“常见误区”为一段短解释。
- 解释用户应该带走什么理解。
- 不写“选项 A 错，因为……”这种考卷式解析。
- 长度适合移动端浮窗。

这也是 ECD 的 presentation/process 约束：任务和反馈必须适配实际交互形态。

## 建议的 AI 角色划分

这里的“角色”不是一定要做成多个独立 agent，也不一定要做成 Codex skill。第一阶段更适合做成 prompt chain 中的阶段角色，配合 schema 传递结构化结果。

### 1. Article Understanding Role

职责：理解整篇文章。

输入：

- 原文正文。
- source blocks。

输出：

- 文章核心命题。
- 章节概要。
- 文章结构。
- 可复习知识点候选。
- 不适合出题的背景/铺垫/例子。

不做：

- 不生成题目。
- 不写选项。

### 2. Knowledge Modeling Role

职责：把文章理解转成可复习知识点。

输出：

- unit 切分。
- `nodeLabel`、`shortSummary`、`detailSummary`。
- `knowledgeShape`。
- `learningClaim`。
- `commonMisconceptions`。
- `relations`。
- source anchor。

这是 ECD 中 Domain Modeling 的核心。

### 3. Evidence Design Role

职责：判断什么表现能证明用户理解。

输出：

- `evidenceNeed`。
- `observableResponse`。
- 正确理解。
- 常见误区。
- 适合观察的用户行为：选择、匹配、场景判断、查看原文后恢复。

这一步很关键，因为它把“用户要理解什么”和“题目该怎么考”连接起来。

### 4. Task Planning Role

职责：选择题型和题目组合。

输出：

- 每个 unit 的题型计划。
- 题型适配理由。
- 为什么选择 matching 或为什么不选择 matching。
- 是否需要场景题。
- 是否需要轻量理解题。

这个角色不写题干，只做任务设计。

### 5. Question Draft Role

职责：按 task plan 生成用户可见题目。

输出：

- multiple choice。
- matching。
- answer/explanation。
- sourceAnchorId。

它不再自行决定“这题要考什么”，而是执行上游计划。

### 6. Feedback and Summary Role

职责：生成复习反馈类文案。

输出：

- 单元开场/总结。
- 章节完成鼓励语。
- 答后 explanation 的语气校准。

### 7. Quality Diagnostics Role

职责：诊断，不拦截。

当前阶段只记录：

- 题干是否像阅读理解。
- 干扰项是否有误区价值。
- matching 是否有关系价值。
- explanation 是否适合 UI。
- source anchor 是否疑似不准。

注意：本轮不加入质量改写角色。等主链路稳定后，再做有/无改写角色的 A/B 对比。

## 是否需要做成 skill

短期不建议把 ECD 做成真正的 Codex skill。

原因：

- ECD 现在是产品和后端 prompt 架构原则，不是一个可重复调用的开发操作。
- 如果过早做成 skill，容易变成抽象口号，反而脱离拾贝字段和 UI。
- 更合适的沉淀方式是项目文档 + prompt role guide + schema 字段。

中期可以考虑做两类轻量“能力卡”：

1. `ecd-assessment-design-card`
   - 给 prompt 作者和后端开发用。
   - 说明 claim/evidence/task/assembly 的映射。

2. `v2-question-authoring-card`
   - 给题目生成 prompt 用。
   - 说明题干、干扰项、连线关系、explanation 的标准。

这些不一定是 Codex skill，可以先是 repo 内的 markdown reference。等我们真的反复跨线程、跨 worker 使用，再考虑升级成 skill。

## 对当前 V2 系统的大方向优化建议

### 方向 A：把“题目生成”后移

现在结构中已经开始拆阶段，但还不够彻底。下一步应该让题目生成依赖明确的 `learningClaim`、`evidenceNeed`、`taskAffordance`。

目标链路：

```text
sourceMap
  -> articleUnderstanding
  -> knowledgeModel
  -> evidenceDesign
  -> taskPlan
  -> questionDraft
  -> unitSummaryDraft
  -> diagnostics
```

### 方向 B：新增 ECD 风格内部字段

这些字段不直接暴露给 SwiftUI，但决定题目质量：

```json
{
  "learningClaim": "用户能区分 DMC 三层分别承担的设计作用。",
  "knowledgeShape": "layered_framework",
  "evidenceNeed": "用户能把三层分别匹配到正确作用，并识别只堆组件的误区。",
  "taskAffordance": ["matching", "scenario_choice"],
  "relations": [
    {
      "left": "动力层",
      "right": "定义用户最终体验到的方向",
      "relationType": "layer_role"
    }
  ],
  "commonMisconceptions": [
    "把 DMC 理解成游戏元素清单。",
    "误以为组件层就是游戏化设计的核心。"
  ]
}
```

### 方向 C：把 matching 的判断从“是否严格 4 组”改成“是否有关系证据”

当前 matching 不出现的根因之一，是 planning 阶段对 matching 过度保守。

ECD 视角下，matching 是否适合，取决于：

- 是否存在可观察的关系理解。
- 左右配对是否能证明 learning claim。
- 关系是否比选择题更直接、更经济地暴露理解。

因此：

- 三层模型也可以做 matching。
- 如果 UI 需要 4 对，可以允许“3 个核心关系 + 1 个高价值补充关系”。
- 不能用“不是天然 4 组”直接否定 matching。

### 方向 D：把“题型目的”写进报告

每道题报告中应该显示：

- `learningClaim`
- `evidenceNeed`
- `taskType`
- `whyThisTask`
- `sourceAnchorId`

这样人工审题时不是只看题面，而是能看见 AI 当时为什么出这道题。

### 方向 E：先做诊断，不做改写

质量改写角色可以保留为后续实验。

但第一轮重构不要加入，因为我们需要先看主链路是否能自然产出好题。如果加入改写角色，会混淆问题来源。

## 下一步开发计划

### Phase 1：把 ECD 词汇落进字段合同

目标：前端合同不变，但后端内部字段能表达 ECD 证据链。

要做：

- 在 `v2-backend-field-contract-zh.md` 增加内部生成字段：
  - `learningClaim`
  - `knowledgeShape`
  - `evidenceNeed`
  - `taskAffordance`
  - `observableResponse`
  - `commonMisconceptions`
  - `relations`
- 明确这些字段只进入后端中间产物、quality report 或 debug，不直接成为 SwiftUI UI 字段。

验收：

- 文档中每个字段都有“作用 / 生成来源 / 是否前端可见 / 示例”。

### Phase 2：设计 ECD 风格 prompt chain

目标：把 prompt 阶段从“题目直接生成”改成“先建证据链”。

建议阶段：

1. `articleUnderstanding`
2. `knowledgeModel`
3. `evidenceDesign`
4. `taskPlan`
5. `multipleChoiceDraft`
6. `matchingDraft`
7. `unitSummaryDraft`
8. `qualityDiagnostics`

验收：

- 每个阶段只做一件事。
- 每个阶段都有输入输出 schema。
- 题目 draft 阶段不能重新发明学习目标。

### Phase 3：先重跑黄金文章，不急扩文章

目标：用同一篇游戏化 UX 黄金文章验证大方向。

重点看：

- 知识点切分是否更接近黄金样稿。
- `nodeLabel` 是否适合主页浮窗。
- DMC 是否能出 matching。
- 选择题题干是否不再像阅读理解。
- 干扰项是否体现真实误区。
- explanation 是否适合浮窗。

验收：

- 生成 HTML report 中显示 ECD 诊断字段。
- 人工对比黄金样稿时，能看出每道题的设计理由。

### Phase 4：再讨论质量改写角色

只有当主链路质量稳定后，再加入可开关实验：

- A：无改写角色。
- B：有轻量改写角色。

对比：

- 是否减少阅读理解式题干。
- 是否改善干扰项。
- 是否改善 explanation 长度。
- 是否引入新的幻觉或偏离原文。

如果 B 明显更好，再考虑纳入正式链路。

## 当前暂不做的事

- 不恢复质量拦截。
- 不把旧版蓝图或旧版题型标准重新作为质量依据。
- 不把 ECD 做成真正 Codex skill。
- 不一次性重写所有后端。
- 不换新文章测试，先继续用当前黄金文章。

## 中层框架收口：从 ECD 到拾贝出题规则

本节把前面的宏观方向收口为下一步要深挖的中层框架。它的目标不是规定最终 prompt 字句，而是明确后续每个字段、题型和报告列应该服务于 ECD 的哪一部分。

### 题目数量原则

当前阶段不对题目数量做强制约束。

这意味着：

- 不规定每个 unit 必须固定 1 道、2 道或更多题。
- 不为了控制流程而强行减少有价值的题。
- 不为了凑数量而生成低价值题。
- 不在 prompt 里写死“每个 unit 默认 N 道题”作为质量标准。

ECD 依据：

- 题目数量属于 `Assembly Model` 的结果，不应该先于 `Student Model`、`Evidence Model` 和 `Task Model` 被决定。
- 先明确 learning claim，再明确 evidence need，再选择 task。一个 unit 最终有几道题，应由“需要多少种可观察表现来支持该 learning claim”自然产生。

拾贝 V2 的中层原则：

```text
题目数量不作为第一轮优化目标。
第一轮只关心：每道题是否有明确 claim、evidence 和 task purpose。
```

因此，后续质量判断不问“题目多不多/少不少”，而问：

- 这道题对应哪个 learning claim？
- 它收集什么 evidence？
- 这个 evidence 是否真的能说明用户理解？
- 这个 task 是否是引出该 evidence 的合适方式？

### 中层深挖目标

下一步不再继续泛泛讨论 ECD，而是围绕 ECD 的四个核心层级建立拾贝自己的出题设计表：

| 中层问题 | ECD 支撑 | 拾贝要沉淀的内容 |
| --- | --- | --- |
| 用户应该掌握什么？ | `Student Model` | `learningClaim` 类型 |
| 什么表现能证明掌握？ | `Evidence Model` | `evidenceNeed` 类型 |
| 用什么任务引出表现？ | `Task Model` | 选择题/连线题的内部 task purpose |
| 多个任务如何组成复习路径？ | `Assembly Model` | 不写死数量，只记录 task 组合理由 |

### 需要深挖的四张表

#### 1. Learning Claim 类型表

ECD 支撑：`Student Model`

这张表回答：拾贝希望对用户作出哪些“理解状态”的判断？

候选类型：

- 概念理解：用户知道一个概念真正指什么。
- 结构理解：用户知道多个部分之间如何组成一个模型。
- 边界理解：用户知道一个方法或概念适用/不适用的边界。
- 流程理解：用户知道一个过程的步骤及每一步作用。
- 因果理解：用户知道某个现象为什么会发生。
- 场景迁移：用户能把文章里的知识迁移到新情境。
- 误区识别：用户能排除看似合理但错误的理解。

#### 2. Evidence Need 类型表

ECD 支撑：`Evidence Model`

这张表回答：用户做出什么表现，能证明上面的 claim？

候选类型：

- 能选出核心定义。
- 能区分相似概念。
- 能匹配结构部分与作用。
- 能判断某个场景是否符合原则。
- 能识别错误理解为什么错。
- 能把步骤和目的对应起来。
- 能把信号和应采取的动作对应起来。

#### 3. Task Purpose 类型表

ECD 支撑：`Task Model`

这张表回答：当前已有的题型如何承载不同 evidence？

选择题内部目的：

- `light_understanding`：轻量理解。
- `boundary_check`：边界辨析。
- `misconception_check`：误区识别。
- `scenario_application`：场景迁移。
- `counterexample_check`：反例判断。

连线题内部目的：

- `layer_role_matching`：层级与作用匹配。
- `type_feature_matching`：类型与特征匹配。
- `step_purpose_matching`：步骤与目的匹配。
- `signal_action_matching`：信号与动作匹配。
- `role_responsibility_matching`：角色与职责匹配。

#### 4. Assembly 记录表

ECD 支撑：`Assembly Model`

这张表不规定题目数量，而是记录为什么一个 unit 生成了这些 task。

每个 unit 应能解释：

- 它有哪些 learning claim？
- 每个 claim 需要哪些 evidence？
- 哪些 evidence 被合并到同一道题里？
- 哪些 evidence 因为没有高价值 task 被跳过？
- 为什么最终生成了这些题？

#### 5. 多角度 Evidence Coverage

ECD 支撑：`Evidence Model` + `Task Model` + `Assembly Model`

上一轮 coverage-first 改造解决的是“重要知识点或 required evidence 不应被漏掉”。但这还不等于“一个知识点被充分考察”。一个宽泛选择题可能覆盖了某个 claim，却只观察到用户最表层的定义记忆，无法证明用户能做边界辨析、结构映射、误区识别或场景迁移。

因此新增 `unitEvidenceAngles[]`，位于 `unitLearningClaims[]` 和 `unitEvidenceNeeds[]` 之间。它回答：

- 对同一个 claim，需要从哪些不同角度观察用户理解？
- 这些角度是否能产生不同的可观察 evidence？
- 哪些角度是本轮必须覆盖的 required angle？
- 最终 selected tasks 是否覆盖了 required angles，而不是只覆盖了 evidence id？

建议 angle 类型：

| Angle Type | ECD 含义 | 适合观察什么 |
| --- | --- | --- |
| `definition_grasp` | Evidence Model | 是否抓住核心定义或最短判断 |
| `structure_mapping` | Evidence Model / Task Model | 是否能把层级、类型、步骤与作用对应 |
| `boundary_discrimination` | Evidence Model | 是否能区分相似概念或边界 |
| `misconception_detection` | Evidence Model | 是否能识别常见错误理解 |
| `scenario_transfer` | Task Model | 是否能把知识迁移到具体场景 |
| `mechanism_reasoning` | Evidence Model | 是否理解机制、因果、为什么 |
| `source_grounding` | Evidence Support | 是否能回到原文依据 |

重要规则：

- 多角度不是机械增加题量。只有当新 angle 能观察到不同的用户理解表现时，才拆分。
- `importance: required` 的 angle 必须由 `unitAssemblyPlan.selectedTasks[].angleIds[]` 覆盖。
- 题型选择发生在 angle/evidence 之后：先判断该知识点有哪些可观察角度，再选择选择题、连线题或未来题型承载它。
- 对 DMC 模型这类知识点，`structure_mapping` 很自然适合连线题；`misconception_detection` 则更适合选择题或场景辨析题。

#### 6. Prompt 减重：把教学判断写成正向证据目标

ECD 支撑：`Evidence Model` + `Assembly Model`

2026-06-21 复盘发现：当前管线已经能生成 `unitSubObjectives[]`、`unitEvidenceAngles[]` 和 `unitEvidenceNeeds[]`，但最终题目仍然偏少。问题可能不是“结构层不够”，而是多轮负向约束叠加后，模型选择了最低合规输出：

```text
少标 required
多标 supporting
selectedTasks 只覆盖 required
后续 deterministic adapter 严格执行 selectedTasks
```

后续 prompt 设计需要区分两类约束：

| 类型 | 是否硬约束 | 示例 |
| --- | --- | --- |
| 工程合同 | 是 | JSON schema、sourceAnchor、题目 id、4 个选项、4x4 matching |
| 教学质量 | 尽量用正向目标 | 充分发现可观察理解点、形成掌握证据组合、优先覆盖高价值 supporting angle |

新的表达原则：

- 不把“不要机械增加题量”作为核心提示；改为“题目数量由 evidence value 和掌握证据组合自然决定”。
- 不把 `supporting` 写成默认可跳过；改为“如果 supporting angle 能观察不同理解，应优先进入 selectedTasks”。
- 不把 matching 主要写成禁止条件；改为“当存在层级-作用、步骤-目的、信号-动作、角色-职责等关系时，matching 是高价值任务”。
- `selectedTasks` 不以最低覆盖为目标，而是要形成足以判断用户掌握程度的任务组合。

这不是放弃质量控制，而是把质量控制从“负向防错”改成“正向证据设计”。质量诊断和人工评审仍然负责发现凑数题、弱匹配和浅干扰项。

### 后续文档化要求

后续每做一个中层规则，都必须同时写清：

1. 它对应 ECD 的哪一部分。
2. 它解决拾贝当前的哪个问题。
3. 它会影响哪个内部字段或 prompt 阶段。
4. 它是否影响前端可见字段。
5. 它如何在 HTML 质量报告中被人工检查。

这样可以避免后续方案脱离 ECD，变成重新凭感觉写 prompt。

## 最后一层补齐：Delivery、Validity 与 Calibration

前面的框架主要解决“如何从文章生成高质量复习任务”。但 ECD 不只覆盖题目设计，也覆盖 assessment 如何被交付、用户回答如何被处理、最终判断如何成立。因此，拾贝 V2 还需要把复习流程、交互状态和质量校准纳入同一套 ECD 框架。

### Delivery Processes：复习路径不是普通页面跳转

ECD 支撑：`Assessment Delivery / Four-Process Delivery Architecture`

拾贝映射：

| ECD 交付过程 | 拾贝 V2 对应 | 产品意义 |
| --- | --- | --- |
| Activity Selection | 选择下一步给用户什么 | 当前题、下一题、单元总结、章节总结、恢复进度 |
| Presentation Process | 如何呈现任务 | SwiftUI 题卡、选项卡、连线卡、答后浮窗、查看原文 |
| Response Processing | 如何处理用户回答 | 正误判断、连线匹配结果、答后反馈、收藏状态 |
| Summary Scoring | 如何更新状态 | unit 进度、chapter 进度、当前复习节点、完成状态 |

这意味着：

- 做题流程不是简单页面导航，而是 ECD delivery 的一部分。
- 查看原文返回后必须恢复进入前的题目状态，因为这属于 `Response Processing` 的上下文延续。
- 笔记页点击收藏题进入题目，也应保留入口上下文，因为它决定 `Activity Selection` 中“继续”跳到哪里。
- 单元总结和章节总结不是装饰页，而是一次 assessment assembly 完成后的总结反馈。

### Validity：每道题是否真的能支持我们作出的理解判断

ECD 支撑：`Validity Argument / Assessment Argument`

拾贝不需要考试级心理测量，但需要轻量 validity 判断。

每道题都应该能回答：

- 它真的对应某个 learning claim 吗？
- 用户答对这题，是否能支持“他理解了该知识点”的判断？
- 干扰项是否能暴露真实误区，而不是只是凑数？
- source anchor 是否真的支撑正确答案？
- explanation 是否帮助用户形成正确理解？

后续 HTML 质量报告不应只显示题面，还要显示这道题背后的 validity chain：

```text
learningClaim
  -> evidenceNeed
  -> taskPurpose
  -> sourceSupport
  -> user-facing question
```

### Calibration：黄金样稿是校准工具，不是数量模板

ECD 支撑：`Iterative refinement across layers`

ECD 的层级看似顺序，但实际需要反复迭代。拾贝已有黄金样稿和 HTML 质量报告，因此可以建立自己的校准循环：

```text
生成结果
  -> HTML 报告
  -> 对照黄金样稿
  -> 定位问题发生在哪一层
  -> 回写字段规则或 prompt 阶段
  -> 重新生成同一篇文章
```

人工审查时不应只说“这题不好”，而要定位：

| 问题类型 | ECD 层级 | 可能修复点 |
| --- | --- | --- |
| 文章主旨理解偏了 | Domain Analysis | article understanding prompt |
| 知识点切分不合理 | Domain Modeling | knowledge model prompt |
| learning claim 太泛 | Student Model | claim type / learning claim schema |
| evidence weak | Evidence Model | evidenceNeed 类型表 |
| 题型不合适 | Task Model | taskPurpose / taskAffordance |
| 题目组合没有理由 | Assembly Model | assemblyReason |
| UI 放不下或体验不对 | Presentation Process | explanation length / task display |
| 查看原文不准 | Evidence Support / Response Processing | source anchor |

### 进入字段与 schema 草案层的条件

基于这次理论回顾，拾贝 V2 已经具备进入字段与 schema 草案层的条件：

- ECD 主轴已确定：claim -> evidence -> task。
- 中层四表已确定：Learning Claim / Evidence Need / Task Purpose / Assembly Reason。
- 题目数量原则已确定：不写死，由 evidence needs 自然产生。
- Delivery 和 Validity 已补齐：复习流程、查看原文、答后状态、质量报告都纳入 ECD。

下一步应把这些内容转成后端内部字段和 schema 草案，而不是继续停留在宏观讨论。
