# 单篇出题实验分析：v10-mainline-evidence-structure-fix6

- 生成时间：2026-05-31T14:21:21.297Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-141831-v10-mainline-evidence-structure-fix6.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-141831-v10-mainline-evidence-structure-fix6.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：20
- 平均每知识点题数：2.9
- 3 题知识点比例：85.7%
- 低置信题比例：90%
- 平均来源精准度：4.9
- 平均最小证据分：4.9
- 平均认知动作匹配：3.7
- 平均练习递进：4.9
- 平均证据学习价值：4.6
- 重复练习风险题：6
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 8
- boundary_not_teaching_real_confusion: 5
- misconception_not_reflected_in_options: 5
- answer_grounding_weak: 4
- cognitive_action_weak: 3
- core_recall_too_literal: 3

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:43: 2 题 (q-3, q-16)
- paragraph:16: 2 题 (q-4, q-5)
- paragraph:21: 2 题 (q-7, q-8)
- paragraph:27: 2 题 (q-11, q-12)
- paragraph:52: 2 题 (q-19, q-20)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-2, q-6)
- source-18: 2 题，最高重叠 1 (q-20, q-21)
- source-4: 1 题，最高重叠 1 (q-5)
- source-7: 1 题，最高重叠 1 (q-8)
- source-11: 1 题，最高重叠 1 (q-12)

## 证据块复用 Top 5

- p43-s0-2: 2 题，角色 example，知识点 2 个 (q-3, q-16)
- p21-s0-1: 2 题，角色 contrast，知识点 1 个 (q-7, q-8)
- p27-s0-3: 2 题，角色 example，知识点 1 个 (q-11, q-12)
- p52-s0-2: 2 题，角色 contrast，知识点 1 个 (q-19, q-20)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 1 个证据块 / 2 种角色
- kp-3: 3 题 / 2 个证据块 / 2 种角色
- kp-4: 3 题 / 2 个证据块 / 1 种角色
- kp-6: 3 题 / 2 个证据块 / 1 种角色
- kp-7: 3 题 / 1 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
