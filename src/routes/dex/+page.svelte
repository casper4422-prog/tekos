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

	// ASA Companion Mode creatures (new system — only 2 exist, follow across disconnects)
	const ASA_COMPANIONS = new Set([
		'armadoggo','veilwyn'
	]);

	// Shoulder pets — carried on the player's shoulder, half inventory weight
	const SHOULDER_PETS = new Set([
		'bulbdog','compy','dimorphodon','featherlight','fjordhawk','glowtail',
		'hesperornis','ichthyornis','jerboa','mesopithecus','microraptor',
		'noglin','otter','pegomastax','shinehorn','sinomacrops','vulture',
		'cosmo','ferox','drakeling'
	]);

	let allSpecies = $state<SpeciesEntry[]>([]);
	let search     = $state('');
	let category   = $state('all');

	// Standard DB categories + special filters for companions/shoulder pets
	const CATEGORIES = ['all','combat','utility','transport','harvesting','boss','companions','shoulder'];
	const CAT_DISPLAY: Record<string,string> = {
		all:'All', combat:'Combat', utility:'Utility',
		transport:'Mounts', harvesting:'Harvesting', boss:'Boss',
		companions:'Companions', shoulder:'Shoulder Pets'
	};
	const CAT_LABEL: Record<string,string> = {
		combat:'CMB', utility:'UTL', transport:'MNT',
		harvesting:'HRV', boss:'BSS', companions:'CMP', shoulder:'SHD'
	};
	const CAT_COLORS: Record<string,string> = {
		combat:'239,68,68', utility:'34,197,94', transport:'59,130,246',
		harvesting:'245,158,11', boss:'245,158,11',
		companions:'139,92,246', shoulder:'6,182,212'
	};

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,SpeciesEntry> | undefined;
		if (db) allSpecies = Object.entries(db)
			.filter(([, v]) => v && typeof v === 'object')
			.map(([key, v]) => ({ ...v, name: v.name || key }))
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	});

	function matchesCategory(s: SpeciesEntry): boolean {
		if (category === 'all') return true;
		const nameLow = (s.name ?? '').toLowerCase();
		if (category === 'companions')  return ASA_COMPANIONS.has(nameLow);
		if (category === 'shoulder')    return SHOULDER_PETS.has(nameLow);
		return s.category === category;
	}

	function getFiltered(): SpeciesEntry[] {
		let list = allSpecies.filter(s => matchesCategory(s));
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
		const nameLow = (s.name ?? '').toLowerCase();
		if (ASA_COMPANIONS.has(nameLow)) return 'CMP';
		if (SHOULDER_PETS.has(nameLow))  return 'SHD';
		return CAT_LABEL[s.category ?? ''] ?? 'GEN';
	}

	function catRgb(s: SpeciesEntry): string {
		const nameLow = (s.name ?? '').toLowerCase();
		if (ASA_COMPANIONS.has(nameLow)) return '139,92,246';
		if (SHOULDER_PETS.has(nameLow))  return '6,182,212';
		return CAT_COLORS[s.category ?? ''] ?? '0,180,255';
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
					{CAT_DISPLAY[cat]}
				</button>
			{/each}
		</div>
	</div>

	<!-- Companion/Shoulder note -->
	{#if category === 'companions'}
		<div class="dex-cat-note">
			<strong>Companion Mode</strong> is an ASA-exclusive system. Only <strong>Armadoggo</strong> and <strong>Veilwyn</strong> currently support it. Companions can't permanently die, follow you across disconnects, and unlock unique abilities. Only one companion can be active at a time.
		</div>
	{:else if category === 'shoulder'}
		<div class="dex-cat-note">
			<strong>Shoulder Pets</strong> sit on your shoulder and act as mini backpacks — items in their inventory count at half-weight. Each has a unique utility ability. Fjordhawk, Otter, and Sinomacrops are among the most useful for survival.
		</div>
	{:else if category === 'transport'}
		<div class="dex-cat-note">
			<strong>Mounts</strong> are creatures you can ride using a saddle. This includes cargo haulers (Quetzal, Argentavis), combat mounts (Rex, Carno), and utility riders.
		</div>
	{/if}

	{#if allSpecies.length === 0}
		<div class="dex-loading">Initialising species database...</div>
	{:else if getFiltered().length === 0}
		{#if category === 'companions'}
			<div class="dex-loading">Armadoggo and Veilwyn are newer ASA creatures not yet in the V2 database. Use the search bar to browse all species, or add them manually via Specimens.</div>
		{:else}
			<div class="dex-loading">No species found.</div>
		{/if}
	{:else}
		<div class="dex-grid">
			{#each getFiltered() as s}
				{@const rgb = catRgb(s)}
				{@const code = catCode(s)}
				{@const cat = (s.category ?? 'default') as string}
				<a class="cham-shell dex-card-link" href="/dex/{encodeURIComponent(s.name)}" style="--cat-rgb:{rgb}">
				<div class="dex-card">
					<div class="dex-card-header">
						<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={11} />{code}</div>
					</div>
					<div class="dex-name">{s.name}</div>
					<div class="dex-sub">
						{#if s.diet}<span class="dex-accent" style="color:rgb({rgb})">{s.diet}</span>{#if s.temperament} &nbsp;·&nbsp; {/if}{/if}
						{#if s.temperament}{s.temperament}{/if}
					</div>

					{#if snippet(s.dossierText)}
						<div class="dex-divider"></div>
						<div class="dex-snippet">{snippet(s.dossierText)}</div>
					{/if}

					<div class="dex-footer">
						<span class="dex-source">{s.source ?? 'Base Game'}</span>
						{#if s.rarity}<span class="dex-rarity {s.rarity}">{s.rarity}</span>{/if}
					</div>
				</div>
				</a>
			{/each}
		</div>
	{/if}

	{#if category === 'all' || category === 'companions' || category === 'transport'}
		<div class="dex-asa-notice">
			Newer ASA creatures (Armadoggo, Veilwyn, and seasonal event creatures) are not in the V2 species database. Search for them by name or use the Companions filter to see what's expected.
		</div>
	{/if}
</div>

<style>
.dex-controls { display:flex; flex-direction:column; gap:12px; margin-bottom:16px; }
.dex-search { max-width:380px; }
.dex-cats { display:flex; gap:5px; flex-wrap:wrap; }
.dex-cat-btn { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); color:#64748b; border-radius:0; padding:5px 12px; font-size:0.75rem; font-weight:500; cursor:pointer; transition:all .15s; font-family:inherit; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.dex-cat-btn:hover { background:rgba(255,255,255,0.07); color:#94a3b8; }
.dex-cat-btn.active { background:rgba(0,180,255,0.1); color:#7dd3fc; border-color:rgba(0,180,255,0.3); font-weight:600; }
.dex-loading { color:#334155; padding:48px 0; text-align:center; font-size:0.88rem; max-width:540px; line-height:1.6; }

.dex-cat-note { background:rgba(0,180,255,0.04); border-left:2px solid rgba(0,180,255,0.25); padding:10px 14px; font-size:0.78rem; color:#64748b; line-height:1.6; margin-bottom:16px; max-width:680px; }
.dex-cat-note strong { color:#94a3b8; }

.dex-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:14px; }
.dex-card-link { display:block; text-decoration:none; color:inherit; }
.dex-card { display:flex; flex-direction:column; gap:8px; background:linear-gradient(160deg,rgba(10,18,40,0.97) 0%,rgba(4,8,20,1) 100%); padding:15px 17px; }
.dex-card-header { display:flex; align-items:center; gap:8px; }
.dex-name { font-size:1rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.01em; }
.dex-sub { font-size:0.71rem; color:#64748b; }
.dex-accent { opacity:0.85; }
.dex-divider { height:1px; background:rgba(255,255,255,0.05); }
.dex-snippet { font-size:0.77rem; line-height:1.65; color:#64748b; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.dex-footer { display:flex; justify-content:space-between; align-items:center; margin-top:2px; }
.dex-source { font-size:0.67rem; color:#334155; font-weight:500; letter-spacing:0.04em; text-transform:uppercase; }
.dex-rarity { font-size:0.67rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; }
.dex-rarity.common    { color:#475569; }
.dex-rarity.uncommon  { color:#22c55e; }
.dex-rarity.rare      { color:#3b82f6; }
.dex-rarity.epic      { color:#a855f7; }
.dex-rarity.legendary { color:#f59e0b; }
.dex-rarity.boss      { color:#ef4444; }
.dex-asa-notice { margin-top:24px; font-size:0.75rem; color:#1e293b; border-left:2px solid rgba(255,255,255,0.06); padding:8px 12px; max-width:600px; line-height:1.6; }
</style>
