import PhotosUI
import SwiftUI
import UIKit
import UserNotifications

struct V2ProfileHeaderCard: View {
    @Binding var name: String
    let reviewedCount: String
    let streakDays: String
    @Binding var avatarImageData: Data
    @Binding var selectedPresetAvatarName: String
    @State private var showsNameEditor = false
    @State private var draftName = ""

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2ProfileHeaderMetrics.cornerRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            HStack(alignment: .center, spacing: V2ProfileHeaderMetrics.identitySpacing) {
                V2ProfileAvatarPicker(
                    avatarImageData: $avatarImageData,
                    selectedPresetAvatarName: $selectedPresetAvatarName
                )

                Button {
                    draftName = displayName
                    showsNameEditor = true
                } label: {
                    HStack(alignment: .center, spacing: V2ProfileHeaderMetrics.nameEditGap) {
                        Text(displayName)
                            .font(V2ProfileHeaderMetrics.nameFont)
                            .foregroundStyle(V2Color.textPrimary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.82)

                        Image(systemName: "pencil")
                            .font(V2ProfileHeaderMetrics.editIconFont)
                            .foregroundStyle(V2Color.topTitle.opacity(0.68))
                            .frame(
                                width: V2ProfileHeaderMetrics.editIconTouchSize,
                                height: V2ProfileHeaderMetrics.editIconTouchSize
                            )
                            .background(V2Color.surfaceCream.opacity(0.8))
                            .clipShape(Circle())
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("编辑昵称")
            }
            .frame(width: V2ProfileHeaderMetrics.identityWidth, alignment: .leading)
            .offset(x: V2ProfileHeaderMetrics.identityX, y: V2ProfileHeaderMetrics.identityY)

            Image("V2BgDecoSmallPlantCluster")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: 60)
                .opacity(0.86)
                .offset(x: 241, y: 170)
                .allowsHitTesting(false)

            HStack(spacing: 13) {
                V2ProfileStatCard(
                    title: "已掌握",
                    value: reviewedCount,
                    unit: "个知识点",
                    assetName: "V2ProfileStatReviewed"
                )
                V2ProfileStatCard(
                    title: "连续学习",
                    value: streakDays,
                    unit: "天",
                    assetName: "V2ProfileStatStreak"
                )
            }
            .frame(width: V2ProfileHeaderMetrics.statGroupWidth)
            .offset(x: V2ProfileHeaderMetrics.statGroupX, y: V2ProfileHeaderMetrics.statGroupY)
        }
        .frame(width: V2ProfileHeaderMetrics.cardWidth, height: V2ProfileHeaderMetrics.cardHeight)
        .sheet(isPresented: $showsNameEditor) {
            V2ProfileNameEditSheet(
                draftName: $draftName,
                onCancel: { showsNameEditor = false },
                onSave: saveDraftName
            )
            .presentationDetents([.height(V2ProfileNameEditMetrics.sheetHeight)])
            .presentationDragIndicator(.visible)
        }
    }

    private var displayName: String {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmedName.isEmpty ? V2ProfileHeaderMetrics.defaultName : trimmedName
    }

    private func saveDraftName() {
        let trimmedName = draftName.trimmingCharacters(in: .whitespacesAndNewlines)
        name = trimmedName.isEmpty ? V2ProfileHeaderMetrics.defaultName : String(trimmedName.prefix(V2ProfileHeaderMetrics.nameCharacterLimit))
        showsNameEditor = false
    }
}

private enum V2ProfileHeaderMetrics {
    static let defaultName = "Cappy"
    static let nameCharacterLimit = 16
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 208
    static let cornerRadius: CGFloat = 15
    static let identityX: CGFloat = 24
    static let identityY: CGFloat = 18
    static let identityWidth: CGFloat = cardWidth - 48
    static let identitySpacing: CGFloat = 24
    static let nameEditGap: CGFloat = 8
    static let editIconTouchSize: CGFloat = 28
    static let nameFont = Font.system(size: 22, weight: .bold, design: .default)
    static let editIconFont = Font.system(size: 13, weight: .semibold, design: .default)
    static let statGroupX: CGFloat = 24
    static let statGroupY: CGFloat = 110
    static let statGroupWidth: CGFloat = cardWidth - 48
    static let statCardWidth: CGFloat = (statGroupWidth - 13) / 2
    static let statCardHeight: CGFloat = 82
}

private struct V2ProfileNameEditSheet: View {
    @Binding var draftName: String
    let onCancel: () -> Void
    let onSave: () -> Void
    @FocusState private var isNameFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: V2ProfileNameEditMetrics.sectionSpacing) {
            HStack {
                Text("编辑昵称")
                    .font(V2Typography.cardTitle)
                    .foregroundStyle(V2Color.textPrimary)

                Spacer()

                Button(action: onCancel) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(V2Color.textPrimary.opacity(0.72))
                        .frame(
                            width: V2ProfileNameEditMetrics.closeButtonSize,
                            height: V2ProfileNameEditMetrics.closeButtonSize
                        )
                        .background(V2Color.surfaceCream)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("关闭昵称编辑")
            }

            TextField("输入昵称", text: $draftName)
                .font(V2Typography.body)
                .foregroundStyle(V2Color.textPrimary)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .focused($isNameFocused)
                .padding(.horizontal, V2ProfileNameEditMetrics.inputHorizontalPadding)
                .frame(height: V2ProfileNameEditMetrics.inputHeight)
                .background(V2Color.surfaceCream)
                .clipShape(RoundedRectangle(cornerRadius: V2ProfileNameEditMetrics.inputCornerRadius, style: .continuous))
                .v2Shadow(V2Shadow.subtleGreen)
                .onChange(of: draftName) { _, newValue in
                    if newValue.count > V2ProfileHeaderMetrics.nameCharacterLimit {
                        draftName = String(newValue.prefix(V2ProfileHeaderMetrics.nameCharacterLimit))
                    }
                }

            Button(action: onSave) {
                Text("保存")
                    .font(V2Typography.primaryButton)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: V2ProfileNameEditMetrics.saveButtonHeight)
                    .background(V2Color.primaryAction)
                    .clipShape(RoundedRectangle(cornerRadius: V2ProfileNameEditMetrics.saveButtonCornerRadius, style: .continuous))
                    .v2Shadow(V2Shadow.subtleGreen)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, V2ProfileNameEditMetrics.horizontalPadding)
        .padding(.top, V2ProfileNameEditMetrics.topPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(V2Color.surfaceCream.ignoresSafeArea())
        .onAppear {
            isNameFocused = true
        }
    }
}

private enum V2ProfileNameEditMetrics {
    static let sheetHeight: CGFloat = 230
    static let horizontalPadding: CGFloat = V2Spacing.lg
    static let topPadding: CGFloat = 22
    static let sectionSpacing: CGFloat = 18
    static let closeButtonSize: CGFloat = 32
    static let inputHeight: CGFloat = 50
    static let inputHorizontalPadding: CGFloat = 16
    static let inputCornerRadius: CGFloat = 14
    static let saveButtonHeight: CGFloat = 46
    static let saveButtonCornerRadius: CGFloat = 14
}

private struct V2ProfileAvatarPicker: View {
    @Binding var avatarImageData: Data
    @Binding var selectedPresetAvatarName: String
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var showsAvatarSheet = false

    var body: some View {
        Button {
            showsAvatarSheet = true
        } label: {
            ZStack(alignment: .bottomTrailing) {
                avatarContent
                    .frame(width: V2ProfileAvatarMetrics.size, height: V2ProfileAvatarMetrics.size)
                    .background(V2ProfileAvatarMetrics.backgroundColor)
                    .clipShape(Circle())

                Circle()
                    .fill(V2Color.surfaceCream)
                    .frame(width: V2ProfileAvatarMetrics.badgeSize, height: V2ProfileAvatarMetrics.badgeSize)
                    .overlay {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(V2Color.textPrimary.opacity(0.74))
                    }
                    .v2Shadow(V2Shadow.subtleGreen)
                    .offset(x: 2, y: 2)
            }
            .contentShape(Circle())
            .accessibilityLabel("更换头像")
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showsAvatarSheet) {
            V2ProfileAvatarSelectionSheet(
                avatarImageData: $avatarImageData,
                selectedPresetAvatarName: $selectedPresetAvatarName,
                selectedPhotoItem: $selectedPhotoItem,
                onDismiss: { showsAvatarSheet = false }
            )
            .presentationDetents([.medium])
            .presentationDragIndicator(.visible)
        }
        .onChange(of: selectedPhotoItem) { _, newItem in
            guard let newItem else { return }
            Task {
                await updateAvatar(from: newItem)
            }
        }
    }

    @ViewBuilder
    private var avatarContent: some View {
        if let image = selectedAvatarImage {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
        } else {
            Image(effectivePresetAvatarName)
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2ProfileAvatarMetrics.defaultMascotSize, height: V2ProfileAvatarMetrics.defaultMascotSize)
                .padding(V2ProfileAvatarMetrics.avatarPadding)
        }
    }

    private var effectivePresetAvatarName: String {
        V2ProfilePresetAvatar.validAssetName(for: selectedPresetAvatarName)
    }

    private var selectedAvatarImage: UIImage? {
        guard !avatarImageData.isEmpty else {
            return nil
        }
        return UIImage(data: avatarImageData)
    }

    @MainActor
    private func updateAvatar(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data),
              let compressedData = image.v2ProfileAvatarJPEGData() else {
            selectedPhotoItem = nil
            return
        }

        avatarImageData = compressedData
        selectedPresetAvatarName = ""
        selectedPhotoItem = nil
        showsAvatarSheet = false
    }
}

private struct V2ProfileAvatarSelectionSheet: View {
    @Binding var avatarImageData: Data
    @Binding var selectedPresetAvatarName: String
    @Binding var selectedPhotoItem: PhotosPickerItem?
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: V2ProfileAvatarMetrics.sheetSectionSpacing) {
            HStack {
                Text("选择头像")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(V2Color.textPrimary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(V2Color.textPrimary.opacity(0.72))
                        .frame(width: 32, height: 32)
                        .background(V2Color.surfaceCream)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("关闭头像选择")
            }

            LazyVGrid(columns: V2ProfileAvatarMetrics.presetGridColumns, spacing: V2ProfileAvatarMetrics.presetGridSpacing) {
                ForEach(V2ProfilePresetAvatar.allCases) { avatar in
                    Button {
                        selectedPresetAvatarName = avatar.assetName
                        avatarImageData = Data()
                        onDismiss()
                    } label: {
                        V2ProfilePresetAvatarCell(
                            avatar: avatar,
                            isSelected: avatarImageData.isEmpty && effectivePresetAvatarName == avatar.assetName
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("选择\(avatar.title)头像")
                }
            }

            PhotosPicker(
                selection: $selectedPhotoItem,
                matching: .images,
                photoLibrary: .shared()
            ) {
                HStack(spacing: 10) {
                    Image(systemName: "photo")
                        .font(.system(size: 16, weight: .semibold))
                    Text("从相册选择")
                        .font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(V2Color.textPrimary)
                .padding(.horizontal, 16)
                .frame(height: V2ProfileAvatarMetrics.photoPickerHeight)
                .background(V2Color.surfaceCream)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .v2Shadow(V2Shadow.subtleGreen)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, V2ProfileAvatarMetrics.sheetHorizontalPadding)
        .padding(.top, V2ProfileAvatarMetrics.sheetTopPadding)
        .padding(.bottom, V2ProfileAvatarMetrics.sheetBottomPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(V2ProfileAvatarMetrics.sheetBackground.ignoresSafeArea())
    }

    private var effectivePresetAvatarName: String {
        V2ProfilePresetAvatar.validAssetName(for: selectedPresetAvatarName)
    }
}

private struct V2ProfilePresetAvatarCell: View {
    let avatar: V2ProfilePresetAvatar
    let isSelected: Bool

    var body: some View {
        ZStack {
            Circle()
                .fill(V2ProfileAvatarMetrics.backgroundColor)
                .overlay {
                    Circle()
                        .stroke(
                            isSelected ? V2Color.primaryAction : Color.clear,
                            lineWidth: V2ProfileAvatarMetrics.selectedRingWidth
                        )
                }
                .v2Shadow(V2Shadow.subtleGreen)

            Image(avatar.assetName)
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .padding(V2ProfileAvatarMetrics.presetAvatarPadding)
        }
        .frame(width: V2ProfileAvatarMetrics.presetCellSize, height: V2ProfileAvatarMetrics.presetCellSize)
    }
}

private struct V2ProfilePresetAvatar: Identifiable, CaseIterable {
    let id: String
    let title: String
    let assetName: String

    static let defaultAssetName = "V2ProfileAvatarPreset01"

    static let allCases: [V2ProfilePresetAvatar] = [
        .init(id: "calm", title: "默认", assetName: "V2ProfileAvatarPreset01"),
        .init(id: "working", title: "生成", assetName: "V2ProfileAvatarPreset02"),
        .init(id: "reading", title: "阅读", assetName: "V2ProfileAvatarPreset03"),
        .init(id: "failed", title: "提醒", assetName: "V2ProfileAvatarPreset04"),
        .init(id: "article", title: "文章", assetName: "V2ProfileAvatarPreset05"),
        .init(id: "notes", title: "笔记", assetName: "V2ProfileAvatarPreset06"),
        .init(id: "book", title: "学习", assetName: "V2ProfileAvatarPreset07")
    ]

    static func validAssetName(for storedAssetName: String) -> String {
        guard allCases.contains(where: { $0.assetName == storedAssetName }) else {
            return defaultAssetName
        }
        return storedAssetName
    }
}

private enum V2ProfileAvatarMetrics {
    static let size: CGFloat = 78
    static let defaultMascotSize: CGFloat = 78
    static let badgeSize: CGFloat = 24
    static let storedPixelSize: CGFloat = 320
    static let avatarPadding: CGFloat = 0
    static let backgroundColor = Color(hex: 0xEEF0C7)
    static let sheetBackground = V2Color.surfaceCream
    static let sheetHorizontalPadding: CGFloat = 24
    static let sheetTopPadding: CGFloat = 22
    static let sheetBottomPadding: CGFloat = 24
    static let sheetSectionSpacing: CGFloat = 18
    static let presetCellSize: CGFloat = 58
    static let presetGridSpacing: CGFloat = 14
    static let presetAvatarPadding: CGFloat = 0
    static let selectedRingWidth: CGFloat = 2
    static let photoPickerHeight: CGFloat = 50
    static let presetGridColumns = Array(
        repeating: GridItem(.fixed(presetCellSize), spacing: presetGridSpacing),
        count: 4
    )
}

private extension UIImage {
    func v2ProfileAvatarJPEGData() -> Data? {
        let targetSize = CGSize(
            width: V2ProfileAvatarMetrics.storedPixelSize,
            height: V2ProfileAvatarMetrics.storedPixelSize
        )
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let renderedImage = renderer.image { _ in
            let scale = max(targetSize.width / size.width, targetSize.height / size.height)
            let drawSize = CGSize(width: size.width * scale, height: size.height * scale)
            let drawOrigin = CGPoint(
                x: (targetSize.width - drawSize.width) / 2,
                y: (targetSize.height - drawSize.height) / 2
            )
            draw(in: CGRect(origin: drawOrigin, size: drawSize))
        }
        return renderedImage.jpegData(compressionQuality: 0.82)
    }
}

struct V2ProfileStatCard: View {
    let title: String
    let value: String
    let unit: String
    let assetName: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .center, spacing: 8) {
                    Image(assetName)
                        .resizable()
                        .renderingMode(.original)
                        .frame(width: V2ProfileStatMetrics.iconSize, height: V2ProfileStatMetrics.iconSize)

                    Text(title)
                        .font(V2Typography.labelRegular)
                        .foregroundStyle(V2Color.topTitle.opacity(0.72))
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                HStack(alignment: .lastTextBaseline, spacing: 5) {
                    Text(value)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(V2Color.textPrimary)
                        .monospacedDigit()

                    Text(unit)
                        .font(V2Typography.labelRegular)
                        .foregroundStyle(V2Color.topTitle.opacity(0.72))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.leading, V2ProfileStatMetrics.contentLeading)
            .padding(.top, V2ProfileStatMetrics.contentTop)
        }
        .frame(
            width: V2ProfileHeaderMetrics.statCardWidth,
            height: V2ProfileHeaderMetrics.statCardHeight
        )
    }
}

private enum V2ProfileStatMetrics {
    static let contentLeading: CGFloat = 12
    static let contentTop: CGFloat = 10
    static let iconSize: CGFloat = 32
}

struct V2ProfileSettingsCard: View {
    @State private var activeSheet: V2ProfileSettingsSheet?

    var body: some View {
        VStack(spacing: 0) {
            Button {
                activeSheet = .notifications
            } label: {
                V2ProfileSettingRow(title: "通知设置", assetName: "V2ProfileSettingNotification")
            }
            V2ProfileSettingDivider()
            Button {
                activeSheet = .privacy
            } label: {
                V2ProfileSettingRow(title: "隐私说明", assetName: "V2ProfileSettingPrivacy")
            }
            V2ProfileSettingDivider()
            Button {
                activeSheet = .account
            } label: {
                V2ProfileSettingRow(title: "账号说明", assetName: "V2ProfileSettingAccount")
            }
        }
        .buttonStyle(.plain)
        .padding(.top, 10)
        .padding(.bottom, 10)
        .frame(width: 321, height: 190)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
        .sheet(item: $activeSheet) { sheet in
            V2ProfileSettingsSheetView(sheet: sheet)
                .presentationDetents(sheet.detents)
                .presentationDragIndicator(.visible)
        }
    }
}

private struct V2ProfileSettingDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color(hex: 0xECE9DC))
            .frame(height: 1)
            .padding(.leading, 72)
            .padding(.trailing, 29)
    }
}

private enum V2ProfileSettingsSheet: String, Identifiable {
    case notifications
    case privacy
    case account

    var id: String { rawValue }

    var title: String {
        switch self {
        case .notifications: "通知设置"
        case .privacy: "隐私说明"
        case .account: "账号说明"
        }
    }

    var paragraphs: [String] {
        switch self {
        case .notifications:
            [
                "Recallo 会在内容生成完成或失败时发送系统通知，帮助你回到对应章节继续学习。",
                "如果你没有开启系统通知，仍然可以在 App 内通知页查看生成结果。成功通知打开后会自动归档，失败通知会保留到你处理或手动移除。"
            ]
        case .privacy:
            [
                "你提交的文字、文章链接和生成结果会发送到Recallo 云端，用于提取知识点、生成题目和保存学习进度。",
                "生成过程中，内容可能会被发送给第三方 AI 模型服务处理。Recallo 不会把你的内容公开展示给其他用户。",
                "服务器会保存章节、题目、通知、学习记录和题目反馈。你可以在“我的”页删除当前匿名设备下的数据。"
            ]
        case .account:
            [
                "当前版本使用匿名设备身份保存数据，不需要注册或登录账号。",
                "匿名设备身份只用于区分你的章节、通知、学习记录和题目反馈。后续如果提供账号系统，会再提供数据迁移方案。"
            ]
        }
    }

    var detents: Set<PresentationDetent> {
        switch self {
        case .notifications: [.medium]
        case .privacy, .account: [.medium, .large]
        }
    }
}

private struct V2ProfileSettingsSheetView: View {
    let sheet: V2ProfileSettingsSheet
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: V2ProfileSettingsSheetMetrics.sectionSpacing) {
            V2ProfileSettingsSheetHeader(title: sheet.title) {
                dismiss()
            }

            VStack(alignment: .leading, spacing: V2ProfileSettingsSheetMetrics.paragraphSpacing) {
                ForEach(sheet.paragraphs, id: \.self) { paragraph in
                    Text(paragraph)
                        .font(V2Typography.bodySmall)
                        .foregroundStyle(V2Color.textSecondary)
                        .lineSpacing(V2ProfileSettingsSheetMetrics.paragraphLineSpacing)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            if sheet == .notifications {
                V2ProfileNotificationPermissionPanel()
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, V2ProfileSettingsSheetMetrics.horizontalPadding)
        .padding(.top, V2ProfileSettingsSheetMetrics.topPadding)
        .padding(.bottom, V2ProfileSettingsSheetMetrics.bottomPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(V2ProfileSettingsSheetMetrics.sheetBackground.ignoresSafeArea())
    }
}

private struct V2ProfileSettingsSheetHeader: View {
    let title: String
    let onClose: () -> Void

    var body: some View {
        HStack {
            Text(title)
                .font(V2Typography.cardTitle)
                .foregroundStyle(V2Color.textPrimary)

            Spacer()

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(V2Color.textPrimary.opacity(0.72))
                    .frame(
                        width: V2ProfileSettingsSheetMetrics.closeButtonSize,
                        height: V2ProfileSettingsSheetMetrics.closeButtonSize
                    )
                    .background(V2Color.surfaceCream)
                    .clipShape(Circle())
                    .v2Shadow(V2Shadow.subtleGreen)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("关闭")
        }
    }
}

private struct V2ProfileNotificationPermissionPanel: View {
    @State private var status: UNAuthorizationStatus = .notDetermined
    @State private var isRequesting = false

    var body: some View {
        VStack(alignment: .leading, spacing: V2ProfileSettingsSheetMetrics.permissionPanelSpacing) {
            HStack(spacing: V2ProfileSettingsSheetMetrics.permissionStatusGap) {
                Circle()
                    .fill(statusIndicatorColor)
                    .frame(
                        width: V2ProfileSettingsSheetMetrics.statusDotSize,
                        height: V2ProfileSettingsSheetMetrics.statusDotSize
                    )

                Text(statusTitle)
                    .font(V2Typography.bodySmallEmphasis)
                    .foregroundStyle(V2Color.textPrimary)

                Spacer()
            }

            Text(statusDescription)
                .font(V2Typography.labelRegular)
                .foregroundStyle(V2Color.textMuted)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                Task {
                    await handlePrimaryAction()
                }
            } label: {
                Text(primaryActionTitle)
                    .font(V2Typography.primaryButton)
                    .foregroundStyle(V2Color.surfaceCream)
                    .frame(maxWidth: .infinity)
                    .frame(height: V2ProfileSettingsSheetMetrics.primaryButtonHeight)
                    .background(V2Color.primaryAction)
                    .clipShape(RoundedRectangle(cornerRadius: V2Radius.medium, style: .continuous))
                    .v2Shadow(V2Shadow.subtleGreen)
            }
            .buttonStyle(.plain)
            .disabled(isRequesting)
            .opacity(isRequesting ? 0.72 : 1)
        }
        .padding(V2ProfileSettingsSheetMetrics.permissionPanelPadding)
        .background(V2Color.surfaceCream)
        .clipShape(RoundedRectangle(cornerRadius: V2Radius.medium, style: .continuous))
        .v2Shadow(V2Shadow.subtleGreen)
        .task {
            await refreshStatus()
        }
    }

    private var statusTitle: String {
        switch status {
        case .authorized, .provisional, .ephemeral:
            "系统通知已开启"
        case .denied:
            "系统通知已关闭"
        case .notDetermined:
            "尚未开启系统通知"
        @unknown default:
            "通知状态未知"
        }
    }

    private var statusDescription: String {
        switch status {
        case .authorized, .provisional, .ephemeral:
            "生成完成或失败后，Recallo 可以通过系统通知提醒你。"
        case .denied:
            "你已经在系统里关闭了通知。需要到 iOS 设置中重新允许 Recallo 发送通知。"
        case .notDetermined:
            "开启后，生成任务完成时即使暂时离开 App，也能收到提醒。"
        @unknown default:
            "可以前往系统设置检查 Recallo 的通知权限。"
        }
    }

    private var statusIndicatorColor: Color {
        switch status {
        case .authorized, .provisional, .ephemeral:
            V2Color.primaryAction
        case .denied:
            V2Color.notificationBadge
        case .notDetermined:
            V2Color.selectedBlueBorder
        @unknown default:
            V2Color.textMuted
        }
    }

    private var primaryActionTitle: String {
        switch status {
        case .notDetermined:
            isRequesting ? "正在开启..." : "开启通知"
        case .authorized, .provisional, .ephemeral:
            "打开系统设置"
        case .denied:
            "前往系统设置"
        @unknown default:
            "打开系统设置"
        }
    }

    private func refreshStatus() async {
        status = await PushNotificationService.authorizationStatus()
    }

    @MainActor
    private func handlePrimaryAction() async {
        switch status {
        case .notDetermined:
            isRequesting = true
            _ = try? await PushNotificationService.requestAuthorizationAndRegister()
            isRequesting = false
            await refreshStatus()
        case .authorized, .provisional, .ephemeral, .denied:
            openAppNotificationSettings()
            await refreshStatus()
        @unknown default:
            openAppNotificationSettings()
            await refreshStatus()
        }
    }

    @MainActor
    private func openAppNotificationSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else {
            return
        }
        UIApplication.shared.open(url)
    }
}

private enum V2ProfileSettingsSheetMetrics {
    static let sheetBackground = V2Color.surfaceCream
    static let horizontalPadding: CGFloat = V2Spacing.lg
    static let topPadding: CGFloat = 22
    static let bottomPadding: CGFloat = V2Spacing.lg
    static let sectionSpacing: CGFloat = 18
    static let paragraphSpacing: CGFloat = 12
    static let paragraphLineSpacing: CGFloat = 5
    static let closeButtonSize: CGFloat = 32
    static let permissionPanelPadding: CGFloat = 16
    static let permissionPanelSpacing: CGFloat = 12
    static let permissionStatusGap: CGFloat = 8
    static let statusDotSize: CGFloat = 9
    static let primaryButtonHeight: CGFloat = 46
}
