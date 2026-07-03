# App Store 截图审计工具记录

日期：2026-07-03

## 本次完成

新增截图审计命令：

```bash
npm run app-store:screenshot-audit
npm run check:app-store-screenshots
```

默认扫描目录：

```text
docs/app-store-release-evidence/screenshots/app-store/
```

截图交付目录说明：

```text
docs/app-store-release-evidence/screenshots/app-store/README.md
```

## 检查内容

- 截图数量是否为 1-10 张。
- 文件格式是否为 `.png`、`.jpg` 或 `.jpeg`。
- 是否为竖屏。
- 是否符合 6.9 英寸 iPhone 竖屏规格：
  - `1260x2736`
  - `1290x2796`
  - `1320x2868`
- 是否覆盖建议的 6 个文件名前缀：
  - `01-home-learning-path`
  - `02-add-article`
  - `03-generating`
  - `04-chapter-detail`
  - `05-question-card`
  - `06-discover-recommendations`

## 官方依据

Apple App Store Connect Screenshot specifications 要求上传 1 到 10 张 `.jpeg`、`.jpg` 或 `.png` 截图，并列出 6.9 英寸 iPhone 竖屏尺寸为 `1260 x 2736`、`1290 x 2796`、`1320 x 2868`。

参考：https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications

## 本次补充

2026-07-03 补充 `screenshots/app-store/README.md`，把截图文件名前缀、6.9 英寸尺寸、截图前排雷清单和验收命令放到截图目录本身，避免截图素材交付时脱离主清单。

## 当前状态

当前目录尚未放入正式 App Store 截图，因此：

```bash
npm run app-store:screenshot-audit
```

会以 report 模式显示 `NOT READY`，但不阻塞日常开发。

等截图放入目录后，提交前运行：

```bash
npm run check:app-store-screenshots
```

该 strict 模式会在截图不符合规格时失败。
