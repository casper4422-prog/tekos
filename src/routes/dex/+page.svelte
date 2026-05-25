<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	type SpeciesEntry = {
		name?: string;
		category?: string;
		diet?: string;
		temperament?: string;
		tamingMethod?: string;
		realWorldBasis?: string;
		habitat?: string;
		dossierText?: string;
		baseStats?: Record<string, number>;
		spawnMaps?: string[];
		[k: string]: unknown;
	};

	let { data }: { data: PageData } = $props();
	const ownedBySpecies = $derived(data.ownedBySpecies ?? {});
	const badgedSet = $derived(new Set(data.badgedSpecies ?? []));

	let species = $state<Record<string, SpeciesEntry>>({});
	let search = $state('');
	let activeFilter = $state('all');

	// New filters (planning notes §7) — Map / Owned / Has Badge / Variant Type
	let filterMap = $state<string>('any');
	let filterOwned = $state<'any' | 'owned' | 'not-owned'>('any');
	let filterHasBadge = $state<boolean>(false);
	let filterVariant = $state<string>('any');

	// Variant types — derive from name prefix as v1. Explicit tagging in the
	// species DB would be cleaner but the prefix convention is consistent across
	// the existing ASA entries (Aberrant Rex, X-Rex, R-Carno, Tek Stryder, S-Rex).
	// Falls back to 'Vanilla' when no prefix matches. Lunar variants live on
	// Genesis 1/2 which aren't out for ASA yet, so they're not in the list.
	const VARIANT_OPTIONS = ['Vanilla', 'Aberrant', 'X-', 'R-', 'Tek', 'S-'] as const;
	function variantTypeOf(name: string): string {
		const n = name.trim();
		if (/^Aberrant\s/i.test(n)) return 'Aberrant';
		if (/^X-/i.test(n))         return 'X-';
		if (/^R-/i.test(n))         return 'R-';
		if (/^S-/i.test(n))         return 'S-';
		if (/^Tek\s/i.test(n))      return 'Tek';
		return 'Vanilla';
	}

	// Maps list — pulled from EXPANDED_SPECIES_DATABASE spawnMaps fields on mount.
	let allMaps = $state<string[]>([]);

	const advancedFiltersActive = $derived(
		filterMap !== 'any' || filterOwned !== 'any' || filterHasBadge || filterVariant !== 'any'
	);
	function clearAdvancedFilters() {
		filterMap = 'any';
		filterOwned = 'any';
		filterHasBadge = false;
		filterVariant = 'any';
	}

	// Preview filter buttons → CSS class names on cards
	const FILTERS: { key: string; label: string }[] = [
		{ key: 'all',      label: 'All' },
		{ key: 'combat',   label: 'Combat' },
		{ key: 'flyer',    label: 'Flyer' },
		{ key: 'utility',  label: 'Utility' },
		{ key: 'mount',    label: 'Mount' },
		{ key: 'water',    label: 'Water' },
		{ key: 'resource', label: 'Resource' },
		{ key: 'pet',      label: 'Pet' },
		{ key: 'titan',    label: 'Titan' },
		{ key: 'event',    label: 'Event' },
		{ key: 'boss',     label: 'Boss' }
	];

	function ownedCount(name: string): number {
		// Try exact match then case-insensitive
		if (ownedBySpecies[name]) return ownedBySpecies[name];
		const lower = name.toLowerCase();
		for (const k of Object.keys(ownedBySpecies)) {
			if (k.toLowerCase() === lower) return ownedBySpecies[k];
		}
		return 0;
	}

	// Map DB category → preview category CSS class (direct, no habitat-string heuristics).
	function previewCat(s: SpeciesEntry): string {
		const c = (s.category ?? '').toLowerCase();
		if (c === 'combat')     return 'combat';
		if (c === 'flyer')      return 'flyer';
		if (c === 'aquatic')    return 'water';
		if (c === 'transport')  return 'mount';
		if (c === 'harvesting') return 'resource';
		if (c === 'boss')       return 'boss';
		if (c === 'titan')      return 'titan';
		if (c === 'pet')        return 'pet';
		if (c === 'event')      return 'event';
		if (c === 'utility')    return 'utility';
		return 'utility';
	}

	function previewCatLabel(cat: string): string {
		return cat.charAt(0).toUpperCase() + cat.slice(1);
	}

	function dietClass(diet?: string): string {
		const d = (diet ?? '').toLowerCase();
		if (d.includes('carnivore')) return 'carnivore';
		if (d.includes('herbivore')) return 'herbivore';
		if (d.includes('omnivore'))  return 'omnivore';
		return '';
	}

	function excerpt(text: string | undefined): string {
		if (!text) return '';
		const first = text.split(/(?<=[.!?])\s+/)[0] ?? '';
		return first.length > 180 ? first.slice(0, 180).trimEnd() + '…' : first;
	}

	function speciesNameLong(name: string): boolean {
		return name.length > 10;
	}

	const visibleKeys = $derived.by((): string[] => {
		const keys = Object.keys(species);
		const q = search.trim().toLowerCase();
		return keys
			.filter((k) => {
				const s = species[k];
				if (!s) return false;
				const displayName = s.name ?? k;
				if (q && !displayName.toLowerCase().includes(q)) return false;
				if (activeFilter !== 'all' && previewCat(s) !== activeFilter) return false;
				// Map
				if (filterMap !== 'any') {
					const spawnMaps = s.spawnMaps ?? [];
					if (!spawnMaps.includes(filterMap)) return false;
				}
				// Owned / Not Owned
				const count = ownedCount(displayName);
				if (filterOwned === 'owned' && count === 0) return false;
				if (filterOwned === 'not-owned' && count > 0) return false;
				// Has badge
				if (filterHasBadge && !badgedSet.has(displayName)) return false;
				// Variant type
				if (filterVariant !== 'any' && variantTypeOf(displayName) !== filterVariant) return false;
				return true;
			})
			.sort((a, b) => {
				const na = (species[a].name ?? a).toLowerCase();
				const nb = (species[b].name ?? b).toLowerCase();
				return na.localeCompare(nb);
			});
	});

	function navigateTo(name: string) {
		window.location.href = `/dex/${encodeURIComponent(name)}`;
	}

	onMount(() => {
		const db = (window as unknown as { EXPANDED_SPECIES_DATABASE?: Record<string, SpeciesEntry> })
			.EXPANDED_SPECIES_DATABASE;
		if (db) {
			species = db;
			// Build the unique sorted list of maps for the Map filter dropdown
			const mapSet = new Set<string>();
			for (const key in db) {
				const sm = db[key]?.spawnMaps;
				if (Array.isArray(sm)) for (const m of sm) mapSet.add(String(m));
			}
			allMaps = Array.from(mapSet).sort();
		}

	});
</script>

<svelte:head>
	<title>⬡ TEKOS — Dex</title>
</svelte:head>

<div class="stage">

	<div class="page-title">Dex</div>
	<div class="page-sub"><span class="prefix">›</span>EXPLORER NOTES · SPECIES CODEX</div>

	<!-- Toolbar: search + category filters -->
	<div class="dex-toolbar">
		<div class="dex-search">
			<svg class="dex-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
			<input type="text" class="dex-search-input" placeholder="Search species…" bind:value={search} />
		</div>
		<div class="dex-filters">
			{#each FILTERS as f}
				<button
					class="dex-filter"
					class:active={activeFilter === f.key}
					onclick={() => (activeFilter = f.key)}
				>{f.label}</button>
			{/each}
		</div>

		<!-- Advanced filters: Map / Owned / Has Badge / Variant Type -->
		<div class="dex-adv-row">
			<div class="adv-group">
				<label class="adv-label" for="dex-map">Map</label>
				<select id="dex-map" class="adv-select" bind:value={filterMap}>
					<option value="any">Any map</option>
					{#each allMaps as m (m)}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>

			<div class="adv-group">
				<span class="adv-label">Owned</span>
				<button class="adv-chip" class:active={filterOwned === 'any'} onclick={() => filterOwned = 'any'}>Any</button>
				<button class="adv-chip" class:active={filterOwned === 'owned'} onclick={() => filterOwned = 'owned'}>✓ Owned</button>
				<button class="adv-chip" class:active={filterOwned === 'not-owned'} onclick={() => filterOwned = 'not-owned'}>○ Not Owned</button>
			</div>

			<div class="adv-group">
				<label class="adv-check">
					<input type="checkbox" bind:checked={filterHasBadge} />
					Has Badge
				</label>
			</div>

			<div class="adv-group">
				<label class="adv-label" for="dex-variant">Variant</label>
				<select id="dex-variant" class="adv-select" bind:value={filterVariant}>
					<option value="any">Any variant</option>
					{#each VARIANT_OPTIONS as v}
						<option value={v}>{v}</option>
					{/each}
				</select>
			</div>

			{#if advancedFiltersActive}
				<button class="adv-clear" onclick={clearAdvancedFilters}>Clear filters</button>
			{/if}
		</div>
	</div>

	<!-- Dex cards grid -->
	<div class="dex-grid">
		{#each visibleKeys as key (key)}
			{@const s = species[key]}
			{@const name = (s.name ?? key)}
			{@const cat = previewCat(s)}
			{@const dCls = dietClass(s.diet)}
			{@const owned = ownedCount(name)}
			<div class="dex-card-wrap" onclick={() => navigateTo(name)} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigateTo(name); }}>
				<div class="dex-card {cat}">
					<div class="bracket tl"></div><div class="bracket tr"></div>
					<div class="bracket bl"></div><div class="bracket br"></div>
					<div class="dex-top">
						<span class="dex-latin">{s.realWorldBasis ?? ''}</span>
						<span class="dex-cat-chip">⬡ {previewCatLabel(cat)}</span>
					</div>
					<div class="dex-species" class:long={speciesNameLong(name)}>{name.toUpperCase()}</div>
					<div class="dex-chips">
						{#if s.diet}<span class="chip {dCls}">{s.diet}</span>{/if}
						{#if s.temperament}<span class="chip">{s.temperament}</span>{/if}
						{#if s.tamingMethod}<span class="chip">{s.tamingMethod}</span>{/if}
					</div>
					{#if s.dossierText}
						<p class="dex-excerpt">{excerpt(s.dossierText)}</p>
					{/if}
					<div class="dex-footer">
						{#if owned > 0}
							<span class="dex-owned owned"><span class="glyph">⬡</span><span class="count">{owned}</span>OWNED</span>
						{:else}
							<span class="dex-owned untamed"><span class="glyph">○</span>UNTAMED</span>
						{/if}
						<a class="dex-link" href="/dex/{encodeURIComponent(name)}">Open Dossier <span class="arrow">▸</span></a>
					</div>
				</div>
			</div>
		{/each}
	</div>

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:root {
    --tek-bg:           #050812;
    --tek-blue:         #00b4ff;
    --tek-blue-dim:     rgba(0, 180, 255, 0.12);
    --tek-blue-border:  rgba(0, 180, 255, 0.30);
    --tek-blue-glow:    rgba(0, 180, 255, 0.50);
    --tek-purple:       #8b5cf6;
    --tek-amber:        #f59e0b;
    --tek-green:        #10b981;
    --tek-red:          #ef4444;
    --tek-text:         #e2e8f0;
    --tek-text-dim:     #64748b;
    --tek-text-faint:   #334155;
    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --tek-serif:        'Crimson Pro', Georgia, serif;
}

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(html), :global(body) {
    background: var(--tek-bg);
    color: var(--tek-text);
    font-family: var(--tek-font);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}
:global(body::before) {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.10) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}

.demo-banner {
    position: fixed; top: 14px; left: 14px; z-index: 60;
    background: rgba(245,158,11,0.08);
    border: 1px solid rgba(245,158,11,0.25);
    color: var(--tek-amber);
    font-family: var(--tek-mono);
    font-size: 0.66rem; letter-spacing: 0.12em;
    padding: 5px 10px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.return-link {
    position: fixed; top: 18px; right: 22px; z-index: 50;
    font-family: var(--tek-mono); font-size: 0.7rem;
    letter-spacing: 0.18em; color: var(--tek-text-dim);
    text-decoration: none; transition: color 0.2s;
}
.return-link:hover { color: var(--tek-blue); }
.return-link .arrow { display: inline-block; transform: rotate(180deg); margin-right: 4px; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 90px 24px 90px;
    max-width: 1200px;
    margin: 0 auto;
}

.page-title {
    font-family: var(--tek-display);
    font-size: 1.6rem;
    font-weight: 900;
    letter-spacing: 0.22em;
    color: var(--tek-text);
    margin-bottom: 4px;
    text-transform: uppercase;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
    margin-bottom: 40px;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }

/* ── Filter / search bar ────────────────────────────────────────────────── */
.dex-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    flex-wrap: wrap;
}
.dex-search {
    flex: 1;
    min-width: 200px;
    position: relative;
}
.dex-search-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 14px 10px 38px;
    font-family: inherit;
    font-size: 0.86rem;
    outline: none;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}
.dex-search-input::placeholder { color: var(--tek-text-faint); }
.dex-search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-text-faint);
    pointer-events: none;
}
.dex-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.dex-filter {
    background: rgba(0,180,255,0.04);
    border: 1px solid rgba(0,180,255,0.16);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 7px 12px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
}
.dex-filter:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.40); }
.dex-filter.active { color: #001a2e; background: var(--tek-blue); border-color: var(--tek-blue); }

/* Advanced filters row — Map / Owned / Has Badge / Variant */
.dex-adv-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 18px;
    margin-top: 14px;
    width: 100%;
}
.adv-group { display: flex; align-items: center; gap: 6px; }
.adv-label {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-right: 2px;
}
.adv-select {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    padding: 6px 26px 6px 10px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    appearance: none; -webkit-appearance: none; cursor: pointer;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 12px) 50%, calc(100% - 7px) 50%;
    background-size: 5px 5px; background-repeat: no-repeat;
}
.adv-select:focus { outline: none; border-color: var(--tek-blue); }
.adv-select option { background: #0a1228; color: var(--tek-text); }

.adv-chip {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    padding: 5px 10px;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
}
.adv-chip:hover { color: var(--tek-text); border-color: var(--tek-blue-border); }
.adv-chip.active { background: rgba(0,180,255,0.12); border-color: var(--tek-blue); color: var(--tek-blue); }

.adv-check {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    color: var(--tek-text-dim);
    cursor: pointer;
}
.adv-check input { accent-color: var(--tek-blue); cursor: pointer; }
.adv-check:hover { color: var(--tek-text); }

.adv-clear {
    margin-left: auto;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: #fca5a5;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 5px 11px;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.15s;
}
.adv-clear:hover { background: rgba(239,68,68,0.18); color: #ff8b8b; }

/* ── Grid ───────────────────────────────────────────────────────────────── */
.dex-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
}
@media (max-width: 720px) {
    .dex-grid { grid-template-columns: 1fr; }
}

/* ═════════════════════════════════════════════════════════════════════════
   DEX CARD
   ═════════════════════════════════════════════════════════════════════════ */
.dex-card {
    --cat-rgb: 0,180,255;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.94) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
    padding: 22px 24px 20px;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.22s ease;
}
.dex-card-wrap {
    filter:
        drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.30))
        drop-shadow(0 0 24px rgba(var(--cat-rgb), 0.06))
        drop-shadow(0 12px 40px rgba(0,0,0,0.50));
    transition: filter 0.25s ease;
}
.dex-card-wrap:hover {
    filter:
        drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.70))
        drop-shadow(0 0 36px rgba(var(--cat-rgb), 0.20))
        drop-shadow(0 18px 50px rgba(0,0,0,0.65));
}
.dex-card-wrap:hover .dex-card { transform: translateY(-2px); }

.dex-card::before {
    content: '';
    position: absolute;
    left: 0; top: 16px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb));
    box-shadow: 0 0 8px rgba(var(--cat-rgb), 0.7);
    z-index: 2;
}
.dex-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
        180deg,
        transparent 0px, transparent 3px,
        rgba(0, 180, 255, 0.018) 3px, rgba(0, 180, 255, 0.018) 4px
    );
    pointer-events: none;
    z-index: 1;
}
.dex-card > * { position: relative; z-index: 3; }

/* Category colours */
.dex-card.combat   { --cat-rgb: 239,68,68;   }
.dex-card.flyer    { --cat-rgb: 6,182,212;   }
.dex-card.utility  { --cat-rgb: 34,197,94;   }
.dex-card.water    { --cat-rgb: 59,130,246;  }
.dex-card.boss     { --cat-rgb: 245,158,11;  }
.dex-card.mount    { --cat-rgb: 249,115,22;  }
.dex-card.resource { --cat-rgb: 167,139,250; }
.dex-card.pet      { --cat-rgb: 244,114,182; }
.dex-card.titan    { --cat-rgb: 168,85,247;  }
.dex-card.event    { --cat-rgb: 20,184,166;  }

/* Corner brackets */
.bracket {
    position: absolute;
    width: 16px; height: 16px;
    border: 1.2px solid rgba(var(--cat-rgb), 0.55);
    filter: drop-shadow(0 0 3px rgba(var(--cat-rgb), 0.4));
    z-index: 4;
    pointer-events: none;
}
.bracket.tl { top: 7px; left: 7px; border-right: none; border-bottom: none; }
.bracket.tr { top: 7px; right: 7px; border-left: none; border-bottom: none; }
.bracket.bl { bottom: 7px; left: 7px; border-right: none; border-top: none; }
.bracket.br { bottom: 7px; right: 7px; border-left: none; border-top: none; }

/* ── Top row: latin name + category chip ────────────────────────────── */
.dex-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
}
.dex-latin {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    font-style: italic;
    letter-spacing: 0.05em;
    color: var(--tek-text-faint);
    line-height: 1.3;
    flex: 1;
    min-width: 0;
}
.dex-cat-chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(var(--cat-rgb), 0.10);
    border: 1px solid rgba(var(--cat-rgb), 0.32);
    color: rgb(var(--cat-rgb));
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}

/* ── Species name ────────────────────────────────────────────────────── */
.dex-species {
    font-family: var(--tek-display);
    font-size: clamp(1.4rem, 4vw, 1.9rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.4) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.30));
    margin-bottom: 12px;
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.dex-species.long { font-size: clamp(1.1rem, 3.4vw, 1.55rem); letter-spacing: 0.04em; }

/* ── Chips row (diet, temp, tame) ────────────────────────────────────── */
.dex-chips {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-bottom: 14px;
}
.chip {
    display: inline-flex;
    align-items: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 3px 8px;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.chip.carnivore  { background: rgba(239,68,68,0.10);  border-color: rgba(239,68,68,0.28);  color: #fca5a5; }
.chip.herbivore  { background: rgba(34,197,94,0.10);  border-color: rgba(34,197,94,0.28);  color: #86efac; }
.chip.omnivore   { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.28); color: #fcd34d; }

/* ── Dossier excerpt — serif italic, scientific feel ─────────────────── */
.dex-excerpt {
    font-family: var(--tek-serif);
    font-style: italic;
    font-weight: 400;
    font-size: 1.02rem;
    line-height: 1.55;
    color: #94a3b8;
    margin-bottom: 16px;
    padding-left: 12px;
    border-left: 1px solid rgba(var(--cat-rgb), 0.30);
    position: relative;
}
.dex-excerpt::before {
    content: '"';
    position: absolute;
    left: 0;
    top: -4px;
    color: rgba(var(--cat-rgb), 0.30);
    font-size: 1.6rem;
    font-family: var(--tek-serif);
    line-height: 1;
}

/* ── Footer: owned status + view link ────────────────────────────────── */
.dex-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.dex-owned {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}
.dex-owned.owned {
    color: rgb(var(--cat-rgb));
    text-shadow: 0 0 5px rgba(var(--cat-rgb), 0.45);
}
.dex-owned.untamed { color: var(--tek-text-faint); }
.dex-owned .glyph { font-size: 0.7rem; line-height: 1; }
.dex-owned .count { font-family: var(--tek-display); font-size: 0.86rem; font-weight: 800; }

.dex-link {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.18s, transform 0.18s;
}
.dex-link:hover {
    color: var(--tek-blue);
    transform: translateX(2px);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.dex-link .arrow { color: var(--tek-blue); margin-left: 4px; }

/* ── Bottom note ─────────────────────────────────────────────────────── */
.bottom-note {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    white-space: nowrap;
}

@media (max-width: 540px) {
    .dex-card { padding: 18px 18px 16px; }
    .dex-excerpt { font-size: 0.95rem; }
    .dex-toolbar { gap: 8px; }
    .stage { padding: 80px 14px 80px; }
}
</style>
