import SwiftUI

struct V2BottomNavigationBar: View {
    @Binding var selectedTab: V2HomeTab

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 29, style: .continuous)
                .fill(V2Color.surfaceNav)
                .frame(width: 349, height: 86)
                .position(x: 178.5, y: 43)
                .v2Shadow()

            V2BottomNavItem(
                tab: .learning,
                isSelected: selectedTab == .learning
            ) {
                selectedTab = .learning
            }
            .position(x: 45, y: 45)

            V2BottomNavItem(
                tab: .materials,
                isSelected: selectedTab == .materials
            ) {
                selectedTab = .materials
            }
            .position(x: 111, y: 45)

            V2UploadTabButton {
                selectedTab = .upload
            }
            .position(x: 179, y: 36)

            V2BottomNavItem(
                tab: .discover,
                isSelected: selectedTab == .discover
            ) {
                selectedTab = .discover
            }
            .position(x: 249, y: 45)

            V2BottomNavItem(
                tab: .notes,
                isSelected: selectedTab == .notes
            ) {
                selectedTab = .notes
            }
            .position(x: 317, y: 45)
        }
        .frame(width: 357, height: 94)
        .scaleEffect(navScale, anchor: .center)
        .frame(width: 357 * navScale, height: 94 * navScale)
    }

    private var navScale: CGFloat {
        min(1, (UIScreen.main.bounds.width - 32) / 357)
    }
}

struct V2BottomNavItem: View {
    let tab: V2HomeTab
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                if let assetName = isSelected ? tab.selectedAssetName : tab.inactiveAssetName {
                    Image(assetName)
                        .resizable()
                        .renderingMode(.original)
                        .frame(width: 32, height: 32)
                }

                Text(tab.title)
                    .font(V2Typography.navLabel)
                    .foregroundStyle(isSelected ? V2Color.primary : V2Color.textPrimary)
                    .frame(height: 16)
            }
            .frame(width: 56, height: 58)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(tab.title)
    }
}

struct V2UploadTabButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(Color(hex: 0xE8E9C2))
                    .frame(width: 52, height: 52)
                    .overlay(
                        Circle()
                            .stroke(Color.white, lineWidth: 2)
                    )
                    .v2Shadow()

                Path { path in
                    path.move(to: CGPoint(x: 30, y: 16.93))
                    path.addLine(to: CGPoint(x: 30, y: 34.47))
                    path.move(to: CGPoint(x: 20.93, y: 26))
                    path.addLine(to: CGPoint(x: 38.47, y: 26))
                }
                .stroke(V2Color.primary, style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            }
            .frame(width: 60, height: 60)
            .accessibilityLabel("上传")
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
