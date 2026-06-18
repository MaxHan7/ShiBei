import SwiftUI

enum V2CircleIconKind {
    case notification
    case profile
    case back
    case sourceDocument
}

struct V2CircleIconButton: View {
    let kind: V2CircleIconKind
    var showsUnreadBadge = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            buttonContent
                .overlay(alignment: .topTrailing) {
                    if kind == .notification && showsUnreadBadge {
                        unreadBadge
                    }
                }
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
    }

    @ViewBuilder
    private var buttonContent: some View {
        switch kind {
        case .back:
            circleAsset("V2CircleButtonBack")
        case .sourceDocument:
            circleAsset("V2CircleButtonSource")
        case .notification:
            circleAsset("V2CircleButtonNotification")
        case .profile:
            circleAsset("V2CircleButtonProfile")
        }
    }

    private func circleAsset(_ name: String) -> some View {
        Image(name)
            .resizable()
            .renderingMode(.original)
            .frame(width: 44, height: 45)
    }

    private var unreadBadge: some View {
        Circle()
            .fill(V2Color.notificationBadge)
            .frame(width: 8, height: 8)
            .offset(x: -8, y: 6)
            .accessibilityHidden(true)
    }

    private var accessibilityLabel: String {
        switch kind {
        case .notification: showsUnreadBadge ? "通知，有未读消息" : "通知"
        case .profile: "个人主页"
        case .back: "返回"
        case .sourceDocument: "查看原文"
        }
    }
}

struct V2QuestionFavoriteButton: View {
    var isSaved: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(V2Color.surfaceCircleButton)
                    .frame(width: 41, height: 41)
                    .shadow(
                        color: Color(hex: 0x98A35E).opacity(0.15),
                        radius: 0.75,
                        x: 0,
                        y: 2
                    )
                    .position(x: 22, y: 20.5)

                V2FavoriteStarShape()
                    .fill(isSaved ? V2Color.primary : Color.clear)
                    .overlay {
                        V2FavoriteStarShape()
                            .stroke(
                                isSaved ? V2Color.primary : V2Color.textPrimary,
                                style: StrokeStyle(lineWidth: 1.5, lineJoin: .round)
                            )
                    }
                    .frame(width: 24, height: 24)
                    .position(x: 22, y: 20.5)
            }
            .frame(width: 44, height: 45)
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(isSaved ? "取消收藏" : "收藏")
    }
}

private struct V2FavoriteStarShape: Shape {
    func path(in rect: CGRect) -> Path {
        let sourceWidth: CGFloat = 24
        let sourceHeight: CGFloat = 24
        let scale = min(rect.width / sourceWidth, rect.height / sourceHeight)
        let offsetX = rect.midX - sourceWidth * scale / 2
        let offsetY = rect.midY - sourceHeight * scale / 2

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
        }

        var path = Path()
        path.move(to: point(12, 2))
        path.addLine(to: point(15.1035, 8.72839))
        path.addLine(to: point(22.4616, 9.60081))
        path.addLine(to: point(17.0216, 14.6316))
        path.addLine(to: point(18.4656, 21.8992))
        path.addLine(to: point(12, 18.28))
        path.addLine(to: point(5.53437, 21.8992))
        path.addLine(to: point(6.97843, 14.6316))
        path.addLine(to: point(1.53839, 9.60081))
        path.addLine(to: point(8.89651, 8.72839))
        path.closeSubpath()
        return path
    }
}
