# 拾贝 V2 章节复习路径 PRD

## Problem Statement

当前线上版本已经可以把文章提取为知识点并生成题卡，但用户进入复习后，体验仍然更像“刷一组题”，而不是“走完一篇文章的复习流程”。题目之间缺少清晰的上下文、层级和节奏，用户容易知道自己正在答题，却不一定知道自己正在理解文章里的哪一块内容、为什么这道题现在出现、它和上一题/下一题有什么关系。

V2 希望重构这个体验：把一篇文章从“知识点 + 题目队列”重构为一个可被用户走完的线性复习路径。用户打开首页后，应当看到当前正在复习的章节，并通过一个轻量、有节奏、有反馈的路径，完成从文章唤醒、概念理解到场景应用的完整学习闭环。

同时，V2 还需要补上一个更清晰的发现入口。对于新用户来说，如果产品只等待用户自己导入文章，用户可能还没有形成“这个产品能帮我把文章变成可复习路径”的心智。因此，发现页应提供推荐阅读文章、直接阅读入口和一键生成复习内容的能力，让用户在产品内部完成从发现内容、阅读内容到生成复习路径的基础闭环。

## Why Rebuild The Flow

### 从题目集合变成章节路径

V1 的核心生成目标是提取知识点并生成题目。V2 的核心生成目标应当变成生成一个章节复习脚本：系统不仅要知道“考什么”，还要知道“先让用户看到什么，再让用户做什么，为什么这个步骤现在出现”。

### 从平铺题卡变成知识点内的小关卡

用户不是直接面对一堆题，而是按知识点推进。每个知识点内部都应形成一个由宏观到具体的认知坡度：先让用户知道这一节在复习什么，再用轻量理解题快速回顾基本含义、关键边界或核心判断，最后进入更具体的场景应用题。这样既保留知识点内部的整体性，也让用户感到自己在完成一个个小关卡。

### 从硬核复习变成轻量碎片学习

拾贝的使用场景是碎片化学习。用户可能在通勤、排队、睡前打开 App，不适合一上来进入考试感很强的流程。V2 应引入适度游戏化和轻交互，让复习体感更轻、更放松、更愿意完成。

游戏化不是为了增加装饰，而是为了降低心理负担。它应当服务认知目标，例如匹配概念、选择解释、判断场景、确认误区，而不是让用户花额外脑力理解复杂控件。

### 从固定旧字段变成新的学习路径模型

V2 是隔离实验版本，不需要受 V1 的字段层级约束。当前的 `Chapter -> KnowledgePoint -> Questions -> ReviewSession queue` 可以作为历史参考，但不应限制 V2。V2 需要重新设计 prompt、数据契约和前端状态，让模型天然表达章节路径、知识点、关键概念、概念检查、场景应用和步骤进度。

这种隔离只适用于开发和验证阶段。V2 不是长期并行的第二套线上产品；当 V2 的 UI/UX、prompt、schema、后端生成链路、恢复进度和关键失败态都通过验收后，应当替换当前正式版本，并继续使用同一个生产 service 面向用户提供服务。

## Product Goals

- 让用户感觉自己是在“走完一篇文章的复习路径”，而不是随机刷题。
- 首页成为当前章节复习入口，承接用户“继续当前文章”的心智。
- 用 summary card 作为文章记忆唤醒锚点，让用户快速回到文章上下文。
- 用轻量理解热身降低进入门槛，快速激活知识点下的基本含义、关键概念、概念边界或核心判断。
- 用场景应用题帮助用户把概念放入具体情境，形成更深的理解。
- 用题级答后反馈连接答案、正确理解或必要误区；来源依据主要用于后台校验和答题页查看原文定位。
- 增加发现页作为推荐阅读和一键生成入口，帮助用户理解产品用途，并在产品内完成基础使用闭环。
- 支持未来按文章类型调整复习脚本，而不是让一套流程强行适配所有文章。
- 保留长期个性化复习的空间，但第一阶段先聚焦“走完一个章节”的核心体验。

## Solution

V2 的章节复习采用“章节入口 + 文章唤醒 + 知识点循环 + 章节收尾”的路径式体验。

用户在首页看到当前正在复习的章节标题和复习入口。点击入口后，先看到一张文章总结题卡，用极短 summary 唤醒记忆：这篇文章大概在讲什么、核心问题是什么、为什么值得复习。

新上传或从好文阅读页生成出来的章节，不应在生成完成后自动替换首页当前正在复习的章节。生成完成只代表章节已可用，应先进入该章节的详情/预览页，让用户确认文章核心、知识点列表和来源信息。只有用户在某个章节详情页主动点击“开始复习/继续复习”时，系统才将该章节写入当前复习上下文，并让首页当前章节切换到它。这样可以避免用户只是添加内容，就打断原本正在复习的章节。

随后用户进入第一个知识点。每个知识点是一个小关卡，包含：

1. 知识点开场：告诉用户这个知识点是什么。
2. 轻量理解热身：围绕该知识点的基本含义、关键概念、概念边界或核心判断，先做少量低负担题。
3. 题级答后反馈：每道轻量理解题提交后，在题目页用轻气泡展示短反馈。
4. 场景应用：在同一个知识点的轻量理解题都走完后，进入适量场景应用题。
5. 场景答后反馈：每道场景题提交后，用同样的题级轻气泡帮助用户修正理解。
6. 完成当前知识点的最后一道题后，进入该知识点的单元总结页，给用户一个小阶段完成反馈。
7. 如果还有下一个知识点，用户从单元总结页继续进入下一个知识点开场页；如果这是最后一个知识点，用户继续进入整章的章节总结页。

整个章节完成后，用户看到章节完成总结：这篇文章带走了什么、哪些知识点完成了、哪些概念仍需要后续复习。

## Core User Flow

```text
首页
→ 当前章节路径节点
→ 开始节点（未开始时）
→ 章节概要页（文章 summary）
→ 知识点 1 开场页
→ 知识点 1 / 轻量理解题 1
→ 提交答案后停留在题目页：选项反馈 + 答后反馈气泡 + 继续按钮
→ 知识点 1 / 轻量理解题 2
→ 提交答案后停留在题目页：选项反馈 + 答后反馈气泡 + 继续按钮
→ 知识点 1 / 场景应用题 1
→ 提交答案后停留在题目页：选项反馈 + 答后反馈气泡 + 继续按钮
→ 知识点 1 单元总结页
→ 知识点 2 开场页
→ ...
→ 最后一个知识点单元总结页
→ 章节总结/结算页
→ 回到首页
```

### 页面级流程细节

首页主线入口是章节路径节点。未开始复习时，第一个可操作节点是“开始”。用户点击“开始”后，进入章节概要页，先看到文章 summary，用来唤醒这篇文章的核心内容。用户点击继续后，进入第一个知识点开场页，页面展示该 unit 的知识点描述，让用户知道接下来复习哪一段核心理念、方法、判断或关系。

用户从知识点开场页继续后，进入该知识点的第一道题。题目页应包含题干、选项或交互组件、查看原文入口，以及提交后的反馈区域。用户作答后仍停留在当前题目页：如果答对，正确选项变绿；如果答错，正确选项变绿，用户选择的错误选项变红。随后弹出题级答后反馈气泡，并出现“继续 / 下一题”主按钮。用户点击继续后进入下一道题。

同一个知识点内的题目按顺序完成后，先进入该知识点的单元总结页。单元总结页只回收当前 unit 的完成感和表现数据，例如本单元正确率、评价词和简短反馈。用户点击继续后，如果章节内还有下一个知识点，则进入下一个知识点开场页，再走同样路径；如果当前知识点已经是整章最后一个知识点，则进入章节总结/结算页。章节总结/结算页回收的是整篇文章/整章层面的完成反馈，而不是单个 unit 的反馈。

用户随时退出后，下一次从首页继续该章节时，应恢复到用户退出时所在的具体页面，包括章节概要页、单元总结页和章节总结/结算页，而不是只恢复到知识点或题目列表层级。

## Discover Page

V2 可以在底部导航中加入“发现”tab。发现页的核心职责不是普通内容流，而是为用户提供一组推荐阅读文章，让用户在不知道该导入什么内容时，也能立刻理解拾贝的使用方式。

发现页的基本闭环是：

```text
发现页
→ 推荐阅读文章列表
→ 打开文章阅读
→ 一键生成复习内容
→ 进入该文章的章节复习路径
```

推荐阅读文章应能直接打开阅读。阅读页里需要提供明确的一键生成入口，让用户可以把当前推荐文章生成 V2 章节复习路径。生成完成后，文章应进入用户的复习章节集合，并可以从首页路径继续复习。

发现页里的推荐文章可以使用预生成复习路径。也就是说，这些文章对应的知识点、题目、反馈和来源 anchor 可以提前生成并校准好。用户点击“生成”时，用户侧仍然看到和普通文章生成一致的流程与语义，但实际体验应尽量即时完成，避免新用户第一次体验时被生成等待打断。产品不需要向用户强调“这是预设题目”，用户只需要感知到“这篇推荐文章也可以一键生成复习路径”。

发现页也承担新用户 landing 的一部分职责：它通过“这里有值得读的内容”和“这些内容可以一键变成复习路径”告诉用户产品是用来做什么的。它不是替代用户自行导入文章，而是提供一条更低门槛的起步路径，帮助用户完成第一次使用闭环。

## Experience Principles

### Summary 是切入锚点，不是完整摘要

Summary card 的目标不是替代原文，也不是让用户重新读一篇浓缩文章。它只负责快速唤醒记忆，让用户知道“我现在回到的是哪篇文章”。理想体量应短、清晰、有方向感。

Summary card 不应写成知识点目录，也不应使用“这篇文章讲的是 / 这篇文章的核心是”这类提示性开场。更好的写法是直接点出文章围绕的核心命题，再用一两句轻量带出主要展开方向，形成简单的总分结构。它要先让用户抓住文章本质，再帮助用户想起文章大致从哪些角度展开。

### 每个知识点都要有由宏观到具体的认知坡度

V2 的第一性原则是：做题过程必须有逻辑、循序渐进，并对用户形成丝滑的引导。每个知识点不应直接把较重的场景题扔给用户，而应先给一个短开场，让用户知道这一节在复习什么；再用轻量理解题让用户认回基本含义、关键边界或核心判断；最后才进入更具体、更需要情境判断的场景应用题。

这种坡度不是为了增加页面数量，而是为了降低用户从“我刚回到这篇文章”到“我能在情境里使用这个知识”的认知跳跃。

知识点开场和第一道轻量理解题应有明确分工。知识点开场负责概括这一段原文的核心理念、方法、判断或关系，帮助用户知道接下来复习什么；第一道轻量题负责让用户主动切入这个知识点。如果存在明确核心概念，第一题优先考察概念的基本含义或边界；如果没有明确概念，第一题应设计成低负担的小判断、小匹配或小选择，帮助用户认回这一段的核心理解。两者可以围绕同一核心，但不能只是同义复述。

### 轻量理解题要轻，不承担全部掌握判断

轻量理解题可以使用简单交互，例如点击选择、匹配、连线、二选一、轻量排序。它们的目标是让用户低成本认回这个知识点的基本含义、关键概念、边界关系或核心判断，而不是制造高压考试感。理解是否真正掌握，应在后续场景应用和长期复习中继续判断。

轻量题不能轻到丢失题目自足性。每道题单独拿出来看，用户也应该知道它在问什么；但题干仍应保持轻，不应变成一段背景复述。题干要给出作答所需的最小语境，避免使用“这里的 / 上述 / 这个说法 / 文中这个概念”等依赖前文的指代。更好的方式是用一个短动作场景或短对象补足语境，例如“让 agent 判断用户痛点前……”“把这些反馈来源和它们提供的线索匹配起来……”。

轻量理解题应优先使用正向问题，让用户直接判断“什么是正确理解 / 应该怎么做 / 关键变化是什么”。尽量避免“并不意味着什么”“哪一项不是”“哪一项不符合”等负向题干，因为用户需要先理解题意再做语义反转，会增加不必要的认知负担。只有当考点本身就是排除误区或边界辨析时，才谨慎使用负向问法。

关键概念题考的是：用户认不认识这个概念在原文里的基本含义。题目的目的不是考倒用户，而是带领用户快速回顾一遍这个概念的基本含义。

如果一个知识点里出现一组相似或容易混淆的概念，且文章的重点是突出其中某个概念与其他概念的区别，可以直接使用匹配/连线题考察这组概念的边界。此时不要求每个概念都先单独出题；一题完成概念组辨析即可，避免节奏重复。

匹配/连线题采用即时反馈模式：用户每完成一组匹配后立刻看到反馈。匹配正确时，该组进入正确或已完成状态；匹配错误时，相关选项短暂变红后恢复，用户需要重新匹配。只有当该题内所有匹配项都正确完成后，下一步按钮才可点击。这个模式的目的不是制造惩罚，而是让用户在轻交互中快速校准概念边界。

匹配题可以优先探索点选配对模式，尤其适合手机端。左右两列各展示一组选项卡片，用户不需要被强制先点左侧或右侧，任意一侧都可以作为第一选择。用户先点击任意一张卡片，该卡片从普通白色或灰色变为蓝色选中态；再点击另一侧卡片时，第二张卡片不再进入蓝色选中态，而是立即触发匹配判断。若匹配正确，两张卡片同时直接变绿，短暂停留后变为浅灰或锁定态，表示已经完成；若匹配错误，两张卡片同时直接变红，短暂停留后恢复普通状态，用户可以重新选择。

拖拽连线也可以作为备选交互：用户按住左侧选项，拖向右侧选项。拖动过程中，一条动态连接线从原选项跟随到用户手指位置；用户在目标选项上松开后，系统判断匹配结果。若匹配正确，连接线和相关选项边框变为绿色并保持连接；若匹配错误，连接线和目标选项短暂变红，选项可以轻微震动，然后连接线自动断开。反馈应明确、轻量，让用户立刻知道这次匹配是否成立。

匹配/连线题应服务于边界辨析或具体化理解。它可以连接概念名词和解释，但右侧内容必须是具体含义、职责、使用时机、场景或典型例子，不能只是换句话复述。比如 `PostToolUse / PreToolUse / SessionStart / Stop` 适合匹配到各自用途，`Prompt / 规则文档 / Hook / CI` 适合匹配到职责边界；而“需要 Hook 的几个信号”更适合匹配到访问密钥、重复提醒、交给别人继续改、上下文压缩等具体场景。

匹配题应优先考察关系理解，而不是机械对齐信息。当原文列出一组类型、信号、条件、角色或步骤时，优先让用户匹配它们与对应的作用、处理方式、职责边界、判断结果或典型场景。例如，当文章列出“需要使用某工具的几个信号”时，匹配题不应只让用户记住信号名称，而应尽量匹配每个信号对应的作用或处理方式。更具体的题型例子可以沉淀在样章或测试集中，不需要全部写进 PRD。

匹配/连线题默认可以使用左右两列的连线形态，但两侧选项应保持简洁，尽量使用短语级表达，避免把完整长句塞进一个选项里。若某组匹配内容需要较长场景描述，优先压缩文案、拆成更短的关系，或改用逐个匹配卡片等更适合手机阅读的形态。

如果一个知识点没有新的术语型概念，但它包含清晰的边界、原则或判断，也仍然可以先生成轻量理解题。例如“Prompt 和 Hook 的区别”不一定是一个新概念定义，但它可以先用轻题考察“Prompt 是请求模型记住，Hook 是让系统执行”，再用场景题考察用户是否知道什么时候应该用 Hook 而不是继续补 Prompt。

当知识点包含明确的模型、框架或方法时，轻量理解题应先帮助用户建立整体入口，再进入组成部分或内部关系。也就是说，先让用户认回这个东西大体是什么、用于什么判断，再考它有哪些层级、步骤、角色或边界。

### 概念型知识点的推荐范例

当知识点包含明确关键概念时，V2 可以先提取关键概念并做轻量考察。例如文章解释 “Hook 是什么” 时，轻量理解题可以依次考察：

1. Hook 是在 AI agent 固定节点自动执行动作。
2. Hook 被触发时可以接收相关上下文。
3. Hook handler 可以检查输入、执行动作，并在必要时返回决策。

这些题的目标是帮助用户快速抓住概念的基本含义和组成特征。随后再进入场景应用题，例如“希望 AI 写完文件后自动跑 formatter，应该继续写 Prompt，还是配置 Hook？”场景题负责考察用户对概念的深度理解和实际应用理解。

### 场景应用放在同一知识点的轻量理解之后

一个知识点下通常只应保留少量互相关联的轻量理解考点。V2 默认先走完该知识点下所有轻量理解题，再进入该知识点的场景应用。这样能保留知识点内部整体性，也允许场景题同时涉及多个概念、边界或判断原则。

场景应用题的数量不应默认固定。它应由该知识点的原文密度、关键细节数量、可迁移场景和学习价值决定。若一个知识点只自然支撑一个场景题，可以只保留一个；若它包含多个重要细节、多个容易误用的边界，或某个关键理解特别值得从不同角度练习，也可以生成多个不同角度的场景应用题。

多个场景应用题之间应有明确分工，例如分别考原因判断、边界选择、行动选择、时机判断或风险识别。不要为了增加数量而生成换壳重复题；每一道场景题都应帮助用户从一个新的角度理解或应用同一个知识点。

### 题干考理解，不考原文背诵

V2 仍应继承 V1 最新出题系统里已经有效的题干质量原则：题目考察的是用户对知识点的记忆和理解，而不是用户是否记住原文怎样表述。

题干应尽量少使用“文章认为”“根据原文”“文中提到”“这篇文章里的”“这篇文章的方法 / 思路”等提示用户回忆文章表述的字眼。更好的题干应直接围绕知识点本身发问，例如考一个概念的基本含义、一个边界关系、一个判断原则，或一个可迁移的应用场景。

题目不应强迫用户回忆原文细节、句子顺序或作者措辞。来源依据用于生成和校验题目质量，但用户侧题干应尽量像一次自然的知识点复习，而不是阅读理解测验。

### 答题页提供查看原文入口

每道题仍然需要后台绑定来源依据，但来源依据不应默认变成反馈气泡里的一小段原文片段。每个题目页都应提供“查看原文”入口，作为主动回源复习的帮助方式。用户真正需要原文帮助的时刻，往往是在答题前毫无思路时；因此这个入口应出现在答题页，而不是只出现在答后反馈里。

用户点击“查看原文”后，应进入完整原文阅读页，而不是只看到一段被截取的来源片段。系统应根据当前题的来源 anchor，将最相关的核心段落自动滚动到用户视觉屏幕的中心；相关段落可以高亮，但高亮不是必须。用户可以上下滑动查看完整来源文章，再返回当前题继续作答。

这种方式比只展示单段来源更稳，因为模型截取的来源片段可能过短、过窄或缺少上下文。完整原文 + 自动定位既能帮助用户回忆，又能保留上下文判断空间。

### 干扰项要承载真实误区，不做明显凑数

V2 也应继承 V1 最新出题系统里的干扰项质量原则：干扰项不是为了骗用户，而是为了帮助用户分清概念、边界、时机、原因或行动。

为了让干扰项质量稳定，V2 的题目生成链路应保留“常见误区 / 混淆点”作为题级后台中间层。这个字段不一定默认展示给用户，但应先于干扰项生成，用来约束错误选项的来源和学习价值。

推荐生成顺序是：

1. 确定知识点和本题考察目标。
2. 生成正确理解。
3. 生成常见误区或混淆点。
4. 基于正确理解和常见误区生成正确选项与干扰项组。

选择题默认继承 V1 的四选项结构：一个正确选项，三个干扰项。三个干扰项应作为一个整体来设计和校验，而不是各自孤立凑数。这个规则主要适用于单选选择题；匹配/连线题等非单选题型可以使用自身的选项结构。

干扰项应作为一个选项组整体判断。一个好的选项组应满足：

1. 整体同语境：干扰项都在题干的问题空间里，不能离谱凑数。
2. 没有第二正确答案：任何干扰项都不能和正确选项等价或近似正确。
3. 有学习价值：用户排除干扰项时，能更清楚本题考察的边界。
4. 难度有梯度：允许一个较明显的排除项，但不能所有干扰项都一眼排除。
5. 至少一个干扰项承载真实常见误区或混淆点，而不是泛泛写一个错误说法。

如果一道题确实没有自然的常见误区，应标记为“无自然误区”或改用“容易混淆点”，不能硬编一个泛泛误区。该字段优先服务生成和质量校验；答后反馈气泡可以选择性使用它，但不要求每题都把误区直接展示给用户。

常见误区 / 混淆点的生成粒度应跟随题目，而不是默认每个知识点只生成一个。对于有干扰项的选择题和定义题，应优先尝试生成常见误区，因为误区是干扰项质量的依据。对于场景应用题，大多数情况下也应生成常见误区，因为它考察的是用户是否会把概念、边界或行动方式用错。对于边界辨析题，常见误区通常是题目的核心。匹配/连线题可以使用题组级混淆点，但不强制每个匹配项都有误区，因为它没有传统干扰项，且题目本身就在训练多个概念、职责或场景边界。

不同题型可以有不同干扰项结构。概念识别题可以使用同领域相邻概念；边界辨析题可以使用核心误区、相邻边界和轻量排除项；场景选择题可以使用其它看似合理但不符合当前目标、时机或约束的行动。

生成和校验干扰项时，不能脱离上下文单独看选项文本。需要同时看知识点、题干、正确选项、来源依据、常见误区和兄弟选项，判断它是否真实、有学习价值，又不会破坏答案唯一性。

### 答题反馈是轻提示，不是中断

每个概念题和场景题之后都应有反馈，但反馈要轻。它应像题目页上的即时提示：帮助用户快速修正理解，并自然推进到下一步。来源依据不必默认展示在反馈里，但应继续作为后台校验和“查看原文”定位依据。

答题后使用 IP 形象气泡反馈：用户提交答案后仍停留在当前题目页，题目、选项和自己的选择仍然可见；页面侧边的 IP 形象弹出一段类似说话气泡的反馈。前端只展示一段融合后的题级解释，即 `question.explanation`。这段文案可以由后台生成链路参考正确理解和常见误区生成，但不要把“正确理解”和“常见误区”两段同时展示给用户。用户可以关闭气泡，也可以点击 IP 形象再次唤起气泡。页面底部保留“继续 / 下一题”主按钮，由用户主动推进。

答后反馈气泡是题级反馈，不是知识点级反馈。每一道轻量理解题或场景应用题提交后，都应有机会弹出一次短反馈气泡。样章里可以为了阅读压缩只展示代表性气泡，但产品流程不能理解为每个知识点只有一次反馈。

反馈气泡展示融合后的 `question.explanation`。正确理解和常见误区仍可在后台生成和保留，用于生成干扰项、生成解释、质量校验和 debug，但不作为两个独立前端字段展示。这样可以保留题目质量控制，又避免答后反馈变成多段解析。

气泡文字应保持短而明确，避免变成新的长解析。当前样章里生成的常见误区和正确理解整体偏短，可以先按这个方向继续生成；进入真实 UI 后，再根据视觉效果和阅读负担调整长度。

答题后的反馈不应沿用 V1 的自动倒计时跳转模式。用户提交答案后，无论答对还是答错，都应该有机会停留并回看题目、选项和自己的选择，再由用户主动确认进入下一步。这个规则的本质是：答题后的反思空间属于学习体验的一部分，尤其是答错时，用户需要看回题目来理解自己错在哪里。

### IP 形象状态服务答题反馈

题目页中应保留 IP 形象，让它成为答题反馈的一部分，而不是只作为装饰。用户尚未作答时，IP 处于状态 A：可以是安静陪伴、坐着看书或等待用户作答的状态。用户提交答案后，无论是选择题答对/答错，还是连线题完成匹配，IP 切换到状态 B：更像一个站起来进行讲解的状态，例如拿起老师用的指示棍，指向答题卡或反馈区域，同时弹出反馈气泡。

这个状态变化的目的，是让答后反馈更像“有人在轻轻讲解你哪里对、哪里错”，而不是系统冷冰冰地判定结果。后续可以根据已有 IP 设计稿继续补充具体形象、姿态、动效和气泡位置。

### 路径可见，主动作明确

用户应知道当前位于章节路径的哪个位置，但不应被复杂导航分散注意力。主按钮始终推动用户进入下一步。

首页路径中的每个知识点节点应能表达该知识点内部的复习进度。可以参考分段进度环：节点外圈是一圈圆形进度条，并按该知识点内题目数量平均切分成几段。用户每完成一道题，对应填充一段颜色；未完成部分保持灰色。这样既保留“按题目数量计算进度”的规则，又让用户在首页不用读数字也能看到每个知识点推进到哪里。未解锁节点可以保持灰色或锁定态，不展示已填充进度。

首页节点图应支持上下滑动浏览同一篇文章的知识点路径。当用户滑到当前章节路径边界后，如果继续沿同一方向滑动，可以切换到其它章节路径。向一个方向滑过最后一个知识点后，优先切到下一篇待复习章节；待复习章节内部优先展示最近上传并生成的内容。向另一个方向滑过开头节点后，可以切到已复习完成或历史章节；历史章节内部也优先按最近添加排序。这个交互的目标是让首页既像当前章节路径，又能自然承接多篇文章之间的连续复习。

## Research And Rationale

- `pre-training / advance organizer` 支持在正式学习前给用户一个概念和结构入口。V2 的 summary card 应作为文章地图和记忆锚点。
- `retrieval practice` 支持主动回忆和答题比单纯重读更有利于长期记忆。V2 的轻量理解题和场景题都应让用户做出轻量判断。
- `transfer / application practice` 支持通过场景题把概念放入新情境，避免用户只记住原文表述。
- Duolingo、Khan Academy、Brilliant 等路径式学习产品说明，轻量路径、阶段反馈和适度游戏化能降低学习压力并提升完成感。
- Anki、RemNote 等产品提醒 V2：一次性章节路径不能替代长期复习。V2 第一阶段先解决章节内体验，后续仍应保留间隔复习和个性化薄弱点回收。

## User Stories

1. As a learner, I want the home screen to show my current chapter, so that I know what to continue.
2. As a learner, I want to tap one clear entry point, so that I can start reviewing without choosing from many modes.
3. As a learner, I want to first see a short article summary, so that I can quickly remember what the article was about.
4. As a learner, I want the summary to be short and directional, so that it feels like a memory cue rather than another reading task.
5. As a learner, I want each knowledge point to start with a clear title, so that I know what part of the article I am reviewing.
6. As a learner, I want to quickly review the basic meaning, key boundaries, or core judgment inside a knowledge point, so that I can rebuild the basics before harder questions.
7. As a learner, I want lightweight understanding checks to feel simple, so that I can use the app in fragmented moments.
8. As a learner, I want a short feedback bubble after each question, so that mistakes are immediately repaired without leaving the question.
9. As a learner, I want feedback to clarify the correct understanding or common misconception, so that I know what not to confuse.
10. As a learner, I want to open the source article from a question when I am stuck, so that I can review the relevant context and then continue answering.
11. As a learner, I want to review the question and my answer after submitting, so that I can reflect before moving on.
12. As a learner, I want to finish the lightweight understanding checks inside one knowledge point before scenario questions, so that related ideas stay together.
13. As a learner, I want scenario questions after concept warmup, so that I can apply what I just reviewed.
14. As a learner, I want scenario feedback to explain the reasoning briefly, so that I learn how the concept or judgment works in context.
15. As a learner, I want each knowledge point to feel like a small stage, so that progress feels concrete.
16. As a learner, I want to see a unit completion summary after finishing a knowledge point, so that I get a small sense of closure before moving on.
17. As a learner, I want to know when a knowledge point is complete, so that I feel momentum.
18. As a learner, I want the chapter to end with a completion summary, so that I know what I took away.
19. As a learner, I want the app to remember where I stopped, so that I can continue later.
20. As a learner, I want the experience to feel relaxed rather than exam-like, so that I am willing to open it often.
21. As a learner, I want a Discover tab with recommended reading, so that I can understand what kind of content the product helps me learn.
22. As a learner, I want to open a recommended article directly, so that I can read before deciding whether to generate review content.
23. As a learner, I want to generate a review path from a recommended article with one action, so that I can experience the full product loop without importing my own article first.
23. As a learner, I want generated recommended articles to appear in my chapter path, so that I can continue them like my own saved articles.
24. As a learner, I want the app to adapt in the future when an article type does not fit this flow, so that the review does not feel forced.
25. As a product builder, I want the backend to generate a review path rather than flat questions, so that the frontend can render the intended learning journey.
26. As a product builder, I want prompts to output knowledge units, lightweight understanding checks, scenarios, source anchors, and feedback candidates, so that content matches the V2 flow.
27. As a product builder, I want progress tracked by path step, so that the app can resume precisely.
28. As a product builder, I want clear result data for lightweight understanding checks and scenario applications, so that future personalization can be built.
29. As a product builder, I want the V2 schema isolated from V1, so that we can redesign freely without risking TestFlight production.

## Implementation Decisions

- V2 should introduce a new review path data model instead of preserving the V1 flat `knowledgePoints` and `questions` model as the primary contract.
- V2 development should stay isolated under the V2 experiment app/backend until the release gate is met.
- V2 should not become a permanent second cloud service. After validation, the existing production service should be updated to V2.
- Before production replacement, the team must record the old production commit, deployment version, database backup, environment variables, and rollback procedure.
- A chapter should contain an ordered review plan with a summary card and a list of knowledge units.
- V2 navigation should include a Discover tab for recommended reading and one-action review generation.
- Recommended articles should support direct reading before generation, not only immediate conversion into review content.
- One-action generation from Discover should create the same type of review path as user-imported articles, so generated content can enter the home chapter path and resume flow.
- Recommended Discover articles may map to pre-generated review paths, including pre-generated questions, feedback, and source anchors, so first-run users can experience generation without waiting for a live prompt pipeline.
- The user-facing Discover generation flow should remain consistent with normal generation. The app does not need to tell users that a recommended article uses pre-generated content; it should simply feel like a fast successful generation.
- A knowledge unit should contain a small set of related lightweight understanding checks, followed by scenario applications when suitable.
- Lightweight understanding checks and scenario applications should be separate card types because they serve different cognitive goals.
- Question feedback should be modeled as a question-level payload, not a knowledge-unit-level page.
- Feedback payloads may contain correct-understanding and common-misconception candidates for generation and QA, but the user-facing UI should display the single merged `question.explanation`.
- Each question should keep source anchors for backend validation and for opening the full source article at the relevant position.
- Review progress should be tracked by current page, current unit, current card, submitted answer, option feedback state, feedback bubble state, IP state, completed step ids, and card results, so users can exit and resume at the exact page they left.
- The prompt pipeline should be redesigned around planning a chapter review path:
  - identify article type and structure,
  - create a short summary anchor,
  - group content into knowledge units,
  - identify the core concept, boundary, method, judgment, or relationship inside each unit,
  - generate lightweight understanding checks,
  - generate scenario applications for each unit,
  - generate short feedback candidates and wrap-up text.
- V2 should support future article-type-specific scripts. The first default script targets concept/method, argument/opinion, and product/AI knowledge articles.
- If a knowledge unit has no suitable scenario question, V2 may skip scenario applications for that unit rather than forcing low-quality scenarios.
- If an article does not contain stable concepts, V2 should eventually choose a different script, such as timeline, argument map, or source comprehension.
- Golden samples should be maintained as calibration assets for review-path quality. They should help evaluate structure, question style, feedback style, and source anchoring, but should not force future articles to copy the same node or question counts.
- Prompt example candidates should remain optional few-shot / anti-shot material. The first V2 prompt design should primarily reference the mature V1 prompt and multi-agent distractor pipeline; examples from the V2 candidate bank should be introduced selectively only when a specific output class remains unstable.

## Testing Decisions

- Tests should verify external behavior of the generated review path, not prompt internals.
- Backend tests should validate that generated or fixture-based review plans contain ordered units, valid lightweight understanding checks, valid scenario applications, question-level feedback payloads, and source anchors that can locate the relevant original article position.
- Schema tests should cover optional scenario applications, one-concept units, multi-concept units, and article types that do not fit the default flow.
- Frontend state tests should verify resume behavior: summary card, knowledge-unit opening page, question card, submitted answer, red/green option feedback, feedback bubble visibility, scenario card, unit completion page, and chapter completion.
- UI snapshot/manual QA should check that the flow feels lightweight, not like a dense test.
- Existing V1 tests can provide reference for API decoding, review session lifecycle, and source-grounding expectations, but V2 tests should target the new path contract.

## Success Metrics

- Users can understand where they are in the chapter path without explanation.
- Users complete a full chapter session more often than in the flat question flow.
- Users report the flow feels more coherent and less like random question cards.
- Users correctly answer scenario applications after concept warmup at an acceptable rate.
- Users can resume an unfinished chapter without losing context.
- Generated review paths have low rates of forced or unnatural scenario questions.

## Out Of Scope

- Shipping V2 to TestFlight.
- Creating a permanent parallel V2 Railway service.
- Replacing the existing production service before V2 passes the agreed release gate.
- Migrating V1 production data.
- Preserving backward compatibility with V1 review session fields.
- Building full long-term spaced repetition logic.
- Supporting every article type in the first implementation.
- Final visual design polish, animation language, or complete game economy.

## Risks And Open Questions

- Not every article naturally fits the default summary -> concepts -> scenarios flow.
- The system needs a reliable way to decide whether a scenario application is suitable for a knowledge unit.
- Lightweight understanding checks must stay lightweight without becoming too trivial to be useful.
- Feedback bubbles may feel heavy if the text becomes too long or if the IP overlay blocks the question.
- The system must balance a visible path with a simple main action.
- Future personalization may need to shorten or skip steps for concepts the user already understands.
- Discover needs a clear content sourcing and recommendation policy: which articles can be recommended, how often they update, and whether they are editorially curated or algorithmically selected.
- One-action generation from Discover needs clear success, duplicate, and fallback states. Even if recommended articles use pre-generated review paths, the UI should still feel consistent with normal generation.

## Next Frontend Design Exploration

下一阶段会基于新版主页视觉稿和 IP 形象设计稿，继续探索 V2 前端设计。这个阶段先分成两条线：

1. 视觉一致性：每个页面，包括首页路径、章节总结页、知识点开场页、题目页、答后反馈气泡、查看原文页，都需要和新版主页视觉稿保持统一风格。需要重点讨论页面层级、背景、节点样式、按钮、气泡、IP 位置、字体和色彩如何从主页延展到完整复习流程。
2. 动效与实现方案：V2 会相比当前线上旧版增加更明显的轻动效。待讨论内容包括 IP 形象在主页的 loop 动画、题目页 IP 状态 A 到状态 B 的切换、节点点击后的进入动效、答题选项红绿反馈、连线题拖拽线条反馈，以及是否继续使用苹果原生液态玻璃风格导航栏。

前端设计讨论还需要明确素材和技术边界：哪些效果依赖用户在代码外准备的素材，例如 IP 分层图、序列帧、Lottie、透明视频或多状态插画；哪些效果可以直接用 SwiftUI / iOS 原生动画实现；哪些效果需要引入额外动画资产或三方方案。这个阶段先讨论实现路径和素材需求，再进入具体编码。

## Further Notes

The core V2 product belief is that a chapter should feel like a short, guided learning level. The user is not merely answering isolated questions; they are recovering the article, rebuilding its key concepts, boundaries, methods, and judgments, applying them, and finishing with a sense that the article has been re-understood.

This PRD intentionally describes the desired V2 model, not a constrained refactor of V1. The isolated V2 baseline exists specifically to allow prompt, schema, API, state, and UI hierarchy to change together.

The intended release shape is still a replacement release: development happens in isolation, but the final cloud path uses the existing production service after V2 is proven ready. Rollback should use the previously recorded production deployment and data backup, not a long-lived V1/V2 service split.
