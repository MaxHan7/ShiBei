import SwiftUI

struct ProfileView: View {
    @ObservedObject var store: AppStore

    var body: some View {
        AppScaffold(store: store, title: "我的") {
            ScrollView {
                VStack(spacing: 16) {
                    SBCard {
                        Text("Alex")
                            .font(.system(size: 20, weight: .bold))
                        Text("alex@example.com")
                            .foregroundStyle(ShiBeiTheme.muted)
                    }
                    SBCard {
                        SettingsRow(index: 1, title: "账号信息")
                        SettingsRow(index: 2, title: "通知权限")
                        SettingsRow(index: 3, title: "隐私说明")
                        SettingsRow(index: 4, title: "关于拾贝")
                    }
                    DataSourceCard(store: store)
                    MockScenarioCard(store: store)
                }
                .padding(24)
                .padding(.bottom, 120)
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
                Text("数据源")
                    .font(.system(size: 18, weight: .bold))
                Text(store.dataMode.subtitle)
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
                    Text(store.dataMode.title)
                        .font(.system(size: 15, weight: .semibold))
                    Text(store.dataSourceMessage)
                        .font(.system(size: 12))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
                Spacer()
            }

            HStack(spacing: 10) {
                SecondaryButton(title: "读取本地 API", systemImage: "arrow.down.circle") {
                    Task {
                        await store.loadLocalAPIReadOnly()
                    }
                }
                .disabled(store.isLoadingLocalAPI)

                Button {
                    store.resetToMockData()
                } label: {
                    Label("回到 Mock", systemImage: "arrow.counterclockwise")
                        .font(.system(size: 16, weight: .medium))
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .foregroundStyle(ShiBeiTheme.textSoft)
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Railway 云端 API")
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
                    SecondaryButton(title: "保存云端地址", systemImage: "checkmark.circle") {
                        store.saveCloudAPIBaseURL(cloudURLText)
                    }

                    SecondaryButton(title: "读取云端 API", systemImage: "cloud") {
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
        #endif
    }
}

private struct MockScenarioCard: View {
    @ObservedObject var store: AppStore

    var body: some View {
        #if DEBUG
        SBCard {
            VStack(alignment: .leading, spacing: 4) {
                Text("Mock 场景")
                    .font(.system(size: 18, weight: .bold))
                Text("用于第一轮 SwiftUI 验收，接后端前可移除。")
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
                                Text(scenario.title)
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(ShiBeiTheme.text)
                                Text(scenario.subtitle)
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
