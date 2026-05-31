# 测试结果目录

这个目录保存机器生成结果、人工评分表和分析报告。

## 文件类型

```text
<run>.json                  机器批量生成结果
<run>.auto-review.csv       AI 预标注表，仅用于辅助审查
<run>.manual-review.csv     人工评分表
<run>.manual-analysis.md    人工评分分析报告
<run>.manual-summary.json   人工评分结构化汇总
archive/                    中间调试结果归档
```

## 机器结果

运行：

```bash
npm --prefix backend run quality:test
```

会生成：

```text
results/<timestamp>.json
```

结果包含：

- `config`：运行参数。
- `summary`：成功率、覆盖率、低置信题比例、issue 频次等总体统计。
- `reviewRows`：人工评分用题目级摘要，包含题目字段、知识点结构字段，以及 `trustDiagnostics`、`confidenceReasons`、`blockingReasons` 可信度诊断字段。
- `results`：每篇样本完整生成结果和调试信息。

## 人工评分

复制 `reviewRows` 到 CSV，或使用：

```text
manual-review-template.csv
```

推荐命名：

```text
<run>.manual-review.csv
```

评分后运行：

```bash
npm --prefix backend run quality:analyze -- quality-test-set/results/<run>.json quality-test-set/results/<run>.manual-review.csv
```

会生成：

```text
<run>.manual-analysis.md
<run>.manual-summary.json
```

## 质量工作台结果

`demo/quality-review.html` 会把单篇文章的工作台结果写入同一目录：

```text
quality-workbench-<timestamp>.json
quality-workbench-<timestamp>.auto-review.csv
quality-workbench-<timestamp>.manual-review.csv
```

其中 `auto-review.csv` 包含 `ai_*` 预标字段和机器可信度诊断，只能用于排序和初筛；`manual-review.csv` 只有在页面中确认或修改后，才会写入 `human_*`、`human_verified` 和 `review_decision`。后续训练或正式统计只能使用 `human_verified=true` 的行。

## 单篇固定基准

批量 baseline 之外，可以保留少量单篇诊断文档，用来追踪某一类问题的多轮迭代。单篇基准不计入 `quality:test` 默认样本，也不替代批量回归。

运行单篇实验：

```bash
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw \
QUALITY_EXPERIMENT_SLUG=UMr6ia1QubqOMw3aBUGbOw \
QUALITY_EXPERIMENT_LABEL=v3-type-diversity \
npm --prefix backend run quality:single
```

输出目录：

```text
single-article/<slug>/README.md       单篇实验报告，只写关键结论
single-article/<slug>/runs/           每轮脱敏 JSON，保留知识点、题目和诊断
single-article/<slug>/reviews/        每轮人工审查 CSV
single-article/<slug>/analysis/       每轮机器分析草稿
single-article/<slug>/raw/            本地原始调试包，gitignored，不提交
```

当前固定单篇：

```text
single-article/UMr6ia1QubqOMw3aBUGbOw/README.md
```

用途：观察“知识点完整性、每知识点 1-3 题覆盖、补题效果、质量过滤误杀”在同一篇微信文章上的迭代变化。每轮改动后，先运行 `quality:single` 保存 JSON / CSV / analysis，再把关键指标追加到 `README.md` 的对比表。

## 归档规则

- 根目录只保留关键 baseline、最新人工审查和必要模板。
- 中间调试 JSON 移入 `archive/`。
- 一次质量规则或 prompt 改动前后，必须保留对应的 before / after 结果。
- 如果某次运行使用了非 baseline 样本，应在文件名中体现，例如 `synthetic`、`local`、`single`。

## 对比口径

每轮分析至少回答：

- 人工可用率是否提升。
- 严重问题比例是否下降。
- 来源不支撑、答案不唯一、解释错误是否变少。
- 低置信题的人工 reject 率是否可接受。
- 机器高分但人工 reject 的题是否变少。
- 下一轮只应该优先改哪一类问题。
