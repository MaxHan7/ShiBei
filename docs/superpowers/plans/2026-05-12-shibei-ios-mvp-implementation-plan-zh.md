# 拾贝 iOS MVP 开发计划

> **给执行开发的 agent/工程师：** 请按任务逐步执行。推荐使用 subagent-driven-development，或使用 executing-plans 按任务推进。

**目标：** 做出拾贝第一版可用 iOS MVP：用户登录后，可以添加文字、文章链接、视频链接，系统生成章节、知识点和题目，用户可以像背单词一样进入章节复习。

**架构：** 前端使用 SwiftUI 构建 iOS App；后端提供账号、章节、AI 生成任务、复习状态和通知接口。AI 生成流程异步执行：用户提交内容后立即保存并返回首页，后台任务负责正文提取、知识点生成、题目生成、质量检查、入池和通知。

**技术栈：** SwiftUI iOS App、TypeScript HTTP API、PostgreSQL、后台任务队列、LLM 生成服务、APNs iOS 推送通知。

---

## 0. 范围和假设

本计划默认目标是真实可安装的 iOS MVP，而不是只做可点击原型。如果团队决定先做原型，则优先实现里程碑 A、B、E、F 的本地 mock 数据版本，先暂停后端接入。

在完整 iOS MVP 开发前，建议先做一个轻量“真实体验验证版 Demo”。它可以是 HTML/Web 版本，但必须支持真实内容输入和真实 AI 生成，用来验证用户添加内容、生成题目、做题和看解释的核心体验。

MVP 必须包含：

- 账号登录和用户数据绑定。
- 添加知识：支持粘贴文字、文章链接、视频链接。
- 异步生成：提交后返回首页，生成状态进入章节页和通知页。
- 章节列表、章节详情、完整知识点页。
- 复习题卡、答题反馈、解释页、章节总结页。
- 题目反馈弹窗。
- 基础隐私说明和删除章节能力。
- 固定题目质量测试集。

MVP 不包含：

- 截图上传和 OCR。
- 订阅、会员、支付。
- 首页推荐系统。
- 标签、文件夹、搜索、归档、收藏。
- 用户手动编辑知识点或题目。
- 通知左滑已读或删除。

## 1. 建议项目结构

```text
ios/ShiBei/
  ShiBeiApp.swift
  AppState.swift
  Models/
  Services/
  ViewModels/
  Views/
  Components/
  Assets.xcassets/
backend/
  package.json
  src/
    server.ts
    db/
    generation/
    routes/
    services/
    jobs/
    prompts/
    quality/
    notifications/
    tests/
docs/
  superpowers/
    plans/
    specs/
quality-test-set/
  samples/
  expected/
```

职责划分：

- `ios/ShiBei/Models/`：客户端共享数据模型。
- `ios/ShiBei/Services/`：网络请求、登录、通知权限、本地会话状态。
- `ios/ShiBei/ViewModels/`：每个页面的状态和操作。
- `ios/ShiBei/Views/`：完整页面。
- `ios/ShiBei/Components/`：可复用 UI 组件，例如底部导航、章节卡片、选项按钮、状态标签。
- `backend/src/generation/`：核心出题系统，负责从文本生成知识点、题目、解释、质量检查结果和统一 JSON。
- `backend/src/routes/`：API 路由。
- `backend/src/services/`：业务逻辑。
- `backend/src/jobs/`：异步生成任务。
- `backend/src/prompts/`：LLM prompt 和结构化输出 schema。
- `backend/src/quality/`：题目质量评分和过滤。
- `quality-test-set/`：固定测试样本和评分标准。

## 1.5 里程碑 A0：核心出题系统

核心出题系统是拾贝的核心资产，必须做成独立模块，而不是写死在 HTML Demo、iOS 页面或某个接口里。

设计原则：

- 输入输出固定：前端、HTML Demo、未来 iOS 都只依赖统一接口，不依赖内部 prompt 细节。
- 生成链路可拆分：内容清洗、语义分块、知识点提取、题目生成、质量检查、自动重试分别独立。
- Prompt 可版本管理：每次修改 prompt 都能记录版本、测试结果和质量变化。
- 测试集优先：从第一版就支持固定样本批量生成和人工评分记录。
- 平台可替换：第一版直接用代码调用模型，不依赖 Dify；未来如果换模型或接入工作流平台，不影响前端和 iOS。

### 任务 A0-1：建立 generation-engine 目录和统一类型

文件：

- `backend/src/generation/index.ts`
- `backend/src/generation/types.ts`
- `backend/src/generation/prompts/knowledgePoints.ts`
- `backend/src/generation/prompts/questions.ts`
- `backend/src/generation/prompts/judge.ts`

要做：

- 定义统一输入 `GenerationInput`：
  - `sourceType`: `text`、`wechat_article`、`video`
  - `rawText`: 原始文本
  - `sourceUrl`: 可选
  - `sourceTitle`: 可选
  - `sourceAccount`: 可选
- 定义统一输出 `GenerationResult`：
  - `chapterTitle`
  - `source`
  - `knowledgePoints`
  - `questions`
  - `qualitySummary`
- 定义 `KnowledgePoint`：
  - `id`
  - `title`
  - `summary`
  - `keyClaim`
  - `sourceQuote`
  - `testabilityScore`
- 定义 `GeneratedQuestion`：
  - `id`
  - `knowledgePointId`
  - `type`
  - `stem`
  - `options`
  - `correctOptionId`
  - `shortExplanation`
  - `fullExplanation`
  - `pitfalls`
  - `sourceQuote`
  - `qualityScore`
  - `qualityIssues`

验收：

- HTML Demo 和未来 iOS 都只需要消费 `GenerationResult`。
- 内部 prompt、模型和质量检查逻辑变化时，输出结构保持稳定。

### 任务 A0-2：实现分步骤生成链路

文件：

- `backend/src/generation/cleanContent.ts`
- `backend/src/generation/chunkContent.ts`
- `backend/src/generation/extractKnowledgePoints.ts`
- `backend/src/generation/generateQuestions.ts`
- `backend/src/generation/evaluateQuestions.ts`
- `backend/src/generation/retryGeneration.ts`
- `backend/src/generation/index.ts`

要做：

- `cleanContent`：清理空行、广告语、明显无意义符号和重复片段。
- `chunkContent`：按语义切块，优先保持完整观点，不按固定字数粗切。
- `extractKnowledgePoints`：从语义块中提取 3 到 8 个可测试知识点。
- `generateQuestions`：每个知识点先生成 1 道选择题，用于 Demo 测试。
- `evaluateQuestions`：检查来源支撑、答案唯一、理解深度、解释质量和重复度。
- `retryGeneration`：如果 0 道题通过质量检查，自动重试一次。
- `index.ts`：对外暴露 `generateReviewChapter(input)`，隐藏内部步骤。

验收：

- 一段真实长文本可以生成章节标题、知识点和题目。
- 每道题都有来源片段。
- 每道题都有简短解释、完整解释和常见误区。
- 质量检查不通过的题不会进入最终输出。
- 第一次 0 道合格题时自动重试一次。

### 任务 A0-3：建立题目质量测试集

文件：

- `quality-test-set/samples/ai-agent-article.md`
- `quality-test-set/samples/product-theory-note.md`
- `quality-test-set/samples/short-note.md`
- `quality-test-set/samples/bad-short-content.md`
- `quality-test-set/expected/scoring-rubric.md`
- `quality-test-set/results/README.md`
- `backend/src/generation/tests/runQualitySet.ts`

要做：

- 先准备 5 到 10 条真实样本，覆盖长文章、短笔记、产品理论、AI 知识、无效短内容。
- 每条样本记录来源、内容类型、期望知识点方向和备注。
- 评分表包含：
  - 知识点是否抓住重点
  - 题目是否检验理解
  - 答案是否唯一
  - 解释是否有帮助
  - 来源片段是否支撑答案
- `runQualitySet.ts` 批量跑测试集，并保存每次生成结果 JSON。

验收：

- 可以一键对固定测试集批量生成题目。
- 每次 prompt 调整后，可以对比新旧结果。
- 人工评分结果能沉淀到 `quality-test-set/results/`。

### 任务 A0-4：提供 Demo 和产品共用的生成接口

文件：

- `backend/src/routes/generate.ts`
- `backend/src/server.ts`
- `demo/app.js`

要做：

- 新增接口 `POST /api/generate`。
- 接口接收文本输入，调用 `generateReviewChapter(input)`。
- 返回统一 `GenerationResult`。
- HTML Demo 不再在前端假生成题目，而是调用 `/api/generate`。
- 如果接口失败，前端展示用户能理解的失败文案，并允许用户改为粘贴更完整内容后重试。

验收：

- HTML Demo 可以用真实文本调用后端生成题目。
- 后端接口和未来 iOS 可复用。
- 后续接公众号抓取时，只需要先把链接转成正文，再复用同一个出题引擎。

### 任务 A0-5：公众号文章抓取作为输入层，不写进出题引擎

文件：

- `backend/src/services/wechatArticleExtractor.ts`
- `backend/src/routes/generate.ts`

要做：

- 用户输入 `mp.weixin.qq.com` 链接时，先进入公众号抓取层。
- 抓取层负责提取标题、账号、正文和原文链接。
- 抓取成功后，把正文传给 `generateReviewChapter(input)`。
- 抓取失败时，不进入出题引擎，直接提示用户改为粘贴正文。
- 出题引擎只处理干净文本，不关心正文来自公众号、复制文字还是视频转写。

验收：

- 公众号抓取失败不会影响文字输入出题能力。
- 未来替换公众号抓取方案时，不需要改 generation-engine。

## 2. 里程碑 A：基础模型和接口契约

### 任务 A1：创建核心领域模型

文件：

- `ios/ShiBei/Models/User.swift`
- `ios/ShiBei/Models/Chapter.swift`
- `ios/ShiBei/Models/KnowledgePoint.swift`
- `ios/ShiBei/Models/Question.swift`
- `ios/ShiBei/Models/ReviewSession.swift`
- `ios/ShiBei/Models/AppNotification.swift`
- `backend/src/db/schema.sql`
- `backend/src/services/types.ts`

要做：

- 定义 `User`：`id`、`displayName`、`email`、`createdAt`。
- 定义 `Chapter`：`id`、`userId`、`title`、`sourceType`、`sourceTitle`、`sourceUrl`、`sourceText`、`sourceAccount`、`status`、`knowledgePointCount`、`questionCount`、`dismissedFromNotifications`、`createdAt`、`updatedAt`。
- 定义章节状态：`submitted`、`extracting_content`、`generating_points`、`generating_questions`、`quality_checking`、`auto_regenerating_questions`、`completed`、`failed_extract_article`、`failed_extract_video`、`failed_points`、`failed_questions`、`failed_no_qualified_questions`。
- 定义 `KnowledgePoint`：`id`、`chapterId`、`title`、`summary`、`sourceQuote`、`masteryScore`、`state`、`lastReviewedAt`。
- 定义 `Question`：`id`、`chapterId`、`knowledgePointId`、`type`、`stem`、`options`、`correctOptionId`、`shortExplanation`、`fullExplanation`、`sourceQuote`、`qualityStatus`、`disabledByFeedback`。
- 定义 `ReviewSession`：`id`、`chapterId`、`currentIndex`、`questionIds`、`reinforcementKnowledgePointIds`、`completedAt`。
- 定义 `AppNotification`：`id`、`chapterId`、`kind`、`title`、`body`、`isRead`、`createdAt`。

验收：

- Swift 模型能在 Xcode 编译。
- TypeScript 类型能通过类型检查。
- 数据库 schema 能应用到本地数据库。

### 任务 A2：定义 API 契约

文件：

- `backend/src/routes/auth.ts`
- `backend/src/routes/chapters.ts`
- `backend/src/routes/review.ts`
- `backend/src/routes/notifications.ts`
- `docs/api-contract.md`

接口：

- `POST /auth/session`：创建或刷新登录会话。
- `GET /me`：获取当前用户。
- `POST /chapters`：提交文字、文章链接或视频链接，并创建章节。
- `GET /chapters`：按最近创建时间获取章节列表。
- `GET /chapters/:id`：获取章节详情和前 6 个知识点。
- `GET /chapters/:id/knowledge-points`：获取完整知识点列表。
- `POST /chapters/:id/regenerate`：重新生成。
- `DELETE /chapters/:id`：删除章节和相关数据。
- `POST /review/sessions`：创建或恢复复习会话。
- `GET /review/sessions/:id/current`：获取当前题目。
- `POST /review/sessions/:id/answer`：提交答案、更新掌握状态、返回下一步动作。
- `POST /questions/:id/feedback`：反馈题目问题。
- `GET /notifications`：获取生成通知列表。
- `POST /notifications/:id/read`：标记通知已读。
- `POST /notifications/:id/dismiss`：不再提示失败通知。

接口规则：

- 所有错误返回统一使用 `{ "errorCode": string, "message": string }`。
- 前端不得直接展示后台状态名。
- 返回章节状态时，同时返回 `displayStatusText`。

验收：

- `docs/api-contract.md` 写清每个接口的请求、响应和失败情况。
- iOS service 方法命名和接口保持一致。

## 2.5 里程碑 A+：真实体验验证版 Demo

这个里程碑发生在完整 iOS MVP 开发前。目标不是做完整产品，而是用最短路径验证“真实内容生成题目并复习”是否成立。

### 任务 A+1：实现轻量 Web Demo 页面

文件：

- `demo/index.html`
- `demo/styles.css`
- `demo/app.js`

要做：

- 提供一个添加内容页面，支持用户粘贴真实文字。
- 提供生成中状态。
- 提供章节详情页，展示标题、知识点列表和开始复习按钮。
- 提供题卡页，用户可以真实答题。
- 提供解释页，展示正确答案、正确理解、常见误区和来源片段。
- 提供章节总结页。
- 不做登录、真实通知、复杂章节管理。

验收：

- 用户打开本地 Demo 后，可以完成“粘贴文字 -> 生成 -> 做题 -> 看解释 -> 总结”的完整体验。
- 页面跳转和文案与 PRD 主流程一致。

### 任务 A+2：接入真实出题接口

文件：

- `demo/app.js`
- `backend/src/routes/generate.ts`
- `backend/src/generation/index.ts`

要做：

- HTML Demo 调用 `POST /api/generate`。
- 后端调用 `generateReviewChapter(input)`。
- Demo 使用接口返回的 `GenerationResult` 渲染章节详情、题卡、解释页和总结页。
- Demo 不直接写 prompt，不直接调用模型。
- 如果生成失败，展示用户能理解的失败文案。

验收：

- 使用一段真实文章或笔记，可以生成可作答题目。
- 生成结果不需要刷新页面即可进入复习。
- Demo 和未来 iOS 使用同一套生成接口。

### 任务 A+3：组织真实体验测试

文件：

- `quality-test-set/demo-feedback-form.md`
- `quality-test-set/demo-results.md`

要做：

- 准备 5 到 10 条真实内容样本，包括 AI 知识、产品理论、短笔记、长文章片段。
- 邀请测试用户完成至少 1 次添加和复习。
- 记录以下反馈：
  - 添加内容是否方便。
  - 生成等待是否可接受。
  - 知识点是否抓住重点。
  - 题目是否真的检验理解。
  - 解释是否有帮助。
  - 复习节奏是否像背单词一样轻。
- 根据反馈调整 AI prompt、题目质量标准和解释页内容。

验收：

- 至少完成 5 次真实内容测试。
- 明确记录主要问题和调整建议。
- 再进入完整 iOS MVP 开发。

## 3. 里程碑 B：iOS App 外壳

### 任务 B1：实现 App 导航外壳

文件：

- `ios/ShiBei/ShiBeiApp.swift`
- `ios/ShiBei/AppState.swift`
- `ios/ShiBei/Views/RootView.swift`
- `ios/ShiBei/Components/BottomTabBar.swift`

要做：

- 底部导航为：`首页 / 章节 / + 添加 / 通知 / 我的`。
- 中间 `+ 添加` 打开 `AddKnowledgeView`。
- 复习页和解释页隐藏底部导航。
- 当前 tab 存在 `AppState`。

验收：

- App 启动后可以切换五个 tab。
- 中间加号视觉上居中。
- 文案使用“添加”，不出现“投喂”。

### 任务 B2：实现登录和我的页

文件：

- `ios/ShiBei/Views/LoginView.swift`
- `ios/ShiBei/Views/ProfileView.swift`
- `ios/ShiBei/ViewModels/AuthViewModel.swift`
- `ios/ShiBei/Services/AuthService.swift`

要做：

- 未登录时先展示登录页。
- 登录页提供 Apple 登录和手机号登录入口。
- 安全保存登录会话。
- 我的页展示账号信息、通知权限、隐私说明、关于拾贝、退出登录。
- 不展示订阅、会员、套餐、Free Plan。

验收：

- 未登录打开 App 进入登录页。
- 登录后进入首页。
- 退出登录后回到登录页。

## 4. 里程碑 C：添加知识和异步生成

### 任务 C1：实现添加知识页

文件：

- `ios/ShiBei/Views/AddKnowledgeView.swift`
- `ios/ShiBei/ViewModels/AddKnowledgeViewModel.swift`
- `ios/ShiBei/Services/ChapterService.swift`

要做：

- 页面标题：`添加知识`。
- 一个大输入框，支持粘贴文字、文章链接、视频链接。
- 辅助文案：`支持文章/视频链接或粘贴文字`。
- 隐私文案：`内容仅用于生成复习，不会公开。`
- 主按钮：`开始生成`。
- 输入为空时按钮不可提交。
- 提交成功后返回首页，并展示提交成功浮窗。

验收：

- 空输入不能提交。
- 文字可以提交。
- 文章链接可以提交。
- 视频链接可以提交。
- 提交成功浮窗出现在首页。

### 任务 C2：实现通知权限说明

文件：

- `ios/ShiBei/Views/NotificationPermissionPrompt.swift`
- `ios/ShiBei/Services/PushPermissionService.swift`
- `ios/ShiBei/ViewModels/AddKnowledgeViewModel.swift`

要做：

- 用户第一次添加成功后，先展示自定义说明，再触发 iOS 系统通知权限。
- 说明文案：`我们会在内容生成好后通知你，方便你回来复习。`
- 按钮：`开启通知`、`以后再说`。
- 用户点击 `开启通知` 后请求 APNs 权限。
- 用户拒绝后，不阻塞生成流程。

验收：

- 权限说明只在第一次添加成功后出现。
- 拒绝通知权限不影响章节创建。

### 任务 C3：实现后端章节提交

文件：

- `backend/src/routes/chapters.ts`
- `backend/src/services/chapterService.ts`
- `backend/src/jobs/generationQueue.ts`

要做：

- 校验输入类型：`text`、`article_url`、`video_url`。
- 创建 `submitted` 状态章节。
- 加入生成任务队列。
- 返回章节 id 和提交状态。

验收：

- API 能创建章节记录。
- 章节能出现在 `GET /chapters`。
- 每次提交只创建一个生成任务。

## 5. 里程碑 D：AI 生成链路

### 任务 D1：内容提取

文件：

- `backend/src/services/contentExtractionService.ts`
- `backend/src/services/articleExtractor.ts`
- `backend/src/services/videoTextExtractor.ts`
- `backend/src/jobs/generateChapterJob.ts`

要做：

- 文字输入：清理空白和重复内容，保留原文。
- 文章链接：提取标题、来源账号/平台、正文。
- 视频链接：提取标题、平台、字幕/转写/简介文本。
- 文章提取失败时，设置 `failed_extract_article`。
- 视频文本提取失败时，设置 `failed_extract_video`。

验收：

- 文字输入能生成 extracted text。
- 无效文章链接进入 `failed_extract_article`。
- 无可用文本的视频进入 `failed_extract_video`。

### 任务 D2：生成知识点

文件：

- `backend/src/prompts/knowledgePointPrompt.ts`
- `backend/src/services/knowledgePointService.ts`
- `backend/src/jobs/generateChapterJob.ts`

要做：

- 把内容切成语义块。
- 生成候选知识点：标题、类型、摘要、关键判断、来源片段、可考性评分。
- 过滤低可考性知识点。
- 尽可能保存至少 1 个知识点。
- 如果没有可保存知识点，设置 `failed_points`。

验收：

- 示例文章能生成知识点。
- 每个知识点都有来源片段。
- 过短或无效内容进入 `failed_points`。

### 任务 D3：生成题目和质量检查

文件：

- `backend/src/prompts/questionPrompt.ts`
- `backend/src/services/questionGenerationService.ts`
- `backend/src/quality/questionQualityService.ts`
- `backend/src/jobs/generateChapterJob.ts`

要做：

- 每个可复习知识点尽量至少生成 1 道题；高价值知识点可生成 1 到 3 道候选题。
- 支持选择题、判断题、场景判断题。
- 每道题包含题干、选项、正确答案、简短解释、完整解释、来源上下文。
- 按来源支撑性、答案唯一性、理解深度、重复风险、清晰度评分。
- 题型是推荐而非硬约束；题型不匹配但结构完整、来源支撑、答案唯一的题可作为低置信题入池。
- 解释页展示的 `sourceSnippet` 是来源上下文段落：后端以知识点 `sourceQuote` 为锚点在原文中定位，优先返回包含锚点、并能支撑题干/正确理解/常见误区的完整段落或句子窗口。
- 来源上下文不能由模型改写；必须来自 `cleanedText`。找不到可靠上下文时才回退到知识点 `sourceQuote`，并把题目标记为低置信。
- 保存高置信题和低置信可复习题；不保存缺正确答案、选项结构错误、来源完全不支撑或答案不唯一的题。
- 第一次质量检查 0 道合格时，设置 `auto_regenerating_questions` 并自动重试一次，不通知用户。
- 第二次仍然 0 道可复习题时，设置 `failed_no_qualified_questions`。
- 如果生成过程系统性失败，设置 `failed_questions`。
- 只要有可复习题目，章节设置为 `completed`；部分知识点未覆盖不让整章失败。

验收：

- 好内容能进入 `completed`。
- 低质量题目会被过滤。
- 0 道合格会自动重试一次。
- 第二次仍失败会进入失败章节状态。

## 6. 里程碑 E：章节、首页和通知页面

### 任务 E1：首页

文件：

- `ios/ShiBei/Views/HomeView.swift`
- `ios/ShiBei/ViewModels/HomeViewModel.swift`
- `ios/ShiBei/Components/SubmittedModal.swift`

要做：

- 空状态只展示：
  - `每天捡起一枚知识贝壳`
  - `点击底部 + 添加复习内容`
  - `支持文章/视频链接或粘贴文字`
- 非空状态展示已复习知识点数量、当前章节卡片、`开始复习` 或 `继续复习`。
- 不展示章节列表、失败列表、处理中列表、推荐内容。
- 提交成功浮窗文案：`已提交，正在生成`、`完成后会通知你`。

验收：

- 首页空状态没有页面内添加按钮。
- 提交成功浮窗可以关闭。
- 关闭浮窗后首页不显示处理中状态。

### 任务 E2：全部章节页

文件：

- `ios/ShiBei/Views/ChapterListView.swift`
- `ios/ShiBei/ViewModels/ChapterListViewModel.swift`
- `ios/ShiBei/Components/ChapterCard.swift`

要做：

- 按最近创建时间展示全部章节。
- 展示已生成、处理中、生成失败状态。
- 不做搜索、筛选、文件夹、标签、归档、列表删除。
- 点击任意章节卡片进入章节详情。

验收：

- 处理中章节显示阶段文案。
- 失败章节可以点击进入。
- 已生成章节可以点击进入。

### 任务 E3：章节详情页

文件：

- `ios/ShiBei/Views/ChapterDetailView.swift`
- `ios/ShiBei/ViewModels/ChapterDetailViewModel.swift`

要做：

- 展示标题、来源类型、来源账号/平台、来源链接或输入文字入口。
- 已生成章节展示知识点数量、题目数量、`状态：已生成`、主按钮 `开始复习`。
- 默认展示前 6 个知识点。
- 超过 6 个时展示 `查看全部 X 个`。
- 失败章节展示状态、用户能理解的失败原因、主按钮 `重新生成` 或 `重试`、文字操作 `不再提示`。
- 失败章节不展示 `开始复习`。
- 失败章节按钮区不展示 `查看知识点`。

验收：

- 已生成章节可以开始复习。
- 失败章节可以重新生成。
- 失败章节可以通过 `查看全部 X 个` 进入完整知识点页。
- 来源链接能进入来源详情页。

### 任务 E4：通知页

文件：

- `ios/ShiBei/Views/NotificationsView.swift`
- `ios/ShiBei/ViewModels/NotificationsViewModel.swift`

要做：

- 只展示生成成功和生成失败通知。
- 成功通知进入已生成章节详情。
- 失败通知进入失败章节详情。
- 不做左滑已读、左滑删除、批量已读、归档。
- 空状态展示 `暂时没有通知`。

验收：

- 成功通知打开正确章节。
- 失败通知打开正确失败章节。
- 选择“不再提示”后，对应失败通知从列表消失。

## 7. 里程碑 F：复习流程

### 任务 F1：复习会话引擎

文件：

- `backend/src/services/reviewSessionService.ts`
- `backend/src/services/masteryService.ts`
- `ios/ShiBei/Services/ReviewService.swift`

要做：

- 按章节创建或恢复复习会话。
- 按知识点状态生成队列，而不是只按错题。
- 新知识点和答错知识点优先出现。
- 答对提升掌握分。
- 答错或点击 `不知道` 降低掌握分，并加入本轮强化队列。
- 一章复习中，答错知识点会继续出现，直到本轮答对。
- 每日衰减任务执行时，掌握分 `-3`。

验收：

- 答错后，对应知识点会在同一章复习中再次出现。
- 答对后，知识点可以从强化队列移除。
- 本章所有知识点本轮答对后，章节复习才完成。

### 任务 F2：题卡页

文件：

- `ios/ShiBei/Views/ReviewQuestionView.swift`
- `ios/ShiBei/ViewModels/ReviewQuestionViewModel.swift`
- `ios/ShiBei/Components/AnswerOptionButton.swift`

要做：

- 隐藏底部导航。
- 展示关闭按钮、标题 `复习中`、当前进度、进度条。
- 展示知识点标签。
- 展示题干和选项。
- 展示 `不知道` 按钮。
- 旧知识点答对：停留在同一页，选项变绿，字母变对勾，显示简短解释和 `下一题`。
- 新知识点答对：进入解释页。
- 答错或 `不知道`：进入解释页。

验收：

- 旧题答对不会弹窗，也不会跳新页。
- 答错进入解释页。
- 点击 `不知道` 进入解释页。

### 任务 F3：解释页和题目反馈

文件：

- `ios/ShiBei/Views/QuestionExplanationView.swift`
- `ios/ShiBei/Views/QuestionFeedbackSheet.swift`
- `ios/ShiBei/ViewModels/QuestionExplanationViewModel.swift`

要做：

- 展示正确答案。
- 展示 `正确理解`。
- 展示 `常见误区`。
- 有来源片段时展示来源片段。
- 展示来源链接。
- 展示 `题目有问题`。
- 反馈选项：`答案不准`、`题目看不懂`、`和来源无关`、`太简单`。
- 提交反馈后，在弹窗内展示确认文案：`已收到，这道题将不再默认出现。`
- 被反馈题目不再进入默认复习队列。
- 如果本题反馈影响当前答题分数，本次分数更新需要撤销或置为中性。

验收：

- 解释页不展示重复的 `你的答案` 或 `为什么对`。
- 反馈后用户能看到处理说明。
- 被反馈题目后续不会默认出现。

### 任务 F4：章节总结页

文件：

- `ios/ShiBei/Views/ChapterSummaryView.swift`
- `ios/ShiBei/ViewModels/ChapterSummaryViewModel.swift`

要做：

- 展示完成状态和章节卡片。
- 展示章节标题、来源类型、链接、知识点数量、题目数量。
- 展示本章知识点列表。
- 如果存在下一章，主按钮展示 `继续下一章`。
- 次按钮展示 `回到章节`。
- MVP 不加 `再来一轮`。

验收：

- 有下一章时展示 `继续下一章`。
- 没有下一章时不展示无效下一章入口。

## 8. 里程碑 G：来源、隐私和删除

### 任务 G1：来源详情页

文件：

- `ios/ShiBei/Views/SourceDetailView.swift`
- `ios/ShiBei/ViewModels/SourceDetailViewModel.swift`

要做：

- 展示来源标题、来源类型、账号/平台、原始链接、相关来源文本。
- 粘贴文字来源展示原始输入内容。
- 不还原复杂网页排版。

验收：

- 文章来源可以打开原文链接。
- 粘贴文字来源可以查看输入内容。

### 任务 G2：删除章节

文件：

- `ios/ShiBei/Views/DeleteChapterDialog.swift`
- `backend/src/services/chapterDeletionService.ts`

要做：

- 在章节详情页提供删除入口。
- 删除前弹出确认框，说明删除后不可恢复。
- 删除章节、原始内容、提取文本、知识点、题目、复习记录、相关通知。

验收：

- 删除后章节从章节列表消失。
- 相关通知消失。
- 删除后无法恢复该章节复习会话。

## 9. 里程碑 H：题目质量测试集和上线验收

### 任务 H1：建立固定题目质量测试集

文件：

- `quality-test-set/samples/article-ai-agent.md`
- `quality-test-set/samples/short-note-product-theory.md`
- `quality-test-set/samples/video-transcript-ai-workflow.md`
- `quality-test-set/expected/scoring-rubric.md`
- `backend/src/tests/generationQuality.test.ts`

要做：

- 至少包含一篇文章样本、一段短文本样本、一个视频字幕/转写样本。
- 评分维度：来源支撑、答案唯一、理解深度、清晰度、重复风险。
- 可用题必须满足：来源支撑、答案唯一、解释有意义。
- 严重问题包括：答案无来源支撑、多个正确答案、解释幻觉、来源错配。

验收：

- 测试能输出可用题比例和严重问题比例。
- 上线门槛：关键样本 0 个严重问题，人工评估可用题比例至少 70%。

### 任务 H2：端到端验收测试

文件：

- `backend/src/tests/e2eMvpFlow.test.ts`
- `ios/ShiBeiUITests/MvpFlowTests.swift`

测试路径：

- 新用户登录。
- 添加文章链接。
- 出现提交成功浮窗。
- 章节从处理中变为已生成。
- 通知进入章节详情。
- 开始复习。
- 答错一道题。
- 进入解释页。
- 反馈题目有问题。
- 继续完成章节总结。
- 如果有下一章，可以继续下一章。
- 生成失败路径能进入失败章节详情，并允许重新生成。

验收：

- 后端端到端测试通过。
- iOS 模拟器 UI 测试通过。

## 10. 推荐开发顺序

1. 先做核心出题系统 generation-engine 和统一输出结构。
2. 建立第一版题目质量测试集。
3. 做 `POST /api/generate`，让 HTML Demo 调用真实出题接口。
4. 用真实内容测试 HTML Demo 的生成和做题体验。
5. 再做完整 API 契约和数据模型。
6. 用 mock 数据做 iOS 外壳。
7. 先把所有页面和主流程跑通，确认体验没问题。
8. 接入真实后端章节存储。
9. 接入 AI 生成链路和章节状态机。
10. 接入公众号文章抓取、通知、复习会话和掌握状态。
11. 用固定测试集作为上线门槛。

这个顺序可以让产品体验尽早可见，同时让最有技术风险的内容提取和 AI 生成链路并行推进。

## 11. 最终验收清单

- 首页足够简洁，没有管理型信息堆叠。
- 底部导航是 `首页 / 章节 / + 添加 / 通知 / 我的`。
- 添加页支持文字、文章链接、视频链接。
- 提交成功后回到首页并展示浮窗，首页不显示处理中列表。
- 章节页能展示处理中、已生成、生成失败。
- 失败章节可以进入详情。
- 失败章节按钮区不出现 `查看知识点`。
- 已生成章节可以开始复习。
- 复习中隐藏底部导航。
- 旧题答对后原地反馈，并出现 `下一题`。
- 新题、答错、`不知道` 都进入解释页。
- 解释页不出现重复的 `你的答案` 或 `为什么对`。
- 题目反馈后，用户能看到系统如何处理该反馈。
- 章节总结页可以继续下一章。
- 用户必须登录后才能云端保存和生成。
- 不出现订阅、会员、Free Plan 相关 UI。
- 上线前必须跑固定题目质量测试集。
