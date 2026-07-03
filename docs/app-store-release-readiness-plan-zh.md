# Recallo App Store 上架准备总控计划

> 本文档用于持续推进 Recallo 从 TestFlight 内测走向 App Store 首版上架。它是上架准备的总控台账，不替代具体 PRD、隐私政策、审核备注或工程实施计划。后续每完成一项准备工作，都应回到本文档更新状态和下一步动作。

## 1. 当前目标

### 1.1 阶段目标

当前目标不是立刻做商业化大版本，而是准备一个可以通过 App Review、可以面向中小规模真实用户测试的 App Store 首版。

首版原则：

- 免费使用。
- 不接广告。
- 不接第三方增长分析 SDK。
- 不做订阅或付费积分。
- 保留 AI 生成能力，但必须有服务端额度和滥用控制。
- 保留匿名体验，但需要明确账号与数据恢复路线。
- 上架前必须补齐隐私、数据删除、通知、AI 处理说明和审核材料。

### 1.2 推荐发布路径

| 阶段 | 目标 | 用户范围 | 主要验收 |
| --- | --- | --- | --- |
| TestFlight 扩大测试 | 验证核心体验和稳定性 | 20-100 人 | 生成、通知、进度、收藏、删除、推荐好文可稳定使用 |
| App Store 首版 | 公开可下载但控制成本 | 自然流量和小范围推广 | 审核通过、隐私合规、额度可控、数据不丢失 |
| 首版后增长 | 优化留存和商业化 | 更大范围用户 | 账号体系、订阅/IAP、推荐内容运营、监控告警成熟 |

### 1.3 本轮官方调研结论

本轮调研以 Apple 官方文档为主，结论如下：

| 主题 | 官方要求/风险点 | 对 Recallo 的影响 | 处理策略 |
| --- | --- | --- | --- |
| App Review 基础 | Apple Review 重点覆盖 Safety、Performance、Business、Design、Legal；审核材料不完整会延迟或被拒 | 不能只提交二进制包，必须准备完整审核说明和可复现路径 | 建立 App Review 提交包和审核备注模板 |
| 第三方 AI | App 向第三方 AI 分享个人数据前，需要清楚披露并取得用户许可 | 用户上传/粘贴文章内容会被发送给 DeepSeek/模型服务生成学习内容 | 上架前必须加入“AI 处理说明 + 首次生成前同意”或等价的明确同意机制 |
| App Privacy | App Store Connect 需要披露 App 和第三方 partner 收集的数据类型、是否关联用户、是否追踪 | 匿名 ID、push token、用户内容、学习进度、收藏、诊断日志都要如实标注 | 建立 App Privacy 标签填写表，和真实数据流逐项对齐 |
| 账号删除 | 如果 App 支持账号创建，必须允许用户在 App 内发起账号删除，并删除不需保留的关联数据 | 如果首版做 Sign in with Apple，就必须同时做账号删除闭环 | Apple 登录作为可选项时，同步设计删除账号接口和前端入口 |
| Sign in with Apple | 若使用第三方登录，一般需要同时提供 Sign in with Apple；仅自有账号/匿名体验不一定触发 | Recallo 目前不做第三方社交登录；如果做账号恢复，优先直接做 Apple 登录 | 首版不要引入 Google/微信等第三方登录，降低审核复杂度 |
| 年龄分级 | App Store Connect 年龄分级是必填项，且有新的 13+/16+/18+ 等问卷维度 | AI 学习产品通常可走较低年龄分级，但需确认是否有 UGC、网页内容、开放文本 | 提交前完成年龄分级问卷预演，避免误报 |
| 截图和产品页 | iPhone 产品页需 1-10 张截图，截图应展示真实 UI 和核心价值 | Recallo 截图不能再混入旧“拾贝”名称、旧图标、旧 UI | 建立截图脚本/清单，固定 5-6 个核心场景 |

官方参考：

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- User Privacy and Data Use: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Offering Account Deletion: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- App Review preparation: https://developer.apple.com/distribute/app-review/
- App Store screenshot specifications: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- Product page guidance: https://developer.apple.com/app-store/product-page/

## 2. 当前状态概览

| 模块 | 当前状态 | 上架判断 | 下一步 |
| --- | --- | --- | --- |
| iOS App | 已能 TestFlight / 真机运行，已迁移 Recallo 命名和正式图标方向 | 部分完成 | 做 App Store build 专项验收，确保不再打到旧工程或旧 UI |
| 后端生产服务 | Railway 生产服务可用，健康检查、队列、APNs 已接入 | 部分完成 | 补额度系统、告警、备份恢复和日志脱敏验收 |
| AI 生成 | 已能生成章节、题目、知识点和推荐好文预设内容 | 部分完成 | 做失败率、超时、成本和字段长度专项验收 |
| 通知 | APNs production 已配置，近期已修复延迟/重复推送链路 | 部分完成 | 真机锁屏/后台完整回归，记录证据 |
| 数据持久 | 匿名设备 ID + 服务端存储已可用 | 上架风险 | 明确账号/数据恢复方案，至少完成数据不丢失审计 |
| 隐私合规 | 有隐私政策文档和 App 内说明基础 | 部分完成 | 更新为 Recallo 名称，补第三方 AI 处理和数据保留说明 |
| App Store 元数据 | 已有草案，但仍有旧“拾贝”命名 | 部分完成 | 全量改为 Recallo，准备截图、描述、关键词、审核备注 |
| 商业化 | 暂无付费 | 不阻塞首版 | 首版只做免费额度，不做 IAP |
| 用户支持 | 需要 Support URL 和反馈入口 | 页面已准备/待公开 URL | `docs/support.html` 已准备；待用户提供支持邮箱并部署公开 URL |

### 2.1 首版范围边界

为了尽快进入中度范围真实用户测试，首版必须克制范围。下表用于防止上架前无限扩张：

| 能力 | 首版是否做 | 原因 |
| --- | --- | --- |
| 用户输入链接/文本生成学习章节 | 做 | 核心价值 |
| 推荐好文预设章节 | 做 | 降低新用户首次体验成本 |
| 做题、解释、错题回插、进度恢复 | 做 | 核心学习闭环 |
| 收藏题目/笔记 | 做 | 已存在，属于核心留存 |
| 推送通知 | 做 | 生成完成/失败提醒必要 |
| 免费每日额度 | 做 | 控制模型成本和滥用 |
| 付费订阅/IAP | 不做 | 增加审核和工程复杂度 |
| 社交分享/社区发布 | 不做 | 非首版必要 |
| 完整后台 CMS | 不做 | 推荐好文先用脚本/JSON 维护 |
| 第三方社交登录 | 不做 | 避免引入 Sign in with Apple 以外的审核复杂度 |
| Apple 登录 | 倾向可选做 | 数据恢复价值高，但必须同步账号删除 |

### 2.2 App Store 提交包拆解

提交 App Store 不是一个单一动作，而是 5 个包同时准备：

| 提交包 | 内容 | 当前负责人 | 文档/位置 | 状态 |
| --- | --- | --- | --- | --- |
| Binary 包 | 正确 Xcode 工作区、Release 配置、图标、显示名、bundle id、build number | Codex + 用户手动 Archive | Xcode / App Store Connect | 待验收 |
| Review 包 | Review Notes、测试路径、是否需要账号、AI 说明、通知说明 | Codex 起草，用户确认 | 本文档 + App Store Connect | 待写 |
| Privacy 包 | 隐私政策 URL、App Privacy 标签、AI 第三方处理同意 | Codex 起草，用户确认 | `docs/privacy-policy-zh.md` | 待更新 |
| Product Page 包 | 名称、副标题、描述、关键词、截图、年龄分级 | Codex 起草，用户确认 | `docs/app-store-metadata-zh.md` | 待更新 |
| Ops 包 | 部署 runbook、监控、备份、事故处理、额度配置 | Codex | `docs/v2-production-deploy-runbook-zh.md` 等 | 部分完成 |

## 3. 上架前必须完成的阻塞项

### 3.1 App 名称、工程和构建隔离

目标：确保 App Store / TestFlight 打包一定来自官方 Recallo 工作区，不再出现旧工程、旧 UI、旧图标、旧命名混入。

必须完成：

- [ ] Xcode scheme、Product Name、Display Name、App Icon 都显示 Recallo。
- [ ] Release / Archive 包默认使用 V2 root。
- [ ] Release 包不包含 Mock 切换、本地 API、Railway 输入框、debug 文案、fixture 缺失提示。
- [ ] 旧工程目录继续隔离，不作为 Archive 入口。
- [ ] 打包前 guard 能检查当前工作区、bundle id、display name、icon、API base URL。

验收方式：

- 用 Xcode Archive 出一个候选包。
- 在真机/TestFlight 安装后截图确认图标、名称、首页 UI、设置页文案。
- 记录 Archive 路径、commit hash、build number。

必须新增的工程安全 guard：

- [ ] 仓库内增加 Release preflight 脚本，检查当前路径必须是官方工作区。
- [ ] 检查 `PRODUCT_NAME`、`INFOPLIST_KEY_CFBundleDisplayName`、App Icon、scheme 是否为 Recallo。
- [ ] 检查 `ContentView` Release 必须进入 `V2RootView`。
- [ ] 检查 Release 包不得出现 `fixture 没有对应页面数据`、`拾贝`、`ShibeiUseLegacyRoot` 可见文案。
- [ ] Archive 前输出 commit hash，写入提交包记录。

### 3.2 账号与数据恢复策略

目标：避免正式用户因为重装、换机、系统语言变化、设备 ID 变化导致数据不可恢复。

首版决策建议：

- App Store 首版可以继续允许匿名体验。
- 推荐加入 Sign in with Apple，作为“保存和同步学习数据”的可选能力。
- 如果首版不做账号，则必须在产品文案中明确“当前数据绑定本设备”，但这会削弱正式上架可信度。

必须完成：

- [ ] 明确首版是否加入 Apple 登录。
- [ ] 明确匿名用户数据如何绑定、迁移、删除和恢复。
- [ ] 如果提供账号创建，App 内必须提供账号删除入口。
- [ ] 数据删除应删除章节、复习记录、收藏、通知、push token 和用户 profile。
- [ ] 更新隐私政策和 App Review 备注。

若做 Apple 登录，必须一起完成：

- [ ] 登录前说明：用于保存和恢复学习数据，不强制用户登录才能体验。
- [ ] 匿名数据绑定：登录成功后，把当前匿名 device 数据绑定到 Apple account。
- [ ] 多设备冲突策略：同一账号多设备以服务端数据为准，本地只缓存。
- [ ] 删除账号入口：个人主页 > 账号说明/账号设置 > 删除账号。
- [ ] 删除账号接口：删除 user profile、account link、chapters、review progress、favorites、notifications、push tokens。
- [ ] 删除账号后本地清理：清空 token/account id，回到匿名新用户状态。

推荐方案：

| 方案 | 优点 | 风险 | 建议 |
| --- | --- | --- | --- |
| 继续匿名 | 实现最快，审核复杂度低 | 数据恢复弱，正式用户信任风险高 | 可用于 TestFlight，不建议长期正式版只靠它 |
| Apple 登录可选 | 数据可恢复，符合 iOS 生态 | 需要账号删除、迁移、权限和测试 | 推荐 App Store 首版目标 |
| 强制登录 | 数据一致性最好 | 首次体验门槛高 | 不建议首版 |

### 3.3 免费额度和成本控制

目标：控制 AI 成本和滥用风险，避免 App Store 上架后被自然流量或恶意请求打爆。

首版建议：

- 免费用户每日生成额度：先设为 3 篇。
- 推荐好文导入：不计入额度或单独低成本计量。
- 失败重试：服务端限制每篇文章自动重试次数。
- 文章长度：保留服务端上限，但文案要用户可理解。
- 所有额度必须在服务端校验，前端只负责展示。

必须完成：

- [ ] 设计 `daily_generation_quota` 的服务端规则。
- [ ] 记录每个 device/account 每日生成次数、失败次数、推荐好文导入次数。
- [ ] 超额时返回稳定错误码和用户友好文案。
- [ ] App 内展示今日剩余额度或在超额时解释。
- [ ] 后端增加测试覆盖：跨天重置、重复请求、失败是否计额、推荐好文是否计额。

额度规则建议先按以下版本落地：

| 行为 | 是否计入每日额度 | 原因 |
| --- | --- | --- |
| 用户上传新链接/文本并启动模型生成 | 计入 | 真实模型成本 |
| 生成失败但已调用模型超过一次 | 计入或计半次，首版建议计入 | 防止反复恶意消耗 |
| URL 格式错误、前置校验失败 | 不计入 | 无模型成本 |
| 用户取消生成 | 如果模型 job 已开始则计入 | 成本已发生 |
| 推荐好文预设章节导入 | 不计入 | 已预生成，用于新手体验 |
| 删除章节后重新生成同一链接 | 计入 | 仍然消耗模型 |

首版错误码建议：

| 错误码 | 用户文案 |
| --- | --- |
| `quota_exceeded_daily_generation` | 今天的生成次数已用完，明天可以继续生成。你仍然可以学习已生成的章节和推荐好文。 |
| `source_too_long` | 这篇文章暂时太长，建议换一篇更短的文章，或复制其中重点段落再试。 |
| `generation_temporarily_unavailable` | 生成服务暂时繁忙，请稍后再试。 |

首版不做：

- 付费积分。
- 订阅。
- 外部支付链接。
- 邀请返额度。

### 3.4 隐私、数据治理和 AI 处理说明

目标：App Store 隐私标签、隐私政策、App 内说明和真实数据流一致。

必须披露的数据类型：

| 数据类型 | 示例 | 用途 | 是否需要用户理解 |
| --- | --- | --- | --- |
| User Content | 用户粘贴文本、文章链接、生成章节、题目、来源上下文 | 生成学习内容、恢复章节 | 是 |
| Identifiers | 匿名设备 ID、账号 ID、APNs token | 区分用户、推送通知 | 是 |
| Usage Data | 学习进度、答题记录、收藏、反馈 | 恢复复习状态、改进体验 | 是 |
| Diagnostics | 错误日志、服务状态、生成失败原因 | 排查问题 | 是，尤其要说明不应包含完整原文 |

必须完成：

- [ ] 将 `docs/privacy-policy-zh.md` 和 `docs/privacy-policy.html` 更新为 Recallo。
- [ ] 明确第三方 AI 模型处理：用户内容可能发送给模型服务用于生成知识点和题目。
- [ ] 明确数据保留周期：用户主动删除、账号删除、备份保留边界。
- [ ] 明确日志脱敏：不在日志里记录完整用户原文、APNs token、API key。
- [ ] 更新 App Store Connect App Privacy 标签。

必须新增的 App 内 AI 同意点：

- [ ] 首次点击“开始生成/开始学习”前，展示一次 AI 处理说明。
- [ ] 文案要说明：文章链接/文本会发送给第三方 AI 服务，用于生成章节、知识点和题目。
- [ ] 用户可以不同意；不同意时不能使用需要 AI 处理的生成能力，但仍可浏览本地/预设内容。
- [ ] 同意状态保存在服务端或本地稳定存储中，并可在隐私说明里查看。
- [ ] App Review Notes 中主动说明该同意机制的位置和触发方式。

建议文案草案：

> 为了帮你把文章整理成知识点和练习题，Recallo 会将你提交的文章链接、提取到的正文和必要的上下文发送给第三方 AI 服务进行处理。我们不会把这些内容用于广告追踪。继续生成即表示你同意这项处理。

### 3.5 App Review 材料

必须准备：

- [ ] App 名称：Recallo。
- [ ] Subtitle：30 字符以内。
- [ ] App Description。
- [ ] Keywords：100 字符以内。
- [ ] Support URL。
- [ ] Privacy Policy URL。
- [ ] 截图：至少 iPhone 尺寸，覆盖首页、添加、生成中/完成、复习、解释/来源。
- [ ] Review Notes：说明 AI 生成、通知用途、是否需要登录、测试方式。
- [ ] 年龄分级。
- [ ] 如果有登录，提供审核账号或说明 Sign in with Apple。

Review Notes 草案结构：

```text
Recallo is an AI-assisted learning app. Users provide an article URL or text, and the app generates a study chapter with knowledge points and practice questions.

Core review path:
1. Open the app.
2. Tap add/generate.
3. Paste a public article URL or use the recommended articles in Discover.
4. Start generation. The app shows a generation progress page and sends a notification when complete.
5. Open the generated chapter and start learning.

AI/data disclosure:
Before the first user-generated AI request, the app explains that submitted article content may be sent to a third-party AI service to generate learning materials.

Account:
Use one of the following, based on the final release decision:
- Anonymous-first release: The app does not require account sign-in for the first version. Learning data is associated with the user's device identifier.
- Optional Sign in with Apple release: Sign in with Apple is optional and is used to save and recover learning data. Account deletion is available from Profile > Account.

Notifications:
Push notifications are used only to notify users when chapter generation succeeds or fails.
```

当前已有基础文档：

- `docs/app-store-beta-checklist-zh.md`
- `docs/app-store-metadata-zh.md`
- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`

需要更新：

- [ ] 将旧“拾贝”命名替换为 Recallo。
- [ ] 将 Beta 口径改成 App Store 首版口径。
- [ ] 加入免费额度和 AI 数据处理说明。

### 3.6 生产稳定性和监控

目标：用户上架后遇到问题时，系统能发现、定位、恢复。

必须完成：

- [ ] `/api/health` 继续覆盖数据库、队列、APNs、核心 capability。
- [ ] 增加或明确 Railway 崩溃/重启邮件告警处理流程。
- [ ] 队列积压告警：queued/running/failed 异常时能发现。
- [ ] 生成失败率监控：按失败类型统计。
- [ ] APNs 失败监控：BadDeviceToken、BadEnvironmentKeyInToken、未配置等聚合。
- [ ] 生产部署 runbook 继续保留 preserve-data / reset-data 区分。
- [ ] 备份和恢复流程做一次演练或至少写成可执行文档。

上架前必须保留的证据：

| 证据 | 要求 |
| --- | --- |
| 生成成功链路 | 真机截图/录屏：提交 -> 生成中 -> 完成通知 -> 章节详情 |
| 生成失败链路 | 真机截图/录屏：失败状态、删除章节、通知不重复 |
| 后台通知 | App 在后台/锁屏时收到 APNs，不依赖重新打开 App |
| 数据恢复 | 切语言、杀进程、更新 TestFlight 后章节/进度/收藏不丢 |
| 删除 | 删除章节后列表、详情、通知、主页状态一致 |
| 推荐好文 | 推荐文章进入模拟生成页，完成后不抢占当前主线学习章节 |
| Railway health | `/api/health` 正常，deployment id 与提交记录一致 |

参考文档：

- `docs/production-readiness-review-zh.md`
- `docs/production-hardening-plan-zh.md`
- `docs/v2-production-deploy-runbook-zh.md`

## 4. 建议但不阻塞首版的增强项

### 4.1 付费和积分系统

首版不建议做付费积分。原因：

- 会引入 Apple IAP / StoreKit / 恢复购买 / 订阅条款 / 退款处理。
- 会提高审核复杂度。
- 当前更需要验证核心留存和生成质量。

建议第二阶段再做：

- 免费每日额度。
- 订阅解锁更高每日额度。
- StoreKit 2。
- 恢复购买。
- 订阅状态服务端校验。

### 4.2 推荐好文运营后台

首版可以继续使用预设 JSON / 脚本管理推荐好文。

后续再做：

- 管理员上传文章。
- 自动抓取封面。
- 预生成章节。
- 发布/下架开关。
- 推荐排序和标签管理。

当前维护文档：

- `docs/recommended-articles-admin-runbook-zh.md`

### 4.3 更完整的账号体系

首版如果只做 Sign in with Apple 可选登录，后续可以扩展：

- 邮箱登录。
- 数据导出。
- 多设备同步状态提示。
- 用户主动迁移匿名数据到账号。

## 5. 第一轮执行计划

### Checkpoint 1：上架差距审计

目标：把当前所有上架缺口标成阻塞、非阻塞、后续优化。

- [ ] 更新本文档每一项状态。
- [ ] 核对 App Store Connect 当前配置。
- [ ] 核对 Apple Developer capability：Push Notifications、Sign in with Apple 是否需要启用。
- [ ] 核对 Xcode Release / Archive 配置。
- [ ] 输出一份“App Review 前必须完成清单”。

产出物：

- `docs/app-store-release-readiness-plan-zh.md` 更新后的阻塞项表。
- `docs/app-store-review-submission-pack-zh.md`：审核提交包草案。
- `docs/app-store-release-evidence/`：截图、录屏、health 输出、build 信息。

### Checkpoint 2：账号和数据策略决策

目标：决定首版是否加入 Apple 登录，以及匿名数据如何处理。

- [ ] 画出匿名用户、登录用户、删除账号、重装 App 的数据流。
- [ ] 决定是否做 Apple 登录可选入口。
- [ ] 明确账号删除入口和服务端删除范围。
- [ ] 更新隐私政策和审核备注。

建议执行顺序：

1. 先完成匿名 ID 稳定性和数据不丢失专项回归。
2. 再决定 Apple 登录是否进入首版。
3. 如果进入首版，账号删除必须同一批完成。
4. 如果不进入首版，必须在隐私/账号说明中明确当前数据绑定设备，并列入首版后最高优先级。

### Checkpoint 3：免费额度系统设计

目标：把 AI 生成成本纳入服务端控制。

- [ ] 定义每日免费生成次数。
- [ ] 定义推荐好文是否计额。
- [ ] 定义失败、取消、重复提交是否计额。
- [ ] 设计后端数据结构和接口错误码。
- [ ] 设计前端展示文案。

验收边界：

- 前端禁用按钮不能作为唯一限制。
- 同一 device/account 并发请求不能绕过额度。
- 用户删除章节后不能借删除绕过计数。
- 推荐好文导入和用户真实生成必须在服务端区分。

### Checkpoint 4：隐私合规包

目标：确保 App Store 隐私标签、隐私政策和真实数据流一致。

- [ ] 更新隐私政策页面为 Recallo。
- [ ] 梳理 App Privacy 标签填写表。
- [ ] 检查 App 内隐私说明、账号说明、通知设置文案。
- [ ] 检查日志脱敏和数据删除。

必须同步更新：

- App 内：隐私说明、账号说明、AI 处理同意说明。
- Web/文档：隐私政策 HTML 和 Markdown。
- App Store Connect：App Privacy 标签。
- Review Notes：AI 处理和通知用途说明。

### Checkpoint 5：App Store 元数据和截图

目标：准备可提交审核的素材。

- [ ] 更新 `docs/app-store-metadata-zh.md`。
- [ ] 准备 5-6 张 App Store 截图。
- [ ] 准备 Review Notes。
- [ ] 准备 Support URL 和 Privacy URL。
- [ ] 准备年龄分级答案。

建议截图场景：

| 顺序 | 场景 | 目的 |
| --- | --- | --- |
| 1 | 首页学习路径 | 展示产品主体验 |
| 2 | 添加文章/生成入口 | 展示用户如何开始 |
| 3 | 章节详情 | 展示文章被整理后的结构 |
| 4 | 做题页 | 展示主动学习而非普通阅读器 |
| 5 | 题目解释/查看原文 | 展示可信来源和解释 |
| 6 | 发现页推荐好文 | 展示低门槛新手内容 |

### Checkpoint 6：生产验收

目标：确保正式用户不会遇到核心链路崩坏。

- [ ] 真机测试生成成功通知。
- [ ] 真机测试生成失败通知。
- [ ] 测试 App 后台、锁屏、杀进程后的状态恢复。
- [ ] 测试重装、切语言、更新版本后的数据保留。
- [ ] 测试删除章节、删除账号/数据、收藏、进度恢复。
- [ ] 检查 Railway health、queue、APNs、错误日志。

发布前最低验收矩阵：

| 链路 | 必须通过 |
| --- | --- |
| 新用户首次打开 | 不闪旧 UI、不出现空白误状态、不出现 debug 文案 |
| 推荐好文学习 | 模拟生成页可见，完成后进入章节详情，不抢占旧主线 |
| 用户自生成 | 成功、失败、取消、删除都状态一致 |
| 学习进度 | 退出在哪一页，继续回到哪一页；主页进度只看完成量 |
| 错题回插 | 错题插回当前单元末尾，重新作答状态正确 |
| 通知 | 后台/锁屏按时推送，不重复、不延迟到打开 App 后才触发 |
| 数据治理 | 切语言、重装、更新、登录/匿名切换不造成不可解释的数据丢失 |

### Checkpoint 7：提交审核

目标：提交 App Review，并准备回复审核问题。

- [ ] Archive 正确工作区和正确 commit。
- [ ] 上传 App Store Connect。
- [ ] 填写 App Privacy。
- [ ] 填写 Review Notes。
- [ ] 提交审核。
- [ ] 记录审核反馈和处理台账。

提交前冻结规则：

- 提交前 24 小时只接受阻塞 bug、隐私/审核材料修正、严重崩溃修复。
- 提交包必须记录 commit hash、build number、Railway deployment id。
- 若后端在审核期间再次部署，必须记录原因和 deployment id。
- 若审核被拒，所有回复和改动都要回写到本文档或专门 rejection log。

## 6. 可直接执行的任务拆解

> 执行规则：从 Task 1 开始顺序推进。每完成一个 Task，需要把结果写回本文档的“执行台账”，并把截图、录屏、命令输出或 App Store Connect 截图放进 `docs/app-store-release-evidence/`。不要跨任务批量改动，避免再次出现版本和证据混乱。

### Task 1：建立 App Store 提交证据目录

目标：先建立统一证据目录，后续所有上架证据都放到同一个地方。

负责人：

- Codex 执行。

文件：

- 创建目录：`docs/app-store-release-evidence/`
- 创建文件：`docs/app-store-release-evidence/README.md`

步骤：

- [x] 创建 `docs/app-store-release-evidence/README.md`。
- [x] 在 README 中写明证据命名规则：
  - `YYYY-MM-DD-build-<build-number>-archive.md`
  - `YYYY-MM-DD-health-<deployment-id>.md`
  - `YYYY-MM-DD-screenshot-<scene>.png`
  - `YYYY-MM-DD-recording-<scene>.mov`
- [x] 写明证据必须包含：日期、commit hash、build number、Railway deployment id、测试设备、测试结论。

验收：

- [x] `docs/app-store-release-evidence/README.md` 存在。
- [ ] 后续每一轮 TestFlight/审核候选包都能在该目录找到对应证据。

### Task 2：生成 App Review 提交包草案

目标：把 App Store Connect 里需要填写的审核说明、隐私说明、截图清单集中成一个可复制的文档。

负责人：

- Codex 起草。
- 用户最终确认并粘贴到 App Store Connect。

文件：

- 创建：`docs/app-store-review-submission-pack-zh.md`
- 参考：`docs/app-store-metadata-zh.md`
- 参考：`docs/app-store-beta-checklist-zh.md`
- 参考：`docs/privacy-policy-zh.md`
- 参考：`docs/privacy-policy.html`

步骤：

- [x] 新建 `docs/app-store-review-submission-pack-zh.md`。
- [x] 写入 App Review Notes 英文草案。
- [x] 写入审核员核心测试路径：
  - 打开 App。
  - 从发现页选择推荐好文。
  - 进入模拟生成中页面。
  - 进入章节详情。
  - 点击开始学习/继续学习。
  - 完成一道选择题或连线题。
  - 查看解释和原文。
- [x] 写入用户自生成测试路径：
  - 点击添加。
  - 粘贴公开文章 URL。
  - 同意 AI 处理说明。
  - 等待生成完成或查看失败状态。
- [x] 写入通知用途说明：只用于章节生成完成/失败提醒。
- [x] 写入账号说明，按当前决策保留二选一版本：
  - 如果首版匿名：说明不需要账号。
  - 如果首版做 Apple 登录：说明 Apple 登录入口和删除账号入口。
- [x] 写入 App Privacy 标签草案，列出 User Content、Identifiers、Usage Data、Diagnostics。
- [x] 写入年龄分级问卷预填建议。

验收：

- [x] 文档中没有“拾贝”旧命名。
- [x] 文档中没有 `TBD`、`TODO`、`待补` 这类占位词。
- [x] 用户可以直接复制 Review Notes 到 App Store Connect。

### Task 3：Release/Archive 工程防错脚本

目标：在每次打包前自动检查是否在正确工作区、正确 scheme、正确显示名、正确图标和正确 API 环境，防止再次把旧工程或旧 UI 打进 TestFlight。

负责人：

- Codex 实现。
- 用户打包前运行一次。

建议文件：

- 创建：`tools/release-archive-preflight.mjs`
- 修改：`package.json`，增加 `check:release-ios` 命令。
- 检查：`拾贝/拾贝.xcodeproj/project.pbxproj`
- 检查：`拾贝/拾贝/ContentView.swift`
- 检查：`拾贝/拾贝/Assets.xcassets/AppIcon.appiconset/Contents.json`
- 检查：`拾贝/拾贝/Localizable.xcstrings`

脚本必须检查：

- [x] 当前路径必须包含 `/拾贝-prod-hardening`。
- [x] 当前 git branch 必须是正式候选分支，如 `codex/recallo-review-replay-mode` 或之后指定的 release 分支。
- [x] Xcode scheme / 产品配置必须包含 `Recallo`。
- [x] `ContentView.swift` Release 分支默认 `return true` 使用 `V2RootView()`。
- [x] App 内可见阻断文案不得包含：
  - `fixture 没有对应页面数据`
  - `本地 fixture`
  - `JSON decode`
  - `decode path`
  - `无法找到本地页面数据`
- [x] 允许代码内部兼容旧参数，但 Release 可见文案和 App 名必须为 Recallo。
- [x] 对 `Railway`、`deviceId`、`ShibeiUseLegacyRoot` 做 warning 级别风险提示，后续上架前继续收紧。

运行命令：

```bash
npm run check:release-ios
```

验收：

- [x] 正确工作区运行通过。
- [x] 在旧工作区运行会失败。
- [x] 如果把 `ContentView.swift` 改成旧 root，脚本会失败。
- [x] 如果可见文案出现 `fixture 没有对应页面数据`，脚本会失败。

### Task 4：AI 处理同意机制

目标：满足第三方 AI 处理用户内容前的清楚披露和用户同意要求。

负责人：

- Codex 实现。
- 用户确认文案。

建议文件：

- iOS 新增/修改：
  - `拾贝/拾贝/V2/V2RootView.swift`
  - `拾贝/拾贝/V2/*Add*.swift` 或当前添加文章页面文件
  - `拾贝/拾贝/Services/APIClient.swift`
  - `拾贝/拾贝/Localizable.xcstrings`
- 后端新增/修改：
  - `backend/src/server.js`
  - 如需要可新建：`backend/src/privacyConsentStore.js`
  - 测试：`backend/src/tests/privacyConsent.test.js`

产品规则：

- [x] 第一次真实用户生成前出现 AI 处理说明。
- [x] 推荐好文预设内容可以浏览；如果点击“生成/导入”不调用第三方 AI，可不强制弹该说明，但文案不能误导。
- [x] 用户拒绝后，不开始真实 AI 生成。
- [x] 用户同意后，不在每次生成前重复打断。
- [x] 隐私说明里可以重新查看这段说明。

同意文案：

> 为了帮你把文章整理成知识点和练习题，Recallo 会将你提交的文章链接、提取到的正文和必要的上下文发送给第三方 AI 服务进行处理。我们不会把这些内容用于广告追踪。继续生成即表示你同意这项处理。

测试：

- [x] 首次生成前弹出说明。代码路径已接入，需真机视觉确认。
- [x] 拒绝后不会创建生成任务。拒绝仅清空 pending source，不调用 API。
- [x] 同意后能创建生成任务。确认后继续进入原有 `createV2Chapter` 流程。
- [x] 第二次生成不重复弹出。`@AppStorage("v2.hasAcceptedAIProcessingConsent")` 持久化同意状态。
- [x] 切语言、重启 App 后同意状态稳定。使用 `UserDefaults`/`@AppStorage`，不依赖当前语言。

### Task 5：免费每日额度系统

目标：用服务端规则控制 AI 成本，不能依赖前端禁用按钮。

负责人：

- Codex 实现。
- 用户确认每日额度数字。

建议文件：

- 后端：
  - `backend/src/server.js`
  - 新建：`backend/src/generationQuota.js`
  - 测试：`backend/src/tests/generationQuota.test.js`
- iOS：
  - `拾贝/拾贝/Services/APIClient.swift`
  - 添加文章页对应 SwiftUI 文件
  - `拾贝/拾贝/Localizable.xcstrings`

服务端规则：

- [x] 默认每日真实 AI 生成额度：3 篇。待用户最终确认额度数字。
- [x] 推荐好文预设章节导入不计入额度。
- [x] URL 格式错误、前置校验失败不计入额度。
- [x] job 已开始后取消，计入额度。
- [x] 已调用模型后失败，首版计入额度。
- [x] 每日额度按服务器日期计算，先使用 UTC 或固定 production timezone，并在文档中写明。

错误码：

- `quota_exceeded_daily_generation`
- `generation_quota_unavailable`

测试：

```bash
node --test backend/src/tests/generationQuota.test.js
npm run check
```

验收：

- [x] 连续第 4 次真实生成被服务端拒绝。
- [x] 推荐好文导入不影响额度。
- [x] 并发两次请求不能绕过额度。
- [x] 前端显示用户友好文案，不显示内部错误字段。

### Task 6：账号和数据恢复决策包

目标：在“只匿名”和“可选 Apple 登录”之间做最终首版决策，并明确数据删除/恢复边界。

负责人：

- Codex 出决策包。
- 用户拍板。

文件：

- 创建：`docs/account-data-recovery-decision-zh.md`
- 参考：`docs/production-readiness-architecture-audit-2026-06-29.md`
- 参考：`docs/ios-api-data-contract-zh.md`
- 参考：`backend/src/server.js`

必须写清楚：

- [x] 当前匿名 ID 如何生成、存储、上传。
- [x] 为什么之前发生过“切语言后数据丢失”的风险，当前如何防。
- [x] 如果不做账号，用户重装/换机时会怎样。
- [x] 如果做 Apple 登录，需要新增哪些表、接口、前端入口。
- [x] 如果做账号，删除账号必须删哪些表和字段。

决策输出：

| 选项 | 上架速度 | 数据恢复 | 审核复杂度 | 推荐 |
| --- | --- | --- | --- | --- |
| 匿名首版 | 快 | 弱 | 低 | 仅适合短期 |
| Apple 登录可选 | 中 | 强 | 中 | 推荐 |

验收：

- [x] 用户能基于文档做出首版是否做 Apple 登录的决策。
- [ ] 决策结果回写到本文档“当前开放决策”。

### Task 7：隐私政策和 App Privacy 标签更新

目标：让隐私政策、App 内说明、App Store Connect 标签和真实数据流一致。

负责人：

- Codex 起草和改文档。
- 用户在 App Store Connect 填写/确认。

文件：

- 修改：`docs/privacy-policy-zh.md`
- 修改：`docs/privacy-policy.html`
- 修改：`docs/app-store-review-submission-pack-zh.md`
- 如有 App 内文案：`拾贝/拾贝/Localizable.xcstrings`

必须覆盖：

- [x] 用户提交的链接、正文、生成内容。
- [x] 第三方 AI 处理说明。
- [x] 匿名设备 ID / 账号 ID。
- [x] APNs token。
- [x] 学习进度、收藏、通知。
- [x] 错误日志和诊断。
- [x] 数据删除入口和流程。
- [ ] 联系方式/支持方式。

验收：

- [x] 文档中品牌名全部为 Recallo。
- [x] App Privacy 标签草案和隐私政策一致。
- [x] 如果做 Apple 登录，隐私政策包含账号删除说明。
- [x] 如果不做 Apple 登录，隐私政策不误称有账号系统。

### Task 8：App Store 元数据和截图包

目标：准备可以直接填入 App Store Connect 的产品页材料。

负责人：

- Codex 起草文案。
- 用户确认语气和截图。

文件：

- 修改：`docs/app-store-metadata-zh.md`
- 创建：`docs/app-store-release-evidence/screenshots-checklist.md`

必须产出：

- [x] App Name：Recallo。
- [x] Subtitle：30 字符以内。
- [x] Promotional Text：170 字符以内。
- [x] Description。
- [x] Keywords：100 字符以内。
- [x] What’s New。
- [ ] Support URL。
- [ ] Privacy URL。
- [x] 年龄分级问卷建议答案。
- [x] 5-6 张截图脚本。

截图脚本：

- [x] 首页学习路径。
- [x] 添加文章。
- [x] 生成中页面。
- [x] 章节详情。
- [x] 做题页面。
- [x] 发现页推荐好文。

验收：

- [ ] 截图中没有旧名字、旧图标、旧 UI、debug 文案。
- [ ] 截图来自真实 TestFlight/Release 包，不来自旧工程。
- [x] 文案不承诺无法稳定保证的能力，例如“永久保存”“无限生成”。

### Task 9：生产稳定性验收包

目标：上架前把最容易导致差评和拒审的问题做一次端到端验收。

负责人：

- Codex 准备检查命令和验收表。
- 用户在真机上执行关键路径，必要时提供截图/录屏。

文件：

- 创建：`docs/app-store-release-evidence/production-acceptance-template.md`
- 参考：`docs/v2-production-deploy-runbook-zh.md`
- 参考：`docs/production-readiness-review-zh.md`

命令：

```bash
npm run check
xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme 'Recallo' -destination 'generic/platform=iOS' -configuration Release build CODE_SIGNING_ALLOWED=NO
curl -s https://shibei-production.up.railway.app/api/health
```

真机验收：

- [ ] 新用户首次打开。
- [ ] 推荐好文模拟生成。
- [ ] 用户真实生成成功。
- [ ] 生成失败和删除。
- [ ] 后台/锁屏通知。
- [ ] 复习进度恢复。
- [ ] 错题回插。
- [ ] 收藏/取消收藏。
- [ ] 切语言后数据不丢。

验收：

- [ ] 每个链路都有通过/失败记录。
- [ ] 每个失败项都有 issue/task 归属。
- [ ] 没有 P0/P1 问题时才进入 Task 10。

### Task 10：Archive 和 App Store Connect 提交流程

目标：用户可以按固定步骤打出正确包并提交审核。

负责人：

- 用户在 Xcode / App Store Connect 操作。
- Codex 提供检查和陪跑。

前置条件：

- [ ] Task 1-9 全部完成或明确豁免。
- [ ] `npm run check:release-ios` 通过。
- [ ] `npm run check` 通过。
- [ ] `npm run check:app-store-submit` 通过。
- [ ] iOS Release build 通过。
- [ ] Railway health 正常。

Xcode 操作：

- [ ] 打开官方工作区：`/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj`。
- [ ] 确认 scheme 是 `Recallo`。
- [ ] 确认 destination 是 `Any iOS Device (arm64)`。
- [ ] Product > Archive。
- [ ] Archive 完成后在 Organizer 中确认 App 名称、图标、版本号、build number。
- [ ] Distribute App > App Store Connect > Upload。

App Store Connect 操作：

- [ ] 选择刚上传的 build。
- [ ] 填写 App Privacy。
- [ ] 粘贴 Review Notes。
- [ ] 上传截图。
- [ ] 填写年龄分级。
- [ ] 填写 Support URL / Privacy URL。
- [ ] 提交审核。

提交后记录：

- [ ] build number。
- [ ] commit hash。
- [ ] Railway deployment id。
- [ ] 提交时间。
- [ ] App Review 状态。

验收：

- [ ] App Store Connect 显示 Waiting for Review / In Review。
- [ ] 本文档执行台账已更新。

## 7. 当前开放决策

| 决策 | 推荐 | 原因 | 状态 |
| --- | --- | --- | --- |
| 首版是否免费 | 是 | 降低审核和用户进入门槛 | 待确认 |
| 是否做每日额度 | 是 | 控制模型成本和滥用 | 已实现默认 3 次/UTC day，待用户确认数字 |
| 是否做付费积分/订阅 | 否，后置 | 避免首版 IAP 复杂度 | 建议后置 |
| 是否首版加入 Apple 登录 | 推荐可选加入 | 解决数据恢复和正式用户信任；匿名首版只适合短期 | 待用户拍板 |
| 是否强制登录后生成 | 否 | 会显著提高首次体验门槛 | 建议不强制 |
| 推荐好文是否计入额度 | 建议不计或单独计 | 预生成内容成本低，适合新手体验 | 待确认 |
| 旧匿名数据如何迁移 | 登录时可绑定当前匿名数据 | 防止用户升级后数据丢失 | 已给出方案，待是否做 Apple 登录决策 |

## 8. 执行台账

| 日期 | 动作 | 结果 | 证据/链接 | 下一步 |
| --- | --- | --- | --- | --- |
| 2026-07-02 | 建立 App Store 上架总控计划 | 已创建本文档 | `docs/app-store-release-readiness-plan-zh.md` | 按 Checkpoint 1 做差距审计 |
| 2026-07-02 | 补充 Apple 官方调研和审核风险 | 已加入 AI 同意、账号删除、隐私标签、年龄分级、截图等要求 | 本文档 1.3、3.2、3.4、3.5 | 生成 App Review 提交包草案 |
| 2026-07-02 | 细化为可执行任务拆解 | 已新增 Task 1-10，每个任务包含文件、步骤、验收和负责人 | 本文档第 6 节 | 从 Task 1 开始执行 |
| 2026-07-02 | 执行 Task 1：建立提交证据目录 | 已创建证据目录 README 和命名规则 | `docs/app-store-release-evidence/README.md` | 后续候选包证据持续写入该目录 |
| 2026-07-02 | 执行 Task 2：生成 App Review 提交包草案 | 已创建审核说明、隐私标签、年龄分级、截图和手动操作清单 | `docs/app-store-review-submission-pack-zh.md` | 进入 Task 3：Release/Archive 工程防错脚本 |
| 2026-07-02 | 执行 Task 3：Release/Archive 工程防错脚本 | 已新增 `npm run check:release-ios`；官方工作区通过，旧工作区调用失败；Railway/deviceId/旧 debug 参数列为 warning | `tools/release-archive-preflight.mjs`、`docs/app-store-release-evidence/2026-07-02-release-archive-preflight.md` | 进入 Task 4：AI 处理同意机制 |
| 2026-07-02 | 执行 Task 4：AI 处理同意机制 | 已新增真实生成前一次性 AI 处理同意弹窗；拒绝不创建任务，同意后持久化；隐私说明可回看；`npm run check:release-ios`、XcodeBuildMCP 模拟器构建、`npm run check` 均通过 | `拾贝/拾贝/V2/Components/V2AIProcessingConsentSheet.swift`、`docs/app-store-release-evidence/2026-07-02-ai-processing-consent.md` | 进入 Task 5：免费每日额度系统 |
| 2026-07-02 | 执行 Task 5：免费每日额度系统 | 已新增服务端每日真实生成额度；默认 3 篇/UTC day；推荐好文导入不计入；Postgres 使用 device+day 事务锁防并发绕过；`npm run check` 通过，204 tests passed | `backend/src/generationQuota.js`、`backend/src/tests/generationQuota.test.js`、`docs/app-store-release-evidence/2026-07-02-generation-quota.md` | 进入 Task 6：账号和数据恢复决策包 |
| 2026-07-02 | 执行 Task 6：账号和数据恢复决策包 | 已梳理匿名 deviceId 生成/存储/上传、数据“像丢失”的真实机制、匿名首版边界、Apple 登录所需表/接口/前端入口、账号删除范围 | `docs/account-data-recovery-decision-zh.md` | 等用户拍板是否首版加入 Apple 登录；可并行进入 Task 7 隐私政策更新 |
| 2026-07-02 | 推进 Task 7：隐私政策和 App Privacy 标签更新 | 已将隐私政策 Markdown/HTML 更新为 Recallo 当前真实数据流；同步 App Review 隐私标签草案、App Store 元数据草案和 App 内隐私/账号说明；仍缺公开支持邮箱 | `docs/privacy-policy-zh.md`、`docs/privacy-policy.html`、`docs/app-store-review-submission-pack-zh.md`、`docs/app-store-metadata-zh.md` | 用户提供支持邮箱；随后进入 Task 8 截图与元数据包 |
| 2026-07-02 | 推进 Task 8：App Store 元数据和截图包 | 已补 App Store 可填写字段、What’s New、Description、关键词核对、年龄分级建议和 6 张截图脚本；Support URL/Privacy URL 与真实截图仍需用户提供/上传 | `docs/app-store-metadata-zh.md`、`docs/app-store-release-evidence/screenshots-checklist.md` | 用户提供 URL 并按清单截取 Release/TestFlight 截图；Codex 进入 Task 9 生产稳定性验收包 |
| 2026-07-02 | 执行 Task 9：生产稳定性验收包 | 已创建可复制的上架前验收模板，覆盖自动检查、真机核心链路、网络异常、截图验收和 P0/P1/P2 分级 | `docs/app-store-release-evidence/production-acceptance-template.md` | 用户按模板跑真机验收；Codex 可继续 Task 10 Archive/提交陪跑文档 |
| 2026-07-02 | 推进 Task 10：Archive 和 App Store Connect 提交流程 | 已创建 Archive/提交 runbook，明确 Codex 可跑的检查、用户 Xcode 步骤、App Store Connect 填写顺序、停止条件和提交后记录字段 | `docs/app-store-archive-submit-runbook-zh.md` | 用户完成真机验收、提供 Support/Privacy URL 后，可按 runbook Archive 并上传 |
| 2026-07-02 | 收口用户手动事项和 release preflight | 已单独列出所有必须用户拍板/手动操作事项；`npm run check:release-ios` 通过，仍有非阻塞 warning 需在真机验收中确认不可见 | `docs/app-store-user-action-checklist-zh.md`、`docs/app-store-release-evidence/2026-07-02-user-action-and-preflight.md` | 等用户决策/URL/真机验收/截图；Codex 可继续陪跑检查和回写证据 |
| 2026-07-02 | 准备 Support URL / Privacy URL 静态页面 | 已新增支持页 HTML/Markdown 和 URL 发布说明；隐私页已有 HTML，可直接托管；仍缺正式支持邮箱和公开托管地址 | `docs/support.html`、`docs/support-zh.md`、`docs/app-store-url-publishing-guide-zh.md` | 用户提供支持邮箱并选择托管方式；Codex 回写最终 URL |
| 2026-07-02 | 自动 Release preflight 和生产 health 自检 | `npm run check:release-ios`、`npm run check`、production `/api/health` 均通过；推荐好文 catalog 为 9 篇、5 个 filter；仍有非阻塞 release visibility warning | `docs/app-store-release-evidence/2026-07-02-automated-release-preflight.md` | 用户完成 URL、真机验收和截图后进入 Archive |
| 2026-07-02 | 增加 App Store 最终提交 readiness guard | 已新增严格提交前检查和 report 模式，用于拦截支持邮箱、Support URL、Privacy URL、审核决策占位符未收口的情况；已接入一页式用户决策表检查；该检查不进入日常 `npm run check`，避免阻塞开发 | `tools/app-store-submit-readiness-guard.mjs`、`docs/app-store-release-evidence/2026-07-02-submit-readiness-guard.md` | 用户提供 URL/邮箱/决策后，Codex 回写并跑严格模式 |
| 2026-07-02 | 增加用户决策表解析工具 | 已新增 `npm run app-store:decision-report`，可解析一页式决策表并输出缺失字段与 JSON summary，为后续自动回写铺路 | `tools/app-store-decision-form-report.mjs`、`docs/app-store-release-evidence/2026-07-02-decision-form-parser.md` | 用户填表后，Codex 用该报告驱动文档回写 |
| 2026-07-03 | 增加用户行动分组报告 | 已新增 `npm run app-store:user-actions`，可按决策表章节分组输出仍需用户完成的事项，并列出用户补齐信息后 Codex 的自动回写动作 | `tools/app-store-user-action-report.mjs`、`docs/app-store-release-evidence/2026-07-03-user-action-report.md` | 用户按报告补齐决策/邮箱/URL/验收状态；Codex 再回写全部提交材料 |
| 2026-07-03 | 增加 App Store 截图规格审计 | 已新增 `npm run app-store:screenshot-audit` 和 `npm run check:app-store-screenshots`，默认检查 `docs/app-store-release-evidence/screenshots/app-store/` 下的 6.9 英寸 iPhone 竖屏截图数量、格式和尺寸 | `tools/app-store-screenshot-audit.mjs`、`docs/app-store-release-evidence/2026-07-03-screenshot-audit.md` | 用户放入 6 张正式截图后运行 strict 检查，全部通过后上传 App Store Connect |
| 2026-07-03 | 增加 App Store 状态总览 | 已新增 `npm run app-store:status`，聚合决策表、用户行动、截图、提交 readiness 和 iOS Release preflight，作为每日上架推进入口 | `tools/app-store-status.mjs`、`docs/app-store-release-evidence/2026-07-03-app-store-status.md` | 用户补齐决策和截图后先跑状态总览，再跑严格门禁 |
| 2026-07-03 | 增加推荐决策稿和用户回复模板 | 已把用户需要拍板的 26 项压缩成快速首版方案、稳健正式版方案和可直接复制回复的模板；同时新增机器可读 JSON 样例和决策表回写脚本，减少后续手工改表风险 | `docs/app-store-recommended-decisions-zh.md`、`docs/app-store-user-decision-values.example.json`、`tools/app-store-apply-user-decisions.mjs`、`docs/app-store-release-evidence/2026-07-03-recommended-decisions.md` | 用户确认采用推荐方案并提供邮箱/URL/验收/截图状态后，Codex 自动回写全部提交材料 |
| 2026-07-03 | 增加支持邮箱和 URL 自动回写脚本 | 已新增联系信息 JSON 样例和 `npm run app-store:apply-contact`，用于把支持邮箱、Privacy Policy URL、Support URL 同步到隐私政策、支持页、元数据、审核包、用户清单、Archive runbook 和 URL 发布说明；占位符会被拒绝，完整临时输入 dry-run 通过 | `docs/app-store-contact-values.example.json`、`tools/app-store-apply-contact-info.mjs`、`docs/app-store-release-evidence/2026-07-03-contact-info-apply-script.md` | 用户提供真实邮箱和两个 HTTPS URL 后，Codex dry-run 验证并自动回写 |
| 2026-07-03 | 增加真机验收门禁脚本 | 已新增 `npm run app-store:acceptance-audit -- <验收记录>` 和严格模式 `npm run check:app-store-acceptance -- <验收记录>`，用于拦截候选版本信息缺失、自动检查未通过、P0 未通过、P1 未通过且未豁免、截图未通过或最终结论未勾选；同时纳入 `npm run app-store:status` | `tools/app-store-acceptance-audit.mjs`、`docs/app-store-release-evidence/2026-07-03-acceptance-audit.md` | 用户完成真机验收记录后，用 report 模式定位缺口；严格模式通过后才进入 Archive |
| 2026-07-03 | 补充截图交付目录说明 | 已在 App Store 截图目录内新增 README，明确 6 张建议截图文件名前缀、6.9 英寸竖屏尺寸、截图前排雷清单和验收命令，降低截图交付和规格检查成本 | `docs/app-store-release-evidence/screenshots/app-store/README.md`、`docs/app-store-release-evidence/screenshots-checklist.md`、`docs/app-store-release-evidence/2026-07-03-screenshot-audit.md` | 用户把最终截图放入目录后运行 `npm run check:app-store-screenshots` |

## 9. 维护规则

- 每次完成一个 checkpoint，都要更新本文档状态。
- 每次 App Store / TestFlight 相关配置变化，都要记录日期、commit、build number。
- 每次隐私数据流变化，都要同步更新隐私政策和 App Privacy 标签。
- 每次引入付费、账号、第三方 SDK 或新 AI provider，都要重新做一轮合规审查。
- 不在本文档里写临时调试结论；临时证据放到 `docs/production-readiness-evidence/` 或对应专项文档。

## 10. 下一步建议

Task 1-10 的 Codex 可产出部分已经基本落入文档、脚本和台账。继续提交 App Store 前，下一步不应再扩散新功能，而应收敛到以下人工阻塞项：

完整用户手动事项见：`docs/app-store-user-action-checklist-zh.md`。

1. 用户按 `docs/app-store-recommended-decisions-zh.md` 第 4 节模板回复，或填写 `docs/app-store-user-decision-form-zh.md`，确认价格、额度、推荐好文计额、Apple 登录、支持邮箱和 URL。
2. Codex 根据决策表回写隐私政策、支持页、元数据、审核包和提交 guard。
3. 用户按 `docs/app-store-release-evidence/production-acceptance-template.md` 跑真机验收并补证据。
4. 用户按 `docs/app-store-release-evidence/screenshots-checklist.md` 准备 6 张截图。
5. 没有 P0/P1 后，按 `docs/app-store-archive-submit-runbook-zh.md` 进行 Archive 和 App Store Connect 上传。

- `docs/app-store-release-evidence/README.md`
- `docs/app-store-review-submission-pack-zh.md`
