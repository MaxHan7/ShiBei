# V2 Queued Generation Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a V2-only persistent generation job runner that uses the existing queue table, preserves V1 behavior, and applies the V2 progress/failure/retry contracts.

**Architecture:** Keep old `create_chapter` / `regenerate_chapter` jobs on the existing V1 runner. Add explicit `v2_create_chapter` / `v2_regenerate_chapter` job types and route only those through a new V2 runner. The V2 runner persists user-facing progress to `chapter.generationProgress`, stores final V2 review paths, and uses `retryDelayMs` when requeueing transient failures.

**Tech Stack:** Node.js backend, PostgreSQL queue table, `node:test`, V2 generation pipeline.

---

## Industry Reference Summary

The runner follows mature background-job/retry guidance:

- AWS Builders Library: retries are useful for transient failures, but must be paired with timeouts, backoff, jitter, idempotency, and limited retry points to avoid amplifying overload.
- AWS idempotent API guidance: resource-creating operations need explicit client/request identity so retries do not duplicate side effects.
- Google retry guidance: retry only when both response and idempotency criteria are satisfied, with exponential backoff and jitter.
- Azure Retry / transient-fault guidance: use finite retries; do not retry permanent/user/configuration failures; use circuit-breaker/dead-letter thinking when retry exhaustion indicates a poison job.
- Queue-processing checklist: idempotency, visibility timeout/lock timeout, finite retry limits, poison message handling, and metrics/progress visibility.

## File Structure

- Create `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.js`
  - Owns V2 queue job execution only.
  - Accepts injectable dependencies for tests.
  - Persists progress, success, and failure.
- Create `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.test.js`
  - Tests routing, progress persistence, success completion, retry failure, and permanent failure.
- Modify `experiments/shibei-v2/backend/src/db.js`
  - Allow `v2_create_chapter` and `v2_regenerate_chapter` as first-class job types.
- Modify `experiments/shibei-v2/backend/src/tests/generationJobQueue.test.js`
  - Assert V2 job types normalize and unknown types still fall back safely.
- Modify `experiments/shibei-v2/backend/src/generationJobRunner.js`
  - Route V2 job types to the V2 runner before V1 logic.
- Modify `experiments/shibei-v2/backend/package.json`
  - Add new module and test to `npm run check`.
- Modify `experiments/shibei-v2/docs/v2-llm-runtime-reliability-contract-zh.md`
  - Mark the V2 queued runner checkpoint and document the V1/V2 routing boundary.

## Task 1: Add V2 Job Type Normalization

**Files:**
- Modify: `experiments/shibei-v2/backend/src/db.js`
- Modify: `experiments/shibei-v2/backend/src/tests/generationJobQueue.test.js`

- [x] Add `v2_create_chapter` and `v2_regenerate_chapter` to `normalizeGenerationJobType()`.
- [x] Keep unknown job types falling back to `create_chapter`.
- [x] Run `node --test src/tests/generationJobQueue.test.js`.

## Task 2: Add V2 Queue Runner

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/v2GenerationJobRunner.test.js`

- [x] Export `V2_GENERATION_JOB_TYPES`.
- [x] Export `isV2GenerationJob(job)`.
- [x] Implement `runV2GenerationQueuedJob(job, deps)`:
  - Build input from `job.payload.body` or `job.payload`.
  - Inject `id/chapterId/jobId` into the V2 generation input.
  - Pass `generationMetaMode: "production"`.
  - Persist each `onProgress` event into the existing chapter and `generation_jobs`.
  - On completion, upsert the generated V2 chapter, complete the job, and create notification.
  - On retryable failure, call `failGenerationJob(..., { retry: true, retryDelayMs })`.
  - On permanent failure, upsert a failed chapter, fail the job, and create notification.
- [x] Test completion path.
- [x] Test retryable structured-output failure uses `retryDelayMs`.
- [x] Test `missing_api_key` does not retry.

## Task 3: Route V2 Jobs From Existing Worker

**Files:**
- Modify: `experiments/shibei-v2/backend/src/generationJobRunner.js`

- [x] Import `isV2GenerationJob` and `runV2GenerationQueuedJob`.
- [x] At the top of `runGenerationJob`, branch V2 jobs to the V2 runner.
- [x] Do not change V1 `create_chapter` / `regenerate_chapter` behavior.

## Task 4: Wire Check Script and Docs

**Files:**
- Modify: `experiments/shibei-v2/backend/package.json`
- Modify: `experiments/shibei-v2/docs/v2-llm-runtime-reliability-contract-zh.md`

- [x] Add new JS/test files to `node --check`.
- [x] Add new test file to `node --test`.
- [x] Document that V2 jobs are isolated by job type.
- [x] Document that `retryDelayMs` drives `generation_jobs.available_at`.

## Task 5: Verify and Commit

- [x] Run `node --test src/tests/generationJobQueue.test.js src/v2/generation/v2GenerationJobRunner.test.js src/v2/generation/runV2GenerationJob.test.js`.
- [x] Run `npm --prefix experiments/shibei-v2/backend run check`.
- [ ] Commit with message `Add V2 queued generation runner`.

