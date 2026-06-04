#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("quality-test-set/results/dspy/distractors");
const DATASETS = path.join(ROOT, "datasets");
const REVIEWS = path.join(ROOT, "reviews");

const OUTPUT = path.join(DATASETS, "dspy-distractor-quality-judge-devtest.v1.jsonl");
const OUTPUT_V2 = path.join(DATASETS, "dspy-distractor-quality-judge-devtest.v2.jsonl");
const HOOK_GOLDEN_RUN = path.resolve(
  "quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260602-134111-v25-golden-sample-baseline.json",
);

const VALID_LABELS = new Set(["accept", "fixable", "reject"]);

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\n+/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function optionTexts(options = []) {
  return options.map((option) => option.text).filter(Boolean);
}

function normalizeOptionsWithIds(options = [], correctOptionId = "", candidateOptionId = "") {
  return options
    .filter((option) => option && option.id && option.text)
    .map((option) => ({
      id: String(option.id),
      text: String(option.text),
      isCorrect: Boolean(option.isCorrect) || String(option.id) === String(correctOptionId),
      isCandidate: Boolean(option.isCandidate) || String(option.id) === String(candidateOptionId),
    }));
}

function loadHookGoldenQuestions() {
  const payload = readJson(HOOK_GOLDEN_RUN);
  const questions = payload.result?.chapter?.questions || payload.result?.questions || [];
  const map = new Map();
  for (const question of questions) {
    map.set(question.id, question);
  }
  return map;
}

function normalizeIssueCategory(value, label) {
  const trimmed = String(value || "").trim();
  if (trimmed) return trimmed;
  if (label === "accept") return "accepted_distractor";
  return "unspecified";
}

function missingContextFields(row) {
  return [
    "correct_understanding",
    "common_misconception",
    "explanation",
    "memory_angle",
    "all_options_with_ids",
    "correct_option_id",
  ].filter((field) => {
    const value = row[field];
    if (Array.isArray(value)) return value.length === 0;
    return !String(value || "").trim();
  });
}

function normalizeHookRow(row, goldenQuestions = new Map()) {
  const input = row.input || {};
  const context = row.canonical_context || {};
  const goldenQuestion = goldenQuestions.get(row.question_id) || {};
  const label = row.gold_quality_label;
  if (!VALID_LABELS.has(label)) {
    throw new Error(`Invalid Hook label for ${row.sample_id}: ${label}`);
  }

  const normalized = {
    sample_id: row.sample_id,
    source_phase: "phase_a_hook",
    article_slug: row.article_slug,
    question_id: row.question_id,
    option_id: row.field_key?.split(".").pop() || null,
    knowledge_point_id: row.knowledge_point_id || context.knowledge_point_id || null,
    knowledge_point_title: input.knowledge_point_title || context.knowledge_point_title || "",
    knowledge_point_claim: input.knowledge_point_claim || context.knowledge_point_claim || "",
    stem: input.stem || context.stem || "",
    correct_option: input.correct_option || context.correct_option || "",
    candidate_distractor: input.candidate_distractor || row.candidate_distractor || "",
    sibling_options: input.other_options || optionTexts(context.options).filter((text) => text !== row.candidate_distractor),
    source_context: input.source_context || context.source_context || "",
    correct_understanding: goldenQuestion.correctUnderstanding || goldenQuestion.correct_understanding || "",
    common_misconception: goldenQuestion.commonMisconception || goldenQuestion.common_misconception || "",
    explanation: goldenQuestion.fullExplanation || goldenQuestion.explanation || goldenQuestion.shortExplanation || "",
    memory_angle: context.memory_angle || goldenQuestion.memoryAngle || "",
    all_options_with_ids: normalizeOptionsWithIds(
      context.options || goldenQuestion.options || [],
      context.correct_option_id || goldenQuestion.correctOptionId || "",
      row.field_key?.split(".").pop() || "",
    ),
    correct_option_id: context.correct_option_id || goldenQuestion.correctOptionId || "",
    gold_quality_label: label,
    gold_issue_category: normalizeIssueCategory(row.issue_category, label),
    gold_rationale: row.gold_quality_label_rationale || "",
    review_note: row.human_note || "",
    source_dataset: row.source_dataset || "dspy-distractor-quality-judge-phase-a.v1.jsonl",
    split_hint: "fewshot_pool",
  };
  normalized.missing_context_fields = missingContextFields(normalized);
  return normalized;
}

function buildReviewMap(reviewFile) {
  const rows = readJson(path.join(REVIEWS, reviewFile)).rows || [];
  const map = new Map();
  for (const row of rows) {
    const label = row.review?.review_status;
    if (!VALID_LABELS.has(label)) {
      throw new Error(`Invalid review label for ${row.sample_id}: ${label}`);
    }
    map.set(row.sample_id, row);
  }
  return map;
}

function normalizePhaseBRow(row, reviewRow, sourcePhase) {
  const context = row.context || {};
  const label = reviewRow.review?.review_status;
  if (!VALID_LABELS.has(label)) {
    throw new Error(`Invalid Phase B label for ${row.sample_id}: ${label}`);
  }

  const normalized = {
    sample_id: row.sample_id,
    source_phase: sourcePhase,
    article_slug: row.article_slug,
    question_id: row.question_id,
    option_id: row.option_id || null,
    knowledge_point_id: context.knowledge_point_id || null,
    knowledge_point_title: context.knowledge_point_title || "",
    knowledge_point_claim: context.knowledge_point_key_claim || context.knowledge_point_summary || "",
    stem: context.stem || "",
    correct_option: context.correct_option_text || "",
    candidate_distractor: row.candidate || "",
    sibling_options: optionTexts(context.options).filter((text) => text !== row.candidate),
    source_context: context.source_context || "",
    correct_understanding: context.correct_understanding || "",
    common_misconception: context.common_misconception || "",
    explanation: context.explanation || "",
    memory_angle: context.memory_angle || "",
    all_options_with_ids: normalizeOptionsWithIds(context.options || [], context.correct_option_id || "", row.option_id || ""),
    correct_option_id: context.correct_option_id || "",
    gold_quality_label: label,
    gold_issue_category: normalizeIssueCategory(reviewRow.review?.issue_category, label),
    gold_rationale: "",
    review_note: reviewRow.review?.note || "",
    source_dataset: row.source_archive || "",
    split_hint: "devtest",
  };
  normalized.missing_context_fields = missingContextFields(normalized);
  return normalized;
}

function main() {
  const hookGoldenQuestions = loadHookGoldenQuestions();
  const phaseA = readJsonl(path.join(DATASETS, "dspy-distractor-quality-judge-phase-a.v1.jsonl"))
    .map((row) => normalizeHookRow(row, hookGoldenQuestions));

  const positiveRows = readJsonl(path.join(DATASETS, "phase-b-meta-ai-first-pm-distractor-candidates.v1.jsonl"));
  const positiveReviews = buildReviewMap("phase-b-meta-ai-first-pm-review-20260603.json");
  const phaseBPositive = positiveRows.map((row) => {
    const review = positiveReviews.get(row.sample_id);
    if (!review) throw new Error(`Missing positive review for ${row.sample_id}`);
    return normalizePhaseBRow(row, review, "phase_b_non_hook_positive");
  });

  const negativeRows = readJsonl(path.join(DATASETS, "phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl"));
  const negativeReviews = buildReviewMap("phase-b-meta-ai-first-pm-negative-review-20260603.json");
  const phaseBNegative = negativeRows.map((row) => {
    const review = negativeReviews.get(row.sample_id);
    if (!review) throw new Error(`Missing negative review for ${row.sample_id}`);
    return normalizePhaseBRow(row, review, "phase_b_non_hook_negative");
  });

  const rows = [...phaseA, ...phaseBPositive, ...phaseBNegative];
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row.sample_id)) throw new Error(`Duplicate sample_id: ${row.sample_id}`);
    seen.add(row.sample_id);
    for (const field of ["knowledge_point_title", "stem", "correct_option", "candidate_distractor", "source_context"]) {
      if (!row[field]) throw new Error(`Missing ${field} for ${row.sample_id}`);
    }
    if (!VALID_LABELS.has(row.gold_quality_label)) {
      throw new Error(`Invalid gold_quality_label for ${row.sample_id}`);
    }
  }

  fs.mkdirSync(DATASETS, { recursive: true });
  const v1Rows = rows.map((row) => {
    const copy = { ...row };
    delete copy.correct_understanding;
    delete copy.common_misconception;
    delete copy.explanation;
    delete copy.memory_angle;
    delete copy.all_options_with_ids;
    delete copy.correct_option_id;
    delete copy.missing_context_fields;
    return copy;
  });
  fs.writeFileSync(OUTPUT, `${v1Rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  fs.writeFileSync(OUTPUT_V2, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const counts = rows.reduce((acc, row) => {
    acc.total += 1;
    acc.labels[row.gold_quality_label] = (acc.labels[row.gold_quality_label] || 0) + 1;
    acc.sources[row.source_phase] = (acc.sources[row.source_phase] || 0) + 1;
    if (row.missing_context_fields.length > 0) {
      acc.rowsWithMissingContext += 1;
      for (const field of row.missing_context_fields) {
        acc.missingContextFields[field] = (acc.missingContextFields[field] || 0) + 1;
      }
    }
    return acc;
  }, { total: 0, labels: {}, sources: {}, rowsWithMissingContext: 0, missingContextFields: {} });

  console.log(JSON.stringify({ output: OUTPUT, outputV2: OUTPUT_V2, ...counts }, null, 2));
}

main();
