# TekOS — Project Overview

**Rebrand date:** 2026-05-11 (formerly "Dino Nuggie", which is fully retired — do not reference it)

**What it is:** A web app for the ARK: Survival Ascended community. Successor to the Dino Nuggie companion concept, but rebranded and re-scoped under a new identity. Inherits the spirit of the previous project (breeding, bosses, stats, achievements — see [`achievements.md`](achievements.md) and [`ark-knowledge.md`](ark-knowledge.md)) but is a clean redesign.

**Platform:** Web app / browser-based (responsive). Not a mobile-native app, not a desktop overlay.

**Visual direction:** Inspired by ARK's Tek tier (holographic cyan/teal, glowing UI, sci-fi HUD vibes) but **modernized** — clean UX, modern web patterns. NOT a faithful in-game HUD replica.

**Community context:** User runs a Discord of ~10k ARK players — they are the primary audience.

**Why:** User wanted a stronger brand identity than "Dino Nuggie", with visuals that match the high-tech endgame aesthetic ARK players already associate with mastery.

## How to apply

- Treat any prior "Dino Nuggie" references as historical context, not current state — the product is TekOS now
- The user does the creative direction; Claude handles technical execution
- The user explicitly loves being asked clarifying questions — front-load discovery before building

## Technical snapshot (verified 2026-06-11)

- **Repo:** `E:\agents\ark-expert\workspace\tekos`, GitHub `casper4422-prog/tekos`, push to master directly
- **Stack:** SvelteKit 2 + Svelte 5, Prisma 6 + PostgreSQL, adapter-node, deployed to Render (`tekos.onrender.com`), JWT cookie auth (email/password + Discord OAuth), Tesseract.js client-side OCR
- **All 25 routes** ported from HTML previews to real Svelte routes (`MIGRATION_STATUS.md` in repo) — no placeholders
- **Species DB:** `static/species-database.js`, ~481 entries, uniform 60-field schema, loaded as `window.SPECIES_DATABASE` global
- **Specimen screenshot-OCR:** Active iteration. See [`../plans/ocr-feature.md`](../plans/ocr-feature.md) for current state. Tek/u+ Binoculars only, Super Spyglass dropped.
- **Render tier:** Paid Starter as of 2026-06-11 (free tier ran out)

## Important context

- **Real u+/Tek panel row order:** `HP, STA, Torpor, FOOD, WGT, OXY, Speed, MEL, CRA` — NOT the old canonical assumption `HP, STA, OXY, FOOD, WGT, MEL, CRA`. The mapping has to handle this.
- **Panel layout is fixed** (user-confirmed). Icons are at consistent positions per-row. Detection-based row finding is overkill; hardcoded fractional positions are reliable.
