# 2026-07-02 用户手动事项与 Release Preflight 记录

## 范围

本记录对应 App Store 上架准备 goal 的一次收口检查：

- 把必须由用户手动完成/拍板的事项单独整理成清单。
- 验证当前官方工作区仍能通过 release archive preflight。
- 不处理历史遗留的 `Localizable.xcstrings` 修改、`.release/` 输出和 quality-runs 实验目录。

## 新增文档

- `docs/app-store-user-action-checklist-zh.md`

该文档单独列出：

- 产品决策：免费首版、每日额度、推荐好文计额、Apple 登录、是否强制登录。
- 外部信息：Support URL、Privacy URL、支持邮箱、App Store Connect App 状态、截图文件。
- 真机验收：新用户、AI 同意、真实生成、通知、失败删除、推荐好文、进度恢复、错题回插、收藏、通知已读、数据删除、切语言、发现页、调试文案。
- Xcode 手动操作：官方工程、scheme、destination、display name、bundle id、图标、Archive。
- App Store Connect 手动操作：选择 build、填写元数据、隐私标签、年龄分级、截图、Review Notes、提交审核。
- Codex 后续可自动执行的事项。

## 文档自检

```text
PASS 首版是否加入 Apple 登录
PASS Support URL
PASS Privacy URL
PASS 真机
PASS Xcode
PASS App Store Connect
PASS Codex 可以继续自动做
```

`git diff --check` 通过：

```bash
git diff --check -- docs/app-store-user-action-checklist-zh.md docs/app-store-release-readiness-plan-zh.md
```

## Release preflight

命令：

```bash
npm run check:release-ios
```

结果：通过。

关键通过项：

- 官方工作区：`/Users/hanmingyu/Downloads/拾贝-prod-hardening`
- branch：`codex/recallo-review-replay-mode`
- package name：`recallo`
- Xcode product：`Recallo.app`
- display name：`Recallo`
- product name：`Recallo`
- bundle id：`com.maxhan.shibei`
- AppIcon：`AppIcon`
- Release APNs：`production`
- Release path：`V2RootView`
- Release API：production URL
- 无阻塞文案：
  - `fixture 没有对应页面数据`
  - `本地 fixture`
  - `JSON decode`
  - `decode path`
  - `无法找到本地页面数据`

非阻塞 warning：

- `Localizable.xcstrings` 中仍有 Railway debug 文案。
- `APIClient.swift` 中存在代码符号 `deviceId` 和 DEBUG print。
- `ContentView.swift` 中仍兼容旧 debug 参数 `ShibeiUseLegacyRoot`。

这些 warning 在当前 preflight 中不是失败条件，但提交 App Store 前仍建议结合 Release 包真机检查确认它们不会对用户可见。

## 结论

Codex 可自动完成的上架准备文档、决策包、隐私包、元数据包、验收模板、Archive runbook 已基本到位。

继续进入 Archive / App Store Connect 前仍需用户完成：

1. 确认 Apple 登录首版决策。
2. 确认每日额度数字和推荐好文不计额。
3. 提供 Support URL、Privacy URL、支持邮箱。
4. 按生产验收模板跑真机验收。
5. 按截图清单准备 App Store 截图。

