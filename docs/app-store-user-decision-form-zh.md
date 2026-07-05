# Recallo App Store 首版用户决策表

> 这是一页式决策表。用户只需要在这里填最终选择；Codex 根据本表回写隐私政策、App Store 元数据、审核包、支持页、提交 runbook 和 readiness guard。

## 1. 产品与商业化决策

| 决策项 | 推荐选择 | 最终选择 | 影响范围 |
| --- | --- | --- | --- |
| 首版价格 | 免费 | 免费 | App Store 价格、审核备注、产品页文案 |
| 首版是否启用 IAP/订阅 | 不启用 | 不启用 | App Store 商业化配置、审核复杂度 |
| 每日真实 AI 生成额度 | 每天 5 篇，按 UTC day | 每天 5 篇，按 UTC day | 后端额度、App 内提示、隐私政策、审核备注 |
| 推荐好文是否计入额度 | 不计入 | 不计入额度 | 新用户体验、额度说明、审核备注 |
| 匿名用户是否可直接生成 | 可以，不强制登录 | 可以，不强制登录；首版保留匿名可用并强引导绑定 Apple 账号 | 首次体验、账号说明、审核备注 |

## 2. 账号与数据恢复决策

| 决策项 | 推荐选择 | 最终选择 | 影响范围 |
| --- | --- | --- | --- |
| 首版是否加入可选 Apple 登录 | 加入可选 Apple 登录 | 加入可选 Apple 登录 | 账号删除、隐私政策、App Review、前端入口 |
| 如果首版暂不做 Apple 登录，是否接受匿名数据恢复边界 | 不适用：首版做 Apple 登录；匿名模式仍需说明恢复边界 | 不适用：首版做 Apple 登录；匿名模式仍需说明恢复边界 | 隐私政策、账号说明、审核备注 |
| 如果首版做 Apple 登录，是否同步做删除账号入口 | 必须做 | 同步做删除账号入口 | Apple 审核硬要求、后端删除接口、前端入口 |

## 3. 对外联系与 URL

| 信息 | 最终值 | 备注 |
| --- | --- | --- |
| 支持邮箱 | mingyuhan0814@gmail.com | 例如 `support@example.com` |
| Privacy Policy URL | https://shibei-production.up.railway.app/privacy | 必须 HTTPS、公开可访问 |
| Support URL | https://shibei-production.up.railway.app/support | 必须 HTTPS、公开可访问 |

## 4. App Store 元数据确认

| 字段 | 当前草案 | 最终选择 |
| --- | --- | --- |
| App Name | Recallo | Recallo |
| Subtitle | 把文章变成练习题 | 把文章变成练习题 |
| Promotional Text | 把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。 | 把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。 |
| Category | Education | Education |
| Secondary Category | Productivity | Productivity |
| Keywords | 见 `docs/app-store-metadata-zh.md` | 学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习 |

## 5. 真机验收与截图

| 项目 | 最终状态 | 备注 |
| --- | --- | --- |
| 真机验收记录文件 | docs/app-store-release-evidence/2026-07-04-production-acceptance.md | Codex 已创建当天验收记录草稿；用户只需补真机/TestFlight 结果 |
| 是否仍有 P0 | 未确认 | 有 P0 时不能 Archive |
| 是否仍有未豁免 P1 | 未确认 | 有未豁免 P1 时不能 Archive |
| App Store 截图是否已准备 | 未准备 | 按 `docs/app-store-release-evidence/screenshots-checklist.md` |

## 6. Xcode / App Store Connect 手动确认

| 项目 | 最终状态 | 备注 |
| --- | --- | --- |
| Xcode 工程路径 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj` | 不要使用旧工程 |
| Scheme | Recallo | Archive 前确认 |
| Bundle ID | `com.maxhan.shibei` | 用于替换旧 TestFlight 产品并复用推送能力 |
| Archive 中 App 名称/图标是否正确 | 未确认：需要在 Xcode Organizer 最终核对名称 Recallo、图标新版、Bundle ID com.maxhan.shibei | 旧名称或旧图标时立即停止 |
| App Store Connect 是否选择旧 bundle id 对应 App | 使用旧 bundle id 对应 App：com.maxhan.shibei | 不要创建新 App |

## 7. Codex 回写规则

用户填完本表后，Codex 需要同步更新：

- `docs/app-store-release-readiness-plan-zh.md`
- `docs/app-store-user-action-checklist-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-metadata-zh.md`
- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/support-zh.md`
- `docs/support.html`
- `docs/app-store-archive-submit-runbook-zh.md`

然后运行：

```bash
npm run app-store:decision-report
npm run check:app-store-submit
npm run check:release-ios
npm run check
```

只有全部通过，且真机验收没有 P0/未豁免 P1，才进入 Archive。
