# App Store 用户行动报告工具记录

日期：2026-07-03

## 本次完成

新增只读报告命令：

```bash
npm run app-store:user-actions
```

用途：

- 读取 `docs/app-store-user-decision-form-zh.md`。
- 按决策表章节分组展示仍由用户负责填写/确认的事项。
- 输出总字段数、已填写字段数、缺失字段数。
- 输出 Codex 在用户补齐信息后的自动回写与验证动作。
- 输出 JSON summary，方便后续自动化读取。

## 当前运行结果

- 总字段数：26
- 已填写字段数：4
- 缺失字段数：22
- 当前 `ready`：`false`

当前缺失项仍集中在：

- 产品与商业化决策。
- 账号与数据恢复决策。
- 支持邮箱、Privacy Policy URL、Support URL。
- App Store 元数据最终字段。
- 真机验收、截图、Archive 和 App Store Connect 手动确认。

## 后续使用方式

用户填完决策表或提供 URL/邮箱后，Codex 运行：

```bash
npm run app-store:user-actions
npm run app-store:decision-report
npm run check:app-store-submit:report
```

若用户行动报告和决策表报告均无缺失，再执行文档回写、严格提交检查和 Archive 前检查。
