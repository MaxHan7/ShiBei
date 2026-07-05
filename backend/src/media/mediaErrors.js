export function createMediaExtractionError(mediaErrorType, message, {
  retryable = false,
  cause = null,
  provider = "",
  status = null
} = {}) {
  const error = new Error(message || "视频内容提取失败");
  error.code = "failed_extract_video";
  error.mediaErrorType = mediaErrorType || "unknown_video_extraction_error";
  error.retryable = Boolean(retryable);
  if (provider) error.provider = provider;
  if (status !== null && status !== undefined) error.status = status;
  if (cause) error.cause = cause;
  return error;
}

export function isRetryableMediaExtractionError(error) {
  if (error?.retryable === true) return true;
  return [
    "provider_timeout",
    "provider_rate_limited",
    "provider_unavailable",
    "video_media_timeout",
    "video_media_unavailable",
    "asr_timeout",
    "asr_unavailable"
  ].includes(error?.mediaErrorType);
}
