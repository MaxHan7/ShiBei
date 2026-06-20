import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const MULTIPLE_CHOICE_DRAFT_PROMPT_SCHEMA_NAME = "shibei_v2_multiple_choice_draft";

export const MULTIPLE_CHOICE_DRAFT_OUTPUT_SCHEMA = {
  name: MULTIPLE_CHOICE_DRAFT_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "questions"],
  properties: {
    unitId: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "type",
          "practiceGoalId",
          "stem",
          "correctUnderstanding",
          "misconception",
          "options",
          "correctOptionId",
          "explanation",
          "sourceAnchorId"
        ],
        properties: {
          id: { type: "string" },
          type: { enum: ["multiple_choice"] },
          practiceGoalId: { type: "string" },
          stem: { type: "string" },
          correctUnderstanding: { type: "string" },
          misconception: { type: "string" },
          distractorRationale: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              required: ["id", "text"],
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              }
            }
          },
          correctOptionId: { type: "string" },
          explanation: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    }
  }
};

export function validateMultipleChoiceDraftOutput(
  output,
  { unitId, plans = [], sourceAnchorId } = {}
) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["multipleChoiceDraft output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("multipleChoiceDraft.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`multipleChoiceDraft.unitId must match ${unitId}`);
  }

  const expectedPlanIds = new Set(
    plans.filter((plan) => plan.type === "multiple_choice").map((plan) => plan.id)
  );

  if (!Array.isArray(output.questions)) {
    errors.push("multipleChoiceDraft.questions must be an array");
    return createValidationResult(errors);
  }

  if (output.questions.length !== expectedPlanIds.size) {
    errors.push(`multipleChoiceDraft.questions must contain ${expectedPlanIds.size} multiple choice questions`);
  }

  validateUniqueIds(output.questions, "multipleChoiceDraft.questions", errors);

  output.questions.forEach((question, index) => {
    validateMultipleChoiceQuestion(question, {
      path: `multipleChoiceDraft.questions[${index}]`,
      expectedPlanIds,
      sourceAnchorId,
      errors
    });
  });

  return createValidationResult(errors);
}

function validateMultipleChoiceQuestion(question, {
  path,
  expectedPlanIds,
  sourceAnchorId,
  errors
}) {
  if (!isPlainObject(question)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(
    question,
    [
      "id",
      "type",
      "practiceGoalId",
      "stem",
      "correctUnderstanding",
      "misconception",
      "correctOptionId",
      "explanation",
      "sourceAnchorId"
    ],
    path,
    errors
  );

  if (question.type !== "multiple_choice") {
    errors.push(`${path}.type must be multiple_choice`);
  }
  if (isNonEmptyString(question.id) && !expectedPlanIds.has(question.id)) {
    errors.push(`${path}.id must match a multiple_choice question plan id`);
  }
  if (sourceAnchorId && question.sourceAnchorId !== sourceAnchorId) {
    errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
  }
  validateOptions(question, path, errors);
}

function validateOptions(question, path, errors) {
  if (!Array.isArray(question.options)) {
    errors.push(`${path}.options must be an array`);
    return;
  }

  if (question.options.length !== 4) {
    errors.push(`${path}.options must contain exactly 4 options`);
  }

  const optionIds = validateUniqueIds(question.options, `${path}.options`, errors);
  question.options.forEach((option, index) => {
    if (isPlainObject(option) && !isNonEmptyString(option.text)) {
      errors.push(`${path}.options[${index}].text is required`);
    }
  });

  if (!isNonEmptyString(question.correctOptionId)) {
    errors.push(`${path}.correctOptionId is required`);
  } else if (!optionIds.has(question.correctOptionId)) {
    errors.push(`${path}.correctOptionId must reference an existing option id`);
  }
}
