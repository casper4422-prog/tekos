<script lang="ts">
    import { Send, ArrowLeft } from 'lucide-svelte';
    import { onMount, tick } from 'svelte';
    import type { PageData } from './$types';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    let { data }: { data: PageData } = $props();

    type Message = { id: number; fromUserId: number; toUserId: number; message: string; createdAt: string | Date; read: boolean };

    let messages = $state<Message[]>(data.messages as unknown as Message[]);
    let input = $state('');
    let sending = $state(false);
    let scrollEl: HTMLDivElement;

    const other = $derived(data.other);
    const otherName = $derived(other?.nickname ?? other?.email?.split('@')[0] ?? 'Survivor');

    async function send() {
        const text = input.trim();
        if (!text || sending) return;
        sending = true;
        const tempId = Date.now();
        messages = [...messages, {
            id: tempId,
            fromUserId: data.myId,
            toUserId: other!.id,
            message: text,
            createdAt: new Date().toISOString(),
            read: false
        }];
        input = '';
        await tick();
        scrollToBottom();
        try {
            const res = await fetch('/api/dms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toUserId: other!.id, message: text })
            });
            if (res.ok) {
                const body = await res.json();
                // Replace temp with server version
                messages = messages.map(m => m.id === tempId ? body.message : m);
            }
        } catch {}
        sending = false;
    }

    function scrollToBottom() {
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    }

    onMount(() => {
        scrollToBottom();
    });

    function timeOf(d: string | Date) {
        return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function dateOf(d: string | Date) {
        return new Date(d).toLocaleDateString();
    }

    // Group messages by day for separators
    type Group = { date: string; msgs: Message[] };
    const grouped = $derived(() => {
        const out: Group[] = [];
        for (const m of messages) {
            const d = dateOf(m.createdAt);
            if (!out.length || out[out.length - 1].date !== d) out.push({ date: d, msgs: [m] });
            else out[out.length - 1].msgs.push(m);
        }
        return out;
    });
</script>

<svelte:head>
    <title>⬡ TekOS — {otherName}</title>
</svelte:head>

<div class="thread-page">
    <!-- Header bar -->
    <header class="thread-head">
        <a class="back-btn" href="/messages" title="Back to inbox">
            <ArrowLeft size={16} strokeWidth={2.5} />
        </a>
        <HexAvatar name={otherName} size={40} showPip={false} />
        <div class="thread-info">
            <div class="thread-name">{otherName}</div>
            <div class="thread-sub">Direct Message</div>
        </div>
        <a class="tek-btn-v2 ghost sm" href="/survivors/{other?.id}">View profile</a>
    </header>

    <!-- Messages stream -->
    <div class="thread-stream" bind:this={scrollEl}>
        {#if messages.length === 0}
            <div class="empty">
                <div class="empty-title">No messages yet</div>
                <div class="empty-flavor">"The first word is yours."</div>
            </div>
        {:else}
            {#each grouped() as g}
                <div class="day-separator"><span>{g.date}</span></div>
                {#each g.msgs as m (m.id)}
                    {@const mine = m.fromUserId === data.myId}
                    <div class="bubble-row" class:mine>
                        {#if !mine}<HexAvatar name={otherName} size={28} showPip={false} />{/if}
                        <div class="bubble" class:mine>
                            <div class="bubble-text">{m.message}</div>
                            <div class="bubble-time">{timeOf(m.createdAt)}</div>
                        </div>
                    </div>
                {/each}
            {/each}
        {/if}
    </div>

    <!-- Composer -->
    <form class="composer" onsubmit={(e) => { e.preventDefault(); send(); }}>
        <input class="composer-input" type="text"
            bind:value={input}
            placeholder="Send a message to {otherName}…"
            autocomplete="off" />
        <button class="composer-send" type="submit" disabled={!input.trim() || sending}>
            <Send size={14} strokeWidth={2.5} />
        </button>
    </form>
</div>

<style>
.thread-page {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: calc(100vh - 0px);
    max-width: 900px;
    margin: 0 auto;
    padding: 0 16px;
}
.thread-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 4px 14px;
    border-bottom: 1px solid rgba(0,180,255,0.15);
}
.back-btn {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    background: rgba(0,180,255,0.06);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    text-decoration: none;
    transition: all 0.15s;
}
.back-btn:hover { background: rgba(0,180,255,0.18); }
.thread-info { flex: 1; min-width: 0; }
.thread-name {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.thread-sub {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 2px;
}

.thread-stream {
    flex: 1;
    overflow-y: auto;
    padding: 18px 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.day-separator {
    text-align: center;
    margin: 10px 0;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    position: relative;
}
.day-separator span {
    background: var(--tek-bg);
    padding: 0 12px;
    position: relative;
    z-index: 1;
}
.day-separator::before {
    content: '';
    position: absolute;
    top: 50%; left: 0; right: 0;
    height: 1px;
    background: rgba(100,116,139,0.15);
}

.bubble-row {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    padding: 4px 0;
}
.bubble-row.mine { justify-content: flex-end; }
.bubble {
    max-width: 70%;
    padding: 9px 14px;
    background: rgba(10,18,44,0.85);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
}
.bubble.mine {
    background: linear-gradient(135deg, rgba(0,180,255,0.18), rgba(139,92,246,0.14));
    border-color: var(--tek-blue);
    box-shadow: 0 0 10px rgba(0,180,255,0.15);
}
.bubble-text {
    font-size: 0.94rem;
    color: var(--tek-text);
    line-height: 1.4;
    word-wrap: break-word;
    white-space: pre-wrap;
}
.bubble-time {
    margin-top: 4px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    text-align: right;
}

.composer {
    display: flex;
    gap: 8px;
    padding: 14px 0 18px;
    border-top: 1px solid rgba(0,180,255,0.10);
}
.composer-input {
    flex: 1;
    background: rgba(5,8,18,0.7);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-text);
    font-family: var(--tek-font);
    font-size: 0.95rem;
    padding: 11px 14px;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
}
.composer-input::placeholder { color: var(--tek-text-faint); }
.composer-input:focus {
    outline: none;
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 12px rgba(0,180,255,0.25);
}
.composer-send {
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    border: none;
    padding: 0 18px;
    cursor: pointer;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    transition: all 0.15s;
    display: flex; align-items: center; justify-content: center;
}
.composer-send:hover:not(:disabled) {
    box-shadow: 0 0 12px rgba(0,180,255,0.45);
}
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; }

.empty { text-align: center; padding: 60px 20px; }
.empty-title {
    font-family: var(--tek-display);
    font-size: 1rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 6px;
}
.empty-flavor {
    font-family: var(--tek-serif);
    font-style: italic;
    color: var(--tek-text-faint);
}
</style>
