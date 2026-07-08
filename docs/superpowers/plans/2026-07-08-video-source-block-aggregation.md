# Video Source Block Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make video "view source" pages readable by grouping short ASR subtitle segments into stable, timestamped transcript blocks before they enter the V2 source block contract.

**Architecture:** Keep raw `transcriptSegments` unchanged for auditability. Change only the `LearningSource.sourceSections` adapter so video transcript sections are deterministic 15-30 second / 120-260 character chunks with `startSeconds`, `endSeconds`, and source role preserved. V2 generation, source anchors, and client serializers continue to consume ordinary source blocks.

**Tech Stack:** Node.js ESM, `node:test`, existing `backend/src/media/learningSource.js` media adapter.

---

### Task 1: Document and Test the Desired Chunking Behavior

**Files:**
- Modify: `backend/src/media/learningSource.test.js`

- [x] **Step 1: Add a test proving consecutive subtitles become readable transcript blocks**

Add a test that builds a video LearningSource from 8-10 short ASR segments. Assert that:

- `transcriptSegments` still contains every original segment.
- `sourceSections` contains fewer transcript sections than raw segments.
- The first transcript section keeps the first segment start time and last included end time.
- The transcript text is joined into one readable paragraph.

- [x] **Step 2: Run the focused test**

Run:

```bash
cd backend
node --test src/media/learningSource.test.js
```

Expected: the new test fails before implementation because every transcript segment is still one source section.

### Task 2: Implement Deterministic Transcript Aggregation

**Files:**
- Modify: `backend/src/media/learningSource.js`
- Modify: `backend/src/media/videoExtractionCache.js`

- [x] **Step 1: Replace one-segment-one-section transcript mapping**

Change `transcriptToSections(segments)` so it accumulates adjacent subtitle segments into transcript blocks.

Rules:

- Target window: keep a block open until about 24 seconds or 220 characters.
- Hard maximum: close a block at 32 seconds or 280 characters.
- Close early on long pauses of 2.5 seconds or more.
- Prefer closing after topic-transition phrases such as `先说`, `再说`, `第三`, `最后`, `总结`, `一句话`.
- Preserve `sourceRole: "audio_transcript"`, `startSeconds`, and `endSeconds`.
- Include `segmentIds` for future precise timestamp lookup, but do not require clients to read it.

- [x] **Step 2: Keep V2 source blocks backward-compatible**

Update `buildV2SourceFromLearningSource` to pass through `segmentIds` only when present. Existing clients can ignore it; existing `id/type/text/sourceRole/startSeconds/endSeconds` remain unchanged.

- [x] **Step 3: Bump the LearningSource cache version**

Update `VIDEO_LEARNING_SOURCE_CACHE_VERSION` from `video-learning-source-v1` to `video-learning-source-v2` so old cached one-subtitle-per-block sources are not reused after deployment.

### Task 3: Verify and Commit

**Files:**
- Test: `backend/src/media/learningSource.test.js`
- Test: `backend/src/sources/extractSourceContent.video.test.js`
- Test: `backend/src/v2/generation/v2GenerationJobRunner.test.js`

- [x] **Step 1: Run focused media tests**

```bash
cd backend
node --test src/media/learningSource.test.js src/sources/extractSourceContent.video.test.js src/v2/generation/v2GenerationJobRunner.test.js
```

Expected: all tests pass.

- [x] **Step 2: Run the video source check**

```bash
cd backend
npm run check:video-source
```

Expected: all video source checks pass.

- [x] **Step 3: Commit implementation**

```bash
git add backend/src/media/learningSource.js backend/src/media/learningSource.test.js backend/src/media/videoExtractionCache.js docs/superpowers/plans/2026-07-08-video-source-block-aggregation.md
git commit -m "feat: group video transcript source blocks"
```

### Self-Review

- Scope is limited to video transcript source block readability.
- The plan does not change V2 unit planning, ECD planning, or question count policy.
- The plan preserves raw transcript data and source timestamps for future video seek support.
