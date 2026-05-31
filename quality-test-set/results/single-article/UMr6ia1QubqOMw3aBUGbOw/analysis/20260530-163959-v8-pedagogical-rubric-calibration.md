# 单篇出题实验分析：v8-pedagogical-rubric-calibration

- 生成时间：2026-05-30T16:44:38.933Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260530-163959-v8-pedagogical-rubric-calibration.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260530-163959-v8-pedagogical-rubric-calibration.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：90.5%
- 平均来源精准度：5
- 平均最小证据分：4.8
- 平均认知动作匹配：3.6
- 平均练习递进：5
- 平均证据学习价值：4.7
- 重复练习风险题：8
- 未覆盖知识点：0

## 主要可信度原因

- core_recall_too_literal: 6
- answer_grounding_weak: 6
- misconception_not_grounded: 4
- boundary_not_teaching_real_confusion: 4
- judge_rewrite: 3
- explanation_not_tied_to_answer: 3

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:7: 2 题 (q-1-rewrite-1-1, q-16-rewrite-5-1)
- paragraph:27: 2 题 (q-3, q-15-rewrite-4-1)
- paragraph:8: 2 题 (q-4, q-5)
- paragraph:46: 2 题 (q-21, supplement-kp-7-1-1)

## 来源重叠 Top 5

- source-4: 1 题，最高重叠 1 (q-5)
- source-16: 1 题，最高重叠 1 (q-18)
- source-9: 1 题，最高重叠 0.7 (q-21)

## 证据块复用 Top 5

- p7-s0-2: 2 题，角色 mechanism，知识点 2 个 (q-1-rewrite-1-1, q-16-rewrite-5-1)
- p27-s0-3: 2 题，角色 example，知识点 2 个 (q-3, q-15-rewrite-4-1)
- p8-s0-3: 2 题，角色 example，知识点 1 个 (q-4, q-5)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-3: 3 题 / 3 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 1 种角色
- kp-5: 3 题 / 2 个证据块 / 2 种角色
- kp-6: 3 题 / 2 个证据块 / 2 种角色
- kp-7: 3 题 / 1 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
