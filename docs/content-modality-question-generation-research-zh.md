# 文章与视频内容形态差异对出题系统的启发

## 1. 调研目的

这份调研不是为了证明“文章更叙事、视频更硬核知识讲解”。更稳妥的问题是：

> 当用户提交公众号/网页文章、抖音/小红书视频时，不同媒介的内容结构、注意力机制和证据形态有什么差异？这些差异应该如何影响拾贝的知识点提取、题型规划、来源支撑和质量评估？

结论先行：文章和视频的差异不应被写成固定标签。更重要的不是“来源是文章还是视频”，而是这份内容属于哪种学习结构：

- 观点论证 / 叙事案例
- 概念解释 / 科普说明
- 程序步骤 / 操作演示
- 感知动作 / 视觉变化依赖
- 清单技巧 / 短建议
- 屏幕录制 / PPT 讲解
- 混合结构

实施边界：第一版视频功能不根据来源类型或内容结构调整出题 prompt、题型分配或质量检查规则。调研结论先用于 `LearningSource` 元数据保留、真实样本评测分桶和后续决策；是否改出题系统，要等 TikHub + ASR + 现有 V2 跑完真实样本后再判断。

## 2. 外部研究要点

### 2.1 视频学习不是天然更好，效果依赖设计

Poquet 等人对 2007-2017 年视频学习研究做系统综述，分析了 178 篇同行评议论文，结论不是“视频普遍优于文本”，而是视频效果与学习条件、设计方式、互动、认知负荷和测量指标高度相关。

Tarchi、Zaccoletti、Mason 比较文本、视频、字幕视频三种条件，发现即时理解大体等价，但字幕视频在深层迁移上有劣势。这提示我们：视频转写文本并不等同于完整理解，字幕/转写可能增加处理负担，也可能漏掉画面线索。

### 2.2 视频是时间性媒介，容易错过关键证据

视频信息会随时间消失，学习者不能像读文章一样天然回扫段落、标题和上下文。Frontiers 的课堂视频信号研究指出，视频材料因信息瞬时呈现而可能比文字 vignette 带来更高认知负荷；signal 可以引导注意力，但如果没有解释清楚也可能增加额外负荷。

Zheng 等人的 instructional video 实验也支持一个方向：视频需要 segmenting、self-explanation、signaling 等设计来管理认知负荷。对拾贝而言，后端不能只把 ASR 串成长文本，还要把视频切成可引用、可复习的时间片段。

### 2.3 任务知识类型会影响用户偏好的媒介

关于 web 搜索场景的研究发现：用户更偏好视频来学习 sensorimotor procedural tasks，而更偏好图文来学习 cognitive procedural 和 relational conceptual tasks；如果任务涉及较低的时空变化，文本+图片更受偏好，只有高视觉空间变化且程序性的任务才明显偏向视频。

这对拾贝非常关键：视频不是因为“更短”或“更硬核”才不同，而是因为它常承载动作、演示、画面变化、步骤顺序、界面操作等高时空变化信息。

### 2.4 教育视频常追求短、直接、可观看，但这不等于可复习

Guo、Kim、Rubin 对 edX 上 690 万次视频观看 session 做研究，发现短视频更有 engagement，非正式 talking-head、Khan-style 手写推导等更能吸引学习者，且 lecture video 和 tutorial video 的互动方式不同。

这说明短视频平台内容可能天然更重 hook、节奏、示范和即时反馈，但这些特征对复习系统是双刃剑：

- 好处：更容易定位操作步骤、例子、示范动作。
- 风险：上下文被压缩，很多前提、边界、例外和推理链被省略。

### 2.5 文本内部也分 narrative / expository，不能把“文章”视为单一结构

阅读研究区分 narrative text 与 expository text。叙事材料常围绕人物、目标、事件和情节组织；说明性材料更依赖概念、因果、比较、问题-解决、序列等结构。关于叙事与说明文理解的研究显示，二者虽可共享一般阅读能力，但说明性科学文本中先验知识、术语和领域结构会更显著影响理解。

因此公众号文章不一定“叙事性强”。它可能是：

- 观点论证型文章
- 案例复盘型文章
- 工具方法型文章
- 概念科普型文章
- 清单建议型文章
- 访谈/口述整理

出题系统不能仅按 `article_link` 一刀切。

## 3. 内容形态差异矩阵

| 维度 | 文章常见特征 | 抖音/小红书视频常见特征 | 对出题系统的意义 |
| --- | --- | --- | --- |
| 信息持久性 | 段落、标题、列表可回看；结构相对稳定 | 信息随时间流动；关键点可能只出现几秒 | 视频需要 timestamped source section；题目必须能回到具体时间片段 |
| 结构线索 | 标题、小标题、连接词、段落顺序 | 口播转折、剪辑、字幕、画面切换、手势、屏幕变化 | 文章按 discourse structure 切块；视频按 topic/time/visual event 切块 |
| 证据形态 | 文字命题、例子、引用、论证 | 语音、字幕、画面文字、操作动作、前后状态变化 | 视频来源支撑不能只看 transcript，还要标注 visual dependency |
| 常见知识类型 | 概念、判断、因果、观点、方法框架、案例 | 步骤、演示、技巧、操作序列、场景判断、视觉对比 | 视频更适合顺序、诊断、迁移、情境应用题；文章更适合论证关系和概念边界题 |
| 上下文完整性 | 长文可能给出背景、前提和例外 | 短视频常压缩背景，靠平台语境和视觉线索补足 | 视频题目要避免把缺失前提脑补成结论 |
| 用户消费方式 | 可停顿、跳读、搜索、回扫 | 快速观看、滑动、重复播放、强 hook | 复习系统应把视频重新变成可检索、可引用、可回看的学习源 |
| 认知负荷风险 | 长文结构复杂、术语密集 | 多通道并行、信息瞬时、字幕/画面/语音竞争注意力 | 视频需要 segmentation/signaling；文章需要结构摘要和概念图式 |

## 4. 对 ECD / 出题系统的设计启发

ECD 的核心不是“从材料里随便抽题”，而是先定义要观察的能力，再设计能提供证据的任务。内容形态差异应进入 ECD 的三层判断：

### 4.1 Student Model：要测什么能力

文章型内容常见能力：

- 重建观点链：主张、理由、反例、边界。
- 识别概念关系：定义、比较、因果、分类。
- 判断迁移：把文章方法用于新场景。
- 分辨作者立场与事实依据。

视频型内容常见能力：

- 复原步骤顺序。
- 判断操作前提、关键动作、易错点。
- 解释视觉变化代表什么。
- 将演示迁移到类似场景。
- 区分“口播说法”和“画面实际展示”的证据。

### 4.2 Evidence Model：什么证据能说明用户真的懂了

文章证据：

- 能选出支撑某个主张的理由。
- 能识别概念边界和反例。
- 能解释案例和原则之间的关系。

视频证据：

- 能指出某一步为什么发生在前一步之后。
- 能识别屏幕/画面变化中的关键提示。
- 能从演示中抽象出可迁移规则。
- 能判断什么时候不能套用视频里的做法。

### 4.3 Task Model：应该出什么题

文章更适合：

- 主张-理由匹配
- 概念边界判断
- 因果链补全
- 观点迁移到新场景
- 反例识别
- 作者论证结构理解

视频更适合：

- 步骤排序 / 缺失步骤识别
- 操作诊断：哪里做错了
- 画面线索解释：这个变化说明什么
- 场景迁移：换个对象还是否适用
- 时间片段定位：哪个片段支撑这个结论
- 口播与画面证据一致性判断

## 5. 对后端内容处理的建议

### 5.1 新增 ContentStructureClassifier

不要只用 `sourceType` 决定出题策略。建议后端在 `LearningSource` 或 V2 source context 中增加结构标签：

```ts
type ContentStructure =
  | "argument_narrative"
  | "concept_exposition"
  | "case_story"
  | "procedural_demo"
  | "screen_walkthrough"
  | "tips_list"
  | "interview_or_dialogue"
  | "mixed";
```

可先规则 + LLM 分类：

- 有大量“第一步/第二步/打开/点击/设置/操作” -> `procedural_demo` 或 `screen_walkthrough`
- 有“为什么/因此/但是/反而/关键在于” -> `argument_narrative`
- 有“定义/分类/区别/原理/机制” -> `concept_exposition`
- 有“案例/复盘/我当时/后来/结果” -> `case_story`
- 有“3 个技巧/5 个方法/避坑清单” -> `tips_list`

### 5.2 视频 LearningSource 不应只有 transcript

视频 source section 至少区分：

```ts
type SourceRole =
  | "platform_description"
  | "audio_transcript"
  | "subtitle"
  | "ocr"
  | "visual_summary"
  | "chapter_marker";
```

出题时应知道题目证据来自哪里：

- 纯 transcript 支撑：可以出概念、步骤、判断题。
- OCR/画面支撑：可以出视觉线索题，但必须标记 visual dependency。
- transcript + visual 都支撑：适合高质量迁移题。
- 只有画面摘要、无语音：需要更高置信门槛。

### 5.3 文章也要结构化，不应只按段落切

文章 source section 可以增加：

- `claim`
- `reason`
- `example`
- `counterexample`
- `method_step`
- `definition`
- `boundary`
- `case_event`

这有助于避免“长文里随机抓漂亮句子出题”，也能让题目更符合 ECD 的证据链。

## 6. 对 V2 出题 pipeline 的未来迭代建议

本节不是第一版开发要求。第一版先不改 V2 出题策略，只把视频转成高质量 `LearningSource.normalizedText`，并保留 `sourceRole/startSeconds/endSeconds` 等证据元数据。下面这些能力只有在真实样本显示现有 V2 对某些内容结构持续表现不佳时再考虑。

### 6.1 在 sourceMap 阶段前增加 source structure pass

建议新增或扩展现有 sourceMap：

```ts
type SourceStructureProfile = {
  sourceType: "text" | "article_link" | "wechat_article" | "video_link"
  contentStructure: ContentStructure
  dominantKnowledgeTypes: Array<"conceptual" | "procedural" | "causal" | "case_based" | "visual_spatial">
  visualDependency: "none" | "low" | "medium" | "high"
  temporalDependency: "none" | "low" | "medium" | "high"
  evidenceRisks: string[]
}
```

### 6.2 让 taskBriefPlan 读取结构 profile

注意：第一版不做这一步。

不同 profile 选择不同题型重点：

- `argument_narrative`: 观点链、理由、边界、反例。
- `concept_exposition`: 定义、比较、因果、误解纠正。
- `procedural_demo`: 步骤、前提、顺序、错误诊断。
- `screen_walkthrough`: 操作定位、界面状态变化、关键参数。
- `tips_list`: 适用场景、优先级、边界条件。
- `case_story`: 案例-原则抽象、迁移、结果归因。

### 6.3 题目质量评估增加 modality-specific rubric

注意：第一版不做这一步。

文章题新增检查：

- 是否过度依赖文章开头 hook，而非核心观点。
- 是否把例子误当成普遍规则。
- 是否遗漏作者边界条件。

视频题新增检查：

- 是否只考“视频里说了什么”，而没有考步骤、判断或迁移。
- 是否把画面中没有证据的信息脑补成结论。
- 是否引用了没有时间戳/来源片段的视觉信息。
- 是否因为 transcript 错误导致答案不唯一。

## 7. 第一版可执行落地

不建议第一版就按来源或内容结构改出题系统。更稳的步骤：

1. 在 `LearningSource` 中保留 `sourceRole/startSeconds/endSeconds`。
2. 在离线 benchmark 或人工 review 表格中记录内容结构分桶，例如口播教程、PPT 讲解、屏幕录制、观点论证文章、工具方法文章。
3. 在质量报告中按 source type + content bucket 分桶统计，但不把这些标签传入生产 prompt。
4. 建一个混合测试集：
   - 公众号观点论证文章
   - 公众号工具方法文章
   - 普通网页概念解释文章
   - 抖音口播教程
   - 抖音屏幕录制/操作演示
   - 小红书经验清单
   - 小红书 PPT/字幕讲解

第一版成功标准不是“视频题更多”，而是：

- 视频来源支撑能定位到 transcript 或 visual section。
- 视频转写后的内容能被现有 V2 生成系统稳定消费。
- 文章型内容仍保持观点链、概念边界、来源支撑质量。
- 真实样本评测能告诉我们是否有必要再做 structure-aware 出题策略，而不是提前按平台写死规则。

## 8. 参考资料

- Poquet, O., Lim, L., Mirriahi, N., & Dawson, S. (2018). *Video and learning: A systematic review (2007-2017)*. ACM LAK.
  - https://summeracademy.academic.wlu.edu/files/2020/07/Poquet-et-al-2018-video-learning-review.pdf
- Tarchi, C., Zaccoletti, S., & Mason, L. (2021). *Learning from text, video, or subtitles: A comparative analysis*. Computers & Education.
  - https://www.sciencedirect.com/science/article/abs/pii/S0360131520302323
- Lachner et al. / Frontiers in Education (2023). *How can signaling in authentic classroom videos support reasoning...*
  - https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.974696/full
- Zheng, H., Jung, E., Li, T., & Yoon, M. (2022). *Effects of Segmentation and Self-Explanation Designs on Cognitive Load in Instructional Videos*.
  - https://www.cedtech.net/article/effects-of-segmentation-and-self-explanation-designs-on-cognitive-load-in-instructional-videos-11522
- Guo, P. J., Kim, J., & Rubin, R. (2014). *How Video Production Affects Student Engagement: An Empirical Study of MOOC Videos*.
  - https://dl.acm.org/doi/10.1145/2556325.2566239
- Bråten et al. / ScienceDirect (2023). *The moderating effect of knowledge type on search result modality preferences in web search scenarios*.
  - https://www.sciencedirect.com/science/article/pii/S2666557323000058
- Eason et al. / PMC. *Memory and comprehension of narrative versus expository texts*.
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC8219577/
