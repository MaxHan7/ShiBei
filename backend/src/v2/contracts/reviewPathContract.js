export const V2_REVIEW_PATH_SCHEMA_VERSION = "v2_review_path_1";

export const V2_QUESTION_TYPES = ["multiple_choice", "matching"];

export const V2_REVIEW_CARD_TYPES = [
  "chapter_overview",
  "unit_overview",
  "question",
  "question_feedback",
  "unit_summary",
  "chapter_summary"
];

const SOURCE_BLOCK_TYPES = new Set(["heading", "paragraph", "quote"]);
const QUESTION_TYPES = new Set(V2_QUESTION_TYPES);
const REQUIRED_TOP_LEVEL_FIELDS = [
  "schemaVersion",
  "id",
  "status",
  "title",
  "source",
  "summaryCard",
  "units",
  "chapterSummary",
  "generationMeta"
];
const REQUIRED_UNIT_FIELDS = [
  "id",
  "order",
  "title",
  "nodeLabel",
  "shortSummary",
  "detailSummary",
  "sourceAnchor",
  "overview",
  "questions",
  "summary"
];

export function validateReviewPathV2(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return { ok: false, errors: ["payload must be an object"] };
  }

  requireFields(payload, REQUIRED_TOP_LEVEL_FIELDS, "payload", errors);

  if (
    hasValue(payload.schemaVersion) &&
    payload.schemaVersion !== V2_REVIEW_PATH_SCHEMA_VERSION
  ) {
    errors.push(
      `payload.schemaVersion must be ${V2_REVIEW_PATH_SCHEMA_VERSION}`
    );
  }

  const sourceBlockIds = validateSource(payload.source, errors);
  validateSummaryCard(payload.summaryCard, errors);
  validateUnits(payload.units, sourceBlockIds, errors);
  validateChapterSummary(payload.chapterSummary, errors);
  validateGenerationMeta(payload.generationMeta, errors);

  return { ok: errors.length === 0, errors };
}

function validateSource(source, errors) {
  const blockIds = new Set();

  if (!isPlainObject(source)) {
    errors.push("payload.source must be an object");
    return blockIds;
  }

  if (!Array.isArray(source.blocks)) {
    errors.push("payload.source.blocks must be an array");
    return blockIds;
  }

  if (source.blocks.length === 0) {
    errors.push("payload.source.blocks must not be empty");
    return blockIds;
  }

  source.blocks.forEach((block, index) => {
    const path = `payload.source.blocks[${index}]`;

    if (!isPlainObject(block)) {
      errors.push(`${path} must be an object`);
      return;
    }

    requireFields(block, ["id", "type", "text"], path, errors);

    if (hasValue(block.id)) {
      if (blockIds.has(block.id)) {
        errors.push(`${path}.id must be unique`);
      }
      blockIds.add(block.id);
    }

    if (hasValue(block.type) && !SOURCE_BLOCK_TYPES.has(block.type)) {
      errors.push(`${path}.type must be one of heading, paragraph, quote`);
    }
  });

  return blockIds;
}

function validateSummaryCard(summaryCard, errors) {
  if (!isPlainObject(summaryCard)) {
    errors.push("payload.summaryCard must be an object");
    return;
  }

  requireFields(summaryCard, ["text"], "payload.summaryCard", errors);
}

function validateUnits(units, sourceBlockIds, errors) {
  if (!Array.isArray(units)) {
    errors.push("payload.units must be an array");
    return;
  }

  if (units.length === 0) {
    errors.push("payload.units must not be empty");
    return;
  }

  units.forEach((unit, index) => {
    const path = `payload.units[${index}]`;

    if (!isPlainObject(unit)) {
      errors.push(`${path} must be an object`);
      return;
    }

    requireFields(unit, REQUIRED_UNIT_FIELDS, path, errors);
    validateUnitSourceAnchor(unit.sourceAnchor, sourceBlockIds, `${path}.sourceAnchor`, errors);
    validateUnitOverview(unit.overview, `${path}.overview`, errors);
    validateUnitQuestions(unit.questions, unit.sourceAnchor, `${path}.questions`, errors);
    validateUnitSummary(unit.summary, `${path}.summary`, errors);
  });
}

function validateUnitSourceAnchor(sourceAnchor, sourceBlockIds, path, errors) {
  if (!isPlainObject(sourceAnchor)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(sourceAnchor, ["id", "blockIds"], path, errors);

  if (!Array.isArray(sourceAnchor.blockIds)) {
    errors.push(`${path}.blockIds must be an array`);
    return;
  }

  sourceAnchor.blockIds.forEach((blockId, index) => {
    if (!sourceBlockIds.has(blockId)) {
      errors.push(`${path}.blockIds[${index}] references missing source block ${blockId}`);
    }
  });
}

function validateUnitOverview(overview, path, errors) {
  if (!isPlainObject(overview)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(overview, ["text"], path, errors);
}

function validateUnitQuestions(questions, sourceAnchor, path, errors) {
  if (!Array.isArray(questions)) {
    errors.push(`${path} must be an array`);
    return;
  }

  if (questions.length === 0) {
    errors.push(`${path} must not be empty`);
    return;
  }

  questions.forEach((question, index) => {
    validateQuestion(question, sourceAnchor, `${path}[${index}]`, errors);
  });
}

function validateQuestion(question, sourceAnchor, path, errors) {
  if (!isPlainObject(question)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(question, ["id", "type", "stem", "explanation", "sourceAnchorId"], path, errors);

  if (hasValue(question.type) && !QUESTION_TYPES.has(question.type)) {
    errors.push(`${path}.type must be one of ${V2_QUESTION_TYPES.join(", ")}`);
  }

  if (hasValue(question.sourceAnchorId)) {
    const unitAnchorId = isPlainObject(sourceAnchor) ? sourceAnchor.id : undefined;
    if (question.sourceAnchorId !== unitAnchorId) {
      errors.push(`${path}.sourceAnchorId must match this unit sourceAnchor.id`);
    }
  }

  if (question.type === "multiple_choice") {
    validateMultipleChoiceQuestion(question, path, errors);
  }

  if (question.type === "matching") {
    validateMatchingQuestion(question, path, errors);
  }
}

function validateMultipleChoiceQuestion(question, path, errors) {
  requireFields(question, ["options", "correctOptionId"], path, errors);

  if (!Array.isArray(question.options)) {
    errors.push(`${path}.options must be an array`);
    return;
  }

  if (question.options.length !== 4) {
    errors.push(`${path}.options must contain exactly 4 options`);
  }

  const optionIds = new Set();
  let correctOptionCount = 0;

  question.options.forEach((option, index) => {
    const optionPath = `${path}.options[${index}]`;

    if (!isPlainObject(option)) {
      errors.push(`${optionPath} must be an object`);
      return;
    }

    requireFields(option, ["id", "text"], optionPath, errors);

    if (hasValue(option.id)) {
      if (optionIds.has(option.id)) {
        errors.push(`${optionPath}.id must be unique`);
      }
      optionIds.add(option.id);
    }

    if (option.id === question.correctOptionId) {
      correctOptionCount += 1;
    }
  });

  if (!hasValue(question.correctOptionId)) {
    return;
  }

  if (!optionIds.has(question.correctOptionId)) {
    errors.push(`${path}.correctOptionId must reference an existing option id`);
    return;
  }

  if (correctOptionCount !== 1) {
    errors.push(`${path}.correctOptionId must identify exactly one option`);
  }
}

function validateMatchingQuestion(question, path, errors) {
  requireFields(question, ["leftItems", "rightItems", "pairs"], path, errors);

  if (!Array.isArray(question.leftItems)) {
    errors.push(`${path}.leftItems must be an array`);
    return;
  }

  if (!Array.isArray(question.rightItems)) {
    errors.push(`${path}.rightItems must be an array`);
    return;
  }

  if (!Array.isArray(question.pairs)) {
    errors.push(`${path}.pairs must be an array`);
    return;
  }

  if (question.leftItems.length < 2 || question.leftItems.length > 4) {
    errors.push(`${path}.leftItems must contain 2 to 4 items`);
  }

  if (question.rightItems.length < 2 || question.rightItems.length > 4) {
    errors.push(`${path}.rightItems must contain 2 to 4 items`);
  }

  if (question.leftItems.length !== question.rightItems.length) {
    errors.push(`${path}.leftItems and rightItems must contain the same number of items`);
  }

  if (question.pairs.length !== question.leftItems.length) {
    errors.push(`${path}.pairs length must equal leftItems length`);
  }

  const leftIds = collectItemIds(question.leftItems, `${path}.leftItems`, errors);
  const rightIds = collectItemIds(question.rightItems, `${path}.rightItems`, errors);
  const pairedLeftIds = new Set();
  const pairedRightIds = new Set();

  question.pairs.forEach((pair, index) => {
    const pairPath = `${path}.pairs[${index}]`;

    if (!isPlainObject(pair)) {
      errors.push(`${pairPath} must be an object`);
      return;
    }

    requireFields(pair, ["leftId", "rightId"], pairPath, errors);

    if (hasValue(pair.leftId)) {
      if (!leftIds.has(pair.leftId)) {
        errors.push(`${pairPath}.leftId must reference an existing left item id`);
      }
      if (pairedLeftIds.has(pair.leftId)) {
        errors.push(`${pairPath}.leftId must be used only once`);
      }
      pairedLeftIds.add(pair.leftId);
    }

    if (hasValue(pair.rightId)) {
      if (!rightIds.has(pair.rightId)) {
        errors.push(`${pairPath}.rightId must reference an existing right item id`);
      }
      if (pairedRightIds.has(pair.rightId)) {
        errors.push(`${pairPath}.rightId must be used only once`);
      }
      pairedRightIds.add(pair.rightId);
    }
  });
}

function collectItemIds(items, path, errors) {
  const ids = new Set();

  items.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;

    if (!isPlainObject(item)) {
      errors.push(`${itemPath} must be an object`);
      return;
    }

    requireFields(item, ["id", "text"], itemPath, errors);

    if (hasValue(item.id)) {
      if (ids.has(item.id)) {
        errors.push(`${itemPath}.id must be unique`);
      }
      ids.add(item.id);
    }
  });

  return ids;
}

function validateUnitSummary(summary, path, errors) {
  if (!isPlainObject(summary)) {
    errors.push(`${path} must be an object`);
    return;
  }

  requireFields(summary, ["title", "text"], path, errors);
}

function validateChapterSummary(chapterSummary, errors) {
  if (!isPlainObject(chapterSummary)) {
    errors.push("payload.chapterSummary must be an object");
    return;
  }

  requireFields(
    chapterSummary,
    ["title", "statsText", "encouragementText"],
    "payload.chapterSummary",
    errors
  );
}

function validateGenerationMeta(generationMeta, errors) {
  if (!isPlainObject(generationMeta)) {
    errors.push("payload.generationMeta must be an object");
    return;
  }

  requireFields(generationMeta, ["currentStage"], "payload.generationMeta", errors);
}

function requireFields(object, fields, path, errors) {
  fields.forEach((field) => {
    if (!hasValue(object?.[field])) {
      errors.push(`${path}.${field} is required`);
    }
  });
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
