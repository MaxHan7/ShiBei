# 2026-07-03 App Store 联系信息自动回写脚本证据

## 背景

App Store 提交前需要把支持邮箱、Privacy Policy URL、Support URL 同步写入多份材料。为了避免手工遗漏，新增联系信息自动回写脚本。

## 本次新增

- `docs/app-store-contact-values.example.json`
- `tools/app-store-apply-contact-info.mjs`
- `npm run app-store:apply-contact -- <联系信息 JSON 文件>`

脚本负责校验并同步：

- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/support-zh.md`
- `docs/support.html`
- `docs/app-store-metadata-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-user-action-checklist-zh.md`
- `docs/app-store-archive-submit-runbook-zh.md`
- `docs/app-store-url-publishing-guide-zh.md`

## 验证记录

语法检查：

```bash
node --check tools/app-store-apply-contact-info.mjs
```

结果：通过。

占位符输入拒绝：

```bash
npm run app-store:apply-contact -- docs/app-store-contact-values.example.json --dry-run
```

结果：失败，正确指出邮箱和两个 URL 仍为占位符。

完整临时输入 dry-run：

```bash
printf '%s' '{"supportEmail":"support@recallo.app","privacyPolicyUrl":"https://recallo.app/privacy","supportUrl":"https://recallo.app/support"}' \
  | npm run app-store:apply-contact -- - --dry-run
```

结果：通过，并列出 9 个将被同步更新的上架材料文件。

## 下一步

用户提供真实支持邮箱、Privacy Policy URL、Support URL 后，Codex 用该脚本执行 dry-run，确认无误后写入正式文档，并继续跑 `npm run check:app-store-submit`。

## 总体验证

本次变更后继续验证：

```bash
npm run app-store:status
npm run check:release-ios
npm run check
```

结果：

- `npm run app-store:status` 正常运行，当前仍因用户决策、截图、邮箱/URL 和真机验收未补齐而显示 NOT READY。
- `npm run check:release-ios` 通过。
- `npm run check` 通过，后端 204 个测试全部通过。
