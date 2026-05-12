<script lang="ts">
    import { Plus, Search, Grid3X3, List, Dna } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import BloodlineBadge from '$lib/components/BloodlineBadge.svelte';
    import { computeBadges, getStat } from '$lib/badges';

    let { data }: { data: PageData } = $props();

    type View = 'list' | 'grid';
    let view = $state<View>('grid');
    let search = $state('');
    let speciesFilter = $state<string>('');

    const STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;

    // Unique species in vault
    const speciesList = $derived(
        Array.from(new Set(data.creatures.map(c => c.species))).sort()
    );

    const filtered = $derived(
        data.creatures.filter(c => {
            if (speciesFilter && c.species !== speciesFilter) return false;
            if (!search.trim()) return true;
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q)
                || c.species.toLowerCase().includes(q)
                || c.notes?.toLowerCase().includes(q);
        })
    );

    function totalLevel(c: typeof data.creatures[0]) {
        return STATS.reduce((sum, s) => sum + getStat(c.baseStats, s) + getStat(c.mutations, s) * 2, 0);
    }
</script>

<svelte:head>
    <title>⬡ TekOS — Vault</title>
</svelte:head>

<div class="tek-stage">
    <div class="vault-header">
        <PageHeader
            title="Vault"
            crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Vault' }]}
            sub="Every specimen you've logged. Stats, mutations, lineage — searchable."
        />
        <a class="tek-btn-v2 solid" href="/specimens/add">
            <Plus size={14} strokeWidth={2.5} />
            Add Specimen
        </a>
    </div>

    <!-- Telemetry -->
    <div class="vault-telemetry">
        <div class="tel-cell">
            <div class="tel-val">{data.creatures.length}</div>
            <div class="tel-label">Specimens</div>
        </div>
        <div class="tel-cell">
            <div class="tel-val">{speciesList.length}</div>
            <div class="tel-label">Species</div>
        </div>
        <div class="tel-cell">
            <div class="tel-val">
                {data.creatures.reduce((s, c) =>
                    s + Object.values(c.mutations ?? {}).reduce((a, b) => a + (b || 0), 0), 0
                )}
            </div>
            <div class="tel-label">Total Mutations</div>
        </div>
    </div>

    <!-- Filter bar -->
    <div class="vault-filters">
        <div class="search-wrap">
            <Search size={14} strokeWidth={2} class="search-icon" />
            <input type="text" class="search-input" bind:value={search}
                placeholder="Search by name, species, or notes…" />
        </div>

        <select class="tek-select-v2" bind:value={speciesFilter} style="max-width: 220px;">
            <option value="">All species ({data.creatures.length})</option>
            {#each speciesList as sp}
                <option value={sp}>{sp}</option>
            {/each}
        </select>

        <div class="view-toggle">
            <button class="view-btn" class:active={view === 'grid'} onclick={() => view = 'grid'} title="Grid">
                <Grid3X3 size={14} strokeWidth={2} />
            </button>
            <button class="view-btn" class:active={view === 'list'} onclick={() => view = 'list'} title="List">
                <List size={14} strokeWidth={2} />
            </button>
        </div>
    </div>

    <!-- Empty state -->
    {#if data.creatures.length === 0}
        <div class="tek-empty">
            <div class="icon"><Dna size={28} strokeWidth={1.5} /></div>
            <div class="title">Your vault is empty</div>
            <div class="flavor">"The wild keeps its own count. Add your first specimen and TekOS starts keeping yours."</div>
            <div style="margin-top: 18px;">
                <a class="tek-btn-v2 solid" href="/specimens/add">
                    <Plus size={14} strokeWidth={2.5} />
                    Add First Specimen
                </a>
            </div>
        </div>
    {:else if filtered.length === 0}
        <div class="tek-empty">
            <div class="icon">⬡</div>
            <div class="title">No matches</div>
            <div class="flavor">"The wild is quiet on this one."</div>
        </div>
    {:else if view === 'grid'}
        <!-- ═════════ GRID VIEW ═════════ -->
        <div class="vault-grid">
            {#each filtered as c}
                {@const badges = computeBadges(c.baseStats, c.mutations)}
                <a class="vault-card" href="/specimens/{c.id}">
                    <div class="vc-head">
                        <div class="vc-species">{c.species.toUpperCase()}</div>
                        <div class="vc-meta">
                            <span class="gender" class:m={c.gender?.toLowerCase() === 'male'} class:f={c.gender?.toLowerCase() === 'female'}>
                                {c.gender === 'Female' ? '♀' : c.gender === 'Male' ? '♂' : '?'}
                            </span>
                            <span>LVL {c.level}</span>
                        </div>
                    </div>
                    <div class="vc-name">{c.name}</div>

                    <div class="vc-stats">
                        {#each STATS as s}
                            {@const base = getStat(c.baseStats, s)}
                            {@const mut  = getStat(c.mutations, s)}
                            <div class="vc-stat-row">
                                <span class="vc-stat-label">{s}</span>
                                <span class="vc-stat-base">{base}</span>
                                <span class="vc-stat-mut" class:has-mut={mut > 0}>
                                    {mut > 0 ? `+${mut}` : '·'}
                                </span>
                            </div>
                        {/each}
                    </div>

                    {#if badges.bloodline || badges.bossReady}
                        <div class="vc-badges">
                            <BloodlineBadge base={c.baseStats} />
                            {#if badges.bossReady}
                                <span class="tier-pill {badges.bossReady}">
                                    {badges.bossReady === 'titan' ? '◆ TITAN' :
                                     badges.bossReady === 'alpha' ? 'α ALPHA' :
                                     badges.bossReady === 'beta'  ? 'β BETA'  :
                                     'γ GAMMA'} READY
                                </span>
                            {/if}
                        </div>
                    {/if}
                </a>
            {/each}
        </div>
    {:else}
        <!-- ═════════ LIST VIEW ═════════ -->
        <div class="vault-list">
            <div class="list-head">
                <div>Name</div>
                <div>Species</div>
                <div class="hide-sm">Level</div>
                {#each STATS as s}<div class="stat-col hide-md">{s}</div>{/each}
                <div>Badges</div>
            </div>
            {#each filtered as c}
                {@const badges = computeBadges(c.baseStats, c.mutations)}
                <a class="list-row" href="/specimens/{c.id}">
                    <div class="lr-name">
                        <span class="gender" class:m={c.gender?.toLowerCase() === 'male'} class:f={c.gender?.toLowerCase() === 'female'}>
                            {c.gender === 'Female' ? '♀' : c.gender === 'Male' ? '♂' : '?'}
                        </span>
                        {c.name}
                    </div>
                    <div class="lr-species">{c.species}</div>
                    <div class="lr-level hide-sm">{c.level}</div>
                    {#each STATS as s}
                        {@const base = getStat(c.baseStats, s)}
                        {@const mut  = getStat(c.mutations, s)}
                        <div class="stat-col hide-md">
                            <span class="lr-stat-base">{base}</span>
                            {#if mut > 0}<span class="lr-stat-mut">+{mut}</span>{/if}
                        </div>
                    {/each}
                    <div class="lr-badges">
                        <BloodlineBadge base={c.baseStats} />
                        {#if badges.bossReady}
                            <span class="tier-pill {badges.bossReady}">
                                {badges.bossReady === 'titan' ? '◆' :
                                 badges.bossReady === 'alpha' ? 'α' :
                                 badges.bossReady === 'beta'  ? 'β' : 'γ'}
                            </span>
                        {/if}
                    </div>
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
.vault-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
}
.vault-header :global(.tek-page-header) { margin-bottom: 0; }

/* Telemetry */
.vault-telemetry {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
}
@media (max-width: 600px) { .vault-telemetry { grid-template-columns: 1fr; } }
.tel-cell {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 16px;
}
.tel-cell::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
.tel-val {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.tel-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 3px;
}

/* Filter bar */
.vault-filters {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 240px; }
.search-wrap :global(.search-icon) {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-blue);
    pointer-events: none;
}
.search-input {
    width: 100%;
    background: rgba(5,8,18,0.7);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    padding: 10px 14px 10px 34px;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
}
.search-input::placeholder { color: var(--tek-text-faint); }
.search-input:focus {
    outline: none;
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 12px rgba(0,180,255,0.25);
}

.view-toggle {
    display: flex;
    gap: 2px;
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    padding: 2px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.view-btn {
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    padding: 8px 10px;
    cursor: pointer;
    transition: all 0.15s;
}
.view-btn.active {
    background: rgba(0,180,255,0.15);
    color: var(--tek-blue);
}

/* Grid view */
.vault-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}
.vault-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 16px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.vault-card::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
.vault-card:hover {
    transform: translateY(-3px);
    border-color: var(--tek-blue);
    box-shadow: 0 8px 20px rgba(0,180,255,0.18);
}
.vc-head { display: flex; justify-content: space-between; align-items: baseline; }
.vc-species {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: var(--tek-blue);
    text-transform: uppercase;
}
.vc-meta {
    display: flex;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
}
.vc-meta .gender.m { color: var(--tek-blue); }
.vc-meta .gender.f { color: var(--tek-pink); }
.vc-name {
    font-family: var(--tek-display);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1.15;
    word-break: break-word;
}
.vc-stats {
    display: grid;
    grid-template-columns: 1fr;
    border-top: 1px solid rgba(0,180,255,0.10);
    padding-top: 8px;
}
.vc-stat-row {
    display: grid;
    grid-template-columns: 55px 1fr 1fr;
    gap: 10px;
    padding: 3px 0;
    align-items: baseline;
}
.vc-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.vc-stat-base {
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    color: var(--tek-text);
    text-align: right;
}
.vc-stat-mut {
    font-family: var(--tek-mono);
    font-size: 0.82rem;
    text-align: right;
    color: var(--tek-text-faint);
}
.vc-stat-mut.has-mut {
    color: var(--tek-blue);
    text-shadow: 0 0 5px var(--tek-blue-glow);
    font-weight: 700;
}
.vc-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding-top: 6px;
    border-top: 1px solid rgba(0,180,255,0.06);
}

/* List view */
.vault-list {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    overflow-x: auto;
}
.list-head, .list-row {
    display: grid;
    grid-template-columns: 1.4fr 1fr 60px repeat(7, 60px) 150px;
    gap: 8px;
    padding: 10px 14px;
    align-items: center;
}
.list-head {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    background: rgba(5,8,18,0.6);
    border-bottom: 1px solid rgba(0,180,255,0.15);
}
.list-row {
    border-bottom: 1px solid rgba(100,116,139,0.08);
    text-decoration: none;
    color: inherit;
    transition: background 0.15s;
}
.list-row:hover { background: rgba(0,180,255,0.04); }
.list-row:last-child { border-bottom: none; }
.lr-name {
    font-family: var(--tek-font);
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--tek-text);
    display: flex;
    align-items: center;
    gap: 8px;
}
.lr-name .gender { color: var(--tek-text-dim); font-size: 0.92rem; }
.lr-name .gender.m { color: var(--tek-blue); }
.lr-name .gender.f { color: var(--tek-pink); }
.lr-species {
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    color: var(--tek-text-dim);
}
.lr-level {
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    color: var(--tek-text);
    text-align: right;
}
.stat-col {
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    text-align: right;
}
.lr-stat-base { color: var(--tek-text); }
.lr-stat-mut { color: var(--tek-blue); text-shadow: 0 0 5px var(--tek-blue-glow); font-weight: 700; margin-left: 4px; }
.lr-badges { display: flex; flex-wrap: wrap; gap: 4px; }

@media (max-width: 900px) {
    .hide-md { display: none; }
    .list-head, .list-row { grid-template-columns: 1.4fr 1fr 60px 150px; }
}
@media (max-width: 500px) {
    .hide-sm { display: none; }
    .list-head, .list-row { grid-template-columns: 1.6fr 1fr 130px; }
}
</style>
