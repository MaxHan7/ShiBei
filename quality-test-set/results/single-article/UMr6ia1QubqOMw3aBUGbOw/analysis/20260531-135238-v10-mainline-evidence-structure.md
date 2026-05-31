# 单篇出题实验分析：v10-mainline-evidence-structure

- 生成时间：2026-05-31T13:54:37.119Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-135238-v10-mainline-evidence-structure.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-135238-v10-mainline-evidence-structure.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：90.5%
- 平均来源精准度：4.9
- 平均最小证据分：4.7
- 平均认知动作匹配：3.9
- 平均练习递进：5
- 平均证据学习价值：4.7
- 重复练习风险题：4
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 9
- misconception_not_reflected_in_options: 6
- core_recall_too_literal: 5
- answer_grounding_weak: 5
- boundary_not_teaching_real_confusion: 4
- claim_overextended: 2

## 主要阻断原因

- 暂无

## 来源复用 Top 5

- paragraph:15: 3 题 (q-1, q-2, q-5)
- paragraph:35: 2 题 (q-6, q-9)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-2, q-5)
- source-15: 2 题，最高重叠 1 (q-18, q-21)
- source-6: 1 题，最高重叠 1 (q-9)

## 证据块复用 Top 5

- p15-s0-3: 3 题，角色 example，知识点 2 个 (q-1, q-2, q-5)
- p35-s0-3: 2 题，角色 example，知识点 2 个 (q-6, q-9)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 3 个证据块 / 1 种角色
- kp-3: 3 题 / 3 个证据块 / 2 种角色
- kp-4: 3 题 / 3 个证据块 / 2 种角色
- kp-5: 3 题 / 2 个证据块 / 1 种角色
- kp-6: 3 题 / 1 个证据块 / 1 种角色
- kp-7: 3 题 / 2 个证据块 / 2 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
