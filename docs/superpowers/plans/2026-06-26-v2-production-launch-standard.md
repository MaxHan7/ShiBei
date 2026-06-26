# 拾贝 V2 完整上线标准与执行总控计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use this repo's plan/checkpoint convention and keep this file updated after each completed checkpoint. Do not replace the production service until every launch gate below is either passed or explicitly waived by the user.

## Goal

让拾贝 V2 达到可以替换同一个真实线上服务器的完整上线标准。上线标准不是“页面能打开”或“某一次生成成功”，而是：

- 正式 iOS App 使用生产 bundle id 和生产 HTTPS API。
- 根目录 production backend 可以承载 V2 生成、队列、进度、失败、复习状态、收藏、通知和原文定位。
- 真实手机可以跑通“输入链接 -> 生成章节 -> 复习题目 -> 查看原文 -> 恢复进度 -> 收藏题目 -> 通知/失败处理”的闭环。
- 替换前有旧版 commit、部署版本、数据库备份和回滚路径。
- Release 版本不泄露 mock/fixture/debug 控制。

## Current Baseline

- Current branch: `codex/shibei-v2-isolated-build`.
- Root production app project: `拾贝/拾贝.xcodeproj`.
- Production bundle id: `com.maxhan.shibei`.
- Root iOS production URL: `https://shibei-production.up.railway.app`.
- Root Railway service uses root `backend/` through root `railway.json`.
- Production deploy runbook: `docs/v2-production-deploy-runbook-zh.md`.
- Root backend already contains V2 backend modules under `backend/src/v2`.
- Debug root iOS currently defaults to V2 UI; Release still stays on legacy UI as a safety gate.
- V2 fixtures are gated by `usesFixtures`; Release must not allow fixture mode.
- V2 real chapter list, notifications, notes/favorites list, and favorite/unfavorite API are already connected at the root app level.

## Launch Gates

### Gate 0: Baseline Freeze

Purpose: Create a clean rollback point before production-readiness work continues.

- [ ] Confirm `git status --short` is clean.
- [ ] Record latest commit and short log.
- [ ] Run root backend check:

  ```bash
  npm --prefix backend run check
  ```

- [ ] Run root iOS Debug simulator build:

  ```bash
  xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS Simulator' -configuration Debug build
  ```

- [ ] Run root iOS Release generic build:

  ```bash
  xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS' -configuration Release build
  ```

Exit criteria:

- Worktree is clean after checkpoint commit.
- Backend check passes.
- Debug and Release builds pass, or exact blockers are recorded.

### Gate 1: Backend Production Path Verification

Purpose: Verify the deployed service path is the productionized V2-capable backend, not an experiment-only backend.

- [ ] Confirm root `railway.json` start command still maps to root `backend`.
- [ ] Confirm root `backend/package.json` includes V2 checks and V2 smoke script.
- [ ] Compare root `backend/src/v2` and `experiments/shibei-v2/backend/src/v2`; any meaningful differences must be intentional and recorded.
- [ ] Confirm root backend exposes:
  - `GET /api/health`
  - `POST /api/v2/chapters`
  - `GET /api/chapters/:id`
  - V2 review session endpoints
  - favorite question endpoints
  - notification endpoints
  - source-open/update endpoint used by review source anchors
- [ ] Run the backend route contract gate:

  ```bash
  npm --prefix backend run gate:routes
  ```

- [ ] Confirm worker starts under production start command or document the separate Railway worker service setup.

Exit criteria:

- Root backend is the only backend path needed for production deployment.
- No production deployment depends on `experiments/shibei-v2/backend`.

### Gate 2: Backend Runtime Readiness

Purpose: Make generation stable enough for real users.

- [ ] Run root backend check.
- [ ] Run V2 queue smoke against a non-production database:

  ```bash
  npm --prefix backend run smoke:v2:queue -- --base-url http://127.0.0.1:<port> --mode success
  ```

- [ ] Verify failed generation path:
  - job moves to failed state,
  - user-facing failure text is short and readable,
  - failure notification is created.
- [ ] Verify retry behavior:
  - transient failure retries,
  - permanent failure does not loop indefinitely,
  - repeated submit of same source does not duplicate active work unexpectedly.
- [ ] Verify article length protection:
  - MVP limit is enforced around the agreed 6000 Chinese-character class of input,
  - over-limit failure is immediate and user-facing.
- [ ] Confirm secrets are only in environment variables, never committed.

Exit criteria:

- Generation, progress, success, failure and retry are testable through HTTP.
- A bad source cannot leave a permanently confusing “卡住” state.

### Gate 3: iOS Real Data Contract Readiness

Purpose: Ensure SwiftUI does not silently discard backend fields needed for the product.

- [ ] `sourceAnchorId` must be preserved from backend question DTO to `V2ReviewQuestionData`.
- [ ] “查看原文” from answer feedback must open the source article using the current question's source anchor.
- [ ] Returning from source article must preserve the question's answered state and feedback sheet state.
- [ ] Review session state must survive app background/foreground and app restart.
- [ ] Favorite/unfavorite must persist and rollback on failure.
- [ ] Notes page must handle favorite records whose chapter/question is missing.
- [ ] Empty states must be real-data states, not fixture states.

Exit criteria:

- Real backend data can drive all major V2 screens without fixture fallback.
- Source anchor navigation is precise enough for production testing.

### Gate 4: iOS Release Gate Flip

Purpose: Move Release from legacy UI to V2 only after backend and real data gates pass.

- [ ] Run the current Release/mock safety guard:

  ```bash
  npm run check:ios-production
  ```

- [ ] Release entry in `ContentView` flips to V2.
- [ ] Legacy root remains available only through a deliberate debug/internal fallback if still needed.
- [ ] Release cannot enable mock/fixture switch by AppStorage leftovers.
- [ ] Release base URL is HTTPS production URL.
- [ ] Debug still supports launch-argument API override for local/phone testing.
- [ ] After flipping Release to V2, run the strict guard:

  ```bash
  npm run check:ios-production -- --require-v2-release
  ```

Exit criteria:

- The build delivered to existing users enters V2 by default and cannot accidentally enter mock mode.

### Gate 5: Phone E2E Acceptance

Purpose: Validate the actual user path on a physical phone before server replacement.

- [ ] Install the root app build on a phone under production bundle id.
- [ ] Point Debug/internal build to the chosen test backend.
- [ ] Submit a real article link.
- [ ] Observe progress text:
  - extracting source,
  - summarizing / building knowledge structure,
  - generating unit questions,
  - completed or failed.
- [ ] Complete at least one multiple-choice question.
- [ ] Complete at least one matching question if generated.
- [ ] Open source article from a question and return without losing answer state.
- [ ] Exit and reopen app; verify review progress resumes.
- [ ] Favorite a question; verify notes page can open it; unfavorite and verify it disappears.
- [ ] Confirm notification list reflects success/failure state.

Exit criteria:

- A real phone can complete the V2 learning loop without mock data.

### Gate 6: Production Replacement Readiness

Purpose: Make the actual replacement reversible.

- [ ] Record old backend commit.
- [ ] Record old iOS commit/build.
- [ ] Record current Railway deployment id/version.
- [ ] Record the Railway deployment authority and method:
  - connected GitHub branch and whether autodeploy is enabled,
  - or Railway dashboard manual Deploy Latest Commit,
  - or Railway CLI with an authenticated project/service.
- [ ] Confirm database backup is available and restorable.
- [ ] Confirm Railway environment variables required by V2 are set.
- [ ] Confirm APNS production configuration for `com.maxhan.shibei`.
- [ ] After creating the release candidate archive/export, verify the actual signed app:

  ```bash
  npm run check:ios-signing -- --app /path/to/拾贝.app
  ```

- [ ] Prepare rollback plan:
  - revert backend deployment to old commit/deployment,
  - restore DB if schema/data corruption occurs,
  - ship iOS rollback/hotfix if needed.

Exit criteria:

- There is a written rollback path that does not require inventing steps during an incident.

### Gate 7: Final Launch Smoke

Purpose: Replace the same production service only after the above gates pass.

- [ ] Deploy production backend.
- [ ] Confirm production readiness without creating smoke data:

  ```bash
  npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app
  ```

- [ ] Run a production-safe smoke chapter generation with a controlled source only after the readiness gate passes:

  ```bash
  npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app --smoke
  ```

- [ ] Submit iOS build or distribute the release candidate.
- [ ] Monitor:
  - generation success/failure rate,
  - job duration,
  - JSON/model parse failures,
  - API errors,
  - APNS errors,
  - client crash/feedback.

Exit criteria:

- V2 is live on the same production service.
- Severe failures have a tested rollback path.

## Immediate Next Checkpoints

1. Fix the known `sourceAnchorId` loss in SwiftUI.
2. Run root backend check and iOS builds.
3. Audit root backend V2 route parity.
4. Run local/phone backend preflight against the chosen test endpoint.
5. Only after the real-data E2E path is stable, flip the Release entry to V2.

## Checkpoint Log

### 2026-06-26: Baseline launch-standard checkpoint

- Root backend path was verified as the production deployment path through root `railway.json`.
- Root `backend/package.json` already includes V2 check coverage and `smoke:v2:queue`.
- Root `backend/src/v2` is present; only the golden loader differed from `experiments/shibei-v2/backend/src/v2` during a quick directory comparison.
- Root backend route scan confirmed the production path contains the main V2 endpoints:
  - `POST /api/v2/chapters`
  - `POST /api/v2/chapters/:id/review-session`
  - `GET /api/v2/chapters/:id/review-session`
  - `POST /api/v2/review-sessions/:id/advance`
  - `POST /api/v2/review-sessions/:id/answer`
  - `POST /api/v2/review-sessions/:id/feedback-visibility`
  - `POST /api/v2/review-sessions/:id/source-open`
  - `POST /api/v2/review-sessions/:id/source-return`
  - favorite question routes
  - notification routes
- SwiftUI no longer drops `sourceAnchorId` when mapping backend questions into V2 review questions.
- SwiftUI now sends the current question's `sourceAnchorId` when opening source from a V2 review session.
- Validation passed:
  - `npm --prefix backend run check`
  - `xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS Simulator' -configuration Debug build`
  - `xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS' -configuration Release build`
- Release build still showed `aps-environment = development`; this is a launch blocker for production push readiness and must be resolved or explicitly explained before App Store/TestFlight release.

### 2026-06-26: Root backend phone preflight checkpoint

- Added root `backend/scripts/phone-preflight.mjs`.
- Added root backend script:

  ```bash
  npm --prefix backend run preflight:phone
  ```

- The preflight supports two modes:
  - local/LAN backend: checks local `.env`, model key availability, database URL, health, database and queue;
  - remote HTTPS backend: checks health, database and queue without requiring local secrets.
- Default bundle id is the production app bundle: `com.maxhan.shibei`.
- Production URL preflight passed against `https://shibei-production.up.railway.app`:
  - backend health passed,
  - database health passed,
  - queue visibility passed.
- Root backend validation passed again after adding the script:

  ```bash
  npm --prefix backend run check
  ```

### 2026-06-26: Production V2 creation smoke blocker

- A controlled production smoke was attempted with a dedicated smoke device id and a very short raw text source:

  ```bash
  npm --prefix backend run smoke:v2:queue -- --base-url https://shibei-production.up.railway.app --device-id smoke-v2-production-launch-20260626 --source-title 'V2 production smoke short text' --raw-text '<short text>'
  ```

- Result:

  ```text
  POST https://shibei-production.up.railway.app/api/v2/chapters failed 405: {"errorCode":"method_not_allowed","message":"不支持的请求方法。"}
  ```

- Interpretation:
  - production `/api/health` is healthy, but the currently deployed production service does not expose a usable `POST /api/v2/chapters` route;
  - root local code contains the route, so this is most likely a deployment-version/path gap, not an iOS client bug;
  - phone testing against production cannot proceed until the V2-capable root backend is deployed to the production service or to a production-like staging service.

Next required action:

- Deploy or otherwise run the root `backend/` currently on this branch in a controlled environment, then rerun the same smoke command before flipping iOS Release to V2.

### 2026-06-26: Health capability probe checkpoint

- Added explicit root backend health capabilities:
  - `legacyChapterGeneration`
  - `v2ChapterGeneration`
  - `v2ReviewSessions`
  - `favoriteQuestions`
  - `notifications`
  - `sourceAnchors`
- Added unit coverage for production-critical capability flags.
- Updated `preflight:phone` to require `health.capabilities.v2ChapterGeneration === true`.
- Root backend validation passed:

  ```bash
  npm --prefix backend run check
  ```

- Production preflight now fails without creating smoke data, which is the desired behavior until the V2-capable backend is deployed:

  ```text
  FAIL v2_chapter_generation_capability - health.capabilities.v2ChapterGeneration must be true
  ```

Interpretation:

- The local/root backend is ready to advertise V2 capability.
- The currently deployed production service is still an older deployment from the perspective of V2 creation.
- The next production-readiness step is deployment/version alignment, not more client-side debugging.

### 2026-06-26: Draft deployment PR checkpoint

- Created draft PR for the full V2 replacement candidate:
  - https://github.com/MaxHan7/ShiBei/pull/3
- The PR is intentionally draft because the production service does not yet expose V2 creation capability.
- Do not merge this PR into `master` until:
  - `preflight:phone` passes against the target backend URL,
  - `smoke:v2:queue` passes against the target backend URL,
  - phone E2E passes,
  - Release entry is intentionally flipped to V2,
  - rollback and database backup are recorded.

### 2026-06-26: Production readiness gate checkpoint

- Added root backend production gate command:

  ```bash
  npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app
  ```

- The gate is intentionally split into two levels:
  - default mode is no-side-effect and only checks `/api/health`, database health, queue visibility, V2 capability flags, APNS production environment and production bundle id;
  - `--smoke` mode is explicitly opt-in and creates a controlled V2 queue smoke chapter only after the no-side-effect checks pass.
- Added `scripts/production-readiness-gate.mjs` to root backend `npm run check`.
- Expected result before the V2 backend is deployed:

  ```text
  FAIL capability_v2ChapterGeneration - health.capabilities.v2ChapterGeneration must be true
  ```

- Interpretation:
  - this failure is a deployment-version gate, not a phone-client gate;
  - do not run production smoke or phone E2E against production until this command passes without `--smoke`.

### 2026-06-26: Railway deployment-path audit checkpoint

- Root Railway config remains:
  - build command: `npm run build`
  - start command: `npm start`
  - healthcheck: `/api/health`
- GitHub PR for the V2 replacement candidate remains draft:
  - https://github.com/MaxHan7/ShiBei/pull/3
  - base: `master`
  - head: `codex/shibei-v2-isolated-build`
- Current local environment has GitHub CLI auth but no Railway CLI/login context.
- Railway official deployment paths to use after human/operator confirmation:
  - connected GitHub branch autodeploys when a new commit lands on that branch;
  - Railway dashboard can manually deploy the latest commit from the connected GitHub branch;
  - Railway CLI can deploy local code with `railway up`, but requires Railway project/service auth.
- Current decision:
  - do not merge or deploy blindly from Codex without Railway deployment id, database backup, and an agreed rollback point;
  - use `docs/v2-production-deploy-runbook-zh.md` as the operator checklist for production replacement;
  - once the V2-capable backend commit is deployed, immediately run:

    ```bash
    npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app
    ```

  - only if that passes, run the explicit smoke:

    ```bash
    npm --prefix backend run gate:production -- --base-url https://shibei-production.up.railway.app --smoke
    ```

### 2026-06-26: iOS production guard checkpoint

- Added root command:

  ```bash
  npm run check:ios-production
  ```

- The guard checks:
  - Release `APIClient.defaultBaseURL` stays on `https://shibei-production.up.railway.app`;
  - API base URL launch arguments / env overrides stay DEBUG-only;
  - V2 mock/fixture toggle is disabled in Release;
  - old settings data-source and mock-scenario controls stay DEBUG-only;
  - production bundle id and production APNS settings are present.
- Current expected state:
  - Release still uses the legacy root as a deliberate safety gate;
  - after backend production gate and phone E2E pass, flip Release to V2 and rerun:

    ```bash
    npm run check:ios-production -- --require-v2-release
    ```

### 2026-06-26: iOS signing guard checkpoint

- Build settings alone are not enough to prove production APNS. Current local automatic signing can produce a Release build whose build setting says `APS_ENVIRONMENT = production`, while the actual signed `.app` still contains a development provisioning profile.
- Added release-candidate signing gate:

  ```bash
  npm run check:ios-signing -- --app /path/to/拾贝.app
  ```

- The signing guard checks the actual signed product:
  - `CFBundleIdentifier == com.maxhan.shibei`;
  - codesigned `aps-environment == production`;
  - codesigned `get-task-allow == false`;
  - embedded provisioning profile `aps-environment == production`;
  - embedded provisioning profile `get-task-allow == false`.
- Current local automatic signing output is expected to fail this guard because it uses a development profile. This is a launch blocker until the final TestFlight/App Store distribution export passes the guard.

### 2026-06-26: Backend route contract gate checkpoint

- Added root backend route contract gate:

  ```bash
  npm --prefix backend run gate:routes
  ```

- Added `scripts/route-contract-gate.mjs` to root backend `npm run check`.
- The gate currently verifies the production-critical HTTP surface required by the V2 app:
  - health;
  - V2 chapter creation;
  - chapter list and detail;
  - V2 review session load/start and action mutations;
  - source-open and source-return mutations;
  - favorite question list/create/delete;
  - notification list/read/dismiss;
  - push token and push status endpoints.
- Validation run:

  ```bash
  npm --prefix backend run gate:routes
  npm --prefix backend run check
  ```

- Result: backend check passed with 175 tests. This does not prove production is deployed to the V2-capable commit; it prevents local/root backend regressions before deployment.
