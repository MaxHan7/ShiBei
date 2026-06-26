# V2 Context Passing Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce repeated input tokens and JSON instability in the V2 generation pipeline by passing only the source/context each stage actually needs.

**Architecture:** Keep the current ECD direction and visible frontend contract unchanged. Add a source-context selection layer between `sourceMap` and per-unit stages so whole-article context is used only where it is genuinely needed, while `ecdPlanning`、question drafting、unit summary drafting receive compact current-unit context. Keep `qualityJudge` out of the main chain; this plan optimizes context passing, not question-quality gating.

**Tech Stack:** Node.js ESM, `node:test`, existing V2 backend prompt/schema modules, V2 quality runner HTML/JSON reports.

---

## Current Diagnosis

The latest successful run after `reviewPathPlan` slimming is:

- Report: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/20260621-122718-v2-slim-review-plan-max6-rerun.html`
- Result: 6 units, 14 questions, 9 multiple-choice, 5 matching.
- Good sign: DMC is preserved as an independent unit and matching appears again.
- Remaining waste: per-unit stages still receive `sourceMap.blocks` for the whole article.

The most important code paths are:

- `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - `unitKnowledgeMap` currently receives `{ article, source, blocks: sourceMap.blocks, plan }`.
  - each `ecdPlanning` call currently receives `{ article, source, blocks: sourceMap.blocks, plan: singleUnitPlan, unitKnowledgeMap }`.
  - `multipleChoiceDraft`、`matchingDraft`、`unitSummaryDraft` also receive full `sourceMap.blocks`.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - every prompt renders `renderSource(source, blocks)`, so whatever blocks are passed become model input tokens.
- `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - the report renders full source anchor text, which is useful for audit but noisy for daily quality review.

The next slimming target is therefore:

```text
reviewPathPlan may read the full source.
unitKnowledgeMap should read only the union of planned unit anchors plus a small local window.
ecdPlanning / question draft / unit summary should read only current-unit source context.
HTML reports should keep full source expandable, but show a short preview by default.
```

## File Structure

- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.js`
  - Owns deterministic block-window selection.
  - Exports `buildUnitSourceContext()` and `buildPlanSourceContext()`.

- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.test.js`
  - Tests anchor block selection, local window radius, deduplication, ordering, and fallback.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Uses source-context helpers before `unitKnowledgeMap` and all per-unit stages.
  - Adds optional `generationMeta.sourceContextStats` so we can compare full block count vs passed block count.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Verifies per-unit model calls receive compact source blocks, not whole article blocks.
  - Verifies context stats are present and deterministic.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Keep the prompt builders unchanged in behavior, but make `renderSource()` show a short context note when payload includes `sourceContextNote`.
  - Do not add new quality instructions.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Verifies source context notes render and prompt does not require full article source in per-unit stages.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
  - Make source anchors collapsed/previewed by default in HTML.
  - Show `sourceContextStats` near model usage.

- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`
  - Verifies the source anchor report keeps full text in `<details>` but only previews it in the main view.

- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
  - Records this optimization and compares timings/output quality with the latest run.

---

### Task 1: Add Deterministic Source Context Helpers

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.test.js`

- [ ] **Step 1: Write source context tests**

Create `sourceContext.test.js` with these cases:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlanSourceContext,
  buildUnitSourceContext
} from "./sourceContext.js";

const BLOCKS = Array.from({ length: 8 }, (_, index) => ({
  id: `p-${String(index + 1).padStart(3, "0")}`,
  type: "paragraph",
  text: `段落 ${index + 1}`
}));

test("buildUnitSourceContext selects anchor blocks with one-neighbor window", () => {
  const unit = {
    id: "unit-01",
    sourceAnchor: { id: "anchor-unit-01", blockIds: ["p-003", "p-004"] }
  };

  const context = buildUnitSourceContext({ source: { title: "T" }, blocks: BLOCKS }, unit, {
    radius: 1
  });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-002", "p-003", "p-004", "p-005"]);
  assert.equal(context.sourceContextNote.anchorId, "anchor-unit-01");
  assert.deepEqual(context.sourceContextNote.anchorBlockIds, ["p-003", "p-004"]);
  assert.equal(context.sourceContextNote.fullBlockCount, 8);
  assert.equal(context.sourceContextNote.selectedBlockCount, 4);
});

test("buildUnitSourceContext deduplicates blocks and preserves original order", () => {
  const unit = {
    id: "unit-02",
    sourceAnchor: { id: "anchor-unit-02", blockIds: ["p-004", "p-003", "p-003"] }
  };

  const context = buildUnitSourceContext({ source: {}, blocks: BLOCKS }, unit, { radius: 0 });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-003", "p-004"]);
});

test("buildUnitSourceContext falls back to first blocks when anchor is missing", () => {
  const unit = {
    id: "unit-03",
    sourceAnchor: { id: "anchor-unit-03", blockIds: ["missing"] }
  };

  const context = buildUnitSourceContext({ source: {}, blocks: BLOCKS }, unit, {
    radius: 1,
    fallbackBlockCount: 3
  });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-001", "p-002", "p-003"]);
  assert.equal(context.sourceContextNote.fallbackUsed, true);
});

test("buildPlanSourceContext selects union of all unit windows", () => {
  const plan = {
    units: [
      { id: "unit-01", sourceAnchor: { id: "a1", blockIds: ["p-002"] } },
      { id: "unit-02", sourceAnchor: { id: "a2", blockIds: ["p-006"] } }
    ]
  };

  const context = buildPlanSourceContext({ source: {}, blocks: BLOCKS }, plan, { radius: 1 });

  assert.deepEqual(context.blocks.map((block) => block.id), ["p-001", "p-002", "p-003", "p-005", "p-006", "p-007"]);
  assert.equal(context.sourceContextNote.selectedUnitCount, 2);
});
```

- [ ] **Step 2: Implement `sourceContext.js`**

Create `sourceContext.js`:

```js
export function buildUnitSourceContext(
  sourceMap,
  unit,
  { radius = 1, fallbackBlockCount = 6 } = {}
) {
  const blocks = Array.isArray(sourceMap?.blocks) ? sourceMap.blocks : [];
  const blockIds = Array.isArray(unit?.sourceAnchor?.blockIds) ? unit.sourceAnchor.blockIds : [];
  const selectedIndexes = indexesForBlockIds(blocks, blockIds, radius);
  const fallbackUsed = selectedIndexes.length === 0;
  const finalIndexes = fallbackUsed
    ? Array.from({ length: Math.min(fallbackBlockCount, blocks.length) }, (_, index) => index)
    : selectedIndexes;

  const selectedBlocks = finalIndexes.map((index) => blocks[index]).filter(Boolean);
  return {
    source: sourceMap?.source || {},
    blocks: selectedBlocks,
    sourceContextNote: {
      mode: "unit_window",
      unitId: unit?.id || "",
      anchorId: unit?.sourceAnchor?.id || "",
      anchorBlockIds: blockIds,
      radius,
      fallbackUsed,
      fullBlockCount: blocks.length,
      selectedBlockCount: selectedBlocks.length
    }
  };
}

export function buildPlanSourceContext(sourceMap, plan, { radius = 1, fallbackBlockCount = 10 } = {}) {
  const blocks = Array.isArray(sourceMap?.blocks) ? sourceMap.blocks : [];
  const units = Array.isArray(plan?.units) ? plan.units : [];
  const selected = new Set();

  for (const unit of units) {
    for (const index of indexesForBlockIds(blocks, unit?.sourceAnchor?.blockIds || [], radius)) {
      selected.add(index);
    }
  }

  const fallbackUsed = selected.size === 0;
  const finalIndexes = fallbackUsed
    ? Array.from({ length: Math.min(fallbackBlockCount, blocks.length) }, (_, index) => index)
    : Array.from(selected).sort((a, b) => a - b);
  const selectedBlocks = finalIndexes.map((index) => blocks[index]).filter(Boolean);

  return {
    source: sourceMap?.source || {},
    blocks: selectedBlocks,
    sourceContextNote: {
      mode: "plan_union_window",
      selectedUnitCount: units.length,
      radius,
      fallbackUsed,
      fullBlockCount: blocks.length,
      selectedBlockCount: selectedBlocks.length
    }
  };
}

function indexesForBlockIds(blocks, blockIds, radius) {
  const idToIndex = new Map(blocks.map((block, index) => [block.id, index]));
  const selected = new Set();

  for (const id of blockIds) {
    const index = idToIndex.get(id);
    if (!Number.isInteger(index)) continue;
    const start = Math.max(0, index - radius);
    const end = Math.min(blocks.length - 1, index + radius);
    for (let current = start; current <= end; current += 1) {
      selected.add(current);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}
```

- [ ] **Step 3: Run focused test**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/sourceContext.test.js
```

Expected: PASS.

### Task 2: Use Slim Context In The Generation Pipeline

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Add a failing test for per-unit compact blocks**

In `generateReviewPathV2.test.js`, extend the existing compact-context test or add a new one:

```js
test("passes unit source window instead of full article blocks to per-unit stages", async () => {
  const captured = [];
  const promptCaller = async (stage, payload) => {
    if (["ecdPlanning", "multipleChoiceDraft", "unitSummaryDraft"].includes(stage)) {
      captured.push({ stage, blockIds: payload.blocks.map((block) => block.id), note: payload.sourceContextNote });
    }
    return happyPathPromptCaller(stage, payload);
  };

  await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller,
    unitConcurrency: 1,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.ok(captured.length > 0);
  for (const item of captured) {
    assert.equal(item.note.mode, "unit_window");
    assert.ok(item.blockIds.length < 10);
  }
});
```

The exact `< 10` threshold can be adjusted to fit the fixture block count; the invariant is that per-unit stages do not get all source blocks when anchors exist.

- [ ] **Step 2: Import source context helpers**

In `generateReviewPathV2.js`, add:

```js
import {
  buildPlanSourceContext,
  buildUnitSourceContext
} from "./sourceContext.js";
```

- [ ] **Step 3: Use plan context for `unitKnowledgeMap`**

Replace:

```js
{ article, source: sourceMap.source, blocks: sourceMap.blocks, plan }
```

with:

```js
const planSourceContext = buildPlanSourceContext(sourceMap, plan, { radius: 1 });

{
  article,
  source: planSourceContext.source,
  blocks: planSourceContext.blocks,
  sourceContextNote: planSourceContext.sourceContextNote,
  plan
}
```

- [ ] **Step 4: Use unit context for `ecdPlanning`**

Inside the `mapWithConcurrency(plan.units, ...)` callback, build:

```js
const unitSourceContext = buildUnitSourceContext(sourceMap, plannedUnit, { radius: 1 });
```

Pass:

```js
{
  article,
  source: unitSourceContext.source,
  blocks: unitSourceContext.blocks,
  sourceContextNote: unitSourceContext.sourceContextNote,
  plan: buildSingleUnitPlan(plan, plannedUnit),
  unitKnowledgeMap: buildSingleUnitKnowledgeMap(unitKnowledgeMap, plannedUnit.id)
}
```

- [ ] **Step 5: Use unit context for draft and summary stages**

In `generateUnitReviewContent()`, compute:

```js
const unitSourceContext = buildUnitSourceContext(sourceMap, plannedUnit, { radius: 1 });
```

Then pass `source: unitSourceContext.source`, `blocks: unitSourceContext.blocks`, and `sourceContextNote: unitSourceContext.sourceContextNote` to:

- `multipleChoiceDraft`
- `matchingDraft`
- `unitSummaryDraft`

- [ ] **Step 6: Add `sourceContextStats` to metadata**

When building `draftReviewPath.generationMeta`, add:

```js
sourceContextStats: {
  fullBlockCount: sourceMap.blocks.length,
  unitKnowledgeMapBlockCount: planSourceContext.blocks.length,
  unitWindows: plan.units.map((unit) => {
    const context = buildUnitSourceContext(sourceMap, unit, { radius: 1 });
    return {
      unitId: unit.id,
      selectedBlockCount: context.blocks.length,
      anchorBlockIds: context.sourceContextNote.anchorBlockIds
    };
  })
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js --test-name-pattern "source window|compact current-unit context"
```

Expected: PASS.

### Task 3: Make Prompt Source Context Explicit

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] **Step 1: Update prompt renderer signature**

Change `renderSource(source, blocks = [])` to:

```js
function renderSource(source, blocks = [], sourceContextNote = null) {
  return [
    sourceContextNote
      ? `sourceContext:\n${JSON.stringify(sourceContextNote, null, 2)}`
      : "",
    `source:\n${JSON.stringify(source || {}, null, 2)}`,
    `blocks:\n${JSON.stringify(blocks, null, 2)}`
  ].filter(Boolean).join("\n");
}
```

- [ ] **Step 2: Thread `sourceContextNote` through relevant builders**

For these builders, destructure `sourceContextNote` and call `renderSource(source, blocks, sourceContextNote)`:

- `buildUnitKnowledgeMapMessages`
- `buildEcdPlanningMessages`
- `buildMultipleChoiceDraftMessages`
- `buildMatchingDraftMessages`
- `buildUnitSummaryDraftMessages`

Keep `buildReviewPathPlanMessages` as full-source capable; it may call `renderSource(source, blocks)` without a note.

- [ ] **Step 3: Add prompt test**

In `buildV2PromptMessages.test.js`, add:

```js
test("per-unit prompt renders source context note", () => {
  const messages = buildV2PromptMessages("ecdPlanning", {
    article: articleFixture(),
    source: { title: "文章标题" },
    blocks: [{ id: "p-002", type: "paragraph", text: "局部段落" }],
    sourceContextNote: {
      mode: "unit_window",
      unitId: "unit-01",
      anchorId: "anchor-unit-01",
      anchorBlockIds: ["p-002"],
      radius: 1,
      fallbackUsed: false,
      fullBlockCount: 20,
      selectedBlockCount: 1
    },
    plan: singleUnitPlanFixture(),
    unitKnowledgeMap: unitKnowledgeMapFixture()
  });

  assert.match(messages.user, /sourceContext/);
  assert.match(messages.user, /unit_window/);
  assert.match(messages.user, /fullBlockCount/);
});
```

- [ ] **Step 4: Run prompt tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: PASS.

### Task 4: Reduce HTML Report Noise Without Losing Auditability

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] **Step 1: Add preview helper**

In `v2QualityExperiment.js`, add:

```js
function previewText(text, maxLength = 180) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}
```

- [ ] **Step 2: Change `renderSourceBlock()` to preview by default**

Replace current `renderSourceBlock()` with:

```js
function renderSourceBlock(block, highlighted) {
  const text = String(block?.text || "");
  return `<div class="source-block ${highlighted ? "highlight" : ""}">
    <strong>${escapeHtml(block.id)} · ${escapeHtml(block.type)}</strong>
    <div>${escapeHtml(previewText(text))}</div>
    ${text.length > 180 ? `<details><summary>查看完整原文片段</summary><div>${escapeHtml(text)}</div></details>` : ""}
  </div>`;
}
```

- [ ] **Step 3: Show context stats in report**

Near model usage or report metadata, render:

```js
function renderSourceContextStats(stats) {
  if (!stats) return "";
  return `<section class="card">
    <h2 style="margin-top:0">Source Context 瘦身</h2>
    <p><span class="tag">full blocks</span>${escapeHtml(stats.fullBlockCount || 0)}</p>
    <p><span class="tag">unitKnowledgeMap blocks</span>${escapeHtml(stats.unitKnowledgeMapBlockCount || 0)}</p>
    <details>
      <summary>unit windows</summary>
      <pre>${escapeHtml(JSON.stringify(stats.unitWindows || [], null, 2))}</pre>
    </details>
  </section>`;
}
```

Call it from `renderV2QualityReportHtml(report)` using:

```js
renderSourceContextStats(chapter.generationMeta?.sourceContextStats)
```

- [ ] **Step 4: Add report test**

In `v2QualityExperiment.test.js`, add a fixture with a long source block and assert:

```js
assert.match(html, /查看完整原文片段/);
assert.match(html, /Source Context 瘦身/);
assert.match(html, /unitKnowledgeMap blocks/);
```

- [ ] **Step 5: Run report tests**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/tests/v2QualityExperiment.test.js
```

Expected: PASS.

### Task 5: Full Test And Quality Rerun

**Files:**
- Modify after run: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`

- [ ] **Step 1: Run full backend check**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

- [ ] **Step 2: Run a max1 smoke quality test**

Run with the DeepSeek key supplied in the shell environment, not committed to files:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=1 \
V2_GENERATION_UNIT_CONCURRENCY=1 \
QUALITY_EXPERIMENT_TIMEOUT_MS=240000 \
QUALITY_EXPERIMENT_SLUG=_WY2GXs-iynGePgdsYLi0A \
QUALITY_EXPERIMENT_LABEL=v2-source-context-window-max1 \
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected:

- `reviewPathPlan` still succeeds.
- `unitKnowledgeMap` receives fewer blocks than the full source when anchors are available.
- `ecdPlanning` no longer receives the whole article.
- JSON parse failure does not increase.

- [ ] **Step 3: Run a max6 comparison test**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=6 \
V2_GENERATION_UNIT_CONCURRENCY=3 \
QUALITY_EXPERIMENT_TIMEOUT_MS=360000 \
QUALITY_EXPERIMENT_SLUG=_WY2GXs-iynGePgdsYLi0A \
QUALITY_EXPERIMENT_LABEL=v2-source-context-window-max6 \
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected quality comparison against `20260621-122718-v2-slim-review-plan-max6-rerun`:

- DMC remains an independent unit.
- DMC still gets at least one matching question.
- Total question count remains in the same general range; a small difference is acceptable, but collapse to 2-4 questions is not acceptable.
- Source context stats appear in the HTML report.

- [ ] **Step 4: Update quality README**

Add a new entry with:

```markdown
### 2026-06-21 — Source context window slimming

- Change: per-unit stages now receive anchor-window source context instead of full article blocks.
- Baseline: `20260621-122718-v2-slim-review-plan-max6-rerun`.
- Smoke result: `<max1 report name>`.
- Max6 result: `<max6 report name>`.
- Context stats: full block count `<n>`, unitKnowledgeMap block count `<n>`, per-unit window counts `<...>`.
- Quality conclusion: `<preserved / degraded / improved>`.
- Next action: `<...>`.
```

### Task 6: Commit The Slimming Iteration

**Files:**
- Stage all files modified by Tasks 1-5.

- [ ] **Step 1: Confirm no secret key was written**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
rg -n "sk-[a-zA-Z0-9]" experiments/shibei-v2 docs/superpowers || true
```

Expected: no real API key appears in tracked files.

- [ ] **Step 2: Review changed files**

Run:

```bash
git status --short
git diff --stat
```

Expected: only V2 backend, quality docs, and this plan changed.

- [ ] **Step 3: Commit**

Run:

```bash
git add \
  experiments/shibei-v2/backend/src/v2/generation/sourceContext.js \
  experiments/shibei-v2/backend/src/v2/generation/sourceContext.test.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js \
  experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.test.js \
  experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md \
  docs/superpowers/plans/2026-06-21-v2-context-passing-slimming.md
git commit -m "refactor(v2): slim source context passing"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: This plan addresses continued slimming, removes repeated full-article context from per-unit stages, improves input token usage, and keeps core ECD structure intact.
- Not in scope: It does not change question-quality strategy, add a rewrite reviewer, or re-enable `qualityJudge`.
- Risk: If context windows are too narrow, some questions may lose necessary source evidence. The max6 comparison test explicitly checks for DMC preservation and matching retention.
- Rollback: Revert the final commit or return to `56b4b8b refactor(v2): slim review path planning stage`.
