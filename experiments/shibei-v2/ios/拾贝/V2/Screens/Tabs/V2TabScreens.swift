import SwiftUI

struct V2TabScaffold<Content: View>: View {
    @Binding var selectedTab: V2HomeTab
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        GeometryReader { geometry in
            let bottomNavScale = min(1, (geometry.size.width - V2Spacing.screenMargin * 2) / 357)

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
                Image("V2MaterialsMascot")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 130)
                    .opacity(0.95)

                V2ChapterCard(
                    title: V2ReviewFixture.chapter.title,
                    status: "复习中",
                    progress: "2 个单元，3 道题目"
                )
                .onTapGesture(perform: openChapter)

                V2ChapterCard(
                    title: "Claude Code hooks：把自动化放进工作流",
                    status: "未复习",
                    progress: "7 个知识点，21 道题目"
                )

                V2ChapterCard(
                    title: "游戏化设计如何改善学习体验",
                    status: "已完成",
                    progress: "完成率 100%"
                )
            }
        }
    }
}

struct V2UploadView: View {
    @Binding var selectedTab: V2HomeTab

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

                V2PrimaryActionButton(title: "生成复习路径") {}
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
                V2InfoCard {
                    HStack(alignment: .center, spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("发现好内容")
                                .font(V2Typography.cardTitle)
                                .foregroundStyle(V2Color.primary)
                            Text("读一篇好文章，也可以马上生成复习路径。")
                                .font(V2Typography.body)
                                .foregroundStyle(V2Color.textSecondary)
                                .lineSpacing(4)
                        }

                        Spacer()

                        Image("V2DiscoverHeroMascot")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 96)
                    }
                }

                HStack(spacing: 10) {
                    V2DiscoverChip(title: "推荐", isSelected: true)
                    V2DiscoverChip(title: "AI", isSelected: false)
                    V2DiscoverChip(title: "产品", isSelected: false)
                }

                V2RecommendedArticleCard(
                    title: "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
                    summary: "从团队协作角度理解 AI Agents 的价值。",
                    action: openArticle
                )

                V2RecommendedArticleCard(
                    title: "DMC 模型如何影响游戏化学习体验",
                    summary: "把动机、机制和反馈串成一套更轻的学习流程。",
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
                V2InfoCard {
                    HStack {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("收藏题目")
                                .font(V2Typography.cardTitle)
                                .foregroundStyle(V2Color.textPrimary)
                            Text("把容易混淆的题目先放在这里。")
                                .font(V2Typography.body)
                                .foregroundStyle(V2Color.textSecondary)
                        }
                        Spacer()
                        Image("V2NotesBookmark")
                            .resizable()
                            .renderingMode(.original)
                            .frame(width: 24, height: 24)
                    }
                }

                ForEach(0..<3, id: \.self) { index in
                    V2InfoCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(index == 0 ? "选择题" : "场景题")
                                .font(V2Typography.label)
                                .foregroundStyle(V2Color.primary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Capsule().fill(Color(hex: 0xF2EFDC)))

                            Text("为什么团队使用 AI Agent 时，需要先补足共享上下文？")
                                .font(V2Typography.bodyEmphasis)
                                .foregroundStyle(V2Color.textPrimary)
                                .lineLimit(2)
                        }
                    }
                }
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
