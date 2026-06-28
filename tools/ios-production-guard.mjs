#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const args = new Set(process.argv.slice(2));
const requireV2Release = args.has("--require-v2-release");

const files = {
  contentView: resolve(repoRoot, "拾贝/拾贝/ContentView.swift"),
  apiClient: resolve(repoRoot, "拾贝/拾贝/Services/APIClient.swift"),
  v2Root: resolve(repoRoot, "拾贝/拾贝/V2/V2RootView.swift"),
  settings: resolve(repoRoot, "拾贝/拾贝/Views/SettingsViews.swift"),
  project: resolve(repoRoot, "拾贝/拾贝.xcodeproj/project.pbxproj")
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  check(
    "release_api_uses_production_url",
    source.apiClient.includes('static let productionBaseURL = URL(string: "https://shibei-production.up.railway.app")!')
      && /#else\s+static let defaultBaseURL = APIClient\.productionBaseURL\s+#endif/s.test(source.apiClient),
    "Release APIClient.defaultBaseURL must be the production HTTPS URL."
  ),
  check(
    "debug_api_override_is_debug_only",
    /#if DEBUG[\s\S]*-RecalloV2APIBaseURL[\s\S]*RECALLO_V2_API_BASE_URL[\s\S]*#endif/s.test(source.apiClient),
    "Launch argument/env API override must stay DEBUG-only."
  ),
  check(
    "v2_mock_toggle_disabled_in_release",
    /#if DEBUG[\s\S]*allowsMockDataToggle \?\? true[\s\S]*#else\s+self\.allowsMockDataToggle = false\s+#endif/s.test(source.v2Root)
      && /private var usesFixtures: Bool \{\s*allowsMockDataToggle && usesMockData\s*\}/s.test(source.v2Root),
    "V2 fixture mode must be impossible when allowsMockDataToggle is false."
  ),
  check(
    "settings_data_source_debug_only",
    /private struct DataSourceCard[\s\S]*var body: some View \{\s*#if DEBUG[\s\S]*#else\s*EmptyView\(\)\s*#endif/s.test(source.settings),
    "Data source selector must be DEBUG-only."
  ),
  check(
    "settings_mock_scenarios_debug_only",
    /private struct MockScenarioCard[\s\S]*var body: some View \{\s*#if DEBUG[\s\S]*#else\s*EmptyView\(\)\s*#endif/s.test(source.settings),
    "Mock scenario selector must be DEBUG-only."
  ),
  check(
    "production_bundle_id_present",
    source.project.includes("PRODUCT_BUNDLE_IDENTIFIER = com.maxhan.shibei;"),
    "App target must use production bundle id com.maxhan.shibei."
  ),
  check(
    "release_apns_production_present",
    source.project.includes("APS_ENVIRONMENT = production;"),
    "Release build settings must include production APNS environment."
  )
];

const releaseUsesV2 = /#else\s+return true\s+#endif/s.test(source.contentView);
const releaseUsesLegacy = /#else\s+return false\s+#endif/s.test(source.contentView);
if (requireV2Release) {
  checks.push(check(
    "release_entry_uses_v2",
    releaseUsesV2,
    "When --require-v2-release is set, ContentView Release path must enter V2RootView."
  ));
} else {
  checks.push(check(
    "release_entry_not_flipped_without_gate",
    releaseUsesLegacy || releaseUsesV2,
    releaseUsesLegacy
      ? "Release still uses legacy root; this is allowed before backend/phone gates pass."
      : "Release already uses V2 root; rerun with --require-v2-release before shipping."
  ));
}

console.log("# Recallo iOS Production Guard");
console.log(`requireV2Release=${requireV2Release ? "true" : "false"}`);
console.log("");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error("");
  console.error(`iOS production guard failed: ${failed.map((item) => item.name).join(", ")}`);
  process.exit(1);
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}
