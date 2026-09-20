# BETWEEN v4.0.3 — Release Hardening QA

## Concrete issues found and fixed

1. **Startup lock:** `initialScreen` was undefined during boot. Fixed with safe hash resolution and startup recovery.
2. **Boot dead-end:** added an independent boot guard and recovery UI so an early script error cannot leave the branded boot screen covering the app forever.
3. **Majority POST contract:** the client sent `{ id, option }`, while the function originally read the question ID only from the query string. POST now reads and validates the ID from the request body.
4. **Netlify function layout:** the Majority allowlist was a data module inside `netlify/functions/`, where Netlify discovers function files. It now lives under `netlify/lib/` and is imported by the actual function.
5. **Version metadata:** `package.json` now matches app version 4.0.3.

## Verification

- All JavaScript/MJS files pass `node --check`.
- 360 content items audited.
- 0 duplicate IDs.
- 0 duplicate prompts.
- 0 missing required fields.
- Mode schema checks pass.
- Manifest icon files all exist.
- HTML script/style/icon references resolve.
- Service-worker precache references resolve.
- No external font dependency.
- No `eval()` / `new Function()` usage.
- Majority allowlist matches the current 30 Majority questions.
- Netlify function syntax passes.

## Still requiring real-device/production verification

- Physical Android/iOS PWA installation.
- Real device audio/haptics.
- Production Netlify Function + Blobs read/write.
- Safari/Firefox compatibility.
- Full screen-reader audit.
