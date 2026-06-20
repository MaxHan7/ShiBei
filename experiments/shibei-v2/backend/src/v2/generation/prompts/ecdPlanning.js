import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields
} from "./schemaValidation.js";

export const ECD_PLANNING_PROMPT_SCHEMA_NAME = "shibei_v2_ecd_planning";

export const KNOWLEDGE_SHAPES = [
  "core_concept",
  "layered_framework",
  "process_steps",
  "type_set",
  "boundary_rule",
  "scenario_rule",
  "cause_effect",
  "comparison_pair",
  "signal_action",
  "role_boundary",
  "misconception"
];

export const CLAIM_TYPES = [
  "concept_understanding",
  "structure_understanding",
  "boundary_understanding",
  "process_understanding",
  "cause_effect_understanding",
  "scenario_transfer",
  "misconception_recognition",
  "source_grounded_understanding"
];

export const EVIDENCE_TYPES = [
  "select_core_claim",
  "distinguish_boundary",
  "map_structure_relation",
  "apply_to_scenario",
  "identify_misconception",
  "map_step_purpose",
  "map_signal_action",
  "ground_answer_in_source"
];

export const SUB_OBJECTIVE_IMPORTANCE = [
  "required",
  "supporting",
  "optional"
];

export const SUB_OBJECTIVE_TYPES = [
  "definition",
  "boundary",
  "layer",
  "element_classification",
  "mechanism",
  "process_step",
  "scenario_application",
  "misconception",
  "example_case"
];

export const COVERAGE_REQUIREMENTS = [
  "required",
  "supporting",
  "optional"
];

export const EVIDENCE_ANGLE_TYPES = [
  "definition_grasp",
  "structure_mapping",
  "boundary_discrimination",
  "misconception_detection",
  "scenario_transfer",
  "mechanism_reasoning",
  "source_grounding"
];

export const EVIDENCE_ANGLE_IMPORTANCE = [
  "required",
  "supporting",
  "optional"
];

export const TASK_AFFORDANCES = [
  "multiple_choice",
  "matching",
  "future_sorting",
  "future_correction",
  "future_source_location"
];

export const TASK_PURPOSES = [
  "light_understanding",
  "boundary_check",
  "misconception_check",
  "scenario_application",
  "counterexample_check",
  "layer_role_matching",
  "type_feature_matching",
  "step_purpose_matching",
  "signal_action_matching",
  "role_responsibility_matching"
];

const sourceAnchorIdsSchema = {
  type: "array",
  items: { type: "string" }
};

const evidenceIdsSchema = {
  type: "array",
  items: { type: "string" }
};

const angleIdsSchema = {
  type: "array",
  items: { type: "string" }
};

const selectedTaskSchema = {
  type: "object",
  required: [
    "questionPlanId",
    "taskPlanId",
    "evidenceIds",
    "angleIds",
    "taskAffordance",
    "taskPurpose",
    "assemblyReason"
  ],
  properties: {
    questionPlanId: { type: "string" },
    taskPlanId: { type: "string" },
    evidenceIds: evidenceIdsSchema,
    angleIds: angleIdsSchema,
    taskAffordance: { enum: TASK_AFFORDANCES },
    taskPurpose: { enum: TASK_PURPOSES },
    assemblyReason: { type: "string" }
  }
};

export const ECD_PLANNING_OUTPUT_SCHEMA = {
  name: ECD_PLANNING_PROMPT_SCHEMA_NAME,
  type: "object",
  required: [
    "articleUnderstanding",
    "knowledgeModel",
    "unitSubObjectives",
    "unitLearningClaims",
    "unitEvidenceAngles",
    "unitEvidenceNeeds",
    "unitTaskPlan",
    "unitAssemblyPlan"
  ],
  properties: {
    articleUnderstanding: {
      type: "object",
      required: ["coreThesis", "articleStructure", "reviewableSections", "nonReviewableSections"],
      properties: {
        coreThesis: { type: "string" },
        articleStructure: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "title", "role", "sourceAnchorIds"],
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              role: { type: "string" },
              sourceAnchorIds: sourceAnchorIdsSchema
            }
          }
        },
        reviewableSections: {
          type: "array",
          items: { type: "string" }
        },
        nonReviewableSections: {
          type: "array",
          items: {
            type: "object",
            required: ["sourceAnchorId", "reason"],
            properties: {
              sourceAnchorId: { type: "string" },
              reason: { type: "string" }
            }
          }
        }
      }
    },
    knowledgeModel: {
      type: "object",
      required: ["units"],
      properties: {
        units: {
          type: "array",
          items: {
            type: "object",
            required: [
              "unitId",
              "title",
              "nodeLabel",
              "shortSummary",
              "detailSummary",
              "knowledgeShape",
              "sourceAnchorId"
            ],
            properties: {
              unitId: { type: "string" },
              title: { type: "string" },
              nodeLabel: { type: "string" },
              shortSummary: { type: "string" },
              detailSummary: { type: "string" },
              knowledgeShape: { enum: KNOWLEDGE_SHAPES },
              sourceAnchorId: { type: "string" }
            }
          }
        }
      }
    },
    unitSubObjectives: {
      type: "array",
      items: {
        type: "object",
        required: [
          "unitId",
          "subObjectiveId",
          "title",
          "type",
          "importance",
          "learningTarget",
          "sourceAnchorId"
        ],
        properties: {
          unitId: { type: "string" },
          subObjectiveId: { type: "string" },
          title: { type: "string" },
          type: { enum: SUB_OBJECTIVE_TYPES },
          importance: { enum: SUB_OBJECTIVE_IMPORTANCE },
          learningTarget: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    },
    unitLearningClaims: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "subObjectiveId", "claimId", "claimType", "learningClaim", "sourceAnchorId"],
        properties: {
          unitId: { type: "string" },
          subObjectiveId: { type: "string" },
          claimId: { type: "string" },
          claimType: { enum: CLAIM_TYPES },
          learningClaim: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    },
    unitEvidenceAngles: {
      type: "array",
      items: {
        type: "object",
        required: [
          "unitId",
          "angleId",
          "subObjectiveId",
          "claimId",
          "angleType",
          "importance",
          "anglePurpose",
          "sourceAnchorId"
        ],
        properties: {
          unitId: { type: "string" },
          angleId: { type: "string" },
          subObjectiveId: { type: "string" },
          claimId: { type: "string" },
          angleType: { enum: EVIDENCE_ANGLE_TYPES },
          importance: { enum: EVIDENCE_ANGLE_IMPORTANCE },
          anglePurpose: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    },
    unitEvidenceNeeds: {
      type: "array",
      items: {
        type: "object",
        required: [
          "unitId",
          "evidenceId",
          "subObjectiveId",
          "claimId",
          "angleId",
          "evidenceType",
          "coverageRequirement",
          "evidenceNeed",
          "observableResponse",
          "sourceAnchorId"
        ],
        properties: {
          unitId: { type: "string" },
          evidenceId: { type: "string" },
          subObjectiveId: { type: "string" },
          claimId: { type: "string" },
          angleId: { type: "string" },
          evidenceType: { enum: EVIDENCE_TYPES },
          coverageRequirement: { enum: COVERAGE_REQUIREMENTS },
          evidenceNeed: { type: "string" },
          observableResponse: { type: "string" },
          sourceAnchorId: { type: "string" }
        }
      }
    },
    unitTaskPlan: {
      type: "array",
      items: {
        type: "object",
        required: [
          "unitId",
          "taskPlanId",
          "evidenceIds",
          "angleIds",
          "taskAffordance",
          "taskPurpose",
          "whyThisTask"
        ],
        properties: {
          unitId: { type: "string" },
          taskPlanId: { type: "string" },
          evidenceIds: evidenceIdsSchema,
          angleIds: angleIdsSchema,
          taskAffordance: { enum: TASK_AFFORDANCES },
          taskPurpose: { enum: TASK_PURPOSES },
          whyThisTask: { type: "string" }
        }
      }
    },
    unitAssemblyPlan: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "selectedTasks", "skippedEvidence"],
        properties: {
          unitId: { type: "string" },
          selectedTasks: {
            type: "array",
            items: selectedTaskSchema
          },
          skippedEvidence: {
            type: "array",
            items: {
              type: "object",
              required: ["evidenceId", "reason"],
              properties: {
                evidenceId: { type: "string" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    }
  }
};

export function validateEcdPlanningOutput(output, { unitIds = new Set(), sourceAnchorIds = new Set() } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["ecdPlanning output must be an object"]);
  }

  requireAnyFields(
    output,
    [
      "articleUnderstanding",
      "knowledgeModel",
      "unitSubObjectives",
      "unitLearningClaims",
      "unitEvidenceAngles",
      "unitEvidenceNeeds",
      "unitTaskPlan",
      "unitAssemblyPlan"
    ],
    "ecdPlanning",
    errors
  );

  validateArticleUnderstanding(output.articleUnderstanding, errors);
  validateKnowledgeModel(output.knowledgeModel, { unitIds, sourceAnchorIds, errors });
  const subObjectiveIds = validateSubObjectives(output.unitSubObjectives, { unitIds, sourceAnchorIds, errors });
  const claimIds = validateLearningClaims(output.unitLearningClaims, {
    unitIds,
    sourceAnchorIds,
    subObjectiveIds,
    errors
  });
  const angleIds = validateEvidenceAngles(output.unitEvidenceAngles, {
    unitIds,
    sourceAnchorIds,
    claimIds,
    subObjectiveIds,
    errors
  });
  const evidenceIds = validateEvidenceNeeds(output.unitEvidenceNeeds, {
    unitIds,
    sourceAnchorIds,
    claimIds,
    subObjectiveIds,
    angleIds,
    errors
  });
  const taskPlanIds = validateTaskPlan(output.unitTaskPlan, { unitIds, evidenceIds, angleIds, errors });
  validateAssemblyPlan(output.unitAssemblyPlan, {
    unitIds,
    evidenceItems: output.unitEvidenceNeeds,
    evidenceIds,
    angleItems: output.unitEvidenceAngles,
    angleIds,
    taskPlanIds,
    errors
  });

  return createValidationResult(errors);
}

export function normalizeEcdPlanningOutput(output, {
  unitSourceAnchorIds = new Map(),
  sourceAnchorIds = new Set(unitSourceAnchorIds.values())
} = {}) {
  if (!isPlainObject(output)) return output;

  const normalized = {
    ...output,
    knowledgeModel: normalizeKnowledgeModel(output.knowledgeModel),
    unitSubObjectives: normalizeEnumItems(
      normalizeEnumItems(output.unitSubObjectives, {
        field: "type",
        originalField: "originalType",
        allowedValues: SUB_OBJECTIVE_TYPES,
        fallback: "definition"
      }),
      {
        field: "importance",
        originalField: "originalImportance",
        allowedValues: SUB_OBJECTIVE_IMPORTANCE,
        fallback: "required"
      }
    ),
    unitLearningClaims: normalizeEnumItems(output.unitLearningClaims, {
      field: "claimType",
      originalField: "originalClaimType",
      allowedValues: CLAIM_TYPES,
      fallback: "source_grounded_understanding"
    }),
    unitEvidenceAngles: normalizeEnumItems(
      normalizeEnumItems(output.unitEvidenceAngles, {
        field: "angleType",
        originalField: "originalAngleType",
        allowedValues: EVIDENCE_ANGLE_TYPES,
        fallback: "definition_grasp"
      }),
      {
        field: "importance",
        originalField: "originalImportance",
        allowedValues: EVIDENCE_ANGLE_IMPORTANCE,
        fallback: "supporting"
      }
    ),
    unitEvidenceNeeds: normalizeEnumItems(
      normalizeEnumItems(output.unitEvidenceNeeds, {
        field: "evidenceType",
        originalField: "originalEvidenceType",
        allowedValues: EVIDENCE_TYPES,
        fallback: "ground_answer_in_source"
      }),
      {
        field: "coverageRequirement",
        originalField: "originalCoverageRequirement",
        allowedValues: COVERAGE_REQUIREMENTS,
        fallback: "required"
      }
    ),
    unitTaskPlan: normalizeEnumItems(
      normalizeEnumItems(output.unitTaskPlan, {
        field: "taskAffordance",
        originalField: "originalTaskAffordance",
        allowedValues: TASK_AFFORDANCES,
        fallback: "multiple_choice"
      }),
      {
        field: "taskPurpose",
        originalField: "originalTaskPurpose",
        allowedValues: TASK_PURPOSES,
        fallback: "light_understanding"
      }
    ),
    unitAssemblyPlan: normalizeAssemblyPlan(output.unitAssemblyPlan)
  };

  return normalizeUnitScopedSourceAnchors(normalized, {
    unitSourceAnchorIds,
    sourceAnchorIds
  });
}

function normalizeKnowledgeModel(knowledgeModel) {
  if (!isPlainObject(knowledgeModel) || !Array.isArray(knowledgeModel.units)) return knowledgeModel;
  return {
    ...knowledgeModel,
    units: normalizeEnumItems(knowledgeModel.units, {
      field: "knowledgeShape",
      originalField: "originalKnowledgeShape",
      allowedValues: KNOWLEDGE_SHAPES,
      fallback: "core_concept"
    })
  };
}

function normalizeAssemblyPlan(items) {
  if (!Array.isArray(items)) return items;
  return items.map((assembly) => {
    if (!isPlainObject(assembly) || !Array.isArray(assembly.selectedTasks)) return assembly;
    const selectedTasks = normalizeEnumItems(
      normalizeEnumItems(assembly.selectedTasks, {
        field: "taskAffordance",
        originalField: "originalTaskAffordance",
        allowedValues: TASK_AFFORDANCES,
        fallback: "multiple_choice"
      }),
      {
        field: "taskPurpose",
        originalField: "originalTaskPurpose",
        allowedValues: TASK_PURPOSES,
        fallback: "light_understanding"
      }
    );
    return { ...assembly, selectedTasks };
  });
}

function normalizeEnumItems(items, { field, originalField, allowedValues, fallback }) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => normalizeEnumField(item, { field, originalField, allowedValues, fallback }));
}

function normalizeEnumField(item, { field, originalField, allowedValues, fallback }) {
  if (!isPlainObject(item)) return item;
  const value = item[field];
  if (!isNonEmptyString(value) || allowedValues.includes(value)) return item;
  return {
    ...item,
    [originalField]: value,
    [field]: fallback
  };
}

function normalizeUnitScopedSourceAnchors(output, { unitSourceAnchorIds, sourceAnchorIds }) {
  if (!isPlainObject(output) || !(unitSourceAnchorIds instanceof Map)) return output;
  return {
    ...output,
    knowledgeModel: isPlainObject(output.knowledgeModel) && Array.isArray(output.knowledgeModel.units)
      ? {
          ...output.knowledgeModel,
          units: output.knowledgeModel.units.map((item) =>
            normalizeUnitScopedSourceAnchor(item, { unitSourceAnchorIds, sourceAnchorIds })
          )
        }
      : output.knowledgeModel,
    unitSubObjectives: normalizeSourceAnchorItems(output.unitSubObjectives, { unitSourceAnchorIds, sourceAnchorIds }),
    unitLearningClaims: normalizeSourceAnchorItems(output.unitLearningClaims, { unitSourceAnchorIds, sourceAnchorIds }),
    unitEvidenceAngles: normalizeSourceAnchorItems(output.unitEvidenceAngles, { unitSourceAnchorIds, sourceAnchorIds }),
    unitEvidenceNeeds: normalizeSourceAnchorItems(output.unitEvidenceNeeds, { unitSourceAnchorIds, sourceAnchorIds })
  };
}

function normalizeSourceAnchorItems(items, options) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => normalizeUnitScopedSourceAnchor(item, options));
}

function normalizeUnitScopedSourceAnchor(item, { unitSourceAnchorIds, sourceAnchorIds }) {
  if (!isPlainObject(item) || !isNonEmptyString(item.unitId)) return item;
  const fallbackSourceAnchorId = unitSourceAnchorIds.get(item.unitId);
  if (!isNonEmptyString(fallbackSourceAnchorId)) return item;
  if (sourceAnchorIds instanceof Set && sourceAnchorIds.has(item.sourceAnchorId)) return item;
  if (item.sourceAnchorId === fallbackSourceAnchorId) return item;
  return {
    ...item,
    ...(isNonEmptyString(item.sourceAnchorId) ? { originalSourceAnchorId: item.sourceAnchorId } : {}),
    sourceAnchorId: fallbackSourceAnchorId
  };
}

function requireAnyFields(value, fields, path, errors) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null) {
      errors.push(`${path}.${field} is required`);
    }
  }
}

function validateArticleUnderstanding(value, errors) {
  if (!isPlainObject(value)) {
    errors.push("ecdPlanning.articleUnderstanding must be an object");
    return;
  }

  requireFields(value, ["coreThesis"], "ecdPlanning.articleUnderstanding", errors);

  if (!Array.isArray(value.articleStructure) || value.articleStructure.length === 0) {
    errors.push("ecdPlanning.articleUnderstanding.articleStructure must be a non-empty array");
  }
  if (!Array.isArray(value.reviewableSections)) {
    errors.push("ecdPlanning.articleUnderstanding.reviewableSections must be an array");
  }
  if (!Array.isArray(value.nonReviewableSections)) {
    errors.push("ecdPlanning.articleUnderstanding.nonReviewableSections must be an array");
  }
}

function validateKnowledgeModel(value, { unitIds, sourceAnchorIds, errors }) {
  if (!isPlainObject(value)) {
    errors.push("ecdPlanning.knowledgeModel must be an object");
    return;
  }
  if (!Array.isArray(value.units) || value.units.length === 0) {
    errors.push("ecdPlanning.knowledgeModel.units must be a non-empty array");
    return;
  }

  const seen = new Set();
  value.units.forEach((unit, index) => {
    const path = `ecdPlanning.knowledgeModel.units[${index}]`;
    if (!isPlainObject(unit)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      unit,
      ["unitId", "title", "nodeLabel", "shortSummary", "detailSummary", "knowledgeShape", "sourceAnchorId"],
      path,
      errors
    );
    if (seen.has(unit.unitId)) errors.push(`${path}.unitId must be unique`);
    seen.add(unit.unitId);
    if (unitIds.size > 0 && !unitIds.has(unit.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(unit.knowledgeShape) && !KNOWLEDGE_SHAPES.includes(unit.knowledgeShape)) {
      errors.push(`${path}.knowledgeShape must be one of ${KNOWLEDGE_SHAPES.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(unit.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });
}

function validateSubObjectives(items, { unitIds, sourceAnchorIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitSubObjectives must be a non-empty array");
    return ids;
  }

  items.forEach((item, index) => {
    const path = `ecdPlanning.unitSubObjectives[${index}]`;
    if (!isPlainObject(item)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      item,
      ["unitId", "subObjectiveId", "title", "type", "importance", "learningTarget", "sourceAnchorId"],
      path,
      errors
    );
    if (ids.has(item.subObjectiveId)) errors.push(`${path}.subObjectiveId must be unique`);
    ids.add(item.subObjectiveId);
    if (unitIds.size > 0 && !unitIds.has(item.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(item.type) && !SUB_OBJECTIVE_TYPES.includes(item.type)) {
      errors.push(`${path}.type must be one of ${SUB_OBJECTIVE_TYPES.join(", ")}`);
    }
    if (isNonEmptyString(item.importance) && !SUB_OBJECTIVE_IMPORTANCE.includes(item.importance)) {
      errors.push(`${path}.importance must be one of ${SUB_OBJECTIVE_IMPORTANCE.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(item.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateLearningClaims(items, { unitIds, sourceAnchorIds, subObjectiveIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitLearningClaims must be a non-empty array");
    return ids;
  }

  items.forEach((claim, index) => {
    const path = `ecdPlanning.unitLearningClaims[${index}]`;
    if (!isPlainObject(claim)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      claim,
      ["unitId", "subObjectiveId", "claimId", "claimType", "learningClaim", "sourceAnchorId"],
      path,
      errors
    );
    if (ids.has(claim.claimId)) errors.push(`${path}.claimId must be unique`);
    ids.add(claim.claimId);
    if (unitIds.size > 0 && !unitIds.has(claim.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(claim.subObjectiveId) && !subObjectiveIds.has(claim.subObjectiveId)) {
      errors.push(`${path}.subObjectiveId must reference a unitSubObjectives item`);
    }
    if (isNonEmptyString(claim.claimType) && !CLAIM_TYPES.includes(claim.claimType)) {
      errors.push(`${path}.claimType must be one of ${CLAIM_TYPES.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(claim.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateEvidenceAngles(items, { unitIds, sourceAnchorIds, claimIds, subObjectiveIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitEvidenceAngles must be a non-empty array");
    return ids;
  }

  items.forEach((angle, index) => {
    const path = `ecdPlanning.unitEvidenceAngles[${index}]`;
    if (!isPlainObject(angle)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      angle,
      ["unitId", "angleId", "subObjectiveId", "claimId", "angleType", "importance", "anglePurpose", "sourceAnchorId"],
      path,
      errors
    );
    if (ids.has(angle.angleId)) errors.push(`${path}.angleId must be unique`);
    ids.add(angle.angleId);
    if (unitIds.size > 0 && !unitIds.has(angle.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (isNonEmptyString(angle.subObjectiveId) && !subObjectiveIds.has(angle.subObjectiveId)) {
      errors.push(`${path}.subObjectiveId must reference a unitSubObjectives item`);
    }
    if (isNonEmptyString(angle.claimId) && !claimIds.has(angle.claimId)) {
      errors.push(`${path}.claimId must reference a unitLearningClaims item`);
    }
    if (isNonEmptyString(angle.angleType) && !EVIDENCE_ANGLE_TYPES.includes(angle.angleType)) {
      errors.push(`${path}.angleType must be one of ${EVIDENCE_ANGLE_TYPES.join(", ")}`);
    }
    if (isNonEmptyString(angle.importance) && !EVIDENCE_ANGLE_IMPORTANCE.includes(angle.importance)) {
      errors.push(`${path}.importance must be one of ${EVIDENCE_ANGLE_IMPORTANCE.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(angle.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateEvidenceNeeds(items, { unitIds, sourceAnchorIds, claimIds, subObjectiveIds, angleIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitEvidenceNeeds must be a non-empty array");
    return ids;
  }

  items.forEach((evidence, index) => {
    const path = `ecdPlanning.unitEvidenceNeeds[${index}]`;
    if (!isPlainObject(evidence)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(
      evidence,
      [
        "unitId",
        "evidenceId",
        "subObjectiveId",
        "claimId",
        "angleId",
        "evidenceType",
        "coverageRequirement",
        "evidenceNeed",
        "observableResponse",
        "sourceAnchorId"
      ],
      path,
      errors
    );
    if (ids.has(evidence.evidenceId)) errors.push(`${path}.evidenceId must be unique`);
    ids.add(evidence.evidenceId);
    if (unitIds.size > 0 && !unitIds.has(evidence.unitId)) {
      errors.push(`${path}.unitId must reference a known unit`);
    }
    if (isNonEmptyString(evidence.claimId) && !claimIds.has(evidence.claimId)) {
      errors.push(`${path}.claimId must reference a unitLearningClaims item`);
    }
    if (isNonEmptyString(evidence.subObjectiveId) && !subObjectiveIds.has(evidence.subObjectiveId)) {
      errors.push(`${path}.subObjectiveId must reference a unitSubObjectives item`);
    }
    if (isNonEmptyString(evidence.angleId) && !angleIds.has(evidence.angleId)) {
      errors.push(`${path}.angleId must reference a unitEvidenceAngles item`);
    }
    if (isNonEmptyString(evidence.evidenceType) && !EVIDENCE_TYPES.includes(evidence.evidenceType)) {
      errors.push(`${path}.evidenceType must be one of ${EVIDENCE_TYPES.join(", ")}`);
    }
    if (
      isNonEmptyString(evidence.coverageRequirement) &&
      !COVERAGE_REQUIREMENTS.includes(evidence.coverageRequirement)
    ) {
      errors.push(`${path}.coverageRequirement must be one of ${COVERAGE_REQUIREMENTS.join(", ")}`);
    }
    if (sourceAnchorIds.size > 0 && !sourceAnchorIds.has(evidence.sourceAnchorId)) {
      errors.push(`${path}.sourceAnchorId must reference a known source anchor`);
    }
  });

  return ids;
}

function validateTaskPlan(items, { unitIds, evidenceIds, angleIds, errors }) {
  const ids = new Set();
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitTaskPlan must be a non-empty array");
    return ids;
  }

  items.forEach((task, index) => {
    const path = `ecdPlanning.unitTaskPlan[${index}]`;
    if (!isPlainObject(task)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(task, ["unitId", "taskPlanId", "taskAffordance", "taskPurpose", "whyThisTask"], path, errors);
    if (ids.has(task.taskPlanId)) errors.push(`${path}.taskPlanId must be unique`);
    ids.add(task.taskPlanId);
    if (unitIds.size > 0 && !unitIds.has(task.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (!Array.isArray(task.evidenceIds) || task.evidenceIds.length === 0) {
      errors.push(`${path}.evidenceIds must be a non-empty array`);
    } else {
      task.evidenceIds.forEach((evidenceId, evidenceIndex) => {
        if (!evidenceIds.has(evidenceId)) {
          errors.push(`${path}.evidenceIds[${evidenceIndex}] must reference a unitEvidenceNeeds item`);
        }
      });
    }
    validateAngleIdArray(task.angleIds, `${path}.angleIds`, angleIds, errors);
    if (isNonEmptyString(task.taskAffordance) && !TASK_AFFORDANCES.includes(task.taskAffordance)) {
      errors.push(`${path}.taskAffordance must be one of ${TASK_AFFORDANCES.join(", ")}`);
    }
    if (isNonEmptyString(task.taskPurpose) && !TASK_PURPOSES.includes(task.taskPurpose)) {
      errors.push(`${path}.taskPurpose must be one of ${TASK_PURPOSES.join(", ")}`);
    }
  });

  return ids;
}

function validateAssemblyPlan(items, { unitIds, evidenceItems, evidenceIds, angleItems, angleIds, taskPlanIds, errors }) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("ecdPlanning.unitAssemblyPlan must be a non-empty array");
    return;
  }

  const requiredEvidenceByUnit = groupRequiredEvidenceByUnit(evidenceItems);
  const requiredAnglesByUnit = groupRequiredAnglesByUnit(angleItems);

  items.forEach((assembly, index) => {
    const path = `ecdPlanning.unitAssemblyPlan[${index}]`;
    if (!isPlainObject(assembly)) {
      errors.push(`${path} must be an object`);
      return;
    }
    requireFields(assembly, ["unitId"], path, errors);
    if (unitIds.size > 0 && !unitIds.has(assembly.unitId)) errors.push(`${path}.unitId must reference a known unit`);
    if (!Array.isArray(assembly.selectedTasks)) {
      errors.push(`${path}.selectedTasks must be an array`);
    } else {
      assembly.selectedTasks.forEach((task, taskIndex) => {
        validateSelectedTask(task, `${path}.selectedTasks[${taskIndex}]`, { evidenceIds, angleIds, taskPlanIds, errors });
      });
      validateRequiredEvidenceCoverage(assembly, {
        path,
        requiredEvidenceByUnit,
        errors
      });
      validateRequiredAngleCoverage(assembly, {
        path,
        requiredAnglesByUnit,
        errors
      });
    }
    if (!Array.isArray(assembly.skippedEvidence)) {
      errors.push(`${path}.skippedEvidence must be an array`);
    }
  });
}

function validateAngleIdArray(items, path, angleIds, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }
  items.forEach((angleId, index) => {
    if (!angleIds.has(angleId)) {
      errors.push(`${path}[${index}] must reference a unitEvidenceAngles item`);
    }
  });
}

function groupRequiredEvidenceByUnit(evidenceItems) {
  const map = new Map();
  for (const evidence of Array.isArray(evidenceItems) ? evidenceItems : []) {
    if (!isPlainObject(evidence) || evidence.coverageRequirement !== "required") continue;
    const list = map.get(evidence.unitId) || [];
    list.push(evidence.evidenceId);
    map.set(evidence.unitId, list);
  }
  return map;
}

function groupRequiredAnglesByUnit(angleItems) {
  const map = new Map();
  for (const angle of Array.isArray(angleItems) ? angleItems : []) {
    if (!isPlainObject(angle) || angle.importance !== "required") continue;
    const list = map.get(angle.unitId) || [];
    list.push(angle.angleId);
    map.set(angle.unitId, list);
  }
  return map;
}

function validateRequiredEvidenceCoverage(assembly, { path, requiredEvidenceByUnit, errors }) {
  const requiredEvidence = requiredEvidenceByUnit.get(assembly.unitId) || [];
  if (requiredEvidence.length === 0) return;

  const selectedEvidence = new Set();
  for (const task of assembly.selectedTasks) {
    for (const evidenceId of Array.isArray(task?.evidenceIds) ? task.evidenceIds : []) {
      selectedEvidence.add(evidenceId);
    }
  }

  for (const evidenceId of requiredEvidence) {
    if (!selectedEvidence.has(evidenceId)) {
      errors.push(`${path}.selectedTasks must cover required evidence ${evidenceId}`);
    }
  }
}

function validateRequiredAngleCoverage(assembly, { path, requiredAnglesByUnit, errors }) {
  const requiredAngles = requiredAnglesByUnit.get(assembly.unitId) || [];
  if (requiredAngles.length === 0) return;

  const selectedAngles = new Set();
  for (const task of assembly.selectedTasks) {
    for (const angleId of Array.isArray(task?.angleIds) ? task.angleIds : []) {
      selectedAngles.add(angleId);
    }
  }

  for (const angleId of requiredAngles) {
    if (!selectedAngles.has(angleId)) {
      errors.push(`${path}.selectedTasks must cover required angle ${angleId}`);
    }
  }
}

function validateSelectedTask(task, path, { evidenceIds, angleIds, taskPlanIds, errors }) {
  if (!isPlainObject(task)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(task, ["questionPlanId", "taskPlanId", "taskAffordance", "taskPurpose", "assemblyReason"], path, errors);

  if (isNonEmptyString(task.taskPlanId) && !taskPlanIds.has(task.taskPlanId)) {
    errors.push(`${path}.taskPlanId must reference a unitTaskPlan item`);
  }
  if (!Array.isArray(task.evidenceIds) || task.evidenceIds.length === 0) {
    errors.push(`${path}.evidenceIds must be a non-empty array`);
  } else {
    task.evidenceIds.forEach((evidenceId, evidenceIndex) => {
      if (!evidenceIds.has(evidenceId)) {
        errors.push(`${path}.evidenceIds[${evidenceIndex}] must reference a unitEvidenceNeeds item`);
      }
    });
  }
  validateAngleIdArray(task.angleIds, `${path}.angleIds`, angleIds, errors);
  if (isNonEmptyString(task.taskAffordance) && !TASK_AFFORDANCES.includes(task.taskAffordance)) {
    errors.push(`${path}.taskAffordance must be one of ${TASK_AFFORDANCES.join(", ")}`);
  }
  if (isNonEmptyString(task.taskPurpose) && !TASK_PURPOSES.includes(task.taskPurpose)) {
    errors.push(`${path}.taskPurpose must be one of ${TASK_PURPOSES.join(", ")}`);
  }
}
