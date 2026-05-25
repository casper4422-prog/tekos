<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();


    // Single-dimension filter
    let scope = $state<'all' | 'following' | 'tribe' | 'server' | 'global' | 'news'>('all');

    // News tab platform toggles (Twitter / YouTube / Reddit / Steam / etc.)
    let activeSources = $state<Record<string, boolean>>({
        twitter: true,
        youtube: true,
        reddit: true,
        steam: true,
        sta: true,
        wildcard: true,
        twitch: false
    });
    function toggleSource(key: string) {
        activeSources[key] = !activeSources[key];
    }

    import { RECOMMENDED_SOURCES } from '$lib/recommendedSources';

    type Friend = { nickname: string | null; discordName?: string | null; id?: number };

    function displayName(u: Friend) {
        return u.nickname ?? u.discordName ?? 'Unknown survivor';
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

    function dayBucketLabel(d: Date | string): string {
        const date = new Date(d);
        const today = new Date(); today.setHours(0,0,0,0);
        const target = new Date(date); target.setHours(0,0,0,0);
        const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    function eventKindClass(type: string): string {
        if (type === 'creature_add') return 'breeding';
        if (type === 'boss_record' || type === 'boss' || type === 'boss_fight') return 'boss';
        if (type === 'trade_open' || type === 'trade') return 'trade';
        if (type === 'badge_earned') return 'badge';
        return '';
    }

    function eventAvatarLetter(name: string): string {
        return (name?.[0] ?? '?').toUpperCase();
    }

    function eventTypeGlyph(type: string): string {
        if (type === 'creature_add') return '🧬';
        if (type === 'boss_record' || type === 'boss' || type === 'boss_fight') return '⚔';
        if (type === 'trade_open' || type === 'trade') return '⇆';
        if (type === 'badge_earned') return '⬢';
        return '⬡';
    }

    // Unified feed item shape
    type FeedItem = {
        id: string;
        kind: 'activity' | 'boss' | 'trade';
        type: string;
        createdAt: Date | string;
        user: Friend;
        data: Record<string, unknown>;
        metadata: Record<string, unknown>;
    };

    function meta(d: Record<string, unknown>): Record<string, unknown> {
        const m = (d?.metadata ?? {}) as Record<string, unknown>;
        return m && typeof m === 'object' ? m : {};
    }

    // Merge events + bossRecords + recentTrades into one stream
    const mergedItems = $derived.by<FeedItem[]>(() => {
        const out: FeedItem[] = [];
        for (const e of data.events ?? []) {
            out.push({
                id: `e-${e.id}`,
                kind: 'activity',
                type: e.type,
                createdAt: e.createdAt,
                user: e.user,
                data: (e.data ?? {}) as Record<string, unknown>,
                metadata: meta((e.data ?? {}) as Record<string, unknown>)
            });
        }
        for (const b of data.bossRecords ?? []) {
            out.push({
                id: `b-${b.id}`,
                kind: 'boss',
                type: 'boss_record',
                createdAt: b.createdAt,
                user: b.user,
                data: { bossName: b.bossName, outcome: b.outcome, mapName: b.mapName, difficulty: b.difficulty },
                metadata: { serverCode: b.mapName ?? null }
            });
        }
        for (const t of data.recentTrades ?? []) {
            const tdata = (t.creatureData ?? {}) as Record<string, unknown>;
            out.push({
                id: `t-${t.id}`,
                kind: 'trade',
                type: 'trade_open',
                createdAt: t.createdAt,
                user: t.user,
                data: { species: tdata.species ?? tdata.name ?? 'a trade', price: t.price, wanted: t.wanted },
                metadata: (t.metadata ?? {}) as Record<string, unknown>
            });
        }
        out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return out;
    });

    const friendIdSet = $derived(new Set(data.friendIds ?? []));
    const tribeMateIdSet = $derived(new Set(data.tribeMateIds ?? []));
    const networkIdSet = $derived(new Set([...(data.friendIds ?? []), ...(data.myUserId != null ? [data.myUserId] : [])]));

    function inScope(it: FeedItem): boolean {
        if (scope === 'news') return true;
        const uid = (it.user as { id?: number }).id;
        if (scope === 'all') return uid != null && networkIdSet.has(uid);
        if (scope === 'following') return uid != null && friendIdSet.has(uid);
        if (scope === 'tribe') return uid != null && tribeMateIdSet.has(uid);
        if (scope === 'server') {
            const code = (it.metadata.serverCode ?? '') as string;
            return !!data.myServerCode && code === data.myServerCode;
        }
        if (scope === 'global') return true; // every event from every user
        return true;
    }

    const visibleItems = $derived.by<FeedItem[]>(() =>
        mergedItems.filter(inScope)
    );

    // Group visible items by day with divider rows
    type Row = { kind: 'divider'; label: string; key: string } | { kind: 'item'; item: FeedItem; key: string };

    const groupedRows = $derived.by<Row[]>(() => {
        const rows: Row[] = [];
        let lastLabel = '';
        for (const it of visibleItems) {
            const label = dayBucketLabel(it.createdAt);
            if (label !== lastLabel) {
                rows.push({ kind: 'divider', label, key: `d-${label}-${rows.length}` });
                lastLabel = label;
            }
            rows.push({ kind: 'item', item: it, key: it.id });
        }
        return rows;
    });

    function eventText(it: FeedItem): string {
        const d = it.data;
        const name = displayName(it.user);
        if (it.type === 'creature_add') return `${name} logged ${d.name ?? d.species ?? 'a specimen'}`;
        if (it.type === 'boss_record' || it.type === 'boss_fight') return `${name} ${d.outcome === 'success' ? 'beat' : 'fought'} ${d.bossName ?? 'a boss'}`;
        if (it.type === 'trade_open') return `${name} listed ${d.species ?? 'a trade'} on the Marketplace`;
        if (it.type === 'badge_earned') return `${name} earned ${d.badge ?? 'a badge'}`;
        return `${name} — ${it.type.replace(/_/g, ' ')}`;
    }

    function eventHref(it: FeedItem): string {
        if (it.type === 'creature_add') {
            const id = (it.data.creatureId ?? it.data.id) as number | undefined;
            return id ? `/specimens/${id}` : '/specimens';
        }
        if (it.type === 'boss_fight' || it.type === 'boss_record') return '/overseer';
        if (it.type === 'trade_open' || it.type === 'trade_list') return '/marketplace';
        if (it.type === 'badge_earned') return '/badges';
        return '#';
    }

    function metaLine(it: FeedItem): string {
        const m = it.metadata;
        const serverCode = (m.serverCode ?? 'network') as string;
        const tribe = (m.tribe ?? '—') as string;
        return `⬡ ${serverCode} · ${tribe}`;
    }

    // Sub-cards for cluster card: group joined servers by cluster
    type ClusterGroup = { name: string; servers: Array<Record<string, unknown>> };
    const clusters = $derived.by<ClusterGroup[]>(() => {
        const groups = new Map<string, ClusterGroup>();
        for (const s of (data.joinedServers ?? [])) {
            const cl = (s.cluster ?? 'Your Cluster') as string;
            if (!groups.has(cl)) groups.set(cl, { name: cl, servers: [] });
            groups.get(cl)!.servers.push(s);
        }
        return [...groups.values()];
    });

    // News items — combine ark-news (Wildcard-tagged) + youtube videos + steam, filter by platform-toggle state
    type NewsItem = {
        id: string;
        platform: 'twitter' | 'youtube' | 'reddit' | 'steam' | 'sta' | 'wildcard' | 'twitch';
        glyph: string;
        author: string;
        title?: string;
        excerpt?: string;
        link: string;
        date: string;
        platformName: string;
        videoLink?: string;
        imageUrl?: string;
    };

    const newsRows = $derived.by<NewsItem[]>(() => {
        const out: NewsItem[] = [];
        for (const n of (data.newsItems ?? [])) {
            out.push({
                id: `news-${n.link}`,
                platform: 'wildcard',
                glyph: '⬢',
                author: (n.author as string) ?? 'Studio Wildcard',
                title: n.title as string,
                excerpt: n.description as string,
                link: n.link as string,
                date: n.date as string,
                platformName: 'Wildcard',
                imageUrl: typeof n.imageUrl === 'string' ? n.imageUrl : undefined
            });
        }
        for (const v of (data.youtubeItems ?? [])) {
            out.push({
                id: `yt-${v.link}`,
                platform: 'youtube',
                glyph: '▶',
                author: (v.channelName as string) ?? 'YouTube',
                title: v.title as string,
                link: v.link as string,
                date: v.date as string,
                platformName: 'YouTube',
                videoLink: v.link as string
            });
        }
        for (const s of (data.steamItems ?? [])) {
            out.push({
                id: (s.id as string) ?? `steam-${s.url}`,
                platform: 'steam',
                glyph: '◢',
                author: (s.author as string) || (s.feedLabel as string) || 'Steam',
                title: s.title as string,
                excerpt: s.body as string,
                link: s.url as string,
                date: s.date as string,
                platformName: 'Steam',
                imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : undefined
            });
        }
        out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return out.filter(n => activeSources[n.platform]);
    });

    // ── Feed source management (paste-link with auto-detect) ────────────
    type FeedSource = { id: number; type: string; url: string; label: string };
    let mySources = $state<FeedSource[]>((data.feedSources ?? []) as FeedSource[]);
    let newSourceUrl = $state('');
    let addingSource = $state(false);
    let addSourceMsg = $state('');
    let addSourceErr = $state(false);

    function detectPlatform(raw: string): { type: 'youtube'|'twitter'|'reddit'|'twitch'|'steam'|null; label: string } {
        const url = raw.trim();
        if (!url) return { type: null, label: '' };
        const lower = url.toLowerCase();

        // YouTube: @handle, youtube.com/@..., youtube.com/c/..., youtu.be
        if (lower.startsWith('@'))                                return { type: 'youtube', label: url.replace(/^@/, '') };
        if (/(^|\/\/)(www\.)?(youtube\.com|youtu\.be)/.test(lower)) {
            const m = url.match(/(?:youtube\.com\/(?:@|c\/|channel\/|user\/)?|youtu\.be\/)([^/?&\s]+)/i);
            return { type: 'youtube', label: m?.[1] ?? '' };
        }

        // Twitter / X
        if (/(^|\/\/)(www\.)?(twitter\.com|x\.com)/.test(lower)) {
            const m = url.match(/(?:twitter\.com|x\.com)\/(@?[\w.-]+)/i);
            return { type: 'twitter', label: '@' + (m?.[1] ?? '').replace(/^@/, '') };
        }

        // Reddit
        if (/(^|\/\/)(www\.)?reddit\.com/.test(lower)) {
            const m = url.match(/reddit\.com\/r\/([\w-]+)/i);
            return { type: 'reddit', label: 'r/' + (m?.[1] ?? '') };
        }
        if (lower.startsWith('r/'))                               return { type: 'reddit', label: url };

        // Twitch
        if (/(^|\/\/)(www\.)?twitch\.tv/.test(lower)) {
            const m = url.match(/twitch\.tv\/([\w-]+)/i);
            return { type: 'twitch', label: m?.[1] ?? '' };
        }

        // Steam — match store, community, news, group, and announcement URLs.
        // All Steam sources route through the ASA News API on the server side,
        // so we just need to recognize the URL shape and pick a sensible label.
        if (/(^|\/\/)(www\.)?(store\.steampowered\.com|steamcommunity\.com)/.test(lower)) {
            // Try to pull a meaningful label: group name, app name segment, or "ARK Ascended"
            const groupMatch = url.match(/steamcommunity\.com\/groups\/([\w-]+)/i);
            const appMatch   = url.match(/(?:store\.steampowered\.com|steamcommunity\.com)\/(?:app|games)\/(\d+)(?:\/([^/?#]+))?/i);
            let label = 'ARK Ascended';
            if (groupMatch?.[1]) label = groupMatch[1];
            else if (appMatch?.[2]) label = decodeURIComponent(appMatch[2]).replace(/_/g, ' ');
            return { type: 'steam', label };
        }

        return { type: null, label: '' };
    }

    const detected = $derived(detectPlatform(newSourceUrl));

    async function addSource() {
        const url = newSourceUrl.trim();
        if (!url) { addSourceErr = true; addSourceMsg = 'Paste a link to add'; return; }
        const { type, label } = detectPlatform(url);
        if (!type) { addSourceErr = true; addSourceMsg = "Couldn't detect platform — try a YouTube, Twitter, Reddit, Twitch, or Steam link"; return; }
        addingSource = true; addSourceMsg = ''; addSourceErr = false;
        try {
            const res = await fetch('/api/feed-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, url, label })
            });
            if (res.ok) {
                const entry = await res.json();
                mySources = [...mySources, entry];
                newSourceUrl = '';
                addSourceErr = false;
                addSourceMsg = '✓ Added — refresh to pull new items';
                setTimeout(() => addSourceMsg = '', 3000);
            } else {
                const err = await res.json().catch(() => ({}));
                addSourceErr = true;
                addSourceMsg = err.error ?? 'Failed to add';
            }
        } catch {
            addSourceErr = true;
            addSourceMsg = 'Network error';
        }
        addingSource = false;
    }
    async function removeSource(id: number) {
        if (!confirm('Remove this source?')) return;
        const res = await fetch('/api/feed-sources', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (res.ok) mySources = mySources.filter(s => s.id !== id);
    }

    function platformLabel(type: string): string {
        if (type === 'youtube') return 'YouTube';
        if (type === 'twitter') return 'Twitter / X';
        if (type === 'reddit')  return 'Reddit';
        if (type === 'twitch')  return 'Twitch';
        if (type === 'steam')   return 'Steam';
        return type.toUpperCase();
    }

    // Recommended starter sources (curated list)
    let bulkSubscribing = $state(false);
    async function subscribeRecommended(rec: { type: string; url: string; label: string }) {
        try {
            const res = await fetch('/api/feed-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: rec.type, url: rec.url, label: rec.label })
            });
            if (res.ok) {
                const entry = await res.json();
                mySources = [...mySources, entry];
            }
        } catch { /* swallow — user can retry */ }
    }
    async function subscribeAllRecommended() {
        if (bulkSubscribing) return;
        bulkSubscribing = true;
        for (const rec of RECOMMENDED_SOURCES) {
            if (mySources.some(s => s.url === rec.url)) continue;
            await subscribeRecommended(rec);
        }
        bulkSubscribing = false;
    }
    const recommendedRemaining = $derived(
        RECOMMENDED_SOURCES.filter(rec => !mySources.some(s => s.url === rec.url))
    );

</script>

<svelte:head>
    <title>⬡ TEKOS — Feed</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<div class="stage">

    <div class="page-header">
        <div class="page-title">Feed</div>
        <div class="page-sub">
            <span class="prefix">›</span>
            <span class="num">{data.eventsToday ?? 0}</span> EVENTS TODAY ·
            <span class="num">{data.survivorsActive ?? 0}</span> SURVIVORS ACTIVE
        </div>
    </div>

    <div class="scope-tabs">
        <button class="scope-tab all"       class:active={scope === 'all'}       onclick={() => scope = 'all'}><span class="tab-dot"></span>All</button>
        <button class="scope-tab following" class:active={scope === 'following'} onclick={() => scope = 'following'}><span class="tab-dot"></span>Following</button>
        <button class="scope-tab tribe"     class:active={scope === 'tribe'}     onclick={() => scope = 'tribe'}><span class="tab-dot"></span>Tribe</button>
        <button class="scope-tab server"    class:active={scope === 'server'}    onclick={() => scope = 'server'}><span class="tab-dot"></span>Server</button>
        <button class="scope-tab global"    class:active={scope === 'global'}    onclick={() => scope = 'global'}><span class="tab-dot"></span>Global</button>
        <button class="scope-tab news"      class:active={scope === 'news'}      onclick={() => scope = 'news'}><span class="tab-dot"></span>News</button>
    </div>

    {#if scope !== 'news'}
        {#if scope === 'server'}
            <!-- Server cluster card + sub-cards -->
            <div class="section-head">
                <span class="pip cyan"></span>
                Your Servers
                <span class="rule"></span>
                <a class="action" href="/settings?tab=cluster">Manage <span class="arrow">▸</span></a>
            </div>

            {#if clusters.length === 0}
                <a class="add-cluster-card" href="/settings?tab=cluster">
                    <span class="glyph">+</span>
                    <span class="lbl">No clusters connected — link a server in /settings</span>
                </a>
            {:else}
                {#each clusters as cluster (cluster.name)}
                    <div class="cluster-card">
                        <div class="cluster-head">
                            <div class="cluster-info">
                                <div class="cluster-name">{cluster.name}</div>
                                <div class="cluster-stats">
                                    <span class="live-pip"></span>
                                    <span class="stat">{cluster.servers.length} servers</span>
                                </div>
                            </div>
                            <div class="cluster-actions">
                                <a class="cluster-btn" href="/settings?tab=cluster">+ Add Server</a>
                            </div>
                        </div>
                        <div class="server-grid">
                            {#each cluster.servers as sv}
                                <div class="server-card">
                                    <div class="server-card-top">
                                        <span class="server-card-name">{sv.name ?? sv.code ?? 'Unknown'}</span>
                                        <span class="server-card-status online"><span class="pip"></span>Online</span>
                                    </div>
                                    <div class="server-card-meta">
                                        <div><div class="lbl">Map</div><div class="val">{sv.map ?? '—'}</div></div>
                                        <div><div class="lbl">Code</div><div class="val players">{sv.code ?? sv.name ?? '—'}</div></div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
                <a class="add-cluster-card" href="/settings?tab=cluster">
                    <span class="glyph">+</span>
                    <span class="lbl">Add another Cluster</span>
                </a>
            {/if}

            <div class="section-head" style="margin-top:24px">
                <span class="pip cyan"></span>
                Server Feed
                <span class="rule"></span>
            </div>
        {/if}

        <div class="tab-content active">
            <div class="feed">
                {#if groupedRows.length === 0}
                    <div style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);padding:32px 0;text-align:center;">
                        No activity yet. Log a specimen, beat a boss, or earn a badge — events show up here.
                    </div>
                {:else}
                    {#each groupedRows as row (row.key)}
                        {#if row.kind === 'divider'}
                            <div class="date-divider">{row.label}</div>
                        {:else}
                            {@const it = row.item}
                            <a class="feed-event {eventKindClass(it.type)}" href={eventHref(it)}>
                                <div class="feed-avatar">
                                    <svg viewBox="0 0 100 110">
                                        <polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="2"/>
                                        <text x="50" y="74" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{eventAvatarLetter(displayName(it.user))}</text>
                                    </svg>
                                    <span class="type-glyph">{eventTypeGlyph(it.type)}</span>
                                </div>
                                <div class="feed-body">
                                    <div class="feed-text">{eventText(it)}</div>
                                    <div class="feed-meta"><span class="source">{metaLine(it)}</span></div>
                                </div>
                                <div class="feed-time">{relTime(it.createdAt)}</div>
                            </a>
                        {/if}
                    {/each}
                {/if}
            </div>
        </div>
    {:else}
        <!-- News tab: platform toggles + news cards -->
        <div class="section-head">
            <span class="pip"></span>
            News Sources
            <span class="rule"></span>
            <a class="action" href="/settings">Manage <span class="arrow">▸</span></a>
        </div>

        <div class="source-row">
            <span class="source-row-label">Active:</span>
            <button class="source-chip twitter" class:active={activeSources.twitter} onclick={() => toggleSource('twitter')}><span class="platform-dot"></span>Twitter / X</button>
            <button class="source-chip youtube" class:active={activeSources.youtube} onclick={() => toggleSource('youtube')}><span class="platform-dot"></span>YouTube</button>
            <button class="source-chip reddit" class:active={activeSources.reddit} onclick={() => toggleSource('reddit')}><span class="platform-dot"></span>Reddit</button>
            <button class="source-chip steam" class:active={activeSources.steam} onclick={() => toggleSource('steam')}><span class="platform-dot"></span>Steam</button>
            <button class="source-chip sta" class:active={activeSources.sta} onclick={() => toggleSource('sta')}><span class="platform-dot"></span>Survive The Ark</button>
            <button class="source-chip wildcard" class:active={activeSources.wildcard} onclick={() => toggleSource('wildcard')}><span class="platform-dot"></span>Wildcard</button>
            <button class="source-chip twitch" class:active={activeSources.twitch} onclick={() => toggleSource('twitch')}><span class="platform-dot"></span>Twitch</button>
        </div>

        <!-- Your sources management -->
        <div class="section-head" style="margin-top:24px">
            <span class="pip cyan"></span>
            Your Sources
            <span class="rule"></span>
            <span class="count">{mySources.length} / 20</span>
        </div>

        <div class="sources-panel">
            <!-- Add-a-source form -->
            <div class="add-source-block">
                <div class="add-source-title">Add a source</div>
                <div class="add-source-hint">Paste any link from these platforms and we'll detect the rest:</div>
                <div class="add-source-examples">
                    <span class="ex-chip youtube"><span class="dot"></span>youtube.com/@channel</span>
                    <span class="ex-chip twitter"><span class="dot"></span>twitter.com/handle</span>
                    <span class="ex-chip reddit"><span class="dot"></span>reddit.com/r/ARKSurvivalAscended</span>
                    <span class="ex-chip twitch"><span class="dot"></span>twitch.tv/channel</span>
                    <span class="ex-chip steam"><span class="dot"></span>steampowered.com/app/2399830</span>
                </div>
                <div class="add-source-row">
                    <div class="add-input-wrap">
                        <input
                            type="text"
                            class="add-src-input"
                            bind:value={newSourceUrl}
                            placeholder="Paste a link…"
                            onkeydown={(e) => { if (e.key === 'Enter') addSource(); }}
                        />
                        {#if detected.type}
                            <span class="detected-pill {detected.type}">
                                <span class="dot"></span>
                                {platformLabel(detected.type)}
                                {#if detected.label}<span class="detected-label">· {detected.label}</span>{/if}
                            </span>
                        {/if}
                    </div>
                    <button class="add-src-btn" onclick={addSource} disabled={addingSource || !newSourceUrl.trim() || !detected.type}>
                        {addingSource ? 'Adding…' : '+ Add Source'}
                    </button>
                </div>
                {#if addSourceMsg}
                    <div class="add-src-msg" class:err={addSourceErr}>{addSourceMsg}</div>
                {/if}
            </div>

            <!-- Curated starter panel — shown when user has no saved sources yet -->
            {#if mySources.length === 0 && recommendedRemaining.length > 0}
                <div class="recommended-panel">
                    <div class="recommended-head">
                        <span class="rec-pip"></span>
                        <span class="rec-title">Recommended for ASA survivors</span>
                        <button class="rec-bulk-btn" onclick={subscribeAllRecommended} disabled={bulkSubscribing}>
                            {bulkSubscribing ? 'Subscribing…' : '+ Subscribe to all'}
                        </button>
                    </div>
                    <div class="recommended-list">
                        {#each RECOMMENDED_SOURCES as rec (rec.url)}
                            {@const subscribed = mySources.some(s => s.url === rec.url)}
                            <div class="rec-row {rec.type}">
                                <span class="rec-glyph">⬡</span>
                                <div class="rec-info">
                                    <div class="rec-label">{rec.label} <span class="rec-platform">· {platformLabel(rec.type)}</span></div>
                                    <div class="rec-desc">{rec.description}</div>
                                </div>
                                {#if subscribed}
                                    <span class="rec-subscribed">✓ Added</span>
                                {:else}
                                    <button class="rec-subscribe" onclick={() => subscribeRecommended(rec)}>+ Subscribe</button>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Your sources cards -->
            {#if mySources.length === 0}
                <div class="sources-empty">No sources yet — paste a link above or pick from the recommended list.</div>
            {:else}
                <div class="sources-grid">
                    {#each mySources as src (src.id)}
                        <div class="source-card {src.type}">
                            <div class="src-card-icon">
                                {#if src.type === 'youtube'}
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
                                {:else if src.type === 'twitter'}
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                {:else if src.type === 'reddit'}
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 1 0 12 24 12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12.0c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                                {:else if src.type === 'twitch'}
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                                {:else if src.type === 'steam'}
                                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.6 0 .3 4.9 0 11.2L6.5 14a3.4 3.4 0 0 1 1.8-.5h.2l2.9-4.2v-.1a4.5 4.5 0 1 1 4.5 4.5h-.1l-4.1 3v.2a3.4 3.4 0 0 1-6.7 1l-4.6-2A12 12 0 1 0 12 0zM7.5 18.2l-1.5-.6a2.5 2.5 0 0 0 4.7-1.4 2.5 2.5 0 0 0-2.5-2.5l1.5.6a1.8 1.8 0 1 1-1.4 3.4l-.8-.3zm11.5-7.3a3 3 0 1 0-6 0 3 3 0 0 0 6 0z"/></svg>
                                {/if}
                            </div>
                            <div class="src-card-body">
                                <div class="src-card-platform">{platformLabel(src.type)}</div>
                                <div class="src-card-label">{src.label || src.url}</div>
                            </div>
                            <div class="src-card-actions">
                                <a class="src-card-open" href={src.url} target="_blank" rel="noopener noreferrer" title="Open in new tab">↗</a>
                                <button class="src-card-remove" onclick={() => removeSource(src.id)} title="Remove">✕</button>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="section-head" style="margin-top:24px">
            <span class="pip"></span>
            Latest News
            <span class="rule"></span>
            <span class="count">{newsRows.length} items</span>
        </div>

        <div class="news-feed">
            {#if newsRows.length === 0}
                <div style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);padding:32px 0;text-align:center;">
                    No news yet. Sources will appear here when wired.
                </div>
            {:else}
                {#each newsRows as n (n.id)}
                    <div class="news-item {n.platform}">
                        <div class="news-platform">{n.glyph}</div>
                        <div class="news-body">
                            <div class="news-header">
                                <span class="platform-name">{n.platformName}</span>
                                <span class="sep">·</span>
                                <span class="author">{n.author}</span>
                                <span class="time">{relTime(n.date)}</span>
                            </div>
                            {#if n.title}<div class="news-title">{n.title}</div>{/if}
                            {#if n.imageUrl}
                                <a class="news-thumb" href={n.link} target="_blank" rel="noopener noreferrer" aria-label="Open full article">
                                    <img src={n.imageUrl} alt="" loading="lazy" referrerpolicy="no-referrer" />
                                </a>
                            {/if}
                            {#if n.excerpt}<div class="news-excerpt">{n.excerpt}</div>{/if}
                            {#if n.videoLink}
                                <div class="video-thumb">
                                    <div class="video-thumb-play">
                                        <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                                    </div>
                                </div>
                            {/if}
                            <div class="news-engage">
                                <a class="open-btn" href={n.link} target="_blank" rel="noopener noreferrer">Open ▸</a>
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
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

/* Scope tabs — prominent chip style matching the News platform chips */
.scope-tabs {
    display: flex; gap: 8px; margin-bottom: 22px;
    flex-wrap: wrap;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.scope-tab {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 9px 16px; cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
}
.scope-tab .tab-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: currentColor; opacity: 0.55;
    box-shadow: 0 0 5px currentColor;
}
.scope-tab:hover {
    color: var(--tek-text);
    border-color: rgba(0,180,255,0.30);
    background: rgba(0,180,255,0.06);
}
.scope-tab.active {
    background: rgba(0,180,255,0.14);
    border-color: var(--tek-blue);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
    box-shadow: 0 0 10px rgba(0,180,255,0.25);
}
.scope-tab.active .tab-dot { opacity: 1; }

/* Per-tab dot colors so the strip echoes the news platform chips */
.scope-tab.all       .tab-dot { color: var(--tek-blue); }
.scope-tab.following .tab-dot { color: #c084fc; }
.scope-tab.tribe     .tab-dot { color: var(--tek-amber); }
.scope-tab.server    .tab-dot { color: var(--tek-green); }
.scope-tab.global    .tab-dot { color: #06b6d4; }
.scope-tab.news      .tab-dot { color: #ff4500; }

/* Tab content switching */
.tab-content { display: none; }
.tab-content.active { display: block; animation: tab-fade-in 0.3s ease; }
@keyframes tab-fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Feed event */
.feed { display: flex; flex-direction: column; gap: 8px; }
.feed-event {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 14px; align-items: flex-start;
    text-decoration: none; color: inherit;
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
.feed-meta {
    font-family: var(--tek-mono); font-size: 0.6rem;
    letter-spacing: 0.10em; color: var(--tek-text-faint);
    text-transform: uppercase; margin-top: 4px;
}
.feed-meta .source { color: var(--tek-text-dim); }
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

/* Server tab */
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
    transition: all 0.18s; text-decoration: none;
}
.cluster-btn:hover { background: rgba(6,182,212,0.22); filter: drop-shadow(0 0 6px rgba(6,182,212,0.40)); }

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
    transition: all 0.18s;
}
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
    text-decoration: none;
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

/* News tab — platform toggles */
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
    text-decoration: none;
}
.source-chip .platform-dot {
    width: 7px; height: 7px; border-radius: 50%;
}
.source-chip:hover { color: var(--tek-text); border-color: rgba(255,255,255,0.18); }
.source-chip.active { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.25); color: var(--tek-text); }

.source-chip.twitter .platform-dot   { background: #1da1f2; box-shadow: 0 0 5px rgba(29,161,242,0.6); }
.source-chip.youtube .platform-dot   { background: #ff0000; box-shadow: 0 0 5px rgba(255,0,0,0.6); }
.source-chip.reddit .platform-dot    { background: #ff4500; box-shadow: 0 0 5px rgba(255,69,0,0.6); }
.source-chip.steam .platform-dot     { background: #66c0f4; box-shadow: 0 0 5px rgba(102,192,244,0.6); }
.source-chip.sta .platform-dot       { background: #10b981; box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.source-chip.wildcard .platform-dot  { background: #8b5cf6; box-shadow: 0 0 5px rgba(139,92,246,0.6); }
.source-chip.twitch .platform-dot    { background: #9146ff; box-shadow: 0 0 5px rgba(145,70,255,0.6); }
.source-chip.add {
    border-style: dashed; border-color: rgba(0,180,255,0.30); color: var(--tek-text-faint);
}
.source-chip.add:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.60); }

/* ── Source management (Your Sources panel) ────────────────────────── */
.sources-panel {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0,180,255,0.12);
    padding: 18px;
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    margin-bottom: 16px;
}

/* Add-source block */
.add-source-block {
    padding-bottom: 18px;
    margin-bottom: 18px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.add-source-title {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.add-source-hint {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    margin-bottom: 10px;
}
.add-source-examples {
    display: flex; gap: 6px; flex-wrap: wrap;
    margin-bottom: 12px;
}
.ex-chip {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,0.03);
    border: 1px dashed rgba(255,255,255,0.10);
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    padding: 4px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.ex-chip .dot { width: 6px; height: 6px; border-radius: 50%; }
.ex-chip.steam   .dot { background: #66c0f4; box-shadow: 0 0 4px rgba(102,192,244,0.5); }
.ex-chip.youtube .dot { background: #ff0000; box-shadow: 0 0 4px rgba(255,0,0,0.5); }
.ex-chip.twitter .dot { background: #1da1f2; box-shadow: 0 0 4px rgba(29,161,242,0.5); }
.ex-chip.reddit  .dot { background: #ff4500; box-shadow: 0 0 4px rgba(255,69,0,0.5); }
.ex-chip.twitch  .dot { background: #9146ff; box-shadow: 0 0 4px rgba(145,70,255,0.5); }

.add-source-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    align-items: stretch;
}
@media (max-width: 720px) { .add-source-row { grid-template-columns: 1fr; } }

.add-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
}
.add-src-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.10);
    border-bottom: 1px solid rgba(0,180,255,0.30);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    padding: 10px 12px 10px 14px;
    outline: none;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: border-color 0.2s;
}
.add-src-input::placeholder { color: var(--tek-text-faint); }
.add-src-input:focus { border-color: rgba(0,180,255,0.50); border-bottom-color: var(--tek-blue); }

.detected-pill {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(0,180,255,0.10);
    border: 1px solid rgba(0,180,255,0.30);
    color: #7dd3fc;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    padding: 3px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    pointer-events: none;
}
.detected-pill .dot { width: 6px; height: 6px; border-radius: 50%; }
.detected-pill.youtube .dot { background: #ff0000; box-shadow: 0 0 4px rgba(255,0,0,0.6); }
.detected-pill.twitter .dot { background: #1da1f2; box-shadow: 0 0 4px rgba(29,161,242,0.6); }
.detected-pill.reddit  .dot { background: #ff4500; box-shadow: 0 0 4px rgba(255,69,0,0.6); }
.detected-pill.twitch  .dot { background: #9146ff; box-shadow: 0 0 4px rgba(145,70,255,0.6); }
.detected-pill.steam   .dot { background: #66c0f4; box-shadow: 0 0 4px rgba(102,192,244,0.6); }
.detected-label { color: var(--tek-text-dim); margin-left: 2px; font-weight: 500; letter-spacing: 0.04em; text-transform: none; }

.add-src-btn {
    background: rgba(0,180,255,0.18);
    border: 1px solid rgba(0,180,255,0.45);
    color: #7dd3fc;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 18px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
    white-space: nowrap;
}
.add-src-btn:hover:not(:disabled) {
    background: rgba(0,180,255,0.35);
    filter: drop-shadow(0 0 6px var(--tek-blue-glow));
}
.add-src-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.add-src-msg {
    margin-top: 10px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: var(--tek-green);
}
.add-src-msg.err { color: #fca5a5; }

/* Empty state */
.sources-empty {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.08em;
    font-style: italic;
    text-align: center;
    padding: 16px 0 6px;
}

/* Source cards grid */
.sources-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
}
.source-card {
    --src-rgb: 0,180,255;
    display: grid;
    grid-template-columns: 44px 1fr auto;
    gap: 12px;
    align-items: center;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(var(--src-rgb), 0.25);
    padding: 12px 14px 12px 16px;
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    position: relative;
    transition: transform 0.2s ease, border-color 0.2s;
}
.source-card::before {
    content: '';
    position: absolute;
    left: 0; top: 8px; bottom: 0;
    width: 2px;
    background: rgb(var(--src-rgb));
    box-shadow: 0 0 5px rgba(var(--src-rgb), 0.55);
}
.source-card:hover {
    transform: translateY(-1px);
    border-color: rgba(var(--src-rgb), 0.50);
}
.source-card.youtube { --src-rgb: 255,0,0; }
.source-card.twitter { --src-rgb: 29,161,242; }
.source-card.reddit  { --src-rgb: 255,69,0; }
.source-card.twitch  { --src-rgb: 145,70,255; }

.src-card-icon {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(var(--src-rgb), 0.14);
    border: 1px solid rgba(var(--src-rgb), 0.30);
    color: rgb(var(--src-rgb));
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    filter: drop-shadow(0 0 5px rgba(var(--src-rgb), 0.30));
}
.src-card-icon svg { width: 20px; height: 20px; }

.src-card-body { min-width: 0; line-height: 1.3; }
.src-card-platform {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.18em;
    color: rgb(var(--src-rgb));
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 2px;
}
.src-card-label {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--tek-text);
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.src-card-actions {
    display: flex; align-items: center; gap: 6px;
}
.src-card-open, .src-card-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim);
    text-decoration: none;
    font-family: var(--tek-mono);
    font-size: 0.9rem;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
}
.src-card-open:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.50); }
.src-card-remove:hover {
    color: #fca5a5;
    border-color: rgba(239,68,68,0.50);
    background: rgba(239,68,68,0.12);
}

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
.news-item.wildcard  .news-header .platform-name { color: #c4b5fd; }
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

/* Hero image extracted from the news item (Steam BBCode [img] / HTML <img>).
   Hidden when the image fails to load (img:not([src]) won't display anyway,
   but the empty <a> wrapper stays — that's fine, it's keyboard-focusable). */
.news-thumb {
    display: block;
    margin: 6px 0 10px;
    max-height: 240px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    background: rgba(0,0,0,0.30);
}
.news-thumb img {
    display: block;
    width: 100%;
    height: auto;
    max-height: 240px;
    object-fit: cover;
    transition: opacity 0.18s;
}
.news-thumb:hover img { opacity: 0.85; }

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
.video-thumb-play {
    width: 50px; height: 50px;
    border-radius: 50%; background: rgba(255,0,0,0.20);
    border: 2px solid #ff6b6b;
    display: flex; align-items: center; justify-content: center;
    z-index: 2;
    box-shadow: 0 0 18px rgba(255,0,0,0.40);
}
.video-thumb-play svg { width: 18px; height: 18px; margin-left: 3px; color: #ff6b6b; }

.news-engage {
    display: flex; align-items: center; gap: 14px;
    margin-top: 8px;
    font-family: var(--tek-mono); font-size: 0.6rem;
    color: var(--tek-text-faint); letter-spacing: 0.06em;
}
.news-engage .open-btn {
    margin-left: auto;
    background: rgba(0,180,255,0.08); border: 1px solid rgba(0,180,255,0.25);
    color: #7dd3fc; font-family: inherit; font-size: 0.6rem; font-weight: 700;
    letter-spacing: 0.14em; padding: 4px 10px; cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s; text-transform: uppercase;
    text-decoration: none;
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

/* ── Recommended starter sources panel ───────────────────────────── */
.recommended-panel {
    background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(139,92,246,0.04) 100%);
    border: 1px solid rgba(0,180,255,0.22);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 16px 18px;
    margin-bottom: 18px;
}
.recommended-head {
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
    margin-bottom: 12px;
}
.rec-pip {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 7px var(--tek-blue-glow);
}
.rec-title {
    font-family: var(--tek-mono);
    font-size: 0.78rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--tek-text); flex: 1;
}
.rec-bulk-btn {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    font-family: var(--tek-mono);
    font-size: 0.66rem; font-weight: 800;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 6px 12px; border: none; cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    filter: drop-shadow(0 0 6px rgba(0,180,255,0.35));
    transition: filter 0.18s, transform 0.18s;
}
.rec-bulk-btn:hover:not(:disabled) { filter: drop-shadow(0 0 12px rgba(0,180,255,0.65)); transform: translateY(-1px); }
.rec-bulk-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.recommended-list { display: flex; flex-direction: column; gap: 4px; }
.rec-row {
    display: grid;
    grid-template-columns: 24px 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 9px 12px;
    background: rgba(0,0,0,0.20);
    border-left: 2px solid rgba(0,180,255,0.30);
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
}
.rec-row.youtube  { border-left-color: #ff0000; }
.rec-row.twitter  { border-left-color: #1da1f2; }
.rec-row.reddit   { border-left-color: #ff4500; }
.rec-row.steam    { border-left-color: #66c0f4; }
.rec-row.twitch   { border-left-color: #9146ff; }
.rec-glyph { color: var(--tek-blue); font-size: 0.95rem; text-align: center; }
.rec-info { min-width: 0; line-height: 1.35; }
.rec-label {
    font-family: var(--tek-mono);
    font-size: 0.82rem;
    color: var(--tek-text);
    font-weight: 600;
}
.rec-platform { color: var(--tek-text-dim); font-weight: 400; }
.rec-desc {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.04em;
    margin-top: 2px;
}
.rec-subscribe {
    background: rgba(0,180,255,0.10);
    border: 1px solid rgba(0,180,255,0.32);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.66rem; font-weight: 700;
    letter-spacing: 0.10em; text-transform: uppercase;
    padding: 6px 11px; cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
    white-space: nowrap;
}
.rec-subscribe:hover { background: rgba(0,180,255,0.22); filter: drop-shadow(0 0 5px var(--tek-blue-glow)); }
.rec-subscribed {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    color: #86efac;
    background: rgba(16,185,129,0.10);
    border: 1px solid rgba(16,185,129,0.35);
    padding: 5px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    white-space: nowrap;
}
</style>
