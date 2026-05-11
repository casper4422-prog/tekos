<script lang="ts">
	import { Sword, Users, Plus, LogIn, ChevronDown } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Boss = { id:string; name:string; map:string; difficulties:string[]; description:string; tribute?:string };
	type Session = Record<string,unknown>;

	// ASA boss list — official maps only. Verified against ASA wiki & release notes.
	// Removed: Fjordur (not in ASA, delayed 2026-2027), Crystal Isles (not yet), Lost Island (not yet).
	// Svartalfheim = ASA mod by Nekatus, listed separately.
	const BOSSES: Boss[] = [
		// ── The Island (ASA) ─────────────────────────────────────────────────
		{ id:'broodmother', name:'Broodmother Lysrix', map:'The Island',
		  difficulties:['gamma','beta','alpha'],
		  description:'A massive spider guarding the Island. Summons hordes of Araneo and Meganeura. Fought in a cavern arena reached via obelisk tribute.',
		  tribute:'Sarcosuchus Skin, Sauropod Vertebra, Argentavis Talon, Megalodon Fin, Thylacoleo Hook-Claw' },
		{ id:'megapithecus', name:'Megapithecus', map:'The Island',
		  difficulties:['gamma','beta','alpha'],
		  description:'A colossal gorilla that hurls boulders and summons Gigantopithecus and Mesopithecus to overwhelm survivors. Fought on a floating arena.',
		  tribute:'Argentavis Talon, Megalodon Fin, Sauropod Vertebra, Tyrannosaurus Arm, Woolly Rhino Horn' },
		{ id:'dragon', name:'Dragon', map:'The Island',
		  difficulties:['gamma','beta','alpha'],
		  description:'The apex boss of the Island. Breathes devastating fire, immune to fire damage. Requires Megalania Toxin in tribute. Melee-focused tribes must bring fire-immune creatures.',
		  tribute:'Argentavis Talon, Sauropod Vertebra, Sarcosuchus Skin, Megalania Toxin, Titanoboa Venom' },
		{ id:'overseer', name:'Overseer', map:'The Island',
		  difficulties:['gamma','beta','alpha'],
		  description:'The final boss of The Island. An AI construct that shifts between Broodmother, Megapithecus, and Dragon drone forms. Only reachable via the Tek Cave after defeating all three Island guardians.',
		  tribute:'Defeat Broodmother, Megapithecus, and Dragon first — then traverse the Tek Cave' },

		// ── Scorched Earth (ASA) ─────────────────────────────────────────────
		{ id:'manticore', name:'Manticore', map:'Scorched Earth',
		  difficulties:['gamma','beta','alpha'],
		  description:'A winged lion-scorpion hybrid that alternates between a flying phase (immune to most attacks) and a landing phase. Its tail injects torpor. Primary boss of the desert ARK.',
		  tribute:'Argentavis Talon, Sauropod Vertebra, Tusoteuthis Tentacle, Deathworm Horn, Onychonycteris Talon' },

		// ── Aberration (ASA) ─────────────────────────────────────────────────
		{ id:'rockwell', name:'Rockwell', map:'Aberration',
		  difficulties:['gamma','beta','alpha'],
		  description:'Sir Edmund Rockwell, transformed by Element into a massive tentacled horror anchored to the ARK\'s core. Attacks with Element surges, tentacle slams, and radiation bursts. Cannot use flyers.',
		  tribute:'Karkinos Claw, Basilisk Scale, Reaper Queen Pheromone Gland, Nameless Venom, Charge Battery' },

		// ── Extinction (ASA) ─────────────────────────────────────────────────
		{ id:'forest_titan', name:'Forest Titan', map:'Extinction',
		  difficulties:['gamma'],
		  description:'A colossal titan overgrown with corrupted vegetation. Found roaming the Wasteland forest biome. Cannot be killed — must be tamed by destroying corruption nodes on its body.',
		  tribute:'No tribute — locate and fight in the open world' },
		{ id:'ice_titan', name:'Ice Titan', map:'Extinction',
		  difficulties:['gamma'],
		  description:'An arctic titan encased in frozen corruption. Found in the snow biome. Weak points on its back must be struck during stagger windows.',
		  tribute:'No tribute — locate and fight in the open world' },
		{ id:'desert_titan', name:'Desert Titan', map:'Extinction',
		  difficulties:['gamma'],
		  description:'A massive flying titan that rains lightning from above. Found in the desert biome. Can be tamed and used as a massive flying platform that houses survivors and turrets.',
		  tribute:'No tribute — locate and fight in the open world' },
		{ id:'king_titan', name:'King Titan', map:'Extinction',
		  difficulties:['gamma','beta','alpha'],
		  description:'The supreme boss of Extinction and the canonical final threat. Alpha King Titan requires all three other Titans to have been tamed first and brought to the battlefield.',
		  tribute:'Corrupt Heart — obtained by defeating (gamma) or taming the three field Titans' },

		// ── The Center (ASA) ─────────────────────────────────────────────────
		{ id:'center_broodmother', name:'Broodmother Lysrix', map:'The Center',
		  difficulties:['gamma','beta','alpha'],
		  description:'The Center variant of the Broodmother, accessed via the center obelisk system. Identical mechanics to the Island version.',
		  tribute:'Same tribute as Island Broodmother' },
		{ id:'center_megapithecus', name:'Megapithecus', map:'The Center',
		  difficulties:['gamma','beta','alpha'],
		  description:'The Center variant accessed via obelisk. Identical mechanics to Island version.',
		  tribute:'Same tribute as Island Megapithecus' },
		{ id:'center_dragon', name:'Dragon', map:'The Center',
		  difficulties:['gamma','beta','alpha'],
		  description:'The Center variant accessed via obelisk. Identical fire-breathing mechanics to Island version.',
		  tribute:'Same tribute as Island Dragon' },

		// ── Ragnarok (ASA) ───────────────────────────────────────────────────
		{ id:'ragnarok_boss', name:'Dragon & Manticore', map:'Ragnarok',
		  difficulties:['gamma','beta','alpha'],
		  description:'A combined encounter unique to Ragnarok — the Dragon and Manticore fight simultaneously in a highland desert arena. Requires tribes to split their force between two very different threat types.',
		  tribute:'Argentavis Talon, Sauropod Vertebra, Wyvern Milk, Deathworm Horn, Basilisk Scale' },

		// ── Valguero (ASA) ───────────────────────────────────────────────────
		{ id:'val_broodmother', name:'Broodmother Lysrix', map:'Valguero',
		  difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant. Accessed via underground aberrant zones. Identical mechanics to Island Broodmother.',
		  tribute:'Same tribute as Island Broodmother' },
		{ id:'val_megapithecus', name:'Megapithecus', map:'Valguero',
		  difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant. Identical mechanics to Island version.',
		  tribute:'Same tribute as Island Megapithecus' },
		{ id:'val_dragon', name:'Dragon', map:'Valguero',
		  difficulties:['gamma','beta','alpha'],
		  description:'Valguero variant. Identical fire mechanics to Island version.',
		  tribute:'Same tribute as Island Dragon' },

		// ── Genesis: Part 1 (ASA, roadmapped Feb 2025) ───────────────────────
		{ id:'moeder', name:'Moeder, Master of the Ocean', map:'Genesis: Part 1',
		  difficulties:['gamma','beta','alpha'],
		  description:'A colossal Mosasaurus-like creature fought underwater in a glowing oceanic arena. Spawns Electrophorus to drain oxygen. Survivors must avoid tentacles while fighting.',
		  tribute:'Reach required Mission HLN-A score in the Ocean biome' },
		{ id:'master_controller', name:'Corrupted Master Controller', map:'Genesis: Part 1',
		  difficulties:['gamma','beta','alpha'],
		  description:'An AI construct managing the Genesis simulation. Multi-phase fight with holographic projections of past survivors. Final boss of Genesis Part 1.',
		  tribute:'Complete all five HLN-A mission biome sets' },

		// ── Genesis: Part 2 (ASA, roadmapped May 2025) ───────────────────────
		{ id:'rockwell_prime', name:'Rockwell Prime', map:'Genesis: Part 2',
		  difficulties:['gamma','beta','alpha'],
		  description:'Rockwell at full power after merging with the Genesis Ship. Multi-phase fight across the ship interior. The canonical conclusion of the ASA story arc before Lost Colony.',
		  tribute:'Complete Rockwell Prime mission set' },

		// ── Astraeos (ASA mod by Nekatus, Feb 2025) ───────────────────────────
		{ id:'hydraskos', name:'Hydraskos the Unbroken', map:'Astraeos',
		  difficulties:['gamma','beta','alpha'],
		  description:'A Hydra-inspired multi-headed boss. Each head targets survivors independently, requiring coordination in target priority and positioning.',
		  tribute:'Astraeos tribute altar' },
		{ id:'natrix', name:'Natrix the Gorgon', map:'Astraeos',
		  difficulties:['gamma','beta','alpha'],
		  description:'Greek mythology-themed Gorgon boss. Features petrification mechanics that can freeze survivors mid-fight if they look at it directly.',
		  tribute:'Astraeos tribute altar' },
		{ id:'thodes', name:'Thodes the Cyclops', map:'Astraeos',
		  difficulties:['gamma','beta','alpha'],
		  description:'A massive Cyclops boss. Its single eye is both its main attack and its vulnerable point — survivors must strike during brief vulnerability windows.',
		  tribute:'Astraeos tribute altar' },
		{ id:'thanatos', name:'Thanatos the Destroyer', map:'Astraeos',
		  difficulties:['gamma','beta','alpha'],
		  description:'Named for the Greek god of death. The pinnacle boss of Astraeos, requiring all three guardian bosses to be defeated first. Comparable to the King Titan in scale.',
		  tribute:'Defeat Hydraskos, Natrix, and Thodes first' },
		{ id:'pulmonoscorpius_monarch', name:'Pulmonoscorpius Monarch', map:'Astraeos',
		  difficulties:['gamma'],
		  description:'An oversized scorpion miniboss found in Astraeos cave systems. A dangerous but accessible encounter on the way to the main bosses.',
		  tribute:'Found in caves — no tribute required' },

		// ── Lost Colony (ASA DLC) ─────────────────────────────────────────────
		{ id:'lost_king', name:'Lost King', map:'Lost Colony',
		  difficulties:['gamma','beta','alpha'],
		  description:'The main antagonist of Lost Colony, riding his personal Gigadesmodus into battle inside the Red Palace dungeon. Multi-phase encounter with Thrall waves between phases.',
		  tribute:'Altar outside the Red Palace dungeon entrance' },
		{ id:'lost_queen', name:'Lost Queen', map:'Lost Colony',
		  difficulties:['gamma','beta','alpha'],
		  description:'Revealed to be Mei Yin Li, transformed after the Lost King\'s defeat. Multi-phase fight with a healing beam mechanic — the tribe must break the beam to prevent her from regenerating.',
		  tribute:'Automatically triggered after defeating the Lost King' },

		// ── Svartalfheim (ASA mod by Nekatus) ────────────────────────────────
		{ id:'svartalfheim_dinopithecus', name:'Dinopithecus King', map:'Svartalfheim · Mod',
		  difficulties:['alpha'],
		  description:'The custom boss of Svartalfheim, a Norse/Dwarven-themed no-fly mod map by Nekatus. A unique Dinopithecus bossfight tuned for the map\'s no-fly, no-Tek-armour ruleset.',
		  tribute:'Svartalfheim-specific tribute — check mod documentation' },
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
