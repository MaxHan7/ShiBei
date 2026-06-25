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
    ...deps
  };
  const input = buildV2QueuedGenerationInput(job);
  const existing = await services.getChapter(job.deviceId, job.chapterId);

  const simulatedResult = buildLocalDebugFailureResult(job);
  const result = simulatedResult || await services.runV2GenerationJob(input, {
    generationMetaMode: "production",
    onProgress: (progress) => persistV2GenerationProgress(job, progress, services)
  });

  if (result.status === "completed") {
    const chapter = await services.upsertChapter(job.deviceId, {
      ...(result.chapter || {}),
      id: job.chapterId,
      createdAt: existing?.createdAt
    });
    await services.createNotification(job.deviceId, chapter);
    await services.completeGenerationJob(job.deviceId, job.id, {
      status: "completed",
      currentStage: "completed"
    });
    return result;
  }

  const retry = Boolean(result.retryable);
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
      input
    }));
    await services.createNotification(job.deviceId, failedChapter);
  }
  await services.failGenerationJob(job.deviceId, job.id, {
    status: result.status,
    currentStage: result.failedStage || result.status,
    errorMessage: result.failureReason || "生成失败",
    retry: Boolean(result.retryable),
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

async function persistV2GenerationProgress(job, progress, services) {
  const existing = await services.getChapter(job.deviceId, job.chapterId);
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
      failureCode: result.generationProgress?.failureCode || ""
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
    upsertNotification
  });
}
