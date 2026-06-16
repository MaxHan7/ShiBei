import SwiftUI

struct V2TabScaffold<Content: View>: View {
    @Binding var selectedTab: V2HomeTab
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        GeometryReader { geometry in
            let bottomNavScale = min(1, geometry.size.width / 357)

            ZStack(alignment: .top) {
                V2Color.pageGreenBackground
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    Text(title)
                        .font(V2Typography.pageTitle)
                        .foregroundStyle(V2Color.textPrimary)
                        .padding(.top, 34)

                    ScrollView(showsIndicators: false) {
                        content()
                            .padding(.horizontal, V2Spacing.screenMargin)
                            .padding(.top, 28)
                            .padding(.bottom, 128)
                    }
                }

                VStack {
                    Spacer()

                    V2BottomNavigationBar(selectedTab: $selectedTab)
                        .scaleEffect(bottomNavScale, anchor: .bottom)
                        .frame(width: 357 * bottomNavScale, height: 94 * bottomNavScale)
                        .padding(.bottom, max(geometry.safeAreaInsets.bottom, 12))
                }
                .zIndex(20)
            }
        }
    }
}

struct V2MaterialsView: View {
    @Binding var selectedTab: V2HomeTab
    let openChapter: () -> Void

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "全部章节") {
            VStack(spacing: 16) {
                ZStack(alignment: .topTrailing) {
                    V2GeneratedChaptersSummaryCard(count: 12)
                        .padding(.top, 54)

                    Image("V2MaterialsMascot")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 166, height: 137)
                        .offset(x: 10, y: -6)
                        .opacity(0.98)
                        .allowsHitTesting(false)
                }
                .padding(.bottom, 16)

                Button(action: openChapter) {
                    V2ChapterCard(
                        title: V2ReviewFixture.chapter.title,
                        status: .reviewing,
                        source: "网页文章",
                        knowledgeCount: V2ReviewFixture.chapter.units.count,
                        questionCount: V2ReviewFixture.chapter.units.reduce(0) { $0 + $1.questions.count }
                    )
                }
                .buttonStyle(.plain)

                Button(action: openChapter) {
                    V2ChapterCard(
                        title: "Claude Code hooks：把自动化放进工作流",
                        status: .notStarted,
                        source: "网页文章",
                        knowledgeCount: 7,
                        questionCount: 21
                    )
                }
                .buttonStyle(.plain)

                Button(action: openChapter) {
                    V2ChapterCard(
                        title: "游戏化设计如何改善学习体验",
                        status: .completed,
                        source: "网页文章",
                        knowledgeCount: 6,
                        questionCount: 18
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct V2UploadView: View {
    @Binding var selectedTab: V2HomeTab
    let onGenerate: () -> Void

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "上传") {
            VStack(spacing: 22) {
                ZStack {
                    Image("V2UploadMascotBack")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 150)

                    Image("V2UploadMascotFront")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 118)
                        .offset(x: 22, y: 18)
                }

                V2InfoCard {
                    HStack(spacing: 12) {
                        Image("V2UploadLinkIcon")
                            .resizable()
                            .renderingMode(.original)
                            .frame(width: 34, height: 34)

                        Text("粘贴文章链接")
                            .font(V2Typography.bodyEmphasis)
                            .foregroundStyle(V2Color.textMuted)

                        Spacer()
                    }
                }

                V2PrimaryActionButton(title: "生成复习路径", action: onGenerate)
            }
        }
    }
}

struct V2DiscoverView: View {
    @Binding var selectedTab: V2HomeTab
    let openArticle: () -> Void

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "发现") {
            VStack(alignment: .leading, spacing: 20) {
                V2DiscoverHeroCard()

                HStack(spacing: 10) {
                    V2DiscoverChip(title: "全部", isSelected: true)
                    V2DiscoverChip(title: "AI", isSelected: false)
                    V2DiscoverChip(title: "产品", isSelected: false)
                    V2DiscoverChip(title: "金融", isSelected: false)
                }

                V2RecommendedArticleCard(
                    title: "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
                    source: "微信公众号",
                    tags: ["AI", "产品"],
                    action: openArticle
                )

                V2RecommendedArticleCard(
                    title: "DMC 模型如何影响游戏化学习体验",
                    source: "推荐阅读",
                    tags: ["AI", "学习"],
                    action: openArticle
                )
            }
        }
    }
}

struct V2NotesView: View {
    @Binding var selectedTab: V2HomeTab

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "笔记") {
            VStack(spacing: 16) {
                ZStack(alignment: .topTrailing) {
                    V2NotesSummaryCard(count: 7)
                        .padding(.top, 64)

                    Image("V2NotesMascot")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 132)
                        .offset(x: 4, y: 0)
                        .allowsHitTesting(false)
                }
                .padding(.bottom, 12)

                V2SavedQuestionCard(
                    title: "为什么团队使用 AI Agent 时，需要先补足共享上下文？",
                    source: "Anthropic设计总监：为何您的整个团队都应该使用AI Agents协同工作",
                    type: "选择题"
                )

                V2SavedQuestionCard(
                    title: "判断一个反馈来源是否有价值时，最应该先看什么？",
                    source: "产品经理如何把 AI 当作协作同事",
                    type: "场景题"
                )

                V2SavedQuestionCard(
                    title: "DMC 模型里，机制为什么不能脱离动机单独设计？",
                    source: "游戏化设计如何改善学习体验",
                    type: "选择题"
                )
            }
        }
    }
}

struct V2NotificationView: View {
    let onBack: () -> Void

    var body: some View {
        V2FlowScreen(title: "通知", onBack: onBack) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 16) {
                    Image("V2NotificationMascot")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 130)
                        .frame(maxWidth: .infinity, alignment: .trailing)

                    V2NotificationCard(
                        title: "生成完成",
                        message: "新文章已经生成复习路径，可以开始学习。",
                        isSuccess: true
                    )

                    V2NotificationCard(
                        title: "生成失败",
                        message: "文章链接暂时无法解析，请稍后重试。",
                        isSuccess: false
                    )
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.top, 24)
            }
        }
    }
}

struct V2ProfileView: View {
    let onBack: () -> Void

    var body: some View {
        V2FlowScreen(title: "个人主页", onBack: onBack) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    Image("V2MascotStatic")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(height: 128)

                    V2InfoCard {
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                V2ProfileStatCard(value: "35", label: "个知识点", assetName: "V2ProfileStatReviewed")
                                V2ProfileStatCard(value: "7", label: "天连续学习", assetName: "V2ProfileStatStreak")
                            }
                        }
                    }

                    V2InfoCard {
                        VStack(spacing: 0) {
                            V2ProfileSettingRow(title: "通知设置", assetName: "V2ProfileSettingNotification")
                            Divider().opacity(0.4)
                            V2ProfileSettingRow(title: "隐私说明", assetName: "V2ProfileSettingPrivacy")
                            Divider().opacity(0.4)
                            V2ProfileSettingRow(title: "账号说明", assetName: "V2ProfileSettingAccount")
                        }
                    }
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.top, 24)
            }
        }
    }
}
