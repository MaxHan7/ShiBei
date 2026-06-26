# Task Brief Plan Slimming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `taskBriefPlan` JSON output smaller and more stable without increasing model-call count or weakening ECD-driven task planning.

**Architecture:** Keep one batched `taskBriefPlan` call, but move deterministic fields out of model output. The model emits semantic choices only: goal kind, target, misconception, microIds, question type, purpose, goalIndex, and relationType when needed. A deterministic adapter fills stable ids, `practiceGoalId`, and `sourceAnchorId` before validation.

**Tech Stack:** Node.js, project-local prompt schema validators, V2 quality runner, DeepSeek quality experiment.

---

### Task 1: Add Compact Task Brief Normalization

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/taskBriefPlan.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`

- [ ] **Step 1: Write tests for compact model output**

Add a test where model output omits `id`, `sourceAnchorId`, and `practiceGoalId`, but includes `goalIndex` on question plans.

- [ ] **Step 2: Implement deterministic field hydration**

Update `normalizeTaskBriefPlanOutput(output, { sourceAnchorByUnit })` so each unit gets stable goal ids, question ids, source anchors, and practice goal references.

- [ ] **Step 3: Keep full contract validation unchanged**

After normalization, `validateTaskBriefPlanOutput` should still validate the hydrated full contract consumed by downstream stages.

### Task 2: Slim the Model-Facing Schema and Prompt

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/taskBriefPlan.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/modelPromptCaller.test.js`

- [ ] **Step 1: Remove deterministic required fields from the model-facing schema**

`practiceGoals` no longer require `id` or `sourceAnchorId`; `questionPlans` no longer require `id`, `practiceGoalId`, or `sourceAnchorId`.

- [ ] **Step 2: Add `goalIndex` to question plans**

`goalIndex` is a 1-based integer pointing to the practice goal in the same unit.

- [ ] **Step 3: Update the prompt**

Tell the model not to output stable ids or source anchors. It should output compact semantic plans only.

### Task 3: Wire Normalization Through Generation

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`

- [ ] **Step 1: Pass `sourceAnchorByUnit` into the task brief normalizer**

Change the `callAndValidate` normalize option to `normalizeTaskBriefPlanOutput(output, { sourceAnchorByUnit: unitSourceAnchorIds })`.

- [ ] **Step 2: Add a generation test for compact task brief output**

Mock `taskBriefPlan` with compact fields only, then assert downstream question generation still receives full hydrated practice plans.

### Task 4: Validate and Rerun the Golden Article

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`
- Create: quality run JSON/HTML artifacts.

- [ ] **Step 1: Run backend checks**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: all tests pass.

- [ ] **Step 2: Run the same golden article quality experiment**

Run the V2 quality runner with label `v2-compact-task-brief-max6`.

- [ ] **Step 3: Compare against the previous run**

Compare retry count, taskBriefPlan completion tokens, total tokens, question count, matching count, and diagnostics.

- [ ] **Step 4: Record the result**

Append a short experiment record to the article README.
