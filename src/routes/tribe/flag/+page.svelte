<script lang="ts">
	import { Clipboard, ExternalLink, Wand2, RefreshCw } from 'lucide-svelte';

	const CREATURES = ['Rex','Wyvern','Giga','Carnotaurus','Spino','Therizinosaurus','Allosaurus','Baryonyx','Megalosaurus','Shadowmane','Managarmr','Snow Owl','Thylacoleo','Sabertooth','Ravager','Basilisk','Astrodelphis','Carcharodontosaurus','Deinonychus'];
	const STYLES    = ['heraldic fantasy','sci-fi holographic','battle-worn medieval','ancient stone carving','glowing neon cyberpunk','painted banner art','mythological','dark gothic'];
	const SHAPES    = ['shield','banner','square emblem','circular seal','torn flag','ornate crest'];
	const MOODS     = ['fierce and aggressive','noble and proud','ancient and mysterious','dark and threatening','glorious and triumphant','cunning and shadowed'];
	const BACKGS    = ['solid color field','stormy sky','fire and smoke','starfield void','arctic tundra','molten lava','deep ocean','dense jungle'];
	const ELEMENTS  = ['crossed weapons','tribal runes','lightning bolt','chain links','crown','skull','wings spread','twin serpents','tek energy core'];

	let creature   = $state('Rex');
	let style      = $state('heraldic fantasy');
	let shape      = $state('shield');
	let mood       = $state('fierce and aggressive');
	let bg         = $state('solid color field');
	let col1       = $state('#8b0000');
	let col2       = $state('#1a1a2e');
	let element    = $state('crossed weapons');
	let tribeText  = $state('');
	let copied     = $state(false);

	function buildPrompt(): string {
		const colorDesc = `${col1} and ${col2}`;
		const textPart  = tribeText.trim() ? `, text reading "${tribeText.trim()}" in bold stylized lettering` : '';
		return `A ${style} tribe flag in the shape of a ${shape} featuring a ${creature} as the central symbol, ${mood} mood, ${colorDesc} color scheme, ${bg} background, with ${element} as decorative elements${textPart}. Detailed digital art, high resolution, transparent background, no watermark, game icon style.`;
	}

	async function copyPrompt() {
		await navigator.clipboard.writeText(buildPrompt());
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	const GENERATORS = [
		{ name:'Bing Image Creator',  url:'https://www.bing.com/images/create',     note:'Free · DALL-E 3 · Best quality' },
		{ name:'Adobe Firefly',       url:'https://firefly.adobe.com',              note:'Free · 25 credits/month' },
		{ name:'Leonardo.ai',         url:'https://leonardo.ai',                    note:'Free · 150 tokens/day' },
		{ name:'Ideogram',            url:'https://ideogram.ai',                    note:'Free tier · Great for logos' },
		{ name:'NightCafe',           url:'https://creator.nightcafe.studio',       note:'Free credits daily' },
	];
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Flag Workshop</h1>
			<div class="page-subtitle">Build the perfect AI prompt for your tribe flag</div>
		</div>
		<a href="/tribe" class="btn btn-secondary btn-sm">← Back to Tribe</a>
	</div>

	<div class="flag-layout">
		<!-- Builder -->
		<div class="flag-builder">
			<div class="flag-card">
				<div class="flag-card-title"><Wand2 size={14} /> Design Your Flag</div>

				<div class="flag-fields">
					<div class="plan-field">
						<label class="form-label">ARK Creature / Symbol</label>
						<select class="form-control" bind:value={creature}>
							{#each CREATURES as c}<option value={c}>{c}</option>{/each}
							<option value="custom dragon">Custom Dragon</option>
							<option value="twin dire wolves">Twin Dire Wolves</option>
							<option value="corrupted element crystal">Element Crystal</option>
						</select>
					</div>
					<div class="plan-field">
						<label class="form-label">Art Style</label>
						<select class="form-control" bind:value={style}>
							{#each STYLES as s}<option value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>{/each}
						</select>
					</div>
					<div class="plan-field">
						<label class="form-label">Flag Shape</label>
						<select class="form-control" bind:value={shape}>
							{#each SHAPES as s}<option value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>{/each}
						</select>
					</div>
					<div class="plan-field">
						<label class="form-label">Mood</label>
						<select class="form-control" bind:value={mood}>
							{#each MOODS as m}<option value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>{/each}
						</select>
					</div>
					<div class="plan-field">
						<label class="form-label">Background</label>
						<select class="form-control" bind:value={bg}>
							{#each BACKGS as b}<option value={b}>{b.charAt(0).toUpperCase()+b.slice(1)}</option>{/each}
						</select>
					</div>
					<div class="plan-field">
						<label class="form-label">Decorative Element</label>
						<select class="form-control" bind:value={element}>
							{#each ELEMENTS as e}<option value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>{/each}
						</select>
					</div>
					<div class="flag-color-row">
						<div class="plan-field">
							<label class="form-label">Primary Color</label>
							<div style="display:flex;gap:8px;align-items:center">
								<input type="color" class="color-swatch-input" bind:value={col1} />
								<input class="form-control" bind:value={col1} style="max-width:100px" />
							</div>
						</div>
						<div class="plan-field">
							<label class="form-label">Secondary Color</label>
							<div style="display:flex;gap:8px;align-items:center">
								<input type="color" class="color-swatch-input" bind:value={col2} />
								<input class="form-control" bind:value={col2} style="max-width:100px" />
							</div>
						</div>
					</div>
					<div class="plan-field">
						<label class="form-label">Tribe Name on Flag (optional)</label>
						<input class="form-control" bind:value={tribeText} placeholder="e.g. Iron Talons" />
					</div>
				</div>
			</div>

			<!-- Generated prompt -->
			<div class="flag-prompt-box">
				<div class="flag-prompt-label">Your Generated Prompt</div>
				<div class="flag-prompt-text">{buildPrompt()}</div>
				<button class="btn btn-primary" onclick={copyPrompt}>
					<Clipboard size={14} /> {copied ? 'Copied!' : 'Copy Prompt'}
				</button>
			</div>
		</div>

		<!-- Generator links -->
		<div class="flag-generators">
			<div class="flag-card">
				<div class="flag-card-title">Free AI Generators</div>
				<div class="flag-gen-desc">Copy your prompt above, then paste it into any of these free tools:</div>
				<div class="flag-gen-list">
					{#each GENERATORS as g}
						<a href={g.url} target="_blank" rel="noopener" class="cham-shell flag-gen-item" style="--cut:6px">
							<div class="flag-gen-inner">
								<div>
									<div class="flag-gen-name">{g.name}</div>
									<div class="flag-gen-note">{g.note}</div>
								</div>
								<ExternalLink size={13} style="color:#334155;flex-shrink:0" />
							</div>
						</a>
					{/each}
				</div>
			</div>

			<div class="flag-card flag-tip-card">
				<div class="flag-card-title">Tips for Best Results</div>
				<ul class="flag-tips">
					<li>Bing Image Creator (DALL-E 3) gives the best fantasy art quality for free</li>
					<li>If the first result isn't right, generate again — it's free</li>
					<li>Ask for "transparent background" so the flag layers nicely on any color</li>
					<li>After generating, come back and set it as your tribe flag image</li>
					<li>Add "no text" to the prompt if you want a cleaner emblem without lettering</li>
				</ul>
			</div>
		</div>
	</div>
</div>

<style>
.flag-layout { display:grid; grid-template-columns:1fr 340px; gap:20px; align-items:start; }
@media (max-width:900px) { .flag-layout { grid-template-columns:1fr; } }

.flag-card { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:20px 22px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); margin-bottom:16px; }
.flag-card-title { font-size:0.7rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:16px; display:flex; align-items:center; gap:8px; }

.flag-fields { display:flex; flex-direction:column; gap:12px; }
.flag-color-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.color-swatch-input { width:36px; height:34px; padding:2px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); cursor:pointer; flex-shrink:0; border-radius:0; }

.flag-prompt-box { background:rgba(0,180,255,0.04); border:1px solid rgba(0,180,255,0.15); border-left:3px solid rgba(0,180,255,0.4); padding:16px 18px; clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%); }
.flag-prompt-label { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#64748b; margin-bottom:8px; }
.flag-prompt-text { font-size:0.82rem; color:#94a3b8; line-height:1.65; margin-bottom:14px; font-style:italic; }

.flag-gen-desc { font-size:0.78rem; color:#64748b; margin-bottom:12px; }
.flag-gen-list { display:flex; flex-direction:column; gap:5px; }
.flag-gen-item { display:block; text-decoration:none; color:inherit; }
.flag-gen-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; transition:background .15s; }
.flag-gen-item:hover .flag-gen-inner { background:rgba(14,26,54,0.98); }
.flag-gen-name { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.flag-gen-note { font-size:0.7rem; color:#64748b; margin-top:1px; }

.flag-tip-card { background:linear-gradient(160deg,rgba(14,8,40,0.97),rgba(4,4,20,1)); }
.flag-tips { list-style:none; display:flex; flex-direction:column; gap:8px; }
.flag-tips li { font-size:0.78rem; color:#64748b; line-height:1.5; padding-left:16px; position:relative; }
.flag-tips li::before { content:'›'; position:absolute; left:0; color:#8b5cf6; }
</style>
