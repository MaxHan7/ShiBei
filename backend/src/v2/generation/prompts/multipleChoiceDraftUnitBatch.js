import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftOutput
} from "./multipleChoiceDraft.js";

export const MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_PROMPT_SCHEMA_NAME =
  "shibei_v2_multiple_choice_draft_unit_batch";

const MULTIPLE_CHOICE_QUESTION_SCHEMA =
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.properties.questions.items;

export const MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA = {
  name: MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "questions"],
  additionalProperties: false,
  properties: {
    unitId: { type: "string" },
    questions: {
      type: "array",
      items: MULTIPLE_CHOICE_QUESTION_SCHEMA
    }
  }
};

export function validateMultipleChoiceDraftUnitBatchOutput(
  output,
  { unitId, questionPlanIds = new Set(), sourceAnchorId } = {}
) {
  const plans = Array.from(questionPlanIds).map((id) => ({
    id,
    type: "multiple_choice",
    sourceAnchorId
  }));

  return validateMultipleChoiceDraftOutput(output, {
    unitId,
    plans,
    sourceAnchorId
  });
}
