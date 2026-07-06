# Video Visual Understanding Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-adapted video visual understanding layer that borrows the useful `claude-real-video` ideas: scene-aware frame extraction, deduplication, and contact sheets, then converts visual evidence into `LearningSource.visualSegments` without binding the V2 question-generation system to any video or vision model.

**Architecture:** Keep TikHub, media download, ffmpeg audio extraction, and local Faster-Whisper ASR as the source/text path. Add a `VideoFramePackProvider` between downloaded media and `VisualUnderstandingProvider`; the provider produces timestamped frames and grids, then a model-specific visual adapter turns them into normalized visual text. V2 generation continues to consume `LearningSource.normalizedText`.

**Tech Stack:** Node.js 20 ESM, `node:test`, `ffmpeg`/`ffprobe`, optional Python/Pillow for benchmark image inspection, TikHub REST API, existing `SpeechToTextProvider`, existing `VisualUnderstandingProvider`, DeepSeek-first text generation.

---

## Scope

Included:

- Add an internal `VideoFramePack` data contract.
- Implement a `crv_style_ffmpeg` frame pack provider in Node using `ffmpeg` and `ffprobe`.
- Preserve timestamps for every kept frame.
- Add RGB-diff sliding-window deduplication based on the `claude-real-video` method.
- Generate bounded 3x3 contact sheets with timestamp labels.
- Integrate frame pack generation into `extractVideoLearningSource`.
- Extend `VisualUnderstandingProvider` input so future Qwen-VL/Gemini/OpenAI Vision providers can read frames and grids.
- Keep no-op visual provider behavior for environments without a multimodal model.
- Add benchmark output for real video QA.
- Update docs and env var list.

Excluded:

- Do not replace TikHub with `yt-dlp`.
- Do not replace local Faster-Whisper with `openai-whisper`.
- Do not add user video upload.
- Do not change V2 question-generation prompts, rubrics, or model selection based on source type.
- Do not expose frame images to iOS in this backend pass.

## Current Code Touchpoints

Create:

- `backend/src/media/videoFramePackProvider.js`  
  Provider resolver and no-op/provider factory following the existing provider boundary pattern.
- `backend/src/media/crvStyleFramePackProvider.js`  
  ffmpeg/ffprobe based frame extraction, timestamp mapping, RGB diff dedup, and grid generation.
- `backend/src/media/videoFramePackProvider.test.js`
- `backend/src/media/crvStyleFramePackProvider.test.js`

Modify:

- `backend/src/media/extractVideoLearningSource.js`  
  Generate `framePack` after media download and pass it to `understandVideoVisuals`.
- `backend/src/media/visualUnderstandingProvider.js`  
  Accept `framePack` and pass it to concrete providers; normalize visual output unchanged.
- `backend/src/media/visualUnderstandingProvider.test.js`  
  Cover `framePack` forwarding.
- `backend/src/media/mediaCost.js`  
  Preserve the latest provider and metadata for each media stage so benchmark output can report frame/grid counts.
- `backend/src/media/mediaCost.test.js`  
  Cover `video_frame_pack` metadata in the summarized usage.
- `backend/package.json`  
  Add the new files to `check:video-source`.
- `backend/scripts/benchmark-video-learning-source.mjs`  
  Include frame pack summary in benchmark output.
- `docs/media-learning-source-architecture-zh.md`  
  Link to the CRV adapter decision and list new env vars.

Read before editing:

- `docs/video-visual-understanding-crv-adapter-zh.md`
- `backend/src/media/extractVideoLearningSource.js`
- `backend/src/media/visualUnderstandingProvider.js`
- `backend/src/media/learningSource.js`
- `backend/src/media/ffmpegAudio.js`
- `backend/src/media/mediaFiles.js`

## Data Contract

The implementation should return this shape:

```js
{
  provider: "crv_style_ffmpeg",
  skipped: false,
  reason: "",
  video: {
    durationSeconds: 76,
    fps: 30,
    width: 1080,
    height: 1920
  },
  frames: [
    {
      id: "frame-0001",
      path: "/tmp/shibei-video-abc/frames/frame_0001_0.000s.jpg",
      order: 1,
      startSeconds: 0,
      endSeconds: 1,
      kept: true,
      diffPercent: null
    }
  ],
  grids: [
    {
      id: "grid-0001",
      path: "/tmp/shibei-video-abc/grids/grid_0001.jpg",
      frameIds: ["frame-0001"],
      startSeconds: 0,
      endSeconds: 9,
      rows: 3,
      cols: 3
    }
  ],
  debug: {
    extractedFrameCount: 30,
    keptFrameCount: 18,
    cappedFrameCount: 0,
    sceneThreshold: 0.3,
    fpsFloorSeconds: 1,
    dedupThresholdPercent: 8,
    dedupWindow: 4
  }
}
```

## Task 0: Baseline And Safety Check

**Files:**

- Read: `backend/package.json`
- Read: `backend/src/media/extractVideoLearningSource.js`
- Read: `backend/src/media/visualUnderstandingProvider.js`

- [ ] **Step 1: Confirm branch and working tree**

Run:

```bash
git status --short --branch
```

Expected:

- Branch is the isolated test-feature branch, not production.
- Existing untracked docs or QA reports are understood before code edits.

- [ ] **Step 2: Run current video checks**

Run:

```bash
npm --prefix backend run check:video-source
```

Expected:

- Existing video-source tests pass before adding frame pack code.

- [ ] **Step 3: Commit planning docs before implementation**

Run:

```bash
git add docs/video-visual-understanding-crv-adapter-zh.md \
  docs/media-learning-source-architecture-zh.md \
  docs/superpowers/plans/2026-07-07-video-visual-understanding-adapter.md
git commit -m "docs: plan video visual understanding adapter"
```

Expected:

- Planning is a separate checkpoint before backend implementation.

## Task 1: Add Frame Pack Provider Boundary

**Files:**

- Create: `backend/src/media/videoFramePackProvider.js`
- Create: `backend/src/media/videoFramePackProvider.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write provider resolver tests**

Create `backend/src/media/videoFramePackProvider.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  createNoopVideoFramePackProvider,
  createVideoFramePackProvider,
  resolveVideoFramePackProviderName
} from "./videoFramePackProvider.js";

test("resolves disabled frame pack provider names", () => {
  assert.equal(resolveVideoFramePackProviderName({}), "none");
  assert.equal(resolveVideoFramePackProviderName({ VIDEO_FRAME_PROVIDER: "off" }), "none");
  assert.equal(resolveVideoFramePackProviderName({ VIDEO_FRAME_PROVIDER: "disabled" }), "none");
});

test("resolves crv style provider name", () => {
  assert.equal(resolveVideoFramePackProviderName({ VIDEO_FRAME_PROVIDER: "crv_style_ffmpeg" }), "crv_style_ffmpeg");
});

test("noop frame provider returns skipped frame pack", async () => {
  const provider = createNoopVideoFramePackProvider();
  const result = await provider.createFramePack({ mediaFile: { path: "/tmp/video.mp4" } });

  assert.equal(result.provider, "none");
  assert.equal(result.skipped, true);
  assert.deepEqual(result.frames, []);
  assert.deepEqual(result.grids, []);
});

test("rejects unsupported frame provider", () => {
  assert.throws(
    () => createVideoFramePackProvider({ env: { VIDEO_FRAME_PROVIDER: "unknown" } }),
    /暂不支持的视频抽帧供应商/
  );
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test backend/src/media/videoFramePackProvider.test.js
```

Expected:

- FAIL because `videoFramePackProvider.js` does not exist.

- [ ] **Step 3: Implement provider boundary**

Create `backend/src/media/videoFramePackProvider.js`:

```js
import { createMediaExtractionError } from "./mediaErrors.js";
import { createCrvStyleFramePackProvider } from "./crvStyleFramePackProvider.js";

const DISABLED_PROVIDER_NAMES = new Set(["", "none", "off", "disabled"]);

export function resolveVideoFramePackProviderName(env = process.env) {
  const provider = String(env.VIDEO_FRAME_PROVIDER || "none").trim().toLowerCase();
  return DISABLED_PROVIDER_NAMES.has(provider) ? "none" : provider;
}

export function createNoopVideoFramePackProvider({ reason = "video_frame_pack_disabled" } = {}) {
  return {
    name: "none",
    async createFramePack() {
      return normalizeFramePack({
        provider: "none",
        skipped: true,
        reason,
        frames: [],
        grids: [],
        debug: {}
      });
    }
  };
}

export function createVideoFramePackProvider({ env = process.env } = {}) {
  const providerName = resolveVideoFramePackProviderName(env);
  if (providerName === "none") return createNoopVideoFramePackProvider();
  if (providerName === "crv_style_ffmpeg") return createCrvStyleFramePackProvider({ env });

  throw createMediaExtractionError(
    "unsupported_video_frame_provider",
    `暂不支持的视频抽帧供应商：${providerName}`,
    { retryable: false, provider: providerName }
  );
}

export async function createVideoFramePack({
  provider = createVideoFramePackProvider(),
  video = {},
  mediaFile = null,
  transcriptSegments = []
} = {}) {
  if (!provider || typeof provider.createFramePack !== "function") {
    throw createMediaExtractionError(
      "invalid_video_frame_provider",
      "视频抽帧供应商未实现 createFramePack。",
      { retryable: false }
    );
  }

  return normalizeFramePack(await provider.createFramePack({ video, mediaFile, transcriptSegments }));
}

export function normalizeFramePack(result = {}) {
  const payload = result && typeof result === "object" ? result : {};
  return {
    provider: String(payload.provider || "unknown"),
    skipped: Boolean(payload.skipped),
    reason: String(payload.reason || ""),
    video: payload.video && typeof payload.video === "object" ? payload.video : {},
    frames: Array.isArray(payload.frames) ? payload.frames : [],
    grids: Array.isArray(payload.grids) ? payload.grids : [],
    debug: payload.debug && typeof payload.debug === "object" ? payload.debug : {}
  };
}
```

- [ ] **Step 4: Add placeholder file for import**

Create `backend/src/media/crvStyleFramePackProvider.js`:

```js
import { createMediaExtractionError } from "./mediaErrors.js";

export function createCrvStyleFramePackProvider() {
  throw createMediaExtractionError(
    "unsupported_video_frame_provider",
    "crv_style_ffmpeg 视频抽帧供应商尚未实现。",
    { retryable: false, provider: "crv_style_ffmpeg" }
  );
}
```

- [ ] **Step 5: Run provider tests**

Run:

```bash
node --test backend/src/media/videoFramePackProvider.test.js
```

Expected:

- PASS for resolver/no-op/unsupported behavior.

- [ ] **Step 6: Add tests to package script**

Modify `backend/package.json` `check:video-source` to include:

```bash
node --check src/media/videoFramePackProvider.js
node --check src/media/crvStyleFramePackProvider.js
node --test src/media/videoFramePackProvider.test.js
```

Expected:

- The new provider boundary is included in the video check script.

- [ ] **Step 7: Commit**

Run:

```bash
git add backend/src/media/videoFramePackProvider.js \
  backend/src/media/videoFramePackProvider.test.js \
  backend/src/media/crvStyleFramePackProvider.js \
  backend/package.json
git commit -m "feat: add video frame pack provider boundary"
```

## Task 2: Implement CRV-Style Frame Extraction

**Files:**

- Modify: `backend/src/media/crvStyleFramePackProvider.js`
- Create: `backend/src/media/crvStyleFramePackProvider.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Write unit tests with injected commands**

Create `backend/src/media/crvStyleFramePackProvider.test.js` with tests for:

- Builds ffprobe metadata from injected runner.
- Builds ffmpeg select command with scene threshold and fps floor.
- Normalizes timestamped frame records.
- Caps frames deterministically.
- Returns a skipped result when input media is missing.

Minimum test skeleton:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { createCrvStyleFramePackProvider } from "./crvStyleFramePackProvider.js";

test("creates timestamped frame pack from injected ffmpeg outputs", async () => {
  const calls = [];
  const provider = createCrvStyleFramePackProvider({
    env: {
      VIDEO_FRAME_MAX_FRAMES: "3",
      VIDEO_FRAME_FPS_FLOOR_SECONDS: "1",
      VIDEO_FRAME_SCENE_THRESHOLD: "0.3"
    },
    runCommand: async (command, args) => {
      calls.push({ command, args });
      return { stdout: "", stderr: "" };
    },
    probeVideo: async () => ({ durationSeconds: 3, fps: 30, width: 1080, height: 1920 }),
    listExtractedFrames: async () => [
      { path: "/tmp/frames/raw_00001.jpg", timestampSeconds: 0 },
      { path: "/tmp/frames/raw_00002.jpg", timestampSeconds: 1 },
      { path: "/tmp/frames/raw_00003.jpg", timestampSeconds: 2 }
    ],
    readImageSignature: async (frame) => frame.path.endsWith("1.jpg") ? ["a"] : [frame.path],
    writeGridImages: async ({ frames }) => [{
      id: "grid-0001",
      path: "/tmp/grids/grid_0001.jpg",
      frameIds: frames.map((frame) => frame.id),
      startSeconds: 0,
      endSeconds: 3,
      rows: 3,
      cols: 3
    }]
  });

  const result = await provider.createFramePack({
    mediaFile: { path: "/tmp/source.mp4", dir: "/tmp" }
  });

  assert.equal(result.provider, "crv_style_ffmpeg");
  assert.equal(result.frames.length, 3);
  assert.equal(result.frames[1].startSeconds, 1);
  assert.equal(result.grids.length, 1);
  assert.equal(calls.length, 1);
  assert.match(calls[0].args.join(" "), /select=/);
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
node --test backend/src/media/crvStyleFramePackProvider.test.js
```

Expected:

- FAIL because implementation is still the placeholder.

- [ ] **Step 3: Implement provider with injected seams**

Implement `createCrvStyleFramePackProvider` so defaults use real `ffprobe`, `ffmpeg`, filesystem listing, and image grid writing, while tests can inject:

```js
export function createCrvStyleFramePackProvider({
  env = process.env,
  runCommand = runCommandWithTimeout,
  probeVideo = probeVideoWithFfprobe,
  listExtractedFrames = listTimestampedFrames,
  readImageSignature = readRgbSignature,
  writeGridImages = writeContactSheets
} = {}) {
  return {
    name: "crv_style_ffmpeg",
    async createFramePack({ mediaFile } = {}) {
      if (!mediaFile?.path) {
        return normalizeSkipped("video_frame_media_missing");
      }

      const config = readFrameConfig(env);
      const video = await probeVideo({ inputPath: mediaFile.path, ffprobePath: config.ffprobePath });
      const framesDir = join(mediaFile.dir || dirname(mediaFile.path), "frames");
      const gridsDir = join(mediaFile.dir || dirname(mediaFile.path), "grids");
      await mkdir(framesDir, { recursive: true });
      await mkdir(gridsDir, { recursive: true });

      await extractRawFrames({
        inputPath: mediaFile.path,
        framesDir,
        config,
        video,
        runCommand
      });

      const extractedFrames = await listExtractedFrames({ framesDir, video });
      const dedupedFrames = await dedupFrames({
        frames: extractedFrames,
        readImageSignature,
        thresholdPercent: config.dedupThresholdPercent,
        window: config.dedupWindow,
        maxFrames: config.maxFrames
      });
      const grids = await writeGridImages({
        frames: dedupedFrames.frames,
        gridsDir,
        rows: config.gridRows,
        cols: config.gridCols
      });

      return {
        provider: "crv_style_ffmpeg",
        skipped: false,
        reason: "",
        video,
        frames: dedupedFrames.frames,
        grids,
        debug: {
          extractedFrameCount: extractedFrames.length,
          keptFrameCount: dedupedFrames.frames.length,
          cappedFrameCount: dedupedFrames.cappedFrameCount,
          sceneThreshold: config.sceneThreshold,
          fpsFloorSeconds: config.fpsFloorSeconds,
          dedupThresholdPercent: config.dedupThresholdPercent,
          dedupWindow: config.dedupWindow
        }
      };
    }
  };
}
```

Implementation requirements:

- `runCommandWithTimeout` must reject non-zero exit codes and timeout.
- `ffmpeg` extraction must include `-y`, `-hide_banner`, `-loglevel error`.
- Frame timestamps must come from ffmpeg metadata or deterministic mapping from selected frame order. Prefer metadata; fallback mapping is acceptable only when clearly marked in `debug.timestampMode`.
- Dedup must compare RGB signatures against the last N kept signatures.
- Capping must keep frames spread across the video, not only the first N frames.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test backend/src/media/crvStyleFramePackProvider.test.js
```

Expected:

- PASS.

- [ ] **Step 5: Add package checks**

Modify `backend/package.json` `check:video-source` to include:

```bash
node --test src/media/crvStyleFramePackProvider.test.js
```

- [ ] **Step 6: Commit**

Run:

```bash
git add backend/src/media/crvStyleFramePackProvider.js \
  backend/src/media/crvStyleFramePackProvider.test.js \
  backend/package.json
git commit -m "feat: add crv style video frame pack provider"
```

## Task 3: Wire Frame Pack Into Extraction Pipeline

**Files:**

- Modify: `backend/src/media/extractVideoLearningSource.js`
- Modify: `backend/src/media/extractVideoLearningSource.test.js`
- Modify: `backend/src/media/visualUnderstandingProvider.js`
- Modify: `backend/src/media/visualUnderstandingProvider.test.js`

- [ ] **Step 1: Add pipeline test**

In `backend/src/media/extractVideoLearningSource.test.js`, add a case that injects a frame provider and confirms `understandVisuals` receives it:

```js
test("passes timestamped frame pack into visual understanding", async () => {
  let receivedFramePack = null;
  const learningSource = await extractVideoLearningSource({
    sourceUrl: "https://v.douyin.com/abc/",
    provider: {
      fetchVideoSource: async () => ({
        provider: "tikhub",
        platform: "douyin",
        sourceUrl: "https://v.douyin.com/abc/",
        title: "Figma Motion",
        description: "平台文案",
        account: "月半AI酱",
        durationSeconds: 76,
        mediaUrl: "https://media.example.com/video.mp4",
        providerContentId: "video-1"
      })
    },
    downloadMedia: async () => ({ path: "/tmp/video-dir/source-video", dir: "/tmp/video-dir" }),
    extractAudio: async () => ({ path: "/tmp/video-dir/audio.wav", dir: "/tmp/video-dir" }),
    transcribeAudio: async () => ({
      provider: "local_whisper",
      segments: [{ startSeconds: 0, endSeconds: 5, text: "这是一个 Figma Motion 教程。" }]
    }),
    framePackProvider: {
      createFramePack: async () => ({
        provider: "crv_style_ffmpeg",
        frames: [{ id: "frame-0001", path: "/tmp/f.jpg", startSeconds: 0, endSeconds: 5, kept: true }],
        grids: [{ id: "grid-0001", path: "/tmp/g.jpg", frameIds: ["frame-0001"], startSeconds: 0, endSeconds: 5 }],
        debug: { keptFrameCount: 1 }
      })
    },
    understandVisuals: async ({ framePack }) => {
      receivedFramePack = framePack;
      return {
        provider: "fake-vision",
        segments: [{ id: "visual-001", startSeconds: 0, endSeconds: 5, text: "画面展示 Figma Motion 面板。" }]
      };
    },
    cleanup: async () => {}
  });

  assert.equal(receivedFramePack.provider, "crv_style_ffmpeg");
  assert.equal(learningSource.visualSegments.length, 1);
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
node --test backend/src/media/extractVideoLearningSource.test.js
```

Expected:

- FAIL because `framePackProvider` is not wired.

- [ ] **Step 3: Update extraction orchestrator**

Modify `extractVideoLearningSource` imports and parameters:

```js
import {
  createVideoFramePack,
  createVideoFramePackProvider
} from "./videoFramePackProvider.js";
```

Add parameters:

```js
framePackProvider = createVideoFramePackProvider(),
createFramePack = createVideoFramePack,
```

After transcript creation and before `understandVisuals`:

```js
const framePack = await createFramePack({
  provider: framePackProvider,
  video,
  mediaFile,
  transcriptSegments: transcript.segments
});
recordMediaUsage(mediaUsageRecorder, {
  stage: "video_frame_pack",
  provider: framePack.provider || framePackProvider.name || "unknown",
  cost: 0,
  metadata: {
    skipped: Boolean(framePack.skipped),
    reason: framePack.reason || "",
    frameCount: Array.isArray(framePack.frames) ? framePack.frames.length : 0,
    gridCount: Array.isArray(framePack.grids) ? framePack.grids.length : 0
  }
});
```

Pass `framePack` to visual understanding:

```js
const visualUnderstanding = await understandVisuals({
  provider: visualUnderstandingProvider,
  video,
  mediaFile,
  transcriptSegments: transcript.segments,
  framePack
});
```

- [ ] **Step 4: Update visual provider forwarding**

In `backend/src/media/visualUnderstandingProvider.js`, update function signature:

```js
export async function understandVideoVisuals({
  provider = createVisualUnderstandingProvider(),
  video = {},
  mediaFile = null,
  transcriptSegments = [],
  framePack = null
} = {}) {
```

And provider call:

```js
const result = await provider.understandVideo({
  video,
  mediaFile,
  transcriptSegments,
  framePack
});
```

- [ ] **Step 5: Add forwarding test**

In `backend/src/media/visualUnderstandingProvider.test.js`, add:

```js
test("forwards frame pack to concrete visual provider", async () => {
  let received = null;
  const result = await understandVideoVisuals({
    provider: {
      name: "fake-vision",
      async understandVideo(input) {
        received = input;
        return { provider: "fake-vision", segments: [] };
      }
    },
    framePack: { provider: "crv_style_ffmpeg", frames: [{ id: "frame-0001" }], grids: [] }
  });

  assert.equal(received.framePack.provider, "crv_style_ffmpeg");
  assert.equal(result.provider, "fake-vision");
});
```

- [ ] **Step 6: Run tests**

Run:

```bash
node --test backend/src/media/extractVideoLearningSource.test.js backend/src/media/visualUnderstandingProvider.test.js
```

Expected:

- PASS.

- [ ] **Step 7: Commit**

Run:

```bash
git add backend/src/media/extractVideoLearningSource.js \
  backend/src/media/extractVideoLearningSource.test.js \
  backend/src/media/visualUnderstandingProvider.js \
  backend/src/media/visualUnderstandingProvider.test.js
git commit -m "feat: pass video frame packs to visual understanding"
```

## Task 4: Add Benchmark And QA Report Output

**Files:**

- Modify: `backend/src/media/mediaCost.js`
- Modify: `backend/src/media/mediaCost.test.js`
- Modify: `backend/scripts/benchmark-video-learning-source.mjs`
- Create: `docs/quality-runs/video-link/README.md`

- [ ] **Step 1: Preserve latest metadata in media usage summary**

In `backend/src/media/mediaCost.test.js`, extend the existing test:

```js
test("records media extraction usage by stage", () => {
  const recorder = createMediaUsageRecorder({ runId: "run-1" });
  recorder.record({ stage: "tikhub_fetch", provider: "tikhub", cost: 0.002, currency: "USD" });
  recorder.record({ stage: "openai_transcription", provider: "openai", cost: 0.006, currency: "USD" });
  recorder.record({
    stage: "video_frame_pack",
    provider: "crv_style_ffmpeg",
    cost: 0,
    currency: "USD",
    metadata: { frameCount: 18, gridCount: 2, skipped: false }
  });

  const summary = summarizeMediaUsage(recorder.calls);
  assert.equal(summary.callCount, 3);
  assert.equal(summary.totalsByCurrency.USD.totalCost, 0.008);
  assert.equal(summary.byStage.openai_transcription.callCount, 1);
  assert.equal(summary.byStage.video_frame_pack.provider, "crv_style_ffmpeg");
  assert.deepEqual(summary.byStage.video_frame_pack.metadata, { frameCount: 18, gridCount: 2, skipped: false });
});
```

Then modify `backend/src/media/mediaCost.js` inside `summarizeMediaUsage`:

```js
byStage[call.stage] ||= { callCount: 0, totalCost: 0, provider: "", metadata: {} };
byStage[call.stage].callCount += 1;
byStage[call.stage].totalCost = roundCost(byStage[call.stage].totalCost + Number(call.cost || 0));
byStage[call.stage].provider = call.provider || byStage[call.stage].provider;
byStage[call.stage].metadata = call.metadata || byStage[call.stage].metadata || {};
```

- [ ] **Step 2: Run media cost test**

Run:

```bash
node --test backend/src/media/mediaCost.test.js
```

Expected:

- PASS.

- [ ] **Step 3: Extend benchmark JSON**

Modify benchmark output so each run includes:

```js
framePack: {
  provider: learningSource.extractionMeta.mediaUsage?.byStage?.video_frame_pack?.provider || "",
  frameCount: learningSource.extractionMeta.mediaUsage?.byStage?.video_frame_pack?.metadata?.frameCount || 0,
  gridCount: learningSource.extractionMeta.mediaUsage?.byStage?.video_frame_pack?.metadata?.gridCount || 0,
  skipped: Boolean(learningSource.extractionMeta.mediaUsage?.byStage?.video_frame_pack?.metadata?.skipped)
}
```

- [ ] **Step 4: Create QA directory README**

Create `docs/quality-runs/video-link/README.md`:

```md
# Video Link Quality Runs

This directory stores local QA artifacts for video-link extraction and generation runs.

The backend must not rely on these files at runtime. Reports here are for manual review of source extraction, ASR quality, frame-pack metrics, visual understanding output, and generated question quality.
```

- [ ] **Step 5: Run syntax check**

Run:

```bash
node --check backend/scripts/benchmark-video-learning-source.mjs
```

Expected:

- PASS.

- [ ] **Step 6: Run local benchmark with no visual model**

Run with local env vars:

```bash
VIDEO_FRAME_PROVIDER=crv_style_ffmpeg \
VIDEO_VISUAL_PROVIDER=none \
VIDEO_ASR_PROVIDER=local_whisper \
npm --prefix backend run benchmark:video-source -- --url "https://v.douyin.com/GCUGoeTuTxk/"
```

Expected:

- TikHub resolves the video.
- ASR runs.
- Frame pack stage reports `frameCount > 0`.
- Visual understanding is skipped.
- LearningSource still generates from transcript.

- [ ] **Step 7: Commit**

Run:

```bash
git add backend/src/media/mediaCost.js \
  backend/src/media/mediaCost.test.js \
  backend/scripts/benchmark-video-learning-source.mjs \
  docs/quality-runs/video-link/README.md
git commit -m "chore: report video frame pack benchmark metrics"
```

## Task 5: Add First Real Visual Provider Spike

**Files:**

- Create: `backend/src/media/qwenVlVisualUnderstandingProvider.js` or `backend/src/media/geminiVisualUnderstandingProvider.js`
- Modify: `backend/src/media/visualUnderstandingProvider.js`
- Create: matching `.test.js`
- Modify: `backend/package.json`

Decision before implementation:

- If API key and endpoint are available for Qwen-VL, use Qwen-VL first because it aligns with Chinese short-video understanding and avoids tying the text-generation path to OpenAI.
- If Qwen-VL access is not ready, use Gemini as the first spike because native video/image understanding is mature.
- Keep DeepSeek as the text generation model unless explicitly changed.

- [ ] **Step 1: Write provider contract test**

The provider test must mock HTTP and assert:

```js
assert.equal(result.provider, "qwen-vl");
assert.equal(result.segments[0].sourceRole, "visual_summary");
assert.equal(result.segments[0].startSeconds, 0);
assert.match(result.segments[0].text, /Figma Motion/);
```

- [ ] **Step 2: Implement visual provider**

The provider must:

- Read only `framePack.grids` by default.
- Bound grid count with `VIDEO_VISUAL_MAX_GRIDS`.
- Ask the model to describe only visible content and return JSON.
- Include transcript segments as context, not as proof of visual content.
- Normalize every output segment to `{ id, sourceRole, startSeconds, endSeconds, text }`.

- [ ] **Step 3: Run focused tests**

Run:

```bash
node --test backend/src/media/visualUnderstandingProvider.test.js backend/src/media/qwenVlVisualUnderstandingProvider.test.js
```

Expected:

- PASS.

- [ ] **Step 4: Commit**

Run:

```bash
git add backend/src/media/visualUnderstandingProvider.js \
  backend/src/media/qwenVlVisualUnderstandingProvider.js \
  backend/src/media/qwenVlVisualUnderstandingProvider.test.js \
  backend/package.json
git commit -m "feat: add qwen vl video visual understanding provider"
```

## Task 6: Final Acceptance Gate

**Files:**

- Read: all modified backend/media files.
- Read: benchmark output under `docs/quality-runs/video-link/`.

- [ ] **Step 1: Run full video check**

Run:

```bash
npm --prefix backend run check:video-source
```

Expected:

- All video-source tests pass.

- [ ] **Step 2: Run full backend check**

Run:

```bash
npm --prefix backend run check
```

Expected:

- Full backend suite passes.

- [ ] **Step 3: Run real sample benchmark**

Run:

```bash
VIDEO_FRAME_PROVIDER=crv_style_ffmpeg \
VIDEO_VISUAL_PROVIDER=none \
VIDEO_ASR_PROVIDER=local_whisper \
npm --prefix backend run benchmark:video-source -- --url "https://v.douyin.com/GCUGoeTuTxk/"
```

Expected:

- Frame pack created.
- ASR transcript created.
- V2 generation can run when model keys are configured.
- Raw media/temp frames are cleaned up.

- [ ] **Step 4: Architecture self-review**

Check these pass/fail questions:

- No TikHub raw response fields leak into V2 generation.
- No visual provider code imports V2 generation modules.
- No question-generation prompt branches on `video_link`.
- No OpenAI-only assumption was added to video visuals.
- Frame pack provider can be disabled with `VIDEO_FRAME_PROVIDER=none`.
- Visual provider can be disabled with `VIDEO_VISUAL_PROVIDER=none`.
- Every media subprocess has timeout handling.
- Every temp directory is cleaned in `finally`.

- [ ] **Step 5: Commit final docs**

Run:

```bash
git add docs/video-visual-understanding-crv-adapter-zh.md \
  docs/media-learning-source-architecture-zh.md \
  docs/superpowers/plans/2026-07-07-video-visual-understanding-adapter.md
git commit -m "docs: record video visual adapter acceptance review"
```

## Self-Review

Spec coverage:

- The plan keeps TikHub as source provider and does not use `yt-dlp`.
- The plan keeps ASR separate and does not replace local Faster-Whisper.
- The plan adds a timestamped `VideoFramePack` instead of relying on `MANIFEST.txt`.
- The plan keeps V2 generation model-agnostic and does not bind the outliner/question system to a multimodal model.
- The plan includes risk controls for timeout, max frames, temp cleanup, and benchmark acceptance.

Remaining uncertainties:

- The first production visual model is not selected. This is intentionally isolated to Task 5; Tasks 1-4 are useful even with `VIDEO_VISUAL_PROVIDER=none`.
- Exact timestamp extraction should prefer ffmpeg metadata. If implementation falls back to frame-order mapping, the result must mark `debug.timestampMode="estimated"` and should not be used for precise source jump links.
- Contact-sheet quality and dedup thresholds need real-sample tuning across at least tutorial,口播, screen recording, and fast-cut examples.
- Production worker CPU/memory limits need deployment-specific values before public rollout.

Risk review improvements applied:

- The plan does not depend on `claude-real-video` as a runtime package.
- The plan avoids cookies and login-gated platform access.
- The plan requires checkpoint commits.
- The plan allows frame extraction and visual understanding to be disabled independently.
- The plan keeps existing DeepSeek text generation path unchanged.
