import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createMediaExtractionError } from "./mediaErrors.js";

const DEFAULT_MAX_BYTES = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, 150 * 1024 * 1024);
const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_MEDIA_FETCH_TIMEOUT_MS, 60_000);

export async function downloadMediaToTempFile({
  mediaUrl,
  fetchImpl = fetch,
  maxBytes = DEFAULT_MAX_BYTES,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(mediaUrl, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) {
      throw createMediaExtractionError("video_media_unavailable", "视频内容暂时无法读取，请稍后重试。", {
        retryable: response.status >= 500,
        status: response.status
      });
    }
    const contentType = response.headers?.get?.("content-type") || response.headers?.get?.("Content-Type") || "";
    const contentLength = readContentLength(response.headers);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
        retryable: false
      });
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw createMediaExtractionError("video_media_too_large", "视频文件过大，暂时无法生成复习内容。", {
        retryable: false
      });
    }
    const dir = join(tmpdir(), `shibei-video-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, "source-video");
    await writeFile(path, buffer);
    return { path, dir, bytes: buffer.byteLength, contentType, sourceUrl: mediaUrl };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("video_media_timeout", "读取视频内容超时，请稍后重试。", {
        retryable: true
      });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("video_media_unavailable", "视频内容暂时无法读取，请稍后重试。", {
      retryable: true,
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function cleanupMediaTempFiles(...files) {
  const dirs = files.flat().map((file) => file?.dir).filter(Boolean);
  await Promise.all([...new Set(dirs)].map((dir) => rm(dir, { recursive: true, force: true }).catch(() => {})));
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function readContentLength(headers) {
  const value = headers?.get?.("content-length") || headers?.get?.("Content-Length") || "";
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}
