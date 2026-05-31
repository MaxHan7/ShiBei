# 单篇出题实验分析：v9-structure-binding-fix2

- 生成时间：2026-05-31T02:10:21.463Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-020815-v9-structure-binding-fix2.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-020815-v9-structure-binding-fix2.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：24
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：79.2%
- 平均来源精准度：4.7
- 平均最小证据分：4.9
- 平均认知动作匹配：4
- 平均练习递进：5
- 平均证据学习价值：4.5
- 重复练习风险题：10
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 9
- core_recall_too_literal: 6
- misconception_not_grounded: 6
- answer_grounding_weak: 6
- misconception_not_reflected_in_options: 5
- explanation_not_tied_to_answer: 4

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:15: 2 题 (q-3, q-4)
- paragraph:43: 2 题 (q-5, q-6)
- paragraph:16: 2 题 (q-7-rewrite-1-1, q-8)
- paragraph:36: 2 题 (q-12, q-14)
- paragraph:21: 2 题 (q-20, q-24)

## 来源重叠 Top 5

- source-3: 2 题，最高重叠 1 (q-4, q-9)
- source-5: 2 题，最高重叠 1 (q-6, q-18)
- source-7: 1 题，最高重叠 1 (q-8)
- source-12: 1 题，最高重叠 1 (q-14)
- source-19: 1 题，最高重叠 1 (q-24)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-3, q-4)
- p43-s0-2: 2 题，角色 example，知识点 1 个 (q-5, q-6)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-12, q-14)
- p21-s0-1: 2 题，角色 contrast，知识点 2 个 (q-20, q-24)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-3: 3 题 / 0 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 1 种角色
- kp-5: 3 题 / 3 个证据块 / 1 种角色
- kp-6: 3 题 / 1 个证据块 / 1 种角色
- kp-7: 3 题 / 3 个证据块 / 2 种角色
- kp-8: 3 题 / 1 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
