import { createMediaExtractionError } from "./mediaErrors.js";

export function createCrvStyleFramePackProvider() {
  throw createMediaExtractionError(
    "unsupported_video_frame_provider",
    "crv_style_ffmpeg 视频抽帧供应商尚未实现。",
    { retryable: false, provider: "crv_style_ffmpeg" }
  );
}
