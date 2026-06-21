# V2 Prompt Diet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Reduce over-constraining negative prompt language in the V2 ECD generation pipeline and test whether a lighter, positive-goal prompt improves multi-angle question coverage.

**Architecture:** Keep the current ECD schema and orchestration intact. This iteration changes prompt wording and documentation only: engineering contract constraints stay hard, pedagogical planning constraints become positive goals rather than conservative prohibitions.

**Tech Stack:** Node.js ESM backend, V2 prompt builders, node:test, V2 quality runner, Markdown quality-run records.

---

### Task 0: Preserve Previous Checkpoint

**Files:**
- No file edits.

- [x] **Step 1: Confirm clean state**

Run:

```bash
git status --short
git rev-parse --short HEAD
```

Expected:

```text
ab5b9b6
```

- [x] **Step 2: Add checkpoint tag**

Run:

```bash
git tag checkpoint/v2-evidence-angle-before-prompt-diet-20260621 ab5b9b6
```

Expected: tag exists and can be used to return to the pre-diet evidence-angle version.

### Task 1: Identify Prompt Constraints To Relax

**Files:**
- Inspect: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Inspect: `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`
- Inspect: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`

- [x] **Step 1: Scan prompt wording**

Run:

```bash
rg -n "不要|只|必须|避免|跳过|机械|数量|supporting|optional|selectedTasks|coverageRequirement" \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md \
  experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md
```

Expected: identify pedagogical negative constraints that may push the model toward minimal output.

- [x] **Step 2: Keep engineering constraints separate**

Keep these constraints hard:

```text
JSON only
schema fields stable
sourceAnchor ids valid
four-option multiple choice
4x4 matching shape
question ids must match selected question plans
```

Relax these constraints:

```text
do not mechanically increase question count
supporting / optional can be skipped
selectedTasks only need to cover required items
matching should be avoided unless very clearly valuable
```

### Task 2: Rewrite ECD Planning Prompt As Positive Goals

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Update ECD prompt**

Replace conservative wording with positive planning language:

```text
发现所有值得考察的可观察理解点
selectedTasks should form a mastery evidence set
high-value supporting angles should be selected when they observe different understanding
question count emerges from evidence value
matching is preferred for natural structure / role / step / signal relationships
```

- [x] **Step 2: Update prompt tests**

Tests should assert that the ECD prompt includes:

```text
掌握证据组合
高价值 supporting
不以最低覆盖为目标
不同可观察理解表现
```

Tests should no longer require the old phrase:

```text
不要为了...机械...
```

### Task 3: Soften Downstream Draft Prompts Without Breaking Contract

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [x] **Step 1: Soften inactive `unitPracticePlan` prompt**

Although the stage is now deterministic, keep its prompt documentation aligned:

```text
以 selectedTasks 为计划来源
保持 questionPlans 与 selectedTasks 对齐
不要重新规划
```

Change the tone from “do not add” to “preserve ECD assembly”.

- [x] **Step 2: Soften matching prompt**

Keep structural shape hard, but replace broad prohibition with positive value criteria:

```text
优先生成层级-作用、步骤-目的、信号-动作、角色-职责这类有关系价值的 matching
如果 selected task 是 matching，应尽量实现它的关系目的
```

### Task 4: Document The Prompt-Diet Hypothesis

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md`
- Modify after test: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Add diagnosis**

Record the hypothesis:

```text
The pipeline may be structurally capable of multi-angle planning, but excessive negative constraints made the model select the minimum compliant task set.
```

- [x] **Step 2: Record new principle**

Document:

```text
Hard constraints belong to engineering contracts.
Pedagogical quality should be described as positive evidence goals.
```

### Task 5: Run Tests

**Files:**
- Test: `experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Test: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
- Test: full backend check

- [x] **Step 1: Run focused tests**

Run:

```bash
node --test \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
```

Expected: PASS.

- [x] **Step 2: Run full backend check**

Run:

```bash
npm --prefix experiments/shibei-v2/backend run check
```

Expected: PASS.

### Task 6: Run Same Golden Article Quality Test

**Files:**
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/*.json`
- Generated: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/*.html`
- Modify: `experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/README.md`

- [x] **Step 1: Run serial quality test**

Run with the existing provider key in the shell environment:

```bash
V2_SOURCE_MAP_MODE=deterministic \
V2_GENERATION_MAX_UNITS=6 \
V2_GENERATION_UNIT_CONCURRENCY=1 \
QUALITY_EXPERIMENT_SLUG=_WY2GXs-iynGePgdsYLi0A \
QUALITY_EXPERIMENT_LABEL=v2-prompt-diet-max6-serial \
QUALITY_ARTICLE_URL=https://mp.weixin.qq.com/s/_WY2GXs-iynGePgdsYLi0A \
npm --prefix experiments/shibei-v2/backend run quality:v2
```

Expected: completed report or clearly recorded provider failure.

- [x] **Step 2: Compare with previous run**

Compare against:

```text
20260620-222608-v2-evidence-angle-coverage-max6-deterministic-source-final-serial
```

Record:

```text
unit count
question count
matching count
selectedTasks per unit
angles per unit
diagnostic issue count
whether DMC gets richer multi-angle coverage
```

### Task 7: Commit

**Files:**
- All modified prompt, docs, report files.

- [x] **Step 1: Stage changes**

Run:

```bash
git add experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.js \
  experiments/shibei-v2/backend/src/v2/generation/prompts/buildV2PromptMessages.test.js \
  experiments/shibei-v2/docs/v2-ecd-product-ai-system-analysis-zh.md \
  experiments/shibei-v2/docs/v2-ecd-field-schema-draft-zh.md \
  experiments/shibei-v2/docs/quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A \
  docs/superpowers/plans/2026-06-21-v2-prompt-diet-plan.md
```

- [x] **Step 2: Commit**

Run:

```bash
git commit -m "feat(v2): lighten ECD prompt constraints"
```

Expected: commit succeeds and worktree is clean.

### Task 8: Execution Notes And Outcome

- [x] **Step 1: Record completed experiment**

Prompt changes completed:

```text
ECD planning wording changed from negative avoidance to positive mastery evidence goals.
supporting angles are no longer described as default skipped items.
selectedTasks are described as a mastery evidence set rather than minimum coverage.
matching is framed as a positive affordance for natural relationships.
```

- [x] **Step 2: Record test result**

Validation passed:

```text
node --test buildV2PromptMessages.test.js generateReviewPathV2.test.js
npm --prefix experiments/shibei-v2/backend run check
```

- [x] **Step 3: Record quality result**

Quality report:

```text
reports/20260621-002013-v2-prompt-diet-max6-serial.html
```

Result:

```text
6 units
6 questions
5 multiple choice
1 matching
0 structural issues
0 diagnostic issues
```

- [x] **Step 4: Record diagnosis**

Prompt dieting alone did not improve coverage. It reduced each unit to one required angle and one selected task. This suggests the old negative constraints were not the only root cause. The next iteration should keep prompt wording lighter but add a positive expansion objective: enumerate the full assessable sub-objective set first, then choose a sufficient mastery evidence set rather than the smallest required set.
