# 拾贝 V2 生产级架构审查报告

审查日期：2026-06-29
审查范围：后端 API、V2 生成队列、Postgres 数据持久化、iOS V2 前端数据流、推荐好文预置内容、部署与运维脚本、数据治理与通知链路。
审查方式：只读代码与文档、执行现有检查命令、访问线上健康检查；未修改业务代码。

## 一句话结论

当前系统已经不是临时原型，核心生成链路、队列、持久化、失败状态、推荐好文预置和 iOS V2 主流程都已经具备可测试基础。它适合继续做小规模、可控的 TestFlight 验证，但距离“可以放心替换生产并扩大真实用户”的生产级标准仍有几类必须补齐的工程边界：备份恢复、限流与请求保护、观测告警、真实通知验收、数据治理闭环。

粗略判断：

- 小范围 TestFlight：约 75% 到 80% 准备度。
- 公开 beta / 更广泛生产：约 55% 到 65% 准备度。
- 不建议再把主要精力放在 UI 局部微调上；下一阶段应该优先补生产保护和可运维性。

## 已验证证据

本轮审查中执行或复核了这些事实：

| 类别 | 结果 |
| --- | --- |
| Git 状态 | 当前分支 `codex/v2-article-limit-10000`，仅发现一个既有未提交文件：`experiments/shibei-v2/ios/拾贝/Localizable.xcstrings`。本轮审查未触碰该文件。 |
| 后端测试 | `npm --prefix backend run check` 通过；Node 测试显示 198 pass，0 fail。 |
| iOS 生产配置检查 | `npm run check:ios-production` 通过；Release API 指向生产 HTTPS，mock toggle 为 Debug-only，APNs production 配置存在。 |
| iOS 编译 | `xcodebuild ... -configuration Debug build` 通过。 |
| 线上健康检查 | `https://shibei-production.up.railway.app/api/health` 返回 `ok: true`，storage 为 `postgres`，APNs configured 为 true。 |
| 推荐好文目录 | 后端检查显示 9 篇 published article catalog 可通过校验。 |
| 代码结构 | 后端存在 Postgres、队列、worker、软删除、审计事件、推荐文章 import、V2 review session API；iOS V2 已接入 backend chapter/review session/notifications/favorites/recommended articles。 |

## 当前架构强项

1. 后端已经有真实持久化，而不是纯本地 mock。
   - `backend/src/db.js` 使用 Postgres，并有内存 fallback。
   - 章节、通知、收藏、生成任务、push token、审计事件都有表结构。

2. 生成任务已经队列化。
   - `generation_jobs` 支持 `queued/running/completed/failed/cancelled`。
   - 使用 `FOR UPDATE SKIP LOCKED` 领取任务，支持 `locked_until` 过期回收。
   - 有 `attempt_count/max_attempts/available_at`，具备重试基础。

3. 失败状态已经能落到用户可见章节状态。
   - V2 生成失败会保存为 chapter failure state。
   - 后端已有 `generationFailures.js` 做失败分类，能把内部错误转成用户可理解原因。

4. 删除逻辑比早期版本成熟。
   - 删除章节是软删除，并同步软删除相关通知、收藏、生成任务。
   - `audit_events` 会记录删除快照，具备恢复与审计基础。

5. iOS 主流程已基本接入真实后端。
   - 章节生成、章节详情、复习会话、收藏、通知、推荐文章导入都有 APIClient 对应方法。
   - Review session 支持 `start/resume/focus-unit/answer/advance`，能支撑“从哪里退出，从哪里继续”这一类体验。

6. 已经有生产部署文档和门禁脚本。
   - `docs/v2-production-deploy-runbook-zh.md`
   - `backend/scripts/production-readiness-gate.mjs`
   - `.github/workflows/v2-production-railway-deploy.yml`
   - `.github/workflows/v2-production-gate-evidence.yml`

## 主要风险与缺口

### P0：正式扩大测试前必须处理

| 问题 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| 请求体没有大小限制 | `backend/src/server.js` 的 `readBody` 直接收集所有 chunk 到内存；文档也将 body size limit 列为未完成阶段。 | 超大请求可能占用内存；也可能绕过文章字符上限前先压垮 API。 | 在 server 边界加通用 body size cap，并对生成接口设置更低业务 cap；超限直接返回用户友好错误。 |
| 缺少正式 rate limit / 生成配额 | 文档 `production-readiness-review-zh.md` 和 `production-hardening-plan-zh.md` 均列出未完成。 | 恶意或误操作可能刷爆模型成本；匿名 deviceId 可被滥用。 | 先按 IP + deviceId + endpoint 做轻量限流；生成接口单独限制并记录拒绝原因。 |
| CORS 仍为 `*` | `sendJson` / `sendText` 里 `access-control-allow-origin: *`。 | 浏览器端跨域边界过宽；配合匿名 deviceId，会放大接口滥用风险。 | 生产环境收紧为 App/官网/本地调试白名单；移动端原生请求不依赖开放 CORS。 |
| 备份与恢复演练没有闭环证明 | 文档多处写明真实生产前需要备份、恢复路径、恢复演练；Railway Postgres backups 受套餐限制。 | 一旦数据损坏或迁移失误，无法可信恢复；不符合真实用户数据保护标准。 | 小测可 reset-data，但正式真实用户前必须有自动备份或定期导出、恢复命令、至少一次恢复演练记录。 |
| 缺少生产告警闭环 | 有 `/api/health` 和 diagnostics workflow，但未见队列积压、失败率、DB、APNs、模型费用的自动告警。 | 出问题只能靠用户反馈或手工看日志，线上不可运维。 | 增加最小告警：health 失败、queue running 过期、失败率升高、APNs delivery error、模型 429/timeout、内存重启。 |

### P1：TestFlight 前应尽量补齐

| 问题 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- |
| APNs 配置存在，但真机端到端送达未形成验收记录 | `/api/health` 显示 APNs configured；代码有 push token/status 和 diagnostics。 | 用户后台生成完成后不一定收到系统通知，核心体验可能断。 | 用 TestFlight 真机做至少 3 条验收：授权、拒绝、后台完成/失败；保存 push diagnostics。 |
| Web 和 worker 同一 Railway service | `backend/src/start.js` 同时启动 server 和 worker；worker 超过重启限制会关闭 backend。 | worker 崩溃风暴可能影响 API；无法独立扩容。 | MVP 可接受，但要加 worker crash 告警；后续拆成 Web service + Worker service。 |
| 推荐好文仍是文件式管理 | `docs/recommended-articles-admin-runbook-zh.md` 描述为文件、catalog、prepared chapter、covers。 | 每次内容更新需要部署；不适合长期社区运营。 | TestFlight 可继续文件式；下一阶段做远端 content catalog 或轻量 admin 表。 |
| 推荐文章封面与正文存在缓存策略不一致风险 | 后端 cover endpoint 有 1 小时缓存；文章目录与 prepared 内容由 API 拉取。 | 切页时封面可能后出现；内容与图在用户体验上不够“一起到”。 | 推荐 catalog 返回 cover metadata，iOS 做预取和占位；后续迁到 CDN/对象存储。 |
| 文章长度策略与文档不一致 | 代码默认 `DEFAULT_V2_MAX_ARTICLE_CHARS = 50000`；早期文档仍有 10000 字 MVP 上限描述。 | 产品预期、用户提示、成本预估不一致。 | 确定 MVP 策略：5 万字是临时测试上限还是正式上限；同步文档和前端提示。 |
| 匿名 deviceId 模型有明确边界 | iOS 使用 Keychain + UserDefaults 保存匿名设备 ID；后端按 `X-Device-Id` 隔离。 | 没有账号找回、多设备同步；deviceId 被伪造时保护有限。 | TestFlight 可接受，但必须在账号说明里明确；真实生产前评估登录/弱认证/签名 token。 |
| 源文内容、生成题目、用户进度的保留策略还不完整 | `docs/data-governance.md` 已说明后续需要自动备份、恢复演练、账号迁移；隐私说明存在但需要和实际存储再核对。 | 隐私、合规、用户信任风险。 | 定义保留周期、删除后备份保留边界、日志脱敏规则、用户导出/删除响应流程。 |

### P2：可上线小测，但应纳入后续技术债

| 问题 | 影响 | 建议 |
| --- | --- | --- |
| V1/V2 代码共存 | 增加维护面和回归面。 | V2 稳定后列一个 V1 sunset 计划。 |
| UI 已做 token 化，但仍有很多 Figma 精确布局硬编码 | 后续改版容易出现“某页没跟着变”。 | 保持 `frontend-ui-standards` skill + 设计 token 审查，逐步收拢。 |
| iOS 缺少系统级 UI 自动回归 | 真机测试靠手动，复杂状态容易漏。 | 先补关键 smoke：启动、生成失败删除、推荐文章导入、复习退出恢复、收藏、通知。 |
| Playwright/网页提取资源成本需要监控 | 复杂网页提取可能慢或失败。 | 记录提取耗时、失败域名、正文字符数；对高风险域名做 fallback。 |
| 用户可见失败原因仍需持续打磨 | 后端有分类，但不同错误映射是否足够“保护信任”需要真机样本。 | 建立失败文案表，内部错误只进 diagnostics，不直接展示字段名。 |

## 数据治理检查

### 当前处理的数据

| 数据类型 | 敏感度 | 当前状态 |
| --- | --- | --- |
| 用户提交链接 / 正文 | 中到高 | 存入章节 source / generation payload，用于生成与阅读原文。 |
| 生成的题目、知识点、复习结构 | 中 | 存入章节和 review session。 |
| 用户答题进度、错题、收藏、反馈 | 中 | 存入 review session / favorite_questions。 |
| 匿名 deviceId | 中 | Keychain 保存；后端以 deviceId 隔离。 |
| APNs token | 中 | 后端保存 device_push_tokens。 |
| 管理员推荐文章与预生成内容 | 中 | 文件式 catalog + prepared chapter。 |

### 已具备的治理能力

- 章节删除、通知、收藏、生成任务支持软删除。
- 删除动作写入 `audit_events`，保留快照。
- 有 `deleteDeviceData`，可以清理一个匿名设备下的数据。
- 文档已有 `docs/data-governance.md` 和恢复脚本说明。

### 仍需补齐

- 自动备份与恢复演练。
- 明确保留周期：源文、生成内容、审计事件、APNs token、日志。
- 日志脱敏边界：不能把完整原文、token、用户链接、模型 key 写进普通日志。
- 删除后的备份残留说明：用户删除数据后，备份里保留多久、如何覆盖恢复场景。
- 后续若做账号，需要数据迁移策略：匿名 deviceId 到账号的绑定、合并、冲突处理。

## 推荐的生产级推进计划

### Checkpoint 1：安全与成本保护

目标：先把“被打爆、被误用、成本失控”的风险压住。

要做：

1. 给 `readBody` 加全局请求体上限。
2. 给生成接口加业务上限和更友好的错误。
3. 增加 deviceId + IP + endpoint 粒度的基础 rate limit。
4. 生产环境 CORS 白名单化。
5. 对删除、生成、推荐导入这些高风险接口加更严格 deviceId 格式校验。

验收：

- 超大 body 不进入业务逻辑。
- 短时间重复生成会被明确拒绝。
- iOS 真机仍能正常生成、删除、推荐导入。
- 后端测试新增覆盖。

### Checkpoint 2：备份、恢复、数据治理闭环

目标：避免“上线后数据坏了无法恢复”。

要做：

1. 确认 Railway Postgres 当前套餐是否支持 PITR/backup。
2. 如果不支持，建立每日或每次部署前 `pg_dump` 导出方案。
3. 写清楚恢复命令和恢复演练步骤。
4. 做一次非生产库恢复演练，并记录证据。
5. 更新隐私说明里的保留与删除边界。

验收：

- 有可执行备份命令。
- 有可执行恢复命令。
- 至少一次恢复演练成功记录。
- `data-governance.md` 与实际流程一致。

### Checkpoint 3：观测与告警

目标：线上问题不能只靠用户反馈。

要做：

1. `/api/health` 保持轻量，增加单独 `/api/diagnostics` 或 admin workflow 汇总。
2. 增加 queue backlog、stale running、failed rate、worker restart 的检查。
3. 增加 APNs delivery failure 的可见诊断。
4. 增加模型 provider timeout/429/error 的聚合日志。
5. 建立最小告警：Railway health、queue stale、失败率、worker restart。

验收：

- 故意制造失败任务后，能在诊断里定位。
- worker crash/retry 能被发现。
- APNs 未送达能在 diagnostics 中看到原因。

### Checkpoint 4：真机端到端验收矩阵

目标：把“看起来能跑”变成“核心场景可证明稳定”。

要测：

1. 新用户首次启动，启动页过渡到首页。
2. 输入链接生成成功，后台退出后收到通知。
3. 输入异常链接或抽取失败，进入生成失败详情页，删除章节成功。
4. 复习到某个 unit 某道题退出，再继续，回到同一页。
5. 做错题后插入新题后方，直到每题做对一次。
6. 收藏题目后，笔记页可见，重启 App 后仍保留。
7. 推荐好文导入后，几秒内进入可复习章节。
8. 通知已读后红点消失。
9. 隐私说明、账号说明、通知设置可打开且文案一致。

验收：

- 每项用真机录屏或截图记录。
- 至少覆盖网络正常、网络断开、App 后台、App 重启四类状态。

### Checkpoint 5：推荐好文运营方案

目标：先生产级地支撑 TestFlight 预置内容，后续可平滑升级成后台管理。

短期：

1. 继续使用文件式 catalog + prepared chapter + cover。
2. 给每篇文章保证：标题、作者、分类、摘要、封面、本地 prepared chapter、合法来源链接。
3. iOS 端对封面做预取/缓存，避免封面闪现。
4. 推荐文章内容更新通过一次部署发布。

中期：

1. 把 catalog、cover、prepared chapter 迁到远端存储或数据库。
2. 建一个管理员导入脚本或轻量后台。
3. 用户看到的是远端内容，不需要更新 App。

## 下一步建议

最短路径不是继续大改架构，而是按风险顺序补生产保护：

1. 先做 Checkpoint 1：请求大小、限流、CORS、deviceId 保护。
2. 再做 Checkpoint 2：备份恢复演练。
3. 同时做 Checkpoint 4 的真机验收矩阵，把已有功能稳定性证明出来。
4. 推荐好文管理先维持文件式，但要解决封面缓存和内容清洁，不急着做完整 CMS。

## 本轮未改动内容

- 未修改后端业务代码。
- 未修改 iOS 代码。
- 未提交 git。
- 未触碰既有 dirty 文件 `experiments/shibei-v2/ios/拾贝/Localizable.xcstrings`。
