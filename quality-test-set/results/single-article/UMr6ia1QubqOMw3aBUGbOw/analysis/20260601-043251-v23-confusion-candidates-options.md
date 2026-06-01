# 单篇出题实验分析：v23-confusion-candidates-options

- 生成时间：2026-06-01T04:35:39.317Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-043251-v23-confusion-candidates-options.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-043251-v23-confusion-candidates-options.csv

## 核心指标

- 生成状态：completed
- 保留知识点：10
- 入池题数：15
- 平均每知识点题数：1.5
- 3 题知识点比例：10%
- 低置信题比例：86.7%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：3.9
- 平均练习递进：3.6
- 平均证据学习价值：4.7
- 平均低摩擦题卡分：5
- 平均可见阅读负担：84.6
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 6
- misconception_not_grounded: 4
- core_claim_too_literal: 3
- scenario_is_restatement: 3
- misconception_not_reflected_in_options: 1
- cognitive_action_weak: 1

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:15: 2 题 (q-3, q-4)
- paragraph:28: 2 题 (q-7, q-12)
- paragraph:34: 2 题 (q-15, q-18-rewrite-6-1)

## 来源重叠 Top 5

- source-3: 1 题，最高重叠 1 (q-4)
- source-9: 1 题，最高重叠 1 (q-10)
- source-7: 1 题，最高重叠 1 (q-12)
- source-14: 1 题，最高重叠 1 (q-15)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 1 个 (q-3, q-4)
- p28-s0-2: 2 题，角色 example，知识点 2 个 (q-7, q-12)
- p34-s0-3: 2 题，角色 example，知识点 2 个 (q-15, q-18-rewrite-6-1)

## 每知识点证据块覆盖

- kp-4: 3 题 / 3 个证据块 / 2 种角色
- kp-1: 2 题 / 1 个证据块 / 1 种角色
- kp-10: 2 题 / 2 个证据块 / 2 种角色
- kp-7: 2 题 / 2 个证据块 / 1 种角色
- kp-2: 1 题 / 1 个证据块 / 1 种角色
- kp-3: 1 题 / 1 个证据块 / 1 种角色
- kp-5: 1 题 / 1 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色
- kp-8: 1 题 / 1 个证据块 / 1 种角色
- kp-9: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-16-rewrite-5-1: load 138, stem 54, option 25, friction 5, reasons -
- q-1: load 111, stem 24, option 40, friction 5, reasons -
- q-4: load 103, stem 36, option 23, friction 5, reasons -
- q-3: load 96, stem 29, option 26, friction 5, reasons -
- q-15: load 96, stem 32, option 24, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
