#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const args = parseArgs(process.argv.slice(2));
const outDir = args.output || ".release/app-store-static-site";
const allowNotReady = args["allow-not-ready"] === true;
const dryRun = args["dry-run"] === true;
const absoluteOutDir = resolve(repoRoot, outDir);

console.log("# Recallo App Store Build Static Site");
console.log(`repoRoot=${repoRoot}`);
console.log(`target=${outDir}`);
console.log(`mode=${dryRun ? "dry-run" : "write"}`);
console.log(`allowNotReady=${allowNotReady}`);

const staticGate = runStaticPagesAudit();
if (!staticGate.ok && !allowNotReady) {
  console.log("");
  console.log(staticGate.output.trim());
  fail("Static pages are not ready. Provide support email/contact URLs and run npm run app-store:apply-contact before building the final public static site.");
}

if (dryRun) {
  console.log("");
  console.log("Dry run passed. Static site would be generated.");
  process.exit(0);
}

rmSync(absoluteOutDir, { recursive: true, force: true });
mkdirSync(resolve(absoluteOutDir, "privacy"), { recursive: true });
mkdirSync(resolve(absoluteOutDir, "support"), { recursive: true });

copyFileSync(resolve(repoRoot, "docs/privacy-policy.html"), resolve(absoluteOutDir, "privacy-policy.html"));
copyFileSync(resolve(repoRoot, "docs/support.html"), resolve(absoluteOutDir, "support.html"));
copyFileSync(resolve(repoRoot, "docs/privacy-policy.html"), resolve(absoluteOutDir, "privacy/index.html"));
copyFileSync(resolve(repoRoot, "docs/support.html"), resolve(absoluteOutDir, "support/index.html"));
writeFileSync(resolve(absoluteOutDir, "index.html"), landingPage());
writeFileSync(resolve(absoluteOutDir, "README.md"), readme());

console.log("");
console.log("Static site generated.");
console.log(`privacyPath=${outDir}/privacy/index.html`);
console.log(`supportPath=${outDir}/support/index.html`);
console.log(`flatPrivacyPath=${outDir}/privacy-policy.html`);
console.log(`flatSupportPath=${outDir}/support.html`);
if (!staticGate.ok) {
  console.log("");
  console.log("WARNING: generated with --allow-not-ready. Do not submit these pages to App Store Connect.");
}

function runStaticPagesAudit() {
  const run = spawnSync("node", ["tools/app-store-static-pages-audit.mjs"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  return {
    ok: run.status === 0,
    output: `${run.stdout || ""}${run.stderr || ""}`
  };
}

function landingPage() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Recallo</title>
  <style>
    body{margin:0;background:#f2f4c9;color:#44423d;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",Arial,sans-serif;line-height:1.7}
    main{width:min(760px,calc(100% - 32px));margin:0 auto;padding:64px 0}
    section{background:#fdf9ee;border:1px solid #ece3cc;border-radius:18px;padding:32px;box-shadow:0 18px 48px rgba(75,80,42,.12)}
    h1{margin:0 0 12px;font-size:40px;line-height:1.1}
    a{display:inline-block;margin-right:18px;color:#969855;font-weight:700;text-underline-offset:3px}
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Recallo</h1>
      <p>把文章变成可以继续学习的知识点和练习题。</p>
      <p>
        <a href="./privacy/">隐私政策</a>
        <a href="./support/">支持</a>
      </p>
    </section>
  </main>
</body>
</html>
`;
}

function readme() {
  const commit = git(["rev-parse", "--short=12", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  return `# Recallo App Store Static Site Package

Generated from:

- repo: ${repoRoot}
- branch: ${branch}
- commit: ${commit}

Deploy this directory as a static site.

Recommended URLs:

- Privacy Policy URL: https://<domain>/privacy/
- Support URL: https://<domain>/support/

Flat files are also included for hosts that prefer file paths:

- /privacy-policy.html
- /support.html

Before App Store submission:

1. Confirm the final public URLs open without login.
2. Run \`npm run check:app-store-static-pages\`.
3. Apply the final URLs with \`npm run app-store:apply-contact -- <contact-json>\`.
4. Run \`npm run app-store:status\`.
`;
}

function git(commandArgs) {
  return execFileSync("git", commandArgs, {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) fail(`Unexpected positional argument: ${arg}`);
    const key = arg.slice(2);
    if (["allow-not-ready", "dry-run"].includes(key)) {
      parsed[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for --${key}.`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
