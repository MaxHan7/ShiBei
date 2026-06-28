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

test("extracts article links before running V2 generation", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "文章链接",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async (input) => {
      calls.push({ name: "extractSourceContent", input });
      return {
        sourceType: "article_link",
        sourceTitle: "提取后的标题",
        sourceUrl: input.sourceUrl,
        sourceAccount: "作者",
        rawText: "提取后的正文内容。".repeat(20)
      };
    },
    runV2GenerationJob: async (input) => {
      calls.push({ name: "runV2GenerationJob", input });
      return {
        status: "completed",
        chapter: {
          schemaVersion: "v2_review_path_1",
          id: input.chapterId,
          title: input.sourceTitle,
          status: "completed",
          source: input.source,
          units: []
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob({
    sourceType: "article_link",
    sourceUrl: "https://mp.weixin.qq.com/s/example",
    sourceTitle: "文章链接"
  }), deps);

  assert.equal(result.status, "completed");
  assert.equal(calls.find((call) => call.name === "extractSourceContent").input.sourceUrl, "https://mp.weixin.qq.com/s/example");
  const modelInput = calls.find((call) => call.name === "runV2GenerationJob").input;
  assert.equal(modelInput.sourceType, "text");
  assert.equal(modelInput.originalSourceType, "article_link");
  assert.equal(modelInput.sourceTitle, "提取后的标题");
  assert.equal(modelInput.source.author, "作者");
  assert.equal(modelInput.source.account, "作者");
  assert.equal(modelInput.source.accountOrDomain, "作者");
  assert.match(modelInput.rawText, /提取后的正文内容/);
  assert.equal(chapters.get("chapter-1").source.url, "https://mp.weixin.qq.com/s/example");
  assert.equal(
    calls.some((call) =>
      call.name === "updateGenerationJob" &&
      call.fields.currentStage === "extracting_source"
    ),
    true
  );
});

test("extracts wechat article links before running V2 generation", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "公众号文章",
      status: "submitted",
      source: { type: "wechat_article", url: "https://mp.weixin.qq.com/s/example" },
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async (input) => {
      calls.push({ name: "extractSourceContent", input });
      return {
        sourceType: "article_link",
        sourceTitle: "游戏化体验",
        sourceUrl: input.sourceUrl,
        sourceAccount: "拾贝测试号",
        rawText: "游戏化体验不是简单加积分，而是通过规则、反馈和动机设计提升用户体验。".repeat(20)
      };
    },
    runV2GenerationJob: async (input) => {
      calls.push({ name: "runV2GenerationJob", input });
      return {
        status: "completed",
        chapter: {
          schemaVersion: "v2_review_path_1",
          id: input.chapterId,
          title: input.sourceTitle,
          status: "completed",
          source: input.source,
          units: []
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob({
    sourceType: "wechat_article",
    sourceUrl: "https://mp.weixin.qq.com/s/example",
    sourceTitle: "公众号文章"
  }), deps);

  assert.equal(result.status, "completed");
  assert.equal(calls.find((call) => call.name === "extractSourceContent").input.sourceType, "article_link");
  const modelInput = calls.find((call) => call.name === "runV2GenerationJob").input;
  assert.equal(modelInput.sourceType, "text");
  assert.equal(modelInput.originalSourceType, "wechat_article");
  assert.equal(modelInput.source.type, "wechat_article");
  assert.equal(modelInput.source.accountOrDomain, "拾贝测试号");
  assert.match(modelInput.rawText, /游戏化体验/);
  assert.equal(chapters.get("chapter-1").source.type, "wechat_article");
  assert.equal(chapters.get("chapter-1").source.author, "拾贝测试号");
});

test("persists extracted article author before model output can overwrite source", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "文章链接",
      status: "submitted",
      source: { type: "article_link", url: "https://mp.weixin.qq.com/s/example" },
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async (input) => ({
      sourceType: "article_link",
      sourceTitle: "提取后的标题",
      sourceUrl: input.sourceUrl,
      sourceAccount: "吴 琼、王婧等",
      rawText: "提取后的正文内容。".repeat(20)
    }),
    runV2GenerationJob: async (input) => ({
      status: "completed",
      chapter: {
        schemaVersion: "v2_review_path_1",
        id: input.chapterId,
        title: input.sourceTitle,
        status: "completed",
        units: []
      }
    })
  });

  await runV2GenerationQueuedJob(baseJob({
    sourceType: "article_link",
    sourceUrl: "https://mp.weixin.qq.com/s/example",
    sourceTitle: "文章链接"
  }), deps);

  assert.equal(chapters.get("chapter-1").source.author, "吴 琼、王婧等");
  assert.equal(chapters.get("chapter-1").source.accountOrDomain, "吴 琼、王婧等");
});

test("stores source extraction failures without calling the model", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "文章链接",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-06-24T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async () => {
      const error = new Error("文章正文提取失败：可用正文太短，暂时无法生成复习题。");
      error.code = "failed_extract_article";
      throw error;
    },
    runV2GenerationJob: async () => {
      throw new Error("model should not be called");
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob({
    sourceType: "article_link",
    sourceUrl: "https://mp.weixin.qq.com/s/example",
    sourceTitle: "文章链接"
  }), deps);
  const failedChapter = chapters.get("chapter-1");
  const failCall = calls.find((call) => call.name === "failGenerationJob");

  assert.equal(result.status, "failed_generation");
  assert.equal(result.failedStage, "source_extraction");
  assert.equal(result.generationProgress.failureCode, "failed_extract_article");
  assert.equal(failedChapter.status, "failed_generation");
  assert.equal(failedChapter.displayStatusText, "原文提取失败");
  assert.equal(failCall.fields.retry, false);
  assert.equal(calls.some((call) => call.name === "runV2GenerationJob"), false);
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

test("does not recreate a V2 chapter deleted while the worker is running", async () => {
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
      chapters.delete("chapter-1");
      return {
        status: "completed",
        chapter: {
          schemaVersion: "v2_review_path_1",
          id: "chapter-1",
          title: "Hook",
          status: "completed",
          units: []
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob(), deps);

  assert.equal(result.status, "cancelled");
  assert.equal(chapters.has("chapter-1"), false);
  assert.equal(calls.some((call) => call.name === "completeGenerationJob"), false);
  assert.equal(calls.some((call) => call.name === "createNotification"), false);
  assert.deepEqual(
    calls.find((call) => call.name === "failGenerationJob")?.fields,
    {
      status: "cancelled",
      currentStage: "cancelled",
      errorMessage: "章节已删除，生成任务已取消。",
      retry: false,
      retryDelayMs: 0
    }
  );
});

test("ignores stale V2 failures after the chapter already completed", async () => {
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
  const completedChapter = {
    id: "chapter-1",
    title: "Hook",
    status: "completed",
    generationMeta: {},
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T12:02:00.000Z"
  };
  const deps = mockDeps({
    calls,
    chapters,
    runV2GenerationJob: async () => {
      chapters.set("chapter-1", completedChapter);
      return {
        status: "failed_generation",
        displayStatusText: "模型输出格式不稳定",
        failedStage: "structured_output",
        failureReason: "模型返回内容不是可解析 JSON，请重试。",
        retryable: false,
        canRetry: false,
        retryDelayMs: 0,
        generationProgress: {
          jobId: "job-1",
          chapterId: "chapter-1",
          status: "failed",
          stage: "failed",
          failureCode: "structured_output_failed",
          failureMessage: "模型返回内容不是可解析 JSON，请重试。"
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob(), deps);

  assert.equal(result.status, "completed");
  assert.equal(result.staleFailureIgnored, true);
  assert.equal(chapters.get("chapter-1").status, "completed");
  assert.equal(calls.some((call) => call.name === "createNotification"), false);
  assert.equal(calls.some((call) => call.name === "failGenerationJob"), false);
  assert.deepEqual(
    calls.find((call) => call.name === "completeGenerationJob")?.fields,
    {
      status: "completed",
      currentStage: "completed"
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
  assert.equal(chapters.get("chapter-1").generationProgress.displayText, "正在重试生成");
  assert.equal(calls.some((call) => call.name === "createNotification"), false);
  assert.equal(failCall.fields.retry, true);
  assert.equal(failCall.fields.retryDelayMs, 30_000);
  assert.equal(failCall.fields.currentStage, "v2_multipleChoiceDraft");
});

test("stores final failed chapter when retryable result reaches max attempts", async () => {
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

  await runV2GenerationQueuedJob({
    ...baseJob(),
    attemptCount: 2,
    maxAttempts: 2
  }, deps);
  const failCall = calls.find((call) => call.name === "failGenerationJob");

  assert.equal(chapters.get("chapter-1").status, "failed_generation");
  assert.equal(chapters.get("chapter-1").generationProgress.status, "failed");
  assert.equal(calls.some((call) => call.name === "createNotification"), true);
  assert.equal(failCall.fields.retry, false);
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

function baseJob(body = {}) {
  return {
    id: "job-1",
    deviceId: "device-1",
    chapterId: "chapter-1",
    jobType: "v2_create_chapter",
    payload: {
      body: {
        title: "Hook",
        rawText: "Hook 是流程控制器。",
        ...body
      }
    }
  };
}

function mockDeps({ calls, chapters, runV2GenerationJob, extractSourceContent }) {
  return {
    runV2GenerationJob,
    ...(extractSourceContent ? { extractSourceContent } : {}),
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
