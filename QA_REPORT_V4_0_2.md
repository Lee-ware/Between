# BETWEEN v4.0.2 — QA Report

## Critical issue fixed

**Symptom:** The app could remain indefinitely on the BETWEEN boot logo.

**Root cause:** `js/app.js` called `pushHistory({ screen: initialScreen }, true)` and `renderTabScreen(initialScreen, true)` without defining `initialScreen`. The resulting `ReferenceError` interrupted startup before the boot screen was dismissed.

**Fix:** `getInitialScreen()` now safely resolves the current hash against the allowed top-level screens and defaults to `home`. App initialization is wrapped in a top-level recovery path, and an independent boot guard prevents permanent logo lock if a dependency fails before `App.init()` can finish.

## Automated verification

| Check | Result |
|---|---|
| Every JS/MJS file syntax check | PASS |
| Complete dependency load in Node VM | PASS |
| `App.init()` startup harness | PASS |
| Boot guard marks successful startup complete | PASS |
| Content items audited | 360 |
| Duplicate IDs | 0 |
| Duplicate prompts | 0 |
| Missing required fields | 0 |
| Structural mode issues | 0 |
| Service-worker cache includes boot guard | PASS |
| App/cache version separation | PASS |

## Not claimed

- Physical Android device test
- Physical iPhone/Safari test
- Production Netlify deployment test
- Real-world PWA installation test
- Real device audio test
- Full screen-reader audit

Browser automation was attempted in the current execution environment but Chromium navigation was blocked by the environment (`ERR_BLOCKED_BY_ADMINISTRATOR`).
