import assert from "node:assert/strict";
import test from "node:test";

import { buildServiceCapabilities } from "../serviceCapabilities.js";

test("service health exposes production-critical V2 capabilities", () => {
  const capabilities = buildServiceCapabilities();

  assert.equal(capabilities.legacyChapterGeneration, true);
  assert.equal(capabilities.v2ChapterGeneration, true);
  assert.equal(capabilities.v2ReviewSessions, true);
  assert.equal(capabilities.favoriteQuestions, true);
  assert.equal(capabilities.notifications, true);
  assert.equal(capabilities.sourceAnchors, true);
  assert.equal(capabilities.sources.sourceTypes.text.enabled, true);
  assert.equal(capabilities.sources.sourceTypes.video_link.enabled, true);
  assert.equal(capabilities.sources.sourceTypes.video_link.maxDurationSeconds, 900);
  assert.equal(capabilities.sources.sourceTypes.video_link.platforms.douyin.provider, "tikhub");
  assert.equal(capabilities.sources.sourceTypes.video_link.platforms.bilibili.provider, "yt-dlp");
});
