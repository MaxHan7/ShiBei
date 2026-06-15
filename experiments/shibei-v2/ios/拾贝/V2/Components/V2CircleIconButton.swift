import SwiftUI

enum V2CircleIconKind {
    case notification
    case profile
    case back
    case sourceDocument
}

struct V2CircleIconButton: View {
    let kind: V2CircleIconKind
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            buttonContent
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
    }

    @ViewBuilder
    private var buttonContent: some View {
        switch kind {
        case .back:
            Image("V2CircleButtonBack")
                .resizable()
                .renderingMode(.original)
                .frame(width: 44, height: 45)
        case .sourceDocument:
            Image("V2CircleButtonSource")
                .resizable()
                .renderingMode(.original)
                .frame(width: 44, height: 45)
        case .notification:
            generatedCircleButton {
                V2BellGlyph()
            }
        case .profile:
            generatedCircleButton {
                V2ProfileGlyph()
            }
        }
    }

    private func generatedCircleButton<Glyph: View>(@ViewBuilder glyph: () -> Glyph) -> some View {
        ZStack {
            Circle()
                .fill(V2Color.surfaceCircleButton)
                .frame(width: 44, height: 44)
                .v2Shadow(V2Shadow.subtleGreen)

            glyph()
                .frame(width: 24, height: 24)
                .foregroundStyle(V2Color.textPrimary)
        }
    }

    private var accessibilityLabel: String {
        switch kind {
        case .notification: "通知"
        case .profile: "个人主页"
        case .back: "返回"
        case .sourceDocument: "章节详情"
        }
    }
}

private struct V2BellGlyph: View {
    var body: some View {
        ZStack {
            Path { path in
                path.move(to: CGPoint(x: 7.5, y: 17.5))
                path.addLine(to: CGPoint(x: 16.5, y: 17.5))
                path.addCurve(to: CGPoint(x: 15, y: 9), control1: CGPoint(x: 16.1, y: 14), control2: CGPoint(x: 17.3, y: 10.5))
                path.addCurve(to: CGPoint(x: 9, y: 9), control1: CGPoint(x: 13.4, y: 6.8), control2: CGPoint(x: 10.5, y: 6.8))
                path.addCurve(to: CGPoint(x: 7.5, y: 17.5), control1: CGPoint(x: 6.7, y: 10.5), control2: CGPoint(x: 7.9, y: 14))
            }
            .stroke(V2Color.textPrimary, style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))

            Path { path in
                path.move(to: CGPoint(x: 10, y: 18.2))
                path.addCurve(to: CGPoint(x: 14, y: 18.2), control1: CGPoint(x: 10.2, y: 21.5), control2: CGPoint(x: 13.8, y: 21.5))
                path.move(to: CGPoint(x: 12, y: 5.5))
                path.addLine(to: CGPoint(x: 12, y: 7))
            }
            .stroke(V2Color.textPrimary, style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
        }
    }
}

private struct V2ProfileGlyph: View {
    var body: some View {
        ZStack {
            Circle()
                .stroke(V2Color.textPrimary, lineWidth: 1.7)
                .frame(width: 10.5, height: 10.5)
                .offset(y: -5)

            Path { path in
                path.move(to: CGPoint(x: 5, y: 20))
                path.addCurve(to: CGPoint(x: 19, y: 20), control1: CGPoint(x: 4.5, y: 14), control2: CGPoint(x: 19.5, y: 14))
                path.addCurve(to: CGPoint(x: 5, y: 20), control1: CGPoint(x: 18.8, y: 22), control2: CGPoint(x: 5.2, y: 22))
            }
            .stroke(V2Color.textPrimary, style: StrokeStyle(lineWidth: 1.7, lineCap: .round, lineJoin: .round))
        }
    }
}
