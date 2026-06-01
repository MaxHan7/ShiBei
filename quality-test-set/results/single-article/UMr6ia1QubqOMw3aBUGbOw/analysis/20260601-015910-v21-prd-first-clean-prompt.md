# 单篇出题实验分析：v21-prd-first-clean-prompt

- 生成时间：2026-06-01T02:02:48.817Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-015910-v21-prd-first-clean-prompt.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-015910-v21-prd-first-clean-prompt.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：17
- 平均每知识点题数：2.1
- 3 题知识点比例：25%
- 低置信题比例：82.4%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：4.5
- 平均练习递进：3.9
- 平均证据学习价值：4.9
- 平均低摩擦题卡分：4.9
- 平均可见阅读负担：96.1
- 高摩擦题数：1
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 8
- judge_rewrite: 6
- misconception_not_grounded: 4
- distractors_too_obvious: 4
- answer_grounding_weak: 2
- core_claim_too_literal: 2

## 主要阻断原因

- answer_not_unique: 5

## 来源复用 Top 5

- paragraph:34: 2 题 (q-6, q-16-rewrite-7-1)
- paragraph:36: 2 题 (q-8, q-16)
- paragraph:21: 2 题 (q-9, q-20)

## 来源重叠 Top 5

- source-8: 1 题，最高重叠 1 (q-16)
- source-9: 1 题，最高重叠 1 (q-20)

## 证据块复用 Top 5

- p34-s0-3: 2 题，角色 example，知识点 2 个 (q-6, q-16-rewrite-7-1)
- p36-s0-3: 2 题，角色 example，知识点 2 个 (q-8, q-16)
- p21-s0-1: 2 题，角色 contrast，知识点 2 个 (q-9, q-20)

## 每知识点证据块覆盖

- kp-5: 3 题 / 3 个证据块 / 1 种角色
- kp-7: 3 题 / 2 个证据块 / 1 种角色
- kp-1: 2 题 / 2 个证据块 / 2 种角色
- kp-2: 2 题 / 2 个证据块 / 2 种角色
- kp-4: 2 题 / 2 个证据块 / 2 种角色
- kp-6: 2 题 / 2 个证据块 / 1 种角色
- kp-8: 2 题 / 2 个证据块 / 1 种角色
- kp-3: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-16-rewrite-7-1: load 187, stem 86, option 27, friction 3, reasons question_card_too_heavy|scenario_background_too_long
- q-8: load 118, stem 46, option 24, friction 5, reasons -
- q-21: load 115, stem 26, option 28, friction 5, reasons -
- q-17-rewrite-8-1: load 110, stem 35, option 22, friction 5, reasons -
- q-11: load 105, stem 47, option 23, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
