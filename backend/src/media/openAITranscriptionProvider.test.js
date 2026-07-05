import assert from "node:assert/strict";
import test from "node:test";

import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";

test("normalizes verbose_json transcription segments", async () => {
  const result = await transcribeAudioWithOpenAI({
    audioPath: new URL(import.meta.url),
    apiKey: "openai-key",
    fetchImpl: async (url, options) => {
      assert.equal(String(url), "https://api.openai.com/v1/audio/transcriptions");
      assert.equal(options.headers.authorization, "Bearer openai-key");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: "第一步先明确问题。第二步整理主题。",
          segments: [
            { id: 0, start: 0, end: 3.2, text: "第一步先明确问题。" },
            { id: 1, start: 3.2, end: 8, text: "第二步整理主题。" }
          ]
        })
      };
    }
  });

  assert.equal(result.text, "第一步先明确问题。第二步整理主题。");
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].startSeconds, 0);
  assert.equal(result.segments[1].endSeconds, 8);
});

test("requires OpenAI API key for ASR", async () => {
  await assert.rejects(
    () => transcribeAudioWithOpenAI({ audioPath: new URL(import.meta.url), apiKey: "" }),
    /语音转写服务暂未配置/
  );
});
