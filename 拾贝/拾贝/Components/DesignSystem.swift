import SwiftUI

enum ShiBeiTheme {
    static let surface = Color(red: 1.0, green: 0.980, blue: 0.957)
    static let card = Color.white
    static let line = Color(red: 0.984, green: 0.953, blue: 0.894)
    static let lineSoft = Color(red: 0.918, green: 0.886, blue: 0.827)
    static let text = Color(red: 0.122, green: 0.106, blue: 0.071)
    static let textSoft = Color(red: 0.302, green: 0.275, blue: 0.208)
    static let muted = Color(red: 0.369, green: 0.369, blue: 0.369)
    static let faint = Color(red: 0.659, green: 0.635, blue: 0.620)
    static let primary = Color(red: 0.878, green: 0.596, blue: 0.349)
    static let yellow = Color(red: 0.988, green: 0.827, blue: 0.302)
    static let yellowPale = Color(red: 1.0, green: 0.937, blue: 0.737)
    static let error = Color(red: 0.729, green: 0.102, blue: 0.102)
    static let success = Color(red: 0.125, green: 0.788, blue: 0.396)
    static let radius: CGFloat = 15
}

struct AppScaffold<Content: View, Trailing: View>: View {
    @ObservedObject var store: AppStore
    let title: String
    var showsTopBar = true
    var showsTabBar = true
    var leadingAction: (() -> Void)?
    let trailing: Trailing
    let content: Content

    init(
        store: AppStore,
        title: String,
        showsTopBar: Bool = true,
        showsTabBar: Bool = true,
        leadingAction: (() -> Void)? = nil,
        @ViewBuilder trailing: () -> Trailing,
        @ViewBuilder content: () -> Content
    ) {
        self.store = store
        self.title = title
        self.showsTopBar = showsTopBar
        self.showsTabBar = showsTabBar
        self.leadingAction = leadingAction
        self.trailing = trailing()
        self.content = content()
    }

    var body: some View {
        ZStack {
            ShiBeiTheme.surface.ignoresSafeArea()
            VStack(spacing: 0) {
                if showsTopBar {
                    TopBar(title: title, leadingAction: leadingAction, trailing: trailing)
                }
                content
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .foregroundStyle(ShiBeiTheme.text)
    }
}

extension AppScaffold where Trailing == EmptyView {
    init(
        store: AppStore,
        title: String,
        showsTopBar: Bool = true,
        showsTabBar: Bool = true,
        leadingAction: (() -> Void)? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.init(
            store: store,
            title: title,
            showsTopBar: showsTopBar,
            showsTabBar: showsTabBar,
            leadingAction: leadingAction,
            trailing: { EmptyView() },
            content: content
        )
    }
}

struct TopBar<Trailing: View>: View {
    let title: String
    var leadingAction: (() -> Void)?
    let trailing: Trailing

    var body: some View {
        ZStack {
            Text(title)
                .font(.system(size: 20, weight: .bold))
            HStack {
                if let leadingAction {
                    Button(action: leadingAction) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .semibold))
                            .frame(width: 42, height: 42)
                    }
                    .accessibilityLabel(Text("global.back"))
                }
                Spacer()
                trailing
            }
            .padding(.horizontal, 18)
        }
        .frame(height: 64)
        .background(ShiBeiTheme.surface.opacity(0.94))
    }
}

struct SBCard<Content: View>: View {
    var padding: CGFloat = 25
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            content
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ShiBeiTheme.card)
        .overlay(
            RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous)
                .stroke(ShiBeiTheme.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 15, y: 10)
    }
}

struct StatusPill: View {
    let text: String
    var isDanger = false

    var body: some View {
        Text(text)
            .font(.system(size: 16, weight: .medium))
            .tracking(isDanger ? 0 : 1.6)
            .foregroundStyle(isDanger ? ShiBeiTheme.error : ShiBeiTheme.textSoft)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(isDanger ? Color(red: 1, green: 0.941, blue: 0.933) : ShiBeiTheme.yellowPale)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }
}

struct PrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    var disabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Text(title)
                if let systemImage {
                    Image(systemName: systemImage)
                }
            }
            .font(.system(size: 16, weight: .medium))
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(.white)
            .background(disabled ? ShiBeiTheme.primary.opacity(0.45) : ShiBeiTheme.primary)
            .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
            .shadow(color: .black.opacity(disabled ? 0 : 0.10), radius: 8, y: 4)
        }
        .disabled(disabled)
    }
}

struct SecondaryButton: View {
    let title: String
    var systemImage: String? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
            }
            .font(.system(size: 16, weight: .medium))
            .frame(maxWidth: .infinity, minHeight: 56)
            .foregroundStyle(ShiBeiTheme.textSoft)
            .background(ShiBeiTheme.card)
            .overlay(
                RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous)
                    .stroke(ShiBeiTheme.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
        }
    }
}

struct ProgressBar: View {
    let progress: Double

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(ShiBeiTheme.lineSoft)
                Capsule()
                    .fill(ShiBeiTheme.yellow)
                    .frame(width: proxy.size.width * max(0, min(progress, 1)))
            }
        }
        .frame(height: 8)
    }
}

struct KnowledgePointRow: View {
    let index: Int
    let point: KnowledgePoint
    var showsSummary = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index + 1)")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(ShiBeiTheme.textSoft)
                .frame(width: 26, height: 26)
                .background(ShiBeiTheme.yellowPale)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 6) {
                Text(point.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(ShiBeiTheme.text)
                if showsSummary {
                    Text(point.summary)
                        .font(.system(size: 14))
                        .foregroundStyle(ShiBeiTheme.muted)
                        .lineSpacing(3)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ShiBeiTheme.card)
        .overlay(
            RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous)
                .stroke(ShiBeiTheme.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 10, y: 5)
    }
}

struct SubmittedToast: View {
    let language: AppLanguage
    let close: () -> Void

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.ultraThinMaterial)
                .ignoresSafeArea()
            Color.black.opacity(0.16)
                .ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "checkmark")
                    .font(.system(size: 28, weight: .bold))
                    .frame(width: 56, height: 56)
                    .background(ShiBeiTheme.yellow)
                    .clipShape(Circle())
                Text(L10n.string("toast.submitted.title", language: language))
                    .font(.system(size: 22, weight: .bold))
                Text(L10n.string("toast.submitted.body", language: language))
                    .foregroundStyle(ShiBeiTheme.muted)
                PrimaryButton(title: L10n.string("toast.submitted.action", language: language), action: close)
            }
            .padding(24)
            .frame(width: 330)
            .background(ShiBeiTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: ShiBeiTheme.radius, style: .continuous))
            .shadow(color: .black.opacity(0.18), radius: 18, y: 8)
        }
    }
}
