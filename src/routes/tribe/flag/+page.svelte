<script lang="ts">
	import { onMount } from 'svelte';

	type ArchKey = 'boss' | 'breeders' | 'raiders' | 'wyverns' | 'alpha' | 'traders' | 'aberrant' | 'genesis' | 'colony';

	type Archetype = {
		emoji: string;
		label: string;
		desc: string;
		c1: string;
		c2: string;
		creature: string;
		prompt: string;
	};

	const ARCHETYPES: Record<ArchKey, Archetype> = {
		boss: { emoji:'⚔️', label:'Boss Slayers', desc:'We hunt the unkillable', c1:'#8b0000', c2:'#1c1c2e', creature:'Carcharodontosaurus',
			prompt:'fierce battle-hardened tribe, corrupted obelisk wasteland under a blood-red sky, crossed trophy weapons and skull motifs, battle-worn medieval heraldic art' },
		breeders: { emoji:'🧬', label:'Mutation Breeders', desc:'Science over brute force', c1:'#7c3aed', c2:'#064e3b', creature:'Deinonychus',
			prompt:'mysterious and calculating energy, Aberration bioluminescent cave with glowing Element veins, DNA mutation helix and Element shard decorations, sci-fi holographic art style' },
		raiders: { emoji:'💀', label:'PvP Raiders', desc:'We take what we want', c1:'#450a0a', c2:'#0f0f0f', creature:'Shadowmane',
			prompt:'menacing and predatory energy, Extinction wasteland with corrupted purple sky, shattered ARK implants and skull motifs, dark gothic art style' },
		wyverns: { emoji:'🐉', label:'Wyvern Riders', desc:'Lords of the sky', c1:'#b45309', c2:'#1c0a00', creature:'Fire Wyvern',
			prompt:'noble and proud aerial tribe, Scorched Earth fire storm with twin suns, wings spread wide and flame motifs, heraldic fantasy art style' },
		alpha: { emoji:'🏆', label:'Alpha Hunters', desc:'Only the apex survive', c1:'#d97706', c2:'#1e3a2f', creature:'Giganotosaurus',
			prompt:'glorious and triumphant apex tribe, Island obelisk beam piercing storm clouds, crown of tek metal and ARK engram glyphs, mythological epic art style' },
		traders: { emoji:'⚖️', label:'Trading Guild', desc:'We deal, we profit', c1:'#1d4ed8', c2:'#854d0e', creature:'Rex',
			prompt:'authoritative and trustworthy, Island obelisk beam at golden sunset, twin serpents coiled around trade scales, painted banner art style' },
		aberrant: { emoji:'🌌', label:'Aberrant Dwellers', desc:'We thrive in the dark', c1:'#0e7490', c2:'#4c1d95', creature:'Ravager',
			prompt:'cunning and shadowed underground tribe, deep Aberration cave with bioluminescent fungi, glowing Element crystal formations and tek circuits, neon cyberpunk art style' },
		genesis: { emoji:'🚀', label:'Genesis Crew', desc:'Born of simulation', c1:'#0284c7', c2:'#1e1b4b', creature:'Astrodelphis',
			prompt:'futuristic and elite simulation survivors, Genesis Ship interior with holographic displays, HLN-A interface fragments and TEK gears, sci-fi holographic art style' },
		colony: { emoji:'🏛️', label:'Lost Colony', desc:'We carry the last light', c1:'#6b4226', c2:'#0f172a', creature:'Gigadesmodus',
			prompt:'ancient and resolute last survivors, Lost Colony Red Palace ruins with crumbling stone, ancient runic inscriptions and shattered obelisk fragments, painted banner art style' }
	};

	const ARCH_LIST: { key: ArchKey; emoji: string; label: string; desc: string; c1: string; c2: string; creatureFt: string }[] = [
		{ key:'boss',     emoji:'⚔️', label:'Boss Slayers',       desc:'We hunt the unkillable',  c1:'#8b0000', c2:'#1c1c2e', creatureFt:'Carcharodontosaurus' },
		{ key:'breeders', emoji:'🧬', label:'Mutation Breeders',  desc:'Science over brute force', c1:'#7c3aed', c2:'#064e3b', creatureFt:'Deinonychus' },
		{ key:'raiders',  emoji:'💀', label:'PvP Raiders',         desc:'We take what we want',    c1:'#450a0a', c2:'#0f0f0f', creatureFt:'Shadowmane' },
		{ key:'wyverns',  emoji:'🐉', label:'Wyvern Riders',       desc:'Lords of the sky',         c1:'#b45309', c2:'#1c0a00', creatureFt:'Fire Wyvern' },
		{ key:'alpha',    emoji:'🏆', label:'Alpha Hunters',       desc:'Only the apex survive',    c1:'#d97706', c2:'#1e3a2f', creatureFt:'Giganotosaurus' },
		{ key:'traders',  emoji:'⚖️', label:'Trading Guild',       desc:'We deal, we profit',      c1:'#1d4ed8', c2:'#854d0e', creatureFt:'Rex' },
		{ key:'aberrant', emoji:'🌌', label:'Aberrant Dwellers',   desc:'We thrive in the dark',   c1:'#0e7490', c2:'#4c1d95', creatureFt:'Ravager' },
		{ key:'genesis',  emoji:'🚀', label:'Genesis Crew',        desc:'Born of simulation',      c1:'#0284c7', c2:'#1e1b4b', creatureFt:'Astrodelphis' },
		{ key:'colony',   emoji:'🏛️', label:'Lost Colony',         desc:'We carry the last light', c1:'#6b4226', c2:'#0f172a', creatureFt:'Gigadesmodus' }
	];

	const CREATURES = ['Rex','Giganotosaurus','Carcharodontosaurus','Fire Wyvern','Crystal Wyvern','Shadowmane','Carnotaurus','Deinonychus','Thylacoleo','Managarmr','Snow Owl','Spino','Ravager','Rock Drake','Reaper King','Astrodelphis','Argentavis','Griffin','Basilisk','Andrewsarchus'];

	let archKey = $state<ArchKey>('boss');
	let creature = $state('Carcharodontosaurus');
	let useCustom = $state(false);
	let customCreature = $state('');
	let c1 = $state('#8b0000');
	let c2 = $state('#1c1c2e');
	let name = $state('Loaded Crysis');
	let copied = $state(false);

	let hexCanvas: HTMLCanvasElement | undefined = $state();

	function escapeHtml(s: string): string {
		return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c] as string));
	}

	function getHex(c: string): string {
		return c.toUpperCase().replace('#', '#');
	}

	function getCreatureName(): string {
		return useCustom && customCreature.trim() ? customCreature.trim() : creature;
	}

	const arch = $derived(ARCHETYPES[archKey]);
	const creatureName = $derived(getCreatureName());
	const hex1 = $derived(getHex(c1));
	const hex2 = $derived(getHex(c2));

	const flagNameText = $derived(name.trim() ? name : 'Unnamed Tribe');
	const flagNameEmpty = $derived(!name.trim());

	const promptHtml = $derived.by(() => {
		const a = ARCHETYPES[archKey];
		const cName = getCreatureName();
		const nameClause = name.trim() ? `, with tribe name <span class="hl-name">"${escapeHtml(name.trim())}"</span> in bold stylized lettering` : '';
		return `ARK: Survival Ascended official tribe emblem — a heraldic flag featuring a <span class="hl-creature">${escapeHtml(cName)}</span> as depicted in ARK Survival Ascended's Unreal Engine 5 visuals, <span class="hl-color">${getHex(c1)} and ${getHex(c2)}</span> color scheme, <span class="hl-tag">${a.prompt}</span>${nameClause}. Professional game concept art, cinematic lighting, ultra-detailed, transparent background, no watermark.`;
	});

	const promptTextPlain = $derived.by(() => {
		const a = ARCHETYPES[archKey];
		const cName = getCreatureName();
		const nameClause = name.trim() ? `, with tribe name "${name.trim()}" in bold stylized lettering` : '';
		return `ARK: Survival Ascended official tribe emblem — a heraldic flag featuring a ${cName} as depicted in ARK Survival Ascended's Unreal Engine 5 visuals, ${getHex(c1)} and ${getHex(c2)} color scheme, ${a.prompt}${nameClause}. Professional game concept art, cinematic lighting, ultra-detailed, transparent background, no watermark.`;
	});

	const promptLen = $derived(promptTextPlain.length);

	function selectArch(key: ArchKey) {
		archKey = key;
		const a = ARCHETYPES[key];
		c1 = a.c1;
		c2 = a.c2;
		creature = a.creature;
		if (useCustom) useCustom = false;
	}

	function toggleCustom() {
		useCustom = !useCustom;
	}

	async function doCopy() {
		try {
			await navigator.clipboard.writeText(promptTextPlain);
			copied = true;
			setTimeout(() => { copied = false; }, 2200);
		} catch (e) {
			// noop
		}
	}

	onMount(() => {
		if (!hexCanvas) return;
		const canvas = hexCanvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		let w = 0, h = 0;
		let hexes: { x: number; y: number; size: number }[] = [];
		let raf = 0;
		function resize() {
			w = canvas.width = window.innerWidth;
			h = canvas.height = window.innerHeight;
			hexes = [];
			const size = 36, hSpace = size * 1.5, vSpace = size * Math.sqrt(3);
			for (let y = -size; y < h + size; y += vSpace) {
				for (let x = -size; x < w + size; x += hSpace) {
					const offsetY = (Math.floor(x / hSpace) % 2) * vSpace / 2;
					hexes.push({ x, y: y + offsetY, size });
				}
			}
		}
		function draw() {
			if (!ctx) return;
			ctx.clearRect(0, 0, w, h);
			const t = Date.now() / 4000;
			hexes.forEach((hex, i) => {
				const phase = (Math.sin(t + i * 0.3) + 1) / 2;
				ctx.strokeStyle = `rgba(0,180,255,${0.03 + phase * 0.04})`;
				ctx.lineWidth = 1;
				ctx.beginPath();
				for (let a = 0; a < 6; a++) {
					const angle = (Math.PI / 3) * a;
					const px = hex.x + hex.size * Math.cos(angle);
					const py = hex.y + hex.size * Math.sin(angle);
					if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
				}
				ctx.closePath();
				ctx.stroke();
			});
			raf = requestAnimationFrame(draw);
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
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&family=Crimson+Pro:ital,wght@1,400&family=Cinzel:wght@500;700;900&display=swap" rel="stylesheet" />
	<title>⬡ TEKOS — Flag Workshop</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

	<!-- Header -->
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/dossier">DASHBOARD</a><span class="sep">/</span><a href="/tribe">TRIBE</a><span class="sep">/</span><span>FLAG WORKSHOP</span>
		</div>
		<h1 class="page-title">Flag Workshop</h1>
		<div class="page-sub">"Forge your tribe's sigil. The wild will know who you are by the colors you fly."</div>
	</div>

	<!-- Shell -->
	<div class="workshop-shell">

		<!-- ═══════════════ BUILDER COLUMN ═══════════════ -->
		<div class="builder-col">

			<!-- STEP 1 — IDENTITY -->
			<div class="step">
				<div class="step-head">
					<div class="step-num">1</div>
					<div class="step-title">Choose your tribe's identity</div>
					<div class="step-hint">9 archetypes</div>
				</div>

				<div class="archetype-grid" id="archGrid">
					{#each ARCH_LIST as a}
						<button
							class="archetype-card"
							class:selected={archKey === a.key}
							data-arch={a.key}
							style="--c1: {a.c1}; --c2: {a.c2};"
							onclick={() => selectArch(a.key)}
						>
							<div class="arch-emoji">{a.emoji}</div>
							<div class="arch-label">{a.label}</div>
							<div class="arch-desc">{a.desc}</div>
							<div class="arch-creature">FT: {a.creatureFt}</div>
							<div class="arch-swatches">
								<div class="arch-swatch" style="background:{a.c1};"></div>
								<div class="arch-swatch" style="background:{a.c2};"></div>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<!-- STEP 2 — CUSTOMIZE -->
			<div class="step">
				<div class="step-head">
					<div class="step-num">2</div>
					<div class="step-title">Customize</div>
					<div class="step-hint">Make it yours</div>
				</div>

				<div class="cust-grid">
					<div class="field">
						<div class="field-label">Tribe name</div>
						<input class="field-input" id="fTribeName" placeholder="e.g. Loaded Crysis" bind:value={name} />
					</div>
					<div class="field">
						<div class="field-label">Featured creature</div>
						<select class="field-select" id="fCreature" bind:value={creature}>
							{#each CREATURES as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
						<div class="creature-toggle-row">
							<div class="mini-toggle" class:on={useCustom} id="customToggle" onclick={toggleCustom} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCustom(); }}></div>
							<span>Use custom creature</span>
						</div>
						<input class="field-input custom-creature-input" class:visible={useCustom} id="fCustomCreature" placeholder="Type any creature name…" bind:value={customCreature} />
					</div>
				</div>

				<div class="cust-grid" style="margin-top: 14px;">
					<div class="field">
						<div class="field-label">Primary color</div>
						<div class="color-picker-row">
							<div class="color-swatch" style="background:{c1};">
								<input type="color" id="fColor1" bind:value={c1} />
							</div>
							<span class="color-hex" id="fColor1Hex">{hex1}</span>
							<span class="color-name">PRIMARY</span>
						</div>
					</div>
					<div class="field">
						<div class="field-label">Accent color</div>
						<div class="color-picker-row">
							<div class="color-swatch" style="background:{c2};">
								<input type="color" id="fColor2" bind:value={c2} />
							</div>
							<span class="color-hex" id="fColor2Hex">{hex2}</span>
							<span class="color-name">ACCENT</span>
						</div>
					</div>
				</div>
			</div>

			<!-- STEP 3 — PROMPT (incantation) -->
			<div class="step">
				<div class="step-head">
					<div class="step-num">3</div>
					<div class="step-title">Generated prompt</div>
					<div class="step-hint">Copy this into an AI image generator</div>
				</div>

				<div class="prompt-block">
					<div class="prompt-text" id="promptText">{@html promptHtml}</div>
					<div class="prompt-actions">
						<div class="prompt-meta">
							▸ <span class="ok">{arch.label}</span> archetype · <span id="promptLen">{promptLen}</span> chars · ready to copy
						</div>
						<button class="btn solid" class:copied id="copyBtn" onclick={doCopy}>
							<span id="copyText">{copied ? '✓ Copied!' : '📋 Copy Prompt'}</span>
						</button>
					</div>
				</div>
			</div>

			<!-- STEP 4 — GENERATORS -->
			<div class="step">
				<div class="step-head">
					<div class="step-num">4</div>
					<div class="step-title">Generate the image</div>
					<div class="step-hint">Open an AI service</div>
				</div>

				<div class="gen-grid">
					<a href="https://www.bing.com/images/create" target="_blank" rel="noopener" class="gen-card" style="--gen-c:#10b981; --gen-c2:#3b82f6;">
						<div class="badge-row">
							<div class="gen-logo">B</div>
							<span class="gen-arrow">↗</span>
						</div>
						<div class="gen-name">Bing Creator</div>
						<div class="gen-note">Free · DALL·E 3<br />Best quality</div>
					</a>
					<a href="https://firefly.adobe.com" target="_blank" rel="noopener" class="gen-card" style="--gen-c:#f59e0b; --gen-c2:#ef4444;">
						<div class="badge-row">
							<div class="gen-logo">A</div>
							<span class="gen-arrow">↗</span>
						</div>
						<div class="gen-name">Adobe Firefly</div>
						<div class="gen-note">Free · 25 credits/month</div>
					</a>
					<a href="https://app.leonardo.ai" target="_blank" rel="noopener" class="gen-card" style="--gen-c:#8b5cf6; --gen-c2:#ec4899;">
						<div class="badge-row">
							<div class="gen-logo">L</div>
							<span class="gen-arrow">↗</span>
						</div>
						<div class="gen-name">Leonardo</div>
						<div class="gen-note">Free · 150 tokens/day</div>
					</a>
					<a href="https://ideogram.ai" target="_blank" rel="noopener" class="gen-card" style="--gen-c:#00b4ff; --gen-c2:#8b5cf6;">
						<div class="badge-row">
							<div class="gen-logo">I</div>
							<span class="gen-arrow">↗</span>
						</div>
						<div class="gen-name">Ideogram</div>
						<div class="gen-note">Free · Great with text on flags</div>
					</a>
					<a href="https://creator.nightcafe.studio" target="_blank" rel="noopener" class="gen-card" style="--gen-c:#ec4899; --gen-c2:#f59e0b;">
						<div class="badge-row">
							<div class="gen-logo">N</div>
							<span class="gen-arrow">↗</span>
						</div>
						<div class="gen-name">NightCafe</div>
						<div class="gen-note">Free daily credits</div>
					</a>
				</div>
			</div>

			<!-- STEP 5 — UPLOAD -->
			<div class="step">
				<div class="step-head">
					<div class="step-num">5</div>
					<div class="step-title">Bring it home</div>
					<div class="step-hint">Upload your final flag</div>
				</div>

				<div class="upload-zone">
					<div class="upload-icon">⬡</div>
					<div class="upload-title">Drop your finished flag</div>
					<div class="upload-desc">
						Once your AI generator returns a flag you love, drop the image here. TekOS sets it as your tribe sigil — it then appears across all the surfaces below.
					</div>
					<button class="btn">CHOOSE IMAGE</button>

					<div class="usage-row">
						<div class="usage-chip"><span class="at">▸</span>Tribe page sigil</div>
						<div class="usage-chip"><span class="at">▸</span>Dossier banner accent</div>
						<div class="usage-chip"><span class="at">▸</span>Marketplace listings</div>
						<div class="usage-chip"><span class="at">▸</span>War Room header</div>
						<div class="usage-chip"><span class="at">▸</span>Tribe chat badge</div>
					</div>
				</div>
			</div>

		</div>

		<!-- ═══════════════ LIVE FLAG PREVIEW ═══════════════ -->
		<div class="preview-col">
			<div class="preview-header"><span class="live-pip"></span>Live Mock Preview</div>
			<div class="preview-shell">
				<div class="mock-label">
					⚐ STYLE PREVIEW
					<span class="small">final art generated by AI</span>
				</div>

				<div class="flag-stage">
					<svg class="flag-svg" viewBox="0 0 200 280" preserveAspectRatio="xMidYMid meet">
						<defs>
							<linearGradient id="flagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
								<stop offset="0%" stop-color={c1} id="flagStop1"/>
								<stop offset="50%" stop-color={c1} id="flagStop1b"/>
								<stop offset="50%" stop-color={c2} id="flagStop2a"/>
								<stop offset="100%" stop-color={c2} id="flagStop2"/>
							</linearGradient>
							<linearGradient id="flagGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
								<stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
								<stop offset="50%" stop-color="rgba(255,255,255,0)"/>
								<stop offset="100%" stop-color="rgba(0,0,0,0.4)"/>
							</linearGradient>
							<filter id="flagShadow">
								<feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.4"/>
							</filter>
						</defs>
						<!-- Shield shape: top straight, sides curve out then in to a bottom point -->
						<path id="flagShape"
							d="M 20 8
							   L 180 8
							   L 180 160
							   Q 180 220 100 268
							   Q 20 220 20 160
							   Z"
							fill="url(#flagGrad)"
							stroke="rgba(255,255,255,0.25)"
							stroke-width="2"
							filter="url(#flagShadow)"
						/>
						<!-- Overlay sheen -->
						<path d="M 20 8
								 L 180 8
								 L 180 160
								 Q 180 220 100 268
								 Q 20 220 20 160
								 Z"
							  fill="url(#flagGrad2)"/>
						<!-- Inner border decoration -->
						<path d="M 30 18
								 L 170 18
								 L 170 158
								 Q 170 210 100 252
								 Q 30 210 30 158
								 Z"
							  fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="2 4"/>
						<!-- Hex sigil ring around creature area -->
						<polygon points="100,60 138,82 138,128 100,150 62,128 62,82"
								 fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="1.5"/>
						<polygon points="100,68 132,86 132,124 100,142 68,124 68,86"
								 fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.10)" stroke-width="0.8"/>
						<!-- Name banner ribbon -->
						<path d="M 20 188 L 180 188 L 170 208 L 30 208 Z"
							  fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.20)" stroke-width="1"/>
					</svg>

					<div class="flag-creature" id="flagEmoji">{arch.emoji}</div>
					<div class="flag-name-banner">
						<div class="flag-name" class:empty={flagNameEmpty} id="flagName">{flagNameText}</div>
					</div>
				</div>

				<div class="palette-readout">
					<div class="palette-readout-label">Color Palette</div>
					<div class="palette-pair">
						<div class="palette-pip">
							<div class="dot" id="palDot1" style="background:{c1};"></div>
							<span class="hex" id="palHex1">{hex1}</span>
						</div>
						<div class="palette-pip">
							<div class="dot" id="palDot2" style="background:{c2};"></div>
							<span class="hex" id="palHex2">{hex2}</span>
						</div>
					</div>
				</div>

				<div class="preview-meta">
					<span class="tagline" id="metaTagline">"{arch.desc}"</span><br />
					<span id="metaCreature">Featuring · {creatureName}</span>
				</div>
			</div>
		</div>

	</div>

</div>

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
	--tek-serif:        'Crimson Pro', Georgia, serif;
	--tek-herald:       'Cinzel', 'Crimson Pro', Georgia, serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
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
		radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
	pointer-events: none;
	z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
	position: relative; z-index: 2;
	min-height: 100vh;
	padding: 60px 24px 80px;
	max-width: 1320px;
	margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header { margin-bottom: 28px; }
.breadcrumb {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	margin-bottom: 8px;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 6px; }
.page-title {
	font-family: var(--tek-display);
	font-size: clamp(1.8rem, 3.6vw, 2.5rem);
	font-weight: 900;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
	-webkit-background-clip: text; background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
}
.page-sub {
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 1.05rem;
	color: var(--tek-text-dim);
	margin-top: 8px;
}

/* ═════════════════════════════════════════════════════════════════════════
   LAYOUT — Two-column with sticky flag preview on right
   ═════════════════════════════════════════════════════════════════════════ */
.workshop-shell {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 380px;
	gap: 28px;
	align-items: start;
}
@media (max-width: 1040px) {
	.workshop-shell { grid-template-columns: 1fr; }
}

.builder-col { min-width: 0; }

/* Step section */
.step {
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
	border: 1px solid rgba(0,180,255,0.18);
	clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
	padding: 22px 26px 24px;
	margin-bottom: 16px;
	position: relative;
	backdrop-filter: blur(8px);
}
.step::before {
	content: '';
	position: absolute;
	left: 0; top: 14px; bottom: 0;
	width: 2px;
	background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
	box-shadow: 0 0 8px var(--tek-blue-glow);
}
.step-head {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
	padding-bottom: 12px;
	border-bottom: 1px solid rgba(0,180,255,0.10);
}
.step-num {
	width: 30px; height: 30px;
	flex-shrink: 0;
	background: rgba(0,180,255,0.10);
	border: 1px solid var(--tek-blue);
	clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	display: flex; align-items: center; justify-content: center;
	color: var(--tek-blue);
	font-family: var(--tek-display);
	font-size: 0.84rem;
	font-weight: 800;
	text-shadow: 0 0 6px var(--tek-blue-glow);
}
.step-title {
	font-family: var(--tek-display);
	font-size: 0.96rem;
	font-weight: 700;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--tek-text);
}
.step-hint {
	flex: 1;
	font-family: var(--tek-mono);
	font-size: 0.7rem;
	letter-spacing: 0.10em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	text-align: right;
}

/* ═════════════════════════════════════════════════════════════════════════
   STEP 1 — Archetype grid (3x3)
   ═════════════════════════════════════════════════════════════════════════ */
.archetype-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 10px;
}
@media (max-width: 700px) {
	.archetype-grid { grid-template-columns: repeat(2, 1fr); }
}
.archetype-card {
	position: relative;
	background: linear-gradient(135deg, var(--c1, #1c1c2e) 0%, var(--c2, #050812) 100%);
	border: 1px solid rgba(255,255,255,0.08);
	clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
	padding: 14px 14px 12px;
	cursor: pointer;
	transition: all 0.2s;
	overflow: hidden;
	text-align: left;
	color: var(--tek-text);
}
.archetype-card::before {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		repeating-linear-gradient(60deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 16px),
		repeating-linear-gradient(-60deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 16px);
	pointer-events: none;
	opacity: 0.5;
}
.archetype-card:hover {
	transform: translateY(-2px);
	border-color: rgba(255,255,255,0.18);
	box-shadow: 0 6px 20px rgba(0,0,0,0.4);
}
.archetype-card.selected {
	border-color: var(--tek-blue);
	box-shadow: 0 0 0 1px var(--tek-blue), 0 0 18px rgba(0,180,255,0.40);
}
.archetype-card.selected::after {
	content: 'ACTIVE';
	position: absolute;
	top: 8px; right: 8px;
	background: rgba(0,180,255,0.20);
	border: 1px solid var(--tek-blue);
	color: var(--tek-blue);
	font-family: var(--tek-mono);
	font-size: 0.58rem;
	letter-spacing: 0.16em;
	padding: 2px 6px;
	text-shadow: 0 0 5px var(--tek-blue-glow);
}
.arch-emoji {
	font-size: 1.6rem;
	margin-bottom: 8px;
	filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
}
.arch-label {
	font-family: var(--tek-display);
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	margin-bottom: 4px;
	text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.arch-desc {
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 0.78rem;
	color: rgba(255,255,255,0.75);
	line-height: 1.3;
	margin-bottom: 10px;
}
.arch-creature {
	font-family: var(--tek-mono);
	font-size: 0.62rem;
	letter-spacing: 0.12em;
	color: rgba(255,255,255,0.55);
	text-transform: uppercase;
	margin-bottom: 8px;
}
.arch-swatches {
	display: flex;
	gap: 4px;
}
.arch-swatch {
	width: 16px; height: 16px;
	border-radius: 2px;
	border: 1px solid rgba(255,255,255,0.25);
}

/* ═════════════════════════════════════════════════════════════════════════
   STEP 2 — Customize (name, creature, colors)
   ═════════════════════════════════════════════════════════════════════════ */
.cust-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 14px;
}
@media (max-width: 600px) {
	.cust-grid { grid-template-columns: 1fr; }
}
.field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}
.field-label {
	font-family: var(--tek-mono);
	font-size: 0.62rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
}
.field-input,
.field-select {
	background: rgba(5,8,18,0.65);
	border: 1px solid rgba(100,116,139,0.25);
	color: var(--tek-text);
	font-family: var(--tek-mono);
	font-size: 0.86rem;
	padding: 10px 14px;
	clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
	width: 100%;
	transition: all 0.15s;
}
.field-input::placeholder { color: var(--tek-text-faint); }
.field-input:focus,
.field-select:focus {
	outline: none;
	border-color: var(--tek-blue);
	box-shadow: 0 0 0 1px var(--tek-blue);
}
.field-select {
	appearance: none;
	-webkit-appearance: none;
	background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
	background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
	background-size: 5px 5px;
	background-repeat: no-repeat;
	padding-right: 32px;
}

/* Color picker row */
.color-picker-row {
	display: flex;
	align-items: center;
	gap: 10px;
	background: rgba(5,8,18,0.65);
	border: 1px solid rgba(100,116,139,0.25);
	padding: 6px 12px 6px 6px;
	clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.color-swatch {
	width: 36px; height: 32px;
	border: 1px solid rgba(255,255,255,0.20);
	cursor: pointer;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	flex-shrink: 0;
	position: relative;
	overflow: hidden;
}
.color-swatch input[type="color"] {
	position: absolute;
	inset: -4px;
	width: calc(100% + 8px);
	height: calc(100% + 8px);
	border: none;
	cursor: pointer;
	opacity: 0;
}
.color-hex {
	font-family: var(--tek-mono);
	font-size: 0.82rem;
	color: var(--tek-text);
	letter-spacing: 0.08em;
	flex: 1;
	text-transform: uppercase;
}
.color-name {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	letter-spacing: 0.10em;
	text-transform: uppercase;
}

/* Custom creature toggle row */
.creature-toggle-row {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 10px;
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	color: var(--tek-text-dim);
	letter-spacing: 0.10em;
	text-transform: uppercase;
}
.mini-toggle {
	position: relative;
	width: 32px; height: 18px;
	background: rgba(15,23,42,0.9);
	border: 1px solid rgba(100,116,139,0.30);
	border-radius: 9px;
	cursor: pointer;
	transition: all 0.2s;
	flex-shrink: 0;
}
.mini-toggle::after {
	content: '';
	position: absolute;
	top: 1px; left: 1px;
	width: 14px; height: 14px;
	background: var(--tek-text-dim);
	border-radius: 50%;
	transition: all 0.2s;
}
.mini-toggle.on { background: rgba(0,180,255,0.20); border-color: var(--tek-blue); }
.mini-toggle.on::after {
	transform: translateX(14px);
	background: var(--tek-blue);
}
.custom-creature-input {
	display: none;
	margin-top: 8px;
}
.custom-creature-input.visible { display: block; }

/* ═════════════════════════════════════════════════════════════════════════
   STEP 3 — Generated prompt (the incantation)
   ═════════════════════════════════════════════════════════════════════════ */
.prompt-block {
	position: relative;
	background:
		radial-gradient(ellipse 60% 100% at 50% 50%, rgba(139,92,246,0.10) 0%, transparent 70%),
		linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
	border: 1px solid rgba(139,92,246,0.30);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 18px 22px;
	margin-bottom: 12px;
	overflow: hidden;
}
.prompt-block::before {
	content: '';
	position: absolute;
	inset: 0;
	background:
		repeating-linear-gradient(60deg, rgba(139,92,246,0.04) 0 1px, transparent 1px 24px),
		repeating-linear-gradient(-60deg, rgba(139,92,246,0.04) 0 1px, transparent 1px 24px);
	pointer-events: none;
	opacity: 0.5;
}
.prompt-text {
	position: relative;
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 1rem;
	line-height: 1.6;
	color: var(--tek-text);
	z-index: 1;
}
.prompt-text :global(.hl-creature)   { color: var(--tek-blue); font-style: normal; font-weight: 600; }
.prompt-text :global(.hl-color)      { color: var(--tek-purple); font-style: normal; font-weight: 600; }
.prompt-text :global(.hl-name)       { color: var(--tek-amber); font-style: normal; font-weight: 600; }
.prompt-text :global(.hl-tag)        { color: var(--tek-green); font-style: normal; font-weight: 600; }

.prompt-actions {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 14px;
	padding-top: 12px;
	border-top: 1px solid rgba(139,92,246,0.20);
	position: relative;
	z-index: 1;
}
.prompt-meta {
	flex: 1;
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.12em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
}
.prompt-meta .ok { color: var(--tek-green); }

/* ═════════════════════════════════════════════════════════════════════════
   STEP 4 — Generator launcher cards
   ═════════════════════════════════════════════════════════════════════════ */
.gen-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
	gap: 10px;
}
.gen-card {
	background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
	border: 1px solid rgba(100,116,139,0.20);
	clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
	padding: 12px 14px;
	cursor: pointer;
	transition: all 0.2s;
	text-decoration: none;
	color: inherit;
	display: block;
}
.gen-card:hover {
	transform: translateY(-2px);
	border-color: var(--tek-blue-border);
	box-shadow: 0 4px 12px rgba(0,180,255,0.15);
}
.gen-card .badge-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 6px;
}
.gen-logo {
	width: 28px; height: 28px;
	background: linear-gradient(135deg, var(--gen-c, var(--tek-blue)), var(--gen-c2, var(--tek-purple)));
	color: #050812;
	border-radius: 4px;
	display: flex; align-items: center; justify-content: center;
	font-family: var(--tek-display);
	font-size: 0.86rem;
	font-weight: 900;
}
.gen-arrow {
	color: var(--tek-text-faint);
	font-size: 0.86rem;
	transition: all 0.15s;
}
.gen-card:hover .gen-arrow {
	color: var(--tek-blue);
	transform: translate(2px, -2px);
}
.gen-name {
	font-family: var(--tek-display);
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.06em;
	color: var(--tek-text);
	text-transform: uppercase;
	margin-bottom: 3px;
}
.gen-note {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	line-height: 1.4;
}

/* ═════════════════════════════════════════════════════════════════════════
   STEP 5 — Upload / Gallery (post-MVP)
   ═════════════════════════════════════════════════════════════════════════ */
.upload-zone {
	background: linear-gradient(160deg, rgba(10,18,44,0.5) 0%, rgba(4,8,20,0.88) 100%);
	border: 2px dashed rgba(0,180,255,0.30);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 26px 24px;
	text-align: center;
	cursor: pointer;
	transition: all 0.2s;
}
.upload-zone:hover {
	border-color: var(--tek-blue);
	background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
}
.upload-icon {
	width: 44px; height: 44px;
	margin: 0 auto 12px;
	border: 2px solid var(--tek-blue-border);
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	color: var(--tek-blue);
	font-size: 1.4rem;
}
.upload-title {
	font-family: var(--tek-display);
	font-size: 0.92rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	color: var(--tek-text);
	text-transform: uppercase;
	margin-bottom: 6px;
}
.upload-desc {
	font-family: var(--tek-mono);
	font-size: 0.74rem;
	color: var(--tek-text-dim);
	line-height: 1.5;
	max-width: 480px;
	margin: 0 auto 14px;
}
.usage-row {
	margin-top: 18px;
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	justify-content: center;
}
.usage-chip {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.14em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	padding: 4px 10px;
	background: rgba(0,180,255,0.05);
	border: 1px solid rgba(0,180,255,0.20);
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.usage-chip .at {
	color: var(--tek-blue);
	margin-right: 4px;
}

/* ═════════════════════════════════════════════════════════════════════════
   BUTTONS
   ═════════════════════════════════════════════════════════════════════════ */
.btn {
	background: rgba(0,180,255,0.08);
	border: 1px solid var(--tek-blue-border);
	color: var(--tek-blue);
	font-family: var(--tek-mono);
	font-size: 0.74rem;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	padding: 9px 16px;
	cursor: pointer;
	clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
	transition: all 0.15s;
	display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover {
	background: rgba(0,180,255,0.18);
	box-shadow: 0 0 12px rgba(0,180,255,0.30);
}
.btn.solid {
	background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
	color: #050812;
	border: none;
	font-weight: 700;
	padding: 10px 20px;
}
.btn.solid:hover {
	box-shadow: 0 0 16px rgba(0,180,255,0.45);
}
.btn.copied {
	background: rgba(16,185,129,0.15);
	border-color: var(--tek-green);
	color: var(--tek-green);
}

/* ═════════════════════════════════════════════════════════════════════════
   LIVE FLAG PREVIEW (sticky right column)
   ═════════════════════════════════════════════════════════════════════════ */
.preview-col {
	position: sticky;
	top: 24px;
}
.preview-header {
	font-family: var(--tek-mono);
	font-size: 0.62rem;
	letter-spacing: 0.20em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	margin-bottom: 8px;
	padding-left: 4px;
	display: flex; align-items: center; gap: 6px;
}
.preview-header .live-pip {
	display: inline-block;
	width: 6px; height: 6px;
	border-radius: 50%;
	background: var(--tek-green);
	box-shadow: 0 0 5px rgba(16,185,129,0.6);
	animation: livePulse 1.6s ease-in-out infinite;
}
@keyframes livePulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.4; }
}

.preview-shell {
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.99) 100%);
	border: 1px solid var(--tek-blue-border);
	clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
	padding: 18px 16px 14px;
	overflow: hidden;
	backdrop-filter: blur(8px);
	box-shadow: 0 0 32px rgba(0,180,255,0.10);
}
.preview-shell::before {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		repeating-linear-gradient(60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px),
		repeating-linear-gradient(-60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px);
	pointer-events: none;
	opacity: 0.6;
}
.preview-shell > * { position: relative; z-index: 1; }

.mock-label {
	font-family: var(--tek-mono);
	font-size: 0.58rem;
	letter-spacing: 0.20em;
	color: var(--tek-amber);
	text-transform: uppercase;
	text-align: center;
	margin-bottom: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid rgba(245,158,11,0.20);
}
.mock-label .small { color: var(--tek-text-faint); font-size: 0.54rem; display: block; margin-top: 3px; letter-spacing: 0.14em; }

/* Heraldic shield SVG container */
.flag-stage {
	position: relative;
	width: 100%;
	aspect-ratio: 3 / 4;
	margin: 0 auto;
	display: flex;
	align-items: center;
	justify-content: center;
}
.flag-svg {
	width: 100%; height: 100%;
	filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6));
}
.flag-creature {
	position: absolute;
	top: 38%; left: 50%;
	transform: translate(-50%, -50%);
	font-size: 4.5rem;
	filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8));
	pointer-events: none;
}
.flag-name-banner {
	position: absolute;
	top: 68%; left: 50%;
	transform: translate(-50%, 0);
	width: 80%;
	text-align: center;
	pointer-events: none;
}
.flag-name {
	font-family: var(--tek-herald);
	font-size: 1.1rem;
	font-weight: 900;
	letter-spacing: 0.10em;
	color: #ffffff;
	text-transform: uppercase;
	text-shadow: 0 2px 6px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6);
	word-break: break-word;
	line-height: 1.1;
}
.flag-name.empty {
	color: rgba(255,255,255,0.35);
	font-style: italic;
	font-family: var(--tek-serif);
}

/* Preview palette readout */
.palette-readout {
	margin-top: 14px;
	padding-top: 12px;
	border-top: 1px solid rgba(0,180,255,0.10);
}
.palette-readout-label {
	font-family: var(--tek-mono);
	font-size: 0.58rem;
	letter-spacing: 0.20em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	margin-bottom: 8px;
}
.palette-pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}
.palette-pip {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: rgba(5,8,18,0.5);
	border: 1px solid rgba(100,116,139,0.15);
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
	font-family: var(--tek-mono);
	font-size: 0.7rem;
}
.palette-pip .dot {
	width: 14px; height: 14px;
	border: 1px solid rgba(255,255,255,0.2);
	border-radius: 2px;
	flex-shrink: 0;
}
.palette-pip .hex {
	color: var(--tek-text);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.preview-meta {
	margin-top: 12px;
	text-align: center;
	font-family: var(--tek-serif);
	font-style: italic;
	color: var(--tek-text-dim);
	font-size: 0.82rem;
	line-height: 1.4;
	padding: 0 6px;
}
.preview-meta .tagline {
	color: var(--tek-text);
}
</style>
