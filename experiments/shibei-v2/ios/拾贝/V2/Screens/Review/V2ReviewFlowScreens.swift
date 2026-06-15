import SwiftUI

struct V2ChapterOverviewView: View {
    let chapter: V2ReviewChapterData
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "章节概要", onBack: onBack) {
            VStack(spacing: 36) {
                Spacer(minLength: 42)

                ZStack(alignment: .top) {
                    Image("V2SummaryMascotBodyLayer")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(height: 260)
                        .offset(y: -92)
                        .opacity(0.96)
                        .zIndex(0)

                    V2InfoCard {
                        Text(chapter.overview)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(V2Color.textSecondary)
                            .lineSpacing(8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(.top, 100)
                    .zIndex(1)

                    Image("V2SummaryMascotHandsLayer")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 220)
                        .offset(y: 76)
                        .zIndex(2)
                }
                .padding(.horizontal, V2Spacing.screenMargin)

                Spacer()

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .padding(.horizontal, 44)
                    .padding(.bottom, 34)
            }
        }
    }
}

struct V2UnitOverviewView: View {
    let unit: V2ReviewUnitData
    let progress: (current: Int, total: Int)
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "核心知识点", onBack: onBack) {
            VStack(spacing: 30) {
                V2UnitProgressBar(current: progress.current, total: progress.total)
                    .padding(.top, 18)

                Spacer(minLength: 16)

                ZStack(alignment: .bottomTrailing) {
                    VStack(spacing: 0) {
                        V2InfoCard(shadow: nil, border: V2Color.borderSoftGreen.opacity(0.8)) {
                            VStack(alignment: .leading, spacing: 18) {
                                Text(unit.title)
                                    .font(V2Typography.cardTitle)
                                    .foregroundStyle(V2Color.textPrimary)

                                Text(unit.overview)
                                    .font(.system(size: 20, weight: .medium))
                                    .foregroundStyle(V2Color.textSecondary)
                                    .lineSpacing(7)
                            }
                        }

                        HStack(spacing: 96) {
                            Capsule()
                                .fill(V2Color.primary.opacity(0.45))
                                .frame(width: 38, height: 5)
                                .rotationEffect(.degrees(58))

                            Capsule()
                                .fill(V2Color.primary.opacity(0.45))
                                .frame(width: 38, height: 5)
                                .rotationEffect(.degrees(-58))
                        }
                        .offset(y: -2)
                    }
                    .zIndex(1)

                    Image("V2UnitOverviewMascot")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 124)
                        .offset(x: 18, y: 58)
                        .zIndex(2)
                }
                .padding(.horizontal, V2Spacing.screenMargin)

                Spacer()

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .padding(.horizontal, 44)
                    .padding(.bottom, 34)
            }
        }
    }
}

struct V2MultipleChoiceQuestionView: View {
    let question: V2ReviewQuestionData
    let progress: (current: Int, total: Int)
    let onBack: () -> Void
    let onSource: () -> Void
    let onContinue: () -> Void

    @State private var selectedIndex: Int?

    var body: some View {
        V2FlowScreen(
            title: question.title,
            showSourceButton: true,
            onBack: onBack,
            onSource: onSource
        ) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    V2UnitProgressBar(current: progress.current, total: progress.total)
                        .padding(.top, 18)

                    V2InfoCard {
                        Text(question.prompt)
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(V2Color.textPrimary)
                            .lineSpacing(6)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    VStack(spacing: 12) {
                        ForEach(question.options.indices, id: \.self) { index in
                            V2QuestionOptionCard(
                                title: question.options[index],
                                state: optionState(for: index)
                            ) {
                                guard selectedIndex == nil else { return }
                                selectedIndex = index
                            }
                        }
                    }

                    if let selectedIndex {
                        V2AnswerFeedbackPanel(
                            text: question.feedback,
                            isCorrect: selectedIndex == question.correctOptionIndex,
                            onContinue: onContinue
                        )
                        .padding(.top, 4)
                    }
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.bottom, 34)
            }
        }
    }

    private func optionState(for index: Int) -> V2QuestionOptionState {
        guard let selectedIndex else { return .normal }
        if index == question.correctOptionIndex {
            return .correct
        }
        if index == selectedIndex {
            return .wrong
        }
        return .normal
    }
}

private enum V2MatchingSide {
    case left
    case right
}

private struct V2MatchingSelection: Equatable {
    let side: V2MatchingSide
    let pairID: String
}

struct V2MatchingQuestionView: View {
    let question: V2ReviewQuestionData
    let progress: (current: Int, total: Int)
    let onBack: () -> Void
    let onSource: () -> Void
    let onContinue: () -> Void

    @State private var selected: V2MatchingSelection?
    @State private var leftStates: [String: V2MatchingOptionState] = [:]
    @State private var rightStates: [String: V2MatchingOptionState] = [:]

    var body: some View {
        V2FlowScreen(
            title: question.title,
            showSourceButton: true,
            onBack: onBack,
            onSource: onSource
        ) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 18) {
                    V2UnitProgressBar(current: progress.current, total: progress.total)
                        .padding(.top, 18)

                    V2InfoCard {
                        Text(question.prompt)
                            .font(.system(size: 19, weight: .semibold))
                            .foregroundStyle(V2Color.textPrimary)
                            .lineSpacing(6)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack(alignment: .top, spacing: 12) {
                        VStack(spacing: 12) {
                            ForEach(question.matchingPairs) { pair in
                                V2MatchingOptionCard(
                                    title: pair.left,
                                    state: state(for: pair.id, side: .left)
                                ) {
                                    handleTap(pairID: pair.id, side: .left)
                                }
                            }
                        }

                        VStack(spacing: 12) {
                            ForEach(question.matchingPairs.reversed()) { pair in
                                V2MatchingOptionCard(
                                    title: pair.right,
                                    state: state(for: pair.id, side: .right)
                                ) {
                                    handleTap(pairID: pair.id, side: .right)
                                }
                            }
                        }
                    }

                    if isComplete {
                        V2AnswerFeedbackPanel(
                            text: question.feedback,
                            isCorrect: true,
                            onContinue: onContinue
                        )
                    }
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.bottom, 34)
            }
        }
    }

    private var isComplete: Bool {
        question.matchingPairs.allSatisfy {
            leftStates[$0.id] == .locked && rightStates[$0.id] == .locked
        }
    }

    private func state(for pairID: String, side: V2MatchingSide) -> V2MatchingOptionState {
        switch side {
        case .left:
            leftStates[pairID] ?? .normal
        case .right:
            rightStates[pairID] ?? .normal
        }
    }

    private func setState(_ state: V2MatchingOptionState, pairID: String, side: V2MatchingSide) {
        switch side {
        case .left:
            leftStates[pairID] = state
        case .right:
            rightStates[pairID] = state
        }
    }

    private func handleTap(pairID: String, side: V2MatchingSide) {
        guard state(for: pairID, side: side) != .locked else { return }

        let current = V2MatchingSelection(side: side, pairID: pairID)

        guard let selected else {
            self.selected = current
            setState(.selected, pairID: pairID, side: side)
            return
        }

        if selected.side == side {
            setState(.normal, pairID: selected.pairID, side: selected.side)
            self.selected = current
            setState(.selected, pairID: pairID, side: side)
            return
        }

        let isCorrect = selected.pairID == pairID
        let first = selected
        self.selected = nil

        setState(isCorrect ? .correct : .wrong, pairID: first.pairID, side: first.side)
        setState(isCorrect ? .correct : .wrong, pairID: pairID, side: side)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            setState(isCorrect ? .locked : .normal, pairID: first.pairID, side: first.side)
            setState(isCorrect ? .locked : .normal, pairID: pairID, side: side)
        }
    }
}

struct V2UnitSummaryView: View {
    let unit: V2ReviewUnitData
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "单元总结", onBack: onBack) {
            VStack(spacing: 34) {
                Spacer(minLength: 42)

                V2UnitCompletionHero(unit: unit)
                    .padding(.horizontal, V2Spacing.screenMargin)

                Spacer()

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .padding(.horizontal, 44)
                    .padding(.bottom, 34)
            }
        }
    }
}

private struct V2UnitCompletionHero: View {
    let unit: V2ReviewUnitData

    var body: some View {
        ZStack(alignment: .center) {
            Image("V2MascotCompletion")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(height: 230)
                .offset(y: -34)
                .zIndex(0)

            V2InfoCard {
                VStack(spacing: 10) {
                    ZStack {
                        Image("V2CompletionGradeRays")
                            .resizable()
                            .renderingMode(.original)
                            .scaledToFit()
                            .frame(width: 122)

                        Text("单元完成")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(V2Color.primary)
                    }

                    Text(unit.completionMessage)
                        .font(.system(size: 21, weight: .medium))
                        .foregroundStyle(V2Color.textSecondary)
                        .lineSpacing(7)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 4)
            }
            .padding(.top, 132)
            .zIndex(1)
        }
        .frame(height: 360)
    }
}

struct V2ChapterSummaryView: View {
    let chapter: V2ReviewChapterData
    let onBack: () -> Void
    let onHome: () -> Void
    let onDetail: () -> Void

    var body: some View {
        V2FlowScreen(title: "章节总结", onBack: onBack) {
            VStack(spacing: 30) {
                Spacer(minLength: 26)

                V2ChapterCompletionHero(chapter: chapter)
                    .padding(.horizontal, V2Spacing.screenMargin)

                Spacer()

                VStack(spacing: 18) {
                    V2PrimaryActionButton(title: "返回主页", action: onHome)

                    Button(action: onDetail) {
                        Text("查看章节详情")
                            .font(V2Typography.bodyEmphasis)
                            .foregroundStyle(V2Color.primary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 44)
                .padding(.bottom, 34)
            }
        }
    }
}

private struct V2ChapterCompletionHero: View {
    let chapter: V2ReviewChapterData

    var body: some View {
        ZStack(alignment: .center) {
            Image("V2ChapterCompletionMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(height: 300)
                .offset(y: -56)
                .zIndex(0)

            V2InfoCard {
                VStack(spacing: 12) {
                    ZStack {
                        Image("V2ChapterCompletionTitleRays")
                            .resizable()
                            .renderingMode(.original)
                            .scaledToFit()
                            .frame(width: 137)

                        Text("章节完成")
                            .font(.system(size: 30, weight: .bold))
                            .foregroundStyle(Color(hex: 0xF5C64F))
                    }

                    Text("共 \(chapter.units.count) 个核心知识点，\(chapter.units.reduce(0) { $0 + $1.questions.count }) 道题目")
                        .font(V2Typography.label)
                        .foregroundStyle(V2Color.textMuted)

                    Text("你已经走完了这篇文章的复习路径，可以回到主页继续下一篇。")
                        .font(.system(size: 21, weight: .medium))
                        .foregroundStyle(V2Color.textSecondary)
                        .lineSpacing(7)
                        .multilineTextAlignment(.center)
                        .padding(.top, 12)
                }
            }
            .padding(.top, 174)
            .zIndex(1)
        }
        .frame(height: 430)
    }
}

struct V2SourceArticleView: View {
    let question: V2ReviewQuestionData?
    let onBack: () -> Void

    var body: some View {
        V2FlowScreen(title: "查看原文", onBack: onBack) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 18) {
                    Text(V2ReviewFixture.chapter.sourceTitle)
                        .font(V2Typography.cardTitle)
                        .foregroundStyle(V2Color.textPrimary)

                    Text(question?.sourceExcerpt ?? V2ReviewFixture.chapter.overview)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(V2Color.textSecondary)
                        .lineSpacing(8)

                    Text("这里后续会接入完整原文，并按当前题目的 source anchor 自动滚动到相关段落。")
                        .font(V2Typography.body)
                        .foregroundStyle(V2Color.textMuted)
                        .lineSpacing(5)
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .v2Shadow()
                )
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.top, 28)
            }
        }
    }
}

struct V2ChapterDetailView: View {
    let onBack: () -> Void

    var body: some View {
        V2FlowScreen(title: "章节详情", onBack: onBack) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 16) {
                    V2InfoCard {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(V2ReviewFixture.chapter.title)
                                .font(V2Typography.cardTitle)
                                .foregroundStyle(V2Color.textPrimary)
                            Text(V2ReviewFixture.chapter.overview)
                                .font(V2Typography.body)
                                .foregroundStyle(V2Color.textSecondary)
                                .lineSpacing(5)
                        }
                    }

                    ForEach(V2ReviewFixture.chapter.units) { unit in
                        V2ChapterCard(
                            title: unit.title,
                            status: "知识点",
                            progress: "\(unit.questions.count) 道题目"
                        )
                    }
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.top, 28)
            }
        }
    }
}

struct V2RecommendedArticleDetailView: View {
    let onBack: () -> Void
    let onGenerate: () -> Void

    var body: some View {
        V2FlowScreen(title: "推荐阅读", onBack: onBack) {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 20) {
                    V2RecommendedArticleCard(
                        title: V2ReviewFixture.chapter.title,
                        summary: "这篇推荐文章可以直接生成一套 V2 复习路径。",
                        action: {}
                    )

                    V2InfoCard {
                        Text("这里后续会呈现推荐文章正文。测试版本先用预生成 fixture 模拟一键生成完成，然后进入首页学习路径。")
                            .font(V2Typography.body)
                            .foregroundStyle(V2Color.textSecondary)
                            .lineSpacing(6)
                    }

                    V2PrimaryActionButton(title: "生成复习路径", action: onGenerate)
                }
                .padding(.horizontal, V2Spacing.screenMargin)
                .padding(.top, 28)
            }
        }
    }
}
