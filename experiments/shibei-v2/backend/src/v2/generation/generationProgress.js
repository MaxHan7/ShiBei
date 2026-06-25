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
    displayText: "已收到文章，准备生成",
    stageGroup: "intake",
    progress: 0.03
  },
  [V2_GENERATION_STAGE.EXTRACTING_SOURCE]: {
    displayText: "正在提取原文",
    stageGroup: "source",
    progress: 0.1
  },
  [V2_GENERATION_STAGE.PLANNING_REVIEW_PATH]: {
    displayText: "正在梳理文章结构",
    stageGroup: "planning",
    progress: 0.22
  },
  [V2_GENERATION_STAGE.MAPPING_KNOWLEDGE]: {
    displayText: "正在总结知识点",
    stageGroup: "knowledge",
    progress: 0.42
  },
  [V2_GENERATION_STAGE.PLANNING_PRACTICE]: {
    displayText: "正在规划复习题",
    stageGroup: "practice",
    progress: 0.58
  },
  [V2_GENERATION_STAGE.GENERATING_QUESTIONS]: {
    displayText: "正在生成复习题",
    stageGroup: "questions",
    progress: 0.76
  },
  [V2_GENERATION_STAGE.GENERATING_UNIT_COPY]: {
    displayText: "正在整理单元总结",
    stageGroup: "copy",
    progress: 0.9
  },
  [V2_GENERATION_STAGE.FINALIZING]: {
    displayText: "正在保存复习内容",
    stageGroup: "saving",
    progress: 0.96
  },
  [V2_GENERATION_STAGE.RETRY_WAIT]: {
    displayText: "生成遇到临时问题，正在重试",
    stageGroup: "retry",
    progress: null
  },
  [V2_GENERATION_STAGE.COMPLETED]: {
    displayText: "生成完成",
    stageGroup: "completed",
    progress: 1
  },
  [V2_GENERATION_STAGE.FAILED]: {
    displayText: "生成失败，请稍后重试",
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
  const unitLabel = buildUnitProgressLabel({ unitIndex, unitTitle });
  const normalizedDisplayText = displayText || failureMessage || (
    normalizedStage === V2_GENERATION_STAGE.GENERATING_QUESTIONS && unitLabel
      ? `正在为${unitLabel}生成题目`
      : normalizedStage === V2_GENERATION_STAGE.GENERATING_UNIT_COPY && unitLabel
        ? `正在整理${unitLabel}的总结`
        : copy.displayText
  );

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
