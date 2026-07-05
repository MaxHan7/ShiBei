# Recallo App Store 元数据草案

本文档用于准备 TestFlight 扩大测试、App Store Connect 和 App Store 首版提交。当前目标是一个免费、无广告、无 IAP 的 Recallo 首版候选包；商业化、账号同步和订阅能力进入后续版本规划。

## 基础信息

- App 名称：Recallo
- Bundle ID：`com.maxhan.shibei`
- 平台：iPhone
- 方向：竖屏
- 最低系统：iOS 26
- 当前商业模式：App Store 首版免费
- 后续规划：账号登录、跨设备同步、订阅能力

## 副标题候选

限制：30 个字符以内。

1. 把文章变成复习题
2. 读过的内容，真的记住
3. 从碎片信息生成复习
4. AI 知识点与复习题

推荐第一版：把文章变成复习题

## App Store Connect 可填写版本

| 字段 | 建议内容 | 状态 |
| --- | --- | --- |
| App Name | Recallo | 已定 |
| Subtitle | 把文章变成练习题 | 已确认 |
| Promotional Text | 把文章、长文和好内容变成知识点与练习题，让阅读真正变成可以继续学习的进度。 | 已确认 |
| Privacy Policy URL | https://shibei-production.up.railway.app/privacy | 已确定 |
| Support URL | https://shibei-production.up.railway.app/support | 已确定 |
| Category | Education | 建议 |
| Secondary Category | Productivity | 可选 |
| Price | Free | 已确认 |
| In-App Purchases | 首版不启用 | 已确认 |

## What’s New 草案

首个 Recallo TestFlight 候选版本：

- 全新 Recallo 品牌、启动页和主流程视觉。
- 支持把文章链接或文字生成学习章节。
- 支持知识点、练习题、解释、收藏和学习进度。
- 支持生成完成/失败通知和当前设备数据删除。
- 增加 AI 处理说明、每日免费生成额度和上架前隐私说明。

## App 描述草案

Recallo 是一款帮助你吸收新知识的学习工具。

每天都有大量值得学习的文章、观点和信息，但它们通常太新、太散，很难被及时整理成系统课程。Recallo 希望帮你把这些碎片内容转化为可以学习、可以测试、可以追踪的知识。

你可以粘贴一段文字或一篇文章链接，Recallo 会自动提取知识点，生成练习题，并保留来源上下文。学习时，你不仅能答题，还能在解释页回到原文依据，确认自己真正理解了内容。

主要功能：

- 添加文字或文章链接
- 自动生成章节、知识点和练习题
- 通过题卡进行轻量学习
- 答错后查看解释和来源上下文
- 对有问题的题目进行反馈
- 删除当前测试设备下的数据

当前版本处于 Beta 测试阶段，使用匿名设备身份保存数据。未来版本会支持账号登录、跨设备同步和订阅能力。

## App Store Description 可复制版本

Recallo 是一款帮助你把文章和长内容真正学进去的学习工具。

每天都有大量值得学习的文章、观点和信息，但它们通常太新、太散，很难被及时整理成系统课程。Recallo 会把你提交的文章链接或文字整理成学习章节，提取知识点，生成练习题，并保留来源上下文。

你可以用 Recallo：

- 添加文章链接或文字
- 生成知识点、学习路径和练习题
- 通过题卡检查自己是否真正理解
- 答错后查看解释和来源依据
- 收藏题目，继续之前的学习进度
- 接收生成完成或失败提醒

当前版本不强制登录账号，使用匿名设备身份保存当前设备下的数据。你提交的内容会上传到 Recallo 云端，并可能经第三方 AI 模型服务处理，用于生成学习材料。App 内提供 AI 处理说明、隐私说明和删除当前设备数据的入口。

Recallo 适合想把文章、观点、产品案例、AI 内容和深度阅读变成可复习知识的人。

## 关键词草案

限制：100 字符以内，逗号分隔，不使用竞品名。

学习,知识管理,文章,AI,记忆,题库,阅读,笔记,知识点,碎片知识,练习

字符数核对：31 个中文/ASCII 字符，不含 App Store Connect 额外转义。

## 分类建议

主分类：教育

备选分类：效率

选择理由：Recallo 的核心行为是把内容转化为学习材料，用户目标是学习和记忆，而不是通用笔记或项目管理。

## TestFlight 测试说明草案

感谢你参与 Recallo Beta 测试。

请用一篇你最近真正想学习或记住的文章进行测试：

1. 打开“添加”，粘贴文章链接或一段文字。
2. 等待系统生成章节和练习题。
3. 完成一轮学习。
4. 在答错后查看解释和完整来源。
5. 对一道你觉得不准确或没帮助的题进行反馈。
6. 第二天再次打开 App，看看是否愿意继续复习。

请重点反馈：

- 第一次添加是否顺畅
- 生成等待是否可以接受
- 题目是否真的帮助理解和记忆
- 来源和解释是否建立信任
- 哪一步最想退出

## App Review 备注草案

Recallo 当前不需要账号登录即可使用。App 使用匿名设备身份保存当前设备下的章节、学习记录和通知状态。

审核人员可以直接打开 App，在“添加”页面粘贴一段文字或文章链接，等待云端生成复习章节，然后进入复习流程。当前版本不包含付费功能、不包含外部支付链接、不接入广告、不进行跨 App 或跨网站追踪。

用户提交的内容会上传到 Recallo 云端，用于生成知识点和练习题；生成过程中可能会发送给第三方 AI 模型服务处理。App 会在用户首次真实生成前展示 AI 处理说明，并在用户允许后发送生成完成或失败通知。App 内“我的”页面提供隐私说明和“删除我的数据”入口。

## 隐私标签建议

第一版建议在 App Store Connect 中声明：

- User Content：用户提交文本/链接、生成章节和题目。
- Identifiers：匿名设备 ID、APNs token。
- Usage Data：学习进度、答题结果、题目反馈、收藏、通知状态、每日生成额度使用。
- Diagnostics：错误类型、生成失败码和必要服务诊断信息。

不声明：

- Tracking
- Advertising Data
- Location
- Contacts
- Photos or Videos
- Audio Data
- Health and Fitness
- Financial Info

## 截图脚本

第一组截图建议使用 6 张：

1. 首页：展示当前章节和复习入口。
2. 添加页：展示粘贴文章或文字。
3. 生成中页面：展示等待进度和完成后通知。
4. 章节详情：展示知识点和题目数量。
5. 做题页面：展示选择题或连线题学习。
6. 发现页：展示推荐好文和预置学习内容。

截图文案方向：

- 把文章变成复习题
- 从碎片信息提取知识点
- 用题卡检查是否真的理解
- 答错后回到原文依据
- 让新知识留下来

截图技术要求：

- 从正确 Recallo Release/TestFlight 包截取，不使用旧工程、旧 UI 或 Mock 页面。
- 截图数量：1 到 10 张；首版建议 6 张。
- 格式：PNG、JPG 或 JPEG。
- 方向：iPhone 竖屏。
- 首选 6.9 英寸 iPhone 截图；如果 UI 一致，可由 App Store Connect 缩放到较小尺寸。
- 不出现调试文案、fixture 文案、Railway 文案、旧“拾贝”品牌名或旧图标。
- 截图不承诺“永久保存”“无限生成”“自动掌握”等无法保证的能力。

## 年龄分级问卷建议答案

App Store Connect 年龄分级必须在当前线上页面重新填写。Apple 2026 年提交流已经使用新的年龄值和问卷口径；不要复用旧 TestFlight/旧 App Store 记录。

| 问题方向 | 建议答案 | 说明 |
| --- | --- | --- |
| Cartoon or Fantasy Violence | None | 产品没有暴力内容。 |
| Realistic Violence | None | 产品没有暴力内容。 |
| Prolonged Graphic or Sadistic Realistic Violence | None | 产品没有此类内容。 |
| Profanity or Crude Humor | None | App 自身不提供此类内容；用户输入内容不可控但不作为内容社区展示。 |
| Mature/Suggestive Themes | None | App 自身不提供此类内容。 |
| Horror/Fear Themes | None | App 自身不提供此类内容。 |
| Medical/Treatment Information | None | 不提供医疗建议。 |
| Alcohol, Tobacco, Drug Use or References | None | App 自身不提供此类内容。 |
| Gambling | None | 无博彩功能。 |
| Unrestricted Web Access | No | 用户可提交文章链接，但 App 不提供通用网页浏览器。 |
| User-Generated Content | No community publishing | 用户输入只用于个人学习生成，不公开给其他用户。 |

填完后需要保存两类证据：

- App Store Connect 年龄分级完成页截图。
- `.release/app-store-inputs/external-console-checks.json` 中 `appStoreConnect.ageRatingCompleted=true`。

如 App Store Connect 问卷出现本表没有覆盖的新项，按真实产品能力填写，并把新项截图发给 Codex 更新本文档。

## 上线前仍需确认

- 隐私政策 URL 已公开可访问。
- Apple Developer 中已创建 `com.maxhan.shibei` App ID。
- App Store Connect 中已创建 App。
- Release 包无 Mock、Railway、deviceId、JSON decode 等工程文案。
- Release 包已开启 Push Notifications capability，生成完成/失败系统通知可在真机收到。
- 账号系统在大范围测试前进入开发计划。
- 订阅功能上线前必须使用 Apple IAP，并补充订阅条款、恢复购买和 StoreKit 测试。
