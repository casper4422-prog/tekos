# TekOS — Page-by-Page Polish Spec

User's master planning doc for the TekOS polish pass. Loaded every session so the Global Rule and per-page checklists are always in scope.

**Pages reviewed (changes are scoped + locked):** Badges (partial — rank rename only), Dossier, Specimens (List), Specimens (Individual), Add Specimen, Dex.

**Pages still to review:** Feed, Badges (full), Marketplace, Network *(done as of 2026-05-22)*, Tribe Hub, Overseer (Arena & Boss Records), Notifications, Settings.

**Active implementation scope:** Dossier, Specimens, Dex, Feed, Network. `/survivors/[id]` does NOT get Network tab nav.

---

## 1. BADGES — Breeder Rank rename (7 → 8 ranks)

See [`achievements.md`](achievements.md) — the 8-rank uniform ladder is the source of truth. Every "X on 5 species" milestone now uniform (old ladder mixed 5/3/2).

## 2. GLOBAL RULE — Everything Links

Applies on EVERY page, not just specific ones:

- **Badge wall creatures** → `/specimens/[id]`
- **Feed activity items** → relevant page (trade / creature / tribe event / etc.)
- Activities with no clear destination → that user's profile page
- **Usernames everywhere** → user's profile page (`/survivors/[id]`)
- **Species names** → Dex species page (`/dex/[species]`)
- **Offspring cards** → that creature's specimen page (`/specimens/[id]`)

**MOST OVERLOOKED:** badge wall chips, species names in lists, offspring/parent cards. Audit these when touching any page.

## 3. DOSSIER

- Share button → clipboard copy of profile URL ✅ shipped
- Breeding Project cards click → `/specimens/[id]` ✅ shipped
- Pin Project button styling matches other action buttons ✅ shipped
- Stat cells → links (Specimens, Badges, Friends, Boss Runs; Trade Rep = TBD page) ✅ shipped
- New sections: Tribe snapshot, Active trades, Notifications preview, Recent activity ✅ shipped
- **Badge wall chips → /specimens/[id]** (Global Rule)
- Recent Boss Runs click → receipt modal (participants, tames used, outcome, difficulty, duration) — DEFERRED, depends on Overseer/War Room review
- Boss Log Enhancement: log form auto-prefills from War Room (participants, tames, duration, outcome, boss + difficulty), user can edit before saving, War Room = source of truth — DEFERRED, depends on Overseer review

## 4. SPECIMENS (List)

- **Send to Tribe Vault** button on each card — creature stays in personal vault but is visible in shared Tribe Vault
- **Share dropdown:** Copy Link / Share to Discord
  - Discord format: `🦕 REX — "Big Daddy" ♂` + `Boss Ready: Alpha · 🧬 18 Mutations` + `📊 HP:52 · STA:38 · OXY:30 · FOOD:44 · WGT:41 · MEL:48 · CRA:0` + `✅ Available for Breeding | Trade`. All 7 stats. Clipboard copy.
- **New filters (apply to BOTH list and grid):** Map / Gender (M/F) / Available for Breeding / Available for Trade / Has Mutations / Badge (the 8 specific badges)

## 5. SPECIMENS (Individual `/specimens/[id]`)

- Share dropdown (same as list)
- **Partner button — REMOVED**
- **Mutation tracker — real DB save** (Dossier bump ↔ individual page bump must sync; currently disconnected)
- **Ancestry full rework → Founders + Stat Origins table:**
  - Founders = list of original tames for this species in this bloodline, species-filtered, easy add/remove
  - Stat Origins = one row per stat, dropdown of founders per stat; every stat assigned to ONE founder even when multiple founders have a value (user picks which "won")
- **Specimen Notes rework:**
  - Keep: Logged (date + who, username links), Specimen ID, Notes, Recent Activity
  - **Remove:** Server, Imprint, Wild Lvl, Tamed Lvl
  - **Add:** Color Regions (6 slots, Region 0–5), Role (Breeder/Tank/DPS/Harvester/Flyer/Utility), Available for Breeding (toggle), Available for Trade (toggle), Obtained From (TekOS profile link or free text), Cryo Location (free text)

## 6. ADD SPECIMEN

- **OCR full rebuild** — support SuperSpyglass, U+Binoculars, Tek Binoculars (vanilla). Parse format `(wild | mut | dom)` → take wild as base, mut as mutations, ignore dom. **Icon recognition via template matching** required (not just OCR text). See [`../plans/ocr-feature.md`](../plans/ocr-feature.md) for current state.
- **Replace ARK Save import → Bulk Spreadsheet Import:**
  - Generated `.xlsx` template (endpoint `/api/templates/bulk-import`) with current species list baked as dropdowns
  - 30 columns: Name · Species · Level · Gender · HP · STA · OXY · FOOD · WGT · MEL · CRA · HP Mut · STA Mut · OXY Mut · FOOD Mut · WGT Mut · MEL Mut · CRA Mut · Color 0–5 · Role · For Breeding · For Trade · Obtained From · Cryo Location · Notes
  - Dropdowns: Species (450–500 from DB), Gender (M/F), Role (Breeder/Tank/DPS/Harvester/Flyer/Utility), Breeding/Trade (Yes/No), Color Regions 0–5 (all valid ARK color names)
  - **Two-tier validation:**
    - Hard stops: missing species entirely, species not in DB, invalid data types
    - Soft warnings: missing stat values, missing mutations, missing colors, missing name/gender — user can proceed with confirmation
  - Preview step before commit
- Manual entry form gets the new Notes fields too (Color Regions / Role / Available toggles / Obtained From / Cryo Location)

## 7. DEX

- **New filters:** Map (which maps species spawns on) / Owned (≥1 tame) / Not Owned / Has Badge / Variant Type
- **ASA variant prefixes** (corrected by user 2026-05-22): **Vanilla / Aberrant / X- / R- / Tek / S-**. Lunar is *not* a variant prefix — it's a Genesis 1 biome name, and Genesis 1 isn't out for ASA yet. S- is the newer ASA player-bound variant. Original planning notes listed "Lunar" by mistake; corrected here.
- Species DB needs explicit variant-type tagging (can be parsed from name prefix but explicit is cleaner). See [`species-conventions.md`](species-conventions.md).

---

## How to apply

When touching any of these 5 pages (Dossier/Specimens/Dex/Feed/Network) for changes, scan THIS file first + apply the Global Rule + the page-specific list. The Global Rule is the most often-missed — audit links on every page even when "just" doing one specific change.
