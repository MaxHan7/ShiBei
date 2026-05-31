# 单篇基准诊断：Hook 与 AI Coding 文章

本文档固定记录 `https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw` 这篇文章在当前出题系统下的生成表现。后续几轮知识点、补题、质量过滤和题型覆盖调整，都优先用这篇文章做横向对比。

这篇文章适合作为单篇基准，是因为它同时包含概念解释、方法判断、场景信号、工具边界和产品经理工程直觉，能暴露三个核心问题：

- 知识点是否覆盖完整主线。
- 每个知识点是否能稳定生成 1-3 道不同角度题。
- 质量过滤是否把可复习题误杀。

## 基准信息

| 字段 | 内容 |
| --- | --- |
| 运行日期 | 2026-05-29 |
| 文章链接 | `https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw` |
| 提取标题 | 和AI产品经理聊天，她说"我用Vibe coding做Demo"，我问她：怎么用hook？她说我一般用claude code |
| 生成章节标题 | AI Coding 与 Hook 的工程边界 |
| 清洗后正文长度 | 3884 字 |
| 章节状态 | completed |
| 临时报告 | `/tmp/shibei-quality-runs/UMr6ia1QubqOMw3aBUGbOw.json` |

临时 JSON 只用于本次诊断，不进入正式测试集。后续若要复跑，应重新生成新的临时报告，并把关键指标追加到本文档。

## 基准指标

| 指标 | 当前值 |
| --- | ---: |
| 模型候选知识点 | 8 |
| 保留知识点 | 7 |
| 被过滤知识点 | 1 |
| 候选题总数 | 27 |
| 入池题总数 | 13 |
| 平均每知识点入池题数 | 1.9 |
| 达到 3 题的知识点 | 3 / 7 |
| 低置信入池题 | 4 |
| 未覆盖知识点 | 2 |

### 每知识点入池题数分布

| 入池题数 | 知识点数量 |
| ---: | ---: |
| 0 | 2 |
| 1 | 0 |
| 2 | 2 |
| 3 | 3 |

### 题型分布

| 题型 | 候选题 | 入池题 |
| --- | ---: | ---: |
| multiple_choice | 8 | 6 |
| scenario_judgment | 17 | 7 |
| true_false | 2 | 0 |

当前最大问题不是总题量绝对不足，而是题型覆盖和知识点覆盖不均衡：系统能为一部分知识点产出 3 道题，但另一些知识点被过滤到 0 道。

## 知识点诊断

| 知识点 | 结构角色 | 重要度 | 可考性 | 后端目标题数 | 候选题 | 入池题 | 主要问题 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Hook 的本质：控制器而非提示词 | main_claim | 5 | 5 | 3 | 3 | 3 | 达到题量，但全部是选择题，角度多样性一般 |
| Hook 与 Prompt 的分工对比 | supporting_reason | 4 | 5 | 3 | 3 | 3 | 达到题量，但全部是选择题 |
| 判断 Hook 使用的黄金法则 | method_step | 5 | 5 | 3 | 3 | 3 | 达到题量，全部是场景判断，其中 1 道低置信 |
| 引入 Hook 的四个信号 | method_step | 4 | 5 | 3 | 6 | 0 | 有多道可用候选被 trust blocking 误杀；另有模型混淆 React Hook |
| 四类实用 Hook 场景 | method_step | 4 | 4 | 2 | 5 | 0 | 后端目标本来只有 2；答案唯一性和来源支撑判断过严 |
| AI 产品经理应具备的工程直觉 | boundary | 4 | 4 | 2 | 3 | 2 | 后端目标本来只有 2；未向 3 题补齐 |
| Vibe Coding 与 Hook 的分工 | main_claim | 4 | 5 | 3 | 4 | 2 | 质量过滤/阻断导致少 1 道，入池题均为低置信 |

## 被过滤知识点

| 知识点 | 重要度 | 可考性 | 过滤原因 | 判断 |
| --- | ---: | ---: | --- | --- |
| Hook、CI、Prompt 的分工边界 | 5 | 5 | source_not_supported | 应保留。原文确实有这一节，但模型给出的 `sourceQuote` 拼接了不连续句子，导致后处理认为来源不支撑。 |

这是本篇最关键的知识点遗漏。它不是因为动态上限裁剪，也不是因为低可考，而是因为知识点提取阶段没有保证 `sourceQuote` 是原文连续子串。

## 第一性原理分析

### 1. 为什么知识点不全

这篇文章的主线至少应覆盖：

- AI coding 让 demo 变快，但可控性不足。
- Hook 是控制器，不是提示词。
- Hook 与 prompt 的本质区别。
- 什么时候该上 hook：从可运行到可复用。
- 四个引入 hook 的信号。
- 高频 hook 场景。
- prompt / CLAUDE.md / hook / CI 的分工边界。
- 产品经理需要补上的工程直觉。
- vibe coding 负责起飞，hook 负责别偏航。

当前系统基本覆盖了大多数主线，但漏掉了 `prompt / CLAUDE.md / hook / CI 的分工边界`。根因是：

1. 模型提取到了这个知识点，说明候选生成不是主要问题。
2. 后处理过滤掉了它，原因是 `source_not_supported`。
3. 实际原文中有完整章节讲这件事，但模型给的引用不是稳定连续原文片段。

所以这一类问题的修复方向不是放宽所有过滤，而是要求知识点提取阶段输出可定位的连续来源，或者在后处理阶段用标题/关键词重新定位原文段落。

### 2. 为什么没有每个知识点 3 道题

本轮数据证明，当前实现和 PRD 的理想目标还有偏差：

#### 目标策略本身不是每点 3 题

当前 `targetQuestionCountForPoint` 是动态策略：

- 高可考、高价值、题角足够：3 题。
- 普通高可考或高价值：2 题。
- 其它：1 题。

因此 `四类实用 Hook 场景` 和 `AI 产品经理应具备的工程直觉` 在后端目标层就只给了 2 题。它们不可能自然达到“每点 3 题”。

#### 质量阻断把部分可复习题挡掉

`引入 Hook 的四个信号` 生成了 6 道候选，其中前 3 道规则和 judge 都是 pass，但因为 trust 层写入了 `weak_source_support` / `weak_explanation_faithfulness` 到 `blockingReasons`，最终 0 题入池。

这说明当前低置信和不可入池的边界过硬。只要题目结构合法、答案唯一、来源基本支撑，就应该优先低置信入池，而不是被 blocking 直接杀掉。

#### 模型存在概念歧义

`引入 Hook 的四个信号` 里有 3 道题被 judge 判为 React Hook 方向，和原文 AI agent Hook 无关。这说明 question prompt 还没有强约束：

- 本文的 hook 指 Claude Code / AI agent lifecycle hook。
- 禁止把 hook 理解为 React Hook、前端状态 Hook 或通用组件 Hook。

#### 补题路径语义不清

系统确实触发了 4 次 supplement，且没有 generation error。但 supplement 复用了 `rewrite: true` 路径，prompt 开头仍是“上一题没有通过质量检查，请重写”。这会让模型更像在修旧题，而不是按缺失类型补齐不同题型/不同角度。

## 当前根因排序

| 优先级 | 根因 | 影响 |
| --- | --- | --- |
| P0 | trust blocking 把弱支撑/弱解释直接当阻断 | 可用题被误杀，知识点变成 0 题 |
| P0 | 知识点 `sourceQuote` 不保证连续可定位 | 关键知识点被 `source_not_supported` 过滤 |
| P1 | 目标题数策略与 PRD 不一致 | 普通知识点天然只有 1-2 题 |
| P1 | supplement 复用 rewrite prompt | 补题不能稳定补齐题型和角度 |
| P1 | hook 概念未消歧 | 模型误出 React Hook 题 |
| P2 | 题型多样性不足 | 达到 3 题的点也常集中在同一题型 |

## 实验记录：代码与 Prompt 改动

本节只记录这几轮围绕本单篇基准做过的出题系统改动。记录方式按实验报告组织，避免只留下“结果变好了”的结论，而看不到为什么改、改了哪里、验证了什么。

### 实验 0：基准问题复现

| 项目 | 内容 |
| --- | --- |
| 实验目的 | 复现“有知识点但题目覆盖不足”的问题，拆清楚到底是知识点漏了、候选题没生成，还是质量过滤误杀。 |
| 样本 | `https://mp.weixin.qq.com/s/UMr6ia1QubqOMw3aBUGbOw` |
| 关键观察 | 保留 7 个知识点、入池 13 题、3 题知识点 3 个、0 题知识点 2 个。 |
| 第一性原理判断 | 用户复习价值来自“知识点完整 + 每点足够题型强化 + 解释页来源可信”。任一环节断掉，都会让用户觉得生成内容不完整或不可信。 |

本轮没有改代码，只建立诊断口径：

- 知识点层：看候选是否覆盖文章主线、是否被过滤、过滤原因是什么。
- 出题层：看每个知识点的候选题、入池题、题型、低置信、阻断原因。
- 质量层：看 blocked 是不是只发生在真正不可复习的问题上。

### 实验 1：恢复“每个知识点尽量 3 题”

| 项目 | 内容 |
| --- | --- |
| 假设 | 当前系统少题，不只是模型没生成，而是后端目标策略和补题语义没有真正按 PRD 的“每点 1-3 题”执行。 |
| 改动类型 | Prompt + 入池选择器 + 补题策略 + 阻断边界。 |
| 主要文件 | `backend/src/generation/generateQuestions.js`、`backend/src/generation/index.js`、`backend/src/generation/evaluateQuestions.js`、`backend/src/generation/prompts/questions.js` |
| 验证指标 | 每知识点入池题数、3 题知识点数量、0 题知识点数量、题型覆盖、低置信比例。 |

#### 1.1 目标题数策略改动

原策略是动态目标：只有高价值、高可考、题角足够的知识点才给 3 题；普通点给 1-2 题。这样和 PRD 的“理想 3 题”存在天然偏差。

改后策略：

```js
if (testabilityScore <= 2) return { count: 1, reason: "low_testability" };
if (testabilityScore === 3 && importanceScore <= 2) return { count: 1, reason: "low_importance" };
if (testabilityScore === 3 && angleCount === 0 && !["main_claim", "method_step", "supporting_reason"].includes(role)) {
  return { count: 2, reason: "limited_angles" };
}
return { count: 3, reason: "default_three_question_target" };
```

设计意图：

- 默认把可复习知识点推向 3 题。
- 只有低可考、低重要度、角度明显不足的点才降级。
- 降级必须记录原因，避免以后不知道少题是系统判断还是生成失败。

#### 1.2 出题通用 Prompt 改动

出题用户 prompt 增加了多题强化要求：

```text
请为每个知识点生成 targetQuestionCount 道候选题。
targetQuestionCount 是根据该知识点价值动态给出的候选数量，不代表最终入池数量。
每个知识点至少返回 1 道结构完整题，不要跳过任何知识点。
当 targetQuestionCount 为 2 或 3 时，不要生成同质题：
优先覆盖“理解核心判断”“辨析误区/边界”“迁移到具体场景”三个不同记忆角度，并尽量使用不同题型。
preferredQuestionType 是推荐题型：优先使用它；如果另一种题型更自然、更能考理解，也可以改用其它允许题型。
```

这几个变化解决两个问题：

- 不再把 `preferredQuestionType` 当硬约束，避免因为题型不匹配把可用题打掉。
- 明确 2-3 题不是重复问法，而是不同记忆角度的强化。

#### 1.3 题型和术语消歧 Prompt

系统 prompt 和用户 prompt 增加了两类约束：

```text
同一知识点多道题必须考不同角度，不要重复问法。
遇到多义术语时，必须按文章语境理解，不要套用其它领域含义。
```

补题 prompt 中进一步加入本文样本暴露出的 `hook` 消歧：

```text
本文中的术语必须按文章语境理解；
例如 hook 指 AI agent / Claude Code lifecycle hook，不是 React Hook。
```

设计意图：

- 本文的 `hook` 是 AI agent / Claude Code 生命周期 hook，不是 React Hook。
- 这个问题如果只靠 judge 事后发现，会浪费候选题；应该在生成前就消歧。

#### 1.4 补题 Prompt 从 rewrite 拆出

原逻辑虽然有 supplement，但语义仍像“上一题没过审后的重写”，会让模型围绕旧题修补，而不是补缺失题型/角度。

新增 supplement prompt：

```text
这是补题任务，不是重写失败题。请只为给定知识点补充 N 道新题，用来补齐缺失的题型和记忆角度。
已有题目和缺口：...
要求：
- 不要复用已有题干、选项结构或相同场景。
- 优先补齐缺失题型：multiple_choice、true_false、scenario_judgment。
- 优先补齐缺失角度：理解核心判断、辨析误区/边界、迁移到具体场景。
- 如果某个题型不自然，可以换成更自然的题型，但必须明确覆盖新的考察角度。
```

同时补题上下文从后端生成：

```text
target_question_count:3;
current_reviewable_count:1;
missing_question_types:true_false|scenario_judgment;
question_angles:...;
existing_reviewable_questions:multiple_choice:已有题干
```

设计意图：

- 模型知道“当前已经有什么题”。
- 模型知道“还缺什么题型/角度”。
- 防止补题变成同一问题的改写。

#### 1.5 阻断边界改动

原 trust 层会把 `weak_source_support`、`weak_explanation_faithfulness` 等弱信号直接写进 `blockingReasons`，导致结构合法、可复习的题被误杀。

改后原则：

| 类型 | 处理 |
| --- | --- |
| 结构错误、正确答案缺失、答案不唯一 | blocked |
| 来源完全找不到、完全不支撑 | blocked |
| 来源偏弱、解释偏弱、上下文偏弱 | low confidence |
| 题型不完全匹配 | low confidence |
| judge 建议 rewrite 但结构合法 | low confidence |

设计意图：

- blocked 只表示“用户不应该复习这道题”。
- low confidence 表示“可以复习，但需要质量工作台和人工抽查关注”。

#### 1.6 实验 1 结果

| 指标 | 基准 | 实验 1 |
| --- | ---: | ---: |
| 保留知识点 | 7 | 6 |
| 入池题 | 13 | 13 |
| 平均每点题数 | 1.9 | 2.2 |
| 3 题知识点 | 3 | 4 |
| 0 题知识点 | 2 | 1 |
| 低置信题 | 4 | 10 |

结论：

- 目标策略和补题 prompt 方向正确，3 题覆盖有提升。
- 但 `Hook 与 CI、Prompt、项目规则的分工` 仍然 0 题，说明根因不只在出题 prompt，而在来源上下文定位和知识点 sourceQuote 可追溯性。

### 实验 2：来源上下文定位与 sourceQuote 修复

| 项目 | 内容 |
| --- | --- |
| 假设 | 候选题已经生成，但进不了复习池，根因是来源链路不稳定：知识点 `sourceQuote` 不是连续原文，题目来源上下文也不一定能支撑答案。 |
| 改动类型 | 确定性规则为主，Prompt 不继续扩写。 |
| 主要文件 | `backend/src/generation/filterKnowledgePoints.js`、`backend/src/generation/evaluateQuestions.js`、`backend/src/generation/index.js`、`backend/src/generation/tests/qualityReport.js` |
| 验证指标 | 被过滤知识点、blocked 题、每点 3 题覆盖、sourceContextSelection 方法分布、低置信原因。 |

#### 2.1 为什么这一轮不继续堆 Prompt

第一性原理判断：

> 解释页的来源片段必须来自原文，并且能支撑用户判断正确答案。这个事实不能交给模型“说它支撑”，而应该由后端根据原文确定性选择。

所以本轮没有继续让模型“更认真地选来源”，而是让后端自己做：

- 原文段落定位。
- 同小节相关段落回退。
- 关键词相关段落回退。
- 选择方法、分数、回退原因的结构化日志。

#### 2.2 知识点 sourceQuote 修复

问题：

- 模型提取到了 `Hook、Prompt、CLAUDE.md、CI 的分工边界`。
- 但给出的 `sourceQuote` 是不连续拼接句。
- 旧过滤器找不到连续来源，于是 `source_not_supported`，知识点被删。

改动：

```js
const repairedPoint = repairPointSourceQuote(normalizePoint(candidate), cleanedText);
```

修复策略：

1. 如果 `sourceQuote` 已经能在原文中定位，保持不动。
2. 如果不能定位，用 `title + keyClaim + summary + coverageReason` 抽关键词。
3. 在原文句子窗口中找最相关、长度合适、能支撑该知识点的连续片段。
4. 找到后回填 `sourceQuote`，并记录：
   - `originalSourceQuote`
   - `sourceQuoteWasRepaired`
5. 找不到才过滤。

设计意图：

- 保留模型已经识别出的关键知识点。
- 把“来源是否连续可追溯”从模型输出质量问题，转成后端可修复问题。

#### 2.3 题目来源上下文选择 v2

旧逻辑：

- 优先找包含知识点 `sourceQuote` 的段落。
- 如果 `sourceQuote` 很短或段落不够支撑，题目会因为来源弱被低分甚至阻断。

新逻辑：

```js
const fallback = selectFallbackSourceContext({ paragraphs, anchorIndexes, question, point });
if (bestAnchor && shouldPreferAnchorContext(bestAnchor, fallback)) return bestAnchor;
return best scored candidate;
```

候选上下文来源：

| 方法 | 含义 |
| --- | --- |
| `source_quote_anchor` | 直接命中 sourceQuote 的完整段落 |
| `source_quote_anchor_expanded` | sourceQuote 段落过短，向前后段扩展 |
| `source_quote_anchor_sentence_window` | 长段落内按句子窗口裁剪 |
| `same_section_relevance` | sourceQuote 命中了，但该段不够支撑题目；在同小节内找更相关段落 |
| `keyword_relevance_fallback` | sourceQuote 找不到，用题干、答案、keyClaim、标题关键词定位原文 |

每道题新增诊断：

```json
{
  "method": "same_section_relevance",
  "paragraphIndex": 12,
  "score": 123,
  "relevanceScore": 5,
  "anchorMatched": false,
  "fallback": true,
  "fallbackReason": "anchor_context_weak"
}
```

设计意图：

- 不再把短引用当成用户可见来源。
- 解释页展示的是能帮助理解题目的上下文段落。
- 每次回退都有日志，方便质量工作台审查。

#### 2.4 解释一致性和阻断日志

新增字段：

```js
primaryBlockingReason
repairHint
```

示例修复建议：

| primaryBlockingReason / confidenceReason | repairHint |
| --- | --- |
| `structure_invalid` | 修复题目结构、选项数量或正确答案字段 |
| `answer_not_unique` | 重写选项，确保只有一个答案能被来源和正确理解同时支撑 |
| `weak_source_support` blocked | 重新选择能直接支撑正确答案的原文上下文 |
| `weak_explanation_faithfulness` | 收窄解释，只解释来源中能支撑的判断 |
| `weak_context_relevance` | 换用更贴近题干和正确答案的原文段落 |

设计意图：

- 后续人工审查时，不只看到“低置信”，还能知道应该修 prompt、修选项、修解释，还是修来源定位。

#### 2.5 实验 2 结果

| 指标 | 实验 1 | 实验 2 |
| --- | ---: | ---: |
| 保留知识点 | 6 | 7 |
| 被过滤知识点 | 0 | 0 |
| 入池题 | 13 | 21 |
| 平均每点题数 | 2.2 | 3.0 |
| 3 题知识点 | 4 | 7 |
| 0 题知识点 | 1 | 0 |
| blocked 题 | 多个 | 0 |
| 低置信题 | 10 | 18 |

结论：

- 来源链路修复有效，关键知识点重新进入复习池。
- “每个知识点 3 题”的数量目标达成。
- 但低置信显著升高，说明下一步不能再追求题量，而要评估低置信题的真实可复习价值。

### 当前实验结论

这几轮实验把问题从“系统出不够题”推进到了更准确的阶段：

1. **题量问题基本不是模型能力问题。**
   在目标策略、补题语义和来源定位修复后，同一篇文章可以做到 7 个知识点、每点 3 题。

2. **真正的质量瓶颈转移到了可信度。**
   21 道入池题中 18 道低置信，说明接下来要验证的是：这些题是否真的能从来源上下文判断答案，而不是形式上可入池。

3. **Prompt 只解决生成意图，不能替代事实校验。**
   多题型、语境消歧、补题角度适合写进 prompt；但来源片段是否来自原文、是否支撑答案，必须由后端规则和质量工作台复盘。

4. **下一轮实验应从“更多题”转向“更可信的题”。**
   重点不再是继续放宽阻断，而是人工审查低置信题、减少不必要的 source backfill、提高单知识点内题型多样性。

## 下一轮修复建议

### A. 修正低置信与阻断边界

只把这些问题作为 blocked：

- 结构错误。
- 正确答案不存在或不在选项中。
- 答案不唯一。
- 来源完全找不到或完全不支撑。
- 题目明显偏离知识点。

这些问题应进入 low confidence，而不是 blocked：

- 来源支撑偏弱但存在。
- 解释忠实度偏弱。
- 上下文相关性偏弱。
- 题型不完全匹配。
- judge 建议 rewrite 但结构合法。

### B. 知识点来源定位改为连续片段优先

知识点提取 prompt 需要明确：

- `sourceQuote` 必须是原文连续子串。
- 不允许拼接多个段落。
- 如果一个知识点来自一整节，应选该节中最能代表主张的一段连续句子。

后处理可以增加二次定位：

- 如果 `sourceQuote` 不命中原文，尝试用 `title + keyClaim` 找到最相关段落。
- 找到后回填 `sourceQuote`，而不是直接过滤。
- 回填失败才过滤。

### C. 把补题 prompt 从 rewrite 中拆出来

新增独立 supplement prompt，语义改为：

- 当前知识点已有哪些题。
- 还缺哪些题型。
- 还缺哪些记忆角度。
- 请补齐缺失题，而不是重写旧题。

补题输入应包含已入池题 stem，避免重复。

### D. 目标题数向 PRD 靠齐

如果产品目标是“每个知识点理想 3 题”，建议改成：

- 默认目标：3 题。
- 明确低可考点：降为 1-2 题，并记录 `targetQuestionCountReason`。
- 质量报告必须统计“降级原因”，否则后续无法知道少题是系统判断还是生成失败。

### E. 加入文章级术语消歧

本文暴露了 `hook` 的歧义。可以在知识点或出题 prompt 里加入：

- 本文 hook 指 AI agent / Claude Code lifecycle hook。
- 不得解释为 React Hook。
- 如果术语有多个行业含义，以文章语境为准。

## 后续迭代对比模板

每轮改动后，在这里追加一行：

| 日期 | 改动方向 | 保留知识点 | 入池题 | 平均每点题数 | 3题知识点 | 0题知识点 | 低置信题 | 主要改善 | 新问题 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-05-29 | 当前基准 | 7 | 13 | 1.9 | 3 | 2 | 4 | 已能部分多题入池 | 关键知识点被过滤；trust 阻断过硬；补题语义不清 |
| 2026-05-29 | 默认 3 题目标 + 低置信入池 + 独立补题 prompt | 6 | 13 | 2.2 | 4 | 1 | 10 | 0 题知识点减少；true_false 入池从 0 增至 4；补题进入独立 supplement 阶段 | 知识点数少 1 个；低置信题显著增加；`Hook 与 CI、Prompt、项目规则的分工` 仍 0 题 |
| 2026-05-29 | 来源上下文定位 v2 + 知识点 sourceQuote 修复 | 7 | 21 | 3.0 | 7 | 0 | 18 | 关键知识点全部保留；每个知识点均达到 3 题；blocked 降为 0 | 低置信比例过高；题型在单个知识点内仍偏集中；大量题依赖上下文回填 |

## 2026-05-29 第一轮覆盖率修复复测

本轮按三个方向修改后复测：

- 可复习知识点默认目标改为 3 题，只有低可考或低重要度才降级，并记录降级原因。
- 弱来源、弱解释、弱上下文和题型不匹配不再默认作为强阻断，而是进入低置信原因。
- 补题从 `rewrite` 语义拆成独立 `supplement` 语义，明确要求补齐缺失题型和记忆角度。

临时报告：

- JSON：`/tmp/shibei-quality-runs/UMr6ia1QubqOMw3aBUGbOw-after-20260529T141745Z.json`
- Markdown：`/tmp/shibei-quality-runs/UMr6ia1QubqOMw3aBUGbOw-after-20260529T141745Z.md`

### 复测指标

| 指标 | 基准 | 修复后 | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 6 | -1 |
| 被过滤知识点 | 1 | 0 | 改善 |
| 候选/评估题总数 | 27 | 29 | +2 |
| 入池题总数 | 13 | 13 | 持平 |
| 平均每知识点入池题数 | 1.9 | 2.2 | 改善 |
| 达到 3 题的知识点 | 3 | 4 | 改善 |
| 0 题知识点 | 2 | 1 | 改善 |
| 低置信入池题 | 4 | 10 | 增加 |
| true_false 入池题 | 0 | 4 | 改善 |

### 本轮有效的地方

1. **目标题数策略真正向 PRD 靠近了。**
   复测中 6 个保留知识点全部目标为 3 题，`pointDiagnostics.targetQuestionCountReason` 均为 `default_three_question_target`。这说明少题不再被“后端目标本来只有 1-2”掩盖。

2. **题型覆盖恢复了一部分。**
   入池题从只有 `multiple_choice` / `scenario_judgment`，变成 `multiple_choice: 6`、`true_false: 4`、`scenario_judgment: 3`。其中关键修复是判断题的答案唯一性：原来 `成立` 与 `不成立` 被近似文本规则误判为重复，导致 true/false 题大量被 `answer_not_unique` 误杀。

3. **补题路径已经从重写变成补齐。**
   生成记录中出现独立 `question_supplement` / `judge_supplement` 阶段，说明补题不再复用“失败题重写”的入口。补题虽然还没把所有点补满，但链路语义已经正确。

4. **0 题知识点减少。**
   基准有 2 个知识点 0 题，修复后降到 1 个。`引入 Hook 的四个信号` 已从 0 题恢复到 3 题，并覆盖选择、判断和场景判断三种题型。

### 仍然暴露的问题

1. **总入池题数没有增加。**
   虽然平均每点题数从 1.9 到 2.2，但总入池仍是 13。原因是本轮保留知识点从 7 变成 6，说明知识点提取仍存在模型波动；后续不能只看总题数，要同时看“每点题数”和“知识点覆盖完整性”。

2. **低置信比例明显升高。**
   低置信题从 4 增到 10。这符合“弱来源/弱解释先进池”的方向，但也意味着下一轮必须用人工审查判断这些低置信题到底是可接受补强，还是把质量风险转嫁给用户。

3. **`Hook 与 CI、Prompt、项目规则的分工` 仍然 0 题。**
   这个点本轮有 6 道候选、3 道 pass，但最终 6 道都被阻断，主要集中在 `weak_source_support`、`weak_explanation_faithfulness` 和 `question_type_mismatch`。这说明问题已经从“没有生成题”收敛为“来源定位/解释一致性诊断过硬或上下文不准”。

4. **`Vibe Coding 与 Hook 的关系` 仍只入池 1 题。**
   它生成了 7 道候选，但 blocked 6 道，问题同样集中在弱来源、弱解释、题型不匹配和少量答案唯一性。这个点适合作为下一轮“来源上下文选择 + 解释一致性”的重点样例。

### 下一轮判断

这轮改动方向是对的，但还没有达到“5 个以上知识点达到 3 题”的目标。下一轮不应再继续扩大低置信放行，而应集中修：

- 来源上下文是否选到了真正支撑题目的段落。
- judge / 规则对 `weak_source_support` 和 `weak_explanation_faithfulness` 的判定是否过硬。
- 同一知识点多个候选题是否因为相似度或解释措辞被一起打掉。

下一轮成功标准建议：

- `Hook 与 CI、Prompt、项目规则的分工` 至少 2 题入池。
- `Vibe Coding 与 Hook 的关系` 至少 2 题入池。
- 3 题知识点保持 4 个以上，并争取到 5 个。
- 低置信题数量不再继续明显上升，人工抽查可接受率不下降。

## 2026-05-29 第二轮可信度修复复测

本轮没有继续简单放宽质量门槛，而是回到题目能否被用户理解的第一性原理：解释页展示的来源上下文必须能支撑唯一答案和解释。修复重点是两层：

- 题目来源上下文不再只依赖知识点 `sourceQuote`，而是结合题干、正确答案、正确理解、知识点标题和 `keyClaim` 重新选择更相关的原文段落。
- 知识点过滤前，如果 `sourceQuote` 不是原文连续子串，先用知识点标题、关键主张和关键词回到原文中修复连续来源片段，修复失败才过滤。

临时报告：

- JSON：`/tmp/shibei-quality-runs/UMr6ia1QubqOMw3aBUGbOw-after-20260529T151851Z.json`
- Markdown：`/tmp/shibei-quality-runs/UMr6ia1QubqOMw3aBUGbOw-after-20260529T151851Z.md`

### 复测指标

| 指标 | 第一轮修复后 | 第二轮修复后 | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 6 | 7 | +1 |
| 被过滤知识点 | 0 | 0 | 持平 |
| 候选/评估题总数 | 29 | 24 | -5 |
| 入池题总数 | 13 | 21 | +8 |
| 平均每知识点入池题数 | 2.2 | 3.0 | 改善 |
| 达到 3 题的知识点 | 4 | 7 | 改善 |
| 0 题知识点 | 1 | 0 | 改善 |
| 低置信入池题 | 10 | 18 | 增加 |
| blocked 题 | 多个弱来源/弱解释阻断 | 0 | 改善 |

### 本轮有效的地方

1. **知识点保留回到完整主线。**
   本轮保留 7 个知识点，被过滤知识点为 0。上一轮缺失或 0 题的 `Hook、Prompt、CLAUDE.md、CI 的分工明确` 回到复习池，并拿到 3 道题。这说明此前的主要问题不是“这类知识点不适合复习”，而是 `sourceQuote` 不连续导致来源过滤误杀。

2. **每个知识点都达到 3 题。**
   `questionCountDistribution` 变为 `{ "3": 7 }`，7 个保留知识点全部命中 PRD 理想目标。这验证了“默认 3 题目标 + 独立补题 + 来源定位修复”这条路径是有效的。

3. **blocked 原因归零。**
   本轮 `blockingReasonFrequency` 为空，`primaryBlockingReasonFrequency` 全部为 `none`。弱来源、弱解释、弱上下文没有再被直接当成不可复习阻断，而是进入低置信诊断。

4. **来源定位从短锚点扩展为上下文选择。**
   24 道评估题里，来源选择方法分布为：`same_section_relevance: 15`、`source_quote_anchor_expanded: 4`、`keyword_relevance_fallback: 3`、`none: 2`。这说明系统已经不再只机械匹配 `sourceQuote`，而是能在同一小节或关键词相关段落里寻找更能解释题目的上下文。

### 新问题和风险

1. **低置信比例过高。**
   21 道入池题里有 18 道低置信。主要原因是 `source_context_backfilled: 18`，其次有 `weak_source_support: 3`、`weak_misconception_support: 4`、`judge_rewrite: 4`、`weak_distractors: 4`。这说明数量覆盖已经恢复，但质量风险被集中转移到了“来源回填题”上。下一步必须人工抽查这些低置信题，确认它们是“可接受的弱支撑”，还是来源定位仍然不够准。

2. **同一知识点内题型仍偏集中。**
   虽然总题型覆盖变好，但单点内仍有明显集中：例如 `Hook 是在 AI agent 关键节点自动执行命令的控制机制` 3 道全是选择题，`引入 Hook 的四个信号` 3 道全是场景判断，`产品经理需要补上的工程直觉` 3 道全是真假判断。PRD 期待的是理解、辨析、应用多角度强化，而不是同一题型堆满 3 道。

3. **`sourceContextSelection.method = none` 仍出现。**
   评估题中有 2 道显示 `none`。虽然最终没有阻断，但这类题需要在质量工作台里重点审查：如果来源上下文为空或不可追溯，应该进入 blocked；如果只是诊断字段丢失，则需要补齐日志。

### 第一性原理结论

这轮结果证明，上一轮“候选题进不了复习池”的核心根因不是模型完全不会出题，而是来源链路的事实来源不稳定：

1. 知识点阶段的 `sourceQuote` 可能不是原文连续片段。
2. 题目阶段只靠短锚点无法保证解释页上下文支撑题目。
3. trust 层把“来源弱/解释弱”过早归为 blocked，导致可复习题被误杀。

第二轮修复后，系统能把更多题放回复习池，但这只是把“能不能复习”修到合格线。下一轮真正要看的是：这些低置信题是否真的能帮助用户理解原文，而不是为了满足 3 题目标而牺牲解释可信度。

### 下一轮建议

- 对本轮 18 道低置信题做人工审查，优先检查 `source_context_backfilled` 题的来源上下文是否足够支撑答案。
- 调整补题目标，不只要求补满 3 题，还要补齐不同题型和不同记忆角度；同一知识点内三题不能全是同一题型，除非该知识点天然只适合一种题型。
- 把 `sourceContextSelection.method = none` 的题列为 P0 诊断项：要么补齐选择日志，要么阻断入池。
- 在质量报告中增加“单知识点题型多样性”指标，而不仅统计全章题型分布。

## 判断下一轮是否有效

下一轮如果有效，至少应看到：

- `Hook、CI、Prompt 的分工边界` 被保留。
- `引入 Hook 的四个信号` 不再是 0 题。
- `四类实用 Hook 场景` 至少有 2 道入池题。
- 3 题知识点数量从 3 个提升到 5 个以上。
- 入池题型中出现更多 `true_false` 或更明确的辨析题。
- 新增题不显著增加来源不支撑、答案不唯一、解释错误。

这篇文章后续作为“出题覆盖率和质量过滤”的固定单篇回归样本使用。它不替代批量 baseline，但适合在每次小改动后快速观察方向是否正确。

## 2026-05-29 第三轮诊断基础设施复测

本轮不是继续放宽入池，而是把五阶段路线图里的前三个诊断能力先落地：低置信分层、来源精准度、单知识点记忆角度。目标是让下一轮人工审查能明确判断：题目到底是安全低置信、需要重写，还是应该阻断。

实验产物：

- JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-173826-v4-trust-diagnostics.json`
- CSV：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260529-173826-v4-trust-diagnostics.csv`
- Analysis：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/analysis/20260529-173826-v4-trust-diagnostics.md`

### 本轮假设

第二轮已经证明“默认 3 题 + 来源定位修复”能恢复覆盖率，但低置信比例过高。第三轮的假设是：不要再用单一 `low` 判断质量，而要把低置信拆成可复盘层级，并把“来源能支撑”和“来源是否精准”拆开评分。

### Prompt 改动

- 出题 schema 新增 `memoryAngle`，固定为：
  - `core_understanding`
  - `misconception_boundary`
  - `scenario_application`
- 出题 prompt 明确：同一知识点多道题要覆盖不同记忆角度，不只是换题型。
- 补题 prompt 从“缺失题型”扩展为“缺失题型 + 缺失记忆角度”，要求补齐不同理解路径。

### 确定性规则改动

- 新增 `confidenceTier`：
  - `high_confidence`
  - `safe_low_confidence`
  - `needs_rewrite`
  - `should_block`
- 来源选择器新增：
  - `sourcePrecisionScore`
  - `sourceSpecificityScore`
  - `sourceReuseCount`
  - `sourceContextSelection`
- 来源复用不再作为硬阻断，而是记录到报告 Top 5，交给人工审查判断是否过泛。
- 入池选择优先覆盖不同 `memoryAngle`，再覆盖不同题型；硬去重只保留“题干近重复”作为底线。

### 复测指标

| 指标 | 第二轮修复后 | 第三轮复测 | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 持平 |
| 入池题总数 | 21 | 20 | -1 |
| 平均每知识点入池题数 | 3.0 | 2.9 | 略降 |
| 达到 3 题的知识点 | 7 | 6 | -1 |
| 0 题知识点 | 0 | 0 | 持平 |
| 低置信题 | 18 | 5 | 明显下降 |
| 低置信比例 | 85.7% | 25% | 明显下降 |
| blocked 原因 | 0 | `answer_not_unique: 4` | 阻断重新集中到答案唯一性 |
| 平均来源精准度 | 未统计 | 4.8 | 新增指标 |

### 本轮有效的地方

1. **低置信不再泛滥。**
   入池题从 21 道降到 20 道，但低置信从 18 道降到 5 道。说明“精准来源回填不自动降为 low”的校准有效，系统不再把所有后端定位过的来源都视为风险。

2. **低置信分层更可解释。**
   20 道入池题中，`high_confidence: 15`、`safe_low_confidence: 2`、`needs_rewrite: 3`。下一轮人工审查可以优先看 `needs_rewrite`，而不是平均用力检查所有 low。

3. **来源精准度整体较好。**
   平均 `sourcePrecisionScore = 4.8`，说明当前选择器通常能找到足够精准的原文上下文。来源问题没有消失，但已经从“找不到/不支撑”变成“是否复用过多、是否最小充分”。

4. **记忆角度覆盖明显更均衡。**
   20 道入池题中，`core_understanding: 4`、`misconception_boundary: 8`、`scenario_application: 8`。这比只看题型更接近 PRD 想要的“理解、辨析、应用”强化。

### 新问题和风险

1. **一个知识点只有 2 题。**
   `实用Hook场景：改后自动整理` 最终只有 2 道入池题，主要因为该点有 2 道候选被 `answer_not_unique` 阻断。下一轮不应放宽答案唯一性，而应优化该类题的选项构造。

2. **题型仍然偏向选择题和场景判断。**
   本轮入池题型是 `multiple_choice: 9`、`scenario_judgment: 11`，没有 `true_false` 入池。记忆角度已经多样，但题型层面仍有偏科。

3. **来源复用仍需人工判断。**
   来源复用 Top 1 是 `paragraph:28`，被 4 道题使用；另有两个段落各被 3 道题使用。它们可能是合理的同一小节集中支撑，也可能意味着来源选择仍偏向大段落。这个问题不能靠机器分数单独判断，需要人工看 CSV。

4. **候选阻断重新集中到答案唯一性。**
   `blockingReasonFrequency` 只有 `answer_not_unique: 4`。这是一件好事，因为阻断边界收敛了；但也说明下一轮最具体的生成修复点是“干扰项边界”和“唯一答案表达”。

### 第一性原理结论

第三轮说明：出题系统已经从“覆盖率不够”进入“可信度可分层诊断”的阶段。下一步最值得做的不是继续调大题量，而是人工检查这 5 道低置信和 4 道 `answer_not_unique` 阻断题，确认机器分层是否符合人的判断。

如果人工发现 `needs_rewrite` 大多确实不可直接复习，就应把这层从入池降级为候选重写；如果人工发现 `safe_low_confidence` 大多可接受，则可以保留它作为复习池的灰度层。

### 下一轮实验

- 人工标注本轮 CSV 中的 5 道低置信题和 4 道 `answer_not_unique` 阻断题。
- 专门分析 `paragraph:28` 的 4 次复用是否合理。
- 若主要 reject 来自答案唯一性，下一轮做“边界/分工题选项构造模板”。
- 若主要 reject 来自来源复用过泛，下一轮做“最小充分上下文裁剪 + 同段复用上限”。

## 2026-05-29 第四轮：来源片段 v4 最小充分证据

本轮针对用户在质量工作台里指出的更本质问题：来源片段虽然“能支撑答案”，但经常复用同一大段原文。这不符合解释页的学习目标。解释页来源不是为了证明模型没瞎编，而是为了帮助用户快速回到原文关键位置，重新理解这道题为什么成立。

实验产物：

- 失败记录 JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-183103-v5-source-minimality.json`
- 中间复测 JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-184224-v5-source-minimality-rerun.json`
- 裁剪复测 JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-184723-v5-source-minimality-crop.json`
- 主结果 JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-185620-v5-source-minimality-strict-overlap.json`
- 主结果 CSV：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260529-185620-v5-source-minimality-strict-overlap.csv`
- 主结果 Analysis：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/analysis/20260529-185620-v5-source-minimality-strict-overlap.md`

### 本轮假设

来源选择不能只问“这段能不能支撑答案”，还要问“这是解释这道题所需的最小充分证据吗”。如果系统默认返回整段上下文，即使答案可信，用户也会在解释页重新面对一大块原文，复习效率下降。

### Prompt 改动

本轮没有新增专用模型调用，也没有大改出题 prompt。核心选择是先用确定性规则修来源，不继续依赖模型自己给出更精准的 `sourceSnippet`。

### 确定性规则改动

- 来源窗口从“完整段落优先”改为“最小充分证据优先”。
- 对长段落先按题干、正确答案、正确理解、知识点标题和 `keyClaim` 做关键词定位，再按句子边界裁剪。
- `sourceSnippet` 必须能在清洗后原文中定位；只存在于模型生成的 `sourceQuote` 中不再算有效来源，避免 `……` 这类模型拼接引用进入解释页。
- 新增来源诊断字段：
  - `sourceMinimalityScore`
  - `sourceEvidenceRole`
  - `sourceOverlapRatio`
  - `sourceOverlapGroupId`
- 修正 overlap 分组口径：只有文本重叠超过 70% 才进入同一 overlap group，弱相似只记录比例，不再误报为来源复用。

### 复测过程

| 轮次 | 结果 | 判断 |
| --- | --- | --- |
| `v5-source-minimality` | 模型返回不可解析 JSON | 保存失败产物，不作为质量结论 |
| `v5-source-minimality-rerun` | 7 知识点 / 21 题 / 平均最小化 2.9 | 覆盖率好，但来源仍偏大段 |
| `v5-source-minimality-crop` | 6 知识点 / 16 题 / 平均最小化 4.5 | 裁剪有效，但暴露 `sourceQuote` 省略号问题 |
| `v5-source-minimality-strict-overlap` | 7 知识点 / 20 题 / 平均最小化 4.5 | 本轮主结果，覆盖率和来源最小化达到较好平衡 |

### 主结果指标

| 指标 | 第三轮 | 第四轮主结果 | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 持平 |
| 入池题总数 | 20 | 20 | 持平 |
| 平均每知识点入池题数 | 2.9 | 2.9 | 持平 |
| 达到 3 题的知识点 | 6 | 6 | 持平 |
| 0 题知识点 | 0 | 0 | 持平 |
| 低置信题 | 5 | 11 | 上升 |
| 低置信比例 | 25% | 55% | 上升 |
| 平均来源精准度 | 4.8 | 4.9 | 略升 |
| 平均来源最小化 | 未统计 | 4.5 | 新增且达标 |
| 主要阻断原因 | `answer_not_unique: 4` | `answer_not_unique: 3` | 基本持平 |

### 本轮有效的地方

1. **大段来源问题明显收敛。**
   来源片段平均最小化达到 4.5，说明解释页不再默认返回 450-500 字的大段上下文。Hook 定义、生命周期、prompt vs hook 对比这类题，已经能定位到更短的关键证据。

2. **覆盖率没有因裁剪来源明显下降。**
   仍然保留 7 个知识点、20 道入池题，6 个知识点达到 3 题，0 题知识点仍为 0。这说明“来源更短”没有把系统拉回少题状态。

3. **来源必须来自原文的底线更清楚。**
   裁剪复测暴露出模型 `sourceQuote` 可能含省略号或非连续拼接。严格原文验证后，这类片段不会再直接进入用户可见解释页。

4. **来源诊断更可复盘。**
   现在可以同时看段落复用和文本重叠复用，不会只凭段落 index 判断。overlap group 加阈值后，报告不再把弱相似误报为同一来源大组。

### 仍然存在的问题

1. **同一小节内来源仍会集中复用。**
   主结果里 `paragraph:18` 被 5 道题使用，`source-7` overlap group 覆盖 4 道题。抽查发现它集中在“什么时候需要 hook：从可运行到可复用”这一小节。这里的问题已经不是“返回整篇大段”，而是多个题都围绕同一个小节证据，没有进一步分散到定义、信号、例子、边界的不同句子。

2. **低置信比例回升。**
   低置信从第三轮 25% 回升到 55%。这不一定表示质量变差，因为本轮对来源更严格，弱来源/弱解释会更诚实地暴露出来。但下一步必须人工抽查这些 low 题，确认它们是可接受的 `safe_low_confidence`，还是应该进入重写。

3. **题型仍偏选择题和场景判断。**
   主结果题型为 `multiple_choice: 10`、`scenario_judgment: 9`、`true_false: 1`。记忆角度比较均衡，但题型层仍不够丰富。

### 第一性原理结论

本轮证明，解释页来源的正确目标应该分成三层：

1. **可信**：来源必须来自原文，并且支撑答案。
2. **精准**：来源应匹配当前题意，而不是只匹配知识点标题。
3. **最小充分**：来源应尽量短，但足够解释答案和关键误区。

第四轮已经把系统从“可信 + 大段上下文”推进到“可信 + 较精准 + 较短证据”。剩下的问题是“同一小节多题如何分配不同证据块”。这需要下一轮继续做原文结构块，而不是再单纯调短字符串长度。

### 下一轮实验

- 做 `sourceBlocks`：把正文显式切成 heading / paragraph / sentence window，并标注 definition、mechanism、contrast、example、boundary、method。
- 每个知识点绑定 `primaryEvidenceText`、`supportingExampleText` 和 `contextSectionTitle`，让题目来源优先从对应证据块选择。
- 对同一知识点的 2-3 道题增加“证据块多样性”约束：同点多题不应全部复用同一句或同一个短窗口。
- 人工审查本轮 low 题，重点看 `paragraph:18` 与 `source-7` 这组来源是否真的过度复用。

## 2026-05-29 第五轮：sourceBlocks 与证据块分配

本轮继续上一轮结论：只把来源裁短还不够，系统需要知道“这道题用的是原文里的哪一个证据块”。目标是让同一知识点的多道题尽量绑定到不同的原文节点，减少同小节内的证据集中复用。

实验产物：

- JSON：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/runs/20260529-191215-v6-source-blocks-evidence-diversity.json`
- CSV：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/reviews/20260529-191215-v6-source-blocks-evidence-diversity.csv`
- Analysis：`quality-test-set/results/single-article/UMr6ia1QubqOMw3aBUGbOw/analysis/20260529-191215-v6-source-blocks-evidence-diversity.md`

### 本轮假设

解释页来源的关键问题已经从“是否大段”变成“是否结构化定位”。如果系统能先把原文切成 source blocks，再按题目意图分配 definition、mechanism、contrast、example、boundary、method 等证据角色，同一知识点多题应该更少复用同一段。

### Prompt 改动

本轮不改出题 prompt，不新增模型调用。所有变化都在后端确定性来源选择和报告诊断层。

### 确定性规则改动

- 新增 `sourceBlocks` 构建：从 `cleanedText` 切出 heading、paragraph、sentence window。
- 每个 block 记录 `sourceBlockId`、`sectionTitle`、`paragraphIndex`、`sentenceStart`、`sentenceEnd`、`evidenceRole`。
- 每道题按题目意图优先匹配不同证据角色：定义、机制、对比、例子、边界、方法。
- 同一知识点内复用同一 block 或同一 role 会被扣分，并记录：
  - `sourceEvidenceDiversityScore`
  - `sourceReuseReason`
  - `sourceBlockId`
- 报告新增 `sourceBlockReuseTop` 和 `sourceBlockCoverageByPoint`。

### 指标对比

| 指标 | 第四轮主结果 | 第五轮 sourceBlocks | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 持平 |
| 入池题总数 | 20 | 21 | +1 |
| 平均每知识点入池题数 | 2.9 | 3.0 | 提升 |
| 达到 3 题的知识点 | 6 / 7 | 7 / 7 | 提升 |
| 0 题知识点 | 0 | 0 | 持平 |
| 低置信比例 | 55% | 76.2% | 上升 |
| 平均来源精准度 | 4.9 | 5.0 | 略升 |
| 平均来源最小化 | 4.5 | 4.6 | 略升 |
| 来源段落复用 Top | 5 题 | 2 题 | 明显改善 |
| 证据块复用 Top | 未统计 | 2 题 | 新增且可控 |

### 本轮有效的地方

1. **题量和覆盖达到当前 PRD 理想状态。**
   7 个知识点全部达到 3 题，平均每点 3 题，未覆盖知识点为 0。

2. **来源复用显著下降。**
   上一轮 `paragraph:18` 被 5 道题复用；本轮来源复用 Top 只到 2 题。source block 复用 Top 也只到 2 题，说明证据块分配确实打散了原文节点。

3. **来源精准和最小化没有被牺牲。**
   平均来源精准度 5.0，平均最小证据 4.6，都比上一轮略高。说明用 source block 分配并没有让来源变长或变泛。

4. **报告开始能看见同知识点内部证据分布。**
   `sourceBlockCoverageByPoint` 能显示每个知识点 3 道题用了几个 source block、几种 evidence role。这个指标比只看段落复用更接近用户复习体验。

### 新问题和风险

1. **低置信比例明显回升。**
   本轮低置信 76.2%，主要来自 `weak_misconception_support`、`weak_explanation_faithfulness`、`weak_source_support`。这说明来源分散后，系统更严格地暴露了解释/误区支撑不足，而不是来源定位本身失败。

2. **仍有少数知识点证据块不够分散。**
   `kp-2` 和 `kp-6` 都是 3 题只使用 1 个 source block。它们是下一轮人工检查重点：如果原文确实只有一个证据块，可以接受；如果不是，就说明 block 选择仍偏窄。

3. **题型仍然偏选择题和场景判断。**
   本轮 `multiple_choice: 8`、`scenario_judgment: 12`、`true_false: 1`。题量和来源变好了，但题型结构还没完全回到 PRD 理想。

### 第一性原理结论

第五轮证明：`sourceBlocks` 是正确方向。它没有靠放宽质量规则换题量，而是在保持来源精准的同时，把“来源复用”从段落级集中降到了 block 级可诊断。

但新的瓶颈也更清楚：当来源定位变准以后，低置信主要不再是“找不到来源”，而是“解释、误区和干扰项是否真正被这块来源支撑”。下一轮应该进入解释一致性和误区支撑专项，而不是继续调来源裁剪。

### 下一轮实验

- 人工抽查本轮 16 道低置信题，重点看 `weak_explanation_faithfulness` 和 `weak_misconception_support` 是否真的影响复习。
- 对 `kp-2`、`kp-6` 做 source block 人工审查：判断 3 题共用 1 个 block 是否合理。
- 如果低置信 reject 主要来自解释/误区，下一轮做“解释与误区必须绑定到原文证据”的专项。
- 如果低置信 reject 主要来自选项，下一轮做“边界/分工题选项构造模板”。

## 2026-05-30 第六轮准备：认知动作驱动 PRD 对齐

第五轮之后，我们重新对照 PRD 和学习理论讨论了一个更底层的问题：拾贝不应该把“每个知识点 3 道题”当作最高目标。题量已经不是当前瓶颈，真正的问题是这些题是否帮助用户从“看过文章”走到“理解、分清、会用”。

本节记录理论调研、PRD 口径更新和下一轮实验计划。它不是一次已完成的模型复测，而是第六轮实验的设计依据。

### 理论依据

| 理论 / 研究方向 | 对拾贝出题的启发 |
| --- | --- |
| Retrieval Practice / Testing Effect | 主动回忆比重复阅读更能促进长期记忆。拾贝的第一类题应帮助用户取回知识点核心判断，而不是只识别关键词。 |
| Transfer of Learning | 测试可以促进迁移。拾贝需要场景迁移题，让用户把原文判断用到新场景。 |
| Elaborative Interrogation | 学习者需要理解“为什么”。解释页不能只给答案，必须说明答案为什么成立、其它选项为什么不成立。 |
| ICAP 框架 | 越需要学习者主动构造、比较、解释，学习越深。拾贝题目应尽量促发比较、归因、迁移，而不是被动识别。 |
| Desirable Difficulties / Interleaving | 适度困难和变化练习能帮助长期掌握。同一知识点的多题应有变化，但变化应服务认知动作，而不是机械换题型。 |
| Multiple-choice Feedback | 多选题需要高质量反馈，否则干扰项可能强化误解。因此解释和误区支撑必须纳入质量控制。 |

### PRD 口径更新

旧口径更容易被工程实现误解为：

> 每个知识点尽量生成 1-3 道题，最好不同题型。

新口径改为：

> 每个高价值知识点应尽量生成 1-3 道递进复习题。多题的目标不是凑数量，也不是机械换题型，而是覆盖不同认知动作：核心回忆、边界辨析、场景迁移。

这意味着：

- 题型多样是手段，不是目标。
- 同一知识点 3 道同题型不一定错误；如果它们分别完成核心回忆、边界辨析、场景迁移，可以接受。
- 同一知识点 3 道不同题型也不一定合格；如果只是换壳重复同一个判断，就不应全部入池。
- 质量检查必须判断题目是否真的完成声明的认知动作。

### 三类认知动作

| 认知动作 | 目标 | 好题特征 | 常见失败 |
| --- | --- | --- | --- |
| 核心回忆 | 帮用户取回知识点最重要的判断 | 问核心主张，不问局部细节；答案直接被来源支撑 | 只考关键词或原文字面 |
| 边界辨析 | 帮用户分清相似概念、适用边界和常见误区 | 干扰项来自真实混淆对象；解释能说明为什么其它选项不合适 | 干扰项凑数；误区泛泛想象 |
| 场景迁移 | 帮用户把知识点用于新场景 | 场景不是原文复述，但判断依据来自原文 | 把原文例子换皮；开放题变成主观判断 |

### 对第五轮结果的重新解释

第五轮 v6 的表面指标很好：

- 7 个知识点全部覆盖。
- 21 道题入池。
- 每个知识点 3 道题。
- 来源复用 Top 降到 2 题。
- 平均来源精准度 5.0，最小证据 4.6。

但按新的 PRD 口径看，它仍有偏差：

1. **题量达标不代表复习动作达标。**
   多个知识点仍出现 3 道同题型，例如 3 道全是 `scenario_judgment` 或 3 道全是 `multiple_choice`。如果三题确实承担不同认知动作，可以接受；否则就是换壳重复。

2. **`memoryAngle` 已经出现，但还不是强契约。**
   现在系统会标记 `core_understanding`、`misconception_boundary`、`scenario_application`，但质量检查还没有严格判断题目是否真的完成该角度。

3. **低置信问题说明解释层还弱。**
   低置信 76.2%，主要原因是 `weak_misconception_support`、`weak_explanation_faithfulness` 和 `weak_source_support`。这说明题干和答案可能可用，但解释、误区、干扰项还没有足够被原文证据约束。

### 第六轮实验假设

下一轮不再优先增加题量，也不继续单纯裁短来源。实验假设是：

> 如果先为每个知识点生成练习蓝图，再按蓝图出题，并按蓝图验收，系统会比单纯 prompt 要求“不同题型”更稳定地生成递进复习题。

### 第六轮计划

实验标签建议：`v7-cognitive-blueprint-alignment`

关键改动：

1. **新增 `practiceBlueprint`。**
   每个知识点先生成 1-3 个练习目标，分别对应核心回忆、边界辨析、场景迁移。

2. **按蓝图出题。**
   出题 prompt 不再只说“生成 3 道不同题”，而是要求每道题服务一个蓝图项。

3. **入池选择器按认知动作优先。**
   选择优先级改为：可信度 > 不同认知动作 > 低重复 > 题型多样。

4. **质量检查按认知动作验收。**
   新增 `memoryAngleFitScore` 和 `blueprintAlignmentScore`，判断题目是否真的完成声明的认知动作。

5. **解释、误区、干扰项拆分诊断。**
   将 `weak_explanation_faithfulness` 和 `weak_misconception_support` 拆成更具体原因，方便判断是 prompt、选项、解释还是来源问题。

### 第六轮验收指标

| 指标 | 目标 |
| --- | --- |
| 保留知识点 | 不少于 7 |
| 入池题数 | 不少于 18 |
| 高价值知识点认知动作覆盖 | 每点至少 2 个不同认知动作 |
| 3 道同题型知识点 | 必须有 `typeDiversityReason`，且人工判断不重复 |
| 低置信题 | 不要求立即下降，但原因必须更具体 |
| 解释忠实 | `weak_explanation_faithfulness` 不再笼统出现，拆成可修复原因 |
| 误区支撑 | `weak_misconception_support` 不再笼统出现，拆成可修复原因 |
| 人工抽查 | 低置信题 accept + fixable 目标高于 80% |

### 第一性原理结论

拾贝不是考试生成器，也不是 Anki 卡片批量器。它的出题系统应该像一个轻量教学设计器：先判断一个知识点值得怎么练，再生成对应题目，最后检查题目是否真的完成练习目标。

因此下一轮优化不应该是“再改几个 prompt 词”，而应把学习理论转成系统结构：

```text
知识点
-> 练习蓝图
-> 按认知动作出题
-> 按蓝图入池选择
-> 按解释、误区、干扰项可信度验收
-> 单篇实验复测和人工抽查
```

这才是把检索练习、迁移学习、精细加工等理论真正用进系统，而不是让模型“听说过理论”。

## 2026-05-30 第七轮：认知动作蓝图 v7 复测

实验标签：`v7-cognitive-blueprint-alignment`

本轮按上一节计划落地了第一版 `practiceBlueprint`。系统在出题前先为每个知识点生成 1-3 个练习目标，再要求模型把题目绑定到具体蓝图项，而不是只笼统要求“题型多样”。

### 本轮改动

1. **新增确定性练习蓝图。**
   每个知识点根据目标题数生成 `core_understanding`、`misconception_boundary`、`scenario_application` 三类练习目标。低可考知识点仍可降级，但本篇 7 个知识点都保留 3 个目标。

2. **Prompt 改成分层结构。**
   系统 prompt 从单段规则改为产品原则、题目结构规则、练习蓝图、输出格式四层。用户 prompt 要求每道题输出 `blueprintItemId` 和 `blueprintGoal`。

3. **选择器优先认知动作。**
   入池选择先看 `blueprintItemId` / `memoryAngle` 是否覆盖不同认知动作，再看题型是否不同。同题型 3 题可以保留，但必须记录 `typeDiversityReason`。

4. **低置信原因拆细。**
   原来的 `weak_explanation_faithfulness` 和 `weak_misconception_support` 被拆成 `explanation_overextends_source`、`explanation_not_tied_to_answer`、`misconception_too_generic`、`misconception_not_grounded` 等更可修复原因。

### 原始产物

- JSON：`runs/20260530-141747-v7-cognitive-blueprint-alignment.json`
- CSV：`reviews/20260530-141747-v7-cognitive-blueprint-alignment.csv`
- 机器分析：`analysis/20260530-141747-v7-cognitive-blueprint-alignment.md`

### 指标对比

| 指标 | v6 source blocks | v7 cognitive blueprint | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 持平 |
| 入池题数 | 21 | 21 | 持平 |
| 每点 3 题覆盖率 | 100% | 100% | 持平 |
| 低置信比例 | 76.2% | 66.7% | 改善 |
| 高置信题 | 5 | 7 | 改善 |
| 平均来源精准 | 5.0 | 5.0 | 持平 |
| 平均最小证据 | 4.6 | 4.7 | 小幅改善 |
| 平均蓝图匹配 | 未统计 | 4.5 | 新增 |
| memoryAngle 匹配 | 未统计 | 5.0 | 新增 |
| 来源段落复用 Top | 2 题 | 2 题 | 持平 |
| source overlap Top | 2 题 | 3 题 | 局部回升 |

### 本轮有效的地方

1. **题量没有回退。**
   7 个知识点仍全部达到 3 题，总入池 21 题，说明蓝图层没有牺牲覆盖率。

2. **低置信比例下降。**
   低置信从 76.2% 降到 66.7%，高置信从 5 题升到 7 题。虽然还不够低，但方向是好的。

3. **低置信原因更可诊断。**
   本轮不再主要出现笼统的 `weak_explanation_faithfulness` / `weak_misconception_support`，而是拆成 `misconception_not_grounded`、`explanation_overextends_source`、`answer_grounding_weak` 等更能指导下一轮修复的标签。

4. **认知动作覆盖变成可检查字段。**
   `averageBlueprintAlignmentScore = 4.5`，`averageMemoryAngleFitScore = 5.0`。这说明题目在机器诊断上基本能对齐声明的练习目标。

### 新问题和风险

1. **source overlap 局部回升。**
   `source-3` 被 3 道题复用，集中在同一组问题上。虽然来源段落复用 Top 仍只有 2 题，但文本重叠层面说明有些题仍共享同一最小证据。

2. **部分知识点仍只用 1 个 source block。**
   `kp-2`、`kp-3` 都是 3 题只用 1 个 source block。对于原文证据单一的知识点可以接受，但需要人工判断这是否导致三题变成同一证据的换壳练习。

3. **题型多样性仍不是完全均衡。**
   本轮题型分布为 `scenario_judgment: 11`、`true_false: 7`、`multiple_choice: 3`。这比上一轮更接近“边界辨析 + 场景迁移”，但多选题偏少，需要检查是否影响核心理解题质量。

4. **仍有 3 个答案唯一性阻断。**
   `blockingReasonFrequency.answer_not_unique = 3`，说明复杂边界 / 分工类题的选项设计仍可能让多个选项看起来都成立。

### 第一性原理结论

第七轮证明：把学习理论落实成系统结构，比继续往 prompt 里加理论术语更有效。`practiceBlueprint` 让“每个知识点 3 题”从数量目标变成了认知动作目标，低置信比例和诊断可读性都有改善。

但它也暴露了下一层瓶颈：即使题目对齐了蓝图，证据块和选项设计仍可能让几道题围绕同一个原文节点反复变化。因此后续不能只看 `memoryAngle` 是否齐全，还要看：

- 同一知识点 3 题是否真的使用不同证据或不同推理任务。
- 边界辨析题的干扰项是否来自真实混淆对象。
- 场景迁移题是否只是把原文例子换皮。

### 下一轮实验

- 人工抽查本轮 14 道低置信题，重点看 `misconception_not_grounded` 是否真的影响复习价值。
- 对 `source-3` 和 `kp-2` / `kp-3` 做来源复用审查：判断复用是合理的“唯一证据”，还是题目重复。
- 进入“复杂边界题模板”专项：对工具分工、机制边界、概念对比类知识点，要求干扰项来自真实混淆对象，并解释其它选项为什么不合适。
- 如果人工确认 source overlap 的题仍可接受，则下一轮优先修 `answer_not_unique`；如果不可接受，则继续加强 source block 分配和重复题去重。

## 2026-05-30 第八轮：教学质量评分 v8 复测

实验标签：`v8-pedagogical-rubric-calibration`

本轮没有继续提高题量，也没有继续往出题 prompt 里堆规则；重点是把评分系统从“格式 / 来源检查”升级为“教学质量审查器”。核心问题是：v7 的题量和蓝图字段看起来不错，但机器评分仍不能回答“这三道题是否真的帮助用户记住、分清、会用”。

### 本轮改动

1. **题型错配降级。**
   `question_type_mismatch` 不再直接作为低置信核心原因。题型只是实现手段；如果题目完成了对应 `memoryAngle`，就只记录为提示。

2. **新增认知动作评分。**
   每道题新增 `cognitiveActionFitScore`，并拆成：
   - `coreRecallFitScore`
   - `boundaryDiscriminationFitScore`
   - `scenarioTransferFitScore`

3. **新增同知识点组合评分。**
   入池后的同一知识点 3 题会记录：
   - `practiceProgressionScore`：是否形成“记住 -> 分清 -> 会用”的递进。
   - `practiceDuplicateRiskScore`：是否重复考同一判断。
   - `sourceReuseLearningReason`：如果复用同一 source block，说明复用对学习是否有风险。

4. **新增来源学习价值评分。**
   `evidenceLearningValueScore` 用来区分“来源能证明答案”和“来源能帮助用户回到原文关键节点理解答案”。

5. **误区和干扰项问题拆细。**
   原来的 `weak_distractors`、`misconception_not_grounded` 被进一步拆成更可修复的原因，例如 `distractors_too_obvious`、`misconception_too_generic`、`misconception_not_reflected_in_options`。

### 原始产物

- JSON：`runs/20260530-163959-v8-pedagogical-rubric-calibration.json`
- CSV：`reviews/20260530-163959-v8-pedagogical-rubric-calibration.csv`
- 机器分析：`analysis/20260530-163959-v8-pedagogical-rubric-calibration.md`

### 指标对比

| 指标 | v7 cognitive blueprint | v8 pedagogical rubric | 变化 |
| --- | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 持平 |
| 入池题数 | 21 | 21 | 持平 |
| 每点 3 题覆盖率 | 100% | 100% | 持平 |
| 低置信比例 | 66.7% | 90.5% | 上升 |
| 高置信题 | 7 | 2 | 下降 |
| 平均来源精准 | 5.0 | 5.0 | 持平 |
| 平均最小证据 | 4.7 | 4.8 | 小幅提升 |
| 平均蓝图匹配 | 4.5 | 4.4 | 基本持平 |
| memoryAngle 匹配 | 5.0 | 4.9 | 基本持平 |
| 平均认知动作匹配 | 未统计 | 3.6 | 新增 |
| 平均练习递进 | 未统计 | 5.0 | 新增 |
| 平均证据学习价值 | 未统计 | 4.7 | 新增 |
| 重复练习风险题 | 未统计 | 8 | 新增 |

### 本轮有效的地方

1. **评分尺子更接近 PRD。**
   现在能区分“题型对不对”和“认知动作是否完成”。`question_type_mismatch` 退出主要低置信原因，说明评分系统不再机械惩罚题型。

2. **暴露了 v7 没看见的问题。**
   v7 看起来低置信下降，但 v8 发现很多题仍然是 `core_recall_too_literal`、`boundary_not_teaching_real_confusion`、`scenario_transfer_too_literal`。这说明之前的蓝图字段有时只是“填对字段”，不代表练习真的成立。

3. **解释错误被显性统计。**
   本轮出现 4 个 `explanation_wrong` 机器问题，典型是解释里写错正确选项字母。这类问题对用户信任伤害很大，下一轮应单独修。

4. **来源问题从“大段复用”转向“学习价值”。**
   来源精准和最小证据分都高，但仍有 8 道重复练习风险题。这说明当前瓶颈不再是来源太长，而是同一知识点多题是否真的训练不同判断。

### 新问题和风险

1. **v8 评分可能过严。**
   低置信升到 90.5%，高置信只剩 2 道。这里不能简单理解为题变差，而是新评分器把更多教学质量问题暴露出来。需要人工校准哪些 low 是真实 reject，哪些只是可接受提醒。

2. **核心回忆题太像字面题。**
   `core_recall_too_literal = 6`，说明核心理解题常常没有真正让用户复述主张，而是在识别原文或局部表述。

3. **边界题还缺真实混淆对象。**
   `boundary_not_teaching_real_confusion = 4`，说明边界辨析题仍可能是“泛泛说一个错误理解”，而不是训练真实会混淆的对象。

4. **场景迁移题有换皮风险。**
   `scenario_transfer_too_literal = 2`，说明部分场景题还只是把原文例子换成题干，不是真正迁移到新情境。

5. **解释和选项生成仍是最大信任风险。**
   4 道解释错误、1 道干扰项弱，说明下一轮不能只改评分；要修生成 prompt / 后处理，特别是解释必须引用 `correctOptionId` 对应的选项，不能写错字母。

### 第一性原理结论

v8 的价值不是让指标立刻更漂亮，而是让评分系统终于开始问正确的问题：题目是否真的完成了学习动作。它证明当前系统已经能稳定做到“7 个知识点、21 道题、来源精准”，但还没有稳定做到“每个知识点 3 道题形成真实认知递进”。

当前更像是：出题生产力达标，教学质量审查刚开始变准。

下一步不能为了降低低置信比例把尺子调松；应该先人工校准 v8 标出的低置信题。如果人工确认这些问题真实存在，就进入生成侧修复：核心回忆题模板、边界误区模板、场景迁移模板、解释一致性校验。

### 下一轮实验

- 生成 v8 低置信题审查页，人工标注 `accept / fixable / reject`。
- 优先审查四类问题：
  - `core_recall_too_literal`
  - `boundary_not_teaching_real_confusion`
  - `scenario_transfer_too_literal`
  - `explanation_wrong`
- 如果人工 reject 集中在解释错误，先做解释一致性硬校验。
- 如果人工 reject 集中在核心 / 边界 / 场景动作不成立，下一轮进入“按认知动作拆 prompt 模板”，而不是继续统一大 prompt。

## 2026-05-31 第九轮：文章结构骨架驱动 v9 与结构绑定修复

实验标签：

- 初始实验：`v9-article-structure-rubric`
- 结构绑定修复验证：`v9-structure-binding-fix`
- 结构绑定二次修复验证：`v9-structure-binding-fix2`

本轮从第一性原理重新看评分系统：一道题是否值得进入复习池，不只取决于题本身是否格式正确，而取决于它是否绑定到文章真实结构中的一个学习节点。也就是说，系统需要先知道文章有哪些主张、定义、边界、方法、案例，再判断知识点和题目是否忠实于这些节点。

### 本轮改动

1. **新增文章结构骨架字段。**
   生成链路开始构建 `articleStructureMap`，并把知识点绑定到 `structureNodeId`、`roleInArticle`、`sourceEvidenceIds`。题目和质量报告同步透出这些字段。

2. **新增结构与主张忠实度指标。**
   质量报告增加 `sourceCoverageScore`、`claimFidelityScore`、`learningEffectivenessScore`，并统计结构节点覆盖情况，避免只看题量和来源长度。

3. **修复微信文章提取兜底。**
   微信链接优先尝试静态 HTML 提取，避免 Playwright 被微信环境校验拦住后直接失败。

4. **修复结构骨架伪节点过多。**
   初始 v9 把大量句窗当成结构节点，产生 47 个伪节点。修复后按段落归并、过滤导语/噪声、限制高价值结构节点，结构节点降到 24 个。

5. **修复知识点误绑定到开头场景。**
   初始 v9 中多个知识点被误绑到开头 demo 场景，根因是结构绑定使用中文 2 字符滑窗，`产品经理 / hook / demo` 这类高频词造成误匹配。修复后改为优先 `sourceQuote` 命中和有意义关键词，导语/背景段不再抢占后文知识点。

### 原始产物

- 初始 JSON：`runs/20260531-015650-v9-article-structure-rubric.json`
- 初始 CSV：`reviews/20260531-015650-v9-article-structure-rubric.csv`
- 初始分析：`analysis/20260531-015650-v9-article-structure-rubric.md`
- 一次修复 JSON：`runs/20260531-020431-v9-structure-binding-fix.json`
- 一次修复 CSV：`reviews/20260531-020431-v9-structure-binding-fix.csv`
- 一次修复分析：`analysis/20260531-020431-v9-structure-binding-fix.md`
- 二次修复 JSON：`runs/20260531-020815-v9-structure-binding-fix2.json`
- 二次修复 CSV：`reviews/20260531-020815-v9-structure-binding-fix2.csv`
- 二次修复分析：`analysis/20260531-020815-v9-structure-binding-fix2.md`

### 指标对比

| 指标 | v8 pedagogical rubric | v9 初始 | v9 fix2 | 结论 |
| --- | ---: | ---: | ---: | --- |
| 保留知识点 | 7 | 7 | 8 | 小幅增加 |
| 入池题数 | 21 | 20 | 24 | 恢复到每点 3 题 |
| 每点 3 题覆盖率 | 100% | 85.7% | 100% | 修复后恢复 |
| 低置信比例 | 90.5% | 95.0% | 79.2% | 仍高，但较初始 v9 改善 |
| 高置信题 | 2 | 1 | 5 | 改善 |
| 平均来源精准 | 5.0 | 4.8 | 4.7 | 略降但仍可接受 |
| 平均最小证据 | 4.8 | 5.0 | 4.9 | 稳定 |
| 平均来源覆盖 | 未统计 | 3.6 | 3.6 | 新瓶颈 |
| 平均主张忠实 | 未统计 | 4.7 | 4.8 | 较好 |
| 结构节点数 | 未统计 | 47 | 24 | 伪节点减少 |
| 被知识点覆盖的结构节点 | 未统计 | 3 | 7 | 明显改善 |
| 答案不唯一阻断 | 约 3 | 3 | 1 | 改善 |

### 本轮有效的地方

1. **结构绑定从“明显错误”变成“可诊断”。**
   初始 v9 把多个后文知识点绑到标题/开头场景，fix2 后主要知识点已经能分别绑定到定义、prompt 对比、判断标准、demo 原因、四种场景、分工等节点。

2. **出题覆盖没有因为结构约束下降。**
   fix2 保留 8 个知识点、24 道题，每个知识点 3 道题，说明结构层没有牺牲 PRD 中“多题强化”的目标。

3. **答案唯一性有所改善。**
   `answer_not_unique` 从 3 降到 1，说明结构绑定和主张忠实度对复杂分工题有一定帮助。

4. **报告能看出结构问题在哪里。**
   现在可以看到哪些结构节点有知识点、哪些没有，哪些知识点绑定过宽。这比之前只看 `source_support` 更接近“文章理解是否完整”的问题。

### 新问题和风险

1. **结构骨架仍偏碎。**
   fix2 有 24 个结构节点，其中“四个信号”被拆成多个节点。对系统来说，这有利于定位证据；对知识点选择来说，可能过细，后续需要把相邻证据节点聚合成“文章主线节点”。

2. **来源覆盖分仍低。**
   `averageSourceCoverageScore = 3.6`，说明题目经常只覆盖知识点所需证据的一部分。当前不是来源长度问题，而是题目、知识点和证据块之间还没有形成稳定的多证据绑定。

3. **低置信比例仍高。**
   fix2 低置信 79.2%，主要原因仍包括 `source_coverage_incomplete`、`misconception_not_grounded`、`answer_grounding_weak`。这说明 v9 修的是结构绑定，不是误区 / 干扰项 / 解释质量的最终解。

4. **有些知识点跨结构节点。**
   例如“四个信号”本质上由 4 个子证据组成，但绑定到一个总节点或多个子节点都各有问题。下一轮需要区分“复习知识点”与“证据子节点”：知识点可以是一个综合单元，但题目应明确引用它所考察的子证据。

### 第一性原理结论

v9 证明“文章结构骨架”是必要方向，但第一版不能只把 source blocks 当作结构骨架。真正的结构层至少需要两级：

- **文章主线节点**：用户需要记住的主张、方法、边界、分工。
- **证据子节点**：解释这个主线节点的定义句、机制句、案例句、边界句。

当前 fix2 更像“证据子节点层”，已经能减少错误绑定，但还没有稳定生成“主线节点层”。因此下一轮不应该继续单纯加规则裁剪 source block，而应把结构层显式拆成“主线节点 -> 证据块”，再让知识点绑定主线节点、题目绑定证据块。

### 下一轮实验

- 设计 `ArticleStructure v2`：把结构骨架从单层节点升级为“主线节点 + 证据块”两层。
- 对“四个信号”“四种场景”“prompt / CLAUDE.md / hook / CI 分工”这类综合知识点，允许一个知识点绑定多个 evidence block。
- `sourceCoverageScore` 改成检查题目是否覆盖当前题所需证据，而不是要求每道题覆盖知识点全部证据。
- 继续保留 v9 的结构覆盖报告，但把“未覆盖结构节点”分成“未覆盖主线节点”和“未覆盖证据子节点”，避免误判。
