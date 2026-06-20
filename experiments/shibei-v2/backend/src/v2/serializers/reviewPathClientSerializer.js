import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";

export function serializeReviewPathForClient(
  reviewPath,
  { currentUnitId, completedUnitIds = [], questionStates = {} } = {}
) {
  void questionStates;

  const validation = validateReviewPathV2(reviewPath);

  if (!validation.ok) {
    const error = new Error(
      `V2 review path failed contract validation:\n${validation.errors.join("\n")}`
    );
    error.errors = validation.errors;
    throw error;
  }

  const sourceBlocksById = new Map(
    reviewPath.source.blocks.map((block) => [block.id, block])
  );
  const sourceAnchors = serializeSourceAnchors(reviewPath, sourceBlocksById);
  const unitIds = new Set(reviewPath.units.map((unit) => unit.id));
  const currentNodeID = currentUnitId === "start"
    ? "start"
    : unitIds.has(currentUnitId)
    ? currentUnitId
    : reviewPath.units[0]?.id ?? "start";

  return {
    schemaVersion: reviewPath.schemaVersion,
    chapter: {
      id: reviewPath.id,
      title: reviewPath.title,
      overview: reviewPath.summaryCard.text,
      sourceTitle: reviewPath.source.title ?? "",
      sourceAuthor:
        reviewPath.source.author ??
        reviewPath.source.publisher ??
        reviewPath.source.account ??
        "",
      sourceURL: reviewPath.source.url ?? "",
      sourceBody: reviewPath.source.blocks.map(serializeSourceBlock),
      units: reviewPath.units.map((unit) =>
        serializeUnit(unit, sourceAnchors)
      ),
      chapterSummary: reviewPath.chapterSummary
    },
    home: {
      currentChapter: {
        eyebrow: "当前章节",
        title: reviewPath.title
      },
      nodes: serializeHomeNodes(reviewPath.units, {
        currentNodeID,
        completedUnitIds
      }),
      currentNodeID
    },
    sourceAnchors
  };
}

function serializeSourceBlock(block) {
  return {
    id: block.id,
    kind: block.type,
    text: block.text
  };
}

function serializeUnit(unit, sourceAnchors) {
  return {
    id: unit.id,
    title: unit.title,
    overview: unit.overview.text,
    questions: unit.questions.map((question) =>
      serializeQuestion(question, unit, sourceAnchors)
    ),
    completionMessage: unit.summary.text
  };
}

function serializeQuestion(question, unit, sourceAnchors) {
  const sourceAnchorId = question.sourceAnchorId || unit.sourceAnchor.id;
  const sourceExcerpt = sourceAnchors[sourceAnchorId]?.text ?? "";

  return {
    id: question.id,
    kind: serializeQuestionKind(question.type),
    title: question.displayLabel ?? deriveQuestionTitle(question),
    prompt: question.stem,
    options: serializeQuestionOptions(question),
    correctOptionIndex: serializeCorrectOptionIndex(question),
    matchingPairs: serializeMatchingPairs(question),
    feedback: question.explanation,
    sourceExcerpt
  };
}

function serializeQuestionKind(type) {
  if (type === "multiple_choice") {
    return "multipleChoice";
  }

  if (type === "matching") {
    return "matching";
  }

  return type;
}

function deriveQuestionTitle(question) {
  if (question.type === "matching") {
    return "匹配理解";
  }

  return "轻量理解";
}

function serializeQuestionOptions(question) {
  if (question.type !== "multiple_choice") {
    return [];
  }

  return question.options.map((option) => option.text);
}

function serializeCorrectOptionIndex(question) {
  if (question.type !== "multiple_choice") {
    return null;
  }

  const index = question.options.findIndex(
    (option) => option.id === question.correctOptionId
  );

  return index >= 0 ? index : null;
}

function serializeMatchingPairs(question) {
  if (question.type !== "matching") {
    return [];
  }

  const leftItemsById = new Map(
    question.leftItems.map((item) => [item.id, item])
  );
  const rightItemsById = new Map(
    question.rightItems.map((item) => [item.id, item])
  );

  return question.pairs.map((pair, index) => ({
    id: pair.id ?? `${pair.leftId}-${pair.rightId}-${index + 1}`,
    left: leftItemsById.get(pair.leftId)?.text ?? "",
    right: rightItemsById.get(pair.rightId)?.text ?? ""
  }));
}

function serializeSourceAnchors(reviewPath, sourceBlocksById) {
  return Object.fromEntries(
    reviewPath.units.map((unit) => {
      const anchor = unit.sourceAnchor;
      const blocks = anchor.blockIds
        .map((blockId) => sourceBlocksById.get(blockId))
        .filter(Boolean);
      const text = blocks.map((block) => block.text).join(" ");

      return [
        anchor.id,
        {
          id: anchor.id,
          unitId: unit.id,
          label: anchor.label ?? "",
          quote: anchor.quote ?? "",
          blockIds: anchor.blockIds,
          text
        }
      ];
    })
  );
}

function serializeHomeNodes(units, { currentNodeID, completedUnitIds }) {
  const completedUnitIdSet = new Set(completedUnitIds);

  return [
    {
      id: "start",
      title: "开始",
      subtitle: "章节概要",
      kind: "start",
      state: currentNodeID === "start" ? "current" : "completed"
    },
    ...units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      subtitle: unit.nodeLabel || unit.title,
      kind: "unit",
      state: deriveUnitNodeState(unit.id, {
        completedUnitIdSet,
        currentNodeID
      })
    }))
  ];
}

function deriveUnitNodeState(unitId, { completedUnitIdSet, currentNodeID }) {
  if (completedUnitIdSet.has(unitId)) {
    return "completed";
  }

  if (unitId === currentNodeID) {
    return "current";
  }

  return "locked";
}
