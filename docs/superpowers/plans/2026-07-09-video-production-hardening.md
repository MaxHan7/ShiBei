# Video Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make video link generation safe for beta users by reducing accidental TikHub spend, enforcing resource limits, protecting runtime diagnostics, and tightening the frontend feedback loop before Railway deployment.

**Architecture:** Keep the existing source extraction pipeline, but separate cheap URL classification from paid metadata extraction. Put hard resource guards at every media boundary, protect operational endpoints, and let the iOS UI present deterministic states for supported, blocked, long-running, and generic-video cases.

**Tech Stack:** Node.js backend using `node:test`, ffmpeg/yt-dlp/faster-whisper runtime checks, TikHub/Qwen providers, SwiftUI iOS frontend.

---

## File Structure

- Modify `backend/src/sources/sourcePreflight.js`: split low-cost classification from metadata lookup, add explicit metadata policy semantics.
- Modify `backend/src/sources/sourcePreflight.test.js`: verify TikHub is not called during cheap preflight and metadata is called only when requested.
- Modify `backend/src/server.js`: default `/api/sources/preflight` to cheap mode and protect `/api/source/runtime-readiness`.
- Modify `backend/src/media/mediaFiles.js`: replace full-buffer download with streaming byte-counted download.
- Modify `backend/src/media/mediaFiles.test.js`: cover stream overflow without `content-length`.
- Modify `backend/src/media/ytDlpMediaDownloader.js`: add max-byte guard after yt-dlp download and before downstream ffmpeg work.
- Modify `backend/src/media/ytDlpMediaDownloader.test.js`: cover oversized yt-dlp output.
- Modify `backend/src/media/videoRuntimeReadiness.js`: add optional TTL memoization helper if endpoint remains HTTP-accessible.
- Modify `backend/src/media/videoRuntimeReadiness.test.js`: cover readiness access behavior without leaking secrets.
- Modify `拾贝/拾贝/Services/APIClient.swift`: make preflight default cheap; expose metadata mode explicitly.
- Modify `拾贝/拾贝/V2/V2RootView.swift`: call cheap preflight from paste flow; add long-running polling feedback.
- Modify `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`: show platform-only preflight, metadata-on-generate state, and blocked feedback.
- Modify `拾贝/拾贝/Models/ChapterInput.swift`: add a deliberate path for generic web video if product UI exposes a video mode.
- Update `docs/media-learning-source-architecture-zh.md` or `docs/iteration-records/...`: record the final standard: VSR/ASR text main chain, visual enhancement, cheap preflight, paid extraction only after user intent.

---

### Task 1: Make Preflight Cheap By Default

**Files:**
- Modify: `backend/src/sources/sourcePreflight.js`
- Modify: `backend/src/sources/sourcePreflight.test.js`
- Modify: `backend/src/server.js`
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`

- [ ] **Step 1: Write backend tests proving paste-time preflight does not call TikHub**

Add this test to `backend/src/sources/sourcePreflight.test.js`:

```js
test("cheap preflight does not fetch paid TikHub metadata", async () => {
  let tikhubCalls = 0;
  const result = await preflightSourceInput({
    rawInput: "https://v.douyin.com/demo/",
    fetchMetadata: false,
    env: {},
    fetchTikHub: async () => {
      tikhubCalls += 1;
      return { title: "paid", durationSeconds: 60 };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "douyin");
  assert.equal(result.provider, "tikhub");
  assert.equal(result.title, "");
  assert.equal(result.durationSeconds, null);
  assert.equal(tikhubCalls, 0);
});
```

- [ ] **Step 2: Run the targeted source preflight tests**

Run:

```bash
npm --prefix backend test -- src/sources/sourcePreflight.test.js
```

Expected: the new test should pass if the function-level default remains cheap; later server/client defaults still need fixing.

- [ ] **Step 3: Change the API server default to cheap preflight**

In `backend/src/server.js`, change `handleSourcePreflight` so missing `fetchMetadata` means false:

```js
async function handleSourcePreflight(req, res) {
  const body = await readBody(req);
  const result = await preflightSourceInput({
    rawInput: body.input || body.sourceUrl || body.rawText,
    sourceType: body.sourceType,
    fetchMetadata: body.fetchMetadata === true
  });
  sendJson(res, result.ok ? 200 : 422, result);
}
```

- [ ] **Step 4: Change the iOS default to cheap preflight**

In `拾贝/拾贝/Services/APIClient.swift`, change:

```swift
func preflightSource(input: String, fetchMetadata: Bool = false) async throws -> SourcePreflightResponse {
    let request = SourcePreflightRequest(
        input: input.trimmingCharacters(in: .whitespacesAndNewlines),
        fetchMetadata: fetchMetadata
    )
    return try await send("/api/sources/preflight", method: "POST", body: request, acceptsFailureBody: true)
}
```

- [ ] **Step 5: Keep paste flow cheap in V2RootView**

In `拾贝/拾贝/V2/V2RootView.swift`, keep the upload injected dependency explicit:

```swift
preflightSource: { input in
    try await apiClient.preflightSource(input: input, fetchMetadata: false)
},
```

- [ ] **Step 6: Run backend regression tests**

Run:

```bash
npm --prefix backend run check:video-source
node --check backend/src/server.js
```

Expected: all existing video-source tests pass.

- [ ] **Step 7: Commit checkpoint**

```bash
git add backend/src/sources/sourcePreflight.js backend/src/sources/sourcePreflight.test.js backend/src/server.js '拾贝/拾贝/Services/APIClient.swift' '拾贝/拾贝/V2/V2RootView.swift'
git commit -m "fix: make video preflight cheap by default"
```

---

### Task 2: Add Controlled Metadata Fetch On Generate

**Files:**
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `拾贝/拾贝/V2/V2RootView.swift`
- Modify: `拾贝/拾贝/Services/APIClient.swift`
- Modify: `backend/src/sources/sourcePreflight.test.js`

- [ ] **Step 1: Add backend test for metadata only when explicitly requested**

Add this test to `backend/src/sources/sourcePreflight.test.js`:

```js
test("metadata preflight fetches TikHub only when explicitly requested", async () => {
  let tikhubCalls = 0;
  const result = await preflightSourceInput({
    rawInput: "https://v.douyin.com/demo/",
    fetchMetadata: true,
    env: {},
    fetchTikHub: async () => {
      tikhubCalls += 1;
      return { title: "短视频", durationSeconds: 88 };
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.title, "短视频");
  assert.equal(result.durationSeconds, 88);
  assert.equal(tikhubCalls, 1);
});
```

- [ ] **Step 2: Add a generate-time metadata check callback**

Update `V2UploadView` in `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift` so it receives two dependencies:

```swift
let preflightSource: (String) async throws -> SourcePreflightResponse
let preflightSourceWithMetadata: (String) async throws -> SourcePreflightResponse
let onGenerate: (String) -> Void
```

- [ ] **Step 3: Add a submitting metadata state**

Extend `V2UploadPreflightState`:

```swift
case checkingMetadata(input: String)
```

and show:

```swift
case .checkingMetadata(let checkedInput) where checkedInput == input:
    V2UploadPreflightStatusCard(
        tone: .checking,
        title: "正在确认视频信息",
        detail: "检查标题和时长"
    )
```

- [ ] **Step 4: Gate Generate through metadata only for video URLs**

Inside the generate button action, replace the direct `onGenerate(trimmed)` with:

```swift
Task {
    await validateMetadataThenGenerate(trimmed)
}
```

Add:

```swift
@MainActor
private func validateMetadataThenGenerate(_ input: String) async {
    let parsed = ChapterInput.parse(input)
    guard parsed.sourceType == .videoLink else {
        onGenerate(input)
        return
    }

    preflightState = .checkingMetadata(input: input)
    do {
        let response = try await preflightSourceWithMetadata(input)
        guard trimmedSourceText == input else { return }
        if response.canGenerate {
            preflightState = .ready(input: input, response: response)
            onGenerate(input)
        } else {
            preflightState = .blocked(input: input, response: response)
            validationMessage = response.userMessage
        }
    } catch {
        guard trimmedSourceText == input else { return }
        preflightState = .failed(input: input, message: "暂时无法读取视频信息，请稍后重试。")
        validationMessage = "暂时无法读取视频信息，请稍后重试。"
    }
}
```

- [ ] **Step 5: Wire both callbacks from V2RootView**

In `拾贝/拾贝/V2/V2RootView.swift`:

```swift
preflightSource: { input in
    try await apiClient.preflightSource(input: input, fetchMetadata: false)
},
preflightSourceWithMetadata: { input in
    try await apiClient.preflightSource(input: input, fetchMetadata: true)
},
```

- [ ] **Step 6: Run backend checks and Swift compile check**

Run:

```bash
npm --prefix backend run check:video-source
xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme '拾贝' -destination 'platform=iOS Simulator,name=iPhone 16' -quiet build
```

Expected: backend tests pass; iOS target builds. If simulator name differs locally, first run `xcrun simctl list devices available`.

- [ ] **Step 7: Commit checkpoint**

```bash
git add backend/src/sources/sourcePreflight.test.js '拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift' '拾贝/拾贝/V2/V2RootView.swift' '拾贝/拾贝/Services/APIClient.swift'
git commit -m "feat: confirm video metadata only on generation"
```

---

### Task 3: Stream Direct Media Downloads With Byte Limits

**Files:**
- Modify: `backend/src/media/mediaFiles.js`
- Modify: `backend/src/media/mediaFiles.test.js`

- [ ] **Step 1: Add test for stream overflow without content-length**

Add to `backend/src/media/mediaFiles.test.js`:

```js
import { ReadableStream } from "node:stream/web";

test("aborts streamed media when body exceeds max bytes without content-length", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(Buffer.from("too-"));
      controller.enqueue(Buffer.from("large"));
      controller.close();
    }
  });

  await assert.rejects(
    () => downloadMediaToTempFile({
      mediaUrl: "https://media.example.com/video.mp4",
      maxBytes: 4,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "video/mp4"]]),
        body
      })
    }),
    /视频文件过大/
  );
});
```

- [ ] **Step 2: Replace arrayBuffer download with streaming write**

In `backend/src/media/mediaFiles.js`, import write stream helpers:

```js
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
```

Replace the buffer block with:

```js
const dir = join(tmpdir(), `shibei-video-${randomUUID()}`);
await mkdir(dir, { recursive: true });
const path = join(dir, "source-video");
const bytes = await writeResponseBodyToFile(response, path, { maxBytes });
return { path, dir, bytes, contentType, sourceUrl: mediaUrl };
```

Add:

```js
async function writeResponseBodyToFile(response, path, { maxBytes }) {
  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
        retryable: false
      });
    }
    await writeFile(path, buffer);
    return buffer.byteLength;
  }

  const reader = response.body.getReader();
  const stream = createWriteStream(path);
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      bytes += chunk.byteLength;
      if (bytes > maxBytes) {
        stream.destroy();
        throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
          retryable: false
        });
      }
      await new Promise((resolve, reject) => {
        stream.write(chunk, (error) => error ? reject(error) : resolve());
      });
    }
  } finally {
    await new Promise((resolve) => stream.end(resolve));
  }
  return bytes;
}
```

- [ ] **Step 3: Run media file tests**

```bash
npm --prefix backend test -- src/media/mediaFiles.test.js
```

Expected: all media download tests pass.

- [ ] **Step 4: Commit checkpoint**

```bash
git add backend/src/media/mediaFiles.js backend/src/media/mediaFiles.test.js
git commit -m "fix: stream video media downloads with byte limits"
```

---

### Task 4: Enforce yt-dlp Output Size Before Processing

**Files:**
- Modify: `backend/src/media/ytDlpMediaDownloader.js`
- Modify: `backend/src/media/ytDlpMediaDownloader.test.js`
- Modify: `backend/src/media/extractVideoLearningSource.js`

- [ ] **Step 1: Add yt-dlp oversized output test**

Add to `backend/src/media/ytDlpMediaDownloader.test.js`:

```js
test("rejects yt-dlp output larger than max bytes", async () => {
  await assert.rejects(
    () => downloadYtDlpMediaToTempFile({
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      maxBytes: 4,
      spawnImpl: createDownloadMockSpawn({ output: "too-large" })
    }),
    (error) => error.mediaErrorType === "video_media_too_large" && error.retryable === false
  );
});
```

Update `createDownloadMockSpawn` signature:

```js
function createDownloadMockSpawn({ calls = [], stderr = "", exitCode = 0, output = "fake-video" } = {}) {
```

and write `output` instead of `"fake-video"`.

- [ ] **Step 2: Add maxBytes option to yt-dlp downloader**

In `backend/src/media/ytDlpMediaDownloader.js`, import defaults:

```js
import { VIDEO_DEFAULTS } from "./videoDefaults.js";
```

Add:

```js
const DEFAULT_MAX_BYTES = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, VIDEO_DEFAULTS.mediaMaxBytes);
```

Add parameter:

```js
maxBytes = DEFAULT_MAX_BYTES,
```

After `const file = await findDownloadedMediaFile(dir);`, add:

```js
if (file.bytes > maxBytes) {
  throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
    retryable: false,
    provider: "yt-dlp"
  });
}
```

- [ ] **Step 3: Pass max bytes from extraction path**

In `backend/src/media/extractVideoLearningSource.js`, add a parameter:

```js
mediaMaxBytes = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, VIDEO_DEFAULTS.mediaMaxBytes),
```

Pass it into `downloadVideoMedia` and then into both downloader branches:

```js
mediaFile = await downloadVideoMedia({
  video,
  downloadMedia,
  downloadYtDlpMedia,
  mediaMaxBytes
});
```

Inside `downloadVideoMedia`:

```js
return downloadYtDlpMedia({
  sourceUrl: video.sourceUrl || video.url,
  maxBytes: mediaMaxBytes
});
```

- [ ] **Step 4: Run yt-dlp tests and full video-source check**

```bash
npm --prefix backend test -- src/media/ytDlpMediaDownloader.test.js
npm --prefix backend run check:video-source
```

- [ ] **Step 5: Commit checkpoint**

```bash
git add backend/src/media/ytDlpMediaDownloader.js backend/src/media/ytDlpMediaDownloader.test.js backend/src/media/extractVideoLearningSource.js
git commit -m "fix: enforce yt-dlp video size limits"
```

---

### Task 5: Protect Runtime Readiness Endpoint

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/src/media/videoRuntimeReadiness.js`
- Modify: `backend/src/media/videoRuntimeReadiness.test.js`
- Modify: `backend/scripts/production-readiness-gate.mjs`

- [ ] **Step 1: Add memoized readiness helper**

In `backend/src/media/videoRuntimeReadiness.js`, add:

```js
let cachedReadiness = null;
let cachedReadinessAt = 0;

export async function buildMemoizedVideoRuntimeReadiness({
  env = process.env,
  runCommand = runCommandCheck,
  nowMs = Date.now(),
  ttlMs = 60_000
} = {}) {
  if (cachedReadiness && nowMs - cachedReadinessAt < ttlMs) {
    return { ...cachedReadiness, cached: true };
  }
  const readiness = await buildVideoRuntimeReadiness({ env, runCommand });
  cachedReadiness = readiness;
  cachedReadinessAt = nowMs;
  return { ...readiness, cached: false };
}
```

- [ ] **Step 2: Add memoization test**

Add to `backend/src/media/videoRuntimeReadiness.test.js`:

```js
test("memoized readiness avoids repeated command checks within ttl", async () => {
  let commandCount = 0;
  const first = await buildMemoizedVideoRuntimeReadiness({
    env: { TIKHUB_API_KEY: "secret-tikhub", QWEN_API_KEY: "secret-qwen" },
    nowMs: 1000,
    ttlMs: 60_000,
    runCommand: async () => {
      commandCount += 1;
      return { ok: true, skipped: false, detail: "ok" };
    }
  });
  const second = await buildMemoizedVideoRuntimeReadiness({
    env: { TIKHUB_API_KEY: "secret-tikhub", QWEN_API_KEY: "secret-qwen" },
    nowMs: 2000,
    ttlMs: 60_000,
    runCommand: async () => {
      commandCount += 1;
      return { ok: true, skipped: false, detail: "ok" };
    }
  });

  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.equal(commandCount, 5);
});
```

- [ ] **Step 3: Require internal token for HTTP readiness**

In `backend/src/server.js`, import memoized helper and protect the route:

```js
if (req.method === "GET" && req.url === "/api/source/runtime-readiness") {
  const expectedToken = process.env.RUNTIME_READINESS_TOKEN || "";
  const actualToken = req.headers["x-runtime-readiness-token"] || "";
  if (!expectedToken || actualToken !== expectedToken) {
    sendJson(res, 404, { errorCode: "not_found", message: "Not found" });
    return;
  }
  sendJson(res, 200, await buildMemoizedVideoRuntimeReadiness());
  return;
}
```

- [ ] **Step 4: Keep CLI readiness gate direct**

In `backend/scripts/production-readiness-gate.mjs`, keep using direct `buildVideoRuntimeReadiness()` for local/CI checks. If it calls the HTTP endpoint, add header:

```js
headers: {
  "x-runtime-readiness-token": process.env.RUNTIME_READINESS_TOKEN || ""
}
```

- [ ] **Step 5: Run readiness tests and syntax checks**

```bash
npm --prefix backend test -- src/media/videoRuntimeReadiness.test.js
node --check backend/src/server.js
node --check backend/scripts/production-readiness-gate.mjs
```

- [ ] **Step 6: Commit checkpoint**

```bash
git add backend/src/server.js backend/src/media/videoRuntimeReadiness.js backend/src/media/videoRuntimeReadiness.test.js backend/scripts/production-readiness-gate.mjs
git commit -m "chore: protect video runtime readiness checks"
```

---

### Task 6: Close Generic Web Video Product Gap

**Files:**
- Modify: `拾贝/拾贝/Models/ChapterInput.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`
- Modify: `backend/src/sources/sourcePreflight.js`
- Modify: `backend/src/sources/sourcePreflight.test.js`

- [ ] **Step 1: Decide UI contract**

Use this beta contract:

```text
Known video hosts and direct video files: auto-detect as video.
Unknown web URLs: default to article.
If user explicitly selects "视频链接", send sourceType=video_link.
```

- [ ] **Step 2: Add backend test for explicit generic web video**

Add to `backend/src/sources/sourcePreflight.test.js`:

```js
test("explicit video source type treats unknown web URL as generic web video", async () => {
  const result = await preflightSourceInput({
    rawInput: "https://example.com/watch/123",
    sourceType: "video_link",
    fetchMetadata: false,
    env: {}
  });

  assert.equal(result.ok, true);
  assert.equal(result.sourceType, "video_link");
  assert.equal(result.platform, "generic_web");
  assert.equal(result.platformLabel, "网页视频");
  assert.equal(result.provider, "yt-dlp");
});
```

- [ ] **Step 3: Add frontend source mode control only if design accepts it**

In `V2UploadView`, add a compact segmented control near the input for URL inputs:

```swift
enum V2UploadSourceMode: String, CaseIterable {
    case auto = "自动"
    case article = "文章"
    case video = "视频"
}
```

When mode is `.video`, call preflight and generation with `sourceType=video_link`. This requires extending `SourcePreflightRequest` and `V2CreateChapterRequest` to carry explicit source type.

- [ ] **Step 4: If no UI mode is desired for beta, document limitation**

Update `docs/media-learning-source-architecture-zh.md`:

```markdown
### 普通网页视频限制

第一版自动支持抖音、小红书、YouTube、B站和直链视频文件。未知域名默认按网页文章处理；普通网页视频需要后续通过“视频链接”显式入口进入，避免把普通文章网页误判为视频。
```

- [ ] **Step 5: Commit checkpoint**

```bash
git add backend/src/sources/sourcePreflight.js backend/src/sources/sourcePreflight.test.js '拾贝/拾贝/Models/ChapterInput.swift' '拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift' docs/media-learning-source-architecture-zh.md
git commit -m "feat: define generic web video entry behavior"
```

---

### Task 7: Improve Long-Running Generation Feedback

**Files:**
- Modify: `拾贝/拾贝/V2/V2RootView.swift`
- Modify: `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

- [ ] **Step 1: Extend polling instead of silently stopping**

In `startGenerationPolling`, after the loop ends, show a non-terminal message:

```swift
await MainActor.run {
    generationPollingTask = nil
    generationState.errorText = "视频还在处理中，可以稍后回到材料页查看结果。"
}
```

- [ ] **Step 2: Prefer backoff after first 5 minutes**

Replace fixed `0..<240` with two phases:

```swift
let intervals: [UInt64] = Array(repeating: 1_250_000_000, count: 240)
    + Array(repeating: 5_000_000_000, count: 120)
```

Loop over `intervals`, sleeping each interval. Total polling becomes about 15 minutes, with lower server pressure after the first 5 minutes.

- [ ] **Step 3: Verify failure status still routes correctly**

Confirm these still mark terminal failure:

```swift
private func isTerminalGenerationStatus(_ status: String) -> Bool {
    status == "completed" || isFailedGenerationStatus(status)
}

private func isFailedGenerationStatus(_ status: String) -> Bool {
    status == "failed_generation" || status == "failed_input" || status == "failed_questions" || status == "failed"
}
```

- [ ] **Step 4: Build iOS target**

```bash
xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme '拾贝' -destination 'platform=iOS Simulator,name=iPhone 16' -quiet build
```

- [ ] **Step 5: Commit checkpoint**

```bash
git add '拾贝/拾贝/V2/V2RootView.swift' '拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift'
git commit -m "fix: keep long video generation feedback alive"
```

---

### Task 8: Update Docs And Deployment Runbook

**Files:**
- Modify: `docs/media-learning-source-architecture-zh.md`
- Modify: `docs/v2-production-deploy-runbook-zh.md`
- Modify: `docs/iteration-records/video-link-hardening-2026-07-09.md`

- [ ] **Step 1: Document production standard**

Create `docs/iteration-records/video-link-hardening-2026-07-09.md`:

```markdown
# 视频链接生产化加固记录 2026-07-09

## 本轮目标

- 粘贴链接阶段不产生 TikHub 付费调用。
- 用户点击生成后才做必要的视频 metadata 检查。
- 所有视频下载路径都有大小上限。
- runtime readiness 只作为部署/运维检查，不作为公开用户接口。
- 前端明确区分用户可见状态与后端测试/调试状态。

## 产品策略

视频理解采用“ASR/VSR 文本主链路 + 视觉增强”的稳定策略。视觉增强失败不阻断出题，但记录在后端测试报告和调试字段中；普通用户只看到可理解的内容依据提示。

## 成本策略

TikHub 只在用户明确生成视频内容、且缓存未命中时调用。粘贴、编辑和平台识别不应触发 TikHub metadata 请求。
```

- [ ] **Step 2: Update Railway variable list**

In `docs/v2-production-deploy-runbook-zh.md`, record required variables:

```markdown
### 视频能力新增变量

- `TIKHUB_API_KEY`: 抖音/小红书视频取源。
- `QWEN_API_KEY` 或 `DASHSCOPE_API_KEY`: Qwen VL 视觉增强。
- `RUNTIME_READINESS_TOKEN`: 仅用于部署检查访问 `/api/source/runtime-readiness`。

以下变量使用代码默认值，除非产品策略变化，不建议在 Railway 手动覆盖：

- `VIDEO_MAX_DURATION_SECONDS=900`
- `VIDEO_LINK_ENABLED=1`
- `VIDEO_YTDLP_ENABLED=1`
- `VIDEO_ASR_PROVIDER=local_whisper`
- `VIDEO_FRAME_PROVIDER=crv_style_ffmpeg`
- `VIDEO_VISUAL_PROVIDER=qwen-vl`
```

- [ ] **Step 3: Run final checks**

```bash
npm --prefix backend run check:video-source
node --check backend/src/server.js
node --check backend/scripts/production-readiness-gate.mjs
xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme '拾贝' -destination 'platform=iOS Simulator,name=iPhone 16' -quiet build
```

- [ ] **Step 4: Commit checkpoint**

```bash
git add docs/media-learning-source-architecture-zh.md docs/v2-production-deploy-runbook-zh.md docs/iteration-records/video-link-hardening-2026-07-09.md
git commit -m "docs: record video production hardening standard"
```

---

## Acceptance Criteria

- Pasting Douyin/Xiaohongshu links does not call TikHub.
- Clicking Generate for a video performs one controlled metadata check, with cache behavior preserved where available.
- Direct media downloads never buffer unbounded video files in memory.
- yt-dlp outputs larger than `VIDEO_MEDIA_MAX_BYTES` fail before ffmpeg/ASR/frame extraction.
- Runtime readiness endpoint is not publicly usable without `RUNTIME_READINESS_TOKEN`.
- Frontend gives clear states for recognized video, blocked overlong video, failed link read, and long-running generation.
- Generic web video behavior is either explicitly supported through a video mode or explicitly documented as not in the first beta UI.
- Backend video-source checks pass.
- iOS target builds.
- Each checkpoint is committed locally; remote push requires explicit user confirmation.

## Self-Review

**Spec coverage:** The plan covers all five review findings: TikHub preflight spend, direct media memory risk, yt-dlp size risk, runtime readiness exposure, generic web video UX gap, and long-running frontend feedback.

**Placeholder scan:** No step relies on "TBD" or vague "add handling"; each risky behavior has a concrete file, test, implementation shape, and verification command.

**Type consistency:** Backend names match existing modules. Swift changes introduce one new callback and one new preflight state; if a source mode control is included, request models must be extended in the same task before compile.
