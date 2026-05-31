---
name: quality-experiment-record
description: Use when running or analyzing Shibei question-generation experiments, single-article diagnostics, prompt/quality-rule iterations, or quality-test-set reviews. Ensures every run saves redacted raw data, CSV review rows, and a concise experiment report.
---

# Quality Experiment Record

Use this workflow whenever the user asks to run, rerun, compare, or document a question-generation quality experiment.

## Required Workflow

1. Run the experiment through the project script before writing conclusions:

```bash
QUALITY_ARTICLE_URL=<url> \
QUALITY_EXPERIMENT_SLUG=<stable-slug> \
QUALITY_EXPERIMENT_LABEL=<short-english-label> \
npm --prefix backend run quality:single
```

2. Preserve all generated artifacts:

```text
quality-test-set/results/single-article/<slug>/runs/*.json
quality-test-set/results/single-article/<slug>/reviews/*.csv
quality-test-set/results/single-article/<slug>/analysis/*.md
```

3. Update the article `README.md` with a concise experiment record:

- hypothesis
- prompt changes
- deterministic rule changes
- key metric comparison
- conclusion
- next experiment
- links to JSON / CSV / analysis files

4. Never paste full JSON, full article text, API keys, or raw model prompts into the report.

5. Run backend validation after changing scripts or generation logic:

```bash
npm --prefix backend run check
```

## Reporting Rules

- Reports are for humans; keep them short and evidence-backed.
- JSON is for traceability; do not duplicate it in Markdown.
- CSV is for human scoring; keep all grading columns intact.
- If a run increases quantity but also increases low-confidence questions, call that out explicitly.
- Separate prompt changes from deterministic rule changes.

## Defaults

- Use stable article slugs, such as `UMr6ia1QubqOMw3aBUGbOw`.
- Use short English labels, such as `v3-type-diversity`.
- First version does not use git hooks; rely on this skill plus `quality:single`.
