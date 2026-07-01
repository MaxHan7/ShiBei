import {
  completeGenerationJob,
  failGenerationJob,
  getChapter,
  updateGenerationJob,
  upsertChapter
} from "../../db.js";
import { createGenerationNotification } from "../../chapterGeneration.js";
import {
  deleteNotificationsForChapter,
  upsertNotification
} from "../../db.js";
import { sendDatabasePushNotifications } from "../../notificationPush.js";
import { extractSourceContent as defaultExtractSourceContent } from "../../sources/extractSourceContent.js";
import { runV2GenerationJob } from "./runV2GenerationJob.js";
import {
  buildV2GenerationProgress,
  V2_GENERATION_STAGE,
  V2_GENERATION_STATUS
} from "./generationProgress.js";

export const V2_GENERATION_JOB_TYPES = Object.freeze([
  "v2_create_chapter",
  "v2_regenerate_chapter"
]);

export function isV2GenerationJob(job = {}) {
  return V2_GENERATION_JOB_TYPES.includes(job.jobType || job.job_type);
}

export async function runV2GenerationQueuedJob(job, deps = {}) {
  const services = {
    runV2GenerationJob,
    getChapter,
    upsertChapter,
    completeGenerationJob,
    failGenerationJob,
    updateGenerationJob,
    createNotification: defaultCreateNotification,
    extractSourceContent: defaultExtractSourceContent,
    ...deps
  };
  const queuedInput = buildV2QueuedGenerationInput(job);
  const existing = await services.getChapter(job.deviceId, job.chapterId);

  const simulatedResult = buildLocalDebugFailureResult(job);
  const result = simulatedResult || await runResolvedV2GenerationJob({
    job,
    input: queuedInput,
    services
  });
  const latest = await services.getChapter(job.deviceId, job.chapterId);
  if (existing && !latest) {
    await services.failGenerationJob(job.deviceId, job.id, {
      status: "cancelled",
      currentStage: "cancelled",
      errorMessage: "章节已删除，生成任务已取消。",
      retry: false,
      retryDelayMs: 0
    });
    return {
      status: "cancelled",
      displayStatusText: "已取消",
      failedStage: "cancelled",
      failureReason: "章节已删除，生成任务已取消。",
      retryable: false,
      canRetry: false,
      retryDelayMs: 0
    };
  }

  if (result.status === "completed") {
    const generationProgress =
      result.generationProgress ||
      result.chapter?.generationProgress ||
      result.chapter?.generationMeta?.v2Progress ||
      buildV2GenerationProgress({
        jobId: job.id,
        chapterId: job.chapterId,
        status: V2_GENERATION_STATUS.COMPLETED,
        stage: V2_GENERATION_STAGE.COMPLETED
      });
    const chapter = await services.upsertChapter(job.deviceId, {
      ...(result.chapter || {}),
      id: job.chapterId,
      status: "completed",
      displayStatusText: result.displayStatusText || "已生成",
      source: mergeV2ChapterSource(latest?.source || existing?.source, result.chapter?.source),
      generationProgress,
      generationMeta: {
        ...(result.chapter?.generationMeta || {}),
        v2Progress: generationProgress,
        generationProgress
      },
      createdAt: existing?.createdAt,
      updatedAt: new Date().toISOString()
    });
    await services.createNotification(job.deviceId, chapter);
    await services.completeGenerationJob(job.deviceId, job.id, {
      status: "completed",
      currentStage: "completed"
    });
    return result;
  }

  const retry = shouldRetryQueuedV2Job(job, result);
  const currentBeforeFailure = await services.getChapter(job.deviceId, job.chapterId);
  if (currentBeforeFailure?.status === "completed") {
    console.warn("Ignored stale V2 generation failure after chapter completion", {
      jobId: job.id,
      chapterId: job.chapterId,
      failedStage: result.failedStage || result.status,
      failureReason: result.failureReason || ""
    });
    await services.completeGenerationJob(job.deviceId, job.id, {
      status: "completed",
      currentStage: "completed"
    });
    return {
      status: "completed",
      displayStatusText: "已生成",
      staleFailureIgnored: true,
      chapter: currentBeforeFailure
    };
  }
  if (retry) {
    await persistV2GenerationProgress(
      job,
      buildRetryingProgress(job, result),
      services
    );
  } else {
    const failedChapter = await services.upsertChapter(job.deviceId, buildFailedV2Chapter({
      job,
      existing,
      result,
      input: queuedInput
    }));
    await services.createNotification(job.deviceId, failedChapter);
  }
  await services.failGenerationJob(job.deviceId, job.id, {
    status: result.status,
    currentStage: result.failedStage || result.status,
    errorMessage: result.failureReason || "生成失败",
    retry,
    retryDelayMs: result.retryDelayMs || 0
  });
  return result;
}

export function buildV2QueuedGenerationInput(job = {}) {
  const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
  const body = payload.body && typeof payload.body === "object" ? payload.body : payload;
  return {
    ...body,
    id: job.chapterId || body.id,
    chapterId: job.chapterId || body.chapterId,
    jobId: job.id || body.jobId
  };
}

async function runResolvedV2GenerationJob({ job, input, services }) {
  try {
    const resolvedInput = await resolveV2QueuedGenerationInput(job, input, services);
    return await services.runV2GenerationJob(resolvedInput, {
      generationMetaMode: "production",
      onProgress: (progress) => persistV2GenerationProgress(job, progress, services)
    });
  } catch (error) {
    return buildSourceExtractionFailureResult(job, error);
  }
}

async function resolveV2QueuedGenerationInput(job, input, services) {
  if (!isExtractableArticleSource(input.sourceType)) {
    return input;
  }

  await persistV2GenerationProgress(
    job,
    buildV2GenerationProgress({
      jobId: job.id,
      chapterId: job.chapterId,
      status: V2_GENERATION_STATUS.RUNNING,
      stage: V2_GENERATION_STAGE.EXTRACTING_SOURCE
    }),
    services
  );

  const source = await services.extractSourceContent({
    sourceType: "article_link",
    sourceUrl: input.sourceUrl,
    rawText: input.rawText,
    sourceTitle: input.sourceTitle,
    sourceAccount: input.sourceAccount
  });

  const resolvedInput = {
    ...input,
    sourceType: "text",
    originalSourceType: input.sourceType || source.sourceType,
    sourceTitle: source.sourceTitle || input.sourceTitle || input.title || "",
    sourceUrl: source.sourceUrl || input.sourceUrl || "",
    sourceAccount: source.sourceAccount || input.sourceAccount || "",
    rawText: source.rawText || "",
    cleanedText: source.rawText || "",
    source: {
      type: input.sourceType || source.sourceType,
      title: source.sourceTitle || input.sourceTitle || input.title || "",
      url: source.sourceUrl || input.sourceUrl || "",
      author: source.sourceAccount || input.sourceAccount || input.author || "",
      account: source.sourceAccount || input.sourceAccount || "",
      accountOrDomain: source.sourceAccount || input.sourceAccount || "",
      rawInput: input.sourceUrl || input.rawText || "",
      rawText: source.rawText || "",
      extractedText: source.rawText || "",
      cleanedText: source.rawText || ""
    }
  };

  await persistResolvedV2Source(job, resolvedInput, services);
  return resolvedInput;
}

function isExtractableArticleSource(sourceType) {
  return sourceType === "article_link" || sourceType === "wechat_article";
}

async function persistResolvedV2Source(job, resolvedInput, services) {
  const existing = await services.getChapter(job.deviceId, job.chapterId);
  if (!existing || existing.status === "completed") return;

  await services.upsertChapter(job.deviceId, {
    ...existing,
    title: resolvedInput.sourceTitle || existing.title,
    source: {
      ...(existing.source || {}),
      ...(resolvedInput.source || {})
    },
    sourceType: resolvedInput.originalSourceType || existing.sourceType,
    sourceText: resolvedInput.source?.rawInput || existing.sourceText || "",
    updatedAt: new Date().toISOString()
  });
}

async function persistV2GenerationProgress(job, progress, services) {
  const existing = await services.getChapter(job.deviceId, job.chapterId);
  if (existing?.status === "completed" && progress.status !== V2_GENERATION_STATUS.COMPLETED) {
    return;
  }
  if (existing) {
    await services.upsertChapter(job.deviceId, {
      ...existing,
      status: progress.status === "failed"
        ? "failed_generation"
        : (progress.status === "completed" ? "completed" : "submitted"),
      displayStatusText: progress.displayText || existing.displayStatusText,
      generationProgress: progress,
      generationMeta: {
        ...(existing.generationMeta || {}),
        v2Progress: progress
      },
      updatedAt: progress.updatedAt || new Date().toISOString()
    });
  }
  await services.updateGenerationJob(job.deviceId, job.id, {
    status: progress.status,
    currentStage: progress.stage,
    errorMessage: progress.failureMessage || ""
  });
}

function buildFailedV2Chapter({ job, existing, result, input }) {
  const now = new Date().toISOString();
  const progress = result.generationProgress || null;
  const title = existing?.title || input.title || input.sourceTitle || "生成中的章节";
  return {
    ...(existing || {}),
    id: job.chapterId,
    title,
    status: result.status || "failed_generation",
    displayStatusText: result.displayStatusText || "生成失败",
    failureReason: result.failureReason || "生成失败，请稍后重试。",
    generationProgress: progress,
    generationMeta: {
      ...(existing?.generationMeta || {}),
      v2Progress: progress,
      failedStage: result.failedStage || "",
      failureReason: result.failureReason || "",
      failureCode: result.generationProgress?.failureCode || "",
      ...(Array.isArray(result.errors) ? { errors: result.errors.slice(0, 12) } : {}),
      ...(Array.isArray(result.issues) ? { issues: result.issues.slice(0, 12) } : {}),
      ...(Array.isArray(result.diagnostics) ? { diagnostics: result.diagnostics.slice(0, 12) } : {}),
      ...(result.runtimeErrorType ? { runtimeErrorType: result.runtimeErrorType } : {}),
      ...(result.modelStage ? { modelStage: result.modelStage } : {})
    },
    source: existing?.source || {
      type: input.sourceType || "article",
      title,
      url: input.sourceUrl || "",
      rawInput: input.rawText || input.cleanedText || ""
    },
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };
}

function mergeV2ChapterSource(fallbackSource = {}, source = {}) {
  const merged = {
    ...(fallbackSource || {}),
    ...(source || {})
  };
  for (const key of ["author", "account", "accountOrDomain", "title", "url"]) {
    if (!toNonEmptyString(merged[key])) {
      const fallbackValue = toNonEmptyString(fallbackSource?.[key]);
      if (fallbackValue) merged[key] = fallbackValue;
    }
  }
  return merged;
}

function toNonEmptyString(value) {
  const text = String(value || "").trim();
  return text || "";
}

function buildRetryingProgress(job, result = {}) {
  return buildV2GenerationProgress({
    jobId: job.id,
    chapterId: job.chapterId,
    status: V2_GENERATION_STATUS.RETRYING,
    stage: V2_GENERATION_STAGE.RETRY_WAIT,
    retryCount: job.attemptCount || 0,
    attempt: job.attemptCount || 0,
    maxAttempts: job.maxAttempts || null,
    canRetry: true,
    failureCode: result.generationProgress?.failureCode || "",
    failureMessage: "生成遇到临时问题，正在重试",
    updatedAt: new Date().toISOString()
  });
}

function buildSourceExtractionFailureResult(job = {}, error) {
  const message = error instanceof Error
    ? error.message
    : "原文提取失败，请检查链接后重试。";
  const userFacingMessage = userFacingSourceExtractionFailure(message);
  const failureCode = error?.code || error?.status || "failed_extract_article";
  return {
    status: "failed_generation",
    displayStatusText: "原文提取失败",
    failedStage: "source_extraction",
    failureReason: userFacingMessage,
    retryable: false,
    canRetry: false,
    retryDelayMs: 0,
    generationProgress: buildV2GenerationProgress({
      jobId: job.id,
      chapterId: job.chapterId,
      status: V2_GENERATION_STATUS.FAILED,
      stage: V2_GENERATION_STAGE.FAILED,
      canRetry: false,
      failureCode,
      failureMessage: userFacingMessage
    })
  };
}

function userFacingSourceExtractionFailure(message = "") {
  const normalized = String(message || "").toLowerCase();
  if (normalized.includes("timeout") || message.includes("超时")) {
    return "原文链接访问超时，请稍后重试。";
  }
  if (message.includes("HTTP 403") || message.includes("HTTP 401")) {
    return "这个链接暂时无法公开访问。可以换一个链接，或稍后重试。";
  }
  if (message.includes("HTTP 404")) {
    return "没有找到这篇文章。可以检查链接是否正确。";
  }
  if (message.includes("正文太短") || message.includes("原文为空") || normalized.includes("empty")) {
    return "没有提取到可用于生成的正文。可以检查原文链接，或稍后重试。";
  }
  return "原文提取失败，请检查链接后重试。";
}

function shouldRetryQueuedV2Job(job = {}, result = {}) {
  if (!result.retryable) return false;
  const attemptCount = Number(job.attemptCount || job.attempt_count || 0);
  const maxAttempts = Number(job.maxAttempts || job.max_attempts || 0);
  if (!Number.isFinite(maxAttempts) || maxAttempts <= 0) return true;
  return attemptCount < maxAttempts;
}

function buildLocalDebugFailureResult(job = {}) {
  if (process.env.NODE_ENV === "production") return null;
  const payload = job.payload && typeof job.payload === "object" ? job.payload : {};
  const mode = payload.debugV2FailureMode || payload.body?.debugV2FailureMode || "";
  if (!mode) return null;
  if (mode === "structured_output_once" && Number(job.attemptCount || 0) <= 1) {
    return {
      status: "failed_generation",
      displayStatusText: "模型输出格式不稳定",
      failedStage: "structured_output",
      failureReason: "模型返回内容不是可解析 JSON，请重试。",
      retryable: true,
      canRetry: true,
      retryDelayMs: 500,
      generationProgress: buildV2GenerationProgress({
        jobId: job.id,
        chapterId: job.chapterId,
        status: V2_GENERATION_STATUS.FAILED,
        stage: V2_GENERATION_STAGE.FAILED,
        canRetry: true,
        failureCode: "structured_output_failed",
        failureMessage: "模型返回内容不是可解析 JSON，请重试。"
      })
    };
  }
  if (mode === "missing_api_key") {
    return {
      status: "failed_generation",
      displayStatusText: "模型配置缺失",
      failedStage: "model_calling",
      failureReason: "缺少模型 API Key。",
      retryable: false,
      canRetry: false,
      retryDelayMs: 0,
      generationProgress: buildV2GenerationProgress({
        jobId: job.id,
        chapterId: job.chapterId,
        status: V2_GENERATION_STATUS.FAILED,
        stage: V2_GENERATION_STAGE.FAILED,
        canRetry: false,
        failureCode: "missing_api_key",
        failureMessage: "缺少模型 API Key。"
      })
    };
  }
  return null;
}

async function defaultCreateNotification(deviceId, chapter) {
  return createGenerationNotification({
    deviceId,
    chapter,
    deleteNotificationsForChapter,
    upsertNotification,
    sendPushNotifications: sendDatabasePushNotifications
  });
}
