# 2026-07-02 AI 处理同意机制证据

## 变更范围

- 新增真实生成前的一次性 AI 处理同意弹窗：`拾贝/拾贝/V2/Components/V2AIProcessingConsentSheet.swift`
- 在真实上传生成入口接入同意门槛：`拾贝/拾贝/V2/V2RootView.swift`
- 在隐私说明中补充 AI 处理同意可回看说明：`拾贝/拾贝/V2/Components/Cards/V2ProfileCards.swift`

## 产品规则验证

- 第一次真实用户生成前出现 AI 处理说明：已实现。Root 使用 `@AppStorage("v2.hasAcceptedAIProcessingConsent")` 保存同意状态，首次上传生成前展示 sheet。
- 推荐好文预设内容：未接入此同意门槛，保持现有预生成/模拟流程独立。
- 用户拒绝后不开始真实 AI 生成：已实现。点击“暂不生成”只关闭 sheet，不调用 `createV2Chapter`。
- 用户同意后不重复打断：已实现。同意后写入 AppStorage，后续真实生成直接进入原有生成流程。
- 隐私说明可回看：已实现。在“我的 > 隐私说明”中增加说明。

## 自动化验证

### Release Archive Preflight

命令：

```bash
npm run check:release-ios
```

结果：通过。

关键结果：

- 官方工作区：`/Users/hanmingyu/Downloads/拾贝-prod-hardening`
- branch：`codex/recallo-review-replay-mode`
- Release 入口：`V2RootView`
- Release API：production URL
- App 名称：`Recallo`

### XcodeBuildMCP Simulator Build

配置：

- projectPath：`/Users/hanmingyu/Downloads/拾贝-prod-hardening/拾贝/拾贝.xcodeproj`
- scheme：`Recallo`
- simulator：`iPhone 17 Pro`
- configuration：`Debug`

结果：通过。

构建产物：

- `/Users/hanmingyu/Library/Developer/XcodeBuildMCP/workspaces/workspace-ee845a8bacf4/DerivedData/拾贝-316f0e33c693/Build/Products/Debug-iphonesimulator/Recallo.app`

日志：

- `/Users/hanmingyu/Library/Developer/XcodeBuildMCP/workspaces/workspace-ee845a8bacf4/logs/build_run_sim_2026-07-02T18-54-56-845Z_pid63988_3e049488.log`

### Full Check

命令：

```bash
npm run check
```

结果：通过。

关键结果：

- Backend route contract gate：通过。
- Recommended catalog：`9 published articles`。
- Node test：`203` tests passed。
- Recallo workspace guard：通过。
- iOS production guard：通过。
- V2 UI regression guard：通过。

## 待人工确认

- 在真机或 TestFlight 候选包中确认 AI 处理说明弹窗的中文文案、按钮层级、sheet 高度和关闭体验。
- 用户确认文案是否需要调整为更正式的 App Store 审核口径。
