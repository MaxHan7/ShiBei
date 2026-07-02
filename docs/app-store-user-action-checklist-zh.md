# Recallo App Store 上架用户手动事项清单

> 本文档只列必须由用户手动完成或拍板的事项。Codex 可自动执行的工程、文档、检查和记录工作不放在这里，避免混淆。

最短操作方式：直接填写 `docs/app-store-user-decision-form-zh.md`。Codex 会根据该表把本清单、隐私政策、支持页、App Store 元数据和审核包同步收口。

## 1. 必须拍板的产品决策

| 决策 | 当前推荐 | 你需要确认什么 | 不确认的影响 |
| --- | --- | --- | --- |
| 首版是否免费 | 免费 | 确认首版免费，不启用 IAP/订阅 | App Store 元数据和审核备注无法最终定稿 |
| 每日真实 AI 生成额度 | 每天 3 篇，按 UTC day | 确认数字是否就是 3 | 隐私/额度/用户提示无法最终锁定 |
| 推荐好文是否计入额度 | 不计入 | 确认推荐好文预生成导入不消耗用户额度 | 新用户体验路径和额度规则无法最终锁定 |
| 首版是否加入 Apple 登录 | 推荐可选加入；若赶时间可匿名首版 | 二选一：首版做可选 Apple 登录，或首版暂不做并接受匿名数据恢复弱 | 若做 Apple 登录，必须新增账号删除闭环；若不做，必须明确重装/换机可能无法恢复 |
| 是否强制登录后生成 | 不强制 | 确认匿名用户也可生成 | 若强制登录，会改变首屏体验和审核说明 |

## 2. 必须提供的外部信息

| 信息 | 用途 | 你需要给 Codex 什么 |
| --- | --- | --- |
| Support URL | App Store Connect 必填/强建议，用于用户支持 | `docs/support.html` 已准备；你需要提供公开托管后的 URL |
| Privacy URL | App Store Connect 隐私政策 URL | `docs/privacy-policy.html` 已准备；你需要提供公开托管后的 URL |
| 支持邮箱 | 隐私政策和用户支持 | 一个对外邮箱，例如 `support@...` |
| App Store Connect App 状态 | 确认是否在旧 `com.maxhan.shibei` App 下提交 | 截图或口头确认当前 App 页面和 bundle id |
| 最终截图文件 | 产品页截图上传 | 按 `docs/app-store-release-evidence/screenshots-checklist.md` 准备的 6 张截图 |

## 3. 你需要在真机上执行的验收

复制模板：

```bash
cp docs/app-store-release-evidence/production-acceptance-template.md \
  docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md
```

然后在真机/TestFlight 上完成这些核心路径：

- 新用户首次启动。
- 首次真实生成前 AI 处理说明。
- 真实生成成功。
- 后台/锁屏生成通知。
- 生成失败和删除。
- 推荐好文模拟生成。
- 主页学习路径不被未开始学习的新章节抢占。
- 从题目/解释/单元总结退出后继续学习，回到正确位置。
- 错题回插到当前 unit 内，并以未作答状态再次出现。
- 收藏/取消收藏，重启后状态保留。
- 通知已读后红点和数量正确消失。
- 删除章节不会误删其他章节。
- 删除我的数据只删除当前匿名设备数据。
- 切语言后当前数据不丢。
- 发现页推荐好文封面、filter、文章数量正常。
- 核心路径不出现 `fixture`、`Railway`、`JSON decode`、旧“拾贝”等可见调试/旧品牌文案。

验收规则：

- 有 P0：不能 Archive / 提交审核。
- 有未豁免 P1：不能 Archive / 提交审核。
- 只有 P2：可以记录后进入后续版本。

## 4. 你需要在 Xcode 手动完成的操作

必须打开：

```text
/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj
```

不要打开：

```text
/Users/hanmingyu/Downloads/拾贝
/Users/hanmingyu/Downloads/拾贝-v2-baseline
/Users/hanmingyu/Downloads/拾贝-prod-hardening 以外的旧工程
```

Archive 前确认：

- Scheme 是 `Recallo`。
- Destination 是 `Any iOS Device (arm64)`。
- Display Name 是 `Recallo`。
- Bundle ID 是 `com.maxhan.shibei`。
- App Icon 是新 Recallo 图标。
- Push Notifications capability 开启。

Archive 后确认：

- Organizer 里显示 App 名称 `Recallo`。
- 图标是新图标。
- Version / Build number 正确。
- 签名 team/profile 正确。

如果 Archive 里还是旧名称或旧图标，立即停止。

## 5. 你需要在 App Store Connect 手动完成的操作

进入旧 TestFlight 对应的现有 App，确认 bundle id 是：

```text
com.maxhan.shibei
```

然后完成：

- 选择新上传的 build。
- 填 App Name、Subtitle、Promotional Text、Description、Keywords。
- 填 Support URL。
- 填 Privacy URL。
- 填 App Privacy 标签。
- 填年龄分级。
- 上传 6 张截图。
- 粘贴 Review Notes。
- 提交审核。

填写材料来源：

- `docs/app-store-metadata-zh.md`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-release-evidence/screenshots-checklist.md`
- `docs/app-store-archive-submit-runbook-zh.md`
- `docs/app-store-url-publishing-guide-zh.md`

## 6. Codex 可以继续自动做的事

在你完成或提供上述信息后，Codex 可以继续自动执行：

- 把你的决策回写到 `docs/app-store-release-readiness-plan-zh.md`。
- 把最终 Support URL / Privacy URL 和支持邮箱写入隐私政策、支持页、元数据和提交包。
- 跑 `npm run check:app-store-submit:report` 查看下一步动作；最终提交前跑 `npm run check:app-store-submit`，确保没有邮箱、URL 或审核决策占位符。
- 根据你提供的截图/录屏更新验收记录。
- 跑 `npm run check:release-ios`、`npm run check`、Release build 和 production health。
- 陪跑 Archive 前检查。
- 根据 App Store Connect 的拒审或警告更新文档和修复代码。

## 7. 当前最短路径

1. 你填写 `docs/app-store-user-decision-form-zh.md`。
2. 你按 `docs/app-store-url-publishing-guide-zh.md` 部署 `docs/privacy-policy.html` 和 `docs/support.html`，并提供最终 URL 和支持邮箱。
3. Codex 根据决策表回写所有上架文档，并跑 `npm run check:app-store-submit`。
4. 你按模板跑真机验收。
5. 没有 P0/P1 后，按 Archive runbook 上传。
