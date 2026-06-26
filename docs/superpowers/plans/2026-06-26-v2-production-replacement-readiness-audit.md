# 拾贝 V2 正式替换前准备审查

> Last updated: 2026-06-26

## 当前结论

V2 后端生成链路和 V2 SwiftUI 页面已经能进入正式 App target，并且 Debug 可以默认进入 V2 UI。Release 仍保持旧版入口，这是刻意保留的回滚保护。距离“直接替换线上版本”还差几个生产级闭环，不能只看页面能不能打开。

## 已完成

- Root production App 保持正式 bundle id：`com.maxhan.shibei`。
- Root `APIClient` Release 仍指向 `https://shibei-production.up.railway.app`。
- Debug 支持通过 `-ShibeiAPIBaseURL` / `-ShibeiV2APIBaseURL` 或环境变量覆盖 API base URL。
- V2 backend DTO、V2 SwiftUI 页面和 V2 assets 已迁入 root production App target。
- Debug root App 默认进入 V2 UI；可用 `-ShibeiUseLegacyRoot` 回到旧版 UI。
- Release root App 暂不进入 V2 UI，防止未完成时影响已部署版本。
- V2 fixture 模式通过 `usesFixtures` 统一收口；Release 不会启用 fixture，即使存在历史 AppStorage 值。
- V2 通知页已能读取真实 `NotificationItem` 列表，不再只能显示 mock/空状态。
- V2 笔记页已接入真实收藏题基础入口：读取 `FavoriteQuestionRecord`，映射到已加载 V2 章节和题目，点进题目后返回笔记页，继续进入收藏列表下一题。
- V2 题目页收藏/取消收藏按钮已接入真实 favorite API，采用旧版同类流程的乐观更新与失败回滚策略。
- Debug 和 Release iOS build 均已通过。

## 仍需补齐的生产闭环

### 1. 正式 V2 入口翻转

当前 `ContentView` 的 Release 仍走旧 `RootView`。这是安全的，但最终替换前必须有一个明确 checkpoint，把 Release 改为进入 V2。翻转前必须完成下面所有检查项。

### 2. V2 收藏题真实入口

旧版收藏题不是简单列表，而是：

- `FavoriteQuestionRecord`
- 找回对应 `Chapter`
- 找回对应 `ReviewQuestion`
- 进入收藏题复习态
- 点击继续后走收藏列表下一题
- 返回时回到笔记页

V2 已完成第一阶段真实入口：笔记页会使用真实 favorite 记录生成 V2 favorite display item，并支持打开收藏题、返回笔记页、继续下一条收藏题。题目页右上角收藏按钮也已接入真实 favorite API。

仍需补齐：

- 收藏题如果引用未加载章节、旧版 V1 章节或已删除章节，目前会被过滤；上线前要决定是否显示“旧收藏暂不可用”或做一次性迁移。
- 收藏题进入题目页后目前是本地未作答态；如果未来需要云端记录收藏题练习历史，需要单独设计，不要混入普通 review session。
- 需要用真实账号/设备跑一次收藏、取消收藏、重启后重新拉取、笔记页进入题目的端到端验证。

### 3. 生成进度与失败状态完整验证

V2 UI 已显示 backend progress 文案，但需要真机或模拟器完整跑通：

- 输入链接后创建 V2 chapter
- pending/generating 阶段能持续轮询
- 失败状态能显示失败详情页
- 完成后自动进入可复习章节
- 通知列表能看到成功/失败通知
- source link 能打开原文页

### 4. 复习状态恢复

V2 已有 review session API，并会在进入章节详情后 start/resume。但上线前要验证：

- 退出 app 后重新打开能恢复当前章节
- 已答题状态能恢复
- 查看原文再返回不会丢失答题后浮窗状态
- 单元总结/章节总结后状态不倒退

### 5. 真实数据空状态

V2 首页、全部章节、通知、笔记都必须在真实数据为空时显示真实空状态，而不是 fixture。首页和通知已基本具备；笔记仍待真实收藏题接入后复查。

### 6. 生产部署前回滚点

替换同一个线上 service 前需要记录：

- 当前旧版 iOS commit
- 当前旧版 backend commit
- 当前 Railway 部署版本
- 数据库备份状态
- 回滚命令/路径

## 推荐下一步顺序

1. 跑一次 root backend + root iOS V2 Debug 的本地完整生成测试。
2. 验证收藏/取消收藏、重启恢复、笔记页进入题目的真实数据闭环。
3. 修复生成/恢复流程里的状态漏洞。
4. 翻转 Release 入口到 V2。
5. 做替换前最终 smoke test 和回滚演练。
