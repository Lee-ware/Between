# BETWEEN — CHANGELOG ADDENDUM: Real Majority Crowd Data (V3 brief, Section 11)

Built as the next item after Pass the Phone. This is the one feature in this whole project that needs a piece of real infrastructure (a small server function) rather than being purely client-side — so this file also explains exactly what still needs to happen outside this chat before it's actually live.

## What was built

- A small serverless function (`netlify/functions/majority.js`) that stores nothing but anonymous per-option vote counts, keyed by question ID. No accounts, no names, no IP addresses, no device identifiers are stored.
- It only accepts the 30 real Majority-mode question IDs that exist in BETWEEN's own dataset — an explicit allowlist, hardcoded in the function — so it can't be used to store arbitrary junk data under arbitrary keys.
- Majority mode's reveal card now tries to fetch a real result after you predict. It never blocks you from continuing (the Next button is available immediately either way), and it now correctly reports one of three honestly-different situations rather than one vague message:
  - **Not deployed / unreachable** → "Crowd data unavailable right now — your prediction was still saved to your stats." (this is what you'll see right now, since the function isn't live yet)
  - **Live, but not enough answers yet** (fewer than 20) → "Only N people have answered this one so far — not enough yet for a real percentage."
  - **Live, with enough data** → a real percentage, with an explicit "small sample so far" caveat below 100 responses and no caveat above that, plus whether your own prediction matched the majority.

## A real bug found and fixed while building this

Testing this exposed something that would have been a quiet, hard-to-notice bug in production: BETWEEN's service worker was caching **every** same-origin GET request, including what would have been calls to the new crowd-data endpoint. That means the very first time a phone fetched a question's crowd result, it would have been stuck showing that exact same percentage forever afterward on that device, no matter how the real vote counts changed over time — silently defeating the entire point of the feature. Fixed by explicitly excluding `/.netlify/functions/` calls from the service worker's caching logic, so crowd data is always fetched fresh. This was caught specifically because I went looking for it while testing the timeout/fallback behavior, not because it announced itself.

## What I could test myself, and how

Since I can't deploy or reach a real live server from where I do my work, I verified everything that doesn't require one:
- With no server present at all (the real current state of your project): confirmed the fallback message appears, resolves quickly, and never blocks the UI.
- A deliberately hung/non-responding server: confirmed the timeout kicks in at ~2.5 seconds and falls back honestly rather than leaving the screen stuck.
- All three data tiers (insufficient / small-sample / confident), using simulated server responses: confirmed each renders the correct, distinct message.
- The "did my prediction match the majority" logic specifically, using a simulated response shaped around the real question being tested: confirmed correctly.
- The one-vote-per-device guard: answering the same question twice from the same browser only ever sends one vote to the server.
- A full 8-mode regression, including a complete 10-round session that could contain Majority items, to confirm nothing else broke and nothing ever hangs.

## What I genuinely could NOT test, and why

Whether the actual deployed function on your actual Netlify site correctly stores and returns real counts. That requires a real deployment and a real URL — which is exactly why this changelog also comes with deployment steps below. Once you've deployed it and shared the live URL, I can make real requests to it from here and confirm it for real, rather than asking you to just trust that the code is right.

## What you need to do next (this is the part I can't do for you)

**Important: this feature needs your site to build from a code repository, not a plain drag-and-drop upload.** Netlify's drag-and-drop deploy only uploads static files as-is — it doesn't install the small helper package this function needs, or detect the function at all. This means switching how BETWEEN gets deployed. The good news: this only needs to be done once, and it also means every future update becomes easier (upload new files to one place, Netlify redeploys automatically) rather than repeating a manual drag-and-drop each time.

Step by step:

1. **Create a free GitHub account** at github.com, if you don't already have one.
2. **Create a new repository** (the green "New" button) — call it `between`, keep it Public or Private, either is fine.
3. **Upload the project files** using GitHub's own web page — no software to install, no commands to type. On the repository's page, use "Add file → Upload files," then drag in everything from the unzipped `between` folder (all of it — the `js`, `css`, `icons`, `netlify` folders, and the files like `index.html`, `netlify.toml`, `package.json`). Commit the upload.
4. **Connect that repository to Netlify.** In your Netlify dashboard, choose to add a new site "from Git," pick GitHub, authorize it, and select the `between` repository. Netlify will detect `netlify.toml` automatically — you shouldn't need to type any build settings in by hand.
5. Netlify will build and deploy automatically. This step is where it installs the small `@netlify/blobs` package and picks up the function — this is the part that a plain drag-and-drop upload skips entirely.
6. Once it finishes (usually under a minute), **send me the site's live URL** (the `https://something.netlify.app` address, or your own domain if you've set one up). I'll then make real requests to `[your-url]/.netlify/functions/majority?id=between_0168` from my end and confirm the whole thing actually works — not just that it should.

If at any point you'd rather keep using your current drag-and-drop setup and skip real crowd data for now, that's completely fine too — the app already works perfectly without it, exactly as designed.
