import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { transcribeAudioWithLocalWhisper } from "./localWhisperTranscriptionProvider.js";

test("runs local faster-whisper script and normalizes transcript output", async () => {
  const spawnCalls = [];
  const result = await transcribeAudioWithLocalWhisper({
    audioPath: "/tmp/audio.wav",
    pythonPath: "/usr/bin/python3",
    scriptPath: "/app/transcribe-local-whisper.py",
    model: "base",
    device: "cpu",
    computeType: "int8",
    language: "zh",
    spawnImpl: (command, args) => {
      spawnCalls.push({ command, args });
      return fakeChildProcess({
        stdout: JSON.stringify({
          text: "先定义问题，再整理证据。",
          segments: [
            { start: 0, end: 2, text: "先定义问题，" },
            { start: 2, end: 4, text: "再整理证据。" }
          ]
        })
      });
    }
  });

  assert.equal(spawnCalls[0].command, "/usr/bin/python3");
  assert.deepEqual(spawnCalls[0].args, [
    "/app/transcribe-local-whisper.py",
    "--audio", "/tmp/audio.wav",
    "--model", "base",
    "--device", "cpu",
    "--compute-type", "int8",
    "--language", "zh"
  ]);
  assert.equal(result.provider, "local_whisper");
  assert.equal(result.text, "先定义问题，再整理证据。");
  assert.equal(result.segments.length, 2);
  assert.equal(result.segments[1].endSeconds, 4);
});

test("classifies missing faster-whisper runtime as non-retryable config failure", async () => {
  await assert.rejects(
    () => transcribeAudioWithLocalWhisper({
      audioPath: "/tmp/audio.wav",
      spawnImpl: () => fakeChildProcess({
        stderr: "ModuleNotFoundError: No module named 'faster_whisper'",
        exitCode: 1
      })
    }),
    (error) => {
      assert.equal(error.code, "failed_extract_video");
      assert.equal(error.mediaErrorType, "asr_config_missing");
      assert.equal(error.retryable, false);
      assert.equal(error.provider, "local_whisper");
      return true;
    }
  );
});

test("classifies malformed local whisper output as retryable ASR failure", async () => {
  await assert.rejects(
    () => transcribeAudioWithLocalWhisper({
      audioPath: "/tmp/audio.wav",
      spawnImpl: () => fakeChildProcess({ stdout: "not json" })
    }),
    (error) => {
      assert.equal(error.mediaErrorType, "asr_unavailable");
      assert.equal(error.retryable, true);
      return true;
    }
  );
});

function fakeChildProcess({
  stdout = "",
  stderr = "",
  exitCode = 0
} = {}) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = () => {};
  queueMicrotask(() => {
    if (stdout) child.stdout.emit("data", Buffer.from(stdout));
    if (stderr) child.stderr.emit("data", Buffer.from(stderr));
    child.emit("close", exitCode);
  });
  return child;
}
