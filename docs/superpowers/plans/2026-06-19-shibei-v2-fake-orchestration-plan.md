# Shibei V2 Fake Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, testable V2 generation orchestration that converts fake prompt outputs into a contract-valid V2 review path without calling a real model.

**Architecture:** Keep this inside `experiments/shibei-v2/backend/src/v2/generation/`. The orchestrator will call four injectable prompt stages (`sourceMap`, `reviewPathPlan`, `unitCards`, `qualityJudge`), validate each stage with the prompt schema validators, assemble the final `v2_review_path_1` payload, and validate it with `validateReviewPathV2`. This creates the backbone that later real OpenAI/DeepSeek callers can plug into.

**Tech Stack:** Node.js ESM, `node:test`, existing V2 prompt validators, existing V2 review path contract validator.

---

## File Structure

- Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Owns fake-callable orchestration.
  - Exports `generateReviewPathV2(input, { promptCaller, now })`.
  - Exports `V2_GENERATION_STAGES`.
  - Validates each stage before moving forward.
  - Assembles final payload and validates with `validateReviewPathV2`.
- Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Tests happy path using deterministic fake prompt outputs.
  - Tests failure when a stage returns invalid schema.
  - Tests failure when final assembled payload violates review path contract.
  - Tests quality judge `discard` stops generation before returning a chapter.
- Modify `experiments/shibei-v2/backend/package.json`
  - Add syntax checks and node tests for the new orchestration file.
- Modify `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`
  - Mark fake caller orchestration as completed after tests pass.
  - Record that real model calls are still intentionally not connected.

## Task 1: Add Failing Orchestration Happy-Path Test

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Write the failing happy-path test**

Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js` with:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";
import { generateReviewPathV2, V2_GENERATION_STAGES } from "./generateReviewPathV2.js";

const ARTICLE_INPUT = {
  id: "chapter-fake-001",
  title: "Hook 如何让 AI 工作流稳定",
  url: "https://example.com/hook",
  author: "MetaTown",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("generates a contract-valid V2 review path from fake prompt outputs", async () => {
  const calls = [];
  const promptCaller = async (stage, payload) => {
    calls.push({ stage, payload });

    if (stage === "sourceMap") {
      return {
        source: {
          type: "article",
          title: ARTICLE_INPUT.title,
          author: ARTICLE_INPUT.author,
          url: ARTICLE_INPUT.url
        },
        blocks: [
          { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" },
          { id: "p-002", type: "paragraph", text: "它能稳定触发规则、上下文和验证。" }
        ]
      };
    }

    if (stage === "reviewPathPlan") {
      return {
        title: ARTICLE_INPUT.title,
        summaryCard: {
          text: "这篇文章解释 Hook 如何把 AI 工作流里的关键动作变成稳定流程。"
        },
        units: [
          {
            id: "unit-01",
            order: 1,
            title: "Hook 是什么",
            shortSummary: "Hook 是关键动作前后的流程控制器。",
            detailSummary: "Hook 不是更长提示词，而是在关键动作前后稳定执行规则、上下文和验证的流程约束。",
            why: "这是理解后续自动化边界的基础。",
            sourceAnchor: {
              id: "anchor-unit-01",
              blockIds: ["p-001", "p-002"],
              quote: "Hook 是关键动作前后的流程控制器。"
            }
          }
        ],
        chapterSummary: {
          encouragementText: "你已经能把 Hook 理解成稳定流程，而不是单纯依赖模型自觉。"
        }
      };
    }

    if (stage === "unitCards") {
      return {
        unitId: payload.unit.id,
        overview: {
          text: "Hook 更像一段固定流程，负责在关键动作前后稳定补上规则和验证。"
        },
        questions: [
          {
            id: "q-001",
            type: "multiple_choice",
            stem: "Hook 更接近下面哪一种机制？",
            options: [
              { id: "A", text: "在关键动作前后稳定执行流程约束" },
              { id: "B", text: "把提示词写得更长" },
              { id: "C", text: "把所有问题交给人工复查" },
              { id: "D", text: "把文章内容变成摘要" }
            ],
            correctOptionId: "A",
            explanation: "Hook 的重点是稳定触发流程，而不是让模型自己记住。",
            sourceAnchorId: payload.unit.sourceAnchor.id
          },
          {
            id: "q-002",
            type: "matching",
            stem: "把 Hook 工作流中的角色和作用匹配起来。",
            leftItems: [
              { id: "L1", text: "Prompt" },
              { id: "L2", text: "Hook" },
              { id: "L3", text: "CI" },
              { id: "L4", text: "规则文档" }
            ],
            rightItems: [
              { id: "R1", text: "提供上下文" },
              { id: "R2", text: "稳定触发动作" },
              { id: "R3", text: "最终验证" },
              { id: "R4", text: "沉淀约束" }
            ],
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" },
              { leftId: "L3", rightId: "R3" },
              { leftId: "L4", rightId: "R4" }
            ],
            explanation: "Prompt 提供上下文；Hook 稳定触发动作；CI 做最终验证。",
            sourceAnchorId: payload.unit.sourceAnchor.id
          }
        ],
        summary: {
          title: "单元完成",
          text: "你已经理解 Hook 的基本机制。"
        }
      };
    }

    if (stage === "qualityJudge") {
      return { verdict: "pass", issues: [] };
    }

    throw new Error(`Unexpected stage: ${stage}`);
  };

  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    calls.map((call) => call.stage),
    V2_GENERATION_STAGES
  );
  assert.equal(reviewPath.schemaVersion, "v2_review_path_1");
  assert.equal(reviewPath.id, ARTICLE_INPUT.id);
  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units.length, 1);
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.deepEqual(validateReviewPathV2(reviewPath), {
    ok: true,
    errors: []
  });
});
```

- [x] **Step 2: Run test to verify it fails** *(skipped red-run capture; implementation and final validation completed in the same slice)*

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: FAIL with an import error because `generateReviewPathV2.js` does not exist yet.

## Task 2: Implement Minimal Orchestrator

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Add the orchestrator implementation**

Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`:

```js
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

  const sourceMap = await callAndValidate(promptCaller, "sourceMap", { article }, validateSourceMapOutput);
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
```

- [x] **Step 2: Run the happy-path test**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS for the happy-path test.

## Task 3: Add Failure-Mode Tests

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Add invalid stage output test**

Append this test:

```js
test("throws a stage-specific error when sourceMap output is invalid", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2(ARTICLE_INPUT, {
        promptCaller: async (stage) => {
          if (stage === "sourceMap") {
            return {
              source: { type: "article", title: ARTICLE_INPUT.title },
              blocks: []
            };
          }
          throw new Error(`Unexpected stage ${stage}`);
        },
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.equal(error.stage, "sourceMap");
      assert.match(error.message, /sourceMap output failed validation/);
      assert.match(error.errors.join("\n"), /blocks must be a non-empty array/);
      return true;
    }
  );
});
```

- [x] **Step 2: Add quality judge discard test**

Append this helper and test:

```js
function fakePromptCallerWithJudge(judgeOutput) {
  return async (stage, payload) => {
    if (stage === "qualityJudge") {
      return judgeOutput;
    }

    return happyPathPromptCaller(stage, payload);
  };
}

test("throws when quality judge discards the generated review path", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2(ARTICLE_INPUT, {
        promptCaller: fakePromptCallerWithJudge({
          verdict: "discard",
          issues: [
            {
              code: "unsupported_answer",
              severity: "error",
              message: "题目答案无法被来源支撑。",
              targetId: "q-001"
            }
          ]
        }),
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.match(error.message, /discarded by quality judge/);
      assert.equal(error.issues[0].code, "unsupported_answer");
      return true;
    }
  );
});
```

Before this test can compile, refactor the happy-path inline `promptCaller` into a top-level `happyPathPromptCaller(stage, payload)` function. The existing happy-path test should call that helper and preserve the call order assertion by wrapping it:

```js
const calls = [];
const promptCaller = async (stage, payload) => {
  calls.push({ stage, payload });
  return happyPathPromptCaller(stage, payload);
};
```

- [x] **Step 3: Run the orchestration tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS all orchestration tests.

## Task 4: Add Full Check Integration

**Files:**
- Modify: `experiments/shibei-v2/backend/package.json`

- [x] **Step 1: Add new files to `npm run check`**

Modify the `check` script so it includes:

```bash
node --check src/v2/generation/generateReviewPathV2.js
node --check src/v2/generation/generateReviewPathV2.test.js
node --test ... src/v2/generation/generateReviewPathV2.test.js
```

Do this using the same explicit file-list style already used in `package.json`, not with a broad glob. This keeps the current repo style intact.

- [x] **Step 2: Run full backend check**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm run check
```

Expected: PASS. The test count should increase beyond the current `148/148`.

## Task 5: Update Backend Progress Documentation

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`
- Modify: `docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`

- [x] **Step 1: Update contract audit progress**

In `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`, update the P1 section from:

```md
5. fake caller orchestration test，先不接真实模型。
```

to:

```md
5. fake caller orchestration test，先不接真实模型。**已完成**
   - 当前实现文件：`src/v2/generation/generateReviewPathV2.js`。
   - 当前测试覆盖：完整 fake pipeline、stage schema 失败、quality judge discard、最终 contract validation。
```

Also update the progress summary to say the fake orchestration has passed backend checks.

- [x] **Step 2: Update implementation plan status**

In `docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`, add a short progress note near the Preflight section:

```md
2026-06-19 progress update:

- P0 foundation completed: V2 contract, golden loader, SwiftUI serializer, review session V2.
- P1 schema foundation completed: sourceMap, reviewPathPlan, unitCards, qualityJudge validators.
- Fake orchestration completed: generateReviewPathV2 runs the fake prompt pipeline and validates the final review path.
- Real model calls remain intentionally unconnected.
```

- [x] **Step 3: Run doc-sensitive checks**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git diff --check
```

Expected: no output.

## Task 6: Commit the Orchestration Slice

**Files:**
- Commit all files changed by Tasks 1-5.

- [ ] **Step 1: Confirm status**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
git status --short
```

Expected: only V2 backend generation files, `package.json`, and backend docs are modified/untracked. If unrelated SwiftUI or design files appear, stop and inspect before staging.

- [ ] **Step 2: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md \
  docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md

git commit -m "Add V2 fake review path orchestration"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: This plan implements the next backend step after contract, golden loader, serializer, state machine, and prompt schema validators. It does not connect real model calls, by design.
- Placeholder scan: no TBD/TODO placeholders.
- Type consistency: `generateReviewPathV2`, `V2_GENERATION_STAGES`, `sourceMap`, `reviewPathPlan`, `unitCards`, and `qualityJudge` names match the existing prompt schema modules.
