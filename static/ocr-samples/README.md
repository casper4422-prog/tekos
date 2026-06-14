# OCR test fixtures

Real panel screenshots used to (a) cut the digit templates the fixed-font
reader matches against, and (b) regression-test the reader without redeploying.

## Protocol

1. Drop a Tek/u+ Binoculars panel screenshot here (`.png`).
2. Add its known-correct values to
   [`.claude/memory/ocr-ground-truth.md`](../../.claude/memory/ocr-ground-truth.md)
   — one row per screenshot, `base|mut|dom` per stat.
3. A fix is "verified" only when the reader reproduces every value in that table.

## Calibration sample

One sample is designated the **calibration** image: the digit glyphs (0–9) are
cropped from it to build the reference template set the matcher uses. Pick a
screenshot that contains every digit 0–9 at least once (a high-level creature
with varied stats covers this easily).

Keep originals at full resolution — downscaling destroys the glyph detail the
matcher needs.
