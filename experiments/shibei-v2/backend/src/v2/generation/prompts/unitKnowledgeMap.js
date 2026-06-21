import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields
} from "./schemaValidation.js";

export const UNIT_KNOWLEDGE_MAP_PROMPT_SCHEMA_NAME = "shibei_v2_unit_knowledge_map";

export const MICRO_ASSESSMENT_VALUES = [
  "high",
  "medium",
  "low",
  "context_only"
];

export const MICRO_KNOWLEDGE_ROLES = [
  "definition",
  "boundary",
  "model_layer",
  "mechanism",
  "process_step",
  "scenario_application",
  "misconception",
  "example_case",
  "relationship"
];

export const UNIT_KNOWLEDGE_MAP_OUTPUT_SCHEMA = {
  name: UNIT_KNOWLEDGE_MAP_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["units"],
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "microKnowledgePoints"],
        properties: {
          unitId: { type: "string" },
          microKnowledgePoints: {
            type: "array",
            items: {
              type: "object",
              required: [
                "microId",
                "title",
                "summary",
                "role",
                "assessmentValue",
                "suggestedEvidenceAngles",
                "sourceAnchorId",
                "sourceSupport"
              ],
              properties: {
                microId: { type: "string" },
                title: { type: "string" },
                summary: { type: "string" },
                role: { enum: MICRO_KNOWLEDGE_ROLES },
                assessmentValue: { enum: MICRO_ASSESSMENT_VALUES },
                suggestedEvidenceAngles: {
                  type: "array",
                  items: { type: "string" }
                },
                sourceAnchorId: { type: "string" },
                sourceSupport: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};

export function validateUnitKnowledgeMapOutput(output, { unitIds = new Set(), sourceAnchorIds = new Set() } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitKnowledgeMap output must be an object"]);
  }

  if (!Array.isArray(output.units) || output.units.length === 0) {
    errors.push("unitKnowledgeMap.units must be a non-empty array");
    return createValidationResult(errors);
  }

  const seenUnits = new Set();
  const seenMicroIds = new Set();

  output.units.forEach((unit, unitIndex) => {
    const path = `unitKnowledgeMap.units[${unitIndex}]`;
    if (!isPlainObject(unit)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(unit, ["unitId"], path, errors);

    if (isNonEmptyString(unit.unitId)) {
      if (seenUnits.has(unit.unitId)) {
        errors.push(`${path}.unitId must be unique`);
      }
      seenUnits.add(unit.unitId);
      if (unitIds.size > 0 && !unitIds.has(unit.unitId)) {
        errors.push(`${path}.unitId must reference a reviewPathPlan unit`);
      }
    }

    if (!Array.isArray(unit.microKnowledgePoints) || unit.microKnowledgePoints.length === 0) {
      errors.push(`${path}.microKnowledgePoints must be a non-empty array`);
      return;
    }

    unit.microKnowledgePoints.forEach((micro, microIndex) => {
      const microPath = `${path}.microKnowledgePoints[${microIndex}]`;
      if (!isPlainObject(micro)) {
        errors.push(`${microPath} must be an object`);
        return;
      }
      requireFields(
        micro,
        [
          "microId",
          "title",
          "summary",
          "role",
          "assessmentValue",
          "sourceAnchorId",
          "sourceSupport"
        ],
        microPath,
        errors
      );

      if (isNonEmptyString(micro.microId)) {
        if (seenMicroIds.has(micro.microId)) {
          errors.push(`${microPath}.microId must be unique`);
        }
        seenMicroIds.add(micro.microId);
      }
      if (isNonEmptyString(micro.role) && !MICRO_KNOWLEDGE_ROLES.includes(micro.role)) {
        errors.push(`${microPath}.role must be one of ${MICRO_KNOWLEDGE_ROLES.join(", ")}`);
      }
      if (
        isNonEmptyString(micro.assessmentValue) &&
        !MICRO_ASSESSMENT_VALUES.includes(micro.assessmentValue)
      ) {
        errors.push(`${microPath}.assessmentValue must be one of ${MICRO_ASSESSMENT_VALUES.join(", ")}`);
      }
      if (!Array.isArray(micro.suggestedEvidenceAngles)) {
        errors.push(`${microPath}.suggestedEvidenceAngles must be an array`);
      }
      if (
        isNonEmptyString(micro.sourceAnchorId) &&
        sourceAnchorIds.size > 0 &&
        !sourceAnchorIds.has(micro.sourceAnchorId)
      ) {
        errors.push(`${microPath}.sourceAnchorId must reference a reviewPathPlan sourceAnchor`);
      }
    });
  });

  for (const unitId of unitIds) {
    if (!seenUnits.has(unitId)) {
      errors.push(`unitKnowledgeMap.units must include unit ${unitId}`);
    }
  }

  return createValidationResult(errors);
}
