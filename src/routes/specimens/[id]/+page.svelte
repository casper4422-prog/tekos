<script lang="ts">
    import type { PageData } from './$types';
    import { onMount } from 'svelte';
    import { computeBadges, getStat, type Stats } from '$lib/badges';
    import { copyCreatureLink, shareCreatureToDiscord } from '$lib/discordShare';
    import PinModal from '$lib/components/PinModal.svelte';

    let { data }: { data: PageData } = $props();
    const c = $derived(data.creature);

    const STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;
    type StatKey = typeof STATS[number];

    const badges = $derived(computeBadges(c.baseStats, c.mutations, c.species));

    function totalLevel(s: StatKey) {
        return getStat(c.baseStats, s) + getStat(c.mutations, s);
    }

    const totalMuts = $derived(STATS.reduce((sum, s) => sum + getStat(c.mutations, s), 0));
    const grandTotal = $derived(STATS.reduce((sum, s) => sum + totalLevel(s), 0));

    const ownerName = $derived(data.owner.nickname ?? data.owner.discordName ?? 'Unknown survivor');
    const tribeLabel = $derived(data.userTribeName ?? 'INDEPENDENT');

    const loggedDate = $derived(new Date(c.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '·'));
    const loggedDateLong = $derived(new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));

    // ── Species → category mapping (mirrors the vault list page) ────────
    const CATEGORY_MAP: Record<string, string> = {
        'wyvern': 'flyer', 'argentavis': 'flyer', 'pteranodon': 'flyer', 'quetzal': 'flyer',
        'tropeognathus': 'flyer', 'tapejara': 'flyer', 'griffin': 'flyer', 'snow owl': 'flyer',
        'managarmr': 'flyer', 'desmodus': 'flyer',
        'rex': 'combat', 'tyrannosaurus': 'combat', 'yutyrannus': 'combat', 'allosaurus': 'combat',
        'carnotaurus': 'combat', 'giganotosaurus': 'combat', 'spino': 'combat', 'spinosaurus': 'combat',
        'megalosaurus': 'combat', 'thylacoleo': 'combat', 'sabertooth': 'combat', 'direwolf': 'combat',
        'baryonyx': 'combat',
        'basilosaurus': 'water', 'megalodon': 'water', 'mosasaurus': 'water', 'plesiosaurus': 'water',
        'tusoteuthis': 'water', 'manta': 'water', 'ichthyosaurus': 'water', 'sarco': 'water',
        'carcharodontosaurus': 'mount', 'paraceratherium': 'mount', 'brontosaurus': 'mount',
        'diplodocus': 'mount', 'rhinoceros': 'mount', 'woolly rhino': 'mount', 'mammoth': 'mount',
        'megaloceros': 'mount',
        'therizinosaurus': 'resource', 'doedicurus': 'resource', 'ankylosaurus': 'resource',
        'castoroides': 'resource', 'beaver': 'resource', 'mantis': 'resource', 'gacha': 'resource',
        'broodmother': 'boss', 'megapithecus': 'boss', 'dragon': 'boss', 'manticore': 'boss',
        'overseer': 'boss'
    };
    function categoryFor(species: string): string {
        const low = (species || '').toLowerCase();
        if (CATEGORY_MAP[low]) return CATEGORY_MAP[low];
        for (const key of Object.keys(CATEGORY_MAP)) {
            if (low.includes(key)) return CATEGORY_MAP[key];
        }
        return 'utility';
    }
    // Cat-rgb mapping per the design spec
    const CAT_RGB: Record<string, string> = {
        combat:   '239,68,68',
        flyer:    '6,182,212',
        utility:  '34,197,94',
        water:    '59,130,246',
        mount:    '249,115,22',
        resource: '167,139,250',
        boss:     '245,158,11'
    };
    const category = $derived(categoryFor(c.species));
    const catRgb   = $derived(CAT_RGB[category] ?? '239,68,68');
    const catLabel = $derived(category.toUpperCase());

    // ── Stat genealogy: trace each stat to a parent / mutation ──────────
    type SourceTag = 'paternal' | 'maternal' | 'mutation' | 'unknown';
    function statSource(s: StatKey): SourceTag {
        const childBase = getStat(c.baseStats, s);
        const pat = data.parents.paternal;
        const mat = data.parents.maternal;
        const patMatch = pat && getStat(pat.baseStats, s) === childBase;
        const matMatch = mat && getStat(mat.baseStats, s) === childBase;
        if (patMatch && !matMatch) return 'paternal';
        if (matMatch && !patMatch) return 'maternal';
        if (patMatch && matMatch)  return 'paternal'; // tie → paternal
        if (getStat(c.mutations, s) > 0) return 'mutation';
        return 'unknown';
    }

    function sourceName(tag: SourceTag): string {
        if (tag === 'paternal' && data.parents.paternal) return `"${data.parents.paternal.name}"`;
        if (tag === 'maternal' && data.parents.maternal) return `"${data.parents.maternal.name}"`;
        if (tag === 'mutation') return 'Mutation gain';
        return '—';
    }

    function sourceClass(tag: SourceTag): string {
        if (tag === 'paternal') return 'male';
        if (tag === 'maternal') return 'female';
        return '';
    }

    function genderGlyph(g: string): string {
        const l = (g || '').toLowerCase();
        if (l === 'male')   return '♂';
        if (l === 'female') return '♀';
        return '?';
    }
    function genderClass(g: string): string {
        const l = (g || '').toLowerCase();
        if (l === 'male')   return 'male';
        if (l === 'female') return 'female';
        return 'unknown';
    }

    function mutTotal(s: { mutations: Stats }): number {
        return Object.values(s.mutations ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
    }

    function shortDate(d: Date | string): string {
        return new Date(d).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '·');
    }

    function relTime(d: Date | string): string {
        const diff = Date.now() - new Date(d).getTime();
        const day = 24 * 60 * 60 * 1000;
        if (diff < day) return 'today';
        const days = Math.floor(diff / day);
        if (days === 1) return '1d ago';
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w ago`;
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    }

    // ── Activity event rendering ────────────────────────────────────────
    function eventDot(type: string): string {
        if (type === 'creature_add' || type === 'breed') return 'species';
        if (type === 'boss_fight' || type === 'boss_record') return 'boss';
        if (type === 'trade_list' || type === 'trade_open') return 'trade';
        if (type === 'pin' || type === 'project_pin') return 'diamond';
        return '';
    }
    function eventText(e: { type: string; data: Record<string, unknown> }): string {
        const d = e.data ?? {};
        if (e.type === 'creature_add') return `Logged to vault as ${d.species ?? c.species} "${d.name ?? c.name}"`;
        if (e.type === 'breed')        return `Bred offspring "${d.name ?? 'unnamed'}"`;
        if (e.type === 'boss_fight')   return `Committed to ${d.bossName ?? 'a boss'} run`;
        if (e.type === 'trade_list')   return `Listed on marketplace`;
        if (e.type === 'pin' || e.type === 'project_pin') return `Pinned as breeding project`;
        if (e.type === 'retire')       return `Retired to vault archive`;
        return e.type.replace(/_/g, ' ');
    }

    // ── Action handlers ────────────────────────────────────────────────
    let shareMenuOpen = $state(false);
    let shareToast = $state('');
    let pinModalOpen      = $state(false);
    let saving            = $state(false);


    function flashShareToast(msg: string) {
        shareToast = msg;
        setTimeout(() => { if (shareToast === msg) shareToast = ''; }, 1800);
    }
    async function doCopyLink() {
        const ok = await copyCreatureLink(c.id);
        shareMenuOpen = false;
        flashShareToast(ok ? '✓ Link copied' : 'Copy failed');
    }
    async function doDiscordShare() {
        const ok = await shareCreatureToDiscord({
            name: c.name,
            species: c.species,
            gender: c.gender,
            baseStats: c.baseStats,
            mutations: c.mutations,
            availableForBreeding: (data.rawData as Record<string, unknown> | undefined)?.availableForBreeding === true,
            availableForTrade: (data.rawData as Record<string, unknown> | undefined)?.availableForTrade === true
        });
        shareMenuOpen = false;
        flashShareToast(ok ? '✓ Discord copy ready' : 'Copy failed');
    }

    async function retireSpecimen() {
        if (!confirm(`Retire "${c.name}"? It will be archived but kept in your vault.`)) return;
        if (saving) return;
        saving = true;
        try {
            const next: Record<string, unknown> = { ...data.rawData, retired: true };
            const res = await fetch(`/api/creatures/${c.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next)
            });
            if (res.ok) location.reload();
        } finally { saving = false; }
    }

    async function deleteSpecimen() {
        if (!confirm(`Delete "${c.name}" from your vault? This cannot be undone.`)) return;
        const res = await fetch(`/api/creatures/${c.id}`, { method: 'DELETE' });
        if (res.ok) window.location.href = '/specimens';
    }

    // Generic single-field updater for inline Specimen Notes edits (availability
    // toggles, role select). PUTs the merged data blob so unknown fields survive.
    async function updateField(field: string, value: unknown) {
        if (saving) return;
        saving = true;
        try {
            const next: Record<string, unknown> = { ...data.rawData };
            if (value === null || value === undefined || value === '') {
                delete next[field];
            } else {
                next[field] = value;
            }
            const res = await fetch(`/api/creatures/${c.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next)
            });
            if (res.ok) location.reload();
        } finally { saving = false; }
    }
    const ROLE_OPTIONS = ['Breeder', 'Tank', 'DPS', 'Harvester', 'Flyer', 'Utility'] as const;

    // ── Founders + Stat Origins (Phase 4) ──
    // Founders are vault creatures of the same species flagged isFounder=true.
    // Stat Origins maps each of the 7 stat keys to a founder id, stored in
    // creature.data.statOrigins. Pickers are species-filtered.
    const speciesPeers = $derived(
        (data.vault ?? []).filter(v => v.species === c.species)
    );
    const founders = $derived(speciesPeers.filter(v => v.isFounder));
    const nonFounders = $derived(speciesPeers.filter(v => !v.isFounder));
    const statOrigins = $derived(c.statOrigins ?? {});

    async function promoteToFounder(creatureId: number) {
        if (saving) return;
        saving = true;
        try {
            const res = await fetch(`/api/creatures/${creatureId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFounder: true })
            });
            if (res.ok) location.reload();
        } finally { saving = false; }
    }
    async function removeFounderFlag(creatureId: number) {
        if (saving) return;
        if (!confirm('Remove this creature from the founders list?')) return;
        saving = true;
        try {
            const res = await fetch(`/api/creatures/${creatureId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFounder: false })
            });
            if (res.ok) location.reload();
        } finally { saving = false; }
    }
    async function setStatOrigin(stat: string, founderIdStr: string) {
        if (saving) return;
        const founderId = founderIdStr ? Number(founderIdStr) : null;
        const next: Record<string, number> = { ...statOrigins };
        if (founderId === null) delete next[stat];
        else next[stat] = founderId;
        saving = true;
        try {
            const res = await fetch(`/api/creatures/${c.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ statOrigins: next })
            });
            if (res.ok) location.reload();
        } finally { saving = false; }
    }
    function founderName(id: number | undefined): string {
        if (!id) return '—';
        const f = founders.find(fnd => fnd.id === id);
        return f ? `"${f.name}"` : '—';
    }
    function founderStat(id: number | undefined, key: typeof STATS[number]): number {
        if (!id) return 0;
        const f = founders.find(fnd => fnd.id === id);
        return f ? getStat(f.baseStats, key) : 0;
    }

    // ── Mutation tracker bump (Phase 3) ──
    // Mirrors the Dossier project-counter so changes round-trip through DB.
    // PATCHes creature.mutations[focusStat] when the user clicks +/-.
    let focusCurrent = $state(0);
    $effect(() => {
        const stat = data.pinnedProject?.focusStat;
        if (stat) focusCurrent = getStat(c.mutations, stat as 'HP'|'STA'|'OXY'|'FOOD'|'WGT'|'MEL'|'CRA');
    });
    async function bumpFocusStat(delta: number) {
        const stat = data.pinnedProject?.focusStat;
        if (!stat || saving) return;
        saving = true;
        const next = Math.max(0, focusCurrent + delta);
        focusCurrent = next;
        try {
            await fetch(`/api/creatures/${c.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mutations: { [stat]: next } })
            });
        } catch { /* optimistic stays */ }
        saving = false;
    }

    // ── Pin as project: save THIS specific creature as a breeding project ─────
    type ProjectSavePayload = { creatureId: number; focusStat: string | null; targetMutations: number };
    type FeaturedSavePayload = { creatureIds: number[] };
    async function savePinSelection(payload: ProjectSavePayload | FeaturedSavePayload) {
        if ('creatureIds' in payload) {
            // Legacy featured path (not used from this page, but keep for safety)
            await fetch('/api/profile/pinned', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: payload.creatureIds })
            });
        } else {
            await fetch('/api/pinned-projects', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        location.reload();
    }
    // PinModal expects CreatureRow shape — adapt vault + this creature.
    // Keep `c` first so it's available even before vault is needed.
    const allPinCandidates = $derived(
        [c, ...data.vault].map(v => ({
            id: v.id,
            userId: data.owner.id,
            data: {
                name: v.name,
                species: v.species,
                level: v.level,
                gender: v.gender,
                baseStats: v.baseStats as Stats,
                mutations: v.mutations as Stats,
                domesticLevels: {} as Stats
            },
            createdAt: 'createdAt' in v ? (v as { createdAt: Date }).createdAt : new Date()
        }))
    );
    // Existing project entry for this creature (if any) — so reopening the modal
    // pre-fills focus stat / target mutations from what the user previously saved.
    const existingProjectForThis = $derived(
        data.pinnedProject && data.pinnedProject.creatureId === c.id
            ? {
                creatureId: c.id,
                focusStat: (data.pinnedProject.focusStat ?? null) as
                    'HP' | 'STA' | 'OXY' | 'FOOD' | 'WGT' | 'MEL' | 'CRA' | null,
                targetMutations: data.pinnedProject.targetMutations ?? 0
            }
            : null
    );

    let artifactEl: HTMLDivElement;

    // Close share menu when clicking outside it
    function onGlobalShareClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('.share-wrap')) shareMenuOpen = false;
    }
    onMount(() => {
        document.addEventListener('click', onGlobalShareClick);
        return () => document.removeEventListener('click', onGlobalShareClick);
    });

    onMount(() => {
        // 3D parallax tilt on the artifact card
        const card = artifactEl;
        const stage = card?.parentElement;
        function onMove(e: MouseEvent) {
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const tiltY = (x - 0.5) * 14;
            const tiltX = (0.5 - y) * 10;
            card.style.setProperty('--tilt-x', tiltX + 'deg');
            card.style.setProperty('--tilt-y', tiltY + 'deg');
            card.style.setProperty('--mouse-x', (x * 100) + '%');
            card.style.setProperty('--mouse-y', (y * 100) + '%');
        }
        function onLeave() {
            if (!card) return;
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
            card.style.setProperty('--mouse-x', '50%');
            card.style.setProperty('--mouse-y', '50%');
        }
        stage?.addEventListener('mousemove', onMove as EventListener);
        stage?.addEventListener('mouseleave', onLeave as EventListener);

        return () => {
            stage?.removeEventListener('mousemove', onMove as EventListener);
            stage?.removeEventListener('mouseleave', onLeave as EventListener);
        };
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — {c.species} "{c.name}"</title>
</svelte:head>

<div class="stage" style="--cat-rgb: {catRgb}">

    <!-- ═══════════ BREADCRUMB ═══════════ -->
    <div class="breadcrumb">
        <a href="/specimens">Vault</a>
        <span class="sep">›</span>
        <a href="/dex/{c.species}">{c.species}</a>
        <span class="sep">›</span>
        <span class="here">"{c.name}"</span>
    </div>

    <!-- ═══════════ TOP: HERO + INFO ═══════════ -->
    <div class="detail-top">

        <!-- HERO SPECIMEN CARD -->
        <div class="hero-col">
            <div class="artifact-stage">
                <div class="artifact" id="artifact" bind:this={artifactEl}>
                    <div class="artifact-shadow"></div>
                    <div class="artifact-frame">
                        <div class="artifact-ghost"><div class="artifact-ghost-text">{c.species.toUpperCase()}</div></div>
                        <div class="scanner"></div>
                        <div class="bracket tl"></div><div class="bracket tr"></div>
                        <div class="bracket bl"></div><div class="bracket br"></div>

                        <div class="artifact-content">
                            <div class="artifact-top">
                                {#if badges.bloodline}
                                    <div class="tier-badge"><span class="glyph">⬢</span>{badges.bloodline.toUpperCase()}</div>
                                {:else}
                                    <div class="tier-badge"><span class="glyph">⬢</span>LVL {c.level}</div>
                                {/if}
                            </div>

                            <div class="artifact-identity">
                                <div class="identity-species">{c.species.toUpperCase()}</div>
                                <div class="identity-nickname">"{c.name}"</div>
                                <div class="identity-meta">
                                    <span class="gender" class:female={c.gender === 'Female'} class:male={c.gender === 'Male'}>
                                        {c.gender === 'Female' ? '♀' : c.gender === 'Male' ? '♂' : '?'}
                                    </span>
                                    <span class="sep">·</span>
                                    {#if badges.bossReady}
                                        <span class="cat">{badges.bossReady.toUpperCase()} READY</span>
                                    {:else}
                                        <span class="cat">{catLabel}</span>
                                    {/if}
                                </div>
                            </div>

                            <div class="stat-values">
                                <div class="stat-values-header">
                                    <span>Stat</span>
                                    <span class="col-right">Base</span>
                                    <span class="col-right">Mut</span>
                                </div>
                                {#each STATS as s}
                                    {@const base = getStat(c.baseStats, s)}
                                    {@const mut  = getStat(c.mutations, s)}
                                    <div class="stat-row">
                                        <span class="stat-row-label">{s}</span>
                                        <span class="stat-row-base">{base}</span>
                                        <span class="stat-row-mut" class:has-mut={mut > 0} class:zero={mut === 0}>{mut > 0 ? `+${mut}` : '·'}</span>
                                    </div>
                                {/each}
                            </div>

                            <div class="artifact-mutations">
                                <div class="mut-number">{grandTotal}</div>
                                <div class="mut-label">Total Level · {totalMuts} muts</div>
                            </div>

                            <div class="artifact-footer">
                                <span>{c.server ?? '—'}</span>
                                <span class="footer-tribe">⌬ {tribeLabel.toUpperCase()}</span>
                                <span>{loggedDate}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- INFO COLUMN -->
        <div class="info-col">

            <!-- ACTION BAR -->
            {#if data.isOwner}
                <div class="action-bar">
                    <a class="act-btn primary" href="/specimens/{c.id}/edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>Edit</a>
                    <button class="act-btn secondary" onclick={() => pinModalOpen = true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>Pin as Project</button>
                    <div class="share-wrap">
                        <button class="act-btn ghost" onclick={(evt) => { evt.stopPropagation(); shareMenuOpen = !shareMenuOpen; }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>
                        {#if shareMenuOpen}
                            <div class="share-menu">
                                <button class="share-menu-item" onclick={doCopyLink}>📎 Copy Link</button>
                                <button class="share-menu-item" onclick={doDiscordShare}>💬 Share to Discord</button>
                            </div>
                        {/if}
                        {#if shareToast}
                            <div class="share-toast">{shareToast}</div>
                        {/if}
                    </div>
                    <button class="act-btn danger" onclick={retireSpecimen} disabled={c.retired}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22a8 8 0 0 1 16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 2L18 6"/><path d="M18 2l4 4"/></svg>{c.retired ? 'Retired' : 'Retire'}</button>
                    <button class="act-btn danger" onclick={deleteSpecimen}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>Delete</button>
                </div>
            {/if}

            <!-- PROJECT CALLOUT — only when this specimen is a pinned project -->
            {#if data.pinnedProject}
                <div class="project-callout">
                    <div class="project-glyph">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                    </div>
                    <div class="project-text">
                        <div class="project-label">Active Breeding Project</div>
                        <div class="project-name">
                            {#if data.pinnedProject.focusStat}
                                Stacking · {data.pinnedProject.focusStat}
                            {:else}
                                Pinned to Dossier
                            {/if}
                        </div>
                    </div>
                    {#if data.isOwner && data.pinnedProject.focusStat}
                        <div class="project-bumper">
                            <button class="bump-btn minus" onclick={() => bumpFocusStat(-1)} disabled={saving} aria-label="Decrement {data.pinnedProject.focusStat} mutations">−</button>
                            <div class="bump-center">
                                <div class="project-stat">{focusCurrent}{data.pinnedProject.targetMutations ? ` / ${data.pinnedProject.targetMutations}` : ''}</div>
                                <div class="project-stat-lbl">{data.pinnedProject.focusStat} MUTS</div>
                            </div>
                            <button class="bump-btn plus" onclick={() => bumpFocusStat(+1)} disabled={saving} aria-label="Increment {data.pinnedProject.focusStat} mutations">+</button>
                        </div>
                    {:else}
                        <div style="text-align:right">
                            <div class="project-stat">{data.pinnedProject.targetMutations ?? totalMuts}</div>
                            <div class="project-stat-lbl">{data.pinnedProject.targetMutations ? 'TARGET' : 'MUTS'}</div>
                        </div>
                    {/if}
                    <a class="project-open-btn" href="/dossier">Open ▸</a>
                </div>
            {/if}

            <!-- ANCESTRY — Direct Parents + Stat Genealogy + Founders -->
            <div class="ancestry">
                <div class="section-head">
                    <span class="pip"></span>
                    Ancestry
                    <span class="meta">Every base stat traced to a <span class="num">founder wild tame</span></span>
                    <span class="rule"></span>
                </div>

                <!-- DIRECT PARENTS -->
                <div class="subhead">
                    <span class="num">1</span>Direct Parents
                    <span class="count">{(data.parents.paternal ? 1 : 0) + (data.parents.maternal ? 1 : 0)}</span>
                </div>
                <div class="ancestor-rows">
                    {#if data.parents.paternal}
                        {@const p = data.parents.paternal}
                        <a class="ancestor male" href="/specimens/{p.id}">
                            <span class="gender-glyph male">♂</span>
                            <div class="ancestor-id">
                                <div class="ancestor-species">{p.species}<span class="nick">· "{p.name}"</span></div>
                                <div class="ancestor-meta">Father · Lvl {p.level}</div>
                            </div>
                            <span class="ancestor-lvl">{p.level}</span>
                            <span class="ancestor-muts">{mutTotal(p)} muts</span>
                        </a>
                    {/if}
                    {#if data.parents.maternal}
                        {@const m = data.parents.maternal}
                        <a class="ancestor female" href="/specimens/{m.id}">
                            <span class="gender-glyph female">♀</span>
                            <div class="ancestor-id">
                                <div class="ancestor-species">{m.species}<span class="nick">· "{m.name}"</span></div>
                                <div class="ancestor-meta">Mother · Lvl {m.level}</div>
                            </div>
                            <span class="ancestor-lvl">{m.level}</span>
                            <span class="ancestor-muts">{mutTotal(m)} muts</span>
                        </a>
                    {/if}
                    {#if !data.parents.paternal && !data.parents.maternal}
                        <div class="ancestor unknown">
                            <span class="gender-glyph unknown">?</span>
                            <div class="ancestor-id">
                                <div class="ancestor-species">— No lineage on record</div>
                                <div class="ancestor-meta">Parents not linked in vault</div>
                            </div>
                            <span class="ancestor-lvl">—</span>
                        </div>
                    {/if}
                </div>

                <!-- FOUNDERS -->
                <div class="subhead">
                    <span class="num">2</span>Founders
                    <span class="count">
                        {#if founders.length}
                            {founders.length} founder{founders.length === 1 ? '' : 's'} for this {c.species} bloodline
                        {:else}
                            None linked yet
                        {/if}
                    </span>
                </div>
                <div class="founders-row">
                    {#each founders as f (f.id)}
                        <div class="founder-chip">
                            <a class="founder-chip-link" href="/specimens/{f.id}">
                                <span class="gender-glyph {genderClass(f.gender)}">{genderGlyph(f.gender)}</span>
                                <div class="founder-chip-id">
                                    <div class="founder-chip-name">"{f.name}"</div>
                                    <div class="founder-chip-stats">HP {getStat(f.baseStats, 'HP')} · MEL {getStat(f.baseStats, 'MEL')} · {f.species}</div>
                                </div>
                            </a>
                            {#if data.isOwner}
                                <button class="founder-remove-btn" onclick={() => removeFounderFlag(f.id)} disabled={saving} title="Unmark as founder">×</button>
                            {/if}
                        </div>
                    {:else}
                        <div class="founder-empty-state">
                            No founders linked. Mark one of your wild-tamed {c.species} as a founder below to start tracking stat origins.
                        </div>
                    {/each}
                </div>
                {#if data.isOwner && nonFounders.length > 0}
                    <details class="add-founder-picker">
                        <summary>+ Mark a {c.species} as founder</summary>
                        <div class="add-founder-list">
                            {#each nonFounders as v (v.id)}
                                <button class="add-founder-row" onclick={() => promoteToFounder(v.id)} disabled={saving}>
                                    <span class="gender-glyph {genderClass(v.gender)}">{genderGlyph(v.gender)}</span>
                                    <div class="add-founder-id">
                                        <div class="add-founder-name">"{v.name}"</div>
                                        <div class="add-founder-meta">Lvl {v.level} · HP {getStat(v.baseStats, 'HP')} · MEL {getStat(v.baseStats, 'MEL')}</div>
                                    </div>
                                    <span class="add-founder-go">+</span>
                                </button>
                            {/each}
                        </div>
                    </details>
                {/if}

                <!-- STAT ORIGINS — only meaningful once at least one founder is linked -->
                {#if founders.length > 0}
                    <div class="subhead">
                        <span class="num">3</span>Stat Origins
                        <span class="count">Which founder contributed each stat to this bloodline</span>
                    </div>
                    <div class="stat-origins">
                        <div class="origin-header">
                            <span>Stat</span>
                            <span class="col-right">This creature</span>
                            <span>Came from</span>
                            <span>Other founders</span>
                        </div>
                        {#each STATS as s}
                            {@const myBase = getStat(c.baseStats, s)}
                            {@const originId = statOrigins[s]}
                            <div class="origin-row">
                                <span class="origin-stat">{s}</span>
                                <span class="origin-base">{myBase}</span>
                                <span class="origin-pick">
                                    {#if data.isOwner}
                                        <select class="origin-select" value={originId ?? ''} onchange={(e) => setStatOrigin(s, (e.currentTarget as HTMLSelectElement).value)} disabled={saving}>
                                            <option value="">—</option>
                                            {#each founders as f (f.id)}
                                                <option value={f.id}>"{f.name}" ({getStat(f.baseStats, s)})</option>
                                            {/each}
                                        </select>
                                    {:else}
                                        <span class="origin-readonly">{founderName(originId)} {#if originId}({founderStat(originId, s)}){/if}</span>
                                    {/if}
                                </span>
                                <span class="origin-hint">
                                    {#each founders.filter(f => f.id !== originId) as f, i (f.id)}{i > 0 ? ' · ' : ''}{f.name}: {getStat(f.baseStats, s)}{/each}
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- PROVENANCE / NOTES -->
            <div class="provenance">
                <div class="section-head">
                    <span class="pip" style="background:rgb(var(--cat-rgb));box-shadow:0 0 6px rgba(var(--cat-rgb),0.55)"></span>
                    Specimen Notes
                    <span class="rule"></span>
                </div>
                <div class="prov-grid">
                    <span class="key">Logged</span>     <span class="val">{loggedDateLong} by <a href="/survivors/{data.owner.id}" class="accent">{ownerName}</a></span>
                    <span class="key">Specimen ID</span> <span class="val">#{c.id}</span>

                    <span class="key">Role</span>
                    <span class="val">
                        {#if data.isOwner}
                            <select class="notes-select" value={c.role ?? ''} onchange={(e) => updateField('role', (e.currentTarget as HTMLSelectElement).value)} disabled={saving}>
                                <option value="">—</option>
                                {#each ROLE_OPTIONS as r}
                                    <option value={r}>{r}</option>
                                {/each}
                            </select>
                        {:else}
                            {c.role ?? '—'}
                        {/if}
                    </span>

                    <span class="key">Availability</span>
                    <span class="val avail-row">
                        {#if data.isOwner}
                            <button class="notes-toggle" class:on={c.availableForBreeding} onclick={() => updateField('availableForBreeding', !c.availableForBreeding)} disabled={saving}>
                                {c.availableForBreeding ? '✓' : '—'} Breeding
                            </button>
                            <button class="notes-toggle" class:on={c.availableForTrade} onclick={() => updateField('availableForTrade', !c.availableForTrade)} disabled={saving}>
                                {c.availableForTrade ? '✓' : '—'} Trade
                            </button>
                        {:else}
                            <span class="avail-pill" class:on={c.availableForBreeding}>{c.availableForBreeding ? '✓' : '—'} Breeding</span>
                            <span class="avail-pill" class:on={c.availableForTrade}>{c.availableForTrade ? '✓' : '—'} Trade</span>
                        {/if}
                    </span>

                    <span class="key">Color Regions</span>
                    <span class="val color-regions">
                        {#each (c.colorRegions ?? ['', '', '', '', '', '']) as col, i}
                            <span class="color-region" title="Region {i}">
                                <span class="color-region-num">{i}</span>
                                <span class="color-region-name">{col || '—'}</span>
                            </span>
                        {/each}
                    </span>

                    <span class="key">Obtained From</span>
                    <span class="val">
                        {#if data.obtainedFromUser}
                            <a href="/survivors/{data.obtainedFromUser.id}" class="accent">{data.obtainedFromUser.nickname ?? data.obtainedFromUser.discordName ?? 'Survivor'}</a>
                            {#if c.obtainedFrom}<span class="dim"> · {c.obtainedFrom}</span>{/if}
                        {:else if c.obtainedFrom}
                            {c.obtainedFrom}
                        {:else}
                            —
                        {/if}
                    </span>

                    <span class="key">Cryo Location</span>
                    <span class="val">{c.cryoLocation || '—'}</span>
                </div>
                {#if c.notes}
                    <p class="prov-notes">{c.notes}</p>
                {/if}
            </div>

        </div>
    </div>

    <!-- ═══════════ OFFSPRING ═══════════ -->
    <section class="section">
        <div class="section-head" style="margin-bottom:18px">
            <span class="pip"></span>
            Offspring
            <span class="meta"><span class="num">{data.offspring.length}</span> hatched</span>
            <span class="rule"></span>
        </div>
        {#if data.offspring.length}
            <div class="offspring-grid">
                {#each data.offspring as o (o.id)}
                    {@const oCat = categoryFor(o.species)}
                    {@const oBadges = computeBadges(o.baseStats, o.mutations, o.species)}
                    {@const tierLabel = oBadges.bossReady ? oBadges.bossReady.charAt(0).toUpperCase() + oBadges.bossReady.slice(1) : oBadges.bloodline ? oBadges.bloodline.charAt(0).toUpperCase() + oBadges.bloodline.slice(1) : 'Standard'}
                    <a class="offspring-card {oCat}" href="/specimens/{o.id}">
                        <div class="offspring-top"><span>{genderGlyph(o.gender)} {tierLabel}</span><span>{relTime(o.createdAt)}</span></div>
                        <div class="offspring-name">{o.species}</div>
                        <div class="offspring-nick">"{o.name}" · <span class="gender {genderClass(o.gender)}">{genderGlyph(o.gender)}</span></div>
                        <div class="offspring-bottom">
                            <div class="offspring-lvl">{o.level}</div>
                            <div class="offspring-muts">{mutTotal(o)} muts</div>
                        </div>
                    </a>
                {/each}
            </div>
        {:else}
            <div class="empty-state">— No offspring recorded yet</div>
        {/if}
    </section>

    <!-- ═══════════ RECENT ACTIVITY ═══════════ -->
    <section class="section">
        <div class="section-head" style="margin-bottom:18px">
            <span class="pip"></span>
            Recent Activity
            <span class="rule"></span>
        </div>
        {#if data.events.length}
            <div class="activity-feed">
                {#each data.events as e (e.id)}
                    <div class="activity-row">
                        <span class="activity-dot {eventDot(e.type)}"></span>
                        <span class="activity-text">{eventText(e)}</span>
                        <span class="activity-time">{relTime(e.createdAt)}</span>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="empty-state">— No activity logged for this specimen yet</div>
        {/if}
    </section>

</div>

{#if data.isOwner}
    <PinModal
        bind:open={pinModalOpen}
        creatures={allPinCandidates}
        mode="project"
        existingProjectId={c.id}
        existingProject={existingProjectForThis}
        onSave={savePinSelection}
    />
{/if}

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
    --tek-serif:        'Crimson Pro', Georgia, serif;
    --cat-rgb:          239,68,68; /* default — overridden inline by category */
}

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1280px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   BREADCRUMB
   ═════════════════════════════════════════════════════════════════════════ */
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    margin-bottom: 18px;
    text-transform: uppercase;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; transition: color 0.2s; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 8px; }
.breadcrumb .here { color: rgb(var(--cat-rgb)); font-weight: 700; text-shadow: 0 0 6px rgba(var(--cat-rgb),0.45); }

/* ═════════════════════════════════════════════════════════════════════════
   DETAIL TOP — Hero + Info two-column layout
   ═════════════════════════════════════════════════════════════════════════ */
.detail-top {
    display: grid;
    grid-template-columns: 400px 1fr;
    gap: 36px;
    margin-bottom: 40px;
}
@media (max-width: 980px) {
    .detail-top { grid-template-columns: 1fr; gap: 24px; }
}

/* ═════════════════════════════════════════════════════════════════════════
   HERO CARD (Specimen Card v2 — Yutyrannus "Roar")
   ═════════════════════════════════════════════════════════════════════════ */
.artifact-stage { perspective: 1400px; perspective-origin: 50% 50%; padding: 16px; }
.artifact {
    --tilt-x: 0deg;
    --tilt-y: 0deg;
    --mouse-x: 50%;
    --mouse-y: 50%;
    position: relative;
    width: 380px;
    height: 580px;
    cursor: pointer;
    transform-style: preserve-3d;
    transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    animation: artifact-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
    margin: 0 auto;
}
@keyframes artifact-in {
    from { opacity: 0; transform: translateY(20px) rotateX(8deg) scale(0.95); filter: blur(4px); }
    to   { opacity: 1; transform: none; filter: blur(0); }
}
.artifact-frame {
    position: absolute;
    inset: 0;
    background:
        radial-gradient(ellipse 100% 60% at 50% 0%, rgba(var(--cat-rgb), 0.10) 0%, transparent 65%),
        linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    clip-path: polygon(22px 0%, calc(100% - 22px) 0%, 100% 22px, 100% calc(100% - 22px), calc(100% - 22px) 100%, 22px 100%, 0% calc(100% - 22px), 0% 22px);
    overflow: hidden;
    transition: filter 0.3s ease;
}
.artifact-shadow {
    position: absolute;
    inset: -4px;
    filter:
        drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.45))
        drop-shadow(0 0 40px rgba(var(--cat-rgb), 0.18))
        drop-shadow(0 24px 64px rgba(0,0,0,0.70));
    transition: filter 0.3s ease;
    pointer-events: none;
}
.artifact:hover .artifact-shadow {
    filter:
        drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.85))
        drop-shadow(0 0 60px rgba(var(--cat-rgb), 0.32))
        drop-shadow(0 32px 80px rgba(0,0,0,0.85));
}
.artifact-frame::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,180,255,0.022) 3px, rgba(0,180,255,0.022) 4px),
        radial-gradient(circle 200px at var(--mouse-x) var(--mouse-y), rgba(var(--cat-rgb), 0.10) 0%, transparent 70%);
    pointer-events: none;
    z-index: 1;
}
.bracket {
    position: absolute;
    width: 22px; height: 22px;
    border: 1.5px solid rgb(var(--cat-rgb));
    filter: drop-shadow(0 0 4px rgba(var(--cat-rgb), 0.6));
    z-index: 5;
    pointer-events: none;
}
.bracket.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.bracket.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.bracket.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
.bracket.br { bottom: 8px; right: 8px; border-left: none; border-top: none; }
.scanner {
    position: absolute;
    left: 0; right: 0;
    height: 80px;
    top: -80px;
    background: linear-gradient(180deg, transparent 0%, rgba(0,180,255,0.22) 50%, transparent 100%);
    pointer-events: none;
    z-index: 4;
    animation: scan-sweep 1.6s 0.6s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}
@keyframes scan-sweep {
    0%   { top: -80px; opacity: 0; }
    20%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
}
.artifact-ghost {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    z-index: 2; pointer-events: none;
    transform: translateZ(-20px);
}
.artifact-ghost-text {
    font-family: var(--tek-display);
    font-size: clamp(2.8rem, 13vw, 5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.025);
    -webkit-text-stroke: 1px rgba(255,255,255,0.045);
    line-height: 1;
    user-select: none;
    text-transform: uppercase;
    white-space: nowrap;
}
.artifact-content {
    position: relative;
    z-index: 3;
    height: 100%;
    padding: 28px 24px 22px;
    display: flex;
    flex-direction: column;
    transform-style: preserve-3d;
}
.artifact-top {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    transform: translateZ(35px);
}
.tier-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, rgba(0,180,255,0.18) 0%, rgba(139,92,246,0.22) 100%);
    border: 1px solid rgba(0,180,255,0.50);
    padding: 5px 12px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    font-family: var(--tek-display);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #7dd3fc;
    text-shadow: 0 0 10px rgba(0,180,255,0.6);
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
    animation: tier-pulse 2.6s ease-in-out infinite;
}
@keyframes tier-pulse {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(0,180,255,0.30)); }
    50%      { filter: drop-shadow(0 0 16px rgba(0,180,255,0.65)); }
}
.tier-badge .glyph { color: var(--tek-blue); filter: drop-shadow(0 0 4px var(--tek-blue-glow)); }
.artifact-identity { margin-top: 18px; text-align: center; transform: translateZ(45px); }
.identity-species {
    font-family: var(--tek-display);
    font-size: clamp(1.2rem, 5.4vw, 2.05rem);
    font-weight: 900;
    letter-spacing: 0.04em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 60%, rgba(0,180,255,0.4) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 14px rgba(0,180,255,0.40));
    margin-bottom: 6px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
}
.identity-nickname {
    font-family: var(--tek-mono);
    font-size: 0.82rem;
    color: var(--tek-text-dim);
    font-style: italic;
    letter-spacing: 0.02em;
    margin-bottom: 12px;
}
.identity-meta {
    display: flex; align-items: center; justify-content: center;
    gap: 14px;
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.identity-meta .gender.female { color: var(--tek-pink); filter: drop-shadow(0 0 4px rgba(244,114,182,0.5)); font-size: 1rem; }
.identity-meta .gender.male { color: #60a5fa; filter: drop-shadow(0 0 4px rgba(96,165,250,0.5)); font-size: 1rem; }
.identity-meta .sep { color: var(--tek-text-faint); }
.identity-meta .cat { color: rgb(var(--cat-rgb)); text-shadow: 0 0 8px rgba(var(--cat-rgb), 0.5); font-weight: 700; }

/* Stat table */
.stat-values {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 14px 4px;
    transform: translateZ(50px);
}
.stat-values-header {
    display: grid;
    grid-template-columns: 60px 1fr 1fr;
    gap: 16px;
    padding-bottom: 7px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(0,180,255,0.14);
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.24em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    font-weight: 700;
}
.stat-values-header .col-right { text-align: right; color: var(--tek-blue); opacity: 0.65; }
.stat-row {
    display: grid;
    grid-template-columns: 60px 1fr 1fr;
    gap: 16px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    align-items: baseline;
}
.stat-row:last-child { border-bottom: none; }
.stat-row-label {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.stat-row-base { font-family: var(--tek-mono); font-size: 0.98rem; font-weight: 600; color: var(--tek-text); text-align: right; }
.stat-row-mut  { font-family: var(--tek-mono); font-size: 0.98rem; font-weight: 700; text-align: right; }
.stat-row-mut.has-mut { color: var(--tek-blue); text-shadow: 0 0 8px var(--tek-blue-glow); }
.stat-row-mut.zero    { color: var(--tek-text-faint); font-weight: 400; }

.artifact-mutations {
    text-align: center;
    padding: 14px 0 10px;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 12px;
    transform: translateZ(50px);
}
.mut-number {
    font-family: var(--tek-display);
    font-size: 3.2rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #7dd3fc 30%, #c084fc 80%, #8b5cf6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 14px rgba(0,180,255,0.40)) drop-shadow(0 0 28px rgba(139,92,246,0.20));
    letter-spacing: 0.04em;
}
.mut-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.30em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 4px;
}
.artifact-footer {
    display: flex;
    justify-content: space-between;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    transform: translateZ(35px);
}
.footer-tribe { color: rgb(var(--cat-rgb)); opacity: 0.95; font-weight: 700; }

/* ═════════════════════════════════════════════════════════════════════════
   INFO COLUMN — Action bar + Project + Lineage + Notes
   ═════════════════════════════════════════════════════════════════════════ */
.info-col { display: flex; flex-direction: column; gap: 20px; }

/* Action toolbar */
.action-bar {
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 14px 18px;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}
.action-bar::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 7px var(--tek-blue-glow);
}
.act-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 8px 14px;
    border: none;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: filter 0.18s, transform 0.18s, background 0.18s;
    text-decoration: none;
}
.act-btn svg { width: 12px; height: 12px; flex-shrink: 0; }
.act-btn.primary {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
}
.act-btn.primary:hover { filter: drop-shadow(0 0 14px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.act-btn.secondary {
    background: rgba(0,180,255,0.08);
    color: #7dd3fc;
    border: 1px solid rgba(0,180,255,0.25);
}
.act-btn.secondary:hover { background: rgba(0,180,255,0.18); border-color: rgba(0,180,255,0.50); }
.act-btn.ghost {
    background: transparent;
    color: var(--tek-text-dim);
    border: 1px solid rgba(255,255,255,0.08);
}
.act-btn.ghost:hover { color: var(--tek-text); border-color: rgba(255,255,255,0.20); }
.act-btn.danger {
    background: rgba(239,68,68,0.08);
    color: #fca5a5;
    border: 1px solid rgba(239,68,68,0.30);
}
.act-btn.danger:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.55); filter: drop-shadow(0 0 8px rgba(239,68,68,0.40)); }
.act-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Inline Set Partner picker overlay ─────────────────────────────── */
.partner-picker {
    background: linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid rgba(0,180,255,0.30);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 18px 12px;
    position: relative;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.25));
}
.partner-picker::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-pink);
    box-shadow: 0 0 6px rgba(244,114,182,0.55);
}
.partner-picker-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-family: var(--tek-mono);
}
.partner-picker-title {
    font-family: var(--tek-display);
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-pink);
}
.partner-picker-meta { font-size: 0.66rem; color: var(--tek-text-dim); letter-spacing: 0.10em; flex: 1; }
.partner-picker-meta strong { color: var(--tek-text); font-weight: 700; }
.partner-clear {
    margin-left: 8px;
    background: rgba(239,68,68,0.10);
    border: 1px solid rgba(239,68,68,0.30);
    color: #fca5a5;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 3px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    cursor: pointer;
}
.partner-close {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.10);
    color: var(--tek-text-dim);
    width: 22px; height: 22px;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.partner-search {
    width: 100%;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    padding: 7px 10px;
    margin-bottom: 8px;
    outline: none;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.partner-search:focus { border-color: rgba(0,180,255,0.45); }
.partner-list { display: flex; flex-direction: column; gap: 3px; max-height: 240px; overflow-y: auto; }
.partner-row {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 7px 10px;
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.04);
    border-left: 2px solid rgba(255,255,255,0.06);
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    cursor: pointer;
    color: inherit;
    text-align: left;
    font-family: inherit;
    transition: all 0.18s;
}
.partner-row.male   { border-left-color: rgba(96,165,250,0.45); }
.partner-row.female { border-left-color: rgba(244,114,182,0.45); }
.partner-row:hover  { background: rgba(244,114,182,0.06); border-left-color: var(--tek-pink); }
.partner-row:disabled { opacity: 0.55; cursor: not-allowed; }
.partner-id { min-width: 0; line-height: 1.3; }
.partner-name { font-family: var(--tek-mono); font-size: 0.74rem; color: var(--tek-text); font-weight: 600; }
.partner-name .nick { color: var(--tek-text-dim); font-style: italic; }
.partner-meta { font-family: var(--tek-mono); font-size: 0.56rem; letter-spacing: 0.10em; color: var(--tek-text-faint); text-transform: uppercase; margin-top: 2px; }
.partner-flag {
    font-family: var(--tek-mono);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-blue);
    background: rgba(0,180,255,0.12);
    padding: 2px 7px;
    border: 1px solid rgba(0,180,255,0.30);
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.partner-empty {
    padding: 18px 12px;
    text-align: center;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-faint);
    font-style: italic;
}

/* Project callout — links to the breeding project tracker */
.project-callout {
    background: linear-gradient(135deg, rgba(0,180,255,0.10) 0%, rgba(139,92,246,0.12) 100%);
    border: 1px solid rgba(0,180,255,0.32);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.30));
}
.project-glyph {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,180,255,0.12);
    border: 1px solid rgba(0,180,255,0.40);
    color: var(--tek-blue);
    flex-shrink: 0;
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
}
.project-glyph svg { width: 16px; height: 16px; }
.project-text { flex: 1; min-width: 0; line-height: 1.35; }
.project-label {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 2px;
}
.project-name {
    font-family: var(--tek-display);
    font-size: 0.84rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.project-stat {
    font-family: var(--tek-display);
    font-size: 1.4rem;
    font-weight: 900;
    color: var(--tek-blue);
    text-shadow: 0 0 10px var(--tek-blue-glow);
    flex-shrink: 0;
    line-height: 1;
    font-variant-numeric: tabular-nums;
}
.project-stat-lbl {
    font-family: var(--tek-mono);
    font-size: 0.54rem;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
    margin-top: 2px;
    text-align: right;
}
.project-open-btn {
    background: rgba(0,180,255,0.18);
    border: 1px solid rgba(0,180,255,0.45);
    color: #7dd3fc;
    font-family: inherit;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    padding: 6px 12px;
    text-transform: uppercase;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    cursor: pointer;
    transition: all 0.18s;
    white-space: nowrap;
    text-decoration: none;
}
.project-open-btn:hover { background: rgba(0,180,255,0.32); filter: drop-shadow(0 0 8px var(--tek-blue-glow)); }

/* ═════════════════════════════════════════════════════════════════════════
   ANCESTRY — 3 generations, compact stacked list
   ═════════════════════════════════════════════════════════════════════════ */
.ancestry {
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 18px 22px 16px 24px;
    position: relative;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.25)) drop-shadow(0 8px 22px rgba(0,0,0,0.40));
}
.ancestry::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: var(--tek-purple);
    box-shadow: 0 0 6px rgba(139,92,246,0.55);
}

.section-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
}
.section-head .pip {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-purple);
    box-shadow: 0 0 6px rgba(139,92,246,0.65);
}
.section-head .meta { color: var(--tek-text-faint); font-size: 0.6rem; }
.section-head .meta .num { color: #c4b5fd; font-weight: 700; }
.section-head .rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(139,92,246,0.20), transparent); }

.gen-block { margin-top: 6px; }
.gen-block + .gen-block { margin-top: 14px; }
.gen-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 7px;
}
.gen-label .num {
    width: 16px; height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.40);
    color: #c4b5fd;
    font-family: var(--tek-display);
    font-size: 0.58rem;
    font-weight: 800;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.gen-label .count { margin-left: auto; color: var(--tek-text-faint); font-size: 0.54rem; }

.ancestor-rows { display: flex; flex-direction: column; gap: 3px; }
.ancestor {
    display: grid;
    grid-template-columns: 18px 1fr auto auto;
    gap: 11px;
    align-items: center;
    padding: 7px 12px 7px 10px;
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.03);
    border-left: 2px solid rgba(255,255,255,0.05);
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    cursor: pointer;
    transition: all 0.18s;
    text-decoration: none;
    color: inherit;
}
.ancestor:hover {
    background: rgba(139,92,246,0.06);
    border-left-color: var(--tek-purple);
}
.ancestor.male   { border-left-color: rgba(96,165,250,0.45); }
.ancestor.female { border-left-color: rgba(244,114,182,0.45); }
.ancestor.unknown { opacity: 0.50; }
.ancestor.male:hover   { border-left-color: #60a5fa; background: rgba(96,165,250,0.05); }
.ancestor.female:hover { border-left-color: var(--tek-pink); background: rgba(244,114,182,0.05); }
.ancestor.unknown:hover { background: rgba(0,0,0,0.30); }

.gender-glyph {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    font-weight: 800;
    text-align: center;
    line-height: 1;
}
.gender-glyph.male   { color: #60a5fa; filter: drop-shadow(0 0 3px rgba(96,165,250,0.5)); }
.gender-glyph.female { color: var(--tek-pink); filter: drop-shadow(0 0 3px rgba(244,114,182,0.5)); }
.gender-glyph.unknown { color: var(--tek-text-faint); font-size: 0.78rem; }

.ancestor-id { min-width: 0; line-height: 1.3; }
.ancestor-species {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ancestor-species .nick { color: var(--tek-text-dim); font-style: italic; margin-left: 3px; }
.ancestor.unknown .ancestor-species { color: var(--tek-text-faint); font-style: italic; }
.ancestor-meta {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-top: 2px;
}
.ancestor-lvl {
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 800;
    background: linear-gradient(135deg, #00d4ff, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 4px rgba(0,180,255,0.30));
    white-space: nowrap;
}
.ancestor.unknown .ancestor-lvl {
    background: none;
    -webkit-text-fill-color: var(--tek-text-faint);
    color: var(--tek-text-faint);
    filter: none;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-style: italic;
    font-weight: 400;
}
.ancestor-muts {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-shadow: 0 0 4px var(--tek-blue-glow);
    white-space: nowrap;
}
.ancestor.unknown .ancestor-muts { display: none; }

/* ═════════════════════════════════════════════════════════════════════════
   STAT GENEALOGY — per stat, show source founder
   ═════════════════════════════════════════════════════════════════════════ */
.stat-geneology { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.statg-header {
    display: grid;
    grid-template-columns: 60px 56px 56px 1fr;
    gap: 14px;
    padding: 0 12px 7px;
    margin-bottom: 2px;
    border-bottom: 1px solid rgba(139,92,246,0.18);
    font-family: var(--tek-mono);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
}
.statg-header .col-right { text-align: right; color: #c4b5fd; opacity: 0.7; }
.statg-row {
    display: grid;
    grid-template-columns: 60px 56px 56px 1fr;
    gap: 14px;
    align-items: center;
    padding: 8px 12px;
    background: rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.03);
    border-left: 2px solid rgba(139,92,246,0.30);
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    transition: all 0.18s;
    text-decoration: none;
    color: inherit;
}
.statg-row:hover {
    background: rgba(139,92,246,0.06);
    border-left-color: var(--tek-purple);
}
.statg-row.active-project {
    border-left-color: var(--tek-blue);
    background: linear-gradient(90deg, rgba(0,180,255,0.10) 0%, rgba(0,0,0,0.20) 50%);
    box-shadow: -3px 0 10px rgba(0,180,255,0.25);
}
.statg-row.active-project:hover { background: linear-gradient(90deg, rgba(0,180,255,0.16) 0%, rgba(0,0,0,0.20) 50%); }

.statg-label {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.statg-row.active-project .statg-label { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); }
.statg-base {
    font-family: var(--tek-mono);
    font-size: 0.96rem;
    font-weight: 700;
    color: var(--tek-text);
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.statg-mut {
    font-family: var(--tek-mono);
    font-size: 0.96rem;
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
}
.statg-mut.has { color: var(--tek-blue); text-shadow: 0 0 7px var(--tek-blue-glow); }
.statg-mut.zero { color: var(--tek-text-faint); font-weight: 400; }
.statg-source {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    line-height: 1.3;
    min-width: 0;
}
.statg-source .arrow { color: var(--tek-text-faint); font-size: 0.62rem; flex-shrink: 0; }
.statg-source .name {
    color: var(--tek-text);
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
}
.statg-source .name.female { color: var(--tek-pink); }
.statg-source .name.male   { color: #60a5fa; }
.statg-source .meta {
    color: var(--tek-text-faint);
    font-size: 0.6rem;
    letter-spacing: 0.06em;
}
.statg-source .active-flag {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: auto;
    background: rgba(0,180,255,0.16);
    border: 1px solid rgba(0,180,255,0.40);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.52rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 2px 7px;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
    text-shadow: 0 0 5px var(--tek-blue-glow);
    white-space: nowrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   FOUNDERS — wild tame origins of the line
   ═════════════════════════════════════════════════════════════════════════ */
.founders-list { display: flex; flex-direction: column; gap: 5px; margin-top: 4px; }
.founder {
    display: grid;
    grid-template-columns: 22px 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 9px 14px 9px 12px;
    background: linear-gradient(160deg, rgba(34,197,94,0.04) 0%, rgba(4,8,20,0.65) 100%);
    border: 1px solid rgba(255,255,255,0.04);
    border-left: 2px solid rgba(34,197,94,0.35);
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    cursor: pointer;
    transition: all 0.18s;
    text-decoration: none;
    color: inherit;
}
.founder:hover {
    background: linear-gradient(160deg, rgba(34,197,94,0.10) 0%, rgba(4,8,20,0.85) 100%);
    border-left-color: #34d399;
}
.founder.deceased { opacity: 0.55; border-left-color: rgba(255,255,255,0.10); }
.founder.deceased:hover { opacity: 0.75; background: rgba(0,0,0,0.30); }

.founder-glyph {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(34,197,94,0.18);
    border: 1px solid rgba(34,197,94,0.45);
    color: #86efac;
    font-family: var(--tek-display);
    font-size: 0.66rem;
    font-weight: 800;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    flex-shrink: 0;
}
.founder.deceased .founder-glyph { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.10); color: var(--tek-text-faint); }
.founder-id { min-width: 0; line-height: 1.3; }
.founder-name {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--tek-text);
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.founder-name .titled { color: #86efac; font-weight: 700; }
.founder-meta {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-top: 2px;
}
.founder-contrib {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    color: #86efac;
    text-shadow: 0 0 5px rgba(52,211,153,0.45);
    white-space: nowrap;
    text-align: right;
}
.founder.deceased .founder-contrib { color: var(--tek-text-faint); text-shadow: none; }
.founder-tamed {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    white-space: nowrap;
}

/* Sub-sub headers inside ancestry */
.subhead {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 14px 0 10px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.subhead .num {
    width: 16px; height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(139,92,246,0.15);
    border: 1px solid rgba(139,92,246,0.40);
    color: #c4b5fd;
    font-family: var(--tek-display);
    font-size: 0.6rem;
    font-weight: 800;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.subhead .count { margin-left: auto; color: var(--tek-text-faint); font-size: 0.56rem; }

/* ═════════════════════════════════════════════════════════════════════════
   PROVENANCE / NOTES
   ═════════════════════════════════════════════════════════════════════════ */
.provenance {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 16px 22px 14px 24px;
    position: relative;
}
.provenance::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 6px rgba(var(--cat-rgb),0.55);
}
.prov-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 7px 18px;
    margin-top: 8px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
}
.prov-grid .key {
    color: var(--tek-text-faint);
    font-size: 0.56rem;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    font-weight: 700;
}
.prov-grid .val { color: var(--tek-text); font-weight: 500; }
.prov-grid .val.accent { color: rgb(var(--cat-rgb)); font-weight: 700; text-decoration: none; }
.prov-grid .val.tribe  { color: var(--tek-amber); font-weight: 600; }

.prov-notes {
    margin-top: 14px;
    padding-top: 12px;
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.95rem;
    line-height: 1.5;
    color: #94a3b8;
    padding-left: 10px;
    border-left: 1px solid rgba(var(--cat-rgb),0.25);
    border-top: none;
}
.prov-notes::before { content: '"'; color: rgba(var(--cat-rgb),0.5); font-size: 1.3rem; margin-right: 3px; }
.prov-notes::after  { content: '"'; color: rgba(var(--cat-rgb),0.5); font-size: 1.3rem; margin-left: 3px; }

/* New Notes fields — inline editors for owner, read-only for others */
.prov-grid .val .dim { color: var(--tek-text-dim); }

.notes-select {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    padding: 4px 22px 4px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    appearance: none; -webkit-appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 10px) 50%, calc(100% - 6px) 50%;
    background-size: 5px 5px; background-repeat: no-repeat;
    cursor: pointer;
}
.notes-select:focus { outline: none; border-color: var(--tek-blue); }
.notes-select option { background: #0a1228; color: var(--tek-text); }

.avail-row { display: inline-flex; gap: 6px; }
.notes-toggle {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    padding: 4px 9px;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
}
.notes-toggle:hover:not(:disabled) { color: var(--tek-text); border-color: var(--tek-blue-border); }
.notes-toggle.on {
    background: rgba(16,185,129,0.12);
    border-color: rgba(16,185,129,0.45);
    color: #86efac;
}
.notes-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

.avail-pill {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    padding: 4px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    margin-right: 4px;
}
.avail-pill.on {
    background: rgba(16,185,129,0.12);
    border-color: rgba(16,185,129,0.45);
    color: #86efac;
}

.color-regions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}
.color-region {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.06);
    padding: 3px 8px;
    font-size: 0.66rem;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.color-region-num {
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.10em;
}
.color-region-name {
    color: var(--tek-text);
    font-family: var(--tek-mono);
}

/* ═════════════════════════════════════════════════════════════════════════
   OFFSPRING ROW
   ═════════════════════════════════════════════════════════════════════════ */
.offspring-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
@media (max-width: 720px) { .offspring-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .offspring-grid { grid-template-columns: 1fr; } }

.offspring-card {
    --cat-rgb: 239,68,68;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 14px 12px 16px;
    cursor: pointer;
    transition: transform 0.2s ease, filter 0.22s ease;
    filter: drop-shadow(0 0 1px rgba(var(--cat-rgb),0.30)) drop-shadow(0 6px 18px rgba(0,0,0,0.40));
    text-decoration: none;
    color: inherit;
}
.offspring-card:hover {
    transform: translateY(-2px);
    filter: drop-shadow(0 0 2px rgba(var(--cat-rgb),0.65)) drop-shadow(0 10px 24px rgba(0,0,0,0.55));
}
.offspring-card::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 5px rgba(var(--cat-rgb),0.6);
}
.offspring-card.combat   { --cat-rgb: 239,68,68;  }
.offspring-card.flyer    { --cat-rgb: 6,182,212;  }
.offspring-card.utility  { --cat-rgb: 34,197,94;  }
.offspring-card.water    { --cat-rgb: 59,130,246; }
.offspring-card.mount    { --cat-rgb: 249,115,22; }
.offspring-card.resource { --cat-rgb: 167,139,250;}
.offspring-card.boss     { --cat-rgb: 245,158,11; }
.offspring-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    font-family: var(--tek-mono);
    font-size: 0.54rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.offspring-top .gender.male   { color: #60a5fa; }
.offspring-top .gender.female { color: var(--tek-pink); }
.offspring-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 2px;
}
.offspring-nick {
    font-family: var(--tek-mono);
    font-size: 0.64rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-bottom: 8px;
}
.offspring-nick .gender.male   { color: #60a5fa; }
.offspring-nick .gender.female { color: var(--tek-pink); }
.offspring-bottom {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.offspring-lvl {
    font-family: var(--tek-display);
    font-size: 1.2rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.offspring-muts {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-shadow: 0 0 4px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═════════════════════════════════════════════════════════════════════════ */
.section { margin-bottom: 42px; }
.activity-feed {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 6px 0;
}
.activity-row {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 12px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.activity-row:last-child { border-bottom: none; }
.activity-row:hover { background: rgba(0,180,255,0.03); }
.activity-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
    margin: 0 auto;
}
.activity-dot.species { background: #c084fc; box-shadow: 0 0 6px rgba(192,132,252,0.7); }
.activity-dot.diamond { background: #00b4ff; box-shadow: 0 0 7px var(--tek-blue-glow); }
.activity-dot.boss    { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.7); }
.activity-dot.trade   { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.7); }
.activity-text {
    font-size: 0.88rem;
    color: var(--tek-text);
    line-height: 1.45;
}
.activity-text .who   { color: #fcd34d; font-weight: 600; }
.activity-text .what  { color: #c4b5fd; font-weight: 600; }
.activity-time {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    white-space: nowrap;
}

.empty-state {
    background: linear-gradient(160deg, rgba(10,18,44,0.6) 0%, rgba(4,8,20,0.75) 100%);
    border: 1px dashed rgba(255,255,255,0.06);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 30px 20px;
    text-align: center;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-faint);
    font-style: italic;
    letter-spacing: 0.10em;
}

@media (max-width: 720px) {
    .stage { padding: 60px 14px 80px; }
    .artifact { width: 100%; max-width: 360px; height: 560px; }
    .ancestor { grid-template-columns: 18px 1fr auto; gap: 10px; padding: 7px 10px; }
    .ancestor-muts { display: none; }
}

/* ─── Share dropdown (in action bar) ───────────────────────────── */
.share-wrap { position: relative; display: inline-flex; }
.share-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: linear-gradient(160deg, rgba(20,28,52,0.97), rgba(8,14,28,1));
    border: 1px solid rgba(0,180,255,0.30);
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    padding: 4px;
    z-index: 50;
    min-width: 180px;
    filter: drop-shadow(0 8px 18px rgba(0,0,0,0.55));
}
.share-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    color: var(--tek-text);
    font-family: inherit;
    font-size: 0.78rem;
    padding: 7px 10px;
    cursor: pointer;
    transition: background 0.15s;
}
.share-menu-item:hover { background: rgba(0,180,255,0.12); color: var(--tek-blue); }

.share-toast {
    position: absolute;
    top: -28px; left: 0;
    background: linear-gradient(160deg, rgba(20,28,52,0.95), rgba(8,14,28,1));
    border: 1px solid rgba(16,185,129,0.35);
    color: #86efac;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.10em;
    padding: 4px 9px;
    white-space: nowrap;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    z-index: 60;
}

/* ── Mutation tracker bumper (project-callout) ── */
.project-bumper {
    display: flex;
    align-items: center;
    gap: 8px;
}
.bump-btn {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,180,255,0.10);
    border: 1px solid rgba(0,180,255,0.32);
    color: var(--tek-blue);
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 900;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
}
.bump-btn:hover:not(:disabled) {
    background: rgba(0,180,255,0.25);
    filter: drop-shadow(0 0 6px var(--tek-blue-glow));
}
.bump-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bump-center { text-align: center; min-width: 80px; }

/* ─── Founders + Stat Origins (Phase 4 ancestry rework) ─────────────── */
.founders-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}
.founder-chip {
    display: flex;
    align-items: stretch;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(0,180,255,0.22);
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    transition: border-color 0.18s;
}
.founder-chip:hover { border-color: rgba(0,180,255,0.45); }
.founder-chip-link {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    text-decoration: none;
    color: inherit;
    min-width: 0;
}
.founder-chip-link .gender-glyph { font-size: 1.1rem; font-family: var(--tek-display); }
.founder-chip-id { min-width: 0; line-height: 1.3; }
.founder-chip-name { font-family: var(--tek-mono); font-size: 0.82rem; color: var(--tek-text); font-weight: 600; }
.founder-chip-stats { font-family: var(--tek-mono); font-size: 0.64rem; letter-spacing: 0.06em; color: var(--tek-text-dim); margin-top: 2px; }
.founder-remove-btn {
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    border: none;
    border-left: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-faint);
    cursor: pointer;
    padding: 0 10px;
    font-size: 1rem;
    transition: color 0.15s, background 0.15s;
}
.founder-remove-btn:hover:not(:disabled) { color: var(--tek-red); background: rgba(239,68,68,0.10); }
.founder-remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.founder-empty-state {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.85rem;
    color: var(--tek-text-dim);
    padding: 14px 16px;
    background: rgba(0,0,0,0.20);
    border-left: 2px solid rgba(0,180,255,0.30);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
}

.add-founder-picker {
    margin-bottom: 20px;
}
.add-founder-picker summary {
    cursor: pointer;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-blue);
    padding: 7px 12px;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.25);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    display: inline-block;
    list-style: none;
    transition: background 0.15s;
}
.add-founder-picker summary::-webkit-details-marker { display: none; }
.add-founder-picker summary:hover { background: rgba(0,180,255,0.18); }
.add-founder-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
}
.add-founder-row {
    display: grid;
    grid-template-columns: 22px 1fr auto;
    gap: 10px;
    align-items: center;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text);
    padding: 7px 12px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    transition: all 0.15s;
}
.add-founder-row:hover:not(:disabled) { border-color: rgba(0,180,255,0.45); background: rgba(0,180,255,0.06); }
.add-founder-row:disabled { opacity: 0.5; cursor: not-allowed; }
.add-founder-id { min-width: 0; line-height: 1.3; }
.add-founder-name { font-family: var(--tek-mono); font-size: 0.78rem; color: var(--tek-text); }
.add-founder-meta { font-family: var(--tek-mono); font-size: 0.62rem; letter-spacing: 0.04em; color: var(--tek-text-dim); margin-top: 2px; }
.add-founder-go { color: var(--tek-blue); font-family: var(--tek-display); font-size: 1rem; }

.stat-origins {
    background: rgba(0,0,0,0.25);
    border-left: 2px solid rgba(0,180,255,0.40);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    padding: 12px 16px 14px;
}
.origin-header {
    display: grid;
    grid-template-columns: 60px 100px 1fr 1fr;
    gap: 14px;
    align-items: center;
    padding-bottom: 8px;
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.origin-header .col-right { text-align: left; }
.origin-row {
    display: grid;
    grid-template-columns: 60px 100px 1fr 1fr;
    gap: 14px;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
}
.origin-row:last-child { border-bottom: none; }
.origin-stat { color: var(--tek-blue); font-weight: 700; letter-spacing: 0.08em; }
.origin-base { color: var(--tek-text); font-weight: 600; }
.origin-pick { min-width: 0; }
.origin-select {
    width: 100%;
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    padding: 5px 22px 5px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    appearance: none; -webkit-appearance: none; cursor: pointer;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 10px) 50%, calc(100% - 6px) 50%;
    background-size: 5px 5px; background-repeat: no-repeat;
}
.origin-select:focus { outline: none; border-color: var(--tek-blue); }
.origin-select option { background: #0a1228; color: var(--tek-text); }
.origin-readonly { color: var(--tek-text); }
.origin-hint { color: var(--tek-text-faint); font-size: 0.64rem; letter-spacing: 0.04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
