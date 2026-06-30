#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

console.log("# Recallo Workspace Guard");
console.log(`repoRoot=${repoRoot}`);

const gitRoot = realpathSync(git(["rev-parse", "--show-toplevel"]));
if (gitRoot === repoRoot) {
  pass("git_root_matches_script_root");
} else {
  fail(`git_root_mismatch expected=${repoRoot} actual=${gitRoot}`);
}

const packageName = readJSON(resolve(repoRoot, "package.json")).name;
if (packageName === "recallo") {
  pass("package_name_is_recallo");
} else {
  fail(`package_name_is_not_recallo actual=${packageName}`);
}

const backendPackageName = readJSON(resolve(repoRoot, "backend/package.json")).name;
if (backendPackageName === "recallo-generation-demo") {
  pass("backend_package_name_is_recallo");
} else {
  fail(`backend_package_name_is_not_recallo actual=${backendPackageName}`);
}

const projectPath = resolve(repoRoot, "拾贝/拾贝.xcodeproj/project.pbxproj");
const project = readFileSync(projectPath, "utf8");
const requiredProjectSnippets = [
  "path = Recallo.app;",
  "INFOPLIST_KEY_CFBundleDisplayName = Recallo;",
  "PRODUCT_NAME = Recallo;",
  "PRODUCT_BUNDLE_IDENTIFIER = com.maxhan.shibei;"
];

for (const snippet of requiredProjectSnippets) {
  if (project.includes(snippet)) {
    pass(`xcode_project_contains ${snippet}`);
  } else {
    fail(`xcode_project_missing ${snippet}`);
  }
}

if (project.includes("path = \"拾贝.app\";")) {
  fail("xcode_project_still_points_to_old_app_product");
} else {
  pass("xcode_project_does_not_point_to_old_app_product");
}

const installScript = readFileSync(resolve(repoRoot, "tools/install-official-ios.sh"), "utf8");
if (
  installScript.includes('SCHEME="Recallo"')
  && installScript.includes("Recallo.app")
  && installScript.includes('DISPLAY_NAME" != "Recallo"')
) {
  pass("install_script_requires_recallo_app_and_display_name");
} else {
  fail("install_script_missing_recallo_scheme_app_or_display_name_guard");
}

if (process.exitCode) {
  console.error("Workspace is not safe for Recallo install/deploy.");
  process.exit(process.exitCode);
}
