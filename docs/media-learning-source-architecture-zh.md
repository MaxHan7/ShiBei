# 拾贝音视频学习源技术方案

## 1. 背景

拾贝当前已经能把文本或文章链接生成可复习章节、知识点和题目。后续如果支持播客、视频、YouTube、访谈等内容，不建议直接把完整音视频交给一个昂贵多模态模型从头到尾生成题目。

更适合拾贝的方式是把任务拆成两层：

```text
便宜或专用模型负责感知原始媒体
稳定文本模型负责结构化学习和出题
```

也就是先把音频、视频转成可引用、可缓存、可检查的学习源文本，再复用现有出题链路。

## 2. 参考产品和架构

### NotebookLM

NotebookLM 的核心思路是 source-first：先把文档、YouTube、音频等变成可引用 source，再基于 source 生成摘要、FAQ、study guide 和问答。拾贝可以借鉴这个来源层设计，让所有题目和知识点都能回到原文、字幕或时间点。

参考：https://support.google.com/notebooklm/answer/16215270

### Snipd

Snipd 针对播客提供 transcript、章节、AI summary 和用户保存片段能力。它的启发是：播客学习不应只有全文总结，还应该有高价值片段、时间点和可复习内容。

参考：https://www.snipd.com/

### Readwise Reader

Readwise Reader 支持 YouTube transcript、highlight 和 AI summary。它的关键启发是：视频学习体验里，time-synced transcript 很重要，用户需要能从总结或题目跳回原始片段。

参考：https://docs.readwise.io/reader/docs/faqs/videos

### Intel / NVIDIA 视频总结架构

公开工程架构通常采用 chunk pipeline：视频进入 ingestion service，被切块，抽帧，转写音频，生成分段摘要，再进入 object store、向量库或 LLM 总结流程。

参考：

- Intel Video Search and Summarization Architecture: https://docs.openedgeplatform.intel.com/oep/edge-ai-libraries/video-search-and-summarization/overview-architecture-summary.html
- NVIDIA VSS Architecture: https://docs.nvidia.com/vss/2.4.0/content/architecture.html

## 3. 总体架构

建议新增一层 `LearningSource`，位于现有 `extractSourceContent` 和 `generateReviewChapter` 之间。

```text
用户输入
  文本 / 文章链接 / 播客 / 视频 / YouTube

→ Source Ingestion
  下载、抓取、识别来源类型、保存原始元数据

→ Media Understanding
  ASR 转写
  视频抽帧
  画面摘要
  speaker / timestamp / chapter 分段

→ Learning Source
  清洗 transcript
  合并画面线索
  分段和压缩
  保留 timestamp 和 source reference

→ Review Generation
  现有知识点提取
  出题
  质检
  重写
  入池

→ User Learning
  章节
  复习
  收藏
  回到原时间点
```

## 4. 核心数据结构

第一版可以用一个服务端内部结构承接不同来源：

```ts
type LearningSource = {
  id: string
  sourceType: "text" | "article" | "podcast" | "video"
  title: string
  url?: string
  account?: string
  durationSeconds?: number

  rawText: string
  normalizedText: string

  transcriptSegments: TranscriptSegment[]
  visualSegments: VisualSegment[]
  sourceSections: SourceSection[]

  extractionMeta: {
    provider: string
    model: string
    stages: string[]
    costUsage: ModelUsageRecord[]
    createdAt: string
  }
}

type TranscriptSegment = {
  id: string
  startSeconds: number
  endSeconds: number
  speaker?: string
  text: string
}

type VisualSegment = {
  id: string
  startSeconds: number
  endSeconds: number
  frameRefs: string[]
  summary: string
}

type SourceSection = {
  id: string
  sourceRole: "body" | "audio_transcript" | "visual_context" | "summary"
  startSeconds?: number
  endSeconds?: number
  text: string
}
```

现有 `generateReviewChapter` 可以继续消费 `normalizedText`。后续如果要让题目跳回视频时间点，再把 `sourceSections` 传入知识点提取和题目解释链路。

## 5. 模型分工

### 音频 / 播客

推荐第一版走专用 ASR 或低成本多模态模型：

```text
音频文件或播客链接
→ ASR 转写
→ transcript 清洗
→ 分段摘要
→ normalizedText
→ 现有章节生成
```

可选模型或服务：

- 豆包 / 火山 ASR
- Whisper / OpenAI transcription
- Gemini Flash / Flash-Lite 音频理解
- Qwen Omni 音频理解

### 视频

视频不建议直接整段送给最贵多模态模型。建议拆成音频和画面两条线：

```text
视频
→ 抽音频 → ASR transcript
→ 抽关键帧 → 视觉摘要
→ transcript + visual summary 合并
→ normalizedText
→ 现有章节生成
```

画面摘要不是每一帧都需要。第一版可以按固定间隔或场景切换抽帧，例如每 30 秒、每 60 秒或每个 slide/scene 一帧。

## 6. 成本拆分

音视频功能必须把成本拆开记录，不能只看最终章节成本。

```text
TotalCost
= MediaUnderstandingCost
+ LearningSourceNormalizationCost
+ ReviewGenerationCost
```

更细：

```text
MediaUnderstandingCost
= audio_transcription
+ video_frame_extraction
+ visual_summary

ReviewGenerationCost
= knowledge_points
+ questions_initial
+ judge_initial
+ question_rewrite
+ judge_rewrite
+ question_supplement
+ judge_supplement
+ chapter_summary
```

成本工作台后续需要新增这些 stage：

```text
audio_transcription
audio_transcript_cleanup
video_frame_summary
media_learning_source_merge
```

这样才能比较不同方案：

```text
方案 A：Gemini 直接理解视频 + DeepSeek 出题
方案 B：豆包 ASR + Qwen 画面摘要 + DeepSeek 出题
方案 C：Whisper 转写 + Gemini Flash-Lite 摘要 + DeepSeek 出题
```

## 7. 对现有代码的影响

改动属于中等，不需要推倒出题系统。

### 基本保持不变

- 知识点提取
- 出题
- 质检
- 重写
- 章节结构
- 复习系统

### 需要新增

- `LearningSource` 结构
- 音频转写模块
- 视频抽帧和画面摘要模块
- 音视频前处理任务队列
- 前处理成本记录
- source segment 到题目的引用关系

### 可能需要调整

- `extractSourceContent` 从“直接返回 rawText”升级为“返回 LearningSource 或 normalizedText”
- `generationMeta.modelUsage` 支持前处理 stage
- 成本工作台展示“前处理成本 + 出题成本”
- iOS 章节详情支持跳回原音视频时间点

## 8. 优势

### 成本更低

音视频感知由便宜模型或专用服务完成，文本出题继续使用当前 DeepSeek 或后续校准后的模型。避免所有工作都交给昂贵多模态模型。

### 质量更可控

中间产物可检查。如果题目质量不好，可以判断问题来自：

- ASR 转写错误
- 视频画面摘要遗漏
- transcript 清洗丢信息
- 知识点提取不准
- 出题或质检不稳定

### 可缓存

同一条播客或视频只需要转写和抽帧一次。后续重新生成题目、切换模型、调整 prompt，都可以复用 `LearningSource`。

### 可替换模型

音频、画面、文本出题可以使用不同 provider。模型选择变成可组合策略，而不是押注单一多模态模型。

### 更适合拾贝定位

拾贝不是普通摘要工具，而是把内容变成可复习知识。拆层后，核心出题系统仍然是产品壁垒。

## 9. 劣势和风险

### 链路变长

音视频前处理会增加延迟。长视频可能需要异步任务、进度状态和失败重试。

### 信息可能损失

如果 ASR 或画面摘要遗漏重点，后面的出题模型无法恢复信息。需要保留原 transcript segment 和 source reference。

### 工程复杂度上升

需要处理文件、链接下载、存储、队列、超时、重试、缓存、隐私和成本追踪。

### 质量归因更复杂

最终题目不好时，需要区分是前处理问题还是出题问题。质量工作台要支持查看中间产物。

## 10. 分阶段实施建议

### Phase 1：播客 MVP

目标：先支持音频或播客链接，不做视频画面。

```text
音频 / 播客链接
→ ASR
→ transcript cleanup
→ normalizedText
→ 现有 generateReviewChapter
```

新增 stage：

```text
audio_transcription
audio_transcript_cleanup
```

验收标准：

- 能生成章节和题目
- 能记录 ASR 成本和出题成本
- 每道入池题成本可计算
- transcript 可回看

### Phase 2：视频音轨版

目标：视频先只处理音轨，不做画面理解。

```text
视频链接
→ 提取音频
→ ASR
→ normalizedText
→ 现有章节生成
```

适合访谈、播客视频、课程口播。

### Phase 3：视频画面增强版

目标：加入关键帧和画面摘要。

```text
视频
→ ASR transcript
→ keyframes
→ visual summary
→ transcript + visual summary merge
→ 章节生成
```

适合 PPT 课程、产品演示、代码教程、带视觉信息的视频。

### Phase 4：模型评测平台

目标：成本工作台支持多模型横评。

对同一条音视频，比较：

- 前处理成本
- 出题成本
- 总成本
- 每分钟成本
- 每道入池题成本
- 生成成功率
- JSON 稳定性
- 人工质量评分

## 11. 第一版推荐路线

第一版不要先做完整视频多模态，建议从播客开始。

推荐实现：

```text
ASR / 音频理解模型
→ transcript cleanup
→ DeepSeek 结构化出题
→ 成本工作台记录完整费用
```

原因：

- 音频链路比视频简单
- 播客和访谈内容更接近文章
- 现有出题系统可以最大程度复用
- 成本和质量更容易校准

等播客稳定后，再加入视频画面摘要。

## 12. 待决策问题

1. 第一版是否只支持用户上传音频，还是也支持播客链接？
2. 是否需要保存完整 transcript，还是只保存清洗后的 normalizedText？
3. 用户是否能从题目跳回原音频/视频时间点？
4. 音视频文件是否进入长期存储，还是处理后立即删除？
5. 前处理模型优先选国产、海外，还是同时接入评测？
6. 成本工作台是否先支持离线评测，不进入 iOS App？

## 13. 结论

拾贝支持播客和视频时，推荐采用“音视频前处理 + 文本出题链路”的分层架构。

这套架构的关键不是多模态模型本身，而是建立稳定的 `LearningSource` 层。它把不同来源统一成可引用、可缓存、可复习的学习材料，让现有章节生成、题目质量控制和成本计算继续发挥作用。

