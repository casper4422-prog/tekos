<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import CreatureNotesFields from '$lib/components/CreatureNotesFields.svelte';
    import { computeBadges } from '$lib/badges';

    let { data }: { data: PageData } = $props();

    type StatKey = 'HP' | 'STA' | 'OXY' | 'FOOD' | 'WGT' | 'MEL' | 'CRA';
    const STATS: StatKey[] = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'];

    const LONG: Record<StatKey, string> = {
        HP: 'Health', STA: 'Stamina', OXY: 'Oxygen', FOOD: 'Food',
        WGT: 'Weight', MEL: 'Melee', CRA: 'Crafting'
    };

    const c = data.creature as Record<string, unknown> & { id: number };
    const bs = (c.baseStats as Record<string, number>) ?? {};
    const ms = (c.mutations as Record<string, number>) ?? {};
    const initialColorRegions = Array.isArray(c.colorRegions)
        ? [...(c.colorRegions as string[])]
        : ['','','','','',''];
    while (initialColorRegions.length < 6) initialColorRegions.push('');

    let saving = $state(false);
    let error  = $state('');

    let fName    = $state(String(c.name ?? ''));
    let fSpecies = $state(String(c.species ?? ''));
    let fLevel   = $state(Number(c.level ?? 1));
    let fGender  = $state<'Male' | 'Female' | 'Unknown'>(
        c.gender === 'Male' || c.gender === 'Female' || c.gender === 'Unknown'
            ? c.gender as 'Male' | 'Female' | 'Unknown'
            : 'Unknown'
    );
    let fServer  = $state(String(c.server ?? ''));
    let fNotes   = $state(String(c.notes ?? ''));
    let fAvailBreed    = $state(c.availableForBreeding === true);
    let fAvailTrade    = $state(c.availableForTrade === true);
    let fColorRegions  = $state<string[]>(initialColorRegions);
    let fStats   = $state<Record<StatKey, number>>({
        HP: bs.Health ?? 0, STA: bs.Stamina ?? 0, OXY: bs.Oxygen ?? 0,
        FOOD: bs.Food ?? 0, WGT: bs.Weight ?? 0, MEL: bs.Melee ?? 0,
        CRA: bs.Crafting ?? 0
    });
    let fMuts = $state<Record<StatKey, number>>({
        HP: ms.Health ?? 0, STA: ms.Stamina ?? 0, OXY: ms.Oxygen ?? 0,
        FOOD: ms.Food ?? 0, WGT: ms.Weight ?? 0, MEL: ms.Melee ?? 0,
        CRA: ms.Crafting ?? 0
    });

    let speciesList = $state<string[]>([]);

    onMount(() => {
        const db = window.EXPANDED_SPECIES_DATABASE;
        if (db) speciesList = Object.keys(db).sort();
    });

    const badges = $derived(computeBadges(
        { Health: fStats.HP, Stamina: fStats.STA, Oxygen: fStats.OXY, Food: fStats.FOOD, Weight: fStats.WGT, Melee: fStats.MEL, Crafting: fStats.CRA },
        { Health: fMuts.HP, Stamina: fMuts.STA, Oxygen: fMuts.OXY, Food: fMuts.FOOD, Weight: fMuts.WGT, Melee: fMuts.MEL, Crafting: fMuts.CRA },
        fSpecies.trim()
    ));

    // Mutations store TOTAL mutation levels, not events — no ×2 multiplier.
    function totalLevel(s: StatKey) { return fStats[s] + fMuts[s]; }

    async function save() {
        if (!fName.trim()) { error = 'Specimen name required.'; return; }
        if (!fSpecies.trim()) { error = 'Species required.'; return; }
        saving = true; error = '';

        const baseStats: Record<string, number> = {};
        const mutations: Record<string, number> = {};
        for (const k of STATS) {
            baseStats[LONG[k]] = fStats[k];
            mutations[LONG[k]] = fMuts[k];
        }

        // Start from the existing data blob so unknown/related fields (statOrigins,
        // isFounder, parents, etc.) round-trip cleanly. We then overwrite the
        // form-controlled fields on top.
        const merged: Record<string, unknown> = { ...c };
        delete merged.id;
        delete merged.createdAt;
        // Retired fields — strip on save so any legacy values on existing
        // creatures are dropped the next time the user edits.
        delete merged.role;
        delete merged.obtainedFrom;
        delete merged.cryoLocation;
        Object.assign(merged, {
            name: fName.trim(),
            species: fSpecies.trim(),
            level: fLevel,
            gender: fGender,
            server: fServer.trim() || undefined,
            notes: fNotes.trim() || undefined,
            baseStats,
            mutations,
            availableForBreeding: fAvailBreed,
            availableForTrade: fAvailTrade,
            colorRegions: fColorRegions.some(s => s.trim()) ? fColorRegions : undefined
        });

        const res = await fetch(`/api/creatures/${c.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
        });
        if (res.ok) {
            goto(`/specimens/${c.id}`);
        } else {
            const b = await res.json().catch(() => ({}));
            error = b.error ?? 'Failed to save';
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>⬡ TekOS — Edit {c.name}</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Edit Specimen"
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Specimens', href: '/specimens' },
            { label: String(c.name ?? 'Specimen'), href: `/specimens/${c.id}` },
            { label: 'Edit' }
        ]}
        sub="Update stats, mutations, lineage."
    />

    <div class="builder-shell">
        <!-- ═════════════ FORM COLUMN ═════════════ -->
        <div class="form-col">
            <!-- Identity -->
            <div class="form-section">
                <div class="form-section-head">
                    <div class="form-section-title">Identity</div>
                </div>
                <div class="field-grid">
                    <div class="field">
                        <div class="field-label">Species <span class="req">*</span></div>
                        <input class="tek-input-v2" list="speciesList" bind:value={fSpecies} />
                        <datalist id="speciesList">
                            {#each speciesList as s}<option value={s}>{s}</option>{/each}
                        </datalist>
                    </div>
                    <div class="field">
                        <div class="field-label">Survivor name <span class="req">*</span></div>
                        <input class="tek-input-v2" bind:value={fName} />
                    </div>
                    <div class="field">
                        <div class="field-label">Level</div>
                        <input class="tek-input-v2" type="number" bind:value={fLevel} min="1" max="999" />
                    </div>
                </div>
                <div class="field-grid cols-2" style="margin-top: 12px;">
                    <div class="field">
                        <div class="field-label">Gender</div>
                        <div class="gender-toggle">
                            <button class="gender-opt" class:active={fGender === 'Male'} onclick={() => fGender = 'Male'}>♂ Male</button>
                            <button class="gender-opt" class:active={fGender === 'Female'} onclick={() => fGender = 'Female'}>♀ Female</button>
                            <button class="gender-opt" class:active={fGender === 'Unknown'} onclick={() => fGender = 'Unknown'}>? Unknown</button>
                        </div>
                    </div>
                    <div class="field">
                        <div class="field-label">Home server</div>
                        <input class="tek-input-v2" bind:value={fServer} />
                    </div>
                </div>
            </div>

            <!-- Stats + Mutations -->
            <div class="form-section">
                <div class="form-section-head">
                    <div class="form-section-title">Base Stats & Mutations</div>
                </div>
                <div class="form-section-hint">
                    Enter total mutation levels per stat (what the in-game UI shows). Total = base + mutations.
                </div>
                <div class="stats-grid">
                    <div class="stats-head">Stat</div>
                    <div class="stats-head r">Base</div>
                    <div class="stats-head r">Mut</div>
                    <div class="stats-head r">Total</div>

                    {#each STATS as s}
                        <div class="stats-stat-label">{s}</div>
                        <input class="stats-input" type="number" min="0" bind:value={fStats[s]} />
                        <input class="stats-input mut" class:has-val={fMuts[s] > 0} type="number" min="0" bind:value={fMuts[s]} />
                        <div class="stats-total"><span class="arrow">→</span><span class="t">{totalLevel(s)}</span></div>
                    {/each}
                </div>
            </div>

            <!-- Availability + Color regions -->
            <div class="form-section optional">
                <div class="form-section-head">
                    <div class="form-section-title">Availability & Colors</div>
                    <div class="optional-tag">Optional</div>
                </div>
                <CreatureNotesFields
                    bind:availableForBreeding={fAvailBreed}
                    bind:availableForTrade={fAvailTrade}
                    bind:colorRegions={fColorRegions}
                />
            </div>

            <!-- Freeform notes -->
            <div class="form-section optional">
                <div class="form-section-head">
                    <div class="form-section-title">Notes</div>
                    <div class="optional-tag">Optional</div>
                </div>
                <textarea class="notes-area" bind:value={fNotes}
                    placeholder="Color mutations, breeding plans, behavioral quirks…"></textarea>
            </div>

            {#if error}
                <div class="form-error">{error}</div>
            {/if}

            <div class="action-bar">
                <a class="tek-btn-v2 ghost" href="/specimens/{c.id}">Cancel</a>
                <div class="spacer"></div>
                <button class="tek-btn-v2 solid" onclick={save} disabled={saving}>
                    {saving ? 'SAVING…' : 'Save Changes'}
                </button>
            </div>
        </div>

        <!-- ═════════════ LIVE PREVIEW ═════════════ -->
        <div class="preview-col">
            <div class="preview-header">
                <span class="live-pip"></span>Live Preview
            </div>
            <div class="preview-card">
                <div class="pv-species">{(fSpecies || '—').toUpperCase()}</div>
                <div class="pv-name" class:placeholder={!fName.trim()}>
                    {fName.trim() || 'Unnamed'}
                </div>
                <div class="pv-meta">
                    <div class="item"><span>LVL</span><span class="v">{fLevel || '—'}</span></div>
                    <div class="item">
                        <span class="gender" class:m={fGender === 'Male'} class:f={fGender === 'Female'}>
                            {fGender === 'Female' ? '♀' : fGender === 'Male' ? '♂' : '?'}
                        </span>
                    </div>
                    {#if fServer.trim()}<div class="item"><span>HOME</span><span class="v">{fServer.trim()}</span></div>{/if}
                </div>

                <div class="pv-stats">
                    <div class="pv-stats-head">
                        <div>Stat</div><div class="r">Base</div><div class="r">Mut</div>
                    </div>
                    {#each STATS as s}
                        <div class="pv-stat-row">
                            <span class="pv-stat-label">{s}</span>
                            <span class="pv-stat-base">{fStats[s]}</span>
                            <span class="pv-stat-mut" class:has-mut={fMuts[s] > 0}>
                                {fMuts[s] > 0 ? `+${fMuts[s]}` : '·'}
                            </span>
                        </div>
                    {/each}
                </div>

                <div class="pv-badges-block">
                    <div class="pv-badges-label">Auto-Computed Badges</div>
                    <div class="pv-badges">
                        {#if badges.bloodline}
                            <div class="pv-badge {badges.bloodline}">
                                {badges.bloodline === 'diamond' ? '✦' :
                                 badges.bloodline === 'gold' ? '◈' : '⬢'} {badges.bloodline.toUpperCase()} BLOODLINE
                            </div>
                        {/if}
                        {#if badges.bossReady}
                            <div class="pv-badge {badges.bossReady}">
                                {badges.bossReady === 'titan' ? '◆ TITAN SLAYER' :
                                 badges.bossReady === 'alpha' ? 'α ALPHA READY' :
                                 badges.bossReady === 'beta'  ? 'β BETA READY'  :
                                 'γ GAMMA READY'}
                            </div>
                        {/if}
                        {#each Object.entries(badges.roles) as [role, tier]}
                            <div class="pv-badge role">
                                {role === 'tank' ? '▣ TANK' :
                                 role === 'dps' ? '⚔ DPS' :
                                 role === 'bruiser' ? '⚒ BRUISER' :
                                 role === 'vanguard' ? '⤳ VANGUARD' :
                                 role === 'packmaster' ? '⚖ PACKMASTER' :
                                 role === 'endurance' ? '⟁ ENDURANCE' :
                                 role.toUpperCase()} · {tier?.toUpperCase()}
                            </div>
                        {/each}
                        {#if badges.underdog}
                            <div class="pv-badge {badges.underdog}">
                                ⬡ {badges.underdog.toUpperCase()} UNDERDOG
                            </div>
                        {/if}
                        {#if !badges.bloodline && !badges.bossReady && Object.keys(badges.roles).length === 0 && !badges.underdog}
                            <div class="pv-badges-empty">No badges yet — keep breeding.</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
.builder-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
    align-items: start;
}
@media (max-width: 1000px) { .builder-shell { grid-template-columns: 1fr; } }
.form-col { min-width: 0; }

.form-section {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 20px 24px 22px;
    margin-bottom: 14px;
}
.form-section::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.form-section.optional::before { background: linear-gradient(180deg, var(--tek-purple), rgba(139,92,246,0.3)); }
.form-section-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px; padding-bottom: 10px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.form-section-title {
    font-family: var(--tek-display);
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.form-section-title::before { content: '▸ '; color: var(--tek-blue); }
.optional-tag {
    font-family: var(--tek-mono);
    font-size: 0.60rem;
    letter-spacing: 0.18em;
    color: var(--tek-purple);
    border: 1px solid rgba(139,92,246,0.40);
    padding: 2px 7px;
    text-transform: uppercase;
}
.form-section-hint {
    font-family: var(--tek-mono);
    font-size: 0.70rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.06em;
    margin-bottom: 12px;
    line-height: 1.5;
}
.form-section-hint code { color: var(--tek-blue); background: rgba(0,180,255,0.08); padding: 1px 5px; }

.field-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; }
.field-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.field-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.field-label .req { color: var(--tek-amber); margin-left: 3px; }

.gender-toggle {
    display: flex; gap: 2px;
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    padding: 2px;
}
.gender-opt {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    padding: 8px 0;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.15s;
}
.gender-opt.active { background: rgba(0,180,255,0.15); color: var(--tek-blue); }

.stats-grid { display: grid; grid-template-columns: 70px 1fr 1fr 60px; gap: 8px 14px; align-items: center; }
.stats-head {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.stats-head.r { text-align: center; }
.stats-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.stats-input {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.92rem;
    padding: 7px 10px;
    text-align: right;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    width: 100%;
}
.stats-input:focus { outline: none; border-color: var(--tek-blue); box-shadow: 0 0 0 1px var(--tek-blue); }
.stats-input.mut.has-val {
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
    border-color: rgba(0,180,255,0.40);
}
.stats-total {
    font-family: var(--tek-mono);
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-align: right;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.stats-total .arrow { color: var(--tek-text-faint); font-weight: 400; margin-right: 4px; }

.notes-area {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-font);
    font-size: 0.86rem;
    padding: 10px 14px;
    width: 100%;
    min-height: 80px;
    resize: vertical;
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    line-height: 1.5;
}
.notes-area:focus { outline: none; border-color: var(--tek-blue); }

.form-error {
    margin: 10px 0;
    padding: 10px 14px;
    background: rgba(239,68,68,0.08);
    border-left: 2px solid var(--tek-red);
    color: var(--tek-red);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
}

.action-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    margin-top: 16px;
}
.action-bar .spacer { flex: 1; }

/* Live preview */
.preview-col { position: sticky; top: 24px; }
.preview-header {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 8px;
    padding-left: 4px;
    display: flex; align-items: center; gap: 6px;
}
.live-pip {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    animation: livePulse 1.6s ease-in-out infinite;
}
@keyframes livePulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.preview-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid var(--tek-blue-border);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 18px 20px 16px;
    box-shadow: 0 0 32px rgba(0,180,255,0.10);
    overflow: hidden;
}
.preview-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px);
    pointer-events: none;
    opacity: 0.6;
}
.preview-card > * { position: relative; z-index: 1; }
.pv-species {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-blue);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.pv-name {
    font-family: var(--tek-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
    text-transform: uppercase;
    margin-bottom: 8px;
    word-break: break-word;
}
.pv-name.placeholder { color: var(--tek-text-faint); -webkit-text-fill-color: var(--tek-text-faint); font-style: italic; filter: none; background: none; }
.pv-meta {
    display: flex; flex-wrap: wrap; gap: 6px 12px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 14px; padding-bottom: 12px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.pv-meta .item { display: flex; align-items: center; gap: 4px; }
.pv-meta .item .v { color: var(--tek-text); }
.pv-meta .gender.m { color: var(--tek-blue); }
.pv-meta .gender.f { color: var(--tek-pink); }

.pv-stats { margin-bottom: 14px; }
.pv-stats-head {
    display: grid; grid-template-columns: 55px 1fr 1fr; gap: 10px;
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding-bottom: 5px; margin-bottom: 4px;
    border-bottom: 1px solid rgba(0,180,255,0.06);
}
.pv-stats-head .r { text-align: right; }
.pv-stat-row {
    display: grid; grid-template-columns: 55px 1fr 1fr; gap: 10px;
    padding: 4px 0;
    border-bottom: 1px dashed rgba(100,116,139,0.10);
}
.pv-stat-row:last-child { border-bottom: none; }
.pv-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.pv-stat-base { font-family: var(--tek-mono); font-size: 0.9rem; color: var(--tek-text); text-align: right; }
.pv-stat-mut { font-family: var(--tek-mono); font-size: 0.86rem; text-align: right; color: var(--tek-text-faint); }
.pv-stat-mut.has-mut { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); font-weight: 700; }

.pv-badges-block { padding-top: 12px; border-top: 1px solid rgba(0,180,255,0.10); }
.pv-badges-label {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.pv-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.pv-badge {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.pv-badge.bronze  { background: rgba(205,127,50,0.10);  color: var(--tier-bronze); border: 1px solid rgba(205,127,50,0.40); }
.pv-badge.silver  { background: rgba(200,200,210,0.10); color: var(--tier-silver); border: 1px solid rgba(200,200,210,0.40); }
.pv-badge.gold    { background: rgba(255,215,0,0.10);   color: var(--tier-gold);   border: 1px solid rgba(255,215,0,0.40); }
.pv-badge.diamond { background: rgba(0,180,255,0.12);   color: var(--tier-diamond);border: 1px solid var(--tek-blue);   box-shadow: 0 0 8px rgba(0,180,255,0.30); }
.pv-badge.gamma   { background: rgba(16,185,129,0.10);  color: var(--tek-green);   border: 1px solid rgba(16,185,129,0.40); }
.pv-badge.beta    { background: rgba(0,180,255,0.10);   color: var(--tek-blue);    border: 1px solid var(--tek-blue-border); }
.pv-badge.alpha   { background: rgba(244,114,182,0.10); color: var(--tek-pink);    border: 1px solid rgba(244,114,182,0.40); }
.pv-badge.titan   { background: rgba(0,180,255,0.15);   color: var(--tier-diamond);border: 1px solid var(--tek-blue);    box-shadow: 0 0 6px var(--tek-blue-glow); }
.pv-badge.role    { background: rgba(139,92,246,0.10);  color: var(--tek-purple);  border: 1px solid rgba(139,92,246,0.40); }
.pv-badges-empty { font-family: var(--tek-mono); font-size: 0.7rem; color: var(--tek-text-faint); font-style: italic; }
</style>
