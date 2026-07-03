# App Store 决策表解析工具记录

日期：2026-07-02

## 本次完成

新增只读解析工具：

```bash
npm run app-store:decision-report
```

用途：

- 读取 `docs/app-store-user-decision-form-zh.md`。
- 解析所有包含“最终选择 / 最终值 / 最终状态”的表格行。
- 输出总字段数、已填写字段数、缺失字段数。
- 输出 JSON summary，方便后续 Codex 根据决策表自动回写 App Store 文档。

## 当前预期状态

当前决策表尚未填写，因此该工具会报告大量 `待填写` 字段。这不是失败，而是帮助用户和 Codex 明确还缺哪些最终信息。

本次运行结果：

- 总字段数：26
- 已填写字段数：4
- 缺失字段数：22
- 当前 `ready`：`false`

## 后续使用方式

用户填完决策表后，Codex 运行：

```bash
npm run app-store:decision-report
npm run check:app-store-submit
```

如果决策表报告 `ready: true`，再执行文档回写和最终提交前检查。
