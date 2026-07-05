import assert from "node:assert/strict";
import test from "node:test";

import { extractAudioWithFfmpeg } from "./ffmpegAudio.js";

test("builds ffmpeg command for mono wav extraction", async () => {
  const calls = [];
  const result = await extractAudioWithFfmpeg({
    inputPath: "/tmp/source-video",
    outputDir: "/tmp/audio",
    runCommand: async (command, args) => {
      calls.push({ command, args });
    }
  });

  assert.equal(result.path, "/tmp/audio/audio.wav");
  assert.equal(calls[0].command, "ffmpeg");
  assert.deepEqual(calls[0].args.slice(0, 3), ["-y", "-i", "/tmp/source-video"]);
  assert.equal(calls[0].args.includes("-ac"), true);
  assert.equal(calls[0].args.includes("1"), true);
});
