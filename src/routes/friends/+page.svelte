<script lang="ts">
	import { UserPlus, Check, X, Search, MessageSquare, Dna, Wifi, WifiOff } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Friend  = { id:number; friendId:number; nickname:string|null; email:string; discordName?:string|null; online:boolean };
	type Request = { id:number; fromId?:number; toId?:number; nickname:string|null; email:string; discordName?:string|null };

	let friends  = $state<Friend[]>(data.friends as Friend[]);
	let incoming = $state<Request[]>(data.incoming as Request[]);
	let sent     = $state<Request[]>(data.sent as Request[]);
	let searchQ  = $state('');
	let searchResults = $state<Record<string,unknown>[]>([]);
	let searching = $state(false);
	let viewingCreatures = $state<{ name:string; creatures:Record<string,unknown>[] } | null>(null);

	function display(f: { nickname?:string|null; email?:string }) { return f.nickname ?? f.email ?? 'Unknown'; }

	async function doSearch() {
		if (!searchQ.trim()) { searchResults = []; return; }
		searching = true;
		const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`);
		searchResults = res.ok ? await res.json() : [];
		searching = false;
	}

	async function sendRequest(userId: number, btn: HTMLButtonElement) {
		btn.disabled = true;
		const res = await fetch('/api/friends', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ friendUserId: userId }) });
		if (res.ok) searchResults = searchResults.map(u => u.id === userId ? { ...u, friendStatus:'pending' } : u);
		else btn.disabled = false;
	}

	async function respond(id: number, action: 'accept'|'reject') {
		const res = await fetch(`/api/friends/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }) });
		if (res.ok) { incoming = incoming.filter(r => r.id !== id); if (action === 'accept') location.reload(); }
	}

	async function cancel(id: number) {
		await fetch(`/api/friends/${id}`, { method:'DELETE' });
		sent = sent.filter(r => r.id !== id);
	}

	async function remove(id: number) {
		if (!confirm('Remove this survivor from your network?')) return;
		await fetch(`/api/friends/${id}`, { method:'DELETE' });
		friends = friends.filter(f => f.id !== id);
	}

	async function viewCreatures(friendId: number, name: string) {
		const res = await fetch(`/api/users/${friendId}/creatures`);
		viewingCreatures = { name, creatures: res.ok ? await res.json() : [] };
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Network</h1>
			<div class="page-subtitle">{friends.length} survivor{friends.length !== 1 ? 's' : ''} connected</div>
		</div>
	</div>

	<!-- Search -->
	<div class="net-search-row">
		<input class="form-control" placeholder="Search survivors by name, email, or Discord..." bind:value={searchQ}
			onkeydown={(e) => e.key === 'Enter' && doSearch()} />
		<button class="btn btn-primary" onclick={doSearch} disabled={searching}>
			<Search size={14} />{searching ? 'Searching...' : 'Search'}
		</button>
	</div>

	{#if searchResults.length > 0}
		<div class="net-section">
			<div class="net-section-title">Search Results</div>
			{#each searchResults as u}
				{@const status = u.friendStatus as string|null}
				<div class="cham-shell net-row" style="--cut:6px">
					<div class="net-row-inner">
						<div class="net-user-info">
							<div class="net-uname">{u.nickname ?? u.email}</div>
							{#if u.discordName}<div class="net-umeta">Discord: {u.discordName}</div>{/if}
						</div>
						<div class="net-actions">
							{#if status === 'accepted'}
								<span class="net-tag accepted">Connected</span>
							{:else if status === 'pending'}
								<span class="net-tag pending">Pending</span>
							{:else}
								<button class="btn btn-primary btn-sm" onclick={(e) => sendRequest(u.id as number, e.currentTarget)}>
									<UserPlus size={13} />Add
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if incoming.length > 0}
		<div class="net-section">
			<div class="net-section-title">Incoming Requests <span class="net-badge">{incoming.length}</span></div>
			{#each incoming as r}
				<div class="cham-shell net-row" style="--cut:6px">
					<div class="net-row-inner">
						<div class="net-user-info">
							<div class="net-uname">{display(r)}</div>
							{#if r.discordName}<div class="net-umeta">Discord: {r.discordName}</div>{/if}
						</div>
						<div class="net-actions">
							<button class="btn btn-primary btn-sm" onclick={() => respond(r.id,'accept')}><Check size={13} />Accept</button>
							<button class="btn btn-danger  btn-sm" onclick={() => respond(r.id,'reject')}><X     size={13} />Decline</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if sent.length > 0}
		<div class="net-section">
			<div class="net-section-title">Pending Outbound</div>
			{#each sent as r}
				<div class="cham-shell net-row" style="--cut:6px">
					<div class="net-row-inner">
						<div class="net-user-info">
							<div class="net-uname">{display(r)}</div>
							<div class="net-umeta">Awaiting response...</div>
						</div>
						<div class="net-actions">
							<button class="btn btn-secondary btn-sm" onclick={() => cancel(r.id)}>Cancel</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="net-section">
		<div class="net-section-title">Your Network</div>
		{#if friends.length === 0}
			<div class="net-empty">No connections yet. Search for survivors above.</div>
		{:else}
			<div class="net-grid">
				{#each friends as f}
					<div class="cham-shell net-friend" style="--cat-rgb:{f.online ? '34,197,94' : '71,85,105'}">
						<div class="net-friend-inner">
							<div class="net-dot" class:online={f.online}>
								{#if f.online}<Wifi size={10} />{:else}<WifiOff size={10} />{/if}
							</div>
							<div class="net-user-info">
								<div class="net-uname">{display(f)}</div>
								{#if f.discordName}<div class="net-umeta">Discord: {f.discordName}</div>{/if}
								<div class="net-status" class:online={f.online}>{f.online ? 'Online' : 'Offline'}</div>
							</div>
							<div class="net-actions">
								<a href="/messages/{f.friendId}" class="btn btn-secondary btn-sm"><MessageSquare size={13} /></a>
								<button class="btn btn-secondary btn-sm" onclick={() => viewCreatures(f.friendId, display(f))}><Dna size={13} /></button>
								<button class="btn btn-danger btn-sm" onclick={() => remove(f.id)}>Remove</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if viewingCreatures}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:680px">
		<div class="modal-header">
			<h2 class="modal-title">{viewingCreatures.name}'s Specimens</h2>
			<button class="close-btn" onclick={() => viewingCreatures = null}>&times;</button>
		</div>
		<div class="modal-body">
			{#if viewingCreatures.creatures.length === 0}
				<div style="color:#64748b;padding:20px 0">No specimens yet.</div>
			{:else}
				<div class="net-cgrid">
					{#each viewingCreatures.creatures as c}
						{@const cd = c as Record<string,unknown>}
						{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
						<div class="cham-shell" style="--cut:6px">
							<div class="net-ccard">
								<div class="net-c-species">{String(cd.species ?? '?')}</div>
								<div class="net-c-sub">{String(cd.name ?? 'Unnamed')} · Lvl {Number(cd.level ?? 1)} · {String(cd.gender ?? '?')}</div>
								<div class="net-c-stats">
									<span>HP {(bs.Health ?? 0).toLocaleString()}</span>
									<span>Mel {bs.Melee ?? 0}%</span>
									<span>Wgt {(bs.Weight ?? 0).toLocaleString()}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
.net-search-row { display:flex; gap:10px; margin-bottom:24px; }
.net-search-row .form-control { flex:1; }
.net-search-row .btn { display:flex; align-items:center; gap:6px; flex-shrink:0; }

.net-section { margin-bottom:28px; }
.net-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
.net-badge { background:rgba(0,180,255,0.12); color:#00b4ff; border:1px solid rgba(0,180,255,0.3); border-radius:99px; padding:1px 8px; font-size:0.62rem; font-weight:800; }
.net-empty { color:#475569; padding:24px 0; font-size:0.88rem; }

.net-row { margin-bottom:5px; }
.net-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 15px; display:flex; align-items:center; gap:12px; }

.net-user-info { flex:1; min-width:0; }
.net-uname { font-size:0.9rem; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.net-umeta { font-size:0.72rem; color:#64748b; margin-top:1px; }
.net-actions { display:flex; gap:6px; flex-shrink:0; align-items:center; }
.net-actions .btn { display:flex; align-items:center; gap:5px; }

.net-tag { font-size:0.68rem; font-weight:600; padding:3px 9px; border-radius:3px; }
.net-tag.accepted { background:rgba(34,197,94,0.1); color:#4ade80; border:1px solid rgba(34,197,94,0.25); }
.net-tag.pending  { background:rgba(245,158,11,0.1); color:#fbbf24; border:1px solid rgba(245,158,11,0.25); }

.net-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:10px; }
.net-friend { --cut:8px; }
.net-friend-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; align-items:center; gap:12px; }
.net-dot { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.net-dot.online { background:rgba(34,197,94,0.15); color:#4ade80; }
.net-dot:not(.online) { background:rgba(71,85,105,0.15); color:#64748b; }
.net-status { font-size:0.66rem; margin-top:3px; color:#475569; }
.net-status.online { color:#4ade80; }

.net-cgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
.net-ccard { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; }
.net-c-species { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.net-c-sub { font-size:0.72rem; color:#60a5fa; margin-top:2px; }
.net-c-stats { display:flex; gap:10px; margin-top:6px; font-size:0.72rem; color:#64748b; }
</style>
