# 2026-07-03 App Store 静态页面打包器证据

## 背景

App Store Connect 需要公开可访问的 Privacy Policy URL 和 Support URL。仓库已有 `docs/privacy-policy.html` 和 `docs/support.html`，但直接把整个仓库或 docs 目录部署出去容易混入无关文件。新增静态页面打包器，只把上架需要的公开页面整理到 `.release/app-store-static-site/`。

## 本次新增

- `tools/app-store-build-static-site.mjs`
- `npm run app-store:build-static-site`

## 用法

正式打包：

```bash
npm run app-store:build-static-site
```

生成目录：

```text
.release/app-store-static-site/
```

包含：

- `index.html`
- `privacy/index.html`
- `support/index.html`
- `privacy-policy.html`
- `support.html`
- `README.md`

## 安全规则

默认情况下，脚本会先运行：

```bash
node tools/app-store-static-pages-audit.mjs
```

只有公开页面 gate 通过时才会生成正式包。也就是说，仍有 `待补充`、缺少真实支持邮箱、旧品牌或调试文案时，正式打包会失败。

如需预览目录结构，可以使用：

```bash
npm run app-store:build-static-site -- --allow-not-ready
```

预览包不能提交给 App Store Connect。

## 验证记录

语法检查：

```bash
node --check tools/app-store-build-static-site.mjs
```

结果：通过。

当前正式打包：

```bash
npm run app-store:build-static-site -- --dry-run
```

结果：正确失败，因为公开页面还缺真实支持邮箱。

预览打包：

```bash
npm run app-store:build-static-site -- --allow-not-ready --output /tmp/recallo-static-site-preview
```

结果：通过，生成预览目录；脚本明确输出 warning，不能作为正式提交页面。

## 下一步

用户提供正式支持邮箱、Privacy Policy URL 和 Support URL 后：

```bash
npm run app-store:apply-contact -- <联系信息 JSON 文件>
npm run check:app-store-static-pages
npm run app-store:build-static-site
```

然后把 `.release/app-store-static-site/` 部署到公开 HTTPS 静态托管，并把最终 URL 回写 App Store 元数据和审核包。
