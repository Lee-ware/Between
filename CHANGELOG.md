# BETWEEN — CHANGELOG (V1 → V2)

This is an upgrade of the existing V1, not a rebuild. The architecture (engine / modes / screens / storage / scoring separation) is preserved; this document lists what actually changed and why.

## Content model (biggest structural change)

- **Migrated from runtime prompt-parsing to explicit structured data.** Every Pick One, Majority, Prediction, and Random item now carries a real `options` array (and Prediction/Random carry a `prediction_shape` / `random_shape` field: `binary`, `list`, `yesno`, `freetext`, or `open`). The old regex-based parser (`Utils.parseBinary` etc.) is kept only as a defensive fallback for malformed data — it is no longer load-bearing.
- **Found and fixed a real data bug**: ~50 items in the source dataset already had native `options` arrays, but with a formatting defect — a dangling comma on the first option and no capitalization on the second (e.g. `["R5 million now,", "a guaranteed R100 000 every month for life"]`). All options are now cleaned (`R5 million now` / `A guaranteed R100 000 every month for life`).
- **Knowledge mode rebuilt from a self-report flashcard into a real 4-option multiple-choice quiz.** The source data only ever had a bare correct answer, no distractors, so distractors are generated with two strategies, both using only real answers already present in the dataset (nothing invented):
  - Numeric answers get plausible nearby numbers — small counts get small offsets, years get nearby years (not wild outliers), other numbers get percentage-scaled distractors.
  - Text answers get distractors sampled from other real answers in the same category, filtered so numeric and text answers are never mixed as distractors for each other.
  - Every one of the 104 generated MCQ sets was spot-checked by hand; several early passes were rejected and regenerated (see "Rejected approaches" below).
- **Hand-resolved all 38 legacy Prediction/Random items** that a generic "split on the word 'or'" parser mangled (e.g. *"Will AI become more trusted or more scrutinised?"* was splitting into `["Will AI become more trusted", "more scrutinised"]`). Each was read individually and given a correct, clean option set or routed to a new **freetext** input for items that are genuinely open-ended (e.g. *"Describe your personality using exactly three words"*).
- **Zero structural issues** across all 360 items after migration: no duplicate IDs, no duplicate prompts, no missing required fields, no option-count mismatches, no answer/answer_index mismatches. Verified with an automated validator (also runs at app boot — see `window.BETWEEN_QA_REPORT`).
- Added lightweight `mood` and `difficulty` fields (heuristic, inferred from category/hook_score — not hand-authored) to support the anti-repeat mood-balancing improvement below.

### Rejected approaches (kept here so the reasoning isn't lost)
- An automated keyword-based "tendency axis" tagger was built first, tagging pick_one/scenario items as freedom-vs-security, money-vs-time, etc. by inferring the "opposite pole" whenever only one side matched a keyword. Manual review showed this produced wrong or misleading tags on genuinely non-axis-shaped questions (e.g. "Be rich and unknown" vs "Famous and financially comfortable" got auto-tagged as a money-vs-time trade-off, which it isn't). This was discarded in favor of a smaller, hand-verified set — see Personalization below.

## Personalization / Tendencies (new, section 7 of the brief)

- New `js/tendency.js` module tracks which "pole" of a small set of trade-off axes (freedom/security, money/time, risk/possibility, certainty/possibility, individual/group, logic/emotion, short-term/long-term, curiosity/comfort) a person leans toward, based **only** on 17 hand-verified, explicitly axis-tagged Pick One items (not a blanket automated pass — see above).
- Never claims anything clinical or diagnostic. Only ever surfaces a single hedged sentence once there's enough signal (minimum 4 answers on an axis, and only when one pole leads by 60%+): *"You've leaned toward money over time lately."*
- Fully local, fully optional — a **Personalization** toggle was added to Settings (default on). Turning it off stops recording and hides all tendency text immediately (verified).
- Shown on Profile (as a clearly labeled "BETA" section, with a disclaimer line) and, once available, as the Home screen's rotating insight banner.

## Navigation / back-stack (section 12)

- **This was genuinely broken in V1** — the in-app back button from *any* experience always returned to Home, regardless of whether the person had entered via Home, Modes, or Daily.
- Rebuilt on the real browser History API (`pushState`/`popstate`). Verified with automated tests:
  - Modes → Pick One → back → **Modes** (not Home)
  - Home → Surprise Me → back → **Home**
  - Daily → Daily Pick → back → **Daily**
  - Modes → Knowledge → **hardware/browser back button** → **Modes**
- Answering multiple questions within one round no longer stacks a history entry per question — one "experience" history entry covers the whole round, so back always exits in a single press regardless of how many questions were answered.

## Error handling (section 25/47)

- Added an app-level error boundary (`App.safeRender`) around every screen render. A bug in one mode can no longer produce a blank white screen — it now shows a calm "Something went sideways. Your progress is safe." card with a retry button.
- Corrupted `localStorage` (tested by writing invalid JSON directly into the stats key) now recovers to sane defaults instead of crashing — verified.
- Rapid/repeated clicking on an already-answered option is now inert (verified: 5 rapid clicks on the same Pick One option produces exactly 1 recorded answer, not 5).
- Engine now defensively filters out any content item missing a required field before indexing, logging a console warning rather than crashing on malformed data.

## PWA / caching (section 19)

- Cache version bumped and the service worker now notifies the app when a new version has taken control (`controllerchange` → toast: *"Updated — refresh for the latest version."*), so stale cached JS doesn't linger silently after a deploy. `tendency.js` added to the precache manifest.

## Scoring / wording (section 27 — exact spec compliance)

- Pick One reveal now says **"Locked in."** (was: "You chose: X")
- Scenario reveal now says **"Choice locked."**
- Prediction reveal now says **"Prediction locked."**
- Majority reveal now says **"Locked in."** alongside the existing honest no-benchmark disclosure (unchanged from V1 — this was already correct).
- Knowledge now shows real **Correct / Not quite** states with the correct option highlighted green and the chosen wrong option highlighted red (previously: self-reported flashcard).
- Estimation now shows a numeric score (0–100) alongside the % error, framed as a distance score, never as pass/fail.

## Mode identity (section 17)

- Mode taglines updated to match the brief's suggested phrasing exactly: "What would you choose?", "What do you actually know?", "What would you do?", "Can you predict it?", "What do you think everyone else chose?", "Can you keep up?", "You don't know what's next."

## Anti-repeat engine (section 14)

- Added **mood balancing**: if the last few experiences shared the same mood tag (e.g. several "serious" ones in a row), the selector now nudges toward a different mood, so a session doesn't stay emotionally flat even within a finite dataset.
- Added a defensive cap on `seenIds` growth (was already bounded in practice by the 360-item dataset, but now explicitly capped).

## Bug fixed: oversized icons

- Icon SVGs shipped without explicit `width`/`height` attributes, which is fine in most flex contexts but caused the sparkle icon in the Home/Profile insight banner to render at ~157×157px instead of ~18px the first time that banner actually appeared with content (it was never visually exercised in prior QA because it only shows up once a person has answer history). Fixed globally by giving every icon a default `1em` size plus explicit CSS sizing at each call site.

## What did NOT change

- Local-first architecture, no backend, no accounts — unchanged.
- The Surprise Me vs. explicit-mode distinction (mixed modes only via Surprise Me; an explicitly chosen mode stays single-mode) was **already correct in V1** and is unchanged — verified again in this pass.
- Streak/day-streak calendar logic and knowledge-only accuracy calculation were **already correct in V1** (accuracy already excluded Majority/Pick One from the objective-accuracy figure) — relabeled the stat as "Knowledge acc." on Profile for clarity, no logic change.
- Brain mode's three minigames (sequence recall, odd-tile-out attention, reaction speed) — unchanged, already working.
