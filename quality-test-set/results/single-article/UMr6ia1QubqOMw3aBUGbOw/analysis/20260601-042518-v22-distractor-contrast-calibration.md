# 单篇出题实验分析：v22-distractor-contrast-calibration

- 生成时间：2026-06-01T04:27:56.156Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-042518-v22-distractor-contrast-calibration.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-042518-v22-distractor-contrast-calibration.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：11
- 平均每知识点题数：1.6
- 3 题知识点比例：14.3%
- 低置信题比例：90.9%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：4.6
- 平均练习递进：3.1
- 平均证据学习价值：4.8
- 平均低摩擦题卡分：4.9
- 平均可见阅读负担：111.7
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：1

## 主要可信度原因

- judge_rewrite: 7
- source_coverage_incomplete: 6
- answer_too_obvious: 6
- misconception_not_grounded: 3
- claim_overextended: 2
- answer_grounding_weak: 2

## 主要阻断原因

- answer_not_unique: 2

## 来源复用 Top 5

- paragraph:43: 2 题 (q-1, q-9)
- paragraph:13: 2 题 (q-2, q-2-rewrite-1-1)
- paragraph:14: 2 题 (q-4, q-4-rewrite-2-1)

## 来源重叠 Top 5

- source-1: 1 题，最高重叠 1 (q-9)
- source-2: 1 题，最高重叠 0.8 (q-4)

## 证据块复用 Top 5

- p43-s0-2: 2 题，角色 example，知识点 2 个 (q-1, q-9)
- p14-s0-2: 2 题，角色 mechanism，知识点 1 个 (q-4, q-4-rewrite-2-1)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 2 题 / 1 个证据块 / 1 种角色
- kp-3: 2 题 / 2 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色
- kp-7: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-5-rewrite-3-1: load 146, stem 44, option 41, friction 5, reasons -
- q-6-rewrite-4-1: load 138, stem 83, option 19, friction 4, reasons scenario_background_too_long
- q-4-rewrite-2-1: load 132, stem 49, option 26, friction 5, reasons -
- q-10: load 131, stem 52, option 22, friction 5, reasons -
- q-2: load 126, stem 38, option 33, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
