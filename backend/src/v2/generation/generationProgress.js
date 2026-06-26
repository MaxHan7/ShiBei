export const V2_GENERATION_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  RETRYING: "retrying",
  COMPLETED: "completed",
  FAILED: "failed"
});

export const V2_GENERATION_STAGE = Object.freeze({
  ACCEPTED: "accepted",
  EXTRACTING_SOURCE: "extracting_source",
  PLANNING_REVIEW_PATH: "planning_review_path",
  MAPPING_KNOWLEDGE: "mapping_knowledge",
  PLANNING_PRACTICE: "planning_practice",
  GENERATING_QUESTIONS: "generating_questions",
  GENERATING_UNIT_COPY: "generating_unit_copy",
  FINALIZING: "finalizing",
  RETRY_WAIT: "retry_wait",
  COMPLETED: "completed",
  FAILED: "failed"
});

const STAGE_COPY = {
  [V2_GENERATION_STAGE.ACCEPTED]: {
    displayText: "准备生成",
    stageGroup: "intake",
    progress: 0.03
  },
  [V2_GENERATION_STAGE.EXTRACTING_SOURCE]: {
    displayText: "正在提取原文",
    stageGroup: "source",
    progress: 0.1
  },
  [V2_GENERATION_STAGE.PLANNING_REVIEW_PATH]: {
    displayText: "正在分析文章",
    stageGroup: "planning",
    progress: 0.22
  },
  [V2_GENERATION_STAGE.MAPPING_KNOWLEDGE]: {
    displayText: "正在整理知识点",
    stageGroup: "knowledge",
    progress: 0.42
  },
  [V2_GENERATION_STAGE.PLANNING_PRACTICE]: {
    displayText: "正在设计练习",
    stageGroup: "practice",
    progress: 0.58
  },
  [V2_GENERATION_STAGE.GENERATING_QUESTIONS]: {
    displayText: "正在生成题目",
    stageGroup: "questions",
    progress: 0.76
  },
  [V2_GENERATION_STAGE.GENERATING_UNIT_COPY]: {
    displayText: "正在整理结果",
    stageGroup: "copy",
    progress: 0.9
  },
  [V2_GENERATION_STAGE.FINALIZING]: {
    displayText: "正在整理结果",
    stageGroup: "saving",
    progress: 0.96
  },
  [V2_GENERATION_STAGE.RETRY_WAIT]: {
    displayText: "正在重试生成",
    stageGroup: "retry",
    progress: null
  },
  [V2_GENERATION_STAGE.COMPLETED]: {
    displayText: "生成完成",
    stageGroup: "completed",
    progress: 1
  },
  [V2_GENERATION_STAGE.FAILED]: {
    displayText: "生成失败",
    stageGroup: "failed",
    progress: null
  }
};

const MODEL_STAGE_TO_PROGRESS_STAGE = {
  sourceMap: V2_GENERATION_STAGE.EXTRACTING_SOURCE,
  reviewPathPlan: V2_GENERATION_STAGE.PLANNING_REVIEW_PATH,
  unitKnowledgeMap: V2_GENERATION_STAGE.MAPPING_KNOWLEDGE,
  taskBriefPlan: V2_GENERATION_STAGE.PLANNING_PRACTICE,
  multipleChoiceDraftUnitBatch: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
  multipleChoiceDraftBatch: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
  matchingDraft: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
  matchingDraftBatch: V2_GENERATION_STAGE.GENERATING_QUESTIONS,
  unitCopyBatch: V2_GENERATION_STAGE.GENERATING_UNIT_COPY,
  qualityJudge: V2_GENERATION_STAGE.FINALIZING
};

export function mapV2ModelStageToProgressStage(modelStage) {
  return MODEL_STAGE_TO_PROGRESS_STAGE[modelStage] || modelStage || V2_GENERATION_STAGE.ACCEPTED;
}

export function buildV2GenerationProgress({
  jobId = "",
  chapterId = "",
  status = V2_GENERATION_STATUS.RUNNING,
  stage = V2_GENERATION_STAGE.ACCEPTED,
  stageGroup,
  displayText,
  progress,
  unitIndex = null,
  unitTitle = "",
  retryCount = 0,
  attempt = null,
  maxAttempts = null,
  canRetry = false,
  failureCode,
  failureMessage,
  updatedAt = new Date().toISOString()
} = {}) {
  const normalizedStage = stage || V2_GENERATION_STAGE.ACCEPTED;
  const copy = STAGE_COPY[normalizedStage] || {
    displayText: String(normalizedStage),
    stageGroup: "unknown",
    progress: null
  };
  const normalizedDisplayText = normalizeProgressDisplayText({
    status,
    stage: normalizedStage,
    displayText,
    failureMessage,
    fallbackText: copy.displayText
  });

  return {
    jobId: String(jobId || ""),
    chapterId: String(chapterId || ""),
    status,
    stage: normalizedStage,
    stageGroup: stageGroup || copy.stageGroup,
    displayText: normalizedDisplayText,
    progress: progress === undefined ? copy.progress : progress,
    userVisible: true,
    ...(unitIndex === null || unitIndex === undefined ? {} : { unitIndex: Number(unitIndex) }),
    ...(unitTitle ? { unitTitle: String(unitTitle) } : {}),
    retryCount: Number.isFinite(Number(retryCount)) ? Number(retryCount) : 0,
    ...(attempt === null || attempt === undefined ? {} : { attempt: Number(attempt) }),
    ...(maxAttempts === null || maxAttempts === undefined ? {} : { maxAttempts: Number(maxAttempts) }),
    canRetry: Boolean(canRetry),
    updatedAt,
    ...(failureCode ? { failureCode: String(failureCode) } : {}),
    ...(failureMessage ? { failureMessage: String(failureMessage) } : {})
  };
}

export async function emitV2GenerationProgress(onProgress, event) {
  if (typeof onProgress !== "function") return null;
  const progress = buildV2GenerationProgress(event);
  await onProgress(progress);
  return progress;
}

export function buildUnitProgressLabel({ unitIndex = null, unitTitle = "" } = {}) {
  const title = String(unitTitle || "").trim();
  if (title && Array.from(title).length <= 14) return `「${title}」`;
  const index = Number(unitIndex);
  if (Number.isFinite(index) && index >= 0) return `单元${index + 1}`;
  return "";
}

function normalizeProgressDisplayText({
  status,
  stage,
  displayText = "",
  failureMessage = "",
  fallbackText = ""
} = {}) {
  if (status === V2_GENERATION_STATUS.FAILED) {
    return truncateDisplayText(displayText || userFacingFailureText(failureMessage) || fallbackText || "生成失败", 12);
  }
  if (status === V2_GENERATION_STATUS.COMPLETED) return "生成完成";
  if (stage === V2_GENERATION_STAGE.RETRY_WAIT || status === V2_GENERATION_STATUS.RETRYING) {
    return "正在重试生成";
  }
  return truncateDisplayText(fallbackText || displayText || "正在生成", 12);
}

function userFacingFailureText(failureMessage) {
  const value = String(failureMessage || "").trim();
  if (!value) return "";
  if (value.includes("文章太长")) return "文章太长";
  if (value.includes("原文提取")) return "原文提取失败";
  if (value.includes("API Key") || value.includes("模型配置")) return "模型配置缺失";
  if (value.includes("请求超时") || value.toLowerCase().includes("timeout")) return "模型响应超时";
  return "";
}

function truncateDisplayText(text, maxCharacters) {
  const value = String(text || "").trim();
  if (!value) return "";
  const chars = Array.from(value);
  return chars.length <= maxCharacters ? value : `${chars.slice(0, maxCharacters).join("")}...`;
}
