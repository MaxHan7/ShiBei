# 单篇出题实验分析：v20-fatal-explanation-guard

- 生成时间：2026-06-01T01:45:16.854Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-014222-v20-fatal-explanation-guard.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-014222-v20-fatal-explanation-guard.csv

## 核心指标

- 生成状态：completed
- 保留知识点：10
- 入池题数：14
- 平均每知识点题数：1.4
- 3 题知识点比例：10%
- 低置信题比例：85.7%
- 平均来源精准度：4.9
- 平均最小证据分：4.8
- 平均认知动作匹配：3.9
- 平均练习递进：3.4
- 平均证据学习价值：4.6
- 平均低摩擦题卡分：5
- 平均可见阅读负担：100.5
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：2
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 5
- misconception_not_reflected_in_options: 5
- core_claim_too_literal: 3
- scenario_is_restatement: 3
- explanation_not_tied_to_answer: 2
- answer_grounding_weak: 2

## 主要阻断原因

- answer_not_unique: 8

## 来源复用 Top 5

- paragraph:15: 2 题 (q-1-rewrite-1-1, q-3)
- paragraph:36: 2 题 (q-4, q-14)

## 来源重叠 Top 5

- source-4: 1 题，最高重叠 1 (q-14)
- source-14: 1 题，最高重叠 1 (q-16)
- source-3: 1 题，最高重叠 0.79 (q-6)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-1-rewrite-1-1, q-3)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-4, q-14)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 1 种角色
- kp-3: 2 题 / 2 个证据块 / 1 种角色
- kp-7: 2 题 / 0 个证据块 / 2 种角色
- kp-10: 1 题 / 1 个证据块 / 1 种角色
- kp-2: 1 题 / 1 个证据块 / 1 种角色
- kp-4: 1 题 / 1 个证据块 / 1 种角色
- kp-5: 1 题 / 0 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色
- kp-8: 1 题 / 0 个证据块 / 1 种角色
- kp-9: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-19: load 147, stem 49, option 33, friction 5, reasons -
- q-18: load 125, stem 33, option 23, friction 5, reasons -
- q-6: load 120, stem 50, option 25, friction 5, reasons -
- q-4: load 114, stem 35, option 25, friction 5, reasons -
- q-3: load 111, stem 28, option 24, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
