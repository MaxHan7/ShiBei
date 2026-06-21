import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from "./schemaValidation.js";
import { validateUnitSummaryDraftOutput } from "./unitSummaryDraft.js";

export const UNIT_COPY_BATCH_PROMPT_SCHEMA_NAME = "shibei_v2_unit_copy_batch";

export const UNIT_COPY_BATCH_OUTPUT_SCHEMA = {
  name: UNIT_COPY_BATCH_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["units"],
  properties: {
    units: {
      type: "array",
      items: {
        type: "object",
        required: ["unitId", "overview", "summary"],
        properties: {
          unitId: { type: "string" },
          overview: {
            type: "object",
            required: ["text"],
            properties: {
              text: { type: "string" }
            }
          },
          summary: {
            type: "object",
            required: ["title", "text"],
            properties: {
              title: { type: "string" },
              text: { type: "string" }
            }
          }
        }
      }
    }
  }
};

export function validateUnitCopyBatchOutput(output, { unitIds } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitCopyBatch output must be an object"]);
  }
  if (!Array.isArray(output.units) || output.units.length === 0) {
    return createValidationResult(["unitCopyBatch.units must be a non-empty array"]);
  }

  const expectedUnitIds = unitIds instanceof Set ? unitIds : new Set();
  const seenUnitIds = new Set();

  output.units.forEach((unitCopy, index) => {
    const path = `unitCopyBatch.units[${index}]`;
    if (!isPlainObject(unitCopy)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!isNonEmptyString(unitCopy.unitId)) {
      errors.push(`${path}.unitId is required`);
      return;
    }
    if (seenUnitIds.has(unitCopy.unitId)) {
      errors.push(`${path}.unitId must be unique`);
    }
    seenUnitIds.add(unitCopy.unitId);
    if (expectedUnitIds.size > 0 && !expectedUnitIds.has(unitCopy.unitId)) {
      errors.push(`${path}.unitId must reference a planned unit`);
    }

    const validation = validateUnitSummaryDraftOutput(unitCopy, { unitId: unitCopy.unitId });
    if (!validation.ok) {
      validation.errors.forEach((error) => errors.push(`${path}: ${error}`));
    }
  });

  expectedUnitIds.forEach((unitId) => {
    if (!seenUnitIds.has(unitId)) {
      errors.push(`unitCopyBatch.units missing unitId ${unitId}`);
    }
  });

  return createValidationResult(errors);
}

export function getUnitCopyForUnit(unitCopyBatch, unitId) {
  return (unitCopyBatch?.units || []).find((unitCopy) => unitCopy?.unitId === unitId) || null;
}
