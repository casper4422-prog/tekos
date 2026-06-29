# TekOS — OCR Ground Truth (test fixtures)

**Purpose:** Stop re-asking the user for known-correct stat values every session.
This file is the canonical record of what each test screenshot *should* read.

When iterating on the screenshot OCR (`src/routes/specimens/add/+page.svelte`),
verify against THIS file. Do not ask the user for values that are already here.

## How to use

1. Each test screenshot goes in `static/ocr-samples/` (committed to the repo).
2. Each gets a row in the table below with its real in-game values.
3. A fix is "verified" only when the pipeline reproduces every value here.

Format per stat is `base|mut|dom` (matches the panel's `(base | mut | dom)`
bracket and the debug log). **base** = wild/heritable, **mut** = mutation counter,
**dom** = post-tame leveling (NOT heritable). For breeding correctness, `base` and
`mut` are the must-get-right columns; `dom` is nice-to-have.

Torpor and Speed are never breedable stats — leave them out. `CRA` = Crafting
Skill, which only SOME species have (see "Crafting" note below). Use `—` for a
stat the species/panel doesn't have.

## Fixtures

| Screenshot file | Species | Name | Level | HP | STA | FOOD | WGT | OXY | MEL | CRA |
|---|---|---|---|---|---|---|---|---|---|---|
| `andromeda-01.png` | _(fill)_ | Andromeda | _(fill)_ | `59|10|21` | `48|0|0` | `55|2|0` | `59|0|23` | `38|0|0` | `56|4|13` | `—` |
| `giga.jpg` | Giganotosaurus | _(unnamed→species)_ | 304 | `51|0|0` | `53|0|0` | `47|0|0` | `47|0|0` | `55|0|0` | `50|0|0` | `—` |
| `mororex.png` | _(custom name)_ | MoroRex Gen2 | 528 | `53|26|0` | `55|6|0` | `42|2|0` | `55|12|0` | `32|0|0` | `56|188|0` | `—` |
| `alap.jpg` ⚠️VERTICAL | _(name)_ Alap | 287 | `52|0|0` | `43|0|0` | `46|0|0` | `46|0|0` | `48|0|0` | `51|0|0` | `—` |

> `giga.jpg` is a REAL phone photo of a screen (recovered from the session
> transcript 2026-06-27) — the true target input: glare, slight skew, the
> translucent panel's scene bleed-through, and `/` separators. Tribe is Andromeda;
> creature unnamed so the title shows the species. Color regions (0–5):
> `45, —, —, —, 63, 25`. Local harness: `scripts/ocr-harness.mjs`.

> Ground truth confirmed by the user 2026-06-12. This creature has **no Crafting
> stat** — correct behavior is to leave CRA blank, not invent one.

## What the OCR got wrong on this fixture (commit `0915dfd`)

Verified against the truth row above:

| Stat | Truth | OCR read | Verdict |
|---|---|---|---|
| HP | `59|10|21` | `1|0|2` | ❌ all three wrong — HP row mis-segmented (raw text was garbage `"7/7 6210"`) |
| STA | `48|0|0` | `48|0|0` | ✅ |
| FOOD | `55|2|0` | `5|2|0` | ❌ base dropped a digit (`55`→`5`); raw bracket fused as `55| 210` |
| WGT | `59|0|23` | `59|0|23` | ✅ |
| OXY | `38|0|0` | `38|0|0` | ✅ |
| MEL | `56|4|13` | `56|4|3` | ❌ dom dropped leading digit (`13`→`3`); base+mut OK |
| CRA | `—` | (none) | ✅ correctly absent |

**Takeaway:** the dense HP row is the big failure; FOOD/MEL are single-digit drops
in the multi-digit components. base+mut land on 4/6 stats; the misses are all
digit-count (segmentation) errors, not wrong-row mapping.

## Crafting (CRA) — species-conditional

Crafting Skill is NOT on every creature's panel — only species that have it show
a second `%` row after Melee. **Which species have crafting lives in the species
database** (`static/species-database.js`). When mapping `%`-rows to MEL/CRA, a
creature without crafting has exactly one `%` row (Melee); one *with* crafting has
two. Use the species DB to know whether to expect a CRA value rather than guessing
from row count alone. (TODO: confirm the exact field name in species-database.js
that flags crafting-capable species.)
