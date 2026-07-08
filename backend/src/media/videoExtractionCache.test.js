import assert from "node:assert/strict";
import test from "node:test";

import {
  buildVideoExtractionSignature,
  buildVideoLearningSourceCacheKey,
  buildVideoSourceCacheKey,
  createInMemoryTtlCache
} from "./videoExtractionCache.js";

test("builds stable video source cache keys for reordered query params", () => {
  const first = buildVideoSourceCacheKey({
    sourceUrl: "https://www.xiaohongshu.com/discovery/item/123?b=2&a=1#ignored"
  });
  const second = buildVideoSourceCacheKey({
    sourceUrl: "https://www.xiaohongshu.com/discovery/item/123?a=1&b=2"
  });

  assert.equal(first, second);
});

test("builds distinct learning source cache keys for different extraction signatures", () => {
  const firstSignature = buildVideoExtractionSignature({
    asrProvider: "local_whisper",
    frameProvider: "crv_style_ffmpeg",
    visualProvider: "qwen-vl",
    visualModel: "qwen3-vl-flash"
  });
  const secondSignature = buildVideoExtractionSignature({
    asrProvider: "local_whisper",
    frameProvider: "crv_style_ffmpeg",
    visualProvider: "qwen-vl",
    visualModel: "qwen3-vl-plus"
  });

  const first = buildVideoLearningSourceCacheKey({
    sourceUrl: "https://v.douyin.com/cache-signature/",
    extractionSignature: firstSignature
  });
  const second = buildVideoLearningSourceCacheKey({
    sourceUrl: "https://v.douyin.com/cache-signature/",
    extractionSignature: secondSignature
  });

  assert.notEqual(firstSignature, secondSignature);
  assert.notEqual(first, second);
});

test("expires in-memory cache entries after ttl", async () => {
  let currentTime = 1_000;
  const cache = createInMemoryTtlCache({
    ttlMs: 100,
    now: () => currentTime
  });

  await cache.set("key-1", { value: "cached" });
  assert.deepEqual(await cache.get("key-1"), { value: "cached" });

  currentTime = 1_101;
  assert.equal(await cache.get("key-1"), null);
});
