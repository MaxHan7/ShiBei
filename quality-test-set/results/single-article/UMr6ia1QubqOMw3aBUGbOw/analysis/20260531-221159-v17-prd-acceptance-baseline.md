# 单篇出题实验分析：v17-prd-acceptance-baseline

- 生成时间：2026-05-31T22:14:20.202Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-221159-v17-prd-acceptance-baseline.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-221159-v17-prd-acceptance-baseline.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：15
- 平均每知识点题数：2.1
- 3 题知识点比例：42.9%
- 需重写题比例：53.3%
- 可复习提醒题比例：26.7%
- 高置信题比例：20%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：4.5
- 平均练习递进：3.5
- 平均证据学习价值：4.7
- 平均低摩擦题卡分：5
- 平均可见阅读负担：78.5
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：1

## 主要可信度原因

- source_coverage_incomplete: 6
- misconception_not_grounded: 5
- explanation_not_tied_to_answer: 3
- misconception_not_reflected_in_options: 2
- answer_grounding_weak: 1
- misconception_too_generic: 1

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:23: 2 题 (q-14, q-15)
- paragraph:56: 2 题 (q-16, q-17)

## 来源重叠 Top 5

- source-14: 1 题，最高重叠 1 (q-15)
- source-16: 1 题，最高重叠 1 (q-17)
- source-4: 1 题，最高重叠 0.79 (q-18)

## 证据块复用 Top 5

- p23-s0-1: 2 题，角色 boundary，知识点 1 个 (q-14, q-15)
- p56-s0-3: 2 题，角色 example，知识点 1 个 (q-16, q-17)

## 每知识点证据块覆盖

- kp-3: 3 题 / 3 个证据块 / 2 种角色
- kp-5: 3 题 / 3 个证据块 / 1 种角色
- kp-7: 3 题 / 2 个证据块 / 1 种角色
- kp-1: 2 题 / 2 个证据块 / 2 种角色
- kp-2: 2 题 / 1 个证据块 / 1 种角色
- kp-6: 2 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-2: load 108, stem 20, option 27, friction 5, reasons -
- q-16: load 94, stem 33, option 32, friction 5, reasons -
- q-17: load 92, stem 32, option 24, friction 5, reasons -
- q-14: load 91, stem 32, option 31, friction 5, reasons -
- q-18: load 87, stem 34, option 19, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
