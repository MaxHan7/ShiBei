import { cleanContent } from "./cleanContent.js";
import { chunkContent } from "./chunkContent.js";
import { extractKnowledgeCandidates } from "./extractKnowledgeCandidates.js";
import { filterKnowledgePoints } from "./filterKnowledgePoints.js";
import { generateChapterSummary } from "./generateChapterSummary.js";
import { generateQuestions, targetQuestionCountDecisionForPoint, targetQuestionCountForPoint } from "./generateQuestions.js";
import { evaluateQuestions } from "./evaluateQuestions.js";
import { typeDiversityReasonForSelection } from "./practiceBlueprint.js";
import { judgeQuestionQuality } from "./judgeQuestionQuality.js";
import { createGenerationRunId, createModelUsageRecorder, summarizeModelUsage } from "./modelCost.js";
import { STATUS_TEXT } from "./types.js";

export async function generateReviewChapter(input, options = {}) {
  const onStage = typeof options.onStage === "function" ? options.onStage : null;
  const summaryGenerator = typeof options.summaryGenerator === "function" ? options.summaryGenerator : generateChapterSummary;
  const meta = createGenerationMeta();
  const modelUsageRecorder = createModelUsageRecorder({ runId: meta.generationRunId, calls: meta.modelUsage });
  const rawText = String(input.rawText || "").trim();

  if (input?.sourceType !== "text") {
    return failure({
      status: "failed_points",
      message: "当前 Demo 的出题引擎只处理已经提取好的文本。",
      input,
      meta,
      failedStage: "submitted"
    });
  }

  if (rawText.length < 80 && !input.knowledgePoints?.length) {
    return failure({
      status: "failed_points",
      message: "内容太短，暂时无法提炼出可复习知识点。请粘贴更完整的一段内容。",
      input,
      meta,
      failedStage: "generating_points"
    });
  }

  try {
    markStage(meta, "generating_points", onStage);
    const cleaned = cleanContent(rawText);
    if (cleaned.cleanedText.length < 80 && !input.knowledgePoints?.length) {
      return failure({
        status: "failed_points",
        message: "清洗后内容不足，暂时无法生成题目。",
        input,
        cleaned,
        meta,
        failedStage: "generating_points"
      });
    }

    const chunks = chunkContent(cleaned.cleanedText);
    let extracted;
    let knowledgePoints;
    let filteredKnowledgePoints = [];

    if (Array.isArray(input.knowledgePoints) && input.knowledgePoints.length) {
      extracted = {
        chapterTitle: input.sourceTitle || "重新生成的章节",
        candidates: input.knowledgePoints
      };
      knowledgePoints = input.knowledgePoints;
    } else {
      extracted = await extractKnowledgeCandidates({
        cleanedText: cleaned.cleanedText,
        chunks,
        modelUsageRecorder
      });
      const filterResult = filterKnowledgePoints(extracted.candidates, cleaned.cleanedText);
      knowledgePoints = filterResult.kept;
      filteredKnowledgePoints = filterResult.filtered;
    }
    knowledgePoints = orderKnowledgePointsBySource(knowledgePoints, cleaned.cleanedText);
    filteredKnowledgePoints = orderKnowledgePointsBySource(filteredKnowledgePoints, cleaned.cleanedText);

    if (!knowledgePoints.length) {
      return failure({
        status: "failed_points",
        message: "这段内容暂时没有提取出适合复习的知识点。",
        input,
        cleaned,
        meta,
        failedStage: "generating_points",
        extracted,
        knowledgePoints,
        filteredKnowledgePoints
      });
    }

    markStage(meta, "generating_questions", onStage);
    const questionBuild = await createQualifiedQuestions({
      knowledgePoints,
      cleanedText: cleaned.cleanedText,
      meta,
      onStage,
      modelUsageRecorder
    });
    const qualifiedQuestions = questionBuild.qualifiedQuestions;
    const uncoveredPoints = questionBuild.pointDiagnostics.filter((point) => !point.status.startsWith("covered"));
    const qualitySummary = summarizeQuality(
      questionBuild.evaluatedQuestions,
      questionBuild.judgeUnavailable,
      qualifiedQuestions,
      questionBuild.pointDiagnostics
    );

    if (!qualifiedQuestions.length) {
      return failure({
        status: "failed_no_qualified_questions",
        message: "生成失败。系统已经提取到知识点，但暂时没有生成适合复习的题目。你可以手动重新生成一次。",
        input,
        cleaned,
        meta,
        failedStage: "quality_checking",
        extracted,
        knowledgePoints,
        filteredKnowledgePoints,
        questions: qualifiedQuestions.map(toClientQuestion),
        evaluatedQuestions: questionBuild.evaluatedQuestions,
        pointDiagnostics: questionBuild.pointDiagnostics,
        generationErrors: questionBuild.generationErrors,
        qualitySummary
      });
    }

    const coreSummary = await generateCoreSummarySafely({
      summaryGenerator,
      cleanedText: cleaned.cleanedText,
      title: extracted.chapterTitle,
      meta,
      modelUsageRecorder
    });
    markStage(meta, "completed");
    return {
      status: "completed",
      displayStatusText: STATUS_TEXT.completed,
      chapter: buildChapter({
        input,
        rawText,
        cleaned,
        title: extracted.chapterTitle,
        knowledgePoints,
        filteredKnowledgePoints,
        questions: qualifiedQuestions.map(toClientQuestion),
        coreSummary,
        qualitySummary,
        generationMeta: finishMeta(meta, {
          articleStructureNodeCount: 0,
          chunkCount: chunks.length,
          candidateCount: extracted.candidates.length,
          keptKnowledgePointCount: knowledgePoints.length,
          filteredKnowledgePointCount: filteredKnowledgePoints.length,
          totalGenerated: questionBuild.generationMeta.totalGenerated,
          rewrittenCount: questionBuild.generationMeta.rewrittenCount,
          supplementCount: questionBuild.generationMeta.supplementCount,
          generationErrorCount: questionBuild.generationMeta.generationErrorCount,
          discardedCount: questionBuild.generationMeta.discardedCount,
          qualifiedQuestionCount: qualifiedQuestions.length,
          lowConfidenceQuestionCount: qualifiedQuestions.filter((question) => question.confidenceLevel === "low").length,
          uncoveredPointCount: uncoveredPoints.length
        }),
        status: "completed",
        message: ""
      }),
      generationDebug: {
        articleStructureMap: null,
        knowledgePoints,
        filteredKnowledgePoints,
        evaluatedQuestions: questionBuild.evaluatedQuestions,
        pointDiagnostics: questionBuild.pointDiagnostics,
        generationErrors: questionBuild.generationErrors
      }
    };
  } catch (error) {
    return failure({
      status: "failed_questions",
      message: error instanceof Error ? error.message : "题目生成失败，请稍后重试。",
      input,
      meta,
      failedStage: meta.currentStage || "generating_questions"
    });
  }
}

export async function generateCoreSummarySafely({ summaryGenerator, cleanedText, title, meta, modelUsageRecorder = null }) {
  try {
    return await summaryGenerator({ cleanedText, title, modelUsageRecorder });
  } catch (error) {
    if (meta && typeof meta === "object") {
      meta.coreSummaryError = error instanceof Error ? error.message : "文章核心总结生成失败";
    }
    return "";
  }
}

async function createQualifiedQuestions({ knowledgePoints, cleanedText, meta, onStage, modelUsageRecorder = null }) {
  const generatedQuestions = withStableIds(await generateQuestions({
    knowledgePoints,
    stage: "questions_initial",
    modelUsageRecorder
  }), "q");
  markStage(meta, "quality_checking", onStage);
  const firstEvaluation = await evaluateWithJudge({
    questions: generatedQuestions,
    knowledgePoints,
    cleanedText,
    stage: "judge_initial",
    modelUsageRecorder
  });

  const rewriteCandidates = firstEvaluation.evaluatedQuestions.filter((question) => question.qualityAction === "rewrite");
  const rewrittenEvaluations = [];
  const generationErrors = [];

  if (rewriteCandidates.length) markStage(meta, "auto_regenerating_questions", onStage);
  for (let index = 0; index < rewriteCandidates.length; index += 1) {
    const question = rewriteCandidates[index];
    const point = knowledgePoints.find((item) => item.id === question.knowledgePointId);
    if (!point) continue;

    try {
      const rewritten = await generateQuestions({
        knowledgePoints: [point],
        rewrite: true,
        rewriteContext: question.qualityIssues.join(", "),
        stage: "question_rewrite",
        modelUsageRecorder
      });
      const rewrittenWithId = withStableIds(rewritten, `${question.id}-rewrite-${index + 1}`);
      const rewriteEvaluation = await evaluateWithJudge({
        questions: rewrittenWithId,
        knowledgePoints,
        cleanedText,
        stage: "judge_rewrite",
        modelUsageRecorder
      });
      rewrittenEvaluations.push(...rewriteEvaluation.evaluatedQuestions);
      firstEvaluation.judgeUnavailable ||= rewriteEvaluation.judgeUnavailable;
    } catch (error) {
      generationErrors.push({
        stage: "rewrite_question",
        pointId: point.id,
        questionId: question.id,
        message: error instanceof Error ? error.message : "题目重写失败"
      });
    }
  }

  const evaluatedQuestions = [
    ...firstEvaluation.evaluatedQuestions,
    ...rewrittenEvaluations
  ];
  const qualifiedQuestions = orderQuestionsBySource(
    selectQualifiedQuestionsByPoint(knowledgePoints, evaluatedQuestions),
    knowledgePoints
  );
  const discardedCount = evaluatedQuestions.filter((question) => !isReviewableQuestion(question)).length;

  return {
    evaluatedQuestions,
    qualifiedQuestions,
    pointDiagnostics: buildPointDiagnostics(knowledgePoints, evaluatedQuestions, qualifiedQuestions),
    generationErrors,
    judgeUnavailable: firstEvaluation.judgeUnavailable,
    generationMeta: {
      totalGenerated: generatedQuestions.length + rewrittenEvaluations.length,
      rewrittenCount: rewriteCandidates.length,
      supplementCount: 0,
      generationErrorCount: generationErrors.length,
      discardedCount
    }
  };
}

export function selectQualifiedQuestionsByPoint(knowledgePoints, evaluatedQuestions) {
  const selected = [];
  for (const point of knowledgePoints) {
    const targetCount = targetQuestionCountForPoint(point);
    const passed = evaluatedQuestions
      .filter((question) => question.knowledgePointId === point.id && question.qualityAction === "pass" && isReviewableQuestion(question))
      .sort(compareQuestionQuality);
    const rewritten = evaluatedQuestions
      .filter((question) => question.knowledgePointId === point.id && question.qualityAction === "rewrite" && isReviewableQuestion(question))
      .sort(compareQuestionQuality);
    const chosen = annotateSelectionDiagnostics(selectDiverseQuestions({
      passed: dedupeSimilarQuestions(passed),
      rewritten: dedupeSimilarQuestions(rewritten),
      targetCount
    }));
    selected.push(...chosen);
  }
  return selected;
}

function selectDiverseQuestions({ passed, rewritten, targetCount }) {
  const selected = [];
  addDiverseQuestions({
    selected,
    candidates: passed,
    targetCount,
    mark: (question) => markConfidence(
      question,
      confidenceLevelForQuestion(question),
      confidenceLevelForQuestion(question) === "low" ? "quality_pass_low_confidence" : "quality_pass"
    )
  });
  addDiverseQuestions({
    selected,
    candidates: rewritten,
    targetCount,
    mark: (question) => markConfidence(question, "low", "best_effort_quality_fallback")
  });
  return selected;
}

function addDiverseQuestions({ selected, candidates, targetCount, mark }) {
  const phases = [
    (question) => question.blueprintItemId && !selected.some((item) => item.blueprintItemId === question.blueprintItemId),
    (question) => question.memoryAngle && !selected.some((item) => item.memoryAngle === question.memoryAngle),
    (question) => !selected.some((item) => item.type === question.type),
    () => true
  ];
  for (const phase of phases) {
    for (const question of candidates) {
      if (selected.length >= targetCount) break;
      if (!phase(question)) continue;
      if (!canAddQuestionToSelection(selected, question)) continue;
      selected.push(mark(question));
    }
  }
}

function canAddQuestionToSelection(selected, question) {
  if (selected.some((item) => item.id === question.id)) return false;
  if (selected.some((item) => overlapRatio(compactText(item.stem), compactText(question.stem)) > 0.72)) return false;
  if (selected.some((item) => isSamePracticeJudgment(item, question))) return false;
  if (question.memoryAngle && selected.some((item) => item.memoryAngle === question.memoryAngle
    && overlapRatio(compactText(item.correctUnderstanding), compactText(question.correctUnderstanding)) > 0.5)) return false;
  if (question.memoryAngle && question.sourceBlockId && selected.some((item) => item.memoryAngle === question.memoryAngle
    && item.sourceBlockId === question.sourceBlockId)) return false;
  return true;
}

function isSamePracticeJudgment(a = {}, b = {}) {
  const understandingOverlap = overlapRatio(compactText(a.correctUnderstanding), compactText(b.correctUnderstanding));
  if (understandingOverlap > 0.84) return true;
  if (understandingOverlap <= 0.62) return false;
  const sameBlueprint = a.blueprintItemId && b.blueprintItemId && a.blueprintItemId === b.blueprintItemId;
  const sameAngle = a.memoryAngle && b.memoryAngle && a.memoryAngle === b.memoryAngle;
  const sameSource = a.sourceBlockId && b.sourceBlockId && a.sourceBlockId === b.sourceBlockId;
  const sameType = a.type && b.type && a.type === b.type;
  return Boolean(sameBlueprint || sameAngle || (sameSource && sameType));
}

function annotateSelectionDiagnostics(selected) {
  const typeDiversityReason = typeDiversityReasonForSelection(selected);
  const practiceProgressionScore = scorePracticeProgression(selected);
  return selected.map((question) => ({
    ...question,
    typeDiversityReason: question.typeDiversityReason || typeDiversityReason,
    practiceProgressionScore: question.practiceProgressionScore ?? practiceProgressionScore,
    practiceDuplicateRiskScore: Math.max(
      Number(question.practiceDuplicateRiskScore || 1),
      scoreDuplicatePracticeRisk(question, selected)
    ),
    evidenceLearningValueScore: adjustedEvidenceLearningValue(question, selected),
    sourceReuseLearningReason: question.sourceReuseLearningReason || sourceReuseLearningReason(question, selected),
    pedagogyDiagnostics: {
      ...(question.pedagogyDiagnostics || {}),
      selection: {
        practiceProgressionScore,
        practiceDuplicateRiskScore: scoreDuplicatePracticeRisk(question, selected),
        sourceReuseLearningReason: sourceReuseLearningReason(question, selected),
        selectedMemoryAngles: [...new Set(selected.map((item) => item.memoryAngle).filter(Boolean))],
        selectedSourceBlockIds: [...new Set(selected.map((item) => item.sourceBlockId).filter(Boolean))]
      }
    }
  }));
}

function scorePracticeProgression(selected = []) {
  const angles = new Set(selected.map((question) => question.memoryAngle).filter(Boolean));
  if (selected.length >= 3 && angles.size >= 3) return 5;
  if (selected.length >= 2 && angles.size >= 2) return 4;
  if (selected.length <= 1) return 3;
  return 2;
}

function scoreDuplicatePracticeRisk(question, selected = []) {
  const peers = selected.filter((item) => item.id !== question.id);
  if (!peers.length) return 1;
  const stem = compactText(question.stem);
  const understanding = compactText(question.correctUnderstanding);
  const hasHighTextOverlap = peers.some((item) => (
    overlapRatio(compactText(item.stem), stem) > 0.68
    || overlapRatio(compactText(item.correctUnderstanding), understanding) > 0.62
  ));
  if (hasHighTextOverlap) return 5;
  const sameAngleSameSource = peers.some((item) => (
    item.memoryAngle && item.memoryAngle === question.memoryAngle
    && item.sourceBlockId && item.sourceBlockId === question.sourceBlockId
  ));
  if (sameAngleSameSource) return 4;
  const sameSourceCount = selected.filter((item) => item.sourceBlockId && item.sourceBlockId === question.sourceBlockId).length;
  if (sameSourceCount >= 3) return 3;
  return 1;
}

function adjustedEvidenceLearningValue(question, selected = []) {
  const base = Number(question.evidenceLearningValueScore || 3);
  const sameSourceCount = selected.filter((item) => item.sourceBlockId && item.sourceBlockId === question.sourceBlockId).length;
  const adjustment = sameSourceCount >= 3 ? -1 : sameSourceCount === 2 ? -0.4 : 0;
  return Math.max(1, Math.min(5, Math.round((base + adjustment) * 10) / 10));
}

function sourceReuseLearningReason(question, selected = []) {
  if (!question.sourceBlockId) return "";
  const sameSource = selected.filter((item) => item.sourceBlockId === question.sourceBlockId);
  if (sameSource.length <= 1) return "";
  const sameAngle = sameSource.some((item) => item.id !== question.id && item.memoryAngle === question.memoryAngle);
  if (sameAngle) return "same_angle_reuses_source_block";
  if (sameSource.length >= selected.length && selected.length >= 3) return "same_point_all_questions_share_one_source_block";
  return "source_block_reused_for_different_cognitive_actions";
}

function markConfidence(question, confidenceLevel, retainedBy = null) {
  return {
    ...question,
    confidenceLevel,
    retainedBy: retainedBy || (confidenceLevel === "low" ? "best_effort_quality_fallback" : "quality_pass")
  };
}

function confidenceLevelForQuestion(question) {
  const issues = new Set(question.qualityIssues || []);
  if (question.confidenceTier === "high_confidence") return "high";
  if (question.confidenceTier === "review_warning") return "high";
  if (question.confidenceTier === "needs_rewrite") return "low";
  if (question.confidenceTier === "should_block") return "low";
  if ((question.blockingReasons || []).length) return "low";
  if (issues.has("question_type_mismatch") && Number(question.cognitiveActionFitScore || 0) < 3) return "low";
  return "high";
}

function compareQuestionQuality(a, b) {
  const bDuplicatePenalty = Number(b.practiceDuplicateRiskScore || 1) * 0.08;
  const aDuplicatePenalty = Number(a.practiceDuplicateRiskScore || 1) * 0.08;
  const bScore = (b.qualityScore?.average || 0)
    + (Number(b.memoryAngleFitScore || 0) * 0.08)
    + (Number(b.blueprintAlignmentScore || 0) * 0.08)
    + (Number(b.cognitiveActionFitScore || 0) * 0.1)
    + (Number(b.evidenceLearningValueScore || 0) * 0.04)
    - bDuplicatePenalty;
  const aScore = (a.qualityScore?.average || 0)
    + (Number(a.memoryAngleFitScore || 0) * 0.08)
    + (Number(a.blueprintAlignmentScore || 0) * 0.08)
    + (Number(a.cognitiveActionFitScore || 0) * 0.1)
    + (Number(a.evidenceLearningValueScore || 0) * 0.04)
    - aDuplicatePenalty;
  return bScore - aScore;
}

function isReviewableQuestion(question) {
  if (!question || question.qualityAction === "discard") return false;
  if (question.confidenceTier === "should_block") return false;
  if ((question.blockingReasons || []).length) return false;
  const issues = new Set(question.qualityIssues || []);
  const blockingIssues = [
    "missing_knowledge_point",
    "missing_source_snippet",
    "missing_options",
    "source_snippet_not_found",
    "source_snippet_missing",
    "source_snippet_missing_source",
    "non_binary_question_requires_four_options",
    "true_false_requires_two_options"
  ];
  if (blockingIssues.some((issue) => issues.has(issue))) return false;
  if (!question.knowledgePointId || !question.sourceSnippet || !question.correctOptionId) return false;
  if (!Array.isArray(question.options) || !question.options.length) return false;
  const requiredOptionCount = question.type === "true_false" ? 2 : 4;
  if (question.options.length !== requiredOptionCount) return false;
  if (!question.options.some((option) => option.id === question.correctOptionId)) return false;
  if ((question.qualityScore?.sourceSupport || 0) <= 2) return false;
  if ((question.qualityScore?.answerUniqueness || 0) < 4) return false;
  return true;
}

function dedupeSimilarQuestions(questions) {
  const selected = [];
  for (const question of questions) {
    const stem = compactText(question.stem);
    if (selected.some((item) => overlapRatio(compactText(item.stem), stem) > 0.72)) continue;
    selected.push(question);
  }
  return selected;
}

function buildPointDiagnostics(knowledgePoints, evaluatedQuestions, selectedQuestions = []) {
  return knowledgePoints.map((point) => {
    const related = evaluatedQuestions.filter((question) => question.knowledgePointId === point.id);
    const selected = selectedQuestions.filter((question) => question.knowledgePointId === point.id);
    const targetDecision = targetQuestionCountDecisionForPoint(point);
    const expectedMemoryAngles = expectedMemoryAnglesForPoint(point, targetDecision.count);
    const coveredMemoryAngles = [...new Set(selected.map((question) => question.memoryAngle).filter(Boolean))];
    const missingMemoryAngles = expectedMemoryAngles.filter((angle) => !coveredMemoryAngles.includes(angle));
    const questionCoverageRate = targetDecision.count
      ? Math.round((Math.min(selected.length, targetDecision.count) / targetDecision.count) * 1000) / 10
      : 0;
    const memoryAngleCoverageRate = expectedMemoryAngles.length
      ? Math.round(((expectedMemoryAngles.length - missingMemoryAngles.length) / expectedMemoryAngles.length) * 1000) / 10
      : 0;
    const selectedIds = new Set(selected.map((question) => question.id));
    const recoverableBlockedCount = related.filter((question) => (
      !selectedIds.has(question.id) && isRecoverableQuestion(question)
    )).length;
    const dynamicCoverageStatus = dynamicCoverageStatusForPoint({
      selected,
      targetCount: targetDecision.count,
      missingMemoryAngles
    });
    return {
      pointId: point.id,
      title: point.title,
      testabilityScore: point.testabilityScore,
      structureNodeId: point.structureNodeId || "",
      roleInArticle: point.roleInArticle || point.structureRole || "",
      whyWorthReviewing: point.whyWorthReviewing || point.coverageReason || "",
      sourceEvidenceIds: Array.isArray(point.sourceEvidenceIds) ? point.sourceEvidenceIds : [],
      claimFidelityScore: point.claimFidelityScore ?? null,
      structureBindingReason: point.structureBindingReason || "",
      targetQuestionCount: targetDecision.count,
      targetQuestionCountReason: targetDecision.reason,
      targetQuestionCountFactors: targetDecision.factors,
      expectedQuestionCount: targetDecision.count,
      practiceBlueprint: point.practiceBlueprint || [],
      candidateQuestionCount: related.length,
      qualifiedQuestionCount: selected.length,
      actualQuestionCount: selected.length,
      questionCoverageRate,
      dynamicCoverageRate: questionCoverageRate,
      expectedMemoryAngles,
      coveredMemoryAngles,
      missingMemoryAngles,
      memoryAngleCoverageRate,
      recoverableBlockedCount,
      dynamicCoverageStatus,
      selectedQuestionTypes: [...new Set(selected.map((question) => question.type))],
      selectedMemoryAngles: coveredMemoryAngles,
      memoryAngleDiversityCount: coveredMemoryAngles.length,
      typeDiversityReason: typeDiversityReasonForSelection(selected),
      averageCognitiveActionFitScore: averageSelectedScore(selected, "cognitiveActionFitScore"),
      averagePracticeProgressionScore: averageSelectedScore(selected, "practiceProgressionScore"),
      averageSourceCoverageScore: averageSelectedScore(selected, "sourceCoverageScore"),
      averageClaimFidelityScore: averageSelectedScore(selected, "claimFidelityScore"),
      duplicatePracticeRiskCount: selected.filter((question) => Number(question.practiceDuplicateRiskScore || 0) >= 4).length,
      sourceReuseLearningReasons: [...new Set(selected.map((question) => question.sourceReuseLearningReason).filter(Boolean))],
      confidenceLevels: [...new Set(selected.map((question) => question.confidenceLevel))],
      confidenceTiers: [...new Set(selected.map((question) => question.confidenceTier).filter(Boolean))],
      confidenceLevel: selected[0]?.confidenceLevel || null,
      status: selected.length ? (selected.every((question) => question.confidenceLevel === "low") ? "covered_low_confidence" : "covered") : "no_reviewable_question",
      failureReasons: selected.length ? [] : [...new Set(related.flatMap((question) => [
        ...(question.qualityIssues || []),
        question.ruleQualityAction && question.ruleQualityAction !== "pass" ? `rule_${question.ruleQualityAction}` : "",
        question.judgeQualityAction && question.judgeQualityAction !== "pass" ? `judge_${question.judgeQualityAction}` : "",
        question.judgeReason ? `judge_reason:${question.judgeReason}` : ""
      ].filter(Boolean)))]
    };
  });
}

function expectedMemoryAnglesForPoint(point = {}, targetCount = 1) {
  const blueprint = Array.isArray(point.practiceBlueprint) ? point.practiceBlueprint : [];
  const fromBlueprint = blueprint.slice(0, targetCount).map((item) => item.memoryAngle).filter(Boolean);
  if (fromBlueprint.length) return [...new Set(fromBlueprint)];
  return ["core_understanding", "misconception_boundary", "scenario_application"].slice(0, Math.max(1, targetCount));
}

function dynamicCoverageStatusForPoint({ selected = [], targetCount = 1, missingMemoryAngles = [] }) {
  if (!selected.length) return "no_coverage";
  if (selected.length >= targetCount && !missingMemoryAngles.length) return "full_coverage";
  if (!missingMemoryAngles.length) return "angle_covered_count_short";
  if (selected.length >= targetCount) return "count_met_angle_gap";
  return "partial_coverage";
}

function isRecoverableQuestion(question = {}) {
  if (!question) return false;
  if (isReviewableQuestion(question)) return true;
  if (question.confidenceTier === "should_block") return false;
  const hardReasons = new Set([
    "structure_invalid",
    "answer_not_unique",
    "source_not_found",
    "source_unsupported",
    "missing_correct_answer",
    "missing_options",
    "missing_source_snippet"
  ]);
  if ((question.blockingReasons || []).some((reason) => hardReasons.has(reason))) return false;
  const issues = new Set(question.qualityIssues || []);
  const hardIssues = [
    "missing_knowledge_point",
    "missing_source_snippet",
    "missing_options",
    "source_snippet_not_found",
    "source_snippet_missing",
    "source_snippet_missing_source",
    "non_binary_question_requires_four_options",
    "true_false_requires_two_options",
    "correct_answer_not_in_options"
  ];
  if (hardIssues.some((issue) => issues.has(issue))) return false;
  if (!question.knowledgePointId || !question.correctOptionId) return false;
  if (!Array.isArray(question.options) || !question.options.length) return false;
  const requiredOptionCount = question.type === "true_false" ? 2 : 4;
  if (question.options.length !== requiredOptionCount) return false;
  if (!question.options.some((option) => option.id === question.correctOptionId)) return false;
  if ((question.qualityScore?.sourceSupport || 0) <= 2) return false;
  if ((question.qualityScore?.answerUniqueness || 0) < 4) return false;
  return question.qualityAction === "rewrite" || (question.confidenceReasons || []).length > 0;
}

function averageSelectedScore(selected, key) {
  const values = selected.map((question) => Number(question[key])).filter(Number.isFinite);
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
}

function compactText(value) {
  return String(value || "").replace(/\s+/g, "");
}

function overlapRatio(a, b) {
  if (!a || !b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let hits = 0;
  for (const char of new Set([...shorter])) {
    if (longer.includes(char)) hits += 1;
  }
  return hits / Math.max(1, new Set([...shorter]).size);
}

async function evaluateWithJudge({ questions, knowledgePoints, cleanedText, stage = "judge_initial", modelUsageRecorder = null }) {
  const judge = await judgeQuestionQuality({ questions, knowledgePoints, stage, modelUsageRecorder });
  return {
    evaluatedQuestions: evaluateQuestions({
      questions,
      knowledgePoints,
      cleanedText,
      judgeResults: judge.results
    }),
    judgeUnavailable: judge.judgeUnavailable
  };
}

function withStableIds(questions, prefix) {
  return questions.map((question, index) => ({
    ...question,
    id: `${prefix}-${index + 1}`
  }));
}

function toClientQuestion(question) {
  return {
    id: question.id,
    knowledgePointId: question.knowledgePointId,
    pointId: question.knowledgePointId,
    pointTitle: question.pointTitle,
    type: question.type,
    stem: question.stem,
    options: question.options,
    correctOptionId: question.correctOptionId,
    correct_answer: question.correctOptionId,
    explanation: question.explanation,
    shortExplanation: question.explanation,
    fullExplanation: question.correctUnderstanding,
    correct_understanding: question.correctUnderstanding,
    correctUnderstanding: question.correctUnderstanding,
    common_misconception: question.commonMisconception,
    commonMisconception: question.commonMisconception,
    pitfalls: [question.commonMisconception],
    source_snippet: question.sourceSnippet,
    sourceSnippet: question.sourceSnippet,
    sourceQuote: question.sourceSnippet,
    sourceOrder: question.sourceOrder ?? 0,
    sourceStartOffset: question.sourceStartOffset ?? null,
    sourceEndOffset: question.sourceEndOffset ?? null,
    sourceSnippetWasBackfilled: Boolean(question.sourceSnippetWasBackfilled),
    difficulty: question.difficulty,
    qualityScore: question.qualityScore,
    qualityIssues: question.qualityIssues,
    qualityAction: question.qualityAction,
    trustDiagnostics: question.trustDiagnostics,
    structureNodeId: question.structureNodeId || "",
    roleInArticle: question.roleInArticle || "",
    requiredEvidenceIds: Array.isArray(question.requiredEvidenceIds) ? question.requiredEvidenceIds : [],
    sourceEvidenceIds: Array.isArray(question.sourceEvidenceIds) ? question.sourceEvidenceIds : [],
    sourceCoverageScore: question.sourceCoverageScore ?? question.trustDiagnostics?.sourceCoverageScore ?? null,
    claimFidelityScore: question.claimFidelityScore ?? question.trustDiagnostics?.claimFidelityScore ?? null,
    learningEffectivenessScore: question.learningEffectivenessScore ?? question.cognitiveActionFitScore ?? null,
    confidenceReasons: question.confidenceReasons || [],
    blockingReasons: question.blockingReasons || [],
    sourceContextSelection: question.sourceContextSelection || null,
    sourcePrecisionScore: question.sourcePrecisionScore ?? question.trustDiagnostics?.sourcePrecisionScore ?? null,
    sourceSpecificityScore: question.sourceSpecificityScore ?? null,
    sourceMinimalityScore: question.sourceMinimalityScore ?? null,
    sourceEvidenceRole: question.sourceEvidenceRole || "",
    sourceBlockId: question.sourceBlockId || question.sourceContextSelection?.sourceBlockId || "",
    sourceEvidenceDiversityScore: question.sourceEvidenceDiversityScore ?? question.sourceContextSelection?.sourceEvidenceDiversityScore ?? null,
    sourceReuseReason: question.sourceReuseReason || question.sourceContextSelection?.sourceReuseReason || "",
    sourceOverlapGroupId: question.sourceOverlapGroupId || "",
    sourceOverlapRatio: question.sourceOverlapRatio ?? 0,
    sourceReuseCount: question.sourceReuseCount ?? 0,
    primaryBlockingReason: question.primaryBlockingReason || "",
    repairHint: question.repairHint || "",
    confidenceTier: question.confidenceTier || "",
    confidenceLevel: question.confidenceLevel || "high",
    memoryAngle: question.memoryAngle || "",
    blueprintItemId: question.blueprintItemId || "",
    blueprintGoal: question.blueprintGoal || "",
    memoryAngleFitScore: question.memoryAngleFitScore ?? null,
    blueprintAlignmentScore: question.blueprintAlignmentScore ?? null,
    pedagogyDiagnostics: question.pedagogyDiagnostics || null,
    cognitiveActionFitScore: question.cognitiveActionFitScore ?? null,
    coreRecallFitScore: question.coreRecallFitScore ?? null,
    boundaryDiscriminationFitScore: question.boundaryDiscriminationFitScore ?? null,
    scenarioTransferFitScore: question.scenarioTransferFitScore ?? null,
    practiceProgressionScore: question.practiceProgressionScore ?? null,
    practiceDuplicateRiskScore: question.practiceDuplicateRiskScore ?? null,
    evidenceLearningValueScore: question.evidenceLearningValueScore ?? null,
    reviewFrictionScore: question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? null,
    visibleReadingLoad: question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad ?? null,
    stemLength: question.stemLength ?? question.trustDiagnostics?.stemLength ?? null,
    maxOptionLength: question.maxOptionLength ?? question.trustDiagnostics?.maxOptionLength ?? null,
    reviewFrictionReasons: Array.isArray(question.reviewFrictionReasons)
      ? question.reviewFrictionReasons
      : (Array.isArray(question.trustDiagnostics?.reviewFrictionReasons) ? question.trustDiagnostics.reviewFrictionReasons : []),
    sourceReuseLearningReason: question.sourceReuseLearningReason || "",
    typeDiversityReason: question.typeDiversityReason || "",
    retainedBy: question.retainedBy || "quality_pass",
    isNew: true
  };
}

function orderKnowledgePointsBySource(points, cleanedText) {
  return (points || [])
    .map((point, index) => {
      const offsets = locateSourceQuote(cleanedText, point.sourceQuote);
      return {
        ...point,
        sourceOrder: Number.isFinite(Number(point.sourceOrder)) ? Number(point.sourceOrder) : index,
        sourceStartOffset: Number.isFinite(Number(point.sourceStartOffset)) ? Number(point.sourceStartOffset) : offsets.start,
        sourceEndOffset: Number.isFinite(Number(point.sourceEndOffset)) ? Number(point.sourceEndOffset) : offsets.end
      };
    })
    .sort(compareSourcePosition)
    .map((point, index) => ({
      ...point,
      sourceOrder: index
    }));
}

function orderQuestionsBySource(questions, knowledgePoints) {
  const pointOrder = new Map((knowledgePoints || []).map((point, index) => [point.id, {
    order: Number.isFinite(Number(point.sourceOrder)) ? Number(point.sourceOrder) : index,
    start: Number.isFinite(Number(point.sourceStartOffset)) ? Number(point.sourceStartOffset) : Number.MAX_SAFE_INTEGER,
    end: Number.isFinite(Number(point.sourceEndOffset)) ? Number(point.sourceEndOffset) : null
  }]));
  return [...(questions || [])]
    .map((question, index) => {
      const position = pointOrder.get(question.knowledgePointId) || { order: index, start: Number.MAX_SAFE_INTEGER, end: null };
      return {
        ...question,
        sourceOrder: position.order,
        sourceStartOffset: position.start === Number.MAX_SAFE_INTEGER ? null : position.start,
        sourceEndOffset: position.end
      };
    })
    .sort((a, b) => {
      const aStart = Number.isFinite(Number(a.sourceStartOffset)) ? Number(a.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
      const bStart = Number.isFinite(Number(b.sourceStartOffset)) ? Number(b.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
      if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
      if (aStart !== bStart) return aStart - bStart;
      return String(a.id).localeCompare(String(b.id));
    });
}

function compareSourcePosition(a, b) {
  const aStart = Number.isFinite(Number(a.sourceStartOffset)) ? Number(a.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
  const bStart = Number.isFinite(Number(b.sourceStartOffset)) ? Number(b.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;
  return Number(a.sourceOrder || 0) - Number(b.sourceOrder || 0);
}

function locateSourceQuote(cleanedText, sourceQuote) {
  const text = String(cleanedText || "");
  const quote = String(sourceQuote || "").trim();
  if (!text || !quote) return { start: null, end: null };

  const direct = text.indexOf(quote);
  if (direct >= 0) return { start: direct, end: direct + quote.length };

  const normalizedText = normalizeWithMap(text);
  const normalizedQuote = normalizeForSourcePosition(quote);
  if (normalizedQuote.length < 8) return { start: null, end: null };
  const normalizedIndex = normalizedText.text.indexOf(normalizedQuote);
  if (normalizedIndex >= 0) {
    const start = normalizedText.map[normalizedIndex];
    const end = normalizedText.map[normalizedIndex + normalizedQuote.length - 1] + 1;
    return { start, end };
  }

  const prefix = normalizedQuote.slice(0, Math.min(28, normalizedQuote.length));
  if (prefix.length >= 8) {
    const prefixIndex = normalizedText.text.indexOf(prefix);
    if (prefixIndex >= 0) {
      const start = normalizedText.map[prefixIndex];
      const end = normalizedText.map[prefixIndex + prefix.length - 1] + 1;
      return { start, end };
    }
  }

  return { start: null, end: null };
}

function normalizeWithMap(value) {
  const chars = [];
  const map = [];
  [...String(value || "")].forEach((char, index) => {
    const normalized = normalizeForSourcePosition(char);
    if (!normalized) return;
    chars.push(normalized);
    map.push(index);
  });
  return { text: chars.join(""), map };
}

function normalizeForSourcePosition(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[“”"「」『』《》〈〉（）()，,。.!！?？:：;；、]/g, "");
}

function summarizeQuality(evaluatedQuestions, judgeUnavailable, selectedQuestions = [], pointDiagnostics = []) {
  const passed = evaluatedQuestions.filter((question) => question.qualityAction === "pass");
  const rewritten = evaluatedQuestions.filter((question) => question.qualityAction === "rewrite");
  const discarded = evaluatedQuestions.filter((question) => question.qualityAction === "discard");
  const seriousIssueCount = evaluatedQuestions.reduce((sum, question) => sum + (question.qualityIssues?.length || 0), 0);
  const scoredQuestions = selectedQuestions.length ? selectedQuestions : passed;
  const averageScore = scoredQuestions.length
    ? Math.round((scoredQuestions.reduce((sum, question) => sum + (question.qualityScore?.average || 0), 0) / scoredQuestions.length) * 10) / 10
    : 0;
  const lowConfidenceQuestionCount = selectedQuestions.filter((question) => question.confidenceLevel === "low").length;
  const uncoveredPointCount = pointDiagnostics.filter((point) => !point.status.startsWith("covered")).length;
  const questionCoverageRate = pointDiagnostics.length
    ? Math.round(((pointDiagnostics.length - uncoveredPointCount) / pointDiagnostics.length) * 1000) / 10
    : 0;
  const retainedPerPoint = pointDiagnostics.map((point) => point.qualifiedQuestionCount || 0);
  const questionCountDistribution = countNumberValues(retainedPerPoint);
  const averageQuestionsPerPoint = retainedPerPoint.length
    ? Math.round((retainedPerPoint.reduce((sum, count) => sum + count, 0) / retainedPerPoint.length) * 10) / 10
    : 0;
  const expectedQuestionCount = pointDiagnostics.reduce((sum, point) => sum + (Number(point.expectedQuestionCount ?? point.targetQuestionCount) || 0), 0);
  const dynamicCoverageRates = pointDiagnostics
    .map((point) => Number(point.dynamicCoverageRate ?? point.questionCoverageRate))
    .filter(Number.isFinite);
  const averageDynamicCoverageRate = dynamicCoverageRates.length
    ? Math.round((dynamicCoverageRates.reduce((sum, value) => sum + value, 0) / dynamicCoverageRates.length) * 10) / 10
    : 0;
  const missingMemoryAngleFrequency = countValues(pointDiagnostics.flatMap((point) => point.missingMemoryAngles || []));
  const dynamicCoverageStatusFrequency = countValues(pointDiagnostics.map((point) => point.dynamicCoverageStatus || "unknown"));
  const recoverableBlockedCount = pointDiagnostics.reduce((sum, point) => sum + (Number(point.recoverableBlockedCount) || 0), 0);
  const questionTypeCoverage = countValues(selectedQuestions.map((question) => question.type || "unknown"));
  const memoryAngleCoverage = countValues(selectedQuestions.map((question) => question.memoryAngle || "unknown"));
  const confidenceTierCoverage = countValues(selectedQuestions.map((question) => question.confidenceTier || "unknown"));
  const sourcePrecisionScores = selectedQuestions
    .map((question) => Number(question.sourcePrecisionScore || question.trustDiagnostics?.sourcePrecisionScore))
    .filter(Number.isFinite);
  const averageSourcePrecisionScore = sourcePrecisionScores.length
    ? Math.round((sourcePrecisionScores.reduce((sum, score) => sum + score, 0) / sourcePrecisionScores.length) * 10) / 10
    : 0;
  const reviewFrictionScores = selectedQuestions
    .map((question) => Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore))
    .filter(Number.isFinite);
  const visibleReadingLoads = selectedQuestions
    .map((question) => Number(question.visibleReadingLoad ?? question.trustDiagnostics?.visibleReadingLoad))
    .filter(Number.isFinite);
  const highFrictionQuestionCount = selectedQuestions.filter((question) => (
    Number(question.reviewFrictionScore ?? question.trustDiagnostics?.reviewFrictionScore ?? 5) < 4
  )).length;

  return {
    totalGenerated: evaluatedQuestions.length,
    passed: passed.length,
    rewrite: rewritten.length,
    discarded: discarded.length,
    averageScore,
    averageQualityScore: averageScore,
    questionCoverageRate,
    retainedQuestionCount: selectedQuestions.length,
    averageQuestionsPerPoint,
    expectedQuestionCount,
    dynamicCoverageRate: expectedQuestionCount
      ? Math.round((selectedQuestions.length / expectedQuestionCount) * 1000) / 10
      : 0,
    averageDynamicCoverageRate,
    missingMemoryAngleFrequency,
    dynamicCoverageStatusFrequency,
    recoverableBlockedCount,
    questionCountDistribution,
    questionTypeCoverage,
    memoryAngleCoverage,
    confidenceTierCoverage,
    averageSourcePrecisionScore,
    averageReviewFrictionScore: reviewFrictionScores.length
      ? Math.round((reviewFrictionScores.reduce((sum, score) => sum + score, 0) / reviewFrictionScores.length) * 10) / 10
      : 0,
    averageVisibleReadingLoad: visibleReadingLoads.length
      ? Math.round((visibleReadingLoads.reduce((sum, value) => sum + value, 0) / visibleReadingLoads.length) * 10) / 10
      : 0,
    highFrictionQuestionCount,
    lowConfidenceQuestionCount,
    uncoveredPointCount,
    seriousIssueCount,
    judgeUnavailable
  };
}

function countValues(values) {
  return values.reduce((counts, value) => ({
    ...counts,
    [value]: (counts[value] || 0) + 1
  }), {});
}

function countNumberValues(values) {
  return values.reduce((counts, value) => ({
    ...counts,
    [String(value)]: (counts[String(value)] || 0) + 1
  }), {});
}

function failure({
  status,
  message,
  input = {},
  cleaned = null,
  meta,
  failedStage,
  extracted = null,
  knowledgePoints = [],
  filteredKnowledgePoints = [],
  questions = [],
  evaluatedQuestions = [],
  pointDiagnostics = [],
  generationErrors = [],
  qualitySummary = null
}) {
  markStage(meta, status);
  const rawText = String(input.rawText || "").trim();
  return {
    status,
    displayStatusText: STATUS_TEXT[status] || "生成失败",
    message,
    chapter: buildChapter({
      input,
      rawText,
      cleaned,
      title: input.sourceTitle || extracted?.chapterTitle || rawText.slice(0, 28).replace(/[。！？!?；;，,]$/, "") || "未生成章节",
      knowledgePoints,
      filteredKnowledgePoints,
      questions,
      qualitySummary,
      generationMeta: finishMeta(meta, {
        failedStage,
        failureReason: message,
        candidateCount: extracted?.candidates?.length || 0,
        keptKnowledgePointCount: knowledgePoints.length,
        filteredKnowledgePointCount: filteredKnowledgePoints.length,
        totalGenerated: evaluatedQuestions.length,
        rewrittenCount: evaluatedQuestions.filter((question) => question.qualityAction === "rewrite").length,
        supplementCount: pointDiagnostics.filter((point) => point.status === "no_qualified_question").length,
        generationErrorCount: generationErrors.length,
        discardedCount: evaluatedQuestions.filter((question) => question.qualityAction !== "pass").length,
        qualifiedQuestionCount: questions.length
      }),
      status,
      message
    }),
    generationDebug: {
      knowledgePoints,
      filteredKnowledgePoints,
      evaluatedQuestions,
      pointDiagnostics,
      generationErrors
    }
  };
}

function buildChapter({
  input,
  rawText,
  cleaned,
  title,
  knowledgePoints,
  filteredKnowledgePoints,
  questions,
  coreSummary = "",
  qualitySummary,
  generationMeta,
  status,
  message
}) {
  return {
    title,
    sourceType: "text",
    status,
    displayStatusText: STATUS_TEXT[status] || status,
    failureReason: message || "",
    source: {
      type: input.originalSourceType || "text",
      title: input.sourceTitle || title,
      url: input.sourceUrl || "",
      account: input.sourceAccount || "",
      rawText,
      cleanedText: cleaned?.cleanedText || rawText
    },
    knowledgePoints,
    filteredKnowledgePoints,
    questions,
    coreSummary,
    qualitySummary,
    generationMeta
  };
}

function createGenerationMeta() {
  const now = new Date().toISOString();
  return {
    generationRunId: createGenerationRunId(),
    startedAt: now,
    currentStage: "submitted",
    stages: [{ status: "submitted", at: now }],
    modelUsage: []
  };
}

function markStage(meta, status, onStage = null) {
  if (!meta) return;
  if (meta.currentStage === status) return;
  meta.currentStage = status;
  meta.stages.push({ status, displayStatusText: STATUS_TEXT[status] || status, at: new Date().toISOString() });
  if (onStage) onStage(status, meta);
}

function finishMeta(meta, extra = {}) {
  const modelUsage = Array.isArray(meta.modelUsage) ? meta.modelUsage : [];
  const qualifiedQuestionCount = Number(extra.qualifiedQuestionCount) || 0;
  const costSummary = summarizeModelUsage(modelUsage, { qualifiedQuestionCount });
  return {
    ...meta,
    finishedAt: new Date().toISOString(),
    ...extra,
    modelUsage,
    costSummary
  };
}
