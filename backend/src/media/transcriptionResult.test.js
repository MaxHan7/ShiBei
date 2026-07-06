import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTranscriptionPayload } from "./transcriptionResult.js";

test("normalizes provider transcription text and timestamped segments", () => {
  const result = normalizeTranscriptionPayload({
    text: " 第一段。 第二段。 ",
    segments: [
      { id: 7, start: 0, end: 2.5, text: " 第一段。 " },
      { startSeconds: "2.5", endSeconds: "5", text: "第二段。" },
      { start: 5, end: 6, text: " " }
    ]
  }, { provider: "local_whisper" });

  assert.equal(result.provider, "local_whisper");
  assert.equal(result.text, "第一段。 第二段。");
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].id, "7");
  assert.equal(result.segments[1].id, "transcript-002");
  assert.equal(result.segments[1].startSeconds, 2.5);
});

test("rejects transcription payloads without speech text", () => {
  assert.throws(
    () => normalizeTranscriptionPayload({ text: "", segments: [] }, { provider: "local_whisper" }),
    /没有识别到足够清晰的语音内容/
  );
});
