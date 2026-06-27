import PhotosUI
import SwiftUI

struct V2ProfileHeaderCard: View {
    let name: String
    let bio: String
    let reviewedCount: String
    let streakDays: String
    @Binding var avatarImageData: Data

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: V2ProfileHeaderMetrics.cornerRadius, style: .continuous)
                .fill(V2Color.surfaceCream)
                .v2Shadow()

            V2ProfileAvatarPicker(avatarImageData: $avatarImageData)
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
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        PhotosPicker(
            selection: $selectedPhotoItem,
            matching: .images,
            photoLibrary: .shared()
        ) {
            ZStack(alignment: .bottomTrailing) {
                avatarContent
                    .frame(width: V2ProfileAvatarMetrics.size, height: V2ProfileAvatarMetrics.size)
                    .background(Color(hex: 0xEEF0C7))
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
            Image("V2MascotStatic")
                .resizable()
                .renderingMode(.original)
                .scaledToFit()
                .frame(width: V2ProfileAvatarMetrics.defaultMascotSize)
                .scaleEffect(0.8, anchor: .top)
                .offset(y: 7)
        }
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
        selectedPhotoItem = nil
    }
}

private enum V2ProfileAvatarMetrics {
    static let size: CGFloat = 78
    static let defaultMascotSize: CGFloat = 78
    static let badgeSize: CGFloat = 24
    static let storedPixelSize: CGFloat = 320
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
