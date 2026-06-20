# Knowledge Object Boundary Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent high-value knowledge objects such as the DMC model from being merged into broader units before ECD planning can generate appropriate evidence tasks.

**Architecture:** Add an internal `knowledgeObjects[]` map to `reviewPathPlan`, then require each generated unit to trace back to one or more knowledge objects. The first implementation strengthens Domain Modeling without changing the SwiftUI-visible review path contract: internal trace fields stay in `generationMeta.reviewPathPlan` and are removed from final `units[]`.

**Tech Stack:** Node.js ESM backend, JSON schema prompt contracts, built-in `node:test`, V2 quality runner, DeepSeek quality experiments.

---

### Task 1: Extend Review Path Plan Schema With Knowledge Objects

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [x] **Step 1: Add a failing validator test**

Add a test that requires:

```js
const plan = reviewPathPlanFixture();
delete plan.knowledgeObjects;
const result = validateReviewPathPlanOutput(plan, { sourceBlockIds: new Set(["p-001"]) });
assert.equal(result.ok, false);
assert.match(result.errors.join("\n"), /knowledgeObjects/);
```

- [x] **Step 2: Add schema fields**

Add required top-level `knowledgeObjects[]` with fields:

```js
required: [
  "id",
  "title",
  "nodeLabel",
  "knowledgeShape",
  "roleInArticle",
  "sourceBlockIds",
  "boundaryDecision",
  "boundaryReason"
]
```

Add required unit field:

```js
sourceKnowledgeObjectIds: {
  type: "array",
  items: { type: "string" }
}
```

- [x] **Step 3: Add validation**

Rules:

- `knowledgeObjects` must be non-empty.
- `knowledgeObjects[].sourceBlockIds[]` must reference known source blocks.
- `units[].sourceKnowledgeObjectIds[]` must reference existing knowledge object ids.
- A unit must not combine multiple knowledge objects whose `boundaryDecision` is `standalone_unit`.

### Task 2: Strengthen Review Path Prompt

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Add a prompt test**

Assert the review path prompt mentions:

```text
knowledgeObjects
先列知识对象，再决定 unit
standalone_unit
DMC 模型
不能把相关但独立的知识对象合并
```

- [x] **Step 2: Update prompt contract**

Add clear Domain Modeling rules:

- First list knowledge objects.
- Distinguish related-but-independent objects from mergeable fragments.
- `layered_framework`, `process_steps`, `type_set`, and `boundary_rule` should usually be standalone if they have their own evidence and likely task.
- DMC model is an example of a standalone layered framework, not a detail inside the definition of gamification.
- Units derive from knowledge objects; every unit must list `sourceKnowledgeObjectIds`.

### Task 3: Keep Internal Boundary Fields Out Of Final SwiftUI Units

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [x] **Step 1: Add a test**

Assert final units do not expose:

```js
assert.equal(reviewPath.units[0].sourceKnowledgeObjectIds, undefined);
assert.equal(reviewPath.generationMeta.reviewPathPlan.knowledgeObjects.length, 1);
```

- [x] **Step 2: Store plan in generationMeta**

Add:

```js
generationMeta: {
  reviewPathPlan: stripArticlePlanForMetadata(plan),
  ...
}
```

- [x] **Step 3: Strip internal fields when building units**

Add a helper:

```js
function stripInternalPlannedUnitFields(unit) {
  const { sourceKnowledgeObjectIds, ...publicUnit } = unit;
  return publicUnit;
}
```

Use it before returning final `unit`.

### Task 4: Run Tests And Quality Comparison

**Files:**
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run focused tests**

```bash
node --test experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
```

- [x] **Step 2: Run full check**

```bash
npm --prefix experiments/shibei-v2/backend run check
```

- [x] **Step 3: Run the same article**

Use the same gamification article and a label such as:

```bash
v2-knowledge-object-boundary-max6
```

- [x] **Step 4: Compare three runs**

Compare:

- `20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized`
- `20260620-175013-v2-ecd-driven-planning-max6-schema-items`
- New `v2-knowledge-object-boundary-max6` run

Check:

- Whether DMC is an independent unit again.
- Whether DMC has a matching task.
- Whether `knowledgeObjects[]` explains why DMC is standalone.
- Whether final SwiftUI units remain contract-valid.

### Task 5: Document Result

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-prompt-architecture-refactor-plan-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Record the architectural lesson**

Write that ECD downstream drive is not enough if Domain Modeling can merge independent knowledge objects.

- [x] **Step 2: Record the new contract**

Write that `reviewPathPlan.knowledgeObjects[]` is internal and `unit.sourceKnowledgeObjectIds[]` is a trace field, not a SwiftUI-visible field.

- [x] **Step 3: Record quality outcome**

Record whether the new run improves over both prior runs.
