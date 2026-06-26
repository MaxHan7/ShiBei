import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const UNIT_CARDS_PROMPT_SCHEMA_NAME = "shibei_v2_unit_cards";

export const UNIT_CARDS_OUTPUT_SCHEMA = {
  name: UNIT_CARDS_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "overview", "questions", "summary"],
  properties: {
    unitId: { type: "string" },
    overview: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } }
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "stem", "explanation", "sourceAnchorId"],
        properties: {
          id: { type: "string" },
          type: { enum: ["multiple_choice", "matching"] },
          stem: { type: "string" },
          explanation: { type: "string" },
          sourceAnchorId: { type: "string" },
          options: {
            type: "array",
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
          leftItems: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "text"],
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              }
            }
          },
          rightItems: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "text"],
              properties: {
                id: { type: "string" },
                text: { type: "string" }
              }
            }
          },
          pairs: {
            type: "array",
            items: {
              type: "object",
              required: ["leftId", "rightId"],
              properties: {
                leftId: { type: "string" },
                rightId: { type: "string" }
              }
            }
          }
        }
      }
    },
    summary: {
      type: "object",
      required: ["title", "text"]
    }
  }
};

export function validateUnitCardsOutput(output, { unitId, sourceAnchorId } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitCards output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("unitCards.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`unitCards.unitId must match ${unitId}`);
  }

  if (!isPlainObject(output.overview) || !isNonEmptyString(output.overview.text)) {
    errors.push("unitCards.overview.text is required");
  }

  if (!isPlainObject(output.summary)) {
    errors.push("unitCards.summary must be an object");
  } else {
    requireFields(output.summary, ["title", "text"], "unitCards.summary", errors);
  }

  if (!Array.isArray(output.questions) || output.questions.length === 0) {
    errors.push("unitCards.questions must be a non-empty array");
    return createValidationResult(errors);
  }

  validateUniqueIds(output.questions, "unitCards.questions", errors);

  output.questions.forEach((question, index) => {
    validateUnitQuestion(question, {
      path: `unitCards.questions[${index}]`,
      sourceAnchorId,
      errors
    });
  });

  return createValidationResult(errors);
}

function validateUnitQuestion(question, { path, sourceAnchorId, errors }) {
  if (!isPlainObject(question)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(question, ["id", "type", "stem", "explanation", "sourceAnchorId"], path, errors);

  if (sourceAnchorId && question.sourceAnchorId !== sourceAnchorId) {
    errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
  }

  if (question.type === "multiple_choice") {
    validateMultipleChoiceQuestion(question, path, errors);
    return;
  }

  if (question.type === "matching") {
    validateMatchingQuestion(question, path, errors);
    return;
  }

  errors.push(`${path}.type must be multiple_choice or matching`);
}

function validateMultipleChoiceQuestion(question, path, errors) {
  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push(`${path}.options must contain exactly 4 options`);
    return;
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

function validateMatchingQuestion(question, path, errors) {
  if (!Array.isArray(question.leftItems)) {
    errors.push(`${path}.leftItems must be an array`);
  }

  if (!Array.isArray(question.rightItems)) {
    errors.push(`${path}.rightItems must be an array`);
  }

  if (!Array.isArray(question.pairs)) {
    errors.push(`${path}.pairs must be an array`);
    return;
  }
  if (!Array.isArray(question.leftItems) || !Array.isArray(question.rightItems)) {
    return;
  }
  if (question.leftItems.length < 2 || question.leftItems.length > 4) {
    errors.push(`${path}.leftItems must contain 2 to 4 items`);
  }
  if (question.rightItems.length < 2 || question.rightItems.length > 4) {
    errors.push(`${path}.rightItems must contain 2 to 4 items`);
  }
  if (question.pairs.length < 2 || question.pairs.length > 4) {
    errors.push(`${path}.pairs must contain 2 to 4 pairs`);
    return;
  }
  if (question.leftItems.length !== question.rightItems.length) {
    errors.push(`${path}.leftItems and rightItems must contain the same number of items`);
  }
  if (question.pairs.length !== question.leftItems.length || question.pairs.length !== question.rightItems.length) {
    errors.push(`${path}.pairs must contain one pair for each left/right item`);
  }

  const leftIds = Array.isArray(question.leftItems)
    ? validateUniqueIds(question.leftItems, `${path}.leftItems`, errors)
    : new Set();
  const rightIds = Array.isArray(question.rightItems)
    ? validateUniqueIds(question.rightItems, `${path}.rightItems`, errors)
    : new Set();
  const seenLeftIds = new Set();
  const seenRightIds = new Set();

  for (const [index, pair] of question.pairs.entries()) {
    const pairPath = `${path}.pairs[${index}]`;

    if (!isPlainObject(pair)) {
      errors.push(`${pairPath} must be an object`);
      continue;
    }

    if (!leftIds.has(pair.leftId)) {
      errors.push(`${pairPath}.leftId must reference an existing left item`);
    }
    if (!rightIds.has(pair.rightId)) {
      errors.push(`${pairPath}.rightId must reference an existing right item`);
    }
    if (seenLeftIds.has(pair.leftId)) {
      errors.push(`${pairPath}.leftId must be used only once`);
    }
    if (seenRightIds.has(pair.rightId)) {
      errors.push(`${pairPath}.rightId must be used only once`);
    }
    seenLeftIds.add(pair.leftId);
    seenRightIds.add(pair.rightId);
  }
}
