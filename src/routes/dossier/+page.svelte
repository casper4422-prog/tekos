<script lang="ts">
    import { onMount } from 'svelte';
    import { computeBadges } from '$lib/badges';
    import PinModal from '$lib/components/PinModal.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let pinModalOpen = $state(false);
    let pinModalMode = $state<'project' | 'featured'>('project');

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

    // Map each pinned creature to its breeding project info (focus stat + target).
    // Project info comes from data.pinnedProjects (server-side joined from
    // user.pinnedCreatures); new pins always have focusStat, legacy pins may not.
    type Pinned = (typeof data.creatures)[number] & {
        focusStat: 'HP'|'STA'|'OXY'|'FOOD'|'WGT'|'MEL'|'CRA'|'SPD'|null;
        targetMutations: number;
    };
    const pinned = $derived<Pinned[]>(
        data.pinnedIds
            .map(id => {
                const creature = data.creatures.find(c => c.id === id);
                if (!creature) return null;
                const project = (data.pinnedProjects ?? []).find(p => p.creatureId === id);
                return {
                    ...creature,
                    focusStat: (project?.focusStat ?? null) as Pinned['focusStat'],
                    targetMutations: project?.targetMutations ?? 0
                };
            })
            .filter((x): x is Pinned => !!x)
            .slice(0, 3)
    );

    // Short stat key ↔ full key as stored on creature.baseStats/mutations
    const STAT_LONG = {
        HP: 'Health', STA: 'Stamina', OXY: 'Oxygen',
        FOOD: 'Food', WGT: 'Weight', MEL: 'Melee', CRA: 'Crafting', SPD: 'Speed'
    } as const;

    function getStatValue(stats: Record<string, number> | undefined, key: Pinned['focusStat']): number {
        if (!stats || !key) return 0;
        const long = STAT_LONG[key];
        return Number(stats[key] ?? stats[key.toLowerCase()] ?? stats[long] ?? stats[long.toLowerCase()] ?? 0);
    }

    // Mutations counter state, keyed by creature id — tracks ONLY the focus stat's
    // mutation count. Effect must not read mutationCounts inside the same write
    // (Svelte 5 effect_update_depth_exceeded). Initialize from creature's stored
    // focus-stat mutations on each pinned-change; manual bumps persist client-side
    // until next reload.
    let mutationCounts = $state<Record<number, number>>({});

    $effect(() => {
        const next: Record<number, number> = {};
        for (const c of pinned) {
            next[c.id] = getStatValue(c.mutations, c.focusStat);
        }
        mutationCounts = next;
    });

    function bump(id: number, delta: number) {
        const cur = mutationCounts[id] ?? 0;
        mutationCounts[id] = Math.max(0, cur + delta);
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
            : 'RUNNER';
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

    onMount(() => {
        const canvas = document.getElementById('tekHexCanvas') as HTMLCanvasElement | null;
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
        function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize(); draw();

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
        };
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Dossier · {displayName}</title>
</svelte:head>

<canvas id="tekHexCanvas"></canvas>

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
                <button class="btn btn-ghost">⬡ Share</button>
            </div>
        </div>
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
                            <div class="badge-chip {b.tier}">
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{b.tier}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- UNDERDOG / ROLES -->
            {#if data.badgeWall.roles.length}
                <div class="badge-cat">
                    <div class="badge-cat-header">
                        <svg class="badge-cat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="M9 12l2 2 4-4"/>
                        </svg>
                        <span class="badge-cat-name">Underdog</span>
                        <span class="badge-cat-count">{data.badgeWall.roles.length} earned</span>
                    </div>
                    <div class="badge-cat-chips">
                        {#each data.badgeWall.roles as b}
                            <div class="badge-chip silver">
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{roleTierLabel(b.role)}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </div>
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
                            <div class="badge-chip {b.tier}">
                                <svg class="badge-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/><path d="m3.5 14.5.5.5"/><path d="m20 9 .5.5"/><path d="m6.5 12.5 1 1"/><path d="m16.5 10.5 1 1"/><path d="m10 16 1.5 1.5"/></svg>
                                <div class="badge-chip-body">
                                    <div class="badge-chip-tier">{b.tier}</div>
                                    <div class="badge-chip-species">{b.species}</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

        </div>
    </section>

    <!-- ═══════════ ACTIVE BREEDING PROJECTS ═══════════ -->
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Active Breeding Projects
            <span class="rule"></span>
            <button type="button" class="action" onclick={() => { pinModalMode = 'project'; pinModalOpen = true; }}>+ Pin Project <span class="arrow">▸</span></button>
        </div>
        {#if pinned.length === 0}
            <div class="pinned-empty">
                <div class="pinned-empty-icon">⬡</div>
                <div class="pinned-empty-title">No pinned projects yet</div>
                <div class="pinned-empty-flavor">"Pin a specimen here to track your active breeding focus — mutation counter, target stat, and quick access from your dossier."</div>
                <button type="button" class="pinned-empty-cta" onclick={() => { pinModalMode = 'project'; pinModalOpen = true; }}>+ Pin Your First Project</button>
            </div>
        {:else}
            <div class="pinned-row">
                {#each pinned as c}
                    {@const cat = categoryForSpecies(c.species)}
                    {@const badges = computeBadges(c.baseStats, c.mutations)}
                    {@const tierLabel = badges.bossReady ? `Boss · ${badges.bossReady}` : badges.bloodline ? `${badges.bloodline.charAt(0).toUpperCase() + badges.bloodline.slice(1)} Bloodline` : 'Standard'}
                    {@const focusBase = c.focusStat ? getStatValue(c.baseStats, c.focusStat) : 0}
                    {@const focusLabel = c.focusStat ?? '—'}
                    {@const currentMut = mutationCounts[c.id] ?? 0}
                    {@const targetMut = c.targetMutations ?? 0}
                    <div class="pin-card {cat}">
                        <div class="pin-top">
                            <span class="pin-tier">⬢ {tierLabel}</span>
                            <svg class="pin-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                        </div>
                        <div class="pin-species">{c.species}</div>
                        <div class="pin-nick">"{c.name}"</div>
                        <div class="pin-meta">
                            <span class="gender {c.gender?.toLowerCase() === 'female' ? 'female' : 'male'}">{c.gender?.toLowerCase() === 'female' ? '♀' : '♂'}</span>
                            <span>·</span>
                            <span class="cat">{categoryLabel(cat)}</span>
                        </div>
                        <div class="project-focus">
                            <div class="project-focus-label">{focusLabel === '—' ? 'No Focus' : focusLabel} Base</div>
                            <div class="project-focus-stat">{focusBase}</div>
                        </div>
                        <div class="project-counter">
                            <button class="project-btn minus" title="Decrement {focusLabel} mutations" onclick={() => bump(c.id, -1)} disabled={!c.focusStat}>−</button>
                            <div class="project-counter-center">
                                <div class="project-counter-num">{currentMut}{targetMut > 0 ? ` / ${targetMut}` : ''}</div>
                                <div class="project-counter-lbl">{focusLabel === '—' ? 'Mutations' : `${focusLabel} Mutations`}</div>
                            </div>
                            <button class="project-btn plus" title="Increment {focusLabel} mutations — new baby with +1" onclick={() => bump(c.id, 1)} disabled={!c.focusStat}>+</button>
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
        {/if}
    </section>

    <!-- ═══════════ STATS DASHBOARD ═══════════ -->
    <section class="section">
        <div class="section-header">
            <span class="pip"></span>
            Statistics
            <span class="rule"></span>
        </div>
        <div class="stats-grid">
            <div class="stat-cell">
                <div class="stat-cell-val gradient">{data.stats.specimens}</div>
                <div class="stat-cell-lbl">Specimens</div>
            </div>
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
            <div class="stat-cell">
                <div class="stat-cell-val gradient">{data.stats.badges}</div>
                <div class="stat-cell-lbl">Badges</div>
            </div>
            <div class="stat-cell">
                <div class="stat-cell-val">{data.stats.friends}<span class="live-pip"></span></div>
                <div class="stat-cell-lbl">Friends</div>
            </div>
            <div class="stat-cell">
                <div class="stat-cell-val unread">{data.recentBoss.length}</div>
                <div class="stat-cell-lbl">Boss Runs</div>
            </div>
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

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<PinModal bind:open={pinModalOpen} creatures={data.creatures} mode={pinModalMode} pinned={data.pinnedIds} onSave={savePin} />

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
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

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
/* Corner brackets per badge */
.badge-trophy .bracket {
    position: absolute;
    width: 14px; height: 14px;
    border: 1.2px solid rgba(var(--tier-rgb), 0.55);
    filter: drop-shadow(0 0 3px rgba(var(--tier-rgb), 0.5));
}
.badge-trophy .bracket.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
.badge-trophy .bracket.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
.badge-trophy .bracket.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
.badge-trophy .bracket.br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

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
.badge-trophy.locked .badge-icon { animation: none; opacity: 0.4; }

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
.project-card-new:hover .project-card-new-label { color: var(--tek-blue); }

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
    transition: transform 0.18s ease;
}
.stat-cell:hover { transform: translateY(-2px); }
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
.activity-text .species-name {
    color: #c4b5fd;
    font-weight: 600;
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
</style>
