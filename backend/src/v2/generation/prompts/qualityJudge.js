import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject
} from "./schemaValidation.js";

export const QUALITY_JUDGE_PROMPT_SCHEMA_NAME = "shibei_v2_quality_judge";

export const QUALITY_JUDGE_OUTPUT_SCHEMA = {
  name: QUALITY_JUDGE_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["verdict", "issues"],
  properties: {
    verdict: { enum: ["pass", "revise", "discard"] },
    issues: {
      type: "array",
      items: {
        type: "object",
        required: ["code", "severity", "message"],
        properties: {
          code: { type: "string" },
          severity: { enum: ["info", "warning", "error"] },
          message: { type: "string" },
          targetId: { type: "string" }
        }
      }
    }
  }
};

const VERDICTS = new Set(["pass", "revise", "discard"]);
const SEVERITIES = new Set(["info", "warning", "error"]);

export function validateQualityJudgeOutput(output) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["qualityJudge output must be an object"]);
  }

  if (!VERDICTS.has(output.verdict)) {
    errors.push("qualityJudge.verdict must be pass, revise, or discard");
  }

  if (!Array.isArray(output.issues)) {
    errors.push("qualityJudge.issues must be an array");
    return createValidationResult(errors);
  }

  output.issues.forEach((issue, index) => {
    const path = `qualityJudge.issues[${index}]`;

    if (!isPlainObject(issue)) {
      errors.push(`${path} must be an object`);
      return;
    }

    if (!isNonEmptyString(issue.code)) {
      errors.push(`${path}.code is required`);
    }
    if (!SEVERITIES.has(issue.severity)) {
      errors.push(`${path}.severity must be info, warning, or error`);
    }
    if (!isNonEmptyString(issue.message)) {
      errors.push(`${path}.message is required`);
    }
  });

  return createValidationResult(errors);
}
