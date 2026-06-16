import SwiftUI

struct V2BottomNavigationBar: View {
    @Binding var selectedTab: V2HomeTab

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2BottomNavMetrics.capsuleRadius, style: .continuous)
                .fill(V2Color.surfaceNav)
                .frame(width: V2BottomNavMetrics.capsuleSize.width, height: V2BottomNavMetrics.capsuleSize.height)
                .position(V2BottomNavMetrics.capsuleCenter)
                .v2Shadow()

            navItem(.learning)
                .position(V2BottomNavMetrics.center(for: .learning))

            navItem(.materials)
                .position(V2BottomNavMetrics.center(for: .materials))

            V2UploadTabButton {
                selectedTab = .upload
            }
            .position(V2BottomNavMetrics.center(for: .upload))

            navItem(.discover)
                .position(V2BottomNavMetrics.center(for: .discover))

            navItem(.notes)
                .position(V2BottomNavMetrics.center(for: .notes))
        }
        .frame(width: V2BottomNavMetrics.designSize.width, height: V2BottomNavMetrics.designSize.height)
    }

    private func navItem(_ tab: V2HomeTab) -> some View {
        V2BottomNavItem(
            tab: tab,
            isSelected: selectedTab == tab
        ) {
            selectedTab = tab
        }
    }
}

private enum V2BottomNavMetrics {
    static let designSize = CGSize(width: 357, height: 94)
    static let capsuleSize = CGSize(width: 349, height: 86)
    static let capsuleRadius: CGFloat = 29
    static let capsuleCenter = CGPoint(x: designSize.width / 2, y: capsuleSize.height / 2)

    // Component anchors from the confirmed nav spec. The icons themselves are
    // independent 32x32 assets, not crops from the full navigation SVG.
    static func center(for tab: V2HomeTab) -> CGPoint {
        switch tab {
        case .learning:
            CGPoint(x: 40, y: 45)
        case .materials:
            CGPoint(x: 107, y: 45)
        case .upload:
            // The upload SVG is a 60x60 canvas whose visible circle is centered
            // at y=26. In the Figma nav the canvas starts at y=10, so the
            // SwiftUI frame center must be y=40 to keep the circle at y=36.
            CGPoint(x: 175, y: 40)
        case .discover:
            CGPoint(x: 245, y: 45)
        case .notes:
            CGPoint(x: 313, y: 45)
        }
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
            ZStack(alignment: .topLeading) {
                Circle()
                    .fill(V2Color.uploadButtonFill)
                    .overlay {
                        Circle()
                            .stroke(V2Color.uploadButtonStroke, lineWidth: 2)
                    }
                    .frame(width: V2UploadTabMetrics.circleDiameter, height: V2UploadTabMetrics.circleDiameter)
                    .shadow(color: Color(hex: 0x98A35E).opacity(0.20), radius: 2, x: 0, y: 4)
                    .position(V2UploadTabMetrics.circleCenter)

                V2UploadPlusShape()
                    .stroke(
                        V2Color.primary,
                        style: StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round)
                    )
                    .frame(width: V2UploadTabMetrics.canvasSize.width, height: V2UploadTabMetrics.canvasSize.height)
            }
            .frame(width: V2UploadTabMetrics.canvasSize.width, height: V2UploadTabMetrics.canvasSize.height)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("上传")
    }
}

private enum V2UploadTabMetrics {
    static let canvasSize = CGSize(width: 60, height: 60)
    static let circleDiameter: CGFloat = 52
    static let circleCenter = CGPoint(x: 30, y: 26)
}

private struct V2UploadPlusShape: Shape {
    func path(in rect: CGRect) -> Path {
        let scaleX = rect.width / 60
        let scaleY = rect.height / 60

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: rect.minX + x * scaleX, y: rect.minY + y * scaleY)
        }

        var path = Path()
        path.move(to: point(30, 16.9307))
        path.addLine(to: point(30, 34.4655))
        path.move(to: point(20.9307, 26))
        path.addLine(to: point(38.4655, 26))
        return path
    }
}

#Preview("V2 Bottom Navigation") {
    ZStack {
        V2Color.pageGreenBackground
            .ignoresSafeArea()

        V2BottomNavigationBar(selectedTab: .constant(.learning))
    }
}
