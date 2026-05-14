<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Boss    = { id:string; name:string; map:string; difficulties:string[]; description:string; tribute?:string };
	type Session = Record<string,unknown>;
	type ChatMsg = { id:number; content:string; createdAt:string; user:{ nickname:string|null; email:string } };

	// Full ASA boss list — preserved from prior port
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
	const wins     = (data.wins ?? {}) as Record<string, string[]>;

	// Per-boss visual mapping (color class + hex-glyph letter) — preview-aligned
	const BOSS_COLOR: Record<string,string> = {
		broodmother:'brood', center_broodmother:'brood', val_broodmother:'brood',
		megapithecus:'mega', center_megapithecus:'mega', val_megapithecus:'mega',
		dragon:'dragon', center_dragon:'dragon', val_dragon:'dragon',
		overseer:'overseer',
		manticore:'manticore', ragnarok_boss:'manticore',
		rockwell:'rockwell', rockwell_prime:'rockwell',
		forest_titan:'forest', desert_titan:'desert', ice_titan:'ice', king_titan:'king',
		moeder:'ice', master_controller:'overseer',
		hydraskos:'rockwell', natrix:'forest', thodes:'desert', thanatos:'dragon',
		pulmonoscorpius_monarch:'manticore',
		lost_king:'king', lost_queen:'rockwell',
		svartalfheim_dinopithecus:'mega'
	};
	const BOSS_LETTER: Record<string,string> = {
		broodmother:'B', center_broodmother:'B', val_broodmother:'B',
		megapithecus:'Mp', center_megapithecus:'Mp', val_megapithecus:'Mp',
		dragon:'D', center_dragon:'D', val_dragon:'D',
		overseer:'O',
		manticore:'M', ragnarok_boss:'D&M',
		rockwell:'R', rockwell_prime:'Rp',
		forest_titan:'FT', desert_titan:'DT', ice_titan:'IT', king_titan:'KT',
		moeder:'Mo', master_controller:'CM',
		hydraskos:'H', natrix:'N', thodes:'T', thanatos:'Th',
		pulmonoscorpius_monarch:'PM',
		lost_king:'LK', lost_queen:'LQ',
		svartalfheim_dinopithecus:'DK'
	};
	// Per-boss fill / stroke / text colors matching preview SVGs
	const BOSS_SVG: Record<string,{ fill:string; stroke:string; text:string }> = {
		brood:    { fill:'rgba(34,197,94,0.15)',  stroke:'#22c55e', text:'#86efac' },
		mega:     { fill:'rgba(139,92,246,0.15)', stroke:'#8b5cf6', text:'#c4b5fd' },
		dragon:   { fill:'rgba(239,68,68,0.15)',  stroke:'#ef4444', text:'#fca5a5' },
		overseer: { fill:'rgba(148,163,184,0.15)',stroke:'#94a3b8', text:'#e2e8f0' },
		manticore:{ fill:'rgba(245,158,11,0.15)', stroke:'#f59e0b', text:'#fcd34d' },
		rockwell: { fill:'rgba(217,70,239,0.15)', stroke:'#d946ef', text:'#f0abfc' },
		forest:   { fill:'rgba(34,197,94,0.15)',  stroke:'#22c55e', text:'#86efac' },
		desert:   { fill:'rgba(245,158,11,0.15)', stroke:'#f59e0b', text:'#fcd34d' },
		ice:      { fill:'rgba(6,182,212,0.15)',  stroke:'#06b6d4', text:'#67e8f9' },
		king:     { fill:'rgba(239,68,68,0.15)',  stroke:'#ef4444', text:'#fca5a5' },
		lava:     { fill:'rgba(249,115,22,0.15)', stroke:'#f97316', text:'#fdba74' }
	};
	const MAP_THEME: Record<string,string> = {
		'The Island':'island',
		'The Center':'island',
		'Scorched Earth':'scorched',
		'Aberration':'aberration',
		'Extinction':'extinction',
		'Ragnarok':'ragnarok',
		'Valguero':'island',
		'Genesis: Part 1':'aberration',
		'Genesis: Part 2':'aberration',
		'Astraeos':'aberration',
		'Lost Colony':'ragnarok',
		'Svartalfheim · Mod':'extinction'
	};

	function bossColor(id: string) { return BOSS_COLOR[id] ?? 'overseer'; }
	function bossLetter(id: string, name: string) { return BOSS_LETTER[id] ?? name.charAt(0); }
	function svgFor(id: string) { return BOSS_SVG[bossColor(id)] ?? BOSS_SVG.overseer; }
	function mapClass(map: string) { return MAP_THEME[map] ?? 'island'; }
	function wonOn(b: Boss, d: string) { return (wins[b.name] ?? []).includes(d); }
	function diffOrder(d: string) { return d==='gamma'?0 : d==='beta'?1 : 2; }
	function statusFor(b: Boss) {
		const won = b.difficulties.filter(d => wonOn(b, d));
		if (won.length === 0) return { cls:'notready', label:'Not Ready', hint:'Untouched' };
		if (won.length === b.difficulties.length) return { cls:'complete', label:'Complete', hint:`${won.length} cleared` };
		const remaining = b.difficulties.filter(d => !wonOn(b, d)).sort((a,c)=>diffOrder(a)-diffOrder(c));
		const next = remaining[0];
		return { cls:'partial', label:`Partial · ${next.charAt(0).toUpperCase()+next.slice(1)}`, hint:`${won.length}/${b.difficulties.length} cleared` };
	}
	function pipClass(b: Boss, d: string) {
		if (!wonOn(b, d)) return '';
		return d==='gamma' ? 'won-bronze' : d==='beta' ? 'won-silver' : 'won-gold';
	}
	function activeWarRoom(bossName: string) {
		return sessions.some(s => (s as Record<string,unknown>).bossName === bossName && (s as Record<string,unknown>).status === 'open');
	}

	let mapFilter  = $state('all');
	let joinCode   = $state('');
	let detailBoss = $state<Boss|null>(null);
	let difficulty = $state('alpha');

	// Active war room (inline)
	let activeSession   = $state<Record<string,unknown>|null>(null);
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
	let hexCanvas: HTMLCanvasElement;

	onDestroy(() => clearInterval(pollTimer));

	onMount(() => {
		// Hex canvas background — verbatim from preview
		const canvas = hexCanvas;
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
				if (i === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
			}
			ctx!.closePath();
			ctx!.strokeStyle = `rgba(239,68,68,${opacity})`;
			ctx!.lineWidth = 1;
			ctx!.stroke();
		}
		function draw() {
			ctx!.clearRect(0, 0, canvas.width, canvas.height);
			const cw = canvas.width, ch = canvas.height;
			const cols = Math.ceil(cw / W) + 3;
			const rows = Math.ceil(ch / (H * 0.75)) + 3;
			for (let row = -1; row < rows; row++) {
				for (let col = -1; col < cols; col++) {
					const x = col * W + (row % 2 !== 0 ? W / 2 : 0);
					const y = row * H * 0.75;
					const dx = x - cw * 0.5, dy = y - ch * 0.5;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const wave = Math.sin(phase - dist * 0.01) * 0.5 + 0.5;
					drawHex(x, y, 0.05 + wave * 0.06);
				}
			}
			phase += 0.005;
			raf = requestAnimationFrame(draw);
		}
		function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
		window.addEventListener('resize', resize);
		resize(); draw();
		return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf); };
	});

	// Map filter list, preview ordering
	const MAP_ORDER = ['all', ...Array.from(new Set(BOSSES.map(b => b.map)))];
	function bossesForMap(m: string) { return m === 'all' ? BOSSES : BOSSES.filter(b => b.map === m); }
	function grouped(): [string, Boss[]][] {
		const r: Record<string, Boss[]> = {};
		for (const b of (mapFilter === 'all' ? BOSSES : BOSSES.filter(b => b.map === mapFilter))) {
			(r[b.map] = r[b.map] ?? []).push(b);
		}
		return Object.entries(r);
	}

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.discordName ?? 'Unknown') as string; }

	async function loadSession(id: number) {
		const res = await fetch(`/api/arena/sessions/${id}`);
		if (res.ok) {
			const s = await res.json();
			activeSession = s;
			messages = (s.chats ?? []) as ChatMsg[];
			sessionCreatures = (s.creatures ?? []) as Record<string,unknown>[];
			sessionMembers = (s.members ?? []) as Record<string,unknown>[];
		}
		startPolling(id);
	}

	function startPolling(id: number) {
		clearInterval(pollTimer);
		pollTimer = setInterval(async () => {
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

	const tips = $derived.by(() => {
		if (!activeSession) return TIPS.default;
		const id = String(activeSession.bossId ?? '');
		return TIPS[id] ?? TIPS.default;
	});

	function ago(dt: string) { const d = new Date(dt); return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
</script>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

	{#if !activeSession}
		<!-- ═══════════ HEADER ═══════════ -->
		<div class="page-header">
			<div>
				<div class="page-title">Overseer</div>
				<div class="page-sub">
					<span class="prefix">›</span>
					BOSS ARENA · <span class="stat-num">{BOSSES.length}</span> BOSSES · <span class="stat-num">{sessions.length}</span> WAR ROOMS ACTIVE · <span class="stat-num">{records.length}</span> KILLS LOGGED
				</div>
			</div>
			<button class="btn-create" onclick={() => document.getElementById('boss-arena')?.scrollIntoView({ behavior:'smooth', block:'start' })} title="Pick a boss below to schedule">⚔ Schedule War Room</button>
		</div>

		<!-- Join code row -->
		<div class="ov-join-row">
			<input class="ov-join-input" placeholder="JOIN CODE" bind:value={joinCode} maxlength={6} onkeydown={(e) => e.key==='Enter' && joinByCode()} />
			<button class="ov-join-btn" onclick={joinByCode}>⬡ Join Room</button>
		</div>

		<!-- ═══════════ MAP FILTER ═══════════ -->
		<div class="map-filter">
			{#each MAP_ORDER as m}
				<button class="map-chip" class:active={mapFilter === m} onclick={() => mapFilter = m}>{m === 'all' ? 'All Maps' : m} <span class="count">{bossesForMap(m).length}</span></button>
			{/each}
		</div>

		<!-- Open War Rooms -->
		{#if sessions.length > 0}
			<section class="map-section ragnarok" data-map="open-rooms">
				<div class="map-section-header">
					<svg class="map-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/>
					</svg>
					<span class="map-name">Open War Rooms</span>
					<span class="rule"></span>
					<span class="map-count">{sessions.length} ACTIVE</span>
				</div>
				<div class="boss-grid">
					{#each sessions as s}
						{@const sd = s as Record<string,unknown>}
						<button class="boss-card dragon" onclick={() => loadSession(sd.id as number)}>
							<span class="boss-warroom-flag">● War Room Active</span>
							<div class="boss-top">
								<div class="boss-glyph">
									<svg viewBox="0 0 100 110">
										<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(239,68,68,0.15)" stroke="#ef4444" stroke-width="2"/>
										<text x="50" y="72" font-family="Orbitron" font-size="36" font-weight="900" text-anchor="middle" fill="#fca5a5">WR</text>
									</svg>
								</div>
								<div class="boss-id">
									<div class="boss-card-name">{String(sd.bossName)}</div>
									<div class="boss-card-map">Code · {String(sd.joinCode)}</div>
								</div>
							</div>
							<div class="boss-diff">
								<div class="boss-pip {String(sd.difficulty)==='gamma'?'won-bronze':String(sd.difficulty)==='beta'?'won-silver':'won-gold'}">{String(sd.difficulty).toUpperCase()}</div>
							</div>
							<div class="boss-status">
								<span class="status-badge ready"><span class="status-pip"></span>Join Room</span>
								<span class="boss-extra">{(sd.memberCount as number) ?? 0} in <span class="time">room</span></span>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- ═══════════ BOSS GRID BY MAP ═══════════ -->
		<div id="boss-arena"></div>
		{#each grouped() as [mapName, bosses]}
			<section class="map-section {mapClass(mapName)}" data-map={mapClass(mapName)}>
				<div class="map-section-header">
					<svg class="map-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
					</svg>
					<span class="map-name">{mapName}</span>
					<span class="rule"></span>
					<span class="map-count">{bosses.length} {bosses.length === 1 ? 'BOSS' : 'BOSSES'}</span>
				</div>
				<div class="boss-grid">
					{#each bosses as b}
						{@const letter = bossLetter(b.id, b.name)}
						{@const sv = svgFor(b.id)}
						{@const st = statusFor(b)}
						<button class="boss-card {bossColor(b.id)}" onclick={() => { detailBoss = b; difficulty = 'alpha'; }}>
							{#if activeWarRoom(b.name)}<span class="boss-warroom-flag">● War Room Active</span>{/if}
							<div class="boss-top">
								<div class="boss-glyph">
									<svg viewBox="0 0 100 110">
										<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill={sv.fill} stroke={sv.stroke} stroke-width="2"/>
										<text x="50" y="72" font-family="Orbitron" font-size={letter.length === 1 ? 44 : letter.length === 2 ? 36 : 26} font-weight="900" text-anchor="middle" fill={sv.text}>{letter}</text>
									</svg>
								</div>
								<div class="boss-id">
									<div class="boss-card-name">{b.name}</div>
									<div class="boss-card-map">{b.map}</div>
								</div>
							</div>
							<div class="boss-diff">
								{#each b.difficulties as d}
									<div class="boss-pip {pipClass(b, d)}">{d.charAt(0).toUpperCase()+d.slice(1)}{wonOn(b, d) ? ' ✓' : ''}</div>
								{/each}
							</div>
							<div class="boss-status">
								<span class="status-badge {st.cls}"><span class="status-pip"></span>{st.label}</span>
								<span class="boss-extra">{st.hint}</span>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/each}

		<!-- Fight history -->
		{#if records.length > 0}
			<section class="map-section extinction" data-map="history">
				<div class="map-section-header">
					<svg class="map-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
					</svg>
					<span class="map-name">My Fight History</span>
					<span class="rule"></span>
					<span class="map-count">{records.length} LOGGED</span>
				</div>
				<div class="boss-grid">
					{#each records as r}
						{@const rd = r as Record<string,unknown>}
						<div class="boss-card {rd.outcome==='success'?'forest':'dragon'}">
							<div class="boss-top">
								<div class="boss-glyph">
									<svg viewBox="0 0 100 110">
										<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill={rd.outcome==='success'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'} stroke={rd.outcome==='success'?'#22c55e':'#ef4444'} stroke-width="2"/>
										<text x="50" y="72" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill={rd.outcome==='success'?'#86efac':'#fca5a5'}>{rd.outcome==='success'?'V':'X'}</text>
									</svg>
								</div>
								<div class="boss-id">
									<div class="boss-card-name">{String(rd.bossName)}</div>
									<div class="boss-card-map">{String(rd.difficulty ?? '').toUpperCase()}</div>
								</div>
							</div>
							<div class="boss-status" style="border-top:none;padding-top:0">
								<span class="status-badge {rd.outcome==='success'?'ready':'notready'}"><span class="status-pip"></span>{rd.outcome==='success'?'Victory':'Defeat'}</span>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else}
		<!-- ═══════════ ACTIVE WAR ROOM (boss-detail-preview port) ═══════════ -->
		{@const closed = activeSession.status === 'closed'}
		{@const isCreator = (activeSession.creatorUserId as number) === data.myId}

		<!-- Breadcrumb -->
		<div class="breadcrumb">
			<button class="bc-link" onclick={() => { clearInterval(pollTimer); activeSession=null; }}>Overseer</button>
			<span class="sep">›</span>
			<span>{String(activeSession.bossName)} · Boss Arena</span>
			<span class="sep">›</span>
			<span class="here">War Room {String(activeSession.joinCode)}</span>
		</div>

		<!-- Boss hero -->
		<div class="boss-hero">
			<div class="boss-hero-ghost">{String(activeSession.bossName).toUpperCase()}</div>
			<div class="boss-hero-content">
				<div class="boss-hero-glyph">
					<svg viewBox="0 0 100 110">
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(245,158,11,0.20)" stroke="#f59e0b" stroke-width="2.5"/>
						<polygon points="50,18 80,36 80,74 50,92 20,74 20,36" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.5"/>
						<text x="50" y="72" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#fcd34d">{String(activeSession.bossName).charAt(0)}</text>
					</svg>
				</div>
				<div class="boss-hero-info">
					<div class="boss-hero-name">{String(activeSession.bossName)}</div>
					<div class="boss-hero-meta">War Room · <span class="map">Code {String(activeSession.joinCode)} · {sessionMembers.length} online</span>{#if closed} <span class="map" style="color:#ef4444">· CLOSED</span>{/if}</div>
					<p class="boss-hero-quote">"Coordinate your tribe. Stage your specimens. Commit your gear. The arena does not forgive the unprepared — only the survivor who reads its rhythm walks out."</p>
				</div>
				<div class="diff-select">
					<div class="diff-select-label">Difficulty</div>
					<button class="diff-btn active">{String(activeSession.difficulty ?? '').toUpperCase()}</button>
					<button class="diff-btn" onclick={loadFriendsAndInvite}>Invite</button>
					<button class="diff-btn" onclick={() => { logOpen=true; logOutcome='success'; logNotes=''; }}>Log Fight</button>
					{#if isCreator && !closed}<button class="diff-btn" onclick={closeRoom}>Close</button>{/if}
				</div>
			</div>
		</div>

		<!-- Active War Room section -->
		<section class="section">
			<div class="section-header">
				<span class="pip"></span>
				Active War Room
				<span class="rule"></span>
				<button class="action" onclick={() => { clearInterval(pollTimer); activeSession=null; }}>◂ Back to Bosses <span class="arrow">▸</span></button>
			</div>

			<div class="warroom">
				<div class="warroom-head">
					<div>
						<div class="warroom-title">Squad Bloodline</div>
						<div class="warroom-meta">
							<span class="diff-chip">⚔ {String(activeSession.difficulty ?? '').toUpperCase()}</span>
							<span class="vis-chip">🤝 Allies</span>
							<span class="warroom-head-info">Code <span style="color:#fcd34d;font-weight:600">{String(activeSession.joinCode)}</span></span>
						</div>
					</div>
					<div class="warroom-timer-block">
						<div class="warroom-timer-label">Members</div>
						<div class="warroom-timer">{sessionMembers.length}</div>
						<div class="warroom-scheduled">{sessionCreatures.length} CREATURES COMMITTED</div>
					</div>
				</div>

				<div class="warroom-body">
					<!-- LEFT: roster, squad, creatures -->
					<div>
						<div class="readiness-grid">
							<!-- TAMES placeholder -->
							<div class="readiness-section tames">
								<div class="readiness-header">
									<div class="icon-wrap">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
										<span class="title">Roster</span>
									</div>
									<span class="readiness-status {sessionCreatures.length >= 8 ? 'ready' : sessionCreatures.length > 0 ? 'partial' : 'missing'}">{sessionCreatures.length >= 8 ? 'READY' : sessionCreatures.length > 0 ? 'PARTIAL' : 'MISSING'}</span>
								</div>
								<div class="readiness-row">
									<span class="name">Creatures committed <span class="sub">{tips.creatures[0] ?? ''}</span></span>
									<span class="qty"><span class="cur {sessionCreatures.length >= 8 ? 'met' : 'gap'}">{sessionCreatures.length}</span><span class="req"> / 8</span></span>
									<span class="check {sessionCreatures.length >= 8 ? 'ok' : 'gap'}">{sessionCreatures.length >= 8 ? '✓' : '⚠'}</span>
								</div>
								<div class="readiness-row">
									<span class="name">Members in room</span>
									<span class="qty"><span class="cur met">{sessionMembers.length}</span><span class="req"> / 8</span></span>
									<span class="check ok">✓</span>
								</div>
								<div class="readiness-bar"><div class="readiness-bar-fill" style="width:{Math.min(100, (sessionCreatures.length / 8) * 100)}%"></div></div>
							</div>

							<!-- TIPS -->
							<div class="readiness-section consumables">
								<div class="readiness-header">
									<div class="icon-wrap">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/></svg>
										<span class="title">Consumables</span>
									</div>
									<span class="readiness-status ready">READY</span>
								</div>
								{#each tips.consumables as c}
									<div class="readiness-row">
										<span class="name">{c}</span>
										<span class="qty"><span class="cur met">✓</span></span>
										<span class="check ok">✓</span>
									</div>
								{/each}
							</div>

							<div class="readiness-section gear">
								<div class="readiness-header">
									<div class="icon-wrap">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
										<span class="title">Strategy</span>
									</div>
									<span class="readiness-status ready">PRIMED</span>
								</div>
								{#each tips.tips as t}
									<div class="readiness-row">
										<span class="name">{t}</span>
										<span class="qty"></span>
										<span class="check ok">✓</span>
									</div>
								{/each}
							</div>

							<div class="readiness-section tributes">
								<div class="readiness-header">
									<div class="icon-wrap">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
										<span class="title">What to Avoid</span>
									</div>
									<span class="readiness-status missing">CAUTION</span>
								</div>
								{#each tips.avoid as a}
									<div class="readiness-row">
										<span class="name">{a}</span>
										<span class="qty"></span>
										<span class="check missing">✗</span>
									</div>
								{/each}
							</div>
						</div>

						<!-- Squad / members block -->
						<div class="squad-block" style="margin-top:14px">
							<div class="squad-head">
								<span>Squad</span>
								<span class="count">{sessionMembers.length} / 8 COMMITTED</span>
							</div>
							<div class="squad-grid">
								{#each sessionMembers as m}
									{@const md = m as Record<string,unknown>}
									{@const u = (md.user as Record<string,unknown>) ?? {}}
									{@const name = display(u)}
									<div class="squad-slot filled"><span class="initial">{name.charAt(0).toUpperCase()}</span><span class="pip"></span></div>
								{/each}
								{#each Array.from({ length: Math.max(0, 8 - sessionMembers.length) }) as _}
									<div class="squad-slot empty">+</div>
								{/each}
							</div>
							<button class="invite-btn" onclick={loadFriendsAndInvite}>⬡ Invite Survivor</button>
						</div>

						<!-- Creatures committed -->
						<div class="creatures-block">
							<div class="squad-head">
								<span>Creatures Committed</span>
								<span class="count">{sessionCreatures.length} OF 20 RECOMMENDED</span>
							</div>
							<div class="creatures-grid">
								{#each sessionCreatures as c}
									{@const cd = (c.creatureData ?? c) as Record<string,unknown>}
									<div class="creature-card combat">
										<div class="creature-species">{String(cd.species ?? '?')}</div>
										<div class="creature-nick">"{String(cd.name ?? 'Unnamed')}"</div>
										<div class="creature-stats"><span class="creature-lvl">{Number(cd.level ?? 1)}</span><span class="creature-owner">{display(c.user as Record<string,unknown>)}</span></div>
										{#if !closed}<button class="war-remove" onclick={() => removeCreature(c.id as number)} aria-label="Remove">×</button>{/if}
									</div>
								{/each}
								{#if !closed}
									<button class="creature-add" onclick={() => addOpen=true}>
										<div class="creature-add-glyph">+</div>
										<div class="creature-add-label">Commit creature</div>
									</button>
								{/if}
							</div>
						</div>
					</div>

					<!-- RIGHT: Chat -->
					<div class="chat-block">
						<div class="chat-head">
							<span>Tribe Chat <span class="live-pip"></span></span>
							<span style="color:var(--tek-text-faint)">{sessionMembers.length} ONLINE</span>
						</div>
						<div class="chat-messages" id="chatMessages">
							{#if messages.length === 0}
								<div class="chat-msg system">
									<div class="chat-avatar">⌬</div>
									<div class="chat-body"><div class="chat-text">War room opened. Start the conversation.</div></div>
								</div>
							{/if}
							{#each messages as m}
								{@const author = display(m.user as Record<string,unknown>)}
								<div class="chat-msg">
									<div class="chat-avatar">
										<svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="3"/><text x="50" y="76" font-family="Orbitron" font-size="56" font-weight="900" text-anchor="middle" fill="#7dd3fc">{author.charAt(0).toUpperCase()}</text></svg>
									</div>
									<div class="chat-body">
										<div class="chat-meta"><span class="who">{author}</span><span class="time">{ago(m.createdAt)}</span></div>
										<div class="chat-text">{m.content}</div>
									</div>
								</div>
							{/each}
							<div bind:this={bottom}></div>
						</div>
						{#if !closed}
							<div class="chat-input-row">
								<input type="text" class="chat-input" placeholder="Message the war room…" bind:value={draft} onkeydown={(e) => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();} }} />
								<button class="chat-send" onclick={sendMsg} disabled={!draft.trim()}>Send</button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</section>
	{/if}

</div>

<!-- ═════════ BOSS DETAIL MODAL (boss-detail-preview port) ═════════ -->
{#if detailBoss}
{@const b = detailBoss}
{@const sv = svgFor(b.id)}
{@const letter = bossLetter(b.id, b.name)}
{@const dtips = TIPS[b.id] ?? TIPS.default}
<div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => detailBoss = null}>
	<div class="modal-stage" onclick={(e) => e.stopPropagation()} role="document">
		<!-- Breadcrumb -->
		<div class="breadcrumb">
			<button class="bc-link" onclick={() => detailBoss = null}>Overseer</button>
			<span class="sep">›</span>
			<span>{b.map}</span>
			<span class="sep">›</span>
			<span class="here">{b.name}</span>
		</div>

		<!-- Boss hero -->
		<div class="boss-hero" style="--boss-rgb:{sv.stroke==='#22c55e'?'34,197,94':sv.stroke==='#8b5cf6'?'139,92,246':sv.stroke==='#ef4444'?'239,68,68':sv.stroke==='#94a3b8'?'148,163,184':sv.stroke==='#f59e0b'?'245,158,11':sv.stroke==='#d946ef'?'217,70,239':sv.stroke==='#06b6d4'?'6,182,212':sv.stroke==='#f97316'?'249,115,22':'245,158,11'}">
			<div class="boss-hero-ghost">{b.name.toUpperCase()}</div>

			<div class="boss-hero-content">
				<div class="boss-hero-glyph">
					<svg viewBox="0 0 100 110">
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill={sv.fill} stroke={sv.stroke} stroke-width="2.5"/>
						<polygon points="50,18 80,36 80,74 50,92 20,74 20,36" fill="none" stroke={sv.stroke} stroke-width="1" opacity="0.5"/>
						<text x="50" y="72" font-family="Orbitron" font-size={letter.length === 1 ? 44 : letter.length === 2 ? 36 : 26} font-weight="900" text-anchor="middle" fill={sv.text}>{letter}</text>
					</svg>
				</div>

				<div class="boss-hero-info">
					<div class="boss-hero-name">{b.name}</div>
					<div class="boss-hero-meta">Boss · <span class="map">{b.map}</span></div>
					<p class="boss-hero-quote">{b.description}</p>
				</div>

				<div class="diff-select">
					<div class="diff-select-label">Difficulty</div>
					{#each b.difficulties as d}
						<button class="diff-btn" class:active={difficulty === d} class:won={wonOn(b, d)} onclick={() => difficulty = d}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Tribute info section -->
		{#if b.tribute}
		<section class="section">
			<div class="section-header">
				<span class="pip"></span>
				Tribute · Access
				<span class="rule"></span>
			</div>
			<div class="warroom">
				<div class="warroom-meta" style="font-family:var(--tek-mono);font-size:0.78rem;color:#94a3b8;line-height:1.6">
					{b.tribute}
				</div>
			</div>
		</section>
		{/if}

		<!-- Strategy section -->
		<section class="section">
			<div class="section-header">
				<span class="pip"></span>
				Strategy
				<span class="rule"></span>
			</div>
			<div class="warroom">
				<div class="readiness-grid">
					<div class="readiness-section tames">
						<div class="readiness-header">
							<div class="icon-wrap">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>
								<span class="title">Recommended Creatures</span>
							</div>
						</div>
						{#each dtips.creatures as c}
							<div class="readiness-row">
								<span class="name">{c}</span>
								<span class="qty"></span>
								<span class="check ok">✓</span>
							</div>
						{/each}
					</div>
					<div class="readiness-section consumables">
						<div class="readiness-header">
							<div class="icon-wrap">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z"/></svg>
								<span class="title">Consumables</span>
							</div>
						</div>
						{#each dtips.consumables as c}
							<div class="readiness-row">
								<span class="name">{c}</span>
								<span class="qty"></span>
								<span class="check ok">✓</span>
							</div>
						{/each}
					</div>
					<div class="readiness-section gear">
						<div class="readiness-header">
							<div class="icon-wrap">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
								<span class="title">Strategy</span>
							</div>
						</div>
						{#each dtips.tips as t}
							<div class="readiness-row">
								<span class="name">{t}</span>
								<span class="qty"></span>
								<span class="check ok">✓</span>
							</div>
						{/each}
					</div>
					<div class="readiness-section tributes">
						<div class="readiness-header">
							<div class="icon-wrap">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
								<span class="title">What to Avoid</span>
							</div>
						</div>
						{#each dtips.avoid as a}
							<div class="readiness-row">
								<span class="name">{a}</span>
								<span class="qty"></span>
								<span class="check missing">✗</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<div class="modal-actions">
			<button class="diff-btn" onclick={() => detailBoss = null}>Close</button>
			<button class="btn-create" onclick={createAndEnter}>⚔ Launch War Room</button>
		</div>
	</div>
</div>
{/if}

<!-- ═════════ ADD SPECIMEN MODAL ═════════ -->
{#if addOpen}
<div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => addOpen=false}>
	<div class="modal-stage" style="max-width:720px" onclick={(e) => e.stopPropagation()} role="document">
		<div class="section-header">
			<span class="pip"></span>
			Commit Specimen
			<span class="rule"></span>
			<button class="action" onclick={() => addOpen=false}>Close <span class="arrow">▸</span></button>
		</div>
		<div class="warroom">
			<div class="creatures-grid">
				{#each myCreatures as c}
					{@const cd = c as Record<string,unknown>}
					<button class="creature-card combat" onclick={() => addCreature(c)}>
						<div class="creature-species">{String(cd.species ?? '?')}</div>
						<div class="creature-nick">"{String(cd.name ?? 'Unnamed')}"</div>
						<div class="creature-stats"><span class="creature-lvl">{Number(cd.level ?? 1)}</span><span class="creature-owner">commit</span></div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
{/if}

<!-- ═════════ LOG FIGHT MODAL ═════════ -->
{#if logOpen}
<div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => logOpen=false}>
	<div class="modal-stage" style="max-width:520px" onclick={(e) => e.stopPropagation()} role="document">
		<div class="section-header">
			<span class="pip"></span>
			Log Boss Fight
			<span class="rule"></span>
		</div>
		<div class="warroom">
			{#if activeSession}<div style="font-family:var(--tek-mono);color:#94a3b8;font-size:0.78rem;margin-bottom:14px">{String(activeSession.bossName)} · {String(activeSession.difficulty).toUpperCase()}</div>{/if}
			<div class="diff-select-label">Outcome</div>
			<div style="display:flex;gap:8px;margin-bottom:14px">
				<button class="diff-btn" class:active={logOutcome==='success'} onclick={() => logOutcome='success'}>Victory</button>
				<button class="diff-btn" class:active={logOutcome==='failed'} onclick={() => logOutcome='failed'}>Defeat</button>
			</div>
			<div class="diff-select-label">Notes</div>
			<textarea class="chat-input" rows={3} style="width:100%;margin-top:6px;font-family:inherit;clip-path:polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);" bind:value={logNotes}></textarea>
		</div>
		<div class="modal-actions">
			<button class="diff-btn" onclick={() => logOpen=false}>Cancel</button>
			<button class="btn-create" onclick={logFight}>Save</button>
		</div>
	</div>
</div>
{/if}

<!-- ═════════ INVITE MODAL ═════════ -->
{#if inviteOpen}
<div class="modal-overlay" role="dialog" aria-modal="true" onclick={() => inviteOpen=false}>
	<div class="modal-stage" style="max-width:520px" onclick={(e) => e.stopPropagation()} role="document">
		<div class="section-header">
			<span class="pip"></span>
			Invite to War Room
			<span class="rule"></span>
		</div>
		<div class="warroom">
			{#if activeSession}<div style="font-family:var(--tek-mono);color:#64748b;font-size:0.78rem;margin-bottom:12px">Join code: <strong style="color:#fcd34d">{String(activeSession.joinCode)}</strong></div>{/if}
			{#if friends.length === 0}
				<div style="color:#475569;padding:18px 0">No friends yet.</div>
			{:else}
				<div style="display:flex;flex-direction:column;gap:6px">
					{#each friends as f}
						{@const fd = f as Record<string,unknown>}
						<div class="readiness-row" style="grid-template-columns:1fr auto;gap:14px;padding:9px 12px;background:rgba(0,0,0,0.30);">
							<span class="name">{String(fd.nickname ?? fd.discordName ?? 'Survivor')}</span>
							<button class="diff-btn active" onclick={() => inviteFriend(fd.friendId as number)}>Invite</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div class="modal-actions">
			<button class="diff-btn" onclick={() => inviteOpen=false}>Close</button>
		</div>
	</div>
</div>
{/if}

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:root {
    --tek-bg:           #050812;
    --tek-blue:         #00b4ff;
    --tek-blue-dim:     rgba(0, 180, 255, 0.12);
    --tek-blue-border:  rgba(0, 180, 255, 0.30);
    --tek-blue-glow:    rgba(0, 180, 255, 0.50);
    --tek-purple:       #8b5cf6;
    --tek-amber:        #f59e0b;
    --tek-green:        #10b981;
    --tek-red:          #ef4444;
    --tek-pink:         #f472b6;
    --tek-text:         #e2e8f0;
    --tek-text-dim:     #64748b;
    --tek-text-faint:   #334155;
    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --tek-serif:        'Crimson Pro', Georgia, serif;
}

#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 1280px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER (overseer)
   ═════════════════════════════════════════════════════════════════════════ */
.page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #fca5a5 70%, rgba(239,68,68,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 14px rgba(239,68,68,0.30));
    line-height: 1;
    margin-bottom: 4px;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-red); opacity: 0.65; margin-right: 4px; }
.page-sub .stat-num { color: var(--tek-red); font-weight: 700; text-shadow: 0 0 6px rgba(239,68,68,0.5); }

.btn-create {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 11px 22px;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    color: #fff;
    border: none;
    cursor: pointer;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    filter: drop-shadow(0 0 12px rgba(239,68,68,0.45));
    transition: filter 0.18s, transform 0.18s;
}
.btn-create:hover { filter: drop-shadow(0 0 22px rgba(239,68,68,0.80)); transform: translateY(-1px); }

/* Join code row */
.ov-join-row { display:flex; gap:8px; align-items:center; margin-bottom:18px; flex-wrap:wrap; }
.ov-join-input {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 9px 12px;
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    outline: none;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    max-width: 180px;
}
.ov-join-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); }
.ov-join-btn {
    background: rgba(0,180,255,0.06);
    border: 1px solid rgba(0,180,255,0.30);
    color: #7dd3fc;
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 8px 14px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
}
.ov-join-btn:hover { background: rgba(0,180,255,0.18); filter: drop-shadow(0 0 8px var(--tek-blue-glow)); }

/* ═════════════════════════════════════════════════════════════════════════
   MAP FILTER TABS
   ═════════════════════════════════════════════════════════════════════════ */
.map-filter {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 12px 18px;
    margin-bottom: 36px;
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.map-filter::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-red), var(--tek-amber));
    box-shadow: 0 0 7px rgba(239,68,68,0.55);
}
.map-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 11px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
}
.map-chip:hover { color: var(--tek-text); border-color: rgba(239,68,68,0.40); }
.map-chip.active { background: var(--tek-red); color: #fff; border-color: var(--tek-red); }
.map-chip .count {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    opacity: 0.6;
    background: rgba(0,0,0,0.30);
    padding: 1px 6px;
    border-radius: 6px;
}
.map-chip.active .count { background: rgba(0,0,0,0.25); opacity: 0.85; }

/* ═════════════════════════════════════════════════════════════════════════
   MAP SECTIONS
   ═════════════════════════════════════════════════════════════════════════ */
.map-section { margin-bottom: 44px; }
.map-section.hidden { display: none; }

.map-section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 18px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
}
.map-section-header .map-glyph {
    width: 14px; height: 14px;
    color: var(--tek-red);
    filter: drop-shadow(0 0 4px rgba(239,68,68,0.6));
}
.map-section-header .map-name {
    color: var(--tek-text);
}
.map-section-header .rule {
    flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(239,68,68,0.20), transparent);
}
.map-section-header .map-count {
    color: var(--tek-text-faint);
    font-size: 0.62rem;
}

/* Per-map themed tinting */
.map-section.island      .map-section-header .map-glyph { color: #34d399; filter: drop-shadow(0 0 4px rgba(52,211,153,0.6)); }
.map-section.island      .map-section-header .rule      { background: linear-gradient(90deg, rgba(52,211,153,0.25), transparent); }
.map-section.scorched    .map-section-header .map-glyph { color: #fbbf24; filter: drop-shadow(0 0 4px rgba(251,191,36,0.6)); }
.map-section.scorched    .map-section-header .rule      { background: linear-gradient(90deg, rgba(251,191,36,0.25), transparent); }
.map-section.aberration  .map-section-header .map-glyph { color: #d946ef; filter: drop-shadow(0 0 4px rgba(217,70,239,0.6)); }
.map-section.aberration  .map-section-header .rule      { background: linear-gradient(90deg, rgba(217,70,239,0.25), transparent); }
.map-section.extinction  .map-section-header .map-glyph { color: #94a3b8; filter: drop-shadow(0 0 4px rgba(148,163,184,0.5)); }
.map-section.extinction  .map-section-header .rule      { background: linear-gradient(90deg, rgba(148,163,184,0.25), transparent); }
.map-section.ragnarok    .map-section-header .map-glyph { color: #f97316; filter: drop-shadow(0 0 4px rgba(249,115,22,0.6)); }
.map-section.ragnarok    .map-section-header .rule      { background: linear-gradient(90deg, rgba(249,115,22,0.25), transparent); }

.boss-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
@media (max-width: 980px) { .boss-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px) { .boss-grid { grid-template-columns: 1fr; } }

/* ═════════════════════════════════════════════════════════════════════════
   BOSS CARD
   ═════════════════════════════════════════════════════════════════════════ */
.boss-card {
    --boss-rgb: 239,68,68;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 16px 18px 14px 20px;
    cursor: pointer;
    transition: transform 0.22s ease, filter 0.25s ease;
    filter: drop-shadow(0 0 1px rgba(var(--boss-rgb), 0.30)) drop-shadow(0 8px 22px rgba(0,0,0,0.40));
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    display: block;
    border: none;
    font-family: inherit;
    text-align: left;
    width: 100%;
}
.boss-card:hover {
    transform: translateY(-2px);
    filter: drop-shadow(0 0 2px rgba(var(--boss-rgb), 0.75)) drop-shadow(0 12px 30px rgba(0,0,0,0.55));
}
.boss-card::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: rgb(var(--boss-rgb));
    box-shadow: 0 0 6px rgba(var(--boss-rgb), 0.7);
}

/* Per-boss colors */
.boss-card.brood     { --boss-rgb: 34,197,94;   }
.boss-card.mega      { --boss-rgb: 139,92,246;  }
.boss-card.dragon    { --boss-rgb: 239,68,68;   }
.boss-card.overseer  { --boss-rgb: 148,163,184; }
.boss-card.manticore { --boss-rgb: 245,158,11;  }
.boss-card.rockwell  { --boss-rgb: 217,70,239;  }
.boss-card.forest    { --boss-rgb: 34,197,94;   }
.boss-card.desert    { --boss-rgb: 245,158,11;  }
.boss-card.ice       { --boss-rgb: 6,182,212;   }
.boss-card.king      { --boss-rgb: 239,68,68;   }
.boss-card.lava      { --boss-rgb: 249,115,22;  }

.boss-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}
.boss-glyph {
    width: 44px;
    height: 50px;
    flex-shrink: 0;
}
.boss-glyph svg { width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(var(--boss-rgb), 0.55)); }
.boss-id { min-width: 0; line-height: 1.2; }
.boss-card-name {
    font-family: var(--tek-display);
    font-size: 0.95rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1.1;
    margin-bottom: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.boss-card-map {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

.boss-diff {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
}
.boss-pip {
    flex: 1;
    text-align: center;
    padding: 5px 4px;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.05);
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
    text-transform: uppercase;
}
.boss-pip.won-bronze  { background: rgba(205,127,50,0.18);  border-color: rgba(205,127,50,0.50);  color: #fbbf24; box-shadow: 0 0 5px rgba(205,127,50,0.30); }
.boss-pip.won-silver  { background: rgba(200,200,210,0.18); border-color: rgba(200,200,210,0.50); color: #f3f4f6; box-shadow: 0 0 5px rgba(200,200,210,0.30); }
.boss-pip.won-gold    { background: rgba(255,215,0,0.18);   border-color: rgba(255,215,0,0.55);   color: #fde047; box-shadow: 0 0 7px rgba(255,215,0,0.40); }
.boss-pip.won-diamond { background: rgba(0,180,255,0.18);   border-color: rgba(0,180,255,0.55);   color: #7dd3fc; box-shadow: 0 0 7px rgba(0,180,255,0.40); }

.boss-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.status-badge.ready    { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.40); color: #86efac; }
.status-badge.partial  { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.40); color: #fcd34d; }
.status-badge.notready { background: rgba(239,68,68,0.12);  border: 1px solid rgba(239,68,68,0.32);  color: #fca5a5; }
.status-badge.complete { background: rgba(0,180,255,0.15);  border: 1px solid rgba(0,180,255,0.50);  color: #7dd3fc; text-shadow: 0 0 6px var(--tek-blue-glow); }
.status-badge .status-pip {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 5px currentColor;
}
.status-badge.partial .status-pip { animation: amber-pulse 1.6s ease-in-out infinite; }
@keyframes amber-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

.boss-extra {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.10em;
    text-transform: uppercase;
}
.boss-extra .time { color: var(--tek-text-dim); font-weight: 600; }

/* Active war room indicator on boss cards */
.boss-warroom-flag {
    position: absolute;
    top: 10px; right: 10px;
    background: rgba(239,68,68,0.20);
    border: 1px solid var(--tek-red);
    color: #fca5a5;
    font-family: var(--tek-mono);
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    padding: 2px 6px;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
    text-transform: uppercase;
    z-index: 3;
    box-shadow: 0 0 6px rgba(239,68,68,0.45);
    animation: amber-pulse 1.6s ease-in-out infinite;
}

/* ═════════════════════════════════════════════════════════════════════════
   BREADCRUMB (boss detail preview)
   ═════════════════════════════════════════════════════════════════════════ */
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    margin-bottom: 18px;
    text-transform: uppercase;
}
.breadcrumb .bc-link {
    color: var(--tek-text-dim);
    text-decoration: none;
    transition: color 0.2s;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    padding: 0;
}
.breadcrumb .bc-link:hover { color: var(--tek-amber); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 8px; }
.breadcrumb .here { color: rgb(var(--boss-rgb, 245,158,11)); font-weight: 700; }

/* ═════════════════════════════════════════════════════════════════════════
   BOSS HERO (boss detail preview)
   ═════════════════════════════════════════════════════════════════════════ */
.boss-hero {
    --boss-rgb: 245,158,11;
    position: relative;
    background:
        radial-gradient(ellipse 70% 60% at 25% 30%, rgba(var(--boss-rgb), 0.18) 0%, transparent 60%),
        linear-gradient(160deg, rgba(20,15,8,0.96) 0%, rgba(8,5,2,0.99) 100%);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    clip-path: polygon(18px 0%, 100% 0%, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0% 100%, 0% 18px);
    padding: 28px 32px 24px 36px;
    margin-bottom: 32px;
    overflow: hidden;
    filter: drop-shadow(0 0 1px rgba(var(--boss-rgb),0.50)) drop-shadow(0 0 50px rgba(var(--boss-rgb),0.10)) drop-shadow(0 22px 60px rgba(0,0,0,0.65));
}
.boss-hero::before {
    content: '';
    position: absolute;
    left: 0; top: 18px; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, rgb(var(--boss-rgb)), #b45309);
    box-shadow: 0 0 10px rgba(var(--boss-rgb),0.7);
    z-index: 2;
}
.boss-hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(180deg, transparent 0 3px, rgba(var(--boss-rgb),0.015) 3px 4px);
    pointer-events: none;
    z-index: 1;
}
.boss-hero-ghost {
    position: absolute;
    bottom: -36px;
    right: -16px;
    font-family: var(--tek-display);
    font-size: 12rem;
    font-weight: 900;
    line-height: 0.85;
    color: rgba(var(--boss-rgb),0.04);
    -webkit-text-stroke: 1px rgba(var(--boss-rgb),0.06);
    letter-spacing: 0.04em;
    user-select: none;
    pointer-events: none;
}
.boss-hero-content {
    position: relative;
    z-index: 3;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 30px;
    align-items: center;
}
@media (max-width: 860px) {
    .boss-hero-content { grid-template-columns: auto 1fr; gap: 18px; }
}
.boss-hero-glyph {
    width: 110px; height: 124px;
    flex-shrink: 0;
}
.boss-hero-glyph svg { width: 100%; height: 100%; filter: drop-shadow(0 0 14px rgba(var(--boss-rgb),0.65)); }

.boss-hero-info { min-width: 0; }
.boss-hero-name {
    font-family: var(--tek-display);
    font-size: clamp(2.2rem, 6vw, 3.2rem);
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #fde68a 60%, rgba(var(--boss-rgb),0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 14px rgba(var(--boss-rgb),0.40));
    text-transform: uppercase;
    margin-bottom: 6px;
}
.boss-hero-meta {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 12px;
}
.boss-hero-meta .map { color: rgb(var(--boss-rgb)); font-weight: 600; }
.boss-hero-quote {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.95rem;
    color: #94a3b8;
    line-height: 1.55;
    max-width: 580px;
    padding-left: 12px;
    border-left: 1px solid rgba(var(--boss-rgb),0.25);
}

/* Difficulty selector */
.diff-select {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex-shrink: 0;
}
.diff-select-label {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 2px;
}
.diff-btn {
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-dim);
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 8px 14px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
    min-width: 110px;
    text-align: center;
}
.diff-btn:hover { color: var(--tek-text); border-color: rgba(var(--boss-rgb),0.40); }
.diff-btn.active {
    background: linear-gradient(135deg, rgba(var(--boss-rgb),0.25) 0%, rgba(var(--boss-rgb),0.10) 100%);
    border-color: rgb(var(--boss-rgb));
    color: #fff;
    text-shadow: 0 0 8px rgba(var(--boss-rgb),0.6);
    filter: drop-shadow(0 0 8px rgba(var(--boss-rgb),0.35));
}
.diff-btn.won::after { content: ' ✓'; color: var(--tek-green); }

/* ═════════════════════════════════════════════════════════════════════════
   SECTION SCAFFOLD
   ═════════════════════════════════════════════════════════════════════════ */
.section { margin-bottom: 36px; }
.section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 0 0 18px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
}
.section-header .pip { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--boss-rgb, 245,158,11)); box-shadow: 0 0 8px rgba(var(--boss-rgb, 245,158,11),0.7); }
.section-header .rule { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(var(--boss-rgb, 245,158,11),0.20), transparent); }
.section-header .action {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    background: none;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
    transition: color 0.18s;
}
.section-header .action:hover { color: rgb(var(--boss-rgb, 245,158,11)); }
.section-header .action .arrow { color: rgb(var(--boss-rgb, 245,158,11)); margin-left: 4px; }

/* ═════════════════════════════════════════════════════════════════════════
   ACTIVE WAR ROOM
   ═════════════════════════════════════════════════════════════════════════ */
.warroom {
    --boss-rgb: 245,158,11;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 22px 26px;
    filter: drop-shadow(0 0 1px rgba(var(--boss-rgb),0.30)) drop-shadow(0 12px 32px rgba(0,0,0,0.5));
}
.warroom::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: rgb(var(--boss-rgb));
    box-shadow: 0 0 7px rgba(var(--boss-rgb),0.7);
}

.warroom-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    flex-wrap: wrap;
}
.warroom-head-info {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
}
.warroom-title {
    font-family: var(--tek-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.warroom-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.diff-chip {
    display: inline-flex;
    align-items: center;
    background: linear-gradient(135deg, rgba(var(--boss-rgb),0.25) 0%, rgba(var(--boss-rgb),0.15) 100%);
    border: 1px solid rgba(var(--boss-rgb),0.55);
    color: #fde68a;
    font-family: var(--tek-display);
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    padding: 3px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.vis-chip {
    display: inline-flex;
    align-items: center;
    background: rgba(16,185,129,0.10);
    border: 1px solid rgba(16,185,129,0.32);
    color: #86efac;
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.warroom-timer-block { text-align: right; }
.warroom-timer-label {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.warroom-timer {
    font-family: var(--tek-display);
    font-size: 1.6rem;
    font-weight: 900;
    color: rgb(var(--boss-rgb));
    text-shadow: 0 0 12px rgba(var(--boss-rgb),0.55);
    font-variant-numeric: tabular-nums;
    line-height: 1;
}
.warroom-scheduled {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
    margin-top: 3px;
}

/* Body grid */
.warroom-body {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 24px;
}
@media (max-width: 980px) { .warroom-body { grid-template-columns: 1fr; } }

/* ═════════════════════════════════════════════════════════════════════════
   READINESS TRACKER
   ═════════════════════════════════════════════════════════════════════════ */
.readiness-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.readiness-section {
    background: linear-gradient(160deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 100%);
    border: 1px solid rgba(255,255,255,0.04);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 12px 16px 12px 18px;
    position: relative;
}
.readiness-section::before {
    content: '';
    position: absolute;
    left: 0; top: 8px; bottom: 0;
    width: 2px;
}
.readiness-section.tames::before       { background: var(--tek-red);   box-shadow: 0 0 5px rgba(239,68,68,0.55);  }
.readiness-section.saddles::before     { background: var(--tek-amber); box-shadow: 0 0 5px rgba(245,158,11,0.55); }
.readiness-section.gear::before        { background: var(--tek-blue);  box-shadow: 0 0 5px var(--tek-blue-glow); }
.readiness-section.consumables::before { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.55); }
.readiness-section.tributes::before    { background: var(--tek-purple);box-shadow: 0 0 5px rgba(139,92,246,0.55); }

.readiness-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}
.readiness-header .icon-wrap {
    display: inline-flex;
    align-items: center;
    gap: 9px;
}
.readiness-header .icon-wrap :global(svg) {
    width: 14px; height: 14px;
}
.readiness-section.tames .icon-wrap :global(svg)     { color: #fca5a5; filter: drop-shadow(0 0 3px rgba(239,68,68,0.5)); }
.readiness-section.saddles .icon-wrap :global(svg)   { color: #fcd34d; filter: drop-shadow(0 0 3px rgba(245,158,11,0.5)); }
.readiness-section.gear .icon-wrap :global(svg)      { color: #7dd3fc; filter: drop-shadow(0 0 3px var(--tek-blue-glow)); }
.readiness-section.consumables .icon-wrap :global(svg) { color: #86efac; filter: drop-shadow(0 0 3px rgba(16,185,129,0.5)); }
.readiness-section.tributes .icon-wrap :global(svg)  { color: #c4b5fd; filter: drop-shadow(0 0 3px rgba(139,92,246,0.5)); }

.readiness-header .title {
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.readiness-status {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 3px 8px;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.readiness-status.ready   { background: rgba(16,185,129,0.15); color: #86efac; border: 1px solid rgba(16,185,129,0.40); }
.readiness-status.partial { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.40); }
.readiness-status.missing { background: rgba(239,68,68,0.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.32);  }

.readiness-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    align-items: center;
    padding: 4px 0;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text);
    line-height: 1.4;
}
.readiness-row .name { color: var(--tek-text); }
.readiness-row .name .sub { color: var(--tek-text-faint); font-size: 0.62rem; margin-left: 4px; }
.readiness-row .qty {
    font-family: var(--tek-display);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--tek-text);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
}
.readiness-row .qty .req { color: var(--tek-text-faint); font-size: 0.68rem; }
.readiness-row .qty .cur.met { color: var(--tek-green); text-shadow: 0 0 5px rgba(16,185,129,0.45); }
.readiness-row .qty .cur.gap { color: var(--tek-amber); text-shadow: 0 0 5px rgba(245,158,11,0.45); }
.readiness-row .qty .cur.missing { color: var(--tek-red); text-shadow: 0 0 5px rgba(239,68,68,0.45); }
.readiness-row .check {
    width: 14px; height: 14px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tek-mono);
    font-weight: 800;
}
.readiness-row .check.ok      { color: var(--tek-green); text-shadow: 0 0 5px rgba(16,185,129,0.45); }
.readiness-row .check.gap     { color: var(--tek-amber); text-shadow: 0 0 5px rgba(245,158,11,0.45); }
.readiness-row .check.missing { color: var(--tek-red); text-shadow: 0 0 5px rgba(239,68,68,0.45); }

.readiness-bar {
    height: 4px;
    background: rgba(0,0,0,0.45);
    margin-top: 8px;
    position: relative;
    overflow: hidden;
    clip-path: polygon(2px 0%, 100% 0%, calc(100% - 2px) 100%, 0% 100%);
}
.readiness-bar-fill {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    background: linear-gradient(90deg, var(--tek-red), var(--tek-amber), var(--tek-green));
    box-shadow: 0 0 6px rgba(245,158,11,0.45);
}

/* ═════════════════════════════════════════════════════════════════════════
   SQUAD + INVITE
   ═════════════════════════════════════════════════════════════════════════ */
.squad-block {
    background: linear-gradient(160deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 100%);
    border: 1px solid rgba(255,255,255,0.04);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 14px 16px;
    margin-bottom: 14px;
}
.squad-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.squad-head .count { color: rgb(var(--boss-rgb, 245,158,11)); text-shadow: 0 0 5px rgba(var(--boss-rgb, 245,158,11),0.5); }
.squad-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 5px;
    margin-bottom: 10px;
}
.squad-slot {
    aspect-ratio: 1 / 1.1;
    background: rgba(0,0,0,0.30);
    border: 1px solid rgba(255,255,255,0.05);
    clip-path: polygon(5px 0%, 100% 0%, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0% 100%, 0% 5px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    font-family: var(--tek-display);
}
.squad-slot.filled {
    background: linear-gradient(160deg, rgba(0,180,255,0.20) 0%, rgba(4,8,20,0.92) 100%);
    border-color: rgba(0,180,255,0.40);
}
.squad-slot.filled .initial { font-size: 0.92rem; font-weight: 800; color: #7dd3fc; }
.squad-slot.empty {
    border-style: dashed;
    color: var(--tek-text-faint);
    font-size: 1.4rem;
}
.squad-slot.empty:hover { border-color: rgba(0,180,255,0.40); color: var(--tek-blue); }
.squad-slot .pip {
    position: absolute;
    bottom: 3px; right: 3px;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 4px rgba(16,185,129,0.7);
}
.invite-btn {
    width: 100%;
    background: rgba(0,180,255,0.06);
    border: 1px solid rgba(0,180,255,0.30);
    color: #7dd3fc;
    font-family: inherit;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 8px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
}
.invite-btn:hover {
    background: rgba(0,180,255,0.18);
    filter: drop-shadow(0 0 8px var(--tek-blue-glow));
}

/* ═════════════════════════════════════════════════════════════════════════
   CHAT PANEL
   ═════════════════════════════════════════════════════════════════════════ */
.chat-block {
    background: linear-gradient(160deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.20) 100%);
    border: 1px solid rgba(255,255,255,0.04);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    height: 460px;
}
.chat-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.chat-head .live-pip {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.7);
    margin-left: 6px;
    animation: amber-pulse 1.8s ease-in-out infinite;
}
.chat-messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,180,255,0.3) transparent;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }
.chat-msg {
    display: grid;
    grid-template-columns: 26px 1fr;
    gap: 9px;
}
.chat-avatar {
    width: 26px; height: 26px;
    flex-shrink: 0;
}
.chat-avatar :global(svg) { width: 100%; height: 100%; }
.chat-body { min-width: 0; line-height: 1.4; }
.chat-meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
}
.chat-meta .who    { color: #fcd34d; font-weight: 700; }
.chat-meta .who.alpha { color: #ffd700; text-shadow: 0 0 5px rgba(255,215,0,0.5); }
.chat-meta .who.officer { color: #7dd3fc; }
.chat-meta .time   { color: var(--tek-text-faint); }
.chat-text {
    font-size: 0.84rem;
    color: var(--tek-text);
    line-height: 1.5;
    word-wrap: break-word;
}
.chat-text :global(.mention) { color: #7dd3fc; font-weight: 600; }
.chat-text :global(.commit)  { color: #86efac; }

.chat-msg.system .chat-text {
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-style: italic;
    letter-spacing: 0.04em;
}
.chat-msg.system .chat-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--tek-text-faint);
}

.chat-input-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.chat-input {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 9px 12px;
    font-family: inherit;
    font-size: 0.82rem;
    outline: none;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.chat-input::placeholder { color: var(--tek-text-faint); }
.chat-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); }
.chat-send {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    font-family: inherit;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 14px;
    border: none;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    filter: drop-shadow(0 0 6px rgba(0,180,255,0.4));
    transition: filter 0.18s;
}
.chat-send:hover { filter: drop-shadow(0 0 12px rgba(0,180,255,0.7)); }
.chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

/* ═════════════════════════════════════════════════════════════════════════
   CREATURE CARDS COMMITTED
   ═════════════════════════════════════════════════════════════════════════ */
.creatures-block { margin-top: 14px; }
.creatures-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
}
.creature-card {
    --cat-rgb: 239,68,68;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 9px 11px 9px 13px;
    cursor: pointer;
    transition: all 0.18s;
    filter: drop-shadow(0 0 1px rgba(var(--cat-rgb),0.25));
    border: none;
    font-family: inherit;
    color: inherit;
    text-align: left;
    width: 100%;
}
.creature-card:hover {
    transform: translateY(-2px);
    filter: drop-shadow(0 0 2px rgba(var(--cat-rgb),0.60)) drop-shadow(0 6px 14px rgba(0,0,0,0.45));
}
.creature-card::before {
    content: '';
    position: absolute;
    left: 0; top: 8px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 4px rgba(var(--cat-rgb), 0.55);
}
.creature-card.combat { --cat-rgb: 239,68,68; }
.creature-card.flyer  { --cat-rgb: 6,182,212; }
.creature-card.mount  { --cat-rgb: 249,115,22; }
.creature-species {
    font-family: var(--tek-display);
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 3px;
}
.creature-nick {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-bottom: 5px;
}
.creature-stats {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-family: var(--tek-mono);
}
.creature-lvl {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 900;
    background: linear-gradient(135deg, #00d4ff, #c084fc);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
.creature-owner {
    font-size: 0.56rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

.creature-add {
    background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
    border: 1.5px dashed rgba(0,180,255,0.30);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 70px;
    font-family: inherit;
    color: inherit;
}
.creature-add:hover {
    background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(4,8,20,0.55) 100%);
    border-color: rgba(0,180,255,0.60);
}
.creature-add-glyph {
    font-family: var(--tek-display);
    font-size: 1.4rem;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 8px var(--tek-blue-glow));
    line-height: 1;
}
.creature-add-label {
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

.war-remove {
    position: absolute;
    top: 6px; right: 6px;
    width: 18px; height: 18px;
    border-radius: 50%;
    background: rgba(239,68,68,0.15);
    border: none;
    color: #f87171;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    line-height: 1;
}

/* ═════════════════════════════════════════════════════════════════════════
   Modal overlay
   ═════════════════════════════════════════════════════════════════════════ */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(2,4,10,0.78);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 80;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 40px 16px;
}
.modal-stage {
    position: relative;
    z-index: 81;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
}
.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 24px;
    flex-wrap: wrap;
}

/* ═════════════════════════════════════════════════════════════════════════
   FOOTER
   ═════════════════════════════════════════════════════════════════════════ */
.bottom-note {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    white-space: nowrap;
    z-index: 4;
}

@media (max-width: 720px) {
    .stage { padding: 60px 14px 80px; }
    .boss-hero-content { grid-template-columns: 1fr; gap: 18px; }
    .boss-hero-glyph { width: 88px; height: 100px; }
    .warroom { padding: 18px 18px; }
}
</style>
