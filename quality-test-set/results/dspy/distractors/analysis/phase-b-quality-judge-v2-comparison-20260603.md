# DSPy Phase B v2 Quality Judge 对比报告

日期：2026-06-03

本轮只验证实验室里的 `DistractorQualityJudge`，不改生产出题系统、不改生产 prompt、不跑 optimizer。

## v2 改动

v1 的主要问题不是缺少 optimizer，而是 Judge 看到的信息不够完整，判断顺序也不符合人工标准。因此 v2 做了两件事：

- 数据输入补齐题目上下文：`correct_understanding`、`common_misconception`、`explanation`、`memory_angle`、`all_options_with_ids`、`correct_option_id`。
- Signature 改成分层判断：先判断是否近似正确答案 / 多选风险，再判断是否同语境，最后判断 `accept / fixable / reject`。

v2 数据集：

- `datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
- 总数：57 条。
- Gold label：`accept 34 / fixable 10 / reject 13`。
- 来源：Hook Phase A 21 条，非 Hook 正样本 18 条，非 Hook 负样本 / 可修样本 18 条。
- 缺失上下文字段：36 条非 Hook 样本缺少 `explanation` 和 `memory_angle`，已用 `missing_context_fields` 显式标记。

## v1 -> v2 指标对比

| 版本 | 模式 | Label accuracy | Issue exact | Avg score | Fixable recall | Hard failures |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| v1 | zero-shot | 38.6% | 15.8% | 0.340 | 0.0% | 未单独统计 |
| v1 | few-shot | 38.6% | 15.8% | 0.340 | 0.0% | 未单独统计 |
| v2 | zero-shot | 64.9% | 33.3% | 0.586 | 10.0% | 7 |
| v2 | few-shot | 66.7% | 33.3% | 0.600 | 20.0% | 7 |

v2 的改动是有效的：整体标签准确率从 38.6% 提升到 66.7%，`accept` 样本不再被大面积误杀，`fixable` 也开始被少量识别。

但 v2 仍不能进入 optimizer，因为最重要的硬失败没有下降到可接受范围。

## v2 few-shot 细分结果

| 维度 | 结果 |
| --- | ---: |
| 总体 label accuracy | 66.7% |
| accept accuracy | 85.3% |
| reject accuracy | 53.8% |
| fixable recall | 20.0% |
| hard failures | 7 |
| over-strict errors | 5 |
| second-correct risk errors | 4 |

按来源：

| 来源 | 数量 | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| Hook Phase A | 21 | 57.1% | 0.476 |
| 非 Hook 正样本 | 18 | 88.9% | 0.889 |
| 非 Hook 负样本 / 可修样本 | 18 | 55.6% | 0.456 |

## 主要问题

### 1. 第二正确答案风险仍是 P0

v2 仍会把近似正确答案判成 `accept`，这是最危险的问题，因为它会破坏单选题唯一性。

典型样本：

- `PM岗位还在，只是旧的信息传递型 PM 会失去价值`
- `主要靠同步进度和转述材料工作的人`
- `产品取舍能力`

这些不是“好干扰项”，而是正确答案或正确答案的近义展开。v2 的输出虽然增加了 `is_correct_equivalent` / `has_multiselect_risk` 字段，但模型仍经常嘴上说没有风险，实际放行。

### 2. fixable 仍没有稳定建模

v1 完全识别不了 `fixable`，v2 few-shot 提升到 20%，但仍远远不够。

这说明模型仍在二分化理解干扰项：

- 要么“有边界价值，所以 accept”。
- 要么“不够好，所以 reject”。

它还没有稳定学会：`fixable` 是方向有用、但表达太泛 / 太极端 / 太弱 / 需贴近题干的软标签。

### 3. 对轻量复习的“明显错误项”仍偏保守

v2 大幅减少了过严误杀，但仍会把一些人工认可的轻量边界项判为 `reject`。

典型样本：

- `手动格式化`
- `Hook技术太复杂`
- `代码能力`

这类项不一定强迷惑，但在手机轻量复习场景里，如果它们能提示真实边界，就可以接受。Judge 仍有“干扰项必须强迷惑”的倾向。

### 4. few-shot 有轻微提升，但迁移收益不强

few-shot 比 zero-shot 只提升约 1.8 个百分点。脚本确认 compiled program 中确实有 9 条 demos，但 `dspy.inspect_history()` 没有在最终历史里展开 demo 内容。因此当前只能判断“demos 存在”，不能仅凭 history 证明示例呈现完全符合预期。

## 结论

v2 证明“补上下文 + 分层判断”方向正确，但还不是 optimizer 阶段。

当前如果直接跑 `BootstrapFewShot` / `MIPROv2`，很可能会把错误口径优化得更稳定：尤其是把第二正确答案当成好干扰项，或者把 `fixable` 继续折叠成 `accept`。

## 下一步

进入 Phase B v3，但仍不进 optimizer。

v3 只修 Judge 的两个核心失败：

1. **正确等价 / 多选风险检测前置为硬门槛**
   - 让模型先输出候选项与正确答案的关系类型：`same_meaning`、`near_correct_boundary`、`different_but_same_context`、`unrelated`。
   - 只有 `different_but_same_context` 才允许进入 `accept / fixable` 判断。

2. **fixable 定义成独立路径**
   - `accept`：当前可直接进题组。
   - `fixable`：方向有用，但表达、边界或学习价值需要修。
   - `reject`：正确等价、无关、离谱、低价值到不值得修。

v3 跑完后，如果 hard failures 明显下降，并且 `fixable` recall 至少达到 40%，再考虑 `BootstrapFewShot`。否则继续修 Signature / metric，不进入 optimizer。

## 关联产物

- `datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
- `baselines/phase-b-quality-judge-zero-shot-20260603-072801.json`
- `baselines/phase-b-quality-judge-few-shot-20260603-072801.json`
- `analysis/phase-b-quality-judge-baseline-zero-shot-20260603-072801.md`
- `analysis/phase-b-quality-judge-baseline-few-shot-20260603-072801.md`
