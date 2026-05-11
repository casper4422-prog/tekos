<script lang="ts">
	const BADGE_CATEGORIES = [
		{
			id: 'prized_bloodline',
			name: 'Prized Bloodline',
			icon: '🥇',
			color: '245,158,11',
			desc: 'Recognises creatures with exceptional wild-caught base stats across all five core attributes. Every stat must meet the threshold — one weak stat disqualifies the whole creature.',
			tiers: [
				{ tier:'Bronze',  emoji:'🥉', req:'All 5 stats ≥ 45' },
				{ tier:'Silver',  emoji:'🥈', req:'All 5 stats ≥ 50' },
				{ tier:'Gold',    emoji:'🥇', req:'All 5 stats ≥ 55' },
				{ tier:'Diamond', emoji:'💎', req:'All 5 stats ≥ 60' },
			],
			stats: 'Health, Stamina, Food, Weight, Melee — wild base only, no mutations or domestic levels',
			note: 'This badge uses raw base stats only. Domestic levels and mutations are NOT counted here.'
		},
		{
			id: 'boss_ready',
			name: 'Boss Ready',
			icon: '⭐',
			color: '239,68,68',
			desc: 'Awarded to meta-tier creatures built for ARK boss arenas. Score combines base stats, mutation levels, and domestic levels for both HP and Melee.',
			tiers: [
				{ tier:'Gamma Ready',  emoji:'⭐',     req:'HP score ≥ 75  AND  Melee score ≥ 75'  },
				{ tier:'Beta Ready',   emoji:'⭐⭐',   req:'HP score ≥ 100  AND  Melee score ≥ 100' },
				{ tier:'Alpha Ready',  emoji:'⭐⭐⭐', req:'HP score ≥ 125  AND  Melee score ≥ 125' },
				{ tier:'Titan Slayer', emoji:'⚡',     req:'HP score ≥ 150  AND  Melee score ≥ 150' },
			],
			stats: 'HP score + Melee score (Base + Mutation Levels×2 + Domestic)',
			note: 'Meta species: Rex, Therizinosaurus, Deinonychus, Megatherium, Yutyrannus, Daeodon, and other common boss creatures.'
		},
		{
			id: 'boss_roles',
			name: 'Boss Role Badges',
			icon: '🛡️',
			color: '59,130,246',
			desc: 'Specialist roles that stack on top of Boss Ready tiers. A single creature can hold multiple role badges at once.',
			tiers: [
				{ tier:'Boss Tank',       emoji:'🛡️', req:'HP score ≥ 175'                            },
				{ tier:'Boss DPS',        emoji:'⚔️', req:'Melee score ≥ 175'                         },
				{ tier:'Boss Juggernaut', emoji:'💪', req:'HP score ≥ 125  AND  Stamina score ≥ 125'  },
				{ tier:'Boss Bruiser',    emoji:'🪓', req:'HP score ≥ 125  AND  Weight score ≥ 125'   },
			],
			stats: 'Same score formula as Boss Ready',
			note: 'Role badges are independent — Titan Slayer + Boss Tank + Boss DPS can all appear on the same creature.'
		},
		{
			id: 'underdog',
			name: 'Underdog',
			icon: '🐾',
			color: '139,92,246',
			desc: 'For non-meta species that achieve extraordinary stats through breeding. Mutually exclusive with Boss Ready based on species classification.',
			tiers: [
				{ tier:'Underdog Champion', emoji:'🐾🥉', req:'HP score ≥ 90   AND  Melee score ≥ 90'  },
				{ tier:'Underdog Hero',     emoji:'🐾🥈', req:'HP score ≥ 115  AND  Melee score ≥ 115' },
				{ tier:'Underdog Legend',   emoji:'🐾🥇', req:'HP score ≥ 140  AND  Melee score ≥ 140' },
				{ tier:'Underdog Titan',    emoji:'🐾💎', req:'HP score ≥ 160  AND  Melee score ≥ 160' },
			],
			stats: 'Same score formula — any non-meta species',
			note: 'If a species is classified as meta, it earns Boss Ready instead of Underdog.'
		},
		{
			id: 'utility',
			name: 'Utility Badges',
			icon: '⛏️',
			color: '34,197,94',
			desc: 'Species-specific badges for creatures excelling at their natural gathering and transport roles. Only specific species qualify per track.',
			tiers: [
				{ tier:'Yield Harvester',      emoji:'⛏️', req:'Melee score ≥ 80/105/130/155 — Ankylo, Doedicurus, Castoroides, Mammoth, Magmasaur, Theri' },
				{ tier:'Specialized Gatherer', emoji:'🌿', req:'Total domestic levels ≥ 50/70/90/110 — Theri, Gigantopithecus, Mantis, Moschops, Achatina' },
				{ tier:'Cargo Transport',      emoji:'📦', req:'Weight score ≥ 80/105/130/155 — Argentavis, Quetzal, Gasbags, Paraceratherium, Mosasaurus'  },
				{ tier:'Mobile Refinery',      emoji:'🔥', req:'Min(Weight, Stamina) ≥ 75/100/125/150 — Argentavis, Castoroides, Phoenix, Equus'            },
			],
			stats: 'Melee, Weight, or Stamina score depending on track (same formula)',
			note: 'Thresholds shown as Bronze/Silver/Gold/Diamond (B/S/G/D).'
		},
		{
			id: 'collector',
			name: 'Collector Badges',
			icon: '🏅',
			color: '0,180,255',
			desc: 'Account-wide badges counted across your entire Specimens vault. Shown on your Dossier and update automatically.',
			tiers: [
				{ tier:'Novice Hunter → Apex Legend',  emoji:'⚔️🏅', req:'Combat species: 5 / 15 / 30 / 50'            },
				{ tier:'Gatherer → Mining Mogul',      emoji:'⛏️🏅', req:'Harvesting species: 3 / 10 / 20 / 35'        },
				{ tier:'Pack Mule → Transport Tycoon', emoji:'📦🏅', req:'Transport/Companion species: 3 / 8 / 15 / 25' },
			],
			stats: 'Counted from your full vault using each species\' category',
			note: 'Only the highest tier per track is displayed.'
		},
	];
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Badges</h1>
			<div class="page-subtitle">How achievements are earned in TekOS</div>
		</div>
	</div>

	<!-- Score formula — front and centre -->
	<div class="cham-shell bg-formula-card">
		<div class="bg-formula-inner">
			<div class="bg-formula-title">The Score Formula</div>
			<div class="bg-formula-equation">
				Score&nbsp;=&nbsp;
				<span class="bg-eq base">Base Stat</span>
				&nbsp;+&nbsp;
				<span class="bg-eq mut">(Mutation Levels × 2)</span>
				&nbsp;+&nbsp;
				<span class="bg-eq dom">Domestic Levels</span>
			</div>

			<div class="bg-explainers">
				<div class="bg-exp">
					<div class="bg-exp-label" style="color:#60a5fa">Base Stat</div>
					<div class="bg-exp-text">The raw stat a creature was born or tamed with, before you level it up post-tame. You enter this in the <em>Base Stat</em> column when adding a specimen.</div>
				</div>
				<div class="bg-exp">
					<div class="bg-exp-label" style="color:#c084fc">Mutation Levels × 2</div>
					<div class="bg-exp-text">In ARK, each time a stat mutates during breeding it gains <strong>2 extra stat levels</strong>. Enter the mutation count per stat in the <em>Mutations</em> column — TekOS multiplies by 2 automatically. Example: 3 HP mutations = +6 to the HP score.</div>
				</div>
				<div class="bg-exp">
					<div class="bg-exp-label" style="color:#4ade80">Domestic Levels</div>
					<div class="bg-exp-text">Levels you manually allocate to a stat after taming. Each level = 1 point added to the score. Tracked in the <em>Domestic Levels</em> column.</div>
				</div>
			</div>

			<div class="bg-example">
				<strong>Example —</strong> A Rex with <span style="color:#60a5fa">40 base HP</span>, <span style="color:#c084fc">3 HP mutations</span>, and <span style="color:#4ade80">20 domestic HP levels</span> has an HP score of 40 + (3 × 2) + 20 = <strong>66</strong>.
			</div>
		</div>
	</div>

	<!-- Badge categories -->
	<div class="bg-list">
		{#each BADGE_CATEGORIES as cat}
			<div class="cham-shell bg-card" style="--cat-rgb:{cat.color}">
				<div class="bg-card-inner">
					<div class="bg-card-header">
						<span class="bg-cat-icon">{cat.icon}</span>
						<div>
							<div class="bg-cat-name">{cat.name}</div>
							<div class="bg-cat-desc">{cat.desc}</div>
						</div>
					</div>

					<div class="bg-stat-tag">Stat used: {cat.stats}</div>

					<div class="bg-tiers-grid">
						{#each cat.tiers as t}
							<div class="bg-tier-entry">
								<span class="bg-tier-emoji">{t.emoji}</span>
								<div>
									<div class="bg-tier-name">{t.tier}</div>
									<div class="bg-tier-req">{t.req}</div>
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
</div>

<style>
/* Formula card */
.bg-formula-card { margin-bottom:24px; }
.bg-formula-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:22px 24px; display:flex; flex-direction:column; gap:16px; border-left:3px solid rgba(0,180,255,0.4); }
.bg-formula-title { font-size:0.62rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#475569; }
.bg-formula-equation { font-size:0.95rem; font-weight:700; color:#f1f5f9; display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
.bg-eq { padding:4px 12px; clip-path:polygon(5px 0%,100% 0%,calc(100% - 5px) 100%,0% 100%); }
.bg-eq.base { background:rgba(59,130,246,0.14); color:#60a5fa; }
.bg-eq.mut  { background:rgba(139,92,246,0.14); color:#c084fc; }
.bg-eq.dom  { background:rgba(34,197,94,0.14);  color:#4ade80; }

.bg-explainers { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
@media (max-width:640px) { .bg-explainers { grid-template-columns:1fr; } }
.bg-exp { background:rgba(255,255,255,0.03); padding:11px 13px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.bg-exp-label { font-size:0.66rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px; }
.bg-exp-text { font-size:0.78rem; color:#64748b; line-height:1.6; }
.bg-exp-text strong { color:#94a3b8; }
.bg-exp-text em { color:#7dd3fc; font-style:normal; }

.bg-example { font-size:0.82rem; color:#64748b; background:rgba(0,180,255,0.04); border-left:2px solid rgba(0,180,255,0.3); padding:10px 14px; line-height:1.65; }
.bg-example strong { color:#f1f5f9; }

/* Badge cards */
.bg-list { display:flex; flex-direction:column; gap:12px; }
.bg-card { }
.bg-card-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:20px 22px; display:flex; flex-direction:column; gap:12px; border-left:2px solid rgba(var(--cat-rgb,0,180,255),0.4); }
.bg-card-header { display:flex; gap:14px; align-items:flex-start; }
.bg-cat-icon { font-size:1.7rem; flex-shrink:0; }
.bg-cat-name { font-size:1rem; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
.bg-cat-desc { font-size:0.82rem; color:#94a3b8; line-height:1.55; }
.bg-stat-tag { font-size:0.73rem; color:#475569; background:rgba(255,255,255,0.03); padding:5px 10px; clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.bg-tiers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:7px; }
.bg-tier-entry { display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.03); padding:8px 11px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.bg-tier-emoji { font-size:1.1rem; flex-shrink:0; }
.bg-tier-name { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.bg-tier-req  { font-size:0.72rem; color:#64748b; margin-top:2px; line-height:1.4; }
.bg-note { font-size:0.76rem; color:#475569; border-left:2px solid rgba(255,255,255,0.07); padding:7px 12px; font-style:italic; line-height:1.5; }
</style>
