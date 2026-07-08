# Video Visual Fallback Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make visual understanding an optional enhancement: ASR-based video generation should continue when the visual model fails, while backend diagnostics and user-facing status remain separate.

**Architecture:** Keep `extractVideoLearningSource` as the media orchestration boundary. Wrap `understandVisuals()` in a safe fallback that converts visual provider failures into diagnostic metadata and empty visual segments. Store detailed backend diagnostics under `learningSource.extractionMeta.visualUnderstanding`, and expose only an abstract `learningSource.extractionMeta.userVisibleContentBasis` / V2 source `contentBasis` for clients.

**Tech Stack:** Node.js ESM, `node:test`, existing media extraction and V2 source adapter modules.

---

### Task 1: Add Failing Tests for Visual Fallback and Status Separation

**Files:**
- Modify: `backend/src/media/extractVideoLearningSource.test.js`
- Modify: `backend/src/media/learningSource.test.js`

- [x] **Step 1: Test visual failure fallback**

Add a test where ASR succeeds but `understandVisuals` throws `no_json_object`. Assert:

- `extractVideoLearningSource()` resolves instead of rejecting.
- `learningSource.visualSegments.length === 0`.
- `learningSource.extractionMeta.visualUnderstanding.status === "failed"`.
- `learningSource.extractionMeta.visualUnderstanding.failureCode === "visual_output_parse_failed"`.
- `learningSource.extractionMeta.userVisibleContentBasis.basis === "audio_transcript"`.
- media usage records include `visual_understanding` with `metadata.status === "failed"`.

- [x] **Step 2: Test V2 source carries only user-facing basis**

Build a V2 source from a LearningSource with `userVisibleContentBasis`. Assert:

- `source.contentBasis.basis === "audio_transcript"`.
- `source.contentBasis.message === "本次主要基于视频字幕生成"`.
- no raw provider parse error is exposed on `source.contentBasis`.

### Task 2: Implement Safe Visual Fallback

**Files:**
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Modify: `backend/src/media/learningSource.js`

- [x] **Step 1: Add a safe visual wrapper**

In `extractVideoLearningSource.js`, replace the direct `await understandVisuals(...)` call with a helper that:

- returns the normalized visual result when the provider succeeds;
- catches visual errors and returns `{ status: "failed", skipped: true, segments: [], diagnostics: ... }`;
- maps `no_json_object` and parse failures to `visual_output_parse_failed`;
- maps configured provider errors to their existing `error.code`;
- does not catch frame extraction or ASR errors.

- [x] **Step 2: Record backend diagnostics and user-visible content basis**

Attach to `learningSource.extractionMeta`:

```js
visualUnderstanding: {
  status: "succeeded" | "skipped" | "failed",
  provider,
  model,
  segmentCount,
  failureCode,
  retryable
}
userVisibleContentBasis: {
  basis: "audio_visual" | "audio_transcript",
  message: "已结合视频字幕和画面信息生成" | "本次主要基于视频字幕生成"
}
```

The user-visible object must not include provider names, error codes, raw messages, or model names.

- [x] **Step 3: Pass user-visible basis to V2 source**

In `buildV2SourceFromLearningSource`, copy `learningSource.extractionMeta.userVisibleContentBasis` to `source.contentBasis`.

### Task 3: Verify and Commit

**Files:**
- Test: `backend/src/media/extractVideoLearningSource.test.js`
- Test: `backend/src/media/learningSource.test.js`

- [x] **Step 1: Run focused tests**

```bash
cd backend
node --test src/media/extractVideoLearningSource.test.js src/media/learningSource.test.js
```

Expected: all focused tests pass.

- [x] **Step 2: Run video source check**

```bash
cd backend
npm run check:video-source
```

Expected: all video source checks pass.

- [x] **Step 3: Commit**

```bash
git add backend/src/media/extractVideoLearningSource.js backend/src/media/extractVideoLearningSource.test.js backend/src/media/learningSource.js backend/src/media/learningSource.test.js backend/src/v2/serializers/reviewPathClientSerializer.js backend/src/v2/serializers/reviewPathClientSerializer.test.js docs/media-learning-source-architecture-zh.md docs/superpowers/plans/2026-07-08-video-visual-fallback-status.md
git commit -m "feat: degrade video visual understanding failures"
```

### Self-Review

- Scope is limited to visual enhancement fallback and status separation.
- ASR, TikHub, media download, and frame extraction errors keep their existing behavior.
- Internal diagnostics remain detailed; user-facing content basis stays abstract and product-safe.
