import assert from "node:assert/strict";
import test from "node:test";

import { runV2GenerationJob } from "./runV2GenerationJob.js";

test("returns completed status with a generated V2 chapter", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
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
      title: options.createPromptCaller === createPromptCaller ? "factory passed" : "factory missing",
      units: []
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.chapter.title, "factory passed");
});

test("maps missing API key errors to a retryable generation failure", async () => {
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
  assert.equal(result.displayStatusText, "生成失败");
  assert.equal(result.failedStage, "model_calling");
  assert.equal(result.retryable, true);
  assert.match(result.failureReason, /API Key/);
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
  assert.equal(result.retryable, true);
  assert.match(result.failureReason, /答案缺少来源支撑/);
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
  assert.match(result.failureReason, /payload.units/);
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
});
