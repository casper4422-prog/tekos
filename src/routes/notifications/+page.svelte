<script lang="ts">
    import { onMount } from 'svelte';
    import { UserPlus, Sword, Repeat2, Shield, AtSign, Award, Sparkles, Box, Bell } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Notif = {
        id: number;
        type: string;
        payload: Record<string, unknown>;
        read: boolean;
        createdAt: string | Date;
    };

    let notifs = $state<Notif[]>((data.notifs ?? []) as unknown as Notif[]);

    const unread = $derived(notifs.filter(n => !n.read).length);
    const totalCount = $derived(notifs.length);

    let bossCountdownText = $state('5d 22h');
    let canvasEl: HTMLCanvasElement | null = $state(null);

    async function markRead(id: number) {
        const target = notifs.find(n => n.id === id);
        if (!target || target.read) return;
        notifs = notifs.map(n => n.id === id ? { ...n, read: true } : n);
        await fetch(`/api/notifications/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ read: true })
        }).catch(() => {});
    }

    async function markAllRead() {
        const targets = notifs.filter(n => !n.read);
        notifs = notifs.map(n => ({ ...n, read: true }));
        await Promise.all(
            targets.map(n => fetch(`/api/notifications/${n.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: true })
            }).catch(() => {}))
        );
    }

    // Map notification type to a CSS class category (matches preview rail colors)
    function categoryFor(t: string): string {
        if (t.includes('friend')) return 'request';
        if (t.includes('boss')) return 'boss';
        if (t.includes('trade') || t.includes('offer')) return 'trade';
        if (t.includes('tribe')) return 'tribe';
        if (t.includes('mention')) return 'mention';
        if (t.includes('badge')) return 'badge';
        if (t.includes('breeding') || t.includes('mutation') || t.includes('hatch')) return 'breeding';
        if (t.includes('system')) return 'system';
        return '';
    }

    // Map notification type to a lucide icon component (type-colored icons)
    function iconFor(t: string) {
        if (t.includes('friend')) return UserPlus;
        if (t.includes('boss')) return Sword;
        if (t.includes('trade') || t.includes('offer')) return Repeat2;
        if (t.includes('tribe')) return Shield;
        if (t.includes('mention')) return AtSign;
        if (t.includes('badge')) return Award;
        if (t.includes('breeding') || t.includes('mutation') || t.includes('hatch')) return Sparkles;
        if (t.includes('system')) return Box;
        return Bell;
    }

    function titleFor(n: Notif): string {
        const p = n.payload ?? {};
        if (n.type === 'friend_request')  return `Friend request from ${p.fromName ?? 'a Survivor'}`;
        if (n.type === 'friend_accept')   return `${p.fromName ?? 'A Survivor'} accepted your friend request`;
        if (n.type === 'boss_invite')     return `Invited to fight ${p.bossName ?? 'a boss'}`;
        if (n.type === 'trade_offer')     return `New offer on your trade · ${p.species ?? ''}`;
        if (n.type === 'tribe_invite')    return `Invited to ${p.tribeName ?? 'a tribe'}`;
        if (n.type === 'tribe_join_request') return `Join request from ${p.fromName ?? 'a Survivor'}`;
        if (n.type === 'badge_earned')    return `New badge earned · ${p.badge ?? 'Honor'}`;
        return n.type.replace(/_/g, ' ');
    }

    function bodyFor(n: Notif): string | undefined {
        const p = n.payload ?? {};
        if (n.type === 'friend_request')  return (p.message as string) || undefined;
        if (n.type === 'trade_offer')     return p.offerSummary as string;
        if (n.type === 'tribe_invite')    return `Tap to accept or decline.`;
        return p.message as string | undefined;
    }

    function relTime(d: string | Date) {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        const wks = Math.floor(days / 7);
        return `${wks}w`;
    }

    // Time grouping
    function bucket(d: string | Date): 'Today' | 'This Week' | 'Older' {
        const diff = Date.now() - new Date(d).getTime();
        const hrs = diff / 3600000;
        if (hrs < 24) return 'Today';
        if (hrs < 24 * 7) return 'This Week';
        return 'Older';
    }
    const grouped = $derived.by(() => {
        const out: { Today: Notif[]; 'This Week': Notif[]; Older: Notif[] } = { Today: [], 'This Week': [], Older: [] };
        for (const n of notifs) out[bucket(n.createdAt)].push(n);
        return out;
    });

    onMount(() => {
        // Hex canvas background
        const canvas = canvasEl;
        let rafId = 0;
        let intervalId: ReturnType<typeof setInterval> | undefined;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            const R = 32, W = R * Math.sqrt(3), H = R * 2;
            let phase = 0;
            function drawHex(x: number, y: number, opacity: number) {
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (Math.PI / 3) * i - Math.PI / 6;
                    const px = x + (R - 1) * Math.cos(a);
                    const py = y + (R - 1) * Math.sin(a);
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.strokeStyle = `rgba(0,180,255,${opacity})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
            function draw() {
                ctx.clearRect(0, 0, canvas!.width, canvas!.height);
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

            // Boss countdown chip
            const target = Date.now() + (5 * 86400 + 22 * 3600) * 1000;
            function tick() {
                let diff = Math.max(0, target - Date.now());
                const d = Math.floor(diff / 86400000); diff -= d * 86400000;
                const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
                const m = Math.floor(diff / 60000);
                if (d > 0) bossCountdownText = `${d}d ${h}h`;
                else       bossCountdownText = `${h}h ${m}m`;
            }
            tick();
            intervalId = setInterval(tick, 30000);

            return () => {
                cancelAnimationFrame(rafId);
                if (intervalId) clearInterval(intervalId);
                window.removeEventListener('resize', resize);
            };
        }
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Notifications</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">

    <div class="page-header">
        <div>
            <div class="page-title">Notifications</div>
            <div class="page-sub">
                <span class="prefix">›</span>
                <span class="num amber">{unread}</span> UNREAD · <span class="num">{totalCount}</span> TOTAL THIS WEEK
            </div>
        </div>
        <button class="mark-all-btn" onclick={markAllRead}>⬡ Mark All Read</button>
    </div>

    <div class="notif-tabs">
        <button class="notif-tab active">All <span class="count alert">{unread}</span></button>
        <button class="notif-tab">Requests <span class="count">{notifs.filter(n => n.type.includes('friend') || n.type.includes('tribe_join') || n.type.includes('tribe_invite')).length}</span></button>
        <button class="notif-tab">Mentions <span class="count">{notifs.filter(n => n.type.includes('mention')).length}</span></button>
        <button class="notif-tab">Boss</button>
        <button class="notif-tab">Trades <span class="count">{notifs.filter(n => n.type.includes('trade') || n.type.includes('offer')).length}</span></button>
        <button class="notif-tab">Badges</button>
    </div>

    {#each ['Today', 'This Week', 'Older'] as group}
        {#if grouped[group as 'Today' | 'This Week' | 'Older'].length > 0}
            <div class="time-section">
                <div class="time-header">
                    <span class="pip"></span>
                    {group}
                    <span class="rule"></span>
                </div>
                <div class="notif-list">
                    {#each grouped[group as 'Today' | 'This Week' | 'Older'] as n (n.id)}
                        {@const Icon = iconFor(n.type)}
                        {@const cat = categoryFor(n.type)}
                        <div
                            class="notif {cat}"
                            class:unread={!n.read}
                            role="button"
                            tabindex="0"
                            onclick={(e) => {
                                const tgt = e.target as HTMLElement;
                                if (tgt.tagName === 'BUTTON') return;
                                markRead(n.id);
                            }}
                            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') markRead(n.id); }}
                        >
                            <div class="notif-icon-wrap">
                                <Icon size={16} strokeWidth={2.2} />
                            </div>
                            <div class="notif-body">
                                <div class="notif-text">{titleFor(n)}{#if n.type === 'boss_invite'}<span class="countdown-chip">{bossCountdownText}</span>{/if}</div>
                                {#if bodyFor(n)}
                                    <div class="notif-meta"><span class="source">{bodyFor(n)}</span></div>
                                {/if}
                            </div>
                            <div class="notif-right">
                                <div class="notif-time">{relTime(n.createdAt)}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/each}

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
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(245,158,11,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 980px;
    margin: 0 auto;
}

.page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 22px;
    flex-wrap: wrap;
}
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
.page-sub .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }
.page-sub .num.amber { color: var(--tek-amber); text-shadow: 0 0 5px rgba(245,158,11,0.45); }

.mark-all-btn {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 8px 14px;
    background: rgba(0,180,255,0.06);
    border: 1px solid rgba(0,180,255,0.25);
    color: #7dd3fc;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
}
.mark-all-btn:hover { background: rgba(0,180,255,0.18); border-color: rgba(0,180,255,0.50); filter: drop-shadow(0 0 6px var(--tek-blue-glow)); }

/* Tabs */
.notif-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 22px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
}
.notif-tab {
    background: none;
    border: none;
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    padding: 11px 18px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.18s, border-color 0.18s;
    display: flex;
    align-items: center;
    gap: 7px;
    text-transform: uppercase;
}
.notif-tab:hover { color: var(--tek-text-dim); }
.notif-tab.active {
    color: var(--tek-blue);
    border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 7px var(--tek-blue-glow);
}
.notif-tab .count {
    background: rgba(0,180,255,0.12);
    color: #7dd3fc;
    border: 1px solid rgba(0,180,255,0.28);
    font-size: 0.58rem;
    font-weight: 800;
    border-radius: 99px;
    padding: 1px 7px;
    min-width: 22px;
    text-align: center;
}
.notif-tab.active .count { background: rgba(0,180,255,0.22); color: #fff; }
.notif-tab .count.alert {
    background: rgba(239,68,68,0.18);
    color: #fca5a5;
    border-color: rgba(239,68,68,0.40);
    animation: amber-pulse 1.8s ease-in-out infinite;
}
@keyframes amber-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }

/* Time-period section header */
.time-section { margin-bottom: 24px; }
.time-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.time-header .pip {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.time-header .rule {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(0,180,255,0.18), transparent);
}

/* Notification list */
.notif-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.notif {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 14px;
    align-items: center;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(10px);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 13px 18px 13px 22px;
    position: relative;
    transition: filter 0.22s ease, transform 0.18s ease;
    filter: drop-shadow(0 0 1px rgba(255,255,255,0.05)) drop-shadow(0 6px 16px rgba(0,0,0,0.30));
    cursor: pointer;
}
.notif:hover { transform: translateX(2px); }

/* Type rail */
.notif::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
    opacity: 0.4;
}
.notif.unread::before { opacity: 1; }
.notif.unread { background: linear-gradient(135deg, rgba(0,180,255,0.05) 0%, rgba(4,8,20,0.94) 100%); }
.notif.unread::after {
    content: '';
    position: absolute;
    right: 13px; top: 50%;
    transform: translateY(-50%);
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* Type categories */
.notif.request::before { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.55); }
.notif.mention::before { background: var(--tek-pink); box-shadow: 0 0 5px rgba(244,114,182,0.55); }
.notif.boss::before    { background: var(--tek-red); box-shadow: 0 0 5px rgba(239,68,68,0.55); }
.notif.trade::before   { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.55); }
.notif.badge::before   { background: #ffd700; box-shadow: 0 0 5px rgba(255,215,0,0.55); }
.notif.breeding::before{ background: #c084fc; box-shadow: 0 0 5px rgba(192,132,252,0.55); }
.notif.system::before  { background: var(--tek-text-faint); box-shadow: none; opacity: 0.5; }
.notif.tribe::before   { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.55); }

.notif-icon-wrap {
    width: 36px; height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.25);
    color: var(--tek-blue);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    flex-shrink: 0;
}
.notif-icon-wrap :global(svg) { width: 16px; height: 16px; }
.notif.request .notif-icon-wrap { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.35); color: #fcd34d; }
.notif.mention .notif-icon-wrap { background: rgba(244,114,182,0.10); border-color: rgba(244,114,182,0.35); color: #fbcfe8; }
.notif.boss .notif-icon-wrap    { background: rgba(239,68,68,0.10); border-color: rgba(239,68,68,0.35); color: #fca5a5; }
.notif.trade .notif-icon-wrap   { background: rgba(16,185,129,0.10); border-color: rgba(16,185,129,0.35); color: #86efac; }
.notif.badge .notif-icon-wrap   { background: rgba(255,215,0,0.10); border-color: rgba(255,215,0,0.45); color: #fde047; }
.notif.breeding .notif-icon-wrap{ background: rgba(192,132,252,0.10); border-color: rgba(192,132,252,0.35); color: #c4b5fd; }
.notif.system .notif-icon-wrap  { background: rgba(100,116,139,0.10); border-color: rgba(100,116,139,0.30); color: var(--tek-text-faint); }
.notif.tribe .notif-icon-wrap   { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.35); color: #fcd34d; }

.notif-body { min-width: 0; line-height: 1.45; padding-right: 16px; }
.notif-text {
    font-size: 0.88rem;
    color: var(--tek-text);
    line-height: 1.5;
}
.notif.unread .notif-text { color: #fff; }
.notif:not(.unread) .notif-text { color: var(--tek-text-dim); }
.notif:not(.unread) .notif-text :global(strong) { color: var(--tek-text-dim); }
.notif:not(.unread) .notif-text :global(.who) { color: var(--tek-text-faint); }
.notif-text :global(.who)    { color: #fcd34d; font-weight: 700; }
.notif-text :global(.what)   { color: #c4b5fd; font-weight: 600; }
.notif-text :global(.badge-name) { color: #fde047; font-weight: 700; }
.notif-text :global(.boss-name) { color: #fca5a5; font-weight: 700; }
.notif-text :global(strong)  { color: var(--tek-blue); font-weight: 700; }
.notif-text :global(.mention) { color: #7dd3fc; background: rgba(0,180,255,0.12); padding: 0 4px; border-radius: 3px; font-weight: 600; }

.notif-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.notif-meta .sep { color: var(--tek-text-faint); }
.notif-meta .source.tribe { color: var(--tek-amber); }
.notif-meta .source.ally  { color: #86efac; }

/* Right side: actions + time */
.notif-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
}
.notif-time {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    white-space: nowrap;
}
.notif.unread .notif-time { color: var(--tek-blue); }
.notif-actions {
    display: flex;
    gap: 5px;
}
.n-btn {
    font-family: inherit;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 5px 11px;
    border: none;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: filter 0.18s, background 0.18s;
    white-space: nowrap;
}
.n-btn.primary {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    filter: drop-shadow(0 0 5px rgba(0,180,255,0.40));
}
.n-btn.primary:hover { filter: drop-shadow(0 0 10px rgba(0,180,255,0.75)); }
.n-btn.success {
    background: rgba(16,185,129,0.18);
    border: 1px solid rgba(16,185,129,0.45);
    color: #86efac;
}
.n-btn.success:hover { background: rgba(16,185,129,0.30); filter: drop-shadow(0 0 5px rgba(16,185,129,0.40)); }
.n-btn.ghost {
    background: transparent;
    color: var(--tek-text-faint);
    border: 1px solid rgba(255,255,255,0.08);
}
.n-btn.ghost:hover { color: var(--tek-text-dim); border-color: rgba(255,255,255,0.20); }

/* Countdown badge for boss timer notifications */
.countdown-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.42);
    color: #fca5a5;
    font-family: var(--tek-display);
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.10em;
    padding: 3px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    margin-left: 6px;
    text-shadow: 0 0 6px rgba(239,68,68,0.45);
    font-variant-numeric: tabular-nums;
}
.countdown-chip.urgent { animation: amber-pulse 1.4s ease-in-out infinite; }

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
    .notif { grid-template-columns: 32px 1fr; }
    .notif-right { grid-column: 2; align-items: flex-start; flex-direction: row; align-items: center; }
    .notif.unread::after { right: 10px; }
}
</style>
