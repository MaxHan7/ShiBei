# DSPy Phase B DistractorQualityJudge Baseline: few-shot

Date: 2026-06-03T06:58:23.461690
Model: `deepseek/deepseek-chat`
Dataset: `quality-test-set/results/dspy/distractors/datasets/dspy-distractor-quality-judge-devtest.v1.jsonl`
Rows: 57

## Summary

- Label accuracy: 38.6%
- Issue exact accuracy: 15.8%
- Average metric score: 0.340
- High-risk errors: 25
- Invalid label outputs: 0

## By Source Phase

| Source phase | Rows | Label accuracy | Avg score |
| --- | ---: | ---: | ---: |
| `phase_a_hook` | 21 | 42.9% | 0.352 |
| `phase_b_non_hook_negative` | 18 | 33.3% | 0.278 |
| `phase_b_non_hook_positive` | 18 | 38.9% | 0.389 |

## Confusion Matrix

| Gold \ Pred | accept | fixable | reject | invalid |
| --- | ---: | ---: | ---: | ---: |
| accept | 12 | 0 | 22 | 0 |
| fixable | 2 | 0 | 8 | 0 |
| reject | 3 | 0 | 10 | 0 |

## High-Risk Errors

- `judge-positive-hook-q5-option-b-positive`: accept -> reject | candidate: 在Prompt中强调多次 | predicted issue: `too_obvious` | rationale: “在Prompt中强调多次”是一个过于明显无效的选项，用户很容易识别出它不是正确答案，无法起到有效的干扰作用。
- `judge-positive-hook-q5-option-c-positive`: accept -> reject | candidate: 手动格式化 | predicted issue: `too_obvious_low_value` | rationale: “手动格式化”是一个过于明显、缺乏迷惑性的错误选项，学生一眼就能看出它不是更好的解决方案，无法有效测试对 Hook 与 Prompt 本质区别的理解。
- `judge-positive-hook-q6-option-a-positive`: accept -> reject | candidate: Hook技术太复杂 | predicted issue: `too_extreme_low_value` | rationale: “Hook技术太复杂”是一个过于笼统且缺乏上下文关联的选项，与题干中“Demo阶段不引入Hook”的核心原因（快速试错、未进入强控制阶段）无关，无法帮助用户理解边界，属于低价值干扰项。
- `judge-positive-hook-q7-option-b-positive-revised`: accept -> reject | candidate: 只是想快速探索页面和交互 | predicted issue: `too_obvious` | rationale: 该选项“只是想快速探索页面和交互”与题干中“Vibe coding 的 Demo 流程”阶段高度一致，属于该阶段的典型特征，而非需要升级到引入 Hook 的触发条件。作为干扰项过于明显，无法有效测试用户对知识点的理解边界。
- `judge-positive-hook-q7-option-d-positive-revised`: accept -> reject | candidate: 希望让 AI 的回答风格更像自己 | predicted issue: `too_extreme_low_value` | rationale: 该干扰项“希望让 AI 的回答风格更像自己”与题干讨论的“从Vibe coding Demo升级到引入Hook”完全无关，属于不同维度的需求（风格定制 vs 确定性规则控制），无法有效测试用户对知识点的理解，价值过低。
- `judge-positive-hook-q8-option-a-positive`: accept -> reject | candidate: 继续手动检查 | predicted issue: `too_obvious_low_value` | rationale: “继续手动检查”是一个过于明显且低价值的错误选项，与正确选项“使用Hook自动执行检查和测试”形成极端对立，缺乏迷惑性，无法有效测试用户对Hook应用场景的理解。
- `phase-b-meta-ai-first-pm-q-1-option-c`: accept -> reject | candidate: PM岗位定义没有变化，只是数量减少 | predicted issue: `correct_equivalent_multiselect_risk` | rationale: 该候选干扰项“PM岗位定义没有变化，只是数量减少”与正确选项“PM岗位数量没有减少，但过去主要在团队间传递信息的岗位定义正在消失”在逻辑上构成互斥关系，但若考生误以为“定义没变、数量减少”也是合理理解，则可能产生多选风险。且该选项与原文核心观点（岗位数量未减少、定义已改变）完全相反，过于明显，不具备干扰价值。
- `phase-b-meta-ai-first-pm-q-1-option-d`: accept -> reject | candidate: PM岗位完全消失，被AI取代 | predicted issue: `too_extreme_low_value` | rationale: 该干扰项“PM岗位完全消失，被AI取代”过于极端且明显错误，与原文核心观点“岗位数量未减少”直接矛盾，缺乏迷惑性，无法有效测试学生对知识边界的理解。
- `phase-b-meta-ai-first-pm-q-3-option-a`: accept -> reject | candidate: 专门从事数据搬运的工程师 | predicted issue: `irrelevant_role` | rationale: 候选干扰项“专门从事数据搬运的工程师”与题干中“PM（产品经理）”角色不匹配，且“数据搬运”与原文“信息搬运者”概念不同，无法有效测试知识边界。
- `phase-b-meta-ai-first-pm-q-3-option-d`: accept -> reject | candidate: 负责搬运代码的程序员 | predicted issue: `irrelevant_to_context` | rationale: 候选干扰项“负责搬运代码的程序员”与题干中讨论的“PM”（产品经理）角色完全无关，且原文语境聚焦于信息搬运者（PM）而非程序员，因此该选项缺乏迷惑性和教育价值。
- `phase-b-meta-ai-first-pm-q-4-option-a`: accept -> reject | candidate: 产品领导者 | predicted issue: `too_obvious_wrong` | rationale: 该干扰项“产品领导者”与题干描述的“很少做产品决策”明显矛盾，考生很容易排除，无法起到有效的干扰作用。
- `phase-b-meta-ai-first-pm-q-4-option-c`: accept -> reject | candidate: AI专家 | predicted issue: `irrelevant_distractor` | rationale: “AI专家”与原文及知识点的核心概念“信息搬运者”完全无关，且题干描述的工作内容与AI专家角色不匹配，无法起到干扰作用。
- `phase-b-meta-ai-first-pm-q-4-option-d`: accept -> reject | candidate: 战略PM | predicted issue: `too_extreme_low_value` | rationale: “战略PM”与题干描述的“花80%时间做信息搬运工作”完全相反，作为干扰项过于明显，学生很容易排除，无法有效测试对“信息搬运者”概念的理解。
- `phase-b-meta-ai-first-pm-q-7-option-a`: accept -> reject | candidate: 工龄和经验 | predicted issue: `too_obvious` | rationale: “工龄和经验”与正确选项“判断力”差异过大，且原文明确否定工龄和经验作为核心付薪依据，该选项过于明显错误，无法有效干扰学习者。
- `phase-b-meta-ai-first-pm-q-7-option-c`: accept -> reject | candidate: 代码能力 | predicted issue: `too_obvious_irrelevant` | rationale: “代码能力”与原文核心论点“产品领导者因判断力被付薪”完全无关，且作为产品领导者的核心能力明显不匹配，干扰项过于明显，无法有效测试学习者对知识点的理解。
- `phase-b-meta-ai-first-pm-q-10-rewrite-3-1-option-c`: accept -> reject | candidate: 两者权重相同，需综合其他因素如薪资期望。 | predicted issue: `correct_equivalent_multiselect_risk` | rationale: 该干扰项“两者权重相同，需综合其他因素如薪资期望”实际上否定了题干核心观点“AI-first程度比大厂经历更重要”，与正确选项“优先考虑B”形成对立，但题干要求基于该观点选择，因此该选项在观点框架下等同于“不选B”，且可能被理解为“两者都行”，造成多选风险或逻辑矛盾，不适合作为干扰项。
- `phase-b-meta-ai-first-pm-q-10-rewrite-3-1-option-d`: accept -> reject | candidate: 都不合适，应寻找既有大厂经历又有AI-native项目的候选人。 | predicted issue: `too_extreme_low_value` | rationale: 该干扰项“都不合适，应寻找既有大厂经历又有AI-native项目的候选人”过于极端且回避了题干设定的二选一情境，与知识点的核心主张（AI-first程度更重要）无关，无法有效测试学习者对边界条件的理解，属于低价值干扰项。
- `phase-b-negative-meta-ai-first-pm-q-1-01`: reject -> accept | candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值 | predicted issue: `accepted_distractor` | rationale: 该干扰项与正确选项高度相似，但将“岗位定义正在消失”替换为“旧的信息传递型PM会失去价值”，语义上接近但略有偏差，属于合理的边界混淆，有助于学习者区分“岗位定义消失”与“岗位价值消失”的细微差别。
- `phase-b-negative-meta-ai-first-pm-q-3-04`: reject -> accept | candidate: 主要靠同步进度和转述材料工作的人 | predicted issue: `accepted_distractor` | rationale: 该选项与正确选项含义高度接近，但表述略有不同（“主要靠同步进度和转述材料工作的人”），在题干语境下同样指向缺乏独立判断的信息搬运者，属于合理的干扰项，有助于区分概念边界。
- `phase-b-negative-meta-ai-first-pm-q-3-06`: accept -> reject | candidate: 负责在团队之间搬运代码的程序员 | predicted issue: `irrelevant_to_claim` | rationale: 该干扰项“负责在团队之间搬运代码的程序员”与知识点的核心概念“信息搬运者”及题干中“PM”角色不匹配，题干明确问的是“哪类PM”，而干扰项描述的是程序员，与上下文无关，无法有效测试对知识点的理解。
- `phase-b-negative-meta-ai-first-pm-q-4-08`: accept -> reject | candidate: 产品决策者 | predicted issue: `too_obvious` | rationale: 该干扰项“产品决策者”与题干描述的“很少做产品决策”直接矛盾，过于明显，学生很容易排除，无法起到有效干扰作用。
- `phase-b-negative-meta-ai-first-pm-q-7-09`: reject -> accept | candidate: 产品取舍能力 | predicted issue: `accepted_distractor` | rationale: “产品取舍能力”与“判断力”高度相关，但并非原文直接表述的核心答案，作为干扰项具有合理的迷惑性，有助于学习者区分“判断力”这一精确概念。
- `phase-b-negative-meta-ai-first-pm-q-7-11`: accept -> reject | candidate: 工作年限 | predicted issue: `too_obvious_low_value` | rationale: “工作年限”与“工龄和经验”高度重复，且作为错误选项过于明显，无法有效测试学习者对“判断力”这一核心概念的理解边界。
- `phase-b-negative-meta-ai-first-pm-q-8-14`: accept -> reject | candidate: 更快地整理需求文档 | predicted issue: `too_obvious_low_value` | rationale: 该干扰项“更快地整理需求文档”与正确选项“判断力”相比过于明显错误，在AI时代背景下，整理需求文档显然不是最应重点提升的能力，无法有效迷惑学习者，属于低价值干扰项。
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15`: accept -> reject | candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活 | predicted issue: `too_obvious_low_value` | rationale: 该干扰项“因为他没有大厂经验，所以更灵活”过于简单化且与核心观点“AI-first程度比大厂经历更重要”关联弱，考生容易识别其逻辑缺陷，无法有效测试对知识点的理解边界。

## Wrong Predictions

- `judge-positive-hook-q5-option-b-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 在Prompt中强调多次; note: -
- `judge-positive-hook-q5-option-c-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 手动格式化; note: -
- `judge-positive-hook-q6-option-a-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: Hook技术太复杂; note: -
- `judge-positive-hook-q7-option-b-positive-revised` (phase_a_hook): gold `accept` / pred `reject`; candidate: 只是想快速探索页面和交互; note: -
- `judge-positive-hook-q7-option-d-positive-revised` (phase_a_hook): gold `accept` / pred `reject`; candidate: 希望让 AI 的回答风格更像自己; note: -
- `judge-positive-hook-q8-option-a-positive` (phase_a_hook): gold `accept` / pred `reject`; candidate: 继续手动检查; note: -
- `judge-negative-hook-q6-option-c-fixable` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 产品经理不了解AI; note: -
- `judge-negative-hook-q6-option-d-negative-r3` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 因为 CI 会自动处理 Demo 阶段的所有风险; note: -
- `judge-negative-hook-q7-option-c-negative-r2` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 追求代码质量; note: -
- `judge-negative-hook-q8-option-c-fixable` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 写更多的Prompt; note: -
- `judge-negative-hook-q8-option-d-fixable` (phase_a_hook): gold `fixable` / pred `reject`; candidate: 重新设计架构; note: -
- `judge-negative-hook-q13-option-b-fixable` (phase_a_hook): gold `fixable` / pred `accept`; candidate: 继续改进提示词; note: -
- `phase-b-meta-ai-first-pm-q-1-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: PM岗位定义没有变化，只是数量减少; note: -
- `phase-b-meta-ai-first-pm-q-1-option-d` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: PM岗位完全消失，被AI取代; note: -
- `phase-b-meta-ai-first-pm-q-3-option-a` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 专门从事数据搬运的工程师; note: 题干都说了是哪类PM，答案说某某工程师错的太明显
- `phase-b-meta-ai-first-pm-q-3-option-d` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 负责搬运代码的程序员; note: -
- `phase-b-meta-ai-first-pm-q-4-option-a` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 产品领导者; note: -
- `phase-b-meta-ai-first-pm-q-4-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: AI专家; note: -
- `phase-b-meta-ai-first-pm-q-4-option-d` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 战略PM; note: -
- `phase-b-meta-ai-first-pm-q-7-option-a` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 工龄和经验; note: -
- `phase-b-meta-ai-first-pm-q-7-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 代码能力; note: -
- `phase-b-meta-ai-first-pm-q-10-rewrite-3-1-option-c` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 两者权重相同，需综合其他因素如薪资期望。; note: -
- `phase-b-meta-ai-first-pm-q-10-rewrite-3-1-option-d` (phase_b_non_hook_positive): gold `accept` / pred `reject`; candidate: 都不合适，应寻找既有大厂经历又有AI-native项目的候选人。; note: -
- `phase-b-negative-meta-ai-first-pm-q-1-01` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: PM岗位还在，只是旧的信息传递型 PM 会失去价值; note: 这是一个正确答案，而非干扰项
- `phase-b-negative-meta-ai-first-pm-q-1-02` (phase_b_non_hook_negative): gold `fixable` / pred `reject`; candidate: 所有 PM 都会在一年内被 AI 淘汰; note: 过于明显的干扰项，干扰价值不大，极端化表达，一眼排除，不能帮助用户理解岗位定义变化。
- `phase-b-negative-meta-ai-first-pm-q-3-04` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 主要靠同步进度和转述材料工作的人; note: 这是正确答案的另一个表述，不是干扰项
- `phase-b-negative-meta-ai-first-pm-q-3-05` (phase_b_non_hook_negative): gold `fixable` / pred `accept`; candidate: 只会用 AI 复制粘贴材料的 PM; note: 语义表达不明，不知道要表达什么对应的误区
- `phase-b-negative-meta-ai-first-pm-q-3-06` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 负责在团队之间搬运代码的程序员; note: -
- `phase-b-negative-meta-ai-first-pm-q-4-08` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 产品决策者; note: -
- `phase-b-negative-meta-ai-first-pm-q-7-09` (phase_b_non_hook_negative): gold `reject` / pred `accept`; candidate: 产品取舍能力; note: 判断力在产品语境中的近义表达，容易成为第二正确答案。
- `phase-b-negative-meta-ai-first-pm-q-7-11` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 工作年限; note: -
- `phase-b-negative-meta-ai-first-pm-q-8-12` (phase_b_non_hook_negative): gold `fixable` / pred `reject`; candidate: 更熟练地写周报; note: 低价值流程项，一眼不是文章强调的能力。
- `phase-b-negative-meta-ai-first-pm-q-8-14` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 更快地整理需求文档; note: -
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-15` (phase_b_non_hook_negative): gold `accept` / pred `reject`; candidate: 优先考虑 B，因为他没有大厂经验，所以更灵活; note: -
- `phase-b-negative-meta-ai-first-pm-q-10-rewrite-3-1-17` (phase_b_non_hook_negative): gold `fixable` / pred `reject`; candidate: 优先考虑 B，因为小公司的人一定比大厂更先进; note: 错误较为明显没有对应常见误区，思考价值较低

## Interpretation Guide

- If few-shot improves non-Hook rows over zero-shot, Phase A examples transfer and we can consider BootstrapFewShot.
- If `reject -> accept` remains common, do not optimize yet; fix labels, metric, or task wording first.
- If `fixable` is unstable but `accept/reject` is stable, keep fixable as a softer review queue rather than a production blocking label.
