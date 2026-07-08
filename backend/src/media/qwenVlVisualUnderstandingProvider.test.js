import test from "node:test";
import assert from "node:assert/strict";

import { createQwenVlVisualUnderstandingProvider } from "./qwenVlVisualUnderstandingProvider.js";

test("calls Qwen VL with frame grids and normalizes visual segments", async () => {
  let request = null;
  const provider = createQwenVlVisualUnderstandingProvider({
    env: {
      QWEN_API_KEY: "test-key",
      VIDEO_VISUAL_MODEL: "qwen3-vl-flash",
      VIDEO_VISUAL_MAX_GRIDS: "1"
    },
    readFileImpl: async () => Buffer.from("fake-image"),
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                segments: [{
                  evidenceId: "grid-0001",
                  text: "画面展示 Figma Motion 的 shader 面板和参数选项。",
                  confidence: 0.82
                }]
              })
            }
          }],
          usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
        })
      };
    }
  });

  const result = await provider.understandVideo({
    video: { platform: "douyin", title: "Figma Motion 五大更新" },
    transcriptSegments: [{ startSeconds: 0, endSeconds: 5, text: "这里介绍 shader。" }],
    framePack: {
      grids: [
        { id: "grid-0001", path: "/tmp/grid.jpg", startSeconds: 0, endSeconds: 9 },
        { id: "grid-0002", path: "/tmp/grid2.jpg", startSeconds: 9, endSeconds: 18 }
      ],
      frames: []
    }
  });

  assert.equal(request.url, "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
  assert.equal(request.body.model, "qwen3-vl-flash");
  assert.equal(request.body.enable_thinking, false);
  assert.equal(request.body.response_format.type, "json_object");
  assert.equal(request.body.messages[1].content.filter((item) => item.type === "image_url").length, 1);
  assert.match(request.body.messages[1].content[0].image_url.url, /^data:image\/jpeg;base64,/);
  assert.equal(result.provider, "qwen-vl");
  assert.equal(result.model, "qwen3-vl-flash");
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].sourceRole, "visual_summary");
  assert.equal(result.segments[0].startSeconds, 0);
  assert.equal(result.segments[0].endSeconds, 9);
  assert.match(result.segments[0].text, /Figma Motion/);
  assert.deepEqual(result.usage, {
    prompt_tokens: 100,
    completion_tokens: 20,
    total_tokens: 120,
    input_tokens: 100,
    output_tokens: 20
  });
});

test("skips Qwen VL when frame pack is empty", async () => {
  const provider = createQwenVlVisualUnderstandingProvider({
    env: { QWEN_API_KEY: "test-key" },
    fetchImpl: async () => {
      throw new Error("fetch should not be called");
    }
  });

  const result = await provider.understandVideo({ framePack: { grids: [], frames: [] } });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "video_frame_pack_empty");
  assert.deepEqual(result.segments, []);
});

test("requires Qwen API key when provider is enabled", async () => {
  const provider = createQwenVlVisualUnderstandingProvider({ env: {} });

  await assert.rejects(
    () => provider.understandVideo({
      framePack: { grids: [{ id: "grid-0001", path: "/tmp/grid.jpg" }] }
    }),
    /缺少 Qwen 视觉模型 API Key/
  );
});

test("maps Qwen rate limit errors to retryable media extraction errors", async () => {
  const provider = createQwenVlVisualUnderstandingProvider({
    env: { QWEN_API_KEY: "test-key" },
    readFileImpl: async () => Buffer.from("fake-image"),
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "rate limited" } })
    })
  });

  await assert.rejects(
    () => provider.understandVideo({
      framePack: { grids: [{ id: "grid-0001", path: "/tmp/grid.jpg", startSeconds: 0, endSeconds: 3 }] }
    }),
    (error) => {
      assert.equal(error.code, "failed_extract_video");
      assert.equal(error.mediaErrorType, "visual_provider_rate_limited");
      assert.equal(error.retryable, true);
      return true;
    }
  );
});
