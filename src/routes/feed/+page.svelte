<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let canvas = $state<HTMLCanvasElement | null>(null);

    function displayName(u: { nickname: string | null; email: string }) {
        return u.nickname ?? u.email.split('@')[0];
    }

    function relTime(d: Date | string) {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return new Date(d).toLocaleDateString();
    }

    function eventKindClass(type: string): string {
        if (type === 'creature_add') return 'breeding';
        if (type === 'boss_record') return 'boss';
        if (type === 'trade_open') return 'trade';
        if (type === 'badge_earned') return 'badge';
        return '';
    }

    function eventAvatarLetter(name: string): string {
        return (name?.[0] ?? '?').toUpperCase();
    }

    function eventTypeGlyph(type: string): string {
        if (type === 'creature_add') return '🧬';
        if (type === 'boss_record') return '⚔';
        if (type === 'trade_open') return '⇆';
        if (type === 'badge_earned') return '⬢';
        return '⬡';
    }

    function eventText(e: { type: string; data: unknown; user: { nickname: string | null; email: string } }): string {
        const d = (e.data ?? {}) as Record<string, unknown>;
        const name = displayName(e.user);
        if (e.type === 'creature_add') return `${name} logged ${d.name ?? d.species ?? 'a specimen'}`;
        if (e.type === 'boss_record') return `${name} ${d.outcome === 'success' ? 'beat' : 'fought'} ${d.bossName ?? 'a boss'}`;
        if (e.type === 'trade_open') return `${name} listed ${d.species ?? 'a trade'} on the Marketplace`;
        if (e.type === 'badge_earned') return `${name} earned ${d.badge ?? 'a badge'}`;
        return `${name} — ${e.type}`;
    }

    onMount(() => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let raf = 0;
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
            raf = requestAnimationFrame(draw);
        }
        function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize();
        draw();
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    });

    // Source chip toggle (Global tab)
    let activeSources = $state<Record<string, boolean>>({
        twitter: true,
        youtube: true,
        instagram: true,
        reddit: true,
        sta: true,
        wildcard: true,
        twitch: false
    });
    function toggleSource(key: string) {
        activeSources[key] = !activeSources[key];
    }
</script>

<svelte:head>
    <title>⬡ TEKOS — Feed</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<canvas id="tekHexCanvas" bind:this={canvas}></canvas>

<div class="stage">

    <div class="page-header">
        <div class="page-title">Feed</div>
        <div class="page-sub">
            <span class="prefix">›</span>
            <span class="num">{data.events.length}</span> EVENTS · <span class="num">{data.friendCount}</span> FOLLOWING
        </div>
    </div>

    <!-- Single live feed driven by ActivityEvent rows from the load function -->
    <div class="tab-content active">
        <div class="feed">
            {#if data.events.length === 0}
                <div style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);padding:32px 0;text-align:center;">
                    No activity yet. Log a specimen, beat a boss, or earn a badge — events show up here.
                </div>
            {:else}
                {#each data.events as e (e.id)}
                    <div class="feed-event {eventKindClass(e.type)}">
                        <div class="feed-avatar">
                            <svg viewBox="0 0 100 110">
                                <polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="2"/>
                                <text x="50" y="74" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{eventAvatarLetter(displayName(e.user))}</text>
                            </svg>
                            <span class="type-glyph">{eventTypeGlyph(e.type)}</span>
                        </div>
                        <div class="feed-body">
                            <div class="feed-text">{eventText(e)}</div>
                            <div class="feed-meta"><span class="source">⬡ network</span></div>
                        </div>
                        <div class="feed-time">{relTime(e.createdAt)}</div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:root {
    --tek-bg: #050812;
    --tek-blue: #00b4ff;
    --tek-blue-dim: rgba(0, 180, 255, 0.12);
    --tek-blue-border: rgba(0, 180, 255, 0.30);
    --tek-blue-glow: rgba(0, 180, 255, 0.50);
    --tek-purple: #8b5cf6;
    --tek-amber: #f59e0b;
    --tek-green: #10b981;
    --tek-red: #ef4444;
    --tek-pink: #f472b6;
    --tek-text: #e2e8f0;
    --tek-text-dim: #64748b;
    --tek-text-faint: #334155;
    --tek-font: 'Inter', system-ui, sans-serif;
    --tek-display: 'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(html), :global(body) {
    background: var(--tek-bg); color: var(--tek-text);
    font-family: var(--tek-font);
    min-height: 100vh; overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}
:global(body)::before {
    content: ''; position: fixed; inset: 0;
    background-image:
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.10) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none; z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 1080px;
    margin: 0 auto;
}

.page-header { margin-bottom: 22px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 900; letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.30));
    line-height: 1; margin-bottom: 4px;
}
.page-sub {
    font-family: var(--tek-mono); font-size: 0.72rem;
    letter-spacing: 0.22em; color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

/* Scope tabs */
.scope-tabs {
    display: flex; gap: 0; margin-bottom: 18px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
}
.scope-tab {
    background: none; border: none; color: var(--tek-text-faint);
    font-family: var(--tek-mono); font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.18em; padding: 11px 22px; cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.18s, border-color 0.18s;
    display: flex; align-items: center; gap: 7px;
    text-transform: uppercase;
}
.scope-tab:hover { color: var(--tek-text-dim); }
.scope-tab.active {
    color: var(--tek-blue); border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}

/* Tab content switching */
.tab-content { display: none; }
.tab-content.active { display: block; animation: tab-fade-in 0.3s ease; }
@keyframes tab-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Filter chips (used in multiple places) */
.filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 22px; }
.chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-dim); font-family: var(--tek-mono);
    font-size: 0.64rem; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; padding: 5px 10px; cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s; font-family: inherit;
}
.chip:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.40); }
.chip.active { background: var(--tek-blue); color: #001a2e; border-color: var(--tek-blue); }
.chip .glyph { font-size: 0.7rem; }

/* ═════════════════════════════════════════════════════════════════════════
   FEED EVENT (shared by Following / Tribe / Server)
   ═════════════════════════════════════════════════════════════════════════ */
.feed { display: flex; flex-direction: column; gap: 8px; }
.feed-event {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 14px; align-items: flex-start;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(10px);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 13px 18px 13px 20px; position: relative;
    transition: transform 0.18s ease, filter 0.22s ease;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.18)) drop-shadow(0 6px 18px rgba(0,0,0,0.35));
    cursor: pointer;
}
.feed-event:hover { transform: translateX(3px); filter: drop-shadow(0 0 2px rgba(0,180,255,0.50)) drop-shadow(0 10px 22px rgba(0,0,0,0.50)); }
.feed-event::before {
    content: ''; position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px; background: var(--tek-blue); box-shadow: 0 0 5px var(--tek-blue-glow);
}
.feed-event.breeding::before { background: #c084fc; box-shadow: 0 0 5px rgba(192,132,252,0.6); }
.feed-event.badge::before    { background: #ffd700; box-shadow: 0 0 5px rgba(255,215,0,0.6); }
.feed-event.boss::before     { background: var(--tek-red); box-shadow: 0 0 5px rgba(239,68,68,0.6); }
.feed-event.trade::before    { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.feed-event.tribe::before    { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.6); }
.feed-event.market::before   { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.6); }
.feed-event.diamond::before  { background: var(--tek-blue); box-shadow: 0 0 6px var(--tek-blue-glow); }
.feed-event.admin::before    { background: var(--tek-red); box-shadow: 0 0 5px rgba(239,68,68,0.6); }
.feed-event.server::before   { background: #06b6d4; box-shadow: 0 0 5px rgba(6,182,212,0.6); }

.feed-avatar { width: 36px; height: 40px; position: relative; flex-shrink: 0; }
.feed-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 4px rgba(0,180,255,0.30)); }
.feed-avatar .type-glyph {
    position: absolute; bottom: -2px; right: -3px;
    width: 16px; height: 16px; border-radius: 50%;
    background: #050812; display: flex; align-items: center; justify-content: center;
    font-size: 0.62rem; color: var(--tek-text);
    box-shadow: 0 0 0 2px var(--tek-bg);
}
.feed-event.breeding .type-glyph { color: #c084fc; }
.feed-event.badge .type-glyph    { color: #ffd700; }
.feed-event.boss .type-glyph     { color: var(--tek-red); }
.feed-event.trade .type-glyph    { color: var(--tek-green); }
.feed-event.tribe .type-glyph    { color: var(--tek-amber); }
.feed-event.market .type-glyph   { color: var(--tek-amber); }
.feed-event.diamond .type-glyph  { color: var(--tek-blue); }
.feed-event.admin .type-glyph    { color: var(--tek-red); }
.feed-event.server .type-glyph   { color: #06b6d4; }

.feed-body { min-width: 0; line-height: 1.5; }
.feed-text { font-size: 0.88rem; color: var(--tek-text); line-height: 1.5; }
.feed-text .who    { color: #fcd34d; font-weight: 700; }
.feed-text .who.you{ color: #7dd3fc; }
.feed-text .who.alpha { color: #ffd700; }
.feed-text .what   { color: #c4b5fd; font-weight: 600; }
.feed-text .badge  { color: #fde047; font-weight: 700; }
.feed-text .boss   { color: #fca5a5; font-weight: 700; }
.feed-text .tribe  { color: var(--tek-amber); font-weight: 600; }
.feed-text strong  { color: var(--tek-blue); font-weight: 700; }
.feed-text .map    { color: #67e8f9; font-weight: 700; font-family: var(--tek-mono); }
.feed-meta {
    font-family: var(--tek-mono); font-size: 0.6rem;
    letter-spacing: 0.10em; color: var(--tek-text-faint);
    text-transform: uppercase; margin-top: 4px;
}
.feed-meta .sep { color: var(--tek-text-faint); margin: 0 6px; }
.feed-meta .source { color: var(--tek-text-dim); }
.feed-meta .source.tribe { color: var(--tek-amber); }
.feed-meta .source.ally  { color: #86efac; }
.feed-meta .source.map   { color: #67e8f9; }

.feed-time {
    font-family: var(--tek-mono); font-size: 0.62rem;
    letter-spacing: 0.10em; color: var(--tek-text-faint);
    text-transform: uppercase; white-space: nowrap;
    align-self: flex-start; padding-top: 3px;
}

.date-divider {
    display: flex; align-items: center; gap: 14px;
    margin: 12px 0 4px;
    font-family: var(--tek-mono); font-size: 0.6rem;
    letter-spacing: 0.22em; color: var(--tek-text-faint); text-transform: uppercase;
}
.date-divider::before, .date-divider::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
}

.feed-event.diamond { background: linear-gradient(135deg, rgba(0,180,255,0.06) 0%, rgba(139,92,246,0.06) 100%); }
.feed-event.diamond .feed-text strong { color: #7dd3fc; text-shadow: 0 0 6px var(--tek-blue-glow); }
.feed-event.admin { background: linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(4,8,20,0.94) 100%); }

/* ═════════════════════════════════════════════════════════════════════════
   SERVER TAB — cluster card + server sub-cards
   ═════════════════════════════════════════════════════════════════════════ */
.section-head {
    display: flex; align-items: center; gap: 12px;
    margin: 0 0 14px;
    font-family: var(--tek-mono); font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.22em; text-transform: uppercase; color: var(--tek-text-dim);
}
.section-head .pip {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--tek-blue); box-shadow: 0 0 7px var(--tek-blue-glow);
}
.section-head .pip.cyan { background: #06b6d4; box-shadow: 0 0 7px rgba(6,182,212,0.7); }
.section-head .rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,180,255,0.18), transparent); }
.section-head .count { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }
.section-head .action {
    font-family: var(--tek-mono); font-size: 0.62rem; font-weight: 700;
    letter-spacing: 0.16em; color: var(--tek-text-faint); text-decoration: none;
    background: none; border: none; cursor: pointer; text-transform: uppercase;
    transition: color 0.18s;
}
.section-head .action:hover { color: var(--tek-blue); }
.section-head .action .arrow { color: var(--tek-blue); margin-left: 4px; }

.cluster-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 20px 24px 18px 26px; margin-bottom: 14px;
    filter: drop-shadow(0 0 1px rgba(6,182,212,0.30)) drop-shadow(0 10px 24px rgba(0,0,0,0.40));
}
.cluster-card::before {
    content: ''; position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px; background: #06b6d4; box-shadow: 0 0 7px rgba(6,182,212,0.55);
}
.cluster-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; margin-bottom: 14px; flex-wrap: wrap;
}
.cluster-info { line-height: 1.3; }
.cluster-name {
    font-family: var(--tek-display); font-size: 1.2rem; font-weight: 800;
    letter-spacing: 0.10em; text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #67e8f9 70%, rgba(6,182,212,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(6,182,212,0.30));
    margin-bottom: 4px;
}
.cluster-stats {
    font-family: var(--tek-mono); font-size: 0.66rem;
    letter-spacing: 0.10em; color: var(--tek-text-dim); text-transform: uppercase;
}
.cluster-stats .stat { color: #67e8f9; font-weight: 700; text-shadow: 0 0 5px rgba(6,182,212,0.5); }
.cluster-stats .sep { color: var(--tek-text-faint); margin: 0 6px; }
.cluster-stats .live-pip {
    display: inline-block; width: 7px; height: 7px;
    border-radius: 50%; background: var(--tek-green);
    box-shadow: 0 0 6px rgba(16,185,129,0.7);
    margin-right: 5px; vertical-align: middle;
    animation: live-pulse 2s ease-in-out infinite;
}
@keyframes live-pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

.cluster-actions { display: flex; gap: 6px; flex-shrink: 0; }
.cluster-btn {
    background: rgba(6,182,212,0.10); border: 1px solid rgba(6,182,212,0.35);
    color: #67e8f9; font-family: inherit;
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; padding: 6px 12px; cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
}
.cluster-btn:hover { background: rgba(6,182,212,0.22); filter: drop-shadow(0 0 6px rgba(6,182,212,0.40)); }
.cluster-btn.danger { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: #fca5a5; }
.cluster-btn.danger:hover { background: rgba(239,68,68,0.20); }

.server-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}
@media (max-width: 720px) { .server-grid { grid-template-columns: 1fr; } }

.server-card {
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.04);
    border-left: 2px solid rgba(6,182,212,0.45);
    padding: 11px 14px;
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    transition: all 0.18s; cursor: pointer;
}
.server-card:hover { border-left-color: #06b6d4; background: rgba(6,182,212,0.04); }
.server-card.offline { border-left-color: rgba(239,68,68,0.45); opacity: 0.65; }
.server-card.offline:hover { border-left-color: var(--tek-red); }

.server-card-top {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
}
.server-card-name {
    font-family: var(--tek-mono); font-size: 0.8rem; font-weight: 700;
    color: var(--tek-text); letter-spacing: 0.06em;
}
.server-card-status {
    display: inline-flex; align-items: center; gap: 4px;
    font-family: var(--tek-mono); font-size: 0.56rem;
    letter-spacing: 0.18em; text-transform: uppercase;
}
.server-card-status.online  { color: #86efac; }
.server-card-status.offline { color: #fca5a5; }
.server-card-status .pip { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 4px currentColor; }
.server-card-meta {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    font-family: var(--tek-mono); font-size: 0.62rem;
    color: var(--tek-text-dim); letter-spacing: 0.06em;
}
.server-card-meta .lbl { font-size: 0.5rem; letter-spacing: 0.18em; color: var(--tek-text-faint); text-transform: uppercase; }
.server-card-meta .val { color: var(--tek-text-dim); font-weight: 600; }
.server-card-meta .val.players { color: #67e8f9; text-shadow: 0 0 4px rgba(6,182,212,0.40); }

.add-cluster-card {
    background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
    border: 1.5px dashed rgba(6,182,212,0.30);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 18px; margin-bottom: 22px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    cursor: pointer; transition: all 0.18s;
}
.add-cluster-card:hover {
    background: linear-gradient(160deg, rgba(6,182,212,0.06) 0%, rgba(4,8,20,0.55) 100%);
    border-color: rgba(6,182,212,0.60);
}
.add-cluster-card .glyph {
    font-family: var(--tek-display); font-size: 1.6rem; color: #06b6d4;
    filter: drop-shadow(0 0 8px rgba(6,182,212,0.5));
}
.add-cluster-card .lbl {
    font-family: var(--tek-mono); font-size: 0.74rem;
    letter-spacing: 0.18em; color: var(--tek-text-dim); text-transform: uppercase;
}
.add-cluster-card:hover .lbl { color: #67e8f9; }

/* ═════════════════════════════════════════════════════════════════════════
   GLOBAL TAB — news source aggregation
   ═════════════════════════════════════════════════════════════════════════ */
.source-row {
    display: flex; gap: 6px; flex-wrap: wrap;
    margin-bottom: 22px;
    align-items: center;
}
.source-row-label {
    font-family: var(--tek-mono); font-size: 0.58rem;
    letter-spacing: 0.20em; color: var(--tek-text-faint);
    text-transform: uppercase; margin-right: 8px;
}
.source-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim); font-family: var(--tek-mono);
    font-size: 0.62rem; font-weight: 700; letter-spacing: 0.14em;
    text-transform: uppercase; padding: 5px 10px; cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s; font-family: inherit;
}
.source-chip .platform-dot {
    width: 7px; height: 7px; border-radius: 50%;
}
.source-chip:hover { color: var(--tek-text); border-color: rgba(255,255,255,0.18); }
.source-chip.active { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.25); color: var(--tek-text); }

.source-chip.twitter .platform-dot   { background: #1da1f2; box-shadow: 0 0 5px rgba(29,161,242,0.6); }
.source-chip.youtube .platform-dot   { background: #ff0000; box-shadow: 0 0 5px rgba(255,0,0,0.6); }
.source-chip.instagram .platform-dot { background: #e1306c; box-shadow: 0 0 5px rgba(225,48,108,0.6); }
.source-chip.reddit .platform-dot    { background: #ff4500; box-shadow: 0 0 5px rgba(255,69,0,0.6); }
.source-chip.sta .platform-dot       { background: #10b981; box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.source-chip.wildcard .platform-dot  { background: #8b5cf6; box-shadow: 0 0 5px rgba(139,92,246,0.6); }
.source-chip.twitch .platform-dot    { background: #9146ff; box-shadow: 0 0 5px rgba(145,70,255,0.6); }

.source-chip.add {
    border-style: dashed; border-color: rgba(0,180,255,0.30); color: var(--tek-text-faint);
}
.source-chip.add:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.60); }

/* News items */
.news-feed { display: flex; flex-direction: column; gap: 10px; }
.news-item {
    display: grid;
    grid-template-columns: 38px 1fr;
    gap: 14px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(10px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 14px 18px 14px 22px;
    position: relative;
    transition: transform 0.18s ease, filter 0.22s ease;
    filter: drop-shadow(0 0 1px rgba(255,255,255,0.07)) drop-shadow(0 6px 18px rgba(0,0,0,0.35));
    cursor: pointer;
}
.news-item:hover { transform: translateX(3px); filter: drop-shadow(0 0 2px rgba(0,180,255,0.40)) drop-shadow(0 10px 22px rgba(0,0,0,0.50)); }
.news-item::before {
    content: ''; position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px; background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.news-item.twitter::before   { background: #1da1f2; box-shadow: 0 0 5px rgba(29,161,242,0.6); }
.news-item.youtube::before   { background: #ff0000; box-shadow: 0 0 5px rgba(255,0,0,0.6); }
.news-item.instagram::before { background: #e1306c; box-shadow: 0 0 5px rgba(225,48,108,0.6); }
.news-item.reddit::before    { background: #ff4500; box-shadow: 0 0 5px rgba(255,69,0,0.6); }
.news-item.sta::before       { background: #10b981; box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.news-item.wildcard::before  { background: #8b5cf6; box-shadow: 0 0 5px rgba(139,92,246,0.6); }
.news-item.twitch::before    { background: #9146ff; box-shadow: 0 0 5px rgba(145,70,255,0.6); }

.news-platform {
    width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; flex-shrink: 0;
    font-family: var(--tek-display); font-size: 0.86rem; font-weight: 800;
    margin-top: 2px;
}
.news-item.twitter   .news-platform { background: rgba(29,161,242,0.15);  border: 1px solid rgba(29,161,242,0.40);  color: #67c8f5; }
.news-item.youtube   .news-platform { background: rgba(255,0,0,0.12);     border: 1px solid rgba(255,0,0,0.40);     color: #ff6b6b; }
.news-item.instagram .news-platform { background: rgba(225,48,108,0.15);  border: 1px solid rgba(225,48,108,0.40);  color: #f48fb1; }
.news-item.reddit    .news-platform { background: rgba(255,69,0,0.15);    border: 1px solid rgba(255,69,0,0.40);    color: #ff8a4c; }
.news-item.sta       .news-platform { background: rgba(16,185,129,0.15);  border: 1px solid rgba(16,185,129,0.40);  color: #86efac; }
.news-item.wildcard  .news-platform { background: rgba(139,92,246,0.15);  border: 1px solid rgba(139,92,246,0.40);  color: #c4b5fd; }
.news-item.twitch    .news-platform { background: rgba(145,70,255,0.15);  border: 1px solid rgba(145,70,255,0.40);  color: #c9a3ff; }

.news-body { min-width: 0; }
.news-header {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 5px;
    font-family: var(--tek-mono); font-size: 0.62rem;
    letter-spacing: 0.10em; text-transform: uppercase;
}
.news-header .platform-name { color: var(--tek-text-dim); font-weight: 700; }
.news-item.twitter   .news-header .platform-name { color: #67c8f5; }
.news-item.youtube   .news-header .platform-name { color: #ff6b6b; }
.news-item.instagram .news-header .platform-name { color: #f48fb1; }
.news-item.reddit    .news-header .platform-name { color: #ff8a4c; }
.news-item.sta       .news-header .platform-name { color: #86efac; }
.news-item.wildcard  .news-header .platform-name { color: #c4b5fd; }
.news-item.twitch    .news-header .platform-name { color: #c9a3ff; }
.news-header .author { color: var(--tek-text); font-weight: 600; }
.news-header .sep { color: var(--tek-text-faint); }
.news-header .time { color: var(--tek-text-faint); margin-left: auto; white-space: nowrap; }

.news-title {
    font-size: 0.95rem;
    color: var(--tek-text);
    font-weight: 600;
    line-height: 1.4;
    margin-bottom: 6px;
}
.news-excerpt {
    font-size: 0.82rem;
    color: var(--tek-text-dim);
    line-height: 1.55;
    margin-bottom: 8px;
}
.news-excerpt .hashtag { color: #67c8f5; }
.news-excerpt strong { color: var(--tek-text); }

/* Video thumbnail */
.video-thumb {
    margin-top: 6px;
    background:
        radial-gradient(ellipse 60% 50% at 30% 40%, rgba(255,0,0,0.18) 0%, transparent 60%),
        linear-gradient(135deg, rgba(20,12,12,0.95) 0%, rgba(8,4,4,0.99) 100%);
    height: 130px;
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    display: flex; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
}
.video-thumb::before {
    content: ''; position: absolute; inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(255,0,0,0.04) 0 1px, transparent 1px 24px),
        repeating-linear-gradient(-60deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 24px);
}
.video-thumb-play {
    width: 50px; height: 50px;
    border-radius: 50%; background: rgba(255,0,0,0.20);
    border: 2px solid #ff6b6b;
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
    box-shadow: 0 0 18px rgba(255,0,0,0.40);
}
.video-thumb-play svg { width: 18px; height: 18px; margin-left: 3px; color: #ff6b6b; }
.video-duration {
    position: absolute; bottom: 7px; right: 9px;
    font-family: var(--tek-mono); font-size: 0.62rem; font-weight: 700;
    background: rgba(0,0,0,0.75); color: #fff;
    padding: 2px 6px; border-radius: 3px;
    z-index: 2;
}

.news-engage {
    display: flex; align-items: center; gap: 14px;
    margin-top: 8px;
    font-family: var(--tek-mono); font-size: 0.6rem;
    color: var(--tek-text-faint); letter-spacing: 0.06em;
}
.news-engage .stat { display: inline-flex; align-items: center; gap: 4px; }
.news-engage .stat .num { color: var(--tek-text-dim); font-weight: 700; }
.news-engage .open-btn {
    margin-left: auto;
    background: rgba(0,180,255,0.08); border: 1px solid rgba(0,180,255,0.25);
    color: #7dd3fc; font-family: inherit; font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.14em; padding: 4px 10px; cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s; text-transform: uppercase;
}
.news-engage .open-btn:hover { background: rgba(0,180,255,0.20); filter: drop-shadow(0 0 6px var(--tek-blue-glow)); }

.bottom-note {
    position: fixed; bottom: 14px;
    left: 50%; transform: translateX(-50%);
    font-family: var(--tek-mono); font-size: 0.6rem;
    letter-spacing: 0.18em; color: var(--tek-text-faint);
    white-space: nowrap;
}

@media (max-width: 720px) {
    .stage { padding: 60px 14px 80px; }
    .feed-event { grid-template-columns: 32px 1fr; }
    .feed-time { grid-column: 2; }
}
</style>
