import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields,
  validateUniqueIds
} from "./schemaValidation.js";

export const UNIT_PRACTICE_PLAN_PROMPT_SCHEMA_NAME = "shibei_v2_unit_practice_plan";

export const PRACTICE_GOAL_KINDS = [
  "core_understanding",
  "boundary_clarification",
  "scenario_application",
  "relationship_mapping"
];

export const QUESTION_PLAN_TYPES = ["multiple_choice", "matching"];

export const QUESTION_PLAN_PURPOSES = [
  "light_understanding",
  "scenario_application",
  "boundary_clarification",
  "relationship_matching",
  "boundary_check",
  "misconception_check",
  "counterexample_check",
  "layer_role_matching",
  "type_feature_matching",
  "step_purpose_matching",
  "signal_action_matching",
  "role_responsibility_matching"
];

export const MATCHING_RELATION_TYPES = [
  "responsibility",
  "boundary",
  "usage_timing",
  "scenario_effect",
  "verification_dimension",
  "process_signal"
];

export const UNIT_PRACTICE_PLAN_OUTPUT_SCHEMA = {
  name: UNIT_PRACTICE_PLAN_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["unitId", "practiceGoals", "questionPlans"],
  properties: {
    unitId: { type: "string" },
    practiceGoals: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "kind", "target", "commonMisconception", "sourceAnchorId"],
        properties: {
          id: { type: "string" },
          kind: { enum: PRACTICE_GOAL_KINDS },
          target: { type: "string" },
          commonMisconception: { type: "string" },
          targetIds: {
            type: "array",
            items: { type: "string" }
          },
          microIds: {
            type: "array",
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
        required: ["id", "type", "purpose", "practiceGoalId", "sourceAnchorId"],
        properties: {
          id: { type: "string" },
          type: { enum: QUESTION_PLAN_TYPES },
          purpose: { enum: QUESTION_PLAN_PURPOSES },
          practiceGoalId: { type: "string" },
          relationType: { enum: MATCHING_RELATION_TYPES },
          targetIds: {
            type: "array",
            items: { type: "string" }
          },
          microIds: {
            type: "array",
            items: { type: "string" }
          },
          sourceAnchorId: { type: "string" }
        }
      }
    }
  }
};

export function validateUnitPracticePlanOutput(output, { unitId, sourceAnchorId } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitPracticePlan output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("unitPracticePlan.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`unitPracticePlan.unitId must match ${unitId}`);
  }

  validatePracticeGoals(output.practiceGoals, { sourceAnchorId, errors });
  const practiceGoalIds = Array.isArray(output.practiceGoals)
    ? new Set(output.practiceGoals.map((goal) => goal?.id).filter(Boolean))
    : new Set();
  validateQuestionPlans(output.questionPlans, {
    practiceGoalIds,
    sourceAnchorId,
    errors
  });

  return createValidationResult(errors);
}

function validatePracticeGoals(goals, { sourceAnchorId, errors }) {
  if (!Array.isArray(goals) || goals.length === 0) {
    errors.push("unitPracticePlan.practiceGoals must be a non-empty array");
    return;
  }

  validateUniqueIds(goals, "unitPracticePlan.practiceGoals", errors);

  goals.forEach((goal, index) => {
    const path = `unitPracticePlan.practiceGoals[${index}]`;

    if (!isPlainObject(goal)) {
      errors.push(`${path} must be an object`);
      return;
    }

    requireFields(goal, ["id", "kind", "target", "commonMisconception", "sourceAnchorId"], path, errors);

    if (isNonEmptyString(goal.kind) && !PRACTICE_GOAL_KINDS.includes(goal.kind)) {
      errors.push(`${path}.kind must be one of ${PRACTICE_GOAL_KINDS.join(", ")}`);
    }
    if (sourceAnchorId && goal.sourceAnchorId !== sourceAnchorId) {
      errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
    }
    validateOptionalStringArray(goal.targetIds, `${path}.targetIds`, errors);
    validateOptionalStringArray(goal.microIds, `${path}.microIds`, errors);
  });
}

function validateQuestionPlans(plans, { practiceGoalIds, sourceAnchorId, errors }) {
  if (!Array.isArray(plans) || plans.length === 0) {
    errors.push("unitPracticePlan.questionPlans must be a non-empty array");
    return;
  }

  validateUniqueIds(plans, "unitPracticePlan.questionPlans", errors);

  plans.forEach((plan, index) => {
    const path = `unitPracticePlan.questionPlans[${index}]`;

    if (!isPlainObject(plan)) {
      errors.push(`${path} must be an object`);
      return;
    }

    requireFields(plan, ["id", "type", "purpose", "practiceGoalId", "sourceAnchorId"], path, errors);

    if (isNonEmptyString(plan.type) && !QUESTION_PLAN_TYPES.includes(plan.type)) {
      errors.push(`${path}.type must be multiple_choice or matching`);
    }
    if (isNonEmptyString(plan.purpose) && !QUESTION_PLAN_PURPOSES.includes(plan.purpose)) {
      errors.push(`${path}.purpose must be one of ${QUESTION_PLAN_PURPOSES.join(", ")}`);
    }
    if (isNonEmptyString(plan.practiceGoalId) && !practiceGoalIds.has(plan.practiceGoalId)) {
      errors.push(`${path}.practiceGoalId must reference a practice goal`);
    }
    if (sourceAnchorId && plan.sourceAnchorId !== sourceAnchorId) {
      errors.push(`${path}.sourceAnchorId must match ${sourceAnchorId}`);
    }
    if (plan.type === "matching" && !MATCHING_RELATION_TYPES.includes(plan.relationType)) {
      errors.push(`${path}.relationType is required for matching plans`);
    }
    validateOptionalStringArray(plan.targetIds, `${path}.targetIds`, errors);
    validateOptionalStringArray(plan.microIds, `${path}.microIds`, errors);
  });
}

function validateOptionalStringArray(items, path, errors) {
  if (items === undefined) return;
  if (!Array.isArray(items)) {
    errors.push(`${path} must be an array`);
    return;
  }
  items.forEach((item, index) => {
    if (!isNonEmptyString(item)) errors.push(`${path}[${index}] must be a non-empty string`);
  });
}
