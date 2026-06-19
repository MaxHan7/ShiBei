import {
  createValidationResult,
  isNonEmptyString,
  isPlainObject,
  validateUniqueIds
} from "./schemaValidation.js";

export const SOURCE_MAP_PROMPT_SCHEMA_NAME = "shibei_v2_source_map";

export const SOURCE_MAP_OUTPUT_SCHEMA = {
  name: SOURCE_MAP_PROMPT_SCHEMA_NAME,
  type: "object",
  required: ["source", "blocks"],
  properties: {
    source: {
      type: "object",
      required: ["type", "title"],
      properties: {
        type: { type: "string" },
        title: { type: "string" },
        author: { type: "string" },
        url: { type: "string" }
      }
    },
    blocks: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "text"],
        properties: {
          id: { type: "string" },
          type: { enum: ["heading", "paragraph", "quote"] },
          text: { type: "string" }
        }
      }
    }
  }
};

const SOURCE_BLOCK_TYPES = new Set(["heading", "paragraph", "quote"]);

export function validateSourceMapOutput(output) {
  const errors = [];

  if (!isPlainObject(output)) {
    return createValidationResult(["sourceMap output must be an object"]);
  }

  if (!isPlainObject(output.source)) {
    errors.push("sourceMap.source must be an object");
  } else {
    if (!isNonEmptyString(output.source.type)) {
      errors.push("sourceMap.source.type is required");
    }
    if (!isNonEmptyString(output.source.title)) {
      errors.push("sourceMap.source.title is required");
    }
  }

  if (!Array.isArray(output.blocks) || output.blocks.length === 0) {
    errors.push("sourceMap.blocks must be a non-empty array");
    return createValidationResult(errors);
  }

  validateUniqueIds(output.blocks, "sourceMap.blocks", errors);

  output.blocks.forEach((block, index) => {
    const path = `sourceMap.blocks[${index}]`;

    if (!isPlainObject(block)) {
      return;
    }

    if (!SOURCE_BLOCK_TYPES.has(block.type)) {
      errors.push(`${path}.type must be heading, paragraph, or quote`);
    }

    if (!isNonEmptyString(block.text)) {
      errors.push(`${path}.text is required`);
    }
  });

  return createValidationResult(errors);
}
