<script lang="ts">
	import { onMount } from 'svelte';
	import { Palette, Check } from 'lucide-svelte';

	const PRESETS = [
		{ id:'tekos',    name:'TekOS Default',   primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' },
		{ id:'crimson',  name:'Wyvern Crimson',  primary:'#ef4444', accent:'#f97316', bg:'#0d0505' },
		{ id:'aberrant', name:'Aberration Void', primary:'#a855f7', accent:'#06b6d4', bg:'#07040f' },
		{ id:'genesis',  name:'Genesis Neon',    primary:'#10b981', accent:'#3b82f6', bg:'#030d08' },
		{ id:'amber',    name:'Extinction Amber',primary:'#f59e0b', accent:'#ef4444', bg:'#0d0900' },
		{ id:'fjordur',  name:'Fjordur Frost',   primary:'#67e8f9', accent:'#818cf8', bg:'#03080d' },
		{ id:'custom',   name:'Custom',          primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' },
	];

	let active  = $state('tekos');
	let custom  = $state({ primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' });
	let saving  = $state(false);
	let saved   = $state(false);

	onMount(async () => {
		const res = await fetch('/api/settings');
		if (res.ok) {
			const { theme } = await res.json();
			if (theme) {
				active = theme.id ?? 'tekos';
				if (theme.id === 'custom') custom = { primary: theme.primary, accent: theme.accent, bg: theme.bg };
			}
		}
		applyTheme();
	});

	function currentColors() {
		if (active === 'custom') return custom;
		return PRESETS.find(p => p.id === active) ?? PRESETS[0];
	}

	function applyTheme() {
		const c = currentColors();
		document.documentElement.style.setProperty('--tek-blue', c.primary);
		document.documentElement.style.setProperty('--tek-purple', c.accent);
		document.documentElement.style.setProperty('--tek-bg', c.bg);
		// Also update derived vars
		const hexToRgb = (hex: string) => {
			const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
			return `${r},${g},${b}`;
		};
		document.documentElement.style.setProperty('--tek-blue-dim', `rgba(${hexToRgb(c.primary)},0.12)`);
		document.documentElement.style.setProperty('--tek-blue-border', `rgba(${hexToRgb(c.primary)},0.22)`);
		document.documentElement.style.setProperty('--tek-blue-glow', `rgba(${hexToRgb(c.primary)},0.35)`);
	}

	function selectPreset(id: string) {
		active = id;
		if (id !== 'custom') {
			const p = PRESETS.find(x => x.id === id);
			if (p) custom = { primary: p.primary, accent: p.accent, bg: p.bg };
		}
		applyTheme();
	}

	async function save() {
		saving = true;
		const c = currentColors();
		await fetch('/api/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ theme: { id:active, ...c } }) });
		saving = false; saved = true;
		setTimeout(() => saved = false, 2000);
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Settings</h1>
			<div class="page-subtitle">Personalise your TekOS experience</div>
		</div>
	</div>

	<div class="settings-section">
		<div class="settings-section-title"><Palette size={15} /> Color Theme</div>
		<div class="settings-section-desc">Choose a color palette that matches your tribe or personal style. Changes apply instantly.</div>

		<div class="theme-grid">
			{#each PRESETS as p}
				<button class="theme-preset" class:active={active === p.id} onclick={() => selectPreset(p.id)}>
					<div class="theme-swatches">
						<div class="theme-swatch" style="background:{p.primary}"></div>
						<div class="theme-swatch" style="background:{p.accent}"></div>
						<div class="theme-swatch" style="background:{p.bg};border:1px solid rgba(255,255,255,0.1)"></div>
					</div>
					<div class="theme-name">{p.name}</div>
					{#if active === p.id}<Check size={12} class="theme-check" />{/if}
				</button>
			{/each}
		</div>

		{#if active === 'custom'}
			<div class="custom-pickers">
				<div class="plan-field">
					<label class="form-label" for="cp-primary">Primary Color (buttons, accents)</label>
					<div class="color-row">
						<input id="cp-primary" type="color" class="color-input" bind:value={custom.primary} oninput={applyTheme} />
						<input class="form-control" bind:value={custom.primary} placeholder="#00b4ff" oninput={applyTheme} style="max-width:120px" />
					</div>
				</div>
				<div class="plan-field">
					<label class="form-label" for="cp-accent">Accent Color (badges, secondary)</label>
					<div class="color-row">
						<input id="cp-accent" type="color" class="color-input" bind:value={custom.accent} oninput={applyTheme} />
						<input class="form-control" bind:value={custom.accent} placeholder="#8b5cf6" oninput={applyTheme} style="max-width:120px" />
					</div>
				</div>
				<div class="plan-field">
					<label class="form-label" for="cp-bg">Background Tint</label>
					<div class="color-row">
						<input id="cp-bg" type="color" class="color-input" bind:value={custom.bg} oninput={applyTheme} />
						<input class="form-control" bind:value={custom.bg} placeholder="#050812" oninput={applyTheme} style="max-width:120px" />
					</div>
				</div>
			</div>
		{/if}

		<div style="margin-top:20px">
			<button class="btn btn-primary" onclick={save} disabled={saving}>
				{#if saved}<Check size={14} /> Saved!{:else if saving}Saving...{:else}Save Theme{/if}
			</button>
		</div>
	</div>
</div>

<style>
.settings-section { max-width:600px; background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:24px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); margin-bottom:20px; }
.settings-section-title { font-size:0.88rem; font-weight:700; color:#f1f5f9; display:flex; align-items:center; gap:8px; margin-bottom:6px; }
.settings-section-desc { font-size:0.78rem; color:#64748b; margin-bottom:20px; line-height:1.5; }

.theme-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; margin-bottom:20px; }
.theme-preset {
	background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
	padding:12px; cursor:pointer; font-family:inherit;
	display:flex; flex-direction:column; gap:8px; align-items:center;
	position:relative; transition:all .15s;
	clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%);
}
.theme-preset:hover { background:rgba(255,255,255,0.07); }
.theme-preset.active { background:rgba(0,180,255,0.08); border-color:rgba(0,180,255,0.35); }
.theme-swatches { display:flex; gap:4px; }
.theme-swatch { width:20px; height:20px; border-radius:50%; }
.theme-name { font-size:0.72rem; color:#94a3b8; font-weight:500; text-align:center; }
:global(.theme-check) { position:absolute; top:6px; right:8px; color:#00b4ff; }

.custom-pickers { display:flex; flex-direction:column; gap:14px; padding:16px; background:rgba(0,0,0,0.2); clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); margin-bottom:4px; }
.color-row { display:flex; align-items:center; gap:10px; }
.color-input { width:40px; height:34px; padding:2px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); cursor:pointer; border-radius:0; }
</style>
