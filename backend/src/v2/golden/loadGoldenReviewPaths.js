import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "../contracts/reviewPathContract.js";

const DEFAULT_SAMPLES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/golden-samples"
);

const OPTION_IDS = ["A", "B", "C", "D"];

export async function loadGoldenReviewPaths({ samplesDir = DEFAULT_SAMPLES_DIR } = {}) {
  const fileNames = (await readdir(samplesDir))
    .filter((fileName) => fileName.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));

  const samples = [];

  for (const fileName of fileNames) {
    const samplePath = join(samplesDir, fileName);
    const sample = JSON.parse(await readFile(samplePath, "utf8"));
    const payload = normalizeGoldenReviewPath(sample, { fileName });
    const validation = validateReviewPathV2(payload);

    if (!validation.ok) {
      throw new Error(
        `Golden sample ${fileName} failed V2 review path contract:\n${validation.errors.join("\n")}`
      );
    }

    samples.push(payload);
  }

  return samples;
}

export function normalizeGoldenReviewPath(sample, { fileName = sample.id } = {}) {
  const blockBuilder = createSourceBlockBuilder();
  const summaryBlockId = blockBuilder.add("summary", "paragraph", sample.summaryCard?.text);
  const closingBlockId = blockBuilder.add("closing", "paragraph", sample.closingCard?.text);

  const unitDrafts = (sample.nodes ?? []).map((node, nodeIndex) => {
    const anchorText = textOrFallback(node.sourceAnchor, node.knowledgePoint);
    const knowledgeText = textOrFallback(node.knowledgePoint, node.why);
    const summaryText = textOrFallback(node.explanation, node.knowledgePoint, node.why);
    const nodeBlockIds = [
      blockBuilder.add(`${node.id}-anchor`, "quote", anchorText),
      blockBuilder.add(`${node.id}-knowledge`, "paragraph", knowledgeText),
      blockBuilder.add(`${node.id}-summary`, "paragraph", summaryText)
    ].filter(Boolean);

    return { node, nodeIndex, nodeBlockIds };
  });

  const units = unitDrafts.map(({ node, nodeIndex, nodeBlockIds }) => {
    const sourceAnchorId = `anchor-${node.id}`;

    return {
      id: node.id,
      order: numberOrFallback(node.order, nodeIndex + 1),
      title: textOrFallback(node.title, `单元 ${nodeIndex + 1}`),
      nodeLabel: compactNodeLabel(
        textOrFallback(node.nodeLabel, node.pathLabel, node.title, node.knowledgePoint)
      ),
      shortSummary: textOrFallback(node.knowledgePoint, node.why, node.title),
      detailSummary: textOrFallback(
        node.explanation,
        [node.knowledgePoint, node.why].filter(Boolean).join(" ")
      ),
      why: textOrFallback(node.why, node.explanation, node.knowledgePoint),
      sourceAnchor: {
        id: sourceAnchorId,
        label: textOrFallback(node.sourceAnchor, `样稿节点 ${node.id}`),
        blockIds: nodeBlockIds.length > 0 ? nodeBlockIds : [summaryBlockId, closingBlockId].filter(Boolean),
        quote: textOrFallback(node.sourceAnchor, node.knowledgePoint)
      },
      overview: {
        text: textOrFallback(node.knowledgePoint, node.why, node.explanation)
      },
      questions: normalizeCards(node.cards ?? [], {
        node,
        nodeIndex,
        sourceAnchorId
      }),
      summary: {
        title: "单元完成",
        text: textOrFallback(node.explanation, node.knowledgePoint, "你已经完成了这个单元。")
      }
    };
  });

  const payload = {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: sample.id,
    status: sample.status,
    title: sample.source?.title ?? sample.id,
    source: {
      type: "article",
      platform: sample.source?.platform,
      url: sample.source?.url,
      title: sample.source?.title,
      author: sample.source?.publisher,
      publisher: sample.source?.publisher,
      publishTime: sample.source?.publishTime,
      htmlPreviewPath: sample.htmlPreviewPath,
      blocks: blockBuilder.blocks()
    },
    summaryCard: {
      ...sample.summaryCard,
      text: textOrFallback(sample.summaryCard?.text, sample.source?.title, sample.id)
    },
    units,
    chapterSummary: {
      title: "章节完成",
      statsText: `共 ${units.length} 个核心知识点，${countQuestions(units)} 道题目`,
      encouragementText: textOrFallback(
        sample.closingCard?.text,
        sample.summaryCard?.text,
        "你已经完成了这一章的关键理解。"
      ),
      note: sample.closingCard?.note
    },
    generationMeta: {
      currentStage: "golden_sample_normalized",
      sourceFileName: fileName,
      originalVersion: sample.version,
      normalizer: "loadGoldenReviewPaths"
    }
  };

  if (payload.source.blocks.length === 0) {
    payload.source.blocks.push({
      id: "block-fallback",
      type: "paragraph",
      text: payload.summaryCard.text
    });
  }

  return payload;
}

function normalizeCards(cards, { node, nodeIndex, sourceAnchorId }) {
  return cards
    .map((card, cardIndex) => {
      const questionId = `${node.id}-q-${String(cardIndex + 1).padStart(2, "0")}`;

      if (card.questionType === "single_choice") {
        return normalizeSingleChoice(card, {
          node,
          questionId,
          sourceAnchorId
        });
      }

      if (card.questionType === "matching") {
        return normalizeMatching(card, {
          node,
          questionId,
          sourceAnchorId
        });
      }

      return undefined;
    })
    .filter(Boolean)
    .map((question, questionIndex) => ({
      ...question,
      order: questionIndex + 1,
      unitOrder: nodeIndex + 1
    }));
}

function normalizeSingleChoice(card, { node, questionId, sourceAnchorId }) {
  const options = (card.options ?? []).slice(0, 4).map((option, optionIndex) => ({
    id: OPTION_IDS[optionIndex],
    text: String(option)
  }));
  const correctOption = options.find((option) => option.text === card.answer);

  return {
    id: questionId,
    type: "multiple_choice",
    stem: card.stem,
    options,
    correctOptionId: correctOption?.id,
    misconception: card.misconception,
    explanation: textOrFallback(
      card.misconception,
      node.explanation,
      `正确理解是：${textOrFallback(card.answer, node.knowledgePoint)}`
    ),
    sourceAnchorId
  };
}

function normalizeMatching(card, { node, questionId, sourceAnchorId }) {
  const normalizedPairs = normalizeMatchingPairs(card.pairs ?? [], node);

  return {
    id: questionId,
    type: "matching",
    stem: card.stem,
    leftItems: normalizedPairs.map(([leftText], index) => ({
      id: `L${index + 1}`,
      text: leftText
    })),
    rightItems: normalizedPairs.map(([, rightText], index) => ({
      id: `R${index + 1}`,
      text: rightText
    })),
    pairs: normalizedPairs.map((_, index) => ({
      leftId: `L${index + 1}`,
      rightId: `R${index + 1}`
    })),
    misconception: card.groupMisconception,
    explanation: textOrFallback(
      card.groupMisconception,
      node.explanation,
      "匹配题用于确认概念、时机和作用之间的对应关系。"
    ),
    sourceAnchorId
  };
}

function normalizeMatchingPairs(pairs, node) {
  const normalized = pairs
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .slice(0, 4)
    .map(([left, right]) => [String(left), String(right)]);

  while (normalized.length < 4) {
    normalized.push(deriveCompatibilityPair(node, normalized.length + 1));
  }

  return normalized;
}

function deriveCompatibilityPair(node, pairNumber) {
  if (pairNumber === 4) {
    return ["核心判断", textOrFallback(node.knowledgePoint, node.title, "识别机制要点")];
  }

  return [`补充项 ${pairNumber}`, textOrFallback(node.why, node.explanation, node.knowledgePoint)];
}

function createSourceBlockBuilder() {
  const sourceBlocks = [];
  const seenIds = new Set();

  return {
    add(idFragment, type, text) {
      const normalizedText = normalizeText(text);

      if (!normalizedText) {
        return undefined;
      }

      let id = `block-${slugify(idFragment)}`;
      let suffix = 2;

      while (seenIds.has(id)) {
        id = `block-${slugify(idFragment)}-${suffix}`;
        suffix += 1;
      }

      seenIds.add(id);
      sourceBlocks.push({ id, type, text: normalizedText });
      return id;
    },
    blocks() {
      return sourceBlocks;
    }
  };
}

function countQuestions(units) {
  return units.reduce((total, unit) => total + unit.questions.length, 0);
}

function textOrFallback(...values) {
  for (const value of values) {
    const text = normalizeText(value);

    if (text) {
      return text;
    }
  }

  return "";
}

function compactNodeLabel(value) {
  const text = normalizeText(value)
    .replace(/[。！？!?；;：:，,、].*$/u, "")
    .replace(/^(理解|认识|掌握|区分|判断|使用|运用)/u, "")
    .trim();

  if (!text) {
    return "核心知识点";
  }

  if (text.length <= 24) {
    return text;
  }

  return text.slice(0, 24);
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).replace(/\s+/g, " ").trim();
}

function numberOrFallback(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function slugify(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "item";
}
