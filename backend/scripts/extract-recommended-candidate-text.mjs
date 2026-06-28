import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractSourceContent } from "../src/sources/extractSourceContent.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, "..");
const repoRoot = resolve(backendRoot, "..");
const DEFAULT_CANDIDATES_PATH = resolve(backendRoot, "content/recommended-candidates.json");
const DEFAULT_OUTPUT_DIR = resolve(repoRoot, ".tmp/recommended-workspace");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidateId = args["candidate-id"] || args.id;
  if (!candidateId) {
    throw new Error("Usage: node backend/scripts/extract-recommended-candidate-text.mjs --candidate-id <id> [--max-chars 9000]");
  }

  const candidatesPath = resolve(args["candidates-path"] || DEFAULT_CANDIDATES_PATH);
  const outputDir = resolve(args["output-dir"] || DEFAULT_OUTPUT_DIR);
  const maxChars = readPositiveInt(args["max-chars"], 9000);
  const catalog = JSON.parse(await readFile(candidatesPath, "utf8"));
  const candidate = (catalog.articles || []).find((article) => article.id === candidateId);
  if (!candidate) {
    throw new Error(`Recommended article candidate not found: ${candidateId}`);
  }
  if (candidate.contentAccess === "public_pdf" || /\.pdf($|\?)/i.test(candidate.sourceUrl || "")) {
    throw new Error(`Candidate ${candidate.id} is a PDF source. Extract it to text manually and review before generation.`);
  }

  const source = await extractSourceContent({
    sourceType: "article_link",
    sourceUrl: candidate.sourceUrl
  });
  const cleaned = makeLearningExcerpt(source.rawText, { maxChars });
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `${candidate.id}.txt`);
  await writeFile(outputPath, cleaned, "utf8");

  console.log(JSON.stringify({
    candidateId,
    outputPath,
    originalLength: source.rawText.length,
    cleanedLength: cleaned.length,
    title: source.sourceTitle,
    account: source.sourceAccount
  }, null, 2));
}

export function makeLearningExcerpt(rawText, { maxChars = 9000 } = {}) {
  const lines = String(rawText || "")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isLikelyNavigationLine(line));

  const selected = [];
  let total = 0;
  for (const line of lines) {
    if (selected.length > 0 && total + line.length > maxChars) break;
    selected.push(line);
    total += line.length + 1;
  }
  return `${selected.join("\n\n").trim()}\n`;
}

function isLikelyNavigationLine(line) {
  return [
    /^home$/i,
    /^products?$/i,
    /^resources?$/i,
    /^newsletter$/i,
    /^subscribe$/i,
    /^share$/i,
    /^search$/i,
    /^menu$/i,
    /^privacy policy$/i,
    /^terms/i,
    /^cookie/i,
    /^sign in$/i,
    /^contact$/i,
    /^about$/i,
    /^skip to/i,
    /^read more$/i,
    /^back to/i
  ].some((pattern) => pattern.test(line));
}

function readPositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
