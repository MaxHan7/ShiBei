# Recallo App Store Connect Copy Pack - 2026-07-04

> 这份文件用于在 App Store Connect 提交页复制粘贴。它由 `npm run app-store:create-connect-copy-pack` 从元数据草案、审核提交包、用户决策表和截图清单生成。提交前必须确保 Blockers 为 0。

| 字段 | 值 |
| --- | --- |
| 日期 | 2026-07-04 |
| Git commit | afdc14953a4c |
| Branch | codex/recallo-review-replay-mode |
| 工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` |
| App | Recallo |
| Bundle ID | `com.maxhan.shibei` |

## Blockers

- App Store field is not finalized: privacyUrl
- App Store field is not finalized: supportUrl
- User decision form still contains pending values.
- Metadata still points to local/pending support or privacy URLs.
- Review submission pack still contains pending decisions.

## App Information

| App Store Connect 字段 | 可粘贴内容 |
| --- | --- |
| App Name | Recallo |
| Subtitle | 把文章变成练习题 |
| Category | Education |
| Secondary Category | Productivity |
| Price | Free |
| In-App Purchases | 首版不启用 |
| Privacy Policy URL | `docs/privacy-policy.html` 已准备，待部署公开 URL |
| Support URL | `docs/support.html` 已准备，待部署公开 URL 和支持邮箱 |

## Version Information

### Promotional Text

把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。

### Description

Recallo 是一款帮助你把文章和长内容真正学进去的学习工具。

每天都有大量值得学习的文章、观点和信息，但它们通常太新、太散，很难被及时整理成系统课程。Recallo 会把你提交的文章链接或文字整理成学习章节，提取知识点，生成练习题，并保留来源上下文。

你可以用 Recallo：

- 添加文章链接或文字
- 生成知识点、学习路径和练习题
- 通过题卡检查自己是否真正理解
- 答错后查看解释和来源依据
- 收藏题目，继续之前的学习进度
- 接收生成完成或失败提醒

当前版本不强制登录账号，使用匿名设备身份保存当前设备下的数据。你提交的内容会上传到 Recallo 云端，并可能经第三方 AI 模型服务处理，用于生成学习材料。App 内提供 AI 处理说明、隐私说明和删除当前设备数据的入口。

Recallo 适合想把文章、观点、产品案例、AI 内容和深度阅读变成可复习知识的人。

### Keywords

```text
学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习
```

### What's New

- 全新 Recallo 品牌、启动页和主流程视觉。
- 支持把文章链接或文字生成学习章节。
- 支持知识点、练习题、解释、收藏和学习进度。
- 支持生成完成/失败通知和当前设备数据删除。
- 增加 AI 处理说明、每日免费生成额度和上架前隐私说明。

## App Review

### Review Notes

```text
Recallo is an AI-assisted learning app. Users can provide an article URL or text, and the app turns the content into a study chapter with knowledge points, practice questions, explanations, and source references.

Core review path:
1. Open the app.
2. Go to Discover and choose a recommended article.
3. Tap the start button. The app shows a simulated generation progress page for this pre-generated recommended article.
4. When the progress completes, open the generated chapter detail page.
5. Tap Start Learning / Continue Learning.
6. Complete at least one multiple-choice or matching question.
7. Open the explanation/source view to see how the question relates to the original content.

User-generated article path:
1. Open the add/generate screen.
2. Paste a public article URL or text.
3. Before the first real AI generation, the app explains that submitted article content may be sent to a third-party AI service to generate learning materials.
4. Continue generation after accepting the disclosure.
5. The app shows a generation progress page and sends a push notification when generation succeeds or fails.

AI and data processing:
Submitted article URLs, extracted text, and necessary context may be processed by a third-party AI service to generate study chapters and practice questions. This is disclosed before the first real user-generated AI request. The app does not use submitted content for advertising tracking.

Notifications:
Push notifications are used only to notify users when chapter generation succeeds or fails.

Account:
Use one of the following based on the final release decision:
- Anonymous-first release: The app does not require account sign-in for the first version. Learning data is associated with the user's device identifier.
- Optional Sign in with Apple release: Sign in with Apple is optional and is used to save and recover learning data. Account deletion is available from Profile > Account.

Payments:
The first App Store version is free. It does not include subscriptions, in-app purchases, ads, or external payment links.
```

### TestFlight / Beta Test Notes

```text
Please test Recallo with an article you genuinely want to learn from.

Suggested flow:
1. Open the app and check the home learning path.
2. Use a recommended article from Discover to experience the fast first-run flow.
3. Add your own article URL or text and wait for generation.
4. Open the generated chapter and complete one learning unit.
5. Check an explanation/source page after answering a question.
6. Try backgrounding the app while a chapter is generating and confirm the notification behavior.

Please pay special attention to:
- Whether the first-run experience is clear.
- Whether generation status and failures are understandable.
- Whether questions feel useful rather than obvious.
- Whether progress resumes from the correct place.
- Whether notifications arrive at the right time.
```

## App Privacy Labels

| 项目 | 当前首版填写建议 |
| --- | --- |
| 是否用于追踪 | 否 |
| 是否接入广告 SDK | 否 |
| 是否出售用户数据 | 否 |
| 是否收集定位/通讯录/相册/麦克风/金融信息 | 否 |
| 是否收集用户内容 | 是 |
| 是否收集标识符 | 是 |
| 是否收集使用数据 | 是 |
| 是否收集诊断数据 | 是 |

## 2. 需要声明的数据类型

| Apple 数据类型 | Recallo 示例 | 用途 | 是否关联用户 | 是否用于追踪 | 填写建议 |
| --- | --- | --- | --- | --- | --- |
| User Content | 用户提交的文章链接、提取正文、生成章节、知识点、题目、解释、来源引用 | App Functionality | 是 | 否 | 声明 |
| Identifiers | 匿名设备 ID、Apple 登录账号 ID（如果首版启用）、APNs token | App Functionality | 是 | 否 | 声明 |
| Usage Data | 学习进度、答题结果、收藏、反馈、通知状态、每日生成额度记录 | App Functionality、Analytics | 是 | 否 | 声明 |
| Diagnostics | 生成失败类别、队列状态、推送送达状态、脱敏错误日志 | App Functionality、Analytics | 是 | 否 | 声明 |

## 3. 不应声明的数据类型

当前首版不应声明以下数据类型，除非后续功能发生变化：

- Contact Info
- Location
- Contacts
- Photos or Videos
- Audio Data
- Health and Fitness
- Financial Info
- Sensitive Info
- Advertising Data
- Browsing History
- Search History
- Purchases

## 4. App Store Connect 填写注意

- `User Content` 必须覆盖用户提交文本/链接和生成后的学习内容，因为这些内容会存储在服务端用于恢复章节。
- `Identifiers` 必须覆盖匿名设备 ID 和 APNs token，因为它们用于数据归属、通知和额度控制。
- `Usage Data` 必须覆盖学习进度、答题、收藏、反馈和额度记录。
- `Diagnostics` 建议声明，因为生产诊断会记录生成失败类型、队列状态、推送结果和脱敏错误类别。
- 所有已声明数据类型均应选择“不用于追踪”。
- 如果首版暂不做 Apple 登录，App Privacy 不应写成已有账号系统。
- 如果首版加入 Apple 登录，需要同步确认是否新增 Contact Info 或 User ID 相关填写，并且必须完成账号删除入口。
- 如果支持邮箱只是用户主动从邮件客户端联系，不是 App 内收集邮箱，首版可不声明 Contact Info。

Source: `docs/app-store-privacy-labels-zh.md`. Before submitting, run `npm run check:app-store-privacy-labels` and fill App Store Connect > App Privacy manually from this section.

## Age Rating

提交前需要用户在 App Store Connect 问卷中按真实情况确认。Apple 已将年龄分级更新为 iOS 26 / iPadOS 26 / macOS Tahoe 26 等系统上的新年龄值和问卷口径；2026 年提交时不要沿用旧截图或旧问卷记忆，必须在当前 App Store Connect 页面重新走一遍问卷。

操作路径：

1. App Store Connect > Apps > Recallo > App Information。
2. 找到 Age Rating / 年龄分级，点击 Set Up Age Ratings 或 Edit。
3. 逐屏按当前真实产品能力填写，并在完成页截图留证。
4. 把完成截图或最终结果记录到 `.release/app-store-inputs/external-console-checks.json` 的 `appStoreConnect.ageRatingCompleted`。

当前产品形态建议：

| 问题方向 | 建议答案 | 理由 |
| --- | --- | --- |
| 暴力/恐怖内容 | 无或极少/轻微 | App 本身不生成娱乐暴力内容 |
| 成人/性内容 | 无 | 产品定位为学习工具 |
| 赌博/竞赛 | 无 | 无赌博机制 |
| 医疗/健康建议 | 无 | 不作为医疗产品 |
| 用户生成内容公开展示 | 无 | 用户内容不公开给其他用户 |
| 无限制网页访问 | 无 | 原文链接可跳外部网页，但 App 核心不是浏览器；提交前需按 Apple 问卷具体措辞确认 |
| AI 生成内容 | 有 AI 生成学习内容 | 需要在审核备注和隐私说明中主动说明 |

填写边界：

- 用户粘贴 URL 或跳转外部原文，不等于 App 内提供通用网页浏览器；如果问卷明确问“unrestricted web access”，当前建议选 No。
- 用户输入内容只用于个人生成，不公开展示给其他用户；当前不应按社区/公开 UGC 产品填写。
- 如果未来加入公开社区、用户互相发布内容、通用网页浏览器、儿童专区、敏感主题推荐或内容过滤能力，需要重新评估年龄分级。
- 如果 App Store Connect 因用户输入文本/AI 内容提出更细问题，以当前真实能力为准，不要为了低年龄分级隐瞒 AI 处理。

## Screenshot Checklist

- 来源：真实 iPhone 或 iOS Simulator 中的 Release/TestFlight 包。
- 数量：Apple 允许每个本地化上传 1 到 10 张截图；Recallo 首版产品展示建议准备 6 张。
- 格式：`.png`、`.jpg` 或 `.jpeg`。
- 方向：竖屏。
- 首选设备：6.9 英寸 iPhone 截图；若 UI 在各尺寸一致，可让 App Store Connect 缩放。
- 可接受尺寸：`1260x2736`、`1290x2796`、`1320x2868`。
- 禁止出现：旧“拾贝”品牌名、旧图标、debug 文案、fixture 文案、Railway 文案、JSON/decode/本地数据缺失提示。

截图保存目录：

```text
docs/app-store-release-evidence/screenshots/app-store/
```

目录内交付说明：

```text
docs/app-store-release-evidence/screenshots/app-store/README.md
```

推荐文件名：

```text
01-home-learning-path.png
02-add-article.png
03-generating.png
04-chapter-detail.png
05-question-card.png
06-discover-recommendations.png
```

保存后先运行 report 模式：

```bash
npm run app-store:screenshot-audit
```

提交前运行 strict 模式。strict 只拦截 Apple 基础规格问题；推荐 6 张场景缺失会输出 warning，仍建议补齐后再提交：

```bash
npm run check:app-store-screenshots
```

## 截图 1：首页学习路径

- 目标：展示 Recallo 的核心结果不是摘要，而是可继续学习的路径。
- 画面：首页有正在学习章节、学习路径节点、底部 Tab。
- 推荐文案：把文章变成练习题
- 检查点：
  - 顶部按钮位置正确。
  - 当前章节标题真实，不是 Mock。
  - 没有空状态或生成中章节抢占正在学习章节。

## 截图 2：添加文章

- 目标：展示用户可以从文章链接或文字开始。
- 画面：添加页输入框、开始生成按钮、视觉状态完整。
- 推荐文案：粘贴链接，生成学习章节
- 检查点：
  - 按钮可读、未越界。
  - 没有调试 URL、Railway、mock switch。
  - 如果展示 AI 说明，文案应和隐私政策一致。

## 截图 3：生成中页面

- 目标：展示生成过程可预期，完成后会通知。
- 画面：章节正在生成、进度条、查看原文按钮、取消生成按钮。
- 推荐文案：生成完成会提醒你
- 检查点：
  - 阶段文案简短、用户可理解。
  - 没有模型内部字段或 schema 错误。
  - 取消生成按钮不遮挡安全区。

## 截图 4：章节详情

- 目标：展示生成后的章节结构和开始/继续学习入口。
- 画面：章节标题、作者/查看原文、文章核心、知识点列表、开始学习按钮。
- 推荐文案：知识点和题目已整理好
- 检查点：
  - 知识点全部可展示或可滚动查看。
  - 作者字段不是空或占位。
  - 删除按钮和返回按钮位置一致。

## 截图 5：做题页面

- 目标：展示 Recallo 用题卡帮助用户检查理解。
- 画面：选择题或连线题，选项排版清楚。
- 推荐文案：用题卡检查理解
- 检查点：
  - 题干和选项层级明显。
  - 选项没有文字截断或不合理省略。
  - 连线题卡片高度统一且间距一致。

## 截图 6：发现页推荐好文

- 目标：展示新用户可以从精选内容快速体验核心流程。
- 画面：发现页 Banner、精简后的 filter、推荐文章卡片和封面。
- 推荐文案：从精选好文开始学习
- 检查点：
  - filter 可横向滚动，不顶到屏幕边缘。
  - 封面图真实显示。
  - 推荐文章不是只有一篇，标题/作者/tag 可读。

## Manual Submit Checklist

- [ ] App Store Connect 中选择现有 `com.maxhan.shibei` 对应 App，不创建新 App。
- [ ] 选择最新 Recallo build。
- [ ] 粘贴本文件里的 App Information、Version Information、Review Notes。
- [ ] 填写 App Privacy 标签并截图留证。
- [ ] 填写年龄分级并截图留证。
- [ ] 上传 6 张正式截图。
- [ ] 提交审核后，把提交时间、build number 和 App Store Connect 状态回写到 release evidence。
