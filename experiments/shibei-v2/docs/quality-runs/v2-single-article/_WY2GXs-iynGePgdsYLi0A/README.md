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

### 2026-06-20 ECD-driven planning adapter

- Connected `ecdPlanning.unitAssemblyPlan[].selectedTasks` into downstream `unitPracticePlan` through a per-unit `ecdContext`.
- Added a deterministic adapter so `unitPracticePlan.questionPlans` follow ECD selected tasks instead of reselecting task types independently.
- Filtered model-invented extra question plans. Draft stages now run only for question types selected by ECD: pure matching units skip `multipleChoiceDraft`, and non-matching units skip `matchingDraft`.
- Passed the same `ecdContext` into `multipleChoiceDraft`, `matchingDraft`, and `unitSummaryDraft` so visible question drafting serves the selected learning claim, evidence need, and task purpose.
- Tightened draft schemas so multiple choice has exactly 4 options and matching has exactly 4 left items, 4 right items, and 4 pairs.

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
| `20260620-173939-v2-ecd-driven-planning-max6` | failed | ECD selected only matching for one unit, but orchestration still called `multipleChoiceDraft`, causing a zero-MC validation failure. |
| `20260620-174439-v2-ecd-driven-planning-max6-rerun` | failed | Matching draft returned fewer than 4 left/right/pair items. This exposed that the model-facing matching schema still allowed underspecified arrays. |
| `20260620-175013-v2-ecd-driven-planning-max6-schema-items` | completed | 6 units, 12 questions, 10 multiple choice, 2 matching, 70 source blocks, 1 deterministic diagnostic issue. ECD selected tasks now drive downstream question planning. |

## Artifacts

- Latest JSON: `runs/20260620-175013-v2-ecd-driven-planning-max6-schema-items.json`
- Latest HTML: `reports/20260620-175013-v2-ecd-driven-planning-max6-schema-items.html`
- Previous ECD shadow JSON: `runs/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.json`
- Previous ECD shadow HTML: `reports/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.html`
- Previous split-stage diagnostic JSON: `runs/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.json`
- Previous split-stage diagnostic HTML: `reports/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.html`
- Previous completed baseline JSON: `runs/20260619-181727-v2-golden-deepseek-type-enum.json`
- Previous completed baseline HTML: `reports/20260619-181727-v2-golden-deepseek-type-enum.html`

## Conclusion

ECD is no longer only a shadow diagnostic stage for this experiment. The latest completed run uses ECD selected tasks to drive downstream question planning, then lets the draft stages write only the selected visible question types.

The immediate macro improvement is that the earlier non-DMC “DMC-style matching” leakage is gone. The system now produces fewer but more explicitly ECD-backed questions: 12 visible questions for 6 units, with matching only where ECD selected matching.

This run should **not** be treated as a pedagogical-quality pass yet. The main remaining macro issue moved upstream: `reviewPathPlan` / `knowledgeModel` merged “游戏化核心概念” and “DMC 模型” into one unit, so DMC no longer appears as a clean standalone knowledge point like the golden sample. One generated matching question was also flagged as `v2_weak_matching_relation`, which suggests the next iteration should improve ECD assembly criteria for relation strength before broad multi-article testing.

Detailed audit: `../../../v2-prompt-quality-gap-audit-zh.md`

## Next Experiment

Manually review the latest HTML report against the V2 golden-sample rules before adding more articles. Focus on:

- Whether the selected 6 units match the golden sample's knowledge-point structure.
- Whether `nodeLabel` is short enough for the home node popover.
- Whether DMC should be split back out as its own `layered_framework` unit.
- Whether matching questions are grounded in strong current-unit evidence, especially for signal/action or process-style units.
- Whether multiple-choice stems and options are as compact and misconception-driven as the golden sample.

The next prompt iteration should improve the upstream knowledge model and ECD assembly selection, not reintroduce independent task selection inside `unitPracticePlan`. The desired pyramid remains: article understanding -> unit knowledge model -> learning claims -> evidence needs -> selected tasks -> visible question drafts.

After the generation prompts are closer to the V2 standard, run a controlled A/B experiment for an optional lightweight quality-rewrite role:

- A: split-stage generation without rewrite.
- B: same inputs and model, with a rewrite role that only makes small UI/wording repairs.

Do not add this rewrite role to the current structure yet. The immediate priority is still improving the first-pass generation prompts.
