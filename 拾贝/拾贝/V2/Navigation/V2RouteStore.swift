struct V2RouteStore: Equatable {
    private(set) var current: V2AppRoute?
    private(set) var stack: [V2AppRoute] = []

    var previous: V2AppRoute? {
        stack.last
    }

    mutating func push(_ route: V2AppRoute) {
        if let current {
            stack.append(current)
        }
        current = route
    }

    mutating func replace(with route: V2AppRoute) {
        current = route
    }

    mutating func reset(to route: V2AppRoute) {
        stack.removeAll()
        current = route
    }

    mutating func resetToRoot() {
        stack.removeAll()
        current = nil
    }

    mutating func clearStack() {
        stack.removeAll()
    }

    mutating func pop() {
        current = stack.popLast()
    }
}
