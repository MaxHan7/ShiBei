# 单篇出题实验分析：v11-cognitive-action-rubric-loop

- 生成时间：2026-05-31T14:55:50.414Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-144958-v11-cognitive-action-rubric-loop.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-144958-v11-cognitive-action-rubric-loop.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：15
- 平均每知识点题数：2.1
- 3 题知识点比例：28.6%
- 低置信题比例：73.3%
- 平均来源精准度：5
- 平均最小证据分：4.5
- 平均认知动作匹配：4
- 平均练习递进：4.3
- 平均证据学习价值：4.6
- 重复练习风险题：0
- 未覆盖知识点：0

## 主要可信度原因

- misconception_not_reflected_in_options: 4
- source_coverage_incomplete: 4
- boundary_confusion_not_real: 4
- answer_grounding_weak: 2
- judge_rewrite: 2
- type_does_not_serve_cognitive_action: 1

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:33: 2 题 (q-15-rewrite-2-1, supplement-kp-5-3-1)

## 来源重叠 Top 5

- source-4: 2 题，最高重叠 1 (q-5, q-6)
- source-1: 1 题，最高重叠 1 (q-2)

## 证据块复用 Top 5

- p33-s0-1: 2 题，角色 example，知识点 1 个 (q-15-rewrite-2-1, supplement-kp-5-3-1)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-4: 3 题 / 3 个证据块 / 2 种角色
- kp-2: 2 题 / 0 个证据块 / 1 种角色
- kp-5: 2 题 / 1 个证据块 / 1 种角色
- kp-6: 2 题 / 0 个证据块 / 1 种角色
- kp-7: 2 题 / 2 个证据块 / 2 种角色
- kp-3: 1 题 / 1 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
