#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const blogRoot = path.join(repoRoot, "docs/iteration-blog");
const entriesDir = path.join(blogRoot, "entries");
const assetsDir = path.join(blogRoot, "assets");

const args = parseArgs(process.argv.slice(2));
const date = args.date || new Date().toISOString().slice(0, 10);
const title = args.title || `Recallo  产品迭代`;
const filename = `${date}-${slugify(title)}.json`;
const entryPath = path.join(entriesDir, filename);
const assetName = `${date}-${slugify(title)}.svg`;

mkdirSync(entriesDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });

if (existsSync(entryPath) && !args.force) {
  console.log(`Entry already exists: ${path.relative(repoRoot, entryPath)}`);
  process.exit(0);
}

const commits = gitLines(`git log --since="${date} 00:00" --until="${date} 23:59" --pretty=format:%h -- docs demo backend 拾贝 package.json tools quality-test-set tasks 2>/dev/null`);
const diffStat = commandOrEmpty("git diff --stat -- docs demo backend 拾贝 package.json tools quality-test-set tasks");
const hasChanges = diffStat.trim().length > 0 || commits.length > 0;

const entry = {
  date,
  title,
  phase: args.phase || (hasChanges ? "产品迭代" : "讨论与评估"),
  problem: args.problem || (hasChanges
    ? "当天存在产品、体验或质量系统改动，需要沉淀成对外可读的迭代记录。"
    : "当天没有检测到明确代码提交，主要沉淀讨论、评估或下一步方向。"),
  changes: args.change.length ? args.change : summarizeChanges(diffStat),
  screenshots: [
    {
      src: `assets/${assetName}`,
      caption: args.caption || `${date} 迭代摘要`
    }
  ],
  result: args.result || (hasChanges
    ? "本轮改动已进入项目记录，可在后续迭代中继续对比效果。"
    : "保留当天思考过程，避免产品判断散落在对话里。"),
  next: args.next || "继续推进当前优先级最高的产品问题。",
  commits
};

writeFileSync(entryPath, `${JSON.stringify(entry, null, 2)}\n`);
writeFileSync(path.join(assetsDir, assetName), renderSummarySvg(entry));
syncBlogManifests();

console.log(`Created ${path.relative(repoRoot, entryPath)}`);
console.log(`Created docs/iteration-blog/assets/${assetName}`);

if (args.commit) {
  const files = [
    path.relative(repoRoot, entryPath),
    "docs/iteration-blog/entries/index.json",
    `docs/iteration-blog/assets/${assetName}`
  ];
  execSync(`git add ${files.map(shellQuote).join(" ")}`, { stdio: "inherit" });
  try {
    execSync(`git commit -m ${shellQuote(`docs: add iteration log for ${date}`)}`, { stdio: "inherit" });
  } catch (error) {
    console.log("No commit created. Git reported no staged changes or commit failed.");
  }
}

function parseArgs(argv) {
  const result = {
    change: [],
    commit: false,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--commit") {
      result.commit = true;
    } else if (arg === "--force") {
      result.force = true;
    } else if (arg.startsWith("--change=")) {
      result.change.push(arg.slice("--change=".length));
    } else if (arg === "--change") {
      result.change.push(argv[++index] || "");
    } else if (arg.startsWith("--")) {
      const [key, inlineValue] = arg.slice(2).split("=");
      result[key] = inlineValue ?? argv[++index] ?? "";
    }
  }

  return result;
}

function updateManifest(file) {
  const manifestPath = path.join(entriesDir, "index.json");
  const files = readdirSync(entriesDir)
    .filter((name) => name.endsWith(".json") && name !== "index.json")
    .sort();
  if (file && !files.includes(file)) files.push(file);
  const sorted = [...new Set(files)].sort();
  writeFileSync(manifestPath, `${JSON.stringify({ files: sorted }, null, 2)}\n`);
}

function summarizeChanges(diffStat) {
  if (!diffStat.trim()) return ["梳理当天讨论和下一轮产品优先级。"];
  return diffStat
    .split("\n")
    .filter((line) => line.includes("|"))
    .slice(0, 4)
    .map((line) => line.trim().replace(/\s+/g, " "));
}

function renderSummarySvg(entry) {
  const safeTitle = escapeXml(entry.title);
  const safePhase = escapeXml(entry.phase);
  const safeProblem = escapeXml(wrap(entry.problem, 36).join("\n"));
  const safeResult = escapeXml(wrap(entry.result, 38).join("\n"));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <rect width="1200" height="760" fill="#fffaf4"/>
  <rect x="92" y="82" width="1016" height="596" rx="42" fill="#fff" stroke="#fbf3e4" stroke-width="3"/>
  <text x="150" y="154" fill="#e09859" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="24" font-weight="800">${safePhase}</text>
  <text x="150" y="220" fill="#1f1b12" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="44" font-weight="900">${safeTitle}</text>
  <rect x="150" y="286" width="420" height="250" rx="28" fill="#fffaf4" stroke="#eadfcd"/>
  <text x="188" y="346" fill="#1f1b12" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="28" font-weight="800">问题</text>
  ${multilineText(safeProblem, 188, 394)}
  <rect x="630" y="286" width="420" height="250" rx="28" fill="#fffaf4" stroke="#eadfcd"/>
  <text x="668" y="346" fill="#1f1b12" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="28" font-weight="800">效果</text>
  ${multilineText(safeResult, 668, 394)}
  <text x="150" y="612" fill="#665f50" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="24">${entry.date}</text>
</svg>
`;
}

function multilineText(text, x, y) {
  return text.split("\n").map((line, index) => (
    `<text x="${x}" y="${y + index * 34}" fill="#665f50" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="22">${line}</text>`
  )).join("\n  ");
}

function wrap(text, maxLength) {
  const chars = [...String(text || "")];
  const lines = [];
  for (let index = 0; index < chars.length; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(""));
  }
  return lines.slice(0, 4);
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "iteration";
}

function gitLines(command) {
  return commandOrEmpty(command).split("\n").map((line) => line.trim()).filter(Boolean);
}

function commandOrEmpty(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: "utf8" });
  } catch {
    return "";
  }
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function syncBlogManifests() {
  updateManifest(filename);
  updateEntriesData();
}

function updateEntriesData() {
  const manifestPath = path.join(entriesDir, "index.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const entries = files.map((file) => {
    const fullPath = path.join(entriesDir, file);
    return JSON.parse(readFileSync(fullPath, "utf8"));
  });
  const target = path.join(blogRoot, "entries-data.js");
  writeFileSync(target, `window.iterationEntries = ${JSON.stringify(entries, null, 2)};\n`);
}
