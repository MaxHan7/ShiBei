# 2026-07-03 App Store 验收记录生成器证据

## 背景

真机验收记录需要包含当前 commit、branch、Railway deployment id、production URL、数据策略和自动检查结果。手工复制模板容易填错，也容易把旧工作区或旧部署写进记录。因此新增验收记录生成器，让机器填固定事实，用户只填写真实真机测试结论。

## 本次新增

- `tools/app-store-create-acceptance-record.mjs`
- `npm run app-store:create-acceptance`

## 用法

Dry-run：

```bash
npm run app-store:create-acceptance -- --dry-run
```

创建当天记录：

```bash
npm run app-store:create-acceptance
```

指定日期或路径：

```bash
npm run app-store:create-acceptance -- --date 2026-07-03
npm run app-store:create-acceptance -- --output docs/app-store-release-evidence/2026-07-03-production-acceptance.md
```

生成后检查：

```bash
npm run app-store:acceptance-audit -- docs/app-store-release-evidence/YYYY-MM-DD-production-acceptance.md
```

## 自动填入内容

脚本会自动填入：

- 日期。
- Git commit。
- Branch。
- Production URL。
- Railway deployment id。
- 数据策略：默认 `preserve-data`。
- Production health 当前检查结果。
- `/api/health` 当前 deployment id。
- 正确工作区、scheme、display name、bundle id 的基础事实说明。

脚本不会自动填入：

- iOS build number。
- TestFlight build。
- 验收设备。
- iOS 版本。
- 验收人。
- 真机验收每个场景的结果。
- 最终结论。

这些仍然必须来自真实候选包和用户真机测试。

## 验证记录

语法检查：

```bash
node --check tools/app-store-create-acceptance-record.mjs
```

结果：通过。

Dry-run：

```bash
npm run app-store:create-acceptance -- --dry-run --date 2026-07-03 --output /tmp/recallo-acceptance-dry-run.md
```

结果：通过，不写文件。

临时文件生成：

```bash
npm run app-store:create-acceptance -- --date 2026-07-03 --output /tmp/recallo-acceptance-generated.md
```

结果：通过，生成临时记录；`npm run app-store:acceptance-audit -- /tmp/recallo-acceptance-generated.md` 能识别固定信息已填，仍正确报告真机结果和最终结论未填写。

## 下一步

准备候选包时先运行生成器，再让用户按生成出的验收记录逐项填真机结果。严格模式通过前不能 Archive。
