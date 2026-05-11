<script lang="ts">
	import { onMount } from 'svelte';
	import { Palette, Check } from 'lucide-svelte';

	const PRESETS = [
		{ id:'tekos',    name:'TekOS Default',    primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' },
		{ id:'crimson',  name:'Wyvern Crimson',   primary:'#ef4444', accent:'#f97316', bg:'#0d0505' },
		{ id:'aberrant', name:'Aberration Void',  primary:'#a855f7', accent:'#06b6d4', bg:'#07040f' },
		{ id:'genesis',  name:'Genesis Neon',     primary:'#10b981', accent:'#3b82f6', bg:'#030d08' },
		{ id:'amber',    name:'Extinction Amber', primary:'#f59e0b', accent:'#ef4444', bg:'#0d0900' },
		{ id:'fjordur',  name:'Fjordur Frost',    primary:'#67e8f9', accent:'#818cf8', bg:'#03080d' },
		{ id:'custom',   name:'Custom',           primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' },
	];

	let activeTheme = $state('tekos');
	let custom      = $state({ primary:'#00b4ff', accent:'#8b5cf6', bg:'#050812' });
	let themeSaving = $state(false);
	let themeSaved  = $state(false);

	onMount(async () => {
		const res = await fetch('/api/settings');
		if (res.ok) {
			const { theme } = await res.json();
			if (theme) {
				activeTheme = theme.id ?? 'tekos';
				if (theme.id === 'custom') custom = { primary:theme.primary, accent:theme.accent, bg:theme.bg };
			}
		}
		applyTheme();
	});

	function currentColors() {
		if (activeTheme === 'custom') return custom;
		return PRESETS.find(p => p.id === activeTheme) ?? PRESETS[0];
	}

	function applyTheme() {
		const c = currentColors();
		const hexToRgb = (h:string) => {
			const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
			return `${r},${g},${b}`;
		};
		const root = document.documentElement;
		root.style.setProperty('--tek-blue', c.primary);
		root.style.setProperty('--tek-blue-dim',    `rgba(${hexToRgb(c.primary)},0.12)`);
		root.style.setProperty('--tek-blue-border', `rgba(${hexToRgb(c.primary)},0.22)`);
		root.style.setProperty('--tek-blue-glow',   `rgba(${hexToRgb(c.primary)},0.35)`);
		if (c.accent) root.style.setProperty('--tek-purple', c.accent);
		if (c.bg)     root.style.setProperty('--tek-bg', c.bg);
	}

	function selectPreset(id:string) {
		activeTheme = id;
		if (id !== 'custom') {
			const p = PRESETS.find(x => x.id === id);
			if (p) custom = { primary:p.primary, accent:p.accent, bg:p.bg };
		}
		applyTheme();
	}

	async function saveTheme() {
		themeSaving = true;
		const c = currentColors();
		await fetch('/api/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ theme:{ id:activeTheme,...c } }) });
		themeSaving = false; themeSaved = true;
		setTimeout(() => themeSaved = false, 2000);
	}
</script>

<div class="std-page" style="max-width:580px">
	<div class="std-page-header">
		<div class="page-title"><h1>Theme</h1><div class="page-subtitle">Pick your colour palette</div></div>
	</div>

	<div class="set-section">
		<div class="set-section-title"><Palette size={14} /> Color Palette</div>
		<div class="theme-grid">
			{#each PRESETS as p}
				<button class="theme-preset" class:active={activeTheme === p.id} onclick={() => selectPreset(p.id)}>
					<div class="theme-swatches">
						<div class="theme-swatch" style="background:{p.primary}"></div>
						<div class="theme-swatch" style="background:{p.accent}"></div>
						<div class="theme-swatch" style="background:{p.bg};border:1px solid rgba(255,255,255,0.1)"></div>
					</div>
					<div class="theme-name">{p.name}</div>
					{#if activeTheme === p.id}<span class="theme-check">✓</span>{/if}
				</button>
			{/each}
		</div>

		{#if activeTheme === 'custom'}
			<div class="custom-pickers">
				<div class="plan-field">
					<label class="form-label" for="cp-primary">Primary</label>
					<div style="display:flex;align-items:center;gap:8px"><input id="cp-primary" type="color" class="fw-color-swatch" bind:value={custom.primary} oninput={applyTheme} /><input class="form-control" bind:value={custom.primary} style="max-width:110px" oninput={applyTheme} /></div>
				</div>
				<div class="plan-field">
					<label class="form-label" for="cp-accent">Accent</label>
					<div style="display:flex;align-items:center;gap:8px"><input id="cp-accent" type="color" class="fw-color-swatch" bind:value={custom.accent} oninput={applyTheme} /><input class="form-control" bind:value={custom.accent} style="max-width:110px" oninput={applyTheme} /></div>
				</div>
				<div class="plan-field">
					<label class="form-label" for="cp-bg">Background</label>
					<div style="display:flex;align-items:center;gap:8px"><input id="cp-bg" type="color" class="fw-color-swatch" bind:value={custom.bg} oninput={applyTheme} /><input class="form-control" bind:value={custom.bg} style="max-width:110px" oninput={applyTheme} /></div>
				</div>
			</div>
		{/if}

		<button class="btn btn-primary" onclick={saveTheme} disabled={themeSaving}>
			{#if themeSaved}<Check size={14} /> Saved!{:else if themeSaving}Saving...{:else}Save Theme{/if}
		</button>

		<div class="set-tip">Account settings (password, delete account) — click your username in the sidebar.</div>
	</div>
</div>

<style>
.set-section { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:20px 22px; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); display:flex; flex-direction:column; gap:16px; }
.set-section-title { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; display:flex; align-items:center; gap:7px; }
.set-tip { font-size:0.74rem; color:#334155; }

.theme-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:7px; }
.theme-preset { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); padding:11px 10px; cursor:pointer; font-family:inherit; display:flex; flex-direction:column; align-items:center; gap:7px; position:relative; transition:all .15s; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); }
.theme-preset:hover { background:rgba(255,255,255,0.07); }
.theme-preset.active { background:rgba(0,180,255,0.08); border-color:rgba(0,180,255,0.35); }
.theme-swatches { display:flex; gap:4px; }
.theme-swatch { width:18px; height:18px; border-radius:50%; }
.theme-name { font-size:0.68rem; color:#94a3b8; font-weight:500; text-align:center; }
.theme-check { position:absolute; top:5px; right:7px; color:#00b4ff; font-size:0.75rem; font-weight:700; }
.custom-pickers { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
.fw-color-swatch { width:34px; height:34px; padding:2px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); cursor:pointer; border-radius:0; flex-shrink:0; }
</style>
