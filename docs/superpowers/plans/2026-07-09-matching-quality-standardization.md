# Matching Quality Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make matching question quality diagnosable and improve weak relation matching without adding another model stage.

**Architecture:** Keep the existing `matchingDraft` stage and add deterministic diagnostics around relation quality. Then tighten the matching prompt so generated pairs express roles, boundaries, timing, effects, verification dimensions, or process signals instead of term-definition cards.

**Tech Stack:** Node.js V2 generation pipeline, deterministic quality guardrails, HTML quality reports, Node test runner.

---

### Task 1: Standardize Matching Diagnostics

**Files:**
- Modify: `backend/src/v2/generation/qualityGuardrails.js`
- Modify: `backend/src/v2/generation/tests/v2QualityExperiment.js`
- Test: `backend/src/v2/generation/qualityGuardrails.test.js`
- Test: `backend/src/v2/generation/tests/v2QualityExperiment.test.js`

- [ ] Add `checks.matchingQuality` for matching questions.
- [ ] Record pair count, weak stem status, generic right-item count, short right-item count, relation signal hits, and item text lengths.
- [ ] Keep the current `v2_weak_matching_relation` issue code but source it from `matchingQuality.status`.
- [ ] Render matching diagnostics in the HTML report.
- [ ] Add tests for weak term-definition matching and passing role/responsibility matching.
- [ ] Commit as `feat: standardize matching quality diagnostics`.

### Task 2: Tighten Matching Prompt Rules

**Files:**
- Modify: `backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] Add a shared `matchingRelationQualityRules()` prompt block.
- [ ] Apply it to `matchingDraftBatch` and `matchingDraft`.
- [ ] Require right-side items to be responsibilities, purposes, conditions, boundaries, effects, checks, or next actions.
- [ ] Explicitly reject generic right-side labels such as "定义", "描述", "解释", "特征", "概念", and "案例".
- [ ] Keep visible text limits unchanged.
- [ ] Commit as `fix: tighten matching relation prompt cues`.

### Task 3: Verification and Regression Review

**Files:**
- Generated: `docs/quality-runs/video-link/bilibili-feynman-agent/runs/*.json`
- Generated: `docs/quality-runs/video-link/bilibili-feynman-agent/reports/*.html`

- [ ] Run focused tests for guardrails, prompt messages, and V2 quality reports.
- [ ] Run `npm --prefix backend run check:v2`.
- [ ] Run `npm --prefix backend run check:video-source`.
- [ ] Re-run the Bilibili Agent video regression with the same URL and keys.
- [ ] Compare the new run against the three prior runs on matching diagnostics, option diagnostics, model call count, tokens, and cost.
