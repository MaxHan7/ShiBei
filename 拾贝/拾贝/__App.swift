//
//  __App.swift
//  Recallo
//
//  Created by 韩明瑜 on 2026/5/16.
//

import SwiftUI

@main
struct __App: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(.light)
        }
    }
}
