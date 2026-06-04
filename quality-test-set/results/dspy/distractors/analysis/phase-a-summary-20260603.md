# DSPy Phase A 干扰项共识集汇总

日期：2026-06-03

## 结论

Phase A 已完成干扰项字段的人工共识集整理，可以进入 Phase B baseline 准备，但还不能进入 DSPy optimizer。

本阶段只服务两个隔离任务：

1. `DistractorQualityJudge`：判断候选干扰项是 `accept`、`fixable` 还是 `reject`。
2. `RewriteDistractor`：把一个坏/可修干扰项改写成更有学习价值、但仍然错误的干扰项。

## 数据文件

| 文件 | 任务 | 数量 | 标签分布 | 用途 |
| --- | --- | ---: | --- | --- |
| `datasets/dspy-distractor-quality-judge-phase-a.v1.jsonl` | `DistractorQualityJudge` | 21 | accept 9 / fixable 6 / reject 6 | Phase B judge baseline |
| `datasets/hook-distractor-rewrite-trainset.v1.jsonl` | `RewriteDistractor` | 15 | rewrite 15 | Phase B rewrite baseline |
| `datasets/phase-a-hook-distractor-field-samples.v1.jsonl` | 无 | 21 | 草稿混合 | 过程记录，不进入训练/验证 |

## Phase A 人工确认状态

- Positive tab：9 条好干扰项样本已确认，其中 1 条按用户意见修正后保留。
- Negative tab：12 条坏/可修样本已确认，并补充 `gold_quality_label`，避免把所有 Negative 都误当成 `reject`。
- Rewrite：从 12 条补到 15 条，只新增明确的“坏/可修干扰项 -> 黄金改写”样本，没有混入正确选项修订。

## 不能做什么

- 不能把 Phase A 数据直接用于生产 prompt。
- 不能把 `phase-a-hook-distractor-field-samples.v1.jsonl` 当训练集。
- 不能把 Positive、Negative、Rewrite 混成同一个 DSPy task。
- 不能跑 MIPROv2 / GEPA 等 optimizer；当前只有 Hook 单篇，样本量不足。

## 下一步：Phase B Baseline

Phase B 只做零样本/少样本 baseline，不做 optimizer。

最低要求：

- 增加至少 1 篇非 Hook 文章的字段级样本。
- 为 `DistractorQualityJudge` 准备独立 train/dev/test 或至少 dev/test。
- 为 `RewriteDistractor` 准备独立 rewrite dev/test。
- 基线报告必须分别评估：
  - Judge 是否能区分 `accept / fixable / reject`。
  - Rewrite 是否仍然保持错误、同语境、有学习价值。

## 验证记录

- JSONL 可逐行解析。
- Judge 数据只包含 `accept / fixable / reject`。
- Rewrite 数据只输出 `rewritten_option / rationale`。
- 数据不包含 API key，不包含完整原文。
