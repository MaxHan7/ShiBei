# 拾贝音视频学习源技术方案

## 1. 背景

拾贝当前已经能把文本或文章链接生成可复习章节、知识点和题目。视频功能的目标不是做一个通用视频摘要器，而是让用户粘贴抖音、小红书等视频链接后，系统可以把其中有学习价值的内容变成可复习章节。

文章与视频的内容形态差异会影响后续评测和迭代判断。相关调研见 `docs/content-modality-question-generation-research-zh.md`：结论不是按平台写死“文章=叙事、视频=硬核”。第一版先不根据来源或内容结构调整出题策略，只保留 `LearningSource` 元数据和真实样本评测分桶；是否引入 `ContentStructure`、`visualDependency`、`temporalDependency` 等结构标签进入出题系统，等实际效果验证后再决定。

成熟产品的共同经验是 source-first / transcript-first：

- NotebookLM 对 YouTube 的公开支持依赖字幕或自动字幕，并只把视频文字 transcript 导入为 source。
- Readwise Reader 把 YouTube 视频和 time-synced transcript 放在一起，让用户按 transcript 跳转、划线和总结。
- Snipd 对播客的核心能力是 transcript、AI summary、AI chapters 和按片段保存。
- Azure AI Video Indexer 这类企业级产品也会先输出 transcript、OCR、topics、scene 等结构化中间产物，再供搜索、总结和问答使用。

因此拾贝不应把“完整视频直接丢给一个多模态大模型”作为生产主路径。更稳的方式是先建立一层可引用、可缓存、可检查的 `LearningSource`，再复用现有 V2 出题链路。

## 2. 第一版目标

第一版聚焦抖音和小红书视频链接，不要求用户上传视频文件。

目标：

- 用户粘贴公开视频链接后，后端尝试解析视频元数据、文案和可访问播放地址。
- 后端把视频音轨转成 transcript，并保留时间戳片段。
- 对画面信息依赖较强的视频，后端抽关键帧做 OCR 或画面摘要，作为 transcript 的补充。
- 后端把 transcript、文案、OCR、画面摘要合并成 `LearningSource.normalizedText`。
- 模型无关的 V2 生成系统继续基于文本生成章节、知识点和题目。
- 第一版不按 `article_link` / `video_link` 或内容结构分支调整题型、prompt、质量检查规则。
- 第一版至少支持文字来源回看；时间戳跳回视频作为二阶段增强。

非目标：

- 不承诺支持私密、删除、地区限制、版权限制或平台过滤的视频。
- 不把第三方平台数据用于公开题库、训练公共模型或跨用户共享。
- 不在 iOS 端下载视频、调用模型或保存平台 API Key。
- 不把 TikHub 绑定成不可替换的长期架构，只作为第一版 `VideoSourceProvider` 候选实现。

### 2.1 普通网页视频限制

2026-07-09 生产化加固补充：第一版自动识别抖音、小红书、YouTube、B站和直链视频文件。未知域名的普通网页 URL 默认按 `article_link` 处理，不自动猜测为视频，避免把普通文章页误判进入 yt-dlp 下载链路。

后端保留显式 `sourceType=video_link` 的 `generic_web` 能力，用于后续增加“视频链接”显式入口或高级入口。该入口上线前，普通网页视频不作为第一版用户可见承诺；如果用户粘贴未知网页 URL，前端应先展示为网页文章，生成失败时给出文章提取失败反馈，而不是静默尝试视频下载。

## 3. 总体架构

```text
用户输入
  抖音 / 小红书视频链接

→ Video Source Provider
  TikHub 解析分享链接、视频元数据、文案、播放地址、封面、作者信息

→ Media Understanding
  下载或读取视频地址
  ffmpeg 抽音频
  ASR 转写音频
  抽关键帧
  OCR / 画面摘要

→ Learning Source
  清洗 transcript
  合并平台文案、OCR、视觉摘要
  分段和压缩
  保留 timestamp、source reference、provider metadata

→ Review Generation
  模型无关的 V2 生成管线
  知识点提取
  出题
  质检
  重写
  入池

→ User Learning
  章节详情
  复习
  来源片段回看
  后续跳回视频时间点
```

关键架构判断：

- TikHub 解决“让后端拿到公开视频内容”的问题，不解决“学习理解和出题”的问题。
- ASR/OCR/视觉摘要解决“把媒体变成可引用文本”的问题。当前 ASR 通过 `SpeechToTextProvider` 选择，第一版推荐本地 Faster-Whisper，避免把视频链路绑定到 OpenAI；OpenAI transcription 只作为显式兼容 adapter。
- V2 出题引擎继续解决“从文本生成可复习知识”的问题，但它必须通过 provider-neutral model caller 调用模型，不能和某一个基座模型或供应商绑定。当前实现优先使用 DeepSeek；如果未配置 DeepSeek，则保留 OpenAI 兼容 fallback。
- 多模态视频理解是增强层，不是第一版阻断项。后端需要预留 `VisualUnderstandingProvider` 边界，默认 provider 为 `none`，后续可接 Qwen-VL、Gemini video understanding 或云厂商视觉服务，把输出统一合并为 `LearningSource.visualSegments`。
- `claude-real-video` 的可取之处是 scene-aware 抽帧、RGB diff 去重和 contact sheet，而不是它的 URL 下载、Whisper CLI 或 manifest。详细审查见 `docs/video-visual-understanding-crv-adapter-zh.md`，执行计划见 `docs/superpowers/plans/2026-07-07-video-visual-understanding-adapter.md`。

### 3.1 画面理解增强架构

第一版视频文本链路已经可由 TikHub、ffmpeg 和 ASR 组成。画面理解增强不应直接把完整视频交给出题模型，而是增加一个可关闭、可替换的 `VideoFramePackProvider`：

```text
TikHub 下载后的 mediaFile
  → VideoFramePackProvider
      scene-aware 抽帧
      逐帧 timestamp
      sliding-window 去重
      3x3 contact sheet
  → VisualUnderstandingProvider
      Qwen-VL / Gemini / 其他多模态模型
  → visualSegments
  → LearningSource.normalizedText
```

新增内部合同建议：

```ts
type VideoFramePack = {
  provider: "crv_style_ffmpeg" | "none"
  skipped?: boolean
  reason?: string
  video: {
    durationSeconds?: number
    fps?: number
    width?: number
    height?: number
  }
  frames: Array<{
    id: string
    path: string
    order: number
    startSeconds: number
    endSeconds: number
    kept: boolean
    diffPercent?: number | null
  }>
  grids: Array<{
    id: string
    path: string
    frameIds: string[]
    startSeconds: number
    endSeconds: number
    rows: number
    cols: number
  }>
  debug: {
    extractedFrameCount?: number
    keptFrameCount?: number
    cappedFrameCount?: number
    timestampMode?: "metadata" | "estimated"
  }
}
```

第一阶段可以只实现 `VIDEO_FRAME_PROVIDER=crv_style_ffmpeg` 和 `VIDEO_VISUAL_PROVIDER=none`，用于验证抽帧和九宫格稳定性。第二阶段接入 Qwen-VL，把 grid/frames 解释成 `visualSegments`。这保证 DeepSeek 继续只负责文本出题，视觉模型只负责把画面转成可引用文本。

推荐的第一版视觉模型配置：

```bash
VIDEO_FRAME_PROVIDER=crv_style_ffmpeg
VIDEO_VISUAL_PROVIDER=qwen-vl
VIDEO_VISUAL_MODEL=qwen3-vl-flash
QWEN_API_KEY=<set-in-backend-env>
QWEN_API_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VIDEO_VISUAL_MAX_GRIDS=4
```

`qwen3-vl-flash` 是默认性价比模型；如果真实视频样本中出现复杂 UI、小字 OCR 或关键画面理解不足，再将同一 provider 的 `VIDEO_VISUAL_MODEL` 提升为 `qwen3-vl-plus`。出题系统不读取图片，也不直接调用 Qwen；它只读取合并后的 `LearningSource.normalizedText`。

## 4. TikHub 取源方案

TikHub 是第一版可验证的第三方数据入口。它对拾贝的价值是把抖音/小红书公开链接转成结构化数据和可处理的视频地址。

### 抖音

优先候选接口：

- `/api/v1/douyin/app/v3/fetch_one_video_by_share_url`
- `/api/v1/douyin/app/v3/fetch_one_video`
- `/api/v1/douyin/app/v3/fetch_multi_video_high_quality_play_url`

预期可用字段：

- 视频 ID
- 标题或 `desc`
- 作者信息
- 封面
- 播放地址
- 时长
- 公开互动指标

工程约束：

- App V3 作为主路径，Web 系列作为 fallback。
- 播放地址可能有时效，处理失败或过期时需要重新解析。
- 私密、删除、地区版权限制、作者可见性限制等情况必须进入 `failed_extract_video`。

### 小红书

优先候选接口：

- `/api/v1/xiaohongshu/app_v2/get_video_note_detail`
- `/api/v1/xiaohongshu/app_v2/get_image_note_detail`

预期可用字段：

- 笔记 ID
- 标题
- 正文/文案
- 作者信息
- 视频或图片资源
- 评论和互动信息

工程约束：

- App V2 作为主路径。
- 小红书端点维护成本高，响应可能需要重试或等待。
- 不依赖播放量、下载量等小红书不稳定或不公开字段。

### 供应商边界

TikHub 不是官方开放平台。生产使用前需要明确：

- 只处理用户主动提交的公开链接。
- 不绕过私密内容、登录态或权限限制。
- 对平台内容只做用户个人学习目的下的临时处理和章节生成。
- 删除章节时同步删除提取文本、转写片段和缓存引用。
- 后端保留 provider 抽象，未来可替换为官方 API、其他服务商或自建解析。

## 5. LearningSource 数据结构

第一版新增服务端内部结构，不要求一次性暴露给 iOS 全量字段。

```ts
type LearningSource = {
  id: string
  sourceType: "video_link"
  platform: "douyin" | "xiaohongshu" | "unknown"
  title: string
  url: string
  account?: string
  author?: string
  durationSeconds?: number

  rawText: string
  normalizedText: string

  transcriptSegments: TranscriptSegment[]
  visualSegments: VisualSegment[]
  sourceSections: SourceSection[]

  media: {
    provider: "tikhub"
    providerContentId?: string
    coverUrl?: string
    playUrlExpiresAt?: string
    cachedMediaRef?: string
  }

  extractionMeta: {
    stages: MediaStageRecord[]
    createdAt: string
  }
}

type TranscriptSegment = {
  id: string
  startSeconds: number
  endSeconds: number
  speaker?: string
  text: string
  confidence?: number
}

type VisualSegment = {
  id: string
  startSeconds: number
  endSeconds: number
  frameRefs: string[]
  ocrText?: string
  summary?: string
}

type SourceSection = {
  id: string
  sourceRole: "caption" | "audio_transcript" | "ocr" | "visual_summary" | "platform_description"
  startSeconds?: number
  endSeconds?: number
  text: string
}

type MediaStageRecord = {
  stage: string
  provider?: string
  model?: string
  startedAt: string
  finishedAt?: string
  status: "succeeded" | "failed" | "skipped"
  cost?: number
  errorCode?: string
}
```

`normalizedText` 是当前 V2 出题引擎的主要输入。`sourceSections` 是后续视频时间点回看的基础。

2026-07-08 补充：ASR 的原始 `transcriptSegments` 继续逐句保留，但面向 V2 source blocks 和用户“查看原文”的 `sourceSections` 不再一条字幕一个 block。后端会用确定性规则把连续字幕聚合成约 15-30 秒、120-260 字左右的可读 transcript block，并保留 `startSeconds`、`endSeconds` 和内部 `segmentIds`，避免用户看到碎片化字幕流。

2026-07-08 补充：视频视觉理解是增强层，不作为第一版主链路阻断条件。ASR 成功但视觉模型超时、返回格式不可解析或缺少视觉结果时，后端应继续生成 transcript-only LearningSource，并在 `extractionMeta.visualUnderstanding` 记录内部诊断状态、供应商、失败码和可重试性。前端/客户端只读取抽象的 `contentBasis` / `userVisibleContentBasis`，例如“本次主要基于视频字幕生成”或“已结合视频字幕和画面信息生成”，不展示模型名、provider 错误、JSON parse 失败等内部细节。

## 6. 与现有后端的对接判断

现有出题系统可以复用，原因是 V2 生成管线的业务输入主要是：

- `rawText` / `cleanedText`
- `sourceTitle`
- `sourceUrl`
- `sourceAccount`
- `originalSourceType`

视频前处理只要产出高质量 `normalizedText`，就能转换为现有输入。这里的“现有输入”是出题引擎合同，不是某个模型 API 合同：

```ts
{
  sourceType: "text",
  originalSourceType: "video_link",
  rawText: learningSource.normalizedText,
  cleanedText: learningSource.normalizedText,
  sourceTitle: learningSource.title,
  sourceUrl: learningSource.url,
  sourceAccount: learningSource.account
}
```

第一版接入点：

- `extractSourceContent` 遇到 `video_link` 时不再直接失败，而是调用 `extractVideoLearningSource`。
- V2 队列的 source extraction 阶段从只支持 `article_link/wechat_article` 扩展到 `video_link`。
- 成功后把 `LearningSource.normalizedText` 写回 chapter source，并继续运行模型无关的 V2 生成管线。

需要小扩展的地方：

- 当前 V2 `source.blocks` 只有 `id/type/text`，可先把 `SourceSection.text` 转成文本块。
- 如果要跳回视频时间点，需要把 `startSeconds/endSeconds/sourceRole` 加到 source block 或 source anchor。
- 当前 iOS `V2BackendSourceBlock` 只解码 `id/type/text`，第一版可以不改；时间点回看阶段再扩展 Swift 模型。

## 7. 模型与处理分工

第一版推荐分层处理，而不是单一基座模型直看视频。

```text
TikHub
  负责公开视频取源、元数据、播放地址

ffmpeg
  负责抽音频、抽关键帧、基础转码

ASR 服务
  负责把音频转 timestamped transcript

OCR / 视觉模型
  负责识别画面文字、PPT/代码/屏幕内容、关键帧摘要

LLM 或规则化合并器
  负责把 transcript + OCR + visual summary 合并成 LearningSource.normalizedText

V2 出题引擎
  负责知识点、题目、质检和复习路径；底层模型通过 ModelJsonClient / prompt caller 抽象替换
```

候选技术：

- ASR：火山 ASR、OpenAI transcription、阿里/腾讯/百度语音服务。
- 视频直接理解对照：Gemini video understanding、Qwen-VL/百炼视频理解。
- 视觉摘要：Qwen-VL、Gemini、OpenAI vision frames。
- 出题生成模型：DeepSeek、OpenAI、Qwen、Gemini 或其它 JSON-capable LLM 都应只接在 provider-neutral model caller 后面。

直接视频理解模型用于 benchmark 和 fallback，不作为第一版主路径。

### 7.1 多模型可替换架构

视频能力上线后，模型选择应拆成三个互不绑定的位置：

```text
SpeechToTextProvider
  输入：音频文件
  输出：timestamped transcript
  候选：阿里 Fun-ASR、OpenAI transcription、火山 ASR、腾讯/百度语音

VideoUnderstandingProvider
  输入：关键帧、视频片段、transcript
  输出：OCR、画面摘要、视觉线索、时间点
  候选：Qwen-VL / 百炼视觉理解、Gemini video understanding、OpenAI vision frames

ModelJsonClient
  输入：LearningSource.normalizedText + source sections
  输出：章节、知识点、题目、质检结果、复习路径
  候选：DeepSeek、Qwen text、OpenAI、Gemini 或其它 JSON-capable LLM
```

这三个位置可以使用不同供应商。不要因为视频理解选了 Qwen 或 Gemini，就强迫出题生成也切到同一个模型；也不要因为出题模型表现好，就让它兼职做 ASR。

### 7.2 候选模型判断

| 候选 | 适合位置 | 第一版判断 |
| --- | --- | --- |
| Qwen / 阿里百炼视觉理解 | `VideoUnderstandingProvider`、`ModelJsonClient` 候选 | 很适合中文视频、画面文字、PPT/字幕类内容评测；可作为视觉增强和出题生成替代候选。 |
| Gemini video understanding | `VideoUnderstandingProvider`、直接视频理解 benchmark | 官方支持处理视频 audio + visual streams，适合做分层方案的对照组和复杂视频 fallback。 |
| OpenAI transcription / Realtime Whisper | `SpeechToTextProvider` | 适合作为 ASR 基线，尤其需要稳定转写和时间片段时；不代表出题模型必须使用 OpenAI。 |
| Faster-Whisper 本地转写 | `SpeechToTextProvider` | 第一版推荐的非 OpenAI ASR。后端/worker 临时抽音频后本地转写，不需要用户安装，也不需要 OpenAI key；需要部署环境安装 Python 包和模型缓存。 |
| 阿里 Fun-ASR / 火山 ASR | `SpeechToTextProvider` | 中文短视频转写值得优先评测，可能在成本、中文口音、延迟上更适合国内内容。 |
| DeepSeek / Qwen text / OpenAI / Gemini text | `ModelJsonClient` | 按 JSON 稳定性、中文理解、题目质量、成本、延迟做横评，不与视频取源和 ASR 绑定。 |
| Qwen2.5-Omni / Qwen3-VL 开源自托管 | 实验室 / 长期备选 | 有参考意义，但第一版生产不建议直接自托管，除非后续明确算力、延迟、运维和模型更新策略。 |

推荐第一版评测组合：

```text
主路径 A：
TikHub → 专用 ASR → LearningSource → 当前 ModelJsonClient

视觉增强 B：
TikHub → 专用 ASR → Qwen/Gemini 关键帧视觉补充 → LearningSource → 当前 ModelJsonClient

直接理解对照 C：
TikHub 或原视频文件 → Gemini/Qwen video understanding → LearningSource → 当前 ModelJsonClient

出题模型横评 D：
同一份 LearningSource → DeepSeek / Qwen / OpenAI / Gemini 的 ModelJsonClient → 质量与成本对比
```

### 7.3 DSPy 的位置

DSPy 仍然有参考意义，但定位在实验室，不进入第一版生产 runtime：

- DSPy Signature 对应拾贝的 prompt schema / JSON schema。
- DSPy Module 对应 `reviewPathPlan`、`unitKnowledgeMap`、`taskBriefPlan`、`questionDraft`、`qualityJudge` 等阶段。
- DSPy Metric 对应来源支撑率、答案唯一性、干扰项质量、解释一致性和人工评分。
- DSPy Optimizer / GEPA / MIPROv2 可用于实验室优化 prompt，但优化产物必须经过固定测试集和生产准入门槛后，才能手工迁移进生产 prompt。

因此生产后端只吸收 DSPy 的结构化思想和实验结果，不依赖 DSPy Python runtime。

## 8. 生成状态和失败状态

新增内部阶段：

```text
fetching_video_source       正在解析视频来源
fetching_video_media        正在读取视频内容
transcribing_audio          正在转写视频语音
extracting_visual_context   正在识别画面信息
merging_learning_source     正在整理视频内容
```

前台可以继续映射为：

```text
submitted / fetching_video_source     已提交，等待处理
fetching_video_media                  正在提取视频内容
transcribing_audio                    正在提取视频内容
extracting_visual_context             正在提取视频内容
merging_learning_source               正在提取视频内容
generating_points                     正在生成知识点
generating_questions                  正在生成题目
quality_checking                      正在检查题目质量
completed                             已生成
failed_extract_video                  视频内容提取失败
```

失败原因需要结构化记录：

- `video_provider_unavailable`
- `video_private_or_deleted`
- `video_region_or_copyright_restricted`
- `video_play_url_expired`
- `video_download_failed`
- `audio_transcription_failed`
- `video_no_speech`
- `video_content_too_short`
- `visual_context_failed`
- `learning_source_merge_failed`

用户可见文案保持克制，例如：“这条视频暂时无法提取可复习内容，请稍后重试或换一个公开视频链接。”

## 9. 成本拆分

音视频功能必须把前处理成本和出题成本分开记录。

```text
TotalCost
= SourceProviderCost
+ MediaUnderstandingCost
+ LearningSourceNormalizationCost
+ ReviewGenerationCost
```

阶段建议：

```text
tikhub_video_source_fetch
video_media_fetch
audio_transcription
video_frame_extraction
video_ocr
video_frame_summary
media_learning_source_merge
knowledge_points
questions_initial
judge_initial
question_rewrite
judge_rewrite
question_supplement
judge_supplement
chapter_summary
```

成本工作台后续需要展示：

- 每条视频取源成本
- 每分钟 ASR 成本
- 每分钟视觉处理成本
- 每章出题成本
- 每道入池题总成本
- 失败视频的 sunk cost

## 10. 缓存和数据保留

缓存原则：

- 缓存 `LearningSource` 和 transcript，用于重新生成题目。
- 不长期保存原始视频文件，除非后续有明确存储策略和用户告知。
- 播放地址如果有时效，只保存 provider metadata 和必要引用，不依赖长期可用。
- 删除章节时删除 transcript、visual summary、normalizedText、sourceSections 和 provider metadata。

隐私原则：

- 只处理用户主动提交的公开链接。
- 提取内容只用于该用户的章节、题目、解释、复习记录和质量反馈。
- 不把平台作者、评论者等个人信息暴露到题目内容里，除非它是用户学习内容本身不可缺少的信息。

## 11. 验证计划

第一轮不要直接改生产生成链路，先做 benchmark。

样本：

- 抖音公开视频 20 条。
- 小红书公开视频笔记 20 条。
- 每个平台覆盖：口播、教程、带字幕、无字幕、PPT/屏幕录制、生活经验类、低信息密度视频。

验证指标：

- TikHub 链接解析成功率。
- 视频播放地址获取成功率。
- 视频读取/下载成功率。
- ASR 成功率。
- 关键帧/OCR 有效信息率。
- LearningSource 可读性评分。
- 生成章节成功率。
- 题目来源支撑率。
- 单条视频总成本。
- 失败原因分布。

对照实验：

```text
方案 A：TikHub + ASR transcript + 模型无关 V2 出题
方案 B：TikHub + ASR + OCR/关键帧摘要 + 模型无关 V2 出题
方案 C：TikHub + Gemini/Qwen 直接视频理解 + 模型无关 V2 出题
```

验收门槛建议：

- 公开视频取源成功率达到 80% 以上才进入产品内测。
- 生成章节成功率达到 70% 以上才默认开放视频链接入口。
- 人工抽样题目来源支撑率达到 85% 以上才进入 TestFlight 候选。

## 12. 分阶段实施建议

### Phase 0：离线技术验证

目标：验证 TikHub 是否能稳定把抖音/小红书视频交给后端处理。

工作：

- 准备真实链接样本。
- 调 TikHub 解析元数据和播放地址。
- 用 ffmpeg 抽音频。
- 接一个 ASR 服务生成 transcript。测试环境首选 `VIDEO_ASR_PROVIDER=local_whisper`。
- 把 transcript 塞进现有 V2 生成实验脚本。
- 记录成功率、失败原因、成本和人工质量评分。

本地 Faster-Whisper 配置：

```bash
python3 -m venv .venv-video-asr
.venv-video-asr/bin/pip install -r backend/requirements-video-asr.txt

VIDEO_ASR_PROVIDER=local_whisper
LOCAL_WHISPER_PYTHON=.venv-video-asr/bin/python
LOCAL_WHISPER_MODEL=small
LOCAL_WHISPER_DEVICE=auto
LOCAL_WHISPER_COMPUTE_TYPE=int8
LOCAL_WHISPER_LANGUAGE=zh
VIDEO_ASR_TIMEOUT_MS=180000
```

生产环境应把 Python 依赖、模型缓存和 ffmpeg 放进后端 worker 镜像。用户侧不需要安装 Faster-Whisper、ffmpeg 或任何模型依赖；用户只粘贴公开视频链接。

### Phase 1：视频音轨 MVP

目标：视频先只处理音轨和平台文案，不做画面理解。

```text
视频链接
→ TikHub
→ 音频抽取
→ ASR
→ transcript cleanup
→ normalizedText
→ 模型无关 V2 生成管线
```

适合口播、访谈、教程讲解、播客切片。

### Phase 2：画面文字增强

目标：加入关键帧 OCR 和轻量画面摘要。

```text
视频
→ ASR transcript
→ keyframes
→ OCR / visual summary
→ transcript + visual context merge
→ 模型无关 V2 生成管线
```

适合 PPT 课、代码教程、屏幕录制、产品演示。

### Phase 3：时间戳回看

目标：题目和知识点可以跳回视频片段。

工作：

- `source.blocks` 扩展 `startSeconds/endSeconds/sourceRole`。
- `sourceAnchor` 或 client serializer 暴露视频时间点。
- iOS 来源页支持按时间点打开原链接或视频内嵌回看。

### Phase 4：多模型评测平台

目标：让成本工作台支持视频链路横评。

比较：

- TikHub 取源成功率。
- ASR 模型准确率和成本。
- OCR/视觉摘要模型有效率。
- 直接视频理解模型 vs 分层理解方案。
- 每分钟成本、每道入池题成本、人工质量评分。

2026-07-08 补充：ASR、OCR 和视觉理解都应作为可替换 provider family 评估，而不是被写死成单一供应商。当前默认策略仍是“平台字幕/ASR 作为主证据，OCR/VLM 作为增强证据”。是否启用 Qwen ASR、Qwen-OCR、PaddleOCR、Qwen VL 或 Gemini video understanding，必须通过同一批抖音/小红书真实样本比较：取源成功率、转写/OCR 可读性、视觉摘要有效性、生成 unit 和题目质量、TikHub 调用次数、模型 token 和总成本。评测记录放在 `docs/quality-runs/video-link/provider-evaluation/`，结论只用于调整 provider 默认值，不改变 V2 出题系统与模型无关的输入合同。

## 13. 结论

拾贝视频功能可以直接复用现有后端出题系统，但前提是先把视频转成 `LearningSource.normalizedText`。复用的是出题引擎的输入/输出合同和生成阶段，不是绑定某个模型供应商。

第一版推荐路线：

```text
抖音/小红书链接
→ TikHub 取源
→ ASR 转写
→ LearningSource
→ 模型无关 V2 出题系统
```

关键工程工作不在重写出题系统，也不在绑定某个基座模型，而在新增稳定的 `VideoSourceProvider`、音视频前处理、模型调用抽象、成本记录和失败归因。等音轨版跑稳后，再加入关键帧/OCR 和时间戳回看。
