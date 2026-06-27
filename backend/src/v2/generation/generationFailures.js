const DEFAULT_RETRY_BASE_MS = 5_000;
const DEFAULT_RETRY_MAX_MS = 120_000;

export const V2_GENERATION_FAILURE_CODE = Object.freeze({
  INPUT_TOO_LONG: "input_too_long",
  EMPTY_ARTICLE_TEXT: "empty_article_text",
  MISSING_API_KEY: "missing_api_key",
  STRUCTURED_OUTPUT_FAILED: "structured_output_failed",
  PROVIDER_TIMEOUT: "provider_timeout",
  PROVIDER_RATE_LIMITED: "provider_rate_limited",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  CONTRACT_VALIDATION_FAILED: "contract_validation_failed",
  QUALITY_FAILED: "quality_failed",
  UNKNOWN: "unknown_generation_error"
});

export function classifyV2GenerationFailure(error) {
  const message = error instanceof Error ? error.message : String(error || "生成失败，请稍后重试。");
  const normalized = message.toLowerCase();
  const runtimeErrorType = error?.runtimeErrorType || "";

  if (error?.code === V2_GENERATION_FAILURE_CODE.INPUT_TOO_LONG) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.INPUT_TOO_LONG,
      status: "failed_input",
      failedStage: "input_validation",
      failureReason: message,
      retryable: false,
      canRetry: false,
      displayStatusText: "文章太长"
    });
  }

  if (error?.code === V2_GENERATION_FAILURE_CODE.EMPTY_ARTICLE_TEXT) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.EMPTY_ARTICLE_TEXT,
      status: "failed_input",
      failedStage: "input_validation",
      failureReason: message,
      retryable: false,
      canRetry: false,
      displayStatusText: "原文为空"
    });
  }

  if (isMissingApiKeyMessage(message)) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.MISSING_API_KEY,
      failedStage: "model_calling",
      failureReason: message,
      retryable: false,
      canRetry: false,
      displayStatusText: "模型配置缺失"
    });
  }

  if (Array.isArray(error?.issues)) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.QUALITY_FAILED,
      status: "failed_quality",
      failedStage: "quality_checking",
      failureReason: summarizeMessages(error.issues, message),
      retryable: false,
      canRetry: true,
      displayStatusText: "生成质量未通过"
    });
  }

  if (Array.isArray(error?.errors)) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.CONTRACT_VALIDATION_FAILED,
      failedStage: "contract_validation",
      failureReason: summarizeMessages(error.errors, message),
      retryable: false,
      canRetry: false,
      displayStatusText: "生成结果格式异常"
    });
  }

  if (runtimeErrorType === "timeout" || normalized.includes("timeout") || message.includes("请求超时")) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.PROVIDER_TIMEOUT,
      failedStage: error?.stage || "model_calling",
      failureReason: message,
      retryable: true,
      canRetry: true,
      displayStatusText: "模型响应超时"
    });
  }

  if (
    runtimeErrorType === "empty_structured_text" ||
    runtimeErrorType === "json_parse_error" ||
    runtimeErrorType === "schema_validation_error" ||
    message.includes("没有返回结构化文本") ||
    message.includes("模型返回内容不是可解析 JSON") ||
    normalized.includes("not parseable json") ||
    normalized.includes("failed validation")
  ) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.STRUCTURED_OUTPUT_FAILED,
      failedStage: error?.stage || "structured_output",
      failureReason: message,
      retryable: true,
      canRetry: true,
      displayStatusText: "模型输出格式不稳定"
    });
  }

  if (normalized.includes("rate limit") || normalized.includes("429") || normalized.includes("too many requests")) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.PROVIDER_RATE_LIMITED,
      failedStage: error?.stage || "model_calling",
      failureReason: message,
      retryable: true,
      canRetry: true,
      displayStatusText: "模型服务繁忙"
    });
  }

  if (
    normalized.includes("provider_error") ||
    normalized.includes("502") ||
    normalized.includes("503") ||
    normalized.includes("504") ||
    normalized.includes("service unavailable")
  ) {
    return failureClass({
      code: V2_GENERATION_FAILURE_CODE.PROVIDER_UNAVAILABLE,
      failedStage: error?.stage || "model_calling",
      failureReason: message,
      retryable: true,
      canRetry: true,
      displayStatusText: "模型服务暂时不可用"
    });
  }

  return failureClass({
    code: V2_GENERATION_FAILURE_CODE.UNKNOWN,
    failedStage: error?.stage || "generating_questions",
    failureReason: message,
    retryable: true,
    canRetry: true,
    displayStatusText: "生成失败"
  });
}

export function calculateV2GenerationRetryDelayMs({
  attemptCount = 1,
  baseMs = DEFAULT_RETRY_BASE_MS,
  maxMs = DEFAULT_RETRY_MAX_MS,
  random = Math.random
} = {}) {
  const normalizedAttempt = Math.max(1, Math.floor(Number(attemptCount) || 1));
  const rawDelay = Math.min(maxMs, baseMs * (4 ** (normalizedAttempt - 1)));
  const jitter = rawDelay * Math.max(0, Math.min(1, Number(random()) || 0));
  return Math.round(Math.min(maxMs, rawDelay + jitter));
}

function failureClass({
  code,
  status = "failed_generation",
  failedStage,
  failureReason,
  retryable,
  canRetry,
  displayStatusText
}) {
  return {
    code,
    status,
    failedStage,
    failureReason,
    retryable: Boolean(retryable),
    canRetry: Boolean(canRetry),
    displayStatusText
  };
}

function isMissingApiKeyMessage(message) {
  return (
    message.includes("API Key") ||
    message.includes("DEEPSEEK_API_KEY") ||
    message.includes("OPENAI_API_KEY")
  );
}

function summarizeMessages(items, fallback) {
  if (!Array.isArray(items)) return fallback;
  const messages = items
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.message || item?.code || "";
    })
    .filter(Boolean);
  return messages.join("；") || fallback;
}
