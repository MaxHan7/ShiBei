import { dirname } from "node:path";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";
import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";
import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";
import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";
import { buildLearningSourceFromVideo } from "./learningSource.js";
import { summarizeMediaUsage } from "./mediaCost.js";

export async function extractVideoLearningSource({
  sourceUrl,
  rawText = "",
  sourceTitle = "",
  provider = { fetchVideoSource: fetchTikHubVideoSource },
  downloadMedia = downloadMediaToTempFile,
  extractAudio = extractAudioWithFfmpeg,
  transcribeAudio = transcribeAudioWithOpenAI,
  cleanup = cleanupMediaTempFiles,
  mediaUsageRecorder = null,
  now = new Date().toISOString()
} = {}) {
  const video = await provider.fetchVideoSource({ sourceUrl: sourceUrl || rawText });
  recordMediaUsage(mediaUsageRecorder, {
    stage: "tikhub_fetch",
    provider: video.provider || "tikhub",
    cost: 0,
    metadata: { platform: video.platform, providerContentId: video.providerContentId || "" }
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
    const transcript = await transcribeAudio({ audioPath: audio.path });
    recordMediaUsage(mediaUsageRecorder, {
      stage: "openai_transcription",
      provider: "openai",
      cost: 0,
      metadata: { segmentCount: Array.isArray(transcript.segments) ? transcript.segments.length : 0 }
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
    return learningSource;
  } finally {
    await cleanup(...tempFiles);
  }
}

function recordMediaUsage(mediaUsageRecorder, call) {
  if (!mediaUsageRecorder || typeof mediaUsageRecorder.record !== "function") return null;
  return mediaUsageRecorder.record(call);
}
