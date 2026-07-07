import { dirname } from "node:path";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";
import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";
import { createSpeechToTextProvider } from "./speechToTextProvider.js";
import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";
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
import {
  buildVideoLearningSourceCacheKey,
  buildVideoSourceCacheKey,
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
  provider = { fetchVideoSource: fetchTikHubVideoSource },
  downloadMedia = downloadMediaToTempFile,
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
  const resolvedVideoSourceCache = resolveDefaultCache({
    providedCache: videoSourceCache,
    defaultCache: getSharedVideoSourceCache,
    enabled: provider?.fetchVideoSource === fetchTikHubVideoSource
  });
  const resolvedLearningSourceCache = resolveDefaultCache({
    providedCache: learningSourceCache,
    defaultCache: getSharedLearningSourceCache,
    enabled: isDefaultExtractionChain({
      provider,
      downloadMedia,
      extractAudio,
      transcribeAudio,
      fetchPlatformTranscript,
      createFramePack,
      understandVisuals,
      cleanup
    })
  });
  const sourceInput = sourceUrl || rawText;
  const learningSourceCacheKey = buildVideoLearningSourceCacheKey({
    sourceUrl: sourceInput,
    extractionVersion: extractionCacheVersion
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
      version: extractionCacheVersion
    });
    if (mediaUsageRecorder?.calls) {
      cachedResult.extractionMeta.mediaUsage = summarizeMediaUsage(mediaUsageRecorder.calls);
    }
    return cachedResult;
  }

  const videoSourceCacheKey = buildVideoSourceCacheKey({ sourceUrl: sourceInput });
  let video = await readCache(resolvedVideoSourceCache, videoSourceCacheKey);
  const videoSourceCacheHit = Boolean(video);
  if (!video) {
    video = await provider.fetchVideoSource({ sourceUrl: sourceInput });
    await writeCache(resolvedVideoSourceCache, videoSourceCacheKey, video);
  }
  recordMediaUsage(mediaUsageRecorder, {
    stage: "tikhub_fetch",
    provider: videoSourceCacheHit ? "cache:tikhub" : video.provider || "tikhub",
    cost: 0,
    metadata: {
      platform: video.platform,
      providerContentId: video.providerContentId || "",
      cacheHit: videoSourceCacheHit,
      cacheKey: videoSourceCacheKey
    }
  });
  const tempFiles = [];
  try {
    const mediaFile = await downloadMedia({ mediaUrl: video.mediaUrl });
    recordMediaUsage(mediaUsageRecorder, {
      stage: "video_media_fetch",
      provider: video.provider || "tikhub",
      cost: 0,
      metadata: { bytes: mediaFile.bytes || 0, contentType: mediaFile.contentType || "" }
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
        timestampMode: framePack.debug?.timestampMode || ""
      }
    });
    const visualUnderstanding = await understandVisuals({
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
        reason: visualUnderstanding.reason || "",
        segmentCount: Array.isArray(visualUnderstanding.segments) ? visualUnderstanding.segments.length : 0
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
    if (mediaUsageRecorder?.calls) {
      learningSource.extractionMeta.mediaUsage = summarizeMediaUsage(mediaUsageRecorder.calls);
    }
    await writeCache(resolvedLearningSourceCache, learningSourceCacheKey, learningSource);
    return withCacheMeta(learningSource, {
      hit: false,
      key: learningSourceCacheKey,
      version: extractionCacheVersion
    });
  } finally {
    await cleanup(...tempFiles);
  }
}

function recordMediaUsage(mediaUsageRecorder, call) {
  if (!mediaUsageRecorder || typeof mediaUsageRecorder.record !== "function") return null;
  return mediaUsageRecorder.record(call);
}

function resolveDefaultCache({ providedCache, defaultCache, enabled }) {
  if (providedCache !== undefined) return providedCache;
  return enabled ? defaultCache() : null;
}

function isDefaultExtractionChain({
  provider,
  downloadMedia,
  extractAudio,
  transcribeAudio,
  fetchPlatformTranscript,
  createFramePack,
  understandVisuals,
  cleanup
}) {
  return (
    provider?.fetchVideoSource === fetchTikHubVideoSource
    && downloadMedia === downloadMediaToTempFile
    && extractAudio === extractAudioWithFfmpeg
    && transcribeAudio === null
    && fetchPlatformTranscript === fetchPlatformSubtitleTranscript
    && createFramePack === createVideoFramePack
    && understandVisuals === understandVideoVisuals
    && cleanup === cleanupMediaTempFiles
  );
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
