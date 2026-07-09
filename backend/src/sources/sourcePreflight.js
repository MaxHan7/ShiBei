import { fetchTikHubVideoSource } from "../media/tikhubVideoProvider.js";
import { fetchYtDlpVideoSource } from "../media/ytDlpVideoProvider.js";
import {
  detectVideoPlatform,
  isTikHubPreferredPlatform,
  isYtDlpPreferredPlatform,
  normalizeVideoSourceUrl
} from "../media/videoPlatforms.js";
import { VIDEO_DEFAULTS } from "../media/videoDefaults.js";

const PLATFORM_LABELS = Object.freeze({
  douyin: "抖音",
  xiaohongshu: "小红书",
  youtube: "YouTube",
  bilibili: "B站",
  direct_video_file: "视频文件",
  generic_web: "网页视频",
  unknown: "视频"
});

export function buildSourceCapabilities({ env = process.env } = {}) {
  const videoEnabled = readBooleanFlag(env.VIDEO_LINK_ENABLED, true);
  const ytDlpEnabled = readBooleanFlag(env.VIDEO_YTDLP_ENABLED, true);
  const allowlist = readPlatformAllowlist(env.VIDEO_PLATFORM_ALLOWLIST, VIDEO_DEFAULTS.platformAllowlist);
  const maxDurationSeconds = readPositiveInt(env.VIDEO_MAX_DURATION_SECONDS, VIDEO_DEFAULTS.maxDurationSeconds);
  const platforms = Object.fromEntries(
    ["douyin", "xiaohongshu", "youtube", "bilibili", "direct_video_file", "generic_web"].map((platform) => [
      platform,
      {
        enabled: videoEnabled
          && (allowlist.size === 0 || allowlist.has(platform))
          && (!isYtDlpPreferredPlatform(platform) || ytDlpEnabled),
        provider: isTikHubPreferredPlatform(platform) ? "tikhub" : "yt-dlp",
        label: PLATFORM_LABELS[platform] || "视频"
      }
    ])
  );

  return {
    sourceTypes: {
      text: { enabled: true, minCharacters: 24 },
      article_link: { enabled: true },
      wechat_article: { enabled: true },
      video_link: {
        enabled: videoEnabled,
        maxDurationSeconds,
        platforms
      }
    }
  };
}

export async function preflightSourceInput({
  rawInput,
  sourceType = "",
  fetchMetadata = false,
  env = process.env,
  fetchTikHub = fetchTikHubVideoSource,
  fetchYtDlp = fetchYtDlpVideoSource
} = {}) {
  const input = String(rawInput || "").trim();
  const maxDurationSeconds = readPositiveInt(env.VIDEO_MAX_DURATION_SECONDS, VIDEO_DEFAULTS.maxDurationSeconds);
  if (!input) {
    return blockedPreflight({
      inputKind: "empty",
      sourceType: "text",
      reasonCode: "invalid_input",
      userMessage: "请先粘贴文章链接、视频链接或正文。",
      maxDurationSeconds
    });
  }

  const explicitSourceType = normalizeSourceType(sourceType);
  const parsedUrl = parseHttpUrl(input);
  if (!parsedUrl) {
    if (looksLikeInvalidUrl(input)) {
      return blockedPreflight({
        inputKind: "url",
        sourceType: explicitSourceType || "article_link",
        reasonCode: "invalid_url",
        userMessage: "这不是有效的链接。请粘贴 http 或 https 开头的链接。",
        maxDurationSeconds
      });
    }

    return {
      ok: true,
      inputKind: "text",
      sourceType: "text",
      platform: null,
      platformLabel: null,
      provider: null,
      canGenerate: input.length >= 24,
      title: "",
      durationSeconds: null,
      maxDurationSeconds,
      reasonCode: input.length >= 24 ? "" : "text_too_short",
      userMessage: input.length >= 24 ? "可以生成复习内容。" : "正文太短，至少需要 24 个字。"
    };
  }

  if (isWechatArticleHost(parsedUrl.hostname)) {
    return readyPreflight({
      inputKind: "url",
      sourceType: "wechat_article",
      userMessage: "已识别为公众号文章链接。"
    });
  }

  const platform = detectVideoPlatform(parsedUrl.href);
  const shouldTreatAsVideo = explicitSourceType === "video_link" || isSupportedKnownVideoPlatform(platform);
  if (!shouldTreatAsVideo) {
    return readyPreflight({
      inputKind: "url",
      sourceType: "article_link",
      userMessage: "已识别为网页文章链接。"
    });
  }

  const gate = evaluateVideoPlatformGate(platform, { env });
  const platformLabel = PLATFORM_LABELS[platform] || "视频";
  if (!gate.enabled) {
    return blockedPreflight({
      inputKind: "url",
      sourceType: "video_link",
      platform,
      platformLabel,
      provider: gate.provider,
      reasonCode: gate.reasonCode,
      userMessage: gate.userMessage,
      maxDurationSeconds
    });
  }

  const base = {
    ok: true,
    inputKind: "url",
    sourceType: "video_link",
    platform,
    platformLabel,
    provider: gate.provider,
    canGenerate: true,
    title: "",
    durationSeconds: null,
    maxDurationSeconds,
    reasonCode: "",
    userMessage: `已识别为${platformLabel}视频链接。`
  };

  if (!fetchMetadata) return base;

  try {
    const video = await fetchVideoMetadata(parsedUrl.href, platform, { fetchTikHub, fetchYtDlp });
    const durationSeconds = finitePositiveNumber(video?.durationSeconds);
    if (durationSeconds && durationSeconds > maxDurationSeconds) {
      return blockedPreflight({
        ...base,
        title: stringValue(video?.title),
        durationSeconds,
        reasonCode: "video_duration_too_long",
        userMessage: `视频时长超过 ${Math.round(maxDurationSeconds / 60)} 分钟，暂时无法生成复习内容。`
      });
    }

    return {
      ...base,
      title: stringValue(video?.title),
      durationSeconds,
      userMessage: durationSeconds
        ? `${platformLabel}视频约 ${formatDuration(durationSeconds)}，可以生成复习内容。`
        : `${platformLabel}视频可以生成复习内容。`
    };
  } catch (error) {
    return blockedPreflight({
      ...base,
      reasonCode: normalizeMetadataFailureCode(error),
      userMessage: userMessageForMetadataFailure(error)
    });
  }
}

function fetchVideoMetadata(sourceUrl, platform, { fetchTikHub, fetchYtDlp }) {
  if (isTikHubPreferredPlatform(platform)) {
    return fetchTikHub({ sourceUrl });
  }
  if (isYtDlpPreferredPlatform(platform)) {
    return fetchYtDlp({ sourceUrl });
  }
  return Promise.reject(new Error("unsupported video platform"));
}

function evaluateVideoPlatformGate(platform, { env = process.env } = {}) {
  const provider = isTikHubPreferredPlatform(platform) ? "tikhub" : "yt-dlp";
  if (!readBooleanFlag(env.VIDEO_LINK_ENABLED, true)) {
    return {
      enabled: false,
      provider,
      reasonCode: "video_link_disabled",
      userMessage: "视频链接生成功能暂未开放。"
    };
  }

  const allowlist = readPlatformAllowlist(env.VIDEO_PLATFORM_ALLOWLIST, VIDEO_DEFAULTS.platformAllowlist);
  if (allowlist.size > 0 && !allowlist.has(platform)) {
    return {
      enabled: false,
      provider,
      reasonCode: "unsupported_video_platform",
      userMessage: "这个视频平台暂未支持。可以换一个已支持的视频链接。"
    };
  }

  if (isYtDlpPreferredPlatform(platform) && !readBooleanFlag(env.VIDEO_YTDLP_ENABLED, true)) {
    return {
      enabled: false,
      provider,
      reasonCode: "video_ytdlp_disabled",
      userMessage: "YouTube、B站和网页视频链接暂未开放。"
    };
  }

  if (!isTikHubPreferredPlatform(platform) && !isYtDlpPreferredPlatform(platform)) {
    return {
      enabled: false,
      provider,
      reasonCode: "unsupported_video_platform",
      userMessage: "这个视频平台暂未支持。可以换一个已支持的视频链接。"
    };
  }

  return { enabled: true, provider, reasonCode: "", userMessage: "" };
}

function readyPreflight({
  inputKind,
  sourceType,
  userMessage,
  platform = null,
  platformLabel = null,
  provider = null,
  title = "",
  durationSeconds = null,
  maxDurationSeconds = readPositiveInt(process.env.VIDEO_MAX_DURATION_SECONDS, VIDEO_DEFAULTS.maxDurationSeconds)
}) {
  return {
    ok: true,
    inputKind,
    sourceType,
    platform,
    platformLabel,
    provider,
    canGenerate: true,
    title,
    durationSeconds,
    maxDurationSeconds,
    reasonCode: "",
    userMessage
  };
}

function blockedPreflight({
  inputKind = "url",
  sourceType = "video_link",
  platform = null,
  platformLabel = null,
  provider = null,
  title = "",
  durationSeconds = null,
  maxDurationSeconds = readPositiveInt(process.env.VIDEO_MAX_DURATION_SECONDS, VIDEO_DEFAULTS.maxDurationSeconds),
  reasonCode,
  userMessage
}) {
  return {
    ok: false,
    inputKind,
    sourceType,
    platform,
    platformLabel,
    provider,
    canGenerate: false,
    title,
    durationSeconds,
    maxDurationSeconds,
    reasonCode,
    userMessage
  };
}

function normalizeMetadataFailureCode(error) {
  const code = String(error?.mediaErrorType || error?.code || "");
  if ([
    "provider_config_missing",
    "provider_timeout",
    "provider_rate_limited",
    "provider_unavailable",
    "unsupported_video_platform",
    "video_private_or_deleted",
    "video_media_url_missing"
  ].includes(code)) {
    return code === "provider_timeout" || code === "provider_rate_limited" || code === "provider_unavailable"
      ? "video_metadata_unavailable"
      : code;
  }
  return "video_metadata_unavailable";
}

function userMessageForMetadataFailure(error) {
  const code = normalizeMetadataFailureCode(error);
  if (code === "provider_config_missing") {
    return "视频取源环境暂未配置，暂时无法生成这个视频。";
  }
  if (code === "unsupported_video_platform") {
    return "这个视频平台暂未支持。可以换一个已支持的视频链接。";
  }
  if (code === "video_private_or_deleted" || code === "video_media_url_missing") {
    return "这条视频无法公开访问。可以换一个公开视频链接。";
  }
  return "暂时无法读取视频信息，请稍后重试或换一个公开视频链接。";
}

function parseHttpUrl(input) {
  const urlInput = firstHttpUrlString(input) || input;
  try {
    const url = normalizeVideoSourceUrl(urlInput);
    return url;
  } catch {
    return null;
  }
}

function firstHttpUrlString(input) {
  const match = String(input || "").match(/https?:\/\/\S+/i);
  if (!match) return "";
  return match[0].replace(/[.,;:!?，。；：！？)\]}）】》」』"']+$/u, "");
}

function normalizeSourceType(sourceType) {
  return String(sourceType || "").trim().toLowerCase();
}

function isSupportedKnownVideoPlatform(platform) {
  return ["douyin", "xiaohongshu", "youtube", "bilibili", "direct_video_file"].includes(platform);
}

function isWechatArticleHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^www\./, "");
  return host === "mp.weixin.qq.com";
}

function looksLikeInvalidUrl(value) {
  const lowercased = String(value || "").trim().toLowerCase();
  if (lowercased.startsWith("http") || lowercased.startsWith("www.")) return true;
  if (lowercased.includes("://")) return true;
  return /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(lowercased);
}

function finitePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes <= 0) return `${remainingSeconds} 秒`;
  return remainingSeconds > 0 ? `${minutes} 分 ${remainingSeconds} 秒` : `${minutes} 分钟`;
}

function stringValue(value) {
  return String(value || "").trim();
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function readBooleanFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return !["0", "false", "off", "no"].includes(String(value).trim().toLowerCase());
}

function readPlatformAllowlist(value, fallback = []) {
  if (value === undefined || value === null || value === "") return new Set(fallback);
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}
