# Universal Video Source Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the video learning-source pipeline beyond Douyin/Xiaohongshu so YouTube, Bilibili, and selected public web video URLs can enter the same ASR/OCR/visual/V2 question generation chain.

**Architecture:** Keep TikHub as the preferred source provider for Douyin and Xiaohongshu. Add a separate `yt-dlp` provider for YouTube, Bilibili, and direct/common web video URLs, because these platforms often expose separate audio/video streams and should be downloaded/merged by `yt-dlp` before the existing ASR and frame-pack steps run. Preserve `LearningSource` as the only contract consumed by V2 generation, so the question system remains model- and platform-agnostic.

**Tech Stack:** Node.js backend, Python `yt-dlp`, existing ffmpeg/Whisper/Qwen visual pipeline, Swift iOS client.

---

## Research Notes

- `yt-dlp` is the mature baseline for broad video extraction. Its official project describes support for thousands of sites, and its supported-sites list includes YouTube and Bilibili while noting that the generic extractor can work for embedded/self-hosted videos.
- `yt-dlp` support is not a guarantee for every URL. The official docs explicitly warn that websites change and the only reliable check is to try a URL.
- YouTube is becoming stricter. The official extractor docs note that some YouTube formats/features may require externally supplied PO Tokens. First release should treat YouTube as best-effort public-video support, not a hard SLA.
- For product stability, TikHub should remain the provider for Douyin/Xiaohongshu. `yt-dlp` should be a second provider, not a replacement, because short-link and domestic social-platform behavior is unstable without cookies/login state.

## P0 Scope

- Support YouTube and Bilibili public links in the backend video source pipeline.
- Preserve Douyin/Xiaohongshu behavior and TikHub cost optimization.
- Avoid binding the V2 question system to any platform-specific provider output.
- Add first-pass frontend URL classification parity for YouTube, Bilibili, Xiaohongshu short links, and direct video files.
- Enforce a first-release maximum video duration of 15 minutes (`VIDEO_MAX_DURATION_SECONDS`, default 900) before media download, ASR, visual understanding, or question generation.
- Do not run real YouTube/Bilibili tests until the user provides links.

## P1/P2 Scope Captured From Review

- Add production preflight for `TIKHUB_API_KEY`, `yt-dlp`, `ffmpeg`, ASR runtime, and optional Qwen visual model.
- Add feature flags: `VIDEO_LINK_ENABLED`, `VIDEO_YTDLP_ENABLED`, and platform allowlist. Implemented as backend extraction gates with `VIDEO_PLATFORM_ALLOWLIST`.
- Persist media/model usage cost from production jobs, not only quality runners.
- Replace in-memory video extraction cache with DB/Redis cache and same-URL singleflight.
- Extend iOS V2 models and source page to display `contentBasis`, `sourceRole`, and timestamps.
- Keep backend diagnostics separate from user-facing status.

## Files

- Modify: `backend/src/media/videoPlatforms.js`
- Modify: `backend/src/media/videoPlatforms.test.js`
- Create: `backend/src/media/ytDlpVideoProvider.js`
- Create: `backend/src/media/ytDlpVideoProvider.test.js`
- Create: `backend/src/media/ytDlpMediaDownloader.js`
- Create: `backend/src/media/ytDlpMediaDownloader.test.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`
- Modify: `backend/src/media/extractVideoLearningSource.test.js`
- Modify: `backend/src/media/tikhubVideoProvider.js`
- Modify: `backend/src/sources/extractSourceContent.js`
- Modify: `backend/package.json`
- Modify: `拾贝/拾贝/Models/ChapterInput.swift`

## Tasks

### Task 1: Platform Detection And Routing

- [ ] Add platform detection for `youtube`, `bilibili`, `direct_video_file`, and `generic_web`.
- [ ] Keep TikHub restricted to `douyin` and `xiaohongshu`.
- [ ] Route non-TikHub video platforms to `yt-dlp`.
- [ ] Update backend and Swift URL classification so supported links are recognized consistently.
- [ ] Commit: `feat: route generic video platforms`

### Task 2: yt-dlp Metadata Provider

- [ ] Add `fetchYtDlpVideoSource()` that runs `python3 -m yt_dlp -J --no-playlist`.
- [ ] Normalize title, author/uploader, description, duration, thumbnail, subtitles, provider content id, platform, and source URL.
- [ ] Return a `mediaDownload` descriptor instead of relying on one direct `mediaUrl`.
- [ ] Classify missing `yt-dlp` runtime as non-retryable provider config failure.
- [ ] Commit: `feat: add yt-dlp video source provider`

### Task 3: yt-dlp Media Download

- [ ] Add a downloader that runs `yt-dlp` into a temp directory, merges audio/video when needed, and returns `{ path, dir, bytes, contentType, sourceUrl }`.
- [ ] Use `YT_DLP_FORMAT_SELECTOR` with a safe default of `bv*+ba/best`.
- [ ] Keep cleanup responsibility inside the existing `cleanupMediaTempFiles()` flow.
- [ ] Commit: `feat: download universal video media with yt-dlp`

### Task 4: Pipeline Integration

- [ ] Let `extractVideoLearningSource()` choose the provider from the URL when no provider is injected.
- [ ] If `video.mediaDownload.provider === "yt-dlp"`, use the new downloader.
- [ ] Continue to use HTTP download for TikHub media URLs.
- [ ] Reject known video durations over 15 minutes before download; allow unknown durations to proceed under file-size and timeout guards.
- [ ] Record media usage provider as `yt-dlp` or `tikhub`.
- [ ] Commit: `feat: integrate universal video provider`

### Task 5: Verification

- [ ] Run `npm run check:video-source`.
- [ ] Run focused tests for platform detection, TikHub, yt-dlp provider, yt-dlp downloader, and source extraction.
- [ ] Do not run real YouTube/Bilibili extraction until the user provides a test URL.
- [ ] Commit documentation and test updates.

## Real-World Test Gate

Before any real external test, ask the user for:

- one public YouTube video link;
- one public Bilibili video link;
- whether to allow temporary `yt-dlp` network calls in the test environment.

The first real test report must include: provider used, metadata success, media download success, ASR source, visual status, token usage, runtime, and final HTML report path.

## Production Gate Addendum

- `VIDEO_LINK_ENABLED=false` disables all video-link generation at the backend extraction boundary.
- `VIDEO_YTDLP_ENABLED=false` keeps TikHub-backed Douyin/Xiaohongshu available while disabling YouTube, Bilibili, direct video files, and generic web video extraction.
- `VIDEO_PLATFORM_ALLOWLIST=douyin,xiaohongshu,bilibili,youtube` restricts extraction to listed detected platforms. Leave unset in feature testing to allow all currently supported platforms.
