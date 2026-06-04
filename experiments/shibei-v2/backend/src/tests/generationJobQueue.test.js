import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeGenerationJobInput,
  normalizeGenerationJobRow,
  shouldRetryGenerationJob
} from "../db.js";

test("normalizes enqueued generation job defaults", () => {
  const job = normalizeGenerationJobInput({
    id: "generation-1",
    chapterId: "chapter-1",
    payload: { body: { sourceType: "text", rawText: "hello" } }
  });

  assert.equal(job.id, "generation-1");
  assert.equal(job.chapterId, "chapter-1");
  assert.equal(job.status, "submitted");
  assert.equal(job.currentStage, "submitted");
  assert.equal(job.jobType, "create_chapter");
  assert.equal(job.maxAttempts, 2);
  assert.deepEqual(job.payload, { body: { sourceType: "text", rawText: "hello" } });
});

test("normalizes database queue rows into worker-friendly objects", () => {
  const row = normalizeGenerationJobRow({
    id: "generation-1",
    device_id: "device-1",
    chapter_id: "chapter-1",
    status: "generating_questions",
    current_stage: "generating_questions",
    job_type: "regenerate_chapter",
    payload_json: { chapterId: "chapter-1" },
    queue_status: "running",
    attempt_count: 1,
    max_attempts: 2,
    locked_by: "worker-1",
    locked_until: new Date("2026-05-27T00:00:00.000Z"),
    started_at: new Date("2026-05-27T00:00:00.000Z")
  });

  assert.equal(row.deviceId, "device-1");
  assert.equal(row.chapterId, "chapter-1");
  assert.equal(row.currentStage, "generating_questions");
  assert.equal(row.jobType, "regenerate_chapter");
  assert.equal(row.queueStatus, "running");
  assert.equal(row.attemptCount, 1);
  assert.equal(row.lockedBy, "worker-1");
  assert.equal(row.lockedUntil, "2026-05-27T00:00:00.000Z");
});

test("does not treat unknown queue rows as queued work", () => {
  const row = normalizeGenerationJobRow({
    id: "legacy-generation",
    device_id: "device-1",
    chapter_id: "chapter-1",
    queue_status: ""
  });

  assert.equal(row.queueStatus, "completed");
});

test("allows retry only before max attempts", () => {
  assert.equal(shouldRetryGenerationJob({ attemptCount: 1, maxAttempts: 2 }), true);
  assert.equal(shouldRetryGenerationJob({ attemptCount: 2, maxAttempts: 2 }), false);
  assert.equal(shouldRetryGenerationJob({ attempt_count: 3, max_attempts: 3 }), false);
});
