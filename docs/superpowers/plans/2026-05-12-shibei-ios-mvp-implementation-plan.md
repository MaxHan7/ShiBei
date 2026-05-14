# 拾贝 iOS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first usable iOS MVP of 拾贝: users log in, add text/article/video links, receive generated chapters and questions, and review them through a clean chapter-based flow.

**Architecture:** Use a SwiftUI iOS client for all user-facing flows, backed by a small HTTP API that owns accounts, chapter data, AI generation jobs, review state, and notifications. The AI generation pipeline runs asynchronously: input is saved immediately, a background job extracts content, creates knowledge points and questions, runs quality checks, then updates chapter status and sends a notification.

**Tech Stack:** SwiftUI iOS app, TypeScript HTTP API, PostgreSQL database, background job runner, LLM provider for extraction/question generation, APNs for iOS push notifications.

---

## 0. Scope and Assumptions

This plan assumes we are building a real installable iOS MVP, not only a clickable prototype. If the team decides to prototype first, implement Milestone A, Milestone B, Milestone E, and Milestone F as local mock-data screens, then pause before backend integration.

MVP includes:

- Login and server-side user data binding.
- Add knowledge from pasted text, article links, and video links.
- Async generation with chapter status and notification.
- Chapter list, chapter detail, full knowledge points page.
- Review question page, answer feedback, explanation page, chapter summary.
- Question feedback modal.
- Basic privacy/delete behavior.
- Fixed quality test set for AI generation.

MVP excludes:

- Screenshot/OCR.
- Subscription/payment.
- Homepage recommendation system.
- Tags, folders, search, archive, favorites.
- User editing of generated knowledge points or questions.
- Notification swipe actions.

## 1. Proposed Repository Structure

Create these top-level folders:

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

File ownership:

- `ios/ShiBei/Models/`: shared client-side data shapes.
- `ios/ShiBei/Services/`: networking, auth, notification permission, local session state.
- `ios/ShiBei/ViewModels/`: screen-specific state and actions.
- `ios/ShiBei/Views/`: full pages only.
- `ios/ShiBei/Components/`: reusable UI pieces such as bottom nav, chapter cards, option buttons, status pills.
- `backend/src/routes/`: API endpoints.
- `backend/src/services/`: business logic.
- `backend/src/jobs/`: async generation pipeline.
- `backend/src/prompts/`: LLM prompts and structured output schemas.
- `backend/src/quality/`: question quality scoring and filtering.
- `quality-test-set/`: fixed content samples and expected review-quality criteria.

## 2. Milestone A: Foundation and Contracts

### Task A1: Create Shared Domain Model

Files:

- `ios/ShiBei/Models/User.swift`
- `ios/ShiBei/Models/Chapter.swift`
- `ios/ShiBei/Models/KnowledgePoint.swift`
- `ios/ShiBei/Models/Question.swift`
- `ios/ShiBei/Models/ReviewSession.swift`
- `ios/ShiBei/Models/AppNotification.swift`
- `backend/src/db/schema.sql`
- `backend/src/services/types.ts`

Steps:

- Define `User` with `id`, `displayName`, `email`, `createdAt`.
- Define `Chapter` with `id`, `userId`, `title`, `sourceType`, `sourceTitle`, `sourceUrl`, `sourceText`, `sourceAccount`, `status`, `knowledgePointCount`, `questionCount`, `dismissedFromNotifications`, `createdAt`, `updatedAt`.
- Define chapter statuses: `submitted`, `extracting_content`, `generating_points`, `generating_questions`, `quality_checking`, `auto_regenerating_questions`, `completed`, `failed_extract_article`, `failed_extract_video`, `failed_points`, `failed_questions`, `failed_no_qualified_questions`.
- Define `KnowledgePoint` with `id`, `chapterId`, `title`, `summary`, `sourceQuote`, `masteryScore`, `state`, `lastReviewedAt`.
- Define `Question` with `id`, `chapterId`, `knowledgePointId`, `type`, `stem`, `options`, `correctOptionId`, `shortExplanation`, `fullExplanation`, `sourceQuote`, `qualityStatus`, `disabledByFeedback`.
- Define `ReviewSession` with `id`, `chapterId`, `currentIndex`, `questionIds`, `reinforcementKnowledgePointIds`, `completedAt`.
- Define `AppNotification` with `id`, `chapterId`, `kind`, `title`, `body`, `isRead`, `createdAt`.

Commands:

```bash
mkdir -p ios/ShiBei/Models backend/src/db backend/src/services
```

Verification:

- Swift models compile in Xcode.
- TypeScript types compile with `npm run typecheck`.
- Database schema can be applied to a local database.

Commit:

```bash
git add ios/ShiBei/Models backend/src/db/schema.sql backend/src/services/types.ts
git commit -m "Define Shibei MVP domain model"
```

### Task A2: Define API Contract

Files:

- `backend/src/routes/auth.ts`
- `backend/src/routes/chapters.ts`
- `backend/src/routes/review.ts`
- `backend/src/routes/notifications.ts`
- `docs/api-contract.md`

Endpoints:

- `POST /auth/session`: create or refresh authenticated session.
- `GET /me`: return current user.
- `POST /chapters`: submit text/article/video input and create chapter.
- `GET /chapters`: list chapters by latest created.
- `GET /chapters/:id`: get chapter detail with first six knowledge points.
- `GET /chapters/:id/knowledge-points`: get full knowledge point list.
- `POST /chapters/:id/regenerate`: retry generation.
- `DELETE /chapters/:id`: delete chapter and related data.
- `POST /review/sessions`: create or resume review session.
- `GET /review/sessions/:id/current`: get current question.
- `POST /review/sessions/:id/answer`: submit answer, update mastery state, return next action.
- `POST /questions/:id/feedback`: mark bad question.
- `GET /notifications`: list generation notifications.
- `POST /notifications/:id/read`: mark notification read.
- `POST /notifications/:id/dismiss`: dismiss failure notification.

Response rules:

- All error responses use `{ "errorCode": string, "message": string }`.
- Frontend never displays backend status names directly.
- Any endpoint returning chapter status also returns a `displayStatusText`.

Verification:

- `docs/api-contract.md` lists every endpoint, request body, response body, and failure case.
- iOS service method names match endpoint names.

## 3. Milestone B: iOS App Shell

### Task B1: Build App Navigation Shell

Files:

- `ios/ShiBei/ShiBeiApp.swift`
- `ios/ShiBei/AppState.swift`
- `ios/ShiBei/Views/RootView.swift`
- `ios/ShiBei/Components/BottomTabBar.swift`

Steps:

- Add tabs: `首页`, `章节`, center `+ 添加`, `通知`, `我的`.
- Center `+ 添加` opens `AddKnowledgeView`.
- Hide bottom navigation during review and explanation flows.
- Store selected tab in `AppState`.

Verification:

- Launch app, switch all five tabs.
- Confirm center plus visually aligns with the tab bar center.
- Confirm label is `添加`, not `投喂`.

### Task B2: Implement Login and Profile MVP

Files:

- `ios/ShiBei/Views/LoginView.swift`
- `ios/ShiBei/Views/ProfileView.swift`
- `ios/ShiBei/ViewModels/AuthViewModel.swift`
- `ios/ShiBei/Services/AuthService.swift`

Steps:

- Show login page before the main app if no session exists.
- Include Apple login and phone login buttons in UI.
- Store authenticated session securely.
- Profile page shows account info, notification permission, privacy statement, about, logout.
- Do not show subscription, membership, plans, or Free Plan.

Verification:

- Logged-out launch shows login page.
- Logged-in launch shows home page.
- Logout returns to login page.

## 4. Milestone C: Add Knowledge and Async Generation

### Task C1: Build Add Knowledge Page

Files:

- `ios/ShiBei/Views/AddKnowledgeView.swift`
- `ios/ShiBei/ViewModels/AddKnowledgeViewModel.swift`
- `ios/ShiBei/Services/ChapterService.swift`

Steps:

- Add title `添加知识`.
- Add one large input area accepting text, article links, and video links.
- Add helper text: `支持文章/视频链接或粘贴文字`.
- Add privacy text: `内容仅用于生成复习，不会公开。`
- Add primary button `开始生成`.
- Disable submit when input is empty.
- On submit success, return to home and show submitted modal.

Verification:

- Empty input cannot submit.
- Text input submits.
- Article link submits.
- Video link submits.
- Submit success modal appears on home.

### Task C2: Implement Notification Permission Prompt

Files:

- `ios/ShiBei/Views/NotificationPermissionPrompt.swift`
- `ios/ShiBei/Services/PushPermissionService.swift`
- `ios/ShiBei/ViewModels/AddKnowledgeViewModel.swift`

Steps:

- After first successful add, show custom prompt before iOS system permission.
- Prompt copy: `我们会在内容生成好后通知你，方便你回来复习。`
- Buttons: `开启通知`, `以后再说`.
- If user taps `开启通知`, request APNs permission.
- If denied, continue product flow without blocking generation.

Verification:

- Prompt appears only after first successful add.
- Denying notification does not block chapter creation.

### Task C3: Backend Chapter Submission

Files:

- `backend/src/routes/chapters.ts`
- `backend/src/services/chapterService.ts`
- `backend/src/jobs/generationQueue.ts`

Steps:

- Validate input as `text`, `article_url`, or `video_url`.
- Create chapter with `submitted` status.
- Enqueue generation job.
- Return chapter id and `submitted` display status.

Verification:

- API creates a chapter row.
- Chapter appears in `GET /chapters`.
- Generation job is queued once.

## 5. Milestone D: AI Generation Pipeline

### Task D1: Content Extraction

Files:

- `backend/src/services/contentExtractionService.ts`
- `backend/src/services/articleExtractor.ts`
- `backend/src/services/videoTextExtractor.ts`
- `backend/src/jobs/generateChapterJob.ts`

Steps:

- Text input: clean whitespace and preserve original text.
- Article URL: fetch page content, extract title, source account/platform, and readable body.
- Video URL: extract available title, platform, subtitle/transcript/description text.
- If article extraction fails, set `failed_extract_article`.
- If video text extraction fails, set `failed_extract_video`.

Verification:

- Text input creates extracted text.
- Invalid article URL becomes `failed_extract_article`.
- Video with no text source becomes `failed_extract_video`.

### Task D2: Knowledge Point Generation

Files:

- `backend/src/prompts/knowledgePointPrompt.ts`
- `backend/src/services/knowledgePointService.ts`
- `backend/src/jobs/generateChapterJob.ts`

Steps:

- Split content into semantic chunks.
- Generate candidate knowledge points with title, type, summary, key claim, source quote, testability score.
- Filter out low-testability candidates.
- Save at least one knowledge point when possible.
- If none can be saved, set `failed_points`.

Verification:

- A sample article produces knowledge points.
- Each point has a source quote.
- Short unusable text becomes `failed_points`.

### Task D3: Question Generation and Quality Check

Files:

- `backend/src/prompts/questionPrompt.ts`
- `backend/src/services/questionGenerationService.ts`
- `backend/src/quality/questionQualityService.ts`
- `backend/src/jobs/generateChapterJob.ts`

Steps:

- Generate 1 to 3 questions per knowledge point.
- Support multiple choice, true/false, and scenario judgment.
- Require stem, options, correct answer, short explanation, full explanation, source quote.
- Score questions on source support, answer uniqueness, understanding depth, duplicate risk, and clarity.
- Save only qualified questions.
- If first quality pass yields 0 qualified questions, set `auto_regenerating_questions` and retry once without notifying user.
- If second pass yields 0 qualified questions, set `failed_no_qualified_questions`.
- If generation fails for a system reason, set `failed_questions`.
- If at least one qualified question exists, set `completed`.

Verification:

- Good sample content reaches `completed`.
- Bad generated questions are filtered.
- 0 qualified questions triggers exactly one automatic retry.
- Second 0-result pass creates failed chapter state.

## 6. Milestone E: Chapter and Notification Screens

### Task E1: Home Page

Files:

- `ios/ShiBei/Views/HomeView.swift`
- `ios/ShiBei/ViewModels/HomeViewModel.swift`
- `ios/ShiBei/Components/SubmittedModal.swift`

Steps:

- Empty state shows only:
  - `每天捡起一枚知识贝壳`
  - `点击底部 + 添加复习内容`
  - `支持文章/视频链接或粘贴文字`
- Non-empty state shows reviewed knowledge count, current chapter card, and `开始复习` or `继续复习`.
- Do not show chapter list, failed list, processing list, or recommendations.
- Submitted modal copy: `已提交，正在生成` and `完成后会通知你`.

Verification:

- Empty home has no page-level add button.
- Submitted modal can close.
- Closing modal leaves no processing state on home.

### Task E2: Chapter List Page

Files:

- `ios/ShiBei/Views/ChapterListView.swift`
- `ios/ShiBei/ViewModels/ChapterListViewModel.swift`
- `ios/ShiBei/Components/ChapterCard.swift`

Steps:

- Show all chapters by latest created time.
- Show generated, processing, and failed states.
- Do not add search, filter, folders, tags, archive, or list delete.
- Tapping any card opens chapter detail.

Verification:

- Processing chapter card shows stage text.
- Failed chapter card is tappable.
- Generated chapter card is tappable.

### Task E3: Chapter Detail Page

Files:

- `ios/ShiBei/Views/ChapterDetailView.swift`
- `ios/ShiBei/ViewModels/ChapterDetailViewModel.swift`

Steps:

- Show title, source type, source account/platform, source link or input text link.
- For completed chapters show counts, `状态：已生成`, and primary button `开始复习`.
- Show first six knowledge points.
- If more than six, show `查看全部 X 个`.
- For failed chapters show status, user-readable failure reason, primary `重新生成` or `重试`, and text action `不再提示`.
- Failed chapter does not show `开始复习`.
- Failed chapter button area does not show `查看知识点`.

Verification:

- Completed chapter can start review.
- Failed chapter can regenerate.
- Failed chapter can open full knowledge points through `查看全部 X 个`.
- Source link opens source detail.

### Task E4: Notifications Page

Files:

- `ios/ShiBei/Views/NotificationsView.swift`
- `ios/ShiBei/ViewModels/NotificationsViewModel.swift`

Steps:

- Show generation success and generation failure notifications only.
- Success notification opens completed chapter detail.
- Failure notification opens failed chapter detail.
- Do not implement swipe read, swipe delete, batch read, or archive.
- Empty state shows `暂时没有通知`.

Verification:

- Success notification opens the correct chapter.
- Failure notification opens the correct failed chapter.
- Dismissed failure notification disappears from list.

## 7. Milestone F: Review Flow

### Task F1: Review Session Engine

Files:

- `backend/src/services/reviewSessionService.ts`
- `backend/src/services/masteryService.ts`
- `ios/ShiBei/Services/ReviewService.swift`

Steps:

- Create or resume a review session per chapter.
- Build queue by knowledge point state, not only wrong questions.
- New and wrong knowledge points appear earlier.
- Answering correctly increases mastery score.
- Answering wrong or `不知道` decreases mastery score and adds the knowledge point to reinforcement queue.
- In a chapter session, knowledge points answered wrong continue appearing until answered correctly.
- Daily score decay is `-3` when decay job runs.

Verification:

- Wrong answer causes the related knowledge point to reappear in the same chapter session.
- Correct answer eventually removes it from reinforcement.
- Completed session requires all included knowledge points to be answered correctly in the current round.

### Task F2: Question Card Page

Files:

- `ios/ShiBei/Views/ReviewQuestionView.swift`
- `ios/ShiBei/ViewModels/ReviewQuestionViewModel.swift`
- `ios/ShiBei/Components/AnswerOptionButton.swift`

Steps:

- Hide bottom tab bar.
- Show close button, title `复习中`, current progress, progress bar.
- Show knowledge point pill.
- Show question stem and answer options.
- Show `不知道` button.
- On old knowledge answered correctly, stay on same page, turn selected option green, change letter to check mark, show short explanation, show `下一题`.
- On new knowledge answered correctly, navigate to explanation page.
- On wrong answer or `不知道`, navigate to explanation page.

Verification:

- Old correct answer does not open a modal or new page.
- Wrong answer opens explanation page.
- `不知道` opens explanation page.

### Task F3: Explanation Page and Feedback Modal

Files:

- `ios/ShiBei/Views/QuestionExplanationView.swift`
- `ios/ShiBei/Views/QuestionFeedbackSheet.swift`
- `ios/ShiBei/ViewModels/QuestionExplanationViewModel.swift`

Steps:

- Show correct answer.
- Show `正确理解`.
- Show `常见误区`.
- Show source quote when available.
- Show source link.
- Show `题目有问题`.
- Feedback options: `答案不准`, `题目看不懂`, `和来源无关`, `太简单`.
- After feedback submit, show inline confirmation: `已收到，这道题将不再默认出现。`
- Feedback disables the question from default review queue.
- If feedback affects a score update from the current answer, revoke or neutralize that update.

Verification:

- Explanation page does not show duplicate sections `你的答案` or `为什么对`.
- Feedback confirmation appears in the same sheet flow.
- Disabled question is skipped in later sessions.

### Task F4: Chapter Summary Page

Files:

- `ios/ShiBei/Views/ChapterSummaryView.swift`
- `ios/ShiBei/ViewModels/ChapterSummaryViewModel.swift`

Steps:

- Show completion state and chapter card.
- Show chapter title, source type, link if available, knowledge point count, question count.
- Show knowledge point list.
- Primary button: `继续下一章` if a next generated chapter exists.
- Secondary button: `回到章节`.
- Do not add `再来一轮` for MVP.

Verification:

- Completed chapter with next chapter shows `继续下一章`.
- Last chapter does not show a dead-end next action.

## 8. Milestone G: Privacy, Delete, and Source Detail

### Task G1: Source Detail Page

Files:

- `ios/ShiBei/Views/SourceDetailView.swift`
- `ios/ShiBei/ViewModels/SourceDetailViewModel.swift`

Steps:

- Show source title, source type, account/platform, original link, and relevant source text.
- For pasted text, show original input text.
- Do not attempt to recreate article layout.

Verification:

- Article source opens original link.
- Pasted text source displays input content.

### Task G2: Delete Chapter

Files:

- `ios/ShiBei/Views/DeleteChapterDialog.swift`
- `backend/src/services/chapterDeletionService.ts`

Steps:

- Add delete action on chapter detail.
- Show confirmation explaining permanent deletion.
- Delete chapter, original content, extracted text, knowledge points, questions, review sessions, and related notifications.

Verification:

- Deleted chapter disappears from chapter list.
- Related notifications disappear.
- Review session cannot be resumed after deletion.

## 9. Milestone H: Quality Test Set and Launch Verification

### Task H1: Create Fixed Quality Test Set

Files:

- `quality-test-set/samples/article-ai-agent.md`
- `quality-test-set/samples/short-note-product-theory.md`
- `quality-test-set/samples/video-transcript-ai-workflow.md`
- `quality-test-set/expected/scoring-rubric.md`
- `backend/src/tests/generationQuality.test.ts`

Steps:

- Include at least one article sample, one short text sample, and one video transcript sample.
- Rubric dimensions: source support, answer uniqueness, understanding depth, clarity, duplicate risk.
- A usable question requires source support, unique answer, and meaningful explanation.
- Severe issue means unsupported answer, multiple correct answers, hallucinated explanation, or source mismatch.

Verification:

- Test run outputs usable question rate and severe issue rate.
- Launch gate: 0 severe issues in critical samples, and at least 70% of generated questions are usable by human review.

### Task H2: End-to-End Acceptance Test

Files:

- `backend/src/tests/e2eMvpFlow.test.ts`
- `ios/ShiBeiUITests/MvpFlowTests.swift`

Test paths:

- New user login.
- Add article link.
- Submitted modal appears.
- Chapter moves through processing to completed.
- Notification opens chapter detail.
- Start review.
- Answer wrong.
- Explanation page appears.
- Feedback question issue.
- Continue until chapter summary.
- Continue next chapter if available.
- Failed generation path opens failed chapter detail and allows regenerate.

Verification:

- Backend e2e test passes.
- iOS UI test passes on simulator.

## 10. Recommended Build Order

1. Build API contract and model layer.
2. Build iOS shell with mock data.
3. Build all screens with local mock data until the user flow feels correct.
4. Add real backend chapter storage.
5. Add AI generation pipeline behind chapter statuses.
6. Connect notifications.
7. Connect review session and mastery state.
8. Add quality test set and launch gates.

This order keeps the product experience visible early while the technically risky AI/content extraction pipeline is developed in parallel.

## 11. Final Verification Checklist

- Home is simple and has no management clutter.
- Bottom nav is `首页 / 章节 / + 添加 / 通知 / 我的`.
- Add page accepts text, article links, and video links.
- Submitted modal returns to home and does not leave processing UI on home.
- Chapter list shows processing, generated, and failed chapters.
- Failed chapter can be opened.
- Failed chapter button area does not include `查看知识点`.
- Completed chapter starts review.
- Review hides bottom navigation.
- Old correct answer gives same-page feedback and `下一题`.
- Wrong, new, and `不知道` go to explanation page.
- Explanation page has no duplicate `你的答案` or `为什么对` sections.
- Feedback modal tells the user how the app handles the reported question.
- Chapter summary can continue to next chapter.
- Account is required before cloud storage and generation.
- Subscription and Free Plan UI do not appear.
- Quality test set exists and is run before launch.
