import PhotosUI
import SwiftUI

struct V2ProfileHeaderCard: View {
    let name: String
    let bio: String
    let reviewedCount: String
    let streakDays: String
    @Binding var avatarImageData: Data
    @Binding var selectedPresetAvatarName: String

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2ProfileHeaderMetrics.cornerRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            V2ProfileAvatarPicker(
                avatarImageData: $avatarImageData,
                selectedPresetAvatarName: $selectedPresetAvatarName
            )
                .offset(x: 24, y: 16)

            Text(name)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(V2Color.textPrimary)
                .lineLimit(1)
                .offset(x: 127, y: 29)

            Text(bio)
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(V2Color.topTitle.opacity(0.72))
                .lineLimit(1)
                .offset(x: 127, y: 64)

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
                    title: "已复习",
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
            .offset(x: 24, y: 124)
        }
        .frame(width: V2ProfileHeaderMetrics.cardWidth, height: V2ProfileHeaderMetrics.cardHeight)
    }
}

private enum V2ProfileHeaderMetrics {
    static let cardWidth: CGFloat = 321
    static let cardHeight: CGFloat = 226
    static let cornerRadius: CGFloat = 15
    static let statGroupWidth: CGFloat = cardWidth - 48
    static let statCardWidth: CGFloat = (statGroupWidth - 13) / 2
    static let statCardHeight: CGFloat = 82
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
        selectedPresetAvatarName.isEmpty ? V2ProfilePresetAvatar.defaultAssetName : selectedPresetAvatarName
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
        .background(V2Color.pageGreenBackground.ignoresSafeArea())
    }

    private var effectivePresetAvatarName: String {
        selectedPresetAvatarName.isEmpty ? V2ProfilePresetAvatar.defaultAssetName : selectedPresetAvatarName
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

    static let defaultAssetName = "V2MascotStatic"

    static let allCases: [V2ProfilePresetAvatar] = [
        .init(id: "static", title: "阅读", assetName: "V2MascotStatic"),
        .init(id: "discover", title: "发现", assetName: "V2DiscoverHeroMascot"),
        .init(id: "materials", title: "章节", assetName: "V2MaterialsMascot"),
        .init(id: "notes", title: "笔记", assetName: "V2NotesMascot"),
        .init(id: "notification", title: "通知", assetName: "V2NotificationMascot"),
        .init(id: "chapterDetail", title: "详情", assetName: "V2ChapterDetailMascot"),
        .init(id: "unitOverview", title: "知识点", assetName: "V2UnitOverviewMascot"),
        .init(id: "matching", title: "练习", assetName: "V2MatchingMascot"),
        .init(id: "generating", title: "生成中", assetName: "V2GeneratingChapterMascot"),
        .init(id: "failed", title: "生成失败", assetName: "V2NotificationFailureDetailMascot"),
        .init(id: "unitComplete", title: "单元完成", assetName: "V2MascotCompletion"),
        .init(id: "chapterComplete", title: "章节完成", assetName: "V2ChapterCompletionMascot"),
        .init(id: "splash", title: "启动", assetName: "V2SplashMascot"),
        .init(id: "popup", title: "提醒", assetName: "V2GeneratingPopupMascot")
    ]
}

private enum V2ProfileAvatarMetrics {
    static let size: CGFloat = 78
    static let defaultMascotSize: CGFloat = 78
    static let badgeSize: CGFloat = 24
    static let storedPixelSize: CGFloat = 320
    static let avatarPadding: CGFloat = 4
    static let backgroundColor = Color(hex: 0xEEF0C7)
    static let sheetHorizontalPadding: CGFloat = 24
    static let sheetTopPadding: CGFloat = 22
    static let sheetBottomPadding: CGFloat = 24
    static let sheetSectionSpacing: CGFloat = 18
    static let presetCellSize: CGFloat = 58
    static let presetGridSpacing: CGFloat = 14
    static let presetAvatarPadding: CGFloat = 8
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
    var body: some View {
        VStack(spacing: 0) {
            V2ProfileSettingRow(title: "通知设置", assetName: "V2ProfileSettingNotification")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "隐私说明", assetName: "V2ProfileSettingPrivacy")
            V2ProfileSettingDivider()
            V2ProfileSettingRow(title: "账号说明", assetName: "V2ProfileSettingAccount")
        }
        .padding(.top, 10)
        .padding(.bottom, 10)
        .frame(width: 321, height: 190)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()
        )
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
