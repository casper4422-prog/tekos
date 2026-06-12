# TekOS — Species Database Conventions

File: `static/species-database.js`. Single JS object literal `SPECIES_DATABASE` exposed as `window.SPECIES_DATABASE`. After audit sessions through 2026-05-13, the file has **481 entries** with a canonical **60-field schema** and no duplicates.

## What belongs in the database

**In scope:**
- All vanilla ARK Survival Ascended creatures (base game + DLC: Scorched Earth, Aberration, Extinction, Genesis 1/2, The Center, Ragnarok, Valguero, Crystal Isles, Lost Island, Fjordur, Astraeos, Lost Colony)
- All variant types: Aberrant, Tek, X-, R-, Alpha, Skeletal, Spirit, Zombie, Bunny, Party, Bone, Corrupted
- Event creatures (Halloween Skeletals, Bunny Dodos, Zomdodo, etc.)
- Boss creatures + mini-bosses
- S-Dinos mod by Nekatus (`S-` prefix) — user explicitly approved
- ARK Additions Mod (Deinotherium, Helicoprion, Mantis Shrimp, etc.) — user approved
- Astraeos Mythological Creatures Mod (Minotaurus, Cyclops, Seahorse) — user approved
- Moro's Indomitable Duo Mod (Moro Rex, Moro Raptor) — user approved

**Out of scope — do NOT add:**
- **ASE Aquatica creatures** — Aquatica is an ARK Survival Evolved DLC, NOT in ASA. Filter out: Homarus, Istiophorus, Cymathoa, Kathreptis, Chrysaora, Dakosaurus, Malleocephalus, Fractalis, Alpha Chrysaora, Alpha Dakosaurus, Alpha Malleocephalus, Alpha Tridacna, Alpha Water Wyvern, Abyssal Alpha T-Rex
- Unreleased creatures (Tidepup, Burrowbuck, Palaeoctopus, Boaratos) — skip until they release in ASA

**Why:** User wants the database to reflect what players can actually access in ASA today, plus announced-but-coming ASA content. ASE Aquatica was a 2025 release for the OLD game (Survival Evolved), not ASA.

**How to apply:** Before adding any creature, verify it's in ASA (not ASE-only). The `ark.wiki.gg` page for a creature will say "introduced in the Aquatica expansion map" and show "Not yet released" status if ASE-only.

## Cat is a real ASA creature, distinct from Sabertooth

- `Cat` is a vanilla ASA creature added in April Fools 2025 (Patch 64.1) as a ported Atlas asset. Shoulder pet, pest controller, 4 coat patterns. Permanent feature, not a joke.
- **Cat is NOT a Sabertooth alias.** A cat is a cat, a sabertooth is a sabertooth. User explicitly corrected this when I assumed otherwise.
- `S-Cat` is the S-Dinos mod variant — it's also the Atlas-model cat (not S-Sabertooth, despite "Cat" sometimes being slang for Sabertooth in ARK community).

**How to apply:** Treat Cat and Sabertooth as completely separate creatures. Never conflate them.

## Alpha variants are not bosses

- `category: 'alpha'` is the correct primary classification for the 14 Alpha creatures (Alpha Rex, Alpha Karkinos, Alpha Fire Wyvern, etc.) plus Lost Colony alphas (Alpha Hulking Revenant, Alpha Ossidon).
- They are untameable wild predator encounters — distinct from `category: 'boss'` (which is reserved for actual story bosses: Broodmother, Megapithecus, Dragon, Manticore, Overseer, Rockwell, etc.).
- `badgeCategories` should be `['combat']` for Alphas (NOT `['combat', 'boss']`).

**Why:** Alphas are wild loot-source predators, not arena fights.

## Category and badgeCategories schema

**`category` field** — single primary value, one of 11:
`combat, utility, transport, harvesting, flyer, aquatic, pet, event, alpha, titan, boss`

**`badgeCategories` field** — array of badge tags, can stack. Values:
`combat, utility, transport, harvesting, boss, pvp, support, mod, scout`

- `support` should ONLY tag creatures that meaningfully heal/buff allies (Daeodon, Yutyrannus, Snow Owl, Solwyn, Maewing, etc.). Don't auto-tag everything with a non-empty `buffAuras` — that produced 180 false positives during the first pass and was narrowed to 36 via user audit.
- `mod` tags non-vanilla mod content (S-Dinos S- prefix + ARK Additions + Moro's Duo + Astraeos Mythological Mod). Used so UI can filter mod creatures separately from vanilla.
- `scout` is recon/sensing creatures (Parasaur scan, Snow Owl thermal, Velonasaur, Tek Stryder radar, Megaraptor target marking, etc.) — narrow application.

**How to apply:** When adding a new entry, pick exactly one `category` and stack relevant `badgeCategories`. Don't put `boss` in category for Alphas, Titans, or events.

## Naming convention: use full names

User-confirmed rule from naming-inconsistency audit:
- Use full scientific names for all base creatures and variants
- Examples already applied: `Spino` → `Spinosaurus`, `Trike` → `Triceratops`, `Bronto` → `Brontosaurus`, `Sarco` → `Sarcosuchus`, `Stego` → `Stegosaurus`, `Acro` → `Acrocanthosaurus`
- Variant prefixes preserved: `S-Triceratops`, `Aberrant Spinosaurus`, `X-Spinosaurus`, `Tek Triceratops`, etc.

**Still NOT applied (open follow-up):** `Compy → Compsognathus`, `Parasaur → Parasaurolophus`, `Quetzal → Quetzalcoatlus`, `S-Ankylo → S-Ankylosaurus`, Crystal Wyvern word-order swap (`Crystal Wyvern Ember` should be `Ember Crystal Wyvern` per the `name` field).

**How to apply:** When the user asks for a rename pass or a new entry, default to full scientific names.

## Hidden inline duplicates pattern

The original audit's "no hard duplicates" claim missed three inline-formatted duplicates that had keys malformed onto the same line as a previous entry's closing brace: `},'Fenrir': {`. A brace-depth scanner (read source as text, track string/comment state, find every depth-1 key) is the reliable way to detect these.

**How to apply:** When auditing the file for duplicates, don't trust regexes anchored to start-of-line. Use brace-depth parsing on the source text.

## Schema is uniform — 60 fields, 100% coverage

After the audits, every entry has exactly 60 top-level fields, all present. Don't assume the schema can vary. The earlier "Lost Colony has reduced schema" finding was wrong — those entries are just *line-compact* (nested objects on single lines), not field-deficient.

**How to apply:** New entries must have all 60 fields. Use a base creature's existing entry as a template.

## Useful audit workflow

1. Read file with `eval` to access as a JS object
2. For text edits, use brace-depth walking from `'KEY': {` to its matching `}`
3. After bulk edits, run `node --check` to verify the file still parses
4. Clean up temp `__*.cjs` scripts when done (don't commit to repo)
