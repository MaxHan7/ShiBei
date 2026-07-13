import SwiftUI

struct V2AIProcessingConsentSheet: View {
    let onAgree: () -> Void
    let onCancel: () -> Void
    @Environment(\.appLanguage) private var appLanguage

    var body: some View {
        VStack(alignment: .leading, spacing: V2AIProcessingConsentMetrics.sectionSpacing) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: V2AIProcessingConsentMetrics.titleSpacing) {
                    Text(L10n.string("ai_consent.title", language: appLanguage))
                        .font(V2Typography.cardTitle)
                        .foregroundStyle(V2Color.textPrimary)

                    Text(L10n.string("ai_consent.subtitle", language: appLanguage))
                        .font(V2Typography.bodySmall)
                        .foregroundStyle(V2Color.textMuted)
                }

                Spacer()

                Button(action: onCancel) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(V2Color.textPrimary.opacity(0.72))
                        .frame(
                            width: V2AIProcessingConsentMetrics.closeButtonSize,
                            height: V2AIProcessingConsentMetrics.closeButtonSize
                        )
                        .background(V2Color.surfaceCream)
                        .clipShape(Circle())
                        .v2Shadow(V2Shadow.subtleGreen)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(L10n.string("ai_consent.cancel", language: appLanguage))
            }

            Text(L10n.string("ai_consent.body", language: appLanguage))
                .font(V2Typography.bodySmall)
                .foregroundStyle(V2Color.textSecondary)
                .lineSpacing(V2AIProcessingConsentMetrics.bodyLineSpacing)
                .fixedSize(horizontal: false, vertical: true)

            VStack(spacing: V2AIProcessingConsentMetrics.buttonSpacing) {
                Button(action: onAgree) {
                    Text(L10n.string("ai_consent.agree", language: appLanguage))
                        .font(V2Typography.primaryButton)
                        .foregroundStyle(V2Color.surfaceCream)
                        .frame(maxWidth: .infinity)
                        .frame(height: V2AIProcessingConsentMetrics.primaryButtonHeight)
                        .background(V2Color.primaryAction)
                        .clipShape(RoundedRectangle(cornerRadius: V2Radius.medium, style: .continuous))
                        .v2Shadow(V2Shadow.subtleGreen)
                }
                .buttonStyle(.plain)

                Button(action: onCancel) {
                    Text(L10n.string("ai_consent.cancel", language: appLanguage))
                        .font(V2Typography.bodySmallEmphasis)
                        .foregroundStyle(V2Color.textMuted)
                        .frame(maxWidth: .infinity)
                        .frame(height: V2AIProcessingConsentMetrics.secondaryButtonHeight)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, V2AIProcessingConsentMetrics.horizontalPadding)
        .padding(.top, V2AIProcessingConsentMetrics.topPadding)
        .padding(.bottom, V2AIProcessingConsentMetrics.bottomPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(V2Color.surfaceCream.ignoresSafeArea())
    }
}

private enum V2AIProcessingConsentMetrics {
    static let horizontalPadding: CGFloat = V2Spacing.lg
    static let topPadding: CGFloat = 24
    static let bottomPadding: CGFloat = 24
    static let sectionSpacing: CGFloat = 20
    static let titleSpacing: CGFloat = 6
    static let bodyLineSpacing: CGFloat = 5
    static let closeButtonSize: CGFloat = 32
    static let buttonSpacing: CGFloat = 10
    static let primaryButtonHeight: CGFloat = 48
    static let secondaryButtonHeight: CGFloat = 40
}
