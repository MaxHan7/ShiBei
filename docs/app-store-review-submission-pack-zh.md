# Recallo App Store 审核提交包草案

> 本文档用于准备 App Store Connect 审核提交材料。提交前必须与当前 TestFlight/Archive build、隐私政策、App Privacy 标签和真实产品行为逐项核对。

## 1. 提交前状态

| 项目 | 当前建议 | 状态 |
| --- | --- | --- |
| App 名称 | Recallo | App Store Connect 最终核对项 |
| Bundle ID | `com.maxhan.shibei` | 沿用旧 TestFlight/App Store 产品，避免重新配置通知 |
| 价格 | 免费 | 首版决策已定 |
| 订阅/IAP | 首版不接入 | 建议确认 |
| 广告 | 不接入 | 建议确认 |
| 第三方分析 SDK | 不接入 | 建议确认 |
| 账号 | 可选 Apple 登录；匿名仍可直接使用；App 内提供删除账号入口 | Apple Developer capability / signing 最终核对项 |
| AI 服务 | 服务端调用第三方 AI 模型 | 必须披露 |
| Push 通知 | 仅用于章节生成成功/失败提醒 | 已接入，需真机复验 |

## 2. App Review Notes 草案

可复制到 App Store Connect 的 Review Notes。提交前根据账号决策保留对应段落。

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

## 3. TestFlight / App Store 测试说明草案

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

## 4. App Privacy 标签填写草案

> 最终填写以 App Store Connect 当前问卷为准。本表用于保证“隐私政策、App 内文案、真实数据流、App Privacy 标签”一致。

| Apple 数据类型 | Recallo 示例 | 用途 | 是否与用户关联 | 是否用于追踪 | 建议声明 |
| --- | --- | --- | --- | --- | --- |
| User Content | 用户提交的文章链接、正文、生成章节、题目、解释、来源上下文 | App 功能：生成和恢复学习内容 | 是，关联匿名设备或账号 | 否 | 声明 |
| Identifiers | 匿名设备 ID、账号 ID、APNs token | App 功能：区分用户、发送通知、恢复数据 | 是 | 否 | 声明 |
| Usage Data | 学习进度、答题结果、收藏、通知状态、反馈、每日生成额度使用 | App 功能：恢复学习状态、控制免费额度、改善体验 | 是 | 否 | 声明 |
| Diagnostics | 错误类型、生成失败码、服务诊断信息 | App 功能/诊断：排查生成和通知问题 | 可能关联设备 | 否 | 若生产日志保留诊断，应声明 |
| Contact Info | 邮箱 | 仅当用户主动通过支持邮箱联系，或账号系统返回私有转发邮箱时 | 不用于追踪 | 否 | 支持邮件由用户主动发送；Sign in with Apple 邮箱仅用于账号识别和数据恢复 |
| Location | 无 | 无 | 否 | 否 | 不声明 |
| Contacts | 无 | 无 | 否 | 否 | 不声明 |
| Photos or Videos | 无 | 无 | 否 | 否 | 不声明 |
| Audio Data | 无 | 无 | 否 | 否 | 不声明 |
| Financial Info | 无 | 无 | 否 | 否 | 不声明 |
| Advertising Data | 无 | 无 | 否 | 否 | 不声明 |

## 5. AI 处理披露文案

App 内首次真实 AI 生成前建议展示：

```text
为了帮你把文章整理成知识点和练习题，Recallo 会将你提交的文章链接、提取到的正文和必要的上下文发送给第三方 AI 服务进行处理。我们不会把这些内容用于广告追踪。继续生成即表示你同意这项处理。
```

按钮建议：

- 主按钮：`同意并开始生成`
- 次按钮：`暂不生成`

拒绝后的产品行为：

- 不创建真实 AI 生成任务。
- 保留用户输入内容，允许用户返回编辑或取消。
- 仍允许浏览推荐好文和已存在章节。

## 6. 年龄分级预填建议

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

## 7. 截图清单

首版建议 6 张 iPhone 截图。所有截图必须来自正确的 Recallo Release/TestFlight 包。

| 顺序 | 场景 | 截图要求 | 状态 |
| --- | --- | --- | --- |
| 1 | 首页学习路径 | 显示当前学习章节和路径，不出现空状态误闪 | 未拍摄 |
| 2 | 添加文章 | 显示粘贴链接/文本入口，不出现 debug 文案 | 未拍摄 |
| 3 | 生成中 | 显示章节正在生成、进度条、查看原文按钮 | 未拍摄 |
| 4 | 章节详情 | 显示知识点、作者/查看原文、开始/继续学习按钮 | 未拍摄 |
| 5 | 做题页 | 显示选择题或连线题，题干和选项排版正常 | 未拍摄 |
| 6 | 发现页推荐好文 | 显示推荐文章卡片、封面、精简 filter | 未拍摄 |

截图拒收标准：

- 出现“拾贝”旧品牌名。
- 出现旧图标。
- 出现 `fixture`、`Railway`、`deviceId`、decode/path/debug 文案。
- 出现明显错误 UI，例如连线题旧硬编码排版、按钮越界、页面缺失。
- 数据明显是 mock 且不符合真实产品逻辑。

## 8. App Store 元数据草案

### 8.1 Subtitle 候选

限制 30 字符以内：

1. Turn articles into practice
2. Learn from every article
3. Study articles with AI
4. Make reading memorable

中文市场可考虑：

1. 把文章变成练习题
2. 让读过的内容留下来
3. 用 AI 学懂每篇文章

### 8.2 Description 英文草案

```text
Recallo helps you turn articles and long-form content into active learning.

Paste an article URL or text, and Recallo organizes it into a study chapter with key ideas, practice questions, explanations, and source references. Instead of only saving or summarizing what you read, Recallo helps you check whether you truly understood it.

What you can do:
- Generate study chapters from articles or text
- Review key ideas through practice questions
- See explanations and source references after answering
- Save favorite questions and continue unfinished learning paths
- Use curated recommended articles for a faster first experience

Recallo is designed for learners, builders, product thinkers, and curious readers who want new information to become usable knowledge.

The first version is free and does not include ads, subscriptions, or external payment links.
```

### 8.3 Keywords 草案

限制 100 字符以内，逗号分隔，不使用竞品名：

```text
learning,study,AI,articles,reading,quiz,knowledge,notes,memory,review
```

## 9. 用户必须手动完成的项目

| 项目 | 用户操作位置 | 需要提供/确认给 Codex |
| --- | --- | --- |
| App Store Connect App 信息 | App Store Connect > App Information | App 名称、副标题、分类、年龄分级截图 |
| App Privacy 标签 | App Store Connect > App Privacy | 按第 4 节填写后的截图 |
| Push capability | Apple Developer / Xcode Signing & Capabilities | 是否已开启 |
| Sign in with Apple capability | Apple Developer / Xcode Signing & Capabilities | 如果决定做账号，需要确认已开启 |
| Archive 上传 | Xcode Organizer | build number、上传成功截图 |
| 截图上传 | App Store Connect > App Store 版本页 | 截图是否接受 |
| 提交审核 | App Store Connect | 提交时间和审核状态 |

## 10. 提交前最终检查

- [ ] `docs/app-store-release-readiness-plan-zh.md` 的开放决策已更新。
- [ ] 本文档账号段落已根据最终决策保留正确版本。
- [ ] 隐私政策 URL 可公开访问。
- [ ] App Privacy 标签与隐私政策一致。
- [ ] 截图来自正确 Recallo build。
- [ ] Review Notes 没有中文旧品牌名和占位符。
- [ ] 如果首版暂不做 Apple 登录，审核说明和隐私政策不得误称已有账号系统。
- [ ] Production `/api/health` 正常。
- [ ] TestFlight/Release 真机验收无 P0/P1。
- [ ] 提交 build 的 commit hash、build number、Railway deployment id 已记录。

## 11. 对外联系与 URL

- Support URL：https://shibei-production.up.railway.app/support
- Privacy Policy URL：https://shibei-production.up.railway.app/privacy
- 支持邮箱：mingyuhan0814@gmail.com
