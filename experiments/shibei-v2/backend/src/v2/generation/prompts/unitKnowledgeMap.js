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

export const UNIT_KNOWLEDGE_MAP_TEXT_LIMITS = {
  microTitle: 28,
  microSummary: 72,
  primaryEvidenceAngle: 24
};

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
                "primaryEvidenceAngle"
              ],
              properties: {
                microId: { type: "string" },
                title: { type: "string", maxLength: UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.microTitle },
                summary: { type: "string", maxLength: UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.microSummary },
                role: { enum: MICRO_KNOWLEDGE_ROLES },
                assessmentValue: { enum: MICRO_ASSESSMENT_VALUES },
                primaryEvidenceAngle: { type: "string", maxLength: UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.primaryEvidenceAngle },
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
          "primaryEvidenceAngle"
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
      validateStringMaxLength(
        micro.primaryEvidenceAngle,
        UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.primaryEvidenceAngle,
        `${microPath}.primaryEvidenceAngle`,
        errors
      );
      validateStringMaxLength(
        micro.title,
        UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.microTitle,
        `${microPath}.title`,
        errors
      );
      validateStringMaxLength(
        micro.summary,
        UNIT_KNOWLEDGE_MAP_TEXT_LIMITS.microSummary,
        `${microPath}.summary`,
        errors
      );
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

function validateStringMaxLength(value, maxLength, path, errors) {
  if (!isNonEmptyString(value)) return;
  if (String(value).length > maxLength) {
    errors.push(`${path} must be at most ${maxLength} characters`);
  }
}

export function normalizeUnitKnowledgeMapOutput(output) {
  if (!isPlainObject(output) || !Array.isArray(output.units)) return output;

  return {
    ...output,
    units: output.units.map((unit) => {
      if (!isPlainObject(unit) || !Array.isArray(unit.microKnowledgePoints)) return unit;
      return {
        ...unit,
        microKnowledgePoints: unit.microKnowledgePoints.map((micro) => normalizeMicroKnowledgePoint(micro))
      };
    })
  };
}

function normalizeMicroKnowledgePoint(micro) {
  if (!isPlainObject(micro)) return micro;
  const normalizedRole = normalizeMicroRole(micro.role);
  const normalizedAssessmentValue = normalizeAssessmentValue(micro.assessmentValue);
  return {
    ...micro,
    ...(micro.role !== normalizedRole ? { rawRole: micro.role } : {}),
    ...(micro.assessmentValue !== normalizedAssessmentValue ? { rawAssessmentValue: micro.assessmentValue } : {}),
    role: normalizedRole,
    assessmentValue: normalizedAssessmentValue,
    primaryEvidenceAngle: normalizePrimaryEvidenceAngle(micro)
  };
}

function normalizePrimaryEvidenceAngle(micro) {
  if (isNonEmptyString(micro.primaryEvidenceAngle)) return micro.primaryEvidenceAngle;
  if (Array.isArray(micro.suggestedEvidenceAngles)) {
    const firstAngle = micro.suggestedEvidenceAngles.find((angle) => isNonEmptyString(angle));
    if (firstAngle) return firstAngle;
  }
  return "";
}

function normalizeMicroRole(value) {
  if (MICRO_KNOWLEDGE_ROLES.includes(value)) return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "relationship";
  if (normalized.includes("definition") || normalized.includes("concept") || normalized.includes("概念") || normalized.includes("定义")) {
    return "definition";
  }
  if (normalized.includes("boundary") || normalized.includes("limit") || normalized.includes("边界")) {
    return "boundary";
  }
  if (normalized.includes("layer") || normalized.includes("model") || normalized.includes("层")) {
    return "model_layer";
  }
  if (normalized.includes("mechanism") || normalized.includes("cause") || normalized.includes("effect") || normalized.includes("机制") || normalized.includes("因果")) {
    return "mechanism";
  }
  if (normalized.includes("process") || normalized.includes("step") || normalized.includes("流程") || normalized.includes("步骤")) {
    return "process_step";
  }
  if (normalized.includes("scenario") || normalized.includes("application") || normalized.includes("场景") || normalized.includes("应用")) {
    return "scenario_application";
  }
  if (normalized.includes("misconception") || normalized.includes("mistake") || normalized.includes("误区")) {
    return "misconception";
  }
  if (normalized.includes("example") || normalized.includes("case") || normalized.includes("案例") || normalized.includes("例子")) {
    return "example_case";
  }
  return "relationship";
}

function normalizeAssessmentValue(value) {
  if (MICRO_ASSESSMENT_VALUES.includes(value)) return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (["required", "important", "core", "high_value", "核心", "重要"].some((item) => normalized.includes(item))) {
    return "high";
  }
  if (["supporting", "medium", "secondary", "辅助", "中"].some((item) => normalized.includes(item))) {
    return "medium";
  }
  if (["context", "background", "背景"].some((item) => normalized.includes(item))) {
    return "context_only";
  }
  if (["low", "optional", "低"].some((item) => normalized.includes(item))) {
    return "low";
  }
  return "medium";
}
