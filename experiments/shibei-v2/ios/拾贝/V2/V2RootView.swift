import SwiftUI

struct V2RootView: View {
    var body: some View {
        V2HomeView(data: V2HomeFixture.home)
    }
}

#Preview {
    V2RootView()
}
