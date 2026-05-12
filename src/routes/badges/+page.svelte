<script lang="ts">
    import { Award, Sword, Shield, Crown } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';

    let { data }: { data: PageData } = $props();

    type SystemTab = 'bossReady' | 'underdog' | 'bloodline';
    let activeTab = $state<SystemTab>('bossReady');

    const tierGlyph = {
        diamond: '✦', gold: '◈', silver: '⬢', bronze: '⬢',
        titan: '◆',   alpha: 'α', beta: 'β', gamma: 'γ'
    } as const;

    const rankFlavor: Record<string, string> = {
        apprentice:  '"Every bloodline begins with one survivor and one tame."',
        journeyman:  '"Five species can\'t be luck. The pattern recognizes itself."',
        expert:      '"You see the math now. The wild becomes negotiable."',
        master:      '"Your bloodlines hold their shape across generations. The wild forgets what you remember."',
        grandmaster: '"Three Gold lines. The market notices. Other Survivors ask for your seed."',
        legend:      '"A Diamond is rare for a reason. You proved them wrong."',
        myth:        '"What you breed becomes folklore. The Obelisks know your name."'
    };
</script>

<svelte:head>
    <title>⬡ TekOS — Badge Archive</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Badge Archive"
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Dossier',   href: '/dossier' },
            { label: 'Badges' }
        ]}
        sub="Every honor TekOS recognizes — three systems, all wired to your Vault."
    />

    <!-- ═════════════ BREEDER RANK HERO ═════════════ -->
    <section class="rank-hero">
        <div class="rank-emblem">
            <svg viewBox="0 0 130 148" aria-hidden="true">
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
            </svg>
            {#if data.rank.current}
                <div class="rank-emblem-label">{data.rank.current.name.toUpperCase()}</div>
            {/if}
        </div>

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
    </section>

    <!-- ═════════════ RANK LADDER ═════════════ -->
    <div class="rank-ladder">
        {#each data.rank.ladder as step}
            <div class="ladder-step" class:passed={step.achieved} class:current={step.id === data.rank.current?.id}>
                <div class="ladder-pip"></div>
                <div class="ladder-name">{step.name}</div>
            </div>
        {/each}
    </div>

    <!-- ═════════════ CLOSE TO EARNING ═════════════ -->
    {#if data.close.length > 0}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Close to Earning</div>
                <div class="tek-section-meta"><span class="accent">{data.close.length}</span> NEARBY · WITHIN REACH</div>
            </div>
            <div class="close-grid">
                {#each data.close as c}
                    <a class="close-card" href="/specimens/{c.creatureId}">
                        <div class="close-card-head">
                            <div class="close-tier">{c.category} · {c.tier.toUpperCase()}</div>
                            <div class="close-badge-name">{c.badge}</div>
                        </div>
                        <div class="close-specimen">
                            <div class="close-specimen-label">Closest specimen</div>
                            <div class="close-specimen-name">
                                "{c.creatureName}" <span class="close-specimen-species">· {c.species}</span>
                            </div>
                        </div>
                        <div class="close-gap">
                            <span class="close-gap-stat">{c.statKey}</span>
                            <span class="close-gap-val">+{c.gap}</span>
                            <span class="close-gap-of">to threshold</span>
                        </div>
                        <div class="close-progress">
                            <div class="close-progress-fill" style="width: {c.progressPct}%"></div>
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/if}

    <!-- ═════════════ SYSTEM TABS ═════════════ -->
    <div class="tek-tabs">
        <button class="tek-tab" class:active={activeTab === 'bossReady'} onclick={() => activeTab = 'bossReady'}>
            <Sword size={14} strokeWidth={2} /> Boss Ready
            <span class="count">{data.badgeWall.bossReady.length}</span>
        </button>
        <button class="tek-tab" class:active={activeTab === 'underdog'} onclick={() => activeTab = 'underdog'}>
            <Shield size={14} strokeWidth={2} /> Specialist Roles
            <span class="count">{data.badgeWall.roles.length}</span>
        </button>
        <button class="tek-tab" class:active={activeTab === 'bloodline'} onclick={() => activeTab = 'bloodline'}>
            <Award size={14} strokeWidth={2} /> Prize Bloodline
            <span class="count">{data.badgeWall.bloodline.length}</span>
        </button>
    </div>

    {#if activeTab === 'bossReady'}
        <section class="catalog">
            <h2 class="catalog-title">Boss Ready · standard tiers</h2>
            <p class="catalog-desc">HP and Melee both at threshold (base + mut × 2).</p>
            <div class="catalog-grid">
                {#each [
                    { tier: 'gamma', label: 'Gamma Ready', req: 'HP ≥ 75 AND MEL ≥ 75',   glyph: 'γ' },
                    { tier: 'beta',  label: 'Beta Ready',  req: 'HP ≥ 100 AND MEL ≥ 100', glyph: 'β' },
                    { tier: 'alpha', label: 'Alpha Ready', req: 'HP ≥ 125 AND MEL ≥ 125', glyph: 'α' },
                    { tier: 'titan', label: 'Titan Slayer',req: 'HP ≥ 150 AND MEL ≥ 150', glyph: '◆' }
                ] as t}
                    {@const earned = data.badgeWall.bossReady.filter(b => b.tier === t.tier)}
                    <div class="catalog-card" class:earned={earned.length > 0}>
                        <div class="catalog-card-head">
                            <div class="catalog-glyph tier-{t.tier}">{t.glyph}</div>
                            <div class="catalog-card-info">
                                <div class="catalog-card-name">{t.label}</div>
                                <div class="catalog-card-req">{t.req}</div>
                            </div>
                        </div>
                        {#if earned.length > 0}
                            <div class="catalog-earned-by">
                                <span class="earned-marker">✓ EARNED ·</span>
                                {earned.map(e => e.species).slice(0, 3).join(', ')}{earned.length > 3 ? ` +${earned.length - 3}` : ''}
                            </div>
                        {:else}
                            <div class="catalog-locked">— Not earned yet —</div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    {#if activeTab === 'underdog'}
        <section class="catalog">
            <h2 class="catalog-title">Specialist Roles</h2>
            <p class="catalog-desc">Focused stat investment — single-stat or combo achievements.</p>
            <div class="catalog-grid">
                {#each [
                    { role: 'tank',    label: 'Boss Tank',    req: 'HP ≥ 175 (alone)' },
                    { role: 'dps',     label: 'Boss DPS',     req: 'MEL ≥ 175 (alone)' },
                    { role: 'bruiser', label: 'Boss Bruiser', req: 'HP ≥ 125 AND WGT ≥ 125' },
                    { role: 'runner',  label: 'Boss Runner',  req: 'HP ≥ 100 AND SPD ≥ 150' }
                ] as t}
                    {@const earned = data.badgeWall.roles.filter(r => r.role === t.role)}
                    <div class="catalog-card" class:earned={earned.length > 0}>
                        <div class="catalog-card-head">
                            <div class="catalog-glyph tier-role">▣</div>
                            <div class="catalog-card-info">
                                <div class="catalog-card-name">{t.label}</div>
                                <div class="catalog-card-req">{t.req}</div>
                            </div>
                        </div>
                        {#if earned.length > 0}
                            <div class="catalog-earned-by">
                                <span class="earned-marker">✓ EARNED ·</span>
                                {earned.map(e => e.species).slice(0, 3).join(', ')}{earned.length > 3 ? ` +${earned.length - 3}` : ''}
                            </div>
                        {:else}
                            <div class="catalog-locked">— Not earned yet —</div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    {#if activeTab === 'bloodline'}
        <section class="catalog">
            <h2 class="catalog-title">Prize Bloodline · base-stat tiers</h2>
            <p class="catalog-desc">Min of HP, STA, FOOD, WGT, MEL — base only, no mutations.</p>
            <div class="catalog-grid">
                {#each [
                    { tier: 'bronze',  label: 'Bronze Bloodline',  req: 'All 5 stats ≥ 45 base', value: '+25% trade value',  glyph: '⬢' },
                    { tier: 'silver',  label: 'Silver Bloodline',  req: 'All 5 stats ≥ 50 base', value: '+50% trade value',  glyph: '⬢' },
                    { tier: 'gold',    label: 'Gold Bloodline',    req: 'All 5 stats ≥ 55 base', value: '+100% trade value', glyph: '◈' },
                    { tier: 'diamond', label: 'Diamond Bloodline', req: 'All 5 stats ≥ 60 base', value: 'Priceless · Auction-only', glyph: '✦' }
                ] as t}
                    {@const earned = data.badgeWall.bloodline.filter(b => b.tier === t.tier)}
                    <div class="catalog-card" class:earned={earned.length > 0} class:prestige={t.tier === 'diamond' && earned.length > 0}>
                        <div class="catalog-card-head">
                            <div class="catalog-glyph tier-{t.tier}-bl">{t.glyph}</div>
                            <div class="catalog-card-info">
                                <div class="catalog-card-name">{t.label}</div>
                                <div class="catalog-card-req">{t.req}</div>
                                <div class="catalog-card-bonus">{t.value}</div>
                            </div>
                        </div>
                        {#if earned.length > 0}
                            <div class="catalog-earned-by">
                                <span class="earned-marker">✓ EARNED ·</span>
                                {earned.map(e => e.species).slice(0, 3).join(', ')}{earned.length > 3 ? ` +${earned.length - 3}` : ''}
                            </div>
                        {:else}
                            <div class="catalog-locked">— Not earned yet —</div>
                        {/if}
                    </div>
                {/each}
            </div>
        </section>
    {/if}
</div>

<style>
/* ── Rank hero ───────────────────────────────────────────────────────────── */
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
    margin-bottom: 22px;
    overflow: hidden;
}
@media (max-width: 880px) {
    .rank-hero { grid-template-columns: 1fr; text-align: center; }
    .rank-emblem { margin: 0 auto; }
}
.rank-hero::before {
    content: '';
    position: absolute;
    left: 0; top: 16px; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, var(--tier-gold), var(--tek-blue));
    box-shadow: 0 0 10px rgba(255,215,0,0.45);
}

.rank-emblem {
    position: relative;
    width: 130px; height: 148px;
    flex-shrink: 0;
}
.rank-emblem :global(svg) { width: 100%; height: 100%; }
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

.rank-info { min-width: 0; z-index: 2; position: relative; }
.rank-title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; flex-wrap: wrap; }
.rank-title {
    font-family: var(--tek-display);
    font-size: clamp(1.6rem, 3vw, 2.3rem);
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
.rank-progress-wrap { margin-top: 10px; }
.rank-progress-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
    flex-wrap: wrap;
    gap: 4px;
}
.rank-progress-name {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.rank-progress-name .next { color: var(--tier-gold); text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.rank-progress-val {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
}
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
    transition: width 0.4s;
}

.rank-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 22px;
    z-index: 2;
    position: relative;
    min-width: 220px;
}
@media (max-width: 880px) { .rank-stats { grid-template-columns: repeat(4, 1fr); margin: 0 auto; } }
.rank-stat { text-align: right; }
@media (max-width: 880px) { .rank-stat { text-align: center; } }
.rank-stat-val {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1;
    color: var(--tek-text);
}
.rank-stat-val.gold    { color: var(--tier-gold);    text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.rank-stat-val.diamond { color: var(--tier-diamond); text-shadow: 0 0 8px rgba(0,180,255,0.4); }
.rank-stat-val.silver  { color: var(--tier-silver); }
.rank-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 2px;
}

/* ── Rank ladder rail ────────────────────────────────────────────────────── */
.rank-ladder {
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
    position: relative;
}
.rank-ladder::before {
    content: '';
    position: absolute;
    left: 16px; right: 16px;
    top: 50%;
    height: 1px;
    background: var(--tek-text-faint);
    z-index: 0;
    transform: translateY(-50%);
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
    z-index: 1;
}
.ladder-step.passed { opacity: 1; }
.ladder-step.current { opacity: 1; }
.ladder-pip {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: var(--tek-text-faint);
    border: 2px solid var(--tek-bg);
    transition: all 0.2s;
}
.ladder-step.passed .ladder-pip { background: var(--tek-blue); box-shadow: 0 0 6px var(--tek-blue-glow); }
.ladder-step.current .ladder-pip {
    background: var(--tier-gold);
    box-shadow: 0 0 12px rgba(255,215,0,0.6);
    transform: scale(1.4);
}
.ladder-name {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    white-space: nowrap;
}
.ladder-step.passed .ladder-name { color: var(--tek-text); }
.ladder-step.current .ladder-name {
    color: var(--tier-gold);
    text-shadow: 0 0 8px rgba(255,215,0,0.4);
    font-weight: 700;
}

/* ── Section block ───────────────────────────────────────────────────────── */
.section-block { margin-bottom: 32px; }

/* ── Close to Earning ────────────────────────────────────────────────────── */
.close-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 10px;
}
.close-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid rgba(245,158,11,0.25);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 13px 16px 14px;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
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
    transform: translateY(-2px);
    border-color: rgba(245,158,11,0.50);
}
.close-card-head { margin-bottom: 8px; }
.close-tier {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: var(--tek-amber);
    text-transform: uppercase;
    margin-bottom: 3px;
}
.close-badge-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.close-specimen {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    padding: 7px 11px;
    margin-bottom: 9px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.close-specimen-label {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 3px;
}
.close-specimen-name { font-size: 0.88rem; color: var(--tek-text); font-weight: 600; }
.close-specimen-species { color: var(--tek-text-dim); font-family: var(--tek-mono); font-size: 0.74rem; }
.close-gap {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-text);
    margin-bottom: 8px;
}
.close-gap-stat { color: var(--tek-text-dim); letter-spacing: 0.10em; }
.close-gap-val { color: var(--tek-amber); font-weight: 700; font-size: 1.1rem; text-shadow: 0 0 6px rgba(245,158,11,0.4); }
.close-gap-of { color: var(--tek-text-faint); font-size: 0.7rem; }
.close-progress { height: 3px; background: rgba(245,158,11,0.12); overflow: hidden; }
.close-progress-fill { height: 100%; background: linear-gradient(90deg, var(--tek-amber), #ff8a00); box-shadow: 0 0 6px rgba(245,158,11,0.5); }

/* ── Catalog ─────────────────────────────────────────────────────────────── */
.catalog { margin-top: 6px; }
.catalog-title {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.catalog-desc {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.06em;
    margin-bottom: 14px;
}
.catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 10px;
}
.catalog-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.6) 0%, rgba(4,8,20,0.92) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px;
    transition: all 0.2s;
}
.catalog-card.earned {
    border-color: rgba(0,180,255,0.40);
    box-shadow: 0 0 14px rgba(0,180,255,0.08);
}
.catalog-card.prestige {
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 18px rgba(0,180,255,0.30);
}
.catalog-card-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.catalog-glyph {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tek-display);
    font-size: 1.4rem;
    border: 1px solid rgba(var(--tier-rgb, 0, 180, 255), 0.40);
    background: rgba(var(--tier-rgb, 0, 180, 255), 0.08);
    color: rgb(var(--tier-rgb, 0, 180, 255));
    text-shadow: 0 0 6px rgba(var(--tier-rgb), 0.4);
    flex-shrink: 0;
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
}
.catalog-glyph.tier-gamma   { --tier-rgb: 16, 185, 129; }
.catalog-glyph.tier-beta    { --tier-rgb: 0, 180, 255; }
.catalog-glyph.tier-alpha   { --tier-rgb: 244, 114, 182; }
.catalog-glyph.tier-titan   { --tier-rgb: 0, 180, 255; }
.catalog-glyph.tier-role    { --tier-rgb: 139, 92, 246; }
.catalog-glyph.tier-bronze-bl  { --tier-rgb: 205, 127, 50; }
.catalog-glyph.tier-silver-bl  { --tier-rgb: 200, 200, 210; }
.catalog-glyph.tier-gold-bl    { --tier-rgb: 255, 215, 0; }
.catalog-glyph.tier-diamond-bl { --tier-rgb: 0, 180, 255; }
.catalog-card-info { flex: 1; min-width: 0; }
.catalog-card-name {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.catalog-card-req {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.04em;
}
.catalog-card-bonus {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-amber);
    letter-spacing: 0.08em;
    margin-top: 4px;
}
.catalog-earned-by {
    padding-top: 10px;
    border-top: 1px solid rgba(0,180,255,0.10);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text);
    letter-spacing: 0.04em;
}
.earned-marker {
    color: var(--tek-green);
    font-weight: 700;
    margin-right: 4px;
    letter-spacing: 0.14em;
}
.catalog-locked {
    padding-top: 10px;
    border-top: 1px solid rgba(100,116,139,0.10);
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.08em;
    font-style: italic;
}
</style>
