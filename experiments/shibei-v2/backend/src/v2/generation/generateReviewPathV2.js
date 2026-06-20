import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "../contracts/reviewPathContract.js";
import { createV2ModelPromptCaller } from "./modelPromptCaller.js";
import { validateQualityJudgeOutput } from "./prompts/qualityJudge.js";
import { validateReviewPathPlanOutput } from "./prompts/reviewPathPlan.js";
import { validateSourceMapOutput } from "./prompts/sourceMap.js";
import { validateMatchingDraftOutput } from "./prompts/matchingDraft.js";
import { validateMultipleChoiceDraftOutput } from "./prompts/multipleChoiceDraft.js";
import { validateUnitPracticePlanOutput } from "./prompts/unitPracticePlan.js";
import { validateUnitSummaryDraftOutput } from "./prompts/unitSummaryDraft.js";
import { runV2QualityGuardrails } from "./qualityGuardrails.js";

export const V2_GENERATION_STAGES = [
  "sourceMap",
  "reviewPathPlan",
  "unitPracticePlan",
  "multipleChoiceDraft",
  "matchingDraft",
  "unitSummaryDraft",
  "qualityJudge"
];

export async function generateReviewPathV2(
  article,
  {
    promptCaller,
    createPromptCaller = createV2ModelPromptCaller,
    modelUsageRecorder = null,
    now = new Date().toISOString()
  } = {}
) {
  const activePromptCaller =
    typeof promptCaller === "function"
      ? promptCaller
      : createPromptCaller({ modelUsageRecorder });

  if (typeof activePromptCaller !== "function") {
    throw new Error("generateReviewPathV2 requires a promptCaller function or createPromptCaller factory");
  }

  const sourceMap = await callAndValidate(
    activePromptCaller,
    "sourceMap",
    { article },
    validateSourceMapOutput
  );
  const sourceBlockIds = new Set(sourceMap.blocks.map((block) => block.id));
  const plan = await callAndValidate(
    activePromptCaller,
    "reviewPathPlan",
    { article, source: sourceMap.source, blocks: sourceMap.blocks },
    (output) => validateReviewPathPlanOutput(output, { sourceBlockIds })
  );

  const units = [];
  const unitPracticePlans = [];

  for (const plannedUnit of plan.units) {
    const practicePlan = await callAndValidate(
      activePromptCaller,
      "unitPracticePlan",
      { article, source: sourceMap.source, blocks: sourceMap.blocks, unit: plannedUnit },
      (output) =>
        validateUnitPracticePlanOutput(output, {
          unitId: plannedUnit.id,
          sourceAnchorId: plannedUnit.sourceAnchor.id
        })
    );
    const multipleChoiceDraft = await callAndValidate(
      activePromptCaller,
      "multipleChoiceDraft",
      {
        article,
        source: sourceMap.source,
        blocks: sourceMap.blocks,
        unit: plannedUnit,
        practicePlan
      },
      (output) =>
        validateMultipleChoiceDraftOutput(output, {
          unitId: plannedUnit.id,
          plans: practicePlan.questionPlans,
          sourceAnchorId: plannedUnit.sourceAnchor.id
        }),
      {
        normalize: (output) =>
          normalizeDraftQuestionIds(output, practicePlan.questionPlans, "multiple_choice")
      }
    );
    const matchingPlans = practicePlan.questionPlans.filter((questionPlan) => questionPlan.type === "matching");
    const matchingDraft = matchingPlans.length > 0
      ? await callAndValidate(
          activePromptCaller,
          "matchingDraft",
          {
            article,
            source: sourceMap.source,
            blocks: sourceMap.blocks,
            unit: plannedUnit,
            practicePlan
          },
          (output) =>
            validateMatchingDraftOutput(output, {
              unitId: plannedUnit.id,
              plans: practicePlan.questionPlans,
              sourceAnchorId: plannedUnit.sourceAnchor.id
            }),
          {
            normalize: (output) =>
              normalizeDraftQuestionIds(output, practicePlan.questionPlans, "matching")
          }
        )
      : { unitId: plannedUnit.id, questions: [] };
    const questions = sortQuestionsByPlan(
      [
        ...multipleChoiceDraft.questions.map(stripInternalQuestionFields),
        ...matchingDraft.questions.map(stripInternalQuestionFields)
      ],
      practicePlan.questionPlans
    );
    const unitSummary = await callAndValidate(
      activePromptCaller,
      "unitSummaryDraft",
      {
        article,
        source: sourceMap.source,
        blocks: sourceMap.blocks,
        unit: plannedUnit,
        practicePlan,
        questions
      },
      (output) =>
        validateUnitSummaryDraftOutput(output, {
          unitId: plannedUnit.id
        })
    );
    unitPracticePlans.push(practicePlan);

    units.push({
      ...plannedUnit,
      overview: unitSummary.overview,
      questions,
      summary: unitSummary.summary
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
      })),
      unitPracticePlans
    }
  };

  const deterministicQuality = runV2QualityGuardrails(draftReviewPath);

  const judge = await callAndValidate(
    activePromptCaller,
    "qualityJudge",
    { article, reviewPath: draftReviewPath },
    validateQualityJudgeOutput
  );

  draftReviewPath.generationMeta.qualityJudge = judge;
  draftReviewPath.generationMeta.qualityDiagnostics = deterministicQuality.diagnostics;
  draftReviewPath.generationMeta.qualityGate = {
    mode: "diagnostic_only",
    blocking: false,
    deterministicVerdict: deterministicQuality.verdict,
    deterministicIssueCount: deterministicQuality.issues.length,
    judgeVerdict: judge.verdict,
    judgeIssueCount: Array.isArray(judge.issues) ? judge.issues.length : 0
  };

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

async function callAndValidate(promptCaller, stage, payload, validator, { normalize = null } = {}) {
  const rawOutput = await promptCaller(stage, payload);
  const output = typeof normalize === "function" ? normalize(rawOutput) : rawOutput;
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

function normalizeDraftQuestionIds(output, questionPlans, questionType) {
  if (!output || !Array.isArray(output.questions)) return output;

  const plans = questionPlans.filter((plan) => plan.type === questionType);
  if (plans.length !== output.questions.length) return output;

  const knownPlanIds = new Set(plans.map((plan) => plan.id));
  const needsNormalization = output.questions.some((question) => !knownPlanIds.has(question.id));
  if (!needsNormalization) return output;

  return {
    ...output,
    questions: output.questions.map((question, index) => ({
      ...question,
      id: plans[index].id,
      practiceGoalId: question.practiceGoalId || plans[index].practiceGoalId,
      sourceAnchorId: question.sourceAnchorId || plans[index].sourceAnchorId
    }))
  };
}

function sortQuestionsByPlan(questions, questionPlans) {
  const order = new Map(questionPlans.map((plan, index) => [plan.id, index]));
  return [...questions].sort((a, b) => {
    const aIndex = order.has(a.id) ? order.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bIndex = order.has(b.id) ? order.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function stripInternalQuestionFields(question) {
  const {
    practiceGoalId: _practiceGoalId,
    correctUnderstanding: _correctUnderstanding,
    misconception: _misconception,
    distractorRationale: _distractorRationale,
    relationType: _relationType,
    relationGoal: _relationGoal,
    ...visibleQuestion
  } = question;
  return visibleQuestion;
}

function countQuestions(units) {
  return units.reduce((count, unit) => count + unit.questions.length, 0);
}

function stageDisplayText(stage) {
  return {
    sourceMap: "正在提取正文",
    reviewPathPlan: "正在生成知识点",
    unitPracticePlan: "正在规划练习",
    multipleChoiceDraft: "正在生成选择题",
    matchingDraft: "正在生成连线题",
    unitSummaryDraft: "正在生成单元总结",
    qualityJudge: "正在检查质量"
  }[stage] ?? stage;
}
