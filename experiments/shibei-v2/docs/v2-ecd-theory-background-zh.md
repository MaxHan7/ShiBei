# 拾贝 V2 Evidence-Centered Design 理论背景与转译原则

本文档用于沉淀拾贝 V2 引用 Evidence-Centered Design（ECD）的理论背景。它不是 prompt 文案，也不是 schema 规范；它回答的是：ECD 原本在讲什么，拾贝为什么适合采用它，以及我们应该怎样把 ECD 转译成 AI 出题系统的具体设计动作。

相关落地文档：

- `v2-ecd-product-ai-system-analysis-zh.md`：ECD 对拾贝产品和 AI 出题系统的大方向分析。
- `v2-ecd-middle-layer-framework-zh.md`：把 ECD 落成拾贝中层出题框架。
- `v2-ecd-field-schema-draft-zh.md`：把中层框架转成后端内部字段和 schema 草案。
- `v2-llm-stage-contracts-zh.md`：把 prompt 链路写成 DSPy-style stage contracts。

## 1. 参考资料

本轮主要参考以下资料：

- Mislevy: *A Brief Introduction to Evidence-Centered Design*  
  https://files.eric.ed.gov/fulltext/ED483399.pdf
- Mislevy, Riconscente: *Evidence-Centered Assessment Design: Layers, Structures, and Terminology*  
  https://padi.sri.com/downloads/TR9_ECD.pdf
- Mislevy, Haertel: *Implications of Evidence-Centered Design for Educational Testing*  
  https://csaa.wested.org/wp-content/uploads/2020/01/2006_Implications_of_Evidence_Centered_Design_for_Educational_Testing.pdf
- Pearson: *Assessment & Evidence-Centered Design summary*  
  https://www.pearson.com/content/dam/global-store/global/resources/efficacy/evidence-about-learning/Pearson-Learning-Design-Principles-Assessment-and-Evidence-Centered-Design-summary.pdf
- Frontiers: *Utilizing Evidence-Centered Design to Develop Assessments*  
  https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2021.695376/full

## 2. ECD 的核心问题

ECD 的核心不是“如何写题”，而是“如何让题目成为证据”。

它要求设计者先回答一条证据链：

```text
我们想判断学习者掌握了什么？
哪些可观察表现能支持这个判断？
什么任务能引出这些表现？
这些任务怎样组合，才能覆盖我们真正关心的理解？
```

因此，ECD 反对直接从材料跳到题目。直接写题容易变成阅读理解式问题，表面相关但缺少证据价值。更合理的顺序是：

```text
领域/文章理解
  -> 学习对象建模
  -> 可观察证据设计
  -> 任务/题型选择
  -> 题目生成与反馈
```

对拾贝来说，这条链路比“生成几道题”更重要。拾贝的目标不是考试打分，而是帮助用户围绕一篇文章形成可复习、可验证、可回到原文的理解。

## 3. ECD 的几个关键模型

### 3.1 Student Model：我们想判断什么

Student Model 关注学习者的能力或理解状态。它不是前端用户画像，而是系统想对用户作出的学习判断。

转译到拾贝：

- 用户是否理解某个核心概念。
- 用户是否能区分概念边界。
- 用户是否能看懂一个模型的层级和作用。
- 用户是否能把知识迁移到新场景。
- 用户是否能识别常见误区。

Prompt 中不应该只写“生成知识点”，而应该让模型问：

```text
这个 unit 想让用户掌握什么？
这个掌握目标是否足够独立？
它是否值得成为一个可复习的学习对象？
如果用户掌握了它，我们希望能作出什么判断？
```

### 3.2 Evidence Model：什么表现能证明掌握

Evidence Model 是 ECD 的桥梁。它连接“想判断什么”和“用什么任务判断”。

转译到拾贝：

- 用户选出核心理解，可以证明概念理解。
- 用户排除真实误区，可以证明边界理解。
- 用户把层级和作用匹配，可以证明结构理解。
- 用户在新场景中选择正确处理方式，可以证明迁移理解。
- 用户点击查看原文时能看到对应支撑片段，可以证明题目有 source grounding。

Prompt 中不能只说“用 ECD 思考”。更具体的写法应该是：

```text
为每个可考察目标说明一种可观察表现。
这个表现必须能通过当前前端支持的题型捕捉。
如果没有可观察表现，不要为了凑题生成任务。
```

### 3.3 Task Model：什么任务能引出证据

Task Model 指的是任务或活动怎样促使学习者表现出某种能力。Pearson 的 ECD summary 强调，任务应该 prompt and reveal evidence of learning。

转译到拾贝：

- 选择题不是默认题型，而是适合观察核心理解、误区识别、边界判断和场景迁移。
- 连线题不是装饰题型，而是适合观察结构关系、层级作用、步骤目的、角色职责、信号动作。
- 答后解释不是考卷解析，而是 formative feedback，用一段短文帮助用户修正理解。

Prompt 中应该让模型先判断 evidence，再选择题型：

```text
这个 evidence 最适合用选择题还是连线题捕捉？
如果是选择题，干扰项要暴露什么误区？
如果是连线题，左右项之间是什么关系？
这个任务是否能在移动端题卡里清楚呈现？
```

### 3.4 Assembly Model：任务如何组合

Assembly Model 关注多个任务如何共同覆盖学习目标。它不是固定题量规则。

转译到拾贝：

- 不写死每篇文章有多少 unit。
- 不写死每个 unit 有多少题。
- 不为了减少题量漏掉独立学习对象。
- 不为了增加题量生成低价值题。
- 一个 unit 可以因为多个可观察理解点而有多道题，也可以因为证据简单而少题。

Prompt 中应该表达：

```text
题目数量由学习对象、证据密度和任务价值自然决定。
覆盖高价值 evidence 比满足固定数量更重要。
合并只发生在学习对象确实相同或高度依赖时。
```

## 4. ECD 对拾贝 Prompt 的转译方式

ECD 不应该被机械塞进 prompt，也不应该变成大量模型输出字段。正确方式是把它转成每个阶段的任务动作。

### 4.1 不推荐的写法

```text
请按 Evidence-Centered Design 思考。
不要输出 ECD 字段。
```

这种写法太弱。它告诉模型一个理论名词，但没有告诉模型具体应该怎么做。

### 4.2 推荐的写法

```text
先判断这个 unit 的独立学习对象是什么。
再判断用户掌握它时应表现出什么可观察行为。
再选择能引出该行为的题型。
最后只输出下游需要的 compact 字段。
```

这才是把 ECD 转成 prompt 行为。

## 5. Stage 级转译清单

### 5.1 `reviewPathPlan`

ECD 对应：Domain Analysis + Domain Modeling 的前半段。

应该问：

- 文章的核心命题是什么？
- 哪些内容是独立学习对象？
- 哪些只是背景、例子、铺垫？
- 哪些对象如果合并，会丢掉独立证据？
- 每个 unit 是否有原文支撑？

不应该做：

- 不生成题目。
- 不选择题型。
- 不写固定 unit 数量。
- 不把黄金样稿文章中的具体例子写进通用 prompt。

### 5.2 `unitKnowledgeMap`

ECD 对应：Domain Modeling + Student Model 的细化。

应该问：

- 这个 unit 内有哪些可学习的小知识点？
- 每个小知识点是定义、边界、结构、流程、机制、误区、场景还是关系？
- 哪些小点有高考察价值？
- 哪些只是背景或上下文？
- 哪些小点如果漏掉，会导致后续题目覆盖不足？

不应该做：

- 不因为题量担忧而压缩小知识点。
- 不选择题型。
- 不生成题目。

### 5.3 `taskBriefPlan` / planning stage

ECD 对应：Student Model -> Evidence Model -> Task Model。

应该问：

- 每个高价值小知识点对应什么掌握目标？
- 用户做出什么表现能证明掌握？
- 这个表现适合选择题还是连线题？
- 这个题型是否能让用户暴露真实误区或结构理解？
- 多个小知识点是否能被同一道题有效覆盖？

不应该做：

- 不输出完整 ECD 推理链。
- 不输出候选矩阵。
- 不写固定题量。
- 不把 ECD 变成重 JSON。

### 5.4 `multipleChoiceDraftUnitBatch`

ECD 对应：Task Model 的具体题目生成。

应该问：

- 这道题要观察哪个掌握证据？
- 正确理解是什么？
- 常见误区是什么？
- 哪个干扰项承载这个误区？
- 题干是否自足，而不是“根据本文”？
- explanation 是否能在答后浮窗中帮助用户修正理解？

不应该做：

- 不生成明显错误或无关干扰项。
- 不写逐项解析。
- 不把正确选项写得明显更长。

### 5.5 `matchingDraftBatch`

ECD 对应：Task Model 中的关系任务。

应该问：

- 当前 unit 是否有天然关系结构？
- 学习者正确匹配这些关系，能证明什么理解？
- 左右项是层级-作用、步骤-目的、角色-职责、信号-动作，还是类型-判断维度？
- 如果只是名词-定义，是否应该改成选择题？
- 匹配项数量是否来自自然关系，而不是为了凑数？

不应该做：

- 不只写“ECD 是隐性思考方法”。
- 不为了固定 4 对而补弱关系。
- 不生成机械名词释义题。

### 5.6 `unitCopyBatch`

ECD 对应：Presentation Process + formative feedback。

应该问：

- unit overview 是否帮助用户进入学习对象？
- unit summary 是否回到本 unit 的核心掌握点？
- 文字是否适配移动端阅读？
- 是否避免把总结写成另一道题的解释？

## 6. ECD 在拾贝中的边界

ECD 是设计理论，不是模型输出格式。

应该保留：

- 学习对象。
- 可观察证据。
- 任务形态。
- 证据覆盖。
- source grounding。
- formative feedback。

不应该默认输出：

- 完整 ECD 论文式字段。
- 推理链。
- 候选任务矩阵。
- 冗长的 evidence rationale。
- 每层思考的全文 JSON。

原因：

- 这些会造成 token 暴涨。
- 会降低 JSON 稳定性。
- 会让 prompt 变成理论复述，而不是任务执行。
- 会让模型为了填字段而牺牲题目质量。

## 7. 显式推理的边界：短结构化工作票据，而不是长 CoT

大模型研究给了一个重要启发：让模型显式生成中间推理，常常能提升复杂任务质量。Chain-of-Thought、Zero-shot-CoT、Least-to-Most、Plan-and-Solve、Self-Ask 和 Self-Discover 都说明，模型在处理复杂任务时，适当的分解和中间步骤能帮助它做出更好的结果。

但拾贝不能把这件事简单理解成“让模型输出一长串思维链”。原因有三点：

- 长自由文本推理会显著增加 token 成本。
- 长推理链会增加 JSON 解析失败、截断和重试风险。
- 公开的 CoT 不一定忠实反映模型真正的决策过程，不能把它当成可靠解释。

因此，拾贝采用折中原则：

```text
可以显式化 ECD，但只显式化为短结构化工作票据。
不默认输出长篇 Chain-of-Thought。
```

所谓“短结构化工作票据”，是指每个关键生成阶段只保留下游真正需要、能被 schema 验证、能帮助质量诊断的小字段。例如：

```json
{
  "claim": "区分模型层级作用",
  "evidence": "能匹配层级与作用",
  "task": "matching",
  "misconception": "把组件当成完整设计"
}
```

这类字段的价值是：

- 让模型在生成题目前先完成最小必要思考。
- 给下游题目生成提供稳定抓手。
- 让质量报告能检查“这道题为什么存在”。
- 避免把 ECD 全链路写成重 JSON。

### 7.1 三种方式的取舍

| 方法 | 优点 | 风险 | 拾贝结论 |
| --- | --- | --- | --- |
| 只在 prompt 中放 ECD 自问清单 | 成本低、稳定 | 可能太弱，模型不一定真正执行 | 保留，但不能单独依赖 |
| 输出完整 CoT / ECD 推理链 | 可能提升复杂推理质量 | token 高、JSON 不稳、解释未必忠实 | 只用于 debug/experiment mode |
| 短结构化 ECD 工作票据 | 质量、稳定性和可审查性之间较平衡 | 需要仔细设计字段边界 | 默认主链路方向 |

### 7.2 工作票据的设计规则

- 每个字段都必须服务于下游生成或质量诊断。
- 每个字段都应该短，优先使用 enum、id、短句。
- 不输出候选矩阵、长篇 rationale、完整推理链。
- 不把所有 ECD 层级都机械持久化。
- 只有能防止漏知识点、改善题型选择或改善干扰项质量的字段才保留。
- 更完整的 ECD 推理只能作为显式 debug/experiment 模式打开。

## 8. 对当前系统的判断

当前系统已经有一些正确方向：

- 不再让模型直接从原文一步写题。
- 已有 unit / microKnowledge / task brief / draft 的金字塔结构。
- 选择题阶段已经部分使用 target、misconception 和 evidence。
- 连线题已经支持 2-4 对自然关系，不再强制 4 对。

但仍有明显不足：

- 一些 prompt 仍停留在“请按 ECD 思考”层面。
- `matchingDraftBatch` 等阶段还没有充分把 ECD 问题转成具体操作问题。
- `reviewPathPlan` 曾混入固定数量和黄金样稿特例，说明 prompt 仍需要防污染规则。
- 现有可视化文档需要明确区分 active main path 与 legacy/unused builder。

## 9. 下一步工作建议

下一步不应继续泛泛加 ECD 词汇，而应做一次 ECD prompt translation audit：

1. 对每个 active stage 列出它对应的 ECD 模型。
2. 标记当前 prompt 中哪些句子只是口号。
3. 把口号改成具体问题或动作。
4. 删除固定数量、黄金文章特例、过强产量约束。
5. 保持 compact 输出，不恢复 verbose ECD JSON。
6. 重新跑黄金文章，对比 unit 覆盖、题目质量、JSON 稳定性和 token 成本。

目标不是让 prompt 看起来更“学术”，而是让模型在每一步都知道：

```text
我要判断什么？
什么表现能证明它？
什么题能引出这种表现？
为什么这道题值得存在？
```

这就是 ECD 对拾贝 V2 最有价值的部分。
