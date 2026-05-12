<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Plus, Heart, ArrowLeft } from 'lucide-svelte';

	type SpeciesData = Record<string, unknown>;

	let species  = $state<SpeciesData | null>(null);
	let name     = $derived($page.params.species ? decodeURIComponent($page.params.species) : '');
	let wlAdded  = $state(false);
	let wlSaving = $state(false);

	onMount(() => {
		const db = window.EXPANDED_SPECIES_DATABASE as Record<string, SpeciesData> | undefined;
		species = db?.[name] ?? null;
	});

	async function addToWishlist() {
		wlSaving = true;
		const res = await fetch('/api/wishlists', {
			method:'POST', headers:{'Content-Type':'application/json'},
			body:JSON.stringify({ species: name })
		});
		if (res.ok || res.status === 409) wlAdded = true;
		wlSaving = false;
	}

	const STAT_ICONS: Record<string,string> = { Health:'❤️', Stamina:'⚡', Oxygen:'💧', Food:'🍖', Weight:'🏋️', MeleeDamageMultiplier:'⚔️', SpeedMultiplier:'💨', TorpidityBase:'💤' };
</script>

<div class="tek-stage">
	<PageHeader
		title={name}
		crumbs={[
			{ label: 'Dashboard', href: '/dossier' },
			{ label: 'Dex', href: '/dex' },
			{ label: name }
		]}
	/>

	<!-- Action bar -->
	<div class="sdp-action-bar">
		<a href="/dex" class="tek-btn-v2 ghost sm">
			<ArrowLeft size={12} strokeWidth={2.5} /> Back to Dex
		</a>
		<div class="sdp-action-btns">
			<a href="/specimens/add?species={encodeURIComponent(name)}" class="tek-btn-v2 solid">
				<Plus size={13} strokeWidth={2.5} /> Add to Vault
			</a>
			<button class="tek-btn-v2 sdp-wish-btn" onclick={addToWishlist} disabled={wlAdded || wlSaving}>
				<Heart size={12} strokeWidth={2.5} />
				{wlAdded ? 'On Wishlist' : (wlSaving ? 'Adding…' : 'Wishlist')}
			</button>
		</div>
	</div>

	{#if !species}
		<div style="color:#64748b;padding:40px 0">Loading...</div>
	{:else}
		{@const s = species}
		{@const CAT_LABEL: Record<string,string> = {combat:'CMB',flyer:'FLY',utility:'UTL',water:'AQU',mount:'MNT',boss:'BSS',resource:'RES',transport:'CMP',harvesting:'HRV'}}
		{@const CAT_COLOR: Record<string,string> = {combat:'#ef4444',flyer:'#06b6d4',utility:'#22c55e',water:'#3b82f6',boss:'#f59e0b',mount:'#f97316',resource:'#a78bfa',transport:'#22c55e',harvesting:'#f59e0b'}}
		{@const cat = String(s.category ?? '')}
		{@const accentColor = CAT_COLOR[cat] ?? '#00b4ff'}

		<!-- Hero -->
		<div class="sdp-hero" style="border-left-color:{accentColor}">
			<div class="sdp-hero-info">
				<div class="sdp-hero-top">
					{#if cat && CAT_LABEL[cat]}
						<span class="sdp-cat-badge" style="color:{accentColor};border-color:color-mix(in srgb,{accentColor} 40%,transparent);background:color-mix(in srgb,{accentColor} 10%,transparent)">{CAT_LABEL[cat]}</span>
					{/if}
					{#if s.rarity}<span class="sdp-tag rarity">{String(s.rarity)}</span>{/if}
				</div>
				<h1 class="sdp-name">{name}</h1>
				<div class="sdp-tags">
					{#if s.diet}<span class="sdp-tag" style="color:{accentColor};opacity:0.85">{String(s.diet)}</span>{/if}
					{#if s.temperament}<span class="sdp-tag">{String(s.temperament)}</span>{/if}
					{#if s.habitat}<span class="sdp-tag">{String(s.habitat)}</span>{/if}
				</div>
			</div>
		</div>

		<div class="sdp-body">
			<!-- Left column -->
			<div class="sdp-left">
				<div class="sdp-section">
					<h2 class="sdp-section-title">Info</h2>
					{#if s.habitat}<div class="sdp-row"><span class="sdp-lbl">Habitat</span><span class="sdp-val">{String(s.habitat)}</span></div>{/if}
					{#if s.sizeClass}<div class="sdp-row"><span class="sdp-lbl">Size</span><span class="sdp-val">{String(s.sizeClass)}</span></div>{/if}
					{#if s.source}<div class="sdp-row"><span class="sdp-lbl">Source</span><span class="sdp-val">{String(s.source)}</span></div>{/if}
					{#if s.tamingMethod}<div class="sdp-row"><span class="sdp-lbl">Taming</span><span class="sdp-val">{String(s.tamingMethod)}</span></div>{/if}
					{#if s.preferredKibble}<div class="sdp-row"><span class="sdp-lbl">Kibble</span><span class="sdp-val">{String(s.preferredKibble)}</span></div>{/if}
					{#if s.favoriteFood}<div class="sdp-row"><span class="sdp-lbl">Fav. Food</span><span class="sdp-val">{String(s.favoriteFood)}</span></div>{/if}
					{#if s.saddle !== undefined}<div class="sdp-row"><span class="sdp-lbl">Saddle</span><span class="sdp-val">{s.saddle ? '✓ Yes' : '✗ No'}</span></div>{/if}
				</div>

				{#if s.baseStats}
					<div class="sdp-section">
						<h2 class="sdp-section-title">Base Stats</h2>
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

				{#if Array.isArray(s.roles) && (s.roles as unknown[]).length}
					<div class="sdp-section">
						<h2 class="sdp-section-title">Roles</h2>
						<div class="sdp-tags">{#each s.roles as role}<span class="sdp-tag">{String(role)}</span>{/each}</div>
					</div>
				{/if}

				{#if Array.isArray(s.spawnMaps) && (s.spawnMaps as unknown[]).length}
					<div class="sdp-section">
						<h2 class="sdp-section-title">Spawn Maps</h2>
						<div class="sdp-tags">{#each s.spawnMaps as m}<span class="sdp-tag">{String(m)}</span>{/each}</div>
					</div>
				{/if}
			</div>

			{#if s.dossierText}
				<div class="sdp-right">
					<div class="sdp-section">
						<h2 class="sdp-section-title">Dossier</h2>
						<p class="sdp-dossier">{String(s.dossierText)}</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
/* Action bar */
.sdp-action-bar { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px; }
.sdp-action-btns { display:flex; gap:8px; align-items:center; }
.sdp-vault-btn { font-size:0.9rem !important; padding:10px 22px !important; font-weight:700 !important; letter-spacing:0.02em; }
.sdp-wish-btn { font-size:0.84rem !important; }

/* Hero */
.sdp-hero {
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
	border: 1px solid rgba(0,180,255,0.18);
	border-left: 3px solid;
	clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
	padding: 24px 26px 22px;
	margin-bottom: 22px;
}
.sdp-hero-top { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.sdp-cat-badge { font-size:0.62rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase; padding:3px 8px; border-radius:4px; border:1px solid; }
.sdp-name {
	font-family: var(--tek-display);
	font-size: clamp(1.6rem, 4vw, 2.4rem);
	font-weight: 900;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
	-webkit-background-clip: text; background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
	margin: 0 0 12px;
	line-height: 1.05;
}
.sdp-tags { display:flex; gap:6px; flex-wrap:wrap; }
.sdp-tag { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1); border-radius:99px; padding:3px 10px; font-size:0.75rem; color:#94a3b8; text-transform:capitalize; }
.sdp-tag.rarity { color:#a855f7; border-color:rgba(168,85,247,.3); background:rgba(168,85,247,.1); }

.sdp-body { display:grid; grid-template-columns:1fr 1.2fr; gap:20px; }
@media (max-width:700px) { .sdp-body { grid-template-columns:1fr; } }

.sdp-section {
	position: relative;
	background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
	border: 1px solid rgba(0,180,255,0.15);
	clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
	padding: 16px 18px;
	margin-bottom: 12px;
}
.sdp-section::before {
	content: '';
	position: absolute;
	left: 0; top: 10px; bottom: 0;
	width: 2px;
	background: var(--tek-blue);
	box-shadow: 0 0 5px var(--tek-blue-glow);
}
.sdp-section-title {
	font-family: var(--tek-display);
	font-size: 0.84rem;
	font-weight: 700;
	letter-spacing: 0.14em;
	color: var(--tek-text);
	text-transform: uppercase;
	margin: 0 0 12px;
}
.sdp-section-title::before { content: '▸ '; color: var(--tek-blue); }
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
