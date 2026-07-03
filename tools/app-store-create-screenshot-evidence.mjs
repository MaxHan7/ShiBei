#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const screenshotDir = "docs/app-store-release-evidence/screenshots/app-store";
const evidenceDir = "docs/app-store-release-evidence";
const acceptedExtensions = new Set([".png", ".jpg", ".jpeg"]);
const expectedScreenshots = [
  ["01-home-learning-path", "首页学习路径"],
  ["02-add-article", "添加文章"],
  ["03-generating", "生成中页面"],
  ["04-chapter-detail", "章节详情"],
  ["05-question-card", "做题页面"],
  ["06-discover-recommendations", "发现页推荐好文"]
];

const args = parseArgs(process.argv.slice(2));
const generatedAt = new Date().toISOString();
const evidencePath = args.output || join(evidenceDir, `${generatedAt.slice(0, 10)}-screenshot-evidence.md`);
const absoluteScreenshotDir = resolve(repoRoot, screenshotDir);
const files = listImageFiles(absoluteScreenshotDir);
const screenshotReports = files.map((file) => inspectScreenshot(join(absoluteScreenshotDir, file)));
const audit = runAudit();
const coverage = expectedScreenshots.map(([prefix, label]) => ({
  prefix,
  label,
  present: screenshotReports.some((report) => report.basename.startsWith(prefix))
}));
const status = audit.stdout.includes("Screenshot readiness: READY") ? "READY" : "NOT READY";
const markdown = renderMarkdown({ generatedAt, screenshotReports, coverage, audit, status });

if (args.stdout) {
  process.stdout.write(markdown);
} else {
  mkdirSync(resolve(repoRoot, dirname(evidencePath)), { recursive: true });
  writeFileSync(resolve(repoRoot, evidencePath), markdown);
  console.log(`wrote=${evidencePath}`);
  console.log(`status=${status}`);
  console.log(`count=${screenshotReports.length}`);
}

function parseArgs(rawArgs) {
  const parsed = { output: "", stdout: false };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--stdout") {
      parsed.stdout = true;
    } else if (arg === "--output") {
      parsed.output = rawArgs[index + 1] || "";
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function listImageFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => {
      const path = join(directory, file);
      return statSync(path).isFile() && acceptedExtensions.has(extname(file).toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b));
}

function inspectScreenshot(path) {
  const buffer = readFileSync(path);
  const stat = statSync(path);
  const extension = extname(path).toLowerCase();
  const basename = path.split("/").pop();
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  let dimensions = { width: "unknown", height: "unknown" };
  let dimensionError = "";

  try {
    dimensions = extension === ".png" ? readPngDimensions(buffer) : readJpegDimensions(buffer);
  } catch (error) {
    dimensionError = error.message;
  }

  return {
    basename,
    extension,
    bytes: stat.size,
    sha256,
    dimensionError,
    ...dimensions
  };
}

function runAudit() {
  const result = spawnSync("node", ["tools/app-store-screenshot-audit.mjs"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout.trimEnd(),
    stderr: result.stderr.trimEnd()
  };
}

function renderMarkdown({ generatedAt, screenshotReports, coverage, audit, status }) {
  const rows = screenshotReports.length
    ? screenshotReports
        .map((report) => {
          const size = report.dimensionError ? `ERROR: ${report.dimensionError}` : `${report.width}x${report.height}`;
          return `| \`${report.basename}\` | ${size} | ${formatBytes(report.bytes)} | \`${report.sha256}\` |`;
        })
        .join("\n")
    : "| - | - | - | - |";

  const coverageRows = coverage
    .map((item) => `| \`${item.prefix}\` | ${item.label} | ${item.present ? "YES" : "NO"} |`)
    .join("\n");

  const stderrBlock = audit.stderr ? `\n\n## Audit Stderr\n\n\`\`\`text\n${audit.stderr}\n\`\`\`` : "";

  return `# Recallo App Store Screenshot Evidence

repoRoot=${repoRoot}
generatedAt=${generatedAt}
source=${screenshotDir}
status=${status}
count=${screenshotReports.length}

## Purpose

This evidence file records the exact screenshot files prepared for App Store Connect. It is intentionally separate from visual approval: the user still owns taking and approving final screenshots, while Codex records file identity, dimensions, scene coverage, and the automated screenshot audit result.

## Screenshot Files

| File | Dimensions | Size | SHA-256 |
| --- | --- | --- | --- |
${rows}

## Recommended Scene Coverage

| Prefix | Scene | Present |
| --- | --- | --- |
${coverageRows}

## Current Interpretation

${status === "READY" ? "- At least one screenshot satisfies the current App Store technical screenshot gate." : "- Screenshot evidence is not ready yet. Add at least one valid 6.9-inch iPhone portrait screenshot before final submission."}
- Six core-scene screenshots remain recommended for Recallo's first public App Store product page.
- Screenshots must come from the correct Recallo Release/TestFlight build, not from old Shibei workspaces, local fixtures, or debug builds.

## Audit Output

\`\`\`text
${audit.stdout}
\`\`\`
${stderrBlock}
`.trimEnd() + "\n";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(1)} KiB`;
  return `${(kib / 1024).toFixed(2)} MiB`;
}

function readPngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("invalid PNG signature");
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJpegDimensions(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("invalid JPEG signature");
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (isStartOfFrame(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }
    offset += 2 + length;
  }

  throw new Error("missing JPEG SOF marker");
}

function isStartOfFrame(marker) {
  return [
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf
  ].includes(marker);
}
