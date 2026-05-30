<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import PageHeader from '$lib/components/PageHeader.svelte';
	let { data }: { data: PageData } = $props();

	type BossKind = 'killable' | 'tame' | 'world' | 'soon';
	type BossTier = 'gamma' | 'beta' | 'alpha';
	type TributeByTier = Partial<Record<BossTier, string[]>>;
	type Boss = {
		id:string;
		name:string;
		map:string;
		difficulties:string[];
		kind:BossKind;
		description:string;
		/** Per-tier tribute item lists. When omitted, falls back to tributeNotes. */
		tribute?: TributeByTier;
		/** Plain-text tribute description for non-tier bosses or bosses without per-tier breakdown yet. */
		tributeNotes?: string;
		/** ASA arena defaults: 10/10. Field tame / world bosses override with sensible values. */
		maxPlayers?: number;
		maxTames?: number;
	};
	type Session = Record<string,unknown>;
	type ChatMsg = { id:number; content:string; createdAt:string; user:{ nickname:string|null; discordName:string|null; email:string|null } };

	// ASA boss roster verified against ark.wiki.gg (May 2026).
	// kind: 'killable' = standard tier kill, 'tame' = field-tame titan, 'world' = roaming/dungeon boss without tier summon, 'soon' = unreleased map teaser
	// Standard ASA arena defaults: 10 survivors + 10 tames per attempt.
	// Field tames + world bosses use lower caps (smaller field encounters) and the unreleased
	// stubs match the standard while we wait for ports to drop.
	const BOSSES: Boss[] = [
		// ─── The Island (Oct 2023) ───
		{ id:'broodmother', name:'Broodmother Lysrix', map:'The Island', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Spawns Araneo swarms. Megatherium is META — gains a massive damage buff vs insects.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Clever ×1','Artifact of the Hunter ×1','Artifact of the Massive ×1','Sarcosuchus Skin ×5','Sauropod Vertebra ×5','Argentavis Talon ×5','Megalodon Fin ×5','Thylacoleo Hook-Claw ×5'],
			beta:  ['Artifact of the Clever ×1','Artifact of the Hunter ×1','Artifact of the Massive ×1','Sarcosuchus Skin ×10','Sauropod Vertebra ×10','Argentavis Talon ×10','Megalodon Fin ×10','Thylacoleo Hook-Claw ×10'],
			alpha: ['Artifact of the Clever ×1','Artifact of the Hunter ×1','Artifact of the Massive ×1','Sarcosuchus Skin ×15','Sauropod Vertebra ×15','Argentavis Talon ×15','Megalodon Fin ×15','Thylacoleo Hook-Claw ×15']
		  }
		},
		{ id:'megapithecus', name:'Megapithecus', map:'The Island', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Hurls boulders with AoE damage. Spread out to avoid rock wipes.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Brute ×1','Artifact of the Hunter ×1','Artifact of the Pack ×1','Argentavis Talon ×5','Megalodon Fin ×5','Sauropod Vertebra ×5','Tyrannosaurus Arm ×5','Woolly Rhino Horn ×5'],
			beta:  ['Artifact of the Brute ×1','Artifact of the Hunter ×1','Artifact of the Pack ×1','Argentavis Talon ×10','Megalodon Fin ×10','Sauropod Vertebra ×10','Tyrannosaurus Arm ×10','Woolly Rhino Horn ×10'],
			alpha: ['Artifact of the Brute ×1','Artifact of the Hunter ×1','Artifact of the Pack ×1','Argentavis Talon ×15','Megalodon Fin ×15','Sauropod Vertebra ×15','Tyrannosaurus Arm ×15','Woolly Rhino Horn ×15']
		  }
		},
		{ id:'dragon', name:'Dragon', map:'The Island', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Immune to fire. Therizinosaur is META — fire-resistant and high damage.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Massive ×1','Artifact of the Strong ×1','Artifact of the Skylord ×1','Argentavis Talon ×5','Sarcosuchus Skin ×5','Megalania Toxin ×5','Titanoboa Venom ×5','Allosaurus Brain ×5'],
			beta:  ['Artifact of the Massive ×1','Artifact of the Strong ×1','Artifact of the Skylord ×1','Argentavis Talon ×10','Sarcosuchus Skin ×10','Megalania Toxin ×10','Titanoboa Venom ×10','Allosaurus Brain ×10'],
			alpha: ['Artifact of the Massive ×1','Artifact of the Strong ×1','Artifact of the Skylord ×1','Argentavis Talon ×15','Sarcosuchus Skin ×15','Megalania Toxin ×15','Titanoboa Venom ×15','Allosaurus Brain ×15']
		  }
		},
		{ id:'overseer', name:'Overseer', map:'The Island', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Final Island boss. Cycles through Broodmother / Megapithecus / Dragon avatars in phases. META: Theri rotation with Daeodon heal-passive.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Defeat all three Island guardians at the matching tier, then traverse the Tek Cave to the Ascension chamber.' },

		// ─── Scorched Earth (Apr 2024) ───
		{ id:'manticore', name:'Manticore', map:'Scorched Earth', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Flying phase is immune. Burst damage during landings. META: Rex/Theri frontline with a Yutyrannus courage buff.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Crag ×1','Artifact of the Destroyer ×1','Artifact of the Gatekeeper ×1','Argentavis Talon ×5','Sauropod Vertebra ×5','Tusoteuthis Tentacle ×5','Deathworm Horn ×5'],
			beta:  ['Artifact of the Crag ×1','Artifact of the Destroyer ×1','Artifact of the Gatekeeper ×1','Argentavis Talon ×10','Sauropod Vertebra ×10','Tusoteuthis Tentacle ×10','Deathworm Horn ×10'],
			alpha: ['Artifact of the Crag ×1','Artifact of the Destroyer ×1','Artifact of the Gatekeeper ×1','Argentavis Talon ×15','Sauropod Vertebra ×15','Tusoteuthis Tentacle ×15','Deathworm Horn ×15']
		  }
		},

		// ─── The Center (Jun 2024) — single combined arena, NOT 3 separate bosses ───
		{ id:'center_combo', name:'Broodmother & Megapithecus', map:'The Center', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Combined Floating Island arena. Both bosses fight you on a 25-minute timer. Araneo swarms + boulder throws + Gigantopithecus minions.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Center artifact set · Trophies: Allosaurus Brain, Argentavis Talon, Sarco Skin, Sauropod Vertebra, Tusoteuthis Tentacle, Tyrannosaurus Arm, Yutyrannus Lungs' },

		// ─── Aberration (Sep 2024) ───
		{ id:'rockwell', name:'Rockwell', map:'Aberration', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'No flyers allowed. Target the glowing Element tentacle nodes. Reaper Kings excel here.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Depths ×1','Artifact of the Shadows ×1','Artifact of the Stalker ×1','Karkinos Claw ×5','Basilisk Scale ×5','Reaper Queen Pheromone Gland ×5','Nameless Venom ×5'],
			beta:  ['Artifact of the Depths ×1','Artifact of the Shadows ×1','Artifact of the Stalker ×1','Karkinos Claw ×10','Basilisk Scale ×10','Reaper Queen Pheromone Gland ×10','Nameless Venom ×10'],
			alpha: ['Artifact of the Depths ×1','Artifact of the Shadows ×1','Artifact of the Stalker ×1','Karkinos Claw ×15','Basilisk Scale ×15','Reaper Queen Pheromone Gland ×15','Nameless Venom ×15']
		  }
		},

		// ─── Extinction (Dec 2024) ───
		{ id:'forest_titan', name:'Forest Titan', map:'Extinction', kind:'tame', difficulties:[],
		  description:'Open-world titan. Cannot be killed — destroy corruption nodes around the body to tame. 24-hour duration tame.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — locate in the wild (Forest cave region).' },
		{ id:'ice_titan', name:'Ice Titan', map:'Extinction', kind:'tame', difficulties:[],
		  description:'Snow biome titan. Strike weak points on its back during stagger windows. Tame, not kill.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — locate in the wild (Snow Dome region).' },
		{ id:'desert_titan', name:'Desert Titan', map:'Extinction', kind:'tame', difficulties:[],
		  description:'Flying titan raining lightning. Tame as a massive flying platform.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — locate in the wild (Desert biome).' },
		{ id:'king_titan', name:'King Titan', map:'Extinction', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Open-arena fight at the Forbidden Zone. Target the corruption nodes on its body. Alpha tier requires all three field Titans tamed.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Summoned at the King Titan Terminal — Corrupted Heart and tier-scaling Element costs.' },

		// ─── Astraeos (Feb 2025, premium partner) ───
		{ id:'hydraskos', name:'Hydraskos, The Unbroken', map:'Astraeos', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Five-headed serpent with elemental breath (Fire/Ice/Dark/Lightning/Poison). Attack from behind. META: Stego tanks + Deinonychus bleed.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Astraeos tribute altar — artifacts + apex drops.' },
		{ id:'natrix', name:'Natrix, the Devious', map:'Astraeos', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Medusa-style boss. Summons Araneo, Titanoboa, Onyc with torpor/disease debuffs. Swamp arena.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Artifacts of Clever, Hunter, Massive · Trophies: Argentavis Talon, Sarco Skin, Sauropod Vertebra, Titanoboa Venom (5×/10× per tier)' },
		{ id:'thodes', name:'Thodes, the Widowmaker', map:'Astraeos', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Damage-resistant until eye glows — shoot the eye to open damage windows. Club melee, close quarters.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Artifacts of Brute, Pack, Devourer · Alpha adds 10× Megalodon Teeth, Therizino Claws, Megalania Toxin, Spino Sail, Thylacoleo Hook-Claw' },
		{ id:'thanatos', name:'Thanatos', map:'Astraeos', kind:'world', difficulties:[],
		  description:'World boss. Spawns naturally in Therokis region on a periodic timer — no summon ritual. 15-minute fight with lava-river positioning. META: Giga, Carcha, Dreadnoughtus, Wyverns.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — wait for natural spawn in Therokis.' },
		{ id:'pulmonoscorpius_monarch', name:'Pulmonoscorpius Monarch', map:'Astraeos', kind:'killable', difficulties:['gamma'],
		  description:'Astraeos cave system miniboss — a stepping stone before major bosses.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — encounter inside Astraeos caves.' },
		{ id:'minotarchos', name:'Minotarchos', map:'Astraeos', kind:'killable', difficulties:['gamma'],
		  description:'Minotaur-themed miniboss.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — encounter in cave.' },
		{ id:'erymanthian_kalydonios', name:'Erymanthian & Kalydonios', map:'Astraeos', kind:'killable', difficulties:['gamma'],
		  description:'Dual-boar miniboss encounter.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — encounter in cave.' },

		// ─── Ragnarok (ASA, Jun 2025) — Nunatak replaces ASE Dragon/Manticore combo ───
		{ id:'nunatak', name:'Nunatak', map:'Ragnarok', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Colossal Ice Wyvern. Flyers banned in arena. Summons Ice Worm adds. Alpha ~1.25M HP, drops ~550 Element on kill. Player lvl 70/80/90.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Full 10-artifact Island set ×1 each','Argentavis Talon ×5','Megalodon Fin ×5','Sauropod Vertebra ×5','Tyrannosaurus Arm ×5'],
			beta:  ['Full 10-artifact Island set ×1 each','Argentavis Talon ×10','Megalodon Fin ×10','Sauropod Vertebra ×10','Tyrannosaurus Arm ×10','Allosaurus Brain ×5'],
			alpha: ['Full 10-artifact Island set ×1 each','Argentavis Talon ×15','Megalodon Fin ×15','Sauropod Vertebra ×15','Tyrannosaurus Arm ×15','Allosaurus Brain ×10','Wyvern Talon ×5']
		  }
		},
		{ id:'iceworm_queen', name:'Iceworm Queen', map:'Ragnarok', kind:'world', difficulties:[],
		  description:'Dungeon-style boss beneath Blizzard Peak. No tier system — single high-difficulty encounter with loot crate rewards.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'No tribute — enter the Frozen Dungeon.' },

		// ─── Valguero (ASA, Oct 2025) — Grendel replaces ASE Forsaken Oasis triple ───
		{ id:'grendel', name:'Grendel', map:'Valguero', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Massive Megaraptor-type. Bleed damage is the main threat. Fog phase requires lighting the arena braziers. META: Therizinosaur DPS, Daeodon heal-passive, Yutyrannus courage buff.',
		  maxPlayers:10, maxTames:20,
		  tribute: {
			gamma: ['Artifact of the Devourer ×1','Artifact of the Pack ×1','Artifact of the Skylord ×1','Allosaurus Brain ×5','Argentavis Talon ×5','Sarcosuchus Skin ×5','Sauropod Vertebra ×5','Titanoboa Venom ×5'],
			beta:  ['Artifact of the Cunning ×1','Artifact of the Immune ×1','Artifact of the Strong ×1','Tyrannosaurus Arm ×5','Allosaurus Brain ×10','Argentavis Talon ×10','Sarcosuchus Skin ×10','Sauropod Vertebra ×10','Titanoboa Venom ×10'],
			alpha: ['Artifact of the Devourer ×1','Artifact of the Pack ×1','Artifact of the Skylord ×1','Artifact of the Cunning ×1','Artifact of the Immune ×1','Artifact of the Strong ×1','Tyrannosaurus Arm ×10','Allosaurus Brain ×15','Argentavis Talon ×15','Sarcosuchus Skin ×15','Sauropod Vertebra ×15','Titanoboa Venom ×15']
		  }
		},

		// ─── Lost Colony (Dec 2025) — single chained Red-Handed encounter (Lost King → Lost Queen) ───
		{ id:'lost_combo', name:'Lost King & Lost Queen', map:'Lost Colony', kind:'killable', difficulties:['gamma','beta','alpha'],
		  description:'Chained arena encounter — defeat the Lost King first, then the Lost Queen auto-triggers on cutscene. Phase 1: Gigadesmodus + power-pole rotation. Phase 2: foot duel + healing-tether break. Player lvl 55/70/95.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Alpha Ossidon Skull, Alpha Zombie Brains, Neophyte Horns (counts scale per tier). Sigils required at Alpha. Single Red-Handed mission entry covers both bosses.' },

		// ─── COMING SOON — confirmed in ASA pipeline but not yet released ───
		{ id:'soon_genesis1', name:'Genesis: Part 1 (Ascended)', map:'Genesis: Part 1', kind:'soon', difficulties:[],
		  description:'Expected June 2026 — release window opens next month. Includes Moeder (Ocean biome) and the Corrupted Master Controller multi-phase finale.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Release pending.' },
		{ id:'soon_genesis2', name:'Genesis: Part 2 (Ascended)', map:'Genesis: Part 2', kind:'soon', difficulties:[],
		  description:'Expected Q2 2027 — free release. Will include Rockwell Prime as the multi-phase finale.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Release pending.' },
		{ id:'soon_lost_island', name:'Dinopithecus King', map:'Lost Island', kind:'soon', difficulties:[],
		  description:'Lost Island Ascended port not yet released. ASE roster: Dinopithecus King at gamma/beta/alpha.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Release pending.' },
		{ id:'soon_crystal', name:'Crystal Wyvern Queen', map:'Crystal Isles', kind:'soon', difficulties:[],
		  description:'Crystal Isles Ascended port not yet released. ASE roster: Crystal Wyvern Queen at gamma/beta/alpha.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Release pending.' },
		{ id:'soon_fjordur', name:'Fenrisúlfr', map:'Fjordur', kind:'soon', difficulties:[],
		  description:'Fjordur Ascended port deprioritized. ASE roster: Beyla, Hati & Skoll, Steinbjörn, plus final boss Fenrisúlfr.',
		  maxPlayers:10, maxTames:20,
		  tributeNotes:'Release pending.' }
	];

	const sessions = data.sessions as Session[];
	const records  = data.records as Record<string,unknown>[];
	const wins     = (data.wins ?? {}) as Record<string, string[]>;

	// Per-boss visual mapping (color class + hex-glyph letter) — preview-aligned
	const BOSS_COLOR: Record<string,string> = {
		broodmother:'brood',
		megapithecus:'mega',
		dragon:'dragon',
		overseer:'overseer',
		manticore:'manticore',
		rockwell:'rockwell',
		forest_titan:'forest', desert_titan:'desert', ice_titan:'ice', king_titan:'king',
		center_combo:'mega',
		nunatak:'ice', iceworm_queen:'ice',
		grendel:'dragon',
		hydraskos:'rockwell', natrix:'brood', thodes:'desert', thanatos:'king',
		pulmonoscorpius_monarch:'manticore', minotarchos:'king', erymanthian_kalydonios:'forest',
		lost_combo:'king',
		soon_genesis1:'soon', soon_genesis2:'soon', soon_lost_island:'soon', soon_crystal:'soon', soon_fjordur:'soon'
	};
	const BOSS_LETTER: Record<string,string> = {
		broodmother:'B',
		megapithecus:'Mp',
		dragon:'D',
		overseer:'O',
		manticore:'M',
		rockwell:'R',
		forest_titan:'FT', desert_titan:'DT', ice_titan:'IT', king_titan:'KT',
		center_combo:'B+M',
		nunatak:'Nu', iceworm_queen:'IW',
		grendel:'G',
		hydraskos:'H', natrix:'Nx', thodes:'Td', thanatos:'Th',
		pulmonoscorpius_monarch:'PM', minotarchos:'Mt', erymanthian_kalydonios:'EK',
		lost_combo:'LK+Q',
		soon_genesis1:'G1', soon_genesis2:'G2', soon_lost_island:'LI', soon_crystal:'CW', soon_fjordur:'Fn'
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
		lava:     { fill:'rgba(249,115,22,0.15)', stroke:'#f97316', text:'#fdba74' },
		soon:     { fill:'rgba(100,116,139,0.10)', stroke:'#475569', text:'#64748b' }
	};
	const MAP_THEME: Record<string,string> = {
		'The Island':'island',
		'The Center':'island',
		'Scorched Earth':'scorched',
		'Aberration':'aberration',
		'Extinction':'extinction',
		'Ragnarok':'ragnarok',
		'Valguero':'island',
		'Astraeos':'aberration',
		'Lost Colony':'ragnarok',
		'Genesis: Part 1':'aberration',
		'Genesis: Part 2':'aberration',
		'Lost Island':'island',
		'Crystal Isles':'aberration',
		'Fjordur':'extinction'
	};

	function bossColor(id: string) { return BOSS_COLOR[id] ?? 'overseer'; }
	function bossLetter(id: string, name: string) { return BOSS_LETTER[id] ?? name.charAt(0); }
	function svgFor(id: string) { return BOSS_SVG[bossColor(id)] ?? BOSS_SVG.overseer; }
	function mapClass(map: string) { return MAP_THEME[map] ?? 'island'; }
	function wonOn(b: Boss, d: string) { return (wins[b.name] ?? []).includes(d); }
	function diffOrder(d: string) { return d==='gamma'?0 : d==='beta'?1 : 2; }
	function statusFor(b: Boss) {
		if (b.kind === 'soon')  return { cls:'soon',    label:'Coming Soon', hint:'Not yet on ASA' };
		if (b.kind === 'tame')  return { cls:'tame',    label:'Tameable',    hint:'Field encounter' };
		if (b.kind === 'world') return { cls:'world',   label:'Roaming',     hint:'No summon required' };
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
	let difficulty = $state<'gamma' | 'beta' | 'alpha'>('alpha');

	// Live tick for the active-session "open for" indicator. 30s is plenty granular
	// for hour/minute display; we don't need second-by-second updates here.
	let now = $state(Date.now());

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
	let logSquad        = $state<{name:string; userId:number}[]>([]);
	let logCreatures    = $state<Record<string,unknown>[]>([]);
	let logDuration     = $state('');
	let receiptRecord   = $state<Record<string,unknown>|null>(null);
	let inviteOpen      = $state(false);
	let friends         = $state<Record<string,unknown>[]>([]);
	let pollTimer: ReturnType<typeof setInterval>;
	let bottom: HTMLDivElement;
	let nowTicker: ReturnType<typeof setInterval>;

	onMount(() => {
		nowTicker = setInterval(() => { now = Date.now(); }, 30_000);
	});
	onDestroy(() => {
		clearInterval(pollTimer);
		clearInterval(nowTicker);
	});

	// Resolve the active session's boss entry for caps / tribute rendering.
	function bossFor(name: unknown): Boss | undefined {
		const n = String(name ?? '');
		return BOSSES.find(b => b.name === n);
	}

	function formatOpenFor(createdAt: unknown, ticker: number): string {
		if (!createdAt) return '—';
		const t = new Date(String(createdAt)).getTime();
		if (Number.isNaN(t)) return '—';
		let diff = Math.max(0, ticker - t);
		const d = Math.floor(diff / 86_400_000); diff -= d * 86_400_000;
		const h = Math.floor(diff / 3_600_000);  diff -= h * 3_600_000;
		const m = Math.floor(diff / 60_000);
		if (d > 0) return `${d}d ${h}h`;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

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

	function display(u: Record<string,unknown>) {
		const nick = u.nickname as string | null | undefined;
		const dn   = u.discordName as string | null | undefined;
		const em   = u.email as string | null | undefined;
		if (nick) return nick;
		if (dn) return dn;
		if (em) return em.split('@')[0];
		return 'Survivor';
	}

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
			messages = [...messages, { ...msg, user:{ nickname:'You', discordName:null, email:null } }];
			draft = '';
			setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50);
		}
	}

	async function addCreature(c: Record<string,unknown>) {
		if (!activeSession) return;
		const res = await fetch(`/api/arena/sessions/${activeSession.id}/creatures/${c.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ creatureId:c.id, creatureData:c }) });
		if (res.ok) { sessionCreatures = [...sessionCreatures, { ...await res.json(), user:{ nickname:'You', discordName:null, email:null } }]; addOpen=false; }
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
		const dur = logDuration ? (parseInt(logDuration) || null) : null;
		await fetch('/api/boss-records', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossName:String(activeSession.bossName), difficulty:String(activeSession.difficulty), outcome:logOutcome, notes:logNotes||null, creaturesUsed:logCreatures.map(c => c.creatureData ?? c), squadMembers:logSquad, duration:dur }) });
		logOpen = false; alert('Fight recorded!');
	}

	function openLogFight() {
		if (!activeSession) return;
		logOpen = true;
		logOutcome = 'success';
		logNotes = '';
		logDuration = String(Math.round((Date.now() - new Date(String(activeSession.createdAt)).getTime()) / 60000));
		logSquad = sessionMembers.map(m => ({ name: display(m.user as Record<string,unknown>), userId: Number((m.user as Record<string,unknown>).id ?? 0) }));
		logCreatures = [...sessionCreatures];
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
		megapithecus: { creatures:['Rex (high HP)','Yutyrannus','Daeodon'], consumables:['Battle Tartare','Focal Chili','Medical Brew'], tips:['Spread out — boulders deal AoE damage','Heavy mounts stun-resist his slam','Bring melee DPS — ranged gets less value'], avoid:['Tight formations','Squishy mounts','Ignoring Gigantopithecus minions'] },
		dragon: { creatures:['Therizinosaur (META — fire-resistant + bleed)','Allosaurus','Yutyrannus'], consumables:['Battle Tartare','Medical Brew'], tips:['Dragon is fire-immune — Theri takes reduced fire damage','Focus Dragon — wyverns are a distraction','Keep moving, fire breath is a sweep'], avoid:['Rex (takes full fire damage)','Standing still','Squishy mounts'] },
		overseer: { creatures:['Rex','Daeodon','Yutyrannus','Therizinosaur'], consumables:['Battle Tartare','Medical Brew','Focal Chili'], tips:['Three phases — Broodmother, Megapithecus, Dragon drone forms','Adapt comp per phase','Drone forms are weaker than the real bosses'], avoid:['Single-strategy comps','Flyers (won\'t fit)'] },
		manticore: { creatures:['Rex','Yutyrannus','Theri','Allosaurus'], consumables:['Battle Tartare','Focal Chili','Medical Brew'], tips:['Flying phase = immune — wait for landings','Burst DPS during landing windows','Bring melee + tanks'], avoid:['Wasting damage during flight','Squishy mounts','Lightning AoE'] },
		center_combo: { creatures:['Megatherium (Broodmother buff)','Rex/Theri','Daeodon','Yutyrannus'], consumables:['Bug Repellant','Battle Tartare','Medical Brew'], tips:['Megatherium gets insect buff from Broodmother spiders','Spread to avoid Megapithecus boulders','25-min timer is tight — efficient kills only'], avoid:['Spider DoT cluster','Tight formations','Ignoring Gigantopithecus minions'] },
		rockwell: { creatures:['Ravager (no flyers in Aberration)','Rock Drake','Reaper King'], consumables:['Hazard Suit charge','Nameless Venom','Lesser Antidote'], tips:['No flyers — use Ravagers or Drakes','Target glowing Element tentacle nodes','Dodge Element spikes (one-shot)'], avoid:['Flyers','Standing in element surge zones','Ignoring tentacle nodes'] },
		king_titan: { creatures:['All 3 field Titans (Alpha unlock)','Giga','Carcha','Voidwyrm'], consumables:['Battle Tartare','Mega Mindwipe','Medical Brew'], tips:['Tame all 3 field Titans first for Alpha','Field Titans deal massive damage to King','Target corruption nodes on its body'], avoid:['Solo attempts','Untamed field Titans (Alpha)'] },
		hydraskos: { creatures:['Stego (tank)','Deinonychus (bleed)','Allosaurus','Yutyrannus'], consumables:['Battle Tartare','Medical Brew'], tips:['Attack from behind — heads breathe elemental damage','5 elemental types — bring varied resists','Coordinate target priority by head'], avoid:['Frontal assault','Single damage type comp'] },
		natrix: { creatures:['Theri','Rex','Yutyrannus','Daeodon'], consumables:['Lesser Antidote','Battle Tartare','Medical Brew'], tips:['Don\'t look directly — petrification','Kill Araneo/Titanoboa/Onyc adds fast','Disease cure crucial'], avoid:['Looking at her face','Ignoring debuff stacks'] },
		thodes: { creatures:['Rex','Theri (burst DPS)','Yuty','Allosaurus'], consumables:['Battle Tartare','Focal Chili','Medical Brew'], tips:['Damage-resistant until eye glows','Shoot eye with gun to open damage window','Club melee — close quarters'], avoid:['Wasting DPS when armored','Tight formations during club sweeps'] },
		thanatos: { creatures:['Giga','Carcha','Dreadnoughtus','Wyverns'], consumables:['Battle Tartare','Lazarus Chowder','Mega Mindwipe'], tips:['World boss — wait for natural spawn in Therokis','15-min timer','Lava rivers — positioning is everything'], avoid:['Solo attempts','Slow mounts','Standing in lava'] },
		nunatak: { creatures:['Wyverns (cold resist)','Rex','Theri','Daeodon','Yutyrannus'], consumables:['Fria Curry (cold resist)','Battle Tartare','Medical Brew'], tips:['Flyers banned in arena','Ice Worm adds — burst them down','Cold mitigation crucial','META: Yutyrannus + Theri'], avoid:['No cold protection','Ignoring adds'] },
		iceworm_queen: { creatures:['Rex','Daeodon','Carno'], consumables:['Fria Curry','Battle Tartare','Medical Brew'], tips:['Dungeon-style — narrow corridors','Burst DPS during emergence windows','Pack multiple drops of meds'], avoid:['Flyers','Slow mounts','Splitting up'] },
		grendel: { creatures:['Theri','Rex','Daeodon (bleed mitigation)','Yutyrannus'], consumables:['Lazarus Chowder','Medical Brew','Cactus Broth'], tips:['Bleed damage is primary — bring healers','Fog phase: light arena fires for visibility','Megaraptor-type — fast and aggressive'], avoid:['Bleed stacking','Low-HP mounts','Dark phase without lights'] },
		lost_king: { creatures:['Ground DPS — Rex, Theri, Carcha','Wyverns for ranged during fly phase'], consumables:['Battle Tartare','Medical Brew','Focal Chili'], tips:['Destroy 4 power poles to make him land','Thrall waves between phases','Flying Gigadesmodus = immune'], avoid:['Skipping power poles','Ignoring thralls'] },
		lost_queen: { creatures:['Your surviving Lost King DPS'], consumables:['Medical Brew','Battle Tartare'], tips:['Break her healing tether at 50% HP or she full-heals','Assign 2-3 to tether duty','Phase 2 is more aggressive'], avoid:['Letting tether complete','Phase 2 cluster wipes'] }
	};

	const tips = $derived.by(() => {
		if (!activeSession) return TIPS.default;
		const id = String(activeSession.bossId ?? '');
		return TIPS[id] ?? TIPS.default;
	});

	function ago(dt: string) { const d = new Date(dt); return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }

	// creaturesUsed stores either a plain array (old records) or { creatures, squad, duration } (new records).
	type Receipt = { creatures: Record<string,unknown>[]; squad: {name:string;userId:number}[]; duration: number|null };
	function parseReceipt(raw: unknown): Receipt {
		if (Array.isArray(raw)) return { creatures: raw as Record<string,unknown>[], squad: [], duration: null };
		if (raw && typeof raw === 'object') {
			const r = raw as Record<string,unknown>;
			return { creatures: (r.creatures as Record<string,unknown>[]) ?? [], squad: (r.squad as {name:string;userId:number}[]) ?? [], duration: (r.duration as number|null) ?? null };
		}
		return { creatures: [], squad: [], duration: null };
	}
</script>

<div class="stage">

	{#if !activeSession}
		{#snippet overseerSub()}
			<span class="prefix">›</span>
			BOSS ARENA · <span class="stat-num">{BOSSES.length}</span> BOSSES · <span class="stat-num">{sessions.length}</span> WAR ROOMS ACTIVE · <span class="stat-num">{records.length}</span> KILLS LOGGED
		{/snippet}
		{#snippet overseerActions()}
			<button class="btn-create" onclick={() => document.getElementById('boss-arena')?.scrollIntoView({ behavior:'smooth', block:'start' })} title="Pick a boss below to schedule">⚔ Schedule War Room</button>
		{/snippet}
		<PageHeader title="Overseer" subContent={overseerSub} actions={overseerActions} variant="red" />

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
						<button class="boss-card {bossColor(b.id)}" class:locked={b.kind === 'soon'} onclick={() => { if (b.kind === 'soon') return; detailBoss = b; difficulty = (b.kind === 'killable' ? 'alpha' : (b.difficulties[0] ?? 'alpha')) as 'gamma' | 'beta' | 'alpha'; }}>
							{#if b.kind === 'soon'}<span class="boss-warroom-flag soon">⏳ Coming Soon</span>
							{:else if b.kind === 'tame'}<span class="boss-warroom-flag tame">⊡ Tame</span>
							{:else if b.kind === 'world'}<span class="boss-warroom-flag world">◈ World Boss</span>
							{:else if activeWarRoom(b.name)}<span class="boss-warroom-flag">● War Room Active</span>{/if}
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
								{#if b.kind === 'killable'}
									{#each b.difficulties as d}
										<div class="boss-pip {pipClass(b, d)}">{d.charAt(0).toUpperCase()+d.slice(1)}{wonOn(b, d) ? ' ✓' : ''}</div>
									{/each}
								{:else if b.kind === 'tame'}
									<div class="boss-pip tame-pip">TAME</div>
								{:else if b.kind === 'world'}
									<div class="boss-pip world-pip">WORLD</div>
								{:else}
									<div class="boss-pip soon-pip">PENDING</div>
								{/if}
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
						{@const receipt = parseReceipt(rd.creaturesUsed)}
						<button class="boss-card {rd.outcome==='success'?'forest':'dragon'}" onclick={() => receiptRecord = rd}>
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
								<span class="boss-extra">{receipt.squad.length > 0 ? `${receipt.squad.length} survivors` : receipt.creatures.length > 0 ? `${receipt.creatures.length} tames` : 'View receipt'}</span>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/if}

	{:else}
		<!-- ═══════════ ACTIVE WAR ROOM (boss-detail-preview port) ═══════════ -->
		{@const closed = activeSession.status === 'closed'}
		{@const isCreator = (activeSession.creatorUserId as number) === data.myId}
		{@const activeBoss = bossFor(activeSession.bossName)}
		{@const maxPlayers = activeBoss?.maxPlayers ?? 10}
		{@const maxTames = activeBoss?.maxTames ?? 10}
		{@const rosterReady = sessionCreatures.length >= maxTames}

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
					<button class="diff-btn" onclick={openLogFight}>Log Fight</button>
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
						<div class="warroom-timer-label">Open For</div>
						<div class="warroom-timer">{formatOpenFor(activeSession.createdAt, now)}</div>
						<div class="warroom-scheduled">{sessionMembers.length} / {maxPlayers} SURVIVORS · {sessionCreatures.length} / {maxTames} TAMES</div>
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
									<span class="readiness-status {rosterReady ? 'ready' : sessionCreatures.length > 0 ? 'partial' : 'missing'}">{rosterReady ? 'READY' : sessionCreatures.length > 0 ? 'PARTIAL' : 'MISSING'}</span>
								</div>
								<div class="readiness-row">
									<span class="name">Creatures committed <span class="sub">{tips.creatures[0] ?? ''}</span></span>
									<span class="qty"><span class="cur {rosterReady ? 'met' : 'gap'}">{sessionCreatures.length}</span><span class="req"> / {maxTames}</span></span>
									<span class="check {rosterReady ? 'ok' : 'gap'}">{rosterReady ? '✓' : '⚠'}</span>
								</div>
								<div class="readiness-row">
									<span class="name">Members in room</span>
									<span class="qty"><span class="cur met">{sessionMembers.length}</span><span class="req"> / {maxPlayers}</span></span>
									<span class="check ok">✓</span>
								</div>
								<div class="readiness-bar"><div class="readiness-bar-fill" style="width:{Math.min(100, (sessionCreatures.length / maxTames) * 100)}%"></div></div>
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

							<!-- Strategy + What to Avoid sections intentionally hidden — copy
							     rebuild pending per-boss from YouTube transcripts. Data preserved
							     in BOSS_TIPS.{tips, avoid} so we can re-enable per-boss later. -->
						</div>

						<!-- Squad / members block -->
						<div class="squad-block" style="margin-top:14px">
							<div class="squad-head">
								<span>Squad</span>
								<span class="count">{sessionMembers.length} / {maxPlayers} COMMITTED</span>
							</div>
							<div class="squad-grid">
								{#each sessionMembers as m}
									{@const md = m as Record<string,unknown>}
									{@const u = (md.user as Record<string,unknown>) ?? {}}
									{@const name = display(u)}
									{@const uid = Number(u.id ?? 0)}
									<a href="/survivors/{uid}" class="squad-slot filled" title={name}><span class="initial">{name.charAt(0).toUpperCase()}</span><span class="pip"></span></a>
								{/each}
								{#each Array.from({ length: Math.max(0, maxPlayers - sessionMembers.length) }) as _}
									<div class="squad-slot empty">+</div>
								{/each}
							</div>
							<button class="invite-btn" onclick={loadFriendsAndInvite}>⬡ Invite Survivor</button>
						</div>

						<!-- Creatures committed -->
						<div class="creatures-block">
							<div class="squad-head">
								<span>Creatures Committed</span>
								<span class="count">{sessionCreatures.length} / {maxTames} TAMES</span>
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
<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
	onclick={() => detailBoss = null}
	onkeydown={(e) => { if (e.key === 'Escape') detailBoss = null; }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="modal-stage" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
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

				{#if b.kind === 'killable' && b.difficulties.length > 0}
					<div class="diff-select">
						<div class="diff-select-label">Difficulty</div>
						{#each b.difficulties as d}
							<button class="diff-btn" class:active={difficulty === d} class:won={wonOn(b, d)} onclick={() => difficulty = d as 'gamma' | 'beta' | 'alpha'}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
						{/each}
					</div>
				{:else if b.kind === 'tame'}
					<div class="diff-select">
						<div class="diff-select-label">Encounter</div>
						<button class="diff-btn active" disabled>⊡ Field Tame</button>
					</div>
				{:else if b.kind === 'world'}
					<div class="diff-select">
						<div class="diff-select-label">Encounter</div>
						<button class="diff-btn active" disabled>◈ World Boss</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Tribute info section — per-tier list when the boss has structured data,
		     otherwise the free-form tributeNotes string. Items cycle when the user
		     toggles the difficulty buttons above. -->
		{#if b.tribute || b.tributeNotes}
		{@const tierTribute = b.tribute?.[difficulty]}
		<section class="section">
			<div class="section-header">
				<span class="pip"></span>
				Tribute · Access
				{#if b.tribute && b.kind === 'killable'}
					<span class="rule"></span>
					<span class="action" style="cursor:default">⚔ {difficulty.toUpperCase()}</span>
				{:else}
					<span class="rule"></span>
				{/if}
			</div>
			<div class="warroom">
				{#if tierTribute && tierTribute.length > 0}
					<div class="tribute-grid">
						{#each tierTribute as item}
							<div class="tribute-row"><span class="tribute-bullet">⬡</span> {item}</div>
						{/each}
					</div>
				{:else if b.tribute}
					<div class="warroom-meta" style="font-family:var(--tek-mono);font-size:0.78rem;color:#94a3b8">
						No tribute data for {difficulty.toUpperCase()} yet — try Gamma or Alpha.
					</div>
				{:else if b.tributeNotes}
					<div class="warroom-meta" style="font-family:var(--tek-mono);font-size:0.78rem;color:#94a3b8;line-height:1.6">
						{b.tributeNotes}
					</div>
				{/if}
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
					<!-- Strategy + What to Avoid intentionally hidden until per-boss
					     transcript-based rewrites land. Data preserved in BOSS_TIPS. -->
				</div>
			</div>
		</section>

		<div class="modal-actions">
			<button class="diff-btn" onclick={() => detailBoss = null}>Close</button>
			<button class="btn-create" onclick={createAndEnter}>
				{#if b.kind === 'tame'}⊡ Plan Tame Run
				{:else if b.kind === 'world'}◈ Plan Hunt
				{:else}⚔ Launch War Room{/if}
			</button>
		</div>
	</div>
</div>
{/if}

<!-- ═════════ ADD SPECIMEN MODAL ═════════ -->
{#if addOpen}
<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
	onclick={() => addOpen=false}
	onkeydown={(e) => { if (e.key === 'Escape') addOpen=false; }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="modal-stage" style="max-width:720px" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
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
<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
	onclick={() => logOpen=false}
	onkeydown={(e) => { if (e.key === 'Escape') logOpen=false; }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="modal-stage" style="max-width:640px" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
		<div class="section-header">
			<span class="pip"></span>
			Log Boss Fight
			<span class="rule"></span>
		</div>
		<div class="warroom" style="display:flex;flex-direction:column;gap:18px">
			{#if activeSession}
				<div style="font-family:var(--tek-mono);color:#94a3b8;font-size:0.78rem">{String(activeSession.bossName)} · {String(activeSession.difficulty).toUpperCase()}</div>
			{/if}

			<!-- Outcome + Duration -->
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
				<div>
					<div class="diff-select-label" style="margin-bottom:8px">Outcome</div>
					<div style="display:flex;gap:8px">
						<button class="diff-btn" class:active={logOutcome==='success'} onclick={() => logOutcome='success'}>⚔ Victory</button>
						<button class="diff-btn" class:active={logOutcome==='failed'} onclick={() => logOutcome='failed'}>✗ Defeat</button>
					</div>
				</div>
				<div>
					<div class="diff-select-label" style="margin-bottom:8px">Duration (minutes)</div>
					<input type="number" min="1" class="chat-input" style="width:100%;font-family:var(--tek-mono);font-size:0.82rem" bind:value={logDuration} placeholder="e.g. 12" />
				</div>
			</div>

			<!-- Squad -->
			<div>
				<div class="diff-select-label" style="margin-bottom:8px">Squad ({logSquad.length})</div>
				{#if logSquad.length === 0}
					<div style="color:#475569;font-size:0.78rem;font-family:var(--tek-mono)">No members loaded from war room.</div>
				{:else}
					<div style="display:flex;flex-wrap:wrap;gap:6px">
						{#each logSquad as member, i}
							<div class="log-tag">
								<a href="/survivors/{member.userId}" class="log-tag-name">{member.name}</a>
								<button class="log-tag-remove" onclick={() => logSquad = logSquad.filter((_,j) => j !== i)} aria-label="Remove">×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Creatures -->
			<div>
				<div class="diff-select-label" style="margin-bottom:8px">Tames ({logCreatures.length})</div>
				{#if logCreatures.length === 0}
					<div style="color:#475569;font-size:0.78rem;font-family:var(--tek-mono)">No tames loaded from war room.</div>
				{:else}
					<div style="display:flex;flex-wrap:wrap;gap:6px">
						{#each logCreatures as c, i}
							{@const cd = (c.creatureData ?? c) as Record<string,unknown>}
							<div class="log-tag">
								<span class="log-tag-name">{String(cd.species ?? '?')} "{String(cd.name ?? 'Unnamed')}"</span>
								<button class="log-tag-remove" onclick={() => logCreatures = logCreatures.filter((_,j) => j !== i)} aria-label="Remove">×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Notes -->
			<div>
				<div class="diff-select-label" style="margin-bottom:8px">Notes</div>
				<textarea class="chat-input" rows={2} style="width:100%;font-family:inherit;clip-path:polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);" bind:value={logNotes} placeholder="How did it go? Any key moments..."></textarea>
			</div>
		</div>
		<div class="modal-actions">
			<button class="diff-btn" onclick={() => logOpen=false}>Cancel</button>
			<button class="btn-create" onclick={logFight}>Save Record</button>
		</div>
	</div>
</div>
{/if}

<!-- ═════════ FIGHT RECEIPT MODAL ═════════ -->
{#if receiptRecord}
{@const rr = receiptRecord}
{@const rrReceipt = parseReceipt(rr.creaturesUsed)}
{@const rrSquad = rrReceipt.squad}
{@const rrCreatures = rrReceipt.creatures}
{@const rrDuration = rrReceipt.duration}
{@const rrDate = new Date(String(rr.createdAt))}
<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
	onclick={() => receiptRecord=null}
	onkeydown={(e) => { if (e.key === 'Escape') receiptRecord=null; }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="modal-stage" style="max-width:580px" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
		<div class="section-header">
			<span class="pip"></span>
			Fight Receipt
			<span class="rule"></span>
			<button class="action" onclick={() => receiptRecord=null}>Close <span class="arrow">▸</span></button>
		</div>
		<div class="warroom" style="display:flex;flex-direction:column;gap:18px">

			<!-- Header -->
			<div style="display:flex;align-items:center;gap:16px">
				<div class="boss-glyph" style="width:52px;height:58px;flex-shrink:0">
					<svg viewBox="0 0 100 110">
						<polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill={rr.outcome==='success'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)'} stroke={rr.outcome==='success'?'#22c55e':'#ef4444'} stroke-width="2"/>
						<text x="50" y="72" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill={rr.outcome==='success'?'#86efac':'#fca5a5'}>{rr.outcome==='success'?'V':'X'}</text>
					</svg>
				</div>
				<div>
					<div style="font-family:var(--tek-display);font-size:1.1rem;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;color:var(--tek-text)">{String(rr.bossName)}</div>
					<div style="font-family:var(--tek-mono);font-size:0.72rem;color:#64748b;margin-top:4px">
						{String(rr.difficulty ?? '').toUpperCase()}
						{#if rrDuration} · {rrDuration} min{/if}
						· {rrDate.toLocaleDateString()} {rrDate.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
					</div>
					<div style="margin-top:6px">
						<span class="status-badge {rr.outcome==='success'?'ready':'notready'}"><span class="status-pip"></span>{rr.outcome==='success'?'Victory':'Defeat'}</span>
					</div>
				</div>
			</div>

			<!-- Squad -->
			{#if rrSquad.length > 0}
				<div>
					<div class="diff-select-label" style="margin-bottom:8px">Squad ({rrSquad.length})</div>
					<div style="display:flex;flex-wrap:wrap;gap:6px">
						{#each rrSquad as member}
							<a href="/survivors/{member.userId}" class="log-tag log-tag-link">
								<span class="log-tag-name">{member.name}</span>
							</a>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Creatures -->
			{#if rrCreatures.length > 0}
				<div>
					<div class="diff-select-label" style="margin-bottom:8px">Tames Used ({rrCreatures.length})</div>
					<div style="display:flex;flex-direction:column;gap:5px">
						{#each rrCreatures as c}
							{@const cd = c as Record<string,unknown>}
							<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:rgba(0,0,0,0.30);font-family:var(--tek-mono);font-size:0.74rem">
								<span style="color:var(--tek-text);font-weight:600">{String(cd.species ?? '?')}</span>
								<span style="color:#64748b">"{String(cd.name ?? 'Unnamed')}"</span>
								{#if cd.level}<span style="color:#475569">Lvl {Number(cd.level)}</span>{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Notes -->
			{#if rr.notes}
				<div>
					<div class="diff-select-label" style="margin-bottom:8px">Notes</div>
					<div style="font-size:0.84rem;color:#94a3b8;line-height:1.6;padding:10px 12px;background:rgba(0,0,0,0.25)">{String(rr.notes)}</div>
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<!-- ═════════ INVITE MODAL ═════════ -->
{#if inviteOpen}
<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="-1"
	onclick={() => inviteOpen=false}
	onkeydown={(e) => { if (e.key === 'Escape') inviteOpen=false; }}>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="modal-stage" style="max-width:520px" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="document">
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

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 70px 24px 80px;
    max-width: 1280px;
    margin: 0 auto;
}

/* page-header / page-title / page-sub live in static/tekos.css ('red' variant) */
.prefix { color: var(--tek-red); opacity: 0.65; margin-right: 4px; }
.stat-num { color: var(--tek-red); font-weight: 700; text-shadow: 0 0 6px rgba(239,68,68,0.5); }

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
/* Variant flags for tame / world / coming soon */
.boss-warroom-flag.tame {
    background: rgba(34,197,94,0.18);
    border-color: rgba(34,197,94,0.55);
    color: #86efac;
    box-shadow: 0 0 6px rgba(34,197,94,0.40);
    animation: none;
}
.boss-warroom-flag.world {
    background: rgba(168,85,247,0.18);
    border-color: rgba(168,85,247,0.55);
    color: #d8b4fe;
    box-shadow: 0 0 6px rgba(168,85,247,0.45);
    animation: none;
}
.boss-warroom-flag.soon {
    background: rgba(100,116,139,0.18);
    border-color: rgba(100,116,139,0.45);
    color: #94a3b8;
    box-shadow: none;
    animation: none;
}

/* Boss-pip variants for non-tier bosses */
.boss-pip.tame-pip {
    background: rgba(34,197,94,0.14);
    border-color: rgba(34,197,94,0.40);
    color: #86efac;
}
.boss-pip.world-pip {
    background: rgba(168,85,247,0.14);
    border-color: rgba(168,85,247,0.40);
    color: #d8b4fe;
}
.boss-pip.soon-pip {
    background: rgba(100,116,139,0.12);
    border-color: rgba(100,116,139,0.30);
    color: var(--tek-text-faint);
    border-style: dashed;
}

/* Coming-soon card state — desaturated, locked */
.boss-card.locked {
    opacity: 0.55;
    cursor: not-allowed;
    filter: grayscale(0.55) saturate(0.85);
}
.boss-card.locked:hover { transform: none; opacity: 0.7; }

/* Additional status-badge variants */
.status-badge.tame  { background: rgba(34,197,94,0.12);  border: 1px solid rgba(34,197,94,0.38);  color: #86efac; }
.status-badge.world { background: rgba(168,85,247,0.14); border: 1px solid rgba(168,85,247,0.40); color: #d8b4fe; }
.status-badge.soon  { background: rgba(100,116,139,0.12);border: 1px solid rgba(100,116,139,0.30); color: var(--tek-text-faint); }

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
.tribute-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 6px 18px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-dim);
}
.tribute-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    border-bottom: 1px dashed rgba(100,116,139,0.10);
}
.tribute-row:last-child { border-bottom: none; }
.tribute-bullet { color: var(--tek-blue); opacity: 0.75; }
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
    text-decoration: none;
    color: inherit;
}
.squad-slot.filled:hover { border-color: rgba(0,180,255,0.75); filter: drop-shadow(0 0 6px rgba(0,180,255,0.35)); }
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

/* ═════════════════════════════════════════════════════════════════════════
   LOG TAGS (squad / creatures in Log Fight modal)
   ═════════════════════════════════════════════════════════════════════════ */
.log-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.22);
    padding: 4px 8px 4px 10px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
}
.log-tag-link { text-decoration: none; cursor: pointer; }
.log-tag-link:hover { background: rgba(0,180,255,0.18); }
.log-tag-name { color: #7dd3fc; }
.log-tag-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: #475569;
    font-size: 1rem;
    line-height: 1;
    padding: 0 0 1px 0;
    transition: color 0.15s;
}
.log-tag-remove:hover { color: #ef4444; }
</style>
