import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from "./schemaValidation.js";

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
            required: ["text"],
            properties: {
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

    if (!isPlainObject(unitCopy.overview)) {
      errors.push(`${path}.overview must be an object`);
    } else if (!isNonEmptyString(unitCopy.overview.text)) {
      errors.push(`${path}.overview.text is required`);
    }

    if (!isPlainObject(unitCopy.summary)) {
      errors.push(`${path}.summary must be an object`);
    } else if (!isNonEmptyString(unitCopy.summary.text)) {
      errors.push(`${path}.summary.text is required`);
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
