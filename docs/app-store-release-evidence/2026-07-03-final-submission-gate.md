
> recallo@0.1.0 app-store:final-gate
> node tools/app-store-final-submission-gate.mjs --report

# Recallo App Store Final Submission Gate
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report

## Summary
- FAIL 用户决策表: missingFields=22
- FAIL 用户行动分组: missingFields=22
- FAIL 截图规格: Screenshot readiness: NOT READY (7 issues)
- FAIL 真机验收: Production acceptance: NOT READY (1 issue)
- PASS 生产健康: Production health: READY
- FAIL 公开页面: Static pages readiness: NOT READY (6 issues)
- PASS 隐私标签: App Store privacy labels readiness: READY
- FAIL 外部控制台确认: External console readiness: NOT READY (1 blocker)
- FAIL 提交材料: App Store submission readiness: NOT READY (10 blockers)
- PASS iOS Release 预检: Release archive preflight passed.

Final submission readiness: NOT READY (7 blockers)

## Required next actions
- 填写 `docs/app-store-release-evidence/2026-07-03-user-handoff.md` 里的用户回复模板，或直接填写 `docs/app-store-user-decision-form-zh.md`。
- 提供支持邮箱、Privacy Policy URL 和 Support URL；Codex 用 `app-store:apply-contact` 回写并重跑门禁。
- 把 6 张正式 App Store 截图放入 `docs/app-store-release-evidence/screenshots/app-store/`。
- 完成真机/TestFlight 验收记录，或运行 `npm run app-store:create-acceptance` 生成记录后填写。
- 按 `docs/app-store-external-console-checklist-zh.md` 填写 `.release/app-store-inputs/external-console-checks.json`。

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

### 截图规格
Screenshot readiness: NOT READY (7 issues)
- 截图数量必须是 1-10 张，当前为 0 张。
- 缺少建议截图文件：01-home-learning-path.*
- 缺少建议截图文件：02-add-article.*
- 缺少建议截图文件：03-generating.*
- 缺少建议截图文件：04-chapter-detail.*
- 缺少建议截图文件：05-question-card.*
- 缺少建议截图文件：06-discover-recommendations.*

### 真机验收
Production acceptance: NOT READY (1 issue)
- No production acceptance record found. Copy docs/app-store-release-evidence/production-acceptance-template.md to YYYY-MM-DD-production-acceptance.md and fill it.

### 公开页面
Static pages readiness: NOT READY (6 issues)
- privacy HTML contains placeholder text
- privacy HTML missing real support email
- support HTML contains placeholder text
- support HTML missing real support email
- privacy markdown contains placeholder text
- support markdown contains placeholder text

### 外部控制台确认
FAIL external_console_input_exists - Missing .release/app-store-inputs/external-console-checks.json
External console readiness: NOT READY (1 blocker)
## Required user actions
1. 复制 docs/app-store-external-console-checks.example.json 到 .release/app-store-inputs/external-console-checks.json，并填写 Apple Developer / App Store Connect 实际确认结果。

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
