import SwiftUI

enum V2Color {
    static let primary = Color(hex: 0x98A84E)
    static let primaryAction = Color(hex: 0xA5AE66)
    static let unitProgressFill = Color(hex: 0xD4D89B)
    static let textPrimary = Color(hex: 0x44423D)
    static let topTitle = Color(hex: 0x575757)
    static let textSecondary = Color(hex: 0x676767)
    static let textMuted = Color(hex: 0x8C8B82)
    static let pageGreenBackground = Color(hex: 0xE8EBBD)
    static let surfaceCream = Color(hex: 0xFDFAF2)
    static let surfaceNav = Color(hex: 0xFCF8ED)
    static let surfaceCircleButton = Color(hex: 0xFDF9EE)
    static let uploadButtonFill = Color(hex: 0xE8E9C2)
    static let uploadButtonStroke = Color(hex: 0xFEFDFD)
    static let borderSoftGreen = Color(hex: 0xE0E5BA)
    static let decorativeLeaf = Color(hex: 0xDDE1AC)
    static let feedbackCorrectFill = Color(hex: 0xF3F5D7)
    static let feedbackWrongFill = Color(hex: 0xFEF5F0)
    static let feedbackWrongBorder = Color(hex: 0xFD9789)
    static let notificationBadge = Color(hex: 0xED765C)
    static let selectedBlueBorder = Color(hex: 0x94D0E9)
    static let lockedBorder = Color(hex: 0xE4E4E4)
    static let nodeLockedIcon = Color(hex: 0xBDBDBD)
}

enum V2Radius {
    static let small: CGFloat = 10
    static let medium: CGFloat = 15
    static let large: CGFloat = 20
    static let nav: CGFloat = 30
}

enum V2Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let screenMargin: CGFloat = 24
}

enum V2Layout {
    static let contentMaxWidth: CGFloat = 321
    static let topBarTopPadding: CGFloat = 30
    static let topBarHeight: CGFloat = 52
    static let topChromeReservedHeight: CGFloat = topBarTopPadding + topBarHeight
    static let primaryActionWidth: CGFloat = contentMaxWidth
    static let primaryActionBottomY: CGFloat = 600
}

enum V2Typography {
    static let pageTitle = Font.system(size: 22, weight: .bold, design: .default)
    static let cardTitle = Font.system(size: 18, weight: .bold, design: .default)
    static let body = Font.system(size: 16, weight: .regular, design: .default)
    static let bodyEmphasis = Font.system(size: 16, weight: .semibold, design: .default)
    static let label = Font.system(size: 12, weight: .medium, design: .default)
    static let navLabel = Font.system(size: 12, weight: .semibold, design: .default)
    static let nodeLabel = Font.system(size: 18, weight: .bold, design: .default)
}

struct V2ShadowSpec {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

enum V2Shadow {
    static let softGreen = V2ShadowSpec(
        color: Color(hex: 0x98A35E).opacity(0.20),
        radius: 4,
        x: 0,
        y: 4
    )

    static let subtleGreen = V2ShadowSpec(
        color: Color(hex: 0x98A35E).opacity(0.15),
        radius: 3,
        x: 0,
        y: 2
    )
}

extension View {
    func v2Shadow(_ shadow: V2ShadowSpec = V2Shadow.softGreen) -> some View {
        self.shadow(color: shadow.color, radius: shadow.radius, x: shadow.x, y: shadow.y)
    }

    func v2PageContentWidth() -> some View {
        self
            .frame(maxWidth: V2Layout.contentMaxWidth)
            .frame(maxWidth: .infinity)
    }
}

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: opacity)
    }
}
