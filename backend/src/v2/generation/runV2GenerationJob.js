import { generateReviewPathV2 } from "./generateReviewPathV2.js";
import {
  calculateV2GenerationRetryDelayMs,
  classifyV2GenerationFailure
} from "./generationFailures.js";
import { assertV2ArticleInputWithinLimits } from "./generationLimits.js";
import {
  buildV2GenerationProgress,
  emitV2GenerationProgress,
  V2_GENERATION_STAGE,
  V2_GENERATION_STATUS
} from "./generationProgress.js";

export async function runV2GenerationJob(input, {
  generateReviewPath = generateReviewPathV2,
  modelUsageRecorder = null,
  createPromptCaller = undefined,
  generationMetaMode = "production",
  onProgress = null,
  now = new Date().toISOString()
} = {}) {
  const chapterId = String(input?.id || input?.chapterId || "");
  const jobId = String(input?.jobId || "");

  try {
    assertV2ArticleInputWithinLimits(input);
    await emitV2GenerationProgress(onProgress, {
      jobId,
      chapterId,
      status: V2_GENERATION_STATUS.RUNNING,
      stage: V2_GENERATION_STAGE.ACCEPTED,
      updatedAt: now
    });

    const chapter = await generateReviewPath(input, {
      modelUsageRecorder,
      ...(createPromptCaller ? { createPromptCaller } : {}),
      generationMetaMode,
      onProgress,
      now
    });
    const generationProgress = buildV2GenerationProgress({
      jobId,
      chapterId: chapter.id || chapterId,
      status: V2_GENERATION_STATUS.COMPLETED,
      stage: V2_GENERATION_STAGE.COMPLETED,
      updatedAt: now
    });
    await emitV2GenerationProgress(onProgress, generationProgress);
    const chapterWithProgress = {
      ...chapter,
      generationMeta: {
        ...(chapter.generationMeta || {}),
        v2Progress: generationProgress
      }
    };

    return {
      status: "completed",
      displayStatusText: "已生成",
      chapter: chapterWithProgress,
      generationMeta: chapterWithProgress.generationMeta ?? null,
      generationProgress
    };
  } catch (error) {
    const failureResult = mapV2GenerationError(error, { jobId, chapterId, now });
    await emitV2GenerationProgress(onProgress, failureResult.generationProgress);
    return failureResult;
  }
}

function mapV2GenerationError(error, { jobId = "", chapterId = "", now = new Date().toISOString() } = {}) {
  const failureClass = classifyV2GenerationFailure(error);
  return failure({
    ...failureClass,
    failureCode: failureClass.code,
    retryDelayMs: failureClass.retryable
      ? calculateV2GenerationRetryDelayMs({ attemptCount: Number(error?.retryAttempts || 1) })
      : 0,
    issues: error?.issues,
    errors: error?.errors,
    diagnostics: error?.diagnostics,
    ...(error?.modelStage ? { modelStage: error.modelStage } : {}),
    ...(error?.retryAttempts ? { retryAttempts: error.retryAttempts } : {}),
    ...(error?.runtimeErrorType ? { runtimeErrorType: error.runtimeErrorType } : {}),
    ...(error?.stageRuntime ? { stageRuntime: error.stageRuntime } : {}),
    jobId,
    chapterId,
    now
  });
}

function failure({
  status = "failed_generation",
  failedStage,
  failureReason,
  retryable,
  canRetry = retryable,
  displayStatusText = "生成失败",
  issues,
  errors,
  diagnostics,
  modelStage,
  retryAttempts,
  runtimeErrorType,
  stageRuntime,
  failureCode,
  retryDelayMs = 0,
  jobId = "",
  chapterId = "",
  now = new Date().toISOString()
}) {
  const generationProgress = buildV2GenerationProgress({
    jobId,
    chapterId,
    status: V2_GENERATION_STATUS.FAILED,
    stage: V2_GENERATION_STAGE.FAILED,
    canRetry,
    failureCode,
    failureMessage: failureReason,
    updatedAt: now
  });

  return {
    status,
    displayStatusText,
    failedStage,
    failureReason,
    retryable,
    canRetry,
    retryDelayMs,
    generationProgress,
    ...(modelStage ? { modelStage } : {}),
    ...(retryAttempts ? { retryAttempts } : {}),
    ...(runtimeErrorType ? { runtimeErrorType } : {}),
    ...(stageRuntime ? { stageRuntime } : {}),
    ...(issues ? { issues } : {}),
    ...(errors ? { errors } : {}),
    ...(diagnostics ? { diagnostics } : {})
  };
}
