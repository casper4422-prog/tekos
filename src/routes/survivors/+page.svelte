<script lang="ts">
	import { Users, Search, Wifi, Dna, Shield } from 'lucide-svelte';
	import { onMount } from 'svelte';

	type Survivor = { id:number; nickname:string|null; email:string; bio:string|null; online:boolean; specimens:number; tribe:{name:string}|null };

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
			total = data.total; pages = data.pages;
		}
		loading = false;
	}

	function display(s: Survivor) { return s.nickname ?? s.email; }

	onMount(() => load());

	async function loadMore() { page++; await load(); }
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Survivors</h1>
			<div class="page-subtitle">{total} registered on TekOS</div>
		</div>
	</div>

	<div class="dir-controls">
		<div class="dir-search-row">
			<input class="form-control" placeholder="Search by name or email..." bind:value={q}
				onkeydown={(e) => e.key === 'Enter' && load(true)} />
			<button class="btn btn-primary" onclick={() => load(true)} disabled={loading}><Search size={14} /></button>
		</div>
		<label class="dir-online-toggle">
			<input type="checkbox" bind:checked={onlineOnly} onchange={() => load(true)} />
			Online only
		</label>
	</div>

	{#if loading && survivors.length === 0}
		<div class="dir-loading">Loading survivors...</div>
	{:else if survivors.length === 0}
		<div class="dir-empty">No survivors found.</div>
	{:else}
		<div class="dir-grid">
			{#each survivors as s}
				<a href="/survivors/{s.id}" class="cham-shell dir-card" style="--cut:9px;--cat-rgb:{s.online ? '34,197,94' : '71,85,105'}">
					<div class="dir-card-inner">
						<div class="dir-card-top">
							<div class="dir-online-dot" class:online={s.online}></div>
							<div class="dir-name">{display(s)}</div>
						</div>
						{#if s.tribe}<div class="dir-tribe"><Shield size={11} /> {s.tribe.name}</div>{/if}
						{#if s.bio}<div class="dir-bio">{s.bio}</div>{/if}
						<div class="dir-meta">
							<span><Dna size={11} /> {s.specimens} specimens</span>
							<span class="dir-status" class:online={s.online}>{s.online ? 'Online' : 'Offline'}</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
		{#if page < pages}
			<div style="text-align:center;margin-top:24px">
				<button class="btn btn-secondary" onclick={loadMore} disabled={loading}>{loading ? 'Loading...' : 'Load More'}</button>
			</div>
		{/if}
	{/if}
</div>

<style>
.dir-controls { display:flex; align-items:center; gap:14px; margin-bottom:24px; flex-wrap:wrap; }
.dir-search-row { display:flex; gap:8px; flex:1; min-width:200px; }
.dir-search-row .form-control { flex:1; }
.dir-online-toggle { display:flex; align-items:center; gap:7px; font-size:0.85rem; color:#94a3b8; cursor:pointer; white-space:nowrap; }
.dir-loading,.dir-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.88rem; }

.dir-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.dir-card { display:block; text-decoration:none; color:inherit; }
.dir-card-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:16px 18px; display:flex; flex-direction:column; gap:6px; }
.dir-card-top { display:flex; align-items:center; gap:8px; }
.dir-online-dot { width:8px; height:8px; border-radius:50%; background:#475569; flex-shrink:0; }
.dir-online-dot.online { background:#4ade80; box-shadow:0 0 6px rgba(74,222,128,0.6); }
.dir-name { font-size:0.95rem; font-weight:700; color:#f1f5f9; }
.dir-tribe { display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#a78bfa; }
.dir-bio { font-size:0.78rem; color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.5; }
.dir-meta { display:flex; align-items:center; justify-content:space-between; margin-top:4px; font-size:0.72rem; color:#475569; }
.dir-status { color:#475569; }
.dir-status.online { color:#4ade80; }
</style>
