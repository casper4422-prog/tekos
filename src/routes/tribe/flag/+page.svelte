<script lang="ts">
	import { Clipboard, ExternalLink, Wand2, Zap, ChevronRight } from 'lucide-svelte';

	// ── Archetypes ────────────────────────────────────────────────────────────
	const ARCHETYPES = [
		{
			id:'boss_slayers',    label:'Boss Slayers',
			desc:'We hunt the unkillable',
			emoji:'⚔️',
			creature:'Carcharodontosaurus', style:'battle-worn medieval', shape:'shield',
			mood:'fierce and battle-hardened', bg:'corrupted obelisk wasteland under a blood-red sky',
			element:'crossed trophy weapons and enemy skulls', col1:'#8b0000', col2:'#1c1c2e',
		},
		{
			id:'mutation_breeders', label:'Mutation Breeders',
			desc:'Science over brute force',
			emoji:'🧬',
			creature:'Deinonychus', style:'sci-fi holographic',shape:'circular seal',
			mood:'mysterious and calculating', bg:'Aberration bioluminescent cave with glowing Element veins',
			element:'DNA mutation helix and Element shards', col1:'#7c3aed', col2:'#064e3b',
		},
		{
			id:'pvp_raiders',     label:'PvP Raiders',
			desc:'We take what we want',
			emoji:'💀',
			creature:'Shadowmane', style:'dark gothic', shape:'torn flag',
			mood:'menacing and predatory', bg:'Extinction wasteland with corrupted purple sky',
			element:'ARK implant shattering and skull motifs', col1:'#1a0000', col2:'#4a0000',
		},
		{
			id:'wyvern_riders',   label:'Wyvern Riders',
			desc:'Lords of the sky',
			emoji:'🐉',
			creature:'Fire Wyvern', style:'heraldic fantasy', shape:'ornate crest',
			mood:'noble and proud', bg:'Scorched Earth fire storm with twin suns',
			element:'wings spread wide with flame motifs', col1:'#b45309', col2:'#292524',
		},
		{
			id:'alpha_hunters',   label:'Alpha Hunters',
			desc:'Only the apex survive',
			emoji:'🏆',
			creature:'Giganotosaurus', style:'mythological', shape:'shield',
			mood:'glorious and triumphant', bg:'The Island obelisk beam piercing storm clouds',
			element:'crown of tek metal and ARK engram glyphs', col1:'#d97706', col2:'#1e3a2f',
		},
		{
			id:'traders',         label:'Marketplace Guild',
			desc:'We deal, we profit',
			emoji:'⚖️',
			creature:'Rex', style:'painted banner art', shape:'banner',
			mood:'authoritative and trustworthy', bg:'The Island obelisk beam at sunset',
			element:'twin serpents coiled around trade scales', col1:'#1d4ed8', col2:'#854d0e',
		},
		{
			id:'aberrant_dwellers', label:'Aberrant Dwellers',
			desc:'We thrive in the dark',
			emoji:'🌌',
			creature:'Ravager', style:'neon cyberpunk', shape:'circular seal',
			mood:'cunning and shadowed', bg:'deep Aberration cave with bioluminescent fungi',
			element:'Element crystal formations and glowing tek circuits', col1:'#0e7490', col2:'#4c1d95',
		},
		{
			id:'genesis_crew',    label:'Genesis Survivors',
			desc:'Born of simulation',
			emoji:'🚀',
			creature:'Astrodelphis', style:'sci-fi holographic', shape:'square emblem',
			mood:'futuristic and elite', bg:'Genesis Ship interior with holographic displays',
			element:'TEK gears, HLN-A interface elements, and circuit patterns', col1:'#0284c7', col2:'#1e1b4b',
		},
		{
			id:'lost_colony',     label:'Lost Colony Vanguard',
			desc:'We carry the last light',
			emoji:'🏛️',
			creature:'Gigadesmodus', style:'painted banner art', shape:'banner',
			mood:'ancient and resolute', bg:'Lost Colony Red Palace ruins with crumbling stone',
			element:'ancient runic inscriptions and shattered obelisk fragments', col1:'#6b4226', col2:'#0f172a',
		},
	];

	// ── Creature list ─────────────────────────────────────────────────────────
	const CREATURE_GROUPS = [
		{ label:'ASA Apex', items:['Rex','Giganotosaurus','Carcharodontosaurus','Spinosaurus','Therizinosaurus','Megalodon','Mosasaurus'] },
		{ label:'Flyers',   items:['Fire Wyvern','Lightning Wyvern','Crystal Wyvern','Argentavis','Griffin','Quetzal','Pteranodon','Tropeognathus'] },
		{ label:'Hunters',  items:['Shadowmane','Carnotaurus','Allosaurus','Deinonychus','Thylacoleo','Managarmr','Snow Owl','Andrewsarchus'] },
		{ label:'Aquatic',  items:['Mosasaurus','Megalodon','Tusoteuthis','Liopleurodon','Basilosaurus'] },
		{ label:'Aberrant', items:['Basilisk','Ravager','Reaper King','Nameless','Karkinos','Bulbdog','Featherlight'] },
		{ label:'Genesis',  items:['Astrodelphis','Bloodstalker','Noglin','Ferox','Megachelon','Moeder (Boss)'] },
		{ label:'Exotic',   items:['Rock Drake','Desmodus','Fjordhawk','Amargasaurus','Shadowmane','Maewing'] },
	];

	// ── Styles with ASA-specific quality notes ────────────────────────────────
	const STYLES = [
		{ id:'heraldic',     label:'Heraldic Fantasy',    qual:'classic medieval RPG guild crest, detailed hand-painted illustration' },
		{ id:'battleborn',   label:'Battle-Worn',         qual:'aged war standard, scorched edges, battle damage, dark fantasy' },
		{ id:'scifi_holo',   label:'Sci-Fi Holographic',  qual:'holographic HUD display, glowing neon energy lines, cyberpunk tech aesthetic' },
		{ id:'mythological', label:'Mythological',        qual:'ancient mythology art, epic god-tier scale, divine energy' },
		{ id:'gothic',       label:'Dark Gothic',         qual:'dark gothic art, deep shadows, ominous atmosphere, horror-fantasy' },
		{ id:'banner_art',   label:'Painted Banner',      qual:'hand-painted game banner, bold colors, detailed illustration style' },
		{ id:'neon_cyber',   label:'Neon Cyberpunk',      qual:'neon-lit cyberpunk aesthetic, electric glow, futuristic hologram' },
		{ id:'tek_tier',     label:'TEK Tier',            qual:'ARK TEK technology aesthetic, metallic surfaces, blue energy circuits, UE5 rendered' },
		{ id:'primitive',    label:'Primitive Tribal',    qual:'raw primitive art, cave painting style, tribal markings, natural earth tones' },
	];

	// ── Shapes ────────────────────────────────────────────────────────────────
	const SHAPES = ['shield','ornate crest','banner','circular seal','torn battle flag','square emblem','diamond sigil','angular war crest'];

	// ── Moods ─────────────────────────────────────────────────────────────────
	const MOODS = ['fierce and battle-hardened','noble and proud','ancient and mysterious','menacing and predatory','glorious and triumphant','cunning and shadowed','resilient and unyielding','chaotic and savage'];

	// ── ARK-specific backgrounds ──────────────────────────────────────────────
	const BACKGROUNDS = [
		'The Island obelisk beam piercing storm clouds',
		'corrupted obelisk wasteland under a blood-red sky',
		'Aberration bioluminescent cave with glowing Element veins',
		'Extinction wasteland with corrupted purple sky',
		'Genesis Ship interior with holographic displays',
		'Scorched Earth fire storm with twin suns',
		'deep Aberration cave with glowing fungi',
		'Fjordur frozen realm with Norse ruins in the distance',
		'Lost Colony Red Palace ruins',
		'Astraeos Greek temple ruins on a clifftop',
		'deep ocean abyss with bioluminescent creatures',
		'TEK Cave metallic corridor with glowing circuits',
		'Island jungle canopy with dappled sunlight',
		'volcanic hellscape with rivers of lava',
		'starfield void of deep space',
		'Element-corrupted biome with purple crystal formations',
	];

	// ── ARK-specific decorative elements ─────────────────────────────────────
	const ELEMENTS = [
		'Element shard crystals and glowing tek circuits',
		'crossed trophy weapons and enemy skulls',
		'DNA mutation helix and Element veins',
		'wings spread wide with primal energy',
		'ARK tek implant hologram shards',
		'corrupted Element tendrils and runes',
		'obelisk energy beams and engram glyphs',
		'twin serpents coiled around ancient pillars',
		'crown of tek metal and ARK engram symbols',
		'supply drop beacon and tek gear motifs',
		'ancient ARK runic inscriptions',
		'breeding mutation helix and species silhouettes',
		'tribe totem and ancestral creature bones',
		'Aberration nameless creature shadows',
		'primal crystal formations and fungal growths',
		'Genesis HLN-A interface fragments',
	];

	// ── State ─────────────────────────────────────────────────────────────────
	let activeArchetype = $state('');
	let tribeText    = $state('');
	let creature     = $state('Rex');
	let styleId      = $state('heraldic');
	let shape        = $state('shield');
	let mood         = $state('fierce and battle-hardened');
	let bg           = $state(BACKGROUNDS[0]);
	let element      = $state(ELEMENTS[0]);
	let col1         = $state('#8b0000');
	let col2         = $state('#1c1c2e');
	let copied       = $state(false);

	function applyArchetype(a: typeof ARCHETYPES[0]) {
		activeArchetype = a.id;
		creature = a.creature;
		styleId  = STYLES.find(s => a.style.includes(s.label.toLowerCase()) || a.style === s.id)?.id ?? styleId;
		shape    = a.shape;
		mood     = a.mood;
		bg       = a.bg;
		element  = a.element;
		col1     = a.col1;
		col2     = a.col2;
	}

	function currentStyleQual() { return STYLES.find(s => s.id === styleId)?.qual ?? ''; }
	function currentStyleLabel() { return STYLES.find(s => s.id === styleId)?.label ?? styleId; }

	function buildPrompt(): string {
		const textPart = tribeText.trim()
			? `, with the tribe name "${tribeText.trim()}" rendered in bold stylized game lettering`
			: '';
		return [
			`ARK: Survival Ascended official tribe emblem —`,
			`a ${shape} flag design featuring a ${creature} as depicted in ARK: Survival Ascended's Unreal Engine 5 visuals,`,
			`${mood} energy and composition,`,
			`${col1} and ${col2} color scheme,`,
			`set against ${bg},`,
			`${currentStyleLabel()} art style (${currentStyleQual()}),`,
			`incorporating ${element} as decorative motifs${textPart}.`,
			`ARK Survival Ascended game concept art quality, cinematic lighting,`,
			`ultra-detailed game guild insignia, UE5 rendered, professional game logo style,`,
			`transparent background, no watermark, no text unless specified.`,
		].join(' ');
	}

	async function copyPrompt() {
		await navigator.clipboard.writeText(buildPrompt());
		copied = true;
		setTimeout(() => copied = false, 2400);
	}

	const GENERATORS = [
		{ name:'Bing Image Creator', url:'https://www.bing.com/images/create',    note:'Free · DALL-E 3 · Best quality · No account needed' },
		{ name:'Adobe Firefly',      url:'https://firefly.adobe.com',             note:'Free · 25 credits/month · Great for emblems' },
		{ name:'Leonardo.ai',        url:'https://app.leonardo.ai',               note:'Free · 150 tokens/day · Game art models available' },
		{ name:'Ideogram',           url:'https://ideogram.ai',                   note:'Free tier · Excellent text rendering on flags' },
		{ name:'NightCafe Studio',   url:'https://creator.nightcafe.studio',      note:'Free daily credits · Many art style models' },
	];
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Flag Workshop</h1>
			<div class="page-subtitle">ARK: Survival Ascended — AI prompt builder for tribe flags</div>
		</div>
		<a href="/tribe" class="btn btn-secondary btn-sm">← Tribe</a>
	</div>

	<!-- ── Step 1: Archetypes ──────────────────────────────────────────────── -->
	<div class="fw-section-title">Quick Start — Pick Your Tribe's Identity</div>
	<div class="fw-archetype-grid">
		{#each ARCHETYPES as a}
			<button class="fw-archetype" class:active={activeArchetype === a.id} onclick={() => applyArchetype(a)}>
				<div class="fw-arch-emoji">{a.emoji}</div>
				<div class="fw-arch-label">{a.label}</div>
				<div class="fw-arch-desc">{a.desc}</div>
				{#if activeArchetype === a.id}<div class="fw-arch-active-dot"></div>{/if}
			</button>
		{/each}
	</div>

	<!-- ── Main builder ────────────────────────────────────────────────────── -->
	<div class="fw-layout">
		<div class="fw-builder-col">

			<!-- Tribe identity -->
			<div class="fw-card">
				<div class="fw-card-title">🛡 Tribe Identity</div>
				<div class="fw-fields">
					<div class="plan-field">
						<label class="form-label">Tribe Name on Flag (optional)</label>
						<input class="form-control" bind:value={tribeText} placeholder="Leave blank for emblem only" />
					</div>
					<div class="fw-color-row">
						<div class="plan-field">
							<label class="form-label">Primary Color</label>
							<div class="fw-color-input-row">
								<input type="color" class="fw-color-swatch" bind:value={col1} />
								<input class="form-control" bind:value={col1} style="max-width:110px" />
							</div>
						</div>
						<div class="plan-field">
							<label class="form-label">Secondary Color</label>
							<div class="fw-color-input-row">
								<input type="color" class="fw-color-swatch" bind:value={col2} />
								<input class="form-control" bind:value={col2} style="max-width:110px" />
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Creature -->
			<div class="fw-card">
				<div class="fw-card-title">🦖 Central Symbol — ARK Creature</div>
				<div class="fw-creature-groups">
					{#each CREATURE_GROUPS as g}
						<div class="fw-group-label">{g.label}</div>
						<div class="fw-creature-chips">
							{#each g.items as c}
								<button class="fw-chip" class:active={creature === c} onclick={() => creature = c}>{c}</button>
							{/each}
						</div>
					{/each}
					<div class="fw-group-label">Custom</div>
					<input class="form-control" placeholder="Type any creature name..." bind:value={creature} style="margin-top:4px" />
				</div>
			</div>

			<!-- Visual style -->
			<div class="fw-card">
				<div class="fw-card-title">🎨 Visual Style</div>
				<div class="fw-style-grid">
					{#each STYLES as s}
						<button class="fw-style-btn" class:active={styleId === s.id} onclick={() => styleId = s.id}>
							<div class="fw-style-label">{s.label}</div>
						</button>
					{/each}
				</div>
				<div class="plan-field" style="margin-top:14px">
					<label class="form-label">Flag Shape</label>
					<select class="form-control" bind:value={shape}>
						{#each SHAPES as s}<option value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>{/each}
					</select>
				</div>
				<div class="plan-field" style="margin-top:10px">
					<label class="form-label">Mood / Energy</label>
					<select class="form-control" bind:value={mood}>
						{#each MOODS as m}<option value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>{/each}
					</select>
				</div>
			</div>

			<!-- ARK Setting -->
			<div class="fw-card">
				<div class="fw-card-title">🌍 ARK Setting</div>
				<div class="plan-field">
					<label class="form-label">Background — ARK Map / Biome</label>
					<select class="form-control" bind:value={bg}>
						{#each BACKGROUNDS as b}<option value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</option>{/each}
					</select>
				</div>
				<div class="plan-field" style="margin-top:10px">
					<label class="form-label">Decorative Element — ARK Themed</label>
					<select class="form-control" bind:value={element}>
						{#each ELEMENTS as e}<option value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- ── Right column ──────────────────────────────────────────────────── -->
		<div class="fw-right-col">

			<!-- Live prompt -->
			<div class="fw-prompt-card">
				<div class="fw-prompt-header">
					<div class="fw-card-title" style="margin-bottom:0">Generated Prompt</div>
					<div class="fw-prompt-tag">ARK: Survival Ascended</div>
				</div>
				<div class="fw-prompt-body">{buildPrompt()}</div>
				<button class="btn btn-primary fw-copy-btn" onclick={copyPrompt}>
					<Clipboard size={14} /> {copied ? '✓ Copied to clipboard!' : 'Copy Prompt'}
				</button>
				<div class="fw-prompt-hint">Paste this directly into any generator below. Regenerate if the result isn't perfect — it's free.</div>
			</div>

			<!-- Generators -->
			<div class="fw-card">
				<div class="fw-card-title">Free AI Generators</div>
				<div class="fw-gen-list">
					{#each GENERATORS as g}
						<a href={g.url} target="_blank" rel="noopener" class="cham-shell fw-gen-item" style="--cut:6px">
							<div class="fw-gen-inner">
								<div>
									<div class="fw-gen-name">{g.name}</div>
									<div class="fw-gen-note">{g.note}</div>
								</div>
								<ExternalLink size={12} style="color:#334155;flex-shrink:0" />
							</div>
						</a>
					{/each}
				</div>
			</div>

			<!-- Tips -->
			<div class="fw-card fw-tips-card">
				<div class="fw-card-title">Tips for Best ARK Flags</div>
				<ul class="fw-tips">
					<li><strong>Bing Image Creator</strong> gives the best results — DALL-E 3 understands ARK creatures</li>
					<li>Generate 3–4 times and pick the best — it's free</li>
					<li>Add <em>"no background"</em> or <em>"transparent background"</em> to layer over any color</li>
					<li>Leonardo.ai has game-art specific models — try "Signature" or "PhotoReal" mode</li>
					<li>If text looks garbled in the image, use Ideogram — best at rendering words</li>
					<li>Once happy with the image, upload it somewhere (Imgur, Discord) and paste the URL as your tribe's flag image</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
.fw-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#475569; margin-bottom:14px; }

/* Archetypes */
.fw-archetype-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; margin-bottom:28px; }
.fw-archetype {
	background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
	padding:14px 12px; cursor:pointer; font-family:inherit; text-align:center;
	display:flex; flex-direction:column; align-items:center; gap:5px;
	position:relative; transition:all .15s;
	clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
}
.fw-archetype:hover { background:rgba(255,255,255,0.07); border-color:rgba(0,180,255,0.2); }
.fw-archetype.active { background:rgba(0,180,255,0.08); border-color:rgba(0,180,255,0.4); }
.fw-arch-emoji { font-size:1.6rem; }
.fw-arch-label { font-size:0.8rem; font-weight:700; color:#f1f5f9; }
.fw-arch-desc  { font-size:0.68rem; color:#64748b; font-style:italic; }
.fw-arch-active-dot { position:absolute; top:6px; right:8px; width:7px; height:7px; border-radius:50%; background:#00b4ff; box-shadow:0 0 6px #00b4ff; }

/* Layout */
.fw-layout { display:grid; grid-template-columns:1fr 360px; gap:16px; align-items:start; }
@media (max-width:960px) { .fw-layout { grid-template-columns:1fr; } }
.fw-builder-col { display:flex; flex-direction:column; gap:12px; }
.fw-right-col   { display:flex; flex-direction:column; gap:12px; position:sticky; top:20px; }

/* Cards */
.fw-card { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:18px 20px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); }
.fw-card-title { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; margin-bottom:14px; }
.fw-fields { display:flex; flex-direction:column; gap:12px; }
.fw-color-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fw-color-input-row { display:flex; align-items:center; gap:8px; }
.fw-color-swatch { width:36px; height:34px; padding:2px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); cursor:pointer; border-radius:0; flex-shrink:0; }

/* Creature selector */
.fw-creature-groups { display:flex; flex-direction:column; gap:6px; }
.fw-group-label { font-size:0.6rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#334155; margin-top:8px; }
.fw-creature-chips { display:flex; flex-wrap:wrap; gap:4px; }
.fw-chip { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:#64748b; font-size:0.74rem; padding:3px 10px; cursor:pointer; font-family:inherit; transition:all .12s; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.fw-chip:hover { background:rgba(255,255,255,0.09); color:#94a3b8; }
.fw-chip.active { background:rgba(0,180,255,0.15); color:#7dd3fc; border-color:rgba(0,180,255,0.4); }

/* Style grid */
.fw-style-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; }
.fw-style-btn { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); padding:8px 6px; cursor:pointer; font-family:inherit; transition:all .12s; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); text-align:center; }
.fw-style-btn:hover { background:rgba(255,255,255,0.09); }
.fw-style-btn.active { background:rgba(139,92,246,0.15); border-color:rgba(139,92,246,0.4); }
.fw-style-label { font-size:0.72rem; font-weight:600; color:#94a3b8; }
.fw-style-btn.active .fw-style-label { color:#c084fc; }

/* Prompt card */
.fw-prompt-card { background:linear-gradient(160deg,rgba(0,30,60,0.97),rgba(0,10,30,1)); padding:18px 20px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); border-left:3px solid rgba(0,180,255,0.5); display:flex; flex-direction:column; gap:12px; }
.fw-prompt-header { display:flex; align-items:center; justify-content:space-between; }
.fw-prompt-tag { font-size:0.6rem; font-weight:800; letter-spacing:0.1em; background:rgba(0,180,255,0.12); color:#7dd3fc; border:1px solid rgba(0,180,255,0.3); padding:2px 8px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.fw-prompt-body { font-size:0.78rem; color:#94a3b8; line-height:1.75; font-style:italic; max-height:180px; overflow-y:auto; }
.fw-copy-btn { align-self:flex-start; display:flex; align-items:center; gap:6px; }
.fw-prompt-hint { font-size:0.68rem; color:#334155; line-height:1.5; }

/* Generators */
.fw-gen-list { display:flex; flex-direction:column; gap:5px; }
.fw-gen-item { display:block; text-decoration:none; color:inherit; }
.fw-gen-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; display:flex; align-items:center; justify-content:space-between; gap:10px; transition:background .15s; }
.fw-gen-item:hover .fw-gen-inner { background:rgba(14,26,54,0.98); }
.fw-gen-name { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.fw-gen-note { font-size:0.68rem; color:#64748b; margin-top:1px; }

/* Tips */
.fw-tips-card { background:linear-gradient(160deg,rgba(14,8,40,0.97),rgba(4,4,20,1)); }
.fw-tips { list-style:none; display:flex; flex-direction:column; gap:9px; }
.fw-tips li { font-size:0.76rem; color:#64748b; line-height:1.55; padding-left:14px; position:relative; }
.fw-tips li::before { content:'›'; position:absolute; left:0; color:#8b5cf6; font-weight:700; }
.fw-tips strong { color:#94a3b8; }
.fw-tips em { color:#7dd3fc; font-style:normal; }
</style>
