
> recallo@0.1.0 app-store:external-console-audit
> node tools/app-store-external-console-audit.mjs --report

# Recallo App Store External Console Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
input=.release/app-store-inputs/external-console-checks.json
FAIL apple_developer_team_name - Apple Developer teamName 必须填写后台看到的 team 名称。
FAIL apple_developer_bundle_id - Apple Developer App ID 必须是 com.maxhan.shibei。
FAIL apple_developer_existing_bundle - 必须确认使用现有 com.maxhan.shibei App ID。
FAIL apple_developer_push_enabled - Apple Developer App ID 必须开启 Push Notifications capability。
FAIL apple_developer_apns_production - 必须确认 production APNs key/certificate 与 Railway 生产环境一致。
FAIL apple_developer_sign_in_with_apple_decision - signInWithAppleDecision 必须是 enabled 或 disabled-first-release。
FAIL apple_developer_sign_in_with_apple_capability_matches - Sign in with Apple capability 必须和首版决策一致。
FAIL asc_existing_app_record - App Store Connect 必须使用旧 TestFlight 对应的现有 App 记录。
FAIL asc_bundle_id - App Store Connect bundle id 必须是 com.maxhan.shibei。
FAIL asc_app_name - App Store Connect App Name 必须是 Recallo。
FAIL asc_sku - App Store Connect SKU 必须记录。
FAIL asc_primary_category - Primary Category 必须填写最终分类。
FAIL asc_pricing_free - 首版 Pricing 必须确认免费，填 free。
FAIL asc_no_iap_or_subscriptions - 首版不应启用 IAP/订阅。
FAIL asc_privacy_policy_url - Privacy Policy URL 必须是公开 HTTPS URL。
FAIL asc_support_url - Support URL 必须是公开 HTTPS URL。
FAIL asc_privacy_labels_completed - App Privacy 标签必须按 docs/app-store-privacy-labels-zh.md 填完。
FAIL asc_age_rating_completed - 年龄分级问卷必须完成。
FAIL asc_screenshots_uploaded - App Store 截图必须上传并确认无旧品牌/旧 UI。
FAIL asc_latest_recallo_build_selected - App Store Connect 必须选择最新 Recallo build。
FAIL asc_review_notes_pasted - App Review Notes 必须粘贴最新审核说明。
FAIL archive_app_name - Xcode Organizer archive app name 必须是 Recallo。
FAIL archive_bundle_id - Xcode Organizer archive bundle id 必须是 com.maxhan.shibei。
FAIL archive_icon_recallo - Archive 图标必须是新版 Recallo 图标。
FAIL archive_no_old_brand_visible - 最终提交包和截图中不得出现旧“拾贝/ShiBei”品牌可见文案。
FAIL ready_to_submit_for_review - 提交审核前必须由用户最终确认 readyToSubmitForReview=true。

External console readiness: NOT READY (26 blockers)

## Required user actions
1. 填写 apple_developer_team_name。
2. 把 apple_developer_bundle_id 改为 com.maxhan.shibei，或回到 Apple 后台确认是否打开了错误 App/错误工程。
3. 在 Apple 后台完成/确认后，把 apple_developer_existing_bundle 填为 true。
4. 在 Apple 后台完成/确认后，把 apple_developer_push_enabled 填为 true。
5. 在 Apple 后台完成/确认后，把 apple_developer_apns_production 填为 true。
6. 把 apple_developer_sign_in_with_apple_decision 填为 enabled 或 disabled-first-release。
7. 在 Apple 后台完成/确认后，把 apple_developer_sign_in_with_apple_capability_matches 填为 true。
8. 在 Apple 后台完成/确认后，把 asc_existing_app_record 填为 true。
9. 把 asc_bundle_id 改为 com.maxhan.shibei，或回到 Apple 后台确认是否打开了错误 App/错误工程。
10. 把 asc_app_name 改为 Recallo，或回到 Apple 后台确认是否打开了错误 App/错误工程。
11. 填写 asc_sku。
12. 填写 asc_primary_category。
13. 把 asc_pricing_free 改为 free，或回到 Apple 后台确认是否打开了错误 App/错误工程。
14. 确认首版未启用该项后，把 asc_no_iap_or_subscriptions 填为 false。
15. 提供公开 HTTPS URL 并填入 asc_privacy_policy_url。
16. 提供公开 HTTPS URL 并填入 asc_support_url。
17. 在 Apple 后台完成/确认后，把 asc_privacy_labels_completed 填为 true。
18. 在 Apple 后台完成/确认后，把 asc_age_rating_completed 填为 true。
19. 在 Apple 后台完成/确认后，把 asc_screenshots_uploaded 填为 true。
20. 在 Apple 后台完成/确认后，把 asc_latest_recallo_build_selected 填为 true。
21. 在 Apple 后台完成/确认后，把 asc_review_notes_pasted 填为 true。
22. 把 archive_app_name 改为 Recallo，或回到 Apple 后台确认是否打开了错误 App/错误工程。
23. 把 archive_bundle_id 改为 com.maxhan.shibei，或回到 Apple 后台确认是否打开了错误 App/错误工程。
24. 在 Apple 后台完成/确认后，把 archive_icon_recallo 填为 true。
25. 在 Apple 后台完成/确认后，把 archive_no_old_brand_visible 填为 true。
26. 在 Apple 后台完成/确认后，把 ready_to_submit_for_review 填为 true。
