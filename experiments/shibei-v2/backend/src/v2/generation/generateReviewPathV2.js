import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "../contracts/reviewPathContract.js";
import { validateQualityJudgeOutput } from "./prompts/qualityJudge.js";
import { validateReviewPathPlanOutput } from "./prompts/reviewPathPlan.js";
import { validateSourceMapOutput } from "./prompts/sourceMap.js";
import { validateUnitCardsOutput } from "./prompts/unitCards.js";

export const V2_GENERATION_STAGES = [
  "sourceMap",
  "reviewPathPlan",
  "unitCards",
  "qualityJudge"
];

export async function generateReviewPathV2(
  article,
  { promptCaller, now = new Date().toISOString() } = {}
) {
  if (typeof promptCaller !== "function") {
    throw new Error("generateReviewPathV2 requires a promptCaller function");
  }

  const sourceMap = await callAndValidate(
    promptCaller,
    "sourceMap",
    { article },
    validateSourceMapOutput
  );
  const sourceBlockIds = new Set(sourceMap.blocks.map((block) => block.id));
  const plan = await callAndValidate(
    promptCaller,
    "reviewPathPlan",
    { article, source: sourceMap.source, blocks: sourceMap.blocks },
    (output) => validateReviewPathPlanOutput(output, { sourceBlockIds })
  );

  const units = [];

  for (const plannedUnit of plan.units) {
    const cards = await callAndValidate(
      promptCaller,
      "unitCards",
      { article, source: sourceMap.source, blocks: sourceMap.blocks, unit: plannedUnit },
      (output) =>
        validateUnitCardsOutput(output, {
          unitId: plannedUnit.id,
          sourceAnchorId: plannedUnit.sourceAnchor.id
        })
    );

    units.push({
      ...plannedUnit,
      overview: cards.overview,
      questions: cards.questions,
      summary: cards.summary
    });
  }

  const draftReviewPath = {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: article.id,
    status: "completed",
    displayStatusText: "已生成",
    title: plan.title,
    source: {
      ...sourceMap.source,
      rawText: article.rawText,
      cleanedText: article.cleanedText ?? article.rawText,
      blocks: sourceMap.blocks
    },
    summaryCard: plan.summaryCard,
    units,
    chapterSummary: {
      title: "章节完成",
      statsText: `共 ${units.length} 个核心知识点，${countQuestions(units)} 道题目`,
      encouragementText: plan.chapterSummary.encouragementText
    },
    generationMeta: {
      currentStage: "completed",
      stages: V2_GENERATION_STAGES.map((stage) => ({
        status: stage,
        displayStatusText: stageDisplayText(stage),
        at: now
      }))
    }
  };

  const judge = await callAndValidate(
    promptCaller,
    "qualityJudge",
    { article, reviewPath: draftReviewPath },
    validateQualityJudgeOutput
  );

  if (judge.verdict === "discard") {
    const error = new Error("V2 review path discarded by quality judge");
    error.issues = judge.issues;
    throw error;
  }

  draftReviewPath.generationMeta.qualityJudge = judge;

  const validation = validateReviewPathV2(draftReviewPath);
  if (!validation.ok) {
    const error = new Error(
      `Generated V2 review path failed contract validation:\n${validation.errors.join("\n")}`
    );
    error.errors = validation.errors;
    throw error;
  }

  return draftReviewPath;
}

async function callAndValidate(promptCaller, stage, payload, validator) {
  const output = await promptCaller(stage, payload);
  const validation = validator(output);

  if (!validation.ok) {
    const error = new Error(
      `${stage} output failed validation:\n${validation.errors.join("\n")}`
    );
    error.stage = stage;
    error.errors = validation.errors;
    throw error;
  }

  return output;
}

function countQuestions(units) {
  return units.reduce((count, unit) => count + unit.questions.length, 0);
}

function stageDisplayText(stage) {
  return {
    sourceMap: "正在提取正文",
    reviewPathPlan: "正在生成知识点",
    unitCards: "正在生成题目",
    qualityJudge: "正在检查质量"
  }[stage] ?? stage;
}
