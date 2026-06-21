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

### 2026-06-20 knowledge-object boundary iteration

- Added an internal `reviewPathPlan.knowledgeObjects[]` map before unit selection. The model must first identify evidence-bearing knowledge objects, assign each a `knowledgeShape`, and mark whether it should be a `standalone_unit`, `merge_fragment`, or `context_only`.
- Added `units[].sourceKnowledgeObjectIds` as an internal trace from visible unit to knowledge object. The field is preserved in `generationMeta.reviewPathPlan` for diagnostics but stripped from frontend-facing `units[]`.
- Added a deterministic boundary rule: one visible unit must not merge multiple `standalone_unit` knowledge objects. This directly targets the previous structural failure where “游戏化核心概念” and “DMC 模型” were merged.
- Clarified that DMC-style layered frameworks with their own evidence and natural task value should remain standalone units instead of being folded into a generic definition unit.
- Moved `unitPracticePlan` ECD alignment before strict validation, so a matching plan can deterministically inherit `relationType` from ECD `selectedTasks` instead of failing because the model omitted a derivable internal field.

### 2026-06-20 coverage-first ECD iteration

- Added `ecdPlanning.unitSubObjectives[]` so each unit first decomposes into assessable, source-grounded sub-objectives before claims, evidence, and tasks are selected.
- Added `unitEvidenceNeeds[].coverageRequirement`. `required` evidence must be covered by `unitAssemblyPlan.selectedTasks[].evidenceIds[]`; `supporting` and `optional` evidence can remain visible without forcing a question.
- Updated the ECD prompt order to: unit sub-objectives -> learning claims -> evidence needs -> task affordance -> selected tasks. This keeps task type selection after evidence coverage, instead of using question type as the first decision.
- Added Coverage Matrix rendering to the V2 HTML quality report so sub-objective, claim, evidence, and selected-task coverage can be checked without reading raw JSON.
- Added `V2_SOURCE_MAP_MODE=deterministic` for long-article quality experiments. It creates stable source blocks in code rather than asking the model to re-output the full article as JSON, avoiding sourceMap truncation on long inputs.
- Increased DeepSeek JSON `max_tokens` support and ECD-stage output budget so internal coverage planning is not truncated.

### 2026-06-20 evidence-angle coverage iteration

- Added `ecdPlanning.unitEvidenceAngles[]` between sub-objectives and evidence needs. This records the different observable angles a learner claim may require, such as definition grasp, structure mapping, boundary discrimination, misconception detection, scenario transfer, mechanism reasoning, and source grounding.
- Added `angleId` to `unitEvidenceNeeds[]`, `unitTaskPlan[]`, and `unitAssemblyPlan[].selectedTasks[]`. Assembly now has to cover required evidence angles, not just broad evidence IDs.
- Added an Angle Coverage Matrix to the HTML report so each unit can be audited by angle -> evidence -> selected task -> covered/missing.
- Converted `unitPracticePlan` from a model-generated stage to a deterministic adapter from `ecdPlanning.unitAssemblyPlan[].selectedTasks`. This avoids a redundant model stage reselecting or dropping tasks after ECD has already selected them.
- Added source-anchor normalization for unit-scoped ECD fields. When the model emits a block id or invalid local id where a unit source anchor is expected, the pipeline restores the planned unit anchor and keeps the original value for diagnostics.
- Added draft-question normalization so downstream draft stages cannot add extra unplanned questions or drift from ECD-selected question IDs.
- Added a narrow JSON retry for transient provider responses that contain no parseable structured JSON.
- Increased `matchingDraft` output budget to reduce truncation when the selected task requires a 4x4 matching question.
- The full `max6 + concurrency3` run still failed on DeepSeek structured-output instability. The completed run used `V2_GENERATION_UNIT_CONCURRENCY=1`; use serial mode for this provider until the model path is more stable.

### 2026-06-21 prompt-diet experiment

- Hypothesis: the system may be under-generating because pedagogical prompts contain too many negative constraints such as “do not mechanically add questions,” “supporting can be skipped,” and “avoid weak matching.”
- Changed only prompt wording and documentation; no schema or orchestration structure was changed.
- Kept engineering contract constraints hard: JSON schema, stable ids, source anchors, four-option multiple choice, and 4x4 matching.
- Rewrote ECD planning as positive goals:
  - `selectedTasks` should form a mastery evidence set, not the minimum compliant coverage set.
  - High-value `supporting` angles should enter selected tasks when they observe different understanding.
  - Matching should be framed as a positive affordance for natural structure/role/step/signal relationships.
- Result: the hypothesis was only partially right. The old negative wording was likely not the only cause. After removing/softening it, the model became even more conservative: each unit collapsed to one required angle and one selected task.
- New diagnosis: the system now needs a positive expansion target, not just fewer negative constraints. The prompt should explicitly ask the model to enumerate the full set of assessable sub-objectives and only then choose the mastery evidence set.

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
| `20260620-182328-v2-knowledge-object-boundary-max6` | failed | The first knowledge-object boundary run reached `unitPracticePlan`, then failed because a matching `questionPlan` omitted `relationType`. |
| `20260620-183009-v2-knowledge-object-boundary-max6-rerun` | completed | 6 units, 9 questions, 7 multiple choice, 2 matching, 118 source blocks, 0 diagnostic issues. DMC is split back into its own standalone layered-framework unit. |
| `20260620-204008-v2-coverage-first-ecd-max6` | failed | First coverage-first run failed at model JSON parsing because sourceMap attempted to re-output the long article and was truncated. |
| `20260620-204308-v2-coverage-first-ecd-max6-rerun` | failed | Adding `max_tokens` exposed the same sourceMap truncation more clearly. |
| `20260620-204412-v2-coverage-first-ecd-max6-rerun2` | failed | Raising large-stage budgets still left sourceMap too large for model JSON output. |
| `20260620-204722-v2-coverage-first-ecd-max6-deterministic-source` | failed | Deterministic sourceMap moved failure to ECD planning; ECD JSON was truncated at the previous 7600-token stage budget. |
| `20260620-205026-v2-coverage-first-ecd-max6-deterministic-source-rerun` | completed | 6 units, 12 questions, 10 multiple choice, 2 matching, 127 source blocks, 1 diagnostic issue. Coverage Matrix shows all required evidence covered. |
| `20260620-214052-v2-evidence-angle-coverage-max6-deterministic-source` | failed | First evidence-angle run failed because DeepSeek returned unparseable structured JSON. |
| `20260620-214211-v2-evidence-angle-coverage-max6-deterministic-source` | failed | Provider returned no structured text. |
| `20260620-214542-v2-evidence-angle-coverage-max6-deterministic-source-serial` | failed | Serial mode moved farther through the pipeline, but still hit a no-structured-text provider response. |
| `20260620-215240-v2-evidence-angle-coverage-max6-deterministic-source-adapter` | failed | Replacing model `unitPracticePlan` with a deterministic adapter exposed source-anchor drift in ECD fields. |
| `20260620-215818-v2-evidence-angle-coverage-max6-deterministic-source-adapter-anchor` | failed | Source anchors were normalized, then `multipleChoiceDraft` returned extra model-invented questions. |
| `20260620-220141-v2-evidence-angle-coverage-max6-deterministic-source-adapter-anchor-draft-normal` | failed | Draft question IDs were normalized, but the provider again returned no structured text. |
| `20260620-220519-v2-evidence-angle-coverage-max6-deterministic-source-adapter-anchor-draft-retry` | failed | Narrow JSON retry helped isolate the issue but the provider still failed to return structured text. |
| `20260620-221513-v2-evidence-angle-coverage-max6-deterministic-source-final` | failed | Full `max6 + concurrency3` still failed on provider structured-output instability. |
| `20260620-222608-v2-evidence-angle-coverage-max6-deterministic-source-final-serial` | completed | 6 units, 12 questions, 11 multiple choice, 1 matching, 127 source blocks, 2 diagnostic issues. DMC remains a standalone unit and receives a 4x4 matching task. |
| `20260621-002013-v2-prompt-diet-max6-serial` | completed | Prompt-diet experiment completed: 6 units, 6 questions, 5 multiple choice, 1 matching, 127 source blocks, 0 diagnostic issues. Quantity and coverage dropped because each unit collapsed to 1 required angle and 1 selected task. |

## Artifacts

- Latest prompt-diet JSON: `runs/20260621-002013-v2-prompt-diet-max6-serial.json`
- Latest prompt-diet HTML: `reports/20260621-002013-v2-prompt-diet-max6-serial.html`
- Previous evidence-angle JSON: `runs/20260620-222608-v2-evidence-angle-coverage-max6-deterministic-source-final-serial.json`
- Previous evidence-angle HTML: `reports/20260620-222608-v2-evidence-angle-coverage-max6-deterministic-source-final-serial.html`
- Previous coverage-first JSON: `runs/20260620-205026-v2-coverage-first-ecd-max6-deterministic-source-rerun.json`
- Previous coverage-first HTML: `reports/20260620-205026-v2-coverage-first-ecd-max6-deterministic-source-rerun.html`
- Previous knowledge-boundary JSON: `runs/20260620-183009-v2-knowledge-object-boundary-max6-rerun.json`
- Previous knowledge-boundary HTML: `reports/20260620-183009-v2-knowledge-object-boundary-max6-rerun.html`
- Previous ECD-driven JSON: `runs/20260620-175013-v2-ecd-driven-planning-max6-schema-items.json`
- Previous ECD-driven HTML: `reports/20260620-175013-v2-ecd-driven-planning-max6-schema-items.html`
- Previous ECD shadow JSON: `runs/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.json`
- Previous ECD shadow HTML: `reports/20260620-135541-v2-ecd-shadow-max6-concurrency3-anchor-normalized.html`
- Previous split-stage diagnostic JSON: `runs/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.json`
- Previous split-stage diagnostic HTML: `reports/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.html`
- Previous completed baseline JSON: `runs/20260619-181727-v2-golden-deepseek-type-enum.json`
- Previous completed baseline HTML: `reports/20260619-181727-v2-golden-deepseek-type-enum.html`

## Conclusion

The evidence-angle iteration moves the V2 ECD pipeline one layer deeper. Coverage-first planning ensured required evidence was represented; evidence-angle planning now asks *how* each important claim should be observed. This lets one knowledge point be assessed from multiple complementary angles without hard-coding a fixed question count.

The evidence-angle run has:

- 6 visible units and 12 questions.
- `游戏化的概念与核心定义` as an independent core-concept unit.
- `DMC模型：游戏元素的三层结构` as an independent layered-framework unit.
- A DMC 4x4 matching task plus a follow-up multiple-choice task.
- Angle counts by unit: `2 / 4 / 3 / 2 / 3 / 3`.
- 0 structural issues and 2 deterministic diagnostics:
  - `qp-002-2`: weak distractor set because at least one distractor is too short.
  - `qp-005-2`: weak distractor set because the correct option is too obvious.

This is a successful architecture pass, not a final pedagogical-quality pass. The important improvement is that ECD now has an explicit internal representation for multi-angle assessment:

```text
knowledge object
  -> unit sub-objective
  -> learning claim
  -> evidence angle
  -> evidence need
  -> selected task
  -> visible question
```

The run also exposed two engineering constraints:

- `unitPracticePlan` should not be a model stage. It is now a deterministic adapter from ECD selected tasks, which reduces downstream drift.
- DeepSeek structured output remains unstable under `max6 + concurrency3`; the successful run used serial unit generation. Until this is improved, quality experiments for this provider should prefer `V2_GENERATION_UNIT_CONCURRENCY=1`.

The next prompt iteration should focus on the quality of angle-to-task mapping and distractor construction. The system can now represent multiple evidence angles, but the model still needs better guidance for turning each angle into a compact, high-value question rather than a shallow or obvious multiple-choice item.

The prompt-diet run tested whether excessive negative wording was the main cause of under-generation. It did **not** improve coverage. It reduced output to 6 questions:

- every unit kept only 1 selected task;
- every unit kept only 1 required angle;
- DMC still got a matching task, but lost the follow-up multiple-choice angle;
- diagnostic issues dropped to 0 largely because there were fewer questions to inspect, not because coverage improved.

This means prompt dieting alone is not enough. The next iteration should keep the lighter wording, but add a positive expansion objective: before assembly, the model must enumerate the full set of assessable sub-objectives and evidence angles for the unit, then select a mastery evidence set that is sufficient to judge learning, not merely the smallest required set.

Detailed audit: `../../../v2-prompt-quality-gap-audit-zh.md`

## Next Experiment

Manually review the prompt-diet HTML report against the previous evidence-angle report before adding more articles. Focus on:

- Why each unit collapsed to one required angle and one selected task.
- Whether `supporting` angles were still treated as non-actionable despite softer wording.
- Whether assembly needs a positive “mastery evidence set” objective rather than more negative constraints.
- Whether the next prompt should require enumerating assessable sub-objectives before assigning importance.
- Whether DMC lost useful follow-up coverage compared with the previous evidence-angle run.

The next implementation iteration should refine positive expansion instructions while preserving the ECD pyramid:

```text
article understanding
  -> knowledge objects
  -> unit sub-objectives
  -> learning claims
  -> evidence angles
  -> evidence needs
  -> selected tasks
  -> visible question drafts
```

After the generation prompts are closer to the V2 standard, run a controlled A/B experiment for an optional lightweight quality-rewrite role:

- A: split-stage generation without rewrite.
- B: same inputs and model, with a rewrite role that only makes small UI/wording repairs.

Do not add this rewrite role to the current structure yet. The immediate priority is still improving the first-pass generation prompts.
