import SwiftUI

struct V2InfoCard<Content: View>: View {
    var shadow: V2ShadowSpec? = V2Shadow.softGreen
    var border: Color?
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .padding(24)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(V2Color.surfaceCream)
                    .modifier(V2OptionalShadow(shadow: shadow))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(border ?? .clear, lineWidth: border == nil ? 0 : 1.5)
            )
    }
}

private struct V2OptionalShadow: ViewModifier {
    let shadow: V2ShadowSpec?

    func body(content: Content) -> some View {
        if let shadow {
            content.v2Shadow(shadow)
        } else {
            content
        }
    }
}
