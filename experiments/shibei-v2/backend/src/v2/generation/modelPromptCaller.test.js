import assert from "node:assert/strict";
import test from "node:test";

import { createV2ModelPromptCaller } from "./modelPromptCaller.js";

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
  assert.match(calls[0].system, /拾贝 V2/);
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
  const caller = createV2ModelPromptCaller({
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
});

test("does not retry non-transient model transport failures", async () => {
  let callCount = 0;
  const caller = createV2ModelPromptCaller({
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
});

test("calls the JSON model transport with ecdPlanning schema and messages", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      return {
        articleUnderstanding: {
          coreThesis: "Hook 把提醒变成稳定流程。",
          articleStructure: [],
          reviewableSections: [],
          nonReviewableSections: []
        },
        knowledgeModel: { units: [] },
        unitLearningClaims: [],
        unitEvidenceNeeds: [],
        unitTaskPlan: [],
        unitAssemblyPlan: []
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
  assert.match(calls[0].user, /Evidence-Centered Design/);
  assert.match(calls[0].user, /learningClaim/);
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
