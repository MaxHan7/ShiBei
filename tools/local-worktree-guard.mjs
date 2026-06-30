#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = realpathSync(resolve(fileURLToPath(new URL("..", import.meta.url))));
const expectedRootName = "拾贝-prod-hardening";
const blockedStagedPrefixes = [
  "experiments/shibei-v2/ios/"
];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

console.log("# Recallo Local Worktree Guard");
console.log(`repoRoot=${repoRoot}`);

if (basename(repoRoot) === expectedRootName) {
  pass("worktree_root_is_recallo_prod_hardening");
} else {
  fail(`wrong_worktree_root expected=${expectedRootName} actual=${basename(repoRoot)}`);
}

const officialProject = "拾贝/拾贝.xcodeproj/project.pbxproj";
try {
  git(["ls-files", "--error-unmatch", officialProject]);
  pass("official_xcode_project_is_tracked");
} catch {
  fail(`official_xcode_project_missing expected=${officialProject}`);
}

const stagedFiles = git(["diff", "--cached", "--name-only"]).split("\n").filter(Boolean);
for (const prefix of blockedStagedPrefixes) {
  const offenders = stagedFiles.filter((path) => path.startsWith(prefix));
  if (offenders.length > 0 && process.env.RECALLO_ALLOW_EXPERIMENT_IOS_CHANGES !== "1") {
    fail(`staged_old_experiment_ios_files blockedPrefix=${prefix} files=${offenders.join(",")}`);
  } else {
    pass(`no_staged_old_experiment_ios_files ${prefix}`);
  }
}

if (process.exitCode) {
  console.error("");
  console.error("Local worktree is not safe for Recallo commit/push. Use /Users/hanmingyu/Downloads/拾贝-prod-hardening and avoid the old experiments iOS project.");
  process.exit(process.exitCode);
}
