<script lang="ts">
    import { Bell, Check, UserPlus, Sword, Repeat2, Activity, Shield } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';

    let { data }: { data: PageData } = $props();

    type Notif = {
        id: number;
        type: string;
        payload: Record<string, unknown>;
        read: boolean;
        createdAt: string | Date;
    };

    let notifs = $state<Notif[]>(data.notifs as unknown as Notif[]);
    const unread = $derived(notifs.filter(n => !n.read).length);

    async function markRead(id: number) {
        await fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(() => {});
        notifs = notifs.map(n => n.id === id ? { ...n, read: true } : n);
    }

    async function markAllRead() {
        const targets = notifs.filter(n => !n.read);
        await Promise.all(
            targets.map(n => fetch(`/api/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => {}))
        );
        notifs = notifs.map(n => ({ ...n, read: true }));
    }

    function iconFor(t: string) {
        if (t.includes('friend')) return UserPlus;
        if (t.includes('boss'))   return Sword;
        if (t.includes('trade') || t.includes('offer')) return Repeat2;
        if (t.includes('tribe'))  return Shield;
        return Activity;
    }
    function colorFor(t: string): 'blue' | 'amber' | 'green' | 'purple' | 'red' {
        if (t.includes('friend')) return 'blue';
        if (t.includes('boss'))   return 'amber';
        if (t.includes('trade') || t.includes('offer')) return 'purple';
        if (t.includes('tribe'))  return 'purple';
        if (t.includes('error') || t.includes('fail')) return 'red';
        return 'green';
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
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(d).toLocaleDateString();
    }

    // Time grouping
    function bucket(d: string | Date): 'Today' | 'This Week' | 'Older' {
        const diff = Date.now() - new Date(d).getTime();
        const hrs = diff / 3600000;
        if (hrs < 24) return 'Today';
        if (hrs < 24 * 7) return 'This Week';
        return 'Older';
    }
    const grouped = $derived(() => {
        const out: { Today: Notif[]; 'This Week': Notif[]; Older: Notif[] } = { Today: [], 'This Week': [], Older: [] };
        for (const n of notifs) out[bucket(n.createdAt)].push(n);
        return out;
    });
</script>

<svelte:head>
    <title>⬡ TekOS — Notifications</title>
</svelte:head>

<div class="tek-stage">
    <div class="head-row">
        <PageHeader
            title="Notifications"
            crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Notifications' }]}
            sub={notifs.length > 0
                ? `${unread} unread of ${notifs.length} total`
                : 'No alerts yet — the wild is quiet.'}
            subMono={true}
        />
        {#if unread > 0}
            <button class="tek-btn-v2 ghost" onclick={markAllRead}>
                <Check size={12} strokeWidth={2.5} />
                MARK ALL READ
            </button>
        {/if}
    </div>

    {#if notifs.length === 0}
        <div class="tek-empty">
            <div class="icon"><Bell size={26} strokeWidth={1.5} /></div>
            <div class="title">No notifications</div>
            <div class="flavor">"Your inbox is clear, Survivor."</div>
        </div>
    {:else}
        {#each ['Today', 'This Week', 'Older'] as group}
            {#if grouped()[group as 'Today' | 'This Week' | 'Older'].length > 0}
                <div class="group-section">
                    <div class="group-label">{group}</div>
                    <div class="notif-list">
                        {#each grouped()[group as 'Today' | 'This Week' | 'Older'] as n (n.id)}
                            {@const Icon = iconFor(n.type)}
                            {@const color = colorFor(n.type)}
                            <div class="notif {color}" class:unread={!n.read} onclick={() => markRead(n.id)} role="button" tabindex="0">
                                <div class="notif-icon"><Icon size={16} strokeWidth={2} /></div>
                                <div class="notif-body">
                                    <div class="notif-title">{titleFor(n)}</div>
                                    {#if bodyFor(n)}<div class="notif-body-text">{bodyFor(n)}</div>{/if}
                                </div>
                                <div class="notif-meta">
                                    <div class="notif-time">{relTime(n.createdAt)}</div>
                                    {#if !n.read}<div class="unread-dot"></div>{/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        {/each}
    {/if}
</div>

<style>
.head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.head-row :global(.tek-page-header) { margin-bottom: 0; }

.group-section { margin-bottom: 24px; }
.group-label {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 10px;
    padding-left: 2px;
}

.notif-list { display: flex; flex-direction: column; gap: 6px; }

.notif {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 13px 16px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
}
.notif:hover { border-color: var(--tek-blue-border); background: rgba(10,18,44,0.7); }
.notif.unread {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border-color: rgba(0,180,255,0.30);
}
.notif.unread::before {
    content: '';
    position: absolute;
    left: 0; top: 13px; bottom: 13px;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.notif.unread.blue::before   { background: var(--tek-blue); box-shadow: 0 0 5px var(--tek-blue-glow); }
.notif.unread.amber::before  { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.5); }
.notif.unread.green::before  { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.5); }
.notif.unread.purple::before { background: var(--tek-purple); box-shadow: 0 0 5px rgba(139,92,246,0.5); }
.notif.unread.red::before    { background: var(--tek-red); box-shadow: 0 0 5px rgba(239,68,68,0.5); }

.notif-icon {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    border-radius: 4px;
    color: var(--tek-blue);
    flex-shrink: 0;
}
.notif.amber .notif-icon  { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.30); color: var(--tek-amber); }
.notif.green .notif-icon  { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.30); color: var(--tek-green); }
.notif.purple .notif-icon { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.30); color: var(--tek-purple); }
.notif.red .notif-icon    { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.30); color: var(--tek-red); }

.notif-body { flex: 1; min-width: 0; }
.notif-title {
    font-size: 0.92rem;
    color: var(--tek-text);
    font-weight: 500;
}
.notif.unread .notif-title { font-weight: 600; }
.notif-body-text {
    margin-top: 4px;
    font-size: 0.82rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}

.notif-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
}
.notif-time {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.unread-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
</style>
