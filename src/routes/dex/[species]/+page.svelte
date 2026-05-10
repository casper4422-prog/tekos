<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	type SpeciesData = Record<string, unknown>;

	let species = $state<SpeciesData | null>(null);
	let name    = $derived($page.params.species ? decodeURIComponent($page.params.species) : '');

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string, SpeciesData> | undefined;
		species = db?.[name] ?? null;
	});

	const STAT_ICONS: Record<string,string> = { Health:'❤️', Stamina:'⚡', Oxygen:'💧', Food:'🍖', Weight:'🏋️', MeleeDamageMultiplier:'⚔️', SpeedMultiplier:'💨', TorpidityBase:'💤' };
</script>

<div class="std-page">
	<div style="margin-bottom:16px;display:flex;gap:10px;align-items:center">
		<a href="/dex" class="btn btn-secondary btn-sm">← Back to Dex</a>
		<a href="/specimens?species={encodeURIComponent(name)}" class="btn btn-primary btn-sm">+ Add to Vault</a>
	</div>

	{#if !species}
		<div style="color:#64748b;padding:40px 0">Loading...</div>
	{:else}
		{@const s = species}
		<!-- Hero -->
		<div class="sdp-hero">
			<div class="sdp-hero-icon">{String(s.icon ?? '🦖')}</div>
			<div class="sdp-hero-info">
				<h1 class="sdp-name">{name}</h1>
				<div class="sdp-tags">
					{#if s.category}<span class="sdp-tag">{String(s.category)}</span>{/if}
					{#if s.rarity}<span class="sdp-tag rarity">{String(s.rarity)}</span>{/if}
					{#if s.temperament}<span class="sdp-tag">{String(s.temperament)}</span>{/if}
					{#if s.diet}<span class="sdp-tag">{String(s.diet)}</span>{/if}
				</div>
			</div>
		</div>

		<div class="sdp-body">
			<!-- Left column -->
			<div class="sdp-left">
				<!-- Quick facts -->
				<div class="sdp-section">
					<h2 class="sdp-section-title">📋 Info</h2>
					{#if s.habitat}<div class="sdp-row"><span class="sdp-lbl">Habitat</span><span class="sdp-val">{String(s.habitat)}</span></div>{/if}
					{#if s.sizeClass}<div class="sdp-row"><span class="sdp-lbl">Size</span><span class="sdp-val">{String(s.sizeClass)}</span></div>{/if}
					{#if s.source}<div class="sdp-row"><span class="sdp-lbl">Source</span><span class="sdp-val">{String(s.source)}</span></div>{/if}
					{#if s.tamingMethod}<div class="sdp-row"><span class="sdp-lbl">Taming</span><span class="sdp-val">{String(s.tamingMethod)}</span></div>{/if}
					{#if s.preferredKibble}<div class="sdp-row"><span class="sdp-lbl">Kibble</span><span class="sdp-val">{String(s.preferredKibble)}</span></div>{/if}
					{#if s.favoriteFood}<div class="sdp-row"><span class="sdp-lbl">Fav. Food</span><span class="sdp-val">{String(s.favoriteFood)}</span></div>{/if}
					{#if s.saddle !== undefined}<div class="sdp-row"><span class="sdp-lbl">Saddle</span><span class="sdp-val">{s.saddle ? '✓ Yes' : '✗ No'}</span></div>{/if}
				</div>

				<!-- Base stats -->
				{#if s.baseStats}
					<div class="sdp-section">
						<h2 class="sdp-section-title">📊 Base Stats</h2>
						<div class="sdp-stats-grid">
							{#each Object.entries(s.baseStats as Record<string,number>) as [k, v]}
								<div class="sdp-stat">
									<span class="sdp-stat-icon">{STAT_ICONS[k] ?? '📈'}</span>
									<span class="sdp-stat-lbl">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
									<strong class="sdp-stat-val">{v}</strong>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Roles -->
				{#if Array.isArray(s.roles) && (s.roles as unknown[]).length}
					<div class="sdp-section">
						<h2 class="sdp-section-title">🎯 Roles</h2>
						<div class="sdp-tags" style="flex-wrap:wrap">
							{#each s.roles as role}
								<span class="sdp-tag">{String(role)}</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Spawn maps -->
				{#if Array.isArray(s.spawnMaps) && (s.spawnMaps as unknown[]).length}
					<div class="sdp-section">
						<h2 class="sdp-section-title">🗺️ Spawn Maps</h2>
						<div class="sdp-tags">
							{#each s.spawnMaps as m}
								<span class="sdp-tag">{String(m)}</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Right column: dossier -->
			{#if s.dossierText}
				<div class="sdp-right">
					<div class="sdp-section">
						<h2 class="sdp-section-title">📖 Dossier</h2>
						<p class="sdp-dossier">{String(s.dossierText)}</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
.sdp-hero { display:flex; align-items:center; gap:20px; background:var(--tek-card-bg,linear-gradient(160deg,rgba(14,26,54,.88),rgba(5,10,24,.94))); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:16px; padding:28px; margin-bottom:24px; }
.sdp-hero-icon { font-size:4rem; flex-shrink:0; }
.sdp-name { font-size:2rem; font-weight:700; color:#f1f5f9; margin:0 0 10px; }
.sdp-tags { display:flex; gap:6px; flex-wrap:wrap; }
.sdp-tag { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:99px; padding:3px 10px; font-size:0.75rem; color:#94a3b8; text-transform:capitalize; }
.sdp-tag.rarity { color:#a855f7; border-color:rgba(168,85,247,.3); background:rgba(168,85,247,.1); }

.sdp-body { display:grid; grid-template-columns:1fr 1.2fr; gap:20px; }
@media (max-width:700px) { .sdp-body { grid-template-columns:1fr; } }

.sdp-section { background:var(--tek-card-bg,rgba(14,26,54,.7)); border:1px solid var(--tek-border,rgba(255,255,255,.07)); border-radius:12px; padding:18px; margin-bottom:14px; }
.sdp-section-title { font-size:0.85rem; font-weight:600; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; margin:0 0 12px; }

.sdp-row { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,.04); font-size:0.85rem; }
.sdp-row:last-child { border-bottom:none; }
.sdp-lbl { color:#64748b; }
.sdp-val { color:#f1f5f9; text-align:right; }

.sdp-stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
.sdp-stat { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.03); border-radius:8px; padding:8px 10px; }
.sdp-stat-icon { font-size:1rem; }
.sdp-stat-lbl { flex:1; font-size:0.8rem; color:#64748b; }
.sdp-stat-val { font-size:0.9rem; font-weight:700; color:#f1f5f9; }

.sdp-dossier { color:#94a3b8; font-size:0.88rem; line-height:1.7; margin:0; }
</style>
