import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";
import { MATCHING_RELATION_TYPES } from "./unitPracticePlan.js";

export const MATCHING_DRAFT_PROMPT_SCHEMA_NAME = "shibei_v2_matching_draft";

export const MATCHING_DRAFT_OUTPUT_SCHEMA = {
  name: MATCHING_DRAFT_PROMPT_SCHEMA_NAME,
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
          "relationType",
          "relationGoal",
          "stem",
          "leftItems",
          "rightItems",
          "pairs",
          "explanation",
          "sourceAnchorId"
        ],
        properties: {
          id: { type: "string" },
          type: { enum: ["matching"] },
          practiceGoalId: { type: "string" },
          relationType: { enum: MATCHING_RELATION_TYPES },
          relationGoal: { type: "string" },
          stem: { type: "string" },
          leftItems: {
            type: "array",
            minItems: 2,
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
          rightItems: {
            type: "array",
            minItems: 2,
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
          pairs: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              required: ["leftId", "rightId"],
              properties: {
                leftId: { type: "string" },
                rightId: { type: "string" }
              }
            }
          },
          explanation: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    }
  }
};

export function validateMatchingDraftOutput(
  output,
  { unitId, plans = [], sourceAnchorId } = {}
) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["matchingDraft output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("matchingDraft.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`matchingDraft.unitId must match ${unitId}`);
  }

  const expectedPlanIds = new Set(
    plans.filter((plan) => plan.type === "matching").map((plan) => plan.id)
  );

  if (!Array.isArray(output.questions)) {
    errors.push("matchingDraft.questions must be an array");
    return createValidationResult(errors);
  }

  if (output.questions.length !== expectedPlanIds.size) {
    errors.push(`matchingDraft.questions must contain ${expectedPlanIds.size} matching questions`);
  }

  validateUniqueIds(output.questions, "matchingDraft.questions", errors);

  output.questions.forEach((question, index) => {
    validateMatchingQuestion(question, {
      path: `matchingDraft.questions[${index}]`,
      expectedPlanIds,
      sourceAnchorId,
      errors
    });
  });

  return createValidationResult(errors);
}

export function normalizeMatchingDraftOutput(output) {
  if (!isPlainObject(output) || !Array.isArray(output.questions)) return output;

  return {
    ...output,
    questions: output.questions.map((question) => normalizeMatchingQuestionPairs(question))
  };
}

function validateMatchingQuestion(question, {
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
      "relationType",
      "relationGoal",
      "stem",
      "explanation",
      "sourceAnchorId"
    ],
    path,
    errors
  );

  if (question.type !== "matching") {
    errors.push(`${path}.type must be matching`);
  }
  if (isNonEmptyString(question.id) && !expectedPlanIds.has(question.id)) {
    errors.push(`${path}.id must match a matching question plan id`);
  }
  if (isNonEmptyString(question.relationType) && !MATCHING_RELATION_TYPES.includes(question.relationType)) {
    errors.push(`${path}.relationType must be one of ${MATCHING_RELATION_TYPES.join(", ")}`);
  }
  if (sourceAnchorId && question.sourceAnchorId !== sourceAnchorId) {
    errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
  }
  validateMatchingItems(question, path, errors);
}

function validateMatchingItems(question, path, errors) {
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

  question.pairs.forEach((pair, index) => {
    const pairPath = `${path}.pairs[${index}]`;

    if (!isPlainObject(pair)) {
      errors.push(`${pairPath} must be an object`);
      return;
    }

    requireFields(pair, ["leftId", "rightId"], pairPath, errors);

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
  });
}

function normalizeMatchingQuestionPairs(question) {
  if (!isPlainObject(question)) return question;
  if (
    !Array.isArray(question.leftItems)
    || !Array.isArray(question.rightItems)
    || !Array.isArray(question.pairs)
  ) {
    return question;
  }
  if (
    question.leftItems.length !== question.rightItems.length
    || question.pairs.length !== question.leftItems.length
  ) {
    return question;
  }

  const leftIds = question.leftItems.map((item) => item?.id).filter(isNonEmptyString);
  const rightIds = question.rightItems.map((item) => item?.id).filter(isNonEmptyString);
  if (leftIds.length !== question.leftItems.length || rightIds.length !== question.rightItems.length) {
    return question;
  }
  if (new Set(leftIds).size !== leftIds.length || new Set(rightIds).size !== rightIds.length) {
    return question;
  }

  const seenLeftIds = new Set();
  const usedRightIds = new Set();
  const duplicatePairIndexes = [];
  for (const [index, pair] of question.pairs.entries()) {
    if (!isPlainObject(pair) || !leftIds.includes(pair.leftId) || !rightIds.includes(pair.rightId)) {
      return question;
    }
    if (seenLeftIds.has(pair.leftId)) return question;
    seenLeftIds.add(pair.leftId);
    if (usedRightIds.has(pair.rightId)) {
      duplicatePairIndexes.push(index);
    } else {
      usedRightIds.add(pair.rightId);
    }
  }
  if (duplicatePairIndexes.length === 0) return question;

  const unusedRightIds = rightIds.filter((id) => !usedRightIds.has(id));
  if (unusedRightIds.length !== duplicatePairIndexes.length) return question;

  const pairs = question.pairs.map((pair) => ({ ...pair }));
  duplicatePairIndexes.forEach((pairIndex, replacementIndex) => {
    pairs[pairIndex].rightId = unusedRightIds[replacementIndex];
  });

  return { ...question, pairs };
}
