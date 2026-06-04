# DSPy 干扰项字段实验

本文档记录拾贝出题系统中“干扰项生成 / 改写”模块的隔离实验。
本目录只属于实验室，不直接影响生产 prompt 或后端生成链路。

## 当前阶段

Phase B：baseline 校准。

当前仍不训练、不部署、不改生产 prompt。目标是先验证 `DistractorQualityJudge` 是否能学会我们人工确认的干扰项标准，再决定是否进入 DSPy optimizer。

## 目录

```text
datasets/
  dspy-distractor-quality-judge-phase-a.v1.jsonl
  phase-a-hook-distractor-field-samples.v1.jsonl
  hook-distractor-rewrite-trainset.v1.jsonl
  hook-distractor-positive-examples.v1.jsonl
  hook-distractor-negative-patterns.v1.jsonl
reviews/
  phase-a-hook-distractor-review.html
  phase-b-meta-ai-first-pm-review.html
baselines/
  phase-b-quality-judge-zero-shot-*.json
  phase-b-quality-judge-few-shot-*.json
analysis/
  phase-b-quality-judge-baseline-*.md
```

## 数据分层

`phase-a-hook-distractor-field-samples.v1.jsonl` 是早期草稿，混合了正样本、坏样本和修订过程信息，只保留作过程记录，不直接作为 DSPy trainset / devset。

当前干净数据分三类：

- `dspy-distractor-quality-judge-phase-a.v1.jsonl`：用于 `DistractorQualityJudge` 的 Phase A 干净共识集，包含 Positive 与 Negative 审查后的 `accept / fixable / reject` 标签。
- `hook-distractor-rewrite-trainset.v1.jsonl`：用于 `rewrite_distractor` 任务。输入是非黄金坏/可修干扰项和完整题目上下文，输出是黄金标准改写。
- `hook-distractor-positive-examples.v1.jsonl`：最终可接受或人工共识认可的好干扰项，用于定义好样本模式。
- `hook-distractor-negative-patterns.v1.jsonl`：坏干扰项和问题类型，用于评分器/分类器识别负模式。

审查页按 Tab 分别展示 Judge / Rewrite / Positive / Negative，避免把不同数据用途混在一起。

## DSPy 任务拆分

对照 DSPy 官方机制，本实验不能把“好样本、坏样本、改写样本”混成同一个训练任务。DSPy 的 `Signature` 要定义清楚输入和输出，`Example(...).with_inputs(...)` 要明确哪些字段进入程序、哪些字段作为 gold label 给 metric 使用。

因此当前干扰项实验拆成两个任务。

### 任务 A：DistractorQualityJudge

目标是判断一个候选干扰项是否合格。

输入：

- 知识点标题和核心判断。
- 题干。
- 正确选项。
- 来源上下文。
- 候选干扰项。
- 同题其它选项。

输出：

- `quality_label`: `accept` / `fixable` / `reject`
- `issue_category`
- `rationale`

数据来源：

- Phase A clean set：`dspy-distractor-quality-judge-phase-a.v1.jsonl`

这类样本用于训练或评估“会不会判断干扰项质量”，不是用来让模型直接改写。

### 任务 B：RewriteDistractor

目标是把一个坏/可修干扰项改成更有学习价值、但仍然错误的干扰项。

输入：

- 知识点标题和核心判断。
- 题干。
- 正确选项。
- 全组选项。
- 来源上下文。
- 原坏选项。
- 人工指出的问题。
- 问题模式。

输出：

- `rewritten_option`
- `rationale`

数据来源：

- `hook-distractor-rewrite-trainset.v1.jsonl`

这类样本用于训练或评估“会不会改写坏干扰项”，不能和任务 A 的判断样本混在同一个 train/dev/test 里。

## 样本字段

早期草稿每一行是一个字段级样本，重点描述单个干扰项是否合格：

- `sample_id`
- `article_slug`
- `question_id`
- `knowledge_point_id`
- `field_key`
- `field_label`
- `field_status`: `accept` / `fixable` / `reject`
- `issue_category`
- `original_option`
- `gold_option`
- `gold_option_source`: 改写依据，只引用最终黄金样本定稿，不引用中间轮次。
- `gold_option_basis`: 为什么这个改写更符合黄金样本标准。
- `gold_sample_source_policy`: 来源策略，当前应为 `final_golden_sample_only` 或 `original_or_manual_consensus`。
- `human_note`
- `why_it_matters`
- `stem`
- `correct_option`
- `all_options`
- `knowledge_point_title`
- `knowledge_point_claim`
- `source_context`
- `rubric`

## 当前判断口径

一个好的干扰项应同时满足：

- 和题干、知识点在同一语境。
- 和正确答案处在同一层级。
- 看起来真实可能被误选，但明确错误。
- 不是离谱项，不是一眼排除项。
- 不和正确答案过近，不能造成多选风险。
- 能帮助用户分清原文里的边界。
- 足够短，适合手机题卡。

## Gold option 约束

`gold_option` 是“更好的干扰项”，不是“更好的答案”。改写时必须守住三条边界：

- 仍然是错误选项：不能解释同一个正确因果，不能替换成另一种正确做法。
- 错在关键边界上：最好是用户真实可能混淆的相邻做法、错误时机、错误归因或错误工具。
- 不靠极端错误成立：不要用“放弃”“责怪”“完全不能用”这类一眼排除项来制造错误。

典型风险：把“Demo 阶段暂时不需要严格控制”改写成“担心 Hook 拖慢 Demo 试错”，这会从干扰项滑向正确解释。更好的干扰项应改成“以为 Hook 只能在正式上线后使用”或“以为 CI 已经能覆盖 Demo 阶段的所有检查”。

当存在已人工确认的黄金样本定稿时，应优先复用该定稿思路，并在 `gold_option_source` 中记录来源，例如 `golden_final:question:q-7:option.D`。历史标注轮次只用于实验记录，不进入字段级训练/对照样本来源，避免把过程稿混入标准。

## DSPy rewrite 样本结构

`hook-distractor-rewrite-trainset.v1.jsonl` 每条样本采用明确的 `input -> gold_output`：

- `input.stem`
- `input.knowledge_point_title`
- `input.knowledge_point_claim`
- `input.correct_option`
- `input.all_options`
- `input.source_context`
- `input.bad_option`
- `input.problem_note`
- `input.problem_pattern`
- `gold_output.rewritten_option`
- `gold_output.rationale`
- `gold_output.gold_reference`

转换成 DSPy Example 时，`input.*` 是 `.with_inputs(...)`，`gold_output.*` 是 metric 对照的 label。这样可以训练“把坏干扰项改成好干扰项”，而不是让模型混淆不同轮次的题组版本。

## 数据量门槛

## Phase A 当前结论

对照 DSPy 官方机制，目前这批数据已经完成 Phase A 人工共识集整理，可以进入 Phase B baseline 准备，但还不能进入 optimizer。原因是：

- `DistractorQualityJudge` 已有 21 条干净样本：`accept 9 / fixable 6 / reject 6`。
- `RewriteDistractor` 已有 15 条改写样本，达到 Phase A 最低门槛。
- 当前仍只有 Hook 文章，Phase B 的 test 必须包含非 Hook 文章。

所以当前行动不是继续扩 Hook 数据，而是准备 Phase B baseline：先补至少 1 篇非 Hook 文章，再跑零样本/少样本基线。

## Phase B Quality Judge Baseline

已建立干净 dev/test 数据集：

- `datasets/dspy-distractor-quality-judge-devtest.v1.jsonl`

数据分布：

- 总数：57 条。
- Hook Phase A：21 条。
- 非 Hook 正样本：18 条。
- 非 Hook 负样本 / 可修样本：18 条。
- Gold label：`accept 34 / fixable 10 / reject 13`。

已跑两个 baseline：

- `zero-shot`：`baselines/phase-b-quality-judge-zero-shot-20260603-065654.json`
- `few-shot`：`baselines/phase-b-quality-judge-few-shot-20260603-065654.json`

结果摘要：

| 模式 | Label accuracy | Issue exact | Avg score |
| --- | ---: | ---: | ---: |
| zero-shot | 38.6% | 15.8% | 0.340 |
| few-shot | 38.6% | 15.8% | 0.340 |

核心发现：

- few-shot 没有优于 zero-shot，说明当前示例和任务定义还没有有效迁移。
- 模型大量把人工认可的 `accept` 干扰项误判为 `reject`。
- `fixable` 完全没被学会，10 条全部被折叠成 `accept` 或 `reject`。
- 仍存在高风险 `reject -> accept`，尤其是近似正确答案被当成好干扰项。

当前结论：

- 不进入 `BootstrapFewShot` / `MIPRO` / `GEPA`。
- 下一步先检查 few-shot 示例是否真的进入调用上下文，并重构 Judge 的任务定义与 metric。
- 新 Judge 应优先识别“近似正确答案 / 多选风险”，再判断干扰项是否可接受或可修。

详细报告：

- `analysis/phase-b-quality-judge-baseline-comparison-20260603.md`
- `analysis/phase-b-quality-judge-baseline-zero-shot-20260603-065654.md`
- `analysis/phase-b-quality-judge-baseline-few-shot-20260603-065654.md`

## Phase B 非 Hook 首批数据

已补第一篇非 Hook 文章：`wechat-L6t8rmU_8exk2rPV--cUIA.md`，主题是 AI-first 产品经理。当前这一步仍然只是字段审查准备，不跑 DSPy optimizer，也不改生产 prompt。

数据来源：

- 历史批量生成包：`quality-test-set/results/archive/2026-05-15-095415.json`
- 候选数据：`datasets/phase-b-meta-ai-first-pm-distractor-candidates.v1.jsonl`
- 审查页面：`reviews/phase-b-meta-ai-first-pm-review.html`
- Setup 说明：`analysis/phase-b-meta-ai-first-pm-setup-20260603.md`

当前数量：

- 6 道非 Hook 题。
- 18 个候选干扰项。
- 第一轮人工导出文件：`reviews/phase-b-meta-ai-first-pm-review-20260603.json`。
- 当前导出标签为 `accept 18 / fixable 0 / reject 0`。
- `q-3 option A` 的过程备注已由用户确认忽略，最终标签按 `accept` 处理。

这批数据的用途是检验 Phase A 的干扰项判断口径是否能迁移到第二篇文章。审完后再决定哪些进入 `DistractorQualityJudge` 的 dev/test，不把未审候选直接混入训练集。

### Phase B negative / fixable 候选

因为第一批非 Hook 数据全部被人工确认为 `accept`，它只能提供非 Hook 正样本，无法测试评分器识别坏项的能力。因此补充一批专门的负样本 / 可修样本候选。

数据来源：

- 候选数据：`datasets/phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl`
- 审查页面：`reviews/phase-b-meta-ai-first-pm-negative-review.html`
- Setup 说明：`analysis/phase-b-meta-ai-first-pm-negative-setup-20260603.md`

当前数量：

- 18 个候选干扰项。
- Draft 预期：`reject 11 / fixable 7`。
- Draft 只表示准备假设，最终 gold label 必须以人工审查导出为准。
- 第一轮人工导出文件：`reviews/phase-b-meta-ai-first-pm-negative-review-20260603.json`。
- 人工最终分布：`accept 7 / fixable 4 / reject 7`。
- Draft 与人工最终标签有 12 条不同，说明这批数据的关键价值正是校准“哪些看似坏项其实可接受 / 哪些相邻项应直接 reject”。后续构造 dev/test 时必须使用人工 `review_status`，不能使用 `draft_expected_label`。

## 样本验收表

| 数据文件 | 当前数量 | 对应 DSPy task | 当前状态 | 下一步 |
| --- | ---: | --- | --- | --- |
| `dspy-distractor-quality-judge-phase-a.v1.jsonl` | 21 | `DistractorQualityJudge` | Phase A clean set，accept 9 / fixable 6 / reject 6 | Phase B baseline |
| `hook-distractor-rewrite-trainset.v1.jsonl` | 15 | `RewriteDistractor` | Phase A rewrite set | Phase B baseline |
| `hook-distractor-positive-examples.v1.jsonl` | 9 | `DistractorQualityJudge` | Positive 来源库 | 保留溯源 |
| `hook-distractor-negative-patterns.v1.jsonl` | 12 | `DistractorQualityJudge` | Negative 来源库，reject 6 / fixable 6 | 保留溯源 |
| `phase-a-hook-distractor-field-samples.v1.jsonl` | 草稿 | 无 | 过程记录 | 不进入训练 |
| `phase-b-meta-ai-first-pm-distractor-candidates.v1.jsonl` | 18 | `DistractorQualityJudge` 候选 dev/test | 非 Hook 未审数据 | 人工审查 |
| `phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl` | 18 | `DistractorQualityJudge` 候选 dev/test | 非 Hook 负样本 / 可修样本候选 | 人工审查 |

## Phase A 人工审查进度

### Positive tab

审查文件：`reviews/phase-a-positive-review-20260602.json`

- 9 条好干扰项样本已审。
- 8 条 `accept_label`。
- 1 条 `fix_label`：`positive-hook-q13-option-c-positive-revised`，已按用户意见改为“继续只靠自然语言补充需求”。

### Negative tab

审查文件：`reviews/phase-a-negative-review-20260603.json`

- 12 条坏干扰项 / 负模式样本已审。
- 页面里的 `accept_label` / `fix_label` 表示“用户是否认可这条样本当前标注”，不是候选项自身质量。
- 已补 `gold_quality_label`，作为 DSPy `DistractorQualityJudge` 的真实 gold label：
  - `reject`: 6 条。
  - `fixable`: 6 条。
- 用户在页面上标为 `fix_label` 的 3 条，已保留为 `fixable` 或待修原因口径：
  - `negative-hook-q6-option-c-fixable`：`产品经理不了解AI`
  - `negative-hook-q6-option-d-negative-r3`：`因为 CI 会自动处理 Demo 阶段的所有风险`
  - `negative-hook-q7-option-c-negative-r2`：`追求代码质量`

这 3 条的问题不是“它们一定不能作为负样本”，而是不能被当成纯 `reject` 学习。它们更适合作为 `fixable`：方向有一定关联，但表达太泛、关系偏弱或需要改得更贴近题目核心。

当前 Negative 文件的正式含义是：用于训练/评估 `quality_label` 的负向判断，其中既包含 `reject`，也包含 `fixable`。后续构造 DSPy Example 时必须以 `gold_quality_label` 作为输出标签，而不是用文件名里的 `negative` 或页面审查状态替代。

### Phase A 汇总

汇总文件：`analysis/phase-a-summary-20260603.md`

- Judge clean set：21 条。
- Rewrite set：15 条。
- Phase A 已可进入 baseline 准备。
- 禁止直接跑 optimizer；需要至少补 1 篇非 Hook 文章。

## Metric 草案

### `DistractorQualityJudgeMetric`

判断预测的 `quality_label` 和 `issue_category` 是否匹配人工标准。

硬失败：

- 把正确答案等价项判成 `accept`。
- 把明显离谱干扰项判成 `accept`。
- 把会造成多选风险的干扰项判成 `accept`。

输出：

- `score`
- `passed`
- `hard_fail_reasons`
- `feedback`

### `RewriteDistractorMetric`

判断改写后的干扰项是否仍然错误、且更有学习价值。

硬失败：

- 改写项与正确答案语义等价。
- 改写项与已有选项重复。
- 改写项脱离题干和知识点。
- 改写项离谱到一眼排除。

软评分：

- `same_context`
- `same_level`
- `plausible_but_wrong`
- `not_too_obvious`
- `not_too_close`
- `teaches_boundary`
- `style_fit`

这些字段后续会进入 DSPy metric，不再靠一条笼统分数判断。

### Phase A：人工共识，不跑 optimizer

当前状态：

- Rewrite 样本：12 条，用户已看过并确认改写方向没问题。
- Positive 样本：9 条，还没有单独做“好样本是否真的好”的确认。
- Negative 样本：12 条，还没有单独做“坏模式是否分类准确”的确认。

Phase A 完成标准：

- 质量判断样本 20-30 条，覆盖 `accept / fixable / reject`。
- Rewrite 样本 15-20 条。
- 页面需要分 Tab 展示：
  - 质量判断样本。
  - 改写样本。
  - 好样本库。
  - 坏模式库。

当前页面只展示 Rewrite 样本，所以你现在不需要继续标这批数据；下一步应该先补一个分 Tab 的审查页，再单独确认 Positive / Negative / Fixable。

### Phase B：最小 DSPy baseline

数据要求：

- 至少 2 篇文章，不能只有 Hook。
- 质量判断样本 40-50 条。
- Rewrite 样本 24-30 条。
- train / dev / test 按 60 / 20 / 20 拆分。
- test 必须包含非 Hook 文章。

Phase B 只跑 zero-shot、`LabeledFewShot` 或 `BootstrapFewShot`，不跑 MIPROv2 / GEPA。

### Phase C：optimizer 实验

数据要求：

- 至少 4 篇文章。
- 质量判断样本 80-100 条。
- Rewrite 样本约 60 条。

到这一步才开始尝试 `MIPROv2(auto="light")` 或 GEPA。GEPA 需要足够多的文字反馈，否则会把不稳定的人类备注放大成新 prompt 噪音。

### Phase D：生产候选

数据要求：

- 8-10 篇文章。
- 质量判断样本 150-200 条。
- Rewrite 样本约 100 条。

只有非 Hook 样本不退化、人工 reject 率下降、题卡轻量感不下降、答案唯一性不下降，才允许写生产候选提案。

## 下一步

1. 保留当前 12 条 rewrite 样本作为已确认的 Phase A 子集。
2. 改造审查页为分 Tab：Quality Judge / Rewrite / Positive / Negative。
3. 先补齐 Phase A 的 20-30 条质量判断样本和 15-20 条 rewrite 样本。
4. 达到 Phase A 门槛后，再写最小 DSPy baseline，不直接改生产 prompt。

## 2026-06-03 最新状态：Phase B v2 Baseline

上面的 Phase A / 早期 Phase B 记录保留为历史过程。当前实际进度已经进入 `DistractorQualityJudge` 的 v2 baseline 校准。

### v2 数据集

已生成：

- `datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`

v2 在 v1 基础上补充完整题目上下文：

- `correct_understanding`
- `common_misconception`
- `explanation`
- `memory_angle`
- `all_options_with_ids`
- `correct_option_id`
- `missing_context_fields`

数据分布：

| 来源 | 数量 |
| --- | ---: |
| Hook Phase A | 21 |
| 非 Hook 正样本 | 18 |
| 非 Hook 负样本 / 可修样本 | 18 |

Gold label：

| Label | 数量 |
| --- | ---: |
| accept | 34 |
| fixable | 10 |
| reject | 13 |

其中 36 条非 Hook 样本缺少 `explanation` 和 `memory_angle`，已在 `missing_context_fields` 中显式标记，没有静默伪造。

### v2 Judge 定义

v2 的 `DistractorQualityJudge` 不再只输出一个扁平标签，而是先做分层判断：

- `is_correct_equivalent`
- `has_multiselect_risk`
- `same_context`
- `learning_value`
- `fixability`
- `quality_label`
- `issue_category`
- `rationale`

判断顺序固定为：

1. 先排除近似正确答案 / 多选风险。
2. 再判断候选项是否与题干、知识点、正确项处于同一语境。
3. 最后判断 `accept / fixable / reject`。

### v2 Baseline 结果

已跑：

- `baselines/phase-b-quality-judge-zero-shot-20260603-072801.json`
- `baselines/phase-b-quality-judge-few-shot-20260603-072801.json`

| 模式 | Label accuracy | Issue exact | Avg score | Fixable recall | Hard failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 7 |
| few-shot | 66.7% | 33.3% | 0.600 | 20.0% | 7 |

对比 v1 的 `38.6%`，v2 证明“上下文完整化 + 分层 Judge”方向有效，尤其减少了好干扰项被大面积误杀的问题。

### 当前仍不能进 optimizer 的原因

v2 还有两个核心失败：

- 第二正确答案风险仍存在：模型仍会把近似正确项判为 `accept`。
- `fixable` 仍不稳定：few-shot 只达到 20% recall。

典型高风险样本包括：

- `PM岗位还在，只是旧的信息传递型 PM 会失去价值`
- `主要靠同步进度和转述材料工作的人`
- `产品取舍能力`

这些样本的风险不是“干扰项不够迷惑”，而是太接近正确答案，容易破坏单选唯一性。

### 最新结论

当前不进入 `BootstrapFewShot` / `MIPROv2` / `GEPA`。

下一步进入 Phase B v3：

1. 把“候选项与正确答案的关系类型”单独前置，例如 `same_meaning / near_correct_boundary / different_but_same_context / unrelated`。
2. 只有 `different_but_same_context` 才能进入 `accept / fixable`。
3. 把 `fixable` 改成独立路径，而不是介于 accept 和 reject 之间的模糊中间值。

详细报告：

- `analysis/phase-b-quality-judge-v2-comparison-20260603.md`

## 2026-06-03 最新状态：Phase B v3 Baseline

Phase B v3 已按 v2 结论推进：新增 `candidate_answer_relation`，要求模型先判断候选项与正确答案的关系，再输出质量标签。

Relation 枚举：

- `same_meaning`
- `near_correct_boundary`
- `different_but_same_context`
- `unrelated`

v3 结果：

| 模式 | Label accuracy | Issue exact | Avg score | Fixable recall | Hard failures | Accept -> reject | Reject -> accept |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 9 | 2 | 8 |
| few-shot | 66.7% | 35.1% | 0.604 | 10.0% | 8 | 2 | 7 |

v3 结论：

- 好干扰项误杀减少了，说明模型更愿意接受轻量边界项。
- 但 `reject -> accept` 变多，硬失败没有下降。
- `candidate_answer_relation` 基本失效：57 条里 56 条被判成 `different_but_same_context`，几乎没有识别 `near_correct_boundary`。

因此，v3 仍不进入 optimizer。

下一步是 Phase B v4：把关系判断拆成独立 `DistractorRelationCheck`，先单独验证“是否能识别第二正确答案 / 多选风险”。只有关系检查稳定后，才把样本送进 Quality Judge。

详细报告：

- `analysis/phase-b-quality-judge-v3-comparison-20260603.md`
