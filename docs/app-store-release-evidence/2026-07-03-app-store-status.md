# App Store 状态总览工具记录

日期：2026-07-03

## 本次完成

新增聚合状态命令：

```bash
npm run app-store:status
```

用途：

- 聚合用户决策表报告。
- 聚合用户行动分组报告。
- 聚合 App Store 截图规格报告。
- 聚合提交 readiness report。
- 聚合 iOS Release preflight。

该命令只读，不修改任何文件。它用于日常查看当前是否接近可提交状态；最终提交前仍需分别运行严格门禁：

```bash
npm run check:app-store-submit
npm run check:app-store-screenshots
npm run check:release-ios
npm run check
```

## 当前状态

当前仍为 `NOT READY`，原因是：

- 用户决策表尚未填写完成。
- 支持邮箱、Privacy Policy URL、Support URL 尚未提供。
- App Store 元数据最终字段尚未确认。
- 真机验收、截图和 Archive/App Store Connect 手动确认尚未完成。
- 截图目录尚未放入 6 张正式截图。

这符合当前上架阶段预期：Codex 可自动化部分继续收口，用户侧决策和账号侧操作仍需要用户完成。
