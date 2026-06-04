# DSPy Phase B DistractorQualityJudge Baseline v3: few-shot

Date: 2026-06-03T18:02:19.630406
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v2.jsonl`
Rows: 57

## Summary

- Label accuracy: 66.7%
- Issue exact accuracy: 35.1%
- Average metric score: 0.604
- Fixable recall: 10.0%
- Hard failures: 8
- Over-strict accept -> reject errors: 2
- Second-correct risk accepted: 4
- Self-reported second-correct relation accepted: 0
- High-risk errors: 9
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 21 | 52.4% | 0.438 |
| `phase_b_non_hook_negative` | 18 | 55.6% | 0.456 |
| `phase_b_non_hook_positive` | 18 | 94.4% | 0.944 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 31 | 1 | 2 | 0 |
| fixable | 7 | 1 | 2 | 0 |
| reject | 7 | 0 | 6 | 0 |

## Candidate Answer Relation

| Gold label | same_meaning | near_correct_boundary | different_but_same_context | unrelated | invalid |
| --- | ---: | ---: | ---: | ---: | ---: |
| accept | 0 | 0 | 34 | 0 | 0 |
| fixable | 0 | 0 | 10 | 0 | 0 |
| reject | 1 | 0 | 12 | 0 | 0 |

## High-Risk Errors

- `judge-positive-hook-q6-option-a-positive`: accept -> reject | candidate: Hook技术太复杂 | predicted issue: `too_extreme_low_value` | rationale: 该候选选项“Hook技术太复杂”过于笼统且极端，没有触及Demo阶段忽略Hook的核心原因（控制需求不强），也无法帮助学习者区分真正的边界，学习价值低，不值得修复。
- `judge-negative-hook-q6-option-d-negative-r1`: reject -> accept | candidate: Hook无法用于演示 | predicted issue: `accepted_distractor` | rationale: 该选项明显错误（Hook不会让Demo完全失去快速迭代优势），但属于同一知识上下文，且能帮助学习者区分“Hook影响迭代”与“Demo阶段不需要强控制”的边界，学习价值高，可直接使用。
- `judge-negative-hook-q7-option-d-negative-r2`: reject -> accept | candidate: 认为 Prompt 已能稳定强制执行规则 | predicted issue: `accepted_distractor` | rationale: 该选项与正确选项同属“何时引入Hook”的上下文，但表达的是错误认知（认为Prompt已能稳定执行规则），正好对应常见误区“认为vibe coding也注重规范化”，能帮助学习者区分“确定性规则出现”与“误以为Prompt已足够”的边界，学习价值高，可直接使用。
- `judge-negative-hook-q13-option-d-negative`: reject -> accept | candidate: 责怪工程师 | predicted issue: `accepted_distractor` | rationale: 该选项明显错误（责怪工程师而非解决问题），但属于同一场景下的典型错误行为，能帮助学习者区分正确做法（补工程直觉）与错误归因，具有高学习价值。
- `phase-b-meta-ai-first-pm-q-4-option-c`: accept -> reject | candidate: AI专家 | predicted issue: `too_extreme_low_value` | rationale: 候选选项“AI专家”与题干描述的“花80%时间做机械性信息工作”毫无关联，属于脱离原文语境的极端选项，无法帮助学习者区分“信息搬运者”与“产品领导者”等核心边界，学习价值低，不值得修复。
- `phase-b-negative-meta-ai-first-pm-q-1-01`: reject -> accept | candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | predicted issue: `accepted_distractor` | rationale: 该选项明确错误（岗位数量未减少，只是旧定义消失），但处于同一知识语境，且能帮助学习者区分“岗位数量不变”与“旧定义消失”的边界，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-3-04`: reject -> accept | candidate: 主要靠同步进度和转述材料工作的人 | predicted issue: `accepted_distractor` | rationale: 该候选选项“主要靠同步进度和转述材料工作的人”与正确答案“工作中主要是传递信息、缺乏独立判断的PM”语义高度一致，但表述略有不同，属于同一概念的不同表达方式。它明确指向了信息搬运者的核心特征（缺乏独立判断、仅做信息传递），且与题干和知识点的核心主张（信息搬运者将被淘汰）紧密相关。该选项作为干扰项，能有效帮助学习者区分“信息搬运者”与“使用AI工具”或“数据搬运”等常见误解，具有较高的学习价值。因此，该选项可直接接受。
- `phase-b-negative-meta-ai-first-pm-q-7-09`: reject -> accept | candidate: 产品取舍能力 | predicted issue: `accepted_distractor` | rationale: 候选选项“产品取舍能力”与正确选项“判断力”不同，但属于同一知识领域（产品领导力）。它虽然接近判断力的一个方面，但并非原文强调的核心薪酬依据，因此是一个明显的错误选项。该选项有助于学习者区分“判断力”与“取舍能力”的边界，具有较高的学习价值，且无需修改即可使用。
- `phase-b-negative-meta-ai-first-pm-q-7-10`: reject -> accept | candidate: 综合能力 | predicted issue: `accepted_distractor` | rationale: “综合能力”是一个常见的模糊概念，容易与“判断力”混淆，但原文明确强调判断力是核心薪酬依据。该选项明显错误且在同一语境中，能帮助学习者区分“综合能力”与“判断力”的边界，具有高学习价值，可直接使用。

## Hard Failures

- `judge-negative-hook-q6-option-d-negative-r1`: gold `reject` / pred `accept` | candidate: Hook无法用于演示 | reasons: accepted_reject_gold
- `judge-negative-hook-q7-option-d-negative-r2`: gold `reject` / pred `accept` | candidate: 认为 Prompt 已能稳定强制执行规则 | reasons: accepted_reject_gold
- `judge-negative-hook-q13-option-d-negative`: gold `reject` / pred `accept` | candidate: 责怪工程师 | reasons: accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-1-01`: gold `reject` / pred `accept` | candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-3-04`: gold `reject` / pred `accept` | candidate: 主要靠同步进度和转述材料工作的人 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-4-08`: gold `accept` / pred `accept` | candidate: 产品决策者 | reasons: accepted_correct_equivalent_or_multiselect_risk
- `phase-b-negative-meta-ai-first-pm-q-7-09`: gold `reject` / pred `accept` | candidate: 产品取舍能力 | reasons: accepted_correct_equivalent_or_multiselect_risk, accepted_reject_gold
- `phase-b-negative-meta-ai-first-pm-q-7-10`: gold `reject` / pred `accept` | candidate: 综合能力 | reasons: accepted_reject_gold

## Over-Strict Errors

- `judge-positive-hook-q6-option-a-positive`: accept -> reject | candidate: Hook技术太复杂 | predicted issue: `too_extreme_low_value`
- `phase-b-meta-ai-first-pm-q-4-option-c`: accept -> reject | candidate: AI专家 | predicted issue: `too_extreme_low_value`

## Second-Correct Risk Accepted

- `phase-b-negative-meta-ai-first-pm-q-1-01`: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 该选项明确错误（岗位数量未减少，只是旧定义消失），但处于同一知识语境，且能帮助学习者区分“岗位数量不变”与“旧定义消失”的边界，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-3-04`: 主要靠同步进度和转述材料工作的人 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 该候选选项“主要靠同步进度和转述材料工作的人”与正确答案“工作中主要是传递信息、缺乏独立判断的PM”语义高度一致，但表述略有不同，属于同一概念的不同表达方式。它明确指向了信息搬运者的核心特征（缺乏独立判断、仅做信息传递），且与题干和知识点的核心主张（信息搬运者将被淘汰）紧密相关。该选项作为干扰项，能有效帮助学习者区分“信息搬运者”与“使用AI工具”或“数据搬运”等常见误解，具有较高的学习价值。因此，该选项可直接接受。
- `phase-b-negative-meta-ai-first-pm-q-4-08`: 产品决策者 | gold issue: `correct_boundary_confusion` | rationale: 候选选项“产品决策者”与正确答案“信息搬运者”含义相反，属于同一话题下的明显错误选项。它帮助学习者区分“做决策”与“搬运信息”的本质差异，学习价值高，可直接使用。
- `phase-b-negative-meta-ai-first-pm-q-7-09`: 产品取舍能力 | gold issue: `correct_equivalent_multiselect_risk` | rationale: 候选选项“产品取舍能力”与正确选项“判断力”不同，但属于同一知识领域（产品领导力）。它虽然接近判断力的一个方面，但并非原文强调的核心薪酬依据，因此是一个明显的错误选项。该选项有助于学习者区分“判断力”与“取舍能力”的边界，具有较高的学习价值，且无需修改即可使用。

## Self-Reported Second-Correct Relation Accepted

- None.

## Wrong Predictions

- `judge-positive-hook-q6-option-a-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: Hook技术太复杂; note: -
- `judge-negative-hook-q6-option-c-fixable` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 产品经理不了解AI; note: -
- `judge-negative-hook-q6-option-d-negative-r1` (phase_a_hook): gold `reject` / pred `accept`; candidate: Hook无法用于演示; note: -
- `judge-negative-hook-q6-option-d-negative-r3` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 因为 CI 会自动处理 Demo 阶段的所有风险; note: -
- `judge-negative-hook-q7-option-c-negative-r2` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 追求代码质量; note: -
- `judge-negative-hook-q7-option-d-negative-r2` (phase_a_hook): gold `reject` / pred `accept`; candidate: 认为 Prompt 已能稳定强制执行规则; note: -
- `judge-negative-hook-q8-option-c-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 写更多的Prompt; note: -
- `judge-negative-hook-q8-option-d-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 重新设计架构; note: -
- `judge-negative-hook-q13-option-b-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 继续改进提示词; note: -
- `judge-negative-hook-q13-option-d-negative` (phase_a_hook): gold `reject` / pred `accept`; candidate: 责怪工程师; note: -
- `phase-b-meta-ai-first-pm-q-4-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: AI专家; note: -
- `phase-b-negative-meta-ai-first-pm-q-1-01` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值; note: 这是一个正确答案，而非干扰项
- `phase-b-negative-meta-ai-first-pm-q-1-02` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 所有 PM 都会在一年内被 AI 淘汰; note: 过于明显的干扰项，干扰价值不大，极端化表达，一眼排除，不能帮助用户理解岗位定义变化。
- `phase-b-negative-meta-ai-first-pm-q-3-04` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 主要靠同步进度和转述材料工作的人; note: 这是正确答案的另一个表述，不是干扰项
- `phase-b-negative-meta-ai-first-pm-q-3-05` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 只会用 AI 复制粘贴材料的 PM; note: 语义表达不明，不知道要表达什么对应的误区
- `phase-b-negative-meta-ai-first-pm-q-7-09` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 产品取舍能力; note: 判断力在产品语境中的近义表达，容易成为第二正确答案。
- `phase-b-negative-meta-ai-first-pm-q-7-10` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 综合能力; note: 过泛，没有对应出要考察的常见误区
- `phase-b-negative-meta-ai-first-pm-q-8-12` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 更熟练地写周报; note: 低价值流程项，一眼不是文章强调的能力。
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15` (phase_b_non_hook_negative): gold `accept` / pred `fixable`; candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活; note: -

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot and hard failures decline, Phase A examples transfer.
- If `reject -> accept` or second-correct risk remains common, do not optimize yet; fix task wording or metric first.
- If `fixable` recall remains near zero, keep fixable as a softer review queue and refine label examples before optimizer.
