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
        evaluatedQuestions: questionBuild.evaluatedQuestions,
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
          discardedCount: questionBuild.generationMeta.discardedCount,
          qualifiedQuestionCount: qualifiedQuestions.length
        }),
        status: "completed",
        message: ""
      })
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

  const passFromFirstRound = firstEvaluation.evaluatedQuestions.filter((question) => question.qualityAction === "pass");
  const rewriteCandidates = firstEvaluation.evaluatedQuestions.filter((question) => question.qualityAction === "rewrite");
  const rewrittenEvaluations = [];

  if (rewriteCandidates.length) markStage(meta, "auto_regenerating_questions");
  for (let index = 0; index < rewriteCandidates.length; index += 1) {
    const question = rewriteCandidates[index];
    const point = knowledgePoints.find((item) => item.id === question.knowledgePointId);
    if (!point) continue;

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
  }

  const evaluatedQuestions = [
    ...firstEvaluation.evaluatedQuestions,
    ...rewrittenEvaluations
  ];
  const qualifiedQuestions = [
    ...passFromFirstRound,
    ...rewrittenEvaluations.filter((question) => question.qualityAction === "pass")
  ];
  const discardedCount = firstEvaluation.evaluatedQuestions.filter((question) => question.qualityAction === "discard").length
    + rewrittenEvaluations.filter((question) => question.qualityAction !== "pass").length;

  return {
    evaluatedQuestions,
    qualifiedQuestions,
    judgeUnavailable: firstEvaluation.judgeUnavailable,
    generationMeta: {
      totalGenerated: generatedQuestions.length + rewrittenEvaluations.length,
      rewrittenCount: rewriteCandidates.length,
      discardedCount
    }
  };
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
  evaluatedQuestions = [],
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
      questions: [],
      qualitySummary,
      generationMeta: finishMeta(meta, {
        failedStage,
        failureReason: message,
        candidateCount: extracted?.candidates?.length || 0,
        keptKnowledgePointCount: knowledgePoints.length,
        filteredKnowledgePointCount: filteredKnowledgePoints.length,
        totalGenerated: evaluatedQuestions.length,
        rewrittenCount: evaluatedQuestions.filter((question) => question.qualityAction === "rewrite").length,
        discardedCount: evaluatedQuestions.filter((question) => question.qualityAction !== "pass").length,
        qualifiedQuestionCount: 0
      }),
      status,
      message
    }),
    generationDebug: {
      knowledgePoints,
      filteredKnowledgePoints,
      evaluatedQuestions
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
