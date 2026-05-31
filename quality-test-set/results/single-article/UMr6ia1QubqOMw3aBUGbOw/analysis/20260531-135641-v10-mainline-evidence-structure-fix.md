# 单篇出题实验分析：v10-mainline-evidence-structure-fix

- 生成时间：2026-05-31T13:59:54.171Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-135641-v10-mainline-evidence-structure-fix.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-135641-v10-mainline-evidence-structure-fix.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：81%
- 平均来源精准度：5
- 平均最小证据分：4.9
- 平均认知动作匹配：4.1
- 平均练习递进：5
- 平均证据学习价值：4.7
- 重复练习风险题：11
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 10
- claim_overextended: 5
- answer_grounding_weak: 4
- misconception_not_grounded: 3
- boundary_not_teaching_real_confusion: 3
- core_recall_too_literal: 2

## 主要阻断原因

- answer_not_unique: 2
- weak_source_support: 2

## 来源复用 Top 5

- paragraph:13: 2 题 (q-1, q-2)
- paragraph:21: 2 题 (q-7, q-8)
- paragraph:36: 2 题 (q-12, q-15)
- paragraph:44: 2 题 (q-18, supplement-kp-5-2-1)
- paragraph:52: 2 题 (q-19, q-21)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-2, q-5)
- source-7: 1 题，最高重叠 1 (q-8)
- source-12: 1 题，最高重叠 1 (q-15)
- source-17: 1 题，最高重叠 1 (q-21)

## 证据块复用 Top 5

- p21-s0-1: 2 题，角色 contrast，知识点 1 个 (q-7, q-8)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-12, q-15)
- p44-s0-3: 2 题，角色 example，知识点 1 个 (q-18, supplement-kp-5-2-1)
- p52-s0-2: 2 题，角色 contrast，知识点 1 个 (q-19, q-21)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 3 个证据块 / 2 种角色
- kp-3: 3 题 / 2 个证据块 / 2 种角色
- kp-4: 3 题 / 3 个证据块 / 1 种角色
- kp-5: 3 题 / 2 个证据块 / 1 种角色
- kp-6: 3 题 / 2 个证据块 / 2 种角色
- kp-7: 3 题 / 2 个证据块 / 2 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
