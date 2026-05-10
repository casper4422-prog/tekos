<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Creature = Record<string, unknown> & { id: number };

	const CAT_LABEL: Record<string,string> = { combat:'CMB', flyer:'FLY', utility:'UTL', water:'AQU', mount:'MNT', boss:'BSS', resource:'RES' };
	const CAT_COLOR: Record<string,string> = { combat:'#ef4444', flyer:'#06b6d4', utility:'#22c55e', water:'#3b82f6', boss:'#f59e0b', mount:'#f97316', resource:'#a78bfa' };

	const STATS = [
		{ key:'Health',   label:'HP',      pct:false },
		{ key:'Stamina',  label:'Stamina',  pct:false },
		{ key:'Oxygen',   label:'Oxygen',   pct:false },
		{ key:'Food',     label:'Food',     pct:false },
		{ key:'Weight',   label:'Weight',   pct:false },
		{ key:'Melee',    label:'Melee',    pct:true  },
		{ key:'Crafting', label:'Crafting', pct:true  },
	];

	function getAccent(speciesName: string) {
		if (typeof window === 'undefined') return { color:'#00b4ff', rgb:'0,180,255', code:'GEN' };
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		const cat = String(db?.[speciesName]?.category ?? '');
		const color = CAT_COLOR[cat] ?? '#00b4ff';
		const hex = color.replace('#','');
		const rgb = hex.match(/../g)?.map(h => parseInt(h,16)).join(',') ?? '0,180,255';
		return { color, rgb, code: CAT_LABEL[cat] ?? 'GEN' };
	}

	let creatures   = $state<Creature[]>(data.creatures as Creature[]);
	let view        = $state<'expanded'|'compact'>('expanded');
	let search      = $state('');
	let sortBy      = $state('newest');

	// Modal state
	let modalOpen   = $state(false);
	let isEdit      = $state(false);
	let editTarget  = $state<Creature | null>(null);
	let saving      = $state(false);
	let formErr     = $state('');

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
	let speciesList  = $state<string[]>([]);

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,unknown> | undefined;
		if (db) speciesList = Object.keys(db).sort();

		// Pre-fill species from Dex "Add to Vault" link
		const params = new URLSearchParams(window.location.search);
		const pre = params.get('species');
		if (pre) { resetForm(); fSpecies = pre; modalOpen = true; isEdit = false; }
	});

	function totalMuts(c: Creature) {
		return Object.values((c.mutations as Record<string,number>) ?? {}).reduce((a,b) => a+b, 0);
	}

	function getFiltered(): Creature[] {
		let list = creatures;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(c => String(c.name ?? '').toLowerCase().includes(q) || String(c.species ?? '').toLowerCase().includes(q));
		}
		const s = [...list];
		if      (sortBy === 'name')   s.sort((a,b) => String(a.species ?? '').localeCompare(String(b.species ?? '')));
		else if (sortBy === 'level')  s.sort((a,b) => (b.level as number ?? 0) - (a.level as number ?? 0));
		else if (sortBy === 'muts')   s.sort((a,b) => totalMuts(b) - totalMuts(a));
		else if (sortBy === 'oldest') s.sort((a,b) => (a.id as number) - (b.id as number));
		else                          s.sort((a,b) => (b.id as number) - (a.id as number));
		return s;
	}

	function resetForm() {
		fName=''; fSpecies=''; fLevel=1; fGender='Male'; fServer=''; fNotes='';
		fCryopodded=false; fNeutered=false; fMaleBreeder=false;
		fStats={ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 };
		fMuts={ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 };
		formErr='';
	}

	function openAdd() { resetForm(); isEdit=false; editTarget=null; modalOpen=true; }

	function openEdit(c: Creature) {
		const bs = (c.baseStats as Record<string,number>) ?? {};
		const ms = (c.mutations as Record<string,number>) ?? {};
		fName=String(c.name??''); fSpecies=String(c.species??''); fLevel=Number(c.level??1);
		fGender=String(c.gender??'Male'); fServer=String(c.server??''); fNotes=String(c.notes??'');
		fCryopodded=Boolean(c.cryopodded); fNeutered=Boolean(c.neutered); fMaleBreeder=Boolean(c.maleBreeder);
		fStats={ Health:bs.Health??0, Stamina:bs.Stamina??0, Oxygen:bs.Oxygen??0, Food:bs.Food??0, Weight:bs.Weight??0, Melee:bs.Melee??0, Crafting:bs.Crafting??0 };
		fMuts={ Health:ms.Health??0, Stamina:ms.Stamina??0, Oxygen:ms.Oxygen??0, Food:ms.Food??0, Weight:ms.Weight??0, Melee:ms.Melee??0, Crafting:ms.Crafting??0 };
		editTarget=c; isEdit=true; modalOpen=true; formErr='';
	}

	function buildPayload() {
		return { name:fName.trim(), species:fSpecies.trim(), level:fLevel, gender:fGender, server:fServer.trim()||undefined, notes:fNotes.trim()||undefined, cryopodded:fCryopodded, neutered:fNeutered, maleBreeder:fMaleBreeder, baseStats:{...fStats}, mutations:{...fMuts} };
	}

	async function saveCreature() {
		if (!fName.trim() || !fSpecies.trim()) { formErr='Name and species are required.'; return; }
		saving=true; formErr='';
		if (isEdit && editTarget) {
			const res = await fetch(`/api/creatures/${editTarget.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload()) });
			if (res.ok) { const u = await res.json(); creatures = creatures.map(c => c.id === editTarget!.id ? {...u, id:editTarget!.id} : c); modalOpen=false; }
			else { formErr=(await res.json()).error ?? 'Failed to save'; }
		} else {
			const res = await fetch('/api/creatures', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload()) });
			if (res.ok) { const c = await res.json(); creatures=[c,...creatures]; modalOpen=false; }
			else { formErr=(await res.json()).error ?? 'Failed to save'; }
		}
		saving=false;
	}

	async function deleteCreature(c: Creature) {
		if (!confirm(`Delete ${String(c.name ?? String(c.species))}? This cannot be undone.`)) return;
		const res = await fetch(`/api/creatures/${c.id}`, { method:'DELETE' });
		if (res.ok) creatures = creatures.filter(x => x.id !== c.id);
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Specimens</h1>
			<div class="page-subtitle">{creatures.length} creature{creatures.length !== 1 ? 's' : ''} in vault</div>
		</div>
		<button class="btn btn-primary" onclick={openAdd}>+ Add Specimen</button>
	</div>

	<div class="spec-controls">
		<input class="form-control spec-search" placeholder="Search by name or species..." bind:value={search} />
		<select class="form-control" bind:value={sortBy} style="width:auto">
			<option value="newest">Newest first</option>
			<option value="oldest">Oldest first</option>
			<option value="name">Species A–Z</option>
			<option value="level">Highest level</option>
			<option value="muts">Most mutations</option>
		</select>
		<button class="btn btn-secondary btn-sm" onclick={() => view = view === 'expanded' ? 'compact' : 'expanded'}>
			{view === 'expanded' ? 'Compact' : 'Expanded'}
		</button>
	</div>

	{#if getFiltered().length === 0}
		<div class="spec-empty">{search ? 'No specimens match your search.' : 'No specimens yet. Click "+ Add Specimen" above.'}</div>
	{:else if view === 'expanded'}
		<div class="spec-grid">
			{#each getFiltered() as c}
				{@const bs  = (c.baseStats  as Record<string,number>) ?? {}}
				{@const mut = (c.mutations  as Record<string,number>) ?? {}}
				{@const tm  = totalMuts(c)}
				{@const acc = getAccent(String(c.species ?? ''))}
				<div class="spec-card" style="--accent:{acc.color};--accent-rgb:{acc.rgb}">
					<div class="spec-header">
						<div class="spec-cat-badge">{acc.code}</div>
						<div class="spec-name-block">
							<div class="spec-species">{String(c.species ?? 'Unknown')}</div>
							{#if c.name}<div class="spec-given-name">{String(c.name)}</div>{/if}
						</div>
						<div class="spec-level">Lvl {Number(c.level ?? 1)}</div>
					</div>

					<div class="spec-divider"></div>

					<div class="spec-stats">
						{#each STATS as s}
							<div class="spec-stat-item">
								<span class="spec-stat-lbl">{s.label}</span>
								<span class="spec-stat-val">{s.pct ? '' : ''}{(bs[s.key] ?? 0).toLocaleString()}{s.pct ? '%' : ''}</span>
								{#if (mut[s.key] ?? 0) > 0}<span class="spec-mut-pip">+{mut[s.key]}</span>{/if}
							</div>
						{/each}
					</div>

					{#if c.notes}<div class="spec-notes">{String(c.notes)}</div>{/if}

					<div class="spec-footer">
						<div class="spec-chips">
							<span class="spec-chip">{String(c.gender ?? 'Unknown')}</span>
							{#if tm > 0}<span class="spec-chip mut">{tm} Mut{tm !== 1 ? 's' : ''}</span>{/if}
							{#if c.cryopodded}<span class="spec-chip">Cryopodded</span>{/if}
							{#if c.neutered}<span class="spec-chip">Neutered</span>{/if}
							{#if c.maleBreeder}<span class="spec-chip">Breeder</span>{/if}
							{#if c.server}<span class="spec-chip">📍 {String(c.server)}</span>{/if}
						</div>
						<div class="spec-actions">
							<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>Edit</button>
							<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>Delete</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="spec-compact-list">
			{#each getFiltered() as c}
				{@const bs  = (c.baseStats as Record<string,number>) ?? {}}
				{@const tm  = totalMuts(c)}
				{@const acc = getAccent(String(c.species ?? ''))}
				<div class="spec-compact-card" style="border-left-color:{acc.color}">
					<div class="spec-compact-badge" style="color:{acc.color}">{acc.code}</div>
					<div class="spec-compact-info">
						<span class="spec-compact-species">{String(c.species ?? 'Unknown')}</span>
						{#if c.name}<span class="spec-compact-name">{String(c.name)}</span>{/if}
					</div>
					<div class="spec-compact-stats">
						<span>HP {(bs.Health ?? 0).toLocaleString()}</span>
						<span>Mel {bs.Melee ?? 0}%</span>
						<span>Lvl {Number(c.level ?? 1)}</span>
						{#if tm > 0}<span class="mut-text">{tm}m</span>{/if}
					</div>
					<div class="spec-compact-actions">
						<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>Edit</button>
						<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add / Edit Modal -->
{#if modalOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:660px">
		<div class="modal-header">
			<h2 class="modal-title">{isEdit ? 'Edit Specimen' : 'Add Specimen'}</h2>
			<button class="close-btn" onclick={() => modalOpen = false}>&times;</button>
		</div>
		<div class="modal-body">
			<div class="mform-section-title">Identity</div>
			<div class="mform-grid">
				<div class="plan-field">
					<label class="form-label" for="m-species">Species *</label>
					<input id="m-species" class="form-control" type="text" list="m-species-list" bind:value={fSpecies} placeholder="e.g. Rex" />
					<datalist id="m-species-list">
						{#each speciesList as s}<option value={s}>{s}</option>{/each}
					</datalist>
				</div>
				<div class="plan-field">
					<label class="form-label" for="m-name">Creature Name *</label>
					<input id="m-name" class="form-control" type="text" bind:value={fName} placeholder="e.g. Prime Breeder" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="m-level">Level</label>
					<input id="m-level" class="form-control" type="number" bind:value={fLevel} min="1" max="999" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="m-gender">Gender</label>
					<select id="m-gender" class="form-control" bind:value={fGender}>
						<option>Male</option><option>Female</option><option>Unknown</option>
					</select>
				</div>
				<div class="plan-field" style="grid-column:1/-1">
					<label class="form-label" for="m-server">Server</label>
					<input id="m-server" class="form-control" type="text" bind:value={fServer} placeholder="Optional" />
				</div>
			</div>

			<div class="mform-section-title" style="margin-top:16px">Base Stats &amp; Mutations</div>
			<div class="mform-stats-head"><span></span><span>Base Value</span><span>Mutations</span></div>
			{#each STATS as s}
				<div class="mform-stats-row">
					<span class="mform-stat-name">{s.label}{s.pct ? ' (%)' : ''}</span>
					<input class="form-control mform-stat-input" type="number" bind:value={fStats[s.key]} min="0" />
					<input class="form-control mform-stat-input" type="number" bind:value={fMuts[s.key]} min="0" max="20" />
				</div>
			{/each}

			<div class="plan-field" style="margin-top:14px">
				<label class="form-label" for="m-notes">Notes</label>
				<textarea id="m-notes" class="form-control" rows="2" bind:value={fNotes} placeholder="Breeding lines, colours, location..."></textarea>
			</div>
			<div class="mform-flags">
				<label><input type="checkbox" bind:checked={fCryopodded} /> Cryopodded</label>
				<label><input type="checkbox" bind:checked={fNeutered} /> Neutered</label>
				<label><input type="checkbox" bind:checked={fMaleBreeder} /> Male Breeder</label>
			</div>
			{#if formErr}<div class="tek-login-error" style="margin-top:10px">{formErr}</div>{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => modalOpen = false}>Cancel</button>
			<button class="btn btn-primary" onclick={saveCreature} disabled={saving}>{saving ? 'Saving...' : 'Save Specimen'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.spec-controls { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; align-items:center; }
.spec-search { flex:1; min-width:200px; }
.spec-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.9rem; }

/* Expanded grid */
.spec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; }
.spec-card {
	background:linear-gradient(160deg,rgba(14,26,54,0.9) 0%,rgba(5,10,24,0.97) 100%);
	border:1px solid rgba(255,255,255,0.06); border-left:3px solid var(--accent,#00b4ff);
	border-radius:10px; padding:16px 18px; display:flex; flex-direction:column; gap:10px;
	position:relative; overflow:hidden; transition:transform .18s, box-shadow .18s;
}
.spec-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(var(--accent-rgb,0,180,255),0.04) 0%,transparent 55%); pointer-events:none; }
.spec-card:hover { transform:translateY(-2px); box-shadow:-3px 0 18px rgba(var(--accent-rgb,0,180,255),0.2),0 6px 28px rgba(0,0,0,0.5); }

.spec-header { display:flex; align-items:flex-start; gap:10px; }
.spec-cat-badge { background:rgba(var(--accent-rgb,0,180,255),0.12); border:1px solid rgba(var(--accent-rgb,0,180,255),0.3); color:var(--accent,#00b4ff); font-size:0.58rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; padding:3px 7px; border-radius:4px; flex-shrink:0; margin-top:3px; }
.spec-name-block { flex:1; min-width:0; }
.spec-species { font-size:1rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.spec-given-name { font-size:0.75rem; color:var(--accent,#00b4ff); opacity:0.75; margin-top:2px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.spec-level { font-size:0.72rem; font-weight:700; color:#f1f5f9; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:5px; padding:3px 8px; white-space:nowrap; flex-shrink:0; }

.spec-divider { height:1px; background:rgba(255,255,255,0.05); }

.spec-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.spec-stat-item { background:rgba(0,0,0,0.2); border-radius:7px; padding:7px 6px; display:flex; flex-direction:column; align-items:center; gap:2px; position:relative; }
.spec-stat-lbl { font-size:0.58rem; color:#475569; text-transform:uppercase; letter-spacing:.05em; }
.spec-stat-val { font-size:0.88rem; font-weight:700; color:#f1f5f9; }
.spec-mut-pip { position:absolute; top:-3px; right:-3px; background:rgba(139,92,246,0.85); color:#fff; border-radius:99px; padding:0 4px; font-size:0.55rem; font-weight:800; }

.spec-notes { font-size:0.77rem; color:#64748b; line-height:1.5; }
.spec-footer { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.spec-chips { display:flex; gap:5px; flex-wrap:wrap; }
.spec-chip { font-size:0.67rem; font-weight:500; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:2px 7px; color:#64748b; }
.spec-chip.mut { color:var(--accent,#00b4ff); border-color:rgba(var(--accent-rgb,0,180,255),0.3); background:rgba(var(--accent-rgb,0,180,255),0.08); }
.spec-actions { display:flex; gap:6px; flex-shrink:0; }

/* Compact */
.spec-compact-list { display:flex; flex-direction:column; gap:5px; }
.spec-compact-card { display:flex; align-items:center; gap:12px; background:rgba(14,26,54,0.7); border:1px solid rgba(255,255,255,0.06); border-left:3px solid; border-radius:8px; padding:10px 14px; }
.spec-compact-badge { font-size:0.58rem; font-weight:800; letter-spacing:0.1em; flex-shrink:0; }
.spec-compact-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.spec-compact-species { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.spec-compact-name { font-size:0.72rem; color:#64748b; font-style:italic; }
.spec-compact-stats { display:flex; gap:10px; font-size:0.75rem; color:#64748b; white-space:nowrap; }
.mut-text { color:#a78bfa; font-weight:600; }
.spec-compact-actions { display:flex; gap:6px; }

/* Modal form */
.mform-section-title { font-size:0.68rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.mform-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.mform-stats-head { display:grid; grid-template-columns:1fr 120px 120px; gap:8px; font-size:0.65rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#475569; padding:0 2px 6px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:4px; }
.mform-stats-row { display:grid; grid-template-columns:1fr 120px 120px; gap:8px; align-items:center; margin-bottom:5px; }
.mform-stat-name { font-size:0.82rem; color:#94a3b8; }
:global(.mform-stat-input) { padding:5px 8px !important; font-size:0.82rem !important; }
.mform-flags { display:flex; gap:20px; flex-wrap:wrap; font-size:0.85rem; color:#94a3b8; margin-top:12px; }
.mform-flags label { display:flex; align-items:center; gap:7px; cursor:pointer; }
</style>
