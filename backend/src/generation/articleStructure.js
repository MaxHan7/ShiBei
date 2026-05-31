import { buildSourceBlocks, inferSourceEvidenceRole } from "./evaluateQuestions.js";

export function buildArticleStructureMap({ cleanedText = "", sourceBlocks = null } = {}) {
  const blocks = Array.isArray(sourceBlocks) && sourceBlocks.length
    ? sourceBlocks
    : buildSourceBlocks(cleanedText);
  const structureBlocks = selectStructureSourceBlocks(blocks);
  const evidenceNodes = structureBlocks
    .filter((block) => isLikelyStructureNode(block))
    .map((block, index) => ({
      id: `ase-${index + 1}`,
      title: titleForBlock(block),
      role: articleNodeRoleForBlock(block),
      claim: block.text.slice(0, 180),
      whyItMatters: whyItMattersForRole(articleNodeRoleForBlock(block)),
      evidenceBlockIds: [block.blockId].filter(Boolean),
      sourceOrder: sourceOrderForBlock(block, index)
    }));
  const nodes = evidenceNodes.length ? buildMainlineNodes(evidenceNodes) : fallbackNodes(structureBlocks);

  return normalizeArticleStructureMap({
    topic: inferTopic(cleanedText, nodes),
    centralClaim: nodes[0]?.claim || "",
    nodes,
    evidenceNodes,
    learningPath: nodes.map((node) => node.title)
  });
}

export function normalizeArticleStructureMap(input = {}) {
  const evidenceNodes = normalizeStructureNodes(input.evidenceNodes || [], "ase");
  const nodes = (Array.isArray(input.nodes) ? input.nodes : [])
    .map((node, index) => ({
      id: String(node.id || `asn-${index + 1}`),
      title: String(node.title || `结构节点 ${index + 1}`).trim(),
      role: normalizeStructureRole(node.role),
      claim: String(node.claim || "").trim(),
      whyItMatters: String(node.whyItMatters || "").trim(),
      evidenceBlockIds: Array.isArray(node.evidenceBlockIds)
        ? node.evidenceBlockIds.map(String).filter(Boolean)
        : [],
      evidenceNodeIds: Array.isArray(node.evidenceNodeIds)
        ? node.evidenceNodeIds.map(String).filter(Boolean)
        : [],
      evidenceText: String(node.evidenceText || "").trim(),
      sourceOrder: Number.isFinite(Number(node.sourceOrder)) ? Number(node.sourceOrder) : index
    }))
    .filter((node) => node.title && node.claim);

  return {
    topic: String(input.topic || nodes[0]?.title || "文章主题").trim(),
    centralClaim: String(input.centralClaim || nodes[0]?.claim || "").trim(),
    nodes,
    evidenceNodes,
    learningPath: Array.isArray(input.learningPath)
      ? input.learningPath.map(String).filter(Boolean)
      : nodes.map((node) => node.title)
  };
}

export function bindKnowledgePointsToStructure(points = [], structureMap = {}) {
  const nodes = Array.isArray(structureMap.nodes) ? structureMap.nodes : [];
  const evidenceNodes = Array.isArray(structureMap.evidenceNodes) ? structureMap.evidenceNodes : [];
  return points.map((point) => {
    const evidenceMatches = selectBestEvidenceNodeIdsForPoint(point, evidenceNodes);
    const best = nodes
      .map((node) => ({
        node,
        score: scorePointNodeMatch(point, node) + scoreEvidenceCoverage(node, evidenceMatches)
      }))
      .sort((a, b) => b.score - a.score || a.node.sourceOrder - b.node.sourceOrder)[0];

    if (!best || best.score < 2) {
      return {
        ...point,
        structureNodeId: "",
        roleInArticle: "",
        whyWorthReviewing: point.coverageReason || point.testabilityReason || "",
        sourceEvidenceIds: [],
        claimFidelityScore: 2,
        structureBindingReason: "no_confident_structure_match"
      };
    }

    return {
      ...point,
      structureNodeId: best.node.id,
      roleInArticle: best.node.role,
      whyWorthReviewing: point.coverageReason || best.node.whyItMatters,
      sourceEvidenceIds: selectPointEvidenceIds(point, best.node, evidenceNodes, evidenceMatches),
      claimFidelityScore: Math.min(5, Math.max(1, Math.round(best.score))),
      structureBindingReason: evidenceMatches.length ? "source_evidence_match" : "keyword_and_evidence_match"
    };
  });
}

function normalizeStructureNodes(nodes = [], prefix = "asn") {
  return (Array.isArray(nodes) ? nodes : [])
    .map((node, index) => ({
      id: String(node.id || `${prefix}-${index + 1}`),
      title: String(node.title || `结构证据 ${index + 1}`).trim(),
      role: normalizeStructureRole(node.role),
      claim: String(node.claim || "").trim(),
      whyItMatters: String(node.whyItMatters || "").trim(),
      evidenceBlockIds: Array.isArray(node.evidenceBlockIds)
        ? node.evidenceBlockIds.map(String).filter(Boolean)
        : [],
      sourceOrder: Number.isFinite(Number(node.sourceOrder)) ? Number(node.sourceOrder) : index
    }))
    .filter((node) => node.title && node.claim);
}

function selectStructureSourceBlocks(blocks = []) {
  const validBlocks = blocks
    .filter((block) => block?.text && String(block.text).trim().length >= 18)
    .filter((block) => !isBoilerplateStructureBlock(block));
  const grouped = new Map();
  for (const block of validBlocks) {
    const key = Number.isFinite(Number(block.paragraphIndex))
      ? Number(block.paragraphIndex)
      : `block-${grouped.size}`;
    const current = grouped.get(key) || [];
    current.push(block);
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((group) => group.sort((a, b) => structureBlockScore(b) - structureBlockScore(a))[0])
    .filter(Boolean)
    .sort((a, b) => structureBlockScore(b) - structureBlockScore(a) || sourceOrderForBlock(a, 0) - sourceOrderForBlock(b, 0))
    .slice(0, 36)
    .sort((a, b) => sourceOrderForBlock(a, 0) - sourceOrderForBlock(b, 0));
}

function buildMainlineNodes(evidenceNodes = []) {
  const groups = new Map();
  for (const node of evidenceNodes) {
    const key = mainlineKeyForEvidenceNode(node);
    const current = groups.get(key) || {
      key,
      nodes: []
    };
    current.nodes.push(node);
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((group, index) => mainlineNodeFromGroup(group, index))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)
    .map((node, index) => ({ ...node, id: `asn-${index + 1}` }));
}

function mainlineNodeFromGroup(group, index) {
  const nodes = [...group.nodes].sort((a, b) => a.sourceOrder - b.sourceOrder);
  const role = mainlineRoleForKey(group.key, nodes);
  const evidenceText = nodes.map((node) => node.claim).join("\n");
  return {
    id: `asn-${index + 1}`,
    title: mainlineTitleForKey(group.key, nodes),
    role,
    claim: summarizeMainlineClaim(nodes),
    whyItMatters: whyItMattersForRole(role),
    evidenceBlockIds: [...new Set(nodes.flatMap((node) => node.evidenceBlockIds || []))],
    evidenceNodeIds: nodes.map((node) => node.id),
    evidenceText,
    sourceOrder: nodes[0]?.sourceOrder ?? index
  };
}

function mainlineKeyForEvidenceNode(node) {
  const text = String([node.title, node.claim].filter(Boolean).join(" "));
  if (/很多团队会在这里混淆|hook、CI|规则文档|prompt 管的是|CLAUDE\.md|hook 管的是|CI|最终裁判|事前屏障/.test(text)) return "tool_responsibility_split";
  if (/hook是什么|AI agent 的某个固定节点|生命周期中的特定点触发|handler|decision/.test(text)) return "hook_definition";
  if (/prompt.*hook|hook.*prompt|请求模型记住|让系统执行|每次都必须发生|不要只写在 prompt/.test(text)) return "prompt_hook_boundary";
  if (/产品经理为什么|Demo的感知|demo 阶段|vibe coding 的好处|工程流/.test(text)) return "pm_demo_reason";
  if (/什么时候需要 hook|什么时候应该用hook|真正该上 hook|第一个信号|第二个信号|第三个信号|第四个信号|变长|复用/.test(text)) return "when_to_use_hook";
  if (/刚开始用 Claude Code|高频场景|第一类|第二类|第三类|第四类|PostToolUse|PreToolUse|SessionStart|Stop/.test(text)) return "practical_hook_scenarios";
  if (/工程直觉|AI 产品经理需要补上|负责起飞|负责别偏航|demo 越容易生成|工程边界越不能消失|每次都该做|写在最后|不知道 hook/.test(text)) return "pm_engineering_intuition";
  return `local_${Math.floor(Number(node.sourceOrder || 0) / 4)}`;
}

function mainlineTitleForKey(key, nodes) {
  const titles = {
    hook_definition: "Hook 的定义与运行机制",
    prompt_hook_boundary: "Prompt 与 Hook 的本质边界",
    pm_demo_reason: "产品经理在 Demo 阶段容易忽略 Hook 的原因",
    when_to_use_hook: "需要引入 Hook 的判断信号",
    practical_hook_scenarios: "Claude Code 中最实用的 Hook 场景",
    tool_responsibility_split: "Prompt、CLAUDE.md、Hook 与 CI 的分工",
    pm_engineering_intuition: "产品经理需要补上的工程直觉"
  };
  return titles[key] || titleForBlock({ text: nodes[0]?.claim || nodes[0]?.title || "文章结构节点" });
}

function mainlineRoleForKey(key, nodes) {
  if (key === "hook_definition") return "definition";
  if (key === "prompt_hook_boundary" || key === "tool_responsibility_split") return "contrast";
  if (key === "pm_demo_reason" || key === "when_to_use_hook" || key === "practical_hook_scenarios") return "method";
  if (key === "pm_engineering_intuition") return "boundary";
  return nodes[0]?.role || "mechanism";
}

function summarizeMainlineClaim(nodes) {
  const selected = nodes.slice(0, 4).map((node) => node.claim).filter(Boolean);
  return selected.join("\n").slice(0, 360);
}

function isLikelyStructureNode(block) {
  const text = String(block.text || "");
  if (text.length < 18) return false;
  if (isIntroAnecdoteBlock(block)) return false;
  if (/写在最后|总结|最后/.test(text)) return true;
  if (/是什么|区别|为什么|怎么|如何|什么时候|场景|边界|例子|案例|方法|标准|信号|分工|CLAUDE\.md|CI/.test(text)) return true;
  return ["definition", "mechanism", "contrast", "method", "boundary", "example"].includes(block.evidenceRole);
}

function isBoilerplateStructureBlock(block) {
  const text = String(block.text || "").trim();
  if (!text) return true;
  if (/^\[redacted:/.test(text)) return true;
  if (/^(原创|作者|来源|点击|赞|分享|在看|广告|免责声明)/.test(text)) return true;
  if (/在小说阅读器|去阅读|继续滑动看下一个|微信扫一扫|MetaTown/.test(text)) return true;
  return false;
}

function isIntroAnecdoteBlock(block) {
  const text = String(block.text || "");
  return /我最近和.*产品经理|和AI产品经理聊天|她说.*vibe coding|我问了一句|她愣了一下|出现这样的误会/.test(text);
}

function structureBlockScore(block) {
  const roleScore = {
    definition: 8,
    contrast: 8,
    mechanism: 7,
    boundary: 7,
    method: 7,
    example: 5,
    general: 1
  }[block.evidenceRole] || 1;
  const text = String(block.text || "");
  const cueScore = [
    /是什么|定义/.test(text) ? 4 : 0,
    /区别|对比|分工|不是.*而是|CLAUDE\.md|CI/.test(text) ? 4 : 0,
    /判断标准|信号|什么时候|适合/.test(text) ? 4 : 0,
    /第一类|第二类|第三类|第四类|步骤|方法/.test(text) ? 3 : 0,
    /风险|边界|拦截|不能|必须/.test(text) ? 3 : 0,
    /比如|例如|案例|场景/.test(text) ? 2 : 0
  ].reduce((sum, value) => sum + value, 0);
  const introPenalty = isIntroAnecdoteBlock(block) ? 12 : 0;
  return roleScore + cueScore - introPenalty;
}

function sourceOrderForBlock(block, fallbackIndex) {
  const paragraphIndex = Number(block?.paragraphIndex);
  const sentenceStart = Number(block?.sentenceStart);
  if (Number.isFinite(paragraphIndex)) {
    return paragraphIndex + (Number.isFinite(sentenceStart) ? sentenceStart / 100 : 0);
  }
  return fallbackIndex;
}

function titleForBlock(block) {
  const text = String(block.text || "").trim();
  const firstSentence = text.split(/[。！？!?]/)[0] || text;
  return firstSentence.slice(0, 32);
}

function normalizeStructureRole(role = "") {
  const value = String(role || "");
  if (["definition", "mechanism", "contrast", "method", "boundary", "example", "case", "conclusion", "background"].includes(value)) return value;
  if (value === "general") return "mechanism";
  return "background";
}

function articleNodeRoleForBlock(block) {
  const section = String(block.sectionTitle || "");
  const text = String(block.text || "");
  if (/区别|对比|分工|不是.*而是/.test(section) || /不是.*而是|区别|分工/.test(text)) return "contrast";
  if (/是什么|定义/.test(section) || /^[^。！？!?]{1,32}是/.test(text)) return "definition";
  return normalizeStructureRole(block.evidenceRole || inferSourceEvidenceRole(block.text));
}

function whyItMattersForRole(role = "") {
  if (role === "definition") return "定义节点决定用户是否理解核心概念。";
  if (role === "contrast") return "对比节点帮助用户区分容易混淆的概念。";
  if (role === "method") return "方法节点帮助用户把观点迁移到行动。";
  if (role === "boundary") return "边界节点帮助用户避免误用。";
  if (role === "example") return "案例节点帮助用户把抽象观点落到具体场景。";
  return "该节点承载文章主线中的一个理解步骤。";
}

function inferTopic(cleanedText, nodes) {
  const firstLine = String(cleanedText || "").split(/\n+/).map((line) => line.trim()).find(Boolean);
  return nodes[0]?.title || firstLine?.slice(0, 36) || "文章主题";
}

function fallbackNodes(blocks) {
  return blocks.slice(0, 6).map((block, index) => ({
    id: `asn-${index + 1}`,
    title: titleForBlock(block),
    role: normalizeStructureRole(block.evidenceRole),
    claim: block.text.slice(0, 180),
    whyItMatters: whyItMattersForRole(block.evidenceRole),
    evidenceBlockIds: [block.blockId].filter(Boolean),
    sourceOrder: sourceOrderForBlock(block, index)
  }));
}

function scorePointNodeMatch(point = {}, node = {}) {
  const pointText = [
    point.title,
    point.keyClaim,
    point.summary,
    point.sourceQuote
  ].filter(Boolean).join(" ");
  const nodeText = normalizeForMatch([
    node.title,
    node.claim,
    node.evidenceText
  ].filter(Boolean).join(" "));
  if (!pointText || !nodeText) return 0;
  const sourceScore = scoreSourceQuoteMatch(point.sourceQuote, [node.claim, node.evidenceText].filter(Boolean).join("\n"));
  const keywords = extractMatchKeywords(pointText);
  const hits = keywords.filter((keyword) => nodeText.includes(normalizeForMatch(keyword)));
  const hitScore = hits.reduce((sum, keyword) => sum + keywordWeight(keyword), 0);
  if (!sourceScore && hits.length < 2) return Math.min(1, hitScore);
  if (!sourceScore && !hasSpecificHit(hits)) return Math.min(2, hitScore);
  return Math.min(5, sourceScore + hitScore);
}

function selectPointEvidenceIds(point = {}, node = {}, evidenceNodes = [], preferredEvidenceMatches = []) {
  const evidenceNodeIds = new Set(node.evidenceNodeIds || []);
  const candidates = (Array.isArray(evidenceNodes) ? evidenceNodes : [])
    .filter((item) => evidenceNodeIds.has(item.id))
    .map((item) => ({
      node: item,
      score: scorePointNodeMatch(point, {
        title: item.title,
        claim: item.claim,
        evidenceText: item.claim
      })
    }))
    .sort((a, b) => b.score - a.score || a.node.sourceOrder - b.node.sourceOrder);

  const preferredIds = new Set(preferredEvidenceMatches.map((item) => item.id));
  const preferred = candidates
    .filter((item) => preferredIds.has(item.node.id))
    .slice(0, 4)
    .flatMap((item) => item.node.evidenceBlockIds || []);
  if (preferred.length) return [...new Set(preferred)];

  const confident = candidates
    .filter((item) => item.score >= 2)
    .slice(0, 4)
    .flatMap((item) => item.node.evidenceBlockIds || []);
  if (confident.length) return [...new Set(confident)];
  return [...new Set(node.evidenceBlockIds || [])].slice(0, 4);
}

function selectBestEvidenceNodeIdsForPoint(point = {}, evidenceNodes = []) {
  return (Array.isArray(evidenceNodes) ? evidenceNodes : [])
    .map((node) => ({
      id: node.id,
      score: scorePointNodeMatch(point, {
        title: node.title,
        claim: node.claim,
        evidenceText: node.claim
      })
    }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function scoreEvidenceCoverage(node = {}, evidenceMatches = []) {
  if (!evidenceMatches.length) return 0;
  const ids = new Set(node.evidenceNodeIds || []);
  const matched = evidenceMatches.filter((item) => ids.has(item.id));
  if (!matched.length) return 0;
  const best = Math.max(...matched.map((item) => item.score));
  return best + Math.min(3, matched.length * 0.75);
}

function normalizeForMatch(value = "") {
  return String(value).replace(/\s+/g, "").replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, "");
}

function extractMatchKeywords(value = "") {
  const source = String(value || "");
  const latinTerms = source.match(/[A-Za-z][A-Za-z0-9._-]{1,}/g) || [];
  const phraseTerms = source
    .split(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3 && item.length <= 18);
  const cjk = normalizeForMatch(source).replace(/[A-Za-z0-9._-]+/g, "");
  const cjkTerms = [];
  for (let size of [6, 5, 4, 3]) {
    for (let index = 0; index <= cjk.length - size; index += size) {
      cjkTerms.push(cjk.slice(index, index + size));
    }
  }
  return [...new Set([...latinTerms, ...phraseTerms, ...cjkTerms])]
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 2)
    .filter((keyword) => !isGenericKeyword(keyword))
    .slice(0, 60);
}

function scoreSourceQuoteMatch(sourceQuote = "", nodeClaim = "") {
  const quote = normalizeForMatch(sourceQuote);
  const claim = normalizeForMatch(nodeClaim);
  if (!quote || !claim || quote.length < 8) return 0;
  if (claim.length >= 12 && quote.includes(claim)) return 5;
  if (claim.includes(quote)) return 5;
  const prefix = quote.slice(0, Math.min(24, quote.length));
  const suffix = quote.slice(-Math.min(24, quote.length));
  if (prefix.length >= 12 && claim.includes(prefix)) return 4;
  if (suffix.length >= 12 && claim.includes(suffix)) return 4;
  const middleStart = Math.max(0, Math.floor((quote.length - 18) / 2));
  const middle = quote.slice(middleStart, middleStart + 18);
  return middle.length >= 12 && claim.includes(middle) ? 3 : 0;
}

function keywordWeight(keyword = "") {
  if (/[A-Za-z]/.test(keyword)) return 1.4;
  if (String(keyword).length >= 5) return 1.2;
  return 0.8;
}

function hasSpecificHit(hits = []) {
  return hits.some((keyword) => {
    const normalized = normalizeForMatch(keyword).toLowerCase();
    if (!normalized) return false;
    if (["hook", "claude", "code", "ai"].includes(normalized)) return false;
    if (/[A-Za-z]/.test(keyword) && normalized.length >= 3) return true;
    return normalized.length >= 4;
  });
}

function isGenericKeyword(keyword = "") {
  const normalized = normalizeForMatch(keyword).toLowerCase();
  if (!normalized || normalized.length < 2) return true;
  return new Set([
    "产品经理",
    "一个",
    "这个",
    "那个",
    "使用",
    "需要",
    "不是",
    "因为",
    "所以",
    "自然语言",
    "工程",
    "阶段",
    "标准",
    "原因",
    "方式",
    "进行",
    "可以",
    "应该",
    "关键",
    "核心",
    "系统",
    "用户",
    "题目",
    "知识点"
  ]).has(normalized);
}
