import SwiftUI

struct V2QuestionOptionCard: View {
    let letter: String
    let title: String
    let state: V2QuestionOptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                choiceLetter
                    .frame(width: 34, height: 34)

                Text(title)
                    .font(.system(size: 14, weight: .regular, design: .default))
                    .foregroundStyle(Color(hex: 0x1F1B12))
                    .lineSpacing(10)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 16)
            .frame(width: 270, height: 71, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(fill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var choiceLetter: some View {
        ZStack {
            Circle()
                .fill(letterFill)

            switch state {
            case .normal:
                Text(letter)
                    .font(.system(size: 16, weight: .regular, design: .default))
                    .foregroundStyle(V2Color.topTitle)
            case .correct:
                CheckMarkShape()
                    .stroke(Color.white, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
                    .frame(width: 17, height: 10)
                    .rotationEffect(.degrees(-6))
            case .wrong:
                XMarkShape()
                    .stroke(Color.white, style: StrokeStyle(lineWidth: 2.3, lineCap: .round))
                    .frame(width: 13, height: 13)
            }
        }
    }

    private var fill: Color {
        switch state {
        case .normal:
            return Color(hex: 0xFEF8F2)
        case .correct:
            return V2Color.feedbackCorrectFill
        case .wrong:
            return V2Color.feedbackWrongFill
        }
    }

    private var border: Color {
        switch state {
        case .normal:
            return V2Color.borderSoftGreen
        case .correct:
            return V2Color.unitProgressFill
        case .wrong:
            return V2Color.feedbackWrongBorder
        }
    }

    private var letterFill: Color {
        switch state {
        case .normal:
            return Color(hex: 0xF3EFE7)
        case .correct:
            return Color(hex: 0xB9C561)
        case .wrong:
            return Color(hex: 0xF36454)
        }
    }
}

private struct CheckMarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        path.addLine(to: CGPoint(x: rect.minX + rect.width * 0.36, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        return path
    }
}

private struct XMarkShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        path.move(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        return path
    }
}

struct V2MultipleChoiceQuestionCard: View {
    let question: V2ReviewQuestionData
    let selectedIndex: Int?
    let onSelect: (Int) -> Void
    let onSource: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Color(hex: 0xFFFCF4))
                .v2Shadow()

            VStack(alignment: .leading, spacing: 0) {
                Text(question.prompt)
                    .font(.system(size: 18, weight: .semibold, design: .default))
                    .foregroundStyle(Color(hex: 0x1F1B12))
                    .lineSpacing(8)
                    .tracking(-0.24)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 23)

                VStack(spacing: 12) {
                    ForEach(question.options.indices, id: \.self) { index in
                        V2QuestionOptionCard(
                            letter: optionLetter(for: index),
                            title: question.options[index],
                            state: optionState(for: index)
                        ) {
                            guard selectedIndex == nil else { return }
                            onSelect(index)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(.top, 25)
            .padding(.horizontal, 27)

            Button(action: onSource) {
                Text("查看原文")
                    .font(.system(size: 14, weight: .regular, design: .default))
                    .tracking(-0.24)
                    .foregroundStyle(Color(hex: 0x737946).opacity(0.55))
                    .frame(height: 26)
            }
            .buttonStyle(.plain)
            .frame(width: 100)
            .position(x: 160.5, y: 466)
        }
        .frame(width: 321, height: 518)
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

    private func optionLetter(for index: Int) -> String {
        let letters = ["A", "B", "C", "D"]
        guard letters.indices.contains(index) else { return "" }
        return letters[index]
    }
}


struct V2MatchingOptionCard: View {
    let title: String
    let state: V2MatchingOptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(fill)
                    .shadow(color: Color(hex: 0x98A35E).opacity(0.20), radius: 2, x: 0, y: 4)

                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(border, lineWidth: 1.5)

                Text(title)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(textColor)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .frame(width: 112, height: 61, alignment: .center)
            }
            .frame(width: 140, height: 90)
        }
        .buttonStyle(.plain)
        .disabled(state == .locked)
        .transaction { transaction in
            transaction.disablesAnimations = true
        }
    }

    private var fill: Color {
        switch state {
        case .normal:
            Color(hex: 0xFEF8F2)
        case .selected:
            Color(hex: 0xEEF8FC)
        case .correct:
            V2Color.feedbackCorrectFill
        case .wrong:
            V2Color.feedbackWrongFill
        case .locked:
            Color(hex: 0xF2F2F2)
        }
    }

    private var border: Color {
        switch state {
        case .normal:
            V2Color.borderSoftGreen.opacity(0.65)
        case .selected:
            V2Color.selectedBlueBorder
        case .correct:
            V2Color.primary
        case .wrong:
            V2Color.feedbackWrongBorder
        case .locked:
            V2Color.lockedBorder
        }
    }

    private var textColor: Color {
        switch state {
        case .locked:
            return V2Color.textSecondary.opacity(0.62)
        default:
            return V2Color.textPrimary
        }
    }
}

struct V2AnswerFeedbackPanel: View {
    let text: String
    let isCorrect: Bool
    let onContinue: () -> Void
    var onClose: () -> Void = {}
    var onSource: () -> Void = {}

    var body: some View {
        ZStack(alignment: .topLeading) {
            Image("V2MascotFeedbackBack")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 93, height: 136)
                .offset(x: 302, y: 0)
                .zIndex(1)

            panelContent
                .padding(.top, V2AnswerFeedbackPanelMetrics.panelY)
                .zIndex(2)

            Button(action: onClose) {
                Text("X")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(accent)
                    .frame(width: 30, height: 30)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .position(x: 363, y: V2AnswerFeedbackPanelMetrics.closeY)
            .zIndex(6)

            Image("V2MascotFeedbackFront")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 38, height: 58)
                .offset(x: 313, y: 46)
                .zIndex(5)
        }
        .frame(width: V2AnswerFeedbackPanelMetrics.width)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var accent: Color {
        isCorrect ? V2Color.primaryAction : Color(hex: 0xF36454)
    }

    private var feedbackShadow: Color {
        isCorrect ? V2Color.primaryAction.opacity(0.20) : Color(hex: 0xF36454).opacity(0.22)
    }

    private var sourceColor: Color {
        isCorrect ? Color(hex: 0x737946).opacity(0.55) : Color(hex: 0xF36454).opacity(0.47)
    }

    private var panelContent: some View {
        VStack(spacing: 0) {
            feedbackText
                .frame(width: V2AnswerFeedbackPanelMetrics.textWidth, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, V2AnswerFeedbackPanelMetrics.panelBodyTopY + V2AnswerFeedbackPanelMetrics.contentTopInset)

            V2FeedbackActionButton(
                title: "继续",
                tone: isCorrect ? .correct : .wrong,
                action: onContinue
            )
            .frame(width: V2AnswerFeedbackPanelMetrics.buttonWidth, height: V2AnswerFeedbackPanelMetrics.buttonHeight)
            .padding(.top, V2AnswerFeedbackPanelMetrics.textToButtonGap)

            Button(action: onSource) {
                Text("查看原文")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(sourceColor)
                    .frame(height: V2AnswerFeedbackPanelMetrics.sourceHeight)
            }
            .buttonStyle(.plain)
            .padding(.top, V2AnswerFeedbackPanelMetrics.buttonToSourceGap)
        }
        .padding(.bottom, V2AnswerFeedbackPanelMetrics.bottomInset)
        .frame(width: V2AnswerFeedbackPanelMetrics.width)
        .background {
            ZStack(alignment: .bottom) {
                V2FeedbackPanelShape()
                    .fill(Color(hex: 0xFFFCF4))
                    .shadow(
                        color: feedbackShadow,
                        radius: 5,
                        x: 0,
                        y: -6
                    )

                V2FeedbackPanelTopStroke()
                    .stroke(accent, lineWidth: 1)

                Rectangle()
                    .fill(Color(hex: 0xFFFCF4))
                    .frame(
                        width: V2AnswerFeedbackPanelMetrics.width,
                        height: V2AnswerFeedbackPanelMetrics.bottomCoverExtension
                    )
                    .offset(y: V2AnswerFeedbackPanelMetrics.bottomCoverExtension)
            }
        }
    }

    private var feedbackText: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text("正确理解：")
                .font(.system(size: 14, weight: .bold))

            Text(text)
                .font(.system(size: 14, weight: .regular))
                .lineSpacing(4)
                .fixedSize(horizontal: false, vertical: true)
        }
        .foregroundStyle(Color(hex: 0x4D4635))
        .multilineTextAlignment(.leading)
    }
}

private enum V2AnswerFeedbackPanelMetrics {
    static let width: CGFloat = 402
    static let centerX: CGFloat = 201
    static let panelY: CGFloat = 33
    static let panelBodyTopY: CGFloat = 33
    static let contentTopInset: CGFloat = 28
    static let textWidth: CGFloat = 322
    static let textToButtonGap: CGFloat = 25
    static let buttonWidth: CGFloat = 321
    static let buttonHeight: CGFloat = 42
    static let buttonToSourceGap: CGFloat = 13
    static let sourceHeight: CGFloat = 26
    static let bottomInset: CGFloat = 22
    static let bottomCoverExtension: CGFloat = 76
    static let closeY: CGFloat = 96
}

struct V2FeedbackActionButton: View {
    enum Tone {
        case correct
        case wrong
        case disabled
    }

    let title: String
    let tone: Tone
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(fill)
                        .shadow(color: shadow, radius: 4, x: 0, y: 4)
                )
        }
        .buttonStyle(.plain)
        .disabled(tone == .disabled)
    }

    private var fill: Color {
        switch tone {
        case .correct:
            return V2Color.primaryAction
        case .wrong:
            return Color(hex: 0xF36454)
        case .disabled:
            return V2Color.lockedBorder
        }
    }

    private var shadow: Color {
        switch tone {
        case .correct:
            return Color(hex: 0x98A35E).opacity(0.20)
        case .wrong:
            return Color(hex: 0xF36454).opacity(0.20)
        case .disabled:
            return .clear
        }
    }
}

private struct V2FeedbackPanelShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 402
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: x * sx, y: y)
        }

        var path = Path()
        path.move(to: CGPoint(x: 403 * sx, y: rect.maxY))
        path.addLine(to: p(403, 33.0902))
        path.addLine(to: p(332, 33.0902))
        path.addLine(to: p(327.407, 13.3231))
        path.addCurve(
            to: p(322.135, 12.1367),
            control1: p(326.839, 10.8773),
            control2: p(323.696, 10.1702)
        )
        path.addLine(to: p(305.5, 33.0902))
        path.addLine(to: p(-3, 33.0902))
        path.addLine(to: CGPoint(x: -3 * sx, y: rect.maxY))
        path.closeSubpath()
        return path
    }
}

private struct V2FeedbackPanelTopStroke: Shape {
    func path(in rect: CGRect) -> Path {
        let sx = rect.width / 402
        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: x * sx, y: y)
        }

        var path = Path()
        path.move(to: p(0, 33.59))
        path.addLine(to: p(305.741, 33.59))
        path.addLine(to: p(305.892, 33.4014))
        path.addLine(to: p(322.526, 12.4473))
        path.addCurve(
            to: p(326.92, 13.4365),
            control1: p(323.827, 10.8085),
            control2: p(326.446, 11.3984)
        )
        path.addLine(to: p(331.513, 33.2031))
        path.addLine(to: p(331.603, 33.5898))
        path.addLine(to: p(402, 33.5898))
        return path
    }
}
