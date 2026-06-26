# V2 Output Budget Slim Checkpoint

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans if this plan is resumed by another worker.

**Goal:** Improve structured-output stability and reduce unnecessary output room without changing prompt rules, schema shape, ECD design principles, or question-generation behavior.

**Architecture:** Keep the current DSPy-style pyramid. This checkpoint only tunes per-stage `estimatedOutputTokens` using the latest successful run as evidence.

**Baseline:** `20260624-044937-v2-unit-copy-slim`

| Stage | Baseline max completion | Previous budget | New budget | Rationale |
| --- | ---: | ---: | ---: | --- |
| `reviewPathPlan` | 1,762 | 3,200 | 2,600 | Single whole-article plan, keep generous margin. |
| `unitKnowledgeMap` | 1,411 | 1,800 | 1,700 | Per-unit map, keep near previous budget. |
| `taskBriefPlan` | 1,713 | 3,800 | 3,800 | Restored after first validation run caused JSON retries. |
| `multipleChoiceDraftUnitBatch` | 1,602 | 2,200 | 1,900 | Per-unit choice drafts, keep room for 2-3 questions. |
| `matchingDraftBatch` | 3,867 | 5,200 | 4,600 | Whole-chapter matching still needs broader room. |
| `unitCopyBatch` | 938 | 2,400 | 1,400 | Copy stage is compact after prior slimming. |

## Tasks

- [x] Update `modelPromptCaller.js` stage budgets.
- [x] Run focused tests for model prompt caller and V2 pipeline.
- [x] Run full backend check.
- [x] Run same-article quality experiment with label `v2-output-budget-slim`.
- [x] Run corrected same-article quality experiment with label `v2-output-budget-slim-taskbrief-restored`.
- [x] Compare against `v2-unit-copy-slim`.
- [x] Keep only if structured-output stability does not regress and question quality remains usable.

## Acceptance Criteria

- Runtime retry/failure counts stay at or near zero.
- No obvious truncation or missing required fields.
- Total token count should not increase meaningfully.
- Visible question quality should remain at least comparable to `v2-unit-copy-slim`.

## Interim Result

The first `v2-output-budget-slim` run completed, but it should not be kept as-is:

- `runtimeRetryAttemptCount`: `0 -> 2`
- retry stage: `taskBriefPlan`
- total tokens: `113,156 -> 127,390`

Conclusion: reducing `taskBriefPlan` from `3800` to `2500` was too aggressive. The corrected checkpoint restores `taskBriefPlan` to `3800` and keeps only the lower-risk budget reductions in `reviewPathPlan`, `unitKnowledgeMap`, `multipleChoiceDraftUnitBatch`, `matchingDraftBatch`, and `unitCopyBatch`.

## Corrected Result

The corrected `v2-output-budget-slim-taskbrief-restored` run completed cleanly:

| Metric | `v2-unit-copy-slim` | `v2-output-budget-slim-taskbrief-restored` |
| --- | ---: | ---: |
| Units | 8 | 8 |
| Questions | 23 | 20 |
| Multiple choice | 16 | 13 |
| Matching | 7 | 7 |
| Runtime failed attempts | 0 | 0 |
| Runtime retry attempts | 0 | 0 |
| Model calls | 27 | 27 |
| Prompt tokens | 78,960 | 83,226 |
| Completion tokens | 34,196 | 31,916 |
| Total tokens | 113,156 | 115,142 |
| Diagnostic issue count | 1 | 0 |

Stage comparison:

| Stage | Baseline total | Corrected total | Notes |
| --- | ---: | ---: | --- |
| `reviewPathPlan` | 11,908 | 12,226 | Similar; budget reduction did not reduce actual output. |
| `unitKnowledgeMap` | 23,355 | 24,324 | Similar; stable. |
| `taskBriefPlan` | 32,118 | 34,043 | Restored budget; stable, no retries. |
| `multipleChoiceDraftUnitBatch` | 27,257 | 25,070 | Lower completion tokens; stable. |
| `matchingDraftBatch` | 14,271 | 15,493 | Similar; stable. |
| `unitCopyBatch` | 4,247 | 3,986 | Slightly lower. |

Decision: keep the corrected budget guardrail as a small, low-risk stability change, but do not claim it as a major cost win. The useful learning is more important:

- Do not reduce `taskBriefPlan` budget aggressively.
- Output-budget tuning alone cannot solve cost; structural scoping still matters more.
- The next meaningful optimization should target stage input shape or stage decomposition, not further global budget cuts.
