# Video Learning Source Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend path that turns Douyin/Xiaohongshu public video links into `LearningSource.normalizedText`, then feeds the existing V2 generation queue without rewriting the question-generation engine.

**Architecture:** Add a bounded media-learning layer under `backend/src/media/`: provider adapters fetch video metadata and processable media URLs, media processors extract audio and ASR transcript, a LearningSource normalizer merges platform text and transcript into source blocks. `extractSourceContent(video_link)` and the V2 queued job runner consume this layer and persist a source compatible with the current V2 serializer. The V2 question-generation engine stays model-agnostic behind a JSON model caller boundary.

**Tech Stack:** Node.js 20 ESM, native `fetch`, `node:test`, existing V2 generation queue, TikHub REST API, `ffmpeg` CLI via `node:child_process`, `SpeechToTextProvider` abstraction, provider-agnostic V2 JSON model caller with DeepSeek as the preferred configured provider, optional `VisualUnderstandingProvider` boundary, existing PostgreSQL-backed chapter/job persistence.

---

## Scope

This plan covers backend only.

Included:

- TikHub adapter skeleton for Douyin and Xiaohongshu public video links.
- Video media fetch and bounded temporary file handling.
- ffmpeg audio extraction.
- ASR provider boundary; deployment should prefer local Faster-Whisper for the first non-OpenAI path, while keeping OpenAI transcription as an explicit compatibility adapter.
- DeepSeek-first model provider selection for V2 JSON generation, with OpenAI fallback for existing environments.
- Visual understanding provider boundary, defaulting to `none`, so Qwen-VL/Gemini style video understanding can be added later without changing the V2 queue contract.
- Model-agnostic boundary checks for the V2 question-generation engine.
- `LearningSource` normalization and source block generation.
- V2 queued generation integration.
- Progress stages, failure codes, retry behavior, and tests.
- Benchmark script for real-link validation.

Excluded from this backend pass:

- iOS upload preview UI.
- iOS source detail UI.
- OCR/keyframe visual summary.
- Embedded video playback.
- Production rollout or deployment.

## Key Decisions

- `TikHub` is hidden behind `VideoSourceProvider`; callers never depend on TikHub response shapes.
- First backend version accepts only URL input for `video_link`; no user video upload.
- ASR is a separate speech-to-text provider boundary. The first adapter can be OpenAI transcription REST, but this does not bind the question-generation engine to OpenAI.
- The first non-OpenAI ASR path is `VIDEO_ASR_PROVIDER=local_whisper`, backed by `backend/scripts/transcribe-local-whisper.py` and `backend/requirements-video-asr.txt`. It runs only in the backend/worker environment; users do not install ASR dependencies.
- The V2 question-generation engine must depend on a generic JSON model caller contract, not on OpenAI, DeepSeek, Qwen, Gemini, or any other provider directly.
- Existing names like `callOpenAIJson` are compatibility exports. New generation code should depend on `callModelJson`, whose provider selection prefers `DEEPSEEK_API_KEY`/`AI_PROVIDER=deepseek` and falls back to OpenAI only when DeepSeek is not configured.
- Multimodal video understanding must stay behind `VisualUnderstandingProvider`. The first implementation is a no-op provider that returns no visual segments and records that visual understanding was skipped; real multimodal providers are added only after real samples show transcript/OCR is insufficient.
- `LearningSource.normalizedText` is the only required input for V2 generation.
- `source.blocks[].id/type/text` remains backward compatible. Optional metadata such as `sourceRole/startSeconds/endSeconds` is retained server-side and can be exposed after the iOS contract is expanded.
- First release does not change V2 question-generation prompts, task selection, or quality rubrics based on source type or content structure. Article/video structure research is used for metadata preservation, benchmark bucketing, and future decisions after real sample results.
- Original video files are temporary and deleted after extraction. The backend may persist transcript/source metadata with the chapter but does not persist raw video media.
- DSPy remains useful as a lab framework and design reference for signatures, modules, metrics, and optimizers. It should not become a production dependency for the Node backend in this implementation plan.

## Plan Status Review

This backend plan is already detailed through executable TDD tasks. It includes concrete files, test snippets, implementation snippets, commands, expected outcomes, and commit boundaries for:

- Baseline checks and model-agnostic V2 generation boundary.
- Media platform detection, shared media errors, and LearningSource normalization.
- TikHub adapter, temporary media download, ffmpeg audio extraction, ASR adapter, and extraction orchestration.
- `extractSourceContent(video_link)` integration and V2 queue integration.
- Source metadata serialization, video failure mapping, media cost recording, real-link benchmark, model-candidate benchmark, and acceptance gate.

The remaining planning work is not to add a second generation system. The key refinement is to keep Phase 1 narrow: build a stable video-to-text source pipeline, feed the existing V2 engine, measure real output, and defer structure-aware prompt changes until there is evidence from the benchmark set.

## Industry-Stable Implementation Standards

Use these standards while implementing the tasks below:

- **Provider adapter boundary:** TikHub must be behind a normalized `VideoSourceProvider` interface. No queue, serializer, or generation module should depend on raw TikHub response fields.
- **Pipeline DTO boundary:** `LearningSource` is the only cross-layer media understanding object. Provider output, temp files, transcript payloads, and V2 source blocks should not leak into each other.
- **Explicit state machine:** progress stages should be finite, user-safe, and monotonic enough for UI display. Internal detailed stages can map to the same user copy.
- **Idempotent queue behavior:** video extraction success should persist resolved source once; extraction failure should never call the model; retryable provider/ASR failures should requeue only when attempts remain.
- **Timeouts, bounded files, and cleanup:** every network/media step needs timeout, max bytes, and `finally` cleanup. Raw video files must stay temporary.
- **Backward-compatible contracts:** `source.blocks[].id/type/text` remains required. Video metadata is optional and additive.
- **Golden fixtures and real-link benchmark:** unit tests use mock provider payloads. Real Douyin/Xiaohongshu links belong in a benchmark input file, with success rate, failure reasons, cost, and latency recorded.
- **Observability by stage:** record provider, media, ASR, and generation costs separately so failed video attempts do not hide sunk cost inside model-generation cost.
- **No first-release prompt branching:** do not feed source structure labels into `taskBriefPlan`, prompt selection, or quality rubrics in this backend pass.

## File Structure

Create:

- `backend/src/media/videoPlatforms.js`  
  Detect and normalize supported platform from URL.
- `backend/src/media/mediaErrors.js`  
  Shared error builders and retry classification for media extraction.
- `backend/src/media/learningSource.js`  
  Normalize provider metadata, platform descriptions, transcripts, and source sections into `LearningSource`.
- `backend/src/media/tikhubVideoProvider.js`  
  TikHub REST adapter with timeout, endpoint routing, and normalized provider output.
- `backend/src/media/mediaFiles.js`  
  Bounded download, temp directory creation, cleanup helpers.
- `backend/src/media/ffmpegAudio.js`  
  Spawn ffmpeg to extract audio from a media file.
- `backend/src/media/openAITranscriptionProvider.js`  
  OpenAI transcription REST client and normalized transcript segment output.
- `backend/src/media/extractVideoLearningSource.js`  
  Orchestrator that calls provider, downloads media, extracts audio, transcribes, and builds `LearningSource`.
- `backend/src/media/*.test.js`  
  Unit tests for each media module.
- `backend/scripts/benchmark-video-learning-source.mjs`  
  Manual benchmark runner for real Douyin/Xiaohongshu links.

Modify:

- `backend/src/generation/openaiClient.js`  
  Keep provider-specific JSON calls here temporarily, but expose a provider-neutral `callModelJson` alias.
- `backend/src/v2/generation/modelPromptCaller.js`  
  Depend on `callModelJson` naming and injection, not provider-specific generation names.
- `backend/src/sources/extractSourceContent.js`  
  Route `video_link` to `extractVideoLearningSource`.
- `backend/src/v2/generation/v2GenerationJobRunner.js`  
  Treat `video_link` as an extractable source and persist video source fields.
- `backend/src/v2/generation/generationProgress.js`  
  Add media extraction stages and user-safe display text.
- `backend/src/v2/contracts/reviewPathContract.js`  
  Accept optional source block metadata while preserving required fields.
- `backend/src/v2/serializers/reviewPathClientSerializer.js`  
  Preserve optional source block metadata for client compatibility.
- `backend/src/server.js`  
  Preserve normalized video source metadata during chapter serialization.
- `backend/src/generation/types.js`  
  Change `failed_extract_video` display copy from video text extraction to video content extraction.
- `backend/package.json`  
  Add `node --check` and `node --test` coverage for the new media files.
- `docs/media-learning-source-architecture-zh.md`  
  Record backend implementation details and env vars.

## Environment Variables

Required for real video extraction:

```bash
TIKHUB_API_KEY=<set-in-backend-env>
OPENAI_API_KEY=<set-in-backend-env>
FFMPEG_PATH=ffmpeg
```

Optional defaults:

```bash
TIKHUB_BASE_URL=https://api.tikhub.io
TIKHUB_TIMEOUT_MS=30000
VIDEO_MEDIA_FETCH_TIMEOUT_MS=60000
VIDEO_MEDIA_MAX_BYTES=157286400
VIDEO_AUDIO_EXTRACT_TIMEOUT_MS=90000
VIDEO_ASR_TIMEOUT_MS=120000
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

## Task 0: Baseline And Test Harness

**Files:**

- Read: `backend/src/sources/extractSourceContent.js`
- Read: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Read: `backend/src/v2/generation/generationProgress.js`
- Read: `backend/package.json`

- [ ] **Step 1: Confirm working tree**

Run:

```bash
git status --short --branch
```

Expected:

- Current branch is the isolated test-feature branch.
- Existing doc changes may be present.
- No backend production code changes are present yet.

- [ ] **Step 2: Run current backend checks before editing**

Run:

```bash
npm --prefix backend run check:v2
```

Expected:

- Existing V2 tests pass before video work starts.

- [ ] **Step 3: Commit or intentionally leave docs separate**

If the user wants a clean backend implementation history, commit existing doc-only changes before starting code:

```bash
git add docs/superpowers/plans/2026-07-05-video-learning-source-frontend-backend-plan.md \
  docs/superpowers/plans/2026-07-05-video-learning-source-backend-implementation-plan.md \
  tasks/prd-ai-knowledge-review-ios.md
git commit -m "docs: plan video learning source backend"
```

Expected:

- Code implementation commits are not mixed with planning docs.

## Task 0.5: Model-Agnostic Generation Boundary

**Files:**

- Modify: `backend/src/generation/openaiClient.js`
- Modify: `backend/src/v2/generation/modelPromptCaller.js`
- Modify: `backend/src/v2/generation/modelPromptCaller.test.js`
- Read: `docs/question-generation-experiment-isolation-plan-zh.md`

- [ ] **Step 1: Add a provider-neutral JSON model caller export**

In `backend/src/generation/openaiClient.js`, keep the existing `callOpenAIJson` export for compatibility, but add:

```js
export const callModelJson = callOpenAIJson;
```

This is a naming boundary, not a provider rewrite. The existing function already routes to DeepSeek when `DEEPSEEK_API_KEY` or `AI_PROVIDER=deepseek` is set.

- [ ] **Step 2: Update V2 prompt caller import**

In `backend/src/v2/generation/modelPromptCaller.js`, change:

```js
import { callOpenAIJson } from "../../generation/openaiClient.js";
```

to:

```js
import { callModelJson } from "../../generation/openaiClient.js";
```

Change the default:

```js
modelJsonCaller = callModelJson,
```

Do not change the injected `modelJsonCaller` contract. Tests and future provider swaps should still pass a fake function with the same request shape.

- [ ] **Step 3: Add a boundary test**

In `backend/src/v2/generation/modelPromptCaller.test.js`, add:

```js
test("uses injected modelJsonCaller instead of binding to a provider client", async () => {
  const calls = [];
  const caller = createV2ModelPromptCaller({
    modelJsonCaller: async (request) => {
      calls.push(request);
      return {
        units: [
          {
            id: "unit-1",
            title: "核心理解",
            nodeLabel: "核心理解",
            overview: "理解主要观点",
            sourceAnchor: {
              id: "anchor-1",
              blockIds: ["p-001"],
              label: "来源片段"
            }
          }
        ]
      };
    },
    retryCount: 0
  });

  const result = await caller("reviewPathPlan", {
    article: { title: "测试文章" },
    source: { title: "测试来源" },
    blocks: [{ id: "p-001", type: "paragraph", text: "测试内容。" }]
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].stage, "v2_reviewPathPlan");
  assert.equal(Array.isArray(result.units), true);
});
```

If `modelPromptCaller.test.js` already has equivalent injection coverage, keep that test and add a short assertion or comment that the model provider is intentionally injected.

- [ ] **Step 4: Record DSPy boundary in docs**

Update `docs/question-generation-experiment-isolation-plan-zh.md` only if the current text is missing this rule:

```md
生产 V2 出题链路不得直接依赖 DSPy runtime。DSPy 产物只能以实验报告、字段级 prompt 建议、golden sample 评测结果或手工迁移后的 schema/prompt 变更进入生产，并且必须通过生产准入门槛。
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test backend/src/v2/generation/modelPromptCaller.test.js
npm --prefix backend run check:v2
```

Expected:

- V2 prompt caller tests pass.
- No production generation module imports a provider-specific function except through the neutral `callModelJson` boundary.

Commit:

```bash
git add backend/src/generation/openaiClient.js backend/src/v2/generation/modelPromptCaller.js \
  backend/src/v2/generation/modelPromptCaller.test.js docs/question-generation-experiment-isolation-plan-zh.md
git commit -m "refactor: clarify model-agnostic v2 generation boundary"
```

## Task 1: Platform Detection And Media Errors

**Files:**

- Create: `backend/src/media/videoPlatforms.js`
- Create: `backend/src/media/videoPlatforms.test.js`
- Create: `backend/src/media/mediaErrors.js`
- Create: `backend/src/media/mediaErrors.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write platform detection tests**

Create `backend/src/media/videoPlatforms.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { detectVideoPlatform, normalizeVideoSourceUrl } from "./videoPlatforms.js";

test("detects Douyin hosts", () => {
  assert.equal(detectVideoPlatform("https://v.douyin.com/abc/"), "douyin");
  assert.equal(detectVideoPlatform("https://www.douyin.com/video/123"), "douyin");
});

test("detects Xiaohongshu hosts", () => {
  assert.equal(detectVideoPlatform("https://www.xiaohongshu.com/explore/123"), "xiaohongshu");
  assert.equal(detectVideoPlatform("https://xhslink.com/a/abc"), "xiaohongshu");
});

test("returns unknown for unsupported hosts", () => {
  assert.equal(detectVideoPlatform("https://example.com/video/1"), "unknown");
});

test("normalizes only http and https video URLs", () => {
  assert.equal(normalizeVideoSourceUrl(" https://v.douyin.com/abc/ ").href, "https://v.douyin.com/abc/");
  assert.throws(() => normalizeVideoSourceUrl("ftp://v.douyin.com/abc"), /视频链接必须是 http 或 https/);
  assert.throws(() => normalizeVideoSourceUrl("not a url"), /这不是有效的视频链接/);
});
```

- [ ] **Step 2: Implement platform detection**

Create `backend/src/media/videoPlatforms.js`:

```js
const DOUYIN_HOSTS = ["douyin.com", "v.douyin.com"];
const XIAOHONGSHU_HOSTS = ["xiaohongshu.com", "xhslink.com"];

export function normalizeVideoSourceUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw createInputError("这不是有效的视频链接。请粘贴 http 或 https 开头的公开视频链接。");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw createInputError("视频链接必须是 http 或 https 开头。");
  }

  return url;
}

export function detectVideoPlatform(value) {
  let url;
  try {
    url = normalizeVideoSourceUrl(value);
  } catch {
    return "unknown";
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (DOUYIN_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return "douyin";
  if (XIAOHONGSHU_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return "xiaohongshu";
  return "unknown";
}

function createInputError(message) {
  const error = new Error(message);
  error.code = "failed_extract_video";
  error.mediaErrorType = "invalid_video_url";
  error.retryable = false;
  return error;
}
```

- [ ] **Step 3: Write media error tests**

Create `backend/src/media/mediaErrors.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  createMediaExtractionError,
  isRetryableMediaExtractionError
} from "./mediaErrors.js";

test("builds user-safe video extraction errors", () => {
  const error = createMediaExtractionError("video_private_or_deleted", "这条视频无法公开访问。", { retryable: false });
  assert.equal(error.code, "failed_extract_video");
  assert.equal(error.mediaErrorType, "video_private_or_deleted");
  assert.equal(error.retryable, false);
  assert.equal(error.message, "这条视频无法公开访问。");
});

test("classifies transient media errors as retryable", () => {
  assert.equal(isRetryableMediaExtractionError(createMediaExtractionError("provider_timeout", "timeout", { retryable: true })), true);
  assert.equal(isRetryableMediaExtractionError(createMediaExtractionError("video_private_or_deleted", "private", { retryable: false })), false);
});
```

- [ ] **Step 4: Implement media errors**

Create `backend/src/media/mediaErrors.js`:

```js
export function createMediaExtractionError(mediaErrorType, message, {
  retryable = false,
  cause = null,
  provider = "",
  status = null
} = {}) {
  const error = new Error(message || "视频内容提取失败");
  error.code = "failed_extract_video";
  error.mediaErrorType = mediaErrorType || "unknown_video_extraction_error";
  error.retryable = Boolean(retryable);
  if (provider) error.provider = provider;
  if (status !== null && status !== undefined) error.status = status;
  if (cause) error.cause = cause;
  return error;
}

export function isRetryableMediaExtractionError(error) {
  if (error?.retryable === true) return true;
  return [
    "provider_timeout",
    "provider_rate_limited",
    "provider_unavailable",
    "video_media_timeout",
    "video_media_unavailable",
    "asr_timeout",
    "asr_unavailable"
  ].includes(error?.mediaErrorType);
}
```

- [ ] **Step 5: Add tests to package checks**

Modify the existing `backend/package.json` `check` script by inserting these entries near the other backend checks:

```bash
node --check src/media/videoPlatforms.js
node --check src/media/mediaErrors.js
node --test src/media/videoPlatforms.test.js src/media/mediaErrors.test.js
```

Keep the existing script content; only add the new check and test entries.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
node --test backend/src/media/videoPlatforms.test.js backend/src/media/mediaErrors.test.js
npm --prefix backend run check:v2
```

Expected:

- New media unit tests pass.
- Existing V2 tests still pass.

Commit:

```bash
git add backend/src/media/videoPlatforms.js backend/src/media/videoPlatforms.test.js \
  backend/src/media/mediaErrors.js backend/src/media/mediaErrors.test.js backend/package.json
git commit -m "feat: add video media platform primitives"
```

## Task 2: LearningSource Normalization

**Files:**

- Create: `backend/src/media/learningSource.js`
- Create: `backend/src/media/learningSource.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write LearningSource tests**

Create `backend/src/media/learningSource.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLearningSourceFromVideo,
  buildV2SourceFromLearningSource
} from "./learningSource.js";

test("merges platform description and transcript into normalized text", () => {
  const learningSource = buildLearningSourceFromVideo({
    platform: "douyin",
    title: "用 AI 做产品调研",
    url: "https://v.douyin.com/abc/",
    account: "产品老张",
    description: "这条视频讲 AI 调研流程。",
    transcriptSegments: [
      { id: "seg-1", startSeconds: 0, endSeconds: 4, text: "第一步先明确用户问题。" },
      { id: "seg-2", startSeconds: 4, endSeconds: 8, text: "第二步把访谈记录整理成主题。" }
    ],
    media: { provider: "tikhub", providerContentId: "video-1" }
  });

  assert.equal(learningSource.sourceType, "video_link");
  assert.match(learningSource.normalizedText, /平台文案/);
  assert.match(learningSource.normalizedText, /第一步先明确用户问题/);
  assert.equal(learningSource.sourceSections.length, 3);
});

test("builds backward-compatible V2 source blocks", () => {
  const learningSource = buildLearningSourceFromVideo({
    platform: "xiaohongshu",
    title: "小红书案例",
    url: "https://www.xiaohongshu.com/explore/1",
    account: "增长笔记",
    description: "案例文案",
    transcriptSegments: [{ id: "seg-1", startSeconds: 12, endSeconds: 18, text: "这是转写。" }],
    media: { provider: "tikhub" }
  });
  const source = buildV2SourceFromLearningSource(learningSource);

  assert.equal(source.type, "video_link");
  assert.equal(source.title, "小红书案例");
  assert.equal(source.account, "增长笔记");
  assert.equal(source.blocks[0].type, "paragraph");
  assert.equal(source.blocks[0].sourceRole, "platform_description");
  assert.equal(source.blocks[1].startSeconds, 12);
  assert.match(source.cleanedText, /案例文案/);
});

test("rejects video sources with too little learnable text", () => {
  assert.throws(
    () => buildLearningSourceFromVideo({
      platform: "douyin",
      title: "短视频",
      url: "https://v.douyin.com/abc/",
      transcriptSegments: [],
      media: { provider: "tikhub" }
    }),
    /没有提取到足够的可复习内容/
  );
});
```

- [ ] **Step 2: Implement LearningSource normalization**

Create `backend/src/media/learningSource.js`:

```js
import { createMediaExtractionError } from "./mediaErrors.js";

const MIN_NORMALIZED_TEXT_LENGTH = 80;

export function buildLearningSourceFromVideo({
  platform = "unknown",
  title = "",
  url = "",
  account = "",
  author = "",
  durationSeconds = null,
  description = "",
  transcriptSegments = [],
  visualSegments = [],
  media = {},
  now = new Date().toISOString()
} = {}) {
  const sourceSections = [
    ...descriptionToSections(description),
    ...transcriptToSections(transcriptSegments),
    ...visualToSections(visualSegments)
  ];
  const normalizedText = renderNormalizedText(sourceSections);

  if (normalizedText.replace(/\s/g, "").length < MIN_NORMALIZED_TEXT_LENGTH) {
    throw createMediaExtractionError(
      "video_content_too_short",
      "这条视频没有提取到足够的可复习内容。请换一个信息量更高的公开视频链接。",
      { retryable: false }
    );
  }

  return {
    id: media.providerContentId ? `video-source-${media.providerContentId}` : `video-source-${hashString(url || title)}`,
    sourceType: "video_link",
    platform,
    title: cleanText(title) || platformLabel(platform),
    url,
    account: cleanText(account),
    author: cleanText(author || account),
    durationSeconds: finiteNumber(durationSeconds),
    rawText: normalizedText,
    normalizedText,
    transcriptSegments: normalizeTranscriptSegments(transcriptSegments),
    visualSegments,
    sourceSections,
    media: {
      provider: media.provider || "",
      providerContentId: media.providerContentId || "",
      coverUrl: media.coverUrl || "",
      playUrlExpiresAt: media.playUrlExpiresAt || ""
    },
    extractionMeta: {
      stages: [],
      createdAt: now
    }
  };
}

export function buildV2SourceFromLearningSource(learningSource) {
  const blocks = learningSource.sourceSections.map((section, index) => ({
    id: section.id || `video-section-${String(index + 1).padStart(3, "0")}`,
    type: "paragraph",
    text: section.text,
    sourceRole: section.sourceRole,
    ...(Number.isFinite(section.startSeconds) ? { startSeconds: section.startSeconds } : {}),
    ...(Number.isFinite(section.endSeconds) ? { endSeconds: section.endSeconds } : {})
  }));

  return {
    type: "video_link",
    platform: learningSource.platform,
    title: learningSource.title,
    url: learningSource.url,
    author: learningSource.author || learningSource.account,
    account: learningSource.account || learningSource.author,
    accountOrDomain: learningSource.account || learningSource.author || learningSource.platform,
    rawInput: learningSource.url,
    rawText: learningSource.normalizedText,
    extractedText: learningSource.normalizedText,
    cleanedText: learningSource.normalizedText,
    durationSeconds: learningSource.durationSeconds,
    media: learningSource.media,
    blocks
  };
}

function descriptionToSections(description) {
  const text = cleanText(description);
  if (!text) return [];
  return [{
    id: "video-platform-description",
    sourceRole: "platform_description",
    text: `平台文案：${text}`
  }];
}

function transcriptToSections(segments) {
  return normalizeTranscriptSegments(segments).map((segment, index) => ({
    id: segment.id || `video-transcript-${String(index + 1).padStart(3, "0")}`,
    sourceRole: "audio_transcript",
    startSeconds: segment.startSeconds,
    endSeconds: segment.endSeconds,
    text: segment.text
  }));
}

function visualToSections(segments) {
  return Array.isArray(segments) ? segments
    .map((segment, index) => ({
      id: segment.id || `video-visual-${String(index + 1).padStart(3, "0")}`,
      sourceRole: segment.sourceRole || "visual_summary",
      startSeconds: finiteNumber(segment.startSeconds),
      endSeconds: finiteNumber(segment.endSeconds),
      text: cleanText(segment.ocrText || segment.summary || segment.text || "")
    }))
    .filter((section) => section.text) : [];
}

function normalizeTranscriptSegments(segments) {
  return Array.isArray(segments) ? segments
    .map((segment, index) => ({
      id: segment.id || `transcript-${String(index + 1).padStart(3, "0")}`,
      startSeconds: finiteNumber(segment.startSeconds),
      endSeconds: finiteNumber(segment.endSeconds),
      text: cleanText(segment.text),
      ...(Number.isFinite(Number(segment.confidence)) ? { confidence: Number(segment.confidence) } : {})
    }))
    .filter((segment) => segment.text) : [];
}

function renderNormalizedText(sections) {
  return sections
    .map((section) => cleanText(section.text))
    .filter(Boolean)
    .join("\n\n");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function platformLabel(platform) {
  if (platform === "douyin") return "抖音视频";
  if (platform === "xiaohongshu") return "小红书视频";
  return "视频链接";
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test backend/src/media/learningSource.test.js
npm --prefix backend run check:v2
```

Expected:

- LearningSource tests pass.

Commit:

```bash
git add backend/src/media/learningSource.js backend/src/media/learningSource.test.js backend/package.json
git commit -m "feat: normalize video learning sources"
```

## Task 3: TikHub Video Provider Adapter

**Files:**

- Create: `backend/src/media/tikhubVideoProvider.js`
- Create: `backend/src/media/tikhubVideoProvider.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write TikHub adapter tests with mocked fetch**

Create `backend/src/media/tikhubVideoProvider.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";

test("normalizes Douyin TikHub response", async () => {
  const calls = [];
  const result = await fetchTikHubVideoSource({
    sourceUrl: "https://v.douyin.com/abc/",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({
        data: {
          aweme_id: "douyin-1",
          desc: "AI 产品调研流程",
          author: { nickname: "产品老张" },
          video: {
            duration: 61000,
            play_addr: { url_list: ["https://media.example.com/douyin.mp4"] },
            cover: { url_list: ["https://media.example.com/cover.jpg"] }
          }
        }
      });
    }
  });

  assert.equal(result.platform, "douyin");
  assert.equal(result.providerContentId, "douyin-1");
  assert.equal(result.title, "AI 产品调研流程");
  assert.equal(result.account, "产品老张");
  assert.equal(result.mediaUrl, "https://media.example.com/douyin.mp4");
  assert.equal(result.coverUrl, "https://media.example.com/cover.jpg");
  assert.equal(result.durationSeconds, 61);
  assert.match(calls[0].url, /fetch_one_video_by_share_url/);
  assert.equal(calls[0].options.headers.authorization, "Bearer test-tikhub-key");
});

test("normalizes Xiaohongshu TikHub response", async () => {
  const result = await fetchTikHubVideoSource({
    sourceUrl: "https://www.xiaohongshu.com/explore/1",
    apiKey: "key",
    fetchImpl: async () => jsonResponse({
      data: {
        note_id: "xhs-1",
        title: "增长案例",
        desc: "小红书笔记文案",
        user: { nickname: "增长笔记" },
        video: { media: { stream: { h264: [{ master_url: "https://media.example.com/xhs.mp4" }] } } },
        image_list: [{ url: "https://media.example.com/xhs-cover.jpg" }]
      }
    })
  });

  assert.equal(result.platform, "xiaohongshu");
  assert.equal(result.providerContentId, "xhs-1");
  assert.equal(result.title, "增长案例");
  assert.equal(result.description, "小红书笔记文案");
  assert.equal(result.mediaUrl, "https://media.example.com/xhs.mp4");
});

test("fails unsupported platforms before calling provider", async () => {
  await assert.rejects(
    () => fetchTikHubVideoSource({
      sourceUrl: "https://example.com/video/1",
      fetchImpl: async () => { throw new Error("fetch should not run"); }
    }),
    /当前优先支持抖音和小红书公开视频/
  );
});

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}
```

- [ ] **Step 2: Implement TikHub adapter**

Create `backend/src/media/tikhubVideoProvider.js`:

```js
import { createMediaExtractionError } from "./mediaErrors.js";
import { detectVideoPlatform, normalizeVideoSourceUrl } from "./videoPlatforms.js";

const DEFAULT_TIKHUB_BASE_URL = process.env.TIKHUB_BASE_URL || "https://api.tikhub.io";
const DEFAULT_TIKHUB_TIMEOUT_MS = readPositiveInt(process.env.TIKHUB_TIMEOUT_MS, 30_000);

export async function fetchTikHubVideoSource({
  sourceUrl,
  apiKey = process.env.TIKHUB_API_KEY || "test-tikhub-key",
  baseUrl = DEFAULT_TIKHUB_BASE_URL,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIKHUB_TIMEOUT_MS
} = {}) {
  const url = normalizeVideoSourceUrl(sourceUrl);
  const platform = detectVideoPlatform(url.href);
  if (platform === "unknown") {
    throw createMediaExtractionError(
      "unsupported_video_platform",
      "当前优先支持抖音和小红书公开视频链接。",
      { retryable: false, provider: "tikhub" }
    );
  }
  if (!apiKey) {
    throw createMediaExtractionError(
      "provider_config_missing",
      "视频取源服务暂未配置，请稍后再试。",
      { retryable: false, provider: "tikhub" }
    );
  }

  const endpoint = buildEndpoint({ platform, sourceUrl: url.href, baseUrl });
  const payload = await fetchJsonWithTimeout(endpoint, {
    headers: { authorization: `Bearer ${apiKey}` },
    timeoutMs,
    fetchImpl
  });

  return platform === "douyin"
    ? normalizeDouyinPayload(payload, url.href)
    : normalizeXiaohongshuPayload(payload, url.href);
}

function buildEndpoint({ platform, sourceUrl, baseUrl }) {
  const root = String(baseUrl || "").replace(/\/+$/, "");
  const encoded = encodeURIComponent(sourceUrl);
  if (platform === "douyin") {
    return `${root}/api/v1/douyin/app/v3/fetch_one_video_by_share_url?share_url=${encoded}`;
  }
  return `${root}/api/v1/xiaohongshu/app_v2/get_video_note_detail?url=${encoded}`;
}

async function fetchJsonWithTimeout(url, { headers, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw createMediaExtractionError(
        response.status === 429 ? "provider_rate_limited" : "provider_unavailable",
        "视频取源服务暂时不可用，请稍后重试。",
        { retryable: response.status === 429 || response.status >= 500, provider: "tikhub", status: response.status }
      );
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("provider_timeout", "视频取源服务响应超时，请稍后重试。", { retryable: true, provider: "tikhub" });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("provider_unavailable", "视频取源服务暂时不可用，请稍后重试。", { retryable: true, provider: "tikhub", cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDouyinPayload(payload, sourceUrl) {
  const data = payload?.data?.aweme_detail || payload?.data || payload?.aweme_detail || payload;
  const mediaUrl = firstString(
    data?.video?.play_addr?.url_list,
    data?.video?.download_addr?.url_list,
    data?.video?.bit_rate?.flatMap((item) => item?.play_addr?.url_list || [])
  );
  if (!mediaUrl) throw mediaUnavailable();
  return {
    provider: "tikhub",
    platform: "douyin",
    providerContentId: stringValue(data?.aweme_id || data?.id),
    title: stringValue(data?.desc || data?.caption || "抖音视频"),
    description: stringValue(data?.desc || ""),
    account: stringValue(data?.author?.nickname || data?.author?.unique_id || ""),
    sourceUrl,
    mediaUrl,
    coverUrl: firstString(data?.video?.cover?.url_list, data?.video?.origin_cover?.url_list),
    durationSeconds: millisToSeconds(data?.video?.duration)
  };
}

function normalizeXiaohongshuPayload(payload, sourceUrl) {
  const data = payload?.data?.note_card || payload?.data || payload?.note_card || payload;
  const mediaUrl = firstString(
    data?.video?.media?.stream?.h264?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    data?.video?.media?.stream?.h265?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    data?.video?.url,
    data?.video_url
  );
  if (!mediaUrl) throw mediaUnavailable();
  return {
    provider: "tikhub",
    platform: "xiaohongshu",
    providerContentId: stringValue(data?.note_id || data?.id),
    title: stringValue(data?.title || data?.display_title || "小红书视频"),
    description: stringValue(data?.desc || data?.description || ""),
    account: stringValue(data?.user?.nickname || data?.user_info?.nickname || ""),
    sourceUrl,
    mediaUrl,
    coverUrl: firstString(data?.image_list?.map((item) => item?.url || item?.info_list?.[0]?.url)),
    durationSeconds: millisToSeconds(data?.video?.duration || data?.duration)
  };
}

function mediaUnavailable() {
  return createMediaExtractionError("video_media_url_missing", "无法获取可处理的视频地址。请确认视频为公开视频。", { retryable: false, provider: "tikhub" });
}

function firstString(...values) {
  for (const value of values.flat(Infinity)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function stringValue(value) {
  return String(value || "").trim();
}

function millisToSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number > 1000 ? Math.round(number / 1000) : Math.round(number);
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test backend/src/media/tikhubVideoProvider.test.js
npm --prefix backend run check:v2
```

Expected:

- Adapter tests pass without network access.

Commit:

```bash
git add backend/src/media/tikhubVideoProvider.js backend/src/media/tikhubVideoProvider.test.js backend/package.json
git commit -m "feat: add tikhub video source adapter"
```

## Task 4: Media Download And ffmpeg Audio Extraction

**Files:**

- Create: `backend/src/media/mediaFiles.js`
- Create: `backend/src/media/mediaFiles.test.js`
- Create: `backend/src/media/ffmpegAudio.js`
- Create: `backend/src/media/ffmpegAudio.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write media file tests**

Create `backend/src/media/mediaFiles.test.js` with mocked fetch and temp directory assertions:

```js
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";

test("downloads media to a temp file and cleans it up", async () => {
  const file = await downloadMediaToTempFile({
    mediaUrl: "https://media.example.com/video.mp4",
    maxBytes: 100,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "video/mp4"]]),
      arrayBuffer: async () => Buffer.from("fake-video")
    })
  });

  assert.equal(file.contentType, "video/mp4");
  assert.equal(await readFile(file.path, "utf8"), "fake-video");
  await cleanupMediaTempFiles(file);
  assert.equal(existsSync(file.path), false);
});

test("rejects media larger than configured max bytes", async () => {
  await assert.rejects(
    () => downloadMediaToTempFile({
      mediaUrl: "https://media.example.com/video.mp4",
      maxBytes: 4,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "video/mp4"]]),
        arrayBuffer: async () => Buffer.from("too-large")
      })
    }),
    /视频文件过大/
  );
});
```

- [ ] **Step 2: Implement media file helpers**

Create `backend/src/media/mediaFiles.js`:

```js
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

import { createMediaExtractionError } from "./mediaErrors.js";

const DEFAULT_MAX_BYTES = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, 150 * 1024 * 1024);
const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_MEDIA_FETCH_TIMEOUT_MS, 60_000);

export async function downloadMediaToTempFile({
  mediaUrl,
  fetchImpl = fetch,
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(mediaUrl, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) {
      throw createMediaExtractionError("video_media_unavailable", "视频内容暂时无法读取，请稍后重试。", { retryable: response.status >= 500, status: response.status });
    }
    const contentType = response.headers?.get?.("content-type") || response.headers?.get?.("Content-Type") || "";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", { retryable: false });
    }
    const dir = join(tmpdir(), `shibei-video-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "source-video");
    await writeFile(path, buffer);
    return { path, dir, bytes: buffer.byteLength, contentType, sourceUrl: mediaUrl };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("video_media_timeout", "读取视频内容超时，请稍后重试。", { retryable: true });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("video_media_unavailable", "视频内容暂时无法读取，请稍后重试。", { retryable: true, cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export async function cleanupMediaTempFiles(...files) {
  const dirs = files.flat().map((file) => file?.dir).filter(Boolean);
  await Promise.all([...new Set(dirs)].map((dir) => rm(dir, { recursive: true, force: true }).catch(() => {})));
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
```

- [ ] **Step 3: Write ffmpeg tests using fake runner**

Create `backend/src/media/ffmpegAudio.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";

test("builds ffmpeg command for mono wav extraction", async () => {
  const calls = [];
  const result = await extractAudioWithFfmpeg({
    inputPath: "/tmp/source-video",
    outputDir: "/tmp/audio",
    runCommand: async (command, args) => {
      calls.push({ command, args });
    }
  });

  assert.equal(result.path, "/tmp/audio/audio.wav");
  assert.equal(calls[0].command, "ffmpeg");
  assert.deepEqual(calls[0].args.slice(0, 4), ["-y", "-i", "/tmp/source-video"]);
  assert.equal(calls[0].args.includes("-ac"), true);
  assert.equal(calls[0].args.includes("1"), true);
});
```

- [ ] **Step 4: Implement ffmpeg extraction**

Create `backend/src/media/ffmpegAudio.js`:

```js
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { createMediaExtractionError } from "./mediaErrors.js";

const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_AUDIO_EXTRACT_TIMEOUT_MS, 90_000);

export async function extractAudioWithFfmpeg({
  inputPath,
  outputDir,
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  runCommand = runCommandWithTimeout
} = {}) {
  if (!inputPath) {
    throw createMediaExtractionError("video_media_missing", "视频内容暂时无法读取，请稍后重试。", { retryable: true });
  }
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, "audio.wav");
  const args = [
    "-y",
    "-i", inputPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-f", "wav",
    outputPath
  ];
  try {
    await runCommand(ffmpegPath, args, { timeoutMs });
    return { path: outputPath, dir: outputDir, format: "wav", sampleRate: 16000 };
  } catch (error) {
    throw createMediaExtractionError("audio_extraction_failed", "视频音频提取失败，请换一个公开视频链接或稍后重试。", { retryable: false, cause: error });
  }
}

export function runCommandWithTimeout(command, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg_timeout"));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with ${code}`));
    });
  });
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test backend/src/media/mediaFiles.test.js backend/src/media/ffmpegAudio.test.js
npm --prefix backend run check:v2
```

Expected:

- Tests pass without real network or ffmpeg.

Commit:

```bash
git add backend/src/media/mediaFiles.js backend/src/media/mediaFiles.test.js \
  backend/src/media/ffmpegAudio.js backend/src/media/ffmpegAudio.test.js backend/package.json
git commit -m "feat: add video media audio extraction helpers"
```

## Task 5: OpenAI Transcription Provider

**Files:**

- Create: `backend/src/media/openAITranscriptionProvider.js`
- Create: `backend/src/media/openAITranscriptionProvider.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write transcription provider tests**

Create `backend/src/media/openAITranscriptionProvider.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";

test("normalizes verbose_json transcription segments", async () => {
  const result = await transcribeAudioWithOpenAI({
    audioPath: new URL(import.meta.url),
    apiKey: "openai-key",
    fetchImpl: async (url, options) => {
      assert.equal(String(url), "https://api.openai.com/v1/audio/transcriptions");
      assert.equal(options.headers.authorization, "Bearer openai-key");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: "第一步先明确问题。第二步整理主题。",
          segments: [
            { id: 0, start: 0, end: 3.2, text: "第一步先明确问题。" },
            { id: 1, start: 3.2, end: 8, text: "第二步整理主题。" }
          ]
        })
      };
    }
  });

  assert.equal(result.text, "第一步先明确问题。第二步整理主题。");
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[0].startSeconds, 0);
  assert.equal(result.segments[1].endSeconds, 8);
});

test("requires OpenAI API key for ASR", async () => {
  await assert.rejects(
    () => transcribeAudioWithOpenAI({ audioPath: new URL(import.meta.url), apiKey: "" }),
    /语音转写服务暂未配置/
  );
});
```

- [ ] **Step 2: Implement transcription provider**

Create `backend/src/media/openAITranscriptionProvider.js`:

```js
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { createMediaExtractionError } from "./mediaErrors.js";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_ASR_TIMEOUT_MS, 120_000);

export async function transcribeAudioWithOpenAI({
  audioPath,
  apiKey = process.env.OPENAI_API_KEY || "",
  model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  if (!apiKey) {
    throw createMediaExtractionError("asr_config_missing", "语音转写服务暂未配置，请稍后再试。", { retryable: false, provider: "openai" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const buffer = await readFile(audioPath);
    const form = new FormData();
    form.set("model", model);
    form.set("response_format", "verbose_json");
    form.set("file", new Blob([buffer], { type: "audio/wav" }), basename(String(audioPath)));
    const response = await fetchImpl(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw createMediaExtractionError(
        response.status === 429 ? "asr_rate_limited" : "asr_unavailable",
        "视频语音转写暂时失败，请稍后重试。",
        { retryable: response.status === 429 || response.status >= 500, provider: "openai", status: response.status }
      );
    }
    return normalizeTranscriptionPayload(payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("asr_timeout", "视频语音转写超时，请稍后重试。", { retryable: true, provider: "openai" });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("asr_unavailable", "视频语音转写暂时失败，请稍后重试。", { retryable: true, provider: "openai", cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTranscriptionPayload(payload) {
  const text = String(payload?.text || "").trim();
  const segments = Array.isArray(payload?.segments) ? payload.segments.map((segment, index) => ({
    id: `transcript-${String(segment.id ?? index + 1).padStart(3, "0")}`,
    startSeconds: Number.isFinite(Number(segment.start)) ? Number(segment.start) : null,
    endSeconds: Number.isFinite(Number(segment.end)) ? Number(segment.end) : null,
    text: String(segment.text || "").trim()
  })).filter((segment) => segment.text) : [];
  if (!text && segments.length === 0) {
    throw createMediaExtractionError("video_no_speech", "这条视频没有识别到足够清晰的语音内容。", { retryable: false, provider: "openai" });
  }
  return {
    text: text || segments.map((segment) => segment.text).join(" "),
    segments
  };
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test backend/src/media/openAITranscriptionProvider.test.js
npm --prefix backend run check:v2
```

Expected:

- Transcription tests pass without real OpenAI calls.

Commit:

```bash
git add backend/src/media/openAITranscriptionProvider.js backend/src/media/openAITranscriptionProvider.test.js backend/package.json
git commit -m "feat: add openai video transcription provider"
```

## Task 6: Video LearningSource Orchestrator

**Files:**

- Create: `backend/src/media/extractVideoLearningSource.js`
- Create: `backend/src/media/extractVideoLearningSource.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write orchestrator success and cleanup tests**

Create `backend/src/media/extractVideoLearningSource.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { extractVideoLearningSource } from "./extractVideoLearningSource.js";

test("extracts a video learning source through provider, media, audio, and ASR", async () => {
  const calls = [];
  const learningSource = await extractVideoLearningSource({
    sourceUrl: "https://v.douyin.com/abc/",
    provider: {
      fetchVideoSource: async () => {
        calls.push("provider");
        return {
          provider: "tikhub",
          platform: "douyin",
          providerContentId: "douyin-1",
          title: "AI 产品调研",
          description: "平台文案",
          account: "产品老张",
          sourceUrl: "https://v.douyin.com/abc/",
          mediaUrl: "https://media.example.com/video.mp4",
          coverUrl: "https://media.example.com/cover.jpg",
          durationSeconds: 60
        };
      }
    },
    downloadMedia: async () => {
      calls.push("download");
      return { path: "/tmp/video", dir: "/tmp/video-dir" };
    },
    extractAudio: async () => {
      calls.push("audio");
      return { path: "/tmp/audio.wav", dir: "/tmp/audio-dir" };
    },
    transcribeAudio: async () => {
      calls.push("asr");
      return {
        segments: [{ id: "seg-1", startSeconds: 0, endSeconds: 4, text: "先明确用户问题，再整理主题。" }]
      };
    },
    cleanup: async (...files) => {
      calls.push(`cleanup:${files.length}`);
    }
  });

  assert.deepEqual(calls, ["provider", "download", "audio", "asr", "cleanup:2"]);
  assert.equal(learningSource.platform, "douyin");
  assert.match(learningSource.normalizedText, /平台文案/);
  assert.match(learningSource.normalizedText, /先明确用户问题/);
});

test("cleans temporary files when ASR fails", async () => {
  const calls = [];
  await assert.rejects(
    () => extractVideoLearningSource({
      sourceUrl: "https://v.douyin.com/abc/",
      provider: {
        fetchVideoSource: async () => ({
          provider: "tikhub",
          platform: "douyin",
          title: "AI 产品调研",
          sourceUrl: "https://v.douyin.com/abc/",
          mediaUrl: "https://media.example.com/video.mp4"
        })
      },
      downloadMedia: async () => ({ path: "/tmp/video", dir: "/tmp/video-dir" }),
      extractAudio: async () => ({ path: "/tmp/audio.wav", dir: "/tmp/audio-dir" }),
      transcribeAudio: async () => { throw new Error("asr failed"); },
      cleanup: async (...files) => calls.push(`cleanup:${files.length}`)
    }),
    /asr failed/
  );
  assert.deepEqual(calls, ["cleanup:2"]);
});
```

- [ ] **Step 2: Implement orchestrator**

Create `backend/src/media/extractVideoLearningSource.js`:

```js
import { dirname } from "node:path";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";
import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";
import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";
import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";
import { buildLearningSourceFromVideo } from "./learningSource.js";

export async function extractVideoLearningSource({
  sourceUrl,
  rawText = "",
  sourceTitle = "",
  provider = { fetchVideoSource: fetchTikHubVideoSource },
  downloadMedia = downloadMediaToTempFile,
  extractAudio = extractAudioWithFfmpeg,
  transcribeAudio = transcribeAudioWithOpenAI,
  cleanup = cleanupMediaTempFiles,
  now = new Date().toISOString()
} = {}) {
  const video = await provider.fetchVideoSource({ sourceUrl: sourceUrl || rawText });
  const tempFiles = [];
  try {
    const mediaFile = await downloadMedia({ mediaUrl: video.mediaUrl });
    tempFiles.push(mediaFile);
    const audio = await extractAudio({
      inputPath: mediaFile.path,
      outputDir: dirname(mediaFile.path)
    });
    tempFiles.push(audio);
    const transcript = await transcribeAudio({ audioPath: audio.path });
    return buildLearningSourceFromVideo({
      platform: video.platform,
      title: sourceTitle || video.title,
      url: video.sourceUrl || sourceUrl || rawText,
      account: video.account,
      author: video.account,
      durationSeconds: video.durationSeconds,
      description: video.description,
      transcriptSegments: transcript.segments,
      media: {
        provider: video.provider,
        providerContentId: video.providerContentId,
        coverUrl: video.coverUrl
      },
      now
    });
  } finally {
    await cleanup(...tempFiles);
  }
}
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test backend/src/media/extractVideoLearningSource.test.js
npm --prefix backend run check:v2
```

Expected:

- Orchestrator tests pass without network, ffmpeg, or OpenAI.

Commit:

```bash
git add backend/src/media/extractVideoLearningSource.js backend/src/media/extractVideoLearningSource.test.js backend/package.json
git commit -m "feat: orchestrate video learning source extraction"
```

## Task 7: Source Extraction Integration

**Files:**

- Modify: `backend/src/sources/extractSourceContent.js`
- Create: `backend/src/sources/extractSourceContent.video.test.js`
- Modify: `backend/src/generation/types.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write video extraction integration tests**

Create `backend/src/sources/extractSourceContent.video.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { extractSourceContent } from "./extractSourceContent.js";

test("extracts video links into V2-compatible source content", async () => {
  const source = await extractSourceContent({
    sourceType: "video_link",
    sourceUrl: "https://v.douyin.com/abc/",
    extractVideoLearningSource: async () => ({
      sourceType: "video_link",
      platform: "douyin",
      title: "AI 产品调研",
      url: "https://v.douyin.com/abc/",
      account: "产品老张",
      normalizedText: "平台文案：AI 产品调研。\n\n先明确用户问题，再整理主题。",
      sourceSections: [
        { id: "video-platform-description", sourceRole: "platform_description", text: "平台文案：AI 产品调研。" },
        { id: "transcript-001", sourceRole: "audio_transcript", startSeconds: 0, endSeconds: 4, text: "先明确用户问题，再整理主题。" }
      ],
      media: { provider: "tikhub", providerContentId: "douyin-1" }
    })
  });

  assert.equal(source.sourceType, "video_link");
  assert.equal(source.sourceTitle, "AI 产品调研");
  assert.equal(source.sourceAccount, "产品老张");
  assert.equal(source.platform, "douyin");
  assert.match(source.rawText, /先明确用户问题/);
  assert.equal(source.blocks.length, 2);
  assert.equal(source.blocks[1].startSeconds, 0);
});
```

- [ ] **Step 2: Modify `extractSourceContent`**

Add the import:

```js
import { extractVideoLearningSource as defaultExtractVideoLearningSource } from "../media/extractVideoLearningSource.js";
import { buildV2SourceFromLearningSource } from "../media/learningSource.js";
```

Change the function signature:

```js
export async function extractSourceContent(input, {
  extractVideoLearningSource = defaultExtractVideoLearningSource
} = {}) {
```

Replace the current `video_link` branch with:

```js
if (sourceType === "video_link") {
  const learningSource = await extractVideoLearningSource({
    sourceUrl: input.sourceUrl,
    rawText: input.rawText,
    sourceTitle: input.sourceTitle
  });
  const v2Source = buildV2SourceFromLearningSource(learningSource);
  return {
    sourceType: "video_link",
    sourceTitle: v2Source.title,
    sourceUrl: v2Source.url,
    sourceAccount: v2Source.account,
    rawText: v2Source.cleanedText,
    platform: v2Source.platform,
    blocks: v2Source.blocks,
    learningSource,
    source: v2Source
  };
}
```

Update `failed_extract_video` copy in `backend/src/generation/types.js`:

```js
failed_extract_video: "视频内容提取失败",
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
node --test backend/src/sources/extractSourceContent.video.test.js
npm --prefix backend run check:v2
```

Expected:

- Video extraction test passes.
- Existing article extraction tests still pass.

Commit:

```bash
git add backend/src/sources/extractSourceContent.js backend/src/sources/extractSourceContent.video.test.js \
  backend/src/generation/types.js backend/package.json
git commit -m "feat: route video links through learning source extraction"
```

## Task 8: V2 Queue Integration And Progress Stages

**Files:**

- Modify: `backend/src/v2/generation/generationProgress.js`
- Modify: `backend/src/v2/generation/generationProgress.test.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.test.js`

- [ ] **Step 1: Add progress stage tests**

In `backend/src/v2/generation/generationProgress.test.js`, add:

```js
test("maps video extraction stages to user-safe copy", () => {
  assert.equal(buildV2GenerationProgress({ stage: "fetching_video_source" }).displayText, "正在提取视频内容");
  assert.equal(buildV2GenerationProgress({ stage: "fetching_video_media" }).displayText, "正在提取视频内容");
  assert.equal(buildV2GenerationProgress({ stage: "transcribing_audio" }).displayText, "正在提取视频内容");
  assert.equal(buildV2GenerationProgress({ stage: "merging_learning_source" }).displayText, "正在提取视频内容");
});
```

- [ ] **Step 2: Add V2 video queue test**

In `backend/src/v2/generation/v2GenerationJobRunner.test.js`, add:

```js
test("extracts video links before running V2 generation", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "抖音视频",
      status: "submitted",
      source: { type: "video_link", url: "https://v.douyin.com/abc/" },
      generationMeta: {},
      createdAt: "2026-07-05T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async (input) => {
      calls.push({ name: "extractSourceContent", input });
      return {
        sourceType: "video_link",
        sourceTitle: "AI 产品调研",
        sourceUrl: input.sourceUrl,
        sourceAccount: "产品老张",
        rawText: "平台文案：AI 产品调研。\n\n先明确用户问题，再整理主题。".repeat(10),
        platform: "douyin",
        blocks: [
          { id: "video-platform-description", type: "paragraph", text: "平台文案：AI 产品调研。", sourceRole: "platform_description" },
          { id: "transcript-001", type: "paragraph", text: "先明确用户问题，再整理主题。", sourceRole: "audio_transcript", startSeconds: 0, endSeconds: 4 }
        ],
        source: {
          type: "video_link",
          platform: "douyin",
          title: "AI 产品调研",
          url: input.sourceUrl,
          account: "产品老张",
          accountOrDomain: "产品老张",
          rawInput: input.sourceUrl,
          cleanedText: "平台文案：AI 产品调研。\n\n先明确用户问题，再整理主题。".repeat(10),
          blocks: [
            { id: "video-platform-description", type: "paragraph", text: "平台文案：AI 产品调研。", sourceRole: "platform_description" },
            { id: "transcript-001", type: "paragraph", text: "先明确用户问题，再整理主题。", sourceRole: "audio_transcript", startSeconds: 0, endSeconds: 4 }
          ]
        }
      };
    },
    runV2GenerationJob: async (input) => {
      calls.push({ name: "runV2GenerationJob", input });
      return {
        status: "completed",
        chapter: {
          schemaVersion: "v2_review_path_1",
          id: input.chapterId,
          title: input.sourceTitle,
          status: "completed",
          source: input.source,
          units: []
        }
      };
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob({
    sourceType: "video_link",
    sourceUrl: "https://v.douyin.com/abc/",
    sourceTitle: "抖音视频"
  }), deps);

  assert.equal(result.status, "completed");
  assert.equal(calls.find((call) => call.name === "extractSourceContent").input.sourceType, "video_link");
  const modelInput = calls.find((call) => call.name === "runV2GenerationJob").input;
  assert.equal(modelInput.sourceType, "text");
  assert.equal(modelInput.originalSourceType, "video_link");
  assert.equal(modelInput.source.type, "video_link");
  assert.equal(modelInput.source.platform, "douyin");
  assert.equal(modelInput.source.blocks[1].startSeconds, 0);
  assert.equal(chapters.get("chapter-1").source.type, "video_link");
});
```

- [ ] **Step 3: Add video stages**

In `backend/src/v2/generation/generationProgress.js`, extend `V2_GENERATION_STAGE`:

```js
FETCHING_VIDEO_SOURCE: "fetching_video_source",
FETCHING_VIDEO_MEDIA: "fetching_video_media",
TRANSCRIBING_AUDIO: "transcribing_audio",
MERGING_LEARNING_SOURCE: "merging_learning_source",
```

Add each to `STAGE_COPY` with:

```js
displayText: "正在提取视频内容",
stageGroup: "source",
progress: 0.1
```

Use slightly increasing progress values such as `0.07`, `0.1`, `0.14`, `0.18`.

- [ ] **Step 4: Modify V2 job runner source extraction**

In `backend/src/v2/generation/v2GenerationJobRunner.js`, change:

```js
function isExtractableArticleSource(sourceType) {
  return sourceType === "article_link" || sourceType === "wechat_article";
}
```

to:

```js
function isExtractableSource(sourceType) {
  return ["article_link", "wechat_article", "video_link"].includes(sourceType);
}
```

Use `isExtractableSource` in `resolveV2QueuedGenerationInput`.

Change source extraction call from hardcoded `sourceType: "article_link"` to:

```js
sourceType: input.sourceType === "wechat_article" ? "article_link" : input.sourceType,
```

When building `resolvedInput.source`, prefer `source.source` from extraction:

```js
source: {
  ...(source.source || {}),
  type: input.sourceType || source.sourceType,
  title: source.sourceTitle || input.sourceTitle || input.title || "",
  url: source.sourceUrl || input.sourceUrl || "",
  author: source.sourceAccount || input.sourceAccount || input.author || "",
  account: source.sourceAccount || input.sourceAccount || "",
  accountOrDomain: source.sourceAccount || input.sourceAccount || "",
  rawInput: input.sourceUrl || input.rawText || "",
  rawText: source.rawText || "",
  extractedText: source.rawText || "",
  cleanedText: source.rawText || ""
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
node --test backend/src/v2/generation/generationProgress.test.js backend/src/v2/generation/v2GenerationJobRunner.test.js
npm --prefix backend run check:v2
```

Expected:

- Article and WeChat source tests still pass.
- New video source test passes.

Commit:

```bash
git add backend/src/v2/generation/generationProgress.js backend/src/v2/generation/generationProgress.test.js \
  backend/src/v2/generation/v2GenerationJobRunner.js backend/src/v2/generation/v2GenerationJobRunner.test.js
git commit -m "feat: integrate video sources into v2 generation queue"
```

## Task 9: Source Metadata Contract And Serialization

**Files:**

- Modify: `backend/src/v2/contracts/reviewPathContract.js`
- Modify: `backend/src/v2/contracts/reviewPathContract.test.js`
- Modify: `backend/src/v2/serializers/reviewPathClientSerializer.js`
- Modify: `backend/src/v2/serializers/reviewPathClientSerializer.test.js`
- Modify: `backend/src/server.js`
- Modify: `backend/src/tests/reviewSessionLifecycle.test.js`

- [ ] **Step 1: Add contract tests for optional video block metadata**

In `backend/src/v2/contracts/reviewPathContract.test.js`, add a case where a valid source block includes:

```js
{
  id: "transcript-001",
  type: "paragraph",
  text: "先明确用户问题。",
  sourceRole: "audio_transcript",
  startSeconds: 0,
  endSeconds: 4
}
```

Expected:

```js
assert.equal(validateReviewPathV2(payload).ok, true);
```

- [ ] **Step 2: Preserve metadata in serializer**

Update `serializeSourceBlock` in `backend/src/v2/serializers/reviewPathClientSerializer.js`:

```js
function serializeSourceBlock(block) {
  return {
    id: block.id,
    kind: block.type,
    text: block.text,
    ...(block.sourceRole ? { sourceRole: block.sourceRole } : {}),
    ...(Number.isFinite(Number(block.startSeconds)) ? { startSeconds: Number(block.startSeconds) } : {}),
    ...(Number.isFinite(Number(block.endSeconds)) ? { endSeconds: Number(block.endSeconds) } : {})
  };
}
```

- [ ] **Step 3: Preserve metadata in server normalization**

Update `normalizeV2SourceBlocks` in `backend/src/server.js`:

```js
function normalizeV2SourceBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block, index) => ({
    id: toStringValue(block?.id || `p-${String(index + 1).padStart(3, "0")}`),
    type: toStringValue(block?.type || "paragraph"),
    text: toStringValue(block?.text || ""),
    ...(block?.sourceRole ? { sourceRole: toStringValue(block.sourceRole) } : {}),
    ...(Number.isFinite(Number(block?.startSeconds)) ? { startSeconds: Number(block.startSeconds) } : {}),
    ...(Number.isFinite(Number(block?.endSeconds)) ? { endSeconds: Number(block.endSeconds) } : {})
  })).filter((block) => block.text);
}
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test backend/src/v2/contracts/reviewPathContract.test.js backend/src/v2/serializers/reviewPathClientSerializer.test.js backend/src/tests/reviewSessionLifecycle.test.js
npm --prefix backend run check:v2
```

Expected:

- Existing clients remain compatible because required `id/kind/text` fields are unchanged.
- Optional metadata is preserved for video source pages.

Commit:

```bash
git add backend/src/v2/contracts/reviewPathContract.js backend/src/v2/contracts/reviewPathContract.test.js \
  backend/src/v2/serializers/reviewPathClientSerializer.js backend/src/v2/serializers/reviewPathClientSerializer.test.js \
  backend/src/server.js backend/src/tests/reviewSessionLifecycle.test.js
git commit -m "feat: preserve video source block metadata"
```

## Future Task: Source Structure Profile (Deferred)

This is intentionally not part of the first backend implementation pass.

Reason:

- The first release should prove the stable source pipeline: TikHub/provider source fetch, ASR, `LearningSource.normalizedText`, and existing V2 generation.
- We do not yet have enough real sample evidence to safely change prompt behavior, task selection, or quality rubrics by article/video structure.
- Adding a production `sourceStructureProfile` now would create a new control surface before we know whether the existing V2 engine actually underperforms on video-derived text.

Allowed in the first pass:

- Preserve `sourceRole/startSeconds/endSeconds` in source blocks.
- Add benchmark labels outside production generation, for example `contentType: "口播教程"`, `"PPT讲解"`, `"屏幕录制"`, `"观点论证文章"`, `"工具方法文章"`.
- Report benchmark quality by source type and content bucket.

Not allowed in the first pass:

- Do not create `backend/src/v2/generation/sourceStructureProfile.js` as a production dependency.
- Do not expose structure labels to `sourceContext`.
- Do not feed structure labels into `taskBriefPlan`, prompt selection, question type allocation, or quality judge rubrics.
- Do not branch question generation behavior based on `sourceType === "video_link"` except for source extraction and source metadata handling.

Revisit this task only after the real-link benchmark and generated-question review show a consistent, material gap that cannot be addressed by improving the video `LearningSource` quality.

Future acceptance criteria:

- A reviewed dataset covers article and video buckets with human quality labels.
- The structure-aware variant improves source support rate or severe issue rate without hurting article generation.
- The change is validated through the same `ModelJsonClient` boundary, not tied to a specific model provider or DSPy runtime.

## Task 10: Failure Mapping, Retry, And User-Safe Copy

**Files:**

- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.test.js`
- Modify: `backend/src/v2/generation/generationProgress.js`
- Modify: `backend/src/v2/generation/generationFailures.js`
- Modify: `backend/src/v2/generation/generationFailures.test.js`

- [ ] **Step 1: Add failure tests for video extraction**

In `backend/src/v2/generation/v2GenerationJobRunner.test.js`, add:

```js
test("stores video extraction failures without calling the model", async () => {
  const calls = [];
  const chapters = new Map([
    ["chapter-1", {
      id: "chapter-1",
      title: "抖音视频",
      status: "submitted",
      generationMeta: {},
      createdAt: "2026-07-05T00:00:00.000Z"
    }]
  ]);
  const deps = mockDeps({
    calls,
    chapters,
    extractSourceContent: async () => {
      const error = new Error("这条视频无法公开访问。");
      error.code = "failed_extract_video";
      error.mediaErrorType = "video_private_or_deleted";
      error.retryable = false;
      throw error;
    },
    runV2GenerationJob: async () => {
      throw new Error("model should not be called");
    }
  });

  const result = await runV2GenerationQueuedJob(baseJob({
    sourceType: "video_link",
    sourceUrl: "https://v.douyin.com/abc/",
    sourceTitle: "抖音视频"
  }), deps);

  assert.equal(result.status, "failed_generation");
  assert.equal(result.generationProgress.failureCode, "failed_extract_video");
  assert.equal(chapters.get("chapter-1").displayStatusText, "视频内容提取失败");
  assert.equal(calls.some((call) => call.name === "runV2GenerationJob"), false);
});
```

- [ ] **Step 2: Update source extraction failure builder**

In `buildSourceExtractionFailureResult` inside `backend/src/v2/generation/v2GenerationJobRunner.js`, ensure:

- `error.code === "failed_extract_video"` maps `displayStatusText` to `"视频内容提取失败"`.
- `error.retryable === true` allows queue retry when attempts remain.
- `generationMeta.failureCode` includes `failed_extract_video`.
- `generationMeta.mediaErrorType` includes `error.mediaErrorType` when present.

Use this display mapping:

```js
function sourceExtractionDisplayText(error) {
  if (error?.code === "failed_extract_video") return "视频内容提取失败";
  return "原文提取失败";
}
```

- [ ] **Step 3: Update progress failure copy**

In `backend/src/v2/generation/generationProgress.js`, update `userFacingFailureText`:

```js
if (value.includes("视频") || value.includes("failed_extract_video")) return "视频提取失败";
```

Expected visible status stays short while failure detail stores the full reason.

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test backend/src/v2/generation/v2GenerationJobRunner.test.js backend/src/v2/generation/generationProgress.test.js
npm --prefix backend run check:v2
```

Expected:

- Video failures do not call the model.
- Retryable provider failures requeue only when configured attempts remain.

Commit:

```bash
git add backend/src/v2/generation/v2GenerationJobRunner.js backend/src/v2/generation/v2GenerationJobRunner.test.js \
  backend/src/v2/generation/generationProgress.js backend/src/v2/generation/generationFailures.js backend/src/v2/generation/generationFailures.test.js
git commit -m "feat: map video extraction failures in v2 queue"
```

## Task 11: Cost And Extraction Metrics

**Files:**

- Create: `backend/src/media/mediaCost.js`
- Create: `backend/src/media/mediaCost.test.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`

- [ ] **Step 1: Write media cost tests**

Create `backend/src/media/mediaCost.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { createMediaUsageRecorder, summarizeMediaUsage } from "./mediaCost.js";

test("records media extraction usage by stage", () => {
  const recorder = createMediaUsageRecorder({ runId: "run-1" });
  recorder.record({ stage: "tikhub_fetch", provider: "tikhub", cost: 0.002, currency: "USD" });
  recorder.record({ stage: "openai_transcription", provider: "openai", cost: 0.006, currency: "USD" });

  const summary = summarizeMediaUsage(recorder.calls);
  assert.equal(summary.callCount, 2);
  assert.equal(summary.totalsByCurrency.USD.totalCost, 0.008);
  assert.equal(summary.byStage.openai_transcription.callCount, 1);
});
```

- [ ] **Step 2: Implement media usage recorder**

Create `backend/src/media/mediaCost.js`:

```js
export function createMediaUsageRecorder({ runId, calls = [] } = {}) {
  return {
    calls,
    record(call) {
      const record = {
        runId,
        stage: String(call.stage || "unknown"),
        provider: String(call.provider || ""),
        cost: roundCost(call.cost),
        currency: String(call.currency || "USD"),
        metadata: call.metadata || {},
        recordedAt: new Date().toISOString()
      };
      calls.push(record);
      return record;
    }
  };
}

export function summarizeMediaUsage(calls = []) {
  const byStage = {};
  const totalsByCurrency = {};
  for (const call of calls) {
    byStage[call.stage] ||= { callCount: 0, totalCost: 0 };
    byStage[call.stage].callCount += 1;
    byStage[call.stage].totalCost = roundCost(byStage[call.stage].totalCost + Number(call.cost || 0));
    totalsByCurrency[call.currency] ||= { currency: call.currency, callCount: 0, totalCost: 0 };
    totalsByCurrency[call.currency].callCount += 1;
    totalsByCurrency[call.currency].totalCost = roundCost(totalsByCurrency[call.currency].totalCost + Number(call.cost || 0));
  }
  return { callCount: calls.length, byStage, totalsByCurrency };
}

function roundCost(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1_000_000) / 1_000_000 : 0;
}
```

- [ ] **Step 3: Attach media extraction summary to generation metadata**

Pass `mediaUsageRecorder` through `extractVideoLearningSource` and `extractSourceContent`.

Persist in `resolvedInput.source.mediaUsage` and `generationMeta.mediaUsage`:

```js
generationMeta: {
  ...(existing.generationMeta || {}),
  mediaUsage: source.mediaUsage || existing.generationMeta?.mediaUsage || null
}
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
node --test backend/src/media/mediaCost.test.js backend/src/v2/generation/v2GenerationJobRunner.test.js
npm --prefix backend run check:v2
```

Expected:

- Media cost tests pass.
- Existing model cost tests are unaffected.

Commit:

```bash
git add backend/src/media/mediaCost.js backend/src/media/mediaCost.test.js \
  backend/src/media/extractVideoLearningSource.js backend/src/v2/generation/v2GenerationJobRunner.js backend/package.json
git commit -m "feat: record video extraction media usage"
```

## Task 12: Real-Link Benchmark Script

**Files:**

- Create: `backend/scripts/benchmark-video-learning-source.mjs`
- Modify: `backend/package.json`
- Update: `docs/media-learning-source-architecture-zh.md`

- [ ] **Step 1: Create benchmark script**

Create `backend/scripts/benchmark-video-learning-source.mjs`:

```js
#!/usr/bin/env node
import "../src/env.js";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { extractVideoLearningSource } from "../src/media/extractVideoLearningSource.js";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || resolve(process.cwd(), "../quality-test-set/results/video-learning-source/benchmark.json");

if (!inputPath) {
  console.error("Usage: node backend/scripts/benchmark-video-learning-source.mjs <links.json> [output.json]");
  process.exit(1);
}

const links = JSON.parse(await readFile(inputPath, "utf8"));
const results = [];

for (const [index, item] of links.entries()) {
  const sourceUrl = typeof item === "string" ? item : item.url;
  const startedAt = new Date().toISOString();
  try {
    const source = await extractVideoLearningSource({ sourceUrl });
    results.push({
      index,
      sourceUrl,
      status: "succeeded",
      platform: source.platform,
      title: source.title,
      normalizedTextLength: source.normalizedText.length,
      sectionCount: source.sourceSections.length,
      startedAt,
      finishedAt: new Date().toISOString()
    });
  } catch (error) {
    results.push({
      index,
      sourceUrl,
      status: "failed",
      code: error.code || "unknown",
      mediaErrorType: error.mediaErrorType || "",
      message: error.message,
      retryable: Boolean(error.retryable),
      startedAt,
      finishedAt: new Date().toISOString()
    });
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  inputPath,
  total: results.length,
  succeeded: results.filter((result) => result.status === "succeeded").length,
  failed: results.filter((result) => result.status === "failed").length,
  results
}, null, 2));

console.log(`Wrote ${outputPath}`);
```

- [ ] **Step 2: Add package script**

In `backend/package.json`, add:

```json
"benchmark:video-source": "node scripts/benchmark-video-learning-source.mjs"
```

- [ ] **Step 3: Document real-link benchmark input shape**

Update `docs/media-learning-source-architecture-zh.md` with:

```json
[
  { "url": "https://v.douyin.com/<share-token>/" },
  { "url": "https://www.xiaohongshu.com/explore/<note-id>" }
]
```

Run command:

```bash
npm --prefix backend run benchmark:video-source -- ../quality-test-set/samples/video-links.json
```

- [ ] **Step 4: Run syntax check and commit**

Run:

```bash
node --check backend/scripts/benchmark-video-learning-source.mjs
npm --prefix backend run check:v2
```

Expected:

- Script passes syntax checks.

Commit:

```bash
git add backend/scripts/benchmark-video-learning-source.mjs backend/package.json docs/media-learning-source-architecture-zh.md
git commit -m "chore: add video learning source benchmark script"
```

## Task 12.5: Model Candidate Evaluation Harness

**Files:**

- Create: `backend/scripts/benchmark-video-model-candidates.mjs`
- Create: `quality-test-set/samples/video-model-candidates.example.json`
- Update: `docs/media-learning-source-architecture-zh.md`
- Modify: `backend/package.json`

- [ ] **Step 1: Define candidate config shape**

Create `quality-test-set/samples/video-model-candidates.example.json`:

```json
{
  "sources": [
    {
      "id": "douyin-mouth-001",
      "platform": "douyin",
      "url": "https://v.douyin.com/<share-token>/",
      "contentType": "口播教程"
    },
    {
      "id": "xhs-ppt-001",
      "platform": "xiaohongshu",
      "url": "https://www.xiaohongshu.com/explore/<note-id>",
      "contentType": "PPT讲解"
    }
  ],
  "asrCandidates": [
    { "id": "openai-transcription", "provider": "openai", "enabled": true },
    { "id": "aliyun-funasr", "provider": "aliyun", "enabled": false },
    { "id": "volcengine-asr", "provider": "volcengine", "enabled": false }
  ],
  "visualCandidates": [
    { "id": "none", "provider": "none", "enabled": true },
    { "id": "qwen-vl", "provider": "dashscope", "enabled": false },
    { "id": "gemini-video", "provider": "gemini", "enabled": false }
  ],
  "generationCandidates": [
    { "id": "current-default", "provider": "current", "enabled": true },
    { "id": "qwen-json", "provider": "qwen", "enabled": false },
    { "id": "gemini-json", "provider": "gemini", "enabled": false },
    { "id": "deepseek-json", "provider": "deepseek", "enabled": false }
  ]
}
```

This file is a public shape example only. Do not commit real private links unless they are approved test fixtures.

- [ ] **Step 2: Create evaluation script skeleton**

Create `backend/scripts/benchmark-video-model-candidates.mjs`:

```js
#!/usr/bin/env node
import "../src/env.js";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const configPath = process.argv[2];
const outputPath = process.argv[3] || resolve(process.cwd(), "../quality-test-set/results/video-learning-source/model-candidates.json");

if (!configPath) {
  console.error("Usage: node backend/scripts/benchmark-video-model-candidates.mjs <candidates.json> [output.json]");
  process.exit(1);
}

const config = JSON.parse(await readFile(configPath, "utf8"));
const rows = [];

for (const source of config.sources || []) {
  for (const asr of enabled(config.asrCandidates)) {
    for (const visual of enabled(config.visualCandidates)) {
      for (const generation of enabled(config.generationCandidates)) {
        rows.push({
          sourceId: source.id,
          platform: source.platform,
          contentType: source.contentType || "",
          asrCandidate: asr.id,
          visualCandidate: visual.id,
          generationCandidate: generation.id,
          status: "planned",
          metrics: {
            sourceFetchSucceeded: null,
            asrSucceeded: null,
            visualSucceeded: null,
            generationSucceeded: null,
            normalizedTextLength: null,
            questionCount: null,
            sourceSupportRate: null,
            severeIssueRate: null,
            estimatedCost: null,
            durationMs: null
          }
        });
      }
    }
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  configPath,
  rowCount: rows.length,
  rows
}, null, 2));

console.log(`Wrote ${outputPath}`);

function enabled(items = []) {
  return items.filter((item) => item.enabled !== false);
}
```

The first version intentionally writes a comparison matrix without invoking all providers. After provider adapters exist, extend each row to run the selected `SpeechToTextProvider`, `VideoUnderstandingProvider`, and `ModelJsonClient`.

- [ ] **Step 3: Add package script**

In `backend/package.json`, add:

```json
"benchmark:video-models": "node scripts/benchmark-video-model-candidates.mjs"
```

- [ ] **Step 4: Document evaluation criteria**

Update `docs/media-learning-source-architecture-zh.md` to keep these acceptance metrics aligned:

```text
ASR candidate metrics:
- transcript character error rate on reviewed snippets
- timestamp availability
- speech/no-speech failure accuracy
- cost per video minute

Visual candidate metrics:
- OCR useful text rate
- visual summary usefulness
- hallucinated visual detail rate
- cost per sampled frame or video minute

Generation candidate metrics:
- JSON contract pass rate
- source support rate
- severe issue rate
- cost per generated chapter
- latency and retry rate
```

- [ ] **Step 5: Run syntax check and commit**

Run:

```bash
node --check backend/scripts/benchmark-video-model-candidates.mjs
npm --prefix backend run benchmark:video-models -- ../quality-test-set/samples/video-model-candidates.example.json
```

Expected:

- Script writes `quality-test-set/results/video-learning-source/model-candidates.json`.
- Rows cover every enabled ASR x visual x generation candidate combination.

Commit:

```bash
git add backend/scripts/benchmark-video-model-candidates.mjs \
  quality-test-set/samples/video-model-candidates.example.json \
  backend/package.json docs/media-learning-source-architecture-zh.md
git commit -m "chore: add video model candidate benchmark matrix"
```

## Task 13: Backend Acceptance Gate

**Files:**

- Read all changed files.
- No new files required.

- [ ] **Step 1: Run targeted backend tests**

Run:

```bash
node --test \
  backend/src/media/videoPlatforms.test.js \
  backend/src/media/mediaErrors.test.js \
  backend/src/media/learningSource.test.js \
  backend/src/media/tikhubVideoProvider.test.js \
  backend/src/media/mediaFiles.test.js \
  backend/src/media/ffmpegAudio.test.js \
  backend/src/media/openAITranscriptionProvider.test.js \
  backend/src/media/extractVideoLearningSource.test.js \
  backend/src/sources/extractSourceContent.video.test.js \
  backend/src/v2/generation/generationProgress.test.js \
  backend/src/v2/generation/v2GenerationJobRunner.test.js \
  backend/src/v2/contracts/reviewPathContract.test.js \
  backend/src/v2/serializers/reviewPathClientSerializer.test.js
```

Expected:

- All targeted backend video and V2 tests pass.

- [ ] **Step 2: Run full backend check**

Run:

```bash
npm --prefix backend run check
```

Expected:

- Full backend check passes.

- [ ] **Step 3: Run a real-link smoke in test environment**

With env configured:

```bash
TIKHUB_API_KEY=<set-in-backend-env> \
OPENAI_API_KEY=<set-in-backend-env> \
FFMPEG_PATH=ffmpeg \
npm --prefix backend run benchmark:video-source -- ../quality-test-set/samples/video-links.json
```

Expected:

- At least one Douyin and one Xiaohongshu public link produce `status: "succeeded"`.
- Failures have `mediaErrorType` and user-safe `message`.
- No raw video file remains in `/tmp/shibei-video-*` after completion.

- [ ] **Step 4: Manual queue smoke**

Submit a V2 chapter in the test backend using a public video link:

```bash
curl -X POST "$SHIBEI_TEST_BACKEND_URL/api/v2/chapters" \
  -H "content-type: application/json" \
  -H "x-device-id: video-plan-test-device" \
  -d '{
    "clientRequestId": "video-smoke-001",
    "sourceType": "video_link",
    "sourceUrl": "https://v.douyin.com/example/",
    "sourceTitle": "抖音视频"
  }'
```

Expected:

- Response status is `submitted` or `completed`.
- Chapter source type remains `video_link`.
- Generation progress moves through source extraction and V2 generation stages.
- Final chapter has V2 units when extraction and generation succeed.

- [ ] **Step 5: Final commit**

If the acceptance gate required any fixes:

```bash
git status --short
git add backend docs
git commit -m "test: validate video learning source backend flow"
```

Expected:

- All backend video work is committed in small, reviewable commits.

## Rollout Criteria

Backend is ready for frontend integration when all are true:

- Full `npm --prefix backend run check` passes.
- Mock tests cover provider success, provider permanent failure, provider retryable failure, ASR failure, short content failure, and V2 queue integration.
- Real-link benchmark has results for at least 20 Douyin and 20 Xiaohongshu public videos.
- The benchmark report includes source fetch success rate, media fetch success rate, ASR success rate, final V2 generation success rate, failure reason distribution, and average processing time.
- No raw video media is persisted after extraction.
- Video extraction failure never calls the V2 model.
- Video extraction success stores a V2-compatible source with `type: "video_link"`, original URL, platform, account, cleaned text, and source blocks.

## Risks To Watch During Implementation

- TikHub response shapes may differ by endpoint or platform version. Keep normalization defensive and covered by captured fixture tests once real responses are available.
- TikHub media URLs may expire. The provider result should be used immediately and never shown to users as the original link.
- OpenAI transcription endpoint may not return segment timestamps for every model/format. If segments are missing, create one transcript section from the full text.
- ffmpeg may not exist in Railway/test runtime. Add `FFMPEG_PATH` and production preflight before enabling video links publicly.
- V2 source contract requires non-empty blocks. Short/no-speech videos must fail before generation rather than creating empty source blocks.
- Raw media cleanup must run in `finally` paths for provider success followed by downstream failure.
