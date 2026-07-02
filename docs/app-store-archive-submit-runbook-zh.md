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
- [ ] Support URL 已确定。
- [ ] Privacy URL 已确定并可公开访问。
- [ ] App Store Connect 截图已按 `screenshots-checklist.md` 准备。

## 2. Codex 可先执行的检查

在官方工作区：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
git status --short
git log -1 --oneline
npm run check:release-ios
npm run check
npm run check:app-store-submit:report
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

## 4. App Store Connect 操作

1. 打开 App Store Connect。
2. 进入现有 `com.maxhan.shibei` 对应 App，确保是在替换旧 TestFlight 产品，不是创建新 App。
3. 等待刚上传的 build 处理完成。
4. 选择该 build。
5. 填写 App Information：
   - Name：`Recallo`
   - Subtitle：见 `docs/app-store-metadata-zh.md`
   - Category：Education
6. 填写 App Privacy：
   - 参考 `docs/app-store-review-submission-pack-zh.md` 第 4 节。
   - 必须与 `docs/privacy-policy-zh.md` 一致。
7. 上传截图：
   - 参考 `docs/app-store-release-evidence/screenshots-checklist.md`
   - 截图必须来自正确 Recallo build。
8. 填写年龄分级：
   - 参考 `docs/app-store-metadata-zh.md` 年龄分级建议。
9. 填写 Review Notes：
   - 参考 `docs/app-store-review-submission-pack-zh.md`
10. 填写 Support URL 和 Privacy URL。
11. 提交审核。

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
| Support URL |  |
| Privacy URL |  |

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
