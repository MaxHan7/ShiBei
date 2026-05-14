export function cleanContent(rawText) {
  const originalText = String(rawText || "");
  const lines = originalText
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));

  const seen = new Set();
  const cleanedLines = [];
  for (const line of lines) {
    const key = line.replace(/\s+/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    cleanedLines.push(line);
  }

  const cleanedText = cleanedLines
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    originalText,
    cleanedText,
    sourceMap: cleanedLines.map((line, index) => ({
      index,
      text: line
    }))
  };
}

function isNoiseLine(line) {
  const normalized = line.toLowerCase();
  if (/^(广告|推广|点击|关注|扫码|免责声明|阅读原文|展开全文)/.test(line)) return true;
  if (/^(赞|在看|分享|收藏)$/.test(line)) return true;
  if (/https?:\/\/\S+/.test(line) && line.length < 40) return true;
  if (normalized.includes("powered by") || normalized.includes("copyright")) return true;
  return false;
}
