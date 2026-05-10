<script lang="ts">
	import { Trophy } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type PlayerRow    = { rank:number; id:number; name:string; specimens:number; friends:number };
	type TribeRow     = { rank:number; id:number; name:string; members:number; specimens:number };
	type SpecimenRow  = { rank:number; id:number; name:string; species:string; level:number; melee:number; health:number; muts:number; owner:string };

	let tab = $state<'players'|'tribes'|'specimens'>('players');
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title"><h1>Rankings</h1><div class="page-subtitle">Leaderboards</div></div>
	</div>

	<div class="lb-tabs">
		{#each [['players','Survivors'],['tribes','Tribes'],['specimens','Specimens']] as [t,label]}
			<button class="lb-tab" class:active={tab===t} onclick={() => tab = t as 'players'|'tribes'|'specimens'}>{label}</button>
		{/each}
	</div>

	{#if tab === 'players'}
		<div class="lb-table">
			<div class="lb-head"><span>#</span><span>Survivor</span><span>Specimens</span><span>Friends</span></div>
			{#each data.players as r}
				{@const p = r as PlayerRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner">
						<span class="lb-rank" class:gold={p.rank===1} class:silver={p.rank===2} class:bronze={p.rank===3}>{p.rank}</span>
						<span class="lb-name">{p.name}</span>
						<span class="lb-val">{p.specimens}</span>
						<span class="lb-val">{p.friends}</span>
					</div>
				</div>
			{/each}
		</div>

	{:else if tab === 'tribes'}
		<div class="lb-table">
			<div class="lb-head"><span>#</span><span>Tribe</span><span>Members</span><span>Specimens</span></div>
			{#each data.tribes as r}
				{@const t = r as TribeRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner">
						<span class="lb-rank" class:gold={t.rank===1} class:silver={t.rank===2} class:bronze={t.rank===3}>{t.rank}</span>
						<span class="lb-name">{t.name}</span>
						<span class="lb-val">{t.members}</span>
						<span class="lb-val">{t.specimens}</span>
					</div>
				</div>
			{/each}
		</div>

	{:else}
		<div class="lb-table">
			<div class="lb-head"><span>#</span><span>Specimen</span><span>Melee</span><span>HP</span><span>Muts</span><span>Owner</span></div>
			{#each data.specimens as r}
				{@const s = r as SpecimenRow}
				<div class="cham-shell lb-row" style="--cut:5px">
					<div class="lb-row-inner">
						<span class="lb-rank" class:gold={s.rank===1} class:silver={s.rank===2} class:bronze={s.rank===3}>{s.rank}</span>
						<span class="lb-name">{s.species} — {s.name}</span>
						<span class="lb-val">{s.melee}%</span>
						<span class="lb-val">{s.health.toLocaleString()}</span>
						<span class="lb-val">{s.muts}</span>
						<span class="lb-val lb-owner">{s.owner}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.lb-tabs { display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); }
.lb-tab { background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-size:0.82rem; font-weight:500; padding:8px 14px; cursor:pointer; margin-bottom:-1px; font-family:inherit; }
.lb-tab.active { color:#f1f5f9; border-bottom-color:#00b4ff; }

.lb-table { display:flex; flex-direction:column; gap:4px; max-width:800px; }
.lb-head { display:grid; grid-template-columns:40px 1fr repeat(3,80px); gap:12px; padding:0 14px 8px; font-size:0.62rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#334155; }
.lb-row { }
.lb-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; display:grid; grid-template-columns:40px 1fr repeat(3,80px); gap:12px; align-items:center; }
.lb-rank { font-size:0.9rem; font-weight:700; color:#64748b; text-align:center; }
.lb-rank.gold   { color:#f59e0b; text-shadow:0 0 8px rgba(245,158,11,0.5); }
.lb-rank.silver { color:#94a3b8; }
.lb-rank.bronze { color:#f97316; }
.lb-name { font-size:0.88rem; font-weight:600; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lb-val  { font-size:0.82rem; color:#64748b; text-align:right; }
.lb-owner { color:#475569; font-size:0.75rem; }
</style>
