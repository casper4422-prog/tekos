<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Creature = Record<string, unknown> & { id: number };

	const MAIN_STATS = [
		{ key: 'Health',  icon: '❤️',  pct: false },
		{ key: 'Melee',   icon: '⚔️',  pct: true  },
		{ key: 'Weight',  icon: '🏋️',  pct: false },
		{ key: 'Stamina', icon: '⚡',  pct: false },
	];
	const ALL_STATS = [
		{ key: 'Health',   icon: '❤️',  pct: false },
		{ key: 'Stamina',  icon: '⚡',  pct: false },
		{ key: 'Oxygen',   icon: '💧',  pct: false },
		{ key: 'Food',     icon: '🍖',  pct: false },
		{ key: 'Weight',   icon: '🏋️',  pct: false },
		{ key: 'Melee',    icon: '⚔️',  pct: true  },
		{ key: 'Crafting', icon: '🔧',  pct: true  },
	];

	// Category → color scheme
	const CAT_COLOR: Record<string, { bar: string; glow: string; text: string }> = {
		combat:   { bar: '#ef4444', glow: 'rgba(239,68,68,0.12)',   text: '#fca5a5' },
		flyer:    { bar: '#06b6d4', glow: 'rgba(6,182,212,0.12)',   text: '#67e8f9' },
		utility:  { bar: '#22c55e', glow: 'rgba(34,197,94,0.12)',   text: '#86efac' },
		water:    { bar: '#3b82f6', glow: 'rgba(59,130,246,0.12)',  text: '#93c5fd' },
		boss:     { bar: '#f59e0b', glow: 'rgba(245,158,11,0.12)',  text: '#fcd34d' },
		mount:    { bar: '#f97316', glow: 'rgba(249,115,22,0.12)',  text: '#fdba74' },
		resource: { bar: '#a78bfa', glow: 'rgba(167,139,250,0.12)', text: '#c4b5fd' },
	};
	const DEFAULT_COLOR = { bar: '#00b4ff', glow: 'rgba(0,180,255,0.10)', text: '#7dd3fc' };

	function getColor(speciesName: string) {
		if (typeof window === 'undefined') return DEFAULT_COLOR;
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string, Record<string,unknown>> | undefined;
		const cat = String(db?.[speciesName]?.category ?? '');
		return CAT_COLOR[cat] ?? DEFAULT_COLOR;
	}

	function getIcon(speciesName: string) {
		if (typeof window === 'undefined') return '🦖';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string, Record<string,unknown>> | undefined;
		return String(db?.[speciesName]?.icon ?? '🦖');
	}

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

	onMount(() => {
		const preSpecies = $page.url.searchParams.get('species');
		if (preSpecies) { resetForm(); fSpecies = preSpecies; addOpen = true; }
	});

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
		<div class="spec-grid">
			{#each getFiltered() as c}
				{@const bs   = (c.baseStats  as Record<string,number>) ?? {}}
				{@const muts = (c.mutations  as Record<string,number>) ?? {}}
				{@const tm   = totalMuts(c)}
				{@const col  = getColor(String(c.species ?? ''))}
				{@const ico  = getIcon(String(c.species ?? ''))}
				<div class="spec-card" style="--cat-bar:{col.bar};--cat-glow:{col.glow};--cat-text:{col.text}">
					<div class="spec-card-bar"></div>
					<div class="spec-card-body">
						<!-- Header row -->
						<div class="spec-header">
							<div class="spec-icon">{ico}</div>
							<div class="spec-header-info">
								<div class="spec-name">{String(c.name ?? 'Unnamed')}</div>
								<div class="spec-species">{String(c.species ?? '?')} · {String(c.gender ?? '?')}</div>
							</div>
							<div class="spec-level-badge">Lvl {Number(c.level ?? 1)}</div>
						</div>

						<!-- Flags + mutations row -->
						<div class="spec-chips">
							{#if c.cryopodded}<span class="spec-chip">🧊 Cryo</span>{/if}
							{#if c.neutered}<span class="spec-chip">✂️ Neutered</span>{/if}
							{#if c.maleBreeder}<span class="spec-chip">♂ Breeder</span>{/if}
							{#if tm > 0}<span class="spec-chip mut-chip">◆ {tm} mut{tm !== 1 ? 's' : ''}</span>{/if}
						</div>

						<!-- Main 4 stats -->
						<div class="spec-main-stats">
							{#each MAIN_STATS as s}
								<div class="spec-main-stat">
									<span class="spec-main-icon">{s.icon}</span>
									<div>
										<div class="spec-main-val">{(bs[s.key] ?? 0).toLocaleString()}{s.pct ? '%' : ''}</div>
										<div class="spec-main-lbl">{s.key}</div>
									</div>
									{#if (muts[s.key] ?? 0) > 0}
										<span class="spec-mut-pip" title="{muts[s.key]} mutation{muts[s.key] > 1 ? 's' : ''}">+{muts[s.key]}</span>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Secondary stats -->
						<div class="spec-secondary-stats">
							{#each ALL_STATS.filter(s => !MAIN_STATS.find(m => m.key === s.key)) as s}
								<span class="spec-sec-stat">{s.icon} <strong>{(bs[s.key] ?? 0).toLocaleString()}{s.pct ? '%' : ''}</strong> <span class="sec-lbl">{s.key}</span></span>
							{/each}
						</div>

						{#if c.notes}<div class="spec-notes">{String(c.notes)}</div>{/if}
						{#if c.server}<div class="spec-server">📍 {String(c.server)}</div>{/if}

						<div class="spec-actions">
							<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>✏️ Edit</button>
							<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>Delete</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="spec-grid-compact">
			{#each getFiltered() as c}
				{@const bs  = (c.baseStats as Record<string,number>) ?? {}}
				{@const tm  = totalMuts(c)}
				{@const col = getColor(String(c.species ?? ''))}
				<div class="spec-card-compact" style="border-left-color:{col.bar}">
					<div class="spec-compact-icon">{getIcon(String(c.species ?? ''))}</div>
					<div class="spec-compact-main">
						<div class="spec-name">{String(c.name ?? 'Unnamed')}</div>
						<div class="spec-species">{String(c.species ?? '?')} · Lvl {Number(c.level ?? 1)}</div>
					</div>
					<div class="spec-compact-stats">
						<span>❤️ {(bs.Health ?? 0).toLocaleString()}</span>
						<span>⚔️ {bs.Melee ?? 0}%</span>
						{#if tm > 0}<span class="spec-chip mut-chip" style="--cat-text:{col.text}">◆{tm}</span>{/if}
					</div>
					<div class="spec-actions">
						<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>✏️</button>
						<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add / Edit Modal -->
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
					<label class="form-label" for="f-name">Name *</label>
					<input id="f-name" class="form-control" type="text" bind:value={fName} placeholder="e.g. Rex Prime" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-species">Species *</label>
					<input id="f-species" class="form-control" type="text" list="species-list" bind:value={fSpecies} placeholder="e.g. Rex" />
					<datalist id="species-list">
						{#each getSpeciesList() as s}<option value={s}>{s}</option>{/each}
					</datalist>
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-level">Level</label>
					<input id="f-level" class="form-control" type="number" bind:value={fLevel} min="1" max="999" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-gender">Gender</label>
					<select id="f-gender" class="form-control" bind:value={fGender}>
						<option>Male</option><option>Female</option><option>Unknown</option>
					</select>
				</div>
				<div class="plan-field" style="grid-column:1/-1">
					<label class="form-label" for="f-server">Server</label>
					<input id="f-server" class="form-control" type="text" bind:value={fServer} placeholder="Optional server name" />
				</div>
			</div>

			<div class="creature-stats-section">
				<div class="creature-stats-header">Base Stats &amp; Mutations</div>
				<div class="cs-label-row"><span></span><span>Base Stat</span><span>Mutations</span></div>
				{#each ALL_STATS as s}
					<div class="cs-row">
						<span class="cs-icon">{s.icon} {s.key}{s.pct ? ' (%)' : ''}</span>
						<input class="form-control cs-input" type="number" bind:value={fStats[s.key]} min="0" />
						<input class="form-control cs-input" type="number" bind:value={fMuts[s.key]} min="0" max="20" />
					</div>
				{/each}
			</div>

			<div class="plan-field" style="margin-top:12px">
				<label class="form-label" for="f-notes">Notes</label>
				<textarea id="f-notes" class="form-control" rows="2" bind:value={fNotes} placeholder="Optional notes..."></textarea>
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
.spec-controls { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; align-items:center; }
.spec-controls .search-input { flex:1; min-width:200px; }
.spec-empty { color:#64748b; padding:40px 0; text-align:center; }

/* ── Dashboard cards ───────────────────────────────────── */
.spec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(360px,1fr)); gap:18px; }

.spec-card {
	background: linear-gradient(160deg, rgba(14,26,54,0.95) 0%, rgba(5,10,24,0.98) 100%);
	border: 1px solid rgba(255,255,255,0.07);
	border-radius: 16px;
	overflow: hidden;
	transition: transform .2s, box-shadow .2s;
	box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.spec-card:hover {
	transform: translateY(-3px);
	box-shadow: 0 8px 32px var(--cat-glow), 0 4px 20px rgba(0,0,0,0.5);
	border-color: var(--cat-bar);
}
.spec-card-bar {
	height: 5px;
	background: var(--cat-bar);
	box-shadow: 0 0 12px var(--cat-bar);
}
.spec-card-body { padding: 18px; display:flex; flex-direction:column; gap:12px; }

.spec-header { display:flex; align-items:center; gap:12px; }
.spec-icon { font-size:2.2rem; flex-shrink:0; }
.spec-header-info { flex:1; min-width:0; }
.spec-name { font-size:1.1rem; font-weight:700; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.spec-species { font-size:0.8rem; color:var(--cat-text); margin-top:2px; }
.spec-level-badge { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:4px 10px; font-size:0.8rem; font-weight:700; color:#f1f5f9; white-space:nowrap; }

.spec-chips { display:flex; gap:6px; flex-wrap:wrap; }
.spec-chip { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:99px; padding:2px 9px; font-size:0.72rem; color:#94a3b8; }
.mut-chip { background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.4); color:var(--cat-text, #c084fc); font-weight:600; }

/* 4 main stats — large display */
.spec-main-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; background:rgba(0,0,0,0.2); border-radius:12px; padding:12px 8px; }
.spec-main-stat { display:flex; flex-direction:column; align-items:center; gap:2px; position:relative; }
.spec-main-icon { font-size:1.1rem; }
.spec-main-val { font-size:1rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.02em; }
.spec-main-lbl { font-size:0.62rem; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
.spec-mut-pip { position:absolute; top:-2px; right:-2px; background:rgba(139,92,246,0.8); color:#fff; border-radius:99px; padding:0 4px; font-size:0.6rem; font-weight:700; }

/* Secondary stats — smaller row */
.spec-secondary-stats { display:flex; gap:14px; flex-wrap:wrap; padding:4px 2px; }
.spec-sec-stat { font-size:0.78rem; color:#64748b; }
.spec-sec-stat strong { color:#94a3b8; }
.sec-lbl { color:#475569; }

.spec-notes { font-size:0.82rem; color:#94a3b8; background:rgba(255,255,255,0.03); border-radius:6px; padding:6px 10px; }
.spec-server { font-size:0.75rem; color:#475569; }
.spec-actions { display:flex; gap:8px; margin-top:4px; }

/* ── Compact view ──────────────────────────────────────── */
.spec-grid-compact { display:flex; flex-direction:column; gap:6px; }
.spec-card-compact { display:flex; align-items:center; gap:12px; background:rgba(14,26,54,0.7); border:1px solid rgba(255,255,255,0.06); border-left:3px solid; border-radius:10px; padding:12px 16px; transition:background .15s; }
.spec-card-compact:hover { background:rgba(14,26,54,0.9); }
.spec-compact-icon { font-size:1.5rem; flex-shrink:0; }
.spec-compact-main { flex:1; min-width:0; }
.spec-compact-stats { display:flex; gap:10px; font-size:0.82rem; color:#64748b; white-space:nowrap; align-items:center; }

/* ── Form ──────────────────────────────────────────────── */
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
