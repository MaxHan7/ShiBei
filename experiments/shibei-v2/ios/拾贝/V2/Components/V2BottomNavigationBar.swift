import SwiftUI

struct V2BottomNavigationBar: View {
    @Binding var selectedTab: V2HomeTab

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            V2BottomNavItem(tab: .learning, selectedTab: $selectedTab)
            V2BottomNavItem(tab: .materials, selectedTab: $selectedTab)
            V2UploadTabButton {
                selectedTab = .upload
            }
            V2BottomNavItem(tab: .discover, selectedTab: $selectedTab)
            V2BottomNavItem(tab: .notes, selectedTab: $selectedTab)
        }
        .padding(.horizontal, 15)
        .frame(maxWidth: 330)
        .frame(height: 78)
        .background(
            RoundedRectangle(cornerRadius: V2Radius.nav, style: .continuous)
                .fill(V2Color.surfaceNav)
                .v2Shadow()
        )
    }
}

struct V2BottomNavItem: View {
    let tab: V2HomeTab
    @Binding var selectedTab: V2HomeTab

    private var isSelected: Bool {
        selectedTab == tab
    }

    var body: some View {
        Button {
            selectedTab = tab
        } label: {
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
            .frame(maxWidth: .infinity)
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
            ZStack {
                Circle()
                    .fill(Color(hex: 0xE8E9C2))
                    .frame(width: 52, height: 52)
                    .overlay(
                        Circle()
                            .stroke(Color.white, lineWidth: 2)
                    )
                    .v2Shadow()

                VStack(spacing: 0) {
                    RoundedRectangle(cornerRadius: 1)
                        .fill(V2Color.primary)
                        .frame(width: 2, height: 18)
                    RoundedRectangle(cornerRadius: 1)
                        .fill(V2Color.primary)
                        .frame(width: 18, height: 2)
                        .offset(y: -10)
                }
            }
            .frame(width: 60, height: 60)
            .accessibilityLabel("上传")
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
