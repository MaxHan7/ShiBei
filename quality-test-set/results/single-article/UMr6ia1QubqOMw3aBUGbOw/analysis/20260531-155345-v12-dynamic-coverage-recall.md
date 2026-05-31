# 单篇出题实验分析：v12-dynamic-coverage-recall

- 生成时间：2026-05-31T15:57:05.483Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-155345-v12-dynamic-coverage-recall.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-155345-v12-dynamic-coverage-recall.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：18
- 平均每知识点题数：2.6
- 3 题知识点比例：57.1%
- 低置信题比例：88.9%
- 平均来源精准度：4.9
- 平均最小证据分：4.9
- 平均认知动作匹配：3.6
- 平均练习递进：4.7
- 平均证据学习价值：4.7
- 重复练习风险题：6
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 9
- boundary_confusion_not_real: 5
- misconception_not_reflected_in_options: 4
- core_claim_too_literal: 3
- answer_grounding_weak: 2
- cognitive_action_weak: 2

## 主要阻断原因

- 暂无

## 来源复用 Top 5

- paragraph:15: 2 题 (q-4, q-5)
- paragraph:36: 2 题 (q-6, q-14)
- paragraph:52: 2 题 (q-7, q-20)
- paragraph:23: 2 题 (q-8, supplement-kp-6-1-1)
- paragraph:37: 2 题 (q-15, supplement-kp-5-3-2)

## 来源重叠 Top 5

- source-4: 1 题，最高重叠 1 (q-5)
- source-10: 1 题，最高重叠 1 (q-11)
- source-1: 1 题，最高重叠 1 (q-12)
- source-6: 1 题，最高重叠 1 (q-14)
- source-7: 1 题，最高重叠 1 (q-20)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 1 个 (q-4, q-5)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-6, q-14)
- p52-s0-2: 2 题，角色 contrast，知识点 2 个 (q-7, q-20)
- p23-s0-1: 2 题，角色 boundary，知识点 1 个 (q-8, supplement-kp-6-1-1)
- p37-s0-2: 2 题，角色 example，知识点 2 个 (q-15, supplement-kp-5-3-2)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 1 种角色
- kp-6: 3 题 / 2 个证据块 / 2 种角色
- kp-3: 2 题 / 0 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 2 种角色
- kp-7: 2 题 / 2 个证据块 / 2 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
