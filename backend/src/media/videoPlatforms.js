import { createMediaExtractionError } from "./mediaErrors.js";

const DOUYIN_HOSTS = ["douyin.com", "v.douyin.com"];
const XIAOHONGSHU_HOSTS = ["xiaohongshu.com", "xhslink.com"];

export function normalizeVideoSourceUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw createMediaExtractionError(
      "invalid_video_url",
      "这不是有效的视频链接。请粘贴 http 或 https 开头的公开视频链接。",
      { retryable: false }
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw createMediaExtractionError(
      "invalid_video_url",
      "视频链接必须是 http 或 https 开头。",
      { retryable: false }
    );
  }

  return url;
}

export function detectVideoPlatform(value) {
  let url;
  try {
    url = normalizeVideoSourceUrl(value);
  } catch {
    return "unknown";
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (DOUYIN_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return "douyin";
  }
  if (XIAOHONGSHU_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return "xiaohongshu";
  }
  return "unknown";
}
