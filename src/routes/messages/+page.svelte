<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Convo = {
        userId: number;
        nickname: string | null;
        discordName: string | null;
        lastMessage: string;
        lastAt: string | Date;
        unread: number;
    };
    const convos = $derived(data.convos as Convo[]);

    let activeTab = $state<'all' | 'unread' | 'pinned'>('all');
    let search = $state('');
    let hexCanvas: HTMLCanvasElement;

    function displayName(c: Convo) { return c.nickname ?? c.discordName ?? 'Survivor'; }
    function initialOf(c: Convo) { return (displayName(c).charAt(0) ?? '?').toUpperCase(); }

    function relTime(d: string | Date) {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        const weeks = Math.floor(days / 7);
        return `${weeks}w`;
    }

    const filteredConvos = $derived.by(() => {
        let list = convos;
        if (activeTab === 'unread') list = list.filter(c => c.unread > 0);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(c => displayName(c).toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
        }
        return list;
    });

    const totalCount = $derived(convos.length);
    const unreadCount = $derived(convos.filter(c => c.unread > 0).length);
    const totalUnread = $derived(convos.reduce((s, c) => s + c.unread, 0));

    onMount(() => {
        if (!hexCanvas) return;
        const ctx = hexCanvas.getContext('2d');
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
            ctx!.clearRect(0, 0, hexCanvas.width, hexCanvas.height);
            const cw = hexCanvas.width, ch = hexCanvas.height;
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
            hexCanvas.width = window.innerWidth;
            hexCanvas.height = window.innerHeight;
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
    <title>⬡ TEKOS — Messages</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

    <div class="page-header">
        <div>
            <div class="page-title">Messages</div>
            <div class="page-sub">
                <span class="prefix">›</span>
                <span class="num">{totalCount}</span> CONVERSATIONS · <span class="num green">{unreadCount}</span> WITH UNREAD · <span class="num">{totalUnread}</span> UNREAD
            </div>
        </div>
    </div>

    <div class="messages-app">

        <!-- ═══════════ CONVERSATION LIST ═══════════ -->
        <aside class="pane list-pane">
            <div class="list-pane-head">
                <div class="list-search">
                    <svg class="list-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="text" class="list-search-input" placeholder="Search messages…" bind:value={search} />
                </div>
                <div class="list-tabs">
                    <button class="list-tab" class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>All <span class="count">{totalCount}</span></button>
                    <button class="list-tab" class:active={activeTab === 'unread'} onclick={() => activeTab = 'unread'}>Unread <span class="count">{unreadCount}</span></button>
                    <button class="list-tab" class:active={activeTab === 'pinned'} onclick={() => activeTab = 'pinned'}>Pinned <span class="count">0</span></button>
                </div>
            </div>

            <div class="convo-list">
                {#if filteredConvos.length === 0}
                    <div class="empty-state">
                        <div class="empty-title">No conversations</div>
                        <div class="empty-flavor">"Find a Survivor in Network and tap message."</div>
                    </div>
                {:else}
                    {#each filteredConvos as c (c.userId)}
                        <a class="convo" class:unread={c.unread > 0} href="/messages/{c.userId}">
                            <div class="convo-avatar">
                                <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="2"/><text x="50" y="74" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{initialOf(c)}</text></svg>
                                <div class="pip" class:online={c.unread > 0}></div>
                            </div>
                            <div class="convo-body">
                                <div class="convo-name">{displayName(c)}</div>
                                <div class="convo-preview">{c.lastMessage}</div>
                            </div>
                            <div class="convo-right">
                                <div class="convo-time">{relTime(c.lastAt)}</div>
                                {#if c.unread > 0}
                                    <div class="convo-badge">{c.unread}</div>
                                {/if}
                            </div>
                        </a>
                    {/each}
                {/if}
            </div>
        </aside>

    </div>
</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:global(html), :global(body) {
    overflow-x: hidden;
}
:global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.08) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    height: 100vh;
    padding: 56px 24px 24px;
    max-width: 1380px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;
    flex-shrink: 0;
}
.page-title {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
    line-height: 1;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .num { color: var(--tek-blue); font-weight: 700; }
.page-sub .num.green { color: var(--tek-green); }

/* ═════════════════════════════════════════════════════════════════════════
   MAIN — messages layout
   ═════════════════════════════════════════════════════════════════════════ */
.messages-app {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    min-height: 0;
    max-width: 480px;
}
@media (max-width: 860px) {
    .messages-app { max-width: 100%; }
}

.pane {
    background: linear-gradient(160deg, rgba(10,18,44,0.88) 0%, rgba(4,8,20,0.96) 100%);
    backdrop-filter: blur(14px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.20)) drop-shadow(0 12px 30px rgba(0,0,0,0.50));
}
.pane::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   LIST PANE
   ═════════════════════════════════════════════════════════════════════════ */
.list-pane-head {
    padding: 14px 16px 12px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
}
.list-search { position: relative; margin-bottom: 10px; }
.list-search-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 8px 12px 8px 34px;
    font-family: inherit;
    font-size: 0.82rem;
    outline: none;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: border-color 0.2s;
}
.list-search-input::placeholder { color: var(--tek-text-faint); }
.list-search-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); }
.list-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-text-faint);
    pointer-events: none;
}

.list-tabs {
    display: flex;
    gap: 5px;
}
.list-tab {
    background: none;
    border: 1px solid transparent;
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    padding: 4px 9px;
    cursor: pointer;
    text-transform: uppercase;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
}
.list-tab:hover { color: var(--tek-text-dim); }
.list-tab.active { background: var(--tek-blue); color: #001a2e; }
.list-tab .count {
    margin-left: 4px;
    background: rgba(0,0,0,0.30);
    padding: 0 5px;
    border-radius: 99px;
    font-size: 0.54rem;
}

.convo-list {
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.convo-list::-webkit-scrollbar { width: 5px; }
.convo-list::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.convo {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 16px 10px 14px;
    cursor: pointer;
    transition: background 0.18s;
    border-left: 2px solid transparent;
    position: relative;
    text-decoration: none;
    color: inherit;
}
.convo:hover { background: rgba(0,180,255,0.04); }
.convo.active {
    background: linear-gradient(90deg, rgba(0,180,255,0.10) 0%, rgba(0,180,255,0.02) 100%);
    border-left-color: var(--tek-blue);
}
.convo-avatar { width: 36px; height: 40px; position: relative; flex-shrink: 0; }
.convo-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 4px rgba(0,180,255,0.30)); }
.convo-avatar .pip {
    position: absolute;
    bottom: 2px; right: -1px;
    width: 9px; height: 9px;
    border-radius: 50%;
    background: var(--tek-text-faint);
    border: 2px solid #050812;
}
.convo-avatar .pip.online { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.65); }

.convo-body { min-width: 0; line-height: 1.35; }
.convo-name {
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.convo.unread .convo-name { color: #fff; }
.convo-preview {
    font-size: 0.76rem;
    color: var(--tek-text-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
}
.convo.unread .convo-preview { color: var(--tek-text); font-weight: 500; }

.convo-right { text-align: right; line-height: 1.2; }
.convo-time {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    white-space: nowrap;
}
.convo.unread .convo-time { color: var(--tek-blue); }
.convo-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 17px;
    height: 17px;
    background: var(--tek-blue);
    color: #001a2e;
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 800;
    border-radius: 99px;
    padding: 0 5px;
    margin-top: 3px;
    box-shadow: 0 0 5px var(--tek-blue-glow);
}

.empty-state {
    padding: 40px 20px;
    text-align: center;
}
.empty-title {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 6px;
}
.empty-flavor {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-faint);
    font-style: italic;
}

.bottom-note {
    position: fixed;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    white-space: nowrap;
}

@media (max-width: 720px) {
    .stage { padding: 50px 12px 16px; }
}
</style>
