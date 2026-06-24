# 拾贝 V2 LLM Runtime 稳定性契约

更新时间：2026-06-21

## 目标

这份文档只处理 **LLM stage 的运行稳定性**，不处理题目质量审查。

当前 V2 主链路已经采用：

- ECD 作为学习证据设计原则。
- DSPy-style LM Program 作为工程框架：signature / module / metric / adapter。
- compact source window，避免每个 stage 都吃全文。
- 默认停用模型型 `qualityJudge`，只保留 deterministic diagnostics。

本契约补上的，是 adapter/runtime 层：

> 当某个 stage 没有返回结构化文本、JSON 解析失败、schema validation 失败或超时时，系统应该如何分类、记录、重试和报告。

## 不做什么

- 不用 runtime retry 静默修复题目质量。
- 不把 `qualityJudge` 重新接回默认主链路。
- 不因为一次 structured output 失败就增加大量 prompt 规则。
- 不把完整 ECD 思考链重新写成大 JSON。

## 输入保护

V2 MVP 阶段先用明确的文章长度上限保护 token 成本和稳定性：

- 默认 `V2_MAX_ARTICLE_CHARS = 6000`。
- 后端在进入模型 pipeline 前检查 `rawText/cleanedText`。
- 超过上限直接返回 `input_too_long`，不调用模型，不进入 retry。
- 用户可见文案：`这篇文章目前太长，建议控制在 6000 字以内。`

这不是长期长文方案。后续如果要支持论文或长报告，需要单独设计 chunking / hierarchical summarization，不在 MVP 生成链路里隐式消化超长文章。

## 前端进度合同

V2 前端不直接消费内部 prompt stage。后端通过 `generationProgress` 暴露产品级阶段：

- `accepted`
- `extracting_source`
- `planning_review_path`
- `mapping_knowledge`
- `planning_practice`
- `generating_questions`
- `generating_unit_copy`
- `finalizing`
- `completed`
- `failed`

每个阶段包含：

- `status`
- `stage`
- `displayText`
- `progress`
- `retryCount`
- `canRetry`
- `failureCode/failureMessage`

`progress` 只是粗略 UI 进度，不承诺真实剩余时间。

## 持久化与幂等提交

V2 生成任务采用“job queue + 幂等 key + worker lock”的成熟后台任务模型。它参考的行业共识包括：

- API producer 侧使用 idempotency key，避免网络重试或用户重复点击造成重复任务。
- Queue consumer 侧假设任务可能被重复投递，handler 必须能安全重入。
- 使用 visibility timeout / lock timeout，worker 崩溃后任务可以重新变为可处理。
- 使用有限 `maxAttempts`，超过上限进入 failed / dead-letter 等待人工或用户重试，不无限循环。

当前 V2 落地方式：

- `generation_jobs.idempotency_key` 保存请求幂等键。
- `generation_jobs_pending_idempotency_uidx` 保证同一 device 下同一 pending key 只能有一个 queued/running job。
- `enqueueIdempotentGenerationJob()` 先查 pending job；并发 race 时依赖数据库唯一索引兜底，再回查已存在 job。
- 幂等 key 建议由 `deviceId + jobType + sourceUrl/contentHash` 构造；如果前端能提供 `clientRequestId`，优先使用它。
- `claimNextGenerationJob()` 已使用 `FOR UPDATE SKIP LOCKED` 和 `locked_until`，相当于本地实现的 visibility timeout。
- `attempt_count/max_attempts` 继续作为 poison message / failed 终态的基础。

这一步只解决“重复提交和任务恢复”的基础设施，不改变题目质量链路。

## 失败类型

| code | 含义 | 典型表现 | 默认处理 |
| --- | --- | --- | --- |
| `input_too_long` | 输入超过 MVP 长度上限 | 正文超过 6000 字 | 不调用模型，直接失败 |
| `empty_structured_text` | provider 没返回可解析内容 | DeepSeek 返回空 `content` | retry |
| `json_parse_error` | 返回了文本，但不是合法 JSON | 多余文字、截断、破损 JSON | retry |
| `schema_validation_error` | JSON 可解析，但不符合 stage schema | 缺字段、枚举不合法 | 当前不自动修复，按 stage 失败 |
| `timeout` | provider 调用超时 | 请求超过 `MODEL_REQUEST_TIMEOUT_MS` | retry 或任务失败 |
| `provider_error` | provider/API 层失败 | rate limit、quota、API key、HTTP error | 视错误类型重试或失败 |
| `unknown` | 未分类错误 | 其他异常 | 记录并失败 |

## Stage 默认策略

| stage | 失败影响 | 当前策略 | 下一步可优化 |
| --- | --- | --- | --- |
| `sourceMap` | 影响全篇 source anchors | 失败则整章失败 | 生产期可优先 deterministic sourceMap |
| `reviewPathPlan` | 影响 unit 边界与章节概要 | 失败则整章失败 | 可加一次 smaller article outline retry |
| `unitKnowledgeMap` | 影响小知识点 inventory | 失败则整章失败 | 可只传 plan source union window |
| `ecdPlanning` | 影响某个 unit 的题目计划 | 当前 retry 后失败则整章失败 | 下一步改成 per-unit retry isolation |
| `multipleChoiceDraft` | 影响某个 unit 的选择题 | retry 后失败则整章失败 | 可只失败当前 unit 或当前 task |
| `matchingDraft` | 影响某个 unit 的连线题 | retry 后失败则整章失败 | 可 fallback 到选择题或跳过 matching |
| `unitSummaryDraft` | 影响单元开场/总结 | retry 后失败则整章失败 | 可用 deterministic fallback 文案 |

## 运行时记录

每次模型调用 attempt 都应该记录：

- `callId`
- `stage`
- `modelStage`
- `attempt`
- `maxAttempts`
- `status`
- `durationMs`
- `retryable`
- `errorType`
- `errorMessage`

成功报告和失败报告都应该能看到：

- 总调用数
- 总 attempt 数
- failed attempt 数
- retry attempt 数
- 每个 stage 的 call / success / failed / retry / error type

## 和题目质量的边界

Runtime reliability 只回答：

- 模型有没有稳定返回结构化数据？
- 哪个 stage 最容易失败？
- 是否是 provider 空返回、JSON 破损、schema 不合格，还是 timeout？

它不回答：

- 这道题有没有教学价值？
- 干扰项是不是好？
- 连线题是不是高价值？
- explanation 是否符合产品口吻？

这些仍然属于 deterministic diagnostics、人工质量报告、未来可选的 per-question quality repair 实验。

## 下一步 checkpoint

1. 已完成：stage runtime recorder 与 HTML 报告展示。
2. 下一步：对 `ecdPlanning` 做 per-unit retry isolation。
3. 下一步：为 `empty_structured_text` 增加 stage-specific recovery retry。
4. 下一步：跑同一篇黄金文章，比较 structured-output failure 是否下降。
5. 通过 3-5 篇文章后，再把这套框架沉淀成正式 Codex skill。

## 2026-06-23：稳定性优先轨道

当前 V2 题目质量已经回到可接受区间，但运行稳定性仍未达生产级。下一轮必须先单独修 Track A，不和情境题、干扰项质量、题型策略一起改。

Track A 要回答三个问题：

- token 爆炸主要来自 retry 次数，还是单次 stage 输入/输出本身过重？
- JSON 不稳定主要集中在哪个 stage：`reviewPathPlan`、`unitKnowledgeMap`，还是后续 draft stage？
- 哪些字段只是调试或中间思考，不应该继续作为全量 JSON 输出？

Track A 的第一轮通过线：

- 同一篇黄金文章可以完整生成。
- `runtimeFailedAttemptCount <= 1`。
- `runtimeRetryAttemptCount <= 1`。
- HTML report 能按 stage 展示 token、attempt、失败类型。
- 总 token 低于最近的约 `120k` 回归运行，或能明确证明成本主要来自 retry 而不是架构本身。
- 不降低 unit 覆盖，DMC 这类独立知识对象不能重新被合并丢失。

本轮禁止：

- 不加入情境题规则。
- 不重新启用模型型 `qualityJudge` 阻断。
- 不把 ECD 重写成新的大 JSON 字段。
- 不通过继续加“必须输出合法 JSON”这类 prompt 补丁解决 runtime 问题。
