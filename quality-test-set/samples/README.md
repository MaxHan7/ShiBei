# 真实样本目录

这个目录只放真实用户可能添加给拾贝的内容，计入题目质量 baseline。人工构造边界样本请放到 `quality-test-set/synthetic-samples/`。

## 样本选择标准

适合放入：

- 真实公众号文章正文。
- 真实网页文章正文或 HTML 清洗后的正文。
- 真实用户笔记、社群内容、备忘录内容。
- 真实视频字幕、视频摘要或用户观看笔记。
- 产品、AI、大模型、增长、商业、设计等拾贝目标用户会收藏的内容。

不适合放入：

- 纯粹为了测试规则而人工写出的样本。
- 无法追溯来源或疑似拼接污染的内容。
- 含隐私、账号、商业机密的内容。
- 未授权的大段受版权保护内容，如果不适合提交到仓库，应只在本地临时运行。

## 命名规范

推荐格式：

```text
wechat-<slug>.md
web-<domain>-<slug>.md
note-<topic>-<slug>.md
video-<platform>-<slug>.md
```

示例：

```text
wechat-ai-agent-workflow.md
web-ycombinator-agent-market.md
note-product-positioning-2026.md
video-bilibili-ai-search-summary.md
```

## 样本头部元数据

新增样本建议使用 YAML-like 头部。旧样本没有头部也可以运行，脚本会默认 `unknown`。

```markdown
---
title: "文章标题"
sourceType: "wechat_article"
topic: "ai_product"
difficulty: "medium"
structureType: "argument"
expectedFocus: ["核心观点", "关键误区", "方法边界"]
reviewPriority: "baseline"
---

正文内容...
```

字段说明：

| 字段 | 说明 | 推荐值 |
| --- | --- | --- |
| `title` | 样本标题 | 原文标题或人工可读标题 |
| `sourceType` | 内容来源类型 | `wechat_article` / `web_article` / `user_note` / `video_summary` / `html_article` |
| `topic` | 主题 | `ai_product` / `growth` / `business` / `design` / `engineering` / `other` |
| `difficulty` | 内容理解难度 | `easy` / `medium` / `hard` |
| `structureType` | 文章结构 | `argument` / `list` / `tutorial` / `interview` / `memo` / `mixed` |
| `expectedFocus` | 人工期望覆盖的重点 | 数组，写核心观点、方法边界、误区等 |
| `reviewPriority` | 是否计入主要 baseline | `baseline` / `candidate` / `local_only` |

## 覆盖目标

短期先扩展到 10 篇：

- 3 篇 AI / 大模型观点或产品文。
- 2 篇产品/商业方法论。
- 2 篇清单或机会点文章。
- 1 篇长访谈整理。
- 1 篇结构松散 HTML 页面。
- 1 篇用户笔记或视频摘要。

稳定后扩展到 20-30 篇，作为每次 prompt 或质量规则调整前后的固定对比集。
