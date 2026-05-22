<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { page } from '$app/stores';
    import { invalidateAll } from '$app/navigation';

    type Convo = {
        userId: number;
        nickname: string | null;
        discordName: string | null;
        lastMessage: string;
        lastAt: string | Date;
        unread: number;
    };
    type Message = {
        id: number;
        fromUserId: number;
        toUserId: number;
        message: string;
        createdAt: string | Date;
        read: boolean;
    };
    type Partner = { id: number; nickname: string | null; discordName: string | null };

    let { convos, myId }: { convos: Convo[]; myId: number } = $props();

    let activeFilter = $state<'all' | 'unread'>('all');
    let search = $state('');
    let activeWith = $state<number | null>(null);
    let activeMessages = $state<Message[]>([]);
    let activePartner = $state<Partner | null>(null);
    let loadingThread = $state(false);
    let inputText = $state('');
    let sending = $state(false);
    let threadEl: HTMLDivElement | null = $state(null);

    function displayName(c: { nickname: string | null; discordName: string | null }) {
        return c.nickname ?? c.discordName ?? 'Survivor';
    }
    function initialOf(c: { nickname: string | null; discordName: string | null }) {
        return (displayName(c).charAt(0) ?? '?').toUpperCase();
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
        return `${Math.floor(days / 7)}w`;
    }

    function timeOf(d: string | Date) {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();
        const t = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toUpperCase();
        if (isToday) return `TODAY · ${t}`;
        if (isYesterday) return `YESTERDAY · ${t}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()} · ${t}`;
    }

    function dayLabel(d: string | Date): string {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    type Group = { label: string; key: string; msgs: Message[] };
    const grouped = $derived.by(() => {
        const out: Group[] = [];
        for (const m of activeMessages) {
            const key = new Date(m.createdAt).toDateString();
            const label = dayLabel(m.createdAt);
            if (!out.length || out[out.length - 1].key !== key) {
                out.push({ label, key, msgs: [m] });
            } else {
                out[out.length - 1].msgs.push(m);
            }
        }
        return out;
    });

    const filteredConvos = $derived.by(() => {
        let list = convos;
        if (activeFilter === 'unread') list = list.filter(c => c.unread > 0);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(c =>
                displayName(c).toLowerCase().includes(q) ||
                c.lastMessage.toLowerCase().includes(q)
            );
        }
        return list;
    });

    const totalCount = $derived(convos.length);
    const unreadCount = $derived(convos.filter(c => c.unread > 0).length);
    const partnerName = $derived(activePartner ? displayName(activePartner) : 'Survivor');
    const partnerInitial = $derived(activePartner ? initialOf(activePartner) : '?');
    // Placeholder — matches the standalone /messages/[userId] page that hardcoded 'C'.
    // Replace once we have a real avatar/identity system.
    const myInitial = 'C';

    async function setActive(userId: number) {
        if (activeWith === userId) return;
        activeWith = userId;
        const url = new URL(window.location.href);
        url.searchParams.set('tab', 'messages');
        url.searchParams.set('with', String(userId));
        history.pushState({}, '', url);
        await loadThread(userId);
    }

    async function loadThread(userId: number) {
        loadingThread = true;
        activeMessages = [];

        const inList = convos.find(c => c.userId === userId);
        activePartner = inList
            ? { id: userId, nickname: inList.nickname, discordName: inList.discordName }
            : null;

        try {
            const promises: Promise<Response | null>[] = [fetch(`/api/dms/${userId}`)];
            if (!inList) promises.push(fetch(`/api/users/${userId}`));
            const [msgsRes, userRes] = await Promise.all(promises);

            if (msgsRes?.ok) {
                activeMessages = await msgsRes.json();
            }
            if (userRes?.ok) {
                const u = await userRes.json();
                activePartner = { id: u.id, nickname: u.nickname, discordName: u.discordName };
            }
        } catch { /* fail silent — empty state will render */ }

        loadingThread = false;
        await tick();
        scrollToBottom();
    }

    function scrollToBottom() {
        if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
    }

    async function sendMessage() {
        const text = inputText.trim();
        if (!text || sending || !activeWith) return;
        sending = true;
        const tempId = Date.now();
        const optimistic: Message = {
            id: tempId,
            fromUserId: myId,
            toUserId: activeWith,
            message: text,
            createdAt: new Date().toISOString(),
            read: false
        };
        activeMessages = [...activeMessages, optimistic];
        inputText = '';
        await tick();
        scrollToBottom();

        try {
            const res = await fetch(`/api/dms/${activeWith}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            if (res.ok) {
                const saved = await res.json();
                activeMessages = activeMessages.map(m => m.id === tempId ? saved : m);
                // Refresh convo list so the preview + unread/lastAt update
                invalidateAll();
            }
        } catch { /* swallow — optimistic message stays */ }
        sending = false;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function clearActive() {
        activeWith = null;
        activeMessages = [];
        activePartner = null;
        const url = new URL(window.location.href);
        url.searchParams.delete('with');
        history.pushState({}, '', url);
    }

    // Sync activeWith from URL on mount + when URL changes (back/forward, deep-link)
    $effect(() => {
        const w = $page.url.searchParams.get('with');
        if (w) {
            const id = parseInt(w, 10);
            if (!isNaN(id) && id !== activeWith) {
                setActive(id);
            }
        } else if (activeWith !== null && !w) {
            activeWith = null;
            activeMessages = [];
            activePartner = null;
        }
    });

    onMount(() => {
        // Initial URL deep-link is handled by the $effect above
    });
</script>

<div class="messages-app" class:has-active={activeWith !== null}>

    <!-- LEFT: convo list -->
    <aside class="pane list-pane">
        <div class="list-pane-head">
            <div class="list-search">
                <svg class="list-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input type="text" class="list-search-input" placeholder="Search messages…" bind:value={search} />
            </div>
            <div class="list-tabs">
                <button class="list-tab" class:active={activeFilter === 'all'} onclick={() => activeFilter = 'all'}>All <span class="count">{totalCount}</span></button>
                <button class="list-tab" class:active={activeFilter === 'unread'} onclick={() => activeFilter = 'unread'}>Unread <span class="count">{unreadCount}</span></button>
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
                    <button type="button" class="convo" class:unread={c.unread > 0} class:active={activeWith === c.userId} onclick={() => setActive(c.userId)}>
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
                    </button>
                {/each}
            {/if}
        </div>
    </aside>

    <!-- RIGHT: active thread or empty state -->
    {#if activeWith}
        <section class="pane thread-pane">
            <div class="thread-head">
                <button class="thread-back" type="button" onclick={clearActive} aria-label="Back to conversations">‹</button>
                <div class="thread-head-avatar">
                    <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="2"/><text x="50" y="74" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{partnerInitial}</text></svg>
                    <div class="pip"></div>
                </div>
                <div class="thread-head-info">
                    <div class="thread-head-name"><a href="/survivors/{activeWith}" class="name-link">{partnerName}</a></div>
                    <div class="thread-head-meta"><span class="status">● Direct Message</span></div>
                </div>
                <div class="thread-head-actions">
                    <a class="head-btn" href="/survivors/{activeWith}" title="View Dossier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>
                </div>
            </div>

            <div class="thread-messages" bind:this={threadEl}>
                {#if loadingThread}
                    <div class="thread-loading">Loading messages…</div>
                {:else if activeMessages.length === 0}
                    <div class="msg system">
                        <div class="msg-body">
                            <div class="msg-text">— No messages yet. Send the first one below. —</div>
                        </div>
                    </div>
                {:else}
                    {#each grouped as g}
                        <div class="date-divider">{g.label}</div>
                        {#each g.msgs as m (m.id)}
                            {@const mine = m.fromUserId === myId}
                            <div class="msg">
                                <div class="msg-avatar">
                                    {#if mine}
                                        <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(255,215,0,0.18)" stroke="#ffd700" stroke-width="3"/><text x="50" y="76" font-family="Orbitron" font-size="56" font-weight="900" text-anchor="middle" fill="#fde047">{myInitial}</text></svg>
                                    {:else}
                                        <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="3"/><text x="50" y="76" font-family="Orbitron" font-size="56" font-weight="900" text-anchor="middle" fill="#7dd3fc">{partnerInitial}</text></svg>
                                    {/if}
                                </div>
                                <div class="msg-body">
                                    <div class="msg-meta">
                                        <span class="who" class:me={mine}>{mine ? 'You' : partnerName}</span>
                                        <span class="time">{timeOf(m.createdAt)}</span>
                                    </div>
                                    <div class="msg-text">{m.message}</div>
                                </div>
                            </div>
                        {/each}
                    {/each}
                {/if}
            </div>

            <div class="composer">
                <div class="composer-row">
                    <textarea class="composer-input" placeholder="Message {partnerName}…" rows="1"
                        bind:value={inputText}
                        onkeydown={onKeydown}></textarea>
                    <button class="composer-send" onclick={sendMessage} disabled={!inputText.trim() || sending}>Send <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                </div>
            </div>
        </section>
    {:else}
        <section class="pane thread-pane empty-thread">
            <div class="empty-thread-inner">
                <div class="empty-icon">✉</div>
                <div class="empty-title">Pick a Conversation</div>
                <div class="empty-flavor">"Select someone from the left to read or reply."</div>
            </div>
        </section>
    {/if}

</div>

<style>
.messages-app {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 14px;
    min-height: 600px;
    height: calc(100vh - 220px);
    max-height: 760px;
}
@media (max-width: 860px) {
    .messages-app { grid-template-columns: 1fr; }
    /* On mobile, show only one pane at a time */
    .messages-app .thread-pane { display: none; }
    .messages-app.has-active .list-pane { display: none; }
    .messages-app.has-active .thread-pane { display: flex; }
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
    content: ''; position: absolute; left: 0; top: 14px; bottom: 0; width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* ── LIST PANE ───────────────────────────────────────────────── */
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
    flex: 1;
    overflow-y: auto;
    padding: 6px 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.convo-list::-webkit-scrollbar { width: 5px; }
.convo-list::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.convo {
    width: 100%;
    display: grid; grid-template-columns: 36px 1fr auto;
    gap: 12px; align-items: center;
    padding: 10px 16px 10px 14px;
    cursor: pointer; transition: background 0.18s;
    border: none; border-left: 2px solid transparent; position: relative;
    text-align: left; color: inherit;
    background: transparent;
    font: inherit;
}
.convo:hover { background: rgba(0,180,255,0.04); }
.convo.active { background: rgba(0,180,255,0.10); border-left-color: var(--tek-blue); }
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

/* ── THREAD PANE ─────────────────────────────────────────────── */
.thread-head {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 22px; border-bottom: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
}
.thread-back {
    display: none;
    background: transparent; border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim); width: 28px; height: 28px;
    font-size: 1.2rem; cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
@media (max-width: 860px) { .thread-back { display: inline-flex; align-items: center; justify-content: center; } }

.thread-head-avatar { width: 36px; height: 40px; position: relative; flex-shrink: 0; }
.thread-head-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 5px rgba(0,180,255,0.40)); }
.thread-head-avatar .pip { position: absolute; bottom: 2px; right: -1px; width: 9px; height: 9px; border-radius: 50%; background: var(--tek-green); border: 2px solid #050812; box-shadow: 0 0 5px rgba(16,185,129,0.65); }
.thread-head-info { flex: 1; min-width: 0; line-height: 1.3; }
.thread-head-name { font-family: var(--tek-display); font-size: 1rem; font-weight: 800; letter-spacing: 0.06em; color: var(--tek-text); text-transform: uppercase; }
.thread-head-meta { font-family: var(--tek-mono); font-size: 0.6rem; color: var(--tek-text-dim); letter-spacing: 0.10em; margin-top: 2px; }
.thread-head-meta .status { color: var(--tek-green); }
.thread-head-actions { display: flex; gap: 6px; }
.head-btn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim); cursor: pointer; transition: all 0.18s;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    text-decoration: none;
}
.head-btn:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.30); background: rgba(0,180,255,0.06); }
.head-btn svg { width: 14px; height: 14px; }

.thread-messages {
    flex: 1; overflow-y: auto;
    padding: 18px 24px 12px;
    display: flex; flex-direction: column; gap: 16px;
    scrollbar-width: thin; scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.thread-messages::-webkit-scrollbar { width: 5px; }
.thread-messages::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.thread-loading { padding: 30px 20px; text-align: center; font-family: var(--tek-mono); font-size: 0.72rem; color: var(--tek-text-faint); letter-spacing: 0.10em; font-style: italic; }

.date-divider {
    display: flex; align-items: center; gap: 14px; margin: 6px 0;
    font-family: var(--tek-mono); font-size: 0.6rem;
    letter-spacing: 0.20em; color: var(--tek-text-faint); text-transform: uppercase;
}
.date-divider::before, .date-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); }

.msg { display: grid; grid-template-columns: 32px 1fr; gap: 11px; align-items: flex-start; position: relative; }
.msg-avatar { width: 32px; height: 36px; flex-shrink: 0; margin-top: 2px; }
.msg-avatar svg { width: 100%; height: 100%; }
.msg-body { min-width: 0; }
.msg-meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; font-family: var(--tek-mono); font-size: 0.6rem; }
.msg-meta .who    { color: #fcd34d; font-weight: 700; letter-spacing: 0.06em; }
.msg-meta .who.me { color: #7dd3fc; }
.msg-meta .time   { color: var(--tek-text-faint); letter-spacing: 0.06em; }
.msg-text { font-size: 0.86rem; color: var(--tek-text); line-height: 1.55; word-wrap: break-word; white-space: pre-wrap; }

.msg.system { grid-template-columns: 1fr; text-align: center; }
.msg.system .msg-text { font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.10em; color: var(--tek-text-faint); font-style: italic; }

/* ── COMPOSER ────────────────────────────────────────────────── */
.composer { padding: 14px 22px 16px; border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; }
.composer-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: stretch; }
.composer-input {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text); padding: 10px 14px;
    font-family: inherit; font-size: 0.88rem; outline: none;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: border-color 0.2s, background 0.2s;
    resize: none; line-height: 1.4; min-height: 42px; max-height: 120px;
}
.composer-input::placeholder { color: var(--tek-text-faint); }
.composer-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); background: rgba(0,15,35,0.92); }
.composer-send {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e; font-family: inherit;
    font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 10px 18px; border: none; cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
    transition: filter 0.18s, transform 0.18s;
    display: inline-flex; align-items: center; gap: 6px;
}
.composer-send:hover:not(:disabled) { filter: drop-shadow(0 0 16px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── EMPTY THREAD STATE ──────────────────────────────────────── */
.empty-thread { display: flex; align-items: center; justify-content: center; }
.empty-thread-inner { text-align: center; padding: 40px 30px; }
.empty-thread .empty-icon { font-size: 2.4rem; color: rgba(0,180,255,0.30); margin-bottom: 14px; }
.empty-thread .empty-title { font-family: var(--tek-display); font-size: 1.1rem; letter-spacing: 0.10em; color: var(--tek-text-dim); text-transform: uppercase; margin-bottom: 8px; }
.empty-thread .empty-flavor { font-family: var(--tek-serif), Georgia, serif; font-style: italic; font-size: 0.92rem; color: var(--tek-text-faint); }

/* Inline name link */
.name-link { color: inherit; text-decoration: none; transition: color 0.15s, text-shadow 0.15s; }
.name-link:hover { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); }
</style>
