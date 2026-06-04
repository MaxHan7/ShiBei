# 出题系统实验与生产隔离总计划

> 本文档定义后续出题系统实验的全局边界。
> 目标不是停止实验，而是避免实验规则、单篇样本假设和临时评分指标继续直接污染生产生成链路。

## 背景

过去几轮实验证明了几件事：

- 题卡需要保持轻，复杂背景、完整解释和来源证据应该放到答后展开。
- 题目必须来源支撑、答案唯一、解释可信。
- 题量不是核心目标，核心目标是帮助用户真正理解和回忆文章。
- 单篇黄金样本可以暴露问题，但不能直接把单篇修复逻辑写进生产 prompt。

同时也暴露了一个反向风险：

- prompt 越堆越长，模型注意力会被大量规则分散。
- 指标越堆越多，容易优化“看起来可测”的东西，而不是用户学习体验。
- 围绕一篇 Hook 文章修太多细节，会让系统过拟合，不一定适合其它文章类型。
- 低置信、来源最小化、题量覆盖等指标一旦被污染，就不能继续作为主导优化目标。

因此后续采用双轨制：

- **生产线**：保持简洁、稳定、PRD 对齐，只使用已验证的核心规则。
- **实验室**：允许探索 DSPy、黄金样本、字段级 rubric、替代 prompt 和评分器，但必须隔离运行。

## 核心原则

### 1. 生产代码默认不跟随实验变化

实验结果不能直接改生产 prompt、生产选择器或生产评分器。
任何实验能力进入生产前，必须经过“提升证据 + 回归验证 + 生产简化”三步。

### 2. 黄金样本是校准工具，不是硬编码目标

Hook 文章黄金样本用于统一字段判断标准：

- 题干是否轻。
- 正确选项是否体现本质理解。
- 干扰项是否真实、有价值、同语境。
- 常见误区是否帮助用户理解，而不是模型想象。
- 来源是否足够解释当前题目。

但生产系统不能追求逐字复刻黄金样本，也不能把 Hook 文章结构写成通用规则。

### 3. 指标只做诊断，不做自动裁判

字段级人工标准优先级高于机器分数。
机器分数可以帮助排序、筛查和发现问题，但不能替代人工金标。

被污染或含义漂移的指标要降级处理，例如：

- 长期偏高且不能区分好坏的 `low_confidence`。
- 过度推动来源裁短的 `sourceMinimalityScore`。
- 只反映数量、不反映学习价值的题量覆盖率。

### 4. 每轮只改一个小模块

后续实验必须小步推进。每轮只允许主要验证一个问题，例如：

- 干扰项生成是否更有学习价值。
- 题干是否更轻且仍考核心理解。
- 常见误区是否更贴近真实混淆。
- 来源上下文是否足够解释题目。

禁止一轮同时改知识点、题干、选项、解释、来源和评分器，否则无法归因。

### 5. 实验产物必须可回溯

每轮实验都要保存脱敏产物：

- JSON：模型输出、知识点、题目、诊断、指标。
- CSV：字段级人工审查表。
- Markdown：实验假设、改动、结果、人工结论、下一步。

报告不粘完整原始输出，不写 API key，不保存完整原文到仓库。

## 当前生产线定义

生产线保持 PRD 核心目标：

- 帮用户把文章中值得记住的知识点转成可复习题。
- 题卡要适合随手复习，题干和选项不能过重。
- 题目必须答案唯一、来源支撑、解释忠实。
- 题量动态变化，不硬编码每篇文章或每个知识点固定题数。
- 不为了凑题放行低价值题、离谱干扰项或来源不支撑题。

生产线可以保留：

- 轻量题卡护栏。
- 答案唯一性检查。
- 来源支撑检查。
- 动态 1-3 题目标。
- 基础质量诊断。

生产线暂不默认引入：

- 单篇文章结构强绑定。
- 复杂 source block 分配。
- 强制 practice blueprint。
- 为补齐题量而额外 supplement 的生产路径。
- DSPy 自动优化后的 prompt，除非通过生产准入门槛。

## 实验室定义

实验室用于探索新方法，但不直接影响线上生成。

建议目录边界：

```text
quality-test-set/
  results/
    single-article/
      <slug>/
        runs/
        reviews/
        analysis/

docs/
  question-golden-sample-field-rubric-zh.md
  question-generation-experiment-isolation-plan-zh.md

experiments/
  question-generation/
    README.md
    prompts/
    scripts/
  dspy/
    README.md
    modules/
    metrics/
```

第一版可以先不创建完整 `experiments/` 目录；只有真正开始实验实现时再落地。本文档先作为边界。

## 黄金样本体系

当前最重要黄金样本：

```text
quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/
```

它的作用是：

- 保存人工修订后的高质量目标。
- 保存字段级判断标准的讨论记录。
- 记录每一轮生成结果与黄金样本的字段级差距。
- 提供 DSPy 或其它 prompt 优化方法的训练/验证材料。

它不能承担的作用：

- 不能代表所有文章类型。
- 不能作为生产 prompt 的唯一优化目标。
- 不能让系统过度学习 Hook 文章的结构和措辞。

后续至少需要补充不同类型样本：

- 工具方法型文章。
- 观点论证型文章。
- 案例复盘型文章。
- 轻科普/概念解释型文章。
- 更短、更长、更碎片化的真实用户输入。

## DSPy 实验计划

DSPy 可以帮助我们把 prompt 迭代从“手工猜词”变成“模块 + 数据 + 指标”的优化流程。
但第一阶段只在实验室使用，不直接改生产 prompt。

### 官方机制摘要

根据 DSPy 官方文档，后续实验要遵守几个机制事实：

- DSPy 的核心不是“再写一个长 prompt”，而是用 `Signature` 定义输入/输出字段，再用 `Predict`、`ChainOfThought` 等 module 执行任务。
- 字段命名本身会影响模型理解，所以输入/输出字段必须语义清楚，不能用 `a/b/c` 这类无意义名字。
- `dspy.Example(...).with_inputs(...)` 用来指定哪些字段在调用时传给程序，剩余字段作为 metric 的 gold / label 使用。
- optimizer 需要 metric 来定义“更好”是什么；metric 可以来自人工标签、规则检查、LLM judge，或它们的组合。
- GEPA 这类优化器可以让 metric 返回文字反馈，优化器用这些反馈改进 instruction。
- MIPROv2 可以同时搜索 few-shot 示例和 instruction，并用验证集选择最优组合。

因此拾贝的 DSPy 实验不能从“优化整套出题系统”开始，而要先把一个字段级任务拆成清楚的 Signature、Example 和 metric。

参考文档：

- DSPy 官方首页：`https://dspy.ai/`，核心口径是 “Program, don’t prompt”，用 structured signatures 定义任务，用 optimizer 按 metric 优化。
- DSPy Optimizers：`https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md`，optimizer 需要程序、metric 和训练输入，少量样本也可以开始，但必须有明确 metric。
- MIPROv2：`https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/optimizers/MIPROv2.md`，适合在样本和 metric 更稳定后联合优化 instruction 与 few-shot examples。
- GEPA：`https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/optimizers/GEPA/overview.md`，适合使用带文字反馈的 metric，根据真实失败和反馈演化 instruction。

### 第一阶段只做字段模块

优先选择边界清楚、字段标准明确的问题：

1. **干扰项生成 / 改写**
   - 当前人工标注中最稳定的问题之一。
   - 它不需要重新理解整篇文章，只需要围绕已确定的题干、正确答案和来源上下文生成更好的错误选项。
   - 适合作为第一个 DSPy 实验。

2. **常见误区改写**
   - 依赖题干、选项和来源，但不需要重建整题。
   - 可作为第二个模块。

3. **题干轻量化**
   - 需要控制“轻”与“核心理解”之间的平衡。
   - 可作为第三个模块。

这里的“字段模块”不是把字段从题目里孤立抽出来训练。
以干扰项为例，优化对象只是 `wrong options` 这个字段，但每条样本必须携带完整题目上下文：

- 知识点标题和核心判断。
- 题干。
- 正确选项。
- 来源上下文。
- 已有错误选项。
- 人工指出的问题。
- 理想改写或人工认可版本。

原因是：干扰项的好坏不是由选项文本本身决定的，而是由它和题干、正确答案、知识点、来源之间的关系决定的。脱离上下文训练干扰项，会把模型带向“写几个看起来像错的选项”，而不是“构造真实、有学习价值、又不破坏答案唯一性的混淆项”。

### 暂不做的模块

这些模块太依赖文章整体理解，应等字段标准和多样本数据更稳定后再做：

- 整篇文章知识点提取。
- 全文章结构骨架生成。
- 完整出题链路端到端优化。
- 全局题量策略优化。
- 让 DSPy 直接优化生产 `generateReviewChapter`。

## DSPy 第一实验：干扰项字段模块

### 官方约束转成拾贝标准

DSPy 的官方机制决定了我们不能再把“正样本、负样本、改写样本”混成一个含糊页面：

- `Signature` 必须清楚声明输入和输出；字段名本身会被模型读取，所以字段要有语义。
- `Example(...).with_inputs(...)` 必须明确哪些字段传给程序，未标成 input 的字段就是 metric 对照的 label。
- optimizer 不是凭感觉优化 prompt，而是根据 metric 追一个清楚目标。
- `Evaluate` 用 devset 调用程序，并把 prediction 交给 metric；所以 devset 必须是同一任务、同一输入输出结构。
- GEPA 可以利用 metric 返回的文字反馈；MIPROv2 更适合样本更多后联合搜索 instruction 和 few-shot。

因此第一实验拆成两个任务，而不是一个大任务：

1. **DistractorQualityJudge**：判断单个干扰项质量。
2. **RewriteDistractor**：把一个坏/可修干扰项改成更好的干扰项。

两者共享字段标准，但数据和 metric 分开。

### 任务 A：DistractorQualityJudge

目标：判断一个干扰项是 `accept`、`fixable` 还是 `reject`，并指出问题类型。
这一步回答“这个干扰项好不好”，需要好样本、可修样本和坏样本。

#### Signature

```python
class DistractorQualityJudge(dspy.Signature):
    """Judge whether one wrong option is useful for a mobile review question."""

    knowledge_point_title: str = dspy.InputField()
    knowledge_point_claim: str = dspy.InputField()
    stem: str = dspy.InputField()
    correct_option: str = dspy.InputField()
    source_context: str = dspy.InputField()
    candidate_distractor: str = dspy.InputField()
    sibling_options: list[str] = dspy.InputField()

    quality_label: Literal["accept", "fixable", "reject"] = dspy.OutputField()
    issue_category: str = dspy.OutputField()
    rationale: str = dspy.OutputField()
```

#### Example 结构

```python
example = dspy.Example(
    knowledge_point_title=row["knowledge_point_title"],
    knowledge_point_claim=row["knowledge_point_claim"],
    stem=row["stem"],
    correct_option=row["correct_option"],
    source_context=row["source_context"],
    candidate_distractor=row["candidate_distractor"],
    sibling_options=row["sibling_options"],
    quality_label=row["quality_label"],
    issue_category=row["issue_category"],
    rationale=row["rationale"],
).with_inputs(
    "knowledge_point_title",
    "knowledge_point_claim",
    "stem",
    "correct_option",
    "source_context",
    "candidate_distractor",
    "sibling_options",
)
```

输入字段进入程序；`quality_label`、`issue_category`、`rationale` 留给 metric。

#### Metric

- 标签准确率：`quality_label` 是否一致。
- 问题类型准确率：`issue_category` 是否一致或可接受近义。
- 硬阻断：如果模型把明显正确等价项判为 `accept`，该样本记 0。
- 反馈：当判错时，返回“为什么不是 accept / 为什么应 reject”的文字反馈，供 GEPA 后续使用。

任务 A 的数据来自：

- `hook-distractor-positive-examples.v1.jsonl`
- `hook-distractor-negative-patterns.v1.jsonl`
- 未来新增的 `fixable` 判断样本

### 任务 B：RewriteDistractor

目标：给定一个坏/可修干扰项，把它改成一个仍然错误、但更有学习价值的干扰项。
这一步回答“坏项应该怎么改”，只使用需要改写的样本。

#### Signature

```python
class RewriteDistractor(dspy.Signature):
    """Rewrite one weak distractor into a useful but still wrong option."""

    knowledge_point_title: str = dspy.InputField()
    knowledge_point_claim: str = dspy.InputField()
    stem: str = dspy.InputField()
    correct_option: str = dspy.InputField()
    all_options: list[str] = dspy.InputField()
    source_context: str = dspy.InputField()
    bad_option: str = dspy.InputField()
    problem_note: str = dspy.InputField()
    problem_pattern: str = dspy.InputField()

    rewritten_option: str = dspy.OutputField()
    rationale: str = dspy.OutputField()
```

#### Example 结构

```python
example = dspy.Example(
    knowledge_point_title=row["input"]["knowledge_point_title"],
    knowledge_point_claim=row["input"]["knowledge_point_claim"],
    stem=row["input"]["stem"],
    correct_option=row["input"]["correct_option"],
    all_options=row["input"]["all_options"],
    source_context=row["input"]["source_context"],
    bad_option=row["input"]["bad_option"],
    problem_note=row["input"]["problem_note"],
    problem_pattern=row["input"]["problem_pattern"],
    rewritten_option=row["gold_output"]["rewritten_option"],
    rationale=row["gold_output"]["rationale"],
).with_inputs(
    "knowledge_point_title",
    "knowledge_point_claim",
    "stem",
    "correct_option",
    "all_options",
    "source_context",
    "bad_option",
    "problem_note",
    "problem_pattern",
)
```

输入字段是坏项和完整上下文；`rewritten_option`、`rationale` 是 gold label。

#### Metric

第一版 metric 是规则 + 人工标签组合，不直接用单一 LLM judge。

硬阻断，命中任一项分数为 0：

- `rewritten_option` 与 `correct_option` 语义等价。
- `rewritten_option` 直接包含正确答案核心短语。
- `rewritten_option` 与题干、知识点完全无关。
- `rewritten_option` 与已有选项重复或高度同义。
- `rewritten_option` 太离谱，一眼排除。

软评分，0-1 加权：

| 维度 | 权重 | 说明 |
| --- | ---: | --- |
| `same_context` | 0.18 | 是否和题干、知识点在同一语境 |
| `same_level` | 0.12 | 是否和正确答案处在同一抽象层级 |
| `plausible_but_wrong` | 0.22 | 是否真实可能被误选，但明确错误 |
| `not_too_obvious` | 0.14 | 是否不是一眼排除的低价值错误 |
| `not_too_close` | 0.18 | 是否不会和正确答案过近导致多选风险 |
| `teaches_boundary` | 0.14 | 是否能帮助用户分清概念或做法边界 |
| `style_fit` | 0.04 | 是否简洁、适合手机题卡 |

任务 B 的数据来自：

- `hook-distractor-rewrite-trainset.v1.jsonl`

### 数据量规划

### 当前计划审查结论

对照 DSPy 官方文档后，当前计划的方向是正确的，但不能只停留在“样本数量 + 大概阶段”。DSPy 真正要求的是：

- 一个 task 对应一个清楚的 `Signature`。
- 一个 task 对应一种 `Example.with_inputs(...)` 结构。
- 一个 task 对应一个 metric。
- train / dev / test 必须是同一 task 的同构样本。
- optimizer 只能追 metric，不能追“感觉更好”。

因此后续推进必须增加四类硬约束：

1. **样本验收表**：每个文件当前有多少条、缺多少条、用于哪个 task、是否可进入 train/dev/test。
2. **metric 返回协议**：每个 metric 输出分数、硬阻断原因、可读反馈，避免后续 GEPA 没有稳定 feedback。
3. **split 防泄漏规则**：同一题、同一字段、同一黄金改写不能同时进入 train 和 test；Hook 文章不能占满 test。
4. **optimizer 运行顺序**：必须先 zero-shot / few-shot baseline，再考虑 MIPROv2 / GEPA；每一步都保存 compiled program 和评估报告。

没有这四项时，即使样本数量够，也还不能算“符合 DSPy 计划”。

### 样本验收表

| 文件 | 当前数量 | 任务 | 当前用途 | Phase A 目标 | 是否可训练 |
| --- | ---: | --- | --- | ---: | --- |
| `hook-distractor-rewrite-trainset.v1.jsonl` | 12 | `RewriteDistractor` | 已确认 rewrite 子集 | 15-20 | 暂不可训练，只可做共识样本 |
| `hook-distractor-positive-examples.v1.jsonl` | 9 | `DistractorQualityJudge` | 好样本候选 | 8-10 | 需单独确认后可进入 judge 数据 |
| `hook-distractor-negative-patterns.v1.jsonl` | 12 | `DistractorQualityJudge` | 坏模式候选 | 8-10 | 需单独确认后可进入 judge 数据 |
| `phase-a-hook-distractor-field-samples.v1.jsonl` | 草稿 | 不直接训练 | 历史过程记录 | 不计入 | 不可训练 |

Phase A 还缺：

- `fixable` 判断样本：至少 6-8 条。
- rewrite 样本：至少再补 3-8 条。
- 非 Hook 样本：Phase A 可暂不要求，但 Phase B 必须有。

### Metric 返回协议

DSPy metric 可以返回 bool / numeric score，也可以配合文字反馈。为了未来兼容 GEPA，拾贝第一版 metric 统一返回以下结构：

```json
{
  "score": 0.0,
  "passed": false,
  "hard_fail_reasons": ["correct_equivalent"],
  "soft_scores": {
    "same_context": 0.8,
    "same_level": 0.7,
    "plausible_but_wrong": 0.0,
    "not_too_obvious": 0.5,
    "not_too_close": 0.0,
    "teaches_boundary": 0.4,
    "style_fit": 0.9
  },
  "feedback": "改写后的干扰项与正确答案语义过近，容易造成多选风险。"
}
```

不同任务的 metric 不能混用：

- `DistractorQualityJudgeMetric` 评估分类是否正确。
- `RewriteDistractorMetric` 评估改写结果是否仍然错误且更有学习价值。

### Split 防泄漏规则

DSPy 的 devset/test 只有在不泄漏 gold 的情况下才有意义。因此拆分时必须遵守：

- 同一个 `article_slug + question_id + field_key` 只能出现在一个 split。
- 同一个坏选项及其黄金改写不能同时出现在 train 和 test。
- 同一轮黄金样本的中间稿不能作为独立测试样本重复计数。
- Hook 文章可以作为 Phase A 主样本，但 Phase B 的 test 必须含非 Hook 文章。
- 正样本、负样本、rewrite 样本不能混在同一 task 的 train/dev/test。

### Baseline 与 optimizer 顺序

每个 task 的 DSPy 实验按固定顺序推进：

1. **Zero-shot baseline**
   - 只用 Signature，不给示例。
   - 目标是验证字段定义是否足够清楚。
2. **LabeledFewShot baseline**
   - 只放人工确认的 examples。
   - 目标是验证好例子是否能提升稳定性。
3. **BootstrapFewShot**
   - 在 metric 稳定后少量尝试。
   - 目标是验证自动挑选 demos 是否有帮助。
4. **MIPROv2 light**
   - 样本覆盖至少 4 篇文章后再尝试。
   - 目标是联合优化 instruction 和 few-shot examples。
5. **GEPA**
   - 只有当 metric feedback 足够具体、人工反馈文本稳定后使用。
   - 目标是通过文字反馈演化 instruction，而不是继续堆人工规则。

每次 run 必须保存：

- 输入 dataset snapshot。
- train/dev/test split。
- metric 配置。
- optimizer 配置。
- compiled program。
- dev/test 评估结果。
- 人工抽查结论。

#### Phase A：人工共识集，不跑 optimizer

目标：确认数据结构和人工标准稳定。

当前 Hook 样本状态：

- Rewrite 样本：12 条，用户已确认改写方向没问题。
- Positive 样本：9 条，尚需作为“好样本库”单独确认。
- Negative 样本：12 条，尚需作为“坏模式库”单独确认。

Phase A 完成标准：

- 质量判断样本总量 20-30 条，覆盖 `accept / fixable / reject`。
- Rewrite 样本 15-20 条。
- 每条样本明确：
  - `sample_role`: `positive_example` / `negative_pattern` / `rewrite_example`
  - `sample_origin`
  - `canonical_context`
  - `input`
  - `gold_output` 或 `gold_label`
  - `problem_pattern`
  - `human_reason`
- 页面分 Tab 展示：
  - 质量判断数据。
  - 改写数据。
  - 正样本库。
  - 负模式库。

Phase A 只用于统一口径，不产生“DSPy 优化后可用”的结论。

#### Phase B：最小 DSPy baseline

目标：验证 Signature、Example、metric 是否能跑通。

数据要求：

- 文章数量：至少 2 篇，不能只有 Hook。
- 质量判断样本：40-50 条。
  - accept：15-18 条。
  - fixable：12-15 条。
  - reject：12-15 条。
- Rewrite 样本：24-30 条。

拆分：

- train：60%
- dev：20%
- test：20%

约束：

- test 必须包含非 Hook 文章。
- 同一 `question_id + field_key + source_version` 不能同时出现在 train 和 test。
- `positive / negative / rewrite` 不能混成同一个 DSPy task。

Phase B 只跑：

- zero-shot baseline。
- `LabeledFewShot` 或 `BootstrapFewShot`。

不跑 MIPROv2 / GEPA，避免在 metric 未稳定时优化 instruction。

#### Phase C：优化器实验

目标：开始让 optimizer 搜索 few-shot 或 instruction。

数据要求：

- 文章数量：至少 4 篇。
- 质量判断样本：80-100 条。
- Rewrite 样本：60 条左右。
- 文章类型至少覆盖：
  - 工具方法型。
  - 观点论证型。
  - 案例复盘型。
  - 概念解释型。

优化顺序：

1. `LabeledFewShot`：只验证好例子是否有帮助。
2. `BootstrapFewShot`：少量自动示例选择。
3. `MIPROv2(auto="light")`：样本和 metric 稳定后，再联合搜索 demos 和 instruction。
4. `GEPA`：只有当人工反馈文本足够多时使用，因为它依赖文字 feedback 改进 instruction。

#### Phase D：生产候选验证

数据要求：

- 文章数量：8-10 篇。
- 质量判断样本：150-200 条。
- Rewrite 样本：100 条左右。

只有满足以下条件，才允许写生产候选提案：

- test 集人工 reject 率下降。
- 正确答案唯一性不下降。
- 题卡轻量感不下降。
- 非 Hook 样本不退化。
- optimizer 产出的 instruction 没有变成长规则堆叠。

### 当前不做

- 不用 DSPy 直接优化整篇文章知识点提取。
- 不让 DSPy 直接改生产 `generateReviewChapter`。
- 不端到端优化完整出题链路。
- 不把当前 12 条 rewrite 样本当成足够训练集。
- 不把旧草稿 `phase-a-hook-distractor-field-samples.v1.jsonl` 当 trainset/devset。

### 实验产物

每次 DSPy run 必须保存：

```text
quality-test-set/results/dspy/
  distractors/
    runs/
      <timestamp>-<label>.json
    reviews/
      <timestamp>-<label>.csv
    analysis/
      <timestamp>-<label>.md
    programs/
      <timestamp>-<label>.dspy.json
```

JSON 至少包含：

- optimizer 类型。
- DSPy 版本。
- 模型名称。
- train / val / test 数量。
- Signature 定义。
- metric 版本。
- baseline 分数。
- optimized 分数。
- 每条 test 输出。
- 人工确认结果。

### 实验通过标准

第一阶段只允许得出“实验候选”结论，不允许直接上线。

通过标准：

- Hook 黄金样本干扰项字段明显改善。
- 非 Hook 样本没有明显退化。
- 人工 reject 比例下降。
- 正确答案唯一性不下降。
- 输出没有显著变长。
- 生成的 instruction 比生产 prompt 更短或至少不更复杂。

如果 optimizer 产出的 instruction 变成长规则堆叠，即使分数变高，也不能进入生产。

### 失败判定

出现以下情况，DSPy 方向暂停或回退：

- 只在 Hook 样本提升，非 Hook 样本退化。
- metric 分数提升，但人工觉得题变差。
- 干扰项更像正确答案，造成多选风险。
- 输出更长，破坏轻量题卡。
- instruction 变成不可维护的大段规则。

## DSPy 官方参考

- DSPy Metrics：说明 optimizer 需要 metric 定义“更好”，metric 可以结合人工标签、规则和 LLM judge。
  - `https://dspy.ai/getting-started/metrics/`
- DSPy Signatures：说明字段命名和类型会影响模型理解，适合把任务拆成清楚输入/输出。
  - `https://dspy.ai/getting-started/expanding-signatures/`
- DSPy Modules：说明同一个 Signature 可以用不同 module 执行，例如 `Predict` 或 `ChainOfThought`。
  - `https://dspy.ai/getting-started/changing-modules/`
- DSPy MIPROv2：说明可联合优化 few-shot examples 和 instructions。
  - `https://dspy.ai/api/optimizers/MIPROv2/`
- DSPy GEPA：说明可用 metric 的文字反馈改进 instructions。
  - `https://dspy.ai/getting-started/gepa-optimization/`

## 生产准入门槛

任何实验结果进入生产，必须满足以下条件。

### 1. 目标问题明确改善

例如本轮只修干扰项，则必须证明：

- 干扰项无价值、离谱、重复、过近的问题下降。
- 正确答案唯一性没有下降。
- 题卡轻量感没有下降。

### 2. 非目标字段不明显退化

必须检查：

- 题干是否变重。
- 正确选项是否更明显。
- 常见误区是否变泛。
- 来源是否不支撑。
- 解释是否偷换概念。

### 3. 多样本不过拟合

至少验证：

- Hook 黄金样本。
- 另一个不同结构文章。
- 一个更短或更碎片化的输入。

### 4. 生产实现要简化

实验中可以有复杂指标和中间字段，但进入生产时应尽量收缩为：

- 少量清晰 prompt 规则。
- 少量必要确定性检查。
- 少量可诊断质量字段。

复杂实验指标保留在实验室，不全部进入生产链路。

## 后续推进顺序

### 第 0 步：完成边界文档

完成本文档，并在 roadmap 中明确：后续 prompt/DSPy/评分器实验都必须与生产代码隔离。

### 第 1 步：补齐字段级正负样本

围绕黄金样本，把字段级样本拆出来：

- accept 的好题干 / 坏题干。
- accept 的干扰项 / fixable 的干扰项 / reject 的干扰项。
- 好的常见误区 / 泛化误区 / 写反的误区。
- 好的解释 / 偷换概念解释 / 解释不到答案的解释。

每个样本都要记录原因，而不是只有标签。

### 第 2 步：先做干扰项实验

选择干扰项作为第一个隔离实验模块，因为当前人工标注中最稳定的问题之一是：

- 干扰项太明显。
- 干扰项无意义。
- 干扰项和题干核心不相关。
- 干扰项彼此重复。
- 干扰项误变成正确选项。

目标不是重新生成整题，而是只替换干扰项字段。

### 第 3 步：建立 HTML 字段对照工作台

后续对比不能只看整题分数。工作台需要支持：

- 左侧模拟手机题卡和解释页。
- 点击字段查看机器标注和人工标注。
- 每个字段独立标记 accept / fixable / rewrite / reject。
- 导出当前轮字段标注 JSON。

### 第 4 步：DSPy 原型

在实验目录中建立 DSPy 原型：

- 只跑字段模块。
- 使用黄金样本字段级数据。
- 输出候选改写。
- 由 HTML 工作台人工确认。

### 第 5 步：生产候选提案

如果某个实验模块稳定提升，先写生产候选提案：

- 改什么。
- 为什么不改更多。
- 会影响哪些字段。
- 怎么回滚。
- 怎么验证不退化。

用户确认后再改生产代码。

## 禁止事项

后续实验禁止以下做法：

- 因为一篇文章的问题，直接改生产 prompt。
- 因为一个指标难看，继续加新指标压它。
- 因为题量少，绕过质量检测凑题。
- 因为来源短，就强迫来源更短。
- 因为 DSPy 输出看起来好，就直接替换生产 prompt。
- 把 API key、完整原文或未脱敏原始模型日志提交进仓库。

## 当前下一步

下一步不是继续重构生产 prompt，而是：

1. 从黄金样本的三轮人工标注中提取字段级正负样本。
2. 先建立干扰项字段实验集。
3. 在隔离实验目录里验证一个最小模块：给定题干和正确答案，生成更有价值的干扰项。
4. 用 HTML 字段工作台做人工确认。
5. 只有确认稳定改善后，再讨论是否把规则提炼进生产 prompt。

## 2026-06-03 进度更新：DSPy Phase B v2

当前已经完成干扰项字段实验的 Phase A 人工共识整理，并补入 1 篇非 Hook 文章进入 Phase B baseline。实验仍完全隔离于生产线。

### 已完成

- Phase A Hook clean set：21 条，`accept 9 / fixable 6 / reject 6`。
- 非 Hook 正样本：18 条，人工确认为 `accept`。
- 非 Hook 负样本 / 可修样本：18 条，人工确认为 `accept 7 / fixable 4 / reject 7`。
- Phase B v1 baseline：zero-shot / few-shot 都只有 38.6%，`fixable` 识别为 0%，证明不能进入 optimizer。
- Phase B v2 baseline：补齐完整题目上下文，并把 Judge 改成分层判断。

### Phase B v2 的输入字段

v2 数据集为：

```text
quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v2.jsonl
```

每条样本需要尽量包含：

- `knowledge_point_title`
- `knowledge_point_claim`
- `stem`
- `correct_option`
- `candidate_distractor`
- `sibling_options`
- `source_context`
- `correct_understanding`
- `common_misconception`
- `explanation`
- `memory_angle`
- `all_options_with_ids`
- `correct_option_id`
- `gold_quality_label`
- `gold_issue_category`

如果历史样本缺少 `explanation` 或 `memory_angle`，必须写入 `missing_context_fields`，不能静默伪造。

### Phase B v2 的判断顺序

`DistractorQualityJudge` v2 必须先判断候选干扰项与正确答案的关系，再输出质量标签：

1. 是否与正确答案等价或近似正确。
2. 是否存在多选风险。
3. 是否和题干、知识点、正确项处在同一语境。
4. 是否有学习价值。
5. 是否只是需要改写，还是应直接拒绝。

输出字段：

- `is_correct_equivalent`
- `has_multiselect_risk`
- `same_context`
- `learning_value`
- `fixability`
- `quality_label`
- `issue_category`
- `rationale`

### Phase B v2 的结果

| 模式 | Label accuracy | Issue exact | Avg score | Fixable recall | Hard failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 7 |
| few-shot | 66.7% | 33.3% | 0.600 | 20.0% | 7 |

v2 明显优于 v1，但仍不允许进入 optimizer。

原因：

- `reject -> accept` 的硬失败仍有 7 条。
- 第二正确答案 / 多选风险仍没有被稳定识别。
- `fixable` recall 只有 20%，说明模型仍把可修项折叠成 accept 或 reject。

### Phase B v3 的计划

下一轮继续修 Judge 定义和 metric，不跑 optimizer、不改生产 prompt。

v3 只聚焦两个问题：

1. **正确等价 / 多选风险前置**
   - 先输出候选项与正确答案的关系类型：
     - `same_meaning`
     - `near_correct_boundary`
     - `different_but_same_context`
     - `unrelated`
   - `same_meaning` 和 `near_correct_boundary` 默认不能进入 `accept`。

2. **fixable 独立路径**
   - `accept`：当前可直接进题组。
   - `fixable`：方向有用，但表达、边界或学习价值需要修。
   - `reject`：正确等价、无关、离谱、低价值到不值得修。

只有当 v3 的硬失败明显下降，并且 `fixable` recall 至少达到 40%，才考虑进入 `BootstrapFewShot`。否则继续修 Signature / metric。

### Phase B v3 结果与修正

v3 已跑完，结果没有达到进入 optimizer 的标准。

| 模式 | Label accuracy | Fixable recall | Hard failures |
| --- | ---: | ---: | ---: |
| zero-shot | 64.9% | 10.0% | 9 |
| few-shot | 66.7% | 10.0% | 8 |

v3 的新增关系字段几乎没有发挥作用：

- `different_but_same_context`: 56 条。
- `same_meaning`: 1 条。
- `near_correct_boundary`: 0 条。
- `unrelated`: 0 条。

这说明把“先判断关系”写进同一个 Judge prompt 仍不够。模型会把几乎所有候选项归成同语境不同义，再用“有学习边界”的理由放行。

### Phase B v4 计划

下一步仍不进入 optimizer，先拆两阶段 Judge：

1. **DistractorRelationCheck**
   - 只判断候选项与正确答案 / 正确理解的关系。
   - 输出：
     - `same_meaning`
     - `near_correct_boundary`
     - `different_but_same_context`
     - `unrelated`
   - 不判断学习价值，不输出 `accept / fixable / reject`。

2. **DistractorQualityJudge**
   - 只处理通过关系检查的候选项。
   - `same_meaning` 和 `near_correct_boundary` 直接进入 `reject`。
   - 只有 `different_but_same_context` 才进入 `accept / fixable / reject`。

3. **v4 验收**
   - `correct_equivalent_multiselect_risk` 的 relation 召回至少 70%。
   - `near_correct_boundary` 不再是 0。
   - hard failures 明显低于 v2/v3。
   - `fixable` 暂时降为次级目标，先保证答案唯一性。
