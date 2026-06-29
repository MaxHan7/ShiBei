import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_review_path_plan";

export const REVIEW_PATH_TEXT_LIMITS = {
  title: 36,
  summaryCardText: 96,
  unitTitle: 40,
  nodeLabel: 24,
  shortSummary: 56,
  detailSummary: 180,
  why: 96,
  encouragementText: 96
};

export const REVIEW_PATH_PLAN_OUTPUT_SCHEMA = {
  name: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["title", "summaryCard", "units", "chapterSummary"],
  properties: {
    title: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.title },
    summaryCard: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.summaryCardText } }
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
          title: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.unitTitle },
          nodeLabel: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.nodeLabel },
          shortSummary: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.shortSummary },
          detailSummary: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.detailSummary },
          why: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.why },
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
      properties: {
        encouragementText: { type: "string", maxLength: REVIEW_PATH_TEXT_LIMITS.encouragementText }
      }
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
  } else {
    validateStringMaxLength(output.title, REVIEW_PATH_TEXT_LIMITS.title, "reviewPathPlan.title", errors);
  }

  if (!isPlainObject(output.summaryCard) || !isNonEmptyString(output.summaryCard.text)) {
    errors.push("reviewPathPlan.summaryCard.text is required");
  } else {
    validateStringMaxLength(
      output.summaryCard.text,
      REVIEW_PATH_TEXT_LIMITS.summaryCardText,
      "reviewPathPlan.summaryCard.text",
      errors
    );
  }

  if (
    !isPlainObject(output.chapterSummary) ||
    !isNonEmptyString(output.chapterSummary.encouragementText)
  ) {
    errors.push("reviewPathPlan.chapterSummary.encouragementText is required");
  } else {
    validateStringMaxLength(
      output.chapterSummary.encouragementText,
      REVIEW_PATH_TEXT_LIMITS.encouragementText,
      "reviewPathPlan.chapterSummary.encouragementText",
      errors
    );
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

    validateStringMaxLength(unit.title, REVIEW_PATH_TEXT_LIMITS.unitTitle, `${path}.title`, errors);
    validateStringMaxLength(unit.nodeLabel, REVIEW_PATH_TEXT_LIMITS.nodeLabel, `${path}.nodeLabel`, errors);
    validateStringMaxLength(unit.shortSummary, REVIEW_PATH_TEXT_LIMITS.shortSummary, `${path}.shortSummary`, errors);
    validateStringMaxLength(unit.detailSummary, REVIEW_PATH_TEXT_LIMITS.detailSummary, `${path}.detailSummary`, errors);
    validateStringMaxLength(unit.why, REVIEW_PATH_TEXT_LIMITS.why, `${path}.why`, errors);

    validatePlannedSourceAnchor(unit.sourceAnchor, {
      path: `${path}.sourceAnchor`,
      sourceBlockIds,
      errors
    });
  });

  return createValidationResult(errors);
}

export function normalizeReviewPathPlanOutput(output) {
  if (!isPlainObject(output)) return output;

  return {
    ...output,
    title: truncateText(output.title, REVIEW_PATH_TEXT_LIMITS.title),
    summaryCard: isPlainObject(output.summaryCard)
      ? {
          ...output.summaryCard,
          text: truncateText(output.summaryCard.text, REVIEW_PATH_TEXT_LIMITS.summaryCardText)
        }
      : output.summaryCard,
    units: Array.isArray(output.units)
      ? output.units.map((unit) => normalizeReviewPathPlanUnit(unit))
      : output.units,
    chapterSummary: isPlainObject(output.chapterSummary)
      ? {
          ...output.chapterSummary,
          encouragementText: truncateText(
            output.chapterSummary.encouragementText,
            REVIEW_PATH_TEXT_LIMITS.encouragementText
          )
        }
      : output.chapterSummary
  };
}

function normalizeReviewPathPlanUnit(unit) {
  if (!isPlainObject(unit)) return unit;
  return {
    ...unit,
    title: truncateText(unit.title, REVIEW_PATH_TEXT_LIMITS.unitTitle),
    nodeLabel: truncateText(unit.nodeLabel, REVIEW_PATH_TEXT_LIMITS.nodeLabel),
    shortSummary: truncateText(unit.shortSummary, REVIEW_PATH_TEXT_LIMITS.shortSummary),
    detailSummary: truncateText(unit.detailSummary, REVIEW_PATH_TEXT_LIMITS.detailSummary),
    why: truncateText(unit.why, REVIEW_PATH_TEXT_LIMITS.why)
  };
}

function truncateText(value, maxLength) {
  if (!isNonEmptyString(value)) return value;
  const chars = Array.from(value.trim());
  if (chars.length <= maxLength) return value.trim();
  return chars.slice(0, maxLength).join("").trim();
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

function validateStringMaxLength(value, maxLength, path, errors) {
  if (!isNonEmptyString(value)) return;
  if (String(value).length > maxLength) {
    errors.push(`${path} must be at most ${maxLength} characters`);
  }
}
