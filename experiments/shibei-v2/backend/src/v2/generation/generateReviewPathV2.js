import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "../contracts/reviewPathContract.js";
import { createV2ModelPromptCaller } from "./modelPromptCaller.js";
import {
  normalizeEcdPlanningOutput,
  validateEcdPlanningOutput
} from "./prompts/ecdPlanning.js";
import { validateQualityJudgeOutput } from "./prompts/qualityJudge.js";
import { validateReviewPathPlanOutput } from "./prompts/reviewPathPlan.js";
import { validateSourceMapOutput } from "./prompts/sourceMap.js";
import { validateUnitKnowledgeMapOutput } from "./prompts/unitKnowledgeMap.js";
import { validateMatchingDraftOutput } from "./prompts/matchingDraft.js";
import { validateMultipleChoiceDraftOutput } from "./prompts/multipleChoiceDraft.js";
import {
  MATCHING_RELATION_TYPES,
  QUESTION_PLAN_PURPOSES,
  validateUnitPracticePlanOutput
} from "./prompts/unitPracticePlan.js";
import { validateUnitSummaryDraftOutput } from "./prompts/unitSummaryDraft.js";
import { runV2QualityGuardrails } from "./qualityGuardrails.js";
import {
  attachStageRuntimeToError,
  createStageRuntimeRecorder
} from "./runtimeReliability.js";
import {
  buildPlanSourceContext,
  buildUnitSourceContext
} from "./sourceContext.js";

export const V2_GENERATION_STAGES = [
  "sourceMap",
  "reviewPathPlan",
  "unitKnowledgeMap",
  "ecdPlanning",
  "unitPracticePlan",
  "multipleChoiceDraft",
  "matchingDraft",
  "unitSummaryDraft",
  "qualityJudge"
];

export function activeV2GenerationStages({ qualityJudgeEnabled = false } = {}) {
  return V2_GENERATION_STAGES.filter((stage) => {
    if (stage === "unitPracticePlan") return false;
    if (stage === "qualityJudge") return qualityJudgeEnabled;
    return true;
  });
}

export async function generateReviewPathV2(
  article,
  {
    promptCaller,
    createPromptCaller = createV2ModelPromptCaller,
    modelUsageRecorder = null,
    maxUnitCount = readOptionalPositiveInt(process.env.V2_GENERATION_MAX_UNITS),
    unitConcurrency = readOptionalPositiveInt(process.env.V2_GENERATION_UNIT_CONCURRENCY) ?? 1,
    qualityJudgeEnabled = readOptionalBoolean(process.env.V2_ENABLE_QUALITY_JUDGE) ?? false,
    sourceMapMode = process.env.V2_SOURCE_MAP_MODE || "model",
    now = new Date().toISOString()
  } = {}
) {
  const runtimeRecorder = createStageRuntimeRecorder();
  const activePromptCaller =
    typeof promptCaller === "function"
      ? promptCaller
      : createPromptCaller({ modelUsageRecorder, runtimeRecorder });

  if (typeof activePromptCaller !== "function") {
    throw new Error("generateReviewPathV2 requires a promptCaller function or createPromptCaller factory");
  }

  try {
  const sourceMap = sourceMapMode === "deterministic"
    ? buildDeterministicSourceMap(article)
    : await callAndValidate(
        activePromptCaller,
        "sourceMap",
        { article },
        validateSourceMapOutput
      );
  const sourceBlockIds = new Set(sourceMap.blocks.map((block) => block.id));
  const rawPlan = await callAndValidate(
    activePromptCaller,
    "reviewPathPlan",
    { article, source: sourceMap.source, blocks: sourceMap.blocks },
    (output) => validateReviewPathPlanOutput(output, { sourceBlockIds })
  );
  const plan = limitPlannedUnits(rawPlan, maxUnitCount);
  const planSourceContext = buildPlanSourceContext(sourceMap, plan);
  const unitIds = new Set(plan.units.map((unit) => unit.id));
  const sourceAnchorIds = new Set(plan.units.map((unit) => unit.sourceAnchor?.id).filter(Boolean));
  const unitSourceAnchorIds = new Map(
    plan.units
      .map((unit) => [unit.id, unit.sourceAnchor?.id])
      .filter(([, sourceAnchorId]) => Boolean(sourceAnchorId))
  );
  const unitKnowledgeMap = await callAndValidate(
    activePromptCaller,
    "unitKnowledgeMap",
    {
      article,
      source: planSourceContext.source,
      blocks: planSourceContext.blocks,
      sourceContextNote: planSourceContext.sourceContextNote,
      plan
    },
    (output) => validateUnitKnowledgeMapOutput(output, { unitIds, sourceAnchorIds })
  );
  const ecdPlanning = mergeEcdPlanningOutputs(
    await mapWithConcurrency(
      plan.units,
      unitConcurrency,
      (plannedUnit) => {
        const unitSourceContext = buildUnitSourceContext(sourceMap, plannedUnit);
        return callAndValidate(
          activePromptCaller,
          "ecdPlanning",
          {
            article,
            source: unitSourceContext.source,
            blocks: unitSourceContext.blocks,
            sourceContextNote: unitSourceContext.sourceContextNote,
            plan: buildSingleUnitPlan(plan, plannedUnit),
            unitKnowledgeMap: buildSingleUnitKnowledgeMap(unitKnowledgeMap, plannedUnit.id)
          },
          (output) => validateEcdPlanningOutput(output, { unitIds: new Set([plannedUnit.id]), sourceAnchorIds }),
          { normalize: (output) => normalizeEcdPlanningOutput(output, { unitSourceAnchorIds, sourceAnchorIds }) }
        );
      }
    )
  );

  const generatedUnits = await mapWithConcurrency(
    plan.units,
    unitConcurrency,
    (plannedUnit) => {
      const ecdContext = getEcdContextForUnit(ecdPlanning, plannedUnit, unitKnowledgeMap);
      return generateUnitReviewContent({
        activePromptCaller,
        article,
        sourceMap,
        sourceContext: buildUnitSourceContext(sourceMap, plannedUnit),
        plannedUnit,
        ecdContext
      });
    }
  );
  const units = generatedUnits.map((item) => item.unit);
  const unitPracticePlans = generatedUnits.map((item) => item.practicePlan);

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
    ...(plan.generationConstraints ? { generationConstraints: plan.generationConstraints } : {}),
    generationMeta: {
      currentStage: "completed",
      reviewPathPlan: stripReviewPathPlanForMetadata(plan),
      unitKnowledgeMap,
      sourceContextStats: buildSourceContextStats({
        sourceMap,
        plan,
        planSourceContext
      }),
      stageRuntime: runtimeRecorder.summary(),
      stages: activeV2GenerationStages({ qualityJudgeEnabled }).map((stage) => ({
        status: stage,
        displayStatusText: stageDisplayText(stage),
        at: now
      })),
      ecdPlanning,
      unitPracticePlans
    }
  };

  const deterministicQuality = runV2QualityGuardrails(draftReviewPath);

  const { judge, judgeError } = qualityJudgeEnabled
    ? await runOptionalQualityJudge({
        activePromptCaller,
        article,
        draftReviewPath
      })
    : { judge: skippedQualityJudge(), judgeError: null };

  draftReviewPath.generationMeta.qualityJudge = judge;
  if (judgeError) {
    draftReviewPath.generationMeta.qualityJudgeError = judgeError;
  }
  draftReviewPath.generationMeta.qualityDiagnostics = deterministicQuality.diagnostics;
  draftReviewPath.generationMeta.qualityGate = {
    mode: qualityJudgeEnabled ? "diagnostic_only" : "deterministic_only",
    blocking: false,
    qualityJudgeEnabled,
    deterministicVerdict: deterministicQuality.verdict,
    deterministicIssueCount: deterministicQuality.issues.length,
    judgeVerdict: judge.verdict,
    judgeIssueCount: Array.isArray(judge.issues) ? judge.issues.length : 0,
    ...(judgeError ? { judgeError: judgeError.message } : {})
  };
  draftReviewPath.generationMeta.stageRuntime = runtimeRecorder.summary();

  const validation = validateReviewPathV2(draftReviewPath);
  if (!validation.ok) {
    const error = new Error(
      `Generated V2 review path failed contract validation:\n${validation.errors.join("\n")}`
    );
    error.errors = validation.errors;
    throw error;
  }

  return draftReviewPath;
  } catch (error) {
    attachStageRuntimeToError(error, runtimeRecorder.summary());
    throw error;
  }
}

function buildSingleUnitPlan(plan, plannedUnit) {
  return {
    title: plan.title,
    summaryCard: plan.summaryCard,
    chapterSummary: plan.chapterSummary,
    units: [plannedUnit],
    ...(Array.isArray(plan.knowledgeObjects) ? { knowledgeObjects: plan.knowledgeObjects } : {}),
    ...(plan.generationConstraints ? { generationConstraints: plan.generationConstraints } : {})
  };
}

function buildSingleUnitKnowledgeMap(unitKnowledgeMap, unitId) {
  return {
    units: (unitKnowledgeMap?.units || []).filter((unit) => unit.unitId === unitId)
  };
}

function mergeEcdPlanningOutputs(outputs) {
  const validOutputs = (outputs || []).filter(Boolean);
  return {
    units: validOutputs.flatMap((output) => output.units || [])
  };
}

async function runOptionalQualityJudge({
  activePromptCaller,
  article,
  draftReviewPath
}) {
  try {
    const judge = await callAndValidate(
      activePromptCaller,
      "qualityJudge",
      { article, reviewPath: draftReviewPath },
      validateQualityJudgeOutput
    );
    return { judge, judgeError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "quality judge failed");
    return {
      judge: {
        verdict: "pass",
        issues: [],
        summary: "质量诊断阶段失败；本轮按 diagnostic-only 策略保留完整题目输出。"
      },
      judgeError: {
        stage: error?.stage || "qualityJudge",
        modelStage: error?.modelStage || "qualityJudge",
        retryAttempts: error?.retryAttempts || 0,
        message
      }
    };
  }
}

function skippedQualityJudge() {
  return {
    verdict: "skipped",
    issues: [],
    summary: "qualityJudge 默认停用；本轮只保留 deterministic guardrails 和 HTML 报告诊断。"
  };
}

async function generateUnitReviewContent({
  activePromptCaller,
  article,
  sourceMap,
  sourceContext,
  plannedUnit,
  ecdContext
}) {
  const unitSourceContext = sourceContext || buildUnitSourceContext(sourceMap, plannedUnit);
  const practicePlan = buildPracticePlanFromEcdContext({
    ecdContext,
    plannedUnit
  });
  const alignedValidation = validateUnitPracticePlanOutput(practicePlan, {
    unitId: plannedUnit.id,
    sourceAnchorId: plannedUnit.sourceAnchor.id
  });
  if (!alignedValidation.ok) {
    const error = new Error(
      `unitPracticePlan ECD alignment failed validation:\n${alignedValidation.errors.join("\n")}`
    );
    error.stage = "unitPracticePlan";
    error.errors = alignedValidation.errors;
    throw error;
  }
  const multipleChoicePlans = practicePlan.questionPlans.filter((questionPlan) => questionPlan.type === "multiple_choice");
  const multipleChoiceDraft = multipleChoicePlans.length > 0
    ? await callAndValidate(
        activePromptCaller,
        "multipleChoiceDraft",
        {
          article,
          source: unitSourceContext.source,
          blocks: unitSourceContext.blocks,
          sourceContextNote: unitSourceContext.sourceContextNote,
          unit: plannedUnit,
          practicePlan,
          ecdContext
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
      )
    : { unitId: plannedUnit.id, questions: [] };
  const matchingPlans = practicePlan.questionPlans.filter((questionPlan) => questionPlan.type === "matching");
  const matchingDraft = matchingPlans.length > 0
    ? await callAndValidate(
        activePromptCaller,
        "matchingDraft",
        {
          article,
          source: unitSourceContext.source,
          blocks: unitSourceContext.blocks,
          sourceContextNote: unitSourceContext.sourceContextNote,
          unit: plannedUnit,
          practicePlan,
          ecdContext
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
      source: unitSourceContext.source,
      blocks: unitSourceContext.blocks,
      sourceContextNote: unitSourceContext.sourceContextNote,
      unit: plannedUnit,
      practicePlan,
      questions,
      ecdContext
    },
    (output) =>
      validateUnitSummaryDraftOutput(output, {
        unitId: plannedUnit.id
      })
  );

  return {
    practicePlan,
    unit: {
      ...stripInternalPlannedUnitFields(plannedUnit),
      overview: unitSummary.overview,
      questions,
      summary: unitSummary.summary
    }
  };
}

function buildSourceContextStats({ sourceMap, plan, planSourceContext }) {
  const fullBlockCount = Array.isArray(sourceMap?.blocks) ? sourceMap.blocks.length : 0;
  return {
    fullBlockCount,
    unitKnowledgeMap: {
      mode: planSourceContext.sourceContextNote.mode,
      selectedBlockCount: planSourceContext.sourceContextNote.selectedBlockCount,
      selectedBlockIds: planSourceContext.sourceContextNote.selectedBlockIds,
      fallbackUsed: planSourceContext.sourceContextNote.fallbackUsed
    },
    unitWindows: (plan?.units || []).map((unit) => {
      const context = buildUnitSourceContext(sourceMap, unit);
      return {
        unitId: unit.id,
        anchorId: context.sourceContextNote.anchorId,
        anchorBlockIds: context.sourceContextNote.anchorBlockIds,
        selectedBlockCount: context.sourceContextNote.selectedBlockCount,
        selectedBlockIds: context.sourceContextNote.selectedBlockIds,
        fallbackUsed: context.sourceContextNote.fallbackUsed
      };
    })
  };
}

function stripInternalPlannedUnitFields(unit) {
  const { sourceKnowledgeObjectIds, ...publicUnit } = unit;
  return publicUnit;
}

function stripReviewPathPlanForMetadata(plan) {
  return {
    title: plan.title,
    summaryCard: plan.summaryCard,
    ...(Array.isArray(plan.knowledgeObjects) ? { knowledgeObjects: plan.knowledgeObjects } : {}),
    units: (plan.units ?? []).map((unit) => ({
      id: unit.id,
      order: unit.order,
      title: unit.title,
      nodeLabel: unit.nodeLabel,
      sourceAnchor: unit.sourceAnchor,
      ...(Array.isArray(unit.sourceKnowledgeObjectIds) ? { sourceKnowledgeObjectIds: unit.sourceKnowledgeObjectIds } : {})
    })),
    chapterSummary: plan.chapterSummary,
    ...(plan.generationConstraints ? { generationConstraints: plan.generationConstraints } : {})
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const limit = Math.max(1, Number.isInteger(concurrency) ? concurrency : 1);
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function limitPlannedUnits(plan, maxUnitCount) {
  if (!Number.isInteger(maxUnitCount) || maxUnitCount <= 0) return plan;
  if (!Array.isArray(plan?.units) || plan.units.length <= maxUnitCount) return plan;
  return {
    ...plan,
    units: plan.units.slice(0, maxUnitCount),
    generationConstraints: {
      ...(plan.generationConstraints || {}),
      originalUnitCount: plan.units.length,
      maxUnitCount,
      limitedBy: "V2_GENERATION_MAX_UNITS"
    }
  };
}

function getEcdContextForUnit(ecdPlanning, plannedUnit, unitKnowledgeMap = null) {
  const unitId = plannedUnit.id;
  const microKnowledgePoints =
    unitKnowledgeMap?.units?.find((item) => item.unitId === unitId)?.microKnowledgePoints ?? [];
  const unitTaskModel = (ecdPlanning.units ?? []).find((item) => item.unitId === unitId) ?? null;
  return {
    unitId,
    microKnowledgePoints,
    assessableTargets: unitTaskModel?.assessableTargets ?? [],
    selectedTasks: unitTaskModel?.selectedTasks ?? [],
    skippedTargets: unitTaskModel?.skippedTargets ?? []
  };
}

function buildPracticePlanFromEcdContext({ ecdContext, plannedUnit }) {
  return alignPracticePlanWithEcdContext({
    unitId: plannedUnit.id,
    practiceGoals: [],
    questionPlans: []
  }, {
    ecdContext,
    plannedUnit
  });
}

function alignPracticePlanWithEcdContext(practicePlan, { ecdContext, plannedUnit }) {
  const selectedTasks = Array.isArray(ecdContext?.selectedTasks) ? ecdContext.selectedTasks : [];
  if (selectedTasks.length === 0) return practicePlan;

  const sourceAnchorId = plannedUnit.sourceAnchor.id;
  const existingGoals = Array.isArray(practicePlan.practiceGoals) ? practicePlan.practiceGoals : [];
  const existingPlans = Array.isArray(practicePlan.questionPlans) ? practicePlan.questionPlans : [];
  const existingPlansById = new Map(existingPlans.map((plan) => [plan.id, plan]));
  const goalsById = new Map(existingGoals.map((goal) => [goal.id, goal]));

  const alignedPlans = selectedTasks.map((task, index) => {
    const existingPlan = existingPlansById.get(task.questionPlanId) || {};
    const practiceGoalId = existingPlan.practiceGoalId || practiceGoalIdForSelectedTask(task, index);
    if (!goalsById.has(practiceGoalId)) {
      goalsById.set(
        practiceGoalId,
        practiceGoalFromSelectedTask(task, {
          id: practiceGoalId,
          ecdContext,
          sourceAnchorId
        })
      );
    }

    const type = questionTypeForTaskAffordance(task.taskAffordance);
    return {
      ...existingPlan,
      id: task.questionPlanId,
      type,
      purpose: questionPurposeForSelectedTask(task.taskPurpose),
      practiceGoalId,
      targetIds: Array.isArray(task.targetIds) ? task.targetIds : [],
      microIds: Array.isArray(task.microIds) ? task.microIds : [],
      ...(type === "matching" ? { relationType: relationTypeForTaskPurpose(task.taskPurpose) } : {}),
      sourceAnchorId
    };
  });

  return {
    ...practicePlan,
    unitId: plannedUnit.id,
    practiceGoals: Array.from(goalsById.values()),
    questionPlans: alignedPlans
  };
}

function practiceGoalIdForSelectedTask(task, index) {
  return `goal-${task.questionPlanId || index + 1}`;
}

function practiceGoalFromSelectedTask(task, { id, ecdContext, sourceAnchorId }) {
  const target = firstTargetForSelectedTask(task, ecdContext);
  return {
    id,
    kind: practiceGoalKindForSelectedTask(task),
    target: task.evidenceGoal || target?.evidenceGoal || target?.learningTarget || task.assemblyReason,
    commonMisconception: commonMisconceptionForSelectedTask(task),
    targetIds: Array.isArray(task.targetIds) ? task.targetIds : [],
    microIds: Array.isArray(task.microIds) ? task.microIds : [],
    sourceAnchorId
  };
}

function firstTargetForSelectedTask(task, ecdContext) {
  const targetIds = Array.isArray(task.targetIds) ? task.targetIds : [];
  return ecdContext.assessableTargets.find((item) => targetIds.includes(item.targetId)) ?? null;
}

function practiceGoalKindForSelectedTask(task) {
  if (task.taskAffordance === "matching") return "relationship_mapping";
  if (task.taskPurpose === "scenario_application") return "scenario_application";
  if (task.taskPurpose === "boundary_check" || task.taskPurpose === "counterexample_check") {
    return "boundary_clarification";
  }
  return "core_understanding";
}

function commonMisconceptionForSelectedTask(task) {
  if (typeof task.commonMisconception === "string" && task.commonMisconception.trim()) {
    return task.commonMisconception.trim();
  }
  if (task.taskAffordance === "matching") {
    return "把结构关系误解成孤立名词定义。";
  }
  if (task.taskPurpose === "scenario_application") {
    return "只记住概念表述，不能迁移到具体场景。";
  }
  if (task.taskPurpose === "boundary_check" || task.taskPurpose === "counterexample_check") {
    return "忽略这个知识点的适用边界。";
  }
  return "把这个知识点理解成表面说法，而没有抓住核心主张。";
}

function questionTypeForTaskAffordance(taskAffordance) {
  return taskAffordance === "matching" ? "matching" : "multiple_choice";
}

function questionPurposeForSelectedTask(taskPurpose) {
  return QUESTION_PLAN_PURPOSES.includes(taskPurpose) ? taskPurpose : "light_understanding";
}

function relationTypeForTaskPurpose(taskPurpose) {
  const relationType = {
    layer_role_matching: "responsibility",
    type_feature_matching: "verification_dimension",
    step_purpose_matching: "process_signal",
    signal_action_matching: "process_signal",
    role_responsibility_matching: "responsibility"
  }[taskPurpose] || "scenario_effect";
  return MATCHING_RELATION_TYPES.includes(relationType) ? relationType : "scenario_effect";
}

function readOptionalPositiveInt(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readOptionalBoolean(value) {
  if (value === undefined || value === null || value === "") return null;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function buildDeterministicSourceMap(article) {
  const rawText = String(article.cleanedText || article.rawText || "");
  const blocks = splitArticleIntoSourceBlocks(rawText);
  return {
    source: {
      type: article.sourceType || "article",
      title: article.title || article.sourceTitle || "",
      author: article.author || article.sourceAccount || "",
      url: article.url || article.sourceUrl || ""
    },
    blocks
  };
}

function splitArticleIntoSourceBlocks(rawText) {
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sourceLines = lines.length > 0 ? lines : [rawText.trim()].filter(Boolean);
  return sourceLines.map((text, index) => ({
    id: `p-${String(index + 1).padStart(3, "0")}`,
    type: inferSourceBlockType(text),
    text
  }));
}

function inferSourceBlockType(text) {
  const compact = String(text || "").trim();
  if (compact.length <= 36 && /^(内容摘要|关键词|引\s*言|结语|[一二三四五六七八九十]+[、.．]|\d+[、.．])/.test(compact)) {
    return "heading";
  }
  return "paragraph";
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
  if (plans.length === 0 || output.questions.length < plans.length) return output;

  const knownPlanIds = new Set(plans.map((plan) => plan.id));
  const plansById = new Map(plans.map((plan) => [plan.id, plan]));
  const selectedQuestions = plans.map((plan, index) =>
    output.questions.find((question) => question?.id === plan.id) || output.questions[index]
  );
  if (selectedQuestions.some((question) => !question)) return output;

  const needsNormalization =
    output.questions.length !== plans.length ||
    selectedQuestions.some((question, index) => {
      const plan = plansById.get(question.id) || plans[index];
      return (
        !knownPlanIds.has(question.id) ||
        !question.practiceGoalId ||
        !question.sourceAnchorId ||
        question.practiceGoalId !== plan.practiceGoalId ||
        question.sourceAnchorId !== plan.sourceAnchorId
      );
    });
  if (!needsNormalization) return output;

  return {
    ...output,
    questions: selectedQuestions.map((question, index) => ({
      ...question,
      ...normalizeDraftQuestionIdentity(question, plans, plansById, index)
    }))
  };
}

function normalizeDraftQuestionIdentity(question, plans, plansById, index) {
  const plan = plansById.get(question.id) || plans[index];
  return {
    id: plan.id,
    practiceGoalId: plan.practiceGoalId,
    sourceAnchorId: plan.sourceAnchorId
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
    ecdPlanning: "正在建立证据规划",
    unitPracticePlan: "正在规划练习",
    multipleChoiceDraft: "正在生成选择题",
    matchingDraft: "正在生成连线题",
    unitSummaryDraft: "正在生成单元总结",
    qualityJudge: "正在检查质量"
  }[stage] ?? stage;
}
