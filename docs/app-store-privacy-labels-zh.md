# Recallo App Store 隐私标签填写表

> 本表用于 App Store Connect > App Privacy 填写时逐项核对。机器可读来源是 `docs/app-store-privacy-labels.json`。提交前仍需以 App Store Connect 当前问卷为准，由用户在网页中手动确认。

## 1. 总结

| 项目 | 当前首版填写建议 |
| --- | --- |
| 是否用于追踪 | 否 |
| 是否接入广告 SDK | 否 |
| 是否出售用户数据 | 否 |
| 是否收集定位/通讯录/相册/麦克风/金融信息 | 否 |
| 是否收集用户内容 | 是 |
| 是否收集标识符 | 是 |
| 是否收集使用数据 | 是 |
| 是否收集诊断数据 | 是 |

## 2. 需要声明的数据类型

| Apple 数据类型 | Recallo 示例 | 用途 | 是否关联用户 | 是否用于追踪 | 填写建议 |
| --- | --- | --- | --- | --- | --- |
| User Content | 用户提交的文章链接、提取正文、生成章节、知识点、题目、解释、来源引用 | App Functionality | 是 | 否 | 声明 |
| Identifiers | 匿名设备 ID、Apple 登录账号 ID（如果首版启用）、APNs token | App Functionality | 是 | 否 | 声明 |
| Usage Data | 学习进度、答题结果、收藏、反馈、通知状态、每日生成额度记录 | App Functionality、Analytics | 是 | 否 | 声明 |
| Diagnostics | 生成失败类别、队列状态、推送送达状态、脱敏错误日志 | App Functionality、Analytics | 是 | 否 | 声明 |

## 3. 不应声明的数据类型

当前首版不应声明以下数据类型，除非后续功能发生变化：

- Contact Info
- Location
- Contacts
- Photos or Videos
- Audio Data
- Health and Fitness
- Financial Info
- Sensitive Info
- Advertising Data
- Browsing History
- Search History
- Purchases

## 4. App Store Connect 填写注意

- `User Content` 必须覆盖用户提交文本/链接和生成后的学习内容，因为这些内容会存储在服务端用于恢复章节。
- `Identifiers` 必须覆盖匿名设备 ID 和 APNs token，因为它们用于数据归属、通知和额度控制。
- `Usage Data` 必须覆盖学习进度、答题、收藏、反馈和额度记录。
- `Diagnostics` 建议声明，因为生产诊断会记录生成失败类型、队列状态、推送结果和脱敏错误类别。
- 所有已声明数据类型均应选择“不用于追踪”。
- 如果首版暂不做 Apple 登录，App Privacy 不应写成已有账号系统。
- 如果首版加入 Apple 登录，需要同步确认是否新增 Contact Info 或 User ID 相关填写，并且必须完成账号删除入口。
- 如果支持邮箱只是用户主动从邮件客户端联系，不是 App 内收集邮箱，首版可不声明 Contact Info。

## 5. 与其他材料的一致性检查

提交前需要确认以下材料一致：

- `docs/privacy-policy-zh.md`
- `docs/privacy-policy.html`
- `docs/app-store-review-submission-pack-zh.md`
- `docs/app-store-metadata-zh.md`
- `docs/app-store-privacy-labels.json`

可运行：

```bash
npm run app-store:privacy-labels-audit
```

严格提交前运行：

```bash
npm run check:app-store-privacy-labels
```
