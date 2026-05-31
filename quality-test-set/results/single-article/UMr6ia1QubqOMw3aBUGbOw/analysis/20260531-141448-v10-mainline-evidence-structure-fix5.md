# 单篇出题实验分析：v10-mainline-evidence-structure-fix5

- 生成时间：2026-05-31T14:17:18.205Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-141448-v10-mainline-evidence-structure-fix5.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-141448-v10-mainline-evidence-structure-fix5.csv

## 核心指标

- 生成状态：completed
- 保留知识点：6
- 入池题数：18
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：83.3%
- 平均来源精准度：4.9
- 平均最小证据分：5
- 平均认知动作匹配：4.2
- 平均练习递进：5
- 平均证据学习价值：4.8
- 重复练习风险题：2
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 10
- judge_rewrite: 2
- claim_overextended: 2
- scenario_transfer_too_literal: 2
- core_recall_too_literal: 2
- answer_grounding_weak: 2

## 主要阻断原因

- answer_not_unique: 1

## 来源复用 Top 5

- paragraph:15: 2 题 (q-2, q-4)
- paragraph:21: 2 题 (q-7, q-8)

## 来源重叠 Top 5

- source-2: 1 题，最高重叠 1 (q-4)
- source-7: 1 题，最高重叠 1 (q-8)

## 证据块复用 Top 5

- p15-s0-3: 2 题，角色 example，知识点 2 个 (q-2, q-4)
- p21-s0-1: 2 题，角色 contrast，知识点 1 个 (q-7, q-8)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 2 种角色
- kp-2: 3 题 / 3 个证据块 / 2 种角色
- kp-3: 3 题 / 3 个证据块 / 1 种角色
- kp-4: 3 题 / 3 个证据块 / 2 种角色
- kp-5: 3 题 / 2 个证据块 / 2 种角色
- kp-6: 3 题 / 2 个证据块 / 2 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
