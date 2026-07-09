import { createMediaExtractionError } from "./mediaErrors.js";
import { transcribeAudioWithLocalWhisper } from "./localWhisperTranscriptionProvider.js";
import { transcribeAudioWithOpenAI } from "./openAITranscriptionProvider.js";
import { VIDEO_DEFAULTS } from "./videoDefaults.js";

export function resolveSpeechToTextProviderName(env = process.env) {
  const explicitProvider = String(env.VIDEO_ASR_PROVIDER || "").trim().toLowerCase();
  if (explicitProvider) return explicitProvider;
  return VIDEO_DEFAULTS.asrProvider;
}

export function createSpeechToTextProvider({
  env = process.env
} = {}) {
  const providerName = resolveSpeechToTextProviderName(env);
  if (providerName === "openai") {
    return {
      name: "openai",
      async transcribeAudio(args) {
        return transcribeAudioWithOpenAI(args);
      }
    };
  }

  if (providerName === "local_whisper" || providerName === "faster_whisper") {
    return {
      name: "local_whisper",
      async transcribeAudio(args) {
        return transcribeAudioWithLocalWhisper(args);
      }
    };
  }

  throw createMediaExtractionError(
    "unsupported_asr_provider",
    `暂不支持的语音转写供应商：${providerName}`,
    { retryable: false, provider: providerName }
  );
}
