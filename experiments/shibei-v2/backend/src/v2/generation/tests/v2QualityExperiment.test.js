import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildV2QualityReport,
  buildV2QualityRunPaths,
  renderV2QualityReportHtml,
  resolveUniqueV2QualityRunPaths,
  writeV2QualityArtifacts
} from "./v2QualityExperiment.js";

test("renders a readable V2 quality HTML report with questions and source anchors", () => {
  const report = buildV2QualityReport({
    slug: "demo",
    label: "demo-run",
    source: { sourceTitle: "Hook 测试文章", sourceUrl: "https://example.com/a", rawText: "原文" },
    jobResult: {
      status: "completed",
      chapter: chapterFixture()
    },
    generatedAt: "2026-06-19T00:00:00.000Z"
  });

  const html = renderV2QualityReportHtml(report);

  assert.match(html, /V2 出题质量报告/);
  assert.match(html, /Hook 测试文章/);
  assert.match(html, /短版/);
  assert.match(html, /长版/);
  assert.match(html, /选择题/);
  assert.match(html, /连线题/);
  assert.match(html, /L1 → R1/);
  assert.match(html, /解释：/);
  assert.match(html, /sourceAnchorId: a1/);
  assert.match(html, /source-block highlight/);
});

test("renders generation failures for quality review", () => {
  const report = buildV2QualityReport({
    slug: "failed",
    label: "failed-run",
    source: { sourceTitle: "失败样例", rawText: "原文" },
    jobResult: {
      status: "failed_quality",
      failedStage: "quality_checking",
      failureReason: "source anchor 不够精准",
      retryable: true,
      issues: [{ code: "weak_source_anchor", message: "source anchor 不够精准" }]
    }
  });

  const html = renderV2QualityReportHtml(report);

  assert.match(html, /生成失败/);
  assert.match(html, /quality_checking/);
  assert.match(html, /source anchor 不够精准/);
});

test("writes unique JSON and HTML artifacts", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "v2-quality-"));
  try {
    const first = await resolveUniqueV2QualityRunPaths(buildV2QualityRunPaths({
      outputRoot: tmpDir,
      slug: "demo",
      label: "run",
      date: new Date("2026-06-19T00:00:00.000Z")
    }));
    const report = buildV2QualityReport({
      slug: "demo",
      label: "run",
      source: { sourceTitle: "文章", rawText: "正文" },
      jobResult: { status: "completed", chapter: chapterFixture() }
    });

    await writeV2QualityArtifacts({ report, paths: first });
    const second = await resolveUniqueV2QualityRunPaths(buildV2QualityRunPaths({
      outputRoot: tmpDir,
      slug: "demo",
      label: "run",
      date: new Date("2026-06-19T00:00:00.000Z")
    }));

    assert.notEqual(second.jsonPath, first.jsonPath);
    assert.match(await readFile(first.htmlPath, "utf8"), /V2 出题质量报告/);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

function chapterFixture() {
  return {
    id: "demo",
    title: "Hook 测试文章",
    summaryCard: { text: "章节概要文本" },
    source: {
      title: "Hook 测试文章",
      blocks: [
        { id: "b1", type: "paragraph", text: "Hook 会在生命周期的特定点触发。" },
        { id: "b2", type: "paragraph", text: "Handler 可以检查输入并执行动作。" }
      ]
    },
    units: [
      {
        id: "u1",
        order: 1,
        title: "Hook 的触发机制",
        shortSummary: "Hook 是触发点。",
        detailSummary: "Hook 会在生命周期的特定点触发，把上下文传给 handler。",
        sourceAnchor: { id: "a1", blockIds: ["b1", "b2"] },
        overview: { text: "理解 hook 的触发机制。" },
        questions: [
          {
            id: "q1",
            type: "multiple_choice",
            stem: "Hook 在什么时候触发？",
            options: [
              { id: "A", text: "生命周期特定点" },
              { id: "B", text: "用户关闭页面后" },
              { id: "C", text: "随机时间" },
              { id: "D", text: "只在安装时" }
            ],
            correctOptionId: "A",
            explanation: "Hook 是由生命周期事件触发的。",
            sourceAnchorId: "a1"
          },
          {
            id: "q2",
            type: "matching",
            stem: "匹配 hook 相关概念。",
            leftItems: [
              { id: "L1", text: "Hook" },
              { id: "L2", text: "Handler" },
              { id: "L3", text: "Context" },
              { id: "L4", text: "Decision" }
            ],
            rightItems: [
              { id: "R1", text: "触发点" },
              { id: "R2", text: "执行逻辑" },
              { id: "R3", text: "输入信息" },
              { id: "R4", text: "返回判断" }
            ],
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" },
              { leftId: "L3", rightId: "R3" },
              { leftId: "L4", rightId: "R4" }
            ],
            explanation: "四个概念分别对应触发、执行、输入和判断。",
            sourceAnchorId: "a1"
          }
        ],
        summary: { title: "单元完成", text: "你已经理解了 hook 的触发机制。" }
      }
    ],
    chapterSummary: {
      title: "章节完成",
      statsText: "共 1 个核心知识点，2 道题目",
      encouragementText: "你已经掌握了 hook 的核心用法。"
    }
  };
}
