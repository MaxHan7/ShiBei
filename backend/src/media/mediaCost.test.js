import assert from "node:assert/strict";
import test from "node:test";

import { createMediaUsageRecorder, summarizeMediaUsage } from "./mediaCost.js";

test("records media extraction usage by stage", () => {
  const recorder = createMediaUsageRecorder({ runId: "run-1" });
  recorder.record({ stage: "tikhub_fetch", provider: "tikhub", cost: 0.002, currency: "USD" });
  recorder.record({ stage: "openai_transcription", provider: "openai", cost: 0.006, currency: "USD" });
  recorder.record({
    stage: "video_frame_pack",
    provider: "crv_style_ffmpeg",
    cost: 0,
    currency: "USD",
    metadata: { frameCount: 18, gridCount: 2, skipped: false }
  });

  const summary = summarizeMediaUsage(recorder.calls);
  assert.equal(summary.callCount, 3);
  assert.equal(summary.totalsByCurrency.USD.totalCost, 0.008);
  assert.equal(summary.byStage.openai_transcription.callCount, 1);
  assert.equal(summary.byStage.video_frame_pack.provider, "crv_style_ffmpeg");
  assert.deepEqual(summary.byStage.video_frame_pack.metadata, { frameCount: 18, gridCount: 2, skipped: false });
});

test("preserves visual model usage metadata in media usage summaries", () => {
  const recorder = createMediaUsageRecorder({ runId: "run-visual-usage" });
  recorder.record({
    stage: "visual_understanding",
    provider: "qwen-vl",
    cost: 0,
    currency: "USD",
    metadata: {
      model: "qwen3-vl-flash",
      usage: {
        prompt_tokens: 100,
        completion_tokens: 20,
        total_tokens: 120,
        input_tokens: 100,
        output_tokens: 20
      }
    }
  });

  const summary = summarizeMediaUsage(recorder.calls);

  assert.deepEqual(summary.byStage.visual_understanding.metadata.usage, {
    prompt_tokens: 100,
    completion_tokens: 20,
    total_tokens: 120,
    input_tokens: 100,
    output_tokens: 20
  });
});
