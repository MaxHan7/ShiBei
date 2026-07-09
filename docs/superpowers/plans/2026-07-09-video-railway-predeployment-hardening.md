# Video Railway Predeployment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the remaining blockers before deploying video-link generation to Railway for user beta testing.

**Architecture:** Keep the video feature behind backend capability/feature flags, make Railway runtime dependencies explicit, and add a deploy-time readiness gate that proves source preflight and media runtimes are present before iOS beta users receive the new client. Deployment should be branch/commit-explicit: do not rely on the local `master` branch, and do not deploy unpushed local-only commits by accident.

**Tech Stack:** Railway Railpack, Node.js 20 ESM backend, SwiftUI iOS client, Python `yt-dlp`/`faster-whisper`, ffmpeg/ffprobe, TikHub, Qwen VL, DeepSeek.

---

## Current Findings

- Local candidate branch: `codex/test-feature-env-20260705`.
- Current local candidate HEAD at review time: `81602cd docs: plan video railway predeployment hardening`.
- `origin/master..HEAD` contains the video feature commits and related App Store/account commits.
- `HEAD..origin/master` is empty, so the candidate branch contains current remote master content.
- No remote branch contains the current HEAD, so Railway cannot be running this code yet.
- Local `master` is stale and diverged; do not deploy from local `master`.
- Railway CLI is installed and linked to project `拾贝`, environment `production`, service `ShiBei`.
- Production Railway service `ShiBei` is connected to GitHub repo `MaxHan7/ShiBei`, branch `master`, and currently uses Railpack V3.
- Railway currently has the required secret/model-selection variable keys: `DATABASE_URL`, `DEEPSEEK_API_KEY`, `TIKHUB_API_KEY`, `QWEN_API_KEY`, `AI_PROVIDER`, `DEEPSEEK_MODEL`, and APNS keys.
- Railway does not currently have `VIDEO_*` override variables. This is acceptable after this plan is corrected: product defaults must live in code, and `VIDEO_*` variables are optional operational overrides, not manual prerequisites.
- Production Railway currently does not expose:
  - `GET /api/source/capabilities`
  - `POST /api/sources/preflight`
  This confirms production has not deployed the video preflight contract.
- Production `/api/health` currently has Railway deployment metadata but empty git commit/branch fields.
- Current `railway.json` still declares Nixpacks, but Railway reports the live service build system as Railpack V3. The deployment hardening should therefore use Railpack-compatible configuration rather than a Nixpacks-only plan.
- Current build does not explicitly install `backend/requirements-video-asr.txt` or system `ffmpeg`; this is still the main backend deployment blocker.

## Execution Update 2026-07-09

Completed locally on branch `codex/test-feature-env-20260705`; not pushed and not deployed:

- Added `railpack.json` and changed `railway.json` to `RAILPACK`.
- Added code-owned video defaults in `backend/src/media/videoDefaults.js`.
- Wired defaults into source preflight, media fetch, ASR, frame-pack, visual-understanding, and quality-run cost estimation.
- Kept `VIDEO_*`, `LOCAL_WHISPER_*`, `YT_DLP_*`, and provider path values as optional overrides rather than mandatory Railway variables.
- Added `GET /api/source/runtime-readiness` with sanitized runtime checks for TikHub/Qwen key presence, ffmpeg, ffprobe, Python, yt-dlp, and faster-whisper.
- Extended `backend/scripts/production-readiness-gate.mjs --require-video 1` to check health video capability, source capabilities, runtime readiness, and a no-metadata Bilibili preflight.
- Extended deployment input guard/templates so video runtime strategy and video secret presence must be explicitly confirmed without recording secret values.
- Verification passed:
  - `npm --prefix backend run check:video-source`
  - `node --check backend/src/server.js`
  - `node --check backend/scripts/production-readiness-gate.mjs`
  - `node --check tools/production-deploy-inputs-guard.mjs`
  - `node --check backend/src/media/videoRuntimeReadiness.js`

Remaining before production/user beta:

- Commit the local hardening checkpoint.
- Push only after user approval.
- Deploy only after user approval.
- After deploy, run `backend/scripts/production-readiness-gate.mjs --require-video 1` against Railway and then run one real short-video generation smoke.

## Manual Versus Agent-Owned Work

Agent-owned work:

- Add Railway runtime configuration for Python dependencies and ffmpeg/ffprobe.
- Add backend readiness checks for video source runtimes and required env presence.
- Extend production readiness scripts to check video capabilities and preflight endpoints.
- Update deployment input guards/docs so branch, commit, and video variable presence are explicit.
- Run local tests and production smoke after the user deploys.

Manual user/Railway console work:

- No new manual secret work is required at this checkpoint; `TIKHUB_API_KEY` and `QWEN_API_KEY` are already present.
- Before deployment, re-confirm that the selected service is still `ShiBei` on branch `master`, or intentionally switch it to the pushed beta branch.
- Trigger or approve deployment to the chosen Railway environment.
- Build/distribute the iOS beta after backend smoke passes.

## Required Railway Variables

Already configured in Railway at review time:

```text
DATABASE_URL=yes
DEEPSEEK_API_KEY=yes
TIKHUB_API_KEY=yes
QWEN_API_KEY=yes
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-flash
APNS env for com.maxhan.shibei=yes
```

Video product defaults should be defined in code, not manually required in Railway:

```text
VIDEO_MAX_DURATION_SECONDS=900
VIDEO_PLATFORM_ALLOWLIST=douyin,xiaohongshu,youtube,bilibili,direct_video_file,generic_web
TIKHUB_UNIT_COST_USD=0.001
VIDEO_ASR_PROVIDER=local_whisper
LOCAL_WHISPER_MODEL=small
LOCAL_WHISPER_DEVICE=auto
LOCAL_WHISPER_COMPUTE_TYPE=int8
LOCAL_WHISPER_LANGUAGE=zh
VIDEO_ASR_TIMEOUT_MS=180000
VIDEO_FRAME_PROVIDER=crv_style_ffmpeg
VIDEO_VISUAL_PROVIDER=qwen-vl
VIDEO_VISUAL_MODEL=qwen3-vl-flash
VIDEO_VISUAL_TIMEOUT_MS=90000
VIDEO_MEDIA_MAX_BYTES=157286400
VIDEO_MEDIA_FETCH_TIMEOUT_MS=60000
YT_DLP_INFO_TIMEOUT_MS=45000
YT_DLP_DOWNLOAD_TIMEOUT_MS=180000
```

These `VIDEO_*`, `LOCAL_WHISPER_*`, `YT_DLP_*`, and path variables may remain available as optional Railway overrides or kill switches, but they should not be required for the normal production path. Only set path overrides if the runtime paths are not on `PATH`:

```text
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
PYTHON_PATH=/opt/venv/bin/python
```

## Deployment Order

1. Prepare and commit Railway runtime/readiness hardening.
2. Push the candidate branch to GitHub.
3. Create a PR or explicitly deploy the pushed branch to a Railway beta/staging service.
4. Confirm Railway secrets/model-selection variables are still present.
5. Deploy backend.
6. Run backend smoke:
   - `/api/health`
   - `/api/source/capabilities`
   - `/api/sources/preflight` for Douyin and Bilibili
   - one real short-video generation
7. Build and distribute iOS beta only after backend smoke passes.

## Task 1: Railpack Runtime Configuration And Product Defaults

**Files:**
- Create: `railpack.json`
- Create: `backend/src/media/videoDefaults.js`
- Modify: `backend/src/sources/sourcePreflight.js`
- Modify: `backend/src/media/speechToTextProvider.js`
- Modify: `backend/src/media/videoFramePackProvider.js`
- Modify: `backend/src/media/visualUnderstandingProvider.js`
- Modify: `.gitignore`
- Test: local syntax checks and `npm run check` subset

- [ ] **Step 1: Create a Railpack config**

Create `railpack.json` at the repository root:

```json
{
  "$schema": "https://schema.railpack.com",
  "packages": {
    "apt": ["ffmpeg", "python3", "python3-venv", "python3-pip"]
  },
  "steps": {
    "install-video-runtime": {
      "commands": [
        "python3 -m venv /opt/venv",
        "/opt/venv/bin/pip install --upgrade pip",
        "/opt/venv/bin/pip install -r backend/requirements-video-asr.txt"
      ]
    }
  },
  "deploy": {
    "variables": {
      "PYTHON_PATH": "/opt/venv/bin/python",
      "LOCAL_WHISPER_PYTHON": "/opt/venv/bin/python"
    }
  }
}
```

If Railpack rejects this schema during deploy, use Railway's supported package variables instead:

```text
RAILPACK_PACKAGES=python3 python3-venv python3-pip ffmpeg
RAILPACK_DEPLOY_APT_PACKAGES=ffmpeg
```

- [ ] **Step 2: Add centralized video defaults**

Create `backend/src/media/videoDefaults.js`:

```js
export const VIDEO_DEFAULTS = Object.freeze({
  maxDurationSeconds: 15 * 60,
  platformAllowlist: ["douyin", "xiaohongshu", "youtube", "bilibili", "direct_video_file", "generic_web"],
  asrProvider: "local_whisper",
  localWhisperModel: "small",
  localWhisperDevice: "auto",
  localWhisperComputeType: "int8",
  localWhisperLanguage: "zh",
  frameProvider: "crv_style_ffmpeg",
  visualProvider: "qwen-vl",
  visualModel: "qwen3-vl-flash",
  mediaMaxBytes: 150 * 1024 * 1024,
  tikhubUnitCostUsd: 0.001
});
```

- [ ] **Step 3: Wire defaults into provider resolvers**

Update provider resolvers so env values override `VIDEO_DEFAULTS`, but production works without manual `VIDEO_*` variables:

```js
// sourcePreflight.js
const DEFAULT_MAX_VIDEO_DURATION_SECONDS = VIDEO_DEFAULTS.maxDurationSeconds;
```

```js
// speechToTextProvider.js
const explicitProvider = String(env.VIDEO_ASR_PROVIDER || VIDEO_DEFAULTS.asrProvider).trim().toLowerCase();
```

```js
// videoFramePackProvider.js
const provider = String(env.VIDEO_FRAME_PROVIDER || VIDEO_DEFAULTS.frameProvider).trim().toLowerCase();
```

```js
// visualUnderstandingProvider.js
const provider = String(env.VIDEO_VISUAL_PROVIDER || VIDEO_DEFAULTS.visualProvider).trim().toLowerCase();
```

- [ ] **Step 4: Ignore local virtualenv artifacts**

Modify `.gitignore` to include:

```gitignore
.venv-video-asr/
.cache/video-models/
```

- [ ] **Step 5: Verify local config files**

Run:

```bash
node --check backend/src/start.js
node --check backend/src/media/localWhisperTranscriptionProvider.js
node --check backend/src/media/ytDlpVideoProvider.js
node --check backend/src/media/ffmpegAudio.js
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add railpack.json backend/src/media/videoDefaults.js backend/src/sources/sourcePreflight.js backend/src/media/speechToTextProvider.js backend/src/media/videoFramePackProvider.js backend/src/media/visualUnderstandingProvider.js .gitignore
git commit -m "chore: configure railway video runtime defaults"
```

## Task 2: Backend Video Readiness Contract

**Files:**
- Create: `backend/src/media/videoRuntimeReadiness.js`
- Create: `backend/src/media/videoRuntimeReadiness.test.js`
- Modify: `backend/src/serviceCapabilities.js`
- Modify: `backend/src/tests/serviceCapabilities.test.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Add failing tests**

Create `backend/src/media/videoRuntimeReadiness.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import { buildVideoRuntimeReadiness } from "./videoRuntimeReadiness.js";

test("reports disabled video runtime when feature flag is off", async () => {
  const readiness = await buildVideoRuntimeReadiness({
    env: { VIDEO_LINK_ENABLED: "0" },
    commandChecker: async () => ({ ok: true })
  });
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.checks.videoLinkEnabled.ok, false);
  assert.equal(readiness.canRunVideoGeneration, false);
});

test("reports configured local video runtime", async () => {
  const seen = [];
  const readiness = await buildVideoRuntimeReadiness({
    env: {
      VIDEO_LINK_ENABLED: "1",
      VIDEO_YTDLP_ENABLED: "1",
      VIDEO_ASR_PROVIDER: "local_whisper",
      VIDEO_FRAME_PROVIDER: "crv_style_ffmpeg",
      VIDEO_VISUAL_PROVIDER: "qwen-vl",
      TIKHUB_API_KEY: "set",
      QWEN_API_KEY: "set"
    },
    commandChecker: async (command, args) => {
      seen.push([command, args]);
      return { ok: true, detail: "ok" };
    }
  });
  assert.equal(readiness.enabled, true);
  assert.equal(readiness.canRunVideoGeneration, true);
  assert.equal(readiness.checks.ytDlpRuntime.ok, true);
  assert.equal(readiness.checks.ffmpeg.ok, true);
  assert.equal(readiness.checks.ffprobe.ok, true);
  assert.equal(readiness.checks.localWhisperRuntime.ok, true);
  assert.equal(readiness.checks.tikhubApiKey.ok, true);
  assert.equal(readiness.checks.qwenApiKey.ok, true);
  assert.deepEqual(seen.map((item) => item[0]), ["python3", "ffmpeg", "ffprobe", "python3"]);
});

test("does not expose secret values in readiness output", async () => {
  const readiness = await buildVideoRuntimeReadiness({
    env: {
      VIDEO_LINK_ENABLED: "1",
      TIKHUB_API_KEY: "secret-tikhub",
      QWEN_API_KEY: "secret-qwen"
    },
    commandChecker: async () => ({ ok: false, detail: "missing" })
  });
  const serialized = JSON.stringify(readiness);
  assert.equal(serialized.includes("secret-tikhub"), false);
  assert.equal(serialized.includes("secret-qwen"), false);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
node --test backend/src/media/videoRuntimeReadiness.test.js
```

Expected: FAIL because `backend/src/media/videoRuntimeReadiness.js` does not exist.

- [ ] **Step 3: Implement readiness builder**

Create `backend/src/media/videoRuntimeReadiness.js`:

```js
import { spawn } from "node:child_process";

export async function buildVideoRuntimeReadiness({
  env = process.env,
  commandChecker = checkCommand
} = {}) {
  const videoLinkEnabled = readBooleanFlag(env.VIDEO_LINK_ENABLED, true);
  const ytDlpEnabled = readBooleanFlag(env.VIDEO_YTDLP_ENABLED, true);
  const asrProvider = String(env.VIDEO_ASR_PROVIDER || (env.OPENAI_API_KEY ? "openai" : "local_whisper")).trim();
  const frameProvider = String(env.VIDEO_FRAME_PROVIDER || "none").trim();
  const visualProvider = String(env.VIDEO_VISUAL_PROVIDER || "none").trim();
  const pythonPath = String(env.YT_DLP_PYTHON || env.LOCAL_WHISPER_PYTHON || env.PYTHON_PATH || "python3");
  const ffmpegPath = String(env.FFMPEG_PATH || "ffmpeg");
  const ffprobePath = String(env.FFPROBE_PATH || "ffprobe");

  const checks = {
    videoLinkEnabled: {
      ok: videoLinkEnabled,
      detail: videoLinkEnabled ? "enabled" : "disabled"
    },
    tikhubApiKey: {
      ok: Boolean(String(env.TIKHUB_API_KEY || "").trim()),
      detail: String(env.TIKHUB_API_KEY || "").trim() ? "set" : "missing"
    }
  };

  if (ytDlpEnabled) {
    checks.ytDlpRuntime = await commandChecker(pythonPath, ["-m", "yt_dlp", "--version"]);
  } else {
    checks.ytDlpRuntime = { ok: true, detail: "disabled" };
  }

  if (["local_whisper", "faster_whisper"].includes(asrProvider)) {
    checks.localWhisperRuntime = await commandChecker(pythonPath, ["-c", "import faster_whisper; print('ok')"]);
  } else if (asrProvider === "openai") {
    checks.openAiAsrApiKey = {
      ok: Boolean(String(env.OPENAI_API_KEY || "").trim()),
      detail: String(env.OPENAI_API_KEY || "").trim() ? "set" : "missing"
    };
  } else {
    checks.localWhisperRuntime = { ok: false, detail: `unsupported_asr_provider:${asrProvider}` };
  }

  if (frameProvider === "crv_style_ffmpeg" || visualProvider !== "none") {
    checks.ffmpeg = await commandChecker(ffmpegPath, ["-version"]);
    checks.ffprobe = await commandChecker(ffprobePath, ["-version"]);
  } else {
    checks.ffmpeg = { ok: true, detail: "not_required" };
    checks.ffprobe = { ok: true, detail: "not_required" };
  }

  if (visualProvider === "qwen-vl" || visualProvider === "qwen" || visualProvider === "qwen3-vl") {
    checks.qwenApiKey = {
      ok: Boolean(String(env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "").trim()),
      detail: String(env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "").trim() ? "set" : "missing"
    };
  } else {
    checks.qwenApiKey = { ok: true, detail: "not_required" };
  }

  const canRunVideoGeneration = videoLinkEnabled && Object.values(checks).every((item) => item.ok);
  return {
    enabled: videoLinkEnabled,
    canRunVideoGeneration,
    providers: {
      source: ytDlpEnabled ? "tikhub+yt-dlp" : "tikhub",
      asr: asrProvider,
      frame: frameProvider,
      visual: visualProvider
    },
    checks
  };
}

function checkCommand(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, detail: "timeout" });
    }, 5000);
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({ ok: false, detail: error.code || error.message || "error" });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        detail: code === 0 ? "ok" : truncate(stderr || `exit_${code}`)
      });
    });
  });
}

function readBooleanFlag(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return !["0", "false", "off", "disabled", "no"].includes(String(value).trim().toLowerCase());
}

function truncate(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 180);
}
```

- [ ] **Step 4: Add readiness to service capabilities**

Modify `backend/src/serviceCapabilities.js` so `buildServiceCapabilities` accepts an optional `videoRuntime` argument and returns it under `sources.runtime`.

Use this shape:

```js
sources: {
  ...buildSourceCapabilities(),
  runtime: videoRuntime || null
}
```

- [ ] **Step 5: Update service capabilities test**

Modify `backend/src/tests/serviceCapabilities.test.js` to assert:

```js
assert.equal(capabilities.sources.sourceTypes.video_link.enabled, true);
assert.equal(capabilities.sources.runtime.canRunVideoGeneration, true);
```

Call `buildServiceCapabilities({ videoRuntime: { canRunVideoGeneration: true, checks: {} } })` if the function already accepts an options object; otherwise update the function signature in the same task.

- [ ] **Step 6: Add test command to video source check**

Modify `backend/package.json` `check:video-source` script to include:

```bash
node --check src/media/videoRuntimeReadiness.js
node --test src/media/videoRuntimeReadiness.test.js
```

- [ ] **Step 7: Verify**

Run:

```bash
npm --prefix backend run check:video-source
```

Expected: all video tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/media/videoRuntimeReadiness.js backend/src/media/videoRuntimeReadiness.test.js backend/src/serviceCapabilities.js backend/src/tests/serviceCapabilities.test.js backend/package.json
git commit -m "feat: add video runtime readiness"
```

## Task 3: Production Readiness Gate For Video

**Files:**
- Modify: `backend/scripts/production-readiness-gate.mjs`
- Test: run against local server and production server

- [ ] **Step 1: Add video gate arguments**

Modify the top of `backend/scripts/production-readiness-gate.mjs`:

```js
const requireVideo = args["require-video"] === "1";
const videoPreflightUrl = args["video-preflight-url"] || "https://www.bilibili.com/video/BV1hYGd63EnU/";
```

- [ ] **Step 2: Check source capabilities when required**

After the existing capability checks, add:

```js
if (requireVideo) {
  checks.push(check(
    "capability_sources_present",
    Boolean(health?.capabilities?.sources),
    "health.capabilities.sources must be present"
  ));
  checks.push(check(
    "capability_video_link_enabled",
    health?.capabilities?.sources?.sourceTypes?.video_link?.enabled === true,
    "health.capabilities.sources.sourceTypes.video_link.enabled must be true"
  ));
  checks.push(check(
    "video_runtime_ready",
    health?.capabilities?.sources?.runtime?.canRunVideoGeneration === true,
    "health.capabilities.sources.runtime.canRunVideoGeneration must be true"
  ));
}
```

- [ ] **Step 3: Add video preflight smoke**

Before `printReport`, add:

```js
if (requireVideo && health?.capabilities?.sources?.sourceTypes?.video_link?.enabled === true) {
  try {
    const preflight = await fetchJson(`${baseUrl}/api/sources/preflight`, 20_000, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: videoPreflightUrl, fetchMetadata: false })
    });
    checks.push(check(
      "video_preflight_smoke",
      preflight?.sourceType === "video_link" && preflight?.canGenerate === true,
      "POST /api/sources/preflight must classify a known video link"
    ));
  } catch (error) {
    checks.push(check("video_preflight_smoke", false, error.message));
  }
}
```

Update `fetchJson` signature:

```js
async function fetchJson(url, timeoutMs, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Verify old production fails video-required gate**

Run:

```bash
node backend/scripts/production-readiness-gate.mjs \
  --base-url https://shibei-production.up.railway.app \
  --require-video 1
```

Expected before deploy: FAIL on missing `capability_sources_present`.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/production-readiness-gate.mjs
git commit -m "chore: gate production video readiness"
```

## Task 4: Deployment Input Guard And Config Checklist

**Files:**
- Modify: `tools/production-deploy-inputs-guard.mjs`
- Create: `docs/production-readiness-evidence/video-railway-deploy-inputs.template.md`

- [ ] **Step 1: Add required video secret presence fields**

Modify `tools/production-deploy-inputs-guard.mjs` `secretLabels` so it includes:

```js
"`TIKHUB_API_KEY` when video enabled",
"`QWEN_API_KEY` or `DASHSCOPE_API_KEY` when visual enabled"
```

- [ ] **Step 2: Add required video config fields**

In `checkRequiredFields`, add:

```js
["Video config source", "video_config_source"],
["Video runtime strategy", "video_runtime_strategy"],
["Video ASR provider", "video_asr_provider"],
["Video visual provider", "video_visual_provider"],
["Video max duration seconds", "video_max_duration_seconds"]
```

These fields document the expected defaults and runtime strategy. They do not require manually setting `VIDEO_*` variables in Railway.

- [ ] **Step 3: Create deployment inputs template**

Create `docs/production-readiness-evidence/video-railway-deploy-inputs.template.md`:

```md
# V2 Production Deploy Inputs

- PR: 
- Candidate commit: 
- `V2 Production Readiness` run URL: 
- Operator: 
- Date/time: 
- Production base URL: https://shibei-production.up.railway.app
- Railway project: 
- Railway environment: production
- Railway service name: 
- Railway service id: 
- Connected branch: 
- Autodeploy state: 
- Current production deployment id: 
- Rollback method: Railway rollback to previous deployment
- Rollback command or console path: Railway Console > Deployments > previous deployment > Redeploy
- Rollback owner: 
- Data strategy: preserve-data
- Old production data status: existing beta data
- Old data export reference: 
- Old data export created/verified at: 
- Backup/snapshot reference: 
- Backup created/verified at: 
- Restore method: Railway Postgres restore from selected backup/snapshot
- Restore owner: 
- Restore rehearsal status: 
- First deploy should use smoke after gate: no
- Reason to proceed: 
- Known risks: 
- Confirmation phrase for workflow: deploy-v2-production
- Rollback confirmation phrase for workflow: rollback-ready

## Required Secret Presence

- `RAILWAY_TOKEN`: 
- `DATABASE_URL`: 
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`: 
- `AI_PROVIDER`: 
- model env (`DEEPSEEK_MODEL` or `OPENAI_MODEL`): 
- APNS env set for production bundle: 
- `TIKHUB_API_KEY` when video enabled: 
- `QWEN_API_KEY` or `DASHSCOPE_API_KEY` when visual enabled: 

## Video Runtime

- Video config source: code defaults with optional Railway override
- Video runtime strategy: Railpack Python venv + ffmpeg package
- Video ASR provider: default `local_whisper`
- Video visual provider: default `qwen-vl`
- Video max duration seconds: default `900`
```

- [ ] **Step 4: Verify guard with copied sample**

Copy the template to a dated file, fill only non-secret presence values, and run:

```bash
node tools/production-deploy-inputs-guard.mjs \
  --inputs docs/production-readiness-evidence/2026-07-09-video-railway-deploy-inputs.md
```

Expected: PASS only when all required fields are filled and secret fields are marked `yes`.

- [ ] **Step 5: Commit**

```bash
git add tools/production-deploy-inputs-guard.mjs docs/production-readiness-evidence/video-railway-deploy-inputs.template.md
git commit -m "docs: require video railway deploy inputs"
```

## Task 5: Branch And Deployment Safety Runbook

**Files:**
- Create: `docs/video-railway-beta-deploy-runbook-zh.md`
- Modify: `docs/iteration-records/2026-07-08-video-user-entry-productionization.md`

- [ ] **Step 1: Write branch risk section**

Create `docs/video-railway-beta-deploy-runbook-zh.md` with:

```md
# 视频功能 Railway 内测部署 Runbook

## 分支风险

- 当前候选分支是 `codex/test-feature-env-20260705`，不要从本地 `master` 部署。
- 部署前运行 `git fetch origin --prune`。
- 部署前运行 `git log --oneline HEAD..origin/master`，必须为空。
- 部署前运行 `git branch -r --contains HEAD`。如果为空，说明当前候选 commit 还没有推到远端，Railway 不能部署到这版。
- 部署前记录 `git rev-parse HEAD`，并把它填入部署输入文件的 `Candidate commit`。
- Railway `/api/health` 必须返回同一个 candidate commit；如果 git commit 为空，需要用 Railway deployment id 作为临时追踪，但上线后应补 commit 注入。

## 后端先行

1. 先部署后端。
2. 后端 smoke 通过后再分发 iOS beta。
3. 如果 iOS 先发而后端还是旧版本，`/api/sources/preflight` 会失败，用户无法稳定粘贴视频链接。

## Railway 手动变量

不要把 secret 写入 Git。Railway 当前已经确认存在：

- `TIKHUB_API_KEY`
- `QWEN_API_KEY`
- `DEEPSEEK_API_KEY`
- `DATABASE_URL`
- `AI_PROVIDER`
- `DEEPSEEK_MODEL`

正常内测路径不需要手动配置 `VIDEO_*`。这些变量只保留为可选的生产 override 或 kill switch。

## 部署后 smoke

```bash
node backend/scripts/production-readiness-gate.mjs \
  --base-url https://shibei-production.up.railway.app \
  --require-video 1
```

然后使用一个短视频链接跑真实生成，记录 HTML 报告路径、TikHub 调用次数、Qwen tokens、DeepSeek tokens。
```

- [ ] **Step 2: Link runbook from iteration record**

Append to `docs/iteration-records/2026-07-08-video-user-entry-productionization.md`:

```md
## Deployment Follow-up

Before Railway beta deployment, follow `docs/video-railway-beta-deploy-runbook-zh.md` and `docs/superpowers/plans/2026-07-09-video-railway-predeployment-hardening.md`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/video-railway-beta-deploy-runbook-zh.md docs/iteration-records/2026-07-08-video-user-entry-productionization.md
git commit -m "docs: add video railway deploy runbook"
```

## Task 6: Deploy And Smoke

**Files:**
- No code changes.
- Produce evidence under `docs/production-readiness-evidence/`.

- [ ] **Step 1: Push candidate branch**

Run:

```bash
git push origin codex/test-feature-env-20260705
```

Expected: GitHub has the candidate branch. `git branch -r --contains HEAD` includes `origin/codex/test-feature-env-20260705`.

- [ ] **Step 2: Confirm Railway variables**

Railway CLI/console checklist:

```text
DATABASE_URL=yes
DEEPSEEK_API_KEY=yes
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-v4-flash
TIKHUB_API_KEY=yes
QWEN_API_KEY=yes
```

Do not require `VIDEO_*` variables for the normal beta path. Product defaults come from code. Add `VIDEO_*` variables only when intentionally overriding defaults or temporarily disabling a subsystem.

- [ ] **Step 3: Deploy backend to Railway**

Use Railway console or the project’s existing deploy workflow. Record:

```text
Railway deployment id:
Connected branch:
Candidate commit:
Rollback deployment id:
```

- [ ] **Step 4: Run backend readiness**

Run:

```bash
node backend/scripts/production-readiness-gate.mjs \
  --base-url https://shibei-production.up.railway.app \
  --require-video 1 \
  --markdown-out docs/production-readiness-evidence/2026-07-09-video-railway-readiness.md \
  --json-out docs/production-readiness-evidence/2026-07-09-video-railway-readiness.json
```

Expected: PASS.

- [ ] **Step 5: Run source preflight smoke**

Run:

```bash
curl -sS -X POST https://shibei-production.up.railway.app/api/sources/preflight \
  -H 'content-type: application/json' \
  --data '{"input":"https://www.bilibili.com/video/BV1hYGd63EnU/","fetchMetadata":true}'
```

Expected:

```json
{
  "sourceType": "video_link",
  "platform": "bilibili",
  "provider": "yt-dlp",
  "canGenerate": true
}
```

- [ ] **Step 6: Run one real generation**

Use the existing backend quality runner against Railway or a controlled iOS beta device. Record:

```text
Input link:
Status:
Unit count:
Question count:
TikHub call count:
Qwen visual tokens:
DeepSeek tokens:
HTML report path:
```

- [ ] **Step 7: Commit evidence**

```bash
git add docs/production-readiness-evidence/2026-07-09-video-railway-readiness.md docs/production-readiness-evidence/2026-07-09-video-railway-readiness.json
git commit -m "docs: record video railway readiness"
```

## Self-Review

- Spec coverage: The plan covers branch risk documentation, Railway runtime dependencies, manual Railway variables, backend readiness, deployment order, and iOS beta sequencing.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain. Secret values are intentionally represented as `<set in Railway console>` and must not be committed.
- Type consistency: The readiness object consistently uses `enabled`, `canRunVideoGeneration`, `providers`, and `checks`.
- Remaining unknown: Railpack video runtime package syntax must be verified by a Railway build because local Railway CLI can inspect the project but does not execute the remote build image locally.
