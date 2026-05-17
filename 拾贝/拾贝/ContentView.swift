//
//  ContentView.swift
//  拾贝
//
//  Created by 韩明瑜 on 2026/5/16.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        RootView(store: store)
            .task(id: scenePhase) {
                guard scenePhase == .active else { return }
                await store.refreshVisibleProcessingChapterFromAPI()
            }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppStore())
}
