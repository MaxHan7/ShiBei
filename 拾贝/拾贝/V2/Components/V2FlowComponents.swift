import SwiftUI

enum V2ActionButtonTone {
    case normal
    case wrong
    case disabled

    var fill: Color {
        switch self {
        case .normal:
            V2Color.primaryAction
        case .wrong:
            V2Color.feedbackWrongBorder
        case .disabled:
            V2Color.lockedBorder
        }
    }
}

struct V2PrimaryActionButton: View {
    let title: String
    var tone: V2ActionButtonTone = .normal
    var height: CGFloat = 53
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: height)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(tone.fill)
                        .v2Shadow()
                )
        }
        .frame(maxWidth: V2Layout.contentMaxWidth)
        .buttonStyle(.plain)
        .disabled(tone == .disabled)
    }
}

struct V2TopChrome<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .frame(height: V2Layout.topBarHeight)
            .v2PageContentWidth()
            .padding(.top, V2Layout.topBarTopPadding)
    }
}

struct V2FlowTopBar: View {
    let title: String
    var titleFont: Font = V2Typography.pageTitle
    var titleColor: Color = V2Color.topTitle
    let showSourceButton: Bool
    let showFavoriteButton: Bool
    let isFavoriteSaved: Bool
    let onBack: () -> Void
    let onSource: () -> Void
    let onFavorite: () -> Void

    init(
        title: String,
        titleFont: Font = V2Typography.pageTitle,
        titleColor: Color = V2Color.topTitle,
        showSourceButton: Bool = false,
        showFavoriteButton: Bool = false,
        isFavoriteSaved: Bool = false,
        onBack: @escaping () -> Void,
        onSource: @escaping () -> Void = {},
        onFavorite: @escaping () -> Void = {}
    ) {
        self.title = title
        self.titleFont = titleFont
        self.titleColor = titleColor
        self.showSourceButton = showSourceButton
        self.showFavoriteButton = showFavoriteButton
        self.isFavoriteSaved = isFavoriteSaved
        self.onBack = onBack
        self.onSource = onSource
        self.onFavorite = onFavorite
    }

    var body: some View {
        ZStack {
            if !title.isEmpty {
                Text(title)
                    .font(titleFont)
                    .foregroundStyle(titleColor)
            }

            HStack {
                V2CircleIconButton(kind: .back, action: onBack)
                Spacer()
                if showFavoriteButton {
                    V2QuestionFavoriteButton(isSaved: isFavoriteSaved, action: onFavorite)
                } else if showSourceButton {
                    V2CircleIconButton(kind: .sourceDocument, action: onSource)
                }
            }
        }
        .frame(height: V2Layout.topBarHeight)
    }
}

struct V2FlowScreen<Content: View>: View {
    let title: String
    var titleFont: Font = V2Typography.pageTitle
    var titleColor: Color = V2Color.topTitle
    var showSourceButton: Bool = false
    var showFavoriteButton: Bool = false
    var isFavoriteSaved: Bool = false
    let onBack: () -> Void
    var onSource: () -> Void = {}
    var onFavorite: () -> Void = {}
    @ViewBuilder let content: () -> Content

    var body: some View {
        GeometryReader { _ in
            ZStack(alignment: .top) {
                V2Color.pageGreenBackground
                    .ignoresSafeArea()

                content()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.top, V2Layout.topChromeReservedHeight)

                V2TopChrome {
                    V2FlowTopBar(
                        title: title,
                        titleFont: titleFont,
                        titleColor: titleColor,
                        showSourceButton: showSourceButton,
                        showFavoriteButton: showFavoriteButton,
                        isFavoriteSaved: isFavoriteSaved,
                        onBack: onBack,
                        onSource: onSource,
                        onFavorite: onFavorite
                    )
                }
                .zIndex(20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .v2InteractiveBackSwipe(onBack: onBack)
    }
}

private struct V2InteractiveBackSwipeModifier: ViewModifier {
    let onBack: () -> Void
    @State private var hasTriggeredBack = false

    private let edgeActivationWidth: CGFloat = 28
    private let minimumHorizontalTranslation: CGFloat = 72
    private let verticalToleranceRatio: CGFloat = 1.35

    func body(content: Content) -> some View {
        content
            .contentShape(Rectangle())
            .simultaneousGesture(
                DragGesture(minimumDistance: 18, coordinateSpace: .global)
                    .onChanged { value in
                        guard !hasTriggeredBack,
                              value.startLocation.x <= edgeActivationWidth,
                              value.translation.width >= minimumHorizontalTranslation,
                              value.translation.width > abs(value.translation.height) * verticalToleranceRatio else {
                            return
                        }
                        hasTriggeredBack = true
                        onBack()
                    }
                    .onEnded { _ in
                        hasTriggeredBack = false
                    }
            )
    }
}

private extension View {
    func v2InteractiveBackSwipe(onBack: @escaping () -> Void) -> some View {
        modifier(V2InteractiveBackSwipeModifier(onBack: onBack))
    }
}

struct V2UnitProgressBar: View {
    private let progress: CGFloat

    init(current: Int, total: Int) {
        if total > 0 {
            progress = min(max(CGFloat(current) / CGFloat(total), 0), 1)
        } else {
            progress = 0
        }
    }

    init(progressFraction: CGFloat) {
        progress = min(max(progressFraction, 0), 1)
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(V2Color.surfaceNav)
                    .frame(height: 11)
                    .v2Shadow(V2Shadow.subtleGreen)

                Capsule()
                    .fill(V2Color.unitProgressFill)
                    .frame(
                        width: progress > 0 ? max(11, geometry.size.width * progress) : 0,
                        height: 11
                    )
            }
            .frame(height: 11)
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .frame(height: 11)
    }
}

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
                    .foregroundStyle(Color(hex: 0x575757))
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
        isCorrect ? Color(hex: 0xA5AE66) : Color(hex: 0xF36454)
    }

    private var feedbackShadow: Color {
        isCorrect ? Color(hex: 0xA5AE66).opacity(0.20) : Color(hex: 0xF36454).opacity(0.22)
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
    static let bottomCoverExtension: CGFloat = 34
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
            return Color(hex: 0xA5AE66)
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

struct V2InfoCard<Content: View>: View {
    var shadow: V2ShadowSpec? = V2Shadow.softGreen
    var border: Color?
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .padding(24)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .modifier(V2OptionalShadow(shadow: shadow))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(border ?? .clear, lineWidth: border == nil ? 0 : 1.5)
            )
    }
}

private struct V2OptionalShadow: ViewModifier {
    let shadow: V2ShadowSpec?

    func body(content: Content) -> some View {
        if let shadow {
            content.v2Shadow(shadow)
        } else {
            content
        }
    }
}

struct V2NotificationCard: View {
    let title: String
    let message: String
    let isSuccess: Bool
    var time: String = "刚刚"
    var action: (() -> Void)?

    var body: some View {
        Button {
            action?()
        } label: {
            cardContent
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    private var cardContent: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
                .position(x: 18, y: 56)

            ZStack {
                Circle()
                    .fill(iconShellFill)
                    .frame(width: 65, height: 65)

                Image(isSuccess ? "V2NotificationSuccessIcon" : "V2NotificationFailureIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 37, height: 37)
            }
            .position(x: 61.5, y: 58)

            VStack(alignment: .leading, spacing: 10) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color(hex: 0x252419))
                    .lineLimit(1)

                Text(message)
                    .font(.system(size: 13, weight: .regular))
                    .foregroundStyle(Color(hex: 0x575757).opacity(0.74))
                    .lineSpacing(5)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 172, alignment: .leading)
            .position(x: 199, y: 58)

            Text(time)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757).opacity(0.62))
                .lineLimit(1)
                .frame(width: 46)
                .position(x: 296, y: 28)

            V2NotificationChevron(color: statusColor)
                .frame(width: 24, height: 24)
                .position(x: 300, y: 58)
        }
        .frame(width: V2Layout.contentMaxWidth, height: 116)
    }

    private var statusColor: Color {
        isSuccess ? Color(hex: 0xA7AD62) : Color(hex: 0xED765C)
    }

    private var iconShellFill: Color {
        isSuccess
            ? Color(hex: 0xE8E9C2).opacity(0.52)
            : Color(hex: 0xFFECE4).opacity(0.90)
    }
}

struct V2NotificationSummaryBanner: View {
    let unreadCount: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: 321, height: 82)
                .offset(x: 4, y: 53)
                .v2Shadow()
                .zIndex(0)

            Image("V2NotificationMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 118, height: 128)
                .offset(x: 182, y: 7)
                .zIndex(2)

            Image("V2NotificationBannerWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: 329, height: 143)
                .zIndex(3)

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("你有")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(V2Color.textPrimary)

                Text("\(unreadCount)")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(V2Color.primaryAction)

                Text("条新通知")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(V2Color.textPrimary)
            }
            .padding(.leading, 26)
            .padding(.top, 80)
            .frame(maxWidth: 208, alignment: .leading)
            .zIndex(4)
        }
        .frame(width: 329, height: 143)
    }
}

private struct V2NotificationChevron: View {
    let color: Color

    var body: some View {
        Path { path in
            path.move(to: CGPoint(x: 8, y: 7))
            path.addLine(to: CGPoint(x: 15, y: 12))
            path.addLine(to: CGPoint(x: 8, y: 17))
        }
        .stroke(color, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
    }
}

struct V2ChapterCard: View {
    let title: String
    let status: V2ChapterReviewStatus
    let source: String
    let knowledgeCount: Int
    let questionCount: Int
    let generationProgressText: String?

    init(
        title: String,
        status: V2ChapterReviewStatus,
        source: String,
        knowledgeCount: Int,
        questionCount: Int,
        generationProgressText: String? = nil
    ) {
        self.title = title
        self.status = status
        self.source = source
        self.knowledgeCount = knowledgeCount
        self.questionCount = questionCount
        self.generationProgressText = generationProgressText
    }

    private var isGenerating: Bool {
        status == .generating
    }

    private var headlineText: String {
        if isGenerating {
            return generationProgressText ?? "正在生成知识点..."
        }
        return title
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top, spacing: 12) {
                V2ChapterStatusTag(status: status)
                Spacer(minLength: 12)
            }

            Text(headlineText)
                .font(V2ChapterCardMetrics.titleFont)
                .foregroundStyle(Color(hex: 0x383838))
                .lineSpacing(V2ChapterCardMetrics.titleLineSpacing)
                .lineLimit(2)
                .truncationMode(.tail)
                .frame(
                    maxWidth: .infinity,
                    minHeight: V2ChapterCardMetrics.titleBlockHeight,
                    maxHeight: V2ChapterCardMetrics.titleBlockHeight,
                    alignment: .topLeading
                )
                .padding(.top, V2ChapterCardMetrics.titleTopSpacing)

            Spacer(minLength: 0)

            HStack(alignment: .center, spacing: 6) {
                V2ChapterSourceDocumentIcon()
                    .frame(width: 20, height: 20)

                Text(source)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color(hex: 0xACACAC))

                Spacer()

                if !isGenerating {
                    Text("\(knowledgeCount)个知识点  \(questionCount)道题")
                        .font(.system(size: 11, weight: .regular))
                        .foregroundStyle(Color(hex: 0xACACAC))
                }
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, minHeight: 136, maxHeight: 136, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ChapterSourceDocumentIcon: View {
    var body: some View {
        V2ChapterSourceDocumentShape()
            .stroke(
                Color(hex: 0xACACAC),
                style: StrokeStyle(lineWidth: 1, lineCap: .round, lineJoin: .round)
            )
            .frame(width: 10, height: 12)
            .frame(width: 20, height: 20)
    }
}

private struct V2ChapterSourceDocumentShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sourceWidth: CGFloat = 9.4816
        let sourceHeight: CGFloat = 11.588
        let scale = min(rect.width / sourceWidth, rect.height / sourceHeight)
        let offsetX = rect.midX - sourceWidth * scale / 2
        let offsetY = rect.midY - sourceHeight * scale / 2

        func p(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
        }

        var path = Path()
        path.move(to: p(2, 11.588))
        path.addCurve(to: p(0, 9.588), control1: p(0.8954, 11.588), control2: p(0, 10.693))
        path.addLine(to: p(0, 0))
        path.addLine(to: p(6.0952, 0))
        path.addLine(to: p(9.4814, 3.219))
        path.addLine(to: p(9.4814, 9.588))
        path.addCurve(to: p(7.4814, 11.588), control1: p(9.4814, 10.693), control2: p(8.586, 11.588))
        path.closeSubpath()

        path.move(to: p(5.2676, 0))
        path.addLine(to: p(5.2676, 4.214))
        path.addLine(to: p(9.4816, 4.214))

        path.move(to: p(2.1074, 6.32))
        path.addLine(to: p(6.3214, 6.32))

        path.move(to: p(2.1074, 9.48))
        path.addLine(to: p(6.3214, 9.48))

        return path
    }
}

struct V2GeneratingChapterDetailCard: View {
    let progress: CGFloat
    let statusText: String
    let isCompleted: Bool
    let onSource: () -> Void
    let onOpenChapter: () -> Void
    let onDelete: () -> Void

    private var accentColor: Color {
        Color(hex: 0xADD3FF)
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            V2GeneratingClockBadge()
            .frame(width: 34, height: 34)
            .offset(x: 23, y: 21)

            Text("章节正在生成")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(hex: 0x575757))
                .frame(width: 118, alignment: .leading)
                .frame(minHeight: 39, alignment: .leading)
                .offset(x: 59, y: 18)

            V2GeneratingSourceLinkChip(accent: accentColor, action: onSource)
                .offset(x: 186, y: 20)

            V2GeneratingProgressBar(progress: progress)
                .frame(width: 272, height: 43)
                .offset(x: 23, y: 63)

            Text(statusText)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(Color(hex: 0x736D78))
                .lineLimit(1)
                .frame(width: 283, alignment: .leading)
                .frame(minHeight: 27, alignment: .leading)
                .offset(x: 20, y: 144)

            if isCompleted {
                Button(action: onOpenChapter) {
                    Text("查看章节")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 280, height: 42)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(V2Color.primaryAction)
                                .shadow(color: V2Color.primaryAction.opacity(0.28), radius: 3, x: 0, y: 4)
                        )
                }
                .buttonStyle(.plain)
                .offset(x: 23, y: 221)
            } else {
                Button(action: onDelete) {
                    Text("取消生成")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x6E7378))
                        .frame(width: 280, height: 42)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(V2Color.surfaceCream)
                                .shadow(color: accentColor.opacity(0.24), radius: 3, x: 0, y: 4)
                        )
                }
                .buttonStyle(.plain)
                .offset(x: 23, y: 221)
            }
        }
        .frame(width: V2Layout.contentMaxWidth, height: 302)
    }
}

struct V2GeneratingProgressBar: View {
    let progress: CGFloat

    private var clampedProgress: CGFloat {
        min(max(progress, 0), 1)
    }

    var body: some View {
        GeometryReader { geometry in
            let trackWidth = max(0, geometry.size.width - 8)

            ZStack(alignment: .topLeading) {
                Capsule()
                    .fill(V2Color.surfaceNav)
                    .frame(width: trackWidth, height: 11)
                    .shadow(color: Color(hex: 0xADD3FF).opacity(0.2), radius: 2, x: 0, y: 4)
                    .offset(x: 4, y: 16)

                Capsule()
                    .fill(Color(hex: 0xADD3FF))
                    .frame(width: max(11, trackWidth * clampedProgress), height: 11)
                    .offset(x: 4, y: 16)
            }
        }
    }
}

private struct V2GeneratingClockBadge: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(Color(hex: 0xADD3FF))

            Circle()
                .fill(V2Color.surfaceCream)
                .frame(width: 18, height: 18)

            Path { path in
                path.move(to: CGPoint(x: 16, y: 13))
                path.addLine(to: CGPoint(x: 16, y: 18))
                path.addLine(to: CGPoint(x: 21, y: 18))
            }
            .stroke(
                Color(hex: 0xADD3FF),
                style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
            )
        }
        .accessibilityHidden(true)
    }
}

private struct V2GeneratingSourceLinkChip: View {
    var accent: Color = Color(hex: 0xADD3FF)
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(accent)
                        .frame(width: 23, height: 23)

                    V2GeneratingLinkIcon()
                        .stroke(
                            V2Color.surfaceCream,
                            style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
                        )
                        .frame(width: 12, height: 12)
                }
                .frame(width: 34, height: 34)

                Text("原文链接")
                    .font(V2Typography.caption)
                    .foregroundStyle(Color(hex: 0x767676))
                    .lineLimit(1)
            }
            .padding(.leading, 12)
            .padding(.trailing, 14)
            .frame(width: 112, alignment: .leading)
            .frame(minHeight: 44, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .shadow(color: accent.opacity(0.2), radius: 2, x: 0, y: 4)
            )
        }
        .buttonStyle(.plain)
        .frame(width: 112, height: 44, alignment: .topLeading)
        .accessibilityLabel("查看原文")
    }
}

private struct V2GeneratingLinkIcon: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let scaleX = rect.width / 12
        let scaleY = rect.height / 12

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scaleX, y: rect.minY + y * scaleY)
        }

        path.move(to: point(4.36, 7.20))
        path.addLine(to: point(7.33, 3.93))
        path.move(to: point(3.10, 5.31))
        path.addLine(to: point(1.99, 6.53))
        path.addCurve(to: point(2.13, 9.65), control1: point(1.17, 7.43), control2: point(1.23, 8.83))
        path.addCurve(to: point(5.25, 9.50), control1: point(3.04, 10.47), control2: point(4.43, 10.40))
        path.addLine(to: point(6.37, 8.28))
        path.move(to: point(5.33, 2.86))
        path.addLine(to: point(6.44, 1.63))
        path.addCurve(to: point(9.56, 1.49), control1: point(7.27, 0.73), control2: point(8.66, 0.66))
        path.addCurve(to: point(9.71, 4.60), control1: point(10.47, 2.31), control2: point(10.53, 3.71))
        path.addLine(to: point(8.60, 5.83))

        return path
    }
}

private enum V2ChapterCardMetrics {
    static let titleFont = Font.system(size: 16, weight: .medium)
    static let titleLineSpacing: CGFloat = 4
    static let titleBlockHeight: CGFloat = 42
    static let titleTopSpacing: CGFloat = 12
}

struct V2ChapterStatusTag: View {
    let status: V2ChapterReviewStatus

    var body: some View {
        Text(status.title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(Color(hex: status.foregroundColor.hex))
            .frame(width: 55, height: 22)
            .background(
                Capsule()
                    .fill(Color(hex: status.backgroundColor.hex))
            )
    }
}

struct V2GenerationStartedDialog: View {
    let onAcknowledge: () -> Void

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
                .frame(width: 321, height: 142)
                .offset(x: 4, y: 24)

            Image("V2GeneratingPopupWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: 321, height: 82)
                .offset(x: 4, y: 84)

            Image("V2GeneratingPopupMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 118, height: 141)
                .offset(x: 197, y: 0)
                .allowsHitTesting(false)

            Text("章节正在生成中，\n完成后会通知你")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(8)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(width: 115, height: 42, alignment: .leading)
                .offset(x: 34, y: 62)

            Button(action: onAcknowledge) {
                Text("知道了")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(V2Color.primaryAction)
                    .frame(width: 80, height: 32)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .offset(x: 124, y: 130)
        }
        .frame(width: 329, height: 174)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("章节正在生成中，完成后会通知你")
    }
}

struct V2GeneratedChaptersSummaryCard: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("已生成 ")
                    .font(V2GeneratedChaptersSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))

                Text("\(count)")
                    .font(V2GeneratedChaptersSummaryCardMetrics.numberFont)
                    .foregroundStyle(Color(hex: 0xA5AE66))

                Text(" 个章节")
                    .font(V2GeneratedChaptersSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
            }
            .frame(
                width: V2GeneratedChaptersSummaryCardMetrics.copyWidth,
                height: V2GeneratedChaptersSummaryCardMetrics.copyHeight,
                alignment: .leading
            )
            .offset(x: V2GeneratedChaptersSummaryCardMetrics.copyX, y: V2GeneratedChaptersSummaryCardMetrics.copyY)
        }
        .frame(maxWidth: .infinity, minHeight: 82, maxHeight: 82, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private enum V2GeneratedChaptersSummaryCardMetrics {
    static let copyX: CGFloat = 23
    static let copyY: CGFloat = 28
    static let copyWidth: CGFloat = 150
    static let copyHeight: CGFloat = 24
    static let textFont = Font.system(size: 12, weight: .regular, design: .default)
    static let numberFont = Font.system(size: 20, weight: .bold, design: .default)
}

struct V2DiscoverChip: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        Text(title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(isSelected ? Color(hex: 0xFEF9F2) : Color(hex: 0x5E5E5E))
            .frame(width: 61, height: 27)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isSelected ? Color(hex: 0x929A4F) : Color(hex: 0xFEF9F2))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Color(hex: 0xDDE1AC), lineWidth: 1)
                    )
                    .v2Shadow()
            )
    }
}

struct V2DiscoverHeroCard: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: V2DiscoverHeroCardMetrics.cardWidth, height: V2DiscoverHeroCardMetrics.cardHeight)
                .offset(y: V2DiscoverHeroCardMetrics.cardY)
                .v2Shadow()

            Image("V2DiscoverHeroWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: V2DiscoverHeroCardMetrics.waveWidth, height: V2DiscoverHeroCardMetrics.waveHeight)
                .offset(x: V2DiscoverHeroCardMetrics.waveX, y: V2DiscoverHeroCardMetrics.cardY)
                .allowsHitTesting(false)

            Image("V2DiscoverHeroMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2DiscoverHeroCardMetrics.mascotWidth, height: V2DiscoverHeroCardMetrics.mascotHeight)
                .offset(x: V2DiscoverHeroCardMetrics.mascotX, y: V2DiscoverHeroCardMetrics.mascotY)
                .allowsHitTesting(false)

            Text("发现好内容")
                .font(.system(size: 16, weight: .medium))
                .tracking(-0.64)
                .foregroundStyle(Color(hex: 0xA5AE66))
                .lineLimit(1)
                .frame(width: V2DiscoverHeroCardMetrics.titleWidth, height: V2DiscoverHeroCardMetrics.titleHeight, alignment: .leading)
                .offset(x: V2DiscoverHeroCardMetrics.textX, y: V2DiscoverHeroCardMetrics.titleY)

            Text("将知识一键变成复习路径，\n让“收藏“变成记住")
                .font(V2Typography.labelRegular)
                .tracking(-0.24)
                .foregroundStyle(Color(hex: 0x575757))
                .lineSpacing(5)
                .lineLimit(2)
                .frame(width: V2DiscoverHeroCardMetrics.subtitleWidth, height: V2DiscoverHeroCardMetrics.subtitleHeight, alignment: .topLeading)
                .offset(x: V2DiscoverHeroCardMetrics.textX, y: V2DiscoverHeroCardMetrics.subtitleY)
        }
        .frame(maxWidth: .infinity)
        .frame(height: V2DiscoverHeroCardMetrics.heroHeight)
    }
}

private enum V2DiscoverHeroCardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 82
    static let heroHeight: CGFloat = 114
    static let cardY: CGFloat = 32
    static let waveWidth: CGFloat = 329
    static let waveHeight: CGFloat = 90
    static let waveX: CGFloat = -4
    static let textX: CGFloat = 19
    static let titleY: CGFloat = 43
    static let titleWidth: CGFloat = 131
    static let titleHeight: CGFloat = 24
    static let subtitleY: CGFloat = 72
    static let subtitleWidth: CGFloat = 167
    static let subtitleHeight: CGFloat = 41
    static let mascotX: CGFloat = 195
    static let mascotY: CGFloat = -21
    static let mascotWidth: CGFloat = 112
    static let mascotHeight: CGFloat = 136
}

struct V2ArticleTagPill: View {
    let title: String

    var body: some View {
        Text(title)
            .font(V2RecommendedArticleCardMetrics.tagFont)
            .foregroundStyle(Color(hex: 0x5E5E5E))
            .frame(
                width: V2RecommendedArticleCardMetrics.tagWidth,
                height: V2RecommendedArticleCardMetrics.tagHeight
            )
            .background(
                Capsule()
                    .fill(Color(hex: 0xFEF9F2))
                    .overlay(
                        Capsule()
                            .stroke(Color(hex: 0xDDE1AC), lineWidth: 1)
                    )
                    .v2Shadow()
            )
    }
}

struct V2RecommendedArticleCard: View {
    let title: String
    let source: String
    let tags: [String]
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            GeometryReader { proxy in
                let infoWidth = min(V2RecommendedArticleCardMetrics.infoWidth, max(0, proxy.size.width * 0.72))

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .v2Shadow()

                    Image("V2DiscoverArticleThumbnail")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFill()
                        .frame(width: 126, height: V2RecommendedArticleCardMetrics.cardHeight)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .clipped()

                    RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .frame(width: infoWidth, height: V2RecommendedArticleCardMetrics.cardHeight)

                    ZStack(alignment: .topLeading) {
                        Text(title)
                            .font(V2RecommendedArticleCardMetrics.titleFont)
                            .foregroundStyle(Color(hex: 0x383838))
                            .lineLimit(2)
                            .truncationMode(.tail)
                            .lineSpacing(4)
                            .frame(
                                width: V2RecommendedArticleCardMetrics.titleWidth,
                                height: V2RecommendedArticleCardMetrics.titleHeight,
                                alignment: .topLeading
                            )
                            .offset(x: V2RecommendedArticleCardMetrics.titleX, y: V2RecommendedArticleCardMetrics.titleY)

                        Text(source)
                            .font(V2RecommendedArticleCardMetrics.sourceFont)
                            .foregroundStyle(Color(hex: 0xA3A3A3))
                            .lineLimit(1)
                            .frame(
                                width: V2RecommendedArticleCardMetrics.titleWidth,
                                height: V2RecommendedArticleCardMetrics.sourceHeight,
                                alignment: .topLeading
                            )
                            .offset(x: V2RecommendedArticleCardMetrics.sourceX, y: V2RecommendedArticleCardMetrics.sourceY)

                        HStack(spacing: V2RecommendedArticleCardMetrics.tagSpacing) {
                            ForEach(tags.prefix(3), id: \.self) { tag in
                                V2ArticleTagPill(title: tag)
                            }
                        }
                        .offset(x: V2RecommendedArticleCardMetrics.tagsX, y: V2RecommendedArticleCardMetrics.tagsY)
                    }
                    .frame(width: infoWidth, height: V2RecommendedArticleCardMetrics.cardHeight, alignment: .topLeading)
                }
                .clipShape(RoundedRectangle(cornerRadius: V2RecommendedArticleCardMetrics.cornerRadius, style: .continuous))
            }
            .frame(height: V2RecommendedArticleCardMetrics.cardHeight)
        }
        .buttonStyle(.plain)
    }
}

private enum V2RecommendedArticleCardMetrics {
    static let cardHeight: CGFloat = 124
    static let infoWidth: CGFloat = 236
    static let cornerRadius: CGFloat = 15
    static let titleX: CGFloat = 24
    static let titleY: CGFloat = 16
    static let titleWidth: CGFloat = 167
    static let titleHeight: CGFloat = 42
    static let titleFont = V2Typography.bodySmallEmphasis
    static let sourceX: CGFloat = 24
    static let sourceY: CGFloat = 66
    static let sourceHeight: CGFloat = 19
    static let sourceFont = V2Typography.caption
    static let tagsX: CGFloat = 21
    static let tagsY: CGFloat = 92
    static let tagSpacing: CGFloat = 8.6
    static let tagFont = V2Typography.caption
    static let tagWidth: CGFloat = 44
    static let tagHeight: CGFloat = 20
}

struct V2NotesSummaryCard: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: V2NotesSummaryCardMetrics.cardWidth, height: V2NotesSummaryCardMetrics.cardFillHeight)
                .offset(y: V2NotesSummaryCardMetrics.cardFillY)
                .v2Shadow()

            Image("V2NotesSummaryWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: V2NotesSummaryCardMetrics.waveWidth, height: V2NotesSummaryCardMetrics.waveHeight)
                .offset(x: V2NotesSummaryCardMetrics.waveX, y: V2NotesSummaryCardMetrics.waveY)
                .allowsHitTesting(false)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("已收藏 ")
                    .font(V2NotesSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
                Text("\(count)")
                    .font(V2NotesSummaryCardMetrics.numberFont)
                    .foregroundStyle(Color(hex: 0xA5AE66))
                Text(" 个题目")
                    .font(V2NotesSummaryCardMetrics.textFont)
                    .foregroundStyle(Color(hex: 0x383838))
            }
            .tracking(-0.8)
            .frame(width: V2NotesSummaryCardMetrics.copyWidth, height: V2NotesSummaryCardMetrics.copyHeight, alignment: .leading)
            .offset(x: V2NotesSummaryCardMetrics.copyX, y: V2NotesSummaryCardMetrics.copyY)
        }
        .frame(width: V2NotesSummaryCardMetrics.cardWidth, height: V2NotesSummaryCardMetrics.componentHeight, alignment: .topLeading)
    }
}

private enum V2NotesSummaryCardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardFillHeight: CGFloat = 81
    static let cardFillY: CGFloat = 1
    static let componentHeight: CGFloat = 90
    static let waveWidth: CGFloat = 329
    static let waveHeight: CGFloat = 90
    static let waveX: CGFloat = -4
    static let waveY: CGFloat = 0
    static let copyX: CGFloat = 23
    static let copyY: CGFloat = 30
    static let copyWidth: CGFloat = 131
    static let copyHeight: CGFloat = 24
    static let textFont = Font.system(size: 12, weight: .regular)
    static let numberFont = Font.system(size: 20, weight: .bold)
}

struct V2QuestionTypePill: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(size: 12, weight: .regular))
            .foregroundStyle(Color(hex: 0x5A5D2C))
            .frame(width: 55, height: 22)
            .background(
                Capsule()
                    .fill(Color(hex: 0xF4F2DF))
            )
    }
}

struct V2SavedQuestionCard: View {
    let title: String
    let source: String
    let type: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(hex: 0x383838))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(
                    width: V2SavedQuestionCardMetrics.titleWidth,
                    height: V2SavedQuestionCardMetrics.titleHeight,
                    alignment: .leading
                )
                .offset(x: V2SavedQuestionCardMetrics.titleX, y: V2SavedQuestionCardMetrics.titleY)

            Text(source)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color(hex: 0x827C75))
                .lineLimit(1)
                .frame(
                    width: V2SavedQuestionCardMetrics.sourceWidth,
                    height: V2SavedQuestionCardMetrics.sourceHeight,
                    alignment: .leading
                )
                .offset(x: V2SavedQuestionCardMetrics.sourceX, y: V2SavedQuestionCardMetrics.sourceY)

            V2QuestionTypePill(title: type)
                .offset(x: V2SavedQuestionCardMetrics.typeX, y: V2SavedQuestionCardMetrics.typeY)

            Image("V2NotesBookmark")
                .resizable()
                .renderingMode(.original)
                .frame(width: 12, height: 18)
                .offset(x: V2SavedQuestionCardMetrics.bookmarkX, y: V2SavedQuestionCardMetrics.bookmarkY)
        }
        .frame(maxWidth: .infinity)
        .frame(height: V2SavedQuestionCardMetrics.cardHeight)
    }
}

private enum V2SavedQuestionCardMetrics {
    static let cardHeight: CGFloat = 136
    static let titleX: CGFloat = 18
    static let titleY: CGFloat = 8
    static let titleWidth: CGFloat = 258
    static let titleHeight: CGFloat = 51.63
    static let sourceX: CGFloat = 20
    static let sourceY: CGFloat = 55
    static let sourceWidth: CGFloat = 213
    static let sourceHeight: CGFloat = 19
    static let typeX: CGFloat = 18
    static let typeY: CGFloat = 92
    static let bookmarkX: CGFloat = 286
    static let bookmarkY: CGFloat = 25
}

struct V2ProfileHeaderCard: View {
    let name: String
    let bio: String
    let reviewedCount: String
    let streakDays: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2ProfileHeaderMetrics.cornerRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            Circle()
                .fill(Color(hex: 0xEEF0C7))
                .frame(width: 78, height: 78)
                .overlay {
                    Image("V2MascotStatic")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFit()
                        .frame(width: 78)
                        .scaleEffect(0.8, anchor: .top)
                        .offset(y: 7)
                }
                .clipShape(Circle())
                .offset(x: 24, y: 16)

            Text(name)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(V2Color.textPrimary)
                .lineLimit(1)
                .offset(x: 127, y: 29)

            Text(bio)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(Color(hex: 0x575757).opacity(0.72))
                .lineLimit(1)
                .offset(x: 127, y: 64)

            HStack(spacing: 13) {
                V2ProfileStatCard(
                    title: "已复习",
                    value: reviewedCount,
                    unit: "个知识点",
                    assetName: "V2ProfileStatReviewed"
                )
                V2ProfileStatCard(
                    title: "连续学习",
                    value: streakDays,
                    unit: "天",
                    assetName: "V2ProfileStatStreak"
                )
            }
            .frame(width: V2ProfileHeaderMetrics.statGroupWidth)
            .offset(x: 24, y: 124)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 60)
                .opacity(0.86)
                .offset(x: 241, y: 170)
        }
        .frame(width: V2ProfileHeaderMetrics.cardWidth, height: V2ProfileHeaderMetrics.cardHeight)
    }
}

private enum V2ProfileHeaderMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 226
    static let cornerRadius: CGFloat = 15
    static let statGroupWidth: CGFloat = cardWidth - 48
    static let statCardWidth: CGFloat = (statGroupWidth - 13) / 2
    static let statCardHeight: CGFloat = 82
}

struct V2ProfileStatCard: View {
    let title: String
    let value: String
    let unit: String
    let assetName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(assetName)
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 32, height: 32)

                Text(title)
                    .font(V2Typography.labelRegular)
                    .foregroundStyle(Color(hex: 0x575757).opacity(0.72))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }

            HStack(alignment: .lastTextBaseline, spacing: 5) {
                Text(value)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(V2Color.textPrimary)
                    .monospacedDigit()

                Text(unit)
                    .font(V2Typography.labelRegular)
                    .foregroundStyle(Color(hex: 0x575757).opacity(0.72))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(
            width: V2ProfileHeaderMetrics.statCardWidth,
            height: V2ProfileHeaderMetrics.statCardHeight,
            alignment: .leading
        )
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

struct V2ProfileSettingsCard: View {
    var body: some View {
        VStack(spacing: 0) {
            V2ProfileSettingRow(title: "通知设置", assetName: "V2ProfileSettingNotification")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "隐私说明", assetName: "V2ProfileSettingPrivacy")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "账号说明", assetName: "V2ProfileSettingAccount")
        }
        .padding(.top, 10)
        .padding(.bottom, 10)
        .frame(width: 321, height: 190)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

private struct V2ProfileSettingDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color(hex: 0xECE9DC))
            .frame(height: 1)
            .padding(.leading, 72)
            .padding(.trailing, 29)
    }
}

struct V2ProfileSettingRow: View {
    let title: String
    let assetName: String

    var body: some View {
        HStack(spacing: 14) {
            Image(assetName)
                .resizable()
                .renderingMode(.original)
                .frame(width: 33, height: 33)

            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(Color(hex: 0x575757))

            Spacer()
        }
        .frame(height: 56)
        .padding(.leading, 24)
        .padding(.trailing, 31)
    }
}

struct V2UnitOverviewBoardCard: View {
    let overview: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            V2UnitBoardLeg(rotation: 13)
                .offset(x: 94, y: 238)
                .zIndex(0)

            V2UnitBoardLeg(rotation: -13)
                .offset(x: 204, y: 238)
                .zIndex(0)

            RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .overlay(
                    RoundedRectangle(cornerRadius: V2UnitOverviewBoardMetrics.cardRadius, style: .continuous)
                        .stroke(Color(hex: 0x929A4F), lineWidth: 1)
                )
                .frame(width: V2UnitOverviewBoardMetrics.cardWidth, height: V2UnitOverviewBoardMetrics.cardHeight)
                .zIndex(1)

            VStack(alignment: .leading, spacing: V2UnitOverviewBoardMetrics.labelBottomSpacing) {
                Text("核心知识点：")
                    .font(V2UnitOverviewBoardMetrics.bodyFont)
                    .foregroundStyle(Color(hex: 0x575757))

                Text(overview)
                    .font(V2UnitOverviewBoardMetrics.bodyFont)
                    .foregroundStyle(Color(hex: 0x575757))
                    .lineSpacing(V2UnitOverviewBoardMetrics.lineSpacing)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: V2UnitOverviewBoardMetrics.textWidth, alignment: .topLeading)
            .offset(x: V2UnitOverviewBoardMetrics.textX, y: V2UnitOverviewBoardMetrics.textY)
            .zIndex(2)

            Image("V2UnitOverviewMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2UnitOverviewBoardMetrics.mascotWidth, height: V2UnitOverviewBoardMetrics.mascotHeight)
                .offset(x: V2UnitOverviewBoardMetrics.mascotX, y: V2UnitOverviewBoardMetrics.mascotY)
                .zIndex(3)
        }
        .frame(width: V2UnitOverviewBoardMetrics.stageWidth, height: V2UnitOverviewBoardMetrics.stageHeight, alignment: .topLeading)
    }
}

private struct V2UnitBoardLeg: View {
    let rotation: Double

    var body: some View {
        Capsule()
            .fill(Color(hex: 0xDDE1AC))
            .frame(width: 10, height: 72)
            .rotationEffect(.degrees(rotation), anchor: .top)
    }
}

private enum V2UnitOverviewBoardMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 241
    static let cardRadius: CGFloat = 15
    static let stageWidth: CGFloat = 321
    static let stageHeight: CGFloat = 355
    static let textX: CGFloat = 29
    static let textY: CGFloat = 27
    static let textWidth: CGFloat = 263
    static let labelBottomSpacing: CGFloat = 27
    static let bodyFont = Font.system(size: 16, weight: .regular, design: .default)
    static let lineSpacing: CGFloat = 11.2
    static let mascotX: CGFloat = 204
    static let mascotY: CGFloat = 187
    static let mascotWidth: CGFloat = 153
    static let mascotHeight: CGFloat = 180
}
