# TekOS — Upload Screenshot OCR (Tesseract Done Right)

## Current iteration state

**Latest commit on master:** `a942fea` — force hardcoded 9 bands + nearest-neighbor upscale + 24× scale cap. PENDING user test (Render was paused 2026-06-09, user upgraded to paid Render Starter 2026-06-11, test next).

**What's been tried so far (in order):**
- `1079b8a` Per-row PSM 7 + brightness-based band detection on user's panel → only found 2 tiny bands (panel text too small for `mx > 200` threshold)
- `b8fc477` Switch detection to the high-res REFERENCE template (1152×1260), scale fractions to matched panel → template's bars pass brightness threshold too, returned ONE huge band covering the whole template
- `11a4c50` Variance-based detection + hardcoded 9-band fallback → still wrong, user reported image too small + illegible
- `a942fea` (CURRENT) Force hardcoded 9 bands always (skip variance) + nearest-neighbor upscale (no blur) + bump scale cap from 16× to 24×

**Next move when user tests `a942fea`:**
- If 9 rows visible AND text legible to the user's eye → tune OCR if needed (Fix 4: per-row bar-color-aware preprocessing — HP green, others blue)
- If 9 rows visible but text still mush → Plan B (per-digit template matching). Extract digit glyphs from `static/panel-templates/uplus.png` and match directly. No Tesseract.
- If hardcoded fractions misalign with actual stat rows → measure precise row positions from `uplus.png`, update `generateHardcodedBands` constants in [`src/routes/specimens/add/+page.svelte`](../../src/routes/specimens/add/+page.svelte)

---

## Context

**What the user wants:** Point u+/Tek Binoculars at a tame in ARK, screenshot the stat panel, drop it into TekOS. The form fills with that creature's stat numbers. No typing.

**Why it matters:** 800+ cryofridges of tames per active breeder to enter. Manual entry is the feature failing.

**Why we're rebuilding the Tesseract approach (not throwing it out):** A week of preprocessing failed because we were using Tesseract wrong, not because Tesseract can't do this. The four mistakes:

1. Using PSM 6 (block of text) when each row is one line — should be PSM 7 per row ✅ done
2. No character whitelist — Tesseract has been trying to match A-Z, punctuation, everything ✅ done (whitelist `0123456789()|/., `)
3. Preprocessing the whole panel uniformly when HP (green bar) and the other rows (blue bars) need different handling — STILL TO DO
4. Letting the English language model interfere with `(34 | 0 | 0)` content ✅ done (`load_system_dawg = '0'`, `load_freq_dawg = '0'`)

Fix those four things and Tesseract should hit 95%+ on clean shots. If it still fails, fall back to per-digit template matching as Plan B.

**Constraint:** [`.claude/memory/no-per-call-costs.md`](../memory/no-per-call-costs.md) — browser-side only.

---

## Plan B (if Tesseract still fails)

Per-digit template matching. Extract digit glyphs (0-9 + `(`, `)`, `|`, `/`, `.`, `,`) from `uplus.png` at known crop coordinates, slide each across the matched panel with non-maximum suppression, parse character sequence into triples.

Why it'll work: font is fixed, character set is tiny (10 digits + 5 separators), template matching already works at the panel level — extend down to glyphs. Same approach we proved on the panel match, just at smaller scale.

---

## Critical files

- [`src/routes/specimens/add/+page.svelte`](../../src/routes/specimens/add/+page.svelte) — all OCR code lives here ([lines 619-1083](../../src/routes/specimens/add/+page.svelte#L619-L1083))
- [`static/panel-templates/uplus.png`](../../static/panel-templates/uplus.png) — read-only reference template, used for panel match + (in Plan B) digit template extraction
- [`package.json`](../../package.json) — Tesseract stays for now; only removed if we fall to Plan B

## Reused code

- `loadTemplate()` — pattern for fetching + caching reference images
- `matchTemplate()` — multi-scale SSD match for panel localization (works reliably)
- `ocrRegion()` — Tesseract wrapper. Currently uses nearest-neighbor upscale + V-channel Otsu + saturation gate. PSM 7 per row.
- `extractTriples()` — parses `(base | mut | dom)` triples from row text
- `CANONICAL_STAT_ORDER` — row index → stat key

## Verification (after each fix)

1. User drops the Iris screenshot on the live site after Render redeploys.
2. User pastes the debug output back.
3. **User describes what they SEE on screen** alongside the paste — the user's eyes are the source of truth, NOT debug text alone.
4. We compare extracted values to what the user reads on the panel.
5. Decide: did this fix land? Move to next or revisit.

End-to-end success: drop screenshot → form fills with correct base/mut/dom for all 7 stats + level → user confirms by eye comparison.

---

## Out of scope

- Name / species extraction — manual fields, user types them.
- Spyglass screenshots — different layout. Tek/u+ Binoculars only.
- Bulk upload — single screenshot for now.
