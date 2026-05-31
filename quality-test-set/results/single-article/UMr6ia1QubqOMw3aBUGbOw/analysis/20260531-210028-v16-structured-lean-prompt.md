# 单篇出题实验分析：v16-structured-lean-prompt

- 生成时间：2026-05-31T21:02:52.563Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-210028-v16-structured-lean-prompt.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-210028-v16-structured-lean-prompt.csv

## 核心指标

- 生成状态：completed
- 保留知识点：8
- 入池题数：15
- 平均每知识点题数：1.9
- 3 题知识点比例：12.5%
- 低置信题比例：73.3%
- 平均来源精准度：5
- 平均最小证据分：4.9
- 平均认知动作匹配：4.7
- 平均练习递进：3.5
- 平均证据学习价值：4.9
- 平均低摩擦题卡分：4.7
- 平均可见阅读负担：118.7
- 高摩擦题数：2
- 强制重写级高摩擦题数：1
- 重复练习风险题：4
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 8
- claim_overextended: 2
- judge_rewrite: 2
- question_card_too_heavy: 2
- answer_grounding_weak: 2
- misconception_not_grounded: 1

## 主要阻断原因

- answer_not_unique: 2

## 来源复用 Top 5

- paragraph:14: 2 题 (q-2, q-12-rewrite-2-1)
- paragraph:16: 2 题 (q-4, q-5)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-4, q-5)

## 证据块复用 Top 5

- p14-s0-2: 2 题，角色 mechanism，知识点 2 个 (q-2, q-12-rewrite-2-1)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 2 种角色
- kp-2: 2 题 / 0 个证据块 / 1 种角色
- kp-3: 2 题 / 2 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 2 种角色
- kp-6: 2 题 / 2 个证据块 / 2 种角色
- kp-8: 2 题 / 0 个证据块 / 1 种角色
- kp-4: 1 题 / 1 个证据块 / 1 种角色
- kp-7: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-3: load 188, stem 118, option 19, friction 2, reasons question_card_too_heavy|scenario_background_too_long
- q-12-rewrite-2-1: load 172, stem 22, option 48, friction 3, reasons question_card_too_heavy|option_too_explanatory
- q-16-rewrite-4-1: load 168, stem 57, option 29, friction 5, reasons -
- q-10: load 138, stem 48, option 28, friction 5, reasons -
- q-1: load 130, stem 37, option 29, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
