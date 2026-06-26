import assert from "node:assert/strict";
import test from "node:test";

import { generateCoreSummarySafely } from "../index.js";
import { normalizeCoreSummary } from "../generateChapterSummary.js";

test("normalizes template openings from generated core summaries", () => {
  assert.equal(
    normalizeCoreSummary("本文主要讲了：AI 产品需要围绕真实任务组织，而不是堆砌功能。"),
    "AI 产品需要围绕真实任务组织，而不是堆砌功能。"
  );
});

test("keeps chapter generation successful when core summary generation fails", async () => {
  const meta = {};
  const coreSummary = await generateCoreSummarySafely({
    cleanedText: "足够长的文章正文",
    title: "测试文章",
    meta,
    summaryGenerator: async () => {
      throw new Error("summary provider unavailable");
    }
  });

  assert.equal(coreSummary, "");
  assert.equal(meta.coreSummaryError, "summary provider unavailable");
});
