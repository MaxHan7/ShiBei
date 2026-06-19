# 拾贝 V2 Prompt 字段生成规则

本文档记录 V2 后端 prompt 生成每个字段时应遵守的内容质量规则。`v2-backend-field-contract-zh.md` 说明字段是什么、给前端哪里用；本文档说明这些字段应该怎么生成、什么算好、什么不应该生成。

这些规则来自：

- `golden-samples/README.md`
- `golden-samples/*.json`
- `prompt-example-candidates-zh.md`
- `v2-chapter-review-flow-prd-zh.md`
- `docs/superpowers/plans/2026-06-18-shibei-v2-backend-prompt-schema-plan.md`

## 总原则

- V2 生成的是一个章节复习脚本，不是一组平铺题目。
- 题目考知识点理解，不考用户是否背下原文措辞。
- 每个知识点要有认知坡度：开场解释 -> 轻量理解 -> 场景应用 -> 单元总结。
- 来源依据用于生成、校验和“查看原文”定位；用户题干不应写成阅读理解题。
- Golden sample 是质量标尺，不是数量模板。不要机械复制某篇样章的知识点数、题目数或题型比例。

## 章节概要：`chapter.summaryCard.text`

用途：章节概要页、章节详情页的文章核心摘要。

生成规则：

- 先直接点出文章围绕的核心命题，再轻量带出主要展开方向。
- 语气要像记忆唤醒锚点，不像目录。
- 可以保留旧版核心概要的语义：帮助用户快速知道这篇文章大概讲什么、为什么值得复习。

不要这样写：

- “本文介绍了 A、B、C。”
- “这篇文章的核心是……”
- 只列知识点目录，不表达文章主张。

## 知识点切分：`units[]`

用途：每个 unit 是一个可复习的小关卡。

生成规则：

- 按原文阅读顺序切分，不按“好出题程度”重排。
- 背景段、铺垫段不强行切成知识点；只有具有复习价值的概念、方法、判断、边界或关系才进入 `units[]`。
- 每个 unit 应该围绕一个清晰的学习对象，避免一个 unit 混入多个彼此独立的观点。
- `unit.title` 是短标题，适合路径节点和列表。
- `unit.shortSummary` 是一句话扫读摘要。
- `unit.detailSummary` 是完整知识点描述，要表达主张、边界、适用场景或容易误解处。
- `unit.why` 说明为什么这个知识点值得复习，不能替代 `detailSummary`。

## 单元开场：`unit.overview.text`

用途：知识点开场页白板卡片正文。

生成规则：

- 帮用户知道接下来复习哪个核心理念、方法、判断或关系。
- 可以比 `detailSummary` 更亲切、更像 UI 文案。
- 要和第一道题分工明确：开场负责概括，第一题负责让用户主动判断。

不要这样写：

- 把 `detailSummary` 原样塞进开场。
- 把第一题答案直接写成开场，导致用户刚读完就被问同一句话。

## 题干：`question.stem`

用途：选择题、连线题等题目的用户可见题干。

生成规则：

- 题干要自足。用户单独看到题目，也应知道它在问什么。
- 题干应直接围绕知识点本身发问，例如概念含义、边界关系、判断原则或可迁移应用场景。
- 优先正向提问，让用户判断正确理解或正确行动。
- 轻量题可以短，但不能依赖隐含上下文。

避免：

- “根据原文”“文中提到”“这篇文章里”“这篇文章的方法/思路”“这里的”“上述”“这个说法”等依赖原文回忆或前文指代的写法。
- 没必要的负向题干，例如“哪一项不是”“最不应该”。只有考点本身就是边界排除时才谨慎使用。

## 单选题：`multiple_choice`

用途：轻量理解题和场景应用题。

结构规则：

- 默认四个选项。
- 只有一个正确答案。
- 三个干扰项必须作为一组选项整体设计，而不是各自孤立凑数。

生成顺序：

1. 确定本题考察目标。
2. 生成 `correctUnderstanding`。
3. 生成 `misconception` 或容易混淆点。
4. 基于正确理解和误区生成正确选项与干扰项。
5. 生成用户可见的 `question.explanation`。

干扰项规则：

- 整体同语境，不能离题凑数。
- 不能存在第二个近似正确答案。
- 至少一个干扰项承载真实常见误区或混淆点。
- 允许一个较明显排除项，但不能所有干扰项都一眼排除。
- 用户排除干扰项时，应更清楚本题考察的边界。

如果没有自然误区：

- 可以标记为“无自然误区”或改用“容易混淆点”。
- 不要硬编一个泛泛误区。

## 连线题：`matching`

用途：训练概念、职责、边界、场景、验证维度之间的对应关系。

结构规则：

- 当前真实 UI 默认左右各 4 个选项。
- `leftItems[]` 和 `rightItems[]` 都使用稳定 id 与用户可见 text。
- `pairs[]` 使用 `leftId` 和 `rightId` 建立一一对应。
- 卡片视觉宽高固定；一行文字和两行文字都在同一卡片规格里居中排版。

题干规则：

- `question.stem` 要说明“匹配什么关系”，例如职责、边界、场景、作用、使用时机或验证维度。
- 不要只写“请连线”。

选项内容规则：

- 右侧内容必须是具体含义、职责、使用时机、场景、典型例子或处理方式。
- 可以连接概念名词和解释，但不能只是同义词互换。
- 当原文列出一组类型、信号、条件、角色或步骤时，优先匹配它们与对应作用、处理方式、职责边界、判断结果或典型场景。
- 选项应尽量使用短语级表达，避免把长句塞进卡片。

好的方向：

- `Prompt / 规则文档 / Hook / CI` 匹配各自职责边界。
- `PostToolUse / PreToolUse / SessionStart / Stop` 匹配触发时机或用途。
- “需要 Hook 的信号”匹配到访问密钥、重复提醒、交给别人继续改、上下文压缩等具体场景。

不要这样写：

- 只把名词和空泛解释连起来。
- 为了凑 4 组而拆出没有学习价值的弱匹配。

交互规则对数据的影响：

- 第一次点击任意一侧卡片，该卡进入 `selected`。
- 第二次点击另一侧卡片时，第二张卡不进入蓝色选中态，而是两张卡立即同时进入 `correct` 或 `wrong`。
- 正确短反馈后进入 `locked`；错误短反馈后恢复 `normal`。
- 所有 pair 锁定后，才允许继续下一题。

## 答后解释：`question.explanation`

用途：选择题/连线题提交后，底部反馈浮窗用户可见正文。

生成规则：

- 前端只展示这一段融合后的解释。
- 它可以参考 `correctUnderstanding` 和 `misconception` 生成，但不要把两者分别展示给用户。
- 文案要短、明确，像即时轻提示，不写成长解析。
- 答对时帮助用户确认为什么对；答错时帮助用户快速修正误区。

不要这样写：

- 同时输出“正确理解：……”和“常见误区：……”两段给用户。
- 长篇引用原文。
- 把解释写成新的知识点全文。

## 来源定位：`question.sourceAnchorId`

用途：题目页“查看原文”跳转与高亮。

生成规则：

- 每道题必须绑定能支撑本题的真实 source anchor。
- 这个 anchor 要对应“这道题为什么这么问”的来源，而不是随便指向本 unit 附近段落。
- 后端必须校验 `sourceAnchorId` 指向存在的 `sourceAnchor.id`，并且其 `blockIds` 存在于 `chapter.source.blocks`。
- 需要避免问题 A 跳到问题 B 的原文片段。

前端行为：

- 用户点击查看原文后进入完整原文阅读页。
- 页面自动滚动到当前题来源 anchor 附近，并用高亮框或等价方式标出对应片段。

## 单元总结：`unit.summary`

用途：完成某个知识点 unit 后的阶段反馈。

生成规则：

- 只总结当前知识点，不总结整篇文章。
- 可以表达用户完成了这个 unit 的核心理解或阶段目标。
- `unit.summary.text` 应短，适合总结页卡片展示。

## 章节总结：`chapter.chapterSummary`

用途：完成整章后显示章节完成卡。

生成规则：

- `title` 是完成态标题，例如“章节完成”。
- `statsText` 是统计文案，例如“共 7 个核心知识点，21道题目”，可由程序计算。
- `encouragementText` 由模型生成，基于章节标题、文章概要、知识点和本轮完成结果，给用户一段带内容感的鼓励。
- 它是整章完成后的收束，不是单个 unit 的反馈。

## 推荐进入 prompt 的少量规则

正式 prompt 不应把所有正反例一次性塞进去。建议按生成环节拆分：

- Summary prompt：只放 summary 核心命题规则和一组正反例。
- Unit planning prompt：只放原文顺序、背景段不强行出题、知识点价值规则。
- Question prompt：放题干自足、少用原文回忆词、正向提问、干扰项误区规则。
- Matching prompt：放职责/边界/场景匹配规则和“不机械配同义词”的反例。
- Quality judge prompt：检查 source anchor、答案唯一性、干扰项质量、连线题是否有关系理解价值、是否有换壳重复题。

## 代码落点

| Prompt 阶段 | 代码文件 | 生成内容 | 不生成内容 |
|---|---|---|---|
| `sourceMap` | `src/v2/generation/prompts/buildV2PromptMessages.js` | `source.blocks` | 知识点、题目 |
| `reviewPathPlan` | `src/v2/generation/prompts/buildV2PromptMessages.js` | `summaryCard`、`units[].shortSummary/detailSummary/sourceAnchor`、`chapterSummary.encouragementText` | `unit.overview`、题目 |
| `unitCards` | `src/v2/generation/prompts/buildV2PromptMessages.js` | `unit.overview`、选择题、连线题、`unit.summary` | 前端单独展示的 `correctUnderstanding/misconception` |
| `qualityJudge` | `src/v2/generation/prompts/buildV2PromptMessages.js` | 质量 verdict 和 issues | 面向用户的新内容 |

模型调用入口：

- `src/v2/generation/modelPromptCaller.js` 负责把阶段名映射到对应 structured output schema，并复用旧版底层 `callOpenAIJson`。
- `src/v2/generation/generateReviewPathV2.js` 负责阶段编排、阶段输出 validator、最终 V2 contract validation。
- `src/v2/generation/runV2GenerationJob.js` 负责把成功/失败结果映射成前端生成状态；它不是旧版线上默认路径。

## 后续维护方式

- 新增字段时，先在 `v2-backend-field-contract-zh.md` 写清字段语义，再在本文档补充生成规则。
- 新增题型时，必须补充题干规则、选项规则、反馈规则和来源 anchor 规则。
- 新增 golden sample 时，只把其中稳定的质量原则沉淀到本文档；不要把一次样章里的偶然写法当作硬规则。
