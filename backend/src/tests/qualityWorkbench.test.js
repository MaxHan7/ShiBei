import test from "node:test";
import assert from "node:assert/strict";
import {
  applyAnnotation,
  calculateRunStats,
  expandReviewRows,
  mergeAutoLabels,
  toCsv
} from "../qualityWorkbench.js";

const baseRow = {
  sample: "sample.md",
  sampleTitle: "样本",
  sampleTopic: "ai",
  status: "completed",
  questionId: "q1",
  knowledgePoint: "观点",
  questionType: "multiple_choice",
  stem: "这篇文章的核心判断是什么？",
  options: "A. 错误 | B. 正确",
  correctOptionId: "B",
  correctAnswerText: "正确",
  correctUnderstanding: "需要理解边界。",
  commonMisconception: "误以为只是事实记忆。",
  sourceSnippet: "原文上下文。",
  confidenceLevel: "high",
  retainedBy: "quality_pass",
  sourceContextScore: 4,
  machineAverageScore: 4.2,
  machineIssues: "",
  machineIssueCategory: "other",
  human_status: "",
  primary_issue: "",
  secondary_issue: "",
  source_support: "",
  answer_uniqueness: "",
  understanding_depth: "",
  clarity: "",
  distractor_quality: "",
  review_value: "",
  notes: ""
};

test("merges AI labels without overwriting human fields", () => {
  const rows = expandReviewRows([{ ...baseRow, human_status: "accept" }]);
  const merged = mergeAutoLabels(rows, [{
    questionId: "q1",
    ai_status: "fixable",
    ai_primary_issue: "weak_distractors",
    ai_secondary_issue: "",
    ai_source_support: "5",
    ai_answer_uniqueness: "4",
    ai_understanding_depth: "3",
    ai_clarity: "4",
    ai_distractor_quality: "2",
    ai_explanation_faithfulness: "4",
    ai_review_value: "4",
    ai_blame_stage: "question_generation",
    ai_option_issue: "too_obvious",
    ai_training_label_eligible: "yes_rewrite",
    ai_confidence: "4",
    ai_reason: "干扰项太弱。"
  }]);

  assert.equal(merged[0].ai_status, "fixable");
  assert.equal(merged[0].human_status, "accept");
});

test("confirming AI labels copies them into human verified fields", () => {
  const run = {
    reviewRows: mergeAutoLabels(expandReviewRows([baseRow]), [{
      questionId: "q1",
      ai_status: "accept",
      ai_primary_issue: "none",
      ai_secondary_issue: "",
      ai_source_support: "5",
      ai_answer_uniqueness: "5",
      ai_understanding_depth: "4",
      ai_clarity: "5",
      ai_distractor_quality: "4",
      ai_explanation_faithfulness: "5",
      ai_review_value: "5",
      ai_blame_stage: "none",
      ai_option_issue: "none",
      ai_training_label_eligible: "yes_positive",
      ai_confidence: "5",
      ai_reason: "可用。"
    }])
  };

  const result = applyAnnotation(run, { questionId: "q1", confirmAi: true });
  assert.equal(result.ok, true);
  assert.equal(run.reviewRows[0].human_status, "accept");
  assert.equal(run.reviewRows[0].source_support, "5");
  assert.equal(run.reviewRows[0].human_verified, "true");
  assert.equal(run.reviewRows[0].review_decision, "accepted_ai_label");
});

test("manual edits mark rows as verified edited labels", () => {
  const run = { reviewRows: expandReviewRows([baseRow]) };

  applyAnnotation(run, {
    questionId: "q1",
    human_status: "reject",
    primary_issue: "source_not_supporting",
    source_support: "1",
    notes: "来源不支撑答案。"
  });

  assert.equal(run.reviewRows[0].human_status, "reject");
  assert.equal(run.reviewRows[0].human_verified, "true");
  assert.equal(run.reviewRows[0].review_decision, "edited");
});

test("exports AI and human label columns to CSV", () => {
  const rows = expandReviewRows([baseRow]);
  const csv = toCsv(rows);

  assert.match(csv.split("\n")[0], /ai_status/);
  assert.match(csv.split("\n")[0], /human_verified/);
  assert.match(csv, /这篇文章的核心判断是什么/);
});

test("calculates workbench run stats", () => {
  const rows = expandReviewRows([
    { ...baseRow, questionId: "q1", ai_status: "accept", human_verified: "true", training_label_eligible: "yes_positive" },
    { ...baseRow, questionId: "q2", ai_status: "reject", confidenceLevel: "low", human_verified: "" }
  ]);

  const stats = calculateRunStats(rows);
  assert.equal(stats.questionCount, 2);
  assert.equal(stats.aiAccepted, 1);
  assert.equal(stats.aiRejected, 1);
  assert.equal(stats.humanVerified, 1);
  assert.equal(stats.trainingCandidates, 1);
});
