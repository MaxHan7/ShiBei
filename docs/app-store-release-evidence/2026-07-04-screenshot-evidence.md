# Recallo App Store Screenshot Evidence

repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
generatedAt=2026-07-04T06:48:39.131Z
source=docs/app-store-release-evidence/screenshots/app-store
status=NOT READY
count=0

## Purpose

This evidence file records the exact screenshot files prepared for App Store Connect. It is intentionally separate from visual approval: the user still owns taking and approving final screenshots, while Codex records file identity, dimensions, scene coverage, and the automated screenshot audit result.

## Screenshot Files

| File | Dimensions | Size | SHA-256 |
| --- | --- | --- | --- |
| - | - | - | - |

## Recommended Scene Coverage

| Prefix | Scene | Present |
| --- | --- | --- |
| `01-home-learning-path` | 首页学习路径 | NO |
| `02-add-article` | 添加文章 | NO |
| `03-generating` | 生成中页面 | NO |
| `04-chapter-detail` | 章节详情 | NO |
| `05-question-card` | 做题页面 | NO |
| `06-discover-recommendations` | 发现页推荐好文 | NO |

## Current Interpretation

- Screenshot evidence is not ready yet. Add at least one valid 6.9-inch iPhone portrait screenshot before final submission.
- Six core-scene screenshots remain recommended for Recallo's first public App Store product page.
- Screenshots must come from the correct Recallo Release/TestFlight build, not from old Shibei workspaces, local fixtures, or debug builds.

## Audit Output

```text
# Recallo App Store Screenshot Audit
repoRoot=/Users/hanmingyu/Downloads/拾贝-prod-hardening
mode=report
source=docs/app-store-release-evidence/screenshots/app-store
count=0
acceptedIPhone69PortraitSizes=1260x2736,1290x2796,1320x2868

## Warnings (6)
WARN 缺少建议截图文件：01-home-learning-path.*
WARN 缺少建议截图文件：02-add-article.*
WARN 缺少建议截图文件：03-generating.*
WARN 缺少建议截图文件：04-chapter-detail.*
WARN 缺少建议截图文件：05-question-card.*
WARN 缺少建议截图文件：06-discover-recommendations.*

Screenshot readiness: NOT READY (1 issue)
- 截图数量必须是 1-10 张，当前为 0 张。
```
