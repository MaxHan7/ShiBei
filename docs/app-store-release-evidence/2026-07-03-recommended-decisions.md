# 2026-07-03 App Store 推荐决策稿证据

## 背景

用户希望把 `docs/app-store-release-readiness-plan-zh.md` 设为执行目标，并把必须由用户完成的事项单独列出，其余交给 Codex 自动执行。

## 本次新增

- 新增 `docs/app-store-recommended-decisions-zh.md`。
- 新增 `docs/app-store-user-decision-values.example.json`，作为用户最终回复的机器可读输入结构。
- 新增 `npm run app-store:apply-decisions -- <决策 JSON 文件>`，用于校验并回写 `docs/app-store-user-decision-form-zh.md`。
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

## 验证记录

已验证：

```bash
node --check tools/app-store-apply-user-decisions.mjs
```

结果：通过。

已验证占位符输入会被拒绝：

```bash
npm run app-store:apply-decisions -- docs/app-store-user-decision-values.example.json --dry-run
```

结果：失败，正确指出支持邮箱、Privacy Policy URL、Support URL、真机验收、截图和 Archive/App Store Connect 确认仍是占位符。

已验证完整临时 JSON 可通过 dry-run：

```bash
node -e '<生成完整决策 JSON>' | npm run app-store:apply-decisions -- - --dry-run
```

结果：通过，输出 `Dry run passed. Decision form would be updated.`。

## 下一步

用户回复 `docs/app-store-recommended-decisions-zh.md` 第 4 节模板后，Codex 按第 5 节自动回写全部上架文档，并运行提交前检查。
