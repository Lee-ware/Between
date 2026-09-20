# BETWEEN — CHANGELOG ADDENDUM: Moments (V3 brief, Section 9)

Built as the next single item after Phase 1 (see `CHANGELOG_V3_PHASE1.md` for that pass and the full backlog).

## What was built

- A small, unobtrusive bookmark icon appears at the top-right of every experience screen, grayed out and disabled until you actually answer. Once you answer, it lights up — tap it to save that question, your answer, and the date to a personal, local-only archive.
- **Your Moments**, a new screen reachable from Profile, lists everything you've saved, newest first, with a delete option (with confirmation) on each one.
- Works identically across all 8 modes — verified by saving a Moment from every single mode in one pass and confirming sensible content got stored for each (your actual choice for Pick One/Scenario/Majority/Prediction, the result for Knowledge/Brain/Estimation, "Noted." for open Random missions).
- Fully covered by the existing privacy/reset system: Moments live in the same local-only storage as everything else, and "Reset local progress" in Settings correctly wipes them too — tested directly.
- Bounded growth: capped at 300 saved Moments (oldest drop off first) so this can't grow local storage without limit.

## What this deliberately is not (per the brief's own instruction)

Not a feed. No likes, no comments, no visibility to anyone else, no ranking. It's a private archive — closer to a bookmarks folder than a social timeline. Sharing an individual Moment as an image is a separate, not-yet-built feature (see Section 10 of the original brief, "shareable result cards" — still in the backlog).

## Verified

- Save button correctly starts disabled, becomes enabled only after an answer, becomes permanently disabled (with a filled-bookmark icon) once saved.
- Tested end-to-end: save → appears in Your Moments with correct content → delete → confirmation modal → correctly removed → empty state shown correctly.
- Full 8-mode regression run afterward confirmed nothing else broke.
- Tested on a completely fresh copy of the project folder (not just the working copy), zero console errors.
