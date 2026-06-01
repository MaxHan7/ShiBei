# 单篇出题实验分析：v24-explicit-boundary-stem

- 生成时间：2026-06-01T04:42:36.420Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260601-044112-v24-explicit-boundary-stem.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260601-044112-v24-explicit-boundary-stem.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：12
- 平均每知识点题数：1.7
- 3 题知识点比例：0%
- 低置信题比例：58.3%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：4.3
- 平均练习递进：2.8
- 平均证据学习价值：4.8
- 平均低摩擦题卡分：5
- 平均可见阅读负担：89.4
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：2
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 3
- core_claim_too_literal: 3
- misconception_not_grounded: 1
- boundary_confusion_not_real: 1

## 主要阻断原因

- answer_not_unique: 2

## 来源复用 Top 5

- paragraph:23: 3 题 (q-6, q-7, q-8)

## 来源重叠 Top 5

- source-6: 2 题，最高重叠 1 (q-7, q-8)
- source-15: 1 题，最高重叠 1 (q-16)

## 证据块复用 Top 5

- p23-s0-1: 3 题，角色 boundary，知识点 2 个 (q-6, q-7, q-8)

## 每知识点证据块覆盖

- kp-1: 2 题 / 2 个证据块 / 2 种角色
- kp-2: 2 题 / 2 个证据块 / 2 种角色
- kp-3: 2 题 / 2 个证据块 / 1 种角色
- kp-4: 2 题 / 2 个证据块 / 1 种角色
- kp-6: 2 题 / 1 个证据块 / 1 种角色
- kp-5: 1 题 / 1 个证据块 / 1 种角色
- kp-7: 1 题 / 0 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-6: load 105, stem 40, option 23, friction 5, reasons -
- q-5: load 103, stem 45, option 24, friction 5, reasons -
- q-7: load 100, stem 38, option 29, friction 5, reasons -
- q-1: load 97, stem 24, option 31, friction 5, reasons -
- q-10: load 95, stem 45, option 18, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
