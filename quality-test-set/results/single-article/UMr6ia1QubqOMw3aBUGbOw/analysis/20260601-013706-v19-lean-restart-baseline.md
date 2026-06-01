# 单篇出题实验分析：v19-lean-restart-baseline

- 生成时间：2026-06-01T01:39:17.521Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-013706-v19-lean-restart-baseline.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-013706-v19-lean-restart-baseline.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：12
- 平均每知识点题数：1.7
- 3 题知识点比例：14.3%
- 低置信题比例：75%
- 平均来源精准度：5
- 平均最小证据分：4.4
- 平均认知动作匹配：4.3
- 平均练习递进：4
- 平均证据学习价值：4.7
- 平均低摩擦题卡分：5
- 平均可见阅读负担：73.3
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：0
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 5
- judge_rewrite: 3
- misconception_not_reflected_in_options: 3
- core_claim_too_literal: 3
- distractors_too_obvious: 2
- misconception_too_generic: 1

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:16: 2 题 (q-3, q-5)
- paragraph:33: 2 题 (q-9, q-9-rewrite-2-1)

## 来源重叠 Top 5

- source-3: 1 题，最高重叠 1 (q-5)

## 证据块复用 Top 5

- p33-s0-1: 2 题，角色 example，知识点 1 个 (q-9, q-9-rewrite-2-1)

## 每知识点证据块覆盖

- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-1: 2 题 / 1 个证据块 / 2 种角色
- kp-3: 2 题 / 2 个证据块 / 2 种角色
- kp-5: 2 题 / 1 个证据块 / 1 种角色
- kp-4: 1 题 / 1 个证据块 / 1 种角色
- kp-6: 1 题 / 1 个证据块 / 1 种角色
- kp-7: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-11-rewrite-3-1: load 135, stem 32, option 30, friction 5, reasons -
- q-4: load 104, stem 49, option 20, friction 5, reasons -
- q-9-rewrite-2-1: load 99, stem 40, option 16, friction 5, reasons -
- q-2-rewrite-1-1: load 97, stem 30, option 19, friction 5, reasons -
- q-2: load 88, stem 23, option 18, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
