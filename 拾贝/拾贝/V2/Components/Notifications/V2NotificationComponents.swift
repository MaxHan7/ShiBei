import SwiftUI

struct V2NotificationCard: View {
    let title: String
    let message: String
    let isSuccess: Bool
    var time: String = "刚刚"
    var action: (() -> Void)?
    @Environment(\.v2ContentWidth) private var contentWidth

    var body: some View {
        Button {
            action?()
        } label: {
            cardContent
        }
        .buttonStyle(.plain)
        .disabled(action == nil)
    }

    @ViewBuilder
    private var cardContent: some View {
        let messageWidth = contentWidth - V2NotificationCardMetrics.messageWidthInset

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
                    .foregroundStyle(V2Color.topTitle.opacity(0.74))
                    .lineSpacing(5)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: messageWidth, alignment: .leading)
            .position(x: V2NotificationCardMetrics.messageLeading + messageWidth / 2, y: 58)

            Text(time)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(V2Color.topTitle.opacity(0.62))
                .lineLimit(1)
                .frame(width: 46)
                .position(x: contentWidth - 25, y: 28)

            V2NotificationChevron(color: statusColor)
                .frame(width: 24, height: 24)
                .position(x: contentWidth - 21, y: 58)
        }
        .frame(width: contentWidth, height: 116)
    }

    private var statusColor: Color {
        isSuccess ? Color(hex: 0xA7AD62) : V2Color.notificationBadge
    }

    private var iconShellFill: Color {
        isSuccess
            ? Color(hex: 0xE8E9C2).opacity(0.52)
            : Color(hex: 0xFFECE4).opacity(0.90)
    }
}

private enum V2NotificationCardMetrics {
    static let messageLeading: CGFloat = 113
    static let messageWidthInset: CGFloat = 149
}

struct V2NotificationSummaryBanner: View {
    let unreadCount: Int
    @Environment(\.v2ContentWidth) private var contentWidth
    @Environment(\.appLanguage) private var appLanguage

    var body: some View {
        let bannerWidth = contentWidth + V2NotificationSummaryBannerMetrics.bannerWidthOverflow

        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .frame(width: contentWidth, height: V2NotificationSummaryBannerMetrics.cardHeight)
                .offset(x: V2NotificationSummaryBannerMetrics.cardX, y: V2NotificationSummaryBannerMetrics.cardY)
                .v2Shadow()
                .zIndex(0)

            Image("V2NotificationMascot")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2NotificationSummaryBannerMetrics.mascotWidth, height: V2NotificationSummaryBannerMetrics.mascotHeight)
                .offset(x: contentWidth - V2NotificationSummaryBannerMetrics.mascotTrailingOffset, y: V2NotificationSummaryBannerMetrics.mascotY)
                .zIndex(2)

            Image("V2NotificationBannerWave")
                .resizable()
                .renderingMode(.original)
                .frame(width: bannerWidth, height: V2NotificationSummaryBannerMetrics.bannerHeight)
                .zIndex(3)

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text(L10n.string("notifications.summary.prefix", language: appLanguage))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(V2Color.textPrimary)

                Text("\(unreadCount)")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundStyle(V2Color.primaryAction)

                Text(L10n.string("notifications.summary.suffix", language: appLanguage))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(V2Color.textPrimary)
            }
            .padding(.leading, V2NotificationSummaryBannerMetrics.textLeading)
            .padding(.top, V2NotificationSummaryBannerMetrics.textTop)
            .frame(maxWidth: V2NotificationSummaryBannerMetrics.textMaxWidth, alignment: .leading)
            .zIndex(4)
        }
        .frame(width: bannerWidth, height: V2NotificationSummaryBannerMetrics.bannerHeight)
    }
}

private enum V2NotificationSummaryBannerMetrics {
    static let bannerWidthOverflow: CGFloat = 8
    static let bannerHeight: CGFloat = 143
    static let cardHeight: CGFloat = 82
    static let cardX: CGFloat = 4
    static let cardY: CGFloat = 53
    static let mascotWidth: CGFloat = 119
    static let mascotHeight: CGFloat = 129
    static let mascotTrailingOffset: CGFloat = 139
    static let mascotY: CGFloat = 7
    static let textLeading: CGFloat = 26
    static let textTop: CGFloat = 80
    static let textMaxWidth: CGFloat = 208
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
