export const ISSUE_CATEGORIES = [
  "source_not_supporting",
  "answer_not_unique",
  "explanation_wrong",
  "too_shallow",
  "weak_distractors",
  "knowledge_point_off_target",
  "coverage_gap",
  "low_confidence_bad",
  "source_context_bad",
  "structure_invalid",
  "generation_failed",
  "other"
];

export function parseSampleFile(content, fallbackTitle = "") {
  const text = String(content || "");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!frontmatter) {
    return {
      meta: defaultSampleMeta({ title: fallbackTitle }),
      body: text.trimStart()
    };
  }

  return {
    meta: {
      ...defaultSampleMeta({ title: fallbackTitle }),
      ...parseFrontmatter(frontmatter[1])
    },
    body: text.slice(frontmatter[0].length).trimStart()
  };
}

export function summarize(results) {
  const completed = results.filter((result) => result.status === "completed");
  const chapters = results.filter((result) => result.chapter);
  const allQuestions = chapters.flatMap((result) => result.chapter?.questions || []);
  const qualityScores = allQuestions
    .map((question) => question.qualityScore?.average)
    .filter((score) => Number.isFinite(score));
  const issueFrequency = countValues(results.flatMap((result) => allMachineIssues(result)));
  const machineIssueCategoryFrequency = countValues(
    results.flatMap((result) => allMachineIssues(result).map(categorizeMachineIssue))
  );
  const lowConfidenceCount = allQuestions.filter((question) => question.confidenceLevel === "low").length;
  const trustReasonFrequency = countValues(allQuestions.flatMap((question) => question.confidenceReasons || []));
  const blockingReasonFrequency = countValues(
    chapters.flatMap((result) => [
      ...(result.chapter?.questions || []),
      ...(result.generationDebug?.evaluatedQuestions || [])
    ]).flatMap((question) => question.blockingReasons || [])
  );
  const seriousIssueCount = completed.reduce(
    (sum, result) => sum + (result.chapter?.qualitySummary?.seriousIssueCount || 0),
    0
  );

  return {
    sampleCount: results.length,
    successCount: completed.length,
    failureCount: results.length - completed.length,
    successRate: percent(completed.length, results.length),
    knowledgePointCount: chapters.reduce((sum, result) => sum + (result.chapter?.knowledgePoints?.length || 0), 0),
    qualifiedQuestionCount: allQuestions.length,
    lowConfidenceQuestionCount: lowConfidenceCount,
    lowConfidenceQuestionRate: percent(lowConfidenceCount, allQuestions.length),
    coveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => point.status === "covered").length;
    }, 0),
    uncoveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => point.status !== "covered").length;
    }, 0),
    questionCoverageRate: calculateCoverageRate(chapters),
    averageQualityScore: qualityScores.length
      ? Math.round((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * 10) / 10
      : 0,
    seriousIssueCount,
    issueFrequency,
    machineIssueCategoryFrequency,
    trustReasonFrequency,
    blockingReasonFrequency
  };
}

export function buildReviewRows(results) {
  return results.flatMap((result) => {
    const chapter = result.chapter;
    const acceptedRows = (chapter?.questions || []).map((question) => questionToReviewRow({
      result,
      question,
      status: result.status
    }));
    const rejectedQuestions = (result.generationDebug?.evaluatedQuestions || [])
      .filter((question) => question.qualityAction !== "pass");
    const rejectedRows = rejectedQuestions.map((question) => questionToReviewRow({
      result,
      question,
      status: `${result.status}:rejected`
    }));

    if (!acceptedRows.length && !rejectedRows.length) {
      return [emptyReviewRow(result)];
    }

    return [...acceptedRows, ...rejectedRows];
  });
}

export function categorizeMachineIssue(issue) {
  const value = String(issue || "").toLowerCase();
  if (!value) return "other";
  if (/source.*unsupported|source.*not_found|source.*missing|来源.*不.*支撑|来源.*不足/.test(value)) {
    return "source_not_supporting";
  }
  if (/weak_explanation|faithfulness|解释.*不.*一致|解释.*忠实/.test(value)) return "explanation_wrong";
  if (/weak_context|context.*relevance|上下文.*不准|上下文.*弱/.test(value)) return "source_context_bad";
  if (/answeruniqueness|答案.*唯一|correct.*option/.test(value)) return "answer_not_unique";
  if (/explanation|解释/.test(value)) return "explanation_wrong";
  if (/understandingdepth|reviewvalue|too.*easy|太浅|太简单/.test(value)) return "too_shallow";
  if (/distractor|干扰/.test(value)) return "weak_distractors";
  if (/knowledge.*point|missing_knowledge|知识点/.test(value)) return "knowledge_point_off_target";
  if (/coverage|uncovered|no_qualified|no_questions|无题|覆盖/.test(value)) return "coverage_gap";
  if (/low_confidence|confidence/.test(value)) return "low_confidence_bad";
  if (/context|snippet|上下文|片段/.test(value)) return "source_context_bad";
  if (/options|structure|schema|json|结构/.test(value)) return "structure_invalid";
  if (/failed|error|timeout|生成失败|超时/.test(value)) return "generation_failed";
  return "other";
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const input = String(text || "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers = [], ...body] = rows.filter((item) => item.some((cellValue) => cellValue.trim()));
  return body.map((values) => Object.fromEntries(headers.map((header, index) => [header.trim(), values[index] || ""])));
}

export function analyzeManualReview({ machineReport, csvText }) {
  const rows = parseCsv(csvText);
  const reviewedRows = rows.filter((row) => normalizeStatus(row.human_status || row.usable || row.humanUsable));
  const accepted = reviewedRows.filter((row) => normalizeStatus(row.human_status || row.usable || row.humanUsable) === "accept");
  const fixable = reviewedRows.filter((row) => normalizeStatus(row.human_status || row.usable || row.humanUsable) === "fixable");
  const rejected = reviewedRows.filter((row) => normalizeStatus(row.human_status || row.usable || row.humanUsable) === "reject");
  const severeRows = reviewedRows.filter((row) => truthy(row.severe_issue || row.humanSeriousIssue));
  const primaryIssues = countValues(reviewedRows.map((row) => normalizeIssue(row.primary_issue || row.humanSeriousIssue)).filter(Boolean));
  const machineByQuestion = new Map((machineReport.reviewRows || []).map((row) => [row.questionId || row.question_id, row]));
  const highScoreRejected = rejected.filter((row) => {
    const machine = machineByQuestion.get(row.question_id || row.questionId);
    return Number(machine?.machineAverageScore || 0) >= 4;
  });
  const lowConfidenceReviewed = reviewedRows.filter((row) => {
    const machine = machineByQuestion.get(row.question_id || row.questionId);
    return machine?.confidenceLevel === "low";
  });

  return {
    reviewedQuestionCount: reviewedRows.length,
    acceptedCount: accepted.length,
    fixableCount: fixable.length,
    rejectedCount: rejected.length,
    acceptRate: percent(accepted.length, reviewedRows.length),
    severeIssueCount: severeRows.length,
    severeIssueRate: percent(severeRows.length, reviewedRows.length),
    primaryIssueFrequency: primaryIssues,
    highScoreRejectedCount: highScoreRejected.length,
    lowConfidenceReviewedCount: lowConfidenceReviewed.length,
    lowConfidenceRejectedCount: lowConfidenceReviewed.filter((row) => (
      normalizeStatus(row.human_status || row.usable || row.humanUsable) === "reject"
    )).length
  };
}

export function renderManualReport({ machineReport, manualSummary, resultFile, reviewFile }) {
  const topIssues = Object.entries(manualSummary.primaryIssueFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const machineCategories = Object.entries(machineReport.summary?.machineIssueCategoryFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return [
    "# 出题质量人工审查报告",
    "",
    `- 机器结果：${resultFile}`,
    `- 人工评分：${reviewFile}`,
    `- 生成时间：${new Date().toISOString()}`,
    "",
    "## 总览",
    "",
    `- 样本数：${machineReport.summary?.sampleCount ?? 0}`,
    `- 机器成功率：${machineReport.summary?.successRate ?? 0}%`,
    `- 入池题数：${machineReport.summary?.qualifiedQuestionCount ?? 0}`,
    `- 低置信题比例：${machineReport.summary?.lowConfidenceQuestionRate ?? 0}%`,
    `- 人工审查题数：${manualSummary.reviewedQuestionCount}`,
    `- 人工可用率：${manualSummary.acceptRate}%`,
    `- 严重问题比例：${manualSummary.severeIssueRate}%`,
    `- 机器高分但人工拒绝：${manualSummary.highScoreRejectedCount}`,
    "",
    "## 人工问题分布",
    "",
    ...formatFrequency(topIssues),
    "",
    "## 机器问题分布",
    "",
    ...formatFrequency(machineCategories),
    "",
    "## 下一轮建议",
    "",
    ...recommendNextSteps(manualSummary),
    ""
  ].join("\n");
}

function parseFrontmatter(text) {
  const meta = {};
  for (const line of String(text || "").split("\n")) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!match) continue;
    meta[match[1]] = parseMetaValue(match[2]);
  }
  return meta;
}

function parseMetaValue(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed;
}

function defaultSampleMeta(overrides = {}) {
  return {
    title: overrides.title || "",
    sourceType: "unknown",
    topic: "unknown",
    difficulty: "unknown",
    structureType: "unknown",
    expectedFocus: [],
    reviewPriority: "baseline"
  };
}

function calculateCoverageRate(completed) {
  const diagnostics = completed.flatMap((result) => result.generationDebug?.pointDiagnostics || []);
  if (!diagnostics.length) return 0;
  const covered = diagnostics.filter((point) => point.status === "covered").length;
  return percent(covered, diagnostics.length);
}

function allMachineIssues(result) {
  const questions = [
    ...(result.chapter?.questions || []),
    ...(result.generationDebug?.evaluatedQuestions || [])
  ];
  const issues = questions.flatMap((question) => question.qualityIssues || []);
  if (result.status !== "completed" && result.message) issues.push(result.message);
  return [...new Set(issues)];
}

function countValues(values) {
  return values.reduce((counts, value) => {
    const key = String(value || "other").trim() || "other";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function questionToReviewRow({ result, question, status }) {
  const point = findQuestionKnowledgePoint(result.chapter, question);
  return {
    sample: result.file,
    sampleTitle: result.sampleMeta?.title || "",
    sampleTopic: result.sampleMeta?.topic || "",
    status,
    questionId: question.id,
    knowledgePoint: question.pointTitle || question.knowledgePointId || "",
    knowledgePointId: question.knowledgePointId || question.pointId || "",
    knowledgeStructureRole: point?.structureRole || "",
    knowledgeImportanceScore: point?.importanceScore ?? "",
    knowledgeCoverageReason: point?.coverageReason || "",
    questionType: question.type,
    stem: question.stem,
    options: formatOptions(question.options),
    correctOptionId: question.correctOptionId || "",
    correctAnswerText: correctOptionText(question),
    correctUnderstanding: question.correctUnderstanding || "",
    commonMisconception: question.commonMisconception || "",
    sourceSnippet: question.sourceSnippet || question.source_snippet || "",
    confidenceLevel: question.confidenceLevel || "",
    retainedBy: question.retainedBy || "",
    sourceContextScore: question.sourceContextScore ?? "",
    trustDiagnostics: formatTrustDiagnostics(question.trustDiagnostics),
    confidenceReasons: (question.confidenceReasons || []).join(";"),
    blockingReasons: (question.blockingReasons || []).join(";"),
    machineAverageScore: question.qualityScore?.average ?? "",
    machineIssues: (question.qualityIssues || []).join(";"),
    machineIssueCategory: categorizeMachineIssue((question.qualityIssues || [])[0] || ""),
    human_status: "",
    primary_issue: "",
    secondary_issue: "",
    source_support: "",
    answer_uniqueness: "",
    understanding_depth: "",
    clarity: "",
    distractor_quality: "",
    explanation_faithfulness: "",
    review_value: "",
    blame_stage: "",
    option_issue: "",
    training_label_eligible: "",
    human_verified: "",
    review_decision: "",
    notes: ""
  };
}

function emptyReviewRow(result) {
  return {
    sample: result.file,
    sampleTitle: result.sampleMeta?.title || "",
    sampleTopic: result.sampleMeta?.topic || "",
    status: result.status,
    questionId: "",
    knowledgePoint: "",
    knowledgePointId: "",
    knowledgeStructureRole: "",
    knowledgeImportanceScore: "",
    knowledgeCoverageReason: "",
    questionType: "",
    stem: "",
    options: "",
    correctOptionId: "",
    correctAnswerText: "",
    correctUnderstanding: "",
    commonMisconception: "",
    sourceSnippet: "",
    confidenceLevel: "",
    retainedBy: "",
    sourceContextScore: "",
    trustDiagnostics: "",
    confidenceReasons: "",
    blockingReasons: "",
    machineAverageScore: "",
    machineIssues: result.message || "no_questions",
    machineIssueCategory: categorizeMachineIssue(result.message || "no_questions"),
    human_status: "",
    primary_issue: "",
    secondary_issue: "",
    source_support: "",
    answer_uniqueness: "",
    understanding_depth: "",
    clarity: "",
    distractor_quality: "",
    explanation_faithfulness: "",
    review_value: "",
    blame_stage: "",
    option_issue: "",
    training_label_eligible: "",
    human_verified: "",
    review_decision: "",
    notes: ""
  };
}

function findQuestionKnowledgePoint(chapter, question) {
  const pointId = question.knowledgePointId || question.pointId;
  return (chapter?.knowledgePoints || []).find((point) => point.id === pointId) || null;
}

function formatOptions(options = []) {
  return options.map((option) => `${option.id}. ${option.text}`).join(" | ");
}

function correctOptionText(question) {
  return (question.options || []).find((option) => option.id === question.correctOptionId)?.text || "";
}

function formatTrustDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== "object") return "";
  return [
    `answer:${diagnostics.answerGroundingScore ?? ""}`,
    `explanation:${diagnostics.explanationFaithfulnessScore ?? ""}`,
    `context:${diagnostics.contextRelevanceScore ?? ""}`,
    `misconception:${diagnostics.misconceptionSupportScore ?? ""}`
  ].join(" | ");
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["accept", "yes", "y", "可用", "usable"].includes(normalized)) return "accept";
  if (["fixable", "需修", "可修", "maybe"].includes(normalized)) return "fixable";
  if (["reject", "no", "n", "不可用", "严重"].includes(normalized)) return "reject";
  return "";
}

function normalizeIssue(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  return ISSUE_CATEGORIES.includes(normalized) ? normalized : categorizeMachineIssue(normalized);
}

function truthy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "严重", "是"].includes(normalized);
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatFrequency(entries) {
  if (!entries.length) return ["- 暂无"];
  return entries.map(([key, value]) => `- ${key}: ${value}`);
}

function recommendNextSteps(manualSummary) {
  const topIssue = Object.entries(manualSummary.primaryIssueFrequency || {})
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!topIssue) {
    return ["- 先完成至少 20 道题的人工评分，再决定下一轮优化方向。"];
  }
  return [
    `- 优先处理 \`${topIssue}\`，下一轮只围绕这个问题改 prompt 或质量规则。`,
    "- 保持同一批 baseline 样本不变，改完后重新跑机器报告并复查人工可用率。",
    "- 如果机器高分但人工拒绝数量较高，优先修质量评分器；如果低置信题 reject 率高，优先收紧入池规则。"
  ];
}
