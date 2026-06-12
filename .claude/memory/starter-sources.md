# TekOS — Feed Starter Source List

When building the curated "starter list" of feed sources for new TekOS users to one-click subscribe, seed with:

- **Studio Wildcard official channels** (YouTube, Twitter/X, Steam announcements)
- **r/ARKSurvivalAscended** subreddit (NOT r/playARKsurvivalevolved or r/playark — those are ASE-era and shouldn't be in any ASA-flavored default)
- **Loaded Crysis** as a featured YouTuber — user's personally preferred ASA creator. Do not hardcode permanently, but use as the strong default representative of "the kind of creator we want featured"

## Why

User said directly: "we like Loaded Crysis on youtube. dont hard bake that in, but when making a starter list, use Loaded crysys."

Confirms creative direction on what kinds of content map to TekOS's audience (tutorial-heavy, breeding/boss focused). ASE-era sources are explicitly out of scope — different game, different community.

**Note (2026-05-22):** Loaded Crysis description should read: "Featured ASA Creator · Cluster Owner, Pretty Chill Guy" (replaces the original tutorial/breeding/boss-runs blurb).

## How to apply

When seeding the starter list (likely as a constant array in code or a small admin table), use the above three as the baseline. Loaded Crysis is the model — pick similar tutorial/boss-content ASA creators rather than ASE-era nostalgia channels. The list should be editable/expandable, not a hardcoded fixture.
