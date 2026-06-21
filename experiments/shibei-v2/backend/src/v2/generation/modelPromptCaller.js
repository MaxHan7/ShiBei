import { callOpenAIJson } from "../../generation/openaiClient.js";
import { classifyModelRuntimeError } from "./runtimeReliability.js";
import { buildV2PromptMessages } from "./prompts/buildV2PromptMessages.js";
import {
  ECD_PLANNING_OUTPUT_SCHEMA,
  ECD_PLANNING_PROMPT_SCHEMA_NAME
} from "./prompts/ecdPlanning.js";
import {
  MATCHING_DRAFT_OUTPUT_SCHEMA,
  MATCHING_DRAFT_PROMPT_SCHEMA_NAME
} from "./prompts/matchingDraft.js";
import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  MULTIPLE_CHOICE_DRAFT_PROMPT_SCHEMA_NAME
} from "./prompts/multipleChoiceDraft.js";
import {
  QUALITY_JUDGE_OUTPUT_SCHEMA,
  QUALITY_JUDGE_PROMPT_SCHEMA_NAME
} from "./prompts/qualityJudge.js";
import {
  QUESTION_DRAFT_BATCH_OUTPUT_SCHEMA,
  QUESTION_DRAFT_BATCH_PROMPT_SCHEMA_NAME
} from "./prompts/questionDraftBatch.js";
import {
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME
} from "./prompts/reviewPathPlan.js";
import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  SOURCE_MAP_PROMPT_SCHEMA_NAME
} from "./prompts/sourceMap.js";
import {
  TASK_BRIEF_PLAN_OUTPUT_SCHEMA,
  TASK_BRIEF_PLAN_PROMPT_SCHEMA_NAME
} from "./prompts/taskBriefPlan.js";
import {
  UNIT_KNOWLEDGE_MAP_OUTPUT_SCHEMA,
  UNIT_KNOWLEDGE_MAP_PROMPT_SCHEMA_NAME
} from "./prompts/unitKnowledgeMap.js";
import {
  UNIT_COPY_BATCH_OUTPUT_SCHEMA,
  UNIT_COPY_BATCH_PROMPT_SCHEMA_NAME
} from "./prompts/unitCopyBatch.js";
import {
  UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA,
  UNIT_PRACTICE_PLAN_PROMPT_SCHEMA_NAME
} from "./prompts/unitPracticePlan.js";
import {
  UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA,
  UNIT_SUMMARY_DRAFT_PROMPT_SCHEMA_NAME
} from "./prompts/unitSummaryDraft.js";

const STAGE_SCHEMAS = {
  sourceMap: {
    schemaName: SOURCE_MAP_PROMPT_SCHEMA_NAME,
    schema: SOURCE_MAP_OUTPUT_SCHEMA,
    estimatedOutputTokens: 7600
  },
  reviewPathPlan: {
    schemaName: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
    schema: REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
    estimatedOutputTokens: 3200
  },
  unitKnowledgeMap: {
    schemaName: UNIT_KNOWLEDGE_MAP_PROMPT_SCHEMA_NAME,
    schema: UNIT_KNOWLEDGE_MAP_OUTPUT_SCHEMA,
    estimatedOutputTokens: 7200
  },
  ecdPlanning: {
    schemaName: ECD_PLANNING_PROMPT_SCHEMA_NAME,
    schema: ECD_PLANNING_OUTPUT_SCHEMA,
    estimatedOutputTokens: 3000
  },
  taskBriefPlan: {
    schemaName: TASK_BRIEF_PLAN_PROMPT_SCHEMA_NAME,
    schema: TASK_BRIEF_PLAN_OUTPUT_SCHEMA,
    estimatedOutputTokens: 5600
  },
  questionDraftBatch: {
    schemaName: QUESTION_DRAFT_BATCH_PROMPT_SCHEMA_NAME,
    schema: QUESTION_DRAFT_BATCH_OUTPUT_SCHEMA,
    estimatedOutputTokens: 9000
  },
  unitCopyBatch: {
    schemaName: UNIT_COPY_BATCH_PROMPT_SCHEMA_NAME,
    schema: UNIT_COPY_BATCH_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2400
  },
  unitPracticePlan: {
    schemaName: UNIT_PRACTICE_PLAN_PROMPT_SCHEMA_NAME,
    schema: UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA,
    estimatedOutputTokens: 1600
  },
  multipleChoiceDraft: {
    schemaName: MULTIPLE_CHOICE_DRAFT_PROMPT_SCHEMA_NAME,
    schema: MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2200
  },
  matchingDraft: {
    schemaName: MATCHING_DRAFT_PROMPT_SCHEMA_NAME,
    schema: MATCHING_DRAFT_OUTPUT_SCHEMA,
    estimatedOutputTokens: 3200
  },
  unitSummaryDraft: {
    schemaName: UNIT_SUMMARY_DRAFT_PROMPT_SCHEMA_NAME,
    schema: UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA,
    estimatedOutputTokens: 900
  },
  qualityJudge: {
    schemaName: QUALITY_JUDGE_PROMPT_SCHEMA_NAME,
    schema: QUALITY_JUDGE_OUTPUT_SCHEMA,
    estimatedOutputTokens: 900
  }
};

const DEFAULT_MODEL_JSON_RETRY_COUNT = 2;

export function createV2ModelPromptCaller({
  modelJsonCaller = callOpenAIJson,
  modelUsageRecorder = null,
  runtimeRecorder = null,
  retryCount = readOptionalNonNegativeInt(process.env.V2_MODEL_JSON_RETRIES) ?? DEFAULT_MODEL_JSON_RETRY_COUNT
} = {}) {
  return async function callV2ModelPrompt(stage, payload) {
    const stageConfig = STAGE_SCHEMAS[stage];
    if (!stageConfig) {
      throw new Error(`Unsupported V2 model prompt stage: ${stage}`);
    }

    const messages = buildV2PromptMessages(stage, payload);
    const request = {
      system: messages.system,
      user: messages.user,
      schemaName: stageConfig.schemaName,
      schema: schemaForModel(stageConfig.schema),
      stage: `v2_${stage}`,
      modelUsageRecorder,
      estimatedOutputTokens: stageConfig.estimatedOutputTokens
    };

    let lastError;
    const callId = runtimeRecorder && typeof runtimeRecorder.nextCallId === "function"
      ? runtimeRecorder.nextCallId(stage)
      : "";
    const maxAttempts = retryCount + 1;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      const startedAt = Date.now();
      try {
        const output = await modelJsonCaller(request);
        recordRuntimeAttempt(runtimeRecorder, {
          callId,
          stage: `v2_${stage}`,
          modelStage: stage,
          attempt: attempt + 1,
          maxAttempts,
          status: "success",
          durationMs: Date.now() - startedAt,
          retryable: false
        });
        return output;
      } catch (error) {
        lastError = error;
        const retryable = isRetryableJsonModelError(error);
        recordRuntimeAttempt(runtimeRecorder, {
          callId,
          stage: `v2_${stage}`,
          modelStage: stage,
          attempt: attempt + 1,
          maxAttempts,
          status: "failed",
          durationMs: Date.now() - startedAt,
          retryable: retryable && attempt < retryCount,
          error
        });
        if (!retryable || attempt >= retryCount) {
          annotatePromptStageError(error, stage, attempt + 1);
          throw error;
        }
      }
    }
    annotatePromptStageError(lastError, stage, retryCount + 1);
    throw lastError;
  };
}

function annotatePromptStageError(error, stage, attemptCount) {
  if (!error || typeof error !== "object") return;
  error.stage = `v2_${stage}`;
  error.modelStage = stage;
  error.retryAttempts = attemptCount;
  error.runtimeErrorType = classifyModelRuntimeError(error);
}

function recordRuntimeAttempt(runtimeRecorder, event) {
  if (!runtimeRecorder || typeof runtimeRecorder.recordAttempt !== "function") return;
  runtimeRecorder.recordAttempt(event);
}

function schemaForModel(schema) {
  const { name: _name, ...schemaWithoutName } = schema;
  return schemaWithoutName;
}

function isRetryableJsonModelError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("模型返回内容不是可解析 JSON") ||
    message.includes("没有返回结构化文本") ||
    message.includes("not parseable JSON") ||
    message.includes("No structured text")
  );
}

function readOptionalNonNegativeInt(value) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
