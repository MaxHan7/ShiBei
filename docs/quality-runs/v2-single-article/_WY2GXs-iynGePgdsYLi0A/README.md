# _WY2GXs-iynGePgdsYLi0A V2 Quality Runs

## 2026-06-29 v2-option-tone-cue-guidance

Hypothesis: adding concise multiple-choice option tone guidance can reduce distractors that reveal wrongness through absolute or negating wording, without adding model calls, retries, automatic rewrites, or hard failures.

Prompt changes:
- Added an "option tone balance" rule to V2 multiple-choice generation prompts.
- The rule asks distractors to be plausible but wrong through boundary, condition, cause, object, or scenario mismatch rather than obvious extreme wording.
- The rule asks the model to avoid concentrating terms such as 完全、一定、所有、任何、只能、不需要、无关、替代一切、百分百 in wrong options unless the source genuinely tests a boundary.

Deterministic rule changes:
- Added a diagnostic-only `v2_option_tone_cue` warning.
- It only reports when multiple distractors contain cue terms while the correct option has none.
- It does not block, rewrite, discard, or add model cost.

Run summary:
- Status: completed.
- Units: 11.
- Questions: 34 total, 20 multiple choice, 14 matching.
- Model calls: 48.
- Total tokens: 198,997.
- Blocking generation issues: 0.
- Diagnostic issues: 6 total.
- Option tone cue warnings: 2 of 20 multiple-choice questions.
- Other diagnostics: 4 existing matching relation diagnostics.

Conclusion:
- The change did not cause a generation failure and did not add model calls beyond the normal V2 pipeline.
- The prompt guidance improved the shape but did not fully eliminate cue terms. Remaining examples include distractors using 无需、完全、所有、无关.
- Because the issue is now measurable without affecting generation success, the next iteration should keep it diagnostic-only and review whether one more concise prompt sentence is enough before considering any stronger mechanism.

Artifacts:
- JSON: `runs/20260629-234710-v2-option-tone-cue-guidance.json`
- HTML: `reports/20260629-234710-v2-option-tone-cue-guidance.html`
