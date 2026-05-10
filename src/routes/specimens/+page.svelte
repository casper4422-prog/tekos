<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Creature = Record<string, unknown> & { id: number };

	const STATS = [
		{ key: 'Health',   icon: '❤️',  pct: false },
		{ key: 'Stamina',  icon: '⚡',  pct: false },
		{ key: 'Oxygen',   icon: '💧',  pct: false },
		{ key: 'Food',     icon: '🍖',  pct: false },
		{ key: 'Weight',   icon: '🏋️',  pct: false },
		{ key: 'Melee',    icon: '⚔️',  pct: true  },
		{ key: 'Crafting', icon: '🔧',  pct: true  },
	];

	let creatures    = $state<Creature[]>(data.creatures as Creature[]);
	let view         = $state<'expanded'|'compact'>('expanded');
	let search       = $state('');
	let sortBy       = $state('newest');
	let addOpen      = $state(false);
	let editOpen     = $state(false);
	let editTarget   = $state<Creature | null>(null);
	let saving       = $state(false);
	let formErr      = $state('');

	let fName        = $state('');
	let fSpecies     = $state('');
	let fLevel       = $state(1);
	let fGender      = $state('Male');
	let fServer      = $state('');
	let fNotes       = $state('');
	let fCryopodded  = $state(false);
	let fNeutered    = $state(false);
	let fMaleBreeder = $state(false);
	let fStats       = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });
	let fMuts        = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });

	function getSpeciesList(): string[] {
		if (typeof window === 'undefined') return [];
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,unknown> | undefined;
		return db ? Object.keys(db).sort() : [];
	}

	function totalMuts(c: Creature) {
		const m = (c.mutations as Record<string,number>) ?? {};
		return Object.values(m).reduce((a, b) => a + b, 0);
	}

	function getFiltered(): Creature[] {
		let list = creatures;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(c => String(c.name ?? '').toLowerCase().includes(q) || String(c.species ?? '').toLowerCase().includes(q));
		}
		const sorted = [...list];
		if (sortBy === 'name')    sorted.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
		else if (sortBy === 'level') sorted.sort((a, b) => (b.level as number ?? 0) - (a.level as number ?? 0));
		else if (sortBy === 'muts')  sorted.sort((a, b) => totalMuts(b) - totalMuts(a));
		else if (sortBy === 'oldest') sorted.sort((a, b) => (a.id as number) - (b.id as number));
		else sorted.sort((a, b) => (b.id as number) - (a.id as number));
		return sorted;
	}

	function resetForm() {
		fName=''; fSpecies=''; fLevel=1; fGender='Male'; fServer=''; fNotes='';
		fCryopodded=false; fNeutered=false; fMaleBreeder=false;
		fStats={ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 };
		fMuts={ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 };
		formErr='';
	}

	function openAdd() { resetForm(); addOpen=true; }

	function openEdit(c: Creature) {
		const bs = (c.baseStats as Record<string,number>) ?? {};
		const ms = (c.mutations as Record<string,number>) ?? {};
		fName=String(c.name??''); fSpecies=String(c.species??''); fLevel=Number(c.level??1);
		fGender=String(c.gender??'Male'); fServer=String(c.server??''); fNotes=String(c.notes??'');
		fCryopodded=Boolean(c.cryopodded); fNeutered=Boolean(c.neutered); fMaleBreeder=Boolean(c.maleBreeder);
		fStats={ Health:bs.Health??0, Stamina:bs.Stamina??0, Oxygen:bs.Oxygen??0, Food:bs.Food??0, Weight:bs.Weight??0, Melee:bs.Melee??0, Crafting:bs.Crafting??0 };
		fMuts={ Health:ms.Health??0, Stamina:ms.Stamina??0, Oxygen:ms.Oxygen??0, Food:ms.Food??0, Weight:ms.Weight??0, Melee:ms.Melee??0, Crafting:ms.Crafting??0 };
		editTarget=c; editOpen=true; formErr='';
	}

	function buildPayload() {
		return { name:fName.trim(), species:fSpecies.trim(), level:fLevel, gender:fGender, server:fServer.trim()||undefined, notes:fNotes.trim()||undefined, cryopodded:fCryopodded, neutered:fNeutered, maleBreeder:fMaleBreeder, baseStats:{...fStats}, mutations:{...fMuts} };
	}

	async function addCreature() {
		if (!fName.trim() || !fSpecies.trim()) { formErr='Name and species are required.'; return; }
		saving=true; formErr='';
		const res = await fetch('/api/creatures', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload()) });
		if (res.ok) { const c = await res.json(); creatures = [c, ...creatures]; addOpen=false; }
		else { formErr=(await res.json()).error ?? 'Failed to save'; }
		saving=false;
	}

	async function saveEdit() {
		if (!fName.trim() || !fSpecies.trim()) { formErr='Name and species are required.'; return; }
		saving=true; formErr='';
		const res = await fetch(`/api/creatures/${editTarget!.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload()) });
		if (res.ok) { const u = await res.json(); creatures = creatures.map(c => c.id === editTarget!.id ? {...u, id:editTarget!.id} : c); editOpen=false; }
		else { formErr=(await res.json()).error ?? 'Failed to save'; }
		saving=false;
	}

	async function deleteCreature(c: Creature) {
		if (!confirm(`Delete ${String(c.name ?? 'this creature')}? This cannot be undone.`)) return;
		const res = await fetch(`/api/creatures/${c.id}`, { method:'DELETE' });
		if (res.ok) creatures = creatures.filter(x => x.id !== c.id);
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>🧬 Specimens</h1>
			<div class="page-subtitle">{creatures.length} creature{creatures.length !== 1 ? 's' : ''} in vault</div>
		</div>
		<button class="btn btn-primary" onclick={openAdd}>+ Add Specimen</button>
	</div>

	<div class="spec-controls">
		<input class="form-control search-input" placeholder="🔍 Search by name or species..." bind:value={search} />
		<select class="form-control" bind:value={sortBy} style="width:auto">
			<option value="newest">Newest first</option>
			<option value="oldest">Oldest first</option>
			<option value="name">Name A–Z</option>
			<option value="level">Highest level</option>
			<option value="muts">Most mutations</option>
		</select>
		<button class="btn btn-secondary btn-sm" onclick={() => view = view === 'expanded' ? 'compact' : 'expanded'}>
			{view === 'expanded' ? '☰ Compact' : '⊞ Expanded'}
		</button>
	</div>

	{#if getFiltered().length === 0}
		<div class="spec-empty">{search ? 'No specimens match your search.' : 'No specimens yet. Add your first creature above.'}</div>
	{:else if view === 'expanded'}
		<div class="spec-grid-expanded">
			{#each getFiltered() as c}
				{@const bs = (c.baseStats as Record<string,number>) ?? {}}
				{@const muts = (c.mutations as Record<string,number>) ?? {}}
				{@const tm = totalMuts(c)}
				<div class="spec-card-expanded">
					<div class="spec-card-header">
						<div>
							<div class="spec-card-name">{String(c.name ?? 'Unnamed')}</div>
							<div class="spec-card-sub">{String(c.species ?? '?')} · Lvl {Number(c.level ?? 1)} · {String(c.gender ?? '?')}</div>
						</div>
						<div class="spec-card-flags">
							{#if c.cryopodded}<span class="spec-flag" title="Cryopodded">🧊</span>{/if}
							{#if c.neutered}<span class="spec-flag" title="Neutered">✂️</span>{/if}
							{#if c.maleBreeder}<span class="spec-flag" title="Male Breeder">♂</span>{/if}
							{#if tm > 0}<span class="spec-mut-badge">{tm} mut{tm !== 1 ? 's' : ''}</span>{/if}
						</div>
					</div>
					<div class="spec-stats-grid">
						{#each STATS as s}
							<div class="spec-stat">
								<span class="spec-stat-icon">{s.icon}</span>
								<span class="spec-stat-lbl">{s.key}</span>
								<strong class="spec-stat-val">{bs[s.key] ?? 0}{s.pct ? '%' : ''}</strong>
								{#if (muts[s.key] ?? 0) > 0}<span class="spec-mut-dot">·{muts[s.key]}</span>{/if}
							</div>
						{/each}
					</div>
					{#if c.notes}<div class="spec-notes">{String(c.notes)}</div>{/if}
					{#if c.server}<div class="spec-server">📍 {String(c.server)}</div>{/if}
					<div class="spec-card-actions">
						<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>✏️ Edit</button>
						<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>Delete</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="spec-grid-compact">
			{#each getFiltered() as c}
				{@const bs = (c.baseStats as Record<string,number>) ?? {}}
				{@const tm = totalMuts(c)}
				<div class="spec-card-compact">
					<div class="spec-compact-main">
						<div class="spec-card-name">{String(c.name ?? 'Unnamed')}</div>
						<div class="spec-card-sub">{String(c.species ?? '?')} · Lvl {Number(c.level ?? 1)}</div>
					</div>
					<div class="spec-compact-stats">
						<span>❤️ {bs.Health ?? 0}</span>
						<span>⚔️ {bs.Melee ?? 0}%</span>
						{#if tm > 0}<span class="spec-mut-badge">{tm}m</span>{/if}
					</div>
					<div class="spec-card-actions">
						<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>✏️</button>
						<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if addOpen || editOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:640px">
		<div class="modal-header">
			<h2 class="modal-title">{editOpen ? '✏️ Edit Specimen' : '+ Add Specimen'}</h2>
			<button class="close-btn" onclick={() => { addOpen=false; editOpen=false; }}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="creature-form-grid">
				<div class="plan-field">
					<label class="form-label">Name *</label>
					<input class="form-control" type="text" bind:value={fName} placeholder="e.g. Rex Prime" />
				</div>
				<div class="plan-field">
					<label class="form-label">Species *</label>
					<input class="form-control" type="text" list="species-list" bind:value={fSpecies} placeholder="e.g. Rex" />
					<datalist id="species-list">
						{#each getSpeciesList() as s}<option value={s}>{/each}
					</datalist>
				</div>
				<div class="plan-field">
					<label class="form-label">Level</label>
					<input class="form-control" type="number" bind:value={fLevel} min="1" max="999" />
				</div>
				<div class="plan-field">
					<label class="form-label">Gender</label>
					<select class="form-control" bind:value={fGender}>
						<option>Male</option><option>Female</option><option>Unknown</option>
					</select>
				</div>
				<div class="plan-field" style="grid-column:1/-1">
					<label class="form-label">Server</label>
					<input class="form-control" type="text" bind:value={fServer} placeholder="Optional server name" />
				</div>
			</div>

			<div class="creature-stats-section">
				<div class="creature-stats-header">Base Stats &amp; Mutations</div>
				<div class="cs-label-row"><span></span><span>Base Stat</span><span>Mutations</span></div>
				{#each STATS as s}
					<div class="cs-row">
						<span class="cs-icon">{s.icon} {s.key}{s.pct ? ' (%)' : ''}</span>
						<input class="form-control cs-input" type="number" bind:value={fStats[s.key]} min="0" />
						<input class="form-control cs-input" type="number" bind:value={fMuts[s.key]} min="0" max="20" />
					</div>
				{/each}
			</div>

			<div class="plan-field" style="margin-top:12px">
				<label class="form-label">Notes</label>
				<textarea class="form-control" rows="2" bind:value={fNotes} placeholder="Optional notes..."></textarea>
			</div>
			<div class="creature-flags">
				<label><input type="checkbox" bind:checked={fCryopodded} /> 🧊 Cryopodded</label>
				<label><input type="checkbox" bind:checked={fNeutered} /> ✂️ Neutered</label>
				<label><input type="checkbox" bind:checked={fMaleBreeder} /> ♂ Male Breeder</label>
			</div>
			{#if formErr}<div class="tek-login-error">{formErr}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => { addOpen=false; editOpen=false; }}>Cancel</button>
			<button class="btn btn-primary" onclick={editOpen ? saveEdit : addCreature} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.spec-controls { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
.spec-controls .search-input { flex:1; min-width:200px; }
.spec-empty { color:#64748b; padding:40px 0; text-align:center; }

.spec-grid-expanded { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; }
.spec-card-expanded { background:var(--tek-card-bg,linear-gradient(160deg,rgba(14,26,54,.88),rgba(5,10,24,.94))); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:10px; }
.spec-card-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
.spec-card-name { font-size:1rem; font-weight:600; color:#f1f5f9; }
.spec-card-sub { font-size:0.8rem; color:#60a5fa; margin-top:2px; }
.spec-card-flags { display:flex; gap:4px; align-items:center; flex-wrap:wrap; }
.spec-flag { font-size:1rem; }
.spec-mut-badge { background:rgba(139,92,246,.2); color:#c084fc; border-radius:99px; padding:1px 7px; font-size:0.7rem; font-weight:700; }

.spec-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.spec-stat { display:flex; flex-direction:column; align-items:center; background:rgba(255,255,255,.03); border-radius:8px; padding:6px 4px; }
.spec-stat-icon { font-size:0.85rem; }
.spec-stat-lbl { font-size:0.62rem; color:#64748b; text-transform:uppercase; }
.spec-stat-val { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.spec-mut-dot { font-size:0.65rem; color:#a78bfa; }

.spec-notes { font-size:0.82rem; color:#94a3b8; background:rgba(255,255,255,.03); border-radius:6px; padding:6px 10px; }
.spec-server { font-size:0.78rem; color:#64748b; }
.spec-card-actions { display:flex; gap:8px; margin-top:auto; }

.spec-grid-compact { display:flex; flex-direction:column; gap:6px; }
.spec-card-compact { display:flex; align-items:center; gap:14px; background:var(--tek-card-bg,rgba(14,26,54,.7)); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:10px; padding:12px 16px; }
.spec-compact-main { flex:1; min-width:0; }
.spec-compact-stats { display:flex; gap:12px; color:#64748b; font-size:0.82rem; white-space:nowrap; }

.creature-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; }
.creature-stats-section { margin-bottom:4px; }
.creature-stats-header { font-size:0.78rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
.cs-label-row { display:grid; grid-template-columns:1fr 110px 110px; gap:8px; font-size:0.72rem; color:#64748b; text-transform:uppercase; padding:0 4px; margin-bottom:4px; }
.cs-row { display:grid; grid-template-columns:1fr 110px 110px; gap:8px; align-items:center; margin-bottom:4px; }
.cs-icon { font-size:0.85rem; color:#94a3b8; }
:global(.cs-input) { padding:5px 8px !important; font-size:0.85rem !important; }
.creature-flags { display:flex; gap:20px; flex-wrap:wrap; font-size:0.88rem; color:#94a3b8; margin-top:12px; }
.creature-flags label { display:flex; align-items:center; gap:6px; cursor:pointer; }
</style>
