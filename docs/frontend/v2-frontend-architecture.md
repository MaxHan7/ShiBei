# V2 Frontend Architecture Notes

## Current Cleanup Direction

V2 frontend should keep SwiftUI views focused on rendering and local interaction. App-level routing, backend orchestration, mock/demo content, and design-system tokens should live outside individual screens.

## Mock and Demo Content

Demo content must not be embedded directly inside production screen views.

Preferred flow:

1. Demo fixtures live in `拾贝/拾贝/V2/Fixtures`.
2. `V2RootView` or a future app composition layer injects demo data into screens.
3. Screens render injected display data and do not decide whether content is mock or real.

Current provider:

- `V2DemoContentProvider.recommendedArticleFilters`
- `V2DemoContentProvider.recommendedArticles`

This keeps `V2DiscoverView` reusable when recommended articles later come from a backend/admin content API.

## Next Boundaries

- Route stack and route mutation should move from `V2RootView` into a route store.
- Generation-specific UI state should move from many root-level `@State` values into a named state type.
- Typography and color usage should prefer `V2Typography` and `V2Color`; raw `Font.system` and `Color(hex:)` should be reserved for Figma-specific drawing constants.

