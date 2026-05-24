import SwiftUI
import UIKit

private let sampleArticleText = """
产品经理如何把 Claude 变成自己的工作系统丨Aakash

Pawel 是欧洲很有影响力的 AI PM 作者，LinkedIn 关注者超过 20 万，newsletter 订阅超过 10 万，还做了一个 PM skills marketplace，GitHub 上有 1 万 star。Aakash 在开场提到，Pawel 之前做过 AI 产品管理、n8n、用户发现的几期内容，这次回来讲的是一套完整 Claude PM 操作系统：Cowork、Claude Code、Dispatch、Skills、MCP connector、自我改进知识库，以及手机上的远程工作流。整场 90 多分钟，最有价值的部分不只是工具清单，更是 PM 如何把日常工作拆成可积累、可复用、可验证的系统，并让系统在下一次任务里带着记忆继续工作。

Anthropic 的速度，来自重写流程。Aakash 先抛出一个数字：Pawel 追踪到 Anthropic 在 52 天里发布了 74 次。Pawel 看到的重点，是很多公司正在围绕 AI 能做到的事，重新设计流程。产品经理、产品营销、设计师、工程师的边界正在靠近。原本需要单独角色处理的原型、测试、release notes、基于设计系统生成界面，开始被自动化。过去 PM 把需求交给设计和工程，今天更常见的动作是自己先用 Claude 做出初版材料、原型或分析，再带着更具体的证据进入协作。"他们围绕当前可能做到的事重新设计流程，而非只用 AI 替换原来的步骤。"

Pawel 对 PM 的判断很重：产品经理不能只会访谈用户、往 backlog 里写条目。PM 需要理解技术，熟悉过去给工程师用的工具，比如 terminal；也要理解策略、收入、业务目标和产品战略怎样连接。Aakash 听完说，这是他做产品 16 年里见过最接近产品“bare metal”的版本。PM 的工作没有消失，但岗位正在变成更宽的个人贡献者。他把未来叫作 super PM 或 super individual contributor：带着 PM 的重心，同时懂营销、战略、技术、产品和客户沟通。

聊天框已经装不下 PM 的工作。Pawel 说自己几乎不用普通 chat，只会在窗口刚好开着时问一句语法对不对。原因很现实：PM 开始一个任务时，往往不知道后面会需要什么。用 chat 起步，做着做着就会撞墙。你可能想从桌面离开，chat 不能在手机上接着跑；你可能想把讨论内容生成 HTML，再导出成 infographic 放进邮件；你可能中途发现要写一点代码。普通聊天框会让上下文断在一个窗口里。"已经没有什么好理由，只通过普通网页聊天框和 Claude 对话了。"

他更愿意从 Cowork、Dispatch 或 Claude Code 开始，因为这些界面可以在不同任务形态之间切换。Aakash 的比喻更狠：大多数人一直停留在 chat，就像只拿 Photoshop 裁图。Claude 对 PM 的价值，不在于多回答几个问题，而在于接管真实文件、真实系统和连续流程。如果一次工作最后要落到邮件、表格、PDF、设计稿、代码库或 CRM，入口就不该只是一段聊天记录。Pawel 举的场景很典型：讨论到一半想生成 HTML 页面，再导出成 infographic 放进邮件，chat 会迫使你另起会话、重讲上下文。

Aakash 还插入了自己的 AI 产品案例：他的 job search OS 有 16 个 agents，用户反馈会出现 hallucination 或选错工具。他后来发现问题不在提示词，而在没有逐步观察 agent 做了什么。接入 tracing 后，他能看到每次 tool call、每个决策，并让 Claude Code 反过来建议 eval 指标。一个简历反馈 agent 曾把招聘信息里的 Python 误读成 React，eval 跑出来同类错误约 12%，修完后降到 2% 以下。

Cowork 做的是文件和流程。Pawel 现场拿一个桌面文件夹做演示，里面放着两个月收集来的发票，有 PDF，也有图片，还有重复文件。他让 Cowork 分析这些发票，按月份创建 January、February、March、April 文件夹，识别重复项，再把文件移动进去。Claude 先列步骤：提取发票日期、识别重复、创建月份目录、移动文件、最后验证。几分钟后，文件真的被整理好了，连图片里的波兰语燃油发票也读出来了。"Cowork 处理的是真实文件和真实工作流。"

这个演示给 PM 的提示很具体：不要只让 Claude 总结文档。让它进入真实工作目录，处理真实文件，按你定义的流程一步步执行。Pawel 还展示了 Gmail connector：Claude 可以看未回复邮件，可以草拟回复，但默认 connector 不会自动发送。Pawel 的设置是让它起草，然后自己确认。每次处理完，Cowork 或 Code 还会复盘他的修改，从反馈里学习下一次怎么写得更像他。Slack 也类似：可以让 Claude 起草答复，再由人点击发送，既省掉查资料时间，也保留最后的人类确认。Pawel 把 MCP 叫作 agent 的 USB，Google Drive、Gmail、Slack、本地服务都可以通过 connector 接进来。

PM 迟早要学 Claude Code。Aakash 替很多非技术 PM 问了一个问题：Code 看起来吓人，IDE 也吓人，能不能跳过？Pawel 的答案很直接：不能。Cowork 可以做大量个人生产力任务，分析信息、整理文件、组织知识库都没问题，但 Claude Code 面向代码库，有 explorer view、hooks、可定义的 subagents、本地命令和更完整的工程插件。PM 和工程师一起工作，迟早会接触代码库。"作为一个和工程师一起工作的产品经理，你终究必须和代码打交道。"

Pawel 建议先从 Cowork 学会和 agent 合作：怎么组织知识，怎么定义流程，怎么给反馈。等系统长到几十个文件，或者开始涉及前端、数据库、debug、release notes、代码审查，再进入 Code。Aakash 说得更重：PM 应该学 Claude Code，要先跨过“这个界面不好看”的心理门槛。Pawel 自己会在同一个 repo 里同时使用 Cowork 和 Claude Code，Cowork 负责更友好的文件体验，Code 负责更强的工程能力，两边读的是同一套 CLAUDE.md 和项目文件。Code 里还可以定义固定 subagents，比如 researcher、tester、release notes writer；Cowork 可以动态分派，但没有同样的工程化角色结构。

Skills 是最高 ROI 的投资。Pawel 反复强调 Skills。发票演示里，Cowork 会根据任务动态加载 PDF skill。它先看 skill 的名字和描述，判断是否匹配当前任务，再读取详细步骤。Anthropic 把这种机制叫 progressive disclosure：你可以有几十个、上百个 skills，但 Claude 不会一开始把所有说明塞进上下文。只有任务真的需要时，它才读完整流程。"Skills 会根据当前任务被激活；Claude 只有在描述匹配时，才读取详细说明。"

Pawel 的 PM skills marketplace 就是围绕这个思路做的。他建议先用 marketplace 里的基线 skill，再用真实反馈迭代 5 到 6 轮，让 Claude 根据错误从第一性原理重写流程。产品经理过去收集一堆 prompt，放在 Notion 或文档里，下次继续复制粘贴。Pawel 要的是另一套东西：每次执行后，系统都把反馈写回规则里，下一轮自动变好。他自己的内容工作也这么跑：研究、文案、infographic、HTML 生成、PNG 导出，都可以被拆成可复用的 procedures。Aakash 提到，Product Compass 的 infographic 很多就是在 Claude Code 里生成 HTML、调用组件库、通过对话迭代，再导出成 PNG。PM skills repo 72 小时拿到 1300 个 star，后来到 1 万 star，正说明 PM 也在寻找可复用的工作协议。

知识库要能自我改进。Aakash 问 PM 设置 Claude 最大的错误是什么。Pawel 没有说模型选错，也没有说提示词太短。他说最大的错误是每次都从零开始 prompt。因为 PM 的工作数据太多，全部放在脑子里不可行。Pawel 会把知识分成三类：已经确认、默认执行的 rules；带证据、需要继续观察的 hypotheses；被否定过、避免下次再试的 rejected patterns。"最大的错误，是每次都从零开始提示它，没有让系统从错误中学习。"

他的三行自我改进提示词也很朴素：开始前先 review rules；执行时应用 confirmed rules；收到反馈后更新知识。测试、营销、产品战略都可以这么做。Pawel 还提到 CLAUDE.md 的角色：它不该塞满全部领域知识，而应负责路由，告诉 agent 去哪里读项目结构、规则、假设和历史反馈。PM 的复利不在 prompt 收藏夹里，而在一套会吸收反馈的工作系统里。当同一个项目既能在 Cowork 打开，也能在 Code web session 打开，还能从手机 Dispatch 任务，知识组织就变成系统底座。Pawel 用同一个 editor 项目承载假设、sound bites、hooks 和私有 GitHub 文件，避免每个界面各存一份孤立上下文。他从 2026 年 2 月开始给 agent 喂社交媒体截图和文章，让系统判断某条帖子为什么有效，把跨平台共性沉淀成 rules，把不确定判断先放进 hypotheses，再用更多数据确认或否定。

Dispatch 把工作搬到手机上。后半段两人聊到远程工作。Anthropic 近期有 web sessions、remote control、Dispatch、channels 等多个界面，Pawel 说自己测试过 channels，但没有长期使用。Dispatch 更像一个 walkie-talkie：一个聊天入口，可以启动多个后台任务。比如让一个任务做 Anthropic 风格 infographic，让另一个任务检查最近两小时邮件数量，再让第三个任务分析 Aakash 的帖子。任务完成后分别回报状态。"Dispatch 可以从一个界面启动多个后台任务，每个任务完成后都会报告状态。"

Pawel 说自己会在购物、陪孩子的时候派发任务，十分钟后看结果，再给下一轮文字反馈。复杂工作会切到 code web sessions，因为它更像云端 Visual Studio Code，可以连接 GitHub 里的项目，即使本地电脑不在线也能继续。Aakash 总结得很形象：你在散步、开会、参加活动时，agents 也能为你跑着。Pawel 还推荐 Vercel 的 Agent Browser：Chrome MCP 会频繁截图，复杂任务可能烧掉大量 token；Agent Browser 用 headless 浏览器把页面结构给 agent，适合 LinkedIn、老 CRM、SAP 这类没有顺手 API 的系统。他说 Dispatch 的限制也存在：手机上是一条长消息流，没有 tabs，线程太多时会乱；更复杂的项目还是要切到 web sessions 管理。

生产自动化还要硬规则。最后 Aakash 问了一个容易被忽略的问题：n8n 还重要吗？是不是所有事都应该交给 Claude Code？Pawel 的回答是：个人自动化和生产自动化要分开。分析 100 条推文、起草客户邮件、做个人知识库，可以用 Claude Code。代码库里的 release notes、code review、前端设计，也可以让 agent 和 subagents 做。但客户工单、权限、隐私、重试、数据访问这些生产流程，不能只靠文本说明。"在生产环境里，凡是不需要自主的部分，就不该交给自主 agent。"

Pawel 举了几个硬边界：如果 Anthropic API 失败，要重试三次；发邮件前必须验证客户邮箱存在；客户不能访问另一个客户的数据；1GB 文件不能被随便复制；某些数据 agent 甚至不该看。这些规则应该写进代码、条件和 guardrails。个人工作流可以靠 agent 探索，生产流程需要把能确定的步骤固化下来。他把 agent 分成三种形态：大部分流程由代码控制，中间只有一次 LLM 调用；代码和 agent 混合；完全自主。越接近生产，越要把可确定的环节收回到代码里。Pawel 说，非程序员最简单的路径仍然可以从 n8n 这类工具起步；会写代码的团队，则可以用 Anthropic API 或其他 agent API，把流程规则直接编码进系统。

写在最后。Pawel 这期最适合 PM 立刻拿去做一件事：停止收藏 prompt，开始沉淀 workflow。先选一个高频任务，写清规则、输入、输出、反馈记录，让 Claude 下次从已有经验出发。等 Cowork 跑顺，再把项目放进 GitHub，用 Claude Code 和 Dispatch 接上真实工作。未来一年，PM 不一定更轻松，但会少写很多低价值材料，把时间花在判断、调度、验证和取舍上。能把 Claude 接进真实文件、代码库和业务系统的人，会先一步拥有新的工作杠杆，也会更早看见自己的判断边界，知道哪些事交给机器，哪些事自己拍板并承担后果。
"""

struct HomeView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "首页") {
            if let chapter = store.activeHomeChapter {
                HomeChapterContent(store: store, chapter: chapter)
            } else {
                EmptyHomeContent()
            }
        }
        .task(id: store.activeHomeChapter?.id) {
            await store.refreshActiveHomeChapterFromAPI()
        }
    }
}

private struct EmptyHomeContent: View {
    var body: some View {
        VStack(spacing: 10) {
            Spacer()
            Text("每天捡起一枚知识贝壳")
                .font(.system(size: 24, weight: .bold))
            Text("点击底部 + 添加复习内容\n支持文章/视频链接或粘贴文字")
                .font(.system(size: 15))
                .foregroundStyle(ShiBeiTheme.muted)
                .multilineTextAlignment(.center)
                .lineSpacing(5)
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 80)
    }
}

private struct HomeChapterContent: View {
    @ObservedObject var store: AppStore
    let chapter: Chapter

    private var progress: Int {
        chapter.reviewSession.map { session in
            chapter.knowledgePoints.map(\.id).filter { session.masteredThisRoundPointIds.contains($0) }.count
        } ?? chapter.masteredPoints
    }

    private var total: Int {
        max(1, chapter.knowledgePoints.count)
    }

    private var isReviewCompleted: Bool {
        chapter.reviewSession?.status == .completed
    }

    private var statusText: String {
        if chapter.status.isFailed {
            return "生成失败"
        }
        if chapter.status.isProcessing {
            return chapter.visibleStatusText
        }
        if isReviewCompleted {
            return "本章已完成"
        }
        return "当前章节"
    }

    private var primaryButtonTitle: String {
        if chapter.status.isFailed || chapter.status.isProcessing {
            return "查看章节"
        }
        if chapter.reviewSession?.status == .active {
            return "继续复习"
        }
        return "开始复习"
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 4) {
                Text("已掌握知识点")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                Text("\(store.reviewedKnowledgePointCount)")
                    .font(.system(size: 80, weight: .black))
                    .tracking(-4)
                    .foregroundStyle(ShiBeiTheme.primary)
            }
            .padding(.top, 58)
            .padding(.bottom, 32)

            VStack(spacing: 32) {
                SBCard {
                    StatusPill(text: statusText, isDanger: chapter.status.isFailed)
                    Text(chapter.title)
                        .font(.system(size: 16))
                        .lineLimit(2)
                    VStack(spacing: 8) {
                        HStack {
                            Text("已复习 \(progress)/\(total) 个知识点")
                                .foregroundStyle(ShiBeiTheme.muted)
                            Spacer()
                            Text("\(Int((Double(progress) / Double(total)) * 100))%")
                                .font(.system(size: 16, weight: .bold))
                        }
                        ProgressBar(progress: Double(progress) / Double(total))
                    }
                }

                PrimaryButton(
                    title: primaryButtonTitle,
                    systemImage: "arrow.right"
                ) {
                    if chapter.status.isFailed || chapter.status.isProcessing {
                        store.selectChapter(chapter, returnTo: .home)
                    } else {
                        Task {
                            await store.startOrResumeReview(for: chapter)
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            Spacer()
        }
    }
}

struct AddKnowledgeView: View {
    @ObservedObject var store: AppStore
    @State private var input = ""
    @FocusState private var isInputFocused: Bool

    private var chapterInput: ChapterInput {
        ChapterInput.parse(input)
    }

    private func dismissInput() {
        isInputFocused = false
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }

    var body: some View {
        AppScaffold(store: store, title: "添加知识") {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("在此处粘贴您想学习的内容。")
                        .font(.system(size: 15))
                        .foregroundStyle(ShiBeiTheme.muted)

                    SBCard {
                        HStack(spacing: 12) {
                            Image(systemName: "pencil")
                                .frame(width: 34, height: 34)
                                .background(ShiBeiTheme.yellowPale)
                                .clipShape(Circle())
                            Text("输入内容")
                                .font(.system(size: 17, weight: .semibold))
                        }
                        TextEditor(text: $input)
                            .focused($isInputFocused)
                            .onTapGesture {
                                isInputFocused = true
                            }
                            .frame(minHeight: 210)
                            .scrollContentBackground(.hidden)
                            .overlay(alignment: .topLeading) {
                                if input.isEmpty {
                                    Text("粘贴公众号链接/文字")
                                        .foregroundStyle(ShiBeiTheme.faint)
                                        .padding(.top, 8)
                                        .padding(.leading, 5)
                                }
                            }
                        Divider().background(ShiBeiTheme.lineSoft)
                        HStack {
                            Image(systemName: "link")
                            Image(systemName: "square.and.arrow.up")
                            Spacer()
                            Text("\(input.count)/5000")
                                .foregroundStyle(ShiBeiTheme.faint)
                        }
                        if !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            HStack(spacing: 6) {
                                Image(systemName: chapterInput.sourceType == .text ? "doc.text" : "link")
                                Text(chapterInput.displayText)
                            }
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(ShiBeiTheme.textSoft)
                        }
                    }

                    PrimaryButton(
                        title: store.isWritingChapter ? "正在生成" : "开始生成",
                        systemImage: store.isWritingChapter ? "hourglass" : "sparkle",
                        disabled: !chapterInput.canSubmit || store.isWritingChapter
                    ) {
                        let submittedInput = input
                        #if DEBUG
                        print("[ShiBei] AddKnowledgeView tapped generate. inputCount=\(submittedInput.count), canSubmit=\(chapterInput.canSubmit), target=\(store.submissionTargetTitle)")
                        #endif
                        dismissInput()
                        Task {
                            if await store.createChapter(from: submittedInput) {
                                input = ""
                            }
                        }
                    }

                    if !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !chapterInput.canSubmit {
                        Text("正文至少需要 24 个字；链接需要以 http:// 或 https:// 开头。")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(ShiBeiTheme.error)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }

                    Button("填入示例内容") {
                        dismissInput()
                        input = sampleArticleText
                    }
                    .font(.system(size: 14))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .frame(maxWidth: .infinity)

                    Text("视频和播客的分析功能正在开发中")
                        .font(.system(size: 12))
                        .foregroundStyle(ShiBeiTheme.faint)
                        .frame(maxWidth: .infinity, alignment: .center)
                }
                .padding(24)
                .padding(.bottom, 120)
            }
            .scrollDismissesKeyboard(.interactively)
            .safeAreaInset(edge: .bottom) {
                if isInputFocused {
                    HStack {
                        Spacer()
                        Button {
                            dismissInput()
                        } label: {
                            Label("收起键盘", systemImage: "keyboard.chevron.compact.down")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundStyle(ShiBeiTheme.text)
                                .padding(.horizontal, 14)
                                .frame(height: 44)
                                .background(ShiBeiTheme.card)
                                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                                .shadow(color: .black.opacity(0.08), radius: 10, y: 4)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 8)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.easeInOut(duration: 0.16), value: isInputFocused)
        }
    }
}
