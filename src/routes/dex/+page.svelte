<script lang="ts">
	import { onMount } from 'svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';

	type SpeciesEntry = {
		name: string;
		icon?: string;
		category?: string;
		rarity?: string;
		temperament?: string;
		diet?: string;
		dossierText?: string;
		source?: string;
		habitat?: string;
	};

	let allSpecies = $state<SpeciesEntry[]>([]);
	let search     = $state('');
	let category   = $state('all');

	// Categories must match actual species-database.js values: combat, utility, transport, harvesting, boss
	const CATEGORIES = ['all','combat','utility','transport','harvesting','boss'];
	const CAT_DISPLAY: Record<string,string> = {
		all:'All', combat:'Combat', utility:'Utility',
		transport:'Companions', harvesting:'Harvesting', boss:'Boss'
	};
	const CAT_LABEL: Record<string,string> = {
		combat:'CMB', utility:'UTL', transport:'CMP',
		harvesting:'HRV', boss:'BSS'
	};

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,SpeciesEntry> | undefined;
		if (db) allSpecies = Object.entries(db)
			.filter(([, v]) => v && typeof v === 'object')
			.map(([key, v]) => ({ ...v, name: v.name || key }))
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	});

	function getFiltered(): SpeciesEntry[] {
		let list = allSpecies;
		if (category !== 'all') list = list.filter(s => s.category === category);
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(s => (s.name ?? '').toLowerCase().includes(q));
		}
		return list;
	}

	function snippet(text: string | undefined): string {
		if (!text) return '';
		const sentences = text.split(/(?<=[.!?])\s+/);
		let out = sentences[0] ?? '';
		if (sentences[1]) out += ' ' + sentences[1];
		return out.length > 220 ? out.slice(0, 220).trimEnd() + '…' : out;
	}

	function catCode(s: SpeciesEntry): string {
		return CAT_LABEL[s.category ?? ''] ?? 'GEN';
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Dex</h1>
			<div class="page-subtitle">{allSpecies.length} species in database</div>
		</div>
	</div>

	<div class="dex-controls">
		<input class="form-control dex-search" placeholder="Search species..." bind:value={search} />
		<div class="dex-cats">
			{#each CATEGORIES as cat}
				<button class="dex-cat-btn" class:active={category === cat} onclick={() => category = cat}>
					{#if cat !== 'all' && CAT_LABEL[cat]}<span class="dex-cat-code">{CAT_LABEL[cat]}</span>{/if}
					{CAT_DISPLAY[cat]}
				</button>
			{/each}
		</div>
	</div>

	{#if allSpecies.length === 0}
		<div class="dex-loading">Initialising species database...</div>
	{:else if getFiltered().length === 0}
		<div class="dex-loading">No species match your search.</div>
	{:else}
		<div class="dex-grid">
			{#each getFiltered() as s}
				{@const cat = s.category ?? 'default'}
				{@const rgb = ({combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250'})[cat] ?? '0,180,255'}
				<a class="cham-shell {cat} dex-card-link" href="/dex/{encodeURIComponent(s.name)}" style="--cat-rgb:{rgb}">
				<div class="dex-card">
					<div class="dex-card-header">
						<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={11} />{catCode(s)}</div>
						<div class="dex-name-block">
							<div class="dex-name">{s.name}</div>
							<div class="dex-sub">
								{#if s.diet}<span class="dex-accent">{s.diet}</span>{#if s.temperament} &nbsp;·&nbsp; {/if}{/if}
								{#if s.temperament}{s.temperament}{/if}
							</div>
						</div>
					</div>

					{#if snippet(s.dossierText)}
						<div class="dex-divider"></div>
						<div class="dex-snippet">{snippet(s.dossierText)}</div>
					{/if}

					<div class="dex-footer">
						<span class="dex-source">{s.source ?? 'Base Game'}</span>
						{#if s.rarity}<span class="dex-rarity {s.rarity}">{s.rarity}</span>{/if}
					</div>
				</div><!-- dex-card -->
				</a><!-- cham-shell -->
			{/each}
		</div>
	{/if}

	{#if category === 'transport' || category === 'all'}
		<div class="dex-asa-notice">
			Newer ASA companion creatures (Draklings, Veilwyns, Armodoggo) are not yet in the species database. The database was built from the original V2 data set and will be updated as ASA adds more creatures.
		</div>
	{/if}
</div>

<style>
.dex-asa-notice { margin-top:24px; font-size:0.76rem; color:#334155; background:rgba(255,255,255,0.02); border-left:2px solid rgba(0,180,255,0.15); padding:10px 14px; line-height:1.6; max-width:600px; }
/* Controls */
.dex-controls { display:flex; flex-direction:column; gap:12px; margin-bottom:28px; }
.dex-search { max-width:380px; }
.dex-cats { display:flex; gap:6px; flex-wrap:wrap; }
.dex-cat-btn {
	display:flex; align-items:center; gap:5px;
	background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
	color:#64748b; border-radius:6px; padding:5px 12px;
	font-size:0.75rem; font-weight:500; cursor:pointer; transition:all .15s;
	font-family:inherit;
}
.dex-cat-btn:hover { background:rgba(255,255,255,0.06); color:#94a3b8; }
.dex-cat-btn.active { background:rgba(0,180,255,0.1); color:#7dd3fc; border-color:rgba(0,180,255,0.3); font-weight:600; }
.dex-cat-code { font-size:0.6rem; font-weight:800; letter-spacing:0.08em; opacity:0.7; }
.dex-loading { color:#334155; padding:48px 0; text-align:center; font-size:0.9rem; }

/* Grid */
.dex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }

.dex-card-link { display:block; text-decoration:none; color:inherit; }

.dex-card {
	display:flex; flex-direction:column; gap:10px;
	background:linear-gradient(160deg,rgba(10,18,40,0.97) 0%,rgba(4,8,20,1) 100%);
	padding:16px 18px;
}

/* Header */
.dex-card-header { display:flex; align-items:flex-start; gap:10px; }
.dex-cat-badge {
	background:rgba(var(--accent-rgb,0,180,255),0.12);
	border:1px solid rgba(var(--accent-rgb,0,180,255),0.3);
	color:var(--accent,#00b4ff);
	font-size:0.58rem; font-weight:800; letter-spacing:0.12em;
	text-transform:uppercase; padding:3px 7px; border-radius:4px;
	flex-shrink:0; margin-top:3px;
}
.dex-name-block { flex:1; min-width:0; }
.dex-name {
	font-size:1rem; font-weight:700; color:#f1f5f9;
	letter-spacing:-0.01em; white-space:nowrap;
	overflow:hidden; text-overflow:ellipsis;
}
.dex-sub { font-size:0.71rem; color:#64748b; margin-top:3px; }
.dex-accent { color:var(--accent,#00b4ff); opacity:0.85; }

/* Divider */
.dex-divider { height:1px; background:rgba(255,255,255,0.05); }

/* Dossier snippet */
.dex-snippet {
	font-size:0.77rem; line-height:1.65; color:#64748b;
	display:-webkit-box; -webkit-line-clamp:3;
	-webkit-box-orient:vertical; overflow:hidden;
}

/* Footer */
.dex-footer { display:flex; justify-content:space-between; align-items:center; margin-top:2px; }
.dex-source { font-size:0.67rem; color:#334155; font-weight:500; letter-spacing:0.04em; text-transform:uppercase; }
.dex-rarity { font-size:0.67rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }
.dex-rarity.common    { color:#475569; }
.dex-rarity.uncommon  { color:#22c55e; }
.dex-rarity.rare      { color:#3b82f6; }
.dex-rarity.epic      { color:#a855f7; }
.dex-rarity.legendary { color:#f59e0b; }
.dex-rarity.boss      { color:#ef4444; }
</style>
