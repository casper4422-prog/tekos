<script lang="ts">
	import { Sword, Users, LogIn, Send, X, Dna, ScrollText, UserPlus } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Boss    = { id:string; name:string; map:string; difficulties:string[]; description:string; tribute?:string };
	type Session = Record<string,unknown>;
	type ChatMsg = { id:number; content:string; createdAt:string; user:{ nickname:string|null; email:string } };

	// Full ASA boss list
	const BOSSES: Boss[] = [
		{ id:'broodmother',       name:'Broodmother Lysrix',         map:'The Island',      difficulties:['gamma','beta','alpha'], description:'Summons Araneo swarms. Megatherium is META here — gets a massive damage buff vs insects.', tribute:'Sarcosuchus Skin, Sauropod Vertebra, Argentavis Talon, Megalodon Fin, Thylacoleo Hook-Claw' },
		{ id:'megapithecus',      name:'Megapithecus',               map:'The Island',      difficulties:['gamma','beta','alpha'], description:'Hurls boulders with AoE damage. Spread your dinos to avoid rock wipes.', tribute:'Argentavis Talon, Megalodon Fin, Sauropod Vertebra, Tyrannosaurus Arm, Woolly Rhino Horn' },
		{ id:'dragon',            name:'Dragon',                     map:'The Island',      difficulties:['gamma','beta','alpha'], description:'Immune to fire. Therizinosaur is META — fire resistant and high damage.', tribute:'Argentavis Talon, Sarcosuchus Skin, Megalania Toxin, Titanoboa Venom' },
		{ id:'overseer',          name:'Overseer',                   map:'The Island',      difficulties:['gamma','beta','alpha'], description:'Final Island boss. AI that shifts between Broodmother, Megapithecus, and Dragon drone forms.', tribute:'Defeat all three Island guardians, then traverse the Tek Cave' },
		{ id:'manticore',         name:'Manticore',                  map:'Scorched Earth',  difficulties:['gamma','beta','alpha'], description:'Flying phase is immune. Alternates with a landing phase — burst damage during landings.', tribute:'Argentavis Talon, Sauropod Vertebra, Tusoteuthis Tentacle, Deathworm Horn' },
		{ id:'rockwell',          name:'Rockwell',                   map:'Aberration',      difficulties:['gamma','beta','alpha'], description:'No flyers allowed. Target the glowing Element tentacle nodes. Reaper Kings excel here.', tribute:'Karkinos Claw, Basilisk Scale, Reaper Queen Pheromone Gland, Nameless Venom' },
		{ id:'forest_titan',      name:'Forest Titan',               map:'Extinction',      difficulties:['gamma'],               description:'Open-world titan. Cannot be killed — must be tamed by destroying corruption nodes.', tribute:'No tribute — locate in the field' },
		{ id:'ice_titan',         name:'Ice Titan',                  map:'Extinction',      difficulties:['gamma'],               description:'Found in the snow biome. Strike weak points on its back during stagger windows.', tribute:'No tribute — locate in the field' },
		{ id:'desert_titan',      name:'Desert Titan',               map:'Extinction',      difficulties:['gamma'],               description:'Flying titan raining lightning. Can be tamed as a massive flying platform.', tribute:'No tribute — locate in the field' },
		{ id:'king_titan',        name:'King Titan',                 map:'Extinction',      difficulties:['gamma','beta','alpha'], description:'Alpha requires all three field Titans tamed first. Target corruption nodes on its body.', tribute:'Corrupt Heart — obtained by defeating/taming the three field Titans' },
		{ id:'center_broodmother',name:'Broodmother Lysrix',         map:'The Center',      difficulties:['gamma','beta','alpha'], description:'Same as Island variant. Megatherium is still META.', tribute:'Same as Island Broodmother' },
		{ id:'center_megapithecus',name:'Megapithecus',              map:'The Center',      difficulties:['gamma','beta','alpha'], description:'Same as Island variant.', tribute:'Same as Island Megapithecus' },
		{ id:'center_dragon',     name:'Dragon',                     map:'The Center',      difficulties:['gamma','beta','alpha'], description:'Same fire-immune mechanics as Island variant.', tribute:'Same as Island Dragon' },
		{ id:'ragnarok_boss',     name:'Dragon & Manticore',         map:'Ragnarok',        difficulties:['gamma','beta','alpha'], description:'Combined encounter — both bosses fight simultaneously. Split your tribe between two threat types.', tribute:'Argentavis Talon, Sauropod Vertebra, Wyvern Milk, Deathworm Horn' },
		{ id:'val_broodmother',   name:'Broodmother Lysrix',         map:'Valguero',        difficulties:['gamma','beta','alpha'], description:'Valguero variant via underground zones. Identical mechanics.', tribute:'Same as Island Broodmother' },
		{ id:'val_megapithecus',  name:'Megapithecus',               map:'Valguero',        difficulties:['gamma','beta','alpha'], description:'Valguero variant. Identical mechanics.', tribute:'Same as Island Megapithecus' },
		{ id:'val_dragon',        name:'Dragon',                     map:'Valguero',        difficulties:['gamma','beta','alpha'], description:'Valguero variant. Identical fire mechanics.', tribute:'Same as Island Dragon' },
		{ id:'moeder',            name:'Moeder, Master of the Ocean',map:'Genesis: Part 1', difficulties:['gamma','beta','alpha'], description:'Fought underwater. Spawns Electrophorus to drain oxygen. Keep your oxygen stat high.', tribute:'Complete HLN-A Ocean biome missions' },
		{ id:'master_controller', name:'Corrupted Master Controller',map:'Genesis: Part 1', difficulties:['gamma','beta','alpha'], description:'Multi-phase AI boss. Final encounter of Genesis Part 1.', tribute:'Complete all HLN-A mission biome sets' },
		{ id:'rockwell_prime',    name:'Rockwell Prime',             map:'Genesis: Part 2', difficulties:['gamma','beta','alpha'], description:'Rockwell merged with the Genesis Ship. Multi-phase interior fight.', tribute:'Complete Rockwell Prime mission set' },
		{ id:'hydraskos',         name:'Hydraskos the Unbroken',     map:'Astraeos',        difficulties:['gamma','beta','alpha'], description:'Multi-headed Hydra. Each head targets independently — coordinate target priority.', tribute:'Astraeos tribute altar' },
		{ id:'natrix',            name:'Natrix the Gorgon',          map:'Astraeos',        difficulties:['gamma','beta','alpha'], description:'Petrification mechanics — looking at it directly can freeze survivors mid-fight.', tribute:'Astraeos tribute altar' },
		{ id:'thodes',            name:'Thodes the Cyclops',         map:'Astraeos',        difficulties:['gamma','beta','alpha'], description:'Strike the eye during vulnerability windows. The eye is both weapon and weak point.', tribute:'Astraeos tribute altar' },
		{ id:'thanatos',          name:'Thanatos the Destroyer',     map:'Astraeos',        difficulties:['gamma','beta','alpha'], description:'Pinnacle Astraeos boss. Requires defeating all three guardians first.', tribute:'Defeat Hydraskos, Natrix, and Thodes first' },
		{ id:'pulmonoscorpius_monarch',name:'Pulmonoscorpius Monarch',map:'Astraeos',       difficulties:['gamma'],               description:'Scorpion miniboss found in Astraeos cave systems. A stepping-stone before major bosses.', tribute:'No tribute — found in caves' },
		{ id:'lost_king',         name:'Lost King',                  map:'Lost Colony',     difficulties:['gamma','beta','alpha'], description:'Rides a Gigadesmodus. Multi-phase dungeon inside the Red Palace. Thrall waves between phases.', tribute:'Altar outside the Red Palace dungeon entrance' },
		{ id:'lost_queen',        name:'Lost Queen',                 map:'Lost Colony',     difficulties:['gamma','beta','alpha'], description:'Must break her healing beam or she regenerates to full. Assign dedicated beam-breakers.', tribute:'Automatically triggered after defeating the Lost King' },
		{ id:'svartalfheim_dinopithecus',name:'Dinopithecus King',   map:'Svartalfheim · Mod', difficulties:['alpha'],           description:'Custom boss of Nekatus\'s Svartalfheim mod. No-fly, no-Tek-armour ruleset.', tribute:'Svartalfheim tribute — check mod documentation' },
	];

	const sessions = data.sessions as Session[];
	const records  = data.records as Record<string,unknown>[];

	let mapFilter  = $state('all');
	let joinCode   = $state('');
	let detailBoss = $state<Boss|null>(null);
	let difficulty = $state('alpha');

	// Active war room (inline, no navigation)
	let activeSession   = $state<Record<string,unknown>|null>(null);
	let sessionLoading  = $state(false);
	let activeTab       = $state<'chat'|'roster'|'tips'|'members'>('chat');
	let messages        = $state<ChatMsg[]>([]);
	let sessionCreatures = $state<Record<string,unknown>[]>([]);
	let sessionMembers  = $state<Record<string,unknown>[]>([]);
	let draft           = $state('');
	let addOpen         = $state(false);
	let logOpen         = $state(false);
	let logOutcome      = $state<'success'|'failed'>('success');
	let logNotes        = $state('');
	let inviteOpen      = $state(false);
	let friends         = $state<Record<string,unknown>[]>([]);
	let pollTimer: ReturnType<typeof setInterval>;
	let bottom: HTMLDivElement;

	onDestroy(() => clearInterval(pollTimer));

	const MAPS = ['all', ...new Set(BOSSES.map(b => b.map))];
	function getFiltered() { return mapFilter === 'all' ? BOSSES : BOSSES.filter(b => b.map === mapFilter); }
	function grouped() {
		const r: Record<string, Boss[]> = {};
		for (const b of getFiltered()) (r[b.map] = r[b.map] ?? []).push(b);
		return Object.entries(r);
	}

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.email ?? 'Unknown') as string; }

	async function loadSession(id: number) {
		sessionLoading = true;
		const res = await fetch(`/api/arena/sessions/${id}`);
		if (res.ok) {
			const s = await res.json();
			activeSession = s;
			messages = (s.chats ?? []) as ChatMsg[];
			sessionCreatures = (s.creatures ?? []) as Record<string,unknown>[];
			sessionMembers = (s.members ?? []) as Record<string,unknown>[];
		}
		sessionLoading = false;
		startPolling(id);
	}

	function startPolling(id: number) {
		clearInterval(pollTimer);
		pollTimer = setInterval(async () => {
			if (activeTab !== 'chat') return;
			const res = await fetch(`/api/arena/sessions/${id}/chat`);
			if (res.ok) {
				const fresh = await res.json() as ChatMsg[];
				if (fresh.length > messages.length) { messages = fresh; setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50); }
			}
		}, 8000);
	}

	async function createAndEnter() {
		if (!detailBoss) return;
		const res = await fetch('/api/arena/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossId:detailBoss.id, bossName:detailBoss.name, difficulty }) });
		if (res.ok) { const s = await res.json(); detailBoss = null; await loadSession(s.id); }
	}

	async function joinByCode() {
		if (!joinCode.trim()) return;
		const res = await fetch('/api/arena/sessions/join', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ joinCode:joinCode.toUpperCase() }) });
		if (res.ok) { const s = await res.json(); await loadSession(s.sessionId); }
		else alert('Session not found.');
	}

	async function sendMsg() {
		if (!draft.trim() || !activeSession) return;
		const res = await fetch(`/api/arena/sessions/${activeSession.id}/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ content:draft.trim(), messageType:'text' }) });
		if (res.ok) {
			const msg = await res.json();
			messages = [...messages, { ...msg, user:{ nickname:null, email:'You' } }];
			draft = '';
			setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50);
		}
	}

	async function addCreature(c: Record<string,unknown>) {
		if (!activeSession) return;
		const res = await fetch(`/api/arena/sessions/${activeSession.id}/creatures/${c.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ creatureId:c.id, creatureData:c }) });
		if (res.ok) { sessionCreatures = [...sessionCreatures, { ...await res.json(), user:{ nickname:null, email:'You' } }]; addOpen=false; }
	}

	async function removeCreature(cid: number) {
		if (!activeSession) return;
		await fetch(`/api/arena/sessions/${activeSession.id}/creatures/${cid}`, { method:'DELETE' });
		sessionCreatures = sessionCreatures.filter(c => (c.id as number) !== cid);
	}

	async function closeRoom() {
		if (!activeSession || !confirm('Close this war room?')) return;
		await fetch(`/api/arena/sessions/${activeSession.id}/close`, { method:'PUT' });
		activeSession = { ...activeSession, status:'closed' };
		clearInterval(pollTimer);
	}

	async function logFight() {
		if (!activeSession) return;
		await fetch('/api/boss-records', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossName:String(activeSession.bossName), difficulty:String(activeSession.difficulty), outcome:logOutcome, notes:logNotes||null, creaturesUsed:sessionCreatures.map(c => c.creatureData ?? c) }) });
		logOpen = false; alert('Fight recorded!');
	}

	async function loadFriendsAndInvite() {
		const res = await fetch('/api/friends?status=accepted');
		if (res.ok) friends = await res.json();
		inviteOpen = true;
	}

	async function inviteFriend(friendId: number) {
		if (!activeSession) return;
		await fetch(`/api/arena/sessions/${activeSession.id}/invite`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ friendUserId:friendId }) });
		alert('Invite sent!');
	}

	const myCreatures = data.myCreatures as Record<string,unknown>[];

	const TIPS: Record<string, { creatures:string[]; consumables:string[]; tips:string[]; avoid:string[] }> = {
		default: { creatures:['Rex','Yutyrannus (courage buff)','Daeodon (passive healing)'], consumables:['Focal Chili','Lazarus Chowder','Battle Tartare'], tips:['Yutyrannus gives +25% courage buff','Daeodon auto-heals on passive','Saddle armor matters more than level','Quality over quantity'], avoid:['Flyers (arenas are closed)','Low saddle armor','Too many creatures'] },
		broodmother: { creatures:['Megatherium (BEST — gets insect kill buff)','Rex','Yutyrannus','Daeodon'], consumables:['Bug Repellant (reduces Araneo aggro)','Focal Chili','Medical Brew'], tips:['Megatherium gets massive damage buff from Araneo kills','Kill swarms fast to reset buff cooldown','Stay grouped — Daeodon heals through venom DoT'], avoid:['No saddles (venom DoT is brutal)','Spreading out','Ignoring Araneo swarms'] },
		dragon: { creatures:['Therizinosaur (fire immune — META)','Allosaurus'], consumables:['Battle Tartare','Medical Brew'], tips:['Dragon is IMMUNE to fire — Therizino takes reduced fire damage','Focus Dragon — wyverns are a distraction','Keep moving, fire breath is a sweep'], avoid:['Rex (takes full fire damage)','Standing still'] },
		rockwell: { creatures:['Ravager (no flyers in Aberration)','Rock Drake','Reaper King'], consumables:['Hazard Suit charge','Nameless Venom','Lesser Antidote'], tips:['No flyers — use Ravagers or Drakes','Target glowing Element tentacle nodes','Dodge Element spikes (one-shot)'], avoid:['Flyers','Standing in element surge zones','Ignoring tentacle nodes'] },
		lost_queen: { creatures:['Your best DPS from Lost King fight'], consumables:['Medical Brew','Battle Tartare'], tips:['Break her healing beam or she regens to 100%','Assign 2-3 people to beam duty only','Two phases — second is more aggressive'], avoid:['Letting the beam complete'] },
	};

	function getTips() {
		if (!activeSession) return TIPS.default;
		const id = String(activeSession.bossId ?? '');
		return TIPS[id] ?? TIPS.default;
	}

	function ago(dt: string) { const d = new Date(dt); return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
</script>

<div class="tek-stage ov-page">

	{#if !activeSession}
		<!-- ── Boss browser ──────────────────────────────────────────────── -->
		<PageHeader
			title="Overseer"
			crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Overseer' }]}
			sub={`${BOSSES.length} bosses · ${MAPS.length - 1} maps · the wild remembers each one`}
			subMono={true}
		/>

		<!-- Join + map filter -->
		<div class="ov-top-row">
			<div style="display:flex; gap:8px; align-items:center;">
				<input class="tek-input-v2" style="max-width:160px; text-transform:uppercase; letter-spacing:0.10em;" placeholder="Join Code" bind:value={joinCode} maxlength={6} onkeydown={(e) => e.key==='Enter' && joinByCode()} />
				<button class="tek-btn-v2" onclick={joinByCode}><LogIn size={13} strokeWidth={2.5} /> Join Room</button>
			</div>
			<div class="ov-map-filters">
				{#each MAPS as m}
					<button class="tek-chip" class:on={mapFilter === m} onclick={() => mapFilter = m}>
						{m === 'all' ? 'All Maps' : m}
					</button>
				{/each}
			</div>
		</div>

		<!-- Open sessions -->
		{#if sessions.length > 0}
			<div class="ov-section-title">Open War Rooms</div>
			<div class="ov-sessions">
				{#each sessions as s}
					{@const sd = s as Record<string,unknown>}
					<button class="cham-shell ov-session" onclick={() => loadSession(sd.id as number)} style="--cut:7px;width:100%;text-align:left;font-family:inherit;background:none;border:none;cursor:pointer">
						<div class="ov-session-inner">
							<div class="ov-session-info">
								<div class="ov-session-boss">{String(sd.bossName)}</div>
								<div class="ov-session-meta">{String(sd.difficulty).toUpperCase()} · Code: <strong>{String(sd.joinCode)}</strong> · {(sd.memberCount as number)} in room</div>
							</div>
							<span class="btn btn-primary btn-sm"><Users size={13} /> Join</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Boss grid by map -->
		{#each grouped() as [mapName, bosses]}
			<div class="ov-section-title">{mapName}</div>
			<div class="ov-boss-grid">
				{#each bosses as b}
					<button class="cham-shell ov-boss-card" onclick={() => { detailBoss = b; difficulty = 'alpha'; }} style="--cut:9px;background:none;border:none;cursor:pointer;width:100%;text-align:left;font-family:inherit">
						<div class="ov-boss-inner">
							<div class="ov-boss-name">{b.name}</div>
							<div class="ov-boss-diffs">
								{#each b.difficulties as d}<span class="ov-diff-chip {d}">{d.charAt(0).toUpperCase()}</span>{/each}
							</div>
							<div class="ov-boss-hint">Click for details</div>
						</div>
					</button>
				{/each}
			</div>
		{/each}

		<!-- Fight history -->
		{#if records.length > 0}
			<div class="ov-section-title" style="margin-top:28px">My Fight History</div>
			<div class="ov-records">
				{#each records as r}
					{@const rd = r as Record<string,unknown>}
					<div class="cham-shell ov-record" style="--cut:5px;--cat-rgb:{rd.outcome==='success'?'34,197,94':'239,68,68'}">
						<div class="ov-record-inner">
							<div class="ov-record-boss">{String(rd.bossName)}</div>
							<div class="ov-record-meta">{String(rd.difficulty??'').toUpperCase()}</div>
							<div class="ov-record-outcome" class:win={rd.outcome==='success'}>{rd.outcome==='success'?'Victory':'Defeat'}</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<!-- ── Active war room (inline) ──────────────────────────────────── -->
		{@const closed = activeSession.status === 'closed'}
		{@const isCreator = (activeSession.creatorUserId as number) === data.myId}

		<div class="ov-room-header">
			<div>
				<div class="ov-room-boss">{String(activeSession.bossName)}</div>
				<div class="ov-room-meta">
					{String(activeSession.difficulty).toUpperCase()} · Code: <strong style="font-family:monospace;color:#f1f5f9">{String(activeSession.joinCode)}</strong> · {sessionMembers.length} online
					{#if closed}<span class="war-closed-tag" style="margin-left:8px">CLOSED</span>{/if}
				</div>
			</div>
			<div style="display:flex;gap:8px;flex-wrap:wrap">
				<button class="btn btn-secondary btn-sm" onclick={loadFriendsAndInvite}><UserPlus size={13} /> Invite</button>
				<button class="btn btn-secondary btn-sm" onclick={() => { logOpen=true; logOutcome='success'; logNotes=''; }}><ScrollText size={13} /> Log Fight</button>
				{#if isCreator && !closed}<button class="btn btn-danger btn-sm" onclick={closeRoom}>Close Room</button>{/if}
				<button class="btn btn-ghost btn-sm" onclick={() => { clearInterval(pollTimer); activeSession=null; }}>← Back to Bosses</button>
			</div>
		</div>

		<div class="ov-room-layout">
			<!-- Left: chat -->
			<div class="ov-room-left">
				<div class="war-tabs">
					{#each [['chat','Chat'],['roster','Roster'],['members','Members'],['tips','Tips & Gear']] as [t,label]}
						<button class="war-tab" class:active={activeTab===t} onclick={() => activeTab = t as typeof activeTab}>{label}</button>
					{/each}
				</div>

				{#if activeTab === 'chat'}
					<div class="war-chat">
						{#if messages.length === 0}<div class="war-empty">No messages yet. Start the conversation.</div>{/if}
						{#each messages as m}
							<div class="war-msg">
								<span class="war-msg-author">{display(m.user as Record<string,unknown>)}</span>
								<span class="war-msg-time">{ago(m.createdAt)}</span>
								<div class="war-msg-text">{m.content}</div>
							</div>
						{/each}
						<div bind:this={bottom}></div>
					</div>
					{#if !closed}
						<div class="war-input-row">
							<input class="form-control" placeholder="Type a message..." bind:value={draft} onkeydown={(e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();} }} />
							<button class="btn btn-primary" onclick={sendMsg} disabled={!draft.trim()}><Send size={14}/></button>
						</div>
					{/if}

				{:else if activeTab === 'roster'}
					<div class="war-roster-header">
						<div class="war-section-title">Creature Roster ({sessionCreatures.length})</div>
						{#if !closed}<button class="btn btn-primary btn-sm" onclick={() => addOpen=true}><Dna size={13}/> Add</button>{/if}
					</div>
					{#if sessionCreatures.length === 0}<div class="war-empty">No specimens added yet.</div>{/if}
					<div class="war-roster-grid">
						{#each sessionCreatures as c}
							{@const cd = (c.creatureData ?? c) as Record<string,unknown>}
							{@const bs = (cd.baseStats as Record<string,number>)??{}}
							<div class="cham-shell war-creature" style="--cut:6px">
								<div class="war-creature-inner">
									<div class="war-c-species">{String(cd.species??'?')}</div>
									<div class="war-c-sub">{String(cd.name??'Unnamed')} · Lvl {Number(cd.level??1)}</div>
									<div class="war-c-stats"><span>HP {(bs.Health??0).toLocaleString()}</span><span>Mel {bs.Melee??0}</span></div>
									<div class="war-c-by">by {display(c.user as Record<string,unknown>)}</div>
									{#if !closed}<button class="war-remove" onclick={() => removeCreature(c.id as number)}><X size={11}/></button>{/if}
								</div>
							</div>
						{/each}
					</div>

				{:else if activeTab === 'members'}
					<div class="war-member-list">
						{#each sessionMembers as m}
							{@const md = m as Record<string,unknown>}
							<div class="cham-shell war-member" style="--cut:5px">
								<div class="war-member-inner">{display(md.user as Record<string,unknown>)}</div>
							</div>
						{/each}
					</div>

				{:else}
					{@const tips = getTips()}
					<div class="war-tips">
						<div class="war-tips-grid">
							<div class="war-tip-card"><div class="war-tip-title">Recommended Creatures</div>{#each tips.creatures as c}<div class="war-tip-item"><span class="war-tip-bullet" style="background:rgba(34,197,94,0.6)"></span>{c}</div>{/each}</div>
							<div class="war-tip-card"><div class="war-tip-title">Consumables</div>{#each tips.consumables as c}<div class="war-tip-item"><span class="war-tip-bullet" style="background:rgba(59,130,246,0.6)"></span>{c}</div>{/each}</div>
						</div>
						<div class="war-tip-card war-tip-full"><div class="war-tip-title">Strategy</div>{#each tips.tips as t}<div class="war-tip-item"><span class="war-tip-bullet" style="background:rgba(0,180,255,0.6)"></span>{t}</div>{/each}</div>
						<div class="war-tip-card war-tip-full war-tip-danger"><div class="war-tip-title">What to Avoid</div>{#each tips.avoid as a}<div class="war-tip-item"><span class="war-tip-bullet" style="background:rgba(239,68,68,0.6)"></span>{a}</div>{/each}</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Boss detail modal -->
{#if detailBoss}
{@const b = detailBoss}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:520px">
		<div class="modal-header"><h2 class="modal-title">{b.name}</h2><button class="close-btn" onclick={() => detailBoss=null}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
			<div class="ov-detail-map">{b.map}</div>
			<p class="ov-detail-desc">{b.description}</p>
			{#if b.tribute}<div class="ov-detail-tribute"><strong>Tribute / Access:</strong> {b.tribute}</div>{/if}
			<div class="plan-field">
				<label class="form-label">Difficulty</label>
				<div class="ov-diff-row">
					{#each b.difficulties as d}
						<button class="ov-diff-full-btn {d}" class:selected={difficulty===d} onclick={() => difficulty=d}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => detailBoss=null}>Close</button>
			<button class="btn btn-primary" onclick={createAndEnter}><Sword size={14}/> Launch War Room</button>
		</div>
	</div>
</div>
{/if}

<!-- Add specimen modal -->
{#if addOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:520px">
		<div class="modal-header"><h2 class="modal-title">Add Specimen to Roster</h2><button class="close-btn" onclick={() => addOpen=false}>&times;</button></div>
		<div class="modal-body">
			<div class="war-pick-grid">
				{#each myCreatures as c}
					{@const cd = c as Record<string,unknown>}
					<button class="cham-shell war-pick-btn" onclick={() => addCreature(c)} style="--cut:6px">
						<div class="war-pick-inner"><div class="war-c-species">{String(cd.species??'?')}</div><div class="war-c-sub">{String(cd.name??'Unnamed')} · Lvl {Number(cd.level??1)}</div></div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
{/if}

<!-- Log fight modal -->
{#if logOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:400px">
		<div class="modal-header"><h2 class="modal-title">Log Boss Fight</h2><button class="close-btn" onclick={() => logOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			{#if activeSession}<div style="color:#94a3b8;font-size:0.88rem">{String(activeSession.bossName)} · {String(activeSession.difficulty).toUpperCase()}</div>{/if}
			<div class="plan-field"><label class="form-label">Outcome</label>
				<div style="display:flex;gap:8px">
					<button class="btn btn-sm" class:btn-primary={logOutcome==='success'} class:btn-secondary={logOutcome!=='success'} onclick={() => logOutcome='success'}>Victory</button>
					<button class="btn btn-sm" class:btn-danger={logOutcome==='failed'} class:btn-secondary={logOutcome!=='failed'} onclick={() => logOutcome='failed'}>Defeat</button>
				</div>
			</div>
			<div class="plan-field"><label class="form-label" for="log-notes">Notes</label><textarea id="log-notes" class="form-control" rows="2" bind:value={logNotes}></textarea></div>
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => logOpen=false}>Cancel</button><button class="btn btn-primary" onclick={logFight}>Save</button></div>
	</div>
</div>
{/if}

<!-- Invite friends modal -->
{#if inviteOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:440px">
		<div class="modal-header"><h2 class="modal-title">Invite to War Room</h2><button class="close-btn" onclick={() => inviteOpen=false}>&times;</button></div>
		<div class="modal-body">
			{#if activeSession}<div style="color:#64748b;font-size:0.8rem;margin-bottom:12px">Join code: <strong style="font-family:monospace;color:#f1f5f9">{String(activeSession.joinCode)}</strong></div>{/if}
			{#if friends.length === 0}
				<div style="color:#475569">No friends yet.</div>
			{:else}
				<div style="display:flex;flex-direction:column;gap:5px">
					{#each friends as f}
						{@const fd = f as Record<string,unknown>}
						<div class="cham-shell" style="--cut:5px">
							<div style="background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1));padding:9px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px">
								<span style="font-size:0.86rem;color:#f1f5f9">{fd.nickname ?? fd.email}</span>
								<button class="btn btn-primary btn-sm" onclick={() => inviteFriend(fd.friendId as number)}>Invite</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => inviteOpen=false}>Close</button></div>
	</div>
</div>
{/if}

<style>
.ov-page { max-width:900px; }
.ov-top-row { display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start; margin-bottom:20px; }
.ov-map-filters { display:flex; gap:5px; flex-wrap:wrap; }
.ov-map-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:#64748b; font-size:0.72rem; padding:4px 10px; cursor:pointer; font-family:inherit; transition:all .15s; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.ov-map-btn:hover { background:rgba(255,255,255,0.08); color:#94a3b8; }
.ov-map-btn.active { background:rgba(0,180,255,0.12); color:#7dd3fc; border-color:rgba(0,180,255,0.35); }

.ov-section-title {
	font-family: var(--tek-display);
	font-size: 0.86rem;
	font-weight: 700;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: var(--tek-text);
	margin: 24px 0 12px;
	display: flex;
	align-items: center;
	gap: 10px;
}
.ov-section-title::before { content: '▸'; color: var(--tek-blue); }
.ov-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(0,180,255,0.10); }

.ov-top-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; align-items: center; justify-content: space-between; }
.ov-map-filters { display: flex; gap: 5px; flex-wrap: wrap; }

.ov-sessions { display:flex; flex-direction:column; gap:5px; margin-bottom:16px; }
.ov-session { }
.ov-session-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 15px; display:flex; align-items:center; gap:12px; transition:background .15s; }
.ov-session:hover .ov-session-inner { background:rgba(14,26,54,0.98); }
.ov-session-info { flex:1; }
.ov-session-boss { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.ov-session-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }

.ov-boss-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; margin-bottom:8px; }
.ov-boss-card { }
.ov-boss-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; flex-direction:column; gap:6px; transition:background .15s; }
.ov-boss-card:hover .ov-boss-inner { background:rgba(14,26,54,0.98); }
.ov-boss-name { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.ov-boss-diffs { display:flex; gap:5px; }
.ov-diff-chip { font-size:0.65rem; font-weight:800; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border-radius:50%; }
.ov-diff-chip.gamma { background:rgba(34,197,94,0.15); color:#4ade80; }
.ov-diff-chip.beta  { background:rgba(59,130,246,0.15); color:#60a5fa; }
.ov-diff-chip.alpha { background:rgba(239,68,68,0.15);  color:#f87171; }
.ov-boss-hint { font-size:0.65rem; color:#334155; }

.ov-records { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:7px; margin-bottom:16px; }
.ov-record-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; }
.ov-record-boss { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.ov-record-meta { font-size:0.68rem; color:#475569; }
.ov-record-outcome { font-size:0.68rem; font-weight:700; color:#ef4444; }
.ov-record-outcome.win { color:#4ade80; }

/* Active room */
.ov-room-header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.ov-room-boss { font-size:1.3rem; font-weight:700; color:#f1f5f9; }
.ov-room-meta { font-size:0.72rem; color:#64748b; margin-top:4px; }
.war-closed-tag { font-size:0.62rem; font-weight:800; color:#ef4444; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:2px 8px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); vertical-align:middle; }
.ov-room-layout { display:flex; flex-direction:column; }
.ov-room-left { display:flex; flex-direction:column; }

.war-tabs { display:flex; gap:0; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:14px; }
.war-tab { background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-size:0.82rem; font-weight:500; padding:7px 14px; cursor:pointer; font-family:inherit; margin-bottom:-1px; }
.war-tab.active { color:#f1f5f9; border-bottom-color:#00b4ff; }

.war-chat { display:flex; flex-direction:column; gap:8px; min-height:280px; max-height:380px; overflow-y:auto; margin-bottom:12px; }
.war-msg { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:8px 12px; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); border-left:2px solid rgba(0,180,255,0.2); }
.war-msg-author { font-size:0.72rem; font-weight:600; color:#60a5fa; }
.war-msg-time { font-size:0.65rem; color:#334155; margin-left:8px; }
.war-msg-text { font-size:0.85rem; color:#e2e8f0; margin-top:3px; }
.war-input-row { display:flex; gap:8px; }
.war-input-row .form-control { flex:1; }

.war-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; }
.war-roster-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.war-roster-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:8px; }
.war-creature { --cut:6px; }
.war-creature-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px; position:relative; }
.war-c-species { font-size:0.86rem; font-weight:700; color:#f1f5f9; }
.war-c-sub { font-size:0.71rem; color:#60a5fa; margin-top:2px; }
.war-c-stats { display:flex; gap:8px; margin-top:5px; font-size:0.71rem; color:#64748b; }
.war-c-by { font-size:0.65rem; color:#334155; margin-top:3px; }
.war-remove { position:absolute; top:7px; right:7px; background:rgba(239,68,68,0.15); border:none; color:#f87171; cursor:pointer; display:flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; }
.war-empty { color:#475569; padding:20px 0; font-size:0.86rem; }
.war-member-list { display:flex; flex-direction:column; gap:5px; }
.war-member { --cut:5px; }
.war-member-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; font-size:0.86rem; color:#f1f5f9; }

.war-tips { display:flex; flex-direction:column; gap:10px; }
.war-tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:600px) { .war-tips-grid { grid-template-columns:1fr; } }
.war-tip-card { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:13px 15px; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); display:flex; flex-direction:column; gap:7px; }
.war-tip-danger { background:linear-gradient(160deg,rgba(20,8,8,0.97),rgba(10,4,4,1)); }
.war-tip-title { font-size:0.62rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; margin-bottom:3px; }
.war-tip-item { display:flex; align-items:flex-start; gap:9px; font-size:0.8rem; color:#94a3b8; line-height:1.5; }
.war-tip-bullet { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:6px; }

.war-pick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px; }
.war-pick-btn { background:none; border:none; cursor:pointer; text-align:left; width:100%; }
.war-pick-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px; }

/* Detail modal */
.ov-detail-map { font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; }
.ov-detail-desc { font-size:0.86rem; color:#94a3b8; line-height:1.65; }
.ov-detail-tribute { font-size:0.8rem; color:#64748b; background:rgba(0,180,255,0.04); border-left:2px solid rgba(0,180,255,0.3); padding:8px 12px; }
.ov-detail-tribute strong { color:#7dd3fc; }
.ov-diff-row { display:flex; gap:8px; }
.ov-diff-full-btn { flex:1; padding:8px; border:none; cursor:pointer; font-family:inherit; font-size:0.8rem; font-weight:600; transition:all .15s; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.ov-diff-full-btn.gamma { background:rgba(34,197,94,0.1); color:#4ade80; }
.ov-diff-full-btn.beta  { background:rgba(59,130,246,0.1); color:#60a5fa; }
.ov-diff-full-btn.alpha { background:rgba(239,68,68,0.1);  color:#f87171; }
.ov-diff-full-btn.selected.gamma { background:rgba(34,197,94,0.25); }
.ov-diff-full-btn.selected.beta  { background:rgba(59,130,246,0.25); }
.ov-diff-full-btn.selected.alpha { background:rgba(239,68,68,0.25); }
</style>
