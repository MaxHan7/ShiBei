import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";

import { fetchYtDlpVideoSource } from "./ytDlpVideoProvider.js";

test("normalizes yt-dlp metadata for YouTube links", async () => {
  const calls = [];
  const source = await fetchYtDlpVideoSource({
    sourceUrl: "https://www.youtube.com/watch?v=abc",
    spawnImpl: createMockSpawn({
      calls,
      stdout: JSON.stringify({
        id: "abc",
        title: "Design systems explained",
        description: "A short lesson about design systems.",
        uploader: "Design Teacher",
        webpage_url: "https://www.youtube.com/watch?v=abc",
        thumbnail: "https://img.example.com/cover.jpg",
        duration: 92,
        subtitles: {
          "zh-CN": [{ url: "https://subtitle.example.com/zh.vtt", ext: "vtt" }]
        }
      })
    })
  });

  assert.equal(calls[0].args.includes("-J"), true);
  assert.equal(source.provider, "yt-dlp");
  assert.equal(source.platform, "youtube");
  assert.equal(source.providerContentId, "abc");
  assert.equal(source.title, "Design systems explained");
  assert.equal(source.account, "Design Teacher");
  assert.equal(source.coverUrl, "https://img.example.com/cover.jpg");
  assert.equal(source.durationSeconds, 92);
  assert.equal(source.subtitles[0].language, "zh-CN");
  assert.equal(source.mediaDownload.provider, "yt-dlp");
  assert.equal(source.mediaDownload.sourceUrl, "https://www.youtube.com/watch?v=abc");
});

test("normalizes yt-dlp metadata for Bilibili links", async () => {
  const source = await fetchYtDlpVideoSource({
    sourceUrl: "https://www.bilibili.com/video/BV1demo",
    spawnImpl: createMockSpawn({
      stdout: JSON.stringify({
        id: "BV1demo",
        title: "多 Agent 通信设计",
        uploader: "小哲讲大模型",
        webpage_url: "https://www.bilibili.com/video/BV1demo",
        duration: 180
      })
    })
  });

  assert.equal(source.provider, "yt-dlp");
  assert.equal(source.platform, "bilibili");
  assert.equal(source.title, "多 Agent 通信设计");
  assert.equal(source.account, "小哲讲大模型");
});

test("classifies missing yt-dlp runtime as provider config failure", async () => {
  await assert.rejects(
    () => fetchYtDlpVideoSource({
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      spawnImpl: createMockSpawn({
        stderr: "ModuleNotFoundError: No module named 'yt_dlp'",
        exitCode: 1
      })
    }),
    (error) => error.mediaErrorType === "provider_config_missing" && error.retryable === false
  );
});

function createMockSpawn({ calls = [], stdout = "", stderr = "", exitCode = 0 } = {}) {
  return (command, args) => {
    calls.push({ command, args });
    const child = new EventEmitter();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = () => {};
    queueMicrotask(() => {
      if (stdout) child.stdout.write(stdout);
      if (stderr) child.stderr.write(stderr);
      child.stdout.end();
      child.stderr.end();
      child.emit("close", exitCode);
    });
    return child;
  };
}
