import SwiftUI

struct V2SplashView: View {
    @Environment(\.appLanguage) private var appLanguage

    var body: some View {
        GeometryReader { geometry in
            V2Color.pageGreenBackground
                .ignoresSafeArea()

            VStack(spacing: Metrics.messageTopSpacing) {
                Image(Metrics.mascotAssetName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: Metrics.mascotWidth)
                    .accessibilityHidden(true)

                Text(L10n.string("splash.message", language: appLanguage))
                    .font(Metrics.messageFont)
                    .foregroundStyle(Metrics.messageColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.9)
            }
            .frame(maxWidth: .infinity)
            .position(
                x: geometry.size.width / 2,
                y: geometry.size.height * Metrics.contentCenterYRatio
            )
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityLabel(L10n.string("splash.accessibility", language: appLanguage))
    }
}

private enum Metrics {
    static let mascotAssetName = "V2SplashMascot"
    static let mascotWidth: CGFloat = 295
    static let contentCenterYRatio: CGFloat = 0.50
    static let messageTopSpacing: CGFloat = V2Spacing.lg
    static let messageFont = Font.system(size: 24, weight: .bold, design: .default)
    static let messageColor = Color(hex: 0x969855)
}

#Preview {
    V2SplashView()
}
