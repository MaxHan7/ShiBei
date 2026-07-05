import assert from "node:assert/strict";
import test from "node:test";

import { extractVideoLearningSource } from "./extractVideoLearningSource.js";
import { createMediaUsageRecorder } from "./mediaCost.js";

test("extracts a video learning source through provider, media, audio, and ASR", async () => {
  const calls = [];
  const learningSource = await extractVideoLearningSource({
    sourceUrl: "https://v.douyin.com/abc/",
    provider: {
      fetchVideoSource: async () => {
        calls.push("provider");
        return {
          provider: "tikhub",
          platform: "douyin",
          providerContentId: "douyin-1",
          title: "AI 产品调研",
          description: "平台文案说明这条视频讲 AI 调研流程，强调先定义问题，再整理证据，并把访谈记录转成可验证的主题清单。",
          account: "产品老张",
          sourceUrl: "https://v.douyin.com/abc/",
          mediaUrl: "https://media.example.com/video.mp4",
          coverUrl: "https://media.example.com/cover.jpg",
          durationSeconds: 60
        };
      }
    },
    downloadMedia: async () => {
      calls.push("download");
      return { path: "/tmp/video-dir/source-video", dir: "/tmp/video-dir" };
    },
    extractAudio: async () => {
      calls.push("audio");
      return { path: "/tmp/video-dir/audio.wav", dir: "/tmp/video-dir" };
    },
    transcribeAudio: async () => {
      calls.push("asr");
      return {
        segments: [
          {
            id: "seg-1",
            startSeconds: 0,
            endSeconds: 4,
            text: "先明确用户问题，再整理主题，并检查每个主题有没有原始证据支撑。最后把主题映射到可以执行的产品实验，避免只停留在总结层面。"
          }
        ]
      };
    },
    cleanup: async (...files) => {
      calls.push(`cleanup:${files.length}`);
    }
  });

  assert.deepEqual(calls, ["provider", "download", "audio", "asr", "cleanup:2"]);
  assert.equal(learningSource.platform, "douyin");
  assert.match(learningSource.normalizedText, /平台文案/);
  assert.match(learningSource.normalizedText, /先明确用户问题/);
});

test("cleans temporary files when ASR fails", async () => {
  const calls = [];
  await assert.rejects(
    () => extractVideoLearningSource({
      sourceUrl: "https://v.douyin.com/abc/",
      provider: {
        fetchVideoSource: async () => ({
          provider: "tikhub",
          platform: "douyin",
          title: "AI 产品调研",
          sourceUrl: "https://v.douyin.com/abc/",
          mediaUrl: "https://media.example.com/video.mp4"
        })
      },
      downloadMedia: async () => ({ path: "/tmp/video-dir/source-video", dir: "/tmp/video-dir" }),
      extractAudio: async () => ({ path: "/tmp/video-dir/audio.wav", dir: "/tmp/video-dir" }),
      transcribeAudio: async () => {
        throw new Error("asr failed");
      },
      cleanup: async (...files) => calls.push(`cleanup:${files.length}`)
    }),
    /asr failed/
  );
  assert.deepEqual(calls, ["cleanup:2"]);
});

test("records media usage summary when a recorder is provided", async () => {
  const recorder = createMediaUsageRecorder({ runId: "run-1" });
  const learningSource = await extractVideoLearningSource({
    sourceUrl: "https://v.douyin.com/abc/",
    mediaUsageRecorder: recorder,
    provider: {
      fetchVideoSource: async () => ({
        provider: "tikhub",
        platform: "douyin",
        providerContentId: "douyin-1",
        title: "AI 产品调研",
        description: "平台文案说明这条视频讲 AI 调研流程，强调先定义问题，再整理证据，并形成产品实验。",
        account: "产品老张",
        sourceUrl: "https://v.douyin.com/abc/",
        mediaUrl: "https://media.example.com/video.mp4"
      })
    },
    downloadMedia: async () => ({ path: "/tmp/video-dir/source-video", dir: "/tmp/video-dir", bytes: 1200, contentType: "video/mp4" }),
    extractAudio: async () => ({ path: "/tmp/video-dir/audio.wav", dir: "/tmp/video-dir", format: "wav", sampleRate: 16000 }),
    transcribeAudio: async () => ({
      segments: [
        {
          id: "seg-1",
          startSeconds: 0,
          endSeconds: 8,
          text: "先明确用户问题，再整理主题，并检查每个主题有没有原始证据支撑，最后映射到可执行实验。"
        }
      ]
    }),
    cleanup: async () => {}
  });

  assert.equal(recorder.calls.length, 4);
  assert.equal(learningSource.extractionMeta.mediaUsage.callCount, 4);
  assert.equal(learningSource.extractionMeta.mediaUsage.byStage.video_media_fetch.callCount, 1);
});
