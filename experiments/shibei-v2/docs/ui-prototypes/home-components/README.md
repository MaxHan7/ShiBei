# V2 Home Components HTML Prototype

这个目录保存 V2 前端视觉探索过程中已经对齐的一份长期 HTML prototype。它从 `.superpowers/brainstorm/.../content/bottom-nav-figma-spec.html` 归档而来，避免后续讨论依赖被 git 忽略的临时目录。

## 用途

- 继续做主页、底部导航、路径节点、题卡状态、上传页等 UI 堆栈实验。
- 在迁移 SwiftUI 前，作为视觉结构、组件状态和层级关系的参考。
- 保存用户已经提供并验证过的 SVG 资产，方便后续拆入 Xcode asset catalog。

## 入口

- `index.html`

直接用浏览器打开即可查看当前 HTML mock。

## 边界

- HTML mock 用于认知对齐和视觉实验，不是正式 SwiftUI 代码。
- SwiftUI 实现时应复用 `design.md` 和 `v2-frontend-implementation-notes-zh.md` 中沉淀的 token、组件和层级规则。
- Figma 手动拖拽产生的轻微位置差异不应硬编码进 SwiftUI；正式实现要根据 safe area、真实屏幕尺寸、阅读性和触控舒适度调整。
- SVG 资产可作为后续正式素材来源；真实文案、输入框、按钮和动态内容仍应由 SwiftUI 原生组件渲染。

## 当前包含的重点模块

- 底部导航栏与 tab icon 状态。
- 首页路径节点、S 型路径和节点状态。
- 当前章节 banner 与节点弹窗。
- 选择题、连线题和答后反馈状态。
- 章节完成页。
- 上传页，包括 IP 后层、输入卡片、IP 前层的三层遮挡关系。
- 通知页，包括生成成功/失败两类通知卡片和状态 icon。
- 发现页，包括推荐文章 hero、分类 chip、文章推荐卡片和发现 tab 选中态。
