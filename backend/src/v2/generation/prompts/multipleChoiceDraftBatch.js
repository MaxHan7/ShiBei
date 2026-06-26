import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateUniqueIds
} from "./schemaValidation.js";
import {
  MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA,
  validateMultipleChoiceDraftOutput
} from "./multipleChoiceDraft.js";

export const MULTIPLE_CHOICE_DRAFT_BATCH_PROMPT_SCHEMA_NAME = "shibei_v2_multiple_choice_draft_batch";

const MULTIPLE_CHOICE_QUESTION_SCHEMA = MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA.properties.questions.items;

export const MULTIPLE_CHOICE_DRAFT_BATCH_OUTPUT_SCHEMA = {
  name: MULTIPLE_CHOICE_DRAFT_BATCH_PROMPT_SCHEMA_NAME,
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
            items: MULTIPLE_CHOICE_QUESTION_SCHEMA
          }
        }
      }
    }
  }
};

export function validateMultipleChoiceDraftBatchOutput(
  output,
  { practicePlansByUnit, sourceAnchorByUnit } = {}
) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["multipleChoiceDraftBatch output must be an object"]);
  }
  if (!Array.isArray(output.units)) {
    return createValidationResult(["multipleChoiceDraftBatch.units must be an array"]);
  }

  const expectedUnitIds = expectedUnitIdsWithQuestionType(practicePlansByUnit, "multiple_choice");
  const seenUnitIds = new Set();

  output.units.forEach((unitDraft, index) => {
    const path = `multipleChoiceDraftBatch.units[${index}]`;
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
      errors.push(`${path}.unitId must reference a planned unit with multiple_choice plans`);
    }
    if (!Array.isArray(unitDraft.questions)) {
      errors.push(`${path}.questions must be an array`);
      return;
    }
    validateUniqueIds(unitDraft.questions, `${path}.questions`, errors);
    unitDraft.questions.forEach((question, questionIndex) => {
      if (!isPlainObject(question)) {
        errors.push(`${path}.questions[${questionIndex}] must be an object`);
      } else if (question.type !== "multiple_choice") {
        errors.push(`${path}.questions[${questionIndex}].type must be multiple_choice`);
      }
    });

    const practicePlan = practicePlansByUnit?.get(unitDraft.unitId);
    if (!practicePlan) return;
    const sourceAnchorId = sourceAnchorByUnit?.get(unitDraft.unitId);
    const validation = validateMultipleChoiceDraftOutput(
      {
        unitId: unitDraft.unitId,
        questions: unitDraft.questions
      },
      {
        unitId: unitDraft.unitId,
        plans: practicePlan.questionPlans,
        sourceAnchorId
      }
    );
    if (!validation.ok) {
      validation.errors.forEach((error) => errors.push(`${path}: ${error}`));
    }
  });

  expectedUnitIds.forEach((unitId) => {
    if (!seenUnitIds.has(unitId)) {
      errors.push(`multipleChoiceDraftBatch.units missing unitId ${unitId}`);
    }
  });

  return createValidationResult(errors);
}

export function getMultipleChoiceDraftForUnit(multipleChoiceDraftBatch, unitId) {
  return (multipleChoiceDraftBatch?.units || []).find((unitDraft) => unitDraft?.unitId === unitId) || null;
}

function expectedUnitIdsWithQuestionType(practicePlansByUnit, type) {
  if (!(practicePlansByUnit instanceof Map)) return new Set();
  return new Set(
    Array.from(practicePlansByUnit.entries())
      .filter(([, practicePlan]) =>
        (practicePlan?.questionPlans || []).some((questionPlan) => questionPlan.type === type)
      )
      .map(([unitId]) => unitId)
  );
}
