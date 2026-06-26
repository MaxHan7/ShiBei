#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));
const appPath = args.app ? resolve(args.app) : findLatestReleaseApp();
const expectedBundleId = args["bundle-id"] || "com.maxhan.shibei";

if (!appPath || !existsSync(appPath)) {
  console.error("No Release iPhoneOS .app found. Pass --app /path/to/拾贝.app after archive/export.");
  process.exit(1);
}

const profilePath = join(appPath, "embedded.mobileprovision");
const infoPlistPath = join(appPath, "Info.plist");
const checks = [];

const bundleId = readPlistValue(infoPlistPath, "CFBundleIdentifier");
checks.push(check(
  "bundle_id",
  bundleId === expectedBundleId,
  `CFBundleIdentifier must be ${expectedBundleId}; actual=${bundleId || "(missing)"}`
));

const signedEntitlements = readSignedEntitlements(appPath);
checks.push(check(
  "signed_aps_production",
  signedEntitlements["aps-environment"] === "production",
  `codesigned aps-environment must be production; actual=${signedEntitlements["aps-environment"] || "(missing)"}`
));
checks.push(check(
  "signed_get_task_allow_false",
  signedEntitlements["get-task-allow"] === false,
  `codesigned get-task-allow must be false; actual=${String(signedEntitlements["get-task-allow"])}`
));
checks.push(check(
  "signed_application_identifier",
  String(signedEntitlements["application-identifier"] || "").endsWith(`.${expectedBundleId}`),
  `codesigned application-identifier must end with .${expectedBundleId}`
));

const profileEntitlements = readProvisioningProfileEntitlements(profilePath);
checks.push(check(
  "profile_aps_production",
  profileEntitlements["aps-environment"] === "production",
  `embedded profile aps-environment must be production; actual=${profileEntitlements["aps-environment"] || "(missing)"}`
));
checks.push(check(
  "profile_get_task_allow_false",
  profileEntitlements["get-task-allow"] === false,
  `embedded profile get-task-allow must be false; actual=${String(profileEntitlements["get-task-allow"])}`
));
checks.push(check(
  "profile_application_identifier",
  String(profileEntitlements["application-identifier"] || "").endsWith(`.${expectedBundleId}`),
  `embedded profile application-identifier must end with .${expectedBundleId}`
));

console.log("# Shibei iOS Signing Guard");
console.log(`app=${appPath}`);
console.log("");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error("");
  console.error(`iOS signing guard failed: ${failed.map((item) => item.name).join(", ")}`);
  console.error("Use an App Store/TestFlight distribution export profile before release.");
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "1";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

function findLatestReleaseApp() {
  const derivedData = join(homedir(), "Library/Developer/Xcode/DerivedData");
  if (!existsSync(derivedData)) return "";
  const candidates = [];
  collectApps(derivedData, candidates);
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.path || "";
}

function collectApps(directory, candidates) {
  let entries = [];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name === "拾贝.app" && path.includes("Release-iphoneos")) {
      candidates.push({ path, mtimeMs: statSync(path).mtimeMs });
      continue;
    }
    if (entry.isDirectory() && shouldDescend(path, entry.name)) {
      collectApps(path, candidates);
    }
  }
}

function shouldDescend(path, name) {
  if (name.endsWith(".app")) return false;
  return path.includes("DerivedData")
    || path.includes("Build")
    || path.includes("Products")
    || path.includes("ArchiveIntermediates")
    || name.startsWith("拾贝-")
    || name === "Intermediates.noindex";
}

function readPlistValue(path, key) {
  try {
    return execFileSync("plutil", ["-extract", key, "raw", "-o", "-", path], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readSignedEntitlements(path) {
  try {
    const xml = execFileSync("codesign", ["-d", "--entitlements", ":-", path], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return parsePlutilOutput(execFileSync("plutil", ["-p", "-"], { input: xml, encoding: "utf8" }));
  } catch {
    return {};
  }
}

function readProvisioningProfileEntitlements(path) {
  try {
    const profileXml = execFileSync("security", ["cms", "-D", "-i", path], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const entitlementsXml = execFileSync("plutil", ["-extract", "Entitlements", "xml1", "-o", "-", "-"], { input: profileXml, encoding: "utf8" });
    return parsePlutilOutput(execFileSync("plutil", ["-p", "-"], { input: entitlementsXml, encoding: "utf8" }));
  } catch {
    return {};
  }
}

function parsePlutilOutput(output) {
  const result = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/"([^"]+)"\s*=>\s*(.+)$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value === "true") result[match[1]] = true;
    else if (value === "false") result[match[1]] = false;
    else result[match[1]] = value.replace(/^"|"$/g, "");
  }
  return result;
}
