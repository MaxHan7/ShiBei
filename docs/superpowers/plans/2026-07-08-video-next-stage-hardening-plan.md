# Video Link Next Stage Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the video link pipeline safer for production-like testing by fixing cache correctness, stale media retries, cost accounting, resource limits, diagnostics, and provider evaluation coverage.

**Architecture:** Keep ASR transcript as the reliable main path and visual understanding as an optional enhancement. Harden the media extraction boundary without binding the question-generation system to any specific ASR, OCR, or multimodal provider. Treat TikHub, ASR, frame extraction, OCR, and VLM providers as replaceable adapters with observable cost and quality signals.

**Tech Stack:** Node.js 20 ESM, `node:test`, existing media adapters, TikHub provider, ffmpeg/ffprobe, optional local Whisper/Faster-Whisper, Qwen ASR/OCR/VL candidates, PaddleOCR candidate, DeepSeek text generation, V2 generation quality reports.

---

## Current Review Summary

The current implementation is suitable for continued feature-environment testing, but not yet production-ready.

The strongest design decision is already in place: ASR text is the stable main chain, and visual understanding is an enhancement that can fail without blocking chapter generation. Backend diagnostics and user-visible content basis are also separated.

The next risks are mostly operational:

- Complete `LearningSource` cache can preserve a transcript-only result after visual failure.
- TikHub source cache can preserve an expired media URL.
- Qwen visual usage fields may be dropped, making visual cost reports incomplete.
- Video download loads the whole media file into memory before enforcing the size limit.
- Frame-pack failure diagnostics are currently too thin for production debugging.
- Real sample coverage is still too small.
- Real Bilibili testing showed process-local cache is not enough for repeated quality runs: restarting the runner repeated media download, ASR, frame extraction, and Qwen visual understanding for the same link and extraction settings.
- Real Bilibili testing also exposed invalid matching drafts: a model can still return 1 pair or 5 pairs even though the V2 contract allows only 2-4. This should be handled as a recoverable question-draft issue when the unit still has other valid questions.

## Provider Stability Notes

There is no single universal "best" OCR/ASR/video understanding stack. Mature products usually use a staged chain:

1. Source acquisition.
2. ASR or platform subtitles for the primary transcript.
3. OCR on sampled frames when screen text matters.
4. Multimodal model summaries for visual context.
5. A normalized, timestamped source object consumed by downstream generation.

For this product, the most stable first-release stance remains:

- ASR/subtitles as main evidence.
- OCR and visual summaries as evidence enrichers.
- Do not let OCR/VLM failures block generation.
- Keep provider choice behind adapters.
- Evaluate providers on real Douyin/Xiaohongshu samples before switching defaults.

## Task 1: Cache Signature and Visual Failure Cache Policy

**Files:**
- Modify: `backend/src/media/videoExtractionCache.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Test: `backend/src/media/videoExtractionCache.test.js`
- Test: `backend/src/media/extractVideoLearningSource.test.js`

- [x] **Step 1: Add cache signature input**

Add a helper that builds a stable extraction signature from provider configuration:

```js
export function buildVideoExtractionSignature({
  asrProvider = "",
  frameProvider = "",
  visualProvider = "",
  visualModel = "",
  version = VIDEO_LEARNING_SOURCE_CACHE_VERSION
} = {}) {
  return [
    version,
    `asr:${String(asrProvider || "default")}`,
    `frame:${String(frameProvider || "none")}`,
    `visual:${String(visualProvider || "none")}`,
    `visualModel:${String(visualModel || "none")}`
  ].join("|");
}
```

- [x] **Step 2: Use the signature in `buildVideoLearningSourceCacheKey`**

Change the cache key to include the signature value so switching visual model/provider does not reuse stale results.

- [x] **Step 3: Avoid long-lived full-cache writes for retryable visual failures**

In `extractVideoLearningSource`, when `learningSource.extractionMeta.visualUnderstanding.status === "failed"` and `retryable === true`, either skip the full `LearningSource` cache write or write it with a short TTL cache option if the cache implementation supports TTL override.

- [x] **Step 4: Add tests**

Cover:

- Same URL + different visual model gives different learning-source cache keys.
- Retryable visual failure still returns transcript-only source but does not poison the long-lived full cache.
- Non-visual transcript-only provider disabled state can still cache normally.

- [x] **Step 5: Run and commit**

Run:

```bash
cd backend && node --test src/media/videoExtractionCache.test.js src/media/extractVideoLearningSource.test.js
cd backend && npm run check:video-source
```

Commit:

```bash
git add backend/src/media/videoExtractionCache.js backend/src/media/extractVideoLearningSource.js backend/src/media/videoExtractionCache.test.js backend/src/media/extractVideoLearningSource.test.js
git commit -m "fix: prevent stale video learning source cache reuse"
```

## Task 2: Stale TikHub Media URL Retry

**Files:**
- Modify: `backend/src/media/videoExtractionCache.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Test: `backend/src/media/extractVideoLearningSource.test.js`

- [x] **Step 1: Add optional cache delete support**

Extend the cache interface with a `delete(key)` method for the in-memory implementation.

- [x] **Step 2: Retry source fetch once after cached media download failure**

When video source came from cache and `downloadMedia` fails with a retryable `video_media_unavailable` or `video_media_timeout`, delete the video source cache entry, call TikHub once again, then retry download once.

- [x] **Step 3: Add media usage records**

Record a metadata flag such as:

```js
{
  staleVideoSourceCache: true,
  refetchedProviderSource: true
}
```

- [x] **Step 4: Add tests**

Cover:

- Cached media URL download fails.
- Provider is called once to refresh.
- Second media URL downloads successfully.
- Provider is not retried repeatedly after the one refresh attempt.

- [x] **Step 5: Run and commit**

```bash
cd backend && node --test src/media/extractVideoLearningSource.test.js src/media/videoExtractionCache.test.js
cd backend && npm run check:video-source
git add backend/src/media/videoExtractionCache.js backend/src/media/extractVideoLearningSource.js backend/src/media/extractVideoLearningSource.test.js backend/src/media/videoExtractionCache.test.js
git commit -m "fix: refresh stale video media source cache"
```

## Task 3: Visual Usage and Cost Accounting

**Files:**
- Modify: `backend/src/media/visualUnderstandingProvider.js`
- Modify: `backend/src/media/qwenVlVisualUnderstandingProvider.js`
- Modify: `backend/src/media/mediaCost.js`
- Test: `backend/src/media/qwenVlVisualUnderstandingProvider.test.js`
- Test: `backend/src/media/mediaCost.test.js`

- [x] **Step 1: Preserve Qwen-style usage fields**

Normalize both forms:

```js
{
  input_tokens,
  output_tokens,
  total_tokens,
  prompt_tokens,
  completion_tokens
}
```

Map `input_tokens` to `prompt_tokens` and `output_tokens` to `completion_tokens` when the OpenAI-compatible fields are absent.

- [x] **Step 2: Add visual model pricing placeholder config**

Keep pricing optional. Do not hard-code a production price unless verified. The report should still show token counts when price is unknown.

- [x] **Step 3: Add tests**

Cover Qwen payload:

```js
usage: { input_tokens: 100, output_tokens: 20, total_tokens: 120 }
```

Expected normalized usage:

```js
{
  prompt_tokens: 100,
  completion_tokens: 20,
  total_tokens: 120,
  input_tokens: 100,
  output_tokens: 20
}
```

- [x] **Step 4: Run and commit**

```bash
cd backend && node --test src/media/qwenVlVisualUnderstandingProvider.test.js src/media/mediaCost.test.js
cd backend && npm run check:video-source
git add backend/src/media/visualUnderstandingProvider.js backend/src/media/qwenVlVisualUnderstandingProvider.js backend/src/media/mediaCost.js backend/src/media/qwenVlVisualUnderstandingProvider.test.js backend/src/media/mediaCost.test.js
git commit -m "fix: preserve visual model usage metrics"
```

## Task 4: Download Resource Guard

**Files:**
- Modify: `backend/src/media/mediaFiles.js`
- Test: `backend/src/media/mediaFiles.test.js`

- [x] **Step 1: Reject known oversized files before reading body**

Read `content-length`. If it is greater than `maxBytes`, throw `video_media_too_large` before `response.arrayBuffer()`.

- [x] **Step 2: Add streaming download follow-up note**

If the codebase is still using `arrayBuffer`, document that streaming download is the next hardening step for higher concurrency.

- [x] **Step 3: Add tests**

Cover:

- `content-length` over limit rejects before reading body.
- Missing `content-length` still falls back to post-read size check.
- Timeout behavior remains unchanged.

- [x] **Step 4: Run and commit**

```bash
cd backend && node --test src/media/mediaFiles.test.js
cd backend && npm run check:video-source
git add backend/src/media/mediaFiles.js backend/src/media/mediaFiles.test.js
git commit -m "fix: reject oversized video downloads early"
```

## Task 5: Frame Pack Diagnostics

**Files:**
- Modify: `backend/src/media/crvStyleFramePackProvider.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Test: `backend/src/media/crvStyleFramePackProvider.test.js`
- Test: `backend/src/media/extractVideoLearningSource.test.js`

- [x] **Step 1: Return structured frame failure diagnostics**

Include fields:

```js
debug: {
  failureCode: "video_frame_pack_failed",
  failureMessage: "...",
  retryable: true
}
```

- [x] **Step 2: Preserve diagnostics in media usage**

Add `failureCode`, `retryable`, and a short redacted `failureMessage` to the `video_frame_pack` media usage metadata.

- [x] **Step 3: Add tests**

Cover ffmpeg failure becoming skipped frame pack with structured diagnostics, without exposing this in user-visible content basis.

- [x] **Step 4: Run and commit**

```bash
cd backend && node --test src/media/crvStyleFramePackProvider.test.js src/media/extractVideoLearningSource.test.js
cd backend && npm run check:video-source
git add backend/src/media/crvStyleFramePackProvider.js backend/src/media/extractVideoLearningSource.js backend/src/media/crvStyleFramePackProvider.test.js backend/src/media/extractVideoLearningSource.test.js
git commit -m "chore: record video frame pack diagnostics"
```

## Task 6: Provider Evaluation Matrix

**Files:**
- Create: `docs/quality-runs/video-link/provider-evaluation/README.md`
- Create: `docs/quality-runs/video-link/provider-evaluation/provider-matrix-2026-07.md`
- Modify: `docs/media-learning-source-architecture-zh.md`

- [x] **Step 1: Define sample set**

Use at least five real samples:

- Douyin knowledge explainer with mostly speech.
- Douyin screen-recording/tutorial with visible UI text.
- Xiaohongshu design/knowledge video with subtitles.
- Xiaohongshu video without usable platform subtitles.
- Low-information or entertainment-like video expected to fail content threshold.

- [x] **Step 2: Define provider dimensions**

Evaluate:

- TikHub source success.
- Platform subtitle availability.
- ASR transcript quality.
- OCR/screen text usefulness.
- Visual summary usefulness.
- Generated unit count.
- Qualified question count.
- Model/TikHub cost.
- Whether user-visible original source is readable.

- [x] **Step 3: Define candidate providers**

Initial candidates:

- Current local/Faster-Whisper path or configured ASR path.
- Qwen ASR candidate.
- Qwen OCR candidate on sampled frames.
- PaddleOCR candidate on sampled frames.
- Qwen VL current visual summary.
- Optional Gemini video understanding as a benchmark, not first production default.

- [x] **Step 4: Update architecture doc**

Record that ASR/OCR/VLM are replaceable provider families and should be chosen by real sample metrics, not by one-off demo success.

- [x] **Step 5: Commit**

```bash
git add docs/quality-runs/video-link/provider-evaluation/README.md docs/quality-runs/video-link/provider-evaluation/provider-matrix-2026-07.md docs/media-learning-source-architecture-zh.md
git commit -m "docs: plan video provider evaluation matrix"
```

## Task 7: Real Sample Regression Runs

**Files:**
- Write outputs under: `docs/quality-runs/video-link/<sample>/`
- Update: `docs/quality-runs/video-link/provider-evaluation/provider-matrix-2026-07.md`

- [ ] **Step 1: Run no-visual baseline for all samples**

Goal: establish the stable ASR/subtitle baseline and question quality.

- [ ] **Step 2: Run visual-enhanced candidates for samples where screen text matters**

Goal: measure whether visual actually improves generated questions, not just whether the model returns text.

- [ ] **Step 3: Compare cost**

Record:

- TikHub call count.
- ASR cost.
- OCR/VLM token usage.
- Total model cost.
- Total extraction cost.

- [ ] **Step 4: Decide defaults**

Default should stay no-visual or light visual unless visual-enhanced runs clearly improve source coverage and question quality.

- [ ] **Step 5: Commit results**

## Task 8: Persistent Quality-Run Video Cache

**Files:**
- Modify: `backend/src/media/videoExtractionCache.js`
- Modify: `backend/src/media/videoExtractionCache.test.js`
- Modify: `backend/scripts/run-video-v2-quality-experiment.mjs`

- [x] **Step 1: Add file-backed TTL cache**

Add `createFileTtlCache({ dir, ttlMs, maxEntries })` with the same `get`, `set`, `delete`, `size`, and `clear` methods as the in-memory cache.

- [x] **Step 2: Persist quality-run source and learning-source caches**

Use `QUALITY_VIDEO_CACHE_DIR` when provided; otherwise default to `<quality-output-root>/.cache`. Pass file caches into `extractVideoLearningSource()` from the quality runner.

- [x] **Step 3: Expose cache metadata in reports**

Add `learningSourceSummary.cache` so report JSON can show whether the media extraction result came from cache.

- [x] **Step 4: Add tests**

Cover file cache persistence across cache instances, TTL expiry, and max-entry pruning.

- [x] **Step 5: Run and commit**

```bash
cd backend && node --test src/media/videoExtractionCache.test.js
cd backend && npm run check:video-source
git add backend/src/media/videoExtractionCache.js backend/src/media/videoExtractionCache.test.js backend/scripts/run-video-v2-quality-experiment.mjs docs/superpowers/plans/2026-07-08-video-next-stage-hardening-plan.md
git commit -m "fix: persist video quality run cache"
```

## Task 9: Matching Draft Resilience

**Files:**
- Modify: `backend/src/v2/generation/pipeline/v2GenerationProgram.js`
- Modify: `backend/src/v2/generation/pipeline/v2GenerationProgram.test.js`

- [x] **Step 1: Add recoverable matching fallback**

When `matchingDraft` fails only because item/pair counts are outside the 2-4 contract, drop the invalid matching question if the same unit has multiple-choice questions.

- [x] **Step 2: Keep serious structural failures blocking**

Do not swallow wrong ids, wrong source anchors, missing question arrays, or units that would be left with no questions.

- [x] **Step 3: Add tests**

Cover a single-pair matching draft being dropped while the unit remains valid through multiple-choice questions.

- [x] **Step 4: Run and commit**

```bash
cd backend && node --test src/v2/generation/pipeline/v2GenerationProgram.test.js
cd backend && npm run check:v2
git add backend/src/v2/generation/pipeline/v2GenerationProgram.js backend/src/v2/generation/pipeline/v2GenerationProgram.test.js
git commit -m "fix: tolerate invalid matching drafts with fallback questions"
```

Commit only compact JSON summaries, matrix docs, and selected HTML reports. Do not commit raw video files or temp frames.

## Self-Review

- This plan covers all P1/P2 issues from the latest code review.
- It separates production hardening from provider evaluation.
- It does not bind V2 question generation to Qwen, Gemini, PaddleOCR, Whisper, or TikHub.
- It keeps visual/OCR enhancements non-blocking.
- It requires checkpoint commits after each independently testable change.
