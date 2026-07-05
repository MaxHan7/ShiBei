import { dirname } from "node:path";

import { cleanupMediaTempFiles, downloadMediaToTempFile } from "./mediaFiles.js";
import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";
import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";
import { fetchTikHubVideoSource } from "./tikhubVideoProvider.js";
import { buildLearningSourceFromVideo } from "./learningSource.js";

export async function extractVideoLearningSource({
  sourceUrl,
  rawText = "",
  sourceTitle = "",
  provider = { fetchVideoSource: fetchTikHubVideoSource },
  downloadMedia = downloadMediaToTempFile,
  extractAudio = extractAudioWithFfmpeg,
  transcribeAudio = transcribeAudioWithOpenAI,
  cleanup = cleanupMediaTempFiles,
  now = new Date().toISOString()
} = {}) {
  const video = await provider.fetchVideoSource({ sourceUrl: sourceUrl || rawText });
  const tempFiles = [];
  try {
    const mediaFile = await downloadMedia({ mediaUrl: video.mediaUrl });
    tempFiles.push(mediaFile);
    const audio = await extractAudio({
      inputPath: mediaFile.path,
      outputDir: dirname(mediaFile.path)
    });
    tempFiles.push(audio);
    const transcript = await transcribeAudio({ audioPath: audio.path });
    return buildLearningSourceFromVideo({
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
  } finally {
    await cleanup(...tempFiles);
  }
}
