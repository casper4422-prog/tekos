<script lang="ts">
    import { Dna, Repeat2, Sword, Activity, Users, Globe, Server } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    let { data }: { data: PageData } = $props();

    type FeedTab = 'all' | 'following' | 'tribe' | 'server' | 'global';
    let activeTab = $state<FeedTab>('all');

    // Combine events into a unified timeline
    type UnifiedEvent = {
        id: string;
        kind: 'specimen' | 'boss' | 'trade' | 'activity';
        userId: number;
        userName: string;
        ts: Date;
        text: string;
        subtext?: string;
        link?: string;
    };

    function displayName(u: { nickname: string | null; email: string }) {
        return u.nickname ?? u.email.split('@')[0];
    }

    const unified = $derived<UnifiedEvent[]>([
        ...data.events.map(e => {
            const d = e.data as Record<string, unknown>;
            const kind = e.type === 'creature_add' ? 'specimen'
                       : e.type === 'boss_record' ? 'boss'
                       : e.type === 'trade_open' ? 'trade'
                       : 'activity';
            return {
                id: `ev-${e.id}`,
                kind: kind as UnifiedEvent['kind'],
                userId: e.userId,
                userName: displayName(e.user),
                ts: e.createdAt,
                text: kind === 'specimen' ? `logged ${d.name ?? 'a specimen'} · ${d.species ?? '?'}`
                    : kind === 'boss' ? `${d.outcome === 'success' ? 'defeated' : 'fought'} ${d.bossName ?? 'a boss'}`
                    : kind === 'trade' ? `listed ${d.species ?? 'a trade'} on the Marketplace`
                    : (e.type ?? 'did something'),
                subtext: typeof d.level === 'number' ? `LVL ${d.level}` : undefined
            };
        }),
        ...data.bossRecords.map(b => ({
            id: `boss-${b.id}`,
            kind: 'boss' as const,
            userId: b.userId,
            userName: displayName(b.user),
            ts: b.createdAt,
            text: `${b.outcome === 'success' ? 'defeated' : 'fought'} ${b.bossName}`,
            subtext: `${b.difficulty?.toUpperCase()} TIER`
        })),
        ...data.recentTrades.map(t => {
            const d = t.creatureData as Record<string, unknown> | null;
            return {
                id: `trade-${t.id}`,
                kind: 'trade' as const,
                userId: t.userId,
                userName: displayName(t.user),
                ts: t.createdAt,
                text: `listed ${d?.species ?? 'a trade'}${d?.name ? ` · ${d.name}` : ''}`,
                subtext: t.price ? `${t.price}` : undefined,
                link: `/marketplace`
            };
        })
    ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()));

    const filtered = $derived(
        activeTab === 'all' || activeTab === 'following' ? unified : []
    );

    function relTime(d: Date | string) {
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
</script>

<svelte:head>
    <title>⬡ TekOS — Feed</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Feed"
        crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Feed' }]}
        sub="What's happening across your network, your tribe, and the wild."
    />

    <!-- Tabs -->
    <div class="tek-tabs">
        <button class="tek-tab" class:active={activeTab === 'all'} onclick={() => activeTab = 'all'}>
            <Activity size={14} strokeWidth={2} /> All
            <span class="count">{unified.length}</span>
        </button>
        <button class="tek-tab" class:active={activeTab === 'following'} onclick={() => activeTab = 'following'}>
            <Users size={14} strokeWidth={2} /> Following
            <span class="count">{data.friendCount}</span>
        </button>
        <button class="tek-tab" class:active={activeTab === 'tribe'} onclick={() => activeTab = 'tribe'}>
            <Sword size={14} strokeWidth={2} /> Tribe
        </button>
        <button class="tek-tab" class:active={activeTab === 'server'} onclick={() => activeTab = 'server'}>
            <Server size={14} strokeWidth={2} /> Server
        </button>
        <button class="tek-tab" class:active={activeTab === 'global'} onclick={() => activeTab = 'global'}>
            <Globe size={14} strokeWidth={2} /> Global
        </button>
    </div>

    {#if activeTab === 'all' || activeTab === 'following'}
        {#if filtered.length === 0}
            <div class="tek-empty">
                <div class="icon"><Activity size={26} strokeWidth={1.5} /></div>
                <div class="title">Feed is quiet</div>
                <div class="flavor">"The wild is still. Add friends and log specimens to fill the network signal."</div>
            </div>
        {:else}
            <div class="feed-stream">
                {#each filtered as e (e.id)}
                    <article class="feed-event {e.kind}">
                        <HexAvatar name={e.userName} size={40} showPip={false} />
                        <div class="event-body">
                            <div class="event-line">
                                <a class="event-user" href="/survivors/{e.userId}">{e.userName}</a>
                                <span class="event-text">{e.text}</span>
                            </div>
                            <div class="event-meta">
                                <span class="event-kind">
                                    {#if e.kind === 'specimen'}<Dna size={11} strokeWidth={2} />{' '}SPECIMEN
                                    {:else if e.kind === 'boss'}<Sword size={11} strokeWidth={2} />{' '}BOSS
                                    {:else if e.kind === 'trade'}<Repeat2 size={11} strokeWidth={2} />{' '}TRADE
                                    {:else}<Activity size={11} strokeWidth={2} />{' '}ACTIVITY
                                    {/if}
                                </span>
                                {#if e.subtext}<span class="event-sub">· {e.subtext}</span>{/if}
                                <span class="event-time">· {relTime(e.ts)}</span>
                            </div>
                        </div>
                    </article>
                {/each}
            </div>
        {/if}
    {:else if activeTab === 'tribe'}
        <div class="tek-empty">
            <div class="icon"><Sword size={26} strokeWidth={1.5} /></div>
            <div class="title">Tribe feed</div>
            <div class="flavor">"Wired to the activity stream of your tribe — coming soon."</div>
        </div>
    {:else if activeTab === 'server'}
        <div class="tek-empty">
            <div class="icon"><Server size={26} strokeWidth={1.5} /></div>
            <div class="title">Server feed</div>
            <div class="flavor">"Configure your cluster in Settings → Cluster to pipe in live server events via RCON."</div>
        </div>
    {:else if activeTab === 'global'}
        <div class="tek-empty">
            <div class="icon"><Globe size={26} strokeWidth={1.5} /></div>
            <div class="title">Global feed</div>
            <div class="flavor">"ARK news from Wildcard, content creators, and the broader community — coming soon."</div>
        </div>
    {/if}
</div>

<style>
.feed-stream { display: flex; flex-direction: column; gap: 8px; }

.feed-event {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 18px;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.12);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    transition: all 0.15s;
    position: relative;
}
.feed-event:hover {
    border-color: var(--tek-blue-border);
    transform: translateX(2px);
}
.feed-event::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 14px;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.feed-event.boss::before    { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.5); }
.feed-event.trade::before   { background: var(--tek-purple); box-shadow: 0 0 5px rgba(139,92,246,0.5); }
.feed-event.activity::before { background: var(--tek-text-faint); }

.event-body { flex: 1; min-width: 0; }
.event-line { line-height: 1.4; }
.event-user {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--tek-text);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-right: 8px;
}
.event-user:hover { color: var(--tek-blue); }
.event-text { color: var(--tek-text-dim); font-size: 0.92rem; }
.event-meta {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.event-kind {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--tek-blue);
    text-shadow: 0 0 5px var(--tek-blue-glow);
}
.feed-event.boss .event-kind  { color: var(--tek-amber); text-shadow: 0 0 5px rgba(245,158,11,0.5); }
.feed-event.trade .event-kind { color: var(--tek-purple); text-shadow: 0 0 5px rgba(139,92,246,0.5); }
.event-sub { color: var(--tek-text-dim); }
.event-time { color: var(--tek-text-faint); margin-left: auto; }
</style>
