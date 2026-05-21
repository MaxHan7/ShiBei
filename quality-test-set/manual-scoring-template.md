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
- `answer_uniqueness`：是否只有一个最合理答案。
- `understanding_depth`：是否考理解、边界、场景、迁移或误区。
- `clarity`：题干、选项、解释是否清楚。
- `distractor_quality`：错误选项是否合理但明确错误。
- `explanation_faithfulness`：正确理解、常见误区和解释是否忠实于原文与题目。
- `review_value`：这道题是否值得未来再次复习。
- `blame_stage`：问题主要来自哪个阶段。
- `option_issue`：如果主要问题在选项，记录具体选项问题。
- `training_label_eligible`：是否适合进入后续训练级数据。

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
