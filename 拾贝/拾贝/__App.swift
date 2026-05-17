//
//  __App.swift
//  拾贝
//
//  Created by 韩明瑜 on 2026/5/16.
//

import SwiftUI

@main
struct __App: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(.light)
        }
    }
}
