# Recallo App Store 首版生产运维 Runbook

更新时间：2026-07-03

本文档用于 App Store 首版上架前后的最小生产运维。它不替代 Railway 面板、GitHub Actions 或数据库备份服务；它规定当生产服务、生成队列、APNs、推荐好文或数据库出现异常时，应该先看什么、如何判断用户影响、何时暂停发布、何时回滚。

## 1. 上架前运维原则

- 先看用户影响，再看系统指标。用户影响包括：不能生成章节、生成完成不通知、已有章节打不开、进度/收藏丢失、删除后状态不一致。
- 不在没有记录 commit、Railway deployment id、App build number 的情况下做发布。
- 不在没有备份/恢复路径的情况下做会影响生产数据的迁移、清空或手工修复。
- 不把 API key、数据库 URL、APNs 私钥、完整用户原文、完整 APNs token 写入文档、日志、issue 或截图。
- App Store 审核期间若后端重新部署，必须记录原因、commit、Railway deployment id 和验证结果。

## 2. 最小 SLI 和触发阈值

| SLI | 用户影响 | 观测方式 | 上架前阈值 | 处理级别 |
| --- | --- | --- | --- | --- |
| API health | App 无法连接服务器、章节详情卡住 | `npm run check:app-store-health` / `/api/health` | 必须 READY | P0 |
| 数据库状态 | 章节、进度、收藏、通知不可读写 | `/api/health` 的 `database.ok` | 必须 `true` | P0 |
| 队列失败数 | 生成卡住或失败通知异常 | `/api/health` 的 `queue.failed` | 上架前必须为 0 | P0/P1 |
| 队列积压 | 生成等待过长 | `/api/health` 的 `queue.queued/running` + Railway logs | 持续增长且 10 分钟不下降时处理 | P1 |
| APNs 配置 | 后台/锁屏收不到系统通知 | `/api/health` 的 `apns.configured/environment` | 必须 configured + production | P1 |
| APNs 发送失败 | 生成完成后用户不被提醒 | notifications 的 `pushDeliveryStatus/pushDeliveryError`、Railway logs | 同一原因连续出现 3 次以上处理 | P1 |
| 推荐好文 catalog | 发现页内容缺失、封面/filter 回退 | `/api/health` recommendedCatalog | articleCount >= 6，filters 3-6 个 | P1 |
| 生成失败率 | 用户连续无法完成核心体验 | 生成失败通知、Railway logs、失败原因分布 | 同一链接/同一失败类连续失败需处理 | P1 |

## 3. 每日/发布前检查命令

发布前必须执行：

```bash
npm run app-store:status
npm run check:app-store-health
npm run check:release-ios
```

如果当前环境有 production `DATABASE_URL` 只读/运维访问权限，额外执行：

```bash
npm run app-store:ops-diagnostics
```

如果要生成候选包证据：

```bash
npm run app-store:create-acceptance
```

用户完成 Xcode Archive 和 App Store Connect 上传后：

```bash
npm run app-store:create-archive-evidence -- \
  --build-number <build-number> \
  --version <version> \
  --archive-result uploaded \
  --app-store-connect-build-status processing
```

## 4. 事故分级

| 级别 | 判断标准 | 处理策略 |
| --- | --- | --- |
| P0 | 生产 API 不可用、数据库不可用、已有数据大面积不可读、旧工程/旧 UI 进入候选包 | 立刻停止 Archive/提交；若已上线，先回滚或暂停推广 |
| P1 | 生成主链路失败、通知严重延迟/重复、推荐好文不可用、进度恢复错误 | 暂停提交；修复后重新真机验收 |
| P2 | 文案、轻微样式、非核心页面问题 | 可进入后续版本，除非影响审核材料真实性 |

## 5. Railway / API 异常处理

触发条件：

- App 显示 “Application failed to respond”。
- `npm run check:app-store-health` 失败。
- Railway 发来 deployment failed、crash、wrong field、out of memory、restart 相关邮件。

处理步骤：

1. 记录当前时间、App build、当前 git commit、Railway deployment id。
2. 运行：

   ```bash
   npm run app-store:health-audit -- --report
   ```

3. 在 Railway 面板查看目标 service 的 Deploy Logs 和 HTTP Logs，只记录错误类型，不复制密钥或完整用户内容。
4. 如果 health HTTP 不是 200，先判断是否是部署中短暂窗口；超过 3 分钟仍失败按 P0。
5. 如果 deployment 刚变更，优先回滚到上一个已知健康 deployment。
6. 回滚后重新运行：

   ```bash
   npm run check:app-store-health
   ```

7. 把原因、处理动作、回滚 deployment id 写入 `docs/app-store-release-evidence/YYYY-MM-DD-incident-<slug>.md`。

## 6. 队列和生成失败处理

触发条件：

- `queue.failed > 0`。
- 多个用户或同一用户连续生成失败。
- 生成中页面长时间停留，或完成/失败状态没有切换。

处理步骤：

1. 先跑 health：

   ```bash
   npm run app-store:health-audit -- --report
   ```

2. 如果有 `DATABASE_URL`，先跑只读聚合：

   ```bash
   npm run app-store:ops-diagnostics
   ```

3. 在 Railway logs 搜索同一时间段的 `Generation worker`、`failedStage`、`failureReason`、`generation job`。
4. 判断失败类别：

   | 类别 | 用户影响 | 处理 |
   | --- | --- | --- |
   | `failed_input` | 原文过长/无法提取 | 不算系统事故；确认用户文案友好 |
   | `model_calling` / timeout / 429 | 模型服务或成本/限流问题 | P1；检查模型 key、供应商状态、重试和超时 |
   | `structured_output_failed` / `contract_validation_failed` | 模型结构输出不稳定 | P1；保留样本，进入 prompt/schema 修复 |
   | `quality_failed` | 内容不适合生成题目 | P2/P1；看失败率和样本 |
   | unknown | 未归类异常 | P1；先保存日志和输入元信息，避免继续扩大 |

5. 不直接把内部字段暴露给用户；用户侧只显示精简原因。
6. 修复后必须用同类文章重跑一次真实生成，并记录结果。

## 7. APNs 通知异常处理

触发条件：

- 生成完成/失败后，App 在后台或锁屏时不收到系统通知。
- 打开 App 后才出现通知。
- 同一事件重复推送。
- Railway logs 出现 APNs 发送失败。

处理步骤：

1. 先确认 production 配置：

   ```bash
   npm run check:app-store-health
   ```

   必须看到 `apnsConfigured=true` 和 `apnsEnvironment=production`。

2. 真机确认系统通知权限：
   - iOS Settings > Notifications > Recallo。
   - App 内通知设置和系统权限状态一致。

3. 如果有 `DATABASE_URL`，先跑只读聚合：

   ```bash
   npm run app-store:ops-diagnostics
   ```

4. 查看数据库 notifications 里的状态字段：
   - `pushDeliveryStatus`
   - `pushDeliveryError`
   - `pushSentAt`
   - `dismissed`

5. 常见 APNs 错误判断：

   | 错误 | 可能原因 | 处理 |
   | --- | --- | --- |
   | `BadDeviceToken` | token 属于旧环境、重装后 token 失效 | 重新打开 App 同步 token；确认不会重复推送旧 token |
   | `BadEnvironmentKeyInToken` | development/production APNs 混用 | 检查 Xcode entitlements、APNS_ENV 和 TestFlight 包 |
   | `DeviceTokenNotForTopic` | bundle id 不匹配 | 检查 `APNS_BUNDLE_ID=com.maxhan.shibei` |
   | `apns_not_configured` | Railway 变量缺失 | 补齐 APNs 变量后重新 health |

6. 修复后至少做两条真机验收：
   - App 在后台，生成成功后收到系统通知。
   - App 不打开的情况下，不重复收到同一条通知。

## 8. 备份与恢复

上架前最低要求：

- 不能只依赖“软删除可恢复”。软删除只能恢复 App 层误删，不能恢复数据库级别损坏、错误迁移或生产清空。
- 如果 Railway plan 支持 PITR/volume backup，必须确认它已开启或记录为什么暂不支持。
- 如果暂不支持自动备份，至少建立手动导出流程，并在非生产库做一次恢复演练。

发布前备份核对：

| 项目 | 要求 |
| --- | --- |
| 最近备份/导出引用 | 记录 artifact、快照时间或备份名称 |
| 恢复目标 | 不直接覆盖生产，优先恢复到临时库或 staging-equivalent |
| 恢复验证 | 能看到章节、收藏、通知、生成任务数量与导出前一致 |
| 删除恢复 | `restore-deleted-chapter.mjs` 能恢复单章节和关联收藏/通知 |

App 层误删恢复：

```bash
cd backend
node scripts/data-governance-audit.mjs --device-id <device-id>
node scripts/restore-deleted-chapter.mjs --device-id <device-id> --chapter-id <chapter-id>
```

数据库级恢复演练建议：

1. 在生产外创建临时 Postgres。
2. 导入最近导出或备份。
3. 运行只读核查：章节数、收藏数、通知数、生成任务数。
4. 抽查 1 个 device 的章节详情、进度、收藏和通知。
5. 记录演练结果到 `docs/app-store-release-evidence/YYYY-MM-DD-db-restore-drill.md`。

## 9. 推荐好文回退/缺图处理

触发条件：

- 发现页封面消失。
- filter 回到早期 mock 状态或数量过多。
- 推荐文章点击后没有模拟生成页。

处理步骤：

1. 先运行：

   ```bash
   npm run check:app-store-health
   ```

   重点看 `recommendedCatalogArticleCount` 和 `recommendedCatalogFilters`。

2. 确认当前部署 commit 是否包含最新推荐好文 catalog。
3. 检查 iOS 包是否来自官方工作区和最新 commit：

   ```bash
   npm run check:release-ios
   ```

4. 若只是后端 catalog 回退，重新部署正确 commit；若 iOS 本地 fixture 回退，重新 Archive/TestFlight。

## 10. 证据模板

每次事故或演练至少记录：

```markdown
# Recallo Production Incident / Drill

Date:
Reporter:
App build:
Git commit:
Railway deployment id:
User impact:
Severity: P0 / P1 / P2

## Timeline

- HH:MM issue observed
- HH:MM health checked
- HH:MM mitigation applied

## Evidence

- Command output:
- Screenshot/log excerpt:

## Root Cause

## Fix

## Follow-up
```

## 11. 上架前停止条件

以下任一情况存在时，不进入 Archive 或 App Store Submit：

- `npm run app-store:status` 仍有 P0/P1 技术阻塞。
- `npm run check:app-store-health` 失败。
- 真机验收记录中任一核心链路未通过且未明确豁免。
- 支持邮箱、Privacy URL、Support URL 未公开可访问。
- App Store 截图来自旧工程、旧 UI、旧名称或旧图标。
- 没有记录 Archive build number、commit hash 和 Railway deployment id。
