<script lang="ts">
    import MessagesPanel from '$lib/components/MessagesPanel.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>⬡ TEKOS — Messages</title>
</svelte:head>

<div class="stage">
    {#snippet messagesSub()}
        <span class="prefix">›</span>
        <span class="stat-num">{data.convos.length}</span> CONVERSATIONS · <span class="stat-num green">{data.convos.reduce((s, c) => s + c.unread, 0)}</span> UNREAD
    {/snippet}
    <PageHeader title="Messages" subContent={messagesSub} />

    <MessagesPanel convos={data.convos} warRooms={data.warRooms} myId={data.myId} />
</div>

<style>
.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 1320px;
    margin: 0 auto;
}
.prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.stat-num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }
.stat-num.green { color: var(--tek-green); text-shadow: 0 0 5px rgba(16,185,129,0.5); }
</style>
