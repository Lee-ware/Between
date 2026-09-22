# BETWEEN — HOTFIX v4.0.4: "loads and doesn't open"

You were right that something was broken — this wasn't a deployment issue on your end, it was three real bugs in the code. Found and fixed all three by actually running the app and reading the real errors, not guessing.

## Bug 1 — the one that actually caused "loads and doesn't open"

**`Engine.forYou is not a function`.** The Home screen's new "For You" section called a function that was written correctly inside `engine.js`, but never added to the list of things the module actually makes available to the rest of the app. Classic "wrote it, forgot to export it" mistake. Every single visit to Home crashed immediately — which is exactly what you saw: the app loads, then shows nothing useful.

**Fix:** added `forYou` to the module's exports. One line. Verified the Home screen — and its actual personalized picks — now render correctly.

## Bug 2 — the deeper one, would have broken almost everything else too

**`adaptiveTarget is not defined`.** This one's more serious than Bug 1: this function is called every single time BETWEEN picks what question to show next — meaning Surprise Me, every explicit mode, Daily, all of it. It wasn't just unexported like Bug 1 — it was never actually written anywhere in the file at all. Even if Bug 1 hadn't existed, this alone would have made the entire app unplayable.

**Fix:** implemented it properly, matching what the surrounding code clearly intended (adaptive difficulty per the original spec — Knowledge and Brain get harder after a hot streak, easier after a cold one). Deliberately left Pick One, Scenario, Majority, Prediction, and Random out of this — they don't have a "correct" answer, so adapting difficulty on them would be inventing a performance signal that isn't real. Also left Estimation out, since its stats track a personal best distance, not a clean accuracy rate to adapt from.

## Bug 3 — Between Duel was completely broken

Found this by actually generating a duel link and having a second, separate browser open it (simulating your friend). It crashed with `g is not defined` the moment you finished answering. Root cause: a copy-paste typo in the code that turns your answers into a shareable link — one character too many (`\\/` instead of `\/`) accidentally told the browser to stop reading the pattern early, which left a stray `/g` sitting where JavaScript expected a real value, so it choked on `g` as if it were an undefined variable.

**Fix:** corrected the escaping. Tested for real this time — created an actual duel, generated the real link, opened that exact link in a second, independent browser (matching what a friend on their own phone would actually experience), answered it, and confirmed the comparison screen correctly showed "You agreed on 5/5."

## What else I tested, since this codebase had grown a lot

Rather than just fix the reported symptom and stop, I clicked through everything new since the last version I'd verified:
- All 8 core modes, individually
- A full 10-round Surprise Me session, through to the round summary and "Go again"
- Pass the Phone
- Between Duel — full round trip, two separate browser instances, confirmed working
- Question Lab (Packs) — created a custom pack, played it, shared it (gracefully degrades when no OS share sheet is available, as designed)
- Content reporting — submitted a real report, confirmed it saved locally with the right structured data

Everything above works. Only the three bugs listed here were found.

## One thing worth knowing, not a bug

Pick One mode now auto-advances about 120ms after you tap an answer — no "Next" button, the tap itself is the commitment. I noticed this because my usual test script (written for the *old* Pick One behavior) flagged it as "broken." It isn't — it's a deliberate, working design change, and a nice one. Just flagging it since it's a real behavior change from before, not something either of us explicitly discussed.
