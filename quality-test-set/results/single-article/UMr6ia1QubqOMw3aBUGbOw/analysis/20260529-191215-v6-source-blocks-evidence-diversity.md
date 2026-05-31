# 单篇出题实验分析：v6-source-blocks-evidence-diversity

- 生成时间：2026-05-29T19:16:07.143Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-191215-v6-source-blocks-evidence-diversity.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260529-191215-v6-source-blocks-evidence-diversity.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：76.2%
- 平均来源精准度：5
- 平均最小证据分：4.6
- 未覆盖知识点：0

## 主要可信度原因

- weak_misconception_support: 12
- weak_explanation_faithfulness: 9
- weak_source_support: 5
- question_type_mismatch: 3
- judge_rewrite: 1
- weak_distractors: 1

## 主要阻断原因

- answer_not_unique: 3

## 来源复用 Top 5

- paragraph:11: 2 题 (q-1, supplement-kp-7-1-1)
- paragraph:8: 2 题 (q-2, q-3-rewrite-1-1)
- paragraph:27: 2 题 (q-6, supplement-kp-3-2-1)
- paragraph:28: 2 题 (q-9, q-14)

## 来源重叠 Top 5

- source-1: 2 题，最高重叠 1 (q-7, q-15)
- source-17: 2 题，最高重叠 1 (q-19, q-21)
- source-2: 1 题，最高重叠 1 (q-4)
- source-9: 1 题，最高重叠 1 (q-14)

## 证据块复用 Top 5

- p11-s0-0: 2 题，角色 contrast，知识点 2 个 (q-1, supplement-kp-7-1-1)
- p8-s0-3: 2 题，角色 example，知识点 1 个 (q-2, q-3-rewrite-1-1)
- p27-s0-3: 2 题，角色 example，知识点 2 个 (q-6, supplement-kp-3-2-1)
- p28-s0-3: 2 题，角色 example，知识点 2 个 (q-9, q-14)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 1 个证据块 / 2 种角色
- kp-3: 3 题 / 3 个证据块 / 2 种角色
- kp-4: 3 题 / 2 个证据块 / 2 种角色
- kp-5: 3 题 / 2 个证据块 / 1 种角色
- kp-6: 3 题 / 1 个证据块 / 1 种角色
- kp-7: 3 题 / 2 个证据块 / 2 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
