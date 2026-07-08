# Video User Entry Productionization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make video-link generation feel production-ready from the user's first paste through source review by adding backend preflight, frontend capability-aware validation, clearer failure contracts, and video-aware source display.

**Architecture:** Keep backend extraction as the source of truth for platform support, feature flags, and duration limits. Add a lightweight preflight layer that can classify links and fetch metadata without entering the full generation pipeline, then let iOS consume that contract to show a source preview, block unsupported/overlong videos, and preserve backend guards as the authoritative safety net. Continue to keep ASR transcript as the primary generation chain and visual understanding as an optional enhancement.

**Tech Stack:** Node.js 20 ESM backend, `node:test`, SwiftUI iOS client, existing V2 generation queue, existing video extraction adapters.

---

## Current Review Summary

The video generation backend can already run Douyin/Xiaohongshu via TikHub and Bilibili/YouTube/generic web video via `yt-dlp`. It has a 15-minute backend duration cap, provider feature flags, visual fallback, grouped source blocks, and quality-run cost reports.

The user-facing entry still has gaps:

- The upload screen submits directly after non-empty validation, so unsupported or overlong video feedback arrives too late.
- iOS URL classification is hardcoded and can drift from backend flags.
- The backend health capabilities do not expose source/platform support.
- Source extraction failures have user-facing messages, but not a stable client error taxonomy for preflight.
- The iOS source page still treats every source block like article text and drops video timestamps/content-basis metadata.

## Files

- Create: `backend/src/sources/sourcePreflight.js`
- Create: `backend/src/sources/sourcePreflight.test.js`
- Modify: `backend/src/serviceCapabilities.js`
- Modify: `backend/src/tests/serviceCapabilities.test.js`
- Modify: `backend/src/server.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Modify: `backend/src/media/ytDlpVideoProvider.js`
- Modify: `backend/src/media/tikhubVideoProvider.js`
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/Models/ChapterInput.swift`
- Modify: `拾贝/拾贝/V2/Models/V2BackendModels.swift`
- Modify: `拾贝/拾贝/V2/Models/V2ReviewFlowModels.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`
- Test outputs: `docs/quality-runs/video-link/<sample>/`
- Update: `docs/iteration-records/2026-07-07-video-generation-stability-cost.md`

## Task 1: Backend Source Capability and Preflight Contract

**Files:**
- Create: `backend/src/sources/sourcePreflight.js`
- Create: `backend/src/sources/sourcePreflight.test.js`
- Modify: `backend/src/serviceCapabilities.js`
- Modify: `backend/src/tests/serviceCapabilities.test.js`
- Modify: `backend/src/server.js`

- [x] **Step 1: Define capability contract**

Add source capability data that includes:

```js
{
  sourceTypes: {
    text: { enabled: true, minCharacters: 24 },
    article_link: { enabled: true },
    wechat_article: { enabled: true },
    video_link: {
      enabled: true,
      maxDurationSeconds: 900,
      platforms: {
        douyin: { enabled: true, provider: "tikhub" },
        xiaohongshu: { enabled: true, provider: "tikhub" },
        youtube: { enabled: true, provider: "yt-dlp" },
        bilibili: { enabled: true, provider: "yt-dlp" },
        direct_video_file: { enabled: true, provider: "yt-dlp" },
        generic_web: { enabled: true, provider: "yt-dlp", publicLabel: "网页视频" }
      }
    }
  }
}
```

- [x] **Step 2: Add `preflightSourceInput()`**

The function accepts `{ rawInput, sourceType }` and returns:

```js
{
  ok: true,
  inputKind: "url",
  sourceType: "video_link",
  platform: "bilibili",
  platformLabel: "B站",
  provider: "yt-dlp",
  canGenerate: true,
  title: "",
  durationSeconds: null,
  maxDurationSeconds: 900,
  reasonCode: "",
  userMessage: "可以生成复习内容。"
}
```

For blocking states, return `ok: false`, `canGenerate: false`, and one of:

- `invalid_input`
- `invalid_url`
- `unsupported_source_type`
- `video_link_disabled`
- `video_platform_disabled`
- `unsupported_video_platform`
- `video_duration_too_long`
- `video_metadata_unavailable`

- [x] **Step 3: Add a metadata fetch option**

When `fetchMetadata: true`, preflight should use the same provider metadata call as extraction and enforce duration before full media download. It must not download video, run ASR, create frame packs, call Qwen, or enqueue generation.

- [x] **Step 4: Add routes**

Add:

```text
GET /api/source/capabilities
POST /api/sources/preflight
```

The POST route accepts:

```json
{ "input": "https://www.bilibili.com/video/...", "fetchMetadata": true }
```

- [x] **Step 5: Test**

Run:

```bash
cd backend
node --test src/sources/sourcePreflight.test.js src/tests/serviceCapabilities.test.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/sources/sourcePreflight.js backend/src/sources/sourcePreflight.test.js backend/src/serviceCapabilities.js backend/src/tests/serviceCapabilities.test.js backend/src/server.js docs/superpowers/plans/2026-07-08-video-user-entry-productionization.md
git commit -m "feat: add source preflight contract"
```

## Task 2: Stable Backend Failure Codes for Video Entry

**Files:**
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.js`
- Modify: `backend/src/v2/generation/v2GenerationJobRunner.test.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`

- [x] **Step 1: Preserve media error type as client failure code**

For video extraction failures, expose:

```js
failureCode: "video_duration_too_long"
sourceFailureCode: "failed_extract_video"
```

Keep `generationProgress.failureCode` compatible with existing job-stage logic, but make the user-facing result stable enough for frontend copy.

- [x] **Step 2: Map video error codes to user messages**

Use exact code mapping before message substring matching:

```js
video_duration_too_long -> "视频时长超过 15 分钟，暂时无法生成复习内容。"
unsupported_video_platform -> "这个视频平台暂未支持。可以换一个已支持的视频链接。"
video_link_disabled -> "视频链接生成功能暂未开放。"
video_ytdlp_disabled -> "YouTube、B站和网页视频链接暂未开放。"
video_private_or_deleted -> "这条视频无法公开访问。可以换一个公开视频链接。"
video_no_speech -> "这条视频没有识别到足够清晰的语音内容。"
```

- [x] **Step 3: Test**

Run:

```bash
cd backend
node --test src/v2/generation/v2GenerationJobRunner.test.js
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/v2/generation/v2GenerationJobRunner.js backend/src/v2/generation/v2GenerationJobRunner.test.js
git commit -m "fix: expose stable video failure codes"
```

## Task 3: iOS Upload Preflight and Source Preview

**Files:**
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/Models/ChapterInput.swift`

- [x] **Step 1: Add Swift DTOs**

Add decodable models:

```swift
struct SourcePreflightResponse: Decodable, Equatable {
    let ok: Bool
    let inputKind: String
    let sourceType: String
    let platform: String?
    let platformLabel: String?
    let provider: String?
    let canGenerate: Bool
    let title: String?
    let durationSeconds: Double?
    let maxDurationSeconds: Double?
    let reasonCode: String?
    let userMessage: String
}
```

- [x] **Step 2: Add API call**

Add:

```swift
func preflightSource(input: String, fetchMetadata: Bool = true) async throws -> SourcePreflightResponse
```

Use `POST /api/sources/preflight`.

- [x] **Step 3: Add upload state machine**

Use states:

- idle
- checking
- ready(preflight)
- blocked(preflight)
- failed(message)

- [x] **Step 4: Update upload UI**

When the user pastes a URL:

- Show "正在读取链接信息" while checking.
- Show a compact source preview when ready: platform label, title if available, duration if available.
- Disable generate when `canGenerate == false`.
- Show the backend `userMessage` for blocked links.

Do not show backend diagnostics, provider errors, or model names.

- [x] **Step 5: Test/build**

Run the iOS compile check available in this repo. If no lightweight compile command is available, run the existing production/static check and report the limitation.

- [ ] **Step 6: Commit**

```bash
git add 拾贝/拾贝/Services/APIClient.swift 拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift 拾贝/拾贝/Models/ChapterInput.swift
git commit -m "feat: preflight source links before generation"
```

## Task 4: iOS Video Source Reading Surface

**Files:**
- Modify: `backend/src/server.js`
- Modify: `拾贝/拾贝/V2/Models/V2BackendModels.swift`
- Modify: `拾贝/拾贝/V2/Models/V2ReviewFlowModels.swift`
- Modify: `拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift`

- [x] **Step 1: Decode video metadata**

Extend source block models with:

```swift
let sourceRole: String?
let startSeconds: Double?
let endSeconds: Double?
```

Extend chapter review data with:

```swift
let contentBasis: V2SourceContentBasis?
```

- [x] **Step 2: Render timestamped blocks**

For video blocks, render a small metadata row:

```text
00:32-00:58 · 字幕
```

Use user-facing labels:

- `transcript` / `subtitle` -> `字幕`
- `visual` -> `画面`
- `description` -> `文案`

- [x] **Step 3: Render content basis**

If present, show one quiet chip near the source header:

- `已结合视频字幕和画面信息生成`
- `本次主要基于视频字幕生成`

- [x] **Step 4: Keep article source unchanged**

Article blocks without timestamp/sourceRole render exactly as before.

- [x] **Step 5: Build/test and commit**

```bash
git add 拾贝/拾贝/V2/Models/V2BackendModels.swift 拾贝/拾贝/V2/Models/V2ReviewFlowModels.swift 拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift
git commit -m "feat: show video source timestamps"
```

## Task 5: Real Regression Tests

**Files:**
- Write outputs under `docs/quality-runs/video-link/`
- Create: `docs/iteration-records/2026-07-08-video-user-entry-productionization.md`

- [x] **Step 1: Backend preflight tests**

Run unit tests and direct HTTP smoke tests for:

- valid Bilibili link under 15 minutes;
- valid Douyin link under 15 minutes;
- unknown platform;
- invalid URL;
- known over-15-minute video if available through metadata;
- `VIDEO_YTDLP_ENABLED=false` blocks Bilibili/YouTube.

- [x] **Step 2: Full video generation regression**

Run the existing quality runner for the Bilibili sample and at least one short-video sample already used in this feature branch. Record:

- status;
- source provider;
- TikHub calls;
- Qwen visual tokens;
- DeepSeek/Qwen text-generation tokens if present;
- HTML report path.

- [x] **Step 3: Commit result summaries only**

Commit compact JSON summaries, matrix updates, and selected HTML reports if they are useful for review. Do not commit raw media, temp frames, or large caches.

## Task 6: Final Review and Next Plan

**Files:**
- Update: `docs/superpowers/plans/2026-07-08-video-user-entry-productionization.md`
- Create: `docs/iteration-records/2026-07-08-video-user-entry-productionization.md`

- [x] **Step 1: Review production readiness**

Check:

- unsupported links fail before generation;
- overlong videos are blocked before generation when metadata is available;
- backend guards still block overlong/unsupported videos if frontend misses it;
- video source page remains readable;
- backend diagnostics remain separate from user-facing status;
- cache/cost risks are still documented.

- [x] **Step 2: Write next-stage plan**

Capture remaining work:

- production DB/Redis cache and singleflight;
- YouTube real sample matrix;
- App-level quota/cost controls;
- production preflight checks for `yt-dlp`, ffmpeg, ASR, TikHub, Qwen;
- TestFlight-facing copy and App Store privacy wording if video links are enabled.

## Self-Review

- This plan covers the user-visible entry path, backend source truth, generation fallback, and source reading experience.
- It keeps the question-generation system model-agnostic.
- It separates backend diagnostics from user-facing content basis and failure copy.
- It preserves the existing backend extraction guard as authoritative even after frontend preflight is added.
- It leaves production persistent cache and broader provider evaluation as explicit next-stage work rather than mixing them into the UX entry iteration.
