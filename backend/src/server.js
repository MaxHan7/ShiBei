import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReviewChapter } from "./generation/index.js";
import { extractSourceContent } from "./sources/extractSourceContent.js";
import { STATUS_TEXT } from "./generation/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");
const demoRoot = resolve(projectRoot, "demo");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);
const memory = {
  chapters: [],
  notifications: []
};
const generationRuns = new Map();
const INITIAL_MASTERY_SCORE = 50;
const REINFORCEMENT_GAP = 3;
const GENERATION_JOB_TIMEOUT_MS = readPositiveInt(process.env.GENERATION_JOB_TIMEOUT_MS, 360_000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleGenerate(req, res) {
  const body = await readBody(req);
  try {
    const result = body.regenerateFromChapter
      ? await regenerateFromChapter(body.regenerateFromChapter)
      : await generateFromInput(body);
    sendJson(res, result.status === "completed" ? 200 : 422, result);
  } catch (error) {
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const statusCode = message.includes("OPENAI_API_KEY") || message.includes("DEEPSEEK_API_KEY") ? 500 : 422;
    sendJson(res, statusCode, failedSourceResult({ status, message, body }));
  }
}

async function handleCreateChapter(req, res) {
  const body = await readBody(req);
  const submittedChapter = upsertMemoryChapter(createSubmittedChapter(body));
  sendJson(res, 202, {
    status: submittedChapter.status,
    chapter: submittedChapter,
    notification: null,
    message: "已提交，正在生成。"
  });
  void runChapterGeneration(submittedChapter.id, body);
}

async function runChapterGeneration(chapterId, body) {
  const runId = createId("generation");
  generationRuns.set(chapterId, runId);
  const updateStage = (status) => updateMemoryChapterStage(chapterId, status, runId);
  try {
    updateStage("extracting_content");
    const result = await withTimeout(
      generateFromInput(body, { onStage: updateStage }),
      GENERATION_JOB_TIMEOUT_MS,
      () => generationTimeoutError()
    );
    if (!isCurrentGenerationRun(chapterId, runId)) return;
    const existing = memory.chapters.find((chapter) => chapter.id === chapterId);
    const chapter = upsertMemoryChapter({
      ...(result.chapter || failedSourceResult({
      status: result.status,
      message: result.message || "生成失败",
      body
    }).chapter),
      id: chapterId,
      createdAt: existing?.createdAt
    });
    createMemoryNotification(chapter);
  } catch (error) {
    if (!isCurrentGenerationRun(chapterId, runId)) return;
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const failed = failedSourceResult({ status, message, body });
    const existing = memory.chapters.find((chapter) => chapter.id === chapterId);
    const chapter = upsertMemoryChapter({
      ...failed.chapter,
      id: chapterId,
      createdAt: existing?.createdAt
    });
    createMemoryNotification(chapter);
  } finally {
    if (isCurrentGenerationRun(chapterId, runId)) {
      generationRuns.delete(chapterId);
    }
  }
}

function createSubmittedChapter(body = {}) {
  const now = new Date().toISOString();
  const sourceType = body.sourceType || "text";
  const title = body.sourceTitle
    || body.sourceUrl
    || body.rawText?.slice?.(0, 24)
    || "未命名章节";
  const rawInput = body.rawText || body.sourceUrl || "";
  return {
    id: createId("chapter"),
    title,
    status: "submitted",
    displayStatusText: STATUS_TEXT.submitted,
    failureReason: "",
    source: {
      type: sourceType,
      title,
      url: body.sourceUrl || "",
      account: body.sourceAccount || "",
      accountOrDomain: body.sourceAccount || "",
      rawInput,
      rawText: rawInput,
      extractedText: "",
      cleanedText: ""
    },
    sourceType,
    sourceText: rawInput,
    knowledgePoints: [],
    filteredKnowledgePoints: [],
    questions: [],
    qualitySummary: null,
    generationMeta: {
      currentStage: "submitted",
      stages: [{ status: "submitted", displayStatusText: STATUS_TEXT.submitted, at: now }]
    },
    reviewSession: null,
    masteredPoints: 0,
    removedQuestionIds: [],
    downgradedQuestionIds: [],
    feedbackRecords: [],
    dismissedFromNotifications: false,
    createdAt: now,
    updatedAt: now
  };
}

async function handleRegenerateChapter(req, res, chapterId) {
  const existing = memory.chapters.find((chapter) => chapter.id === chapterId);
  if (!existing) {
    sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
    return;
  }
  const submittedChapter = upsertMemoryChapter(createRegeneratingChapter(existing));
  sendJson(res, 202, {
    status: submittedChapter.status,
    chapter: submittedChapter,
    notification: null,
    message: "已提交，正在重新生成。"
  });
  void runChapterRegeneration(existing);
}

async function runChapterRegeneration(existing) {
  const runId = createId("generation");
  generationRuns.set(existing.id, runId);
  const updateStage = (status) => updateMemoryChapterStage(existing.id, status, runId);
  try {
    updateStage("generating_points");
    const result = await withTimeout(
      regenerateFromChapter(existing, { onStage: updateStage }),
      GENERATION_JOB_TIMEOUT_MS,
      () => generationTimeoutError()
    );
    if (!isCurrentGenerationRun(existing.id, runId)) return;
    const chapter = upsertMemoryChapter({
      ...(result.chapter || {}),
      id: existing.id,
      createdAt: existing.createdAt
    });
    createMemoryNotification(chapter);
  } catch (error) {
    if (!isCurrentGenerationRun(existing.id, runId)) return;
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "重新生成失败，请稍后重试。";
    const failed = failedSourceResult({ status, message, body: existing });
    const chapter = upsertMemoryChapter({
      ...failed.chapter,
      id: existing.id,
      createdAt: existing.createdAt
    });
    createMemoryNotification(chapter);
  } finally {
    if (isCurrentGenerationRun(existing.id, runId)) {
      generationRuns.delete(existing.id);
    }
  }
}

function createRegeneratingChapter(existing) {
  return {
    ...existing,
    status: "submitted",
    displayStatusText: STATUS_TEXT.submitted,
    failureReason: "",
    reviewSession: null,
    generationMeta: {
      ...(existing.generationMeta || {}),
      currentStage: "submitted",
      stages: [
        ...((existing.generationMeta?.stages || []).slice(-8)),
        { status: "submitted", displayStatusText: STATUS_TEXT.submitted, at: new Date().toISOString() }
      ]
    },
    updatedAt: new Date().toISOString()
  };
}

async function generateFromInput(body, options = {}) {
  const source = await extractSourceContent({
    sourceType: body.sourceType,
    rawText: body.rawText,
    sourceTitle: body.sourceTitle,
    sourceUrl: body.sourceUrl,
    sourceAccount: body.sourceAccount
  });
  options.onStage?.("generating_points");
  return generateReviewChapter({
    sourceType: "text",
    rawText: source.rawText,
    sourceTitle: source.sourceTitle,
    sourceUrl: source.sourceUrl,
    sourceAccount: source.sourceAccount,
    originalSourceType: source.sourceType
  }, options);
}

async function regenerateFromChapter(chapter, options = {}) {
  return generateReviewChapter({
    sourceType: "text",
    rawText: chapter.source?.cleanedText || chapter.source?.rawText || chapter.sourceText || "",
    sourceTitle: chapter.source?.title || chapter.title,
    sourceUrl: chapter.source?.url || "",
    sourceAccount: chapter.source?.account || "",
    originalSourceType: chapter.source?.type || chapter.sourceType || "text",
    knowledgePoints: chapter.knowledgePoints || []
  }, options);
}

function failedSourceResult({ status, message, body }) {
  return {
    status,
    displayStatusText: STATUS_TEXT[status] || "题目生成失败",
    errorCode: status,
    message,
    chapter: {
      title: body?.sourceTitle || body?.sourceUrl || body?.rawText?.slice?.(0, 24) || "未生成章节",
      status,
      displayStatusText: STATUS_TEXT[status] || "题目生成失败",
      failureReason: message,
      source: {
        type: body?.sourceType || "text",
        title: body?.sourceTitle || body?.sourceUrl || "未生成章节",
        url: body?.sourceUrl || "",
        account: body?.sourceAccount || "",
        rawText: body?.rawText || body?.sourceUrl || "",
        cleanedText: body?.rawText || ""
      },
      knowledgePoints: [],
      filteredKnowledgePoints: [],
      questions: [],
      qualitySummary: null,
      generationMeta: {
        currentStage: status,
        failedStage: status,
        failureReason: message,
        stages: [{ status, displayStatusText: STATUS_TEXT[status] || status, at: new Date().toISOString() }]
      }
    }
  };
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function generationTimeoutError() {
  const error = new Error("生成超时，请稍后重试。");
  error.code = "failed_questions";
  error.status = "failed_questions";
  return error;
}

function withTimeout(promise, timeoutMs, makeError) {
  let timeout;
  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(makeError()), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

function isCurrentGenerationRun(chapterId, runId) {
  return generationRuns.get(chapterId) === runId;
}

function updateMemoryChapterStage(chapterId, status, runId) {
  if (!isCurrentGenerationRun(chapterId, runId)) return;
  const chapter = memory.chapters.find((item) => item.id === chapterId);
  if (!chapter) return;

  const now = new Date().toISOString();
  const displayStatusText = STATUS_TEXT[status] || status;
  const meta = chapter.generationMeta || { stages: [] };
  const stages = Array.isArray(meta.stages) ? meta.stages : [];
  const shouldAppend = meta.currentStage !== status || stages.length === 0;

  chapter.status = status;
  chapter.displayStatusText = displayStatusText;
  chapter.generationMeta = {
    ...meta,
    currentStage: status,
    stages: shouldAppend
      ? [...stages, { status, displayStatusText, at: now }]
      : stages
  };
  chapter.updatedAt = now;
}

function normalizeChapterSource(chapter, chapterId) {
  const source = chapter.source || {};
  const type = source.type || chapter.sourceType || "text";
  const rawInput = source.rawInput || source.rawText || chapter.rawInput || chapter.sourceText || "";
  const extractedText = source.extractedText || source.cleanedText || chapter.extractedText || rawInput;
  const accountOrDomain = source.accountOrDomain || source.account || chapter.sourceAccount || chapter.source_account_or_platform || "";
  return {
    type,
    title: source.title || chapter.sourceTitle || chapter.title || (type === "text" ? "粘贴文字" : "未命名来源"),
    url: source.url || chapter.sourceUrl || "",
    accountOrDomain,
    rawInput,
    extractedText,
    chapterId,
    account: accountOrDomain,
    rawText: rawInput,
    cleanedText: extractedText
  };
}

function normalizeKnowledgePoints(points, chapterId) {
  const now = new Date().toISOString();
  return points.map((point, index) => {
    const id = point.id || `kp-${index + 1}`;
    const sourceSnippet = point.sourceSnippet || point.source_snippet || point.sourceQuote || "";
    return {
      id,
      chapterId: point.chapterId || point.chapter_id || chapterId,
      title: point.title || `知识点 ${index + 1}`,
      summary: point.summary || point.keyClaim || "",
      keyClaim: point.keyClaim || point.summary || "",
      knowledgeType: point.knowledgeType || point.knowledge_type || "concept",
      sourceSnippet,
      sourceQuote: point.sourceQuote || sourceSnippet,
      testabilityScore: Number.isFinite(point.testabilityScore) ? point.testabilityScore : (point.testability_score || 3),
      masteryScore: Number.isFinite(point.masteryScore) ? point.masteryScore : INITIAL_MASTERY_SCORE,
      answeredCount: Number.isFinite(point.answeredCount) ? point.answeredCount : 0,
      lastReviewedAt: point.lastReviewedAt || null,
      lastDecayAppliedAt: point.lastDecayAppliedAt || null,
      createdAt: point.createdAt || now,
      updatedAt: point.updatedAt || now
    };
  });
}

function normalizeQuestions(questions, chapterId, knowledgePoints = []) {
  const now = new Date().toISOString();
  return questions.map((question, index) => {
    const knowledgePointId = question.knowledgePointId || question.pointId || question.knowledge_point_id || "";
    const point = knowledgePoints.find((item) => item.id === knowledgePointId);
    const sourceSnippet = question.sourceSnippet || question.source_snippet || question.sourceQuote || "";
    return {
      id: question.id || `q-${index + 1}`,
      chapterId: question.chapterId || question.chapter_id || chapterId,
      knowledgePointId,
      pointId: knowledgePointId,
      pointTitle: question.pointTitle || point?.title || "",
      type: question.type || question.questionType || question.question_type || "multiple_choice",
      stem: question.stem || "",
      options: Array.isArray(question.options) ? question.options : [],
      correctOptionId: question.correctOptionId || question.correct_answer || question.correctAnswer || "",
      correctUnderstanding: question.correctUnderstanding || question.correct_understanding || question.fullExplanation || "",
      commonMisconception: question.commonMisconception || question.common_misconception || "",
      sourceSnippet,
      sourceQuote: question.sourceQuote || sourceSnippet,
      difficulty: question.difficulty || "medium",
      qualityScore: question.qualityScore || null,
      qualityIssues: question.qualityIssues || [],
      shortExplanation: question.shortExplanation || question.explanation || "",
      fullExplanation: question.fullExplanation || question.correctUnderstanding || question.correct_understanding || "",
      pitfalls: Array.isArray(question.pitfalls) ? question.pitfalls : [],
      isNew: Boolean(question.isNew),
      createdAt: question.createdAt || now,
      updatedAt: question.updatedAt || now
    };
  });
}

function ensureChapterRecord(chapter) {
  const now = new Date().toISOString();
  const id = chapter.id || createId("chapter");
  const source = normalizeChapterSource(chapter, id);
  const knowledgePoints = normalizeKnowledgePoints(chapter.knowledgePoints || [], id);
  const questions = normalizeQuestions(chapter.questions || [], id, knowledgePoints);
  const baseChapter = { ...chapter, id, source, knowledgePoints, questions };
  return {
    id,
    title: chapter.title || chapter.chapterTitle || source.title || "未命名章节",
    status: chapter.status || "completed",
    displayStatusText: chapter.displayStatusText || STATUS_TEXT[chapter.status] || "",
    failureReason: chapter.failureReason || "",
    source,
    sourceType: source.type,
    sourceText: source.rawInput || source.extractedText || "",
    knowledgePoints,
    filteredKnowledgePoints: chapter.filteredKnowledgePoints || [],
    questions,
    qualitySummary: chapter.qualitySummary || null,
    generationMeta: chapter.generationMeta || null,
    reviewSession: chapter.reviewSession ? normalizeReviewSession(chapter.reviewSession, baseChapter) : null,
    masteredPoints: chapter.masteredPoints || 0,
    removedQuestionIds: chapter.removedQuestionIds || [],
    downgradedQuestionIds: chapter.downgradedQuestionIds || [],
    feedbackRecords: chapter.feedbackRecords || [],
    dismissedFromNotifications: Boolean(chapter.dismissedFromNotifications),
    createdAt: chapter.createdAt || now,
    updatedAt: now
  };
}

function upsertMemoryChapter(chapter) {
  const record = ensureChapterRecord(chapter);
  const existingIndex = memory.chapters.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    memory.chapters.splice(existingIndex, 1, { ...memory.chapters[existingIndex], ...record });
  } else {
    memory.chapters.unshift(record);
  }
  return memory.chapters.find((item) => item.id === record.id);
}

function createMemoryNotification(chapter) {
  if (!chapter?.id || chapter.dismissedFromNotifications) return null;
  const failed = String(chapter.status || "").startsWith("failed_");
  if (!failed) {
    memory.notifications = memory.notifications.filter((item) => !(item.chapterId === chapter.id && item.type === "generation_failed"));
  }
  const type = failed ? "generation_failed" : "generation_completed";
  memory.notifications = memory.notifications.filter((item) => !(item.chapterId === chapter.id && item.type === type));
  const notification = {
    id: createId("notification"),
    chapterId: chapter.id,
    type,
    title: failed ? "生成失败" : "生成完成",
    body: failed ? `${chapter.title} 暂时不能复习，点击查看原因` : `${chapter.title} 已生成，可以开始复习`,
    read: false,
    dismissed: false,
    createdAt: new Date().toISOString()
  };
  memory.notifications.unshift(notification);
  return notification;
}

function normalizeReviewSession(session = {}, chapter = {}) {
  const now = new Date().toISOString();
  const normalized = {
    id: session.id || createId("session"),
    chapterId: session.chapterId || chapter.id || "",
    status: session.status || "active",
    queue: Array.isArray(session.queue) ? session.queue : [],
    reinforcementQueue: Array.isArray(session.reinforcementQueue) ? session.reinforcementQueue : [],
    currentQueueIndex: Number.isFinite(session.currentQueueIndex) ? session.currentQueueIndex : 0,
    attempts: Array.isArray(session.attempts) ? session.attempts.map(normalizeReviewAttempt) : [],
    masteryByPointId: session.masteryByPointId || {},
    answeredPointIds: Array.isArray(session.answeredPointIds) ? session.answeredPointIds : [],
    masteredThisRoundPointIds: Array.isArray(session.masteredThisRoundPointIds) ? session.masteredThisRoundPointIds : [],
    skippedPointIds: Array.isArray(session.skippedPointIds) ? session.skippedPointIds : [],
    createdAt: session.createdAt || now,
    updatedAt: session.updatedAt || now,
    completedAt: session.completedAt || null
  };
  for (const point of chapter.knowledgePoints || []) {
    if (!Number.isFinite(normalized.masteryByPointId[point.id])) {
      normalized.masteryByPointId[point.id] = point.masteryScore ?? INITIAL_MASTERY_SCORE;
    }
  }
  return normalized;
}

function normalizeReviewAttempt(attempt = {}) {
  return {
    id: attempt.id || createId("attempt"),
    reviewSessionId: attempt.reviewSessionId || attempt.review_session_id || "",
    chapterId: attempt.chapterId || attempt.chapter_id || "",
    knowledgePointId: attempt.knowledgePointId || attempt.knowledge_point_id || "",
    questionId: attempt.questionId || attempt.question_id || "",
    answer: attempt.answer || "",
    result: attempt.result || "unknown",
    isReinforcement: Boolean(attempt.isReinforcement || attempt.is_reinforcement),
    masteryScoreBefore: attempt.masteryScoreBefore ?? attempt.mastery_score_before ?? INITIAL_MASTERY_SCORE,
    masteryScoreAfter: attempt.masteryScoreAfter ?? attempt.mastery_score_after ?? INITIAL_MASTERY_SCORE,
    invalidatedByFeedback: Boolean(attempt.invalidatedByFeedback || attempt.invalidated_by_feedback),
    skippedDueToQuestionFeedback: Boolean(attempt.skippedDueToQuestionFeedback || attempt.skipped_due_to_question_feedback),
    answeredAt: attempt.answeredAt || attempt.answered_at || new Date().toISOString()
  };
}

function createReviewSessionForChapter(chapter) {
  const masteryByPointId = {};
  const queue = [];
  for (const point of chapter.knowledgePoints || []) {
    masteryByPointId[point.id] = point.masteryScore ?? INITIAL_MASTERY_SCORE;
    const question = pickQuestionForPoint(chapter, point.id);
    if (question) {
      queue.push({
        id: createId("queue"),
        pointId: point.id,
        questionId: question.id,
        isReinforcement: false
      });
    }
  }
  return normalizeReviewSession({
    id: createId("session"),
    chapterId: chapter.id,
    status: "active",
    queue,
    reinforcementQueue: [],
    currentQueueIndex: 0,
    attempts: [],
    masteryByPointId,
    answeredPointIds: [],
    masteredThisRoundPointIds: [],
    skippedPointIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  }, chapter);
}

function startOrResumeReviewSession(chapter) {
  if (chapter.reviewSession) {
    chapter.reviewSession = normalizeReviewSession(chapter.reviewSession, chapter);
  } else {
    chapter.reviewSession = createReviewSessionForChapter(chapter);
  }
  chapter.updatedAt = new Date().toISOString();
  return chapter.reviewSession;
}

function currentQueueItem(session) {
  return session.queue[session.currentQueueIndex] || null;
}

function currentQuestionForSession(chapter, session) {
  const item = currentQueueItem(session);
  return questionById(chapter, item?.questionId);
}

function questionById(chapter, questionId) {
  return (chapter.questions || []).find((question) => question.id === questionId) || null;
}

function pickQuestionForPoint(chapter, pointId, excludeQuestionId = "") {
  const removed = new Set(chapter.removedQuestionIds || []);
  const candidates = (chapter.questions || []).filter((question) => {
    return question.knowledgePointId === pointId && !removed.has(question.id);
  });
  if (!candidates.length) return null;
  return candidates.find((question) => question.id !== excludeQuestionId) || candidates[0];
}

function recordSessionAttempt(chapter, body = {}) {
  const session = startOrResumeReviewSession(chapter);
  const item = body.questionId
    ? session.queue.find((queueItem) => queueItem.questionId === body.questionId) || currentQueueItem(session)
    : currentQueueItem(session);
  const question = body.questionId ? questionById(chapter, body.questionId) : currentQuestionForSession(chapter, session);
  if (!item || !question) {
    const error = new Error("当前复习队列没有可作答题目。");
    error.statusCode = 422;
    throw error;
  }
  const pointId = item.pointId || question.knowledgePointId;
  const result = normalizeAttemptResult(body.result);
  const scoreBefore = session.masteryByPointId[pointId] ?? INITIAL_MASTERY_SCORE;
  const isReinforcement = Boolean(item.isReinforcement);
  const scoreAfter = clampMastery(scoreBefore + scoreDelta(result, isReinforcement));
  const attempt = normalizeReviewAttempt({
    id: createId("attempt"),
    reviewSessionId: session.id,
    chapterId: chapter.id,
    knowledgePointId: pointId,
    questionId: question.id,
    answer: body.answer || body.selectedOptionId || "",
    result,
    isReinforcement,
    masteryScoreBefore: scoreBefore,
    masteryScoreAfter: scoreAfter,
    answeredAt: new Date().toISOString()
  });

  session.attempts.push(attempt);
  session.masteryByPointId[pointId] = scoreAfter;
  addUnique(session.answeredPointIds, pointId);
  if (result === "correct") {
    addUnique(session.masteredThisRoundPointIds, pointId);
    session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pointId);
    removeFutureReinforcementForPoint(chapter, session, pointId);
  } else {
    session.masteredThisRoundPointIds = session.masteredThisRoundPointIds.filter((id) => id !== pointId);
    scheduleReinforcement(chapter, session, pointId, question.id);
  }

  const nextIndex = nextAvailableQueueIndex(chapter, session, session.currentQueueIndex + 1);
  session.currentQueueIndex = nextIndex >= 0 ? nextIndex : session.currentQueueIndex;
  if (isSessionComplete(chapter, session)) {
    session.status = "completed";
    session.completedAt = new Date().toISOString();
  }
  session.updatedAt = new Date().toISOString();
  chapter.masteredPoints = currentMasteredCount(chapter, session);
  chapter.updatedAt = new Date().toISOString();
  return { attempt, session, question: currentQuestionForSession(chapter, session) };
}

function normalizeAttemptResult(result) {
  if (result === "wrong" || result === "incorrect") return "incorrect";
  if (result === "correct") return "correct";
  return "unknown";
}

function scoreDelta(result, isReinforcement) {
  if (result === "correct") return isReinforcement ? 10 : 15;
  return isReinforcement ? -15 : -20;
}

function scheduleReinforcement(chapter, session, pointId, currentQuestionId) {
  addUnique(session.reinforcementQueue, pointId);
  removeFutureReinforcementForPoint(chapter, session, pointId);
  const question = pickQuestionForPoint(chapter, pointId, currentQuestionId);
  if (!question) return;
  const item = {
    id: createId("reinforce"),
    pointId,
    questionId: question.id,
    isReinforcement: true
  };
  session.queue.splice(reinforcementInsertIndex(chapter, session, pointId), 0, item);
}

function reinforcementInsertIndex(chapter, session, pointId) {
  let seenOtherQuestions = 0;
  for (let index = session.currentQueueIndex + 1; index < session.queue.length; index += 1) {
    const item = session.queue[index];
    if (!isQueueItemAvailable(chapter, session, item) || item.pointId === pointId) continue;
    seenOtherQuestions += 1;
    if (seenOtherQuestions >= REINFORCEMENT_GAP) return index + 1;
  }
  return session.queue.length;
}

function removeFutureReinforcementForPoint(chapter, session, pointId) {
  session.queue = session.queue.filter((item, index) => {
    if (index <= session.currentQueueIndex) return true;
    return !(item.isReinforcement && item.pointId === pointId);
  });
}

function nextAvailableQueueIndex(chapter, session, startIndex) {
  for (let index = startIndex; index < session.queue.length; index += 1) {
    if (isQueueItemAvailable(chapter, session, session.queue[index])) return index;
  }
  const pendingPointId = session.reinforcementQueue.find((pointId) => !session.masteredThisRoundPointIds.includes(pointId));
  if (pendingPointId) {
    const question = pickQuestionForPoint(chapter, pendingPointId);
    if (question) {
      session.queue.push({
        id: createId("reinforce-tail"),
        pointId: pendingPointId,
        questionId: question.id,
        isReinforcement: true
      });
      return session.queue.length - 1;
    }
    addUnique(session.skippedPointIds, pendingPointId);
    session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pendingPointId);
  }
  return -1;
}

function isQueueItemAvailable(chapter, session, item) {
  if (!item || session.skippedPointIds.includes(item.pointId)) return false;
  return Boolean(questionById(chapter, item.questionId) && !(chapter.removedQuestionIds || []).includes(item.questionId));
}

function requiredPointIdsForSession(chapter, session) {
  const skipped = new Set(session.skippedPointIds || []);
  return (chapter.knowledgePoints || []).map((point) => point.id).filter((pointId) => !skipped.has(pointId));
}

function isSessionComplete(chapter, session) {
  const required = requiredPointIdsForSession(chapter, session);
  return required.every((pointId) => session.answeredPointIds.includes(pointId))
    && required.every((pointId) => session.masteredThisRoundPointIds.includes(pointId))
    && session.reinforcementQueue.length === 0;
}

function currentMasteredCount(chapter, session) {
  return requiredPointIdsForSession(chapter, session).filter((pointId) => session.masteredThisRoundPointIds.includes(pointId)).length;
}

function handleQuestionFeedback(questionId, body = {}) {
  const chapter = memory.chapters.find((item) => item.questions?.some((question) => question.id === questionId));
  if (!chapter) return null;
  const question = questionById(chapter, questionId);
  const session = chapter.reviewSession ? normalizeReviewSession(chapter.reviewSession, chapter) : null;
  const pointId = question.knowledgePointId;
  const feedbackType = normalizeFeedbackType(body.feedbackType || body.type);
  const severe = isSevereFeedback(feedbackType);
  let invalidatedAttemptId = "";
  let actionTaken = "downranked_for_user";

  if (severe) {
    addUnique(chapter.removedQuestionIds, questionId);
    actionTaken = "removed_from_pool";
    if (session) {
      const attempt = latestValidAttemptForQuestion(session, questionId);
      if (attempt) {
        attempt.invalidatedByFeedback = true;
        attempt.skippedDueToQuestionFeedback = true;
        session.masteryByPointId[attempt.knowledgePointId] = attempt.masteryScoreBefore;
        invalidatedAttemptId = attempt.id;
      }
      session.queue = session.queue.filter((item, index) => index === session.currentQueueIndex || item.questionId !== questionId);
      session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pointId);
      if (!pickQuestionForPoint(chapter, pointId)) {
        addUnique(session.skippedPointIds, pointId);
        session.answeredPointIds = session.answeredPointIds.filter((id) => id !== pointId);
        session.masteredThisRoundPointIds = session.masteredThisRoundPointIds.filter((id) => id !== pointId);
        actionTaken = "skipped_for_session";
      }
      session.updatedAt = new Date().toISOString();
      chapter.reviewSession = session;
    }
  } else {
    addUnique(chapter.downgradedQuestionIds, questionId);
  }

  const feedback = {
    id: createId("feedback"),
    questionId,
    knowledgePointId: pointId,
    chapterId: chapter.id,
    reviewSessionId: session?.id || "",
    feedbackType,
    severity: severe ? "severe" : "light",
    actionTaken,
    invalidatedAttemptId,
    createdAt: new Date().toISOString()
  };
  chapter.feedbackRecords.push(feedback);
  chapter.masteredPoints = session ? currentMasteredCount(chapter, session) : chapter.masteredPoints;
  chapter.updatedAt = new Date().toISOString();
  return { chapter, feedback, reviewSession: chapter.reviewSession };
}

function normalizeFeedbackType(type) {
  if (type === "wrong_answer") return "answer_wrong";
  if (type === "unrelated_source") return "unrelated_to_source";
  if (type === "too_easy" || type === "unclear" || type === "unrelated_to_source" || type === "answer_wrong") return type;
  return "unclear";
}

function isSevereFeedback(type) {
  return type === "answer_wrong" || type === "unclear" || type === "unrelated_to_source";
}

function latestValidAttemptForQuestion(session, questionId) {
  for (let index = session.attempts.length - 1; index >= 0; index -= 1) {
    const attempt = session.attempts[index];
    if (attempt.questionId === questionId && !attempt.invalidatedByFeedback) return attempt;
  }
  return null;
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function clampMastery(value) {
  return Math.min(100, Math.max(0, value));
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const requestedPath = decodeURIComponent(url.pathname);
  const relativePath = requestedPath === "/" ? "index.html" : requestedPath.replace(/^\/+/, "");
  const safePath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(demoRoot, safePath));

  if (!filePath.startsWith(demoRoot)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, { ok: true, service: "shibei-api" });
    return;
  }

  if (req.method === "POST" && (req.url === "/api/generate" || req.url === "/api/regenerate")) {
    await handleGenerate(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/chapters") {
    await handleCreateChapter(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/chapters") {
    sendJson(res, 200, { chapters: sortByCreatedAtDesc(memory.chapters) });
    return;
  }

  const chapterMatch = req.url?.match(/^\/api\/chapters\/([^/]+)$/);
  if (chapterMatch && req.method === "GET") {
    const chapter = memory.chapters.find((item) => item.id === decodeURIComponent(chapterMatch[1]));
    if (!chapter) sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
    else sendJson(res, 200, { chapter });
    return;
  }

  if (chapterMatch && req.method === "DELETE") {
    const chapterId = decodeURIComponent(chapterMatch[1]);
    const before = memory.chapters.length;
    memory.chapters = memory.chapters.filter((chapter) => chapter.id !== chapterId);
    memory.notifications = memory.notifications.filter((notification) => notification.chapterId !== chapterId);
    if (memory.chapters.length === before) sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
    else sendJson(res, 200, { deleted: true, chapterId });
    return;
  }

  const regenerateMatch = req.url?.match(/^\/api\/chapters\/([^/]+)\/regenerate$/);
  if (regenerateMatch && req.method === "POST") {
    await handleRegenerateChapter(req, res, decodeURIComponent(regenerateMatch[1]));
    return;
  }

  const reviewSessionMatch = req.url?.match(/^\/api\/chapters\/([^/]+)\/review-session$/);
  if (reviewSessionMatch && (req.method === "GET" || req.method === "POST")) {
    const chapter = memory.chapters.find((item) => item.id === decodeURIComponent(reviewSessionMatch[1]));
    if (!chapter) {
      sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
      return;
    }
    if (String(chapter.status || "") !== "completed") {
      sendJson(res, 422, { errorCode: "chapter_not_reviewable", message: "这个章节暂时不能开始复习。", chapter });
      return;
    }
    const reviewSession = req.method === "POST"
      ? startOrResumeReviewSession(chapter)
      : chapter.reviewSession ? normalizeReviewSession(chapter.reviewSession, chapter) : null;
    if (reviewSession) chapter.reviewSession = reviewSession;
    sendJson(res, 200, {
      chapter,
      reviewSession,
      currentQuestion: reviewSession && reviewSession.status !== "completed" ? currentQuestionForSession(chapter, reviewSession) : null
    });
    return;
  }

  const attemptMatch = req.url?.match(/^\/api\/review-sessions\/([^/]+)\/attempts$/);
  if (attemptMatch && req.method === "POST") {
    const sessionId = decodeURIComponent(attemptMatch[1]);
    const chapter = memory.chapters.find((item) => item.reviewSession?.id === sessionId);
    if (!chapter) {
      sendJson(res, 404, { errorCode: "review_session_not_found", message: "复习会话不存在。" });
      return;
    }
    try {
      const body = await readBody(req);
      const result = recordSessionAttempt(chapter, body);
      sendJson(res, 200, {
        chapter,
        reviewSession: result.session,
        attempt: result.attempt,
        currentQuestion: result.session.status === "completed" ? null : result.question
      });
    } catch (error) {
      sendJson(res, error.statusCode || 422, { errorCode: "attempt_not_recorded", message: error.message || "答题记录保存失败。" });
    }
    return;
  }

  const feedbackMatch = req.url?.match(/^\/api\/questions\/([^/]+)\/feedback$/);
  if (feedbackMatch && req.method === "POST") {
    const body = await readBody(req);
    const result = handleQuestionFeedback(decodeURIComponent(feedbackMatch[1]), body);
    if (!result) {
      sendJson(res, 404, { errorCode: "question_not_found", message: "题目不存在。" });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "GET" && req.url === "/api/notifications") {
    sendJson(res, 200, { notifications: sortByCreatedAtDesc(memory.notifications) });
    return;
  }

  const notificationActionMatch = req.url?.match(/^\/api\/notifications\/([^/]+)\/(read|dismiss)$/);
  if (notificationActionMatch && req.method === "POST") {
    const notification = memory.notifications.find((item) => item.id === decodeURIComponent(notificationActionMatch[1]));
    if (!notification) {
      sendJson(res, 404, { errorCode: "notification_not_found", message: "通知不存在。" });
      return;
    }
    if (notificationActionMatch[2] === "read") notification.read = true;
    if (notificationActionMatch[2] === "dismiss") {
      notification.read = true;
      notification.dismissed = true;
    }
    sendJson(res, 200, { notification });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { errorCode: "method_not_allowed", message: "不支持的请求方法。" });
});

server.listen(port, host, () => {
  console.log(`拾贝 Demo 已启动：http://${host}:${port}`);
});
