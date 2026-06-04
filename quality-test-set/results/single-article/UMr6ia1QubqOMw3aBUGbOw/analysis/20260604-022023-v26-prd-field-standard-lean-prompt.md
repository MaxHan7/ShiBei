# 单篇出题实验分析：v26-prd-field-standard-lean-prompt

- 生成时间：2026-06-04T02:22:41.132Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260604-022023-v26-prd-field-standard-lean-prompt.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260604-022023-v26-prd-field-standard-lean-prompt.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：20
- 平均每知识点题数：2.5
- 3 题知识点比例：50%
- 低置信题比例：95%
- 平均来源精准度：5
- 平均最小证据分：4.8
- 平均认知动作匹配：4.4
- 平均练习递进：3.6
- 平均证据学习价值：4.8
- 平均低摩擦题卡分：5
- 平均可见阅读负担：109.8
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 10
- misconception_not_reflected_in_options: 6
- explanation_not_tied_to_answer: 4
- misconception_not_grounded: 2
- boundary_confusion_not_real: 2
- claim_overextended: 2

## 主要阻断原因

- answer_not_unique: 2

## 来源复用 Top 5

- paragraph:15: 2 题 (q-6, q-7)
- paragraph:35: 2 题 (q-9, q-17)

## 来源重叠 Top 5

- source-6: 1 题，最高重叠 1 (q-7)
- source-1: 1 题，最高重叠 1 (q-15)
- source-9: 1 题，最高重叠 1 (q-17)
- source-11: 1 题，最高重叠 1 (q-20)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-6, q-7)
- p35-s0-3: 2 题，角色 example，知识点 2 个 (q-9, q-17)

## 每知识点证据块覆盖

- kp-2: 3 题 / 3 个证据块 / 1 种角色
- kp-3: 3 题 / 2 个证据块 / 3 种角色
- kp-6: 3 题 / 3 个证据块 / 2 种角色
- kp-7: 3 题 / 3 个证据块 / 3 种角色
- kp-1: 2 题 / 2 个证据块 / 2 种角色
- kp-4: 2 题 / 2 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 1 种角色
- kp-8: 2 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-2: load 155, stem 77, option 22, friction 5, reasons -
- q-1: load 143, stem 86, option 18, friction 4, reasons scenario_background_too_long
- q-7: load 135, stem 41, option 38, friction 5, reasons -
- q-16-rewrite-2-1: load 134, stem 60, option 21, friction 5, reasons -
- q-21: load 128, stem 54, option 28, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
