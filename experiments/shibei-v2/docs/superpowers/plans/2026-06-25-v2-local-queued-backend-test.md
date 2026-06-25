# V2 Local Queued Backend Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable a complete local Simulator/backend test of V2 generation with persistent queue, progress polling, and retry behavior, without deploying or replacing the production service.

**Architecture:** Keep V1 `/api/chapters` unchanged. Add a V2-only enqueue endpoint that creates `v2_create_chapter` jobs, writes a pending V2 chapter with `generationProgress`, and lets the existing worker route V2 jobs through `runV2GenerationQueuedJob`. Progress uses a two-layer contract: machine state (`queued/running/retrying/completed/failed`) is for polling and retry logic; user-visible copy (`正在提取原文`, `正在总结知识点`, `正在为单元一生成题目`) is derived from the real V2 pipeline stage and is the only text SwiftUI should show. Add local smoke scripts/docs so we can verify success, progress persistence, retryable failure, permanent failure, and notification creation against a local Postgres database.

**Tech Stack:** Node.js backend, PostgreSQL, existing `generation_jobs` table, V2 generation pipeline, SwiftUI Simulator pointing at local backend.

---

## Current State

Already done:

- `generation_jobs` supports queue state, worker locks, attempts, max attempts, idempotency key, and delayed `available_at`.
- Worker claims jobs via `FOR UPDATE SKIP LOCKED`.
- V2 runner exists for explicit job types:
  - `v2_create_chapter`
  - `v2_regenerate_chapter`
- V2 runner persists `generationProgress`, completes successful jobs, and uses `retryDelayMs` for retryable failures.

Still missing for end-to-end local testing:

- A V2 API endpoint that actually enqueues `v2_create_chapter`.
- A local setup doc or script for Postgres + backend env.
- A simple way to poll progress from the same API the Simulator will use.
- A stable user-facing progress vocabulary that maps backend stages to understandable generation messages.
- A safe local-only way to force retryable and permanent failures without waiting for random provider failures.

## Industry Reference Summary

This plan follows the same reliability model as the previous backend checkpoints:

- AWS Builders Library: retries around side effects need idempotency; retries should use backoff and jitter to avoid overload.
- Google Cloud Tasks: queue retry policies expose max attempts, max retry duration, and retry intervals/backoff.
- Azure Retry / Transient Fault Handling: retry only transient faults, track retry counts, and do not retry permanent/user/configuration failures.
- Azure Circuit Breaker: repeated downstream failure should stop blind retrying and surface a failed state instead of causing retry storms.

## Task 1: Add Local Environment Setup Notes

**Files:**
- Create: `experiments/shibei-v2/backend/.env.example`
- Create: `experiments/shibei-v2/docs/v2-local-backend-queue-test-zh.md`

- [x] Add `.env.example` with:
  - `PORT=5273`
  - `DATABASE_URL=postgres://postgres:postgres@localhost:5432/shibei_v2_local`
  - `DEEPSEEK_API_KEY=replace_me`
  - `AI_PROVIDER=deepseek`
  - `GENERATION_WORKER_CONCURRENCY=1`
  - `GENERATION_WORKER_POLL_MS=500`
  - `GENERATION_JOB_MAX_ATTEMPTS=2`
- [x] Document local Postgres options:
  - Preferred simple local option: existing Postgres app / Homebrew Postgres.
  - Alternative: Docker Postgres.
- [x] Document commands:
  - `createdb shibei_v2_local`
  - `cp experiments/shibei-v2/backend/.env.example experiments/shibei-v2/backend/.env`
  - Fill `DEEPSEEK_API_KEY`.
  - `npm --prefix experiments/shibei-v2/backend start`
- [x] Document health check:
  - `curl http://localhost:5273/api/health`
  - Expected JSON includes database health and queue summary when `DATABASE_URL` is configured.

## Task 2: Add V2 Enqueue Endpoint

**Files:**
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Test: create or modify `experiments/shibei-v2/backend/src/tests/v2ChapterQueueEndpoint.test.js`

- [x] Add a V2-only route:
  - `POST /api/v2/chapters`
  - It reads the same article body shape as current `/api/chapters`.
  - It never changes existing `/api/chapters`.
- [x] Use `buildV2GenerationIdempotencyKey()` to build a stable key from:
  - `deviceId`
  - `jobType: "v2_create_chapter"`
  - `sourceUrl` or `rawText/contentHash`
  - optional `clientRequestId`
- [x] Use `enqueueIdempotentGenerationJob()` instead of plain `enqueueGenerationJob()`.
- [x] Persist a pending V2 chapter before enqueue:
  - `status: "submitted"`
  - `displayStatusText: "已收到文章，准备生成"`
  - `generationProgress.status: "queued"`
  - `generationProgress.stage: "accepted"`
  - `generationProgress.stageGroup: "intake"`
  - `generationProgress.displayText: "已收到文章，准备生成"`
  - `generationProgress.userVisible: true`
- [x] Enqueue:
  - `jobType: "v2_create_chapter"`
  - `payload: { body }`
  - `idempotencyKey`
  - `maxAttempts` from default config unless overridden by tests.
- [x] Response should include:
  - `status`
  - `chapter`
  - `generationProgress`
  - `job`
  - `reused`
- [x] Test duplicate `clientRequestId` returns the same pending job instead of creating another.

## Task 3: Add V2 Progress Polling Contract

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-local-backend-queue-test-zh.md`
- Test or inspect existing V2 progress writes in: `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.js`

- [x] Confirm existing endpoint works:
  - `GET /api/chapters/:chapterId`
  - It serializes `generationProgress` from `chapter.generationProgress` or `generationMeta.v2Progress`.
- [x] Document Simulator polling:
  - Upload creates chapter/job.
  - Poll `GET /api/chapters/:chapterId` every 1-2 seconds while `generationProgress.status` is `queued/running/retrying`.
  - Stop when `completed` or `failed`.
- [x] Document the two-layer progress contract:
  - `generationProgress.status` is machine-readable only:
    - `queued`: job accepted, waiting for worker.
    - `running`: worker is actively generating.
    - `retrying`: retryable failure happened and job is waiting for next attempt.
    - `completed`: generation finished.
    - `failed`: generation cannot continue.
  - SwiftUI must not display raw `queued/running/retrying`.
  - SwiftUI should display `generationProgress.displayText`.
  - `displayText` should be generated from backend stage, not hard-coded on the client.
- [x] Add or document stable user-facing stages:
  - `accepted`: `已收到文章，准备生成`
  - `extracting_source`: `正在提取原文`
  - `planning_chapter`: `正在梳理文章结构`
  - `summarizing_units`: `正在总结知识点`
  - `mapping_unit_knowledge`: `正在拆解单元知识点`
  - `planning_unit_tasks`: `正在规划复习题`
  - `drafting_unit_questions`: `正在为{unitTitleOrIndex}生成题目`
  - `drafting_unit_copy`: `正在整理{unitTitleOrIndex}的总结`
  - `saving_result`: `正在保存复习内容`
  - `retry_wait`: `生成遇到临时问题，正在重试`
  - `completed`: `生成完成`
  - `failed`: `生成失败，请稍后重试`
- [x] Define dynamic unit label rules:
  - If `unitTitle` exists and is short enough, use `正在为「{unitTitle}」生成题目`.
  - If `unitTitle` is missing or too long, use `正在为单元{unitIndex + 1}生成题目`.
  - Keep user-facing copy short enough for the upload/generation modal and the all-chapters generating card.
- [x] Ensure `generationProgress` can carry:
  - `stage`
  - `stageGroup`
  - `status`
  - `displayText`
  - `unitIndex`
  - `unitTitle`
  - `attempt`
  - `maxAttempts`
  - `failureCode`
  - `failureMessage`
- [x] Document queue health:
  - `GET /api/health` includes `queue`.
  - `queued/running/failed/completed` counts can be used during local debugging.

## Task 4: Add Local Failure Simulation

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.test.js`
- Doc: `experiments/shibei-v2/docs/v2-local-backend-queue-test-zh.md`

- [x] Add a dev-only payload flag, ignored in production:
  - `payload.debugV2FailureMode`
  - Allowed only when `NODE_ENV !== "production"`.
- [x] Support:
  - `structured_output_once`: first attempt returns a retryable structured-output failure with `retryDelayMs`, second attempt proceeds normally.
  - `missing_api_key`: returns a permanent `missing_api_key` failure.
- [x] Store simulated attempt marker in `job.payload` or derive from `attemptCount`:
  - If `attemptCount <= 1`, fail once.
  - If `attemptCount > 1`, run normal V2 generation.
- [x] Test:
  - Retryable simulated failure calls `failGenerationJob(... retry: true, retryDelayMs > 0)`.
  - Permanent simulated failure calls `failGenerationJob(... retry: false)`.
  - Production mode ignores or rejects debug flags.

## Task 5: Add Smoke Test Script

**Files:**
- Create: `experiments/shibei-v2/backend/scripts/smoke-v2-queue.mjs`
- Modify: `experiments/shibei-v2/backend/package.json`

- [x] Script accepts:
  - `--base-url http://localhost:5273`
  - `--mode success|retry-once|permanent-failure`
- [x] Script does:
  - POST `/api/v2/chapters`
  - Print `chapterId`, `jobId`, `reused`
  - Poll `GET /api/chapters/:chapterId`
  - Print every changed `generationProgress.stage/status/displayText/failureCode`
  - Stop on completed/failed.
- [x] Add package script:
  - `smoke:v2:queue`
- [x] Document commands:
  - Success path.
  - Retry-once path.
  - Permanent failure path.

## Task 6: Connect Simulator To Local Backend

**Files:**
- Modify only if needed after inspection:
  - `experiments/shibei-v2/ios/...`
- Doc: `experiments/shibei-v2/docs/v2-local-backend-queue-test-zh.md`

- [ ] Identify current SwiftUI backend base URL configuration.
- [ ] Add or document local base URL:
  - iOS Simulator usually can access Mac localhost as `http://localhost:5273`.
  - Physical device should use Mac LAN IP, e.g. `http://192.168.x.x:5273`.
- [ ] Ensure upload flow uses `/api/v2/chapters` when V2 mode is enabled.
- [ ] Ensure UI polls `generationProgress` and shows:
  - `generationProgress.displayText`, for example `正在提取原文`, `正在总结知识点`, `正在为单元二生成题目`.
  - User-friendly retry copy, for example `生成遇到临时问题，正在重试`.
  - User-friendly failure copy with a retry action, not raw `failed` / `missing_api_key` text.
  - Never show raw internal status strings such as `queued`, `running`, or `retrying` as UI labels.

## Task 7: Verification Checklist

**Commands:**

```bash
node --test \
  src/tests/v2ChapterQueueEndpoint.test.js \
  src/v2/generation/v2GenerationJobRunner.test.js \
  src/v2/generation/runV2GenerationJob.test.js

npm --prefix experiments/shibei-v2/backend run check
```

**Manual smoke:**

```bash
npm --prefix experiments/shibei-v2/backend start
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode success
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode retry-once
npm --prefix experiments/shibei-v2/backend run smoke:v2:queue -- --mode permanent-failure
```

**Actual check run:**

- [x] `cd experiments/shibei-v2/backend && node --test src/v2/generation/v2ChapterQueue.test.js src/v2/generation/generationProgress.test.js src/v2/generation/v2GenerationJobRunner.test.js`
- [x] `npm --prefix experiments/shibei-v2/backend run check`

**Expected result:**

- Success mode eventually returns a completed V2 chapter.
- Retry-once mode first requeues, then succeeds.
- Permanent failure mode enters failed state and does not requeue.
- `GET /api/health` queue counts make sense before/during/after jobs.
- Simulator can display progress without deployment.

## Task 8: Commit Checkpoint

- [ ] Commit after tests pass:

```bash
git add experiments/shibei-v2
git commit -m "Add local V2 queued backend test path"
```
