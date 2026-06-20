# V2 Quality Run: _WY2GXs-iynGePgdsYLi0A

## Source

- Title: 基于游戏化方法的持续性用户体验设计
- URL: https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A
- Provider: DeepSeek

## Hypothesis

The V2 prompt pipeline should produce a contract-valid review path with stable source blocks, unit-level summaries, one visible explanation per question, four-option multiple choice questions, and four-by-four matching questions.

## Prompt And Schema Changes

### 2026-06-19 split-stage quality gate update

- Replaced the current V2 orchestration path with split stages: `sourceMap -> reviewPathPlan -> unitPracticePlan -> multipleChoiceDraft / matchingDraft -> unitSummaryDraft -> qualityJudge`.
- Added internal schemas for `practiceGoal`, `questionPlan`, multiple-choice drafts, matching drafts, and unit summary drafts.
- Added deterministic V2 diagnostics for forbidden article-recall stem phrases, exam-style feedback phrases, weak distractors, weak matching relations, explanation UI fit, and source anchor consistency.
- Quality diagnostics and `qualityJudge.verdict` are currently non-blocking. This run mode intentionally lets all structurally valid questions through so we can inspect the full model output and move standards into the generation prompts.
- The V2 HTML quality report now exposes per-question diagnostics: forbidden phrase, distractor value, matching relation value, explanation UI fit, source anchor precision, and issue details.

### 2026-06-20 ECD shadow-stage stabilization

- Added an internal `ecdPlanning` shadow stage after `reviewPathPlan` to model Evidence-Centered Design relationships before visible question drafting.
- Tightened the model-facing `ecdPlanning` schema so the model sees nested requirements for article understanding, knowledge shapes, learning claims, evidence needs, task plans, and assembly plans.
- Added conservative ECD taxonomy normalization for internal enum drift. Unknown labels are preserved as `original...` fields and mapped to stable fallback taxonomy values so the shadow stage does not block visible generation.
- Tightened `reviewPathPlan` prompt rules: every unit must be a complete knowledge-point object, skeletal section/outline units are not allowed, and the model should prefer high-value evidence-bearing units over covering every paragraph.
- Added `V2_GENERATION_MAX_UNITS` and `V2_GENERATION_UNIT_CONCURRENCY` for bounded quality experiments. The latest completed run used `max6 + concurrency3` to make split-stage experiments practical.
- Expanded draft-question normalization so missing `sourceAnchorId` / `practiceGoalId` is filled from the corresponding question plan instead of failing the whole run.

### Earlier baseline fixes

- Added support for extracted article metadata aliases so prompt messages include `sourceAccount` and `sourceUrl`.
- Tightened `reviewPathPlan` schema so `unit.sourceAnchor.id` and `unit.sourceAnchor.blockIds` are required inside the model-facing schema, not only in post-validation.
- Tightened `unitCards` schema so `question.type` is limited to `multiple_choice` or `matching`.
- Updated prompt text to explicitly require stable `sourceAnchor.id` and reject legacy question type names such as `single_choice`.

## Runs

| Run | Status | Result |
| --- | --- | --- |
| `20260619-181223-v2-golden-deepseek-first-run` | failed | `reviewPathPlan` omitted `unit.sourceAnchor.id` for all 6 units. |
| `20260619-181442-v2-golden-deepseek-schema-tightened` | failed | `unitCards.questions[0].type` used an unsupported question type. |
| `20260619-181727-v2-golden-deepseek-type-enum` | completed | 6 units, 14 questions, 7 multiple choice, 7 matching, 39 source blocks, quality verdict `pass`. |
| `20260619-203541-v2-golden-deepseek-diagnostic-only` | failed | DeepSeek returned no structured text with the default model setting. |
| `20260619-203839-v2-golden-deepseek-diagnostic-only-chat` | failed | `multipleChoiceDraft` returned model-made question ids that did not match the planned ids. |
| `20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized` | completed | Split-stage diagnostic-only run completed: 10 units, 20 questions, 20 multiple choice, 0 matching, 121 source blocks, 2 deterministic diagnostic issues. |
| `20260620-131227-v2-ecd-shadow-stage` | failed | Initial ECD shadow stage failed contract validation because the model-facing ECD schema only exposed top-level object/array fields. |
| `20260620-131750-v2-ecd-shadow-stage-schema-tightened` | failed | ECD schema was fixed, but `reviewPathPlan` drifted into skeletal later units missing `nodeLabel`, summaries, `why`, and `sourceAnchor`. |
| `20260620-132035-v2-ecd-shadow-review-plan-complete-units` | failed | Complete-unit prompt fixed review planning; ECD then failed on one unknown internal `claimType` enum. |
| `20260620-135049-v2-ecd-shadow-max6-concurrency3` | failed | Bounded/concurrent run reached multiple-choice drafting, then failed because one draft omitted `sourceAnchorId` for unit `u4`. |
| `20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized` | completed | 6 units, 25 questions, 21 multiple choice, 4 matching, 77 source blocks. ECD identified DMC as `layered_framework` and generated a DMC layer-role matching question. |

## Artifacts

- Latest JSON: `runs/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.json`
- Latest HTML: `reports/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.html`
- Previous split-stage diagnostic JSON: `runs/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.json`
- Previous split-stage diagnostic HTML: `reports/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.html`
- Previous completed baseline JSON: `runs/20260619-181727-v2-golden-deepseek-type-enum.json`
- Previous completed baseline HTML: `reports/20260619-181727-v2-golden-deepseek-type-enum.html`

## Conclusion

The ECD shadow-stage direction is now technically runnable on this article. The latest completed run produced matching again, and the DMC unit was correctly recognized as a layered framework with a layer-role matching task. This is a meaningful improvement over the previous split-stage run that produced no matching.

This run should **not** be treated as a pedagogical-quality pass yet. The matching recovery is partly over-broad: some non-DMC units still borrowed DMC-style layer-role matching, which means the next prompt iteration should constrain matching evidence to the current unit instead of reusing a good pattern from another unit. The pipeline is now ready for focused quality comparison against the golden sample, but not ready for broad multi-article evaluation.

Detailed audit: `../../../v2-prompt-quality-gap-audit-zh.md`

## Next Experiment

Manually review the latest HTML report against the V2 golden-sample rules before adding more articles. Focus on:

- Whether the selected 6 units match the golden sample's knowledge-point structure.
- Whether `nodeLabel` is short enough for the home node popover.
- Whether matching questions are grounded in the current unit's evidence, especially outside the DMC unit.
- Whether multiple-choice stems and options are as compact and misconception-driven as the golden sample.

The next prompt iteration should connect ECD shadow planning into `unitPracticePlan` instead of letting `unitPracticePlan` independently rediscover tasks. This should make task selection more pyramid-like: article understanding -> unit learning claims -> evidence needs -> task affordances -> visible question drafts.

After the generation prompts are closer to the V2 standard, run a controlled A/B experiment for an optional lightweight quality-rewrite role:

- A: split-stage generation without rewrite.
- B: same inputs and model, with a rewrite role that only makes small UI/wording repairs.

Do not add this rewrite role to the current structure yet. The immediate priority is still improving the first-pass generation prompts.
