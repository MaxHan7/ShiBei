import assert from "node:assert/strict";
import test from "node:test";

import { createModelUsageRecorder } from "../modelCost.js";
import { callOpenAIJson } from "../openaiClient.js";

test("records OpenAI usage while preserving parsed JSON return shape", async () => {
  const originalFetch = globalThis.fetch;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalProvider = process.env.AI_PROVIDER;
  const recorder = createModelUsageRecorder({ runId: "chapter_mock", calls: [] });

  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.AI_PROVIDER;
  globalThis.fetch = async () => new Response(JSON.stringify({
    output_text: "{\"ok\":true}",
    usage: {
      input_tokens: 100,
      input_tokens_details: { cached_tokens: 20 },
      output_tokens: 10,
      total_tokens: 110
    }
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const payload = await callOpenAIJson({
      system: "system",
      user: "user",
      schemaName: "mock_schema",
      schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      stage: "knowledge_points",
      modelUsageRecorder: recorder,
      estimatedOutputTokens: 10
    });

    assert.deepEqual(payload, { ok: true });
    assert.equal(recorder.calls.length, 1);
    assert.equal(recorder.calls[0].stage, "knowledge_points");
    assert.equal(recorder.calls[0].actual.inputTokens, 100);
    assert.equal(recorder.calls[0].actual.cachedInputTokens, 20);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv("OPENAI_API_KEY", originalOpenAIKey);
    restoreEnv("DEEPSEEK_API_KEY", originalDeepSeekKey);
    restoreEnv("AI_PROVIDER", originalProvider);
  }
});

test("records DeepSeek usage while preserving parsed JSON return shape", async () => {
  const originalFetch = globalThis.fetch;
  const originalDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  const originalProvider = process.env.AI_PROVIDER;
  const recorder = createModelUsageRecorder({ runId: "chapter_mock", calls: [] });

  process.env.DEEPSEEK_API_KEY = "test-key";
  process.env.AI_PROVIDER = "deepseek";
  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: "{\"ok\":true}" } }],
    usage: {
      prompt_tokens: 100,
      prompt_cache_hit_tokens: 40,
      completion_tokens: 10,
      total_tokens: 110
    }
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const payload = await callOpenAIJson({
      system: "system",
      user: "user",
      schemaName: "mock_schema",
      schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      stage: "chapter_summary",
      modelUsageRecorder: recorder,
      estimatedOutputTokens: 10
    });

    assert.deepEqual(payload, { ok: true });
    assert.equal(recorder.calls.length, 1);
    assert.equal(recorder.calls[0].provider, "deepseek");
    assert.equal(recorder.calls[0].actual.cachedInputTokens, 40);
    assert.equal(recorder.calls[0].actual.currency, "CNY");
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv("DEEPSEEK_API_KEY", originalDeepSeekKey);
    restoreEnv("AI_PROVIDER", originalProvider);
  }
});

function restoreEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
