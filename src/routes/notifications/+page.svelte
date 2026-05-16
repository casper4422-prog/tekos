<script lang="ts">
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';
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

    type TabKey = 'all' | 'requests' | 'mentions' | 'boss' | 'trades' | 'badges';

    let notifs = $state<Notif[]>((data.notifs ?? []) as unknown as Notif[]);
    let tab = $state<TabKey>('all');
    let now = $state(Date.now());

    const nextWarRoom = data.nextWarRoom ?? null;

    // Tab membership predicates — keep in sync with the count derivations below.
    function inTab(n: Notif, t: TabKey): boolean {
        if (t === 'all') return true;
        if (t === 'requests') return n.type.includes('friend_request') || n.type === 'tribe_invite' || n.type === 'tribe_join_request';
        if (t === 'mentions') return n.type.includes('mention') || n.type === 'dm';
        if (t === 'boss') return n.type.includes('boss') || n.type.includes('warroom');
        if (t === 'trades') return n.type.includes('trade') || n.type.includes('offer');
        if (t === 'badges') return n.type.includes('badge');
        return true;
    }

    const filteredNotifs = $derived(notifs.filter(n => inTab(n, tab)));

    const unread = $derived(notifs.filter(n => !n.read).length);
    const totalCount = $derived(notifs.length);

    const counts = $derived.by(() => ({
        all: unread,
        requests: notifs.filter(n => inTab(n, 'requests')).length,
        mentions: notifs.filter(n => inTab(n, 'mentions')).length,
        boss: notifs.filter(n => inTab(n, 'boss')).length,
        trades: notifs.filter(n => inTab(n, 'trades')).length,
        badges: notifs.filter(n => inTab(n, 'badges')).length
    }));

    // Live boss countdown text derived from the nearest scheduled war room.
    const bossCountdownText = $derived.by(() => {
        if (!nextWarRoom) return '';
        let diff = Math.max(0, new Date(nextWarRoom.scheduledAt).getTime() - now);
        const d = Math.floor(diff / 86400000); diff -= d * 86400000;
        const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
        const m = Math.floor(diff / 60000);
        if (d > 0) return `${d}d ${h}h`;
        return `${h}h ${m}m`;
    });
    const bossCountdownUrgent = $derived.by(() => {
        if (!nextWarRoom) return false;
        const diffH = (new Date(nextWarRoom.scheduledAt).getTime() - now) / 3600000;
        return diffH > 0 && diffH < 24;
    });

    let canvasEl: HTMLCanvasElement | null = $state(null);

    async function markRead(id: number) {
        const target = notifs.find(n => n.id === id);
        if (!target || target.read) return;
        notifs = notifs.map(n => n.id === id ? { ...n, read: true } : n);
        const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => null);
        if (res?.ok) await invalidateAll();
    }

    async function markAllRead() {
        if (!notifs.some(n => !n.read)) return;
        notifs = notifs.map(n => ({ ...n, read: true }));
        const res = await fetch('/api/notifications/read-all', { method: 'PUT' }).catch(() => null);
        if (res?.ok) await invalidateAll();
    }

    // ---- Action handlers ----
    async function acceptFriend(n: Notif) {
        const p = n.payload ?? {};
        const fid = (p.friendshipId ?? p.requestId ?? p.id) as number | undefined;
        if (fid != null) {
            await fetch(`/api/friends/${fid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            }).catch(() => {});
        }
        markRead(n.id);
    }
    async function declineFriend(n: Notif) {
        const p = n.payload ?? {};
        const fid = (p.friendshipId ?? p.requestId ?? p.id) as number | undefined;
        if (fid != null) {
            await fetch(`/api/friends/${fid}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            }).catch(() => {});
        }
        markRead(n.id);
    }

    async function acceptTribeJoin(n: Notif) {
        const p = n.payload ?? {};
        const tribeId = p.tribeId as number | undefined;
        const requestId = (p.requestId ?? p.joinRequestId) as number | undefined;
        if (tribeId != null && requestId != null) {
            await fetch(`/api/tribes/${tribeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept', requestId })
            }).catch(() => {});
        }
        markRead(n.id);
    }
    async function declineTribeJoin(n: Notif) {
        const p = n.payload ?? {};
        const tribeId = p.tribeId as number | undefined;
        const requestId = (p.requestId ?? p.joinRequestId) as number | undefined;
        if (tribeId != null && requestId != null) {
            await fetch(`/api/tribes/${tribeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', requestId })
            }).catch(() => {});
        }
        markRead(n.id);
    }

    // ---- Link/href derivers for "go-to" actions ----
    function linkFor(n: Notif): { label: string; href: string } | null {
        const p = n.payload ?? {};
        switch (n.type) {
            case 'boss_invite':
            case 'boss_warroom':
            case 'warroom_scheduled':
            case 'warroom_invite': {
                const sessionId = (p.sessionId ?? p.warRoomId ?? p.roomId) as string | number | undefined;
                if (sessionId != null) return { label: 'Open Room', href: `/overseer/${sessionId}` };
                return { label: 'Open Tribe', href: '/tribe' };
            }
            case 'mention':
            case 'dm': {
                const userId = (p.fromUserId ?? p.userId ?? p.actorUserId) as string | number | undefined;
                if (userId != null) return { label: 'Reply', href: `/messages/${userId}` };
                return { label: 'Open Messages', href: '/messages' };
            }
            case 'trade_offer':
            case 'trade_accepted':
            case 'trade_completed': {
                const listingId = (p.listingId ?? p.tradeId) as string | number | undefined;
                if (listingId != null) return { label: 'View Trade', href: `/marketplace/${listingId}` };
                return { label: 'View Trade', href: '/marketplace' };
            }
            case 'badge_earned': {
                return { label: 'View Badge', href: '/badges' };
            }
            case 'tribe_accepted':
            case 'tribe_promoted':
            case 'tribe_demoted': {
                return { label: 'Open Tribe', href: '/tribe' };
            }
            case 'friend_accepted': {
                const userId = (p.actorUserId ?? p.fromUserId) as string | number | undefined;
                if (userId != null) return { label: 'Open Profile', href: `/profile/${userId}` };
                return null;
            }
        }
        if (n.type.includes('breeding') || n.type.includes('mutation') || n.type.includes('hatch')) {
            return { label: 'Open Project', href: '/breeding' };
        }
        return null;
    }

    // Map notification type to a CSS class category (matches preview rail colors)
    function categoryFor(t: string): string {
        if (t.includes('friend')) return 'request';
        if (t.includes('boss') || t.includes('warroom')) return 'boss';
        if (t.includes('trade') || t.includes('offer')) return 'trade';
        if (t === 'tribe_invite' || t === 'tribe_join_request') return 'request';
        if (t.includes('tribe')) return 'tribe';
        if (t.includes('mention') || t === 'dm') return 'mention';
        if (t.includes('badge')) return 'badge';
        if (t.includes('breeding') || t.includes('mutation') || t.includes('hatch')) return 'breeding';
        if (t.includes('system')) return 'system';
        return '';
    }

    // Map notification type to a lucide icon component (type-colored icons)
    function iconFor(t: string) {
        if (t.includes('friend')) return UserPlus;
        if (t.includes('boss') || t.includes('warroom')) return Sword;
        if (t.includes('trade') || t.includes('offer')) return Repeat2;
        if (t.includes('tribe')) return Shield;
        if (t.includes('mention') || t === 'dm') return AtSign;
        if (t.includes('badge')) return Award;
        if (t.includes('breeding') || t.includes('mutation') || t.includes('hatch')) return Sparkles;
        if (t.includes('system')) return Box;
        return Bell;
    }

    function titleFor(n: Notif): string {
        const p = n.payload ?? {};
        if (n.type === 'friend_request')   return `Friend request from ${p.fromName ?? 'a Survivor'}`;
        if (n.type === 'friend_accepted')  return `${p.acceptedBy ?? p.fromName ?? 'A Survivor'} accepted your friend request`;
        if (n.type === 'boss_invite')      return `Invited to fight ${p.bossName ?? 'a boss'}`;
        if (n.type === 'boss_warroom')     return `${p.bossName ?? 'Boss'} war room starts`;
        if (n.type === 'warroom_scheduled')return `${p.bossName ?? 'War room'} scheduled`;
        if (n.type === 'trade_offer')      return `New offer on your trade · ${p.species ?? ''}`;
        if (n.type === 'trade_accepted')   return `Your trade offer was accepted${p.species ? ' · ' + p.species : ''}`;
        if (n.type === 'tribe_invite')     return `Invited to ${p.tribeName ?? 'a tribe'}`;
        if (n.type === 'tribe_join_request') return `Join request from ${p.fromName ?? 'a Survivor'}`;
        if (n.type === 'tribe_accepted')   return `You joined ${p.tribeName ?? 'the tribe'}`;
        if (n.type === 'tribe_rejected')   return `Your join request to ${p.tribeName ?? 'the tribe'} was declined`;
        if (n.type === 'tribe_promoted')   return `Promoted to ${p.newRole ?? 'admin'} in ${p.tribeName ?? 'the tribe'}`;
        if (n.type === 'tribe_demoted')    return `Demoted to ${p.newRole ?? 'member'} in ${p.tribeName ?? 'the tribe'}`;
        if (n.type === 'tribe_kicked')     return `Removed from ${p.tribeName ?? 'the tribe'}`;
        if (n.type === 'badge_earned')     return `New badge earned · ${p.badge ?? 'Honor'}`;
        if (n.type === 'mention')          return `${p.fromName ?? 'Someone'} mentioned you${p.context ? ' in ' + p.context : ''}`;
        if (n.type === 'dm')               return `New message from ${p.fromName ?? 'a Survivor'}`;
        return n.type.replace(/_/g, ' ');
    }

    function bodyFor(n: Notif): string | undefined {
        const p = n.payload ?? {};
        if (n.type === 'friend_request')   return (p.message as string) || undefined;
        if (n.type === 'trade_offer')      return p.offerSummary as string;
        if (n.type === 'tribe_invite')     return `Tap to accept or decline.`;
        return p.message as string | undefined;
    }

    // Meta row data: { source, sourceClass, detail }
    function metaFor(n: Notif): { source?: string; sourceClass?: string; detail?: string } | null {
        const p = n.payload ?? {} as Record<string, unknown>;
        const meta: { source?: string; sourceClass?: string; detail?: string } = {};
        if (p.tribeName) {
            meta.source = `⌬ ${p.tribeName as string}`;
            meta.sourceClass = 'tribe';
        } else if (p.allyTribeName) {
            meta.source = `🤝 ${p.allyTribeName as string}`;
            meta.sourceClass = 'ally';
        } else if (p.source) {
            meta.source = String(p.source);
        }
        if (p.committed != null && p.required != null) {
            meta.detail = `${p.committed}/${p.required} committed`;
        } else if (p.bossName && (n.type.includes('warroom') || n.type === 'boss_warroom')) {
            meta.detail = String(p.bossName);
        } else if (p.replies != null) {
            meta.detail = `${p.replies} replies`;
        } else if (p.context) {
            meta.detail = String(p.context);
        } else if (p.detail) {
            meta.detail = String(p.detail);
        }
        if (!meta.source && !meta.detail) return null;
        return meta;
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
        for (const n of filteredNotifs) out[bucket(n.createdAt)].push(n);
        return out;
    });

    // Which notifications should show the boss countdown chip?
    function showsCountdown(n: Notif): boolean {
        if (!nextWarRoom) return false;
        if (n.type !== 'boss_invite' && n.type !== 'boss_warroom' && !n.type.includes('warroom')) return false;
        const p = n.payload ?? {};
        // Prefer matching by id, fall back to type-only.
        const matchesId = p.warRoomId === nextWarRoom.id || p.sessionId === nextWarRoom.id;
        const matchesBoss = typeof p.bossName === 'string' && p.bossName === nextWarRoom.bossName;
        return matchesId || matchesBoss || true; // accept all for visibility on boss-tier notifs
    }

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

            // Tick `now` every 30s so the live war-room countdown re-derives.
            intervalId = setInterval(() => { now = Date.now(); }, 30000);

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
        <button class="notif-tab" class:active={tab === 'all'} onclick={() => tab = 'all'}>
            All {#if counts.all > 0}<span class="count alert">{counts.all}</span>{/if}
        </button>
        <button class="notif-tab" class:active={tab === 'requests'} onclick={() => tab = 'requests'}>
            Requests {#if counts.requests > 0}<span class="count">{counts.requests}</span>{/if}
        </button>
        <button class="notif-tab" class:active={tab === 'mentions'} onclick={() => tab = 'mentions'}>
            Mentions {#if counts.mentions > 0}<span class="count">{counts.mentions}</span>{/if}
        </button>
        <button class="notif-tab" class:active={tab === 'boss'} onclick={() => tab = 'boss'}>
            Boss {#if counts.boss > 0}<span class="count">{counts.boss}</span>{/if}
        </button>
        <button class="notif-tab" class:active={tab === 'trades'} onclick={() => tab = 'trades'}>
            Trades {#if counts.trades > 0}<span class="count">{counts.trades}</span>{/if}
        </button>
        <button class="notif-tab" class:active={tab === 'badges'} onclick={() => tab = 'badges'}>
            Badges {#if counts.badges > 0}<span class="count">{counts.badges}</span>{/if}
        </button>
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
                        {@const meta = metaFor(n)}
                        {@const link = linkFor(n)}
                        <div
                            class="notif {cat}"
                            class:unread={!n.read}
                            role="button"
                            tabindex="0"
                            onclick={(e) => {
                                const tgt = e.target as HTMLElement;
                                if (tgt.closest('button') || tgt.closest('a')) return;
                                markRead(n.id);
                            }}
                            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') markRead(n.id); }}
                        >
                            <div class="notif-icon-wrap">
                                <Icon size={16} strokeWidth={2.2} />
                            </div>
                            <div class="notif-body">
                                <div class="notif-text">
                                    {titleFor(n)}{#if showsCountdown(n) && bossCountdownText}<span class="countdown-chip" class:urgent={bossCountdownUrgent}>{bossCountdownText}</span>{/if}
                                </div>
                                {#if bodyFor(n)}
                                    <div class="notif-sub">{bodyFor(n)}</div>
                                {/if}
                                {#if meta}
                                    <div class="notif-meta">
                                        {#if meta.source}<span class="source {meta.sourceClass ?? ''}">{meta.source}</span>{/if}
                                        {#if meta.source && meta.detail}<span class="sep">·</span>{/if}
                                        {#if meta.detail}<span>{meta.detail}</span>{/if}
                                    </div>
                                {/if}
                            </div>
                            <div class="notif-right">
                                <div class="notif-time">{relTime(n.createdAt)}</div>
                                <div class="notif-actions">
                                    {#if n.type === 'friend_request'}
                                        <button class="n-btn success" onclick={() => acceptFriend(n)}>Accept</button>
                                        <button class="n-btn ghost" onclick={() => declineFriend(n)}>Decline</button>
                                    {:else if n.type === 'tribe_join_request'}
                                        <button class="n-btn success" onclick={() => acceptTribeJoin(n)}>Accept</button>
                                        <button class="n-btn ghost" onclick={() => declineTribeJoin(n)}>Decline</button>
                                    {:else if n.type === 'tribe_invite'}
                                        <a class="n-btn primary" href="/tribe" onclick={() => markRead(n.id)}>Open Tribe ▸</a>
                                    {:else if link}
                                        <a class="n-btn primary" href={link.href} onclick={() => markRead(n.id)}>{link.label} ▸</a>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/each}

    {#if filteredNotifs.length === 0}
        <div class="empty-state">
            <Bell size={36} strokeWidth={1.4} />
            <div class="empty-title">No notifications</div>
            <div class="empty-sub">Nothing in this view right now.</div>
        </div>
    {/if}

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

.notif-sub {
    margin-top: 3px;
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    font-style: italic;
    line-height: 1.4;
}
.notif:not(.unread) .notif-sub { color: var(--tek-text-faint); }

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
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
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

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 60px 20px;
    color: var(--tek-text-faint);
    text-align: center;
}
.empty-title {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.empty-sub {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
}

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
