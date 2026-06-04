# DSPy Phase B DistractorQualityJudge Baseline: zero-shot

Date: 2026-06-03T07:25:05.983732
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
Rows: 2

## Summary

- Label accuracy: 50.0%
- Issue exact accuracy: 0.0%
- Average metric score: 0.400
- Fixable recall: 0.0%
- Hard failures: 0
- Over-strict accept -> reject errors: 1
- Second-correct risk accepted: 0
- High-risk errors: 1
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 2 | 50.0% | 0.400 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 1 | 0 | 1 | 0 |
| fixable | 0 | 0 | 0 | 0 |
| reject | 0 | 0 | 0 | 0 |

## High-Risk Errors

- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_extreme_low_value` | rationale: “手动格式化”是一个过于极端且低价值的选项，它完全偏离了“自动化”这一核心对比维度，无法帮助学习者区分Hook与Prompt的本质区别，且与题干中“更好的解决方案”的自动化方向明显矛盾，不具备教学价值。

## Hard Failures

- None.

## Over-Strict Errors

- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_extreme_low_value`

## Second-Correct Risk Accepted

- None.

## Wrong Predictions

- `judge-positive-hook-q5-option-c-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 手动格式化; note: -

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot and hard failures decline, Phase A examples transfer.
- If `reject -> accept` or second-correct risk remains common, do not optimize yet; fix task wording or metric first.
- If `fixable` recall remains near zero, keep fixable as a softer review queue and refine label examples before optimizer.
