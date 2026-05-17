# 测试结果目录

运行 `npm.cmd --prefix backend run quality:test` 后，脚本会在这里生成带时间戳的 JSON 文件。

当前显眼位置只保留最新关键 baseline：

```text
2026-05-16-032253.json
```

旧的中间调试结果已移到：

```text
archive/
```

每个结果文件通常包含：

- `summary`：总体统计。
- `results`：每个样本的生成状态、章节、知识点、题目和质量评分。
- `reviewRows`：便于人工评分时复制到表格的题目级摘要。

人工评分可以使用：

```text
../manual-scoring-template.md
manual-review-template.csv
```
