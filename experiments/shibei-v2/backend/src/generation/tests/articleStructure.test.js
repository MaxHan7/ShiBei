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

test("buildArticleStructureMap groups mainline nodes separately from evidence nodes", () => {
  const cleanedText = [
    "hook是什么",
    "在 Claude Code 的语境里，hook 可以先理解成一句话：在 AI agent 的某个固定节点，自动执行你定义好的命令。",
    "官方文档的说法更工程化：hooks 会在 Claude Code 生命周期中的特定点触发。",
    "这和“把规则写进 prompt”最大的区别在于：prompt 是请求模型记住；hook 是让系统执行。",
    "一个判断标准：如果某件事“每次都必须发生”，就不要只写在 prompt 里。",
    "真正该上 hook 的时刻，通常有四个信号。",
    "第一个信号，是 AI 开始碰危险动作。",
    "第二个信号，是同样的提醒你已经说了三遍。",
    "第一类，是改完之后自动整理。PostToolUse 可以匹配 Edit 或 Write。",
    "第二类，是执行前拦截风险。PreToolUse 可以检查危险命令。",
    "prompt 管的是“这次希望 AI 怎么思考”。",
    "CLAUDE.md 或项目规则文档管的是“长期背景”。",
    "hook 管的是“事件发生时必须执行的动作”。",
    "CI 是最后的裁判。"
  ].join("\n\n");

  const map = buildArticleStructureMap({ cleanedText });
  const signalNode = map.nodes.find((node) => node.title === "需要引入 Hook 的判断信号");
  const responsibilityNode = map.nodes.find((node) => node.title === "Prompt、CLAUDE.md、Hook 与 CI 的分工");

  assert.equal(map.evidenceNodes.length > map.nodes.length, true);
  assert.equal(Boolean(signalNode), true);
  assert.equal(signalNode.evidenceNodeIds.length >= 2, true);
  assert.equal(Boolean(responsibilityNode), true);
  assert.equal(responsibilityNode.evidenceBlockIds.length >= 3, true);
});

test("bindKnowledgePointsToStructure uses source evidence before generic prompt keywords", () => {
  const cleanedText = [
    "hook是什么",
    "在 Claude Code 的语境里，hook 可以先理解成一句话：在 AI agent 的某个固定节点，自动执行你定义好的命令。",
    "这和“把规则写进 prompt”最大的区别在于：prompt 是请求模型记住；hook 是让系统执行。",
    "一个判断标准：如果某件事“每次都必须发生”，就不要只写在 prompt 里。",
    "第一类，是改完之后自动整理。PostToolUse 可以匹配 Edit 或 Write。",
    "第二类，是执行前拦截风险。PreToolUse 可以检查危险命令。",
    "第三类，是会话开始时注入上下文。SessionStart 可以把项目规则带进来。",
    "hook、CI、规则文档、prompt，到底谁管什么。",
    "prompt 管的是“这次希望 AI 怎么思考”。",
    "CLAUDE.md 或项目规则文档管的是“长期背景”。",
    "hook 管的是“事件发生时必须执行的动作”。",
    "CI 管的是“进入主干前的最终裁判”。",
    "最后的判断：vibe coding 负责起飞，hook 负责别偏航。",
    "但 demo 越容易生成，工程边界越不能消失。",
    "hook 的意义不在于炫技，而在于把“每次都该做”的事从聊天里拿出来，放到流程里。"
  ].join("\n\n");
  const structureMap = buildArticleStructureMap({ cleanedText });
  const points = [
    {
      id: "kp-practical",
      title: "四类最实用的 hook 场景",
      keyClaim: "Hook 可以用于自动整理、风险拦截、上下文注入和结束验收。",
      sourceQuote: "第一类，是改完之后自动整理。PostToolUse 可以匹配 Edit 或 Write。\n\n第二类，是执行前拦截风险。PreToolUse 可以检查危险命令。\n\n第三类，是会话开始时注入上下文。SessionStart 可以把项目规则带进来。",
      importanceScore: 4,
      testabilityScore: 5
    },
    {
      id: "kp-split",
      title: "prompt、CLAUDE.md、hook、CI 的分工",
      keyClaim: "prompt 管本次意图，CLAUDE.md 管长期背景，hook 管事件动作，CI 管最终裁判。",
      sourceQuote: "prompt 管的是“这次希望 AI 怎么思考”。CLAUDE.md 或项目规则文档管的是“长期背景”。hook 管的是“事件发生时必须执行的动作”。CI 管的是“进入主干前的最终裁判”。",
      importanceScore: 5,
      testabilityScore: 5
    },
    {
      id: "kp-vibe",
      title: "Vibe coding 负责起飞，Hook 负责别偏航",
      keyClaim: "自然语言能让 demo 快速起飞，但工程边界仍要沉淀进流程。",
      sourceQuote: "最后的判断：vibe coding 负责起飞，hook 负责别偏航。但 demo 越容易生成，工程边界越不能消失。hook 的意义不在于炫技，而在于把“每次都该做”的事从聊天里拿出来，放到流程里。",
      importanceScore: 5,
      testabilityScore: 5
    }
  ];

  const bound = bindKnowledgePointsToStructure(points, structureMap);

  assert.equal(bound[0].structureNodeId, structureMap.nodes.find((node) => node.title === "Claude Code 中最实用的 Hook 场景")?.id);
  assert.equal(bound[1].structureNodeId, structureMap.nodes.find((node) => node.title === "Prompt、CLAUDE.md、Hook 与 CI 的分工")?.id);
  assert.equal(bound[2].structureNodeId, structureMap.nodes.find((node) => node.title === "产品经理需要补上的工程直觉")?.id);
  assert.equal(bound.every((point) => point.structureBindingReason === "source_evidence_match"), true);
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
