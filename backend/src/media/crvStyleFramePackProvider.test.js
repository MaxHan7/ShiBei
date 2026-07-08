import test from "node:test";
import assert from "node:assert/strict";

import {
  createCrvStyleFramePackProvider,
  dedupFrames,
  listTimestampedFrames,
  probeVideoWithFfprobe
} from "./crvStyleFramePackProvider.js";

test("creates timestamped frame pack from injected ffmpeg outputs", async () => {
  const calls = [];
  const provider = createCrvStyleFramePackProvider({
    env: {
      VIDEO_FRAME_MAX_FRAMES: "3",
      VIDEO_FRAME_FPS_FLOOR_SECONDS: "1",
      VIDEO_FRAME_SCENE_THRESHOLD: "0.3"
    },
    runCommand: async (command, args) => {
      calls.push({ command, args });
      return { stdout: "", stderr: "n:0 pts_time:0\nn:1 pts_time:1\nn:2 pts_time:2\n" };
    },
    probeVideo: async () => ({ durationSeconds: 3, fps: 30, width: 1080, height: 1920 }),
    listExtractedFrames: async () => [
      { id: "raw-0001", path: "/tmp/frames/raw_00001.jpg", order: 1, startSeconds: 0, endSeconds: 1, kept: true },
      { id: "raw-0002", path: "/tmp/frames/raw_00002.jpg", order: 2, startSeconds: 1, endSeconds: 2, kept: true },
      { id: "raw-0003", path: "/tmp/frames/raw_00003.jpg", order: 3, startSeconds: 2, endSeconds: 3, kept: true }
    ],
    readImageSignature: async (frame) => [frame.path],
    writeGridImages: async ({ frames }) => [{
      id: "grid-0001",
      path: "/tmp/grids/grid_0001.jpg",
      frameIds: frames.map((frame) => frame.id),
      startSeconds: 0,
      endSeconds: 3,
      rows: 3,
      cols: 3
    }]
  });

  const result = await provider.createFramePack({
    mediaFile: { path: "/tmp/source.mp4", dir: "/tmp" }
  });

  assert.equal(result.provider, "crv_style_ffmpeg");
  assert.equal(result.skipped, false);
  assert.equal(result.frames.length, 3);
  assert.equal(result.frames[1].startSeconds, 1);
  assert.equal(result.grids.length, 1);
  assert.equal(result.debug.keptFrameCount, 3);
  assert.equal(calls.length, 1);
  assert.match(calls[0].args.join(" "), /select=/);
});

test("returns structured diagnostics when frame pack creation fails", async () => {
  const provider = createCrvStyleFramePackProvider({
    probeVideo: async () => {
      throw new Error("ffprobe failed because codec is unsupported and stderr contains details");
    }
  });

  const result = await provider.createFramePack({
    mediaFile: { path: "/tmp/source.mp4", dir: "/tmp" }
  });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "video_frame_pack_failed");
  assert.equal(result.debug.failureCode, "video_frame_pack_failed");
  assert.equal(result.debug.retryable, true);
  assert.match(result.debug.failureMessage, /ffprobe failed/);
});

test("truncates long frame pack failure diagnostics", async () => {
  const provider = createCrvStyleFramePackProvider({
    probeVideo: async () => {
      throw new Error("x".repeat(400));
    }
  });

  const result = await provider.createFramePack({
    mediaFile: { path: "/tmp/source.mp4", dir: "/tmp" }
  });

  assert.equal(result.debug.failureMessage.length, 240);
  assert.match(result.debug.failureMessage, /\.\.\.$/);
});

test("caps deduped frames across the full video", async () => {
  const frames = Array.from({ length: 6 }, (_, index) => ({
    id: `raw-${index + 1}`,
    path: `/tmp/${index + 1}.jpg`,
    order: index + 1,
    startSeconds: index,
    endSeconds: index + 1,
    kept: true
  }));

  const result = await dedupFrames({
    frames,
    readImageSignature: async (frame) => [frame.path],
    thresholdPercent: 1,
    window: 2,
    maxFrames: 3
  });

  assert.equal(result.frames.length, 3);
  assert.deepEqual(result.frames.map((frame) => frame.startSeconds), [0, 3, 5]);
  assert.equal(result.cappedFrameCount, 3);
});

test("deduplicates frames against a sliding window", async () => {
  const frames = [
    { id: "raw-1", path: "/tmp/a.jpg", order: 1, startSeconds: 0, endSeconds: 1 },
    { id: "raw-2", path: "/tmp/a-copy.jpg", order: 2, startSeconds: 1, endSeconds: 2 },
    { id: "raw-3", path: "/tmp/b.jpg", order: 3, startSeconds: 2, endSeconds: 3 }
  ];
  const signatures = {
    "/tmp/a.jpg": Buffer.from([0, 0, 0, 0, 0, 0]),
    "/tmp/a-copy.jpg": Buffer.from([1, 1, 1, 1, 1, 1]),
    "/tmp/b.jpg": Buffer.from([255, 255, 255, 255, 255, 255])
  };

  const result = await dedupFrames({
    frames,
    readImageSignature: async (frame) => signatures[frame.path],
    thresholdPercent: 8,
    window: 2,
    maxFrames: 10
  });

  assert.equal(result.frames.length, 2);
  assert.deepEqual(result.frames.map((frame) => frame.path), ["/tmp/a.jpg", "/tmp/b.jpg"]);
});

test("probes video metadata from ffprobe json", async () => {
  const result = await probeVideoWithFfprobe({
    inputPath: "/tmp/source.mp4",
    runCommand: async () => ({
      stdout: JSON.stringify({
        format: { duration: "76.2" },
        streams: [{ width: 1080, height: 1920, avg_frame_rate: "30000/1001" }]
      }),
      stderr: ""
    })
  });

  assert.equal(result.durationSeconds, 76.2);
  assert.equal(result.width, 1080);
  assert.equal(result.height, 1920);
  assert.ok(result.fps > 29);
});

test("estimates timestamps when metadata is unavailable", async (t) => {
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "shibei-frame-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "raw_00001.jpg"), "");
  await writeFile(join(dir, "raw_00002.jpg"), "");

  const frames = await listTimestampedFrames({
    framesDir: dir,
    video: { durationSeconds: 4 },
    extraction: { timestamps: [], timestampMode: "estimated" }
  });

  assert.equal(frames.length, 2);
  assert.deepEqual(frames.map((frame) => frame.startSeconds), [0, 2]);
  assert.deepEqual(frames.map((frame) => frame.endSeconds), [2, 4]);
});
