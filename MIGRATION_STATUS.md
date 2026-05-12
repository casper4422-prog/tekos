# TekOS — UI Migration Status

Migration of the 21 designed previews in `static/*.html` into real Svelte 5 routes.

## Foundation ✓ Complete

- `src/app.html` — Added Orbitron, JetBrains Mono, Crimson Pro, Cinzel fonts
- `static/tekos.css` — Appended v2 design tokens (tier colors, fonts, shared utilities like `.tek-card-v2`, `.tek-btn-v2`, `.tek-chip`, `.tek-toggle`, `.tek-tabs`, `.tier-pill`, etc.)
- `src/lib/components/` — Built shared Svelte 5 primitives:
  - `HexAvatar.svelte` — Hex-shaped avatar with initial + gradient
  - `BloodlineBadge.svelte` — Auto-computed tier chip from base stats
  - `PageHeader.svelte` — Breadcrumb + gradient title + flavor sub
  - `TekCard.svelte` — Chamfered card wrapper with stripe variants
  - `TekToggle.svelte` — On/off toggle with two-way binding
  - `StatPip.svelte` — Colored status dot
- `src/lib/badges.ts` — Server-side badge computation library (Bloodline + Boss Ready + Role badges)
- `src/routes/+layout.svelte` — Added Messages + Survivors to Social nav; renamed Theme → Settings; username links to /settings

## All routes ported ✓ (Sessions 1 + 2 + 3)

| Route                    | Source preview                       | Status |
|--------------------------|--------------------------------------|--------|
| `/` (Landing)            | `landing-preview.html`               | ✓ Live · boot sequence + 3 CTAs |
| `/login` (Codex)         | `login-preview.html`                 | ✓ Live · ENTER/AWAKEN tabs, ARK-native vocab |
| `/dossier`               | `dossier-preview.html`               | ✓ Live · identity banner, Badge Wall, Active Breeding, Recent Boss Runs |
| `/badges`                | `badges-preview.html`                | ✓ Live · Breeder Rank, rank ladder, Close to Earning, 3-system catalog |
| `/settings`              | `settings-preview.html`              | ✓ Live · 7 sections · Account + Themes wired |
| `/specimens` (Vault)     | `vault-preview.html`                 | ✓ Live · grid + list views, auto-computed badges |
| `/specimens/add`         | `add-specimen-preview.html`          | ✓ Live · sticky live preview, save & add another |
| `/specimens/[id]`        | `specimen-detail-preview.html`       | ✓ Live · hero, brag row, stat table, owner actions |
| `/specimens/[id]/edit`   | (new, mirrors add)                   | ✓ Live · same builder shell w/ live preview |
| `/dex`                   | `dex-preview.html`                   | ✓ Live · species cards with Crimson Pro dossier excerpts |
| `/dex/[species]`         | (no preview)                         | ✓ Live · Tek-styled detail with hero + sections |
| `/survivors`             | `survivors-preview.html`             | ✓ Live · search + online filter + paginated grid |
| `/survivors/[id]`        | (Dossier view-mode)                  | ✓ Live · identity banner, Badge Wall, Recent Specimens, friend actions |
| `/friends` (Network)     | `friends-preview.html`               | ✓ Live · Discovery, Pending, Online Now, All Friends, Sent |
| `/feed`                  | `feed-preview.html`                  | ✓ Live · 5 tabs, unified event stream |
| `/notifications`         | `notifications-preview.html`         | ✓ Live · time-grouped, type-colored icons |
| `/messages`              | `messages-preview.html`              | ✓ Live · conversation list w/ unread badges |
| `/messages/[userId]`     | (extension of messages)              | ✓ Live · bubble thread, day separators, send composer |
| `/marketplace`           | `marketplace-preview.html`           | ✓ Live · 4 tabs, listing cards with category stripes |
| `/overseer`              | `overseer-preview.html`              | ✓ Live · boss browser, map filter chips |
| `/overseer/[id]`         | `boss-detail-preview.html`           | ✓ Live · war room header, tek tabs, chat/roster/members/tips |
| `/tribe`                 | `tribe-preview.html`                 | ✓ Live · owner/member views with Tek header |
| `/tribe/flag`            | `flag-workshop-preview.html`         | ✓ Live · 9-archetype prompt builder (existing logic preserved) |
| `/awakening` (NEW)       | (planned, then built)                | ✓ Live · 6-scene cinematic walkthrough with starter checklist |
| `/leaderboards`          | (DROPPED)                            | ✓ 308 → /badges |
| `/account`               | (MERGED)                             | ✓ 308 → /settings |

**25 routes total · 23 ported · 2 redirected · 0 placeholder.**

## What's wired to real data

- `/dossier` Badge Wall — computed live from `creature.data.baseStats/mutations` via `$lib/badges.ts`
- `/badges` Breeder Rank — derived from Bloodline tiers per species
- `/badges` Close to Earning — for each unearned standard badge, finds your closest creature and exact stat gap
- `/settings` Account — saves to `/api/profile`
- `/settings` Themes — saves to `/api/settings`, hydrates on page load, persists across reload
- `/specimens` grid/list — auto-computed Bloodline + Boss Ready badges per card
- `/specimens/add` — live preview reflects every keystroke; badges light up as thresholds clear
- `/specimens/[id]` — owner sees Edit/Delete; non-owners see logged-by attribution
- `/survivors/[id]` — Trade Rep aggregated from `TradeRating`; friendship-state-aware action buttons
- `/friends` — Discovery wires to `/api/users/search`; accept/deny use `/api/friends/[id]`
- `/messages/[userId]` — optimistic send + replace with server confirmation
- `/feed` — unified timeline from `ActivityEvent`, `BossRecord`, and `Trade`
- `/notifications` — marks read on click; mark-all-read button bulk-updates

## Known limitations / Session 4 candidates

| Item | Notes |
|---|---|
| First Awakening auto-trigger | Currently accessible only at `/awakening`. To auto-run for new users on first login, add a `User.firstAwakeningSeen` field + redirect on `/dossier` load. |
| Settings · Cluster section | UI showing "coming soon" — needs Steam A2S + RCON wiring (locked decision per memory) |
| Settings · Privacy / Notifications / Integrations | UI scaffolded with "coming soon" notes — need backend persistence |
| Marketplace deep polish | Cards work but don't yet show auto-computed Bloodline pills on listed creatures |
| Tribe deep polish | Body sections still use existing `tribe-*` classes — header is Tek but member/diplomacy layouts could be refreshed |
| Tribe Flag Workshop | Header is Tek; archetype picker + color picker work with existing styles. Could be reworked to match preview's live flag mockup |
| Overseer detail chat | Buttons inside chat/modals still use legacy `.btn` classes (already Tek-themed in tekos.css, but not v2) |

## How to access the cinematic

Visit `/awakening` while signed in. Uses arrow keys to navigate (← back, → forward, Space to advance, Esc to skip to the final scene). The final scene has a starter checklist linking to /settings, /specimens/add, and /tribe. Auto-advances at 10 seconds per scene; click ⏸ to pause.

## Run / verify

```bash
cd E:\agents\ark-expert\workspace\tekos
npm install
npx prisma generate
npm run dev
```

Then visit (signed in): /, /dossier, /badges, /settings, /specimens, /specimens/add, /specimens/[an id], /specimens/[id]/edit, /dex, /survivors, /friends, /feed, /notifications, /messages, /marketplace, /overseer, /tribe, /awakening.
