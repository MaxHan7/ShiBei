# 单篇出题实验分析：v9-structure-binding-fix

- 生成时间：2026-05-31T02:07:18.837Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-020431-v9-structure-binding-fix.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-020431-v9-structure-binding-fix.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：20
- 平均每知识点题数：2.9
- 3 题知识点比例：85.7%
- 低置信题比例：75%
- 平均来源精准度：4.7
- 平均最小证据分：4.7
- 平均认知动作匹配：4
- 平均练习递进：4.9
- 平均证据学习价值：4.4
- 重复练习风险题：6
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 8
- answer_grounding_weak: 4
- boundary_not_teaching_real_confusion: 3
- misconception_not_reflected_in_options: 3
- core_recall_too_literal: 3
- weak_context_relevance: 2

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:21: 4 题 (q-10, q-12, supplement-kp-4-1-1, q-20)
- paragraph:15: 2 题 (q-2, q-4)
- paragraph:18: 2 题 (q-6, q-7)
- paragraph:16: 2 题 (q-8, q-9)
- paragraph:24: 2 题 (q-14, q-15)

## 来源重叠 Top 5

- source-2: 6 题，最高重叠 1 (q-4, q-5, q-6, q-7, q-8, q-9)
- source-10: 2 题，最高重叠 1 (q-12, q-20)
- source-14: 1 题，最高重叠 0.93 (q-15)

## 证据块复用 Top 5

- p21-s0-1: 4 题，角色 contrast，知识点 2 个 (q-10, q-12, supplement-kp-4-1-1, q-20)
- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-2, q-4)
- p35-s0-3: 2 题，角色 example，知识点 1 个 (q-16-rewrite-1-1, q-17)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 2 种角色
- kp-2: 3 题 / 1 个证据块 / 1 种角色
- kp-3: 3 题 / 0 个证据块 / 1 种角色
- kp-4: 3 题 / 1 个证据块 / 1 种角色
- kp-5: 3 题 / 1 个证据块 / 2 种角色
- kp-7: 3 题 / 2 个证据块 / 2 种角色
- kp-6: 2 题 / 1 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
