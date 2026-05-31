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
  "review_friction_high",
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
  const needsRewriteCount = allQuestions.filter((question) => question.confidenceTier === "needs_rewrite").length;
  const reviewWarningCount = allQuestions.filter((question) => question.confidenceTier === "review_warning").length;
  const highConfidenceCount = allQuestions.filter((question) => question.confidenceTier === "high_confidence").length;
  const pointDiagnostics = chapters.flatMap((result) => result.generationDebug?.pointDiagnostics || []);
  const questionCountDistribution = countValues(pointDiagnostics.map((point) => String(point.qualifiedQuestionCount || 0)));
  const averageQuestionsPerPoint = pointDiagnostics.length
    ? Math.round((pointDiagnostics.reduce((sum, point) => sum + (point.qualifiedQuestionCount || 0), 0) / pointDiagnostics.length) * 10) / 10
    : 0;
  const expectedQuestionCount = pointDiagnostics.reduce((sum, point) => (
    sum + (Number(point.expectedQuestionCount ?? point.targetQuestionCount) || 0)
  ), 0);
  const dynamicCoverageRate = expectedQuestionCount
    ? Math.round((allQuestions.length / expectedQuestionCount) * 1000) / 10
    : 0;
  const dynamicCoverageRates = pointDiagnostics
    .map((point) => Number(point.dynamicCoverageRate ?? point.questionCoverageRate))
    .filter(Number.isFinite);
  const averageDynamicCoverageRate = dynamicCoverageRates.length
    ? Math.round((dynamicCoverageRates.reduce((sum, value) => sum + value, 0) / dynamicCoverageRates.length) * 10) / 10
    : 0;
  const dynamicCoverageStatusFrequency = countValues(pointDiagnostics.map((point) => (
    point.dynamicCoverageStatus || "unknown"
  )));
  const missingMemoryAngleFrequency = countValues(pointDiagnostics.flatMap((point) => (
    Array.isArray(point.missingMemoryAngles) ? point.missingMemoryAngles : []
  )));
  const recoverableBlockedCount = pointDiagnostics.reduce((sum, point) => (
    sum + (Number(point.recoverableBlockedCount) || 0)
  ), 0);
  const questionTypeCoverage = countValues(allQuestions.map((question) => question.type || "unknown"));
  const memoryAngleCoverage = countValues(allQuestions.map((question) => question.memoryAngle || "unknown"));
  const confidenceTierFrequency = countValues(allQuestions.map((question) => question.confidenceTier || "unknown"));
  const sourcePrecisionScores = allQuestions
    .map((question) => Number(question.sourcePrecisionScore || question.trustDiagnostics?.sourcePrecisionScore))
    .filter(Number.isFinite);
  const averageSourcePrecisionScore = sourcePrecisionScores.length
    ? Math.round((sourcePrecisionScores.reduce((sum, score) => sum + score, 0) / sourcePrecisionScores.length) * 10) / 10
    : 0;
  const sourceMinimalityScores = allQuestions
    .map((question) => Number(question.sourceMinimalityScore || question.sourceContextSelection?.sourceMinimalityScore))
    .filter(Number.isFinite);
  const averageSourceMinimalityScore = sourceMinimalityScores.length
    ? Math.round((sourceMinimalityScores.reduce((sum, score) => sum + score, 0) / sourceMinimalityScores.length) * 10) / 10
    : 0;
  const sourceReuseTop = sourceReuseSummary(allQuestions);
  const sourceOverlapTop = sourceOverlapSummary(allQuestions);
  const sourceBlockReuseTop = sourceBlockReuseSummary(allQuestions);
  const sourceBlockCoverageByPoint = sourceBlockCoverageSummary(allQuestions);
  const threeQuestionPointRate = percent(
    pointDiagnostics.filter((point) => (point.qualifiedQuestionCount || 0) >= 3).length,
    pointDiagnostics.length
  );
  const trustReasonFrequency = countValues(allQuestions.flatMap((question) => question.confidenceReasons || []));
  const blueprintAlignmentScores = allQuestions
    .map((question) => Number(question.blueprintAlignmentScore))
    .filter(Number.isFinite);
  const memoryAngleFitScores = allQuestions
    .map((question) => Number(question.memoryAngleFitScore))
    .filter(Number.isFinite);
  const cognitiveActionFitScores = allQuestions
    .map((question) => Number(question.cognitiveActionFitScore))
    .filter(Number.isFinite);
  const coreUnderstandingScores = allQuestions
    .map((question) => Number(question.coreUnderstandingScore ?? question.coreRecallFitScore))
    .filter(Number.isFinite);
  const boundaryDiscriminationScores = allQuestions
    .map((question) => Number(question.boundaryDiscriminationFitScore))
    .filter(Number.isFinite);
  const scenarioApplicationScores = allQuestions
    .map((question) => Number(question.scenarioApplicationScore ?? question.scenarioTransferFitScore))
    .filter(Number.isFinite);
  const practiceProgressionScores = allQuestions
    .map((question) => Number(question.practiceProgressionScore))
    .filter(Number.isFinite);
  const evidenceLearningValueScores = allQuestions
    .map((question) => Number(question.evidenceLearningValueScore))
    .filter(Number.isFinite);
  const reviewFrictionScores = allQuestions
    .map((question) => Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore))
    .filter(Number.isFinite);
  const visibleReadingLoads = allQuestions
    .map((question) => Number(question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad))
    .filter(Number.isFinite);
  const highFrictionQuestionCount = allQuestions.filter((question) => (
    Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? 5) < 4
  )).length;
  const mandatoryFrictionRewriteCount = allQuestions.filter((question) => {
    const score = Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? 5);
    const load = Number(question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad ?? 0);
    const stemLength = Number(question.stemLength ?? question.trustDiagnostics?.stemLength ?? 0);
    const maxOptionLength = Number(question.maxOptionLength ?? question.trustDiagnostics?.maxOptionLength ?? 0);
    const scenarioStemTooLong = question.type === "scenario_judgment" && stemLength > 110;
    return score <= 2 || load > 220 || scenarioStemTooLong || maxOptionLength > 60;
  }).length;
  const heavyQuestionTop = heavyQuestionSummary(allQuestions);
  const duplicatePracticeRiskCount = allQuestions
    .filter((question) => Number(question.practiceDuplicateRiskScore || 0) >= 4).length;
  const cognitiveActionIssueFrequency = countValues(allQuestions
    .map((question) => question.cognitiveActionIssue || question.pedagogyDiagnostics?.cognitiveActionIssue || "")
    .filter(Boolean));
  const sourceCoverageScores = allQuestions
    .map((question) => Number(question.sourceCoverageScore || question.trustDiagnostics?.sourceCoverageScore))
    .filter(Number.isFinite);
  const claimFidelityScores = allQuestions
    .map((question) => Number(question.claimFidelityScore || question.trustDiagnostics?.claimFidelityScore))
    .filter(Number.isFinite);
  const structureCoverage = structureCoverageSummary(chapters);
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
    expectedQuestionCount,
    dynamicCoverageRate,
    averageDynamicCoverageRate,
    dynamicCoverageStatusFrequency,
    missingMemoryAngleFrequency,
    recoverableBlockedCount,
    averageQuestionsPerPoint,
    questionCountDistribution,
    questionTypeCoverage,
    memoryAngleCoverage,
    confidenceTierFrequency,
    averageSourcePrecisionScore,
    averageSourceMinimalityScore,
    sourceReuseTop,
    sourceOverlapTop,
    sourceBlockReuseTop,
    sourceBlockCoverageByPoint,
    threeQuestionPointRate,
    lowConfidenceQuestionCount: lowConfidenceCount,
    lowConfidenceQuestionRate: percent(lowConfidenceCount, allQuestions.length),
    needsRewriteQuestionCount: needsRewriteCount,
    needsRewriteQuestionRate: percent(needsRewriteCount, allQuestions.length),
    reviewWarningQuestionCount: reviewWarningCount,
    reviewWarningQuestionRate: percent(reviewWarningCount, allQuestions.length),
    highConfidenceQuestionCount: highConfidenceCount,
    highConfidenceQuestionRate: percent(highConfidenceCount, allQuestions.length),
    coveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => point.status?.startsWith("covered")).length;
    }, 0),
    uncoveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => !point.status?.startsWith("covered")).length;
    }, 0),
    questionCoverageRate: calculateCoverageRate(chapters),
    averageQualityScore: qualityScores.length
      ? Math.round((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * 10) / 10
      : 0,
    seriousIssueCount,
    issueFrequency,
    machineIssueCategoryFrequency,
    trustReasonFrequency,
    averageBlueprintAlignmentScore: blueprintAlignmentScores.length
      ? Math.round((blueprintAlignmentScores.reduce((sum, score) => sum + score, 0) / blueprintAlignmentScores.length) * 10) / 10
      : 0,
    averageMemoryAngleFitScore: memoryAngleFitScores.length
      ? Math.round((memoryAngleFitScores.reduce((sum, score) => sum + score, 0) / memoryAngleFitScores.length) * 10) / 10
      : 0,
    averageCognitiveActionFitScore: cognitiveActionFitScores.length
      ? Math.round((cognitiveActionFitScores.reduce((sum, score) => sum + score, 0) / cognitiveActionFitScores.length) * 10) / 10
      : 0,
    averageCoreUnderstandingScore: coreUnderstandingScores.length
      ? Math.round((coreUnderstandingScores.reduce((sum, score) => sum + score, 0) / coreUnderstandingScores.length) * 10) / 10
      : 0,
    averageBoundaryDiscriminationScore: boundaryDiscriminationScores.length
      ? Math.round((boundaryDiscriminationScores.reduce((sum, score) => sum + score, 0) / boundaryDiscriminationScores.length) * 10) / 10
      : 0,
    averageScenarioApplicationScore: scenarioApplicationScores.length
      ? Math.round((scenarioApplicationScores.reduce((sum, score) => sum + score, 0) / scenarioApplicationScores.length) * 10) / 10
      : 0,
    averagePracticeProgressionScore: practiceProgressionScores.length
      ? Math.round((practiceProgressionScores.reduce((sum, score) => sum + score, 0) / practiceProgressionScores.length) * 10) / 10
      : 0,
    averageEvidenceLearningValueScore: evidenceLearningValueScores.length
      ? Math.round((evidenceLearningValueScores.reduce((sum, score) => sum + score, 0) / evidenceLearningValueScores.length) * 10) / 10
      : 0,
    averageReviewFrictionScore: reviewFrictionScores.length
      ? Math.round((reviewFrictionScores.reduce((sum, score) => sum + score, 0) / reviewFrictionScores.length) * 10) / 10
      : 0,
    averageVisibleReadingLoad: visibleReadingLoads.length
      ? Math.round((visibleReadingLoads.reduce((sum, value) => sum + value, 0) / visibleReadingLoads.length) * 10) / 10
      : 0,
    highFrictionQuestionCount,
    mandatoryFrictionRewriteCount,
    heavyQuestionTop,
    averageSourceCoverageScore: sourceCoverageScores.length
      ? Math.round((sourceCoverageScores.reduce((sum, score) => sum + score, 0) / sourceCoverageScores.length) * 10) / 10
      : 0,
    averageClaimFidelityScore: claimFidelityScores.length
      ? Math.round((claimFidelityScores.reduce((sum, score) => sum + score, 0) / claimFidelityScores.length) * 10) / 10
      : 0,
    duplicatePracticeRiskCount,
    cognitiveActionIssueFrequency,
    structureCoverage,
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
  if (/review_friction|friction|question_card_too_heavy|option_too_explanatory|低摩擦|题卡|阅读负担/.test(value)) return "review_friction_high";
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
  const sourcePrecisionScores = reviewedRows.map((row) => Number(row.source_precision || row.human_source_precision)).filter(Number.isFinite);
  const sourceMinimalityScores = reviewedRows.map((row) => Number(row.source_minimality || row.human_source_minimality)).filter(Number.isFinite);

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
    lowConfidenceAcceptedCount: lowConfidenceReviewed.filter((row) => (
      normalizeStatus(row.human_status || row.usable || row.humanUsable) === "accept"
    )).length,
    lowConfidenceFixableCount: lowConfidenceReviewed.filter((row) => (
      normalizeStatus(row.human_status || row.usable || row.humanUsable) === "fixable"
    )).length,
    lowConfidenceRejectedCount: lowConfidenceReviewed.filter((row) => (
      normalizeStatus(row.human_status || row.usable || row.humanUsable) === "reject"
    )).length,
    averageSourcePrecision: sourcePrecisionScores.length
      ? Math.round((sourcePrecisionScores.reduce((sum, score) => sum + score, 0) / sourcePrecisionScores.length) * 10) / 10
      : 0,
    averageSourceMinimality: sourceMinimalityScores.length
      ? Math.round((sourceMinimalityScores.reduce((sum, score) => sum + score, 0) / sourceMinimalityScores.length) * 10) / 10
      : 0
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
    `- 动态预期题数：${machineReport.summary?.expectedQuestionCount ?? 0}`,
    `- 动态覆盖率：${machineReport.summary?.dynamicCoverageRate ?? 0}%`,
    `- 平均每知识点题数：${machineReport.summary?.averageQuestionsPerPoint ?? 0}`,
    `- 3 题知识点比例：${machineReport.summary?.threeQuestionPointRate ?? 0}%`,
    `- 需重写题比例：${machineReport.summary?.needsRewriteQuestionRate ?? machineReport.summary?.lowConfidenceQuestionRate ?? 0}%`,
    `- 可复习提醒题比例：${machineReport.summary?.reviewWarningQuestionRate ?? 0}%`,
    `- 人工审查题数：${manualSummary.reviewedQuestionCount}`,
    `- 人工可用率：${manualSummary.acceptRate}%`,
    `- 严重问题比例：${manualSummary.severeIssueRate}%`,
    `- 机器高分但人工拒绝：${manualSummary.highScoreRejectedCount}`,
    `- 需重写题人工 accept/fixable/reject：${manualSummary.lowConfidenceAcceptedCount}/${manualSummary.lowConfidenceFixableCount}/${manualSummary.lowConfidenceRejectedCount}`,
    `- 人工来源精准度均分：${manualSummary.averageSourcePrecision}`,
    `- 人工最小证据均分：${manualSummary.averageSourceMinimality}`,
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
  const covered = diagnostics.filter((point) => point.status?.startsWith("covered")).length;
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
  const pointDiagnostics = findQuestionPointDiagnostics(result, question);
  return {
    sample: result.file,
    sampleTitle: result.sampleMeta?.title || "",
    sampleTopic: result.sampleMeta?.topic || "",
    status,
    questionId: question.id,
    knowledgePoint: question.pointTitle || question.knowledgePointId || "",
    knowledgePointId: question.knowledgePointId || question.pointId || "",
    knowledgeStructureRole: point?.structureRole || "",
    structureNodeId: question.structureNodeId || point?.structureNodeId || "",
    roleInArticle: question.roleInArticle || point?.roleInArticle || point?.structureRole || "",
    sourceEvidenceIds: formatList(question.sourceEvidenceIds || point?.sourceEvidenceIds || []),
    requiredEvidenceIds: formatList(question.requiredEvidenceIds || []),
    whyWorthReviewing: point?.whyWorthReviewing || point?.coverageReason || "",
    pointClaimFidelityScore: point?.claimFidelityScore ?? "",
    knowledgeImportanceScore: point?.importanceScore ?? "",
    knowledgeCoverageReason: point?.coverageReason || "",
    practiceBlueprint: formatPracticeBlueprint(point?.practiceBlueprint),
    expectedQuestionCount: pointDiagnostics?.expectedQuestionCount ?? pointDiagnostics?.targetQuestionCount ?? "",
    actualQuestionCount: pointDiagnostics?.actualQuestionCount ?? pointDiagnostics?.qualifiedQuestionCount ?? "",
    dynamicCoverageRate: pointDiagnostics?.dynamicCoverageRate ?? pointDiagnostics?.questionCoverageRate ?? "",
    dynamicCoverageStatus: pointDiagnostics?.dynamicCoverageStatus || "",
    expectedMemoryAngles: formatList(pointDiagnostics?.expectedMemoryAngles || []),
    coveredMemoryAngles: formatList(pointDiagnostics?.coveredMemoryAngles || pointDiagnostics?.selectedMemoryAngles || []),
    missingMemoryAngles: formatList(pointDiagnostics?.missingMemoryAngles || []),
    recoverableBlockedCount: pointDiagnostics?.recoverableBlockedCount ?? "",
    questionType: question.type,
    stem: question.stem,
    options: formatOptions(question.options),
    correctOptionId: question.correctOptionId || "",
    correctAnswerText: correctOptionText(question),
    correctUnderstanding: question.correctUnderstanding || "",
    commonMisconception: question.commonMisconception || "",
    sourceSnippet: question.sourceSnippet || question.source_snippet || "",
    memoryAngle: question.memoryAngle || "",
    blueprintItemId: question.blueprintItemId || "",
    blueprintGoal: question.blueprintGoal || "",
    memoryAngleFitScore: question.memoryAngleFitScore ?? "",
    blueprintAlignmentScore: question.blueprintAlignmentScore ?? "",
    pedagogyDiagnostics: formatObject(question.pedagogyDiagnostics),
    cognitiveActionFitScore: question.cognitiveActionFitScore ?? "",
    cognitiveActionIssue: question.cognitiveActionIssue || question.pedagogyDiagnostics?.cognitiveActionIssue || "",
    coreRecallFitScore: question.coreRecallFitScore ?? "",
    coreUnderstandingScore: question.coreUnderstandingScore ?? question.coreRecallFitScore ?? "",
    boundaryDiscriminationFitScore: question.boundaryDiscriminationFitScore ?? "",
    scenarioTransferFitScore: question.scenarioTransferFitScore ?? "",
    scenarioApplicationScore: question.scenarioApplicationScore ?? question.scenarioTransferFitScore ?? "",
    practiceProgressionScore: question.practiceProgressionScore ?? "",
    practiceDuplicateRiskScore: question.practiceDuplicateRiskScore ?? "",
    evidenceLearningValueScore: question.evidenceLearningValueScore ?? "",
    reviewFrictionScore: question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? "",
    visibleReadingLoad: question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad ?? "",
    stemLength: question.stemLength ?? question.trustDiagnostics?.stemLength ?? "",
    maxOptionLength: question.maxOptionLength ?? question.trustDiagnostics?.maxOptionLength ?? "",
    reviewFrictionReasons: formatList(question.reviewFrictionReasons || question.trustDiagnostics?.reviewFrictionReasons || []),
    sourceReuseLearningReason: question.sourceReuseLearningReason || "",
    typeDiversityReason: question.typeDiversityReason || "",
    confidenceLevel: question.confidenceLevel || "",
    confidenceTier: question.confidenceTier || "",
    retainedBy: question.retainedBy || "",
    sourceContextScore: question.sourceContextScore ?? "",
    sourcePrecisionScore: question.sourcePrecisionScore ?? question.trustDiagnostics?.sourcePrecisionScore ?? "",
    sourceCoverageScore: question.sourceCoverageScore ?? question.trustDiagnostics?.sourceCoverageScore ?? "",
    claimFidelityScore: question.claimFidelityScore ?? question.trustDiagnostics?.claimFidelityScore ?? "",
    learningEffectivenessScore: question.learningEffectivenessScore ?? question.cognitiveActionFitScore ?? "",
    sourceSpecificityScore: question.sourceSpecificityScore ?? "",
    sourceMinimalityScore: question.sourceMinimalityScore ?? question.sourceContextSelection?.sourceMinimalityScore ?? "",
    sourceEvidenceRole: question.sourceEvidenceRole || question.sourceContextSelection?.sourceEvidenceRole || "",
    sourceBlockId: question.sourceBlockId || question.sourceContextSelection?.sourceBlockId || "",
    sourceEvidenceDiversityScore: question.sourceEvidenceDiversityScore ?? question.sourceContextSelection?.sourceEvidenceDiversityScore ?? "",
    sourceReuseReason: question.sourceReuseReason || question.sourceContextSelection?.sourceReuseReason || "",
    sourceOverlapRatio: question.sourceOverlapRatio ?? question.sourceContextSelection?.sourceOverlapRatio ?? "",
    sourceOverlapGroupId: question.sourceOverlapGroupId || question.sourceContextSelection?.sourceOverlapGroupId || "",
    sourceReuseCount: question.sourceReuseCount ?? question.sourceContextSelection?.reuseCount ?? "",
    sourceContextSelection: formatSourceContextSelection(question.sourceContextSelection),
    trustDiagnostics: formatTrustDiagnostics(question.trustDiagnostics),
    confidenceReasons: (question.confidenceReasons || []).join(";"),
    blockingReasons: (question.blockingReasons || []).join(";"),
    primaryBlockingReason: question.primaryBlockingReason || "",
    repairHint: question.repairHint || "",
    machineAverageScore: question.qualityScore?.average ?? "",
    machineIssues: (question.qualityIssues || []).join(";"),
    machineIssueCategory: categorizeMachineIssue((question.qualityIssues || [])[0] || ""),
    human_status: "",
    primary_issue: "",
    secondary_issue: "",
    source_support: "",
    source_precision: "",
    source_coverage: "",
    claim_fidelity: "",
    source_minimality: "",
    source_evidence_role: "",
    source_block_id: "",
    source_evidence_diversity: "",
    source_reuse_reason: "",
    source_overlap_ratio: "",
    source_overlap_group: "",
    cognitive_action_fit: "",
    practice_progression: "",
    duplicate_practice: "",
    misconception_realism: "",
    distractor_learning_value: "",
    evidence_learning_value: "",
    review_friction: "",
    visible_reading_load: "",
    question_card_weight: "",
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
    structureNodeId: "",
    roleInArticle: "",
    sourceEvidenceIds: "",
    requiredEvidenceIds: "",
    whyWorthReviewing: "",
    pointClaimFidelityScore: "",
    knowledgeImportanceScore: "",
    knowledgeCoverageReason: "",
    practiceBlueprint: "",
    expectedQuestionCount: "",
    actualQuestionCount: "",
    dynamicCoverageRate: "",
    dynamicCoverageStatus: "",
    expectedMemoryAngles: "",
    coveredMemoryAngles: "",
    missingMemoryAngles: "",
    recoverableBlockedCount: "",
    questionType: "",
    stem: "",
    options: "",
    correctOptionId: "",
    correctAnswerText: "",
    correctUnderstanding: "",
    commonMisconception: "",
    sourceSnippet: "",
    memoryAngle: "",
    blueprintItemId: "",
    blueprintGoal: "",
    memoryAngleFitScore: "",
    blueprintAlignmentScore: "",
    pedagogyDiagnostics: "",
    cognitiveActionFitScore: "",
    cognitiveActionIssue: "",
    coreRecallFitScore: "",
    coreUnderstandingScore: "",
    boundaryDiscriminationFitScore: "",
    scenarioTransferFitScore: "",
    scenarioApplicationScore: "",
    practiceProgressionScore: "",
    practiceDuplicateRiskScore: "",
    evidenceLearningValueScore: "",
    reviewFrictionScore: "",
    visibleReadingLoad: "",
    stemLength: "",
    maxOptionLength: "",
    reviewFrictionReasons: "",
    sourceReuseLearningReason: "",
    typeDiversityReason: "",
    confidenceLevel: "",
    confidenceTier: "",
    retainedBy: "",
    sourceContextScore: "",
    sourcePrecisionScore: "",
    sourceCoverageScore: "",
    claimFidelityScore: "",
    learningEffectivenessScore: "",
    sourceSpecificityScore: "",
    sourceMinimalityScore: "",
    sourceEvidenceRole: "",
    sourceBlockId: "",
    sourceEvidenceDiversityScore: "",
    sourceReuseReason: "",
    sourceOverlapRatio: "",
    sourceOverlapGroupId: "",
    sourceReuseCount: "",
    sourceContextSelection: "",
    trustDiagnostics: "",
    pedagogyDiagnostics: "",
    confidenceReasons: "",
    blockingReasons: "",
    primaryBlockingReason: "",
    repairHint: "",
    machineAverageScore: "",
    machineIssues: result.message || "no_questions",
    machineIssueCategory: categorizeMachineIssue(result.message || "no_questions"),
    human_status: "",
    primary_issue: "",
    secondary_issue: "",
    source_support: "",
    source_precision: "",
    source_coverage: "",
    claim_fidelity: "",
    source_minimality: "",
    source_evidence_role: "",
    source_block_id: "",
    source_evidence_diversity: "",
    source_reuse_reason: "",
    source_overlap_ratio: "",
    source_overlap_group: "",
    cognitive_action_fit: "",
    practice_progression: "",
    duplicate_practice: "",
    misconception_realism: "",
    distractor_learning_value: "",
    evidence_learning_value: "",
    review_friction: "",
    visible_reading_load: "",
    question_card_weight: "",
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

function findQuestionPointDiagnostics(result, question) {
  const pointId = question.knowledgePointId || question.pointId;
  return (result.generationDebug?.pointDiagnostics || []).find((point) => point.pointId === pointId) || null;
}

function formatPracticeBlueprint(blueprint) {
  if (!Array.isArray(blueprint) || !blueprint.length) return "";
  return blueprint.map((item) => [
    item.id,
    item.memoryAngle,
    item.preferredQuestionType,
    item.goal
  ].filter(Boolean).join(":")).join(" | ");
}

function formatOptions(options = []) {
  return options.map((option) => `${option.id}. ${option.text}`).join(" | ");
}

function formatList(values = []) {
  if (!Array.isArray(values)) return String(values || "");
  return values.map(String).filter(Boolean).join("|");
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
    `misconception:${diagnostics.misconceptionSupportScore ?? ""}`,
    `sourceCoverage:${diagnostics.sourceCoverageScore ?? ""}`,
    `claimFidelity:${diagnostics.claimFidelityScore ?? ""}`,
    `cognitive:${diagnostics.cognitiveActionFitScore ?? ""}`,
    `evidenceLearning:${diagnostics.evidenceLearningValueScore ?? ""}`,
    `reviewFriction:${diagnostics.reviewFrictionScore ?? ""}`,
    `visibleLoad:${diagnostics.visibleReadingLoad ?? ""}`
  ].join(" | ");
}

function formatObject(value) {
  if (!value || typeof value !== "object") return "";
  return JSON.stringify(value);
}

function formatSourceContextSelection(selection) {
  if (!selection || typeof selection !== "object") return "";
  return [
    `method:${selection.method || ""}`,
    `paragraph:${selection.paragraphIndex ?? ""}`,
    `score:${selection.score ?? ""}`,
    `relevance:${selection.relevanceScore ?? ""}`,
    `precision:${selection.sourcePrecisionScore ?? ""}`,
    `specificity:${selection.specificityScore ?? ""}`,
    `minimality:${selection.sourceMinimalityScore ?? ""}`,
    `role:${selection.sourceEvidenceRole ?? ""}`,
    `block:${selection.sourceBlockId ?? ""}`,
    `diversity:${selection.sourceEvidenceDiversityScore ?? ""}`,
    `reuseReason:${selection.sourceReuseReason ?? ""}`,
    `overlap:${selection.sourceOverlapRatio ?? ""}`,
    `overlapGroup:${selection.sourceOverlapGroupId ?? ""}`,
    `reuse:${selection.reuseCount ?? ""}`,
    `candidates:${selection.candidateCount ?? ""}`,
    `anchor:${selection.anchorMatched ? "yes" : "no"}`,
    `fallback:${selection.fallback ? "yes" : "no"}`,
    selection.fallbackReason ? `reason:${selection.fallbackReason}` : ""
  ].filter(Boolean).join(" | ");
}

function heavyQuestionSummary(questions = []) {
  return questions
    .map((question) => ({
      questionId: question.id || "",
      knowledgePointId: question.knowledgePointId || question.pointId || "",
      memoryAngle: question.memoryAngle || "",
      reviewFrictionScore: Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? 0),
      visibleReadingLoad: Number(question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad ?? 0),
      stemLength: Number(question.stemLength ?? question.trustDiagnostics?.stemLength ?? 0),
      maxOptionLength: Number(question.maxOptionLength ?? question.trustDiagnostics?.maxOptionLength ?? 0),
      reviewFrictionReasons: question.reviewFrictionReasons || question.trustDiagnostics?.reviewFrictionReasons || [],
      stem: question.stem || ""
    }))
    .filter((item) => item.visibleReadingLoad || item.stemLength || item.maxOptionLength)
    .sort((a, b) => (
      b.visibleReadingLoad - a.visibleReadingLoad
      || a.reviewFrictionScore - b.reviewFrictionScore
      || b.maxOptionLength - a.maxOptionLength
    ))
    .slice(0, 5);
}

function sourceReuseSummary(questions = []) {
  const groups = new Map();
  for (const question of questions) {
    const selection = question.sourceContextSelection || {};
    const key = Number.isFinite(Number(selection.paragraphIndex))
      ? `paragraph:${selection.paragraphIndex}`
      : compactSourceKey(question.sourceSnippet);
    const current = groups.get(key) || {
      key,
      count: 0,
      questionIds: [],
      stems: [],
      method: selection.method || "",
      paragraphIndex: selection.paragraphIndex ?? ""
    };
    current.count += 1;
    current.questionIds.push(question.id);
    current.stems.push(question.stem);
    groups.set(key, current);
  }
  return [...groups.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({
      key: item.key,
      count: item.count,
      method: item.method,
      paragraphIndex: item.paragraphIndex,
      questionIds: item.questionIds
    }));
}

function sourceOverlapSummary(questions = []) {
  const groups = new Map();
  for (const question of questions) {
    const groupId = question.sourceOverlapGroupId || question.sourceContextSelection?.sourceOverlapGroupId;
    const ratio = Number(question.sourceOverlapRatio ?? question.sourceContextSelection?.sourceOverlapRatio ?? 0);
    if (!groupId || ratio < 0.7) continue;
    const current = groups.get(groupId) || {
      key: groupId,
      count: 0,
      maxOverlapRatio: 0,
      questionIds: []
    };
    current.count += 1;
    current.maxOverlapRatio = Math.max(current.maxOverlapRatio, Math.round(ratio * 100) / 100);
    if (question.id) current.questionIds.push(question.id);
    groups.set(groupId, current);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.maxOverlapRatio - a.maxOverlapRatio)
    .slice(0, 5);
}

function sourceBlockReuseSummary(questions = []) {
  const groups = new Map();
  for (const question of questions) {
    const blockId = question.sourceBlockId || question.sourceContextSelection?.sourceBlockId;
    if (!blockId) continue;
    const current = groups.get(blockId) || {
      key: blockId,
      count: 0,
      evidenceRole: question.sourceEvidenceRole || question.sourceContextSelection?.sourceEvidenceRole || "",
      paragraphIndex: question.sourceContextSelection?.paragraphIndex ?? "",
      questionIds: [],
      knowledgePointIds: new Set()
    };
    current.count += 1;
    if (question.id) current.questionIds.push(question.id);
    if (question.knowledgePointId || question.pointId) current.knowledgePointIds.add(question.knowledgePointId || question.pointId);
    groups.set(blockId, current);
  }
  return [...groups.values()]
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((item) => ({
      key: item.key,
      count: item.count,
      evidenceRole: item.evidenceRole,
      paragraphIndex: item.paragraphIndex,
      questionIds: item.questionIds,
      knowledgePointCount: item.knowledgePointIds.size
    }));
}

function sourceBlockCoverageSummary(questions = []) {
  const groups = new Map();
  for (const question of questions) {
    const pointId = question.knowledgePointId || question.pointId || "";
    if (!pointId) continue;
    const current = groups.get(pointId) || {
      knowledgePointId: pointId,
      questionCount: 0,
      sourceBlockIds: new Set(),
      evidenceRoles: new Set()
    };
    current.questionCount += 1;
    const blockId = question.sourceBlockId || question.sourceContextSelection?.sourceBlockId;
    const role = question.sourceEvidenceRole || question.sourceContextSelection?.sourceEvidenceRole;
    if (blockId) current.sourceBlockIds.add(blockId);
    if (role) current.evidenceRoles.add(role);
    groups.set(pointId, current);
  }
  return [...groups.values()]
    .map((item) => ({
      knowledgePointId: item.knowledgePointId,
      questionCount: item.questionCount,
      sourceBlockCount: item.sourceBlockIds.size,
      evidenceRoleCount: item.evidenceRoles.size,
      sourceBlockIds: [...item.sourceBlockIds],
      evidenceRoles: [...item.evidenceRoles]
    }))
    .sort((a, b) => b.questionCount - a.questionCount || a.knowledgePointId.localeCompare(b.knowledgePointId));
}

function structureCoverageSummary(chapters = []) {
  const nodeMap = new Map();
  for (const result of chapters) {
    const nodes = result.generationDebug?.articleStructureMap?.nodes || [];
    const evidenceNodes = result.generationDebug?.articleStructureMap?.evidenceNodes || [];
    for (const node of evidenceNodes) {
      if (!node?.id) continue;
      const current = nodeMap.get(node.id) || {
        nodeId: node.id,
        title: node.title || "",
        role: node.role || "",
        sourceOrder: node.sourceOrder ?? 0,
        knowledgePointCount: 0,
        questionCount: 0,
        nodeType: "evidence",
        evidenceBlockIds: Array.isArray(node.evidenceBlockIds) ? node.evidenceBlockIds : []
      };
      current.evidenceBlockIds = Array.isArray(node.evidenceBlockIds) ? node.evidenceBlockIds : current.evidenceBlockIds || [];
      nodeMap.set(node.id, current);
    }
    for (const node of nodes) {
      if (!node?.id) continue;
      const current = nodeMap.get(node.id) || {
        nodeId: node.id,
        title: node.title || "",
        role: node.role || "",
        sourceOrder: node.sourceOrder ?? 0,
        knowledgePointCount: 0,
        questionCount: 0,
        nodeType: "mainline"
      };
      current.nodeType = "mainline";
      nodeMap.set(node.id, current);
    }
    const points = result.chapter?.knowledgePoints || result.generationDebug?.knowledgePoints || [];
    for (const point of points) {
      const nodeId = point.structureNodeId || "";
      if (!nodeId) continue;
      const current = nodeMap.get(nodeId) || {
        nodeId,
        title: "",
        role: point.roleInArticle || point.structureRole || "",
        sourceOrder: 0,
        knowledgePointCount: 0,
        questionCount: 0,
        nodeType: "mainline"
      };
      current.knowledgePointCount += 1;
      nodeMap.set(nodeId, current);
    }
    const questionMap = new Map();
    for (const question of [
      ...(result.chapter?.questions || []),
      ...(result.generationDebug?.evaluatedQuestions || [])
    ]) {
      if (!question) continue;
      const key = question.id || `${question.knowledgePointId || ""}:${question.stem || ""}`;
      if (!key) continue;
      questionMap.set(key, question);
    }
    const questions = [...questionMap.values()];
    for (const question of questions) {
      const nodeId = question.structureNodeId || "";
      if (!nodeId) continue;
      const current = nodeMap.get(nodeId) || {
        nodeId,
        title: "",
        role: question.roleInArticle || "",
        sourceOrder: 0,
        knowledgePointCount: 0,
        questionCount: 0,
        nodeType: "mainline"
      };
      current.questionCount += 1;
      nodeMap.set(nodeId, current);
      const sourceBlockId = question.sourceBlockId || question.sourceContextSelection?.sourceBlockId || "";
      if (sourceBlockId) {
        for (const evidenceNode of nodeMap.values()) {
          if (evidenceNode.nodeType !== "evidence") continue;
          if (!Array.isArray(evidenceNode.evidenceBlockIds) || !evidenceNode.evidenceBlockIds.includes(sourceBlockId)) continue;
          evidenceNode.questionCount += 1;
          nodeMap.set(evidenceNode.nodeId, evidenceNode);
        }
      }
    }
  }

  const nodes = [...nodeMap.values()].sort((a, b) => a.sourceOrder - b.sourceOrder || a.nodeId.localeCompare(b.nodeId));
  const mainlineNodes = nodes.filter((node) => node.nodeType !== "evidence");
  const evidenceNodes = nodes.filter((node) => node.nodeType === "evidence");
  return {
    structureNodeCount: mainlineNodes.length,
    evidenceNodeCount: evidenceNodes.length,
    coveredStructureNodeCount: mainlineNodes.filter((node) => node.knowledgePointCount > 0).length,
    questionedStructureNodeCount: mainlineNodes.filter((node) => node.questionCount > 0).length,
    uncoveredStructureNodes: mainlineNodes
      .filter((node) => node.knowledgePointCount === 0)
      .map((node) => ({ nodeId: node.nodeId, title: node.title, role: node.role }))
      .slice(0, 8),
    uncoveredEvidenceNodes: evidenceNodes
      .filter((node) => node.questionCount === 0)
      .map((node) => ({ nodeId: node.nodeId, title: node.title, role: node.role }))
      .slice(0, 8),
    nodes
  };
}

function compactSourceKey(value) {
  return `snippet:${String(value || "").replace(/\s+/g, " ").trim().slice(0, 80)}`;
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
    "- 如果机器高分但人工拒绝数量较高，优先修质量评分器；如果需重写题 reject 率高，优先收紧入池规则。"
  ];
}
