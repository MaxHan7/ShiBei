# Shibei V2 Backend Prompt Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the isolated Shibei V2 backend contract and prompt pipeline that produces review paths matching the SwiftUI V2 interaction model.

**Architecture:** Keep all V2 backend work inside `experiments/shibei-v2/backend/`, using the existing Node.js service, PostgreSQL JSONB storage, generation job queue, notification flow, and test runner. Add a V2 review-path contract beside the existing V1-shaped generator, then route V2 chapter creation through a new prompt pipeline and serializer without changing the root production app.

**Tech Stack:** Node.js ESM, `node:test`, `node --check`, PostgreSQL via `pg`, existing OpenAI structured-output helper, SwiftUI V2 fixtures/golden samples as contract consumers.

---

## Preflight Contract Audit Status

2026-06-19 已完成开工前字段审计，见：

- `experiments/shibei-v2/docs/v2-backend-contract-audit-zh.md`
- `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
- `experiments/shibei-v2/docs/v2-prompt-field-rules-zh.md`

审计结论：

- 可以进入后端开发阶段。
- 第一阶段不要直接接真实模型；先实现 V2 contract validator、golden sample validation、SwiftUI API serializer 和 review session V2 state machine。
- 当前没有阻塞性的产品语义问题。剩余的 `prompt` / `feedback` / `sourceExcerpt` 等字段差异属于 SwiftUI mock 与正式 API contract 之间的 adapter 映射问题，由 serializer 和测试解决。
- 推荐继续使用 subagent-driven development，但不要一次性并行所有任务。先由一个 subagent 完成 contract validator，主线程审查通过后再派 golden loader / serializer / review session。

2026-06-19 progress update:

- P0 foundation completed: V2 contract, golden loader, SwiftUI serializer, review session V2.
- P1 schema foundation completed: sourceMap, reviewPathPlan, unitCards, qualityJudge validators.
- Fake orchestration completed: generateReviewPathV2 runs the fake prompt pipeline and validates the final review path.
- Real model calls remain intentionally unconnected.

2026-06-19 progress update 2:

- Real prompt caller layer completed: V2 prompt messages and schema-bound model caller.
- V2 generation job adapter completed for isolated backend integration.
- Automated tests still mock model calls; no network calls in `npm run check`.
- Next integration is explicit V2 job routing, not production replacement.

## Current Ground Truth

The frontend exploration has already defined a V2 product shape that is different from the current backend output:

- Home shows one explicitly selected current review chapter; newly generated chapters do not automatically replace it.
- Chapter detail includes source URL, source author, source title, summary, core knowledge point, expandable knowledge rows, and a `开始复习` action.
- Review path is ordered by units/nodes, not by a flat question queue.
- A unit starts with a unit overview, then questions, then unit summary.
- A chapter ends with a chapter summary after the final unit summary.
- Questions include `multiple_choice` and `matching`. Matching is a five-state frontend component, but backend only needs pairs, correct pair ids, source anchors, and feedback copy.
- Answer feedback panel displays one short `question.explanation`; `correctUnderstanding` and `misconception` can remain generation/QA intermediate fields, not default frontend copy.
- Source article view needs full article blocks plus question-level anchors for scroll/highlight.
- Notes/favorites need enough ids to reopen the exact saved question in an unanswered state.
- Upload/recommended article generation creates a `generating` chapter card, notification permission timing, success/failure notifications, and a failure detail page.

The current isolated V2 backend still has V1-shaped pieces:

- `experiments/shibei-v2/backend/src/generation/types.js` only knows `multiple_choice`, `true_false`, and `scenario_judgment`.
- `experiments/shibei-v2/backend/src/generation/index.js` returns a flat `chapter.knowledgePoints` + `chapter.questions` model.
- `experiments/shibei-v2/backend/src/server.js` review session logic queues flat questions.
- `experiments/shibei-v2/backend/src/db.js` stores chapter JSON in JSONB, which is good for V2 because the schema can evolve without a large relational migration.

## File Structure

Create V2-specific modules rather than mutating the existing generation modules in place:

- `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.js`
  - Owns V2 schema constants, question type constants, and runtime validation.
- `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.test.js`
  - Tests valid and invalid V2 review path payloads.
- `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.js`
  - Loads and normalizes `experiments/shibei-v2/docs/golden-samples/*.json`.
- `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.test.js`
  - Ensures golden samples satisfy the V2 contract.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`
  - Defines structured output schema and prompt for chapter/unit planning.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/unitCards.js`
  - Defines structured output schema and prompt for per-unit overview/questions/feedback.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/sourceMap.js`
  - Defines source block extraction and anchor prompt/schema.
- `experiments/shibei-v2/backend/src/v2/generation/prompts/qualityJudge.js`
  - Defines V2 review-path quality judge prompt/schema.
- `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
  - Orchestrates V2 source map, chapter plan, unit cards, quality judge, and final validation.
- `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
  - Tests generator orchestration with fake prompt callers.
- `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`
  - Serializes V2 chapters, notifications, favorites, and source article payloads for SwiftUI.
- `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`
  - Tests API payload shapes consumed by frontend.
- `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.js`
  - Stores and resolves the user-selected current review chapter.
- `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.test.js`
  - Tests that generation does not auto-replace current chapter.
- `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.js`
  - Builds ordered unit/card review state, records attempts, and computes unit/chapter completion.
- `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.test.js`
  - Tests unit overview -> question -> unit summary -> chapter summary progression.
- `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.js`
  - Defines curated recommended articles and optional pre-generated review paths.
- `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.test.js`
  - Tests recommended article reading and generation entry payloads.
- Modify `experiments/shibei-v2/backend/src/chapterGeneration.js`
  - Route V2 generation jobs to `generateReviewPathV2`.
- Modify `experiments/shibei-v2/backend/src/server.js`
  - Add V2 API endpoints while preserving old endpoints during isolated development.
- Modify `experiments/shibei-v2/backend/src/db.js`
  - Add lightweight device state persistence for current chapter pointer.
- Modify `experiments/shibei-v2/backend/package.json`
  - Include new V2 modules in `npm run check`.
- Modify `experiments/shibei-v2/docs/v2-chapter-review-flow-prd-zh.md`
  - Record the backend contract and generation flow decisions after implementation.
- Modify `experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md`
  - Link frontend fields to backend response fields.
- Modify `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
  - Keep the field dictionary current. Every backend field must define purpose, generation source, frontend usage, display rule, and nearby-field boundaries.

## Contract Shape

The implementation should converge on this public shape. Field names are explicit so SwiftUI can decode stable fixtures and future API payloads.

```js
export const V2_REVIEW_PATH_SCHEMA_VERSION = "v2_review_path_1";

export const V2_QUESTION_TYPES = [
  "multiple_choice",
  "matching"
];

export const V2_REVIEW_CARD_TYPES = [
  "unit_overview",
  "question",
  "unit_summary",
  "chapter_summary"
];
```

A completed V2 chapter JSON must include these top-level fields:

```json
{
  "schemaVersion": "v2_review_path_1",
  "id": "chapter_123",
  "status": "completed",
  "displayStatusText": "已生成",
  "title": "Anthropic设计总监：为什么您的整个团队都应该使用AI Agents协同工作",
  "source": {
    "type": "article",
    "platform": "wechat",
    "url": "https://example.com/article",
    "title": "原文标题",
    "author": "MetaTown",
    "rawText": "原始正文",
    "cleanedText": "清洗后的正文",
    "blocks": [
      { "id": "p-001", "type": "paragraph", "text": "第一段正文。" }
    ]
  },
  "summaryCard": {
    "text": "章节概要正文。",
    "note": "后台校准说明，客户端默认不展示。"
  },
  "units": [
    {
      "id": "unit-01",
      "order": 1,
      "title": "Hook 是什么",
      "shortSummary": "Hook 是关键动作前后的流程控制器。",
      "detailSummary": "Hook 不是另一个提示词，而是在 AI agent 的关键动作前后加入规则、上下文和验证的控制机制。它适合处理那些不能只靠模型记住、而需要每次稳定触发的流程约束。",
      "why": "这是后续边界和场景题的基础。",
      "sourceAnchor": {
        "id": "anchor-unit-01",
        "label": "第 6-12 段",
        "blockIds": ["p-006", "p-007", "p-008"],
        "quote": "Hook 不是另一个提示词，而是在关键动作前后..."
      },
      "overview": {
        "text": "Hook 不是另一个提示词，它更像一段固定流程。"
      },
      "questions": [
        {
          "id": "q-001",
          "type": "multiple_choice",
          "stem": "Hook 更接近下面哪一种机制？",
          "options": [
            { "id": "A", "text": "在关键动作前后自动执行确定性流程" },
            { "id": "B", "text": "把项目规则写得更完整" },
            { "id": "C", "text": "把所有质量问题留给 CI" },
            { "id": "D", "text": "写进更长的需求说明" }
          ],
          "correctOptionId": "A",
          "correctUnderstanding": "Hook 的重点是机制执行，而不是模型自觉。",
          "misconception": "把 Hook 误解成更详细的提示词。",
          "explanation": "当某件事每次都必须发生，就应该变成流程约束。",
          "sourceAnchorId": "anchor-unit-01"
        },
        {
          "id": "q-002",
          "type": "matching",
          "stem": "把 Hook 的组成特征匹配起来：",
          "leftItems": [
            { "id": "L1", "text": "固定节点" },
            { "id": "L2", "text": "上下文" }
          ],
          "rightItems": [
            { "id": "R1", "text": "决定什么时候触发" },
            { "id": "R2", "text": "让 handler 知道发生了什么" }
          ],
          "pairs": [
            { "leftId": "L1", "rightId": "R1" },
            { "leftId": "L2", "rightId": "R2" }
          ],
          "correctUnderstanding": "匹配题用来训练边界和职责对应。",
          "misconception": "把机制、上下文和结果判断混在一起。",
          "explanation": "固定节点决定触发时机；上下文让 handler 读取现场。",
          "sourceAnchorId": "anchor-unit-01"
        }
      ],
      "summary": {
        "title": "单元完成",
        "text": "你已经理解 Hook 的基本机制。"
      }
    }
  ],
  "chapterSummary": {
    "title": "章节完成",
    "statsText": "共 7 个核心知识点，21 道题目",
    "encouragementText": "在了解 Hook 的原理和用法之后，你的 vibe coding 能力又更上一层楼了。"
  },
  "generationMeta": {
    "currentStage": "completed",
    "stages": [
      { "status": "submitted", "displayStatusText": "排队中，等待生成", "at": "2026-06-18T00:00:00.000Z" },
      { "status": "extracting_content", "displayStatusText": "正在提取正文", "at": "2026-06-18T00:00:01.000Z" },
      { "status": "generating_points", "displayStatusText": "正在生成知识点", "at": "2026-06-18T00:00:02.000Z" },
      { "status": "generating_questions", "displayStatusText": "正在生成题目", "at": "2026-06-18T00:00:03.000Z" },
      { "status": "completed", "displayStatusText": "已生成", "at": "2026-06-18T00:00:04.000Z" }
    ]
  }
}
```

## Task 1: Add V2 Review Path Contract

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.js`
- Create: `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Create the failing contract test**

Create `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "./reviewPathContract.js";

function validPath(overrides = {}) {
  return {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: "chapter-test",
    status: "completed",
    displayStatusText: "已生成",
    title: "测试章节",
    source: {
      type: "article",
      platform: "wechat",
      url: "https://example.com/source",
      title: "原文标题",
      author: "作者",
      rawText: "第一段正文。\n第二段正文。",
      cleanedText: "第一段正文。\n第二段正文。",
      blocks: [
        { id: "p-001", type: "paragraph", text: "第一段正文。" },
        { id: "p-002", type: "paragraph", text: "第二段正文。" }
      ]
    },
    summaryCard: {
      text: "章节概要。",
      note: "内部校准说明。"
    },
    units: [
      {
        id: "unit-01",
        order: 1,
        title: "测试知识点",
        shortSummary: "测试知识点的一句话总结。",
        detailSummary: "测试知识点的完整描述，用于展开态、题目生成和来源校验。",
        why: "这是测试章节的主线。",
        sourceAnchor: {
          id: "anchor-unit-01",
          label: "第 1-2 段",
          blockIds: ["p-001", "p-002"],
          quote: "第一段正文。"
        },
        overview: { text: "单元开场文案。" },
        questions: [
          {
            id: "q-001",
            type: "multiple_choice",
            stem: "哪项最符合原文？",
            options: [
              { id: "A", text: "正确选项" },
              { id: "B", text: "错误选项 1" },
              { id: "C", text: "错误选项 2" },
              { id: "D", text: "错误选项 3" }
            ],
            correctOptionId: "A",
            correctUnderstanding: "正确理解。",
            misconception: "常见误区。",
            explanation: "答后解释。",
            sourceAnchorId: "anchor-unit-01"
          },
          {
            id: "q-002",
            type: "matching",
            stem: "把左右内容配对。",
            leftItems: [
              { id: "L1", text: "左 1" },
              { id: "L2", text: "左 2" }
            ],
            rightItems: [
              { id: "R1", text: "右 1" },
              { id: "R2", text: "右 2" }
            ],
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" }
            ],
            correctUnderstanding: "配对后的正确理解。",
            misconception: "把两个职责混淆。",
            explanation: "配对解释。",
            sourceAnchorId: "anchor-unit-01"
          }
        ],
        summary: {
          title: "单元完成",
          text: "单元总结。"
        }
      }
    ],
    chapterSummary: {
      title: "章节完成",
      statsText: "共 1 个核心知识点，2 道题目",
      encouragementText: "章节总结。"
    },
    generationMeta: {
      currentStage: "completed",
      stages: [{ status: "completed", displayStatusText: "已生成", at: "2026-06-18T00:00:00.000Z" }]
    },
    ...overrides
  };
}

test("validateReviewPathV2 accepts the target V2 chapter shape", () => {
  const result = validateReviewPathV2(validPath());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateReviewPathV2 rejects flat V1 question payloads", () => {
  const result = validateReviewPathV2({
    id: "chapter-v1",
    title: "旧结构",
    knowledgePoints: [],
    questions: []
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /schemaVersion/);
  assert.match(result.errors.join("\n"), /units/);
});

test("validateReviewPathV2 rejects matching questions without complete pairs", () => {
  const path = validPath();
  path.units[0].questions[1].pairs = [{ leftId: "L1", rightId: "R9" }];
  const result = validateReviewPathV2(path);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /rightId R9/);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/contracts/reviewPathContract.test.js
```

Expected: fail with module-not-found for `reviewPathContract.js`.

- [ ] **Step 3: Implement the contract validator**

Create `experiments/shibei-v2/backend/src/v2/contracts/reviewPathContract.js`:

```js
export const V2_REVIEW_PATH_SCHEMA_VERSION = "v2_review_path_1";

export const V2_QUESTION_TYPES = Object.freeze([
  "multiple_choice",
  "matching"
]);

export const V2_GENERATION_STATUSES = Object.freeze([
  "submitted",
  "extracting_content",
  "generating_points",
  "generating_questions",
  "quality_checking",
  "completed",
  "failed_extract_article",
  "failed_extract_video",
  "failed_points",
  "failed_questions",
  "failed_no_qualified_questions"
]);

export const V2_STATUS_TEXT = Object.freeze({
  submitted: "排队中，等待生成",
  extracting_content: "正在提取正文",
  generating_points: "正在生成知识点",
  generating_questions: "正在生成题目",
  quality_checking: "正在检查题目质量",
  completed: "已生成",
  failed_extract_article: "文章正文提取失败",
  failed_extract_video: "视频文本提取失败",
  failed_points: "知识点生成失败",
  failed_questions: "题目生成失败",
  failed_no_qualified_questions: "题目生成失败"
});

export function validateReviewPathV2(path) {
  const errors = [];
  const root = path && typeof path === "object" ? path : {};

  requireString(root, "schemaVersion", errors);
  if (root.schemaVersion !== V2_REVIEW_PATH_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${V2_REVIEW_PATH_SCHEMA_VERSION}`);
  }
  requireString(root, "id", errors);
  requireString(root, "title", errors);
  requireString(root, "status", errors);
  requireString(root, "displayStatusText", errors);
  requireObject(root, "source", errors);
  requireObject(root, "summaryCard", errors);
  requireArray(root, "units", errors);
  requireObject(root, "chapterSummary", errors);
  requireObject(root, "generationMeta", errors);

  if (root.source && typeof root.source === "object") {
    validateSource(root.source, errors);
  }
  if (Array.isArray(root.units)) {
    const blockIds = new Set((root.source?.blocks || []).map((block) => block.id));
    for (const unit of root.units) validateUnit(unit, blockIds, errors);
  }

  return { valid: errors.length === 0, errors };
}

function validateSource(source, errors) {
  requireString(source, "type", errors, "source");
  requireString(source, "title", errors, "source");
  requireString(source, "author", errors, "source");
  requireString(source, "rawText", errors, "source");
  requireString(source, "cleanedText", errors, "source");
  requireArray(source, "blocks", errors, "source");
  if (Array.isArray(source.blocks)) {
    for (const block of source.blocks) {
      requireString(block, "id", errors, "source.blocks[]");
      requireString(block, "type", errors, "source.blocks[]");
      requireString(block, "text", errors, "source.blocks[]");
    }
  }
}

function validateUnit(unit, blockIds, errors) {
  requireString(unit, "id", errors, "units[]");
  requireNumber(unit, "order", errors, "units[]");
  requireString(unit, "title", errors, "units[]");
  requireString(unit, "shortSummary", errors, "units[]");
  requireString(unit, "detailSummary", errors, "units[]");
  requireString(unit, "why", errors, "units[]");
  requireObject(unit, "sourceAnchor", errors, "units[]");
  requireObject(unit, "overview", errors, "units[]");
  requireArray(unit, "questions", errors, "units[]");
  requireObject(unit, "summary", errors, "units[]");

  if (unit.sourceAnchor && typeof unit.sourceAnchor === "object") {
    requireString(unit.sourceAnchor, "id", errors, `unit ${unit.id} sourceAnchor`);
    requireString(unit.sourceAnchor, "label", errors, `unit ${unit.id} sourceAnchor`);
    requireArray(unit.sourceAnchor, "blockIds", errors, `unit ${unit.id} sourceAnchor`);
    requireString(unit.sourceAnchor, "quote", errors, `unit ${unit.id} sourceAnchor`);
    for (const blockId of unit.sourceAnchor.blockIds || []) {
      if (!blockIds.has(blockId)) errors.push(`unit ${unit.id} sourceAnchor references missing blockId ${blockId}`);
    }
  }

  const anchorIds = new Set([unit.sourceAnchor?.id].filter(Boolean));
  if (Array.isArray(unit.questions)) {
    for (const question of unit.questions) validateQuestion(question, anchorIds, errors);
  }
}

function validateQuestion(question, anchorIds, errors) {
  requireString(question, "id", errors, "questions[]");
  requireString(question, "type", errors, `question ${question.id}`);
  requireString(question, "stem", errors, `question ${question.id}`);
  requireString(question, "correctUnderstanding", errors, `question ${question.id}`);
  requireString(question, "misconception", errors, `question ${question.id}`);
  requireString(question, "explanation", errors, `question ${question.id}`);
  requireString(question, "sourceAnchorId", errors, `question ${question.id}`);
  if (!anchorIds.has(question.sourceAnchorId)) {
    errors.push(`question ${question.id} references missing sourceAnchorId ${question.sourceAnchorId}`);
  }

  if (question.type === "multiple_choice") validateMultipleChoice(question, errors);
  else if (question.type === "matching") validateMatching(question, errors);
  else errors.push(`question ${question.id} has unsupported type ${question.type}`);
}

function validateMultipleChoice(question, errors) {
  requireArray(question, "options", errors, `question ${question.id}`);
  requireString(question, "correctOptionId", errors, `question ${question.id}`);
  const optionIds = new Set((question.options || []).map((option) => option.id));
  if ((question.options || []).length !== 4) errors.push(`question ${question.id} multiple_choice must have exactly 4 options`);
  if (!optionIds.has(question.correctOptionId)) {
    errors.push(`question ${question.id} correctOptionId ${question.correctOptionId} is not in options`);
  }
}

function validateMatching(question, errors) {
  requireArray(question, "leftItems", errors, `question ${question.id}`);
  requireArray(question, "rightItems", errors, `question ${question.id}`);
  requireArray(question, "pairs", errors, `question ${question.id}`);
  const leftIds = new Set((question.leftItems || []).map((item) => item.id));
  const rightIds = new Set((question.rightItems || []).map((item) => item.id));
  if ((question.leftItems || []).length < 2) errors.push(`question ${question.id} matching must have at least 2 leftItems`);
  if ((question.rightItems || []).length < 2) errors.push(`question ${question.id} matching must have at least 2 rightItems`);
  for (const pair of question.pairs || []) {
    if (!leftIds.has(pair.leftId)) errors.push(`question ${question.id} pair references missing leftId ${pair.leftId}`);
    if (!rightIds.has(pair.rightId)) errors.push(`question ${question.id} pair references missing rightId ${pair.rightId}`);
  }
}

function requireString(target, key, errors, label = "") {
  if (typeof target?.[key] !== "string" || !target[key].trim()) {
    errors.push(`${label ? `${label}.` : ""}${key} must be a non-empty string`);
  }
}

function requireNumber(target, key, errors, label = "") {
  if (typeof target?.[key] !== "number" || !Number.isFinite(target[key])) {
    errors.push(`${label ? `${label}.` : ""}${key} must be a finite number`);
  }
}

function requireObject(target, key, errors, label = "") {
  if (!target?.[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
    errors.push(`${label ? `${label}.` : ""}${key} must be an object`);
  }
}

function requireArray(target, key, errors, label = "") {
  if (!Array.isArray(target?.[key])) {
    errors.push(`${label ? `${label}.` : ""}${key} must be an array`);
  }
}
```

- [ ] **Step 4: Run the contract test**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/contracts/reviewPathContract.test.js
```

Expected: pass.

- [ ] **Step 5: Add the V2 test to `npm run check`**

Modify `experiments/shibei-v2/backend/package.json`:

```json
"check": "node --check src/start.js ... && node --check src/v2/contracts/reviewPathContract.js && node --check src/v2/contracts/reviewPathContract.test.js && node --test ... src/v2/contracts/reviewPathContract.test.js"
```

Keep the existing command content and append the V2 checks before the final `node --test` list ends.

- [ ] **Step 6: Run the full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: all existing tests plus `reviewPathContract.test.js` pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/v2/contracts
git commit -m "feat(v2): add review path contract"
```

## Task 2: Normalize Golden Samples Into the V2 Contract

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.js`
- Create: `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write a failing golden sample test**

Create `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { loadGoldenReviewPaths } from "./loadGoldenReviewPaths.js";
import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";

test("all golden samples normalize into valid V2 review paths", async () => {
  const paths = await loadGoldenReviewPaths();
  assert.ok(paths.length >= 2);
  for (const path of paths) {
    const validation = validateReviewPathV2(path);
    assert.equal(validation.valid, true, `${path.id}\n${validation.errors.join("\n")}`);
  }
});

test("golden matching questions keep pair ids stable", async () => {
  const paths = await loadGoldenReviewPaths();
  const matchingQuestions = paths.flatMap((path) =>
    path.units.flatMap((unit) => unit.questions.filter((question) => question.type === "matching"))
  );
  assert.ok(matchingQuestions.length > 0);
  for (const question of matchingQuestions) {
    assert.ok(question.leftItems.every((item) => item.id.startsWith("L")));
    assert.ok(question.rightItems.every((item) => item.id.startsWith("R")));
    assert.equal(question.pairs.length, question.leftItems.length);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/golden/loadGoldenReviewPaths.test.js
```

Expected: fail with module-not-found for `loadGoldenReviewPaths.js`.

- [ ] **Step 3: Implement the golden loader**

Create `experiments/shibei-v2/backend/src/v2/golden/loadGoldenReviewPaths.js`:

```js
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { V2_REVIEW_PATH_SCHEMA_VERSION, V2_STATUS_TEXT } from "../contracts/reviewPathContract.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOLDEN_DIR = path.resolve(__dirname, "../../../../docs/golden-samples");

export async function loadGoldenReviewPaths() {
  const files = (await readdir(GOLDEN_DIR))
    .filter((name) => name.endsWith("-v2-golden-sample.json"))
    .sort();
  const samples = [];
  for (const file of files) {
    const json = JSON.parse(await readFile(path.join(GOLDEN_DIR, file), "utf8"));
    samples.push(normalizeGoldenSample(json));
  }
  return samples;
}

export function normalizeGoldenSample(sample) {
  const sourceBlocks = buildSourceBlocks(sample);
  const units = (sample.nodes || []).map((node, unitIndex) => {
    const anchorId = `${node.id}-anchor`;
    return {
      id: node.id,
      order: unitIndex + 1,
      title: node.title,
      shortSummary: node.knowledgePoint,
      detailSummary: node.explanation || node.knowledgePoint,
      why: node.why || "",
      sourceAnchor: {
        id: anchorId,
        label: node.sourceAnchor || `第 ${unitIndex + 1} 个知识点来源`,
        blockIds: sourceBlocks.slice(0, 1).map((block) => block.id),
        quote: node.sourceAnchor || node.knowledgePoint
      },
      overview: { text: node.explanation || node.knowledgePoint },
      questions: (node.cards || []).map((card, cardIndex) => normalizeGoldenQuestion(card, node.id, anchorId, cardIndex)),
      summary: {
        title: "单元完成",
        text: node.explanation || node.knowledgePoint
      }
    };
  });

  return {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: sample.id,
    status: "completed",
    displayStatusText: V2_STATUS_TEXT.completed,
    title: sample.source?.title || sample.id,
    source: {
      type: "article",
      platform: sample.source?.platform || "",
      url: sample.source?.url || "",
      title: sample.source?.title || sample.id,
      author: sample.source?.publisher || "",
      rawText: sourceBlocks.map((block) => block.text).join("\n\n"),
      cleanedText: sourceBlocks.map((block) => block.text).join("\n\n"),
      blocks: sourceBlocks
    },
    summaryCard: {
      text: sample.summaryCard?.text || "",
      note: sample.summaryCard?.note || ""
    },
    units,
    chapterSummary: {
      title: "章节完成",
      statsText: `共 ${units.length} 个核心知识点，${units.reduce((sum, unit) => sum + unit.questions.length, 0)} 道题目`,
      encouragementText: sample.chapterSummary?.encouragementText || sample.chapterSummary?.text || sample.summaryCard?.text || ""
    },
    generationMeta: {
      currentStage: "completed",
      stages: [{ status: "completed", displayStatusText: V2_STATUS_TEXT.completed, at: "2026-06-18T00:00:00.000Z" }]
    }
  };
}

function buildSourceBlocks(sample) {
  const summary = sample.summaryCard?.text || sample.source?.title || sample.id;
  const nodeTexts = (sample.nodes || []).map((node) => `${node.title}：${node.explanation || node.knowledgePoint}`);
  return [summary, ...nodeTexts].map((text, index) => ({
    id: `p-${String(index + 1).padStart(3, "0")}`,
    type: "paragraph",
    text
  }));
}

function normalizeGoldenQuestion(card, unitId, sourceAnchorId, index) {
  const id = `${unitId}-q-${String(index + 1).padStart(2, "0")}`;
  if (card.questionType === "matching") {
    const pairs = (card.pairs || []).map((pair, pairIndex) => ({
      leftId: `L${pairIndex + 1}`,
      rightId: `R${pairIndex + 1}`,
      leftText: pair[0],
      rightText: pair[1]
    }));
    return {
      id,
      type: "matching",
      stem: card.stem,
      leftItems: pairs.map((pair) => ({ id: pair.leftId, text: pair.leftText })),
      rightItems: pairs.map((pair) => ({ id: pair.rightId, text: pair.rightText })),
      pairs: pairs.map((pair) => ({ leftId: pair.leftId, rightId: pair.rightId })),
      correctUnderstanding: card.explanation || card.stem,
      misconception: card.misconception || "容易把左右职责或适用场景混淆。",
      explanation: card.explanation || card.stem,
      sourceAnchorId
    };
  }

  const options = (card.options || []).slice(0, 4).map((text, optionIndex) => ({
    id: String.fromCharCode(65 + optionIndex),
    text
  }));
  const correct = options.find((option) => option.text === card.answer) || options[0];
  return {
    id,
    type: "multiple_choice",
    stem: card.stem,
    options,
    correctOptionId: correct?.id || "A",
    correctUnderstanding: card.explanation || card.answer || card.stem,
    misconception: card.misconception || "容易把原文里的边界或行动方式理解得过宽。",
    explanation: card.explanation || card.answer || card.stem,
    sourceAnchorId
  };
}
```

- [ ] **Step 4: Run the golden tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/golden/loadGoldenReviewPaths.test.js
```

Expected: pass.

- [ ] **Step 5: Add golden loader checks to `npm run check`**

Modify `experiments/shibei-v2/backend/package.json` to include:

```bash
node --check src/v2/golden/loadGoldenReviewPaths.js
node --check src/v2/golden/loadGoldenReviewPaths.test.js
node --test src/v2/golden/loadGoldenReviewPaths.test.js
```

- [ ] **Step 6: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/v2/golden
git commit -m "test(v2): validate golden review paths"
```

## Task 3: Define V2 Prompt Output Schemas

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/sourceMap.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/unitCards.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/qualityJudge.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write a schema smoke test**

Create `experiments/shibei-v2/backend/src/v2/generation/prompts/promptSchemas.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { sourceMapSchema, sourceMapSystemPrompt } from "./sourceMap.js";
import { reviewPathPlanSchema, reviewPathPlanSystemPrompt } from "./reviewPathPlan.js";
import { unitCardsSchema, unitCardsSystemPrompt } from "./unitCards.js";
import { qualityJudgeSchema, qualityJudgeSystemPrompt } from "./qualityJudge.js";

test("V2 prompt schemas are strict structured-output objects", () => {
  for (const schema of [sourceMapSchema, reviewPathPlanSchema, unitCardsSchema, qualityJudgeSchema]) {
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required));
    assert.ok(schema.required.length > 0);
  }
});

test("V2 prompt wording includes product-critical concepts", () => {
  const joined = [
    sourceMapSystemPrompt,
    reviewPathPlanSystemPrompt,
    unitCardsSystemPrompt,
    qualityJudgeSystemPrompt
  ].join("\n");
  assert.match(joined, /source anchor|来源 anchor|来源锚点/);
  assert.match(joined, /matching|连线/);
  assert.match(joined, /correctUnderstanding|正确理解/);
  assert.match(joined, /misconception|误区|混淆/);
});
```

- [ ] **Step 2: Run the schema test and verify it fails**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: fail with module-not-found for the prompt files.

- [ ] **Step 3: Create the source map prompt**

Create `experiments/shibei-v2/backend/src/v2/generation/prompts/sourceMap.js`:

```js
export const sourceMapSystemPrompt = `你是拾贝 V2 的来源结构化助手。你的任务是把用户导入的文章整理成可渲染、可定位、可高亮的 source blocks。

严格要求：
- 保留原文的段落、小标题、引用和列表结构，不能把全文压成一个段落。
- 每个 block 必须有稳定 id，例如 p-001、h-001、quote-001。
- 每个 block 的 text 必须来自原文清洗结果，不添加新观点。
- 后续题目会通过来源 anchor 定位 blockIds，所以 block 切分要稳定。
- 如果文章里有开头导读、编辑摘要或金句摘录，可以标为 lead_summary；它可以帮助理解，但不应单独作为题目来源。`;

export const sourceMapSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    source: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        platform: { type: "string" },
        blocks: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["heading", "paragraph", "quote", "list_item", "lead_summary"] },
              text: { type: "string" }
            },
            required: ["id", "type", "text"]
          }
        }
      },
      required: ["title", "author", "platform", "blocks"]
    }
  },
  required: ["source"]
};
```

- [ ] **Step 4: Create the review path plan prompt**

Create `experiments/shibei-v2/backend/src/v2/generation/prompts/reviewPathPlan.js`:

```js
export const reviewPathPlanSystemPrompt = `你是拾贝 V2 的章节路径规划器。你不是摘要器，也不是考试出题器。你要把一篇文章规划成手机上的复习路径。

输出原则：
- 章节必须有 summaryCard，先说文章核心命题，再轻量带出展开方向。
- 章节必须有 chapterSummary.encouragementText，用于用户完成整章复习后的鼓励文案，必须结合本章内容，不能写泛泛鸡汤。
- units 必须按原文阅读顺序排列。
- 每个 unit 是一个值得复习的知识点，不是原文摘抄。
- 每个 unit 必须有 sourceAnchor，sourceAnchor 必须引用 source blocks 的 blockIds。
- 短内容可以只有 1-3 个 unit，普通文章通常 4-8 个 unit；不要硬凑固定数量。
- 背景、情绪、孤立细节和没有来源支撑的推断不能成为 unit。
- 如果文章不适合默认概念复习路径，仍输出最适合的少量 units，并在 planningNotes 说明限制。`;

export const reviewPathPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    chapterTitle: { type: "string" },
    summaryCard: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" },
        note: { type: "string" }
      },
      required: ["text", "note"]
    },
    chapterSummary: {
      type: "object",
      additionalProperties: false,
      properties: {
        encouragementText: { type: "string" }
      },
      required: ["encouragementText"]
    },
    units: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          order: { type: "number" },
          title: { type: "string" },
          shortSummary: { type: "string" },
          detailSummary: { type: "string" },
          why: { type: "string" },
          sourceAnchor: {
            type: "object",
            additionalProperties: false,
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              blockIds: { type: "array", items: { type: "string" } },
              quote: { type: "string" }
            },
            required: ["id", "label", "blockIds", "quote"]
          },
          questionPlan: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["multiple_choice", "matching"] },
                goal: { type: "string" },
                angle: { type: "string", enum: ["core_understanding", "misconception_boundary", "scenario_application", "concept_matching"] }
              },
              required: ["type", "goal", "angle"]
            }
          }
        },
        required: ["id", "order", "title", "shortSummary", "detailSummary", "why", "sourceAnchor", "questionPlan"]
      }
    },
    planningNotes: { type: "array", items: { type: "string" } }
  },
  required: ["chapterTitle", "summaryCard", "chapterSummary", "units", "planningNotes"]
};
```

- [ ] **Step 5: Create the unit cards prompt**

Create `experiments/shibei-v2/backend/src/v2/generation/prompts/unitCards.js`:

```js
export const unitCardsSystemPrompt = `你是拾贝 V2 的单元复习卡生成器。你的输入是一个已规划好的 knowledge unit 和它的来源 anchor。

生成原则：
- overview 是用户进入单元后的轻量解释，帮助用户先建立基础理解。
- multiple_choice 题只考理解，不考原文背诵；四个选项必须只有一个正确答案。
- matching/连线题用于职责、边界、场景、概念对应，不用于机械配对同义词。
- 有干扰项的题目必须先形成 correctUnderstanding 和 misconception，再生成选项。
- explanation 是前端唯一展示的答后反馈文案，需要融合正确理解和必要误区，适合答后反馈浮窗，不写成长文。
- 每道题必须保留 sourceAnchorId，方便用户点击查看完整原文并高亮相关片段。`;

export const unitCardsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    unitId: { type: "string" },
    overview: {
      type: "object",
      additionalProperties: false,
      properties: {
        text: { type: "string" }
      },
      required: ["text"]
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["multiple_choice", "matching"] },
          stem: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"]
            }
          },
          correctOptionId: { type: "string" },
          leftItems: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"]
            }
          },
          rightItems: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"]
            }
          },
          pairs: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { leftId: { type: "string" }, rightId: { type: "string" } },
              required: ["leftId", "rightId"]
            }
          },
          correctUnderstanding: { type: "string" },
          misconception: { type: "string" },
          explanation: { type: "string" },
          sourceAnchorId: { type: "string" }
        },
        required: ["id", "type", "stem", "correctUnderstanding", "misconception", "explanation", "sourceAnchorId"]
      }
    },
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        text: { type: "string" }
      },
      required: ["title", "text"]
    }
  },
  required: ["unitId", "overview", "questions", "summary"]
};
```

- [ ] **Step 6: Create the quality judge prompt**

Create `experiments/shibei-v2/backend/src/v2/generation/prompts/qualityJudge.js`:

```js
export const qualityJudgeSystemPrompt = `你是拾贝 V2 的复习路径质检器。你检查的是用户体验和来源可靠性，不是给模型输出打作文分。

必须检查：
- units 是否按原文顺序且覆盖主线。
- 每个 source anchor 是否能支撑对应 unit 和题目。
- multiple_choice 是否只有一个正确答案，错误选项是否像真实误区。
- matching/连线题是否训练边界、职责或场景对应，而不是凑数量。
- correctUnderstanding 和 misconception 是否短、具体、能服务 explanation、干扰项和质检；前端默认只展示 explanation。
- 是否有为了增加题量而重复、换壳或脱离来源的题。`;

export const qualityJudgeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accepted: { type: "boolean" },
    score: { type: "number", minimum: 1, maximum: 5 },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          severity: { type: "string", enum: ["low", "medium", "high"] },
          path: { type: "string" },
          message: { type: "string" },
          action: { type: "string", enum: ["keep", "rewrite", "remove"] }
        },
        required: ["severity", "path", "message", "action"]
      }
    },
    summary: { type: "string" }
  },
  required: ["accepted", "score", "issues", "summary"]
};
```

- [ ] **Step 7: Run prompt schema tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/prompts/promptSchemas.test.js
```

Expected: pass.

- [ ] **Step 8: Add prompt schema checks to `npm run check`**

Modify `experiments/shibei-v2/backend/package.json` to check and run:

```bash
node --check src/v2/generation/prompts/sourceMap.js
node --check src/v2/generation/prompts/reviewPathPlan.js
node --check src/v2/generation/prompts/unitCards.js
node --check src/v2/generation/prompts/qualityJudge.js
node --check src/v2/generation/prompts/promptSchemas.test.js
node --test src/v2/generation/prompts/promptSchemas.test.js
```

- [ ] **Step 9: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 10: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/v2/generation/prompts
git commit -m "feat(v2): define prompt output schemas"
```

## Task 4: Implement V2 Generator Orchestration With Fake Prompt Callers First

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write generator orchestration tests**

Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { generateReviewPathV2 } from "./generateReviewPathV2.js";
import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";

test("generateReviewPathV2 creates a valid V2 path using injected model callers", async () => {
  const calls = [];
  const result = await generateReviewPathV2({
    sourceType: "text",
    rawText: "第一段：Hook 是关键动作前后的流程控制器。\n第二段：它和 Prompt、CI 的职责不同。",
    sourceTitle: "Hook 测试文章",
    sourceUrl: "https://example.com/hook",
    sourceAuthor: "测试作者",
    sourcePlatform: "wechat"
  }, {
    callSourceMap: async () => {
      calls.push("sourceMap");
      return {
        source: {
          title: "Hook 测试文章",
          author: "测试作者",
          platform: "wechat",
          blocks: [
            { id: "p-001", type: "paragraph", text: "第一段：Hook 是关键动作前后的流程控制器。" },
            { id: "p-002", type: "paragraph", text: "第二段：它和 Prompt、CI 的职责不同。" }
          ]
        }
      };
    },
    callReviewPathPlan: async () => {
      calls.push("plan");
      return {
        chapterTitle: "Hook 测试文章",
        summaryCard: { text: "Hook 是流程控制器。", note: "测试样本。" },
        units: [
          {
            id: "unit-01",
            order: 1,
            title: "Hook 是什么",
            shortSummary: "Hook 是关键动作前后的流程控制器。",
            detailSummary: "Hook 不是另一个提示词，而是在关键动作前后执行稳定流程的控制机制。",
            why: "这是文章核心概念。",
            sourceAnchor: {
              id: "anchor-unit-01",
              label: "第 1-2 段",
              blockIds: ["p-001", "p-002"],
              quote: "Hook 是关键动作前后的流程控制器。"
            },
            questionPlan: [{ type: "multiple_choice", goal: "识别 Hook 的机制属性", angle: "core_understanding" }]
          }
        ],
        planningNotes: []
      };
    },
    callUnitCards: async () => {
      calls.push("unitCards");
      return {
        unitId: "unit-01",
        overview: { text: "先理解 Hook 是机制，不是提示词。" },
        questions: [
          {
            id: "q-001",
            type: "multiple_choice",
            stem: "Hook 更接近哪种机制？",
            options: [
              { id: "A", text: "固定流程控制" },
              { id: "B", text: "更长提示词" },
              { id: "C", text: "最终 CI 检查" },
              { id: "D", text: "人工提醒" }
            ],
            correctOptionId: "A",
            correctUnderstanding: "Hook 是机制执行。",
            misconception: "把 Hook 当成提示词。",
            explanation: "Hook 在动作前后执行固定流程。",
            sourceAnchorId: "anchor-unit-01"
          }
        ],
        summary: { title: "单元完成", text: "你已经理解 Hook 的基本机制。" }
      };
    },
    callQualityJudge: async () => {
      calls.push("judge");
      return { accepted: true, score: 5, issues: [], summary: "结构可用。" };
    }
  });

  assert.equal(result.status, "completed");
  assert.deepEqual(calls, ["sourceMap", "plan", "unitCards", "judge"]);
  const validation = validateReviewPathV2(result.chapter);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
});

test("generateReviewPathV2 rejects non-text sources before prompt calls", async () => {
  const result = await generateReviewPathV2({ sourceType: "video", rawText: "" }, {});
  assert.equal(result.status, "failed_extract_video");
  assert.equal(result.chapter.status, "failed_extract_video");
});
```

- [ ] **Step 2: Run the generator test and verify it fails**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: fail with module-not-found for `generateReviewPathV2.js`.

- [ ] **Step 3: Implement the orchestration module**

Create `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`:

```js
import { cleanContent } from "../../generation/cleanContent.js";
import { createGenerationRunId } from "../../generation/modelCost.js";
import {
  V2_REVIEW_PATH_SCHEMA_VERSION,
  V2_STATUS_TEXT,
  validateReviewPathV2
} from "../contracts/reviewPathContract.js";

export async function generateReviewPathV2(input, options = {}) {
  const now = new Date().toISOString();
  const meta = {
    generationRunId: createGenerationRunId(),
    currentStage: "submitted",
    stages: [{ status: "submitted", displayStatusText: V2_STATUS_TEXT.submitted, at: now }]
  };

  if (input?.sourceType === "video") {
    return failedResult("failed_extract_video", "视频文本提取失败。", input, meta);
  }
  if (input?.sourceType !== "text") {
    return failedResult("failed_extract_article", "文章正文提取失败。", input, meta);
  }

  const cleaned = cleanContent(String(input.rawText || ""));
  if (cleaned.cleanedText.length < 80) {
    return failedResult("failed_points", "内容太短，暂时无法生成复习路径。", input, meta);
  }

  markStage(meta, "extracting_content");
  const sourceMap = await options.callSourceMap({ input, cleaned });

  markStage(meta, "generating_points");
  const plan = await options.callReviewPathPlan({ input, cleaned, sourceMap });

  markStage(meta, "generating_questions");
  const unitCardResults = [];
  for (const unit of plan.units) {
    unitCardResults.push(await options.callUnitCards({ input, cleaned, sourceMap, plan, unit }));
  }

  const chapter = buildChapter({ input, cleaned, sourceMap, plan, unitCardResults, meta });

  markStage(meta, "quality_checking");
  const judge = await options.callQualityJudge({ chapter });
  chapter.qualitySummary = judge;

  const validation = validateReviewPathV2(chapter);
  if (!judge.accepted || !validation.valid) {
    return failedResult(
      "failed_questions",
      validation.valid ? "生成内容没有通过质量检查。" : validation.errors.join("；"),
      input,
      meta,
      { chapter, validation, judge }
    );
  }

  markStage(meta, "completed");
  chapter.status = "completed";
  chapter.displayStatusText = V2_STATUS_TEXT.completed;
  chapter.generationMeta = meta;
  chapter.updatedAt = new Date().toISOString();

  return { status: "completed", displayStatusText: V2_STATUS_TEXT.completed, chapter };
}

function buildChapter({ input, cleaned, sourceMap, plan, unitCardResults, meta }) {
  const units = plan.units.map((unit) => {
    const cards = unitCardResults.find((item) => item.unitId === unit.id);
    return {
      id: unit.id,
      order: unit.order,
      title: unit.title,
      shortSummary: unit.shortSummary,
      detailSummary: unit.detailSummary,
      why: unit.why,
      sourceAnchor: unit.sourceAnchor,
      overview: cards.overview,
      questions: cards.questions,
      summary: cards.summary
    };
  });

  return {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: input.chapterId || `chapter_${Date.now()}`,
    status: meta.currentStage,
    displayStatusText: V2_STATUS_TEXT[meta.currentStage],
    title: plan.chapterTitle || input.sourceTitle || sourceMap.source.title || "未命名章节",
    source: {
      type: "article",
      platform: input.sourcePlatform || sourceMap.source.platform || "",
      url: input.sourceUrl || "",
      title: sourceMap.source.title || input.sourceTitle || "",
      author: input.sourceAuthor || input.sourceAccount || sourceMap.source.author || "",
      rawText: String(input.rawText || ""),
      cleanedText: cleaned.cleanedText,
      blocks: sourceMap.source.blocks
    },
    summaryCard: plan.summaryCard,
    units,
    chapterSummary: {
      title: "章节完成",
      statsText: `共 ${units.length} 个核心知识点，${units.reduce((sum, unit) => sum + unit.questions.length, 0)} 道题目`,
      encouragementText: plan.chapterSummary?.encouragementText || plan.summaryCard.text
    },
    generationMeta: meta,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function failedResult(status, message, input, meta, extra = {}) {
  markStage(meta, status);
  const chapter = extra.chapter || {
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: input?.chapterId || `chapter_${Date.now()}`,
    status,
    displayStatusText: V2_STATUS_TEXT[status] || "生成失败",
    title: input?.sourceTitle || "生成失败的章节",
    source: {
      type: input?.sourceType || "article",
      platform: input?.sourcePlatform || "",
      url: input?.sourceUrl || "",
      title: input?.sourceTitle || "",
      author: input?.sourceAuthor || input?.sourceAccount || "",
      rawText: input?.rawText || "",
      cleanedText: "",
      blocks: []
    },
    summaryCard: { text: "", note: "" },
    units: [],
    chapterSummary: { title: "章节未生成", statsText: "", encouragementText: "" },
    failureReason: message,
    generationMeta: meta,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  chapter.status = status;
  chapter.displayStatusText = V2_STATUS_TEXT[status] || "生成失败";
  chapter.failureReason = message;
  chapter.generationMeta = meta;
  return { status, displayStatusText: chapter.displayStatusText, message, chapter, ...extra };
}

function markStage(meta, status) {
  meta.currentStage = status;
  meta.stages.push({
    status,
    displayStatusText: V2_STATUS_TEXT[status] || status,
    at: new Date().toISOString()
  });
}
```

- [ ] **Step 4: Run generator tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js
```

Expected: pass.

- [ ] **Step 5: Add generator checks to `npm run check`**

Add:

```bash
node --check src/v2/generation/generateReviewPathV2.js
node --check src/v2/generation/generateReviewPathV2.test.js
node --test src/v2/generation/generateReviewPathV2.test.js
```

- [ ] **Step 6: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.test.js
git commit -m "feat(v2): orchestrate review path generation"
```

## Task 5: Connect Real Structured Output Calls to the V2 Generator

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `experiments/shibei-v2/backend/src/generation/openaiClient.js` only if current helper cannot accept the V2 schema names.
- Create: `experiments/shibei-v2/backend/src/v2/generation/modelCallers.js`
- Create: `experiments/shibei-v2/backend/src/v2/generation/modelCallers.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Inspect the existing OpenAI helper**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
sed -n '1,240p' experiments/shibei-v2/backend/src/generation/openaiClient.js
```

Expected: confirm the helper exposes a function that accepts `system`, `user`, and JSON schema. Use that function rather than adding a second model client.

- [ ] **Step 2: Write fake-client tests for model callers**

Create `experiments/shibei-v2/backend/src/v2/generation/modelCallers.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createV2ModelCallers } from "./modelCallers.js";

test("createV2ModelCallers sends named schemas through injected client", async () => {
  const schemaNames = [];
  const callers = createV2ModelCallers({
    callStructuredModel: async ({ schemaName }) => {
      schemaNames.push(schemaName);
      if (schemaName === "v2_source_map") {
        return { source: { title: "t", author: "a", platform: "p", blocks: [] } };
      }
      if (schemaName === "v2_review_path_plan") {
        return { chapterTitle: "t", summaryCard: { text: "s", note: "" }, units: [], planningNotes: [] };
      }
      if (schemaName === "v2_unit_cards") {
        return { unitId: "u", overview: { text: "o" }, questions: [], summary: { title: "单元完成", text: "s" } };
      }
      return { accepted: true, score: 5, issues: [], summary: "ok" };
    }
  });

  await callers.callSourceMap({ cleaned: { cleanedText: "text" }, input: {} });
  await callers.callReviewPathPlan({ sourceMap: {}, cleaned: { cleanedText: "text" }, input: {} });
  await callers.callUnitCards({ unit: { id: "u" }, sourceMap: {}, cleaned: { cleanedText: "text" }, input: {} });
  await callers.callQualityJudge({ chapter: {} });

  assert.deepEqual(schemaNames, [
    "v2_source_map",
    "v2_review_path_plan",
    "v2_unit_cards",
    "v2_quality_judge"
  ]);
});
```

- [ ] **Step 3: Implement `modelCallers.js`**

Create `experiments/shibei-v2/backend/src/v2/generation/modelCallers.js`:

```js
import { callStructuredModel as defaultCallStructuredModel } from "../../generation/openaiClient.js";
import { sourceMapSchema, sourceMapSystemPrompt } from "./prompts/sourceMap.js";
import { reviewPathPlanSchema, reviewPathPlanSystemPrompt } from "./prompts/reviewPathPlan.js";
import { unitCardsSchema, unitCardsSystemPrompt } from "./prompts/unitCards.js";
import { qualityJudgeSchema, qualityJudgeSystemPrompt } from "./prompts/qualityJudge.js";

export function createV2ModelCallers({ callStructuredModel = defaultCallStructuredModel, modelUsageRecorder = null } = {}) {
  return {
    callSourceMap: ({ input, cleaned }) => callStructuredModel({
      schemaName: "v2_source_map",
      system: sourceMapSystemPrompt,
      user: JSON.stringify({ input, cleanedText: cleaned.cleanedText }),
      schema: sourceMapSchema,
      modelUsageRecorder
    }),
    callReviewPathPlan: ({ input, cleaned, sourceMap }) => callStructuredModel({
      schemaName: "v2_review_path_plan",
      system: reviewPathPlanSystemPrompt,
      user: JSON.stringify({ input, cleanedText: cleaned.cleanedText, sourceMap }),
      schema: reviewPathPlanSchema,
      modelUsageRecorder
    }),
    callUnitCards: ({ input, cleaned, sourceMap, plan, unit }) => callStructuredModel({
      schemaName: "v2_unit_cards",
      system: unitCardsSystemPrompt,
      user: JSON.stringify({ input, cleanedText: cleaned.cleanedText, sourceMap, planSummary: plan.summaryCard, unit }),
      schema: unitCardsSchema,
      modelUsageRecorder
    }),
    callQualityJudge: ({ chapter }) => callStructuredModel({
      schemaName: "v2_quality_judge",
      system: qualityJudgeSystemPrompt,
      user: JSON.stringify({ chapter }),
      schema: qualityJudgeSchema,
      modelUsageRecorder
    })
  };
}
```

- [ ] **Step 4: Run model caller tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/modelCallers.test.js
```

Expected: pass.

- [ ] **Step 5: Wire default callers into `generateReviewPathV2`**

Modify `experiments/shibei-v2/backend/src/v2/generation/generateReviewPathV2.js`:

```js
import { createV2ModelCallers } from "./modelCallers.js";
```

Inside `generateReviewPathV2`, before the first model call:

```js
const callers = {
  ...createV2ModelCallers({ modelUsageRecorder: options.modelUsageRecorder || null }),
  ...options
};
```

Replace `options.callSourceMap`, `options.callReviewPathPlan`, `options.callUnitCards`, and `options.callQualityJudge` with `callers.callSourceMap`, `callers.callReviewPathPlan`, `callers.callUnitCards`, and `callers.callQualityJudge`.

- [ ] **Step 6: Run V2 generator tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/generation/generateReviewPathV2.test.js src/v2/generation/modelCallers.test.js
```

Expected: pass.

- [ ] **Step 7: Add model caller checks to `npm run check`**

Add:

```bash
node --check src/v2/generation/modelCallers.js
node --check src/v2/generation/modelCallers.test.js
node --test src/v2/generation/modelCallers.test.js
```

- [ ] **Step 8: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/v2/generation
git commit -m "feat(v2): connect review path model callers"
```

## Task 6: Add V2 Chapter Creation Path and Generating Card Status

**Files:**
- Modify: `experiments/shibei-v2/backend/src/chapterGeneration.js`
- Modify: `experiments/shibei-v2/backend/src/generationJobRunner.js`
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Create: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`
- Create: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write serializer tests for completed and generating chapters**

Create `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { serializeV2ChapterForClient } from "./v2Serializers.js";
import { V2_REVIEW_PATH_SCHEMA_VERSION } from "../contracts/reviewPathContract.js";

test("serializeV2ChapterForClient exposes generating card fields", () => {
  const chapter = serializeV2ChapterForClient({
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: "chapter-generating",
    status: "generating_points",
    displayStatusText: "正在生成知识点",
    title: "新文章",
    source: { title: "新文章", author: "作者", url: "", type: "article", blocks: [], rawText: "", cleanedText: "" },
    summaryCard: { text: "", note: "" },
    units: [],
    chapterSummary: { title: "", statsText: "", encouragementText: "" },
    generationMeta: { currentStage: "generating_points", stages: [] }
  });

  assert.equal(chapter.schemaVersion, V2_REVIEW_PATH_SCHEMA_VERSION);
  assert.equal(chapter.cardState, "generating");
  assert.equal(chapter.displayStatusText, "正在生成知识点");
  assert.equal(chapter.knowledgePointCount, 0);
  assert.equal(chapter.questionCount, 0);
});

test("serializeV2ChapterForClient counts completed units and questions", () => {
  const chapter = serializeV2ChapterForClient({
    schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
    id: "chapter-done",
    status: "completed",
    displayStatusText: "已生成",
    title: "已完成文章",
    source: { title: "已完成文章", author: "作者", url: "", type: "article", blocks: [], rawText: "", cleanedText: "" },
    summaryCard: { text: "概要", note: "" },
    units: [
      { id: "u1", questions: [{ id: "q1" }, { id: "q2" }] },
      { id: "u2", questions: [{ id: "q3" }] }
    ],
    chapterSummary: { title: "章节完成", statsText: "", encouragementText: "" },
    generationMeta: { currentStage: "completed", stages: [] }
  });

  assert.equal(chapter.cardState, "notStarted");
  assert.equal(chapter.knowledgePointCount, 2);
  assert.equal(chapter.questionCount, 3);
});
```

- [ ] **Step 2: Implement `v2Serializers.js`**

Create `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`:

```js
import { V2_REVIEW_PATH_SCHEMA_VERSION } from "../contracts/reviewPathContract.js";

export function serializeV2ChapterForClient(chapter, state = {}) {
  const units = Array.isArray(chapter.units) ? chapter.units : [];
  const questionCount = units.reduce((sum, unit) => sum + (Array.isArray(unit.questions) ? unit.questions.length : 0), 0);
  const isGenerating = !["completed", "failed_extract_article", "failed_extract_video", "failed_points", "failed_questions", "failed_no_qualified_questions"].includes(chapter.status);
  const cardState = isGenerating
    ? "generating"
    : state.reviewStatus || (chapter.status === "completed" ? "notStarted" : "failed");

  return {
    ...chapter,
    schemaVersion: chapter.schemaVersion || V2_REVIEW_PATH_SCHEMA_VERSION,
    cardState,
    knowledgePointCount: isGenerating ? 0 : units.length,
    questionCount: isGenerating ? 0 : questionCount,
    canStartReview: chapter.status === "completed",
    isCurrentReviewChapter: state.currentChapterId === chapter.id
  };
}
```

- [ ] **Step 3: Run serializer tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/api/v2Serializers.test.js
```

Expected: pass.

- [ ] **Step 4: Add V2 generator switch in `chapterGeneration.js`**

Modify `experiments/shibei-v2/backend/src/chapterGeneration.js`:

```js
import { generateReviewPathV2 } from "./v2/generation/generateReviewPathV2.js";
```

In `generateFromInput`, choose generator by request:

```js
const useV2 = input.schemaVersion === "v2_review_path_1" || input.generationMode === "v2";
const result = useV2
  ? await generateReviewPathV2(input, options)
  : await generateReviewChapter(input, options);
```

Preserve the existing V1 path as the fallback so old local tests keep passing.

- [ ] **Step 5: Make POST `/api/chapters` accept V2 generation mode**

Modify `experiments/shibei-v2/backend/src/server.js` request parsing for chapter creation so a body like this is accepted:

```json
{
  "generationMode": "v2",
  "schemaVersion": "v2_review_path_1",
  "sourceType": "text",
  "sourceTitle": "文章标题",
  "sourceAuthor": "作者",
  "sourceUrl": "https://example.com",
  "rawText": "完整正文"
}
```

When creating the submitted placeholder chapter, include:

```js
schemaVersion: "v2_review_path_1",
generationMode: "v2",
status: "submitted",
displayStatusText: "排队中，等待生成",
units: [],
source: {
  type: body.sourceType || "article",
  title: body.sourceTitle || "",
  author: body.sourceAuthor || body.sourceAccount || "",
  url: body.sourceUrl || "",
  rawText: body.rawText || "",
  cleanedText: "",
  blocks: []
}
```

- [ ] **Step 6: Ensure newly generated V2 chapters do not become current automatically**

In the same creation flow, do not update current review chapter pointer. The only path that changes current chapter is the explicit `开始复习` endpoint from Task 7.

- [ ] **Step 7: Add checks to `npm run check`**

Add:

```bash
node --check src/v2/api/v2Serializers.js
node --check src/v2/api/v2Serializers.test.js
node --test src/v2/api/v2Serializers.test.js
```

- [ ] **Step 8: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/chapterGeneration.js experiments/shibei-v2/backend/src/generationJobRunner.js experiments/shibei-v2/backend/src/server.js experiments/shibei-v2/backend/src/v2/api
git commit -m "feat(v2): route chapter generation through V2 schema"
```

## Task 7: Add Current Review Chapter State

**Files:**
- Modify: `experiments/shibei-v2/backend/src/db.js`
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Create: `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.js`
- Create: `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write state tests**

Create `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveCurrentReviewChapter,
  setCurrentReviewChapter
} from "./currentReviewChapter.js";

test("resolveCurrentReviewChapter keeps existing current chapter when a new chapter is generated", () => {
  const chapters = [
    { id: "old", status: "completed", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "new", status: "completed", createdAt: "2026-06-18T00:00:00.000Z" }
  ];
  const current = resolveCurrentReviewChapter({ chapters, state: { currentReviewChapterId: "old" } });
  assert.equal(current?.id, "old");
});

test("resolveCurrentReviewChapter falls back to latest completed chapter only when no pointer exists", () => {
  const chapters = [
    { id: "old", status: "completed", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "new", status: "completed", createdAt: "2026-06-18T00:00:00.000Z" }
  ];
  const current = resolveCurrentReviewChapter({ chapters, state: {} });
  assert.equal(current?.id, "new");
});

test("setCurrentReviewChapter rejects non-completed chapters", () => {
  assert.throws(() => setCurrentReviewChapter({
    chapter: { id: "generating", status: "generating_points" },
    state: {}
  }), /completed/);
});
```

- [ ] **Step 2: Implement current chapter logic**

Create `experiments/shibei-v2/backend/src/v2/state/currentReviewChapter.js`:

```js
export function resolveCurrentReviewChapter({ chapters, state }) {
  const completed = [...(chapters || [])].filter((chapter) => chapter.status === "completed");
  const pointed = completed.find((chapter) => chapter.id === state?.currentReviewChapterId);
  if (pointed) return pointed;
  return completed.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
}

export function setCurrentReviewChapter({ chapter, state }) {
  if (!chapter || chapter.status !== "completed") {
    throw new Error("current review chapter must be completed");
  }
  return {
    ...(state || {}),
    currentReviewChapterId: chapter.id,
    currentReviewChapterUpdatedAt: new Date().toISOString()
  };
}
```

- [ ] **Step 3: Add device state persistence to `db.js`**

Modify `experiments/shibei-v2/backend/src/db.js` schema setup:

```sql
CREATE TABLE IF NOT EXISTS device_state (
  device_id TEXT PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Add functions:

```js
export async function getDeviceState(deviceId) {
  const result = await pool.query(
    "SELECT state_json FROM device_state WHERE device_id = $1",
    [deviceId]
  );
  return result.rows[0]?.state_json || {};
}

export async function upsertDeviceState(deviceId, state) {
  await pool.query(
    `INSERT INTO device_state (device_id, state_json, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (device_id)
     DO UPDATE SET state_json = EXCLUDED.state_json, updated_at = NOW()`,
    [deviceId, JSON.stringify(state || {})]
  );
  return getDeviceState(deviceId);
}
```

Also update the memory fallback store to include `deviceState: {}` per device.

- [ ] **Step 4: Add current chapter endpoints**

Modify `experiments/shibei-v2/backend/src/server.js`:

```http
GET /api/v2/current-review-chapter
PUT /api/v2/current-review-chapter
```

`GET` response:

```json
{
  "currentChapter": { "id": "chapter_123" },
  "currentReviewChapterId": "chapter_123"
}
```

`PUT` body:

```json
{ "chapterId": "chapter_123" }
```

`PUT` behavior:

- Load chapter by id.
- Reject missing chapter with `404 chapter_not_found`.
- Reject non-completed chapter with `422 chapter_not_reviewable`.
- Persist state with `setCurrentReviewChapter`.
- Start or resume V2 review session in Task 8.

- [ ] **Step 5: Run state tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/state/currentReviewChapter.test.js
```

Expected: pass.

- [ ] **Step 6: Add checks and run full backend check**

Add the state module and test to `npm run check`, then run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/db.js experiments/shibei-v2/backend/src/server.js experiments/shibei-v2/backend/src/v2/state
git commit -m "feat(v2): persist current review chapter"
```

## Task 8: Implement V2 Review Session and Progress Contract

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.js`
- Create: `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.test.js`
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write progression tests**

Create `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createReviewSessionV2,
  currentCardForSessionV2,
  advanceReviewSessionV2,
  recordQuestionAttemptV2
} from "./reviewSessionV2.js";

const chapter = {
  id: "chapter",
  units: [
    {
      id: "unit-01",
      questions: [
        { id: "q-001", type: "multiple_choice", correctOptionId: "A" },
        { id: "q-002", type: "matching", pairs: [{ leftId: "L1", rightId: "R1" }] }
      ]
    }
  ],
  chapterSummary: { title: "章节完成", statsText: "共 1 个核心知识点，2 道题目", encouragementText: "done" }
};

test("V2 review session starts at unit overview", () => {
  const session = createReviewSessionV2(chapter);
  const card = currentCardForSessionV2(chapter, session);
  assert.equal(card.type, "unit_overview");
  assert.equal(card.unitId, "unit-01");
});

test("V2 review session goes overview, questions, unit summary, chapter summary", () => {
  let session = createReviewSessionV2(chapter);
  session = advanceReviewSessionV2(chapter, session);
  assert.equal(currentCardForSessionV2(chapter, session).questionId, "q-001");
  session = advanceReviewSessionV2(chapter, session);
  assert.equal(currentCardForSessionV2(chapter, session).questionId, "q-002");
  session = advanceReviewSessionV2(chapter, session);
  assert.equal(currentCardForSessionV2(chapter, session).type, "unit_summary");
  session = advanceReviewSessionV2(chapter, session);
  assert.equal(currentCardForSessionV2(chapter, session).type, "chapter_summary");
});

test("recordQuestionAttemptV2 stores answer state without changing source-article return behavior", () => {
  const session = advanceReviewSessionV2(chapter, createReviewSessionV2(chapter));
  const updated = recordQuestionAttemptV2(chapter, session, {
    questionId: "q-001",
    selectedOptionId: "A",
    isCorrect: true
  });
  assert.equal(updated.questionStates["q-001"].answered, true);
  assert.equal(updated.questionStates["q-001"].selectedOptionId, "A");
});
```

- [ ] **Step 2: Implement review session helpers**

Create `experiments/shibei-v2/backend/src/v2/review/reviewSessionV2.js`:

```js
export function createReviewSessionV2(chapter) {
  return {
    id: `review_${chapter.id}_${Date.now()}`,
    schemaVersion: "v2_review_session_1",
    chapterId: chapter.id,
    status: "active",
    currentIndex: 0,
    queue: buildReviewQueueV2(chapter),
    questionStates: {},
    unitResults: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function buildReviewQueueV2(chapter) {
  const queue = [];
  for (const unit of chapter.units || []) {
    queue.push({ type: "unit_overview", unitId: unit.id });
    for (const question of unit.questions || []) {
      queue.push({ type: "question", unitId: unit.id, questionId: question.id });
    }
    queue.push({ type: "unit_summary", unitId: unit.id });
  }
  queue.push({ type: "chapter_summary", chapterId: chapter.id });
  return queue;
}

export function currentCardForSessionV2(chapter, session) {
  return session.queue[session.currentIndex] || { type: "completed", chapterId: chapter.id };
}

export function advanceReviewSessionV2(chapter, session) {
  const next = {
    ...session,
    currentIndex: Math.min(session.currentIndex + 1, session.queue.length),
    updatedAt: new Date().toISOString()
  };
  if (next.currentIndex >= next.queue.length) next.status = "completed";
  return next;
}

export function recordQuestionAttemptV2(chapter, session, attempt) {
  const question = findQuestion(chapter, attempt.questionId);
  if (!question) throw new Error(`question ${attempt.questionId} not found`);
  return {
    ...session,
    questionStates: {
      ...session.questionStates,
      [question.id]: {
        answered: true,
        selectedOptionId: attempt.selectedOptionId || "",
        matchingPairs: attempt.matchingPairs || [],
        isCorrect: Boolean(attempt.isCorrect),
        answeredAt: new Date().toISOString()
      }
    },
    updatedAt: new Date().toISOString()
  };
}

function findQuestion(chapter, questionId) {
  for (const unit of chapter.units || []) {
    const question = (unit.questions || []).find((item) => item.id === questionId);
    if (question) return question;
  }
  return null;
}
```

- [ ] **Step 3: Add V2 review session endpoints**

Modify `experiments/shibei-v2/backend/src/server.js`:

```http
POST /api/v2/chapters/:chapterId/review-session
GET /api/v2/chapters/:chapterId/review-session
POST /api/v2/review-sessions/:sessionId/attempts
POST /api/v2/review-sessions/:sessionId/advance
```

Responses should include:

```json
{
  "chapter": { "schemaVersion": "v2_review_path_1" },
  "reviewSession": { "schemaVersion": "v2_review_session_1" },
  "currentCard": { "type": "question", "unitId": "unit-01", "questionId": "q-001" }
}
```

- [ ] **Step 4: Preserve source-article return state**

Do not reset a question attempt when the user opens source article and returns. State changes only through:

- `POST /api/v2/review-sessions/:sessionId/attempts`
- `POST /api/v2/review-sessions/:sessionId/advance`

This mirrors the frontend fix where source article route returns to the previous answered/unanswered question state.

- [ ] **Step 5: Run review session tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/review/reviewSessionV2.test.js
```

Expected: pass.

- [ ] **Step 6: Add checks and run full backend check**

Add review module/test to `npm run check`, then run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/server.js experiments/shibei-v2/backend/src/v2/review
git commit -m "feat(v2): add ordered review session"
```

## Task 9: Implement Source Article, Anchors, Favorites, and Notes Entry Contract

**Files:**
- Modify: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`
- Modify: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Modify: `experiments/shibei-v2/backend/src/db.js`

- [ ] **Step 1: Add serializer tests for source article anchors**

Append to `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`:

```js
import { serializeV2SourceArticle, serializeV2FavoriteQuestion } from "./v2Serializers.js";

test("serializeV2SourceArticle returns full blocks and highlight anchor", () => {
  const chapter = {
    id: "chapter",
    source: {
      title: "原文",
      author: "作者",
      url: "https://example.com",
      blocks: [
        { id: "p-001", type: "paragraph", text: "第一段" },
        { id: "p-002", type: "paragraph", text: "第二段" }
      ]
    },
    units: [
      {
        id: "unit-01",
        sourceAnchor: { id: "anchor-01", blockIds: ["p-002"], quote: "第二段", label: "第 2 段" },
        questions: [{ id: "q-001", sourceAnchorId: "anchor-01" }]
      }
    ]
  };
  const article = serializeV2SourceArticle(chapter, { questionId: "q-001" });
  assert.equal(article.blocks.length, 2);
  assert.deepEqual(article.highlight.blockIds, ["p-002"]);
});

test("serializeV2FavoriteQuestion keeps route ids for notes entry", () => {
  const favorite = serializeV2FavoriteQuestion({
    id: "fav",
    chapterId: "chapter",
    unitId: "unit-01",
    questionId: "q-001",
    questionType: "multiple_choice",
    title: "收藏题目",
    sourceTitle: "原文",
    createdAt: "2026-06-18T00:00:00.000Z"
  });
  assert.equal(favorite.route.chapterId, "chapter");
  assert.equal(favorite.route.questionId, "q-001");
});
```

- [ ] **Step 2: Implement source and favorite serializers**

Add to `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`:

```js
export function serializeV2SourceArticle(chapter, { questionId = "", unitId = "" } = {}) {
  const anchor = findAnchor(chapter, { questionId, unitId });
  return {
    chapterId: chapter.id,
    title: chapter.source?.title || chapter.title,
    author: chapter.source?.author || "",
    url: chapter.source?.url || "",
    blocks: chapter.source?.blocks || [],
    highlight: anchor ? {
      anchorId: anchor.id,
      label: anchor.label,
      blockIds: anchor.blockIds,
      quote: anchor.quote
    } : null
  };
}

export function serializeV2FavoriteQuestion(favorite) {
  return {
    id: favorite.id,
    title: favorite.title,
    sourceTitle: favorite.sourceTitle,
    questionType: favorite.questionType,
    createdAt: favorite.createdAt,
    route: {
      chapterId: favorite.chapterId,
      unitId: favorite.unitId,
      questionId: favorite.questionId
    }
  };
}

function findAnchor(chapter, { questionId, unitId }) {
  for (const unit of chapter.units || []) {
    if (unitId && unit.id === unitId) return unit.sourceAnchor || null;
    const question = (unit.questions || []).find((item) => item.id === questionId);
    if (question) {
      return question.sourceAnchorId === unit.sourceAnchor?.id ? unit.sourceAnchor : null;
    }
  }
  return null;
}
```

- [ ] **Step 3: Add source article endpoint**

Modify `experiments/shibei-v2/backend/src/server.js`:

```http
GET /api/v2/chapters/:chapterId/source-article?questionId=q-001
GET /api/v2/chapters/:chapterId/source-article?unitId=unit-01
```

Return:

```json
{
  "sourceArticle": {
    "chapterId": "chapter",
    "title": "原文",
    "author": "作者",
    "url": "https://example.com",
    "blocks": [],
    "highlight": { "anchorId": "anchor-01", "blockIds": ["p-002"] }
  }
}
```

- [ ] **Step 4: Upgrade favorite question payloads**

Modify the existing favorite creation flow so V2 favorites persist:

```json
{
  "id": "chapter_q-001",
  "chapterId": "chapter",
  "unitId": "unit-01",
  "questionId": "q-001",
  "questionType": "multiple_choice",
  "title": "题干摘要",
  "sourceTitle": "原文标题",
  "createdAt": "2026-06-18T00:00:00.000Z"
}
```

If a favorite is created from a V1 chapter, keep the existing V1 behavior. If it is created from a V2 chapter, compute `unitId` by scanning `chapter.units`.

- [ ] **Step 5: Run serializer tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/api/v2Serializers.test.js
```

Expected: pass.

- [ ] **Step 6: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 7: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/src/server.js experiments/shibei-v2/backend/src/db.js experiments/shibei-v2/backend/src/v2/api
git commit -m "feat(v2): expose source anchors and favorite routes"
```

## Task 10: Implement Generation Notifications, Failure Detail, and Recommended Article Entry

**Files:**
- Create: `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.js`
- Create: `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.test.js`
- Modify: `experiments/shibei-v2/backend/src/server.js`
- Modify: `experiments/shibei-v2/backend/src/generationJobRunner.js`
- Modify: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`
- Modify: `experiments/shibei-v2/backend/src/v2/api/v2Serializers.test.js`
- Modify: `experiments/shibei-v2/backend/package.json`

- [ ] **Step 1: Write recommended article tests**

Create `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  listRecommendedArticles,
  recommendedArticleToGenerationInput
} from "./recommendedArticles.js";

test("recommended articles can be listed for Discover", () => {
  const articles = listRecommendedArticles();
  assert.ok(articles.length > 0);
  assert.ok(articles[0].id);
  assert.ok(articles[0].title);
  assert.ok(articles[0].sourceUrl);
});

test("recommended article generation input uses V2 mode", () => {
  const article = listRecommendedArticles()[0];
  const input = recommendedArticleToGenerationInput(article.id);
  assert.equal(input.generationMode, "v2");
  assert.equal(input.schemaVersion, "v2_review_path_1");
  assert.equal(input.sourceType, "text");
  assert.ok(input.rawText.length > 80);
});
```

- [ ] **Step 2: Implement recommended articles**

Create `experiments/shibei-v2/backend/src/v2/recommended/recommendedArticles.js`:

```js
const RECOMMENDED_ARTICLES = [
  {
    id: "recommended-ai-agents",
    title: "Anthropic设计总监：为什么您的整个团队都应该使用AI Agents协同工作",
    sourceAuthor: "Anthropic",
    sourceUrl: "https://example.com/recommended/ai-agents",
    rawText: [
      "AI Agents 正在改变团队协作方式。",
      "团队需要理解 agent 如何读取上下文、生成判断、暴露过程并接受评估。",
      "好的协作不是把判断完全交给 AI，而是让 AI 的判断能够被人检查、校准和改进。"
    ].join("\n\n")
  }
];

export function listRecommendedArticles() {
  return RECOMMENDED_ARTICLES.map(({ rawText, ...article }) => article);
}

export function recommendedArticleToGenerationInput(articleId) {
  const article = RECOMMENDED_ARTICLES.find((item) => item.id === articleId);
  if (!article) throw new Error(`recommended article ${articleId} not found`);
  return {
    generationMode: "v2",
    schemaVersion: "v2_review_path_1",
    sourceType: "text",
    sourceTitle: article.title,
    sourceAuthor: article.sourceAuthor,
    sourceUrl: article.sourceUrl,
    sourcePlatform: "recommended",
    rawText: article.rawText
  };
}
```

- [ ] **Step 3: Add recommended endpoints**

Modify `experiments/shibei-v2/backend/src/server.js`:

```http
GET /api/v2/recommended-articles
POST /api/v2/recommended-articles/:articleId/generate
```

The generate endpoint should call the same chapter creation flow as upload with `recommendedArticleToGenerationInput(articleId)`.

- [ ] **Step 4: Serialize failure notification detail**

Add to `experiments/shibei-v2/backend/src/v2/api/v2Serializers.js`:

```js
export function serializeV2GenerationFailureDetail(notification, chapter) {
  return {
    notificationId: notification.id,
    chapterId: chapter.id,
    title: "章节生成失败",
    failureReason: chapter.failureReason || notification.message || "生成过程中出现问题。",
    canRegenerate: Boolean(chapter.source?.rawText || chapter.source?.url),
    sourceTitle: chapter.source?.title || chapter.title,
    createdAt: notification.createdAt
  };
}
```

- [ ] **Step 5: Add failure detail endpoint**

Modify `experiments/shibei-v2/backend/src/server.js`:

```http
GET /api/v2/notifications/:notificationId/failure-detail
```

Behavior:

- If notification type is success, return `409 notification_not_failure`.
- If failure chapter is missing, return `404 chapter_not_found`.
- Return `serializeV2GenerationFailureDetail(notification, chapter)`.

- [ ] **Step 6: Ensure success notification routes to chapter detail**

When generation completes successfully, notification payload should include:

```json
{
  "type": "generation_success",
  "chapterId": "chapter_123",
  "target": { "route": "chapter_detail", "chapterId": "chapter_123" }
}
```

When generation fails:

```json
{
  "type": "generation_failure",
  "chapterId": "chapter_123",
  "target": { "route": "generation_failure_detail", "notificationId": "notification_123" }
}
```

- [ ] **Step 7: Run recommended and serializer tests**

Run:

```bash
cd experiments/shibei-v2/backend
node --test src/v2/recommended/recommendedArticles.test.js src/v2/api/v2Serializers.test.js
```

Expected: pass.

- [ ] **Step 8: Add checks and run full backend check**

Add recommended module/test to `npm run check`, then run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 9: Commit**

Run:

```bash
git add experiments/shibei-v2/backend/package.json experiments/shibei-v2/backend/src/server.js experiments/shibei-v2/backend/src/generationJobRunner.js experiments/shibei-v2/backend/src/v2/api experiments/shibei-v2/backend/src/v2/recommended
git commit -m "feat(v2): add recommended generation and failure notifications"
```

## Task 11: Document Frontend-to-Backend Field Mapping

**Files:**
- Modify: `experiments/shibei-v2/docs/v2-chapter-review-flow-prd-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md`
- Modify: `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md`
- Modify: `experiments/shibei-v2/docs/golden-samples/README.md`

- [ ] **Step 1: Add backend contract section to PRD**

Append this section to `experiments/shibei-v2/docs/v2-chapter-review-flow-prd-zh.md`:

```markdown
## V2 Backend Contract Baseline

V2 后端以 `schemaVersion = "v2_review_path_1"` 作为章节复习路径契约。章节不再以 V1 的 flat `knowledgePoints + questions` 作为主合同，而是输出 `summaryCard + ordered units + chapterSummary`。

每个 unit 必须包含：

- `id`
- `order`
- `title`
- `shortSummary`
- `detailSummary`
- `why`
- `sourceAnchor`
- `overview`
- `questions`
- `summary`

每道题必须包含：

- `id`
- `type`
- `stem`
- `correctUnderstanding`
- `misconception`
- `explanation`
- `sourceAnchorId`

选择题额外包含 `options` 和 `correctOptionId`；连线题额外包含 `leftItems`、`rightItems` 和 `pairs`。

章节总结必须包含：

- `chapterSummary.title`：固定标题，例如“章节完成”。
- `chapterSummary.statsText`：程序计算的整章统计文案。
- `chapterSummary.encouragementText`：模型根据章节内容生成的整章完成鼓励文案。

新生成章节不会自动替换主页当前复习章节。只有用户在章节详情点击“开始复习”，后端才更新当前复习章节指针。
```

- [ ] **Step 2: Add frontend field mapping**

Append this section to `experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md`:

```markdown
## V2 Backend Field Mapping

| SwiftUI view / component | Backend field |
| --- | --- |
| 首页当前章节 banner | `currentChapter.title`, `currentChapter.source.title` |
| 首页路径节点 | `currentChapter.units[].title`, `currentChapter.reviewSession` |
| 节点浮窗 | `units[].title`, `units[].questions.length` |
| 章节详情 hero | `chapter.title`, `chapter.source.author`, `chapter.source.url`, `chapter.summaryCard.text` |
| 章节详情知识点列表 | `chapter.units[]` |
| 知识点列表折叠态 | `unit.title`, `unit.shortSummary` |
| 知识点展开态 / 查看全部知识点 | `unit.detailSummary`, `unit.sourceAnchor` |
| 知识点开场页 | `unit.overview.text`, `unit.detailSummary` |
| 题目页 | `question.stem`, `question.options` or `question.leftItems/rightItems/pairs` |
| 答后反馈浮窗 | `question.explanation`；`correctUnderstanding` / `misconception` 只作为生成和质检中间语义，不默认展示 |
| 查看原文页 | `chapter.source.blocks`, `question.sourceAnchorId` -> `unit.sourceAnchor.blockIds` |
| 单元总结页 | `unit.summary` plus session metrics |
| 章节总结页 | `chapter.chapterSummary.statsText`, `chapter.chapterSummary.encouragementText` plus session metrics |
| 全部章节生成中卡片 | `chapter.status`, `chapter.displayStatusText`, `chapter.generationMeta.currentStage` |
| 通知页 | `notification.type`, `notification.target`, `chapter.failureReason` |
| 笔记页收藏卡 | `favorite.chapterId`, `favorite.unitId`, `favorite.questionId`, `favorite.questionType`, `favorite.sourceTitle` |
```

- [ ] **Step 3: Update golden samples README**

Append this section to `experiments/shibei-v2/docs/v2-backend-field-contract-zh.md` when implementing future fields:

```markdown
## Field Change Discipline

每次修改 `schemaVersion = "v2_review_path_1"` 下的字段，都必须同步更新本文件。字段记录必须包含字段用途、生成来源、前端使用位置、展示规则和相邻字段边界。不能只在 prompt 或代码里隐式新增字段。
```

Append this section to `experiments/shibei-v2/docs/golden-samples/README.md`:

```markdown
## Backend Use

Backend tests load these samples through `src/v2/golden/loadGoldenReviewPaths.js` and normalize them into `schemaVersion = "v2_review_path_1"`. Golden samples are calibration references for structure, source anchoring, matching questions, feedback style, and unit ordering. They are not fixed templates for exact question count.
```

- [ ] **Step 4: Run markdown search checks**

Run:

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline
rg -n "schemaVersion = \"v2_review_path_1\"|V2 Backend Field Mapping|Backend Use" experiments/shibei-v2/docs
```

Expected: all three new sections appear.

- [ ] **Step 5: Commit**

Run:

```bash
git add experiments/shibei-v2/docs/v2-chapter-review-flow-prd-zh.md experiments/shibei-v2/docs/v2-frontend-implementation-notes-zh.md experiments/shibei-v2/docs/golden-samples/README.md
git commit -m "docs(v2): map backend contract to frontend flow"
```

## Task 12: End-to-End Local Verification

**Files:**
- Modify only if tests reveal a mismatch:
  - `experiments/shibei-v2/backend/src/v2/**`
  - `experiments/shibei-v2/backend/src/server.js`
  - `experiments/shibei-v2/backend/src/db.js`

- [ ] **Step 1: Run full backend check**

Run:

```bash
cd experiments/shibei-v2/backend
npm run check
```

Expected: pass.

- [ ] **Step 2: Start the V2 backend locally**

Run:

```bash
cd experiments/shibei-v2/backend
PORT=8787 npm run dev
```

Expected: server logs show it is listening on port `8787`.

- [ ] **Step 3: Create a V2 chapter from text**

In a second terminal:

```bash
curl -sS -X POST http://localhost:8787/api/chapters \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Id: local-v2-test' \
  -d '{
    "generationMode": "v2",
    "schemaVersion": "v2_review_path_1",
    "sourceType": "text",
    "sourceTitle": "Hook 测试文章",
    "sourceAuthor": "MetaTown",
    "sourceUrl": "https://example.com/hook",
    "rawText": "Hook 不是另一个提示词，而是在 AI agent 的关键动作前后加入规则、上下文和验证的控制器。它和 Prompt、规则文档、CI 各自承担不同职责。Demo 阶段只追求这次能跑，但进入真实仓库后，需要稳定复用、协作和过程控制。"
  }' | jq .
```

Expected:

- Response has `chapter.schemaVersion = "v2_review_path_1"`.
- Response has `chapter.status` in a generating or completed state depending on sync/async mode.
- Response does not set the chapter as current review chapter automatically.

- [ ] **Step 4: List chapters and confirm generating/completed card fields**

Run:

```bash
curl -sS http://localhost:8787/api/chapters \
  -H 'X-Device-Id: local-v2-test' | jq '.chapters[0] | {schemaVersion, cardState, displayStatusText, knowledgePointCount, questionCount}'
```

Expected:

```json
{
  "schemaVersion": "v2_review_path_1",
  "cardState": "generating",
  "displayStatusText": "正在生成知识点",
  "knowledgePointCount": 0,
  "questionCount": 0
}
```

If the local path completes immediately with fake callers or fixtures, expected `cardState` is `notStarted` and counts are greater than zero.

- [ ] **Step 5: Set current review chapter explicitly**

Run this after a completed V2 chapter exists:

```bash
curl -sS -X PUT http://localhost:8787/api/v2/current-review-chapter \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Id: local-v2-test' \
  -d '{"chapterId":"REPLACE_WITH_COMPLETED_CHAPTER_ID"}' | jq .
```

Expected:

- Response includes `currentReviewChapterId`.
- `GET /api/v2/current-review-chapter` returns the same id.

- [ ] **Step 6: Start a review session**

Run:

```bash
curl -sS -X POST http://localhost:8787/api/v2/chapters/REPLACE_WITH_COMPLETED_CHAPTER_ID/review-session \
  -H 'X-Device-Id: local-v2-test' | jq '{currentCard, reviewSession: .reviewSession.schemaVersion}'
```

Expected:

```json
{
  "currentCard": { "type": "unit_overview" },
  "reviewSession": "v2_review_session_1"
}
```

- [ ] **Step 7: Verify source article highlight endpoint**

Run with an existing question id:

```bash
curl -sS 'http://localhost:8787/api/v2/chapters/REPLACE_WITH_COMPLETED_CHAPTER_ID/source-article?questionId=REPLACE_WITH_QUESTION_ID' \
  -H 'X-Device-Id: local-v2-test' | jq '{blockCount: .sourceArticle.blocks | length, highlight: .sourceArticle.highlight}'
```

Expected:

- `blockCount` is greater than zero.
- `highlight.blockIds` contains at least one source block id.

- [ ] **Step 8: Verify notes favorite route**

Run:

```bash
curl -sS -X POST http://localhost:8787/api/favorites/questions \
  -H 'Content-Type: application/json' \
  -H 'X-Device-Id: local-v2-test' \
  -d '{"chapterId":"REPLACE_WITH_COMPLETED_CHAPTER_ID","questionId":"REPLACE_WITH_QUESTION_ID"}' | jq '.favorite.route'
```

Expected:

```json
{
  "chapterId": "REPLACE_WITH_COMPLETED_CHAPTER_ID",
  "unitId": "unit-...",
  "questionId": "REPLACE_WITH_QUESTION_ID"
}
```

- [ ] **Step 9: Commit any verification fixes**

If any local verification fix was needed:

```bash
git add experiments/shibei-v2/backend experiments/shibei-v2/docs
git commit -m "fix(v2): complete backend contract verification"
```

If no fixes were needed, do not create an empty commit.

## Self-Review

### Spec Coverage

- V2 isolated development: covered by file structure and all tasks targeting `experiments/shibei-v2/backend/`.
- Frontend-driven fields: covered by Contract Shape, Task 1, Task 9, and Task 11.
- Prompt redesign: covered by Task 3, Task 4, and Task 5.
- Matching question support: covered by Task 1, Task 2, Task 3, and Task 8.
- Source anchors and full source article: covered by Task 1 and Task 9.
- Current chapter replacement rule: covered by Task 7.
- Upload/recommended generation flow: covered by Task 6 and Task 10.
- Notifications and failure detail: covered by Task 10.
- Notes/favorite question route: covered by Task 9.
- Golden sample regression: covered by Task 2 and Task 12.

### Placeholder Scan

This plan avoids open-ended placeholder language. Every task names exact files, commands, and expected outcomes. Code snippets define concrete functions, constants, endpoints, and data shapes.

### Type Consistency

The plan consistently uses:

- `schemaVersion: "v2_review_path_1"`
- `question.type: "multiple_choice" | "matching"`
- `sourceAnchor.id` and `question.sourceAnchorId`
- `unit.questions`
- `reviewSession.schemaVersion: "v2_review_session_1"`
- `currentReviewChapterId`
- `generationMode: "v2"`

## 2026-06-19 progress update 3

本轮新增了 V2 出题质量测试入口，作为“接 iOS 真页面之前”的人工审题阶段。

已完成：

- 新增 `src/v2/generation/tests/runV2QualityExperiment.js`
  - 支持 `QUALITY_ARTICLE_URL` 或 `QUALITY_ARTICLE_TEXT_FILE`。
  - 调用 `runV2GenerationJob` 跑 V2 pipeline。
  - 输出 JSON 与 HTML 报告路径。
- 新增 `src/v2/generation/tests/v2QualityExperiment.js`
  - 生成 `v2_quality_report_1` 报告对象。
  - 渲染可人工审题的 HTML：章节概要、知识点短/长总结、选择题、连线题、答案、解释、source anchor 和完整 source blocks。
- 新增 `npm run quality:v2`
  - 用于本地跑单篇文章质量测试。
- 新增测试 `src/v2/generation/tests/v2QualityExperiment.test.js`
  - 覆盖 HTML 展开、失败态展示、artifact 唯一路径和落盘。

当前阶段结论：

- 可以开始用真实文章跑第一轮 V2 出题质量测试。
- 这一步优先看题目质量，不依赖手机端。
- 发现 prompt 问题时优先改 `v2-prompt-field-rules-zh.md` 与 `buildV2PromptMessages.js`，再重新跑同一篇文章对比报告。
