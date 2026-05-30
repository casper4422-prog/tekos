<script lang="ts">
    import { MAP_BOSSES, MAP_NAMES, ULTIMATE_BADGES, SPECIAL_ACHIEVEMENTS, type MapId } from '$lib/mapBosses';
    import type { RoleKey, RoleTier } from '$lib/badges';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // ── Static badge definitions ──────────────────────────────────────────
    const bossReadyTiers = [
        { tier: 'gamma', label: 'Gamma Ready',  glyph: 'γ', hp: 75,  mel: 75 },
        { tier: 'beta',  label: 'Beta Ready',   glyph: 'β', hp: 100, mel: 100 },
        { tier: 'alpha', label: 'Alpha Ready',  glyph: 'α', hp: 125, mel: 125 },
        { tier: 'titan', label: 'Titan Slayer', glyph: '◆', hp: 150, mel: 150 }
    ] as const;

    const bloodlineTiers = [
        { tier: 'bronze',  label: 'Bronze Bloodline',  glyph: '◇', thresh: 45 },
        { tier: 'silver',  label: 'Silver Bloodline',  glyph: '◈', thresh: 50 },
        { tier: 'gold',    label: 'Gold Bloodline',    glyph: '◆', thresh: 55 },
        { tier: 'diamond', label: 'Diamond Bloodline', glyph: '✦', thresh: 60 }
    ] as const;

    const underdogTiers = [
        { tier: 'champion', label: 'Underdog Champion', glyph: '◊', thresh: 90  },
        { tier: 'hero',     label: 'Underdog Hero',     glyph: '◇', thresh: 115 },
        { tier: 'legend',   label: 'Underdog Legend',   glyph: '◆', thresh: 140 },
        { tier: 'titan',    label: 'Underdog Titan',    glyph: '✦', thresh: 160 }
    ] as const;

    const specialistRoles: Array<{
        key: RoleKey;
        label: string;
        icon: string;
        primary: string;
        tiers: Array<{ tier: RoleTier; label: string; req: string }>;
    }> = [
        {
            key: 'tank', label: 'Tank', icon: '🛡', primary: 'High HP — soaks boss damage',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'HP ≥ 175' },
                { tier: 'elite',     label: 'Elite',     req: 'HP ≥ 200' },
                { tier: 'apex',      label: 'Apex',      req: 'HP ≥ 225' },
                { tier: 'legendary', label: 'Legendary', req: 'HP ≥ 250' }
            ]
        },
        {
            key: 'dps', label: 'DPS', icon: '⚔', primary: 'High Melee — burst damage',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'MEL ≥ 175' },
                { tier: 'elite',     label: 'Elite',     req: 'MEL ≥ 200' },
                { tier: 'apex',      label: 'Apex',      req: 'MEL ≥ 225' },
                { tier: 'legendary', label: 'Legendary', req: 'MEL ≥ 250' }
            ]
        },
        {
            key: 'bruiser', label: 'Bruiser', icon: '⚒', primary: 'HP + Weight — hits hard, hauls back',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'HP ≥ 125 · WGT ≥ 125' },
                { tier: 'elite',     label: 'Elite',     req: 'HP ≥ 150 · WGT ≥ 150' },
                { tier: 'apex',      label: 'Apex',      req: 'HP ≥ 175 · WGT ≥ 175' },
                { tier: 'legendary', label: 'Legendary', req: 'HP ≥ 200 · WGT ≥ 200' }
            ]
        },
        {
            key: 'vanguard', label: 'Vanguard', icon: '◈', primary: 'HP + Stamina — frontline endurance',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'HP ≥ 100 · STA ≥ 125' },
                { tier: 'elite',     label: 'Elite',     req: 'HP ≥ 125 · STA ≥ 150' },
                { tier: 'apex',      label: 'Apex',      req: 'HP ≥ 150 · STA ≥ 175' },
                { tier: 'legendary', label: 'Legendary', req: 'HP ≥ 175 · STA ≥ 200' }
            ]
        },
        {
            key: 'packmaster', label: 'Packmaster', icon: '⊞', primary: 'High Weight — hauls for the tribe',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'WGT ≥ 175' },
                { tier: 'elite',     label: 'Elite',     req: 'WGT ≥ 200' },
                { tier: 'apex',      label: 'Apex',      req: 'WGT ≥ 225' },
                { tier: 'legendary', label: 'Legendary', req: 'WGT ≥ 250' }
            ]
        },
        {
            key: 'endurance', label: 'Endurance', icon: '⟳', primary: 'High Oxygen — long fights',
            tiers: [
                { tier: 'standard',  label: 'Standard',  req: 'OXY ≥ 150' },
                { tier: 'elite',     label: 'Elite',     req: 'OXY ≥ 175' },
                { tier: 'apex',      label: 'Apex',      req: 'OXY ≥ 200' },
                { tier: 'legendary', label: 'Legendary', req: 'OXY ≥ 225' }
            ]
        }
    ];

    // Underdog uses Boss Ready math but only species NOT on the meta-exclusion list
    // (UNDERDOG_META_EXCLUDE in lib/badges). The page surfaces eligible species
    // inline rather than excluded ones — easier to read as "what counts."
    const underdogEligibleSamples = 'Carno, Sabertooth, Direwolf, Pteranodon, Argentavis, Pachy';

    // ── Earned-state lookups ──────────────────────────────────────────────
    // Boss Ready + Specialist Roles credit cumulatively: a Titan-tier species also counts
    // toward Alpha/Beta/Gamma cards (you had to clear those tiers first). Same logic for
    // Specialist Legendary → Apex/Elite/Standard.
    const bossTierOrder: Record<string, number> = { gamma: 1, beta: 2, alpha: 3, titan: 4 };
    const roleTierOrder: Record<string, number> = { standard: 1, elite: 2, apex: 3, legendary: 4 };

    function bossReadyEarned(tier: string) {
        const min = bossTierOrder[tier] ?? 0;
        return (data.badgeWall.bossReady ?? []).filter(b => (bossTierOrder[b.tier ?? ''] ?? 0) >= min);
    }
    function bloodlineEarned(tier: string) {
        return (data.badgeWall.bloodline ?? []).filter(b => b.tier === tier);
    }
    function underdogEarned(tier: string) {
        return (data.badgeWall.underdog ?? []).filter(b => b.tier === tier);
    }
    function specialistEarned(role: RoleKey, tier: RoleTier) {
        const min = roleTierOrder[tier] ?? 0;
        return (data.badgeWall.roles ?? []).filter(r => r.role === role && (roleTierOrder[r.tier] ?? 0) >= min);
    }

    function speciesList(arr: Array<{ species: string }>, max = 4): string {
        if (arr.length === 0) return '';
        const sliced = arr.slice(0, max).map(e => e.species).join(', ');
        return arr.length > max ? `${sliced} +${arr.length - max} more` : sliced;
    }

    // Variant for Boss Ready cards — annotates each species with its current highest tier so a
    // Gamma card showing a Titan-tier Rex reads "Rex (Titan), Theri (Alpha) ..." instead of just
    // plain names (otherwise the lower-tier cards look misleading post tier-progression credit).
    const bossTierLabel: Record<string, string> = { gamma: 'γ', beta: 'β', alpha: 'α', titan: '◆' };
    function speciesListWithBossTier(arr: Array<{ species: string; tier: string | null }>, max = 4): string {
        if (arr.length === 0) return '';
        const fmt = (e: { species: string; tier: string | null }) =>
            e.tier ? `${e.species} (${bossTierLabel[e.tier] ?? e.tier})` : e.species;
        const sliced = arr.slice(0, max).map(fmt).join(', ');
        return arr.length > max ? `${sliced} +${arr.length - max} more` : sliced;
    }

    type MapBoss = typeof MAP_BOSSES[number];
    const mapsWithBosses = $derived.by(() => {
        const grouped = new Map<MapId, MapBoss[]>();
        for (const b of MAP_BOSSES) {
            if (!grouped.has(b.map)) grouped.set(b.map, []);
            grouped.get(b.map)!.push(b);
        }
        return Array.from(grouped.entries()).map(([mapId, bosses]) => ({ mapId, bosses }));
    });

    const totalEarned = $derived(data.totals?.earned ?? 0);
    const rankName = $derived(data.rank?.current?.name ?? 'Beach Bob');
    const nextRank = $derived(data.rank?.next?.name ?? null);
    const nextProgress = $derived(data.rank?.progressLabel ?? '');
</script>

<svelte:head>
    <title>⬡ TEKOS — Badges</title>
</svelte:head>

<div class="stage">

    {#snippet badgesSub()}
        <span class="prefix">›</span>
        YOU ARE: <span class="rank-tag">{rankName.toUpperCase()}</span> ·
        <span class="num">{totalEarned}</span> BADGES EARNED{#if nextRank} · NEXT: {nextRank.toUpperCase()} ({nextProgress}){/if}
    {/snippet}
    <PageHeader
        title="Badges"
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Badges' }
        ]}
        subContent={badgesSub}
    />

    <!-- ────────────── BOSS READY ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Boss Ready</h2>
            <p class="bs-desc">
                One badge per tier, per species. Both HP and Melee — base + mutation levels — must clear the threshold.
                Your strongest specimen of each species sets that species' tier.
            </p>
        </header>
        <div class="badge-grid">
            {#each bossReadyTiers as t}
                {@const earned = bossReadyEarned(t.tier)}
                <div class="badge-card" class:earned={earned.length > 0}>
                    <div class="badge-glyph">{t.glyph}</div>
                    <div class="badge-name">{t.label}</div>
                    <div class="badge-criteria">HP ≥ {t.hp} AND MEL ≥ {t.mel}</div>
                    {#if earned.length > 0}
                        <div class="badge-status earned">⬡ {earned.length} {earned.length === 1 ? 'species' : 'species'} · {speciesListWithBossTier(earned)}</div>
                    {:else}
                        <div class="badge-status locked">🔒 Not yet earned</div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ────────────── PRIZE BLOODLINE ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Prize Bloodline</h2>
            <p class="bs-desc">
                Five core stats (HP, Stamina, Food, Weight, Melee) at base ≥ the tier threshold.
                Base values only — mutations and domestic levels don't count.
            </p>
        </header>
        <div class="badge-grid">
            {#each bloodlineTiers as t}
                {@const earned = bloodlineEarned(t.tier)}
                <div class="badge-card" class:earned={earned.length > 0}>
                    <div class="badge-glyph">{t.glyph}</div>
                    <div class="badge-name">{t.label}</div>
                    <div class="badge-criteria">All 5 stats ≥ {t.thresh} base</div>
                    {#if earned.length > 0}
                        <div class="badge-status earned">⬡ {earned.length} {earned.length === 1 ? 'species earned' : 'species earned'}</div>
                    {:else}
                        <div class="badge-status locked">🔒 Not yet earned</div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ────────────── SPECIALIST ROLES ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Specialist Roles</h2>
            <p class="bs-desc">
                Six roles, each gated on one or two stats: HP, Stamina, Weight, Melee. Four tiers per role
                — Standard, Elite, Apex, Legendary. One badge per (species, role, tier).
            </p>
        </header>
        {#each specialistRoles as role}
            <div class="role-group">
                <div class="role-head">
                    <span class="role-icon">{role.icon}</span>
                    <span class="role-name">{role.label}</span>
                    <span class="role-primary">{role.primary}</span>
                </div>
                <div class="badge-grid four">
                    {#each role.tiers as t}
                        {@const earned = specialistEarned(role.key, t.tier)}
                        <div class="badge-card small" class:earned={earned.length > 0}>
                            <div class="badge-name">{t.label}</div>
                            <div class="badge-criteria">{t.req}</div>
                            {#if earned.length > 0}
                                <div class="badge-status earned">⬡ {earned.length} {earned.length === 1 ? 'sp' : 'species'}</div>
                            {:else}
                                <div class="badge-status locked">🔒 Locked</div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </section>

    <!-- ────────────── UNDERDOG ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Underdog</h2>
            <p class="bs-desc">
                Same math as Boss Ready (HP and Melee thresholds), but only non-meta species qualify.
                Eligible: {underdogEligibleSamples}, and most other non-meta tames.
            </p>
        </header>
        <div class="badge-grid">
            {#each underdogTiers as t}
                {@const earned = underdogEarned(t.tier)}
                <div class="badge-card" class:earned={earned.length > 0}>
                    <div class="badge-glyph">{t.glyph}</div>
                    <div class="badge-name">{t.label}</div>
                    <div class="badge-criteria">HP ≥ {t.thresh} AND MEL ≥ {t.thresh} (non-meta species)</div>
                    {#if earned.length > 0}
                        <div class="badge-status earned">⬡ {earned.length} {earned.length === 1 ? 'species' : 'species'} · {speciesList(earned)}</div>
                    {:else}
                        <div class="badge-status locked">🔒 Not yet earned</div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ────────────── MAP BOSS BADGES ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Map Boss Badges</h2>
            <p class="bs-desc">
                Each badge requires defeating the boss with at least one creature of the listed
                species at the listed tier — and clearing any stamina floor noted on the card.
            </p>
        </header>
        {#each mapsWithBosses as group}
            <div class="map-group">
                <div class="map-head">{MAP_NAMES[group.mapId]}</div>
                <div class="badge-grid">
                    {#each group.bosses as boss}
                        {@const status = data.mapBossEarned?.[boss.id] ?? { earned: false, reason: undefined as string|undefined }}
                        <div class="badge-card" class:earned={status.earned}>
                            <div class="badge-glyph" style="color:{boss.iconColor}">⬡</div>
                            <div class="badge-name">{boss.name}</div>
                            <div class="badge-criteria">{boss.description}</div>
                            {#if status.earned}
                                <div class="badge-status earned">⬡ Earned</div>
                            {:else}
                                <div class="badge-status locked">🔒 Not yet earned</div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/each}
    </section>

    <!-- ────────────── ULTIMATE BADGES ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Ultimate Badges</h2>
            <p class="bs-desc">
                Cross-map achievements. Each one gates on multiple boss kills or a specific challenge condition
                (e.g. clearing every released map's final boss).
            </p>
        </header>
        <div class="badge-grid">
            {#each ULTIMATE_BADGES as u}
                {@const status = data.ultimateEarned?.[u.id] ?? { earned: false, reason: undefined as string|undefined }}
                <div class="badge-card" class:earned={status.earned}>
                    <div class="badge-glyph" style="color:{u.iconColor}">⬢</div>
                    <div class="badge-name">{u.name}</div>
                    <div class="badge-criteria">{u.description}</div>
                    {#if status.earned}
                        <div class="badge-status earned">⬡ Earned{status.reason ? ` · ${status.reason}` : ''}</div>
                    {:else}
                        <div class="badge-status locked">🔒 {status.reason ?? 'Not yet earned'}</div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ────────────── SPECIAL ACHIEVEMENTS ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Special Achievements</h2>
            <p class="bs-desc">
                Long-arc network goals. Earned by hitting a target count — species cleared, boss runs logged,
                friends helped, etc. Progress shows current count toward the goal.
            </p>
        </header>
        <div class="badge-grid">
            {#each SPECIAL_ACHIEVEMENTS as s}
                {@const status = data.specialEarned?.[s.id] ?? { earned: false, current: 0, target: s.target, reason: undefined as string|undefined }}
                <div class="badge-card" class:earned={status.earned}>
                    <div class="badge-glyph">★</div>
                    <div class="badge-name">{s.name}</div>
                    <div class="badge-criteria">{s.description}</div>
                    {#if status.earned}
                        <div class="badge-status earned">⬡ Earned · {status.current} / {status.target}</div>
                    {:else}
                        <div class="badge-status locked">🔒 {status.current} / {status.target}{status.reason ? ` · ${status.reason}` : ''}</div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ────────────── BREEDER RANK LADDER (collapsed reference) ────────────── -->
    <section class="badge-section">
        <header class="bs-head">
            <h2 class="bs-title">Breeder Rank</h2>
            <p class="bs-desc">
                Auto-derived from your Prize Bloodline badges. Eight ranks, each gated on
                "first of that tier" or "that tier on five species." Your current rank shows
                at the top of this page.
            </p>
        </header>
        <div class="rank-ladder">
            {#each data.rank?.ladder ?? [] as step, i}
                <div class="rank-step" class:achieved={step.achieved} class:current={data.rank?.current?.id === step.id}>
                    <span class="rank-num">{i + 1}</span>
                    <span class="rank-name">{step.name}</span>
                    {#if step.achieved}<span class="rank-mark">⬡</span>{:else}<span class="rank-mark locked">🔒</span>{/if}
                </div>
            {/each}
        </div>
    </section>

</div>

<style>
.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 100px;
    max-width: 1200px;
    margin: 0 auto;
}

/* Sub-header tokens (rendered via PageHeader's subContent slot) */
.prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }
.rank-tag {
    color: var(--tek-blue);
    font-weight: 700;
    text-shadow: 0 0 6px var(--tek-blue-glow);
    letter-spacing: 0.14em;
}

/* ── Section ──────────────────────────────────────────────────────────── */
.badge-section { margin-top: 48px; }
.badge-section:first-of-type { margin-top: 36px; }
.bs-head {
    margin-bottom: 18px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
    padding-bottom: 14px;
}
.bs-title {
    font-family: var(--tek-display);
    font-size: clamp(1.05rem, 2.4vw, 1.4rem);
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-blue);
    text-shadow: 0 0 12px rgba(0,180,255,0.30);
    margin: 0 0 6px;
}
.bs-desc {
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    letter-spacing: 0.03em;
    color: var(--tek-text-dim);
    line-height: 1.65;
    margin: 0;
    max-width: 780px;
}

/* ── Grid + cards ─────────────────────────────────────────────────────── */
.badge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 14px;
}
.badge-grid.four { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 760px) {
    .badge-grid.four { grid-template-columns: repeat(2, 1fr); }
}

.badge-card {
    background: linear-gradient(160deg, rgba(10,18,44,0.55) 0%, rgba(4,8,20,0.85) 100%);
    border: 1px solid rgba(100,116,139,0.18);
    padding: 16px 18px;
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    opacity: 0.55;
    transition: opacity 0.2s, border-color 0.2s, box-shadow 0.2s;
    display: flex;
    flex-direction: column;
}
.badge-card.earned {
    opacity: 1;
    border-color: rgba(0,180,255,0.40);
    background: linear-gradient(160deg, rgba(0,180,255,0.08) 0%, rgba(10,18,44,0.85) 100%);
    box-shadow: inset 0 0 0 1px rgba(0,180,255,0.06), 0 0 18px rgba(0,180,255,0.12);
}
.badge-card.small { padding: 12px 14px; }

.badge-glyph {
    font-family: var(--tek-display);
    font-size: 1.6rem;
    font-weight: 900;
    line-height: 1;
    margin-bottom: 10px;
    color: var(--tek-text-faint);
    transition: color 0.2s, text-shadow 0.2s;
}
.badge-card.earned .badge-glyph {
    color: var(--tek-blue);
    text-shadow: 0 0 8px rgba(0,180,255,0.45);
}
.badge-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 6px;
    line-height: 1.25;
}
.badge-card.small .badge-name {
    font-size: 0.78rem;
    margin-bottom: 4px;
}
.badge-criteria {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.02em;
    line-height: 1.5;
    margin-bottom: 12px;
    flex: 1;
}
.badge-card.small .badge-criteria {
    font-size: 0.66rem;
    margin-bottom: 8px;
}
.badge-status {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    padding-top: 8px;
    border-top: 1px solid rgba(100,116,139,0.14);
    margin-top: auto;
}
.badge-status.earned   { color: var(--tek-blue); }
.badge-status.locked   { color: var(--tek-text-faint); }
.badge-card.small .badge-status { font-size: 0.62rem; padding-top: 6px; }

/* ── Specialist role groups ───────────────────────────────────────────── */
.role-group { margin-top: 22px; }
.role-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}
.role-icon {
    font-size: 1.15rem;
    color: var(--tek-blue);
    line-height: 1;
}
.role-name {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.role-primary {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    color: var(--tek-text-dim);
}

/* ── Map group ────────────────────────────────────────────────────────── */
.map-group { margin-top: 26px; }
.map-group:first-of-type { margin-top: 4px; }
.map-head {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(100,116,139,0.16);
}

/* ── Rank ladder strip (collapsed) ────────────────────────────────────── */
.rank-ladder {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.rank-step {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    background: rgba(10,18,44,0.45);
    border: 1px solid rgba(100,116,139,0.15);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    opacity: 0.55;
    transition: opacity 0.2s, border-color 0.2s, background 0.2s;
}
.rank-step.achieved {
    opacity: 1;
    border-color: rgba(0,180,255,0.30);
}
.rank-step.current {
    background: rgba(0,180,255,0.10);
    border-color: var(--tek-blue);
    box-shadow: 0 0 14px rgba(0,180,255,0.25);
}
.rank-num {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.10em;
    min-width: 18px;
}
.rank-step.achieved .rank-num { color: var(--tek-blue); }
.rank-name {
    flex: 1;
    font-family: var(--tek-display);
    font-size: 0.84rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.rank-mark {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-blue);
}
.rank-mark.locked { color: var(--tek-text-faint); }
</style>
