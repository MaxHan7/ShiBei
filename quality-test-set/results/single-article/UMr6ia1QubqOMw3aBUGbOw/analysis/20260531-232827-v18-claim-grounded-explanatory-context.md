# 单篇出题实验分析：v18-claim-grounded-explanatory-context

- 生成时间：2026-05-31T23:32:20.173Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-232827-v18-claim-grounded-explanatory-context.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-232827-v18-claim-grounded-explanatory-context.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：18
- 平均每知识点题数：2.3
- 3 题知识点比例：50%
- 需重写题比例：38.9%
- 可复习提醒题比例：27.8%
- 高置信题比例：33.3%
- 平均来源精准度：4.7
- 平均最小证据分：4.4
- 平均认知动作匹配：4
- 平均练习递进：4.6
- 平均证据学习价值：4.6
- 平均低摩擦题卡分：5
- 平均可见阅读负担：73.3
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：5
- 未覆盖知识点：0

## 主要可信度原因

- answer_grounding_weak: 5
- source_coverage_incomplete: 5
- boundary_confusion_not_real: 4
- core_claim_too_literal: 3
- weak_context_relevance: 2
- judge_rewrite: 2

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:null: 14 题 (q-1, q-2, q-3, q-4, q-5, q-6, q-7-rewrite-1-1, q-8, q-10, q-9, q-11, q-14, q-16-rewrite-4-1, q-17)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-2, q-3)
- source-4: 2 题，最高重叠 1 (q-5, q-6)
- source-9: 2 题，最高重叠 1 (q-10, q-18)
- source-7: 1 题，最高重叠 1 (q-8)

## 证据块复用 Top 5

- 暂无

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 3 个证据块 / 3 种角色
- kp-3: 3 题 / 3 个证据块 / 2 种角色
- kp-7: 3 题 / 3 个证据块 / 3 种角色
- kp-5: 2 题 / 2 个证据块 / 2 种角色
- kp-8: 2 题 / 2 个证据块 / 2 种角色
- kp-4: 1 题 / 1 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-3: load 130, stem 55, option 27, friction 5, reasons -
- q-8: load 114, stem 58, option 20, friction 5, reasons -
- q-6: load 110, stem 39, option 29, friction 5, reasons -
- q-19: load 103, stem 50, option 19, friction 5, reasons -
- q-13: load 93, stem 42, option 25, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
