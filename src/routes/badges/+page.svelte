<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type SystemTab = 'boss' | 'underdog' | 'prize';
    let activeTab = $state<SystemTab>('boss');

    let tekHexCanvas = $state<HTMLCanvasElement | null>(null);

    const rankFlavor: Record<string, string> = {
        apprentice:  '"Every bloodline begins with one survivor and one tame."',
        journeyman:  '"Five species can\'t be luck. The pattern recognizes itself."',
        expert:      '"You see the math now. The wild becomes negotiable."',
        master:      '"Your bloodlines hold their shape across generations. The wild forgets what you remember."',
        grandmaster: '"Three Gold lines. The market notices. Other Survivors ask for your seed."',
        legend:      '"A Diamond is rare for a reason. You proved them wrong."',
        myth:        '"What you breed becomes folklore. The Obelisks know your name."'
    };

    function setTab(t: SystemTab) { activeTab = t; }

    onMount(() => {
        const canvas = tekHexCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let w = 0, h = 0;
        let hexes: Array<{ x: number; y: number; size: number; glow: number }> = [];
        let raf = 0;
        function resize() {
            w = canvas!.width = window.innerWidth;
            h = canvas!.height = window.innerHeight;
            hexes = [];
            const size = 36, hSpace = size * 1.5, vSpace = size * Math.sqrt(3);
            for (let y = -size; y < h + size; y += vSpace) {
                for (let x = -size; x < w + size; x += hSpace) {
                    const offsetY = (Math.floor(x / hSpace) % 2) * vSpace / 2;
                    hexes.push({ x, y: y + offsetY, size, glow: Math.random() });
                }
            }
        }
        function draw() {
            ctx!.clearRect(0, 0, w, h);
            const t = Date.now() / 4000;
            hexes.forEach((hex, i) => {
                const phase = (Math.sin(t + i * 0.3) + 1) / 2;
                ctx!.strokeStyle = `rgba(0,180,255,${0.03 + phase * 0.04})`;
                ctx!.lineWidth = 1;
                ctx!.beginPath();
                for (let a = 0; a < 6; a++) {
                    const angle = (Math.PI / 3) * a;
                    const px = hex.x + hex.size * Math.cos(angle);
                    const py = hex.y + hex.size * Math.sin(angle);
                    if (a === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
                }
                ctx!.closePath();
                ctx!.stroke();
            });
            raf = requestAnimationFrame(draw);
        }
        window.addEventListener('resize', resize);
        resize(); draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    });

    // Earned-by helpers
    function earnedSpeciesList(arr: Array<{ species: string }>, max = 3): string {
        if (arr.length === 0) return '';
        const sliced = arr.slice(0, max).map(e => e.species).join(', ');
        return arr.length > max ? `${sliced} +${arr.length - max}` : sliced;
    }

    // Per-tab counts
    const bossEarnedCount = $derived(data.badgeWall.bossReady.length);
    const rolesEarnedCount = $derived(data.badgeWall.roles.length);
    const bloodlineEarnedCount = $derived(data.badgeWall.bloodline.length);

    const bossReadyTiers = [
        { tier: 'gamma', label: 'Gamma Ready', tagShort: 'Gamma · γ', glyph: 'γ', hp: 75,  mel: 75 },
        { tier: 'beta',  label: 'Beta Ready',  tagShort: 'Beta · β',  glyph: 'β', hp: 100, mel: 100 },
        { tier: 'alpha', label: 'Alpha Ready', tagShort: 'Alpha · α', glyph: 'α', hp: 125, mel: 125 },
        { tier: 'titan', label: 'Titan Slayer',tagShort: 'Titan',     glyph: '◆', hp: 150, mel: 150 }
    ] as const;

    const roleDefs: Array<{
        role: 'tank'|'dps'|'bruiser'|'runner';
        label: string;
        reqA: string; reqAv: number;
        reqB?: string; reqBv?: number;
        suffix?: string;
    }> = [
        { role: 'tank',    label: 'Boss Tank',    reqA: 'HP',  reqAv: 175, suffix: '(Health only)' },
        { role: 'dps',     label: 'Boss DPS',     reqA: 'MEL', reqAv: 175, suffix: '(Melee only)' },
        { role: 'bruiser', label: 'Boss Bruiser', reqA: 'HP',  reqAv: 125, reqB: 'WGT', reqBv: 125 },
        { role: 'runner',  label: 'Boss Runner',  reqA: 'HP',  reqAv: 100, reqB: 'SPD', reqBv: 150 }
    ];

    const bloodlineTiers = [
        { tier: 'bronze',  label: 'Bronze Bloodline',  tagShort: 'Bronze',  thresh: 45, bonus: '+25% trade value' },
        { tier: 'silver',  label: 'Silver Bloodline',  tagShort: 'Silver',  thresh: 50, bonus: '+50% trade value' },
        { tier: 'gold',    label: 'Gold Bloodline',    tagShort: 'Gold',    thresh: 55, bonus: '+100% trade value' },
        { tier: 'diamond', label: 'Diamond Bloodline', tagShort: 'Diamond', thresh: 60, bonus: 'Priceless · Auction-only' }
    ] as const;
</script>

<svelte:head>
    <title>⬡ TEKOS — Badges</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={tekHexCanvas}></canvas>

<div class="stage">

    <!-- Header -->
    <div class="page-header">
        <div class="breadcrumb">
            <a href="/dossier">DASHBOARD</a><span class="sep">/</span><a href="/dossier">DOSSIER</a><span class="sep">/</span><span>BADGES</span>
        </div>
        <h1 class="page-title">Badge Archive</h1>
        <div class="page-sub">
            Every honor TekOS recognizes · Three systems · Wired to your Vault
        </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         HERO BAND — Breeder Rank
         ═══════════════════════════════════════════════════════ -->
    <div class="rank-hero">
        <!-- Emblem -->
        <div class="rank-emblem">
            <svg viewBox="0 0 130 148">
                <defs>
                    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#fff8d0"/>
                        <stop offset="50%" stop-color="#ffd700"/>
                        <stop offset="100%" stop-color="#ff9500"/>
                    </linearGradient>
                    <linearGradient id="goldGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="rgba(255,215,0,0.30)"/>
                        <stop offset="100%" stop-color="rgba(255,215,0,0.05)"/>
                    </linearGradient>
                </defs>
                <polygon points="65,4 122,36 122,112 65,144 8,112 8,36" fill="url(#goldGrad2)" stroke="url(#goldGrad)" stroke-width="2"/>
                <polygon points="65,20 108,42 108,106 65,128 22,106 22,42" fill="rgba(10,18,44,0.7)" stroke="rgba(255,215,0,0.4)" stroke-width="1"/>
                <path d="M 40 80 L 50 60 L 60 75 L 65 55 L 70 75 L 80 60 L 90 80 L 88 92 L 42 92 Z" fill="url(#goldGrad)" stroke="#fff8d0" stroke-width="0.8"/>
                <circle cx="50" cy="60" r="2" fill="#ffffff"/>
                <circle cx="65" cy="55" r="2.5" fill="#ffffff"/>
                <circle cx="80" cy="60" r="2" fill="#ffffff"/>
                <line x1="42" y1="100" x2="88" y2="100" stroke="rgba(255,215,0,0.6)" stroke-width="1"/>
                {#if data.rank.current}
                    {@const rankIdx = data.rank.ladder.findIndex(s => s.id === data.rank.current?.id)}
                    <text x="65" y="116" font-family="Orbitron" font-size="11" font-weight="900" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="2">RANK {rankIdx + 1}</text>
                {/if}
            </svg>
            {#if data.rank.current}
                <div class="rank-emblem-label">{data.rank.current.name.toUpperCase()}</div>
            {/if}
        </div>

        <!-- Info -->
        <div class="rank-info">
            <div class="rank-title-row">
                <div class="rank-title">
                    {data.rank.current ? `${data.rank.current.name} Breeder` : 'Unranked Survivor'}
                </div>
                {#if data.rank.current}
                    {@const idx = data.rank.ladder.findIndex(s => s.id === data.rank.current?.id)}
                    <div class="rank-num">RANK {idx + 1} / {data.rank.ladder.length}</div>
                {/if}
            </div>
            <div class="rank-flavor">
                {data.rank.current ? rankFlavor[data.rank.current.id] : '"Your first Bloodline awaits. The wild keeps score."'}
            </div>

            {#if data.rank.next}
                <div class="rank-progress-wrap">
                    <div class="rank-progress-label">
                        <div class="rank-progress-name">PROGRESS TO <span class="next">{data.rank.next.name.toUpperCase()}</span></div>
                        <div class="rank-progress-val">{data.rank.progressLabel}</div>
                    </div>
                    <div class="rank-progress-bar">
                        <div class="rank-progress-fill" style="width: {data.rank.progressPct}%"></div>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Aggregate stats -->
        <div class="rank-stats">
            <div class="rank-stat">
                <div class="rank-stat-val">{data.totals.earned}</div>
                <div class="rank-stat-label">Total Earned</div>
            </div>
            <div class="rank-stat">
                <div class="rank-stat-val diamond">{data.totals.diamond}</div>
                <div class="rank-stat-label">Diamond</div>
            </div>
            <div class="rank-stat">
                <div class="rank-stat-val gold">{data.totals.gold}</div>
                <div class="rank-stat-label">Gold</div>
            </div>
            <div class="rank-stat">
                <div class="rank-stat-val silver">{data.totals.silver}</div>
                <div class="rank-stat-label">Silver</div>
            </div>
        </div>
    </div>

    <!-- Breeder Rank ladder rail -->
    <div class="rank-ladder">
        {#each data.rank.ladder as step}
            <div class="ladder-step" class:passed={step.achieved && step.id !== data.rank.current?.id} class:current={step.id === data.rank.current?.id}>
                <div class="ladder-pip"></div>
                <div class="ladder-name">{step.name}</div>
            </div>
        {/each}
    </div>

    <!-- ═══════════════════════════════════════════════════════
         CLOSE TO EARNING — actionable hook
         ═══════════════════════════════════════════════════════ -->
    {#if data.close.length > 0}
    <div class="section-block">
        <div class="section-block-head">
            <div class="section-block-title-wrap">
                <div class="section-block-title">Close to Earning</div>
                <div class="section-block-count">{data.close.length} NEARBY</div>
            </div>
            <div class="section-block-hint">Within reach</div>
        </div>

        <div class="close-grid">
            {#each data.close as c}
                <a class="close-card" href="/specimens/{c.creatureId}">
                    <div class="close-card-head">
                        <div class="close-badge-icon" style="--badge-glow: rgba(245,158,11,0.5);">
                            <svg viewBox="0 0 38 42">
                                <defs>
                                    <linearGradient id="closeG-{c.creatureId}-{c.tier}" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#f59e0b"/>
                                    </linearGradient>
                                </defs>
                                <polygon points="19,2 35,11 35,31 19,40 3,31 3,11" fill="rgba(10,18,44,0.85)" stroke="url(#closeG-{c.creatureId}-{c.tier})" stroke-width="2"/>
                                <text x="19" y="26" font-family="Orbitron" font-size="11" font-weight="900" fill="url(#closeG-{c.creatureId}-{c.tier})" text-anchor="middle">{c.tier.charAt(0).toUpperCase()}</text>
                            </svg>
                        </div>
                        <div class="close-card-info">
                            <div class="close-badge-name">{c.badge}</div>
                            <div class="close-badge-tier">{c.category} · {c.tier.toUpperCase()}</div>
                        </div>
                    </div>
                    <div class="close-specimen">
                        <div class="close-specimen-label">Closest specimen</div>
                        <div class="close-specimen-name">"{c.creatureName}" <span class="close-specimen-species">· {c.species}</span></div>
                    </div>
                    <div class="close-gap">
                        <span class="close-gap-stat">{c.statKey}</span>
                        <span class="close-gap-val">+{c.gap}</span>
                        <span class="close-gap-of">to threshold</span>
                    </div>
                    <div class="close-progress"><div class="close-progress-fill" style="width: {c.progressPct}%;"></div></div>
                </a>
            {/each}
        </div>
    </div>
    {/if}

    <!-- ═══════════════════════════════════════════════════════
         SYSTEM TABS
         ═══════════════════════════════════════════════════════ -->
    <div class="sys-tabs">
        <button class="sys-tab" class:active={activeTab === 'boss'}     onclick={() => setTab('boss')}>Boss Ready <span class="count">{bossEarnedCount}</span></button>
        <button class="sys-tab" class:active={activeTab === 'underdog'} onclick={() => setTab('underdog')}>Specialist Roles <span class="count">{rolesEarnedCount}</span></button>
        <button class="sys-tab" class:active={activeTab === 'prize'}    onclick={() => setTab('prize')}>Prize Bloodline <span class="count">{bloodlineEarnedCount}</span></button>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         SYSTEM 1: BOSS READY
         ═══════════════════════════════════════════════════════ -->
    <div class="sys-panel" class:active={activeTab === 'boss'} id="sys-boss">

        <!-- Standard Tier Ladder -->
        <div class="subsection">
            <div class="subsection-head">
                <div class="subsection-title">Standard Tier <span class="subsection-desc">— HP ≥ X AND Melee ≥ X (base + mut × 2)</span></div>
                <div class="map-stat"><span class="earned-c">{data.badgeWall.bossReady.length}</span> EARNED</div>
            </div>
            <div class="badge-grid">
                {#each bossReadyTiers as t}
                    {@const earned = data.badgeWall.bossReady.filter(b => b.tier === t.tier)}
                    <div class="badge-card tier-{t.tier}" class:earned={earned.length > 0} class:locked={earned.length === 0}>
                        <div class="badge-card-head">
                            <div class="badge-icon-frame">
                                <svg viewBox="0 0 52 58">
                                    <defs>
                                        <linearGradient id="bossG-{t.tier}" x1="0%" y1="0%" x2="0%" y2="100%">
                                            {#if t.tier === 'gamma'}<stop offset="0%" stop-color="#a0f0a0"/><stop offset="100%" stop-color="#10b981"/>{/if}
                                            {#if t.tier === 'beta'}<stop offset="0%" stop-color="#a5d8ff"/><stop offset="100%" stop-color="#00b4ff"/>{/if}
                                            {#if t.tier === 'alpha'}<stop offset="0%" stop-color="#fbcfe8"/><stop offset="100%" stop-color="#f472b6"/>{/if}
                                            {#if t.tier === 'titan'}<stop offset="0%" stop-color="#a5d8ff"/><stop offset="100%" stop-color="#00b4ff"/>{/if}
                                        </linearGradient>
                                    </defs>
                                    <polygon points="26,3 48,15 48,43 26,55 4,43 4,15" fill="rgba(10,18,44,0.85)" stroke="url(#bossG-{t.tier})" stroke-width="2"/>
                                    {#if t.tier === 'titan'}
                                        <path d="M 26 14 L 36 22 L 32 38 L 20 38 L 16 22 Z" fill="url(#bossG-{t.tier})" opacity="0.5"/>
                                        <polygon points="26,18 30,25 26,32 22,25" fill="url(#bossG-{t.tier})"/>
                                    {:else}
                                        <text x="26" y="34" font-family="Orbitron" font-size="20" font-weight="900" fill="url(#bossG-{t.tier})" text-anchor="middle">{t.glyph}</text>
                                    {/if}
                                </svg>
                            </div>
                            <div class="badge-card-name-wrap">
                                <div class="badge-tier-tag">{t.tagShort}</div>
                                <div class="badge-card-name">{t.label}</div>
                            </div>
                        </div>
                        <div class="badge-req">HP ≥ <span class="req-key">{t.hp}</span><span class="req-and">AND</span>MEL ≥ <span class="req-key">{t.mel}</span></div>
                        <div class="badge-status">
                            {#if earned.length > 0}
                                <div class="badge-earned-by">✓ {earned.length} {earned.length === 1 ? 'species' : 'species'}<span class="count">{earnedSpeciesList(earned)}</span></div>
                            {:else}
                                <div class="badge-earned-by" style="color:var(--tek-text-faint);">— No specimen at threshold</div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════
         SYSTEM 2: SPECIALIST ROLES (Underdog panel id preserved)
         ═══════════════════════════════════════════════════════ -->
    <div class="sys-panel" class:active={activeTab === 'underdog'} id="sys-underdog">

        <!-- Tier Ladder -->
        <div class="subsection">
            <div class="subsection-head">
                <div class="subsection-title">Specialized Roles <span class="subsection-desc">— Focused single-stat or combo</span></div>
                <div class="map-stat"><span class="earned-c">{data.badgeWall.roles.length}</span> EARNED</div>
            </div>
            <div class="badge-grid">
                {#each roleDefs as r}
                    {@const earned = data.badgeWall.roles.filter(x => x.role === r.role)}
                    <div class="badge-card tier-role" class:earned={earned.length > 0} class:locked={earned.length === 0}>
                        <div class="badge-card-head">
                            <div class="badge-icon-frame">
                                <svg viewBox="0 0 52 58">
                                    <defs>
                                        <linearGradient id="roleG-{r.role}" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stop-color="#c4a3f8"/><stop offset="100%" stop-color="#8b5cf6"/>
                                        </linearGradient>
                                    </defs>
                                    <polygon points="26,3 48,15 48,43 26,55 4,43 4,15" fill="rgba(10,18,44,0.85)" stroke="url(#roleG-{r.role})" stroke-width="2"/>
                                    {#if r.role === 'tank'}
                                        <path d="M 26 12 L 38 20 L 38 36 Q 26 46 26 46 Q 14 36 14 36 L 14 20 Z" fill="url(#roleG-{r.role})"/>
                                    {:else if r.role === 'dps'}
                                        <path d="M 22 12 L 30 12 L 32 38 L 26 44 L 20 38 Z" fill="url(#roleG-{r.role})"/>
                                        <line x1="26" y1="14" x2="26" y2="32" stroke="#050812" stroke-width="1"/>
                                    {:else if r.role === 'bruiser'}
                                        <rect x="14" y="22" width="8" height="14" fill="url(#roleG-{r.role})"/>
                                        <rect x="30" y="22" width="8" height="14" fill="url(#roleG-{r.role})"/>
                                        <line x1="22" y1="29" x2="30" y2="29" stroke="url(#roleG-{r.role})" stroke-width="4"/>
                                    {:else if r.role === 'runner'}
                                        <path d="M 14 36 L 22 22 L 28 28 L 36 18 L 38 20 L 30 32 L 24 28 L 18 38 Z" fill="url(#roleG-{r.role})"/>
                                    {/if}
                                </svg>
                            </div>
                            <div class="badge-card-name-wrap">
                                <div class="badge-tier-tag">Role</div>
                                <div class="badge-card-name">{r.label}</div>
                            </div>
                        </div>
                        <div class="badge-req">
                            {r.reqA} ≥ <span class="req-key">{r.reqAv}</span>{#if r.reqB}<span class="req-and">AND</span>{r.reqB} ≥ <span class="req-key">{r.reqBv}</span>{:else if r.suffix} {r.suffix}{/if}
                        </div>
                        <div class="badge-status">
                            {#if earned.length > 0}
                                <div class="badge-earned-by">✓ {earned.length} {earned.length === 1 ? 'species' : 'species'}<span class="count">{earnedSpeciesList(earned)}</span></div>
                            {:else}
                                <div class="badge-earned-by" style="color:var(--tek-text-faint);">— No qualifying specimen</div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

    </div>

    <!-- ═══════════════════════════════════════════════════════
         SYSTEM 3: PRIZE BLOODLINE
         ═══════════════════════════════════════════════════════ -->
    <div class="sys-panel" class:active={activeTab === 'prize'} id="sys-prize">

        <!-- Diamond Bloodline feature card — prestige moment -->
        <div class="diamond-feature">
            <div class="diamond-feature-content">
                <div class="diamond-feature-icon">
                    <svg viewBox="0 0 88 100">
                        <defs>
                            <linearGradient id="diaG" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#ffffff"/>
                                <stop offset="50%" stop-color="#a5d8ff"/>
                                <stop offset="100%" stop-color="#00b4ff"/>
                            </linearGradient>
                            <linearGradient id="diaG2" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="rgba(0,180,255,0.4)"/>
                                <stop offset="100%" stop-color="rgba(0,180,255,0.1)"/>
                            </linearGradient>
                        </defs>
                        <polygon points="44,4 82,26 82,74 44,96 6,74 6,26" fill="url(#diaG2)" stroke="url(#diaG)" stroke-width="2.5"/>
                        <polygon points="44,18 70,32 70,68 44,82 18,68 18,32" fill="rgba(10,18,44,0.7)" stroke="rgba(0,180,255,0.5)" stroke-width="1"/>
                        <polygon points="44,28 60,42 56,60 44,68 32,60 28,42" fill="url(#diaG)" opacity="0.9"/>
                        <polygon points="44,28 60,42 44,46 28,42" fill="#ffffff" opacity="0.5"/>
                        <line x1="44" y1="28" x2="44" y2="68" stroke="rgba(255,255,255,0.4)" stroke-width="0.5"/>
                    </svg>
                </div>
                <div>
                    <div class="diamond-feature-title">Diamond Bloodline</div>
                    <div class="diamond-feature-flavor">"Genetic perfection beyond compare. The bloodline ends here, or begins again."</div>
                    <div class="diamond-feature-req">ALL 5 stats ≥ <span class="key">60 base</span> · Priceless · Auction-only · Server-wide announcement on earning</div>
                </div>
                <div class="diamond-feature-stat">
                    <div class="diamond-feature-stat-val">{data.badgeWall.bloodline.filter(b => b.tier === 'diamond').length}</div>
                    <div class="diamond-feature-stat-label">In your<br/>Vault</div>
                </div>
            </div>
        </div>

        <!-- Tier ladder -->
        <div class="subsection">
            <div class="subsection-head">
                <div class="subsection-title">Bloodline Tiers <span class="subsection-desc">— ALL 5 stats (HP, STA, FOOD, WGT, MEL) at threshold · base only</span></div>
                <div class="map-stat"><span class="earned-c">{data.badgeWall.bloodline.length}</span> EARNED</div>
            </div>
            <div class="badge-grid">
                {#each bloodlineTiers as t, i}
                    {@const earned = data.badgeWall.bloodline.filter(b => b.tier === t.tier)}
                    {@const romanNumerals = ['I', 'II', 'III', 'IV']}
                    <div class="badge-card tier-{t.tier}-bl" class:earned={earned.length > 0} class:locked={earned.length === 0} class:prestige={t.tier === 'diamond' && earned.length > 0}>
                        <div class="badge-card-head">
                            <div class="badge-icon-frame">
                                <svg viewBox="0 0 52 58">
                                    <defs>
                                        <linearGradient id="blG-{t.tier}" x1="0%" y1="0%" x2={t.tier === 'diamond' ? '100%' : '0%'} y2="100%">
                                            {#if t.tier === 'bronze'}<stop offset="0%" stop-color="#e8b07f"/><stop offset="100%" stop-color="#cd7f32"/>{/if}
                                            {#if t.tier === 'silver'}<stop offset="0%" stop-color="#f0f0f5"/><stop offset="100%" stop-color="#c8c8d2"/>{/if}
                                            {#if t.tier === 'gold'}<stop offset="0%" stop-color="#fff8c0"/><stop offset="100%" stop-color="#ffd700"/>{/if}
                                            {#if t.tier === 'diamond'}<stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#a5d8ff"/><stop offset="100%" stop-color="#00b4ff"/>{/if}
                                        </linearGradient>
                                    </defs>
                                    <polygon points="26,3 48,15 48,43 26,55 4,43 4,15" fill="rgba(10,18,44,0.85)" stroke="url(#blG-{t.tier})" stroke-width="2"/>
                                    {#if t.tier === 'diamond'}
                                        <polygon points="26,16 38,28 26,44 14,28" fill="url(#blG-{t.tier})"/>
                                        <polygon points="26,16 38,28 26,30 14,28" fill="#ffffff" opacity="0.5"/>
                                    {:else}
                                        <path d="M 14 24 Q 26 16 38 24 Q 36 36 26 40 Q 16 36 14 24 Z" fill="url(#blG-{t.tier})" opacity="0.75"/>
                                        <text x="26" y="32" font-family="Orbitron" font-size={t.tier === 'gold' ? 9 : t.tier === 'silver' ? 10 : 11} font-weight="900" fill="#050812" text-anchor="middle">{romanNumerals[i]}</text>
                                    {/if}
                                </svg>
                            </div>
                            <div class="badge-card-name-wrap">
                                <div class="badge-tier-tag">{t.tagShort}</div>
                                <div class="badge-card-name">{t.label}</div>
                            </div>
                        </div>
                        <div class="badge-req">All 5 stats ≥ <span class="req-key">{t.thresh} base</span> · {t.bonus}</div>
                        <div class="badge-status">
                            {#if earned.length > 0}
                                <div class="badge-earned-by">{t.tier === 'diamond' ? '✦' : '✓'} {earned.length} {earned.length === 1 ? 'species' : 'species'}<span class="count">{earnedSpeciesList(earned)}</span></div>
                            {:else}
                                <div class="badge-earned-by" style="color:var(--tek-text-faint);">— Not earned yet</div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Community recognition strip -->
        <div class="subsection">
            <div class="subsection-head">
                <div class="subsection-title">Community Recognition <span class="subsection-desc">— Worn perks per tier earned</span></div>
            </div>
            <div class="community-grid">
                <div class="community-pill community-bronze">
                    <div class="community-tier">BRONZE</div>
                    <div class="community-perk">"Dedicated Breeder" chat tag</div>
                </div>
                <div class="community-pill community-silver">
                    <div class="community-tier">SILVER</div>
                    <div class="community-perk">"Expert Breeder" + Hall of Fame</div>
                </div>
                <div class="community-pill community-gold">
                    <div class="community-tier">GOLD</div>
                    <div class="community-perk">"Master Breeder" + Discord role</div>
                </div>
                <div class="community-pill community-diamond">
                    <div class="community-tier">DIAMOND</div>
                    <div class="community-perk">"Legendary Breeder" + permanent server monument</div>
                </div>
            </div>
        </div>

    </div>

</div>

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

    --tier-bronze:      #cd7f32;
    --tier-silver:      #c8c8d2;
    --tier-gold:        #ffd700;
    --tier-diamond:     #00b4ff;
    --tier-bronze-glow: rgba(205,127,50,0.5);
    --tier-silver-glow: rgba(200,200,210,0.5);
    --tier-gold-glow:   rgba(255,215,0,0.55);
    --tier-diamond-glow:rgba(0,180,255,0.6);

    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --tek-serif:        'Crimson Pro', Georgia, serif;
}

:global(#tekHexCanvas) { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1280px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header { margin-bottom: 24px; }
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; transition: color 0.15s; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 6px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.8rem, 3.6vw, 2.5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
}
.page-sub {
    font-family: var(--tek-mono); font-size: 0.72rem;
    letter-spacing: 0.14em; color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 6px;
}

/* ═════════════════════════════════════════════════════════════════════════
   HERO BAND — Breeder Rank
   ═════════════════════════════════════════════════════════════════════════ */
.rank-hero {
    position: relative;
    background:
        radial-gradient(ellipse 60% 80% at 20% 50%, rgba(255,215,0,0.10) 0%, transparent 70%),
        radial-gradient(ellipse 50% 80% at 80% 50%, rgba(0,180,255,0.10) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid rgba(255,215,0,0.30);
    clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
    padding: 26px 30px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 30px;
    align-items: center;
    margin-bottom: 24px;
    backdrop-filter: blur(8px);
    overflow: hidden;
}
.rank-hero::before {
    content: '';
    position: absolute;
    left: 0; top: 16px; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, var(--tier-gold), var(--tek-blue));
    box-shadow: 0 0 10px rgba(255,215,0,0.45);
}
.rank-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
        repeating-linear-gradient(60deg, rgba(255,215,0,0.04) 0 1px, transparent 1px 28px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 28px);
    pointer-events: none;
    opacity: 0.6;
}

/* Rank emblem */
.rank-emblem {
    position: relative;
    width: 130px; height: 148px;
    flex-shrink: 0;
    z-index: 2;
}
.rank-emblem svg { width: 100%; height: 100%; }
.rank-emblem-label {
    position: absolute;
    bottom: -6px; left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(90deg, var(--tier-gold), #ff9500);
    color: #050812;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.20em;
    padding: 3px 10px;
    white-space: nowrap;
}

/* Rank info */
.rank-info { min-width: 0; z-index: 2; position: relative; }
.rank-title-row {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 6px;
}
.rank-title {
    font-family: var(--tek-display);
    font-size: clamp(1.7rem, 3vw, 2.4rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #fff8d0 0%, var(--tier-gold) 70%, rgba(255,215,0,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(255,215,0,0.40));
    line-height: 1;
}
.rank-num {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tier-gold);
    letter-spacing: 0.14em;
    padding: 2px 8px;
    border: 1px solid rgba(255,215,0,0.4);
    background: rgba(255,215,0,0.08);
}
.rank-flavor {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 1rem;
    color: var(--tek-text-dim);
    margin-bottom: 14px;
}
.rank-progress-wrap {
    margin-top: 10px;
}
.rank-progress-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
}
.rank-progress-name {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.rank-progress-name .next {
    color: var(--tier-gold);
    text-shadow: 0 0 8px rgba(255,215,0,0.4);
}
.rank-progress-val {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
}
.rank-progress-val :global(.have) { color: var(--tier-gold); font-weight: 700; }
.rank-progress-bar {
    height: 6px;
    background: rgba(255,215,0,0.10);
    overflow: hidden;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.rank-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--tier-gold), #ff9500);
    box-shadow: 0 0 8px rgba(255,215,0,0.5);
}
.rank-progress-hint {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 6px;
}

/* Aggregate stats column */
.rank-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 22px;
    z-index: 2;
    position: relative;
    min-width: 220px;
}
.rank-stat {
    text-align: right;
}
.rank-stat-val {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: var(--tek-text);
}
.rank-stat-val.gold    { color: var(--tier-gold);   text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.rank-stat-val.diamond { color: var(--tier-diamond);text-shadow: 0 0 8px rgba(0,180,255,0.4); }
.rank-stat-val.silver  { color: var(--tier-silver); }
.rank-stat-val.bronze  { color: var(--tier-bronze); }
.rank-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 2px;
}

@media (max-width: 880px) {
    .rank-hero { grid-template-columns: 1fr; text-align: center; }
    .rank-emblem { margin: 0 auto; }
    .rank-stats { grid-template-columns: repeat(4, 1fr); margin: 0 auto; }
    .rank-stat { text-align: center; }
}

/* Breeder ladder rail (Apprentice → Myth) */
.rank-ladder {
    margin-top: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(0,180,255,0.12);
    padding: 12px 16px;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    margin-bottom: 32px;
    overflow-x: auto;
}
.ladder-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 90px;
    position: relative;
    opacity: 0.45;
    transition: opacity 0.2s;
}
.ladder-step.passed { opacity: 1; }
.ladder-step.current { opacity: 1; }
.ladder-step.current .ladder-pip {
    background: var(--tier-gold);
    box-shadow: 0 0 12px rgba(255,215,0,0.6);
    transform: scale(1.4);
}
.ladder-step.current .ladder-name {
    color: var(--tier-gold);
    text-shadow: 0 0 8px rgba(255,215,0,0.4);
    font-weight: 700;
}
.ladder-pip {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--tek-text-faint);
    transition: all 0.2s;
}
.ladder-step.passed .ladder-pip { background: var(--tek-blue); box-shadow: 0 0 6px var(--tek-blue-glow); }
.ladder-name {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    white-space: nowrap;
}
.ladder-step.passed .ladder-name { color: var(--tek-text); }

/* Connector line behind pips */
.rank-ladder::before {
    content: '';
    position: absolute;
    left: 16px; right: 16px;
    top: 50%;
    height: 1px;
    background: linear-gradient(90deg, var(--tek-blue) 0%, var(--tek-blue) 60%, var(--tek-text-faint) 60%, var(--tek-text-faint) 100%);
    z-index: 0;
    transform: translateY(-50%);
}
.rank-ladder { position: relative; }
.ladder-step > * { position: relative; z-index: 2; }
.ladder-pip { background-color: var(--tek-text-faint); border: 2px solid var(--tek-bg); }
.ladder-step.passed .ladder-pip,
.ladder-step.current .ladder-pip { border-color: var(--tek-bg); }

/* ═════════════════════════════════════════════════════════════════════════
   CLOSE TO EARNING — the hook
   ═════════════════════════════════════════════════════════════════════════ */
.section-block { margin-bottom: 36px; }
.section-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.section-block-title-wrap { display: flex; align-items: center; gap: 10px; }
.section-block-title {
    font-family: var(--tek-display);
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.section-block-count {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    padding: 2px 7px;
    border: 1px solid rgba(100,116,139,0.30);
}
.section-block-hint {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

/* Close-to-earning cards */
.close-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 12px;
}
.close-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid rgba(245,158,11,0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 16px;
    transition: all 0.2s;
    cursor: pointer;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    display: block;
}
.close-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 2px;
    background: var(--tek-amber);
    box-shadow: 0 0 6px rgba(245,158,11,0.5);
}
.close-card:hover {
    border-color: rgba(245,158,11,0.50);
    transform: translateY(-2px);
}
.close-card-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
}
.close-badge-icon {
    width: 38px; height: 42px;
    flex-shrink: 0;
    position: relative;
}
.close-badge-icon svg { width: 100%; height: 100%; filter: drop-shadow(0 0 6px var(--badge-glow, var(--tek-blue-glow))); }
.close-card-info { flex: 1; min-width: 0; }
.close-badge-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1.1;
    margin-bottom: 2px;
}
.close-badge-tier {
    font-family: var(--tek-mono);
    font-size: 0.64rem;
    letter-spacing: 0.16em;
    color: var(--tek-amber);
    text-transform: uppercase;
}
.close-specimen {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    padding: 8px 12px;
    margin-bottom: 10px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.close-specimen-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 3px;
}
.close-specimen-name {
    font-size: 0.92rem;
    color: var(--tek-text);
    font-weight: 600;
}
.close-specimen-species {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.06em;
}
.close-gap {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-text);
    margin-bottom: 8px;
}
.close-gap-stat {
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
}
.close-gap-val {
    color: var(--tek-amber);
    font-weight: 700;
    font-size: 1.1rem;
    text-shadow: 0 0 6px rgba(245,158,11,0.4);
}
.close-gap-of {
    color: var(--tek-text-faint);
    font-size: 0.7rem;
}
.close-progress {
    height: 4px;
    background: rgba(245,158,11,0.12);
    overflow: hidden;
    margin-bottom: 10px;
}
.close-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--tek-amber), #ff8a00);
    box-shadow: 0 0 6px rgba(245,158,11,0.5);
}

/* ═════════════════════════════════════════════════════════════════════════
   SYSTEM TABS
   ═════════════════════════════════════════════════════════════════════════ */
.sys-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    border-bottom: 1px solid rgba(0,180,255,0.18);
    overflow-x: auto;
}
.sys-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--tek-text-dim);
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    padding: 14px 22px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex; align-items: center; gap: 10px;
    white-space: nowrap;
}
.sys-tab:hover {
    color: var(--tek-text);
}
.sys-tab.active {
    color: var(--tek-blue);
    border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.sys-tab .count {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    background: rgba(100,116,139,0.10);
    padding: 2px 7px;
    border: 1px solid rgba(100,116,139,0.20);
}
.sys-tab.active .count {
    color: var(--tek-blue);
    background: rgba(0,180,255,0.08);
    border-color: var(--tek-blue-border);
}

/* ═════════════════════════════════════════════════════════════════════════
   CATALOG — Sub-section grouping
   ═════════════════════════════════════════════════════════════════════════ */
.sys-panel { display: none; }
.sys-panel.active { display: block; animation: panelFade 0.35s ease; }
@keyframes panelFade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}

.subsection { margin-bottom: 30px; }
.subsection-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.subsection-title {
    font-family: var(--tek-display);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-blue);
    display: flex; align-items: center; gap: 10px;
}
.subsection-title::before {
    content: '▸';
    color: var(--tek-purple);
}
.subsection-desc {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.06em;
    text-transform: none;
}

/* Badge cards — main grid */
.badge-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(265px, 1fr));
    gap: 12px;
}
.badge-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid var(--card-border, rgba(100,116,139,0.20));
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px;
    transition: all 0.2s;
    cursor: pointer;
    overflow: hidden;
}
.badge-card:hover {
    transform: translateY(-2px);
    border-color: var(--card-hover, rgba(0,180,255,0.40));
}
.badge-card.earned {
    --card-border: rgba(var(--tier-rgb, 0,180,255), 0.45);
    --card-hover: rgba(var(--tier-rgb, 0,180,255), 0.80);
    background:
        radial-gradient(ellipse 50% 60% at 50% 20%, rgba(var(--tier-rgb, 0,180,255), 0.10) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.98) 100%);
    box-shadow: 0 0 0 1px rgba(var(--tier-rgb, 0,180,255), 0.15), 0 0 16px rgba(var(--tier-rgb, 0,180,255), 0.08);
}
.badge-card.locked {
    opacity: 0.55;
    cursor: default;
}
.badge-card.locked:hover { transform: none; border-color: var(--card-border, rgba(100,116,139,0.20)); }
.badge-card.locked::after {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(45deg, rgba(0,0,0,0.10) 0 6px, transparent 6px 12px);
    pointer-events: none;
}

/* Badge head — tier strip + icon + name */
.badge-card-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
}
.badge-icon-frame {
    width: 52px; height: 58px;
    flex-shrink: 0;
    position: relative;
}
.badge-icon-frame svg { width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(var(--tier-rgb, 0,180,255), 0.5)); }
.badge-card-name-wrap { flex: 1; min-width: 0; }
.badge-tier-tag {
    display: inline-block;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgb(var(--tier-rgb, 0,180,255));
    background: rgba(var(--tier-rgb, 0,180,255), 0.10);
    border: 1px solid rgba(var(--tier-rgb, 0,180,255), 0.35);
    padding: 2px 6px;
    margin-bottom: 5px;
}
.badge-card-name {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1.15;
}
.badge-card.locked .badge-card-name { color: var(--tek-text-dim); }

/* Requirement formula */
.badge-req {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    background: rgba(5,8,18,0.4);
    border-left: 2px solid rgba(var(--tier-rgb, 0,180,255), 0.40);
    padding: 6px 10px;
    margin-bottom: 8px;
    line-height: 1.5;
}
.badge-req :global(.req-key) { color: rgb(var(--tier-rgb, 0,180,255)); font-weight: 600; }
.badge-req :global(.req-and) { color: var(--tek-text-faint); margin: 0 4px; }

/* Status row at bottom */
.badge-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
}
.badge-earned-by {
    color: rgb(var(--tier-rgb, 0,180,255));
    flex: 1; min-width: 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.badge-earned-by .count {
    color: var(--tek-text-dim);
    font-size: 0.62rem;
    margin-left: 4px;
}

/* Tier color tokens applied to badge-card via class */
.tier-gamma   { --tier-rgb: 100, 220, 100; }
.tier-beta    { --tier-rgb: 100, 180, 255; }
.tier-alpha   { --tier-rgb: 244, 114, 182; }
.tier-titan   { --tier-rgb: 0, 180, 255; }
.tier-role    { --tier-rgb: 168, 85, 247; }

.tier-bronze-bl  { --tier-rgb: 205, 127, 50; }
.tier-silver-bl  { --tier-rgb: 200, 200, 210; }
.tier-gold-bl    { --tier-rgb: 255, 215, 0; }
.tier-diamond-bl { --tier-rgb: 0, 180, 255; }

/* Diamond Bloodline gets extra prestige */
.badge-card.prestige {
    background:
        radial-gradient(ellipse 60% 80% at 50% 30%, rgba(0,180,255,0.18) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.99) 100%);
    border-color: var(--tek-blue);
    box-shadow:
        0 0 0 1px var(--tek-blue),
        0 0 24px rgba(0,180,255,0.30),
        inset 0 0 30px rgba(0,180,255,0.05);
}
.badge-card.prestige::before {
    content: '';
    position: absolute;
    inset: -2px;
    background: linear-gradient(135deg, var(--tek-blue), transparent 30%, transparent 70%, var(--tek-purple));
    z-index: -1;
    filter: blur(8px);
    opacity: 0.4;
}
.badge-card.prestige .badge-tier-tag::after {
    content: ' ✦';
    color: var(--tek-blue);
}

.map-stat {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.map-stat .earned-c { color: var(--tek-green); }

/* Diamond Bloodline call-out — featured */
.diamond-feature {
    position: relative;
    background:
        radial-gradient(ellipse 60% 100% at 50% 50%, rgba(0,180,255,0.15) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid var(--tek-blue);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 0 32px rgba(0,180,255,0.20);
    overflow: hidden;
}
.diamond-feature::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 20px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 20px);
    opacity: 0.7;
    pointer-events: none;
}
.diamond-feature-content {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 24px;
    align-items: center;
}
.diamond-feature-icon {
    width: 88px; height: 100px;
    flex-shrink: 0;
}
.diamond-feature-icon svg { width: 100%; height: 100%; filter: drop-shadow(0 0 16px var(--tier-diamond-glow)); }
.diamond-feature-title {
    font-family: var(--tek-display);
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: 0.06em;
    background: linear-gradient(180deg, #ffffff 0%, var(--tier-diamond) 80%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px var(--tier-diamond-glow));
    text-transform: uppercase;
    margin-bottom: 4px;
}
.diamond-feature-flavor {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 1rem;
    color: var(--tek-text-dim);
    margin-bottom: 8px;
}
.diamond-feature-req {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    color: var(--tek-text);
}
.diamond-feature-req .key { color: var(--tier-diamond); font-weight: 700; }
.diamond-feature-stat {
    text-align: right;
    flex-shrink: 0;
}
.diamond-feature-stat-val {
    font-family: var(--tek-display);
    font-size: 2.4rem;
    font-weight: 900;
    color: var(--tier-diamond);
    text-shadow: 0 0 14px var(--tier-diamond-glow);
    line-height: 1;
}
.diamond-feature-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 6px;
}

/* Community recognition — inline grid */
.community-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    font-family: var(--tek-mono);
    font-size: 0.76rem;
}
.community-pill {
    padding: 10px 14px;
}
.community-tier {
    font-weight: 700;
    letter-spacing: 0.10em;
    margin-bottom: 3px;
}
.community-perk { color: var(--tek-text-dim); }
.community-bronze  { background: rgba(205,127,50,0.06);  border-left: 2px solid var(--tier-bronze); }
.community-bronze  .community-tier { color: var(--tier-bronze); }
.community-silver  { background: rgba(200,200,210,0.06); border-left: 2px solid var(--tier-silver); }
.community-silver  .community-tier { color: var(--tier-silver); }
.community-gold    { background: rgba(255,215,0,0.06);   border-left: 2px solid var(--tier-gold); }
.community-gold    .community-tier { color: var(--tier-gold); }
.community-diamond { background: rgba(0,180,255,0.06);   border-left: 2px solid var(--tier-diamond); }
.community-diamond .community-tier { color: var(--tier-diamond); }
</style>
