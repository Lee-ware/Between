# BETWEEN 4.0.0 — Final Upgrade QA

## Verified in the build environment
- JavaScript syntax checks passed for all application modules and `netlify/functions/majority.mjs`.
- 360 content items present.
- 0 duplicate IDs.
- 0 duplicate prompts.
- Mode counts match the baseline: Pick One 119, Knowledge 104, Scenario 35, Majority 30, Estimation 27, Prediction 23, Random 15, Brain 7.
- All Brain items declare a supported `game_type`.
- Majority server allowlist exactly matches the 30 shipped Majority questions/options.
- New modules are included in the service-worker precache list.
- No external font/network URLs, `eval()`, or `new Function()` references found in the application source.

## Browser test limitation
A headless Chromium smoke test was attempted against a local HTTP server, but the provided container's Chromium process did not terminate cleanly and timed out. No claim of a full browser/device regression pass is made from that attempt.

## Still requires a real-device/manual pass
- Android Chrome PWA installation/update.
- iOS Safari/PWA behavior.
- Screen-reader audit.
- Real offline/online transitions.
- Real Netlify Function + Blobs verification after deployment.
- Web Share / notification / vibration behavior on physical hardware.

## Important
The optional Majority function is designed to fail closed: if it is unavailable, the local app continues to work and does not fabricate crowd results.

## Additional pre-deployment audit (post-package review)

### Fixed before release
- Service worker now precaches `js/crowd.js`.
- Backup import now has explicit sanitization for report and custom-pack arrays; previously those paths referenced missing cleaners.
- Pack-link imports now surface a confirmation in Question Lab.

### Deliberate limitation
4.0.0 retains synchronous localStorage rather than switching the application to IndexedDB. The project has storage versioning, migrations, bounded archives, corruption recovery, and export/import, but a full IndexedDB migration would require converting the synchronous Storage API and its many callers to an asynchronous contract. That migration is deferred rather than represented as complete.

### Not claimed as fully verified in this environment
- Physical Android/iOS device behavior.
- Safari/Firefox accessibility behavior.
- Production Netlify Function + Blobs live write/read.
- Real offline transitions on physical devices.
- Full screen-reader audit.
- Browser automation smoke test (the local Chromium process became unresponsive during the attempted run).
