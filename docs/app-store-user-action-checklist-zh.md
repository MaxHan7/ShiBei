# Recallo App Store 上架用户手动事项清单

> 本文档只列必须由用户手动完成或拍板的事项。Codex 可自动执行的工程、文档、检查和记录工作不放在这里，避免混淆。

最短操作方式：先运行 `npm run app-store:create-user-handoff` 生成当前交接包；如果同意推荐路径，直接按交接包里的模板回复；如果要逐项拍板，则填写 `docs/app-store-user-decision-form-zh.md`。Codex 会优先运行 `npm run app-store:ingest-user-reply`，把你的模板回复解析成标准输入 JSON、dry-run 回写决策/联系信息、输出状态总览；确认无误后再用 `--apply` 把本清单、隐私政策、支持页、App Store 元数据和审核包同步收口。

如果你不确定某个字段应该填什么、去哪里找，直接看字段映射表：`docs/app-store-user-input-field-map-zh.md`。

可随时运行下面命令生成“还需要用户做什么”的完整交接包：

```bash
npm run app-store:create-user-handoff
```

交接包会写入 `docs/app-store-release-evidence/YYYY-MM-DD-user-handoff.md`，并包含当前状态摘要、用户待补字段、推荐回复模板和 Codex 后续自动执行清单。只想看命令行分组报告时，可以运行 `npm run app-store:user-actions`。

最终 Archive / Upload 前，Codex 应先运行：

```bash
npm run app-store:final-gate
```

这会汇总用户决策、外部控制台、截图、真机验收、公开页面、隐私标签、提交材料、生产健康和 iOS Release 预检。所有用户输入回写完成后，再用严格门禁确认：

```bash
npm run check:app-store-final
```

## 1. 必须拍板的产品决策

| 决策 | 当前推荐 | 你需要确认什么 | 不确认的影响 |
| --- | --- | --- | --- |
| 首版是否免费 | 免费 | 确认首版免费，不启用 IAP/订阅 | App Store 元数据和审核备注无法最终定稿 |
| 每日真实 AI 生成额度 | 每天 5 篇，按 UTC day | 确认数字是否就是 5 | 隐私/额度/用户提示无法最终锁定 |
| 推荐好文是否计入额度 | 不计入 | 确认推荐好文预生成导入不消耗用户额度 | 新用户体验路径和额度规则无法最终锁定 |
| 首版是否加入 Apple 登录 | 加入可选 Apple 登录 | 确认 App ID capability 和 Xcode signing 都已开启 Sign in with Apple；必须同步做账号删除闭环 | 若 Apple capability 未开启，Archive 会失败；若无删除账号入口，审核有高风险 |
| 是否强制登录后生成 | 不强制 | 确认匿名用户也可生成 | 若强制登录，会改变首屏体验和审核说明 |

## 2. 必须提供的外部信息

| 信息 | 用途 | 你需要给 Codex 什么 |
| --- | --- | --- |
| Support URL | App Store Connect 必填/强建议，用于用户支持 | https://shibei-production.up.railway.app/support |
| Privacy URL | App Store Connect 隐私政策 URL | https://shibei-production.up.railway.app/privacy |
| 支持邮箱 | 隐私政策和用户支持 | mingyuhan0814@gmail.com |
| App Store Connect App 状态 | 确认是否在旧 `com.maxhan.shibei` App 下提交 | 截图或口头确认当前 App 页面和 bundle id |
| Apple Developer / App Store Connect 外部控制台确认 | 确认 Push capability、现有 App 记录、隐私标签、截图、年龄分级、最新 build 等 Codex 无法登录检查的项目 | 按 `docs/app-store-external-console-checklist-zh.md` 填写 `.release/app-store-inputs/external-console-checks.json` |
| 最终截图文件 | 产品页截图上传 | 至少准备 1 张符合规格截图，首版建议按 `docs/app-store-release-evidence/screenshots-checklist.md` 补齐 6 张核心场景；放入 `docs/app-store-release-evidence/screenshots/app-store/` 后运行 `npm run check:app-store-screenshots` |

## 3. 你需要在真机上执行的验收

复制模板：

```bash
npm run app-store:create-acceptance
```

Codex 可以先创建当天草稿；该命令会自动填入 commit、branch、production URL、Railway deployment id 和部分自动检查证据。然后在生成出的 `docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md` 里，填写真机/TestFlight 核心路径结果：

- 新用户首次启动。
- 首次真实生成前 AI 处理说明。
- 真实生成成功。
- 后台/锁屏生成通知。
- 生成失败和删除。
- 推荐好文模拟生成。
- 主页学习路径不被未开始学习的新章节抢占。
- 从题目/解释/单元总结退出后继续学习，回到正确位置。
- 错题回插到当前 unit 内，并以未作答状态再次出现。
- 收藏/取消收藏，重启后状态保留。
- 通知已读后红点和数量正确消失。
- 删除章节不会误删其他章节。
- 删除我的数据只删除当前匿名设备数据。
- 切语言后当前数据不丢。
- 发现页推荐好文封面、filter、文章数量正常。
- 核心路径不出现 `fixture`、`Railway`、`JSON decode`、旧“拾贝”等可见调试/旧品牌文案。

验收规则：

- 有 P0：不能 Archive / 提交审核。
- 有未豁免 P1：不能 Archive / 提交审核。
- 只有 P2：可以记录后进入后续版本。

## 4. 你需要在 Xcode 手动完成的操作

必须打开：

```text
/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj
```

不要打开：

```text
/Users/hanmingyu/Downloads/拾贝
/Users/hanmingyu/Downloads/拾贝-v2-baseline
/Users/hanmingyu/Downloads/拾贝-prod-hardening 以外的旧工程
```

Archive 前确认：

- Scheme 是 `Recallo`。
- Destination 是 `Any iOS Device (arm64)`。
- Display Name 是 `Recallo`。
- Bundle ID 是 `com.maxhan.shibei`。
- App Icon 是新 Recallo 图标。
- Push Notifications capability 开启。

Archive 后确认：

- Organizer 里显示 App 名称 `Recallo`。
- 图标是新图标。
- Version / Build number 正确。
- 签名 team/profile 正确。

如果 Archive 里还是旧名称或旧图标，立即停止。

Archive / Upload 成功后，把以下字段发给 Codex，或直接按命令生成证据：

| 字段 | 从哪里看 |
| --- | --- |
| iOS version | Xcode Organizer 里的 Version |
| iOS build number | Xcode Organizer 里的 Build |
| Archive result | Archive 是否成功；成功填 `PASS` |
| Upload result | Distribute App 上传是否成功；成功填 `PASS` |
| Organizer app name | Xcode Organizer 中显示的 App 名，必须是 `Recallo` |
| Organizer bundle id | Xcode Organizer / App Store Connect 中显示的 bundle id，必须是 `com.maxhan.shibei` |
| Organizer icon confirmed | 图标是否是新版 Recallo 图标；是填 `yes` |
| App Store Connect build | App Store Connect 处理完成后的 build 标识或编号 |

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run app-store:create-archive-evidence -- \
  --ios-build-number <build-number> \
  --version <version> \
  --archive-result PASS \
  --upload-result PASS \
  --organizer-app-name Recallo \
  --organizer-bundle-id com.maxhan.shibei \
  --organizer-icon-confirmed yes \
  --app-store-connect-build <App Store Connect build>
```

## 5. 你需要在 App Store Connect 手动完成的操作

进入旧 TestFlight 对应的现有 App，确认 bundle id 是：

```text
com.maxhan.shibei
```

然后完成：

- 选择新上传的 build。
- 填 App Name、Subtitle、Promotional Text、Description、Keywords。
- 填 Support URL。
- 填 Privacy URL。
- 填 App Privacy 标签。
- 填年龄分级。
- 上传至少 1 张符合规格截图；首版建议补齐 6 张核心场景截图。
- 粘贴 Review Notes。
- 提交审核。

同时按下面文档把 App Store Connect 和 Apple Developer 的实际确认值写成机器可读输入。Codex 可以先创建 `.release/app-store-inputs/external-console-checks.json` 草稿；如果需要重新创建，运行：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
mkdir -p .release/app-store-inputs
cp docs/app-store-external-console-checks.example.json .release/app-store-inputs/external-console-checks.json
```

填写完成后运行：

```bash
npm run check:app-store-external-console
```

完整填写说明见 `docs/app-store-external-console-checklist-zh.md`。

填写材料来源：

- `docs/app-store-metadata-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-release-evidence/screenshots-checklist.md`
- `docs/app-store-archive-submit-runbook-zh.md`
- `docs/app-store-url-publishing-guide-zh.md`

## 6. Codex 可以继续自动做的事

在你完成或提供上述信息后，Codex 可以继续自动执行：

- 把你的决策回写到 `docs/app-store-release-readiness-plan-zh.md`。
- 运行 `npm run app-store:ingest-user-reply`，用一次安全编排完成回复解析、标准输入 JSON 生成、dry-run 回写和状态总览。
- 用 `npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json` 写入隐私政策、支持页、元数据和提交包。
- 跑 `npm run check:app-store-submit:report` 查看下一步动作；最终提交前跑 `npm run check:app-store-submit`，确保没有邮箱、URL 或审核决策占位符。
- 根据你提供的截图/录屏更新验收记录。
- 用 `npm run app-store:create-acceptance` 创建本次验收记录，并把当前 commit、branch、production health 和 deployment id 自动写入。
- 跑 `npm run app-store:acceptance-audit -- <验收记录文件>` 或最终严格检查 `npm run check:app-store-acceptance -- <验收记录文件>`，确认真机验收无 P0 / 未豁免 P1。
- 跑 `npm run check:release-ios`、`npm run check`、Release build 和 production health。
- 跑 `npm run app-store:screenshot-audit` 或 `npm run check:app-store-screenshots` 检查截图规格。
- 陪跑 Archive 前检查。
- 根据 App Store Connect 的拒审或警告更新文档和修复代码。

## 7. 当前最短路径

1. 你按交接包模板回复，或填写 `docs/app-store-user-decision-form-zh.md`。
2. 你按 `docs/app-store-url-publishing-guide-zh.md` 部署 `docs/privacy-policy.html` 和 `docs/support.html`，并提供最终 URL 和支持邮箱。
3. Codex 运行 `npm run app-store:ingest-user-reply` 先 dry-run，确认无误后用 `--apply` 回写所有上架文档。
4. Codex 跑 `npm run check:app-store-submit`、`npm run app-store:create-connect-copy-pack` 和总检查。
5. 你按模板跑真机验收。
6. 没有 P0/P1 后，按 Archive runbook 上传。
