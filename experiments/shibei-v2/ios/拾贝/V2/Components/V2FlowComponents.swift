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
    let status: V2ChapterReviewStatus
    let source: String
    let knowledgeCount: Int
    let questionCount: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 12) {
                V2ChapterStatusTag(status: status)
                Spacer(minLength: 12)
            }

            Text(title)
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(Color(hex: 0x383838))
                .lineSpacing(4)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            HStack(alignment: .center, spacing: 6) {
                Image("V2ChapterSourceIcon")
                    .resizable()
                    .renderingMode(.original)
                    .scaledToFit()
                    .frame(width: 20, height: 20)

                Text(source)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color(hex: 0xACACAC))

                Spacer()

                Text("\(knowledgeCount)个知识点  \(questionCount)道题")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(Color(hex: 0xACACAC))
            }
        }
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
    }
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

struct V2GeneratedChaptersSummaryCard: View {
    let count: Int

    var body: some View {
        HStack(spacing: 0) {
            Text("已生成 ")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(V2Color.textPrimary)
            Text("\(count)")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(V2Color.primary)
                .baselineOffset(-1)
            Text(" 个章节")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(V2Color.textPrimary)
            Spacer()
        }
        .padding(.horizontal, 22)
        .frame(height: 82)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
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
        ZStack(alignment: .bottomLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(height: 82)
                .frame(maxHeight: .infinity, alignment: .bottom)
                .v2Shadow()

            VStack(alignment: .leading, spacing: 8) {
                Text("发现好内容")
                    .font(.system(size: 16, weight: .medium))
                    .tracking(-0.64)
                    .foregroundStyle(Color(hex: 0xA5AE66))

                Text("不用上传，也可以先体验一篇好文章如何变成复习路径。")
                    .font(.system(size: 10, weight: .regular))
                    .tracking(-0.24)
                    .foregroundStyle(Color(hex: 0x575757))
                    .lineSpacing(7)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.leading, 18)
            .padding(.trailing, 108)
            .padding(.bottom, 18)

            Image("V2DiscoverHeroMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 104, height: 124)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .offset(x: -8, y: 0)
                .allowsHitTesting(false)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 143)
    }
}

struct V2ArticleTagPill: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.system(size: 8, weight: .regular))
            .foregroundStyle(Color(hex: 0x5E5E5E))
            .frame(width: 35.4, height: 15.7)
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
                let infoWidth = min(231, max(0, proxy.size.width * 0.72))

                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .v2Shadow()

                    Image("V2DiscoverArticleThumbnail")
                        .resizable()
                        .renderingMode(.original)
                        .scaledToFill()
                        .frame(width: 119, height: 94)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .clipped()

                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(V2Color.surfaceCream)
                        .frame(width: infoWidth, height: 94)

                    VStack(alignment: .leading, spacing: 8) {
                        Text(title)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(Color(hex: 0x383838))
                            .lineSpacing(8)
                            .lineLimit(2)
                            .frame(maxWidth: infoWidth - 34, alignment: .leading)

                        Text(source)
                            .font(.system(size: 10, weight: .regular))
                            .foregroundStyle(Color(hex: 0xA3A3A3))
                            .lineLimit(1)

                        HStack(spacing: 8) {
                            ForEach(tags.prefix(3), id: \.self) { tag in
                                V2ArticleTagPill(title: tag)
                            }
                        }
                    }
                    .padding(.leading, 20)
                    .padding(.vertical, 13)
                    .frame(width: infoWidth, height: 94, alignment: .topLeading)
                }
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            }
            .frame(height: 94)
        }
        .buttonStyle(.plain)
    }
}

struct V2NotesSummaryCard: View {
    let count: Int

    var body: some View {
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(height: 82)
                .frame(maxHeight: .infinity, alignment: .top)
                .v2Shadow()

            Image("V2NotesSummaryWave")
                .resizable()
                .renderingMode(.original)
                .scaledToFill()
                .frame(height: 54)
                .frame(maxWidth: .infinity)
                .clipped()
                .opacity(0.95)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("已收藏 ")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color(hex: 0x383838))
                Text("\(count)")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color(hex: 0xA5AE66))
                    .baselineOffset(-1)
                Text(" 个题目")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(Color(hex: 0x383838))
            }
            .tracking(-0.8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, 64)
            .padding(.bottom, 48)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 90)
    }
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
                .lineSpacing(8)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 18)
                .padding(.trailing, 54)
                .padding(.top, 8)

            Text(source)
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color(hex: 0x827C75))
                .lineLimit(1)
                .offset(x: 20, y: 55)

            V2QuestionTypePill(title: type)
                .offset(x: 22, y: 92)

            Image("V2NotesBookmark")
                .resizable()
                .renderingMode(.original)
                .frame(width: 12, height: 18)
                .offset(x: 290, y: 25)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 136)
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
