# BETWEEN V2 — QA REPORT

Everything below was actually executed against the built app (via headless Chromium + Playwright automation, not just read as code) as part of this upgrade. Where something was **not** tested, it's listed honestly in Known Limitations rather than implied.

## Content validation (automated, all 360 items)

Run both offline (Python, during migration) and at app boot (`window.BETWEEN_QA_REPORT`):

| Check | Result |
|---|---|
| Duplicate IDs | 0 |
| Duplicate prompts | 0 |
| Missing required fields (id/mode/category/prompt) | 0 |
| Pick One / Majority with ≠2 options | 0 |
| Knowledge with ≠4 options, duplicate options, or answer_index mismatch | 0 |
| Scenario with <3 options | 0 |
| Estimation missing target/unit | 0 |
| Prediction/Random items with an unresolved shape | 0 (all 38 legacy items hand-verified) |

## Per-mode functional test (all 8 modes, automated click-through)

For each of Pick One, Knowledge, Scenario, Majority, Estimation, Prediction, Random, and Brain: opened via Modes screen → question rendered → answered → reveal rendered → Next button present and functional. **Zero JavaScript console errors or exceptions** across all 8. Knowledge specifically verified to show correct-answer highlighting (green) and wrong-answer highlighting (red) with the real answer surfaced.

## Navigation / history

| Path | Back target | Result |
|---|---|---|
| Modes → Pick One → in-app back | Modes | ✅ Pass |
| Home → Surprise Me → in-app back | Home | ✅ Pass |
| Daily → Daily Pick → in-app back | Daily | ✅ Pass |
| Modes → Knowledge → **browser** back button | Modes | ✅ Pass |

This was a real fix, not a re-verification — V1's back button always returned to Home regardless of entry point.

## Session flow

- Full 10-question mystery (Surprise Me) round played end-to-end via automation → correctly landed on the round-summary screen with accuracy/streak/modes-played stats.
- Full Daily flow: all 4 daily items (Pick, Knowledge, Crowd Prediction, Chaos) completed → all 4 correctly marked done in local storage and reflected in the UI (dimmed + checkmark).

## Resilience / error handling

| Scenario | Result |
|---|---|
| Corrupted `localStorage` (invalid JSON written directly into the stats key) | Recovered to safe defaults, no crash, no blank screen |
| 5x rapid click on the same already-selected answer | Exactly 1 answer recorded (not 5) |
| Empty/malformed content item | Filtered out at boot with a console warning, doesn't crash the engine |

## Personalization (Tendency)

- Recorded 4 identical-axis answers directly → correct sentence generated ("You've leaned toward money over time lately.")
- Confirmed the Settings toggle actually gates recording: with personalization switched off, `Tendency.record()` is a verified no-op (tested by comparing tendency state before/after a disabled-state record call).
- Confirmed the Profile "Tendencies" section renders both the populated state and the "not enough data yet" empty state.

## Visual / layout

- Verified at mobile width (390px) and desktop width (1280px, centered card layout, no mobile card stretched full-width).
- **Bug found and fixed during this QA pass**: icon SVGs without explicit width/height rendered at ~157×157px in some flex contexts (Home/Profile insight banner) instead of their intended ~18px. Fixed and re-verified across Home, Modes, Profile, Settings.

## What was NOT tested (honest limitations)

- **True offline/airplane-mode PWA behavior** was not tested in this environment (the sandbox has no ability to install/launch a standalone PWA or fully sever network to a running instance). The service worker's cache-first strategy and precache manifest were reviewed and updated, and the update-notification flow (`controllerchange` → toast) was observed firing correctly during a live cache-version bump, but a full "turn off wifi, relaunch, confirm offline start" test was not performed.
- **Real device testing** (physical phone hardware, actual "Add to Home Screen" install flow, real haptics) was not performed — only headless Chromium at mobile viewport widths.
- **Screen reader testing** (VoiceOver/TalkBack) was not performed — only structural checks (semantic buttons vs. divs, focus-visible states, aria-labels on nav icons).
- **Content quality review was not line-by-line across all 360 items.** All 360 were validated *structurally* (see table above), and every one of the 38 hand-parsed legacy Prediction/Random items and a large sample of the 104 generated Knowledge MCQ sets were individually read and verified. The remaining bulk of Pick One (119), Scenario (35), and Majority (30) items — which already had clean, human-written prompts and native-or-cleanly-parsed options — were spot-checked in samples rather than exhaustively re-read word-for-word.
- **Personalization axis coverage is intentionally partial**: 17 of 154 eligible Pick One/Scenario items are tagged. This was a deliberate quality-over-coverage tradeoff (see CHANGELOG "Rejected approaches") rather than an oversight — expanding coverage safely would need either more manual tagging time or a more sophisticated (and re-verified) tagger.
- **Cross-browser testing** (Safari/Firefox specifically) was not performed — only Chromium.

## Final content count

**360 total experiences**, unchanged from V1 (none were deleted):
Pick One 119 · Knowledge 104 · Scenario 35 · Majority 30 · Estimation 27 · Prediction 23 · Random 15 · Brain 7.
