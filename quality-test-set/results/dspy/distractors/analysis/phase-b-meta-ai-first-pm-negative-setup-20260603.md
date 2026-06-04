# Phase B Meta AI-first PM Negative/Fixable Candidate Setup

Date: 2026-06-03

## Purpose

This batch adds non-Hook fixable/reject candidates for `DistractorQualityJudge`. It complements the first Phase B positive batch where all 18 candidates were accepted.

## Data Source

- Article sample: `wechat-L6t8rmU_8exk2rPV--cUIA.md`
- Source archive: `quality-test-set/results/archive/2026-05-15-095415.json`
- Dataset: `quality-test-set/results/dspy/distractors/datasets/phase-b-meta-ai-first-pm-negative-candidates.v1.jsonl`
- Review page: `quality-test-set/results/dspy/distractors/reviews/phase-b-meta-ai-first-pm-negative-review.html`

## Counts

- Candidate distractors: 18
- Draft expected distribution: reject 11 / fixable 7

## Important Boundary

The `draft_expected_label` is only a setup hypothesis. The final gold label must come from user review. Do not mix this file into train/dev/test until review export has been saved.
