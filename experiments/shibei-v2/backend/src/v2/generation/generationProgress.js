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
  COMPLETED: "completed",
  FAILED: "failed"
});

const STAGE_COPY = {
  [V2_GENERATION_STAGE.ACCEPTED]: {
    displayText: "已收到文章，准备生成",
    progress: 0.03
  },
  [V2_GENERATION_STAGE.EXTRACTING_SOURCE]: {
    displayText: "正在整理正文",
    progress: 0.1
  },
  [V2_GENERATION_STAGE.PLANNING_REVIEW_PATH]: {
    displayText: "正在拆分章节脉络",
    progress: 0.22
  },
  [V2_GENERATION_STAGE.MAPPING_KNOWLEDGE]: {
    displayText: "正在提取关键知识点",
    progress: 0.42
  },
  [V2_GENERATION_STAGE.PLANNING_PRACTICE]: {
    displayText: "正在规划练习重点",
    progress: 0.58
  },
  [V2_GENERATION_STAGE.GENERATING_QUESTIONS]: {
    displayText: "正在生成复习题",
    progress: 0.76
  },
  [V2_GENERATION_STAGE.GENERATING_UNIT_COPY]: {
    displayText: "正在整理单元总结",
    progress: 0.9
  },
  [V2_GENERATION_STAGE.FINALIZING]: {
    displayText: "正在收尾",
    progress: 0.96
  },
  [V2_GENERATION_STAGE.COMPLETED]: {
    displayText: "已生成",
    progress: 1
  },
  [V2_GENERATION_STAGE.FAILED]: {
    displayText: "生成失败，请稍后重试",
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
  displayText,
  progress,
  retryCount = 0,
  canRetry = false,
  failureCode,
  failureMessage,
  updatedAt = new Date().toISOString()
} = {}) {
  const normalizedStage = stage || V2_GENERATION_STAGE.ACCEPTED;
  const copy = STAGE_COPY[normalizedStage] || {
    displayText: String(normalizedStage),
    progress: null
  };

  return {
    jobId: String(jobId || ""),
    chapterId: String(chapterId || ""),
    status,
    stage: normalizedStage,
    displayText: displayText || failureMessage || copy.displayText,
    progress: progress === undefined ? copy.progress : progress,
    retryCount: Number.isFinite(Number(retryCount)) ? Number(retryCount) : 0,
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
