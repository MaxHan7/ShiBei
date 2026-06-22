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

## 9. 当前结构是否需要大改

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

## 10. 和现有文档的关系

- `v2-llm-pipeline-technical-framework-zh.md`：解释整体技术框架。
- `v2-llm-pipeline-framework-explained-zh.md`：给非工程读者看的通俗解释。
- `v2-llm-stage-contracts-zh.md`：定义每个 stage 的工程合同。
- `v2-ecd-theory-background-zh.md`：解释 ECD 理论来源和产品转化。
- 本文档：定义每个 prompt 应该采用什么格式、为什么这样写、哪些写法禁止。

如果这些文档出现冲突，优先级建议为：

1. ECD 教育设计原则：`v2-ecd-theory-background-zh.md`
2. 技术架构原则：`v2-llm-pipeline-technical-framework-zh.md`
3. stage 工程合同：`v2-llm-stage-contracts-zh.md`
4. prompt 格式规范：本文档
