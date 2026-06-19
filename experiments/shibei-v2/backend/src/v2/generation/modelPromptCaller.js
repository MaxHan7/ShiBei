import { callOpenAIJson } from "../../generation/openaiClient.js";
import { buildV2PromptMessages } from "./prompts/buildV2PromptMessages.js";
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
  UNIT_CARDS_OUTPUT_SCHEMA,
  UNIT_CARDS_PROMPT_SCHEMA_NAME
} from "./prompts/unitCards.js";

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
  unitCards: {
    schemaName: UNIT_CARDS_PROMPT_SCHEMA_NAME,
    schema: UNIT_CARDS_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2800
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
