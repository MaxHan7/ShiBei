import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callOpenAIJson } from "./generation/openaiClient.js";
import { buildReviewRows, summarize } from "./generation/tests/qualityReport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const resultsDir = path.join(repoRoot, "quality-test-set", "results");

export const AI_LABEL_FIELDS = [
  "ai_status",
  "ai_primary_issue",
  "ai_secondary_issue",
  "ai_source_support",
  "ai_source_precision",
  "ai_source_minimality",
  "ai_answer_uniqueness",
  "ai_understanding_depth",
  "ai_clarity",
  "ai_distractor_quality",
  "ai_explanation_faithfulness",
  "ai_review_value",
  "ai_blame_stage",
  "ai_option_issue",
  "ai_training_label_eligible",
  "ai_confidence",
  "ai_reason"
];

export const HUMAN_LABEL_FIELDS = [
  "human_status",
  "primary_issue",
  "secondary_issue",
  "source_support",
  "source_precision",
  "source_minimality",
  "source_evidence_role",
  "source_block_id",
  "source_evidence_diversity",
  "source_reuse_reason",
  "source_overlap_ratio",
  "source_overlap_group",
  "cognitive_action_fit",
  "practice_progression",
  "duplicate_practice",
  "misconception_realism",
  "distractor_learning_value",
  "evidence_learning_value",
  "answer_uniqueness",
  "understanding_depth",
  "clarity",
  "distractor_quality",
  "explanation_faithfulness",
  "review_value",
  "knowledge_mainline_relevance",
  "knowledge_granularity",
  "knowledge_review_value",
  "missing_core_point",
  "blame_stage",
  "option_issue",
  "training_label_eligible",
  "notes",
  "human_verified",
  "review_decision"
];

export const REVIEW_CSV_FIELDS = [
  "sample",
  "sampleTitle",
  "sampleTopic",
  "status",
  "questionId",
  "knowledgePoint",
  "knowledgePointId",
  "knowledgeStructureRole",
  "knowledgeImportanceScore",
  "knowledgeCoverageReason",
  "practiceBlueprint",
  "questionType",
  "stem",
  "options",
  "correctOptionId",
  "correctAnswerText",
  "correctUnderstanding",
  "commonMisconception",
  "sourceSnippet",
  "memoryAngle",
  "blueprintItemId",
  "blueprintGoal",
  "memoryAngleFitScore",
  "blueprintAlignmentScore",
  "pedagogyDiagnostics",
  "cognitiveActionFitScore",
  "coreRecallFitScore",
  "boundaryDiscriminationFitScore",
  "scenarioTransferFitScore",
  "practiceProgressionScore",
  "practiceDuplicateRiskScore",
  "evidenceLearningValueScore",
  "sourceReuseLearningReason",
  "typeDiversityReason",
  "confidenceLevel",
  "confidenceTier",
  "retainedBy",
  "sourceContextScore",
  "sourcePrecisionScore",
  "sourceSpecificityScore",
  "sourceMinimalityScore",
  "sourceEvidenceRole",
  "sourceBlockId",
  "sourceEvidenceDiversityScore",
  "sourceReuseReason",
  "sourceOverlapRatio",
  "sourceOverlapGroupId",
  "sourceReuseCount",
  "sourceContextSelection",
  "trustDiagnostics",
  "confidenceReasons",
  "blockingReasons",
  "machineAverageScore",
  "machineIssues",
  "machineIssueCategory",
  ...AI_LABEL_FIELDS,
  ...HUMAN_LABEL_FIELDS
];

const autoLabelSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    labels: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          questionId: { type: "string" },
          status: { type: "string", enum: ["accept", "fixable", "reject"] },
          primaryIssue: { type: "string" },
          secondaryIssue: { type: "string" },
          sourceSupport: { type: "number" },
          sourcePrecision: { type: "number" },
          sourceMinimality: { type: "number" },
          answerUniqueness: { type: "number" },
          understandingDepth: { type: "number" },
          clarity: { type: "number" },
          distractorQuality: { type: "number" },
          explanationFaithfulness: { type: "number" },
          reviewValue: { type: "number" },
          blameStage: { type: "string" },
          optionIssue: { type: "string" },
          trainingLabelEligible: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" }
        },
        required: [
          "questionId",
          "status",
          "primaryIssue",
          "secondaryIssue",
          "sourceSupport",
          "sourcePrecision",
          "sourceMinimality",
          "answerUniqueness",
          "understandingDepth",
          "clarity",
          "distractorQuality",
          "explanationFaithfulness",
          "reviewValue",
          "blameStage",
          "optionIssue",
          "trainingLabelEligible",
          "confidence",
          "reason"
        ]
      }
    }
  },
  required: ["labels"]
};

const autoLabelSystemPrompt = `你是 Recallo出题系统的 AI 预标注审查员。你的任务不是重新出题，而是模拟严格但公正的人工审题员，给题目做预标注，供真人复核。

请按 1-5 分评分，5 分最好，1 分最差：
- sourceSupport：题目答案和解释是否被来源上下文支撑。
- sourcePrecision：来源上下文是否精准、克制、适合解释这道题；如果来源能支撑但太泛、太长或多题复用，应扣分。
- sourceMinimality：来源是否是“最小充分证据”，不是把一整段泛泛上下文塞给用户。
- answerUniqueness：是否只有一个最合理答案。
- understandingDepth：是否考理解、边界、迁移或误区。
- clarity：题干、选项、解释是否清楚。
- distractorQuality：错误选项是否合理但明确错误。
- explanationFaithfulness：正确理解和误区解释是否忠实于原文和题目。
- reviewValue：这道题是否值得用户复习。

status:
- accept：可直接保留。
- fixable：方向有价值，但需要改写或人工修正。
- reject：不适合进入复习或训练。

primaryIssue/secondaryIssue 使用这些枚举之一：
source_not_supporting, answer_not_unique, explanation_wrong, too_shallow, weak_distractors, knowledge_point_off_target, coverage_gap, low_confidence_bad, source_context_bad, structure_invalid, generation_failed, other, none

blameStage 使用这些枚举之一：
knowledge_extraction, question_generation, source_context_selection, quality_judge, selection_policy, frontend_display, none

optionIssue 使用这些枚举之一：
too_obvious, also_correct, irrelevant, not_supported_by_source, wording_ambiguous, too_similar_to_correct, none

trainingLabelEligible 使用这些枚举之一：
yes_positive, yes_rewrite, yes_negative_pattern, yes_preference, no_structural, no_irrelevant, no_insufficient_source, no_low_value, no_uncertain

重要边界：
- AI 预标注不是人工金标。请在 reason 中说明为什么需要人工关注。
- 来源不支撑、答案不唯一、解释错误是严重问题。
- 如果只是低置信但题目仍可用，优先标 fixable，而不是直接 reject。
- 只输出 JSON。`;

export function buildQualityRun({ id, input, result, autoLabels = [], autoLabelError = "" }) {
  const machineResults = [{
    file: input.sourceTitle || input.sourceUrl || input.rawText?.slice?.(0, 24) || id,
    sampleSet: "workbench",
    sampleMeta: {
      title: input.sourceTitle || input.sourceUrl || "质量工作台输入",
      sourceType: input.sourceType || "text",
      topic: "workbench",
      difficulty: "unknown",
      structureType: "unknown",
      expectedFocus: [],
      reviewPriority: "ad_hoc"
    },
    startedAt: new Date().toISOString(),
    status: result.status,
    chapter: result.chapter || null,
    generationDebug: result.generationDebug || null,
    message: result.message || ""
  }];
  const rows = mergeAutoLabels(expandReviewRows(buildReviewRows(machineResults)), autoLabels);
  const run = {
    id,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: autoLabelError ? "auto_label_failed" : "ready_for_review",
    input: sanitizeInput(input),
    autoLabelError,
    summary: summarize(machineResults),
    reviewRows: rows,
    results: machineResults
  };
  run.stats = calculateRunStats(run.reviewRows);
  return run;
}

export async function autoLabelReviewRows(rows) {
  const labelableRows = rows.filter((row) => row.questionId && row.stem);
  if (!labelableRows.length) return [];
  const payload = await callOpenAIJson({
    system: autoLabelSystemPrompt,
    user: JSON.stringify({
      rows: labelableRows.map((row) => ({
        questionId: row.questionId,
        knowledgePoint: row.knowledgePoint,
        knowledgeStructureRole: row.knowledgeStructureRole,
        knowledgeImportanceScore: row.knowledgeImportanceScore,
        knowledgeCoverageReason: row.knowledgeCoverageReason,
        questionType: row.questionType,
        stem: row.stem,
        options: row.options,
        correctAnswerText: row.correctAnswerText,
        correctUnderstanding: row.correctUnderstanding,
        commonMisconception: row.commonMisconception,
        sourceSnippet: row.sourceSnippet,
        memoryAngle: row.memoryAngle,
        blueprintItemId: row.blueprintItemId,
        blueprintGoal: row.blueprintGoal,
        memoryAngleFitScore: row.memoryAngleFitScore,
        blueprintAlignmentScore: row.blueprintAlignmentScore,
        pedagogyDiagnostics: row.pedagogyDiagnostics,
        cognitiveActionFitScore: row.cognitiveActionFitScore,
        coreRecallFitScore: row.coreRecallFitScore,
        boundaryDiscriminationFitScore: row.boundaryDiscriminationFitScore,
        scenarioTransferFitScore: row.scenarioTransferFitScore,
        practiceProgressionScore: row.practiceProgressionScore,
        practiceDuplicateRiskScore: row.practiceDuplicateRiskScore,
        evidenceLearningValueScore: row.evidenceLearningValueScore,
        sourceReuseLearningReason: row.sourceReuseLearningReason,
        typeDiversityReason: row.typeDiversityReason,
        confidenceLevel: row.confidenceLevel,
        confidenceTier: row.confidenceTier,
        sourcePrecisionScore: row.sourcePrecisionScore,
        sourceMinimalityScore: row.sourceMinimalityScore,
        sourceEvidenceRole: row.sourceEvidenceRole,
        sourceBlockId: row.sourceBlockId,
        sourceEvidenceDiversityScore: row.sourceEvidenceDiversityScore,
        sourceReuseReason: row.sourceReuseReason,
        sourceOverlapRatio: row.sourceOverlapRatio,
        sourceOverlapGroupId: row.sourceOverlapGroupId,
        sourceReuseCount: row.sourceReuseCount,
        sourceContextSelection: row.sourceContextSelection,
        trustDiagnostics: row.trustDiagnostics,
        confidenceReasons: row.confidenceReasons,
        blockingReasons: row.blockingReasons,
        machineAverageScore: row.machineAverageScore,
        machineIssues: row.machineIssues,
        machineIssueCategory: row.machineIssueCategory
      }))
    }, null, 2),
    schemaName: "shibei_quality_auto_label",
    schema: autoLabelSchema
  });
  return normalizeAutoLabels(payload.labels || []);
}

export function expandReviewRows(rows) {
  return rows.map((row) => ({
    ...row,
    ai_status: row.ai_status || "",
    ai_primary_issue: row.ai_primary_issue || "",
    ai_secondary_issue: row.ai_secondary_issue || "",
    ai_source_support: row.ai_source_support || "",
    ai_source_precision: row.ai_source_precision || "",
    ai_source_minimality: row.ai_source_minimality || "",
    ai_answer_uniqueness: row.ai_answer_uniqueness || "",
    ai_understanding_depth: row.ai_understanding_depth || "",
    ai_clarity: row.ai_clarity || "",
    ai_distractor_quality: row.ai_distractor_quality || "",
    ai_explanation_faithfulness: row.ai_explanation_faithfulness || "",
    ai_review_value: row.ai_review_value || "",
    ai_blame_stage: row.ai_blame_stage || "",
    ai_option_issue: row.ai_option_issue || "",
    ai_training_label_eligible: row.ai_training_label_eligible || "",
    ai_confidence: row.ai_confidence || "",
    ai_reason: row.ai_reason || "",
    trustDiagnostics: row.trustDiagnostics || "",
    confidenceReasons: row.confidenceReasons || "",
    blockingReasons: row.blockingReasons || "",
    source_precision: row.source_precision || "",
    source_minimality: row.source_minimality || "",
    source_evidence_role: row.source_evidence_role || "",
    source_block_id: row.source_block_id || "",
    source_evidence_diversity: row.source_evidence_diversity || "",
    source_reuse_reason: row.source_reuse_reason || "",
    source_overlap_ratio: row.source_overlap_ratio || "",
    source_overlap_group: row.source_overlap_group || "",
    explanation_faithfulness: row.explanation_faithfulness || "",
    blame_stage: row.blame_stage || "",
    option_issue: row.option_issue || "",
    training_label_eligible: row.training_label_eligible || "",
    human_verified: row.human_verified || "",
    review_decision: row.review_decision || ""
  }));
}

export function mergeAutoLabels(rows, labels) {
  const labelsById = new Map(labels.map((label) => [label.questionId, label]));
  return rows.map((row) => {
    const label = labelsById.get(row.questionId);
    if (!label) return row;
    return {
      ...row,
      ai_status: label.ai_status,
      ai_primary_issue: label.ai_primary_issue,
      ai_secondary_issue: label.ai_secondary_issue,
      ai_source_support: label.ai_source_support,
      ai_source_precision: label.ai_source_precision,
      ai_source_minimality: label.ai_source_minimality,
      ai_answer_uniqueness: label.ai_answer_uniqueness,
      ai_understanding_depth: label.ai_understanding_depth,
      ai_clarity: label.ai_clarity,
      ai_distractor_quality: label.ai_distractor_quality,
      ai_explanation_faithfulness: label.ai_explanation_faithfulness,
      ai_review_value: label.ai_review_value,
      ai_blame_stage: label.ai_blame_stage,
      ai_option_issue: label.ai_option_issue,
      ai_training_label_eligible: label.ai_training_label_eligible,
      ai_confidence: label.ai_confidence,
      ai_reason: label.ai_reason
    };
  });
}

export function applyAnnotation(run, annotation) {
  const questionId = String(annotation?.questionId || "");
  const index = run.reviewRows.findIndex((row) => row.questionId === questionId);
  if (index < 0) return { ok: false, message: "题目不存在。" };
  const current = run.reviewRows[index];
  const patch = {};
  for (const field of HUMAN_LABEL_FIELDS) {
    if (Object.hasOwn(annotation, field)) patch[field] = normalizeCell(annotation[field]);
  }
  if (annotation.confirmAi === true) {
    patch.human_status = current.ai_status || patch.human_status || "";
    patch.primary_issue = current.ai_primary_issue || patch.primary_issue || "";
    patch.secondary_issue = current.ai_secondary_issue || patch.secondary_issue || "";
    patch.source_support = current.ai_source_support || patch.source_support || "";
    patch.source_precision = current.ai_source_precision || patch.source_precision || "";
    patch.source_minimality = current.ai_source_minimality || patch.source_minimality || "";
    patch.source_evidence_role = current.sourceEvidenceRole || patch.source_evidence_role || "";
    patch.source_block_id = current.sourceBlockId || patch.source_block_id || "";
    patch.source_evidence_diversity = current.sourceEvidenceDiversityScore || patch.source_evidence_diversity || "";
    patch.source_reuse_reason = current.sourceReuseReason || patch.source_reuse_reason || "";
    patch.source_overlap_ratio = current.sourceOverlapRatio || patch.source_overlap_ratio || "";
    patch.source_overlap_group = current.sourceOverlapGroupId || patch.source_overlap_group || "";
    patch.answer_uniqueness = current.ai_answer_uniqueness || patch.answer_uniqueness || "";
    patch.understanding_depth = current.ai_understanding_depth || patch.understanding_depth || "";
    patch.clarity = current.ai_clarity || patch.clarity || "";
    patch.distractor_quality = current.ai_distractor_quality || patch.distractor_quality || "";
    patch.explanation_faithfulness = current.ai_explanation_faithfulness || patch.explanation_faithfulness || "";
    patch.review_value = current.ai_review_value || patch.review_value || "";
    patch.blame_stage = current.ai_blame_stage || patch.blame_stage || "";
    patch.option_issue = current.ai_option_issue || patch.option_issue || "";
    patch.training_label_eligible = current.ai_training_label_eligible || patch.training_label_eligible || "";
    patch.human_verified = "true";
    patch.review_decision = "accepted_ai_label";
  } else if (Object.keys(patch).length) {
    patch.human_verified = patch.human_verified || "true";
    patch.review_decision = patch.review_decision || "edited";
  }
  run.reviewRows[index] = { ...current, ...patch };
  run.updatedAt = new Date().toISOString();
  run.stats = calculateRunStats(run.reviewRows);
  return { ok: true, row: run.reviewRows[index] };
}

export function calculateRunStats(rows) {
  const labelable = rows.filter((row) => row.questionId);
  const aiRejected = labelable.filter((row) => row.ai_status === "reject").length;
  const aiFixable = labelable.filter((row) => row.ai_status === "fixable").length;
  const aiAccepted = labelable.filter((row) => row.ai_status === "accept").length;
  const humanVerified = labelable.filter((row) => String(row.human_verified).toLowerCase() === "true").length;
  const trainingCandidates = labelable.filter((row) => String(row.training_label_eligible || row.ai_training_label_eligible).startsWith("yes_")).length;
  return {
    questionCount: labelable.length,
    aiAccepted,
    aiFixable,
    aiRejected,
    humanVerified,
    humanVerifiedRate: percent(humanVerified, labelable.length),
    lowConfidenceCount: labelable.filter((row) => row.confidenceLevel === "low").length,
    trainingCandidates
  };
}

export async function saveQualityRun(run) {
  await mkdir(resultsDir, { recursive: true });
  const jsonFile = qualityRunJsonFile(run.id);
  await writeFile(jsonFile, JSON.stringify(run, null, 2), "utf8");
  await writeFile(qualityRunAutoCsvFile(run.id), toCsv(run.reviewRows, REVIEW_CSV_FIELDS), "utf8");
  await writeFile(qualityRunManualCsvFile(run.id), toCsv(run.reviewRows, REVIEW_CSV_FIELDS), "utf8");
  return run;
}

export async function loadQualityRun(id) {
  const data = await readFile(qualityRunJsonFile(id), "utf8");
  return JSON.parse(data);
}

export function qualityRunJsonFile(id) {
  return path.join(resultsDir, `${safeRunId(id)}.json`);
}

export function qualityRunManualCsvFile(id) {
  return path.join(resultsDir, `${safeRunId(id)}.manual-review.csv`);
}

function qualityRunAutoCsvFile(id) {
  return path.join(resultsDir, `${safeRunId(id)}.auto-review.csv`);
}

export function toCsv(rows, fields = REVIEW_CSV_FIELDS) {
  return [
    fields.join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(","))
  ].join("\n");
}

function normalizeAutoLabels(labels) {
  return labels.map((label) => ({
    questionId: String(label.questionId || ""),
    ai_status: normalizeEnum(label.status, ["accept", "fixable", "reject"], "fixable"),
    ai_primary_issue: normalizeCell(label.primaryIssue || "other"),
    ai_secondary_issue: normalizeCell(label.secondaryIssue || ""),
    ai_source_support: clampScore(label.sourceSupport),
    ai_source_precision: clampScore(label.sourcePrecision),
    ai_source_minimality: clampScore(label.sourceMinimality),
    ai_answer_uniqueness: clampScore(label.answerUniqueness),
    ai_understanding_depth: clampScore(label.understandingDepth),
    ai_clarity: clampScore(label.clarity),
    ai_distractor_quality: clampScore(label.distractorQuality),
    ai_explanation_faithfulness: clampScore(label.explanationFaithfulness),
    ai_review_value: clampScore(label.reviewValue),
    ai_blame_stage: normalizeCell(label.blameStage || "none"),
    ai_option_issue: normalizeCell(label.optionIssue || "none"),
    ai_training_label_eligible: normalizeCell(label.trainingLabelEligible || "no_uncertain"),
    ai_confidence: clampScore(label.confidence),
    ai_reason: normalizeCell(label.reason)
  })).filter((label) => label.questionId);
}

function sanitizeInput(input) {
  return {
    sourceType: input.sourceType || "text",
    rawText: input.rawText || "",
    sourceUrl: input.sourceUrl || "",
    sourceTitle: input.sourceTitle || "",
    sourceAccount: input.sourceAccount || ""
  };
}

function safeRunId(id) {
  return String(id || "").replace(/[^A-Za-z0-9_.-]/g, "-") || "quality-run";
}

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = normalizeCell(value);
  return allowed.includes(normalized) ? normalized : fallback;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return String(Math.min(5, Math.max(1, Math.round(number))));
}

function csvCell(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
