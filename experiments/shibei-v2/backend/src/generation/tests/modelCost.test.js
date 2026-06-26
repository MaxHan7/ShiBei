import assert from "node:assert/strict";
import test from "node:test";

import {
  buildModelUsageRecord,
  createModelUsageRecorder,
  estimateCachedInputTokensFromHistory,
  estimateTokenCount,
  normalizeProviderUsage,
  summarizeModelUsage
} from "../modelCost.js";

test("normalizes OpenAI Responses usage and calculates actual cost", () => {
  const record = buildModelUsageRecord({
    runId: "chapter_test",
    stage: "knowledge_points",
    provider: "openai",
    model: "gpt-4.1-mini",
    requestText: "请提取知识点",
    estimatedOutputTokens: 1000,
    usage: {
      input_tokens: 12000,
      input_tokens_details: { cached_tokens: 2000 },
      output_tokens: 1500,
      total_tokens: 13500
    }
  });

  assert.equal(record.actual.inputTokens, 12000);
  assert.equal(record.actual.cachedInputTokens, 2000);
  assert.equal(record.actual.uncachedInputTokens, 10000);
  assert.equal(record.actual.outputTokens, 1500);
  assert.equal(record.actual.cost, 0.0066);
  assert.equal(record.actual.currency, "USD");
  assert.equal(record.price.priceSourceUrl, "https://developers.openai.com/api/docs/pricing");
  assert.equal(record.diff.costDelta, record.estimated.cost - record.actual.cost);
});

test("normalizes DeepSeek chat usage and uses CNY pricing", () => {
  const usage = {
    prompt_tokens: 8000,
    prompt_cache_hit_tokens: 3000,
    completion_tokens: 1200,
    total_tokens: 9200
  };
  assert.deepEqual(normalizeProviderUsage("deepseek", usage), {
    inputTokens: 8000,
    cachedInputTokens: 3000,
    outputTokens: 1200,
    totalTokens: 9200
  });
  const record = buildModelUsageRecord({
    runId: "chapter_test",
    stage: "questions_initial",
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: "请生成题目",
    estimatedOutputTokens: 1200,
    usage
  });

  assert.equal(record.actual.inputTokens, 8000);
  assert.equal(record.actual.cachedInputTokens, 3000);
  assert.equal(record.actual.uncachedInputTokens, 5000);
  assert.equal(record.actual.outputTokens, 1200);
  assert.equal(record.actual.cost, 0.00746);
  assert.equal(record.actual.currency, "CNY");
});

test("summarizes model usage by currency and renders comparison report", () => {
  const recorder = createModelUsageRecorder({ runId: "chapter_test", calls: [] });
  recorder.record({
    stage: "knowledge_points",
    provider: "openai",
    model: "gpt-4.1-mini",
    requestText: "A".repeat(4000),
    estimatedOutputTokens: 1000,
    usage: {
      input_tokens: 1000,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 1000,
      total_tokens: 2000
    }
  });
  recorder.record({
    stage: "chapter_summary",
    provider: "openai",
    model: "gpt-4.1-mini",
    requestText: "总结",
    estimatedOutputTokens: 100,
    usage: {
      input_tokens: 2000,
      input_tokens_details: { cached_tokens: 1000 },
      output_tokens: 100,
      total_tokens: 2100
    }
  });

  const summary = summarizeModelUsage(recorder.calls, { qualifiedQuestionCount: 2 });

  assert.equal(summary.callCount, 2);
  assert.deepEqual(summary.currencies, ["USD"]);
  assert.equal(summary.totalsByCurrency.USD.totalActualCost, 0.00266);
  assert.equal(summary.totalsByCurrency.USD.actualCostPerQualifiedQuestion, 0.00133);
  assert.match(summary.reportText, /knowledge_points/);
  assert.match(summary.reportText, /每道入池题实际成本/);
});

test("estimates cached input tokens from repeated request prefixes", () => {
  const sharedPrefix = "系统 prompt 和 JSON schema\n".repeat(80);
  const previousRequests = [{
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: `${sharedPrefix}\n第一次用户正文`
  }];

  const cached = estimateCachedInputTokensFromHistory({
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: `${sharedPrefix}\n第二次用户正文`,
    inputTokens: 1200,
    previousRequests
  });

  assert.equal(cached > 0, true);
  assert.equal(cached <= 1200, true);

  const recorder = createModelUsageRecorder({ runId: "chapter_cache_test", calls: [] });
  recorder.record({
    stage: "question_supplement",
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: `${sharedPrefix}\n第一次用户正文`,
    estimatedOutputTokens: 100
  });
  recorder.record({
    stage: "question_supplement",
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: `${sharedPrefix}\n第二次用户正文`,
    estimatedOutputTokens: 100
  });

  assert.equal(recorder.calls[0].estimated.cachedInputTokens, 0);
  assert.equal(recorder.calls[1].estimated.cachedInputTokens > 0, true);
  assert.equal(recorder.calls[1].estimated.cost < recorder.calls[0].estimated.cost, true);
});

test("does not estimate cache for short or unrelated prefixes", () => {
  assert.equal(estimateCachedInputTokensFromHistory({
    provider: "deepseek",
    model: "deepseek-v4-flash",
    requestText: "短 prompt B",
    previousRequests: [{ provider: "deepseek", model: "deepseek-v4-flash", requestText: "短 prompt A" }]
  }), 0);
});

test("estimates mixed Chinese and English text tokens deterministically", () => {
  assert.equal(estimateTokenCount(""), 0);
  assert.equal(estimateTokenCount("拾贝 AI review"), 5);
});
