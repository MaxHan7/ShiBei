# DSPy Phase B DistractorQualityJudge Baseline: few-shot

Date: 2026-06-03T07:30:09.160415
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
Rows: 57

## Summary

- Label accuracy: 66.7%
- Issue exact accuracy: 33.3%
- Average metric score: 0.600
- Fixable recall: 20.0%
- Hard failures: 7
- Over-strict accept -> reject errors: 5
- Second-correct risk accepted: 4
- High-risk errors: 11
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 21 | 57.1% | 0.476 |
| `phase_b_non_hook_negative` | 18 | 55.6% | 0.456 |
| `phase_b_non_hook_positive` | 18 | 88.9% | 0.889 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 29 | 0 | 5 | 0 |
| fixable | 7 | 2 | 1 | 0 |
| reject | 6 | 0 | 7 | 0 |

## High-Risk Errors

- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_extreme_low_value` | rationale: “手动格式化”是一个过于极端且低价值的选项，它完全偏离了“自动化”这一核心对比维度，无法帮助学习者区分Hook与Prompt的本质区别，且与题干中“更好的解决方案”的自动化方向明显矛盾，不具备教学价值。
- `judge-positive-hook-q6-option-a-positive`: accept -> reject | candidate: Hook技术太复杂 | predicted issue: `too_extreme_low_value` | rationale: 该选项“Hook技术太复杂”过于笼统和极端，没有触及“Demo阶段控制需求不强”这一核心原因，也无法帮助用户区分真正的边界，学习价值低，不值得修复。
- `judge-negative-hook-q7-option-d-negative-r2`: reject -> accept | candidate: 认为 Prompt 已能稳定强制执行规则 | predicted issue: `accepted_distractor` | rationale: 该选项“认为 Prompt 已能稳定强制执行规则”与正确选项“开始反复出现格式化、测试或风险拦截这类确定性规则”含义不同，且不会造成多选风险。它属于同一知识点的常见误区（认为Vibe coding阶段已足够规范），能帮助学习者区分“感觉上稳定”与“实际需要Hook”的边界，学习价值中等，可直接使用。
- `judge-negative-hook-q13-option-d-negative`: reject -> accept | candidate: 责怪工程师 | predicted issue: `accepted_distractor` | rationale: 该选项明显错误（责怪工程师而非反思工程化控制），与正确选项在同一知识上下文内，且能帮助学习者区分“归因于人”与“补上工程直觉”的边界，学习价值高，可直接使用。
- `phase-b-meta-ai-first-pm-q-3-option-c`: accept -> reject | candidate: 使用AI工具搬运信息的PM | predicted issue: `correct_equivalent_multiselect_risk` | rationale: 该候选选项“使用AI工具搬运信息的PM”与正确选项“工作中主要是传递信息、缺乏独立判断的PM”在语义上高度重叠，因为使用AI工具搬运信息本质上也是缺乏独立判断的表现，容易让学习者误以为这是另一个正确答案，存在多选风险。且题干和原文强调的是“缺乏独立判断”而非“使用AI工具”，该选项混淆了核心边界，学习价值低，不值得修复。
- `phase-b-meta-ai-first-pm-q-7-option-c`: accept -> reject | candidate: 代码能力 | predicted issue: `too_extreme_low_value` | rationale: “代码能力”与原文核心观点（判断力）无关，且作为干扰项过于极端，学习者很容易排除，无法有效帮助区分边界，学习价值低。
- `phase-b-negative-meta-ai-first-pm-q-1-01`: reject -> accept | candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | predicted issue: `accepted_distractor` | rationale: 该候选选项“PM岗位还在，只是旧的信息传递型 PM 会失去价值”与正确选项语义一致，但表述更口语化，且明确指出了“旧的信息传递型PM会失去价值”，与原文核心观点吻合。它作为错误选项，能帮助学习者区分“岗位数量未减少”与“旧岗位定义消失”这两个关键点，具有较高的学习价值，且无多选风险，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-3-04`: reject -> accept | candidate: 主要靠同步进度和转述材料工作的人 | predicted issue: `accepted_distractor` | rationale: 该候选选项“主要靠同步进度和转述材料工作的人”与正确选项“工作中主要是传递信息、缺乏独立判断的PM”语义高度一致，都是描述缺乏独立判断、仅做信息传递的PM，属于同一知识点的有效干扰项，能帮助学习者区分“信息搬运者”的核心特征，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-7-09`: reject -> accept | candidate: 产品取舍能力 | predicted issue: `accepted_distractor` | rationale: 该选项“产品取舍能力”与正确答案“判断力”语义相近但不等同，属于判断力的具体体现之一，但并非原文直接强调的核心薪酬依据。作为干扰项，它能帮助学习者区分“具体能力”与“核心判断力”的边界，具有较高的学习价值，且无多选风险，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-7-10`: reject -> accept | candidate: 综合能力 | predicted issue: `accepted_distractor` | rationale: 该选项“综合能力”与正确答案“判断力”语义不同，不会造成多选风险；它属于同一知识点的常见误解（认为综合能力更重要），能帮助学习者区分“判断力”这一核心薪酬依据，具有中等学习价值，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15`: accept -> reject | candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活 | predicted issue: `too_extreme_low_value` | rationale: 该干扰项将“没有大厂经验”错误地等同于“更灵活”，逻辑牵强且偏离知识点的核心边界（AI-first程度 vs 大厂经历），学习价值低，不值得修复。

## Hard Failures

- `judge-negative-hook-q7-option-d-negative-r2`: gold `reject` / pred `accept` | candidate: 认为 Prompt 已能稳定强制执行规则 | reasons: accepted_reject_gold
- `judge-negative-hook-q13-option-d-negative`: gold `reject` / pred `accept` | candidate: 责怪工程师 | reasons: accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-1-01`: gold `reject` / pred `accept` | candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-3-04`: gold `reject` / pred `accept` | candidate: 主要靠同步进度和转述材料工作的人 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-4-08`: gold `accept` / pred `accept` | candidate: 产品决策者 | reasons: accepted_correct_equivalent_or_multiselect_risk
- `phase-b-negative-meta-ai-first-pm-q-7-09`: gold `reject` / pred `accept` | candidate: 产品取舍能力 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-7-10`: gold `reject` / pred `accept` | candidate: 综合能力 | reasons: accepted_reject_gold

## Over-Strict Errors

- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_extreme_low_value`
- `judge-positive-hook-q6-option-a-positive`: accept -> reject | candidate: Hook技术太复杂 | predicted issue: `too_extreme_low_value`
- `phase-b-meta-ai-first-pm-q-3-option-c`: accept -> reject | candidate: 使用AI工具搬运信息的PM | predicted issue: `correct_equivalent_multiselect_risk`
- `phase-b-meta-ai-first-pm-q-7-option-c`: accept -> reject | candidate: 代码能力 | predicted issue: `too_extreme_low_value`
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15`: accept -> reject | candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活 | predicted issue: `too_extreme_low_value`

## Second-Correct Risk Accepted

- `phase-b-negative-meta-ai-first-pm-q-1-01`: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 该候选选项“PM岗位还在，只是旧的信息传递型 PM 会失去价值”与正确选项语义一致，但表述更口语化，且明确指出了“旧的信息传递型PM会失去价值”，与原文核心观点吻合。它作为错误选项，能帮助学习者区分“岗位数量未减少”与“旧岗位定义消失”这两个关键点，具有较高的学习价值，且无多选风险，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-3-04`: 主要靠同步进度和转述材料工作的人 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 该候选选项“主要靠同步进度和转述材料工作的人”与正确选项“工作中主要是传递信息、缺乏独立判断的PM”语义高度一致，都是描述缺乏独立判断、仅做信息传递的PM，属于同一知识点的有效干扰项，能帮助学习者区分“信息搬运者”的核心特征，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-4-08`: 产品决策者 | gold issue: `correct_boundary_confusion` | rationale: 该选项“产品决策者”与题干描述（花80%时间做机械性信息工作、很少做产品决策）明显相反，属于清晰的反面干扰项，能帮助学习者区分“信息搬运者”与“产品决策者”的本质差异，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-7-09`: 产品取舍能力 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 该选项“产品取舍能力”与正确答案“判断力”语义相近但不等同，属于判断力的具体体现之一，但并非原文直接强调的核心薪酬依据。作为干扰项，它能帮助学习者区分“具体能力”与“核心判断力”的边界，具有较高的学习价值，且无多选风险，可直接使用。

## Wrong Predictions

- `judge-positive-hook-q5-option-c-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 手动格式化; note: -
- `judge-positive-hook-q6-option-a-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: Hook技术太复杂; note: -
- `judge-negative-hook-q6-option-c-fixable` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 产品经理不了解AI; note: -
- `judge-negative-hook-q6-option-d-negative-r3` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 因为 CI 会自动处理 Demo 阶段的所有风险; note: -
- `judge-negative-hook-q7-option-d-negative-r2` (phase_a_hook): gold `reject` / pred `accept`; candidate: 认为 Prompt 已能稳定强制执行规则; note: -
- `judge-negative-hook-q8-option-c-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 写更多的Prompt; note: -
- `judge-negative-hook-q8-option-d-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 重新设计架构; note: -
- `judge-negative-hook-q13-option-b-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 继续改进提示词; note: -
- `judge-negative-hook-q13-option-d-negative` (phase_a_hook): gold `reject` / pred `accept`; candidate: 责怪工程师; note: -
- `phase-b-meta-ai-first-pm-q-3-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 使用AI工具搬运信息的PM; note: -
- `phase-b-meta-ai-first-pm-q-7-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 代码能力; note: -
- `phase-b-negative-meta-ai-first-pm-q-1-01` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值; note: 这是一个正确答案，而非干扰项
- `phase-b-negative-meta-ai-first-pm-q-1-02` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 所有 PM 都会在一年内被 AI 淘汰; note: 过于明显的干扰项，干扰价值不大，极端化表达，一眼排除，不能帮助用户理解岗位定义变化。
- `phase-b-negative-meta-ai-first-pm-q-3-04` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 主要靠同步进度和转述材料工作的人; note: 这是正确答案的另一个表述，不是干扰项
- `phase-b-negative-meta-ai-first-pm-q-3-05` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 只会用 AI 复制粘贴材料的 PM; note: 语义表达不明，不知道要表达什么对应的误区
- `phase-b-negative-meta-ai-first-pm-q-7-09` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 产品取舍能力; note: 判断力在产品语境中的近义表达，容易成为第二正确答案。
- `phase-b-negative-meta-ai-first-pm-q-7-10` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 综合能力; note: 过泛，没有对应出要考察的常见误区
- `phase-b-negative-meta-ai-first-pm-q-8-12` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 更熟练地写周报; note: 低价值流程项，一眼不是文章强调的能力。
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活; note: -

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot and hard failures decline, Phase A examples transfer.
- If `reject -> accept` or second-correct risk remains common, do not optimize yet; fix task wording or metric first.
- If `fixable` recall remains near zero, keep fixable as a softer review queue and refine label examples before optimizer.
