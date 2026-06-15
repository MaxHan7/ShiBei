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
        .buttonStyle(.plain)
        .disabled(tone == .disabled)
    }
}

struct V2FlowTopBar: View {
    let title: String
    let showSourceButton: Bool
    let onBack: () -> Void
    let onSource: () -> Void

    init(
        title: String,
        showSourceButton: Bool = false,
        onBack: @escaping () -> Void,
        onSource: @escaping () -> Void = {}
    ) {
        self.title = title
        self.showSourceButton = showSourceButton
        self.onBack = onBack
        self.onSource = onSource
    }

    var body: some View {
        ZStack {
            Text(title)
                .font(V2Typography.pageTitle)
                .foregroundStyle(V2Color.textPrimary)

            HStack {
                V2CircleIconButton(kind: .back, action: onBack)
                Spacer()
                if showSourceButton {
                    V2CircleIconButton(kind: .sourceDocument, action: onSource)
                }
            }
        }
        .frame(height: 52)
        .padding(.horizontal, V2Spacing.screenMargin)
    }
}

struct V2FlowScreen<Content: View>: View {
    let title: String
    var showSourceButton: Bool = false
    let onBack: () -> Void
    var onSource: () -> Void = {}
    @ViewBuilder let content: () -> Content

    var body: some View {
        ZStack {
            V2Color.pageGreenBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                V2FlowTopBar(
                    title: title,
                    showSourceButton: showSourceButton,
                    onBack: onBack,
                    onSource: onSource
                )
                .padding(.top, 22)

                content()
            }
        }
    }
}

struct V2UnitProgressBar: View {
    let current: Int
    let total: Int

    private var progress: CGFloat {
        guard total > 0 else { return 0 }
        return CGFloat(current) / CGFloat(total)
    }

    var body: some View {
        VStack(spacing: 6) {
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(V2Color.surfaceNav)
                    .frame(height: 12)
                    .v2Shadow(V2Shadow.subtleGreen)

                Capsule()
                    .fill(V2Color.primary)
                    .frame(width: max(18, progress * 220), height: 12)
            }
            .frame(width: 220)

            Text("\(current) / \(total)")
                .font(V2Typography.label)
                .foregroundStyle(V2Color.textMuted)
        }
    }
}

struct V2QuestionOptionCard: View {
    let title: String
    let state: V2QuestionOptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(title)
                    .font(V2Typography.bodyEmphasis)
                    .foregroundStyle(V2Color.textPrimary)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)

                stateGlyph
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 15)
            .frame(maxWidth: .infinity, minHeight: 58)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(fill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(border, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var stateGlyph: some View {
        switch state {
        case .normal:
            EmptyView()
        case .correct:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(V2Color.primary)
        case .wrong:
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(V2Color.feedbackWrongBorder)
        }
    }

    private var fill: Color {
        switch state {
        case .normal:
            V2Color.surfaceCream
        case .correct:
            V2Color.feedbackCorrectFill
        case .wrong:
            V2Color.feedbackWrongFill
        }
    }

    private var border: Color {
        switch state {
        case .normal:
            V2Color.borderSoftGreen.opacity(0.7)
        case .correct:
            V2Color.primary
        case .wrong:
            V2Color.feedbackWrongBorder
        }
    }
}

struct V2MatchingOptionCard: View {
    let title: String
    let state: V2MatchingOptionState
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(V2Color.textPrimary)
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity)
                .frame(height: 64)
                .padding(.horizontal, 10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(fill)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(border, lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
        .disabled(state == .locked)
    }

    private var fill: Color {
        switch state {
        case .normal:
            V2Color.surfaceCream
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
}

struct V2AnswerFeedbackPanel: View {
    let text: String
    let isCorrect: Bool
    let onContinue: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Image("V2MascotFeedbackBack")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 74)
                .offset(x: -24, y: -56)
                .zIndex(0)

            VStack(alignment: .leading, spacing: 14) {
                Text(isCorrect ? "理解到位" : "容易误会")
                    .font(V2Typography.cardTitle)
                    .foregroundStyle(isCorrect ? V2Color.primary : V2Color.feedbackWrongBorder)

                Text(text)
                    .font(V2Typography.body)
                    .foregroundStyle(V2Color.textSecondary)
                    .lineSpacing(5)
                    .lineLimit(3)

                V2PrimaryActionButton(
                    title: "继续",
                    tone: isCorrect ? .normal : .wrong,
                    height: 42,
                    action: onContinue
                )
            }
            .padding(20)
            .padding(.top, 14)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .v2Shadow()
            )
            .zIndex(1)

            Image("V2MascotFeedbackFront")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 42)
                .offset(x: -42, y: -18)
                .zIndex(2)
        }
        .padding(.top, 46)
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

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color(hex: 0xF2EFDC))
                    .frame(width: 42, height: 42)
                Image(isSuccess ? "V2NotificationSuccessIcon" : "V2NotificationFailureIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 37, height: 37)
            }

            VStack(alignment: .leading, spacing: 5) {
                Text(title)
                    .font(V2Typography.bodyEmphasis)
                    .foregroundStyle(V2Color.textPrimary)
                Text(message)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.textMuted)
            }

            Spacer()
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

struct V2ChapterCard: View {
    let title: String
    let status: String
    let progress: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 7) {
                    Text(title)
                        .font(V2Typography.bodyEmphasis)
                        .foregroundStyle(V2Color.textPrimary)
                        .lineLimit(2)
                    Text(progress)
                        .font(V2Typography.label)
                        .foregroundStyle(V2Color.textMuted)
                }
                Spacer()
                Text(status)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(Color(hex: 0xF2EFDC))
                    )
            }
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
}

struct V2DiscoverChip: View {
    let title: String
    let isSelected: Bool

    var body: some View {
        Text(title)
            .font(V2Typography.label)
            .foregroundStyle(isSelected ? .white : V2Color.textPrimary)
            .frame(width: 61, height: 27)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isSelected ? Color(hex: 0x929A4F) : Color(hex: 0xFEF9F2))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(V2Color.decorativeLeaf, lineWidth: 1)
                    )
                    .v2Shadow()
            )
    }
}

struct V2RecommendedArticleCard: View {
    let title: String
    let summary: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 12) {
                Image("V2DiscoverArticleThumbnail")
                    .resizable()
                    .scaledToFill()
                    .frame(height: 118)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Text(title)
                    .font(V2Typography.bodyEmphasis)
                    .foregroundStyle(V2Color.textPrimary)
                    .lineLimit(2)

                Text(summary)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.textMuted)
                    .lineLimit(2)
            }
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .v2Shadow()
            )
        }
        .buttonStyle(.plain)
    }
}

struct V2ProfileStatCard: View {
    let value: String
    let label: String
    let assetName: String

    var body: some View {
        VStack(spacing: 9) {
            Image(assetName)
                .resizable()
                .renderingMode(.original)
                .frame(width: 33, height: 33)

            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(.system(size: 25, weight: .bold))
                    .foregroundStyle(V2Color.textPrimary)
                Text(label)
                    .font(V2Typography.label)
                    .foregroundStyle(V2Color.textMuted)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(V2Color.surfaceCream)
        )
    }
}

struct V2ProfileSettingRow: View {
    let title: String
    let assetName: String

    var body: some View {
        HStack(spacing: 12) {
            Image(assetName)
                .resizable()
                .renderingMode(.original)
                .frame(width: 33, height: 33)

            Text(title)
                .font(V2Typography.bodyEmphasis)
                .foregroundStyle(V2Color.textPrimary)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(V2Color.textMuted)
        }
        .padding(.vertical, 12)
    }
}
