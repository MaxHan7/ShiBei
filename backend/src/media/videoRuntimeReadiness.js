import { spawn } from "node:child_process";

import { buildSourceCapabilities } from "../sources/sourcePreflight.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";
import { resolveSpeechToTextProviderName } from "./speechToTextProvider.js";
import { resolveVideoFramePackProviderName } from "./videoFramePackProvider.js";
import { resolveVisualUnderstandingProviderName } from "./visualUnderstandingProvider.js";

const DEFAULT_COMMAND_TIMEOUT_MS = 5_000;
let cachedReadiness = null;
let cachedReadinessAt = 0;

export async function buildVideoRuntimeReadiness({
  env = process.env,
  runCommand = runCommandCheck
} = {}) {
  const sourceCapabilities = buildSourceCapabilities({ env });
  const videoLink = sourceCapabilities.sourceTypes.video_link;
  const asrProvider = resolveSpeechToTextProviderName(env);
  const frameProvider = resolveVideoFramePackProviderName(env);
  const visualProvider = resolveVisualUnderstandingProviderName(env);
  const ytDlpEnabled = Boolean(videoLink.platforms.youtube?.enabled || videoLink.platforms.bilibili?.enabled || videoLink.platforms.generic_web?.enabled);
  const tikhubEnabled = Boolean(videoLink.platforms.douyin?.enabled || videoLink.platforms.xiaohongshu?.enabled);
  const needsFfmpeg = videoLink.enabled && (asrProvider === "local_whisper" || frameProvider === "crv_style_ffmpeg");
  const needsFfprobe = videoLink.enabled && frameProvider === "crv_style_ffmpeg";
  const needsPython = videoLink.enabled && (asrProvider === "local_whisper" || ytDlpEnabled);
  const pythonPath = env.LOCAL_WHISPER_PYTHON || env.YT_DLP_PYTHON || env.PYTHON_PATH || "python3";

  const checks = {
    videoLinkEnabled: staticCheck(videoLink.enabled, "视频链接能力已开启。", "视频链接能力已关闭。"),
    maxDurationSeconds: staticCheck(
      videoLink.maxDurationSeconds === VIDEO_DEFAULTS.maxDurationSeconds,
      `视频长度限制为 ${videoLink.maxDurationSeconds} 秒。`,
      `视频长度限制为 ${videoLink.maxDurationSeconds} 秒，预期为 ${VIDEO_DEFAULTS.maxDurationSeconds} 秒。`
    ),
    tikhubApiKey: staticCheck(
      !tikhubEnabled || Boolean(env.TIKHUB_API_KEY),
      tikhubEnabled ? "TikHub key 已配置。" : "TikHub 平台未启用。",
      "TikHub key 未配置。"
    ),
    qwenApiKey: staticCheck(
      !videoLink.enabled || !isQwenVisualProvider(visualProvider) || Boolean(env.QWEN_API_KEY || env.DASHSCOPE_API_KEY),
      videoLink.enabled && isQwenVisualProvider(visualProvider) ? "Qwen VL key 已配置。" : "Qwen VL 未启用。",
      "Qwen VL key 未配置。"
    ),
    ffmpeg: needsFfmpeg
      ? await runCommand({ name: "ffmpeg", command: env.FFMPEG_PATH || "ffmpeg", args: ["-version"] })
      : skippedCheck("当前视频配置不需要 ffmpeg。"),
    ffprobe: needsFfprobe
      ? await runCommand({ name: "ffprobe", command: env.FFPROBE_PATH || "ffprobe", args: ["-version"] })
      : skippedCheck("当前视频配置不需要 ffprobe。"),
    python: needsPython
      ? await runCommand({ name: "python", command: pythonPath, args: ["--version"] })
      : skippedCheck("当前视频配置不需要 Python。"),
    ytDlp: ytDlpEnabled
      ? await runCommand({ name: "yt-dlp", command: env.YT_DLP_PYTHON || env.PYTHON_PATH || "python3", args: ["-m", "yt_dlp", "--version"] })
      : skippedCheck("yt-dlp 平台未启用。"),
    fasterWhisper: videoLink.enabled && asrProvider === "local_whisper"
      ? await runCommand({ name: "faster-whisper", command: pythonPath, args: ["-c", "import faster_whisper"] })
      : skippedCheck("local whisper 未启用。")
  };

  return {
    ok: Object.values(checks).every((item) => item.ok || item.skipped),
    source: ytDlpEnabled ? "tikhub+yt-dlp" : "tikhub",
    defaults: {
      maxDurationSeconds: VIDEO_DEFAULTS.maxDurationSeconds,
      asrProvider: VIDEO_DEFAULTS.asrProvider,
      frameProvider: VIDEO_DEFAULTS.frameProvider,
      visualProvider: VIDEO_DEFAULTS.visualProvider,
      visualModel: VIDEO_DEFAULTS.visualModel
    },
    resolved: {
      maxDurationSeconds: videoLink.maxDurationSeconds,
      asrProvider,
      frameProvider,
      visualProvider,
      visualModel: env.VIDEO_VISUAL_MODEL || env.QWEN_VL_MODEL || VIDEO_DEFAULTS.visualModel,
      ytDlpEnabled,
      tikhubEnabled
    },
    checks
  };
}

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

function staticCheck(ok, passDetail, failDetail) {
  return {
    ok: Boolean(ok),
    skipped: false,
    detail: ok ? passDetail : failDetail
  };
}

function skippedCheck(detail) {
  return {
    ok: true,
    skipped: true,
    detail
  };
}

function isQwenVisualProvider(provider) {
  return ["qwen-vl", "qwen", "qwen3-vl"].includes(provider);
}

export function runCommandCheck({
  name,
  command,
  args = [],
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
  spawnImpl = spawn
} = {}) {
  return new Promise((resolveCheck) => {
    const child = spawnImpl(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill?.("SIGKILL");
      resolveCheck({ ok: false, skipped: false, detail: `${name} 检查超时。` });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveCheck({ ok: false, skipped: false, detail: `${name} 不可用：${sanitizeMessage(error?.message)}` });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolveCheck({ ok: true, skipped: false, detail: `${name} 可用。` });
        return;
      }
      resolveCheck({
        ok: false,
        skipped: false,
        detail: `${name} 检查失败：${sanitizeMessage(stderr || stdout || `exit ${code}`)}`
      });
    });
  });
}

function sanitizeMessage(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .slice(0, 180)
    .trim();
}
