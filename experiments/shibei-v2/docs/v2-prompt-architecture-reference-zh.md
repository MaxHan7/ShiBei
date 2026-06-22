# 拾贝 V2 Prompt 架构参考与原则

本文档记录 V2 出题系统下一轮重构的理论参考、架构原则和角色边界。它不是 prompt 文案本身，而是后续写 prompt、schema 和测试时的上层判断依据。

深入版 ECD 产品分析见：`v2-ecd-product-ai-system-analysis-zh.md`。LLM pipeline 技术框架调研与落地方案见：`v2-llm-pipeline-technical-framework-zh.md`。如果本文件和深入版之间有冲突，以深入版为准。

## 当前结论

V2 出题质量问题不应优先通过“最后加一个审查员”解决。主链路应先从“生成题目”升级为“先理解知识结构，再选择训练方式，再生成题目”。

质量修复/改写角色可以保留为后续 A/B 实验，但不进入本轮主链路。否则无法判断质量提升来自主架构，还是来自末端补救。

## 可参考的专业框架

### Evidence-Centered Design

Evidence-Centered Design，简称 ECD，强调先明确要对学习者作出的能力判断，再明确哪些表现可以作为证据，最后设计能产生这些证据的任务。

映射到拾贝 V2：

- `learningClaim`：这个知识点希望用户掌握什么。
- `evidenceNeed`：什么回答、判断或匹配能证明用户真的理解。
- `taskAffordance`：这个知识点天然适合什么题型。
- `sourceSupport`：这道题和答案由哪些原文片段支撑。

参考：

- Pearson, Assessment and Evidence-Centered Design summary: https://www.pearson.com/content/dam/global-store/global/resources/efficacy/evidence-about-learning/Pearson-Learning-Design-Principles-Assessment-and-Evidence-Centered-Design-summary.pdf
- Mislevy and Haertel, Implications of Evidence-Centered Design for Educational Testing: https://csaa.wested.org/wp-content/uploads/2020/01/2006_Implications_of_Evidence_Centered_Design_for_Educational_Testing.pdf
- Shute et al., ECD for Dummies: https://myweb.fsu.edu/vshute/ECD.pdf

### Bloom 认知层级

Bloom's Taxonomy 可作为认知动作的词汇表，而不是机械套用的金字塔。拾贝不是学校考试，不需要每章都追求最高层级；但每道题应明确自己在训练什么认知动作。

映射到拾贝 V2：

- `recognize_core_claim`：识别核心主张。
- `distinguish_boundary`：区分边界、误区或适用条件。
- `apply_to_scenario`：迁移到场景判断。
- `map_relationship`：匹配层级、职责、流程、信号与作用。

参考：

- UIC, Bloom's Taxonomy of Educational Objectives: https://teaching.uic.edu/cate-teaching-guides/syllabus-course-design/blooms-taxonomy-of-educational-objectives/
- University of Arkansas, Using Bloom's Taxonomy to Write Effective Learning Objectives: https://tips.uark.edu/using-blooms-taxonomy/

### 选择题与干扰项设计

选择题质量不只取决于是否有 4 个选项，而取决于干扰项是否来自真实误区或容易混淆点。好的干扰项应该帮助用户看清边界，而不是被一眼排除。

映射到拾贝 V2：

- 每道选择题先内部生成 `correctUnderstanding` 和 `misconception`。
- 选项生成必须围绕同一语境，避免正确项明显更完整、更像标准答案。
- 至少一个干扰项要承载真实误区或边界混淆。

参考：

- Frontiers in Psychology, Multiple-Choice Item Distractor Development Using Topic Modeling Approaches: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.00825/full
- AALHE, A Review of Established Guidelines for Multiple-Choice Questions: https://aalhe.scholasticahq.com/article/146079.pdf

## Prompt 语气原则

Prompt 里的规则分三类，不应全部写成硬性禁令。

### 硬约束

用于字段结构、UI 承载和数据合同。

示例：

- 选择题必须 4 个选项。
- 连线题左右各 2-4 项，数量必须一致。
- `sourceAnchorId` 必须指向存在的 source anchor。
- 输出必须符合 JSON schema。

### 强偏好

用于教学判断和题型选择。

示例：

- 如果知识点是分层模型、类型集合、流程步骤、信号集合、角色职责，优先考虑连线题。
- 如果知识点包含明显误区或边界判断，优先考虑选择题。
- 如果知识点强调迁移使用，优先考虑场景选择题。

### 反例提醒

用于避免常见坏题，但不应误伤高价值题型。

示例：

- 避免空泛“名词 -> 定义”配对。
- 但“模型层级 -> 对应设计作用”是高价值关系匹配，不应被误判为机械定义题。

## 建议的金字塔式主链路

```text
ArticleUnderstanding
  ↓
KnowledgeMap
  ↓
UnitLearningSpec
  ↓
AssessmentPlan
  ↓
QuestionDraft
  ↓
UnitSummaryDraft
  ↓
QualityDiagnostics
```

### ArticleUnderstanding

目标：理解整篇文章，而不是出题。

输出：

- 文章核心命题。
- 文章主线结构。
- 适合作为章节概要的 summary。
- 不应强行出题的背景段、铺垫段、例子段。

### KnowledgeMap

目标：按原文顺序切分可复习知识点。

输出：

- `unit.title`
- `unit.nodeLabel`
- `unit.shortSummary`
- `unit.detailSummary`
- `unit.sourceAnchor`
- `unit.why`

### UnitLearningSpec

目标：对每个知识点做教学分析。

建议字段：

```json
{
  "unitId": "unit-3",
  "learningObject": "DMC 三层模型",
  "knowledgeShape": "layered_framework",
  "learningClaim": "用户能区分动力层、机制层、组件层分别承担的设计作用。",
  "commonMisconceptions": [
    "把 DMC 当作可见游戏元素清单。",
    "误以为组件层最重要，忽略动力层和机制层。"
  ],
  "relations": [
    {
      "left": "动力层",
      "right": "定义用户最终体验到的方向",
      "relationType": "layer_role"
    },
    {
      "left": "机制层",
      "right": "组织用户持续参与的规则和流程",
      "relationType": "layer_role"
    },
    {
      "left": "组件层",
      "right": "呈现用户能看到和操作的界面单元",
      "relationType": "layer_role"
    }
  ]
}
```

### AssessmentPlan

目标：根据知识结构选择题型，而不是直接生成题目。

建议字段：

```json
{
  "unitId": "unit-3",
  "recommendedTasks": [
    {
      "type": "matching",
      "fitScore": 0.9,
      "cognitiveAction": "map_relationship",
      "reason": "该知识点是三层模型，每层都有明确设计作用，适合训练层级与作用对应关系。"
    },
    {
      "type": "scenario_choice",
      "fitScore": 0.76,
      "cognitiveAction": "apply_to_scenario",
      "reason": "也适合训练用户识别只堆组件的误区。"
    }
  ],
  "selectedTasks": [
    {
      "id": "qp-1",
      "type": "multiple_choice",
      "purpose": "light_understanding"
    },
    {
      "id": "qp-2",
      "type": "matching",
      "purpose": "relationship_matching"
    }
  ]
}
```

### Typed Adapter Boundary

目标：让模型只负责语义判断，让代码负责稳定、可确定、可验证的结构字段。

当前 `taskBriefPlan` 已采用这个边界：

- 模型输出：
  - 练习目标的类型、目标、常见误区、关联 microIds。
  - 题目计划的题型、目的、goalIndex、关联 microIds。
- 代码补齐：
  - `practiceGoal.id`
  - `questionPlan.id`
  - `practiceGoalId`
  - `sourceAnchorId`

判断原则：

- 如果字段可以由已有上下文确定性推导，就不要让模型输出。
- 如果字段是教学语义判断，例如“考什么、为什么考、用什么题型考”，才交给模型。
- 如果某个 stage 开始频繁触发 JSON 截断，优先检查是否让模型输出了太多 deterministic metadata，而不是继续堆 prompt 禁令。

黄金文章 `20260621-193327-v2-compact-task-brief-max6` 证明这个方向有效：`taskBriefPlan` 从一次 JSON parse failure + retry 改善为一次通过，completion tokens 从失败路径的 5,601 截断区间降到 2,403。

### QuestionDraft

目标：生成用户可见题目。

选择题应接收：

- `learningClaim`
- `cognitiveAction`
- `correctUnderstanding`
- `misconception`
- `sourceAnchor`

连线题应接收：

- `relations`
- `relationType`
- `relationGoal`
- UI 需要的 4 组限制

如果知识点天然只有 3 组强关系，例如 DMC 三层模型，可以补一组高价值整体判断、常见误区或设计风险，而不是凑一个弱关系。

### DSPy-style Pyramid Implementation Checkpoint

当前主链路已经从“一个大 prompt 生成所有题”推进到更清晰的金字塔结构：

```text
Article
  -> ReviewPathPlan: 切 unit 与章节概要
  -> UnitKnowledgeMap: 找每个 unit 内的小知识点和证据
  -> TaskBriefPlan: 把小知识点映射为 practice goals / question plans
  -> QuestionBriefAdapter: 用代码压成每个 unit 的题目 brief
  -> Draft stages: 按题型生成用户可见题目
```

这里的关键边界：

- ECD 是模型思考方式，不是一个需要完整输出给下游的大 JSON。
- DSPy-style 的 module 要有清晰 signature，但不等于每个小字段都要单独调用模型。
- `QuestionBriefAdapter` 是 deterministic adapter：它不调用模型，只把上游语义计划整理成下游需要的 compact input。
- 选择题现在用 `multipleChoiceDraftUnitBatch`，每次只接收当前 unit 的 MC brief 和 source window，避免全章 MC 大 JSON 截断。

黄金文章 `20260621-201141-v2-dspy-pyramid-scoped-mc-max6` 验证：

- total tokens 从上一轮 `83,001` 降到 `66,367`。
- runtime retry 从 `1` 降到 `0`。
- diagnostic issues 从 `1` 降到 `0`。
- DMC 没有被合并或漏掉，仍作为独立 unit，并产出 matching。

这个 checkpoint 说明“技术端按 DSPy-style 收窄 signature，设计端保留 ECD 证据链”的方向是有效的。后续如果继续改架构，应优先量化每个 stage 的 input/output tokens、retry 和题目质量，而不是继续凭感觉堆 prompt。

### QualityDiagnostics

目标：帮助人工看问题，不在本阶段拦题。

当前阶段只记录：

- forbidden phrase
- distractor value
- matching relation value
- explanation UI fit
- source anchor precision

不做：

- 自动改写
- 自动拦截
- 末端审查员补救

## 是否要给角色挂 skill

可以，但要克制。这里的 skill 更适合理解为“专业判断卡”，不是额外大角色。

建议：

- `KnowledgeMap` 使用轻量 instructional design card：判断什么值得成为知识点。
- `AssessmentPlan` 使用 assessment design card：判断知识结构适合什么题型。
- `QuestionDraft` 使用 item writing card：控制题干、选项、干扰项和解释质量。

不建议：

- 每个阶段都挂很多 skill。
- 把 skill 写成一堆更严格的禁令。
- 让末端审查员承担主链路应该完成的教学判断。

## DMC 连线题问题的归因

当前 DMC 知识点没有出连线题，不是 `matchingDraft` 失败，而是 `unitPracticePlan` 阶段没有选择 matching。

现有 prompt 写法问题：

- “第二题优先做 scenario_application 的 multiple_choice”让 matching 成为例外。
- “只有存在自然 4 组高价值关系时才做 matching”门槛过高。
- “不能做名词 -> 定义”被模型理解得过宽，误伤了“模型层级 -> 对应设计作用”这种高价值匹配。

修正方向：

- 把 `layered_framework`、`type_set`、`process_steps`、`signal_set`、`role_boundary` 明确列为 matching 高适配结构。
- 把“模型层级 -> 对应作用”明确列为好 matching，不属于机械名词解释。
- 放开“必须 4 对”的硬约束，允许 2-4 对自然关系；2/3 对高价值关系优先于 4 对低价值凑数关系。
