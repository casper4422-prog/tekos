# TekOS

SvelteKit web app for the ARK: Survival Ascended community. Rebranded from "Dino Nuggie" on 2026-05-11 — that name is fully retired, don't reference it. Visual inspiration is Tek-tier ARK UI, modernized.

**Community context:** User runs a Discord of ~10k ARK ASA players — they are the primary audience.

**Repo:** `casper4422-prog/tekos` on GitHub. Live at `tekos.onrender.com` (Render paid Starter tier as of 2026-06-11).

---

## Tech Stack

- **Framework:** SvelteKit 2.21 + Svelte 5 (runes mode — `$state`, `$derived`, `$effect`)
- **ORM:** Prisma 6 → PostgreSQL
- **Auth:** JWT cookie sessions (email/password + Discord OAuth)
- **Adapter:** adapter-node
- **Hosting:** Render (master auto-deploys)
- **OCR:** Tesseract.js (client-side) — see [`.claude/plans/ocr-feature.md`](.claude/plans/ocr-feature.md) for current state

## Build & Verify

```
npm run check    # TypeScript + Svelte check (run before every commit)
npm run dev      # Local dev server (user doesn't run this)
npm run build    # Production build
```

User doesn't run a dev server. After code changes, verify with `npm run check`, then push.

---

## Git Conventions

- **Push directly to master, no feature branches.** TekOS workflow: write code, push, fix forward. (Real incident on 2026-05-14: drifted onto a stale `security-fixes` branch and lost work. Don't repeat.)
- Commit format: `fix(scope): description` (lowercase, conventional). Use `git log --oneline -10` to see recent style.
- Co-author tag: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Never amend or force-push. New commits only.

If the user opens a branch elsewhere (e.g. a security audit PR), ASK whether the next commit belongs there or on master.

---

## Hard product rule: NO per-call costs

TekOS features cannot rely on per-call API costs. This includes:
- Server-paid LLM calls
- Bring-your-own-API-key (BYO) — gates the feature behind setup 95% of ARK players won't do
- Paid OCR services

**Why:** Community-facing tooling for thousands of ARK ASA players. Per-call cost compounds catastrophically. ARK players have hundreds-to-thousands of tames each (user has 800+ cryofridges alone). Rejected multiple times — re-offering it as "BYO key" is the same rejection in different clothing.

**Apply to:** OCR, image analysis, content generation, search — anything user-triggered. Stay browser-side: Tesseract.js, WASM, template matching, anything offline-capable.

See [`.claude/memory/no-per-call-costs.md`](.claude/memory/no-per-call-costs.md).

---

## Domain knowledge files

When working on these areas, read the relevant detail file:

- **Project overview & current state:** [`.claude/memory/project.md`](.claude/memory/project.md)
- **Locked build decisions** (Feed Server tab A2S + RCON, etc.): [`.claude/memory/build-decisions.md`](.claude/memory/build-decisions.md)
- **Species database conventions** (`static/species-database.js`): [`.claude/memory/species-conventions.md`](.claude/memory/species-conventions.md)
- **ARK ASA general knowledge** (stats, breeding, mutations, traits, maps, roadmap): [`.claude/memory/ark-knowledge.md`](.claude/memory/ark-knowledge.md)
- **Achievement & badge systems** (Boss Ready, Underdog, Prize Bloodline + tiers, formulas): [`.claude/memory/achievements.md`](.claude/memory/achievements.md)
- **Feed starter sources** (Wildcard official, r/ARKSurvivalAscended, Loaded Crysis): [`.claude/memory/starter-sources.md`](.claude/memory/starter-sources.md)
- **Page-by-page polish spec** (current planning notes, Global Rule "everything links"): [`.claude/memory/planning-notes.md`](.claude/memory/planning-notes.md)
- **ARK boss arena caps** (NEVER guess; always look up): [`.claude/memory/boss-caps.md`](.claude/memory/boss-caps.md)

---

## Active work

- **Current plan:** [`.claude/plans/ocr-feature.md`](.claude/plans/ocr-feature.md) — Upload Screenshot OCR via Tesseract iteration. Latest commit `a942fea` pending user test (hardcoded 9 bands + nearest-neighbor upscale).
- **Carried forward (separate batch when OCR ships):** Polish punch list — Dossier reorder, Specimens toolbar slim, Badges rewrite (Boss Ready cumulative tiers + Endurance STA→OXY + map boss prune + species requirement), Overseer rework (Lost King/Queen combo + max caps + tribute cycling + countdown), BattleMetrics Add Server flow, Tribe Specimens shared vault, Discord webhook integration, Messages-on-top-level nav.

---

## Important retired context

- "Dino Nuggie" name retired since 2026-05-11. Don't reference it. The product is TekOS.
- Super Spyglass OCR support dropped. Tek/u+ Binoculars only.
- Old canonical stat order assumption (`HP, STA, OXY, FOOD, WGT, MEL, CRA`) was wrong for the u+/Tek panel. Real panel row order is `HP, STA, Torpor, FOOD, WGT, OXY, Speed, MEL, CRA`. The OCR mapping has to handle the difference.
