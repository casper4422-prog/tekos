<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';
    import { computeBadges, getStat } from '$lib/badges';
    import PinModal from '$lib/components/PinModal.svelte';

    let { data }: { data: PageData } = $props();

    let pinModalOpen = $state(false);
    let pinModalPreselectId = $state<number | null>(null);

    function openPinModal(id: number) {
        pinModalPreselectId = id;
        pinModalOpen = true;
    }

    async function savePin(payload: { creatureId: number; focusStat: string | null; targetMutations: number } | { creatureIds: number[] }) {
        if ('creatureIds' in payload) return;
        await fetch('/api/pinned-projects', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        pinModalOpen = false;
        pinModalPreselectId = null;
        window.location.reload();
    }

    const STAT_KEYS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;

    type View = 'list' | 'grid';
    let view = $state<View>('list');
    let search = $state('');
    let activeFilter = $state<string>('all');
    let sortMode = $state<string>('Mutations ↓');

    /* ── Category mapping from species name ───────────────────────────── */
    const CATEGORY_MAP: Record<string, string> = {
        'wyvern': 'flyer',
        'argentavis': 'flyer',
        'pteranodon': 'flyer',
        'quetzal': 'flyer',
        'tropeognathus': 'flyer',
        'tapejara': 'flyer',
        'griffin': 'flyer',
        'snow owl': 'flyer',
        'managarmr': 'flyer',
        'desmodus': 'flyer',
        'rex': 'combat',
        'tyrannosaurus': 'combat',
        'yutyrannus': 'combat',
        'allosaurus': 'combat',
        'carnotaurus': 'combat',
        'giganotosaurus': 'combat',
        'spino': 'combat',
        'spinosaurus': 'combat',
        'megalosaurus': 'combat',
        'thylacoleo': 'combat',
        'sabertooth': 'combat',
        'direwolf': 'combat',
        'baryonyx': 'combat',
        'basilosaurus': 'water',
        'megalodon': 'water',
        'mosasaurus': 'water',
        'plesiosaurus': 'water',
        'tusoteuthis': 'water',
        'manta': 'water',
        'ichthyosaurus': 'water',
        'sarco': 'water',
        'carcharodontosaurus': 'mount',
        'paraceratherium': 'mount',
        'brontosaurus': 'mount',
        'diplodocus': 'mount',
        'rhinoceros': 'mount',
        'woolly rhino': 'mount',
        'mammoth': 'mount',
        'megaloceros': 'mount',
        'therizinosaurus': 'resource',
        'doedicurus': 'resource',
        'ankylosaurus': 'resource',
        'castoroides': 'resource',
        'beaver': 'resource',
        'mantis': 'resource',
        'gacha': 'resource',
        'broodmother': 'boss',
        'megapithecus': 'boss',
        'dragon': 'boss',
        'manticore': 'boss',
        'overseer': 'boss'
    };

    function categoryFor(species: string): string {
        const low = (species || '').toLowerCase();
        // direct match
        if (CATEGORY_MAP[low]) return CATEGORY_MAP[low];
        // substring match (e.g. "Wyvern · Lightning" matches "wyvern")
        for (const key of Object.keys(CATEGORY_MAP)) {
            if (low.includes(key)) return CATEGORY_MAP[key];
        }
        return 'utility';
    }

    function tierLabelFor(base: any, mut: any): string {
        const b = computeBadges(base, mut);
        if (b.bossReady === 'titan') return 'Apex';
        if (b.bossReady === 'alpha') return 'Bloodline';
        if (b.bossReady === 'beta')  return 'Elite';
        return 'Standard';
    }

    function totalLevel(c: typeof data.creatures[0]): number {
        return STAT_KEYS.reduce((sum, s) => sum + getStat(c.baseStats, s) + getStat(c.mutations, s), 0);
    }

    function totalMuts(c: typeof data.creatures[0]): number {
        // each mutation in mutations Stats = 2 levels; total muts = sum(mutLevels)/2
        const totalMutLevels = STAT_KEYS.reduce((sum, s) => sum + getStat(c.mutations, s), 0);
        return Math.round(totalMutLevels / 2);
    }

    function genderClass(g: string): string {
        const l = (g || '').toLowerCase();
        if (l === 'male') return 'male';
        if (l === 'female') return 'female';
        return '';
    }
    function genderGlyph(g: string): string {
        const l = (g || '').toLowerCase();
        if (l === 'male') return '♂';
        if (l === 'female') return '♀';
        return '?';
    }
    function catTitle(c: string): string {
        return c.charAt(0).toUpperCase() + c.slice(1);
    }

    /* ── Derived: enriched creatures with cat/tier/mut/lvl ────────────── */
    const enriched = $derived(
        data.creatures.map(c => ({
            ref: c,
            cat: categoryFor(c.species),
            tier: tierLabelFor(c.baseStats, c.mutations),
            muts: totalMuts(c),
            lvl: totalLevel(c),
            badges: computeBadges(c.baseStats, c.mutations)
        }))
    );

    /* ── Filter chips with counts per category ────────────────────────── */
    const CATS = ['combat','flyer','utility','water','mount','resource','boss'] as const;
    const counts = $derived.by(() => {
        const out: Record<string, number> = { all: enriched.length };
        for (const c of CATS) out[c] = 0;
        for (const e of enriched) {
            if (out[e.cat] !== undefined) out[e.cat]++;
        }
        return out;
    });

    /* ── Filtered + sorted ────────────────────────────────────────────── */
    const filtered = $derived.by(() => {
        let list = enriched;
        if (activeFilter !== 'all') {
            list = list.filter(e => e.cat === activeFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.ref.name.toLowerCase().includes(q)
                || e.ref.species.toLowerCase().includes(q)
                || (e.ref.notes ?? '').toLowerCase().includes(q)
            );
        }
        const sorted = [...list];
        switch (sortMode) {
            case 'Mutations ↓':    sorted.sort((a,b) => b.muts - a.muts); break;
            case 'Total Level ↓':  sorted.sort((a,b) => b.lvl  - a.lvl);  break;
            case 'Newest first':   sorted.sort((a,b) => +new Date(b.ref.createdAt) - +new Date(a.ref.createdAt)); break;
            case 'Oldest first':   sorted.sort((a,b) => +new Date(a.ref.createdAt) - +new Date(b.ref.createdAt)); break;
            case 'Name A–Z':       sorted.sort((a,b) => a.ref.name.localeCompare(b.ref.name)); break;
        }
        return sorted;
    });

    const totalMutationsAll = $derived(
        enriched.reduce((s, e) => s + e.muts, 0)
    );
    const speciesCount = $derived(
        new Set(enriched.map(e => e.ref.species)).size
    );
    const sortLabel = $derived(
        sortMode === 'Mutations ↓' ? 'mutations'
        : sortMode === 'Total Level ↓' ? 'total level'
        : sortMode === 'Newest first' ? 'newest'
        : sortMode === 'Oldest first' ? 'oldest'
        : 'name'
    );

    /* ── Hex grid canvas ──────────────────────────────────────────────── */
    let canvasEl: HTMLCanvasElement | null = null;
    onMount(() => {
        const canvas = canvasEl;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let rafId = 0;
        function drawHex(x: number, y: number, opacity: number) {
            ctx!.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                const px = x + (R - 1) * Math.cos(a);
                const py = y + (R - 1) * Math.sin(a);
                i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
            }
            ctx!.closePath();
            ctx!.strokeStyle = `rgba(0,180,255,${opacity})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
        }
        function draw() {
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
            const cw = canvas!.width, ch = canvas!.height;
            const cols = Math.ceil(cw / W) + 3;
            const rows = Math.ceil(ch / (H * 0.75)) + 3;
            for (let row = -1; row < rows; row++) {
                for (let col = -1; col < cols; col++) {
                    const x = col * W + (row % 2 !== 0 ? W / 2 : 0);
                    const y = row * H * 0.75;
                    const dx = x - cw * 0.5, dy = y - ch * 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const wave = Math.sin(phase - dist * 0.01) * 0.5 + 0.5;
                    drawHex(x, y, 0.07 + wave * 0.09);
                }
            }
            phase += 0.005;
            rafId = requestAnimationFrame(draw);
        }
        function resize() {
            canvas!.width = window.innerWidth;
            canvas!.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();
        draw();
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
        };
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Specimens Vault</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">

    <!-- ═══════════ HEADER ═══════════ -->
    <div class="vault-header">
        <div>
            <div class="page-title">Specimens Vault</div>
            <div class="page-sub">
                <span class="prefix">›</span>
                <span class="stat-num">{enriched.length}</span> SAVED · <span class="stat-num">{speciesCount}</span> SPECIES · <span class="stat-num">{totalMutationsAll}</span> MUTATIONS
            </div>
        </div>
        <a class="btn-add" href="/specimens/add"><span class="glyph">⬡</span> Log Specimen</a>
    </div>

    <!-- ═══════════ TOOLBAR ═══════════ -->
    <div class="vault-toolbar">
        <div class="toolbar-row">
            <div class="vault-search">
                <svg class="vault-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" class="vault-search-input" bind:value={search} placeholder="Search vault by name, species, or nickname…" />
            </div>
            <div class="sort-block">
                <select class="sort-select" bind:value={sortMode}>
                    <option>Mutations ↓</option>
                    <option>Total Level ↓</option>
                    <option>Newest first</option>
                    <option>Oldest first</option>
                    <option>Name A–Z</option>
                </select>
            </div>
            <div class="view-toggle">
                <button class="view-btn" class:active={view === 'list'} onclick={() => view = 'list'} title="List view">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <button class="view-btn" class:active={view === 'grid'} onclick={() => view = 'grid'} title="Grid view">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </button>
            </div>
        </div>

        <div class="toolbar-row">
            <div class="filter-chips">
                <button class="chip" class:active={activeFilter === 'all'} onclick={() => activeFilter = 'all'}>All <span class="count">{counts.all}</span></button>
                <span class="chip-divider"></span>
                <button class="chip" class:active={activeFilter === 'combat'}   onclick={() => activeFilter = 'combat'}>Combat <span class="count">{counts.combat}</span></button>
                <button class="chip" class:active={activeFilter === 'flyer'}    onclick={() => activeFilter = 'flyer'}>Flyer <span class="count">{counts.flyer}</span></button>
                <button class="chip" class:active={activeFilter === 'utility'}  onclick={() => activeFilter = 'utility'}>Utility <span class="count">{counts.utility}</span></button>
                <button class="chip" class:active={activeFilter === 'water'}    onclick={() => activeFilter = 'water'}>Water <span class="count">{counts.water}</span></button>
                <button class="chip" class:active={activeFilter === 'mount'}    onclick={() => activeFilter = 'mount'}>Mount <span class="count">{counts.mount}</span></button>
                <button class="chip" class:active={activeFilter === 'resource'} onclick={() => activeFilter = 'resource'}>Resource <span class="count">{counts.resource}</span></button>
                <button class="chip" class:active={activeFilter === 'boss'}     onclick={() => activeFilter = 'boss'}>Boss <span class="count">{counts.boss}</span></button>
            </div>
        </div>
    </div>

    <!-- Results count -->
    <div class="results-count">
        Showing <span class="num">{filtered.length}</span> of <span class="num">{enriched.length}</span> · sorted by <span class="num">{sortLabel}</span>
    </div>

    <!-- ═══════════ LIST VIEW ═══════════ -->
    <div class="vault-list" class:hidden={view !== 'list'}>
        {#each filtered as e (e.ref.id)}
            <div class="list-row-wrap">
                <a class="list-row {e.cat}" data-cat={e.cat} href="/specimens/{e.ref.id}">
                    <div class="list-row-main">
                        <span class="tier">⬢ {e.tier}</span>
                        <span class="cat-pill">{catTitle(e.cat)}</span>
                        <div class="list-info">
                            <div class="list-species">{e.ref.species}</div>
                            <div class="list-nick">"{e.ref.name}" · <span class="gender {genderClass(e.ref.gender)}">{genderGlyph(e.ref.gender)}</span></div>
                        </div>
                        <div class="list-stat">
                            <div class="list-stat-val">{e.muts}</div>
                            <div class="list-stat-lbl">Muts</div>
                        </div>
                        <div class="list-level">
                            <div class="list-level-val">{e.lvl}</div>
                            <div class="list-level-lbl">Total Lvl</div>
                        </div>
                        <div class="list-actions" aria-hidden="true">
                            <span class="row-btn row-btn-placeholder">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                            </span>
                        </div>
                    </div>
                    <div class="list-row-stats">
                        {#each STAT_KEYS as k}
                            {@const base = getStat(e.ref.baseStats, k)}
                            {@const mut  = getStat(e.ref.mutations, k)}
                            <div class="stat-mini">
                                <div class="stat-mini-lbl">{k}</div>
                                <div class="stat-mini-val">{base}</div>
                                <div class="stat-mini-mut" class:has={mut > 0}>{mut > 0 ? `+${mut}` : '—'}</div>
                            </div>
                        {/each}
                    </div>
                </a>
                <button class="list-pin-overlay" title="Pin as Project" onclick={() => openPinModal(e.ref.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                </button>
            </div>
        {/each}
    </div>

    <!-- ═══════════ GRID VIEW ═══════════ -->
    <div class="vault-grid" class:hidden={view !== 'grid'}>
        {#each filtered as e (e.ref.id)}
            <div class="grid-card-wrap">
                <a class="grid-card {e.cat}" data-cat={e.cat} href="/specimens/{e.ref.id}">
                <div class="grid-top">
                    <span class="grid-tier">⬢ {e.tier}</span>
                    <span class="grid-cat-mini">{catTitle(e.cat)}</span>
                </div>
                <div class="grid-species">{e.ref.species}</div>
                <div class="grid-nick">"{e.ref.name}"</div>
                <div class="grid-meta">
                    <span class="gender {genderClass(e.ref.gender)}">{genderGlyph(e.ref.gender)}</span>
                    <span>·</span>
                    <span class="cat-label">{catTitle(e.cat)}</span>
                </div>
                <div class="grid-stats">
                    {#each STAT_KEYS as k}
                        {@const base = getStat(e.ref.baseStats, k)}
                        {@const mut  = getStat(e.ref.mutations, k)}
                        <div class="stat-mini">
                            <div class="stat-mini-lbl">{k}</div>
                            <div class="stat-mini-val">{base}</div>
                            <div class="stat-mini-mut" class:has={mut > 0}>{mut > 0 ? `+${mut}` : '—'}</div>
                        </div>
                    {/each}
                </div>
                <div class="grid-bottom">
                    <div class="grid-level-num">{e.lvl}</div>
                    <div class="grid-level-side">
                        <div class="grid-level-lbl">Total Lvl</div>
                        <div class="grid-muts">{e.muts} muts</div>
                    </div>
                </div>
                </a>
                <button class="grid-pin-overlay" title="Pin as Project" onclick={() => openPinModal(e.ref.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                </button>
            </div>
        {/each}

        <!-- "+ Log specimen" placeholder card -->
        <a class="grid-add" href="/specimens/add">
            <div class="grid-add-glyph">+</div>
            <div class="grid-add-label">Log Specimen</div>
        </a>
    </div>

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<PinModal bind:open={pinModalOpen} creatures={data.creatures} mode="project" existingProjectId={pinModalPreselectId} onSave={savePin} />

<style>
:root {
    --tek-bg:           #050812;
    --tek-blue:         #00b4ff;
    --tek-blue-dim:     rgba(0, 180, 255, 0.12);
    --tek-blue-border:  rgba(0, 180, 255, 0.30);
    --tek-blue-glow:    rgba(0, 180, 255, 0.50);
    --tek-purple:       #8b5cf6;
    --tek-amber:        #f59e0b;
    --tek-green:        #10b981;
    --tek-red:          #ef4444;
    --tek-pink:         #f472b6;
    --tek-text:         #e2e8f0;
    --tek-text-dim:     #64748b;
    --tek-text-faint:   #334155;
    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(html), :global(body) {
    background: var(--tek-bg);
    color: var(--tek-text);
    font-family: var(--tek-font);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}
:global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.10) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 1240px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.vault-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.4rem, 4vw, 1.9rem);
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.35));
    margin-bottom: 4px;
    line-height: 1;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .stat-num {
    color: var(--tek-blue);
    font-weight: 700;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}

.btn-add {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 11px 22px;
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    border: none;
    cursor: pointer;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.50));
    transition: filter 0.18s, transform 0.18s;
    text-decoration: none;
}
.btn-add:hover { filter: drop-shadow(0 0 22px rgba(0,180,255,0.85)); transform: translateY(-1px); }
.btn-add .glyph { color: #001a2e; font-size: 0.9rem; }

/* ═════════════════════════════════════════════════════════════════════════
   TOOLBAR
   ═════════════════════════════════════════════════════════════════════════ */
.vault-toolbar {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 14px 18px;
    margin-bottom: 24px;
    position: relative;
}
.vault-toolbar::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 7px var(--tek-blue-glow);
}

.toolbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}
.toolbar-row + .toolbar-row { margin-top: 10px; }

/* Search */
.vault-search {
    flex: 1;
    min-width: 220px;
    position: relative;
}
.vault-search-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 14px 10px 38px;
    font-family: inherit;
    font-size: 0.86rem;
    outline: none;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    transition: border-color 0.2s, background 0.2s;
}
.vault-search-input::placeholder { color: var(--tek-text-faint); }
.vault-search-input:focus {
    border-color: rgba(0,180,255,0.40);
    border-bottom-color: var(--tek-blue);
    background: rgba(0,15,35,0.92);
}
.vault-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-text-faint);
    pointer-events: none;
}

/* Sort dropdown */
.sort-block {
    position: relative;
}
.sort-select {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 38px 10px 14px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    outline: none;
    cursor: pointer;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2300b4ff' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    text-transform: uppercase;
}
.sort-select option { background: #0a1228; color: var(--tek-text); }

/* View toggle */
.view-toggle {
    display: flex;
    gap: 0;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    padding: 2px;
}
.view-btn {
    background: transparent;
    border: none;
    color: var(--tek-text-faint);
    cursor: pointer;
    padding: 8px 11px;
    transition: all 0.18s;
    display: flex;
    align-items: center;
    justify-content: center;
}
.view-btn:hover { color: var(--tek-text-dim); }
.view-btn.active {
    background: rgba(0,180,255,0.15);
    color: var(--tek-blue);
    filter: drop-shadow(0 0 4px var(--tek-blue-glow));
}

/* Category filter chips */
.filter-chips {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
}
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,180,255,0.04);
    border: 1px solid rgba(0,180,255,0.16);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 11px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
    font-family: inherit;
}
.chip:hover {
    color: var(--tek-blue);
    border-color: rgba(0,180,255,0.40);
}
.chip.active {
    background: var(--tek-blue);
    color: #001a2e;
    border-color: var(--tek-blue);
}
.chip .count {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    opacity: 0.6;
    background: rgba(0,0,0,0.30);
    padding: 1px 6px;
    border-radius: 6px;
}
.chip.active .count { background: rgba(0,0,0,0.20); opacity: 0.7; }
.chip-divider {
    width: 1px;
    height: 18px;
    background: rgba(255,255,255,0.08);
    margin: 0 4px;
    align-self: center;
}

/* Results count */
.results-count {
    margin-bottom: 14px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.results-count .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

/* ═════════════════════════════════════════════════════════════════════════
   LIST VIEW — compact rows
   ═════════════════════════════════════════════════════════════════════════ */
.vault-list { display: flex; flex-direction: column; gap: 6px; }
.vault-list.hidden, .vault-grid.hidden { display: none; }

.list-row {
    --cat-rgb: 0,180,255;
    display: grid;
    grid-template-columns: auto auto 1fr auto auto auto;
    gap: 16px;
    align-items: center;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    backdrop-filter: blur(10px);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 18px 12px 22px;
    position: relative;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease;
    filter: drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.25)) drop-shadow(0 6px 18px rgba(0,0,0,0.35));
    transition: filter 0.22s ease, transform 0.18s ease;
    text-decoration: none;
    color: inherit;
}
.list-row:hover {
    transform: translateX(3px);
    filter: drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.60)) drop-shadow(0 10px 26px rgba(0,0,0,0.48));
}
.list-row::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 6px rgba(var(--cat-rgb), 0.65);
}
.list-row.combat   { --cat-rgb: 239,68,68;   }
.list-row.flyer    { --cat-rgb: 6,182,212;   }
.list-row.utility  { --cat-rgb: 34,197,94;   }
.list-row.water    { --cat-rgb: 59,130,246;  }
.list-row.boss     { --cat-rgb: 245,158,11;  }
.list-row.mount    { --cat-rgb: 249,115,22;  }
.list-row.resource { --cat-rgb: 167,139,250; }

/* List row now has two stacked sections */
.list-row { display: block; padding: 0; }
.list-row-main {
    display: grid;
    grid-template-columns: auto auto 1fr auto auto auto;
    gap: 16px;
    align-items: center;
    padding: 12px 18px 12px 22px;
}
.list-row-stats {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    padding: 0 18px 12px 22px;
    border-top: 1px solid rgba(255,255,255,0.04);
    padding-top: 10px;
}

.list-row .tier {
    font-family: var(--tek-mono);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgb(var(--cat-rgb));
    background: rgba(var(--cat-rgb), 0.10);
    padding: 3px 7px;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
    white-space: nowrap;
}

.list-row .cat-pill {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

.list-info { min-width: 0; line-height: 1.3; }
.list-species {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 3px;
}
.list-nick {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-dim);
    font-style: italic;
}
.list-nick .gender.female { color: var(--tek-pink); font-style: normal; }
.list-nick .gender.male   { color: #60a5fa; font-style: normal; }

.list-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-family: var(--tek-mono);
    line-height: 1.1;
    min-width: 56px;
}
.list-stat-val {
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--tek-text);
}
.list-stat-lbl {
    font-size: 0.54rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
    margin-top: 2px;
}
.list-level {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-family: var(--tek-display);
    line-height: 1.1;
    min-width: 64px;
}
.list-level-val {
    font-size: 1.3rem;
    font-weight: 900;
    background: linear-gradient(135deg, #00d4ff, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 5px rgba(0,180,255,0.30));
}
.list-level-lbl {
    font-family: var(--tek-mono);
    font-size: 0.54rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
    margin-top: 2px;
}

.list-actions {
    display: flex;
    gap: 4px;
    align-items: center;
}
.row-btn {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-faint);
    cursor: pointer;
    transition: all 0.18s;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.row-btn:hover {
    color: var(--tek-blue);
    border-color: rgba(0,180,255,0.30);
    background: rgba(0,180,255,0.06);
}

/* ── Mini stat blocks (used in both list rows and grid cards) ─────────── */
.stat-mini {
    text-align: center;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.04);
    padding: 6px 4px 5px;
    clip-path: polygon(2px 0%, 100% 0%, calc(100% - 2px) 100%, 0% 100%);
    min-width: 0;
}
.stat-mini-lbl {
    font-family: var(--tek-mono);
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 2px;
}
.stat-mini-val {
    font-family: var(--tek-mono);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--tek-text);
    line-height: 1;
}
.stat-mini-mut {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    color: var(--tek-text-faint);
    margin-top: 3px;
    font-weight: 600;
    line-height: 1;
}
.stat-mini-mut.has {
    color: var(--tek-blue);
    text-shadow: 0 0 5px var(--tek-blue-glow);
}

/* Grid card now holds a stat block between meta and bottom */
.grid-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    margin-bottom: 12px;
    position: relative;
    z-index: 2;
}

/* ═════════════════════════════════════════════════════════════════════════
   GRID VIEW — mid-size cards
   ═════════════════════════════════════════════════════════════════════════ */
.vault-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
}
@media (max-width: 920px) { .vault-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .vault-grid { grid-template-columns: 1fr; } }

/* Pin overlay buttons — siblings of the card anchor to keep <a> spec-compliant
   (button inside <a> is invalid HTML and breaks event handling). */
.list-row-wrap, .grid-card-wrap { position: relative; }

.list-pin-overlay,
.grid-pin-overlay {
    position: absolute;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 180, 255, 0.10);
    border: 1px solid rgba(0, 180, 255, 0.32);
    color: var(--tek-blue);
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
    opacity: 0.65;
}
.list-pin-overlay { top: 50%; right: 14px; width: 26px; height: 26px; transform: translateY(-50%); }
.grid-pin-overlay { top: 10px; right: 10px; width: 24px; height: 24px; }
.list-row-wrap:hover .list-pin-overlay,
.grid-card-wrap:hover .grid-pin-overlay { opacity: 1; }
.list-pin-overlay:hover,
.grid-pin-overlay:hover {
    background: rgba(0, 180, 255, 0.25);
    filter: drop-shadow(0 0 6px var(--tek-blue-glow));
}
.grid-pin-overlay:hover { transform: translateY(-1px); }

/* Placeholder column inside the list-row to reserve space for the overlay button */
.row-btn-placeholder { opacity: 0; pointer-events: none; }

.grid-card {
    --cat-rgb: 0,180,255;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 16px 18px 16px 20px;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.22s ease, filter 0.25s ease;
    filter: drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.30)) drop-shadow(0 8px 24px rgba(0,0,0,0.45));
    text-decoration: none;
    color: inherit;
    display: block;
}
.grid-card:hover {
    transform: translateY(-2px);
    filter: drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.75)) drop-shadow(0 12px 32px rgba(0,0,0,0.6));
}
.grid-card::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 6px rgba(var(--cat-rgb), 0.7);
}
.grid-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(180deg, transparent 0 3px, rgba(0,180,255,0.018) 3px 4px);
    pointer-events: none;
}
.grid-card.combat   { --cat-rgb: 239,68,68;   }
.grid-card.flyer    { --cat-rgb: 6,182,212;   }
.grid-card.utility  { --cat-rgb: 34,197,94;   }
.grid-card.water    { --cat-rgb: 59,130,246;  }
.grid-card.boss     { --cat-rgb: 245,158,11;  }
.grid-card.mount    { --cat-rgb: 249,115,22;  }
.grid-card.resource { --cat-rgb: 167,139,250; }

.grid-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    position: relative;
    z-index: 2;
}
.grid-tier {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgb(var(--cat-rgb));
    background: rgba(var(--cat-rgb), 0.10);
    padding: 3px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.grid-cat-mini {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
}
.grid-species {
    font-family: var(--tek-display);
    font-size: clamp(1rem, 3vw, 1.3rem);
    font-weight: 800;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.4) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
    margin-bottom: 4px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    z-index: 2;
}
.grid-nick {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-bottom: 8px;
    position: relative;
    z-index: 2;
}
.grid-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 12px;
    position: relative;
    z-index: 2;
}
.grid-meta .gender.female { color: var(--tek-pink); }
.grid-meta .gender.male   { color: #60a5fa; }
.grid-meta .cat-label { color: rgb(var(--cat-rgb)); font-weight: 700; }

.grid-bottom {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 10px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    position: relative;
    z-index: 2;
}
.grid-level-num {
    font-family: var(--tek-display);
    font-size: 1.8rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.35));
}
.grid-level-side { text-align: right; line-height: 1.3; }
.grid-level-lbl {
    font-family: var(--tek-mono);
    font-size: 0.52rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.grid-muts {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-shadow: 0 0 4px var(--tek-blue-glow);
}

/* "+ Log Specimen" placeholder grid card */
.grid-add {
    --cat-rgb: 0,180,255;
    background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
    border: 1.5px dashed rgba(0,180,255,0.30);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    min-height: 200px;
    text-decoration: none;
}
.grid-add:hover {
    background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(4,8,20,0.55) 100%);
    border-color: rgba(0,180,255,0.60);
}
.grid-add-glyph {
    font-family: var(--tek-display);
    font-size: 2rem;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 10px var(--tek-blue-glow));
    line-height: 1;
}
.grid-add-label {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    text-align: center;
}
.grid-add:hover .grid-add-label { color: var(--tek-blue); }

/* ═════════════════════════════════════════════════════════════════════════
   FOOTER
   ═════════════════════════════════════════════════════════════════════════ */
.bottom-note {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    white-space: nowrap;
}

@media (max-width: 720px) {
    .list-row { grid-template-columns: auto 1fr auto auto; gap: 12px; padding: 10px 14px 10px 18px; }
    .list-row .cat-pill, .list-row .list-stat, .list-row .list-actions { display: none; }
    .vault-header { align-items: flex-start; }
    .btn-add { font-size: 0.7rem; padding: 9px 14px; }
    .stage { padding: 60px 14px 80px; }
}
</style>
