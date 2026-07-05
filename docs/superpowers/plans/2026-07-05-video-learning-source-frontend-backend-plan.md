# 视频学习源前后端迭代开发计划

> **For agentic workers:** 本计划是宏观拆解版。进入具体实现前，应按每个阶段再拆成可测试的小任务，并优先在测试环境验证，确认稳定后再进入生产发布流程。

**Goal:** 让用户粘贴抖音/小红书公开视频链接后，前端能即时识别并给出可信预期，后端能把视频转成 `LearningSource.normalizedText`，并复用模型无关的 V2 出题引擎生成章节、知识点和题目；同时来源详情页能合理展示视频来源、转写片段和打开原链接入口。

**Architecture:** 不重写出题系统，也不绑定某个基座模型。新增视频取源和媒体理解前处理层，把视频链接转为可引用、可缓存、可检查的文本来源；前端把“文章原文页”升级为通用来源详情页，按来源类型展示不同信息。

**Tech Stack:** SwiftUI iOS app, Node.js backend, existing V2 generation queue, `VideoSourceProvider` abstraction, TikHub candidate adapter, ffmpeg, ASR, optional OCR/keyframe visual summary.

---

## 1. 审查结论

### 1.1 现有能力

- iOS 已经能通过 `ChapterInput.parse` 把 `douyin.com`、`v.douyin.com`、`xiaohongshu.com` 识别为 `video_link`。
- V2 创建章节请求已经包含 `sourceType`、`sourceUrl`、`sourceTitle`、`rawText`，视频链接可以从前端进入后端合同。
- V2 出题引擎本质上消费文本输入：`rawText` / `cleanedText` / `sourceTitle` / `sourceUrl` / `sourceAccount`。只要视频前处理产出 `normalizedText`，就可以接上现有生成链路；底层模型通过 provider-neutral model caller 替换。
- V2 来源详情页已有来源片段回看能力，题目可以根据 `sourceAnchorId` 或 `sourceExcerpt` 高亮对应文本块。

### 1.2 当前断点

- V2 上传页目前仍是“粘贴文章链接”范式，粘贴视频链接后没有即时展示“抖音视频 / 小红书视频”的来源预览，也没有说明视频会经历较长处理。
- 旧 AddKnowledgeView 有简单 source type 状态行，但也只是泛化图标和标签，没有平台级预览。
- 后端 `extractSourceContent` 遇到 `video_link` 会直接抛 `failed_extract_video`，提示 Demo 暂未接入。
- V2 队列 `resolveV2QueuedGenerationInput` 只对 `article_link` / `wechat_article` 做 source extraction，视频链接会绕过提取，导致只有 URL、没有可出题正文。
- 当前生成阶段只有 `extracting_source` 这类文章式状态，缺少 `fetching_video_source`、`transcribing_audio`、`merging_learning_source` 等视频前处理阶段。
- 当前 `source.blocks` 只有 `id/type/text`。第一版展示转写文本足够，但无法表达视频时间戳、片段角色、OCR/视觉摘要来源。
- 当前 `V2SourceArticleView` 是文章页：标题、作者、正文块、打开原文链接。视频来源如果照用，会让用户误以为是文章原文。
- `canOpenActiveSource` 只看 `sourceBody` 是否为空；视频提取失败或只有元数据时，用户可能无法进入来源页查看原链接和失败原因。

### 1.3 宏观判断

这个功能不是单纯“后端接 TikHub”。需要拆成四条并行但有依赖的线：

- 输入体验线：粘贴后即时识别来源，降低用户误解。
- 视频前处理线：TikHub + ASR + LearningSource，负责让 AI 真正“看到”视频内容。
- 生成链路线：把 `LearningSource.normalizedText` 接入 V2 队列和模型无关出题引擎。
- 来源回看线：把文章原文页升级为通用来源详情页，支持视频转写、原链接、后续时间戳。

第一版不新增“按来源或内容结构分支的出题策略”。文章/视频内容结构差异先进入真实样本评测和质量分析，等实际生成效果稳定后再决定是否调整 V2 prompt、题型分配或质量检查规则。

---

## 2. 模块拆分

### 2.1 前端输入识别与即时预览

范围：

- V2 上传页 `V2UploadView` / `V2UploadLinkInputCard`。
- 旧版 `AddKnowledgeView` 如仍保留入口，也要同步基础文案和预览。
- `ChapterInput`、`SourceType`、本地化文案。

第一版目标：

- 用户粘贴链接后，客户端立即本地识别来源类型。
- 展示平台级预览：公众号文章、普通网页文章、抖音视频、小红书视频、其他视频链接、粘贴文字。
- 视频预览只承诺“将尝试提取公开视频语音和文案”，不承诺一定成功。
- 提交按钮和校验文案从“文章链接”改成“文章/视频链接或文字”。

不做：

- 第一版不要求前端提交前调用 TikHub 做远程预览。
- 第一版不在 iOS 端下载视频、播放视频或保存 provider 信息。

### 2.2 后端视频取源 Provider

范围：

- 新增 `VideoSourceProvider` 接口。
- TikHub adapter 作为第一候选实现。
- `extractSourceContent` 接入 `video_link`。
- V2 queued job source resolution 支持视频来源。

第一版目标：

- 抖音/小红书公开视频链接可以解析出平台、标题、作者、文案、封面、时长、可处理播放地址。
- provider 失败要归因：私密/删除、地区或版权受限、播放地址不可用、provider 超时、限流、字段缺失。
- provider 结果只作为内部取源数据，不直接等同最终学习文本。

### 2.3 媒体理解与 LearningSource

范围：

- 视频读取或临时下载。
- ffmpeg 抽音频。
- ASR 转写。
- transcript cleanup。
- `LearningSource` 合并和持久化。
- 后续 OCR/关键帧摘要扩展点。

第一版目标：

- 音轨 + 平台文案先组成 `LearningSource.normalizedText`。
- `sourceSections` 至少能区分 `platform_description` 和 `audio_transcript`。
- 如果 transcript 内容太短或无语音，返回 `failed_extract_video`，不要进入低质量出题。
- 不长期保存原始视频文件，除非后续另行定义存储策略和用户告知。

### 2.4 V2 生成队列和状态

范围：

- `generationProgress` stage 枚举和用户文案。
- V2 job runner 的 source extraction 阶段。
- chapter source 持久化。
- 通知、失败页、生成中卡片文案。

第一版目标：

- 视频链接提交后进入异步任务。
- 前端看到“正在提取视频内容 / 正在生成题目”等状态，而不是一直显示文章式文案。
- 视频前处理成功后，把 `sourceType` 转换为 `text` 给模型无关 V2 出题引擎，同时保留 `originalSourceType: "video_link"` 和原始链接。
- V2 出题引擎第一版不因为 `originalSourceType: "video_link"` 改变题型、prompt 或质量检查逻辑。
- 视频失败时，章节保留原始链接和可读失败原因，允许用户从失败详情进入来源信息。

### 2.5 API / Source 合同

范围：

- `V2BackendSource`。
- `V2BackendSourceBlock`。
- review path source anchor contract。
- server serializer。

第一版目标：

- 保持向后兼容：`source.blocks[].id/type/text` 继续可用。
- 新增字段可以采用可选方式：`source.platform`、`durationSeconds`、`coverUrl`、`blocks[].sourceRole`、`blocks[].startSeconds`、`blocks[].endSeconds`。
- 第一版 iOS 可以只消费 `id/type/text`，但后端应保留时间戳数据，避免后续迁移成本。

### 2.6 来源详情页

范围：

- 当前 `V2SourceArticleView`。
- `V2ReviewChapterData` / `V2SourceArticleBlock`。
- `openSource` / route 命名和打开条件。
- 章节详情页来源入口。

建议方向：

- 把 `V2SourceArticleView` 升级或拆分为 `V2SourceDetailView`。
- 文章来源展示文章标题、账号、正文片段、打开原文。
- 视频来源展示平台、标题、作者、原始链接、处理摘要、转写片段。
- 第一版视频来源页不内嵌播放，优先提供“打开原视频”。
- 当视频只有元数据或提取失败时，也允许进入来源页，显示原链接和失败说明。
- 后续时间戳可在每个转写块前展示 `00:42` 这样的 time chip，点击后尝试打开原视频或内部片段回看。

### 2.7 列表、卡片、通知与失败态

范围：

- 首页当前章节 banner。
- 资料库/材料页章节卡片。
- 生成中卡片和生成失败页。
- App 内通知和 APNs。

第一版目标：

- 章节来源标签能区分“公众号文章 / 网页文章 / 抖音视频 / 小红书视频 / 视频链接 / 粘贴文字”。
- 视频失败文案统一为“视频内容提取失败”，详细原因只在详情页展示。
- 生成成功通知不需要强调视频；失败通知可显示“视频内容提取失败，点击查看原因”。

### 2.8 测试、评测与发布门槛

范围：

- 后端 provider mock tests。
- V2 job runner integration tests。
- Swift `ChapterInput` 和 source label tests。
- 手动端到端测试。
- 真实链接离线 benchmark。

第一版发布门槛：

- 抖音公开视频样本 20 条、小红书公开视频样本 20 条。
- 取源成功率、ASR 成功率、最终章节生成成功率分别记录。
- 按内容分桶记录人工质量：口播教程、PPT/字幕讲解、屏幕录制、经验清单、观点论证文章、工具方法文章；分桶只用于评测，不进入第一版生产出题策略。
- 视频章节生成成功率达到可接受阈值后，再把视频入口从“即将上线/灰度”改为默认开放。
- 所有生产 API key 只在后端环境变量中配置，不进入 iOS 包。

---

## 3. 迭代阶段

### Phase 0：合同和 UX 对齐

- [ ] 确认视频第一版支持范围：抖音、小红书公开视频链接。
- [ ] 定义前端 source preview 类型和展示文案。
- [ ] 定义 `LearningSource` 到现有 V2 输入的映射。
- [ ] 定义视频来源页第一版信息结构。
- [ ] 定义失败码和用户可见文案。

验收：

- PRD、技术方案、API 合同三处口径一致。
- 任何人看到设计都能判断“粘贴视频链接后，用户会看到什么、后端做什么、失败怎么显示”。

### Phase 1：前端即时预览和文案修正

- [ ] V2 上传页支持本地识别文章/公众号/抖音/小红书/视频/文字。
- [ ] 输入框 placeholder 和空校验文案改为“文章/视频链接或文字”。
- [ ] 增加 source preview 组件，粘贴后立即显示来源类型。
- [ ] 旧 AddKnowledgeView 同步最低限度 source preview 和文案。

验收：

- 不依赖后端，粘贴抖音/小红书链接后立即出现正确类型。
- 用户不会再看到“视频功能即将上线”这类和实际功能冲突的文案。

### Phase 2：后端 VideoSourceProvider 骨架

- [ ] 新增 provider 接口和 TikHub adapter。
- [ ] 后端 env 配置 TikHub token、timeout、retry。
- [ ] `extractSourceContent(video_link)` 接入 provider。
- [ ] V2 queued job source resolution 支持 `video_link`。
- [ ] Provider mock tests 覆盖成功、私密/删除、超时、限流、字段缺失。

验收：

- mock 视频链接可以产出 title/account/url/rawText skeleton。
- 真实 provider 不可用时，功能能清晰失败，不影响文章生成。

### Phase 3：音轨版 LearningSource MVP

- [ ] 接入视频读取/临时下载和 ffmpeg 抽音频。
- [ ] 接入 ASR，生成 transcript segments。
- [ ] 合并平台文案 + transcript 为 `normalizedText`。
- [ ] 写入 chapter source：保留原始视频来源，同时给 V2 生成系统传入文本。
- [ ] 增加内容太短、无语音、转写失败的失败判断。

验收：

- 口播类抖音/小红书视频可以生成可复习章节。
- 出题系统无需重写，只消费 `normalizedText`，底层生成模型保持可替换。

### Phase 4：通用来源详情页

- [ ] 将 `V2SourceArticleView` 泛化为 `V2SourceDetailView`，或新增视频专用视图后再统一。
- [ ] `openSource` 不再只依赖 `sourceBody`，视频有 URL/metadata/failure reason 时也可进入来源页。
- [ ] 视频来源页展示平台、标题、作者、打开原视频、转写片段、失败说明。
- [ ] 章节卡片、详情页、通知页同步来源类型标签和图标。

验收：

- 成功视频章节能从题目或章节详情进入来源页，看到转写内容。
- 失败视频章节也能进入来源页查看原链接和失败原因。

### Phase 5：OCR / 关键帧增强

- [ ] 抽关键帧。
- [ ] OCR 画面文字。
- [ ] 可选视觉摘要。
- [ ] 将 visual sections 合并进 `LearningSource`。
- [ ] 标记 block 的 `sourceRole`，让用户知道某段来自语音、画面文字还是平台文案。

验收：

- PPT、屏幕录制、带字幕视频的可出题质量明显好于纯 ASR。

### Phase 6：时间戳回看和质量评测

- [ ] 扩展 `source.blocks` 和 `sourceAnchor` 暴露时间戳。
- [ ] 来源页展示 time chip。
- [ ] 题目回看可定位到对应转写片段。
- [ ] 建立 40 条真实视频 benchmark，记录成功率、成本、失败原因和人工质量评分。
- [ ] 达到灰度阈值后再合并到生产发布分支。

验收：

- 用户能从题目定位到视频来源片段。
- 抖音和小红书的真实链接成功率、成本和失败边界被量化。

---

## 4. 第一版推荐范围

第一版建议做到 Phase 0 到 Phase 4：

- 前端即时识别和预览。
- 后端 TikHub + ASR 音轨链路。
- `LearningSource.normalizedText` 接模型无关 V2 出题。
- 不根据来源类型或内容结构改出题策略，先以真实样本结果判断后续是否需要结构化适配。
- 视频来源详情页展示转写文本和打开原视频。
- 失败页、通知、列表标签能正确表达视频状态。

暂缓：

- 画面 OCR/视觉摘要。
- 时间戳跳转。
- 内嵌视频播放。
- 多模型视频理解横评平台。

原因：

- 口播/讲解型视频是第一批最可能成功的样本。
- 音轨版最容易验证 TikHub 是否稳定、ASR 是否可用、现有 V2 出题是否能吃下视频文本。
- 来源详情页如果先泛化好，后续加 OCR 和时间戳只是丰富 block 数据，不需要重新设计用户路径。
