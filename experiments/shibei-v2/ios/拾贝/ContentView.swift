//
//  ContentView.swift
//  拾贝
//
//  Created by 韩明瑜 on 2026/5/16.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        V2RootView()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .previewDevice("iPhone 17")
            .previewDisplayName("V2 App - iPhone 17")
    }
}
