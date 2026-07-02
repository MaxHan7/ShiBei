#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));

const expected = {
  workspaceSegment: "/拾贝-prod-hardening",
  packageName: "recallo",
  scheme: "Recallo",
  displayName: "Recallo",
  productName: "Recallo",
  appProduct: "Recallo.app",
  bundleId: "com.maxhan.shibei",
  appIconName: "AppIcon"
};

const checks = [];
const warnings = [];

function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

function readJSON(path) {
  return JSON.parse(read(path));
}

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
}

function warn(name, detail) {
  warnings.push({ name, detail });
}

function requireIncludes(name, source, snippet, detail = `missing snippet: ${snippet}`) {
  if (source.includes(snippet)) pass(name, snippet);
  else fail(name, detail);
}

console.log("# Recallo Release Archive Preflight");
console.log(`repoRoot=${repoRoot}`);
console.log(`cwd=${realpathSync(process.cwd())}`);

if (repoRoot.includes(expected.workspaceSegment)) {
  pass("workspace_is_official_prod_hardening", repoRoot);
} else {
  fail(
    "workspace_is_official_prod_hardening",
    `Archive must be prepared from a path containing ${expected.workspaceSegment}; actual=${repoRoot}`
  );
}

const cwd = realpathSync(process.cwd());
if (cwd === repoRoot || cwd.startsWith(`${repoRoot}/`)) {
  pass("cwd_is_inside_official_worktree", cwd);
} else {
  fail(
    "cwd_is_inside_official_worktree",
    `Run this preflight from the official worktree; cwd=${cwd} repoRoot=${repoRoot}`
  );
}

const gitRoot = realpathSync(git(["rev-parse", "--show-toplevel"]));
if (gitRoot === repoRoot) pass("git_root_matches_repo_root", gitRoot);
else fail("git_root_matches_repo_root", `expected=${repoRoot} actual=${gitRoot}`);

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
if (/^(codex\/recallo|release\/recallo|main|master)/.test(branch)) {
  pass("branch_is_allowed_for_recallo_release", branch);
} else {
  fail("branch_is_allowed_for_recallo_release", `unexpected branch=${branch}`);
}

const commit = git(["rev-parse", "--short=12", "HEAD"]);
console.log(`branch=${branch}`);
console.log(`commit=${commit}`);

const packageJSON = readJSON("package.json");
if (packageJSON.name === expected.packageName) pass("package_name_is_recallo", packageJSON.name);
else fail("package_name_is_recallo", `expected=${expected.packageName} actual=${packageJSON.name}`);

const projectPath = "拾贝/拾贝.xcodeproj/project.pbxproj";
const project = read(projectPath);
requireIncludes("xcode_product_is_recallo_app", project, `path = ${expected.appProduct};`);
requireIncludes("xcode_display_name_is_recallo", project, `INFOPLIST_KEY_CFBundleDisplayName = ${expected.displayName};`);
requireIncludes("xcode_product_name_is_recallo", project, `PRODUCT_NAME = ${expected.productName};`);
requireIncludes("xcode_bundle_id_is_production_bundle", project, `PRODUCT_BUNDLE_IDENTIFIER = ${expected.bundleId};`);
requireIncludes("xcode_app_icon_is_appicon", project, `ASSETCATALOG_COMPILER_APPICON_NAME = ${expected.appIconName};`);
requireIncludes("xcode_release_apns_is_production", project, "APS_ENVIRONMENT = production;");

if (project.includes("path = \"拾贝.app\";") || project.includes("path = 拾贝.app;")) {
  fail("xcode_project_does_not_reference_old_app_product", "project still references 拾贝.app");
} else {
  pass("xcode_project_does_not_reference_old_app_product", "no old app product reference");
}

const contentView = read("拾贝/拾贝/ContentView.swift");
if (/#else\s+return true\s+#endif/s.test(contentView) && contentView.includes("V2RootView()")) {
  pass("release_entry_uses_v2_root", "ContentView Release path returns true for V2RootView");
} else {
  fail("release_entry_uses_v2_root", "ContentView Release path must enter V2RootView");
}

const apiClient = read("拾贝/拾贝/Services/APIClient.swift");
if (
  apiClient.includes('static let productionBaseURL = URL(string: "https://shibei-production.up.railway.app")!')
  && /#else\s+static let defaultBaseURL = APIClient\.productionBaseURL\s+#endif/s.test(apiClient)
) {
  pass("release_api_uses_production_url", "Release defaultBaseURL is production");
} else {
  fail("release_api_uses_production_url", "Release API base URL must be production");
}

const appIconContentsPath = "拾贝/拾贝/Assets.xcassets/AppIcon.appiconset/Contents.json";
if (existsSync(resolve(repoRoot, appIconContentsPath))) {
  const appIconContents = readJSON(appIconContentsPath);
  const imageCount = Array.isArray(appIconContents.images)
    ? appIconContents.images.filter((image) => image.filename).length
    : 0;
  if (imageCount > 0) pass("app_icon_has_image_files", `${imageCount} image entries`);
  else fail("app_icon_has_image_files", "AppIcon.appiconset has no image filenames");
} else {
  fail("app_icon_has_image_files", `${appIconContentsPath} is missing`);
}

const riskFiles = [
  "拾贝/拾贝/ContentView.swift",
  "拾贝/拾贝/Services/APIClient.swift",
  "拾贝/拾贝/V2/V2RootView.swift",
  "拾贝/拾贝/V2",
  "拾贝/拾贝/Views",
  "拾贝/拾贝/Components",
  "拾贝/拾贝/Localizable.xcstrings"
];

const criticalVisibleNeedles = [
  "fixture 没有对应页面数据",
  "本地 fixture",
  "JSON decode",
  "decode path",
  "无法找到本地页面数据"
];

for (const needle of criticalVisibleNeedles) {
  const result = grep(needle, riskFiles);
  if (result.length === 0) pass(`no_release_blocking_text:${needle}`, "not found");
  else fail(`no_release_blocking_text:${needle}`, result.join("\n"));
}

const warningNeedles = ["Railway", "deviceId", "ShibeiUseLegacyRoot"];
for (const needle of warningNeedles) {
  const result = grep(needle, riskFiles);
  if (result.length > 0) {
    warn(`review_release_visibility:${needle}`, result.slice(0, 12).join("\n"));
  }
}

console.log("");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

if (warnings.length > 0) {
  console.log("");
  console.log("# Warnings");
  for (const item of warnings) {
    console.log(`WARN ${item.name}`);
    console.log(item.detail);
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error("");
  console.error(`Release archive preflight failed: ${failed.map((item) => item.name).join(", ")}`);
  process.exit(1);
}

console.log("");
console.log("Release archive preflight passed.");

function grep(needle, paths) {
  try {
    const output = execFileSync("rg", ["-n", "--fixed-strings", needle, ...paths], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    return output ? output.split("\n") : [];
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
}
