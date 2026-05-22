<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import type { PageData } from './$types';
    import NetworkPanel from '$lib/components/NetworkPanel.svelte';
    import SurvivorsPanel from '$lib/components/SurvivorsPanel.svelte';
    import MessagesPanel from '$lib/components/MessagesPanel.svelte';

    let { data }: { data: PageData } = $props();

    type TabId = 'network' | 'messages' | 'survivors';
    let activeTab = $state<TabId>('network');

    // Sync activeTab with ?tab= so back/forward and deep-links work.
    $effect(() => {
        const t = $page.url.searchParams.get('tab');
        if (t === 'messages' || t === 'survivors') activeTab = t;
        else activeTab = 'network';
    });

    function setTab(t: TabId) {
        activeTab = t;
        const url = new URL(window.location.href);
        if (t === 'network') url.searchParams.delete('tab');
        else url.searchParams.set('tab', t);
        history.pushState({}, '', url);
    }

    const onlineFriends = $derived(data.friends.filter(f => f.online));
    const totalCount   = $derived(data.friends.length);
    const onlineCount  = $derived(onlineFriends.length);
    const pendingCount = $derived(data.incoming.length);
    const unreadTotal  = $derived((data.convos ?? []).reduce((s, c) => s + c.unread, 0));

    let canvasEl: HTMLCanvasElement | null = $state(null);

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
        function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
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
    <title>⬡ TEKOS — Network</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet" />
</svelte:head>

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">

    <div class="page-header">
        <div>
            <div class="page-title">Network</div>
            <div class="page-sub">
                <span class="prefix">›</span>
                {#if activeTab === 'network'}
                    <span class="stat-num">{totalCount}</span> SURVIVORS LINKED · <span class="stat-num green">{onlineCount}</span> ONLINE NOW · <span class="stat-num">{pendingCount}</span> PENDING
                {:else if activeTab === 'messages'}
                    <span class="stat-num">{(data.convos ?? []).length}</span> CONVERSATIONS · <span class="stat-num green">{unreadTotal}</span> UNREAD
                {:else}
                    BROWSE EVERY SURVIVOR ON THE NETWORK
                {/if}
            </div>
        </div>
    </div>

    <div class="tab-strip">
        <button class="tab" class:active={activeTab === 'network'} onclick={() => setTab('network')}>
            <span class="tab-glyph">⬢</span>
            <span>Network</span>
            {#if pendingCount > 0}<span class="tab-badge amber">{pendingCount}</span>{/if}
        </button>
        <button class="tab" class:active={activeTab === 'messages'} onclick={() => setTab('messages')}>
            <span class="tab-glyph">✉</span>
            <span>Messages</span>
            {#if unreadTotal > 0}<span class="tab-badge blue">{unreadTotal}</span>{/if}
        </button>
        <button class="tab" class:active={activeTab === 'survivors'} onclick={() => setTab('survivors')}>
            <span class="tab-glyph">⬡</span>
            <span>Survivors</span>
        </button>
    </div>

    {#if activeTab === 'network'}
        <NetworkPanel {data} />
    {:else if activeTab === 'messages'}
        <MessagesPanel convos={data.convos ?? []} myId={data.myId} />
    {:else}
        <SurvivorsPanel />
    {/if}

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

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

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(html), :global(body) {
    background: var(--tek-bg);
    color: var(--tek-text);
    font-family: var(--tek-font);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}
:global(body::before) {
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
    max-width: 1320px;
    margin: 0 auto;
}

.page-header { margin-bottom: 22px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.30));
    line-height: 1;
    margin-bottom: 4px;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .stat-num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }
.page-sub .stat-num.green { color: var(--tek-green); text-shadow: 0 0 5px rgba(16,185,129,0.5); }

/* Tab strip */
.tab-strip {
    display: flex;
    gap: 6px;
    margin-bottom: 28px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 11px 16px 13px;
    cursor: pointer;
    position: relative;
    transition: color 0.18s;
}
.tab:hover { color: var(--tek-text); }
.tab .tab-glyph { font-size: 0.85rem; opacity: 0.6; }
.tab.active { color: var(--tek-blue); }
.tab.active .tab-glyph { opacity: 1; }
.tab.active::after {
    content: '';
    position: absolute;
    left: 8px; right: 8px;
    bottom: -1px;
    height: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.tab-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    font-family: var(--tek-display);
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    background: rgba(245,158,11,0.18);
    color: #fcd34d;
    border: 1px solid rgba(245,158,11,0.40);
}
.tab-badge.blue { background: rgba(0,180,255,0.18); color: #7dd3fc; border-color: rgba(0,180,255,0.40); }

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
    .stage { padding: 60px 14px 80px; }
    .tab { padding: 10px 12px 12px; font-size: 0.7rem; letter-spacing: 0.14em; }
}
</style>
