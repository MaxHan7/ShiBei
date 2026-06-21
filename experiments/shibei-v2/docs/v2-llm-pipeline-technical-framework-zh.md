# 拾贝 V2 LLM Pipeline 技术框架调研与落地方案

本文档回答一个工程问题：在 ECD 已经确定为拾贝 V2 出题系统的教育设计原则之后，后端 prompt / schema / runner 应该参考什么成熟技术框架来实现，才能同时解决稳定性、性能、质量和可维护性问题。

结论先行：

- 拾贝 V2 不适合做成开放式 autonomous agent。它更适合做成 **deterministic workflow + scoped LLM calls**。
- ECD 负责“为什么这样出题”；工程框架负责“如何稳定地产出这些结构化结果”。
- 技术侧最适合作为主参考的具体框架是 **DSPy-style LM Program**：用 signatures、modules、metrics、optimizers 管理 LLM pipeline，而不是手写越来越长的 prompt。
- BAML / OpenAI Structured Outputs / LangGraph 更适合作为配套工程能力，而不是主框架：
  - BAML：prompt + schema + tests 的资产管理参考。
  - OpenAI Structured Outputs：schema-first 和受约束输出参考。
  - LangGraph：长期 durable workflow / stateful orchestration 参考。
- 不建议现在整体迁移到 DSPy、LangGraph 或 BAML。更稳妥的路线是：**以 DSPy 的技术思想作为主架构参照，把现有 Node V2 pipeline 改造成 DSPy-style 的模块化 LM program**。
- 运行稳定性单独由 runtime/adapter 契约管理，见 `v2-llm-runtime-reliability-contract-zh.md`；不要把 provider 空返回、JSON 破损、timeout 这类工程问题继续塞进 prompt 文案。

## 参考资料

本轮调研主要参考：

- Anthropic, Building Effective Agents  
  https://www.anthropic.com/research/building-effective-agents
- LangGraph, Workflows and agents  
  https://docs.langchain.com/oss/python/langgraph/workflows-agents
- LangGraph overview  
  https://docs.langchain.com/oss/python/langgraph/overview
- OpenAI Structured Outputs  
  https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI Structured Outputs announcement  
  https://openai.com/index/introducing-structured-outputs-in-the-api/
- LangSmith Evaluation  
  https://docs.langchain.com/langsmith/evaluation
- DSPy  
  https://dspy.ai/
- DSPy GitHub  
  https://github.com/stanfordnlp/dspy
- BAML structured output survey  
  https://boundaryml.com/blog/structured-output-from-llms
- Claude prompt caching  
  https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- OpenAI prompt caching announcement  
  https://openai.com/index/api-prompt-caching/

## 主参考框架：DSPy-style LM Program

如果 ECD 是拾贝 V2 的教育设计原则，那么技术侧最接近“可长期对标的一套成熟方案”的是 DSPy。

DSPy 官方定位是 “Program, don’t prompt”。它把任务表达成 structured signatures，而不是手写 prompt 字符串；把 LLM pipeline 抽象成由 declarative modules 组成的程序；再通过 metrics / optimizers 对 pipeline 进行优化。论文中也把它描述为把 LM pipeline 抽象成 text transformation graph，并用 declarative modules 替代试错式 prompt templates。

这和拾贝当前问题高度吻合：

| 拾贝问题 | DSPy 对应思想 |
| --- | --- |
| prompt 越写越长 | 用 signature 定义输入输出，不把全部逻辑塞进 prompt 文案 |
| 阶段职责混乱 | 用 module 定义每个阶段，只做一种 text transformation |
| 输出不稳定 | 每个 module 有明确 output schema / adapter |
| 质量波动 | 用 metric 和 golden dataset 评估 pipeline |
| 不知道改 prompt 后效果如何 | 用 experiment / compile / compare 的方式迭代 |

### 为什么不是 LangGraph 作为主框架

LangGraph 很适合 durable、stateful、long-running agent/workflow orchestration。它解决的是：

- 状态持久化
- 分支与循环
- 多 agent 协作
- 人工介入
- 长任务部署与恢复

这些很重要，但它不是我们当前最核心的短板。我们现在最核心的问题是：prompt pipeline 的职责、输入输出、评估指标不够像一个可维护程序。这个问题更接近 DSPy 的问题域。

因此：

- 主架构参考：DSPy-style LM Program。
- 长期 orchestration 参考：LangGraph-style stateful workflow。

### 为什么不是 BAML 作为主框架

BAML 很适合 structured output 和 prompt/schema 管理。它解决的是：

- prompt 函数化
- schema 管理
- structured output
- prompt tests / playground

但 BAML 更像工程实现工具，不直接定义“如何把一个复杂认知任务拆成可优化的 LM program”。拾贝需要的上层思想是：每个阶段是一个 module，每个 module 有 signature，每次迭代用 metric 评估。

因此：

- 主架构参考：DSPy。
- prompt/schema 资产管理参考：BAML。

### 当前是否迁移到 DSPy

暂时不迁移。

原因：

- DSPy 是 Python 生态，而 V2 后端当前是 Node。
- 我们现在还在探索字段与质量，贸然迁移会增加变量。
- 真正需要先落地的是 DSPy 的工程思想，不是它的运行时。

当前落地方式：

```text
DSPy concept            -> 拾贝 Node 实现
------------------------------------------------
Signature               -> stage input/output contract
Module                  -> sourceMap / reviewPathPlan / unitKnowledgeMap / ecdPlanning / draft stages
Program                 -> generateReviewPathV2 workflow
Metric                  -> golden quality metrics
Optimizer / compiler    -> 暂不自动优化，先人工根据 eval 迭代
Examples / demos        -> golden samples / prompt-example-candidates
Adapter                 -> structured output caller + schema validator
```

换句话说，下一阶段不是“使用 DSPy”，而是把拾贝 V2 后端改造成 **DSPy-style architecture**。

配套的阶段级工程契约见：

- `v2-llm-stage-contracts-zh.md`：定义每个 V2 LLM stage 的 signature、输入输出、source context 策略、禁止职责、指标和当前实现差距。

## DSPy-style 到拾贝 V2 的具体技术标准

为了避免又回到泛泛讨论，后续每个阶段都应按照以下模板定义。

### 1. Signature

每个 stage 必须有明确 signature：

```text
StageName(InputFields) -> OutputFields
```

示例：

```text
UnitKnowledgeMap(
  unit[],
  sourceContextBlocks[]
) -> microKnowledgePoints[]
```

```text
EcdPlanning(
  unit,
  microKnowledgePoints[],
  sourceContextBlocks[]
) -> assessableTargets[], selectedTasks[]
```

```text
MultipleChoiceDraft(
  unit,
  selectedTask,
  sourceContextBlocks[]
) -> multipleChoiceQuestion
```

要求：

- signature 只描述必要输入输出。
- 不能把“可能有用”的整包对象塞进去。
- 如果一个字段没有被下游使用，就不能默认进入 output schema。

### 2. Module

每个 stage 是一个 module。

Module 的职责必须单一：

| Module | 允许做 | 不允许做 |
| --- | --- | --- |
| `SourceMapModule` | 切 source blocks | 判断知识点价值 |
| `ReviewPathPlanModule` | 切 visible units | 拆 micro points |
| `UnitKnowledgeMapModule` | 拆 unit 内小知识点 | 选题型 |
| `EcdPlanningModule` | 选 targets 和 tasks | 写具体题目 |
| `QuestionDraftModule` | 写题目 | 重新规划知识结构 |
| `UnitSummaryModule` | 写开场/总结文案 | 改题目 |

如果一个 prompt 同时做两件以上的事，优先拆 module，而不是继续加规则。

### 3. Metric

每个 module 要有对应 metric。

| Module | 主要 metric |
| --- | --- |
| `SourceMapModule` | block 稳定性、原文覆盖、block 数 |
| `ReviewPathPlanModule` | unit 边界、DMC 是否独立、nodeLabel 长度 |
| `UnitKnowledgeMapModule` | micro 覆盖、是否漏关键小知识点 |
| `EcdPlanningModule` | required target 覆盖、selectedTasks 是否覆盖多角度 |
| `QuestionDraftModule` | 题干自足、干扰项误区价值、解释适配 UI |
| `MatchingDraftModule` | 关系价值、4x4 合同、是否机械名词定义 |
| `FullPipeline` | JSON 成功率、耗时、题量、unit 覆盖、人工质量评分 |

没有 metric 的 prompt 改动，不应该进入主链路。

### 4. Adapter / Structured Output

每个 module 的输出必须经过 adapter：

```text
model raw response
  -> schema parse
  -> local validation
  -> normalization
  -> stable internal object
```

规则：

- retry 只处理结构错误、截断、少字段这类工程错误。
- 不用 retry 悄悄修复教学质量问题。
- 教学质量问题进入 report / eval，再决定是否改 prompt 或 module。

### 5. Examples / Golden Dataset

DSPy 强调 examples 和 metrics 对优化的重要性。拾贝对应为：

- golden samples
- prompt example candidates
- quality run reports
- 手动标注的关键质量断言

例如游戏化黄金文章中至少有这些断言：

- DMC 模型必须是独立 unit。
- DMC 应保留层级作用关系。
- DMC 适合 matching。
- 游戏化核心概念不应吞掉 DMC。
- nodeLabel 应是短短语，而不是长摘要。

这些断言应该从“人工记忆”逐步变成 eval checklist。

## 下一步细化路线

既然主参考框架确定为 DSPy-style LM Program，下一步不是继续讨论“要不要用这个方向”，而是把它逐层细化成可以执行的工程标准。

### 第一层：Stage Signature 表

目标：把每个阶段的输入输出写清楚，防止继续把整包上下文塞进 prompt。

需要产出一张表：

| Stage | Input | Output | 不允许输入 | 不允许输出 |
| --- | --- | --- | --- | --- |
| `sourceMap` | `article.rawText` | `source.blocks[]` | 已生成题目、ECD 字段 | 知识点、题目 |
| `reviewPathPlan` | `source.blocks[]`、article meta | `summaryCard`、`units[]`、`chapterSummary` | micro knowledge、题目计划 | 题目、unit 内部小点 |
| `unitKnowledgeMap` | `units[]`、plan source window | `microKnowledgePoints[]` | full article raw text、selectedTasks | 题目、题型 |
| `ecdPlanning` | current unit、micro points、unit source window | `assessableTargets[]`、`selectedTasks[]` | full chapter source、完整 ECD verbose 链 | 用户可见题目 |
| `multipleChoiceDraft` | current unit、one or more MC tasks、unit source window | MC questions | 其他 unit context | 新增题型计划 |
| `matchingDraft` | current unit、matching tasks、unit source window | matching questions | 其他 unit context | 新增题型计划 |
| `unitSummaryDraft` | current unit、questions、unit source window | `overview`、`summary` | full ECD context | 题目 |

这张表后续应该成为 `generateReviewPathV2` 的代码审查基准。

### 第二层：Module Contract 文件

目标：每个 stage 都有一个像 DSPy signature 一样的 contract，而不只是 prompt 字符串。

建议新增或整理：

```text
experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md
```

每个 stage 记录：

- stage name
- purpose
- input contract
- output contract
- source context rule
- schema file
- prompt builder
- validator
- fixture
- metrics
- failure policy

### 第三层：Context Passing 标准

目标：解决 input token 浪费。

细化规则：

- `reviewPathPlan` 可以使用完整 source blocks。
- `unitKnowledgeMap` 使用 plan union source window。
- per-unit stages 使用 unit source window。
- 如果 unit source window 不够支撑题目，允许扩展 window，而不是直接传整篇。
- 报告中必须展示每个 stage 实际收到多少 source blocks。

这对应当前计划：

```text
docs/superpowers/plans/2026-06-21-v2-context-passing-slimming.md
```

### 第四层：Metric / Eval 标准

目标：让 prompt 修改不再靠感觉。

需要把 golden report 中人工判断逐步变成固定指标：

| Metric | 用途 |
| --- | --- |
| `json_success_rate` | 判断输出稳定性 |
| `stage_latency_ms` | 判断性能 |
| `input_blocks_by_stage` | 判断 context 是否瘦身 |
| `unit_boundary_score` | 判断知识点切分 |
| `micro_coverage_score` | 判断 unit 内小知识点是否完整 |
| `selected_task_coverage` | 判断 ECD 是否覆盖 required targets |
| `matching_relation_value` | 判断连线题是否有关系价值 |
| `distractor_value` | 判断干扰项是否有真实误区 |
| `source_anchor_precision` | 判断题目是否有可靠原文支撑 |

第一阶段不需要全部自动化，可以先做到：

- 自动记录结构指标。
- 人工标注质量指标。
- 每轮报告有 baseline/current 对比。

### 第五层：Prompt Asset 管理标准

目标：让 prompt 像代码一样管理。

规则：

- 每个 prompt builder 必须对应一个 schema。
- 每个 schema 必须有 validator test。
- 每个 prompt 必须有 prompt text test，检查关键原则和禁用臃肿字段。
- 每次 prompt 改动必须记录实验 label 和质量报告。
- prompt 中不直接塞整份长期原则文档，只引用当前 stage 需要的少量规则。

### 第六层：Skill 沉淀

等以上 1-5 层至少完成第一版后，再把它沉淀成 Codex skill。

skill 名建议：

```text
shibei-v2-llm-pipeline-architecture
```

skill 应该包含：

- DSPy-style 主框架解释。
- ECD 与 DSPy-style 的分工。
- stage contract 写法。
- context passing 检查清单。
- prompt/schema/test/report 一致性检查清单。
- 修改 prompt 前必须跑的最小测试。

这一步不能太早做。否则 skill 会固化一个还没验证完的草案。

## 当前问题地图

从最近几轮质量报告看，V2 pipeline 暴露了四类主要问题：

| 问题 | 具体表现 | 技术根因 | 对应成熟方案 |
| --- | --- | --- | --- |
| 输出不稳定 | JSON 解析失败、输出截断、某阶段长时间无返回 | 单阶段输出过长；schema 过重；上下文过大 | Structured output、small schema、validation retry |
| 性能压力 | max1 都慢；per-unit 阶段重复读整篇文章 | input token 重复；阶段边界没有最小上下文 | Context engineering、prompt caching |
| 质量波动 | DMC 被合并、题量塌缩、matching 有时消失 | workflow 层级职责不清；题型选择和知识覆盖混在一起 | Prompt chaining、workflow state |
| 可维护性差 | prompt 越写越长，改动影响难定位 | prompt 不是工程资产；缺少版本化 eval | BAML/DSPy 思想、LangSmith-style eval |

另外还有两个次级问题：

- **可观测性问题**：HTML report 很有用，但还没有形成固定指标、固定数据集、固定版本对比。
- **运行恢复问题**：正式产品里不能因为某个模型阶段失败就让用户无感等待；需要阶段级状态、重试和失败恢复。

## 技术框架 1：Workflow，而不是开放式 Agent

### 成熟方案怎么说

Anthropic 把 agentic systems 分为 workflows 和 agents。workflows 是预先定义好的代码路径，agents 则动态决定流程和工具。LangGraph 也明确区分 workflows 与 agents：workflow 适合固定顺序、可调试、可部署的流程。

### 对拾贝的判断

拾贝 V2 的后端不是“让 AI 自己决定怎么完成任务”。我们的产品需要稳定地生成：

```text
文章结构 -> 知识点 -> 小知识点 -> evidence target -> 题型计划 -> 题目 -> 总结
```

所以它应该是 workflow，不是开放式 agent。

### 落地原则

主链路应保持固定阶段：

```text
sourceMap
  -> reviewPathPlan
  -> unitKnowledgeMap
  -> per-unit ecdPlanning
  -> deterministic practicePlan adapter
  -> multipleChoiceDraft / matchingDraft
  -> unitSummaryDraft
  -> deterministic diagnostics/report
```

每个阶段只允许做一件事：

| 阶段 | 做什么 | 不做什么 |
| --- | --- | --- |
| `sourceMap` | 切稳定 source block | 不总结、不出题 |
| `reviewPathPlan` | 定章节概要和 visible units | 不拆 unit 内部小知识点 |
| `unitKnowledgeMap` | 拆 unit 内 micro knowledge points | 不选题型 |
| `ecdPlanning` | 选可观察 target 和 selectedTasks | 不写用户可见题目 |
| draft stages | 写具体题目 | 不重新规划题型 |
| diagnostics | 展示问题 | 默认不拦题、不改写 |

### 现在是否要引入 LangGraph

暂时不建议。

原因：

- 当前 Node pipeline 已经有固定 stage runner。
- 真正问题不是缺图框架，而是 stage context 和 schema 太重。
- 引入 LangGraph 会带来 Python/JS 生态和部署复杂度。

建议：先借鉴 LangGraph 的思想，把当前 orchestration 做得像一个清晰 workflow；如果后面需要 durable execution、human-in-loop、状态恢复和可视化 trace，再评估是否引入类似框架。

## 技术框架 2：Schema-first Structured Output

### 成熟方案怎么说

OpenAI Structured Outputs 强调：输出应该严格遵守开发者提供的 JSON Schema，而不是只靠 prompt 里写“请输出 JSON”。BAML、Instructor、Outlines、Guidance 也都围绕“让 LLM 输出稳定结构”解决类似问题。

### 对拾贝的判断

我们现在已经有 schema 和 validator，这是对的。但问题在于：

- 有些 schema 仍然太大。
- 有些 schema 保存了 prompt 内部思考，而不是下游真正需要的字段。
- 有些字段只是为了 debug，但默认跑生产链路也输出了。

### 落地原则

每个阶段的 schema 要分三层：

| 层级 | 是否输出为 JSON | 例子 |
| --- | --- | --- |
| 用户可见字段 | 是 | `question.stem`、`options`、`explanation` |
| 后端必要中间字段 | 是，但要 compact | `microKnowledgePoints`、`assessableTargets`、`selectedTasks` |
| prompt 内部思考 | 默认不输出 | 完整 learning claim 草稿、候选任务矩阵、被拒绝任务理由 |

### 当前最应该做的事

- 保持 `unitKnowledgeMap`，它防止漏小知识点。
- 保持 compact `ecdPlanning`，它驱动题型计划。
- 不恢复 verbose ECD JSON。
- 不默认启用 full-path `qualityJudge`。
- 如果需要质量审查，未来改成 per-unit 或 per-question 小 schema。

### 是否要引入 BAML / Instructor

短期不建议立即迁移。

但建议借鉴 BAML 的工程资产管理方式：

- prompt 与 schema 一一绑定。
- 每个 prompt 有测试。
- 每个 schema 有 fixture。
- 每次改 prompt 都跑 golden dataset。
- prompt 版本需要能追踪到质量报告。

如果之后 Node 侧 JSON 稳定性仍然很差，可以评估：

- 在 Node 里继续用当前 validator + retry。
- 或把 prompt/schema 层迁到 BAML 管理，再由 Node 调用生成结果。

## 技术框架 3：Context Engineering

### 成熟方案怎么说

RAG / context engineering 的核心不是“给模型更多原文”，而是“给当前任务最相关的上下文”。LlamaIndex 等框架把 retrieval、context assembly、response synthesis 分开，就是为了避免每一步都吃全部文档。

Prompt caching 也能降低长 prompt 的成本和延迟，但它依赖稳定前缀。我们的 per-unit 输入高度动态，所以不能把 prompt caching 当作第一解法。

### 对拾贝的判断

当前最大 input token 浪费是：

```text
每个 per-unit stage 都重复输入整篇 source blocks。
```

这不是 ECD 的问题，是 context passing 的问题。

### 落地原则

上下文传递应分层：

| 阶段 | 需要原文范围 | 原因 |
| --- | --- | --- |
| `sourceMap` | 整篇原文 | 要切 source blocks |
| `reviewPathPlan` | 整篇 source blocks | 要决定章节概要和 unit 边界 |
| `unitKnowledgeMap` | 所有 unit anchors 的 union window | 要拆每个 unit 内的小知识点 |
| `ecdPlanning` | 当前 unit anchor window | 只规划当前 unit |
| `multipleChoiceDraft` | 当前 unit anchor window + selectedTasks | 只写当前 unit 的题 |
| `matchingDraft` | 当前 unit anchor window + relations/tasks | 只写当前 unit 的连线题 |
| `unitSummaryDraft` | 当前 unit anchor window + 已生成题目 | 只写当前 unit 总结 |

### 当前已计划的下一步

见：

`docs/superpowers/plans/2026-06-21-v2-context-passing-slimming.md`

核心是新增 source context window：

```text
full source blocks
  -> plan union window
  -> unit anchor window
```

## 技术框架 4：Eval-driven Development

### 成熟方案怎么说

LangSmith Evaluation 的核心流程是：

1. 建 dataset。
2. 定 evaluator。
3. 跑 experiment。
4. 对比实验结果。

OpenAI evals 也是类似思路：固定输入、固定评估标准、版本化比较。

### 对拾贝的判断

我们现在已经有质量 HTML report，但还不是完整 eval system。

现在的问题是：

- 人工能看，但指标还不够稳定。
- 每一轮 report 有记录，但没有固定的“必过检查”。
- 还没有多文章 dataset。

### 落地原则

先建立轻量 eval harness，不急着上 LangSmith。

固定 dataset：

- `golden-gamification-dmc`
- 再补 3-5 篇不同类型文章：
  - 概念型文章
  - 流程型文章
  - 工具教程型文章
  - 观点论证型文章
  - 案例/故事型文章

固定指标：

| 指标 | 说明 |
| --- | --- |
| `json_success_rate` | 每阶段结构化输出成功率 |
| `stage_latency_ms` | 每阶段耗时 |
| `input_block_count_by_stage` | 每阶段输入 source block 数 |
| `unit_count` | visible unit 数 |
| `micro_count_per_unit` | 每个 unit 内小知识点数量 |
| `selected_task_count_per_unit` | 每个 unit 最终题目计划数 |
| `matching_count` | 连线题数量 |
| `required_target_coverage` | required target 是否被 selectedTasks 覆盖 |
| `source_anchor_precision_manual` | 人工抽查 source anchor |
| `distractor_value_manual` | 人工抽查干扰项质量 |

质量报告应支持横向比较：

```text
baseline report
current report
delta:
  unit count
  question count
  matching count
  DMC preserved?
  parse failures?
  per-stage latency?
```

## 技术框架 5：Prompt / Program Asset Management

### 成熟方案怎么说

DSPy 的核心理念是 “program, not prompt”：把 LLM 应用写成模块化程序，用 signature 定义输入输出，并用指标优化。

BAML 的核心价值也类似：prompt、schema、测试、trace 应该是可管理的工程资产，而不是散落在代码里的字符串。

### 对拾贝的判断

我们不一定要马上用 DSPy 或 BAML，但必须吸收这个思想：

```text
prompt 不是文案，是代码资产。
schema 不是附属校验，是 stage contract。
quality report 不是临时页面，是 regression artifact。
```

### 落地原则

每个 stage 应有：

| 资产 | 示例 |
| --- | --- |
| stage name | `ecdPlanning` |
| input contract | `unit + unitKnowledgeMap + sourceContext` |
| output schema | `assessableTargets + selectedTasks` |
| prompt builder | `buildEcdPlanningMessages()` |
| fixture | `ecdPlanningFixture()` |
| validator tests | schema ok / bad enum / missing id |
| prompt tests | 包含关键原则，不包含过重禁令 |
| quality report section | 显示 target/task coverage |

未来如果抽成 skill，skill 应该记住这些规则：

- 新增 stage 前必须说明 stage 只做一件事。
- 新增字段前必须说明是用户可见、后端必要，还是 debug-only。
- 修改 prompt 前必须指定受影响 eval 指标。
- 真实质量测试必须固定 dataset 和 label。

## 技术框架 6：Reliability / Retry / Failure Recovery

### 成熟方案怎么说

LangGraph 关注 durable execution、persistence、debugging、deployment。生产级 workflow 不能只靠“一次跑完”。

Structured output 框架通常还会配 validation retry：解析失败时，把错误上下文反馈给模型重试。

### 对拾贝的判断

现在我们已经遇到：

- JSON 解析失败。
- 某阶段长时间无返回。
- 输出被截断。
- stage 失败后需要定位。

正式产品中，这些不能只出现在 CLI 报告里。

### 落地原则

每个 generation job 应该有：

| 能力 | 说明 |
| --- | --- |
| stage state | `submitted / extracting / planning / generating / completed / failed` |
| stage timeout | 每阶段独立超时，不只全局超时 |
| retry policy | 解析失败、小 schema 重试；质量不好不默认重试 |
| partial artifact | 成功阶段结果落盘或入库 |
| idempotency key | 同一文章重复生成可识别 |
| user-facing fallback | 生成失败通知、失败详情页、可重新生成 |

当前短期不需要实现完整 durable execution 框架，但需要让 `runV2GenerationJob` 的内部结构向这个方向靠拢。

## 技术框架 7：Cost / Latency Optimization

### 成熟方案怎么说

Prompt caching 可以降低重复长 prompt 的成本与延迟，但它对“相同前缀”更有效。OpenAI 和 Anthropic 都有 prompt caching 能力或说明。

### 对拾贝的判断

我们的优先级应是：

1. 先减少不必要上下文。
2. 再减少不必要输出字段。
3. 再考虑 prompt caching。

原因：如果 prompt 本身臃肿，cache 只是让臃肿便宜一点，不会让结构更清晰。

### 可落地措施

短期：

- source window。
- compact schema。
- deterministic adapters。
- 禁止默认 full-path judge。

中期：

- 对通用 system prompt 和固定规则使用稳定前缀。
- 把少量 few-shot example 放在固定前缀中。
- 如果模型/provider 支持，再启用 prompt caching。

长期：

- 多 provider A/B。
- 轻模型做 sourceMap 或 deterministic 替代。
- 高质量模型只用于 ECD planning / final question drafting。

## 拾贝 V2 推荐目标架构

综合上述，推荐架构如下：

```text
             ┌────────────────────────┐
             │  Article Input          │
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │  sourceMap              │
             │  full article -> blocks │
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │  reviewPathPlan         │
             │  chapter + visible units│
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │  sourceContext selector │
             │  plan/unit windows      │
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │  unitKnowledgeMap       │
             │  micro inventory        │
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │  per-unit ecdPlanning   │
             │  targets + selectedTasks│
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │ deterministic adapter   │
             │ practicePlan            │
             └───────────┬────────────┘
                         ↓
          ┌──────────────┴──────────────┐
          ↓                             ↓
┌────────────────────┐        ┌────────────────────┐
│ multipleChoiceDraft │        │ matchingDraft       │
└──────────┬─────────┘        └──────────┬─────────┘
           └──────────────┬──────────────┘
                          ↓
             ┌────────────────────────┐
             │ unitSummaryDraft        │
             └───────────┬────────────┘
                         ↓
             ┌────────────────────────┐
             │ deterministic diagnostics│
             │ HTML / JSON reports      │
             └────────────────────────┘
```

## 阶段性技术选型

### 现在就做

1. Source context window。
2. 每阶段小 schema。
3. 每阶段 input/output contract 文档化。
4. quality report 记录 token / block / latency / parse retry。
5. golden dataset 固化。

### 短期借鉴，不直接引入

1. LangGraph 的 workflow / durable execution 思想。
2. BAML 的 prompt + schema + test 资产管理方式。
3. LangSmith 的 eval dataset / experiment 对比方式。
4. DSPy 的 module/signature 思想。

### 暂时不做

1. 不把 V2 改成开放式 agent。
2. 不默认加入 evaluator-optimizer 改写循环。
3. 不把每个 ECD 中间思考都输出成 JSON。
4. 不把 prompt caching 当成第一优化手段。
5. 不迁移到 Python DSPy / LangGraph，除非 Node 方案证明难以维护。

## 和当前计划的关系

当前最直接的工程计划是：

`docs/superpowers/plans/2026-06-21-v2-context-passing-slimming.md`

该计划对应本文的：

- Context Engineering
- Small schema / small payload
- Eval report observability

它应该先执行，因为它解决的是当前最明显的 input token 和上下文传递问题。

执行完后，下一轮再考虑：

1. 把 stage contract 文档化成表。
2. 给每个 stage 建立固定 fixture 和 prompt test。
3. 把 golden report 升级成横向 comparison report。
4. 再讨论是否把这一套沉淀成 Codex skill。

## 未来 Skill 草案方向

如果后续把本文沉淀成长期 skill，skill 不应该叫“出题 prompt 技巧”，而应该叫：

```text
shibei-v2-llm-pipeline-architecture
```

它要记住的长期原则：

1. ECD 是教育设计原则，不是要求模型输出完整 ECD 论文。
2. 拾贝后端是 deterministic workflow，不是开放式 agent。
3. 每个 stage 只做一件事。
4. 每个 stage 只吃必要 context。
5. 每个 stage 输出最小可用 schema。
6. prompt/schema/test/report 是同一组工程资产。
7. 改 prompt 必须跑 golden dataset。
8. 质量改写角色只能做 A/B 实验，不能默认掩盖主链路问题。
