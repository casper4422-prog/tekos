<script lang="ts">
	import { Sword, Users, Plus, LogIn } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Boss = { id:string; name:string; map:string; difficulties:string[] };
	type Session = Record<string,unknown>;

	const bosses   = data.bosses as Boss[];
	const sessions = data.sessions as Session[];

	let creating   = $state<Boss|null>(null);
	let difficulty = $state('alpha');
	let joinCode   = $state('');
	let saving     = $state(false);

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
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Overseer</h1>
			<div class="page-subtitle">Boss encounters &amp; war rooms</div>
		</div>
	</div>

	<!-- Join with code -->
	<div class="ov-join-row">
		<input class="form-control" style="max-width:200px;text-transform:uppercase" placeholder="Join Code" bind:value={joinCode} maxlength={6} />
		<button class="btn btn-secondary" onclick={joinSession}><LogIn size={14} /> Join Room</button>
	</div>

	<!-- Open sessions -->
	{#if sessions.length > 0}
		<div class="ov-section-title">Open War Rooms</div>
		<div class="ov-sessions">
			{#each sessions as s}
				{@const sd = s as Record<string,unknown>}
				<a class="cham-shell ov-session" href="/overseer/{sd.id}" style="--cut:8px">
					<div class="ov-session-inner">
						<div class="ov-session-info">
							<div class="ov-session-boss">{String(sd.bossName)}</div>
							<div class="ov-session-meta">{String(sd.difficulty).toUpperCase()} · {String(sd.joinCode)} · {(sd.memberCount as number)} member{(sd.memberCount as number) !== 1 ? 's' : ''}</div>
						</div>
						<button class="btn btn-primary btn-sm"><Users size={13} /> Join</button>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Boss list -->
	<div class="ov-section-title">Select Boss</div>
	<div class="ov-boss-grid">
		{#each bosses as b}
			<div class="cham-shell ov-boss-card" style="--cut:9px">
				<div class="ov-boss-inner">
					<div class="ov-boss-name">{b.name}</div>
					<div class="ov-boss-map">{b.map}</div>
					<div class="ov-boss-diffs">
						{#each b.difficulties as d}
							<button class="ov-diff-btn {d}" onclick={() => { creating = b; difficulty = d; }}>{d}</button>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- My fight history -->
	{#if (data.records as Record<string,unknown>[]).length > 0}
		<div class="ov-section-title" style="margin-top:28px">My Fight History</div>
		<div class="ov-records">
			{#each data.records as Record<string,unknown>[] as r}
				{@const rd = r as Record<string,unknown>}
				<div class="cham-shell ov-record" style="--cut:5px;--cat-rgb:{rd.outcome==='success' ? '34,197,94' : '239,68,68'}">
					<div class="ov-record-inner">
						<div class="ov-record-boss">{String(rd.bossName)}</div>
						<div class="ov-record-meta">{String(rd.difficulty ?? '?').toUpperCase()} · {rd.mapName ? String(rd.mapName) : ''}</div>
						<div class="ov-record-outcome" class:win={rd.outcome==='success'}>{rd.outcome === 'success' ? 'Victory' : 'Defeat'}</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create modal -->
{#if creating}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:400px">
		<div class="modal-header">
			<h2 class="modal-title">Create War Room</h2>
			<button class="close-btn" onclick={() => creating=null}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div style="color:#94a3b8;font-size:0.9rem">{creating.name} — {creating.map}</div>
			<div class="plan-field">
				<label class="form-label" for="diff">Difficulty</label>
				<select id="diff" class="form-control" bind:value={difficulty}>
					{#each creating.difficulties as d}<option value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>{/each}
				</select>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => creating=null}>Cancel</button>
			<button class="btn btn-primary" onclick={createSession} disabled={saving}>{saving ? 'Creating...' : 'Create War Room'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.ov-join-row { display:flex; gap:10px; margin-bottom:24px; align-items:center; }
.ov-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:12px; margin-top:4px; }

.ov-sessions { display:flex; flex-direction:column; gap:6px; margin-bottom:28px; }
.ov-session { display:block; text-decoration:none; color:inherit; }
.ov-session-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 16px; display:flex; align-items:center; gap:12px; }
.ov-session-info { flex:1; }
.ov-session-boss { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.ov-session-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }

.ov-boss-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.ov-boss-card { --cut:9px; }
.ov-boss-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:16px 18px; display:flex; flex-direction:column; gap:8px; }
.ov-boss-name { font-size:0.95rem; font-weight:700; color:#f1f5f9; }
.ov-boss-map { font-size:0.72rem; color:#64748b; }
.ov-boss-diffs { display:flex; gap:6px; }
.ov-diff-btn { border:none; cursor:pointer; font-size:0.68rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:4px 10px; font-family:inherit; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.ov-diff-btn.gamma { background:rgba(34,197,94,0.15); color:#4ade80; }
.ov-diff-btn.beta  { background:rgba(59,130,246,0.15); color:#60a5fa; }
.ov-diff-btn.alpha { background:rgba(239,68,68,0.15);  color:#f87171; }
.ov-records { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:8px; }
.ov-record { --cut:5px; }
.ov-record-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; display:grid; grid-template-columns:1fr auto auto; align-items:center; gap:10px; }
.ov-record-boss { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.ov-record-meta { font-size:0.68rem; color:#475569; }
.ov-record-outcome { font-size:0.68rem; font-weight:700; color:#ef4444; }
.ov-record-outcome.win { color:#4ade80; }
</style>
