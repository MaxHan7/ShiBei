import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  requireFields
} from "./schemaValidation.js";

export const UNIT_SUMMARY_DRAFT_PROMPT_SCHEMA_NAME = "shibei_v2_unit_summary_draft";

export const UNIT_SUMMARY_DRAFT_OUTPUT_SCHEMA = {
  name: UNIT_SUMMARY_DRAFT_PROMPT_SCHEMA_NAME,
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
};

export function validateUnitSummaryDraftOutput(output, { unitId } = {}) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["unitSummaryDraft output must be an object"]);
  }

  if (!isNonEmptyString(output.unitId)) {
    errors.push("unitSummaryDraft.unitId is required");
  } else if (unitId && output.unitId !== unitId) {
    errors.push(`unitSummaryDraft.unitId must match ${unitId}`);
  }

  if (!isPlainObject(output.overview)) {
    errors.push("unitSummaryDraft.overview must be an object");
  } else {
    requireFields(output.overview, ["text"], "unitSummaryDraft.overview", errors);
  }

  if (!isPlainObject(output.summary)) {
    errors.push("unitSummaryDraft.summary must be an object");
  } else {
    requireFields(output.summary, ["title", "text"], "unitSummaryDraft.summary", errors);
  }

  return createValidationResult(errors);
}
