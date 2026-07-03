# Recallo App Store 截图交付目录

把最终要上传到 App Store Connect 的截图放在本目录。截图必须来自正确的 Recallo Release/TestFlight 包，不能来自旧工程、旧 UI、Mock 页面或本地 fixture。

## 推荐文件名

Apple 硬要求是每个本地化 1 到 10 张截图；Recallo 首版建议准备 6 张，用来完整展示核心体验。推荐文件名使用下面前缀，扩展名可以是 `.png`、`.jpg` 或 `.jpeg`：

```text
01-home-learning-path.png
02-add-article.png
03-generating.png
04-chapter-detail.png
05-question-card.png
06-discover-recommendations.png
```

## 技术规格

- 数量：Apple 硬要求 1 到 10 张；首版产品展示目标为 6 张。
- 方向：竖屏。
- 设备规格：6.9 英寸 iPhone 竖屏。
- 可接受尺寸：
  - `1260x2736`
  - `1290x2796`
  - `1320x2868`
- 格式：`.png`、`.jpg` 或 `.jpeg`。

官方依据：Apple App Store Connect Screenshot specifications。

## 截图前检查

截图前先确认：

- App 图标和显示名称是 Recallo。
- 不是旧“拾贝”工程或旧 TestFlight 包。
- 首页、章节详情、做题页、发现页都是真实数据或正式预置数据。
- 不出现 `fixture`、`Railway`、`JSON decode`、`Application failed to respond`、旧品牌名或调试开关。
- 底部安全区、圆形按钮高度、主要按钮位置没有明显错位。

## 验收命令

放入截图后先跑 report：

```bash
npm run app-store:screenshot-audit
```

提交 App Store 前跑 strict：

```bash
npm run check:app-store-screenshots
```

strict 通过表示截图满足 App Store 基础规格；如果仍有推荐文件名 warning，表示产品展示清单还没完全覆盖，但不是 Apple 截图规格硬失败。
