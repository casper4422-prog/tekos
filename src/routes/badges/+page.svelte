<script lang="ts">
	const BADGE_TIERS = [
		{ id:'bronze',  label:'Bronze',  color:'#cd7f32', glow:'rgba(205,127,50,0.3)'   },
		{ id:'silver',  label:'Silver',  color:'#c0c0c0', glow:'rgba(192,192,192,0.3)'  },
		{ id:'gold',    label:'Gold',    color:'#ffd700', glow:'rgba(255,215,0,0.3)'    },
		{ id:'diamond', label:'Diamond', color:'#00b4ff', glow:'rgba(0,180,255,0.4)'    },
	];

	const BADGE_CATEGORIES = [
		{
			id:'prized_bloodline',
			name:'Prized Bloodline',
			icon:'🥇',
			desc:'Awarded to creatures with exceptional base stats across all five core attributes. Every single stat must meet the threshold — one weak stat disqualifies the entire creature.',
			formula:'All 5 of: Health, Stamina, Food, Weight, Melee (wild base, no domestic points)',
			tiers:[
				{ tier:'Bronze',  req:'All stats ≥ 45',  emoji:'🥉' },
				{ tier:'Silver',  req:'All stats ≥ 50',  emoji:'🥈' },
				{ tier:'Gold',    req:'All stats ≥ 55',  emoji:'🥇' },
				{ tier:'Diamond', req:'All stats ≥ 60',  emoji:'💎' },
			],
			note:'This badge measures wild-caught genetic quality. It will not trigger on domestically levelled stats.',
		},
		{
			id:'boss_ready',
			name:'Boss Ready',
			icon:'⭐',
			desc:'Identifies meta-tier creatures whose combined HP and Melee reach the threshold needed to reliably contribute in ARK boss arenas. Calculated using wild base + mutations (×2) + domestic levels.',
			formula:'Meta species only. HP score + Melee score (base + muts×2 + domestic)',
			tiers:[
				{ tier:'Gamma Ready',  req:'HP ≥ 75 AND Melee ≥ 75',   emoji:'⭐' },
				{ tier:'Beta Ready',   req:'HP ≥ 100 AND Melee ≥ 100', emoji:'⭐⭐' },
				{ tier:'Alpha Ready',  req:'HP ≥ 125 AND Melee ≥ 125', emoji:'⭐⭐⭐' },
				{ tier:'Titan Slayer', req:'HP ≥ 150 AND Melee ≥ 150', emoji:'⚡' },
			],
			note:'Meta species include Rex, Therizinosaurus, Deinonychus, Megatherium, Yutyrannus, Daeodon, and other commonly used boss creatures.',
		},
		{
			id:'boss_roles',
			name:'Boss Role Badges',
			icon:'🛡️',
			desc:'Awarded independently of the Boss Ready tier. A creature can earn multiple role badges if it excels in specific areas. These stack on top of tier badges.',
			formula:'Meta species only. Calculated the same way as Boss Ready.',
			tiers:[
				{ tier:'Boss Tank',      req:'HP score ≥ 175',                           emoji:'🛡️' },
				{ tier:'Boss DPS',       req:'Melee score ≥ 175',                        emoji:'⚔️' },
				{ tier:'Boss Juggernaut',req:'HP ≥ 125 AND Stamina ≥ 125',               emoji:'💪' },
				{ tier:'Boss Bruiser',   req:'HP ≥ 125 AND Weight ≥ 125',                emoji:'🪓' },
			],
			note:'Role badges are awarded independently — a single creature can hold Titan Slayer + Boss Tank + Boss DPS simultaneously.',
		},
		{
			id:'underdog',
			name:'Underdog',
			icon:'🐾',
			desc:'For non-meta creatures that defy expectations. If a creature that normally wouldn\'t be used in boss fights reaches extraordinary stats, it earns the Underdog badge instead of Boss Ready.',
			formula:'Non-meta species. HP score + Melee score (same formula as Boss Ready)',
			tiers:[
				{ tier:'Underdog Champion', req:'HP ≥ 90 AND Melee ≥ 90',   emoji:'🐾🥉' },
				{ tier:'Underdog Hero',     req:'HP ≥ 115 AND Melee ≥ 115', emoji:'🐾🥈' },
				{ tier:'Underdog Legend',   req:'HP ≥ 140 AND Melee ≥ 140', emoji:'🐾🥇' },
				{ tier:'Underdog Titan',    req:'HP ≥ 160 AND Melee ≥ 160', emoji:'🐾💎' },
			],
			note:'A creature cannot hold both Boss Ready and Underdog badges — they are mutually exclusive based on species classification.',
		},
		{
			id:'utility',
			name:'Utility Badges',
			icon:'⛏️',
			desc:'Species-specific badges that recognise creatures excelling at their intended utility role. Only specific species are eligible for each track.',
			formula:'Varies per badge. Uses wild base + mutations×2 + domestic levels.',
			tiers:[
				{ tier:'Yield Harvester',      req:'Melee score ≥ 80/105/130/155 — Ankylo, Doedicurus, Castoroides, Mammoth, Magmasaur, Theri', emoji:'⛏️' },
				{ tier:'Specialized Gatherer', req:'Total domestic levels ≥ 50/70/90/110 — Theri, Gigantopithecus, Mantis, Moschops, Achatina', emoji:'🌿' },
				{ tier:'Cargo Transport',      req:'Weight score ≥ 80/105/130/155 — Argentavis, Quetzal, Gasbags, Paraceratherium, Mosasaurus',  emoji:'📦' },
				{ tier:'Mobile Refinery',      req:'Min(Weight, Stamina) ≥ 75/100/125/150 — Argentavis, Castoroides, Phoenix, Equus',           emoji:'🔥' },
				{ tier:'Gemstone Specialist',  req:'Melee score ≥ 80/105/130/155 — Ankylosaurus, Roll Rat, Phoenix, Karkinos',                  emoji:'💎' },
			],
			note:'Bronze/Silver/Gold/Diamond tiers are awarded for all utility badges based on the listed thresholds.',
		},
		{
			id:'collector',
			name:'Collector Badges',
			icon:'🏅',
			desc:'Account-wide badges earned by your total vault composition. Counted across ALL your specimens, not per creature. These appear on your Dossier.',
			formula:'Counted from your entire Specimens vault using species category data.',
			tiers:[
				{ tier:'Novice Hunter → Apex Legend',          req:'Combat species: 5 / 15 / 30 / 50',        emoji:'⚔️🏅' },
				{ tier:'Gatherer → Mining Mogul',              req:'Harvesting species: 3 / 10 / 20 / 35',    emoji:'⛏️🏅' },
				{ tier:'Pack Mule → Transport Tycoon',         req:'Transport/Companion species: 3 / 8 / 15 / 25', emoji:'📦🏅' },
			],
			note:'Your top tier per track is displayed. These update automatically as you add new specimens to your vault.',
		},
	];
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Badge System</h1>
			<div class="page-subtitle">How achievements are earned and what they mean</div>
		</div>
	</div>

	<!-- Tier legend -->
	<div class="bg-tier-legend">
		<div class="bg-tier-title">Badge Tiers</div>
		<div class="bg-tier-row">
			{#each BADGE_TIERS as t}
				<div class="bg-tier-chip" style="color:{t.color};border-color:color-mix(in srgb,{t.color} 30%,transparent);background:color-mix(in srgb,{t.color} 8%,transparent)">
					{t.label}
				</div>
			{/each}
		</div>
		<div class="bg-tier-note">Diamond is the highest tier. Some badges only have 3 tiers, some have 4. Badge tiers are independent per badge category.</div>
	</div>

	<!-- Badge categories -->
	<div class="bg-list">
		{#each BADGE_CATEGORIES as cat}
			<div class="cham-shell bg-card">
				<div class="bg-card-inner">
					<div class="bg-card-header">
						<span class="bg-cat-icon">{cat.icon}</span>
						<div>
							<div class="bg-cat-name">{cat.name}</div>
							<div class="bg-cat-desc">{cat.desc}</div>
						</div>
					</div>

					<div class="bg-formula">
						<span class="bg-formula-label">Formula:</span> {cat.formula}
					</div>

					<div class="bg-tiers-grid">
						{#each cat.tiers as t}
							<div class="bg-tier-entry">
								<span class="bg-tier-emoji">{t.emoji}</span>
								<div>
									<div class="bg-tier-entry-name">{t.tier}</div>
									<div class="bg-tier-entry-req">{t.req}</div>
								</div>
							</div>
						{/each}
					</div>

					{#if cat.note}
						<div class="bg-note">{cat.note}</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- How to earn section -->
	<div class="cham-shell bg-howto" style="margin-top:28px">
		<div class="bg-card-inner">
			<div class="bg-cat-name" style="margin-bottom:12px">How Badges Are Calculated</div>
			<div class="bg-howto-grid">
				<div class="bg-howto-item">
					<div class="bg-howto-label">Wild Base Stats</div>
					<div class="bg-howto-val">The raw stat points from breeding/taming, before any domestic levelling</div>
				</div>
				<div class="bg-howto-item">
					<div class="bg-howto-label">Mutations</div>
					<div class="bg-howto-val">Each mutation in a stat adds ×2 to the score for that stat</div>
				</div>
				<div class="bg-howto-item">
					<div class="bg-howto-label">Domestic Levels</div>
					<div class="bg-howto-val">Post-tame levels allocated to a stat. Counted at face value (1 point = 1)</div>
				</div>
				<div class="bg-howto-item">
					<div class="bg-howto-label">Total Score</div>
					<div class="bg-howto-val">Base + (Mutations × 2) + Domestic — this is what's compared to thresholds</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
.bg-tier-legend { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:16px 20px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); margin-bottom:24px; }
.bg-tier-title { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.bg-tier-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
.bg-tier-chip { font-size:0.78rem; font-weight:700; padding:4px 14px; border:1px solid; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.bg-tier-note { font-size:0.74rem; color:#475569; line-height:1.5; }

.bg-list { display:flex; flex-direction:column; gap:12px; }
.bg-card { }
.bg-card-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:20px 22px; display:flex; flex-direction:column; gap:12px; }
.bg-card-header { display:flex; gap:14px; align-items:flex-start; }
.bg-cat-icon { font-size:1.8rem; flex-shrink:0; }
.bg-cat-name { font-size:1rem; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
.bg-cat-desc { font-size:0.82rem; color:#94a3b8; line-height:1.55; }

.bg-formula { font-size:0.76rem; color:#64748b; background:rgba(0,0,0,0.2); padding:8px 12px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.bg-formula-label { color:#475569; font-weight:600; }

.bg-tiers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:8px; }
.bg-tier-entry { display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.03); padding:8px 12px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.bg-tier-emoji { font-size:1.2rem; flex-shrink:0; }
.bg-tier-entry-name { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.bg-tier-entry-req  { font-size:0.74rem; color:#64748b; margin-top:2px; }

.bg-note { font-size:0.76rem; color:#475569; border-left:2px solid rgba(0,180,255,0.25); padding:8px 12px; font-style:italic; line-height:1.5; }

.bg-howto { }
.bg-howto-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
.bg-howto-item { background:rgba(255,255,255,0.03); padding:10px 14px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.bg-howto-label { font-size:0.72rem; font-weight:700; color:#7dd3fc; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
.bg-howto-val { font-size:0.78rem; color:#64748b; line-height:1.5; }
</style>
