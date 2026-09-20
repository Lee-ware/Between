# BETWEEN 4.0.0 — Final Major Upgrade

This release extends the 3.5.1 baseline without replacing the plain HTML/CSS/JS architecture.

## Added
- Capability detection layer.
- Adaptive difficulty for measurable modes only.
- Home `For you` selection based on local play history.
- Local content reporting with export/import support.
- Question Lab for private custom packs.
- Pack export and share links.
- Account-free Between Duel links.
- Canvas-generated share cards with native-share/download fallback.
- Version separation for app/content/storage/cache.
- Development diagnostics surface.
- Subtle `Developed by THEE LPM` credit on Home and About.
- Optional real Majority Netlify Function using atomic Netlify Blobs compare-and-swap writes with retries.

## Preserved
- Existing eight modes, Mystery, Daily, Profile, Tendencies, Moments, Time Capsule, Pass the Phone, local-first storage, PWA/offline behavior, honest degradation and current visual identity.

## Important
The crowd function is optional. The app remains usable if the function or storage service is unavailable.

## Pre-deployment audit fixes
- Added `js/crowd.js` to the service-worker precache so the optional Majority client is available offline with the rest of the application shell.
- Fixed backup import sanitization for Reports and Question Lab packs; imported pack/report data is now normalized before storage.
- Pack links now surface a small confirmation after a shared pack is imported instead of silently dropping the user on the app.

## Deliberate scope note
The storage layer remains synchronous localStorage in 4.0.0. Versioning, migrations, corruption recovery, export/import, and bounded archives are implemented; a full IndexedDB migration is intentionally not included in this release because it would require an asynchronous storage API refactor across the existing application and would increase regression risk. The capability layer can detect IndexedDB for a future storage backend.
