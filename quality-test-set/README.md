# 拾贝出题质量测试集

这个目录是拾贝出题系统的长期评测资产，用来验证“内容 -> 知识点 -> 题目 -> 来源解释 -> 复习”的真实体验。它不是单纯的接口 smoke test，而是用于循环迭代 prompt、质量规则和来源定位策略的质量闭环。

## 目标

- 批量跑真实文章，观察生成稳定性。
- 输出机器统计，快速发现覆盖率、低置信题、来源支撑、答案唯一性等问题。
- 生成适合人工审查的题目级表格。
- 把人工评分回流成统计报告，指导下一轮只改一个主要问题。
- 固定 baseline 样本，避免“修好一篇、弄坏另一篇”。

## 目录约定

```text
samples/            真实样本，只放用户真实可能添加的内容，计入真实 baseline
synthetic-samples/  人工构造样本，只用于 smoke、边界和回归，不计入真实 baseline
results/            机器结果、人工评分和分析报告
results/archive/    旧的中间调试结果
```

`quality:test` 默认只读取 `samples/`。只有显式设置 `QUALITY_INCLUDE_SYNTHETIC=1` 才会读取人工构造样本。

## 样本分层

真实 baseline 需要逐步覆盖这些内容类型：

- AI / 大模型 / 产品观点文。
- 产品方法论、增长、设计、商业分析。
- 清单型文章、论证型文章、访谈整理、教程步骤。
- 长文、短文、结构松散的 HTML 页面。
- 用户真实可能收藏的笔记、视频摘要或社群内容。

阶段目标：

- v0：现有 5 篇真实样本。
- v1：扩展到 10 篇，能覆盖主要文章结构。
- v2：扩展到 20-30 篇，作为每轮质量规则调整前后的稳定 baseline。

## 运行命令

在项目根目录运行真实 baseline：

```bash
npm --prefix backend run quality:test
```

只跑单篇：

```bash
QUALITY_SAMPLE=wechat-OLsU21MsXlUtZlubVj5tkg npm --prefix backend run quality:test
```

限制样本数量：

```bash
QUALITY_LIMIT=3 npm --prefix backend run quality:test
```

同时跑人工构造样本：

```bash
QUALITY_INCLUDE_SYNTHETIC=1 npm --prefix backend run quality:test
```

指定输出文件名：

```bash
QUALITY_OUTPUT_BASENAME=2026-05-18-source-context npm --prefix backend run quality:test
```

## 机器结果

每次运行会在 `results/` 生成 JSON，包含：

- `config`：本次运行参数。
- `summary`：样本数、成功率、知识点数、入池题数、覆盖率、低置信题比例、机器 issue 频次。
- `reviewRows`：给人工评分用的题目级摘要。
- `results`：每篇样本的完整章节、知识点、题目和生成诊断。

重点看这些指标：

- `successRate`：章节生成成功率。
- `questionCoverageRate`：最终保留知识点的题目覆盖率。
- `lowConfidenceQuestionRate`：低置信题比例。
- `machineIssueCategoryFrequency`：机器问题类型分布。
- `averageQualityScore`：机器平均质量分，只作参考，不能替代人工审查。

## 人工审查流程

### 批量 baseline

1. 跑 `quality:test` 得到机器结果。
2. 从结果 JSON 的 `reviewRows` 复制到人工 CSV，或按 `results/manual-review-template.csv` 建表。
3. 至少审查 20 道题，优先审：
   - 低置信题。
   - 机器高分题。
   - 来源片段较短或看起来不相关的题。
   - 被机器拒绝但可能可修的题。
4. 每题标记 `human_status`：
   - `accept`：可直接进入复习。
   - `fixable`：方向对，但需要修 prompt / 规则 / 来源选择。
   - `reject`：不应进入复习池。
5. 每题填写 `primary_issue`，使用固定 taxonomy。
6. 跑人工汇总脚本生成分析报告。

### AI 预标质量工作台

本地启动后端后，可以打开：

```text
http://127.0.0.1:5173/quality-review.html
```

工作台用于单篇文章快速审查：

1. 输入文章链接或正文。
2. 点击“一键生成并预标注”。
3. 后端会生成章节、构建 `reviewRows`、调用模型写入 `ai_*` 预标字段。
4. 在页面中逐题检查 AI 标注，可以直接“确认 AI 标注”，也可以修改后保存。
5. 只有确认后的 `human_*` 字段和 `human_verified=true` 才进入正式人工评分。
6. 点击“导出 CSV”得到 `<run>.manual-review.csv` 对应结构。

AI 预标只能用于节省人工初筛时间，不能直接作为训练金标。训练候选必须满足 `human_verified=true`。

汇总命令：

```bash
npm --prefix backend run quality:analyze -- quality-test-set/results/<result>.json quality-test-set/results/<manual>.csv
```

脚本会生成：

```text
quality-test-set/results/<result>.manual-analysis.md
quality-test-set/results/<result>.manual-summary.json
```

## 问题类型 Taxonomy

人工评分和机器 issue 归类统一使用这些值：

| 类型 | 含义 |
| --- | --- |
| `source_not_supporting` | 来源片段无法支撑正确答案或解释 |
| `answer_not_unique` | 存在多个合理答案，或正确答案不唯一 |
| `explanation_wrong` | 解释错误、偷换概念或误导用户 |
| `too_shallow` | 题目只考复述、关键词或常识，复习价值低 |
| `weak_distractors` | 干扰项凑数、一眼排除、无真实误解 |
| `knowledge_point_off_target` | 知识点偏离文章核心或来源无法支撑知识点 |
| `coverage_gap` | 有知识点没有可用题，或文章核心覆盖不足 |
| `low_confidence_bad` | 低置信题误入池，人工认为不可用 |
| `source_context_bad` | 来源上下文过短、过长、位置不准或不利于回顾 |
| `structure_invalid` | 选项数量、答案 ID、JSON 结构等格式问题 |
| `generation_failed` | 模型、解析、抓取或生成流程失败 |
| `other` | 其它问题，必须在 notes 里解释 |

## 迭代规则

每一轮只改一个主要方向，例如：

- 来源支撑。
- 答案唯一性。
- 干扰项质量。
- 知识点覆盖。
- 低置信题入池规则。

每轮必须留下三类文件：

```text
results/<run>.json
results/<run>.manual-review.csv
results/<run>.manual-analysis.md
```

只有当同一批 baseline 的人工可用率不下降，且 P0 问题没有变多，才保留本轮改动。

P0 问题包括：

- 来源不支撑。
- 答案不唯一。
- 正确答案错误。
- 解释错误。
- 题目和来源无关。

## 当前关键 baseline

当前显眼位置保留的历史 baseline：

```text
quality-test-set/results/2026-05-16-032253.json
```

它记录第一性原理出题 prompt 优化后的阶段性状态。后续新增 baseline 时，应把中间调试结果移入 `results/archive/`，只保留最重要的对比节点。
