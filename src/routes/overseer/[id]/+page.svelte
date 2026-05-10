<script lang="ts">
	import { Send, X, Dna, Users, MessageSquare } from 'lucide-svelte';
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

	let activeTab   = $state<'chat'|'roster'|'members'>('chat');
	let draft       = $state('');
	let addOpen     = $state(false);
	let sending     = $state(false);
	let closed      = $state(session.status === 'closed');
	let bottom: HTMLDivElement;

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
		{#if isCreator && !closed}
			<button class="btn btn-danger btn-sm" onclick={closeRoom}>Close Room</button>
		{/if}
		{#if closed}<span class="war-closed-tag">CLOSED</span>{/if}
	</div>

	<div class="war-tabs">
		{#each [['chat','Chat'],['roster','Roster'],['members','Members']] as [t,label]}
			<button class="war-tab" class:active={activeTab === t} onclick={() => activeTab = t as 'chat'|'roster'|'members'}>{label}</button>
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

	{:else}
		<div class="war-member-list">
			{#each members as m}
				{@const md = m as Record<string,unknown>}
				<div class="cham-shell war-member" style="--cut:6px">
					<div class="war-member-inner">{display(md.user as Record<string,unknown>)}</div>
				</div>
			{/each}
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
</style>
