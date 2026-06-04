import SwiftUI
import UIKit

struct ProfileView: View {
    @ObservedObject var store: AppStore
    @State private var presentedInfo: ProfileInfoSheet?
    @State private var showingDeleteDataConfirmation = false
    @State private var isDeletingData = false

    var body: some View {
        AppScaffold(store: store, title: store.localized("profile.title")) {
            ScrollView {
                VStack(spacing: 16) {
                    SBCard {
                        Text(store.localized("profile.cloud_sync.title"))
                            .font(.system(size: 20, weight: .bold))
                        Text(store.localized("profile.cloud_sync.body"))
                            .foregroundStyle(ShiBeiTheme.muted)
                    }
                    SBCard {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(store.localized("profile.language"))
                                .font(.system(size: 18, weight: .bold))
                            Text(store.localized("profile.language.body"))
                                .font(.system(size: 13))
                                .foregroundStyle(ShiBeiTheme.muted)
                            Picker("profile.language", selection: Binding(
                                get: { store.appLanguage },
                                set: { store.setAppLanguage($0) }
                            )) {
                                ForEach(AppLanguage.allCases) { language in
                                    Text(language.displayName(in: store.appLanguage)).tag(language)
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    SBCard {
                        SettingsButtonRow(index: 1, title: store.localized("profile.account_info")) {
                            presentedInfo = .account
                        }
                        SettingsButtonRow(index: 2, title: store.localized("profile.notification_permission")) {
                            presentedInfo = .notifications
                        }
                        SettingsButtonRow(index: 3, title: store.localized("profile.privacy")) {
                            presentedInfo = .privacy
                        }
                        SettingsButtonRow(index: 4, title: store.localized("profile.about")) {
                            presentedInfo = .about
                        }
                    }
                    SBCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(store.localized("profile.data_management.title"))
                                .font(.system(size: 18, weight: .bold))
                            Text(store.localized("profile.data_management.body"))
                                .font(.system(size: 13))
                                .foregroundStyle(ShiBeiTheme.muted)
                        }
                        Button(role: .destructive) {
                            showingDeleteDataConfirmation = true
                        } label: {
                            HStack {
                                Image(systemName: isDeletingData ? "hourglass" : "trash")
                                Text(isDeletingData ? store.localized("profile.deleting") : store.localized("profile.delete_my_data"))
                            }
                            .font(.system(size: 16, weight: .medium))
                            .frame(maxWidth: .infinity, minHeight: 56)
                        }
                        .buttonStyle(.bordered)
                        .tint(ShiBeiTheme.error)
                        .disabled(isDeletingData)
                    }
                    #if DEBUG
                    PushDiagnosticsCard(store: store)
                    DataSourceCard(store: store)
                    MockScenarioCard(store: store)
                    #endif
                }
                .padding(24)
                .padding(.bottom, 120)
            }
        }
        .sheet(item: $presentedInfo) { info in
            ProfileInfoSheetView(info: info, language: store.appLanguage)
                .presentationDetents([.medium, .large])
        }
        .alert(store.localized("profile.delete_data.alert.title"), isPresented: $showingDeleteDataConfirmation) {
            Button(store.localized("global.cancel"), role: .cancel) {}
            Button(store.localized("profile.delete_data.alert.action"), role: .destructive) {
                Task {
                    isDeletingData = true
                    _ = await store.deleteMyDeviceData()
                    isDeletingData = false
                }
            }
        } message: {
            Text(store.localized("profile.delete_data.alert.message"))
        }
    }
}

private struct PushDiagnosticsCard: View {
    @ObservedObject var store: AppStore
    @State private var copied = false

    var body: some View {
        SBCard {
            VStack(alignment: .leading, spacing: 8) {
                Text(store.localized("profile.push_diagnostics.title"))
                    .font(.system(size: 18, weight: .bold))
                Text(store.localized("profile.push_diagnostics.body"))
                    .font(.system(size: 13))
                    .foregroundStyle(ShiBeiTheme.muted)
                Text(store.pushDiagnosticSummary.isEmpty ? store.localized("profile.push_diagnostics.empty") : store.pushDiagnosticSummary)
                    .font(.system(size: 13))
                    .foregroundStyle(ShiBeiTheme.muted)
                    .lineSpacing(4)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 10) {
                SecondaryButton(
                    title: store.isLoadingPushDiagnostics ? store.localized("profile.push_diagnostics.loading") : store.localized("profile.push_diagnostics.action"),
                    systemImage: store.isLoadingPushDiagnostics ? "hourglass" : "bell.badge"
                ) {
                    Task {
                        await store.loadPushDiagnostics()
                    }
                }
                .disabled(store.isLoadingPushDiagnostics)

                Button {
                    UIPasteboard.general.string = store.pushDiagnosticCopyText
                    copied = true
                } label: {
                    Label(copied ? store.localized("profile.push_diagnostics.copied") : store.localized("profile.push_diagnostics.copy"), systemImage: copied ? "checkmark" : "doc.on.doc")
                        .font(.system(size: 16, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(ShiBeiTheme.textSoft)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct DataSourceCard: View {
    @ObservedObject var store: AppStore
    @State private var cloudURLText = ""

    var body: some View {
        #if DEBUG
        SBCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(store.localized("debug.datasource.title"))
                    .font(.system(size: 18, weight: .bold))
                Text(store.dataMode.subtitle(language: store.appLanguage))
                    .font(.system(size: 13))
                    .foregroundStyle(ShiBeiTheme.muted)
            }

            HStack(spacing: 12) {
                Image(systemName: store.dataMode == .mock ? "shippingbox" : "network")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .frame(width: 34, height: 34)
                    .background(ShiBeiTheme.yellowPale)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text(store.dataMode.title(language: store.appLanguage))
                        .font(.system(size: 15, weight: .semibold))
                    Text(store.localizedDataSourceMessage)
                        .font(.system(size: 12))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
                Spacer()
            }

            HStack(spacing: 12) {
                Image(systemName: "iphone.gen3")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .frame(width: 34, height: 34)
                    .background(ShiBeiTheme.yellowPale)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text(store.localized("debug.anonymous_device"))
                        .font(.system(size: 15, weight: .semibold))
                    Text(store.localizedFormat("debug.device_id_suffix", String(store.anonymousDeviceId.suffix(6))))
                        .font(.system(size: 12))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
                Spacer()
                Button(store.localized("debug.reset")) {
                    store.resetAnonymousDeviceIdentity()
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(ShiBeiTheme.textSoft)
            }

            HStack(spacing: 10) {
                SecondaryButton(title: store.localized("debug.read_local_api"), systemImage: "arrow.down.circle") {
                    Task {
                        await store.loadLocalAPIReadOnly()
                    }
                }
                .disabled(store.isLoadingLocalAPI)

                Button {
                    store.resetToMockData()
                } label: {
                    Label(store.localized("debug.back_to_mock"), systemImage: "arrow.counterclockwise")
                        .font(.system(size: 16, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(ShiBeiTheme.textSoft)
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(store.localized("debug.railway_cloud_api"))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                TextField("https://xxx.up.railway.app", text: $cloudURLText)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .keyboardType(.URL)
                    .font(.system(size: 14))
                    .padding(.horizontal, 14)
                    .frame(minHeight: 48)
                    .background(ShiBeiTheme.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 15, style: .continuous)
                            .stroke(ShiBeiTheme.line, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))

                HStack(spacing: 10) {
                    SecondaryButton(title: store.localized("debug.save_cloud_url"), systemImage: "checkmark.circle") {
                        store.saveCloudAPIBaseURL(cloudURLText)
                    }

                    SecondaryButton(title: store.localized("debug.read_cloud_api"), systemImage: "cloud") {
                        store.saveCloudAPIBaseURL(cloudURLText)
                        Task {
                            await store.loadCloudAPIReadOnly()
                        }
                    }
                    .disabled(store.isLoadingLocalAPI)
                }
            }
        }
        .onAppear {
            cloudURLText = store.cloudAPIBaseURLString
        }
        #else
        EmptyView()
        #endif
    }
}

private struct MockScenarioCard: View {
    @ObservedObject var store: AppStore

    var body: some View {
        #if DEBUG
        SBCard {
            VStack(alignment: .leading, spacing: 4) {
                Text(store.localized("debug.mock_scenarios.title"))
                    .font(.system(size: 18, weight: .bold))
                Text(store.localized("debug.mock_scenarios.body"))
                    .font(.system(size: 13))
                    .foregroundStyle(ShiBeiTheme.muted)
            }

            VStack(spacing: 8) {
                ForEach(MockScenario.allCases) { scenario in
                    Button {
                        store.applyMockScenario(scenario)
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: icon(for: scenario))
                                .font(.system(size: 15, weight: .semibold))
                                .frame(width: 30, height: 30)
                                .foregroundStyle(ShiBeiTheme.textSoft)
                                .background(ShiBeiTheme.yellowPale)
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 3) {
                                Text(scenario.title(language: store.appLanguage))
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(ShiBeiTheme.text)
                                Text(scenario.subtitle(language: store.appLanguage))
                                    .font(.system(size: 12))
                                    .foregroundStyle(ShiBeiTheme.muted)
                            }
                            Spacer()
                            Image(systemName: "arrow.right")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(ShiBeiTheme.faint)
                        }
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        #else
        EmptyView()
        #endif
    }

    private func icon(for scenario: MockScenario) -> String {
        switch scenario {
        case .emptyHome:
            "tray"
        case .unreviewedChapter:
            "doc.text"
        case .activeReview:
            "play.circle"
        case .processingChapter:
            "hourglass"
        case .failedChapter:
            "exclamationmark"
        case .successNotification:
            "bell"
        case .failedNotification:
            "bell.badge"
        }
    }
}

private struct SettingsRow: View {
    let index: Int
    let title: String

    var body: some View {
        HStack(spacing: 12) {
            Text("\(index)")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(ShiBeiTheme.textSoft)
                .frame(width: 26, height: 26)
                .background(ShiBeiTheme.yellowPale)
                .clipShape(Circle())
            Text(title)
                .font(.system(size: 15, weight: .semibold))
            Spacer()
        }
        .padding(.vertical, 6)
    }
}

private struct SettingsButtonRow: View {
    let index: Int
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text("\(index)")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .frame(width: 26, height: 26)
                    .background(ShiBeiTheme.yellowPale)
                    .clipShape(Circle())
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.text)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.faint)
            }
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }
}

private enum ProfileInfoSheet: String, Identifiable {
    case account
    case notifications
    case privacy
    case about

    var id: String { rawValue }

    func title(language: AppLanguage) -> String {
        switch self {
        case .account:
            L10n.string("profile.account_info", language: language)
        case .notifications:
            L10n.string("profile.notification_permission", language: language)
        case .privacy:
            L10n.string("profile.privacy", language: language)
        case .about:
            L10n.string("profile.about", language: language)
        }
    }

    func paragraphs(language: AppLanguage) -> [String] {
        switch self {
        case .account:
            [
                L10n.string("profile.info.account.p1", language: language),
                L10n.string("profile.info.account.p2", language: language)
            ]
        case .notifications:
            [
                L10n.string("profile.info.notifications.p1", language: language),
                L10n.string("profile.info.notifications.p2", language: language)
            ]
        case .privacy:
            [
                L10n.string("profile.info.privacy.p1", language: language),
                L10n.string("profile.info.privacy.p2", language: language),
                L10n.string("profile.info.privacy.p3", language: language)
            ]
        case .about:
            [
                L10n.string("profile.info.about.p1", language: language),
                L10n.string("profile.info.about.p2", language: language)
            ]
        }
    }
}

private struct ProfileInfoSheetView: View {
    let info: ProfileInfoSheet
    let language: AppLanguage
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(info.paragraphs(language: language), id: \.self) { paragraph in
                        Text(paragraph)
                            .font(.system(size: 16))
                            .lineSpacing(5)
                            .foregroundStyle(ShiBeiTheme.textSoft)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(24)
            }
            .background(ShiBeiTheme.surface)
            .navigationTitle(info.title(language: language))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(L10n.string("global.done", language: language)) {
                        dismiss()
                    }
                }
            }
        }
    }
}
