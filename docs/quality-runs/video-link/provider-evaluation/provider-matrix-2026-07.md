# 视频 Provider Matrix 2026-07

## Candidate Providers

| Layer | Candidate | Status | Purpose | First-release stance |
| --- | --- | --- | --- | --- |
| Source | TikHub | Active | 解析抖音/小红书公开链接，拿元数据、字幕、播放地址 | 第一版继续使用，但必须有缓存和成本监控 |
| Transcript | Platform subtitles | Active when available | 优先使用平台已有字幕 | 可作为主证据 |
| Transcript | Local/Faster-Whisper path | Active candidate | 平台字幕缺失时转写音频 | 可作为主证据 |
| Transcript | Qwen ASR / Paraformer / Fun-ASR | Candidate | 评估更稳定的中文视频转写 | 待真实样本比较 |
| OCR | Qwen-OCR | Candidate | 从关键帧/截图抽取屏幕文字 | 增强项，不阻断 |
| OCR | PaddleOCR | Candidate | 本地/可控 OCR，适合屏幕文字基线 | 增强项，不阻断 |
| Visual Summary | Qwen VL | Active candidate | 对关键帧做视觉摘要 | 增强项，不阻断 |
| Video Understanding | Gemini video understanding | Benchmark candidate | 评估原生视频理解上限 | 先做 benchmark，不作为默认生产依赖 |

## Sample Matrix

| Sample ID | Platform | Content type | Link/source | Baseline path | Enhanced candidates | Expected decision signal |
| --- | --- | --- | --- | --- | --- | --- |
| douyin-speech-knowledge | Douyin | 知识口播 | 待样本确认 | ASR/subtitle only | Qwen ASR | ASR-only 是否足够生成高质量题 |
| douyin-screen-tutorial | Douyin | 录屏教程/UI 文字 | 待样本确认 | ASR/subtitle only | Qwen-OCR, PaddleOCR, Qwen VL | 视觉文字是否显著补充题目依据 |
| xhs-subtitled-design | Xiaohongshu | 设计/知识，有字幕 | 待样本确认 | Platform subtitle | Qwen VL | 平台字幕是否已经足够 |
| xhs-no-subtitle | Xiaohongshu | 无字幕或字幕不可用 | 待样本确认 | ASR | Qwen ASR, Qwen-OCR | ASR 稳定性和中文术语识别 |
| low-info-video | Douyin/XHS | 低信息量 | 待样本确认 | ASR/subtitle only | none | 是否能稳定拒绝或低质量降级 |

## Run Template

| Run ID | Sample ID | Source success | Transcript provider | OCR provider | Visual provider | TikHub calls | Media cost USD | Model cost USD | Source blocks | Units | Questions | Diagnostics | Human note |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 待样本确认 | 待实测填入 | 待样本确认 | 待实测填入 | 待样本确认 | 待实测填入 | 0 | 0 | 0 | 0 | 0 | 0 | 待样本确认 | 待实测填入 |
| 20260708-162425-visual-runner | douyin-speech-knowledge | yes | local_whisper | none | qwen-vl / qwen3-vl-flash | 1 | 0.001422 | 0.005670 | 16 | 3 | 11 | 1 warning: option tone cue | Qwen visual succeeded with 13 frames / 2 grids / 1 visual segment. No generation retries. Keep ASR/subtitle as primary path; visual remains enhancement. |

## Recorded Artifacts

- `douyin-speech-knowledge` visual runner JSON: `docs/quality-runs/video-link/douyin-multi-agent-communication/runs/20260708-162425-20260708-douyin-multi-agent-communication-visual-runner.json`
- `douyin-speech-knowledge` visual runner HTML: `docs/quality-runs/video-link/douyin-multi-agent-communication/reports/20260708-162425-20260708-douyin-multi-agent-communication-visual-runner.html`

## Decision Rules

1. ASR/subtitle baseline remains default unless enhanced providers produce a repeatable quality lift.
2. OCR should be enabled only for video categories where screen text is common and valuable.
3. VLM visual summary must stay optional; parse failures, timeout, or empty visual results cannot block generation.
4. Provider choice must be represented in extraction cache signatures.
5. Reports must separate internal diagnostics from user-visible content basis.

## Open Questions

- Qwen ASR vs local Whisper on noisy short Chinese videos: which has better timestamp and terminology quality?
- Qwen-OCR vs PaddleOCR on vertical mobile UI screenshots: which catches small text more reliably?
- Does visual enhancement increase qualified question count, or merely add noisy source text?
- What is the acceptable TikHub call budget per successful generated chapter?
