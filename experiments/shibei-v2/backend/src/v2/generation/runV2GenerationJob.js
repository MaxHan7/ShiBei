import { generateReviewPathV2 } from "./generateReviewPathV2.js";
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

    return {
      status: "completed",
      displayStatusText: "已生成",
      chapter,
      generationMeta: chapter.generationMeta ?? null,
      generationProgress
    };
  } catch (error) {
    const failureResult = mapV2GenerationError(error, { jobId, chapterId, now });
    await emitV2GenerationProgress(onProgress, failureResult.generationProgress);
    return failureResult;
  }
}

function mapV2GenerationError(error, { jobId = "", chapterId = "", now = new Date().toISOString() } = {}) {
  const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";

  if (error?.code === "input_too_long") {
    return failure({
      status: "failed_input",
      failedStage: "input_validation",
      failureReason: message,
      retryable: false,
      failureCode: "input_too_long",
      jobId,
      chapterId,
      now
    });
  }

  if (message.includes("API Key") || message.includes("DEEPSEEK_API_KEY") || message.includes("OPENAI_API_KEY")) {
    return failure({
      failedStage: "model_calling",
      failureReason: message,
      retryable: true,
      jobId,
      chapterId,
      now
    });
  }

  if (Array.isArray(error?.issues)) {
    return failure({
      status: "failed_quality",
      failedStage: "quality_checking",
      failureReason: error.issues.map((issue) => issue.message || issue.code).join("；") || message,
      retryable: true,
      issues: error.issues,
      diagnostics: error.diagnostics,
      stageRuntime: error.stageRuntime,
      jobId,
      chapterId,
      now
    });
  }

  if (Array.isArray(error?.errors)) {
    return failure({
      failedStage: "contract_validation",
      failureReason: error.errors.join("；"),
      retryable: false,
      errors: error.errors,
      stageRuntime: error.stageRuntime,
      jobId,
      chapterId,
      now
    });
  }

  return failure({
    failedStage: error?.stage || "generating_questions",
    failureReason: message,
    retryable: true,
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
  issues,
  errors,
  diagnostics,
  modelStage,
  retryAttempts,
  runtimeErrorType,
  stageRuntime,
  failureCode,
  jobId = "",
  chapterId = "",
  now = new Date().toISOString()
}) {
  const generationProgress = buildV2GenerationProgress({
    jobId,
    chapterId,
    status: V2_GENERATION_STATUS.FAILED,
    stage: V2_GENERATION_STAGE.FAILED,
    canRetry: retryable,
    failureCode,
    failureMessage: failureReason,
    updatedAt: now
  });

  return {
    status,
    displayStatusText: "生成失败",
    failedStage,
    failureReason,
    retryable,
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
