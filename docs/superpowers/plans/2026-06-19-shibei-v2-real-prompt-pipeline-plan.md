# Shibei V2 Real Prompt Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the V2 review-path generator to real structured model calls while preserving the tested V2 contract, prompt field rules, and isolated development boundary.

**Architecture:** Keep all new code inside `experiments/shibei-v2/backend/src/v2/` and reuse the existing `generation/openaiClient.js` only as a low-level JSON model transport. Add a V2-specific prompt builder/caller layer that converts article + stage payloads into schema-bound model calls, then wire it into `generateReviewPathV2` as the default caller without breaking fake caller tests. After that, add an isolated V2 job adapter so the existing generation queue can call V2 only when explicitly requested.

**Tech Stack:** Node.js ESM, `node:test`, existing `callOpenAIJson`, V2 prompt schema validators, V2 review-path contract validator, existing backend `npm run check`.

---

## Scope Boundary

This plan does **not** replace the old production generation path yet.

Do:

- Add V2 real prompt caller modules.
- Make `generateReviewPathV2` work with either injected fake callers or default real callers.
- Add tests that mock `callOpenAIJson`; no network calls in `npm run check`.
- Add an explicit V2 generation adapter for future server/job integration.
- Update docs to record the exact field-generation boundary.

Do not:

- Mutate root production app.
- Change current V1 endpoints as the default behavior.
- Run real model calls in automated tests.
- Store prompt text in UI docs only; prompt behavior must live next to V2 backend code and be referenced from docs.

## File Structure

- Create `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Builds stage-specific `system` and `user` messages.
  - Centralizes prompt rules from `v2-prompt-field-rules-zh.md`.
  - Keeps user-facing field semantics explicit.
- Create `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Locks prompt content for each stage.
  - Ensures generated prompt names important product rules: short/detail summaries, one explanation field, 4 matching pairs, source anchors.
- Create `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - Maps `sourceMap`, `reviewPathPlan`, `unitCards`, `qualityJudge` to the matching schema module.
  - Calls `callOpenAIJson`.
  - Accepts `modelUsageRecorder`.
  - Exports `createV2ModelPromptCaller`.
- Create `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js`
  - Mocks `modelJsonCaller` instead of network.
  - Verifies schema names, stages, messages, usage recorder pass-through, and unsupported stage failure.
- Modify `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - If `promptCaller` is omitted, create a default real prompt caller.
  - Accept `modelUsageRecorder` and pass it into the default caller.
  - Keep fake caller behavior unchanged.
- Modify `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Add a test proving omitted `promptCaller` uses the default caller factory via dependency injection.
  - Keep existing fake pipeline tests green.
- Create `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js`
  - Wraps `generateReviewPathV2` for job-style input.
  - Normalizes status/failure messages into UI generation states.
  - Does not edit the existing V1 job runner yet.
- Create `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.test.js`
  - Tests completed, failed validation, failed model API key, and quality discard cases.
- Modify `experiments/shibei-v2/backend/package.json`
  - Add syntax checks and tests for all new V2 files.
- Modify `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`
  - Mark real prompt caller layer status.
  - Record that V2 is still not the default production path.
- Modify `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
  - Link each prompt stage to source files.
  - Clarify generated vs engineering-derived fields.
- Modify `docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`
  - Add progress update after this slice lands.

## Task 1: Prompt Message Builder

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Write prompt-builder tests**

Create `buildV2PromptMessages.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { buildV2PromptMessages } from "./buildV2PromptMessages.js";

const ARTICLE = {
  id: "chapter-001",
  title: "Hook 如何让 AI 工作流稳定",
  author: "MetaTown",
  url: "https://example.com/hook",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("sourceMap prompt asks for stable source blocks and no question generation", () => {
  const messages = buildV2PromptMessages("sourceMap", { article: ARTICLE });

  assert.match(messages.system, /拾贝 V2/);
  assert.match(messages.user, /sourceMap/);
  assert.match(messages.user, /稳定的 source block/);
  assert.match(messages.user, /不要生成知识点或题目/);
  assert.match(messages.user, /Hook 如何让 AI 工作流稳定/);
  assert.match(messages.user, /Hook 是关键动作前后的流程控制器/);
});

test("reviewPathPlan prompt separates chapter summary and unit summaries", () => {
  const messages = buildV2PromptMessages("reviewPathPlan", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title, author: ARTICLE.author, url: ARTICLE.url },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ]
  });

  assert.match(messages.user, /chapter summary 是整章概要/);
  assert.match(messages.user, /unit.shortSummary/);
  assert.match(messages.user, /unit.detailSummary/);
  assert.match(messages.user, /sourceAnchor.blockIds/);
  assert.match(messages.user, /章节完成页鼓励文案/);
});

test("unitCards prompt locks visible question rules", () => {
  const messages = buildV2PromptMessages("unitCards", {
    article: ARTICLE,
    source: { type: "article", title: ARTICLE.title },
    blocks: [
      { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ],
    unit: {
      id: "unit-01",
      title: "Hook 是什么",
      shortSummary: "Hook 是流程控制器。",
      detailSummary: "Hook 在关键动作前后稳定执行规则。",
      sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-001"] }
    }
  });

  assert.match(messages.user, /只生成一个 explanation/);
  assert.match(messages.user, /选择题必须 4 个选项/);
  assert.match(messages.user, /连线题必须左右各 4 项/);
  assert.match(messages.user, /不要输出 correctUnderstanding 或 misconception 给前端/);
});

test("qualityJudge prompt checks source support and UI fitness", () => {
  const messages = buildV2PromptMessages("qualityJudge", {
    article: ARTICLE,
    reviewPath: { id: "chapter-001", units: [] }
  });

  assert.match(messages.user, /source anchor/);
  assert.match(messages.user, /选择题是否只有一个正确答案/);
  assert.match(messages.user, /连线题是否一一对应/);
});

test("unsupported prompt stage fails loudly", () => {
  assert.throws(
    () => buildV2PromptMessages("unknown", {}),
    /Unsupported V2 prompt stage: unknown/
  );
});
```

- [x] **Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: FAIL because `buildV2PromptMessages.js` does not exist.

- [x] **Step 3: Implement prompt builder**

Create `buildV2PromptMessages.js`:

```js
export function buildV2PromptMessages(stage, payload) {
  if (stage === "sourceMap") return buildSourceMapMessages(payload);
  if (stage === "reviewPathPlan") return buildReviewPathPlanMessages(payload);
  if (stage === "unitCards") return buildUnitCardsMessages(payload);
  if (stage === "qualityJudge") return buildQualityJudgeMessages(payload);

  throw new Error(`Unsupported V2 prompt stage: ${stage}`);
}

function baseSystem() {
  return [
    "你是拾贝 V2 的学习路径生成器。",
    "你必须优先遵守产品字段契约：字段要稳定、可验证、可被 SwiftUI 直接消费。",
    "不要输出 Markdown，不要输出解释文字，只输出符合调用方 JSON schema 的对象。"
  ].join("\n");
}

function buildSourceMapMessages({ article }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：sourceMap。",
      "任务：把原文切成稳定的 source block，供后续知识点和题目引用。",
      "要求：",
      "- 每个 block 必须有稳定 id，例如 p-001。",
      "- block.type 只能是 heading、paragraph、quote。",
      "- 保留原文语义顺序。",
      "- 不要生成知识点或题目。",
      "",
      renderArticle(article)
    ].join("\n")
  };
}

function buildReviewPathPlanMessages({ article, source, blocks }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：reviewPathPlan。",
      "任务：生成整章概要、知识点计划、章节完成页鼓励文案。",
      "字段语义：",
      "- chapter summary 是整章概要，解释整篇文章的主旨，不是知识点详情。",
      "- unit.shortSummary 是知识点短摘要，用于章节详情折叠态、节点弹窗和列表预览。",
      "- unit.detailSummary 是知识点完整总结，用于展开态和出题上下文。",
      "- unit.overview 不在本阶段生成，留给 unitCards 阶段。",
      "- 每个 unit.sourceAnchor.blockIds 必须引用 sourceMap 已有 block id。",
      "- chapterSummary.encouragementText 是章节完成页鼓励文案，要结合本章内容，不要空泛。",
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildUnitCardsMessages({ article, source, blocks, unit }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：unitCards。",
      "任务：为一个知识点生成开场 overview、题目和单元总结。",
      "前端展示规则：",
      "- 只生成一个 explanation，前端答后反馈只展示这一段。",
      "- 不要输出 correctUnderstanding 或 misconception 给前端；如果内部推理需要，也必须合并进 explanation。",
      "- 选择题必须 4 个选项，只有一个正确答案。",
      "- 干扰项必须承载真实误区，不能明显凑数。",
      "- 连线题必须左右各 4 项，pairs 必须一一对应。",
      "- 题干要自足，不要写“根据原文/这篇文章/这里的”。",
      "- 每道题的 sourceAnchorId 必须等于当前 unit.sourceAnchor.id。",
      "",
      `当前 unit:\n${JSON.stringify(unit, null, 2)}`,
      "",
      renderSource(source, blocks),
      "",
      renderArticleMeta(article)
    ].join("\n")
  };
}

function buildQualityJudgeMessages({ article, reviewPath }) {
  return {
    system: baseSystem(),
    user: [
      "阶段：qualityJudge。",
      "任务：检查候选 review path 是否适合进入前端。",
      "检查重点：",
      "- source anchor 是否真实支撑每个知识点和题目。",
      "- 选择题是否只有一个正确答案。",
      "- 干扰项是否有学习价值。",
      "- 连线题是否一一对应，且不是机械同义词匹配。",
      "- explanation 是否短、清晰、能解释题目核心。",
      "- UI 是否能承载：选择题 4 项，连线题左右各 4 项。",
      "",
      renderArticleMeta(article),
      "",
      `候选 reviewPath:\n${JSON.stringify(reviewPath, null, 2)}`
    ].join("\n")
  };
}

function renderArticle(article) {
  return [
    renderArticleMeta(article),
    "",
    "原文：",
    article.rawText || article.cleanedText || ""
  ].join("\n");
}

function renderArticleMeta(article) {
  return [
    `文章 id：${article.id || ""}`,
    `标题：${article.title || article.sourceTitle || ""}`,
    `作者：${article.author || ""}`,
    `链接：${article.url || ""}`
  ].join("\n");
}

function renderSource(source, blocks = []) {
  return [
    `source:\n${JSON.stringify(source || {}, null, 2)}`,
    `blocks:\n${JSON.stringify(blocks, null, 2)}`
  ].join("\n");
}
```

- [x] **Step 4: Run prompt-builder tests**

Run:

```bash
node --test src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: PASS.

- [x] **Step 5: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "Add V2 prompt message builders"
```

## Task 2: V2 Model Prompt Caller

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js`

- [x] **Step 1: Write caller tests**

Create `modelPromptCaller.test.js`:

```js
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

test("rejects unsupported V2 generation stage", async () => {
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async () => ({})
  });

  await assert.rejects(
    () => caller("unknown", {}),
    /Unsupported V2 model prompt stage: unknown/
  );
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
node --test src/v2/generation/modelPromptCaller.test.js
```

Expected: FAIL because `modelPromptCaller.js` does not exist.

- [x] **Step 3: Implement caller**

Create `modelPromptCaller.js`:

```js
import { callOpenAIJson } from "../../generation/openaiClient.js";
import {
  QUALITY_JUDGE_OUTPUT_SCHEMA,
  QUALITY_JUDGE_PROMPT_SCHEMA_NAME
} from "./prompts/qualityJudge.js";
import {
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME
} from "./prompts/reviewPathPlan.js";
import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  SOURCE_MAP_PROMPT_SCHEMA_NAME
} from "./prompts/sourceMap.js";
import {
  UNIT_CARDS_OUTPUT_SCHEMA,
  UNIT_CARDS_PROMPT_SCHEMA_NAME
} from "./prompts/unitCards.js";
import { buildV2PromptMessages } from "./prompts/buildV2PromptMessages.js";

const STAGE_SCHEMAS = {
  sourceMap: {
    schemaName: SOURCE_MAP_PROMPT_SCHEMA_NAME,
    schema: SOURCE_MAP_OUTPUT_SCHEMA,
    estimatedOutputTokens: 1800
  },
  reviewPathPlan: {
    schemaName: REVIEW_PATH_PLAN_PROMPT_SCHEMA_NAME,
    schema: REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2500
  },
  unitCards: {
    schemaName: UNIT_CARDS_PROMPT_SCHEMA_NAME,
    schema: UNIT_CARDS_OUTPUT_SCHEMA,
    estimatedOutputTokens: 2800
  },
  qualityJudge: {
    schemaName: QUALITY_JUDGE_PROMPT_SCHEMA_NAME,
    schema: QUALITY_JUDGE_OUTPUT_SCHEMA,
    estimatedOutputTokens: 900
  }
};

export function createV2ModelPromptCaller({
  modelJsonCaller = callOpenAIJson,
  modelUsageRecorder = null
} = {}) {
  return async function callV2ModelPrompt(stage, payload) {
    const stageConfig = STAGE_SCHEMAS[stage];
    if (!stageConfig) {
      throw new Error(`Unsupported V2 model prompt stage: ${stage}`);
    }

    const messages = buildV2PromptMessages(stage, payload);
    return modelJsonCaller({
      system: messages.system,
      user: messages.user,
      schemaName: stageConfig.schemaName,
      schema: stageConfig.schema,
      stage: `v2_${stage}`,
      modelUsageRecorder,
      estimatedOutputTokens: stageConfig.estimatedOutputTokens
    });
  };
}
```

- [x] **Step 4: Run caller tests**

```bash
node --test src/v2/generation/modelPromptCaller.test.js
```

Expected: PASS.

- [x] **Step 5: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js \
  experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js
git commit -m "Add V2 model prompt caller"
```

## Task 3: Wire Default Caller Into `generateReviewPathV2`

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Add default caller factory test**

Append to `generateReviewPathV2.test.js`:

```js
test("uses a default prompt caller factory when promptCaller is omitted", async () => {
  const stages = [];
  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    createPromptCaller: () => async (stage, payload) => {
      stages.push(stage);
      return happyPathPromptCaller(stage, payload);
    },
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(stages, V2_GENERATION_STAGES);
  assert.equal(reviewPath.status, "completed");
});
```

- [x] **Step 2: Run focused test to verify it fails**

```bash
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: FAIL because `createPromptCaller` is not supported yet.

- [x] **Step 3: Implement default caller support**

Modify the import and function signature in `generateReviewPathV2.js`:

```js
import { createV2ModelPromptCaller } from "./modelPromptCaller.js";
```

Change the exported function start to:

```js
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
```

Then replace every `promptCaller` passed to `callAndValidate` with `activePromptCaller`.

- [x] **Step 4: Run generator tests**

```bash
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS.

- [x] **Step 5: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "Wire V2 generator to default prompt caller"
```

## Task 4: V2 Generation Job Adapter

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.test.js`

- [x] **Step 1: Write job adapter tests**

Create `runV2GenerationJob.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { runV2GenerationJob } from "./runV2GenerationJob.js";

test("returns completed status with a generated V2 chapter", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => ({
      schemaVersion: "v2_review_path_1",
      id: "chapter-001",
      status: "completed",
      title: "Hook",
      units: []
    })
  });

  assert.equal(result.status, "completed");
  assert.equal(result.displayStatusText, "已生成");
  assert.equal(result.chapter.id, "chapter-001");
});

test("maps missing API key errors to a retryable generation failure", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      throw new Error("缺少模型 API Key。请先设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。");
    }
  });

  assert.equal(result.status, "failed_generation");
  assert.equal(result.displayStatusText, "生成失败");
  assert.equal(result.failedStage, "model_calling");
  assert.equal(result.retryable, true);
  assert.match(result.failureReason, /API Key/);
});

test("maps quality discard to non-completed generation failure", async () => {
  const result = await runV2GenerationJob({
    id: "chapter-001",
    title: "Hook",
    rawText: "Hook 是流程控制器。"
  }, {
    generateReviewPath: async () => {
      const error = new Error("V2 review path discarded by quality judge");
      error.issues = [{ code: "unsupported_answer", message: "答案缺少来源支撑" }];
      throw error;
    }
  });

  assert.equal(result.status, "failed_quality");
  assert.equal(result.failedStage, "quality_checking");
  assert.equal(result.retryable, true);
  assert.match(result.failureReason, /答案缺少来源支撑/);
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
node --test src/v2/generation/runV2GenerationJob.test.js
```

Expected: FAIL because `runV2GenerationJob.js` does not exist.

- [x] **Step 3: Implement job adapter**

Create `runV2GenerationJob.js`:

```js
import { generateReviewPathV2 } from "./generateReviewPathV2.js";

export async function runV2GenerationJob(input, {
  generateReviewPath = generateReviewPathV2,
  modelUsageRecorder = null,
  now = new Date().toISOString()
} = {}) {
  try {
    const chapter = await generateReviewPath(input, { modelUsageRecorder, now });
    return {
      status: "completed",
      displayStatusText: "已生成",
      chapter,
      generationMeta: chapter.generationMeta ?? null
    };
  } catch (error) {
    return mapV2GenerationError(error);
  }
}

function mapV2GenerationError(error) {
  const message = error instanceof Error ? error.message : "生成失败，请稍后重试。";

  if (message.includes("API Key") || message.includes("DEEPSEEK_API_KEY") || message.includes("OPENAI_API_KEY")) {
    return failure({
      failedStage: "model_calling",
      failureReason: message,
      retryable: true
    });
  }

  if (Array.isArray(error?.issues)) {
    return failure({
      status: "failed_quality",
      failedStage: "quality_checking",
      failureReason: error.issues.map((issue) => issue.message || issue.code).join("；") || message,
      retryable: true,
      issues: error.issues
    });
  }

  if (Array.isArray(error?.errors)) {
    return failure({
      failedStage: "contract_validation",
      failureReason: error.errors.join("；"),
      retryable: false,
      errors: error.errors
    });
  }

  return failure({
    failedStage: "generating_questions",
    failureReason: message,
    retryable: true
  });
}

function failure({
  status = "failed_generation",
  failedStage,
  failureReason,
  retryable,
  issues,
  errors
}) {
  return {
    status,
    displayStatusText: "生成失败",
    failedStage,
    failureReason,
    retryable,
    ...(issues ? { issues } : {}),
    ...(errors ? { errors } : {})
  };
}
```

- [x] **Step 4: Run job adapter tests**

```bash
node --test src/v2/generation/runV2GenerationJob.test.js
```

Expected: PASS.

- [x] **Step 5: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.js \
  experiments/shibei-v2/backend/src/v2/generation/runV2GenerationJob.test.js
git commit -m "Add V2 generation job adapter"
```

## Task 5: Check Script Integration

**Files:**
- Modify: `experiments/shibei-v2/backend/package.json`

- [x] **Step 1: Add new files to `npm run check`**

Modify the explicit `check` script to include:

```bash
node --check src/v2/generation/prompts/buildV2PromptMessages.js
node --check src/v2/generation/prompts/buildV2PromptMessages.test.js
node --check src/v2/generation/modelPromptCaller.js
node --check src/v2/generation/modelPromptCaller.test.js
node --check src/v2/generation/runV2GenerationJob.js
node --check src/v2/generation/runV2GenerationJob.test.js
```

And add these tests to the `node --test` file list:

```bash
src/v2/generation/prompts/buildV2PromptMessages.test.js
src/v2/generation/modelPromptCaller.test.js
src/v2/generation/runV2GenerationJob.test.js
```

- [x] **Step 2: Run full backend check**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run check
```

Expected: PASS. Test count should increase beyond `152/152`.

- [x] **Step 3: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/backend/package.json
git commit -m "Include V2 real prompt pipeline tests in backend check"
```

## Task 6: Documentation Update

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`
- Modify: `docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`

- [x] **Step 1: Update backend audit**

In `v2-backend-contract-audit-zh.md`, update the implementation status section to include:

```md
- `src/v2/generation/prompts/buildV2PromptMessages.js` 已建立，负责把字段规则转成阶段 prompt。
- `src/v2/generation/modelPromptCaller.js` 已建立，负责把 V2 阶段映射到 schema-bound 模型调用。
- `src/v2/generation/runV2GenerationJob.js` 已建立，负责把生成结果/失败映射成 V2 生成任务状态。
- 当前仍没有把 V2 设为线上默认路径；真实模型调用只通过显式 V2 入口使用。
```

- [x] **Step 2: Update prompt rules document**

In `v2-prompt-field-rules-zh.md`, add a section:

```md
## 代码落点

| Prompt 阶段 | 代码文件 | 生成内容 | 不生成内容 |
|---|---|---|---|
| `sourceMap` | `src/v2/generation/prompts/buildV2PromptMessages.js` | `source.blocks` | 知识点、题目 |
| `reviewPathPlan` | 同上 | `summaryCard`、`units[].shortSummary/detailSummary/sourceAnchor`、`chapterSummary.encouragementText` | `unit.overview`、题目 |
| `unitCards` | 同上 | `unit.overview`、选择题、连线题、`unit.summary` | 前端单独展示的 `correctUnderstanding/misconception` |
| `qualityJudge` | 同上 | 质量 verdict 和 issues | 面向用户的新内容 |
```

- [x] **Step 3: Update long backend implementation plan progress**

In `2026-06-18-shibei-v2-backend-prompt-schema-plan.md`, add:

```md
2026-06-19 progress update 2:

- Real prompt caller layer completed: V2 prompt messages and schema-bound model caller.
- V2 generation job adapter completed for isolated backend integration.
- Automated tests still mock model calls; no network calls in `npm run check`.
- Next integration is explicit V2 job routing, not production replacement.
```

- [x] **Step 4: Run doc-sensitive checks**

Run:

```bash
rg -n "buildV2PromptMessages|modelPromptCaller|runV2GenerationJob|真实模型|默认路径" \
  experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md \
  experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md \
  docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md
```

Expected: output shows all new code landing points and the “not default production path” warning.

- [x] **Step 5: Commit**

  Completed as part of the final consolidated commit for this execution pass.

```bash
git add experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md \
  experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md \
  docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md
git commit -m "Document V2 real prompt pipeline boundary"
```

## Task 7: Final Verification

**Files:**
- No code changes expected.

- [x] **Step 1: Run full backend check**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run check
```

Expected: PASS.

- [x] **Step 2: Confirm no root production code changed**

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git diff --name-only main...HEAD | rg -v '^(experiments/shibei-v2/|docs/superpowers/plans/)'
```

Expected: no output except intentionally committed planning docs, if branch comparison is available. If `main` is not available, use:

```bash
git status --short
```

Expected: clean except intentionally ignored local files such as `.codex-screenshots/`.

- [x] **Step 3: Final commit if needed**

If Task 7 changed only plan checkboxes:

```bash
git add docs/superpowers/plans/2026-06-19-shibei-v2-real-prompt-pipeline-plan.md
git commit -m "Track V2 real prompt pipeline plan completion"
```

## Recommended Worker Split

This plan can be split safely:

1. Worker A: Task 1 + Task 2
   - Prompt message builder and V2 model caller.
   - Needs careful review because it controls the generation semantics.
2. Worker B: Task 3 + Task 4
   - Generator default caller and job adapter.
   - Can start after Worker A lands.
3. Main thread: Task 5 + Task 6 + final review
   - Check script, docs, and final verification.

Do not run Task 3 before Task 2 exists. Do not run Task 4 before Task 3 is reviewed.

## Self-Review

Spec coverage:

- Real prompt caller layer: Task 1 and Task 2.
- Keep fake tests and isolated contract: Task 3.
- Job-style generation entry: Task 4.
- Backend check integration: Task 5.
- Documentation and field semantics: Task 6.
- Isolation verification: Task 7.

Placeholder scan:

- No `TBD` or open-ended “handle edge cases” instructions.
- Every code task includes concrete file paths, commands, and expected results.

Type consistency:

- Stage names match current `V2_GENERATION_STAGES`: `sourceMap`, `reviewPathPlan`, `unitCards`, `qualityJudge`.
- Schema constants match existing prompt modules.
- Default caller factory name is `createV2ModelPromptCaller`.
