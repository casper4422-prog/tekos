<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Creature = Record<string, unknown> & { id: number };

	const CAT_LABEL: Record<string,string> = { combat:'CMB', flyer:'FLY', utility:'UTL', water:'AQU', mount:'MNT', boss:'BSS', resource:'RES' };
	const CAT_COLOR: Record<string,string> = { combat:'#ef4444', flyer:'#06b6d4', utility:'#22c55e', water:'#3b82f6', boss:'#f59e0b', mount:'#f97316', resource:'#a78bfa' };

	function speciesData(speciesName: string) {
		if (typeof window === 'undefined') return null;
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string, Record<string,unknown>> | undefined;
		return db?.[speciesName] ?? null;
	}

	let creatures = $state<Creature[]>(data.creatures as Creature[]);
	let search    = $state('');
	let sortBy    = $state('newest');
	let view      = $state<'expanded'|'compact'>('expanded');

	function totalMuts(c: Creature) {
		const m = (c.mutations as Record<string,number>) ?? {};
		return Object.values(m).reduce((a, b) => a + b, 0);
	}

	function getFiltered(): Creature[] {
		let list = creatures;
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(c =>
				String(c.name ?? '').toLowerCase().includes(q) ||
				String(c.species ?? '').toLowerCase().includes(q)
			);
		}
		const sorted = [...list];
		if      (sortBy === 'name')    sorted.sort((a, b) => String(a.species ?? '').localeCompare(String(b.species ?? '')));
		else if (sortBy === 'level')   sorted.sort((a, b) => (b.level as number ?? 0) - (a.level as number ?? 0));
		else if (sortBy === 'muts')    sorted.sort((a, b) => totalMuts(b) - totalMuts(a));
		else if (sortBy === 'oldest')  sorted.sort((a, b) => (a.id as number) - (b.id as number));
		else                           sorted.sort((a, b) => (b.id as number) - (a.id as number));
		return sorted;
	}

	async function deleteCreature(c: Creature, e: MouseEvent) {
		e.preventDefault();
		if (!confirm(`Delete ${String(c.name ?? String(c.species))}? This cannot be undone.`)) return;
		const res = await fetch(`/api/creatures/${c.id}`, { method: 'DELETE' });
		if (res.ok) creatures = creatures.filter(x => x.id !== c.id);
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Specimens</h1>
			<div class="page-subtitle">{creatures.length} creature{creatures.length !== 1 ? 's' : ''} in vault</div>
		</div>
		<a href="/specimens/add" class="btn btn-primary">+ Add Specimen</a>
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
		<div class="spec-empty">
			{search ? 'No specimens match your search.' : 'No specimens yet. Add your first creature above.'}
		</div>
	{:else if view === 'expanded'}
		<div class="spec-grid">
			{#each getFiltered() as c}
				{@const bs   = (c.baseStats  as Record<string,number>) ?? {}}
				{@const muts = (c.mutations  as Record<string,number>) ?? {}}
				{@const tm   = totalMuts(c)}
				{@const sp   = speciesData(String(c.species ?? ''))}
				{@const cat  = String(sp?.category ?? '')}
				{@const accent = CAT_COLOR[cat] ?? '#00b4ff'}
				{@const code   = CAT_LABEL[cat] ?? 'GEN'}
				<div class="spec-card" style="--accent:{accent};--accent-rgb:{accent.slice(1).match(/../g)?.map(h=>parseInt(h,16)).join(',') ?? '0,180,255'}">
					<div class="spec-header">
						<div class="spec-cat-badge">{code}</div>
						<div class="spec-name-block">
							<div class="spec-species">{String(c.species ?? 'Unknown')}</div>
							<div class="spec-given-name">{String(c.name ?? '')}</div>
						</div>
						<div class="spec-level">Lvl {Number(c.level ?? 1)}</div>
					</div>

					<div class="spec-divider"></div>

					<div class="spec-stats">
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">HP</span>
							<span class="spec-stat-val">{(bs.Health ?? 0).toLocaleString()}</span>
							{#if (muts.Health ?? 0) > 0}<span class="spec-mut-pip">+{muts.Health}</span>{/if}
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Melee</span>
							<span class="spec-stat-val">{bs.Melee ?? 0}%</span>
							{#if (muts.Melee ?? 0) > 0}<span class="spec-mut-pip">+{muts.Melee}</span>{/if}
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Weight</span>
							<span class="spec-stat-val">{(bs.Weight ?? 0).toLocaleString()}</span>
							{#if (muts.Weight ?? 0) > 0}<span class="spec-mut-pip">+{muts.Weight}</span>{/if}
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Stamina</span>
							<span class="spec-stat-val">{(bs.Stamina ?? 0).toLocaleString()}</span>
							{#if (muts.Stamina ?? 0) > 0}<span class="spec-mut-pip">+{muts.Stamina}</span>{/if}
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Food</span>
							<span class="spec-stat-val">{(bs.Food ?? 0).toLocaleString()}</span>
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Oxygen</span>
							<span class="spec-stat-val">{(bs.Oxygen ?? 0).toLocaleString()}</span>
						</div>
						<div class="spec-stat-item">
							<span class="spec-stat-lbl">Crafting</span>
							<span class="spec-stat-val">{bs.Crafting ?? 0}%</span>
						</div>
					</div>

					{#if c.notes}
						<div class="spec-notes">{String(c.notes)}</div>
					{/if}

					<div class="spec-footer">
						<div class="spec-chips">
							<span class="spec-chip">{String(c.gender ?? 'Unknown')}</span>
							{#if tm > 0}<span class="spec-chip mut">{tm} Mutation{tm !== 1 ? 's' : ''}</span>{/if}
							{#if c.cryopodded}<span class="spec-chip">Cryopodded</span>{/if}
							{#if c.neutered}<span class="spec-chip">Neutered</span>{/if}
							{#if c.maleBreeder}<span class="spec-chip">Male Breeder</span>{/if}
						</div>
						<div class="spec-actions">
							<a href="/specimens/{c.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
							<button class="btn btn-danger btn-sm" onclick={(e) => deleteCreature(c, e)}>Delete</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="spec-compact-list">
			{#each getFiltered() as c}
				{@const bs   = (c.baseStats as Record<string,number>) ?? {}}
				{@const tm   = totalMuts(c)}
				{@const sp   = speciesData(String(c.species ?? ''))}
				{@const cat  = String(sp?.category ?? '')}
				{@const accent = CAT_COLOR[cat] ?? '#00b4ff'}
				{@const code   = CAT_LABEL[cat] ?? 'GEN'}
				<div class="spec-compact-card" style="border-left-color:{accent}">
					<div class="spec-compact-badge" style="color:{accent}">{code}</div>
					<div class="spec-compact-info">
						<span class="spec-compact-species">{String(c.species ?? 'Unknown')}</span>
						<span class="spec-compact-name">{String(c.name ?? '')}</span>
					</div>
					<div class="spec-compact-stats">
						<span>HP {(bs.Health ?? 0).toLocaleString()}</span>
						<span>Mel {bs.Melee ?? 0}%</span>
						<span>Lvl {Number(c.level ?? 1)}</span>
						{#if tm > 0}<span class="mut-text">{tm}m</span>{/if}
					</div>
					<div class="spec-compact-actions">
						<a href="/specimens/{c.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
						<button class="btn btn-danger btn-sm" onclick={(e) => deleteCreature(c, e)}>✕</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.spec-controls { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; align-items:center; }
.spec-search { flex:1; min-width:200px; }
.spec-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.9rem; }

/* ── Expanded grid ─────────────────────────────────────── */
.spec-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; }

.spec-card {
	background:linear-gradient(160deg,rgba(14,26,54,0.9) 0%,rgba(5,10,24,0.97) 100%);
	border:1px solid rgba(255,255,255,0.06);
	border-left:3px solid var(--accent,#00b4ff);
	border-radius:10px; padding:16px 18px;
	display:flex; flex-direction:column; gap:10px;
	position:relative; overflow:hidden;
	transition:transform .18s, box-shadow .18s;
}
.spec-card::before {
	content:''; position:absolute; inset:0;
	background:linear-gradient(135deg,rgba(var(--accent-rgb,0,180,255),0.04) 0%,transparent 55%);
	pointer-events:none;
}
.spec-card:hover {
	transform:translateY(-2px);
	box-shadow:-3px 0 18px rgba(var(--accent-rgb,0,180,255),0.2),0 6px 28px rgba(0,0,0,0.5);
}

/* Header */
.spec-header { display:flex; align-items:flex-start; gap:10px; }
.spec-cat-badge {
	background:rgba(var(--accent-rgb,0,180,255),0.12);
	border:1px solid rgba(var(--accent-rgb,0,180,255),0.3);
	color:var(--accent,#00b4ff);
	font-size:0.58rem; font-weight:800; letter-spacing:0.12em;
	text-transform:uppercase; padding:3px 7px; border-radius:4px;
	flex-shrink:0; margin-top:3px;
}
.spec-name-block { flex:1; min-width:0; }
.spec-species {
	font-size:1rem; font-weight:700; color:#f1f5f9;
	letter-spacing:-0.01em; white-space:nowrap;
	overflow:hidden; text-overflow:ellipsis;
}
.spec-given-name {
	font-size:0.75rem; color:var(--accent,#00b4ff);
	opacity:0.75; margin-top:2px; font-style:italic;
	white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.spec-level {
	font-size:0.72rem; font-weight:700; color:#f1f5f9;
	background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
	border-radius:5px; padding:3px 8px; white-space:nowrap; flex-shrink:0;
}

.spec-divider { height:1px; background:rgba(255,255,255,0.05); }

/* Stats 7-up grid */
.spec-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
.spec-stat-item {
	background:rgba(0,0,0,0.2); border-radius:7px;
	padding:7px 6px; display:flex; flex-direction:column;
	align-items:center; gap:2px; position:relative;
}
.spec-stat-lbl { font-size:0.58rem; color:#475569; text-transform:uppercase; letter-spacing:.05em; }
.spec-stat-val { font-size:0.88rem; font-weight:700; color:#f1f5f9; }
.spec-mut-pip {
	position:absolute; top:-3px; right:-3px;
	background:rgba(139,92,246,0.85); color:#fff;
	border-radius:99px; padding:0 4px;
	font-size:0.55rem; font-weight:800;
}

.spec-notes { font-size:0.77rem; color:#64748b; line-height:1.5; }

/* Footer */
.spec-footer { display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
.spec-chips { display:flex; gap:5px; flex-wrap:wrap; }
.spec-chip {
	font-size:0.67rem; font-weight:500; letter-spacing:0.02em;
	background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
	border-radius:4px; padding:2px 7px; color:#64748b;
}
.spec-chip.mut { color:var(--accent,#00b4ff); border-color:rgba(var(--accent-rgb,0,180,255),0.3); background:rgba(var(--accent-rgb,0,180,255),0.08); }
.spec-actions { display:flex; gap:6px; flex-shrink:0; }

/* ── Compact list ──────────────────────────────────────── */
.spec-compact-list { display:flex; flex-direction:column; gap:5px; }
.spec-compact-card {
	display:flex; align-items:center; gap:12px;
	background:rgba(14,26,54,0.7); border:1px solid rgba(255,255,255,0.06);
	border-left:3px solid; border-radius:8px; padding:10px 14px;
}
.spec-compact-badge { font-size:0.58rem; font-weight:800; letter-spacing:0.1em; flex-shrink:0; }
.spec-compact-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.spec-compact-species { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.spec-compact-name { font-size:0.72rem; color:#64748b; font-style:italic; }
.spec-compact-stats { display:flex; gap:10px; font-size:0.75rem; color:#64748b; white-space:nowrap; }
.mut-text { color:#a78bfa; font-weight:600; }
.spec-compact-actions { display:flex; gap:6px; }
</style>
