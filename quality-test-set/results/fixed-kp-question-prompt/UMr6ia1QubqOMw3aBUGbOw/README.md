# 固定知识点题目 Prompt 对比实验：UMr6ia1QubqOMw3aBUGbOw

## 目标

固定 v26 已确认质量较好的知识点，只比较题目生成 prompt。这样可以避免知识点提取变化污染题目 prompt 实验。

## 固定输入

- 固定知识点来源：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260604-022023-v26-prd-field-standard-lean-prompt.json`
- 固定知识点数量：8
- 文章链接：`https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw`

## 2026-06-04：v26 Control

产物：

- JSON：`runs/20260604-075909-v26-control-fixed-kp.json`
- CSV：`reviews/20260604-075909-v26-control-fixed-kp.csv`
- 分析：`analysis/20260604-075909-v26-control-fixed-kp.md`

指标：

- 入池题数：7
- 评估题数：9
- 覆盖知识点：7 / 8
- 平均每知识点题数：0.9

结论：

这次 control 明显低于原始 v26 的 20 道入池题。问题主要发生在模型生成阶段，而不是后处理误杀。

## 2026-06-04：v26 Control Repeat

产物：

- JSON：`runs/20260604-080132-v26-control-fixed-kp-r2.json`
- CSV：`reviews/20260604-080132-v26-control-fixed-kp-r2.csv`
- 分析：`analysis/20260604-080132-v26-control-fixed-kp-r2.md`

指标：

- 入池题数：8
- 评估题数：8
- 覆盖知识点：8 / 8
- 平均每知识点题数：1.0

结论：

第二次 control 仍然几乎每个知识点只生成 1 道题，说明 fixed-KP 一次性输入 8 个知识点的实验链路不稳定，不能继续用于测试题干长度或选项长度 prompt。

## 当前判断

不要继续跑 `stem_soft_cap_only` 或 `option_length_balance_only`。下一步应该先改实验设计：新增 `per_point` 模式，每次只给模型一个固定知识点，再比较 v26 control 与最小 prompt 变体。
