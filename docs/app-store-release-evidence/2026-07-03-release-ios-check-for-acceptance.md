
> recallo@0.1.0 check:release-ios
> node tools/release-archive-preflight.mjs

# Recallo Release Archive Preflight
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
cwd=/Users/hanmingyu/Downloads/拾贝-prod-hardening
branch=codex/recallo-review-replay-mode
commit=7e56b000b118

PASS workspace_is_official_prod_hardening - /Users/hanmingyu/Downloads/拾贝-prod-hardening
PASS cwd_is_inside_official_worktree - /Users/hanmingyu/Downloads/拾贝-prod-hardening
PASS git_root_matches_repo_root - /Users/hanmingyu/Downloads/拾贝-prod-hardening
PASS branch_is_allowed_for_recallo_release - codex/recallo-review-replay-mode
PASS package_name_is_recallo - recallo
PASS xcode_product_is_recallo_app - path = Recallo.app;
PASS xcode_display_name_is_recallo - INFOPLIST_KEY_CFBundleDisplayName = Recallo;
PASS xcode_product_name_is_recallo - PRODUCT_NAME = Recallo;
PASS xcode_bundle_id_is_production_bundle - PRODUCT_BUNDLE_IDENTIFIER = com.maxhan.shibei;
PASS xcode_app_icon_is_appicon - ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
PASS xcode_release_apns_is_production - APS_ENVIRONMENT = production;
PASS xcode_project_does_not_reference_old_app_product - no old app product reference
PASS release_entry_uses_v2_root - ContentView Release path returns true for V2RootView
PASS release_api_uses_production_url - Release defaultBaseURL is production
PASS app_icon_has_image_files - 3 image entries
PASS no_release_blocking_text:fixture 没有对应页面数据 - not found
PASS no_release_blocking_text:本地 fixture - not found
PASS no_release_blocking_text:JSON decode - not found
PASS no_release_blocking_text:decode path - not found
PASS no_release_blocking_text:无法找到本地页面数据 - not found

# Warnings
WARN review_release_visibility:Railway
拾贝/拾贝/Localizable.xcstrings:943:            "value" : "Railway cloud URL saved"
拾贝/拾贝/Localizable.xcstrings:949:            "value" : "Railway 云端地址已保存"
拾贝/拾贝/Localizable.xcstrings:1045:            "value" : "Enter the Railway cloud API URL"
拾贝/拾贝/Localizable.xcstrings:1051:            "value" : "请填写 Railway 云端 API 地址"
拾贝/拾贝/Localizable.xcstrings:1912:            "value" : "Railway Cloud API"
拾贝/拾贝/Localizable.xcstrings:1918:            "value" : "Railway 云端 API"
WARN review_release_visibility:deviceId
拾贝/拾贝/Services/APIClient.swift:38:    var deviceId: String
拾贝/拾贝/Services/APIClient.swift:44:        deviceId: String = DeviceIdentityStore.shared.currentDeviceId()
拾贝/拾贝/Services/APIClient.swift:49:        self.deviceId = deviceId
拾贝/拾贝/Services/APIClient.swift:269:        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
拾贝/拾贝/Services/APIClient.swift:271:        print("[Recallo] API GET \(url.absoluteString) device=\(deviceId.suffix(6))")
拾贝/拾贝/Services/APIClient.swift:301:        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
拾贝/拾贝/Services/APIClient.swift:303:        print("[Recallo] API \(method) \(url.absoluteString) device=\(deviceId.suffix(6))")
WARN review_release_visibility:ShibeiUseLegacyRoot
拾贝/拾贝/ContentView.swift:34:            && !arguments.contains("-ShibeiUseLegacyRoot")

Release archive preflight passed.
