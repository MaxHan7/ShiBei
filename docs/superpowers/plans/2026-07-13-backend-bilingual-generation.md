# Backend Bilingual Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready backend language preference path so English-native users can request English generated learning content regardless of source language, while Chinese users can keep Chinese generated content.

**Architecture:** Keep interface language and generated-content language separate. The app sends a canonical `generationLanguage` with V2 generation requests; the backend persists it through the pending chapter, queue payload, retries, generation pipeline, prompt payloads, generated chapter metadata, and quality tests. Backend returns stable codes for UI/system states where possible; the frontend localizes UI chrome locally.

**Tech Stack:** Swift iOS client, Node.js backend, PostgreSQL-backed job queue, V2 JSON-prompt generation pipeline, APNs push notification language support.

---

## Current-State Audit

### What Already Exists

- Frontend has an `AppLanguage` enum and stores UI language in `AppStorage(AppLanguage.storageKey)`.
- Push token registration already sends `preferredLanguage` from the app to backend.
- Backend push token storage has `preferred_language` with `zh-Hans` default.
- APNs already chooses Chinese or English notification copy from `token.preferredLanguage`.
- V2 backend generation is already asynchronous: `/api/v2/chapters` creates a pending chapter, stores a queue payload, then the worker resolves source content and runs the V2 generation pipeline.

### Gaps Found

- `APIClient.createV2Chapter(sourceText:clientRequestId:)` does not send a generated-content language.
- `V2CreateChapterRequest` has no `generationLanguage` or `outputLanguage` field.
- `/api/v2/chapters` passes request body into `enqueueV2ChapterGeneration`, but there is no normalization/validation for a generation language.
- `buildV2ChapterQueueIdempotencyKey` does not include language. The same source and client request could accidentally reuse a queued/generated Chinese job for an English generation if language is added later but not included in the idempotency key.
- `buildPendingV2Chapter`, `buildV2JobPayload`, and `buildV2QueuedGenerationInput` preserve arbitrary body fields, but there is no explicit contract or test proving language survives the queue.
- `runV2GenerationJob` and `runV2GenerationProgram` do not normalize or pass a target output language into prompt stages.
- `buildV2PromptMessages` is written in Chinese and constrains lengths in Chinese characters. That is acceptable as internal instruction language, but it currently never tells the model which language the user-facing output must use.
- Several backend fallback strings are Chinese-only: `已生成`, `生成失败`, `生成失败，请稍后重试。`, `视频内容提取失败`, `原文提取失败`, etc.
- Source/preflight platform display should remain canonical: backend should return `sourceType` and `platform`, while frontend translates labels such as "Bilibili video" or "B站视频".

### Product Boundary

- `interfaceLanguage`: language for app chrome, status labels, validation copy, settings, navigation, APNs copy.
- `generationLanguage`: language for generated chapter content: title, overview, unit titles, unit summaries, question stems, options, matching items, explanations, source-facing learning copy.
- Source language is not a user preference. It is inferred from the material and may be Chinese, English, mixed, or unknown.

For an English-native user, `interfaceLanguage=en` and `generationLanguage=en` is the first target. Later we can allow combinations like Chinese UI with English generated content, but this plan keeps the contract ready for that without adding extra UI complexity.

## File Map

- Modify `拾贝/拾贝/Localization.swift`
  - Add a generated-content language enum or reuse `AppLanguage` through an explicit generation-language mapping.
- Modify `拾贝/拾贝/Services/APIClient.swift`
  - Add `generationLanguage` to `createV2Chapter`.
  - Add `generationLanguage` to `V2CreateChapterRequest`.
- Modify `拾贝/拾贝/V2/V2RootView.swift`
  - Pass current generation language into `apiClient.createV2Chapter`.
- Create `backend/src/v2/generation/generationLanguage.js`
  - Create canonical backend language normalization helpers.
- Modify `backend/src/server.js`
  - Normalize request language before enqueueing V2 generation.
- Modify `backend/src/v2/generation/v2ChapterQueue.js`
  - Persist normalized language in pending chapter metadata and queue payload.
  - Include language in idempotency key.
- Modify `backend/src/v2/generation/v2GenerationJobRunner.js`
  - Preserve language through source extraction and failure handling.
- Modify `backend/src/v2/generation/runV2GenerationJob.js`
  - Normalize language once and pass it into `generateReviewPathV2`.
  - Return localized status fallbacks or stable failure codes.
- Modify `backend/src/v2/generation/generateReviewPathV2.js`
  - Pass `generationLanguage` into `runV2GenerationProgram`.
- Modify `backend/src/v2/generation/pipeline/v2GenerationProgram.js`
  - Add `generationLanguage` to all prompt payloads.
  - Store it in `generationMeta`.
  - Make hardcoded unit summary title language-aware.
- Modify `backend/src/v2/generation/prompts/buildV2PromptMessages.js`
  - Add a compact language contract section to every generation prompt.
  - Keep internal instruction language stable; only require user-visible JSON values to be in target language.
- Modify backend tests:
  - `backend/src/v2/generation/v2ChapterQueue.test.js`
  - `backend/src/v2/generation/v2GenerationJobRunner.test.js`
  - `backend/src/v2/generation/runV2GenerationJob.test.js`
  - `backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`
  - Add `backend/src/v2/generation/generationLanguage.test.js`
- Frontend compile verification:
  - Use XcodeBuildMCP `build_sim` or the existing Xcode project build to verify Swift request-contract changes compile.

## Backend Contract

### Request

`POST /api/v2/chapters`

```json
{
  "clientRequestId": "uuid-string",
  "sourceType": "video_link",
  "sourceUrl": "https://www.bilibili.com/video/...",
  "sourceTitle": null,
  "rawText": null,
  "generationLanguage": "en"
}
```

Accepted values:

- `zh-Hans`
- `en`

Normalization:

- Missing, empty, unsupported, or legacy values default to `zh-Hans`.
- `zh`, `zh-CN`, `zh_CN`, `Chinese`, `cn` normalize to `zh-Hans`.
- `en-US`, `en-GB`, `English` normalize to `en`.

### Stored Chapter Metadata

Pending and completed chapters should include:

```json
{
  "generationMeta": {
    "generationLanguage": "en"
  }
}
```

This is for diagnostics and reproducibility. The frontend should not need this field for normal display.

### Queue Payload

The queue payload body should include:

```json
{
  "body": {
    "generationLanguage": "en"
  }
}
```

This ensures retries and worker restarts do not lose the language target.

### Prompt Payload

Each prompt payload should include:

```json
{
  "generationLanguage": "en"
}
```

Prompt builders then render a short language instruction.

## Prompt Language Contract

Add one small shared prompt section:

```text
输出语言：
- 所有用户可见 JSON 字段必须使用 English。
- 用户可见字段包括 chapter title, overview, unit title, unit overview, question stem, options, matching item text, explanation, and unit summary.
- source quote / source block text must preserve original wording and must not be translated.
- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged.
```

For Chinese:

```text
输出语言：
- 所有用户可见 JSON 字段必须使用简体中文。
- source quote / source block text 保持原文，不要翻译。
- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged.
```

Important: do not rewrite every prompt. Add this as a small shared section in each prompt builder. This keeps the change controllable and avoids disrupting the high-value lean generation behavior.

## Language-Aware Visible Text Budgets

Keep the current Chinese budgets unchanged. For English, add stricter soft generation budgets because English UI text expands horizontally and is more likely to overflow compact iPhone layouts.

These budgets are prompt instructions, not schema hard failures:

- Multiple-choice stem:
  - Chinese: keep existing `<= 60` Chinese-character target.
  - English: target `<= 95` characters or `<= 16` words.
- Multiple-choice option:
  - Chinese: keep existing `<= 28` Chinese-character target.
  - English: target `<= 48` characters or `<= 8` words.
- Multiple-choice explanation:
  - Chinese: keep existing `<= 60` Chinese-character target.
  - English: target `<= 95` characters or `<= 16` words.
- Matching stem:
  - Chinese: keep existing `<= 44` Chinese-character target.
  - English: target `<= 75` characters or `<= 12` words.
- Matching left/right item:
  - Chinese: keep existing `<= 16` Chinese-character target.
  - English: target `<= 34` characters or `<= 6` words.
- Unit title and summary title:
  - Chinese: keep existing behavior.
  - English: prefer short noun phrases; avoid clause-heavy titles.
- Unit overview and unit summary body:
  - Chinese: keep existing behavior.
  - English: target `<= 120` characters or `<= 22` words.

Reasoning: this keeps the backend change minimal and does not add a second repair/rewrite call, while giving the model a clearer display contract for English. If later screenshot tests still show overflow, the frontend should solve remaining layout issues with wrapping and adaptive spacing instead of forcing the generation pipeline into brittle hard truncation.

## Tasks

### Task 1: Backend Language Normalization

**Files:**
- Create: `backend/src/v2/generation/generationLanguage.js`
- Create: `backend/src/v2/generation/generationLanguage.test.js`

- [ ] **Step 1: Write failing tests**

Create `backend/src/v2/generation/generationLanguage.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGenerationLanguage,
  generationLanguageLabel,
  generationLanguageInstruction
} from "./generationLanguage.js";

test("normalizes supported generation languages", () => {
  assert.equal(normalizeGenerationLanguage("en"), "en");
  assert.equal(normalizeGenerationLanguage("en-US"), "en");
  assert.equal(normalizeGenerationLanguage("English"), "en");
  assert.equal(normalizeGenerationLanguage("zh-Hans"), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("zh-CN"), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("Chinese"), "zh-Hans");
});

test("defaults unsupported generation languages to zh-Hans", () => {
  assert.equal(normalizeGenerationLanguage(""), "zh-Hans");
  assert.equal(normalizeGenerationLanguage(null), "zh-Hans");
  assert.equal(normalizeGenerationLanguage("fr"), "zh-Hans");
});

test("renders compact language labels", () => {
  assert.equal(generationLanguageLabel("en"), "English");
  assert.equal(generationLanguageLabel("zh-Hans"), "简体中文");
});

test("renders prompt instruction without translating source text", () => {
  const english = generationLanguageInstruction("en");
  assert.match(english, /所有用户可见 JSON 字段必须使用 English/);
  assert.match(english, /source quote \\/ source block text must preserve original wording/);

  const chinese = generationLanguageInstruction("zh-Hans");
  assert.match(chinese, /所有用户可见 JSON 字段必须使用简体中文/);
  assert.match(chinese, /source quote \\/ source block text 保持原文/);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd backend && node --test src/v2/generation/generationLanguage.test.js
```

Expected: FAIL because `generationLanguage.js` does not exist.

- [ ] **Step 3: Implement normalization helper**

Create `backend/src/v2/generation/generationLanguage.js`:

```js
const SUPPORTED_GENERATION_LANGUAGES = new Set(["zh-Hans", "en"]);

export function normalizeGenerationLanguage(value) {
  const normalized = String(value || "").trim();
  const lower = normalized.toLowerCase().replace(/_/g, "-");
  if (lower === "en" || lower.startsWith("en-") || lower === "english") return "en";
  if (
    lower === "zh" ||
    lower === "zh-hans" ||
    lower === "zh-cn" ||
    lower === "cn" ||
    lower === "chinese" ||
    lower === "simplified-chinese"
  ) {
    return "zh-Hans";
  }
  return "zh-Hans";
}

export function isSupportedGenerationLanguage(value) {
  return SUPPORTED_GENERATION_LANGUAGES.has(value);
}

export function generationLanguageLabel(value) {
  return normalizeGenerationLanguage(value) === "en" ? "English" : "简体中文";
}

export function generationLanguageInstruction(value) {
  const language = normalizeGenerationLanguage(value);
  if (language === "en") {
    return [
      "输出语言：",
      "- 所有用户可见 JSON 字段必须使用 English。",
      "- 用户可见字段包括 chapter title, overview, unit title, unit overview, question stem, options, matching item text, explanation, and unit summary.",
      "- source quote / source block text must preserve original wording and must not be translated.",
      "- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged."
    ].join("\\n");
  }

  return [
    "输出语言：",
    "- 所有用户可见 JSON 字段必须使用简体中文。",
    "- 用户可见字段包括章节标题、章节概要、单元标题、单元开场、题干、选项、连线项、解释和单元总结。",
    "- source quote / source block text 保持原文，不要翻译。",
    "- Stable ids, enum values, sourceAnchorId, type, relationType, and internal schema fields remain unchanged."
  ].join("\\n");
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
cd backend && node --test src/v2/generation/generationLanguage.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/v2/generation/generationLanguage.js backend/src/v2/generation/generationLanguage.test.js
git commit -m "feat: add V2 generation language normalization"
```

### Task 2: Persist Generation Language Through V2 Queue

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/src/v2/generation/generationIdempotency.js`
- Modify: `backend/src/v2/generation/v2ChapterQueue.js`
- Modify: `backend/src/v2/generation/v2ChapterQueue.test.js`

- [ ] **Step 1: Add failing queue tests**

In `backend/src/v2/generation/v2ChapterQueue.test.js`, add tests asserting:

```js
test("stores normalized generation language on pending V2 chapter and job payload", async () => {
  const deps = createQueueDeps();
  const result = await enqueueV2ChapterGeneration({
    deviceId: "device-1",
    body: {
      clientRequestId: "request-1",
      sourceType: "text",
      rawText: "A short source about AI workflows.",
      generationLanguage: "en-US"
    },
    deps,
    now: "2026-07-13T00:00:00.000Z"
  });

  assert.equal(result.chapter.generationMeta.generationLanguage, "en");
  assert.equal(result.job.payload.body.generationLanguage, "en");
});

test("uses generation language in V2 idempotency key", async () => {
  const chinese = buildV2ChapterQueueIdempotencyKey({
    deviceId: "device-1",
    body: {
      clientRequestId: "request-1",
      rawText: "same source",
      generationLanguage: "zh-Hans"
    }
  });
  const english = buildV2ChapterQueueIdempotencyKey({
    deviceId: "device-1",
    body: {
      clientRequestId: "request-1",
      rawText: "same source",
      generationLanguage: "en"
    }
  });

  assert.notEqual(chinese, english);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
cd backend && node --test src/v2/generation/v2ChapterQueue.test.js
```

Expected: FAIL because language is not normalized/stored and idempotency key does not include it.

- [ ] **Step 3: Implement queue persistence**

In `backend/src/v2/generation/v2ChapterQueue.js`:

```js
import { normalizeGenerationLanguage } from "./generationLanguage.js";
```

Normalize once at enqueue boundary:

```js
function normalizeV2GenerationBody(body = {}) {
  return {
    ...body,
    generationLanguage: normalizeGenerationLanguage(
      body.generationLanguage || body.outputLanguage || body.language
    )
  };
}
```

Use it at the start of `enqueueV2ChapterGeneration`:

```js
const normalizedBody = normalizeV2GenerationBody(body);
const idempotencyKey = buildV2ChapterQueueIdempotencyKey({ deviceId, body: normalizedBody });
```

Then use `normalizedBody` for pending chapter, payload, chapter id, and job payload.

Add language to `buildPendingV2Chapter` metadata:

```js
generationMeta: {
  ...(submitted.generationMeta || {}),
  schemaVersion: "v2_review_path_queued_1",
  generationLanguage: normalizeGenerationLanguage(body.generationLanguage),
  currentStage: progress.stage,
  v2Progress: progress,
  generationProgress: progress
}
```

Modify `backend/src/v2/generation/generationIdempotency.js` so language is part of both explicit and derived idempotency keys:

```js
export function buildV2GenerationIdempotencyKey({
  deviceId = "",
  jobType = "create_chapter",
  sourceUrl = "",
  contentHash = "",
  rawText = "",
  clientRequestId = "",
  generationLanguage = "zh-Hans"
} = {}) {
  const languageKey = `lang:${normalizeGenerationIdempotencyKey(generationLanguage) || "zh-hans"}`;
  const explicit = normalizeGenerationIdempotencyKey(clientRequestId);
  if (explicit) return normalizeGenerationIdempotencyKey(`${explicit}:${languageKey}`);

  const sourceKey = sourceUrl
    ? `url:${normalizeUrlForIdempotency(sourceUrl)}`
    : `text:${contentHash || hashV2GenerationContent(rawText)}`;

  return normalizeGenerationIdempotencyKey([
    "v2-generation",
    deviceId,
    jobType,
    languageKey,
    sourceKey
  ].join(":"));
}
```

Then pass it from `buildV2ChapterQueueIdempotencyKey`:

```js
return buildV2GenerationIdempotencyKey({
  deviceId,
  jobType: "v2_create_chapter",
  sourceUrl: body.sourceUrl || "",
  rawText: body.rawText || body.cleanedText || body.text || "",
  contentHash: body.contentHash || "",
  clientRequestId: body.clientRequestId || body.client_request_id || "",
  generationLanguage: normalizeGenerationLanguage(body.generationLanguage)
});
```

- [ ] **Step 4: Run queue tests**

Run:

```bash
cd backend && node --test src/v2/generation/v2ChapterQueue.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/v2/generation/generationIdempotency.js backend/src/v2/generation/v2ChapterQueue.js backend/src/v2/generation/v2ChapterQueue.test.js
git commit -m "feat: persist V2 generation language in queue"
```

### Task 3: Pass Generation Language Into V2 Generation Runtime

**Files:**
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Modify: `backend/src/v2/generation/runV2GenerationJob.js`
- Modify: `backend/src/v2/generation/generateReviewPathV2.js`
- Modify: `backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.test.js`
- Modify: `backend/src/v2/generation/runV2GenerationJob.test.js`

- [ ] **Step 1: Add failing worker/runtime tests**

Add a test in `backend/src/v2/generation/v2GenerationJobRunner.test.js`:

```js
test("passes generation language from queued payload into V2 generation job", async () => {
  let receivedInput = null;
  const result = await runV2GenerationQueuedJob(
    {
      id: "job-1",
      chapterId: "chapter-1",
      deviceId: "device-1",
      jobType: "v2_create_chapter",
      payload: {
        body: {
          sourceType: "text",
          rawText: "A source about workflows.",
          generationLanguage: "en"
        }
      }
    },
    {
      getChapter: async () => ({
        id: "chapter-1",
        status: "submitted",
        generationMeta: {}
      }),
      runV2GenerationJob: async (input) => {
        receivedInput = input;
        return {
          status: "completed",
          displayStatusText: "Generated",
          chapter: {
            id: "chapter-1",
            title: "Workflow basics",
            source: {},
            generationMeta: {}
          }
        };
      },
      upsertChapter: async (_deviceId, chapter) => chapter,
      completeGenerationJob: async () => {},
      failGenerationJob: async () => {},
      updateGenerationJob: async () => {},
      createNotification: async () => {}
    }
  );

  assert.equal(result.status, "completed");
  assert.equal(receivedInput.generationLanguage, "en");
});
```

Add a test in `backend/src/v2/generation/runV2GenerationJob.test.js`:

```js
test("normalizes generation language before calling generateReviewPath", async () => {
  let receivedOptions = null;
  const result = await runV2GenerationJob(
    {
      id: "chapter-1",
      jobId: "job-1",
      sourceType: "text",
      rawText: "A source about workflows.",
      generationLanguage: "en-US"
    },
    {
      generateReviewPath: async (_input, options) => {
        receivedOptions = options;
        return {
          id: "chapter-1",
          title: "Workflow basics",
          units: [],
          source: {},
          generationMeta: {}
        };
      },
      onProgress: async () => {}
    }
  );

  assert.equal(result.status, "completed");
  assert.equal(receivedOptions.generationLanguage, "en");
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
cd backend && node --test src/v2/generation/v2GenerationJobRunner.test.js src/v2/generation/runV2GenerationJob.test.js
```

Expected: FAIL because options do not include `generationLanguage`.

- [ ] **Step 3: Implement runtime propagation**

In `runV2GenerationJob.js`:

```js
import { normalizeGenerationLanguage } from "./generationLanguage.js";
```

Before calling `generateReviewPath`:

```js
const generationLanguage = normalizeGenerationLanguage(input?.generationLanguage);
const chapter = await generateReviewPath(
  { ...input, generationLanguage },
  {
    modelUsageRecorder,
    ...(createPromptCaller ? { createPromptCaller } : {}),
    generationMetaMode,
    generationLanguage,
    onProgress,
    now
  }
);
```

In `generateReviewPathV2.js`, accept `generationLanguage` in options and pass it to `runV2GenerationProgram`.

In `v2GenerationProgram.js`, add option:

```js
generationLanguage = "zh-Hans"
```

Then pass `generationLanguage` to every `callAndValidate` prompt payload.

Add to final `generationMeta`:

```js
generationLanguage
```

In `v2GenerationJobRunner.js`, ensure `resolveV2QueuedGenerationInput` preserves `generationLanguage` when creating `resolvedInput`.

- [ ] **Step 4: Run runtime tests**

Run:

```bash
cd backend && node --test src/v2/generation/v2GenerationJobRunner.test.js src/v2/generation/runV2GenerationJob.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/v2/generation/v2GenerationJobRunner.js backend/src/v2/generation/runV2GenerationJob.js backend/src/v2/generation/generateReviewPathV2.js backend/src/v2/generation/pipeline/v2GenerationProgram.js backend/src/v2/generation/v2GenerationJobRunner.test.js backend/src/v2/generation/runV2GenerationJob.test.js
git commit -m "feat: pass V2 generation language through runtime"
```

### Task 4: Add Prompt-Level Language Contract

**Files:**
- Modify: `backend/src/v2/generation/prompts/buildV2PromptMessages.js`
- Modify: `backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`

- [ ] **Step 1: Add failing prompt tests**

In `backend/src/v2/generation/prompts/buildV2PromptMessages.test.js`, add:

```js
test("reviewPathPlan prompt includes English generation language contract", () => {
  const messages = buildV2PromptMessages("reviewPathPlan", {
    generationLanguage: "en",
    article: { id: "a1", title: "Chinese source" },
    source: { title: "Chinese source" },
    blocks: [{ id: "b1", text: "原文内容", type: "paragraph" }]
  });

  assert.match(messages.user, /所有用户可见 JSON 字段必须使用 English/);
  assert.match(messages.user, /source quote \\/ source block text must preserve original wording/);
});

test("multipleChoiceDraftUnitBatch prompt includes Chinese generation language contract by default", () => {
  const messages = buildV2PromptMessages("multipleChoiceDraftUnitBatch", {
    article: { id: "a1", title: "Source" },
    source: {},
    unit: { id: "unit-1" },
    questionBriefs: [],
    sourceContext: { blocks: [] }
  });

  assert.match(messages.user, /所有用户可见 JSON 字段必须使用简体中文/);
});
```

- [ ] **Step 2: Run prompt tests and verify failure**

Run:

```bash
cd backend && node --test src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: FAIL because prompts do not include generation-language contract.

- [ ] **Step 3: Implement shared prompt section**

In `buildV2PromptMessages.js`:

```js
import { generationLanguageInstruction, normalizeGenerationLanguage } from "../generationLanguage.js";
```

Add helper:

```js
function renderGenerationLanguage(payload = {}) {
  return generationLanguageInstruction(normalizeGenerationLanguage(payload.generationLanguage));
}
```

In each prompt builder, add near the top of `user` array, immediately after `任务` or `核心原则`:

```js
renderGenerationLanguage({ generationLanguage }),
```

Update function signatures from:

```js
function buildReviewPathPlanMessages({ article, source, blocks }) {
```

to:

```js
function buildReviewPathPlanMessages({ article, source, blocks, generationLanguage }) {
```

Repeat this for active V2 generation stages:

- `reviewPathPlan`
- `unitKnowledgeMap`
- `taskBriefPlan`
- `multipleChoiceDraftUnitBatch`
- `multipleChoiceOptionSetUnitBatch`
- `matchingDraft`
- `unitCopyBatch`
- `unitSummaryDraft`
- `qualityJudge`

`sourceMap` may include the instruction only for generated metadata fields. If source block text is copied from source, it must preserve original language.

- [ ] **Step 4: Fix hardcoded generated Chinese titles**

In `v2GenerationProgram.js`, replace:

```js
summary: {
  title: "单元完成",
  text: unitSummary.summary.text
}
```

with:

```js
summary: {
  title: generationLanguage === "en" ? "Unit complete" : "单元完成",
  text: unitSummary.summary.text
}
```

- [ ] **Step 5: Run prompt tests**

Run:

```bash
cd backend && node --test src/v2/generation/prompts/buildV2PromptMessages.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/v2/generation/prompts/buildV2PromptMessages.js backend/src/v2/generation/prompts/buildV2PromptMessages.test.js backend/src/v2/generation/pipeline/v2GenerationProgram.js
git commit -m "feat: add V2 prompt generation language contract"
```

### Task 5: Frontend Request Contract

**Files:**
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`
- Optional Test: `拾贝/拾贝Tests/APIClientDecodingTests.swift`

- [ ] **Step 1: Add request field**

Modify `V2CreateChapterRequest` in `APIClient.swift` to include:

```swift
var generationLanguage: String
```

Modify `createV2Chapter` signature:

```swift
func createV2Chapter(
    sourceText: String,
    clientRequestId: String,
    generationLanguage: AppLanguage
) async throws -> V2CreateChapterResponse
```

Set request field:

```swift
generationLanguage: generationLanguage.rawValue
```

- [ ] **Step 2: Pass current preference from V2 root**

In `V2RootView.swift`, find the call to `apiClient.createV2Chapter` and pass:

```swift
generationLanguage: appLanguage
```

This is a temporary product mapping: interface language equals generation language. Later settings can split them into separate controls.

- [ ] **Step 3: Compile iOS app**

Run:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -sdk iphonesimulator -configuration Debug build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add 拾贝/拾贝/Services/APIClient.swift 拾贝/拾贝/V2/V2RootView.swift
git commit -m "feat: send V2 generation language from iOS"
```

### Task 6: User-Facing Backend Status and Failure Strategy

**Files:**
- Modify: `backend/src/v2/generation/runV2GenerationJob.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Modify: `backend/src/v2/generation/generationProgress.js`
- Modify tests around generation failure/progress.

- [ ] **Step 1: Decide contract for status display**

Use this rule:

- Backend `generationProgress.stage`, `status`, `failureCode`, `mediaErrorType`, and `sourceFailureCode` are canonical.
- Backend `displayText` and `failureReason` may remain for backward compatibility, but frontend should prefer localized mappings when possible.

- [ ] **Step 2: Add tests for English fallback status**

Add tests asserting:

```js
const result = await runV2GenerationJob(
  {
    id: "chapter-1",
    jobId: "job-1",
    sourceType: "text",
    rawText: "",
    generationLanguage: "en"
  },
  { onProgress: async () => {} }
);

assert.equal(result.status, "failed_generation");
assert.equal(result.generationProgress.failureCode, "input_too_short");
```

Before writing this test, inspect `backend/src/v2/generation/generationFailures.js` and `backend/src/v2/generation/generationLimits.js` for the existing short-input failure code. Use that exact code in the assertion. The test must check code stability rather than only English prose.

- [ ] **Step 3: Keep prose compatibility small**

Only localize generic completed/failed display strings at backend boundary:

```js
function generatedStatusText(language) {
  return language === "en" ? "Generated" : "已生成";
}

function generationFailedStatusText(language) {
  return language === "en" ? "Generation failed" : "生成失败";
}
```

Do not translate every detailed failure sentence in backend in this task. That should be a separate frontend-localized error-code project.

- [ ] **Step 4: Run tests**

Run:

```bash
cd backend && node --test src/v2/generation/runV2GenerationJob.test.js src/v2/generation/v2GenerationJobRunner.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/v2/generation/runV2GenerationJob.js backend/src/v2/generation/v2GenerationJobRunner.js backend/src/v2/generation/generationProgress.js backend/src/v2/generation/runV2GenerationJob.test.js backend/src/v2/generation/v2GenerationJobRunner.test.js
git commit -m "feat: stabilize V2 language-aware status contract"
```

### Task 7: End-to-End Quality Test With English Output

**Files:**
- Modify: `backend/src/v2/generation/tests/runV2QualityExperiment.js`
- Modify: `backend/src/v2/generation/tests/v2QualityExperiment.js`
- Test output under: `docs/quality-runs/language/`

- [ ] **Step 1: Add CLI/env input**

Support:

```bash
GENERATION_LANGUAGE=en node backend/src/v2/generation/tests/runV2QualityExperiment.js
```

The script should pass:

```js
generationLanguage: process.env.GENERATION_LANGUAGE || "zh-Hans"
```

into the generation input.

- [ ] **Step 2: Run Chinese baseline**

Run:

```bash
GENERATION_LANGUAGE=zh-Hans node backend/src/v2/generation/tests/runV2QualityExperiment.js
```

Expected: generated content remains Chinese.

- [ ] **Step 3: Run English test**

Run:

```bash
GENERATION_LANGUAGE=en node backend/src/v2/generation/tests/runV2QualityExperiment.js
```

Expected:

- chapter title is English
- unit titles are English
- question stems are English
- options are English
- matching item text is English
- explanations are English
- source blocks remain original source wording

- [ ] **Step 4: Create review note**

Create:

```text
docs/quality-runs/language/YYYYMMDD-v2-english-generation-review.md
```

Include:

- source link/input
- generation language
- whether source language differed from output language
- qualitative review of title/unit/question/explanation language
- screenshots or HTML report path if available
- remaining issues

- [ ] **Step 5: Commit**

```bash
git add backend/src/v2/generation/tests/runV2QualityExperiment.js backend/src/v2/generation/tests/v2QualityExperiment.js docs/quality-runs/language/
git commit -m "test: add V2 English generation quality run"
```

### Task 8: Frontend Cleanup That Should Not Wait For Backend

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/Localizable.xcstrings`
- Modify: `拾贝/拾贝/V2/Components/Cards/V2DiscoverCards.swift`
- Modify: `拾贝/拾贝/V2/Components/V2FlowComponents.swift`

- [ ] **Step 1: Fix source label language**

Change:

```swift
source: chapter.sourceLabel,
```

to:

```swift
source: chapter.sourceLabel(language: appLanguage),
```

- [ ] **Step 2: Add missing `navigation.home` key**

Add to `Localizable.xcstrings`:

```json
"navigation.home": {
  "localizations": {
    "en": {
      "stringUnit": {
        "state": "translated",
        "value": "Home"
      }
    },
    "zh-Hans": {
      "stringUnit": {
        "state": "translated",
        "value": "回首页"
      }
    }
  }
}
```

- [ ] **Step 3: Localize Discover filter accessibility**

Change:

```swift
.accessibilityLabel("筛选：\(filter.title)")
```

to:

```swift
.accessibilityLabel(L10n.format("discover.filter.accessibility", language: appLanguage, filter.title))
```

Add `@Environment(\.appLanguage)` to `V2DiscoverFilterBar`.

- [ ] **Step 4: Replace dynamic `LocalizedStringKey(title)` with `Text(title)` where title is already localized**

Change `V2PrimaryActionButton`, `V2FlowTopBar`, and `V2TabScaffold` dynamic title rendering to:

```swift
Text(title)
```

Keep `L10n.string(...)` at the call site.

- [ ] **Step 5: Build iOS app**

Run:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -sdk iphonesimulator -configuration Debug build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add 拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift 拾贝/拾贝/Localizable.xcstrings 拾贝/拾贝/V2/Components/Cards/V2DiscoverCards.swift 拾贝/拾贝/V2/Components/V2FlowComponents.swift
git commit -m "fix: harden frontend localization boundary"
```

## Validation Matrix

Run after all tasks:

```bash
cd backend && npm run check
```

Expected:

- Node syntax checks pass.
- Backend unit tests pass.
- V2 prompt tests pass.
- Video source tests continue to pass.

Run iOS build:

```bash
xcodebuild -project 拾贝/拾贝.xcodeproj -scheme Recallo -sdk iphonesimulator -configuration Debug build
```

Expected: build succeeds.

Manual quality checks:

- Chinese UI + Chinese generation.
- English UI + English generation.
- English generation from Chinese source.
- English generation from English source.
- Video source still produces canonical platform metadata.
- Push notification uses interface language.
- Generated review content uses generation language.

## Risks and Controls

- **Risk:** English generation may translate source quotes, breaking source support.
  - Control: prompt says source blocks/quotes preserve original wording; quality review checks generated user-facing copy separately from source evidence.
- **Risk:** Language in idempotency key could create duplicate jobs.
  - Control: duplicates are correct when generation language differs; same language still reuses same idempotency path.
- **Risk:** Adding language prompt section changes Chinese output quality.
  - Control: Chinese baseline quality run before and after.
- **Risk:** Frontend uses interface language as generation language before separate settings exist.
  - Control: document as temporary product mapping; backend contract supports future split.
- **Risk:** Backend failure prose remains Chinese in some edge cases.
  - Control: treat stable failure code localization as a separate follow-up; do not block English generated content MVP.

## Self-Review

- Spec coverage: covers English-native users by sending `generationLanguage=en`, preserving it through queue/runtime/prompts, and testing English output.
- Frontend/backend boundary: frontend localizes app chrome and sends preferences; backend generates learning content in requested language.
- No source-label overreach: platform/source display remains canonical backend data plus frontend localization.
- No prompt rewrite: adds one shared language contract instead of restructuring generation logic.
- Deployment safety: frequent commits by task, backend tests, iOS build, and real quality run before production deployment.
