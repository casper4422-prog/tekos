# TekOS — On-device fixed-font panel reader

**Decision (2026-06-14):** Replace the Tesseract-based stat OCR with a
template-matching reader for the ARK u+/Tek panel's **fixed bitmap font**.

## Why this, not Tesseract / not an LLM

- **Not an LLM (server or BYO):** per-call cost, forbidden — see
  [`../memory/no-per-call-costs.md`](../memory/no-per-call-costs.md).
- **Not Tesseract:** it's general-purpose OCR for arbitrary fonts and scanned
  docs. The panel is **one fixed font in predictable boxes** — a solved,
  near-deterministic problem for shape matching. 31 `fix(specimens)` commits of
  Tesseract tuning (May 29 → Jun 12) never got past digit-segmentation misreads.
- **Fixed-font matcher:** on-device, zero per-call cost, works on every machine
  offline, and matches *known glyph shapes* instead of guessing characters — so
  it doesn't suffer the "is that `5` or `55`" meltdown that wrecked HP/FOOD/MEL.

## Pipeline

Reuse the parts of the current pipeline that already work; swap only recognition.

1. **Locate panel** — coarse template match vs `static/panel-templates/uplus.png`. *(reuse)*
2. **Row detection** — bar-anchored (green HP bar = anchor, blue bars = pitch). *(reuse)*
3. **Triple region** — isolate the `(base | mut | dom)` bracket on the right of each row. *(reuse the column segmentation)*
4. **Glyph segmentation** — split into *single* digit glyphs (not multi-digit groups), by column gaps at glyph granularity. *(new)*
5. **Glyph classification** — normalize each glyph to a fixed box (e.g. 16×24), score against the 10 reference templates (normalized cross-correlation / 1−SSD), pick best; keep best−2nd-best margin as confidence. *(new)*
6. **Reassemble** — digits → numbers via the pipe/gap structure already detected → `base|mut|dom`.

## Templates (calibration)

- Cut digit glyphs 0–9 from a labeled screenshot where every digit is known
  (e.g. Iris/Andromeda: 389, 25355.7, 59|10|21, 56|4|13, … covers 0–9 many times
  over → average duplicates into clean templates).
- Commit the template set to the repo (`static/panel-templates/glyphs.json` or a
  sprite PNG). Loaded once, zero runtime cost.
- `scripts/calibrate-glyphs.*` regenerates templates from a sample + label map if
  the font/scale ever changes.

## Architecture

Extract the pure `image → triples` logic out of the 3454-line
`src/routes/specimens/add/+page.svelte` into `src/lib/ocr/panel-reader.ts`, with
canvas ops behind a thin adapter so a **Node test harness** can supply
`node-canvas`. Both the Svelte page and the harness import the same module.

## Test harness (ends live testing)

`scripts/ocr-test.*` loads every sample in `static/ocr-samples/`, runs
`panel-reader`, asserts each `base|mut|dom` against the ground-truth table.
Seconds per run, no Render, no human in the loop.

## Honest risks

- **Scale variance** across player resolutions → normalize glyphs to a fixed box (scale-invariant) before matching.
- **Glow/metallic styling** softens edges → binarize first (reuse), and cut templates through the same binarization so they match like-for-like.
- **Generalization** → one fixture overfits; grow `static/ocr-samples/` to a few panels (different species/levels/themes) before calling it done.

## Blocked on

One real full-res panel screenshot committed to `static/ocr-samples/` — it's the
raw material the templates are cut from and the thing the harness tests against.

## Critical files

- `src/routes/specimens/add/+page.svelte` — current pipeline (source to extract from)
- `src/lib/ocr/panel-reader.ts` — *(new)* pure reader module
- `static/panel-templates/uplus.png` — coarse locator *(exists)*
- `static/panel-templates/glyphs.*` — *(new)* digit template set
- `static/ocr-samples/` — fixtures + ground truth
