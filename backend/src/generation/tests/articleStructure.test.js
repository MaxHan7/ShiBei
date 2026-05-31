import test from "node:test";
import assert from "node:assert/strict";
import {
  bindKnowledgePointsToStructure,
  buildArticleStructureMap,
  normalizeArticleStructureMap
} from "../articleStructure.js";

test("buildArticleStructureMap creates ordered structure nodes from paragraphs", () => {
  const cleanedText = [
    "Hook 是什么",
    "Hook 是在 AI agent 生命周期特定节点自动触发的控制器。",
    "Hook 和 prompt 的区别",
    "prompt 是请求模型记住，hook 是让系统执行。",
    "什么时候需要 Hook",
    "当流程需要自动检查、格式化或阻断危险操作时，就应该考虑 Hook。"
  ].join("\n\n");

  const map = buildArticleStructureMap({ cleanedText });

  assert.equal(map.topic.length > 0, true);
  assert.equal(map.nodes.length >= 3, true);
  assert.deepEqual(
    map.nodes.map((node) => node.sourceOrder),
    [...map.nodes].map((node) => node.sourceOrder).sort((a, b) => a - b)
  );
  assert.equal(map.nodes.some((node) => node.role === "definition"), true);
  assert.equal(map.nodes.some((node) => node.role === "contrast"), true);
  assert.equal(map.nodes.every((node) => node.evidenceBlockIds.length > 0), true);
});

test("normalizeArticleStructureMap keeps stable ids and safe defaults", () => {
  const map = normalizeArticleStructureMap({
    topic: "Hook",
    centralClaim: "Hook 是控制器",
    nodes: [
      {
        title: "Hook 定义",
        role: "definition",
        claim: "Hook 自动触发动作",
        evidenceBlockIds: ["p1-s0-0"]
      }
    ],
    learningPath: ["Hook 定义"]
  });

  assert.equal(map.nodes[0].id, "asn-1");
  assert.equal(map.nodes[0].role, "definition");
  assert.equal(map.nodes[0].sourceOrder, 0);
});

test("bindKnowledgePointsToStructure maps point to best structure node", () => {
  const structureMap = normalizeArticleStructureMap({
    nodes: [
      {
        title: "Hook 与 prompt 的区别",
        role: "contrast",
        claim: "prompt 是请求模型记住，hook 是让系统执行。",
        evidenceBlockIds: ["p2-s0-0"]
      }
    ]
  });
  const points = [
    {
      id: "kp-1",
      title: "Hook 与 prompt 的本质区别",
      keyClaim: "prompt 靠模型自觉，hook 靠机制执行。",
      sourceQuote: "prompt 是请求模型记住，hook 是让系统执行。",
      importanceScore: 5,
      testabilityScore: 5
    }
  ];

  const bound = bindKnowledgePointsToStructure(points, structureMap);

  assert.equal(bound[0].structureNodeId, "asn-1");
  assert.equal(bound[0].roleInArticle, "contrast");
  assert.deepEqual(bound[0].sourceEvidenceIds, ["p2-s0-0"]);
  assert.equal(bound[0].claimFidelityScore >= 4, true);
});

test("buildArticleStructureMap skips intro anecdotes as structure anchors", () => {
  const cleanedText = [
    "我最近和一位 AI 产品经理聊她们的工作，她说现在都用 vibe coding 直接做 demo。",
    "出现这样的误会，这不是她不懂技术，而是 demo 阶段追求的是速度。",
    "hook 是什么",
    "hook 是在 AI agent 生命周期特定节点自动触发的控制器。",
    "什么时候该用 hook",
    "真正该上 hook 的时刻，通常有四个信号：危险动作、重复提醒、交付他人、session 变长。"
  ].join("\n\n");

  const map = buildArticleStructureMap({ cleanedText });

  assert.equal(map.nodes.some((node) => /我最近和一位/.test(node.claim)), false);
  assert.equal(map.nodes.some((node) => /hook 是在 AI agent 生命周期/.test(node.claim)), true);
  assert.equal(map.nodes.some((node) => /四个信号/.test(node.claim)), true);
});

test("bindKnowledgePointsToStructure prefers source evidence over generic early keywords", () => {
  const structureMap = normalizeArticleStructureMap({
    nodes: [
      {
        id: "asn-1",
        title: "开头场景",
        role: "background",
        claim: "我最近和一位 AI 产品经理聊她们的工作，她说现在都用 vibe coding 直接做 demo。",
        evidenceBlockIds: ["p0-s0-0"],
        sourceOrder: 0
      },
      {
        id: "asn-2",
        title: "四个信号",
        role: "method",
        claim: "真正该上 hook 的时刻，通常有四个信号。第一个信号，是 AI 开始碰危险动作。第二个信号，是同样的提醒你已经说了三遍。",
        evidenceBlockIds: ["p20-s0-0"],
        sourceOrder: 20
      }
    ]
  });
  const points = [
    {
      id: "kp-1",
      title: "使用 hook 的四个信号：危险动作、重复提醒、交付他人、session 变长",
      keyClaim: "当 AI 开始碰危险动作、同样提醒反复出现、产物要交给别人或 session 变长时，应考虑 hook。",
      sourceQuote: "真正该上 hook 的时刻，通常有四个信号。第一个信号，是 AI 开始碰危险动作。第二个信号，是同样的提醒你已经说了三遍。",
      importanceScore: 5,
      testabilityScore: 5
    }
  ];

  const bound = bindKnowledgePointsToStructure(points, structureMap);

  assert.equal(bound[0].structureNodeId, "asn-2");
  assert.equal(bound[0].roleInArticle, "method");
});
