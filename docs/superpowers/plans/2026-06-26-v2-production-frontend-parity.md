# 拾贝 V2 生产前端对齐实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 V2 iOS 前端迁入正式 App 壳之前，先按已部署版本补齐生产级细节，确保 V2 能在同一个 bundle id、同一个线上 service、同一套设备身份和持久化逻辑下工作。

**Architecture:** 以根目录生产 App 作为正式壳，迁入 V2 页面、组件、模型和 API 增量。生产细节继承根目录当前已部署版本；V2 实验 App 只作为 UI/交互来源，不直接承担 production 入口。

**Tech Stack:** SwiftUI, iOS Keychain, APNS, root Node backend V2 routes, Railway production service.

---

## 当前审查结论

### 已部署版本必须保留的生产细节

- 正式 App bundle id 是 `com.maxhan.shibei`，不能用实验 App 的 `com.maxhan.shibei.v2.dev` 替换。
- Release API 必须继续指向 `https://shibei-production.up.railway.app`。
- 设备身份必须继续使用 Keychain 中的稳定 device id，并且所有 API 请求继续带 `X-Device-Id`。
- APNS 注册、通知权限、token 上报、通知点击回调必须沿用根目录生产 App 的实现方式。
- 章节、通知、收藏题、复习 session 都必须通过真实服务层恢复，不能把 mock fixture 带进真实模式。
- 旧版已有的启动态、删除确认、通知教育弹窗、反馈 sheet、数据模式切换逻辑，需要逐项判断是继承还是用 V2 明确替代。

### 当前 V2 实验前端不能直接上线的点

- `experiments/shibei-v2/ios/拾贝/Services/APIClient.swift` 中 production base URL 仍等于本地 `http://127.0.0.1:5273`，只适合实验 App。
- V2RootView 里仍有 `@AppStorage("v2.usesMockData")` 和 fixture 分支；迁入生产壳时必须做到 Release 默认真实数据，并且 mock 只留在 Debug 可见入口。
- V2 生成流程已能调用 `/api/v2/chapters`、轮询 `/api/chapters/:id`、进入 V2 review session，但还没有完整接到根目录生产 App 的 `AppStore` 生命周期。
- V2 收藏题入口当前仍依赖 fixture；真实收藏题入口需要接 root API 的收藏题列表和对应 V2 review/session 规则。

---

## Checkpoint 1: 生产壳 API 配置对齐

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/Services/APIClient.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/Services/APIClient.swift`
- Test: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝.xcodeproj`

- [x] **Step 1: Add V2 API methods to root production APIClient**

  Add only the V2 methods that the V2 SwiftUI flow needs:

  ```swift
  func createV2Chapter(sourceText: String, clientRequestId: String) async throws -> V2CreateChapterResponse
  func fetchV2Chapter(id: String) async throws -> V2BackendChapter
  func fetchV2Chapters() async throws -> [V2BackendChapter]
  func startOrResumeV2ReviewSession(chapterId: String) async throws -> V2ReviewSessionResponse
  func fetchV2ReviewSession(chapterId: String) async throws -> V2ReviewSessionResponse
  func advanceV2ReviewSession(sessionId: String) async throws -> V2ReviewSessionResponse
  func answerV2Question(...) async throws -> V2ReviewSessionResponse
  func setV2QuestionFeedbackVisible(...) async throws -> V2ReviewSessionResponse
  func openV2SourceFromReview(...) async throws -> V2ReviewSessionResponse
  func returnFromV2SourceToReview(sessionId: String) async throws -> V2ReviewSessionResponse
  ```

  Keep root production URL unchanged:

  ```swift
  static let productionBaseURL = URL(string: "https://shibei-production.up.railway.app")!
  ```

- [x] **Step 2: Keep Debug override production-safe**

  Root Debug can support a launch argument like `-ShibeiV2APIBaseURL`, but Release must still use Railway production. Do not copy the experiment file's `static let productionBaseURL = APIClient.localBaseURL`.

- [x] **Step 3: Build root iOS target**

  Run:

  ```bash
  xcodebuild -project /Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
  ```

  Expected: build succeeds with root bundle id and no V2 API type errors.

- [x] **Step 4: Commit**

  ```bash
  git add 拾贝/拾贝/Services/APIClient.swift
  git commit -m "feat: add v2 api client methods to production app"
  ```

---

## Checkpoint 2: V2 模型和生产 DTO 对齐

**Files:**
- Create or modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Models/V2BackendModels.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2/Models/V2BackendModels.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/server.js`

- [x] **Step 1: Copy V2 backend DTOs into root app**

  Copy V2 response models for chapter generation, review session, answer, matching pairs, source anchors and progress.

- [x] **Step 2: Preserve production decode behavior**

  Use root `APIClient.decode` error reporting so production decode failures include the precise missing field path.

- [x] **Step 3: Confirm payload match against root backend serializers**

  Check root backend `serializeChapterForClient` and V2 review session serializers. Confirm the iOS model has optional fields for fields that can be missing during `pending` and `generating` states.

- [x] **Step 4: Build root iOS target**

  Run:

  ```bash
  xcodebuild -project /Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
  ```

  Expected: V2 DTOs compile in the production App target.

- [x] **Step 5: Commit**

  ```bash
  git add 拾贝/拾贝/V2/Models
  git commit -m "feat: add v2 backend models to production app"
  ```

---

## Checkpoint 3: 真实数据模式和 mock 模式分离

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/Views/RootView.swift`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/Services/MockServices.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/Services/ServiceProtocols.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2/V2RootView.swift`

- [ ] **Step 1: Keep Release真实数据 as default**

  Production Release must not boot into mock fixture. Debug can expose mock mode through the existing settings/debug surface.

  2026-06-26 update: root `ContentView` now keeps Release on the legacy production entry while Debug enters V2 by default. V2 fixture use is gated through `usesFixtures`, so Release cannot activate fixture data even if an AppStorage value exists.

- [ ] **Step 2: Add V2 real-data mode**

  Route V2 generation and review to real backend when data mode is `.cloudAPI` or `.localAPI`.

- [ ] **Step 3: Keep mock data isolated**

  Mock data can remain for component inspection, but every mock-only action must be guarded by Debug or explicit mock mode. Real user flow must never depend on `V2ReviewFixture`.

  2026-06-26 update: V2 profile's mock toggle is hidden whenever `allowsMockDataToggle` is false. Remaining work is to connect real notes/favorites to production data instead of fixture-only saved questions.

- [ ] **Step 4: Add a regression checklist**

  Manually verify:

  - Home empty state appears only when real backend has no chapters.
  - Upload starts real generation in real mode.
  - Notes/favorites do not open fixture questions in real mode.
  - All chapters page shows backend chapters, including pending/generating/failed/completed.

- [ ] **Step 5: Commit**

  ```bash
  git add 拾贝/拾贝/Views/RootView.swift 拾贝/拾贝/Services/MockServices.swift
  git commit -m "feat: separate v2 mock and real data modes"
  ```

---

## Checkpoint 4: V2 页面迁入正式 App 壳

**Files:**
- Create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/DesignSystem/**`
- Create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Components/**`
- Create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Screens/**`
- Create: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Assets/**` if needed by project conventions
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝/V2/**`

- [x] **Step 1: Copy V2 design system and components**

  Preserve the latest standardized top button/header positions, typography tokens, bottom button placement, and recently fixed dialog/card styles.

- [x] **Step 2: Copy V2 screens**

  Include home, upload, all chapters, generating detail, chapter detail, source article, review flow, notes, notifications, profile, unit summary and chapter summary.

- [x] **Step 3: Register V2 assets in root project**

  Copy only the assets used by the production V2 screens. Do not copy quality report HTML or experiment-only fixtures as production assets.

- [x] **Step 4: Build root iOS target**

  Run:

  ```bash
  xcodebuild -project /Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
  ```

  Expected: root target compiles with V2 UI.

- [x] **Step 5: Commit**

  ```bash
  git add 拾贝/拾贝/V2 拾贝/拾贝/Assets.xcassets
  git commit -m "feat: add v2 ui to production app target"
  ```

---

## Checkpoint 5: 生成进度和失败策略接入生产体验

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/V2RootView.swift`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/拾贝/拾贝/V2/Components/V2FlowComponents.swift`
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/backend/src/v2/generation/generationProgress.js`

- [ ] **Step 1: Map backend stages to user-facing Chinese text**

  Users should see messages like:

  ```text
  正在提取原文
  正在梳理章节结构
  正在拆分核心知识点
  正在为单元一生成题目
  正在整理单元总结
  章节生成完成
  ```

  Do not expose queue internals like `running`, `retrying`, `queued`.

- [ ] **Step 2: Preserve failed state screen**

  Failed generation should show the V2 failure detail page, retry button, source link button, and notification entry. Retry should enqueue a real backend retry.

- [ ] **Step 3: Confirm input limit UX**

  If backend rejects long input, the generating detail screen must show a readable error rather than staying stuck. Current backend target limit is approximately 6000 Chinese characters for MVP.

- [ ] **Step 4: Commit**

  ```bash
  git add 拾贝/拾贝/V2
  git commit -m "feat: connect v2 generation progress to production ui"
  ```

---

## Checkpoint 6: 真机 E2E 预发布验证

**Files:**
- No required code files if previous checkpoints compile.
- Reference: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-replacement-inventory-zh.md`

- [ ] **Step 1: Start local root backend with non-production DB**

  Run with local `.env` values from the V2 backend environment, without printing secrets:

  ```bash
  set -a
  . /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend/.env
  set +a
  PORT=5198 npm --prefix /Users/hanmingyu/Downloads/拾贝-v2-baseline/backend start
  ```

- [ ] **Step 2: Install Debug build to phone**

  Build the root production App target with a Debug override base URL pointing to the Mac LAN URL, not `127.0.0.1`.

- [ ] **Step 3: Run full phone path**

  Verify:

  - Paste article URL.
  - Start generation.
  - Generating detail page shows live progress.
  - Completed chapter appears in all chapters.
  - Start review.
  - Answer multiple-choice and matching questions.
  - View source and return without losing answered state.
  - Continue to unit summary and chapter summary.
  - Relaunch app and confirm progress resumes.

- [ ] **Step 4: Commit any fixes**

  ```bash
  git status --short
  git add <changed-files>
  git commit -m "fix: stabilize v2 production phone e2e"
  ```

---

## Checkpoint 7: 线上替换门禁

**Files:**
- Modify: `/Users/hanmingyu/Downloads/拾贝-v2-baseline/docs/v2-production-replacement-inventory-zh.md`

- [ ] **Step 1: Record production deployment reference**

  Record current Railway deployment id, current git commit, and current production health response.

- [ ] **Step 2: Record production environment checklist**

  Confirm these key names exist in production without recording secret values:

  ```text
  DATABASE_URL
  DEEPSEEK_API_KEY or OPENAI_API_KEY provider equivalent
  APNS_KEY_ID
  APNS_TEAM_ID
  APNS_BUNDLE_ID
  APNS_PRIVATE_KEY
  APNS_ENVIRONMENT
  ```

- [ ] **Step 3: Record backup and rollback**

  Add exact production database backup command, restore command, and deploy rollback command once Railway access is available.

- [ ] **Step 4: Commit**

  ```bash
  git add docs/v2-production-replacement-inventory-zh.md
  git commit -m "docs: record v2 production replacement gate"
  ```

---

## Self-Review

- The plan keeps V2 backend work already completed and focuses on the next production blocker: root iOS migration and production parity.
- It explicitly references the deployed version's stable details: bundle id, production URL, Keychain device id, APNS, notification lifecycle, AppStore bootstrapping and real data mode.
- It avoids copying experiment-only production URL behavior into the official app.
- It keeps mock data useful for design inspection, but prevents it from leaking into Release or real-user mode.
- The final production deploy remains gated on Railway deployment metadata, environment confirmation, database backup and rollback proof.
