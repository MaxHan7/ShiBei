# DSPy Phase B v3 Quality Judge 对比报告

日期：2026-06-03

本轮继续只验证实验室里的 `DistractorQualityJudge`，不改生产出题系统、不改生产 prompt、不跑 optimizer。

## 实验假设

v2 仍会把“近似正确答案 / 第二正确答案风险”判成 `accept`。
v3 的假设是：如果先让模型输出候选项与正确答案的关系类型，再输出质量标签，模型应该更容易拦住多选风险。

新增输出字段：

- `candidate_answer_relation`
  - `same_meaning`
  - `near_correct_boundary`
  - `different_but_same_context`
  - `unrelated`

新的硬失败规则：

- 如果模型自报 `same_meaning` 或 `near_correct_boundary`，但仍输出 `accept`，记为硬失败。

## 指标对比

| 版本 | 模式 | Label accuracy | Issue exact | Avg score | Fixable recall | Hard failures | Accept -> reject | Reject -> accept |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v2 | zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 7 | 5 | 6 |
| v2 | few-shot | 66.7% | 33.3% | 0.600 | 20.0% | 7 | 5 | 6 |
| v3 | zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 9 | 2 | 8 |
| v3 | few-shot | 66.7% | 35.1% | 0.604 | 10.0% | 8 | 2 | 7 |

## v3 观察

v3 没有达到预期。

它确实减少了好干扰项被误杀：`accept -> reject` 从 5 降到 2。
但代价是模型更愿意把边界项都判为 `accept`，导致 `reject -> accept` 从 6 上升到 7-8，硬失败没有下降。

最关键的是：`candidate_answer_relation` 基本失效。

| Relation | v3 zero-shot | v3 few-shot |
| --- | ---: | ---: |
| `different_but_same_context` | 56 | 56 |
| `same_meaning` | 1 | 1 |
| `near_correct_boundary` | 0 | 0 |
| `unrelated` | 0 | 0 |

这说明模型没有真正进行“候选项与正确答案关系分类”。它把几乎所有候选项都归成 `different_but_same_context`，然后再用“有学习边界”来放行。

## 典型失败

### 1. 第二正确答案仍被放行

仍被判为 `accept` 的高风险项：

- `PM岗位还在，只是旧的信息传递型 PM 会失去价值`
- `主要靠同步进度和转述材料工作的人`
- `产品取舍能力`

这些项的问题不是“不在同一语境”，而是太接近正确答案。v3 仍然没有把它们识别为 `same_meaning` 或 `near_correct_boundary`。

### 2. reject 被“学习价值”逻辑误放行

例如：

- `责怪工程师`
- `放弃使用AI`
- `认为 Prompt 已能稳定强制执行规则`

模型会说它们“明显错误，但能帮助区分边界”，于是判 `accept`。这暴露出一个新问题：**学习价值不能覆盖低质量 / 离谱 / 无关 / 过泛风险**。

### 3. fixable 仍没有被建模

v3 few-shot 的 `fixable` recall 从 v2 的 20% 退到 10%。
模型仍然把可修项理解成：

- 有学习价值 -> accept
- 表达弱 -> reject

它没有稳定学会“方向有价值但需要改”的中间路径。

## 第一性原理结论

干扰项判断不能只靠一个 LLM Judge 在自然语言里自觉遵守顺序。
v3 证明：即使 prompt 写了“先判断关系”，模型仍可能把所有项归到安全类别，然后继续用原来的偏好打分。

下一步不应该继续给同一个 Judge 加更多文字规则。
应该把任务拆得更硬：

1. **Relation Check 独立成第一阶段**
   - 只判断候选项和正确答案的语义关系。
   - 输出必须是 `same_meaning / near_correct_boundary / different_but_same_context / unrelated`。
   - 不允许同时判断学习价值。

2. **Quality Judge 只处理已通过关系检查的候选项**
   - 只有 `different_but_same_context` 进入 `accept / fixable / reject`。
   - `same_meaning` 和 `near_correct_boundary` 直接 `reject`。

3. **Metric 用规则先覆盖 P0**
   - 如果 gold issue 是 `correct_equivalent_multiselect_risk`，但 relation 不是 `same_meaning / near_correct_boundary`，直接重罚。
   - 这比让模型自己在同一个输出里“意识到风险”更可靠。

## 当前结论

v3 不进入 optimizer。

v3 的价值是证明：单纯在 Judge prompt 里增加关系字段，不足以解决第二正确答案风险。
下一轮应进入 Phase B v4：两阶段 Judge。

## 下一步：Phase B v4

Phase B v4 只改实验室，不改生产：

1. 新增 `DistractorRelationCheck` signature。
2. 先跑 relation-only baseline。
3. 如果 relation-only 仍识别不了第二正确答案，继续补关系样本，不进入质量判断器优化。
4. 如果 relation-only 能稳定识别，再把它接到 Quality Judge 前面。

Phase B v4 的最低验收：

- `correct_equivalent_multiselect_risk` 的 relation 召回至少 70%。
- `near_correct_boundary` 不再几乎为 0。
- Hard failures 明显低于 v2/v3。
- `fixable` 暂时不作为主目标，先保唯一性。

## 关联产物

- `baselines/phase-b-quality-judge-v3-zero-shot-20260603-180016.json`
- `baselines/phase-b-quality-judge-v3-few-shot-20260603-180016.json`
- `analysis/phase-b-quality-judge-v3-baseline-zero-shot-20260603-180016.md`
- `analysis/phase-b-quality-judge-v3-baseline-few-shot-20260603-180016.md`
