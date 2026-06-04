# DSPy Phase B DistractorQualityJudge Baseline: few-shot

Date: 2026-06-03T07:25:39.187611
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
Rows: 1

## Summary

- Label accuracy: 100.0%
- Issue exact accuracy: 0.0%
- Average metric score: 0.800
- Fixable recall: 0.0%
- Hard failures: 0
- Over-strict accept -> reject errors: 0
- Second-correct risk accepted: 0
- High-risk errors: 0
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 1 | 100.0% | 0.800 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 1 | 0 | 0 | 0 |
| fixable | 0 | 0 | 0 | 0 |
| reject | 0 | 0 | 0 | 0 |

## High-Risk Errors

- None.

## Hard Failures

- None.

## Over-Strict Errors

- None.

## Second-Correct Risk Accepted

- None.

## Wrong Predictions

- None.

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot and hard failures decline, Phase A examples transfer.
- If `reject -> accept` or second-correct risk remains common, do not optimize yet; fix task wording or metric first.
- If `fixable` recall remains near zero, keep fixable as a softer review queue and refine label examples before optimizer.
