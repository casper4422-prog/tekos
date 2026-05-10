<script lang="ts">
	import { onMount } from 'svelte';

	type SpeciesEntry = { name: string; icon?: string; category?: string; rarity?: string; temperament?: string; dossierText?: string };

	let allSpecies = $state<SpeciesEntry[]>([]);
	let search     = $state('');
	let category   = $state('all');

	const CATEGORIES = ['all','combat','utility','mount','flyer','water','boss','resource'];

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string, SpeciesEntry> | undefined;
		if (db) allSpecies = Object.values(db)
			.filter(s => s && s.name)
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	});

	function getFiltered(): SpeciesEntry[] {
		let list = allSpecies;
		if (category !== 'all') list = list.filter(s => s.category === category);
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(s => s.name.toLowerCase().includes(q));
		}
		return list;
	}

	const RARITY_COLOR: Record<string,string> = {
		common: '#64748b', uncommon: '#22c55e', rare: '#3b82f6',
		epic: '#a855f7', legendary: '#f59e0b', boss: '#ef4444'
	};
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>🦖 Dex</h1>
			<div class="page-subtitle">{allSpecies.length} species in database</div>
		</div>
	</div>

	<div class="dex-controls">
		<input class="form-control search-input" placeholder="🔍 Search species..." bind:value={search} />
		<div class="dex-cats">
			{#each CATEGORIES as cat}
				<button class="dex-cat-btn" class:active={category === cat} onclick={() => category = cat}>
					{cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
				</button>
			{/each}
		</div>
	</div>

	{#if allSpecies.length === 0}
		<div style="color:#64748b;padding:40px 0;text-align:center">Loading species database...</div>
	{:else if getFiltered().length === 0}
		<div style="color:#64748b;padding:40px 0;text-align:center">No species found.</div>
	{:else}
		<div class="dex-grid">
			{#each getFiltered() as s}
				<a class="dex-card" href="/dex/{encodeURIComponent(s.name)}">
					<div class="dex-card-icon">{s.icon ?? '🦖'}</div>
					<div class="dex-card-name">{s.name}</div>
					{#if s.category}<div class="dex-card-cat">{s.category}</div>{/if}
					{#if s.rarity}
						<div class="dex-card-rarity" style="color:{RARITY_COLOR[s.rarity] ?? '#64748b'}">{s.rarity}</div>
					{/if}
					{#if s.temperament}<div class="dex-card-temp">{s.temperament}</div>{/if}
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
.dex-controls { display:flex; flex-direction:column; gap:12px; margin-bottom:24px; }
.dex-controls .search-input { max-width:400px; }
.dex-cats { display:flex; gap:6px; flex-wrap:wrap; }
.dex-cat-btn { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:#64748b; border-radius:99px; padding:4px 14px; font-size:0.8rem; cursor:pointer; transition:all .15s; }
.dex-cat-btn:hover { background:rgba(0,180,255,.1); color:#60a5fa; border-color:rgba(0,180,255,.3); }
.dex-cat-btn.active { background:rgba(0,180,255,.15); color:#00b4ff; border-color:rgba(0,180,255,.5); font-weight:600; }

.dex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
.dex-card { background:var(--tek-card-bg,linear-gradient(160deg,rgba(14,26,54,.88),rgba(5,10,24,.94))); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:12px; padding:16px 12px; text-align:center; text-decoration:none; display:flex; flex-direction:column; align-items:center; gap:4px; transition:border-color .15s,transform .15s; cursor:pointer; }
.dex-card:hover { border-color:rgba(0,180,255,.4); transform:translateY(-2px); }
.dex-card-icon { font-size:2rem; margin-bottom:4px; }
.dex-card-name { font-size:0.85rem; font-weight:600; color:#f1f5f9; }
.dex-card-cat { font-size:0.7rem; color:#64748b; text-transform:capitalize; }
.dex-card-rarity { font-size:0.7rem; font-weight:600; text-transform:capitalize; }
.dex-card-temp { font-size:0.7rem; color:#94a3b8; }
</style>
