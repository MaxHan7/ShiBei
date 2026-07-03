# App Store Privacy Labels Audit Evidence - 2026-07-03

Scope: App Store Connect App Privacy label preparation.

## Created

- `docs/app-store-privacy-labels.json`
- `docs/app-store-privacy-labels-zh.md`
- `tools/app-store-privacy-labels-audit.mjs`
- npm scripts:
  - `npm run app-store:privacy-labels-audit`
  - `npm run check:app-store-privacy-labels`
- `tools/app-store-create-connect-copy-pack.mjs` now embeds the privacy labels guide into the App Store Connect copy pack and blocks final packs if the privacy-label audit is not ready.

## Covered

- Tracking is explicitly false.
- Declared data types:
  - User Content
  - Identifiers
  - Usage Data
  - Diagnostics
- Not-collected data types:
  - Location
  - Contacts
  - Photos or Videos
  - Audio Data
  - Health and Fitness
  - Financial Info
  - Advertising Data
- Consistency checks against:
  - `docs/privacy-policy-zh.md`
  - `docs/privacy-policy.html`
  - `docs/app-store-review-submission-pack-zh.md`
  - `docs/app-store-metadata-zh.md`

## Still User-Owned

- The user must manually fill App Store Connect > App Privacy using the guide.
- The user should send a screenshot or confirmation after filling the App Privacy page.
- If Sign in with Apple, payments, advertising, or third-party analytics are added later, rerun this audit and update App Store Connect before release.
