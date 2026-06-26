import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateUniqueIds
} from "./schemaValidation.js";
import {
  MATCHING_DRAFT_OUTPUT_SCHEMA,
  validateMatchingDraftOutput
} from "./matchingDraft.js";
import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftOutput
} from "./multipleChoiceDraft.js";

export const QUESTION_DRAFT_BATCH_PROMPT_SCHEMA_NAME = "shibei_v2_question_draft_batch";

const MULTIPLE_CHOICE_QUESTION_SCHEMA = MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.properties.questions.items;
const MATCHING_QUESTION_SCHEMA = MATCHING_DRAFT_OUTPUT_SCHEMA.properties.questions.items;

export const QUESTION_DRAFT_BATCH_OUTPUT_SCHEMA = {
  name: QUESTION_DRAFT_BATCH_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["units"],
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "questions"],
        properties: {
          unitId: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ...MULTIPLE_CHOICE_QUESTION_SCHEMA.properties,
                ...MATCHING_QUESTION_SCHEMA.properties
              }
            }
          }
        }
      }
    }
  }
};

export function validateQuestionDraftBatchOutput(
  output,
  { practicePlansByUnit, sourceAnchorByUnit } = {}
) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["questionDraftBatch output must be an object"]);
  }
  if (!Array.isArray(output.units) || output.units.length === 0) {
    return createValidationResult(["questionDraftBatch.units must be a non-empty array"]);
  }

  const expectedUnitIds = practicePlansByUnit instanceof Map
    ? new Set(practicePlansByUnit.keys())
    : new Set();
  const seenUnitIds = new Set();

  output.units.forEach((unitDraft, index) => {
    const path = `questionDraftBatch.units[${index}]`;
    if (!isPlainObject(unitDraft)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!isNonEmptyString(unitDraft.unitId)) {
      errors.push(`${path}.unitId is required`);
      return;
    }
    if (seenUnitIds.has(unitDraft.unitId)) {
      errors.push(`${path}.unitId must be unique`);
    }
    seenUnitIds.add(unitDraft.unitId);
    if (expectedUnitIds.size > 0 && !expectedUnitIds.has(unitDraft.unitId)) {
      errors.push(`${path}.unitId must reference a planned unit`);
    }
    if (!Array.isArray(unitDraft.questions)) {
      errors.push(`${path}.questions must be an array`);
      return;
    }
    validateUniqueIds(unitDraft.questions, `${path}.questions`, errors);
    unitDraft.questions.forEach((question, questionIndex) => {
      if (!isPlainObject(question)) {
        errors.push(`${path}.questions[${questionIndex}] must be an object`);
      } else if (question.type !== "multiple_choice" && question.type !== "matching") {
        errors.push(`${path}.questions[${questionIndex}].type must be multiple_choice or matching`);
      }
    });

    const practicePlan = practicePlansByUnit?.get(unitDraft.unitId);
    if (!practicePlan) return;
    const sourceAnchorId = sourceAnchorByUnit?.get(unitDraft.unitId);
    const multipleChoiceValidation = validateMultipleChoiceDraftOutput(
      {
        unitId: unitDraft.unitId,
        questions: unitDraft.questions.filter((question) => question?.type === "multiple_choice")
      },
      {
        unitId: unitDraft.unitId,
        plans: practicePlan.questionPlans,
        sourceAnchorId
      }
    );
    const matchingValidation = validateMatchingDraftOutput(
      {
        unitId: unitDraft.unitId,
        questions: unitDraft.questions.filter((question) => question?.type === "matching")
      },
      {
        unitId: unitDraft.unitId,
        plans: practicePlan.questionPlans,
        sourceAnchorId
      }
    );

    if (!multipleChoiceValidation.ok) {
      multipleChoiceValidation.errors.forEach((error) => errors.push(`${path}: ${error}`));
    }
    if (!matchingValidation.ok) {
      matchingValidation.errors.forEach((error) => errors.push(`${path}: ${error}`));
    }
  });

  expectedUnitIds.forEach((unitId) => {
    if (!seenUnitIds.has(unitId)) {
      errors.push(`questionDraftBatch.units missing unitId ${unitId}`);
    }
  });

  return createValidationResult(errors);
}

export function getQuestionDraftForUnit(questionDraftBatch, unitId) {
  return (questionDraftBatch?.units || []).find((unitDraft) => unitDraft?.unitId === unitId) || null;
}
