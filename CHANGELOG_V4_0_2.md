# BETWEEN v4.0.2

## Startup reliability fix

- Fixed a fatal startup regression where `initialScreen` was referenced before it was defined, leaving the boot logo visible indefinitely.
- Initial screen is now derived safely from the current URL hash and falls back to `home` for unknown/empty hashes.
- Added an independent `js/boot-guard.js` that has no dependency on the rest of the application.
- If application startup fails before `App.init()` completes, or hangs for 8 seconds, the boot guard replaces the logo with a recovery screen and a retry button instead of trapping the user.
- App startup now has a top-level `try/catch` and reports a recoverable startup failure.
- Successful startup explicitly marks the independent boot guard complete.
- Service-worker cache bumped to `between-v4.0.2` and the new boot guard is precached.

## Verification

- JavaScript syntax checked for every `.js`/`.mjs` source file.
- Startup harness loaded the complete application dependency chain and executed `App.init()` with a browser-like mock environment.
- Startup harness verified the 360-item content audit: 0 duplicate IDs, 0 duplicate prompts, 0 missing required fields, 0 structural mode issues.
- Browser automation was attempted in this environment, but Chromium navigation is blocked by the execution environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so no physical-browser pass is claimed here.
