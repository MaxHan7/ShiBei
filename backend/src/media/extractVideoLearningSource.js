import { dirname } from "node:path";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";
import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";
import { createMediaExtractionError } from "./mediaErrors.js";
import { createSpeechToTextProvider } from "./speechToTextProvider.js";
import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";
import { fetchYtDlpVideoSource } from "./ytDlpVideoProvider.js";
import { downloadYtDlpMediaToTempFile } from "./ytDlpMediaDownloader.js";
import {
  detectVideoPlatform,
  isTikHubPreferredPlatform,
  isYtDlpPreferredPlatform
} from "./videoPlatforms.js";
import { buildLearningSourceFromVideo } from "./learningSource.js";
import { summarizeMediaUsage } from "./mediaCost.js";
import { fetchPlatformSubtitleTranscript } from "./platformSubtitles.js";
import {
  createVideoFramePack,
  createVideoFramePackProvider
} from "./videoFramePackProvider.js";
import {
  createVisualUnderstandingProvider,
  understandVideoVisuals
} from "./visualUnderstandingProvider.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";
import {
  buildVideoExtractionSignature,
  buildVideoLearningSourceCacheKey,
  buildVideoSourceCacheKey,
  deleteCache,
  getSharedLearningSourceCache,
  getSharedVideoSourceCache,
  readCache,
  VIDEO_LEARNING_SOURCE_CACHE_VERSION,
  writeCache
} from "./videoExtractionCache.js";

export async function extractVideoLearningSource({
  sourceUrl,
  rawText = "",
  sourceTitle = "",
  provider = null,
  downloadMedia = downloadMediaToTempFile,
  downloadYtDlpMedia = downloadYtDlpMediaToTempFile,
  maxDurationSeconds = readPositiveInt(process.env.VIDEO_MAX_DURATION_SECONDS, VIDEO_DEFAULTS.maxDurationSeconds),
  mediaMaxBytes = readPositiveInt(process.env.VIDEO_MEDIA_MAX_BYTES, VIDEO_DEFAULTS.mediaMaxBytes),
  extractAudio = extractAudioWithFfmpeg,
  speechToTextProvider = createSpeechToTextProvider(),
  transcribeAudio = null,
  fetchPlatformTranscript = fetchPlatformSubtitleTranscript,
  framePackProvider = createVideoFramePackProvider(),
  createFramePack = createVideoFramePack,
  visualUnderstandingProvider = createVisualUnderstandingProvider(),
  understandVisuals = understandVideoVisuals,
  cleanup = cleanupMediaTempFiles,
  mediaUsageRecorder = null,
  now = new Date().toISOString(),
  videoSourceCache = undefined,
  learningSourceCache = undefined,
  extractionCacheVersion = VIDEO_LEARNING_SOURCE_CACHE_VERSION
} = {}) {
  const sourceInput = sourceUrl || rawText;
  const activeProvider = provider || createVideoSourceProvider(sourceInput);
  const resolvedVideoSourceCache = resolveDefaultCache({
    providedCache: videoSourceCache,
    defaultCache: getSharedVideoSourceCache,
    enabled: activeProvider?.fetchVideoSource === fetchTikHubVideoSource
  });
  const resolvedLearningSourceCache = resolveDefaultCache({
    providedCache: learningSourceCache,
    defaultCache: getSharedLearningSourceCache,
    enabled: isDefaultExtractionChain({
      provider: activeProvider,
      downloadMedia,
      downloadYtDlpMedia,
      extractAudio,
      transcribeAudio,
      fetchPlatformTranscript,
      createFramePack,
      understandVisuals,
      cleanup
    })
  });
  const extractionSignature = buildVideoExtractionSignature({
    asrProvider: transcribeAudio ? "custom" : speechToTextProvider?.name || "custom",
    frameProvider: framePackProvider?.name || "custom",
    visualProvider: visualUnderstandingProvider?.name || "custom",
    sourceProvider: activeProvider?.name || "custom",
    visualModel: visualUnderstandingProvider?.model || "",
    version: extractionCacheVersion
  });
  const learningSourceCacheKey = buildVideoLearningSourceCacheKey({
    sourceUrl: sourceInput,
    extractionVersion: extractionCacheVersion,
    extractionSignature
  });
  const cachedLearningSource = await readCache(resolvedLearningSourceCache, learningSourceCacheKey);
  if (cachedLearningSource) {
    recordMediaUsage(mediaUsageRecorder, {
      stage: "video_learning_source_cache",
      provider: "memory",
      cost: 0,
      metadata: { cacheHit: true, cacheKey: learningSourceCacheKey }
    });
    const cachedResult = withCacheMeta(cachedLearningSource, {
      hit: true,
      key: learningSourceCacheKey,
      version: extractionCacheVersion,
      signature: extractionSignature
    });
    if (mediaUsageRecorder?.calls) {
      cachedResult.extractionMeta.mediaUsage = summarizeMediaUsage(mediaUsageRecorder.calls);
    }
    return cachedResult;
  }

  const videoSourceCacheKey = buildVideoSourceCacheKey({ sourceUrl: sourceInput });
  let video = await readCache(resolvedVideoSourceCache, videoSourceCacheKey);
  let videoSourceCacheHit = Boolean(video);
  if (!video) {
    video = await activeProvider.fetchVideoSource({ sourceUrl: sourceInput });
    enforceVideoDurationLimit(video, { maxDurationSeconds });
    await writeCache(resolvedVideoSourceCache, videoSourceCacheKey, video);
  } else {
    enforceVideoDurationLimit(video, { maxDurationSeconds });
  }
  recordVideoSourceUsage(mediaUsageRecorder, { video, videoSourceCacheHit, videoSourceCacheKey });
  const tempFiles = [];
  try {
    let staleVideoSourceCache = false;
    let mediaFile;
    try {
      mediaFile = await downloadVideoMedia({
        video,
        downloadMedia,
        downloadYtDlpMedia,
        mediaMaxBytes
      });
    } catch (error) {
      if (!shouldRefreshCachedVideoSource({ error, videoSourceCacheHit })) throw error;
      staleVideoSourceCache = true;
      await deleteCache(resolvedVideoSourceCache, videoSourceCacheKey);
      video = await activeProvider.fetchVideoSource({ sourceUrl: sourceInput });
      enforceVideoDurationLimit(video, { maxDurationSeconds });
      videoSourceCacheHit = false;
      await writeCache(resolvedVideoSourceCache, videoSourceCacheKey, video);
      recordVideoSourceUsage(mediaUsageRecorder, {
        video,
        videoSourceCacheHit,
        videoSourceCacheKey,
        metadata: {
          staleVideoSourceCache: true,
          refetchedProviderSource: true
        }
      });
      mediaFile = await downloadVideoMedia({
        video,
        downloadMedia,
        downloadYtDlpMedia,
        mediaMaxBytes
      });
    }
    recordMediaUsage(mediaUsageRecorder, {
      stage: "video_media_fetch",
      provider: video.mediaDownload?.provider || video.provider || "unknown",
      cost: 0,
      metadata: {
        bytes: mediaFile.bytes || 0,
        contentType: mediaFile.contentType || "",
        ...(staleVideoSourceCache ? {
          staleVideoSourceCache: true,
          refetchedProviderSource: true
        } : {})
      }
    });
    tempFiles.push(mediaFile);
    let transcript = await fetchPlatformTranscript({ subtitles: video.subtitles });
    if (!transcript) {
      const audio = await extractAudio({
        inputPath: mediaFile.path,
        outputDir: dirname(mediaFile.path)
      });
      recordMediaUsage(mediaUsageRecorder, {
        stage: "audio_extraction",
        provider: "ffmpeg",
        cost: 0,
        metadata: { format: audio.format || "", sampleRate: audio.sampleRate || null }
      });
      tempFiles.push(audio);
      const activeTranscribeAudio = transcribeAudio || speechToTextProvider.transcribeAudio;
      transcript = await activeTranscribeAudio({ audioPath: audio.path });
    }
    const transcriptProvider = transcript.provider || speechToTextProvider.name || "custom";
    recordMediaUsage(mediaUsageRecorder, {
      stage: "audio_transcription",
      provider: transcriptProvider,
      cost: 0,
      metadata: {
        segmentCount: Array.isArray(transcript.segments) ? transcript.segments.length : 0,
        source: transcriptProvider.startsWith("platform_subtitle:") ? "platform_subtitle" : "asr"
      }
    });
    const framePack = await createFramePack({
      provider: framePackProvider,
      video,
      mediaFile,
      transcriptSegments: transcript.segments
    });
    recordMediaUsage(mediaUsageRecorder, {
      stage: "video_frame_pack",
      provider: framePack.provider || framePackProvider.name || "unknown",
      cost: 0,
      metadata: {
        skipped: Boolean(framePack.skipped),
        reason: framePack.reason || "",
        frameCount: Array.isArray(framePack.frames) ? framePack.frames.length : 0,
        gridCount: Array.isArray(framePack.grids) ? framePack.grids.length : 0,
        timestampMode: framePack.debug?.timestampMode || "",
        ...(framePack.debug?.failureCode ? {
          failureCode: framePack.debug.failureCode,
          failureMessage: framePack.debug.failureMessage || "",
          retryable: framePack.debug.retryable
        } : {})
      }
    });
    const visualUnderstanding = await safelyUnderstandVideoVisuals({
      understandVisuals,
      provider: visualUnderstandingProvider,
      video,
      mediaFile,
      transcriptSegments: transcript.segments,
      framePack
    });
    recordMediaUsage(mediaUsageRecorder, {
      stage: "visual_understanding",
      provider: visualUnderstanding.provider || visualUnderstandingProvider.name || "unknown",
      cost: 0,
      metadata: {
        skipped: Boolean(visualUnderstanding.skipped),
        status: visualUnderstanding.status,
        reason: visualUnderstanding.reason || "",
        segmentCount: Array.isArray(visualUnderstanding.segments) ? visualUnderstanding.segments.length : 0,
        model: visualUnderstanding.model || "",
        usage: visualUnderstanding.usage || {},
        ...(visualUnderstanding.diagnostics?.failureCode ? {
          failureCode: visualUnderstanding.diagnostics.failureCode,
          retryable: visualUnderstanding.diagnostics.retryable
        } : {})
      }
    });
    const learningSource = buildLearningSourceFromVideo({
      platform: video.platform,
      title: sourceTitle || video.title,
      url: video.sourceUrl || sourceUrl || rawText,
      account: video.account,
      author: video.account,
      durationSeconds: video.durationSeconds,
      description: video.description,
      transcriptSegments: transcript.segments,
      visualSegments: visualUnderstanding.segments,
      media: {
        provider: video.provider,
        providerContentId: video.providerContentId,
        coverUrl: video.coverUrl
      },
      now
    });
    learningSource.extractionMeta.visualUnderstanding = buildVisualUnderstandingMeta(visualUnderstanding);
    learningSource.extractionMeta.userVisibleContentBasis = buildUserVisibleContentBasis(visualUnderstanding);
    if (mediaUsageRecorder?.calls) {
      learningSource.extractionMeta.mediaUsage = summarizeMediaUsage(mediaUsageRecorder.calls);
    }
    if (shouldCacheLearningSource(learningSource)) {
      await writeCache(resolvedLearningSourceCache, learningSourceCacheKey, learningSource);
    }
    return withCacheMeta(learningSource, {
      hit: false,
      key: learningSourceCacheKey,
      version: extractionCacheVersion,
      signature: extractionSignature,
      stored: shouldCacheLearningSource(learningSource)
    });
  } finally {
    await cleanup(...tempFiles);
  }
}

async function safelyUnderstandVideoVisuals({
  understandVisuals,
  provider,
  video,
  mediaFile,
  transcriptSegments,
  framePack
}) {
  try {
    const result = await understandVisuals({
      provider,
      video,
      mediaFile,
      transcriptSegments,
      framePack
    });
    return {
      ...result,
      status: result?.skipped ? "skipped" : "succeeded"
    };
  } catch (error) {
    const failureCode = classifyVisualUnderstandingFailure(error);
    return {
      provider: error?.provider || provider?.name || "unknown",
      model: "",
      skipped: true,
      status: "failed",
      reason: failureCode,
      segments: [],
      usage: {},
      diagnostics: {
        status: "failed",
        failureCode,
        failureMessage: String(error?.message || "visual understanding failed"),
        provider: error?.provider || provider?.name || "unknown",
        retryable: error?.retryable !== undefined ? Boolean(error.retryable) : isRetryableVisualFailure(failureCode)
      }
    };
  }
}

function buildVisualUnderstandingMeta(visualUnderstanding = {}) {
  const diagnostics = visualUnderstanding.diagnostics || {};
  return {
    status: visualUnderstanding.status || (visualUnderstanding.skipped ? "skipped" : "succeeded"),
    provider: visualUnderstanding.provider || "",
    model: visualUnderstanding.model || "",
    segmentCount: Array.isArray(visualUnderstanding.segments) ? visualUnderstanding.segments.length : 0,
    ...(diagnostics.failureCode ? { failureCode: diagnostics.failureCode } : {}),
    ...(diagnostics.failureMessage ? { failureMessage: diagnostics.failureMessage } : {}),
    ...(diagnostics.retryable !== undefined ? { retryable: Boolean(diagnostics.retryable) } : {})
  };
}

function buildUserVisibleContentBasis(visualUnderstanding = {}) {
  const hasVisualEvidence = visualUnderstanding.status === "succeeded"
    && Array.isArray(visualUnderstanding.segments)
    && visualUnderstanding.segments.length > 0;

  return hasVisualEvidence
    ? {
      basis: "audio_visual",
      message: "已结合视频字幕和画面信息生成"
    }
    : {
      basis: "audio_transcript",
      message: "本次主要基于视频字幕生成"
    };
}

function classifyVisualUnderstandingFailure(error) {
  const code = String(error?.code || error?.mediaErrorType || "");
  const message = String(error?.message || "");
  if (
    code === "no_json_object"
    || message === "no_json_object"
    || /JSON|parse|Unexpected token|no_json_object/i.test(message)
  ) {
    return "visual_output_parse_failed";
  }
  return code || "visual_understanding_failed";
}

function isRetryableVisualFailure(failureCode) {
  return failureCode !== "visual_provider_missing_api_key"
    && failureCode !== "unsupported_visual_understanding_provider"
    && failureCode !== "invalid_visual_understanding_provider";
}

function recordMediaUsage(mediaUsageRecorder, call) {
  if (!mediaUsageRecorder || typeof mediaUsageRecorder.record !== "function") return null;
  return mediaUsageRecorder.record(call);
}

function recordVideoSourceUsage(mediaUsageRecorder, {
  video,
  videoSourceCacheHit,
  videoSourceCacheKey,
  metadata = {}
}) {
  return recordMediaUsage(mediaUsageRecorder, {
    stage: video.provider === "tikhub" ? "tikhub_fetch" : "video_source_fetch",
    provider: videoSourceCacheHit ? `cache:${video.provider || "video-source"}` : video.provider || "video-source",
    cost: 0,
    metadata: {
      platform: video.platform,
      providerContentId: video.providerContentId || "",
      cacheHit: videoSourceCacheHit,
      cacheKey: videoSourceCacheKey,
      ...metadata
    }
  });
}

function shouldCacheLearningSource(learningSource) {
  return learningSource?.extractionMeta?.visualUnderstanding?.status !== "failed";
}

function shouldRefreshCachedVideoSource({ error, videoSourceCacheHit }) {
  if (!videoSourceCacheHit) return false;
  return error?.retryable === true && [
    "video_media_unavailable",
    "video_media_timeout"
  ].includes(error?.mediaErrorType);
}

function enforceVideoDurationLimit(video, { maxDurationSeconds }) {
  const durationSeconds = Number(video?.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
  if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds <= 0) return;
  if (durationSeconds <= maxDurationSeconds) return;
  throw createMediaExtractionError(
    "video_duration_too_long",
    `视频时长超过 ${Math.round(maxDurationSeconds / 60)} 分钟，暂时无法生成复习内容。`,
    {
      retryable: false,
      provider: video?.provider || ""
    }
  );
}

function resolveDefaultCache({ providedCache, defaultCache, enabled }) {
  if (providedCache !== undefined) return providedCache;
  return enabled ? defaultCache() : null;
}

function isDefaultExtractionChain({
  provider,
  downloadMedia,
  downloadYtDlpMedia,
  extractAudio,
  transcribeAudio,
  fetchPlatformTranscript,
  createFramePack,
  understandVisuals,
  cleanup
}) {
  return (
    [fetchTikHubVideoSource, fetchYtDlpVideoSource].includes(provider?.fetchVideoSource)
    && downloadMedia === downloadMediaToTempFile
    && downloadYtDlpMedia === downloadYtDlpMediaToTempFile
    && extractAudio === extractAudioWithFfmpeg
    && transcribeAudio === null
    && fetchPlatformTranscript === fetchPlatformSubtitleTranscript
    && createFramePack === createVideoFramePack
    && understandVisuals === understandVideoVisuals
    && cleanup === cleanupMediaTempFiles
  );
}

function createVideoSourceProvider(sourceInput) {
  const platform = detectVideoPlatform(sourceInput);
  enforceVideoPlatformGate(platform);
  if (isTikHubPreferredPlatform(platform)) {
    return {
      name: "tikhub",
      fetchVideoSource: fetchTikHubVideoSource
    };
  }
  if (isYtDlpPreferredPlatform(platform)) {
    return {
      name: "yt-dlp",
      fetchVideoSource: fetchYtDlpVideoSource
    };
  }
  return {
    name: "yt-dlp",
    fetchVideoSource: fetchYtDlpVideoSource
  };
}

function enforceVideoPlatformGate(platform) {
  if (!readBooleanFlag(process.env.VIDEO_LINK_ENABLED, true)) {
    throw createMediaExtractionError(
      "video_link_disabled",
      "视频链接生成功能暂未开放。",
      { retryable: false }
    );
  }

  const allowlist = readPlatformAllowlist(process.env.VIDEO_PLATFORM_ALLOWLIST, VIDEO_DEFAULTS.platformAllowlist);
  if (allowlist.size > 0 && !allowlist.has(platform)) {
    throw createMediaExtractionError(
      "unsupported_video_platform",
      "这个视频平台暂未开放。可以换一个已支持的视频链接。",
      { retryable: false, provider: platform || "unknown" }
    );
  }

  if (isYtDlpPreferredPlatform(platform) && !readBooleanFlag(process.env.VIDEO_YTDLP_ENABLED, true)) {
    throw createMediaExtractionError(
      "video_ytdlp_disabled",
      "YouTube、B站和网页视频链接暂未开放。",
      { retryable: false, provider: "yt-dlp" }
    );
  }
}

async function downloadVideoMedia({
  video,
  downloadMedia,
  downloadYtDlpMedia,
  mediaMaxBytes
}) {
  if (video?.mediaDownload?.provider === "yt-dlp") {
    return downloadYtDlpMedia({
      sourceUrl: video.mediaDownload.sourceUrl || video.sourceUrl,
      formatSelector: video.mediaDownload.formatSelector,
      maxBytes: mediaMaxBytes
    });
  }
  return downloadMedia({ mediaUrl: video.mediaUrl, maxBytes: mediaMaxBytes });
}

function withCacheMeta(learningSource, cache) {
  return {
    ...learningSource,
    extractionMeta: {
      ...(learningSource.extractionMeta || {}),
      cache
    }
  };
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function readBooleanFlag(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return !["0", "false", "off", "disabled", "no"].includes(String(value).trim().toLowerCase());
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
