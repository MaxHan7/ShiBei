# V2 Quality Run: _WY2GXs-iynGePgdsYLi0A

## Source

- Title: 基于游戏化方法的持续性用户体验设计
- URL: https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A
- Provider: DeepSeek

## Hypothesis

The V2 prompt pipeline should produce a contract-valid review path with stable source blocks, unit-level summaries, one visible explanation per question, four-option multiple choice questions, and natural matching questions with 2-4 meaningful pairs when the source supports them.

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

## 2026-06-21 Unit Knowledge Map + Per-Unit ECD Planning

### What Changed

This iteration tested the structural hypothesis discussed from ECD:

```text
article/source blocks
  -> knowledge objects
  -> units
  -> unit micro knowledge points
  -> per-unit learning claims / evidence angles / evidence needs
  -> selected tasks
  -> visible questions
```

Implementation changes:

- Added `unitKnowledgeMap` as a protected micro knowledge inventory stage.
- Changed `ecdPlanning` from one all-units global JSON output to per-unit ECD planning, then merged the results.
- At this checkpoint `qualityJudge` was still diagnostic-only. The next checkpoint changes this default because the full-path judge adds a large extra model call.
- Added model-call diagnostics to the V2 quality report so failed reports show the exact model stage and parse preview.

### Failed Attempts Before the Fix

- `20260621-005914-v2-unit-knowledge-map-max6-serial.html`
- `20260621-011515-v2-unit-knowledge-map-max6-serial-rerun.html`
- `20260621-011808-v2-unit-knowledge-map-max6-retry5.html`
- `20260621-013202-v2-unit-knowledge-map-max6-diagnostic-report.html`
- `20260621-013953-v2-unit-knowledge-map-max6-output-preserved.html`

The important failure was `v2_ecdPlanning`: the model hit `14000` completion tokens three times and returned truncated JSON. This showed that the global ECD planning role was still too heavy after adding micro knowledge inventory.

### Successful Run

- JSON: `runs/20260621-014913-v2-unit-ecd-per-unit-max6.json`
- HTML: `reports/20260621-014913-v2-unit-ecd-per-unit-max6.html`

Metrics:

- 6 units
- 17 questions
- 14 multiple-choice questions
- 3 matching questions
- 127 source blocks
- 0 blocking issues
- 3 deterministic diagnostics

Compared with previous runs:

- `20260620-183009-v2-knowledge-object-boundary-max6-rerun`: 6 units, 9 questions, 2 matching.
- `20260621-002013-v2-prompt-diet-max6-serial`: 6 units, 6 questions, 1 matching.
- `20260621-014913-v2-unit-ecd-per-unit-max6`: 6 units, 17 questions, 3 matching.

The successful run restored the missing multi-angle coverage. It also preserved the DMC unit and generated a high-value DMC matching task:

- unit: `DMC模型：动力、机制、组件的分层结构`
- micro points: model structure, dynamics layer, mechanics layer, components layer, layer relation
- matching stem: match DMC layers with their role/responsibility

Remaining issues are now downstream draft-quality issues, not macro architecture issues:

- one weak distractor set in `unit-4`
- one explanation phrase issue in `unit-5`
- one weak distractor set in `unit-6`

Next iteration should focus on compact distractor quality and explanation wording. It should not add another macro layer until these downstream draft issues are reviewed.

## 2026-06-21 Disable Default Quality Judge

### What Changed

The V2 main generation path now skips the model-based `qualityJudge` by default:

```text
sourceMap
  -> reviewPathPlan
  -> unitKnowledgeMap
  -> per-unit ecdPlanning
  -> deterministic unitPracticePlan adapter
  -> visible question drafts
  -> deterministic guardrails + HTML diagnostics
```

`qualityJudge` can still be enabled explicitly with `V2_ENABLE_QUALITY_JUDGE=1` for a future A/B experiment, but it should not run as part of the default chain.

Rationale:

- The full-path judge reads the entire generated review path, which creates a very large prompt after ECD fields were added.
- It is a post-generation reviewer, not the source of question quality. The current product goal is to inspect all generated questions, not silently rely on a judge stage.
- It adds another JSON-generation failure surface. If we later test a quality repair role, it should be measured separately against a no-repair baseline.

### Verification

- Code test: `npm --prefix experiments/shibei-v2/backend run check`
- Result: 203 tests passed.
- Default `generationMeta.qualityGate.mode`: `deterministic_only`
- Default `generationMeta.qualityJudge.verdict`: `skipped`
- Explicit judge mode remains covered by tests with `qualityJudgeEnabled: true`.

### Live Quality Run Attempt

Two live DeepSeek quality smoke runs were attempted after this change:

- `V2_GENERATION_MAX_UNITS=6`, label `v2-no-quality-judge-max6`
- `V2_GENERATION_MAX_UNITS=2`, label `v2-no-quality-judge-max2-smoke`
- `V2_GENERATION_MAX_UNITS=1`, label `v2-no-quality-judge-max1-timeout20s`

They were manually interrupted because the CLI runner produced no stage progress output and did not finish within the expected smoke-test window. No new quality JSON/HTML artifact was recorded from these interrupted runs.

This is an engineering observability issue, not a quality conclusion. Before the next long live experiment, the runner should expose stage-level progress and/or an experiment-level timeout so a stuck model request is visible immediately.

## 2026-06-21 Quality Runner Progress + Timeout

### What Changed

The V2 quality runner now prints stage-level progress to stderr:

```text
run_start
stage_start
stage_done
stage_failed
run_timeout
run_done
```

It also supports `QUALITY_EXPERIMENT_TIMEOUT_MS`. When the experiment-level timeout is reached, the runner writes a failed JSON/HTML artifact instead of silently waiting forever.

### Verification Run

Smoke run with a 90 second total experiment timeout:

- JSON: `runs/20260621-030640-v2-runner-progress-max1-timeout90s.json`
- HTML: `reports/20260621-030640-v2-runner-progress-max1-timeout90s.html`

Observed progress:

- `reviewPathPlan`: completed in about 39s.
- `unitKnowledgeMap`: completed in about 14s.
- `ecdPlanning`: still running when the 90s experiment timeout fired.

Conclusion:

- The previous “silent hang” was not caused by `qualityJudge`; after disabling `qualityJudge`, the runner still needed visibility because a normal stage can be slow.
- The next backend iteration should inspect why per-unit `ecdPlanning` can be slow even with `V2_GENERATION_MAX_UNITS=1`, before running another full max6 quality comparison.

## 2026-06-21 Compact ECD Planning Hypothesis

The `v2-runner-progress-max1-timeout90s` run showed that the next bottleneck is the default persisted shape of `ecdPlanning`, not the ECD theory itself.

Hypothesis for the next implementation:

- Keep `unitKnowledgeMap` as the complete micro knowledge inventory.
- Keep ECD as the internal method for deciding assessable targets and selected tasks.
- Stop asking the model to serialize every ECD intermediate layer as JSON by default.
- Persist only compact planning artifacts:
  - `assessableTargets[]`
  - `selectedTasks[]`
  - coverage ids such as `targetIds` and `microIds`
- Pass only the current task's compact context into downstream draft stages.
- Keep verbose ECD only behind a deliberate debug/experiment flag if needed.

Expected result:

- `ecdPlanning` finishes inside the 90s max1 smoke window.
- The HTML report still shows enough information to audit micro-point and selected-task coverage.
- DMC-style structural matching is still possible because compact `selectedTasks[]` preserves `taskAffordance`, `taskPurpose`, `targetIds`, and `microIds`.

Comparison target for the next run:

```text
Before compact ECD:
- max1 timed out at ecdPlanning after 90s.
- reviewPathPlan: about 39s.
- unitKnowledgeMap: about 14s.

After compact ECD:
- ecdPlanning: <observed seconds>
- unit count: <observed>
- question count: <observed>
- matching count: <observed>
- whether DMC-style structural matching survives: yes/no
```

## 2026-06-21 Slim Review Path Plan

### What Happened

The first compact-ECD smoke run did not reach the compact ECD stage:

- `20260621-121438-v2-compact-ecd-max1`
  - Failed by experiment timeout at `unitKnowledgeMap`.
  - `reviewPathPlan` alone took about 87s under a 90s total timeout.
- `20260621-121622-v2-compact-ecd-max1-timeout240`
  - Failed at `reviewPathPlan` after three JSON retries.
  - Model usage showed each attempt used the full 5200 completion-token budget and was truncated while outputting `knowledgeObjects`.

Diagnosis:

- The bottleneck had moved earlier than compact ECD.
- `reviewPathPlan` was doing too much: chapter summary, knowledge-object boundary map, unit selection, source anchors, and chapter completion copy.
- This violated the pyramid structure we want. The first layer should identify high-level units; micro knowledge and ECD task modeling belong downstream.

### Implementation Change

`reviewPathPlan` was slimmed into a lightweight chapter/unit planning stage:

- Removed default model output for `knowledgeObjects[]`.
- Removed default model output for `units[].sourceKnowledgeObjectIds`.
- Kept only:
  - `title`
  - `summaryCard.text`
  - `units[]` with `id/order/title/nodeLabel/shortSummary/detailSummary/why/sourceAnchor`
  - `chapterSummary.encouragementText`
- Kept DMC-style guidance as positive unit-splitting instructions, but no longer requires the model to serialize a full boundary-decision table.
- Lowered `reviewPathPlan` output budget from 5200 to 3200 because the schema is now smaller.
- Removed unused knowledge-object validator helpers from `reviewPathPlan.js` to avoid future confusion.

The resulting structure is now clearer:

```text
reviewPathPlan: chapter summary + high-level units
  -> unitKnowledgeMap: micro knowledge inventory
  -> ecdPlanning: assessable targets + selected tasks
  -> visible question drafts
```

### Verification

- Code check: `npm --prefix experiments/shibei-v2/backend run check`
- Result: 202 tests passed.

Live smoke:

- JSON: `runs/20260621-122330-v2-slim-review-plan-max1.json`
- HTML: `reports/20260621-122330-v2-slim-review-plan-max1.html`
- Result: completed.
- Metrics: 1 unit, 2 questions, 1 multiple choice, 1 matching, 0 diagnostic issues.
- Timings:
  - `reviewPathPlan`: 26s
  - `unitKnowledgeMap`: 15s
  - `ecdPlanning`: 83s
  - `multipleChoiceDraft`: 11s
  - `matchingDraft`: 63s
  - `unitSummaryDraft`: 4s

Full bounded run:

- JSON: `runs/20260621-122718-v2-slim-review-plan-max6-rerun.json`
- HTML: `reports/20260621-122718-v2-slim-review-plan-max6-rerun.html`
- Result: completed.
- Metrics: 6 units, 14 questions, 9 multiple choice, 5 matching, 127 source blocks, 1 diagnostic issue.
- Unit coverage:
  - `游戏化的概念与核心理论`: 3 questions, including 1 matching.
  - `DMC模型：游戏元素的分层框架`: 3 questions, including a DMC layer-role matching task.
  - `阶段性目标设定`: 2 multiple-choice questions.
  - `挑战与能力的动态匹配`: 2 questions, including 1 matching.
  - `成长机制的感知设计`: 2 questions, including 1 matching.
  - `情境设计与身份认同建构`: 2 questions, including 1 matching.

### Conclusion

This was a successful structural slimming pass.

- The JSON truncation root cause was not compact ECD itself; it was the over-heavy `reviewPathPlan` stage.
- Slimming the first layer restored stable JSON output and improved runtime.
- DMC remained an independent unit and received a direct matching task.
- Question volume recovered from the prompt-diet run: 6 questions -> 14 questions.
- Matching recovered from 1 matching -> 5 matching.

Remaining risks:

- `ecdPlanning` and `matchingDraft` can still be slow for individual units.
- One DMC multiple-choice item was flagged for weak distractors.
- The next quality pass should inspect the generated report manually before changing more architecture.

## 2026-06-21 Source Context Window Slimming

### What Changed

The generation pipeline now passes source context by stage:

```text
reviewPathPlan
  -> full deterministic source blocks
unitKnowledgeMap
  -> union window around all planned unit anchors
per-unit ecdPlanning / question drafts / unit summaries
  -> current unit source window only
```

Implementation details:

- Added `sourceContext.js` with deterministic source-window helpers.
- Added `sourceContextStats` to `generationMeta` and the HTML report.
- Prompt messages now include `sourceContextNote` when a stage receives a selected source window.
- Long source blocks in the HTML quality report are previewed by default and expandable for audit.

### Verification

- Code check: `npm --prefix experiments/shibei-v2/backend run check`
- Result: 202 tests passed.

Focused tests added/updated:

- `src/v2/generation/sourceContext.test.js`
- `generateReviewPathV2.test.js` verifies per-unit stages no longer receive the full source block array.
- `v2QualityExperiment.test.js` verifies source context stats render in the HTML report.

### Live Run Attempts

First run:

- JSON: `runs/20260621-150112-v2-source-context-window-max6-serial.json`
- HTML: `reports/20260621-150112-v2-source-context-window-max6-serial.html`
- Status: failed at `v2_ecdPlanning`.
- Reason: DeepSeek returned no structured text on the second per-unit ECD call after internal retries.
- Interpretation: provider structured-output instability, not source-window validation failure.

Rerun:

- JSON: `runs/20260621-150409-v2-source-context-window-max6-serial-rerun.json`
- HTML: `reports/20260621-150409-v2-source-context-window-max6-serial-rerun.html`
- Status: completed.
- Metrics: 6 units, 14 questions, 10 multiple choice, 4 matching, 127 source blocks, 1 deterministic diagnostic issue.

### Token / Context Comparison

Compared with `20260621-122718-v2-slim-review-plan-max6-rerun`:

| Metric | Slim review plan | Source context window |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 14 | 14 |
| Multiple choice | 9 | 10 |
| Matching | 5 | 4 |
| Diagnostic issues | 1 | 1 |
| Model calls | 27 | 26 |
| Prompt tokens | 313,015 | 103,951 |
| Completion tokens | 40,460 | 41,323 |
| Total tokens | 353,475 | 145,274 |
| Prompt cache miss tokens | 266,679 | 67,599 |

Stage-level prompt token changes:

| Stage | Before | After |
| --- | ---: | ---: |
| `unitKnowledgeMap` | 11,646 | 5,867 |
| `ecdPlanning` | 79,521 | 25,539 |
| `multipleChoiceDraft` | 81,021 | 22,883 |
| `unitSummaryDraft` | 71,819 | 24,385 |
| `matchingDraft` | 59,057 | 15,326 |

Source window stats in the completed run:

- Full source blocks: 127.
- `unitKnowledgeMap` plan-union window: 23 blocks.
- Per-unit windows:
  - `unit-1`: 4 blocks.
  - `unit-2`: 3 blocks.
  - `unit-3`: 3 blocks.
  - `unit-4`: 5 blocks.
  - `unit-5`: 3 blocks.
  - `unit-6`: 6 blocks.

### Conclusion

This was a successful performance/stability architecture pass.

- The full-article repetition problem is materially reduced.
- Prompt tokens dropped by about two thirds while preserving 6 units and 14 total questions.
- Matching did not disappear; the run still produced 4 matching questions.
- DMC should be manually checked in the HTML report, but the source-window change did not structurally disable DMC-style matching.

Remaining risks:

- DeepSeek still occasionally returns no structured text in `ecdPlanning`, even with smaller context.
- The next architecture pass should inspect whether provider retry strategy, stage-specific output budgets, or per-unit fallback/retry isolation can reduce these transient failures.
- Quality still needs manual inspection; token slimming alone does not prove pedagogical quality improved.

## 2026-06-21 Runtime Reliability + Taxonomy Normalization

### What Changed

This checkpoint tested the runtime reliability instrumentation added after the source-window pass.

Implementation details:

- Added stage-level runtime diagnostics to failed and completed V2 quality reports.
- Recorded per-stage call count, attempt count, retry count, failed attempt count, duration, and stable error type.
- Added `unitKnowledgeMap` taxonomy normalization for model enum drift:
  - unknown micro `role` values are mapped to the nearest stable role and preserved as `rawRole`;
  - unknown `assessmentValue` values are mapped to the nearest stable value and preserved as `rawAssessmentValue`;
  - missing `suggestedEvidenceAngles` falls back to an empty array.

### Failed Attempts Before The Fix

Model `sourceMap` run:

- JSON: `runs/20260621-164702-v2-runtime-reliability-max6-rerun.json`
- HTML: `reports/20260621-164702-v2-runtime-reliability-max6-rerun.html`
- Status: failed at `v2_sourceMap`.
- Runtime finding: `empty_structured_text` happened 3 times. The failure is a provider structured-output failure, not a downstream schema issue.

Deterministic-source run before normalization:

- JSON: `runs/20260621-165026-v2-runtime-reliability-deterministic-source-max6.json`
- HTML: `reports/20260621-165026-v2-runtime-reliability-deterministic-source-max6.html`
- Status: failed at contract validation.
- Error: `unitKnowledgeMap.units[5].microKnowledgePoints[3].role` used a taxonomy label outside the stable enum.
- Runtime finding: no failed model attempts. The model returned parseable JSON; the failure was a contract-normalization gap.

### Completed Run After Normalization

The rerun was completed with deterministic source blocks. The environment label was mistyped, so artifacts were written to the default `v2-quality` directory instead of this article slug directory:

- JSON: `../v2-quality/runs/20260621-165437-v2-quality.json`
- HTML: `../v2-quality/reports/20260621-165437-v2-quality.html`

Metrics:

| Metric | Source context window | Runtime reliability rerun |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 14 | 13 |
| Multiple choice | 10 | 6 |
| Matching | 4 | 7 |
| Diagnostic issues | 1 | 0 |
| Model calls | 26 | 26 |
| Prompt tokens | 103,951 | 102,309 |
| Completion tokens | 41,323 | 44,672 |
| Total tokens | 145,274 | 146,981 |
| Prompt cache miss tokens | 67,599 | 65,573 |
| Runtime failed attempts | 2 | 2 |
| Runtime retry attempts | 2 | 2 |

Unit coverage in the completed rerun:

- `游戏化的定义与理论基础`: 3 questions, including 2 matching.
- `DMC模型：动力、机制与组件`: 2 matching questions.
- `阶段性目标的设定`: 2 questions, including 1 matching.
- `挑战与能力的动态匹配`: 2 multiple-choice questions.
- `成长机制的感知设计`: 2 questions, including 1 matching.
- `情境设计与身份认同建构`: 2 questions, including 1 matching.

### Conclusion

The runtime instrumentation is effective. It separated three different failure classes that previously looked similar:

- provider returned no structured text (`empty_structured_text`);
- model returned parseable JSON but drifted outside our internal taxonomy;
- later stages completed with normal retry accounting.

The taxonomy-normalization fix was useful: after the fix, the same deterministic-source path completed instead of failing on an enum label.

The new structure is partially effective:

- Good: DMC no longer disappears. It remains its own unit and receives high-value 4x4 matching coverage.
- Good: matching is not suppressed; the rerun produced 7 matching questions.
- Good: prompt tokens stayed close to the source-context-window pass and far below the pre-window slim-review-plan run.
- Risk: visible stem style regressed. 10 of 13 stems use exam-like phrasing such as `根据...`, `请将...`, or `以下哪...`.
- Risk: `unitKnowledgeMap` still produced one overlong/unparseable attempt before succeeding.
- Risk: `ecdPlanning` still produced one unparseable attempt before succeeding.

Next iteration should not add another macro layer. It should stabilize the existing split structure:

- make `unitKnowledgeMap` output more compact so it does not overrun JSON;
- make `ecdPlanning` selected-task output more compact and less likely to truncate;
- tighten visible draft wording so generated stems follow the golden-sample style instead of exam-style instructions.

## 2026-06-21 Task Brief Pipeline Checkpoint

### What Changed

This checkpoint replaced the heaviest part of the ECD experiment path:

- Removed `ecdPlanning` from the default V2 main chain.
- Added a single batched `taskBriefPlan` stage after `unitKnowledgeMap`.
- Kept ECD as a prompt thinking method: learning object -> observable evidence -> fitting task -> question plan.
- Stopped asking the model to emit heavy ECD JSON fields such as target matrices, selected task rationale, or long internal reasoning.
- Kept the existing frontend-visible contract stable.

The historical `ecdPlanning` module remains in the codebase for comparison, but the default generator no longer calls it.

### Artifacts

- JSON: `runs/20260621-173146-v2-task-brief-plan-max6.json`
- HTML: `reports/20260621-173146-v2-task-brief-plan-max6.html`

### Metrics

| Metric | Runtime reliability rerun | Task brief checkpoint |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 13 | 13 |
| Multiple choice | 6 | 10 |
| Matching | 7 | 3 |
| Diagnostic issues | 0 | 0 |
| Successful model calls | 24 | 16 |
| Model usage attempts | 26 | 18 |
| Prompt tokens | 102,309 | 56,524 |
| Completion tokens | 44,672 | 28,220 |
| Total tokens | 146,981 | 84,744 |
| Prompt cache miss tokens | 65,573 | 37,708 |
| Runtime failed attempts | 2 | 2 |
| Runtime retry attempts | 2 | 2 |

Stage totals in the completed run:

| Stage | Calls | Total tokens |
| --- | ---: | ---: |
| `reviewPathPlan` | 1 | 11,557 |
| `unitKnowledgeMap` | 1 | 11,116 |
| `taskBriefPlan` | 1 | 11,724 |
| `multipleChoiceDraft` | 5 | 16,002 |
| `unitSummaryDraft` | 6 | 15,377 |
| `matchingDraft` | 4 attempts / 2 successful calls | 18,968 |

Unit coverage:

- `游戏化的概念与核心定义`
- `心流理论：挑战与能力的动态平衡`
- `DMC模型：游戏化元素的金字塔分层`
- `阶段性目标的设定`
- `挑战与能力的动态匹配`
- `成长机制的感知设计`

### Conclusion

This checkpoint is technically effective but not the final architecture.

What improved:

- The main call count dropped from 24 successful calls to 16.
- Total token usage dropped from about 147k to about 85k.
- DMC stayed as an independent unit, so the task-brief layer did not recreate the earlier structural omission.
- The run still produced matching questions, so matching is not disabled by the new architecture.

What remains:

- Both runtime failures happened in `matchingDraft`: one JSON parse failure and one empty structured text failure before retry success.
- Draft generation is still per unit, so `multipleChoiceDraft`, `matchingDraft`, and `unitSummaryDraft` remain the performance and stability bottlenecks.
- Matching count dropped from 7 to 3 compared with the prior runtime rerun. This may be acceptable if the 3 matching questions are higher-value, but it requires manual quality review.

Next checkpoint should batch draft generation:

- `questionDraftBatch`: generate all selected MC and matching questions in one or two batched calls.
- `unitCopyBatch`: generate all unit overview / summary copy in one call.
- Keep ECD as prompt guidance inside each stage, not as a separate heavy JSON artifact.

## 2026-06-21 Batched Draft Checkpoint

### What Changed

This checkpoint tested the second slimming step after `taskBriefPlan`:

- Added `questionDraftBatch` to generate all planned multiple-choice and matching questions in one batched stage.
- Added `unitCopyBatch` to generate all unit overview and summary copy in one batched stage.
- Tightened `taskBriefPlan` after an initial failed run:
  - `practiceGoals` and `questionPlans` now use only `microIds`, not both `targetIds` and `microIds`.
  - `practiceGoal.target` and `commonMisconception` are length-bounded so the plan stage stays a true brief.
  - ECD remains an implicit thinking method, not a heavy emitted JSON artifact.

### Artifacts

Initial failed batch run:

- JSON: `runs/20260621-175416-v2-batched-draft-max6.json`
- HTML: `reports/20260621-175416-v2-batched-draft-max6.html`

Completed compact-brief rerun:

- JSON: `runs/20260621-180107-v2-batched-draft-compact-brief-max6.json`
- HTML: `reports/20260621-180107-v2-batched-draft-compact-brief-max6.html`

### Metrics

| Metric | Task brief checkpoint | Batched draft compact-brief |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 13 | 11 |
| Multiple choice | 10 | 10 |
| Matching | 3 | 1 |
| Diagnostic issues | 0 | 0 |
| Successful model calls | 16 | 5 |
| Model usage attempts | 18 | 8 |
| Prompt tokens | 56,524 | 69,510 |
| Completion tokens | 28,220 | 39,612 |
| Total tokens | 84,744 | 109,122 |
| Runtime failed attempts | 2 | 3 |
| Runtime retry attempts | 2 | 3 |

Stage totals in the completed compact-brief rerun:

| Stage | Attempts | Total tokens | Note |
| --- | ---: | ---: | --- |
| `reviewPathPlan` | 2 | 25,333 | 1 retry |
| `unitKnowledgeMap` | 1 | 11,888 | success |
| `taskBriefPlan` | 2 | 26,918 | 1 retry, succeeded after compact schema |
| `questionDraftBatch` | 2 | 33,065 | 1 retry, largest bottleneck |
| `unitCopyBatch` | 1 | 11,918 | success |

Unit coverage in the completed compact-brief rerun:

- `游戏化的概念与核心定义`: 2 multiple-choice questions.
- `DMC模型：游戏化的金字塔分层结构`: 1 matching question.
- `阶段性目标设定`: 2 multiple-choice questions.
- `挑战与能力的动态匹配`: 2 multiple-choice questions.
- `成长机制的感知设计`: 2 multiple-choice questions.
- `情境设计与身份认同`: 2 multiple-choice questions.

### Conclusion

This checkpoint proves that batched draft generation is technically possible, but this exact batch size is not yet better than the previous checkpoint.

What improved:

- Successful model calls dropped from 16 to 5.
- The chain still completed after tightening `taskBriefPlan`.
- DMC stayed as an independent unit and still received a matching question.
- `unitCopyBatch` looks structurally stable.

What regressed:

- Total token usage increased from about 85k to about 109k because retry cost and batched JSON size outweighed call-count savings.
- Runtime retries increased from 2 to 3.
- Matching coverage dropped from 3 questions to 1 question.
- `questionDraftBatch` became the new largest stability and latency risk.

Decision:

- Keep the code and artifact as a checkpoint, because it gives useful evidence.
- Do not treat this exact architecture as final.
- The next iteration should avoid a single huge `questionDraftBatch`. A better candidate is two medium stages:
  - `multipleChoiceDraftBatch`, batched across units but only for MC questions.
  - `matchingDraftBatch`, batched only for selected matching tasks, or kept per matching group if JSON stability remains poor.
- `unitCopyBatch` can likely stay batched.

## 2026-06-21 DSPy-Style Typed Draft Batch Checkpoint

### What Changed

This checkpoint implemented the medium-grained architecture suggested by the previous mixed batch run:

- Kept `sourceMap/deterministic -> reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan`.
- Replaced the default mixed `questionDraftBatch` with:
  - `multipleChoiceDraftBatch`: only generates selected multiple-choice plans.
  - `matchingDraftBatch`: only generates selected matching plans.
- Kept `unitCopyBatch`.
- Trimmed typed batch inputs so each batch receives only the relevant `questionPlans` and the `practiceGoals` referenced by those plans.
- Kept the old `questionDraftBatch` code as a rollback/historical experiment, but it is no longer the default main-chain stage.

### Artifacts

- JSON: `runs/20260621-183909-v2-typed-draft-batches-max6.json`
- HTML: `reports/20260621-183909-v2-typed-draft-batches-max6.html`

### Metrics

| Metric | Task brief checkpoint | Mixed `questionDraftBatch` | Typed draft batches |
| --- | ---: | ---: | ---: |
| Units | 6 | 6 | 6 |
| Questions | 13 | 11 | 12 |
| Multiple choice | 10 | 10 | 10 |
| Matching | 3 | 1 | 2 |
| Diagnostic issues | 0 | 0 | 5 |
| Successful model calls | 16 | 5 | 6 |
| Model usage attempts | 18 | 8 | 6 |
| Prompt tokens | 56,524 | 69,510 | 45,544 |
| Completion tokens | 28,220 | 39,612 | 22,755 |
| Total tokens | 84,744 | 109,122 | 68,299 |
| Runtime failed attempts | 2 | 3 | 0 |
| Runtime retry attempts | 2 | 3 | 0 |

Stage totals in the typed batch run:

| Stage | Attempts | Note |
| --- | ---: | --- |
| `reviewPathPlan` | 1 | success |
| `unitKnowledgeMap` | 1 | success |
| `taskBriefPlan` | 1 | success |
| `multipleChoiceDraftBatch` | 1 | success |
| `matchingDraftBatch` | 1 | success |
| `unitCopyBatch` | 1 | success |

Unit coverage:

- `游戏化的概念与核心定义`: 2 multiple-choice questions.
- `DMC模型：游戏元素的金字塔分层结构`: 2 matching questions.
- `阶段性目标设定：从里程碑到习惯养成`: 2 multiple-choice questions.
- `挑战与能力的动态匹配：心流与自适应机制`: 2 multiple-choice questions.
- `成长机制的感知设计：可视化进步与社交互动`: 2 multiple-choice questions.
- `情境设计与身份认同建构：叙事与角色代入`: 2 multiple-choice questions.

### Conclusion

This checkpoint is currently the best technical balance among the three recent architectures.

What improved:

- Compared with the task brief per-stage run, successful model calls dropped from 16 to 6.
- Compared with the mixed `questionDraftBatch` run, total tokens dropped from about 109k to about 68k.
- Runtime failures and retries dropped to zero.
- DMC remained an independent unit and received matching questions, so the typed split did not erase the structural knowledge point.
- Matching coverage recovered from 1 to 2 compared with mixed batch, though it is still below the task brief per-stage run's 3.

What remains:

- The deterministic diagnostics found 5 issues, mainly stem wording with an exam-like style such as “以下/下列表述”.
- The next iteration should optimize visible stem language and option phrasing, not add another heavy planning layer.
- `taskBriefPlan` remains the next stage to monitor on longer articles, because it still carries the full cross-unit task selection responsibility.

Decision:

- Treat typed draft batches as the current default candidate chain.
- Keep mixed `questionDraftBatch` only as a historical checkpoint / rollback reference.
- Continue iterating with DSPy-style discipline: clear signature boundaries, smaller output schemas, validation, and metric comparison after each change.

## 2026-06-21 MC Misconception + Flexible Matching Test Attempt

### What Changed

- Restored the misconception-first selection flow inside `multipleChoiceDraftBatch` without rolling back the typed batch architecture.
- Relaxed matching output contracts from fixed 4x4 to natural 2-4 pairs, with equal left/right/pair counts.

### Artifacts

- Failed sourceMap JSON: `runs/20260621-190022-v2-mc-misconception-matching-flex-max6.json`
- Failed sourceMap HTML: `reports/20260621-190022-v2-mc-misconception-matching-flex-max6.html`
- Failed taskBriefPlan JSON: `runs/20260621-190244-v2-mc-misconception-matching-flex-max6-rerun.json`
- Failed taskBriefPlan HTML: `reports/20260621-190244-v2-mc-misconception-matching-flex-max6-rerun.html`
- Failed sourceMap rerun JSON: `runs/20260621-190534-v2-mc-misconception-matching-flex-max6-rerun2.json`
- Failed sourceMap rerun HTML: `reports/20260621-190534-v2-mc-misconception-matching-flex-max6-rerun2.html`

### Result

No completed question-quality result was produced.

- Attempt 1 failed at `sourceMap` after 3 structured-output attempts.
- Attempt 2 passed `sourceMap`, `reviewPathPlan`, `unitKnowledgeMap`, and `taskBriefPlan`, then failed final contract validation because several `taskBriefPlan.questionPlans[].purpose` values were outside the supported taxonomy.
- Attempt 3 failed again at `sourceMap` after 3 structured-output attempts.

### Conclusion

This run does not prove whether the misconception-first MC prompt improved question quality, because no attempt reached visible question drafting.

The immediate blocker is run stability:

- `sourceMap` still depends on provider structured-output behavior for article-link runs and can fail before any prompt-quality change is exercised.
- `taskBriefPlan` needs taxonomy normalization or tighter model-facing enum guidance so harmless purpose aliases do not block the whole run.

Next experiment should first stabilize those two points, then rerun the same MC/matching-flex change and compare unit 1 option quality against `20260621-183909-v2-typed-draft-batches-max6`.

### Deterministic Source Rerun

Because two of the three normal article-link runs failed before question drafting at `sourceMap`, the same MC/matching-flex change was rerun with `V2_SOURCE_MAP_MODE=deterministic`.

- JSON: `runs/20260621-190911-v2-mc-misconception-matching-flex-max6-deterministic-source.json`
- HTML: `reports/20260621-190911-v2-mc-misconception-matching-flex-max6-deterministic-source.html`

Metrics:

| Metric | Previous typed draft batches | MC misconception + flexible matching, deterministic source |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 12 | 16 |
| Multiple choice | 10 | 13 |
| Matching | 2 | 3 |
| Diagnostic issues | 5 | 1 |
| Runtime failed attempts | 0 | 0 |
| Runtime retry attempts | 0 | 0 |
| Total tokens | 68,299 | 73,183 |

Observations:

- The run completed once source mapping was deterministic, confirming that the previous sourceMap failures were a structured-output stability problem rather than a downstream question-quality problem.
- Unit 1 option quality improved compared with `20260621-183909-v2-typed-draft-batches-max6`: distractors now target “directly moving game mechanics,” “points/badges only,” “pure entertainment,” and “game context vs non-game context” misconceptions more clearly.
- Matching output now uses natural pair counts: DMC produced 3 pairs, growth-design cases produced 2 pairs, and narrative/identity cases produced 3 pairs.

Conclusion:

- The MC misconception prompt repair and flexible matching contract are directionally effective.
- The P0 blocker is now structured-output stability. The normal article-link path still failed repeatedly at sourceMap or taxonomy validation, while deterministic source mode completed. The next architecture pass should prioritize a DSPy-style adapter/typed-parser layer and deterministic preprocessing for large source maps before further prompt-quality tuning.

## 2026-06-21 Default Deterministic SourceMap + Purpose Normalization

### What Changed

- Changed V2 generation default `sourceMapMode` from model-generated to deterministic source splitting.
- Kept `V2_SOURCE_MAP_MODE=model` as an explicit historical/contrast path.
- Added normalization for common `taskBriefPlan.questionPlans[].purpose` aliases, preserving `originalPurpose` for diagnostics while mapping harmless labels back to the supported taxonomy.
- Updated stage-contract docs to state that source blocks and anchors are engineering-owned, not model-owned.

### Artifacts

- JSON: `runs/20260621-192159-v2-default-deterministic-source-purpose-normalized-max6.json`
- HTML: `reports/20260621-192159-v2-default-deterministic-source-purpose-normalized-max6.html`

### Result

| Metric | Deterministic source rerun | Default deterministic source + purpose normalization |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 16 | 12 |
| Multiple choice | 13 | 9 |
| Matching | 3 | 3 |
| Diagnostic issues | 1 | 0 |
| Runtime failed attempts | 0 | 1 |
| Runtime retry attempts | 0 | 1 |
| Model calls | 6 | 6 successful / 7 attempts |
| Total tokens | 73,183 | 79,307 |

Stage stability:

- `sourceMap` no longer called the model in the default path.
- `reviewPathPlan`, `unitKnowledgeMap`, `multipleChoiceDraftBatch`, `matchingDraftBatch`, and `unitCopyBatch` succeeded on the first attempt.
- `taskBriefPlan` failed once with `json_parse_error` after a long partial JSON response, then succeeded on retry.

Visible output notes:

- DMC remained an independent unit and received a natural 3-pair matching question.
- Matching questions used natural pair counts rather than forced 4x4.
- Unit 1 option quality remained acceptable but produced fewer total questions than the previous deterministic-source run.

### Conclusion

This checkpoint fixes the unreliable source-map architecture: the model no longer has to re-output the full article as JSON before generation can begin.

The remaining P0 reliability issue is now concentrated in `taskBriefPlan`. Its first failed attempt consumed a large completion before JSON parsing failed, which explains the higher total token count despite removing model sourceMap. The next reliability iteration should reduce `taskBriefPlan` output size or split/streamline that stage, rather than adding more prompt rules.

## 2026-06-21 Compact TaskBriefPlan Contract

### What Changed

- Slimmed the model-facing `taskBriefPlan` schema.
- The model now outputs semantic planning only:
  - `practiceGoals[].kind`
  - `practiceGoals[].target`
  - `practiceGoals[].commonMisconception`
  - `practiceGoals[].microIds`
  - `questionPlans[].type`
  - `questionPlans[].purpose`
  - `questionPlans[].goalIndex`
  - `questionPlans[].microIds`
  - optional `relationType`
- The backend adapter hydrates deterministic fields:
  - `practiceGoal.id`
  - `questionPlan.id`
  - `questionPlan.practiceGoalId`
  - `sourceAnchorId`
- Reduced `taskBriefPlan` estimated output budget from `5600` to `3800`.

This follows the current DSPy-style direction: keep the model responsible for semantic decisions, and move stable IDs / source anchors into typed code adapters.

### Artifacts

- JSON: `runs/20260621-193327-v2-compact-task-brief-max6.json`
- HTML: `reports/20260621-193327-v2-compact-task-brief-max6.html`

### Result

| Metric | Previous deterministic + purpose normalized | Compact taskBriefPlan |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 12 | 13 |
| Multiple choice | 9 | 12 |
| Matching | 3 | 1 |
| Diagnostic issues | 0 | 1 |
| Runtime failed attempts | 1 | 1 |
| Runtime retry attempts | 1 | 1 |
| Model calls | 6 successful / 7 attempts | 6 successful / 7 attempts |
| Total tokens | 79,307 | 83,001 |

`taskBriefPlan` stage comparison:

| Run | Attempts | Prompt tokens | Completion tokens | Total tokens | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Previous | 2 | 17,366 | 8,336 | 25,702 | first attempt hit `json_parse_error` at 5,601 completion tokens |
| Compact | 1 | 9,823 | 2,403 | 12,226 | passed on first attempt |

Stage stability:

- `taskBriefPlan` passed on the first attempt in 17s.
- The remaining retry moved to `multipleChoiceDraftBatch`.
- `multipleChoiceDraftBatch` first attempt hit `json_parse_error` at the full 6,500 completion-token budget, then succeeded on retry with 5,858 completion tokens.

Visible output notes:

- DMC remained an independent unit and received a natural matching question.
- The run produced 13 questions across 6 units.
- One diagnostic issue remains: `u5 / q-u5-002` had weak distractors because the correct option was visibly more complete than the alternatives.

### Conclusion

The compact `taskBriefPlan` contract fixed the targeted P0 instability for this stage: deterministic IDs and anchors no longer need to be model-generated, and the stage no longer retries or approaches the old 5,600-token truncation zone.

This did not reduce total run cost because the new bottleneck is `multipleChoiceDraftBatch`. The next reliability checkpoint should apply the same typed-adapter principle to MC draft output: keep the model focused on question semantics, reduce repeated deterministic fields, and consider smaller batches if one all-unit MC batch continues to hit JSON truncation.

## 2026-06-21 DSPy Pyramid Scoped Multiple Choice

### What Changed

- Extracted the V2 orchestration into a named `v2GenerationProgram` so the generation path is easier to reason about as a DSPy-style workflow.
- Added a deterministic `QuestionBriefAdapter` layer:
  - carries `practiceGoal.target`
  - carries `practiceGoal.commonMisconception`
  - carries only relevant micro evidence
  - does not carry full article text or all-unit source context
- Replaced the all-unit `multipleChoiceDraftBatch` main path with scoped `multipleChoiceDraftUnitBatch` calls.
- Kept matching as a separate typed batch so relationship-heavy units can still select matching naturally.

This is the first run that matches the intended pyramid shape more closely:

```text
Article
  -> reviewPathPlan
  -> unitKnowledgeMap
  -> taskBriefPlan
  -> QuestionBriefAdapter
  -> unit-scoped multipleChoiceDraftUnitBatch
  -> matchingDraftBatch
  -> unitCopyBatch
```

### Artifacts

- JSON: `runs/20260621-201141-v2-dspy-pyramid-scoped-mc-max6.json`
- HTML: `reports/20260621-201141-v2-dspy-pyramid-scoped-mc-max6.html`

### Result

| Metric | Compact taskBriefPlan / all-unit MC | DSPy pyramid scoped MC |
| --- | ---: | ---: |
| Units | 6 | 6 |
| Questions | 13 | 12 |
| Multiple choice | 12 | 10 |
| Matching | 1 | 2 |
| Diagnostic issues | 1 | 0 |
| Runtime failed attempts | 1 | 0 |
| Runtime retry attempts | 1 | 0 |
| Total tokens | 83,001 | 66,367 |

Stage stability:

- `reviewPathPlan`: success on first attempt.
- `unitKnowledgeMap`: success on first attempt.
- `taskBriefPlan`: success on first attempt.
- `multipleChoiceDraftUnitBatch`: 5 scoped calls, all success on first attempt.
- `matchingDraftBatch`: success on first attempt.
- `unitCopyBatch`: success on first attempt.

Visible output notes:

- DMC stayed as an independent unit and received 2 matching questions.
- No diagnostic issues were reported.
- The output avoided the previous all-unit MC JSON retry.
- Manual review still needed: this run combines `心流理论` and `实用-享乐框架` into one unit, and does not surface the growth-mechanism unit that appeared in some earlier runs. This is not a current P0 stability failure, but it should remain a knowledge-coverage watch item.

### Conclusion

This checkpoint supports the current architecture direction:

- Keep ECD as an embedded design method, not a heavy model-visible JSON artifact.
- Keep DSPy-style signatures, but avoid one model call per tiny deterministic field.
- Use typed adapters for stable metadata and scoped model calls for semantic drafting.

The next checkpoint should add architecture metrics to the HTML report and README: per-stage call count, prompt/completion tokens, retry count, and question-quality notes. That will make future architecture choices less subjective.

## 2026-06-22 Prompt Copy Cleanup Regression

### What Changed

- Cleaned the prompt architecture after the prompt-system review:
  - `unitCopyBatch` no longer asks the model to generate the fixed unit completion title.
  - Historical `unitSummaryDraft` was aligned with the same rule.
  - The backend injects the fixed user-visible title `单元完成` instead of asking the model to output it.
- Updated stage contracts and field contracts so fixed UI copy is not treated as model-generated content.
- Regenerated the prompt structure documentation page after the prompt edits.

### Artifacts

- JSON: `runs/20260622-234906-v2-prompt-copy-cleanup-regression.json`
- HTML: `reports/20260622-234906-v2-prompt-copy-cleanup-regression.html`

### Result

| Metric | DSPy pyramid scoped MC | Prompt copy cleanup regression |
| --- | ---: | ---: |
| Status | completed | failed_generation |
| Questions | 12 | 0 |
| Runtime failed attempts | 0 | 6 |
| Runtime retry attempts | 0 | 5 |
| Model calls | not recorded in this README row | 8 |
| Total tokens | 66,367 | 119,487 |

Stage notes:

- `reviewPathPlan` completed.
- `unitKnowledgeMap` completed.
- `taskBriefPlan` failed after structured-output retries.
- The run did not reach question drafting, so visible question quality cannot be judged from this experiment.

### Conclusion

This checkpoint successfully preserved a code/documentation rollback point for the prompt-copy cleanup, but the quality run exposed a remaining P0 reliability issue in `taskBriefPlan`: structured JSON output is still unstable enough to fail the whole generation path and burn retry tokens.

The next checkpoint should focus narrowly on `taskBriefPlan` stability and payload design before judging question quality again. The likely direction is to keep the DSPy-style pyramid, but make `taskBriefPlan` either smaller, more deterministic, or split into a stable adapter boundary that does not require one large, fragile JSON response.

## 2026-06-23 Task Brief Slim Regression Fix

### What Changed

- Slimmed `taskBriefPlan` back into a lightweight task-brief stage after the failed prompt-copy cleanup regression.
- Removed the heavier planning wording that asked the same stage to handle detailed coverage reasoning, multi-angle evidence planning, and relationship-selection rationale in one large all-unit JSON.
- Kept the downstream MC/matching draft prompts as the place where detailed question-writing quality rules live.

### Artifacts

- JSON: `runs/20260623-000027-v2-task-brief-slim-regression-fix.json`
- HTML: `reports/20260623-000027-v2-task-brief-slim-regression-fix.html`

### Result

| Metric | Prompt copy cleanup regression | Task brief slim regression fix |
| --- | ---: | ---: |
| Status | failed_generation | failed_generation |
| Failed stage | `v2_taskBriefPlan` | `v2_unitKnowledgeMap` |
| Questions | 0 | 0 |
| Runtime failed attempts | 6 | 3 |
| Runtime retry attempts | 5 | 2 |
| Model calls | 8 | 4 |
| Total tokens | 119,487 | 61,353 |

### Conclusion

The task-brief slimming fixed the immediate failure mode enough that the next run reached earlier-stage diagnosis instead of failing at `taskBriefPlan`. However, it exposed that `unitKnowledgeMap` had the same class of issue: a large all-unit JSON stage with heavy per-micro fields can fail structured output and burn retry tokens before question drafting starts.

## 2026-06-23 Knowledge Map Slim Regression Fix

### What Changed

- Slimmed `unitKnowledgeMap` model output:
  - `sourceAnchorId` and `sourceSupport` are no longer required model outputs for every micro knowledge point.
  - `sourceAnchorId` is inherited from the unit where needed downstream.
  - `sourceSupport` is removed from the main generation path because it is useful for diagnostics but not required for question drafting.
  - Added tighter schema guidance for short `title`, short `summary`, and 1-3 `suggestedEvidenceAngles`.
- Kept the DSPy-style pyramid intact:
  - `reviewPathPlan -> unitKnowledgeMap -> taskBriefPlan -> QuestionBriefAdapter -> scoped draft stages`.
- Regenerated the prompt-system structure HTML after the prompt/schema changes.

### Artifacts

- JSON: `runs/20260623-000646-v2-knowledge-map-slim-regression-fix.json`
- HTML: `reports/20260623-000646-v2-knowledge-map-slim-regression-fix.html`

### Result

| Metric | DSPy pyramid scoped MC | Prompt copy cleanup regression | Knowledge map slim regression fix |
| --- | ---: | ---: | ---: |
| Status | completed | failed_generation | completed |
| Units | 6 | 0 | 9 |
| Questions | 12 | 0 | 21 |
| Multiple choice | 10 | 0 | 17 |
| Matching | 2 | 0 | 4 |
| Diagnostic issues | 0 | 0 | 1 |
| Runtime failed attempts | 0 | 6 | 3 |
| Runtime retry attempts | 0 | 5 | 3 |
| Model calls | not recorded in this README row | 8 | 16 |
| Total tokens | 66,367 | 119,487 | 120,669 |

Stage notes:

- `reviewPathPlan` failed once, then succeeded.
- `unitKnowledgeMap` failed twice, then succeeded.
- `taskBriefPlan` succeeded on the first attempt after slimming.
- All scoped `multipleChoiceDraftUnitBatch` calls succeeded on the first attempt.
- `matchingDraftBatch` and `unitCopyBatch` succeeded on the first attempt.

Visible output notes:

- The output recovered broad coverage: 9 units and 21 questions.
- DMC stayed independent and received matching questions.
- The run produced 4 matching questions, so matching selection still works after the slim fix.
- One diagnostic issue remains: `q-unit-4-002` has weak distractors because the correct option is visibly more complete than alternatives.

### Conclusion

The slim fix restored end-to-end generation, but it did not fully solve reliability or cost. The architectural lesson is important: the default path can tolerate detailed ECD-inspired reasoning inside small scoped draft stages, but large all-unit JSON stages (`reviewPathPlan`, `unitKnowledgeMap`) still need either smaller schemas, deterministic adapters, or per-unit/scoped calls. The next stability checkpoint should focus on reducing retries in `reviewPathPlan` and `unitKnowledgeMap`, not on adding more prompt rules.

## 2026-06-23 Review Path And Knowledge Map Length Limits

### Hypothesis

The previous successful run showed that `reviewPathPlan` and `unitKnowledgeMap` consumed about 49.9k tokens together and caused all retries. This experiment tested whether mobile-facing length limits and lower output budgets could stabilize those early all-unit JSON stages without changing teaching strategy.

### What Changed

- Added explicit mobile display length limits to `reviewPathPlan`:
  - chapter title, summary-card text, unit title, node label, short summary, detail summary, unit reason, and chapter encouragement text.
- Tightened `unitKnowledgeMap` output:
  - micro title <= 28 chars;
  - micro summary <= 72 chars;
  - suggested evidence angles limited to 1-2 short phrases.
- Lowered output budgets:
  - `reviewPathPlan`: 3200 -> 2400 estimated output tokens per attempt.
  - `unitKnowledgeMap`: 7200 -> 4800 estimated output tokens per attempt.
- Did not move `chapterSummary.encouragementText` to `unitCopyBatch` in this round, because the current copy stage is per-unit and moving chapter-level copy there would add another variable.

### Artifacts

- JSON: `runs/20260623-050536-v2-review-knowledge-length-limits.json`
- HTML: `reports/20260623-050536-v2-review-knowledge-length-limits.html`

### Result

| Metric | Knowledge map slim regression fix | Review/knowledge length limits |
| --- | ---: | ---: |
| Status | completed | failed_generation |
| Failed stage | none | `v2_unitKnowledgeMap` |
| Units | 9 | 0 |
| Questions | 21 | 0 |
| Runtime failed attempts | 3 | 4 |
| Runtime retry attempts | 3 | 3 |
| Model calls | 16 | 5 |
| Prompt tokens | 89,720 | 45,429 |
| Completion tokens | 30,949 | 19,147 |
| Total tokens | 120,669 | 64,576 |

Stage notes:

- `reviewPathPlan` still failed once with `json_parse_error`, then succeeded on retry.
- `unitKnowledgeMap` failed three times and stopped generation:
  - 2 x `empty_structured_text`;
  - 1 x `json_parse_error`.
- The failed run still burned 64.6k tokens before any question drafting happened.

### Conclusion

This change is **not sufficient to keep as-is**. Length limits reduce the intended output surface, but the early `unitKnowledgeMap` stage remains structurally brittle because it still asks the model to return one all-unit micro-map JSON. The next stability fix should not add more wording; it should change the shape of the stage:

- either split `unitKnowledgeMap` into smaller scoped calls;
- or convert it into a minimal deterministic/index-like stage;
- or make the model output only unit-local micro titles and brief summaries while deriving the rest downstream.

The main lesson is that mobile-length bounds are useful for product copy and schema hygiene, but they do not by themselves solve structured-output stability when a stage is still too broad.

## 2026-06-23 Scoped Unit Knowledge Map

### Hypothesis

The previous failure showed that `unitKnowledgeMap` was structurally brittle because it asked the model to output all units' micro knowledge maps in one large JSON. This experiment changed the stage to per-unit scoped calls so each model call only sees one planned unit and that unit's source window.

### What Changed

- `unitKnowledgeMap` is now called once per planned unit.
- Each call receives:
  - one-unit `reviewPathPlan`;
  - the current unit's source window;
  - the current unit's source context note.
- The pipeline merges the scoped outputs back into the existing downstream shape:

```json
{ "units": [...] }
```

- `reviewPathPlan` output budget was restored from 2400 to 3200 after one failed run showed the 2400 budget likely caused JSON truncation.
- `unitKnowledgeMap` output budget was reduced to 1800 per scoped unit call.

### Artifacts

- First run, blocked before testing scoped unit maps:
  - JSON: `runs/20260623-140457-v2-unit-knowledge-map-scoped.json`
  - HTML: `reports/20260623-140457-v2-unit-knowledge-map-scoped.html`
- Rerun after restoring `reviewPathPlan` budget:
  - JSON: `runs/20260623-140724-v2-unit-knowledge-map-scoped-rerun.json`
  - HTML: `reports/20260623-140724-v2-unit-knowledge-map-scoped-rerun.html`

### Result

| Metric | Knowledge map slim regression fix | Length-limit-only failed run | Scoped unit map rerun |
| --- | ---: | ---: | ---: |
| Status | completed | failed_generation | failed_generation |
| Failed stage | none | `v2_unitKnowledgeMap` | `v2_unitKnowledgeMap` |
| Units | 9 | 0 | 0 |
| Questions | 21 | 0 | 0 |
| Runtime failed attempts | 3 | 4 | 5 |
| Runtime retry attempts | 3 | 3 | 4 |
| Model calls | 16 | 5 | 8 |
| Prompt tokens | 89,720 | 45,429 | 42,572 |
| Completion tokens | 30,949 | 19,147 | 15,935 |
| Total tokens | 120,669 | 64,576 | 58,507 |

Stage notes for the scoped rerun:

- `reviewPathPlan` failed twice with `json_parse_error`, then succeeded on the third attempt.
- `unitKnowledgeMap` had 3 scoped calls:
  - unit map call 1 succeeded on first attempt;
  - unit map call 2 succeeded on first attempt;
  - unit map call 3 failed three times and stopped generation.
- Scoped `unitKnowledgeMap` token cost was 19,770 tokens, down from 39,535 in the length-limit-only failed run and 27,344 in the previous successful all-unit run.

### Conclusion

The per-unit architecture is directionally correct: it reduced the knowledge-map token cost and proved that individual unit maps can complete quickly. However, the generation path is still too brittle because one failed unit map still fails the entire chapter.

The next fix should keep the scoped architecture but add a controlled fallback for one failed unit, such as:

- deterministic fallback micro map from the planned unit title/shortSummary/detailSummary/sourceAnchor;
- or a smaller second-pass schema for the failing unit only;
- or allowing the pipeline to continue with a minimal single-micro map and marking diagnostics.

Do not revert to all-unit `unitKnowledgeMap`. The issue has moved from "large all-unit JSON is unstable" to "one scoped unit failure still blocks the whole chapter."

## 2026-06-23 Primary Evidence Angle Unit Knowledge Map

### Hypothesis

The scoped unit map failure was caused less by the per-unit architecture itself and more by an over-detailed micro-map contract. The model could identify useful micro knowledge points, but it was encouraged to output multiple evidence angles and longer summaries, which made one dense unit run into truncation/JSON instability.

This checkpoint kept the scoped architecture and reduced the unit map contract:

- `microKnowledgePoint` now means a high-value sub-knowledge point inside a unit, not the smallest possible learning atom.
- `suggestedEvidenceAngles[]` was replaced with one `primaryEvidenceAngle`.
- `micro.title`, `micro.summary`, and `primaryEvidenceAngle` now have mobile-facing length limits.
- The prompt describes positive selection behavior instead of adding broad negative constraints about not over-producing or not under-producing items.

### Artifacts

- JSON: `runs/20260623-145027-v2-unit-knowledge-map-primary-angle.json`
- HTML: `reports/20260623-145027-v2-unit-knowledge-map-primary-angle.html`

### Result

| Metric | Scoped unit map rerun | Primary evidence angle run |
| --- | ---: | ---: |
| Status | failed_generation | failed_generation |
| Failed stage | `v2_unitKnowledgeMap` | `v2_taskBriefPlan` |
| Runtime failed attempts | 5 | 3 |
| Runtime retry attempts | 4 | 2 |
| Model calls | 8 | 12 |
| Prompt tokens | 42,572 | 61,100 |
| Completion tokens | 15,935 | 21,112 |
| Total tokens | 58,507 | 82,212 |

Stage notes:

- `reviewPathPlan` succeeded on the first attempt.
- All 8 scoped `unitKnowledgeMap` calls succeeded on the first attempt.
- `unitKnowledgeMap` token cost was 26,303 tokens across 8 calls.
- The run then failed in `taskBriefPlan`:
  - 1 runtime call;
  - 3 attempts;
  - all 3 attempts returned `empty_structured_text`;
  - each attempt consumed roughly 10.8k prompt tokens and 3.8k completion tokens.

### Conclusion

This checkpoint fixed the specific scoped `unitKnowledgeMap` instability: the stage no longer retries and no longer blocks generation. The root P0 reliability issue has now moved downstream to `taskBriefPlan`.

The next iteration should not add question-quality rules. It should focus narrowly on `taskBriefPlan` payload design:

- reduce the cross-unit input it receives from `unitKnowledgeMap`;
- consider splitting task selection by unit or by a compact unit index;
- avoid asking one large stage to select every question plan for the whole chapter in a single fragile JSON response;
- preserve the DSPy-style pyramid boundary: upstream stages pass compact typed briefs, not full source or full reasoning.

## 2026-06-23 Scoped Task Brief Plan

### Hypothesis

The previous checkpoint fixed `unitKnowledgeMap` but exposed `taskBriefPlan` as the next P0 reliability bottleneck. The failure was structural: `taskBriefPlan` still received all planned units, the merged unit knowledge map, and a plan-level source union window, then tried to output all units' `practiceGoals` and `questionPlans` in one JSON response.

This checkpoint extended the scoped-unit architecture to `taskBriefPlan`:

- call `taskBriefPlan` once per planned unit;
- pass only the current unit's one-unit `reviewPathPlan`;
- pass only the current unit's `unitKnowledgeMap`;
- pass only the current unit's `unit_window` source context;
- merge scoped outputs back into the existing `{ units: [...] }` downstream contract.

No new question-quality rules were added in this checkpoint.

### Artifacts

- JSON: `runs/20260623-151023-v2-task-brief-plan-scoped.json`
- HTML: `reports/20260623-151023-v2-task-brief-plan-scoped.html`

### Result

| Metric | Primary evidence angle failed run | Scoped task brief run |
| --- | ---: | ---: |
| Status | failed_generation | completed |
| Failed stage | `v2_taskBriefPlan` | none |
| Units | 0 | 7 |
| Questions | 0 | 22 |
| Multiple choice | 0 | 17 |
| Matching | 0 | 5 |
| Runtime failed attempts | 3 | 2 |
| Runtime retry attempts | 2 | 2 |
| Model calls | 12 | 26 |
| Prompt tokens | 61,100 | 94,402 |
| Completion tokens | 21,112 | 40,212 |
| Total tokens | 82,212 | 134,614 |

Stage comparison:

| Stage | Previous taskBriefPlan shape | Scoped taskBriefPlan shape |
| --- | ---: | ---: |
| `taskBriefPlan` calls | 1 runtime call / 3 attempts | 7 runtime calls / 7 attempts |
| `taskBriefPlan` failures | 3 x `empty_structured_text` | 0 |
| `taskBriefPlan` total tokens | 43,750 | 29,966 |
| `taskBriefPlan` prompt tokens | 32,352 | 18,783 |
| `taskBriefPlan` completion tokens | 11,398 | 11,183 |

Other stage notes:

- `reviewPathPlan` succeeded on the first attempt.
- `unitKnowledgeMap` had one transient `empty_structured_text`, then recovered on retry.
- `multipleChoiceDraftUnitBatch` had one transient `json_parse_error`, then recovered on retry.
- `matchingDraftBatch` succeeded on the first attempt but took 45s and used 13,484 tokens.
- `unitCopyBatch` succeeded on the first attempt but used 20,042 tokens because it still receives broad unit copy input.

### Quality Notes

- The run generated 22 questions across 7 units.
- Matching appeared naturally in 5 units, so the system can still select matching after the scoped split.
- Deterministic diagnostics found 4 weak distractor sets where the correct option looked more like a standard answer.
- DMC appeared as a matching question under the first unit rather than as an independent unit. That means the structural reliability fix worked, but unit-boundary quality still needs a separate review.

### Conclusion

The scoped `taskBriefPlan` architecture fixed the immediate P0 failure: the stage no longer fails structured output, and its own token cost dropped from 43.8k to 30.0k while producing usable downstream plans.

The full run costs more than the failed run because it now reaches all later generation stages and produces 22 questions. The next reliability/cost bottlenecks are no longer `taskBriefPlan`; they are:

- transient retries in `unitKnowledgeMap` and `multipleChoiceDraftUnitBatch`;
- `matchingDraftBatch` still being a single broader batch;
- `unitCopyBatch` taking a large prompt payload.

The next architecture iteration should not revisit `taskBriefPlan` unless quality review finds a specific planning problem. The likely next structural optimization is to scope `matchingDraftBatch` or slim `unitCopyBatch`, while separately reviewing unit-boundary quality such as whether DMC should remain independent.

## 2026-06-24 Unit Copy Slim

### Hypothesis

`unitCopyBatch` only writes mobile UI copy for unit overview and unit completion, but the previous run passed broad per-unit payloads into it: full `practicePlan`, generated `questions`, and `sourceContext.blocks`. That made a low-risk copywriting stage consume 20,042 tokens.

This checkpoint keeps the current question-generation behavior unchanged and only slims `unitCopyBatch` input:

- pass compact unit metadata: `id / order / title / nodeLabel / shortSummary / detailSummary / why`;
- pass compact `practiceSignals`: question counts and focus targets;
- do not pass `sourceContext.blocks`;
- do not pass complete `questionPlans`;
- do not pass generated `questions`.

No new quality rules or ECD rules were added in this checkpoint.

### Artifacts

- JSON: `runs/20260624-044937-v2-unit-copy-slim.json`
- HTML: `reports/20260624-044937-v2-unit-copy-slim.html`

### Result

| Metric | Scoped task brief baseline | Unit copy slim run |
| --- | ---: | ---: |
| Status | completed | completed |
| Units | 7 | 8 |
| Questions | 22 | 23 |
| Multiple choice | 17 | 16 |
| Matching | 5 | 7 |
| Runtime failed attempts | 2 | 0 |
| Runtime retry attempts | 2 | 0 |
| Model calls | 26 | 27 |
| Prompt tokens | 94,402 | 78,960 |
| Completion tokens | 40,212 | 34,196 |
| Total tokens | 134,614 | 113,156 |
| Diagnostic issue count | 4 | 1 |

Stage token comparison:

| Stage | Baseline total tokens | Unit copy slim total tokens | Notes |
| --- | ---: | ---: | --- |
| `reviewPathPlan` | 11,649 | 11,908 | Similar |
| `unitKnowledgeMap` | 26,961 | 23,355 | One more unit, no retry |
| `taskBriefPlan` | 29,966 | 32,118 | One more unit |
| `multipleChoiceDraftUnitBatch` | 32,512 | 27,257 | No retry |
| `matchingDraftBatch` | 13,484 | 14,271 | More matching output |
| `unitCopyBatch` | 20,042 | 4,247 | 79% lower |

### Quality Notes

- The run generated one more unit and one more question than the baseline, so total model calls increased by one.
- Despite the extra unit, total token cost dropped by 21,458 tokens.
- Runtime stability improved in this run: no `empty_structured_text` and no `json_parse_error` retry occurred.
- This checkpoint does not prove all instability is solved, but it confirms that removing unnecessary downstream context can reduce cost without obvious quality loss.

### Conclusion

The unit copy slimming checkpoint worked and should be kept. The next cost/stability candidates are:

- `matchingDraftBatch`: still one broader whole-chapter batch, and token cost rises when more matching plans exist.
- `multipleChoiceDraftUnitBatch`: stable in this run, but still one call per unit and remains a major token consumer.
- `reviewPathPlan`: still determines unit boundary quality; do not change it for runtime reasons unless quality review requires it.

## 2026-06-24 Matching Brief Slim Negative Checkpoint

### Hypothesis

Because `questionBriefs` already contain relation type, practice goal, micro evidence, and source anchor, `matchingDraftBatch` might not need the full filtered `practicePlan`. This checkpoint tried to keep `matchingDraftBatch` as one whole-chapter call but pass only:

- unit metadata;
- matching `questionBriefs`;
- compact source window.

The goal was to reduce duplicated input without increasing model call count.

### Artifacts

- JSON: `runs/20260624-055559-v2-matching-brief-slim.json`
- HTML: `reports/20260624-055559-v2-matching-brief-slim.html`

### Result

| Metric | Unit copy slim run | Matching brief slim run |
| --- | ---: | ---: |
| Status | completed | completed |
| Units | 8 | 9 |
| Questions | 23 | 25 |
| Multiple choice | 16 | 18 |
| Matching | 7 | 7 |
| Runtime failed attempts | 0 | 6 |
| Runtime retry attempts | 0 | 6 |
| Model calls | 27 | 36 |
| Prompt tokens | 78,960 | 114,208 |
| Completion tokens | 34,196 | 59,922 |
| Total tokens | 113,156 | 174,130 |
| Diagnostic issue count | 1 | 1 |

Stage token comparison:

| Stage | Unit copy slim total tokens | Matching brief slim total tokens | Notes |
| --- | ---: | ---: | --- |
| `unitKnowledgeMap` | 23,355 | 32,120 | One retry and one extra unit |
| `taskBriefPlan` | 32,118 | 39,984 | One extra unit |
| `multipleChoiceDraftUnitBatch` | 27,257 | 44,467 | Three transient failures/retries |
| `matchingDraftBatch` | 14,271 | 40,771 | Two JSON parse retries |
| `unitCopyBatch` | 4,247 | 4,581 | Similar |

### Conclusion

Do not keep the matching brief-slim code change. The run completed, but it made structured-output stability worse and increased cost significantly. The matching stage appears to benefit from the hydrated filtered `practicePlan` even if it looks redundant on paper.

Action taken: revert matching brief-slim code, keep this report as a negative checkpoint. Future matching optimization should avoid the exact brief-only input shape. If matching becomes a true bottleneck later, test one of these instead:

- per-unit `matchingDraft` with strict concurrency and per-unit token measurement;
- smaller matching prompt wording while keeping hydrated `practicePlan`;
- leave matching unchanged and focus on higher-cost stages first.
