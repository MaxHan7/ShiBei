# 单篇出题实验分析：v16-structured-lean-prompt-length-restored

- 生成时间：2026-05-31T21:06:20.234Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260531-210336-v16-structured-lean-prompt-length-restored.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260531-210336-v16-structured-lean-prompt-length-restored.csv

## 核心指标

- 生成状态：completed
- 保留知识点：9
- 入池题数：19
- 平均每知识点题数：2.1
- 3 题知识点比例：22.2%
- 低置信题比例：89.5%
- 平均来源精准度：4.8
- 平均最小证据分：4.8
- 平均认知动作匹配：3.7
- 平均练习递进：4.3
- 平均证据学习价值：4.4
- 平均低摩擦题卡分：5
- 平均可见阅读负担：82.7
- 高摩擦题数：0
- 强制重写级高摩擦题数：0
- 重复练习风险题：6
- 未覆盖知识点：0

## 主要可信度原因

- source_coverage_incomplete: 9
- core_claim_too_literal: 5
- boundary_confusion_not_real: 4
- misconception_not_reflected_in_options: 3
- claim_overextended: 2
- judge_rewrite: 2

## 主要阻断原因

- answer_not_unique: 4

## 来源复用 Top 5

- paragraph:35: 3 题 (q-6, q-21, q-22-rewrite-4-1)
- paragraph:13: 2 题 (q-1, q-19)
- paragraph:23: 2 题 (q-3, q-12)
- paragraph:15: 2 题 (q-4, q-5)
- paragraph:28: 2 题 (q-8, q-17)

## 来源重叠 Top 5

- source-8: 2 题，最高重叠 1 (q-16, q-17)
- source-4: 1 题，最高重叠 1 (q-5)
- source-10: 1 题，最高重叠 1 (q-11)
- source-3: 1 题，最高重叠 1 (q-12)
- source-14: 1 题，最高重叠 1 (q-15)

## 证据块复用 Top 5

- p35-s0-3: 3 题，角色 example，知识点 2 个 (q-6, q-21, q-22-rewrite-4-1)
- p13-s0-0: 2 题，角色 contrast，知识点 2 个 (q-1, q-19)
- p23-s0-1: 2 题，角色 boundary，知识点 2 个 (q-3, q-12)
- p15-s0-3: 2 题，角色 example，知识点 1 个 (q-4, q-5)
- p28-s0-2: 2 题，角色 example，知识点 2 个 (q-8, q-17)

## 每知识点证据块覆盖

- kp-1: 3 题 / 3 个证据块 / 3 种角色
- kp-2: 3 题 / 2 个证据块 / 1 种角色
- kp-3: 2 题 / 2 个证据块 / 1 种角色
- kp-4: 2 题 / 1 个证据块 / 1 种角色
- kp-5: 2 题 / 2 个证据块 / 2 种角色
- kp-6: 2 题 / 1 个证据块 / 1 种角色
- kp-7: 2 题 / 1 个证据块 / 1 种角色
- kp-9: 2 题 / 1 个证据块 / 1 种角色
- kp-8: 1 题 / 1 个证据块 / 1 种角色

## 高摩擦题 Top 5

- q-22-rewrite-4-1: load 146, stem 47, option 31, friction 5, reasons -
- q-3: load 135, stem 44, option 32, friction 5, reasons -
- q-16: load 122, stem 43, option 26, friction 5, reasons -
- q-4: load 118, stem 20, option 27, friction 5, reasons -
- q-6: load 111, stem 34, option 28, friction 5, reasons -

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
