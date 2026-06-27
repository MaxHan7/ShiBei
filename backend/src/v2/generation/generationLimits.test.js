import assert from "node:assert/strict";
import test from "node:test";

import {
  assertV2ArticleInputWithinLimits,
  countV2ArticleChars,
  DEFAULT_V2_MAX_ARTICLE_CHARS,
  DEFAULT_V2_MIN_ARTICLE_CHARS,
  extractV2ArticleText,
  validateV2ArticleInput
} from "./generationLimits.js";

test("extracts V2 article text from cleaned or raw input", () => {
  assert.equal(extractV2ArticleText({ cleanedText: "clean", rawText: "raw" }), "clean");
  assert.equal(extractV2ArticleText({ rawText: "raw" }), "raw");
  assert.equal(extractV2ArticleText({ body: { text: "body" } }), "body");
});

test("counts unicode article characters consistently", () => {
  assert.equal(countV2ArticleChars("hook😊"), 5);
});

test("validates V2 article input against the MVP length cap", () => {
  assert.equal(DEFAULT_V2_MAX_ARTICLE_CHARS, 50000);
  assert.equal(DEFAULT_V2_MIN_ARTICLE_CHARS, 1);

  const ok = validateV2ArticleInput({ rawText: "a".repeat(50000) });
  assert.equal(ok.ok, true);
  assert.equal(ok.charCount, 50000);

  const tooLong = validateV2ArticleInput({ rawText: "a".repeat(50001) });
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.code, "input_too_long");
  assert.equal(tooLong.maxChars, 50000);
});

test("rejects empty V2 article text before source map generation", () => {
  const empty = validateV2ArticleInput({ rawText: "" });
  assert.equal(empty.ok, false);
  assert.equal(empty.code, "empty_article_text");
  assert.equal(empty.charCount, 0);
  assert.equal(empty.minChars, 1);
});

test("throws a non-retryable input limit error before model generation", () => {
  assert.throws(
    () => assertV2ArticleInputWithinLimits({ rawText: "a".repeat(50001) }),
    (error) => {
      assert.equal(error.code, "input_too_long");
      assert.equal(error.status, "failed_input");
      assert.equal(error.retryable, false);
      assert.equal(error.failedStage, "input_validation");
      return true;
    }
  );
});

test("throws a non-retryable empty article error before model generation", () => {
  assert.throws(
    () => assertV2ArticleInputWithinLimits({ rawText: "" }),
    (error) => {
      assert.equal(error.code, "empty_article_text");
      assert.equal(error.status, "failed_input");
      assert.equal(error.retryable, false);
      assert.equal(error.failedStage, "input_validation");
      return true;
    }
  );
});
