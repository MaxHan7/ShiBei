# V2 Prompt 质量差距审查：_WY2GXs-iynGePgdsYLi0A

审查对象：

- 当前 V2 DeepSeek 质量跑：`quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/runs/20260619-181727-v2-golden-deepseek-type-enum.json`
- 当前报告页：`quality-runs/v2-single-article/_WY2GXs-iynGePgdsYLi0A/reports/20260619-181727-v2-golden-deepseek-type-enum.html`
- V2 新标准与黄金样稿记录：
  - `golden-samples/README.md`
  - `golden-samples/*.json`
  - `v2-prompt-field-rules-zh.md`
  - `prompt-example-candidates-zh.md`
  - `v2-backend-field-contract-zh.md`
  - `v2-chapter-review-flow-prd-zh.md`

## 口径修正

本审查只对照 V2 重新制定的标准，不把旧版题目系统里的字段、蓝图或 prompt 细节当作质量依据。

旧版实现最多只能作为工程结构参考，例如“分阶段生成、结构化输出、质量门禁、失败重试”这些大方向。题干、选项、解释、连线题、字段语义和前端展示规则，都必须以 V2 文档和 V2 golden samples 为准。

## 结论

当前 V2 跑通的是“字段契约与结构合法性”，不是“V2 golden sample 级别的出题质量”。

V2 新标准没有丢，主要记录在 `golden-samples/README.md` 和 `v2-prompt-field-rules-zh.md`。这次质量差距的根因是：当前后端 prompt 实现和质量门禁只覆盖了很薄的一层结构要求，没有把 V2 文档里已经确定的题目质量规则落到生成链路和自动审查里。

因此现在不适合继续横向跑更多文章。下一步应先修 V2 prompt，并用 deterministic diagnostics 和 `qualityJudge` 报告辅助人工审查；当前阶段不做质量阻断，先完整查看模型生成的全部题目。

## 当前输出的主要问题

### 1. 题干仍然像阅读理解题

当前输出出现了“根据本文”“根据文章”等写法，例如：

- “根据本文，游戏化的核心定义是什么？”
- “根据文章，情境设计如何帮助用户建立身份认同？”

这直接违反 `v2-prompt-field-rules-zh.md`：

- 题干要自足，用户单独看到题目也应知道它在问什么。
- 题干应直接围绕知识点本身发问，而不是考用户是否记得原文表述。
- 避免“根据原文 / 根据文章 / 文中提到 / 这篇文章里 / 这里的 / 上述”等依赖原文回忆或前文指代的写法。

### 2. 选择题偏定义背诵，缺少 V2 要求的认知坡度

当前多道选择题停留在概念定义、名词识别或文章事实复述：

- 游戏化核心定义
- 挤出效应名词识别
- Bogost 批评指向哪一问题

这些题不是完全不能用，但没有明显体现 V2 规则要求的“从开场解释、轻量理解到场景应用”的递进。V2 不要求每道题暴露某个内部分类字段，但要求每个 unit 的题目组合能形成认知坡度，而不是一组平铺定义题。

### 3. 干扰项仍然有凑数和气质暴露问题

当前选项经常呈现“正确答案更完整、更像标准答案；错误项明显偏离”的形态。例如定义题里正确项是标准定义，错误项是明显过度或局部化表达。

这不符合 `v2-prompt-field-rules-zh.md` 对选择题的要求：

- 默认 4 个选项，只有一个正确答案。
- 干扰项必须整体同语境。
- 至少一个干扰项承载真实误区或混淆点。
- 干扰项应该帮助用户理解边界，而不是被一眼排除。
- 正确选项不能明显比其它选项更长、更专业、更像标准答案。

### 4. 连线题多为机械配对

当前连线题大量是“人物/概念 -> 贡献/定义”“案例 -> 特征”“概念 -> 描述”的机械配对。它们结构合法，但学习价值偏低。

V2 文档要求连线题用于训练关系理解，例如：

- 概念职责
- 边界关系
- 使用时机
- 场景作用
- 验证维度

`prompt-example-candidates-zh.md` 中的正例强调“信号 -> 对应作用/处理方式”，而不是只把名词和解释相连。当前输出没有充分达到这个标准。

### 5. 答后解释太长，且出现考试批改话术

当前解释出现：

- “正确选项B。”
- “文章指出……”
- 把其它选项逐项展开成较长解析。

V2 UI 的答后浮窗只承载一段轻反馈，不应写成长解析，也不应带“正确选项 B”这种考试批改话术。文档要求前端只展示一句整合后的解释，用来帮助用户确认或修正理解。

### 6. 质量报告的 `issueCount: 0` 具有误导性

当前 metrics 为：

- 6 units
- 14 questions
- 7 multiple choice
- 7 matching
- 39 source blocks
- `issueCount: 0`

这些指标只说明结构和数量达标。它没有检测：

- forbidden stem phrases
- 是否形成 unit 内的认知坡度
- 干扰项是否有真实误区
- 连线题是否有关系理解价值
- 解释是否适配答后浮窗
- source anchor 是否和题目考点精准对应

## 根因定位

### 1. 旧的 V2 prompt 实现薄于 V2 文档

第一次黄金文章复测时，`buildV2PromptMessages.js` 的旧 `unitCards` 大阶段只写入了一些基础要求，例如选择题 4 个选项、连线题左右各 4 项、题干不要写“根据原文/这篇文章/这里的”。

但 V2 文档里的关键质量规则当时没有充分进入实现：

- Summary 要先点核心命题，再轻量带出展开方向。
- 背景段不强行出题。
- unit 要形成开场、轻量理解、场景应用的认知坡度。
- 有干扰项的题目要先在生成侧明确正确理解和常见误区，再输出用户可见解释。
- 连线题要服务边界辨析或具体化理解，不能机械对齐名词和解释。
- 题干考理解，不考原文背诵。

### 2. V2 qualityJudge 曾经太弱，且 `revise` 没有阻断

第一次复测时，V2 `qualityJudge` schema 只有：

- `verdict`
- `issues[]`

实际编排中，只有 `discard` 会中止生成；`revise` 会继续放行到前端。这意味着即使模型判定需要修改，也不会触发修复或失败。

这不是产品规则问题，而是工程实现还没有把 V2 质量门禁做成真正可阻断、可修复的环节。

本轮曾短暂改为：

- deterministic guardrails 先于模型 judge 执行。
- `qualityJudge.verdict === "revise"` 或 `discard` 都阻断生成，映射为 `failed_quality`。
- 自动 repair loop 暂不实现，避免坏题静默进入前端。

随后根据产品验证需要，质量 gate 已改为 diagnostic-only：

- deterministic guardrails 只写入 `generationMeta.qualityDiagnostics`。
- `qualityJudge.verdict` 只写入 `generationMeta.qualityJudge`。
- 即使命中 error 级质量问题，只要结构合同有效，也继续生成完整 review path。
- 当前优化重点改为把质量标准前移到 `unitPracticePlan`、`multipleChoiceDraft`、`matchingDraft` 等出题 prompt。

### 3. 当前质量 run 的下一步不能是继续换文章

当前这篇文章已经暴露了结构通过但质量不达标的问题。继续跑更多文章只会批量证明同一个门禁漏洞。应该先修正质量规则，再复测同一篇。

## 当前已落实的修复方向

### 第一优先级：把质量门禁改成“可观察诊断”

已新增 `src/v2/generation/qualityGuardrails.js`，至少包括：

- 题干 forbidden phrase：`根据本文`、`根据文章`、`根据原文`、`文章指出`、`文中提到`、`这篇文章里`、`这里的`、`上述`
- explanation forbidden pattern：`正确选项[A-D]`、长篇逐项解析、再次写“文章指出”
- matching weak pattern：题干只写“概念与描述/贡献匹配”且右侧多为定义、贡献、年份
- answer feedback length：超出答后浮窗合理长度时标记 revise

`qualityJudge.verdict === "revise"` 当前不阻断，只作为报告信号。现阶段先看完整输出，再把规则写回出题 prompt；等 prompt 稳定后，再决定是否恢复阻断或自动修复。

### 第二优先级：把 V2 题目生成过程显式分步

不恢复旧字段，也不引用旧版题目细节。V2 生成阶段应按 V2 文档显式分步：

1. 确认本 unit 的学习对象、边界和适用场景。
2. 为每道选择题先生成内部用的正确理解和常见误区。
3. 再生成用户可见题干、选项和一段整合解释。
4. 为连线题先明确要匹配的关系类型，例如职责、边界、时机、作用或验证维度。
5. 再生成左右各 4 个短项。

这些中间内容可以只进入 `generationMeta` 或 quality report，不一定成为前端展示字段。

### 第三优先级：拆分旧 `unitCards` prompt

旧 `unitCards` 同时生成 overview、选择题、连线题、总结，任务太大。本轮已经拆成：

1. `unitPracticePlan`：生成 unit 的学习目标、误区和适合题型。
2. `multipleChoiceDraft`：按 V2 规则生成选择题。
3. `matchingDraft`：按 V2 规则生成连线题。
4. `unitSummaryDraft`：生成单元概要和单元总结。
5. `qualityJudge`：按 V2 rubric 做最终审查。

旧 `unitCards` 文件可暂留作历史参考，但不再作为 V2 当前生成链路的标准阶段。

### 第四优先级：质量报告要暴露人工审查列

当前 HTML 报告已增加：

- forbidden phrase 命中
- 题型目的和质量诊断
- matching relation value
- distractor value
- explanation UI fit
- source anchor precision
- issues 明细

这样后续测试出题质量时，能看清问题来自 prompt、schema、source anchor 还是质量门禁。

## 是否需要用户补信息

暂时不需要用户补新的产品规则。现有 V2 文档已经足够说明当前输出为什么不合格。

需要工程侧继续补的是：

1. 用同一篇黄金文章复测新的拆分 prompt。
2. 人工阅读完整题目，判断问题是否来自 `unitPracticePlan`、`multipleChoiceDraft`、`matchingDraft` 或 source anchor。
3. 优先把标准补进出题 prompt；diagnostics 只用于定位，不用于拦题。
4. 后续再考虑自动 repair loop 或恢复 blocking gate。

修完后再用同一篇文章 `_WY2GXs-iynGePgdsYLi0A` 复测，不能直接换文章。

## 后续可选实验：轻量质量修复角色

可以保留一个后续 A/B 实验假设：在出题阶段稳定后，新增一个可开关的“轻量质量修复角色”，比较有无该角色时的题目质量变化。

当前不把它接入正式生成结构，也不让它承担质量拦截。主线仍然是先把 V2 标准前移到 `unitPracticePlan`、`multipleChoiceDraft` 和 `matchingDraft`，让题目第一次生成时就尽量符合标准。

如果后续实验该角色，应遵守：

- 只做轻量改写：压缩题干、去掉“根据文章”口吻、增强干扰项同语境性、缩短解释、统一 UI 可承载长度。
- 不改知识点含义，不改正确答案，不凭空补原文没有的信息。
- 保留改写前、改写后和改写理由，便于人工判断是否真的提升质量。
- 和无修复角色的同文同模型输出做对比，再决定是否进入正式链路。
