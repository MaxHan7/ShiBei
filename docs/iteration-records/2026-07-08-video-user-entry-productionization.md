# Video User Entry Productionization Iteration Record

Date: 2026-07-08

## Scope

This iteration productionized the first user-facing video-link entry path:

- backend source capability and preflight contracts;
- stable user-safe failure codes for video extraction failures;
- iOS paste-link preflight, preview, and disabled-generation feedback;
- iOS source reading support for video timestamps and content-basis labels;
- real regression tests for Bilibili and Douyin video links.

The product strategy remains: ASR/transcript is the primary chain, visual understanding is an optional enhancement. Backend diagnostic details stay internal, while clients receive a user-facing content-basis message such as `本次主要基于视频字幕生成` or `已结合视频字幕和画面信息生成`.

## Checkpoints

- `7368b44 feat: add source preflight contract`
- `6fad5aa fix: expose stable video failure codes`
- `33d7e62 feat: preflight source links before generation`
- `d61075b feat: show video source timestamps`

## Automated Verification

- `node --test src/sources/sourcePreflight.test.js src/tests/serviceCapabilities.test.js`
  - 10 tests passed.
- `npm --prefix backend run check:video-source`
  - 142 tests passed.
- `npm run check:ios-production`
  - production guard passed.
- `xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme 'Recallo' -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO build`
  - build passed.

## HTTP Preflight Smoke Results

Backend server: local memory mode, video links enabled, max duration 900 seconds.

| Case | Result |
| --- | --- |
| Bilibili sample | `canGenerate=true`, platform `bilibili`, provider `yt-dlp`, duration 379s |
| Douyin sample | `canGenerate=true`, platform `douyin`, provider `tikhub`, duration 284s |
| Invalid URL-like input | `canGenerate=false`, reason `invalid_url` |
| Short text | `canGenerate=false`, reason `text_too_short` |
| Bilibili with `VIDEO_YTDLP_ENABLED=false` | `canGenerate=false`, reason `video_ytdlp_disabled` |
| Bilibili with max duration 60s | `canGenerate=false`, reason `video_duration_too_long` |

## Real Regression Runs

### Bilibili: Feynman Agent

- Input: `https://www.bilibili.com/video/BV1hYGd63EnU/`
- Report: `docs/quality-runs/video-link/bilibili-feynman-agent/reports/20260708-191349-20260708-bilibili-feynman-agent-user-entry-regression.html`
- JSON: `docs/quality-runs/video-link/bilibili-feynman-agent/runs/20260708-191349-20260708-bilibili-feynman-agent-user-entry-regression.json`
- Status: completed.
- Units: 3.
- Questions: 8.
- Source blocks: 18.
- Text generation model calls: 13.
- Text generation tokens: 50,780 total.
- Text generation actual cost: USD 0.006367492.
- Media provider calls:
  - `video_source_fetch`: 1 call, provider `yt-dlp`, cost USD 0.
  - `video_media_fetch`: 1 call, provider `yt-dlp`, cost USD 0.
  - `audio_transcription`: 1 call, provider `local_whisper`, cost USD 0.
  - `video_frame_pack`: 1 call, provider `crv_style_ffmpeg`, cost USD 0.
  - `visual_understanding`: 1 call, provider `qwen-vl`, failed with `visual_output_parse_failed`.
- User-facing content basis: `audio_transcript`, message `本次主要基于视频字幕生成`.

Generated units:

- Workflow与Agent的本质区别.
- Agent的五大组件：数字员工类比.
- Agent Loop：自主推理与行动循环.

### Douyin: Multi-Agent Communication

- Input: `https://v.douyin.com/yXZKGqTAbKg/`
- Report: `docs/quality-runs/video-link/douyin-multi-agent-communication/reports/20260708-191734-20260708-douyin-multi-agent-user-entry-regression.html`
- JSON: `docs/quality-runs/video-link/douyin-multi-agent-communication/runs/20260708-191734-20260708-douyin-multi-agent-user-entry-regression.json`
- Status: completed.
- Units: 5.
- Questions: 18.
- Source blocks: 16.
- Text generation model calls: 22.
- Text generation tokens: 75,843 total.
- Text generation actual cost: USD 0.009285136.
- Media provider calls:
  - `tikhub_fetch`: 1 call, cost USD 0.001.
  - `visual_understanding`: 1 call, provider `qwen-vl`, 5,679 tokens, estimated cost USD 0.00054645.
  - Total media actual cost: USD 0.00154645.
- User-facing content basis: `audio_visual`, message `已结合视频字幕和画面信息生成`.

Generated units:

- 多Agent通信的核心问题.
- 通信拓扑：中心化 vs 接力.
- 消息契约：结构化消息格式.
- 共享状态：统一维护全局真相.
- 面试回答模板与总结.

## Review Findings

- The user-entry path is now much safer than before: supported videos show platform/title/duration, overlong videos can be blocked before generation, and backend still enforces the same rules if the client misses preflight.
- TikHub cost is under control in this run: Douyin required only one paid TikHub fetch.
- Bilibili and Douyin both generated usable questions.
- Qwen visual understanding is still not fully stable: one Bilibili run failed visual JSON parsing and correctly downgraded to transcript-only. This is acceptable for the current product strategy but should be improved before broadly advertising visual understanding.
- The first HTTP smoke attempt used `rawInput` instead of the client contract `input`; the backend route already supports `input/sourceUrl/rawText`, and the iOS client uses `input`.

## Next-Stage Plan

P0 before production rollout:

- Add an integration/snapshot test for `POST /api/sources/preflight` using the same field shape as iOS (`input`).
- Add iOS UI tests or snapshot coverage for ready, blocked, invalid URL, and loading preflight states.
- Add a server readiness endpoint or startup diagnostic for `yt-dlp`, ffmpeg, local Whisper/OpenAI ASR, TikHub, and Qwen provider availability.
- Add a production feature flag rollout switch for video links and a server-side rate/cost guard by user/day.

P1 quality and reliability:

- Improve Qwen visual JSON robustness with one visual-only retry and stricter response-shape validation.
- Track visual success rate separately from generation success rate.
- Add a user-facing “generation basis” field in the chapter payload contract docs so clients do not infer it from internal diagnostics.
- Add a cache hit regression test proving repeated Douyin generation does not call TikHub again inside the cache TTL.

P2 product polish:

- Add link preview copy for generic article links so users do not confuse unknown web URLs with unsupported video platforms.
- Add a “why blocked” analytics event for invalid URL, unsupported platform, disabled provider, overlong video, and private/deleted video.
