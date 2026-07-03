# 2026-07-03 App Store 公开页面门禁证据

## 背景

App Store Connect 需要 Privacy Policy URL 和 Support URL。当前仓库已经有 `docs/privacy-policy.html` 和 `docs/support.html`，但在用户提供正式邮箱和公开 HTTPS URL 前，仍需要一个本地页面质量 gate，避免页面托管后才发现旧品牌、占位符或关键隐私内容缺失。

## 本次新增

- `tools/app-store-static-pages-audit.mjs`
- `npm run app-store:static-pages-audit`
- `npm run check:app-store-static-pages`
- `npm run app-store:status` 已纳入公开页面报告。

## 门禁规则

脚本会检查：

- `docs/privacy-policy.html`
- `docs/support.html`
- `docs/privacy-policy-zh.md`
- `docs/support-zh.md`

检查内容：

- 页面标题和品牌为 Recallo。
- 不出现旧品牌“拾贝”、`ShiBei`、`Shibei`。
- 不出现 `fixture`、`Railway`、`JSON decode`、`Application failed to respond` 等调试或错误文案。
- 不出现 `待补充`、`待部署`、`待公开`、`example.com` 等占位符。
- HTML 是完整页面，包含 viewport meta。
- 支持页链接到本地 `privacy-policy.html`。
- 隐私政策包含收集信息、第三方 AI 模型处理、匿名设备身份、数据保存和删除、额度、防滥用、通知、追踪和联系方式。
- 支持页包含联系支持建议、常见问题、删除数据、关闭通知和隐私政策。
- 页面内包含真实支持邮箱。

## 当前验证

语法检查：

```bash
node --check tools/app-store-static-pages-audit.mjs
```

结果：通过。

Report 模式：

```bash
npm run app-store:static-pages-audit
```

预期：在用户未提供正式支持邮箱前，输出 NOT READY，明确指出 `待补充` 和缺少真实邮箱。

Strict 模式：

```bash
npm run check:app-store-static-pages
```

预期：用户提供真实支持邮箱并运行 `npm run app-store:apply-contact` 后通过。

## 下一步

用户提供支持邮箱、Privacy Policy URL 和 Support URL 后，Codex 先运行：

```bash
npm run app-store:apply-contact -- <联系信息 JSON 文件> --dry-run
npm run app-store:apply-contact -- <联系信息 JSON 文件>
npm run check:app-store-static-pages
```

公开页面 gate 通过后，再部署 HTML 并把最终 URL 写入 App Store 元数据和审核包。
