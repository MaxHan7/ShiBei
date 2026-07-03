
> recallo@0.1.0 app-store:user-actions
> node tools/app-store-user-action-report.mjs

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
