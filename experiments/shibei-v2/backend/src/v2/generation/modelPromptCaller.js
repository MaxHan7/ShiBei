import { callOpenAIJson } from "../../generation/openaiClient.js";
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
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME
} from "./prompts/reviewPathPlan.js";
import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  SOURCE_MAP_PROMPT_SCHEMA_NAME
} from "./prompts/sourceMap.js";
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
    estimatedOutputTokens: 1800
  },
  reviewPathPlan: {
    schemaName: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
    schema: REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2500
  },
  ecdPlanning: {
    schemaName: ECD_PLANNING_PROMPT_SCHEMA_NAME,
    schema: ECD_PLANNING_OUTPUT_SCHEMA,
    estimatedOutputTokens: 3000
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
    estimatedOutputTokens: 1600
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

export function createV2ModelPromptCaller({
  modelJsonCaller = callOpenAIJson,
  modelUsageRecorder = null
} = {}) {
  return async function callV2ModelPrompt(stage, payload) {
    const stageConfig = STAGE_SCHEMAS[stage];
    if (!stageConfig) {
      throw new Error(`Unsupported V2 model prompt stage: ${stage}`);
    }

    const messages = buildV2PromptMessages(stage, payload);
    return modelJsonCaller({
      system: messages.system,
      user: messages.user,
      schemaName: stageConfig.schemaName,
      schema: schemaForModel(stageConfig.schema),
      stage: `v2_${stage}`,
      modelUsageRecorder,
      estimatedOutputTokens: stageConfig.estimatedOutputTokens
    });
  };
}

function schemaForModel(schema) {
  const { name: _name, ...schemaWithoutName } = schema;
  return schemaWithoutName;
}
