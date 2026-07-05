import assert from "node:assert/strict";
import test from "node:test";

import { detectVideoPlatform, normalizeVideoSourceUrl } from "./videoPlatforms.js";

test("detects Douyin hosts", () => {
  assert.equal(detectVideoPlatform("https://v.douyin.com/abc/"), "douyin");
  assert.equal(detectVideoPlatform("https://www.douyin.com/video/123"), "douyin");
});

test("detects Xiaohongshu hosts", () => {
  assert.equal(detectVideoPlatform("https://www.xiaohongshu.com/explore/123"), "xiaohongshu");
  assert.equal(detectVideoPlatform("https://xhslink.com/a/abc"), "xiaohongshu");
});

test("returns unknown for unsupported hosts", () => {
  assert.equal(detectVideoPlatform("https://example.com/video/1"), "unknown");
});

test("normalizes only http and https video URLs", () => {
  assert.equal(normalizeVideoSourceUrl(" https://v.douyin.com/abc/ ").href, "https://v.douyin.com/abc/");
  assert.throws(() => normalizeVideoSourceUrl("ftp://v.douyin.com/abc"), /视频链接必须是 http 或 https/);
  assert.throws(() => normalizeVideoSourceUrl("not a url"), /这不是有效的视频链接/);
});
