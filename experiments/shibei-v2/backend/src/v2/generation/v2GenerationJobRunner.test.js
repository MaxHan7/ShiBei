import assert from "node:assert/strict";
import test from "node:test";

import {
  buildV2QueuedGenerationInput,
  isV2GenerationJob,
  runV2GenerationQueuedJob
} from "./v2GenerationJobRunner.js";

test("detects only V2 generation job types", () => {
  assert.equal(isV2GenerationJob({ jobType: "v2_create_chapter" }), true);
  assert.equal(isV2GenerationJob({ jobType: "v2_regenerate_chapter" }), true);
  assert.equal(isV2GenerationJob({ jobType: "create_chapter" }), false);
});

test("builds V2 generation input from queued job payload", () => {
  assert.deepEqual(
    buildV2QueuedGenerationInput({
      id: "job-1",
      chapterId: "chapter-1",
      payload: {
        body: {
          title: "Hook",
          rawText: "Hook 是流程控制器。"
        }
      }
    }),
    {
      id: "chapter-1",
      chapterId: "chapter-1",
      jobId: "job-1",
      title: "Hook",
      rawText: "Hook 是流程控制器。"
    }
  );
});

test("persists V2 progress and completes successful queued jobs", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "Hook",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async (input, options) => {
      await options.onProgress({
        jobId: input.jobId,
        chapterId: input.chapterId,
        status: "running",
        stage: "mapping_knowledge",
        displayText: "正在提取关键知识点",
        progress: 0.42,
        updatedAt: "2026-06-24T12:00:00.000Z"
      });
      return {
        status: "completed",
        chapter: {
          schemaVersion: "v2_review_path_1",
          id: input.chapterId,
          title: "Hook",
          status: "completed",
          units: [],
          generationMeta: {
            v2Progress: {
              jobId: input.jobId,
              chapterId: input.chapterId,
              status: "completed",
              stage: "completed"
            }
          }
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob(), deps);

  assert.equal(result.status, "completed");
  assert.equal(chapters.get("chapter-1").status, "completed");
  assert.equal(calls.some((call) => call.name === "completeGenerationJob"), true);
  assert.equal(calls.some((call) => call.name === "createNotification"), true);
  assert.deepEqual(
    calls.find((call) => call.name === "updateGenerationJob")?.fields,
    {
      status: "running",
      currentStage: "mapping_knowledge",
      errorMessage: ""
    }
  );
});

test("requeues retryable V2 failures with calculated delay", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "Hook",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async () => ({
      status: "failed_generation",
      displayStatusText: "模型输出格式不稳定",
      failedStage: "v2_multipleChoiceDraft",
      failureReason: "模型返回内容不是可解析 JSON，请重试。",
      retryable: true,
      canRetry: true,
      retryDelayMs: 30_000,
      generationProgress: {
        jobId: "job-1",
        chapterId: "chapter-1",
        status: "failed",
        stage: "failed",
        displayText: "模型返回内容不是可解析 JSON，请重试。",
        progress: null,
        retryCount: 0,
        canRetry: true,
        failureCode: "structured_output_failed",
        failureMessage: "模型返回内容不是可解析 JSON，请重试。",
        updatedAt: "2026-06-24T12:00:00.000Z"
      }
    })
  });

  const result = await runV2GenerationQueuedJob(baseJob(), deps);
  const failCall = calls.find((call) => call.name === "failGenerationJob");

  assert.equal(result.retryable, true);
  assert.equal(chapters.get("chapter-1").status, "submitted");
  assert.equal(chapters.get("chapter-1").generationProgress.status, "retrying");
  assert.equal(chapters.get("chapter-1").generationProgress.displayText, "生成遇到临时问题，正在重试");
  assert.equal(calls.some((call) => call.name === "createNotification"), false);
  assert.equal(failCall.fields.retry, true);
  assert.equal(failCall.fields.retryDelayMs, 30_000);
  assert.equal(failCall.fields.currentStage, "v2_multipleChoiceDraft");
});

test("simulates one retryable local V2 failure without calling model", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "Hook",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async () => {
      throw new Error("model should not be called");
    }
  });

  const result = await runV2GenerationQueuedJob({
    ...baseJob(),
    attemptCount: 1,
    payload: {
      body: {
        title: "Hook",
        rawText: "Hook 是流程控制器。"
      },
      debugV2FailureMode: "structured_output_once"
    }
  }, deps);

  assert.equal(result.retryable, true);
  assert.equal(chapters.get("chapter-1").generationProgress.status, "retrying");
  assert.equal(calls.find((call) => call.name === "failGenerationJob").fields.retry, true);
});

test("simulates permanent local V2 missing API key failure", async () => {
  const calls = [];
  const chapters = new Map();
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async () => {
      throw new Error("model should not be called");
    }
  });

  const result = await runV2GenerationQueuedJob({
    ...baseJob(),
    payload: {
      body: {
        title: "Hook",
        rawText: "Hook 是流程控制器。"
      },
      debugV2FailureMode: "missing_api_key"
    }
  }, deps);

  assert.equal(result.retryable, false);
  assert.equal(chapters.get("chapter-1").generationMeta.failureCode, "missing_api_key");
  assert.equal(calls.find((call) => call.name === "failGenerationJob").fields.retry, false);
});

test("does not requeue permanent V2 configuration failures", async () => {
  const calls = [];
  const chapters = new Map();
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async () => ({
      status: "failed_generation",
      displayStatusText: "模型配置缺失",
      failedStage: "model_calling",
      failureReason: "缺少模型 API Key。",
      retryable: false,
      canRetry: false,
      retryDelayMs: 0,
      generationProgress: {
        jobId: "job-1",
        chapterId: "chapter-1",
        status: "failed",
        stage: "failed",
        displayText: "缺少模型 API Key。",
        progress: null,
        retryCount: 0,
        canRetry: false,
        failureCode: "missing_api_key",
        failureMessage: "缺少模型 API Key。",
        updatedAt: "2026-06-24T12:00:00.000Z"
      }
    })
  });

  await runV2GenerationQueuedJob(baseJob(), deps);
  const failCall = calls.find((call) => call.name === "failGenerationJob");

  assert.equal(chapters.get("chapter-1").generationMeta.failureCode, "missing_api_key");
  assert.equal(failCall.fields.retry, false);
  assert.equal(failCall.fields.retryDelayMs, 0);
});

function baseJob() {
  return {
    id: "job-1",
    deviceId: "device-1",
    chapterId: "chapter-1",
    jobType: "v2_create_chapter",
    payload: {
      body: {
        title: "Hook",
        rawText: "Hook 是流程控制器。"
      }
    }
  };
}

function mockDeps({ calls, chapters, runV2GenerationJob }) {
  return {
    runV2GenerationJob,
    getChapter: async (_deviceId, chapterId) => chapters.get(chapterId) || null,
    upsertChapter: async (_deviceId, chapter) => {
      chapters.set(chapter.id, chapter);
      calls.push({ name: "upsertChapter", chapter });
      return chapter;
    },
    updateGenerationJob: async (_deviceId, _jobId, fields) => {
      calls.push({ name: "updateGenerationJob", fields });
    },
    completeGenerationJob: async (_deviceId, _jobId, fields) => {
      calls.push({ name: "completeGenerationJob", fields });
    },
    failGenerationJob: async (_deviceId, _jobId, fields) => {
      calls.push({ name: "failGenerationJob", fields });
    },
    createNotification: async (_deviceId, chapter) => {
      calls.push({ name: "createNotification", chapter });
    }
  };
}
