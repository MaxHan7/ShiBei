# 单篇出题实验分析：v7-cognitive-blueprint-alignment

- 生成时间：2026-05-30T14:21:26.279Z
- 文章：https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw
- 原始 JSON：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260530-141747-v7-cognitive-blueprint-alignment.json
- 人工审查 CSV：quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260530-141747-v7-cognitive-blueprint-alignment.csv

## 核心指标

- 生成状态：completed
- 保留知识点：7
- 入池题数：21
- 平均每知识点题数：3
- 3 题知识点比例：100%
- 低置信题比例：66.7%
- 平均来源精准度：5
- 平均最小证据分：4.7
- 未覆盖知识点：0

## 主要可信度原因

- question_type_mismatch: 10
- misconception_not_grounded: 5
- judge_rewrite: 3
- answer_grounding_weak: 2
- explanation_overextends_source: 1
- weak_distractors: 1

## 主要阻断原因

- answer_not_unique: 3

## 来源复用 Top 5

- paragraph:6: 2 题 (q-1, q-2)
- paragraph:8: 2 题 (q-5, supplement-kp-2-1-1)
- paragraph:27: 2 题 (q-9, q-13)
- paragraph:20: 2 题 (q-10, q-12-rewrite-3-1)
- paragraph:45: 2 题 (q-19, q-20)

## 来源重叠 Top 5

- source-3: 3 题，最高重叠 1 (q-6, q-7, q-8)
- source-1: 1 题，最高重叠 1 (q-2)
- source-4: 1 题，最高重叠 1 (q-5)
- source-9: 1 题，最高重叠 1 (q-13)
- source-16: 1 题，最高重叠 1 (q-17)

## 证据块复用 Top 5

- p6-s0-0: 2 题，角色 contrast，知识点 1 个 (q-1, q-2)
- p8-s0-3: 2 题，角色 example，知识点 1 个 (q-5, supplement-kp-2-1-1)
- p27-s0-3: 2 题，角色 example，知识点 2 个 (q-9, q-13)
- p20-s0-3: 2 题，角色 example，知识点 1 个 (q-10, q-12-rewrite-3-1)
- p45-s0-2: 2 题，角色 contrast，知识点 1 个 (q-19, q-20)

## 每知识点证据块覆盖

- kp-1: 3 题 / 2 个证据块 / 2 种角色
- kp-2: 3 题 / 1 个证据块 / 1 种角色
- kp-3: 3 题 / 1 个证据块 / 1 种角色
- kp-4: 3 题 / 2 个证据块 / 1 种角色
- kp-5: 3 题 / 3 个证据块 / 1 种角色
- kp-6: 3 题 / 2 个证据块 / 2 种角色
- kp-7: 3 题 / 2 个证据块 / 1 种角色

## 实验记录草稿

- 本轮假设：
- Prompt 改动：
- 规则改动：
- 改善：
- 新问题：
- 下一轮：
