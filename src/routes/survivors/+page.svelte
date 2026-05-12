<script lang="ts">
    import { onMount } from 'svelte';
    import { Search, Users } from 'lucide-svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    type Survivor = {
        id: number;
        nickname: string | null;
        email: string;
        bio: string | null;
        online: boolean;
        specimens: number;
        tribe: { name: string } | null;
    };

    let survivors = $state<Survivor[]>([]);
    let total     = $state(0);
    let page      = $state(1);
    let pages     = $state(1);
    let loading   = $state(false);
    let q         = $state('');
    let onlineOnly = $state(false);

    async function load(reset = false) {
        if (reset) { page = 1; survivors = []; }
        loading = true;
        const params = new URLSearchParams({ page: String(page) });
        if (q.trim()) params.set('q', q.trim());
        if (onlineOnly) params.set('online', 'true');
        const res = await fetch(`/api/survivors?${params}`);
        if (res.ok) {
            const data = await res.json();
            survivors = reset ? data.users : [...survivors, ...data.users];
            total = data.total;
            pages = data.pages;
        }
        loading = false;
    }

    function setFilter(filter: 'all' | 'online') {
        onlineOnly = filter === 'online';
        load(true);
    }

    function displayName(s: Survivor) {
        return s.nickname ?? s.email.split('@')[0];
    }

    onMount(() => load());
</script>

<svelte:head>
    <title>⬡ TekOS — Survivors</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Survivors"
        crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Survivors' }]}
        sub={'"The wild remembers. So does the network. Find the names you don\'t yet know."'}
    />

    <!-- Filter bar -->
    <div class="filter-bar">
        <div class="search-wrap">
            <Search size={14} strokeWidth={2} class="search-icon" />
            <input type="text" class="search-input"
                bind:value={q}
                onkeydown={(e) => e.key === 'Enter' && load(true)}
                placeholder="Search by name, email, or bio…" />
        </div>
        <button class="tek-chip" class:on={!onlineOnly} onclick={() => setFilter('all')}>
            All <span class="num">{total}</span>
        </button>
        <button class="tek-chip" class:on={onlineOnly} onclick={() => setFilter('online')}>
            <span class="tek-pip green pulse"></span>Online
        </button>
        <button class="tek-btn-v2" onclick={() => load(true)} disabled={loading}>
            {loading ? 'SEARCHING…' : 'SEARCH'}
        </button>
    </div>

    <!-- Section head -->
    <div class="tek-section-head">
        <div class="tek-section-title">
            {onlineOnly ? 'Online Survivors' : 'All Survivors'}
        </div>
        <div class="tek-section-meta">
            SHOWING <span class="accent">{survivors.length}</span> OF {total.toLocaleString()}
        </div>
    </div>

    <!-- Loading / empty / grid -->
    {#if loading && survivors.length === 0}
        <div class="tek-empty">
            <div class="icon">⬡</div>
            <div class="title">Loading…</div>
        </div>
    {:else if survivors.length === 0}
        <div class="tek-empty">
            <div class="icon"><Users size={28} strokeWidth={1.5} /></div>
            <div class="title">No Survivors Found</div>
            <div class="flavor">"The wild is quiet."</div>
        </div>
    {:else}
        <div class="dir-grid">
            {#each survivors as s}
                <a class="dir-card" class:online={s.online} href="/survivors/{s.id}">
                    <div class="dir-card-head">
                        <HexAvatar name={displayName(s)} size={44} online={s.online} />
                        <div class="dir-meta">
                            <div class="dir-name">{displayName(s)}</div>
                            {#if s.online}
                                <div class="dir-status online"><span class="tek-pip green"></span>ONLINE</div>
                            {:else}
                                <div class="dir-status offline"><span class="tek-pip"></span>OFFLINE</div>
                            {/if}
                        </div>
                    </div>

                    {#if s.tribe}
                        <div class="dir-tribe">
                            <div class="sigil"></div>
                            <div class="name">{s.tribe.name}</div>
                        </div>
                    {:else}
                        <div class="dir-no-tribe">— No tribe —</div>
                    {/if}

                    {#if s.bio}
                        <div class="dir-bio">{s.bio}</div>
                    {:else}
                        <div class="dir-bio empty">"No bio yet."</div>
                    {/if}

                    <div class="dir-stats">
                        <div class="dir-stat">
                            <div class="dir-stat-val">{s.specimens}</div>
                            <div class="dir-stat-label">Specimens</div>
                        </div>
                    </div>
                </a>
            {/each}
        </div>

        {#if page < pages}
            <div class="dir-footer">
                <button class="tek-btn-v2" onclick={() => { page++; load(false); }} disabled={loading}>
                    {loading ? 'LOADING…' : '▾ LOAD MORE SURVIVORS'}
                </button>
            </div>
        {/if}
    {/if}
</div>

<style>
.filter-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
    align-items: center;
}
.search-wrap { position: relative; flex: 1; min-width: 240px; }
.search-wrap :global(.search-icon) {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-blue);
    pointer-events: none;
}
.search-input {
    width: 100%;
    background: rgba(5,8,18,0.7);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    padding: 10px 14px 10px 34px;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
}
.search-input::placeholder { color: var(--tek-text-faint); }
.search-input:focus {
    outline: none;
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 12px rgba(0,180,255,0.25);
}

.dir-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
}

.dir-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    color: inherit;
    display: block;
}
.dir-card:hover {
    transform: translateY(-2px);
    border-color: var(--tek-blue-border);
    box-shadow: 0 6px 18px rgba(0,180,255,0.10);
}
.dir-card.online::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-green);
    box-shadow: 0 0 6px rgba(16,185,129,0.5);
}

.dir-card-head { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.dir-meta { flex: 1; min-width: 0; }
.dir-name {
    font-family: var(--tek-display);
    font-size: 0.96rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--tek-text);
    line-height: 1.15;
    margin-bottom: 4px;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.dir-status {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}
.dir-status.online { color: var(--tek-green); }
.dir-status.offline { color: var(--tek-text-faint); }

.dir-tribe {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(139,92,246,0.08);
    border: 1px solid rgba(139,92,246,0.30);
    padding: 3px 8px 3px 4px;
    margin-bottom: 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-purple);
    letter-spacing: 0.08em;
    max-width: 100%;
    overflow: hidden;
}
.dir-tribe .sigil {
    width: 14px; height: 14px;
    background: linear-gradient(135deg, var(--tek-purple), var(--tek-blue));
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    flex-shrink: 0;
}
.dir-tribe .name {
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dir-no-tribe {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.10em;
    text-transform: uppercase;
    padding: 3px 0;
    margin-bottom: 8px;
    display: inline-block;
    font-style: italic;
}

.dir-bio {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.82rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
    margin-bottom: 10px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 2.3em;
}
.dir-bio.empty { color: var(--tek-text-faint); }

.dir-stats {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
    padding-top: 10px;
    border-top: 1px solid rgba(0,180,255,0.08);
}
.dir-stat { text-align: center; }
.dir-stat-val {
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    font-weight: 700;
    color: var(--tek-text);
}
.dir-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.52rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-top: 2px;
}

.dir-footer {
    margin-top: 20px;
    text-align: center;
    padding: 16px 0;
}
</style>
