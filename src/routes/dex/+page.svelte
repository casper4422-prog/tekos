<script lang="ts">
	import { onMount } from 'svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

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
		const db = window.EXPANDED_SPECIES_DATABASE as Record<string,SpeciesEntry> | undefined;
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

<div class="tek-stage">
	<PageHeader
		title="Dex"
		crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Dex' }]}
		sub={allSpecies.length > 0
			? `${allSpecies.length} species catalogued`
			: 'Loading species database…'}
		subMono={true}
	/>

	<div class="dex-controls">
		<input class="tek-input-v2 dex-search" placeholder="Search species…" bind:value={search} />
		<div class="dex-cats">
			{#each CATEGORIES as cat}
				<button class="tek-chip" class:on={category === cat} onclick={() => category = cat}>
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
				<a class="dex-card-link" href="/dex/{encodeURIComponent(s.name)}" style="--cat-rgb: {rgb};">
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
.dex-controls { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
.dex-search { max-width: 380px; }
.dex-cats { display: flex; gap: 5px; flex-wrap: wrap; }
.dex-loading {
    color: var(--tek-text-faint);
    padding: 48px 0;
    text-align: center;
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.95rem;
    max-width: 540px;
    margin: 0 auto;
    line-height: 1.6;
}

.dex-cat-note {
    background: rgba(0,180,255,0.04);
    border: 1px solid rgba(0,180,255,0.15);
    border-left: 2px solid var(--tek-blue);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 12px 16px;
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.5;
    margin-bottom: 18px;
    max-width: 720px;
}
.dex-cat-note strong { color: var(--tek-text); }

.dex-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 12px;
}
.dex-card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    transition: transform 0.15s;
}
.dex-card-link:hover { transform: translateY(-2px); }

.dex-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid rgba(var(--cat-rgb, 0,180,255), 0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s;
}
.dex-card-link:hover .dex-card {
    border-color: rgba(var(--cat-rgb, 0,180,255), 0.50);
    box-shadow: 0 6px 18px rgba(var(--cat-rgb), 0.10);
}
.dex-card::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb, 0,180,255));
    box-shadow: 0 0 6px rgba(var(--cat-rgb), 0.45);
}
.dex-card-header { display: flex; align-items: center; gap: 8px; }
.cat-badge-v3 {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(var(--cat-rgb, 0,180,255), 0.10);
    border: 1px solid rgba(var(--cat-rgb, 0,180,255), 0.40);
    color: rgb(var(--cat-rgb, 0,180,255));
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    padding: 3px 7px;
    text-transform: uppercase;
}

.dex-name {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--tek-text);
}
.dex-sub {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.dex-accent { opacity: 0.9; }
.dex-divider {
    height: 1px;
    background: linear-gradient(90deg, rgba(0,180,255,0.10), transparent);
}
.dex-snippet {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.88rem;
    line-height: 1.5;
    color: var(--tek-text-dim);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
.dex-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid rgba(0,180,255,0.06);
}
.dex-source {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    color: var(--tek-text-faint);
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}
.dex-rarity {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 2px 6px;
    border: 1px solid currentColor;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.dex-rarity.common    { color: #94a3b8; }
.dex-rarity.uncommon  { color: var(--tek-green); }
.dex-rarity.rare      { color: var(--tek-blue); }
.dex-rarity.epic      { color: var(--tek-purple); }
.dex-rarity.legendary { color: var(--tek-amber); }
.dex-rarity.boss      { color: var(--tek-red); }

.dex-asa-notice {
    margin-top: 28px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-faint);
    border-left: 2px solid rgba(100,116,139,0.20);
    padding: 10px 14px;
    max-width: 720px;
    line-height: 1.5;
    letter-spacing: 0.04em;
}
</style>
