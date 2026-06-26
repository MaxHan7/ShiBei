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
        Group {
            if shouldUseV2Root {
                V2RootView()
            } else {
                RootView(store: store)
            }
        }
            .task(id: scenePhase) {
                guard scenePhase == .active else { return }
                await store.refreshVisibleProcessingChapterFromAPI()
                await store.syncPushTokenIfAuthorized()
            }
    }

    private var shouldUseV2Root: Bool {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        let environment = ProcessInfo.processInfo.environment
        return !arguments.contains("-ShibeiUseLegacyRoot")
            && environment["SHIBEI_USE_LEGACY_ROOT"] != "1"
        #else
        return true
        #endif
    }
}

#Preview {
    ContentView()
        .environmentObject(AppStore())
}
