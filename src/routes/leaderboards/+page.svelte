<script lang="ts">
	import { Trophy, Sword, Dna, Users, Repeat2, Star } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type PlayerRow   = { rank:number; id:number; name:string; specimens:number; friends:number; bossWins:number; alphaKills:number; tradesCompleted:number; speciesOwned:number; score:number };
	type TribeRow    = { rank:number; id:number; name:string; members:number; specimens:number };
	type SpecimenRow = { rank:number; id:number; name:string; species:string; level:number; melee:number; health:number; weight:number; muts:number; owner:string; ownerId:number };
	type BossLegend  = { rank:number; id:number; name:string; wins:number; alphaKills:number };

	let tab = $state<'survivors'|'tribes'|'specimens'|'legends'>('survivors');

	function rankColor(r: number) {
		if (r === 1) return '#f59e0b';
		if (r === 2) return '#94a3b8';
		if (r === 3) return '#f97316';
		return '#334155';
	}
	function rankLabel(r: number) {
		if (r === 1) return '◆ 1st';
		if (r === 2) return '▲ 2nd';
		if (r === 3) return '● 3rd';
		return `#${r}`;
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Rankings</h1>
			<div class="page-subtitle">Global leaderboards across all survivors &amp; tribes</div>
		</div>
	</div>

	<div class="tek-tab-bar">
		<button class="tek-tab" class:active={tab==='survivors'} onclick={() => tab='survivors'}>
			<Users size={13} /> Survivors
		</button>
		<button class="tek-tab" class:active={tab==='tribes'} onclick={() => tab='tribes'}>
			<Trophy size={13} /> Tribes
		</button>
		<button class="tek-tab" class:active={tab==='specimens'} onclick={() => tab='specimens'}>
			<Dna size={13} /> Specimens
		</button>
		<button class="tek-tab" class:active={tab==='legends'} onclick={() => tab='legends'}>
			<Sword size={13} /> Boss Legends
		</button>
	</div>

	{#if tab === 'survivors'}
		<div class="lb-subhead">Ranked by overall TekOS Score — specimens (×2) + boss wins (×5) + alpha kills (×10) + trades (×3) + species variety</div>
		<div class="lb-table">
			<div class="lb-head lb-survivors-head">
				<span>#</span><span>Survivor</span><span title="Specimens">Spec</span>
				<span title="Species owned">Species</span><span title="Boss victories">Wins</span>
				<span title="Alpha kills">Alpha</span><span title="Trades completed">Trades</span>
				<span title="Total score">Score</span>
			</div>
			{#each data.players as p}
				{@const pr = p as PlayerRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner lb-survivors-row">
						<span class="lb-rank" style="color:{rankColor(pr.rank)};font-weight:700">{rankLabel(pr.rank)}</span>
						<a href="/survivors/{pr.id}" class="lb-name">{pr.name}</a>
						<span class="lb-val">{pr.specimens}</span>
						<span class="lb-val">{pr.speciesOwned}</span>
						<span class="lb-val">{pr.bossWins > 0 ? pr.bossWins : '—'}</span>
						<span class="lb-val" style="color:{pr.alphaKills > 0 ? '#ef4444' : '#334155'}">{pr.alphaKills > 0 ? pr.alphaKills : '—'}</span>
						<span class="lb-val">{pr.tradesCompleted > 0 ? pr.tradesCompleted : '—'}</span>
						<span class="lb-val lb-score">{pr.score}</span>
					</div>
				</div>
			{/each}
		</div>

	{:else if tab === 'tribes'}
		<div class="lb-table">
			<div class="lb-head lb-tribes-head">
				<span>#</span><span>Tribe</span><span>Members</span><span>Vault</span>
			</div>
			{#each data.tribes as t}
				{@const tr = t as TribeRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner lb-tribes-row">
						<span class="lb-rank" style="color:{rankColor(tr.rank)};font-weight:700">{rankLabel(tr.rank)}</span>
						<span class="lb-name">{tr.name}</span>
						<span class="lb-val"><Users size={11} /> {tr.members}</span>
						<span class="lb-val"><Dna size={11} /> {tr.specimens}</span>
					</div>
				</div>
			{/each}
		</div>

	{:else if tab === 'specimens'}
		<div class="lb-subhead">Scored by Melee + HP/100 + Mutations×10</div>
		<div class="lb-table">
			<div class="lb-head lb-specimens-head">
				<span>#</span><span>Specimen</span><span>Lvl</span><span>Melee</span><span>HP</span><span>Weight</span><span>Muts</span><span>Owner</span>
			</div>
			{#each data.specimens as s}
				{@const sr = s as SpecimenRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner lb-specimens-row">
						<span class="lb-rank" style="color:{rankColor(sr.rank)};font-weight:700">{rankLabel(sr.rank)}</span>
						<div class="lb-specimen-name">
							<span class="lb-name">{sr.species}</span>
							<span class="lb-sub">"{sr.name}"</span>
						</div>
						<span class="lb-val">{sr.level}</span>
						<span class="lb-val" style="color:#fca5a5">{sr.melee}%</span>
						<span class="lb-val">{sr.health.toLocaleString()}</span>
						<span class="lb-val">{sr.weight.toLocaleString()}</span>
						<span class="lb-val" style="color:{sr.muts > 0 ? '#c084fc' : '#334155'}">{sr.muts > 0 ? sr.muts : '—'}</span>
						<a href="/survivors/{sr.ownerId}" class="lb-val lb-owner">{sr.owner}</a>
					</div>
				</div>
			{/each}
		</div>

	{:else}
		<div class="lb-subhead">Survivors with the most boss victories. Alpha kills worth triple.</div>
		{#if (data.bossLegends as BossLegend[]).length === 0}
			<div class="lb-empty">No boss fights recorded yet. Log your first fight from a War Room.</div>
		{:else}
			<div class="lb-table">
				<div class="lb-head lb-legends-head">
					<span>#</span><span>Survivor</span><span>Total Wins</span><span>Alpha Kills</span>
				</div>
				{#each data.bossLegends as b}
					{@const bl = b as BossLegend}
					<div class="cham-shell lb-row" style="--cut:5px">
						<div class="lb-row-inner lb-legends-row">
							<span class="lb-rank" style="color:{rankColor(bl.rank)};font-weight:700">{rankLabel(bl.rank)}</span>
							<a href="/survivors/{bl.id}" class="lb-name">{bl.name}</a>
							<span class="lb-val">{bl.wins} <Sword size={11} /></span>
							<span class="lb-val" style="color:{bl.alphaKills > 0 ? '#ef4444' : '#334155'}">{bl.alphaKills > 0 ? `${bl.alphaKills} ☠` : '—'}</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
.lb-subhead { font-size:0.72rem; color:#475569; margin-bottom:14px; line-height:1.5; }
.lb-empty { color:#475569; padding:40px 0; text-align:center; font-size:0.88rem; }

.lb-table { display:flex; flex-direction:column; gap:4px; max-width:900px; }

.lb-head {
	display:grid; gap:10px; padding:0 14px 8px;
	font-size:0.6rem; font-weight:700; letter-spacing:0.1em;
	text-transform:uppercase; color:#334155;
	border-bottom:1px solid rgba(255,255,255,0.05);
	margin-bottom:4px;
}
.lb-survivors-head  { grid-template-columns:80px 1fr 50px 60px 50px 50px 55px 55px; }
.lb-tribes-head     { grid-template-columns:80px 1fr 100px 80px; }
.lb-specimens-head  { grid-template-columns:80px 1fr 45px 65px 90px 90px 45px 100px; }
.lb-legends-head    { grid-template-columns:80px 1fr 120px 120px; }

.lb-row { }
.lb-row-inner {
	background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1));
	padding:10px 14px; display:grid; gap:10px; align-items:center;
	transition:background .15s;
}
.lb-row:hover .lb-row-inner { background:rgba(14,26,54,0.98); }
.lb-survivors-row  { grid-template-columns:80px 1fr 50px 60px 50px 50px 55px 55px; }
.lb-tribes-row     { grid-template-columns:80px 1fr 100px 80px; }
.lb-specimens-row  { grid-template-columns:80px 1fr 45px 65px 90px 90px 45px 100px; }
.lb-legends-row    { grid-template-columns:80px 1fr 120px 120px; }

.lb-rank { font-size:0.8rem; font-family:inherit; }
.lb-name { font-size:0.88rem; font-weight:600; color:#f1f5f9; text-decoration:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lb-name:hover { color:#00b4ff; }
.lb-sub { font-size:0.7rem; color:#64748b; display:block; font-style:italic; }
.lb-val { font-size:0.82rem; color:#64748b; display:flex; align-items:center; gap:4px; }
.lb-score { color:#7dd3fc; font-weight:700; }
.lb-owner { text-decoration:none; color:#64748b; }
.lb-owner:hover { color:#00b4ff; }
.lb-specimen-name { min-width:0; }
</style>
