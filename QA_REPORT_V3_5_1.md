# BETWEEN V3.5.1 — Patch QA

This patch was made from `BETWEEN-v3.5-crowddata.zip` without redesigning the product architecture.

## Changes checked
- Replaced the PWA icon family with the BETWEEN ring/character brand mark and added the same mark to Profile and the startup shell.
- Removed the remote Google Fonts dependency so the app shell has no third-party font request.
- Kept normal navigation instant; the brand animation is limited to startup and a deliberately extremely rare one-time easter egg.
- Fixed nested-screen back buttons to use browser history instead of creating new history entries.
- Fixed Pass the Phone history behavior so leaving a match returns through the existing stack instead of adding duplicate navigation states.
- Fixed Time Capsule eligibility so free-text Prediction experiences cannot create a capsule that later expects `item.options`.
- Raised retained active-day history from 60 to 365 days.
- Hardened backup import with size limits, normalization, caps, and mode/stat sanitization.
- Made storage setters enforce their own history/Moments/Time Capsule caps.
- Tightened Majority validation to accept only known question IDs and their real options.
- Changed Majority writes to optimistic conditional writes so simultaneous votes are retried instead of silently overwriting each other.
- Pinned `@netlify/blobs` to 11.1.0 rather than floating on `latest`.
- Added security headers through `netlify.toml`.

## Static checks
- All JavaScript files pass `node --check`.
- Dataset remains 360 items with the existing 8-mode structure.
- All manifest icon files exist and match their declared dimensions.
- Service-worker precache references were checked against files in the project.

## Still requires real-device/live testing
- Install/update behavior on an actual Android/iOS device.
- Safari/Firefox behavior.
- Actual Netlify Function + Blobs deployment and concurrent live vote behavior.
- Real offline relaunch after a fresh install.
