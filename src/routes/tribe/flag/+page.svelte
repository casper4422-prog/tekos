<script lang="ts">
	import { Clipboard, ExternalLink } from 'lucide-svelte';

	const ARCHETYPES = [
		{ id:'boss',     emoji:'⚔️', label:'Boss Slayers',       desc:'We hunt the unkillable',
		  col1:'#8b0000', col2:'#1c1c2e', creature:'Carcharodontosaurus',
		  prompt:'fierce battle-hardened tribe, corrupted obelisk wasteland under a blood-red sky, crossed trophy weapons and skull motifs, battle-worn medieval heraldic art' },
		{ id:'breeders', emoji:'🧬', label:'Mutation Breeders',   desc:'Science over brute force',
		  col1:'#7c3aed', col2:'#064e3b', creature:'Deinonychus',
		  prompt:'mysterious and calculating energy, Aberration bioluminescent cave with glowing Element veins, DNA mutation helix and Element shard decorations, sci-fi holographic art style' },
		{ id:'raiders',  emoji:'💀', label:'PvP Raiders',         desc:'We take what we want',
		  col1:'#450a0a', col2:'#0f0f0f', creature:'Shadowmane',
		  prompt:'menacing and predatory energy, Extinction wasteland with corrupted purple sky, shattered ARK implants and skull motifs, dark gothic art style' },
		{ id:'wyverns',  emoji:'🐉', label:'Wyvern Riders',       desc:'Lords of the sky',
		  col1:'#b45309', col2:'#1c0a00', creature:'Fire Wyvern',
		  prompt:'noble and proud aerial tribe, Scorched Earth fire storm with twin suns, wings spread wide and flame motifs, heraldic fantasy art style' },
		{ id:'alpha',    emoji:'🏆', label:'Alpha Hunters',       desc:'Only the apex survive',
		  col1:'#d97706', col2:'#1e3a2f', creature:'Giganotosaurus',
		  prompt:'glorious and triumphant apex tribe, Island obelisk beam piercing storm clouds, crown of tek metal and ARK engram glyphs, mythological epic art style' },
		{ id:'traders',  emoji:'⚖️', label:'Trading Guild',       desc:'We deal, we profit',
		  col1:'#1d4ed8', col2:'#854d0e', creature:'Rex',
		  prompt:'authoritative and trustworthy, Island obelisk beam at golden sunset, twin serpents coiled around trade scales, painted banner art style' },
		{ id:'aberrant', emoji:'🌌', label:'Aberrant Dwellers',   desc:'We thrive in the dark',
		  col1:'#0e7490', col2:'#4c1d95', creature:'Ravager',
		  prompt:'cunning and shadowed underground tribe, deep Aberration cave with bioluminescent fungi, glowing Element crystal formations and tek circuits, neon cyberpunk art style' },
		{ id:'genesis',  emoji:'🚀', label:'Genesis Crew',        desc:'Born of simulation',
		  col1:'#0284c7', col2:'#1e1b4b', creature:'Astrodelphis',
		  prompt:'futuristic and elite simulation survivors, Genesis Ship interior with holographic displays, HLN-A interface fragments and TEK gears, sci-fi holographic art style' },
		{ id:'colony',   emoji:'🏛️', label:'Lost Colony',         desc:'We carry the last light',
		  col1:'#6b4226', col2:'#0f172a', creature:'Gigadesmodus',
		  prompt:'ancient and resolute last survivors, Lost Colony Red Palace ruins with crumbling stone, ancient runic inscriptions and shattered obelisk fragments, painted banner art style' },
	];

	const CREATURES = ['Rex','Giganotosaurus','Carcharodontosaurus','Fire Wyvern','Crystal Wyvern','Shadowmane','Carnotaurus','Deinonychus','Thylacoleo','Managarmr','Snow Owl','Spino','Ravager','Rock Drake','Reaper King','Astrodelphis','Argentavis','Griffin','Basilisk','Andrewsarchus'];

	let picked    = $state<typeof ARCHETYPES[0] | null>(null);
	let creature  = $state('Rex');
	let col1      = $state('#8b0000');
	let col2      = $state('#1c1c2e');
	let tribeName = $state('');
	let copied    = $state(false);
	let customCreature = $state(false);
	let customCreatureText = $state('');

	function pick(a: typeof ARCHETYPES[0]) {
		picked   = a;
		creature = a.creature;
		col1     = a.col1;
		col2     = a.col2;
		customCreature = false;
	}

	function getCreature() { return customCreature ? customCreatureText || creature : creature; }

	function buildPrompt(): string {
		if (!picked) return 'Pick a tribe identity above to generate your prompt.';
		const nameClause = tribeName.trim() ? `, with tribe name "${tribeName.trim()}" in bold stylized lettering` : '';
		return `ARK: Survival Ascended official tribe emblem — a heraldic flag featuring a ${getCreature()} as depicted in ARK Survival Ascended's Unreal Engine 5 visuals, ${col1} and ${col2} color scheme, ${picked.prompt}${nameClause}. Professional game concept art, cinematic lighting, ultra-detailed, transparent background, no watermark.`;
	}

	async function copy() {
		if (!picked) return;
		await navigator.clipboard.writeText(buildPrompt());
		copied = true;
		setTimeout(() => copied = false, 2500);
	}

	const GENS = [
		{ name:'Bing Image Creator', url:'https://www.bing.com/images/create',    note:'Free · DALL-E 3 · Best quality' },
		{ name:'Adobe Firefly',      url:'https://firefly.adobe.com',             note:'Free · 25 credits/month' },
		{ name:'Leonardo.ai',        url:'https://app.leonardo.ai',               note:'Free · 150 tokens/day' },
		{ name:'Ideogram',           url:'https://ideogram.ai',                   note:'Free · Great for text on flags' },
		{ name:'NightCafe',          url:'https://creator.nightcafe.studio',      note:'Free daily credits' },
	];
</script>

<div class="tek-stage fw-page">

	<div class="fw-header">
		<div class="fw-header-text">
			<div class="tek-breadcrumb">
				<a href="/dossier">DASHBOARD</a><span class="sep">/</span><a href="/tribe">TRIBE</a><span class="sep">/</span><span>FLAG WORKSHOP</span>
			</div>
			<h1 class="t-page-title">Flag Workshop</h1>
			<div class="tek-page-sub">"Forge your tribe's sigil. The wild will know who you are by the colors you fly."</div>
		</div>
		<a href="/tribe" class="tek-btn-v2 ghost sm">← Tribe</a>
	</div>

	<!-- Step 1 -->
	<div class="fw-step-label">1 — Choose your tribe's identity</div>
	<div class="fw-arch-grid">
		{#each ARCHETYPES as a}
			<button
				class="fw-arch-card"
				class:selected={picked?.id === a.id}
				onclick={() => pick(a)}
				style="--c1:{a.col1};--c2:{a.col2}"
			>
				<div class="fw-arch-bg"></div>
				<div class="fw-arch-content">
					<div class="fw-arch-emoji">{a.emoji}</div>
					<div class="fw-arch-label">{a.label}</div>
					<div class="fw-arch-desc">{a.desc}</div>
				</div>
				{#if picked?.id === a.id}
					<div class="fw-arch-selected-ring"></div>
				{/if}
			</button>
		{/each}
	</div>

	{#if picked}
		<!-- Step 2 -->
		<div class="fw-step-label">2 — Fine-tune the details</div>
		<div class="fw-tune-row">

			<!-- Creature -->
			<div class="fw-tune-block">
				<div class="fw-tune-title">Creature / Symbol</div>
				<div class="fw-creature-chips">
					{#each CREATURES as c}
						<button
							class="fw-cchip"
							class:active={!customCreature && creature === c}
							onclick={() => { creature = c; customCreature = false; }}
						>{c}</button>
					{/each}
					<button class="fw-cchip" class:active={customCreature} onclick={() => customCreature = true}>Custom…</button>
				</div>
				{#if customCreature}
					<input class="form-control fw-custom-input" placeholder="Type any creature name..." bind:value={customCreatureText} />
				{/if}
			</div>

			<!-- Colors + Name -->
			<div class="fw-tune-right">
				<div class="fw-tune-block">
					<div class="fw-tune-title">Colors</div>
					<div class="fw-color-pair">
						<label class="fw-color-label">
							<input type="color" class="fw-swatch" bind:value={col1} />
							<span>Primary</span>
						</label>
						<label class="fw-color-label">
							<input type="color" class="fw-swatch" bind:value={col2} />
							<span>Secondary</span>
						</label>
					</div>
				</div>
				<div class="fw-tune-block">
					<div class="fw-tune-title">Tribe Name on Flag <span class="fw-optional">optional</span></div>
					<input class="form-control" placeholder="e.g. Iron Talons" bind:value={tribeName} />
				</div>
			</div>
		</div>

		<!-- Step 3: Prompt + Copy -->
		<div class="fw-step-label">3 — Copy your prompt and generate</div>
		<div class="fw-prompt-area">
			<div class="fw-prompt-text">{buildPrompt()}</div>
			<button class="btn btn-primary fw-copy-btn" onclick={copy}>
				<Clipboard size={15} />
				{copied ? '✓ Copied!' : 'Copy Prompt'}
			</button>
		</div>

		<!-- Generators -->
		<div class="fw-gen-row">
			{#each GENS as g}
				<a href={g.url} target="_blank" rel="noopener" class="cham-shell fw-gen-pill" style="--cut:6px">
					<div class="fw-gen-inner">
						<div class="fw-gen-name">{g.name}</div>
						<div class="fw-gen-note">{g.note}</div>
						<ExternalLink size={11} style="color:#475569;margin-left:auto;flex-shrink:0" />
					</div>
				</a>
			{/each}
		</div>

		<div class="fw-hint">Paste the prompt into any generator above. If you don't love the first result, generate again — it's free. For best results use Bing Image Creator (DALL-E 3).</div>
	{:else}
		<div class="fw-awaiting">Pick a tribe identity above to get started.</div>
	{/if}

</div>

<style>
.fw-page { max-width:900px; }
.fw-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:28px; }
.fw-title { font-size:1.6rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.02em; line-height:1.1; }
.fw-subtitle { font-size:0.78rem; color:#475569; margin-top:4px; letter-spacing:0.04em; }

.fw-step-label { font-size:0.62rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#334155; margin-bottom:12px; margin-top:28px; display:flex; align-items:center; gap:10px; }
.fw-step-label::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.04); }

/* Archetype grid */
.fw-arch-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
@media (max-width:640px) { .fw-arch-grid { grid-template-columns:repeat(2,1fr); } }

.fw-arch-card {
	position:relative; overflow:hidden; cursor:pointer;
	border:1px solid rgba(255,255,255,0.06); font-family:inherit;
	text-align:left; transition:transform .15s, border-color .15s;
	clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
	min-height:100px; background:none; padding:0;
}
.fw-arch-card:hover { transform:translateY(-2px); border-color:rgba(255,255,255,0.14); }
.fw-arch-card.selected { border-color:rgba(255,255,255,0.4); transform:translateY(-2px); }

.fw-arch-bg {
	position:absolute; inset:0;
	background:linear-gradient(135deg, var(--c1) 0%, var(--c2) 100%);
	opacity:0.22;
	transition:opacity .15s;
}
.fw-arch-card:hover .fw-arch-bg { opacity:0.32; }
.fw-arch-card.selected .fw-arch-bg { opacity:0.38; }

.fw-arch-content { position:relative; z-index:1; padding:14px 14px 12px; display:flex; flex-direction:column; gap:4px; }
.fw-arch-emoji { font-size:1.4rem; margin-bottom:2px; }
.fw-arch-label { font-size:0.86rem; font-weight:700; color:#f1f5f9; }
.fw-arch-desc  { font-size:0.68rem; color:#94a3b8; font-style:italic; }

.fw-arch-selected-ring {
	position:absolute; inset:0;
	border:2px solid rgba(255,255,255,0.5);
	clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
	pointer-events:none;
}

/* Fine-tune row */
.fw-tune-row { display:grid; grid-template-columns:1fr 280px; gap:16px; align-items:start; }
@media (max-width:700px) { .fw-tune-row { grid-template-columns:1fr; } }
.fw-tune-right { display:flex; flex-direction:column; gap:14px; }
.fw-tune-block { background:rgba(10,18,40,0.7); padding:14px 16px; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); }
.fw-tune-title { font-size:0.62rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.fw-optional { font-weight:400; color:#334155; text-transform:none; letter-spacing:0; }

.fw-creature-chips { display:flex; flex-wrap:wrap; gap:4px; }
.fw-cchip { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:#64748b; font-size:0.73rem; padding:3px 9px; cursor:pointer; font-family:inherit; transition:all .12s; clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.fw-cchip:hover { background:rgba(255,255,255,0.09); color:#94a3b8; }
.fw-cchip.active { background:rgba(0,180,255,0.14); color:#7dd3fc; border-color:rgba(0,180,255,0.38); }
.fw-custom-input { margin-top:8px; }

.fw-color-pair { display:flex; gap:16px; }
.fw-color-label { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.78rem; color:#64748b; }
.fw-swatch { width:32px; height:32px; padding:2px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); cursor:pointer; border-radius:0; flex-shrink:0; }

/* Prompt */
.fw-prompt-area { background:linear-gradient(160deg,rgba(0,20,50,0.98),rgba(0,8,24,1)); padding:18px 20px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); border-left:3px solid rgba(0,180,255,0.5); display:flex; gap:16px; align-items:flex-start; }
.fw-prompt-text { flex:1; font-size:0.8rem; color:#94a3b8; line-height:1.75; font-style:italic; }
.fw-copy-btn { flex-shrink:0; display:flex; align-items:center; gap:7px; align-self:flex-end; }

/* Generators */
.fw-gen-row { display:flex; flex-wrap:wrap; gap:6px; margin-top:14px; }
.fw-gen-pill { display:block; text-decoration:none; color:inherit; }
.fw-gen-inner { background:rgba(10,18,40,0.9); padding:7px 13px; display:flex; align-items:center; gap:8px; transition:background .15s; }
.fw-gen-pill:hover .fw-gen-inner { background:rgba(14,26,54,0.98); }
.fw-gen-name { font-size:0.8rem; font-weight:600; color:#f1f5f9; }
.fw-gen-note { font-size:0.66rem; color:#475569; }

.fw-hint { font-size:0.72rem; color:#334155; margin-top:12px; line-height:1.6; }
.fw-awaiting { color:#334155; text-align:center; padding:40px 0; font-size:0.9rem; }
</style>
