# 视频链接生产化加固记录 2026-07-09

## 本轮目标

- 粘贴链接阶段不产生 TikHub 付费调用。
- 用户点击生成后才做必要的视频 metadata 检查。
- 所有视频下载路径都有大小上限。
- runtime readiness 只作为部署/运维检查，不作为公开用户接口。
- 前端明确区分用户可见状态与后端测试/调试状态。

## 产品策略

视频理解采用“ASR/VSR 文本主链路 + 视觉增强”的稳定策略。视觉增强失败不阻断出题，但记录在后端测试报告和调试字段中；普通用户只看到可理解的内容依据提示，例如“本次主要基于视频字幕生成”或“已结合视频字幕和画面信息生成”。

第一版自动识别抖音、小红书、YouTube、B站和直链视频文件。未知域名默认按网页文章处理；普通网页视频保留后端 `generic_web` 能力，但需要后续显式“视频链接”入口再对用户开放。

## 成本策略

TikHub 只在用户明确生成视频内容、且缓存未命中时调用。粘贴、编辑和平台识别不应触发 TikHub metadata 请求。

生成前 metadata 检查用于拦截超过 15 分钟的视频。该检查是用户明确点击生成后的受控调用，不属于粘贴阶段自动预检。

## 资源保护

- TikHub 媒体地址下载采用流式写入，边下载边计算字节数，超过 `VIDEO_MEDIA_MAX_BYTES` 立即中断。
- yt-dlp 下载完成后、进入 ffmpeg/ASR/抽帧前必须再次校验文件大小。
- `VIDEO_MAX_DURATION_SECONDS` 默认 900 秒，由代码默认值维护；Railway 不应随意覆盖。

## 运维接口

`/api/source/runtime-readiness` 需要 `RUNTIME_READINESS_TOKEN` 对应的 `x-runtime-readiness-token` header。未配置 token 或 header 不匹配时返回 404，避免公开请求反复触发 ffmpeg、ffprobe、python、yt-dlp 和 faster-whisper 检查。

部署前视频 gate 使用：

```bash
RUNTIME_READINESS_TOKEN=<token> npm --prefix backend run gate:production -- --require-video 1
```

## 验证记录

- `npm --prefix backend run check:video-source`
- `xcodebuild -project '拾贝/拾贝.xcodeproj' -scheme 'Recallo' -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' -quiet build`

远端推送和 Railway 部署仍需人工确认后执行。
