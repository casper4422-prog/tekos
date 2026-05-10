<script lang="ts">
	import { onMount } from 'svelte';

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

	const CATEGORIES = ['all','combat','flyer','utility','water','mount','boss','resource'];

	const CAT_LABEL: Record<string,string> = {
		combat:'CMB', flyer:'FLY', utility:'UTL', water:'AQU',
		mount:'MNT', boss:'BSS', resource:'RES'
	};
	const CAT_DISPLAY: Record<string,string> = {
		combat:'Combat', flyer:'Flyer', utility:'Utility', water:'Aquatic',
		mount:'Mount', boss:'Boss', resource:'Resource', all:'All'
	};

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,SpeciesEntry> | undefined;
		if (db) allSpecies = Object.values(db)
			.filter(s => s && s.name)
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
				<a class="dex-card {s.category ?? 'default'}" href="/dex/{encodeURIComponent(s.name)}">
					<div class="dex-card-header">
						<div class="dex-cat-badge">{catCode(s)}</div>
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
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
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
.dex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; }

/* Card base */
.dex-card {
	display:flex; flex-direction:column; gap:10px;
	background:linear-gradient(160deg,rgba(14,26,54,0.9) 0%,rgba(5,10,24,0.97) 100%);
	border:1px solid rgba(255,255,255,0.06);
	border-left:3px solid var(--accent, #00b4ff);
	border-radius:10px; padding:16px 18px;
	text-decoration:none; color:inherit;
	transition:transform .18s, box-shadow .18s, border-color .18s;
	position:relative; overflow:hidden;
}
.dex-card::before {
	content:''; position:absolute; inset:0;
	background:linear-gradient(135deg,rgba(var(--accent-rgb,0,180,255),0.04) 0%,transparent 55%);
	pointer-events:none;
}
.dex-card:hover {
	transform:translateY(-2px);
	box-shadow:-3px 0 18px rgba(var(--accent-rgb,0,180,255),0.22), 0 6px 28px rgba(0,0,0,0.5);
	border-top-color:rgba(var(--accent-rgb,0,180,255),0.18);
	border-right-color:rgba(var(--accent-rgb,0,180,255),0.08);
	border-bottom-color:rgba(var(--accent-rgb,0,180,255),0.08);
}

/* Category colors */
.dex-card.combat   { --accent:#ef4444; --accent-rgb:239,68,68;   }
.dex-card.flyer    { --accent:#06b6d4; --accent-rgb:6,182,212;   }
.dex-card.utility  { --accent:#22c55e; --accent-rgb:34,197,94;   }
.dex-card.water    { --accent:#3b82f6; --accent-rgb:59,130,246;  }
.dex-card.boss     { --accent:#f59e0b; --accent-rgb:245,158,11;  }
.dex-card.mount    { --accent:#f97316; --accent-rgb:249,115,22;  }
.dex-card.resource { --accent:#a78bfa; --accent-rgb:167,139,250; }
.dex-card.default  { --accent:#00b4ff; --accent-rgb:0,180,255;   }

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
