<script lang="ts">
	import { Send, X, Dna, Users, ScrollText, UserPlus } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Session = Record<string,unknown>;
	type ChatMsg = { id:number; content:string; messageType:string; createdAt:string; user:{ nickname:string|null; email:string } };
	type Creature = Record<string,unknown> & { id:number };

	const session     = data.session as Session;
	const myId        = data.myId as number;
	const myCreatures = data.myCreatures as Creature[];
	const isCreator   = (session.creatorUserId as number) === myId;

	let messages  = $state<ChatMsg[]>((session.chats as ChatMsg[]) ?? []);
	let creatures = $state<Record<string,unknown>[]>((session.creatures as Record<string,unknown>[]) ?? []);
	let members   = $state<Record<string,unknown>[]>((session.members as Record<string,unknown>[]) ?? []);

	let activeTab   = $state<'chat'|'roster'|'members'|'tips'>('chat');

	// Boss tips database — covers all ASA bosses
	type BossTip = { creatures:string[]; consumables:string[]; tips:string[]; avoid:string[] };
	const BOSS_TIPS: Record<string, BossTip> = {
		default: {
			creatures:['Rex (high HP + Melee)','Yutyrannus (courage buff)','Daeodon (passive healing)'],
			consumables:['Focal Chili (player movement)','Lazarus Chowder (water saving)','Battle Tartare (player damage)'],
			tips:['Bring a Yutyrannus for the +25% courage buff','Place Daeodon on passive — it will auto-heal nearby dinos','Put your best creatures on passive until you need them','Saddle armor matters more than creature level for survival'],
			avoid:['Flyers (arenas are closed)','Creatures with low saddle armor','Overloading too many creatures — quality over quantity']
		},
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
		}
	};

	function getBossTips(): BossTip {
		const bossId = String(session.bossId ?? '');
		return BOSS_TIPS[bossId] ?? BOSS_TIPS.default;
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
	type FriendEntry = { id:number; friendId:number; nickname:string|null; email:string };
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
	let logOutcome = $state<'success'|'failed'>('success');
	let logNotes   = $state('');

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

	async function logFight() {
		await fetch('/api/boss-records', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ bossName:String(session.bossName), difficulty:String(session.difficulty), outcome:logOutcome, notes:logNotes||null, creaturesUsed:creatures.map(c => c.creatureData ?? c) }) });
		logOpen = false; alert('Fight recorded!');
	}

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.email ?? 'Unknown') as string; }
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
			messages = [...messages, { ...msg, user:{ nickname:null, email:'You' } }];
			draft = '';
			setTimeout(() => bottom?.scrollIntoView({ behavior:'smooth' }), 50);
		}
		sending = false;
	}

	async function addCreature(c: Creature) {
		const res = await fetch(`/api/arena/sessions/${session.id}/creatures/${c.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ creatureId:c.id, creatureData:c }) });
		if (res.ok) { const row = await res.json(); creatures = [...creatures, { ...row, user:{ nickname:null, email:'You' } }]; addOpen = false; }
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

<div class="std-page war-page">
	<div class="war-header">
		<a href="/overseer" class="btn btn-secondary btn-sm">← Overseer</a>
		<div class="war-title-block">
			<div class="war-boss">{String(session.bossName)}</div>
			<div class="war-meta">{String(session.difficulty).toUpperCase()} · Code: <strong>{String(session.joinCode)}</strong> · {members.length} online</div>
		</div>
		<button class="btn btn-secondary" onclick={loadFriends}>
			<UserPlus size={13} /> Invite
		</button>
		<button class="btn btn-secondary" onclick={() => { logOpen=true; logOutcome='success'; logNotes=''; }}>
			<ScrollText size={13} /> Log Fight
		</button>
		{#if isCreator && !closed}
			<button class="btn btn-danger" onclick={closeRoom}>Close Room</button>
		{/if}
		{#if closed}<span class="war-closed-tag">CLOSED</span>{/if}
	</div>

	<div class="war-tabs">
		{#each [['chat','Chat'],['roster','Roster'],['members','Members'],['tips','Tips & Gear']] as [t,label]}
			<button class="war-tab" class:active={activeTab === t} onclick={() => activeTab = t as 'chat'|'roster'|'members'|'tips'}>{label}</button>
		{/each}
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
				<div class="cham-shell war-member" style="--cut:6px">
					<div class="war-member-inner">{display(md.user as Record<string,unknown>)}</div>
				</div>
			{/each}
		</div>

	{:else}
		<!-- Tips & Gear tab -->
		{@const tips = getBossTips()}
		<div class="war-tips">
			<div class="war-tips-grid">
				<!-- Recommended creatures -->
				<div class="war-tip-card">
					<div class="war-tip-title">Recommended Creatures</div>
					{#each tips.creatures as c}
						<div class="war-tip-item war-tip-creature">
							<span class="war-tip-bullet" style="background:rgba(34,197,94,0.6)"></span>{c}
						</div>
					{/each}
				</div>

				<!-- Consumables -->
				<div class="war-tip-card">
					<div class="war-tip-title">Consumables & Gear</div>
					{#each tips.consumables as c}
						<div class="war-tip-item">
							<span class="war-tip-bullet" style="background:rgba(59,130,246,0.6)"></span>{c}
						</div>
					{/each}
				</div>
			</div>

			<!-- Strategy tips -->
			<div class="war-tip-card war-tip-full">
				<div class="war-tip-title">Strategy</div>
				{#each tips.tips as t}
					<div class="war-tip-item">
						<span class="war-tip-bullet" style="background:rgba(0,180,255,0.6)"></span>{t}
					</div>
				{/each}
			</div>

			<!-- What to avoid -->
			<div class="war-tip-card war-tip-full war-tip-danger">
				<div class="war-tip-title">What to Avoid</div>
				{#each tips.avoid as a}
					<div class="war-tip-item">
						<span class="war-tip-bullet" style="background:rgba(239,68,68,0.6)"></span>{a}
					</div>
				{/each}
			</div>
		</div>
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
				<div style="color:#64748b">No specimens in your vault yet.</div>
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
								<span style="font-size:0.88rem;color:#f1f5f9">{f.nickname ?? f.email}</span>
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
	<div class="modal-content" style="max-width:420px">
		<div class="modal-header">
			<h2 class="modal-title">Log Boss Fight</h2>
			<button class="close-btn" onclick={() => logOpen=false}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div style="color:#94a3b8;font-size:0.88rem">{String(session.bossName)} · {String(session.difficulty).toUpperCase()}</div>
			<div class="plan-field">
				<label class="form-label">Outcome</label>
				<div style="display:flex;gap:8px">
					<button class="btn btn-sm" class:btn-primary={logOutcome==='success'} class:btn-secondary={logOutcome!=='success'} onclick={() => logOutcome='success'}>Victory</button>
					<button class="btn btn-sm" class:btn-danger={logOutcome==='failed'} class:btn-secondary={logOutcome!=='failed'}  onclick={() => logOutcome='failed'}>Defeat</button>
				</div>
			</div>
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
.war-header { display:flex; align-items:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
.war-title-block { flex:1; min-width:0; }
.war-boss { font-size:1.1rem; font-weight:700; color:#f1f5f9; }
.war-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }
.war-closed-tag { font-size:0.65rem; font-weight:800; letter-spacing:0.1em; color:#ef4444; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:3px 10px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }

.war-tabs { display:flex; gap:4px; margin-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06); }
.war-tab { background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-size:0.82rem; font-weight:500; padding:7px 14px; cursor:pointer; margin-bottom:-1px; font-family:inherit; }
.war-tab.active { color:#f1f5f9; border-bottom-color:#00b4ff; }

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
</style>
