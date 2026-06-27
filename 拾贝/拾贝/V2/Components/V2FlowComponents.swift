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
    let showDeleteButton: Bool
    let isFavoriteSaved: Bool
    let onBack: () -> Void
    let onSource: () -> Void
    let onFavorite: () -> Void
    let onDelete: () -> Void

    init(
        title: String,
        titleFont: Font = V2Typography.pageTitle,
        titleColor: Color = V2Color.topTitle,
        showSourceButton: Bool = false,
        showFavoriteButton: Bool = false,
        showDeleteButton: Bool = false,
        isFavoriteSaved: Bool = false,
        onBack: @escaping () -> Void,
        onSource: @escaping () -> Void = {},
        onFavorite: @escaping () -> Void = {},
        onDelete: @escaping () -> Void = {}
    ) {
        self.title = title
        self.titleFont = titleFont
        self.titleColor = titleColor
        self.showSourceButton = showSourceButton
        self.showFavoriteButton = showFavoriteButton
        self.showDeleteButton = showDeleteButton
        self.isFavoriteSaved = isFavoriteSaved
        self.onBack = onBack
        self.onSource = onSource
        self.onFavorite = onFavorite
        self.onDelete = onDelete
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
                } else if showDeleteButton {
                    V2CircleIconButton(kind: .delete, action: onDelete)
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
    var backgroundColor: Color = V2Color.pageGreenBackground
    var showSourceButton: Bool = false
    var showFavoriteButton: Bool = false
    var showDeleteButton: Bool = false
    var isFavoriteSaved: Bool = false
    let onBack: () -> Void
    var onSource: () -> Void = {}
    var onFavorite: () -> Void = {}
    var onDelete: () -> Void = {}
    @ViewBuilder let content: () -> Content

    var body: some View {
        GeometryReader { _ in
            ZStack(alignment: .top) {
                backgroundColor
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
                        showDeleteButton: showDeleteButton,
                        isFavoriteSaved: isFavoriteSaved,
                        onBack: onBack,
                        onSource: onSource,
                        onFavorite: onFavorite,
                        onDelete: onDelete
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
