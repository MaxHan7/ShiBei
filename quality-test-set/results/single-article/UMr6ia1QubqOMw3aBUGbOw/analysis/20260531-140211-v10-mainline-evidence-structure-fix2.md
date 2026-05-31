# 单篇出题实验分析：v10-mainline-evidence-structure-fix2

- 生成时间：2026-05-31T14:04:48.818Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-140211-v10-mainline-evidence-structure-fix2.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-140211-v10-mainline-evidence-structure-fix2.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：24
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：75%
- 平均来源精准度：4.8
- 平均最小证据分：4.9
- 平均认知动作匹配：4
- 平均练习递进：5
- 平均证据学习价值：4.8
- 重复练习风险题：4
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 11
- misconception_not_grounded: 7
- claim_overextended: 4
- core_recall_too_literal: 4
- explanation_not_tied_to_answer: 3
- misconception_not_reflected_in_options: 3

## 主要阻断原因

- answer_not_unique: 3

## 来源复用 Top 5

- paragraph:16: 2 题 (q-5, q-7)
- paragraph:43: 2 题 (q-8, q-9)
- paragraph:36: 2 题 (q-15, q-16)

## 来源重叠 Top 5

- source-2: 3 题，最高重叠 1 (q-5, q-8, q-9)
- source-3: 1 题，最高重叠 1 (q-7)
- source-15: 1 题，最高重叠 1 (q-16)

## 证据块复用 Top 5

- p43-s0-2: 2 题，角色 example，知识点 1 个 (q-8, q-9)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-15, q-16)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 3 种角色
- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-3: 3 题 / 1 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 3 种角色
- kp-5: 3 题 / 3 个证据块 / 2 种角色
- kp-6: 3 题 / 3 个证据块 / 2 种角色
- kp-7: 3 题 / 2 个证据块 / 1 种角色
- kp-8: 3 题 / 3 个证据块 / 3 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
