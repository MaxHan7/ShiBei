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
                        .foregroundStyle(V2Color.topTitle)
                        .padding(.top, 34)

                    ScrollView(showsIndicators: false) {
                        content()
                            .v2PageContentWidth()
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
                        .padding(.bottom, V2BottomNavPlacement.bottomPadding)
                }
                .zIndex(20)
            }
            .ignoresSafeArea(.keyboard, edges: .bottom)
        }
    }
}

struct V2MaterialsView: View {
    @Binding var selectedTab: V2HomeTab
    let showsGeneratingChapterCard: Bool
    let generatingChapterTitle: String
    let generatingProgressText: String
    let generatedChapter: V2ReviewChapterData?
    let openGeneratingChapter: () -> Void
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

                if showsGeneratingChapterCard {
                    Button(action: openGeneratingChapter) {
                        V2ChapterCard(
                            title: generatingChapterTitle,
                            status: .generating,
                            source: "网页文章",
                            knowledgeCount: 0,
                            questionCount: 0,
                            generationProgressText: generatingProgressText
                        )
                    }
                    .buttonStyle(.plain)
                    .transition(.move(edge: .top).combined(with: .opacity))
                }

                if let generatedChapter {
                    Button(action: openChapter) {
                        V2ChapterCard(
                            title: generatedChapter.title,
                            status: .notStarted,
                            source: generatedChapter.sourceURL.isEmpty ? "粘贴文字" : "网页文章",
                            knowledgeCount: generatedChapter.units.count,
                            questionCount: generatedChapter.units.reduce(0) { $0 + $1.questions.count }
                        )
                    }
                    .buttonStyle(.plain)
                }

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

struct V2GeneratingChapterDetailView: View {
    let progress: Double
    let statusText: String
    let isCompleted: Bool
    let onBack: () -> Void
    let onSource: () -> Void
    let onOpenChapter: () -> Void

    var body: some View {
        V2FlowScreen(
            title: "章节详情",
            onBack: onBack
        ) {
            GeometryReader { geometry in
                ZStack(alignment: .topLeading) {
                    generatingDetailDecorations(in: geometry.size)

                    Image("V2GeneratingChapterMascot")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 275, height: 255)
                        .position(x: geometry.size.width / 2 - 3, y: 174.5)
                        .allowsHitTesting(false)
                        .zIndex(1)

                    V2GeneratingChapterDetailCard(
                        progress: CGFloat(progress),
                        statusText: statusText,
                        isCompleted: isCompleted,
                        onSource: onSource,
                        onOpenChapter: onOpenChapter
                    )
                    .position(x: geometry.size.width / 2, y: 432.5)
                    .zIndex(2)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(height: 760)
        }
    }

    @ViewBuilder
    private func generatingDetailDecorations(in size: CGSize) -> some View {
        Image("V2BgDecoSmallPlantCluster")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 59.5)
            .opacity(0.64)
            .position(x: size.width - 24, y: 631)
            .allowsHitTesting(false)

        Image("V2BgDecoLeftHillPlant")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 108.5)
            .opacity(0.52)
            .position(x: 37, y: 730)
            .allowsHitTesting(false)
    }
}

struct V2UploadView: View {
    @Binding var selectedTab: V2HomeTab
    let isGenerating: Bool
    let onGenerate: (String) -> Void
    @State private var sourceText = ""
    @State private var validationMessage = ""

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "上传") {
            ZStack(alignment: .top) {
                V2UploadBackgroundDecorations()
                    .allowsHitTesting(false)

                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture {
                        V2Keyboard.dismiss()
                    }

                VStack(spacing: V2UploadPageMetrics.verticalSpacing) {
                    V2UploadMascotInputGroup(urlText: $sourceText)
                        .padding(.top, V2UploadPageMetrics.groupTopPadding)

                    Text("播客与视频功能即将上线")
                        .font(V2Typography.label)
                        .foregroundStyle(V2Color.primaryAction)

                    V2PrimaryActionButton(
                        title: isGenerating ? "正在生成中" : "开始生成",
                        tone: isGenerating ? .disabled : .normal
                    ) {
                        guard !isGenerating else {
                            return
                        }
                        let trimmed = sourceText.trimmingCharacters(in: .whitespacesAndNewlines)
                        guard !trimmed.isEmpty else {
                            validationMessage = "请先粘贴文章链接或正文"
                            return
                        }
                        validationMessage = ""
                        onGenerate(trimmed)
                    }

                    if !validationMessage.isEmpty {
                        Text(validationMessage)
                            .font(V2Typography.label)
                            .foregroundStyle(V2Color.feedbackWrongBorder)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            }
            .frame(minHeight: V2UploadPageMetrics.contentHeight, alignment: .top)
        }
    }
}

private struct V2UploadMascotInputGroup: View {
    @Binding var urlText: String

    var body: some View {
        GeometryReader { proxy in
            let width = min(proxy.size.width, V2UploadMascotInputMetrics.maxWidth)

            ZStack(alignment: .top) {
                Image("V2UploadMascotBack")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: V2UploadMascotInputMetrics.backWidth)
                    .position(
                        x: width * V2UploadMascotInputMetrics.backCenterXRatio,
                        y: V2UploadMascotInputMetrics.backCenterY
                    )
                    .zIndex(0)

                V2UploadLinkInputCard(urlText: $urlText)
                    .frame(width: width, height: V2UploadInputCardMetrics.cardHeight)
                    .position(
                        x: width / 2,
                        y: V2UploadMascotInputMetrics.cardCenterY
                    )
                    .zIndex(1)

                Image("V2UploadMascotFront")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: V2UploadMascotInputMetrics.frontWidth)
                    .position(
                        x: width * V2UploadMascotInputMetrics.frontCenterXRatio,
                        y: V2UploadMascotInputMetrics.frontCenterY
                    )
                    .zIndex(2)
            }
            .frame(width: width, height: V2UploadMascotInputMetrics.groupHeight)
            .frame(maxWidth: .infinity)
        }
        .frame(height: V2UploadMascotInputMetrics.groupHeight)
    }
}

private struct V2UploadLinkInputCard: View {
    @Binding var urlText: String
    @FocusState private var isURLFieldFocused: Bool

    var body: some View {
        VStack(alignment: .center, spacing: V2UploadInputCardMetrics.titleToFieldSpacing) {
            Text("添加学习内容")
                .font(V2UploadInputCardMetrics.titleFont)
                .foregroundStyle(V2UploadInputCardMetrics.titleColor)
                .frame(maxWidth: .infinity)

            HStack(spacing: V2UploadInputCardMetrics.fieldContentSpacing) {
                Image("V2UploadLinkIcon")
                    .resizable()
                    .renderingMode(.original)
                    .frame(
                        width: V2UploadInputCardMetrics.linkIconSize,
                        height: V2UploadInputCardMetrics.linkIconSize
                    )

                TextField(text: $urlText) {
                    Text("粘贴文章链接")
                        .font(V2UploadInputCardMetrics.placeholderFont)
                        .foregroundStyle(V2UploadInputCardMetrics.placeholderColor)
                }
                    .font(V2UploadInputCardMetrics.placeholderFont)
                    .foregroundStyle(V2UploadInputCardMetrics.inputTextColor)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .submitLabel(.done)
                    .focused($isURLFieldFocused)
                    .onSubmit {
                        isURLFieldFocused = false
                    }

                Spacer(minLength: 0)
            }
            .padding(.horizontal, V2UploadInputCardMetrics.fieldHorizontalPadding)
            .frame(height: V2UploadInputCardMetrics.fieldHeight)
            .background(
                RoundedRectangle(cornerRadius: V2UploadInputCardMetrics.fieldRadius, style: .continuous)
                    .fill(V2UploadInputCardMetrics.fieldFill)
                    .overlay(
                        RoundedRectangle(cornerRadius: V2UploadInputCardMetrics.fieldRadius, style: .continuous)
                            .stroke(V2Color.borderSoftGreen.opacity(0.8), lineWidth: 1)
                    )
            )
        }
        .padding(V2UploadInputCardMetrics.outerPadding)
        .frame(maxWidth: .infinity)
        .frame(height: V2UploadInputCardMetrics.cardHeight)
        .background(
            RoundedRectangle(cornerRadius: V2UploadInputCardMetrics.cardRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2UploadBackgroundDecorations: View {
    var body: some View {
        GeometryReader { proxy in
            Image("V2BgDecoLeftHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 114, height: 85)
                .position(x: 20, y: 134)
                .opacity(0.72)

            Image("V2BgDecoRightHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 105, height: 57)
                .position(x: proxy.size.width - 6, y: 128)
                .opacity(0.72)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 62, height: 56)
                .position(x: proxy.size.width - 2, y: 392)
                .opacity(0.72)
        }
    }
}

private enum V2UploadPageMetrics {
    static let groupTopPadding: CGFloat = 28
    static let verticalSpacing: CGFloat = 22
    static let contentHeight: CGFloat = 520
}

private enum V2Keyboard {
    static func dismiss() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

private enum V2UploadMascotInputMetrics {
    static let maxWidth: CGFloat = 321
    static let backWidth: CGFloat = 93
    static let frontWidth: CGFloat = 69
    static let groupHeight: CGFloat = 230
    static let backCenterXRatio: CGFloat = 0.808
    static let backCenterY: CGFloat = 84
    static let frontCenterXRatio: CGFloat = 0.796
    static let frontCenterY: CGFloat = 85
    static let cardCenterY: CGFloat = 156
}

private enum V2UploadInputCardMetrics {
    static let cardHeight: CGFloat = 148
    static let outerPadding: CGFloat = 18
    static let cardRadius: CGFloat = 20
    static let titleFont = Font.system(size: 16, weight: .regular)
    static let titleColor = Color(hex: 0x575757)
    static let titleToFieldSpacing: CGFloat = 20
    static let fieldHeight: CGFloat = 55
    static let fieldRadius: CGFloat = 15
    static let fieldHorizontalPadding: CGFloat = 15
    static let fieldContentSpacing: CGFloat = 12
    static let linkIconSize: CGFloat = 34
    static let placeholderFont = Font.system(size: 12, weight: .regular)
    static let placeholderColor = Color(hex: 0xB7B7B7)
    static let inputTextColor = Color(hex: 0x575757)
    static let fieldFill = Color(hex: 0xFFFBF6)
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
    let onOpenSavedQuestion: (Int) -> Void

    var body: some View {
        V2TabScaffold(selectedTab: $selectedTab, title: "笔记") {
            ZStack(alignment: .topLeading) {
                V2NotesBackgroundDecorations()
                    .zIndex(0)
                    .allowsHitTesting(false)

                V2NotesSummaryCard(count: 20)
                    .offset(y: V2NotesPageMetrics.summaryY)
                    .zIndex(2)

                Image("V2NotesMascot")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: V2NotesPageMetrics.mascotWidth, height: V2NotesPageMetrics.mascotHeight)
                    .offset(x: V2NotesPageMetrics.mascotX, y: V2NotesPageMetrics.mascotY)
                    .allowsHitTesting(false)
                    .zIndex(4)

                ForEach(Array(V2ReviewFixture.savedQuestions.enumerated()), id: \.element.id) { index, savedQuestion in
                    Button {
                        onOpenSavedQuestion(index)
                    } label: {
                        V2SavedQuestionCard(
                            title: savedQuestion.title,
                            source: savedQuestion.source,
                            type: savedQuestion.type
                        )
                    }
                    .buttonStyle(.plain)
                    .offset(y: V2NotesPageMetrics.cardY(for: index))
                    .zIndex(2)
                }
            }
            .frame(width: V2Layout.contentMaxWidth, height: V2NotesPageMetrics.contentHeight, alignment: .topLeading)
        }
    }
}

private struct V2NotesBackgroundDecorations: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            Image("V2BgDecoLeftHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2NotesPageMetrics.leftDecorationWidth)
                .offset(x: V2NotesPageMetrics.leftDecorationX, y: V2NotesPageMetrics.leftDecorationY)

            Image("V2BgDecoRightHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2NotesPageMetrics.rightTopDecorationWidth)
                .offset(x: V2NotesPageMetrics.rightTopDecorationX, y: V2NotesPageMetrics.rightTopDecorationY)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2NotesPageMetrics.rightMidDecorationWidth)
                .offset(x: V2NotesPageMetrics.rightMidDecorationX, y: V2NotesPageMetrics.rightMidDecorationY)
        }
        .opacity(V2NotesPageMetrics.decorationOpacity)
    }
}

private enum V2NotesPageMetrics {
    static let summaryY: CGFloat = 32
    static let mascotX: CGFloat = 206
    static let mascotY: CGFloat = -12
    static let mascotWidth: CGFloat = 92.63
    static let mascotHeight: CGFloat = 125.58
    static let firstCardY: CGFloat = 142
    static let cardGap: CGFloat = 19
    static let cardHeight: CGFloat = 136
    static let secondCardY: CGFloat = firstCardY + cardHeight + cardGap
    static let thirdCardY: CGFloat = secondCardY + cardHeight + cardGap
    static let contentHeight: CGFloat = thirdCardY + cardHeight + 24
    static func cardY(for index: Int) -> CGFloat {
        firstCardY + CGFloat(index) * (cardHeight + cardGap)
    }
    static let decorationOpacity: Double = 0.66
    static let leftDecorationWidth: CGFloat = 113
    static let leftDecorationX: CGFloat = -62
    static let leftDecorationY: CGFloat = 298
    static let rightTopDecorationWidth: CGFloat = 104
    static let rightTopDecorationX: CGFloat = 246
    static let rightTopDecorationY: CGFloat = 82
    static let rightMidDecorationWidth: CGFloat = 62
    static let rightMidDecorationX: CGFloat = 290
    static let rightMidDecorationY: CGFloat = 360
}

struct V2NotificationView: View {
    let onBack: () -> Void
    let onOpenSuccess: () -> Void
    let onOpenFailure: () -> Void

    var body: some View {
        V2FlowScreen(
            title: "通知",
            onBack: onBack
        ) {
            GeometryReader { geometry in
                ZStack(alignment: .topLeading) {
                    notificationDecoration(
                        name: "V2BgDecoLeftHillPlant",
                        width: 109,
                        x: -8,
                        y: 222
                    )

                    notificationDecoration(
                        name: "V2BgDecoLeftHillPlant",
                        width: 109,
                        x: -6,
                        y: 588
                    )

                    notificationDecoration(
                        name: "V2BgDecoRightHillPlant",
                        width: 104,
                        x: 98,
                        y: 213
                    )

                    notificationDecoration(
                        name: "V2BgDecoSmallPlantCluster",
                        width: 60,
                        x: geometry.size.width - 53,
                        y: 427
                    )

                    VStack(spacing: 22) {
                        V2NotificationSummaryBanner(unreadCount: 2)

                        V2NotificationCard(
                            title: "章节已生成",
                            message: "《如何把AI Agent用到你的生意经》已准备好，可以开始学习",
                            isSuccess: true,
                            action: onOpenSuccess
                        )

                        V2NotificationCard(
                            title: "生成失败",
                            message: "章节生成失败，点击查看具体原因",
                            isSuccess: false,
                            action: onOpenFailure
                        )
                    }
                    .frame(width: V2Layout.contentMaxWidth)
                    .position(
                        x: geometry.size.width / 2,
                        y: 36 + (82 + 22 + 108 * 2 + 22 * 2) / 2
                    )
                    .zIndex(3)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(height: 760)
        }
    }

    private func notificationDecoration(
        name: String,
        width: CGFloat,
        x: CGFloat,
        y: CGFloat
    ) -> some View {
        Image(name)
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: width)
            .opacity(0.74)
            .offset(x: x, y: y)
            .allowsHitTesting(false)
            .zIndex(0)
    }
}

struct V2NotificationFailureDetailView: View {
    let onBack: () -> Void
    let onSource: () -> Void
    let onRegenerate: () -> Void

    var body: some View {
        V2FlowScreen(
            title: "通知详情",
            onBack: onBack
        ) {
            GeometryReader { geometry in
                ZStack(alignment: .topLeading) {
                    failureDetailDecorations(in: geometry.size)

                    Image("V2NotificationFailureDetailMascot")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 188, height: 206)
                        .position(x: geometry.size.width / 2 + 3, y: 164)
                        .zIndex(1)

                    V2NotificationFailureDetailCard(
                        onSource: onSource,
                        onRegenerate: onRegenerate
                    )
                        .position(x: geometry.size.width / 2, y: 402)
                        .zIndex(2)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }
            .frame(height: 760)
        }
    }

    @ViewBuilder
    private func failureDetailDecorations(in size: CGSize) -> some View {
        Image("V2BgDecoSmallPlantCluster")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 60)
            .opacity(0.72)
            .offset(x: size.width - 52, y: 420)
            .allowsHitTesting(false)

        Image("V2BgDecoLeftHillPlant")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(width: 109)
            .opacity(0.66)
            .offset(x: -6, y: 500)
            .allowsHitTesting(false)
    }
}

private struct V2NotificationFailureDetailCard: View {
    let onSource: () -> Void
    let onRegenerate: () -> Void

    private let failureAccent = Color(hex: 0xF69582)
    private let failureTitle = Color(hex: 0x575757)
    private let failureBody = Color(hex: 0x69655F)
    private let failureAccentShadow = V2ShadowSpec(
        color: Color(hex: 0xF69582).opacity(0.2),
        radius: 2,
        x: 0,
        y: 4
    )

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            HStack(alignment: .top, spacing: 18) {
                Image("V2NotificationFailureDetailIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 34, height: 34)

                Text("章节生成失败")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(failureTitle)
                    .padding(.top, 5)
            }
            .padding(.leading, 23)
            .padding(.top, 28)

            V2NotificationFailureSourceButton(
                accent: failureAccent,
                shadow: failureAccentShadow,
                action: onSource
            )
            .position(x: 249, y: 45)

            V2NotificationFailureReasonCard()
                .position(x: 163, y: 150)

            Button(action: onRegenerate) {
                Text("重新生成")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 207, height: 28)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(failureAccent)
                            .v2Shadow(failureAccentShadow)
                    )
            }
            .buttonStyle(.plain)
            .position(x: 160.5, y: 237)
        }
        .frame(width: V2Layout.contentMaxWidth, height: 277)
    }
}

private struct V2NotificationFailureSourceButton: View {
    let accent: Color
    let shadow: V2ShadowSpec
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                ZStack {
                    Circle()
                        .fill(accent)
                        .frame(width: 23, height: 23)

                    Image(systemName: "link")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(V2Color.surfaceCream)
                }

                Text("原文链接")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(accent)
            }
            .padding(.leading, 7)
            .padding(.trailing, 9)
            .frame(height: 34)
            .background(
                Capsule()
                    .fill(V2Color.feedbackWrongFill)
                    .v2Shadow(shadow)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("打开原文链接")
    }
}

private struct V2NotificationFailureReasonCard: View {
    private let failureAccent = Color(hex: 0xF69582)
    private let failureTitle = Color(hex: 0x575757)
    private let failureBody = Color(hex: 0x69655F)
    private let failureAccentShadow = V2ShadowSpec(
        color: Color(hex: 0xF69582).opacity(0.2),
        radius: 2,
        x: 0,
        y: 4
    )

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow(failureAccentShadow)

            Image("V2NotificationFailureReasonIcon")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 23, height: 24)
                .position(x: 28, y: 32)

            Circle()
                .fill(failureAccent)
                .frame(width: 5, height: 5)
                .position(x: 28.5, y: 59)

            VStack(alignment: .leading, spacing: 8) {
                Text("失败原因")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(failureTitle)

                Text("当前链接正文提取失败，可能是网页暂时无法访问，或正文格式还不支持。")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(failureBody)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 204, alignment: .leading)
            .padding(.leading, 55)
            .padding(.top, 23)
        }
        .frame(width: 280, height: 95)
    }
}

struct V2ProfileView: View {
    let onBack: () -> Void

    var body: some View {
        ZStack {
            V2Color.pageGreenBackground
                .ignoresSafeArea()

            GeometryReader { geometry in
                Image("V2BgDecoLeftHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 108)
                    .opacity(0.66)
                    .position(x: 38, y: 405)

                Image("V2BgDecoLeftHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 105)
                    .opacity(0.66)
                    .position(x: 52, y: max(520, geometry.size.height - 160))
            }
            .ignoresSafeArea()

            VStack(spacing: 0) {
                V2ProfileTopBar(onBack: onBack)
                    .padding(.top, 22)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        V2ProfileHeaderCard(
                            name: "Cappy",
                            bio: "这里是我的自我介绍~",
                            reviewedCount: "35",
                            streakDays: "7"
                        )

                        V2ProfileSettingsCard()
                    }
                    .frame(maxWidth: V2Layout.contentMaxWidth)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 24)
                    .padding(.bottom, 40)
                }
            }
        }
    }
}
