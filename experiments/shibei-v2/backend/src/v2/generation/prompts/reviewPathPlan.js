import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_review_path_plan";

export const KNOWLEDGE_OBJECT_SHAPES = [
  "core_concept",
  "layered_framework",
  "comparison_pair",
  "process_steps",
  "scenario_rule",
  "type_set",
  "boundary_rule",
  "cause_effect",
  "example_case"
];

export const KNOWLEDGE_OBJECT_BOUNDARY_DECISIONS = [
  "standalone_unit",
  "merge_fragment",
  "context_only"
];

export const REVIEW_PATH_PLAN_OUTPUT_SCHEMA = {
  name: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["title", "summaryCard", "knowledgeObjects", "units", "chapterSummary"],
  properties: {
    title: { type: "string" },
    summaryCard: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } }
    },
    knowledgeObjects: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "title",
          "nodeLabel",
          "knowledgeShape",
          "roleInArticle",
          "sourceBlockIds",
          "boundaryDecision",
          "boundaryReason"
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          nodeLabel: { type: "string" },
          knowledgeShape: { enum: KNOWLEDGE_OBJECT_SHAPES },
          roleInArticle: { type: "string" },
          sourceBlockIds: {
            type: "array",
            items: { type: "string" }
          },
          boundaryDecision: { enum: KNOWLEDGE_OBJECT_BOUNDARY_DECISIONS },
          boundaryReason: { type: "string" }
        }
      }
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
          "sourceKnowledgeObjectIds",
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
          sourceKnowledgeObjectIds: {
            type: "array",
            items: { type: "string" }
          },
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

  const knowledgeObjectIds = validateKnowledgeObjects(output.knowledgeObjects, {
    sourceBlockIds,
    errors
  });

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

    validateSourceKnowledgeObjectIds(unit.sourceKnowledgeObjectIds, {
      path: `${path}.sourceKnowledgeObjectIds`,
      knowledgeObjectIds,
      knowledgeObjects: output.knowledgeObjects,
      errors
    });

    validatePlannedSourceAnchor(unit.sourceAnchor, {
      path: `${path}.sourceAnchor`,
      sourceBlockIds,
      errors
    });
  });

  return createValidationResult(errors);
}

function validateKnowledgeObjects(items, { sourceBlockIds, errors }) {
  const ids = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    errors.push("reviewPathPlan.knowledgeObjects must be a non-empty array");
    return ids;
  }

  validateUniqueIds(items, "reviewPathPlan.knowledgeObjects", errors);

  items.forEach((item, index) => {
    const path = `reviewPathPlan.knowledgeObjects[${index}]`;
    if (!isPlainObject(item)) return;

    requireFields(
      item,
      [
        "id",
        "title",
        "nodeLabel",
        "knowledgeShape",
        "roleInArticle",
        "boundaryDecision",
        "boundaryReason"
      ],
      path,
      errors
    );

    if (isNonEmptyString(item.id)) ids.add(item.id);

    if (isNonEmptyString(item.knowledgeShape) && !KNOWLEDGE_OBJECT_SHAPES.includes(item.knowledgeShape)) {
      errors.push(`${path}.knowledgeShape must be one of ${KNOWLEDGE_OBJECT_SHAPES.join(", ")}`);
    }

    if (
      isNonEmptyString(item.boundaryDecision) &&
      !KNOWLEDGE_OBJECT_BOUNDARY_DECISIONS.includes(item.boundaryDecision)
    ) {
      errors.push(`${path}.boundaryDecision must be one of ${KNOWLEDGE_OBJECT_BOUNDARY_DECISIONS.join(", ")}`);
    }

    if (!Array.isArray(item.sourceBlockIds) || item.sourceBlockIds.length === 0) {
      errors.push(`${path}.sourceBlockIds must be a non-empty array`);
      return;
    }

    item.sourceBlockIds.forEach((blockId, blockIndex) => {
      if (!isNonEmptyString(blockId)) {
        errors.push(`${path}.sourceBlockIds[${blockIndex}] is required`);
        return;
      }

      if (sourceBlockIds.size > 0 && !sourceBlockIds.has(blockId)) {
        errors.push(`${path}.sourceBlockIds[${blockIndex}] references missing source block ${blockId}`);
      }
    });
  });

  return ids;
}

function validateSourceKnowledgeObjectIds(items, { path, knowledgeObjectIds, knowledgeObjects, errors }) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }

  items.forEach((id, index) => {
    if (!isNonEmptyString(id)) {
      errors.push(`${path}[${index}] is required`);
      return;
    }

    if (!knowledgeObjectIds.has(id)) {
      errors.push(`${path}[${index}] references missing knowledge object ${id}`);
    }
  });

  const objectsById = new Map(
    (Array.isArray(knowledgeObjects) ? knowledgeObjects : []).map((item) => [item.id, item])
  );
  const standaloneObjects = items
    .map((id) => objectsById.get(id))
    .filter((item) => item?.boundaryDecision === "standalone_unit");

  if (standaloneObjects.length > 1) {
    errors.push(`${path} must not merge multiple standalone knowledge objects into one unit`);
  }
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
