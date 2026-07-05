# Recallo App Store 用户输入字段映射表

> 这份文档只回答一个问题：用户现在还需要填哪些字段、填什么值、去哪里找。Codex 不会用这里的信息替你猜 Apple 后台状态；你填完后，Codex 负责 dry-run、回写、跑 gate、提交证据。

## 1. 推荐填写顺序

1. 先按 `docs/app-store-release-evidence/2026-07-04-user-handoff.md` 里的“建议直接回复模板”回复产品决策、邮箱、URL 和元数据。
2. 再填 `docs/app-store-release-evidence/2026-07-04-production-acceptance.md` 的真机验收结果。
3. 再填 `.release/app-store-inputs/external-console-checks.json` 的 Apple Developer / App Store Connect 后台确认值。
4. 最后把至少 1 张符合规格截图放到 `docs/app-store-release-evidence/screenshots/app-store/`；首版建议补齐 6 张核心场景截图。

## 2. 决策表字段

来源文件：`docs/app-store-user-decision-form-zh.md`

如果采用快速首版方案，建议按下表填写。

| 决策项 | 推荐最终值 | 用户是否必须确认 | 说明 |
| --- | --- | --- | --- |
| 首版价格 | 免费 | 是 | App Store Pricing 也要选 free。 |
| 首版是否启用 IAP/订阅 | 不启用 | 是 | 首版不接 StoreKit，降低审核复杂度。 |
| 每日真实 AI 生成额度 | 每天 5 篇，按 UTC day | 是 | 用户已确认首版额度为 5；后端/文案需保持一致。 |
| 推荐好文是否计入额度 | 不计入 | 是 | 推荐好文是预生成内容，用来让新用户快速体验。 |
| 匿名用户是否可直接生成 | 可以，不强制登录 | 是 | 保持首版首次体验顺滑。 |
| 首版是否加入可选 Apple 登录 | 加入可选 Apple 登录 | 是 | 匿名仍可直接使用；Apple 登录用于保存和恢复学习数据。 |
| 如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界 | 不适用：首版做 Apple 登录，但匿名模式仍需说明恢复边界 | 是 | 匿名模式仍保留，因此文案仍需说明重装/换机可能无法恢复。 |
| 如果首版做 Apple 登录，是否同步做删除账号入口 | 必须同步做 | 是 | Apple 审核硬要求；App 内必须可删除账号。 |
| 支持邮箱 | 用户提供真实邮箱 | 是 | 必须是真实可收信邮箱，不能是占位符。 |
| Privacy Policy URL | 用户提供公开 HTTPS URL | 是 | App Store Connect 必填；必须公网可访问。 |
| Support URL | 用户提供公开 HTTPS URL | 是 | App Store Connect 支持入口；必须公网可访问。 |
| App Name | Recallo | 是 | App Store Connect 和 Xcode Organizer 里都应显示 Recallo。 |
| Subtitle | 把文章变成练习题 | 是 | 可以采用草案，也可以改。 |
| Promotional Text | 把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。 | 是 | 可以采用草案，也可以改。 |
| Category | Education | 是 | App Store Connect > App Information。 |
| Secondary Category | Productivity | 是 | App Store Connect > App Information。 |
| Keywords | 学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习 | 是 | App Store Connect 关键词字段。 |
| 真机验收记录文件 | `docs/app-store-release-evidence/2026-07-04-production-acceptance.md` | 否，Codex 已回写 | 已创建，继续填写真机/TestFlight 结果即可。 |
| 是否仍有 P0 | 无 P0 / 有 P0 | 是 | 有 P0 时不能 Archive/提交审核。 |
| 是否仍有未豁免 P1 | 无未豁免 P1 / 有未豁免 P1 | 是 | 有未豁免 P1 时不能 Archive/提交审核。 |
| App Store 截图是否已准备 | 已准备 / 未准备 | 是 | 截图 strict 检查通过前不能提交。 |
| Archive 中 App 名称/图标是否正确 | 名称/图标/Bundle ID 正确 | 是 | 由用户在 Xcode Organizer 里确认。 |
| App Store Connect 是否选择旧 bundle id 对应 App | 已确认在 `com.maxhan.shibei` 对应 App 下提交 | 是 | 不要创建新 App。 |

## 3. 外部控制台 JSON 字段

来源文件：`.release/app-store-inputs/external-console-checks.json`

如果文件已存在，只打开继续补字段，不要重新复制模板覆盖。

```bash
open .release/app-store-inputs/external-console-checks.json
```

### 3.1 Apple Developer

| JSON 路径 | 正确/推荐值 | 去哪里看 | 说明 |
| --- | --- | --- | --- |
| `appleDeveloper.teamName` | Apple 后台显示的真实 Team 名称 | Apple Developer 右上角账户 / Membership | 文本值，照后台填写。 |
| `appleDeveloper.bundleId` | `com.maxhan.shibei` | Certificates, Identifiers & Profiles > Identifiers | 必须是旧 TestFlight 对应 bundle。 |
| `appleDeveloper.appIdUsesExistingBundle` | `true` | Identifiers 列表 | 确认不是新建了另一个 App ID。 |
| `appleDeveloper.pushNotificationsEnabled` | `true` | App ID capability 列表 | 系统推送必须开启。 |
| `appleDeveloper.productionApnsConfigured` | `true` | APNs key/certificate + Railway 生产环境变量 | 确认生产推送配置一致。 |
| `appleDeveloper.signInWithAppleDecision` | `enabled` | 由首版账号决策决定 | 用户已确认首版做可选 Apple 登录。 |
| `appleDeveloper.signInWithAppleCapabilityMatchesDecision` | `true` | App ID capability 列表 | capability 必须和上一个决策一致。 |

### 3.2 App Store Connect

| JSON 路径 | 正确/推荐值 | 去哪里看 | 说明 |
| --- | --- | --- | --- |
| `appStoreConnect.usesExistingAppRecord` | `true` | App Store Connect > My Apps | 必须使用旧 TestFlight 对应现有 App。 |
| `appStoreConnect.bundleId` | `com.maxhan.shibei` | App Information / Build 页面 | 和 Xcode bundle id 一致。 |
| `appStoreConnect.appName` | `Recallo` | App Information | 用户可见名称。 |
| `appStoreConnect.sku` | 后台显示或你设置的 SKU | App Information | 文本值，记录即可。 |
| `appStoreConnect.primaryCategory` | `Education` | App Information | 与决策表一致。 |
| `appStoreConnect.pricing` | `free` | Pricing and Availability | 首版免费。 |
| `appStoreConnect.iapOrSubscriptionsEnabled` | `false` | Features / Subscriptions / In-App Purchases | 首版不启用 IAP/订阅。 |
| `appStoreConnect.privacyPolicyUrl` | 公开 HTTPS 隐私政策 URL | App Privacy / App Information | 必须与决策表一致。 |
| `appStoreConnect.supportUrl` | 公开 HTTPS 支持页 URL | App Information | 必须与决策表一致。 |
| `appStoreConnect.appPrivacyLabelsCompleted` | `true` | App Privacy | 按 `docs/app-store-privacy-labels-zh.md` 填完。 |
| `appStoreConnect.ageRatingCompleted` | `true` | App Information > Age Rating | 问卷完成。 |
| `appStoreConnect.screenshotsUploaded` | `true` | Product Page | 至少 1 张符合规格截图已上传且无旧品牌/旧 UI；首版建议补齐 6 张核心场景。 |
| `appStoreConnect.latestRecalloBuildSelected` | `true` | Build 选择区域 | 选择最新 Recallo build。 |
| `appStoreConnect.reviewNotesPasted` | `true` | App Review Information | 粘贴最新审核说明。 |

### 3.3 Review Submission / Archive

| JSON 路径 | 正确/推荐值 | 去哪里看 | 说明 |
| --- | --- | --- | --- |
| `reviewSubmission.archiveAppName` | `Recallo` | Xcode Organizer | 如果还是旧名称，停止。 |
| `reviewSubmission.archiveBundleId` | `com.maxhan.shibei` | Xcode Organizer / App Store Connect build | 必须复用旧 bundle。 |
| `reviewSubmission.archiveIconIsRecallo` | `true` | Xcode Organizer 图标 | 必须是新 Recallo 图标。 |
| `reviewSubmission.noOldShibeiBrandVisible` | `true` | Archive 包、截图、App Store 文案 | 不得出现旧品牌/旧 UI。 |
| `reviewSubmission.readyToSubmitForReview` | `true` | 用户最终确认 | 只有所有 gate 通过后再填 true。 |

填完后运行严格检查：

```bash
npm run check:app-store-external-console
```

## 4. 真机验收记录字段

来源文件：`docs/app-store-release-evidence/2026-07-04-production-acceptance.md`

必须由用户在真机或 TestFlight 上填写：

- iOS build number
- 验收设备
- iOS 版本
- 验收人
- A1-A17 每条核心路径结果
- N1-N3 网络异常结果
- App Store 截图验收结果，至少 1 张符合规格；首版建议 6 张核心场景
- 最终结论勾选和 `通过 / 不通过`

自动检查项已经由 Codex 填好，不需要用户再填。

## 5. 截图文件

目录：`docs/app-store-release-evidence/screenshots/app-store/`

建议文件名：

```text
01-home-learning-path.png
02-add-article.png
03-generating.png
04-chapter-detail.png
05-question-card.png
06-discover-recommendations.png
```

放入后运行：

```bash
npm run check:app-store-screenshots
```

## 6. Codex 收到用户输入后会做什么

1. 解析用户回复，生成 `.release/app-store-inputs/decision-values.json` 和 `.release/app-store-inputs/contact-values.json`。
2. 对决策和联系方式回写做 dry-run。
3. dry-run 通过后正式回写隐私政策、支持页、元数据、审核包、用户清单和 runbook。
4. 检查截图、真机验收、外部控制台 JSON、提交材料和最终总 gate。
5. 把结果写入 `docs/app-store-release-readiness-plan-zh.md` 和 `docs/app-store-release-evidence/`。
