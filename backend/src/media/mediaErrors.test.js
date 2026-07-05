import assert from "node:assert/strict";
import test from "node:test";

import {
  createMediaExtractionError,
  isRetryableMediaExtractionError
} from "./mediaErrors.js";

test("builds user-safe video extraction errors", () => {
  const error = createMediaExtractionError("video_private_or_deleted", "这条视频无法公开访问。", {
    retryable: false
  });

  assert.equal(error.code, "failed_extract_video");
  assert.equal(error.mediaErrorType, "video_private_or_deleted");
  assert.equal(error.retryable, false);
  assert.equal(error.message, "这条视频无法公开访问。");
});

test("classifies transient media errors as retryable", () => {
  assert.equal(
    isRetryableMediaExtractionError(createMediaExtractionError("provider_timeout", "timeout", { retryable: true })),
    true
  );
  assert.equal(
    isRetryableMediaExtractionError(createMediaExtractionError("video_private_or_deleted", "private", { retryable: false })),
    false
  );
});
