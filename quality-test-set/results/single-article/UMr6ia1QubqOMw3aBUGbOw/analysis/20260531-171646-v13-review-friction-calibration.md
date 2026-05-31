# 单篇出题实验分析：v13-review-friction-calibration

- 生成时间：2026-05-31T17:21:11.739Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-171646-v13-review-friction-calibration.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-171646-v13-review-friction-calibration.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：90.5%
- 平均来源精准度：4.8
- 平均最小证据分：4.7
- 平均认知动作匹配：3.7
- 平均练习递进：4.9
- 平均证据学习价值：4.6
- 平均低摩擦题卡分：4.9
- 平均可见阅读负担：87.1
- 高摩擦题数：1
- 强制重写级高摩擦题数：0
- 重复练习风险题：4
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 10
- core_claim_too_literal: 6
- explanation_not_tied_to_answer: 4
- boundary_confusion_not_real: 4
- answer_grounding_weak: 4
- judge_rewrite: 3

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:21: 3 题 (q-1, supplement-kp-6-2-1, q-20)
- paragraph:15: 2 题 (q-5, q-8)
- paragraph:14: 2 题 (q-6, supplement-kp-2-1-1)
- paragraph:33: 2 题 (q-16, q-16-rewrite-1-1)

## 来源重叠 Top 5

- source-5: 3 题，最高重叠 1 (q-7, q-8, q-9)
- source-4: 3 题，最高重叠 1 (q-16, q-17, q-21)
- source-2: 1 题，最高重叠 1 (q-3)
- source-1: 1 题，最高重叠 1 (q-20)

## 证据块复用 Top 5

- p21-s0-1: 3 题，角色 contrast，知识点 3 个 (q-1, supplement-kp-6-2-1, q-20)
- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-5, q-8)
- p14-s0-2: 2 题，角色 mechanism，知识点 1 个 (q-6, supplement-kp-2-1-1)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 2 个证据块 / 2 种角色
- kp-3: 3 题 / 1 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 2 种角色
- kp-5: 3 题 / 3 个证据块 / 3 种角色
- kp-6: 3 题 / 3 个证据块 / 2 种角色
- kp-7: 3 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- supplement-kp-2-1-1: load 201, stem 33, option 56, friction 3, reasons question_card_too_heavy|option_too_explanatory
- supplement-kp-4-3-1: load 175, stem 25, option 41, friction 4, reasons question_card_too_heavy
- q-3: load 126, stem 57, option 19, friction 5, reasons -
- supplement-kp-6-2-1: load 122, stem 42, option 25, friction 5, reasons -
- supplement-kp-5-4-1: load 119, stem 23, option 26, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
