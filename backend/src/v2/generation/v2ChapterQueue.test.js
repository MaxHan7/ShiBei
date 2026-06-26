import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPendingV2Chapter,
  buildV2ChapterQueueIdempotencyKey,
  enqueueV2ChapterGeneration
} from "./v2ChapterQueue.js";

test("builds pending V2 chapter with user-facing accepted progress", () => {
  const chapter = buildPendingV2Chapter(
    {
      sourceTitle: "游戏化体验",
      rawText: "游戏化不是简单加积分。"
    },
    {
      chapterId: "chapter-v2",
      jobId: "job-v2",
      now: "2026-06-25T09:00:00.000Z"
    }
  );

  assert.equal(chapter.id, "chapter-v2");
  assert.equal(chapter.status, "submitted");
  assert.equal(chapter.generationProgress.status, "queued");
  assert.equal(chapter.generationProgress.stage, "accepted");
  assert.equal(chapter.generationProgress.stageGroup, "intake");
  assert.equal(chapter.generationProgress.displayText, "准备生成");
  assert.equal(chapter.generationProgress.userVisible, true);
});

test("builds stable V2 queue idempotency key from client request id", () => {
  const key = buildV2ChapterQueueIdempotencyKey({
    deviceId: "device-1",
    body: {
      clientRequestId: "Upload 001"
    }
  });

  assert.equal(key, "upload-001");
});

test("enqueues a new V2 chapter generation job", async () => {
  const calls = [];
  const chapters = new Map();
  const jobs = new Map();
  const result = await enqueueV2ChapterGeneration({
    deviceId: "device-1",
    body: {
      clientRequestId: "upload-001",
      sourceTitle: "Hook",
      rawText: "Hook 是流程控制器。"
    },
    now: "2026-06-25T09:00:00.000Z",
    deps: mockDeps({ calls, chapters, jobs })
  });

  assert.equal(result.reused, false);
  assert.equal(result.chapter.status, "submitted");
  assert.equal(result.job.jobType, "v2_create_chapter");
  assert.equal(result.job.idempotencyKey, "upload-001");
  assert.deepEqual(
    calls.map((call) => call.name),
    ["getPendingGenerationJobByIdempotencyKey", "upsertChapter", "enqueueIdempotentGenerationJob"]
  );
});

test("reuses existing pending V2 generation job", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-existing", {
      id: "chapter-existing",
      status: "submitted",
      generationProgress: { status: "queued", displayText: "准备生成" }
    }]
  ]);
  const jobs = new Map([
    ["upload-001", {
      id: "job-existing",
      chapterId: "chapter-existing",
      jobType: "v2_create_chapter",
      idempotencyKey: "upload-001"
    }]
  ]);

  const result = await enqueueV2ChapterGeneration({
    deviceId: "device-1",
    body: {
      clientRequestId: "upload-001",
      rawText: "Hook 是流程控制器。"
    },
    deps: mockDeps({ calls, chapters, jobs })
  });

  assert.equal(result.reused, true);
  assert.equal(result.job.id, "job-existing");
  assert.equal(result.chapter.id, "chapter-existing");
  assert.deepEqual(
    calls.map((call) => call.name),
    ["getPendingGenerationJobByIdempotencyKey", "getChapter"]
  );
});

function mockDeps({ calls, chapters, jobs }) {
  return {
    getPendingGenerationJobByIdempotencyKey: async (_deviceId, key) => {
      calls.push({ name: "getPendingGenerationJobByIdempotencyKey", key });
      return jobs.get(key) || null;
    },
    getChapter: async (_deviceId, chapterId) => {
      calls.push({ name: "getChapter", chapterId });
      return chapters.get(chapterId) || null;
    },
    upsertChapter: async (_deviceId, chapter) => {
      calls.push({ name: "upsertChapter", chapter });
      chapters.set(chapter.id, chapter);
      return chapter;
    },
    enqueueIdempotentGenerationJob: async (_deviceId, job) => {
      calls.push({ name: "enqueueIdempotentGenerationJob", job });
      const normalized = {
        ...job,
        deviceId: _deviceId,
        queueStatus: "queued",
        attemptCount: 0
      };
      jobs.set(job.idempotencyKey, normalized);
      return { job: normalized, reused: false };
    }
  };
}
