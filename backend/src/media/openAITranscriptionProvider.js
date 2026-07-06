import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { createMediaExtractionError } from "./mediaErrors.js";
import { normalizeTranscriptionPayload } from "./transcriptionResult.js";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_ASR_TIMEOUT_MS, 120_000);

export async function transcribeAudioWithOpenAI({
  audioPath,
  apiKey = process.env.OPENAI_API_KEY || "",
  model = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  if (!apiKey) {
    throw createMediaExtractionError("asr_config_missing", "语音转写服务暂未配置，请稍后再试。", {
      retryable: false,
      provider: "openai"
    });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const buffer = await readFile(audioPath);
    const form = new FormData();
    form.set("model", model);
    form.set("response_format", "verbose_json");
    form.set("file", new Blob([buffer], { type: "audio/wav" }), basename(pathForName(audioPath)));
    const response = await fetchImpl(OPENAI_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw createMediaExtractionError(
        response.status === 429 ? "asr_rate_limited" : "asr_unavailable",
        "视频语音转写暂时失败，请稍后重试。",
        { retryable: response.status === 429 || response.status >= 500, provider: "openai", status: response.status }
      );
    }
    return normalizeTranscriptionPayload(payload, { provider: "openai" });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createMediaExtractionError("asr_timeout", "视频语音转写超时，请稍后重试。", {
        retryable: true,
        provider: "openai"
      });
    }
    if (error?.code === "failed_extract_video") throw error;
    throw createMediaExtractionError("asr_unavailable", "视频语音转写暂时失败，请稍后重试。", {
      retryable: true,
      provider: "openai",
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }
}

function pathForName(audioPath) {
  return audioPath instanceof URL ? fileURLToPath(audioPath) : String(audioPath || "");
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
