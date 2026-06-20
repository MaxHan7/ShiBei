import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_review_path_plan";

export const REVIEW_PATH_PLAN_OUTPUT_SCHEMA = {
  name: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["title", "summaryCard", "units", "chapterSummary"],
  properties: {
    title: { type: "string" },
    summaryCard: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } }
    },
    units: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "order",
          "title",
          "nodeLabel",
          "shortSummary",
          "detailSummary",
          "why",
          "sourceAnchor"
        ],
        properties: {
          id: { type: "string" },
          order: { type: "integer" },
          title: { type: "string" },
          nodeLabel: { type: "string" },
          shortSummary: { type: "string" },
          detailSummary: { type: "string" },
          why: { type: "string" },
          sourceAnchor: {
            type: "object",
            required: ["id", "blockIds"],
            properties: {
              id: { type: "string" },
              blockIds: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        }
      }
    },
    chapterSummary: {
      type: "object",
      required: ["encouragementText"],
      properties: { encouragementText: { type: "string" } }
    }
  }
};

export function validateReviewPathPlanOutput(output, { sourceBlockIds = new Set() } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["reviewPathPlan output must be an object"]);
  }

  if (!isNonEmptyString(output.title)) {
    errors.push("reviewPathPlan.title is required");
  }

  if (!isPlainObject(output.summaryCard) || !isNonEmptyString(output.summaryCard.text)) {
    errors.push("reviewPathPlan.summaryCard.text is required");
  }

  if (
    !isPlainObject(output.chapterSummary) ||
    !isNonEmptyString(output.chapterSummary.encouragementText)
  ) {
    errors.push("reviewPathPlan.chapterSummary.encouragementText is required");
  }

  if (!Array.isArray(output.units) || output.units.length === 0) {
    errors.push("reviewPathPlan.units must be a non-empty array");
    return createValidationResult(errors);
  }

  validateUniqueIds(output.units, "reviewPathPlan.units", errors);

  output.units.forEach((unit, index) => {
    const path = `reviewPathPlan.units[${index}]`;

    if (!isPlainObject(unit)) {
      return;
    }

    requireFields(
      unit,
      ["id", "title", "nodeLabel", "shortSummary", "detailSummary", "why"],
      path,
      errors
    );

    if (!Number.isInteger(unit.order) || unit.order <= 0) {
      errors.push(`${path}.order must be a positive integer`);
    }

    validatePlannedSourceAnchor(unit.sourceAnchor, {
      path: `${path}.sourceAnchor`,
      sourceBlockIds,
      errors
    });
  });

  return createValidationResult(errors);
}

function validatePlannedSourceAnchor(sourceAnchor, { path, sourceBlockIds, errors }) {
  if (!isPlainObject(sourceAnchor)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(sourceAnchor, ["id"], path, errors);

  if (!Array.isArray(sourceAnchor.blockIds) || sourceAnchor.blockIds.length === 0) {
    errors.push(`${path}.blockIds must be a non-empty array`);
    return;
  }

  sourceAnchor.blockIds.forEach((blockId, index) => {
    if (!isNonEmptyString(blockId)) {
      errors.push(`${path}.blockIds[${index}] is required`);
      return;
    }

    if (sourceBlockIds.size > 0 && !sourceBlockIds.has(blockId)) {
      errors.push(`${path}.blockIds[${index}] references missing source block ${blockId}`);
    }
  });
}
