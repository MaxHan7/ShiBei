# 单篇出题实验分析：v9-article-structure-rubric

- 生成时间：2026-05-31T01:59:43.131Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-015650-v9-article-structure-rubric.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-015650-v9-article-structure-rubric.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：20
- 平均每知识点题数：2.9
- 3 题知识点比例：85.7%
- 低置信题比例：95%
- 平均来源精准度：4.8
- 平均最小证据分：5
- 平均认知动作匹配：4.1
- 平均练习递进：4.9
- 平均证据学习价值：4.5
- 重复练习风险题：6
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 7
- answer_grounding_weak: 5
- misconception_not_reflected_in_options: 5
- boundary_not_teaching_real_confusion: 4
- core_recall_too_literal: 3
- misconception_too_generic: 3

## 主要阻断原因

- answer_not_unique: 3

## 来源复用 Top 5

- paragraph:43: 2 题 (q-3, q-16)
- paragraph:44: 2 题 (q-17, q-18)
- paragraph:52: 2 题 (q-19, q-20)

## 来源重叠 Top 5

- source-3: 1 题，最高重叠 1 (q-16)
- source-14: 1 题，最高重叠 1 (q-18)
- source-16: 1 题，最高重叠 1 (q-20)
- source-2: 1 题，最高重叠 0.79 (q-4)

## 证据块复用 Top 5

- p43-s0-2: 2 题，角色 example，知识点 2 个 (q-3, q-16)
- p44-s0-3: 2 题，角色 example，知识点 1 个 (q-17, q-18)
- p52-s0-2: 2 题，角色 contrast，知识点 1 个 (q-19, q-20)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 2 种角色
- kp-2: 3 题 / 1 个证据块 / 1 种角色
- kp-3: 3 题 / 2 个证据块 / 2 种角色
- kp-4: 3 题 / 2 个证据块 / 1 种角色
- kp-6: 3 题 / 2 个证据块 / 1 种角色
- kp-7: 3 题 / 2 个证据块 / 2 种角色
- kp-5: 2 题 / 2 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
