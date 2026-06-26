# 拾贝 V2 Prompt 格式技术依据与写法规范

本文档回答一个更具体的问题：拾贝 V2 为什么不继续使用旧版“长角色 prompt”，而采用现在这种 `stage / signature / schema / validator / eval` 的 prompt 结构。

结论先行：

- 当前 prompt 的大结构是合理的，不需要推倒重来。
- 这不是 DSPy 强制规定的固定模板，而是借鉴 DSPy 的核心工程思想：**Program, don't prompt**。
- 拾贝 V2 应采用的是 **DSPy-style modular prompt pipeline + schema-first structured output + ECD design principles inside each stage**。
- 旧版长角色 prompt 的优点是角色感强、表达自然；缺点是边界弱、难测试、难定位质量下降、容易累积成不可维护的大 prompt。
- 当前结构的主要任务不是恢复旧版写法，而是在每个 stage 内补上短而专业的角色定位和设计判断标准。

## 参考依据

本规范主要参考：

- DSPy: Program, don't prompt  
  https://dspy.ai/
- DSPy GitHub  
  https://github.com/stanfordnlp/dspy
- DSPy paper: Compiling Declarative Language Model Calls into Self-Improving Pipelines  
  https://arxiv.org/pdf/2310.03714
- OpenAI Structured Outputs  
  https://developers.openai.com/api/docs/guides/structured-outputs
- OpenAI Structured Outputs announcement  
  https://openai.com/index/introducing-structured-outputs-in-the-api/
- OpenAI prompt engineering best practices  
  https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api
- Microsoft prompt engineering techniques  
  https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/prompt-engineering
- Prompt Engineering Guide: Few-shot prompting  
  https://www.promptingguide.ai/techniques/fewshot

## 拾贝 V2 自己沉淀出的 prompt 写法准则

本节不是外部文档的翻译，也不是某个官方最佳实践的搬运。它是拾贝 V2 在黄金样稿、HTML 质量报告、ECD/DSPy 架构重构和多轮失败复盘中沉淀出来的内部写法标准。

### 1. Prompt 先服务 stage，不服务“角色表演”

每段 prompt 先回答：

- 这个 stage 在整个 pipeline 里负责什么。
- 它消费上游哪些信息。
- 它必须产出下游真正需要的哪些字段。
- 它不允许重做哪些上游任务。

允许有短角色，但短角色必须服务 stage 目标。例如：

```text
短角色：你在这一阶段扮演练习任务设计者；不写题，只把 micro knowledge 转成可观察掌握目标和题型计划。
```

不再使用旧版那种很长的“专家身份设定”。角色感可以帮助模型进入任务，但不能替代输入输出合同。

### 2. ECD 要写成具体判断动作，不写成口号

无效写法：

```text
请按照 ECD 思考。
```

有效写法：

```text
先判断这个知识点希望用户掌握什么，再判断什么回答表现可以证明掌握，最后选择能暴露这种表现的题型。
```

ECD 在 prompt 中应该表现为具体问题：

- 这个 unit 的学习对象边界是什么。
- 这个 micro knowledge 要观察什么掌握证据。
- 这道题暴露的是理解、边界、误区、迁移还是关系判断。
- 这个题型为什么能产生对应证据。

不要让模型输出完整 ECD 推理链；只保留对下游有用、短而稳定的结构化工作票据。

### 3. DSPy-style 的核心是清晰签名，不是越拆越多调用

每个 stage 都应该像一个小函数：

```text
input -> transformation -> output
```

但这不等于每个小动作都单独调用模型。拆分的标准是：

- 语义职责是否不同。
- 输入上下文是否明显不同。
- 输出 schema 是否可以保持小而稳定。
- 是否能帮助定位质量下降。

如果拆分后每个 stage 都重复读取全文、重复输出大 JSON，就违背了 DSPy-style 的初衷。

### 4. 上游做结构，下游做生成

不能让写题 prompt 重新决定整篇文章怎么切分，也不能让知识点切分 prompt 提前写题。

标准链路应该是：

```text
文章理解
-> unit 切分
-> micro knowledge inventory
-> practice goal / question plan
-> 具体题目生成
-> copy / summary
```

每一层只把下一层需要的最小信息往下传。这样既保留金字塔结构，又避免上下文膨胀。

### 5. 用正向行为规范，少用负面过度约束

之前多轮测试说明，类似“不要为了增加体量重复考同一个表现”这种负面约束，容易让模型误以为应该主动减少题目或减少多角度考察。

更好的写法是正向描述：

```text
多个 questionPlans 应分别服务于不同 evidence angle。
如果同一 micro knowledge 有多个关键掌握角度，可以设计多个任务分别观察。
```

也就是说，尽量告诉模型“应该怎样做”，不要堆太多“不要怎样做”。

### 6. 不写固定数量，除非它是产品约束

不能在通用 prompt 中写：

- 保留 4-7 个 unit。
- 每个 unit 必须 2 道题。
- matching 必须 4 对 4。

这些会让模型在不同文章长度和知识密度下输出僵化结果。

如果数量来自产品 UI 限制，要写清楚它是 UI 上限或展示约束，而不是知识结构判断。例如：

```text
如果可考关系自然少于 4 对，可以生成 2-3 对；不要为了凑数发明关系。
```

### 7. 示例只解释格式，不驱动内容

禁止把黄金测试文章里的专有例子写入通用 prompt。比如不能把某篇文章里的具体模型层级直接写成 matching 示例。

如果需要示例，优先使用抽象类别：

```text
matching 可以用于结构、流程、角色、条件、场景、因果、特征、判断依据或适用边界等稳定对应关系。
```

示例要帮助模型理解“关系类型”，不能诱导它复制某篇文章的题型。

### 8. 题目生成要围绕 evidence target，不围绕原文复述

选择题和连线题都必须回答：

- 它要证明用户掌握了什么。
- 错误选项或错误匹配暴露了什么误区。
- 题干是否像移动端复习任务，而不是阅读理解考试。
- explanation 是否适合答后浮窗，而不是逐项长解析。

题目不是“从文中找一句话问用户”，而是制造一个能观察理解证据的小任务。

### 9. 输出字段越少越好，但关键工作票据不能丢

为了稳定 JSON，不能让模型输出长篇思维链、候选矩阵、完整 ECD 分析。

但也不能把中间结构删到只剩用户可见字段，否则模型容易直接从原文跳到题目。

当前标准是保留短结构化工作票据，例如：

- micro knowledge id；
- evidence target；
- common misconception；
- task purpose；
- source anchor id；
- question type plan。

这些字段不是给用户看的，而是为了让下游生成有结构、有证据、有可追踪来源。

### 10. Prompt 改动必须能被结构页和质量报告审查

每次重要 prompt 改动后都应更新：

- `prompt-system/v2-prompt-system-structure.html`：看结构和 prompt 文案是否真的改了。
- quality run HTML：看输出质量是否变好。
- stage contract / field contract：看字段含义是否仍然一致。

如果一个写法只存在于对话里，没有进入文档、prompt 或结构页，就等于没有真正沉淀。

## 1. 旧版长角色 prompt 的问题

旧版本的 prompt 更像“多个专家角色轮流工作”：

```text
你是总结专家……
你是出题专家……
你是审核专家……
请根据以下文章生成……
```

这种写法在早期探索时很自然，因为它容易让模型进入任务状态。但进入 V2 后，它的问题变得明显：

- **职责边界不稳定**：一个 prompt 里经常同时做总结、拆知识点、选题型、写题、解释。
- **输出不稳定**：角色 prompt 容易让模型自由发挥，字段、数量、格式会漂移。
- **难以定位质量问题**：如果题目质量下降，很难知道是文章理解错、知识点切分错、题型计划错，还是题目生成错。
- **难以评估和回滚**：长 prompt 一改就是整段变化，无法按 stage 观察 token、retry、质量指标。
- **容易把设计原则写成口号**：例如“请按 ECD 思考”，但没有落到字段和阶段职责上。

因此旧版写法不适合作为 V2 的长期工程形态。

## 2. DSPy-style 给我们的核心启发

DSPy 的重点不是某种固定 prompt 文案，而是把 LLM 系统变成可维护程序：

- `Signature`：定义输入和输出。
- `Module`：定义一个明确转换步骤。
- `Program`：多个 module 组成 pipeline。
- `Metric / Optimizer`：用指标和样本迭代，而不是凭感觉堆 prompt。

映射到拾贝 V2：

| DSPy 概念 | 拾贝 V2 落地 |
| --- | --- |
| Signature | stage input/output contract |
| Module | `reviewPathPlan` / `unitKnowledgeMap` / `taskBriefPlan` / draft stages |
| Program | `generateReviewPathV2` workflow |
| Adapter | structured output caller + schema validator |
| Metric | golden sample / quality run / token / retry / coverage |
| Optimizer | 暂时人工 compare + checkpoint，不自动 compile |

所以我们不是“使用 DSPy 运行时”，而是在 Node 后端里采用 DSPy-style 的工程组织方式。

## 3. Structured Outputs 给我们的约束

生产系统不能只靠 prompt 里写“请输出 JSON”。OpenAI Structured Outputs 的核心思想是：让模型输出严格符合开发者提供的 JSON Schema。

对拾贝 V2 来说，这意味着：

- 每个 stage 都应该有明确 schema。
- schema 不应该过大，不应该包含整段长推理链。
- prompt 里不要让模型输出下游不需要的字段。
- 稳定 ID、source block、source anchor 这类确定性内容，优先由代码 adapter 处理。
- JSON 解析失败、provider 空返回、timeout，不靠继续堆 prompt 解决，而由 runtime/adapter 策略处理。

这就是为什么现在我们强调 `schema-first`、`validator` 和 `runtime reliability`。

## 4. ECD 在 prompt 里的正确位置

ECD 是教育设计原则，不是一个要整块输出的 JSON 对象。

错误做法：

```text
先输出完整 ECD 矩阵、完整证据链、完整候选任务推理，再生成题。
```

这种做法会导致：

- token 暴增；
- JSON 输出更不稳定；
- 用户看不到的中间字段过多；
- 模型把精力花在填表，而不是生成好题。

正确做法：

- 在 `reviewPathPlan` 中体现学习对象边界：什么应该成为 unit。
- 在 `unitKnowledgeMap` 中体现 domain/student model：拆出最小学习对象和可观察角度。
- 在 `taskBriefPlan` 中体现 evidence/task model：选择应观察的证据和任务形态。
- 在 draft stage 中体现 task design：题干、选项、干扰项和解释围绕 evidence target 生成。

也就是说，ECD 应该被拆进每个 stage 的判断标准里，而不是作为一个巨大中间产物。

## 5. 拾贝 V2 标准 prompt 格式

每个主链路 prompt 应优先采用以下结构：

```text
阶段：<stageName>

任务：这个 stage 只做什么，不做什么。

在 pipeline 中的位置：
- 上游给了什么。
- 下游需要什么。

输入边界：
- 允许使用哪些上下文。
- 不允许重做哪些上游任务。

设计原则：
- 该 stage 需要吸收哪些 ECD 原则。
- 该 stage 的专业判断标准是什么。

输出字段：
- 每个字段的用途。
- 字段长度、枚举、引用关系。

禁止事项：
- 不输出哪些字段。
- 不写哪些话。
- 不做哪些跨职责行为。
```

这个格式不是为了让 prompt 变长，而是为了让每个 stage 的职责稳定。

## 6. Stage 内可以保留“短角色”，但不恢复长角色

完全冷冰冰的接口说明也不够好。题目生成这类阶段需要模型知道自己的专业目标。

推荐写法：

```text
你在这一阶段扮演移动端复习题设计者。
目标不是考原文记忆，而是把 questionBrief 中的 evidence target 转成能暴露理解、边界或误区的题目。
```

不推荐写法：

```text
你是世界顶级教育心理学家、认知科学家、出题大师……
请深呼吸，一步一步思考……
```

原则是：

- 角色定位可以有，但必须短。
- 角色定位必须服务当前 stage。
- 不写夸张身份。
- 不用角色文本替代 schema 和字段定义。

## 7. 什么内容应该进 prompt，什么内容应该进代码

应该进 prompt：

- 语义判断标准；
- 教育设计原则；
- 题目质量标准；
- 字段含义；
- 不同 stage 的职责边界。

应该进代码：

- 稳定 ID；
- source block 切分；
- source anchor normalization；
- JSON schema validation；
- retry / timeout / provider error；
- HTML 报告；
- token / cost / retry 统计。

如果一个要求可以用确定性代码完成，就不要让模型输出。

## 8. 禁止的 prompt 写法

以下写法在主链路中默认禁止：

- 固定 unit 数量，例如“保留 4-7 个 unit”。
- 文章特例写进通用 prompt，例如直接写某篇测试文章里的专有例子。
- 固定每个 unit 必须有多少题。
- 固定每个 unit 必须包含某些 role。
- 把 ECD 完整推理链、候选矩阵、长篇自我解释输出成 JSON。
- 一个 stage 同时承担知识点切分、题型选择和题目生成。
- 用“请按 ECD 思考”代替具体判断标准。
- 用“你是专家”代替输入输出合同。

## 9. 示例与类别提示的使用原则

示例、few-shot 和类别提示是有效工具，但它们也是很强的行为锚点。写得太具体时，模型容易把示例当成固定模板，而不是理解背后的判断原则。

对拾贝 V2 来说，使用示例时遵守以下规则：

- 可以用示例说明输出格式，但不要把某篇测试文章里的专有内容写进通用 prompt。
- 可以给“关系类别”或“题型适配原则”，但不要把类别写成唯一可选清单。
- 优先写抽象判断标准，例如“稳定对应关系”“可观察掌握证据”“真实误区”，再补少量非穷尽类别。
- 如果确实需要举例，使用“例如 / 包括但不限于 / 可以是”这类开放表述，并确保示例不来自当前黄金测试文章。
- 不要为了说明 matching，把“某模型某层级 -> 某作用”这类文章特例写进 prompt；应该写“结构、流程、角色、条件、场景、因果、特征、判断依据或适用边界”等抽象关系类别。
- 不要为了说明选择题，把题目固定成某几个场景模板；应该写清它要暴露的 evidence target、边界判断或常见误区。

一句话：**示例用于解释格式，原则用于驱动判断。** 如果一个示例会让模型在别的文章里复制同一种切分、题型或关系，它就不应该进入通用 prompt。

## 10. 当前结构是否需要大改

当前结构大方向不用大改：

- `sourceMap` 确定性化，是正确方向。
- `reviewPathPlan` 负责整章理解和 unit 切分，是正确方向。
- `unitKnowledgeMap` 负责 micro inventory，是正确方向。
- `taskBriefPlan` 负责从 micro 到 task brief，是正确方向。
- draft stages 负责按 scoped context 写题，是正确方向。

但这不等于每个 prompt 已经最优。下一步应做的是：

- 逐个 stage 审查 prompt 是否符合本规范。
- 为每个 stage 补短角色和专业判断标准。
- 删除固定数量、文章特例和无谓约束。
- 保持 schema 小而稳定。
- 用质量 run 比较每次改动，而不是凭感觉判断。

## 11. 和现有文档的关系

- `v2-llm-pipeline-technical-framework-zh.md`：解释整体技术框架。
- `v2-llm-pipeline-framework-explained-zh.md`：给非工程读者看的通俗解释。
- `v2-llm-stage-contracts-zh.md`：定义每个 stage 的工程合同。
- `v2-ecd-theory-background-zh.md`：解释 ECD 理论来源和产品转化。
- `prompt-system/v2-prompt-system-structure.html`：长期保存的 prompt 系统结构可视化审查页。
- 本文档：定义每个 prompt 应该采用什么格式、为什么这样写、哪些写法禁止。

如果这些文档出现冲突，优先级建议为：

1. ECD 教育设计原则：`v2-ecd-theory-background-zh.md`
2. 技术架构原则：`v2-llm-pipeline-technical-framework-zh.md`
3. stage 工程合同：`v2-llm-stage-contracts-zh.md`
4. prompt 格式规范：本文档
