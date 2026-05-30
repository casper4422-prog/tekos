<script lang="ts">
	import { Send, X, Dna, Users, ScrollText, UserPlus } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Session = Record<string,unknown>;
	type ChatMsg = { id:number; content:string; messageType:string; createdAt:string; user:{ nickname:string|null; discordName:string|null; email:string|null } };
	type Creature = Record<string,unknown> & { id:number };

	const session     = data.session as Session;
	const myId        = data.myId as number;
	const myCreatures = data.myCreatures as Creature[];
	const isCreator   = (session.creatorUserId as number) === myId;

	let messages  = $state<ChatMsg[]>((session.chats as ChatMsg[]) ?? []);
	let creatures = $state<Record<string,unknown>[]>((session.creatures as Record<string,unknown>[]) ?? []);
	let members   = $state<Record<string,unknown>[]>((session.members as Record<string,unknown>[]) ?? []);

	let activeTab   = $state<'chat'|'roster'|'members'|'tips'>('chat');

	// Boss tips database — every entry researched against ark.wiki.gg (ASA).
	// NO default fallback. Bosses without an entry render an explicit
	// "no tips logged yet" state so we never show generic-wrong advice
	// (the previous default told players to skip flyers, which is
	// catastrophically wrong for field-tame Titans).
	type BossTip = { creatures:string[]; consumables:string[]; tips:string[]; avoid:string[] };
	const BOSS_TIPS: Record<string, BossTip> = {
		broodmother: {
			creatures:['Megatherium (gets huge buff vs insects — BEST pick)','Rex','Yutyrannus','Daeodon'],
			consumables:['Bug Repellant (reduces aggro from Araneo swarms)','Focal Chili','Mushroom Brew (Aberration)'],
			tips:['Megatherium gets a massive damage buff when killing the Araneo swarms — it\'s the meta pick here','Kill the spider swarms quickly to reduce Megatherium\'s cooldown between buffs','Stay grouped and focus fire on the Broodmother directly','Daeodon heals through the venom DoT very effectively'],
			avoid:['Creatures without saddles (venom DoT is brutal)','Spreading out — AoE webbing will isolate you','Ignoring the Araneo swarms']
		},
		megapithecus: {
			creatures:['Rex','Yutyrannus','Daeodon','Therizinosaur'],
			consumables:['Battle Tartare (player damage for rock cleanup)','Focal Chili','Medical Brew'],
			tips:['Watch for rock throws — they deal massive AoE damage to grouped dinos','Spread your creatures slightly to avoid all being hit by rocks','Whistle passive during boulder throws, then attack after','Killing the summoned Mesopithecus reduces clutter and keeps the arena clear'],
			avoid:['Stacking dinos in one spot (rock AoE wipes groups instantly)','Ignoring the summoned apes (they debuff survivors)']
		},
		dragon: {
			creatures:['Therizinosaur (fire immune, high damage — META)','Allosaurus','Rex (with care)'],
			consumables:['Battle Tartare (player DPS)','Medical Brew','Focal Chili'],
			tips:['The Dragon is IMMUNE to fire — ranged/melee is the only option','Therizinosaur takes reduced fire damage making it the top pick','Focus on the Dragon early — summoned wyverns are a distraction','Keep moving — the fire breath sweeps, don\'t stay in one spot'],
			avoid:['Rex (takes full fire damage, dies quickly on higher difficulties)','Creatures with no fire resistance','Standing still — the fire breath is a sweep attack']
		},
		king_titan: {
			creatures:['All three tamed Titans (Forest, Ice, Desert) for Alpha','Meks (Genesis mechsuits)','High-HP Rexes for Gamma/Beta'],
			consumables:['Broth of Enlightenment (Crafting Skill for better Meks)','Battle Tartare','Focal Chili'],
			tips:['Alpha King Titan REQUIRES all three other Titans to be tamed first','Aim for the corruption nodes on the King Titan\'s body to deal significant damage','Meks deal excellent damage and can be repaired mid-fight','Coordinate Titan strikes — all three attacking simultaneously is devastating'],
			avoid:['Attempting Alpha without all three Titans','Ignoring the corruption nodes','Going in without Meks on Alpha difficulty']
		},
		rockwell: {
			creatures:['Ravager (no flyers allowed in Aberration)','Rock Drake','Reaper King','Karkinos'],
			consumables:['Hazard Suit charge (for radiation)','Nameless Venom (for Reapers)','Lesser Antidote'],
			tips:['No flyers allowed in Aberration — mount up on Ravagers or Drakes','Target the glowing Element tentacle nodes for massive damage','Dodge the Element spikes — they OneShot survivors','Reaper Kings deal excellent damage but require Nameless Venom upkeep'],
			avoid:['Any flying creature (won\'t work here)','Standing in element surge zones','Ignoring the tentacle nodes — they do 25% of his health each']
		},
		lost_king: {
			creatures:['High-level tames','Yutyrannus','Daeodon'],
			consumables:['Battle Tartare','Medical Brew','Focal Chili'],
			tips:['The Lost King rides a Gigadesmodus — watch for its grab attack','Phase transitions bring Thrall waves — clear them quickly','Coordinate damage during ground phases when the King is vulnerable','The arena has multiple elevation levels — use them for positioning'],
			avoid:['Bunching up (AoE attacks during phase transitions)','Ignoring the Thralls between phases']
		},
		lost_queen: {
			creatures:['Your best DPS creatures from the Lost King fight'],
			consumables:['Medical Brew (you\'ll need it)','Battle Tartare'],
			tips:['The Lost Queen\'s healing beam must be broken or she regenerates to full','Assign 2-3 tribe members to focus exclusively on breaking the beam','She has two phases — the second phase is more aggressive','This fight directly follows Lost King — prepare before entering the palace'],
			avoid:['Letting the healing beam complete (she will reach 100% HP)','Splitting too much focus between her and the beam — beam break is priority']
		},

		// ─── Field-tame Titans (Extinction) ───
		desert_titan: {
			creatures:['Quetzal with enclosed platform saddle (lightning shelter — META)','Lightning Wyvern (mobile DPS between strikes)','Bladewasp Hive (ASA-specific — trivializes the fight at scale)'],
			consumables:['Tek Rifle / fabricated sniper (corruption node DPS)','Medical Brews (constant flock chip damage)','Tek Boots or Glider Suit (you WILL fall)'],
			tips:['Field tame — claim it on the ground after every corruption node is destroyed','Node order matters: wings cleanse before the tail node can be struck','Deal as little damage to the Titan itself as possible — every point hurts post-tame HP','After the first node dies, the tail-slap starts. Watch the tail lift, that\'s the tell'],
			avoid:['Skipping flyers — they\'re MANDATORY here, the boss IS a platform','Burning the Titan down for speed (you keep what damage you didn\'t deal)','Landing on its back mid-flight (animation bug = dismount + death)']
		},
		ice_titan: {
			creatures:['Mek with M.R.L.M. or M.S.C.M. saddle (jump clears the freeze radius — META)','Yutyrannus (courage roar offsets the fear+freeze stack)','Carcharodontosaurus (knockback windows during stagger)','Giga (raw damage between freezes — bring backup)'],
			consumables:['Fria Curry (player cold protection in the Snow Dome)','Medical Brews (freezes lock you in attack range — high volume)','Battle Tartare (DPS windows between ice breaths)'],
			tips:['Field tame — destroy three corruption nodes in order: right ankle, right shoulder, chest','Spawn via the Ice Titan Terminal in the Snow Dome — bring tributes','Stay mobile — anything frozen takes 50% more damage from its next hit','Mek jump packs reset positioning when the freeze breath telegraphs'],
			avoid:['Standing still through the freeze breath (instant lockdown into 50%-bonus hits)','Bringing creatures that can\'t escape the trample (300 dmg per walk-over)','Burning it down for speed — post-tame HP is what you didn\'t take']
		},
		forest_titan: {
			creatures:['Mek with M.R.L.M. or M.S.C.M. saddle (expensive but reliable — META)','Velonasaur (rapid-fire ranged — 1 damage per shot but that IS the cap)','Burrowed Purlovia / Basilisk / Reaper King (infinite distraction underground)'],
			consumables:['Fabricated Sniper Rifle with stockpiled ammo (rapid clicks beat raw damage)','Medical Brews (vine grab is a 15k damage one-shot risk)','Battle Tartare (only attack-speed matters but every bit helps)'],
			tips:['Field tame — destroy both shoulder nodes first, THEN the chin node spawns','Summon at the Forest Titan Terminal (Forest Cave, north of the crater)','Damage caps at 1 per hit on corruption nodes — attack speed is everything','Burrowed tames make the fight trivial — Titans can\'t target underground'],
			avoid:['Standing on ground after the first node dies — vine grab yanks you out of your Mek','Bringing high-damage weapons expecting big numbers (cap is 1 per hit)','Forgetting tributes at the terminal']
		},

		// ─── Released but previously falling back to default ───
		overseer: {
			creatures:['Therizinosaurus (high DPS, small footprint — META across all three avatars)','Yutyrannus (courage roar through every phase)','Daeodon (passive healing for the long fight)'],
			consumables:['Sweet Vegetable Cakes (Theri regen between phases)','Medical Brews (multiple — this is a marathon)','Cold-resistance gear (the arena is freezing before Ascension)'],
			tips:['Three avatars in sequence: Broodmother → Megapithecus → Dragon. Each must die completely before the next','Kill Defense Units first when they spawn — they\'ll overwhelm a focused group','Use arena pillars as cover against the stun beams','Stay mounted — dismount attacks land hard during phase transitions'],
			avoid:['Bringing Rexes (Dragon phase fire damage shreds them)','Skipping ascendant saddles (lower tiers won\'t survive the fight length)','Forgetting cold protection — Ascension trigger is a brutal cold spike']
		},
		manticore: {
			creatures:['Rex (high HP/Melee — wait for it to land)','Yutyrannus (courage buff, no Yuti shoulder pet though)','Mantis groups with high-damage swords (paired with tanks)'],
			consumables:['Stimulants and water FOR YOU (the tail-spike torpor lands on the rider)','Medical Brews','Battle Tartare'],
			tips:['Boss only lands every few minutes when there are NO flyers and NO shoulder pets in the arena','Keep tames grouped tight — scattered positioning prevents it from landing','Burst damage during the brief landing windows is the whole fight','Stim yourself between volleys — torpor stacks fast on the rider'],
			avoid:['Bringing ANY flyer or shoulder pet (Glowtail, Featherlight, Bulbdog) — boss bugs into permanent flight mode','Spreading tames across the arena (boss won\'t descend)','Trying to stim your tames — tail-spike torpor only stims off you, not them']
		},
		center_combo: {
			creatures:['Megatherium (insect buff for Broodmother side)','Rex squad (general DPS)','Yutyrannus (courage across both fights)','Daeodon (constant healing)'],
			consumables:['Battle Tartare','Focal Chili','Medical Brews (this is a two-front war)'],
			tips:['Both bosses spawn AT THE SAME TIME — not sequential like other arenas','25-minute timer. Past that, every player, dino, and item in the arena is destroyed','Split the squad: dedicate Megatheriums to the Broodmother, Rexes to the Megapithecus','Yuti and Daeodon work for both halves — keep them centered between the two fights'],
			avoid:['Treating it like a solo Broodmother fight (Mega rocks will wipe a grouped squad)','Letting the timer run out (no loot, total wipe)','Splitting too evenly — one side needs to close out first or you run the clock']
		},
		nunatak: {
			creatures:['Rex (high HP — flyers and climbers are banned in this arena)','Yutyrannus (courage roar offsets the cold + minion stress)','Daeodon (healing is mandatory against Iceworm chip damage)','Pyromane (fire AoE clears Iceworm waves)'],
			consumables:['Fria Curry (player cold protection — arena is hazardous on its own)','Medical Brews (high volume)','Battle Tartare'],
			tips:['Nunatak can ONLY summon Iceworms while airborne — burn it down while it\'s grounded','Iceworm waves are the real threat, not the boss itself — keep AoE clear ready','Alpha has over a million HP — bring extra brews, this is a long fight','Movement-slow from the Ice Breath stacks with the cold debuff — stay positioned'],
			avoid:['Flyers and climbers (banned in the arena — Wyverns, Drakes, Bulbdogs all locked out)','Letting Iceworm waves stack while focusing the Wyvern','Going in without cold protection — the arena chips you outside of attacks']
		},
		grendel: {
			creatures:['Therizinosaurus (top DPS pick, durable)','Deinotherium (tank-DPS hybrid)','Stegosaurus with Veggie Cake (sustained tank)','Yutyrannus lead (courage buff)'],
			consumables:['Sweet Vegetable Cakes (Theri/Stego sustain)','Medical Brews','Battle Tartare'],
			tips:['Forsaken Oasis arena on Valguero — Grendel replaces the legacy Megapithecus/Dragon/Manticore trio','Theri + Yuti + Daeodon stack is the proven comp','Stego eats Veggie Cake on autopilot — set it before the gate','Grendel telegraphs hits — use the windups to reposition behind it'],
			avoid:['Bringing only DPS with no healer — fight runs long','Standing in front of the wind-up animation','Spreading damage across many low-HP tames — Grendel cleaves through soft squads']
		},

		// ─── Astraeos (Feb 2025) ───
		hydraskos: {
			creatures:['Stegosaurus (high-HP tank for the front)','Deinonychus (bleed stacking from the rear — META)','Therizinosaurus (28k+ HP, 700+ melee for direct DPS)','Daeodon (healing required)','Yutyrannus (courage)'],
			consumables:['Sweet Vegetable Cakes (Stego/Theri sustain)','Medical Brews','Extinguisher Grenades (drop the fire breath\'s burn DoT)'],
			tips:['Five heads = five simultaneous elemental breaths (fire, ice, dark, lightning, poison). Stay behind the body','Deinonychus rear-attack bleed stacks the boss faster than anything frontal','Stego tanks the front while DPS works the tail end','Wear elemental-mixed saddles — no single resist covers all five breaths'],
			avoid:['Engaging from the front — all five breaths land at once','Splitting attention across multiple heads (focus the body)','Going in without a healer — the chip damage compounds across the squad']
		},
		natrix: {
			creatures:['Spinosaurus (water buff + knockback in the swamp arena)','Rex (standard rush)','Deinosuchus (huge bite, strong stats)','Yutyrannus (courage)','Daeodon (healing for minion chip)'],
			consumables:['Lesser Antidote (Onyc disease + Titanoboa torpor land on you)','Medical Brews','Battle Tartare'],
			tips:['Minions (Araneo, Titanoboa, Onyc) do more damage than Natrix herself — clear them first','Snake-hair stun has a wind-up — break line of sight when you see it telegraph','Spinos get the swamp-water damage buff in this arena — bring at least one','Stay back, support the tames — getting stunned in the minion pile is how survivors die'],
			avoid:['Clustering tames where the minion waves spawn','Engaging at melee range as the rider (stun + minions = dead)','Skipping antidote — the disease + torpor combo locks you out fast']
		},
		thodes: {
			creatures:['Acrocanthosaurus (damage-reduction stance is gold against the club swings)','Rex','Yutyrannus (courage)','Daeodon (healer)','Equus (speed for dodging — niche but works)'],
			consumables:['Fabricated Rifle / Sniper (you NEED ranged to hit the eye)','Medical Brews','Battle Tartare'],
			tips:['Damage reduction is active until the eye pulses with energy — shoot the eye to enter the weak window','Weak window shows as a red mist around the boss — burn DPS during this state','Club has wide AoE that cleaves grouped tames — spread slightly between hits','Long attrition fight, especially on Alpha — bring extra brews'],
			avoid:['Going in without ranged weapons — without eye hits, damage is heavily reduced','Stacking all tames in one spot (club AoE wipes clusters)','Underestimating Alpha HP scaling — the fight is endurance']
		},
		thanatos: {
			creatures:['Giganotosaurus (rush burst)','Carcharodontosaurus (rush burst)','Dreadnoughtus (terrain advantage in Therokis)','Wyverns (mobility + breath attack)'],
			consumables:['Medical Brews (heavy)','Battle Tartare','Cooked Lamb Chops (sustain for the rush squad)'],
			tips:['World boss — roams Therokis, spawns for a short window, no tribute required','15-minute time limit once engaged — burst comp wins, slow fights lose','Lava rivers crisscross the arena — position around them, never inside','Weaker than King Titan and can\'t summon Lightning Creatures — the bones of the fight are simpler'],
			avoid:['Slow comp / attrition strategy (timer runs out before you finish)','Standing in or crossing lava rivers mid-fight','Forgetting to scout the spawn window — it\'s temporary, not persistent']
		},
		iceworm_queen: {
			creatures:['Mate-boosted Baryonyx pair (proven cheese — wins easily)','Or: one shield-tanking player + ranged DPS behind'],
			consumables:['Fria Curry (the dungeon path is frozen)','Medical Brews','Stimberries (stim yourself out of stun states)'],
			tips:['Dungeon clear, not a tiered arena — Ice Queen Labyrinth under the Frozen Dungeon (Ragnarok)','Boss level scales with player count: floor of 10, +10 per challenger','Mate-boosted Baryonyx makes this trivial — official-recommended cheese','Queen is stationary when engaged — first strike is hers, so pre-position behind cover'],
			avoid:['Walking up to her at melee range — large hitbox guarantees she lands the first hit','Going in with one squishy DPS comp — bring at least one tank','Forgetting cold gear for the dungeon approach']
		},

		// ─── Coming Soon — stubs so the no-fallback path doesn't surprise anyone ───
		soon_genesis1: {
			creatures:[], consumables:[],
			tips:['Not yet released. Genesis Part 1 (Ascended) is on the roadmap — tips will land when it ports to ASA.'],
			avoid:[]
		},
		soon_genesis2: {
			creatures:[], consumables:[],
			tips:['Not yet released. Genesis Part 2 (Ascended) is on the long-term roadmap — tips will land closer to launch.'],
			avoid:[]
		},
		soon_lost_island: {
			creatures:[], consumables:[],
			tips:['Not yet released. Dinopithecus King returns when Lost Island ports to ASA — tips will land then.'],
			avoid:[]
		},
		soon_crystal: {
			creatures:[], consumables:[],
			tips:['Not yet released. Crystal Wyvern Queen returns when Crystal Isles ports to ASA — tips will land then.'],
			avoid:[]
		},
		soon_fjordur: {
			creatures:[], consumables:[],
			tips:['Not yet released. Fenrisúlfr is currently deprioritized for ASA — tips will land if/when Fjordur is ported.'],
			avoid:[]
		}
	};

	function getBossTips(): BossTip | null {
		const bossId = String(session.bossId ?? '');
		return BOSS_TIPS[bossId] ?? null;
	}
	let draft        = $state('');
	let addOpen      = $state(false);
	let logOpen      = $state(false);
	let inviteOpen   = $state(false);
	let sending      = $state(false);
	let closed       = $state(session.status === 'closed');
	let bottom: HTMLDivElement;
	let pollTimer: ReturnType<typeof setInterval>;

	// Invite friends
	type FriendEntry = { id:number; friendId:number; nickname:string|null; discordName:string|null };
	let friends  = $state<FriendEntry[]>([]);
	let inviting = $state<number|null>(null);

	async function loadFriends() {
		const res = await fetch('/api/friends?status=accepted');
		if (res.ok) friends = await res.json();
		inviteOpen = true;
	}

	async function inviteFriend(friendId: number) {
		inviting = friendId;
		await fetch(`/api/arena/sessions/${session.id}/invite`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ friendUserId:friendId }) });
		inviting = null;
		alert('Invite sent! They\'ll see it in Notifications.');
	}

	// Log fight form
	let logOutcome    = $state<'success'|'failed'>('success');
	let logNotes      = $state('');
	let logSquad      = $state<{name:string; userId:number}[]>([]);
	let logCreatures  = $state<Record<string,unknown>[]>([]);
	let logDuration   = $state('');

	// Poll for new messages every 8 seconds when on chat tab
	onMount(() => {
		pollTimer = setInterval(async () => {
			if (closed || activeTab !== 'chat') return;
			const res = await fetch(`/api/arena/sessions/${session.id}/chat`);
			if (res.ok) {
				const fresh = await res.json() as ChatMsg[];
				if (fresh.length > messages.length) {
					messages = fresh;
					setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50);
				}
			}
		}, 8000);
	});
	onDestroy(() => clearInterval(pollTimer));

	function openLogFight() {
		logOpen = true;
		logOutcome = 'success';
		logNotes = '';
		logDuration = String(Math.round((Date.now() - new Date(String(session.createdAt)).getTime()) / 60000));
		logSquad = members.map(m => ({ name: display(m.user as Record<string,unknown>), userId: Number((m.user as Record<string,unknown>).id ?? 0) }));
		logCreatures = [...creatures];
	}

	async function logFight() {
		const dur = logDuration ? (parseInt(logDuration) || null) : null;
		await fetch('/api/boss-records', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossName:String(session.bossName), difficulty:String(session.difficulty), outcome:logOutcome, notes:logNotes||null, creaturesUsed:logCreatures.map(c => c.creatureData ?? c), squadMembers:logSquad, duration:dur }) });
		logOpen = false; alert('Fight recorded!');
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
	function ago(dt: string) {
		const d = new Date(dt);
		return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	}

	async function sendMsg() {
		if (!draft.trim() || sending) return;
		sending = true;
		const res = await fetch(`/api/arena/sessions/${session.id}/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ content:draft.trim(), messageType:'text' }) });
		if (res.ok) {
			const msg = await res.json();
			messages = [...messages, { ...msg, user:{ nickname:'You', discordName:null, email:null } }];
			draft = '';
			setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50);
		}
		sending = false;
	}

	async function addCreature(c: Creature) {
		const res = await fetch(`/api/arena/sessions/${session.id}/creatures/${c.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ creatureId:c.id, creatureData:c }) });
		if (res.ok) { const row = await res.json(); creatures = [...creatures, { ...row, user:{ nickname:'You', discordName:null, email:null } }]; addOpen = false; }
	}

	async function removeCreature(id: number) {
		await fetch(`/api/arena/sessions/${session.id}/creatures/${id}`, { method:'DELETE' });
		creatures = creatures.filter(c => (c.id as number) !== id);
	}

	async function closeRoom() {
		if (!confirm('Close this war room?')) return;
		await fetch(`/api/arena/sessions/${session.id}/close`, { method:'PUT' });
		closed = true;
	}
</script>

<div class="tek-stage war-page">
	<div class="tek-breadcrumb">
		<a href="/dossier">DASHBOARD</a><span class="sep">/</span><a href="/overseer">OVERSEER</a><span class="sep">/</span><span>WAR ROOM</span>
	</div>
	<div class="war-header">
		<a href="/overseer" class="tek-btn-v2 ghost sm">← Overseer</a>
		<div class="war-title-block">
			<div class="war-boss">{String(session.bossName)}</div>
			<div class="war-meta">
				<span class="war-meta-pill {String(session.difficulty).toLowerCase()}">{String(session.difficulty).toUpperCase()}</span>
				<span>· Code: <strong>{String(session.joinCode)}</strong></span>
				<span>· {members.length} online</span>
			</div>
		</div>
		<button class="tek-btn-v2 ghost sm" onclick={loadFriends}>
			<UserPlus size={13} strokeWidth={2.5} /> Invite
		</button>
		<button class="tek-btn-v2 sm" onclick={openLogFight}>
			<ScrollText size={13} strokeWidth={2.5} /> Log Fight
		</button>
		{#if isCreator && !closed}
			<button class="tek-btn-v2 danger sm" onclick={closeRoom}>Close Room</button>
		{/if}
		{#if closed}<span class="war-closed-tag">CLOSED</span>{/if}
	</div>

	<div class="tek-tabs">
		<button class="tek-tab" class:active={activeTab === 'chat'}    onclick={() => activeTab = 'chat'}>Chat</button>
		<button class="tek-tab" class:active={activeTab === 'roster'}  onclick={() => activeTab = 'roster'}>Roster</button>
		<button class="tek-tab" class:active={activeTab === 'members'} onclick={() => activeTab = 'members'}>Members <span class="count">{members.length}</span></button>
		<button class="tek-tab" class:active={activeTab === 'tips'}    onclick={() => activeTab = 'tips'}>Tips & Gear</button>
	</div>

	{#if activeTab === 'chat'}
		<div class="war-chat">
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
				<input class="form-control" placeholder="Type a message..." bind:value={draft}
					onkeydown={(e) => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendMsg(); } }} />
				<button class="btn btn-primary" onclick={sendMsg} disabled={sending||!draft.trim()}><Send size={14} /></button>
			</div>
		{/if}

	{:else if activeTab === 'roster'}
		<div class="war-roster-header">
			<div class="war-section-title">Creature Roster ({creatures.length})</div>
			{#if !closed}<button class="btn btn-primary btn-sm" onclick={() => addOpen=true}><Dna size={13} /> Add Specimen</button>{/if}
		</div>
		{#if creatures.length === 0}
			<div class="war-empty">No specimens added yet.</div>
		{:else}
			<div class="war-roster-grid">
				{#each creatures as c}
					{@const cd = (c.creatureData ?? c) as Record<string,unknown>}
					{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
					<div class="cham-shell war-creature" style="--cut:6px">
						<div class="war-creature-inner">
							<div class="war-c-species">{String(cd.species ?? '?')}</div>
							<div class="war-c-sub">{String(cd.name ?? 'Unnamed')} · Lvl {Number(cd.level ?? 1)}</div>
							<div class="war-c-stats"><span>HP {(bs.Health ?? 0).toLocaleString()}</span><span>Mel {bs.Melee ?? 0}%</span></div>
							<div class="war-c-by">by {display(c.user as Record<string,unknown>)}</div>
							{#if !closed && (c.userId as number) === myId}
								<button class="war-remove" onclick={() => removeCreature(c.id as number)}><X size={11} /></button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if activeTab === 'members'}
		<div class="war-member-list">
			{#each members as m}
				{@const md = m as Record<string,unknown>}
				{@const u = (md.user as Record<string,unknown>) ?? {}}
				{@const memberId = Number(u.id ?? 0)}
				<a href="/survivors/{memberId}" class="cham-shell war-member" style="--cut:6px;text-decoration:none">
					<div class="war-member-inner">{display(u)}</div>
				</a>
			{/each}
		</div>

	{:else}
		<!-- Tips & Gear tab -->
		{@const tips = getBossTips()}
		{#if !tips}
			<div class="war-tips">
				<div class="war-tip-card war-tip-full">
					<div class="war-tip-title">No tips logged yet</div>
					<div class="war-tip-item" style="color: var(--tek-text-dim)">
						This boss doesn't have a researched tips entry yet. We don't show generic advice here — wrong tips on a specific boss are worse than none. Check ark.wiki.gg for now, and the entry will land soon.
					</div>
				</div>
			</div>
		{:else}
		<div class="war-tips">
			{#if tips.creatures.length > 0 || tips.consumables.length > 0}
				<div class="war-tips-grid">
					{#if tips.creatures.length > 0}
					<!-- Recommended creatures -->
					<div class="war-tip-card">
						<div class="war-tip-title">Recommended Creatures</div>
						{#each tips.creatures as c}
							<div class="war-tip-item war-tip-creature">
								<span class="war-tip-bullet" style="background:rgba(34,197,94,0.6)"></span>{c}
							</div>
						{/each}
					</div>
					{/if}

					{#if tips.consumables.length > 0}
					<!-- Consumables -->
					<div class="war-tip-card">
						<div class="war-tip-title">Consumables & Gear</div>
						{#each tips.consumables as c}
							<div class="war-tip-item">
								<span class="war-tip-bullet" style="background:rgba(59,130,246,0.6)"></span>{c}
							</div>
						{/each}
					</div>
					{/if}
				</div>
			{/if}

			<!-- Strategy + What to Avoid intentionally hidden until per-boss
			     transcript-based rewrites land. Data preserved in BOSS_TIPS.{tips, avoid}. -->
		</div>
		{/if}
	{/if}
</div>

<!-- Add specimen modal -->
{#if addOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:520px">
		<div class="modal-header">
			<h2 class="modal-title">Add Specimen to Roster</h2>
			<button class="close-btn" onclick={() => addOpen=false}>&times;</button>
		</div>
		<div class="modal-body">
			{#if myCreatures.length === 0}
				<div style="color:#64748b">You have no specimens logged yet.</div>
			{:else}
				<div class="war-pick-grid">
					{#each myCreatures as c}
						{@const cd = c as Record<string,unknown>}
						<button class="cham-shell war-pick-btn" onclick={() => addCreature(c)} style="--cut:6px">
							<div class="war-pick-inner">
								<div class="war-c-species">{String(cd.species ?? '?')}</div>
								<div class="war-c-sub">{String(cd.name ?? 'Unnamed')} · Lvl {Number(cd.level ?? 1)}</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<!-- Invite friends modal -->
{#if inviteOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:440px">
		<div class="modal-header">
			<h2 class="modal-title">Invite to War Room</h2>
			<button class="close-btn" onclick={() => inviteOpen=false}>&times;</button>
		</div>
		<div class="modal-body">
			<div style="color:#64748b;font-size:0.8rem;margin-bottom:14px">Join code: <strong style="color:#f1f5f9;font-family:monospace">{String(session.joinCode)}</strong> — share this code or invite directly:</div>
			{#if friends.length === 0}
				<div style="color:#475569;font-size:0.86rem">No friends yet. Add them from the Network page.</div>
			{:else}
				<div style="display:flex;flex-direction:column;gap:5px">
					{#each friends as f}
						<div class="cham-shell" style="--cut:5px">
							<div style="background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1));padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px">
								<span style="font-size:0.88rem;color:#f1f5f9">{f.nickname ?? f.discordName ?? 'Survivor'}</span>
								<button class="btn btn-primary btn-sm" onclick={() => inviteFriend(f.friendId)} disabled={inviting === f.friendId}>
									{inviting === f.friendId ? 'Sending...' : 'Invite'}
								</button>
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

<!-- Log fight modal -->
{#if logOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:580px">
		<div class="modal-header">
			<h2 class="modal-title">Log Boss Fight</h2>
			<button class="close-btn" onclick={() => logOpen=false}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:16px">
			<div style="color:#94a3b8;font-size:0.82rem;font-family:monospace">{String(session.bossName)} · {String(session.difficulty).toUpperCase()}</div>

			<!-- Outcome + Duration -->
			<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
				<div class="plan-field">
					<div class="form-label">Outcome</div>
					<div style="display:flex;gap:8px">
						<button class="btn btn-sm" class:btn-primary={logOutcome==='success'} class:btn-secondary={logOutcome!=='success'} onclick={() => logOutcome='success'}>⚔ Victory</button>
						<button class="btn btn-sm" class:btn-danger={logOutcome==='failed'} class:btn-secondary={logOutcome!=='failed'} onclick={() => logOutcome='failed'}>✗ Defeat</button>
					</div>
				</div>
				<div class="plan-field">
					<label class="form-label" for="log-duration">Duration (minutes)</label>
					<input id="log-duration" type="number" min="1" class="form-control" bind:value={logDuration} placeholder="e.g. 12" />
				</div>
			</div>

			<!-- Squad -->
			<div class="plan-field">
				<div class="form-label">Squad ({logSquad.length})</div>
				{#if logSquad.length === 0}
					<div style="color:#475569;font-size:0.8rem">No members loaded.</div>
				{:else}
					<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
						{#each logSquad as member, i}
							<div class="log-id-tag">
								<a href="/survivors/{member.userId}" style="color:#7dd3fc;text-decoration:none">{member.name}</a>
								<button onclick={() => logSquad = logSquad.filter((_,j) => j !== i)} style="background:none;border:none;cursor:pointer;color:#475569;font-size:1rem;padding:0 0 1px 4px" aria-label="Remove">×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Creatures -->
			<div class="plan-field">
				<div class="form-label">Tames ({logCreatures.length})</div>
				{#if logCreatures.length === 0}
					<div style="color:#475569;font-size:0.8rem">No tames loaded.</div>
				{:else}
					<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
						{#each logCreatures as c, i}
							{@const cd = (c.creatureData ?? c) as Record<string,unknown>}
							<div class="log-id-tag">
								<span style="color:#f1f5f9">{String(cd.species ?? '?')} "{String(cd.name ?? 'Unnamed')}"</span>
								<button onclick={() => logCreatures = logCreatures.filter((_,j) => j !== i)} style="background:none;border:none;cursor:pointer;color:#475569;font-size:1rem;padding:0 0 1px 4px" aria-label="Remove">×</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Notes -->
			<div class="plan-field">
				<label class="form-label" for="log-notes">Notes</label>
				<textarea id="log-notes" class="form-control" rows="2" bind:value={logNotes} placeholder="How did it go?"></textarea>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => logOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={logFight}>Save Record</button>
		</div>
	</div>
</div>
{/if}

<style>
.war-page { display:flex; flex-direction:column; max-width:800px; }
.war-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin: 16px 0 18px;
	flex-wrap: wrap;
	padding: 16px 20px;
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
	border: 1px solid rgba(0,180,255,0.18);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	position: relative;
}
.war-header::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: linear-gradient(180deg, var(--tek-amber), var(--tek-red));
	box-shadow: 0 0 6px rgba(245,158,11,0.5);
}
.war-title-block { flex: 1; min-width: 200px; }
.war-meta-pill {
	font-family: var(--tek-mono);
	font-size: 0.62rem;
	letter-spacing: 0.16em;
	padding: 2px 7px;
	margin-right: 4px;
	border: 1px solid currentColor;
	clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.war-meta-pill.gamma  { color: var(--tek-green); }
.war-meta-pill.beta   { color: var(--tek-blue); }
.war-meta-pill.alpha  { color: var(--tek-pink); }
.war-meta-pill.titan  { color: var(--tier-diamond); }
.war-title-block { flex:1; min-width:0; }
.war-boss {
	font-family: var(--tek-display);
	font-size: clamp(1.2rem, 3vw, 1.6rem);
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--tek-text);
	line-height: 1.1;
	margin-bottom: 6px;
}
.war-meta {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	letter-spacing: 0.08em;
	color: var(--tek-text-dim);
	display: flex;
	gap: 4px;
	flex-wrap: wrap;
	align-items: center;
}
.war-meta strong { color: var(--tek-amber); }
.war-closed-tag {
	font-family: var(--tek-mono);
	font-size: 0.62rem;
	font-weight: 800;
	letter-spacing: 0.16em;
	color: var(--tek-red);
	background: rgba(239,68,68,0.10);
	border: 1px solid rgba(239,68,68,0.40);
	padding: 4px 10px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	text-transform: uppercase;
}

/* Old .war-tabs / .war-tab — superseded by .tek-tabs (kept here as no-op so legacy code doesn't break) */
.war-tabs { display: none; }

.war-chat { display:flex; flex-direction:column; gap:8px; min-height:300px; max-height:400px; overflow-y:auto; margin-bottom:12px; }
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
.war-creature-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; position:relative; }
.war-c-species { font-size:0.88rem; font-weight:700; color:#f1f5f9; }
.war-c-sub { font-size:0.72rem; color:#60a5fa; margin-top:2px; }
.war-c-stats { display:flex; gap:10px; margin-top:6px; font-size:0.72rem; color:#64748b; }
.war-c-by { font-size:0.65rem; color:#334155; margin-top:4px; }
.war-remove { position:absolute; top:8px; right:8px; background:rgba(239,68,68,0.15); border:none; color:#f87171; cursor:pointer; display:flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; }
.war-empty { color:#475569; padding:24px 0; font-size:0.88rem; }

.war-pick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:8px; }
.war-pick-btn { background:none; border:none; cursor:pointer; text-align:left; width:100%; }
.war-pick-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; }

.war-member-list { display:flex; flex-direction:column; gap:5px; }
.war-member { --cut:5px; }
.war-member-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; font-size:0.88rem; color:#f1f5f9; }

/* Tips tab */
.war-tips { display:flex; flex-direction:column; gap:10px; }
.war-tips-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
@media (max-width:600px) { .war-tips-grid { grid-template-columns:1fr; } }
.war-tip-card { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); display:flex; flex-direction:column; gap:7px; }
.war-tip-full { }
.war-tip-danger { background:linear-gradient(160deg,rgba(20,8,8,0.97),rgba(10,4,4,1)); }
.war-tip-title { font-size:0.64rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; margin-bottom:4px; }
.war-tip-item { display:flex; align-items:flex-start; gap:9px; font-size:0.82rem; color:#94a3b8; line-height:1.5; }
.war-tip-bullet { width:6px; height:6px; border-radius:50%; flex-shrink:0; margin-top:6px; }
.war-tip-creature { color:#f1f5f9; }

.log-id-tag {
    display: inline-flex;
    align-items: center;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.20);
    padding: 3px 6px 3px 9px;
    font-size: 0.78rem;
    font-family: monospace;
}
</style>
