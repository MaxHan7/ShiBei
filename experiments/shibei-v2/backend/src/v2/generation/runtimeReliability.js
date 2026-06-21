const ERROR_MESSAGE_PREVIEW_LENGTH = 240;

export function createStageRuntimeRecorder() {
  const attempts = [];
  let nextCallIndex = 0;

  return {
    nextCallId(stage) {
      nextCallIndex += 1;
      return `${stage}-${nextCallIndex}`;
    },
    recordAttempt(event) {
      attempts.push(normalizeAttemptEvent(event));
    },
    summary() {
      return summarizeStageRuntime(attempts);
    },
    records() {
      return attempts.map((attempt) => ({ ...attempt }));
    }
  };
}

export function classifyModelRuntimeError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();

  if (
    message.includes("没有返回结构化文本") ||
    message.includes("DeepSeek 没有返回结构化文本") ||
    normalized.includes("no structured text")
  ) {
    return "empty_structured_text";
  }

  if (
    message.includes("模型返回内容不是可解析 JSON") ||
    normalized.includes("not parseable json") ||
    normalized.includes("invalid_json") ||
    normalized.includes("no_json_object") ||
    normalized.includes("json parse")
  ) {
    return "json_parse_error";
  }

  if (message.includes("output failed validation") || message.includes("failed validation")) {
    return "schema_validation_error";
  }

  if (message.includes("请求超时") || normalized.includes("timeout")) {
    return "timeout";
  }

  if (
    message.includes("请求失败") ||
    normalized.includes("rate limit") ||
    normalized.includes("quota") ||
    normalized.includes("api key")
  ) {
    return "provider_error";
  }

  return "unknown";
}

export function attachStageRuntimeToError(error, stageRuntime) {
  if (!error || typeof error !== "object" || !stageRuntime) return error;
  error.stageRuntime = stageRuntime;
  return error;
}

function normalizeAttemptEvent(event) {
  const error = event?.error || null;
  const errorType = error ? classifyModelRuntimeError(error) : "";
  return {
    callId: String(event?.callId || ""),
    stage: String(event?.stage || ""),
    modelStage: String(event?.modelStage || ""),
    attempt: Number.isInteger(event?.attempt) ? event.attempt : 0,
    maxAttempts: Number.isInteger(event?.maxAttempts) ? event.maxAttempts : 0,
    status: event?.status === "success" ? "success" : "failed",
    durationMs: Number.isFinite(event?.durationMs) ? Math.max(0, Math.round(event.durationMs)) : 0,
    retryable: Boolean(event?.retryable),
    errorType,
    errorMessage: error ? previewErrorMessage(error) : ""
  };
}

function summarizeStageRuntime(attempts) {
  const safeAttempts = Array.isArray(attempts) ? attempts : [];
  const stageMap = new Map();
  const callMap = new Map();

  for (const attempt of safeAttempts) {
    const stage = attempt.stage || attempt.modelStage || "unknown";
    const stageSummary = stageMap.get(stage) || {
      stage,
      callCount: 0,
      successCallCount: 0,
      failedCallCount: 0,
      attemptCount: 0,
      retryAttemptCount: 0,
      transientFailureCount: 0,
      totalDurationMs: 0,
      errorTypes: {},
      lastErrorType: "",
      lastErrorMessage: ""
    };
    stageSummary.attemptCount += 1;
    stageSummary.totalDurationMs += attempt.durationMs || 0;
    if (attempt.attempt > 1) stageSummary.retryAttemptCount += 1;
    if (attempt.status === "failed") {
      stageSummary.transientFailureCount += 1;
      if (attempt.errorType) {
        stageSummary.errorTypes[attempt.errorType] = (stageSummary.errorTypes[attempt.errorType] || 0) + 1;
        stageSummary.lastErrorType = attempt.errorType;
      }
      if (attempt.errorMessage) stageSummary.lastErrorMessage = attempt.errorMessage;
    }
    stageMap.set(stage, stageSummary);

    const call = callMap.get(attempt.callId) || {
      stage,
      status: "failed"
    };
    if (attempt.status === "success") call.status = "success";
    callMap.set(attempt.callId, call);
  }

  for (const call of callMap.values()) {
    const stageSummary = stageMap.get(call.stage);
    if (!stageSummary) continue;
    stageSummary.callCount += 1;
    if (call.status === "success") {
      stageSummary.successCallCount += 1;
    } else {
      stageSummary.failedCallCount += 1;
    }
  }

  const stages = Array.from(stageMap.values()).map((stage) => ({
    ...stage,
    totalDurationMs: Math.round(stage.totalDurationMs)
  }));
  return {
    schemaVersion: "v2_stage_runtime_1",
    callCount: callMap.size,
    attemptCount: safeAttempts.length,
    failedAttemptCount: safeAttempts.filter((attempt) => attempt.status === "failed").length,
    retryAttemptCount: safeAttempts.filter((attempt) => attempt.attempt > 1).length,
    stages,
    attempts: safeAttempts
  };
}

function previewErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.slice(0, ERROR_MESSAGE_PREVIEW_LENGTH);
}
