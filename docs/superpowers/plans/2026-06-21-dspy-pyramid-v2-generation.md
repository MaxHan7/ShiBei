# DSPy Pyramid V2 Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the V2 question-generation backend into a clean DSPy-style pyramid pipeline: broad article understanding at the top, progressively narrower unit/task/question contexts below, with typed adapters carrying deterministic structure.

**Architecture:** The new design treats each LLM call as a typed module with a small signature. Each lower stage receives only compressed upstream outputs and scoped source windows, never the full article unless the stage genuinely needs chapter-level understanding. ECD remains the pedagogical design method inside the modules, while DSPy-style signatures, adapters, validators, and metrics define the engineering structure.

**Tech Stack:** Node.js backend under `experiments/shibei-v2/backend`, existing JSON model caller, V2 prompt/schema modules, Node test runner, quality experiment runner, DeepSeek/OpenAI-compatible structured JSON calls.

---

## Why The Current Pipeline Did Not Become The Ideal Pyramid

The current implementation moved in the right direction but stopped halfway:

- `sourceMap` is now deterministic, which is good.
- `reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan` is pyramid-like, but `taskBriefPlan` still plans all units at once with a plan-level source window.
- `multipleChoiceDraftBatch` currently drafts many MC questions in one large call. This is not a clean DSPy-style module because it has too many output objects, too much mixed context, and too much opportunity for JSON truncation.
- ECD is present as guidance, but not consistently carried as a compact per-question evidence brief into the final question-writing stage. The final MC stage can therefore fall back to surface-level quiz writing.
- The code is centered in `generateReviewPathV2.js`, so stage boundaries are implicit rather than represented as a clear program graph.

The target is not “more calls” by default. The target is:

```text
wide context once
  -> compressed unit knowledge
  -> compact task briefs
  -> scoped question briefs
  -> small question drafting modules
  -> deterministic assembly
```

## Ideal Pyramid Shape

```text
ArticleInput
  |
  | deterministic code
  v
SourceMap
  |
  | LLM, chapter-level context
  v
ChapterPlan
  |
  | LLM, plan union source window
  v
UnitKnowledgeMap
  |
  | LLM, compact semantic planning, no user-visible copy
  v
TaskBriefPlan
  |
  | deterministic code
  v
QuestionBriefsByUnit
  |
  | LLM, scoped small batches by unit/type
  v
QuestionDrafts
  |
  | LLM, scoped copy batch
  v
UnitCopy
  |
  | deterministic code
  v
V2 ReviewPath Contract
```

The most important new boundary is `QuestionBriefsByUnit`: this is where task planning becomes tiny, question-specific briefs so the MC writer no longer has to infer ECD/evidence details from a large mixed planning object.

## File Structure

### Create

- `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
  - Owns the high-level DSPy-style program graph and delegates to stage modules.
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/stageAdapters.js`
  - Deterministically transforms upstream outputs into downstream signatures.
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.js`
  - Converts `TaskBriefPlan + UnitKnowledgeMap + UnitSourceWindow` into small per-question briefs.
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.test.js`
  - Verifies question briefs preserve ECD evidence and do not include full article text.
- `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
  - Verifies stage order, scoped inputs, and final assembly.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.js`
  - New schema/validator for drafting MC questions for one unit or a small unit group.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.test.js`
  - Verifies compact MC draft schema and validation.

### Modify

- `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Shrink into a compatibility wrapper around the new program.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Add prompt builder for `multipleChoiceDraftUnitBatch`.
  - Tighten MC prompt around `questionBrief`.
- `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
  - Register the new stage schema and token budget.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
  - Include new schema exports and validation tests.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Assert MC unit-batch prompt uses evidence brief and not full article.
- `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Keep existing behavior tests but point them through the new program.
- `experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
  - Update stage list and signatures to the ideal pyramid.
- `experiments/shibei-v2/docs/v2-prompt-architecture-reference-zh.md`
  - Add final DSPy pyramid architecture section.
- `experiments/shibei-v2/docs/v2-llm-pipeline-technical-framework-zh.md`
  - Clarify DSPy-style means scoped signatures and adapters, not blind stage proliferation.

## Success Metrics

This refactor is successful only if all of these are true:

- `taskBriefPlan` remains first-attempt stable on the golden article.
- `multipleChoiceDraft...` no longer retries due to JSON truncation on the golden article.
- Total token count does not increase materially versus `20260621-193327-v2-compact-task-brief-max6`.
- DMC remains its own unit and receives a high-value matching question.
- MC questions recover expert-like quality:
  - fewer template stems such as “以下哪项/根据所学/关于”;
  - at least one real misconception-bearing distractor;
  - correct option not visibly more complete than the distractors;
  - explanations stay short and fit the answer feedback UI.
- HTML quality report is generated and README records the comparison.

---

### Task 1: Extract A Program Graph Without Changing Behavior

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`

- [ ] **Step 1: Write a stage-order test**

Create `v2GenerationProgram.test.js` with a test that uses a fake prompt caller and records stage names:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { runV2GenerationProgram } from "./v2GenerationProgram.js";

test("runs the V2 pyramid stages in stable order", async () => {
  const calls = [];
  const promptCaller = async (stage) => {
    calls.push(stage);
    return fixtureOutputForStage(stage);
  };

  await runV2GenerationProgram(makeArticleFixture(), { promptCaller, now: "2026-06-21T00:00:00.000Z" });

  assert.deepEqual(calls, [
    "reviewPathPlan",
    "unitKnowledgeMap",
    "taskBriefPlan",
    "multipleChoiceDraftBatch",
    "matchingDraftBatch",
    "unitCopyBatch"
  ]);
});
```

Expected initially: FAIL because `runV2GenerationProgram` does not exist.

- [ ] **Step 2: Create `runV2GenerationProgram` by moving orchestration code**

Move the body of `generateReviewPathV2()` into `runV2GenerationProgram(article, options)`. Keep behavior identical:

```js
export async function runV2GenerationProgram(article, options = {}) {
  // Same implementation currently inside generateReviewPathV2.
}
```

Then make `generateReviewPathV2` a wrapper:

```js
export async function generateReviewPathV2(article, options = {}) {
  return runV2GenerationProgram(article, options);
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all existing tests pass after fixture helpers are wired.

- [ ] **Step 4: Commit checkpoint**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.test.js
git commit -m "refactor(v2): extract generation program graph"
```

### Task 2: Add Deterministic Question Briefs

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`

- [ ] **Step 1: Write tests for compact question briefs**

Create tests that assert each question brief contains only scoped data:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionBriefsByUnit } from "./questionBriefs.js";

test("builds compact question briefs from task plans and micro knowledge", () => {
  const result = buildQuestionBriefsByUnit({
    taskBriefPlan: makeTaskBriefPlanFixture(),
    unitKnowledgeMap: makeUnitKnowledgeMapFixture(),
    unitSourceContexts: new Map([["u1", makeUnitSourceContextFixture()]])
  });

  const brief = result.get("u1").questionBriefs[0];
  assert.equal(brief.questionPlanId, "q-u1-001");
  assert.equal(brief.practiceGoal.target, "理解游戏化的定义和边界");
  assert.deepEqual(brief.evidence.microIds, ["micro-u1-001"]);
  assert.ok(brief.sourceContext.blocks.length <= 8);
  assert.equal(brief.fullArticleText, undefined);
});
```

Expected initially: FAIL because `buildQuestionBriefsByUnit` does not exist.

- [ ] **Step 2: Implement `buildQuestionBriefsByUnit`**

Implement deterministic transformation:

```js
export function buildQuestionBriefsByUnit({ taskBriefPlan, unitKnowledgeMap, unitSourceContexts }) {
  const microByUnit = new Map(
    unitKnowledgeMap.units.map((unit) => [
      unit.unitId,
      new Map(unit.microKnowledgePoints.map((micro) => [micro.microId, micro]))
    ])
  );

  return new Map(taskBriefPlan.units.map((unitPlan) => {
    const goalsById = new Map(unitPlan.practiceGoals.map((goal) => [goal.id, goal]));
    const unitMicro = microByUnit.get(unitPlan.unitId) || new Map();
    const sourceContext = unitSourceContexts.get(unitPlan.unitId);

    return [unitPlan.unitId, {
      unitId: unitPlan.unitId,
      sourceContext,
      questionBriefs: unitPlan.questionPlans.map((questionPlan) => {
        const goal = goalsById.get(questionPlan.practiceGoalId);
        const micros = questionPlan.microIds.map((id) => unitMicro.get(id)).filter(Boolean);
        return {
          questionPlanId: questionPlan.id,
          type: questionPlan.type,
          purpose: questionPlan.purpose,
          relationType: questionPlan.relationType,
          practiceGoal: {
            id: goal?.id,
            kind: goal?.kind,
            target: goal?.target,
            commonMisconception: goal?.commonMisconception
          },
          evidence: {
            microIds: questionPlan.microIds,
            microTitles: micros.map((micro) => micro.title),
            microSummaries: micros.map((micro) => micro.summary),
            evidenceAngles: micros.flatMap((micro) => micro.suggestedEvidenceAngles || [])
          },
          sourceAnchorId: questionPlan.sourceAnchorId
        };
      })
    }];
  }));
}
```

- [ ] **Step 3: Use briefs in the program graph**

After `taskBriefPlan`, build `unitSourceContexts` and `questionBriefsByUnit`. Pass question briefs into draft inputs instead of full practice plans where possible.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.test.js
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [ ] **Step 5: Commit checkpoint**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/questionBriefs.test.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js
git commit -m "feat(v2): build scoped question briefs"
```

### Task 3: Replace All-Unit MC Batch With Scoped MC Unit Batches

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`

- [ ] **Step 1: Write schema tests**

Create `multipleChoiceDraftUnitBatch.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateMultipleChoiceDraftUnitBatchOutput } from "./multipleChoiceDraftUnitBatch.js";

test("validates a scoped unit MC draft batch", () => {
  const errors = validateMultipleChoiceDraftUnitBatchOutput({
    unitId: "u1",
    questions: [
      {
        id: "q-u1-001",
        type: "multiple_choice",
        practiceGoalId: "goal-u1-001",
        stem: "游戏化的核心边界是什么？",
        options: [
          { id: "a", text: "做完整电子游戏" },
          { id: "b", text: "堆积分和徽章" },
          { id: "c", text: "在非游戏情境使用游戏设计元素" },
          { id: "d", text: "让界面看起来有趣" }
        ],
        correctOptionId: "c",
        explanation: "游戏化不是做游戏，而是在非游戏情境中使用游戏设计元素。",
        sourceAnchorId: "anchor-u1"
      }
    ]
  }, {
    unitId: "u1",
    questionPlanIds: new Set(["q-u1-001"]),
    sourceAnchorId: "anchor-u1"
  });

  assert.deepEqual(errors, []);
});
```

- [ ] **Step 2: Implement schema wrapper**

Reuse the existing MC question validation shape, but make the top-level output scoped:

```js
export const MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA = {
  type: "object",
  required: ["unitId", "questions"],
  additionalProperties: false,
  properties: {
    unitId: { type: "string" },
    questions: {
      type: "array",
      items: MULTIPLE_CHOICE_DRAFT_QUESTION_SCHEMA
    }
  }
};
```

- [ ] **Step 3: Add prompt builder**

Add `buildMultipleChoiceDraftUnitBatchMessages({ article, source, unit, questionBriefs })`.

Key rules:

```text
你只负责当前 unit 的选择题。
不要重做知识点规划。
每个 questionBrief 生成一题。
每题必须围绕 practiceGoal.target 和 commonMisconception。
至少一个干扰项必须体现 commonMisconception 或 evidenceAngles 中的混淆点。
不要输出完整 ECD JSON，不要输出 source blocks。
```

- [ ] **Step 4: Register stage in model caller**

Add:

```js
multipleChoiceDraftUnitBatch: {
  schemaName: MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_PROMPT_SCHEMA_NAME,
  schema: MULTIPLE_CHOICE_DRAFT_UNIT_BATCH_OUTPUT_SCHEMA,
  estimatedOutputTokens: 2200
}
```

- [ ] **Step 5: Replace all-unit MC call with scoped calls**

In the program graph:

```js
const multipleChoiceDraftBatches = [];
for (const input of unitDraftInputs) {
  const mcBriefs = questionBriefsByUnit.get(input.unit.id).questionBriefs
    .filter((brief) => brief.type === "multiple_choice");
  if (mcBriefs.length === 0) continue;
  multipleChoiceDraftBatches.push(await callAndValidate(
    activePromptCaller,
    "multipleChoiceDraftUnitBatch",
    {
      article: pickArticleMeta(article),
      source: input.sourceContext.source,
      unit: input.unit,
      questionBriefs: mcBriefs,
      sourceContext: input.sourceContext
    },
    (output) => validateMultipleChoiceDraftUnitBatchOutput(output, {
      unitId: input.unit.id,
      questionPlanIds: new Set(mcBriefs.map((brief) => brief.questionPlanId)),
      sourceAnchorId: input.unit.sourceAnchor?.id
    })
  ));
}
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.test.js
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [ ] **Step 7: Commit checkpoint**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/multipleChoiceDraftUnitBatch.test.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js
git commit -m "feat(v2): draft multiple choice questions from scoped unit briefs"
```

### Task 4: Keep Matching Scoped But Preserve Natural Task Affordance

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraftBatch.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Add a test for 2-4 natural matching pairs**

Add a test ensuring 3-pair DMC matching remains valid:

```js
test("keeps natural three-pair matching for DMC-style relation tasks", async () => {
  const result = await runV2GenerationProgram(makeDmcArticleFixture(), {
    promptCaller: makePromptCallerWithThreePairMatching()
  });
  const matching = result.units.flatMap((unit) => unit.questions).find((q) => q.type === "matching");
  assert.equal(matching.leftItems.length, 3);
  assert.equal(matching.rightItems.length, 3);
  assert.equal(matching.pairs.length, 3);
});
```

- [ ] **Step 2: Ensure matching prompt uses question briefs**

Matching should receive relation-oriented question briefs. It should not receive full all-unit task plans.

- [ ] **Step 3: Run tests**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

- [ ] **Step 4: Commit checkpoint**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/matchingDraftBatch.js \
  experiments/shibei-v2/backend/src/v2/generation/pipeline/v2GenerationProgram.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "fix(v2): preserve natural matching affordance in scoped pipeline"
```

### Task 5: Add Architecture Metrics To Quality Reports

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] **Step 1: Add metrics to JSON report**

Add:

```js
architectureMetrics: {
  stageAttemptSummary,
  modelCallCount,
  totalPromptTokens,
  totalCompletionTokens,
  maxStageCompletionTokens,
  multipleChoiceRetryCount,
  matchingCount,
  averageMcStemLength,
  averageMcOptionLength,
  templateStemPhraseCount
}
```

- [ ] **Step 2: Add HTML report section**

Add a small table titled “Architecture Metrics” showing:

- model calls
- attempts
- retry count by stage
- token totals
- MC batch max completion
- template phrase count

- [ ] **Step 3: Run tests**

Run:

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
npm --prefix experiments/shibei-v2/backend run check
```

- [ ] **Step 4: Commit checkpoint**

```bash
git add experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js
git commit -m "feat(v2): report architecture metrics for quality runs"
```

### Task 6: Run The Golden Article Comparison

**Files:**
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`

- [ ] **Step 1: Run quality experiment**

Run:

```bash
DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
QUALITY_ARTICLE_URL="https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A" \
QUALITY_EXPERIMENT_SLUG="_WY2GXs-iynGePgdsYLi0A" \
QUALITY_EXPERIMENT_LABEL="v2-dspy-pyramid-scoped-mc-max6" \
QUALITY_EXPERIMENT_TIMEOUT_MS=1200000 \
V2_GENERATION_MAX_UNITS=6 \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

- [ ] **Step 2: Compare against the last three runs**

Compare against:

- `20260621-173146-v2-task-brief-plan-max6`
- `20260621-192159-v2-default-deterministic-source-purpose-normalized-max6`
- `20260621-193327-v2-compact-task-brief-max6`

Record:

- question count
- MC / matching count
- retry count by stage
- total tokens
- max completion tokens by stage
- diagnostic issue count
- DMC handling
- visible MC quality notes

- [ ] **Step 3: Update quality README**

Add:

```markdown
## 2026-06-21 DSPy Pyramid Scoped MC Run

### Hypothesis

Scoped MC drafting should reduce JSON truncation while preserving ECD evidence quality.

### Result

| Metric | Compact taskBriefPlan | DSPy pyramid scoped MC |
| --- | ---: | ---: |
| Runtime retries | ... | ... |
| Total tokens | ... | ... |
| MC count | ... | ... |
| Matching count | ... | ... |
| Diagnostic issues | ... | ... |

### Judgment

...
```

- [ ] **Step 4: Commit checkpoint**

```bash
git add experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md \
  experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs \
  experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports
git commit -m "test(v2): record dspy pyramid scoped mc quality run"
```

### Task 7: Update Architecture Documentation

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-prompt-architecture-reference-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-llm-pipeline-technical-framework-zh.md`

- [ ] **Step 1: Update stage contracts**

Replace the current stage overview with the ideal pyramid:

```text
SourceMap deterministic
ReviewPathPlan
UnitKnowledgeMap
TaskBriefPlan
QuestionBriefAdapter
MultipleChoiceDraftUnitBatch
MatchingDraftBatch
UnitCopyBatch
ReviewPathAssembly
QualityDiagnostics
```

- [ ] **Step 2: Add context-scope rules**

Document:

- Full article is only allowed in `reviewPathPlan`.
- Plan union source window is allowed in `unitKnowledgeMap` and `taskBriefPlan`.
- Unit source window is required for all question drafting.
- Deterministic IDs and anchors are adapter-owned.

- [ ] **Step 3: Add quality gate for future changes**

Document that a future prompt change is not accepted unless the quality README shows:

- no new JSON truncation;
- no material token increase;
- no loss of DMC unit / matching behavior;
- no obvious MC distractor regression.

- [ ] **Step 4: Commit checkpoint**

```bash
git add experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md \
  experiments/shibei-v2/docs/v2-prompt-architecture-reference-zh.md \
  experiments/shibei-v2/docs/v2-llm-pipeline-technical-framework-zh.md
git commit -m "docs(v2): define dspy pyramid generation architecture"
```

## Execution Strategy

Use subagents, but not one giant subagent.

- Subagent A: Task 1-2, program graph + question briefs.
- Main agent review checkpoint.
- Subagent B: Task 3-4, scoped MC and matching.
- Main agent review checkpoint.
- Subagent C: Task 5, architecture metrics.
- Main agent runs Task 6 quality experiment and writes judgment.
- Main agent performs Task 7 docs and final review.

## Rollback Strategy

Each task commits independently. If quality drops:

- Keep Task 1-2 if tests pass; they only clarify structure.
- Revert Task 3 if scoped MC worsens quality or increases cost.
- Keep Task 5 metrics if useful even when Task 3 is reverted.
- Never delete the previous quality artifacts; they are comparison baselines.

## Self-Review

- Spec coverage: Covers the ideal DSPy-style pyramid, context narrowing, avoiding repeated full article calls, preserving ECD, improving JSON stability, and quality comparison.
- Placeholder scan: No TBD/fill-later placeholders. Every task has files, commands, expected tests, and commit boundary.
- Type consistency: `QuestionBrief`, `MultipleChoiceDraftUnitBatch`, `TaskBriefPlan`, `UnitKnowledgeMap`, and stage names are consistent across tasks.
