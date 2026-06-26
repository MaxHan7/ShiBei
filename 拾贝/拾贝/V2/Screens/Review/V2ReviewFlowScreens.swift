import SwiftUI
import UIKit

struct V2ChapterOverviewView: View {
    let chapter: V2ReviewChapterData
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "章节概要", onBack: onBack) {
            ZStack(alignment: .top) {
                Image("V2SummaryMascotBodyLayer")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(
                        width: V2ChapterOverviewPageMetrics.mascotBodyWidth,
                        height: V2ChapterOverviewPageMetrics.mascotBodyHeight
                    )
                    .offset(y: V2ChapterOverviewPageMetrics.mascotBodyY)
                    .opacity(0.96)
                    .zIndex(0)

                V2ChapterOverviewSummaryCard(text: chapter.overview)
                .offset(y: V2ChapterOverviewPageMetrics.cardY)
                .zIndex(1)

                Image("V2SummaryMascotHandsLayer")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(
                        width: V2ChapterOverviewPageMetrics.mascotHandsWidth,
                        height: V2ChapterOverviewPageMetrics.mascotHandsHeight
                    )
                    .offset(y: V2ChapterOverviewPageMetrics.mascotHandsY)
                    .zIndex(2)

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .frame(width: V2Layout.primaryActionWidth)
                    .offset(y: V2Layout.primaryActionBottomY)
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2ChapterOverviewPageMetrics.contentHeight, alignment: .top)
        }
    }
}

private enum V2ChapterOverviewPageMetrics {
    static let mascotBodyWidth: CGFloat = 377
    static let mascotBodyHeight: CGFloat = 546
    static let mascotBodyY: CGFloat = 36
    static let cardWidth: CGFloat = 303
    static let cardHeight: CGFloat = 212
    static let cardY: CGFloat = 272
    static let cardCornerRadius: CGFloat = 15
    static let cardTextWidth: CGFloat = 255
    static let cardTextHeight: CGFloat = 175
    static let cardTextX: CGFloat = 24
    static let cardTextY: CGFloat = 21
    static let mascotHandsWidth: CGFloat = 276.5
    static let mascotHandsHeight: CGFloat = 60
    static let mascotHandsY: CGFloat = 251
    static let contentHeight: CGFloat = 792
}

private struct V2ChapterOverviewSummaryCard: View {
    let text: String

    var body: some View {
        RoundedRectangle(cornerRadius: V2ChapterOverviewPageMetrics.cardCornerRadius, style: .continuous)
            .fill(V2Color.surfaceCream)
            .v2Shadow(V2Shadow.softGreen)
            .frame(
                width: V2ChapterOverviewPageMetrics.cardWidth,
                height: V2ChapterOverviewPageMetrics.cardHeight
            )
            .overlay(alignment: .topLeading) {
                Text(text)
                    .font(.system(size: 16, weight: .regular))
                    .foregroundStyle(V2Color.textSecondary)
                    .lineSpacing(11)
                    .multilineTextAlignment(.center)
                    .frame(
                        width: V2ChapterOverviewPageMetrics.cardTextWidth,
                        height: V2ChapterOverviewPageMetrics.cardTextHeight,
                        alignment: .center
                    )
                    .offset(
                        x: V2ChapterOverviewPageMetrics.cardTextX,
                        y: V2ChapterOverviewPageMetrics.cardTextY
                    )
            }
    }
}

struct V2UnitOverviewView: View {
    let unit: V2ReviewUnitData
    let progress: (current: Int, total: Int)
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "", onBack: onBack) {
            ZStack(alignment: .top) {
                V2UnitProgressBar(progressFraction: V2UnitOverviewPageMetrics.initialProgressFraction)
                    .v2PageContentWidth()
                    .offset(y: V2UnitOverviewPageMetrics.progressY)

                Image("V2BgDecoRightHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 104, height: 55)
                    .opacity(0.66)
                    .offset(x: 154, y: V2UnitOverviewPageMetrics.rightDecoY)
                    .allowsHitTesting(false)

                Image("V2BgDecoSmallPlantCluster")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 60, height: 54)
                    .opacity(0.66)
                    .offset(x: -158, y: V2UnitOverviewPageMetrics.leftDecoY)
                    .allowsHitTesting(false)

                V2UnitOverviewBoardCard(overview: unit.overview)
                    .offset(y: V2UnitOverviewPageMetrics.boardY)

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .frame(width: V2Layout.primaryActionWidth)
                    .offset(y: V2UnitOverviewPageMetrics.buttonY)
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2UnitOverviewPageMetrics.contentHeight, alignment: .top)
        }
    }
}

private enum V2UnitOverviewPageMetrics {
    static let progressY: CGFloat = 15
    static let initialProgressFraction: CGFloat = 0.112
    static let rightDecoY: CGFloat = 130
    static let leftDecoY: CGFloat = 363
    static let boardY: CGFloat = 174
    static let buttonY: CGFloat = V2Layout.primaryActionBottomY
    static let contentHeight: CGFloat = 710
}

struct V2MultipleChoiceQuestionView: View {
    let question: V2ReviewQuestionData
    let unitTitle: String
    let progress: (current: Int, total: Int)
    var showsProgressBar: Bool = true
    @Binding var state: V2MultipleChoiceInteractionState
    let onBack: () -> Void
    let onSource: () -> Void
    var onFavoriteChange: (Bool) -> Void = { _ in }
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(
            title: "",
            showFavoriteButton: true,
            isFavoriteSaved: state.isFavoriteSaved,
            onBack: onBack,
            onSource: onSource,
            onFavorite: toggleFavorite
        ) {
            ZStack(alignment: .top) {
                if showsProgressBar {
                    V2UnitProgressBar(current: progress.current, total: progress.total)
                        .v2PageContentWidth()
                        .offset(y: V2MultipleChoicePageMetrics.progressY)
                }

                V2MultipleChoiceQuestionCard(
                    question: question,
                    selectedIndex: state.selectedIndex,
                    onSelect: {
                        state.selectedIndex = $0
                        state.feedbackPanelVisible = true
                    },
                    onSource: onSource
                )
                .offset(y: V2MultipleChoicePageMetrics.cardY)

                Image("V2BgDecoSmallPlantCluster")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 60, height: 54)
                    .opacity(0.66)
                    .offset(x: -158, y: V2MultipleChoicePageMetrics.leftDecoY)
                    .allowsHitTesting(false)

                Image("V2BgDecoRightHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 104, height: 55)
                    .opacity(0.66)
                    .offset(x: 154, y: V2MultipleChoicePageMetrics.rightDecoY)
                    .allowsHitTesting(false)

                if state.selectedIndex == nil {
                    multipleChoiceMascot(isInteractive: false)
                }

                if state.selectedIndex != nil, !state.feedbackPanelVisible {
                    multipleChoiceMascot(isInteractive: true)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2MultipleChoicePageMetrics.contentHeight, alignment: .top)
            .overlay(alignment: .bottom) {
                if let selectedIndex = state.selectedIndex, state.feedbackPanelVisible {
                    V2AnswerFeedbackPanel(
                        text: question.feedback,
                        isCorrect: selectedIndex == question.correctOptionIndex,
                        onContinue: onContinue,
                        onClose: { state.feedbackPanelVisible = false },
                        onSource: onSource
                    )
                    .padding(.bottom, V2QuestionFeedbackMetrics.bottomLift)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(10)
                }
            }
        }
    }

    private func multipleChoiceMascot(isInteractive: Bool) -> some View {
        GeometryReader { geometry in
            let contentLeft = (geometry.size.width - V2Layout.contentMaxWidth) / 2
            let mascotLeft = contentLeft
                + V2Layout.contentMaxWidth
                - V2MultipleChoicePageMetrics.mascotCardOverlap

            Group {
                if isInteractive {
                    Button(action: { state.feedbackPanelVisible = true }) {
                        multipleChoiceMascotImage
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("重新打开反馈")
                } else {
                    multipleChoiceMascotImage
                }
            }
            .position(
                x: mascotLeft + V2MultipleChoicePageMetrics.mascotWidth / 2,
                y: V2MultipleChoicePageMetrics.mascotTop
                    + V2MultipleChoicePageMetrics.mascotHeight / 2
            )
        }
        .allowsHitTesting(isInteractive)
        .zIndex(isInteractive ? 10 : 0)
    }

    private func toggleFavorite() {
        let isSaved = !state.isFavoriteSaved
        state.isFavoriteSaved = isSaved
        onFavoriteChange(isSaved)
    }

    private var multipleChoiceMascotImage: some View {
        Image("V2MatchingMascot")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(
                width: V2MultipleChoicePageMetrics.mascotWidth,
                height: V2MultipleChoicePageMetrics.mascotHeight
            )
    }
}

private enum V2MultipleChoicePageMetrics {
    static let progressY: CGFloat = 15
    static let cardY: CGFloat = 65
    static let leftDecoY: CGFloat = 612
    static let rightDecoY: CGFloat = 648
    static let mascotTop: CGFloat = 525
    static let mascotWidth: CGFloat = 92.632
    static let mascotHeight: CGFloat = 136
    static let mascotCardOverlap: CGFloat = 67
    static let contentHeight: CGFloat = 760
}


struct V2MatchingQuestionView: View {
    let question: V2ReviewQuestionData
    let unitTitle: String
    let progress: (current: Int, total: Int)
    var showsProgressBar: Bool = true
    @Binding var state: V2MatchingInteractionState
    let onBack: () -> Void
    let onSource: () -> Void
    var onFavoriteChange: (Bool) -> Void = { _ in }
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(
            title: "",
            showFavoriteButton: true,
            isFavoriteSaved: state.isFavoriteSaved,
            onBack: onBack,
            onSource: onSource,
            onFavorite: toggleFavorite
        ) {
            ZStack(alignment: .top) {
                if showsProgressBar {
                    V2UnitProgressBar(current: progress.current, total: progress.total)
                        .v2PageContentWidth()
                        .offset(y: V2MatchingPageMetrics.progressY)
                }

                V2MatchingPromptCard(prompt: question.prompt)
                    .offset(y: V2MatchingPageMetrics.promptY)

                matchingGrid
                    .offset(y: V2MatchingPageMetrics.gridY)

                Image("V2BgDecoSmallPlantCluster")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 60, height: 54)
                    .opacity(0.66)
                    .offset(x: -158, y: V2MatchingPageMetrics.leftDecoY)
                    .allowsHitTesting(false)

                Image("V2BgDecoRightHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 104, height: 55)
                    .opacity(0.66)
                    .offset(x: 154, y: V2MatchingPageMetrics.rightDecoY)
                    .allowsHitTesting(false)

                if !isComplete {
                    matchingMascot(isInteractive: false)
                }

                if isComplete, !state.feedbackPanelVisible {
                    matchingMascot(isInteractive: true)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2MatchingPageMetrics.contentHeight, alignment: .top)
            .overlay(alignment: .bottom) {
                if isComplete, state.feedbackPanelVisible {
                    V2AnswerFeedbackPanel(
                        text: question.feedback,
                        isCorrect: true,
                        onContinue: onContinue,
                        onClose: { state.feedbackPanelVisible = false },
                        onSource: onSource
                    )
                    .padding(.bottom, V2QuestionFeedbackMetrics.bottomLift)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(10)
                }
            }
        }
    }

    private func matchingMascot(isInteractive: Bool) -> some View {
        GeometryReader { geometry in
            let contentLeft = (geometry.size.width - V2Layout.contentMaxWidth) / 2
            let mascotLeft = contentLeft
                + V2Layout.contentMaxWidth
                - V2MatchingPageMetrics.mascotCardOverlap

            Group {
                if isInteractive {
                    Button(action: { state.feedbackPanelVisible = true }) {
                        matchingMascotImage
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("重新打开反馈")
                } else {
                    matchingMascotImage
                }
            }
            .position(
                x: mascotLeft + V2MatchingPageMetrics.mascotWidth / 2,
                y: V2MatchingPageMetrics.mascotTop
                    + V2MatchingPageMetrics.mascotHeight / 2
            )
        }
        .allowsHitTesting(isInteractive)
        .zIndex(isInteractive ? 10 : 0)
    }

    private func toggleFavorite() {
        let isSaved = !state.isFavoriteSaved
        state.isFavoriteSaved = isSaved
        onFavoriteChange(isSaved)
    }

    private var matchingMascotImage: some View {
        Image("V2MascotStatic")
            .resizable()
            .renderingMode(.original)
            .scaledToFit()
            .frame(
                width: V2MatchingPageMetrics.mascotWidth,
                height: V2MatchingPageMetrics.mascotHeight
            )
    }

    private var matchingGrid: some View {
        HStack(alignment: .top, spacing: V2MatchingPageMetrics.columnSpacing) {
            VStack(spacing: V2MatchingPageMetrics.rowSpacing) {
                ForEach(question.matchingPairs) { pair in
                    V2MatchingOptionCard(
                        title: pair.left,
                        state: state(for: pair.id, side: .left)
                    ) {
                        handleTap(pairID: pair.id, side: .left)
                    }
                }
            }

            VStack(spacing: V2MatchingPageMetrics.rowSpacing) {
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
        .frame(width: V2Layout.contentMaxWidth)
    }

    private var isComplete: Bool {
        question.matchingPairs.allSatisfy {
            state.leftStates[$0.id] == .locked && state.rightStates[$0.id] == .locked
        }
    }

    private func state(for pairID: String, side: V2MatchingSide) -> V2MatchingOptionState {
        switch side {
        case .left:
            state.leftStates[pairID] ?? .normal
        case .right:
            state.rightStates[pairID] ?? .normal
        }
    }

    private func setState(_ optionState: V2MatchingOptionState, pairID: String, side: V2MatchingSide) {
        switch side {
        case .left:
            state.leftStates[pairID] = optionState
        case .right:
            state.rightStates[pairID] = optionState
        }
    }

    private func setPairState(
        _ state: V2MatchingOptionState,
        first: V2MatchingSelection,
        second: V2MatchingSelection
    ) {
        var transaction = Transaction(animation: nil)
        transaction.disablesAnimations = true

        withTransaction(transaction) {
            setState(state, pairID: first.pairID, side: first.side)
            setState(state, pairID: second.pairID, side: second.side)
        }
    }

    private func handleTap(pairID: String, side: V2MatchingSide) {
        guard state(for: pairID, side: side) != .locked else { return }

        let current = V2MatchingSelection(side: side, pairID: pairID)

        guard let selected = state.selected else {
            state.selected = current
            setState(.selected, pairID: pairID, side: side)
            return
        }

        if selected.side == side {
            setState(.normal, pairID: selected.pairID, side: selected.side)
            state.selected = current
            setState(.selected, pairID: pairID, side: side)
            return
        }

        let isCorrect = selected.pairID == pairID
        let first = selected
        let second = current
        state.selected = nil

        setPairState(isCorrect ? .correct : .wrong, first: first, second: second)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            setPairState(isCorrect ? .locked : .normal, first: first, second: second)
            if isCorrect {
                state.feedbackPanelVisible = true
            }
        }
    }
}

private enum V2MatchingPageMetrics {
    static let progressY: CGFloat = 15
    static let promptY: CGFloat = 65
    static let gridY: CGFloat = 155
    static let rowSpacing: CGFloat = 14
    static let columnSpacing: CGFloat = 41
    static let leftDecoY: CGFloat = 612
    static let rightDecoY: CGFloat = 648
    static let mascotTop: CGFloat = 560
    static let mascotWidth: CGFloat = 86
    static let mascotHeight: CGFloat = 131
    static let mascotCardOverlap: CGFloat = 64
    static let contentHeight: CGFloat = 760
}

private enum V2QuestionFeedbackMetrics {
    static let bottomLift: CGFloat = 30
}

private struct V2MatchingPromptCard: View {
    let prompt: String

    var body: some View {
        Text(prompt)
            .font(.system(size: 16, weight: .regular))
            .foregroundStyle(Color(hex: 0x1F1B12))
            .tracking(-0.24)
            .lineSpacing(7)
            .frame(width: 267, alignment: .leading)
            .padding(.leading, 31)
            .padding(.trailing, 23)
            .padding(.vertical, 4)
            .frame(width: V2Layout.contentMaxWidth, alignment: .leading)
            .frame(minHeight: 67, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .v2Shadow()
            )
    }
}

struct V2UnitSummaryView: View {
    let unit: V2ReviewUnitData
    let onBack: () -> Void
    let onContinue: () -> Void

    var body: some View {
        V2FlowScreen(title: "", onBack: onBack) {
            ZStack(alignment: .top) {
                Image("V2BgDecoSmallPlantCluster")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 60, height: 54)
                    .opacity(0.66)
                    .offset(x: -158, y: V2UnitSummaryPageMetrics.leftDecoY)
                    .allowsHitTesting(false)

                Image("V2BgDecoRightHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 104, height: 55)
                    .opacity(0.66)
                    .offset(x: 154, y: V2UnitSummaryPageMetrics.rightDecoY)
                    .allowsHitTesting(false)

                V2UnitCompletionHero(unit: unit)
                    .offset(y: V2UnitSummaryPageMetrics.heroY)

                V2PrimaryActionButton(title: "继续", action: onContinue)
                    .frame(width: V2Layout.primaryActionWidth)
                    .offset(y: V2UnitSummaryPageMetrics.buttonY)
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2UnitSummaryPageMetrics.contentHeight, alignment: .top)
        }
    }
}

private enum V2UnitSummaryPageMetrics {
    static let heroY: CGFloat = 0
    static let leftDecoY: CGFloat = 280
    static let rightDecoY: CGFloat = 314
    static let buttonY: CGFloat = V2Layout.primaryActionBottomY
    static let contentHeight: CGFloat = 720
}

private struct V2UnitCompletionHero: View {
    let unit: V2ReviewUnitData

    var body: some View {
        ZStack(alignment: .top) {
            Image("V2MascotCompletion")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2UnitCompletionHeroMetrics.mascotWidth, height: V2UnitCompletionHeroMetrics.mascotHeight)
                .offset(x: V2UnitCompletionHeroMetrics.mascotX, y: V2UnitCompletionHeroMetrics.mascotY)
                .zIndex(0)

            V2UnitCompletionResultBanner(gradeLabel: "烂熟于心", accuracyText: "100%")
                .offset(y: V2UnitCompletionHeroMetrics.resultCardY)
                .zIndex(1)

            V2UnitCompletionSummaryCard(text: unit.completionMessage)
                .offset(y: V2UnitCompletionHeroMetrics.summaryCardY)
                .zIndex(1)
        }
        .frame(width: 402, height: V2UnitCompletionHeroMetrics.height, alignment: .top)
    }
}

private enum V2UnitCompletionHeroMetrics {
    static let height: CGFloat = 607
    static let mascotX: CGFloat = 13
    static let mascotY: CGFloat = 0
    static let mascotWidth: CGFloat = 159
    static let mascotHeight: CGFloat = 252
    static let resultCardY: CGFloat = 165
    static let summaryCardY: CGFloat = 300
}

private struct V2UnitCompletionResultBanner: View {
    let gradeLabel: String
    let accuracyText: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Color(hex: 0xFDFAF2))
                .v2Shadow()

            Image("V2CompletionMedal")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 98, height: 93)
                .offset(x: 17, y: 9)

            VStack(spacing: 10) {
                ZStack {
                    Image("V2CompletionGradeRays")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 122, height: 24)

                    Text(gradeLabel)
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(Color(hex: 0x748830))
                        .lineLimit(1)
                }
                .frame(width: 170, height: 31)

                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text("本单元复习")
                        .font(V2Typography.caption)
                        .foregroundStyle(Color(hex: 0x575757))

                    Text(accuracyText)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(Color(hex: 0x788937))

                    Text("正确率")
                        .font(V2Typography.caption)
                        .foregroundStyle(Color(hex: 0x575757))
                }
                .frame(width: 170)
            }
            .offset(x: 132, y: 16)
        }
        .frame(width: V2Layout.contentMaxWidth, height: 107)
    }
}

private struct V2UnitCompletionSummaryCard: View {
    let text: String

    var body: some View {
        RoundedRectangle(cornerRadius: 15, style: .continuous)
            .fill(Color(hex: 0xFDFAF2))
            .v2Shadow()
            .frame(width: V2Layout.contentMaxWidth, height: 241)
            .overlay {
                Text(text)
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Color(hex: 0x645B51))
                    .lineSpacing(7)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
            }
    }
}

struct V2ChapterSummaryView: View {
    let chapter: V2ReviewChapterData
    let onBack: () -> Void
    let onHome: () -> Void
    let onDetail: () -> Void

    var body: some View {
        V2FlowScreen(title: "", onBack: onBack) {
            ZStack(alignment: .top) {
                Image("V2BgDecoSmallPlantCluster")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 60, height: 54)
                    .opacity(0.66)
                    .offset(x: -158, y: V2ChapterSummaryPageMetrics.leftDecoY)
                    .allowsHitTesting(false)

                Image("V2BgDecoRightHillPlant")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 104, height: 55)
                    .opacity(0.66)
                    .offset(x: 154, y: V2ChapterSummaryPageMetrics.rightDecoY)
                    .allowsHitTesting(false)

                V2ChapterCompletionHero(chapter: chapter)
                    .offset(y: V2ChapterSummaryPageMetrics.heroY)

                V2PrimaryActionButton(title: "返回主页", action: onHome)
                    .frame(width: V2Layout.primaryActionWidth)
                    .offset(y: V2ChapterSummaryPageMetrics.buttonY)

                Button(action: onDetail) {
                    Text("查看章节详情")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x737946).opacity(0.55))
                        .frame(height: 26)
                }
                .buttonStyle(.plain)
                .offset(y: V2ChapterSummaryPageMetrics.detailY)
            }
            .frame(maxWidth: .infinity)
            .frame(height: V2ChapterSummaryPageMetrics.contentHeight, alignment: .top)
        }
    }
}

private enum V2ChapterSummaryPageMetrics {
    static let heroY: CGFloat = 0
    static let leftDecoY: CGFloat = 328
    static let rightDecoY: CGFloat = 364
    static let buttonY: CGFloat = V2Layout.primaryActionBottomY
    static let detailY: CGFloat = V2Layout.primaryActionBottomY + 73
    static let contentHeight: CGFloat = 742
}

private struct V2ChapterCompletionHero: View {
    let chapter: V2ReviewChapterData

    var body: some View {
        ZStack(alignment: .top) {
            Image("V2ChapterCompletionMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 347, height: 510)
                .offset(x: 2, y: 0)
                .zIndex(0)

            V2ChapterCompletionResultCard(chapter: chapter)
                .offset(y: 255)
                .zIndex(1)
        }
        .frame(width: 402, height: 500, alignment: .top)
    }
}

private struct V2ChapterCompletionResultCard: View {
    let chapter: V2ReviewChapterData

    private var statsText: String {
        "共 \(chapter.units.count) 个核心知识点，\(chapter.units.reduce(0) { $0 + $1.questions.count })道题目"
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Color(hex: 0xFDFAF2))
                .v2Shadow()

            Image("V2ChapterCompletionTitleRays")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 137, height: 24)
                .offset(x: 75, y: 19)

            Text("章节完成")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(Color(hex: 0xF0C559))
                .multilineTextAlignment(.center)
                .frame(width: 112, height: 33)
                .offset(x: 89, y: 14)

            Text(statsText)
                .font(V2Typography.caption)
                .foregroundStyle(Color(hex: 0x989898))
                .multilineTextAlignment(.center)
                .lineSpacing(7)
                .frame(width: 164, height: 53)
                .offset(x: 63, y: 35)

            Text("在了解过hook的原理和用法之后，你的vibe coding能力又更上一层楼了！")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .multilineTextAlignment(.center)
                .lineSpacing(7)
                .frame(width: 269, height: 53)
                .offset(x: 20, y: 85)
        }
        .frame(width: 304, height: 161)
    }
}

struct V2SourceArticleView: View {
    let chapter: V2ReviewChapterData
    let question: V2ReviewQuestionData?
    let onBack: () -> Void
    @Environment(\.openURL) private var openURL

    private var highlightedBlockID: String? {
        guard let excerpt = question?.sourceExcerpt else {
            return nil
        }
        return chapter.sourceBody.first { block in
            sourceText(block.text, matches: excerpt)
        }?.id
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .top) {
                V2Color.surfaceCream
                    .ignoresSafeArea()

                ScrollViewReader { proxy in
                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: 26) {
                            V2SourceArticleHeader(
                                title: chapter.title,
                                author: chapter.sourceAuthor,
                                onSource: openSourceURL
                            )

                            V2SourceArticleBody(
                                blocks: chapter.sourceBody,
                                highlightedBlockID: highlightedBlockID
                            )
                        }
                        .frame(width: min(329, geometry.size.width - 64), alignment: .leading)
                        .padding(.top, V2Layout.topChromeReservedHeight + 40)
                        .padding(.bottom, 42)
                    }
                    .onAppear {
                        guard let highlightedBlockID else {
                            return
                        }
                        DispatchQueue.main.async {
                            proxy.scrollTo(highlightedBlockID, anchor: .center)
                        }
                    }
                }

                V2TopChrome {
                    V2FlowTopBar(title: "", onBack: onBack)
                }
                .zIndex(20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }

    private func openSourceURL() {
        guard let url = URL(string: chapter.sourceURL) else {
            return
        }
        openURL(url)
    }

    private func sourceText(_ text: String, matches excerpt: String) -> Bool {
        let normalizedText = text.replacingOccurrences(of: " ", with: "")
        let normalizedExcerpt = excerpt.replacingOccurrences(of: " ", with: "")
        return normalizedText.contains(normalizedExcerpt) || normalizedExcerpt.contains(normalizedText)
    }
}

private struct V2SourceArticleHeader: View {
    let title: String
    let author: String
    let onSource: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(title)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(10)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .topLeading)

            HStack(spacing: 21) {
                V2ChapterDetailHeroActionButton(
                    title: "原文链接",
                    iconName: "V2ChapterDetailLinkActionIcon",
                    width: 93,
                    textWidth: 36,
                    action: onSource
                )

                V2ChapterDetailHeroInfoChip(
                    title: author,
                    iconName: "V2ChapterDetailSummaryActionIcon",
                    width: V2ChapterDetailHeroActionContent.width(
                        for: author,
                        minWidth: 93,
                        maxWidth: 157
                    )
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

private struct V2SourceArticleBody: View {
    let blocks: [V2SourceArticleBlock]
    let highlightedBlockID: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(blocks.enumerated()), id: \.element.id) { index, block in
                V2SourceArticleBlockView(
                    block: block,
                    isHighlighted: block.id == highlightedBlockID
                )
                .id(block.id)
                .padding(.top, index == 0 ? 0 : topSpacing(for: block))
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .textSelection(.enabled)
    }

    private func topSpacing(for block: V2SourceArticleBlock) -> CGFloat {
        switch block.kind {
        case .heading:
            return 22
        case .paragraph:
            return 13
        case .quote:
            return 16
        }
    }
}

private struct V2SourceArticleBlockView: View {
    let block: V2SourceArticleBlock
    let isHighlighted: Bool

    var body: some View {
        if isHighlighted {
            blockContent
                .padding(.horizontal, 10)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay(
                    RoundedRectangle(cornerRadius: 14.5, style: .continuous)
                        .stroke(Color(hex: 0xA3A568), lineWidth: 1)
                )
        } else {
            blockContent
        }
    }

    @ViewBuilder
    private var blockContent: some View {
        switch block.kind {
        case .heading:
            Text(block.text)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(8)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .topLeading)
        case .paragraph:
            Text(block.text)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(8)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .topLeading)
        case .quote:
            Text(block.text)
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(8)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.leading, 12)
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .overlay(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 1, style: .continuous)
                        .fill(V2Color.borderSoftGreen)
                        .frame(width: 3)
                }
        }
    }
}

struct V2ChapterDetailView: View {
    let chapter: V2ReviewChapterData
    let onBack: () -> Void
    let onContinue: () -> Void
    let onSource: () -> Void

    private var totalQuestionCount: Int {
        chapter.units.reduce(0) { $0 + $1.questions.count }
    }

    private var completedQuestionCount: Int {
        chapter.units.reduce(0) { total, unit in
            guard let node = V2HomeFixture.home.nodes.first(where: { $0.id == unit.id }) else {
                return total
            }

            switch node.state {
            case .completed:
                return total + unit.questions.count
            case .current:
                let currentUnitCap = max(unit.questions.count - 1, 0)
                return total + min(node.completedQuestionCount, currentUnitCap)
            case .start, .locked:
                return total
            }
        }
    }

    var body: some View {
        V2FlowScreen(
            title: "章节详情",
            onBack: onBack
        ) {
            ScrollView(showsIndicators: false) {
                ZStack(alignment: .top) {
                    V2ChapterDetailBackgroundDecorations()

                    VStack(spacing: 25) {
                        V2ChapterDetailHeroCard(
                            title: chapter.title,
                            author: chapter.sourceAuthor,
                            onSource: onSource,
                            onStartReview: onContinue
                        )

                        V2ChapterDetailSummaryCard(summary: chapter.overview)

                        V2ChapterDetailKnowledgeCard(
                            count: chapter.units.count,
                            units: Array(chapter.units.prefix(4)),
                            onStartReview: onContinue
                        )
                    }
                    .frame(maxWidth: V2Layout.contentMaxWidth)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 28)
                .padding(.bottom, 34)
            }
        }
    }

    private func status(for unit: V2ReviewUnitData) -> V2ChapterReviewStatus {
        guard let node = V2HomeFixture.home.nodes.first(where: { $0.id == unit.id }) else {
            return .notStarted
        }

        switch node.state {
        case .completed:
            return .completed
        case .current:
            return .reviewing
        case .start, .locked:
            return .notStarted
        }
    }
}

private struct V2ChapterDetailBackgroundDecorations: View {
    var body: some View {
        ZStack {
            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 60, height: 54)
                .opacity(0.32)
                .offset(x: -178, y: 302)

            Image("V2BgDecoRightHillPlant")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 109, height: 82)
                .opacity(0.28)
                .offset(x: -166, y: 594)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 60, height: 54)
                .opacity(0.32)
                .offset(x: 178, y: 491)
        }
        .allowsHitTesting(false)
    }
}

private struct V2ChapterDetailHeroCard: View {
    let title: String
    let author: String
    let onSource: () -> Void
    let onStartReview: () -> Void
    private let cardBodyHeight: CGFloat = 235
    private let cardFrameHeight: CGFloat = 243

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
                .frame(width: V2Layout.contentMaxWidth, height: cardBodyHeight)

            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(6)
                .lineLimit(4)
                .truncationMode(.tail)
                .frame(width: 180, height: 82, alignment: .topLeading)
                .offset(x: 27, y: 23)

            HStack(spacing: 21) {
                V2ChapterDetailHeroActionButton(
                    title: "查看原文",
                    iconName: "V2ChapterDetailLinkActionIcon",
                    width: 93,
                    textWidth: 42,
                    action: onSource
                )

                V2ChapterDetailHeroInfoChip(
                    title: author,
                    iconName: "V2ChapterDetailSummaryActionIcon",
                    width: V2ChapterDetailHeroActionContent.width(
                        for: author,
                        minWidth: 93,
                        maxWidth: 157
                    )
                )
            }
            .offset(x: 25, y: 123)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 62, height: 56)
                .opacity(0.56)
                .offset(x: 253, y: 181)
                .allowsHitTesting(false)

            Button(action: onStartReview) {
                Text("开始复习")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .tracking(-0.24)
                    .frame(width: 207, height: 28)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(V2Color.primaryAction)
                            .v2Shadow()
                    )
            }
            .buttonStyle(.plain)
            .offset(x: 25, y: 184)

            Image("V2ChapterDetailMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 158, height: 178)
                .offset(x: 216, y: -32)
        }
        .frame(width: V2Layout.contentMaxWidth, height: cardFrameHeight, alignment: .topLeading)
    }
}

private struct V2ChapterDetailHeroActionButton: View {
    let title: String
    let iconName: String
    let width: CGFloat
    let textWidth: CGFloat
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            V2ChapterDetailHeroActionContent(
                title: title,
                iconName: iconName,
                width: width,
                textWidth: textWidth
            )
        }
        .buttonStyle(.plain)
    }
}

private struct V2ChapterDetailHeroInfoChip: View {
    let title: String
    let iconName: String
    let width: CGFloat

    var body: some View {
        V2ChapterDetailHeroActionContent(
            title: title,
            iconName: iconName,
            width: width,
            textWidth: width - 51
        )
            .accessibilityLabel("原文作者：\(title)")
    }
}

private struct V2ChapterDetailHeroActionContent: View {
    let title: String
    let iconName: String
    let width: CGFloat
    let textWidth: CGFloat

    static func width(for title: String, minWidth: CGFloat, maxWidth: CGFloat) -> CGFloat {
        let font = UIFont.systemFont(ofSize: 11, weight: .regular)
        let textWidth = ceil((title as NSString).size(withAttributes: [.font: font]).width)
        let desiredWidth = 7 + 34 + 6 + textWidth + 10
        return min(max(desiredWidth, minWidth), maxWidth)
    }

    var body: some View {
        HStack(spacing: 6) {
            Image(iconName)
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 34, height: 34)

            Text(title)
                .font(V2Typography.caption)
                .foregroundStyle(Color(hex: 0x767676))
                .lineLimit(1)
                .truncationMode(.tail)
                .minimumScaleFactor(0.75)
                .frame(width: textWidth, height: 14, alignment: .leading)
        }
        .padding(.leading, 7)
        .frame(width: width, height: 36, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color(hex: 0xFDFAF2))
                .v2Shadow()
        )
    }
}

private struct V2ChapterDetailSummaryCard: View {
    let summary: String
    private let contentLeading: CGFloat = 24
    private let contentWidth: CGFloat = V2Layout.contentMaxWidth - 48

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image("V2ChapterDetailCoreIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 23, height: 23)

                Text("文章核心")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(hex: 0x575757))
                    .frame(height: 26, alignment: .center)
            }
            .padding(.leading, contentLeading)
            .padding(.top, 13)

            Text(summary)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
                .frame(width: contentWidth, alignment: .topLeading)
                .padding(.leading, contentLeading)
                .padding(.top, 10)
                .padding(.bottom, 20)
        }
        .frame(width: V2Layout.contentMaxWidth, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ChapterDetailKnowledgeCard: View {
    let count: Int
    let units: [V2ReviewUnitData]
    let onStartReview: () -> Void
    @State private var expandedUnitID: String?
    private let contentLeading: CGFloat = 24

    private var visibleUnits: [V2ReviewUnitData] {
        Array(units.prefix(4))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 7) {
                Image("V2ChapterDetailKnowledgeIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 23, height: 23)

                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text("知识点")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color(hex: 0x575757))
                        .tracking(-0.24)

                    Text("（\(count)）")
                        .font(V2Typography.caption)
                        .foregroundStyle(Color(hex: 0x878787))
                        .tracking(-0.24)
                }
                .frame(height: 23, alignment: .center)
            }
            .padding(.leading, contentLeading)
            .padding(.top, 18)

            VStack(spacing: 10) {
                ForEach(Array(visibleUnits.enumerated()), id: \.element.id) { index, unit in
                    VStack(alignment: .leading, spacing: 8) {
                        V2ChapterDetailKnowledgeRow(
                            index: index + 1,
                            title: unit.title,
                            isExpanded: expandedUnitID == unit.id
                        ) {
                            withAnimation(.easeInOut(duration: 0.22)) {
                                expandedUnitID = expandedUnitID == unit.id ? nil : unit.id
                            }
                        }

                        if expandedUnitID == unit.id {
                            V2ChapterDetailKnowledgeExpansionPanel(
                                overview: unit.overview,
                                actionTitle: "开始复习",
                                action: onStartReview
                            )
                            .transition(.asymmetric(insertion: .opacity, removal: .identity))
                        }
                    }
                }
            }
            .padding(.top, 20)
            .padding(.leading, contentLeading)
            .padding(.bottom, 24)
        }
        .frame(width: V2Layout.contentMaxWidth, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ChapterDetailKnowledgeRow: View {
    let index: Int
    let title: String
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 9) {
                ZStack {
                    Circle()
                        .fill(V2Color.pageGreenBackground)

                    Text("\(index)")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(V2Color.primary)
                        .tracking(-0.24)
                }
                .frame(width: 20, height: 20)
                .padding(.leading, 9)

                Text(title)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color(hex: 0x575757))
                    .tracking(-0.24)
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: .infinity, alignment: .leading)

                V2ChapterDetailDisclosureArrow(isExpanded: isExpanded)
                    .frame(width: 24, height: 24)
                    .padding(.trailing, 9)
            }
            .frame(width: 274, height: 50)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Color(hex: 0xEFE9DB), lineWidth: 1)
                    )
            )
            .contentShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isExpanded ? "收起知识点详情" : "展开知识点详情")
    }
}

private struct V2ChapterDetailDisclosureArrow: View {
    let isExpanded: Bool

    var body: some View {
        Path { path in
            path.move(to: CGPoint(x: 6, y: 10))
            path.addLine(to: CGPoint(x: 11, y: 15))
            path.addLine(to: CGPoint(x: 16, y: 10))
        }
        .stroke(
            isExpanded ? V2Color.primaryAction : Color(hex: 0xE8EBBD),
            style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
        )
        .rotationEffect(isExpanded ? .degrees(180) : .degrees(0))
    }
}

private struct V2ChapterDetailKnowledgeExpansionPanel: View {
    let overview: String
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(overview)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
                .frame(width: 232, alignment: .topLeading)
                .padding(.top, 23)
                .padding(.leading, 20)

            Button(action: action) {
                Text(actionTitle)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .tracking(-0.24)
                    .frame(width: 215, height: 28)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(V2Color.primaryAction)
                            .v2Shadow()
                    )
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)
            .padding(.top, 18)
            .padding(.bottom, 12)
        }
        .frame(width: 274, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("知识点详情")
    }
}

struct V2RecommendedArticleDetailView: View {
    let onBack: () -> Void
    let onGenerate: () -> Void
    @State private var showsAddPopover = false
    @Environment(\.openURL) private var openURL

    private var chapter: V2ReviewChapterData {
        V2ReviewFixture.chapter
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            V2FlowScreen(title: "", onBack: onBack) {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 19) {
                        V2SourceArticleHeader(
                            title: chapter.title,
                            author: chapter.sourceAuthor,
                            onSource: openSourceURL
                        )

                        V2SourceArticleBody(
                            blocks: chapter.sourceBody,
                            highlightedBlockID: nil
                        )
                    }
                    .v2PageContentWidth()
                    .padding(.top, 23)
                    .padding(.bottom, 116)
                }
            }

            if showsAddPopover {
                Color.black
                    .opacity(0.20)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            showsAddPopover = false
                        }
                    }

                V2RecommendedArticleAddPopover(onGenerate: onGenerate)
                    .padding(.trailing, 60)
                    .padding(.bottom, 84)
                    .transition(.opacity)
            }

            V2RecommendedArticleAddButton {
                withAnimation(.easeInOut(duration: 0.18)) {
                    showsAddPopover.toggle()
                }
            }
            .padding(.trailing, V2Spacing.screenMargin + 4)
            .padding(.bottom, 30)
        }
    }

    private func openSourceURL() {
        guard let url = URL(string: chapter.sourceURL) else {
            return
        }
        openURL(url)
    }
}

private struct V2RecommendedArticleAddButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color(hex: 0xE8E9C2))
                    .frame(width: 45, height: 45)
                    .overlay(
                        Circle()
                            .stroke(Color(hex: 0xFEFDFD), lineWidth: 2)
                    )
                    .v2Shadow()
                    .offset(y: -4)

                Path { path in
                    path.move(to: CGPoint(x: 26.5, y: 14.65))
                    path.addLine(to: CGPoint(x: 26.5, y: 29.82))
                    path.move(to: CGPoint(x: 18.65, y: 22.5))
                    path.addLine(to: CGPoint(x: 33.82, y: 22.5))
                }
                .stroke(
                    V2Color.primary,
                    style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
                )
            }
            .frame(width: 53, height: 53)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("添加为复习路径")
    }
}

private struct V2RecommendedArticleAddPopover: View {
    let onGenerate: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: 274, height: 100)
                .v2Shadow()
                .offset(x: 4, y: 0)

            Text("将这篇好文生成复习路径？")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color(hex: 0x575757))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .frame(width: 196, height: 18, alignment: .center)
                .offset(x: 43, y: 23)

            Button(action: onGenerate) {
                Text("开始生成")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 215, height: 28)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(V2Color.primaryAction)
                            .v2Shadow()
                    )
            }
            .buttonStyle(.plain)
            .offset(x: 33, y: 54)
        }
        .frame(width: 282, height: 108, alignment: .topLeading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("将这篇好文生成复习路径")
    }
}
