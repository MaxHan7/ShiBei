# 2026-07-03 App Store 真机验收门禁证据

## 背景

App Store / TestFlight Archive 前必须确认真机验收没有 P0，也没有未豁免 P1。原模板依赖人工阅读，容易遗漏，因此新增可执行门禁脚本。

## 本次新增

- `tools/app-store-acceptance-audit.mjs`
- `npm run app-store:acceptance-audit -- <验收记录文件>`
- `npm run check:app-store-acceptance -- <验收记录文件>`
- `npm run app-store:status` 已纳入真机验收报告。

## 门禁规则

脚本会检查：

- 候选版本信息已填写。
- 自动检查项结果为 `PASS` / `通过` / `OK`。
- 所有 P0 场景必须通过。
- P1 场景必须通过，或结果中明确写有“豁免”。
- 截图验收必须通过。
- 最终结论区必须勾选：
  - 没有 P0。
  - 没有未豁免 P1。
  - 隐私政策、App Privacy 标签、审核备注一致。
  - 截图来自正确 Recallo build。
  - 用户已确认支持 URL、隐私 URL、每日额度数字、Apple 登录首版决策。
- 最终结论必须明确为 `通过`。

## 验证记录

语法检查：

```bash
node --check tools/app-store-acceptance-audit.mjs
```

结果：通过。

空模板 report：

```bash
npm run app-store:acceptance-audit -- docs/app-store-release-evidence/production-acceptance-template.md
```

结果：正确输出 NOT READY，并列出候选版本信息、自动检查、P0/P1、截图和最终结论缺失项。

临时完整验收记录 strict：

```bash
npm run check:app-store-acceptance -- /tmp/recallo-production-acceptance-pass.md
```

结果：通过，输出 `Production acceptance: READY`。

总状态：

```bash
npm run app-store:status
```

预期：在用户未提供真实验收记录前，真机验收报告应作为阻塞项显示。

iOS Release 预检：

```bash
npm run check:release-ios
```

结果：通过。确认当前工作区为 `/Users/hanmingyu/Downloads/拾贝-prod-hardening`，Release 使用 V2 root、生产 API、生产 bundle id `com.maxhan.shibei`、生产 APNS，并且未发现 release 阻塞文案。

全量检查：

```bash
npm run check
```

结果：通过。后端/状态机测试 204 项全部通过，workspace guard、iOS production guard、V2 UI regression guard 通过。

## 下一步

用户完成真机验收后，Codex 用 report 模式定位缺口；只有严格模式通过，才进入 Archive / App Store Connect 提交。
