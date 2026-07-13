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
    @AppStorage(AppLanguage.storageKey) private var appLanguageRawValue = AppLanguage.zhHans.rawValue

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .environment(\.locale, Locale(identifier: appLanguage.localeIdentifier))
                .environment(\.appLanguage, appLanguage)
                .preferredColorScheme(.light)
        }
    }

    private var appLanguage: AppLanguage {
        AppLanguage.stored(from: appLanguageRawValue)
    }
}
