# 人工评分模板

测试时间：
模型：
生成结果文件：
评分文件：
评分人：

## 总体结论

- 样本数：
- 成功生成样本数：
- 进入复习池题目数：
- 人工审查题目数：
- 人工认为可用题目数：
- 可用题比例：
- 严重问题题目数：
- 严重问题比例：
- 低置信题审查数：
- 低置信题 reject 数：
- 是否达到 MVP 门槛：

## 单题评分字段

`human_status`：

- `accept`：题目可直接进入复习。
- `fixable`：题目方向可用，但需要修 prompt、质量规则或来源片段。
- `reject`：题目不应进入复习池。

每题按 1-5 分评分：

- `source_support`：来源片段是否能支持正确答案和解释。
- `source_precision`：来源片段是否是最精准、最小且最适合解释本题的原文位置；它和 `source_support` 分开评分，来源能支撑但太泛、太长或多题复用时应扣分。
- `source_minimality`：来源是否是“最小充分证据”。如果能用 1-2 句解释题目，却展示了一整段泛泛上下文，应扣分。
- `source_evidence_role`：来源证据角色，例如 `definition`、`mechanism`、`contrast`、`example`、`boundary`、`method`。用于判断题目意图和来源角色是否匹配。
- `source_block_id`：后端切出的原文证据块 ID，用于判断同一知识点的多道题是否都回到同一个原文节点。
- `source_evidence_diversity`：同一知识点内来源证据块和证据角色是否足够分散。3 道题都复用同一块时应扣分，除非原文只有一个可支撑块。
- `source_reuse_reason`：机器记录的复用原因，例如同知识点复用同一证据块、同语义文本重叠等。人工可据此判断复用是否合理。
- `source_overlap_ratio` / `source_overlap_group`：用于发现多题复用同一语义大段。重叠高不一定错误，但需要人工判断是否题目重复或来源不够精准。
- `answer_uniqueness`：是否只有一个最合理答案。
- `understanding_depth`：是否考理解、边界、场景、迁移或误区。
- `clarity`：题干、选项、解释是否清楚。
- `distractor_quality`：错误选项是否合理但明确错误。
- `explanation_faithfulness`：正确理解、常见误区和解释是否忠实于原文与题目。
- `review_value`：这道题是否值得未来再次复习。
- `knowledge_mainline_relevance`：对应知识点是否属于文章主线或重要支撑。
- `knowledge_granularity`：对应知识点是否粒度合适，不太碎也不太泛。
- `knowledge_review_value`：对应知识点本身是否值得复习。
- `missing_core_point`：是否明显漏掉文章核心知识点。
- `blame_stage`：问题主要来自哪个阶段。
- `option_issue`：如果主要问题在选项，记录具体选项问题。
- `training_label_eligible`：是否适合进入后续训练级数据。
- `trust_diagnostics`：机器可信度诊断摘要，用来辅助定位问题，不等同于人工评分。
- `confidence_reasons`：机器认为该题低置信的原因。
- `source_reuse_count`：同一原文段落在本章前面已被多少题使用，用来发现“很多题共用同一大段来源”的问题。
- `source_minimality_score`：机器对“最小充分证据”的估计分，只用于辅助排序，不等同人工评分。
- `memory_angle`：题目认知动作，第一版固定为核心回忆、边界辨析、场景迁移。评分时不要只看题型，要看它是否真的完成了对应认知动作。
- `memory_angle_fit`：题目是否真的符合声明的 `memory_angle`。例如场景迁移题必须提供新场景，而不是原文换皮。
- `blueprint_alignment`：题目是否符合该知识点的练习蓝图。多题应形成“记住 -> 分清 -> 会用”的递进，而不是三道同质题。
- `cognitive_action_fit`：人工判断这道题是否完成对应认知动作。题型不重要，重要的是它是否真的让用户回忆核心、分清边界或迁移应用。
- `practice_progression`：同一知识点下多道题是否形成递进练习，而不是平行重复。
- `duplicate_practice`：同一知识点内是否重复考同一判断。重复高时即使来源支撑、答案唯一，也不应算高质量。
- `evidence_learning_value`：来源片段是否帮助用户回到原文关键节点理解答案，而不只是“能证明答案”。
- `is_duplicate_practice`：是否与同知识点其它题重复考同一判断。即使题型不同，只要认知动作重复也应标记。
- `misconception_realism`：常见误区是否来自真实混淆对象、错误选项或原文边界，而不是模型泛泛想象。
- `distractor_learning_value`：干扰项是否能帮助用户分清边界；明显凑数或一眼排除应低分。
- `blocking_reasons`：机器认为该题不可入池的原因。

## 可信度诊断口径

机器诊断会把题目拆成四个分数：

- `answerGroundingScore`：正确答案是否被来源上下文支撑。
- `explanationFaithfulnessScore`：解释是否忠实于来源和正确答案。
- `contextRelevanceScore`：来源片段是否有助于理解这道题。
- `misconceptionSupportScore`：常见误区是否来自题目和来源，而不是模型硬编。

`confidenceLevel=low` 不代表题目一定不可用，只表示需要优先人工检查。低置信题第一版仍可进入复习池，但用户侧不展示低置信标签。只有人工确认后的 `human_*` 字段才能作为正式统计或训练候选。

## 问题类型 Taxonomy

`primary_issue` 和 `secondary_issue` 使用以下固定值：

| 类型 | 说明 |
| --- | --- |
| `source_not_supporting` | 来源片段无法支撑正确答案或解释 |
| `answer_not_unique` | 存在多个合理答案 |
| `explanation_wrong` | 解释错误或误导 |
| `too_shallow` | 题目只考复述、关键词或常识 |
| `weak_distractors` | 干扰项凑数、一眼排除或无真实误解 |
| `knowledge_point_off_target` | 知识点偏题或来源无法支撑知识点 |
| `coverage_gap` | 核心知识点没有题，或文章主线覆盖不足 |
| `low_confidence_bad` | 低置信题误入池 |
| `source_context_bad` | 来源上下文过短、过长或定位不准 |
| `structure_invalid` | 选项数量、答案 ID、JSON 等结构错误 |
| `generation_failed` | 模型、解析、抓取或生成流程失败 |
| `other` | 其它问题，必须在 notes 说明 |

## AI 预标和人工确认

质量工作台会先写入 `ai_*` 预标字段，例如 `ai_status`、`ai_primary_issue`、`ai_source_support`、`ai_reason`。这些字段只用于预筛选和辅助审查，不能直接当作人工金标。

人工确认后写入对应人工字段，并设置：

- `human_verified=true`
- `review_decision=accepted_ai_label`：直接确认 AI 标注。
- `review_decision=edited`：人工修改后保存。

只有 `human_verified=true` 的题目可以进入正式人工统计或训练候选导出。

## 归因阶段

`blame_stage` 使用以下固定值：

| 类型 | 说明 |
| --- | --- |
| `knowledge_extraction` | 知识点抽取偏题、过碎或缺失 |
| `question_generation` | 出题本身质量不足 |
| `source_context_selection` | 来源上下文定位不准 |
| `quality_judge` | 质量审查误判 |
| `selection_policy` | 入池/低置信保留策略不合理 |
| `frontend_display` | 前端展示导致误解 |
| `none` | 暂无明显归因 |

## 选项问题

`option_issue` 使用以下固定值：

| 类型 | 说明 |
| --- | --- |
| `too_obvious` | 干扰项太容易排除 |
| `also_correct` | 干扰项也可能正确 |
| `irrelevant` | 干扰项无关或凑数 |
| `not_supported_by_source` | 选项内容无法被原文支撑 |
| `wording_ambiguous` | 选项措辞含糊 |
| `too_similar_to_correct` | 干扰项和正确项过于接近但无清晰边界 |
| `none` | 暂无明显选项问题 |

## 训练候选

`training_label_eligible` 使用以下固定值：

| 类型 | 说明 |
| --- | --- |
| `yes_positive` | 高质量正样本 |
| `yes_rewrite` | 适合做重写样本 |
| `yes_negative_pattern` | 适合沉淀为负例模式 |
| `yes_preference` | 适合做偏好对比 |
| `no_structural` | 结构错误，不适合训练 |
| `no_irrelevant` | 与来源无关，不适合训练 |
| `no_insufficient_source` | 来源证据不足，不适合训练 |
| `no_low_value` | 复习价值太低，不适合训练 |
| `no_uncertain` | 人工也不确定，暂不进入训练 |

## 严重问题

出现以下任一情况，`human_status` 应为 `reject`：

- 来源片段无法支持正确答案。
- 存在多个合理正确答案。
- 正确答案明显错误。
- 解释误导用户。
- 题目和来源内容无关。

## Prompt / 规则调整记录

| 问题类型 | 例子 | 调整建议 | 是否已处理 |
| --- | --- | --- | --- |
|  |  |  |  |
