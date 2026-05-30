<script lang="ts">
    import { goto } from '$app/navigation';
    import { computeBadges } from '$lib/badges';
    import PinModal from '$lib/components/PinModal.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let pinModalOpen = $state(false);
    let pinModalMode = $state<'project' | 'featured'>('project');

    // Pinned-projects view toggle. Card default for the visual at-a-glance,
    // list compresses each project to a single row for users running 5–6
    // active projects who don't want to scroll through tall cards.
    let pinnedView = $state<'card' | 'list'>('card');

    // Share button — copies a link to this user's public dossier to the clipboard.
    let shareLabel = $state('Share');
    async function copyProfileLink() {
        if (!data.profile?.id) return;
        const url = `${window.location.origin}/survivors/${data.profile.id}`;
        const name = data.profile.nickname ?? data.profile.discordName ?? 'your dossier';
        try {
            await navigator.clipboard.writeText(url);
            shareLabel = `Copied ${name}`;
        } catch {
            shareLabel = 'Copy failed';
        }
        setTimeout(() => { shareLabel = 'Share'; }, 2200);
    }

    function openProject(creatureId: number, e?: KeyboardEvent | MouseEvent) {
        // Bump buttons stopPropagation themselves so this only fires for card-level clicks.
        if (e && 'key' in e && e.key !== 'Enter' && e.key !== ' ') return;
        if (e && 'key' in e) e.preventDefault();
        goto(`/specimens/${creatureId}`);
    }

    async function savePin(payload: { creatureId: number; focusStat: string | null; targetMutations: number } | { creatureIds: number[] }) {
        if ('creatureIds' in payload) {
            await fetch('/api/profile/pinned', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ids: payload.creatureIds }) });
        } else {
            await fetch('/api/pinned-projects', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        }
        pinModalOpen = false;
        window.location.reload();
    }

    const displayName = $derived(data.profile?.nickname ?? data.profile?.email ?? 'Survivor');
    const avatarInitial = $derived((displayName?.[0] ?? 'S').toUpperCase());
    const memberSince = $derived(
        data.profile?.createdAt
            ? new Date(data.profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '·')
            : '—'
    );

    // Each pinned project maps to a (creature, focus stat) pair — a survivor
    // breeding the same Theri for HP and Melee gets two separate cards here,
    // each bumping only its own stat. The HARD_MAX cap in the API limits
    // the total to 6 across all stats and all creatures.
    type Pinned = (typeof data.creatures)[number] & {
        projectId: number;
        focusStat: 'HP'|'STA'|'OXY'|'FOOD'|'WGT'|'MEL'|'CRA'|'SPD';
        targetMutations: number;
    };
    const pinned = $derived<Pinned[]>(
        data.breedingProjects
            .map(p => {
                const creature = data.creatures.find(c => c.id === p.creatureId);
                if (!creature) return null;
                return {
                    ...creature,
                    projectId: p.id,
                    focusStat: p.focusStat as Pinned['focusStat'],
                    targetMutations: p.targetMutations
                };
            })
            .filter((x): x is Pinned => !!x)
    );

    // Short stat key ↔ full key as stored on creature.baseStats/mutations
    const STAT_LONG = {
        HP: 'Health', STA: 'Stamina', OXY: 'Oxygen',
        FOOD: 'Food', WGT: 'Weight', MEL: 'Melee', CRA: 'Crafting'
    } as const;

    function getStatValue(stats: Record<string, number> | undefined, key: Pinned['focusStat']): number {
        if (!stats || !key) return 0;
        const long = (STAT_LONG as Record<string, string>)[key];
        return Number(stats[key] ?? stats[key.toLowerCase()] ?? (long && stats[long]) ?? (long && stats[long.toLowerCase()]) ?? 0);
    }

    // Mutations counter state, keyed by projectId — each (creature, stat) pair
    // gets its own counter so two projects on the same Theri (HP + MEL) don't
    // collide. Effect must not read mutationCounts inside the same write
    // (Svelte 5 effect_update_depth_exceeded). Initialize from each project's
    // stored focus-stat mutations on every pinned-change.
    let mutationCounts = $state<Record<number, number>>({});

    $effect(() => {
        const next: Record<number, number> = {};
        for (const p of pinned) {
            next[p.projectId] = getStatValue(p.mutations, p.focusStat);
        }
        mutationCounts = next;
    });

    async function unpinProject(p: Pinned) {
        if (!confirm(`Unpin the ${p.focusStat} project for "${p.name}"?`)) return;
        // ?id is the creatureId, ?focusStat scopes the delete to this one project
        // (without focusStat the API removes ALL projects for that creature).
        const params = new URLSearchParams({ id: String(p.id), focusStat: p.focusStat });
        await fetch(`/api/pinned-projects?${params}`, { method: 'DELETE' });
        window.location.reload();
    }

    async function bump(p: Pinned, delta: number) {
        const cur = mutationCounts[p.projectId] ?? 0;
        const next = Math.max(0, cur + delta);
        mutationCounts[p.projectId] = next;
        // Persist to creature.mutations[focusStat] via PATCH so the Individual
        // page and any other project on the same creature read the latest count.
        try {
            await fetch(`/api/creatures/${p.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mutations: { [p.focusStat]: next } })
            });
        } catch { /* keep optimistic UI value on failure */ }
    }

    // Tier ordering for sorting earned badges
    const bloodlineOrder = { diamond: 4, gold: 3, silver: 2, bronze: 1 } as const;
    const bossOrder = { titan: 4, alpha: 3, beta: 2, gamma: 1 } as const;

    const sortedBloodline = $derived(
        [...data.badgeWall.bloodline].sort((a, b) => {
            const ao = a.tier ? bloodlineOrder[a.tier] : 0;
            const bo = b.tier ? bloodlineOrder[b.tier] : 0;
            return bo - ao || a.species.localeCompare(b.species);
        })
    );
    const sortedBossReady = $derived(
        [...data.badgeWall.bossReady].sort((a, b) => {
            const ao = a.tier ? bossOrder[a.tier] : 0;
            const bo = b.tier ? bossOrder[b.tier] : 0;
            return bo - ao || a.species.localeCompare(b.species);
        })
    );

    function roleTierLabel(role: string) {
        return role === 'tank' ? 'TANK'
            : role === 'dps' ? 'DPS'
            : role === 'bruiser' ? 'BRUISER'
            : role === 'vanguard' ? 'VANGUARD'
            : role === 'packmaster' ? 'PACKMASTER'
            : role === 'endurance' ? 'ENDURANCE'
            : role.toUpperCase();
    }

    // For a badge wall chip (Boss Ready / Bloodline / Role / Underdog), find the
    // representative creature in this user's vault that earned it. Returns the
    // first match by recency (data.creatures is desc by createdAt). Falls back
    // to /specimens (filtered list) when no specific creature matches.
    function creatureForBadge(species: string, kind: 'bloodline'|'bossReady'|'role'|'underdog', value: string): number | null {
        for (const c of data.creatures) {
            if (c.species !== species) continue;
            const b = computeBadges(c.baseStats, c.mutations, c.species);
            if (kind === 'bloodline' && b.bloodline === value) return c.id;
            if (kind === 'bossReady' && b.bossReady === value) return c.id;
            if (kind === 'role' && value in b.roles) return c.id;
            if (kind === 'underdog' && b.underdog === value) return c.id;
        }
        return null;
    }
    function badgeHref(species: string, kind: 'bloodline'|'bossReady'|'role'|'underdog', value: string): string {
        const cid = creatureForBadge(species, kind, value);
        return cid ? `/specimens/${cid}` : '/specimens';
    }

    // Category color class for pin-card from species heuristics (combat / flyer / utility / etc.)
    function categoryForSpecies(species: string): string {
        const s = species.toLowerCase();
        if (/(wyvern|argentavis|pteranodon|griffin|quetz|tapejara|tropeognathus)/.test(s)) return 'flyer';
        if (/(basilosaurus|mosasaur|tusoteuthis|megalodon|ichthyosaur)/.test(s)) return 'water';
        if (/(rex|yutyrannus|carcha|allosaurus|spino|giga|theriz|carno|raptor|sabertooth)/.test(s)) return 'combat';
        if (/(doedicurus|ankylo|beaver|mammoth)/.test(s)) return 'resource';
        if (/(direwolf|ravager|equus|paraceratherium|stego|trike)/.test(s)) return 'mount';
        return 'utility';
    }

    function categoryLabel(c: string): string {
        return c.charAt(0).toUpperCase() + c.slice(1);
    }

    function relativeTime(d: Date | string | undefined): string {
        if (!d) return '—';
        const date = typeof d === 'string' ? new Date(d) : d;
        const diff = Date.now() - date.getTime();
        const day = 24 * 60 * 60 * 1000;
        if (diff < day) return 'today';
        const days = Math.floor(diff / day);
        if (days === 1) return 'yesterday';
        if (days < 7) return `${days} days ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w ago`;
        const months = Math.floor(days / 30);
        return `${months}mo ago`;
    }

    // ─── Recent Activity helpers ─────────────────────────────────
    function activityIcon(type: string): string {
        if (type === 'creature_add') return '🧬';
        if (type === 'boss_record' || type === 'boss_fight') return '⚔';
        if (type === 'trade_list' || type === 'trade_open' || type === 'trade_close') return '⇆';
        if (type === 'badge_earned') return '⬢';
        return '◈';
    }
    function activityText(a: { type: string; data: unknown }): string {
        const d = (a.data && typeof a.data === 'object' ? a.data : {}) as Record<string, unknown>;
        if (a.type === 'creature_add') return `Logged ${String(d.species ?? d.name ?? 'a specimen')}`;
        if (a.type === 'boss_record' || a.type === 'boss_fight') return `${d.outcome === 'success' ? 'Beat' : 'Fought'} ${String(d.bossName ?? 'a boss')}`;
        if (a.type === 'trade_list' || a.type === 'trade_open') {
            const verb = d.direction === 'buy' ? 'Looking for' : 'Listed';
            return `${verb} ${String(d.species ?? d.item ?? 'something')}`;
        }
        if (a.type === 'trade_close') return `Closed a trade${d.species ? ` for ${String(d.species)}` : ''}`;
        if (a.type === 'badge_earned') return `Earned ${String(d.badge ?? 'a badge')}`;
        return a.type.replace(/_/g, ' ');
    }
    function activityHref(a: { type: string; data: unknown }): string {
        const d = (a.data && typeof a.data === 'object' ? a.data : {}) as Record<string, unknown>;
        if (a.type === 'creature_add') {
            const id = (d.creatureId ?? d.id) as number | undefined;
            return id ? `/specimens/${id}` : '/specimens';
        }
        if (a.type === 'boss_fight' || a.type === 'boss_record') return '/overseer';
        if (a.type === 'trade_list' || a.type === 'trade_open' || a.type === 'trade_close') return '/marketplace';
        if (a.type === 'badge_earned') return '/badges';
        return '#';
    }

    // ─── Notification preview helpers ────────────────────────────
    function notifIcon(type: string): string {
        if (type === 'friend_request' || type === 'friend_accepted') return '◈';
        if (type.startsWith('tribe_') || type.startsWith('alliance_')) return '⬡';
        if (type.startsWith('trade_') || type.startsWith('offer_')) return '⇆';
        if (type === 'war_room_invite') return '⚔';
        return '◉';
    }
    function notifText(n: { type: string; payload: unknown }): string {
        const p = (n.payload && typeof n.payload === 'object' ? n.payload : {}) as Record<string, unknown>;
        const from = String(p.fromName ?? 'Someone');
        if (n.type === 'friend_request')   return `${from} wants to connect`;
        if (n.type === 'friend_accepted')  return `${from} accepted your friend request`;
        if (n.type === 'tribe_invite')     return `${from} invited you to a tribe`;
        if (n.type === 'tribe_announcement') return `New announcement in ${String(p.tribeName ?? 'your tribe')}`;
        if (n.type === 'trade_offer')      return `${from} made you an offer`;
        if (n.type === 'offer_message')    return `${from} sent a message about an offer`;
        if (n.type === 'offer_counter')    return `${from} sent a counter-offer`;
        if (n.type === 'war_room_invite')  return `${from} invited you to a war room`;
        return n.type.replace(/_/g, ' ');
    }

</script>

<svelte:head>
    <title>⬡ TEKOS — Dossier · {displayName}</title>
</svelte:head>

<div class="stage">

    <!-- ═══════════ IDENTITY BANNER ═══════════ -->
    <section class="identity-banner">
        <div class="banner-image"></div>
        <div class="identity-card">
            <div class="avatar">
                <svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="avg" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stop-color="#00b4ff" stop-opacity="0.28"/>
                            <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.32"/>
                        </linearGradient>
                    </defs>
                    <polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="url(#avg)" stroke="#00b4ff" stroke-width="2" />
                    <text x="50" y="72" font-family="Orbitron, sans-serif" font-size="48" font-weight="900" text-anchor="middle" fill="#7dd3fc">{avatarInitial}</text>
                </svg>
                <div class="avatar-pip" title="Online"></div>
            </div>
            <div class="identity-info">
                <h1 class="callsign">{displayName}</h1>
                <div class="identity-meta">
                    {#if data.tribe}
                        <span class="tribe">⌬ {data.tribe.name}</span>
                        <span class="sep">·</span>
                    {/if}
                    <span>Survivor since {memberSince}</span>
                    {#if data.profile?.discordName}
                        <span class="sep">·</span>
                        <span class="discord">discord: {data.profile.discordName}</span>
                    {/if}
                </div>
                {#if data.profile?.bio}
                    <p class="identity-bio">{data.profile.bio}</p>
                {/if}
            </div>
            <div class="identity-actions">
                <a class="btn btn-primary" href="/settings">Edit Dossier</a>
                <button class="btn btn-ghost" onclick={copyProfileLink}>⬡ {shareLabel}</button>
            </div>
        </div>
    </section>

    <!-- ═══════════ TRIBE SNAPSHOT ═══════════ -->
    {#if data.tribe}
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Tribe
            <span class="rule"></span>
            <a href="/tribe" class="action">Tribe Hub <span class="arrow">▸</span></a>
        </div>
        <a class="tribe-snapshot" href="/tribe">
            <div class="tribe-sigil">
                {#if data.tribe.flagImage}
                    <img src={data.tribe.flagImage} alt="" />
                {:else}
                    <div class="tribe-sigil-fallback">⬡</div>
                {/if}
            </div>
            <div class="tribe-info">
                <div class="tribe-name">{data.tribe.name}</div>
                <div class="tribe-meta">
                    <span class="role">{data.tribe.myRole?.toUpperCase()}</span>
                    <span class="sep">·</span>
                    <span class="count">{data.tribe.memberCount} member{data.tribe.memberCount === 1 ? '' : 's'}</span>
                    {#if data.tribe.mainMap}
                        <span class="sep">·</span>
                        <span class="map">{data.tribe.mainMap}</span>
                    {/if}
                </div>
            </div>
            <span class="tribe-arrow">▸</span>
        </a>
    </section>
    {/if}

    <!-- ═══════════ ACTIVE BREEDING PROJECTS ═══════════ -->
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Active Breeding Projects
            {#if pinned.length > 0}
                <span class="count">{pinned.length} / 6</span>
            {/if}
            <span class="rule"></span>
            {#if pinned.length > 0}
                <div class="pinned-view-toggle">
                    <button type="button" class="pv-btn" class:active={pinnedView === 'card'} onclick={() => pinnedView = 'card'} title="Card view" aria-label="Card view">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    </button>
                    <button type="button" class="pv-btn" class:active={pinnedView === 'list'} onclick={() => pinnedView = 'list'} title="List view" aria-label="List view">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                </div>
            {/if}
            <button type="button" class="action" disabled={pinned.length >= 6} onclick={() => { pinModalMode = 'project'; pinModalOpen = true; }}>+ Pin Project <span class="arrow">▸</span></button>
        </div>
        {#if pinned.length === 0}
            <div class="pinned-empty">
                <div class="pinned-empty-icon">⬡</div>
                <div class="pinned-empty-title">No pinned projects yet</div>
                <div class="pinned-empty-flavor">"Pin a specimen here to track your active breeding focus — mutation counter, target stat, and quick access from your dossier."</div>
                <button type="button" class="pinned-empty-cta" onclick={() => { pinModalMode = 'project'; pinModalOpen = true; }}>+ Pin Your First Project</button>
            </div>
        {:else}
            <!-- Card view (default) -->
            <div class="pinned-row" class:hidden={pinnedView !== 'card'}>
                {#each pinned as c}
                    {@const cat = categoryForSpecies(c.species)}
                    {@const badges = computeBadges(c.baseStats, c.mutations)}
                    {@const tierLabel = badges.bossReady ? `Boss · ${badges.bossReady}` : badges.bloodline ? `${badges.bloodline.charAt(0).toUpperCase() + badges.bloodline.slice(1)} Bloodline` : 'Standard'}
                    {@const focusBase = getStatValue(c.baseStats, c.focusStat)}
                    {@const focusLabel = c.focusStat}
                    {@const currentMut = mutationCounts[c.projectId] ?? 0}
                    {@const targetMut = c.targetMutations ?? 0}
                    <div class="pin-card {cat}" role="link" tabindex="0" onclick={() => openProject(c.id)} onkeydown={(e) => openProject(c.id, e)}>
                        <div class="pin-top">
                            <span class="pin-tier">⬢ {tierLabel}</span>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <button class="pin-unpin" title="Unpin this {focusLabel} project" aria-label="Unpin {focusLabel} project for {c.name}" onclick={(e) => { e.stopPropagation(); unpinProject(c); }}>×</button>
                                <svg class="pin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                            </div>
                        </div>
                        <div class="pin-species">{c.species}</div>
                        <div class="pin-nick">"{c.name}"</div>
                        <div class="pin-meta">
                            <span class="gender {c.gender?.toLowerCase() === 'female' ? 'female' : 'male'}">{c.gender?.toLowerCase() === 'female' ? '♀' : '♂'}</span>
                            <span>·</span>
                            <span class="cat">{categoryLabel(cat)}</span>
                        </div>
                        <div class="project-focus">
                            <div class="project-focus-label">{focusLabel} Base</div>
                            <div class="project-focus-stat">{focusBase}</div>
                        </div>
                        <div class="project-counter">
                            <button class="project-btn minus" title="Decrement {focusLabel} mutations" onclick={(e) => { e.stopPropagation(); bump(c, -1); }}>−</button>
                            <div class="project-counter-center">
                                <div class="project-counter-num">{currentMut}{targetMut > 0 ? ` / ${targetMut}` : ''}</div>
                                <div class="project-counter-lbl">{focusLabel} Mutations</div>
                            </div>
                            <button class="project-btn plus" title="Increment {focusLabel} mutations — new baby with +1" onclick={(e) => { e.stopPropagation(); bump(c, 1); }}>+</button>
                        </div>
                        <div class="project-meta">
                            <div class="project-meta-row"><span class="key">Last bred</span><span class="val">{relativeTime(c.createdAt)}</span></div>
                            {#if c.server}
                                <div class="project-meta-row"><span class="key">Server</span><span class="val">{c.server}</span></div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>

            <!-- List view — compressed single row per project -->
            <div class="pinned-list" class:hidden={pinnedView !== 'list'}>
                {#each pinned as c}
                    {@const focusLabel = c.focusStat}
                    {@const currentMut = mutationCounts[c.projectId] ?? 0}
                    {@const targetMut = c.targetMutations ?? 0}
                    <div class="pin-list-row" role="link" tabindex="0" onclick={() => openProject(c.id)} onkeydown={(e) => openProject(c.id, e)}>
                        <span class="pin-list-gender gender {c.gender?.toLowerCase() === 'female' ? 'female' : 'male'}">{c.gender?.toLowerCase() === 'female' ? '♀' : '♂'}</span>
                        <div class="pin-list-id">
                            <div class="pin-list-species">{c.species}</div>
                            <div class="pin-list-nick">"{c.name}"</div>
                        </div>
                        <div class="pin-list-focus">
                            <span class="pin-list-focus-label">{focusLabel}</span>
                        </div>
                        <div class="pin-list-counter">
                            <button class="project-btn minus" title="Decrement {focusLabel} mutations" onclick={(e) => { e.stopPropagation(); bump(c, -1); }}>−</button>
                            <span class="pin-list-counter-num">{currentMut}{targetMut > 0 ? ` / ${targetMut}` : ''}</span>
                            <button class="project-btn plus" title="Increment {focusLabel} mutations — new baby with +1" onclick={(e) => { e.stopPropagation(); bump(c, 1); }}>+</button>
                        </div>
                        <button class="pin-unpin" title="Unpin this {focusLabel} project" aria-label="Unpin {focusLabel} project for {c.name}" onclick={(e) => { e.stopPropagation(); unpinProject(c); }}>×</button>
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- ═══════════ BADGE WALL (centerpiece) ═══════════ -->
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Badge Wall
            <span class="rule"></span>
            <a href="/badges" class="action">View All <span class="arrow">▸</span></a>
        </div>
        <div class="badge-categories">

            <!-- BOSS READY -->
            {#if sortedBossReady.length}
                <div class="badge-cat">
                    <div class="badge-cat-header">
                        <svg class="badge-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                            <path d="M13 19l6-6"/>
                            <path d="M16 16l4 4"/>
                            <path d="M19 21l2-2"/>
                        </svg>
                        <span class="badge-cat-name">Boss Ready</span>
                        <span class="badge-cat-count">{sortedBossReady.length} earned</span>
                    </div>
                    <div class="badge-cat-chips">
                        {#each sortedBossReady as b}
                            <a class="badge-chip {b.tier}" href={badgeHref(b.species, 'bossReady', b.tier ?? '')}>
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{b.tier}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </a>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- SPECIALIST ROLES -->
            {#if data.badgeWall.roles.length}
                <div class="badge-cat">
                    <div class="badge-cat-header">
                        <svg class="badge-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                        <span class="badge-cat-name">Specialist Roles</span>
                        <span class="badge-cat-count">{data.badgeWall.roles.length} earned</span>
                    </div>
                    <div class="badge-cat-chips">
                        {#each data.badgeWall.roles as b}
                            <a class="badge-chip silver" href={badgeHref(b.species, 'role', b.role)}>
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{roleTierLabel(b.role)}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </a>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- PRIZE BLOODLINE -->
            {#if sortedBloodline.length}
                <div class="badge-cat">
                    <div class="badge-cat-header">
                        <svg class="badge-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 15c6.667-6 13.333 0 20-6"/>
                            <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/>
                            <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/>
                            <path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/>
                            <path d="m3.5 14.5.5.5"/><path d="m20 9 .5.5"/><path d="m6.5 12.5 1 1"/>
                            <path d="m16.5 10.5 1 1"/><path d="m10 16 1.5 1.5"/>
                        </svg>
                        <span class="badge-cat-name">Prize Bloodline</span>
                        <span class="badge-cat-count">{sortedBloodline.length} earned</span>
                    </div>
                    <div class="badge-cat-chips">
                        {#each sortedBloodline as b}
                            <a class="badge-chip {b.tier}" href={badgeHref(b.species, 'bloodline', b.tier ?? '')}>
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/><path d="m3.5 14.5.5.5"/><path d="m20 9 .5.5"/><path d="m6.5 12.5 1 1"/><path d="m16.5 10.5 1 1"/><path d="m10 16 1.5 1.5"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{b.tier}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </a>
                        {/each}
                    </div>
                </div>
            {/if}

        </div>
    </section>

    <!-- ═══════════ ACTIVE TRADES ═══════════ -->
    {#if data.activeTrades.myListings.length > 0 || data.activeTrades.pendingOffers.length > 0}
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Active Trades
            <span class="rule"></span>
            <a href="/marketplace" class="action">Marketplace <span class="arrow">▸</span></a>
        </div>
        <div class="trades-grid">
            {#if data.activeTrades.pendingOffers.length > 0}
            <div class="trades-block">
                <div class="trades-block-label">Offers waiting on you <span class="trades-block-count">{data.activeTrades.pendingOffers.length}</span></div>
                {#each data.activeTrades.pendingOffers as o (o.id)}
                    <a class="trade-row pending" href="/marketplace?offer={o.id}">
                        <span class="trade-icon">⇆</span>
                        <div class="trade-info">
                            <div class="trade-title">{o.fromName} <span class="trade-dim">on your {o.listingType}</span></div>
                            {#if o.message}<div class="trade-preview">"{o.message}"</div>{/if}
                        </div>
                        <span class="trade-time">{relativeTime(o.createdAt)}</span>
                    </a>
                {/each}
            </div>
            {/if}
            {#if data.activeTrades.myListings.length > 0}
            <div class="trades-block">
                <div class="trades-block-label">Your open listings <span class="trades-block-count">{data.activeTrades.myListings.length}</span></div>
                {#each data.activeTrades.myListings as t (t.id)}
                    <a class="trade-row" href="/marketplace?trade={t.id}">
                        <span class="trade-icon">{t.direction === 'buy' ? '◈' : '⬡'}</span>
                        <div class="trade-info">
                            <div class="trade-title">
                                {t.direction === 'buy' ? 'WTB' : 'Listed'} {String(t.species ?? t.listingType)}
                                {#if t.name}<span class="trade-dim">— "{t.name}"</span>{/if}
                            </div>
                            {#if t.wanted}<div class="trade-preview">Want: {t.wanted}</div>{/if}
                        </div>
                        <span class="trade-time">{t.offerCount} offer{t.offerCount === 1 ? '' : 's'}</span>
                    </a>
                {/each}
            </div>
            {/if}
        </div>
    </section>
    {/if}

    <!-- ═══════════ STATS DASHBOARD ═══════════ -->
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Statistics
            <span class="rule"></span>
        </div>
        <div class="stats-grid">
            <a class="stat-cell" href="/specimens">
                <div class="stat-cell-val gradient">{data.stats.specimens}</div>
                <div class="stat-cell-lbl">Specimens</div>
            </a>
            <div class="stat-cell">
                <div class="stat-cell-val">
                    {#if data.stats.tradeRep !== null}
                        {data.stats.tradeRep}<span class="star">★</span>
                    {:else}
                        —
                    {/if}
                </div>
                <div class="stat-cell-lbl">Trade Rep</div>
            </div>
            <a class="stat-cell" href="/badges">
                <div class="stat-cell-val gradient">{data.stats.badges}</div>
                <div class="stat-cell-lbl">Badges</div>
            </a>
            <a class="stat-cell" href="/network">
                <div class="stat-cell-val">{data.stats.friends}<span class="live-pip"></span></div>
                <div class="stat-cell-lbl">Friends</div>
            </a>
            <a class="stat-cell" href="/overseer">
                <div class="stat-cell-val unread">{data.recentBoss.length}</div>
                <div class="stat-cell-lbl">Boss Runs</div>
            </a>
        </div>
    </section>

    <!-- ═══════════ RECENT BOSS RUNS / ACTIVITY FEED ═══════════ -->
    {#if data.recentBoss.length}
        <section class="section">
            <div class="section-header">
                <span class="pip"></span>
                Recent Boss Runs
                <span class="rule"></span>
                <a href="/overseer" class="action">View All <span class="arrow">▸</span></a>
            </div>
            <div class="activity-feed">
                {#each data.recentBoss as b}
                    <div class="activity-row">
                        <span class="activity-dot {b.outcome === 'success' ? 'gold' : 'boss'}"></span>
                        <span class="activity-text">
                            {b.outcome === 'success' ? 'Beat' : 'Attempted'}
                            <strong>{b.difficulty?.toUpperCase()} {b.bossName}</strong>
                            {#if b.outcome !== 'success'} — wipe{/if}
                        </span>
                        <span class="activity-time">{relativeTime(b.createdAt)}</span>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- ═══════════ RECENT ACTIVITY ═══════════ -->
    {#if data.recentActivity.length > 0}
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Recent Activity
            <span class="rule"></span>
        </div>
        <div class="recent-feed">
            {#each data.recentActivity as a (a.id)}
                <a class="recent-row" href={activityHref(a)}>
                    <span class="recent-icon">{activityIcon(a.type)}</span>
                    <span class="recent-text">{activityText(a)}</span>
                    <span class="recent-time">{relativeTime(a.createdAt)}</span>
                </a>
            {/each}
        </div>
    </section>
    {/if}

    <!-- ═══════════ NOTIFICATIONS PREVIEW ═══════════ -->
    {#if data.notifications.unreadCount > 0 || data.notifications.latest.length > 0}
    <section class="section">
        <div class="section-header">
            <span class="pip" class:amber={data.notifications.unreadCount > 0}></span>
            Notifications
            {#if data.notifications.unreadCount > 0}
                <span class="notif-count">{data.notifications.unreadCount} unread</span>
            {/if}
            <span class="rule"></span>
            <a href="/notifications" class="action">View All <span class="arrow">▸</span></a>
        </div>
        <div class="notif-preview">
            {#each data.notifications.latest as n (n.id)}
                <a class="notif-row" class:unread={!n.read} href="/notifications">
                    <span class="notif-icon">{notifIcon(n.type)}</span>
                    <span class="notif-text">{notifText(n)}</span>
                    <span class="notif-time">{relativeTime(n.createdAt)}</span>
                </a>
            {/each}
        </div>
    </section>
    {/if}

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<PinModal bind:open={pinModalOpen} creatures={data.creatures} mode={pinModalMode} existingProjects={data.breedingProjects.map(p => ({ creatureId: p.creatureId, focusStat: p.focusStat }))} onSave={savePin} />

<style>
:global(:root) {
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
}

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; }
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

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1180px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   IDENTITY BANNER
   ═════════════════════════════════════════════════════════════════════════ */
.identity-banner {
    position: relative;
    margin-bottom: 56px;
}
.banner-image {
    height: 160px;
    background:
        linear-gradient(135deg, rgba(0,180,255,0.18) 0%, rgba(139,92,246,0.16) 50%, rgba(0,180,255,0.10) 100%),
        radial-gradient(circle 200px at 20% 50%, rgba(0,180,255,0.20), transparent 70%),
        radial-gradient(circle 240px at 80% 60%, rgba(139,92,246,0.20), transparent 70%),
        #0a1228;
    clip-path: polygon(16px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 16px);
    position: relative;
    overflow: hidden;
}
.banner-image::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 24px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 24px);
    opacity: 0.6;
}
.banner-image::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 0%, transparent 50%, rgba(5,8,18,0.85) 100%);
}

/* Identity card overlays the bottom of the banner */
.identity-card {
    position: relative;
    margin: -68px 24px 0;
    background: linear-gradient(160deg, rgba(10,18,44,0.96) 0%, rgba(4,8,20,0.99) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 22px 28px;
    display: flex;
    align-items: flex-start;
    gap: 22px;
    z-index: 2;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.30)) drop-shadow(0 18px 50px rgba(0,0,0,0.55));
}
.identity-card::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}

/* Avatar — hex shape with initial */
.avatar {
    flex-shrink: 0;
    width: 88px;
    height: 100px;
    position: relative;
    margin-top: -8px;
}
.avatar svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 12px var(--tek-blue-glow)); }
.avatar-pip {
    position: absolute;
    bottom: 8px; right: 4px;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: var(--tek-green);
    border: 3px solid #050812;
    box-shadow: 0 0 6px rgba(16,185,129,0.6);
}

/* Identity info */
.identity-info { flex: 1; min-width: 0; }
.callsign {
    font-family: var(--tek-display);
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
    margin-bottom: 8px;
    text-transform: uppercase;
}
.identity-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    margin-bottom: 10px;
}
.identity-meta .tribe { color: var(--tek-amber); font-weight: 600; }
.identity-meta .sep { color: var(--tek-text-faint); }
.identity-meta .discord { color: #8ea1f5; }

.identity-bio {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.98rem;
    line-height: 1.5;
    color: #94a3b8;
    max-width: 540px;
    padding-left: 10px;
    border-left: 1px solid rgba(0,180,255,0.20);
    margin-top: 6px;
}

/* Identity actions */
.identity-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
}
.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 8px 16px;
    border: none;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: filter 0.18s, transform 0.18s;
    text-decoration: none;
}
.btn-primary {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
}
.btn-primary:hover { filter: drop-shadow(0 0 14px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.btn-ghost {
    background: rgba(0,180,255,0.06);
    color: #7dd3fc;
    border: 1px solid rgba(0,180,255,0.20);
}
.btn-ghost:hover { background: rgba(0,180,255,0.14); border-color: rgba(0,180,255,0.45); }

/* ═════════════════════════════════════════════════════════════════════════
   SECTION SCAFFOLD
   ═════════════════════════════════════════════════════════════════════════ */
.section { margin-bottom: 48px; }
.section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 22px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
}
.section-header .pip {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.section-header .rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, rgba(0,180,255,0.18), transparent);
}
.section-header .action {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-decoration: none;
    transition: color 0.18s;
    /* Reset native <button> defaults so anchor + button forms render identically */
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
}
.section-header .action:hover { color: var(--tek-blue); }
.section-header .action .arrow { color: var(--tek-blue); margin-left: 4px; }

/* ═════════════════════════════════════════════════════════════════════════
   BADGE WALL — CENTERPIECE (organized by category, earned-only)
   ═════════════════════════════════════════════════════════════════════════ */
.badge-categories {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.badge-cat {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.88) 0%, rgba(4,8,20,0.96) 100%);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 16px 22px 18px 24px;
}
.badge-cat::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 7px var(--tek-blue-glow);
}
.badge-cat-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
}
.badge-cat-icon {
    width: 26px; height: 26px;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 5px var(--tek-blue-glow));
    flex-shrink: 0;
}
.badge-cat-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.badge-cat-count {
    margin-left: auto;
    font-family: var(--tek-mono);
    font-size: 0.64rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.badge-cat-chips {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.badge-chip {
    --tier-rgb: 255,215,0;
    display: flex;
    align-items: center;
    gap: 9px;
    background:
        radial-gradient(ellipse at 0% 50%, rgba(var(--tier-rgb), 0.18) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    border-left: 2px solid rgb(var(--tier-rgb));
    padding: 9px 14px 9px 11px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    cursor: pointer;
    transition: transform 0.18s ease, filter 0.18s ease;
    filter: drop-shadow(0 0 1px rgba(var(--tier-rgb), 0.30)) drop-shadow(0 4px 14px rgba(0,0,0,0.45));
    /* Anchor form (chips now link to the creature that earned the badge) */
    text-decoration: none;
    color: inherit;
}
.badge-chip:hover {
    transform: translateY(-1px);
    filter: drop-shadow(0 0 2px rgba(var(--tier-rgb), 0.85)) drop-shadow(0 6px 20px rgba(0,0,0,0.55));
}
.badge-chip.bronze   { --tier-rgb: 205,127,50; }
.badge-chip.silver   { --tier-rgb: 200,200,210; }
.badge-chip.gold     { --tier-rgb: 255,215,0; }
.badge-chip.diamond  { --tier-rgb: 0,180,255; }
.badge-chip.gamma    { --tier-rgb: 16,185,129; }
.badge-chip.beta     { --tier-rgb: 0,180,255; }
.badge-chip.alpha    { --tier-rgb: 244,114,182; }
.badge-chip.titan    { --tier-rgb: 0,180,255; }

.badge-chip-icon {
    width: 22px; height: 22px;
    color: rgb(var(--tier-rgb));
    filter: drop-shadow(0 0 5px rgba(var(--tier-rgb), 0.6));
    flex-shrink: 0;
}
.badge-chip-body { line-height: 1.25; min-width: 0; }
.badge-chip-tier {
    font-family: var(--tek-display);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: rgb(var(--tier-rgb));
    text-transform: uppercase;
    text-shadow: 0 0 6px rgba(var(--tier-rgb), 0.5);
    margin-bottom: 2px;
}
.badge-chip-species {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--tek-text);
    letter-spacing: 0.04em;
    white-space: nowrap;
}

/* ── Old badge-trophy styles kept below for backwards refs (unused now) ─ */
.badge-wall {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
}
@media (max-width: 720px) { .badge-wall { grid-template-columns: 1fr; } }

.badge-trophy {
    --tier-rgb: 255,215,0;
    position: relative;
    aspect-ratio: 1 / 0.95;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(ellipse 70% 60% at 50% 35%, rgba(var(--tier-rgb), 0.18) 0%, transparent 65%),
        linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
    padding: 28px 18px 22px;
    cursor: pointer;
    overflow: hidden;
    transition: filter 0.25s ease, transform 0.22s ease;
    filter:
        drop-shadow(0 0 1px rgba(var(--tier-rgb), 0.40))
        drop-shadow(0 0 30px rgba(var(--tier-rgb), 0.08))
        drop-shadow(0 14px 40px rgba(0,0,0,0.55));
}
.badge-trophy:hover {
    transform: translateY(-3px);
    filter:
        drop-shadow(0 0 2px rgba(var(--tier-rgb), 0.95))
        drop-shadow(0 0 50px rgba(var(--tier-rgb), 0.30))
        drop-shadow(0 20px 50px rgba(0,0,0,0.70));
}
.badge-trophy.bronze   { --tier-rgb: 205,127,50; }
.badge-trophy.silver   { --tier-rgb: 200,200,210; }
.badge-trophy.gold     { --tier-rgb: 255,215,0; }
.badge-trophy.diamond  { --tier-rgb: 0,180,255; }
.badge-trophy.locked   { --tier-rgb: 50,60,80; opacity: 0.55; }

/* Decorative scan pattern inside the badge */
.badge-trophy::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(180deg, transparent 0 3px, rgba(var(--tier-rgb), 0.03) 3px 4px);
    pointer-events: none;
}
.badge-icon {
    width: 64px; height: 64px;
    display: flex; align-items: center; justify-content: center;
    color: rgb(var(--tier-rgb));
    filter: drop-shadow(0 0 14px rgba(var(--tier-rgb), 0.6));
    margin-bottom: 14px;
    animation: badge-pulse 3.5s ease-in-out infinite;
}
@keyframes badge-pulse {
    0%, 100% { filter: drop-shadow(0 0 14px rgba(var(--tier-rgb), 0.6)); }
    50%      { filter: drop-shadow(0 0 26px rgba(var(--tier-rgb), 0.95)); }
}
.badge-tier {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    font-weight: 800;
    letter-spacing: 0.24em;
    color: rgb(var(--tier-rgb));
    text-shadow: 0 0 10px rgba(var(--tier-rgb), 0.55);
    margin-bottom: 5px;
    text-transform: uppercase;
}
.badge-name {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-align: center;
    text-transform: uppercase;
    line-height: 1.3;
}

/* Tier-progression pips at bottom */
.badge-progress {
    margin-top: 12px;
    display: flex;
    gap: 5px;
    align-items: center;
}
.badge-progress-pip {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.10);
}
.badge-progress-pip.earned-bronze   { background: #cd7f32; box-shadow: 0 0 4px rgba(205,127,50,0.5); border-color: #cd7f32; }
.badge-progress-pip.earned-silver   { background: #c8c8d2; box-shadow: 0 0 4px rgba(200,200,210,0.5); border-color: #c8c8d2; }
.badge-progress-pip.earned-gold     { background: #ffd700; box-shadow: 0 0 5px rgba(255,215,0,0.6);  border-color: #ffd700; }
.badge-progress-pip.earned-diamond  { background: #00b4ff; box-shadow: 0 0 6px rgba(0,180,255,0.7);  border-color: #00b4ff; }

/* ═════════════════════════════════════════════════════════════════════════
   PINNED BLOODLINES
   ═════════════════════════════════════════════════════════════════════════ */
.pinned-empty {
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(14px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 36px 22px 30px;
    text-align: center;
    position: relative;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.25)) drop-shadow(0 8px 22px rgba(0,0,0,0.42));
}
.pinned-empty::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
.pinned-empty-icon {
    font-size: 2.4rem;
    color: var(--tek-blue);
    opacity: 0.4;
    margin-bottom: 6px;
    filter: drop-shadow(0 0 12px var(--tek-blue-glow));
}
.pinned-empty-title {
    font-family: var(--tek-display);
    font-size: 1rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 6px;
}
.pinned-empty-flavor {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.92rem;
    color: var(--tek-text-dim);
    max-width: 440px;
    margin: 0 auto 18px;
    line-height: 1.5;
}
.pinned-empty-cta {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    border: none;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 11px 22px;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.45));
    transition: filter 0.2s, transform 0.2s;
}
.pinned-empty-cta:hover { filter: drop-shadow(0 0 18px rgba(0,180,255,0.85)); transform: translateY(-1px); }

.pinned-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
}
@media (max-width: 860px) { .pinned-row { grid-template-columns: 1fr; } }
.pinned-row.hidden, .pinned-list.hidden { display: none; }

/* View toggle in section header — small icon buttons next to "+ Pin Project" */
.pinned-view-toggle {
    display: inline-flex;
    gap: 2px;
    margin-right: 10px;
}
.pv-btn {
    width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-faint);
    cursor: pointer;
    padding: 0;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
}
.pv-btn:hover {
    border-color: rgba(0,180,255,0.30);
    color: var(--tek-text);
}
.pv-btn.active {
    background: rgba(0,180,255,0.10);
    border-color: var(--tek-blue);
    color: var(--tek-blue);
    box-shadow: 0 0 8px rgba(0,180,255,0.30);
}

/* List view — compressed single row per project */
.pinned-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.pin-list-row {
    display: grid;
    grid-template-columns: 24px 1fr auto auto 24px;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    cursor: pointer;
    transition: border-color 0.15s, transform 0.15s;
    text-decoration: none;
    color: inherit;
}
.pin-list-row:hover {
    border-color: rgba(0,180,255,0.40);
    transform: translateY(-1px);
}
.pin-list-gender {
    font-size: 1rem;
    text-align: center;
}
.pin-list-id {
    min-width: 0;
}
.pin-list-species {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--tek-text);
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.pin-list-nick {
    font-family: var(--tek-serif, 'Crimson Pro', Georgia, serif);
    font-style: italic;
    font-size: 0.84rem;
    color: var(--tek-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.pin-list-focus {
    display: flex;
    align-items: center;
}
.pin-list-focus-label {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    color: var(--tek-blue);
    text-transform: uppercase;
    padding: 4px 10px;
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.pin-list-counter {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.pin-list-counter-num {
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--tek-text);
    min-width: 48px;
    text-align: center;
}
@media (max-width: 640px) {
    .pin-list-row {
        grid-template-columns: 22px 1fr auto;
        grid-template-areas:
            "g i u"
            "f f f"
            "c c c";
        row-gap: 6px;
    }
    .pin-list-gender { grid-area: g; }
    .pin-list-id { grid-area: i; }
    .pin-list-focus { grid-area: f; justify-content: flex-start; }
    .pin-list-counter { grid-area: c; justify-content: space-between; }
    .pin-list-row .pin-unpin { grid-area: u; }
}

.pin-card {
    --cat-rgb: 239,68,68;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 18px 20px 18px 22px;
    overflow: hidden;
    cursor: pointer;
    transition: filter 0.25s ease, transform 0.22s ease;
    filter:
        drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.35))
        drop-shadow(0 0 24px rgba(var(--cat-rgb), 0.08))
        drop-shadow(0 12px 36px rgba(0,0,0,0.50));
}
.pin-card:hover {
    transform: translateY(-2px);
    filter:
        drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.75))
        drop-shadow(0 0 36px rgba(var(--cat-rgb), 0.22))
        drop-shadow(0 18px 48px rgba(0,0,0,0.62));
}
.pin-card::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 7px rgba(var(--cat-rgb), 0.7);
}
.pin-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(180deg, transparent 0 3px, rgba(0,180,255,0.018) 3px 4px);
    pointer-events: none;
}
.pin-card.combat   { --cat-rgb: 239,68,68;  }
.pin-card.flyer    { --cat-rgb: 6,182,212;  }
.pin-card.utility  { --cat-rgb: 34,197,94;  }
.pin-card.water    { --cat-rgb: 59,130,246; }
.pin-card.mount    { --cat-rgb: 249,115,22; }
.pin-card.resource { --cat-rgb: 167,139,250;}

.pin-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    position: relative;
    z-index: 2;
}
.pin-tier {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: linear-gradient(135deg, rgba(0,180,255,0.18) 0%, rgba(139,92,246,0.20) 100%);
    border: 1px solid rgba(0,180,255,0.48);
    color: #7dd3fc;
    font-family: var(--tek-display);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 9px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    text-shadow: 0 0 8px rgba(0,180,255,0.6);
}
.pin-icon {
    width: 16px; height: 16px;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 4px var(--tek-blue-glow));
}
.pin-unpin {
    background: transparent;
    border: 1px solid rgba(239,68,68,0.20);
    color: rgba(239,68,68,0.65);
    font-family: var(--tek-mono);
    font-size: 0.85rem;
    line-height: 1;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
    transition: all 0.15s;
}
.pin-unpin:hover {
    background: rgba(239,68,68,0.12);
    border-color: rgba(239,68,68,0.45);
    color: #ef4444;
}

.pin-species {
    font-family: var(--tek-display);
    font-size: clamp(1.1rem, 3.4vw, 1.55rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.4) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.35));
    margin-bottom: 4px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    position: relative;
    z-index: 2;
}
.pin-nick {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-bottom: 8px;
    position: relative;
    z-index: 2;
}
.pin-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-bottom: 14px;
    position: relative;
    z-index: 2;
}
.pin-meta .gender.female { color: var(--tek-pink); }
.pin-meta .gender.male   { color: #60a5fa; }
.pin-meta .cat { color: rgb(var(--cat-rgb)); font-weight: 700; }

/* ── Breeding project — focus stat + mutation counter ─────────────────── */
.project-focus {
    text-align: center;
    padding: 14px 0 6px;
    position: relative;
    z-index: 2;
}
.project-focus-label {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.32em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 6px;
}
.project-focus-stat {
    font-family: var(--tek-display);
    font-size: 1.55rem;
    font-weight: 900;
    letter-spacing: 0.20em;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.35));
    text-transform: uppercase;
}
.project-counter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 14px 0 14px;
    border-top: 1px solid rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin: 8px 0 12px;
    position: relative;
    z-index: 2;
}
.project-btn {
    width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.30);
    color: var(--tek-blue);
    cursor: pointer;
    font-family: var(--tek-display);
    font-size: 1.1rem;
    font-weight: 800;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
    line-height: 1;
}
.project-btn:hover {
    background: rgba(0,180,255,0.22);
    border-color: var(--tek-blue);
    filter: drop-shadow(0 0 8px var(--tek-blue-glow));
    transform: translateY(-1px);
}
.project-btn.minus {
    background: rgba(255,255,255,0.02);
    border-color: rgba(255,255,255,0.10);
    color: var(--tek-text-faint);
}
.project-btn.minus:hover { color: var(--tek-text-dim); border-color: rgba(255,255,255,0.20); }

.project-counter-center { text-align: center; }
.project-counter-num {
    font-family: var(--tek-display);
    font-size: 2.4rem;
    font-weight: 900;
    line-height: 1;
    color: var(--tek-text);
    text-shadow: 0 0 14px rgba(0,180,255,0.35);
    min-width: 70px;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), text-shadow 0.5s ease;
}
.project-counter-lbl {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-top: 4px;
}

.project-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    position: relative;
    z-index: 2;
}
.project-meta-row { display: flex; gap: 8px; align-items: baseline; }
.project-meta .key {
    color: var(--tek-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.55rem;
    flex-shrink: 0;
    min-width: 64px;
}
.project-meta .val { color: var(--tek-text-dim); }
.project-meta .female { color: var(--tek-pink); }
.project-meta .male { color: #60a5fa; }

/* "+ New project" placeholder card */
.project-card-new {
    --cat-rgb: 0,180,255;
    background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
    border: 1.5px dashed rgba(0,180,255,0.30);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    min-height: 280px;
}
.project-card-new:hover {
    background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(4,8,20,0.55) 100%);
    border-color: rgba(0,180,255,0.60);
}
.project-card-new-glyph {
    font-family: var(--tek-display);
    font-size: 2.4rem;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 10px var(--tek-blue-glow));
    line-height: 1;
}
.project-card-new-label {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    text-align: center;
}
/* ═════════════════════════════════════════════════════════════════════════
   STATS DASHBOARD
   ═════════════════════════════════════════════════════════════════════════ */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
}
@media (max-width: 780px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }

.stat-cell {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 18px 16px 14px 20px;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
    /* Anchor form: kill default link decoration so the cell looks identical */
    color: inherit;
    text-decoration: none;
    display: block;
}
.stat-cell:hover { transform: translateY(-2px); }
a.stat-cell { cursor: pointer; }
a.stat-cell:hover { box-shadow: 0 6px 18px rgba(0,180,255,0.10); }
.stat-cell::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.stat-cell-val {
    font-family: var(--tek-display);
    font-size: 1.8rem;
    font-weight: 900;
    line-height: 1;
    color: var(--tek-text);
    margin-bottom: 4px;
}
.stat-cell-val.gradient {
    background: linear-gradient(135deg, #00d4ff, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
}
.stat-cell-lbl {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
/* Inline embellishments inside stat values */
.stat-cell-val .star {
    font-size: 1rem;
    color: #fbbf24;
    margin-left: 4px;
    filter: drop-shadow(0 0 6px rgba(251,191,36,0.6));
    vertical-align: middle;
}
.stat-cell-val .live-pip {
    display: inline-block;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 7px rgba(16,185,129,0.7);
    margin-left: 8px;
    vertical-align: middle;
    animation: stat-pip-pulse 1.8s ease-in-out infinite;
}
@keyframes stat-pip-pulse {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 1; }
}
.stat-cell-val.unread {
    color: var(--tek-blue);
    text-shadow: 0 0 12px rgba(0,180,255,0.50);
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTIVITY FEED
   ═════════════════════════════════════════════════════════════════════════ */
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
    transition: background 0.2s;
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
.activity-dot.gold    { background: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.7); }
.activity-dot.diamond { background: #00b4ff; box-shadow: 0 0 7px var(--tek-blue-glow); }
.activity-dot.tribe   { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.7); }
.activity-dot.species { background: #c084fc; box-shadow: 0 0 6px rgba(192,132,252,0.7); }
.activity-dot.boss    { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.7); }

.activity-text {
    font-size: 0.88rem;
    color: var(--tek-text);
    line-height: 1.45;
}
.activity-text strong {
    color: var(--tek-blue);
    font-weight: 700;
}
.activity-time {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    white-space: nowrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   Footer note
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
    .identity-card { flex-direction: column; gap: 14px; padding: 18px 22px; }
    .identity-actions { flex-direction: row; align-self: stretch; justify-content: flex-end; }
    .stage { padding: 60px 14px 80px; }
}

/* ═════════════════════════════════════════════════════════════════════════
   TRIBE SNAPSHOT
   ═════════════════════════════════════════════════════════════════════════ */
.tribe-snapshot {
    display: grid;
    grid-template-columns: 56px 1fr auto;
    gap: 16px;
    align-items: center;
    background: linear-gradient(160deg, rgba(139,92,246,0.10) 0%, rgba(4,8,20,0.94) 100%);
    border: 1px solid rgba(139,92,246,0.25);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 14px 22px;
    text-decoration: none;
    color: inherit;
    transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
    position: relative;
}
.tribe-snapshot::before {
    content: ''; position: absolute; left: 0; top: 12px; bottom: 0;
    width: 2px; background: var(--tek-purple); box-shadow: 0 0 6px rgba(139,92,246,0.5);
}
.tribe-snapshot:hover { transform: translateY(-2px); border-color: rgba(139,92,246,0.45); box-shadow: 0 6px 18px rgba(139,92,246,0.10); }
.tribe-sigil {
    width: 56px; height: 56px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, rgba(139,92,246,0.20), rgba(0,180,255,0.10));
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    flex-shrink: 0;
}
.tribe-sigil img { width: 100%; height: 100%; object-fit: cover; }
.tribe-sigil-fallback { font-family: var(--tek-display); font-size: 1.5rem; color: var(--tek-purple); filter: drop-shadow(0 0 6px rgba(139,92,246,0.45)); }
.tribe-info { min-width: 0; line-height: 1.3; }
.tribe-name {
    font-family: var(--tek-display); font-size: 1.05rem; font-weight: 800;
    letter-spacing: 0.04em; color: var(--tek-text); text-transform: uppercase;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tribe-meta {
    font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.10em;
    color: var(--tek-text-dim); text-transform: uppercase; margin-top: 4px;
}
.tribe-meta .role { color: var(--tek-purple); font-weight: 700; }
.tribe-meta .sep { color: var(--tek-text-faint); margin: 0 6px; }
.tribe-meta .map { color: var(--tek-amber); }
.tribe-arrow { color: var(--tek-purple); font-family: var(--tek-display); font-size: 1.1rem; }

/* ═════════════════════════════════════════════════════════════════════════
   ACTIVE TRADES
   ═════════════════════════════════════════════════════════════════════════ */
.trades-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 860px) { .trades-grid { grid-template-columns: 1fr; } }
.trades-block {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(245,158,11,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 16px 12px 18px;
    position: relative;
}
.trades-block::before {
    content: ''; position: absolute; left: 0; top: 10px; bottom: 0;
    width: 2px; background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.5);
}
.trades-block:nth-child(2)::before { background: var(--tek-blue); box-shadow: 0 0 5px var(--tek-blue-glow); }
.trades-block:nth-child(2) { border-color: rgba(0,180,255,0.18); }
.trades-block-label {
    font-family: var(--tek-mono); font-size: 0.62rem; letter-spacing: 0.18em;
    color: var(--tek-text-dim); text-transform: uppercase; margin-bottom: 10px;
}
.trades-block-count {
    background: rgba(245,158,11,0.18); color: var(--tek-amber); padding: 1px 7px;
    border-radius: 99px; font-size: 0.58rem; margin-left: 4px;
}
.trades-block:nth-child(2) .trades-block-count { background: rgba(0,180,255,0.18); color: var(--tek-blue); }
.trade-row {
    display: grid; grid-template-columns: 22px 1fr auto;
    gap: 10px; align-items: center;
    padding: 8px 10px;
    background: rgba(0,0,0,0.20);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
    text-decoration: none; color: inherit;
    transition: background 0.18s;
    margin-bottom: 6px;
}
.trade-row:last-child { margin-bottom: 0; }
.trade-row:hover { background: rgba(0,180,255,0.06); }
.trade-row.pending:hover { background: rgba(245,158,11,0.06); }
.trade-icon { font-family: var(--tek-display); font-size: 0.95rem; color: var(--tek-amber); text-align: center; }
.trade-row:not(.pending) .trade-icon { color: var(--tek-blue); }
.trade-info { min-width: 0; line-height: 1.35; }
.trade-title { font-size: 0.82rem; color: var(--tek-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trade-dim { color: var(--tek-text-dim); }
.trade-preview { font-family: var(--tek-mono); font-size: 0.66rem; color: var(--tek-text-dim); font-style: italic; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.trade-time { font-family: var(--tek-mono); font-size: 0.62rem; letter-spacing: 0.08em; color: var(--tek-text-faint); white-space: nowrap; }

/* ═════════════════════════════════════════════════════════════════════════
   RECENT ACTIVITY
   ═════════════════════════════════════════════════════════════════════════ */
.recent-feed {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 22px;
    position: relative;
}
.recent-feed::before {
    content: ''; position: absolute; left: 0; top: 10px; bottom: 0;
    width: 2px; background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.recent-row {
    display: grid; grid-template-columns: 22px 1fr auto;
    gap: 12px; align-items: center;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    text-decoration: none; color: inherit;
    transition: background 0.18s; cursor: pointer;
}
.recent-row:hover { background: rgba(0,180,255,0.04); margin: 0 -22px; padding: 7px 22px; }
.recent-row:last-child { border-bottom: none; }
.recent-icon { font-size: 0.95rem; text-align: center; line-height: 1; }
.recent-text { font-family: var(--tek-mono); font-size: 0.74rem; color: var(--tek-text); letter-spacing: 0.04em; }
.recent-time { font-family: var(--tek-mono); font-size: 0.62rem; letter-spacing: 0.08em; color: var(--tek-text-faint); white-space: nowrap; }

/* ═════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS PREVIEW
   ═════════════════════════════════════════════════════════════════════════ */
.section-header .pip.amber { background: var(--tek-amber); box-shadow: 0 0 8px rgba(245,158,11,0.7); }
.notif-count {
    font-family: var(--tek-mono); font-size: 0.6rem;
    background: rgba(245,158,11,0.18); color: var(--tek-amber);
    padding: 2px 8px; border-radius: 99px; letter-spacing: 0.10em;
    margin-left: 8px;
}
.notif-preview {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 10px 22px;
    position: relative;
}
.notif-preview::before {
    content: ''; position: absolute; left: 0; top: 10px; bottom: 0;
    width: 2px; background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.5);
}
.notif-row {
    display: grid; grid-template-columns: 22px 1fr auto;
    gap: 12px; align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    text-decoration: none; color: inherit;
    transition: background 0.18s;
}
.notif-row:last-child { border-bottom: none; }
.notif-row:hover { background: rgba(0,180,255,0.04); }
.notif-row.unread .notif-text { color: var(--tek-text); font-weight: 500; }
.notif-icon { font-size: 0.95rem; color: var(--tek-text-dim); text-align: center; }
.notif-row.unread .notif-icon { color: var(--tek-amber); }
.notif-text { font-family: var(--tek-mono); font-size: 0.72rem; color: var(--tek-text-dim); letter-spacing: 0.04em; }
.notif-time { font-family: var(--tek-mono); font-size: 0.6rem; letter-spacing: 0.08em; color: var(--tek-text-faint); white-space: nowrap; }
</style>
