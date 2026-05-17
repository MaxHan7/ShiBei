import { cleanContent } from "./cleanContent.js";
import { chunkContent } from "./chunkContent.js";
import { extractKnowledgeCandidates } from "./extractKnowledgeCandidates.js";
import { filterKnowledgePoints } from "./filterKnowledgePoints.js";
import { generateQuestions } from "./generateQuestions.js";
import { evaluateQuestions } from "./evaluateQuestions.js";
import { judgeQuestionQuality } from "./judgeQuestionQuality.js";
import { STATUS_TEXT } from "./types.js";

export async function generateReviewChapter(input) {
  const meta = createGenerationMeta();
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
    markStage(meta, "generating_points");
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
        chunks
      });
      const filterResult = filterKnowledgePoints(extracted.candidates, cleaned.cleanedText);
      knowledgePoints = filterResult.kept;
      filteredKnowledgePoints = filterResult.filtered;
    }

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

    markStage(meta, "generating_questions");
    const questionBuild = await createQualifiedQuestions({
      knowledgePoints,
      cleanedText: cleaned.cleanedText,
      meta
    });
    const qualifiedQuestions = questionBuild.qualifiedQuestions;
    const uncoveredPoints = questionBuild.pointDiagnostics.filter((point) => point.status !== "covered");

    if (!qualifiedQuestions.length || uncoveredPoints.length) {
      return failure({
        status: "failed_no_qualified_questions",
        message: uncoveredPoints.length
          ? `生成失败。还有 ${uncoveredPoints.length} 个知识点没有合格题目。你可以手动重新生成一次。`
          : "生成失败。系统已经提取到知识点，但暂时没有生成适合复习的题目。你可以手动重新生成一次。",
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
        qualitySummary: summarizeQuality(questionBuild.evaluatedQuestions, questionBuild.judgeUnavailable)
      });
    }

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
        qualitySummary: summarizeQuality(questionBuild.evaluatedQuestions, questionBuild.judgeUnavailable),
        generationMeta: finishMeta(meta, {
          chunkCount: chunks.length,
          candidateCount: extracted.candidates.length,
          keptKnowledgePointCount: knowledgePoints.length,
          filteredKnowledgePointCount: filteredKnowledgePoints.length,
          totalGenerated: questionBuild.generationMeta.totalGenerated,
          rewrittenCount: questionBuild.generationMeta.rewrittenCount,
          supplementCount: questionBuild.generationMeta.supplementCount,
          generationErrorCount: questionBuild.generationMeta.generationErrorCount,
          discardedCount: questionBuild.generationMeta.discardedCount,
          qualifiedQuestionCount: qualifiedQuestions.length
        }),
        status: "completed",
        message: ""
      }),
      generationDebug: {
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

async function createQualifiedQuestions({ knowledgePoints, cleanedText, meta }) {
  const generatedQuestions = withStableIds(await generateQuestions({ knowledgePoints }), "q");
  markStage(meta, "quality_checking");
  const firstEvaluation = await evaluateWithJudge({ questions: generatedQuestions, knowledgePoints, cleanedText });

  const rewriteCandidates = firstEvaluation.evaluatedQuestions.filter((question) => question.qualityAction === "rewrite");
  const rewrittenEvaluations = [];
  const supplementEvaluations = [];
  const generationErrors = [];

  if (rewriteCandidates.length) markStage(meta, "auto_regenerating_questions");
  for (let index = 0; index < rewriteCandidates.length; index += 1) {
    const question = rewriteCandidates[index];
    const point = knowledgePoints.find((item) => item.id === question.knowledgePointId);
    if (!point) continue;

    try {
      const rewritten = await generateQuestions({
        knowledgePoints: [point],
        rewrite: true,
        rewriteContext: question.qualityIssues.join(", ")
      });
      const rewrittenWithId = withStableIds(rewritten, `${question.id}-rewrite-${index + 1}`);
      const rewriteEvaluation = await evaluateWithJudge({
        questions: rewrittenWithId,
        knowledgePoints,
        cleanedText
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

  const beforeSupplement = [
    ...firstEvaluation.evaluatedQuestions,
    ...rewrittenEvaluations
  ];
  const pointsNeedingSupplement = knowledgePoints.filter((point) => shouldSupplementPoint(point, beforeSupplement));
  for (let index = 0; index < pointsNeedingSupplement.length; index += 1) {
    const point = pointsNeedingSupplement[index];
    try {
      const rewritten = await generateQuestions({
        knowledgePoints: [point],
        rewrite: true,
        rewriteContext: `no_qualified_question_for_point; ${summarizePointIssues(point.id, beforeSupplement)}`
      });
      const rewrittenWithId = withStableIds(rewritten, `supplement-${point.id}-${index + 1}`);
      const supplementEvaluation = await evaluateWithJudge({
        questions: rewrittenWithId,
        knowledgePoints,
        cleanedText
      });
      supplementEvaluations.push(...supplementEvaluation.evaluatedQuestions);
      firstEvaluation.judgeUnavailable ||= supplementEvaluation.judgeUnavailable;
    } catch (error) {
      generationErrors.push({
        stage: "supplement_question",
        pointId: point.id,
        questionId: "",
        message: error instanceof Error ? error.message : "题目补充生成失败"
      });
    }
  }

  const evaluatedQuestions = [
    ...firstEvaluation.evaluatedQuestions,
    ...rewrittenEvaluations,
    ...supplementEvaluations
  ];
  const qualifiedQuestions = selectQualifiedQuestionsByPoint(knowledgePoints, evaluatedQuestions);
  const discardedCount = evaluatedQuestions.filter((question) => question.qualityAction !== "pass").length;

  return {
    evaluatedQuestions,
    qualifiedQuestions,
    pointDiagnostics: buildPointDiagnostics(knowledgePoints, evaluatedQuestions),
    generationErrors,
    judgeUnavailable: firstEvaluation.judgeUnavailable,
    generationMeta: {
      totalGenerated: generatedQuestions.length + rewrittenEvaluations.length + supplementEvaluations.length,
      rewrittenCount: rewriteCandidates.length + pointsNeedingSupplement.length,
      supplementCount: pointsNeedingSupplement.length,
      generationErrorCount: generationErrors.length,
      discardedCount
    }
  };
}

function selectQualifiedQuestionsByPoint(knowledgePoints, evaluatedQuestions) {
  const selected = [];
  for (const point of knowledgePoints) {
    const passed = evaluatedQuestions
      .filter((question) => question.knowledgePointId === point.id && question.qualityAction === "pass")
      .sort((a, b) => (b.qualityScore?.average || 0) - (a.qualityScore?.average || 0));
    selected.push(...dedupeSimilarQuestions(passed).slice(0, maxQuestionsForPoint(point)));
  }
  return selected;
}

function maxQuestionsForPoint(point) {
  const angleCount = Array.isArray(point.questionAngles) ? point.questionAngles.length : 0;
  if ((Number(point.testabilityScore) || 0) >= 5 && angleCount >= 2) return 3;
  if ((Number(point.testabilityScore) || 0) >= 4 || ["method", "scenario", "step", "comparison", "counterexample"].includes(point.knowledgeType)) {
    return 2;
  }
  return 1;
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

function shouldSupplementPoint(point, evaluatedQuestions) {
  return !evaluatedQuestions.some((question) => (
    question.knowledgePointId === point.id && question.qualityAction === "pass"
  ));
}

function summarizePointIssues(pointId, evaluatedQuestions) {
  const issues = evaluatedQuestions
    .filter((question) => question.knowledgePointId === pointId)
    .flatMap((question) => [
      ...(question.qualityIssues || []),
      question.ruleQualityAction && question.ruleQualityAction !== "pass" ? `rule_${question.ruleQualityAction}` : "",
      question.judgeQualityAction && question.judgeQualityAction !== "pass" ? `judge_${question.judgeQualityAction}` : "",
      question.judgeReason ? `judge_reason:${question.judgeReason}` : ""
    ].filter(Boolean));
  return [...new Set(issues)].join(", ") || "no_passed_question";
}

function buildPointDiagnostics(knowledgePoints, evaluatedQuestions) {
  return knowledgePoints.map((point) => {
    const related = evaluatedQuestions.filter((question) => question.knowledgePointId === point.id);
    const passed = selectQualifiedQuestionsByPoint([point], evaluatedQuestions);
    return {
      pointId: point.id,
      title: point.title,
      testabilityScore: point.testabilityScore,
      candidateQuestionCount: related.length,
      qualifiedQuestionCount: passed.length,
      status: passed.length ? "covered" : "no_qualified_question",
      failureReasons: passed.length ? [] : [...new Set(related.flatMap((question) => [
        ...(question.qualityIssues || []),
        question.ruleQualityAction && question.ruleQualityAction !== "pass" ? `rule_${question.ruleQualityAction}` : "",
        question.judgeQualityAction && question.judgeQualityAction !== "pass" ? `judge_${question.judgeQualityAction}` : "",
        question.judgeReason ? `judge_reason:${question.judgeReason}` : ""
      ].filter(Boolean)))]
    };
  });
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

async function evaluateWithJudge({ questions, knowledgePoints, cleanedText }) {
  const judge = await judgeQuestionQuality({ questions, knowledgePoints });
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
    difficulty: question.difficulty,
    qualityScore: question.qualityScore,
    qualityIssues: question.qualityIssues,
    qualityAction: question.qualityAction,
    isNew: true
  };
}

function summarizeQuality(evaluatedQuestions, judgeUnavailable) {
  const passed = evaluatedQuestions.filter((question) => question.qualityAction === "pass");
  const rewritten = evaluatedQuestions.filter((question) => question.qualityAction === "rewrite");
  const discarded = evaluatedQuestions.filter((question) => question.qualityAction === "discard");
  const seriousIssueCount = evaluatedQuestions.reduce((sum, question) => sum + (question.qualityIssues?.length || 0), 0);
  const averageScore = passed.length
    ? Math.round((passed.reduce((sum, question) => sum + question.qualityScore.average, 0) / passed.length) * 10) / 10
    : 0;

  return {
    totalGenerated: evaluatedQuestions.length,
    passed: passed.length,
    rewrite: rewritten.length,
    discarded: discarded.length,
    averageScore,
    seriousIssueCount,
    judgeUnavailable
  };
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
      title: input.sourceTitle || extracted?.chapterTitle || "未生成章节",
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
    qualitySummary,
    generationMeta
  };
}

function createGenerationMeta() {
  return {
    startedAt: new Date().toISOString(),
    currentStage: "submitted",
    stages: [{ status: "submitted", at: new Date().toISOString() }]
  };
}

function markStage(meta, status) {
  if (!meta) return;
  if (meta.currentStage === status) return;
  meta.currentStage = status;
  meta.stages.push({ status, displayStatusText: STATUS_TEXT[status] || status, at: new Date().toISOString() });
}

function finishMeta(meta, extra = {}) {
  return {
    ...meta,
    finishedAt: new Date().toISOString(),
    ...extra
  };
}
