import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateReviewChapter } from "./generation/index.js";
import { extractSourceContent } from "./sources/extractSourceContent.js";
import { STATUS_TEXT } from "./generation/types.js";
import {
  applyAnnotation,
  autoLabelReviewRows,
  buildQualityRun,
  calculateRunStats,
  expandReviewRows,
  loadQualityRun,
  mergeAutoLabels,
  qualityRunManualCsvFile,
  saveQualityRun,
  toCsv
} from "./qualityWorkbench.js";
import {
  chapterCount,
  checkDatabase,
  deleteChapter as deleteDatabaseChapter,
  deleteDeviceData as deleteDatabaseDeviceData,
  deleteNotificationsForChapter,
  ensureDevice,
  getChapter as getDatabaseChapter,
  getNotification as getDatabaseNotification,
  hasDatabase,
  initDatabase,
  listChapters as listDatabaseChapters,
  listNotifications as listDatabaseNotifications,
  startGenerationJob,
  updateGenerationJob,
  upsertChapter as upsertDatabaseChapter,
  upsertNotification as upsertDatabaseNotification
} from "./db.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "..", "..");
const demoRoot = resolve(projectRoot, "demo");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);
const startedAt = new Date().toISOString();
const DEFAULT_DEVICE_ID = "demo-device";
const memoryByDeviceId = new Map();
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
    "access-control-allow-headers": "content-type,x-device-id"
  });
  res.end(JSON.stringify(body));
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "access-control-allow-origin": "*"
  });
  res.end(body);
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
  const deviceId = getDeviceId(req);
  const submittedChapter = await upsertMemoryChapter(deviceId, createSubmittedChapter(body));
  sendJson(res, 202, {
    status: submittedChapter.status,
    chapter: serializeChapterForClient(submittedChapter),
    notification: null,
    message: "已提交，正在生成。"
  });
  void runChapterGeneration(deviceId, submittedChapter.id, body);
}

async function handleCreateQualityRun(req, res) {
  const body = await readBody(req);
  const runId = createQualityRunId();
  try {
    const result = await generateFromInput(body);
    const initialRun = buildQualityRun({ id: runId, input: body, result });
    let run = initialRun;
    try {
      const autoLabels = await autoLabelReviewRows(initialRun.reviewRows);
      run = {
        ...initialRun,
        status: "ready_for_review",
        autoLabelError: "",
        reviewRows: mergeAutoLabels(initialRun.reviewRows, autoLabels)
      };
      run.stats = calculateRunStats(run.reviewRows);
    } catch (error) {
      run = {
        ...initialRun,
        status: "auto_label_failed",
        autoLabelError: error instanceof Error ? error.message : "AI 预标注失败。"
      };
    }
    await saveQualityRun(run);
    sendJson(res, 200, run);
  } catch (error) {
    sendJson(res, 422, {
      id: runId,
      status: "generation_failed",
      message: error instanceof Error ? error.message : "质量工作台生成失败。"
    });
  }
}

async function handleAutoLabelQualityRun(req, res, runId) {
  try {
    const body = await readBody(req);
    const run = await loadQualityRun(runId);
    const ids = Array.isArray(body.questionIds) ? new Set(body.questionIds.map(String)) : null;
    const rows = ids ? run.reviewRows.filter((row) => ids.has(row.questionId)) : run.reviewRows;
    const autoLabels = await autoLabelReviewRows(rows);
    run.reviewRows = mergeAutoLabels(expandReviewRows(run.reviewRows), autoLabels);
    run.status = "ready_for_review";
    run.autoLabelError = "";
    run.updatedAt = new Date().toISOString();
    run.stats = calculateRunStats(run.reviewRows);
    await saveQualityRun(run);
    sendJson(res, 200, run);
  } catch (error) {
    sendJson(res, 422, {
      errorCode: "auto_label_failed",
      message: error instanceof Error ? error.message : "AI 预标注失败。"
    });
  }
}

async function handleQualityRunAnnotation(req, res, runId) {
  try {
    const body = await readBody(req);
    const run = await loadQualityRun(runId);
    const annotations = Array.isArray(body.annotations) ? body.annotations : [body];
    const results = annotations.map((annotation) => applyAnnotation(run, annotation));
    await saveQualityRun(run);
    sendJson(res, 200, { run, results });
  } catch (error) {
    sendJson(res, 422, {
      errorCode: "annotation_save_failed",
      message: error instanceof Error ? error.message : "保存标注失败。"
    });
  }
}

async function handleGetQualityRun(req, res, runId) {
  try {
    const run = await loadQualityRun(runId);
    sendJson(res, 200, run);
  } catch {
    sendJson(res, 404, { errorCode: "quality_run_not_found", message: "质量工作台记录不存在。" });
  }
}

async function handleExportQualityRun(req, res, runId) {
  try {
    const run = await loadQualityRun(runId);
    const csv = toCsv(run.reviewRows);
    sendText(res, 200, csv, "text/csv; charset=utf-8");
  } catch {
    try {
      const csv = await readFile(qualityRunManualCsvFile(runId), "utf8");
      sendText(res, 200, csv, "text/csv; charset=utf-8");
    } catch {
      sendJson(res, 404, { errorCode: "quality_run_not_found", message: "质量工作台记录不存在。" });
    }
  }
}

async function runChapterGeneration(deviceId, chapterId, body) {
  const runId = createId("generation");
  generationRuns.set(generationRunKey(deviceId, chapterId), runId);
  if (hasDatabase) {
    await startGenerationJob(deviceId, {
      id: runId,
      chapterId,
      status: "submitted",
      currentStage: "submitted"
    });
  }
  const updateStage = (status) => updateMemoryChapterStage(deviceId, chapterId, status, runId).catch((error) => {
    console.error("Failed to update generation stage", error);
  });
  try {
    await updateStage("extracting_content");
    const result = await withTimeout(
      generateFromInput(body, { onStage: updateStage }),
      GENERATION_JOB_TIMEOUT_MS,
      () => generationTimeoutError()
    );
    if (!isCurrentGenerationRun(deviceId, chapterId, runId)) return;
    const existing = await getStoredChapter(deviceId, chapterId);
    const chapter = await upsertMemoryChapter(deviceId, {
      ...(result.chapter || failedSourceResult({
      status: result.status,
      message: result.message || "生成失败",
      body
    }).chapter),
      id: chapterId,
      createdAt: existing?.createdAt
    });
    await createMemoryNotification(deviceId, chapter);
    if (hasDatabase) {
      await updateGenerationJob(deviceId, runId, {
        status: chapter.status,
        currentStage: chapter.status,
        finished: true
      });
    }
  } catch (error) {
    if (!isCurrentGenerationRun(deviceId, chapterId, runId)) return;
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const failed = failedSourceResult({ status, message, body });
    const existing = await getStoredChapter(deviceId, chapterId);
    const chapter = await upsertMemoryChapter(deviceId, {
      ...failed.chapter,
      id: chapterId,
      createdAt: existing?.createdAt
    });
    await createMemoryNotification(deviceId, chapter);
    if (hasDatabase) {
      await updateGenerationJob(deviceId, runId, {
        status,
        currentStage: status,
        errorMessage: message,
        finished: true
      });
    }
  } finally {
    if (isCurrentGenerationRun(deviceId, chapterId, runId)) {
      generationRuns.delete(generationRunKey(deviceId, chapterId));
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
  const deviceId = getDeviceId(req);
  const existing = await getStoredChapter(deviceId, chapterId);
  if (!existing) {
    sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
    return;
  }
  const submittedChapter = await upsertMemoryChapter(deviceId, createRegeneratingChapter(existing));
  sendJson(res, 202, {
    status: submittedChapter.status,
    chapter: serializeChapterForClient(submittedChapter),
    notification: null,
    message: "已提交，正在重新生成。"
  });
  void runChapterRegeneration(deviceId, existing);
}

async function runChapterRegeneration(deviceId, existing) {
  const runId = createId("generation");
  generationRuns.set(generationRunKey(deviceId, existing.id), runId);
  if (hasDatabase) {
    await startGenerationJob(deviceId, {
      id: runId,
      chapterId: existing.id,
      status: "submitted",
      currentStage: "submitted"
    });
  }
  const updateStage = (status) => updateMemoryChapterStage(deviceId, existing.id, status, runId).catch((error) => {
    console.error("Failed to update regeneration stage", error);
  });
  try {
    await updateStage("generating_points");
    const result = await withTimeout(
      regenerateFromChapter(existing, { onStage: updateStage }),
      GENERATION_JOB_TIMEOUT_MS,
      () => generationTimeoutError()
    );
    if (!isCurrentGenerationRun(deviceId, existing.id, runId)) return;
    const chapter = await upsertMemoryChapter(deviceId, {
      ...(result.chapter || {}),
      id: existing.id,
      createdAt: existing.createdAt
    });
    await createMemoryNotification(deviceId, chapter);
    if (hasDatabase) {
      await updateGenerationJob(deviceId, runId, {
        status: chapter.status,
        currentStage: chapter.status,
        finished: true
      });
    }
  } catch (error) {
    if (!isCurrentGenerationRun(deviceId, existing.id, runId)) return;
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "重新生成失败，请稍后重试。";
    const failed = failedSourceResult({ status, message, body: existing });
    const chapter = await upsertMemoryChapter(deviceId, {
      ...failed.chapter,
      id: existing.id,
      createdAt: existing.createdAt
    });
    await createMemoryNotification(deviceId, chapter);
    if (hasDatabase) {
      await updateGenerationJob(deviceId, runId, {
        status,
        currentStage: status,
        errorMessage: message,
        finished: true
      });
    }
  } finally {
    if (isCurrentGenerationRun(deviceId, existing.id, runId)) {
      generationRuns.delete(generationRunKey(deviceId, existing.id));
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

function createQualityRunId() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `quality-workbench-${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`;
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

function generationRunKey(deviceId, chapterId) {
  return `${deviceId}:${chapterId}`;
}

function getDeviceId(req) {
  const raw = req.headers["x-device-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || DEFAULT_DEVICE_ID;
}

function getMemory(deviceId) {
  if (!memoryByDeviceId.has(deviceId)) {
    memoryByDeviceId.set(deviceId, { chapters: [], notifications: [] });
  }
  return memoryByDeviceId.get(deviceId);
}

async function listStoredChapters(deviceId) {
  if (hasDatabase) return listDatabaseChapters(deviceId);
  return getMemory(deviceId).chapters;
}

async function getStoredChapter(deviceId, chapterId) {
  if (hasDatabase) return getDatabaseChapter(deviceId, chapterId);
  return getMemory(deviceId).chapters.find((item) => item.id === chapterId) || null;
}

async function upsertStoredChapter(deviceId, chapter) {
  const record = ensureChapterRecord(chapter);
  if (hasDatabase) return upsertDatabaseChapter(deviceId, record);
  const memory = getMemory(deviceId);
  const existingIndex = memory.chapters.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    memory.chapters.splice(existingIndex, 1, { ...memory.chapters[existingIndex], ...record });
  } else {
    memory.chapters.unshift(record);
  }
  return memory.chapters.find((item) => item.id === record.id);
}

async function deleteStoredChapter(deviceId, chapterId) {
  if (hasDatabase) return deleteDatabaseChapter(deviceId, chapterId);
  const memory = getMemory(deviceId);
  const before = memory.chapters.length;
  memory.chapters = memory.chapters.filter((chapter) => chapter.id !== chapterId);
  memory.notifications = memory.notifications.filter((notification) => notification.chapterId !== chapterId);
  return memory.chapters.length !== before;
}

async function deleteStoredDeviceData(deviceId) {
  generationRuns.forEach((_, key) => {
    if (key.startsWith(`${deviceId}:`)) generationRuns.delete(key);
  });
  if (hasDatabase) return deleteDatabaseDeviceData(deviceId);
  const memory = getMemory(deviceId);
  const deleted = {
    chapters: memory.chapters.length,
    notifications: memory.notifications.length,
    generationJobs: 0
  };
  memory.chapters = [];
  memory.notifications = [];
  return deleted;
}

async function listStoredNotifications(deviceId) {
  if (hasDatabase) return listDatabaseNotifications(deviceId);
  return getMemory(deviceId).notifications;
}

async function getStoredNotification(deviceId, notificationId) {
  if (hasDatabase) return getDatabaseNotification(deviceId, notificationId);
  return getMemory(deviceId).notifications.find((item) => item.id === notificationId) || null;
}

async function upsertStoredNotification(deviceId, notification) {
  const record = normalizeNotification(notification);
  if (hasDatabase) return upsertDatabaseNotification(deviceId, record);
  const memory = getMemory(deviceId);
  const existingIndex = memory.notifications.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) {
    memory.notifications.splice(existingIndex, 1, record);
  } else {
    memory.notifications.unshift(record);
  }
  return memory.notifications.find((item) => item.id === record.id);
}

async function deleteStoredNotificationsForChapter(deviceId, chapterId, type = "") {
  if (hasDatabase) {
    await deleteNotificationsForChapter(deviceId, chapterId, type);
    return;
  }
  const memory = getMemory(deviceId);
  memory.notifications = memory.notifications.filter((item) => {
    if (item.chapterId !== chapterId) return true;
    return type ? item.type !== type : false;
  });
}

function isCurrentGenerationRun(deviceId, chapterId, runId) {
  return generationRuns.get(generationRunKey(deviceId, chapterId)) === runId;
}

async function updateMemoryChapterStage(deviceId, chapterId, status, runId) {
  if (!isCurrentGenerationRun(deviceId, chapterId, runId)) return;
  const chapter = await getStoredChapter(deviceId, chapterId);
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
  await upsertStoredChapter(deviceId, chapter);
  if (hasDatabase) {
    await updateGenerationJob(deviceId, runId, {
      status,
      currentStage: status
    });
  }
}

function normalizeChapterSource(chapter, chapterId) {
  const source = chapter.source || {};
  const type = normalizeSourceType(source.type || chapter.sourceType);
  const rawInput = toStringValue(source.rawInput || source.rawText || chapter.rawInput || chapter.sourceText || "");
  const extractedText = toStringValue(source.extractedText || source.cleanedText || chapter.extractedText || rawInput);
  const accountOrDomain = toStringValue(source.accountOrDomain || source.account || chapter.sourceAccount || chapter.source_account_or_platform || "");
  return {
    type,
    title: toStringValue(source.title || chapter.sourceTitle || chapter.title || (type === "text" ? "粘贴文字" : "未命名来源")),
    url: toStringValue(source.url || chapter.sourceUrl || ""),
    accountOrDomain,
    rawInput,
    extractedText,
    chapterId,
    account: accountOrDomain,
    rawText: rawInput,
    cleanedText: extractedText
  };
}

function normalizeSourceType(type) {
  return ["text", "article_link", "wechat_article", "video_link"].includes(type) ? type : "text";
}

function normalizeKnowledgeType(type) {
  return ["concept", "judgment", "method", "scenario", "counterexample", "comparison", "step"].includes(type) ? type : "concept";
}

function normalizeQuestionType(type) {
  return ["multiple_choice", "true_false", "scenario_judgment"].includes(type) ? type : "multiple_choice";
}

function normalizeChapterStatus(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_TEXT, status) ? status : "failed_questions";
}

function toStringValue(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function toNumberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toIntegerValue(value, fallback = 0) {
  return Math.round(toNumberValue(value, fallback));
}

function nullableInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function normalizeKnowledgePoints(points, chapterId) {
  const now = new Date().toISOString();
  return points.map((point, index) => {
    const id = toStringValue(point.id || `kp-${index + 1}`);
    const sourceSnippet = toStringValue(point.sourceSnippet || point.source_snippet || point.sourceQuote || "");
    return {
      id,
      chapterId: toStringValue(point.chapterId || point.chapter_id || chapterId),
      title: toStringValue(point.title || `知识点 ${index + 1}`),
      summary: toStringValue(point.summary || point.keyClaim || ""),
      keyClaim: toStringValue(point.keyClaim || point.summary || ""),
      knowledgeType: normalizeKnowledgeType(point.knowledgeType || point.knowledge_type),
      sourceSnippet,
      sourceQuote: toStringValue(point.sourceQuote || sourceSnippet),
      sourceOrder: toIntegerValue(point.sourceOrder ?? point.source_order, index),
      sourceStartOffset: nullableInteger(point.sourceStartOffset ?? point.source_start_offset),
      sourceEndOffset: nullableInteger(point.sourceEndOffset ?? point.source_end_offset),
      testabilityScore: toIntegerValue(point.testabilityScore ?? point.testability_score, 3),
      masteryScore: toIntegerValue(point.masteryScore ?? point.mastery_score, INITIAL_MASTERY_SCORE),
      answeredCount: toIntegerValue(point.answeredCount ?? point.answered_count, 0),
      lastReviewedAt: point.lastReviewedAt ? toStringValue(point.lastReviewedAt) : null,
      lastDecayAppliedAt: point.lastDecayAppliedAt ? toStringValue(point.lastDecayAppliedAt) : null,
      createdAt: toStringValue(point.createdAt || now),
      updatedAt: toStringValue(point.updatedAt || now)
    };
  }).sort(compareNormalizedSourceOrder);
}

function normalizeQuestions(questions, chapterId, knowledgePoints = []) {
  const now = new Date().toISOString();
  return questions.map((question, index) => {
    const knowledgePointId = toStringValue(question.knowledgePointId || question.pointId || question.knowledge_point_id || "");
    const point = knowledgePoints.find((item) => item.id === knowledgePointId);
    const sourceSnippet = toStringValue(question.sourceSnippet || question.source_snippet || question.sourceQuote || "");
    return {
      id: toStringValue(question.id || `q-${index + 1}`),
      chapterId: toStringValue(question.chapterId || question.chapter_id || chapterId),
      knowledgePointId,
      pointId: knowledgePointId,
      pointTitle: toStringValue(question.pointTitle || point?.title || ""),
      type: normalizeQuestionType(question.type || question.questionType || question.question_type),
      stem: toStringValue(question.stem || ""),
      options: normalizeQuestionOptions(question.options),
      correctOptionId: toStringValue(question.correctOptionId || question.correct_answer || question.correctAnswer || ""),
      correctUnderstanding: toStringValue(question.correctUnderstanding || question.correct_understanding || question.fullExplanation || ""),
      commonMisconception: toStringValue(question.commonMisconception || question.common_misconception || ""),
      sourceSnippet,
      sourceQuote: toStringValue(question.sourceQuote || sourceSnippet),
      sourceOrder: toIntegerValue(question.sourceOrder ?? question.source_order ?? point?.sourceOrder, index),
      sourceStartOffset: nullableInteger(question.sourceStartOffset ?? question.source_start_offset ?? point?.sourceStartOffset),
      sourceEndOffset: nullableInteger(question.sourceEndOffset ?? question.source_end_offset ?? point?.sourceEndOffset),
      difficulty: toStringValue(question.difficulty || "medium"),
      qualityScore: normalizeQualityScore(question.qualityScore),
      qualityIssues: Array.isArray(question.qualityIssues) ? question.qualityIssues.map((issue) => toStringValue(issue)).filter(Boolean) : [],
      confidenceLevel: question.confidenceLevel === "low" ? "low" : "high",
      retainedBy: toStringValue(question.retainedBy || (question.confidenceLevel === "low" ? "best_effort_quality_fallback" : "quality_pass")),
      shortExplanation: toStringValue(question.shortExplanation || question.explanation || ""),
      fullExplanation: toStringValue(question.fullExplanation || question.correctUnderstanding || question.correct_understanding || ""),
      pitfalls: Array.isArray(question.pitfalls) ? question.pitfalls.map((pitfall) => toStringValue(pitfall)).filter(Boolean) : [],
      isNew: Boolean(question.isNew),
      createdAt: toStringValue(question.createdAt || now),
      updatedAt: toStringValue(question.updatedAt || now)
    };
  }).sort(compareNormalizedSourceOrder);
}

function compareNormalizedSourceOrder(a, b) {
  if (a.sourceOrder !== b.sourceOrder) return a.sourceOrder - b.sourceOrder;
  const aStart = Number.isFinite(a.sourceStartOffset) ? a.sourceStartOffset : Number.MAX_SAFE_INTEGER;
  const bStart = Number.isFinite(b.sourceStartOffset) ? b.sourceStartOffset : Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;
  return String(a.id).localeCompare(String(b.id));
}

function normalizeQuestionOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => ({
    id: toStringValue(option?.id || `option-${index + 1}`),
    text: toStringValue(option?.text || option?.label || option?.content || "")
  }));
}

function normalizeQualityScore(qualityScore) {
  if (!qualityScore || typeof qualityScore !== "object" || Array.isArray(qualityScore)) return null;
  return Object.fromEntries(
    Object.entries(qualityScore)
      .filter(([, value]) => Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Number(value)])
  );
}

function normalizeQualitySummary(qualitySummary) {
  if (!qualitySummary || typeof qualitySummary !== "object" || Array.isArray(qualitySummary)) return null;
  return {
    averageQualityScore: Number.isFinite(Number(qualitySummary.averageQualityScore))
      ? Number(qualitySummary.averageQualityScore)
      : (Number.isFinite(Number(qualitySummary.averageScore)) ? Number(qualitySummary.averageScore) : null),
    questionCoverageRate: Number.isFinite(Number(qualitySummary.questionCoverageRate))
      ? Number(qualitySummary.questionCoverageRate)
      : (Number.isFinite(Number(qualitySummary.coverageRate)) ? Number(qualitySummary.coverageRate) : null),
    totalGenerated: toIntegerValue(qualitySummary.totalGenerated, 0),
    retainedQuestionCount: toIntegerValue(qualitySummary.retainedQuestionCount, 0),
    lowConfidenceQuestionCount: toIntegerValue(qualitySummary.lowConfidenceQuestionCount, 0),
    uncoveredPointCount: toIntegerValue(qualitySummary.uncoveredPointCount, 0),
    seriousIssueCount: toIntegerValue(qualitySummary.seriousIssueCount, 0),
    judgeUnavailable: Boolean(qualitySummary.judgeUnavailable)
  };
}

function ensureChapterRecord(chapter) {
  const now = new Date().toISOString();
  const id = chapter.id || createId("chapter");
  const source = normalizeChapterSource(chapter, id);
  const knowledgePoints = normalizeKnowledgePoints(chapter.knowledgePoints || [], id);
  const filteredKnowledgePoints = normalizeKnowledgePoints(chapter.filteredKnowledgePoints || [], id);
  const questions = normalizeQuestions(chapter.questions || [], id, knowledgePoints);
  const status = normalizeChapterStatus(chapter.status || "completed");
  const baseChapter = { ...chapter, id, source, knowledgePoints, questions };
  return {
    id,
    title: toStringValue(chapter.title || chapter.chapterTitle || source.title || "未命名章节"),
    status,
    displayStatusText: toStringValue(chapter.displayStatusText || STATUS_TEXT[status] || ""),
    failureReason: toStringValue(chapter.failureReason || ""),
    source,
    sourceType: source.type,
    sourceText: source.rawInput || source.extractedText || "",
    coreSummary: toStringValue(chapter.coreSummary || ""),
    knowledgePoints,
    filteredKnowledgePoints,
    questions,
    qualitySummary: normalizeQualitySummary(chapter.qualitySummary),
    generationMeta: normalizeGenerationMeta(chapter.generationMeta),
    reviewSession: chapter.reviewSession ? normalizeReviewSession(chapter.reviewSession, baseChapter) : null,
    masteredPoints: toIntegerValue(chapter.masteredPoints, 0),
    removedQuestionIds: Array.isArray(chapter.removedQuestionIds) ? chapter.removedQuestionIds.map((id) => toStringValue(id)).filter(Boolean) : [],
    downgradedQuestionIds: Array.isArray(chapter.downgradedQuestionIds) ? chapter.downgradedQuestionIds.map((id) => toStringValue(id)).filter(Boolean) : [],
    feedbackRecords: normalizeFeedbackRecords(chapter.feedbackRecords),
    dismissedFromNotifications: Boolean(chapter.dismissedFromNotifications),
    createdAt: toStringValue(chapter.createdAt || now),
    updatedAt: toStringValue(chapter.updatedAt || now)
  };
}

function serializeChapterForClient(chapter) {
  return ensureChapterRecord(chapter);
}

function serializeChaptersForClient(chapters = []) {
  return chapters.map(serializeChapterForClient);
}

function normalizeGenerationMeta(generationMeta) {
  if (!generationMeta || typeof generationMeta !== "object" || Array.isArray(generationMeta)) return null;
  return {
    ...generationMeta,
    currentStage: generationMeta.currentStage ? toStringValue(generationMeta.currentStage) : null,
    qualifiedQuestionCount: generationMeta.qualifiedQuestionCount === undefined || generationMeta.qualifiedQuestionCount === null
      ? null
      : toIntegerValue(generationMeta.qualifiedQuestionCount, 0),
    failedStage: generationMeta.failedStage ? toStringValue(generationMeta.failedStage) : null,
    failureReason: generationMeta.failureReason ? toStringValue(generationMeta.failureReason) : null
  };
}

function normalizeNotification(notification = {}) {
  return {
    id: toStringValue(notification.id || createId("notification")),
    chapterId: toStringValue(notification.chapterId || notification.chapter_id || ""),
    type: notification.type === "generation_failed" ? "generation_failed" : "generation_completed",
    title: toStringValue(notification.title || ""),
    body: toStringValue(notification.body || ""),
    read: Boolean(notification.read),
    dismissed: Boolean(notification.dismissed),
    createdAt: toStringValue(notification.createdAt || notification.created_at || new Date().toISOString())
  };
}

function serializeNotificationForClient(notification) {
  return normalizeNotification(notification);
}

function serializeNotificationsForClient(notifications = []) {
  return notifications.map(serializeNotificationForClient);
}

function normalizeFeedbackRecords(feedbackRecords) {
  if (!Array.isArray(feedbackRecords)) return [];
  return feedbackRecords.map((feedback, index) => ({
    id: toStringValue(feedback.id || `feedback-${index + 1}`),
    questionId: toStringValue(feedback.questionId || feedback.question_id || ""),
    knowledgePointId: toStringValue(feedback.knowledgePointId || feedback.knowledge_point_id || ""),
    chapterId: toStringValue(feedback.chapterId || feedback.chapter_id || ""),
    reviewSessionId: toStringValue(feedback.reviewSessionId || feedback.review_session_id || ""),
    feedbackType: normalizeFeedbackType(feedback.feedbackType || feedback.feedback_type || feedback.type),
    severity: toStringValue(feedback.severity || "light"),
    actionTaken: toStringValue(feedback.actionTaken || feedback.action_taken || ""),
    invalidatedAttemptId: toStringValue(feedback.invalidatedAttemptId || feedback.invalidated_attempt_id || ""),
    createdAt: toStringValue(feedback.createdAt || feedback.created_at || new Date().toISOString())
  }));
}

async function upsertMemoryChapter(deviceId, chapter) {
  return upsertStoredChapter(deviceId, chapter);
}

async function createMemoryNotification(deviceId, chapter) {
  if (!chapter?.id || chapter.dismissedFromNotifications) return null;
  const failed = String(chapter.status || "").startsWith("failed_");
  if (!failed) {
    await deleteStoredNotificationsForChapter(deviceId, chapter.id, "generation_failed");
  }
  const type = failed ? "generation_failed" : "generation_completed";
  await deleteStoredNotificationsForChapter(deviceId, chapter.id, type);
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
  return upsertStoredNotification(deviceId, notification);
}

function normalizeReviewSession(session = {}, chapter = {}) {
  const now = new Date().toISOString();
  const normalized = {
    id: toStringValue(session.id || createId("session")),
    chapterId: toStringValue(session.chapterId || chapter.id || ""),
    status: normalizeReviewSessionStatus(session.status),
    queue: normalizeReviewQueue(session.queue),
    reinforcementQueue: Array.isArray(session.reinforcementQueue) ? session.reinforcementQueue.map((id) => toStringValue(id)).filter(Boolean) : [],
    currentQueueIndex: toIntegerValue(session.currentQueueIndex, 0),
    attempts: Array.isArray(session.attempts) ? session.attempts.map(normalizeReviewAttempt) : [],
    masteryByPointId: normalizeMasteryByPointId(session.masteryByPointId),
    answeredPointIds: Array.isArray(session.answeredPointIds) ? session.answeredPointIds.map((id) => toStringValue(id)).filter(Boolean) : [],
    masteredThisRoundPointIds: Array.isArray(session.masteredThisRoundPointIds) ? session.masteredThisRoundPointIds.map((id) => toStringValue(id)).filter(Boolean) : [],
    skippedPointIds: Array.isArray(session.skippedPointIds) ? session.skippedPointIds.map((id) => toStringValue(id)).filter(Boolean) : [],
    createdAt: toStringValue(session.createdAt || now),
    updatedAt: toStringValue(session.updatedAt || now),
    completedAt: session.completedAt ? toStringValue(session.completedAt) : null
  };
  for (const point of chapter.knowledgePoints || []) {
    if (!Number.isFinite(normalized.masteryByPointId[point.id])) {
      normalized.masteryByPointId[point.id] = point.masteryScore ?? INITIAL_MASTERY_SCORE;
    }
  }
  return normalized;
}

function normalizeReviewSessionStatus(status) {
  return ["active", "completed", "abandoned"].includes(status) ? status : "active";
}

function normalizeReviewQueue(queue) {
  if (!Array.isArray(queue)) return [];
  return queue.map((item, index) => ({
    id: toStringValue(item?.id || `queue-${index + 1}`),
    pointId: toStringValue(item?.pointId || item?.point_id || ""),
    questionId: toStringValue(item?.questionId || item?.question_id || ""),
    isReinforcement: Boolean(item?.isReinforcement || item?.is_reinforcement)
  }));
}

function normalizeMasteryByPointId(masteryByPointId) {
  if (!masteryByPointId || typeof masteryByPointId !== "object" || Array.isArray(masteryByPointId)) return {};
  return Object.fromEntries(
    Object.entries(masteryByPointId)
      .map(([key, value]) => [key, toIntegerValue(value, INITIAL_MASTERY_SCORE)])
  );
}

function normalizeReviewAttempt(attempt = {}) {
  return {
    id: toStringValue(attempt.id || createId("attempt")),
    reviewSessionId: toStringValue(attempt.reviewSessionId || attempt.review_session_id || ""),
    chapterId: toStringValue(attempt.chapterId || attempt.chapter_id || ""),
    knowledgePointId: toStringValue(attempt.knowledgePointId || attempt.knowledge_point_id || ""),
    questionId: toStringValue(attempt.questionId || attempt.question_id || ""),
    answer: toStringValue(attempt.answer || ""),
    result: attempt.result || "unknown",
    isReinforcement: Boolean(attempt.isReinforcement || attempt.is_reinforcement),
    masteryScoreBefore: toIntegerValue(attempt.masteryScoreBefore ?? attempt.mastery_score_before, INITIAL_MASTERY_SCORE),
    masteryScoreAfter: toIntegerValue(attempt.masteryScoreAfter ?? attempt.mastery_score_after, INITIAL_MASTERY_SCORE),
    invalidatedByFeedback: Boolean(attempt.invalidatedByFeedback || attempt.invalidated_by_feedback),
    skippedDueToQuestionFeedback: Boolean(attempt.skippedDueToQuestionFeedback || attempt.skipped_due_to_question_feedback),
    answeredAt: toStringValue(attempt.answeredAt || attempt.answered_at || new Date().toISOString())
  };
}

function createReviewSessionForChapter(chapter) {
  const masteryByPointId = {};
  const queue = [];
  for (const point of [...(chapter.knowledgePoints || [])].sort(compareNormalizedSourceOrder)) {
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
  const existingSession = chapter.reviewSession
    ? normalizeReviewSession(chapter.reviewSession, chapter)
    : null;
  if (existingSession?.status === "active") {
    chapter.reviewSession = existingSession;
  } else {
    chapter.reviewSession = createReviewSessionForChapter(chapter);
  }
  chapter.masteredPoints = currentMasteredCount(chapter, chapter.reviewSession);
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
  }).sort(compareNormalizedSourceOrder);
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

async function handleQuestionFeedback(deviceId, questionId, body = {}) {
  const chapters = await listStoredChapters(deviceId);
  const chapter = chapters.find((item) => item.questions?.some((question) => question.id === questionId));
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
  await upsertStoredChapter(deviceId, chapter);
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
  const deviceId = getDeviceId(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,x-device-id"
    });
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    const database = await checkDatabase();
    const count = hasDatabase ? await chapterCount() : Array.from(memoryByDeviceId.values()).reduce((sum, item) => sum + item.chapters.length, 0);
    sendJson(res, 200, {
      ok: true,
      service: "shibei-api",
      startedAt,
      storage: hasDatabase ? "postgres" : "memory",
      database,
      chapterCount: count,
      memoryChapterCount: count
    });
    return;
  }

  if (req.method === "POST" && (req.url === "/api/generate" || req.url === "/api/regenerate")) {
    await handleGenerate(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/quality-runs") {
    await handleCreateQualityRun(req, res);
    return;
  }

  const qualityRunExportMatch = req.url?.match(/^\/api\/quality-runs\/([^/]+)\/export\.csv$/);
  if (qualityRunExportMatch && req.method === "GET") {
    await handleExportQualityRun(req, res, decodeURIComponent(qualityRunExportMatch[1]));
    return;
  }

  const qualityRunAutoLabelMatch = req.url?.match(/^\/api\/quality-runs\/([^/]+)\/auto-label$/);
  if (qualityRunAutoLabelMatch && req.method === "POST") {
    await handleAutoLabelQualityRun(req, res, decodeURIComponent(qualityRunAutoLabelMatch[1]));
    return;
  }

  const qualityRunAnnotationMatch = req.url?.match(/^\/api\/quality-runs\/([^/]+)\/annotations$/);
  if (qualityRunAnnotationMatch && req.method === "POST") {
    await handleQualityRunAnnotation(req, res, decodeURIComponent(qualityRunAnnotationMatch[1]));
    return;
  }

  const qualityRunMatch = req.url?.match(/^\/api\/quality-runs\/([^/]+)$/);
  if (qualityRunMatch && req.method === "GET") {
    await handleGetQualityRun(req, res, decodeURIComponent(qualityRunMatch[1]));
    return;
  }

  if (req.method === "POST" && req.url === "/api/chapters") {
    await handleCreateChapter(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/chapters") {
    const chapters = await listStoredChapters(deviceId);
    sendJson(res, 200, { chapters: sortByCreatedAtDesc(serializeChaptersForClient(chapters)) });
    return;
  }

  if (req.method === "DELETE" && req.url === "/api/device-data") {
    const deleted = await deleteStoredDeviceData(deviceId);
    sendJson(res, 200, { ok: true, deleted });
    return;
  }

  const chapterMatch = req.url?.match(/^\/api\/chapters\/([^/]+)$/);
  if (chapterMatch && req.method === "GET") {
    const chapter = await getStoredChapter(deviceId, decodeURIComponent(chapterMatch[1]));
    if (!chapter) sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
    else sendJson(res, 200, { chapter: serializeChapterForClient(chapter) });
    return;
  }

  if (chapterMatch && req.method === "DELETE") {
    const chapterId = decodeURIComponent(chapterMatch[1]);
    const deleted = await deleteStoredChapter(deviceId, chapterId);
    if (!deleted) sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
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
    const chapter = await getStoredChapter(deviceId, decodeURIComponent(reviewSessionMatch[1]));
    if (!chapter) {
      sendJson(res, 404, { errorCode: "chapter_not_found", message: "章节不存在。" });
      return;
    }
    if (String(chapter.status || "") !== "completed") {
      sendJson(res, 422, { errorCode: "chapter_not_reviewable", message: "这个章节暂时不能开始复习。", chapter: serializeChapterForClient(chapter) });
      return;
    }
    const reviewSession = req.method === "POST"
      ? startOrResumeReviewSession(chapter)
      : chapter.reviewSession ? normalizeReviewSession(chapter.reviewSession, chapter) : null;
    if (reviewSession) chapter.reviewSession = reviewSession;
    await upsertStoredChapter(deviceId, chapter);
    const responseChapter = serializeChapterForClient(chapter);
    sendJson(res, 200, {
      chapter: responseChapter,
      reviewSession,
      currentQuestion: reviewSession && reviewSession.status !== "completed" ? currentQuestionForSession(responseChapter, reviewSession) : null
    });
    return;
  }

  const attemptMatch = req.url?.match(/^\/api\/review-sessions\/([^/]+)\/attempts$/);
  if (attemptMatch && req.method === "POST") {
    const sessionId = decodeURIComponent(attemptMatch[1]);
    const chapters = await listStoredChapters(deviceId);
    const chapter = chapters.find((item) => item.reviewSession?.id === sessionId);
    if (!chapter) {
      sendJson(res, 404, { errorCode: "review_session_not_found", message: "复习会话不存在。" });
      return;
    }
    try {
      const body = await readBody(req);
      const result = recordSessionAttempt(chapter, body);
      await upsertStoredChapter(deviceId, chapter);
      const responseChapter = serializeChapterForClient(chapter);
      sendJson(res, 200, {
        chapter: responseChapter,
        reviewSession: result.session,
        attempt: result.attempt,
        currentQuestion: result.session.status === "completed" ? null : currentQuestionForSession(responseChapter, result.session)
      });
    } catch (error) {
      sendJson(res, error.statusCode || 422, { errorCode: "attempt_not_recorded", message: error.message || "答题记录保存失败。" });
    }
    return;
  }

  const feedbackMatch = req.url?.match(/^\/api\/questions\/([^/]+)\/feedback$/);
  if (feedbackMatch && req.method === "POST") {
    const body = await readBody(req);
    const result = await handleQuestionFeedback(deviceId, decodeURIComponent(feedbackMatch[1]), body);
    if (!result) {
      sendJson(res, 404, { errorCode: "question_not_found", message: "题目不存在。" });
      return;
    }
    const responseChapter = serializeChapterForClient(result.chapter);
    sendJson(res, 200, {
      ...result,
      chapter: responseChapter,
      reviewSession: responseChapter.reviewSession
    });
    return;
  }

  if (req.method === "GET" && req.url === "/api/notifications") {
    const notifications = await listStoredNotifications(deviceId);
    sendJson(res, 200, { notifications: sortByCreatedAtDesc(serializeNotificationsForClient(notifications)) });
    return;
  }

  const notificationActionMatch = req.url?.match(/^\/api\/notifications\/([^/]+)\/(read|dismiss)$/);
  if (notificationActionMatch && req.method === "POST") {
    const notification = await getStoredNotification(deviceId, decodeURIComponent(notificationActionMatch[1]));
    if (!notification) {
      sendJson(res, 404, { errorCode: "notification_not_found", message: "通知不存在。" });
      return;
    }
    if (notificationActionMatch[2] === "read") notification.read = true;
    if (notificationActionMatch[2] === "dismiss") {
      notification.read = true;
      notification.dismissed = true;
    }
    const saved = await upsertStoredNotification(deviceId, notification);
    sendJson(res, 200, { notification: serializeNotificationForClient(saved) });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { errorCode: "method_not_allowed", message: "不支持的请求方法。" });
});

function startServer() {
  return initDatabase()
    .then((result) => {
      server.listen(port, host, () => {
        console.log(`拾贝 Demo 已启动：http://${host}:${port} (${result.storage})`);
      });
    })
    .catch((error) => {
      console.error("数据库初始化失败", error);
      process.exit(1);
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}

export { createReviewSessionForChapter, serializeChapterForClient, startOrResumeReviewSession };
