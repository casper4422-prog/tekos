<script lang="ts">
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import { Share2, User, ExternalLink } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const c     = data.creature as Record<string,unknown>;
	const owner = data.owner as { id:number; nickname:string|null; email:string };
	const bs    = (c.baseStats  as Record<string,number>) ?? {};
	const muts  = (c.mutations  as Record<string,number>) ?? {};
	const tm    = Object.values(muts).reduce((a,b) => a+b, 0);

	const CAT_RGB:   Record<string,string> = { combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250',transport:'59,130,246',harvesting:'245,158,11' };
	const CAT_LABEL: Record<string,string> = { combat:'CMB',flyer:'FLY',utility:'UTL',water:'AQU',boss:'BSS',transport:'MNT',harvesting:'HRV' };

	const STATS = [
		{ key:'Health',   label:'HP'      },
		{ key:'Stamina',  label:'Stamina' },
		{ key:'Oxygen',   label:'Oxygen'  },
		{ key:'Food',     label:'Food'    },
		{ key:'Weight',   label:'Weight'  },
		{ key:'Melee',    label:'Melee'   },
		{ key:'Crafting', label:'Crafting'},
	];

	function getCat() {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[String(c.species ?? '')]?.category ?? 'default');
	}

	function getBadges(): string {
		if (typeof window === 'undefined') return '';
		const bs = (window as Record<string,unknown>).BadgeSystem as Record<string,Function> | undefined;
		return bs ? String(bs.generateBadgeDetailHTML(c) ?? '') : '';
	}

	let copied = $state(false);
	async function share() {
		await navigator.clipboard.writeText(window.location.href);
		copied = true; setTimeout(() => copied = false, 2000);
	}

	const cat = getCat();
	const rgb = CAT_RGB[cat] ?? '0,180,255';
	const code = CAT_LABEL[cat] ?? 'GEN';
</script>

<svelte:head>
	<title>{String(c.species ?? 'Specimen')} — {String(c.name ?? 'Unnamed')} · TekOS</title>
</svelte:head>

<div class="std-page sp-page">
	<div class="sp-back-row">
		<button class="btn btn-secondary btn-sm" onclick={() => history.back()}>← Back</button>
		<button class="btn btn-secondary btn-sm" onclick={share}><Share2 size={13} /> {copied ? 'Link copied!' : 'Share'}</button>
	</div>

	<!-- Hero card -->
	<div class="cham-shell sp-hero" style="--cat-rgb:{rgb}">
		<div class="sp-hero-inner">
			<div class="sp-hero-top">
				<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={12} />{code}</div>
				<div class="sp-flags">
					{#if tm > 0}<span class="sp-flag-chip">{tm} Mutation{tm !== 1 ? 's' : ''}</span>{/if}
					<span class="sp-flag-chip">{String(c.gender ?? 'Unknown')}</span>
				</div>
			</div>
			<div class="sp-species">{String(c.species ?? 'Unknown')}</div>
			<div class="sp-name">"{String(c.name ?? 'Unnamed')}"</div>
			<div class="sp-level">Level {Number(c.level ?? 1)}</div>
		</div>
	</div>

	<!-- Stats grid -->
	<div class="sp-section-title">Base Stats</div>
	<div class="sp-stats-grid">
		{#each STATS as s}
			<div class="cham-shell sp-stat" style="--cut:6px">
				<div class="sp-stat-inner">
					<div class="sp-stat-lbl">{s.label}</div>
					<div class="sp-stat-val">{(bs[s.key] ?? 0).toLocaleString()}</div>
					{#if (muts[s.key] ?? 0) > 0}
						<div class="sp-stat-mut">+{muts[s.key]} mut</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Notes -->
	{#if c.notes}
		<div class="sp-section-title">Notes</div>
		<div class="sp-notes">{String(c.notes)}</div>
	{/if}

	<!-- Server -->
	{#if c.server}
		<div class="sp-server">Server: {String(c.server)}</div>
	{/if}

	<!-- Badges -->
	{#if getBadges()}
		<div class="sp-section-title">Badges</div>
		<div class="sp-badges">{@html getBadges()}</div>
	{/if}

	<!-- Owner -->
	<div class="sp-section-title">Owner</div>
	<a href="/survivors/{owner.id}" class="cham-shell sp-owner" style="--cut:7px">
		<div class="sp-owner-inner">
			<User size={16} />
			<div>
				<div class="sp-owner-name">{owner.nickname ?? owner.email}</div>
				<div class="sp-owner-sub">View profile →</div>
			</div>
		</div>
	</a>
</div>

<style>
.sp-page { max-width:600px; }
.sp-back-row { display:flex; justify-content:space-between; margin-bottom:16px; }
.sp-back-row .btn { display:flex; align-items:center; gap:6px; }

.sp-hero { margin-bottom:20px; }
.sp-hero-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:22px; }
.sp-hero-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.sp-flags { display:flex; gap:6px; }
.sp-flag-chip { font-size:0.7rem; background:rgba(var(--cat-rgb,0,180,255),0.1); border:1px solid rgba(var(--cat-rgb,0,180,255),0.3); color:rgb(var(--cat-rgb,0,180,255)); padding:2px 8px; clip-path:polygon(3px 0%,100% 0%,calc(100% - 3px) 100%,0% 100%); }
.sp-species { font-size:2rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.03em; line-height:1; }
.sp-name { font-size:1rem; color:rgb(var(--cat-rgb,0,180,255)); opacity:0.8; margin-top:4px; font-style:italic; }
.sp-level { font-size:0.78rem; color:#64748b; margin-top:6px; letter-spacing:0.04em; text-transform:uppercase; font-weight:600; }

.sp-section-title { font-size:0.62rem; font-weight:700; letter-spacing:0.14em; text-transform:uppercase; color:#334155; margin:20px 0 10px; }

.sp-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:8px; }
.sp-stat { }
.sp-stat-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px; text-align:center; }
.sp-stat-lbl { font-size:0.62rem; color:#475569; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
.sp-stat-val { font-size:1rem; font-weight:700; color:#f1f5f9; }
.sp-stat-mut { font-size:0.64rem; color:#a78bfa; margin-top:2px; }

.sp-notes { background:rgba(255,255,255,0.03); padding:12px 14px; font-size:0.86rem; color:#94a3b8; line-height:1.6; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); }
.sp-server { font-size:0.75rem; color:#475569; margin-top:8px; }
.sp-badges { display:flex; flex-direction:column; gap:6px; }

.sp-owner { display:block; text-decoration:none; color:inherit; margin-top:4px; }
.sp-owner-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; align-items:center; gap:12px; color:#7dd3fc; }
.sp-owner-name { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.sp-owner-sub { font-size:0.72rem; color:#64748b; margin-top:2px; }
</style>
