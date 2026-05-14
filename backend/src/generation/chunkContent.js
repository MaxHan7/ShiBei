const SENTENCE_SPLIT = /(?<=[。！？!?；;])\s*/;

export function chunkContent(cleanedText) {
  const paragraphs = cleanedText
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= 420) {
      chunks.push(toChunk(paragraph));
      continue;
    }

    const sentences = paragraph.split(SENTENCE_SPLIT).map((item) => item.trim()).filter(Boolean);
    let buffer = "";
    for (const sentence of sentences) {
      if ((buffer + sentence).length > 360 && buffer) {
        chunks.push(toChunk(buffer));
        buffer = sentence;
      } else {
        buffer += sentence;
      }
    }
    if (buffer) chunks.push(toChunk(buffer));
  }

  return chunks.slice(0, 18).map((chunk, index) => ({
    id: `chunk-${index + 1}`,
    ...chunk
  }));
}

function toChunk(text) {
  return {
    text,
    chunkType: inferChunkType(text)
  };
}

function inferChunkType(text) {
  if (/误区|反例|不是|不能|不要|避免|错误/.test(text)) return "counterexample";
  if (/步骤|第一|第二|第三|流程|先|然后|最后/.test(text)) return "step";
  if (/场景|案例|当|如果|适合|用于/.test(text)) return "scenario";
  if (/区别|相比|对比|而不是|不是.*而是/.test(text)) return "comparison";
  if (/方法|做法|应该|需要|关键|核心|原则/.test(text)) return "method";
  if (/因为|原因|所以|导致|意味着/.test(text)) return "judgment";
  return "concept";
}
