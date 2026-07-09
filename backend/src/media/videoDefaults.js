export const VIDEO_DEFAULTS = Object.freeze({
  maxDurationSeconds: 15 * 60,
  platformAllowlist: Object.freeze([
    "douyin",
    "xiaohongshu",
    "youtube",
    "bilibili",
    "direct_video_file",
    "generic_web"
  ]),
  asrProvider: "local_whisper",
  localWhisperModel: "small",
  localWhisperDevice: "auto",
  localWhisperComputeType: "int8",
  localWhisperLanguage: "zh",
  frameProvider: "crv_style_ffmpeg",
  visualProvider: "qwen-vl",
  visualModel: "qwen3-vl-flash",
  mediaMaxBytes: 150 * 1024 * 1024,
  mediaFetchTimeoutMs: 60_000,
  tikhubUnitCostUsd: 0.001
});
