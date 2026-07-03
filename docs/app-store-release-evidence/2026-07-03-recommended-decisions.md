# 2026-07-03 App Store 推荐决策稿证据

## 背景

用户希望把 `docs/app-store-release-readiness-plan-zh.md` 设为执行目标，并把必须由用户完成的事项单独列出，其余交给 Codex 自动执行。

## 本次新增

- 新增 `docs/app-store-recommended-decisions-zh.md`。
- 将 26 项用户决策压缩成两个方案：
  - 快速首版方案：免费、不启用 IAP、每日 3 篇真实 AI 生成额度、推荐好文不计入额度、匿名可直接生成、首版暂不做 Apple 登录。
  - 更稳正式版方案：可选 Apple 登录、账号删除、匿名数据绑定和更完整账号验收。
- 增加用户可直接复制回复的模板。
- 明确用户确认后 Codex 自动回写的文档和检查命令。

## 当前状态

该文档不替代最终决策表。用户仍需提供：

- 支持邮箱。
- Privacy Policy URL。
- Support URL。
- 是否采用快速首版方案，或修改其中字段。
- 真机验收是否仍有 P0 / 未豁免 P1。
- App Store 截图是否已准备。
- Xcode Archive 名称、图标、Bundle ID 确认。
- App Store Connect 是否在旧 bundle id 对应 App 下提交。

## 下一步

用户回复 `docs/app-store-recommended-decisions-zh.md` 第 4 节模板后，Codex 按第 5 节自动回写全部上架文档，并运行提交前检查。

