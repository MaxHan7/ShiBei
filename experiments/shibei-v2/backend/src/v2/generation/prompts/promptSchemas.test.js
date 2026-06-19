import assert from "node:assert/strict";
import test from "node:test";

import {
  SOURCE_MAP_OUTPUT_SCHEMA,
  validateSourceMapOutput
} from "./sourceMap.js";
import {
  REVIEW_PATH_PLAN_OUTPUT_SCHEMA,
  validateReviewPathPlanOutput
} from "./reviewPathPlan.js";
import {
  UNIT_CARDS_OUTPUT_SCHEMA,
  validateUnitCardsOutput
} from "./unitCards.js";
import {
  QUALITY_JUDGE_OUTPUT_SCHEMA,
  validateQualityJudgeOutput
} from "./qualityJudge.js";

test("exports stable prompt schema names for the V2 generation pipeline", () => {
  assert.equal(SOURCE_MAP_OUTPUT_SCHEMA.name, "shibei_v2_source_map");
  assert.equal(REVIEW_PATH_PLAN_OUTPUT_SCHEMA.name, "shibei_v2_review_path_plan");
  assert.equal(UNIT_CARDS_OUTPUT_SCHEMA.name, "shibei_v2_unit_cards");
  assert.equal(QUALITY_JUDGE_OUTPUT_SCHEMA.name, "shibei_v2_quality_judge");
});

test("validates source map blocks with stable ids and supported block types", () => {
  const result = validateSourceMapOutput({
    source: {
      type: "article",
      title: "Hook 的工作流",
      author: "MetaTown",
      url: "https://example.com"
    },
    blocks: [
      { id: "p-001", type: "heading", text: "Hook 是什么" },
      { id: "p-002", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" }
    ]
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects source map output with duplicated source block ids", () => {
  const result = validateSourceMapOutput({
    source: { type: "article", title: "重复 id" },
    blocks: [
      { id: "p-001", type: "paragraph", text: "第一段" },
      { id: "p-001", type: "paragraph", text: "第二段" }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /id must be unique/);
});

test("validates review path plans against known source block ids", () => {
  const result = validateReviewPathPlanOutput(
    {
      title: "Hook 的工作流",
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          shortSummary: "Hook 是流程控制器。",
          detailSummary: "Hook 在关键动作前后加入规则、上下文和验证。",
          why: "这是理解后续场景的基础。",
          sourceAnchor: {
            id: "anchor-unit-01",
            blockIds: ["p-002"],
            quote: "Hook 是关键动作前后的流程控制器。"
          }
        }
      ],
      chapterSummary: {
        encouragementText: "你已经掌握了 Hook 作为流程约束的基本判断。"
      }
    },
    { sourceBlockIds: new Set(["p-001", "p-002"]) }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects review path plans that point anchors at missing source blocks", () => {
  const result = validateReviewPathPlanOutput(
    {
      title: "Hook 的工作流",
      summaryCard: { text: "Hook 把关键动作变成稳定流程。" },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          shortSummary: "Hook 是流程控制器。",
          detailSummary: "Hook 在关键动作前后加入规则、上下文和验证。",
          why: "这是理解后续场景的基础。",
          sourceAnchor: { id: "anchor-unit-01", blockIds: ["missing-block"] }
        }
      ],
      chapterSummary: { encouragementText: "继续向前。" }
    },
    { sourceBlockIds: new Set(["p-001"]) }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /references missing source block missing-block/);
});

test("validates unit cards with multiple choice and matching questions", () => {
  const result = validateUnitCardsOutput(
    {
      unitId: "unit-01",
      overview: { text: "Hook 不是提示词，而是稳定触发的流程约束。" },
      questions: [
        {
          id: "q-001",
          type: "multiple_choice",
          stem: "Hook 更接近哪种机制？",
          options: [
            { id: "A", text: "关键动作前后的固定流程" },
            { id: "B", text: "更长的提示词" },
            { id: "C", text: "一段文章总结" },
            { id: "D", text: "单纯的 UI 操作" }
          ],
          correctOptionId: "A",
          explanation: "Hook 的重点是稳定执行，而不是模型自觉记住。",
          sourceAnchorId: "anchor-unit-01"
        },
        {
          id: "q-002",
          type: "matching",
          stem: "把 Hook 相关角色和作用匹配起来。",
          leftItems: [
            { id: "L1", text: "Prompt" },
            { id: "L2", text: "Hook" },
            { id: "L3", text: "CI" },
            { id: "L4", text: "规则文档" }
          ],
          rightItems: [
            { id: "R1", text: "提供上下文" },
            { id: "R2", text: "稳定触发动作" },
            { id: "R3", text: "最终验证" },
            { id: "R4", text: "沉淀约束" }
          ],
          pairs: [
            { leftId: "L1", rightId: "R1" },
            { leftId: "L2", rightId: "R2" },
            { leftId: "L3", rightId: "R3" },
            { leftId: "L4", rightId: "R4" }
          ],
          explanation: "连线题训练职责和边界关系，不是机械背名词。",
          sourceAnchorId: "anchor-unit-01"
        }
      ],
      summary: {
        title: "单元完成",
        text: "你已经理解 Hook 的基本机制。"
      }
    },
    { unitId: "unit-01", sourceAnchorId: "anchor-unit-01" }
  );

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects unit cards with invalid option counts or matching pair counts", () => {
  const result = validateUnitCardsOutput(
    {
      unitId: "unit-01",
      overview: { text: "开场文案" },
      questions: [
        {
          id: "q-001",
          type: "multiple_choice",
          stem: "少了一个选项",
          options: [
            { id: "A", text: "A" },
            { id: "B", text: "B" },
            { id: "C", text: "C" }
          ],
          correctOptionId: "A",
          explanation: "解释",
          sourceAnchorId: "anchor-unit-01"
        },
        {
          id: "q-002",
          type: "matching",
          stem: "少了一组连线",
          leftItems: [
            { id: "L1", text: "L1" },
            { id: "L2", text: "L2" },
            { id: "L3", text: "L3" },
            { id: "L4", text: "L4" }
          ],
          rightItems: [
            { id: "R1", text: "R1" },
            { id: "R2", text: "R2" },
            { id: "R3", text: "R3" },
            { id: "R4", text: "R4" }
          ],
          pairs: [
            { leftId: "L1", rightId: "R1" },
            { leftId: "L2", rightId: "R2" },
            { leftId: "L3", rightId: "R3" }
          ],
          explanation: "解释",
          sourceAnchorId: "anchor-unit-01"
        }
      ],
      summary: { title: "单元完成", text: "完成。" }
    },
    { unitId: "unit-01", sourceAnchorId: "anchor-unit-01" }
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /options must contain exactly 4 options/);
  assert.match(result.errors.join("\n"), /pairs must contain exactly 4 pairs/);
});

test("validates quality judge verdicts and structured issues", () => {
  const result = validateQualityJudgeOutput({
    verdict: "revise",
    issues: [
      {
        code: "weak_source_anchor",
        severity: "error",
        message: "题目来源片段不能支撑正确答案。",
        targetId: "q-001"
      }
    ]
  });

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("rejects malformed quality judge output", () => {
  const result = validateQualityJudgeOutput({
    verdict: "maybe",
    issues: [{ code: "", severity: "fatal", message: "" }]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /verdict must be pass, revise, or discard/);
  assert.match(result.errors.join("\n"), /severity must be info, warning, or error/);
});
