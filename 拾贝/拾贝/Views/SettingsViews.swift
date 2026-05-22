import SwiftUI

struct ProfileView: View {
    @ObservedObject var store: AppStore
    @State private var presentedInfo: ProfileInfoSheet?
    @State private var showingDeleteDataConfirmation = false
    @State private var isDeletingData = false

    var body: some View {
        AppScaffold(store: store, title: "我的") {
            ScrollView {
                VStack(spacing: 16) {
                    SBCard {
                        Text("匿名设备 Beta")
                            .font(.system(size: 20, weight: .bold))
                        Text("当前测试版会把内容保存到拾贝云端，不需要登录账号。")
                            .foregroundStyle(ShiBeiTheme.muted)
                    }
                    SBCard {
                        SettingsButtonRow(index: 1, title: "账号信息") {
                            presentedInfo = .account
                        }
                        SettingsButtonRow(index: 2, title: "通知权限") {
                            presentedInfo = .notifications
                        }
                        SettingsButtonRow(index: 3, title: "隐私说明") {
                            presentedInfo = .privacy
                        }
                        SettingsButtonRow(index: 4, title: "关于拾贝") {
                            presentedInfo = .about
                        }
                    }
                    SBCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("数据管理")
                                .font(.system(size: 18, weight: .bold))
                            Text("删除后，当前匿名设备下的章节、通知、复习记录和反馈都会从云端移除。")
                                .font(.system(size: 13))
                                .foregroundStyle(ShiBeiTheme.muted)
                        }
                        Button(role: .destructive) {
                            showingDeleteDataConfirmation = true
                        } label: {
                            HStack {
                                Image(systemName: isDeletingData ? "hourglass" : "trash")
                                Text(isDeletingData ? "正在删除..." : "删除我的数据")
                            }
                            .font(.system(size: 16, weight: .medium))
                            .frame(maxWidth: .infinity, minHeight: 56)
                        }
                        .buttonStyle(.bordered)
                        .tint(ShiBeiTheme.error)
                        .disabled(isDeletingData)
                    }
                    DataSourceCard(store: store)
                    MockScenarioCard(store: store)
                }
                .padding(24)
                .padding(.bottom, 120)
            }
        }
        .sheet(item: $presentedInfo) { info in
            ProfileInfoSheetView(info: info)
                .presentationDetents([.medium, .large])
        }
        .alert("删除我的数据？", isPresented: $showingDeleteDataConfirmation) {
            Button("取消", role: .cancel) {}
            Button("删除数据", role: .destructive) {
                Task {
                    isDeletingData = true
                    _ = await store.deleteMyDeviceData()
                    isDeletingData = false
                }
            }
        } message: {
            Text("删除后，当前匿名设备下的章节、通知、复习记录和反馈都会被移除。这个操作无法撤销。")
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

            HStack(spacing: 12) {
                Image(systemName: "iphone.gen3")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.textSoft)
                    .frame(width: 34, height: 34)
                    .background(ShiBeiTheme.yellowPale)
                    .clipShape(Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text("匿名设备")
                        .font(.system(size: 15, weight: .semibold))
                    Text("ID 尾号 \(store.anonymousDeviceId.suffix(6))")
                        .font(.system(size: 12))
                        .foregroundStyle(ShiBeiTheme.muted)
                }
                Spacer()
                Button("重置") {
                    store.resetAnonymousDeviceIdentity()
                }
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(ShiBeiTheme.textSoft)
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

    var title: String {
        switch self {
        case .account:
            "账号信息"
        case .notifications:
            "通知权限"
        case .privacy:
            "隐私说明"
        case .about:
            "关于拾贝"
        }
    }

    var paragraphs: [String] {
        switch self {
        case .account:
            [
                "当前 Beta 版本使用匿名设备身份保存数据，不需要注册或登录账号。",
                "匿名设备身份只用于区分你的章节、通知、复习记录和题目反馈。后续正式账号系统上线后，会再提供数据迁移方案。"
            ]
        case .notifications:
            [
                "当前 Beta 版本会在 App 内通知页展示生成成功或失败状态。",
                "远程系统推送还没有启用。你可以打开 App 查看章节生成进度和通知。"
            ]
        case .privacy:
            [
                "你提交的文字、文章链接和生成结果会发送到拾贝云端，用于提取知识点、生成题目和保存复习进度。",
                "生成过程中，内容可能会被发送给第三方 AI 模型服务处理。拾贝不会把你的内容公开展示给其他用户。",
                "服务器会保存章节、题目、通知、复习记录和题目反馈。你可以在“我的”页删除当前匿名设备下的数据。"
            ]
        case .about:
            [
                "拾贝是一款把文章、链接和碎片知识转化为复习题的 iOS App。",
                "当前版本是 TestFlight Beta，重点验证真实内容生成、复习和来源解释是否能帮助用户记住新知识。"
            ]
        }
    }
}

private struct ProfileInfoSheetView: View {
    let info: ProfileInfoSheet
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(info.paragraphs, id: \.self) { paragraph in
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
            .navigationTitle(info.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
}
