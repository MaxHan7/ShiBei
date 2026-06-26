# Shibei V2 Production Final Acceptance

## Backend Deployment

- Production backend URL: `https://shibei-production.up.railway.app`
- Deploy workflow: [`28240104517`](https://github.com/MaxHan7/ShiBei/actions/runs/28240104517)
- Deploy workflow commit: `5da32961b617dead58f3eeef7e2f67e65d0cfcdc`
- Deploy result: `passed`
- Smoke gate workflow: [`28240428843`](https://github.com/MaxHan7/ShiBei/actions/runs/28240428843)
- Smoke gate workflow commit: `b62856e934feccd442b0e278755d00ed7b7e1e59`
- Smoke result: `passed`
- Smoke detail: `controlled_v2_queue_smoke_passed`
- Gate failed checks: `[]`
- Production APNs: `configured=true`, `environment=production`, `bundleId=com.maxhan.shibei`
- Old test data strategy: exported first, then reset production app-owned tables.
- Backup reference: `V2 Production DB Export run 28239435478 / 20260626-125635-shibei-production-old-test-data.dump / sha256 20b886fb10bb14d83c84c39a01aca22c17b0e9f86c6500986dc49dfcfb94098c`

## iOS Production Wiring

- Status: `passed for production URL and mock safety; V2 release entry pending phone E2E`
- Guard command: `npm run check`
- Guard result: `passed`
- Production URL source: `拾贝/拾贝/Services/APIClient.swift`
- Release API default: `https://shibei-production.up.railway.app`
- Debug API default: `http://127.0.0.1:5173`
- Debug production-phone test override: use `-ShibeiV2APIBaseURL https://shibei-production.up.railway.app`
- Debug API override scope: `DEBUG` only.
- V2 fixture/mock toggle: disabled in Release by `allowsMockDataToggle = false`.
- Settings data source selector: `DEBUG` only.
- Mock scenario selector: `DEBUG` only.
- Bundle id: `com.maxhan.shibei`
- APNs release environment: `production`
- Release entry state: currently `RootView` in Release; V2 release entry should be flipped only after phone E2E passes.

## Phone Install

- Status: `pending`

## Phone E2E

- Status: `pending`

## Final Decision

- Decision: `pending`
