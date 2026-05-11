<script lang="ts">
	import { onMount } from 'svelte';
	import { Dna, Repeat2, Sword, UserPlus, Shield, Newspaper, ExternalLink, Rss } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type ActivityEvent = { id:number; type:string; data:Record<string,unknown>; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type BossRecord    = { id:number; bossName:string; difficulty:string; outcome:string; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type Trade         = { id:number; creatureData:Record<string,unknown>; wanted:string|null; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type ArkNews       = { title:string; link:string; date:string; description:string; type:'ark_news' };

	const events      = data.events as ActivityEvent[];
	const bossRecords = data.bossRecords as BossRecord[];
	const recentTrades = data.recentTrades as Trade[];

	let arkNews    = $state<ArkNews[]>([]);
	let newsLoaded = $state(false);
	let activeTab  = $state<'all'|'activity'|'boss'|'market'|'news'>('all');

	onMount(async () => {
		const res = await fetch('/api/ark-news');
		if (res.ok) arkNews = await res.json();
		newsLoaded = true;
	});

	function display(u: { nickname?:string|null; email?:string }) { return u.nickname ?? u.email ?? 'Unknown'; }

	function ago(dt: string): string {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		return d === 1 ? 'yesterday' : `${d}d ago`;
	}

	// Build a combined timeline
	type FeedItem = { ts: number; kind: 'activity'|'boss'|'trade'|'news'; data: unknown };

	function getTimeline(): FeedItem[] {
		const items: FeedItem[] = [];

		for (const e of events) items.push({ ts: new Date(e.createdAt).getTime(), kind:'activity', data:e });
		for (const b of bossRecords) items.push({ ts: new Date(b.createdAt).getTime(), kind:'boss', data:b });
		for (const t of recentTrades) items.push({ ts: new Date(t.createdAt).getTime(), kind:'trade', data:t });
		for (const n of arkNews) items.push({ ts: new Date(n.date).getTime(), kind:'news', data:n });

		return items
			.filter(i => activeTab === 'all' || (
				activeTab === 'activity' && i.kind === 'activity' ||
				activeTab === 'boss'     && i.kind === 'boss' ||
				activeTab === 'market'   && i.kind === 'trade' ||
				activeTab === 'news'     && i.kind === 'news'
			))
			.sort((a, b) => b.ts - a.ts);
	}

	const ACTIVITY_CONFIG: Record<string, { label:string; color:string }> = {
		creature_add: { label:'added a specimen',    color:'34,197,94' },
		trade_list:   { label:'listed for trade',    color:'59,130,246' },
		friend_add:   { label:'made a new friend',   color:'139,92,246' },
		tribe_join:   { label:'joined a tribe',      color:'245,158,11' },
	};
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Feed</h1>
			<div class="page-subtitle">Your network · ARK news · marketplace activity</div>
		</div>
	</div>

	<div class="tek-tab-bar">
		<button class="tek-tab" class:active={activeTab==='all'}      onclick={() => activeTab='all'}>All</button>
		<button class="tek-tab" class:active={activeTab==='activity'} onclick={() => activeTab='activity'}><Dna size={13} /> Activity</button>
		<button class="tek-tab" class:active={activeTab==='boss'}     onclick={() => activeTab='boss'}><Sword size={13} /> Boss Fights</button>
		<button class="tek-tab" class:active={activeTab==='market'}   onclick={() => activeTab='market'}><Repeat2 size={13} /> Marketplace</button>
		<button class="tek-tab" class:active={activeTab==='news'}     onclick={() => activeTab='news'}><Newspaper size={13} /> ARK News</button>
	</div>

	{#if data.friendCount === 0 && activeTab !== 'news'}
		<div class="feed-cta">
			<Users size={32} style="color:#334155;margin-bottom:8px" />
			<div>Add survivors from the <a href="/friends" style="color:#7dd3fc">Network</a> page to see their activity here.</div>
		</div>
	{/if}

	<div class="feed-list">
		{#each getTimeline() as item}
			{#if item.kind === 'activity'}
				{@const e = item.data as ActivityEvent}
				{@const cfg = ACTIVITY_CONFIG[e.type] ?? { label:e.type.replace(/_/g,' '), color:'0,180,255' }}
				{@const d = e.data}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:{cfg.color}">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba({cfg.color},0.12);color:rgb({cfg.color})"><Dna size={14} /></div>
						<div class="feed-content">
							<div class="feed-text"><a href="/survivors/{e.user.id}" class="feed-name">{display(e.user)}</a> <span class="feed-action">{cfg.label}</span></div>
							{#if d.species || d.name}
								<div class="feed-detail">{String(d.species ?? '')} — {String(d.name ?? '')}{d.level ? ` · Lvl ${d.level}` : ''}</div>
							{/if}
						</div>
						<div class="feed-time">{ago(e.createdAt)}</div>
					</div>
				</div>

			{:else if item.kind === 'boss'}
				{@const b = item.data as BossRecord}
				{@const win = b.outcome === 'success'}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:{win ? '34,197,94' : '239,68,68'}">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba({win ? '34,197,94' : '239,68,68'},0.12);color:rgb({win ? '34,197,94' : '239,68,68'})"><Sword size={14} /></div>
						<div class="feed-content">
							<div class="feed-text">
								<a href="/survivors/{b.user.id}" class="feed-name">{display(b.user)}</a>
								<span class="feed-action"> {win ? 'defeated' : 'fell to'}</span>
							</div>
							<div class="feed-detail">{b.bossName} · {b.difficulty.toUpperCase()} · <span style="color:{win ? '#4ade80' : '#f87171'}">{win ? 'Victory' : 'Defeat'}</span></div>
						</div>
						<div class="feed-time">{ago(b.createdAt)}</div>
					</div>
				</div>

			{:else if item.kind === 'trade'}
				{@const t = item.data as Trade}
				{@const cd = (t.creatureData ?? {}) as Record<string,unknown>}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:59,130,246">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba(59,130,246,0.12);color:rgb(59,130,246)"><Repeat2 size={14} /></div>
						<div class="feed-content">
							<div class="feed-text"><a href="/survivors/{t.user.id}" class="feed-name">{display(t.user)}</a> <span class="feed-action">listed for trade</span></div>
							<div class="feed-detail">{String(cd.species ?? '?')} — {String(cd.name ?? 'Unnamed')}{t.wanted ? ` · Wants: ${t.wanted}` : ''}</div>
						</div>
						<div class="feed-time">{ago(t.createdAt)}</div>
					</div>
				</div>

			{:else if item.kind === 'news'}
				{@const n = item.data as ArkNews}
				<div class="cham-shell feed-item feed-news" style="--cut:7px;--cat-rgb:245,158,11">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba(245,158,11,0.12);color:rgb(245,158,11)"><Newspaper size={14} /></div>
						<div class="feed-content">
							<div class="feed-text feed-news-source">Wildcard · Community Crunch</div>
							<div class="feed-news-title">{n.title}</div>
							{#if n.description}<div class="feed-detail">{n.description}...</div>{/if}
						</div>
						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
							<div class="feed-time">{n.date ? new Date(n.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</div>
							<a href={n.link} target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:4px">Read <ExternalLink size={10} /></a>
						</div>
					</div>
				</div>
			{/if}
		{/each}

		{#if getTimeline().length === 0}
			<div class="feed-empty">
				{#if activeTab === 'news' && !newsLoaded}
					<Rss size={24} style="color:#334155;margin-bottom:8px" />
					Loading ARK news...
				{:else if activeTab === 'news'}
					<Rss size={24} style="color:#334155;margin-bottom:8px" />
					No ARK news loaded. Check your connection.
				{:else}
					Nothing here yet. Add friends and log boss fights to fill your feed.
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
.feed-cta { text-align:center; padding:28px; color:#64748b; font-size:0.88rem; display:flex; flex-direction:column; align-items:center; gap:6px; margin-bottom:16px; }
.feed-cta a { color:#7dd3fc; text-decoration:none; }

.feed-list { display:flex; flex-direction:column; gap:5px; max-width:720px; }
.feed-item { }
.feed-item-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:flex-start; gap:12px; }
.feed-icon { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.feed-content { flex:1; min-width:0; }
.feed-text { font-size:0.86rem; color:#94a3b8; line-height:1.4; }
.feed-name { color:#f1f5f9; font-weight:600; text-decoration:none; }
.feed-name:hover { color:#00b4ff; }
.feed-action { color:#64748b; }
.feed-detail { font-size:0.78rem; color:#475569; margin-top:3px; font-style:italic; }
.feed-time { font-size:0.68rem; color:#334155; white-space:nowrap; flex-shrink:0; margin-top:2px; }

.feed-news-source { font-size:0.68rem; color:#f59e0b; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:4px; }
.feed-news-title { font-size:0.9rem; font-weight:600; color:#f1f5f9; line-height:1.35; }

.feed-empty { color:#475569; text-align:center; padding:48px 0; font-size:0.88rem; display:flex; flex-direction:column; align-items:center; gap:6px; }
</style>
