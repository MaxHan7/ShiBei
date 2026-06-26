# V2 LLM Pipeline Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the V2 ECD/DSPy-style prompt architecture into concrete backend checkpoints without creating the long-term skill yet.

**Architecture:** First document the stage signatures so every model call has a clear responsibility. Then slim context passing so downstream stages receive only the source window they need. Finally rerun the same golden article and record whether stability, token usage, and quality improve.

**Tech Stack:** Node.js ESM, `node:test`, existing V2 backend generation modules, V2 quality experiment runner, Markdown architecture docs.

---

## Scope

This plan executes only the first three next steps from the technical framework review:

1. Add the V2 LLM stage contract document.
2. Implement source/context passing slimming.
3. Run and record same-article golden comparison.

The fourth step, turning the framework into a reusable Codex skill, is explicitly out of scope for this pass.

## Checkpoint 1: Stage Contracts

**Files:**
- Create: `experiments/shibei-v2/docs/v2-llm-stage-contracts-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-llm-pipeline-technical-framework-zh.md`

- [ ] Write a stage contract document covering each active V2 model stage:
  - `sourceMap`
  - `reviewPathPlan`
  - `unitKnowledgeMap`
  - `ecdPlanning`
  - deterministic `unitPracticePlan` adapter
  - `multipleChoiceDraft`
  - `matchingDraft`
  - `unitSummaryDraft`
  - deterministic diagnostics / optional future judge

- [ ] For each stage, record:
  - signature
  - input contract
  - source context policy
  - output contract
  - forbidden responsibilities
  - schema/prompt/validator file
  - key metrics and failure policy

- [ ] Link the contract document from the technical framework document.

- [ ] Run a documentation sanity check:

```bash
rg -n "v2-llm-stage-contracts|source context|qualityJudge" experiments/shibei-v2/docs
```

Expected: the new contract is discoverable and states `qualityJudge` is not in the default main chain.

## Checkpoint 2: Source Context Slimming

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/sourceContext.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Modify: `experiments/shibei-v2/backend/src/v2/generation/tests/v2QualityExperiment.js`

- [ ] Add deterministic source-window helpers:
  - `buildUnitSourceContext(sourceMap, unit, options)`
  - `buildPlanSourceContext(sourceMap, plan, options)`

- [ ] Cover source-window behavior with `node:test`:
  - anchor selection
  - neighbor radius
  - dedupe and original order
  - fallback when anchors are missing
  - plan-level union context

- [ ] Wire source windows into the pipeline:
  - `reviewPathPlan` keeps full source blocks.
  - `unitKnowledgeMap` receives plan-union source context.
  - `ecdPlanning`, `multipleChoiceDraft`, `matchingDraft`, and `unitSummaryDraft` receive current-unit source context.

- [ ] Add `generationMeta.sourceContextStats`:
  - full block count
  - plan-context block count
  - each unit window block count
  - selected block ids
  - fallback flag

- [ ] Render source-context notes in prompts so the model knows it is seeing a selected source window, not the full article.

- [ ] Update HTML quality reports to show source context stats and make long source blocks easier to audit.

- [ ] Run focused and full backend checks:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
node --test src/v2/generation/sourceContext.test.js
npm run check
```

Expected: both commands pass.

## Checkpoint 3: Golden Article Comparison

**Files:**
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [ ] Run the same golden article with the same V2 quality runner configuration used in the latest comparison.

- [ ] Save JSON and HTML report under:

```text
experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/
```

- [ ] Compare against the last successful slim run:
  - unit count
  - question count
  - matching count
  - JSON retry/failure count
  - token usage if provider usage is available
  - source context stats

- [ ] Update the quality-run README with the conclusion:
  - whether source-context slimming preserved DMC and matching quality
  - whether prompt input got smaller
  - whether further splitting is still needed

## Self Review

- [ ] No changes outside `experiments/shibei-v2/` and `docs/superpowers/plans/`.
- [ ] No API keys or secrets written to files.
- [ ] `qualityJudge` remains optional/diagnostic and not part of the default main chain.
- [ ] The source-window change does not alter the frontend V2 contract.
- [ ] The golden comparison uses the same article before moving to multi-article testing.
