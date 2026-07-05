import assert from "node:assert/strict";
import test from "node:test";

import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";

test("normalizes Douyin TikHub response", async () => {
  const calls = [];
  const result = await fetchTikHubVideoSource({
    sourceUrl: "https://v.douyin.com/abc/",
    apiKey: "test-tikhub-key",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({
        data: {
          aweme_id: "douyin-1",
          desc: "AI 产品调研流程",
          author: { nickname: "产品老张" },
          video: {
            duration: 61000,
            play_addr: { url_list: ["https://media.example.com/douyin.mp4"] },
            cover: { url_list: ["https://media.example.com/cover.jpg"] }
          }
        }
      });
    }
  });

  assert.equal(result.platform, "douyin");
  assert.equal(result.providerContentId, "douyin-1");
  assert.equal(result.title, "AI 产品调研流程");
  assert.equal(result.account, "产品老张");
  assert.equal(result.mediaUrl, "https://media.example.com/douyin.mp4");
  assert.equal(result.coverUrl, "https://media.example.com/cover.jpg");
  assert.equal(result.durationSeconds, 61);
  assert.match(calls[0].url, /fetch_one_video_by_share_url/);
  assert.equal(calls[0].options.headers.authorization, "Bearer test-tikhub-key");
});

test("normalizes Xiaohongshu TikHub response", async () => {
  const result = await fetchTikHubVideoSource({
    sourceUrl: "https://www.xiaohongshu.com/explore/1",
    apiKey: "key",
    fetchImpl: async () => jsonResponse({
      data: {
        note_id: "xhs-1",
        title: "增长案例",
        desc: "小红书笔记文案",
        user: { nickname: "增长笔记" },
        video: { media: { stream: { h264: [{ master_url: "https://media.example.com/xhs.mp4" }] } } },
        image_list: [{ url: "https://media.example.com/xhs-cover.jpg" }]
      }
    })
  });

  assert.equal(result.platform, "xiaohongshu");
  assert.equal(result.providerContentId, "xhs-1");
  assert.equal(result.title, "增长案例");
  assert.equal(result.description, "小红书笔记文案");
  assert.equal(result.mediaUrl, "https://media.example.com/xhs.mp4");
});

test("fails unsupported platforms before calling provider", async () => {
  await assert.rejects(
    () => fetchTikHubVideoSource({
      sourceUrl: "https://example.com/video/1",
      apiKey: "key",
      fetchImpl: async () => {
        throw new Error("fetch should not run");
      }
    }),
    /当前优先支持抖音和小红书公开视频/
  );
});

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}
