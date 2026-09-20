# BETWEEN — CHANGELOG ADDENDUM: Time Capsule (V3 brief, Section 7)

Built as the next item after Moments (see `CHANGELOG_V3_MOMENTS.md` and `CHANGELOG_V3_PHASE1.md` for prior passes).

## What was built

- The same bookmark icon used for Moments now opens a small options sheet: "Save to Your Moments" plus, when the question genuinely has a comparable stance, three Time Capsule options — revisit in 30 days, in 1 year, or whenever.
- **Only offered for Pick One, Scenario, Majority, and Prediction** — modes with a real personal stance worth revisiting. Knowledge (factual), Estimation (a numeric guess), Brain (a skill test), and open-ended Random missions don't have a "would you choose the same thing again" shape, so the option correctly doesn't appear for them. Verified directly: the sheet shows Time Capsule buttons for Pick One, and does not for Knowledge.
- A new **Time Capsule** screen (off Profile) with three honest sections: **Ready to revisit**, **Waiting** (with a real days-remaining countdown), and **Completed**.
- Reopening a ready capsule shows you the exact same question and options again, lets you answer fresh, then honestly compares your old and new answer — "Same choice" or "You changed your mind," with no other spin on it.
- If the underlying question is ever removed from the dataset in some future update, opening that capsule shows a clear "this question isn't available anymore" message instead of crashing or guessing — tested directly by pointing a capsule at a fake ID.
- Fully covered by the existing privacy/reset system, same as Moments — tested directly.

## What was verified (not just written)

- Correct filtering: Time Capsule options only appear for eligible modes.
- A "whenever" capsule is immediately revisitable; a "30 days" capsule correctly shows as **Waiting** with an accurate day count, and correctly moves to **Ready** once the target date passes (verified by directly advancing its stored timestamp, the standard way to test time-based logic without literally waiting a month).
- Both outcomes tested: choosing the same answer again produces "Same choice"; choosing the other one produces "You changed your mind."
- Deleting a capsule, resetting all local progress (wipes capsules along with everything else), and a full 8-mode regression afterward — all confirmed working with zero console errors, including on a completely fresh copy of the project folder.

## Honest limitation

There's no way for BETWEEN to *notify* you when a waiting capsule becomes ready (that's the separate, not-yet-built optional-notifications feature from Section 24 of the original brief). Right now, a capsule becomes visible as "Ready" the next time you happen to open the Time Capsule screen after its date has passed — it won't proactively remind you. Worth pairing with notifications later if that matters to you.
