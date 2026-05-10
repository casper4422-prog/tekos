<script lang="ts">
	import { Shield, Users, Dna, Plus, Check, X, LogOut } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Member = { id:number; role:string; user:{ id:number; nickname:string|null; email:string; lastSeen:string|null } };
	type TribeCreature = { id:number; data:Record<string,unknown>; creator:{ nickname:string|null; email:string } };
	type JoinReq = { id:number; userId:number; message:string|null; user:{ id:number; nickname:string|null; email:string } };
	type Tribe = { id:number; name:string; mainMap:string|null; description:string|null; ownerUserId:number; members:Member[]; creatures:TribeCreature[]; joinRequests:JoinReq[] };
	type AllTribe = { id:number; name:string; description:string|null; mainMap:string|null; memberCount:number };

	const membership = data.membership as { role:string; tribe:Tribe } | null;
	const myId = data.myId as number;
	const allTribes = data.allTribes as AllTribe[] | null;

	let activeTab = $state<'members'|'vault'|'requests'>('members');
	let createOpen = $state(false);
	let joinOpen   = $state<number|null>(null);
	let saving     = $state(false);
	let err        = $state('');

	let cName  = $state('');
	let cDesc  = $state('');
	let cMap   = $state('');
	let jMsg   = $state('');

	const ONLINE_MS = 5 * 60 * 1000;
	function isOnline(lastSeen: string|null): boolean {
		return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < ONLINE_MS;
	}
	function display(u: { nickname?:string|null; email?:string }) { return u.nickname ?? u.email ?? 'Unknown'; }

	async function createTribe() {
		if (!cName.trim()) { err = 'Name required'; return; }
		saving = true; err = '';
		const res = await fetch('/api/tribes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:cName, description:cDesc, mainMap:cMap }) });
		if (res.ok) location.reload();
		else { err = (await res.json()).error ?? 'Failed'; saving = false; }
	}

	async function requestJoin(tribeId: number) {
		saving = true; err = '';
		const res = await fetch(`/api/tribes/${tribeId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'join', message:jMsg }) });
		if (res.ok) { joinOpen = null; alert('Join request sent!'); }
		else { err = (await res.json()).error ?? 'Failed'; }
		saving = false;
	}

	async function leaveTribe() {
		if (!confirm('Leave this tribe?')) return;
		const res = await fetch(`/api/tribes/${membership!.tribe.id}`, { method:'DELETE' });
		if (res.ok) location.reload();
		else alert((await res.json()).error);
	}

	async function handleJoinReq(reqId: number, tribeId: number, action: 'accept'|'reject') {
		await fetch(`/api/tribes/${tribeId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, requestId: reqId }) });
		location.reload();
	}
</script>

<div class="std-page">
	{#if membership}
		{@const tribe = membership.tribe}
		{@const isOwner = membership.role === 'owner'}
		{@const isAdmin = membership.role === 'owner' || membership.role === 'admin'}

		<div class="std-page-header">
			<div class="page-title">
				<h1>{tribe.name}</h1>
				<div class="page-subtitle">{tribe.members.length} member{tribe.members.length !== 1 ? 's' : ''}{tribe.mainMap ? ` · ${tribe.mainMap}` : ''}</div>
			</div>
			{#if !isOwner}
				<button class="btn btn-danger btn-sm" onclick={leaveTribe}><LogOut size={14} /> Leave</button>
			{/if}
		</div>

		{#if tribe.description}
			<div class="tribe-desc">{tribe.description}</div>
		{/if}

		<!-- Tabs -->
		<div class="tribe-tabs">
			<button class="tribe-tab" class:active={activeTab === 'members'} onclick={() => activeTab = 'members'}>
				<Users size={13} /> Members ({tribe.members.length})
			</button>
			<button class="tribe-tab" class:active={activeTab === 'vault'} onclick={() => activeTab = 'vault'}>
				<Dna size={13} /> Vault ({tribe.creatures.length})
			</button>
			{#if isAdmin}
				<button class="tribe-tab" class:active={activeTab === 'requests'} onclick={() => activeTab = 'requests'}>
					<Shield size={13} /> Requests {tribe.joinRequests.length > 0 ? `(${tribe.joinRequests.length})` : ''}
				</button>
			{/if}
		</div>

		{#if activeTab === 'members'}
			<div class="tribe-member-grid">
				{#each tribe.members as m}
					{@const online = isOnline(m.user.lastSeen)}
					<div class="cham-shell tribe-member" style="--cut:7px;--cat-rgb:{online ? '34,197,94' : '71,85,105'}">
						<div class="tribe-member-inner">
							<div class="tribe-dot" class:online></div>
							<div class="tribe-minfo">
								<div class="tribe-mname">{display(m.user)} {m.user.id === myId ? '(you)' : ''}</div>
								<div class="tribe-mrole">{m.role}</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if activeTab === 'vault'}
			{#if tribe.creatures.length === 0}
				<div class="tribe-empty">No specimens in vault yet.</div>
			{:else}
				<div class="tribe-vault-grid">
					{#each tribe.creatures as c}
						{@const cd = c.data as Record<string,unknown>}
						{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
						<div class="cham-shell" style="--cut:7px">
							<div class="tribe-ccard">
								<div class="tribe-c-species">{String(cd.species ?? '?')}</div>
								<div class="tribe-c-sub">{String(cd.name ?? 'Unnamed')} · Lvl {Number(cd.level ?? 1)}</div>
								<div class="tribe-c-stats">
									<span>HP {(bs.Health ?? 0).toLocaleString()}</span>
									<span>Mel {bs.Melee ?? 0}%</span>
								</div>
								<div class="tribe-c-by">by {display(c.creator)}</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{:else if activeTab === 'requests'}
			{#if tribe.joinRequests.length === 0}
				<div class="tribe-empty">No pending join requests.</div>
			{:else}
				{#each tribe.joinRequests as r}
					<div class="cham-shell tribe-req" style="--cut:6px">
						<div class="tribe-req-inner">
							<div class="tribe-minfo">
								<div class="tribe-mname">{display(r.user)}</div>
								{#if r.message}<div class="tribe-mrole">"{r.message}"</div>{/if}
							</div>
							<div class="tribe-req-actions">
								<button class="btn btn-primary btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'accept')}><Check size={13} /></button>
								<button class="btn btn-danger  btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'reject')}><X size={13} /></button>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		{/if}

	{:else}
		<!-- No tribe — browse + create -->
		<div class="std-page-header">
			<div class="page-title">
				<h1>Tribe</h1>
				<div class="page-subtitle">Find your people</div>
			</div>
			<button class="btn btn-primary" onclick={() => createOpen = true}><Plus size={14} /> Create Tribe</button>
		</div>

		{#if (allTribes?.length ?? 0) === 0}
			<div class="tribe-empty">No tribes yet. Be the first to create one.</div>
		{:else}
			<div class="tribe-browse-grid">
				{#each (allTribes ?? []) as t}
					<div class="cham-shell tribe-browse-card">
						<div class="tribe-bc-inner">
							<div class="tribe-bc-name">{t.name}</div>
							{#if t.mainMap}<div class="tribe-bc-map">{t.mainMap}</div>{/if}
							{#if t.description}<div class="tribe-bc-desc">{t.description}</div>{/if}
							<div class="tribe-bc-footer">
								<span class="tribe-bc-count"><Users size={11} /> {t.memberCount} members</span>
								<button class="btn btn-primary btn-sm" onclick={() => { joinOpen = t.id; jMsg=''; err=''; }}>
									Request to Join
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Create tribe modal -->
{#if createOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header">
			<h2 class="modal-title">Create Tribe</h2>
			<button class="close-btn" onclick={() => createOpen = false}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field">
				<label class="form-label" for="t-name">Tribe Name *</label>
				<input id="t-name" class="form-control" bind:value={cName} placeholder="e.g. Alpha Riders" />
			</div>
			<div class="plan-field">
				<label class="form-label" for="t-map">Main Map</label>
				<input id="t-map" class="form-control" bind:value={cMap} placeholder="e.g. The Island" />
			</div>
			<div class="plan-field">
				<label class="form-label" for="t-desc">Description</label>
				<textarea id="t-desc" class="form-control" rows="2" bind:value={cDesc}></textarea>
			</div>
			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => createOpen = false}>Cancel</button>
			<button class="btn btn-primary" onclick={createTribe} disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Join request modal -->
{#if joinOpen !== null}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:420px">
		<div class="modal-header">
			<h2 class="modal-title">Request to Join</h2>
			<button class="close-btn" onclick={() => joinOpen = null}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="plan-field">
				<label class="form-label" for="j-msg">Message (optional)</label>
				<textarea id="j-msg" class="form-control" rows="2" bind:value={jMsg} placeholder="Tell them about yourself..."></textarea>
			</div>
			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => joinOpen = null}>Cancel</button>
			<button class="btn btn-primary" onclick={() => requestJoin(joinOpen!)} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.tribe-desc { color:#94a3b8; font-size:0.88rem; margin-bottom:20px; line-height:1.6; }

.tribe-tabs { display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0; }
.tribe-tab { display:flex; align-items:center; gap:6px; background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-size:0.82rem; font-weight:500; padding:8px 14px; cursor:pointer; margin-bottom:-1px; font-family:inherit; transition:color .15s,border-color .15s; }
.tribe-tab:hover { color:#94a3b8; }
.tribe-tab.active { color:#f1f5f9; border-bottom-color:#00b4ff; }

.tribe-empty { color:#475569; padding:32px 0; font-size:0.88rem; }

.tribe-member-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; }
.tribe-member { --cut:7px; }
.tribe-member-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 14px; display:flex; align-items:center; gap:10px; }
.tribe-dot { width:8px; height:8px; border-radius:50%; background:#475569; flex-shrink:0; }
.tribe-dot.online { background:#4ade80; box-shadow:0 0 6px #4ade80; }
.tribe-minfo { min-width:0; }
.tribe-mname { font-size:0.88rem; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tribe-mrole { font-size:0.68rem; color:#64748b; text-transform:capitalize; margin-top:1px; }

.tribe-vault-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
.tribe-ccard { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; }
.tribe-c-species { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.tribe-c-sub { font-size:0.72rem; color:#60a5fa; margin-top:2px; }
.tribe-c-stats { display:flex; gap:10px; margin-top:6px; font-size:0.72rem; color:#64748b; }
.tribe-c-by { font-size:0.65rem; color:#334155; margin-top:6px; }

.tribe-req { margin-bottom:5px; }
.tribe-req-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:center; gap:12px; }
.tribe-req-actions { display:flex; gap:6px; flex-shrink:0; }

.tribe-browse-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.tribe-browse-card { --cut:9px; }
.tribe-bc-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:18px 20px; display:flex; flex-direction:column; gap:6px; }
.tribe-bc-name { font-size:1rem; font-weight:700; color:#f1f5f9; }
.tribe-bc-map { font-size:0.75rem; color:#60a5fa; }
.tribe-bc-desc { font-size:0.82rem; color:#64748b; line-height:1.5; }
.tribe-bc-footer { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
.tribe-bc-count { display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#64748b; }
</style>
