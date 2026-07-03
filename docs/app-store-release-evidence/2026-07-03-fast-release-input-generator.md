# Recallo App Store Fast Release Input Generator

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-07-03 |
| 工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` |
| 脚本 | `tools/app-store-create-fast-release-inputs.mjs` |
| npm 入口 | `npm run app-store:create-fast-release-inputs` |
| 输出目录 | `.release/app-store-inputs/` |

## 目的

用户按 App Store 快速首版模板回复后，Codex 不再手工拼两份 JSON，而是通过脚本生成：

- `.release/app-store-inputs/decision-values.json`
- `.release/app-store-inputs/contact-values.json`

随后先执行 dry-run：

```bash
npm run app-store:apply-decisions -- .release/app-store-inputs/decision-values.json --dry-run
npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json --dry-run
```

dry-run 通过后再正式回写文档。

## 防错点

- 缺少支持邮箱、Privacy URL、Support URL、验收记录、P0/P1 状态、截图状态、Archive 确认或 App Store Connect 确认时，默认拒绝生成正式输入。
- 联系邮箱必须是邮箱格式。
- Privacy URL 和 Support URL 必须是 HTTPS URL。
- `.release/` 已加入 `.gitignore`，避免临时用户输入进入 Git 历史。

## 验证命令

```bash
node --check tools/app-store-create-fast-release-inputs.mjs
npm run app-store:create-fast-release-inputs -- --dry-run <完整字段>
npm run app-store:apply-decisions -- <生成的 decision-values.json> --dry-run
npm run app-store:apply-contact -- <生成的 contact-values.json> --dry-run
npm run check
```

## 本次验证结果

| 检查 | 结果 |
| --- | --- |
| `node --check tools/app-store-create-fast-release-inputs.mjs` | PASS |
| `node --check tools/app-store-create-user-handoff.mjs` | PASS |
| `npm run app-store:create-fast-release-inputs -- --dry-run <完整样例字段>` | PASS |
| 生成到 `/tmp/recallo-fast-release-inputs/` | PASS |
| `npm run app-store:apply-decisions -- /tmp/recallo-fast-release-inputs/decision-values.json --dry-run` | PASS，22 个可写决策字段匹配 |
| `npm run app-store:apply-contact -- /tmp/recallo-fast-release-inputs/contact-values.json --dry-run` | PASS，命中 9 份需回写文档 |
| `npm run app-store:create-user-handoff -- --force` | PASS，已刷新 `2026-07-03-user-handoff.md` |
| `npm run app-store:status` | PASS，当前仍因用户决策、URL、截图、真机验收阻塞 |
| `npm run check` | PASS，后端 204 tests passed，工作区 guard、iOS production guard、V2 UI guard 均通过 |
