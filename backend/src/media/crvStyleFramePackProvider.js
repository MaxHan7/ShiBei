import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const DEFAULT_TIMEOUT_MS = readPositiveInt(process.env.VIDEO_FRAME_TIMEOUT_MS, 90_000);
const DEFAULT_MAX_FRAMES = readPositiveInt(process.env.VIDEO_FRAME_MAX_FRAMES, 30);
const DEFAULT_FPS_FLOOR_SECONDS = readPositiveFloat(process.env.VIDEO_FRAME_FPS_FLOOR_SECONDS, 1);
const DEFAULT_SCENE_THRESHOLD = readPositiveFloat(process.env.VIDEO_FRAME_SCENE_THRESHOLD, 0.3);
const DEFAULT_DEDUP_THRESHOLD_PERCENT = readPositiveFloat(process.env.VIDEO_FRAME_DEDUP_THRESHOLD_PERCENT, 8);
const DEFAULT_DEDUP_WINDOW = readPositiveInt(process.env.VIDEO_FRAME_DEDUP_WINDOW, 4);
const DEFAULT_GRID_ROWS = readPositiveInt(process.env.VIDEO_FRAME_GRID_ROWS, 3);
const DEFAULT_GRID_COLS = readPositiveInt(process.env.VIDEO_FRAME_GRID_COLS, 3);
const RGB_SIGNATURE_SIZE = 16;
const RGB_TOLERANCE = 25;

export function createCrvStyleFramePackProvider({
  env = process.env,
  runCommand = runCommandWithTimeout,
  probeVideo = probeVideoWithFfprobe,
  listExtractedFrames = listTimestampedFrames,
  readImageSignature = null,
  writeGridImages = null
} = {}) {
  return {
    name: "crv_style_ffmpeg",
    async createFramePack({ mediaFile } = {}) {
      if (!mediaFile?.path) return skippedFramePack("video_frame_media_missing");

      const config = readFrameConfig(env);
      const activeReadImageSignature = readImageSignature || createFfmpegRgbSignatureReader({
        ffmpegPath: config.ffmpegPath,
        timeoutMs: config.timeoutMs,
        runCommand
      });
      const activeWriteGridImages = writeGridImages || writeContactSheets;

      try {
        const outputRoot = mediaFile.dir || dirname(mediaFile.path);
        const framesDir = join(outputRoot, "frames");
        const gridsDir = join(outputRoot, "grids");
        await mkdir(framesDir, { recursive: true });
        await mkdir(gridsDir, { recursive: true });

        const video = await probeVideo({
          inputPath: mediaFile.path,
          ffprobePath: config.ffprobePath,
          runCommand,
          timeoutMs: config.timeoutMs
        });
        const extraction = await extractRawFrames({
          inputPath: mediaFile.path,
          framesDir,
          config,
          video,
          runCommand
        });
        const extractedFrames = await listExtractedFrames({
          framesDir,
          video,
          extraction
        });
        const deduped = await dedupFrames({
          frames: extractedFrames,
          readImageSignature: activeReadImageSignature,
          thresholdPercent: config.dedupThresholdPercent,
          window: config.dedupWindow,
          maxFrames: config.maxFrames
        });
        const grids = await activeWriteGridImages({
          frames: deduped.frames,
          gridsDir,
          rows: config.gridRows,
          cols: config.gridCols,
          cellWidth: config.gridCellWidth,
          ffmpegPath: config.ffmpegPath,
          timeoutMs: config.timeoutMs,
          runCommand
        });

        return {
          provider: "crv_style_ffmpeg",
          skipped: false,
          reason: "",
          video,
          frames: deduped.frames,
          grids,
          debug: {
            extractedFrameCount: extractedFrames.length,
            keptFrameCount: deduped.frames.length,
            cappedFrameCount: deduped.cappedFrameCount,
            sceneThreshold: config.sceneThreshold,
            fpsFloorSeconds: config.fpsFloorSeconds,
            dedupThresholdPercent: config.dedupThresholdPercent,
            dedupWindow: config.dedupWindow,
            timestampMode: extraction.timestampMode || "estimated"
          }
        };
      } catch (error) {
        return skippedFramePack("video_frame_pack_failed", {
          failureCode: "video_frame_pack_failed",
          failureMessage: truncateDiagnosticMessage(error?.message || String(error || "")),
          retryable: true
        });
      }
    }
  };
}

export function readFrameConfig(env = process.env) {
  return {
    ffmpegPath: String(env.FFMPEG_PATH || "ffmpeg"),
    ffprobePath: String(env.FFPROBE_PATH || "ffprobe"),
    timeoutMs: readPositiveInt(env.VIDEO_FRAME_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
    maxFrames: readPositiveInt(env.VIDEO_FRAME_MAX_FRAMES, DEFAULT_MAX_FRAMES),
    fpsFloorSeconds: readPositiveFloat(env.VIDEO_FRAME_FPS_FLOOR_SECONDS, DEFAULT_FPS_FLOOR_SECONDS),
    sceneThreshold: readPositiveFloat(env.VIDEO_FRAME_SCENE_THRESHOLD, DEFAULT_SCENE_THRESHOLD),
    dedupThresholdPercent: readPositiveFloat(env.VIDEO_FRAME_DEDUP_THRESHOLD_PERCENT, DEFAULT_DEDUP_THRESHOLD_PERCENT),
    dedupWindow: readPositiveInt(env.VIDEO_FRAME_DEDUP_WINDOW, DEFAULT_DEDUP_WINDOW),
    gridRows: readPositiveInt(env.VIDEO_FRAME_GRID_ROWS, DEFAULT_GRID_ROWS),
    gridCols: readPositiveInt(env.VIDEO_FRAME_GRID_COLS, DEFAULT_GRID_COLS),
    gridCellWidth: readPositiveInt(env.VIDEO_FRAME_GRID_CELL_WIDTH, 360)
  };
}

export async function extractRawFrames({
  inputPath,
  framesDir,
  config,
  video,
  runCommand = runCommandWithTimeout
} = {}) {
  const fps = Number(video?.fps) > 0 ? Number(video.fps) : 25;
  const everyN = Math.max(1, Math.round(fps * config.fpsFloorSeconds));
  const outputPattern = join(framesDir, "raw_%05d.jpg");
  const selectExpression = `gt(scene\\,${config.sceneThreshold})+not(mod(n\\,${everyN}))`;
  const result = await runCommand(config.ffmpegPath, [
    "-y",
    "-i", inputPath,
    "-vf", `select='${selectExpression}',showinfo,scale=640:-1`,
    "-vsync", "vfr",
    outputPattern,
    "-hide_banner",
    "-loglevel", "info"
  ], { timeoutMs: config.timeoutMs });
  const timestamps = parseShowInfoTimestamps(result.stderr);
  const timestampMode = timestamps.length ? "metadata" : "estimated";
  await writeFile(join(framesDir, "frames.json"), JSON.stringify({ timestamps, timestampMode }, null, 2));
  return { timestamps, timestampMode };
}

export async function probeVideoWithFfprobe({
  inputPath,
  ffprobePath = process.env.FFPROBE_PATH || "ffprobe",
  runCommand = runCommandWithTimeout,
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const result = await runCommand(ffprobePath, [
    "-v", "error",
    "-print_format", "json",
    "-show_entries", "format=duration:stream=width,height,avg_frame_rate",
    inputPath
  ], { timeoutMs });
  const payload = JSON.parse(result.stdout || "{}");
  const videoStream = Array.isArray(payload.streams)
    ? payload.streams.find((stream) => Number(stream.width) > 0 && Number(stream.height) > 0) || payload.streams[0]
    : {};
  return {
    durationSeconds: finiteNumber(payload.format?.duration),
    fps: parseFps(videoStream?.avg_frame_rate),
    width: finiteNumber(videoStream?.width),
    height: finiteNumber(videoStream?.height)
  };
}

export async function listTimestampedFrames({
  framesDir,
  video = {},
  extraction = {}
} = {}) {
  const entries = await readdir(framesDir);
  const frameNames = entries.filter((name) => /^raw_\d+\.jpg$/.test(name)).sort();
  const metadata = await readFrameMetadata(framesDir, extraction);
  const duration = Number(video.durationSeconds) > 0 ? Number(video.durationSeconds) : frameNames.length;
  const estimateStep = frameNames.length ? duration / frameNames.length : 0;

  return frameNames.map((name, index) => {
    const metadataSeconds = finiteNumber(metadata.timestamps?.[index]);
    const startSeconds = Number.isFinite(metadataSeconds)
      ? metadataSeconds
      : roundSeconds(index * estimateStep);
    const nextMetadataSeconds = finiteNumber(metadata.timestamps?.[index + 1]);
    const endSeconds = Number.isFinite(nextMetadataSeconds)
      ? nextMetadataSeconds
      : roundSeconds(Math.min(duration, startSeconds + Math.max(estimateStep, 1)));
    return {
      id: `raw-${String(index + 1).padStart(4, "0")}`,
      path: join(framesDir, name),
      order: index + 1,
      startSeconds: roundSeconds(startSeconds),
      endSeconds: roundSeconds(Math.max(endSeconds, startSeconds)),
      kept: true,
      diffPercent: null
    };
  });
}

export async function dedupFrames({
  frames = [],
  readImageSignature,
  thresholdPercent = DEFAULT_DEDUP_THRESHOLD_PERCENT,
  window = DEFAULT_DEDUP_WINDOW,
  maxFrames = DEFAULT_MAX_FRAMES
} = {}) {
  const kept = [];
  const recentSignatures = [];
  for (const frame of frames) {
    const signature = await readImageSignature(frame);
    const distances = recentSignatures.map((recent) => signatureDiffPercent(signature, recent));
    const distance = distances.length ? Math.min(...distances) : null;
    if (distance === null || distance > thresholdPercent) {
      kept.push({
        ...frame,
        id: `frame-${String(kept.length + 1).padStart(4, "0")}`,
        order: kept.length + 1,
        kept: true,
        diffPercent: distance
      });
      recentSignatures.push(signature);
      if (recentSignatures.length > window) recentSignatures.shift();
    }
  }

  const cappedFrames = capFrames(kept, maxFrames);
  return {
    frames: cappedFrames.map((frame, index) => ({
      ...frame,
      id: `frame-${String(index + 1).padStart(4, "0")}`,
      order: index + 1
    })),
    cappedFrameCount: Math.max(0, kept.length - cappedFrames.length)
  };
}

export async function writeContactSheets({
  frames = [],
  gridsDir,
  rows = DEFAULT_GRID_ROWS,
  cols = DEFAULT_GRID_COLS,
  cellWidth = 360,
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  runCommand = runCommandWithTimeout
} = {}) {
  if (!frames.length) return [];
  await mkdir(gridsDir, { recursive: true });
  const perGrid = rows * cols;
  const grids = [];
  for (let offset = 0; offset < frames.length; offset += perGrid) {
    const batch = frames.slice(offset, offset + perGrid);
    const batchNumber = Math.floor(offset / perGrid) + 1;
    const labeledDir = join(gridsDir, `grid_${String(batchNumber).padStart(4, "0")}_frames`);
    await mkdir(labeledDir, { recursive: true });
    for (const [index, frame] of batch.entries()) {
      const label = `${formatSeconds(frame.startSeconds)}s`;
      const outputPath = join(labeledDir, `label_${String(index + 1).padStart(3, "0")}.jpg`);
      await writeLabeledFrame({
        inputPath: frame.path,
        outputPath,
        label,
        cellWidth,
        ffmpegPath,
        timeoutMs,
        runCommand
      });
    }
    const gridPath = join(gridsDir, `grid_${String(batchNumber).padStart(4, "0")}.jpg`);
    await runCommand(ffmpegPath, [
      "-y",
      "-pattern_type", "glob",
      "-i", join(labeledDir, "label_*.jpg"),
      "-vf", `tile=${cols}x${rows}:padding=4:margin=4:color=black`,
      gridPath,
      "-hide_banner",
      "-loglevel", "error"
    ], { timeoutMs });
    grids.push({
      id: `grid-${String(batchNumber).padStart(4, "0")}`,
      path: gridPath,
      frameIds: batch.map((frame) => frame.id),
      startSeconds: batch[0]?.startSeconds ?? 0,
      endSeconds: batch[batch.length - 1]?.endSeconds ?? batch[0]?.endSeconds ?? 0,
      rows,
      cols
    });
  }
  return grids;
}

async function writeLabeledFrame({
  inputPath,
  outputPath,
  label,
  cellWidth,
  ffmpegPath,
  timeoutMs,
  runCommand
}) {
  const labeledFilter = `scale=${cellWidth}:-1,pad=iw:ih+28:0:28:black,drawtext=text='${escapeDrawText(label)}':x=8:y=6:fontcolor=white:fontsize=18:box=1:boxcolor=black@0.45`;
  try {
    await runCommand(ffmpegPath, [
      "-y",
      "-i", inputPath,
      "-vf", labeledFilter,
      outputPath,
      "-hide_banner",
      "-loglevel", "error"
    ], { timeoutMs });
  } catch (error) {
    if (!String(error?.message || "").includes("drawtext")) throw error;
    await runCommand(ffmpegPath, [
      "-y",
      "-i", inputPath,
      "-vf", `scale=${cellWidth}:-1`,
      outputPath,
      "-hide_banner",
      "-loglevel", "error"
    ], { timeoutMs });
  }
}

export function createFfmpegRgbSignatureReader({
  ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  runCommand = runCommandWithTimeout
} = {}) {
  return async (frame) => {
    const result = await runCommand(ffmpegPath, [
      "-i", frame.path,
      "-vf", `scale=${RGB_SIGNATURE_SIZE}:${RGB_SIGNATURE_SIZE}`,
      "-f", "rawvideo",
      "-pix_fmt", "rgb24",
      "pipe:1",
      "-hide_banner",
      "-loglevel", "error"
    ], { timeoutMs, encoding: "buffer" });
    return result.stdout;
  };
}

export function runCommandWithTimeout(command, args, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  encoding = "utf8"
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks = [];
    const stderrChunks = [];
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${command}_timeout`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      const stdoutBuffer = Buffer.concat(stdoutChunks);
      const stderrBuffer = Buffer.concat(stderrChunks);
      const stdout = encoding === "buffer" ? stdoutBuffer : stdoutBuffer.toString();
      const stderr = stderrBuffer.toString();
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `${command} exited with ${code}`));
    });
  });
}

function skippedFramePack(reason, debug = {}) {
  return {
    provider: "crv_style_ffmpeg",
    skipped: true,
    reason,
    video: {},
    frames: [],
    grids: [],
    debug
  };
}

function truncateDiagnosticMessage(message) {
  const text = String(message || "").replace(/\s+/g, " ").trim();
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

async function readFrameMetadata(framesDir, extraction) {
  if (Array.isArray(extraction?.timestamps)) return extraction;
  try {
    return JSON.parse(await readFile(join(framesDir, "frames.json"), "utf8"));
  } catch {
    return { timestamps: [], timestampMode: "estimated" };
  }
}

function parseShowInfoTimestamps(stderr = "") {
  const timestamps = [];
  const pattern = /pts_time:([0-9.]+)/g;
  let match = pattern.exec(stderr);
  while (match) {
    timestamps.push(roundSeconds(Number(match[1])));
    match = pattern.exec(stderr);
  }
  return timestamps;
}

function capFrames(frames, maxFrames) {
  if (!Number.isFinite(maxFrames) || maxFrames <= 0 || frames.length <= maxFrames) return frames;
  if (maxFrames === 1) return [frames[0]];
  const lastIndex = frames.length - 1;
  const selectedIndexes = new Set();
  for (let index = 0; index < maxFrames; index += 1) {
    selectedIndexes.add(Math.round((index * lastIndex) / (maxFrames - 1)));
  }
  return frames.filter((_, index) => selectedIndexes.has(index)).slice(0, maxFrames);
}

function signatureDiffPercent(a, b) {
  const left = toComparableArray(a);
  const right = toComparableArray(b);
  const length = Math.min(left.length, right.length);
  if (!length) return 100;
  if (typeof left[0] !== "number" || typeof right[0] !== "number") {
    let changed = 0;
    for (let index = 0; index < length; index += 1) {
      if (left[index] !== right[index]) changed += 1;
    }
    return (100 * changed) / length;
  }
  let changedPixels = 0;
  const pixelLength = Math.floor(length / 3);
  for (let pixel = 0; pixel < pixelLength; pixel += 1) {
    const offset = pixel * 3;
    const diff = Math.max(
      Math.abs(left[offset] - right[offset]),
      Math.abs(left[offset + 1] - right[offset + 1]),
      Math.abs(left[offset + 2] - right[offset + 2])
    );
    if (diff > RGB_TOLERANCE) changedPixels += 1;
  }
  return pixelLength ? (100 * changedPixels) / pixelLength : 100;
}

function toComparableArray(value) {
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Array.from(value);
  if (Array.isArray(value)) return value;
  return [String(value ?? "")];
}

function parseFps(value) {
  const text = String(value || "");
  const [num, den] = text.split("/").map(Number);
  if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return num / den;
  const number = Number(text);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundSeconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
}

function formatSeconds(value) {
  return roundSeconds(value).toFixed(1);
}

function escapeDrawText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function readPositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function readPositiveFloat(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
