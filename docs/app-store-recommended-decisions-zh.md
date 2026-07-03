# Recallo App Store 首版推荐决策稿

> 本文档不是最终决策表。它的作用是把 `docs/app-store-user-decision-form-zh.md` 里需要用户拍板的项，整理成可以直接确认的一版推荐填法。用户确认后，Codex 再把最终值回写到决策表、隐私政策、支持页、App Store 元数据、审核包和提交门禁。

## 1. 推荐采用的最快首版方案

适用目标：尽快进入 TestFlight / App Store 首版中度范围测试，同时不引入订阅、账号系统、广告或第三方增长 SDK 的额外复杂度。

| 项目 | 推荐最终值 | 原因 |
| --- | --- | --- |
| 首版价格 | 免费 | 降低审核和测试门槛，避免首版商业化配置复杂度。 |
| 首版 IAP / 订阅 | 不启用 | 订阅、恢复购买、退款说明和 StoreKit 测试后置。 |
| 每日真实 AI 生成额度 | 每天 3 篇，按 UTC day | 已有服务端额度保护，能控制模型成本和滥用风险。 |
| 推荐好文是否计入额度 | 不计入 | 推荐好文是预生成内容，适合新用户快速体验核心流程。 |
| 匿名用户是否可直接生成 | 可以，不强制登录 | 保持首屏体验顺滑，避免测试用户被账号流程挡住。 |
| 首版 Apple 登录 | 快速首版暂不做 | 最快路径；但必须在隐私/账号说明里明确匿名数据恢复边界。 |
| 匿名数据恢复边界 | 接受，并明确重装、换机、系统重置可能无法恢复 | 当前匿名设备身份无法保证跨设备恢复，这是必须对用户透明说明的边界。 |
| 删除账号入口 | 首版不适用；保留删除当前设备数据入口 | 未提供账号时，不提供“删除账号”；但仍要提供删除当前匿名设备数据。 |
| 分类 | Education，Secondary Productivity | 产品核心是把内容转成学习材料。 |
| App Store 截图 | 6 张 6.9 英寸 iPhone 竖屏截图 | 覆盖首页、添加、生成、章节详情、做题、发现页。 |

## 2. 更稳但更慢的正式版方案

适用目标：如果希望首版就减少匿名数据恢复争议，并为更大范围公开测试做准备。

| 项目 | 推荐最终值 | 额外工作 |
| --- | --- | --- |
| 首版 Apple 登录 | 加入可选 Apple 登录 | 需要前端登录入口、后端账号绑定、匿名数据合并、测试矩阵。 |
| 删除账号入口 | 必须同步做 | Apple 审核要求：如果支持创建账号，必须提供账号删除能力。 |
| 隐私政策 | 增加 Apple 登录身份数据说明 | 需要同步 App Privacy 标签和审核备注。 |
| 验收 | 增加登录、退出、删除账号、匿名数据绑定验收 | 测试周期会变长。 |

如果目标是“先尽快 TestFlight + 小范围 App Store 首版”，推荐先采用第 1 节快速首版方案，并把 Apple 登录列入上架后 P1。

## 3. 需要用户提供的最终信息

这些信息 Codex 无法自动决定或创建，需要用户提供：

| 信息 | 用户需要给什么 | 例子 |
| --- | --- | --- |
| 支持邮箱 | 一个可公开接收用户反馈的邮箱 | `support@recallo.example` |
| Privacy Policy URL | 已公开托管、HTTPS 可访问的隐私政策地址 | `https://example.com/privacy` |
| Support URL | 已公开托管、HTTPS 可访问的支持页地址 | `https://example.com/support` |
| 是否采用快速首版方案 | 回复“采用快速首版方案”或指出要改的项 | “采用快速首版方案，但每日额度改 5 篇” |
| 真机验收结论 | 是否还有 P0 / 未豁免 P1 | “无 P0，无未豁免 P1” |
| App Store 截图 | 6 张正式截图放入指定目录 | `docs/app-store-release-evidence/screenshots/app-store/` |
| Xcode Archive 确认 | Archive 里名称、图标、Bundle ID 是否正确 | “Archive 显示 Recallo、新图标、com.maxhan.shibei” |
| App Store Connect 确认 | 是否选择旧 bundle id 对应 App | “已确认在 com.maxhan.shibei 的旧 App 下提交” |

## 4. 用户可直接回复的模板

用户可以直接复制下面这段并填写尖括号内容：

```text
采用快速首版方案。

支持邮箱：<填写邮箱>
Privacy Policy URL：<填写公开 HTTPS URL>
Support URL：<填写公开 HTTPS URL>

每日真实 AI 生成额度：每天 3 篇，按 UTC day
推荐好文不计入额度：确认
匿名用户可直接生成：确认
首版暂不做 Apple 登录，并接受匿名数据恢复边界：确认
首版不启用 IAP/订阅：确认

App Store 元数据：
App Name：Recallo
Subtitle：把文章变成练习题
Promotional Text：把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。
Category：Education
Secondary Category：Productivity
Keywords：学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习

真机验收：<无 P0 / 有 P0；无未豁免 P1 / 有未豁免 P1>
App Store 截图：<已准备 / 未准备>
Archive 确认：<名称/图标/Bundle ID 是否正确>
App Store Connect 确认：<是否在 com.maxhan.shibei 对应 App 下提交>
```

## 5. 用户确认后 Codex 自动执行

用户确认并补齐第 3 节信息后，Codex 自动执行以下动作：

1. 用 `npm run app-store:create-fast-release-inputs` 把用户回复生成成两份标准 JSON：`.release/app-store-inputs/decision-values.json` 和 `.release/app-store-inputs/contact-values.json`。
2. 运行 `npm run app-store:apply-decisions -- .release/app-store-inputs/decision-values.json`，回写 `docs/app-store-user-decision-form-zh.md`。
3. 更新 `docs/privacy-policy-zh.md` 和 `docs/privacy-policy.html`。
4. 更新 `docs/support-zh.md` 和 `docs/support.html`。
5. 更新 `docs/app-store-metadata-zh.md`。
6. 更新 `docs/app-store-review-submission-pack-zh.md`。
7. 更新 `docs/app-store-user-action-checklist-zh.md`。
8. 更新 `docs/app-store-archive-submit-runbook-zh.md`。
9. 运行 `npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json`，把支持邮箱和 URL 同步到所有提交材料。
10. 运行：

```bash
npm run app-store:create-fast-release-inputs -- <用户最终字段> --dry-run
npm run app-store:apply-decisions -- .release/app-store-inputs/decision-values.json --dry-run
npm run app-store:apply-contact -- .release/app-store-inputs/contact-values.json --dry-run
npm run app-store:decision-report
npm run app-store:user-actions
npm run app-store:status
npm run check:app-store-submit
npm run check:release-ios
npm run check
```

通过条件：

- 决策表没有 `待填写`。
- Support URL / Privacy URL 是公开 HTTPS URL。
- 支持邮箱不是占位符。
- 截图检查通过。
- `npm run check:app-store-submit` 通过。
- `npm run check:release-ios` 通过。
- `npm run check` 通过。
- 真机验收无 P0 / 未豁免 P1。
