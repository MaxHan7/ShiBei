import { generateReviewPathV2 } from "./generateReviewPathV2.js";

export async function runV2GenerationJob(input, {
  generateReviewPath = generateReviewPathV2,
  modelUsageRecorder = null,
  createPromptCaller = undefined,
  generationMetaMode = "production",
  now = new Date().toISOString()
} = {}) {
  try {
    const chapter = await generateReviewPath(input, {
      modelUsageRecorder,
      ...(createPromptCaller ? { createPromptCaller } : {}),
      generationMetaMode,
      now
    });
    return {
      status: "completed",
      displayStatusText: "已生成",
      chapter,
      generationMeta: chapter.generationMeta ?? null
    };
  } catch (error) {
    return mapV2GenerationError(error);
  }
}

function mapV2GenerationError(error) {
  const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";

  if (message.includes("API Key") || message.includes("DEEPSEEK_API_KEY") || message.includes("OPENAI_API_KEY")) {
    return failure({
      failedStage: "model_calling",
      failureReason: message,
      retryable: true
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
      stageRuntime: error.stageRuntime
    });
  }

  if (Array.isArray(error?.errors)) {
    return failure({
      failedStage: "contract_validation",
      failureReason: error.errors.join("；"),
      retryable: false,
      errors: error.errors,
      stageRuntime: error.stageRuntime
    });
  }

  return failure({
    failedStage: error?.stage || "generating_questions",
    failureReason: message,
    retryable: true,
    ...(error?.modelStage ? { modelStage: error.modelStage } : {}),
    ...(error?.retryAttempts ? { retryAttempts: error.retryAttempts } : {}),
    ...(error?.runtimeErrorType ? { runtimeErrorType: error.runtimeErrorType } : {}),
    ...(error?.stageRuntime ? { stageRuntime: error.stageRuntime } : {})
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
  stageRuntime
}) {
  return {
    status,
    displayStatusText: "生成失败",
    failedStage,
    failureReason,
    retryable,
    ...(modelStage ? { modelStage } : {}),
    ...(retryAttempts ? { retryAttempts } : {}),
    ...(runtimeErrorType ? { runtimeErrorType } : {}),
    ...(stageRuntime ? { stageRuntime } : {}),
    ...(issues ? { issues } : {}),
    ...(errors ? { errors } : {}),
    ...(diagnostics ? { diagnostics } : {})
  };
}
