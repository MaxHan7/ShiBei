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

    private var accessibilityLabel: String {
        switch kind {
        case .notification: "通知"
        case .profile: "个人主页"
        case .back: "返回"
        case .sourceDocument: "章节详情"
        }
    }
}
