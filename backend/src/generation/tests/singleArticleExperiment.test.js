import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  buildExperimentPaths,
  buildSingleArticleReport,
  renderSingleArticleAnalysis,
  rowsToCsv,
  sanitizeFileSegment
} from "./singleArticleExperiment.js";

test("sanitizes slug and label for stable file paths", () => {
  assert.equal(sanitizeFileSegment("UMr6ia1QubqOMw3aBUGbOw"), "UMr6ia1QubqOMw3aBUGbOw");
  assert.equal(sanitizeFileSegment("来源上下文 v2 / 修复"), "v2");
  assert.equal(sanitizeFileSegment("", "fallback"), "fallback");
});

test("builds single article artifact paths without overwriting the report directory shape", () => {
  const paths = buildExperimentPaths({
    outputRoot: "/tmp/out",
    slug: "UMr6ia1QubqOMw3aBUGbOw",
    label: "v2-source-context",
    date: new Date("2026-05-29T15:18:51Z")
  });

  assert.equal(paths.articleDir, path.join("/tmp/out", "UMr6ia1QubqOMw3aBUGbOw"));
  assert.equal(paths.runId, "20260529-151851-v2-source-context");
  assert.equal(paths.jsonPath, path.join(paths.runsDir, "20260529-151851-v2-source-context.json"));
  assert.equal(paths.csvPath, path.join(paths.reviewsDir, "20260529-151851-v2-source-context.csv"));
  assert.equal(paths.markdownPath, path.join(paths.analysisDir, "20260529-151851-v2-source-context.md"));
});

test("redacts full source text and model request text from single article report", () => {
  const report = buildSingleArticleReport({
    slug: "article",
    label: "baseline",
    articleUrl: "https://example.com/a",
    source: {
      sourceType: "article_link",
      sourceTitle: "样本文章",
      sourceAccount: "作者",
      sourceUrl: "https://example.com/a",
      rawText: "原文正文".repeat(100)
    },
    output: {
      status: "completed",
      chapter: {
        title: "章节",
        source: {
          title: "样本文章",
          rawText: "原文正文".repeat(100),
          cleanedText: "清洗正文".repeat(100)
        },
        knowledgePoints: [],
        questions: [],
        generationMeta: {
          modelUsage: [{
            stage: "questions_initial",
            requestText: "包含完整文章的 prompt",
            actual: { inputTokens: 1 }
          }]
        }
      },
      generationDebug: {
        cleaned: { cleanedText: "清洗正文".repeat(100) },
        evaluatedQuestions: []
      }
    },
    generatedAt: "2026-05-29T15:18:51.000Z"
  });

  assert.equal(report.source.rawTextLength, 400);
  assert.equal(report.result.chapter.source.rawText, "[redacted: full source text omitted]");
  assert.equal(report.result.chapter.source.cleanedText, "[redacted: full source text omitted]");
  assert.equal(report.result.chapter.source.rawTextLength, 400);
  assert.equal(report.result.chapter.source.cleanedTextLength, 400);
  assert.equal(report.result.chapter.generationMeta.modelUsage[0].requestText, "[redacted: full source text omitted]");
  assert.equal("cleaned" in report.result.generationDebug, false);
});

test("renders CSV review rows with core grading columns", () => {
  const csv = rowsToCsv([{
    questionId: "q-1",
    stem: "题干, 包含逗号",
    options: "A. 正确 | B. 错误",
    correctAnswerText: "正确",
    sourceSnippet: "来源",
    confidenceLevel: "low",
    blockingReasons: "",
    repairHint: "检查来源"
  }]);

  assert.match(csv, /questionId/);
  assert.match(csv, /correctAnswerText/);
  assert.match(csv, /sourceSnippet/);
  assert.match(csv, /confidenceLevel/);
  assert.match(csv, /repairHint/);
  assert.match(csv, /"题干, 包含逗号"/);
});

test("renders analysis markdown with metric summary and artifact paths", () => {
  const markdown = renderSingleArticleAnalysis({
    report: {
      generatedAt: "2026-05-29T15:18:51.000Z",
      label: "v2-source-context",
      articleUrl: "https://example.com/a",
      result: { status: "completed" },
      summary: {
        knowledgePointCount: 7,
        qualifiedQuestionCount: 21,
        averageQuestionsPerPoint: 3,
        threeQuestionPointRate: 100,
        lowConfidenceQuestionRate: 80,
        uncoveredKnowledgePointCount: 0,
        trustReasonFrequency: { source_context_backfilled: 18 },
        blockingReasonFrequency: {}
      }
    },
    paths: {
      jsonPath: "/repo/quality-test-set/results/single-article/a/runs/run.json",
      csvPath: "/repo/quality-test-set/results/single-article/a/reviews/run.csv"
    }
  });

  assert.match(markdown, /单篇出题实验分析/);
  assert.match(markdown, /入池题数：21/);
  assert.match(markdown, /source_context_backfilled: 18/);
  assert.match(markdown, /实验记录草稿/);
});
