<script lang="ts">
    import type { PageData } from './$types';
    import { onMount } from 'svelte';
    import { computeBadges, getStat } from '$lib/badges';

    let { data }: { data: PageData } = $props();
    const c = $derived(data.creature);

    const STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;

    const badges = $derived(computeBadges(c.baseStats, c.mutations));

    function totalLevel(s: typeof STATS[number]) {
        return getStat(c.baseStats, s) + getStat(c.mutations, s) * 2;
    }

    const totalMuts = $derived(STATS.reduce((sum, s) => sum + getStat(c.mutations, s), 0));
    const grandTotal = $derived(STATS.reduce((sum, s) => sum + totalLevel(s), 0));

    const ownerName = $derived(data.owner.nickname ?? data.owner.email);

    const loggedDate = $derived(new Date(c.createdAt).toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' }).replace(/\//g, '·'));

    async function deleteSpecimen() {
        if (!confirm(`Delete "${c.name}" from your vault? This cannot be undone.`)) return;
        const res = await fetch(`/api/creatures/${c.id}`, { method: 'DELETE' });
        if (res.ok) window.location.href = '/specimens';
    }

    let hexCanvas: HTMLCanvasElement;
    let artifactEl: HTMLDivElement;

    onMount(() => {
        // Hex canvas background
        const canvas = hexCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let rafId: number;

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
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            const cw = canvas.width, ch = canvas.height;
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
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize(); draw();

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
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
            stage?.removeEventListener('mousemove', onMove as EventListener);
            stage?.removeEventListener('mouseleave', onLeave as EventListener);
        };
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — {c.species} "{c.name}"</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

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
                                        <span class="cat">LVL {c.level}</span>
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
                                <span class="footer-tribe">⌬ BLOODLINE</span>
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
                    <a class="act-btn secondary" href="/specimens/{c.id}/edit?pin=1"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>Pin as Project</a>
                    <button class="act-btn secondary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>Set Partner</button>
                    <button class="act-btn ghost"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>Share</button>
                    <button class="act-btn danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22a8 8 0 0 1 16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 2L18 6"/><path d="M18 2l4 4"/></svg>Retire</button>
                    <button class="act-btn danger" onclick={deleteSpecimen}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>Delete</button>
                </div>
            {/if}

            <!-- PROJECT CALLOUT -->
            <div class="project-callout">
                <div class="project-glyph">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>
                </div>
                <div class="project-text">
                    <div class="project-label">Active Breeding Project</div>
                    <div class="project-name">Stacking · Melee</div>
                </div>
                <div style="text-align:right">
                    <div class="project-stat">{totalMuts}</div>
                    <div class="project-stat-lbl">MUTS</div>
                </div>
                <button class="project-open-btn">Open ▸</button>
            </div>

            <!-- ANCESTRY — Stat provenance focused -->
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
                    <span class="count">2</span>
                </div>
                <div class="ancestor-rows">
                    <a class="ancestor male">
                        <span class="gender-glyph male">♂</span>
                        <div class="ancestor-id">
                            <div class="ancestor-species">{c.species}<span class="nick">· "Specter"</span></div>
                            <div class="ancestor-meta">Father · contributed MEL + STA mutations</div>
                        </div>
                        <span class="ancestor-lvl">388</span>
                        <span class="ancestor-muts">36 muts</span>
                    </a>
                    <a class="ancestor female">
                        <span class="gender-glyph female">♀</span>
                        <div class="ancestor-id">
                            <div class="ancestor-species">{c.species}<span class="nick">· "Cinder"</span></div>
                            <div class="ancestor-meta">Mother · contributed HP + WGT mutations</div>
                        </div>
                        <span class="ancestor-lvl">376</span>
                        <span class="ancestor-muts">32 muts</span>
                    </a>
                </div>

                <!-- STAT GENEALOGY -->
                <div class="subhead">
                    <span class="num">2</span>Stat Genealogy
                    <span class="count">7 stats traced</span>
                </div>
                <div class="stat-geneology">
                    <div class="statg-header">
                        <span>Stat</span>
                        <span class="col-right">Base</span>
                        <span class="col-right">Mut</span>
                        <span>Source · Founder</span>
                    </div>

                    <a class="statg-row">
                        <span class="statg-label">HP</span>
                        <span class="statg-base">{getStat(c.baseStats, 'HP')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'HP') > 0} class:zero={getStat(c.mutations, 'HP') === 0}>{getStat(c.mutations, 'HP') > 0 ? `+${getStat(c.mutations, 'HP')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name male">⬡ "Onyx"</span>
                            <span class="meta">— HP founder · wild tame · 2026·01·15</span>
                        </span>
                    </a>

                    <a class="statg-row">
                        <span class="statg-label">STA</span>
                        <span class="statg-base">{getStat(c.baseStats, 'STA')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'STA') > 0} class:zero={getStat(c.mutations, 'STA') === 0}>{getStat(c.mutations, 'STA') > 0 ? `+${getStat(c.mutations, 'STA')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name female">⬡ "Sable"</span>
                            <span class="meta">— STA founder · wild tame · 2026·01·17</span>
                        </span>
                    </a>

                    <a class="statg-row">
                        <span class="statg-label">OXY</span>
                        <span class="statg-base">{getStat(c.baseStats, 'OXY')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'OXY') > 0} class:zero={getStat(c.mutations, 'OXY') === 0}>{getStat(c.mutations, 'OXY') > 0 ? `+${getStat(c.mutations, 'OXY')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name female">⬡ "Sable"</span>
                            <span class="meta">— same founder · STA/OXY paired</span>
                        </span>
                    </a>

                    <a class="statg-row">
                        <span class="statg-label">FOOD</span>
                        <span class="statg-base">{getStat(c.baseStats, 'FOOD')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'FOOD') > 0} class:zero={getStat(c.mutations, 'FOOD') === 0}>{getStat(c.mutations, 'FOOD') > 0 ? `+${getStat(c.mutations, 'FOOD')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name male">⬡ "Pyre"</span>
                            <span class="meta">— FOOD founder · wild tame · 2026·01·20</span>
                        </span>
                    </a>

                    <a class="statg-row">
                        <span class="statg-label">WGT</span>
                        <span class="statg-base">{getStat(c.baseStats, 'WGT')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'WGT') > 0} class:zero={getStat(c.mutations, 'WGT') === 0}>{getStat(c.mutations, 'WGT') > 0 ? `+${getStat(c.mutations, 'WGT')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name male">⬡ "Pyre"</span>
                            <span class="meta">— same founder · WGT/FOOD paired</span>
                        </span>
                    </a>

                    <a class="statg-row active-project">
                        <span class="statg-label">MEL</span>
                        <span class="statg-base">{getStat(c.baseStats, 'MEL')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'MEL') > 0} class:zero={getStat(c.mutations, 'MEL') === 0}>{getStat(c.mutations, 'MEL') > 0 ? `+${getStat(c.mutations, 'MEL')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name female">⬡ "Twilight"</span>
                            <span class="meta">— MEL founder · 2026·01·22</span>
                            <span class="active-flag">★ Stacking</span>
                        </span>
                    </a>

                    <a class="statg-row">
                        <span class="statg-label">CRA</span>
                        <span class="statg-base">{getStat(c.baseStats, 'CRA')}</span>
                        <span class="statg-mut" class:has={getStat(c.mutations, 'CRA') > 0} class:zero={getStat(c.mutations, 'CRA') === 0}>{getStat(c.mutations, 'CRA') > 0 ? `+${getStat(c.mutations, 'CRA')}` : '·'}</span>
                        <span class="statg-source">
                            <span class="arrow">↳</span>
                            <span class="name female">⬡ "Echo"</span>
                            <span class="meta">— CRA founder · 2026·01·25</span>
                        </span>
                    </a>
                </div>

                <!-- FOUNDERS -->
                <div class="subhead">
                    <span class="num">3</span>Founders
                    <span class="count">5 wild tames started this line</span>
                </div>
                <div class="founders-list">

                    <a class="founder">
                        <span class="founder-glyph">♂</span>
                        <div class="founder-id">
                            <div class="founder-name"><span class="titled">"Onyx"</span> the HP Founder</div>
                            <div class="founder-meta">{c.species} · wild lvl 145 · alive · combat-imprint</div>
                        </div>
                        <div>
                            <div class="founder-contrib">HP 70</div>
                            <div class="founder-tamed">26·01·15</div>
                        </div>
                    </a>

                    <a class="founder">
                        <span class="founder-glyph">♀</span>
                        <div class="founder-id">
                            <div class="founder-name"><span class="titled">"Sable"</span> the STA/OXY Founder</div>
                            <div class="founder-meta">{c.species} · wild lvl 138 · alive · retired to vault</div>
                        </div>
                        <div>
                            <div class="founder-contrib">STA 50 · OXY 20</div>
                            <div class="founder-tamed">26·01·17</div>
                        </div>
                    </a>

                    <a class="founder">
                        <span class="founder-glyph">♂</span>
                        <div class="founder-id">
                            <div class="founder-name"><span class="titled">"Pyre"</span> the FOOD/WGT Founder</div>
                            <div class="founder-meta">{c.species} · wild lvl 142 · alive</div>
                        </div>
                        <div>
                            <div class="founder-contrib">FOOD 35 · WGT 50</div>
                            <div class="founder-tamed">26·01·20</div>
                        </div>
                    </a>

                    <a class="founder">
                        <span class="founder-glyph">♀</span>
                        <div class="founder-id">
                            <div class="founder-name"><span class="titled">"Twilight"</span> the MEL Founder ★</div>
                            <div class="founder-meta">{c.species} · wild lvl 150 · alive · prime breeder</div>
                        </div>
                        <div>
                            <div class="founder-contrib">MEL 75</div>
                            <div class="founder-tamed">26·01·22</div>
                        </div>
                    </a>

                    <a class="founder deceased">
                        <span class="founder-glyph">♀</span>
                        <div class="founder-id">
                            <div class="founder-name"><span class="titled">"Echo"</span> the CRA Founder</div>
                            <div class="founder-meta">{c.species} · wild lvl 134 · deceased · gigaed</div>
                        </div>
                        <div>
                            <div class="founder-contrib">CRA 14</div>
                            <div class="founder-tamed">26·01·25</div>
                        </div>
                    </a>

                </div>
            </div>

            <!-- PROVENANCE / NOTES -->
            <div class="provenance">
                <div class="section-head">
                    <span class="pip" style="background:rgb(var(--cat-rgb));box-shadow:0 0 6px rgba(var(--cat-rgb),0.55)"></span>
                    Specimen Notes
                    <span class="rule"></span>
                </div>
                <div class="prov-grid">
                    <span class="key">Logged</span>     <span class="val">{new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} by <a href="/survivors/{data.owner.id}" class="accent">{ownerName}</a></span>
                    {#if c.server}
                        <span class="key">Server</span>     <span class="val tribe">{c.server}</span>
                    {/if}
                    <span class="key">Specimen ID</span> <span class="val">#{c.id}</span>
                    <span class="key">Level</span>      <span class="val">{c.level}</span>
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
            <span class="meta"><span class="num">3</span> hatched</span>
            <span class="rule"></span>
        </div>
        <div class="offspring-grid">

            <div class="offspring-card combat">
                <div class="offspring-top"><span>♀ Bloodline</span><span>3d ago</span></div>
                <div class="offspring-name">{c.species}</div>
                <div class="offspring-nick">"Howl" · <span class="gender female">♀</span></div>
                <div class="offspring-bottom">
                    <div class="offspring-lvl">388</div>
                    <div class="offspring-muts">39 muts</div>
                </div>
            </div>

            <div class="offspring-card combat">
                <div class="offspring-top"><span>♂ Bloodline</span><span>1w ago</span></div>
                <div class="offspring-name">{c.species}</div>
                <div class="offspring-nick">"Eclipse" · <span class="gender male">♂</span></div>
                <div class="offspring-bottom">
                    <div class="offspring-lvl">396</div>
                    <div class="offspring-muts">40 muts</div>
                </div>
            </div>

            <div class="offspring-card combat">
                <div class="offspring-top"><span>♂ Apex</span><span>2w ago</span></div>
                <div class="offspring-name">{c.species}</div>
                <div class="offspring-nick">"Tempest Jr" · <span class="gender male">♂</span></div>
                <div class="offspring-bottom">
                    <div class="offspring-lvl">408</div>
                    <div class="offspring-muts">41 muts</div>
                </div>
            </div>

        </div>
    </section>

    <!-- ═══════════ ACTIVITY ═══════════ -->
    <section class="section">
        <div class="section-head" style="margin-bottom:18px">
            <span class="pip"></span>
            Recent Activity
            <span class="rule"></span>
        </div>
        <div class="activity-feed">
            <div class="activity-row">
                <span class="activity-dot species"></span>
                <span class="activity-text">Bred offspring <span class="what">{c.species} "Howl"</span> · MEL mutation passed down</span>
                <span class="activity-time">3d ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot boss"></span>
                <span class="activity-text">Committed to <strong>Alpha Manticore</strong> war room by <span class="who">{ownerName}</span></span>
                <span class="activity-time">5d ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot species"></span>
                <span class="activity-text">Bred offspring <span class="what">{c.species} "Eclipse"</span> from <span class="who">Specter × Cinder</span> pairing</span>
                <span class="activity-time">1w ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot diamond"></span>
                <span class="activity-text">Pinned to <strong>Stacking Melee</strong> project · current {totalMuts} muts</span>
                <span class="activity-time">2w ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot species"></span>
                <span class="activity-text">Bred offspring <span class="what">{c.species} "Tempest Jr"</span> · first surviving offspring</span>
                <span class="activity-time">2w ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot trade"></span>
                <span class="activity-text">Removed from marketplace (was listed by mistake)</span>
                <span class="activity-time">6w ago</span>
            </div>
            <div class="activity-row">
                <span class="activity-dot species"></span>
                <span class="activity-text"><span class="who">{ownerName}</span> logged {c.species} "{c.name}" to vault · imprinted 100%</span>
                <span class="activity-time">9w ago</span>
            </div>
        </div>
    </section>

</div>

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
    --cat-rgb:          239,68,68; /* Roar is combat */
}

#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

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
    cursor: pointer;
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
.founder-name .gender.female { color: var(--tek-pink); margin-right: 4px; }
.founder-name .gender.male   { color: #60a5fa; margin-right: 4px; }
.founder-name .nick { color: var(--tek-text-dim); font-style: italic; margin-left: 3px; }
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
.offspring-card.combat { --cat-rgb: 239,68,68; }
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
.activity-text strong { color: var(--tek-blue); font-weight: 700; }
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

@media (max-width: 720px) {
    .stage { padding: 60px 14px 80px; }
    .artifact { width: 100%; max-width: 360px; height: 560px; }
    .ancestor { grid-template-columns: 18px 1fr auto; gap: 10px; padding: 7px 10px; }
    .ancestor-muts { display: none; }
}
</style>
