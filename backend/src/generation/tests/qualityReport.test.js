import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeManualReview,
  buildReviewRows,
  categorizeMachineIssue,
  parseSampleFile,
  renderManualReport,
  summarize
} from "./qualityReport.js";

test("parses sample frontmatter and falls back for legacy samples", () => {
  const parsed = parseSampleFile(`---
title: "AI 计划文章"
sourceType: "html_article"
topic: "ai_product"
difficulty: "medium"
structureType: "argument"
expectedFocus: ["核心观点", "来源支撑"]
reviewPriority: "baseline"
---

正文第一段。`, "legacy.md");

  assert.equal(parsed.meta.title, "AI 计划文章");
  assert.equal(parsed.meta.sourceType, "html_article");
  assert.deepEqual(parsed.meta.expectedFocus, ["核心观点", "来源支撑"]);
  assert.equal(parsed.body, "正文第一段。");

  const legacy = parseSampleFile("# 旧样本\n\n正文", "legacy.md");
  assert.equal(legacy.meta.sourceType, "unknown");
  assert.equal(legacy.meta.title, "legacy.md");
});

test("categorizes machine issues into stable taxonomy", () => {
  assert.equal(categorizeMachineIssue("source_snippet_unsupported_question_context"), "source_not_supporting");
  assert.equal(categorizeMachineIssue("answerUniqueness_low"), "answer_not_unique");
  assert.equal(categorizeMachineIssue("distractorQuality_low"), "weak_distractors");
  assert.equal(categorizeMachineIssue("no_qualified_question_for_point"), "coverage_gap");
});

test("summarizes machine report and expands review rows for manual scoring", () => {
  const reportResults = [{
    file: "sample.md",
    status: "completed",
    sampleMeta: { title: "样本", topic: "ai" },
    chapter: {
      knowledgePoints: [{
        id: "kp-1",
        structureRole: "method_step",
        importanceScore: 5,
        coverageReason: "这是可迁移的方法原则。"
      }],
      questions: [{
        id: "q-1",
        knowledgePointId: "kp-1",
        pointTitle: "知识点",
        type: "multiple_choice",
        stem: "哪种做法更符合文章？",
        options: [
          { id: "A", text: "正确做法" },
          { id: "B", text: "错误做法" },
          { id: "C", text: "无关做法" },
          { id: "D", text: "极端做法" }
        ],
        correctOptionId: "A",
        correctUnderstanding: "正确做法能被来源支撑。",
        commonMisconception: "误以为无关做法也可以。",
        sourceSnippet: "来源支撑正确做法。",
        confidenceLevel: "low",
        retainedBy: "best_effort_quality_fallback",
        sourceContextScore: 123,
        trustDiagnostics: {
          answerGroundingScore: 4,
          explanationFaithfulnessScore: 3,
          contextRelevanceScore: 5,
          misconceptionSupportScore: 3
        },
        confidenceReasons: ["weak_explanation_faithfulness"],
        blockingReasons: [],
        qualityScore: { average: 4.2 },
        qualityIssues: ["question_type_mismatch"]
      }]
    },
    generationDebug: {
      pointDiagnostics: [{
        status: "covered_low_confidence",
        qualifiedQuestionCount: 1,
        selectedQuestionTypes: ["multiple_choice"]
      }],
      evaluatedQuestions: []
    }
  }];

  const machineSummary = summarize(reportResults);
  const rows = buildReviewRows(reportResults);

  assert.equal(machineSummary.successRate, 100);
  assert.equal(machineSummary.lowConfidenceQuestionRate, 100);
  assert.equal(machineSummary.coveredKnowledgePointCount, 1);
  assert.equal(machineSummary.averageQuestionsPerPoint, 1);
  assert.deepEqual(machineSummary.questionCountDistribution, { "1": 1 });
  assert.deepEqual(machineSummary.questionTypeCoverage, { multiple_choice: 1 });
  assert.equal(rows[0].correctAnswerText, "正确做法");
  assert.equal(rows[0].confidenceLevel, "low");
  assert.equal(rows[0].sourceContextScore, 123);
  assert.match(rows[0].trustDiagnostics, /answer:4/);
  assert.equal(rows[0].confidenceReasons, "weak_explanation_faithfulness");
  assert.equal(rows[0].blockingReasons, "");
  assert.equal(rows[0].knowledgeStructureRole, "method_step");
  assert.equal(rows[0].knowledgeImportanceScore, 5);
  assert.equal(rows[0].knowledgeCoverageReason, "这是可迁移的方法原则。");
});

test("analyzes manual CSV and renders a markdown report", () => {
  const machineReport = {
    summary: {
      sampleCount: 1,
      successRate: 100,
      qualifiedQuestionCount: 2,
      lowConfidenceQuestionRate: 50,
      machineIssueCategoryFrequency: { source_not_supporting: 1 }
    },
    reviewRows: [
      { questionId: "q-1", machineAverageScore: 4.8, confidenceLevel: "high" },
      { questionId: "q-2", machineAverageScore: 3.8, confidenceLevel: "low" }
    ]
  };
  const csv = [
    "question_id,human_status,primary_issue,severe_issue,notes",
    "q-1,reject,source_not_supporting,yes,来源不支撑",
    "q-2,accept,,no,可用"
  ].join("\n");

  const manualSummary = analyzeManualReview({ machineReport, csvText: csv });
  const markdown = renderManualReport({
    machineReport,
    manualSummary,
    resultFile: "result.json",
    reviewFile: "manual.csv"
  });

  assert.equal(manualSummary.reviewedQuestionCount, 2);
  assert.equal(manualSummary.acceptRate, 50);
  assert.equal(manualSummary.severeIssueRate, 50);
  assert.equal(manualSummary.highScoreRejectedCount, 1);
  assert.match(markdown, /来源不支撑|source_not_supporting/);
});
