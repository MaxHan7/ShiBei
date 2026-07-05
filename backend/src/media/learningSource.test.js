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
  assert.equal(learningSource.sourceSections.length, 3);
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
