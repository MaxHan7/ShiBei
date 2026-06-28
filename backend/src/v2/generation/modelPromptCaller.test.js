import assert from "node:assert/strict";
import test from "node:test";

import { createV2ModelPromptCaller } from "./modelPromptCaller.js";
import { createStageRuntimeRecorder } from "./runtimeReliability.js";

test("calls the JSON model transport with sourceMap schema and messages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      return {
        source: { type: "article", title: "Hook" },
        blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }]
      };
    }
  });

  const output = await caller("sourceMap", {
    article: {
      id: "chapter-001",
      title: "Hook",
      rawText: "Hook 是流程控制器。"
    }
  });

  assert.equal(output.blocks[0].id, "p-001");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].schemaName, "shibei_v2_source_map");
  assert.equal(calls[0].schema.name, undefined);
  assert.equal(calls[0].stage, "v2_sourceMap");
  assert.match(calls[0].system, /Recallo V2/);
  assert.match(calls[0].user, /sourceMap/);
});

test("passes modelUsageRecorder through to the transport", async () => {
  const recorder = { record() {} };
  const caller = createV2ModelPromptCaller({
    modelUsageRecorder: recorder,
    modelJsonCaller: async (request) => {
      assert.equal(request.modelUsageRecorder, recorder);
      return { verdict: "pass", issues: [] };
    }
  });

  await caller("qualityJudge", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    reviewPath: { id: "chapter-001" }
  });
});

test("retries transient structured JSON transport failures", async () => {
  const calls = [];
  const runtimeRecorder = createStageRuntimeRecorder();
  const caller = createV2ModelPromptCaller({
    runtimeRecorder,
    modelJsonCaller: async (request) => {
      calls.push(request);
      if (calls.length === 1) {
        throw new Error("模型返回内容不是可解析 JSON，请重试。");
      }
      return {
        source: { type: "article", title: "Hook" },
        blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }]
      };
    }
  });

  const output = await caller("sourceMap", {
    article: {
      id: "chapter-001",
      title: "Hook",
      rawText: "Hook 是流程控制器。"
    }
  });

  assert.equal(output.blocks[0].id, "p-001");
  assert.equal(calls.length, 2);
  const runtime = runtimeRecorder.summary();
  assert.equal(runtime.callCount, 1);
  assert.equal(runtime.attemptCount, 2);
  assert.equal(runtime.failedAttemptCount, 1);
  assert.equal(runtime.retryAttemptCount, 1);
  assert.equal(runtime.stages[0].errorTypes.json_parse_error, 1);
});

test("uses compact retry prompt for unit knowledge map JSON retries", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      if (calls.length === 1) {
        throw new Error("模型返回内容不是可解析 JSON，请重试。");
      }
      return {
        units: [
          {
            unitId: "unit-01",
            microKnowledgePoints: [
              {
                microId: "micro-unit-01-001",
                title: "Hook 定义",
                summary: "Hook 是流程约束",
                role: "definition",
                assessmentValue: "high",
                primaryEvidenceAngle: "定义识别"
              }
            ]
          }
        ]
      };
    }
  });

  await caller("unitKnowledgeMap", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
    plan: {
      title: "Hook",
      units: [{ id: "unit-01", title: "Hook 是什么" }]
    }
  });

  assert.equal(calls.length, 2);
  assert.doesNotMatch(calls[0].user, /重试压缩模式/);
  assert.match(calls[1].user, /重试压缩模式/);
  assert.match(calls[1].user, /summary 优先控制在 32 个中文字以内/);
});

test("does not retry non-transient model transport failures", async () => {
  let callCount = 0;
  const runtimeRecorder = createStageRuntimeRecorder();
  const caller = createV2ModelPromptCaller({
    runtimeRecorder,
    modelJsonCaller: async () => {
      callCount += 1;
      throw new Error("quota exhausted");
    }
  });

  await assert.rejects(
    () => caller("sourceMap", {
      article: {
        id: "chapter-001",
        title: "Hook",
        rawText: "Hook 是流程控制器。"
      }
    }),
    /quota exhausted/
  );
  assert.equal(callCount, 1);
  const runtime = runtimeRecorder.summary();
  assert.equal(runtime.callCount, 1);
  assert.equal(runtime.failedAttemptCount, 1);
  assert.equal(runtime.stages[0].errorTypes.provider_error, 1);
});

test("calls the JSON model transport with ecdPlanning schema and messages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      return {
        units: [
          {
            unitId: "unit-01",
            sourceAnchorId: "anchor-unit-01",
            assessableTargets: [
              {
                targetId: "target-001",
                microIds: ["micro-unit-01-001"],
                title: "Hook 核心定义",
                learningTarget: "用户能理解 Hook 是流程约束。",
                evidenceGoal: "用户能选择 Hook 的核心作用。",
                evidenceType: "select_core_claim",
                coverageRequirement: "required",
                sourceAnchorId: "anchor-unit-01"
              }
            ],
            selectedTasks: [
              {
                questionPlanId: "q-001",
                targetIds: ["target-001"],
                microIds: ["micro-unit-01-001"],
                taskAffordance: "multiple_choice",
                taskPurpose: "light_understanding",
                evidenceGoal: "用户能选择 Hook 的核心作用。",
                assemblyReason: "先确认用户能把 Hook 理解成流程约束。"
              }
            ]
          }
        ]
      };
    }
  });

  await caller("ecdPlanning", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
    plan: { title: "Hook", units: [] }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].schemaName, "shibei_v2_ecd_planning");
  assert.equal(calls[0].schema.name, undefined);
  assert.equal(calls[0].stage, "v2_ecdPlanning");
  assert.equal(calls[0].estimatedOutputTokens, 3000);
  assert.match(calls[0].user, /Evidence-Centered Design/);
  assert.match(calls[0].user, /compact task model/);
});

test("uses reduced output budgets for early planning stages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      if (request.stage === "v2_reviewPathPlan") {
        return {
          title: "Hook",
          summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
          units: [
            {
              id: "unit-01",
              order: 1,
              title: "Hook 是什么",
              nodeLabel: "流程控制",
              shortSummary: "Hook 是流程控制器。",
              detailSummary: "Hook 在关键动作前后加入规则、上下文和验证。",
              why: "这是理解后续场景的基础。",
              sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
            }
          ],
          chapterSummary: { encouragementText: "你已经理解 Hook 的流程价值。" }
        };
      }
      return {
        units: [
          {
            unitId: "unit-01",
            microKnowledgePoints: [
              {
                microId: "micro-unit-01-001",
                title: "Hook 定义",
                summary: "Hook 是关键动作前后的流程约束。",
                role: "definition",
                assessmentValue: "high",
                primaryEvidenceAngle: "definition_grasp"
              }
            ]
          }
        ]
      };
    }
  });

  await caller("reviewPathPlan", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }]
  });
  await caller("unitKnowledgeMap", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
    plan: {
      title: "Hook",
      units: [{ id: "unit-01", title: "Hook 是什么" }]
    }
  });

  assert.equal(calls[0].stage, "v2_reviewPathPlan");
  assert.equal(calls[0].estimatedOutputTokens, 4000);
  assert.equal(calls[1].stage, "v2_unitKnowledgeMap");
  assert.equal(calls[1].estimatedOutputTokens, 1700);
});

test("calls the JSON model transport with taskBriefPlan schema and messages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      return {
        units: [
          {
            unitId: "unit-01",
            practiceGoals: [
              {
                id: "goal-01",
                kind: "core_understanding",
                target: "理解 Hook 是流程约束",
                commonMisconception: "把 Hook 当成更长提示词",
                sourceAnchorId: "anchor-unit-01"
              }
            ],
            questionPlans: [
              {
                id: "q-001",
                type: "multiple_choice",
                purpose: "light_understanding",
                practiceGoalId: "goal-01",
                sourceAnchorId: "anchor-unit-01"
              }
            ]
          }
        ]
      };
    }
  });

  await caller("taskBriefPlan", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    blocks: [{ id: "p-001", type: "paragraph", text: "Hook 是流程控制器。" }],
    plan: {
      title: "Hook",
      units: [
        {
          id: "unit-01",
          sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
        }
      ]
    },
    unitKnowledgeMap: { units: [] }
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].schemaName, "shibei_v2_task_brief_plan");
  assert.equal(calls[0].schema.name, undefined);
  assert.equal(calls[0].stage, "v2_taskBriefPlan");
  assert.equal(calls[0].estimatedOutputTokens, 3800);
  assert.match(calls[0].user, /Evidence-Centered Design 是你的思考方法/);
  assert.match(calls[0].user, /不要输出 ECD 术语字段/);
});

test("calls the JSON model transport with batched draft schemas and messages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      if (request.stage === "v2_questionDraftBatch") {
        return { units: [{ unitId: "unit-01", questions: [] }] };
      }
      if (request.stage === "v2_multipleChoiceDraftBatch") {
        return { units: [{ unitId: "unit-01", questions: [] }] };
      }
      if (request.stage === "v2_multipleChoiceDraftUnitBatch") {
        return { unitId: "unit-01", questions: [] };
      }
      if (request.stage === "v2_matchingDraftBatch") {
        return { units: [{ unitId: "unit-01", questions: [] }] };
      }
      return {
        units: [
          {
            unitId: "unit-01",
            overview: { text: "Hook 是稳定流程。" },
            summary: { text: "你已经理解 Hook。" }
          }
        ]
      };
    }
  });

  await caller("questionDraftBatch", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    units: []
  });
  await caller("multipleChoiceDraftBatch", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    units: []
  });
  await caller("multipleChoiceDraftUnitBatch", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    unit: { id: "unit-01", title: "Hook 是什么" },
    questionBriefs: [],
    sourceContext: { blocks: [] }
  });
  await caller("matchingDraftBatch", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    units: []
  });
  await caller("unitCopyBatch", {
    article: { id: "chapter-001", title: "Hook", rawText: "Hook" },
    source: { type: "article", title: "Hook" },
    units: []
  });

  assert.equal(calls[0].schemaName, "shibei_v2_question_draft_batch");
  assert.equal(calls[0].stage, "v2_questionDraftBatch");
  assert.equal(calls[0].estimatedOutputTokens, 9000);
  assert.match(calls[0].user, /不要新增 questionPlan/);
  assert.equal(calls[1].schemaName, "shibei_v2_multiple_choice_draft_batch");
  assert.equal(calls[1].stage, "v2_multipleChoiceDraftBatch");
  assert.equal(calls[1].estimatedOutputTokens, 6500);
  assert.match(calls[1].user, /只生成整章各 unit 的选择题/);
  assert.equal(calls[2].schemaName, "shibei_v2_multiple_choice_draft_unit_batch");
  assert.equal(calls[2].stage, "v2_multipleChoiceDraftUnitBatch");
  assert.equal(calls[2].estimatedOutputTokens, 2400);
  assert.match(calls[2].user, /只为当前 unit 生成选择题小批次/);
  assert.match(calls[2].user, /questionBrief.practiceGoal.target/);
  assert.equal(calls[3].schemaName, "shibei_v2_matching_draft_batch");
  assert.equal(calls[3].stage, "v2_matchingDraftBatch");
  assert.equal(calls[3].estimatedOutputTokens, 4600);
  assert.match(calls[3].user, /只生成整章各 unit 的连线匹配题/);
  assert.equal(calls[4].schemaName, "shibei_v2_unit_copy_batch");
  assert.equal(calls[4].stage, "v2_unitCopyBatch");
  assert.equal(calls[4].estimatedOutputTokens, 1400);
  assert.match(calls[4].user, /不输出题目，不输出 ECD 字段/);
});

test("rejects unsupported V2 generation stage", async () => {
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async () => ({})
  });

  await assert.rejects(
    () => caller("unknown", {}),
    /Unsupported V2 model prompt stage: unknown/
  );
});
