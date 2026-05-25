# 拾贝 iOS API / 数据结构契约

> 这份文档用于 MacBook / Xcode 迁移阶段。它定义 iOS 端应使用的 Swift `Codable` 模型、Service 方法和状态处理口径。PRD 仍是产品需求源头；本文只收口当前 HTML Demo + Node 后端已经验证过的接口和数据形状。

## 1. 使用原则

- iOS 端不直接调用大模型，不承载 prompt、题目质量判断或文章正文提取逻辑。
- iOS 端通过后端 API 获取章节、题目、复习会话、通知和失败状态。
- iOS 端在云端 / 本地 API 模式下为每个请求附带匿名设备身份请求头 `X-Device-Id`。第一版不做账号，后端按设备隔离数据。
- MVP 中 `Chapter` 同时保存来源信息，不单独拆 `Source` 表。
- 当前云端原型使用 PostgreSQL 持久化章节、生成任务和通知；本地没有 `DATABASE_URL` 时仍 fallback 到内存，方便 HTML Demo 和调试。
- `/api/chapters` 是未来 iOS 主入口；`/api/generate` 只保留给 HTML Demo 和调试兼容。

## 2. 枚举

### ChapterStatus

```text
submitted
extracting_content
generating_points
generating_questions
quality_checking
auto_regenerating_questions
completed
failed_extract_article
failed_extract_video
failed_points
failed_questions
failed_no_qualified_questions
```

前台文案映射：

| status | iOS 展示 |
| --- | --- |
| `completed` | 已生成 |
| `submitted` / `extracting_content` / `generating_points` / `generating_questions` / `quality_checking` / `auto_regenerating_questions` | 处理中 |
| `failed_extract_article` | 文章正文提取失败 |
| `failed_extract_video` | 当前暂未接入视频文本提取 |
| `failed_points` | 暂时没能提取出可复习知识点 |
| `failed_questions` / `failed_no_qualified_questions` | 暂时没能生成可复习题目 |

`auto_regenerating_questions` 是后端内部自动恢复阶段，前端不得展示“正在重新生成题目”，应继续显示“正在检查题目质量”，避免让用户感知为生成失败后又从头来过。

### SourceType

```text
text
article_link
wechat_article
video_link
```

### KnowledgeType

```text
concept
judgment
method
scenario
counterexample
comparison
step
```

### QuestionType

```text
multiple_choice
true_false
scenario_judgment
```

### ReviewSessionStatus

```text
active
completed
abandoned
```

### AttemptResult

```text
correct
incorrect
unknown
```

### FeedbackType

```text
answer_wrong
too_easy
unclear
unrelated_to_source
```

严重反馈：`answer_wrong`、`unclear`、`unrelated_to_source`。  
轻反馈：`too_easy`。

## 3. 核心模型

### Chapter

```json
{
  "id": "chapter-1",
  "title": "如何把 AI Agent 用进你的生意",
  "status": "completed",
  "displayStatusText": "已生成",
  "failureReason": "",
  "source": {},
  "sourceType": "wechat_article",
  "sourceText": "原始或提取后的正文",
  "coreSummary": "这篇内容围绕企业使用 AI 的真实落地问题展开，重点讨论信任、场景识别和低风险验证如何影响 AI 顾问的价值。",
  "knowledgePoints": [],
  "filteredKnowledgePoints": [],
  "questions": [],
  "qualitySummary": {},
  "generationMeta": {},
  "reviewSession": null,
  "masteredPoints": 0,
  "removedQuestionIds": [],
  "downgradedQuestionIds": [],
  "feedbackRecords": [],
  "dismissedFromNotifications": false,
  "createdAt": "2026-05-16T00:00:00.000Z",
  "updatedAt": "2026-05-16T00:00:00.000Z"
}
```

`coreSummary` 是章节总结页展示的文章整体核心摘要，基于原文全文生成，不是知识点列表、题目解释或复习建议；旧章节可能为空字符串。

### ChapterSource

```json
{
  "type": "article_link",
  "title": "文章标题",
  "url": "https://example.com/article",
  "accountOrDomain": "example.com",
  "rawInput": "用户粘贴的原始输入",
  "extractedText": "提取后用于生成题目的正文",
  "chapterId": "chapter-1"
}
```

兼容字段：当前 Demo 仍可能读取 `account`、`rawText`、`cleanedText`，它们分别等价于 `accountOrDomain`、`rawInput`、`extractedText`。

### KnowledgePoint

```json
{
  "id": "kp-1",
  "chapterId": "chapter-1",
  "title": "行业 AI 顾问的机会",
  "summary": "企业知道需要 AI，但缺少可信的落地顾问。",
  "keyClaim": "AI 顾问价值来自帮企业识别真实场景和建立信任。",
  "knowledgeType": "scenario",
  "structureRole": "method_step",
  "importanceScore": 4,
  "coverageReason": "该点既支撑文章主线，也能迁移为判断企业 AI 落地机会的方法。",
  "sourceSnippet": "公司知道自己需要 AI，只是不知道该信任谁。",
  "sourceQuote": "公司知道自己需要 AI，只是不知道该信任谁。",
  "sourceOrder": 0,
  "sourceStartOffset": 124,
  "sourceEndOffset": 148,
  "testabilityScore": 4,
  "masteryScore": 50,
  "answeredCount": 0,
  "lastReviewedAt": null,
  "lastDecayAppliedAt": null,
  "createdAt": "2026-05-16T00:00:00.000Z",
  "updatedAt": "2026-05-16T00:00:00.000Z"
}
```

`masteryScore` 前台不展示，只影响复习队列和强化逻辑。

`structureRole`、`importanceScore`、`coverageReason` 用于服务端筛选和质量评测。MVP 采用“主线 + 可用方法型”：知识点数量随文章长短和内容密度变化，短内容可以只有少量知识点，普通文章通常保持精简，长文、清单、访谈或多段论证可以保留更多必要节点；无论数量多少，都优先覆盖文章核心观点，并保留可迁移的方法、判断原则、适用场景和少量关键误区。旧章节可能缺少这些字段，iOS 必须兼容缺失值。

### ReviewQuestion

```json
{
  "id": "q-1",
  "chapterId": "chapter-1",
  "knowledgePointId": "kp-1",
  "pointId": "kp-1",
  "pointTitle": "行业 AI 顾问的机会",
  "type": "scenario_judgment",
  "stem": "某家传统企业想尝试 AI，但不知道从哪里开始。哪种服务最符合文章中的机会判断？",
  "options": [
    { "id": "A", "text": "直接销售通用提示词模板" },
    { "id": "B", "text": "帮企业识别场景、评估风险并陪跑落地" },
    { "id": "C", "text": "只推荐最热门的大模型工具" },
    { "id": "D", "text": "先做一个完全自动化系统替代所有员工" }
  ],
  "correctOptionId": "B",
  "correctUnderstanding": "AI 顾问的核心不是卖工具，而是帮助企业把 AI 用到可信、具体、低风险的业务场景中。",
  "commonMisconception": "容易把 AI 顾问理解成工具推荐或模板售卖。",
  "sourceSnippet": "真正的问题是，公司知道自己需要 AI，只是不知道该信任谁。所以 AI 顾问的价值不只是推荐工具，而是通过低风险试点、边界说明和证据回看帮助团队建立信任。",
  "sourceOrder": 0,
  "sourceStartOffset": 124,
  "sourceEndOffset": 148,
  "difficulty": "medium",
  "qualityScore": {},
  "qualityIssues": [],
  "trustDiagnostics": {
    "answerGroundingScore": 5,
    "explanationFaithfulnessScore": 4,
    "contextRelevanceScore": 5,
    "misconceptionSupportScore": 3
  },
  "confidenceReasons": [],
  "blockingReasons": [],
  "confidenceLevel": "high"
}
```

`confidenceLevel` 取值为 `high` / `low`。`low` 表示该题未完全通过质量审查，但结构完整、来源基本可支撑、答案唯一，因此作为低置信题进入复习池；第一版 iOS 不向用户展示该标签，只用于质量工作台、debug 和后续迭代。

`trustDiagnostics` 是后端可信度诊断，不是人工金标：

- `answerGroundingScore`：正确答案是否被来源上下文支撑。
- `explanationFaithfulnessScore`：解释是否忠实于来源和正确答案。
- `contextRelevanceScore`：来源片段是否是帮助理解题目的有效上下文。
- `misconceptionSupportScore`：常见误区是否与题目和来源相关。

`confidenceReasons` 记录低置信原因，例如 `weak_source_support`、`weak_explanation_faithfulness`、`weak_context_relevance`、`question_type_mismatch`、`judge_rewrite`。`blockingReasons` 记录不可入池原因，例如 `answer_not_unique`、`structure_invalid`、`weak_source_support`。

`sourceOrder`、`sourceStartOffset`、`sourceEndOffset` 用于保持章节内顺序和来源定位。`sourceOrder` 表示知识点或题目在原文中的相对顺序；offset 是基于清洗后正文的字符位置，旧章节可能为空。iOS 展示知识点、题目和首次复习队列时应优先按 `sourceOrder` 排序，保证用户沿文章脉络复习。

出题策略：

- 每个可复习知识点尽量至少对应 1 道题，后端最终第一版每个知识点最多入池 1 道题。
- 题目入池后按对应知识点在原文中的位置排序；首次复习按文章内容先后推进，帮助用户像重新走一遍文章主线一样主动回忆。
- 后端推荐题型，但题型不匹配不是硬失败；题型不匹配但结构完整的题可作为低置信题入池。
- 文章开头的导读、金句摘录、编辑摘要只用于理解主题，不能作为知识点 `sourceQuote` 或题目来源锚点。若观点只在导读区出现、正文没有展开，后端会按 `lead_summary_source` 过滤该知识点；若正文有展开，必须锚定正文段落。
- `sourceSnippet` 是 iOS 解释页用户可见的原文上下文段落，不再是最短证据句。后端以知识点 `sourceQuote` 为锚点在 `cleanedText` 中定位，优先返回包含锚点的完整段落；段落过短时扩展相邻句，段落过长时按句子边界裁剪到约 150-500 字。
- 后端选择 `sourceSnippet` 时会参考题干、正确理解、常见误区和知识点主张的关键词，优先选择能解释该题上下文的原文段落，而不是机械截取前后固定字数。
- `sourceSnippet` 必须来自原文；如果无法可靠定位，后端只回退到知识点 `sourceQuote`，并将题目标记为低置信。
- 只有最终 0 道可复习题时才返回 `failed_no_qualified_questions`；部分知识点未覆盖不让整章失败。

解释页只展示：正确答案、正确理解、常见误区、来源片段。

### ReviewSession

```json
{
  "id": "session-1",
  "chapterId": "chapter-1",
  "status": "active",
  "queue": [
    { "id": "queue-1", "pointId": "kp-1", "questionId": "q-1", "isReinforcement": false }
  ],
  "reinforcementQueue": [],
  "currentQueueIndex": 0,
  "attempts": [],
  "masteryByPointId": { "kp-1": 50 },
  "answeredPointIds": [],
  "masteredThisRoundPointIds": [],
  "skippedPointIds": [],
  "createdAt": "2026-05-16T00:00:00.000Z",
  "updatedAt": "2026-05-16T00:00:00.000Z",
  "completedAt": null
}
```

完成条件：

- 所有未跳过知识点都至少答过一次。
- 所有未跳过知识点本轮都答对过。
- `reinforcementQueue` 为空。

队列顺序：

- 首次创建 ReviewSession 时，默认按 `sourceOrder` 创建题目队列。
- 答错或“不知道”后的强化题仍按章节内强化规则插入，例如间隔 3 题后再次出现。
- 恢复未完成 ReviewSession 时保持原队列，不因为章节重新排序而打断用户进度。

### ReviewAttempt

```json
{
  "id": "attempt-1",
  "reviewSessionId": "session-1",
  "chapterId": "chapter-1",
  "knowledgePointId": "kp-1",
  "questionId": "q-1",
  "answer": "B",
  "result": "correct",
  "isReinforcement": false,
  "masteryScoreBefore": 50,
  "masteryScoreAfter": 65,
  "invalidatedByFeedback": false,
  "skippedDueToQuestionFeedback": false,
  "answeredAt": "2026-05-16T00:00:00.000Z"
}
```

分数规则：

- 首次答对：`+15`
- 首次答错 / 不知道：`-20`
- 强化答对：`+10`
- 强化仍错 / 不知道：`-15`
- 分数限制在 `0-100`。

### QuestionFeedback

```json
{
  "id": "feedback-1",
  "questionId": "q-1",
  "knowledgePointId": "kp-1",
  "chapterId": "chapter-1",
  "reviewSessionId": "session-1",
  "feedbackType": "unclear",
  "severity": "severe",
  "actionTaken": "removed_from_pool",
  "invalidatedAttemptId": "attempt-1",
  "createdAt": "2026-05-16T00:00:00.000Z"
}
```

处理规则：

- `answer_wrong` / `unclear` / `unrelated_to_source`：撤销最近一次有效 attempt，题目从本轮复习移除。
- `too_easy`：只对当前用户降权，不撤销 attempt，不移除题。

### NotificationItem

```json
{
  "id": "notification-1",
  "chapterId": "chapter-1",
  "type": "generation_completed",
  "title": "生成完成",
  "body": "章节已生成，可以开始复习",
  "read": false,
  "dismissed": false,
  "createdAt": "2026-05-16T00:00:00.000Z"
}
```

通知点击统一进入章节详情，不直接进入题卡。

## 4. API 契约

### 匿名设备身份

iOS 请求必须附带：

```text
X-Device-Id: <uuid>
```

后端用这个 ID 隔离章节、通知、复习会话、题目反馈和收藏题目。缺少该请求头时，后端使用 `demo-device`，用于 HTML Demo 和简单 curl 调试。账号系统后续再做，未来可把匿名设备数据迁移到登录账号下。

### 注册系统通知 token

```text
POST /api/devices/push-token
```

请求：

```json
{
  "token": "<apns-device-token>",
  "platform": "ios",
  "environment": "production"
}
```

后端按 `X-Device-Id` 保存 APNs token。章节生成成功或失败时，后端会发送系统通知；通知 payload 包含 `notificationId`、`chapterId` 和 `type`，iOS 点击后进入对应章节详情。

### 创建章节

```text
POST /api/chapters
```

请求：

```json
{
  "sourceType": "text",
  "rawText": "用户粘贴的内容"
}
```

文章链接：

```json
{
  "sourceType": "article_link",
  "sourceUrl": "https://example.com/article"
}
```

返回：

```json
{
  "status": "completed",
  "chapter": {},
  "notification": {},
  "message": ""
}
```

失败时仍返回 `chapter`，并写入失败 `status` 和 `failureReason`。

### 章节列表

```text
GET /api/chapters
```

返回：

```json
{ "chapters": [] }
```

排序：按 `createdAt` 倒序。

### 章节详情

```text
GET /api/chapters/:id
```

返回：

```json
{ "chapter": {} }
```

### 重新生成章节

```text
POST /api/chapters/:id/regenerate
```

返回：

```json
{
  "status": "completed",
  "chapter": {},
  "notification": {},
  "message": ""
}
```

### 删除章节

```text
DELETE /api/chapters/:id
```

返回：

```json
{ "deleted": true, "chapterId": "chapter-1" }
```

删除章节时，相关通知、复习 session、反馈记录一起删除。

### 创建或恢复复习会话

```text
POST /api/chapters/:id/review-session
```

返回：

```json
{
  "chapter": {},
  "reviewSession": {},
  "currentQuestion": {}
}
```

规则：如果章节已有未完成 session，则恢复；否则创建新 session。

### 获取复习会话

```text
GET /api/chapters/:id/review-session
```

返回：

```json
{
  "chapter": {},
  "reviewSession": {},
  "currentQuestion": {}
}
```

没有 session 时，`reviewSession` 和 `currentQuestion` 为 `null`。

### 记录答题

```text
POST /api/review-sessions/:id/attempts
```

请求：

```json
{
  "questionId": "q-1",
  "answer": "B",
  "result": "correct"
}
```

`result` 可为：`correct`、`incorrect`、`unknown`。

返回：

```json
{
  "chapter": {},
  "reviewSession": {},
  "attempt": {},
  "currentQuestion": {}
}
```

### 提交题目反馈

```text
POST /api/questions/:id/feedback
```

请求：

```json
{
  "feedbackType": "unclear"
}
```

返回：

```json
{
  "chapter": {},
  "feedback": {},
  "reviewSession": {}
}
```

### 通知

```text
GET /api/notifications
POST /api/notifications/:id/read
POST /api/notifications/:id/dismiss
```

`dismiss` 只隐藏通知，不删除章节。

系统推送和 App 内通知共用同一条通知记录：成功通知点击后归档；失败通知点击后只标记已读，直到用户处理或手动移除。

### 收藏题目

收藏题目是题目级用户状态，不代表题目质量，也不改变默认章节复习队列。它用于构建系统题集“收藏题目”，让用户回到自己标记过的高价值题。

```text
GET /api/favorites/questions
POST /api/favorites/questions
DELETE /api/favorites/questions/:id
```

列表返回：

```json
{
  "favorites": [
    {
      "id": "favorite-chapter-1-q-1",
      "chapterId": "chapter-1",
      "questionId": "q-1",
      "createdAt": "2026-05-25T00:00:00.000Z"
    }
  ]
}
```

创建请求：

```json
{
  "chapterId": "chapter-1",
  "questionId": "q-1"
}
```

创建返回：

```json
{
  "favorite": {
    "id": "favorite-chapter-1-q-1",
    "chapterId": "chapter-1",
    "questionId": "q-1",
    "createdAt": "2026-05-25T00:00:00.000Z"
  }
}
```

删除返回：

```json
{
  "deleted": true,
  "favoriteId": "favorite-chapter-1-q-1"
}
```

规则：

- 所有接口都按 `X-Device-Id` 隔离，只能读取或修改当前匿名设备下的收藏。
- 同一个 `deviceId + chapterId + questionId` 只能有一条收藏记录；重复创建应返回同一条或更新后的收藏记录。
- 创建收藏时后端必须校验章节和题目属于当前设备。
- 删除章节或删除当前设备数据时，相关收藏题目一并删除。
- 收藏题复习由 iOS 根据收藏记录和本地章节/题目数据组装题卡；第一版不单独创建后端 ReviewSession。

## 5. iOS Service 建议

SwiftUI 第一版建议拆出：

- `ChapterService`
  - `createChapter(input:)`
  - `listChapters()`
  - `getChapter(id:)`
  - `regenerateChapter(id:)`
  - `deleteChapter(id:)`

- `ReviewService`
  - `startOrResumeSession(chapterId:)`
  - `getSession(chapterId:)`
  - `submitAttempt(sessionId:questionId:answer:result:)`
  - `submitFeedback(questionId:type:)`

- `NotificationService`
  - `listNotifications()`
  - `markRead(id:)`
  - `dismiss(id:)`

- `FavoriteQuestionService`
  - `listFavoriteQuestions()`
  - `createFavoriteQuestion(chapterId:questionId:)`
  - `deleteFavoriteQuestion(id:)`

第一轮 Xcode 可以先用 mock 实现这些 service，再切换到真实 HTTP 实现。

## 6. 当前限制

- Railway 云端通过 PostgreSQL 保存数据；本地未配置 `DATABASE_URL` 时使用内存存储，不保证跨重启。
- 当前 API 未做账号和鉴权，但已经按匿名设备 ID 做基础数据隔离。章节、通知、复习状态、反馈和收藏题目都应绑定同一个匿名设备身份。
- 当前生成流程是提交后后台执行，客户端轮询章节状态；后续正式生产版可再升级为队列、SSE、APNs 或后台任务系统。
- 公众号抓取受平台限制，失败时应提示用户改为粘贴正文。
- 视频链接只识别并友好失败，不提取视频文本。
