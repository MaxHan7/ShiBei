import { createMediaExtractionError } from "./mediaErrors.js";
import { normalizeSubtitleTracks } from "./platformSubtitles.js";
import {
  detectVideoPlatform,
  isTikHubPreferredPlatform,
  normalizeVideoSourceUrl
} from "./videoPlatforms.js";

const DEFAULT_TIKHUB_BASE_URL = process.env.TIKHUB_BASE_URL || "https://api.tikhub.io";
const DEFAULT_TIKHUB_TIMEOUT_MS = readPositiveInt(process.env.TIKHUB_TIMEOUT_MS, 30_000);

export async function fetchTikHubVideoSource({
  sourceUrl,
  apiKey = process.env.TIKHUB_API_KEY || "",
  baseUrl = DEFAULT_TIKHUB_BASE_URL,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIKHUB_TIMEOUT_MS
} = {}) {
  const url = normalizeVideoSourceUrl(sourceUrl);
  const platform = detectVideoPlatform(url.href);
  if (!isTikHubPreferredPlatform(platform)) {
    throw createMediaExtractionError(
      "unsupported_video_platform",
      "当前优先支持抖音和小红书公开视频链接。",
      { retryable: false, provider: "tikhub" }
    );
  }
  if (!apiKey) {
    throw createMediaExtractionError(
      "provider_config_missing",
      "视频取源服务暂未配置，请稍后再试。",
      { retryable: false, provider: "tikhub" }
    );
  }

  const endpoint = buildEndpoint({ platform, sourceUrl: url.href, baseUrl });
  const payload = await fetchJsonWithTimeout(endpoint, {
    headers: { authorization: `Bearer ${apiKey}` },
    timeoutMs,
    fetchImpl
  });

  return platform === "douyin"
    ? normalizeDouyinPayload(payload, url.href)
    : normalizeXiaohongshuPayload(payload, url.href);
}

function buildEndpoint({ platform, sourceUrl, baseUrl }) {
  const root = String(baseUrl || "").replace(/\/+$/, "");
  const params = new URLSearchParams();
  if (platform === "douyin") {
    params.set("share_url", sourceUrl);
    return `${root}/api/v1/douyin/app/v3/fetch_one_video_by_share_url?${params.toString()}`;
  }
  params.set("share_text", sourceUrl);
  return `${root}/api/v1/xiaohongshu/app_v2/get_video_note_detail?${params.toString()}`;
}

async function fetchJsonWithTimeout(url, { headers, timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw createMediaExtractionError(
        response.status === 429 ? "provider_rate_limited" : "provider_unavailable",
        "视频取源服务暂时不可用，请稍后重试。",
        {
          retryable: response.status === 429 || response.status >= 500,
          provider: "tikhub",
          status: response.status
        }
      );
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("provider_timeout", "视频取源服务响应超时，请稍后重试。", {
        retryable: true,
        provider: "tikhub"
      });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("provider_unavailable", "视频取源服务暂时不可用，请稍后重试。", {
      retryable: true,
      provider: "tikhub",
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeDouyinPayload(payload, sourceUrl) {
  const data = payload?.data?.aweme_detail || payload?.data || payload?.aweme_detail || payload;
  const mediaUrl = firstString(
    data?.video?.play_addr?.url_list,
    data?.video?.download_addr?.url_list,
    data?.video?.bit_rate?.flatMap((item) => item?.play_addr?.url_list || [])
  );
  if (!mediaUrl) throw mediaUnavailable();
  return {
    provider: "tikhub",
    platform: "douyin",
    providerContentId: stringValue(data?.aweme_id || data?.id),
    title: stringValue(data?.desc || data?.caption || "抖音视频"),
    description: stringValue(data?.desc || ""),
    account: stringValue(data?.author?.nickname || data?.author?.unique_id || ""),
    sourceUrl,
    mediaUrl,
    coverUrl: firstString(data?.video?.cover?.url_list, data?.video?.origin_cover?.url_list),
    durationSeconds: millisToSeconds(data?.video?.duration)
  };
}

function normalizeXiaohongshuPayload(payload, sourceUrl) {
  const data = payload?.data?.note_card
    || payload?.data?.data?.[0]
    || payload?.data
    || payload?.note_card
    || payload;
  const videoInfo = data?.video_info_v2;
  const mediaUrl = firstString(
    videoInfo?.media?.stream?.h264?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    videoInfo?.media?.stream?.h265?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    data?.video?.media?.stream?.h264?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    data?.video?.media?.stream?.h265?.map((item) => item?.master_url || item?.backup_urls?.[0]),
    data?.video?.url,
    data?.video_url
  );
  if (!mediaUrl) throw mediaUnavailable();
  return {
    provider: "tikhub",
    platform: "xiaohongshu",
    providerContentId: stringValue(data?.note_id || data?.id),
    title: stringValue(data?.title || data?.display_title || "小红书视频"),
    description: stringValue(data?.desc || data?.description || ""),
    account: stringValue(data?.user?.nickname || data?.user_info?.nickname || ""),
    sourceUrl,
    mediaUrl,
    coverUrl: firstString(
      videoInfo?.image?.first_frame,
      videoInfo?.image?.thumbnail,
      data?.image_list?.map((item) => item?.url || item?.info_list?.[0]?.url),
      data?.images_list?.map((item) => item?.url || item?.info_list?.[0]?.url)
    ),
    durationSeconds: firstDurationSeconds(
      { value: firstNumber(videoInfo?.media?.stream?.h264?.map((item) => item?.duration)), unit: "milliseconds" },
      { value: firstNumber(videoInfo?.media?.stream?.h265?.map((item) => item?.duration)), unit: "milliseconds" },
      { value: videoInfo?.media?.video?.duration, unit: "seconds" },
      { value: videoInfo?.capa?.duration, unit: "seconds" },
      { value: data?.video?.duration || data?.duration, unit: "auto" }
    ),
    subtitles: normalizeSubtitleTracks(videoInfo?.media?.video?.subtitles || data?.video?.subtitles)
  };
}

function mediaUnavailable() {
  return createMediaExtractionError(
    "video_media_url_missing",
    "无法获取可处理的视频地址。请确认视频为公开视频。",
    { retryable: false, provider: "tikhub" }
  );
}

function firstString(...values) {
  for (const value of values.flat(Infinity)) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function firstNumber(...values) {
  for (const value of values.flat(Infinity)) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function stringValue(value) {
  return String(value || "").trim();
}

function millisToSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number > 1000 ? Math.round(number / 1000) : Math.round(number);
}

function firstDurationSeconds(...candidates) {
  for (const candidate of candidates) {
    const number = Number(candidate?.value);
    if (!Number.isFinite(number) || number <= 0) continue;
    if (candidate.unit === "milliseconds") return Math.round(number / 1000);
    if (candidate.unit === "seconds") return Math.round(number);
    return millisToSeconds(number);
  }
  return null;
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
