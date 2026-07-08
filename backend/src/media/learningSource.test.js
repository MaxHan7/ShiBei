import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLearningSourceFromVideo,
  buildV2SourceFromLearningSource
} from "./learningSource.js";

test("merges platform description and transcript into normalized text", () => {
  const learningSource = buildLearningSourceFromVideo({
    platform: "douyin",
    title: "用 AI 做产品调研",
    url: "https://v.douyin.com/abc/",
    account: "产品老张",
    description: "这条视频讲 AI 调研流程，重点是把模糊需求先变成可验证的问题，再用访谈记录和用户行为证据整理主题。",
    transcriptSegments: [
      { id: "seg-1", startSeconds: 0, endSeconds: 4, text: "第一步先明确用户问题，不要一上来就让 AI 总结材料。" },
      { id: "seg-2", startSeconds: 4, endSeconds: 8, text: "第二步把访谈记录整理成主题，再检查每个主题有没有原始证据支撑。" }
    ],
    media: { provider: "tikhub", providerContentId: "video-1" }
  });

  assert.equal(learningSource.sourceType, "video_link");
  assert.match(learningSource.normalizedText, /平台文案/);
  assert.match(learningSource.normalizedText, /第一步先明确用户问题/);
  assert.equal(learningSource.sourceSections.length, 2);
});

test("groups short transcript segments into readable timestamped source sections", () => {
  const transcriptSegments = [
    { id: "seg-1", startSeconds: 0, endSeconds: 3, text: "面试官问你多个 Agent 的协作" },
    { id: "seg-2", startSeconds: 3, endSeconds: 6, text: "他们之间的通信你怎么设计" },
    { id: "seg-3", startSeconds: 6, endSeconds: 9, text: "很多人一听就懵" },
    { id: "seg-4", startSeconds: 9, endSeconds: 12, text: "通信不就是一个 Agent 把结果发给另一个 Agent 吗" },
    { id: "seg-5", startSeconds: 12, endSeconds: 15, text: "有啥好设计的" },
    { id: "seg-6", startSeconds: 15, endSeconds: 18, text: "你要真这么答" },
    { id: "seg-7", startSeconds: 18, endSeconds: 21, text: "面试官立马知道你没搭过多 Agent 的系统" },
    { id: "seg-8", startSeconds: 21, endSeconds: 24, text: "因为多 Agent 系统失败往往不是单个 Agent 不行" },
    { id: "seg-9", startSeconds: 24, endSeconds: 27, text: "而是 Agent 之间协调出了问题" },
    { id: "seg-10", startSeconds: 27, endSeconds: 30, text: "信息传丢了传歪了交接的时候上下文断了" }
  ];

  const learningSource = buildLearningSourceFromVideo({
    platform: "douyin",
    title: "多 Agent 通信",
    url: "https://v.douyin.com/agent/",
    transcriptSegments,
    media: { provider: "tikhub", providerContentId: "agent-video" }
  });
  const transcriptSections = learningSource.sourceSections.filter((section) =>
    section.sourceRole === "audio_transcript"
  );

  assert.equal(learningSource.transcriptSegments.length, transcriptSegments.length);
  assert.equal(transcriptSections.length, 2);
  assert.equal(transcriptSections[0].startSeconds, 0);
  assert.equal(transcriptSections[0].endSeconds, 24);
  assert.deepEqual(transcriptSections[0].segmentIds, [
    "seg-1",
    "seg-2",
    "seg-3",
    "seg-4",
    "seg-5",
    "seg-6",
    "seg-7",
    "seg-8"
  ]);
  assert.match(transcriptSections[0].text, /面试官问你多个 Agent 的协作，他们之间的通信你怎么设计/);
  assert.equal(transcriptSections[1].startSeconds, 24);
  assert.equal(transcriptSections[1].endSeconds, 30);
});

test("builds backward-compatible V2 source blocks with optional video metadata", () => {
  const learningSource = buildLearningSourceFromVideo({
    platform: "xiaohongshu",
    title: "小红书案例",
    url: "https://www.xiaohongshu.com/explore/1",
    account: "增长笔记",
    description: "这是一个增长案例文案，提供了足够上下文来生成复习内容，核心是先定义用户动作，再判断漏斗里真正卡住的位置。",
    transcriptSegments: [
      { id: "seg-1", startSeconds: 12, endSeconds: 18, text: "这里解释如何先定位用户问题，再整理访谈主题，并把主题映射到可行动的产品实验。" }
    ],
    media: { provider: "tikhub" }
  });
  const source = buildV2SourceFromLearningSource(learningSource);

  assert.equal(source.type, "video_link");
  assert.equal(source.title, "小红书案例");
  assert.equal(source.account, "增长笔记");
  assert.equal(source.blocks[0].type, "paragraph");
  assert.equal(source.blocks[0].sourceRole, "platform_description");
  assert.equal(source.blocks[1].startSeconds, 12);
  assert.match(source.cleanedText, /增长案例文案/);
});

test("copies only user-facing video content basis into V2 source", () => {
  const learningSource = buildLearningSourceFromVideo({
    platform: "douyin",
    title: "多 Agent 通信",
    url: "https://v.douyin.com/agent/",
    account: "小哲讲大模型",
    description: "平台文案说明这条视频讲多 Agent 通信设计，核心是拓扑、契约和共享状态。",
    transcriptSegments: [
      {
        id: "seg-1",
        startSeconds: 0,
        endSeconds: 8,
        text: "多 Agent 通信设计要先选择通信拓扑，再定义结构化消息契约，最后维护共享状态。"
      }
    ],
    media: { provider: "tikhub" }
  });
  learningSource.extractionMeta.visualUnderstanding = {
    status: "failed",
    provider: "qwen-vl",
    failureCode: "visual_output_parse_failed",
    failureMessage: "no_json_object"
  };
  learningSource.extractionMeta.userVisibleContentBasis = {
    basis: "audio_transcript",
    message: "本次主要基于视频字幕生成"
  };

  const source = buildV2SourceFromLearningSource(learningSource);

  assert.deepEqual(source.contentBasis, {
    basis: "audio_transcript",
    message: "本次主要基于视频字幕生成"
  });
  assert.equal(source.contentBasis.provider, undefined);
  assert.equal(source.contentBasis.failureCode, undefined);
  assert.equal(source.contentBasis.failureMessage, undefined);
});

test("rejects video sources with too little learnable text", () => {
  assert.throws(
    () => buildLearningSourceFromVideo({
      platform: "douyin",
      title: "短视频",
      url: "https://v.douyin.com/abc/",
      transcriptSegments: [],
      media: { provider: "tikhub" }
    }),
    /没有提取到足够的可复习内容/
  );
});
