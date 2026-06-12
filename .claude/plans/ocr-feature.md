# TekOS — Upload Screenshot OCR

## Current state (as of commit `0915dfd`, 2026-06-11)

**The OCR was rebuilt around bar-anchored structure detection and is working.** Validated 6/6 base+mut on a real failing screenshot per the project memory.

### How it works now

- **Anchor:** the green HP bar is the structural anchor. Blue bars give the row pitch (vertical spacing between rows).
- **Binarization:** min-channel (not Otsu, not V-channel + saturation gate — those iterations were dead ends).
- **Triple extraction:** segment-based with candidate voting (multiple candidates per triple slot, vote the most likely).
- **Stat mapping:** content-aware. **Real u+/Tek panel row order is `HP, STA, Torpor, FOOD, WGT, OXY, [% rows MEL/CRA]`** — NOT the old canonical assumption (`HP, STA, OXY, FOOD, WGT, MEL, CRA`). The mapping handles this correctly.
- **Template match:** still used but now only as a coarse locator (find roughly where the panel is). Internal structure comes from bar detection, not template fractions.
- **Panel layouts vary:** u+ panel has 8 vs 9 rows depending on the creature. The bar-anchored approach handles both.
- **Scope:** Tek/u+ Binoculars only. Super Spyglass dropped.

### Offline test harness

`E:\agents\ark-expert\workspace\ocr-lab\final.js` — runs the OCR pipeline against samples in `ocr-samples/`. Use this to iterate locally without redeploying. Validated 6/6 base+mut on a real failing screenshot.

---

## Previous iteration history (pre-0915dfd, for context)

This chat's iteration from 2026-06-03 → 2026-06-04 tried various Tesseract preprocessing tweaks (all SUPERSEDED by the 0915dfd rebuild):

- `1079b8a` Per-row PSM 7 + brightness-based band detection on user's panel → only found 2 tiny bands
- `b8fc477` Detection on the high-res REFERENCE template, scale fractions to matched panel → template's bars passed brightness threshold, returned one huge band
- `11a4c50` Variance-based detection + hardcoded 9-band fallback → user reported image too small + illegible
- `a942fea` Force hardcoded 9 bands + nearest-neighbor upscale + 24× scale cap → user couldn't test (Render free tier ran out)

The user paid for Render Starter on 2026-06-11. Between that and a fresh OCR rebuild from another work stream, `0915dfd` replaced the entire Tesseract-tuning iteration with the bar-anchored approach above.

The key insight from the failed iterations that informed the rebuild: **the panel text is too small at source resolution for general-purpose OCR thresholding to work**, and **the row layout differs between template and actual panel (8 vs 9 rows)**. Bar-anchored structure detection sidesteps both — bars are unmistakable colored regions, and finding them adapts to whatever layout the actual creature's panel has.

---

## What's next

Now that OCR works, the polish punch list comes off the shelf. Carried forward from earlier sessions:

- **Dossier:** reorder Active Breeding Projects under Tribe Snapshot, add list/card view toggle on pinned projects
- **Specimens list:** strip advanced filters down to just Gender; add Alphabetically / Species type / Last updated sorts (Last updated needs `Creature.updatedAt` schema add)
- **Dex:** drop "Has Badge" checkbox; consolidate "Lost Colony (boss reward only)" and "Fjordur (boss reward only)" into parent maps
- **Feed:** recommended sources persistence (regression from BreedingProject migration); update Loaded Crysis description
- **Network/Messages:** promote Messages to top-level nav under Social
- **Tribe:** name editing in Edit Tribe modal; rework Tribe Specimens into a full shared-vault page
- **Badges:** Boss Ready cumulative tiers (lower tiers credit higher-tier species); Specialist Endurance role STA → OXY; Map Boss prune + species requirement reshape
- **Overseer:** Lost King + Lost Queen combo card; max-player/max-tame caps per boss; tribute cycling per difficulty; war-room countdown timer
- **Notifications:** Accept/Decline buttons (IDs missing from payloads)
- **Settings:** BattleMetrics integration for Add Server flow
- **Global:** Discord webhook integration for tribe / war-room events

When pulling this into active work, write a fresh plan file in `.claude/plans/` per scope of batch.

---

## Critical files (OCR)

- [`src/routes/specimens/add/+page.svelte`](../../src/routes/specimens/add/+page.svelte) — Upload screenshot UI, OCR pipeline, form fill
- [`static/panel-templates/uplus.png`](../../static/panel-templates/uplus.png) — Coarse-locator template
- `E:\agents\ark-expert\workspace\ocr-lab\final.js` — Offline test harness (outside the repo)
- `E:\agents\ark-expert\workspace\ocr-lab\ocr-samples\` — Test screenshots

## Verification

Drop a screenshot of a Tek/u+ Binoculars panel onto `/specimens/add`. Form should auto-fill the base + mut for HP/STA/OXY/FOOD/WGT/MEL/CRA. If it doesn't, run the offline harness against the same screenshot to debug without the redeploy cycle.
