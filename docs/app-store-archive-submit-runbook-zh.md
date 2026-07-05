# Recallo Archive 与 App Store Connect 提交 Runbook

> 本 runbook 用于把已经通过验收的 Recallo 候选版本上传到 App Store Connect。所有 Xcode / App Store Connect 点击操作由用户执行；Codex 负责提交前检查、陪跑、记录证据和排查失败。

## 1. 提交前必须满足

- [ ] `docs/app-store-release-evidence/production-acceptance-template.md` 已复制为本次候选包验收记录。
- [ ] 真机验收没有 P0。
- [ ] 真机验收没有未豁免 P1。
- [ ] `npm run check:release-ios` 通过。
- [ ] `npm run check` 通过。
- [ ] iOS Release build 通过。
- [ ] Production `/api/health` 正常。
- [x] Support URL 已确定：https://shibei-production.up.railway.app/support
- [x] Privacy URL 已确定并可公开访问：https://shibei-production.up.railway.app/privacy
- [ ] App Store Connect 截图已按 `screenshots-checklist.md` 准备。

## 2. Codex 可先执行的检查

在官方工作区：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
git status --short
git log -1 --oneline
npm run check:release-ios
npm run check
npm run check:app-store-health
npm run check:app-store-static-pages
npm run app-store:create-acceptance -- --dry-run
npm run check:app-store-submit:report
npm run app-store:create-connect-copy-pack -- --dry-run
npm run app-store:acceptance-audit -- docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md
curl -s https://shibei-production.up.railway.app/api/health
```

必须确认：

- 工作区是 `/Users/hanmingyu/Downloads/拾贝-prod-hardening`。
- Xcode project 是 `拾贝/拾贝.xcodeproj`，scheme 是 `Recallo`。
- Product name / display name 是 `Recallo`。
- Bundle ID 仍是 `com.maxhan.shibei`，用于替换旧 TestFlight 并沿用推送配置。
- Release 默认 API 是 production。
- 没有旧工程、fixture、Railway、JSON decode 等可见阻塞文案。
- `npm run check:app-store-submit` 在最终提交前通过；如果 report 模式仍显示 NOT READY，说明还有用户决策、邮箱或 URL 没有收口。
- `npm run app-store:create-acceptance` 已为本次候选包生成验收记录，且用户已填完真机结果。
- `npm run app-store:create-connect-copy-pack` 已生成无 blocker 的最终 App Store Connect 粘贴包。

## 3. 用户 Xcode Archive 步骤

1. 打开官方工程：
   `/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj`
2. 确认 Xcode 顶部：
   - Scheme：`Recallo`
   - Destination：`Any iOS Device (arm64)`
3. 打开项目 Target，确认：
   - Display Name：`Recallo`
   - Bundle Identifier：`com.maxhan.shibei`
   - App Icon：新 Recallo 图标
   - Push Notifications capability 开启
4. Product > Clean Build Folder。
5. Product > Archive。
6. Archive 完成后，在 Organizer 里确认：
   - App 名称：`Recallo`
   - 图标是新图标
   - Version / Build number 正确
   - Team / Signing profile 正确
7. Distribute App。
8. 选择 App Store Connect。
9. 选择 Upload。
10. 保持默认自动签名或按 Xcode 推荐签名。
11. 上传成功后，记录上传时间和 build number。

如果 Archive 里仍显示旧名称或旧图标，立即停止，不要上传。

Archive / Upload 完成后，在官方工作区生成证据记录：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-archive-evidence -- \
  --ios-build-number <Xcode Organizer 里的 build number> \
  --version <Xcode Organizer 里的 version> \
  --archive-result PASS \
  --upload-result PASS \
  --organizer-app-name Recallo \
  --organizer-bundle-id com.maxhan.shibei \
  --organizer-icon-confirmed yes \
  --app-store-connect-build <App Store Connect 里的 build 标识或编号> \
  --archive-time "YYYY-MM-DD HH:mm timezone" \
  --upload-time "YYYY-MM-DD HH:mm timezone"
```

该命令会自动补入当前 git commit、branch、官方 Xcode project、scheme、production URL 和 Railway deployment id。不要把 `unknown`、`TBD`、`待补充` 这类占位值写进证据；还没拿到 App Store Connect build 时，可以先不传 `--app-store-connect-build`，等处理完成后重新生成或手动补充。

## 4. App Store Connect 操作

1. 打开 App Store Connect。
2. 进入现有 `com.maxhan.shibei` 对应 App，确保是在替换旧 TestFlight 产品，不是创建新 App。
3. 等待刚上传的 build 处理完成。
4. 选择该 build。
5. 在官方工作区生成最终粘贴包：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-connect-copy-pack
```

确认生成文件的 `Blockers` 为空，再从该文件复制 App Store Connect 字段。

6. 填写 App Information：
   - Name：`Recallo`
   - Subtitle：见 `docs/app-store-metadata-zh.md`
   - Category：Education
7. 填写 App Privacy：
   - 参考 `docs/app-store-review-submission-pack-zh.md` 第 4 节。
   - 必须与 `docs/privacy-policy-zh.md` 一致。
8. 上传截图：
   - 参考 `docs/app-store-release-evidence/screenshots-checklist.md`
   - 截图必须来自正确 Recallo build。
9. 填写年龄分级：
   - 参考 `docs/app-store-metadata-zh.md` 年龄分级建议。
10. 填写 Review Notes：
   - 参考 `docs/app-store-review-submission-pack-zh.md`
11. 填写 Support URL 和 Privacy URL。
12. 提交审核。

## 5. 提交后记录

把以下信息写回 `docs/app-store-release-readiness-plan-zh.md` 或本次验收记录：

| 字段 | 值 |
| --- | --- |
| 提交时间 |  |
| Git commit |  |
| Branch |  |
| iOS build number |  |
| App Store Connect build |  |
| Railway deployment id |  |
| App Review 状态 | Waiting for Review / In Review / Rejected / Approved |
| Support URL | https://shibei-production.up.railway.app/support |
| Privacy URL | https://shibei-production.up.railway.app/privacy |

优先用 `npm run app-store:create-archive-evidence` 生成 `docs/app-store-release-evidence/YYYY-MM-DD-build-<build-number>-archive.md`，再把关键信息同步回本文档或真机验收记录。

## 6. 常见停止条件

遇到以下任一情况，停止提交：

- Xcode 打开的不是 `/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj`。
- Scheme 不是 `Recallo`。
- Archive 显示旧 App 名或旧图标。
- Preflight 失败。
- 真机验收仍有 P0/P1。
- 隐私政策 URL 无法公开访问。
- App Privacy 标签和隐私政策不一致。
- 上传后 App Store Connect 选择的是错误 build。
