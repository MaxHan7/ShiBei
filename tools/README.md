# Tools

这个目录存放迁移前的可选辅助工具。

当前工具：

- `fetch-wechat-article.js`：尝试用 Playwright 抓取微信公众号文章正文并保存为 Markdown。
- `install-official-ios.sh`：构建并安装正式 iOS App。它只使用 `拾贝/拾贝.xcodeproj` 的 `Recallo` scheme，并校验 `com.maxhan.shibei` 与显示名 `Recallo`，用于避免误装历史实验工程。

注意：

- 公众号抓取受平台限制，不保证成功。
- 如果抓取失败，建议改为手动粘贴正文。
- 不要把 API Key 或隐私内容写入工具脚本。
- 不要用 `experiments/shibei-v2/ios/拾贝.xcodeproj` 覆盖正式 App；该工程只保留为历史实验参考。
