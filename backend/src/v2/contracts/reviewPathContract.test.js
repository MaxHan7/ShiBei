import assert from "node:assert/strict";
import test from "node:test";

import {
  V2_QUESTION_TYPES,
  V2_REVIEW_CARD_TYPES,
  V2_REVIEW_PATH_SCHEMA_VERSION,
  validateReviewPathV2
} from "./reviewPathContract.js";

function validReviewPath(overrides = {}) {
  return mergeReviewPath(
    {
      schemaVersion: V2_REVIEW_PATH_SCHEMA_VERSION,
      id: "chapter-test",
      status: "completed",
      displayStatusText: "已生成",
      title: "测试章节",
      source: {
        type: "article",
        platform: "wechat",
        url: "https://example.com/source",
        title: "原文标题",
        author: "作者",
        rawText: "第一段正文。\n第二段正文。",
        cleanedText: "第一段正文。\n第二段正文。",
        blocks: [
          { id: "p-001", type: "heading", text: "标题" },
          { id: "p-002", type: "paragraph", text: "第一段正文。" },
          { id: "p-003", type: "quote", text: "引用正文。" },
          { id: "p-004", type: "paragraph", text: "第二段正文。" }
        ]
      },
      summaryCard: {
        text: "章节概要。",
        note: "内部校准说明。"
      },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "测试知识点",
          nodeLabel: "测试核心",
          shortSummary: "测试知识点的一句话总结。",
          detailSummary: "测试知识点的完整描述，用于展开态、题目生成和来源校验。",
          why: "这是测试章节的主线。",
          sourceAnchor: {
            id: "anchor-unit-01",
            label: "第 1-3 段",
            blockIds: ["p-002", "p-003", "p-004"],
            quote: "第一段正文。"
          },
          overview: { text: "单元开场文案。" },
          questions: [
            {
              id: "q-001",
              type: "multiple_choice",
              stem: "Hook 更接近下面哪一种机制？",
              options: [
                { id: "A", text: "在关键动作前后自动执行确定性流程" },
                { id: "B", text: "把项目规则写得更完整" },
                { id: "C", text: "把所有质量问题留给 CI" },
                { id: "D", text: "写进更长的需求说明" }
              ],
              correctOptionId: "A",
              correctUnderstanding: "Hook 的重点是机制执行，而不是模型自觉。",
              misconception: "把 Hook 误解成更详细的提示词。",
              explanation: "当某件事每次都必须发生，就应该变成流程约束。",
              sourceAnchorId: "anchor-unit-01"
            },
            {
              id: "q-002",
              type: "matching",
              stem: "把 Hook 的组成特征匹配起来。",
              leftItems: [
                { id: "L1", text: "固定节点" },
                { id: "L2", text: "上下文" },
                { id: "L3", text: "处理器" },
                { id: "L4", text: "结果校验" }
              ],
              rightItems: [
                { id: "R1", text: "决定什么时候触发" },
                { id: "R2", text: "让流程知道发生了什么" },
                { id: "R3", text: "执行稳定动作" },
                { id: "R4", text: "确认输出符合约束" }
              ],
              pairs: [
                { leftId: "L1", rightId: "R1" },
                { leftId: "L2", rightId: "R2" },
                { leftId: "L3", rightId: "R3" },
                { leftId: "L4", rightId: "R4" }
              ],
              correctUnderstanding: "匹配题用来训练边界和职责对应。",
              misconception: "把机制、上下文和结果判断混在一起。",
              explanation: "固定节点决定触发时机；上下文让 handler 读取现场。",
              sourceAnchorId: "anchor-unit-01"
            }
          ],
          summary: {
            title: "单元完成",
            text: "你已经理解 Hook 的基本机制。"
          }
        }
      ],
      chapterSummary: {
        title: "章节完成",
        statsText: "共 1 个核心知识点，2 道题目",
        encouragementText: "你已经完成了这一章的关键理解。"
      },
      generationMeta: {
        currentStage: "completed",
        stages: []
      }
    },
    overrides
  );
}

test("valid payload passes", () => {
  assert.deepEqual(validateReviewPathV2(validReviewPath()), {
    ok: true,
    errors: []
  });
});

test("exports V2 contract constants", () => {
  assert.equal(V2_REVIEW_PATH_SCHEMA_VERSION, "v2_review_path_1");
  assert.deepEqual(V2_QUESTION_TYPES, ["multiple_choice", "matching"]);
  assert.deepEqual(V2_REVIEW_CARD_TYPES, [
    "chapter_overview",
    "unit_overview",
    "question",
    "question_feedback",
    "unit_summary",
    "chapter_summary"
  ]);
});

test("missing summaryCard.text fails", () => {
  const payload = validReviewPath({ summaryCard: { text: "" } });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /summaryCard\.text is required/);
});

test("sourceAnchor.blockIds referencing missing source block fails", () => {
  const payload = validReviewPath({
    units: [
      {
        sourceAnchor: {
          blockIds: ["p-404"]
        }
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /references missing source block p-404/);
});

test("empty source blocks fail", () => {
  const payload = validReviewPath({
    source: {
      blocks: []
    }
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /source\.blocks must not be empty/);
});

test("unit without questions fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: []
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /questions must not be empty/);
});

test("multiple_choice correctOptionId referencing missing option fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {
            correctOptionId: "Z"
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /correctOptionId must reference an existing option id/);
});

test("multiple_choice with fewer than 4 options fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {
            options: [
              { id: "A", text: "在关键动作前后自动执行确定性流程" },
              { id: "B", text: "把项目规则写得更完整" },
              { id: "C", text: "把所有质量问题留给 CI" }
            ]
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /options must contain exactly 4 options/);
});

test("matching with three natural pairs passes", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {},
          {
            leftItems: [
              { id: "L1", text: "Prompt" },
              { id: "L2", text: "Hook" },
              { id: "L3", text: "CI" }
            ],
            rightItems: [
              { id: "R1", text: "提供任务上下文" },
              { id: "R2", text: "稳定执行流程" },
              { id: "R3", text: "验证交付结果" }
            ],
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" },
              { leftId: "L3", rightId: "R3" }
            ]
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.deepEqual(result, { ok: true, errors: [] });
});

test("matching with mismatched pair count fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {},
          {
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" },
              { leftId: "L3", rightId: "R3" }
            ]
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /pairs length must equal leftItems length/);
});

test("matching duplicate rightId fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {},
          {
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R1" },
              { leftId: "L3", rightId: "R3" },
              { leftId: "L4", rightId: "R4" }
            ]
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /rightId must be used only once/);
});

test("matching pair id referencing missing item fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {},
          {
            pairs: [
              { leftId: "L1", rightId: "R1" },
              { leftId: "L2", rightId: "R2" },
              { leftId: "L3", rightId: "R3" },
              { leftId: "L404", rightId: "R404" }
            ]
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /leftId must reference an existing left item id/);
  assert.match(result.errors.join("\n"), /rightId must reference an existing right item id/);
});

test("question.sourceAnchorId not matching this unit anchor fails", () => {
  const payload = validReviewPath({
    units: [
      {
        questions: [
          {
            sourceAnchorId: "anchor-other-unit"
          }
        ]
      }
    ]
  });

  const result = validateReviewPathV2(payload);

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /sourceAnchorId must match this unit sourceAnchor\.id/);
});

function mergeReviewPath(base, overrides) {
  const merged = structuredClone(base);

  if (overrides.source) {
    merged.source = { ...merged.source, ...overrides.source };
  }

  if (overrides.summaryCard) {
    merged.summaryCard = { ...merged.summaryCard, ...overrides.summaryCard };
  }

  if (overrides.units) {
    overrides.units.forEach((unitOverride, unitIndex) => {
      merged.units[unitIndex] = mergeUnit(merged.units[unitIndex], unitOverride);
    });
  }

  return { ...merged, ...withoutNestedOverrides(overrides) };
}

function mergeUnit(unit, overrides) {
  const merged = structuredClone(unit);

  if (overrides.sourceAnchor) {
    merged.sourceAnchor = { ...merged.sourceAnchor, ...overrides.sourceAnchor };
  }

  if (Object.hasOwn(overrides, "questions")) {
    if (overrides.questions.length === 0) {
      merged.questions = [];
    }

    overrides.questions.forEach((questionOverride, questionIndex) => {
      merged.questions[questionIndex] = {
        ...merged.questions[questionIndex],
        ...questionOverride
      };
    });
  }

  return { ...merged, ...withoutNestedOverrides(overrides) };
}

function withoutNestedOverrides(overrides) {
  const shallow = { ...overrides };
  delete shallow.source;
  delete shallow.summaryCard;
  delete shallow.units;
  delete shallow.sourceAnchor;
  delete shallow.questions;
  return shallow;
}
