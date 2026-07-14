import SwiftUI

enum V2LanguageOnboardingState {
    static let completionKey = "v2.hasCompletedLanguageOnboarding"

    private static let existingUserMarkerKeys = [
        "v2.activeLearningChapterID",
        "v2.completedReviewChapterIDs",
        "v2.hasSeenGenerationStartedEducation",
        "v2.hasRequestedGenerationNotificationPermission",
        "v2.hasAcceptedAIProcessingConsent",
        "v2.profileDisplayName",
        "v2.profilePresetAvatarName",
        "v2.profileAvatarImageData"
    ]

    static func shouldPresentInitialPrompt(userDefaults: UserDefaults = .standard) -> Bool {
        guard userDefaults.bool(forKey: completionKey) == false else { return false }
        return !existingUserMarkerKeys.contains { userDefaults.object(forKey: $0) != nil }
    }
}

struct V2LanguageOnboardingView: View {
    let onSelectLanguage: (AppLanguage) -> Void

    var body: some View {
        GeometryReader { geometry in
            let contentWidth = V2LanguageOnboardingMetrics.contentWidth(for: geometry.size.width)

            ZStack {
                V2Color.surfaceCream
                    .ignoresSafeArea()

                VStack(spacing: V2LanguageOnboardingMetrics.stackSpacing) {
                    Image(V2LanguageOnboardingMetrics.mascotAssetName)
                        .resizable()
                        .scaledToFit()
                        .frame(width: V2LanguageOnboardingMetrics.mascotWidth)
                        .accessibilityHidden(true)

                    VStack(spacing: V2LanguageOnboardingMetrics.cardSpacing) {
                        Text(L10n.string("language.onboarding.title", language: .zhHans))
                            .font(V2LanguageOnboardingMetrics.titleFont)
                            .foregroundStyle(V2Color.textPrimary)
                            .multilineTextAlignment(.center)

                        VStack(spacing: V2LanguageOnboardingMetrics.optionSpacing) {
                            ForEach(AppLanguage.allCases) { language in
                                V2LanguageOnboardingOption(
                                    language: language,
                                    onSelect: {
                                        onSelectLanguage(language)
                                    }
                                )
                            }
                        }
                    }
                    .padding(.horizontal, V2LanguageOnboardingMetrics.cardHorizontalPadding)
                    .padding(.vertical, V2LanguageOnboardingMetrics.cardVerticalPadding)
                    .frame(width: contentWidth)
                    .background(V2Color.surfaceCream)
                    .clipShape(RoundedRectangle(cornerRadius: V2Radius.large, style: .continuous))
                    .v2Shadow()
                }
                .frame(width: contentWidth)
                .position(
                    x: geometry.size.width / 2,
                    y: geometry.size.height * V2LanguageOnboardingMetrics.contentCenterYRatio
                )
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(L10n.string("language.onboarding.accessibility", language: .en))
    }
}

private struct V2LanguageOnboardingOption: View {
    let language: AppLanguage
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            Text(language.displayName(in: language))
                .font(V2Typography.bodySmallEmphasis)
                .foregroundStyle(V2Color.textPrimary)
                .frame(maxWidth: .infinity)
            .padding(.horizontal, V2LanguageOnboardingMetrics.optionHorizontalPadding)
            .frame(height: V2LanguageOnboardingMetrics.optionHeight)
            .background(V2Color.surfaceCream)
            .clipShape(RoundedRectangle(cornerRadius: V2Radius.medium, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: V2Radius.medium, style: .continuous)
                    .stroke(V2Color.borderSoftGreen.opacity(0.9), lineWidth: 1)
            }
            .v2Shadow(V2Shadow.subtleGreen)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(language.displayName(in: language))
        .accessibilityHint(language.interfaceSubtitle(in: language))
    }
}

private enum V2LanguageOnboardingMetrics {
    static let mascotAssetName = "V2SplashMascot"
    static let mascotWidth: CGFloat = 128
    static let contentMaxWidth: CGFloat = 305
    static let contentCenterYRatio: CGFloat = 0.50
    static let stackSpacing: CGFloat = 18
    static let cardSpacing: CGFloat = 18
    static let cardHorizontalPadding: CGFloat = 18
    static let cardVerticalPadding: CGFloat = 20
    static let optionSpacing: CGFloat = 12
    static let optionHeight: CGFloat = 54
    static let optionHorizontalPadding: CGFloat = 16
    static let titleFont = Font.system(size: 20, weight: .bold, design: .default)

    static func contentWidth(for screenWidth: CGFloat) -> CGFloat {
        min(contentMaxWidth, screenWidth - V2Layout.pageHorizontalInset * 2)
    }
}

#Preview {
    V2LanguageOnboardingView { _ in }
}
