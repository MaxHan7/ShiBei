import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMediaExtractionError } from "./mediaErrors.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";

const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.YT_DLP_DOWNLOAD_TIMEOUT_MS, 180_000);
const DEFAULT_FORMAT_SELECTOR = process.env.YT_DLP_FORMAT_SELECTOR || "bv*+ba/best";
const DEFAULT_MAX_BYTES = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, VIDEO_DEFAULTS.mediaMaxBytes);

export async function downloadYtDlpMediaToTempFile({
  sourceUrl,
  pythonPath = process.env.YT_DLP_PYTHON || process.env.PYTHON_PATH || "python3",
  formatSelector = DEFAULT_FORMAT_SELECTOR,
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  spawnImpl = spawn,
  tmpRoot = tmpdir()
} = {}) {
  if (!sourceUrl) {
    throw createMediaExtractionError("video_media_unavailable", "通用视频下载缺少原始链接。", {
      retryable: false,
      provider: "yt-dlp"
    });
  }
  const dir = join(tmpRoot, `shibei-ytdlp-${randomUUID()}`);
  try {
    await mkdir(dir, { recursive: true });
    await runYtDlpDownload({
      sourceUrl,
      pythonPath,
      formatSelector,
      timeoutMs,
      outputTemplate: join(dir, "source-video.%(ext)s"),
      spawnImpl
    });
    const file = await findDownloadedMediaFile(dir);
    if (file.bytes > maxBytes) {
      throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
        retryable: false,
        provider: "yt-dlp"
      });
    }
    return {
      path: file.path,
      dir,
      bytes: file.bytes,
      contentType: contentTypeForPath(file.path),
      sourceUrl
    };
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

function runYtDlpDownload({
  sourceUrl,
  pythonPath,
  formatSelector,
  timeoutMs,
  outputTemplate,
  spawnImpl
}) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawnImpl(pythonPath, [
      "-m",
      "yt_dlp",
      "--no-playlist",
      "--no-warnings",
      "--no-progress",
      "--format",
      formatSelector,
      "--merge-output-format",
      "mp4",
      "-o",
      outputTemplate,
      sourceUrl
    ], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill?.("SIGKILL");
      rejectCommand(createMediaExtractionError("video_media_timeout", "通用视频下载超时，请稍后重试。", {
        retryable: true,
        provider: "yt-dlp"
      }));
    }, timeoutMs);

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectCommand(classifyYtDlpDownloadFailure(error, stderr));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code !== 0) {
        rejectCommand(classifyYtDlpDownloadFailure(null, stderr, code));
        return;
      }
      resolveCommand();
    });
  });
}

async function findDownloadedMediaFile(dir) {
  const entries = await readdir(dir);
  const candidates = [];
  for (const entry of entries) {
    if (entry.endsWith(".part") || entry.endsWith(".ytdl") || entry.endsWith(".json")) continue;
    const path = join(dir, entry);
    const fileStat = await stat(path).catch(() => null);
    if (fileStat?.isFile() && fileStat.size > 0) {
      candidates.push({ path, bytes: fileStat.size });
    }
  }
  candidates.sort((a, b) => b.bytes - a.bytes);
  const file = candidates[0];
  if (!file) {
    throw createMediaExtractionError("video_media_unavailable", "通用视频下载没有生成可用文件。", {
      retryable: true,
      provider: "yt-dlp"
    });
  }
  return file;
}

function classifyYtDlpDownloadFailure(error, stderr = "", code = null) {
  const message = String(stderr || error?.message || "");
  const missingRuntime = error?.code === "ENOENT"
    || /No module named ['"]?yt_dlp|ModuleNotFoundError/i.test(message);
  if (missingRuntime) {
    return createMediaExtractionError("provider_config_missing", "通用视频下载环境暂未配置，请安装 yt-dlp 后重试。", {
      retryable: false,
      provider: "yt-dlp",
      cause: error || null,
      status: code
    });
  }
  if (/Unsupported URL|No video formats|Private video|login|Sign in|This video is unavailable/i.test(message)) {
    return createMediaExtractionError("video_media_unavailable", "这个视频链接暂时无法公开下载。可以换一个公开视频链接。", {
      retryable: false,
      provider: "yt-dlp",
      status: code
    });
  }
  return createMediaExtractionError("video_media_unavailable", "通用视频下载暂时失败，请稍后重试。", {
    retryable: true,
    provider: "yt-dlp",
    cause: error || null,
    status: code
  });
}

function contentTypeForPath(path) {
  const lowercased = String(path || "").toLowerCase();
  if (lowercased.endsWith(".webm")) return "video/webm";
  if (lowercased.endsWith(".mov")) return "video/quicktime";
  if (lowercased.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  return "video/mp4";
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
