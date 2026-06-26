import { generateReviewChapter } from "./generation/index.js";
import { STATUS_TEXT } from "./generation/types.js";
import { extractSourceContent } from "./sources/extractSourceContent.js";

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createSubmittedChapter(body = {}) {
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

export function createRegeneratingChapter(existing) {
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

export async function generateFromInput(body, options = {}) {
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

export async function regenerateFromChapter(chapter, options = {}) {
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

export function failedSourceResult({ status, message, body }) {
  return {
    status,
    displayStatusText: STATUS_TEXT[status] || "题目生成失败",
    errorCode: status,
    message,
    chapter: {
      title: body?.sourceTitle || body?.sourceUrl || body?.rawText?.slice?.(0, 24) || body?.title || "未生成章节",
      status,
      displayStatusText: STATUS_TEXT[status] || "题目生成失败",
      failureReason: message,
      source: {
        type: body?.sourceType || body?.source?.type || "text",
        title: body?.sourceTitle || body?.sourceUrl || body?.source?.title || "未生成章节",
        url: body?.sourceUrl || body?.source?.url || "",
        account: body?.sourceAccount || body?.source?.account || "",
        rawText: body?.rawText || body?.sourceUrl || body?.source?.rawText || "",
        cleanedText: body?.rawText || body?.source?.cleanedText || ""
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

export function generationTimeoutError() {
  const error = new Error("生成超时，请稍后重试。");
  error.code = "failed_questions";
  error.status = "failed_questions";
  return error;
}

export function withTimeout(promise, timeoutMs, makeError) {
  let timeout;
  return new Promise((resolve, reject) => {
    timeout = setTimeout(() => reject(makeError()), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

export async function createGenerationNotification({
  deviceId,
  chapter,
  deleteNotificationsForChapter,
  upsertNotification,
  sendPushNotifications = null
}) {
  if (!chapter?.id || chapter.dismissedFromNotifications) return null;
  const failed = String(chapter.status || "").startsWith("failed_");
  if (!failed) {
    await deleteNotificationsForChapter(deviceId, chapter.id, "generation_failed");
  }
  const type = failed ? "generation_failed" : "generation_completed";
  await deleteNotificationsForChapter(deviceId, chapter.id, type);
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
  const saved = await upsertNotification(deviceId, notification);
  if (sendPushNotifications) void sendPushNotifications(deviceId, saved, chapter);
  return saved;
}
