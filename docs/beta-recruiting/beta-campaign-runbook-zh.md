# 拾贝 Beta 招募执行手册

日期：2026-05-27

## Goal

用创始人个人身份，在小红书为主、Reddit 为辅招募 20-50 名高质量 iOS Beta 测试用户。所有入口通过评论或私信人工发放，不公开硬贴 TestFlight 链接。

## Assets

- 营销上下文：`.claude/product-marketing-context.md`
- ICP 与渠道策略：`docs/beta-recruiting/icp-and-channel-strategy-zh.md`
- 小红书内容包：`docs/beta-recruiting/xiaohongshu-content-pack-zh.md`
- Reddit 英文反馈包：`docs/beta-recruiting/reddit-feedback-pack-en.md`
- 用户记录表：`docs/beta-recruiting/tester-tracker-template.csv`

## 7-Day Plan

| Day | Action | Output |
|-----|--------|--------|
| Day 0 | 准备截图、确认 TestFlight/测试入口、复制 tracker | 可发送测试入口、记录表 ready |
| Day 1 | 发布小红书 Note 1 或 Note 2 | 收集第一批评论/私信 |
| Day 2 | 私信筛选并发 5-10 个测试入口 | 记录发送时间和用户画像 |
| Day 3 | 发布小红书 Note 3 或 Note 5 | 扩大到 AI 学习/碎片化学习人群 |
| Day 4 | 回访首批用户；整理题目质量反馈 | 标出高频退出点 |
| Day 5 | 视账号情况发布 Reddit r/SideProject 草稿 | 获取英文外部反馈 |
| Day 6 | 发布小红书 Note 4 或 Note 6 | 针对知识管理/产品人群补样本 |
| Day 7 | 复盘渠道表现和产品反馈 | 决定扩大、改文案或先修产品 |

## Preflight Checklist

### Product

- [ ] TestFlight 或测试入口可用。
- [ ] 隐私政策 URL 可访问。
- [ ] App 内没有 Mock、Railway、本地 API、deviceId、decode path 等工程文案。
- [ ] 添加文字/文章链接、生成、章节详情、复习、解释、题目反馈、删除数据路径可用。

### Xiaohongshu

- [x] `redbook whoami` 可连接账号：2026-05-27 验证通过，账号 `FkedUpEverything`。
- [ ] 准备 5 张真实截图。
- [ ] 发布前人工检查标题、正文、首评、隐私说明。
- [ ] 不使用自动发布、自动点赞、自动批量评论。

### Reddit

- [ ] 当天检查目标 subreddit 规则和置顶帖。
- [ ] 确认账号满足 karma/account-age/flair 要求。
- [ ] 先贡献 3 条非推广评论。
- [ ] 不公开 TestFlight 链接，除非 subreddit 明确允许。

## Invite Flow

1. 用户评论或私信关键词：`内测`、`拾贝`、`Beta`、`复习`、`第二大脑`、`产品内测`。
2. 发送筛选私信：
   - 是否 iPhone 用户？
   - 是否愿意用一篇真实想记住的文章测试？
   - 是否接受内容上传云端并可能经第三方 AI 模型处理？
3. 合格后发送测试入口和统一测试任务。
4. 记录到 `tester-tracker-template.csv` 的副本。
5. 次日回访。

## Unified Test Task

请用一篇你最近真的想学习或记住的文章进行测试：

1. 打开拾贝，粘贴文章链接或一段文字。
2. 等待系统生成章节和复习题。
3. 完成一轮复习。
4. 在答错后查看解释和完整来源。
5. 对一道你觉得不准确或没帮助的题进行反馈。
6. 第二天再次打开 App，看是否愿意继续复习。

重点反馈：

- 第一次添加是否顺畅。
- 生成等待是否可以接受。
- 题目是否真的帮助理解和记忆。
- 来源和解释是否建立信任。
- 哪一步最想退出。

## Safety Rules

- 不说“永久记住”“100% 准确”“最强 AI 学习神器”。
- 不承诺账号登录、跨设备同步、订阅、视频正文提取等未稳定能力。
- 必须说明 Beta 状态和数据处理边界。
- 遇到隐私顾虑时，不劝说；直接建议介意者暂不测试。
- 不把用户提交内容、反馈截图或私信对话公开二次传播，除非得到明确许可。

## Weekly Review Template

| Question | Notes |
|----------|-------|
| 哪个平台带来最多合格私信？ | |
| 哪篇内容的评论/收藏/私信比最好？ | |
| 哪类用户完成率最高？ | |
| 最大退出点是什么？ | |
| 最常见坏题类型是什么？ | |
| 是否达到 20 人领取、10 人完成、5 人次日回访？ | |
| 下一轮动作：扩大 / 改文案 / 先修产品？ | |

