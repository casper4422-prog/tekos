<script lang="ts">
	import { Sword, Users, Plus, LogIn, ChevronDown } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Boss = { id:string; name:string; map:string; difficulties:string[]; description:string; tribute?:string };
	type Session = Record<string,unknown>;

	// Full ASA boss list — verified from ark.wiki.gg, Deltia's Gaming, Sportskeeda
	const BOSSES: Boss[] = [
		// ── The Island ────────────────────────────────────────────────────────
		{ id:'broodmother', name:'Broodmother Lysrix', map:'The Island', difficulties:['gamma','beta','alpha'],
		  description:'A massive spider guarding the Island. Summons hordes of Araneo and Meganeura. Fought in a cavern arena reached via obelisk tribute.',
		  tribute:'Megapithecus Trophy, Broodmother Trophy, or gather beetle chitin offerings' },
		{ id:'megapithecus', name:'Megapithecus', map:'The Island', difficulties:['gamma','beta','alpha'],
		  description:'A colossal gorilla that hurls boulders and summons Gigantopithecus and Mesopithecus to overwhelm survivors. Fought on a floating arena.',
		  tribute:'Sauropod Vertebra, Argentavis Talon, Tyrannosaurus Arm, and others' },
		{ id:'dragon', name:'Dragon', map:'The Island', difficulties:['gamma','beta','alpha'],
		  description:'The apex boss of the Island. Breathes devastating fire, flies above the arena, and transitions between phases. Immune to fire damage.',
		  tribute:'Dragon Trophy, Wyvern Trophy, or Dragon offerings' },
		{ id:'overseer', name:'Overseer', map:'The Island', difficulties:['gamma','beta','alpha'],
		  description:'The final boss of The Island, an AI construct that shifts between combat drone forms. Only reachable after defeating all three main Island bosses.',
		  tribute:'Defeat Broodmother, Megapithecus, and Dragon first' },

		// ── Scorched Earth ────────────────────────────────────────────────────
		{ id:'manticore', name:'Manticore', map:'Scorched Earth', difficulties:['gamma','beta','alpha'],
		  description:'A winged lion-scorpion hybrid. Alternates between flying and landing phases. Primary boss of the desert ARK. Also appears on Ragnarok.',
		  tribute:'Argentavis Talon, Sauropod Vertebra, Tusoteuthis Tentacle, and others' },

		// ── Aberration ────────────────────────────────────────────────────────
		{ id:'rockwell', name:'Rockwell', map:'Aberration', difficulties:['gamma','beta','alpha'],
		  description:'Sir Edmund Rockwell, transformed by Element into a massive tentacled horror. Fought in the depths of Aberration. Attacks with Element surges and tentacle slams.',
		  tribute:'Karkinos Claw, Basilisk Scale, Reaper Queen Pheromone Gland, and others' },

		// ── Extinction ────────────────────────────────────────────────────────
		{ id:'forest_titan', name:'Forest Titan', map:'Extinction', difficulties:['gamma'],
		  description:'A colossal titan overgrown with vegetation. Must be tamed rather than killed. Found in the forest biome of the Wasteland.',
		  tribute:'No tribute — locate and fight in the field' },
		{ id:'ice_titan', name:'Ice Titan', map:'Extinction', difficulties:['gamma'],
		  description:'An arctic titan encased in ice and frozen corruption. Found in the snow biome. Its back is covered in weak corruption nodes.',
		  tribute:'No tribute — locate and fight in the field' },
		{ id:'desert_titan', name:'Desert Titan', map:'Extinction', difficulties:['gamma'],
		  description:'A massive flying titan that rains lightning from above. Found in the desert biome. Can be tamed and flown as a platform.',
		  tribute:'No tribute — locate and fight in the field' },
		{ id:'king_titan', name:'King Titan', map:'Extinction', difficulties:['gamma','beta','alpha'],
		  description:'The supreme boss of Extinction and the canonical final threat. Three tiers exist. Alpha requires all three other Titans to have been tamed first.',
		  tribute:'Corrupt Heart x1 per tier, obtained from defeating or taming the three other Titans' },

		// ── Genesis: Part 1 ───────────────────────────────────────────────────
		{ id:'moeder', name:'Moeder, Master of the Ocean', map:'Genesis: Part 1', difficulties:['gamma','beta','alpha'],
		  description:'A colossal tentacled deep-sea creature. Fought underwater in a glowing arena. Spawns Electrophorus to drain your oxygen during the fight.',
		  tribute:'HLN-A missions in the Ocean biome' },
		{ id:'master_controller', name:'Corrupted Master Controller', map:'Genesis: Part 1', difficulties:['gamma','beta','alpha'],
		  description:'An AI construct controlling the Genesis simulation. Multiple phases including holographic projections of previous survivors.',
		  tribute:'Complete all HLN-A mission sets' },

		// ── Genesis: Part 2 ───────────────────────────────────────────────────
		{ id:'rockwell_prime', name:'Rockwell Prime', map:'Genesis: Part 2', difficulties:['gamma','beta','alpha'],
		  description:'Rockwell at full power after escaping Aberration, now bonded to the Genesis Ship. Multi-phase fight across the ship interior.',
		  tribute:'Complete Rockwell Prime mission set' },

		// ── The Center ────────────────────────────────────────────────────────
		{ id:'center_broodmother', name:'Broodmother Lysrix', map:'The Center', difficulties:['gamma','beta','alpha'],
		  description:'The Center variant of the Broodmother. Identical mechanics to the Island version, accessed via the Center obelisk system.',
		  tribute:'Same as Island Broodmother' },
		{ id:'center_megapithecus', name:'Megapithecus', map:'The Center', difficulties:['gamma','beta','alpha'],
		  description:'The Center variant of the Megapithecus. Identical mechanics, accessed via obelisk.',
		  tribute:'Same as Island Megapithecus' },
		{ id:'center_dragon', name:'Dragon', map:'The Center', difficulties:['gamma','beta','alpha'],
		  description:'The Center variant of the Dragon. Identical mechanics, accessed via obelisk.',
		  tribute:'Same as Island Dragon' },

		// ── Ragnarok ──────────────────────────────────────────────────────────
		{ id:'ragnarok_dragon_manticore', name:'Dragon & Manticore', map:'Ragnarok', difficulties:['gamma','beta','alpha'],
		  description:'A combined encounter unique to Ragnarok. The Dragon and Manticore fight simultaneously in a desert arena, requiring tribes to split attention.',
		  tribute:'Wyvern Milk, Sauropod Vertebra, Argentavis Talon, and others' },

		// ── Crystal Isles ─────────────────────────────────────────────────────
		{ id:'crystal_wyvern_queen', name:'Crystal Wyvern Queen', map:'Crystal Isles', difficulties:['gamma','beta','alpha'],
		  description:'The apex boss of Crystal Isles. A massive Crystal Wyvern that commands a swarm of smaller Wyverns. Fought in a cavern throne room.',
		  tribute:'Crystal Talon, Wyvern Milk, and Crystal Isles specific items' },

		// ── Valguero ──────────────────────────────────────────────────────────
		{ id:'val_broodmother', name:'Broodmother Lysrix', map:'Valguero', difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant accessed through the Aberration-themed underground areas. Same mechanics as the Island version.',
		  tribute:'Same tribute as Island Broodmother' },
		{ id:'val_megapithecus', name:'Megapithecus', map:'Valguero', difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant. Identical to Island version.',
		  tribute:'Same as Island Megapithecus' },
		{ id:'val_dragon', name:'Dragon', map:'Valguero', difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant. Identical to Island version.',
		  tribute:'Same as Island Dragon' },

		// ── Lost Island ───────────────────────────────────────────────────────
		{ id:'dinopithecus_king', name:'Dinopithecus King', map:'Lost Island', difficulties:['gamma','beta','alpha'],
		  description:'A primal boss that leads a troop of Dinopithecus. Throws bombs, uses environment, and is assisted by its pack throughout the fight.',
		  tribute:'Dinopithecus King Trophy and specific Lost Island items' },

		// ── Fjordur ───────────────────────────────────────────────────────────
		{ id:'fenrisulfr', name:'Fenrisúlfr', map:'Fjordur', difficulties:['gamma','beta','alpha'],
		  description:'A colossal wolf of Norse mythology. The primary boss of Fjordur, fought in a frozen tundra arena. Deadly cold aura and pack summons.',
		  tribute:'Runestones gathered from Fjordur\'s three sub-realms' },
		{ id:'beyla', name:'Beyla', map:'Fjordur', difficulties:['gamma','beta','alpha'],
		  description:'A giant bee boss guarding the Vanaheim realm. Spawns bee swarms and leaves toxic honey traps across the arena.',
		  tribute:'Runestones from Fjordur sub-realms' },
		{ id:'steinbjorn', name:'Steinbjorn', map:'Fjordur', difficulties:['gamma','beta','alpha'],
		  description:'A massive stone bear guardian, one of the three Fjordur realm bosses. Extremely tanky with ground-shake attacks.',
		  tribute:'Runestones from Fjordur sub-realms' },

		// ── Astraeos (ASA, Feb 2025) ──────────────────────────────────────────
		{ id:'hydraskos', name:'Hydraskos the Unbroken', map:'Astraeos', difficulties:['gamma','beta','alpha'],
		  description:'A multi-headed Hydra-inspired boss. Each head targets survivors independently. Defeating the boss is a feat of coordination and target priority.',
		  tribute:'Astraeos-specific offerings' },
		{ id:'natrix', name:'Natrix the Gorgon', map:'Astraeos', difficulties:['gamma','beta','alpha'],
		  description:'A Gorgon-themed boss drawing from Greek mythology. Features petrification mechanics that can stone survivors mid-fight.',
		  tribute:'Astraeos-specific offerings' },
		{ id:'thodes', name:'Thodes the Cyclops', map:'Astraeos', difficulties:['gamma','beta','alpha'],
		  description:'A massive Cyclops boss with a single devastating eye attack. Survivors must attack the eye during phases of vulnerability.',
		  tribute:'Astraeos-specific offerings' },
		{ id:'thanatos', name:'Thanatos the Destroyer', map:'Astraeos', difficulties:['gamma','beta','alpha'],
		  description:'The pinnacle boss of Astraeos, named for the Greek god of death. Inspired by the King Titan in scale and threat level.',
		  tribute:'Defeat Hydraskos, Natrix, and Thodes first' },
		{ id:'pulmonoscorpius_monarch', name:'Pulmonoscorpius Monarch', map:'Astraeos', difficulties:['gamma'],
		  description:'An oversized scorpion miniboss native to Astraeos caves. A dangerous encounter before tackling the major Astraeos bosses.',
		  tribute:'No tribute — found in cave systems' },

		// ── Lost Colony (ASA DLC) ─────────────────────────────────────────────
		{ id:'lost_king', name:'Lost King', map:'Lost Colony', difficulties:['gamma','beta','alpha'],
		  description:'The main antagonist of Lost Colony, riding a personal Gigadesmodus into battle. A multi-phase dungeon encounter inside the Red Palace. Dropping him unlocks the Queen fight.',
		  tribute:'Altar outside the Red Palace dungeon entrance' },
		{ id:'lost_queen', name:'Lost Queen', map:'Lost Colony', difficulties:['gamma','beta','alpha'],
		  description:'Revealed to be Mei Yin Li, transformed into the Lost Queen after Lost King\'s defeat. Multi-phase fight with a beam mechanic requiring the tribe to break her healing channel.',
		  tribute:'Automatically triggered after defeating the Lost King' },
	];

	const sessions = data.sessions as Session[];
	const records  = data.records as Record<string,unknown>[];

	let creating   = $state<Boss|null>(null);
	let detailBoss = $state<Boss|null>(null);
	let difficulty = $state('alpha');
	let joinCode   = $state('');
	let saving     = $state(false);
	let mapFilter  = $state('all');

	const MAPS = ['all', ...new Set(BOSSES.map(b => b.map))];

	function getFiltered() {
		return mapFilter === 'all' ? BOSSES : BOSSES.filter(b => b.map === mapFilter);
	}

	// Group bosses by map for display
	function grouped() {
		const result: Record<string, Boss[]> = {};
		for (const b of getFiltered()) {
			(result[b.map] = result[b.map] ?? []).push(b);
		}
		return Object.entries(result);
	}

	async function createSession() {
		if (!creating) return;
		saving = true;
		const res = await fetch('/api/arena/sessions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossId:creating.id, bossName:creating.name, difficulty }) });
		if (res.ok) { const s = await res.json(); goto(`/overseer/${s.id}`); }
		else { saving = false; }
	}

	async function joinSession() {
		if (!joinCode.trim()) return;
		const res = await fetch('/api/arena/sessions/join', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ joinCode:joinCode.toUpperCase() }) });
		if (res.ok) { const s = await res.json(); goto(`/overseer/${s.sessionId}`); }
		else alert('Session not found.');
	}

	function openBoss(b: Boss) { detailBoss = b; difficulty = 'alpha'; }
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Overseer</h1>
			<div class="page-subtitle">{BOSSES.length} bosses across {MAPS.length - 1} maps</div>
		</div>
	</div>

	<!-- Join + filter row -->
	<div class="ov-top-row">
		<div class="ov-join-row">
			<input class="form-control" style="max-width:160px;text-transform:uppercase;letter-spacing:0.1em" placeholder="Join Code" bind:value={joinCode} maxlength={6} />
			<button class="btn btn-secondary btn-sm" onclick={joinSession}><LogIn size={13} /> Join Room</button>
		</div>
		<div class="ov-map-filters">
			{#each MAPS as m}
				<button class="ov-map-btn" class:active={mapFilter===m} onclick={() => mapFilter=m}>{m === 'all' ? 'All Maps' : m}</button>
			{/each}
		</div>
	</div>

	<!-- Open war rooms -->
	{#if sessions.length > 0}
		<div class="ov-section-title">Open War Rooms</div>
		<div class="ov-sessions">
			{#each sessions as s}
				{@const sd = s as Record<string,unknown>}
				<a class="cham-shell ov-session" href="/overseer/{sd.id}" style="--cut:7px">
					<div class="ov-session-inner">
						<div class="ov-session-info">
							<div class="ov-session-boss">{String(sd.bossName)}</div>
							<div class="ov-session-meta">{String(sd.difficulty).toUpperCase()} · Code: <strong>{String(sd.joinCode)}</strong> · {(sd.memberCount as number)} in room</div>
						</div>
						<span class="btn btn-primary btn-sm"><Users size={13} /> Join</span>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Boss list grouped by map -->
	{#each grouped() as [mapName, bosses]}
		<div class="ov-section-title">{mapName}</div>
		<div class="ov-boss-grid">
			{#each bosses as b}
				<button class="cham-shell ov-boss-card" onclick={() => openBoss(b)} style="--cut:9px">
					<div class="ov-boss-inner">
						<div class="ov-boss-name">{b.name}</div>
						<div class="ov-boss-diffs">
							{#each b.difficulties as d}
								<span class="ov-diff-chip {d}">{d.charAt(0).toUpperCase()}</span>
							{/each}
						</div>
						<div class="ov-boss-hint">Click for details &amp; war room</div>
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
				<div class="cham-shell ov-record" style="--cut:5px;--cat-rgb:{rd.outcome==='success' ? '34,197,94' : '239,68,68'}">
					<div class="ov-record-inner">
						<div class="ov-record-boss">{String(rd.bossName)}</div>
						<div class="ov-record-meta">{String(rd.difficulty ?? '').toUpperCase()}{rd.mapName ? ` · ${String(rd.mapName)}` : ''}</div>
						<div class="ov-record-outcome" class:win={rd.outcome==='success'}>{rd.outcome === 'success' ? 'Victory' : 'Defeat'}</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Boss detail + war room modal -->
{#if detailBoss}
{@const b = detailBoss}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:520px">
		<div class="modal-header">
			<h2 class="modal-title">{b.name}</h2>
			<button class="close-btn" onclick={() => detailBoss=null}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
			<div class="ov-detail-map">{b.map}</div>
			<p class="ov-detail-desc">{b.description}</p>
			{#if b.tribute}
				<div class="ov-detail-tribute"><strong>Tribute / Access:</strong> {b.tribute}</div>
			{/if}
			<div class="plan-field">
				<label class="form-label">Difficulty</label>
				<div class="ov-diff-row">
					{#each b.difficulties as d}
						<button class="ov-diff-full-btn {d}" class:selected={difficulty===d} onclick={() => difficulty=d}>
							{d.charAt(0).toUpperCase() + d.slice(1)}
						</button>
					{/each}
				</div>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => detailBoss=null}>Close</button>
			<button class="btn btn-primary" onclick={() => { creating = b; detailBoss = null; createSession(); }} disabled={saving}>
				<Sword size={14} /> {saving ? 'Creating...' : 'Launch War Room'}
			</button>
		</div>
	</div>
</div>
{/if}

<style>
.ov-top-row { display:flex; gap:16px; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; }
.ov-join-row { display:flex; gap:8px; align-items:center; }
.ov-map-filters { display:flex; gap:5px; flex-wrap:wrap; }
.ov-map-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:#64748b; font-size:0.72rem; padding:4px 10px; cursor:pointer; font-family:inherit; transition:all .15s; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.ov-map-btn:hover { background:rgba(255,255,255,0.08); color:#94a3b8; }
.ov-map-btn.active { background:rgba(0,180,255,0.12); color:#7dd3fc; border-color:rgba(0,180,255,0.35); }

.ov-section-title { font-size:0.62rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#334155; margin:20px 0 10px; display:flex; align-items:center; gap:10px; }
.ov-section-title::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.04); }

.ov-sessions { display:flex; flex-direction:column; gap:5px; margin-bottom:20px; }
.ov-session { display:block; text-decoration:none; color:inherit; }
.ov-session-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 16px; display:flex; align-items:center; gap:12px; }
.ov-session-info { flex:1; }
.ov-session-boss { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.ov-session-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }

.ov-boss-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:8px; margin-bottom:8px; }
.ov-boss-card { text-align:left; background:none; border:none; cursor:pointer; width:100%; }
.ov-boss-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; flex-direction:column; gap:6px; transition:background .15s; }
.ov-boss-card:hover .ov-boss-inner { background:rgba(14,26,54,0.98); }
.ov-boss-name { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.ov-boss-diffs { display:flex; gap:5px; }
.ov-diff-chip { font-size:0.65rem; font-weight:800; width:20px; height:20px; display:flex; align-items:center; justify-content:center; border-radius:50%; }
.ov-diff-chip.gamma { background:rgba(34,197,94,0.15); color:#4ade80; }
.ov-diff-chip.beta  { background:rgba(59,130,246,0.15); color:#60a5fa; }
.ov-diff-chip.alpha { background:rgba(239,68,68,0.15);  color:#f87171; }
.ov-boss-hint { font-size:0.65rem; color:#334155; }

.ov-records { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:7px; }
.ov-record-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; }
.ov-record-boss { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.ov-record-meta { font-size:0.68rem; color:#475569; }
.ov-record-outcome { font-size:0.68rem; font-weight:700; color:#ef4444; }
.ov-record-outcome.win { color:#4ade80; }

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
.ov-diff-full-btn.selected.gamma { background:rgba(34,197,94,0.25); box-shadow:0 0 8px rgba(34,197,94,0.3); }
.ov-diff-full-btn.selected.beta  { background:rgba(59,130,246,0.25); box-shadow:0 0 8px rgba(59,130,246,0.3); }
.ov-diff-full-btn.selected.alpha { background:rgba(239,68,68,0.25);  box-shadow:0 0 8px rgba(239,68,68,0.3); }
</style>
