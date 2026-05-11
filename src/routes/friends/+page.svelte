<script lang="ts">
	import { onMount } from 'svelte';
	import { UserPlus, Check, X, Search, MessageSquare, Dna, Wifi, WifiOff, Users, Mail } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Friend  = { id:number; friendId:number; nickname:string|null; email:string; discordName?:string|null; online:boolean };
	type Request = { id:number; fromId?:number; toId?:number; nickname:string|null; email:string; discordName?:string|null };
	type Survivor = { id:number; nickname:string|null; email:string; bio:string|null; online:boolean; specimens:number; tribe:{name:string}|null };
	type Convo   = { userId:number; nickname:string|null; email:string; lastMessage:string; lastAt:string; unread:number };

	let tab      = $state<'friends'|'survivors'|'messages'>('friends');
	let friends  = $state<Friend[]>(data.friends as Friend[]);
	let incoming = $state<Request[]>(data.incoming as Request[]);
	let sent     = $state<Request[]>(data.sent as Request[]);

	// Survivors
	let survivors = $state<Survivor[]>([]);
	let survQ     = $state('');
	let onlineOnly = $state(false);
	let survLoaded = $state(false);

	// Messages
	let convos     = $state<Convo[]>([]);
	let convosLoaded = $state(false);

	// Friend search
	let searchQ      = $state('');
	let searchResults = $state<Record<string,unknown>[]>([]);
	let searching    = $state(false);
	let viewingCreatures = $state<{name:string;creatures:Record<string,unknown>[]}|null>(null);

	function display(f: {nickname?:string|null;email?:string}) { return f.nickname ?? f.email ?? 'Unknown'; }

	async function loadSurvivors() {
		if (survLoaded && !survQ) return;
		const params = new URLSearchParams({ page:'1' });
		if (survQ.trim()) params.set('q', survQ);
		if (onlineOnly) params.set('online', 'true');
		const res = await fetch(`/api/survivors?${params}`);
		if (res.ok) { const d = await res.json(); survivors = d.users; }
		survLoaded = true;
	}

	async function loadConvos() {
		if (convosLoaded) return;
		const res = await fetch('/api/dms');
		if (res.ok) convos = await res.json();
		convosLoaded = true;
	}

	function onTabChange(t: typeof tab) {
		tab = t;
		if (t === 'survivors' && !survLoaded) loadSurvivors();
		if (t === 'messages'  && !convosLoaded) loadConvos();
	}

	async function doSearch() {
		if (!searchQ.trim()) { searchResults = []; return; }
		searching = true;
		const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`);
		searchResults = res.ok ? await res.json() : [];
		searching = false;
	}

	async function sendRequest(userId: number, btn: HTMLButtonElement) {
		btn.disabled = true;
		const res = await fetch('/api/friends', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ friendUserId:userId }) });
		if (res.ok) searchResults = searchResults.map(u => u.id === userId ? {...u, friendStatus:'pending'} : u);
		else btn.disabled = false;
	}

	async function respond(id: number, action: 'accept'|'reject') {
		const res = await fetch(`/api/friends/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action}) });
		if (res.ok) { incoming = incoming.filter(r => r.id !== id); if (action === 'accept') location.reload(); }
	}

	async function cancel(id: number) { await fetch(`/api/friends/${id}`, {method:'DELETE'}); sent = sent.filter(r => r.id !== id); }
	async function remove(id: number) {
		if (!confirm('Remove from network?')) return;
		await fetch(`/api/friends/${id}`, {method:'DELETE'});
		friends = friends.filter(f => f.id !== id);
	}

	async function viewCreatures(friendId: number, name: string) {
		const res = await fetch(`/api/users/${friendId}/creatures`);
		viewingCreatures = { name, creatures: res.ok ? await res.json() : [] };
	}

	function ago(dt: string) {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff/60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m`;
		const h = Math.floor(m/60);
		if (h < 24) return `${h}h`;
		return `${Math.floor(h/24)}d`;
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Network</h1>
			<div class="page-subtitle">{friends.length} connected · {incoming.length > 0 ? `${incoming.length} pending request${incoming.length!==1?'s':''}` : 'all clear'}</div>
		</div>
	</div>

	<div class="tek-tab-bar">
		<button class="tek-tab" class:active={tab==='friends'}   onclick={() => onTabChange('friends')}>
			<Users size={13} /> Friends {incoming.length > 0 ? '' : ''}
			{#if incoming.length > 0}<span class="tek-tab-badge danger">{incoming.length}</span>{/if}
		</button>
		<button class="tek-tab" class:active={tab==='survivors'} onclick={() => onTabChange('survivors')}>
			<Search size={13} /> Survivors
		</button>
		<button class="tek-tab" class:active={tab==='messages'}  onclick={() => onTabChange('messages')}>
			<Mail size={13} /> Messages
		</button>
	</div>

	<!-- ── Friends tab ──────────────────────────────────────────────────── -->
	{#if tab === 'friends'}
		<!-- Search -->
		<div class="net-search-row">
			<input class="form-control" placeholder="Search survivors to add..." bind:value={searchQ} onkeydown={(e) => e.key==='Enter' && doSearch()} />
			<button class="btn btn-primary" onclick={doSearch} disabled={searching}><Search size={14} /></button>
		</div>

		{#if searchResults.length > 0}
			<div class="net-section">
				<div class="net-section-title">Search Results</div>
				{#each searchResults as u}
					{@const status = u.friendStatus as string|null}
					<div class="cham-shell net-row" style="--cut:6px">
						<div class="net-row-inner">
							<div class="net-user-info">
								<a href="/survivors/{u.id}" class="net-uname">{u.nickname ?? u.email}</a>
								{#if u.discordName}<div class="net-umeta">Discord: {u.discordName}</div>{/if}
							</div>
							<div class="net-actions">
								{#if status==='accepted'}
									<span class="net-tag accepted">Connected</span>
								{:else if status==='pending'}
									<span class="net-tag pending">Pending</span>
								{:else}
									<button class="btn btn-primary btn-sm" onclick={(e) => sendRequest(u.id as number, e.currentTarget)}><UserPlus size={13} /> Add</button>
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
								<a href="/survivors/{r.fromId}" class="net-uname">{display(r)}</a>
								{#if r.discordName}<div class="net-umeta">Discord: {r.discordName}</div>{/if}
							</div>
							<div class="net-actions">
								<button class="btn btn-success btn-sm" onclick={() => respond(r.id,'accept')}><Check size={13} /></button>
								<button class="btn btn-danger  btn-sm" onclick={() => respond(r.id,'reject')}><X size={13} /></button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if sent.length > 0}
			<div class="net-section">
				<div class="net-section-title">Sent Requests</div>
				{#each sent as r}
					<div class="cham-shell net-row" style="--cut:6px">
						<div class="net-row-inner">
							<div class="net-user-info"><div class="net-uname">{display(r)}</div><div class="net-umeta">Awaiting response...</div></div>
							<div class="net-actions"><button class="btn btn-secondary btn-sm" onclick={() => cancel(r.id)}>Cancel</button></div>
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
						<div class="cham-shell net-friend" style="--cat-rgb:{f.online?'34,197,94':'71,85,105'}">
							<div class="net-friend-inner">
								<div class="net-dot" class:online={f.online}>{#if f.online}<Wifi size={10}/>{:else}<WifiOff size={10}/>{/if}</div>
								<div class="net-user-info">
									<a href="/survivors/{f.friendId}" class="net-uname">{display(f)}</a>
									{#if f.discordName}<div class="net-umeta">Discord: {f.discordName}</div>{/if}
									<div class="net-status" class:online={f.online}>{f.online?'Online':'Offline'}</div>
								</div>
								<div class="net-actions">
									<a href="/messages/{f.friendId}" class="btn btn-secondary btn-sm"><MessageSquare size={13}/></a>
									<button class="btn btn-secondary btn-sm" onclick={() => viewCreatures(f.friendId, display(f))}><Dna size={13}/></button>
									<button class="btn btn-danger btn-sm" onclick={() => remove(f.id)}>✕</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

	<!-- ── Survivors tab ──────────────────────────────────────────────── -->
	{:else if tab === 'survivors'}
		<div class="dir-controls">
			<div style="display:flex;gap:8px;flex:1">
				<input class="form-control" placeholder="Search by name or email..." bind:value={survQ} onkeydown={(e) => e.key==='Enter' && loadSurvivors()} style="flex:1"/>
				<button class="btn btn-primary" onclick={loadSurvivors}><Search size={14}/></button>
			</div>
			<label class="dir-online-toggle"><input type="checkbox" bind:checked={onlineOnly} onchange={loadSurvivors} /> Online only</label>
		</div>
		{#if !survLoaded}
			<div class="net-empty">Searching survivors...</div>
		{:else if survivors.length === 0}
			<div class="net-empty">No survivors found.</div>
		{:else}
			<div class="dir-grid">
				{#each survivors as s}
					<a href="/survivors/{s.id}" class="cham-shell dir-card" style="--cut:8px;--cat-rgb:{s.online?'34,197,94':'71,85,105'}">
						<div class="dir-card-inner">
							<div class="dir-card-top">
								<div class="dir-online-dot" class:online={s.online}></div>
								<div class="dir-name">{s.nickname ?? s.email}</div>
							</div>
							{#if s.tribe}<div class="dir-tribe">{s.tribe.name}</div>{/if}
							{#if s.bio}<div class="dir-bio">{s.bio}</div>{/if}
							<div class="dir-meta"><span>{s.specimens} specimens</span><span class="dir-status" class:online={s.online}>{s.online?'Online':'Offline'}</span></div>
						</div>
					</a>
				{/each}
			</div>
		{/if}

	<!-- ── Messages tab ───────────────────────────────────────────────── -->
	{:else}
		{#if !convosLoaded}
			<div class="net-empty">Loading messages...</div>
		{:else if convos.length === 0}
			<div class="net-empty">No messages yet. Click the message icon on a friend's card to start a conversation.</div>
		{:else}
			<div class="comms-list">
				{#each convos as c}
					<a class="cham-shell comms-row" href="/messages/{c.userId}" style="--cut:7px">
						<div class="comms-row-inner">
							<div class="comms-avatar"><MessageSquare size={16}/></div>
							<div class="comms-info">
								<div class="comms-name">{c.nickname ?? c.email}</div>
								<div class="comms-preview">{c.lastMessage}</div>
							</div>
							<div class="comms-meta">
								<div class="comms-time">{ago(c.lastAt)}</div>
								{#if c.unread > 0}<div class="comms-unread">{c.unread}</div>{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- View friend creatures modal -->
{#if viewingCreatures}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:680px">
		<div class="modal-header"><h2 class="modal-title">{viewingCreatures.name}'s Specimens</h2><button class="close-btn" onclick={() => viewingCreatures=null}>&times;</button></div>
		<div class="modal-body">
			{#if viewingCreatures.creatures.length === 0}
				<div style="color:#64748b">No specimens yet.</div>
			{:else}
				<div class="net-cgrid">
					{#each viewingCreatures.creatures as c}
						{@const cd = c as Record<string,unknown>}
						{@const bs = (cd.baseStats as Record<string,number>)??{}}
						<div class="cham-shell" style="--cut:6px">
							<div class="net-ccard">
								<div class="net-c-species">{String(cd.species??'?')}</div>
								<div class="net-c-sub">{String(cd.name??'Unnamed')} · Lvl {Number(cd.level??1)} · {String(cd.gender??'?')}</div>
								<div class="net-c-stats"><span>HP {(bs.Health??0).toLocaleString()}</span><span>Mel {bs.Melee??0}</span></div>
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
.net-search-row { display:flex; gap:10px; margin-bottom:20px; }
.net-search-row .form-control { flex:1; }
.net-search-row .btn { display:flex; align-items:center; gap:5px; flex-shrink:0; }
.net-section { margin-bottom:24px; }
.net-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; display:flex; align-items:center; gap:8px; }
.net-badge { background:rgba(0,180,255,0.12); color:#00b4ff; border:1px solid rgba(0,180,255,0.3); border-radius:99px; padding:1px 8px; font-size:0.62rem; font-weight:800; }
.net-empty { color:#475569; padding:28px 0; font-size:0.88rem; }
.net-row { margin-bottom:5px; }
.net-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 15px; display:flex; align-items:center; gap:12px; }
.net-user-info { flex:1; min-width:0; }
.net-uname { font-size:0.9rem; font-weight:600; color:#f1f5f9; text-decoration:none; display:block; }
.net-uname:hover { color:#00b4ff; }
.net-umeta { font-size:0.72rem; color:#64748b; margin-top:1px; }
.net-actions { display:flex; gap:6px; flex-shrink:0; align-items:center; }
.net-actions .btn { display:flex; align-items:center; gap:4px; }
.net-tag { font-size:0.68rem; font-weight:600; padding:3px 9px; border-radius:3px; }
.net-tag.accepted { background:rgba(34,197,94,0.1); color:#4ade80; border:1px solid rgba(34,197,94,0.25); }
.net-tag.pending  { background:rgba(245,158,11,0.1); color:#fbbf24; border:1px solid rgba(245,158,11,0.25); }
.net-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px; }
.net-friend { --cut:8px; }
.net-friend-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:13px 15px; display:flex; align-items:center; gap:10px; }
.net-dot { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:rgba(71,85,105,0.15); color:#64748b; }
.net-dot.online { background:rgba(34,197,94,0.15); color:#4ade80; }
.net-status { font-size:0.66rem; margin-top:3px; color:#475569; }
.net-status.online { color:#4ade80; }
.net-cgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
.net-ccard { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; }
.net-c-species { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.net-c-sub { font-size:0.72rem; color:#60a5fa; margin-top:2px; }
.net-c-stats { display:flex; gap:10px; margin-top:6px; font-size:0.72rem; color:#64748b; }
/* Survivors */
.dir-controls { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; align-items:center; }
.dir-online-toggle { display:flex; align-items:center; gap:7px; font-size:0.85rem; color:#94a3b8; cursor:pointer; white-space:nowrap; }
.dir-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:10px; }
.dir-card { display:block; text-decoration:none; color:inherit; }
.dir-card-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; flex-direction:column; gap:5px; }
.dir-card-top { display:flex; align-items:center; gap:8px; }
.dir-online-dot { width:8px; height:8px; border-radius:50%; background:#475569; flex-shrink:0; }
.dir-online-dot.online { background:#4ade80; box-shadow:0 0 6px rgba(74,222,128,0.5); }
.dir-name { font-size:0.92rem; font-weight:700; color:#f1f5f9; }
.dir-tribe { font-size:0.74rem; color:#a78bfa; }
.dir-bio { font-size:0.76rem; color:#64748b; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.dir-meta { display:flex; justify-content:space-between; font-size:0.7rem; color:#475569; }
.dir-status.online { color:#4ade80; }
/* Messages */
.comms-list { display:flex; flex-direction:column; gap:5px; max-width:680px; }
.comms-row { display:block; text-decoration:none; color:inherit; }
.comms-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:13px 16px; display:flex; align-items:center; gap:13px; }
.comms-avatar { width:32px; height:32px; border-radius:50%; background:rgba(0,180,255,0.1); border:1px solid rgba(0,180,255,0.2); display:flex; align-items:center; justify-content:center; color:rgba(0,180,255,0.7); flex-shrink:0; }
.comms-info { flex:1; min-width:0; }
.comms-name { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.comms-preview { font-size:0.78rem; color:#64748b; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.comms-meta { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
.comms-time { font-size:0.68rem; color:#475569; }
.comms-unread { background:#00b4ff; color:#050812; border-radius:99px; padding:1px 7px; font-size:0.65rem; font-weight:800; min-width:20px; text-align:center; }
</style>
