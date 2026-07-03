
> recallo@0.1.0 app-store:status
> node tools/app-store-status.mjs

# Recallo App Store Release Status
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening

## Summary
- BLOCKED 用户决策表: totalFields=26, missingFields=22
- BLOCKED 用户行动分组: totalFields=26, missingFields=22
- BLOCKED 截图规格报告: Screenshot readiness: NOT READY (7 issues)
- BLOCKED 真机验收报告: Production acceptance: NOT READY (1 issue)
- PASS 生产健康报告: Production health: READY
- BLOCKED 公开页面报告: Static pages readiness: NOT READY (6 issues)
- PASS 隐私标签报告: App Store privacy labels readiness: READY
- BLOCKED 外部控制台确认: External console readiness: NOT READY (1 blocker)
- BLOCKED 提交 readiness 报告: App Store submission readiness: NOT READY (10 blockers)
- PASS iOS Release 预检: Release archive preflight passed.

Overall status: NOT READY (7 blocking areas)

## Next action
- 运行 `npm run app-store:create-user-handoff -- --force` 刷新用户交接包，作为当前唯一用户待办入口。
- 用户按交接包模板补齐价格、额度、Apple 登录、邮箱、URL、元数据、截图和验收状态；Codex 随后运行 `npm run app-store:ingest-user-reply -- --input <reply-file> --acceptance-record <acceptance-file>` 做 dry-run，确认后加 `--apply` 回写。
- 用户提供正式支持邮箱、Privacy Policy URL、Support URL；Codex 用 `npm run app-store:apply-contact -- <contact-json> --dry-run` 验证并回写公开页面和提交包。
- 用户把 6 张正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`；Codex 运行 `npm run check:app-store-screenshots`。
- 用户完成真机/TestFlight 核心路径验收；Codex 运行 `npm run app-store:create-acceptance` 生成记录，并用 `npm run check:app-store-acceptance -- <record>` 做严格检查。
- 用户按 `docs/app-store-external-console-checklist-zh.md` 填写 `.release/app-store-inputs/external-console-checks.json`；Codex 运行 `npm run check:app-store-external-console`。
- 所有用户输入回写后，Codex 跑 `npm run app-store:status`、`npm run check:app-store-submit`、`npm run check:release-ios`、`npm run check`；全部通过后用户再 Archive / Upload。

## Details

### 用户决策表
# Recallo App Store Decision Form Report
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
source=docs/app-store-user-decision-form-zh.md
totalFields=26
readyFields=4
missingFields=22

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
- 真机验收记录文件: 待填写
- 是否仍有 P0: 待填写
- 是否仍有未豁免 P1: 待填写
- App Store 截图是否已准备: 待填写
- Archive 中 App 名称/图标是否正确: 待填写
- App Store Connect 是否选择旧 bundle id 对应 App: 待填写

## JSON summary
{
  "ready": false,
  "readyFields": 4,
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
      "ready": false
    },
    {
      "label": "Subtitle",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Promotional Text",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Category",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Secondary Category",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Keywords",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "真机验收记录文件",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "是否仍有 P0",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "是否仍有未豁免 P1",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "App Store 截图是否已准备",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "Archive 中 App 名称/图标是否正确",
      "value": "待填写",
      "ready": false
    },
    {
      "label": "App Store Connect 是否选择旧 bundle id 对应 App",
      "value": "待填写",
      "ready": false
    }
  ]
}

### 用户行动分组
# Recallo App Store User Action Report
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
source=docs/app-store-user-decision-form-zh.md
totalFields=26
readyFields=4
missingFields=22

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
- 真机验收记录文件: 待填写
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
  "readyFields": 4,
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
          "note": "隐私政策、账号说明、审核备注"
        },
        {
          "label": "如果首版做 Apple 登录，是否同步做删除账号入口",
          "value": "待填写",
          "note": "Apple 审核硬要求、后端删除接口、前端入口"
        }
      ]
    },
    {
      "title": "对外联系与 URL",
      "missing": [
        {
          "label": "支持邮箱",
          "value": "待填写",
          "note": "例如 `support@example.com`"
        },
        {
          "label": "Privacy Policy URL",
          "value": "待填写",
          "note": "必须 HTTPS、公开可访问"
        },
        {
          "label": "Support URL",
          "value": "待填写",
          "note": "必须 HTTPS、公开可访问"
        }
      ]
    },
    {
      "title": "App Store 元数据确认",
      "missing": [
        {
          "label": "Subtitle",
          "value": "待填写",
          "note": ""
        },
        {
          "label": "Promotional Text",
          "value": "待填写",
          "note": ""
        },
        {
          "label": "Category",
          "value": "待填写",
          "note": ""
        },
        {
          "label": "Secondary Category",
          "value": "待填写",
          "note": ""
        },
        {
          "label": "Keywords",
          "value": "待填写",
          "note": ""
        }
      ]
    },
    {
      "title": "真机验收与截图",
      "missing": [
        {
          "label": "真机验收记录文件",
          "value": "待填写",
          "note": "复制 `docs/app-store-release-evidence/production-acceptance-template.md` 后填写"
        },
        {
          "label": "是否仍有 P0",
          "value": "待填写",
          "note": "有 P0 时不能 Archive"
        },
        {
          "label": "是否仍有未豁免 P1",
          "value": "待填写",
          "note": "有未豁免 P1 时不能 Archive"
        },
        {
          "label": "App Store 截图是否已准备",
          "value": "待填写",
          "note": "按 `docs/app-store-release-evidence/screenshots-checklist.md`"
        }
      ]
    },
    {
      "title": "Xcode / App Store Connect 手动确认",
      "missing": [
        {
          "label": "Archive 中 App 名称/图标是否正确",
          "value": "待填写",
          "note": "旧名称或旧图标时立即停止"
        },
        {
          "label": "App Store Connect 是否选择旧 bundle id 对应 App",
          "value": "待填写",
          "note": "不要创建新 App"
        }
      ]
    }
  ]
}

### 截图规格报告
# Recallo App Store Screenshot Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
source=docs/app-store-release-evidence/screenshots/app-store
count=0
acceptedIPhone69PortraitSizes=1260x2736,1290x2796,1320x2868

Screenshot readiness: NOT READY (7 issues)
- 截图数量必须是 1-10 张，当前为 0 张。
- 缺少建议截图文件：01-home-learning-path.*
- 缺少建议截图文件：02-add-article.*
- 缺少建议截图文件：03-generating.*
- 缺少建议截图文件：04-chapter-detail.*
- 缺少建议截图文件：05-question-card.*
- 缺少建议截图文件：06-discover-recommendations.*

### 真机验收报告
# Recallo App Store Production Acceptance Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
source=(none)

Production acceptance: NOT READY (1 issue)
- No production acceptance record found. Copy docs/app-store-release-evidence/production-acceptance-template.md to YYYY-MM-DD-production-acceptance.md and fill it.

### 生产健康报告
# Recallo App Store Production Health Audit
mode=report
url=https://shibei-production.up.railway.app/api/health
httpStatus=200
contentType=application/json; charset=utf-8
ok=true
service=recallo-api
nodeEnv=production
railwayEnvironment=production
railwayDeploymentId=51ae3233-4431-471e-9194-a80b5b09a900
storage=postgres
databaseOk=true
queueQueued=0
queueRunning=0
queueFailed=0
apnsConfigured=true
apnsEnvironment=production
recommendedCatalogArticleCount=9
recommendedCatalogFilters=全部,AI,产品,学习,商业

Production health: READY

### 公开页面报告
# Recallo App Store Static Pages Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
checked=docs/privacy-policy.html
checked=docs/support.html
checked=docs/privacy-policy-zh.md
checked=docs/support-zh.md

Static pages readiness: NOT READY (6 issues)
- privacy HTML contains placeholder text
- privacy HTML missing real support email
- support HTML contains placeholder text
- support HTML missing real support email
- privacy markdown contains placeholder text
- support markdown contains placeholder text

### 隐私标签报告
# Recallo App Store Privacy Labels Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
checked=docs/app-store-privacy-labels.json
checked=docs/app-store-privacy-labels-zh.md
checked=docs/privacy-policy-zh.md
checked=docs/privacy-policy.html
checked=docs/app-store-review-submission-pack-zh.md
checked=docs/app-store-metadata-zh.md

App Store privacy labels readiness: READY

### 外部控制台确认
# Recallo App Store External Console Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
input=.release/app-store-inputs/external-console-checks.json
FAIL external_console_input_exists - Missing .release/app-store-inputs/external-console-checks.json

External console readiness: NOT READY (1 blocker)

## Required user actions
1. 复制 docs/app-store-external-console-checks.example.json 到 .release/app-store-inputs/external-console-checks.json，并填写 Apple Developer / App Store Connect 实际确认结果。

### 提交 readiness 报告
# Recallo App Store Submit Readiness Guard
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
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

### iOS Release 预检
# Recallo Release Archive Preflight
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
cwd=/Users/hanmingyu/Downloads/拾贝-prod-hardening
branch=codex/recallo-review-replay-mode
commit=55260eece486

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
