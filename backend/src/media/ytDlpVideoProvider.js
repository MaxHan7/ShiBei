import { spawn } from "node:child_process";

import { createMediaExtractionError } from "./mediaErrors.js";
import { normalizeSubtitleTracks } from "./platformSubtitles.js";
import { detectVideoPlatform, normalizeVideoSourceUrl } from "./videoPlatforms.js";

const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.YT_DLP_INFO_TIMEOUT_MS, 45_000);
const DEFAULT_FORMAT_SELECTOR = process.env.YT_DLP_FORMAT_SELECTOR || "bv*+ba/best";

export async function fetchYtDlpVideoSource({
  sourceUrl,
  pythonPath = process.env.YT_DLP_PYTHON || process.env.PYTHON_PATH || "python3",
  formatSelector = DEFAULT_FORMAT_SELECTOR,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  spawnImpl = spawn
} = {}) {
  const url = normalizeVideoSourceUrl(sourceUrl);
  const platform = detectVideoPlatform(url.href);
  const payload = await runYtDlpJson({
    sourceUrl: url.href,
    pythonPath,
    formatSelector,
    timeoutMs,
    spawnImpl
  });
  return normalizeYtDlpPayload(payload, {
    sourceUrl: url.href,
    platform,
    formatSelector
  });
}

function runYtDlpJson({
  sourceUrl,
  pythonPath,
  formatSelector,
  timeoutMs,
  spawnImpl
}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawnImpl(pythonPath, [
      "-m",
      "yt_dlp",
      "-J",
      "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "--format",
      formatSelector,
      sourceUrl
    ], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill?.("SIGKILL");
      rejectCommand(createMediaExtractionError("provider_timeout", "通用视频取源服务响应超时，请稍后重试。", {
        retryable: true,
        provider: "yt-dlp"
      }));
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
      rejectCommand(classifyYtDlpFailure(error, stderr));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        rejectCommand(classifyYtDlpFailure(null, stderr, code));
        return;
      }
      try {
        resolveCommand(JSON.parse(stdout));
      } catch (error) {
        rejectCommand(createMediaExtractionError("provider_unavailable", "通用视频取源返回格式异常，请稍后重试。", {
          retryable: true,
          provider: "yt-dlp",
          cause: error
        }));
      }
    });
  });
}

function normalizeYtDlpPayload(payload, { sourceUrl, platform, formatSelector }) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createMediaExtractionError("provider_unavailable", "通用视频取源没有返回可用内容。", {
      retryable: true,
      provider: "yt-dlp"
    });
  }
  const webpageUrl = stringValue(payload.webpage_url || payload.original_url || sourceUrl);
  return {
    provider: "yt-dlp",
    platform,
    providerContentId: stringValue(payload.id || hashFallback(webpageUrl)),
    title: stringValue(payload.title || platformLabel(platform)),
    description: stringValue(payload.description || ""),
    account: stringValue(payload.uploader || payload.channel || payload.creator || payload.uploader_id || ""),
    sourceUrl: webpageUrl || sourceUrl,
    mediaUrl: webpageUrl || sourceUrl,
    coverUrl: stringValue(payload.thumbnail || firstThumbnail(payload.thumbnails)),
    durationSeconds: finiteNumber(payload.duration),
    subtitles: normalizeSubtitleTracks({
      ...(payload.subtitles || {}),
      ...(payload.automatic_captions || {})
    }),
    mediaDownload: {
      provider: "yt-dlp",
      sourceUrl: webpageUrl || sourceUrl,
      formatSelector
    }
  };
}

function classifyYtDlpFailure(error, stderr = "", code = null) {
  const message = String(stderr || error?.message || "");
  const missingRuntime = error?.code === "ENOENT"
    || /No module named ['"]?yt_dlp|ModuleNotFoundError/i.test(message);
  if (missingRuntime) {
    return createMediaExtractionError("provider_config_missing", "通用视频取源环境暂未配置，请安装 yt-dlp 后重试。", {
      retryable: false,
      provider: "yt-dlp",
      cause: error || null,
      status: code
    });
  }
  if (/Unsupported URL|No video formats|Private video|login|Sign in|This video is unavailable/i.test(message)) {
    return createMediaExtractionError("unsupported_video_platform", "这个视频链接暂时无法公开提取。可以换一个公开视频链接。", {
      retryable: false,
      provider: "yt-dlp",
      status: code
    });
  }
  return createMediaExtractionError("provider_unavailable", "通用视频取源服务暂时不可用，请稍后重试。", {
    retryable: true,
    provider: "yt-dlp",
    cause: error || null,
    status: code
  });
}

function firstThumbnail(thumbnails) {
  if (!Array.isArray(thumbnails)) return "";
  const sorted = [...thumbnails].sort((a, b) => Number(b?.preference || 0) - Number(a?.preference || 0));
  return sorted.find((item) => item?.url)?.url || "";
}

function platformLabel(platform) {
  if (platform === "youtube") return "YouTube 视频";
  if (platform === "bilibili") return "哔哩哔哩视频";
  if (platform === "direct_video_file") return "视频文件";
  return "网页视频";
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

function stringValue(value) {
  return String(value || "").trim();
}

function hashFallback(value) {
  let hash = 0;
  for (const char of String(value || "")) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
