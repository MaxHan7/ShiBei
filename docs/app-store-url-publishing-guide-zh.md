# Recallo App Store URL 发布说明

更新日期：2026 年 7 月 2 日

## 目标

App Store Connect 需要两个公开可访问 URL：

- Privacy Policy URL：隐私政策页面。
- Support URL：用户支持页面。

当前仓库已经准备好静态页面：

- `docs/privacy-policy.html`
- `docs/support.html`

这两个页面可以部署到任意稳定的 HTTPS 静态托管地址。提交审核前，最终 URL 必须可以在未登录状态下打开。

正式部署前，推荐先生成只包含公开页面的静态站包：

```bash
npm run app-store:build-static-site
```

输出目录：

```text
.release/app-store-static-site/
```

该命令会先运行公开页面 gate。支持邮箱或 URL 仍是占位符时，正式打包会失败，避免把未完成页面部署出去。

## 用户需要提供或确认

| 项目 | 当前状态 | 用户需要做什么 |
| --- | --- | --- |
| 支持邮箱 | `mingyuhan0814@gmail.com` | 已提供，Codex 可同步回写 |
| Privacy Policy URL | https://shibei-production.up.railway.app/privacy | 已提供，提交前需确认公开可访问 |
| Support URL | https://shibei-production.up.railway.app/support | 已提供，提交前需确认公开可访问 |

## 推荐托管方式

### 方案 A：用现有官网或域名

如果已经有 Recallo 官网或个人域名，推荐把两个页面部署为：

```text
https://your-domain.com/recallo/privacy
https://your-domain.com/recallo/support
```

优点：

- 最像正式产品。
- 后续可以持续更新，不依赖仓库公开状态。
- App Store 审核和用户访问都更稳定。

### 方案 B：GitHub Pages

如果仓库可以公开，或者你愿意单独建一个公开静态页面仓库，可以用 GitHub Pages。

建议路径：

```text
https://<github-user>.github.io/<repo>/privacy-policy.html
https://<github-user>.github.io/<repo>/support.html
```

注意：

- 页面必须无需登录即可访问。
- 如果主仓库包含不适合公开的内容，不建议直接开启主仓库 Pages。

### 方案 C：Vercel / Netlify 静态站

也可以把 `docs/privacy-policy.html` 和 `docs/support.html` 部署到 Vercel 或 Netlify。

优点：

- 操作快。
- 默认 HTTPS。
- 可以绑定自定义域名。

注意：

- 不要上传 `.env`、token、数据库备份或任何私密文件。
- 只部署这两个静态页面或 `.release/app-store-static-site/` 独立静态站目录。

推荐公开路径：

```text
https://your-domain.com/privacy/
https://your-domain.com/support/
```

## 部署后 Codex 要回写的位置

用户提供最终 URL 后，Codex 需要同步更新：

- `docs/app-store-metadata-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-user-action-checklist-zh.md`
- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/support-zh.md`
- `docs/support.html`
- `docs/app-store-release-readiness-plan-zh.md`

## 提交审核前检查

提交 App Store 审核前必须确认：

- 两个 URL 都是 HTTPS。
- 两个 URL 在无登录、无内网、无 VPN 情况下可访问。
- 支持页里不再出现“待补充”。
- 隐私政策里不再出现“邮箱：待补充”。
- App Store Connect 的 Support URL / Privacy URL 与文档记录一致。
