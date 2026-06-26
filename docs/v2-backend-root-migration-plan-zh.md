# 拾贝 V2 后端迁入根 backend 计划

更新时间：2026-06-26

## 目标

把 `experiments/shibei-v2/backend` 中已经验证过的 V2 生成、队列、进度、重试、V2 review session 和序列化能力，分批迁入根目录 `backend`，让当前 Railway production service 可以在不改变部署外壳的前提下替换为 V2 行为。

## 原则

- 保留根目录 `railway.json`、`backend/package.json`、`backend/src/start.js` 作为 production service 外壳。
- 保留根 backend 的 production 默认：Railway 通过 `PORT` 注入端口，本地默认可以继续使用根 backend 既有端口。
- 不把 V2 实验 backend 的本地默认端口 `5273` 当成生产默认端口迁入根 backend。
- 不删除旧接口，直到 V2 iOS 正式 target 已经准备好。
- 每个批次都必须能单独运行 `npm --prefix backend run check` 或至少通过语法检查。
- 出现大面积冲突时停止，不用“整目录覆盖”掩盖问题。

## 当前差异摘要

V2 backend 相比根 backend：

- 纯新增：
  - `backend/src/v2/**`
- 共享文件有差异：
  - `backend/src/apns.js`
  - `backend/src/db.js`
  - `backend/src/generation/openaiClient.js`
  - `backend/src/generationJobRunner.js`
  - `backend/src/server.js`
  - `backend/src/start.js`
  - `backend/src/tests/generationJobQueue.test.js`
  - `backend/src/tests/reviewSessionLifecycle.test.js`

根 backend 没有只存在于根目录、而 V2 backend 缺失的 `src` 文件。这说明迁入难点不是文件缺失，而是共享文件需要谨慎合并。

## Batch 1: 纯新增 V2 模块

目标：先把 V2 专用模块放进根 backend，不接路由，不改变运行行为。

- [ ] Copy `experiments/shibei-v2/backend/src/v2` to `backend/src/v2`.
- [ ] Do not edit `server.js` in this batch.
- [ ] Do not edit `db.js` in this batch.
- [ ] Add V2 syntax checks to root `backend/package.json` only after files are copied.
- [ ] Run:

  ```bash
  npm --prefix backend run check
  ```

Expected:

- 旧生产行为不变。
- V2 files can parse and their standalone tests can run once package check includes them.

## Batch 2: Database And Queue Compatibility

目标：让根 backend 数据层支持 V2 queue/job 幂等，但仍不开放 V2 create route。

- [ ] Merge `idempotency_key` column and indexes into `backend/src/db.js`.
- [ ] Merge `enqueueIdempotentGenerationJob`.
- [ ] Merge `getPendingGenerationJobByIdempotencyKey`.
- [ ] Extend `normalizeGenerationJobType` to allow:
  - `v2_create_chapter`
  - `v2_regenerate_chapter`
- [ ] Merge related queue tests from V2 backend.
- [ ] Run:

  ```bash
  npm --prefix backend run check
  ```

Expected:

- Existing V1 queue/job behavior remains compatible.
- V2 job types can be enqueued idempotently.
- No HTTP API behavior changes yet.

## Batch 3: Worker Dispatch To V2 Runner

目标：让根 worker 能识别并执行 V2 job，但只有内部能力，不开放入口。

- [ ] Merge `generationJobRunner.js` V2 dispatch:
  - if `isV2GenerationJob(job)` then call `runV2GenerationQueuedJob(job)`.
- [ ] Ensure root worker still handles V1 `create_chapter` / `regenerate_chapter`.
- [ ] Keep task timeout behavior unchanged.
- [ ] Run:

  ```bash
  npm --prefix backend run check
  ```

Expected:

- Root worker can execute both V1 and V2 jobs.
- Existing V1 tests remain green.

## Batch 4: V2 Serialization And Routes

目标：开放 V2 create/review-session API，并让 `GET /api/chapters` / `GET /api/chapters/:id` 能返回 V2 字段。

- [ ] Merge V2 imports into `backend/src/server.js`.
- [ ] Merge `handleCreateV2Chapter`.
- [ ] Merge V2 serializer helpers:
  - `normalizeV2SourceBlocks`
  - `normalizeV2SummaryCard`
  - `normalizeV2ChapterSummary`
  - `normalizeV2Units`
  - `normalizeV2SourceAnchor`
  - `normalizeV2UnitQuestions`
  - `normalizeGenerationProgress`
- [ ] Extend `serializeChapterForClient` to include:
  - `schemaVersion`
  - `summaryCard`
  - `units`
  - `chapterSummary`
  - `generationProgress`
  - `v2ReviewSession`
- [ ] Merge V2 review session helpers:
  - `isV2ReviewableChapter`
  - `startOrResumeV2ReviewSession`
  - `applyV2ReviewSessionMutation`
  - `serializeV2ReviewSessionResponse`
- [ ] Add routes:
  - `POST /api/v2/chapters`
  - `GET /api/v2/chapters/:id/review-session`
  - `POST /api/v2/chapters/:id/review-session`
  - `POST /api/v2/review-sessions/:id/advance`
  - `POST /api/v2/review-sessions/:id/answer`
  - `POST /api/v2/review-sessions/:id/feedback-visibility`
  - `POST /api/v2/review-sessions/:id/source-open`
  - `POST /api/v2/review-sessions/:id/source-return`
- [ ] Keep old V1 review routes unchanged.
- [ ] Run:

  ```bash
  npm --prefix backend run check
  ```

Expected:

- V1 clients still decode old fields.
- V2 clients can submit chapters, poll progress, and run review sessions.

## Batch 5: Startup And Runtime Reliability

目标：让 production start 行为安全启动 DB 和 worker，不破坏 Railway healthcheck。

- [ ] Merge `start.js` safety improvements:
  - import env.
  - initialize DB before spawning server/worker when `DATABASE_URL` exists.
  - do not start worker when `GENERATION_WORKER_DISABLED=1`.
  - catch startup error and exit non-zero.
- [ ] Keep Railway `PORT` behavior controlled by server process.
- [ ] Verify `GET /api/health` still returns:
  - `ok`
  - `service`
  - `storage`
  - `database`
  - `queue`
  - `apns`
- [ ] Run:

  ```bash
  npm --prefix backend run check
  ```

Expected:

- One production service can start web + worker as current root architecture expects.
- Healthcheck remains compatible with Railway.

## Batch 6: Production Smoke On Non-Production Database

目标：在不碰 production DB 的情况下验证根 backend 已能跑 V2。

- [ ] Start root backend with a test `DATABASE_URL`.
- [ ] Run V2 queue smoke against root backend.
- [ ] Verify:
  - `POST /api/v2/chapters` returns `202`.
  - `GET /api/chapters/:id` shows user-facing progress.
  - worker completes or fails with readable state.
  - generated V2 chapter can start review session.

Expected:

- Root backend is ready for phone E2E against a non-production backend.

## Batch 7: Stop Point Before Production Deploy

Production deploy is blocked until these are done:

- [ ] Railway deployment id recorded.
- [ ] Production database backup created and restore path known.
- [ ] Production env key names recorded without printing secrets.
- [ ] Root production iOS target has V2 frontend logic and Release URL.
- [ ] Physical phone E2E passes against non-production backend.

## Open Risks

- Root backend currently powers the real production service; shared file merge must be reviewed carefully.
- V2 `server.js` local default port is `5273`; root backend should not inherit that default accidentally.
- V2 `src/v2/**` tests may require adding many files to root `backend/package.json` check script; do this in smaller test-script batches if command becomes unwieldy.
- Existing V1 chapter JSON and new V2 chapter JSON must coexist during transition.

