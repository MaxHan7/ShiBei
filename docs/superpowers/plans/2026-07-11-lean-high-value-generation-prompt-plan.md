# Lean High-Value Generation Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe V2 generation prompts from broad coverage toward a lean experience that concentrates user attention on high-value content.

**Architecture:** Keep the existing V2 pipeline and JSON schemas. Change only prompt language and prompt tests so upstream planning becomes mainline-first, unit-level micro planning becomes value-angle-first, and task planning becomes selective rather than coverage-maximizing.

**Tech Stack:** Node.js backend, V2 prompt builder tests with `node:test`, existing V2 generation schemas.

---

## Current Prompt Audit

The existing prompt stack already has useful foundations: source grounding, mobile length limits, ECD-based task planning, option quality rules, and relation-quality matching rules. The issue is that several prompt lines still optimize for broad coverage:

- `reviewPathPlan` says any paragraph with an independent learning object and source evidence should be retained, and warns not to merge/delete because of compression.
- `unitKnowledgeMap` asks for micro points according to unit knowledge density, which encourages inventory building.
- `taskBriefPlan` requires every high/medium micro point to be covered.
- `ecdPlanning` says every high/medium micro should usually become a target, required targets must be covered, and multiple equally important sub-goals should each become selected tasks.

These lines fit the archived detailed generation profile, but they conflict with the lean product principle: concentrate the user's attention on high-value content and reduce review burden.

## Lean Prompt Principle

Lean generation should follow:

```text
content
-> identify the mainline
-> select a few high-value knowledge nodes
-> choose the single strongest value angle per node, at most two when necessary
-> generate a small number of questions with real judgment value
```

High-value knowledge point definition:

> A high-value knowledge point is a key understanding node on the content mainline that is worth the user's attention because it improves understanding, judgment, action, or prevents a meaningful misunderstanding.

## Files

- Modify: `backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
- Create: `docs/iteration-records/2026-07-11-lean-high-value-generation-prompt.md`

No database, API, SwiftUI, model provider, or schema migration is included in this iteration.

## Task 1: Reframe Review Path Planning

- [ ] **Step 1: Update prompt tests for lean review path planning**

Expected test intent:

```js
assert.match(messages.user, /把用户注意力集中到高价值内容上/);
assert.match(messages.user, /先识别内容主线/);
assert.match(messages.user, /主线中的关键理解节点/);
assert.match(messages.user, /默认不保留背景、铺垫、普通例子、局部事实或只因好出题而被选中的点/);
assert.match(messages.user, /不因覆盖完整而保留低价值 unit/);
assert.doesNotMatch(messages.user, /只要某段承载独立学习对象并有 source evidence，就应保留/);
```

- [ ] **Step 2: Change `buildReviewPathPlanMessages`**

Replace coverage-oriented unit rules with:

```text
- 最高原则：把用户注意力集中到高价值内容上，为用户减负。
- 先识别内容主线，再只选择主线中最值得用户带走的关键理解节点。
- 高价值 unit 通常承担核心观点、关键理由、方法原则、适用边界、常见误区或承载主线的关键案例。
- 默认不保留背景、铺垫、普通例子、局部事实、漂亮句子、平台 hook，或只因好出题而被选中的点。
- 不因覆盖完整而保留低价值 unit；宁可少而准，也不要把用户注意力摊开。
```

- [ ] **Step 3: Run focused prompt test**

Run:

```bash
npm --prefix backend test -- backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Commit checkpoint**

```bash
git add backend/src/v2/generation/prompts/buildV2PromptMessages.js backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "feat: reframe review path planning for lean generation"
```

## Task 2: Reframe Unit Knowledge Mapping

- [ ] **Step 1: Update prompt tests for value-angle micro planning**

Expected test intent:

```js
assert.match(messages.user, /确认当前 unit 最值得考察的价值角度/);
assert.match(messages.user, /每个 unit 优先保留 1 个最强价值角度/);
assert.match(messages.user, /最多 2 个/);
assert.match(messages.user, /理解、判断、行动或避免误解/);
assert.doesNotMatch(messages.user, /micro 数量由当前 unit 的知识密度决定/);
```

- [ ] **Step 2: Change `buildUnitKnowledgeMapMessages`**

Replace micro-inventory wording with:

```text
- 本阶段不是完整拆解 unit，而是确认当前 unit 最值得被考察的价值角度。
- 每个 unit 优先保留 1 个最强价值角度；只有当第二个角度对理解主线明显必要时，最多保留 2 个。
- microKnowledgePoint 表示一个高价值考察点，不是所有可讲子知识点。
- assessmentValue 描述该角度是否值得占用用户注意力。
- high：缺少它会明显削弱用户对内容主线的理解、判断、行动或避错能力。
- medium：对主线有补充价值，但只有在不增加明显负担时才进入题目规划。
```

- [ ] **Step 3: Run focused prompt test**

Run:

```bash
npm --prefix backend test -- backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: all tests pass.

- [ ] **Step 4: Commit checkpoint**

```bash
git add backend/src/v2/generation/prompts/buildV2PromptMessages.js backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "feat: focus unit knowledge mapping on value angles"
```

## Task 3: Reframe Task Planning and ECD Planning

- [ ] **Step 1: Update prompt tests for selective task planning**

Expected test intent:

```js
assert.match(messages.user, /只选择最值得占用用户注意力的考察角度/);
assert.match(messages.user, /每个 unit 通常只生成 1 个核心 questionPlan/);
assert.match(messages.user, /必要时最多 2 个/);
assert.match(messages.user, /不为了覆盖所有 high \/ medium microKnowledgePoint 而出题/);
assert.doesNotMatch(messages.user, /每个 high \/ medium microKnowledgePoint 都要被某个 practiceGoal 或 questionPlan 覆盖/);
```

- [ ] **Step 2: Change `buildTaskBriefPlanMessages`**

Replace coverage language with selective value-angle planning:

```text
- 只选择最值得占用用户注意力的考察角度；不要把 microKnowledgePoints 当作覆盖清单。
- 每个 unit 通常只生成 1 个核心 questionPlan；只有当第二个角度明显服务主线且不会显著增加负担时，最多生成 2 个。
- 不为了覆盖所有 high / medium microKnowledgePoint 而出题；被跳过的角度不是失败。
- 题型服务于最强 value angle：理解本质、判断场景、区分边界、避免误用、迁移应用或关系理解。
```

- [ ] **Step 3: Change `buildEcdPlanningMessages`**

Keep ECD but make it attention-selective:

```text
- ECD 用来选择最能提供掌握证据的少数任务，不用来覆盖所有可考点。
- 对 high / medium microKnowledgePoint，先判断它是否值得占用用户注意力；只有最强角度进入 selectedTasks。
- selectedTasks 不必覆盖所有 assessableTargets；跳过低增益 target 是 lean 设计的一部分。
- 如果一个 unit 内含多个目标，优先选择最能改善理解、判断、行动或避错能力的目标。
```

- [ ] **Step 4: Run focused prompt test**

Run:

```bash
npm --prefix backend test -- backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: all tests pass.

- [ ] **Step 5: Commit checkpoint**

```bash
git add backend/src/v2/generation/prompts/buildV2PromptMessages.js backend/src/v2/generation/prompts/buildV2PromptMessages.test.js
git commit -m "feat: make task planning selective for lean generation"
```

## Task 4: Document the Iteration

- [ ] **Step 1: Create iteration record**

Write `docs/iteration-records/2026-07-11-lean-high-value-generation-prompt.md` with:

- product principle
- audit findings
- prompt changes
- test commands
- known limitations

- [ ] **Step 2: Run V2 checks**

Run:

```bash
npm --prefix backend run check:v2
```

Expected: pass.

- [ ] **Step 3: Commit checkpoint**

```bash
git add docs/superpowers/plans/2026-07-11-lean-high-value-generation-prompt-plan.md docs/iteration-records/2026-07-11-lean-high-value-generation-prompt.md
git commit -m "docs: plan lean high value generation prompt iteration"
```

## Self-Review

- The plan only changes prompt wording and tests; it does not change schemas or production infrastructure.
- The plan preserves the archived detailed generation profile via git archive/tag rather than adding a user-facing mode switch.
- The plan reduces attention spread at three decision points: unit selection, micro/value-angle selection, and task planning.
- The plan keeps source grounding, mobile length limits, option quality, matching quality, and JSON contract stability intact.
