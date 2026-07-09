import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { downloadYtDlpMediaToTempFile } from "./ytDlpMediaDownloader.js";

test("downloads merged media through yt-dlp into a temp file", async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "shibei-ytdlp-test-"));
  const calls = [];
  try {
    const file = await downloadYtDlpMediaToTempFile({
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      tmpRoot,
      spawnImpl: createDownloadMockSpawn({ calls })
    });

    assert.equal(calls[0].args.includes("--merge-output-format"), true);
    assert.equal(file.contentType, "video/mp4");
    assert.equal(file.bytes, 10);
    assert.match(file.path, /source-video\.mp4$/);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("classifies missing yt-dlp downloader runtime as provider config failure", async () => {
  await assert.rejects(
    () => downloadYtDlpMediaToTempFile({
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      spawnImpl: createDownloadMockSpawn({
        stderr: "ModuleNotFoundError: No module named 'yt_dlp'",
        exitCode: 1
      })
    }),
    (error) => error.mediaErrorType === "provider_config_missing" && error.retryable === false
  );
});

test("rejects yt-dlp output larger than max bytes", async () => {
  await assert.rejects(
    () => downloadYtDlpMediaToTempFile({
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      maxBytes: 4,
      spawnImpl: createDownloadMockSpawn({ output: "too-large" })
    }),
    (error) => error.mediaErrorType === "video_media_too_large" && error.retryable === false
  );
});

function createDownloadMockSpawn({ calls = [], stderr = "", exitCode = 0, output = "fake-video" } = {}) {
  return (command, args) => {
    calls.push({ command, args });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {};
    queueMicrotask(async () => {
      const outputIndex = args.indexOf("-o");
      const outputTemplate = outputIndex >= 0 ? args[outputIndex + 1] : "";
      if (!stderr && outputTemplate) {
        await writeFile(outputTemplate.replace("%(ext)s", "mp4"), output);
      }
      if (stderr) child.stderr.write(stderr);
      child.stdout.end();
      child.stderr.end();
      child.emit("close", exitCode);
    });
    return child;
  };
}
