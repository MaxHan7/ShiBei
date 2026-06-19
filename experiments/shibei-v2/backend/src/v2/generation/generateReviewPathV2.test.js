import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewPathV2 } from "../contracts/reviewPathContract.js";
import {
  generateReviewPathV2,
  V2_GENERATION_STAGES
} from "./generateReviewPathV2.js";

const ARTICLE_INPUT = {
  id: "chapter-fake-001",
  title: "Hook 如何让 AI 工作流稳定",
  url: "https://example.com/hook",
  author: "MetaTown",
  rawText: "Hook 是关键动作前后的流程控制器。它能稳定触发规则、上下文和验证。"
};

test("generates a contract-valid V2 review path from fake prompt outputs", async () => {
  const calls = [];
  const promptCaller = async (stage, payload) => {
    calls.push({ stage, payload });
    return happyPathPromptCaller(stage, payload);
  };

  const reviewPath = await generateReviewPathV2(ARTICLE_INPUT, {
    promptCaller,
    now: "2026-06-19T00:00:00.000Z"
  });

  assert.deepEqual(
    calls.map((call) => call.stage),
    V2_GENERATION_STAGES
  );
  assert.equal(reviewPath.schemaVersion, "v2_review_path_1");
  assert.equal(reviewPath.id, ARTICLE_INPUT.id);
  assert.equal(reviewPath.status, "completed");
  assert.equal(reviewPath.units.length, 1);
  assert.equal(reviewPath.units[0].questions.length, 2);
  assert.equal(reviewPath.generationMeta.currentStage, "completed");
  assert.deepEqual(validateReviewPathV2(reviewPath), {
    ok: true,
    errors: []
  });
});

test("throws a stage-specific error when sourceMap output is invalid", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2(ARTICLE_INPUT, {
        promptCaller: async (stage) => {
          if (stage === "sourceMap") {
            return {
              source: { type: "article", title: ARTICLE_INPUT.title },
              blocks: []
            };
          }
          throw new Error(`Unexpected stage ${stage}`);
        },
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.equal(error.stage, "sourceMap");
      assert.match(error.message, /sourceMap output failed validation/);
      assert.match(error.errors.join("\n"), /blocks must be a non-empty array/);
      return true;
    }
  );
});

test("throws when quality judge discards the generated review path", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2(ARTICLE_INPUT, {
        promptCaller: fakePromptCallerWithJudge({
          verdict: "discard",
          issues: [
            {
              code: "unsupported_answer",
              severity: "error",
              message: "题目答案无法被来源支撑。",
              targetId: "q-001"
            }
          ]
        }),
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.match(error.message, /discarded by quality judge/);
      assert.equal(error.issues[0].code, "unsupported_answer");
      return true;
    }
  );
});

test("throws when the final review path violates the V2 contract", async () => {
  await assert.rejects(
    () =>
      generateReviewPathV2({
        ...ARTICLE_INPUT,
        id: ""
      }, {
        promptCaller: happyPathPromptCaller,
        now: "2026-06-19T00:00:00.000Z"
      }),
    (error) => {
      assert.match(error.message, /failed contract validation/);
      assert.match(error.errors.join("\n"), /payload.id is required/);
      return true;
    }
  );
});

function fakePromptCallerWithJudge(judgeOutput) {
  return async (stage, payload) => {
    if (stage === "qualityJudge") {
      return judgeOutput;
    }

    return happyPathPromptCaller(stage, payload);
  };
}

async function happyPathPromptCaller(stage, payload) {
  if (stage === "sourceMap") {
    return {
      source: {
        type: "article",
        title: ARTICLE_INPUT.title,
        author: ARTICLE_INPUT.author,
        url: ARTICLE_INPUT.url
      },
      blocks: [
        { id: "p-001", type: "paragraph", text: "Hook 是关键动作前后的流程控制器。" },
        { id: "p-002", type: "paragraph", text: "它能稳定触发规则、上下文和验证。" }
      ]
    };
  }

  if (stage === "reviewPathPlan") {
    return {
      title: ARTICLE_INPUT.title,
      summaryCard: {
        text: "这篇文章解释 Hook 如何把 AI 工作流里的关键动作变成稳定流程。"
      },
      units: [
        {
          id: "unit-01",
          order: 1,
          title: "Hook 是什么",
          shortSummary: "Hook 是关键动作前后的流程控制器。",
          detailSummary: "Hook 不是更长提示词，而是在关键动作前后稳定执行规则、上下文和验证的流程约束。",
          why: "这是理解后续自动化边界的基础。",
          sourceAnchor: {
            id: "anchor-unit-01",
            blockIds: ["p-001", "p-002"],
            quote: "Hook 是关键动作前后的流程控制器。"
          }
        }
      ],
      chapterSummary: {
        encouragementText: "你已经能把 Hook 理解成稳定流程，而不是单纯依赖模型自觉。"
      }
    };
  }

  if (stage === "unitCards") {
    return {
      unitId: payload.unit.id,
      overview: {
        text: "Hook 更像一段固定流程，负责在关键动作前后稳定补上规则和验证。"
      },
      questions: [
        {
          id: "q-001",
          type: "multiple_choice",
          stem: "Hook 更接近下面哪一种机制？",
          options: [
            { id: "A", text: "在关键动作前后稳定执行流程约束" },
            { id: "B", text: "把提示词写得更长" },
            { id: "C", text: "把所有问题交给人工复查" },
            { id: "D", text: "把文章内容变成摘要" }
          ],
          correctOptionId: "A",
          explanation: "Hook 的重点是稳定触发流程，而不是让模型自己记住。",
          sourceAnchorId: payload.unit.sourceAnchor.id
        },
        {
          id: "q-002",
          type: "matching",
          stem: "把 Hook 工作流中的角色和作用匹配起来。",
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
          explanation: "Prompt 提供上下文；Hook 稳定触发动作；CI 做最终验证。",
          sourceAnchorId: payload.unit.sourceAnchor.id
        }
      ],
      summary: {
        title: "单元完成",
        text: "你已经理解 Hook 的基本机制。"
      }
    };
  }

  if (stage === "qualityJudge") {
    return { verdict: "pass", issues: [] };
  }

  throw new Error(`Unexpected stage: ${stage}`);
}
