
> recallo@0.1.0 app-store:final-gate
> node tools/app-store-final-submission-gate.mjs --report

# Recallo App Store Final Submission Gate
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report

## Summary
- FAIL 用户决策表: missingFields=21
- FAIL 用户行动分组: missingFields=21
- FAIL 截图规格: Screenshot readiness: NOT READY (1 issue)
- FAIL 真机验收: Production acceptance: NOT READY (36 issues)
- PASS 生产健康: Production health: READY
- FAIL 公开页面: Static pages readiness: NOT READY (6 issues)
- PASS 隐私标签: App Store privacy labels readiness: READY
- FAIL 外部控制台确认: External console readiness: NOT READY (26 blockers)
- FAIL 提交材料: App Store submission readiness: NOT READY (10 blockers)
- PASS iOS Release 预检: Release archive preflight passed.

Final submission readiness: NOT READY (7 blockers)

## Required next actions
- 填写最新用户交接包 `docs/app-store-release-evidence/2026-07-04-user-handoff.md` 里的用户回复模板，或直接填写 `docs/app-store-user-decision-form-zh.md`。
- 提供支持邮箱、Privacy Policy URL 和 Support URL；Codex 用 `app-store:apply-contact` 回写并重跑门禁。
- 把至少 1 张符合 Apple 规格的正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；首版仍建议补齐 6 张核心场景。
- 填写真机/TestFlight 验收记录 `docs/app-store-release-evidence/2026-07-04-production-acceptance.md`，补齐设备、build、截图证据、每条路径结果和最终结论。
- 填写已创建的 `.release/app-store-inputs/external-console-checks.json`，按 `docs/app-store-external-console-checklist-zh.md` 回填 Apple Developer / App Store Connect 实际确认值。

## Failed check details

### 用户决策表
## Missing fields
- 首版价格: 待填写
- 首版是否启用 IAP/订阅: 待填写
- 每日真实 AI 生成额度: 待填写
- 推荐好文是否计入额度: 待填写
- 匿名用户是否可直接生成: 待填写
- 首版是否加入可选 Apple 登录: 待填写
- 如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界: 待填写
- 如果首版做 Apple 登录，是否同步做删除账号入口: 待填写
- 支持邮箱: 待填写
- Privacy Policy URL: 待填写
- Support URL: 待填写
- Subtitle: 待填写
- Promotional Text: 待填写
- Category: 待填写
- Secondary Category: 待填写
- Keywords: 待填写
- 是否仍有 P0: 待填写
- 是否仍有未豁免 P1: 待填写
- App Store 截图是否已准备: 待填写
- Archive 中 App 名称/图标是否正确: 待填写
- App Store Connect 是否选择旧 bundle id 对应 App: 待填写
## JSON summary
{
  "ready": false,
  "readyFields": 5,
  "missingFields": [
    {
      "label": "首版价格",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "首版是否启用 IAP/订阅",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "每日真实 AI 生成额度",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "推荐好文是否计入额度",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "匿名用户是否可直接生成",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "首版是否加入可选 Apple 登录",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "如果首版做 Apple 登录，是否同步做删除账号入口",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "支持邮箱",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Privacy Policy URL",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Support URL",
      "value": "待填写",

### 用户行动分组
## User-owned missing items
### 产品与商业化决策
- 首版价格: 待填写
- 首版是否启用 IAP/订阅: 待填写
- 每日真实 AI 生成额度: 待填写
- 推荐好文是否计入额度: 待填写
- 匿名用户是否可直接生成: 待填写
### 账号与数据恢复决策
- 首版是否加入可选 Apple 登录: 待填写
- 如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界: 待填写
- 如果首版做 Apple 登录，是否同步做删除账号入口: 待填写
### 对外联系与 URL
- 支持邮箱: 待填写
- Privacy Policy URL: 待填写
- Support URL: 待填写
### App Store 元数据确认
- Subtitle: 待填写
- Promotional Text: 待填写
- Category: 待填写
- Secondary Category: 待填写
- Keywords: 待填写
### 真机验收与截图
- 是否仍有 P0: 待填写
- 是否仍有未豁免 P1: 待填写
- App Store 截图是否已准备: 待填写
### Xcode / App Store Connect 手动确认
- Archive 中 App 名称/图标是否正确: 待填写
- App Store Connect 是否选择旧 bundle id 对应 App: 待填写
## Codex-owned follow-up after user input
- 运行 `npm run app-store:create-fast-release-inputs` 生成标准决策 JSON 和联系信息 JSON。
- 先 dry-run `app-store:apply-decisions` 和 `app-store:apply-contact`，通过后正式回写隐私政策、支持页、App Store 元数据、审核包和提交 runbook。
- 运行 `npm run check:app-store-submit`、`npm run check:release-ios`、`npm run check`。
- 把验证结果写回 `docs/app-store-release-readiness-plan-zh.md` 和证据目录。
## JSON summary
{
  "ready": false,
  "totalFields": 26,
  "readyFields": 5,
  "missingGroups": [
    {
      "title": "产品与商业化决策",
      "missing": [
        {
          "label": "首版价格",
          "value": "待填写",
          "note": "App Store 价格、审核备注、产品页文案"
        },
        {
          "label": "首版是否启用 IAP/订阅",
          "value": "待填写",
          "note": "App Store 商业化配置、审核复杂度"
        },
        {
          "label": "每日真实 AI 生成额度",
          "value": "待填写",
          "note": "后端额度、App 内提示、隐私政策、审核备注"
        },
        {
          "label": "推荐好文是否计入额度",
          "value": "待填写",
          "note": "新用户体验、额度说明、审核备注"
        },
        {
          "label": "匿名用户是否可直接生成",
          "value": "待填写",
          "note": "首次体验、账号说明、审核备注"
        }
      ]
    },
    {
      "title": "账号与数据恢复决策",
      "missing": [
        {
          "label": "首版是否加入可选 Apple 登录",
          "value": "待填写",
          "note": "账号删除、隐私政策、App Review、前端入口"
        },
        {
          "label": "如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界",
          "value": "待填写",

### 截图规格
Screenshot readiness: NOT READY (1 issue)
- 截图数量必须是 1-10 张，当前为 0 张。

### 真机验收
Production acceptance: NOT READY (36 issues)
- 候选版本信息缺失：iOS build number
- 候选版本信息缺失：验收设备
- 候选版本信息缺失：iOS 版本
- 候选版本信息缺失：验收人
- P1 未通过且未豁免：A1 新用户首次启动 = (empty)
- P1 未通过且未豁免：A2 AI 处理同意 = (empty)
- P0 未通过：A3 真实生成成功 = (empty)
- P0 未通过：A4 后台/锁屏通知 = (empty)
- P0 未通过：A5 生成失败和删除 = (empty)
- P1 未通过且未豁免：A6 推荐好文模拟生成 = (empty)
- P1 未通过且未豁免：A7 主页学习路径 = (empty)
- P0 未通过：A8 复习 cursor 恢复 = (empty)
- P0 未通过：A9 错题回插 = (empty)
- P1 未通过且未豁免：A10 收藏/取消收藏 = (empty)
- P1 未通过且未豁免：A11 通知已读 = (empty)
- P0 未通过：A12 删除章节 = (empty)
- P1 未通过且未豁免：A13 隐私/账号/通知说明 = (empty)
- P0 未通过：A14 删除我的数据 = (empty)
- P0 未通过：A15 切语言稳定性 = (empty)
- P1 未通过且未豁免：A16 发现页内容 = (empty)
- P0 未通过：A17 UI 阻塞文案 = (empty)
- P1 未通过且未豁免：N1 无网络启动 = (empty)
- P0 未通过：N2 生成中断网 = (empty)
- P1 未通过且未豁免：N3 恢复网络 = (empty)
- 截图验收未通过：首页学习路径 = (empty)
- 截图验收未通过：添加文章 = (empty)
- 截图验收未通过：生成中页面 = (empty)
- 截图验收未通过：章节详情 = (empty)
- 截图验收未通过：做题页面 = (empty)
- 截图验收未通过：发现页推荐好文 = (empty)
- 最终结论勾选缺失：没有 P0
- 最终结论勾选缺失：没有未豁免 P1
- 最终结论勾选缺失：隐私政策、App Privacy 标签、审核备注一致
- 最终结论勾选缺失：截图来自正确 Recallo build
- 最终结论勾选缺失：用户已确认支持 URL、隐私 URL、每日额度数字、Apple 登录首版决策
- 最终结论必须明确为：通过

### 公开页面
Static pages readiness: NOT READY (6 issues)
- privacy HTML contains placeholder text
- privacy HTML missing real support email
- support HTML contains placeholder text
- support HTML missing real support email
- privacy markdown contains placeholder text
- support markdown contains placeholder text

### 外部控制台确认
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

### 提交材料
FAIL support_page_has_no_placeholder - docs/support.html must not contain pending support placeholders before App Store submission
FAIL privacy_page_has_no_placeholder - docs/privacy-policy.html must not contain pending privacy/contact placeholders before App Store submission
FAIL support_page_has_email - docs/support.html must include a real support email
FAIL privacy_page_has_email - docs/privacy-policy.html must include a real privacy/support email
FAIL metadata_has_privacy_url - docs/app-store-metadata-zh.md must include the final public HTTPS Privacy Policy URL
FAIL metadata_has_support_url - docs/app-store-metadata-zh.md must include the final public HTTPS Support URL
FAIL metadata_has_no_url_placeholder - docs/app-store-metadata-zh.md must not use local file paths or pending URL placeholders for App Store URL fields
FAIL review_pack_has_no_pending_decisions - docs/app-store-review-submission-pack-zh.md must be finalized before App Store submission
FAIL user_checklist_has_final_urls - docs/app-store-user-action-checklist-zh.md must be updated with final Support/Privacy URLs instead of preparation instructions
FAIL decision_form_is_finalized - docs/app-store-user-decision-form-zh.md must be filled before App Store submission
App Store submission readiness: NOT READY (10 blockers)
# Next required user/Codex actions
1. 提供正式支持/隐私联系邮箱，让 Codex 同步替换支持页和隐私政策里的邮箱占位符。
2. 部署 docs/privacy-policy.html 和 docs/support.html，并提供最终 HTTPS Privacy Policy URL / Support URL。
3. 填写 docs/app-store-user-decision-form-zh.md，确认价格、IAP、Apple 登录、额度、元数据、真机验收和截图状态。
4. 提供最终邮箱、URL 和决策表后，让 Codex 回写所有 App Store 文档并跑严格提交检查。
