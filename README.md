# BETWEEN — V4.0.0

A curiosity + choice + knowledge entertainment playground. Mobile-first, installable PWA, local-first (no accounts or personal tracking; optional anonymous Majority aggregate data).

**This is V4.0.0** — the stable 3.5.1 baseline expanded into a durable, local-first experience engine with adaptive difficulty, Question Lab, account-free Duel links, share cards, content reporting, capability detection, separated versioning, and an optional anonymous Majority crowd function. See `CHANGELOG_V4_FINAL.md` and the QA notes.

## What's inside

- **360 experiences** across 8 modes (Pick One, Knowledge, Scenario, Majority, Estimation, Prediction, Random, Brain), loaded from the canonical `BETWEEN_V1_EXPANDED_AUDITED_360.json` dataset (embedded as `js/data.js`).
- **Content engine** with anti-repeat, similarity-group cooldowns, category/mode cooldowns, weighted "Surprise Me" selection, and a curated first-session onboarding sequence.
- **Deterministic Daily set** (Pick / Knowledge / Crowd Prediction / Chaos) seeded from the local date — same for everyone on the same day, no server required.
- **Local-first persistence** via `localStorage` (versioned keys under `between:v1:*`) — stats, streaks, history, and settings never leave the device.
- **Honest crowd system** — Majority mode never fakes live percentages; it clearly states there's no benchmark yet in V1.
- **PWA**: installable, offline app-shell caching via a service worker, manifest + icon set included.
- **Accessibility**: semantic buttons, focus states, `prefers-reduced-motion` support, optional keyboard shortcuts (1–4 to answer, Enter to continue, Esc to go back).

## Project structure

```
index.html
manifest.webmanifest
service-worker.js
netlify.toml
css/style.css
js/
  data.js       ← the 360-item dataset, schema v2 (explicit options/answer_index/shapes)
  utils.js      ← formatting, icons, seeded RNG, legacy parser (fallback only)
  storage.js    ← local-first persistence layer (stats, progress, settings, tendency)
  scoring.js    ← estimation error model, streaks, stat aggregation
  tendency.js   ← lightweight local personalization/tendency tracking (beta)
  engine.js     ← selection algorithm, anti-repeat, daily seeding
  modes.js      ← per-mode question/answer/reveal UI
  screens.js    ← home, modes, daily, profile, settings, experience shell, error state
  app.js        ← router with real back-stack, session/round logic, PWA + keyboard wiring
icons/          ← PWA icon set (72–512px + maskable)
```

## Deploying to Netlify

**Option A — drag and drop (fastest):**
1. Unzip this folder.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the unzipped folder in. Netlify will host it immediately at a `*.netlify.app` URL.

**Option B — connect a Git repo:**
1. Push this folder to a new GitHub/GitLab repo.
2. In Netlify: **Add new site → Import an existing project**.
3. Build command: *(none needed)*. Publish directory: `.` (repo root).
4. Deploy. `netlify.toml` is already included and sets sensible cache headers for the manifest and service worker.

No build step, no npm install, no environment variables required — it's a static site.

## Testing it locally

Any static file server works, e.g.:

```
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed local URL on your phone (same Wi-Fi) or in a mobile-width browser window.

## What's intentionally not in V1

Per the product spec, these are reserved for later versions rather than faked:
- Accounts / sign-in
- Live multiplayer, Friend Rooms, real-time rounds
- Real aggregate crowd statistics (Majority mode is honest about this)
- Create Your Own content

## Notes on content parsing

Several modes (Pick One, Majority, some Prediction/Random items) store both options inside a single natural-language prompt (e.g. *"R10 million today, or R30 000 every month forever?"*) rather than a separate options array. `utils.js` includes a small parser (`Utils.parseBinary`, `Utils.parseList`, `Utils.isYesNoShaped`) that splits these into tappable option cards. This was verified against all 360 items during development.

Knowledge items only ship a correct answer (no distractor options), so Knowledge mode uses a "think it, then reveal, then self-report" flashcard-style flow rather than fabricated multiple-choice — this keeps the content honest to the source dataset.

Enjoy BETWEEN. 🎉
