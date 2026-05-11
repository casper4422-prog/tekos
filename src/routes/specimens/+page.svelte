<script lang="ts">
	import { onMount } from 'svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Creature = Record<string, unknown> & { id: number };

	const CAT_LABEL: Record<string,string> = { combat:'CMB', flyer:'FLY', utility:'UTL', water:'AQU', mount:'MNT', boss:'BSS', resource:'RES' };
	const CAT_RGB:   Record<string,string> = { combat:'239,68,68', flyer:'6,182,212', utility:'34,197,94', water:'59,130,246', boss:'245,158,11', mount:'249,115,22', resource:'167,139,250' };

	const STATS = [
		{ key:'Health',   label:'HP'       },
		{ key:'Stamina',  label:'Stamina'  },
		{ key:'Oxygen',   label:'Oxygen'   },
		{ key:'Food',     label:'Food'     },
		{ key:'Weight',   label:'Weight'   },
		{ key:'Melee',    label:'Melee'    },
		{ key:'Crafting', label:'Crafting' },
	];

	let creatures   = $state<Creature[]>(data.creatures as Creature[]);
	let view        = $state<'expanded'|'compact'>('expanded');
	let search      = $state('');
	let sortBy      = $state('newest');
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
	let fStats       = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });
	let fMuts        = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });
	let speciesList  = $state<string[]>([]);

	let isGuest = $state(false);

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,unknown> | undefined;
		if (db) speciesList = Object.keys(db).sort();

		// Guest mode: load from localStorage instead of API
		isGuest = localStorage.getItem('tekos_guest') === '1';
		if (isGuest) {
			const saved = localStorage.getItem('tekos_specimens');
			if (saved) {
				try { creatures = JSON.parse(saved); } catch {}
			}
		}

		const params = new URLSearchParams(window.location.search);
		const pre = params.get('species');
		if (pre) { resetForm(); fSpecies = pre; modalOpen = true; isEdit = false; }
	});

	function saveGuestCreatures() {
		localStorage.setItem('tekos_specimens', JSON.stringify(creatures));
	}

	function getCat(sp: string): string {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[sp]?.category ?? 'default');
	}
	function getRgb(cat: string): string { return CAT_RGB[cat] ?? '0,180,255'; }
	function getCode(cat: string): string { return CAT_LABEL[cat] ?? 'GEN'; }
	function totalMuts(c: Creature) { return Object.values((c.mutations as Record<string,number>) ?? {}).reduce((a,b) => a+b, 0); }

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
		fStats={ Health:bs.Health??0, Stamina:bs.Stamina??0, Oxygen:bs.Oxygen??0, Food:bs.Food??0, Weight:bs.Weight??0, Melee:bs.Melee??0, Crafting:bs.Crafting??0 };
		fMuts={ Health:ms.Health??0, Stamina:ms.Stamina??0, Oxygen:ms.Oxygen??0, Food:ms.Food??0, Weight:ms.Weight??0, Melee:ms.Melee??0, Crafting:ms.Crafting??0 };
		editTarget=c; isEdit=true; modalOpen=true; formErr='';
	}

	function buildPayload() {
		return { name:fName.trim(), species:fSpecies.trim(), level:fLevel, gender:fGender, server:fServer.trim()||undefined, notes:fNotes.trim()||undefined, baseStats:{...fStats}, mutations:{...fMuts} };
	}

	async function saveCreature() {
		if (!fName.trim() || !fSpecies.trim()) { formErr='Name and species are required.'; return; }
		saving=true; formErr='';

		if (isGuest) {
			// localStorage mode
			const payload = buildPayload();
			if (isEdit && editTarget) {
				creatures = creatures.map(c => c.id === editTarget!.id ? { ...payload, id:editTarget!.id } : c);
			} else {
				const newId = Date.now();
				creatures = [{ ...payload, id:newId }, ...creatures];
			}
			saveGuestCreatures();
			modalOpen=false; saving=false; return;
		}

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
		if (isGuest) {
			creatures = creatures.filter(x => x.id !== c.id);
			saveGuestCreatures(); return;
		}
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
		{#if !isGuest}<a href="/dex" class="btn btn-secondary btn-sm">Browse Dex to Add</a>{/if}
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
				{@const cat = getCat(String(c.species ?? ''))}
				{@const rgb = getRgb(cat)}
				{@const code = getCode(cat)}
				<div class="cham-shell {cat}" style="--cat-rgb:{rgb}">
					<div class="spec-card">
						<div class="spec-header">
							<div class="cat-badge-v3" style="--cat-rgb:{rgb}">
								<CategoryIcon category={cat} size={11} />
								{code}
							</div>
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
									<span class="spec-stat-val">{(bs[s.key] ?? 0).toLocaleString()}</span>
									{#if (mut[s.key] ?? 0) > 0}<span class="spec-mut-pip">+{mut[s.key]}</span>{/if}
								</div>
							{/each}
						</div>

						{#if c.notes}<div class="spec-notes">{String(c.notes)}</div>{/if}

						<!-- Badges from BadgeSystem -->
						{#if typeof window !== 'undefined' && (window as Record<string,unknown>).BadgeSystem}
							{@const badgeHtml = ((window as Record<string,unknown>).BadgeSystem as Record<string,Function>).generateBadgeHTML(c)}
							{#if badgeHtml}
								<div class="spec-badges">{@html badgeHtml}</div>
							{/if}
						{/if}

						<div class="spec-footer">
							<div class="spec-chips">
								<span class="spec-chip">{String(c.gender ?? 'Unknown')}</span>
								{#if tm > 0}<span class="spec-chip mut" style="--cat-rgb:{rgb}">{tm} Mut{tm !== 1 ? 's' : ''}</span>{/if}
								{#if c.server}<span class="spec-chip">📍 {String(c.server)}</span>{/if}
							</div>
							<div class="spec-actions">
								<button class="btn btn-secondary btn-sm" onclick={() => openEdit(c)}>Edit</button>
								<button class="btn btn-danger btn-sm" onclick={() => deleteCreature(c)}>Delete</button>
							</div>
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
				{@const cat = getCat(String(c.species ?? ''))}
				{@const rgb = getRgb(cat)}
				<div class="cham-shell {cat}" style="--cat-rgb:{rgb};--cut:6px">
					<div class="spec-compact-card">
						<div class="spec-compact-icon" style="color:rgb({rgb})">
							<CategoryIcon category={cat} size={14} />
						</div>
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
					<span class="mform-stat-name">{s.label}</span>
					<input class="form-control mform-stat-input" type="number" bind:value={fStats[s.key]} min="0" />
					<input class="form-control mform-stat-input" type="number" bind:value={fMuts[s.key]} min="0" max="20" />
				</div>
			{/each}

			<div class="plan-field" style="margin-top:14px">
				<label class="form-label" for="m-notes">Notes</label>
				<textarea id="m-notes" class="form-control" rows="2" bind:value={fNotes} placeholder="Breeding lines, colours, location..."></textarea>
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

.spec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }

.spec-card {
	background:linear-gradient(160deg,rgba(10,18,40,0.97) 0%,rgba(4,8,20,1) 100%);
	padding:16px 18px; display:flex; flex-direction:column; gap:10px;
}

.spec-header { display:flex; align-items:flex-start; gap:10px; }
.spec-name-block { flex:1; min-width:0; }
.spec-species { font-size:1rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.spec-given-name { font-size:0.74rem; color:rgb(var(--cat-rgb,0,180,255)); opacity:0.8; margin-top:2px; font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.spec-level { font-size:0.7rem; font-weight:700; color:#94a3b8; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); padding:3px 8px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); white-space:nowrap; flex-shrink:0; }

.spec-divider { height:1px; background:rgba(255,255,255,0.05); }

.spec-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; }
.spec-stat-item { background:rgba(0,0,0,0.25); padding:6px 4px; display:flex; flex-direction:column; align-items:center; gap:1px; position:relative; clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.spec-stat-lbl { font-size:0.55rem; color:#475569; text-transform:uppercase; letter-spacing:.05em; }
.spec-stat-val { font-size:0.85rem; font-weight:700; color:#e2e8f0; }
.spec-mut-pip { position:absolute; top:-2px; right:0; background:rgba(139,92,246,0.9); color:#fff; padding:0 3px; font-size:0.5rem; font-weight:800; clip-path:polygon(2px 0%,100% 0%,calc(100% - 2px) 100%,0% 100%); }

.spec-notes { font-size:0.77rem; color:#64748b; line-height:1.5; }
.spec-badges { display:flex; gap:4px; flex-wrap:wrap; }
.spec-footer { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
.spec-chips { display:flex; gap:4px; flex-wrap:wrap; }
.spec-chip { font-size:0.64rem; font-weight:500; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); padding:2px 7px; color:#64748b; clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.spec-chip.mut { color:rgb(var(--cat-rgb,0,180,255)); border-color:rgba(var(--cat-rgb,0,180,255),0.3); background:rgba(var(--cat-rgb,0,180,255),0.08); }
.spec-actions { display:flex; gap:6px; flex-shrink:0; }

.spec-compact-list { display:flex; flex-direction:column; gap:6px; }
.spec-compact-card { display:flex; align-items:center; gap:12px; background:rgba(10,18,40,0.97); padding:10px 14px; }
.spec-compact-icon { flex-shrink:0; display:flex; align-items:center; }
.spec-compact-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.spec-compact-species { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.spec-compact-name { font-size:0.72rem; color:#64748b; font-style:italic; }
.spec-compact-stats { display:flex; gap:10px; font-size:0.75rem; color:#64748b; white-space:nowrap; }
.mut-text { color:#a78bfa; font-weight:600; }
.spec-compact-actions { display:flex; gap:6px; }

.mform-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.mform-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.mform-stats-head { display:grid; grid-template-columns:1fr 120px 120px; gap:8px; font-size:0.65rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#475569; padding:0 2px 6px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:4px; }
.mform-stats-row { display:grid; grid-template-columns:1fr 120px 120px; gap:8px; align-items:center; margin-bottom:5px; }
.mform-stat-name { font-size:0.82rem; color:#94a3b8; }
:global(.mform-stat-input) { padding:5px 8px !important; font-size:0.82rem !important; }
.mform-flags { display:flex; gap:20px; flex-wrap:wrap; font-size:0.85rem; color:#94a3b8; margin-top:12px; }
.mform-flags label { display:flex; align-items:center; gap:7px; cursor:pointer; }
</style>
