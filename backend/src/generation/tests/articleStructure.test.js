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
  assert.deepEqual(map.nodes.map((node) => node.sourceOrder), [0, 1, 2]);
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
