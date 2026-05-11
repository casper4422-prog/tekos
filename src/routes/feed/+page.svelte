<script lang="ts">
	import { onMount } from 'svelte';
	import { Dna, Repeat2, Sword, Newspaper, ExternalLink, Rss, Plus, X, PlayCircle, Settings2 } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type ActivityEvent = { id:number; type:string; data:Record<string,unknown>; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type BossRecord    = { id:number; bossName:string; difficulty:string; outcome:string; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type Trade         = { id:number; creatureData:Record<string,unknown>; wanted:string|null; createdAt:string; user:{ id:number; nickname:string|null; email:string } };
	type ArkNews       = { title:string; link:string; date:string; description:string; author:string; type:'ark_news' };
	type YTVideo       = { title:string; link:string; date:string; thumbnail?:string; type:'youtube'; channelName:string };
	type FeedSource    = { id:number; type:string; url:string; label:string };

	const events       = data.events as ActivityEvent[];
	const bossRecords  = data.bossRecords as BossRecord[];
	const recentTrades = data.recentTrades as Trade[];

	let activeTab  = $state<'all'|'activity'|'boss'|'market'|'news'>('all');
	let showSources = $state(false);
	let arkNews    = $state<ArkNews[]>([]);
	let ytVideos   = $state<YTVideo[]>([]);
	let sources    = $state<FeedSource[]>([]);
	let newsLoaded = $state(false);

	// Add source form
	let addUrl   = $state('');
	let addLabel = $state('');
	let addType  = $state<'youtube'>('youtube');
	let adding   = $state(false);
	let addErr   = $state('');

	onMount(async () => {
		// Load ARK news
		const newsRes = await fetch('/api/ark-news');
		if (newsRes.ok) arkNews = await newsRes.json();
		newsLoaded = true;

		// Load user's feed sources
		const srcRes = await fetch('/api/feed-sources');
		if (srcRes.ok) sources = await srcRes.json();

		// Fetch YouTube videos for each YouTube source
		await fetchYouTubeSources();
	});

	async function fetchYouTubeSources() {
		const ytSources = sources.filter(s => s.type === 'youtube');
		const all: YTVideo[] = [];
		await Promise.all(ytSources.map(async (src) => {
			const res = await fetch(`/api/youtube-feed?url=${encodeURIComponent(src.url)}`);
			if (res.ok) {
				const d = await res.json();
				all.push(...(d.videos ?? []).map((v: YTVideo) => ({ ...v, channelName: src.label || d.channelName })));
			}
		}));
		ytVideos = all.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
	}

	async function addSource() {
		if (!addUrl.trim()) return;
		adding = true; addErr = '';

		if (addType === 'youtube') {
			// Validate by fetching first
			const check = await fetch(`/api/youtube-feed?url=${encodeURIComponent(addUrl.trim())}`);
			if (!check.ok) {
				const e = await check.json();
				addErr = e.error ?? 'Could not load that YouTube channel';
				adding = false; return;
			}
			const d = await check.json();
			const label = addLabel.trim() || d.channelName || addUrl.trim();
			const res = await fetch('/api/feed-sources', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ type:'youtube', url:addUrl.trim(), label }) });
			if (res.ok) {
				const entry = await res.json();
				sources = [...sources, entry];
				addUrl = ''; addLabel = '';
				// Fetch videos from new source
				const newVideos = (d.videos ?? []).map((v: YTVideo) => ({ ...v, channelName: label }));
				ytVideos = [...ytVideos, ...newVideos].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			}
		}
		adding = false;
	}

	async function removeSource(id: number) {
		await fetch('/api/feed-sources', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) });
		sources = sources.filter(s => s.id !== id);
		// Reload YouTube videos
		await fetchYouTubeSources();
	}

	function display(u: { nickname?:string|null; email?:string }) { return u.nickname ?? u.email ?? 'Unknown'; }

	function ago(dt: string): string {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff/60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m/60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h/24);
		return d === 1 ? 'yesterday' : `${d}d ago`;
	}

	function getTimeline() {
		type FI = { ts:number; kind:string; data:unknown };
		const items: FI[] = [];
		for (const e of events)      items.push({ ts:new Date(e.createdAt).getTime(), kind:'activity', data:e });
		for (const b of bossRecords) items.push({ ts:new Date(b.createdAt).getTime(), kind:'boss', data:b });
		for (const t of recentTrades)items.push({ ts:new Date(t.createdAt).getTime(), kind:'trade', data:t });
		for (const n of arkNews)     items.push({ ts:new Date(n.date).getTime(), kind:'news', data:n });
		for (const v of ytVideos)    items.push({ ts:new Date(v.date).getTime(), kind:'youtube', data:v });

		return items.filter(i =>
			activeTab === 'all' ||
			(activeTab === 'activity' && (i.kind === 'activity')) ||
			(activeTab === 'boss'     && i.kind === 'boss') ||
			(activeTab === 'market'   && i.kind === 'trade') ||
			(activeTab === 'news'     && (i.kind === 'news' || i.kind === 'youtube'))
		).sort((a,b) => b.ts - a.ts);
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Feed</h1>
			<div class="page-subtitle">Network activity · ARK news · Your creators</div>
		</div>
		<button class="btn btn-secondary btn-sm" onclick={() => showSources = !showSources}>
			<Settings2 size={13} /> {showSources ? 'Close' : 'Manage Sources'}
		</button>
	</div>

	<!-- Sources panel -->
	{#if showSources}
		<div class="cham-shell feed-sources-panel">
			<div class="feed-sources-inner">
				<div class="feed-src-title">Your Feed Sources</div>

				<!-- Current sources -->
				{#if sources.length === 0}
					<div class="feed-src-empty">No custom sources yet. Add a YouTube channel below.</div>
				{:else}
					<div class="feed-src-list">
						{#each sources as s}
							<div class="feed-src-row">
								<PlayCircle size={14} style="color:#ef4444;flex-shrink:0" />
								<div class="feed-src-info">
									<div class="feed-src-label">{s.label}</div>
									<div class="feed-src-url">{s.url}</div>
								</div>
								<button class="btn btn-danger btn-sm" onclick={() => removeSource(s.id)}><X size={12} /></button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Add YouTube channel -->
				<div class="feed-src-add">
					<div class="feed-src-add-title">Add YouTube Channel</div>
					<div class="feed-src-add-desc">Paste a YouTube channel URL (e.g. youtube.com/channel/UC...) to get their latest videos in your feed.</div>
					<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
						<input class="form-control" placeholder="https://www.youtube.com/channel/UC..." bind:value={addUrl} style="flex:2;min-width:200px" />
						<input class="form-control" placeholder="Display name (optional)" bind:value={addLabel} style="flex:1;min-width:140px" />
						<button class="btn btn-primary" onclick={addSource} disabled={adding || !addUrl.trim()}><Plus size={13} /> {adding ? 'Adding...' : 'Add'}</button>
					</div>
					{#if addErr}<div class="tek-login-error" style="margin-top:8px">{addErr}</div>{/if}
					<div class="feed-src-hint">Also works with youtube.com/@handle URLs. The latest 5 videos will appear under the News tab.</div>
				</div>

				<!-- Official links -->
				<div class="feed-src-official">
					<div class="feed-src-title" style="margin-bottom:8px">Official ARK Sources (always included)</div>
					<div class="feed-official-links">
						<a href="https://survivetheark.com" target="_blank" rel="noopener" class="feed-official-link">
							<Rss size={13} /> survivetheark.com
						</a>
						<a href="https://store.steampowered.com/news/app/2399830" target="_blank" rel="noopener" class="feed-official-link">
							<Newspaper size={13} /> Steam News
						</a>
						<a href="https://twitter.com/playstudiosark" target="_blank" rel="noopener" class="feed-official-link">
							<ExternalLink size={13} /> Twitter / X
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<div class="tek-tab-bar">
		<button class="tek-tab" class:active={activeTab==='all'}      onclick={() => activeTab='all'}>All</button>
		<button class="tek-tab" class:active={activeTab==='activity'} onclick={() => activeTab='activity'}><Dna size={13} /> Activity</button>
		<button class="tek-tab" class:active={activeTab==='boss'}     onclick={() => activeTab='boss'}><Sword size={13} /> Boss Fights</button>
		<button class="tek-tab" class:active={activeTab==='market'}   onclick={() => activeTab='market'}><Repeat2 size={13} /> Marketplace</button>
		<button class="tek-tab" class:active={activeTab==='news'}     onclick={() => activeTab='news'}><Newspaper size={13} /> News & Creators</button>
	</div>

	<div class="feed-list">
		{#each getTimeline() as item}
			{#if item.kind === 'activity'}
				{@const e = item.data as ActivityEvent}
				{@const color = e.type === 'creature_add' ? '34,197,94' : e.type === 'trade_list' ? '59,130,246' : '0,180,255'}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:{color}">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba({color},0.12);color:rgb({color})"><Dna size={14} /></div>
						<div class="feed-content">
							<div class="feed-text"><a href="/survivors/{e.user.id}" class="feed-name">{display(e.user)}</a> <span class="feed-action">{e.type.replace(/_/g,' ')}</span></div>
							{#if e.data.species}<div class="feed-detail">{String(e.data.species)} — {String(e.data.name ?? '')} {e.data.level ? `· Lvl ${e.data.level}` : ''}</div>{/if}
						</div>
						<div class="feed-time">{ago(e.createdAt)}</div>
					</div>
				</div>

			{:else if item.kind === 'boss'}
				{@const b = item.data as BossRecord}
				{@const win = b.outcome === 'success'}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:{win?'34,197,94':'239,68,68'}">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba({win?'34,197,94':'239,68,68'},0.12);color:rgb({win?'34,197,94':'239,68,68'})"><Sword size={14} /></div>
						<div class="feed-content">
							<div class="feed-text"><a href="/survivors/{b.user.id}" class="feed-name">{display(b.user)}</a> <span class="feed-action">{win ? 'defeated' : 'fell to'}</span></div>
							<div class="feed-detail">{b.bossName} · {b.difficulty.toUpperCase()} · <span style="color:{win?'#4ade80':'#f87171'}">{win?'Victory':'Defeat'}</span></div>
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
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:245,158,11">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba(245,158,11,0.12);color:rgb(245,158,11)"><Newspaper size={14} /></div>
						<div class="feed-content">
							<div class="feed-news-src">Studio Wildcard · ARK News</div>
							<div class="feed-news-title">{n.title}</div>
							{#if n.description}<div class="feed-detail">{n.description}...</div>{/if}
						</div>
						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
							<div class="feed-time">{n.date ? new Date(n.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</div>
							{#if n.link}
								<a href={n.link} target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:4px">Read <ExternalLink size={10} /></a>
							{/if}
						</div>
					</div>
				</div>

			{:else if item.kind === 'youtube'}
				{@const v = item.data as YTVideo}
				<div class="cham-shell feed-item" style="--cut:7px;--cat-rgb:239,68,68">
					<div class="feed-item-inner">
						<div class="feed-icon" style="background:rgba(239,68,68,0.12);color:#ef4444"><PlayCircle size={14} /></div>
						<div class="feed-content">
							<div class="feed-news-src">{v.channelName} · YouTube</div>
							<div class="feed-news-title">{v.title}</div>
						</div>
						<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
							<div class="feed-time">{v.date ? new Date(v.date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</div>
							<a href={v.link} target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="display:flex;align-items:center;gap:4px">Watch <ExternalLink size={10} /></a>
						</div>
					</div>
				</div>
			{/if}
		{/each}

		{#if getTimeline().length === 0}
			<div class="feed-empty">
				{#if activeTab === 'news' && !newsLoaded}
					Loading news...
				{:else if activeTab === 'news'}
					No news loaded. Check back later or add YouTube channels via "Manage Sources".
				{:else}
					Nothing here yet. Add friends and log boss fights to fill your feed.
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
/* Sources panel */
.feed-sources-panel { margin-bottom:16px; }
.feed-sources-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:18px 20px; border-left:2px solid rgba(0,180,255,0.25); display:flex; flex-direction:column; gap:14px; }
.feed-src-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; }
.feed-src-empty { font-size:0.82rem; color:#334155; }
.feed-src-list { display:flex; flex-direction:column; gap:5px; }
.feed-src-row { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.03); padding:8px 12px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.feed-src-info { flex:1; min-width:0; }
.feed-src-label { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.feed-src-url { font-size:0.7rem; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.feed-src-add { background:rgba(255,255,255,0.03); padding:12px 14px; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.feed-src-add-title { font-size:0.8rem; font-weight:600; color:#f1f5f9; margin-bottom:4px; }
.feed-src-add-desc { font-size:0.76rem; color:#64748b; }
.feed-src-hint { font-size:0.72rem; color:#334155; margin-top:8px; }
.feed-src-official { }
.feed-official-links { display:flex; gap:8px; flex-wrap:wrap; }
.feed-official-link { display:flex; align-items:center; gap:5px; font-size:0.76rem; color:#64748b; text-decoration:none; background:rgba(255,255,255,0.04); padding:5px 11px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); transition:color .15s; }
.feed-official-link:hover { color:#94a3b8; }

/* Feed items */
.feed-list { display:flex; flex-direction:column; gap:5px; max-width:720px; }
.feed-item { }
.feed-item-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 14px; display:flex; align-items:flex-start; gap:12px; }
.feed-icon { width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.feed-content { flex:1; min-width:0; }
.feed-text { font-size:0.85rem; color:#94a3b8; line-height:1.4; }
.feed-name { color:#f1f5f9; font-weight:600; text-decoration:none; }
.feed-name:hover { color:#00b4ff; }
.feed-action { color:#64748b; }
.feed-detail { font-size:0.77rem; color:#475569; margin-top:2px; font-style:italic; }
.feed-time { font-size:0.67rem; color:#334155; white-space:nowrap; flex-shrink:0; margin-top:2px; }
.feed-news-src { font-size:0.67rem; color:rgb(var(--cat-rgb,0,180,255)); font-weight:700; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:3px; }
.feed-news-title { font-size:0.9rem; font-weight:600; color:#f1f5f9; line-height:1.35; }
.feed-empty { color:#475569; text-align:center; padding:40px 0; font-size:0.88rem; }
</style>
