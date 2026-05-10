<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	const STATS = [
		{ key:'Health',   label:'HP',       pct:false },
		{ key:'Stamina',  label:'Stamina',   pct:false },
		{ key:'Oxygen',   label:'Oxygen',    pct:false },
		{ key:'Food',     label:'Food',      pct:false },
		{ key:'Weight',   label:'Weight',    pct:false },
		{ key:'Melee',    label:'Melee',     pct:true  },
		{ key:'Crafting', label:'Crafting',  pct:true  },
	];

	let saving  = $state(false);
	let error   = $state('');

	let fName        = $state('');
	let fSpecies     = $state($page.url.searchParams.get('species') ?? '');
	let fLevel       = $state(1);
	let fGender      = $state('Male');
	let fServer      = $state('');
	let fNotes       = $state('');
	let fStats       = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });
	let fMuts        = $state<Record<string,number>>({ Health:0, Stamina:0, Oxygen:0, Food:0, Weight:0, Melee:0, Crafting:0 });

	let speciesList = $state<string[]>([]);

	onMount(() => {
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,unknown> | undefined;
		if (db) speciesList = Object.keys(db).sort();
	});

	async function save() {
		if (!fName.trim()) { error = 'Creature name is required.'; return; }
		if (!fSpecies.trim()) { error = 'Species is required.'; return; }
		saving = true; error = '';
		const res = await fetch('/api/creatures', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: fName.trim(), species: fSpecies.trim(), level: fLevel,
				gender: fGender, server: fServer.trim() || undefined,
				notes: fNotes.trim() || undefined,
				baseStats: { ...fStats }, mutations: { ...fMuts }
			})
		});
		if (res.ok) goto('/specimens');
		else { error = (await res.json()).error ?? 'Failed to save'; saving = false; }
	}
</script>

<div class="std-page">
	<div class="form-page-header">
		<a href="/specimens" class="btn btn-secondary btn-sm">← Back</a>
		<div class="page-title">
			<h1>Add Specimen</h1>
			<div class="page-subtitle">Record a new creature to your vault</div>
		</div>
	</div>

	<div class="specimen-form">
		<!-- Identity -->
		<div class="form-section">
			<div class="form-section-title">Identity</div>
			<div class="form-row-2">
				<div class="plan-field">
					<label class="form-label" for="f-species">Species *</label>
					<input id="f-species" class="form-control" type="text" list="species-list" bind:value={fSpecies} placeholder="e.g. Rex" />
					<datalist id="species-list">
						{#each speciesList as s}<option value={s}>{s}</option>{/each}
					</datalist>
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-name">Creature Name *</label>
					<input id="f-name" class="form-control" type="text" bind:value={fName} placeholder="e.g. Prime Breeder" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-level">Level</label>
					<input id="f-level" class="form-control" type="number" bind:value={fLevel} min="1" max="999" />
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-gender">Gender</label>
					<select id="f-gender" class="form-control" bind:value={fGender}>
						<option>Male</option><option>Female</option><option>Unknown</option>
					</select>
				</div>
				<div class="plan-field">
					<label class="form-label" for="f-server">Server</label>
					<input id="f-server" class="form-control" type="text" bind:value={fServer} placeholder="Optional" />
				</div>
			</div>
		</div>

		<!-- Stats -->
		<div class="form-section">
			<div class="form-section-title">Base Stats &amp; Mutations</div>
			<div class="stats-table">
				<div class="stats-table-head">
					<span>Stat</span>
					<span>Base Value</span>
					<span>Mutations</span>
				</div>
				{#each STATS as s}
					<div class="stats-table-row">
						<span class="stats-stat-name">{s.label}{s.pct ? ' (%)' : ''}</span>
						<input class="form-control stats-input" type="number" bind:value={fStats[s.key]} min="0" />
						<input class="form-control stats-input" type="number" bind:value={fMuts[s.key]} min="0" max="20" />
					</div>
				{/each}
			</div>
		</div>

		<!-- Notes + flags -->
		<div class="form-section">
			<div class="form-section-title">Notes</div>
			<div class="plan-field">
				<label class="form-label" for="f-notes">Notes</label>
				<textarea id="f-notes" class="form-control" rows="3" bind:value={fNotes} placeholder="Breeding lines, colours, server location..."></textarea>
			</div>
		</div>

		{#if error}<div class="tek-login-error">{error}</div>{/if}

		<div class="form-actions">
			<a href="/specimens" class="btn btn-secondary">Cancel</a>
			<button class="btn btn-primary" onclick={save} disabled={saving}>
				{saving ? 'Saving...' : 'Save Specimen'}
			</button>
		</div>
	</div>
</div>

<style>
.form-page-header { display:flex; align-items:center; gap:16px; margin-bottom:28px; }
.specimen-form { max-width:680px; display:flex; flex-direction:column; gap:20px; }
.form-section { background:linear-gradient(160deg,rgba(14,26,54,0.9),rgba(5,10,24,0.97)); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:20px 22px; }
.form-section-title { font-size:0.68rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:16px; }
.form-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

.stats-table { display:flex; flex-direction:column; gap:6px; }
.stats-table-head { display:grid; grid-template-columns:1fr 140px 140px; gap:10px; font-size:0.67rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#475569; padding:0 4px 4px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:4px; }
.stats-table-row { display:grid; grid-template-columns:1fr 140px 140px; gap:10px; align-items:center; }
.stats-stat-name { font-size:0.85rem; color:#94a3b8; }
:global(.stats-input) { padding:6px 10px !important; font-size:0.88rem !important; }

.flags-row { display:flex; gap:24px; flex-wrap:wrap; }
.flag-check { display:flex; align-items:center; gap:8px; font-size:0.88rem; color:#94a3b8; cursor:pointer; }

.form-actions { display:flex; gap:10px; justify-content:flex-end; padding-top:4px; }
</style>
