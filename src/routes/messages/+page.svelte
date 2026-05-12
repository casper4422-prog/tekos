<script lang="ts">
    import { MessageSquare, ChevronRight } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    let { data }: { data: PageData } = $props();

    type Convo = {
        userId: number;
        nickname: string | null;
        email: string;
        lastMessage: string;
        lastAt: string;
        unread: number;
    };
    const convos = $derived(data.convos as Convo[]);

    function displayName(c: Convo) { return c.nickname ?? c.email.split('@')[0]; }

    function relTime(d: string) {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days}d`;
        return new Date(d).toLocaleDateString();
    }

    const totalUnread = $derived(convos.reduce((s, c) => s + c.unread, 0));
</script>

<svelte:head>
    <title>⬡ TekOS — Messages</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Messages"
        crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Messages' }]}
        sub={convos.length === 0
            ? "No conversations yet — start one from a Survivor's profile."
            : `${convos.length} conversations · ${totalUnread} unread`}
        subMono={true}
    />

    {#if convos.length === 0}
        <div class="tek-empty">
            <div class="icon"><MessageSquare size={26} strokeWidth={1.5} /></div>
            <div class="title">No messages</div>
            <div class="flavor">"Find a Survivor in Friends or Survivors and tap message."</div>
            <div style="margin-top: 16px;">
                <a class="tek-btn-v2 solid" href="/survivors">BROWSE SURVIVORS</a>
            </div>
        </div>
    {:else}
        <div class="convo-list">
            {#each convos as c}
                <a class="convo" class:unread={c.unread > 0} href="/messages/{c.userId}">
                    <HexAvatar name={displayName(c)} size={48} showPip={false} />
                    <div class="convo-body">
                        <div class="convo-head">
                            <div class="convo-name">{displayName(c)}</div>
                            <div class="convo-time">{relTime(c.lastAt)}</div>
                        </div>
                        <div class="convo-preview">{c.lastMessage}</div>
                    </div>
                    {#if c.unread > 0}
                        <div class="convo-badge">{c.unread}</div>
                    {:else}
                        <ChevronRight size={16} strokeWidth={2} class="convo-chevron" />
                    {/if}
                </a>
            {/each}
        </div>
    {/if}
</div>

<style>
.convo-list { display: flex; flex-direction: column; gap: 6px; }

.convo {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
    position: relative;
}
.convo:hover {
    background: rgba(10,18,44,0.7);
    border-color: var(--tek-blue-border);
    transform: translateX(2px);
}
.convo.unread {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border-color: rgba(0,180,255,0.30);
}
.convo.unread::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 12px;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

.convo-body { flex: 1; min-width: 0; }
.convo-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 3px; }
.convo-name {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.convo-time {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    flex-shrink: 0;
}
.convo-preview {
    font-size: 0.84rem;
    color: var(--tek-text-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
}
.convo.unread .convo-preview { color: var(--tek-text); }

.convo-badge {
    background: var(--tek-blue);
    color: #050812;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
    flex-shrink: 0;
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.convo :global(.convo-chevron) { color: var(--tek-text-faint); flex-shrink: 0; }
</style>
