# Recallo App Store 上架前生产稳定性验收模板

> 每次准备提交 TestFlight/App Store 候选包前，复制本文件为 `YYYY-MM-DD-production-acceptance.md`，填写 commit、build、Railway deployment 和每项结果。没有 P0/P1 问题时才允许进入 Archive / App Store Connect 提交流程。

## 1. 候选版本信息

| 项目 | 值 |
| --- | --- |
| 日期 | 2026-07-04 |
| Git commit | 131f94beda79 |
| Branch | codex/recallo-review-replay-mode |
| iOS build number |  |
| TestFlight build |  |
| Railway deployment id | 51ae3233-4431-471e-9194-a80b5b09a900 |
| Production URL | `https://shibei-production.up.railway.app` |
| 数据策略 | preserve-data |
| 验收设备 |  |
| iOS 版本 |  |
| 验收人 |  |

## 2. 自动检查

在官方工作区执行：

```bash
cd /Users/hanmingyu/Downloads/拾贝-prod-hardening
npm run check:release-ios
npm run check
npm run check:app-store-health
xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme 'Recallo' -destination 'generic/platform=iOS' -configuration Release build CODE_SIGNING_ALLOWED=NO
curl -s https://shibei-production.up.railway.app/api/health
```

| 检查项 | 期望 | 结果 | 证据 |
| --- | --- | --- | --- |
| `npm run check:release-ios` | PASS | PASS | 2026-07-04 通过；commit `131f94beda79`；仍有非阻塞 release visibility warning，需真机确认用户不可见 |
| `npm run check` | PASS | PASS | 2026-07-04 通过；204 backend tests passed；workspace guard、iOS production guard、V2 UI regression guard、account decision consistency audit 均通过 |
| `npm run check:app-store-health` | PASS | PASS | 2026-07-04 通过；production `/api/health` 200；deployment id `51ae3233-4431-471e-9194-a80b5b09a900` |
| iOS Release build | PASS | PASS | 2026-07-04 `xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme 'Recallo' -destination 'generic/platform=iOS' -configuration Release build CODE_SIGNING_ALLOWED=NO` succeeded |
| `/api/health` | 200，服务正常 | PASS | deployment id `51ae3233-4431-471e-9194-a80b5b09a900`；提交前需重跑 |
| 正确工作区 | `/Users/hanmingyu/Downloads/拾贝-prod-hardening` | PASS | 本文件由官方工作区脚本生成 |
| 正确 scheme | `Recallo` | PASS | release preflight 覆盖；Archive 前仍需用户确认 Xcode 顶栏 |
| 正确 display name | `Recallo` | PASS | release preflight 覆盖；Archive 后仍需用户确认 Organizer |
| 正确 bundle id | `com.maxhan.shibei` | PASS | release preflight 覆盖；App Store Connect 仍需用户确认旧 App |

## 3. 真机核心验收

| ID | 场景 | 步骤 | 期望结果 | 结果 | 证据 | 阻塞等级 |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | 新用户首次启动 | 清理 App 后首次打开 | 先显示启动页，再进入首页；不闪旧空状态；无旧品牌 |  |  | P1 |
| A2 | AI 处理同意 | 首次真实生成前点击开始生成 | 展示 AI 处理说明；拒绝不创建任务；同意后继续生成 |  |  | P1 |
| A3 | 真实生成成功 | 输入一篇正常文章链接或正文 | 进入生成中详情页；进度文案可读；完成后自动切到章节详情 |  |  | P0 |
| A4 | 后台/锁屏通知 | 生成中退出 App 或锁屏 | 生成完成/失败时收到系统通知；不重复推送；回到正确章节 |  |  | P0 |
| A5 | 生成失败和删除 | 输入异常链接或断网后触发失败 | 进入生成失败详情；失败原因用户可读；删除章节后列表消失 |  |  | P0 |
| A6 | 推荐好文模拟生成 | 从发现页好文点开始生成 | 进入模拟生成中详情页停留约 5-10 秒；完成后进入章节详情；不抢占主页正在学习章节 |  |  | P1 |
| A7 | 主页学习路径 | 已有正在学习章节时再生成新章节 | 主页继续显示当前正在学习章节，除非用户进入新章节并开始学习 |  |  | P1 |
| A8 | 复习 cursor 恢复 | 在某 unit 某道题/解释/总结页退出，再点继续 | 回到退出时同一页；主页进度只反映已完成题数 |  |  | P0 |
| A9 | 错题回插 | 做错一道选择题或连线题 | 错题插入当前 unit 新题之后；再次出现为未作答状态；做对后才能完成 |  |  | P0 |
| A10 | 收藏/取消收藏 | 做题页点击收藏，再进入笔记页 | 收藏状态稳定；笔记页可见；取消后消失；重启后保持 |  |  | P1 |
| A11 | 通知已读 | 生成成功/失败后打开通知页并点进详情 | 通知红点和数量立即更新；返回来源页面正确 |  |  | P1 |
| A12 | 删除章节 | 章节详情右上角删除 | 二次确认；删除后章节、通知、收藏关联状态一致 |  |  | P0 |
| A13 | 隐私/账号/通知说明 | 我的页打开三个说明浮窗 | 文案与隐私政策一致；底色/排版符合设计；通知设置能打开系统权限 |  |  | P1 |
| A14 | 删除我的数据 | 我的页执行删除数据 | 当前匿名设备数据清空；服务端不再返回旧章节；不会误删其他 device 数据 |  |  | P0 |
| A15 | 切语言稳定性 | iOS 设置切换偏好语言后回 App | 当前 device 数据仍可见；不会生成新空身份 |  |  | P0 |
| A16 | 发现页内容 | 打开发现页并切换 filter | 封面显示；filter 可横向滚动；文章数量和标签正常 |  |  | P1 |
| A17 | UI 阻塞文案 | 扫一遍核心路径 | 不出现 `fixture`、`Railway`、`JSON decode`、旧“拾贝”可见文案 |  |  | P0 |

## 4. 网络异常验收

| ID | 场景 | 步骤 | 期望结果 | 结果 | 证据 | 阻塞等级 |
| --- | --- | --- | --- | --- | --- | --- |
| N1 | 无网络启动 | 开飞行模式后打开 App | 已缓存数据可读；需要网络的操作给用户友好提示 |  |  | P1 |
| N2 | 生成中断网 | 生成中关闭网络 | 不永久卡住；失败或超时后可删除/重试；开始生成按钮不被旧任务锁死 |  |  | P0 |
| N3 | 恢复网络 | 断网后恢复网络并刷新 | 状态能恢复或给出明确下一步 |  |  | P1 |

## 5. App Store 截图验收

按 `docs/app-store-release-evidence/screenshots-checklist.md` 准备 6 张截图。

| 截图 | 结果 | 文件/证据 |
| --- | --- | --- |
| 首页学习路径 |  |  |
| 添加文章 |  |  |
| 生成中页面 |  |  |
| 章节详情 |  |  |
| 做题页面 |  |  |
| 发现页推荐好文 |  |  |

## 6. 问题分级

| 等级 | 定义 | 处理 |
| --- | --- | --- |
| P0 | 数据丢失、无法生成、无法继续学习、删除误删、旧工程/旧 UI 混入、审核必拒风险 | 必须修复后重新验收 |
| P1 | 核心体验明显异常、通知错乱、进度不准、关键文案误导、截图不可用 | 上架前必须修复或明确豁免 |
| P2 | 轻微排版、非核心文案、少量体验瑕疵 | 可进入后续版本，但需记录 |

## 7. 最终结论

- [ ] 没有 P0。
- [ ] 没有未豁免 P1。
- [ ] 隐私政策、App Privacy 标签、审核备注一致。
- [ ] 截图来自正确 Recallo build。
- [ ] 用户已确认支持 URL、隐私 URL、每日额度数字、Apple 登录首版决策。

结论：

```text
通过 / 不通过
```
