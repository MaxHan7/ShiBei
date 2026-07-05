import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { createMediaExtractionError } from "./mediaErrors.js";

const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_AUDIO_EXTRACT_TIMEOUT_MS, 90_000);

export async function extractAudioWithFfmpeg({
  inputPath,
  outputDir,
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  runCommand = runCommandWithTimeout
} = {}) {
  if (!inputPath) {
    throw createMediaExtractionError("video_media_missing", "视频内容暂时无法读取，请稍后重试。", {
      retryable: true
    });
  }
  await mkdir(outputDir, { recursive: true });
  const outputPath = join(outputDir, "audio.wav");
  const args = [
    "-y",
    "-i", inputPath,
    "-vn",
    "-ac", "1",
    "-ar", "16000",
    "-f", "wav",
    outputPath
  ];
  try {
    await runCommand(ffmpegPath, args, { timeoutMs });
    return { path: outputPath, dir: outputDir, format: "wav", sampleRate: 16000 };
  } catch (error) {
    throw createMediaExtractionError(
      "audio_extraction_failed",
      "视频音频提取失败，请换一个公开视频链接或稍后重试。",
      { retryable: false, cause: error }
    );
  }
}

export function runCommandWithTimeout(command, args, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg_timeout"));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with ${code}`));
    });
  });
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
