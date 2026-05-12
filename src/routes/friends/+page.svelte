<script lang="ts">
    import { onMount } from 'svelte';
    import { UserPlus, Check, X, Search, MessageSquare, Users } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    let { data }: { data: PageData } = $props();

    type SearchResult = { id: number; nickname: string | null; email: string; discordName: string | null };

    let searchQ = $state('');
    let searchResults = $state<SearchResult[]>([]);
    let searchLoading = $state(false);
    let actionLoading = $state<number | null>(null);

    async function search() {
        if (!searchQ.trim()) { searchResults = []; return; }
        searchLoading = true;
        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ.trim())}`);
            if (res.ok) {
                const body = await res.json();
                searchResults = body.users ?? [];
            }
        } catch {}
        searchLoading = false;
    }

    async function sendRequest(toId: number) {
        actionLoading = toId;
        try {
            await fetch('/api/friends', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendId: toId })
            });
            // Refresh page
            window.location.reload();
        } catch {
            actionLoading = null;
        }
    }

    async function accept(id: number) {
        actionLoading = id;
        await fetch(`/api/friends/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'accept' })
        });
        window.location.reload();
    }
    async function reject(id: number) {
        actionLoading = id;
        await fetch(`/api/friends/${id}`, { method: 'DELETE' });
        window.location.reload();
    }
    async function remove(id: number) {
        if (!confirm('Remove from your network?')) return;
        actionLoading = id;
        await fetch(`/api/friends/${id}`, { method: 'DELETE' });
        window.location.reload();
    }

    function displayName(f: { nickname: string | null; email: string }) {
        return f.nickname ?? f.email.split('@')[0];
    }

    const onlineCount = $derived(data.friends.filter(f => f.online).length);
    const onlineFriends  = $derived(data.friends.filter(f => f.online));
    const offlineFriends = $derived(data.friends.filter(f => !f.online));
</script>

<svelte:head>
    <title>⬡ TekOS — Network</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Network"
        crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Network' }]}
        sub="The Survivors who travel with you."
    />

    <!-- Telemetry -->
    <div class="net-stats">
        <div class="net-stat">
            <div class="val">{data.friends.length}</div>
            <div class="label">Friends</div>
        </div>
        <div class="net-stat">
            <div class="val green">{onlineCount}</div>
            <div class="label">Online Now</div>
        </div>
        <div class="net-stat">
            <div class="val amber">{data.incoming.length}</div>
            <div class="label">Incoming Requests</div>
        </div>
        <div class="net-stat">
            <div class="val">{data.sent.length}</div>
            <div class="label">Sent Requests</div>
        </div>
    </div>

    <!-- Discovery -->
    <section class="section-block">
        <div class="tek-section-head">
            <div class="tek-section-title">Discovery</div>
            <a class="tek-section-meta" href="/survivors">BROWSE ALL SURVIVORS ▸</a>
        </div>

        <div class="search-row">
            <div class="search-wrap">
                <Search size={14} strokeWidth={2} class="search-icon" />
                <input class="search-input" type="text"
                    bind:value={searchQ}
                    onkeydown={(e) => e.key === 'Enter' && search()}
                    placeholder="Search by name, email, or Discord handle…" />
            </div>
            <button class="tek-btn-v2" onclick={search} disabled={searchLoading}>
                {searchLoading ? 'SEARCHING…' : 'SEARCH'}
            </button>
        </div>

        {#if searchResults.length > 0}
            <div class="search-results">
                {#each searchResults as r}
                    <div class="row-card">
                        <HexAvatar name={displayName(r)} size={40} showPip={false} />
                        <div class="row-info">
                            <div class="row-name">{displayName(r)}</div>
                            {#if r.discordName}<div class="row-handle">⌬ {r.discordName}</div>{/if}
                        </div>
                        <button class="tek-btn-v2 sm" onclick={() => sendRequest(r.id)} disabled={actionLoading === r.id}>
                            <UserPlus size={12} strokeWidth={2.5} />
                            {actionLoading === r.id ? '…' : 'ADD'}
                        </button>
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- Incoming requests -->
    {#if data.incoming.length > 0}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Incoming Requests</div>
                <div class="tek-section-meta"><span class="accent">{data.incoming.length}</span> AWAITING</div>
            </div>
            <div class="list-stack">
                {#each data.incoming as r}
                    <div class="row-card amber">
                        <HexAvatar name={displayName(r)} size={40} showPip={false} />
                        <div class="row-info">
                            <div class="row-name">{displayName(r)}</div>
                            {#if r.discordName}<div class="row-handle">⌬ {r.discordName}</div>{/if}
                        </div>
                        <div class="row-actions">
                            <button class="tek-btn-v2 sm" onclick={() => accept(r.id)} disabled={actionLoading === r.id}>
                                <Check size={12} strokeWidth={2.5} />ACCEPT
                            </button>
                            <button class="tek-btn-v2 ghost sm" onclick={() => reject(r.id)} disabled={actionLoading === r.id}>
                                <X size={12} strokeWidth={2.5} />DENY
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Online now -->
    {#if onlineFriends.length > 0}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Online Now</div>
                <div class="tek-section-meta">
                    <span class="tek-pip green pulse"></span>
                    <span class="accent">{onlineFriends.length}</span> ACTIVE
                </div>
            </div>
            <div class="friends-grid">
                {#each onlineFriends as f}
                    <div class="friend-card online">
                        <a class="friend-link" href="/survivors/{f.friendId}">
                            <HexAvatar name={displayName(f)} size={48} online={true} />
                            <div class="friend-info">
                                <div class="friend-name">{displayName(f)}</div>
                                <div class="friend-status online"><span class="tek-pip green"></span>ONLINE</div>
                            </div>
                        </a>
                        <div class="friend-actions">
                            <a class="tek-btn-v2 ghost sm" href="/messages/{f.friendId}" title="Message">
                                <MessageSquare size={12} strokeWidth={2} />
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- All friends -->
    <section class="section-block">
        <div class="tek-section-head">
            <div class="tek-section-title">{onlineFriends.length > 0 ? 'Offline' : 'All Friends'}</div>
            <div class="tek-section-meta">{offlineFriends.length} OF {data.friends.length}</div>
        </div>

        {#if data.friends.length === 0}
            <div class="tek-empty">
                <div class="icon"><Users size={26} strokeWidth={1.5} /></div>
                <div class="title">Your network is empty</div>
                <div class="flavor">"No Survivor walks alone for long. Use Discovery above to find others."</div>
            </div>
        {:else}
            <div class="friends-grid">
                {#each offlineFriends as f}
                    <div class="friend-card">
                        <a class="friend-link" href="/survivors/{f.friendId}">
                            <HexAvatar name={displayName(f)} size={48} online={false} />
                            <div class="friend-info">
                                <div class="friend-name">{displayName(f)}</div>
                                <div class="friend-status offline"><span class="tek-pip"></span>OFFLINE</div>
                            </div>
                        </a>
                        <div class="friend-actions">
                            <a class="tek-btn-v2 ghost sm" href="/messages/{f.friendId}" title="Message">
                                <MessageSquare size={12} strokeWidth={2} />
                            </a>
                            <button class="tek-btn-v2 ghost sm" onclick={() => remove(f.id)} disabled={actionLoading === f.id} title="Remove">
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- Sent requests (collapsed) -->
    {#if data.sent.length > 0}
        <section class="section-block">
            <details>
                <summary>
                    <span class="t-eyebrow">Sent requests · {data.sent.length} pending</span>
                </summary>
                <div class="list-stack" style="margin-top: 12px;">
                    {#each data.sent as r}
                        <div class="row-card subtle">
                            <HexAvatar name={displayName(r)} size={36} showPip={false} />
                            <div class="row-info">
                                <div class="row-name">{displayName(r)}</div>
                            </div>
                            <button class="tek-btn-v2 ghost sm" onclick={() => reject(r.id)} disabled={actionLoading === r.id}>
                                CANCEL
                            </button>
                        </div>
                    {/each}
                </div>
            </details>
        </section>
    {/if}
</div>

<style>
.section-block { margin-bottom: 28px; }

.net-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 24px;
}
@media (max-width: 600px) { .net-stats { grid-template-columns: repeat(2, 1fr); } }
.net-stat {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 16px;
}
.net-stat::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
.net-stat .val {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--tek-blue);
    line-height: 1;
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.net-stat .val.green { color: var(--tek-green); text-shadow: 0 0 8px rgba(16,185,129,0.4); }
.net-stat .val.amber { color: var(--tek-amber); text-shadow: 0 0 8px rgba(245,158,11,0.4); }
.net-stat .label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 3px;
}

/* Search */
.search-row { display: flex; gap: 10px; margin-bottom: 14px; }
.search-wrap { position: relative; flex: 1; min-width: 240px; }
.search-wrap :global(.search-icon) {
    position: absolute;
    left: 12px; top: 50%;
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
.search-input:focus { outline: none; box-shadow: 0 0 0 1px var(--tek-blue); }
.search-results { display: flex; flex-direction: column; gap: 6px; }

/* Row card (search results, incoming requests, sent requests) */
.row-card, .list-stack > .row-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.row-card.amber {
    background: rgba(245,158,11,0.04);
    border-color: rgba(245,158,11,0.25);
    border-left: 2px solid var(--tek-amber);
}
.row-card.subtle { opacity: 0.85; }
.row-info { flex: 1; min-width: 0; }
.row-name { font-size: 0.92rem; font-weight: 600; color: var(--tek-text); }
.row-handle { font-family: var(--tek-mono); font-size: 0.72rem; color: var(--tek-text-dim); margin-top: 2px; }
.row-actions { display: flex; gap: 6px; }
.list-stack { display: flex; flex-direction: column; gap: 6px; }

/* Friends grid */
.friends-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
}
.friend-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    transition: all 0.15s;
    position: relative;
}
.friend-card.online::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.5);
}
.friend-card:hover { transform: translateY(-2px); border-color: var(--tek-blue-border); }
.friend-link {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
    min-width: 0;
}
.friend-info { flex: 1; min-width: 0; }
.friend-name {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 4px;
}
.friend-status {
    display: flex; align-items: center; gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}
.friend-status.online { color: var(--tek-green); }
.friend-status.offline { color: var(--tek-text-faint); }
.friend-actions { display: flex; gap: 4px; flex-shrink: 0; }

details summary { cursor: pointer; list-style: none; padding: 4px 0; }
details summary::-webkit-details-marker { display: none; }
details summary::before { content: '▸ '; color: var(--tek-blue); }
details[open] summary::before { content: '▾ '; }
</style>
