import assert from "node:assert/strict";
import test from "node:test";

import {
  buildV2GenerationIdempotencyKey,
  hashV2GenerationContent,
  normalizeGenerationIdempotencyKey
} from "./generationIdempotency.js";

test("normalizes generation idempotency keys for stable storage", () => {
  assert.equal(
    normalizeGenerationIdempotencyKey(" User Request / 001 "),
    "user-request-001"
  );
});

test("builds stable V2 generation idempotency keys from source URLs", () => {
  const first = buildV2GenerationIdempotencyKey({
    deviceId: "device-1",
    jobType: "create_chapter",
    sourceUrl: "https://example.com/read?b=2&a=1#section"
  });
  const second = buildV2GenerationIdempotencyKey({
    deviceId: "device-1",
    jobType: "create_chapter",
    sourceUrl: "https://example.com/read?a=1&b=2"
  });

  assert.equal(first, second);
  assert.match(first, /^v2-generation:device-1:create_chapter:url:/);
});

test("builds stable V2 generation idempotency keys from raw text", () => {
  const key = buildV2GenerationIdempotencyKey({
    deviceId: "device-1",
    rawText: "同一篇文章"
  });

  assert.equal(
    key,
    buildV2GenerationIdempotencyKey({
      deviceId: "device-1",
      contentHash: hashV2GenerationContent("同一篇文章")
    })
  );
  assert.match(key, /text:[a-f0-9]{32}$/);
});

test("uses explicit client request id when supplied", () => {
  assert.equal(
    buildV2GenerationIdempotencyKey({
      deviceId: "device-1",
      rawText: "article",
      clientRequestId: "Upload Tap 123"
    }),
    "upload-tap-123"
  );
});
