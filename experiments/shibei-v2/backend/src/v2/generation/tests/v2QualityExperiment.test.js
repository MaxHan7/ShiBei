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
      chapter: chapterFixture(),
      modelUsage: [
        {
          index: 1,
          provider: "deepseek",
          model: "deepseek-v4-flash",
          stage: "v2_ecdPlanning",
          estimatedOutputTokens: 900,
          usage: {
            prompt_tokens: 1200,
            completion_tokens: 345,
            total_tokens: 1545,
            prompt_cache_hit_tokens: 1000,
            prompt_cache_miss_tokens: 200
          }
        }
      ]
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
  assert.match(html, /Micro Knowledge Map/);
  assert.match(html, /micro-u1-1 · high · process_step/);
  assert.match(html, /Compact ECD Task Model/);
  assert.match(html, /Assessable Targets/);
  assert.match(html, /Selected Tasks/);
  assert.match(html, /target-001/);
  assert.match(html, /micro-u1-1/);
  assert.match(html, /step_purpose_matching/);
  assert.doesNotMatch(html, /Learning Claims/);
  assert.doesNotMatch(html, /Evidence Needs/);
  assert.match(html, /质量诊断/);
  assert.match(html, /distractor value: pass/);
  assert.match(html, /matching relation value: pass/);
  assert.match(html, /Source Context Stats/);
  assert.match(html, /unitKnowledgeMap: b1, b2/);
  assert.match(html, /Stage Runtime Reliability/);
  assert.match(html, /Architecture Metrics/);
  assert.match(html, /Total tokens/);
  assert.match(html, /1,545/);
  assert.match(html, /1,000 \/ 200/);
  assert.match(html, /v2_ecdPlanning/);
  assert.match(html, /Runtime retries/);
  assert.match(html, /展开完整 source block/);
  assert.match(html, /这一段是为了测试长 source block/);
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
      modelStage: "qualityJudge",
      retryAttempts: 2,
      issues: [{ code: "weak_source_anchor", message: "source anchor 不够精准" }],
      diagnostics: [
        {
          unitId: "u1",
          questionId: "q1",
          questionType: "multiple_choice",
          checks: { sourceAnchorPrecision: "missing_or_mismatched" },
          issues: [{ code: "weak_source_anchor", message: "source anchor 不够精准" }]
        }
      ],
      modelUsage: [
        {
          index: 1,
          provider: "deepseek",
          model: "deepseek-v4-flash",
          stage: "v2_qualityJudge",
          estimatedOutputTokens: 900,
          error: "模型返回内容不是可解析 JSON",
          parseError: "Unexpected token",
          rawResponsePreview: "{ bad"
        }
      ]
    }
  });

  const html = renderV2QualityReportHtml(report);

  assert.match(html, /生成失败/);
  assert.match(html, /quality_checking/);
  assert.match(html, /模型阶段：qualityJudge/);
  assert.match(html, /source anchor 不够精准/);
  assert.match(html, /模型调用记录/);
  assert.match(html, /v2_qualityJudge/);
  assert.match(html, /raw response preview/);
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
        { id: "b1", type: "paragraph", text: `Hook 会在生命周期的特定点触发。这一段是为了测试长 source block 在质量报告里默认展示预览，同时保留完整文本供人工展开审查。${"补充说明".repeat(40)}` },
        { id: "b2", type: "paragraph", text: "Handler 可以检查输入并执行动作。" }
      ]
    },
    units: [
      {
        id: "u1",
        order: 1,
        title: "Hook 的触发机制",
        nodeLabel: "触发机制",
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
    },
    generationMeta: {
      unitKnowledgeMap: {
        units: [
          {
            unitId: "u1",
            microKnowledgePoints: [
              {
                microId: "micro-u1-1",
                title: "Hook 流程角色",
                summary: "Hook、Handler、Context、Decision 是流程中的不同角色。",
                role: "process_step",
                assessmentValue: "high",
                suggestedEvidenceAngles: ["structure_mapping"],
                sourceAnchorId: "a1",
                sourceSupport: "原文说明 Hook 触发并把上下文传给 handler。"
              }
            ]
          }
        ]
      },
      ecdPlanning: {
        units: [
          {
            unitId: "u1",
            assessableTargets: [
              {
                targetId: "target-001",
                microId: "micro-u1-1",
                title: "Hook 流程角色",
                importance: "required",
                learningTarget: "用户能理解 Hook、Handler、Context、Decision 在流程中的作用。",
                sourceAnchorId: "a1"
              }
            ],
            selectedTasks: [
              {
                questionPlanId: "q2",
                targetIds: ["target-001"],
                microIds: ["micro-u1-1"],
                taskAffordance: "matching",
                taskPurpose: "step_purpose_matching",
                evidenceGoal: "观察用户是否能把四个概念匹配到流程作用。",
                commonMisconception: "把 Hook、Handler、Context、Decision 混成同一个概念。",
                sourceAnchorId: "a1"
              }
            ]
          }
        ]
      },
      sourceContextStats: {
        fullBlockCount: 2,
        unitKnowledgeMap: {
          mode: "plan_union_window",
          selectedBlockCount: 2,
          selectedBlockIds: ["b1", "b2"],
          fallbackUsed: false
        },
        unitWindows: [
          {
            unitId: "u1",
            anchorId: "a1",
            anchorBlockIds: ["b1", "b2"],
            selectedBlockCount: 2,
            selectedBlockIds: ["b1", "b2"],
            fallbackUsed: false
          }
        ]
      },
      stageRuntime: {
        schemaVersion: "v2_stage_runtime_1",
        callCount: 2,
        attemptCount: 3,
        failedAttemptCount: 1,
        retryAttemptCount: 1,
        stages: [
          {
            stage: "v2_ecdPlanning",
            callCount: 1,
            successCallCount: 1,
            failedCallCount: 0,
            attemptCount: 2,
            retryAttemptCount: 1,
            transientFailureCount: 1,
            totalDurationMs: 1200,
            errorTypes: { empty_structured_text: 1 },
            lastErrorType: "empty_structured_text",
            lastErrorMessage: "DeepSeek 没有返回结构化文本。"
          }
        ],
        attempts: []
      },
      qualityDiagnostics: [
        {
          unitId: "u1",
          questionId: "q1",
          questionType: "multiple_choice",
          checks: {
            forbiddenPhrase: [],
            distractorValue: "pass",
            matchingRelationValue: "not_applicable",
            explanationUiFit: "pass",
            sourceAnchorPrecision: "pass"
          },
          issues: []
        },
        {
          unitId: "u1",
          questionId: "q2",
          questionType: "matching",
          checks: {
            forbiddenPhrase: [],
            distractorValue: "not_applicable",
            matchingRelationValue: "pass",
            explanationUiFit: "pass",
            sourceAnchorPrecision: "pass"
          },
          issues: []
        }
      ]
    }
  };
}
