<script lang="ts">
    type Convo = {
        userId: number;
        nickname: string | null;
        discordName: string | null;
        lastMessage: string;
        lastAt: string | Date;
        unread: number;
    };

    let { convos }: { convos: Convo[] } = $props();

    let activeFilter = $state<'all' | 'unread' | 'pinned'>('all');
    let search = $state('');

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
        if (activeFilter === 'unread') list = list.filter(c => c.unread > 0);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(c => displayName(c).toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q));
        }
        return list;
    });

    const totalCount  = $derived(convos.length);
    const unreadCount = $derived(convos.filter(c => c.unread > 0).length);
</script>

<div class="messages-app">
    <aside class="pane list-pane">
        <div class="list-pane-head">
            <div class="list-search">
                <svg class="list-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" class="list-search-input" placeholder="Search messages…" bind:value={search} />
            </div>
            <div class="list-tabs">
                <button class="list-tab" class:active={activeFilter === 'all'} onclick={() => activeFilter = 'all'}>All <span class="count">{totalCount}</span></button>
                <button class="list-tab" class:active={activeFilter === 'unread'} onclick={() => activeFilter = 'unread'}>Unread <span class="count">{unreadCount}</span></button>
                <button class="list-tab" class:active={activeFilter === 'pinned'} onclick={() => activeFilter = 'pinned'}>Pinned <span class="count">0</span></button>
            </div>
        </div>

        <div class="convo-list">
            {#if filteredConvos.length === 0}
                <div class="empty-state">
                    <div class="empty-title">No conversations</div>
                    <div class="empty-flavor">"Find a Survivor in the Survivors tab and tap message."</div>
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

<style>
.messages-app {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    min-height: 0;
    max-width: 540px;
}
@media (max-width: 860px) { .messages-app { max-width: 100%; } }

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
    content: ''; position: absolute; left: 0; top: 14px; bottom: 0; width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

.list-pane-head { padding: 14px 16px 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
.list-search { position: relative; margin-bottom: 10px; }
.list-search-input {
    width: 100%; background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text); padding: 8px 12px 8px 34px;
    font-family: inherit; font-size: 0.82rem; outline: none;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: border-color 0.2s;
}
.list-search-input::placeholder { color: var(--tek-text-faint); }
.list-search-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); }
.list-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--tek-text-faint); pointer-events: none; }

.list-tabs { display: flex; gap: 5px; }
.list-tab {
    background: none; border: 1px solid transparent;
    color: var(--tek-text-faint); font-family: var(--tek-mono);
    font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em;
    padding: 4px 9px; cursor: pointer; text-transform: uppercase;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
}
.list-tab:hover { color: var(--tek-text-dim); }
.list-tab.active { background: var(--tek-blue); color: #001a2e; }
.list-tab .count { margin-left: 4px; background: rgba(0,0,0,0.30); padding: 0 5px; border-radius: 99px; font-size: 0.54rem; }

.convo-list {
    max-height: 70vh;
    overflow-y: auto; padding: 6px 0;
    scrollbar-width: thin; scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.convo-list::-webkit-scrollbar { width: 5px; }
.convo-list::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.convo {
    display: grid; grid-template-columns: 36px 1fr auto;
    gap: 12px; align-items: center;
    padding: 10px 16px 10px 14px;
    cursor: pointer; transition: background 0.18s;
    border-left: 2px solid transparent; position: relative;
    text-decoration: none; color: inherit;
}
.convo:hover { background: rgba(0,180,255,0.04); }
.convo-avatar { width: 36px; height: 40px; position: relative; flex-shrink: 0; }
.convo-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 4px rgba(0,180,255,0.30)); }
.convo-avatar .pip { position: absolute; bottom: 2px; right: -1px; width: 9px; height: 9px; border-radius: 50%; background: var(--tek-text-faint); border: 2px solid #050812; }
.convo-avatar .pip.online { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.65); }

.convo-body { min-width: 0; line-height: 1.35; }
.convo-name { font-family: var(--tek-display); font-size: 0.78rem; font-weight: 800; letter-spacing: 0.04em; color: var(--tek-text); text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.convo.unread .convo-name { color: #fff; }
.convo-preview { font-size: 0.76rem; color: var(--tek-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
.convo.unread .convo-preview { color: var(--tek-text); font-weight: 500; }

.convo-right { text-align: right; line-height: 1.2; }
.convo-time { font-family: var(--tek-mono); font-size: 0.58rem; letter-spacing: 0.06em; color: var(--tek-text-faint); text-transform: uppercase; white-space: nowrap; }
.convo.unread .convo-time { color: var(--tek-blue); }
.convo-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 17px; height: 17px; background: var(--tek-blue); color: #001a2e; font-family: var(--tek-mono); font-size: 0.58rem; font-weight: 800; border-radius: 99px; padding: 0 5px; margin-top: 3px; box-shadow: 0 0 5px var(--tek-blue-glow); }

.empty-state { padding: 40px 20px; text-align: center; }
.empty-title { font-family: var(--tek-display); font-size: 0.9rem; letter-spacing: 0.10em; color: var(--tek-text-dim); text-transform: uppercase; margin-bottom: 6px; }
.empty-flavor { font-family: var(--tek-mono); font-size: 0.7rem; color: var(--tek-text-faint); font-style: italic; }
</style>
