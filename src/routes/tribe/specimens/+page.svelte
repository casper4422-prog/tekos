<script lang="ts">
    import type { PageData } from './$types';
    import { computeBadges, getStat, badgeCountForCreature, type Stats } from '$lib/badges';
    import { invalidateAll } from '$app/navigation';
    import PageHeader from '$lib/components/PageHeader.svelte';

    let { data }: { data: PageData } = $props();

    type View = 'list' | 'grid';
    let view = $state<View>('list');
    let search = $state('');
    let activeFilter = $state<string>('all');
    let sortMode = $state<string>('Newest first');
    let filterGender = $state<'any' | 'male' | 'female'>('any');

    const STAT_KEYS = ['HP','STA','OXY','FOOD','WGT','MEL','CRA','SPD'] as const;

    // Same category map as personal Specimens — kept close so the two pages stay visually
    // consistent. Worth lifting into $lib eventually if a third surface grows the need.
    const CATEGORY_MAP: Record<string, string> = {
        'wyvern':'flyer','argentavis':'flyer','pteranodon':'flyer','quetzal':'flyer','tropeognathus':'flyer',
        'tapejara':'flyer','griffin':'flyer','snow owl':'flyer','managarmr':'flyer','desmodus':'flyer',
        'rex':'combat','tyrannosaurus':'combat','yutyrannus':'combat','allosaurus':'combat','carnotaurus':'combat',
        'giganotosaurus':'combat','spino':'combat','spinosaurus':'combat','megalosaurus':'combat',
        'thylacoleo':'combat','sabertooth':'combat','direwolf':'combat','baryonyx':'combat',
        'basilosaurus':'water','megalodon':'water','mosasaurus':'water','plesiosaurus':'water',
        'tusoteuthis':'water','manta':'water','ichthyosaurus':'water','sarco':'water',
        'carcharodontosaurus':'mount','paraceratherium':'mount','brontosaurus':'mount','diplodocus':'mount',
        'rhinoceros':'mount','woolly rhino':'mount','mammoth':'mount','megaloceros':'mount',
        'therizinosaurus':'resource','doedicurus':'resource','ankylosaurus':'resource','castoroides':'resource',
        'beaver':'resource','mantis':'resource','gacha':'resource',
        'broodmother':'boss','megapithecus':'boss','dragon':'boss','manticore':'boss','overseer':'boss'
    };
    function categoryFor(species: string): string {
        const low = (species || '').toLowerCase();
        if (CATEGORY_MAP[low]) return CATEGORY_MAP[low];
        for (const k of Object.keys(CATEGORY_MAP)) if (low.includes(k)) return CATEGORY_MAP[k];
        return 'utility';
    }
    function totalLevel(base: Stats | undefined, mut: Stats | undefined): number {
        return STAT_KEYS.reduce((s, k) => s + getStat(base, k) + getStat(mut, k), 0);
    }
    function totalMuts(mut: Stats | undefined): number {
        return STAT_KEYS.reduce((s, k) => s + getStat(mut, k), 0);
    }
    function tierLabelFor(base: Stats | undefined, mut: Stats | undefined): string {
        const b = computeBadges(base, mut);
        if (b.bossReady === 'titan') return 'Apex';
        if (b.bossReady === 'alpha') return 'Bloodline';
        if (b.bossReady === 'beta')  return 'Elite';
        return 'Standard';
    }
    function genderGlyph(g: string): string {
        const l = (g || '').toLowerCase();
        if (l === 'male') return '♂';
        if (l === 'female') return '♀';
        return '?';
    }
    function displayName(u: { nickname: string | null; discordName: string | null; email: string }): string {
        return u.nickname || u.discordName || (u.email || '').split('@')[0] || 'Survivor';
    }

    // The user's tribe role gates moderation power. Creators can always remove
    // their own entries; owner/admin can moderate the whole vault.
    const isModerator = $derived(data.role === 'owner' || data.role === 'admin');
    function canRemove(c: { creator: { id: number } }): boolean {
        return isModerator || c.creator.id === data.myId;
    }

    const enriched = $derived(
        data.creatures.map(c => ({
            ref: c,
            cat:  categoryFor(c.species),
            tier: tierLabelFor(c.baseStats, c.mutations),
            muts: totalMuts(c.mutations),
            lvl:  totalLevel(c.baseStats, c.mutations),
            badges: computeBadges(c.baseStats, c.mutations),
            badgeCount: badgeCountForCreature(c.baseStats, c.mutations, c.species)
        }))
    );

    const CATS = ['combat','flyer','utility','water','mount','resource','boss'] as const;
    const counts = $derived.by(() => {
        const out: Record<string, number> = { all: enriched.length };
        for (const c of CATS) out[c] = 0;
        for (const e of enriched) if (out[e.cat] !== undefined) out[e.cat]++;
        return out;
    });

    const filtered = $derived.by(() => {
        let list = enriched;
        if (activeFilter !== 'all') list = list.filter(e => e.cat === activeFilter);
        if (filterGender !== 'any') {
            list = list.filter(e => (e.ref.gender || '').toLowerCase() === filterGender);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter(e =>
                e.ref.name.toLowerCase().includes(q) ||
                e.ref.species.toLowerCase().includes(q) ||
                displayName(e.ref.creator).toLowerCase().includes(q)
            );
        }
        const sorted = [...list];
        switch (sortMode) {
            case 'Mutations ↓':    sorted.sort((a,b) => b.muts - a.muts); break;
            case 'Total Level ↓':  sorted.sort((a,b) => b.lvl - a.lvl); break;
            case 'Newest first':   sorted.sort((a,b) => +new Date(b.ref.createdAt) - +new Date(a.ref.createdAt)); break;
            case 'Alphabetically': sorted.sort((a,b) => a.ref.name.localeCompare(b.ref.name)); break;
            case 'Species type':   sorted.sort((a,b) => a.ref.species.localeCompare(b.ref.species) || a.ref.name.localeCompare(b.ref.name)); break;
        }
        return sorted;
    });

    let removingId = $state<number | null>(null);
    async function removeFromVault(id: number) {
        if (removingId !== null) return;
        if (!confirm('Remove this creature from the tribe vault? The original owner keeps their personal copy.')) return;
        removingId = id;
        try {
            const res = await fetch(`/api/tribe-creatures/${id}`, { method: 'DELETE' });
            if (res.ok) await invalidateAll();
            else alert((await res.json().catch(() => ({}))).error ?? 'Failed to remove.');
        } finally {
            removingId = null;
        }
    }
</script>

<svelte:head><title>⬡ TEKOS — Tribe Vault</title></svelte:head>

<div class="stage">
    {#snippet sub()}
        <span class="prefix">›</span>
        {#if data.inTribe}
            SHARED VAULT · <span class="num">{data.creatures.length}</span> CREATURES {#if data.tribeName}· {data.tribeName.toUpperCase()}{/if}
        {:else}
            YOU ARE NOT IN A TRIBE — JOIN ONE TO ACCESS A SHARED VAULT
        {/if}
    {/snippet}
    <PageHeader
        title="Tribe Vault"
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Tribe', href: '/tribe' },
            { label: 'Specimens' }
        ]}
        subContent={sub}
    />

    {#if !data.inTribe}
        <div class="empty">
            <p>You're not in a tribe yet. Tribe vaults are shared rosters — every member can browse, every contributor (or Alpha/Officer) can curate.</p>
            <a class="cta" href="/tribe">▸ Open Tribes</a>
        </div>
    {:else if data.creatures.length === 0}
        <div class="empty">
            <p>The vault is empty. Members can add creatures from their personal Specimens page using the <strong>Send to Tribe Vault</strong> button on each card.</p>
            <a class="cta" href="/specimens">▸ Open My Specimens</a>
        </div>
    {:else}
        <!-- Toolbar -->
        <div class="toolbar">
            <input class="search" type="search" placeholder="Search by name, species, or creator…" bind:value={search} />

            <select class="sort" bind:value={sortMode}>
                <option>Newest first</option>
                <option>Mutations ↓</option>
                <option>Total Level ↓</option>
                <option>Alphabetically</option>
                <option>Species type</option>
            </select>

            <div class="view-toggle">
                <button class="vb" class:active={view === 'list'} onclick={() => view = 'list'}>≡ List</button>
                <button class="vb" class:active={view === 'grid'} onclick={() => view = 'grid'}>⬡ Grid</button>
            </div>
        </div>

        <!-- Category chips -->
        <div class="chips">
            <button class="chip" class:active={activeFilter === 'all'} onclick={() => activeFilter = 'all'}>All <span class="ct">{counts.all}</span></button>
            {#each CATS as c}
                <button class="chip" class:active={activeFilter === c} onclick={() => activeFilter = c}>{c.charAt(0).toUpperCase() + c.slice(1)} <span class="ct">{counts[c]}</span></button>
            {/each}
        </div>

        <!-- Gender filter -->
        <div class="chips small">
            <span class="lbl">Gender</span>
            <button class="chip" class:active={filterGender === 'any'} onclick={() => filterGender = 'any'}>Any</button>
            <button class="chip" class:active={filterGender === 'male'} onclick={() => filterGender = 'male'}>♂ Male</button>
            <button class="chip" class:active={filterGender === 'female'} onclick={() => filterGender = 'female'}>♀ Female</button>
        </div>

        {#if view === 'list'}
            <!-- List view -->
            <div class="list">
                {#each filtered as e}
                    <a class="row {e.cat}" href="/specimens/{e.ref.id}">
                        <span class="row-species">{e.ref.species}</span>
                        <span class="row-name">"{e.ref.name}"</span>
                        <span class="row-gender">{genderGlyph(e.ref.gender)}</span>
                        <span class="row-lvl">L{e.lvl}</span>
                        <span class="row-muts">{e.muts} muts</span>
                        <span class="row-tier">⬢ {e.tier}</span>
                        <span class="row-badges">{e.badgeCount} {e.badgeCount === 1 ? 'badge' : 'badges'}</span>
                        <span class="row-creator">by <strong>{displayName(e.ref.creator)}</strong></span>
                        {#if canRemove(e.ref)}
                            <button class="row-rm" onclick={(ev) => { ev.preventDefault(); removeFromVault(e.ref.id); }} disabled={removingId === e.ref.id} title="Remove from vault" aria-label="Remove">
                                {removingId === e.ref.id ? '…' : '✕'}
                            </button>
                        {/if}
                    </a>
                {/each}
            </div>
        {:else}
            <!-- Grid view -->
            <div class="grid">
                {#each filtered as e}
                    <div class="card {e.cat}">
                        <div class="card-head">
                            <span class="card-creator">by <strong>{displayName(e.ref.creator)}</strong></span>
                            {#if canRemove(e.ref)}
                                <button class="card-rm" onclick={() => removeFromVault(e.ref.id)} disabled={removingId === e.ref.id} title="Remove from vault" aria-label="Remove">
                                    {removingId === e.ref.id ? '…' : '✕'}
                                </button>
                            {/if}
                        </div>
                        <a class="card-body" href="/specimens/{e.ref.id}">
                            <div class="card-species">{e.ref.species}</div>
                            {#if e.ref.name}<div class="card-name">"{e.ref.name}"</div>{/if}
                            <div class="card-meta">
                                <span>{genderGlyph(e.ref.gender)}</span>
                                <span>L{e.lvl}</span>
                                <span>{e.muts} muts</span>
                            </div>
                            <div class="card-foot">
                                <span class="tier">⬢ {e.tier}</span>
                                <span class="badges">{e.badgeCount} {e.badgeCount === 1 ? 'badge' : 'badges'}</span>
                            </div>
                        </a>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    .stage {
        position: relative; z-index: 2;
        min-height: 100vh;
        padding: 60px 24px 100px;
        max-width: 1200px;
        margin: 0 auto;
    }
    .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
    .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

    .empty {
        margin-top: 80px;
        padding: 32px;
        text-align: center;
        font-family: var(--tek-mono);
        color: var(--tek-text-dim);
        border: 1px dashed rgba(0,180,255,0.18);
        clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
    }
    .empty .cta {
        display: inline-block;
        margin-top: 14px;
        color: var(--tek-blue);
        font-family: var(--tek-mono);
        letter-spacing: 0.10em;
        text-decoration: none;
    }
    .empty .cta:hover { text-shadow: 0 0 8px var(--tek-blue-glow); }

    .toolbar {
        display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
        margin: 28px 0 14px;
    }
    .search {
        flex: 1; min-width: 220px;
        background: rgba(5,8,18,0.6);
        border: 1px solid rgba(100,116,139,0.30);
        color: var(--tek-text);
        font-family: var(--tek-mono);
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        padding: 8px 12px;
        clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    }
    .search:focus { outline: none; border-color: var(--tek-blue); }
    .sort {
        background: rgba(5,8,18,0.6);
        border: 1px solid rgba(100,116,139,0.30);
        color: var(--tek-text);
        font-family: var(--tek-mono);
        font-size: 0.72rem;
        padding: 7px 22px 7px 10px;
        appearance: none; -webkit-appearance: none;
        background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
        background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
        background-size: 5px 5px; background-repeat: no-repeat;
        clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
        cursor: pointer;
    }
    .view-toggle { display: flex; gap: 0; }
    .vb {
        background: rgba(5,8,18,0.6);
        border: 1px solid rgba(100,116,139,0.30);
        color: var(--tek-text-dim);
        font-family: var(--tek-mono);
        font-size: 0.70rem;
        letter-spacing: 0.10em;
        padding: 7px 12px;
        cursor: pointer;
    }
    .vb.active {
        background: rgba(0,180,255,0.12);
        border-color: var(--tek-blue);
        color: var(--tek-blue);
    }

    .chips { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
    .chips .lbl {
        font-family: var(--tek-mono);
        font-size: 0.64rem;
        letter-spacing: 0.14em;
        color: var(--tek-text-faint);
        text-transform: uppercase;
        margin-right: 4px;
    }
    .chips.small { margin-bottom: 18px; }
    .chip {
        background: rgba(5,8,18,0.6);
        border: 1px solid rgba(100,116,139,0.25);
        color: var(--tek-text-dim);
        font-family: var(--tek-mono);
        font-size: 0.68rem;
        letter-spacing: 0.08em;
        padding: 5px 11px;
        clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
        cursor: pointer;
        transition: all 0.15s;
    }
    .chip:hover { color: var(--tek-text); border-color: var(--tek-blue-border); }
    .chip.active { background: rgba(0,180,255,0.12); border-color: var(--tek-blue); color: var(--tek-blue); }
    .chip .ct { opacity: 0.55; margin-left: 4px; font-size: 0.85em; }

    /* List view */
    .list { display: flex; flex-direction: column; gap: 4px; }
    .row {
        display: grid;
        grid-template-columns: 140px 1fr 30px 60px 80px 100px 100px 1fr 30px;
        align-items: center;
        gap: 10px;
        padding: 9px 12px;
        background: rgba(5,8,18,0.55);
        border: 1px solid rgba(100,116,139,0.18);
        border-left-width: 2px;
        border-left-color: rgba(0,180,255,0.30);
        text-decoration: none;
        color: var(--tek-text);
        font-family: var(--tek-mono);
        font-size: 0.74rem;
        transition: background 0.15s, border-color 0.15s;
    }
    .row:hover { background: rgba(0,180,255,0.05); border-color: rgba(0,180,255,0.30); }
    .row.combat   { border-left-color: #ef4444; }
    .row.flyer    { border-left-color: #06b6d4; }
    .row.water    { border-left-color: #3b82f6; }
    .row.mount    { border-left-color: #fbbf24; }
    .row.resource { border-left-color: #22c55e; }
    .row.boss     { border-left-color: #d946ef; }
    .row-species { font-weight: 600; color: var(--tek-text); }
    .row-name    { color: var(--tek-text-dim); font-style: italic; }
    .row-gender  { text-align: center; color: var(--tek-blue); }
    .row-lvl     { color: #fcd34d; font-weight: 600; }
    .row-muts    { color: var(--tek-text-dim); }
    .row-tier    { color: var(--tek-blue); letter-spacing: 0.06em; }
    .row-badges  { color: var(--tek-text-dim); font-size: 0.70rem; }
    .row-creator { color: var(--tek-text-dim); font-size: 0.70rem; text-align: right; }
    .row-creator strong { color: var(--tek-text); }
    .row-rm {
        background: transparent;
        border: 1px solid rgba(239,68,68,0.35);
        color: #ef4444;
        font-family: var(--tek-mono);
        font-size: 0.72rem;
        padding: 2px 6px;
        cursor: pointer;
        line-height: 1;
    }
    .row-rm:hover { background: rgba(239,68,68,0.10); color: #ff8b8b; }
    .row-rm:disabled { opacity: 0.5; cursor: wait; }

    /* Grid view */
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 14px;
    }
    .card {
        background: rgba(5,8,18,0.55);
        border: 1px solid rgba(100,116,139,0.20);
        border-top-width: 2px;
        border-top-color: rgba(0,180,255,0.40);
        padding: 12px 14px;
        font-family: var(--tek-mono);
        position: relative;
    }
    .card.combat   { border-top-color: #ef4444; }
    .card.flyer    { border-top-color: #06b6d4; }
    .card.water    { border-top-color: #3b82f6; }
    .card.mount    { border-top-color: #fbbf24; }
    .card.resource { border-top-color: #22c55e; }
    .card.boss     { border-top-color: #d946ef; }
    .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .card-creator { font-size: 0.66rem; color: var(--tek-text-dim); }
    .card-creator strong { color: var(--tek-text); }
    .card-rm {
        background: transparent;
        border: 1px solid rgba(239,68,68,0.35);
        color: #ef4444;
        font-size: 0.66rem;
        padding: 1px 5px;
        cursor: pointer;
        line-height: 1;
    }
    .card-rm:hover { background: rgba(239,68,68,0.10); }
    .card-rm:disabled { opacity: 0.5; cursor: wait; }
    .card-body { text-decoration: none; color: var(--tek-text); display: block; }
    .card-species {
        font-family: var(--tek-display);
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--tek-text);
        letter-spacing: 0.04em;
    }
    .card-name { color: var(--tek-text-dim); font-style: italic; font-size: 0.78rem; margin-top: 2px; }
    .card-meta { display: flex; gap: 10px; font-size: 0.72rem; color: var(--tek-text-dim); margin: 8px 0; }
    .card-meta span:first-child { color: var(--tek-blue); }
    .card-foot { display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: var(--tek-text-dim); border-top: 1px solid rgba(100,116,139,0.12); padding-top: 6px; }
    .tier { color: var(--tek-blue); }
</style>
