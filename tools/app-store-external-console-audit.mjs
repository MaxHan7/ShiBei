#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = realpathSync(resolve(scriptDir, ".."));
const reportMode = process.argv.includes("--report");
const inputPath = getArgValue("--input") || ".release/app-store-inputs/external-console-checks.json";
const absoluteInputPath = resolve(repoRoot, inputPath);

const checks = [];

console.log("# Recallo App Store External Console Audit");
console.log(`repoRoot=${repoRoot}`);
console.log(`mode=${reportMode ? "report" : "strict"}`);
console.log(`input=${inputPath}`);

if (!existsSync(absoluteInputPath)) {
  fail(
    "external_console_input_exists",
    `Missing ${inputPath}`,
    "复制 docs/app-store-external-console-checks.example.json 到 .release/app-store-inputs/external-console-checks.json，并填写 Apple Developer / App Store Connect 实际确认结果。"
  );
  finish();
}

let values;
try {
  values = JSON.parse(readFileSync(absoluteInputPath, "utf8"));
} catch (error) {
  fail(
    "external_console_input_valid_json",
    `${inputPath} is not valid JSON: ${error.message}`,
    "修复 JSON 格式后重新运行。"
  );
  finish();
}

checkAppleDeveloper(values.appleDeveloper ?? {});
checkAppStoreConnect(values.appStoreConnect ?? {});
checkReviewSubmission(values.reviewSubmission ?? {});
finish();

function checkAppleDeveloper(section) {
  requireText(section.teamName, "apple_developer_team_name", "Apple Developer teamName 必须填写后台看到的 team 名称。");
  requireExact(section.bundleId, "com.maxhan.shibei", "apple_developer_bundle_id", "Apple Developer App ID 必须是 com.maxhan.shibei。");
  requireTrue(section.appIdUsesExistingBundle, "apple_developer_existing_bundle", "必须确认使用现有 com.maxhan.shibei App ID。");
  requireTrue(section.pushNotificationsEnabled, "apple_developer_push_enabled", "Apple Developer App ID 必须开启 Push Notifications capability。");
  requireTrue(section.productionApnsConfigured, "apple_developer_apns_production", "必须确认 production APNs key/certificate 与 Railway 生产环境一致。");
  requireEnum(
    section.signInWithAppleDecision,
    ["enabled", "disabled-first-release"],
    "apple_developer_sign_in_with_apple_decision",
    "signInWithAppleDecision 必须是 enabled 或 disabled-first-release。"
  );
  requireTrue(
    section.signInWithAppleCapabilityMatchesDecision,
    "apple_developer_sign_in_with_apple_capability_matches",
    "Sign in with Apple capability 必须和首版决策一致。"
  );
}

function checkAppStoreConnect(section) {
  requireTrue(section.usesExistingAppRecord, "asc_existing_app_record", "App Store Connect 必须使用旧 TestFlight 对应的现有 App 记录。");
  requireExact(section.bundleId, "com.maxhan.shibei", "asc_bundle_id", "App Store Connect bundle id 必须是 com.maxhan.shibei。");
  requireExact(section.appName, "Recallo", "asc_app_name", "App Store Connect App Name 必须是 Recallo。");
  requireText(section.sku, "asc_sku", "App Store Connect SKU 必须记录。");
  requireText(section.primaryCategory, "asc_primary_category", "Primary Category 必须填写最终分类。");
  requireExact(normalizeText(section.pricing), "free", "asc_pricing_free", "首版 Pricing 必须确认免费，填 free。");
  requireFalse(section.iapOrSubscriptionsEnabled, "asc_no_iap_or_subscriptions", "首版不应启用 IAP/订阅。");
  requireHttps(section.privacyPolicyUrl, "asc_privacy_policy_url", "Privacy Policy URL 必须是公开 HTTPS URL。");
  requireHttps(section.supportUrl, "asc_support_url", "Support URL 必须是公开 HTTPS URL。");
  requireTrue(section.appPrivacyLabelsCompleted, "asc_privacy_labels_completed", "App Privacy 标签必须按 docs/app-store-privacy-labels-zh.md 填完。");
  requireTrue(section.ageRatingCompleted, "asc_age_rating_completed", "年龄分级问卷必须完成。");
  requireTrue(section.screenshotsUploaded, "asc_screenshots_uploaded", "App Store 截图必须上传并确认无旧品牌/旧 UI。");
  requireTrue(section.latestRecalloBuildSelected, "asc_latest_recallo_build_selected", "App Store Connect 必须选择最新 Recallo build。");
  requireTrue(section.reviewNotesPasted, "asc_review_notes_pasted", "App Review Notes 必须粘贴最新审核说明。");
}

function checkReviewSubmission(section) {
  requireExact(section.archiveAppName, "Recallo", "archive_app_name", "Xcode Organizer archive app name 必须是 Recallo。");
  requireExact(section.archiveBundleId, "com.maxhan.shibei", "archive_bundle_id", "Xcode Organizer archive bundle id 必须是 com.maxhan.shibei。");
  requireTrue(section.archiveIconIsRecallo, "archive_icon_recallo", "Archive 图标必须是新版 Recallo 图标。");
  requireTrue(section.noOldShibeiBrandVisible, "archive_no_old_brand_visible", "最终提交包和截图中不得出现旧“拾贝/ShiBei”品牌可见文案。");
  requireTrue(section.readyToSubmitForReview, "ready_to_submit_for_review", "提交审核前必须由用户最终确认 readyToSubmitForReview=true。");
}

function requireText(value, name, detail) {
  const text = normalizeText(value);
  addCheck(name, Boolean(text) && !isPending(text), detail, `填写 ${name}。`);
}

function requireExact(value, expected, name, detail) {
  addCheck(name, normalizeText(value) === expected, detail, `把 ${name} 改为 ${expected}，或回到 Apple 后台确认是否打开了错误 App/错误工程。`);
}

function requireTrue(value, name, detail) {
  addCheck(name, value === true, detail, `在 Apple 后台完成/确认后，把 ${name} 填为 true。`);
}

function requireFalse(value, name, detail) {
  addCheck(name, value === false, detail, `确认首版未启用该项后，把 ${name} 填为 false。`);
}

function requireHttps(value, name, detail) {
  const text = normalizeText(value);
  addCheck(name, /^https:\/\/[^\s]+$/.test(text), detail, `提供公开 HTTPS URL 并填入 ${name}。`);
}

function requireEnum(value, allowed, name, detail) {
  const text = normalizeText(value);
  addCheck(name, allowed.includes(text), detail, `把 ${name} 填为 ${allowed.join(" 或 ")}。`);
}

function fail(name, detail, action) {
  addCheck(name, false, detail, action);
}

function addCheck(name, ok, detail, action) {
  checks.push({ name, ok, detail, action });
}

function finish() {
  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name} - ${check.detail}`);
  }

  const failures = checks.filter((check) => !check.ok);
  console.log("");
  if (failures.length > 0) {
    console.log(`External console readiness: NOT READY (${failures.length} blocker${failures.length === 1 ? "" : "s"})`);
    console.log("");
    console.log("## Required user actions");
    for (const [index, action] of [...new Set(failures.map((failure) => failure.action))].entries()) {
      console.log(`${index + 1}. ${action}`);
    }
    if (!reportMode) process.exit(1);
    process.exit(0);
  }

  console.log("External console readiness: READY");
  process.exit(0);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPending(text) {
  return /待确认|待填写|待补充|TODO|TBD/i.test(text);
}

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}
