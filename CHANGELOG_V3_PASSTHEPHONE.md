# BETWEEN — CHANGELOG ADDENDUM: Pass the Phone (V3 brief, Section 6)

Built as the next item after Export/Import (see other `CHANGELOG_V3_*.md` files for prior passes).

## What was built

A new "Play With Someone" section on the Modes screen with **Pass the Phone**, a same-device, two-player mode — reachable in one tap, no account, no setup beyond choosing which of two game types to play:

- **Same Answer** — Player 1 answers a real either/or question, the phone is physically handed over (with an explicit "Locked in. Pass the phone to Player 2 — don't peek." screen so Player 1's answer stays hidden), then Player 2 answers the same question. The reveal shows both answers side by side and says plainly "You agreed!" or "You disagreed." — never anything psychological, just the fact.
- **Predict Me** — same flow, but Player 2 is asked to guess what Player 1 picked rather than answer independently. Reveal shows "Correct guess!" or "Not quite."
- A 5-round match ends on a results screen with a final tally ("4/5 agreements") and one light, non-judgmental flavor line.

## Scope decisions (per the brief's own "do not overcomplicate it")

The original brief listed four sub-modes: Same Answer, Predict Me, Debate, and Chaos. Only the first two were built, deliberately:
- **Debate** is mechanically identical to Same Answer (both players answer without seeing the other's answer, then compare) — the brief's own description doesn't describe a different mechanic, just different framing. Building it as a literal second copy of Same Answer would have added a menu option without adding a game.
- **Chaos** ("short randomized challenges") doesn't reuse any existing content — it would need its own newly-designed question type, which is a content task, not a code task. Listed honestly below as not built rather than faked with a thin reuse of existing questions that wouldn't match the "chaos" framing.

Questions are drawn from the existing Pick One, Scenario, and Majority pools (anything with two or more real options) — no new content was required to make this playable immediately with real, already-quality-checked questions.

## An honest, deliberate limitation

A match is **not saved anywhere** — not to localStorage, not exported, nothing. This was a deliberate choice, not an oversight: the two people playing together aren't individually identified by BETWEEN (matching the brief's explicit "no personal data" requirement), so there's no honest owner for a saved match record to belong to. A page refresh mid-match loses that match; starting over takes about five seconds. This keeps the feature simple and avoids inventing a fake sense of "whose data is this" that the rest of the app is careful never to fake elsewhere.

## Verified

- Both game modes played to full completion (5 rounds each) with zero console errors, confirmed correct scoring for both a full-agreement match and a case with a genuine wrong guess in Predict Me.
- The hand-off screen correctly appears between every single player-1-then-player-2 turn, every round.
- Exiting mid-match via the in-app back button correctly discards the match and returns to Modes; starting a new match afterward begins cleanly with no leftover state from the abandoned one.
- The browser/hardware back button was also tested mid-match: it correctly steps back to the mode-selection screen (a sensible "one step back," since that's genuinely where the person came from) rather than either getting stuck or jumping two screens at once.
- Full 8-mode regression of the rest of the app run afterward to confirm nothing else broke — all clean, including on a completely fresh copy of the project folder.
