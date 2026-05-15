<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	type SpeciesData = Record<string, unknown>;

	let species  = $state<SpeciesData | null>(null);
	let name     = $derived($page.params.species ? decodeURIComponent($page.params.species) : '');
	let wlAdded  = $state(false);
	let wlSaving = $state(false);
	let artifactEl: HTMLDivElement | null = $state(null);
	let canvasEl: HTMLCanvasElement | null = $state(null);

	const STAT_LABEL: Record<string,string> = {
		Health: 'HP',
		Stamina: 'STA',
		Oxygen: 'OXY',
		Food: 'FOOD',
		Weight: 'WGT',
		MeleeDamageMultiplier: 'MEL',
		SpeedMultiplier: 'SPD',
		TorpidityBase: 'TRP',
		Torpidity: 'TRP',
		CraftingSpeedMultiplier: 'CRA'
	};

	const CAT_CLASS: Record<string,string> = {
		combat: 'combat',
		flyer: 'flyer',
		utility: 'utility',
		water: 'water',
		boss: 'boss',
		mount: 'mount',
		resource: 'resource',
		transport: 'mount',
		harvesting: 'resource',
		aquatic: 'water',
		pet: 'pet',
		titan: 'titan',
		event: 'event'
	};
	const CAT_LABEL: Record<string,string> = {
		combat: 'COMBAT',
		flyer: 'FLYER',
		utility: 'UTILITY',
		water: 'WATER',
		boss: 'BOSS',
		mount: 'MOUNT',
		resource: 'RESOURCE',
		transport: 'MOUNT',
		harvesting: 'RESOURCE',
		aquatic: 'WATER',
		pet: 'PET',
		titan: 'TITAN',
		event: 'EVENT'
	};

	function dietShort(d: unknown): string {
		if (typeof d !== 'string') return '';
		const parenIdx = d.indexOf('(');
		return (parenIdx >= 0 ? d.slice(0, parenIdx) : d).trim().toUpperCase();
	}
	function nameLengthClass(n: string): '' | 'long' | 'xlong' {
		const len = n?.length ?? 0;
		if (len > 15) return 'xlong';
		if (len > 9)  return 'long';
		return '';
	}

	onMount(() => {
		const db = (window as unknown as { EXPANDED_SPECIES_DATABASE?: Record<string, SpeciesData> }).EXPANDED_SPECIES_DATABASE;
		species = db?.[name] ?? null;

		/* Hex grid background */
		const canvas = canvasEl;
		let rafId = 0;
		let resizeFn: (() => void) | null = null;
		if (canvas) {
			const ctx = canvas.getContext('2d');
			if (ctx) {
				const R = 32, W = R * Math.sqrt(3), H = R * 2;
				let phase = 0;
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
					rafId = requestAnimationFrame(draw);
				}
				resizeFn = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
				window.addEventListener('resize', resizeFn);
				resizeFn();
				draw();
			}
		}

		/* 3D parallax tilt on the artifact card */
		const card = artifactEl;
		let onMove: ((e: MouseEvent) => void) | null = null;
		let onLeave: (() => void) | null = null;
		let stage: HTMLElement | null = null;
		if (card) {
			stage = card.parentElement;
			onMove = (e: MouseEvent) => {
				const rect = card.getBoundingClientRect();
				const x = (e.clientX - rect.left) / rect.width;
				const y = (e.clientY - rect.top) / rect.height;
				const tiltY = (x - 0.5) * 14;
				const tiltX = (0.5 - y) * 10;
				card.style.setProperty('--tilt-x', tiltX + 'deg');
				card.style.setProperty('--tilt-y', tiltY + 'deg');
				card.style.setProperty('--mouse-x', (x * 100) + '%');
				card.style.setProperty('--mouse-y', (y * 100) + '%');
			};
			onLeave = () => {
				card.style.setProperty('--tilt-x', '0deg');
				card.style.setProperty('--tilt-y', '0deg');
				card.style.setProperty('--mouse-x', '50%');
				card.style.setProperty('--mouse-y', '50%');
			};
			if (stage) {
				stage.addEventListener('mousemove', onMove);
				stage.addEventListener('mouseleave', onLeave);
			}
		}

		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			if (resizeFn) window.removeEventListener('resize', resizeFn);
			if (stage && onMove) stage.removeEventListener('mousemove', onMove);
			if (stage && onLeave) stage.removeEventListener('mouseleave', onLeave);
		};
	});

	async function addToWishlist() {
		wlSaving = true;
		const res = await fetch('/api/wishlists', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ species: name })
		});
		if (res.ok || res.status === 409) wlAdded = true;
		wlSaving = false;
	}
</script>

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">

	<div class="page-title">{name || 'Specimen'}</div>
	<div class="page-sub"><span class="prefix">›</span>DEX · SPECIES PROFILE</div>

	{#if !species}
		<div style="color:#64748b;padding:40px 0;font-family:var(--tek-mono);letter-spacing:0.18em">LOADING…</div>
	{:else}
		{@const s = species}
		{@const cat = String(s.category ?? '')}
		{@const catClass = CAT_CLASS[cat] ?? 'combat'}
		{@const catLabel = CAT_LABEL[cat] ?? cat.toUpperCase()}
		{@const sizeClass = nameLengthClass(name)}
		{@const stats = (s.baseStats && typeof s.baseStats === 'object') ? Object.entries(s.baseStats as Record<string, number>) : []}
		{@const roles = Array.isArray(s.roles) ? (s.roles as unknown[]) : []}
		{@const maps = Array.isArray(s.spawnMaps) ? (s.spawnMaps as unknown[]) : []}

		<div class="split">

			<!-- HERO ARTIFACT -->
			<div>
				<div class="section-label"><span class="pip"></span>Dex · Species</div>

				<div class="artifact-stage">
					<div class="artifact {catClass}" bind:this={artifactEl}>
						<div class="artifact-shadow"></div>

						<div class="artifact-frame">
							<!-- Ghost background text -->
							<div class="artifact-ghost"><div class="artifact-ghost-text {sizeClass}">{name}</div></div>

							<!-- Scanner sweep -->
							<div class="scanner"></div>

							<!-- Corner brackets -->
							<div class="bracket tl"></div>
							<div class="bracket tr"></div>
							<div class="bracket bl"></div>
							<div class="bracket br"></div>

							<!-- Content -->
							<div class="artifact-content">

								<!-- TOP: tier -->
								<div class="artifact-top">
									<div class="tier-badge">
										<span class="glyph">⬢</span>{s.rarity ? String(s.rarity).toUpperCase() : 'SPECIES'}
									</div>
								</div>

								<!-- IDENTITY -->
								<div class="artifact-identity">
									<div class="identity-species {sizeClass}">{name}</div>
									{#if s.temperament}<div class="identity-nickname">"{String(s.temperament)}"</div>{/if}
									<div class="identity-meta">
										{#if s.diet}<span class="lvl">{dietShort(s.diet)}</span><span class="sep">·</span>{/if}
										<span class="cat">{catLabel}</span>
									</div>
								</div>

								<!-- STAT VALUES -->
								<div class="stat-values">
									<div class="stat-values-header">
										<span>Stat</span>
										<span class="col-right">Base</span>
										<span class="col-right">Mut</span>
									</div>
									{#each stats as [k, v]}
										<div class="stat-row">
											<span class="stat-row-label">{STAT_LABEL[k] ?? k.slice(0,4).toUpperCase()}</span>
											<span class="stat-row-base">{v}</span>
											<span class="stat-row-mut zero">·</span>
										</div>
									{/each}
								</div>

								<!-- MUTATIONS HERO → repurposed as size/sourcing -->
								<div class="artifact-mutations">
									<span class="mut-spark left"></span>
									<span class="mut-spark right"></span>
									<div class="mut-number">{s.sizeClass ? String(s.sizeClass) : '—'}</div>
									<div class="mut-label">Size Class</div>
								</div>

								<!-- FOOTER -->
								<div class="artifact-footer">
									<span>{s.habitat ? String(s.habitat).toUpperCase() : '—'}</span>
									<span class="footer-tribe">⌬ {catLabel}</span>
									<span>{s.source ? String(s.source).toUpperCase() : 'ARK'}</span>
								</div>

							</div>
						</div>
					</div>
				</div>

				<!-- Action buttons under hero -->
				<div class="dex-actions">
					<a href="/specimens/add?species={encodeURIComponent(name)}" class="dex-btn primary">+ Add to Vault</a>
					<button class="dex-btn ghost" onclick={addToWishlist} disabled={wlAdded || wlSaving}>
						{wlAdded ? '♥ On Wishlist' : (wlSaving ? 'Adding…' : '♡ Wishlist')}
					</button>
				</div>
			</div>

			<!-- COMPACT STACK -->
			<div>
				<div class="section-label"><span class="pip"></span>Profile · Details</div>

				<div class="compact-list">

					{#if s.diet}
						<div class="compact {catClass}">
							<span class="cmp-tier">Diet</span>
							<div class="cmp-identity">
								<div class="cmp-species">{String(s.diet)}</div>
								<div class="cmp-nick">Food preferences</div>
							</div>
						</div>
					{/if}

					{#if s.habitat}
						<div class="compact {catClass}">
							<span class="cmp-tier">Habitat</span>
							<div class="cmp-identity">
								<div class="cmp-species">{String(s.habitat)}</div>
								<div class="cmp-nick">Native biome</div>
							</div>
						</div>
					{/if}

					{#if s.tamingMethod}
						<div class="compact {catClass}">
							<span class="cmp-tier">Taming</span>
							<div class="cmp-identity">
								<div class="cmp-species">{String(s.tamingMethod)}</div>
								{#if s.preferredKibble}<div class="cmp-nick">Kibble · {String(s.preferredKibble)}</div>
								{:else if s.favoriteFood}<div class="cmp-nick">Fav · {String(s.favoriteFood)}</div>{/if}
							</div>
						</div>
					{/if}

					{#if s.saddle !== undefined}
						<div class="compact {catClass}">
							<span class="cmp-tier">Saddle</span>
							<div class="cmp-identity">
								<div class="cmp-species">{s.saddle ? 'Required' : 'None'}</div>
								<div class="cmp-nick">Rideable equipment</div>
							</div>
						</div>
					{/if}

					{#if roles.length}
						<div class="compact {catClass}">
							<span class="cmp-tier">Roles</span>
							<div class="cmp-identity">
								<div class="cmp-species">{roles.map((r) => String(r)).join(' · ')}</div>
								<div class="cmp-nick">{roles.length} {roles.length === 1 ? 'role' : 'roles'} assigned</div>
							</div>
						</div>
					{/if}

					{#if maps.length}
						<div class="compact {catClass}">
							<span class="cmp-tier">Maps</span>
							<div class="cmp-identity">
								<div class="cmp-species">{maps.map((m) => String(m)).join(' · ')}</div>
								<div class="cmp-nick">{maps.length} spawn {maps.length === 1 ? 'map' : 'maps'}</div>
							</div>
						</div>
					{/if}

					{#if s.dossierText}
						<div class="compact {catClass} dossier">
							<span class="cmp-tier">Dossier</span>
							<div class="cmp-identity wide">
								<div class="cmp-nick dossier-text">{String(s.dossierText)}</div>
							</div>
						</div>
					{/if}

				</div>
			</div>

		</div>
	{/if}

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
	--tek-pink:         #f472b6;
	--tek-text:         #e2e8f0;
	--tek-text-dim:     #64748b;
	--tek-text-faint:   #334155;
	--tek-font:         'Inter', system-ui, sans-serif;
	--tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
	--tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

:global(html), :global(body) {
	background: var(--tek-bg);
	color: var(--tek-text);
	font-family: var(--tek-font);
	min-height: 100vh;
	overflow-x: hidden;
	-webkit-font-smoothing: antialiased;
}
:global(body)::before {
	content: '';
	position: fixed;
	inset: 0;
	background-image:
		radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.10) 0%, transparent 50%),
		radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%),
		radial-gradient(ellipse 40% 35% at 50% 50%, rgba(239,68,68,0.04) 0%, transparent 60%);
	pointer-events: none;
	z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
	position: relative; z-index: 2;
	min-height: 100vh;
	padding: 90px 24px 90px;
	max-width: 1280px;
	margin: 0 auto;
}

.page-title {
	font-family: var(--tek-display);
	font-size: 1.4rem;
	font-weight: 900;
	letter-spacing: 0.18em;
	color: var(--tek-text);
	margin-bottom: 4px;
	text-transform: uppercase;
}
.page-sub {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	letter-spacing: 0.22em;
	color: var(--tek-text-dim);
	margin-bottom: 56px;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }

.section-label {
	display: flex; align-items: center; gap: 14px;
	margin: 0 0 24px;
	font-family: var(--tek-mono);
	font-size: 0.66rem; font-weight: 700;
	letter-spacing: 0.22em; text-transform: uppercase;
	color: var(--tek-text-faint);
}
.section-label::after {
	content: ''; flex: 1; height: 1px;
	background: linear-gradient(90deg, rgba(255,255,255,0.07), transparent);
}
.section-label .pip {
	width: 6px; height: 6px; border-radius: 50%;
	background: var(--tek-blue);
	box-shadow: 0 0 8px var(--tek-blue-glow);
}

.split {
	display: grid;
	grid-template-columns: 400px 1fr;
	gap: 64px;
	align-items: start;
}
@media (max-width: 980px) {
	.split { grid-template-columns: 1fr; gap: 48px; }
}

/* ═════════════════════════════════════════════════════════════════════════
   THE TEK ARTIFACT — Hero Specimen Card
   ═════════════════════════════════════════════════════════════════════════ */

.artifact-stage {
	perspective: 1400px;
	perspective-origin: 50% 50%;
	padding: 16px;
}

.artifact {
	--cat-rgb: 239,68,68;
	--tilt-x: 0deg;
	--tilt-y: 0deg;
	--mouse-x: 50%;
	--mouse-y: 50%;
	position: relative;
	width: 380px;
	height: 580px;
	cursor: pointer;
	transform-style: preserve-3d;
	transform: rotateX(var(--tilt-x)) rotateY(var(--tilt-y));
	transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	animation: artifact-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes artifact-in {
	from { opacity: 0; transform: translateY(20px) rotateX(8deg) scale(0.95); filter: blur(4px); }
	to   { opacity: 1; transform: none; filter: blur(0); }
}

.artifact-frame {
	position: absolute;
	inset: 0;
	background:
		radial-gradient(ellipse 100% 60% at 50% 0%, rgba(var(--cat-rgb), 0.10) 0%, transparent 65%),
		linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
	backdrop-filter: blur(18px);
	-webkit-backdrop-filter: blur(18px);
	clip-path: polygon(
		22px 0%, calc(100% - 22px) 0%, 100% 22px,
		100% calc(100% - 22px), calc(100% - 22px) 100%,
		22px 100%, 0% calc(100% - 22px), 0% 22px
	);
	overflow: hidden;
	transition: filter 0.3s ease;
}
.artifact-shadow {
	position: absolute;
	inset: -4px;
	filter:
		drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.45))
		drop-shadow(0 0 40px rgba(var(--cat-rgb), 0.18))
		drop-shadow(0 0 80px rgba(0, 180, 255, 0.08))
		drop-shadow(0 24px 64px rgba(0,0,0,0.70));
	transition: filter 0.3s ease;
	pointer-events: none;
}
.artifact:hover .artifact-shadow {
	filter:
		drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.85))
		drop-shadow(0 0 60px rgba(var(--cat-rgb), 0.32))
		drop-shadow(0 0 120px rgba(0, 180, 255, 0.18))
		drop-shadow(0 32px 80px rgba(0,0,0,0.85));
}

.artifact-frame::before {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,180,255,0.022) 3px, rgba(0,180,255,0.022) 4px),
		radial-gradient(circle 200px at var(--mouse-x) var(--mouse-y), rgba(var(--cat-rgb), 0.10) 0%, transparent 70%);
	pointer-events: none;
	z-index: 1;
}

.bracket {
	position: absolute;
	width: 22px; height: 22px;
	border: 1.5px solid rgb(var(--cat-rgb));
	filter: drop-shadow(0 0 4px rgba(var(--cat-rgb), 0.6));
	z-index: 5;
	pointer-events: none;
}
.bracket.tl { top: 8px;    left: 8px;    border-right: none; border-bottom: none; }
.bracket.tr { top: 8px;    right: 8px;   border-left: none;  border-bottom: none; }
.bracket.bl { bottom: 8px; left: 8px;    border-right: none; border-top: none; }
.bracket.br { bottom: 8px; right: 8px;   border-left: none;  border-top: none; }

.scanner {
	position: absolute;
	left: 0; right: 0;
	height: 80px;
	top: -80px;
	background: linear-gradient(180deg, transparent 0%, rgba(0,180,255,0.22) 50%, transparent 100%);
	pointer-events: none;
	z-index: 4;
	animation: scan-sweep 1.6s 0.6s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}
@keyframes scan-sweep {
	0%   { top: -80px; opacity: 0; }
	20%  { opacity: 1; }
	100% { top: 100%; opacity: 0; }
}

.artifact-ghost {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2;
	pointer-events: none;
	transform: translateZ(-20px);
}
.artifact-ghost-text {
	font-family: var(--tek-display);
	font-size: clamp(3.5rem, 18vw, 7.5rem);
	font-weight: 900;
	letter-spacing: 0.08em;
	color: rgba(255,255,255,0.025);
	-webkit-text-stroke: 1px rgba(255,255,255,0.045);
	line-height: 1;
	user-select: none;
	text-transform: uppercase;
	white-space: nowrap;
}
.artifact-ghost-text.long  { font-size: clamp(2.8rem, 13vw, 5rem); letter-spacing: 0.06em; }
.artifact-ghost-text.xlong { font-size: clamp(2rem,  9vw,  3.4rem); letter-spacing: 0.04em; }

.artifact-content {
	position: relative;
	z-index: 3;
	height: 100%;
	padding: 28px 24px 22px;
	display: flex;
	flex-direction: column;
	transform-style: preserve-3d;
}

.artifact-top {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	transform: translateZ(35px);
}
.tier-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: linear-gradient(135deg, rgba(0,180,255,0.18) 0%, rgba(139,92,246,0.22) 100%);
	border: 1px solid rgba(0,180,255,0.50);
	padding: 5px 12px;
	clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
	font-family: var(--tek-display);
	font-size: 0.7rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	color: #7dd3fc;
	text-shadow: 0 0 10px rgba(0,180,255,0.6);
	filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
	animation: tier-pulse 2.6s ease-in-out infinite;
}
@keyframes tier-pulse {
	0%, 100% { filter: drop-shadow(0 0 8px rgba(0,180,255,0.30)); }
	50%      { filter: drop-shadow(0 0 16px rgba(0,180,255,0.65)); }
}
.tier-badge .glyph {
	color: var(--tek-blue);
	filter: drop-shadow(0 0 4px var(--tek-blue-glow));
}

.artifact-identity {
	margin-top: 18px;
	text-align: center;
	transform: translateZ(45px);
}
.identity-species {
	font-family: var(--tek-display);
	font-size: clamp(1.5rem, 7vw, 2.6rem);
	font-weight: 900;
	letter-spacing: 0.06em;
	line-height: 1;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 60%, rgba(0,180,255,0.4) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 14px rgba(0,180,255,0.40));
	margin-bottom: 6px;
	text-transform: uppercase;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.identity-species.long  { font-size: clamp(1.2rem,  5.4vw, 2.05rem); letter-spacing: 0.04em; }
.identity-species.xlong { font-size: clamp(0.85rem, 3.8vw, 1.35rem); letter-spacing: 0.03em; }
.identity-nickname {
	font-family: var(--tek-mono);
	font-size: 0.82rem;
	color: var(--tek-text-dim);
	font-style: italic;
	letter-spacing: 0.02em;
	margin-bottom: 12px;
}
.identity-meta {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 14px;
	font-family: var(--tek-mono);
	font-size: 0.68rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
}
.identity-meta .gender {
	font-size: 1rem;
	line-height: 1;
}
.identity-meta .gender.female { color: var(--tek-pink); filter: drop-shadow(0 0 4px rgba(244,114,182,0.5)); }
.identity-meta .gender.male   { color: #60a5fa; filter: drop-shadow(0 0 4px rgba(96,165,250,0.5)); }
.identity-meta .lvl { color: var(--tek-text); font-weight: 700; }
.identity-meta .sep { color: var(--tek-text-faint); }
.identity-meta .cat {
	color: rgb(var(--cat-rgb));
	text-shadow: 0 0 8px rgba(var(--cat-rgb), 0.5);
	font-weight: 700;
}

.stat-values {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 14px 4px;
	transform: translateZ(50px);
	overflow: hidden;
}
.stat-values-header {
	display: grid;
	grid-template-columns: 60px 1fr 1fr;
	gap: 16px;
	padding-bottom: 7px;
	margin-bottom: 4px;
	border-bottom: 1px solid rgba(0,180,255,0.14);
	font-family: var(--tek-mono);
	font-size: 0.56rem;
	letter-spacing: 0.24em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	font-weight: 700;
}
.stat-values-header .col-right { text-align: right; color: var(--tek-blue); opacity: 0.65; }
.stat-row {
	display: grid;
	grid-template-columns: 60px 1fr 1fr;
	gap: 16px;
	padding: 5px 0;
	border-bottom: 1px solid rgba(255,255,255,0.03);
	align-items: baseline;
	transition: background 0.2s;
}
.stat-row:last-child { border-bottom: none; }
.stat-row:hover { background: rgba(0,180,255,0.04); }
.stat-row-label {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
}
.stat-row-base {
	font-family: var(--tek-mono);
	font-size: 0.98rem;
	font-weight: 600;
	color: var(--tek-text);
	text-align: right;
	letter-spacing: 0.02em;
}
.stat-row-mut {
	font-family: var(--tek-mono);
	font-size: 0.98rem;
	font-weight: 700;
	text-align: right;
	letter-spacing: 0.02em;
}
.stat-row-mut.has-mut {
	color: var(--tek-blue);
	text-shadow: 0 0 8px var(--tek-blue-glow);
}
.stat-row-mut.zero {
	color: var(--tek-text-faint);
	font-weight: 400;
}

.artifact-mutations {
	text-align: center;
	padding: 14px 0 10px;
	border-top: 1px solid rgba(255,255,255,0.06);
	border-bottom: 1px solid rgba(255,255,255,0.06);
	margin-bottom: 12px;
	transform: translateZ(50px);
	position: relative;
}
.mut-number {
	font-family: var(--tek-display);
	font-size: 1.6rem;
	font-weight: 900;
	line-height: 1;
	background: linear-gradient(135deg, #00d4ff 0%, #7dd3fc 30%, #c084fc 80%, #8b5cf6 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 14px rgba(0,180,255,0.40)) drop-shadow(0 0 28px rgba(139,92,246,0.20));
	letter-spacing: 0.04em;
	display: inline-block;
	text-transform: uppercase;
}
.mut-label {
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	letter-spacing: 0.30em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	margin-top: 4px;
}
.mut-spark {
	position: absolute;
	top: 50%;
	width: 26px;
	height: 1px;
	background: linear-gradient(90deg, transparent, var(--tek-blue), transparent);
	box-shadow: 0 0 4px var(--tek-blue-glow);
}
.mut-spark.left  { left: 26px;  transform: translateY(-50%); }
.mut-spark.right { right: 26px; transform: translateY(-50%); }

.artifact-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	letter-spacing: 0.14em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	transform: translateZ(35px);
	gap: 8px;
}
.artifact-footer span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 33%; }
.footer-tribe {
	color: rgb(var(--cat-rgb));
	opacity: 0.95;
	font-weight: 700;
}

/* ═════════════════════════════════════════════════════════════════════════
   COMPACT STACK (right side)
   ═════════════════════════════════════════════════════════════════════════ */
.compact-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}
.compact {
	--cat-rgb: 0,180,255;
	display: grid;
	grid-template-columns: auto 1fr auto auto;
	gap: 20px;
	align-items: center;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 14px 18px 14px 22px;
	position: relative;
	cursor: pointer;
	transition: transform 0.2s ease, background 0.2s ease;
	filter: drop-shadow(0 0 1px rgba(var(--cat-rgb), 0.30)) drop-shadow(0 8px 24px rgba(0,0,0,0.40));
}
.compact:hover {
	transform: translateX(4px);
	background: linear-gradient(160deg, rgba(14,22,52,0.96) 0%, rgba(6,12,28,1) 100%);
	filter: drop-shadow(0 0 2px rgba(var(--cat-rgb), 0.70)) drop-shadow(0 12px 32px rgba(0,0,0,0.55));
}
.compact::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: rgb(var(--cat-rgb));
	box-shadow: 0 0 8px rgba(var(--cat-rgb), 0.7);
}
.compact.combat   { --cat-rgb: 239,68,68;   }
.compact.flyer    { --cat-rgb: 6,182,212;   }
.compact.utility  { --cat-rgb: 34,197,94;   }
.compact.water    { --cat-rgb: 59,130,246;  }
.compact.boss     { --cat-rgb: 245,158,11;  }
.compact.mount    { --cat-rgb: 249,115,22;  }
.compact.resource { --cat-rgb: 167,139,250; }
.compact.pet      { --cat-rgb: 244,114,182; }
.compact.titan    { --cat-rgb: 168,85,247;  }
.compact.event    { --cat-rgb: 20,184,166;  }

/* Artifact card category colors */
.artifact.combat   { --cat-rgb: 239,68,68;   }
.artifact.flyer    { --cat-rgb: 6,182,212;   }
.artifact.utility  { --cat-rgb: 34,197,94;   }
.artifact.water    { --cat-rgb: 59,130,246;  }
.artifact.boss     { --cat-rgb: 245,158,11;  }
.artifact.mount    { --cat-rgb: 249,115,22;  }
.artifact.resource { --cat-rgb: 167,139,250; }
.artifact.pet      { --cat-rgb: 244,114,182; }
.artifact.titan    { --cat-rgb: 168,85,247;  }
.artifact.event    { --cat-rgb: 20,184,166;  }

.cmp-tier {
	font-family: var(--tek-mono);
	font-size: 0.55rem;
	font-weight: 700;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: rgb(var(--cat-rgb));
	background: rgba(var(--cat-rgb), 0.10);
	padding: 3px 7px;
	clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
	white-space: nowrap;
}

.cmp-identity { min-width: 0; }
.cmp-identity.wide { grid-column: 2 / -1; }
.cmp-species {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	color: var(--tek-text);
	line-height: 1.2;
	margin-bottom: 4px;
	text-transform: uppercase;
	overflow: hidden;
	text-overflow: ellipsis;
}
.cmp-nick {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	font-style: italic;
}
.compact.dossier { grid-template-columns: auto 1fr; align-items: start; cursor: default; }
.compact.dossier:hover { transform: none; }
.dossier-text {
	font-style: normal;
	line-height: 1.7;
	font-size: 0.78rem;
	color: #94a3b8;
	white-space: normal;
}

.cmp-stat {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	font-family: var(--tek-mono);
	line-height: 1.1;
}
.cmp-stat-val { font-size: 0.84rem; font-weight: 700; color: var(--tek-text); }
.cmp-stat-lbl {
	font-size: 0.54rem;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--tek-text-faint);
	margin-top: 3px;
}
.cmp-muts {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	font-family: var(--tek-display);
	line-height: 1.1;
}
.cmp-muts-val {
	font-size: 1.2rem;
	font-weight: 900;
	background: linear-gradient(135deg, #00d4ff, #c084fc);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 6px rgba(0,180,255,0.30));
}
.cmp-muts-lbl {
	font-size: 0.54rem;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--tek-text-faint);
	font-family: var(--tek-mono);
	margin-top: 2px;
}

/* Action buttons under hero */
.dex-actions {
	display: flex;
	gap: 10px;
	margin-top: 24px;
	padding: 0 16px;
}
.dex-btn {
	flex: 1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	font-family: var(--tek-mono);
	font-size: 0.7rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	padding: 11px 14px;
	clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
	cursor: pointer;
	text-decoration: none;
	border: none;
	transition: filter 0.2s ease, transform 0.2s ease;
}
.dex-btn.primary {
	background: linear-gradient(135deg, rgba(0,180,255,0.85) 0%, rgba(0,140,220,0.95) 100%);
	color: #050812;
	filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
}
.dex-btn.primary:hover { filter: drop-shadow(0 0 16px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.dex-btn.ghost {
	background: rgba(255,255,255,0.04);
	border: 1px solid rgba(0,180,255,0.30);
	color: var(--tek-text);
}
.dex-btn.ghost:hover:not(:disabled) { background: rgba(0,180,255,0.10); border-color: rgba(0,180,255,0.60); }
.dex-btn:disabled { opacity: 0.55; cursor: default; }

@media (max-width: 720px) {
	.compact { grid-template-columns: 44px auto 1fr auto; gap: 12px; padding: 12px 16px 12px 20px; }
}
@media (max-width: 500px) {
	.artifact { width: 100%; max-width: 360px; height: 560px; }
	.stage { padding: 80px 14px 80px; }
	.identity-species { font-size: 2.2rem; }
	.mut-number { font-size: 1.4rem; }
	.artifact-ghost-text { font-size: 6rem; }
}

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
	z-index: 5;
}
</style>
