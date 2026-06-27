import assert from "node:assert/strict";
import test from "node:test";

import { runV2GenerationJob } from "./runV2GenerationJob.js";

test("returns completed status with a generated V2 chapter", async () => {
  const progressEvents = [];
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    onProgress: (event) => progressEvents.push(event),
    generateReviewPath: async () => ({
      schemaVersion: "v2_review_path_1",
      id: "chapter-001",
      status: "completed",
      title: "Hook",
      units: []
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.displayStatusText, "已生成");
  assert.equal(result.chapter.id, "chapter-001");
  assert.equal(result.generationProgress.status, "completed");
  assert.equal(result.chapter.generationMeta.v2Progress.status, "completed");
  assert.equal(progressEvents[0].stage, "accepted");
  assert.equal(progressEvents.at(-1).stage, "completed");
});

test("passes custom prompt caller factory through to V2 generation", async () => {
  const createPromptCaller = () => async () => ({});
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    createPromptCaller,
    generateReviewPath: async (_input, options) => ({
      schemaVersion: "v2_review_path_1",
      id: "chapter-001",
      status: "completed",
      title:
        options.createPromptCaller === createPromptCaller &&
        options.generationMetaMode === "production"
          ? "factory passed"
          : "factory missing",
      units: []
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.chapter.title, "factory passed");
});

test("allows quality callers to request full generation metadata", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generationMetaMode: "quality",
    generateReviewPath: async (_input, options) => ({
      schemaVersion: "v2_review_path_1",
      id: "chapter-001",
      status: "completed",
      title: options.generationMetaMode === "quality" ? "quality meta" : "wrong meta",
      units: []
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.chapter.title, "quality meta");
});

test("maps missing API key errors to a non-retryable configuration failure", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      throw new Error("缺少模型 API Key。请先设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。");
    }
  });

  assert.equal(result.status, "failed_generation");
  assert.equal(result.displayStatusText, "模型配置缺失");
  assert.equal(result.failedStage, "model_calling");
  assert.equal(result.retryable, false);
  assert.equal(result.canRetry, false);
  assert.equal(result.generationProgress.failureCode, "missing_api_key");
  assert.equal(result.generationProgress.canRetry, false);
  assert.equal(result.failureReason, "生成服务暂时不可用，请稍后再试。");
});

test("maps quality discard to non-completed generation failure", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      const error = new Error("V2 review path discarded by quality judge");
      error.issues = [{ code: "unsupported_answer", message: "答案缺少来源支撑" }];
      throw error;
    }
  });

  assert.equal(result.status, "failed_quality");
  assert.equal(result.failedStage, "quality_checking");
  assert.equal(result.retryable, false);
  assert.equal(result.canRetry, true);
  assert.equal(result.generationProgress.failureCode, "quality_failed");
  assert.equal(result.generationProgress.canRetry, true);
  assert.equal(result.failureReason, "这篇内容暂时没有生成出足够适合复习的题目。可以稍后重新生成。");
});

test("maps contract validation errors to non-retryable generation failure", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      const error = new Error("Generated V2 review path failed contract validation");
      error.errors = ["payload.units must not be empty"];
      throw error;
    }
  });

  assert.equal(result.status, "failed_generation");
  assert.equal(result.failedStage, "contract_validation");
  assert.equal(result.retryable, false);
  assert.equal(result.canRetry, false);
  assert.equal(result.generationProgress.failureCode, "contract_validation_failed");
  assert.equal(result.failureReason, "内容生成时遇到结构处理异常。可以删除章节后重新生成。");
});

test("preserves model prompt stage when JSON generation fails", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      const error = new Error("模型返回内容不是可解析 JSON，请重试。");
      error.stage = "v2_multipleChoiceDraft";
      error.modelStage = "multipleChoiceDraft";
      error.retryAttempts = 3;
      error.runtimeErrorType = "json_parse_error";
      error.stageRuntime = {
        schemaVersion: "v2_stage_runtime_1",
        callCount: 1,
        attemptCount: 3,
        failedAttemptCount: 3,
        retryAttemptCount: 2,
        stages: [],
        attempts: []
      };
      throw error;
    }
  });

  assert.equal(result.status, "failed_generation");
  assert.equal(result.failedStage, "v2_multipleChoiceDraft");
  assert.equal(result.modelStage, "multipleChoiceDraft");
  assert.equal(result.retryAttempts, 3);
  assert.equal(result.runtimeErrorType, "json_parse_error");
  assert.equal(result.stageRuntime.failedAttemptCount, 3);
  assert.equal(result.retryable, true);
  assert.equal(result.canRetry, true);
  assert.ok(result.retryDelayMs >= 80_000);
  assert.ok(result.retryDelayMs <= 120_000);
  assert.equal(result.generationProgress.status, "failed");
  assert.equal(result.generationProgress.canRetry, true);
  assert.equal(result.generationProgress.failureCode, "structured_output_failed");
});

test("rejects overlong V2 article input before model generation", async () => {
  let called = false;
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Long",
    rawText: "字".repeat(50001)
  }, {
    generateReviewPath: async () => {
      called = true;
      return {};
    }
  });

  assert.equal(called, false);
  assert.equal(result.status, "failed_input");
  assert.equal(result.failedStage, "input_validation");
  assert.equal(result.retryable, false);
  assert.equal(result.generationProgress.failureCode, "input_too_long");
});

test("passes V2 progress reporter through to the generation program", async () => {
  const progressEvents = [];
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    onProgress: (event) => progressEvents.push(event),
    generateReviewPath: async (_input, options) => {
      await options.onProgress({
        chapterId: "chapter-001",
        status: "running",
        stage: "mapping_knowledge",
        displayText: "正在提取关键知识点",
        progress: 0.42,
        retryCount: 0,
        canRetry: false,
        updatedAt: "2026-06-24T12:00:00.000Z"
      });
      return {
        schemaVersion: "v2_review_path_1",
        id: "chapter-001",
        status: "completed",
        title: "Hook",
        units: []
      };
    }
  });

  assert.equal(result.status, "completed");
  assert.equal(progressEvents.some((event) => event.stage === "mapping_knowledge"), true);
});
