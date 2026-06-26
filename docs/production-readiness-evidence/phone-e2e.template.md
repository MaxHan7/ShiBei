# V2 Phone E2E Evidence Template

Copy this file to `phone-e2e.md` after the production backend deploy, then fill it with the actual phone/TestFlight evidence. Do not record secrets, private source text, model keys, database URLs, APNS private keys, or personal user content.

## Run Info

- Date/time:
- Tester:
- Device:
- iOS version:
- App build:
- Backend base URL:
- Backend deployment id:
- Database backup reference:
- Signed app artifact checked with `check:ios-signing`: yes/no

## Required Markers

Keep the marker phrases below in the completed evidence file. The final release evidence guard checks these markers so the Release flip cannot proceed with a missing phone path.

### create chapter

- Input type: link/text
- Result:
- Evidence note or screenshot reference:

### progress

- User-facing progress states observed:
- Result:
- Evidence note or screenshot reference:

### review

- Chapter detail opened after generation: yes/no
- Review started: yes/no
- At least one multiple-choice question answered: yes/no
- Matching question answered if generated: yes/no/not generated
- Result:

### source return

- Opened source from question: yes/no
- Returned to the same question state: yes/no
- Answered feedback state preserved if source was opened after answering: yes/no/not applicable
- Result:

### favorites

- Favorite toggled from a question: yes/no
- Favorite appears in notes/favorites list: yes/no
- Opening favorite question does not mutate review progress: yes/no
- Result:

### notifications

- Push permission state:
- Generation success/failure notification observed or notification diagnostic checked:
- Notification detail path opened if applicable:
- Result:

## Regression Notes

- Any visual/layout regressions:
- Any backend/API errors:
- Any retry/timeout behavior:
- Decision: pass/fail
