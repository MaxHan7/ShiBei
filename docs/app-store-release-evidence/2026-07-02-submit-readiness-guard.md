# App Store 最终提交 Readiness Guard 记录

日期：2026-07-02

## 本次完成

新增最终提交前检查：

```bash
npm run check:app-store-submit
```

新增非阻塞报告模式：

```bash
npm run check:app-store-submit:report
```

设计原则：

- 日常开发和普通 `npm run check` 不被用户未提供的信息阻塞。
- 最终提交 App Store 前，严格模式必须通过。
- 如果 Support URL、Privacy URL、支持邮箱、审核决策仍是占位符，严格模式会失败。
- 如果 `docs/app-store-user-decision-form-zh.md` 仍有 `待填写`，严格模式会失败。
- 每个失败项会输出对应的中文下一步动作，减少用户在多份文档之间来回查找。
- 多个同类失败项会合并成一条动作；当前 10 个 blocker 会归并为 4 条实际行动。

## 当前报告结果

已执行：

```bash
node --check tools/app-store-submit-readiness-guard.mjs
npm run check:app-store-submit:report
git diff --check -- tools/app-store-submit-readiness-guard.mjs package.json docs/app-store-archive-submit-runbook-zh.md docs/app-store-user-action-checklist-zh.md docs/app-store-release-readiness-plan-zh.md
```

结果：

- 脚本语法检查通过。
- diff whitespace 检查通过。
- report 模式显示 `NOT READY`，共有 10 个 blocker。

这些 blocker 均符合预期，因为当前仍缺：

- 正式支持邮箱。
- 最终 Privacy Policy URL。
- 最终 Support URL。
- App Store Review 包中的账号/价格/首版策略最终确认。
- 用户手动事项清单中的最终 URL 回写。
- 一页式用户决策表尚未填写。

## 后续使用方式

当用户提供邮箱、URL 和最终决策后：

1. Codex 回写隐私政策、支持页、元数据、审核包和用户事项清单。
2. 运行：

```bash
npm run check:app-store-submit
```

3. 严格模式通过后，才进入 Xcode Archive / App Store Connect 提交。
