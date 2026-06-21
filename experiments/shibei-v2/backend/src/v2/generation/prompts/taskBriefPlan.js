import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from "./schemaValidation.js";
import {
  PRACTICE_GOAL_KINDS,
  QUESTION_PLAN_PURPOSES,
  QUESTION_PLAN_TYPES,
  MATCHING_RELATION_TYPES,
  validateUnitPracticePlanOutput
} from "./unitPracticePlan.js";

export const TASK_BRIEF_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_task_brief_plan";

export const TASK_BRIEF_PLAN_OUTPUT_SCHEMA = {
  name: TASK_BRIEF_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["units"],
  additionalProperties: false,
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "practiceGoals", "questionPlans"],
        additionalProperties: false,
        properties: {
          unitId: { type: "string" },
          practiceGoals: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "kind", "target", "commonMisconception", "microIds", "sourceAnchorId"],
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                kind: { enum: PRACTICE_GOAL_KINDS },
                target: { type: "string", maxLength: 80 },
                commonMisconception: { type: "string", maxLength: 48 },
                microIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" }
                },
                sourceAnchorId: { type: "string" }
              }
            }
          },
          questionPlans: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "type", "purpose", "practiceGoalId", "microIds", "sourceAnchorId"],
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                type: { enum: QUESTION_PLAN_TYPES },
                purpose: { enum: QUESTION_PLAN_PURPOSES },
                practiceGoalId: { type: "string" },
                relationType: { enum: MATCHING_RELATION_TYPES },
                microIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string" }
                },
                sourceAnchorId: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};

export function validateTaskBriefPlanOutput(output, { unitIds, sourceAnchorByUnit } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["taskBriefPlan output must be an object"]);
  }
  if (!Array.isArray(output.units) || output.units.length === 0) {
    return createValidationResult(["taskBriefPlan.units must be a non-empty array"]);
  }

  const expectedUnitIds = unitIds instanceof Set ? unitIds : new Set();
  const seenUnitIds = new Set();

  output.units.forEach((unitPlan, index) => {
    const path = `taskBriefPlan.units[${index}]`;
    if (!isPlainObject(unitPlan)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!isNonEmptyString(unitPlan.unitId)) {
      errors.push(`${path}.unitId is required`);
      return;
    }
    if (seenUnitIds.has(unitPlan.unitId)) {
      errors.push(`${path}.unitId must be unique`);
    }
    seenUnitIds.add(unitPlan.unitId);
    if (expectedUnitIds.size > 0 && !expectedUnitIds.has(unitPlan.unitId)) {
      errors.push(`${path}.unitId must reference reviewPathPlan.units`);
    }

    const sourceAnchorId = sourceAnchorByUnit instanceof Map
      ? sourceAnchorByUnit.get(unitPlan.unitId)
      : undefined;
    const validation = validateUnitPracticePlanOutput(unitPlan, {
      unitId: unitPlan.unitId,
      sourceAnchorId
    });
    if (!validation.ok) {
      validation.errors.forEach((error) => errors.push(`${path}: ${error}`));
    }
    validateCompactTaskBrief(unitPlan, path, errors);
  });

  expectedUnitIds.forEach((unitId) => {
    if (!seenUnitIds.has(unitId)) {
      errors.push(`taskBriefPlan.units missing unitId ${unitId}`);
    }
  });

  return createValidationResult(errors);
}

export function getTaskBriefForUnit(taskBriefPlan, unitId) {
  return (taskBriefPlan?.units || []).find((unitPlan) => unitPlan?.unitId === unitId) || null;
}

function validateCompactTaskBrief(unitPlan, path, errors) {
  if (Array.isArray(unitPlan.practiceGoals)) {
    unitPlan.practiceGoals.forEach((goal, index) => {
      const goalPath = `${path}.practiceGoals[${index}]`;
      validateRequiredMicroIds(goal?.microIds, `${goalPath}.microIds`, errors);
      validateMaxLength(goal?.target, 80, `${goalPath}.target`, errors);
      validateMaxLength(goal?.commonMisconception, 48, `${goalPath}.commonMisconception`, errors);
    });
  }
  if (Array.isArray(unitPlan.questionPlans)) {
    unitPlan.questionPlans.forEach((plan, index) => {
      validateRequiredMicroIds(plan?.microIds, `${path}.questionPlans[${index}].microIds`, errors);
    });
  }
}

function validateRequiredMicroIds(items, path, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${path} must be a non-empty array`);
  }
}

function validateMaxLength(value, maxLength, path, errors) {
  if (typeof value === "string" && value.length > maxLength) {
    errors.push(`${path} must be at most ${maxLength} characters`);
  }
}
