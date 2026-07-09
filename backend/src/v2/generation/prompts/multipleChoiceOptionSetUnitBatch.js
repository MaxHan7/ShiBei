import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const MULTIPLE_CHOICE_OPTION_SET_UNIT_BATCH_PROMPT_SCHEMA_NAME =
  "shibei_v2_multiple_choice_option_set_unit_batch";

export const MULTIPLE_CHOICE_OPTION_SET_UNIT_BATCH_OUTPUT_SCHEMA = {
  name: MULTIPLE_CHOICE_OPTION_SET_UNIT_BATCH_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "optionSets"],
  additionalProperties: false,
  properties: {
    unitId: { type: "string" },
    optionSets: {
      type: "array",
      items: {
        type: "object",
        required: ["questionId", "options", "correctOptionId", "distractorRationale"],
        additionalProperties: false,
        properties: {
          questionId: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              required: ["id", "text"],
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              }
            }
          },
          correctOptionId: { type: "string" },
          distractorRationale: { type: "string" }
        }
      }
    }
  }
};

export function validateMultipleChoiceOptionSetUnitBatchOutput(
  output,
  { unitId, questionCoreIds = new Set() } = {}
) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["multipleChoiceOptionSetUnitBatch output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("multipleChoiceOptionSetUnitBatch.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`multipleChoiceOptionSetUnitBatch.unitId must match ${unitId}`);
  }

  if (!Array.isArray(output.optionSets)) {
    errors.push("multipleChoiceOptionSetUnitBatch.optionSets must be an array");
    return createValidationResult(errors);
  }

  if (output.optionSets.length !== questionCoreIds.size) {
    errors.push(`multipleChoiceOptionSetUnitBatch.optionSets must contain ${questionCoreIds.size} option sets`);
  }

  const seenQuestionIds = new Set();
  output.optionSets.forEach((optionSet, index) => {
    validateOptionSet(optionSet, {
      path: `multipleChoiceOptionSetUnitBatch.optionSets[${index}]`,
      questionCoreIds,
      seenQuestionIds,
      errors
    });
  });

  return createValidationResult(errors);
}

function validateOptionSet(optionSet, {
  path,
  questionCoreIds,
  seenQuestionIds,
  errors
}) {
  if (!isPlainObject(optionSet)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(
    optionSet,
    ["questionId", "correctOptionId", "distractorRationale"],
    path,
    errors
  );

  if (isNonEmptyString(optionSet.questionId)) {
    if (!questionCoreIds.has(optionSet.questionId)) {
      errors.push(`${path}.questionId must match a generated multiple choice question id`);
    }
    if (seenQuestionIds.has(optionSet.questionId)) {
      errors.push(`${path}.questionId must be unique`);
    }
    seenQuestionIds.add(optionSet.questionId);
  }

  if (!Array.isArray(optionSet.options)) {
    errors.push(`${path}.options must be an array`);
    return;
  }

  if (optionSet.options.length !== 4) {
    errors.push(`${path}.options must contain exactly 4 options`);
  }

  const optionIds = validateUniqueIds(optionSet.options, `${path}.options`, errors);
  optionSet.options.forEach((option, index) => {
    if (isPlainObject(option) && !isNonEmptyString(option.text)) {
      errors.push(`${path}.options[${index}].text is required`);
    }
  });

  if (isNonEmptyString(optionSet.correctOptionId) && !optionIds.has(optionSet.correctOptionId)) {
    errors.push(`${path}.correctOptionId must reference an existing option id`);
  }
}
