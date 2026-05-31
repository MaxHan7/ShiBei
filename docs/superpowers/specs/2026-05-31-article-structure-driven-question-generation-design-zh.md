# 出题系统 v9：文章结构骨架驱动与教学评分 Rubric 设计

## 背景

过去几轮实验已经把题量、来源定位、认知动作蓝图和教学评分逐步补上。v8 的结果说明系统已经能稳定生成足够题目，但仍有两个根本问题：

- 题目和评分仍主要围绕单个知识点、单道题工作，缺少对整篇文章结构的理解。
- 评分维度能发现风险，但还不能稳定判断“这道题是否服务于文章主线中的某个学习节点”。

因此 v9 不继续堆 prompt 规则，而是在生成链路上游增加一层 `ArticleStructureMap`，让知识点选择、练习蓝图、题目生成和评分都引用同一个文章结构事实来源。

## 目标

1. 先建立文章结构骨架，再选择可复习知识点。
2. 每个知识点必须绑定文章结构节点和原文证据块。
3. 每道题必须说明自己服务哪个知识点、哪个认知动作、哪些证据。
4. 评分系统从“局部格式检查”升级为“学习有效性评分”。
5. 保持 API 向后兼容，iOS 用户侧不展示新诊断字段。

## 非目标

- 不在本轮重做 iOS UI。
- 不新增账号、数据库字段或用户可见设置。
- 不追求每篇文章固定知识点数量。
- 不把人工标注作为评分主引擎。人工只用于验证评分维度和阈值。

## 核心概念

### ArticleStructureMap

文章结构骨架是对原文的结构化理解，包含：

- `topic`：文章主题。
- `centralClaim`：核心主张。
- `nodes`：结构节点列表。
- `learningPath`：用户理解这篇文章的推荐学习路径。

每个结构节点包含：

- `id`
- `title`
- `role`：`definition` / `mechanism` / `contrast` / `method` / `boundary` / `example` / `case` / `conclusion` / `background`
- `claim`
- `whyItMatters`
- `evidenceBlockIds`
- `sourceOrder`

### KnowledgePoint 结构绑定

知识点新增兼容字段：

- `structureNodeId`
- `roleInArticle`
- `whyWorthReviewing`
- `sourceEvidenceIds`
- `expectedCognitiveActions`
- `claimFidelityScore`

知识点不再只是“可考的句子”，而是文章结构中的一个学习节点。

### Question 结构绑定

题目新增兼容字段：

- `structureNodeId`
- `requiredEvidenceIds`
- `claimFidelityScore`
- `sourceCoverageScore`
- `learningEffectivenessScore`

复合概念题必须覆盖所有关键概念的来源证据；如果证据不足，题目应被缩窄或降级。

## 评分 Rubric

v9 评分分为五层。

### 1. 文章结构覆盖

判断章节整体是否覆盖文章主线：

- 核心主张是否被知识点覆盖。
- 关键论证节点是否被覆盖。
- 方法、边界、案例是否按文章重要度被选择。
- 是否遗漏了理解文章必须掌握的节点。

### 2. 知识点有效性

判断单个知识点是否值得复习：

- 是否属于文章主线或关键方法/边界。
- 粒度是否合适。
- 是否忠实于原文主张。
- 是否有清晰证据块。
- 是否有明确复习价值。

### 3. 练习目标对齐

判断题目是否完成对应认知动作：

- `core_understanding`：是否帮助用户回忆核心主张。
- `misconception_boundary`：是否帮助用户分清真实混淆。
- `scenario_application`：是否能迁移到新场景，而不是换壳复述。

### 4. 题目教学质量

判断题目本身是否有复习价值：

- 答案是否唯一。
- 干扰项是否来自真实混淆。
- 解释是否忠实且能解释正确答案。
- 是否避免无意义原文识别题。
- 同知识点多题是否形成递进。

### 5. 来源证据质量

判断来源是否不仅能“证明答案”，还能帮助用户回到原文理解：

- `sourceSupportScore`：来源是否支撑答案。
- `sourcePrecisionScore`：来源是否定位准确。
- `sourceCoverageScore`：来源是否覆盖题目全部关键概念。
- `sourceLearningValueScore`：来源是否有学习导航价值。

## 数据流

```text
cleanContent
  -> buildSourceBlocks
  -> buildArticleStructureMap
  -> extractKnowledgeCandidates
  -> bindKnowledgePointsToStructure
  -> filterKnowledgePointsWithStructure
  -> buildPracticeBlueprint
  -> generateQuestions
  -> bindQuestionsToEvidence
  -> evaluateQuestionsWithPedagogicalRubric
  -> selectReviewableQuestions
```

## 错误处理

- `ArticleStructureMap` 生成失败时，系统回退到当前知识点提取链路，但记录 `generationMeta.articleStructureError`。
- 结构节点缺证据时，该节点可作为诊断保留，但不能作为高置信知识点。
- 题目涉及多个关键概念但来源只覆盖部分概念时，进入低置信或阻断，取决于是否影响答案唯一性。

## 测试策略

1. 单元测试结构骨架解析和规范化。
2. 单元测试知识点绑定结构节点。
3. 单元测试复合题来源覆盖评分。
4. 单篇基准 `UMr6ia1QubqOMw3aBUGbOw` 复测。
5. 对比 v8：不追求题量提升，重点看结构覆盖、主张忠实度、来源覆盖完整性。

## 验收标准

- 每个保留知识点都绑定 `structureNodeId` 或明确记录无法绑定原因。
- 复合题能识别“来源只覆盖部分概念”的风险。
- 评分报告能输出文章结构覆盖情况。
- v9 实验报告能回答：题目是否服务文章结构中的学习节点。

