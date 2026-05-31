# 单篇出题实验分析：v10-mainline-evidence-structure-fix3

- 生成时间：2026-05-31T14:08:27.344Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-140547-v10-mainline-evidence-structure-fix3.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-140547-v10-mainline-evidence-structure-fix3.csv

## 核心指标

- 生成状态：completed
- 保留知识点：9
- 入池题数：27
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：88.9%
- 平均来源精准度：5
- 平均最小证据分：5
- 平均认知动作匹配：4.1
- 平均练习递进：5
- 平均证据学习价值：4.8
- 重复练习风险题：12
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 15
- answer_grounding_weak: 5
- boundary_not_teaching_real_confusion: 5
- claim_overextended: 4
- misconception_not_grounded: 3
- explanation_not_tied_to_answer: 3

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:15: 3 题 (q-5, q-7-rewrite-1-1, q-9)
- paragraph:14: 2 题 (q-1, q-4)
- paragraph:21: 2 题 (q-3, supplement-kp-4-1-1)
- paragraph:44: 2 题 (q-20, q-21)
- paragraph:52: 2 题 (q-22, q-23)

## 来源重叠 Top 5

- source-1: 1 题，最高重叠 1 (q-4)
- source-5: 1 题，最高重叠 1 (q-9)
- source-7: 1 题，最高重叠 1 (q-19)
- source-20: 1 题，最高重叠 1 (q-21)
- source-22: 1 题，最高重叠 1 (q-23)

## 证据块复用 Top 5

- p15-s0-3: 3 题，角色 example，知识点 2 个 (q-5, q-7-rewrite-1-1, q-9)
- p14-s0-2: 2 题，角色 mechanism，知识点 2 个 (q-1, q-4)
- p21-s0-1: 2 题，角色 contrast，知识点 2 个 (q-3, supplement-kp-4-1-1)
- p44-s0-3: 2 题，角色 example，知识点 1 个 (q-20, q-21)
- p52-s0-2: 2 题，角色 contrast，知识点 1 个 (q-22, q-23)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 3 个证据块 / 3 种角色
- kp-3: 3 题 / 2 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 3 种角色
- kp-5: 3 题 / 3 个证据块 / 2 种角色
- kp-6: 3 题 / 3 个证据块 / 1 种角色
- kp-7: 3 题 / 1 个证据块 / 1 种角色
- kp-8: 3 题 / 2 个证据块 / 2 种角色
- kp-9: 3 题 / 2 个证据块 / 3 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
