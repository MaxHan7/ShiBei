# Recallo App Store 截图清单

> 本清单用于准备 App Store Connect 产品页截图。截图必须来自正确的 Recallo Release/TestFlight 包，不得使用旧工程、旧图标、旧 UI 或 Mock 页面。

## 技术规格

- 来源：真实 iPhone 或 iOS Simulator 中的 Release/TestFlight 包。
- 数量：Apple 允许每个本地化上传 1 到 10 张截图；Recallo 首版产品展示建议准备 6 张。
- 格式：`.png`、`.jpg` 或 `.jpeg`。
- 方向：竖屏。
- 首选设备：6.9 英寸 iPhone 截图；若 UI 在各尺寸一致，可让 App Store Connect 缩放。
- 可接受尺寸：`1260x2736`、`1290x2796`、`1320x2868`。
- 禁止出现：旧“拾贝”品牌名、旧图标、debug 文案、fixture 文案、Railway 文案、JSON/decode/本地数据缺失提示。

截图保存目录：

```text
docs/app-store-release-evidence/screenshots/app-store/
```

目录内交付说明：

```text
docs/app-store-release-evidence/screenshots/app-store/README.md
```

推荐文件名：

```text
01-home-learning-path.png
02-add-article.png
03-generating.png
04-chapter-detail.png
05-question-card.png
06-discover-recommendations.png
```

保存后先运行 report 模式：

```bash
npm run app-store:screenshot-audit
```

提交前运行 strict 模式。strict 只拦截 Apple 基础规格问题；推荐 6 张场景缺失会输出 warning，仍建议补齐后再提交：

```bash
npm run check:app-store-screenshots
```

## 截图 1：首页学习路径

- 目标：展示 Recallo 的核心结果不是摘要，而是可继续学习的路径。
- 画面：首页有正在学习章节、学习路径节点、底部 Tab。
- 推荐文案：把文章变成练习题
- 检查点：
  - 顶部按钮位置正确。
  - 当前章节标题真实，不是 Mock。
  - 没有空状态或生成中章节抢占正在学习章节。

## 截图 2：添加文章

- 目标：展示用户可以从文章链接或文字开始。
- 画面：添加页输入框、开始生成按钮、视觉状态完整。
- 推荐文案：粘贴链接，生成学习章节
- 检查点：
  - 按钮可读、未越界。
  - 没有调试 URL、Railway、mock switch。
  - 如果展示 AI 说明，文案应和隐私政策一致。

## 截图 3：生成中页面

- 目标：展示生成过程可预期，完成后会通知。
- 画面：章节正在生成、进度条、查看原文按钮、取消生成按钮。
- 推荐文案：生成完成会提醒你
- 检查点：
  - 阶段文案简短、用户可理解。
  - 没有模型内部字段或 schema 错误。
  - 取消生成按钮不遮挡安全区。

## 截图 4：章节详情

- 目标：展示生成后的章节结构和开始/继续学习入口。
- 画面：章节标题、作者/查看原文、文章核心、知识点列表、开始学习按钮。
- 推荐文案：知识点和题目已整理好
- 检查点：
  - 知识点全部可展示或可滚动查看。
  - 作者字段不是空或占位。
  - 删除按钮和返回按钮位置一致。

## 截图 5：做题页面

- 目标：展示 Recallo 用题卡帮助用户检查理解。
- 画面：选择题或连线题，选项排版清楚。
- 推荐文案：用题卡检查理解
- 检查点：
  - 题干和选项层级明显。
  - 选项没有文字截断或不合理省略。
  - 连线题卡片高度统一且间距一致。

## 截图 6：发现页推荐好文

- 目标：展示新用户可以从精选内容快速体验核心流程。
- 画面：发现页 Banner、精简后的 filter、推荐文章卡片和封面。
- 推荐文案：从精选好文开始学习
- 检查点：
  - filter 可横向滚动，不顶到屏幕边缘。
  - 封面图真实显示。
  - 推荐文章不是只有一篇，标题/作者/tag 可读。

## 提交前总检查

- [ ] 截图来自正确 Recallo build。
- [ ] `npm run check:app-store-screenshots` 通过。
- [ ] 截图里 App 名、图标、颜色、字体都是新版本。
- [ ] 没有旧品牌、旧 UI、旧工程路径或调试文案。
- [ ] 每张截图都有明确场景和价值。
- [ ] 截图文案不承诺“永久保存”“无限生成”“完全准确”等无法保证的能力。
- [ ] 截图与 App Store 描述、隐私政策、审核说明一致。
