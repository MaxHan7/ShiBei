import { STATUS_TEXT } from "./generation/types.js";
import {
  completeGenerationJob,
  deleteNotificationsForChapter,
  failGenerationJob,
  getChapter,
  getNotification,
  listPushTokens,
  shouldRetryGenerationJob,
  updateGenerationJob,
  upsertChapter,
  upsertNotification
} from "./db.js";
import { isAPNSConfigured, sendGenerationNotification } from "./apns.js";
import {
  createGenerationNotification,
  failedSourceResult,
  generateFromInput,
  generationTimeoutError,
  regenerateFromChapter,
  withTimeout
} from "./chapterGeneration.js";
import {
  isV2GenerationJob,
  runV2GenerationQueuedJob
} from "./v2/generation/v2GenerationJobRunner.js";

const GENERATION_JOB_TIMEOUT_MS = readPositiveInt(process.env.GENERATION_JOB_TIMEOUT_MS, 360_000);

export async function runGenerationJob(job, options = {}) {
  if (isV2GenerationJob(job)) {
    return runV2GenerationQueuedJob(job);
  }

  const timeoutMs = readPositiveInt(options.timeoutMs, GENERATION_JOB_TIMEOUT_MS);
  const body = job.payload?.body || job.payload || {};
  const updateStage = (status) => updateStoredChapterStage(job, status).catch((error) => {
    console.error("Failed to update worker generation stage", error);
  });

  try {
    const result = await withTimeout(
      runGenerationByType(job, body, updateStage),
      timeoutMs,
      () => generationTimeoutError()
    );
    const status = result.chapter?.status || result.status || "failed_questions";
    if (status === "completed") {
      await completeGenerationJob(job.deviceId, job.id, {
        status,
        currentStage: status
      });
    } else {
      await failGenerationJob(job.deviceId, job.id, {
        status,
        currentStage: status,
        errorMessage: result.message || result.chapter?.failureReason || "生成失败",
        retry: false
      });
    }
    return result;
  } catch (error) {
    const status = error?.code || error?.status || "failed_questions";
    const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";
    const retry = isRetryableGenerationError(error) && shouldRetryGenerationJob(job);
    if (retry) {
      await failGenerationJob(job.deviceId, job.id, {
        status,
        currentStage: status,
        errorMessage: message,
        retry: true
      });
      return { status: "queued_for_retry", message };
    }

    const failed = failedSourceResult({ status, message, body });
    const existing = await getChapter(job.deviceId, job.chapterId);
    const chapter = await upsertChapter(job.deviceId, {
      ...failed.chapter,
      id: job.chapterId,
      createdAt: existing?.createdAt
    });
    await createDatabaseNotification(job.deviceId, chapter);
    await failGenerationJob(job.deviceId, job.id, {
      status,
      currentStage: status,
      errorMessage: message,
      retry: false
    });
    return { ...failed, chapter };
  }
}

async function runGenerationByType(job, body, updateStage) {
  if (job.jobType === "regenerate_chapter") {
    const existing = await getChapter(job.deviceId, job.chapterId);
    if (!existing) {
      const error = new Error("章节不存在。");
      error.code = "failed_questions";
      error.status = "failed_questions";
      throw error;
    }
    await updateStage("generating_points");
    const result = await regenerateFromChapter(existing, { onStage: updateStage });
    const chapter = await upsertChapter(job.deviceId, {
      ...(result.chapter || {}),
      id: existing.id,
      createdAt: existing.createdAt
    });
    await createDatabaseNotification(job.deviceId, chapter);
    return { ...result, chapter };
  }

  await updateStage("extracting_content");
  const result = await generateFromInput(body, { onStage: updateStage });
  const existing = await getChapter(job.deviceId, job.chapterId);
  const chapter = await upsertChapter(job.deviceId, {
    ...(result.chapter || failedSourceResult({
      status: result.status,
      message: result.message || "生成失败",
      body
    }).chapter),
    id: job.chapterId,
    createdAt: existing?.createdAt
  });
  await createDatabaseNotification(job.deviceId, chapter);
  return { ...result, chapter };
}

async function updateStoredChapterStage(job, status) {
  const chapter = await getChapter(job.deviceId, job.chapterId);
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
  await upsertChapter(job.deviceId, chapter);
  await updateGenerationJob(job.deviceId, job.id, {
    status,
    currentStage: status
  });
}

async function createDatabaseNotification(deviceId, chapter) {
  return createGenerationNotification({
    deviceId,
    chapter,
    deleteNotificationsForChapter,
    upsertNotification,
    sendPushNotifications: sendDatabasePushNotifications
  });
}

async function sendDatabasePushNotifications(deviceId, notification, chapter) {
  if (!notification || notification.dismissed) return { skipped: true, reason: "notification_unavailable" };
  if (!isAPNSConfigured()) {
    await updateNotificationPushDelivery(deviceId, notification, {
      status: "apns_not_configured",
      error: "APNs is not configured."
    });
    return { skipped: true, reason: "apns_not_configured" };
  }

  const tokens = await listPushTokens(deviceId);
  if (tokens.length === 0) {
    await updateNotificationPushDelivery(deviceId, notification, {
      status: "no_tokens",
      error: "No APNs token registered for this device."
    });
    return { skipped: true, reason: "no_tokens" };
  }

  const results = await Promise.all(tokens.map(async (token) => {
    const result = await sendGenerationNotification({ token, notification, chapter });
    return { token, result };
  }));
  const sentCount = results.filter(({ result }) => result?.ok).length;
  const failedResult = results.find(({ result }) => result && !result.skipped && !result.ok)?.result;
  await updateNotificationPushDelivery(deviceId, notification, {
    sent: sentCount > 0,
    status: sentCount > 0 ? "sent" : "failed",
    error: sentCount > 0 ? "" : (failedResult?.body || failedResult?.status || "APNs send failed.")
  });
  return { sentCount, tokenCount: tokens.length };
}

async function updateNotificationPushDelivery(deviceId, notification, delivery = {}) {
  const current = await getNotification(deviceId, notification.id) || notification;
  const now = new Date().toISOString();
  const next = {
    ...current,
    pushAttemptedAt: now,
    pushSentAt: delivery.sent ? now : current.pushSentAt,
    pushDeliveryStatus: delivery.status || current.pushDeliveryStatus || "",
    pushDeliveryError: delivery.error === undefined ? current.pushDeliveryError || "" : String(delivery.error),
    pushAttemptCount: Number(current.pushAttemptCount || 0) + 1
  };
  await upsertNotification(deviceId, next);
  return next;
}

function isRetryableGenerationError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  const status = error?.code || error?.status || "";
  if (status === "failed_extract_article" || status === "failed_extract_video" || status === "failed_points") return false;
  if (message.includes("API Key") || message.includes("OPENAI_API_KEY") || message.includes("DEEPSEEK_API_KEY")) return false;
  if (message.includes("内容太短") || message.includes("暂未接入视频")) return false;
  return true;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}
