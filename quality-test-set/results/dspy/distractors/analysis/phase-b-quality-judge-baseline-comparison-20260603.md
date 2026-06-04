# DSPy Phase B Quality Judge Baseline 对比

日期：2026-06-03

本轮目标不是优化生产出题 prompt，而是验证一个独立的 `DistractorQualityJudge` 是否能学会我们人工确认的干扰项质量标准。

## 数据集

输入文件：

- `datasets/dspy-distractor-quality-judge-devtest.v1.jsonl`

数据构成：

| 来源 | 数量 | 用途 |
| --- | ---: | --- |
| Hook Phase A clean set | 21 | few-shot 示例池和 Hook 口径回归 |
| 非 Hook 正样本 | 18 | 检查好干扰项是否能跨文章识别 |
| 非 Hook 负样本 / 可修样本 | 18 | 检查坏项、可修项和多选风险 |

最终 gold label 只使用人工 `review_status`：

| Label | 数量 |
| --- | ---: |
| accept | 34 |
| fixable | 10 |
| reject | 13 |

## Baseline 结果

| 模式 | Label accuracy | Issue exact | Avg score | 主要现象 |
| --- | ---: | ---: | ---: | --- |
| zero-shot | 38.6% | 15.8% | 0.340 | 大量把 accept 判成 reject |
| few-shot | 38.6% | 15.8% | 0.340 | 与 zero-shot 基本一致，没有迁移收益 |

few-shot 没有明显改善，说明当前问题不适合直接进入 DSPy optimizer。更可能是任务定义、示例呈现或 metric 口径还没有把“拾贝认可的干扰项标准”表达清楚。

## 混淆矩阵

zero-shot 与 few-shot 的核心混淆一致：

| Gold \ Pred | accept | fixable | reject |
| --- | ---: | ---: | ---: |
| accept | 12 | 0 | 22 |
| fixable | 2 | 0 | 8 |
| reject | 3 | 0 | 10 |

关键结论：

- `accept` 被大量误杀：34 条好项里只有 12 条被判断为 accept。
- `fixable` 完全没有学会：10 条全部被折叠到 accept / reject。
- `reject` 识别相对较好，但仍有 3 条高风险 `reject -> accept`。

## 第一性原理分析

干扰项的目的不是“让用户猜不出来”，而是帮助用户分清知识边界。一个干扰项可以明显是错的，只要它错在真实边界上，仍然可能有复习价值。

当前 baseline 明显把“迷惑性”理解得过窄：

- 它过度惩罚明显错误项，认为“太容易排除”就没有价值。
- 它没有理解产品里的轻量复习心智：手机题卡允许部分干扰项较直接，只要能提示边界。
- 它对“相邻但错误”和“近似正确”区分不稳。
- 它没有学会 `fixable` 是软标签：表示方向可用但表达需要修，不是纯 reject。

## 典型误判

### 1. 把可接受干扰项误判为 reject

例子：

- `在Prompt中强调多次`
- `手动格式化`
- `继续手动检查`
- `PM岗位完全消失，被AI取代`
- `工龄和经验`

这些项看起来不一定强迷惑，但它们能帮助用户分清“靠自然语言补充”与“工程化控制”、“旧岗位定义”与“岗位消失”、“判断力”与“资历经验”。在拾贝的轻量复习场景里，这类项可以接受。

### 2. 把近似正确项误判为 accept

例子：

- `PM岗位还在，只是旧的信息传递型 PM 会失去价值`
- `主要靠同步进度和转述材料工作的人`
- `产品取舍能力`

这些项的问题不是“不够迷惑”，而是太接近正确答案，容易成为第二正确答案。此类错误比误杀明显错项更危险，因为它会破坏单选题的唯一性。

### 3. `fixable` 没有被建模

模型把 `fixable` 当作“不够好所以 reject”或“方向对所以 accept”。但我们的真实口径是：

- `accept`：当前就能进入题组。
- `fixable`：方向有用，但表达、边界或学习价值需要改。
- `reject`：会造成多选风险、无关、离谱或无法修成有价值干扰项。

这说明下一轮不应继续追准确率，而要先让判断器理解三段式标签。

## 结论

本轮不进入 DSPy optimizer。

原因：

1. few-shot 没有优于 zero-shot，说明示例没有被有效迁移。
2. 高风险 `reject -> accept` 仍存在，直接优化会放大“第二正确答案”风险。
3. `fixable` 完全没学会，metric 当前无法支撑 rewrite 队列判断。

## 下一步

先修 Phase B 的任务定义和评估结构，再跑新的 baseline。

建议顺序：

1. 增加 prompt / demo inspection，确认 few-shot 示例是否真的进入 DSPy 调用上下文。
2. 把 Judge 拆成更符合人工判断的三步：
   - 是否近似正确答案，存在多选风险？如果是，直接 `reject`。
   - 是否和题干、知识点同语境且明确错误？如果是，再判断 `accept / fixable`。
   - 如果方向有价值但太泛、太极端、太粗糙，标为 `fixable`。
3. 重新定义 metric：`reject -> accept` 权重最高，`accept -> reject` 次之，`fixable` 允许作为软边界单独统计。
4. 跑 `v2` baseline，再决定是否进入 `BootstrapFewShot`。

关联产物：

- `baselines/phase-b-quality-judge-zero-shot-20260603-065654.json`
- `baselines/phase-b-quality-judge-few-shot-20260603-065654.json`
- `analysis/phase-b-quality-judge-baseline-zero-shot-20260603-065654.md`
- `analysis/phase-b-quality-judge-baseline-few-shot-20260603-065654.md`
