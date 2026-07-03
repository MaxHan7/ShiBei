#!/usr/bin/env node

import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const strict = process.argv.includes("--strict");
const positionalArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const screenshotDir = positionalArg || "docs/app-store-release-evidence/screenshots/app-store";

const acceptedIPhone69PortraitSizes = new Set([
  "1260x2736",
  "1290x2796",
  "1320x2868"
]);
const acceptedExtensions = new Set([".png", ".jpg", ".jpeg"]);
const expectedScreenshots = [
  "01-home-learning-path",
  "02-add-article",
  "03-generating",
  "04-chapter-detail",
  "05-question-card",
  "06-discover-recommendations"
];

const absoluteDir = resolve(repoRoot, screenshotDir);
const files = listImageFiles(absoluteDir);
const reports = files.map((file) => inspectImage(join(absoluteDir, file)));
const failures = [];
const warnings = [];

if (reports.length < 1 || reports.length > 10) {
  failures.push(`截图数量必须是 1-10 张，当前为 ${reports.length} 张。`);
}

for (const expected of expectedScreenshots) {
  if (!reports.some((report) => report.basename.startsWith(expected))) {
    warnings.push(`缺少建议截图文件：${expected}.*`);
  }
}

for (const report of reports) {
  if (!acceptedExtensions.has(report.extension)) {
    failures.push(`${report.basename} 格式不支持；仅支持 .png、.jpg、.jpeg。`);
  }
  if (report.error) {
    failures.push(`${report.basename} 无法读取尺寸：${report.error}`);
    continue;
  }
  if (report.width >= report.height) {
    failures.push(`${report.basename} 不是竖屏截图：${report.width}x${report.height}。`);
  }
  if (!acceptedIPhone69PortraitSizes.has(`${report.width}x${report.height}`)) {
    failures.push(`${report.basename} 不是 6.9 英寸 iPhone 竖屏规格：${report.width}x${report.height}。`);
  }
}

console.log("# Recallo App Store Screenshot Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${strict ? "strict" : "report"}`);
console.log(`source=${screenshotDir}`);
console.log(`count=${reports.length}`);
console.log("acceptedIPhone69PortraitSizes=1260x2736,1290x2796,1320x2868");

if (reports.length > 0) {
  console.log("");
  console.log("## Screenshots");
  for (const report of reports) {
    const size = report.error ? `ERROR ${report.error}` : `${report.width}x${report.height}`;
    console.log(`- ${report.basename}: ${size}`);
  }
}

if (warnings.length > 0) {
  console.log("");
  console.log(`## Warnings (${warnings.length})`);
  for (const warning of warnings) {
    console.log(`WARN ${warning}`);
  }
}

if (failures.length > 0) {
  console.log("");
  console.log(`Screenshot readiness: NOT READY (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  if (strict) {
    process.exit(1);
  }
} else {
  console.log("");
  console.log("Screenshot readiness: READY");
}

function listImageFiles(directory) {
  try {
    return readdirSync(directory)
      .filter((file) => {
        const path = join(directory, file);
        return statSync(path).isFile() && acceptedExtensions.has(extname(file).toLowerCase());
      })
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function inspectImage(path) {
  const basename = path.split("/").pop();
  const extension = extname(path).toLowerCase();
  try {
    const buffer = readFileSync(path);
    const dimensions = extension === ".png" ? readPngDimensions(buffer) : readJpegDimensions(buffer);
    return { basename, extension, ...dimensions };
  } catch (error) {
    return { basename, extension, error: error.message };
  }
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
