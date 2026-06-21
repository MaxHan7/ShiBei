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

## 失败类型

| code | 含义 | 典型表现 | 默认处理 |
| --- | --- | --- | --- |
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
