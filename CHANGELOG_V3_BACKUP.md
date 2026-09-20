# BETWEEN — CHANGELOG ADDENDUM: Data Export / Import (V3 brief, Section 22)

Built as the next item after Time Capsule (see the other `CHANGELOG_V3_*.md` files for prior passes).

## What was built

- Settings now has **Export** and **Import** buttons under a new "Data" section.
- **Export** bundles your stats, answer history, settings, progress state, personalization tendencies, Moments, and Time Capsules into one `.json` file and downloads it straight to your device — `between-backup-YYYY-MM-DD.json`. Nothing is uploaded anywhere; it's a plain file save.
- **Import** opens your device's normal file picker, reads the chosen file, and — only after showing an explicit "This will replace your current data, this can't be undone" confirmation — replaces your local data with what's in the file. Nothing is overwritten silently, exactly as the brief required.

## The part that actually mattered most: treating imported files as untrusted input

An import feature is the first place in BETWEEN where data from *outside* the app can end up back inside it — a backup file could be genuine, could be from a much older version, or could be a file someone else handed you. Before building the feature itself, I went back through every place Moments and Time Capsule data gets displayed on screen and found they were **not** escaping their content before inserting it into the page. This was harmless before now, because that data only ever came from BETWEEN's own trusted question set — but it would have become a real cross-site-scripting (XSS) hole the moment import existed, since an imported file's `prompt` or `chosenText` fields could contain something like `<img src=x onerror="...">` .

Fixed by centralizing one `Utils.escapeHtml()` helper (there was already a private, correct copy of this buried in one mode's free-text handler — pulled it out and reused it everywhere) and applying it to every dynamic field rendered in Moments, Time Capsule, and the Time Capsule revisit flow.

**This was verified, not just reasoned about:** I built an actual malicious backup file containing a real image-onerror payload and a `<script>` tag, ran the whole import flow against it, then rendered the resulting Moments and Time Capsule screens and confirmed via a real page inspection that the payload never executed — it appeared on screen as inert, literal text (a screenshot of this is in the QA record). This is the difference between "should be safe" and "confirmed safe."

## Also fixed while in this code

- Import validates file shape before touching anything: rejects non-JSON files, rejects JSON that isn't a BETWEEN backup, and rejects a backup whose internal fields are the wrong type (e.g. `moments` being a string instead of a list) — each with a specific, plain-language error message, and confirmed that a rejected import leaves existing data completely untouched.
- Small correctness fix found along the way: free-typed reflection answers (from Prediction/Random's free-text input) were silently never being captured by the "Save to Your Moments" feature, because they were stored under a different field name than the one Moments was reading. Fixed so saving a Moment now works from every mode, including free-text ones.

## Verified

- Export downloads a real file; its contents were read back and confirmed to contain the correct app tag and the actual current stats/Moments.
- A garbage JSON file and a non-JSON file are both rejected with clear, distinct error messages, and confirmed existing stats were untouched afterward.
- A valid backup file is correctly restored after confirmation — stats, Moments, and settings all verified to match the imported file afterward.
- The security test described above (malicious payload, confirmed non-executing, confirmed rendered as safe text).
- Full 8-mode regression and a full reset afterward — everything still works, reset still correctly wipes everything including anything just imported.
