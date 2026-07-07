import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchPlatformSubtitleTranscript,
  normalizeSubtitleTracks
} from "./platformSubtitles.js";

test("normalizes object subtitle tracks", () => {
  const tracks = normalizeSubtitleTracks({
    "zh-CN": [{ url: "https://media.example.com/zh.srt", format: 0 }],
    source: [{ language: "en-US", url: "https://media.example.com/source.srt" }]
  });

  assert.deepEqual(tracks.map((track) => track.language), ["zh-CN", "en-US"]);
  assert.equal(tracks[0].url, "https://media.example.com/zh.srt");
});

test("fetches preferred platform SRT subtitles as transcript segments", async () => {
  const transcript = await fetchPlatformSubtitleTranscript({
    subtitles: {
      "en-US": [{ url: "https://media.example.com/en.srt" }],
      "zh-CN": [{ url: "https://media.example.com/zh.srt" }]
    },
    fetchImpl: async (url) => {
      assert.equal(String(url), "https://media.example.com/zh.srt");
      return {
        ok: true,
        text: async () => `1
00:00:01,000 --> 00:00:03,500
先确定设计意图。

2
00:00:04,000 --> 00:00:07,000
再检查视觉层级和交互动效。`
      };
    }
  });

  assert.equal(transcript.provider, "platform_subtitle:zh-CN");
  assert.equal(transcript.segments.length, 2);
  assert.equal(transcript.segments[0].startSeconds, 1);
  assert.equal(transcript.segments[0].endSeconds, 3.5);
  assert.match(transcript.text, /视觉层级/);
});

test("returns null when subtitles are unavailable or invalid", async () => {
  assert.equal(await fetchPlatformSubtitleTranscript({ subtitles: null }), null);
  assert.equal(await fetchPlatformSubtitleTranscript({
    subtitles: { "zh-CN": [{ url: "https://media.example.com/zh.srt" }] },
    fetchImpl: async () => ({ ok: false, text: async () => "" })
  }), null);
});
