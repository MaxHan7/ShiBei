import { createMediaExtractionError } from "./mediaErrors.js";
import { createCrvStyleFramePackProvider } from "./crvStyleFramePackProvider.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";

const DISABLED_PROVIDER_NAMES = new Set(["", "none", "off", "disabled"]);

export function resolveVideoFramePackProviderName(env = process.env) {
  const provider = String(env.VIDEO_FRAME_PROVIDER || VIDEO_DEFAULTS.frameProvider).trim().toLowerCase();
  return DISABLED_PROVIDER_NAMES.has(provider) ? "none" : provider;
}

export function createNoopVideoFramePackProvider({
  reason = "video_frame_pack_disabled"
} = {}) {
  return {
    name: "none",
    async createFramePack() {
      return normalizeFramePack({
        provider: "none",
        skipped: true,
        reason,
        frames: [],
        grids: [],
        debug: {}
      });
    }
  };
}

export function createVideoFramePackProvider({
  env = process.env
} = {}) {
  const providerName = resolveVideoFramePackProviderName(env);
  if (providerName === "none") return createNoopVideoFramePackProvider();
  if (providerName === "crv_style_ffmpeg") return createCrvStyleFramePackProvider({ env });

  throw createMediaExtractionError(
    "unsupported_video_frame_provider",
    `暂不支持的视频抽帧供应商：${providerName}`,
    { retryable: false, provider: providerName }
  );
}

export async function createVideoFramePack({
  provider = createVideoFramePackProvider(),
  video = {},
  mediaFile = null,
  transcriptSegments = []
} = {}) {
  if (!provider || typeof provider.createFramePack !== "function") {
    throw createMediaExtractionError(
      "invalid_video_frame_provider",
      "视频抽帧供应商未实现 createFramePack。",
      { retryable: false }
    );
  }

  return normalizeFramePack(await provider.createFramePack({
    video,
    mediaFile,
    transcriptSegments
  }));
}

export function normalizeFramePack(result = {}) {
  const payload = result && typeof result === "object" ? result : {};
  return {
    provider: String(payload.provider || "unknown"),
    skipped: Boolean(payload.skipped),
    reason: String(payload.reason || ""),
    video: payload.video && typeof payload.video === "object" ? payload.video : {},
    frames: Array.isArray(payload.frames) ? payload.frames : [],
    grids: Array.isArray(payload.grids) ? payload.grids : [],
    debug: payload.debug && typeof payload.debug === "object" ? payload.debug : {}
  };
}
