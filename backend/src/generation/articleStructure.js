import { buildSourceBlocks, inferSourceEvidenceRole } from "./evaluateQuestions.js";

export function buildArticleStructureMap({ cleanedText = "", sourceBlocks = null } = {}) {
  const blocks = Array.isArray(sourceBlocks) && sourceBlocks.length
    ? sourceBlocks
    : buildSourceBlocks(cleanedText);
  const paragraphBlocks = blocks.filter((block) => block.text && block.text.length >= 12);
  const candidateNodes = paragraphBlocks
    .filter((block) => isLikelyStructureNode(block))
    .map((block, index) => ({
      id: `asn-${index + 1}`,
      title: titleForBlock(block),
      role: articleNodeRoleForBlock(block),
      claim: block.text.slice(0, 180),
      whyItMatters: whyItMattersForRole(articleNodeRoleForBlock(block)),
      evidenceBlockIds: [block.blockId].filter(Boolean),
      sourceOrder: index
    }));
  const nodes = candidateNodes.length ? candidateNodes : fallbackNodes(paragraphBlocks);

  return normalizeArticleStructureMap({
    topic: inferTopic(cleanedText, nodes),
    centralClaim: nodes[0]?.claim || "",
    nodes,
    learningPath: nodes.map((node) => node.title)
  });
}

export function normalizeArticleStructureMap(input = {}) {
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
      sourceOrder: Number.isFinite(Number(node.sourceOrder)) ? Number(node.sourceOrder) : index
    }))
    .filter((node) => node.title && node.claim);

  return {
    topic: String(input.topic || nodes[0]?.title || "文章主题").trim(),
    centralClaim: String(input.centralClaim || nodes[0]?.claim || "").trim(),
    nodes,
    learningPath: Array.isArray(input.learningPath)
      ? input.learningPath.map(String).filter(Boolean)
      : nodes.map((node) => node.title)
  };
}

export function bindKnowledgePointsToStructure(points = [], structureMap = {}) {
  const nodes = Array.isArray(structureMap.nodes) ? structureMap.nodes : [];
  return points.map((point) => {
    const best = nodes
      .map((node) => ({
        node,
        score: scorePointNodeMatch(point, node)
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
      sourceEvidenceIds: best.node.evidenceBlockIds,
      claimFidelityScore: Math.min(5, Math.max(1, Math.round(best.score))),
      structureBindingReason: "keyword_and_evidence_match"
    };
  });
}

function isLikelyStructureNode(block) {
  const text = String(block.text || "");
  if (text.length < 18) return false;
  if (/写在最后|总结|最后/.test(text)) return true;
  if (/是什么|区别|为什么|怎么|如何|什么时候|场景|边界|例子|案例|方法/.test(text)) return true;
  return ["definition", "mechanism", "contrast", "method", "boundary", "example"].includes(block.evidenceRole);
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
    sourceOrder: index
  }));
}

function scorePointNodeMatch(point = {}, node = {}) {
  const pointText = normalizeForMatch([
    point.title,
    point.keyClaim,
    point.summary,
    point.sourceQuote
  ].filter(Boolean).join(" "));
  const nodeText = normalizeForMatch([
    node.title,
    node.claim
  ].filter(Boolean).join(" "));
  if (!pointText || !nodeText) return 0;
  const keywords = extractMatchKeywords(pointText);
  const hits = keywords.filter((keyword) => nodeText.includes(keyword)).length;
  const sourceHit = point.sourceQuote
    && normalizeForMatch(node.claim).includes(normalizeForMatch(point.sourceQuote).slice(0, 18));
  return Math.min(5, hits + (sourceHit ? 2 : 0));
}

function normalizeForMatch(value = "") {
  return String(value).replace(/\s+/g, "").replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, "");
}

function extractMatchKeywords(value = "") {
  const text = normalizeForMatch(value);
  const keywords = [];
  for (let index = 0; index <= text.length - 2; index += 1) keywords.push(text.slice(index, index + 2));
  for (let index = 0; index <= text.length - 4; index += 1) keywords.push(text.slice(index, index + 4));
  return [...new Set(keywords)].filter((keyword) => keyword.length >= 2).slice(0, 80);
}
