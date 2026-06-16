# 拾贝 V2 Asset Manifest

本文档只记录可保存为文件的视觉资产，以及参考图的处理方式。它不记录代码组件的完整规格；组件规格见 `component-registry.md`。

## 资产处理原则

- `asset`：可以作为独立视觉资源进入工程，例如 IP 形象、icon、勋章、装饰植物、文章缩略图。
- `reference only`：完整页面、完整卡片、完整 banner、状态总览大图，只用于校准尺寸、层级、颜色、字体和间距，不直接作为正式 UI。
- `source sprite / historical reference`：早期合并源或历史裁切源，只用于审计，不再作为真实页面渲染源。

## iOS / SwiftUI 落地方式

- Figma 是源头；仓库内 `design-assets/` 保存设计阶段的 SVG/PNG 源文件和参考文件。
- 正式进入 iOS 时，最终资产应进入 Xcode Asset Catalog。
- 独立 icon、IP、勋章、装饰等优先保持同画布矢量资产。若 Xcode 对 SVG 渲染稳定，可以使用 SVG；若兼容性或描边表现不稳，从同一个 Figma frame 导出 PDF vector。
- 多状态 icon 必须保持同尺寸透明 frame，例如底部导航普通 tab 统一 `32 x 32`。不能再按可见图形 bbox 裁切。
- 分层 IP 需要按层导出，例如 body/back layer 与 hand/front layer 分开。SwiftUI 用 `ZStack` 夹入动态卡片或输入框。
- 动态文字、按钮、卡片、chip、题目选项、通知卡、章节卡不作为 SVG 资产。它们由 SwiftUI 代码组件绘制。

## Final / Direct Assets

| Asset | Category | Usage |
| --- | --- | --- |
| `nav-icons-32frame-source.svg` | asset source | 底部导航 4 个普通 tab 的 selected/inactive 状态，统一 `32 x 32` frame |
| `upload-tab-button.svg` | design source | 底部导航中间上传按钮，统一 `60 x 60` frame；SwiftUI 按该源文件参数代码绘制，避免 SVG filter/dropShadow 在 iOS 中渲染偏差 |
| `circle-button-back.svg` | asset | 返回圆形按钮 icon 参考/源 |
| `circle-button-source.svg` | asset | 查看原文/详情圆形按钮 icon 参考/源 |
| `circle-button-notification.svg` | asset | 首页/顶部通知圆形按钮 |
| `circle-button-profile.svg` | asset | 首页/顶部个人主页圆形按钮 |
| `mascot-static.svg` | asset | 首页路径旁静态 IP |
| `summary-mascot-body-layer.svg` | asset | 章节概要页 IP 身体后层 |
| `summary-mascot-hands-layer.svg` | asset | 章节概要页 IP 手部前层 |
| `unit-overview-mascot.svg` | asset | 知识点开场白板讲解 IP |
| `mascot-feedback-back.svg` | asset | 答后反馈 IP 后层 |
| `mascot-feedback-front.svg` | asset | 答后反馈 IP 前层/手部 |
| `upload-mascot-back.svg` | asset | 上传页 IP 后层 |
| `upload-mascot-front.svg` | asset | 上传页 IP 前层/手和笔记本 |
| `upload-link-icon.svg` | asset | 上传输入框链接 icon |
| `notification-mascot.svg` | asset | 通知页 IP |
| `notification-success-icon.svg` | asset | 通知成功 icon |
| `notification-failure-icon.svg` | asset | 通知失败 icon |
| `materials-mascot.svg` | asset | 全部章节/资料页 IP |
| `chapter-source-icon.svg` | asset | 章节来源 icon |
| `notes-mascot.svg` | asset | 笔记页 IP |
| `notes-bookmark.svg` | asset | 笔记卡收藏 icon |
| `notes-summary-wave.svg` | asset | 笔记页顶部 banner 波形 |
| `discover-hero-mascot.svg` | asset | 发现页 hero IP |
| `discover-article-thumbnail.svg` | asset | 推荐文章缩略图示例 |
| `profile-stat-reviewed.svg` | asset | 个人主页“已复习知识点”统计 icon |
| `profile-stat-streak.svg` | asset | 个人主页“连续学习”统计 icon |
| `profile-setting-notification.svg` | asset | 个人主页通知设置 icon |
| `profile-setting-privacy.svg` | asset | 个人主页隐私/帮助 icon |
| `profile-setting-account.svg` | asset | 个人主页账号/个人资料 icon |
| `mascot-completion.svg` | asset | 单元总结页 IP |
| `completion-medal.svg` | asset | 单元总结页勋章 |
| `completion-grade-rays.svg` | asset | 单元总结标题装饰 |
| `chapter-completion-mascot.svg` | asset | 章节总结页 IP |
| `chapter-completion-title-rays.svg` | asset | 章节总结标题装饰 |
| `bg-deco-left-hill-plant.svg` | asset | 背景装饰植物/地形 |
| `bg-deco-right-hill-plant.svg` | asset | 背景装饰植物/地形 |
| `bg-deco-small-plant-cluster.svg` | asset | 背景小植物装饰 |

## Reference Only Assets

| Asset | Why reference only |
| --- | --- |
| `bottom-nav-learning-reference.svg` | 完整导航参考，不整图渲染 |
| `nav-icons-states-source.svg` | 旧合并状态源，只保留历史审计 |
| `path-cycle-node-placement-reference.svg` | 路径周期与节点放置参考，实际由路径模板和数据计算 |
| `path-node-states-base.svg` | 节点状态参考，实际节点由 SwiftUI 组件绘制 |
| `chapter-overview-page-reference.svg` | 章节概要整页参考 |
| `answer-feedback-layer-reference.svg` | 答后反馈层级参考 |
| `answer-feedback-panel-reference.svg` | 答后反馈面板外形参考，面板内容和按钮由代码绘制 |
| `upload-page-figma-reference.png` | 上传页视觉参考截图 |
| `notification-page-figma-reference.png` | 通知页视觉参考截图 |
| `materials-page-figma-reference.png` | 全部章节/资料页视觉参考截图 |
| `notes-page-figma-reference.png` | 笔记页视觉参考截图 |
| `notes-card-reference.svg` | 笔记卡排版参考，卡片由代码绘制 |
| `notes-summary-card-reference.svg` | 笔记顶部卡片参考，卡片由代码绘制 |
| `discover-page-figma-reference.png` | 发现页视觉参考截图 |
| `discover-hero-banner.svg` | 发现页 hero banner 参数参考，不整图渲染 |
| `discover-filter-chip-states-reference.svg` | 发现页 chip 状态参数参考，chip 由代码绘制 |
| `discover-article-card-reference.svg` | 推荐文章卡三层结构参考，卡片由代码绘制 |
| `profile-page-figma-reference.png` | 个人主页视觉参考截图 |
| `profile-stat-card-reference.svg` | 个人主页统计卡排版参考，卡片由代码绘制 |
| `profile-stat-icons.svg` | 历史合并资产，已拆成独立统计 icon |
| `profile-settings-icons.svg` | 历史合并资产，已拆成独立设置 icon |
| `summary-mascot-body.svg` | 早期章节概要 IP 身体参考，优先使用分层版 |
| `summary-mascot-complete-reference.svg` | 章节概要/总结类完整参考，不整图渲染 |

## 每次新增资产的登记模板

| Field | Required content |
| --- | --- |
| Asset name | 稳定文件名，语义命名，不用临时截图名 |
| Source | Figma export / 用户粘贴 SVG / HTML mock reference |
| Category | asset / reference only / historical source |
| Canvas | viewBox 或导出 frame，例如 `32 x 32` |
| Final usage | 被哪个 SwiftUI 组件引用 |
| iOS treatment | SVG asset / PDF vector / PNG image / code redraw |
| Notes | 是否需要用户确认、是否只作参考 |
