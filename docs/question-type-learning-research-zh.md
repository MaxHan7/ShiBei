# 题型选择与学习效果调研封存

日期：2026-06-04

## 目的

本轮调研用于回答一个产品问题：

> 拾贝在把文章知识点转成复习题时，什么样的知识点或学习目标适合什么题型？

这份文档不是生产 prompt，也不是硬规则清单。它用于封存当前讨论和研究依据，后续讨论题型选择、多题多样性、prompt 或选择器时，应先回到这里确认方向。

## 当前共识

题型不是目标，题型是认知动作的载体。

拾贝真正要优化的是用户能不能：

- 快速进入题目要考察的核心知识点。
- 取回文章核心判断。
- 分清边界、误区和相邻概念。
- 把文章里的方法、原则或判断迁移到新场景。

所以不能机械追求“每个知识点必须有选择题、判断题、场景题”。更合理的顺序是：

1. 先判断这个知识点最值得训练的认知动作。
2. 再选择最自然、最轻量、最能承载该动作的题型。
3. 如果题型不同但实际考同一个判断，应视为重复。
4. 如果题型相同但完成不同认知动作，可以接受。

## 研究参考

### 1. Retrieval practice：题目本身能促进记忆

检索练习研究认为，主动回忆和测试能提升长期保持。题型不是唯一关键，关键是用户是否真的进行了检索和判断。

参考：

- Butler & Roediger, 2007, *Testing improves long-term retention in a simulated classroom setting*：测试活动能提升长期保持，研究中比较了选择题和简答等形式。  
  https://psychnet.wustl.edu/memory/wp-content/uploads/2018/04/Butler-Roediger-2007_EJCP.pdf
- Yang et al., 2021, *Retrieval Practice Consistently Benefits Student Learning: a Systematic Review*。  
  https://link.springer.com/article/10.1007/s10648-021-09595-9

对拾贝的指引：

- 不要只把题当成“检测工具”，题目本身就是学习动作。
- 题型选择应服务于“用户此刻要检索什么”。
- 题目不能太重，否则用户会把认知资源花在读题，而不是取回知识。

### 2. 选择题：适合核心理解、概念区分、相邻边界

高质量选择题并不只是低阶记忆。如果错误选项设计得合理，选择题可以让用户同时处理“为什么这个对”和“为什么其它不对”。

参考：

- Little, Bjork, Bjork & Angello, 2012, *Multiple-Choice Tests Exonerated, at Least of Some Charges*。  
  https://journals.sagepub.com/doi/10.1177/0956797612443370
- Little et al. 相关研究指出，有竞争力的错误选项可以促进对相关但不同问题的学习。  
  https://bjorklab.psych.ucla.edu/wp-content/uploads/sites/13/2016/07/Little_EBjork_RBjork_Angello_2012.pdf

对拾贝的指引：

- 选择题适合概念、本质定义、机制对比、工具分工和相邻概念区分。
- Hook / Prompt / CI / CLAUDE.md 这类工具边界题，不一定适合简单判断题，常常更适合选择题或场景选择题。
- 选择题质量不取决于“看起来难”，而取决于选项组是否形成合理判断空间。

### 3. 判断题 / true-false：适合快速边界确认，但承载能力有限

判断题的优势是轻、快、适合确认一个说法是否成立。但单个二元判断容易猜中，也容易把复杂理解压成过浅判断。

多项 true-false 研究显示，它更能暴露混合理解和部分理解；普通单选题可能高估用户掌握程度。

参考：

- Couch et al., 2018, *Multiple-True-False Questions Reveal the Limits of the Multiple-Choice Format for Detecting Students with Incomplete Understandings*。  
  https://academic.oup.com/bioscience/article/68/6/455/4995444
- 同文开放页面：  
  https://digitalcommons.unl.edu/bioscifacpub/685/

对拾贝的指引：

- 判断题适合非常清楚的二元边界：是否成立、是否过度推广、是否把条件扩大。
- 判断题不应默认承载所有“边界辨析”。
- 如果边界涉及多个工具、多个角色、多个行动方案，选择题或场景判断题通常更自然。

### 4. 场景判断题：适合迁移、应用、工具选择、时机判断

Case-based learning / scenario-based learning 强调在具体情境中进行判断、推理和应用。场景题适合训练用户把知识迁移到新场景。

参考：

- Loffler-Stastka et al., 2016, *Case-based learning and multiple choice questioning methods favored by students*。  
  https://bmcmededuc.biomedcentral.com/articles/10.1186/s12909-016-0564-x
- Case-based learning 对程序性知识迁移和实践能力的研究：  
  https://bmcmededuc.biomedcentral.com/articles/10.1186/s12909-019-1884-4
- Case-based learning 中教师问题与学生回应的研究，强调通过问题推动推理和判断。  
  https://bmcmededuc.biomedcentral.com/articles/10.1186/s12909-019-1895-1

对拾贝的指引：

- 场景判断题适合方法型、使用时机型、行动选择型、工具分工型知识点。
- 场景题应是微场景：一个角色、一个冲突或一个决策点。
- 场景题不能变成完整案例分析，也不能只是把原文换壳。

### 5. Bloom taxonomy：可作为认知层级参考，但不能照搬

Bloom taxonomy 能帮助区分理解、应用、分析等层级。相关研究也表明，选择题可以设计为高阶问题，不必只考记忆。

参考：

- *Incorporation of Bloom's Taxonomy into Multiple-Choice Examination Questions for a Pharmacotherapeutics Course*。  
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3425929/

对拾贝的指引：

- 可参考 Bloom 的层级意识，但不要把整套 taxonomy 搬进 prompt。
- 拾贝当前更适合保留三类轻量认知动作：
  - 核心理解：理解文章核心判断。
  - 边界辨析：分清误区、边界、相邻概念。
  - 场景迁移：把判断应用到新情境。

## 题型选择初步映射

| 学习目标 / 知识点特征 | 更适合题型 | 原因 |
| --- | --- | --- |
| 概念、本质定义、核心主张 | 选择题 | 从相邻说法中识别本质，适合快速取回核心理解 |
| 机制对比、工具分工、职责边界 | 选择题或场景判断题 | 需要区分多个相邻机制，不一定适合二元判断 |
| 单一命题是否成立、是否过度推广 | 判断题 | 适合轻量确认清楚边界 |
| 方法步骤、使用时机、行动选择 | 场景判断题 | 训练用户迁移到具体场景做决策 |
| 复杂真实决策 | 微场景判断题 | 保留一个关键冲突或决策点，避免完整案例分析 |

## 对当前系统的审查

### 已经对齐的部分

- 当前 PRD 已经明确：题型服务认知动作，不机械追求题型多样。
- 当前 prompt 支持三类题型：
  - `multiple_choice`
  - `true_false`
  - `scenario_judgment`
- 当前 `practiceBlueprint` 已有三类认知动作：
  - `core_understanding`
  - `misconception_boundary`
  - `scenario_application`
- 当前选择器已经不把题型 mismatch 当作核心质量失败，只保留为诊断。

### 仍需讨论和优化的部分

1. `misconception_boundary -> true_false` 可能过窄。

   边界辨析不一定适合判断题。工具分工、机制对比、职责边界类知识点，常常更适合选择题或场景判断题。

2. 当前题型推荐仍偏规则关键词。

   `expectedQuestionType(point)` 主要依赖 `knowledgeType`、`questionAngles` 和关键词。它还没有显式理解：

   - 工具分工。
   - 机制对比。
   - 使用时机。
   - 错误方案诊断。
   - 原因归因。

3. 当前 prompt 只定义题型格式，没有说明“什么情况更适合什么题型”。

   这可能导致模型虽然知道题型长什么样，却不知道为什么选这个题型。

4. 不应把题型适配写成硬规则。

   PRD 已经明确：如果另一种题型更自然、更能完成当前认知动作，也可以进入复习池。因此下一步只能做轻量引导，不能让题型规则再次抢夺模型注意力。

## 当前模型迭代状态

截至本轮封存，已经完成并上线：

- v26 字段标准 prompt 基线。
- 后半段 judge / selection 按新字段标准对齐。
- 生产部署提交：`12b0897 feat: align question judge with field standards`。
- 生产 health 已确认重启到新服务。

最新 AAA control 显示：

- 新 judge / selection 平均入池题数仍偏低，约 6-7 道。
- 但 `needs_rewrite` 和严重问题下降，说明后半段审查口径比旧版本更贴近字段标准。
- 当前题量偏低不应再靠单句 prompt 猜测，应通过 full-chain trace 定位。

本轮题型调研尚未进入代码实现。当前只是封存研究结论和设计指引。

## 下一步建议

下一步讨论题型选择和多样性时，建议按以下顺序：

1. 先共同确认题型选择原则：
   - 题型服务认知动作。
   - 认知动作优先于题型多样。
   - 判断题只适合清楚二元边界。
   - 工具分工 / 机制对比不默认用判断题。

2. 再更新文档：
   - PRD 中增加“题型选择原则”小节。
   - 字段标准文档中增加“题型适配”小节。

3. 最后才考虑代码：
   - 轻量修改 `expectedQuestionType()`。
   - 轻量修改 `practiceBlueprint` 的题型推荐。
   - 不改干扰项和常见误区 prompt。

## 封存结论

本轮调研支持一个方向：

> 拾贝不应该追求机械题型多样，而应该让每个题型承担清楚的学习任务。选择题负责识别和区分，判断题负责快速确认边界，场景判断题负责迁移和行动选择。题型推荐应保持温和，不应成为硬性失败条件。

