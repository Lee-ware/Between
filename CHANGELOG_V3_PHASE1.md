# BETWEEN — CHANGELOG (V2 → V3, Phase 1: Correctness)

The V3 brief ("Final Major Upgrade") is a 54-section, full-product roadmap — realistically a multi-month effort, not something to shallow-pass in one sitting. Rather than touch all 54 sections lightly, this pass completes **Phase 1 ("Correctness")** from the brief's own recommended implementation order (Section 52) fully and verifiably, because it fixes real, confirmed bugs rather than adding new surface area. Everything else in the brief is listed as a prioritized backlog at the bottom of this file — nothing is silently skipped.

## What was actually fixed

### 1. Brain mode content/game mismatch (Section 2.1 — the brief's #1 flagged issue)

This was real, and confirmed by audit before touching any code. The old system picked a minigame either from a loosely-related `subtype` string or, for two items with no subtype at all, from a hash of the item's ID — meaning what actually launched didn't reliably match what the question promised.

Audited all 7 Brain items against the game that actually launched:

| Item | Prompt promises | Old behavior | Fixed to |
|---|---|---|---|
| between_0233 | Memory sequence | ✅ Correct (sequence) | `memory_sequence` |
| between_0234 | "Remember **which** tiles were highlighted" (a *set*, order doesn't matter) | ❌ Launched the order-sensitive sequence game | `spatial` (new game, built this pass) |
| between_0235 | "Choose the **next item** in a visual pattern" | ❌ Launched the memory-sequence game — no pattern logic existed at all | `pattern` (new game, built this pass) |
| between_0236 | "**Count** a target symbol among distractors" | ❌ Launched an odd-one-out spotting game — no counting involved | `attention_count` (new game, built this pass) |
| between_0237 | "Answer a simple **calculation** before the timer expires" | ❌ Launched a pure reaction-time tap test — no math involved | `rapid_choice` (new game, built this pass) |
| between_0359 | Memory sequence | ⚠️ Unreliable (hash fallback could pick any of 3 games) | `memory_sequence` |
| between_0360 | Counting | ⚠️ Unreliable (hash fallback could pick any of 3 games) | `attention_count` |

**Fix:** Introduced an explicit `game_type` field on every Brain item (schema: `memory_sequence`, `spatial`, `pattern`, `attention_count`, `odd_tile`, `reaction`, `rapid_choice` — the exact list the brief specified). The renderer now does a direct lookup from `game_type` to game — no guessing, no hashing, no prose-interpretation. **Built 3 new minigames from scratch** to give `spatial`, `pattern`, and `attention_count` real, working implementations (previously they didn't exist at all). The two previously-existing games (`odd_tile` — spot the different tile, `reaction` — pure reflex tap) are preserved and fully working, just not currently assigned to any shipped content item; they're ready for future Brain questions without any further engineering.

**If an item's `game_type` is missing or unrecognized**, the app now shows an honest "This Brain game isn't available yet on this device" message with a Skip button — never a misleading guess. Verified by testing a deliberately fake game type.

**Verified:** all 7 items tested individually, confirmed each launches the exact mechanic it promises, zero console errors. The 2 unused-but-implemented types (`odd_tile`, `reaction`) were also directly tested and confirmed working. The boot-time content validator was extended to flag any Brain item with a missing or unsupported `game_type` automatically going forward, so this class of bug can't silently reappear.

### 2. "Best Mode" → "Most Played Mode" (Section 3)

The Profile screen was calling the most-frequently-played mode your "Best mode," which isn't a defensible performance claim (there's no "performance" in modes like Pick One or Scenario). Relabeled to "Most Played Mode" everywhere it appears — no logic changed, only the honest label.

### 3. Content validation extended

The automated boot-time audit (`window.BETWEEN_QA_REPORT`) now also checks that every Brain item has a valid, supported `game_type` — the exact class of bug this pass fixed is now caught automatically if it's ever reintroduced (e.g. by a future custom content pack).

### 4. Security spot-check (Section 32)

Audited every place user-typed text reaches the screen. There is currently exactly one (the free-text reflection input in Prediction/Random) — confirmed it was already passed through an HTML-escaping helper before being displayed. Confirmed no use of `eval`, `new Function`, or `document.write` anywhere in the codebase. (Note: this audit covers the *current* feature set only — Question Lab / custom packs / imported files, listed in the brief's Phase 2–3, do not exist yet and will need their own security pass when built, since user-authored content changes the risk surface meaningfully.)

### 5. Accessibility spot-check (Section 31)

Confirmed every icon-only button (back arrow, settings gear, bottom-nav icons) already carries a proper `aria-label`, and focus-visible outlines are already defined globally. This was mostly already solid from the V2 pass; no changes were needed beyond confirming it.

### 6. Storage schema versioning foundation (Section 21)

Added a real, working schema-version stamp (`SCHEMA_VERSION`) and a `runMigrations()` function that runs once at boot, checks a person's stored schema version against the current one, and would run any needed migration steps in order. Today's stored data shape **is** schema version 1, so there's nothing to migrate yet for existing V2 users — but the mechanism is real and tested (confirmed the version stamp gets written on first load), not just a comment promising it'll exist later. This is the foundation the brief asked for in Section 21; the fuller IndexedDB migration (for Moments/Time Capsule data, once those exist) is listed in the backlog below.

## What was NOT done this pass (honest backlog, brief's own section numbers)

This is everything else in the 54-section brief, organized by the brief's own phases so nothing is lost:

**Phase 2 — Personal ownership:** Moments (§9), Time Capsule (§7), full data export/import (§22), custom question packs / "Question Lab" (§14), pack import/export/links (§15).

**Phase 3 — Social without accounts:** Between Duels / challenge links (§5), Pass the Phone same-device multiplayer (§6), shareable result-card images (§10), pack links (§15).

**Phase 4 — Living BETWEEN:** real anonymous crowd data via a Netlify Function + storage (§11), "World vs You" comparison (§12), region-level "Local vs World" (§13), predictions that get revisited later (§8).

**Phase 5 — PWA depth:** a formal capability-detection layer (§34), optional opt-in notifications (§24), haptics beyond what already exists (§29), generated Web Audio sound effects (§30), deeper offline-mode coverage for features that don't exist yet.

**Phase 6 — Intelligence without dependency:** adaptive difficulty engine (§17), further anti-repeat signal expansion — skip/save/share/replay tracking (§18), the "For You" personalized Home section (§4D), "I don't want this" / content reporting (§19–20).

**Phase 7 — Final quality pass:** real physical Android/iOS device testing, Safari/Firefox testing, testing with actual assistive technology (not just structural checks), a full expanded Playwright suite covering every new system above once it's built.

Also not yet done: the full Home-screen restructure into Continue/Surprise Me/Today/For You/Play With Someone/Your Moments (§4) — several of those sections (For You, Play With Someone, Your Moments) depend on features (personalization depth, Duels, Moments) that don't exist yet, so restructuring Home ahead of the features it would surface didn't make sense to do first.

## Recommended next step

Given the brief's own phase ordering and what's cheapest-to-value: **Moments** (§9) is the smallest, most self-contained next feature (pure local storage, no server, no new screens beyond a simple list) and would unlock part of the Home-screen rework. **Real crowd data for Majority** (§11) remains the highest-impact single feature from the whole brief, but is a meaningfully bigger lift (needs a Netlify Function, needs its own security/rate-limit thinking) — good for a dedicated session rather than folding into a mixed pass.
