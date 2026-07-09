import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSourceCapabilities,
  preflightSourceInput
} from "./sourcePreflight.js";

test("preflights valid Bilibili video without metadata", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://www.bilibili.com/video/BV1hYGd63EnU/",
    env: {}
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "bilibili");
  assert.equal(result.platformLabel, "B站");
  assert.equal(result.provider, "yt-dlp");
  assert.equal(result.canGenerate, true);
});

test("cheap preflight does not fetch paid TikHub metadata", async () => {
  let tikhubCalls = 0;
  const result = await preflightSourceInput({
    rawInput: "https://v.douyin.com/demo/",
    fetchMetadata: false,
    env: {},
    fetchTikHub: async () => {
      tikhubCalls += 1;
      return { title: "paid", durationSeconds: 60 };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "douyin");
  assert.equal(result.provider, "tikhub");
  assert.equal(result.title, "");
  assert.equal(result.durationSeconds, null);
  assert.equal(tikhubCalls, 0);
});

test("preflights Xiaohongshu share text by extracting its URL", async () => {
  const result = await preflightSourceInput({
    rawInput: "98 【Agent Skill过多？4招提升命中 - 小哲讲大模型 | 小红书 - 你的生活兴趣社区】 😆 CzNutypu7EuXU05 😆 https://www.xiaohongshu.com/discovery/item/6a1a977b00000000360194ee?source=webshare&xhsshare=pc_web&xsec_token=ABTAH-AAksyoinRIIxRW83BYFC98M4RM8oSLYoaBdwwec=&xsec_source=pc_share",
    fetchMetadata: false,
    env: {}
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "xiaohongshu");
  assert.equal(result.platformLabel, "小红书");
  assert.equal(result.provider, "tikhub");
  assert.equal(result.canGenerate, true);
});

test("metadata preflight fetches TikHub only when explicitly requested", async () => {
  let tikhubCalls = 0;
  const result = await preflightSourceInput({
    rawInput: "https://v.douyin.com/demo/",
    fetchMetadata: true,
    env: {},
    fetchTikHub: async () => {
      tikhubCalls += 1;
      return { title: "短视频", durationSeconds: 88 };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.title, "短视频");
  assert.equal(result.durationSeconds, 88);
  assert.equal(tikhubCalls, 1);
});

test("preflights metadata and blocks overlong video", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://www.bilibili.com/video/BV1overlong/",
    fetchMetadata: true,
    env: { VIDEO_MAX_DURATION_SECONDS: "900" },
    fetchYtDlp: async () => ({
      title: "长视频",
      durationSeconds: 901
    })
  });

  assert.equal(result.ok, false);
  assert.equal(result.canGenerate, false);
  assert.equal(result.reasonCode, "video_duration_too_long");
  assert.equal(result.title, "长视频");
  assert.equal(result.durationSeconds, 901);
  assert.match(result.userMessage, /15 分钟/);
});

test("preflights metadata and returns readable duration", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://youtu.be/demo",
    fetchMetadata: true,
    env: {},
    fetchYtDlp: async () => ({
      title: "短视频",
      durationSeconds: 305
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.canGenerate, true);
  assert.equal(result.platform, "youtube");
  assert.equal(result.title, "短视频");
  assert.equal(result.durationSeconds, 305);
  assert.match(result.userMessage, /5 分 5 秒/);
});

test("blocks all videos when video links are disabled", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://v.douyin.com/demo/",
    env: { VIDEO_LINK_ENABLED: "false" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "video_link_disabled");
});

test("blocks yt-dlp platforms when universal video provider is disabled", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://www.youtube.com/watch?v=demo",
    env: { VIDEO_YTDLP_ENABLED: "off" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.platform, "youtube");
  assert.equal(result.reasonCode, "video_ytdlp_disabled");
});

test("blocks platforms outside allowlist", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://www.bilibili.com/video/BV1demo/",
    env: { VIDEO_PLATFORM_ALLOWLIST: "douyin,xiaohongshu" }
  });

  assert.equal(result.ok, false);
  assert.equal(result.platform, "bilibili");
  assert.equal(result.reasonCode, "unsupported_video_platform");
});

test("explicit video source type treats unknown web URL as generic web video", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://example.com/watch/123",
    sourceType: "video_link",
    fetchMetadata: false,
    env: {}
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "generic_web");
  assert.equal(result.platformLabel, "网页视频");
  assert.equal(result.provider, "yt-dlp");
});

test("classifies article and text inputs", async () => {
  const article = await preflightSourceInput({
    rawInput: "https://example.com/article/1",
    env: {}
  });
  assert.equal(article.ok, true);
  assert.equal(article.sourceType, "article_link");

  const text = await preflightSourceInput({
    rawInput: "这是一段足够长的正文内容，可以直接进入生成链路。",
    env: {}
  });
  assert.equal(text.ok, true);
  assert.equal(text.sourceType, "text");
});

test("returns invalid URL feedback for malformed link-like input", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://",
    env: {}
  });

  assert.equal(result.ok, false);
  assert.equal(result.reasonCode, "invalid_url");
});

test("source capabilities reflect video flags and duration limit", () => {
  const capabilities = buildSourceCapabilities({
    env: {
      VIDEO_MAX_DURATION_SECONDS: "600",
      VIDEO_YTDLP_ENABLED: "false",
      VIDEO_PLATFORM_ALLOWLIST: "douyin,bilibili"
    }
  });

  assert.equal(capabilities.sourceTypes.video_link.maxDurationSeconds, 600);
  assert.equal(capabilities.sourceTypes.video_link.platforms.douyin.enabled, true);
  assert.equal(capabilities.sourceTypes.video_link.platforms.bilibili.enabled, false);
  assert.equal(capabilities.sourceTypes.video_link.platforms.xiaohongshu.enabled, false);
});
