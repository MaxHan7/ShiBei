# Shibei V2 Baseline

This directory is an isolated V2 experiment copied from commit `ace671c`.
It is intentionally separate from the production iOS app and backend at the
repository root.

## Layout

```text
experiments/shibei-v2/
  ios/      Copied iOS project for local V2 exploration
  backend/  Copied Node backend for local V2 exploration
  demo/     Copied HTML demo and internal workbenches
  docs/     Notes for V2-only design work
```

## Isolation Rules

- Do not edit the production app under the repository root `拾贝/`.
- Do not edit the production backend under the repository root `backend/`.
- Do not point V2 at `https://shibei-production.up.railway.app`.
- Do not reuse the production Railway `DATABASE_URL`.
- Do not configure production APNS credentials for the V2 backend.

V2 uses:

- App display name: `拾贝 V2`
- App bundle id: `com.maxhan.shibei.v2.dev`
- Local backend port: `5273`
- Local backend URL: `http://127.0.0.1:5273`

## Run The V2 Backend

```bash
cd /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/backend
npm install
npm run dev
```

The backend listens on `0.0.0.0:5273` by default. Without `DATABASE_URL`, it
uses in-memory storage.

Health check:

```bash
curl http://127.0.0.1:5273/api/health
```

## Run The V2 iOS App

Open the copied project:

```bash
open /Users/hanmingyu/Downloads/拾贝-v2-baseline/experiments/shibei-v2/ios/拾贝.xcodeproj
```

For the simulator, the default API URL is:

```text
http://127.0.0.1:5273
```

For a real iPhone on the same Wi-Fi, add this launch argument in Xcode:

```text
-ShibeiV2APIBaseURL http://<Mac局域网IP>:5273
```

You can find the Mac Wi-Fi IP with:

```bash
ipconfig getifaddr en0
```

## Railway Later

Railway is intentionally out of scope for the baseline copy. When V2 needs a
cloud backend, create a separate Railway project or service with a separate
PostgreSQL database and V2-only variables.
