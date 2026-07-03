#!/usr/bin/env node

import { existsSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const args = parseArgs(process.argv.slice(2));
const inputPath = args.input;
const acceptanceRecord = args["acceptance-record"];
const outputDir = args["output-dir"] || ".release/app-store-inputs";
const apply = args.apply === true;
const allowPending = args["allow-pending"] === true;
const force = args.force === true;

console.log("# Recallo App Store Ingest User Reply");
console.log(`repoRoot=${repoRoot}`);
console.log(`source=${inputPath || "(missing)"}`);
console.log(`acceptanceRecord=${acceptanceRecord || "(missing)"}`);
console.log(`outputDir=${outputDir}`);
console.log(`mode=${apply ? "apply" : "dry-run"}`);
console.log(`allowPending=${allowPending ? "yes" : "no"}`);

if (!inputPath) fail("Missing --input <reply-text-file>.");
if (!existsSync(resolve(repoRoot, inputPath))) fail(`Input file does not exist: ${inputPath}`);
if (!acceptanceRecord && !allowPending) {
  fail("Missing --acceptance-record <path>. Use --allow-pending only for draft intake.");
}

const decisionPath = `${outputDir}/decision-values.json`;
const contactPath = `${outputDir}/contact-values.json`;

runStep("parse reply into standard release inputs", [
  "tools/app-store-parse-fast-release-reply.mjs",
  "--input", inputPath,
  "--output-dir", outputDir,
  "--force",
  ...(acceptanceRecord ? ["--acceptance-record", acceptanceRecord] : []),
  ...(allowPending ? ["--allow-pending"] : [])
]);

runStep("dry-run decision form update", [
  "tools/app-store-apply-user-decisions.mjs",
  decisionPath,
  "--dry-run"
]);

runStep("dry-run contact/url update", [
  "tools/app-store-apply-contact-info.mjs",
  contactPath,
  "--dry-run"
]);

if (apply) {
  runStep("apply decision form update", [
    "tools/app-store-apply-user-decisions.mjs",
    decisionPath
  ]);

  runStep("apply contact/url update", [
    "tools/app-store-apply-contact-info.mjs",
    contactPath
  ]);

  runStep("refresh user handoff", [
    "tools/app-store-create-user-handoff.mjs",
    "--force"
  ]);
} else {
  console.log("");
  console.log("Dry-run mode: no tracked release documents were modified.");
  console.log("To apply after reviewing the dry-run output, rerun with --apply.");
}

runStep("release status summary", [
  "tools/app-store-status.mjs"
], { allowFailure: true });

runStep("App Store Connect copy pack check", [
  "tools/app-store-create-connect-copy-pack.mjs",
  "--dry-run"
], { allowFailure: true });

console.log("");
console.log("Intake complete.");
console.log(`Generated inputs: ${decisionPath}, ${contactPath}`);

function runStep(label, commandArgs, options = {}) {
  console.log("");
  console.log(`## ${label}`);
  console.log(`node ${commandArgs.join(" ")}`);
  const result = spawnSync(process.execPath, commandArgs.map(String), {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "inherit",
    env: process.env
  });
  const status = result.status ?? 1;
  if (status !== 0 && !options.allowFailure) {
    fail(`${label} failed with exit code ${status}.`);
  }
  if (status !== 0 && options.allowFailure) {
    console.log(`${label} reported blockers; continuing because this is an informational gate.`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      fail(`Unexpected positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (["apply", "allow-pending", "force"].includes(key)) {
      parsed[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      fail(`Missing value for --${key}.`);
    }
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
