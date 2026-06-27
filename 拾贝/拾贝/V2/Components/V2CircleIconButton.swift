import SwiftUI

private enum V2TopCircleButtonMetrics {
    static let canvasWidth: CGFloat = 44
    static let canvasHeight: CGFloat = 45
    static let visualCircleDiameter: CGFloat = 41
    static let centerX = canvasWidth / 2
    static let visualCenterY: CGFloat = 20.5
}

enum V2CircleIconKind {
    case notification
    case profile
    case back
    case sourceDocument
    case delete
}

struct V2CircleIconButton: View {
    let kind: V2CircleIconKind
    var showsUnreadBadge = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                buttonContent

                if kind == .notification && showsUnreadBadge {
                    unreadBadge
                        .position(x: 32, y: 8)
                }
            }
            .frame(width: V2TopCircleButtonMetrics.canvasWidth, height: V2TopCircleButtonMetrics.canvasHeight)
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
        case .delete:
            deleteButton
        }
    }

    private func circleAsset(_ name: String) -> some View {
        ZStack {
            Circle()
                .fill(V2Color.surfaceCircleButton)
                .frame(
                    width: V2TopCircleButtonMetrics.visualCircleDiameter,
                    height: V2TopCircleButtonMetrics.visualCircleDiameter
                )
                .shadow(
                    color: Color(hex: 0x98A35E).opacity(0.15),
                    radius: 0.75,
                    x: 0,
                    y: 2
                )
                .position(x: V2TopCircleButtonMetrics.centerX, y: V2TopCircleButtonMetrics.visualCenterY)

            Image(name)
                .resizable()
                .renderingMode(.original)
                .frame(width: V2TopCircleButtonMetrics.canvasWidth, height: V2TopCircleButtonMetrics.canvasHeight)
        }
        .frame(width: V2TopCircleButtonMetrics.canvasWidth, height: V2TopCircleButtonMetrics.canvasHeight)
    }

    private var deleteButton: some View {
        ZStack {
            Circle()
                .fill(V2Color.surfaceCircleButton)
                .frame(
                    width: V2TopCircleButtonMetrics.visualCircleDiameter,
                    height: V2TopCircleButtonMetrics.visualCircleDiameter
                )
                .shadow(
                    color: Color(hex: 0x98A35E).opacity(0.15),
                    radius: 0.75,
                    x: 0,
                    y: 2
                )
                .position(x: V2TopCircleButtonMetrics.centerX, y: V2TopCircleButtonMetrics.visualCenterY)

            V2TrashIconShape()
                .stroke(
                    V2Color.textPrimary,
                    style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round)
                )
        }
        .frame(width: V2TopCircleButtonMetrics.canvasWidth, height: V2TopCircleButtonMetrics.canvasHeight)
    }

    private var unreadBadge: some View {
        Circle()
            .fill(V2Color.notificationBadge)
            .frame(width: 8, height: 8)
            .accessibilityHidden(true)
    }

    private var accessibilityLabel: String {
        switch kind {
        case .notification: showsUnreadBadge ? "通知，有未读消息" : "通知"
        case .profile: "个人主页"
        case .back: "返回"
        case .sourceDocument: "查看原文"
        case .delete: "删除章节"
        }
    }
}

private struct V2TrashIconShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()

        path.move(to: CGPoint(x: 24.5, y: 20))
        path.addLine(to: CGPoint(x: 24.5, y: 26))

        path.move(to: CGPoint(x: 20.5, y: 20))
        path.addLine(to: CGPoint(x: 20.5, y: 26))

        path.move(to: CGPoint(x: 16.5, y: 16))
        path.addLine(to: CGPoint(x: 16.5, y: 28))
        path.addCurve(
            to: CGPoint(x: 18.5, y: 30),
            control1: CGPoint(x: 16.5, y: 29.1),
            control2: CGPoint(x: 17.4, y: 30)
        )
        path.addLine(to: CGPoint(x: 26.5, y: 30))
        path.addCurve(
            to: CGPoint(x: 28.5, y: 28),
            control1: CGPoint(x: 27.6, y: 30),
            control2: CGPoint(x: 28.5, y: 29.1)
        )
        path.addLine(to: CGPoint(x: 28.5, y: 16))

        path.move(to: CGPoint(x: 14.5, y: 16))
        path.addLine(to: CGPoint(x: 30.5, y: 16))

        path.move(to: CGPoint(x: 17.5, y: 16))
        path.addLine(to: CGPoint(x: 19.5, y: 12))
        path.addLine(to: CGPoint(x: 25.5, y: 12))
        path.addLine(to: CGPoint(x: 27.5, y: 16))

        return path
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
                    .frame(
                        width: V2TopCircleButtonMetrics.visualCircleDiameter,
                        height: V2TopCircleButtonMetrics.visualCircleDiameter
                    )
                    .shadow(
                        color: Color(hex: 0x98A35E).opacity(0.15),
                        radius: 0.75,
                        x: 0,
                        y: 2
                    )
                    .position(x: V2TopCircleButtonMetrics.centerX, y: V2TopCircleButtonMetrics.visualCenterY)

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
                    .position(x: V2TopCircleButtonMetrics.centerX, y: V2TopCircleButtonMetrics.visualCenterY)
            }
            .frame(width: V2TopCircleButtonMetrics.canvasWidth, height: V2TopCircleButtonMetrics.canvasHeight)
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
