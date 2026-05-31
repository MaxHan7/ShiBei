# Product Marketing Context

*Last updated: 2026-05-27*

## Product Overview

**One-liner:** 拾贝把文章、笔记和链接里的碎片知识变成可复习的题卡。

**What it does:** 用户粘贴文字或文章链接，拾贝自动提取知识点、生成测试题，并保留来源上下文。用户像背单词一样刷题复习，在答错后回到解释和原文依据，确认自己真的理解了内容。

**Product category:** AI 学习复习工具；碎片知识复习；文章转题；个人知识管理的复习层。

**Product type:** iOS consumer app, early Beta.

**Business model:** Beta 阶段免费测试。后续可能支持账号登录、跨设备同步和订阅能力，但首轮招募不承诺这些能力。

## Target Audience

**Target users:** 有持续学习需求、知识来源分散、愿意尝试 AI 工具的个人用户。

**Primary use case:** 把最近真正想记住的一篇文章、一段笔记或一个链接变成知识点和复习题，并完成一次轻量复习。

**Jobs to be done:**
- When I collect a useful article, I want to turn it into review questions, so I can remember and reuse the ideas later.
- When I read AI/product/business content, I want a quick way to test my understanding, so I do not just save it and forget it.
- When I have fragmented learning material, I want a low-friction review loop, so I can keep learning without building a full knowledge base.

**Use cases:**
- 公众号、网页文章、产品方法论笔记、AI 工具教程、商业案例、读书笔记。
- 通勤、午休、睡前等短时间复习。
- 对 AI 生成题目进行质量反馈，帮助判断产品是否值得继续打磨。

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| AI/产品/运营/设计知识工作者 | 快速吸收新概念、新案例、新工具 | 收藏很多，但很少复盘 | 把输入变成理解测试，筛出真正掌握的内容 |
| 知识管理/第二大脑重度用户 | 结构化、可追踪、可复用 | 笔记库越建越大，复习层薄 | 在收藏和笔记之外补一层主动回忆 |
| 题卡复习习惯用户 | 短回合、即时反馈、掌握感 | 学习材料不是现成题库 | 把自己的材料转成题卡，而不是只能刷别人的题 |

## Problems & Pain Points

**Core problem:** 用户日常遇到大量有价值信息，但大多停留在收藏、截图、复制到备忘录，缺少后续复习和理解检验。

**Why alternatives fall short:**
- 收藏夹解决“保存在哪里”，不解决“是否记住”。
- 笔记工具适合整理，但对轻量复习和理解检测支持弱。
- 背单词/刷题工具有题库，但学习对象不是用户自己的碎片内容。
- AI 总结工具能压缩内容，但总结不等于记住。

**What it costs them:** 重复收藏、重复阅读、学习错觉、错过把新知识用于工作或决策的机会。

**Emotional tension:** “我明明看过很多，但真正能说出来、用起来的很少。”

## Competitive Landscape

**Direct:** AI 文章总结/问答工具。它们能生成摘要，但通常不会把内容组织成可复习、可测试、可反馈的题卡。

**Secondary:** Notion、Obsidian、flomo、备忘录、收藏夹。它们擅长保存和组织，但复习动作需要用户自己设计。

**Indirect:** 重新阅读原文、截图收藏、发给文件传输助手。这些方式成本低，但最容易遗忘。

## Differentiation

**Key differentiators:**
- 从用户自己的真实内容生成题目，而不是给通用课程题库。
- 题目有来源和解释，降低 AI 幻觉带来的不信任。
- 复习体验像题卡，轻量、短回合、低整理成本。
- Beta 阶段特别关注题目质量反馈，而不是功能堆叠。

**How we do it differently:** 先做“内容输入 -> 知识点 -> 题目 -> 复习 -> 反馈”的闭环，而不是先做完整知识库、社交社区或复杂管理系统。

**Why that's better:** 用户能更快判断自己是否理解，产品团队也能更快验证 AI 出题质量。

**Why customers choose us:** 他们不想再多一个收藏夹，而想知道自己到底记住了什么。

## Objections

| Objection | Response |
|-----------|----------|
| AI 生成的题会不会不准？ | Beta 会展示解释和来源上下文，并提供题目反馈入口；首轮测试重点就是验证题目质量。 |
| 我已经用 Notion/Obsidian 了 | 拾贝不是替代笔记库，而是补一层主动回忆和题卡复习。 |
| 上传内容隐私怎么办？ | 当前 Beta 使用匿名设备身份；用户提交内容会上传云端用于生成，可能经第三方 AI 模型处理；App 内提供删除当前设备数据的入口。 |
| 现在功能是不是还不完整？ | 是。当前是 Beta，核心验证是“真实内容能否生成有帮助的题目”和“用户是否愿意复习”。 |

**Anti-persona:** 只想保存资料、不愿意答题、不愿意给反馈、不能接受 Beta 不稳定性的用户。

## Switching Dynamics

**Push:** 收藏太多、看完就忘、笔记库沉睡、AI 总结没有复习闭环。

**Pull:** 一篇真实文章马上变成题卡，能检测理解，还有来源依据。

**Habit:** 继续收藏到微信、备忘录、Notion、Obsidian，或者依赖“以后再看”。

**Anxiety:** AI 是否乱出题、文章抓取是否稳定、等待生成是否太久、上传内容是否安全。

## Customer Language

**How they describe the problem:**
- "收藏了很多，但真的没怎么看第二遍。"
- "看 AI/产品文章时很有启发，过两天就忘了。"
- "我的知识库越来越大，但好像没有变成我的知识。"
- "我想知道自己到底有没有看懂。"

**How they describe us:**
- "把文章变成复习题。"
- "像背单词一样复习自己的碎片知识。"
- "不是收藏夹，是帮我检查有没有记住。"

**Words to use:** 文章变成复习题、碎片知识、题卡、来源依据、主动回忆、看过到记住、Beta 测试、真实反馈。

**Words to avoid:** 永久记忆、100% 准确、替代老师、自动掌握、全平台支持、正式上线、无限制免费。

**Glossary:**

| Term | Meaning |
|------|---------|
| 章节 | 一次添加的文章、文字或链接形成的复习单元 |
| 知识点 | 从来源中提炼出的可测试概念 |
| 题卡 | 用来复习知识点的单题交互 |
| 来源上下文 | 支撑题目和解释的原文依据 |
| 题目反馈 | 用户标记答案不准、题目看不懂、和来源无关、太简单 |

## Brand Voice

**Tone:** 真诚、克制、创始人视角、求反馈。

**Style:** 具体场景优先，少用宏大词；承认 Beta 不完美；强调“我正在验证这个问题”。

**Personality:** 认真、温和、爱学习、产品实验感、尊重用户时间。

## Proof Points

**Metrics:** 当前目标不是公开增长数据，而是 20-50 名 Beta 用户、10 次完整首轮体验、5 次次日回访。

**Customers:** 首轮测试用户待招募。

**Testimonials:** 暂无。首轮需要收集真实用户原话。

**Value themes:**

| Theme | Proof |
|-------|-------|
| 从看过到记住 | 用户完成一篇真实文章的题卡复习 |
| 可信 AI 出题 | 每道题提供解释和来源上下文 |
| 低整理成本 | 粘贴文字或链接即可生成章节 |
| 可改进质量 | 用户能反馈坏题，团队据此调 prompt 和质量规则 |

## Goals

**Business goal:** 招募首批 20-50 名高质量 iOS Beta 测试用户，验证核心复习闭环。

**Conversion action:** 用户评论或私信“内测/拾贝/Beta”，人工筛选后发送 TestFlight 或测试入口。

**Current metrics:** 尚无公开 Beta 招募数据；本轮从 0 建立记录表。

