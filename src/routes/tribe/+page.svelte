<script lang="ts">
	import { Shield, Users, Dna, Plus, Check, X, LogOut, Megaphone, AlertTriangle, Wand2, Swords, Edit3, UserPlus, Pin, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	let { data }: { data: PageData } = $props();

	type Member    = { id:number; role:string; pinnedCreatureId:number|null; user:{ id:number; nickname:string|null; email:string; lastSeen:string|null } };
	type TribeC    = { id:number; data:Record<string,unknown>; creator:{ id:number; nickname:string|null; email:string } };
	type JoinReq   = { id:number; userId:number; message:string|null; user:{ id:number; nickname:string|null; email:string } };
	type Tribe     = {
		id:number; name:string; mainMap:string|null; description:string|null;
		motto:string|null; bannerUrl:string|null; sigilUrl:string|null;
		recruitmentOpen:boolean; lookingFor:string|null;
		ownerUserId:number; members:Member[]; creatures:TribeC[]; joinRequests:JoinReq[]
	};
	type AllTribe  = { id:number; name:string; description:string|null; mainMap:string|null; memberCount:number };
	type BlackEntry = { id:number; name:string; reason:string|null; type:string; addedAt:string };
	type Activity   = { id:number; eventType:string; metadata:Record<string,unknown>; createdAt:string; user:{ id:number; nickname:string|null; email:string }|null };
	type WarRoom    = { id:number; bossName:string; difficulty:string|null; scheduledAt:string; notes:string|null; status:string; createdBy:{ id:number; nickname:string|null; email:string } };

	let membership  = $state(data.membership as { role:string; tribe:Tribe } | null);
	const myId      = data.myId as number;
	let allTribes   = $state(data.allTribes as AllTribe[] | null);
	let activity    = $state(data.activity as Activity[]);
	let warRooms    = $state(data.warRooms as WarRoom[]);

	let blacklist     = $state<BlackEntry[]>([]);
	let alliances     = $state<Record<string,unknown>[]>([]);
	let alliancesLoaded = $state(false);

	// Multi-step create flow
	let createStep  = $state(0);
	let saving      = $state(false);
	let err         = $state('');

	let cName       = $state('');
	let cDesc       = $state('');
	let cMap        = $state('');
	let cMotto      = $state('');
	let cOpenPolicy = $state<'open'|'application'>('application');

	// Edit-tribe modal
	let editOpen    = $state(false);
	let eMotto      = $state('');
	let eBanner     = $state('');
	let eSigil      = $state('');
	let eRecruit    = $state(false);
	let eLookingFor = $state('');
	let eMap        = $state('');
	let eDesc       = $state('');

	// Invite modal
	let inviteOpen  = $state(false);
	let iHandle     = $state('');

	// War Room scheduling modal
	let warOpen     = $state(false);
	let wBoss       = $state('');
	let wDifficulty = $state('alpha');
	let wScheduled  = $state('');
	let wNotes      = $state('');

	// Announce modal
	let announceOpen = $state(false);
	let announceMsg  = $state('');
	let announcing   = $state(false);

	// Member action menu
	let memberMenu = $state<number|null>(null);

	// Join modal (browse view)
	let joinOpen  = $state<number|null>(null);
	let jMsg      = $state('');

	const MAPS = ['The Island','Scorched Earth','Aberration','Extinction','The Center','Valguero','Ragnarok','Astraeos','Lost Colony','Svartalfheim'];

	const ONLINE_MS = 5 * 60 * 1000;
	function isOnline(ls: string|null) { return !!ls && Date.now() - new Date(ls).getTime() < ONLINE_MS; }
	function display(u: { nickname?:string|null; email?:string|null } | null | undefined) {
		if (!u) return 'Unknown';
		return u.nickname ?? u.email ?? 'Unknown';
	}
	function initial(name: string) { return (name.trim()[0] ?? '?').toUpperCase(); }
	function relTime(iso: string) {
		const ms = Date.now() - new Date(iso).getTime();
		const s = ms / 1000;
		if (s < 60) return 'just now';
		if (s < 3600) return `${Math.floor(s/60)}m ago`;
		if (s < 86400) return `${Math.floor(s/3600)}h ago`;
		return `${Math.floor(s/86400)}d ago`;
	}
	function rankLabel(role: string) {
		return role === 'owner' ? 'Alpha' : role === 'admin' ? 'Officer' : 'Survivor';
	}
	function rankRgb(role: string) {
		return role === 'owner' ? '245,158,11' : role === 'admin' ? '0,180,255' : '167,139,250';
	}
	function eventColor(t: string) {
		if (t.includes('promoted') || t.includes('warroom')) return '245,158,11';
		if (t.includes('joined') || t.includes('accepted')) return '34,197,94';
		if (t.includes('kicked') || t.includes('demoted')) return '239,68,68';
		if (t.includes('alliance')) return '167,139,250';
		if (t.includes('invite')) return '0,180,255';
		return '100,116,139';
	}
	function eventLabel(a: Activity): string {
		const u = display(a.user) ?? 'Someone';
		const m = a.metadata ?? {};
		switch (a.eventType) {
			case 'member_promoted': return `${u} promoted a member to ${String(m.newRole ?? 'admin')}`;
			case 'member_demoted':  return `${u} demoted a member`;
			case 'member_kicked':   return `${u} removed a member`;
			case 'invite_sent':     return `${u} invited ${String(m.targetName ?? 'a survivor')}`;
			case 'warroom_scheduled': return `${u} scheduled a war room: ${String(m.bossName ?? 'a boss')}`;
			case 'tribe_edited':    return `${u} updated tribe identity`;
			case 'member_joined':   return `${u} joined the tribe`;
			default: return `${u} · ${a.eventType.replace(/_/g, ' ')}`;
		}
	}

	function pinnedCreatureFor(memberId: number): TribeC | null {
		if (!membership) return null;
		const m = membership.tribe.members.find(x => x.id === memberId);
		if (!m?.pinnedCreatureId) return null;
		return membership.tribe.creatures.find(c => c.id === m.pinnedCreatureId) ?? null;
	}

	async function loadBlacklist() {
		if (!membership) return;
		const res = await fetch(`/api/tribes/${membership.tribe.id}/blacklist`);
		if (res.ok) blacklist = await res.json();
	}
	async function loadAlliances() {
		const res = await fetch('/api/alliances');
		if (res.ok) alliances = await res.json();
		alliancesLoaded = true;
	}

	onMount(() => {
		if (membership) { loadBlacklist(); loadAlliances(); }
	});

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

	function openEdit() {
		if (!membership) return;
		const t = membership.tribe;
		eMotto = t.motto ?? '';
		eBanner = t.bannerUrl ?? '';
		eSigil = t.sigilUrl ?? '';
		eRecruit = t.recruitmentOpen ?? false;
		eLookingFor = t.lookingFor ?? '';
		eMap = t.mainMap ?? '';
		eDesc = t.description ?? '';
		editOpen = true;
	}
	async function saveEdit() {
		if (!membership) return;
		saving = true;
		const res = await fetch(`/api/tribes/${membership.tribe.id}`, {
			method:'PUT', headers:{'Content-Type':'application/json'},
			body:JSON.stringify({ motto:eMotto||null, bannerUrl:eBanner||null, sigilUrl:eSigil||null, recruitmentOpen:eRecruit, lookingFor:eLookingFor||null, mainMap:eMap||null, description:eDesc||null })
		});
		saving = false;
		if (res.ok) location.reload();
		else alert((await res.json()).error ?? 'Failed');
	}

	async function sendInvite() {
		if (!iHandle.trim() || !membership) return;
		saving = true;
		const res = await fetch(`/api/tribes/${membership.tribe.id}/invite`, {
			method:'POST', headers:{'Content-Type':'application/json'},
			body:JSON.stringify({ handle:iHandle.trim() })
		});
		saving = false;
		if (res.ok) { inviteOpen = false; iHandle = ''; alert('Invite sent.'); }
		else alert((await res.json()).error ?? 'Failed');
	}

	async function scheduleWarRoom() {
		if (!wBoss.trim() || !wScheduled || !membership) return;
		saving = true;
		const res = await fetch(`/api/tribes/${membership.tribe.id}/warroom`, {
			method:'POST', headers:{'Content-Type':'application/json'},
			body:JSON.stringify({ bossName:wBoss.trim(), difficulty:wDifficulty, scheduledAt:new Date(wScheduled).toISOString(), notes:wNotes||null })
		});
		saving = false;
		if (res.ok) { warOpen = false; wBoss=''; wNotes=''; wScheduled=''; location.reload(); }
		else alert((await res.json()).error ?? 'Failed');
	}

	async function memberAction(memberId: number, action: 'promote'|'demote'|'kick') {
		if (!membership) return;
		const verb = action === 'kick' ? 'remove' : action;
		if (!confirm(`${verb.charAt(0).toUpperCase()+verb.slice(1)} this member?`)) return;
		const path = `/api/tribes/${membership.tribe.id}/members/${memberId}`;
		const res = action === 'kick'
			? await fetch(path, { method:'DELETE' })
			: await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }) });
		memberMenu = null;
		if (res.ok) location.reload();
		else alert((await res.json()).error ?? 'Failed');
	}

	async function postAnnouncement() {
		if (!announceMsg.trim() || !membership) return;
		announcing = true;
		await fetch(`/api/tribes/${membership.tribe.id}/announce`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:announceMsg }) });
		announceMsg = ''; announcing = false; announceOpen = false;
		alert('Announcement sent to all members!');
	}

	async function requestAlliance(targetId: number) {
		const res = await fetch('/api/alliances', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ targetTribeId:targetId }) });
		if (res.ok) await loadAlliances();
		else alert((await res.json()).error ?? 'Failed');
	}
	async function respondAlliance(id: number, action: 'accept'|'reject') {
		await fetch(`/api/alliances/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }) });
		await loadAlliances();
	}
	async function breakAlliance(id: number) {
		if (!confirm('Break this alliance?')) return;
		await fetch(`/api/alliances/${id}`, { method:'DELETE' });
		await loadAlliances();
	}

	function bossCardClass(name: string) {
		const n = name.toLowerCase();
		if (n.includes('brood')) return 'brood';
		if (n.includes('mega')) return 'mega';
		if (n.includes('dragon')) return 'dragon';
		if (n.includes('manticore')) return 'manticore';
		if (n.includes('rockwell')) return 'rockwell';
		if (n.includes('king')) return 'king';
		return 'overseer';
	}
</script>

<div class="tek-stage">
{#if membership}
	{@const tribe = membership.tribe}
	{@const isOwner = membership.role === 'owner'}
	{@const isAdmin = membership.role === 'owner' || membership.role === 'admin'}
	{@const allies = alliances.filter((a:Record<string,unknown>) => a.status === 'accepted')}
	{@const incomingAlliances = alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && !(a.isRequester as boolean))}
	{@const nextWarRoom = warRooms[0]}

	<!-- Identity banner -->
	<div class="tribe-banner" style={tribe.bannerUrl ? `background-image: url('${tribe.bannerUrl}'), linear-gradient(135deg, rgba(0,180,255,0.30) 0%, rgba(168,85,247,0.20) 100%);` : ''}>
		<div class="tribe-banner-overlay"></div>
		<div class="tribe-id-card">
			<div class="tribe-sigil">
				{#if tribe.sigilUrl}
					<img src={tribe.sigilUrl} alt="Tribe sigil" />
				{:else}
					<svg viewBox="0 0 100 110">
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.20)" stroke="#00b4ff" stroke-width="2.5" />
						<text x="50" y="70" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#a5d8ff">{initial(tribe.name)}</text>
					</svg>
				{/if}
			</div>
			<div class="tribe-id-info">
				<h1 class="tribe-name">{tribe.name}</h1>
				{#if tribe.motto}<div class="tribe-motto">"{tribe.motto}"</div>{/if}
				<div class="tribe-meta-row">
					<span class="tribe-meta"><Users size={11} /> {tribe.members.length} member{tribe.members.length !== 1 ? 's' : ''}</span>
					{#if tribe.mainMap}<span class="tribe-meta-dot">·</span><span class="tribe-meta">{tribe.mainMap}</span>{/if}
					{#if tribe.recruitmentOpen}<span class="tribe-meta-dot">·</span><span class="tribe-meta recruiting"><span class="pulse-pip"></span>Recruiting</span>{/if}
				</div>
			</div>
			<div class="tribe-actions">
				{#if isOwner}<button class="tek-btn-v2 solid" onclick={openEdit}><Edit3 size={13} strokeWidth={2.5} /> Edit Tribe</button>{/if}
				{#if isAdmin}<button class="tek-btn-v2" onclick={() => inviteOpen = true}><UserPlus size={13} strokeWidth={2.5} /> Invite</button>{/if}
				{#if isAdmin}<button class="tek-btn-v2 ghost" onclick={() => warOpen = true}><Calendar size={13} strokeWidth={2.5} /> Schedule</button>{/if}
				{#if isAdmin}<button class="tek-btn-v2 ghost" onclick={() => announceOpen = true}><Megaphone size={13} strokeWidth={2.5} /> Announce</button>{/if}
				<a href="/tribe/flag" class="tek-btn-v2 ghost"><Wand2 size={13} strokeWidth={2.5} /> Flag</a>
				{#if !isOwner}<button class="tek-btn-v2 danger" onclick={leaveTribe}><LogOut size={14} strokeWidth={2.5} /> Leave</button>{/if}
			</div>
		</div>
	</div>

	{#if tribe.description}<div class="tribe-desc">{tribe.description}</div>{/if}

	<!-- Pending actions panel -->
	{#if isAdmin && tribe.joinRequests.length > 0}
		<div class="pending-panel">
			<div class="pending-head">
				<Shield size={14} />
				<span>Pending Actions</span>
				<span class="pending-count">{tribe.joinRequests.length}</span>
			</div>
			<div class="pending-list">
				{#each tribe.joinRequests as r}
					<div class="pending-row">
						<div class="pending-info">
							<a href="/survivors/{r.user.id}" class="tribe-link"><strong>{display(r.user)}</strong></a> wants to join
							{#if r.message}<span class="pending-msg">"{r.message}"</span>{/if}
						</div>
						<div class="pending-actions">
							<button class="btn btn-success btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'accept')}><Check size={13} /></button>
							<button class="btn btn-danger btn-sm" onclick={() => handleJoinReq(r.id, tribe.id, 'reject')}><X size={13} /></button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Members -->
	<div class="tribe-section-head">
		<Users size={14} />
		<span>Roster</span>
		<span class="section-count">{tribe.members.length}</span>
		<span class="section-rule"></span>
	</div>
	<div class="member-grid">
		{#each tribe.members as m}
			{@const online = isOnline(m.user.lastSeen)}
			{@const rgb = rankRgb(m.role)}
			{@const pinned = pinnedCreatureFor(m.id)}
			<div class="member-card" style="--rank-rgb:{rgb}">
				<span class="rank-chip">⬢ {rankLabel(m.role)}</span>
				<div class="member-avatar">
					<svg viewBox="0 0 100 110">
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(var(--rank-rgb),0.15)" stroke="rgb(var(--rank-rgb))" stroke-width="2" />
						<text x="50" y="70" font-family="Orbitron" font-size="40" font-weight="900" text-anchor="middle" style="fill:rgb(var(--rank-rgb)); filter:brightness(1.6)">{initial(display(m.user))}</text>
					</svg>
					<span class="online-pip" class:online></span>
				</div>
				<a href="/survivors/{m.user.id}" class="member-name">{display(m.user)}</a>
				{#if m.user.id === myId}<span class="self-tag">YOU</span>{/if}
				{#if pinned}
					<div class="member-pinned"><Pin size={9} /> {String((pinned.data as Record<string,unknown>).species ?? '?')}{pinned.data && (pinned.data as Record<string,unknown>).name ? ` "${String((pinned.data as Record<string,unknown>).name)}"` : ''}</div>
				{/if}
				{#if isOwner && m.user.id !== myId && m.role !== 'owner'}
					<div class="member-actions">
						{#if m.role === 'member'}<button class="member-btn promote" onclick={() => memberAction(m.id, 'promote')}>Promote</button>{/if}
						{#if m.role === 'admin'}<button class="member-btn demote" onclick={() => memberAction(m.id, 'demote')}>Demote</button>{/if}
						<button class="member-btn kick" onclick={() => memberAction(m.id, 'kick')}>Remove</button>
					</div>
				{:else if isAdmin && m.user.id !== myId && m.role === 'member'}
					<div class="member-actions">
						<button class="member-btn kick" onclick={() => memberAction(m.id, 'kick')}>Remove</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Tribe vault preview -->
	{#if tribe.creatures.length > 0}
		<div class="tribe-section-head">
			<Dna size={14} />
			<span>Tribe Vault</span>
			<span class="section-count">{tribe.creatures.length}</span>
			<span class="section-rule"></span>
		</div>
		<div class="vault-grid">
			{#each tribe.creatures.slice(0, 6) as c}
				{@const cd = c.data as Record<string,unknown>}
				{@const lvl = Number(cd.level ?? 1)}
				{@const muts = Object.values((cd.mutations as Record<string,number>) ?? {}).reduce((a,b) => a + (Number(b)||0), 0)}
				<div class="vault-card">
					<div class="vault-meta">
						<span class="vault-owner">by {display(c.creator)}</span>
					</div>
					<div class="vault-species">{String(cd.species ?? '?')}</div>
					{#if cd.name}<div class="vault-nick">"{String(cd.name)}"</div>{/if}
					<div class="vault-stats">
						<div class="vault-lvl">{lvl}</div>
						<div class="vault-side">
							<div class="vault-lbl">Mutations</div>
							<div class="vault-muts">{muts}</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Diplomacy 4-card grid -->
	<div class="tribe-section-head">
		<Swords size={14} />
		<span>Diplomacy</span>
		<span class="section-rule"></span>
	</div>
	<div class="diplomacy-grid">
		<!-- Allies -->
		<div class="diplo-card allies">
			<div class="diplo-head">Allies <span class="diplo-count">{allies.length}</span></div>
			{#if allies.length === 0}
				<div class="diplo-empty">No active alliances.</div>
			{:else}
				<div class="diplo-list">
					{#each allies as a}
						{@const partner = (a as Record<string,unknown>).partnerTribe as Record<string,unknown>}
						<div class="diplo-chip">
							<span class="diplo-sigil">⬡</span>
							<span class="diplo-name">{String(partner.name)}</span>
							{#if isAdmin}<button class="diplo-x" title="Break alliance" onclick={() => breakAlliance(Number((a as Record<string,unknown>).id))}><X size={10} /></button>{/if}
						</div>
					{/each}
				</div>
			{/if}
			{#if incomingAlliances.length > 0 && isAdmin}
				<div class="diplo-incoming">
					{#each incomingAlliances as a}
						{@const partner = (a as Record<string,unknown>).partnerTribe as Record<string,unknown>}
						<div class="diplo-incoming-row">
							<span class="diplo-name">{String(partner.name)} wants alliance</span>
							<button class="btn btn-success btn-sm" onclick={() => respondAlliance(Number((a as Record<string,unknown>).id), 'accept')}><Check size={11} /></button>
							<button class="btn btn-danger btn-sm" onclick={() => respondAlliance(Number((a as Record<string,unknown>).id), 'reject')}><X size={11} /></button>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Enemies / Blacklist -->
		<div class="diplo-card enemies">
			<div class="diplo-head">Blacklist <span class="diplo-count">{blacklist.length}</span></div>
			{#if blacklist.length === 0}
				<div class="diplo-empty">No flagged threats. Stay vigilant.</div>
			{:else}
				<div class="diplo-list">
					{#each blacklist as b}
						<div class="diplo-chip enemy">
							<AlertTriangle size={10} />
							<span class="diplo-name">{b.name}</span>
							<span class="diplo-tag">{b.type}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Recruitment status -->
		<div class="diplo-card recruit">
			<div class="diplo-head">Recruitment</div>
			<div class="recruit-status">
				{#if tribe.recruitmentOpen}
					<span class="recruit-pip open"></span>
					<span class="recruit-label">OPEN</span>
				{:else}
					<span class="recruit-pip closed"></span>
					<span class="recruit-label closed">CLOSED</span>
				{/if}
			</div>
			{#if tribe.lookingFor}
				<div class="recruit-note">Looking for: <em>{tribe.lookingFor}</em></div>
			{/if}
		</div>

		<!-- War Room Schedule -->
		<div class="diplo-card warroom">
			<div class="diplo-head">War Room <span class="diplo-count">{warRooms.length}</span></div>
			{#if !nextWarRoom}
				<div class="diplo-empty">No fights scheduled.</div>
			{:else}
				<div class="war-next">
					<div class="war-boss {bossCardClass(nextWarRoom.bossName)}">{nextWarRoom.bossName}{nextWarRoom.difficulty ? ` · ${nextWarRoom.difficulty.toUpperCase()}` : ''}</div>
					<div class="war-when">{new Date(nextWarRoom.scheduledAt).toLocaleString([], { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
					{#if nextWarRoom.notes}<div class="war-notes">{nextWarRoom.notes}</div>{/if}
				</div>
				{#if warRooms.length > 1}<div class="war-more">+{warRooms.length - 1} more scheduled</div>{/if}
			{/if}
		</div>
	</div>

	<!-- Tribe Feed -->
	{#if activity.length > 0}
		<div class="tribe-section-head">
			<span class="feed-icon">▸</span>
			<span>Tribe Feed</span>
			<span class="section-rule"></span>
		</div>
		<div class="feed-list">
			{#each activity as a}
				<div class="feed-row" style="--feed-rgb:{eventColor(a.eventType)}">
					<span class="feed-dot"></span>
					<div class="feed-text">{eventLabel(a)}</div>
					<span class="feed-time">{relTime(a.createdAt)}</span>
				</div>
			{/each}
		</div>
	{/if}

{:else}
	<!-- No tribe — browse view -->
	<div class="tribe-head-row">
		<div class="tek-page-header" data-variant="default">
			<div class="tek-breadcrumb"><a href="/dossier">Dashboard</a><span class="sep">/</span><span>Tribe</span></div>
			<h1 class="t-page-title">Tribe</h1>
			<div class="tek-page-sub">Find your people or forge your own.</div>
		</div>
		<div class="tribe-head-actions">
			<button class="tek-btn-v2 solid" onclick={() => createStep = 1}><Plus size={14} strokeWidth={2.5} /> Found a Tribe</button>
		</div>
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

<!-- ── Multi-step tribe creation ─────────────────────────────────────────────── -->
{#if createStep > 0}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:500px">
		<div class="modal-header">
			<h2 class="modal-title">{createStep === 1 ? 'Found a Tribe — Basics' : createStep === 2 ? 'Identity & Culture' : 'Membership Policy'}</h2>
			<button class="close-btn" onclick={() => createStep=0}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="tribe-steps">
				{#each [1,2,3] as s}
					<div class="tribe-step" class:active={createStep===s} class:done={createStep>s}>{s}</div>
					{#if s < 3}<div class="tribe-step-line" class:done={createStep>s}></div>{/if}
				{/each}
			</div>
			{#if createStep === 1}
				<div class="tribe-step-title">What is your tribe called?</div>
				<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
					<div class="plan-field"><label class="form-label" for="t-name">Tribe Name *</label><input id="t-name" class="form-control" bind:value={cName} placeholder="e.g. Iron Talons" /></div>
					<div class="plan-field"><label class="form-label" for="t-map">Home Server / Map</label>
						<select class="form-control" bind:value={cMap}>
							<option value="">Choose a map...</option>
							{#each MAPS as m}<option value={m}>{m}</option>{/each}
						</select>
					</div>
					<div class="plan-field"><label class="form-label" for="t-desc">Description</label><textarea id="t-desc" class="form-control" rows="2" bind:value={cDesc} placeholder="What does your tribe stand for?"></textarea></div>
				</div>
			{:else if createStep === 2}
				<div class="tribe-step-title">Shape your tribe's identity.</div>
				<div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
					<div class="plan-field"><label class="form-label" for="t-motto">Tribe Motto</label><input id="t-motto" class="form-control" bind:value={cMotto} placeholder="e.g. We ride until the servers die" /></div>
					<div class="tribe-tip">Your motto appears on your tribe profile and is visible to all survivors.</div>
				</div>
			{:else}
				<div class="tribe-step-title">How will survivors join?</div>
				<div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
					<button class="tribe-policy-option" class:selected={cOpenPolicy==='open'} onclick={() => cOpenPolicy='open'}>
						<div class="tribe-policy-check">{cOpenPolicy==='open' ? '●' : '○'}</div>
						<div>
							<div class="tribe-policy-name">Open Recruitment</div>
							<div class="tribe-policy-desc">Any survivor can join instantly. Good for casual tribes.</div>
						</div>
					</button>
					<button class="tribe-policy-option" class:selected={cOpenPolicy==='application'} onclick={() => cOpenPolicy='application'}>
						<div class="tribe-policy-check">{cOpenPolicy==='application' ? '●' : '○'}</div>
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
				<button class="btn btn-ghost" onclick={() => createStep--}>← Back</button>
			{:else}
				<button class="btn btn-secondary" onclick={() => createStep=0}>Cancel</button>
			{/if}
			{#if createStep < 3}
				<button class="btn btn-primary" onclick={() => { if (!cName.trim()) { err='Name required'; return; } err=''; createStep++; }}>Next →</button>
			{:else}
				<button class="btn btn-primary" onclick={createTribe} disabled={saving}>{saving ? 'Founding...' : 'Found Tribe'}</button>
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
			<div class="plan-field"><label class="form-label" for="j-msg">Message (optional)</label><textarea id="j-msg" class="form-control" rows="2" bind:value={jMsg} placeholder="Tell them about yourself..."></textarea></div>
			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => joinOpen=null}>Cancel</button>
			<button class="btn btn-primary" onclick={() => requestJoin(joinOpen!)} disabled={saving}>{saving ? 'Sending...' : 'Send Request'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Edit tribe modal -->
{#if editOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:520px">
		<div class="modal-header"><h2 class="modal-title">Edit Tribe Identity</h2><button class="close-btn" onclick={() => editOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="e-motto">Motto</label><input id="e-motto" class="form-control" bind:value={eMotto} placeholder="A short rallying cry…" maxlength="120" /></div>
			<div class="plan-field"><label class="form-label" for="e-banner">Banner image URL</label><input id="e-banner" class="form-control" bind:value={eBanner} placeholder="https://…" /></div>
			<div class="plan-field"><label class="form-label" for="e-sigil">Sigil image URL</label><input id="e-sigil" class="form-control" bind:value={eSigil} placeholder="https://… (square)" /></div>
			<div class="plan-field"><label class="form-label" for="e-map">Home map</label>
				<select id="e-map" class="form-control" bind:value={eMap}>
					<option value="">— none —</option>
					{#each MAPS as m}<option value={m}>{m}</option>{/each}
				</select>
			</div>
			<div class="plan-field"><label class="form-label" for="e-desc">Description</label><textarea id="e-desc" class="form-control" rows="2" bind:value={eDesc}></textarea></div>
			<label class="toggle-row"><input type="checkbox" bind:checked={eRecruit} /> <span>Recruitment open</span></label>
			<div class="plan-field"><label class="form-label" for="e-lf">Looking for</label><input id="e-lf" class="form-control" bind:value={eLookingFor} placeholder="e.g. Breeders, PvP veterans, builders…" /></div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => editOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Invite modal -->
{#if inviteOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:420px">
		<div class="modal-header"><h2 class="modal-title">Invite a Survivor</h2><button class="close-btn" onclick={() => inviteOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="i-h">Survivor handle</label><input id="i-h" class="form-control" bind:value={iHandle} placeholder="Nickname or email" /></div>
			<div class="tribe-tip">They'll receive an invite notification with a link to your tribe.</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => inviteOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={sendInvite} disabled={saving || !iHandle.trim()}>{saving ? 'Sending…' : 'Send invite'}</button>
		</div>
	</div>
</div>
{/if}

<!-- War Room modal -->
{#if warOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:460px">
		<div class="modal-header"><h2 class="modal-title">Schedule War Room</h2><button class="close-btn" onclick={() => warOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="w-b">Boss</label><input id="w-b" class="form-control" bind:value={wBoss} placeholder="e.g. Dragon, King Titan…" /></div>
			<div class="plan-field"><label class="form-label" for="w-d">Difficulty</label>
				<select id="w-d" class="form-control" bind:value={wDifficulty}>
					<option value="gamma">Gamma</option>
					<option value="beta">Beta</option>
					<option value="alpha">Alpha</option>
				</select>
			</div>
			<div class="plan-field"><label class="form-label" for="w-s">When</label><input id="w-s" class="form-control" type="datetime-local" bind:value={wScheduled} /></div>
			<div class="plan-field"><label class="form-label" for="w-n">Notes</label><textarea id="w-n" class="form-control" rows="2" bind:value={wNotes} placeholder="Saddle requirements, who's bringing what…"></textarea></div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => warOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={scheduleWarRoom} disabled={saving || !wBoss.trim() || !wScheduled}>{saving ? 'Scheduling…' : 'Schedule'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Announce modal -->
{#if announceOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header"><h2 class="modal-title">Send Announcement</h2><button class="close-btn" onclick={() => announceOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
			<div class="tribe-tip">All tribe members will be notified.</div>
			<textarea class="form-control" rows="4" bind:value={announceMsg} placeholder="Write your announcement…"></textarea>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => announceOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={postAnnouncement} disabled={announcing || !announceMsg.trim()}>{announcing ? 'Sending…' : 'Send'}</button>
		</div>
	</div>
</div>
{/if}

<style>
/* ───────── Identity banner ───────── */
.tribe-banner {
	position: relative;
	min-height: 180px;
	background: linear-gradient(135deg, rgba(0,180,255,0.30) 0%, rgba(168,85,247,0.20) 100%);
	background-size: cover;
	background-position: center;
	clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
	margin-bottom: 24px;
	padding: 22px 24px;
	border: 1px solid rgba(0,180,255,0.18);
	overflow: hidden;
}
.tribe-banner-overlay {
	position: absolute; inset: 0;
	background: linear-gradient(160deg, rgba(4,8,20,0.55) 0%, rgba(10,18,44,0.75) 100%);
	pointer-events: none;
}
.tribe-id-card {
	position: relative;
	display: grid;
	grid-template-columns: auto 1fr auto;
	align-items: center;
	gap: 20px;
}
@media (max-width: 720px) {
	.tribe-id-card { grid-template-columns: auto 1fr; }
	.tribe-id-card .tribe-actions { grid-column: 1 / -1; }
}
.tribe-sigil { width: 70px; height: 80px; flex-shrink: 0; filter: drop-shadow(0 0 12px rgba(0,180,255,0.45)); }
.tribe-sigil svg, .tribe-sigil img { width: 100%; height: 100%; object-fit: cover; }
.tribe-id-info { min-width: 0; }
.tribe-name {
	font-family: var(--tek-display);
	font-size: clamp(1.4rem, 3vw, 2rem);
	font-weight: 900;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
	-webkit-background-clip: text; background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
	margin: 0 0 4px;
	line-height: 1.05;
}
.tribe-motto {
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 0.95rem;
	color: #a5d8ff;
	margin-bottom: 8px;
}
.tribe-meta-row { display: flex; align-items: center; gap: 8px; font-family: var(--tek-mono); font-size: 0.7rem; color: var(--tek-text-dim); flex-wrap: wrap; }
.tribe-meta { display: inline-flex; align-items: center; gap: 5px; }
.tribe-meta-dot { color: var(--tek-text-faint); }
.tribe-meta.recruiting { color: #4ade80; }
.pulse-pip { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 5px #4ade80; animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
.tribe-actions { display: flex; gap: 6px; flex-wrap: wrap; }

.tribe-desc { color:#94a3b8; font-size:0.88rem; margin-bottom:20px; line-height:1.6; max-width: 760px; }
.tribe-empty { color: var(--tek-text-faint); padding: 24px 0; font-family: var(--tek-serif); font-style: italic; font-size: 0.95rem; }
.tribe-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
.tribe-head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tribe-link { color: inherit; text-decoration: none; }
.tribe-link:hover { color: var(--tek-blue); }

/* ───────── Section heads ───────── */
.tribe-section-head {
	display: flex;
	align-items: center;
	gap: 10px;
	margin: 28px 0 14px;
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: var(--tek-text);
}
.tribe-section-head .section-count { background: rgba(0,180,255,0.10); color: var(--tek-blue); border: 1px solid rgba(0,180,255,0.22); padding: 1px 7px; border-radius: 99px; font-size: 0.58rem; font-weight: 800; }
.tribe-section-head .section-rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,180,255,0.20), transparent); }
.feed-icon { color: var(--tek-blue); }

/* ───────── Pending actions ───────── */
.pending-panel {
	background: linear-gradient(160deg, rgba(245,158,11,0.06) 0%, rgba(10,18,44,0.85) 100%);
	border: 1px solid rgba(245,158,11,0.25);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 12px 16px;
	margin-bottom: 22px;
}
.pending-head { display: flex; align-items: center; gap: 8px; font-family: var(--tek-mono); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #fcd34d; margin-bottom: 8px; }
.pending-count { background: rgba(245,158,11,0.20); color: #fde047; border: 1px solid rgba(245,158,11,0.50); padding: 1px 7px; border-radius: 99px; font-size: 0.6rem; font-weight: 800; }
.pending-list { display: flex; flex-direction: column; gap: 6px; }
.pending-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.pending-info { flex: 1; font-size: 0.84rem; color: var(--tek-text-dim); }
.pending-info strong { color: var(--tek-text); }
.pending-msg { color: var(--tek-text-faint); font-style: italic; margin-left: 8px; }
.pending-actions { display: flex; gap: 6px; }

/* ───────── Member roster ───────── */
.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.member-card {
	--rank-rgb: 167,139,250;
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	border: 1px solid rgba(var(--rank-rgb), 0.22);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 14px 14px 12px;
	display: flex; flex-direction: column; align-items: center;
	transition: transform 0.18s, filter 0.22s;
	filter: drop-shadow(0 0 1px rgba(var(--rank-rgb), 0.30)) drop-shadow(0 6px 14px rgba(0,0,0,0.35));
}
.member-card:hover { transform: translateY(-1px); filter: drop-shadow(0 0 2px rgba(var(--rank-rgb), 0.7)) drop-shadow(0 10px 22px rgba(0,0,0,0.5)); }
.member-card::before {
	content: '';
	position: absolute;
	left: 0; top: 10px; bottom: 0;
	width: 2px;
	background: rgb(var(--rank-rgb));
	box-shadow: 0 0 6px rgba(var(--rank-rgb), 0.7);
}
.rank-chip {
	font-family: var(--tek-mono);
	font-size: 0.58rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: rgb(var(--rank-rgb));
	background: rgba(var(--rank-rgb), 0.10);
	border: 1px solid rgba(var(--rank-rgb), 0.35);
	padding: 2px 8px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	align-self: flex-start;
	margin-bottom: 8px;
}
.member-avatar { position: relative; width: 56px; height: 64px; margin-bottom: 8px; }
.member-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(var(--rank-rgb), 0.45)); }
.online-pip { position: absolute; bottom: 4px; right: 2px; width: 10px; height: 10px; border-radius: 50%; background: #475569; border: 2px solid rgba(4,8,20,0.95); }
.online-pip.online { background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.7); }
.member-name {
	font-family: var(--tek-display);
	font-size: 0.92rem;
	font-weight: 800;
	color: var(--tek-text);
	letter-spacing: 0.04em;
	text-transform: uppercase;
	text-decoration: none;
	text-align: center;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.member-name:hover { color: var(--tek-blue); }
.self-tag { font-family: var(--tek-mono); font-size: 0.5rem; font-weight: 700; letter-spacing: 0.14em; color: var(--tek-blue); background: rgba(0,180,255,0.12); border: 1px solid rgba(0,180,255,0.35); padding: 1px 6px; margin-top: 4px; clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%); }
.member-pinned { font-family: var(--tek-mono); font-size: 0.62rem; color: var(--tek-text-faint); margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; }
.member-actions { display: flex; gap: 4px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); width: 100%; justify-content: center; opacity: 0; transition: opacity 0.18s; }
.member-card:hover .member-actions { opacity: 1; }
.member-btn { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: var(--tek-text-dim); font-family: var(--tek-mono); font-size: 0.56rem; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; padding: 4px 8px; cursor: pointer; clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%); }
.member-btn.promote:hover { background: rgba(34,197,94,0.18); color: #4ade80; border-color: rgba(34,197,94,0.45); }
.member-btn.demote:hover  { background: rgba(245,158,11,0.18); color: #fcd34d; border-color: rgba(245,158,11,0.45); }
.member-btn.kick:hover    { background: rgba(239,68,68,0.18);  color: #fca5a5; border-color: rgba(239,68,68,0.45); }

/* ───────── Tribe vault preview ───────── */
.vault-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.vault-card {
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	border: 1px solid rgba(0,180,255,0.18);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 12px 14px;
}
.vault-card::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 0; width: 2px; background: var(--tek-blue); box-shadow: 0 0 5px var(--tek-blue-glow); }
.vault-meta { font-family: var(--tek-mono); font-size: 0.56rem; letter-spacing: 0.14em; color: var(--tek-text-faint); text-transform: uppercase; margin-bottom: 4px; }
.vault-species {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	letter-spacing: 0.05em;
	color: var(--tek-text);
	text-transform: uppercase;
	background: linear-gradient(135deg, #ffffff 0%, #a5d8ff 100%);
	-webkit-background-clip: text; background-clip: text;
	-webkit-text-fill-color: transparent;
}
.vault-nick { font-family: var(--tek-mono); font-size: 0.7rem; color: var(--tek-text-dim); font-style: italic; margin-bottom: 8px; }
.vault-stats { display: flex; align-items: baseline; justify-content: space-between; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); }
.vault-lvl {
	font-family: var(--tek-display);
	font-size: 1.5rem;
	font-weight: 900;
	background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
	-webkit-background-clip: text; background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 5px rgba(0,180,255,0.25));
	line-height: 1;
}
.vault-side { text-align: right; }
.vault-lbl { font-family: var(--tek-mono); font-size: 0.5rem; letter-spacing: 0.18em; color: var(--tek-text-faint); text-transform: uppercase; }
.vault-muts { font-family: var(--tek-mono); font-size: 0.74rem; font-weight: 700; color: var(--tek-blue); text-shadow: 0 0 5px var(--tek-blue-glow); }

/* ───────── Diplomacy grid ───────── */
.diplomacy-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 980px) { .diplomacy-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .diplomacy-grid { grid-template-columns: 1fr; } }
.diplo-card {
	--accent-rgb: 0,180,255;
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	border: 1px solid rgba(var(--accent-rgb), 0.18);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 12px 14px;
	min-height: 140px;
}
.diplo-card::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 0; width: 2px; background: rgb(var(--accent-rgb)); box-shadow: 0 0 5px rgba(var(--accent-rgb), 0.6); }
.diplo-card.allies   { --accent-rgb: 34,197,94; }
.diplo-card.enemies  { --accent-rgb: 239,68,68; }
.diplo-card.recruit  { --accent-rgb: 167,139,250; }
.diplo-card.warroom  { --accent-rgb: 245,158,11; }
.diplo-head {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	color: rgb(var(--accent-rgb));
	text-transform: uppercase;
	margin-bottom: 10px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.diplo-count { background: rgba(var(--accent-rgb), 0.15); border: 1px solid rgba(var(--accent-rgb), 0.40); color: rgb(var(--accent-rgb)); font-size: 0.55rem; font-weight: 800; border-radius: 99px; padding: 1px 6px; }
.diplo-empty { font-family: var(--tek-serif); font-style: italic; font-size: 0.78rem; color: var(--tek-text-faint); }
.diplo-list { display: flex; flex-direction: column; gap: 5px; }
.diplo-chip {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	background: rgba(var(--accent-rgb), 0.08);
	border: 1px solid rgba(var(--accent-rgb), 0.22);
	color: var(--tek-text-dim);
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	padding: 4px 10px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.diplo-sigil { color: rgb(var(--accent-rgb)); }
.diplo-name { color: var(--tek-text); font-weight: 600; flex: 1; }
.diplo-tag { font-size: 0.56rem; color: rgb(var(--accent-rgb)); opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em; }
.diplo-x { background: none; border: none; color: var(--tek-text-faint); cursor: pointer; padding: 0; margin-left: auto; display: flex; }
.diplo-x:hover { color: #f87171; }
.diplo-chip.enemy { color: #fca5a5; }
.diplo-incoming { margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 6px; }
.diplo-incoming-row { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; }
.diplo-incoming-row .diplo-name { font-style: italic; color: var(--tek-text-dim); font-weight: 500; }
.recruit-status { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.recruit-pip { width: 8px; height: 8px; border-radius: 50%; }
.recruit-pip.open { background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.7); animation: pulse 1.6s ease-in-out infinite; }
.recruit-pip.closed { background: #64748b; }
.recruit-label { font-family: var(--tek-display); font-size: 1rem; font-weight: 900; letter-spacing: 0.10em; color: #4ade80; text-shadow: 0 0 6px rgba(74,222,128,0.5); }
.recruit-label.closed { color: var(--tek-text-faint); text-shadow: none; }
.recruit-note { font-family: var(--tek-mono); font-size: 0.7rem; color: var(--tek-text-dim); }
.recruit-note em { font-style: normal; color: var(--tek-text); }
.war-next { display: flex; flex-direction: column; gap: 6px; }
.war-boss { font-family: var(--tek-display); font-size: 0.95rem; font-weight: 800; color: #fde047; text-transform: uppercase; letter-spacing: 0.06em; text-shadow: 0 0 6px rgba(245,158,11,0.4); }
.war-when { font-family: var(--tek-mono); font-size: 0.74rem; color: var(--tek-text); }
.war-notes { font-family: var(--tek-mono); font-size: 0.68rem; color: var(--tek-text-faint); font-style: italic; }
.war-more { margin-top: 8px; font-family: var(--tek-mono); font-size: 0.6rem; color: var(--tek-text-faint); }

/* ───────── Tribe feed ───────── */
.feed-list { display: flex; flex-direction: column; gap: 4px; max-width: 760px; }
.feed-row {
	--feed-rgb: 100,116,139;
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 7px 12px;
	background: linear-gradient(160deg, rgba(10,18,44,0.55) 0%, rgba(4,8,20,0.80) 100%);
	border-left: 2px solid rgb(var(--feed-rgb));
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.feed-dot { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--feed-rgb)); box-shadow: 0 0 5px rgba(var(--feed-rgb), 0.7); flex-shrink: 0; }
.feed-text { flex: 1; font-family: var(--tek-mono); font-size: 0.78rem; color: var(--tek-text-dim); }
.feed-time { font-family: var(--tek-mono); font-size: 0.62rem; color: var(--tek-text-faint); letter-spacing: 0.06em; }

/* ───────── Toggle row (edit modal) ───────── */
.toggle-row { display: flex; align-items: center; gap: 8px; font-family: var(--tek-mono); font-size: 0.82rem; color: var(--tek-text-dim); cursor: pointer; }
.toggle-row input { accent-color: var(--tek-blue); }

/* ───────── Browse view (kept from original) ───────── */
.tribe-browse-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.tribe-browse-card { --cut:9px; }
.tribe-bc-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:18px 20px; display:flex; flex-direction:column; gap:6px; }
.tribe-bc-name { font-size:1rem; font-weight:700; color:#f1f5f9; }
.tribe-bc-map { font-size:0.72rem; color:#60a5fa; }
.tribe-bc-desc { font-size:0.82rem; color:#64748b; line-height:1.5; }
.tribe-bc-footer { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
.tribe-bc-count { display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#64748b; }

/* ───────── Multi-step creation ───────── */
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
