# DSPy Phase B DistractorQualityJudge Baseline: zero-shot

Date: 2026-06-03T06:56:36.377711
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v1.jsonl`
Rows: 2

## Summary

- Label accuracy: 0.0%
- Issue exact accuracy: 0.0%
- Average metric score: 0.000
- High-risk errors: 2
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 2 | 0.0% | 0.000 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 0 | 0 | 2 | 0 |
| fixable | 0 | 0 | 0 | 0 |
| reject | 0 | 0 | 0 | 0 |

## High-Risk Errors

- `judge-positive-hook-q5-option-b-positive`: accept -> reject | candidate: 在Prompt中强调多次 | predicted issue: `too_obvious` | rationale: “在Prompt中强调多次”是一个过于明显无效的选项，用户很容易识别出它不是正确答案，无法起到有效的干扰作用。
- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_obvious_low_value` | rationale: “手动格式化”是一个过于明显、缺乏迷惑性的错误选项，学生一眼就能看出它不是更好的解决方案，无法有效测试对 Hook 与 Prompt 本质区别的理解。

## Wrong Predictions

- `judge-positive-hook-q5-option-b-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 在Prompt中强调多次; note: -
- `judge-positive-hook-q5-option-c-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 手动格式化; note: -

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot, Phase A examples transfer and we can consider BootstrapFewShot.
- If `reject -> accept` remains common, do not optimize yet; fix labels, metric, or task wording first.
- If `fixable` is unstable but `accept/reject` is stable, keep fixable as a softer review queue rather than a production blocking label.
