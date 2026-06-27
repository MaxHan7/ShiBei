import SwiftUI

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
                    .foregroundStyle(V2Color.topTitle.opacity(0.74))
                    .lineSpacing(5)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(width: 172, alignment: .leading)
            .position(x: 199, y: 58)

            Text(time)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(V2Color.topTitle.opacity(0.62))
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
        isSuccess ? Color(hex: 0xA7AD62) : V2Color.notificationBadge
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
