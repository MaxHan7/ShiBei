# Article Structure Driven Question Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin v9 article-structure layer so knowledge points, questions, and quality scoring are evaluated against article structure and learning goals.

**Architecture:** Introduce `ArticleStructureMap` after content cleaning and source block construction. Bind knowledge points and questions to structure nodes and evidence blocks, then extend quality reports with structure coverage, claim fidelity, and source coverage diagnostics. Existing iOS clients remain compatible because all new fields are optional.

**Tech Stack:** Node.js ESM backend, existing generation modules under `backend/src/generation`, Node test runner via `npm --prefix backend run check`, quality experiment scripts under `backend/src/generation/tests`.

---

## File Structure

- Create `backend/src/generation/articleStructure.js`
  - Builds and normalizes `ArticleStructureMap`.
  - Provides deterministic fallback structure when model generation fails or is not used.
  - Exports binding helpers for knowledge points.
- Modify `backend/src/generation/index.js`
  - Calls structure builder after `cleanContent`.
  - Adds structure map to generation debug and generation meta.
  - Passes structure map into filtering, question generation, and evaluation.
- Modify `backend/src/generation/filterKnowledgePoints.js`
  - Adds structure-aware ranking and binding fields without breaking existing filters.
- Modify `backend/src/generation/generateQuestions.js`
  - Includes `structureNodeId`, `sourceEvidenceIds`, and structure role in question prompt payload.
- Modify `backend/src/generation/evaluateQuestions.js`
  - Adds claim fidelity and source coverage scoring.
  - Detects composite questions whose source snippet does not cover all key concepts.
- Modify `backend/src/generation/tests/qualityReport.js`
  - Adds structure coverage summary and review row fields.
- Create `backend/src/generation/tests/articleStructure.test.js`
  - Unit tests for structure map, binding, and coverage scoring.
- Modify `backend/src/generation/tests/reviewableSelection.test.js`
  - Regression tests for composite question source coverage.
- Modify `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/README.md`
  - Add v9 experiment record after running `quality:single`.
- Modify `docs/question-quality-long-term-roadmap-zh.md`
  - Mark v9 as the next core direction.

---

### Task 1: Add Article Structure Map Types And Deterministic Builder

**Files:**
- Create: `backend/src/generation/articleStructure.js`
- Test: `backend/src/generation/tests/articleStructure.test.js`

- [ ] **Step 1: Write failing tests for deterministic structure building**

Add this test file:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildArticleStructureMap,
  normalizeArticleStructureMap
} from "../articleStructure.js";

test("buildArticleStructureMap creates ordered structure nodes from paragraphs", () => {
  const cleanedText = [
    "Hook 是什么",
    "Hook 是在 AI agent 生命周期特定节点自动触发的控制器。",
    "Hook 和 prompt 的区别",
    "prompt 是请求模型记住，hook 是让系统执行。",
    "什么时候需要 Hook",
    "当流程需要自动检查、格式化或阻断危险操作时，就应该考虑 Hook。"
  ].join("\\n\\n");

  const map = buildArticleStructureMap({ cleanedText });

  assert.equal(map.topic.length > 0, true);
  assert.equal(map.nodes.length >= 3, true);
  assert.deepEqual(map.nodes.map((node) => node.sourceOrder), [0, 1, 2]);
  assert.equal(map.nodes.some((node) => node.role === "definition"), true);
  assert.equal(map.nodes.some((node) => node.role === "contrast"), true);
  assert.equal(map.nodes.every((node) => node.evidenceBlockIds.length > 0), true);
});

test("normalizeArticleStructureMap keeps stable ids and safe defaults", () => {
  const map = normalizeArticleStructureMap({
    topic: "Hook",
    centralClaim: "Hook 是控制器",
    nodes: [
      {
        title: "Hook 定义",
        role: "definition",
        claim: "Hook 自动触发动作",
        evidenceBlockIds: ["p1-s0-0"]
      }
    ],
    learningPath: ["Hook 定义"]
  });

  assert.equal(map.nodes[0].id, "asn-1");
  assert.equal(map.nodes[0].role, "definition");
  assert.equal(map.nodes[0].sourceOrder, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/articleStructure.test.js
```

Expected: FAIL because `articleStructure.js` does not exist.

- [ ] **Step 3: Implement deterministic structure builder**

Create `backend/src/generation/articleStructure.js`:

```js
import { buildSourceBlocks, inferSourceEvidenceRole } from "./evaluateQuestions.js";

export function buildArticleStructureMap({ cleanedText = "", sourceBlocks = null } = {}) {
  const blocks = Array.isArray(sourceBlocks) && sourceBlocks.length
    ? sourceBlocks
    : buildSourceBlocks(cleanedText);
  const paragraphBlocks = blocks.filter((block) => block.text && block.text.length >= 12);
  const nodes = paragraphBlocks
    .filter((block) => isLikelyStructureNode(block))
    .map((block, index) => ({
      id: `asn-${index + 1}`,
      title: titleForBlock(block),
      role: normalizeStructureRole(block.evidenceRole || inferSourceEvidenceRole(block.text)),
      claim: block.text.slice(0, 180),
      whyItMatters: whyItMattersForRole(block.evidenceRole || inferSourceEvidenceRole(block.text)),
      evidenceBlockIds: [block.blockId],
      sourceOrder: index
    }));

  const normalized = normalizeArticleStructureMap({
    topic: inferTopic(cleanedText, nodes),
    centralClaim: nodes[0]?.claim || "",
    nodes: nodes.length ? nodes : fallbackNodes(paragraphBlocks),
    learningPath: nodes.map((node) => node.title)
  });
  return normalized;
}

export function normalizeArticleStructureMap(input = {}) {
  const nodes = (Array.isArray(input.nodes) ? input.nodes : [])
    .map((node, index) => ({
      id: String(node.id || `asn-${index + 1}`),
      title: String(node.title || `结构节点 ${index + 1}`).trim(),
      role: normalizeStructureRole(node.role),
      claim: String(node.claim || "").trim(),
      whyItMatters: String(node.whyItMatters || "").trim(),
      evidenceBlockIds: Array.isArray(node.evidenceBlockIds)
        ? node.evidenceBlockIds.map(String).filter(Boolean)
        : [],
      sourceOrder: Number.isFinite(Number(node.sourceOrder)) ? Number(node.sourceOrder) : index
    }))
    .filter((node) => node.title && node.claim);

  return {
    topic: String(input.topic || nodes[0]?.title || "文章主题").trim(),
    centralClaim: String(input.centralClaim || nodes[0]?.claim || "").trim(),
    nodes,
    learningPath: Array.isArray(input.learningPath)
      ? input.learningPath.map(String).filter(Boolean)
      : nodes.map((node) => node.title)
  };
}

function isLikelyStructureNode(block) {
  const text = String(block.text || "");
  if (text.length < 18) return false;
  if (/写在最后|总结|最后/.test(text)) return true;
  if (/是什么|区别|为什么|怎么|如何|什么时候|场景|边界|例子|案例|方法/.test(text)) return true;
  return ["definition", "mechanism", "contrast", "method", "boundary", "example"].includes(block.evidenceRole);
}

function titleForBlock(block) {
  const text = String(block.text || "").trim();
  const firstSentence = text.split(/[。！？!?]/)[0] || text;
  return firstSentence.slice(0, 32);
}

function normalizeStructureRole(role = "") {
  const value = String(role || "");
  if (["definition", "mechanism", "contrast", "method", "boundary", "example", "case", "conclusion", "background"].includes(value)) return value;
  if (value === "general") return "mechanism";
  return "background";
}

function whyItMattersForRole(role = "") {
  if (role === "definition") return "定义节点决定用户是否理解核心概念。";
  if (role === "contrast") return "对比节点帮助用户区分容易混淆的概念。";
  if (role === "method") return "方法节点帮助用户把观点迁移到行动。";
  if (role === "boundary") return "边界节点帮助用户避免误用。";
  if (role === "example") return "案例节点帮助用户把抽象观点落到具体场景。";
  return "该节点承载文章主线中的一个理解步骤。";
}

function inferTopic(cleanedText, nodes) {
  const firstLine = String(cleanedText || "").split(/\\n+/).map((line) => line.trim()).find(Boolean);
  return nodes[0]?.title || firstLine?.slice(0, 36) || "文章主题";
}

function fallbackNodes(blocks) {
  return blocks.slice(0, 6).map((block, index) => ({
    id: `asn-${index + 1}`,
    title: titleForBlock(block),
    role: normalizeStructureRole(block.evidenceRole),
    claim: block.text.slice(0, 180),
    whyItMatters: whyItMattersForRole(block.evidenceRole),
    evidenceBlockIds: [block.blockId].filter(Boolean),
    sourceOrder: index
  }));
}
```

- [ ] **Step 4: Export source block helpers from evaluator**

Modify `backend/src/generation/evaluateQuestions.js` so these existing helpers are exported:

```js
export function buildSourceBlocks(cleanedText = "") {
  // keep existing implementation body unchanged
}

export function inferSourceEvidenceRole(text = "", question = {}, point = {}) {
  // keep existing implementation body unchanged
}
```

If the functions are currently declared without `export`, only add the `export` keyword.

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/articleStructure.test.js
```

Expected: PASS.

---

### Task 2: Bind Knowledge Points To Article Structure

**Files:**
- Modify: `backend/src/generation/articleStructure.js`
- Modify: `backend/src/generation/index.js`
- Test: `backend/src/generation/tests/articleStructure.test.js`

- [ ] **Step 1: Add failing test for knowledge point binding**

Append:

```js
import { bindKnowledgePointsToStructure } from "../articleStructure.js";

test("bindKnowledgePointsToStructure maps point to best structure node", () => {
  const structureMap = normalizeArticleStructureMap({
    nodes: [
      {
        title: "Hook 与 prompt 的区别",
        role: "contrast",
        claim: "prompt 是请求模型记住，hook 是让系统执行。",
        evidenceBlockIds: ["p2-s0-0"]
      }
    ]
  });
  const points = [
    {
      id: "kp-1",
      title: "Hook 与 prompt 的本质区别",
      keyClaim: "prompt 靠模型自觉，hook 靠机制执行。",
      sourceQuote: "prompt 是请求模型记住，hook 是让系统执行。",
      importanceScore: 5,
      testabilityScore: 5
    }
  ];

  const bound = bindKnowledgePointsToStructure(points, structureMap);

  assert.equal(bound[0].structureNodeId, "asn-1");
  assert.equal(bound[0].roleInArticle, "contrast");
  assert.deepEqual(bound[0].sourceEvidenceIds, ["p2-s0-0"]);
  assert.equal(bound[0].claimFidelityScore >= 4, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/articleStructure.test.js
```

Expected: FAIL because `bindKnowledgePointsToStructure` is missing.

- [ ] **Step 3: Implement binding helper**

Append to `backend/src/generation/articleStructure.js`:

```js
export function bindKnowledgePointsToStructure(points = [], structureMap = {}) {
  const nodes = Array.isArray(structureMap.nodes) ? structureMap.nodes : [];
  return points.map((point) => {
    const best = nodes
      .map((node) => ({
        node,
        score: scorePointNodeMatch(point, node)
      }))
      .sort((a, b) => b.score - a.score || a.node.sourceOrder - b.node.sourceOrder)[0];

    if (!best || best.score < 2) {
      return {
        ...point,
        structureNodeId: "",
        roleInArticle: "",
        whyWorthReviewing: point.coverageReason || point.testabilityReason || "",
        sourceEvidenceIds: [],
        claimFidelityScore: 2,
        structureBindingReason: "no_confident_structure_match"
      };
    }

    return {
      ...point,
      structureNodeId: best.node.id,
      roleInArticle: best.node.role,
      whyWorthReviewing: point.coverageReason || best.node.whyItMatters,
      sourceEvidenceIds: best.node.evidenceBlockIds,
      claimFidelityScore: Math.min(5, Math.max(1, Math.round(best.score))),
      structureBindingReason: "keyword_and_evidence_match"
    };
  });
}

function scorePointNodeMatch(point = {}, node = {}) {
  const pointText = normalizeForMatch([
    point.title,
    point.keyClaim,
    point.summary,
    point.sourceQuote
  ].filter(Boolean).join(" "));
  const nodeText = normalizeForMatch([
    node.title,
    node.claim,
    ...(node.evidenceBlockIds || [])
  ].filter(Boolean).join(" "));
  if (!pointText || !nodeText) return 0;
  const keywords = extractMatchKeywords(pointText);
  const hits = keywords.filter((keyword) => nodeText.includes(keyword)).length;
  const sourceHit = point.sourceQuote && normalizeForMatch(node.claim).includes(normalizeForMatch(point.sourceQuote).slice(0, 18));
  return Math.min(5, hits + (sourceHit ? 2 : 0));
}

function normalizeForMatch(value = "") {
  return String(value).replace(/\\s+/g, "").replace(/[，。！？；：、,.!?;:()[\\]{}"'“”‘’|/\\\\-]/g, "");
}

function extractMatchKeywords(value = "") {
  const text = normalizeForMatch(value);
  const keywords = [];
  for (let index = 0; index <= text.length - 2; index += 1) keywords.push(text.slice(index, index + 2));
  for (let index = 0; index <= text.length - 4; index += 1) keywords.push(text.slice(index, index + 4));
  return [...new Set(keywords)].filter((keyword) => keyword.length >= 2).slice(0, 80);
}
```

- [ ] **Step 4: Wire structure map into generation pipeline**

Modify `backend/src/generation/index.js` imports:

```js
import {
  buildArticleStructureMap,
  bindKnowledgePointsToStructure
} from "./articleStructure.js";
```

After `const cleaned = cleanContent(rawText);`, add:

```js
const articleStructureMap = buildArticleStructureMap({ cleanedText: cleaned.cleanedText });
```

After knowledge points are ordered, bind them:

```js
knowledgePoints = bindKnowledgePointsToStructure(knowledgePoints, articleStructureMap);
filteredKnowledgePoints = bindKnowledgePointsToStructure(filteredKnowledgePoints, articleStructureMap);
```

In successful `generationDebug`, add:

```js
articleStructureMap,
```

In `finishMeta(...)` extra object, add:

```js
articleStructureNodeCount: articleStructureMap.nodes.length,
```

- [ ] **Step 5: Run backend tests**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

---

### Task 3: Add Structure Fields To Question Prompt Payload

**Files:**
- Modify: `backend/src/generation/generateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: Add failing test for prompt payload fields**

Append:

```js
import { buildUserPrompt } from "../generateQuestions.js";

test("question prompt includes structure binding fields", () => {
  const prompt = buildUserPrompt({
    points: [
      {
        id: "kp-1",
        title: "Hook 与 prompt 的区别",
        keyClaim: "prompt 是请求，hook 是机制。",
        sourceQuote: "prompt 是请求模型记住，hook 是让系统执行。",
        structureNodeId: "asn-2",
        roleInArticle: "contrast",
        sourceEvidenceIds: ["p2-s0-0"],
        expectedCognitiveActions: ["core_understanding", "misconception_boundary"],
        targetQuestionCount: 3,
        practiceBlueprint: [
          {
            id: "kp-1-core_understanding",
            memoryAngle: "core_understanding",
            preferredQuestionType: "multiple_choice",
            goal: "确认用户能说清 prompt 和 hook 的区别"
          }
        ]
      }
    ],
    rewrite: false,
    supplement: false
  });

  assert.match(prompt, /structureNodeId/);
  assert.match(prompt, /sourceEvidenceIds/);
  assert.match(prompt, /题目必须服务该结构节点/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/reviewableSelection.test.js
```

Expected: FAIL because the prompt does not include the new instruction.

- [ ] **Step 3: Include structure fields in prompt points**

In `backend/src/generation/generateQuestions.js`, add these fields to each point object inside `generateQuestions`:

```js
structureNodeId: point.structureNodeId || "",
roleInArticle: point.roleInArticle || point.structureRole || "",
whyWorthReviewing: point.whyWorthReviewing || point.coverageReason || "",
sourceEvidenceIds: Array.isArray(point.sourceEvidenceIds) ? point.sourceEvidenceIds : [],
claimFidelityScore: point.claimFidelityScore ?? null,
expectedCognitiveActions: Array.isArray(point.expectedCognitiveActions)
  ? point.expectedCognitiveActions
  : practiceBlueprint.map((item) => item.memoryAngle).filter(Boolean)
```

- [ ] **Step 4: Add structure instruction to prompt**

In `buildUserPrompt`, add this paragraph before the JSON payload:

```js
每个知识点都可能带有 structureNodeId、roleInArticle、sourceEvidenceIds 和 whyWorthReviewing。
题目必须服务该结构节点，不能把局部证据扩张成原文没有说的更强主张。
如果题目同时比较多个概念，正确理解和来源片段必须覆盖这些关键概念；证据不足时请缩窄题目，不要硬做复合题。
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/reviewableSelection.test.js
```

Expected: PASS.

---

### Task 4: Add Claim Fidelity And Source Coverage Scoring

**Files:**
- Modify: `backend/src/generation/evaluateQuestions.js`
- Test: `backend/src/generation/tests/reviewableSelection.test.js`

- [ ] **Step 1: Add failing tests for source coverage and claim fidelity**

Append:

```js
test("composite question is low confidence when source covers only one concept", async () => {
  const point = {
    id: "kp-1",
    title: "Prompt、Hook、CI 的分工",
    keyClaim: "prompt 管本次思考，hook 管事件触发动作，CI 管主干前裁判。",
    sourceQuote: "hooks 会在 Claude Code 生命周期中的特定点触发。",
    testabilityScore: 5,
    importanceScore: 5
  };
  const questions = [{
    id: "q-1",
    knowledgePointId: "kp-1",
    type: "multiple_choice",
    stem: "关于 Prompt、Hook 和 CI 的职责划分，哪项正确？",
    options: [
      { id: "A", text: "prompt 管本次思考，hook 管事件触发动作，CI 管主干前裁判。" },
      { id: "B", text: "hook 可以完全替代 CI。" },
      { id: "C", text: "prompt 是比 hook 更强的控制器。" },
      { id: "D", text: "CI 只负责提示词记忆。" }
    ],
    correctOptionId: "A",
    correctUnderstanding: "prompt、hook、CI 分别承担不同职责。",
    commonMisconception: "误以为 hook 能替代 CI。",
    sourceSnippet: "hooks 会在 Claude Code 生命周期中的特定点触发。",
    memoryAngle: "misconception_boundary"
  }];

  const evaluated = evaluateQuestions({
    questions,
    knowledgePoints: [point],
    cleanedText: "hooks 会在 Claude Code 生命周期中的特定点触发。"
  });

  assert.equal(evaluated[0].sourceCoverageScore < 4, true);
  assert.equal(evaluated[0].confidenceReasons.includes("source_coverage_incomplete"), true);
});

test("claim fidelity drops when question overstates source claim", () => {
  const point = {
    id: "kp-1",
    title: "Demo 阶段不需要严格控制",
    keyClaim: "Demo 阶段的目标不是工程化可交付版本，因此不需要严格控制。",
    sourceQuote: "用于产品演示的阶段，不需要严格的控制。",
    testabilityScore: 5,
    importanceScore: 4
  };
  const questions = [{
    id: "q-1",
    knowledgePointId: "kp-1",
    type: "multiple_choice",
    stem: "产品经理忽视 Hook 的主要原因是什么？",
    options: [
      { id: "A", text: "Demo 阶段需求不同，不关注工程化控制。" },
      { id: "B", text: "产品经理不理解技术。" },
      { id: "C", text: "Hook 只能用于后端。" },
      { id: "D", text: "AI 不支持 Hook。" }
    ],
    correctOptionId: "A",
    correctUnderstanding: "Demo 阶段不需要严格控制。",
    commonMisconception: "认为是产品经理能力不足。",
    sourceSnippet: "用于产品演示的阶段，不需要严格的控制。",
    memoryAngle: "core_understanding"
  }];

  const evaluated = evaluateQuestions({
    questions,
    knowledgePoints: [point],
    cleanedText: "用于产品演示的阶段，不需要严格的控制。"
  });

  assert.equal(evaluated[0].claimFidelityScore < 4, true);
  assert.equal(evaluated[0].confidenceReasons.includes("claim_overextended"), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/reviewableSelection.test.js
```

Expected: FAIL because v9 scores are not implemented.

- [ ] **Step 3: Implement scoring helpers**

In `backend/src/generation/evaluateQuestions.js`, add:

```js
function scoreSourceCoverage(question = {}) {
  const concepts = extractQuestionConcepts([
    question.stem,
    question.correctUnderstanding,
    correctOptionText(question)
  ].join(" "));
  if (!concepts.length) return 5;
  const source = normalize(question.sourceSnippet || "");
  const covered = concepts.filter((concept) => source.includes(normalize(concept)));
  const ratio = covered.length / concepts.length;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.65) return 4;
  if (ratio >= 0.45) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function scoreClaimFidelity(question = {}, point = {}) {
  const source = normalize([point.keyClaim, point.summary, question.sourceSnippet].filter(Boolean).join(" "));
  const questionText = normalize([question.stem, question.correctUnderstanding].filter(Boolean).join(" "));
  if (!source || !questionText) return 3;
  const overstatementCues = ["主要原因", "总是", "完全", "必须", "只要", "所有", "根本原因"];
  const cuePenalty = overstatementCues.some((cue) => questionText.includes(normalize(cue))) && !overstatementCues.some((cue) => source.includes(normalize(cue))) ? 1 : 0;
  const overlap = overlapRatio(source, questionText);
  const base = overlap >= 0.5 ? 5 : overlap >= 0.35 ? 4 : overlap >= 0.22 ? 3 : 2;
  return Math.max(1, base - cuePenalty);
}

function extractQuestionConcepts(text = "") {
  const latin = String(text).match(/[A-Za-z][A-Za-z0-9_.-]{1,}/g) || [];
  const knownChinese = ["提示词", "原文", "模型", "系统", "控制器", "生命周期", "自动化", "主干", "裁判", "工程化", "演示", "来源"];
  const chinese = knownChinese.filter((word) => String(text).includes(word));
  return [...new Set([...latin, ...chinese])].slice(0, 12);
}
```

- [ ] **Step 4: Add scores into trust diagnostics**

Inside `buildTrustDiagnostics`, compute:

```js
const sourceCoverageScore = scoreSourceCoverage(question);
const claimFidelityScore = scoreClaimFidelity(question, point);
if (sourceCoverageScore < 4) confidenceReasons.push("source_coverage_incomplete");
if (claimFidelityScore < 4) confidenceReasons.push("claim_overextended");
```

Add both values to returned `trustDiagnostics` and top-level evaluated question return object:

```js
sourceCoverageScore,
claimFidelityScore,
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/reviewableSelection.test.js
```

Expected: PASS.

---

### Task 5: Add Structure Coverage To Quality Report

**Files:**
- Modify: `backend/src/generation/tests/qualityReport.js`
- Test: `backend/src/generation/tests/qualityReport.test.js`

- [ ] **Step 1: Add failing test for report fields**

Add an assertion to the existing review row test:

```js
assert.equal(rows[0].structureNodeId, "asn-1");
assert.equal(rows[0].sourceCoverageScore, 4);
assert.equal(rows[0].claimFidelityScore, 5);
```

Ensure the test fixture question includes:

```js
structureNodeId: "asn-1",
sourceCoverageScore: 4,
claimFidelityScore: 5
```

- [ ] **Step 2: Run quality report test to verify it fails**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/qualityReport.test.js
```

Expected: FAIL because fields are missing from review rows.

- [ ] **Step 3: Add fields to review rows**

In `backend/src/generation/tests/qualityReport.js`, add these review row fields:

```js
structureNodeId: question.structureNodeId || "",
roleInArticle: question.roleInArticle || "",
sourceEvidenceIds: Array.isArray(question.sourceEvidenceIds) ? question.sourceEvidenceIds.join(";") : "",
sourceCoverageScore: question.sourceCoverageScore ?? question.trustDiagnostics?.sourceCoverageScore ?? "",
claimFidelityScore: question.claimFidelityScore ?? question.trustDiagnostics?.claimFidelityScore ?? "",
learningEffectivenessScore: question.learningEffectivenessScore ?? ""
```

- [ ] **Step 4: Add summary metrics**

Compute averages:

```js
const sourceCoverageScores = allQuestions
  .map((question) => Number(question.sourceCoverageScore || question.trustDiagnostics?.sourceCoverageScore))
  .filter(Number.isFinite);
const claimFidelityScores = allQuestions
  .map((question) => Number(question.claimFidelityScore || question.trustDiagnostics?.claimFidelityScore))
  .filter(Number.isFinite);
```

Add to summary:

```js
averageSourceCoverageScore: averageNumber(sourceCoverageScores),
averageClaimFidelityScore: averageNumber(claimFidelityScores)
```

Use the file's existing average helper if present; otherwise add:

```js
function averageNumber(values) {
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
}
```

- [ ] **Step 5: Run report tests**

Run:

```bash
npm --prefix backend run test -- backend/src/generation/tests/qualityReport.test.js
```

Expected: PASS.

---

### Task 6: Run v9 Single Article Experiment

**Files:**
- Modify: `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/README.md`

- [ ] **Step 1: Run backend validation**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

- [ ] **Step 2: Run single article experiment**

Run with the user's model key injected only as a temporary environment variable:

```bash
QUALITY_ARTICLE_URL="https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw" \
QUALITY_EXPERIMENT_SLUG="UMr6ia1QubqOMw3aBUGbOw" \
QUALITY_EXPERIMENT_LABEL="v9-article-structure-pedagogy-rubric" \
npm --prefix backend run quality:single
```

Expected:

- New JSON under `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/`
- New CSV under `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/`
- New analysis under `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/analysis/`

- [ ] **Step 3: Generate and append concise experiment report**

After `quality:single` finishes, run this command with the newest v9 JSON path. It prints a complete Markdown section with actual metric values:

```bash
node - <<'NODE'
const fs = require("fs");
const path = require("path");
const root = "quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw";
const runs = fs.readdirSync(path.join(root, "runs"))
  .filter((file) => file.includes("v9-article-structure-pedagogy-rubric") && file.endsWith(".json"))
  .sort();
const latest = runs.at(-1);
const data = JSON.parse(fs.readFileSync(path.join(root, "runs", latest), "utf8"));
const summary = data.summary || {};
const reviewFile = latest.replace(/\.json$/, ".csv");
const analysisFile = latest.replace(/\.json$/, ".md");
const v8 = {
  knowledgePointCount: 7,
  qualifiedQuestionCount: 21,
  lowConfidenceQuestionRate: 90.5
};
function value(name) {
  const raw = summary[name];
  return raw === undefined || raw === null || raw === "" ? "-" : raw;
}
const lines = [
  "## 2026-05-31 第九轮：文章结构骨架与教学评分 Rubric v9",
  "",
  "实验标签：`v9-article-structure-pedagogy-rubric`",
  "",
  "### 假设",
  "",
  "如果先建立文章结构骨架，再让知识点、题目和评分都绑定结构节点，系统应该更容易发现“题目主张过度扩张”和“复合题来源覆盖不完整”。",
  "",
  "### 本轮改动",
  "",
  "- 新增 `ArticleStructureMap`。",
  "- 知识点绑定 `structureNodeId` 和 `sourceEvidenceIds`。",
  "- 题目评分新增 `sourceCoverageScore` 和 `claimFidelityScore`。",
  "",
  "### 产物",
  "",
  `- JSON：\\`runs/${latest}\\``,
  `- CSV：\\`reviews/${reviewFile}\\``,
  `- 机器分析：\\`analysis/${analysisFile}\\``,
  "",
  "### 指标",
  "",
  "| 指标 | v8 | v9 | 变化 |",
  "| --- | ---: | ---: | --- |",
  `| 保留知识点 | ${v8.knowledgePointCount} | ${value("knowledgePointCount")} | ${Number(value("knowledgePointCount")) - v8.knowledgePointCount} |`,
  `| 入池题 | ${v8.qualifiedQuestionCount} | ${value("qualifiedQuestionCount")} | ${Number(value("qualifiedQuestionCount")) - v8.qualifiedQuestionCount} |`,
  `| 低置信率 | ${v8.lowConfidenceQuestionRate}% | ${value("lowConfidenceQuestionRate")}% | ${Math.round((Number(value("lowConfidenceQuestionRate")) - v8.lowConfidenceQuestionRate) * 10) / 10} pct |`,
  `| 来源覆盖均分 | - | ${value("averageSourceCoverageScore")} | 新增 |`,
  `| 主张忠实均分 | - | ${value("averageClaimFidelityScore")} | 新增 |`,
  "",
  "### 结论",
  "",
  "本轮重点不看题量是否继续上升，而看评分是否能识别两类 v8 暴露的问题：题目主张过度扩张，以及复合题来源覆盖不完整。若 `source_coverage_incomplete` 和 `claim_overextended` 能命中对应样例，说明 Rubric 方向成立；若误伤大量人工可接受题，下一轮应调阈值而不是撤掉维度。",
  "",
  "### 下一步",
  "",
  "根据 v9 的人工审查结果，决定是继续增强文章结构骨架，还是先校准 `sourceCoverageScore` / `claimFidelityScore` 的阈值。"
];
console.log(lines.join("\\n"));
NODE
```

Append the printed Markdown to `quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/README.md`.

- [ ] **Step 4: Run final check**

Run:

```bash
npm --prefix backend run check
```

Expected: PASS.

---

## Self-Review Checklist

- Spec requirement “ArticleStructureMap exists” is covered by Tasks 1-2.
- Spec requirement “knowledge points bind to structure” is covered by Task 2.
- Spec requirement “questions use structure payload” is covered by Task 3.
- Spec requirement “source coverage and claim fidelity scoring” is covered by Task 4.
- Spec requirement “quality reports expose new diagnostics” is covered by Task 5.
- Spec requirement “single article experiment records results” is covered by Task 6.
- No iOS user-facing UI changes are included.
- New fields are optional and backward compatible.
