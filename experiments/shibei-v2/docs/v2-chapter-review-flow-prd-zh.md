# 拾贝 V2 章节复习路径 PRD

## Problem Statement

当前线上版本已经可以把文章提取为知识点并生成题卡，但用户进入复习后，体验仍然更像“刷一组题”，而不是“走完一篇文章的复习流程”。题目之间缺少清晰的上下文、层级和节奏，用户容易知道自己正在答题，却不一定知道自己正在理解文章里的哪一块内容、为什么这道题现在出现、它和上一题/下一题有什么关系。

V2 希望重构这个体验：把一篇文章从“知识点 + 题目队列”重构为一个可被用户走完的线性复习路径。用户打开首页后，应当看到当前正在复习的章节，并通过一个轻量、有节奏、有反馈的路径，完成从文章唤醒、概念理解到场景应用的完整学习闭环。

## Why Rebuild The Flow

### 从题目集合变成章节路径

V1 的核心生成目标是提取知识点并生成题目。V2 的核心生成目标应当变成生成一个章节复习脚本：系统不仅要知道“考什么”，还要知道“先让用户看到什么，再让用户做什么，为什么这个步骤现在出现”。

### 从平铺题卡变成知识点内的小关卡

用户不是直接面对一堆题，而是按知识点推进。每个知识点内部先快速唤醒该知识点下的 1-3 个关键概念，再进入该知识点的场景应用题。这样既保留知识点内部的整体性，也让用户感到自己在完成一个个小关卡。

### 从硬核复习变成轻量碎片学习

拾贝的使用场景是碎片化学习。用户可能在通勤、排队、睡前打开 App，不适合一上来进入考试感很强的流程。V2 应引入适度游戏化和轻交互，让复习体感更轻、更放松、更愿意完成。

游戏化不是为了增加装饰，而是为了降低心理负担。它应当服务认知目标，例如匹配概念、选择解释、判断场景、确认误区，而不是让用户花额外脑力理解复杂控件。

### 从固定旧字段变成新的学习路径模型

V2 是隔离实验版本，不需要受 V1 的字段层级约束。当前的 `Chapter -> KnowledgePoint -> Questions -> ReviewSession queue` 可以作为历史参考，但不应限制 V2。V2 需要重新设计 prompt、数据契约和前端状态，让模型天然表达章节路径、知识点、关键概念、概念检查、场景应用和步骤进度。

## Product Goals

- 让用户感觉自己是在“走完一篇文章的复习路径”，而不是随机刷题。
- 首页成为当前章节复习入口，承接用户“继续当前文章”的心智。
- 用 summary card 作为文章记忆唤醒锚点，让用户快速回到文章上下文。
- 用轻量概念热身降低进入门槛，快速激活知识点下的关键概念。
- 用场景应用题帮助用户把概念放入具体情境，形成更深的理解。
- 用概念解析和场景解析连接答案、正确理解、常见误区和来源依据。
- 支持未来按文章类型调整复习脚本，而不是让一套流程强行适配所有文章。
- 保留长期个性化复习的空间，但第一阶段先聚焦“走完一个章节”的核心体验。

## Solution

V2 的章节复习采用“章节入口 + 文章唤醒 + 知识点循环 + 章节收尾”的路径式体验。

用户在首页看到当前正在复习的章节标题和复习入口。点击入口后，先看到一张文章总结题卡，用极短 summary 唤醒记忆：这篇文章大概在讲什么、核心问题是什么、为什么值得复习。

随后用户进入第一个知识点。每个知识点是一个小关卡，包含：

1. 知识点开场：告诉用户这个知识点是什么。
2. 关键概念热身：按顺序考察该知识点下的 1-3 个关键概念。
3. 概念解析页：每个概念题后展示正确理解、常见误区和来源依据。
4. 场景应用：在同一个知识点的关键概念都走完后，进入 1-2 道场景应用题。
5. 场景解析页：每道场景题后解释为什么这个场景成立/不成立、涉及哪些概念。
6. 进入下一个知识点，重复以上循环。

整个章节完成后，用户看到章节完成总结：这篇文章带走了什么、哪些知识点完成了、哪些概念仍需要后续复习。

## Core User Flow

```text
首页
→ 当前章节标题 / 复习入口
→ 文章总结题卡
→ 知识点 1 开场
→ 关键概念题 1
→ 概念解析页 1
→ 关键概念题 2
→ 概念解析页 2
→ 关键概念题 3（如果存在）
→ 概念解析页 3
→ 场景应用题 1
→ 场景解析页 1
→ 场景应用题 2（如果存在）
→ 场景解析页 2
→ 知识点 1 完成
→ 知识点 2
→ ...
→ 章节完成总结
→ 回到首页
```

## Experience Principles

### Summary 是切入锚点，不是完整摘要

Summary card 的目标不是替代原文，也不是让用户重新读一篇浓缩文章。它只负责快速唤醒记忆，让用户知道“我现在回到的是哪篇文章”。理想体量应短、清晰、有方向感。

### 概念热身要轻，不承担全部掌握判断

关键概念题可以使用简单交互，例如点击选择、匹配、连线、二选一、轻量排序。它们的目标是让用户低成本认回概念，而不是制造高压考试感。概念是否真正掌握，应在后续场景应用和长期复习中继续判断。

关键概念题考的是：用户认不认识这个概念在原文里的基本含义。题目的目的不是考倒用户，而是带领用户快速回顾一遍这个概念的基本含义。

### 场景应用放在同一知识点概念之后

一个知识点下通常只有 1-3 个关键概念，并且这些概念互相关联。V2 默认先走完该知识点下所有关键概念，再进入该知识点的场景应用。这样能保留知识点内部整体性，也允许场景题同时涉及多个概念。

### 解析页是轻反馈，不是中断

每个概念题和场景题之后都应有解析，但解析页要轻。它应像翻开卡片背面：告诉用户正确理解、常见误区、来源依据，并自然推进到下一步。

### 路径可见，主动作明确

用户应知道当前位于章节路径的哪个位置，但不应被复杂导航分散注意力。主按钮始终推动用户进入下一步。

## Research And Rationale

- `pre-training / advance organizer` 支持在正式学习前给用户一个概念和结构入口。V2 的 summary card 应作为文章地图和记忆锚点。
- `retrieval practice` 支持主动回忆和答题比单纯重读更有利于长期记忆。V2 的概念热身和场景题都应让用户做出轻量判断。
- `transfer / application practice` 支持通过场景题把概念放入新情境，避免用户只记住原文表述。
- Duolingo、Khan Academy、Brilliant 等路径式学习产品说明，轻量路径、阶段反馈和适度游戏化能降低学习压力并提升完成感。
- Anki、RemNote 等产品提醒 V2：一次性章节路径不能替代长期复习。V2 第一阶段先解决章节内体验，后续仍应保留间隔复习和个性化薄弱点回收。

## User Stories

1. As a learner, I want the home screen to show my current chapter, so that I know what to continue.
2. As a learner, I want to tap one clear entry point, so that I can start reviewing without choosing from many modes.
3. As a learner, I want to first see a short article summary, so that I can quickly remember what the article was about.
4. As a learner, I want the summary to be short and directional, so that it feels like a memory cue rather than another reading task.
5. As a learner, I want each knowledge point to start with a clear title, so that I know what part of the article I am reviewing.
6. As a learner, I want to quickly review the key concepts inside a knowledge point, so that I can rebuild the basics before harder questions.
7. As a learner, I want concept checks to feel light and simple, so that I can use the app in fragmented moments.
8. As a learner, I want to see the correct understanding after each concept check, so that mistakes are immediately repaired.
9. As a learner, I want to see common misconceptions, so that I know what not to confuse.
10. As a learner, I want explanations to reference the source, so that I trust the generated review.
11. As a learner, I want to finish all key concepts inside one knowledge point before scenario questions, so that related concepts stay together.
12. As a learner, I want scenario questions after concept warmup, so that I can apply what I just reviewed.
13. As a learner, I want scenario explanations to explain the reasoning, so that I learn how the concepts work in context.
14. As a learner, I want each knowledge point to feel like a small stage, so that progress feels concrete.
15. As a learner, I want to know when a knowledge point is complete, so that I feel momentum.
16. As a learner, I want the chapter to end with a completion summary, so that I know what I took away.
17. As a learner, I want the app to remember where I stopped, so that I can continue later.
18. As a learner, I want the experience to feel relaxed rather than exam-like, so that I am willing to open it often.
19. As a learner, I want the app to adapt in the future when an article type does not fit this flow, so that the review does not feel forced.
20. As a product builder, I want the backend to generate a review path rather than flat questions, so that the frontend can render the intended learning journey.
21. As a product builder, I want prompts to output knowledge units, key concepts, concept checks, and scenarios, so that content matches the V2 flow.
22. As a product builder, I want progress tracked by path step, so that the app can resume precisely.
23. As a product builder, I want clear result data for concept checks and scenario applications, so that future personalization can be built.
24. As a product builder, I want the V2 schema isolated from V1, so that we can redesign freely without risking TestFlight production.

## Implementation Decisions

- V2 should introduce a new review path data model instead of preserving the V1 flat `knowledgePoints` and `questions` model as the primary contract.
- A chapter should contain an ordered review plan with a summary card and a list of knowledge units.
- A knowledge unit should contain 1-3 key concepts by default, followed by 1-2 scenario applications when suitable.
- Concept checks and scenario applications should be separate card types because they serve different cognitive goals.
- Concept explanation cards should include correct understanding, common misconception, and source grounding.
- Scenario explanation cards should include scenario reasoning, involved concepts, and source grounding.
- Review progress should be tracked by current unit, current stage, current card, completed step ids, and card results.
- The prompt pipeline should be redesigned around planning a chapter review path:
  - identify article type and structure,
  - create a short summary anchor,
  - group content into knowledge units,
  - extract key concepts inside each unit,
  - generate lightweight concept checks,
  - generate scenario applications for each unit,
  - generate explanations and wrap-up text.
- V2 should support future article-type-specific scripts. The first default script targets concept/method, argument/opinion, and product/AI knowledge articles.
- If a knowledge unit has no suitable scenario question, V2 may skip scenario applications for that unit rather than forcing low-quality scenarios.
- If an article does not contain stable concepts, V2 should eventually choose a different script, such as timeline, argument map, or source comprehension.

## Testing Decisions

- Tests should verify external behavior of the generated review path, not prompt internals.
- Backend tests should validate that generated or fixture-based review plans contain ordered units, valid concept checks, valid scenario applications, and source-grounded explanations.
- Schema tests should cover optional scenario applications, one-concept units, multi-concept units, and article types that do not fit the default flow.
- Frontend state tests should verify resume behavior: summary card, current knowledge unit, concept check, explanation, scenario, and chapter completion.
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
- Creating a V2 Railway deployment.
- Migrating V1 production data.
- Preserving backward compatibility with V1 review session fields.
- Building full long-term spaced repetition logic.
- Supporting every article type in the first implementation.
- Final visual design polish, animation language, or complete game economy.

## Risks And Open Questions

- Not every article naturally fits the default summary -> concepts -> scenarios flow.
- The system needs a reliable way to decide whether a scenario application is suitable for a knowledge unit.
- Concept checks must stay lightweight without becoming too trivial to be useful.
- The number of pages may feel high if every card has a separate explanation screen.
- The system must balance a visible path with a simple main action.
- Future personalization may need to shorten or skip steps for concepts the user already understands.

## Further Notes

The core V2 product belief is that a chapter should feel like a short, guided learning level. The user is not merely answering isolated questions; they are recovering the article, rebuilding its key concepts, applying those concepts, and finishing with a sense that the article has been re-understood.

This PRD intentionally describes the desired V2 model, not a constrained refactor of V1. The isolated V2 baseline exists specifically to allow prompt, schema, API, state, and UI hierarchy to change together.
