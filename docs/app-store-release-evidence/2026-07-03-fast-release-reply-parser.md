# Recallo App Store Fast Release Reply Parser

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-07-03 |
| 工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` |
| 脚本 | `tools/app-store-parse-fast-release-reply.mjs` |
| npm 入口 | `npm run app-store:parse-fast-release-reply` |
| 输出目录 | `.release/app-store-inputs/` |

## 目的

用户可以直接按 `docs/app-store-release-evidence/2026-07-03-user-handoff.md` 中的模板回复。Codex 将回复保存为临时文本后，运行：

```bash
npm run app-store:parse-fast-release-reply -- \
  --input <回复文本> \
  --acceptance-record <验收记录路径>
```

脚本会解析支持邮箱、Privacy URL、Support URL、额度、元数据、真机验收、截图、Archive 和 App Store Connect 确认，并委托 `tools/app-store-create-fast-release-inputs.mjs` 生成标准 JSON。

## 防错点

- 解析器只负责读取模板字段，最终 JSON 仍由 fast release input generator 生成。
- 缺少必填字段时，底层生成器默认拒绝继续。
- `--allow-pending` 仅用于生成无法通过正式 apply 的草稿。
- `--acceptance-record` 由 Codex 从验收记录生成器结果提供，避免用户手写路径。

## 验证命令

```bash
node --check tools/app-store-parse-fast-release-reply.mjs
npm run app-store:parse-fast-release-reply -- --input <样例回复> --acceptance-record <验收记录路径> --dry-run
npm run app-store:parse-fast-release-reply -- --input <样例回复> --acceptance-record <验收记录路径> --output-dir /tmp/recallo-fast-release-parsed
npm run app-store:apply-decisions -- /tmp/recallo-fast-release-parsed/decision-values.json --dry-run
npm run app-store:apply-contact -- /tmp/recallo-fast-release-parsed/contact-values.json --dry-run
```

## 本次验证结果

| 检查 | 结果 |
| --- | --- |
| `node --check tools/app-store-parse-fast-release-reply.mjs` | PASS |
| 样例回复解析 | PASS，成功提取邮箱、Privacy URL、Support URL、额度、元数据、截图、Archive/ASC 确认和 P0/P1 状态 |
| 委托 `tools/app-store-create-fast-release-inputs.mjs` 生成 `/tmp/recallo-fast-release-parsed/` | PASS |
| `npm run app-store:apply-decisions -- /tmp/recallo-fast-release-parsed/decision-values.json --dry-run` | PASS，22 个可写决策字段匹配 |
| `npm run app-store:apply-contact -- /tmp/recallo-fast-release-parsed/contact-values.json --dry-run` | PASS，命中 9 份需回写文档 |
| `npm run app-store:create-user-handoff -- --force` | PASS，已刷新 `2026-07-03-user-handoff.md` |
