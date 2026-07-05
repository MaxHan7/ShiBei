import assert from "node:assert/strict";
import test from "node:test";

import { createMediaUsageRecorder, summarizeMediaUsage } from "./mediaCost.js";

test("records media extraction usage by stage", () => {
  const recorder = createMediaUsageRecorder({ runId: "run-1" });
  recorder.record({ stage: "tikhub_fetch", provider: "tikhub", cost: 0.002, currency: "USD" });
  recorder.record({ stage: "openai_transcription", provider: "openai", cost: 0.006, currency: "USD" });

  const summary = summarizeMediaUsage(recorder.calls);
  assert.equal(summary.callCount, 2);
  assert.equal(summary.totalsByCurrency.USD.totalCost, 0.008);
  assert.equal(summary.byStage.openai_transcription.callCount, 1);
});
