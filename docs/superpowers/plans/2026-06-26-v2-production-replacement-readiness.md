# 拾贝 V2 真实服务器替换准备计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or this repo's plan/checkpoint convention to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

把当前 `experiments/shibei-v2/` 内已经跑通的 V2 前端、V2 后端生成链路、队列、持久化进度、重试和通知逻辑，推进到“可以替换同一个线上 production service”的准备状态。

本计划不是立刻覆盖线上，而是先建立替换前必须通过的检查清单、代码准备项、数据保护项、回滚项和端到端验收项。最终上线仍使用同一个 production service，不长期维护 V1/V2 双云端服务。

## Current Audit Findings

### 已经具备的基础

- V2 后端已经有 `POST /api/v2/chapters`、V2 generation queue、worker、generation progress、retry、idempotency、V2 review session、favorite questions、notifications 和 APNS 诊断相关代码。
- V2 后端 `npm run check` 覆盖了 prompt schema、V2 generation program、queue、review session、generation progress、failure classification 和 quality experiment 等测试。
- V2 iOS 已经有 mock/local/cloud 数据模式、真实 API DTO、V2 chapter mapper、review session API、favorite API、notification API 和生成轮询。
- V2 iOS 已经能安装到物理手机；此前手机命令使用 `-ShibeiV2APIBaseURL http://10.130.96.10:5273` 指向本地 Mac backend。
- 旧版 production backend 根目录已经有 Railway 配置：`railway.json` 使用 `npm run build` 和 `npm start`，健康检查为 `/api/health`。
- 旧版 production iOS 根目录使用正式 bundle id `com.maxhan.shibei`，生产 URL 为 `https://shibei-production.up.railway.app`。

### 替换线上前的主要缺口

- V2 iOS 实验 App 当前 bundle id 是 `com.maxhan.shibei.v2.dev`，不能直接作为旧版用户的正式更新；正式替换必须切到生产 bundle id `com.maxhan.shibei` 或把 V2 代码迁回正式 App target。
- V2 iOS `APIClient.productionBaseURL` 当前仍指向本地 `127.0.0.1:5273`，正式包必须改为 HTTPS production URL，Debug/测试包继续支持 launch argument 覆盖。
- V2 后端代码还在 `experiments/shibei-v2/backend`，Railway production 当前默认会从根目录 `backend` 启动。替换前必须明确“把 V2 后端合入根 backend”还是“调整 production service 启动路径到 V2 backend”。
- V2 README 明确要求开发期不得指向 production URL、不得复用 production Railway `DATABASE_URL`、不得配置 production APNS；这些隔离规则在上线替换 checkpoint 才能解除。
- 真实 production 数据库需要上线前备份、迁移演练和回滚演练。V2 后端启动时会创建/扩展表，不能直接在未备份的生产库上试错。
- Release 版本必须隐藏或关闭 mock/fixture 测试入口，真实用户默认走 cloud API，不能看到开发态 mock 数据。
- APNS 需要按正式 bundle id、production/sandbox 环境重新核对。推送失败不能阻塞章节生成，但必须能诊断。
- 手机本地测试和线上替换不同：本地测试可以使用 LAN HTTP 和 dev bundle；线上替换必须使用 HTTPS、生产 bundle、生产 DB、生产 APNS、可回滚部署。

## Checkpoint 0: Freeze Current V2 Baseline

Purpose: 在继续做生产替换准备前，保存当前 V2 前后端和计划状态，作为回溯点。

- [ ] Confirm worktree status with `git status --short`.
- [ ] Run V2 backend static/test suite:

  ```bash
  npm --prefix experiments/shibei-v2/backend run check
  ```

- [ ] Run iOS build for the V2 experiment target:

  ```bash
  xcodebuild -project experiments/shibei-v2/ios/拾贝.xcodeproj -scheme 拾贝 -destination 'platform=iOS Simulator,name=iPhone 17' build
  ```

- [ ] Commit this plan and any current documentation-only readiness updates.

Exit criteria:

- `git status --short` is clean after commit.
- Backend check passes.
- iOS build passes, or any failure is recorded as a blocker with exact error.

## Checkpoint 1: Production Inventory And Replacement Path Decision

Purpose: 先把线上真实替换对象查清楚，再决定怎么迁移 V2。

- [ ] Record the current production backend commit:

  ```bash
  git rev-parse HEAD
  git log --oneline -5
  ```

- [ ] Record the current production service configuration:

  - Railway project/service name.
  - Current deployed commit or deployment id.
  - Current start command.
  - Current health check result from `https://shibei-production.up.railway.app/api/health`.
  - Current production environment variable names, without printing secret values.

- [ ] Record the current production iOS target:

  - Root App project path: `拾贝/拾贝.xcodeproj`.
  - Production bundle id: `com.maxhan.shibei`.
  - APNS environment value from build settings.

- [ ] Decide backend replacement path:

  - Preferred path for lowest service disruption: merge V2 backend capabilities from `experiments/shibei-v2/backend` into root `backend`, then deploy same Railway service with the existing root `railway.json`.
  - Alternative path: adjust Railway build/start commands to use `experiments/shibei-v2/backend`. This is faster but riskier because it changes service layout and must be tested against all existing production endpoints.

- [ ] Decide frontend replacement path:

  - Preferred path for existing users: port V2 iOS code into the production `com.maxhan.shibei` app target.
  - Keep `com.maxhan.shibei.v2.dev` only for isolated device testing.

Exit criteria:

- There is a written replacement-path decision.
- The production URL, deployment id, backend commit, bundle id and rollback target are recorded.
- No production code or production database has been modified yet.

## Checkpoint 2: Backend Productionization

Purpose: 让 V2 后端能作为真实 production backend 运行，而不是只作为实验 backend 运行。

- [ ] Apply the selected backend replacement path from Checkpoint 1.
- [ ] Preserve old production-compatible endpoints needed by existing clients until the new iOS build is ready:

  - `GET /api/health`
  - `GET /api/chapters`
  - `GET /api/chapters/:id`
  - notifications endpoints
  - favorite question endpoints
  - review session endpoints used by the shipping app

- [ ] Ensure V2 creation path is production-ready:

  - `POST /api/v2/chapters` quick returns.
  - Worker picks jobs from Postgres.
  - Progress writes user-facing `displayText`.
  - Failed jobs write a readable failure reason and notification.
  - Completed jobs persist V2 review path and source anchors.

- [ ] Verify worker lifecycle under production start command:

  - If one Railway process runs web + worker, confirm graceful shutdown and health behavior.
  - If separate web and worker processes are needed, record exact Railway service/process setup.

- [ ] Verify input limit:

  - MVP limit: generated article content should be capped around 6000 Chinese characters.
  - Over-limit input must fail quickly with a user-facing reason.

- [ ] Verify production env contract:

  - `DATABASE_URL`
  - `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`
  - provider/model env
  - worker concurrency and retry env
  - APNS env if notifications are enabled

- [ ] Run backend checks after merge:

  ```bash
  npm --prefix backend run check
  ```

- [ ] Run V2 queue smoke against a non-production database before production deploy.

Exit criteria:

- Backend can create, queue, generate, complete, fail and retry V2 chapters using Postgres.
- Existing required production endpoints still respond.
- There is no dependency on local `.env` or localhost in production code.

## Checkpoint 3: iOS Productionization

Purpose: 让 V2 前端能作为正式用户更新，而不是 dev App。

- [ ] Port or point V2 UI/logic into production app target with bundle id `com.maxhan.shibei`.
- [ ] Set production base URL to `https://shibei-production.up.railway.app`.
- [ ] Keep launch-argument/env base URL override only for Debug/internal builds.
- [ ] Hide or remove mock runtime controls from Release.
- [ ] Release default data mode must be cloud API, not fixture/mock.
- [ ] Ensure empty state, generating state, failed state, completed chapter, review flow, favorites and notifications work from real backend state.
- [ ] Re-check APNS bundle id and environment for production.
- [ ] Build production target:

  ```bash
  xcodebuild -project 拾贝/拾贝.xcodeproj -scheme 拾贝 -destination 'generic/platform=iOS' build
  ```

Exit criteria:

- A Release-like app build points to HTTPS production URL.
- Mock fixtures do not leak into real user state.
- Existing users receive an update under the production bundle id.

## Checkpoint 4: End-To-End Test Before Server Replacement

Purpose: 在替换线上前，用同一套用户流程验证真实后端和真实 App 行为。

- [ ] Prepare a non-production test backend using the productionized backend code and a test Postgres database.
- [ ] Install the production-bundle test build on phone.
- [ ] Run a short text generation:

  - upload text or link under input limit.
  - see generating detail page.
  - see user-facing progress text update.
  - finish into chapter detail.
  - enter review flow.
  - answer multiple-choice and matching if present.
  - open source from answered question and return without losing answered state.

- [ ] Run a failure test:

  - over-limit article or invalid URL.
  - chapter enters failed state.
  - notification detail shows failure reason.
  - regenerate button is usable.

- [ ] Run persistence test:

  - kill app during generation.
  - reopen app.
  - generation page and progress recover from backend state.

- [ ] Run notification test:

  - foreground in-app notification list.
  - APNS if configured.

Exit criteria:

- The full user path works on a physical phone with real backend state.
- Progress and failure states never get stuck silently.
- Review progress survives app restart.

## Checkpoint 5: Production Release Gate

Purpose: 决定是否可以替换同一个 production service。

- [ ] Record production database backup location and restore command.
- [ ] Record old production deployment id and rollback command.
- [ ] Run backend check on the exact deploy candidate.
- [ ] Run iOS build/archive check on the exact app candidate.
- [ ] Run one golden article quality generation and inspect HTML report.
- [ ] Run production health check against candidate environment.
- [ ] Confirm release blockers are closed:

  - no localhost in Release API URL.
  - no dev bundle id in production build.
  - no fixture-only homepage state in Release.
  - V2 backend queue uses production database safely.
  - worker is running and observable.
  - input limit and failure messages are user-friendly.

Exit criteria:

- All checklist items pass.
- The old deployment and database backup are known-good rollback points.

## Checkpoint 6: Replace Same Production Service

Purpose: 正式把 V2 后端替换到当前线上服务，并发布 V2 iOS 更新。

- [ ] Freeze production change window.
- [ ] Backup production database.
- [ ] Deploy backend candidate to the same Railway production service.
- [ ] Check:

  ```bash
  curl https://shibei-production.up.railway.app/api/health
  ```

- [ ] Run one production smoke generation with a controlled test device id.
- [ ] Submit or distribute iOS production update using bundle id `com.maxhan.shibei`.
- [ ] Monitor:

  - generation success/failure count.
  - queue depth and stale jobs.
  - model JSON parse failures.
  - request latency and timeout failures.
  - APNS send failures.

Exit criteria:

- Production service is serving V2 behavior.
- Existing app users have an update path through the same app record/bundle id.
- Smoke generation and review flow pass.

## Checkpoint 7: Rollback Playbook

Purpose: 出现严重问题时，不临时维护双 service，而是恢复旧部署。

- [ ] Backend rollback:

  - redeploy old production commit or old Railway deployment.
  - verify `/api/health`.
  - verify old App can still fetch chapters.

- [ ] Database rollback:

  - only restore database if schema/data corruption occurs.
  - otherwise keep database and deploy code rollback first.

- [ ] iOS rollback:

  - if TestFlight build is bad, stop distribution and push fixed build.
  - App Store release cannot be instantly rolled back; backend rollback must preserve compatibility enough for the shipped app where possible.

Exit criteria:

- Rollback has a rehearsed command path.
- The team knows which failure modes require backend rollback vs app hotfix.

## First Execution Order

1. Finish Checkpoint 0 and commit this readiness plan.
2. Execute Checkpoint 1 as a read-only inventory.
3. Decide backend replacement path before touching root `backend`.
4. Decide frontend replacement path before touching root `拾贝/`.
5. Only after those decisions, start Checkpoint 2 backend productionization.

