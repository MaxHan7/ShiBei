# 拾贝题目质量测试集

这个目录用于验证“内容 -> 知识点 -> 题目 -> 解释 -> 复习”的核心生成质量。MVP 不只看接口是否跑通，还要看题目是否真的适合用户复习。

## 目录约定

```text
samples/            真实样本，只放用户真实可能添加的内容
synthetic-samples/  人工构造样本，用于回归、边界场景和 smoke test
results/            质量测试结果，显眼位置只保留最新关键 baseline
results/archive/    旧的中间调试结果
```

`quality:test` 默认只读取 `samples/`，不会读取 `synthetic-samples/`。

## 运行方式

在项目根目录运行：

```powershell
npm.cmd --prefix backend run quality:test
```

只跑单篇样本：

```powershell
$env:QUALITY_SAMPLE="wechat-OLsU21MsXlUtZlubVj5tkg"
npm.cmd --prefix backend run quality:test
```

## 当前关键 baseline

最新可用 baseline：

```text
quality-test-set/results/2026-05-16-032253.json
```

这次结果用于记录第一性原理出题 prompt 优化后的阶段性状态：单篇公众号样本成功生成，知识点覆盖率达到 100%，每个保留知识点至少 1 道题、最多 3 道题。

旧的中间调试 JSON 已归档到：

```text
quality-test-set/results/archive/
```

## 人工评分

人工评分模板：

```text
quality-test-set/manual-scoring-template.md
quality-test-set/results/manual-review-template.csv
```

优先检查：

1. 正确答案是否能被来源片段支撑。
2. 是否只有一个最合理答案。
3. 题目是否考理解，而不是原文填空。
4. 干扰项是否合理但明确错误。
5. 解释是否会误导用户。

如果出现严重问题，请在评分表里标记 `severe_issue = yes`，并记录原因。

## PRD 验收口径

单篇样本只有在 `questionCoverageRate = 100%` 时才算通过：每个最终保留知识点都必须至少有 1 道可入池题，每个知识点最多保留 3 道题。

总题数达标但存在无题知识点，仍视为未达到 PRD 标准。
