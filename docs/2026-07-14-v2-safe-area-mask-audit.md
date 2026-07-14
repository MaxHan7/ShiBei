# V2 Safe Area and Mask Audit

Date: 2026-07-14
Workspace: `/Users/hanmingyu/Downloads/拾贝/拾贝-lean-generation-20260711`

## Scope

This audit focuses on abnormal bottom overlays, clipping, and keyboard-related masking in V2 screens. It is separate from the earlier large-phone content width audit.

## Findings

### 1. Confirmed code-level root cause: tab scaffold keyboard avoidance

`V2TabScaffold` was shared by Materials, Upload, Discover, and Notes. It used:

- a custom bottom navigation bar inside `safeAreaInset(edge: .bottom)`
- a full-width `pageGreenBackground` behind that inset
- `.ignoresSafeArea(.keyboard, edges: .bottom)`

That combination means tab content did not participate in the system keyboard safe-area adjustment. When the Upload text field focused, the custom bottom inset could continue occupying the bottom layout region and visually behave like an incorrectly sized mask.

Fix applied:

- Removed keyboard safe-area ignoring from the tab scaffold.
- Hid the custom bottom navigation while the keyboard is visible.
- Reduced tab scroll bottom padding while the keyboard is visible so content is not padded for a hidden nav bar.

Affected file:

- `拾贝/拾贝/V2/Screens/Tabs/V2TabScreens.swift`

### 2. Confirmed same-class risk: flow screens globally ignored keyboard

`V2FlowScreen` and `V2ScrollableFlowScreen` also ignored keyboard safe area globally. Most review screens do not use text input, but Profile name editing can trigger the keyboard inside a flow screen.

Fix applied:

- Removed global `.ignoresSafeArea(.keyboard, edges: .bottom)` from both shared flow containers.

Affected file:

- `拾贝/拾贝/V2/Components/V2FlowComponents.swift`

### 3. Intentional visual masks that still need design review

`V2BottomActionBar` uses a bottom gradient background to keep bottom action buttons readable. This is intentional, but it can visually resemble a mask if spacing is tight.

Current decision:

- Keep the gradient for now.
- Do not change it until we identify a concrete page where it hides meaningful content.

### 4. Intentional clipping in Home learning path

`V2HomeView` clips the learning path viewport with `.clipped()` so nodes stay between the current-chapter banner and the bottom navigation. This is intentional, but bad viewport height math can make it look like content is being cut.

Current decision:

- The previous width fix aligned Home/Profile/Discover horizontal layout.
- No new Home clipping change was made in this audit.

## Verification

- Build and run on iPhone 17 Pro Max simulator succeeded.
- Upload page still renders normally after the change.
- Automated simulator did not display the software keyboard in screenshots, so keyboard-state visual verification still needs a manual simulator or physical-device check.

## Remaining Manual Checks

Before App Store submission or wide TestFlight:

1. On iPhone 17 Pro Max simulator or device, open Upload, tap the link input, and confirm the bottom navigation disappears while the keyboard is visible.
2. Confirm the input card and start button remain visible or naturally scrollable above the keyboard.
3. Open Profile, edit the nickname field, and confirm no bottom gradient or fixed chrome covers the field.
4. Open Chapter Detail and Review pages to confirm the bottom action gradient does not hide active content.
5. Recheck Home learning path on Pro Max and 16 Pro to confirm path clipping still looks intentional.
