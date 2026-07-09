import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMemoizedVideoRuntimeReadiness,
  buildVideoRuntimeReadiness
} from "./videoRuntimeReadiness.js";

test("reports video runtime ready with configured production defaults", async () => {
  const commands = [];
  const readiness = await buildVideoRuntimeReadiness({
    env: {
      TIKHUB_API_KEY: "secret-tikhub",
      QWEN_API_KEY: "secret-qwen"
    },
    runCommand: async (input) => {
      commands.push(input.name);
      return { ok: true, skipped: false, detail: `${input.name} ok` };
    }
  });

  assert.equal(readiness.ok, true);
  assert.equal(readiness.resolved.maxDurationSeconds, 900);
  assert.equal(readiness.resolved.asrProvider, "local_whisper");
  assert.equal(readiness.resolved.frameProvider, "crv_style_ffmpeg");
  assert.equal(readiness.resolved.visualProvider, "qwen-vl");
  assert.deepEqual(commands.sort(), ["faster-whisper", "ffmpeg", "ffprobe", "python", "yt-dlp"].sort());
  assert.equal(JSON.stringify(readiness).includes("secret-tikhub"), false);
  assert.equal(JSON.stringify(readiness).includes("secret-qwen"), false);
});

test("fails readiness when required video secrets are missing", async () => {
  const readiness = await buildVideoRuntimeReadiness({
    env: {},
    runCommand: async (input) => ({ ok: true, skipped: false, detail: `${input.name} ok` })
  });

  assert.equal(readiness.ok, false);
  assert.equal(readiness.checks.tikhubApiKey.ok, false);
  assert.equal(readiness.checks.qwenApiKey.ok, false);
});

test("skips provider checks when video is disabled", async () => {
  const readiness = await buildVideoRuntimeReadiness({
    env: { VIDEO_LINK_ENABLED: "0" },
    runCommand: async () => {
      throw new Error("should not run command checks");
    }
  });

  assert.equal(readiness.ok, false);
  assert.equal(readiness.checks.videoLinkEnabled.ok, false);
  assert.equal(readiness.checks.ffmpeg.skipped, true);
  assert.equal(readiness.checks.ffprobe.skipped, true);
  assert.equal(readiness.checks.python.skipped, true);
  assert.equal(readiness.checks.ytDlp.skipped, true);
});

test("flags duration override that drifts from product limit", async () => {
  const readiness = await buildVideoRuntimeReadiness({
    env: {
      VIDEO_MAX_DURATION_SECONDS: "1200",
      TIKHUB_API_KEY: "secret-tikhub",
      QWEN_API_KEY: "secret-qwen"
    },
    runCommand: async (input) => ({ ok: true, skipped: false, detail: `${input.name} ok` })
  });

  assert.equal(readiness.ok, false);
  assert.equal(readiness.checks.maxDurationSeconds.ok, false);
  assert.equal(readiness.resolved.maxDurationSeconds, 1200);
});

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
