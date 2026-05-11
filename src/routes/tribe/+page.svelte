<script lang="ts">
	import { Shield, Users, Dna, Plus, Check, X, LogOut, Megaphone, AlertTriangle, ChevronRight, Wand2, Swords } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Member    = { id:number; role:string; user:{ id:number; nickname:string|null; email:string; lastSeen:string|null } };
	type TribeC    = { id:number; data:Record<string,unknown>; creator:{ nickname:string|null; email:string } };
	type JoinReq   = { id:number; userId:number; message:string|null; user:{ id:number; nickname:string|null; email:string } };
	type Tribe     = { id:number; name:string; mainMap:string|null; description:string|null; ownerUserId:number; members:Member[]; creatures:TribeC[]; joinRequests:JoinReq[] };
	type AllTribe  = { id:number; name:string; description:string|null; mainMap:string|null; memberCount:number };
	type BlackEntry = { id:number; name:string; reason:string|null; type:string; addedAt:string };

	let membership  = $state(data.membership as { role:string; tribe:Tribe } | null);
	const myId      = data.myId as number;
	let allTribes   = $state(data.allTribes as AllTribe[] | null);

	let activeTab   = $state<'members'|'vault'|'requests'|'announce'|'blacklist'|'alliances'>('members');
	let blacklist    = $state<BlackEntry[]>([]);
	let blLoaded     = $state(false);
	let alliances    = $state<Record<string,unknown>[]>([]);
	let alliancesLoaded = $state(false);
	let allTribesForAlliance = $state<AllTribe[]>([]);
	let allianceSearch = $state('');

	// Multi-step create flow
	let createStep  = $state(0); // 0=closed, 1=basics, 2=identity, 3=rules
	let saving      = $state(false);
	let err         = $state('');

	let cName       = $state('');
	let cDesc       = $state('');
	let cMap        = $state('');
	let cMotto      = $state('');
	let cOpenPolicy = $state<'open'|'application'>('application');

	let announceMsg = $state('');
	let announcing  = $state(false);

	// Blacklist form
	let blName   = $state('');
	let blReason = $state('');
	let blType   = $state<'player'|'tribe'>('player');

	// Join modal
	let joinOpen  = $state<number|null>(null);
	let jMsg      = $state('');

	const MAPS = ['The Island','Scorched Earth','Aberration','Extinction','The Center','Valguero','Ragnarok','Astraeos','Lost Colony','Svartalfheim'];

	const ONLINE_MS = 5 * 60 * 1000;
	function isOnline(ls: string|null) { return !!ls && Date.now() - new Date(ls).getTime() < ONLINE_MS; }
	function display(u: { nickname?:string|null; email?:string }) { return u.nickname ?? u.email ?? 'Unknown'; }

	async function loadBlacklist() {
		if (!membership || blLoaded) return;
		const res = await fetch(`/api/tribes/${membership.tribe.id}/blacklist`);
		if (res.ok) { blacklist = await res.json(); blLoaded = true; }
	}

	async function createTribe() {
		if (!cName.trim()) { err = 'Name required'; return; }
		saving = true; err = '';
		const res = await fetch('/api/tribes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:cName, description:cDesc, mainMap:cMap, motto:cMotto, policy:cOpenPolicy }) });
		if (res.ok) location.reload();
		else { err = (await res.json()).error ?? 'Failed'; saving = false; }
	}

	async function requestJoin(id: number) {
		saving = true; err = '';
		const res = await fetch(`/api/tribes/${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'join', message:jMsg }) });
		if (res.ok) { joinOpen = null; alert('Request sent!'); }
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
		await fetch(`/api/tribes/${tribeId}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, requestId:reqId }) });
		location.reload();
	}

	async function postAnnouncement() {
		if (!announceMsg.trim() || !membership) return;
		announcing = true;
		await fetch(`/api/tribes/${membership.tribe.id}/announce`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:announceMsg }) });
		announceMsg = ''; announcing = false;
		alert('Announcement sent to all members!');
	}

	async function addBlacklist() {
		if (!blName.trim() || !membership) return;
		const res = await fetch(`/api/tribes/${membership.tribe.id}/blacklist`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:blName, reason:blReason, type:blType }) });
		if (res.ok) { const entry = await res.json(); blacklist = [entry, ...blacklist]; blName=''; blReason=''; }
	}

	async function removeBlacklist(entryId: number) {
		if (!membership) return;
		await fetch(`/api/tribes/${membership.tribe.id}/blacklist`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ entryId }) });
		blacklist = blacklist.filter(b => b.id !== entryId);
	}

	async function loadAlliances() {
		if (alliancesLoaded) return;
		const [ar, tr] = await Promise.all([ fetch('/api/alliances'), fetch('/api/tribes') ]);
		if (ar.ok) alliances = await ar.json();
		if (tr.ok) allTribesForAlliance = await tr.json();
		alliancesLoaded = true;
	}

	async function requestAlliance(targetId: number) {
		const res = await fetch('/api/alliances', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ targetTribeId:targetId }) });
		if (res.ok) { await loadAlliances(); alliancesLoaded = false; loadAlliances(); }
		else alert((await res.json()).error ?? 'Failed');
	}

	async function respondAlliance(id: number, action: 'accept'|'reject') {
		await fetch(`/api/alliances/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }) });
		alliancesLoaded = false; loadAlliances();
	}

	async function breakAlliance(id: number) {
		if (!confirm('Break this alliance?')) return;
		await fetch(`/api/alliances/${id}`, { method:'DELETE' });
		alliancesLoaded = false; loadAlliances();
	}

	function onTabChange(tab: typeof activeTab) {
		activeTab = tab;
		if (tab === 'blacklist') loadBlacklist();
		if (tab === 'alliances') loadAlliances();
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
			<div class="page-subtitle">{tribe.members.length} member{tribe.members.length !== 1 ? 's' : ''}{tribe.mainMap ? ` Â· ${tribe.mainMap}` : ''}</div>
		</div>
		<a href="/tribe/flag" class="btn btn-secondary"><Wand2 size={13} /> Flag Workshop</a>
		{#if !isOwner}
			<button class="btn btn-danger btn-sm" onclick={leaveTribe}><LogOut size={14} /> Leave</button>
		{/if}
	</div>

	{#if tribe.description}<div class="tribe-desc">{tribe.description}</div>{/if}

	<div class="tek-tab-bar">
		<button class="tek-tab" class:active={activeTab==='members'} onclick={() => onTabChange('members')}><Users size={13} /> Members ({tribe.members.length})</button>
		<button class="tek-tab" class:active={activeTab==='vault'} onclick={() => onTabChange('vault')}><Dna size={13} /> Vault ({tribe.creatures.length})</button>
		<button class="tek-tab" class:active={activeTab==='alliances'} onclick={() => onTabChange('alliances')}><Swords size={13} /> Alliances</button>
		{#if isAdmin}
			<button class="tek-tab" class:active={activeTab==='requests'} onclick={() => onTabChange('requests')}>
				<Shield size={13} /> Requests
				{#if tribe.joinRequests.length > 0}<span class="tek-tab-badge danger">{tribe.joinRequests.length}</span>{/if}
			</button>
			<button class="tek-tab" class:active={activeTab==='announce'} onclick={() => onTabChange('announce')}><Megaphone size={13} /> Announce</button>
			<button class="tek-tab" class:active={activeTab==='blacklist'} onclick={() => onTabChange('blacklist')}><AlertTriangle size={13} /> Blacklist</button>
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
							<a href="/survivors/{m.user.id}" class="tribe-mname">{display(m.user)} {m.user.id === myId ? '(you)' : ''}</a>
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
							<div class="tribe-c-sub">{String(cd.name ?? 'Unnamed')} Â· Lvl {Number(cd.level ?? 1)}</div>
							<div class="tribe-c-stats"><span>HP {(bs.Health??0).toLocaleString()}</span><span>Mel {bs.Melee??0}%</span></div>
							<div class="tribe-c-by">by {display(c.creator)}</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if activeTab === 'requests'}
		{#if tribe.joinRequests.length === 0}
			<div class="tribe-empty">No pending requests.</div>
		{:else}
			{#each tribe.joinRequests as r}
				<div class="cham-shell tribe-req" style="--cut:6px">
					<div class="tribe-req-inner">
						<div class="tribe-minfo">
							<a href="/survivors/{r.user.id}" class="tribe-mname">{display(r.user)}</a>
							{#if r.message}<div class="tribe-mrole">"{r.message}"</div>{/if}
						</div>
						<div class="tribe-req-actions">
							<button class="btn btn-success btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'accept')}><Check size={13} /> Accept</button>
							<button class="btn btn-danger  btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'reject')}><X size={13} /> Decline</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}

	{:else if activeTab === 'alliances'}
		<!-- Alliance tab -->
		<div class="tribe-al-section">
			{#if alliances.filter((a:Record<string,unknown>) => a.status === 'accepted').length > 0}
				<div class="tribe-section-label">Active Alliances</div>
				{#each alliances.filter((a:Record<string,unknown>) => a.status === 'accepted') as al}
					{@const ald = al as Record<string,unknown>}
					{@const partner = ald.partnerTribe as Record<string,unknown>}
					<div class="cham-shell tribe-al-row" style="--cut:6px">
						<div class="tribe-al-inner">
							<Swords size={14} style="color:#a78bfa;flex-shrink:0" />
							<div class="tribe-al-info">
								<div class="tribe-al-name">{String(partner.name)}</div>
								{#if partner.mainMap}<div class="tribe-al-map">{String(partner.mainMap)}</div>{/if}
							</div>
							{#if isAdmin}<button class="btn btn-danger btn-sm" onclick={() => breakAlliance(Number(ald.id))}>Break</button>{/if}
						</div>
					</div>
				{/each}
			{/if}

			{#if alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && !(a.isRequester as boolean)).length > 0}
				<div class="tribe-section-label" style="margin-top:16px">Incoming Alliance Requests</div>
				{#each alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && !(a.isRequester as boolean)) as al}
					{@const ald = al as Record<string,unknown>}
					{@const partner = ald.partnerTribe as Record<string,unknown>}
					<div class="cham-shell tribe-al-row" style="--cut:6px">
						<div class="tribe-al-inner">
							<div class="tribe-al-info">
								<div class="tribe-al-name">{String(partner.name)} wants an alliance</div>
							</div>
							{#if isAdmin}
								<button class="btn btn-success btn-sm" onclick={() => respondAlliance(Number(ald.id),'accept')}><Check size={13}/></button>
								<button class="btn btn-danger  btn-sm" onclick={() => respondAlliance(Number(ald.id),'reject')}><X size={13}/></button>
							{/if}
						</div>
					</div>
				{/each}
			{/if}

			{#if alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && (a.isRequester as boolean)).length > 0}
				<div class="tribe-section-label" style="margin-top:16px">Pending Sent Requests</div>
				{#each alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && (a.isRequester as boolean)) as al}
					{@const ald = al as Record<string,unknown>}
					{@const partner = ald.partnerTribe as Record<string,unknown>}
					<div class="cham-shell tribe-al-row" style="--cut:6px">
						<div class="tribe-al-inner">
							<div class="tribe-al-info"><div class="tribe-al-name">{String(partner.name)}</div><div class="tribe-al-map">Awaiting response...</div></div>
							<button class="btn btn-danger btn-sm" onclick={() => breakAlliance(Number(ald.id))}>Cancel</button>
						</div>
					</div>
				{/each}
			{/if}

			{#if isAdmin}
				<div class="tribe-section-label" style="margin-top:20px">Request Alliance with a Tribe</div>
				<input class="form-control" placeholder="Search tribes..." bind:value={allianceSearch} style="margin-bottom:10px;max-width:300px" />
				<div style="display:flex;flex-direction:column;gap:5px">
					{#each allTribesForAlliance.filter(t => t.id !== tribe.id && (t.name.toLowerCase().includes(allianceSearch.toLowerCase()) || !allianceSearch)).slice(0,10) as t}
						{@const alreadyAllied = alliances.some((a:Record<string,unknown>) => (a.partnerTribe as Record<string,unknown>)?.id === t.id)}
						<div class="cham-shell tribe-al-row" style="--cut:5px">
							<div class="tribe-al-inner">
								<div class="tribe-al-info">
									<div class="tribe-al-name">{t.name}</div>
									{#if t.mainMap}<div class="tribe-al-map">{t.mainMap}</div>{/if}
								</div>
								{#if alreadyAllied}
									<span style="font-size:0.72rem;color:#64748b">Already allied</span>
								{:else}
									<button class="btn btn-primary btn-sm" onclick={() => requestAlliance(t.id)}><Swords size={12}/> Request</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if alliances.length === 0 && !isAdmin}
				<div class="tribe-empty">No alliances yet. Ask a tribe admin to request one.</div>
			{/if}
		</div>

	{:else if activeTab === 'announce'}
		<div class="tribe-announce">
			<div class="tribe-announce-desc">Notify all {tribe.members.length} members instantly.</div>
			<textarea class="form-control" rows="4" bind:value={announceMsg} placeholder="Write your announcement..."></textarea>
			<button class="btn btn-primary" onclick={postAnnouncement} disabled={announcing || !announceMsg.trim()}>
				<Megaphone size={14} /> {announcing ? 'Sending...' : 'Send Announcement'}
			</button>
		</div>

	{:else if activeTab === 'blacklist'}
		<div class="tribe-bl-desc">Flag bad traders or hostile survivors so all tribe members are warned. Only visible to tribe members.</div>
		{#if isAdmin}
			<div class="tribe-bl-form">
				<input class="form-control" placeholder="Survivor or tribe name..." bind:value={blName} style="flex:1" />
				<select class="form-control" bind:value={blType} style="width:120px">
					<option value="player">Player</option>
					<option value="tribe">Tribe</option>
				</select>
				<input class="form-control" placeholder="Reason (optional)..." bind:value={blReason} style="flex:1" />
				<button class="btn btn-danger btn-sm" onclick={addBlacklist} disabled={!blName.trim()}><Plus size={13} /> Flag</button>
			</div>
		{/if}
		{#if blacklist.length === 0}
			<div class="tribe-empty">No flagged players or tribes. Stay vigilant, survivor.</div>
		{:else}
			<div class="tribe-bl-list">
				{#each blacklist as b}
					<div class="cham-shell tribe-bl-row" style="--cut:5px;--cat-rgb:239,68,68">
						<div class="tribe-bl-inner">
							<AlertTriangle size={14} style="color:#f87171;flex-shrink:0" />
							<div class="tribe-bl-info">
								<div class="tribe-bl-name">{b.name} <span class="tribe-bl-type">{b.type}</span></div>
								{#if b.reason}<div class="tribe-bl-reason">"{b.reason}"</div>{/if}
							</div>
							{#if isAdmin}
								<button class="btn btn-ghost btn-sm" onclick={() => removeBlacklist(b.id)}><X size={12} /></button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

{:else}
	<!-- No tribe -->
	<div class="std-page-header">
		<div class="page-title"><h1>Tribe</h1><div class="page-subtitle">Find your people or forge your own</div></div>
		<button class="btn btn-primary" onclick={() => createStep = 1}><Plus size={14} /> Found a Tribe</button>
	</div>

	{#if (allTribes?.length ?? 0) === 0}
		<div class="tribe-empty">No tribes yet. Be the first to found one.</div>
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
							<button class="btn btn-primary btn-sm" onclick={() => { joinOpen = t.id; jMsg=''; err=''; }}>Request to Join</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
{/if}
</div>

<!-- â”€â”€ Multi-step tribe creation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
{#if createStep > 0}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:500px">
		<div class="modal-header">
			<h2 class="modal-title">
				{createStep === 1 ? 'âš” Found a Tribe â€” Basics' : createStep === 2 ? 'ðŸ›¡ Identity & Culture' : 'ðŸ“‹ Membership Policy'}
			</h2>
			<button class="close-btn" onclick={() => createStep=0}>&times;</button>
		</div>

		<div class="modal-body">
			<!-- Step indicator -->
			<div class="tribe-steps">
				{#each [1,2,3] as s}
					<div class="tribe-step" class:active={createStep===s} class:done={createStep>s}>{s}</div>
					{#if s < 3}<div class="tribe-step-line" class:done={createStep>s}></div>{/if}
				{/each}
			</div>

			{#if createStep === 1}
				<div class="tribe-step-title">What is your tribe called?</div>
				<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
					<div class="plan-field"><label class="form-label">Tribe Name *</button><input class="form-control" bind:value={cName} placeholder="e.g. Iron Talons" /></div>
					<div class="plan-field"><label class="form-label">Home Server / Map</button>
						<select class="form-control" bind:value={cMap}>
							<option value="">Choose a map...</option>
							{#each MAPS as m}<option value={m}>{m}</option>{/each}
						</select>
					</div>
					<div class="plan-field"><label class="form-label">Description</button><textarea class="form-control" rows="2" bind:value={cDesc} placeholder="What does your tribe stand for?"></textarea></div>
				</div>

			{:else if createStep === 2}
				<div class="tribe-step-title">Shape your tribe's identity.</div>
				<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
					<div class="plan-field"><label class="form-label">Tribe Motto</button><input class="form-control" bind:value={cMotto} placeholder="e.g. We ride until the servers die" /></div>
					<div class="tribe-tip">Your motto appears on your tribe profile and is visible to all survivors.</div>
				</div>

			{:else if createStep === 3}
				<div class="tribe-step-title">How will survivors join?</div>
				<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
					<button class="tribe-policy-option" class:selected={cOpenPolicy==='open'} onclick={() => cOpenPolicy='open'}>
						<div class="tribe-policy-check">{cOpenPolicy==='open' ? '●' : '○'}</div>
						<div>
							<div class="tribe-policy-name">Open Recruitment</div>
							<div class="tribe-policy-desc">Any survivor can join instantly. Good for casual tribes.</div>
						</div>
					</button>
					<button class="tribe-policy-option" class:selected={cOpenPolicy==='application'} onclick={() => cOpenPolicy='application'}>
						<div class="tribe-policy-check">{cOpenPolicy==='application' ? '●' : '○'}</div>
						<div>
							<div class="tribe-policy-name">Application Required</div>
							<div class="tribe-policy-desc">Survivors send a request. Admins review and approve. Better for serious tribes.</div>
						</div>
					</button>
				</div>
			{/if}

			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>

		<div class="modal-footer">
			{#if createStep > 1}
				<button class="btn btn-ghost" onclick={() => createStep--}>â† Back</button>
			{:else}
				<button class="btn btn-secondary" onclick={() => createStep=0}>Cancel</button>
			{/if}
			{#if createStep < 3}
				<button class="btn btn-primary" onclick={() => { if (!cName.trim()) { err='Name required'; return; } err=''; createStep++; }}>Next â†’</button>
			{:else}
				<button class="btn btn-primary" onclick={createTribe} disabled={saving}>{saving ? 'Founding...' : 'âš” Found Tribe'}</button>
			{/if}
		</div>
	</div>
</div>
{/if}

<!-- Join modal -->
{#if joinOpen !== null}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:420px">
		<div class="modal-header"><h2 class="modal-title">Request to Join</h2><button class="close-btn" onclick={() => joinOpen=null}>&times;</button></div>
		<div class="modal-body">
			<div class="plan-field"><label class="form-label">Message (optional)</button><textarea class="form-control" rows="2" bind:value={jMsg} placeholder="Tell them about yourself..."></textarea></div>
			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => joinOpen=null}>Cancel</button>
			<button class="btn btn-primary" onclick={() => requestJoin(joinOpen!)} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.tribe-desc { color:#94a3b8; font-size:0.88rem; margin-bottom:20px; line-height:1.6; }
.tribe-empty { color:#475569; padding:24px 0; font-size:0.88rem; }

.tribe-member-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:8px; }
.tribe-member { --cut:7px; }
.tribe-member-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 14px; display:flex; align-items:center; gap:10px; }
.tribe-dot { width:8px; height:8px; border-radius:50%; background:#475569; flex-shrink:0; }
.tribe-dot.online { background:#4ade80; box-shadow:0 0 6px rgba(74,222,128,0.5); }
.tribe-minfo { min-width:0; }
.tribe-mname { font-size:0.88rem; font-weight:600; color:#f1f5f9; text-decoration:none; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tribe-mname:hover { color:#00b4ff; }
.tribe-mrole { font-size:0.68rem; color:#64748b; text-transform:capitalize; margin-top:1px; }

.tribe-vault-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
.tribe-ccard { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; }
.tribe-c-species { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.tribe-c-sub { font-size:0.72rem; color:#60a5fa; margin-top:2px; }
.tribe-c-stats { display:flex; gap:10px; margin-top:6px; font-size:0.72rem; color:#64748b; }
.tribe-c-by { font-size:0.65rem; color:#334155; margin-top:4px; }

.tribe-req { margin-bottom:5px; }
.tribe-req-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:center; gap:12px; }
.tribe-req-actions { display:flex; gap:6px; flex-shrink:0; }
.tribe-req-actions .btn { display:flex; align-items:center; gap:4px; }

.tribe-announce { display:flex; flex-direction:column; gap:12px; max-width:560px; }
.tribe-announce-desc { font-size:0.82rem; color:#64748b; }
.tribe-announce .btn { align-self:flex-start; display:flex; align-items:center; gap:6px; }

/* Blacklist */
.tribe-bl-desc { font-size:0.82rem; color:#64748b; margin-bottom:14px; }
.tribe-bl-form { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
.tribe-bl-list { display:flex; flex-direction:column; gap:4px; }
.tribe-bl-row { }
.tribe-bl-inner { background:linear-gradient(160deg,rgba(20,8,8,0.97),rgba(10,4,4,1)); padding:10px 14px; display:flex; align-items:center; gap:10px; }
.tribe-bl-info { flex:1; min-width:0; }
.tribe-bl-name { font-size:0.86rem; font-weight:600; color:#fca5a5; }
.tribe-bl-type { font-size:0.65rem; color:#ef4444; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); padding:1px 6px; margin-left:6px; }
.tribe-bl-reason { font-size:0.75rem; color:#64748b; font-style:italic; margin-top:2px; }

/* Browse */
.tribe-browse-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.tribe-browse-card { --cut:9px; }
.tribe-bc-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:18px 20px; display:flex; flex-direction:column; gap:6px; }
.tribe-bc-name { font-size:1rem; font-weight:700; color:#f1f5f9; }
.tribe-bc-map { font-size:0.72rem; color:#60a5fa; }
.tribe-bc-desc { font-size:0.82rem; color:#64748b; line-height:1.5; }
.tribe-bc-footer { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
.tribe-bc-count { display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#64748b; }
.tribe-section-label { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#334155; margin-bottom:8px; }
.tribe-al-section { display:flex; flex-direction:column; gap:4px; }
.tribe-al-row { margin-bottom:4px; }
.tribe-al-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 14px; display:flex; align-items:center; gap:10px; }
.tribe-al-info { flex:1; min-width:0; }
.tribe-al-name { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.tribe-al-map { font-size:0.7rem; color:#64748b; margin-top:1px; }

/* Multi-step creation */
.tribe-steps { display:flex; align-items:center; gap:0; margin-bottom:20px; }
.tribe-step { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:700; background:rgba(255,255,255,0.05); color:#64748b; border:1px solid rgba(255,255,255,0.1); flex-shrink:0; }
.tribe-step.active { background:rgba(0,180,255,0.2); color:#00b4ff; border-color:rgba(0,180,255,0.5); }
.tribe-step.done  { background:rgba(34,197,94,0.15); color:#4ade80; border-color:rgba(34,197,94,0.4); }
.tribe-step-line { flex:1; height:1px; background:rgba(255,255,255,0.06); }
.tribe-step-line.done { background:rgba(34,197,94,0.3); }
.tribe-step-title { font-size:0.95rem; font-weight:600; color:#f1f5f9; }
.tribe-tip { font-size:0.78rem; color:#475569; background:rgba(0,180,255,0.04); border-left:2px solid rgba(0,180,255,0.25); padding:8px 12px; }

.tribe-policy-option { display:flex; align-items:flex-start; gap:12px; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); cursor:pointer; transition:all .15s; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.tribe-policy-option.selected { background:rgba(0,180,255,0.08); border-color:rgba(0,180,255,0.3); }
.tribe-policy-check { color:#00b4ff; font-size:1rem; flex-shrink:0; margin-top:1px; }
.tribe-policy-name { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.tribe-policy-desc { font-size:0.78rem; color:#64748b; margin-top:2px; line-height:1.4; }
</style>

