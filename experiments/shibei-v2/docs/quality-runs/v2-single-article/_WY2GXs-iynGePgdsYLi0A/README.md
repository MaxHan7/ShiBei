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

## Artifacts

- Latest JSON: `runs/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.json`
- Latest HTML: `reports/20260619-204253-v2-golden-deepseek-diagnostic-only-chat-id-normalized.html`
- Previous completed baseline JSON: `runs/20260619-181727-v2-golden-deepseek-type-enum.json`
- Previous completed baseline HTML: `reports/20260619-181727-v2-golden-deepseek-type-enum.html`

## Conclusion

The V2 generation pipeline can now complete one real article run through field-contract validation, but this run should **not** be treated as a pedagogical-quality pass. Human review found that the output violates current V2 golden-sample rules: several stems still read like article-recall questions, matching questions are often mechanical term-definition pairings, explanations are too long for the answer feedback panel, and the current `qualityJudge` passed results that should have been revised.

Detailed audit: `../../../v2-prompt-quality-gap-audit-zh.md`

## Next Experiment

Manually review the latest HTML report against the V2 golden-sample rules before adding more articles. The latest run confirms the split-stage pipeline is structurally runnable, but its pedagogy is not yet a pass: it produced no matching cards and still has weak distractor diagnostics. The next prompt iteration should move more quality rules into `unitPracticePlan` and `multipleChoiceDraft`, while keeping diagnostics advisory until the generation standard stabilizes.

After the generation prompts are closer to the V2 standard, run a controlled A/B experiment for an optional lightweight quality-rewrite role:

- A: split-stage generation without rewrite.
- B: same inputs and model, with a rewrite role that only makes small UI/wording repairs.

Do not add this rewrite role to the current structure yet. The immediate priority is still improving the first-pass generation prompts.
