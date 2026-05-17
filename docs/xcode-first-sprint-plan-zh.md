# 拾贝 Xcode 第一轮开发计划

> 目标：在 MacBook / Xcode 中先做出可运行的 SwiftUI mock 版本，完整复刻 HTML Demo 已验证的产品流，再接本地 Node API。

## 1. 第一轮边界

本轮做：

- 创建真实 SwiftUI iOS 工程。
- 定义本地模型和 mock service。
- 用 mock JSON 跑通完整页面流。
- 实现 ReviewSession 本地调度。
- 保持页面行为和 PRD / HTML Demo 一致。

本轮不做：

- 账号、登录、注册。
- 数据库和云端同步。
- APNs 推送。
- 订阅、支付、会员。
- 视频正文提取。
- 生产级异步任务队列。

## 2. 建议工程结构

建议路径：

```text
ios/ShiBei/
```

建议目录：

```text
ShiBei/
  Models/
  Services/
  ViewModels/
  Views/
  Components/
  Fixtures/
  Resources/
```

模型、接口和 JSON 字段以 `docs/ios-api-data-contract-zh.md` 为准。

## 3. Swift 模型清单

第一轮先定义这些 `Codable` 模型：

- `Chapter`
- `ChapterSource`
- `KnowledgePoint`
- `ReviewQuestion`
- `QuestionOption`
- `ReviewSession`
- `ReviewQueueItem`
- `ReviewAttempt`
- `QuestionFeedback`
- `NotificationItem`

枚举：

- `ChapterStatus`
- `SourceType`
- `KnowledgeType`
- `QuestionType`
- `ReviewSessionStatus`
- `AttemptResult`
- `FeedbackType`
- `NotificationType`

命名建议：

- Swift 使用 camelCase。
- JSON 解码可以通过 `CodingKeys` 兼容后端字段。
- 先不要把后端调试字段暴露给 View，调试字段只放在模型里备用。

## 4. Mock Service

先实现本地 mock service，不接网络：

### ChapterService

- `listChapters()`
- `getChapter(id:)`
- `createChapter(input:)`
- `regenerateChapter(id:)`
- `deleteChapter(id:)`

### ReviewService

- `startOrResumeSession(chapterId:)`
- `getSession(chapterId:)`
- `submitAttempt(sessionId:questionId:answer:result:)`
- `submitFeedback(questionId:type:)`

### NotificationService

- `listNotifications()`
- `markRead(id:)`
- `dismiss(id:)`

mock 数据来自 `docs/fixtures/ios/`。

## 5. 页面优先级

按这个顺序做页面：

1. 底部导航：`首页 / 章节 / + 添加 / 通知 / 我的`
2. 首页：空状态、可复习状态、继续复习入口。
3. 添加知识页：文字 / 链接输入，提交后回首页并显示提交成功提示。
4. 全部章节页：已生成、处理中、失败三种卡片。
5. 通知页：成功 / 失败通知，点击进入章节详情。
6. 章节详情页：已生成、处理中、失败三种状态。
7. 完整知识点页。
8. 题卡页：未作答、答对、答错、不知道。
9. 解释页：正确答案、正确理解、常见误区、来源片段。
10. 题目反馈弹窗。
11. 来源详情页。
12. 章节总结页。
13. 删除章节确认弹窗。

## 6. ReviewSession 规则

第一轮本地实现，不依赖后端：

- 一个章节同时只允许一个未完成 ReviewSession。
- 首次开始复习时按知识点生成队列。
- 答对：首次 `+15`，强化 `+10`。
- 答错 / 不知道：首次 `-20`，强化 `-15`。
- 答错 / 不知道后，该知识点进入强化队列。
- 强化题固定间隔 3 道其他题后出现；如果不足 3 道，排到本轮末尾。
- 所有未跳过知识点本轮答对，且强化队列为空，章节才完成。
- 章节完成页不提供“再来一轮”。
- 严重反馈撤销最近一次 attempt，并把题从本轮移除。
- `too_easy` 只降权，不撤销 attempt、不移除题。

## 7. 验收标准

不接网络时也必须能完成：

- 空首页 -> 添加页 -> 提交成功浮窗 -> 首页。
- 首页开始 / 继续复习。
- 章节页进入任意章节详情。
- 通知点击进入对应章节详情。
- 失败章节可查看原因，不允许开始复习。
- 题卡答对 / 答错 / 不知道后进入正确流程。
- 答错 / 不知道后能按间隔 3 题强化。
- 严重反馈能移除题并继续复习。
- 章节完成后进入总结页，并可继续下一章。
- 删除章节后，章节、通知和本地复习状态同步消失。

## 8. 接本地 API 的时机

当 mock 版页面流稳定后，再接：

```text
GET    /api/chapters
GET    /api/chapters/:id
POST   /api/chapters
POST   /api/chapters/:id/regenerate
DELETE /api/chapters/:id
GET    /api/notifications
POST   /api/chapters/:id/review-session
POST   /api/review-sessions/:id/attempts
POST   /api/questions/:id/feedback
```

iOS 端只处理用户可见状态，不承载生成 prompt、质量检查或正文提取逻辑。
