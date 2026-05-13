<script lang="ts">
	import { onMount } from 'svelte';

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
		[k: string]: unknown;
	};

	let species = $state<Record<string, SpeciesEntry>>({});
	let search = $state('');
	let activeFilter = $state('all');
	let hexCanvas: HTMLCanvasElement | null = $state(null);

	// Preview filter buttons → CSS class names on cards
	const FILTERS: { key: string; label: string }[] = [
		{ key: 'all',      label: 'All' },
		{ key: 'combat',   label: 'Combat' },
		{ key: 'flyer',    label: 'Flyer' },
		{ key: 'utility',  label: 'Utility' },
		{ key: 'mount',    label: 'Mount' },
		{ key: 'water',    label: 'Water' },
		{ key: 'resource', label: 'Resource' }
	];

	// Map DB category → preview category CSS class
	function previewCat(s: SpeciesEntry): string {
		const c = (s.category ?? '').toLowerCase();
		if (c === 'combat')     return 'combat';
		if (c === 'utility')    return 'utility';
		if (c === 'transport')  return 'mount';
		if (c === 'harvesting') return 'resource';
		if (c === 'boss')       return 'boss';
		// Heuristics for flyer / water from habitat
		const habitat = (s.habitat ?? '').toLowerCase();
		if (/(sky|aer|flying|cliff|mountain peak)/.test(habitat)) return 'flyer';
		if (/(ocean|sea|water|river|lake|aquatic)/.test(habitat)) return 'water';
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

	function visibleKeys(): string[] {
		const keys = Object.keys(species);
		const q = search.trim().toLowerCase();
		return keys
			.filter((k) => {
				const s = species[k];
				if (!s) return false;
				const name = (s.name ?? k).toLowerCase();
				if (q && !name.includes(q)) return false;
				if (activeFilter !== 'all' && previewCat(s) !== activeFilter) return false;
				return true;
			})
			.sort((a, b) => {
				const na = (species[a].name ?? a).toLowerCase();
				const nb = (species[b].name ?? b).toLowerCase();
				return na.localeCompare(nb);
			});
	}

	function navigateTo(name: string) {
		window.location.href = `/dex/${encodeURIComponent(name)}`;
	}

	onMount(() => {
		const db = (window as unknown as { EXPANDED_SPECIES_DATABASE?: Record<string, SpeciesEntry> })
			.EXPANDED_SPECIES_DATABASE;
		if (db) species = db;

		// Hex canvas animation (literal port from preview)
		const canvas = hexCanvas;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const R = 32, W = R * Math.sqrt(3), H = R * 2;
		let phase = 0;
		let raf = 0;

		function drawHex(x: number, y: number, opacity: number) {
			if (!ctx) return;
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = x + (R - 1) * Math.cos(a);
				const py = y + (R - 1) * Math.sin(a);
				i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
			}
			ctx.closePath();
			ctx.strokeStyle = `rgba(0,180,255,${opacity})`;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		function draw() {
			if (!ctx || !canvas) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			const cw = canvas.width, ch = canvas.height;
			const cols = Math.ceil(cw / W) + 3;
			const rows = Math.ceil(ch / (H * 0.75)) + 3;
			for (let row = -1; row < rows; row++) {
				for (let col = -1; col < cols; col++) {
					const x = col * W + (row % 2 !== 0 ? W / 2 : 0);
					const y = row * H * 0.75;
					const dx = x - cw * 0.5, dy = y - ch * 0.5;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const wave = Math.sin(phase - dist * 0.01) * 0.5 + 0.5;
					drawHex(x, y, 0.07 + wave * 0.09);
				}
			}
			phase += 0.005;
			raf = requestAnimationFrame(draw);
		}
		function resize() {
			if (!canvas) return;
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		}
		window.addEventListener('resize', resize);
		resize();
		draw();

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<svelte:head>
	<title>⬡ TEKOS — Dex</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

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
	</div>

	<!-- Dex cards grid -->
	<div class="dex-grid">
		{#each visibleKeys() as key (key)}
			{@const s = species[key]}
			{@const name = (s.name ?? key)}
			{@const cat = previewCat(s)}
			{@const dCls = dietClass(s.diet)}
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
						<span class="dex-owned untamed"><span class="glyph">○</span>UNTAMED</span>
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
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

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
