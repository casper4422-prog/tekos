# ARK Boss Arena Caps

**Never backfill `maxPlayers` / `maxTames` from memory or guesses — always get the canonical numbers from `ark.wiki.gg` or the user.**

## Canonical ASA boss arena caps (per ark.wiki.gg/wiki/Boss_Arenas, verified 2026-05-30)

- **All standard arenas: 10 survivors / 20 tames.** Brood / Mega / Dragon / Manticore / Center combo / Rockwell / King Titan / Nunatak / Grendel / Lost King & Queen / Hydraskos / Natrix / Thodes / Thanatos / Crystal Wyvern Queen / Dinopithecus King / Fenrisúlfr — all 10/20.
- **Tek Cave (Overseer) exception:** 10 survivors / 40 tames TOTAL but only **20 per warp**. Use 20 in war-room UIs since that's the practical per-engagement cap.
- **Field tames (Forest / Ice / Desert Titan), world bosses (Iceworm Queen, Thanatos), Astraeos minibosses, coming-soon stubs:** default to 10/20 — same cap as standard arenas, matches the war-room flow.

## Why

I got the same number wrong ≥5 times before this rule got written down. Wrong caps break the readiness widget, squad slot grid, and creature-commit limit. The user verifies in-game so the cost of a wrong number is the user's annoyance, not silent breakage.

## How to apply

When touching the `BOSSES` array in [`src/routes/overseer/+page.svelte`](../../src/routes/overseer/+page.svelte) or any `maxPlayers` / `maxTames` field:
- Default is **10 / 20** for every boss unless this memory says otherwise
- If a new boss/map ships, look it up on `ark.wiki.gg` BEFORE picking a number
- Never invent numbers based on "ASA standard" — get them from the wiki or the user

## Related risk

Tribute amounts on the same array were ALSO invented (5/10/15 trophies per tier) in m5 without verification. Treat those with the same skepticism — get the real per-tier item counts from the user or `ark.wiki.gg`, don't make them up.
