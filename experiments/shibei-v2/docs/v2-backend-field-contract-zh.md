# 拾贝 V2 后端字段契约

本文档用于记录 V2 前端交互、后端 schema、prompt 输出之间的字段约定。后续每新增或修改一个字段，都必须同步说明字段用途、生成来源、前端展示位置和注意事项。

字段契约只回答“这个字段是什么、给哪里用”。prompt 生成质量规则集中记录在 `v2-prompt-field-rules-zh.md`，例如题干写法、干扰项质量、连线题选项特点、source anchor 精准性和答后解释文案规则。后端开发时两个文档需要一起看。

## 记录规则

每个字段必须至少说明：

- **字段名**：后端 JSON 中的稳定字段名。
- **用途**：这个字段表达什么，不表达什么。
- **生成来源**：由 prompt 生成、程序计算、用户行为写入，还是旧数据迁移。
- **前端使用位置**：哪些 SwiftUI 页面或组件会读它。
- **展示规则**：是否允许截断、是否完整展示、是否动态高度。
- **注意事项**：和相近字段的边界，避免混用。

字段不能只因为“现在某个页面刚好能用”就复用。只要语义不同，就必须拆成不同字段。

## Chapter Unit / Knowledge Point

V2 不再用旧版 flat `knowledgePoints + questions` 作为主合同。每个知识点在 V2 中是 `units[]` 的一项，因为它不仅包含知识点文本，还包含单元开场、题目、单元总结和来源锚点。

### `unit.id`

- **用途**：知识点单元的稳定 id。
- **生成来源**：后端生成，建议按章节内顺序稳定生成，例如 `unit-01`。
- **前端使用位置**：主页路径节点、章节详情知识点列表、题目路由、收藏题回跳。
- **展示规则**：不展示。
- **注意事项**：不要用数组下标作为唯一身份；后续重排或重新生成时要尽量保持同一知识点 id 稳定。

### `unit.order`

- **用途**：知识点在章节复习路径中的顺序。
- **生成来源**：后端根据原文顺序和章节规划生成。
- **前端使用位置**：主页路径节点排序、章节详情知识点列表排序、单元进度。
- **展示规则**：可用于调试，不直接展示。
- **注意事项**：排序必须符合原文阅读顺序，不按“好出题程度”排序。

### `unit.title`

- **用途**：知识点最短标题。
- **生成来源**：prompt 生成。
- **前端使用位置**：主页节点文字、章节详情折叠行标题、题目流程里的单元标识、收藏题上下文。
- **展示规则**：允许在窄空间截断；通常控制在 4-10 个汉字或等价长度。
- **注意事项**：它不是完整知识点描述，不能拿来直接出题或作为答后解释。

示例：

```json
"title": "Hook 是什么"
```

### `unit.nodeLabel`

- **用途**：主页点击知识点节点后，浮窗里显示的知识点标题短语。
- **生成来源**：prompt 生成；如果 `unit.title` 已经是合适的标题短语，可以直接复用；不能直接复用 `shortSummary`。
- **前端使用位置**：主页学习路径节点浮窗的第一行说明。
- **展示规则**：适合在浮窗中显示一到两行；通常 4-24 个汉字或等价长度；像标题，不像完整摘要。
- **注意事项**：它只负责“指向这个知识点的核心”。如果需要一句话扫读摘要，用 `shortSummary`；如果需要完整解释，用 `detailSummary`。

示例：

```json
"nodeLabel": "游戏化的概念与核心定义"
```

### `unit.shortSummary`

- **用途**：一句话版知识点总结，用于用户快速扫读。
- **生成来源**：prompt 生成，可从 `detailSummary` 压缩而来，但需要单独输出。
- **前端使用位置**：章节详情知识点折叠态、全部知识点列表预览。
- **展示规则**：默认最多一到两行；列表卡片里可以尾部省略。
- **注意事项**：它比 `title` 更完整，但仍不是长解释。不要把它和 `overview.text` 混用。

示例：

```json
"shortSummary": "Hook 是关键动作前后的流程控制器。"
```

### `unit.detailSummary`

- **用途**：完整知识点描述，表达这个知识点的主张、边界、适用场景或容易误解的地方。
- **生成来源**：prompt 生成，是题目生成和章节详情展开态的重要上下文。
- **前端使用位置**：章节详情知识点展开浮窗、查看全部知识点、知识点详情说明；也可作为题目生成的主上下文。
- **展示规则**：需要完整展示，不能默认截断；前端容器应支持动态高度。
- **注意事项**：这是“完整知识点”，不是单元开场页文案。`overview.text` 可以基于它改写得更亲切，但两者职责不同。

示例：

```json
"detailSummary": "Hook 不是另一个提示词，而是在 AI agent 的关键动作前后加入规则、上下文和验证的控制机制。它适合处理那些不能只靠模型记住、而需要每次稳定触发的流程约束。"
```

### `unit.why`

- **用途**：说明为什么这个知识点值得进入复习路径。
- **生成来源**：prompt 生成，服务质量校验和后续调试。
- **前端使用位置**：默认不在主流程展示；可用于 debug、质量评估或未来解释型页面。
- **展示规则**：默认不展示给用户。
- **注意事项**：它不是知识点描述，不能替代 `detailSummary`。

### `unit.overview.text`

- **用途**：用户进入某个知识点单元第一页时看到的开场讲解文案。
- **生成来源**：prompt 基于 `detailSummary` 和原文上下文生成。
- **前端使用位置**：核心知识点 / 单元总览页面的白板卡片正文。
- **展示规则**：完整展示；页面卡片可动态高度或按设计稿限制承载量。
- **注意事项**：它是 UI 文案，不是知识点契约本体。不要用它作为列表短描述，也不要用它替代题目生成上下文。

### `unit.sourceAnchor`

- **用途**：把知识点和原文来源绑定起来，支持查看原文、高亮和质量校验。
- **生成来源**：prompt 根据 source blocks 选择，后端校验 blockIds 是否存在。
- **前端使用位置**：查看原文页滚动定位和高亮框。
- **展示规则**：`label` 可以展示为来源位置；`quote` 默认不直接展示，除非进入来源详情。
- **注意事项**：`quote` 必须来自原文或与原文严格一致的清洗结果，不允许模型自由改写。

示例：

```json
"sourceAnchor": {
  "id": "anchor-unit-01",
  "label": "第 6-12 段",
  "blockIds": ["p-006", "p-007", "p-008"],
  "quote": "Hook 不是另一个提示词，而是在关键动作前后..."
}
```

## Chapter Completion Summary

章节总结页出现在最后一个知识点的单元总结页之后。它表达的是整章完成后的收束和鼓励，不是单个知识点的完成反馈。

### `chapter.chapterSummary.title`

- **用途**：章节总结页结果卡的固定标题。
- **生成来源**：前端或后端常量，当前固定为“章节完成”。
- **前端使用位置**：章节总结页结果卡标题。
- **展示规则**：完整展示，不由模型自由生成。
- **注意事项**：不要把模型生成的鼓励语写进标题；标题只负责页面状态表达。

### `chapter.chapterSummary.statsText`

- **用途**：章节完成统计文案，例如“共 7 个核心知识点，21道题目”。
- **生成来源**：程序根据章节内 `units.length`、题目总数、复习结果计算。
- **前端使用位置**：章节总结页标题下方的小字统计行。
- **展示规则**：完整展示，居中；字段较短，不默认省略。
- **注意事项**：这是统计信息，不由模型自由发挥。若后续需要加入正确率，应作为计算字段追加，不和鼓励语合并。

示例：

```json
"statsText": "共 7 个核心知识点，21道题目"
```

### `chapter.chapterSummary.encouragementText`

- **用途**：章节完成页中间的鼓励性总结文案，用来在用户完成整章复习时给出轻量收束和正反馈。
- **生成来源**：prompt 基于章节标题、`summaryCard.text`、`units[].detailSummary` 和用户本轮完成结果生成。
- **前端使用位置**：章节总结页结果卡正文，即 HTML 黄金稿里的 `chapter-completion-summary-text`。
- **展示规则**：完整展示；当前设计稿承载一到两行左右的短文案，前端可以使用动态高度或限制 prompt 字数避免溢出。
- **注意事项**：它不是章节概要，不承担解释整篇文章结构的职责；也不是统计文案。语气应该温和、具体、和本章内容有关，避免空泛鸡汤。不要写成“你真棒”这类和章节内容无关的泛化鼓励。

示例：

```json
"encouragementText": "在了解过 Hook 的原理和用法之后，你的 vibe coding 能力又更上一层楼了。"
```

## Chapter Summary Card

章节概要字段承担整篇文章/整章核心概要的产品语义，用来在用户开始复习前唤醒文章上下文。

### `chapter.summaryCard.text`

- **用途**：整章/整篇文章的概要文案，概括文章核心主题、主张或学习入口。
- **生成来源**：prompt 基于清洗后的全文生成；生成规则以 `v2-prompt-field-rules-zh.md` 的章节概要规则为准。
- **前端使用位置**：章节概要页正文卡、章节详情 hero/摘要区域；必要时也可作为首页当前章节 banner 的辅助信息来源。
- **展示规则**：章节概要页应完整展示；窄卡片或 banner 场景可以按设计稿限制行数后省略。
- **注意事项**：它不是章节完成鼓励语，也不是某一个知识点的总结。整章完成页使用 `chapter.chapterSummary.encouragementText`；知识点列表和展开态使用 `unit.shortSummary` / `unit.detailSummary`。

### `chapter.summaryCard.note`

- **用途**：后台校准说明或生成备注，用于记录这篇文章概要生成时的判断依据、限制或质量提示。
- **生成来源**：prompt 或后端质量检查生成。
- **前端使用位置**：默认不展示给用户。
- **展示规则**：不进入正式 UI；可用于 debug、质量回看或后台工具。
- **注意事项**：不要把 `note` 当成概要正文兜底展示；用户可见概要只读 `summaryCard.text`。

## Unit Summary

单元总结出现在用户完成某一个知识点 unit 的最后一道题之后。它只总结当前知识点的完成状态，不总结整篇文章。

### `unit.summary.title`

- **用途**：单元总结卡标题，表达当前知识点完成状态。
- **生成来源**：可由前端/后端常量或 prompt 生成；当前可以固定为“单元完成”。
- **前端使用位置**：单元总结页结果区域。
- **展示规则**：完整展示。
- **注意事项**：不要和 `chapter.chapterSummary.title` 混用；单元总结是小阶段反馈，章节总结是整章收束。

### `unit.summary.text`

- **用途**：当前知识点完成后的简短总结/反馈，帮助用户知道这个知识点已经掌握了什么。
- **生成来源**：prompt 基于 `unit.detailSummary`、本 unit 的题目和用户完成表现生成。
- **前端使用位置**：单元总结页正文区域。
- **展示规则**：完整展示；当前设计可以承载一小段文字。
- **注意事项**：它是对“当前知识点”的总结，不是整章总结，也不是知识点本体描述。知识点本体仍使用 `unit.detailSummary`。

## Question Feedback

V2 的答后反馈前端只展示一句解释。之前讨论过的“正确理解”和“常见误区”可以作为模型生成或质检时的中间语义，但不应在用户界面同时展示多段解释。

### `question.explanation`

- **用途**：每道题答后反馈浮窗中唯一用户可见的解释文案。
- **生成来源**：prompt 根据题目、正确答案、常见误区和来源片段生成；应把“正确理解”和“容易误解点”融合成一句短解释。
- **前端使用位置**：选择题/连线题提交后的底部反馈浮窗正文。
- **展示规则**：完整展示；前端反馈浮窗支持随文本行数动态增高。
- **注意事项**：这是用户能看到的解释。不要在前端再同时展示 `correctUnderstanding` 和 `misconception`，否则会造成重复和信息负担。

### `question.correctUnderstanding`

- **用途**：模型中间语义或质检字段，表达这道题希望用户形成的正确理解。
- **生成来源**：prompt 生成，可用于生成 `question.explanation`、错误选项校验和质量评估。
- **前端使用位置**：默认不展示给用户。
- **展示规则**：不进入正式 UI；可用于 debug/质检。
- **注意事项**：如果未来后端选择不持久化中间字段，也可以只保留在生成链路内部；一旦持久化，前端也不应默认展示它。

### `question.misconception`

- **用途**：模型中间语义或质检字段，表达这道题对应的常见误区。
- **生成来源**：prompt 生成，可用于生成干扰项、红色错误反馈判断和 `question.explanation`。
- **前端使用位置**：默认不展示给用户。
- **展示规则**：不进入正式 UI；可用于 debug/质检。
- **注意事项**：它不是另一段用户可见解释。用户可见的纠偏应合并进 `question.explanation`。

## Internal Generation / Quality Metadata

以下字段只服务 V2 生成链路和质量报告，不属于 SwiftUI 正式展示合同。前端正式页面仍读取 `units[]`、`questions[]`、`sourceAnchorId` 等稳定用户可见字段。

### `generationMeta.reviewPathPlan.knowledgeObjects[]`

- **用途**：记录 `reviewPathPlan` 阶段识别出的知识对象地图，先判断哪些知识对象应独立成 unit，再生成前端可见 `units[]`。
- **ECD 对应**：`Domain Modeling` 的上游知识对象边界判断。
- **生成来源**：`reviewPathPlan` 阶段生成，落在 `generationMeta.reviewPathPlan.knowledgeObjects[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI；只用于 HTML 质量报告、debug 和 prompt 迭代。
- **注意事项**：这是为了避免结构性漏点。一个 unit 不应合并多个 `boundaryDecision === "standalone_unit"` 的知识对象。例如 DMC 模型如果具有独立分层结构、原文证据和自然 matching 价值，就不应被合并进“游戏化定义”。

推荐结构：

```json
"reviewPathPlan": {
  "knowledgeObjects": [
    {
      "id": "ko_3",
      "title": "DMC模型：游戏元素的金字塔结构",
      "nodeLabel": "DMC模型",
      "knowledgeShape": "layered_framework",
      "roleInArticle": "core_argument",
      "sourceBlockIds": ["p-025", "p-026"],
      "boundaryDecision": "standalone_unit",
      "boundaryReason": "DMC 是独立分层模型，有自己的证据关系和自然连线题价值。"
    }
  ],
  "units": [
    {
      "id": "unit_3",
      "title": "DMC模型：游戏元素的金字塔结构",
      "sourceKnowledgeObjectIds": ["ko_3"],
      "sourceAnchor": { "id": "anchor-unit-3", "blockIds": ["p-025", "p-026"] }
    }
  ]
}
```

### `generationMeta.reviewPathPlan.units[].sourceKnowledgeObjectIds`

- **用途**：记录每个可见 unit 来源于哪些知识对象。
- **生成来源**：`reviewPathPlan` 阶段生成，保存在 `generationMeta.reviewPathPlan.units[]` 中。
- **前端使用位置**：不展示。
- **展示规则**：不进入正式 SwiftUI `chapter.units[]`；只用于质量报告确认 unit 边界。
- **注意事项**：正式 `chapter.units[]` 会剥离该字段，避免前端依赖内部 prompt 结构。

### `generationMeta.articleUnderstanding`

- **用途**：记录 AI 对整篇文章的领域分析，包括文章核心命题、文章结构、可复习段落和不应强行出题的背景/铺垫段落。
- **ECD 对应**：`Domain Analysis`。
- **生成来源**：`articleUnderstanding` 阶段生成。
- **前端使用位置**：默认不进入正式 UI；可在 debug 或质量报告中查看。
- **展示规则**：不展示给普通用户。
- **注意事项**：这一阶段不生成题目。它可以为 `chapter.summaryCard.text` 提供上游依据，但不能替代用户可见章节概要字段。

推荐结构：

```json
"articleUnderstanding": {
  "coreThesis": "文章围绕游戏化设计从功能可用性转向体验质量展开。",
  "articleStructure": [
    {
      "id": "section-1",
      "title": "游戏化概念与体验目标",
      "role": "core_argument",
      "sourceAnchorIds": ["anchor-1"]
    }
  ],
  "reviewableSections": ["section-1"],
  "nonReviewableSections": [
    {
      "sourceAnchorId": "anchor-0",
      "reason": "背景铺垫，不形成独立复习知识点。"
    }
  ]
}
```

### `generationMeta.knowledgeModel`

- **用途**：记录 unit 切分背后的知识建模判断，例如每个 unit 的知识形状、来源依据和为什么成为可复习知识对象。
- **ECD 对应**：`Domain Modeling`。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.knowledgeModel` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：`knowledgeShape` 是题型选择的重要依据，但不是前端展示字段。前端继续展示 `unit.title`、`unit.nodeLabel`、`unit.shortSummary`、`unit.detailSummary`。

### `generationMeta.unitLearningClaims[]`

- **用途**：记录每个 unit 希望判断用户是否掌握的学习理解，即“用户学完后应该能做到什么”。
- **ECD 对应**：`Student Model`。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitLearningClaims[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：它不是用户可见文案。不要把 `learningClaim` 直接显示在 SwiftUI；用户可见仍使用 `unit.overview.text`、`question.explanation` 等经过 UI 化的文案。

### `generationMeta.unitSubObjectives[]`

- **用途**：记录一个 unit 内部的可考小目标。它解决“unit 边界正确，但 unit 内部证据覆盖不足”的问题。
- **ECD 对应**：`Student Model` 的 assessment target 层。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitSubObjectives[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI；HTML 质量报告展示在 Coverage Matrix 中。
- **注意事项**：它不是题目数量规则，也不是目录拆分。`required` 小目标必须向下生成 claim 和 evidence，确保像 DMC 这种大知识点内部的“层级作用对应”“常见误区”不会被一个宽泛题目吞掉。

推荐结构：

```json
"unitSubObjectives": [
  {
    "unitId": "unit-3",
    "subObjectiveId": "sub-3-1",
    "title": "DMC 三层与作用对应",
    "type": "layer",
    "importance": "required",
    "learningTarget": "用户能把 Dynamics、Mechanics、Components 分别对应到设计目标、行为机制和界面组件。",
    "sourceAnchorId": "anchor-unit-3"
  }
]
```

推荐结构：

```json
"unitLearningClaims": [
  {
    "unitId": "unit-3",
    "subObjectiveId": "sub-3-1",
    "claimId": "claim-3-1",
    "claimType": "structure_understanding",
    "learningClaim": "用户能区分 DMC 三层分别承担的设计作用。",
    "sourceAnchorId": "anchor-unit-3"
  }
]
```

### `generationMeta.unitEvidenceAngles[]`

- **用途**：记录同一个 `learningClaim` 应从哪些不同证据角度被观察。它解决“知识点已覆盖，但只被一道宽泛题目浅层考察”的问题。
- **ECD 对应**：`Evidence Model` 的 evidence angle 层。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitEvidenceAngles[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI；HTML 质量报告展示在 Angle Coverage Matrix 中。
- **注意事项**：它不是题量规则，也不是前端文案。`required` angle 必须被 `unitAssemblyPlan.selectedTasks[].angleIds[]` 覆盖。只有当不同角度能产生不同可观察 evidence 时才拆分。

推荐结构：

```json
"unitEvidenceAngles": [
  {
    "unitId": "unit-3",
    "angleId": "angle-3-1",
    "subObjectiveId": "sub-3-1",
    "claimId": "claim-3-1",
    "angleType": "structure_mapping",
    "importance": "required",
    "anglePurpose": "确认用户能把 DMC 三层分别对应到正确作用，而不是只记住三个英文名。",
    "sourceAnchorId": "anchor-unit-3"
  }
]
```

推荐 `angleType`：

- `definition_grasp`：定义/核心概念掌握。
- `structure_mapping`：结构、层级、类型与作用的对应。
- `boundary_discrimination`：边界辨析。
- `misconception_detection`：常见误区识别。
- `scenario_transfer`：场景迁移。
- `mechanism_reasoning`：机制或因果理解。
- `source_grounding`：能回到原文证据。

### `generationMeta.unitEvidenceNeeds[]`

- **用途**：记录什么用户表现可以证明对应 `learningClaim`。它是题型选择的证据依据。
- **ECD 对应**：`Evidence Model`。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitEvidenceNeeds[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：质量报告必须展示它，以便人工判断题目是否真的在收集有价值证据。

推荐结构：

```json
"unitEvidenceNeeds": [
  {
    "unitId": "unit-3",
    "evidenceId": "ev-3-1",
    "subObjectiveId": "sub-3-1",
    "claimId": "claim-3-1",
    "angleId": "angle-3-1",
    "evidenceType": "map_structure_relation",
    "coverageRequirement": "required",
    "evidenceNeed": "用户能把动力层、机制层、组件层分别匹配到正确作用。",
    "observableResponse": "完成层级与作用的连线匹配。",
    "sourceAnchorId": "anchor-unit-3"
  }
]
```

`coverageRequirement` 规则：

- `required`：本轮生成必须由 `unitAssemblyPlan.selectedTasks[].evidenceIds[]` 覆盖。
- `supporting`：可以被覆盖，也可以在不牺牲 required evidence 的情况下跳过。
- `optional`：用于记录低优先级或未来可扩展证据，不要求本轮生成。
- 该字段不进入 SwiftUI，但质量报告必须展示它，方便人工判断模型是否漏掉了该 unit 内部的关键证据。
- `angleId` 必须引用 `unitEvidenceAngles[]`，用于判断该 evidence 属于哪个考察角度。

### `generationMeta.unitTaskPlan[]`

- **用途**：记录每个 evidence 适合用什么任务引出，以及为什么这个任务合适。
- **ECD 对应**：`Task Model`。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitTaskPlan[]` 下。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：`taskPurpose` 是选择题/连线题的内部目的，不等于前端题型。前端仍只关心 `question.type`。
- **角度规则**：`angleIds[]` 记录该 task 计划覆盖哪些 evidence angle；它应来自 `unitEvidenceAngles[]`，并在质量报告中用于检查多角度考察是否成立。

推荐结构：

```json
"unitTaskPlan": [
  {
    "unitId": "unit-3",
    "taskPlanId": "tp-3-1",
    "evidenceIds": ["ev-3-1"],
    "angleIds": ["angle-3-1"],
    "taskAffordance": "matching",
    "taskPurpose": "layer_role_matching",
    "whyThisTask": "DMC 是分层模型，连线题能直接观察用户是否理解层级和作用的对应关系。"
  }
]
```

### `generationMeta.unitAssemblyPlan[]`

- **用途**：记录最终选择生成哪些题，以及每道题为什么存在。不限制题目数量。
- **ECD 对应**：`Assembly Model`。
- **生成来源**：当前由 `ecdPlanning` 生成，落在 `generationMeta.ecdPlanning.unitAssemblyPlan[]` 下。`selectedTasks[]` 已开始驱动下游 `unitPracticePlan.questionPlans[]`。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：题目数量不是质量目标。`selectedTasks` 的数量由 `learningClaim` 和 `evidenceNeed` 自然形成；可以多，可以少。不要在 schema 或 prompt 中写死“每个 unit 固定 N 道题”。
- **覆盖规则**：`required` evidence 和 `required` angle 都不能被跳过；如果某个 required evidence 没有出现在任何 selected task 的 `evidenceIds[]` 中，或某个 required angle 没有出现在任何 selected task 的 `angleIds[]` 中，`ecdPlanning` validation 会失败。

推荐结构：

```json
"unitAssemblyPlan": [
  {
    "unitId": "unit-3",
    "selectedTasks": [
      {
        "questionPlanId": "qp-3-1",
        "taskPlanId": "tp-3-1",
        "evidenceIds": ["ev-3-1"],
        "angleIds": ["angle-3-1"],
        "taskAffordance": "matching",
        "taskPurpose": "layer_role_matching",
        "assemblyReason": "该 task 直接覆盖 DMC 结构理解的核心 evidence，因此进入本 unit。"
      }
    ],
    "skippedEvidence": []
  }
]
```

### `generationMeta.unitPracticePlans[]`

- **用途**：旧的 V2 split-stage 中间字段名，记录 unit 练习目标和题型计划。
- **生成来源**：由编排层从 `ecdPlanning.unitAssemblyPlan[].selectedTasks[]` 确定性派生，不再让模型重新规划。
- **前端使用位置**：默认不进入正式 UI；可在 debug 或质量报告中查看。
- **展示规则**：不展示给普通用户。
- **注意事项**：这是过渡 adapter 字段。它消费 ECD `selectedTasks[]`，而不是重新独立选择题型。后续应逐步被 ECD 字段组替代：`unitLearningClaims[]`、`unitEvidenceAngles[]`、`unitEvidenceNeeds[]`、`unitTaskPlan[]`、`unitAssemblyPlan[]`。不要继续把“每个 unit 固定 2 道题”写进该字段的语义。

### `practiceGoal`

- **用途**：旧的内部练习目标字段，描述一道题或一组题要训练的理解目标。
- **生成来源**：`unitPracticePlan` 阶段生成。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：后续推荐迁移为 `learningClaim` + `evidenceNeed`。它的 `commonMisconception` 用于生成干扰项和解释，不等于用户可见的另一段错误解析。

### `questionPlan`

- **用途**：旧的内部题目计划字段，描述题型、目的、对应 practice goal 和 source anchor。
- **生成来源**：`unitPracticePlan` 阶段生成。
- **前端使用位置**：默认不展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：后续推荐迁移为 `selectedTasks[]`。当前 `questionPlan.id` 应来自 ECD `selectedTask.questionPlanId`，并且不能再表达固定题量；matching 也不应被过度保守过滤，分层模型、类型集合、流程步骤、信号集合、角色职责等高价值关系都应进入 task planning 判断。

### `generationMeta.qualityDiagnostics[]`

- **用途**：记录 deterministic guardrails 对每道题的检查结果，包括禁用题干、干扰项价值、连线关系价值、解释 UI fit 和 source anchor 精准度。
- **生成来源**：`qualityGuardrails` 程序计算。
- **前端使用位置**：默认不展示；质量 HTML report 会展示。
- **展示规则**：不进入正式 UI。
- **注意事项**：当前策略是 diagnostic-only：即使出现 error 级 issue，也只进入质量报告，不阻断生成。这样便于先完整查看模型输出，再把质量标准前移到出题 prompt。后续如果需要自动 repair loop，可以在此字段基础上恢复阻断或修复。

## Question Source Anchor

### `question.sourceAnchorId`

- **用途**：标记这道题对应的原文片段来源，用于“查看原文”时跳转并高亮正确片段。
- **生成来源**：由 prompt 在题目生成时选择，后端必须校验它指向本 unit 或本题可用的真实 `sourceAnchor.id`，且 anchor 的 `blockIds` 必须存在于 `chapter.source.blocks`。
- **前端使用位置**：题目页和答后反馈浮窗中的“查看原文”；查看原文页滚动定位和高亮框。
- **展示规则**：字段本身不展示；对应原文片段在查看原文页高亮。
- **注意事项**：它必须对应“这道题为什么这么问”的来源，不是随便指向当前知识点附近段落。需要避免问题 A 跳到问题 B 的原文片段。若一道题需要更细粒度来源，后续可以升级为题目级独立 anchor，但第一版先要求精准引用已有 anchor。

## Matching Question

连线题用于训练概念、职责、边界、场景或验证维度之间的对应关系，不用于机械地配同义词。视觉和交互状态已经在 `design.md`、`page-composition.md` 和 HTML 黄金稿中记录；本节只定义后端字段语义。

### `question.stem`

- **用途**：连线题题干，说明用户需要匹配的关系类型。
- **生成来源**：prompt 生成。
- **前端使用位置**：连线题顶部题干卡。
- **展示规则**：完整展示；题干卡可随内容动态高度。
- **注意事项**：题干应该说明“匹配什么关系”，例如职责、边界、场景或验证维度，不要写成泛泛的“请连线”。

### `question.leftItems` / `question.rightItems`

- **用途**：连线题左右两列选项。每个 item 包含稳定 `id` 和用户可见 `text`。
- **生成来源**：prompt 生成。
- **前端使用位置**：连线题左右两列固定宽高卡片。
- **展示规则**：选项卡尺寸固定；一行或两行文字都居中显示，不因文字少而改变卡片尺寸。
- **注意事项**：当前真实题型按左右各 4 个选项设计。左右项应形成有学习价值的对应关系，避免同义词硬配、常识硬配或纯记忆配对。

### `question.pairs`

- **用途**：连线题正确答案映射，使用 `leftId` 和 `rightId` 指向左右选项。
- **生成来源**：prompt 生成，后端校验。
- **前端使用位置**：连线题判断用户第二次点击后是 `correct` 还是 `wrong`。
- **展示规则**：不展示给用户。
- **注意事项**：第一版要求一一对应：每个 left item 必须且只能对应一个 right item；`pairs.length` 应等于 `leftItems.length`，且所有 id 必须存在。前端交互规则是：第一次点击单卡进入蓝色 `selected`，第二次点击不再进入蓝色，而是两张卡同时进入正确或错误短反馈。

## Engineering State Fields

下面这些字段属于工程端状态字段。用户只需要定义交互结果；字段设计由开发端根据交互规则补齐，不要求设计端逐项决定实现细节。

## Review Session State

复习进度状态用于“退出后回到正确页面”和“从不同入口进入后返回正确位置”。它不是模型生成字段，而是用户行为状态，由客户端和后端共同维护。

### `reviewSession.currentCard`

- **用途**：记录用户当前停在复习流程的哪一屏，支持下次从首页继续时恢复到精确页面。
- **生成来源**：用户行为写入。用户进入章节概要、知识点开场页、题目页、答后反馈、单元总结页、章节总结页时更新。
- **前端使用位置**：首页“继续复习”、App 重启恢复、章节详情“继续复习”。
- **展示规则**：字段本身不展示；用于决定打开哪个页面。
- **注意事项**：这是页面级状态，不是进度条字段。进度条应由当前 unit 内已完成步骤计算得出。

推荐结构：

```json
"currentCard": {
  "type": "question",
  "chapterId": "chapter-001",
  "unitId": "unit-02",
  "questionId": "q-004"
}
```

`type` 第一版建议使用：

- `chapter_overview`：章节概要页。
- `unit_overview`：知识点开场页。
- `question`：题目页，未作答或正在作答。
- `question_feedback`：题目已作答，答后反馈浮窗应恢复显示。
- `unit_summary`：单元总结页。
- `chapter_summary`：章节总结页。

### `reviewSession.questionStates`

- **用途**：记录题目级作答状态，确保从查看原文返回、退出恢复、笔记入口进入时，题目保持正确状态。
- **生成来源**：用户作答、关闭/重新打开反馈浮窗、收藏入口打开题目时写入。
- **前端使用位置**：选择题页、连线题页、答后反馈浮窗、查看原文返回。
- **展示规则**：字段本身不展示；用于还原题目 UI 状态。
- **注意事项**：从题目未作答入口进入查看原文，返回后仍是未作答；从答后反馈浮窗进入查看原文，返回后仍应是已作答并显示反馈浮窗。

推荐结构：

```json
"questionStates": {
  "q-004": {
    "status": "answered",
    "result": "correct",
    "selectedOptionId": "A",
    "matchedPairs": [],
    "feedbackVisible": true
  }
}
```

选择题使用 `selectedOptionId`；连线题使用 `matchedPairs` 和可选的 `lockedPairIds`。`feedbackVisible` 控制答后浮窗是否显示；如果用户关闭浮窗，IP 形象回到未答题状态，点击 IP 可重新打开。

### `reviewSession.completedStepIds`

- **用途**：记录已经完成的章节步骤，用于计算 unit 进度条、章节路径节点进度和是否能进入下一页。
- **生成来源**：用户完成章节概要、知识点开场、每道题、单元总结时写入。
- **前端使用位置**：顶部 unit 进度条、主页节点周围进度环、继续按钮可用性。
- **展示规则**：字段本身不展示。
- **注意事项**：不要让前端只靠页面 index 推进；已完成步骤应可恢复、可校验。

推荐 id 形态：

```json
"completedStepIds": [
  "chapter_overview",
  "unit-01:overview",
  "unit-01:q-001",
  "unit-01:q-002",
  "unit-01:summary"
]
```

## Favorite Question Route

收藏题本身只记录“收藏的是哪道题”。从笔记页进入收藏题时，额外创建一个临时的导航上下文，用来决定返回和继续逻辑。

### `favorite.chapterId` / `favorite.unitId` / `favorite.questionId`

- **用途**：定位收藏的具体题目。
- **生成来源**：用户点击收藏时写入。
- **前端使用位置**：笔记页收藏卡、点击收藏卡进入题目页。
- **展示规则**：字段本身不展示。
- **注意事项**：收藏题打开后默认进入“未作答状态”，即使用户过去在正式复习流程中已经做过这道题。收藏练习不应污染正式复习进度，除非后续产品明确要合并。

### `favoriteRoute`

- **用途**：临时路由上下文，说明当前题目是从笔记页收藏列表进入，而不是从正常章节复习流进入。
- **生成来源**：客户端在用户点击笔记页收藏卡时创建；后端可在收藏列表接口中返回 next/previous 所需 id。
- **前端使用位置**：收藏题练习页返回按钮、继续按钮。
- **展示规则**：字段本身不展示。
- **注意事项**：它不是模型字段，也不需要长期写入章节 JSON。它解决的是“从哪里来、继续到哪里去”的导航问题。

推荐结构：

```json
"favoriteRoute": {
  "origin": "notes",
  "favoriteId": "favorite-001",
  "chapterId": "chapter-001",
  "unitId": "unit-02",
  "questionId": "q-004",
  "nextFavoriteId": "favorite-002"
}
```

交互规则：

- 从笔记页点击收藏题，进入对应题目的未作答状态。
- 左上角返回回到笔记页。
- 作答后继续按钮进入收藏列表中的下一道收藏题。
- 收藏题练习不改变 `reviewSession.currentCard`，避免打断首页当前复习章节。

## Notification Target

通知字段用于把通知卡点击跳转到正确页面。视觉状态由组件库决定；后端只提供通知类型、目标和必要上下文。

### `notification.type`

- **用途**：区分通知业务类型。
- **生成来源**：生成任务或系统事件写入。
- **前端使用位置**：通知列表卡片 icon、标题、点击行为。
- **展示规则**：字段本身不展示；映射到通知卡视觉和文案。
- **注意事项**：第一版重点支持 `chapter_generation_success` 和 `chapter_generation_failure`。

### `notification.target`

- **用途**：定义点击通知后打开哪个页面。
- **生成来源**：生成任务完成或失败时由后端写入。
- **前端使用位置**：通知页点击通知卡。
- **展示规则**：字段本身不展示。
- **注意事项**：成功通知和失败通知跳转不同。成功通知进入章节详情页；失败通知进入生成失败通知详情页。

推荐结构：

```json
"target": {
  "kind": "chapter_detail",
  "chapterId": "chapter-001"
}
```

失败通知：

```json
"target": {
  "kind": "generation_failure_detail",
  "generationJobId": "job-001",
  "chapterId": "chapter-001"
}
```

### `chapter.failureReason`

- **用途**：生成失败详情页展示失败原因和重新生成建议。
- **生成来源**：后端生成链路捕获失败类型和可读错误原因后写入。
- **前端使用位置**：生成失败通知详情页。
- **展示规则**：用户可见，应该短而明确。
- **注意事项**：不要直接展示底层异常堆栈或供应商错误原文；需要转换为用户能理解的原因。

## Generation Status

生成状态字段用于全部章节页的生成中卡片、通知、生成弹窗关闭后的插卡动画和失败详情。视觉 tag 仍按组件库设计；后端只提供稳定状态。

### `chapter.status`

- **用途**：章节的机器可读状态，决定章节能否开始复习、是否显示生成中、是否进入失败详情。
- **生成来源**：后端生成任务状态机写入。
- **前端使用位置**：全部章节页章节卡、章节详情页可用性、通知点击后的目标校验。
- **展示规则**：字段本身不展示。
- **注意事项**：不要把中文文案作为状态判断依据。

建议枚举：

- `generating`：生成中总态。
- `completed`：生成完成，可进入章节详情和开始复习。
- `failed`：生成失败，可进入失败详情并重新生成。

### `generationMeta.currentStage`

- **用途**：生成中的细分阶段，用于显示“正在提取正文 / 正在生成知识点 / 正在生成题目”等进度文案。
- **生成来源**：后端生成 pipeline 阶段更新。
- **前端使用位置**：全部章节页生成中卡片主体文字、生成任务调试。
- **展示规则**：字段本身不展示；前端可映射为用户可读文案。
- **注意事项**：它比 `chapter.status` 更细。`chapter.status = generating` 时才需要频繁更新它。

建议枚举：

- `submitted`
- `extracting_content`
- `generating_points`
- `generating_questions`
- `quality_checking`
- `completed`
- `failed_extract_article`
- `failed_extract_video`
- `failed_points`
- `failed_questions`
- `failed_no_qualified_questions`

### `chapter.displayStatusText`

- **用途**：给前端直接显示的用户可读状态文案。
- **生成来源**：后端根据 `chapter.status` 和 `generationMeta.currentStage` 映射得到，也可以由前端本地映射。
- **前端使用位置**：全部章节页生成中卡片、状态 tag 辅助文案。
- **展示规则**：用户可见。
- **注意事项**：推荐把它视为派生字段，不作为业务判断依据。业务判断只看 `chapter.status` 和 `generationMeta.currentStage`。

示例：

```json
{
  "status": "generating",
  "displayStatusText": "正在生成知识点",
  "generationMeta": {
    "currentStage": "generating_points"
  }
}
```
