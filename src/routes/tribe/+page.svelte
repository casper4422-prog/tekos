<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { computeBadges } from '$lib/badges';
	let { data }: { data: PageData } = $props();

	function categoryForSpecies(species: string): string {
		const s = species.toLowerCase();
		if (/(wyvern|argentavis|pteranodon|griffin|quetz|tapejara|tropeognathus)/.test(s)) return 'flyer';
		if (/(basilosaurus|mosasaur|tusoteuthis|megalodon|ichthyosaur)/.test(s)) return 'water';
		if (/(rex|yutyrannus|carcha|allosaurus|spino|giga|theriz|carno|raptor|sabertooth)/.test(s)) return 'combat';
		if (/(doedicurus|ankylo|beaver|mammoth)/.test(s)) return 'resource';
		if (/(direwolf|ravager|equus|paraceratherium|stego|trike)/.test(s)) return 'mount';
		return 'utility';
	}
	function tierLabelFor(baseStats: Record<string,number>|undefined, mutations: Record<string,number>|undefined): string {
		const b = computeBadges(baseStats, mutations);
		if (b.bossReady) return `Boss · ${b.bossReady}`;
		if (b.bloodline) return `${b.bloodline.charAt(0).toUpperCase() + b.bloodline.slice(1)}`;
		return 'Standard';
	}

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
	function rankClass(role: string) {
		return role === 'owner' ? 'alpha' : role === 'admin' ? 'officer' : 'survivor';
	}
	function rankLabel(role: string) {
		return role === 'owner' ? 'Alpha' : role === 'admin' ? 'Officer' : 'Survivor';
	}
	function rankFill(role: string) {
		return role === 'owner' ? 'rgba(255,215,0,0.15)' : role === 'admin' ? 'rgba(0,180,255,0.15)' : 'rgba(167,139,250,0.15)';
	}
	function rankStroke(role: string) {
		return role === 'owner' ? '#ffd700' : role === 'admin' ? '#00b4ff' : '#a78bfa';
	}
	function rankTextFill(role: string) {
		return role === 'owner' ? '#fcd34d' : role === 'admin' ? '#7dd3fc' : '#c4b5fd';
	}
	function feedDotClass(t: string) {
		if (t.includes('warroom') || t.includes('boss')) return 'boss';
		if (t.includes('joined') || t.includes('member_joined')) return 'tribe';
		if (t.includes('alliance')) return 'alliance';
		if (t.includes('mutation') || t.includes('species') || t.includes('creature')) return 'species';
		if (t.includes('badge') || t.includes('gold')) return 'gold';
		if (t.includes('diamond')) return 'diamond';
		return '';
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
	}

	onMount(() => {
		if (membership) { loadBlacklist(); loadAlliances(); }

		// Hex canvas animation
		const canvas = document.getElementById('tekHexCanvas') as HTMLCanvasElement | null;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const R = 32, W = R * Math.sqrt(3), H = R * 2;
		let phase = 0;
		let raf = 0;
		function drawHex(x: number, y: number, opacity: number) {
			ctx!.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = x + (R - 1) * Math.cos(a);
				const py = y + (R - 1) * Math.sin(a);
				i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
			}
			ctx!.closePath();
			ctx!.strokeStyle = `rgba(0,180,255,${opacity})`;
			ctx!.lineWidth = 1;
			ctx!.stroke();
		}
		function draw() {
			ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
			const cw = canvas!.width, ch = canvas!.height;
			const cols = Math.ceil(cw / W) + 3;
			const rows = Math.ceil(ch / (H * 0.75)) + 3;
			for (let row = -1; row < rows; row++) {
				for (let col = -1; col < cols; col++) {
					const x = col * W + (row % 2 !== 0 ? W / 2 : 0);
					const y = row * H * 0.75;
					const dx = x - cw * 0.5, dy = y - ch * 0.5;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const wave = Math.sin(phase - dist * 0.01) * 0.5 + 0.5;
					drawHex(x, y, 0.07 + wave * 0.09);
				}
			}
			phase += 0.005;
			raf = requestAnimationFrame(draw);
		}
		function resize() { canvas!.width = window.innerWidth; canvas!.height = window.innerHeight; }
		window.addEventListener('resize', resize);
		resize(); draw();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
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

	async function respondAlliance(id: number, action: 'accept'|'reject') {
		await fetch(`/api/alliances/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action }) });
		await loadAlliances();
	}
	async function breakAlliance(id: number) {
		if (!confirm('Break this alliance?')) return;
		await fetch(`/api/alliances/${id}`, { method:'DELETE' });
		await loadAlliances();
	}
</script>

<canvas id="tekHexCanvas"></canvas>

<div class="stage">
{#if membership}
	{@const tribe = membership.tribe}
	{@const isOwner = membership.role === 'owner'}
	{@const isAdmin = membership.role === 'owner' || membership.role === 'admin'}
	{@const allies = alliances.filter((a:Record<string,unknown>) => a.status === 'accepted')}
	{@const incomingAlliances = alliances.filter((a:Record<string,unknown>) => a.status === 'pending' && !(a.isRequester as boolean))}
	{@const nextWarRoom = warRooms[0]}
	{@const onlineCount = tribe.members.filter(m => isOnline(m.user.lastSeen)).length}
	{@const pendingTotal = tribe.joinRequests.length + (isAdmin && nextWarRoom ? 1 : 0) + incomingAlliances.length}

	<!-- ═══════════ IDENTITY BANNER ═══════════ -->
	<section class="tribe-banner-wrap">
		<div class="tribe-banner-image" style={tribe.bannerUrl ? `background-image: url('${tribe.bannerUrl}');` : ''}><div class="banner-gradient-fade"></div></div>
		<div class="tribe-identity-card">
			<!-- Tribe sigil -->
			<div class="tribe-sigil">
				{#if tribe.sigilUrl}
					<img src={tribe.sigilUrl} alt="Tribe sigil" style="width:100%;height:100%;object-fit:cover;filter:drop-shadow(0 0 14px rgba(0,180,255,0.50));" />
				{:else}
					<svg viewBox="0 0 100 110" preserveAspectRatio="xMidYMid meet">
						<defs>
							<linearGradient id="sigil" x1="0" y1="0" x2="1" y2="1">
								<stop offset="0%" stop-color="#00b4ff" stop-opacity="0.35"/>
								<stop offset="60%" stop-color="#8b5cf6" stop-opacity="0.40"/>
								<stop offset="100%" stop-color="#ef4444" stop-opacity="0.32"/>
							</linearGradient>
						</defs>
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="url(#sigil)" stroke="#00b4ff" stroke-width="2.5" />
						<polygon points="50,18 80,36 80,74 50,92 20,74 20,36" fill="none" stroke="#8b5cf6" stroke-width="1" opacity="0.4" />
						<text x="50" y="72" font-family="Orbitron, sans-serif" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{initial(tribe.name)}</text>
					</svg>
				{/if}
			</div>

			<!-- Identity info -->
			<div class="tribe-info">
				<h1 class="tribe-name">{tribe.name}</h1>
				{#if tribe.motto}<p class="tribe-motto">{tribe.motto}</p>{/if}
				<div class="tribe-meta">
					<span class="members">⬢ {tribe.members.length} SURVIVOR{tribe.members.length === 1 ? '' : 'S'}</span>
					{#if tribe.mainMap}
						<span class="sep">·</span>
						<span class="server">⌬ {tribe.mainMap.toUpperCase()}</span>
					{/if}
					{#if tribe.recruitmentOpen}
						<span class="sep">·</span>
						<span class="founded">RECRUITING</span>
					{/if}
				</div>
			</div>

			<!-- Owner action buttons -->
			<div class="tribe-actions">
				{#if isOwner}<button class="btn btn-primary" onclick={openEdit}>Edit Tribe</button>{/if}
				{#if isAdmin}<button class="btn btn-ghost" onclick={() => inviteOpen = true}>⬡ Invite Survivor</button>{/if}
				{#if isAdmin}<button class="btn btn-ghost" onclick={() => warOpen = true}>⚔ Schedule</button>{/if}
				{#if isAdmin}<button class="btn btn-ghost" onclick={() => announceOpen = true}>◆ Announce</button>{/if}
				{#if !isOwner}<button class="btn btn-ghost" onclick={leaveTribe}>↩ Leave</button>{/if}
			</div>
		</div>
	</section>

	<!-- ═══════════ PENDING ACTIONS ═══════════ -->
	{#if isAdmin && pendingTotal > 0}
	<div class="pending-panel">
		<div class="pending-header">
			<span class="pip"></span>
			<span class="title"><span class="count">{pendingTotal}</span>Pending Actions</span>
			<span class="visibility">
				Visible to <span class="perm">Alpha &amp; Officers</span>
				<span class="restricted-note"><span class="lock-glyph">🔒</span>Some actions require Alpha or Officer</span>
			</span>
		</div>
		<div class="pending-list">

			{#if nextWarRoom}
			<!-- Boss fight -->
			<div class="pending-item">
				<div class="pending-icon-wrap boss">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
						<line x1="13" y1="19" x2="19" y2="13"/>
						<line x1="16" y1="16" x2="20" y2="20"/>
						<line x1="19" y1="21" x2="21" y2="19"/>
					</svg>
				</div>
				<div class="pending-info">
					<span class="label">{nextWarRoom.difficulty ? nextWarRoom.difficulty.charAt(0).toUpperCase() + nextWarRoom.difficulty.slice(1) + ' ' : ''}{nextWarRoom.bossName} War Room</span>
					<span class="meta">{nextWarRoom.notes ?? 'Scheduled fight'}</span>
				</div>
				<div class="pending-timer">{new Date(nextWarRoom.scheduledAt).toLocaleDateString([], { month:'short', day:'numeric' })}</div>
				<button class="pending-btn boss">Open War Room ▸</button>
			</div>
			{/if}

			{#if tribe.joinRequests.length > 0}
			<!-- Join requests -->
			<div class="pending-item">
				<div class="pending-icon-wrap">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="8.5" cy="7" r="4"/>
						<line x1="20" y1="8" x2="20" y2="14"/>
						<line x1="23" y1="11" x2="17" y2="11"/>
					</svg>
				</div>
				<div class="pending-info">
					<span class="label">{tribe.joinRequests.length} Join Request{tribe.joinRequests.length === 1 ? '' : 's'}</span>
					<span class="meta">
						{#each tribe.joinRequests.slice(0,3) as r, i}
							<span class="who">{display(r.user)}</span>{#if i < Math.min(tribe.joinRequests.length, 3) - 1}, {/if}
						{/each}
						{#if tribe.joinRequests.length > 0} awaiting approval{/if}
					</span>
				</div>
				<div class="pending-timer-empty"></div>
				<div style="display:flex;gap:6px;">
					{#each tribe.joinRequests as r}
						<button class="pending-btn alliance" onclick={() => handleJoinReq(r.id, tribe.id, 'accept')}>✓ {display(r.user)}</button>
						<button class="pending-btn boss" onclick={() => handleJoinReq(r.id, tribe.id, 'reject')}>✕</button>
					{/each}
				</div>
			</div>
			{/if}

			{#each incomingAlliances as a}
				{@const partner = (a as Record<string,unknown>).partnerTribe as Record<string,unknown>}
			<!-- Alliance proposal -->
			<div class="pending-item">
				<div class="pending-icon-wrap alliance">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
					</svg>
				</div>
				<div class="pending-info">
					<span class="label">Alliance Proposal</span>
					<span class="meta"><span class="who">{String(partner.name)}</span> tribe wants to ally</span>
				</div>
				<div class="pending-timer-empty"></div>
				<div style="display:flex;gap:6px;">
					<button class="pending-btn alliance" onclick={() => respondAlliance(Number((a as Record<string,unknown>).id), 'accept')}>Accept ▸</button>
					<button class="pending-btn boss" onclick={() => respondAlliance(Number((a as Record<string,unknown>).id), 'reject')}>Reject</button>
				</div>
			</div>
			{/each}

		</div>
	</div>
	{/if}

	<!-- ═══════════ MEMBER ROSTER ═══════════ -->
	<section class="section">
		<div class="section-header">
			<span class="pip"></span>
			Roster · <span class="count">{tribe.members.length} SURVIVOR{tribe.members.length === 1 ? '' : 'S'} · {onlineCount} ONLINE</span>
			<span class="rule"></span>
		</div>
		<div class="member-grid">

			{#each tribe.members as m}
				{@const online = isOnline(m.user.lastSeen)}
				{@const rc = rankClass(m.role)}
				{@const pinned = pinnedCreatureFor(m.id)}
				{@const pd = pinned?.data as Record<string,unknown> | undefined}
				<div class="member-card {rc}">
					<div class="member-top">
						<span class="rank-chip">⬢ {rankLabel(m.role)}</span>
						<button class="member-menu-btn" title="Manage">⋮</button>
					</div>
					<div class="member-avatar">
						<svg viewBox="0 0 100 110">
							<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill={rankFill(m.role)} stroke={rankStroke(m.role)} stroke-width="2"/>
							<text x="50" y="70" font-family="Orbitron" font-size="42" font-weight="900" text-anchor="middle" fill={rankTextFill(m.role)}>{initial(display(m.user))}</text>
						</svg>
						<div class="pip" class:offline={!online}></div>
					</div>
					<div class="member-callsign"><a href="/survivors/{m.user.id}" style="color:inherit;text-decoration:none;">{display(m.user)}</a></div>
					<div class="member-status" class:online>{online ? '● Online' : (m.user.lastSeen ? relTime(m.user.lastSeen) : 'Offline')}</div>
					{#if pinned && pd}
						<div class="member-pinned">Pinned: <span class="species">{String(pd.species ?? '?')}{pd.name ? ` "${String(pd.name)}"` : ''}</span></div>
					{:else}
						<div class="member-pinned"><span class="species">No pin</span></div>
					{/if}
					<div class="member-stats">
						<div class="member-stat"><div class="member-stat-val">{membership.tribe.creatures.filter(c => c.creator.id === m.user.id).length}</div><div class="member-stat-lbl">Specimens</div></div>
						<div class="member-stat"><div class="member-stat-val">{m.user.id === myId ? 'YOU' : '—'}</div><div class="member-stat-lbl">Status</div></div>
					</div>
					{#if isOwner && m.user.id !== myId && m.role !== 'owner'}
						<div class="member-actions">
							{#if m.role === 'member'}<button class="member-action" onclick={() => memberAction(m.id, 'promote')}>Promote</button>{/if}
							{#if m.role === 'admin'}<button class="member-action" onclick={() => memberAction(m.id, 'demote')}>Demote</button>{/if}
							<button class="member-action kick" onclick={() => memberAction(m.id, 'kick')}>Kick</button>
						</div>
					{:else if isAdmin && m.user.id !== myId && m.role === 'member'}
						<div class="member-actions">
							<button class="member-action kick" onclick={() => memberAction(m.id, 'kick')}>Kick</button>
						</div>
					{/if}
				</div>
			{/each}

			{#if isAdmin}
			<!-- Invite placeholder -->
			<div class="member-invite" onclick={() => inviteOpen = true} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') inviteOpen = true; }}>
				<div class="member-invite-glyph">+</div>
				<div class="member-invite-label">Invite Survivor</div>
			</div>
			{/if}

		</div>
	</section>

	<!-- ═══════════ TRIBE VAULT preview ═══════════ -->
	{#if tribe.creatures.length > 0}
	<section class="section">
		<div class="section-header">
			<span class="pip"></span>
			Tribe Vault · <span class="count">{tribe.creatures.length} SPECIMENS</span>
			<span class="rule"></span>
			<a class="action" href="/vault">View Full Vault <span class="arrow">▸</span></a>
		</div>
		<div class="vault-row">
			{#each tribe.creatures.slice(0, 3) as c}
				{@const cd = c.data as Record<string,unknown>}
				{@const lvl = Number(cd.level ?? 1)}
				{@const muts = Object.values((cd.mutations as Record<string,number>) ?? {}).reduce((a,b) => a + (Number(b)||0), 0)}
				{@const cat = categoryForSpecies(String(cd.species ?? ''))}
				{@const tier = tierLabelFor(cd.baseStats as Record<string,number>|undefined, cd.mutations as Record<string,number>|undefined)}
				<div class="trophy-card {cat}">
					<div class="trophy-top">
						<span class="trophy-owner">by <span class="name">{display(c.creator)}</span></span>
						<span class="trophy-tier">⬢ {tier}</span>
					</div>
					<div class="trophy-species">{String(cd.species ?? '?')}</div>
					{#if cd.name}<div class="trophy-nick">"{String(cd.name)}"</div>{/if}
					<div class="trophy-bottom">
						<div class="trophy-lvl">{lvl}</div>
						<div class="trophy-muts">{muts} muts</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
	{/if}

	<!-- ═══════════ TRIBE FEED ═══════════ -->
	{#if activity.length > 0}
	<section class="section">
		<div class="section-header">
			<span class="pip"></span>
			Tribe Feed
			<span class="rule"></span>
			{#if isAdmin}<button class="action" onclick={() => announceOpen = true}>+ Post Announcement <span class="arrow">▸</span></button>{/if}
		</div>
		<div class="feed">
			{#each activity as a}
				<div class="feed-row">
					<span class="feed-dot {feedDotClass(a.eventType)}"></span>
					<span class="feed-text">{eventLabel(a)}</span>
					<span class="feed-time">{relTime(a.createdAt)}</span>
				</div>
			{/each}
		</div>
	</section>
	{/if}

	<!-- ═══════════ DIPLOMACY ═══════════ -->
	<section class="section">
		<div class="section-header">
			<span class="pip"></span>
			Diplomacy
			<span class="rule"></span>
		</div>
		<div class="diplomacy-grid">

			<!-- Allies -->
			<div class="diplo-card allies">
				<div class="diplo-header allies">
					<span>◇ Allies</span>
					<span class="diplo-count">{allies.length} TRIBE{allies.length === 1 ? '' : 'S'}</span>
				</div>
				<div class="diplo-tribes">
					{#if allies.length === 0}
						<span style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);font-size:0.85rem;">No active alliances.</span>
					{:else}
						{#each allies as a}
							{@const partner = (a as Record<string,unknown>).partnerTribe as Record<string,unknown>}
							<div class="diplo-tribe-chip">
								<svg class="sigil" viewBox="0 0 100 110" fill="currentColor"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="none" stroke="currentColor" stroke-width="6"/></svg>
								<span class="tribe-name">{String(partner.name)}</span>
								{#if isAdmin}<button onclick={() => breakAlliance(Number((a as Record<string,unknown>).id))} style="background:none;border:none;color:var(--tek-text-faint);cursor:pointer;margin-left:4px;">✕</button>{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Enemies / Blacklist -->
			<div class="diplo-card enemies">
				<div class="diplo-header enemies">
					<span>◯ Blacklist</span>
					<span class="diplo-count">{blacklist.length} TRIBE{blacklist.length === 1 ? '' : 'S'}</span>
				</div>
				<div class="diplo-tribes">
					{#if blacklist.length === 0}
						<span style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);font-size:0.85rem;">No flagged threats.</span>
					{:else}
						{#each blacklist as b}
							<div class="diplo-tribe-chip enemy">
								<svg class="sigil" viewBox="0 0 100 110" fill="currentColor"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="none" stroke="currentColor" stroke-width="6"/></svg>
								<span class="tribe-name">{b.name}</span>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Recruitment Status -->
			<div class="diplo-card recruitment">
				<div class="diplo-header recruitment">
					<span>◎ Recruitment</span>
				</div>
				<div class="recruitment-status">
					<span class="status-pip"></span>
					<span class="status-text">{tribe.recruitmentOpen ? 'Open · Accepting Survivors' : 'Closed'}</span>
				</div>
				{#if tribe.lookingFor}
					<div class="recruitment-detail">
						<div class="label">Looking for</div>
						{tribe.lookingFor}
					</div>
				{/if}
			</div>

			<!-- War Room Schedule -->
			<div class="diplo-card">
				<div class="diplo-header warroom">
					<span>⚔ Next War Room</span>
				</div>
				{#if nextWarRoom}
					<div class="warroom-info">
						<div class="warroom-boss">{nextWarRoom.difficulty ? nextWarRoom.difficulty.charAt(0).toUpperCase() + nextWarRoom.difficulty.slice(1) + ' ' : ''}{nextWarRoom.bossName}</div>
						<div class="warroom-date">{new Date(nextWarRoom.scheduledAt).toLocaleString([], { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).toUpperCase()}</div>
						{#if nextWarRoom.notes}<div class="warroom-detail">{nextWarRoom.notes}</div>{/if}
					</div>
				{:else}
					<div class="warroom-info" style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);">No fights scheduled.</div>
				{/if}
			</div>

		</div>
	</section>

{:else}
	<!-- ═══════════ BROWSE VIEW ═══════════ -->
	<section class="tribe-banner-wrap">
		<div class="tribe-banner-image"><div class="banner-gradient-fade"></div></div>
		<div class="tribe-identity-card" style="grid-template-columns: 1fr auto;">
			<div class="tribe-info">
				<h1 class="tribe-name">Find Your Tribe</h1>
				<p class="tribe-motto">Forge your own banner or join an existing crew. The wilds answer to those who travel in numbers.</p>
				<div class="tribe-meta">
					<span class="members">⬢ {allTribes?.length ?? 0} TRIBES</span>
					<span class="sep">·</span>
					<span class="founded">RECRUITING</span>
				</div>
			</div>
			<div class="tribe-actions">
				<button class="btn btn-primary" onclick={() => createStep = 1}>+ Found a Tribe</button>
			</div>
		</div>
	</section>

	<section class="section">
		<div class="section-header">
			<span class="pip"></span>
			Active Tribes <span class="rule"></span>
		</div>
		{#if (allTribes?.length ?? 0) === 0}
			<div style="font-family:var(--tek-serif);font-style:italic;color:var(--tek-text-faint);padding:24px 0;">No tribes yet. Be the first to found one.</div>
		{:else}
			<div class="member-grid">
				{#each (allTribes ?? []) as t}
					<div class="member-card officer">
						<div class="member-top">
							<span class="rank-chip">⬢ Tribe</span>
						</div>
						<div class="member-avatar">
							<svg viewBox="0 0 100 110">
								<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.15)" stroke="#00b4ff" stroke-width="2"/>
								<text x="50" y="70" font-family="Orbitron" font-size="42" font-weight="900" text-anchor="middle" fill="#7dd3fc">{initial(t.name)}</text>
							</svg>
						</div>
						<div class="member-callsign">{t.name}</div>
						<div class="member-status">{t.mainMap ?? '—'}</div>
						{#if t.description}<div class="member-pinned"><span class="species">{t.description}</span></div>{/if}
						<div class="member-stats">
							<div class="member-stat"><div class="member-stat-val">{t.memberCount}</div><div class="member-stat-lbl">Members</div></div>
							<div class="member-stat"><button class="member-action" style="margin-top:6px;" onclick={() => { joinOpen = t.id; jMsg=''; err=''; }}>Join</button></div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
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
				<button class="btn btn-ghost" onclick={() => createStep=0}>Cancel</button>
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
			<button class="btn btn-ghost" onclick={() => joinOpen=null}>Cancel</button>
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
			<button class="btn btn-ghost" onclick={() => editOpen=false}>Cancel</button>
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
			<button class="btn btn-ghost" onclick={() => inviteOpen=false}>Cancel</button>
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
			<button class="btn btn-ghost" onclick={() => warOpen=false}>Cancel</button>
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
			<button class="btn btn-ghost" onclick={() => announceOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={postAnnouncement} disabled={announcing || !announceMsg.trim()}>{announcing ? 'Sending…' : 'Send'}</button>
		</div>
	</div>
</div>
{/if}

<style>
:global(#tekHexCanvas) { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
	position: relative; z-index: 2;
	min-height: 100vh;
	padding: 60px 24px 80px;
	max-width: 1180px;
	margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   IDENTITY BANNER (uploaded banner + hex sigil)
   ═════════════════════════════════════════════════════════════════════════ */
.tribe-banner-wrap {
	position: relative;
	margin-bottom: 56px;
}

.tribe-banner-image {
	height: 200px;
	background:
		radial-gradient(circle 140px at 18% 50%, rgba(0,180,255,0.30), transparent 65%),
		radial-gradient(circle 200px at 50% 50%, rgba(139,92,246,0.18), transparent 70%),
		radial-gradient(circle 180px at 85% 50%, rgba(239,68,68,0.18), transparent 65%),
		linear-gradient(135deg, rgba(0,180,255,0.12) 0%, rgba(139,92,246,0.20) 50%, rgba(239,68,68,0.10) 100%),
		#0a1228;
	background-size: cover;
	background-position: center;
	clip-path: polygon(16px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 16px);
	position: relative;
	overflow: hidden;
}
.tribe-banner-image::before {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		repeating-linear-gradient(60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 28px),
		repeating-linear-gradient(-60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 28px);
	opacity: 0.5;
}
.tribe-banner-image::after {
	content: '⬡';
	position: absolute;
	right: -20px;
	bottom: -60px;
	font-size: 14rem;
	line-height: 1;
	color: rgba(0,180,255,0.10);
	filter: drop-shadow(0 0 16px rgba(0,180,255,0.20));
	user-select: none;
}
.banner-gradient-fade {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, transparent 0%, transparent 55%, rgba(5,8,18,0.85) 100%);
	pointer-events: none;
}

.tribe-identity-card {
	position: relative;
	margin: -76px 24px 0;
	background: linear-gradient(160deg, rgba(10,18,44,0.96) 0%, rgba(4,8,20,0.99) 100%);
	backdrop-filter: blur(16px);
	-webkit-backdrop-filter: blur(16px);
	clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
	padding: 24px 30px;
	display: grid;
	grid-template-columns: auto 1fr auto;
	gap: 24px;
	align-items: flex-start;
	z-index: 2;
	filter: drop-shadow(0 0 1px rgba(0,180,255,0.30)) drop-shadow(0 18px 50px rgba(0,0,0,0.60));
}
.tribe-identity-card::before {
	content: '';
	position: absolute;
	left: 0; top: 16px; bottom: 0;
	width: 2px;
	background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
	box-shadow: 0 0 8px var(--tek-blue-glow);
}

.tribe-sigil {
	width: 108px;
	height: 124px;
	position: relative;
	margin-top: -16px;
	flex-shrink: 0;
}
.tribe-sigil svg { width: 100%; height: 100%; filter: drop-shadow(0 0 14px rgba(0,180,255,0.50)); }

.tribe-info { flex: 1; min-width: 0; }
.tribe-name {
	font-family: var(--tek-display);
	font-size: clamp(1.7rem, 5vw, 2.4rem);
	font-weight: 900;
	letter-spacing: 0.10em;
	line-height: 1;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 60%, rgba(0,180,255,0.5) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 12px rgba(0,180,255,0.35));
	text-transform: uppercase;
	margin-bottom: 8px;
}
.tribe-motto {
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 1rem;
	color: #94a3b8;
	line-height: 1.45;
	padding-left: 10px;
	border-left: 1px solid rgba(0,180,255,0.20);
	margin-bottom: 12px;
	max-width: 540px;
}
.tribe-meta {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 9px;
	font-family: var(--tek-mono);
	font-size: 0.7rem;
	letter-spacing: 0.10em;
	color: var(--tek-text-dim);
}
.tribe-meta .members { color: var(--tek-blue); font-weight: 700; }
.tribe-meta .server  { color: var(--tek-amber); font-weight: 600; }
.tribe-meta .sep     { color: var(--tek-text-faint); }
.tribe-meta .founded { color: var(--tek-text-dim); }

.tribe-actions {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
	align-items: flex-end;
}
.btn {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	font-family: inherit;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	padding: 8px 14px;
	border: none;
	cursor: pointer;
	clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
	transition: filter 0.18s, transform 0.18s;
	white-space: nowrap;
}
.btn-primary {
	background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
	color: #001a2e;
	filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
}
.btn-primary:hover { filter: drop-shadow(0 0 14px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.btn-ghost {
	background: rgba(0,180,255,0.06);
	color: #7dd3fc;
	border: 1px solid rgba(0,180,255,0.20);
}
.btn-ghost:hover { background: rgba(0,180,255,0.14); border-color: rgba(0,180,255,0.45); }

/* ═════════════════════════════════════════════════════════════════════════
   PENDING ACTIONS PANEL (Alpha + Officers)
   ═════════════════════════════════════════════════════════════════════════ */
.pending-panel {
	position: relative;
	background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 14px 22px 12px 24px;
	margin-bottom: 36px;
	filter: drop-shadow(-3px 0 14px rgba(245,158,11,0.18));
}
.pending-panel::before {
	content: '';
	position: absolute;
	left: 0; top: 10px; bottom: 0;
	width: 2px;
	background: var(--tek-amber);
	box-shadow: 0 0 7px rgba(245,158,11,0.55);
}
.pending-header {
	display: flex;
	align-items: center;
	gap: 12px;
	padding-bottom: 10px;
	margin-bottom: 4px;
	border-bottom: 1px solid rgba(245,158,11,0.16);
}
.pending-header .pip {
	width: 8px; height: 8px;
	border-radius: 50%;
	background: var(--tek-amber);
	box-shadow: 0 0 8px rgba(245,158,11,0.7);
	animation: amber-pulse 1.8s ease-in-out infinite;
}
@keyframes amber-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.pending-header .title {
	font-family: var(--tek-mono);
	font-size: 0.74rem;
	letter-spacing: 0.20em;
	color: var(--tek-amber);
	font-weight: 700;
	text-transform: uppercase;
	display: flex;
	align-items: center;
}
.pending-header .count {
	font-weight: 800;
	font-size: 0.86rem;
	background: rgba(245,158,11,0.22);
	padding: 1px 8px;
	margin-right: 8px;
	clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.pending-header .visibility {
	margin-left: auto;
	font-family: var(--tek-mono);
	font-size: 0.56rem;
	letter-spacing: 0.20em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	text-align: right;
	line-height: 1.5;
}
.pending-header .visibility .perm { color: rgba(245,158,11,0.7); font-weight: 700; }
.pending-header .visibility .restricted-note {
	display: block;
	font-size: 0.52rem;
	color: var(--tek-text-faint);
	opacity: 0.75;
}
.pending-header .visibility .restricted-note .lock-glyph { color: var(--tek-amber); margin-right: 3px; }

.pending-list { display: flex; flex-direction: column; }
.pending-item {
	display: grid;
	grid-template-columns: 28px 1fr auto auto;
	gap: 14px;
	align-items: center;
	padding: 11px 0;
	border-bottom: 1px solid rgba(255,255,255,0.04);
}
.pending-item:last-child { border-bottom: none; }

.pending-icon-wrap {
	width: 28px; height: 28px;
	display: flex; align-items: center; justify-content: center;
	background: rgba(245,158,11,0.10);
	border: 1px solid rgba(245,158,11,0.30);
	color: var(--tek-amber);
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
	flex-shrink: 0;
}
.pending-icon-wrap.boss     { background: rgba(239,68,68,0.10);  border-color: rgba(239,68,68,0.30);  color: #fca5a5; }
.pending-icon-wrap.trade    { background: rgba(0,180,255,0.10);  border-color: rgba(0,180,255,0.30);  color: var(--tek-blue); }
.pending-icon-wrap.alliance { background: rgba(16,185,129,0.10); border-color: rgba(16,185,129,0.30); color: #86efac; }

.pending-info {
	font-family: var(--tek-mono);
	font-size: 0.78rem;
	color: var(--tek-text);
	letter-spacing: 0.02em;
	min-width: 0;
	line-height: 1.4;
}
.pending-info .label  { font-weight: 700; color: var(--tek-text); margin-right: 8px; }
.pending-info .meta   { color: var(--tek-text-dim); }
.pending-info .who    { color: #fcd34d; font-weight: 600; }
.pending-info .target { color: #c4b5fd; font-weight: 600; }

.pending-timer {
	font-family: var(--tek-display);
	font-size: 0.92rem;
	font-weight: 800;
	color: var(--tek-amber);
	text-shadow: 0 0 8px rgba(245,158,11,0.50);
	letter-spacing: 0.06em;
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	min-width: 96px;
	text-align: right;
}
.pending-timer.urgent {
	color: var(--tek-red);
	text-shadow: 0 0 10px rgba(239,68,68,0.65);
	animation: amber-pulse 1.4s ease-in-out infinite;
}
.pending-timer-empty { min-width: 96px; }

.pending-btn {
	background: rgba(245,158,11,0.18);
	border: 1px solid rgba(245,158,11,0.42);
	color: #fcd34d;
	font-family: inherit;
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	padding: 7px 14px;
	cursor: pointer;
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
	transition: all 0.18s;
	white-space: nowrap;
}
.pending-btn:hover {
	background: rgba(245,158,11,0.32);
	filter: drop-shadow(0 0 8px rgba(245,158,11,0.45));
}
.pending-btn.boss     { background: rgba(239,68,68,0.18);  border-color: rgba(239,68,68,0.42);  color: #fca5a5; }
.pending-btn.boss:hover     { background: rgba(239,68,68,0.30); filter: drop-shadow(0 0 8px rgba(239,68,68,0.50)); }
.pending-btn.trade    { background: rgba(0,180,255,0.18);  border-color: rgba(0,180,255,0.42);  color: #7dd3fc; }
.pending-btn.trade:hover    { background: rgba(0,180,255,0.30); filter: drop-shadow(0 0 8px var(--tek-blue-glow)); }
.pending-btn.alliance { background: rgba(16,185,129,0.18); border-color: rgba(16,185,129,0.42); color: #86efac; }
.pending-btn.alliance:hover { background: rgba(16,185,129,0.30); filter: drop-shadow(0 0 8px rgba(16,185,129,0.50)); }
.pending-btn .lock-icon {
	width: 11px; height: 11px;
	margin-right: 5px;
	color: currentColor;
	opacity: 0.85;
	vertical-align: middle;
	margin-top: -1px;
}

/* ═════════════════════════════════════════════════════════════════════════
   SECTION SCAFFOLD
   ═════════════════════════════════════════════════════════════════════════ */
.section { margin-bottom: 48px; }
.section-header {
	display: flex;
	align-items: center;
	gap: 14px;
	margin: 0 0 22px;
	font-family: var(--tek-mono);
	font-size: 0.7rem;
	font-weight: 700;
	letter-spacing: 0.22em;
	text-transform: uppercase;
	color: var(--tek-text-dim);
}
.section-header .pip {
	width: 7px; height: 7px;
	border-radius: 50%;
	background: var(--tek-blue);
	box-shadow: 0 0 8px var(--tek-blue-glow);
}
.section-header .rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(0,180,255,0.18), transparent); }
.section-header .action {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	font-weight: 600;
	letter-spacing: 0.16em;
	color: var(--tek-text-faint);
	text-decoration: none;
	cursor: pointer;
	background: none;
	border: none;
	text-transform: uppercase;
	transition: color 0.18s;
}
.section-header .action:hover { color: var(--tek-blue); }
.section-header .action .arrow { color: var(--tek-blue); margin-left: 4px; }
.section-header .count {
	color: var(--tek-blue);
	font-weight: 700;
	text-shadow: 0 0 6px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   MEMBER ROSTER
   ═════════════════════════════════════════════════════════════════════════ */
.member-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 14px;
}
@media (max-width: 980px) { .member-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) { .member-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .member-grid { grid-template-columns: 1fr; } }

.member-card {
	--rank-rgb: 100,116,139;
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	backdrop-filter: blur(12px);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 16px;
	cursor: pointer;
	transition: transform 0.22s ease, filter 0.25s ease;
	filter: drop-shadow(0 0 1px rgba(var(--rank-rgb), 0.30)) drop-shadow(0 8px 22px rgba(0,0,0,0.42));
}
.member-card:hover {
	transform: translateY(-2px);
	filter: drop-shadow(0 0 2px rgba(var(--rank-rgb), 0.75)) drop-shadow(0 12px 30px rgba(0,0,0,0.55));
}
.member-card::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: rgb(var(--rank-rgb));
	box-shadow: 0 0 6px rgba(var(--rank-rgb), 0.7);
}
.member-card.alpha    { --rank-rgb: 255,215,0;   }
.member-card.officer  { --rank-rgb: 0,180,255;   }
.member-card.survivor { --rank-rgb: 167,139,250; }

.member-top {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 12px;
}
.rank-chip {
	font-family: var(--tek-mono);
	font-size: 0.56rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: rgb(var(--rank-rgb));
	background: rgba(var(--rank-rgb), 0.10);
	border: 1px solid rgba(var(--rank-rgb), 0.30);
	padding: 3px 8px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	text-shadow: 0 0 5px rgba(var(--rank-rgb), 0.4);
}
.member-menu-btn {
	background: transparent;
	border: 1px solid rgba(255,255,255,0.05);
	color: var(--tek-text-faint);
	width: 22px; height: 22px;
	display: flex; align-items: center; justify-content: center;
	cursor: pointer;
	clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
	opacity: 0;
	transition: all 0.18s;
}
.member-card:hover .member-menu-btn { opacity: 1; }
.member-menu-btn:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.30); }

.member-avatar {
	width: 64px;
	height: 72px;
	margin: 0 auto 10px;
	position: relative;
}
.member-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 8px rgba(0,180,255,0.35)); }
.member-avatar .pip {
	position: absolute;
	bottom: 2px; right: 2px;
	width: 12px; height: 12px;
	border-radius: 50%;
	background: var(--tek-green);
	border: 2px solid #050812;
	box-shadow: 0 0 5px rgba(16,185,129,0.6);
}
.member-avatar .pip.offline {
	background: var(--tek-text-faint);
	box-shadow: none;
}

.member-callsign {
	font-family: var(--tek-display);
	font-size: 0.96rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-align: center;
	color: var(--tek-text);
	text-transform: uppercase;
	line-height: 1;
	margin-bottom: 5px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.member-status {
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	letter-spacing: 0.14em;
	color: var(--tek-text-faint);
	text-align: center;
	text-transform: uppercase;
	margin-bottom: 12px;
}
.member-status.online { color: var(--tek-green); }

.member-pinned {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	font-style: italic;
	text-align: center;
	margin-bottom: 12px;
	line-height: 1.3;
	padding: 6px 8px;
	background: rgba(0,0,0,0.20);
	border: 1px solid rgba(255,255,255,0.03);
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.member-pinned .species { color: var(--tek-text); font-style: normal; font-weight: 600; }

.member-stats {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 6px;
	padding-top: 12px;
	border-top: 1px solid rgba(255,255,255,0.05);
}
.member-stat {
	text-align: center;
	font-family: var(--tek-mono);
	line-height: 1.1;
}
.member-stat-val {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	color: var(--tek-blue);
	text-shadow: 0 0 6px var(--tek-blue-glow);
}
.member-stat-lbl {
	font-size: 0.52rem;
	letter-spacing: 0.16em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	margin-top: 2px;
}

.member-actions {
	position: absolute;
	inset: auto 8px 8px 8px;
	display: flex;
	gap: 4px;
	justify-content: center;
	opacity: 0;
	transform: translateY(8px);
	transition: all 0.22s;
	pointer-events: none;
}
.member-card:hover .member-actions { opacity: 1; transform: translateY(0); pointer-events: auto; }
.member-action {
	flex: 1;
	background: rgba(4,8,20,0.92);
	border: 1px solid rgba(0,180,255,0.30);
	color: var(--tek-blue);
	font-family: var(--tek-mono);
	font-size: 0.55rem;
	font-weight: 700;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	padding: 5px 4px;
	cursor: pointer;
	clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
	transition: all 0.18s;
}
.member-action:hover { background: rgba(0,180,255,0.18); filter: drop-shadow(0 0 6px var(--tek-blue-glow)); }
.member-action.kick { color: #fca5a5; border-color: rgba(239,68,68,0.30); }
.member-action.kick:hover { background: rgba(239,68,68,0.15); }

.member-invite {
	background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
	border: 1.5px dashed rgba(0,180,255,0.30);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 24px 16px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	transition: all 0.2s;
	min-height: 100%;
}
.member-invite:hover {
	background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(4,8,20,0.55) 100%);
	border-color: rgba(0,180,255,0.60);
}
.member-invite-glyph {
	font-family: var(--tek-display);
	font-size: 2.4rem;
	color: var(--tek-blue);
	filter: drop-shadow(0 0 10px var(--tek-blue-glow));
	line-height: 1;
}
.member-invite-label {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	text-align: center;
}
.member-invite:hover .member-invite-label { color: var(--tek-blue); }

/* ═════════════════════════════════════════════════════════════════════════
   TRIBE VAULT preview (3 trophy specimens)
   ═════════════════════════════════════════════════════════════════════════ */
.vault-row {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 14px;
}
@media (max-width: 860px) { .vault-row { grid-template-columns: 1fr; } }

.trophy-card {
	--cat-rgb: 239,68,68;
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	backdrop-filter: blur(12px);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 14px 18px;
	cursor: pointer;
	transition: transform 0.22s ease, filter 0.25s ease;
	filter: drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.30)) drop-shadow(0 8px 22px rgba(0,0,0,0.40));
}
.trophy-card:hover {
	transform: translateY(-2px);
	filter: drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.70)) drop-shadow(0 12px 30px rgba(0,0,0,0.55));
}
.trophy-card::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: rgb(var(--cat-rgb));
	box-shadow: 0 0 6px rgba(var(--cat-rgb), 0.7);
}
.trophy-card.combat   { --cat-rgb: 239,68,68;  }
.trophy-card.flyer    { --cat-rgb: 6,182,212;  }
.trophy-card.mount    { --cat-rgb: 249,115,22; }

.trophy-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 8px;
}
.trophy-owner {
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	letter-spacing: 0.16em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
}
.trophy-owner .name { color: rgb(var(--cat-rgb)); font-weight: 700; }
.trophy-tier {
	font-family: var(--tek-mono);
	font-size: 0.58rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	color: rgb(var(--cat-rgb));
	text-transform: uppercase;
}
.trophy-species {
	font-family: var(--tek-display);
	font-size: 1.15rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.4) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
	text-transform: uppercase;
	line-height: 1;
	margin-bottom: 3px;
}
.trophy-nick {
	font-family: var(--tek-mono);
	font-size: 0.7rem;
	color: var(--tek-text-dim);
	font-style: italic;
	margin-bottom: 12px;
}
.trophy-bottom {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	padding-top: 10px;
	border-top: 1px solid rgba(255,255,255,0.05);
}
.trophy-lvl {
	font-family: var(--tek-display);
	font-size: 1.6rem;
	font-weight: 900;
	line-height: 1;
	background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 6px rgba(0,180,255,0.30));
}
.trophy-muts {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	font-weight: 700;
	color: var(--tek-blue);
	text-shadow: 0 0 4px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTIVITY FEED — Discord-channel feel
   ═════════════════════════════════════════════════════════════════════════ */
.feed {
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 6px 0;
}
.feed-row {
	display: grid;
	grid-template-columns: 32px 1fr auto;
	gap: 12px;
	align-items: center;
	padding: 12px 22px;
	border-bottom: 1px solid rgba(255,255,255,0.04);
	transition: background 0.2s;
}
.feed-row:last-child { border-bottom: none; }
.feed-row:hover { background: rgba(0,180,255,0.03); }
.feed-dot {
	width: 8px; height: 8px;
	border-radius: 50%;
	margin: 0 auto;
	background: var(--tek-blue);
	box-shadow: 0 0 6px var(--tek-blue-glow);
}
.feed-dot.gold    { background: #ffd700; box-shadow: 0 0 6px rgba(255,215,0,0.7); }
.feed-dot.diamond { background: #00b4ff; box-shadow: 0 0 7px var(--tek-blue-glow); }
.feed-dot.tribe   { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.7); }
.feed-dot.species { background: #c084fc; box-shadow: 0 0 6px rgba(192,132,252,0.7); }
.feed-dot.boss    { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.7); }
.feed-dot.alliance{ background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.7); }
.feed-text {
	font-size: 0.88rem;
	color: var(--tek-text);
	line-height: 1.45;
}
.feed-text strong { color: var(--tek-blue); font-weight: 700; }
.feed-text .who   { color: #fcd34d; font-weight: 600; }
.feed-text .what  { color: #c4b5fd; font-weight: 600; }
.feed-time {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.14em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	white-space: nowrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   DIPLOMACY SECTION
   ═════════════════════════════════════════════════════════════════════════ */
.diplomacy-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}
@media (max-width: 720px) { .diplomacy-grid { grid-template-columns: 1fr; } }

.diplo-card {
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 18px 22px 18px 24px;
}
.diplo-card::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: var(--tek-blue);
	box-shadow: 0 0 6px var(--tek-blue-glow);
}
.diplo-card.allies::before  { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
.diplo-card.enemies::before { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.6); }
.diplo-card.recruitment::before { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.6); }

.diplo-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	font-weight: 700;
	letter-spacing: 0.20em;
	text-transform: uppercase;
}
.diplo-header.allies      { color: #86efac; }
.diplo-header.enemies     { color: #fca5a5; }
.diplo-header.recruitment { color: #fcd34d; }
.diplo-header.warroom     { color: #7dd3fc; }
.diplo-count {
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	color: var(--tek-text-faint);
}

.diplo-tribes {
	display: flex;
	flex-wrap: wrap;
	gap: 7px;
}
.diplo-tribe-chip {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	background: rgba(0,0,0,0.30);
	border: 1px solid rgba(255,255,255,0.06);
	padding: 6px 10px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	cursor: pointer;
	transition: all 0.18s;
}
.diplo-tribe-chip:hover {
	background: rgba(0,180,255,0.06);
	border-color: rgba(0,180,255,0.30);
}
.diplo-tribe-chip .sigil {
	width: 16px; height: 16px;
	color: var(--tek-blue);
	filter: drop-shadow(0 0 3px var(--tek-blue-glow));
}
.diplo-tribe-chip.enemy .sigil { color: #fca5a5; filter: drop-shadow(0 0 3px rgba(239,68,68,0.5)); }
.diplo-tribe-chip .tribe-name {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	font-weight: 500;
	color: var(--tek-text-dim);
}

.recruitment-status {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 8px;
}
.status-pip {
	width: 8px; height: 8px;
	border-radius: 50%;
	background: var(--tek-green);
	box-shadow: 0 0 6px rgba(16,185,129,0.7);
	animation: amber-pulse 2s ease-in-out infinite;
}
.status-text {
	font-family: var(--tek-display);
	font-size: 0.88rem;
	font-weight: 800;
	letter-spacing: 0.16em;
	color: var(--tek-green);
	text-transform: uppercase;
}
.recruitment-detail {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	color: var(--tek-text-dim);
	line-height: 1.5;
}
.recruitment-detail .label { color: var(--tek-text-faint); letter-spacing: 0.14em; text-transform: uppercase; font-size: 0.58rem; }

.warroom-info {
	font-family: var(--tek-mono);
	font-size: 0.78rem;
	line-height: 1.5;
	color: var(--tek-text);
}
.warroom-boss {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	color: var(--tek-red);
	text-transform: uppercase;
	text-shadow: 0 0 8px rgba(239,68,68,0.40);
	margin-bottom: 4px;
}
.warroom-date {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	color: #fcd34d;
	letter-spacing: 0.10em;
	margin-bottom: 8px;
}
.warroom-detail {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	letter-spacing: 0.06em;
}

@media (max-width: 720px) {
	.tribe-identity-card { grid-template-columns: 1fr; gap: 16px; padding: 18px 22px; text-align: center; }
	.tribe-sigil { width: 88px; height: 100px; margin: -16px auto 0; }
	.tribe-actions { flex-direction: row; align-self: stretch; justify-content: center; }
	.tribe-motto { padding-left: 0; border-left: none; max-width: none; }
	.stage { padding: 60px 14px 80px; }
}

/* Toggle row (edit modal) */
.toggle-row { display: flex; align-items: center; gap: 8px; font-family: var(--tek-mono); font-size: 0.82rem; color: var(--tek-text-dim); cursor: pointer; }
.toggle-row input { accent-color: var(--tek-blue); }

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
