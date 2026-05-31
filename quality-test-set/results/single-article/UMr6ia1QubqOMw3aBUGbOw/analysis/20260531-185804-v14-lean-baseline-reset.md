# 单篇出题实验分析：v14-lean-baseline-reset

- 生成时间：2026-05-31T18:59:55.688Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-185804-v14-lean-baseline-reset.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-185804-v14-lean-baseline-reset.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：7
- 平均每知识点题数：1
- 3 题知识点比例：0%
- 低置信题比例：71.4%
- 平均来源精准度：5
- 平均最小证据分：4.7
- 平均认知动作匹配：4.3
- 平均练习递进：3.3
- 平均证据学习价值：4.8
- 平均低摩擦题卡分：4
- 平均可见阅读负担：151.6
- 高摩擦题数：3
- 强制重写级高摩擦题数：1
- 重复练习风险题：2
- 未覆盖知识点：1

## 主要可信度原因

- source_coverage_incomplete: 3
- judge_rewrite: 3
- question_card_too_heavy: 3
- scenario_background_too_long: 3
- core_claim_too_literal: 2
- explanation_not_tied_to_answer: 1

## 主要阻断原因

- 暂无

## 来源复用 Top 5

- 暂无

## 来源重叠 Top 5

- source-1: 1 题，最高重叠 1 (q-2)

## 证据块复用 Top 5

- 暂无

## 每知识点证据块覆盖

- kp-7: 2 题 / 1 个证据块 / 2 种角色
- kp-2: 1 题 / 1 个证据块 / 1 种角色
- kp-3: 1 题 / 1 个证据块 / 1 种角色
- kp-4: 1 题 / 1 个证据块 / 1 种角色
- kp-5: 1 题 / 1 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-7-rewrite-2-1: load 222, stem 95, option 36, friction 2, reasons question_card_too_heavy|scenario_background_too_long
- q-7: load 217, stem 106, option 31, friction 3, reasons question_card_too_heavy|scenario_background_too_long
- q-4: load 179, stem 89, option 32, friction 3, reasons question_card_too_heavy|scenario_background_too_long
- q-2: load 134, stem 28, option 29, friction 5, reasons -
- q-5: load 131, stem 51, option 26, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
