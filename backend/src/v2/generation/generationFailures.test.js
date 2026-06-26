import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateV2GenerationRetryDelayMs,
  classifyV2GenerationFailure,
  V2_GENERATION_FAILURE_CODE
} from "./generationFailures.js";

test("classifies overlong input as non-retryable user input failure", () => {
  const error = new Error("这篇文章目前太长，建议控制在 6000 字以内。");
  error.code = "input_too_long";

  const failure = classifyV2GenerationFailure(error);

  assert.equal(failure.code, V2_GENERATION_FAILURE_CODE.INPUT_TOO_LONG);
  assert.equal(failure.status, "failed_input");
  assert.equal(failure.failedStage, "input_validation");
  assert.equal(failure.retryable, false);
  assert.equal(failure.canRetry, false);
});

test("classifies missing API keys as non-retryable configuration failures", () => {
  const failure = classifyV2GenerationFailure(
    new Error("缺少模型 API Key。请先设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。")
  );

  assert.equal(failure.code, V2_GENERATION_FAILURE_CODE.MISSING_API_KEY);
  assert.equal(failure.failedStage, "model_calling");
  assert.equal(failure.retryable, false);
  assert.equal(failure.canRetry, false);
});

test("classifies structured output failures as retryable runtime failures", () => {
  const error = new Error("模型返回内容不是可解析 JSON，请重试。");
  error.stage = "v2_multipleChoiceDraft";
  error.runtimeErrorType = "json_parse_error";

  const failure = classifyV2GenerationFailure(error);

  assert.equal(failure.code, V2_GENERATION_FAILURE_CODE.STRUCTURED_OUTPUT_FAILED);
  assert.equal(failure.failedStage, "v2_multipleChoiceDraft");
  assert.equal(failure.retryable, true);
  assert.equal(failure.canRetry, true);
});

test("classifies contract validation as a non-retryable internal failure", () => {
  const error = new Error("Generated V2 review path failed contract validation");
  error.errors = ["payload.units must not be empty"];

  const failure = classifyV2GenerationFailure(error);

  assert.equal(failure.code, V2_GENERATION_FAILURE_CODE.CONTRACT_VALIDATION_FAILED);
  assert.equal(failure.failedStage, "contract_validation");
  assert.equal(failure.failureReason, "payload.units must not be empty");
  assert.equal(failure.retryable, false);
  assert.equal(failure.canRetry, false);
});

test("classifies quality failures as user-retryable but not automatic retry failures", () => {
  const error = new Error("V2 review path discarded by quality judge");
  error.issues = [{ code: "unsupported_answer", message: "答案缺少来源支撑" }];

  const failure = classifyV2GenerationFailure(error);

  assert.equal(failure.code, V2_GENERATION_FAILURE_CODE.QUALITY_FAILED);
  assert.equal(failure.status, "failed_quality");
  assert.equal(failure.retryable, false);
  assert.equal(failure.canRetry, true);
});

test("classifies provider rate limit and timeout as retryable failures", () => {
  const timeout = new Error("请求超时");
  timeout.stage = "v2_reviewPathPlan";
  timeout.runtimeErrorType = "timeout";
  const rateLimit = new Error("429 rate limit exceeded");

  assert.equal(classifyV2GenerationFailure(timeout).code, V2_GENERATION_FAILURE_CODE.PROVIDER_TIMEOUT);
  assert.equal(classifyV2GenerationFailure(timeout).retryable, true);
  assert.equal(classifyV2GenerationFailure(rateLimit).code, V2_GENERATION_FAILURE_CODE.PROVIDER_RATE_LIMITED);
  assert.equal(classifyV2GenerationFailure(rateLimit).retryable, true);
});

test("calculates bounded exponential retry delays with jitter", () => {
  assert.equal(calculateV2GenerationRetryDelayMs({ attemptCount: 1, random: () => 0 }), 5_000);
  assert.equal(calculateV2GenerationRetryDelayMs({ attemptCount: 1, random: () => 1 }), 10_000);
  assert.equal(calculateV2GenerationRetryDelayMs({ attemptCount: 2, random: () => 0.5 }), 30_000);
  assert.equal(calculateV2GenerationRetryDelayMs({ attemptCount: 3, random: () => 1 }), 120_000);
});
