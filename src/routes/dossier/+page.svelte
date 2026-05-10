<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	let editOpen = $state(false);
	let pinOpen  = $state(false);
	let saving   = $state(false);
	let editErr  = $state('');

	let nickname   = $state(data.profile?.nickname ?? '');
	let bio        = $state(data.profile?.bio ?? '');
	let lookingFor = $state(data.profile?.lookingFor ?? '');

	let pinnedIds = $state<number[]>(
		Array.isArray(data.profile?.pinnedCreatures) ? (data.profile.pinnedCreatures as number[]) : []
	);

	const joined = new Date(data.profile?.createdAt ?? Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	const displayName = data.profile?.nickname ?? data.profile?.email ?? 'Survivor';

	const STATS = ['Health','Stamina','Oxygen','Food','Weight','Melee','Crafting'];

	async function saveProfile() {
		saving = true; editErr = '';
		const res = await fetch('/api/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ nickname: nickname || null, bio: bio || null, lookingFor: lookingFor || null })
		});
		if (res.ok) { editOpen = false; location.reload(); }
		else { editErr = (await res.json()).error ?? 'Save failed'; saving = false; }
	}

	function togglePin(id: number) {
		if (pinnedIds.includes(id)) pinnedIds = pinnedIds.filter(x => x !== id);
		else if (pinnedIds.length < 6) pinnedIds = [...pinnedIds, id];
	}

	async function savePins() {
		saving = true;
		await fetch('/api/profile/pinned', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ids: pinnedIds })
		});
		pinOpen = false; saving = false; location.reload();
	}
</script>

<div class="std-page">
	<!-- Hero -->
	<div class="dos-hero">
		<div class="dos-avatar">⬡</div>
		<div class="dos-hero-info">
			<h1 class="dos-name">{displayName}</h1>
			<div class="dos-sub">ARK Survivor · Joined {joined}</div>
			{#if data.tribe}<div class="dos-tribe">🛡️ {data.tribe.name}</div>{/if}
			{#if data.profile?.bio}<p class="dos-bio">{data.profile.bio}</p>{/if}
			{#if data.profile?.lookingFor}<div class="dos-looking">👀 Looking for: {data.profile.lookingFor}</div>{/if}
		</div>
		<button class="btn btn-secondary btn-sm dos-edit-btn" onclick={() => editOpen = true}>✏️ Edit Profile</button>
	</div>

	<!-- Stats bar -->
	<div class="dos-stats">
		<div class="dos-stat"><span class="dos-stat-val">{data.creatures.length}</span><span class="dos-stat-lbl">Specimens</span></div>
		<div class="dos-stat"><span class="dos-stat-val">{data.speciesOwned}</span><span class="dos-stat-lbl">Species</span></div>
		<div class="dos-stat"><span class="dos-stat-val">{data.friendCount}</span><span class="dos-stat-lbl">Friends</span></div>
		{#if data.tribe}<div class="dos-stat"><span class="dos-stat-val">🛡️</span><span class="dos-stat-lbl">{data.tribe.name}</span></div>{/if}
	</div>

	<!-- Pinned Specimens -->
	<div class="dos-section-header">
		<h2 class="dos-section-title">📌 Pinned Specimens</h2>
		<button class="btn btn-secondary btn-sm" onclick={() => { pinnedIds = Array.isArray(data.profile?.pinnedCreatures) ? (data.profile.pinnedCreatures as number[]) : []; pinOpen = true; }}>Edit Pins</button>
	</div>

	{#if data.pinned.length === 0}
		<div class="dos-empty">No pinned specimens yet. Click "Edit Pins" to feature your best creatures.</div>
	{:else}
		<div class="dos-pinned-grid">
			{#each data.pinned as c}
				{@const cd = c as Record<string, unknown>}
				{@const bs = (cd.baseStats as Record<string, number>) ?? {}}
				{@const muts = (cd.mutations as Record<string, number>) ?? {}}
				{@const totalMuts = Object.values(muts).reduce((a, b) => a + b, 0)}
				<div class="dos-pin-card">
					<div class="dos-pin-name">{String(cd.name ?? 'Unnamed')}</div>
					<div class="dos-pin-species">{String(cd.species ?? '?')} · Lvl {Number(cd.level ?? 1)} · {String(cd.gender ?? '?')}</div>
					<div class="dos-pin-stats">
						{#each STATS.slice(0,4) as s}
							<span>{s.slice(0,3)} <strong>{bs[s] ?? 0}{s === 'Melee' || s === 'Crafting' ? '%' : ''}</strong></span>
						{/each}
						<span>Muts <strong>{totalMuts}</strong></span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit Profile Modal -->
{#if editOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header">
			<h2 class="modal-title">✏️ Edit Profile</h2>
			<button class="close-btn" onclick={() => editOpen = false}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
			<div class="plan-field">
				<label class="form-label">Callsign (nickname)</label>
				<input class="form-control" type="text" bind:value={nickname} placeholder="Leave blank to use email" />
			</div>
			<div class="plan-field">
				<label class="form-label">Bio</label>
				<textarea class="form-control" rows="3" bind:value={bio} placeholder="Tell survivors about yourself..."></textarea>
			</div>
			<div class="plan-field">
				<label class="form-label">Looking For</label>
				<input class="form-control" type="text" bind:value={lookingFor} placeholder="e.g. Mutation breeding partner, boss tribe..." />
			</div>
			{#if editErr}<div class="tek-login-error">{editErr}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => editOpen = false}>Cancel</button>
			<button class="btn btn-primary" onclick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Pin Creatures Modal -->
{#if pinOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:620px">
		<div class="modal-header">
			<h2 class="modal-title">📌 Pin Your Best Specimens</h2>
			<button class="close-btn" onclick={() => pinOpen = false}>&times;</button>
		</div>
		<div class="modal-body">
			<div style="color:#94a3b8;font-size:0.88rem;margin-bottom:14px">Select up to 6 specimens. <span style="color:var(--tek-blue)">{pinnedIds.length}/6 selected</span></div>
			<div class="pin-picker-grid">
				{#each data.creatures as c}
					{@const cd = c as Record<string, unknown>}
					{@const sel = pinnedIds.includes(c.id as number)}
					<button
						class="pin-pick-card"
						class:selected={sel}
						onclick={() => togglePin(c.id as number)}
						disabled={!sel && pinnedIds.length >= 6}
					>
						<div class="pin-pick-name">{String(cd.name ?? 'Unnamed')}</div>
						<div class="pin-pick-species">{String(cd.species ?? '?')} · Lvl {Number(cd.level ?? 1)}</div>
						{#if sel}<div class="pin-pick-check">✓</div>{/if}
					</button>
				{/each}
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => pinOpen = false}>Cancel</button>
			<button class="btn btn-primary" onclick={savePins} disabled={saving}>{saving ? 'Saving...' : 'Save Pins'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.dos-hero { display:flex; align-items:flex-start; gap:20px; background:var(--tek-card-bg,linear-gradient(160deg,rgba(14,26,54,.88),rgba(5,10,24,.94))); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:16px; padding:28px; margin-bottom:20px; position:relative; }
.dos-avatar { font-size:3rem; flex-shrink:0; width:64px; height:64px; display:flex; align-items:center; justify-content:center; background:rgba(0,180,255,.1); border:1px solid rgba(0,180,255,.3); border-radius:50%; }
.dos-hero-info { flex:1; min-width:0; }
.dos-name { font-size:1.6rem; font-weight:700; color:#f1f5f9; margin:0 0 4px; }
.dos-sub { color:#64748b; font-size:0.85rem; margin-bottom:8px; }
.dos-tribe { color:#a78bfa; font-size:0.85rem; margin-bottom:6px; }
.dos-bio { color:#94a3b8; font-size:0.9rem; margin:8px 0 4px; line-height:1.5; }
.dos-looking { color:#60a5fa; font-size:0.85rem; margin-top:6px; }
.dos-edit-btn { position:absolute; top:20px; right:20px; }

.dos-stats { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
.dos-stat { background:var(--tek-card-bg,rgba(14,26,54,.7)); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:12px; padding:14px 20px; text-align:center; min-width:80px; }
.dos-stat-val { display:block; font-size:1.5rem; font-weight:700; color:#f1f5f9; }
.dos-stat-lbl { font-size:0.72rem; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }

.dos-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.dos-section-title { font-size:1rem; font-weight:600; color:#f1f5f9; margin:0; }
.dos-empty { color:#64748b; padding:24px 0; font-size:0.9rem; }

.dos-pinned-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:28px; }
.dos-pin-card { background:var(--tek-card-bg,rgba(14,26,54,.8)); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:12px; padding:14px; }
.dos-pin-name { font-weight:600; color:#f1f5f9; margin-bottom:3px; }
.dos-pin-species { color:#60a5fa; font-size:0.8rem; margin-bottom:8px; }
.dos-pin-stats { display:flex; gap:8px; flex-wrap:wrap; }
.dos-pin-stats span { font-size:0.75rem; color:#64748b; }
.dos-pin-stats strong { color:#94a3b8; }

.pin-picker-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; max-height:380px; overflow-y:auto; padding:2px; }
.pin-pick-card { background:#0f172a; border:2px solid #1e293b; border-radius:8px; padding:12px; cursor:pointer; text-align:left; position:relative; transition:border-color .15s,background .15s; }
.pin-pick-card:hover { border-color:#3b82f6; }
.pin-pick-card.selected { border-color:#22c55e; background:#052e16; }
.pin-pick-card:disabled { opacity:.4; cursor:not-allowed; }
.pin-pick-name { color:#f1f5f9; font-weight:600; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pin-pick-species { color:#60a5fa; font-size:0.75rem; margin-top:2px; }
.pin-pick-check { position:absolute; top:6px; right:8px; color:#22c55e; font-weight:700; }
</style>
