<script lang="ts">
	import { User, Dna, Users, Shield, Edit2, Pin } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const profile  = data.profile as Record<string,unknown> | null;
	const creatures = data.creatures as Record<string,unknown>[];
	const pinned   = data.pinned as Record<string,unknown>[];

	let editOpen   = $state(false);
	let pinOpen    = $state(false);
	let saving     = $state(false);
	let err        = $state('');

	let nickname   = $state(String(profile?.nickname ?? ''));
	let bio        = $state(String(profile?.bio ?? ''));
	let lookingFor = $state(String(profile?.lookingFor ?? ''));
	let pinnedIds  = $state<number[]>(Array.isArray(profile?.pinnedCreatures) ? profile.pinnedCreatures as number[] : []);

	const joined = profile?.createdAt ? new Date(profile.createdAt as string).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '';
	const displayName = (profile?.nickname ?? profile?.email ?? 'Survivor') as string;

	function getCollectorBadges(): string {
		if (typeof window === 'undefined') return '';
		const bs = (window as Record<string,unknown>).BadgeSystem as Record<string,Function> | undefined;
		return bs ? String(bs.generateCollectorBadgeHTML(data.creatures) ?? '') : '';
	}
	const STATS = ['Health','Stamina','Oxygen','Food','Weight','Melee','Crafting'];

	function getCat(sp: string): string {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[sp]?.category ?? 'default');
	}
	const CAT_RGB: Record<string,string> = { combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250' };
	const CAT_LABEL: Record<string,string> = { combat:'CMB',flyer:'FLY',utility:'UTL',water:'AQU',mount:'MNT',boss:'BSS',resource:'RES' };

	async function saveProfile() {
		saving = true; err = '';
		const res = await fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nickname:nickname||null, bio:bio||null, lookingFor:lookingFor||null }) });
		if (res.ok) { editOpen = false; location.reload(); }
		else { err = (await res.json()).error ?? 'Failed'; saving = false; }
	}

	function togglePin(id: number) {
		if (pinnedIds.includes(id)) pinnedIds = pinnedIds.filter(x => x !== id);
		else if (pinnedIds.length < 6) pinnedIds = [...pinnedIds, id];
	}

	async function savePins() {
		saving = true;
		await fetch('/api/profile/pinned', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ids:pinnedIds }) });
		pinOpen = false; saving = false; location.reload();
	}
</script>

<div class="std-page">
	<!-- Hero -->
	<div class="cham-shell dos-hero" style="--cut:12px">
		<div class="dos-hero-inner">
			<div class="dos-avatar"><User size={28} /></div>
			<div class="dos-hero-info">
				<div class="dos-name">{displayName}</div>
				<div class="dos-sub">ARK Survivor · Joined {joined}</div>
				{#if data.tribe}<div class="dos-tribe"><Shield size={12} /> {(data.tribe as Record<string,unknown>).name}</div>{/if}
				{#if profile?.bio}<p class="dos-bio">{String(profile.bio)}</p>{/if}
				{#if profile?.lookingFor}<div class="dos-looking">Looking for: {String(profile.lookingFor)}</div>{/if}
			</div>
			<button class="btn btn-secondary btn-sm dos-edit-btn" onclick={() => editOpen=true}><Edit2 size={13} /> Edit</button>
		</div>
	</div>

	<!-- Stats bar -->
	<div class="dos-stats">
		<div class="cham-shell dos-stat" style="--cut:7px">
			<div class="dos-stat-inner"><Dna size={16} /><span class="dos-stat-val">{creatures.length}</span><span class="dos-stat-lbl">Specimens</span></div>
		</div>
		<div class="cham-shell dos-stat" style="--cut:7px">
			<div class="dos-stat-inner"><Users size={16} /><span class="dos-stat-val">{data.friendCount}</span><span class="dos-stat-lbl">Friends</span></div>
		</div>
		<div class="cham-shell dos-stat" style="--cut:7px">
			<div class="dos-stat-inner"><span class="dos-stat-val">{data.speciesOwned}</span><span class="dos-stat-lbl">Species</span></div>
		</div>
	</div>

	<!-- Achievements / collector badges -->
	{@const collectorHtml = getCollectorBadges()}
	{#if collectorHtml}
		<div class="dos-section-header"><div class="dos-section-title">Achievements</div></div>
		<div class="dos-badges">{@html collectorHtml}</div>
	{/if}

	<!-- Pinned -->
	<div class="dos-section-header">
		<div class="dos-section-title">Pinned Specimens</div>
		<button class="btn btn-secondary btn-sm" onclick={() => { pinnedIds = Array.isArray(profile?.pinnedCreatures) ? profile.pinnedCreatures as number[] : []; pinOpen=true; }}>
			<Pin size={13} /> Edit Pins
		</button>
	</div>

	{#if pinned.length === 0}
		<div class="dos-empty">No pinned specimens. Click "Edit Pins" to feature your best.</div>
	{:else}
		<div class="dos-pinned-grid">
			{#each pinned as c}
				{@const cd = c as Record<string,unknown>}
				{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
				{@const muts = (cd.mutations as Record<string,number>) ?? {}}
				{@const tm = Object.values(muts).reduce((a,b)=>a+b,0)}
				{@const cat = getCat(String(cd.species ?? ''))}
				{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
				<div class="cham-shell dos-pin-card {cat}" style="--cut:8px;--cat-rgb:{rgb}">
					<div class="dos-pin-inner">
						<div class="dos-pin-header">
							<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={10} />{CAT_LABEL[cat]??'GEN'}</div>
							<span class="dos-pin-level">Lvl {Number(cd.level??1)}</span>
						</div>
						<div class="dos-pin-species">{String(cd.species??'?')}</div>
						<div class="dos-pin-name">{String(cd.name??'Unnamed')}</div>
						<div class="dos-pin-stats">
							<span>HP {(bs.Health??0).toLocaleString()}</span>
							<span>Mel {bs.Melee??0}%</span>
							{#if tm > 0}<span class="dos-pin-muts">{tm}m</span>{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Edit profile modal -->
{#if editOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header"><h2 class="modal-title">Edit Profile</h2><button class="close-btn" onclick={() => editOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="e-nick">Callsign</label><input id="e-nick" class="form-control" bind:value={nickname} placeholder="Leave blank to use email" /></div>
			<div class="plan-field"><label class="form-label" for="e-bio">Bio</label><textarea id="e-bio" class="form-control" rows="3" bind:value={bio}></textarea></div>
			<div class="plan-field"><label class="form-label" for="e-lf">Looking For</label><input id="e-lf" class="form-control" bind:value={lookingFor} placeholder="e.g. Mutation breeding partner" /></div>
			{#if err}<div class="tek-login-error">{err}</div>{/if}
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => editOpen=false}>Cancel</button><button class="btn btn-primary" onclick={saveProfile} disabled={saving}>{saving?'Saving...':'Save'}</button></div>
	</div>
</div>
{/if}

<!-- Pin modal -->
{#if pinOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:600px">
		<div class="modal-header"><h2 class="modal-title">Pin Specimens <span style="color:#64748b;font-weight:400;font-size:0.85rem">{pinnedIds.length}/6</span></h2><button class="close-btn" onclick={() => pinOpen=false}>&times;</button></div>
		<div class="modal-body">
			<div class="dos-pin-picker">
				{#each creatures as c}
					{@const cd = c as Record<string,unknown>}
					{@const sel = pinnedIds.includes(cd.id as number)}
					<button class="cham-shell dos-pick-btn" class:selected={sel} onclick={() => togglePin(cd.id as number)} disabled={!sel && pinnedIds.length >= 6} style="--cut:6px">
						<div class="dos-pick-inner">
							<div class="dos-pick-species">{String(cd.species??'?')}</div>
							<div class="dos-pick-name">{String(cd.name??'Unnamed')} · Lvl {Number(cd.level??1)}</div>
							{#if sel}<span class="dos-pick-check">✓</span>{/if}
						</div>
					</button>
				{/each}
			</div>
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => pinOpen=false}>Cancel</button><button class="btn btn-primary" onclick={savePins} disabled={saving}>{saving?'Saving...':'Save Pins'}</button></div>
	</div>
</div>
{/if}

<style>
.dos-hero { --cut:12px; margin-bottom:20px; }
.dos-hero-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:24px; display:flex; align-items:flex-start; gap:18px; position:relative; }
.dos-avatar { width:56px; height:56px; border-radius:50%; background:rgba(0,180,255,0.1); border:1px solid rgba(0,180,255,0.25); display:flex; align-items:center; justify-content:center; color:rgba(0,180,255,0.8); flex-shrink:0; }
.dos-hero-info { flex:1; min-width:0; }
.dos-name { font-size:1.5rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.02em; }
.dos-sub { font-size:0.75rem; color:#64748b; margin-top:3px; }
.dos-tribe { display:flex; align-items:center; gap:5px; font-size:0.78rem; color:#a78bfa; margin-top:6px; }
.dos-bio { font-size:0.86rem; color:#94a3b8; margin-top:8px; line-height:1.6; }
.dos-looking { font-size:0.78rem; color:#60a5fa; margin-top:6px; }
.dos-edit-btn { position:absolute; top:18px; right:18px; display:flex; align-items:center; gap:5px; }

.dos-stats { display:flex; gap:10px; margin-bottom:28px; flex-wrap:wrap; }
.dos-stat { min-width:100px; }
.dos-stat-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 18px; display:flex; flex-direction:column; align-items:center; gap:4px; }
.dos-stat-val { font-size:1.5rem; font-weight:700; color:#f1f5f9; }
.dos-stat-lbl { font-size:0.62rem; color:#475569; text-transform:uppercase; letter-spacing:.06em; }

.dos-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.dos-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; }
.dos-empty { color:#475569; padding:24px 0; font-size:0.88rem; }
.dos-badges { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:24px; }

.dos-pinned-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.dos-pin-card { --cut:8px; }
.dos-pin-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px; display:flex; flex-direction:column; gap:5px; }
.dos-pin-header { display:flex; align-items:center; justify-content:space-between; }
.dos-pin-level { font-size:0.68rem; color:#64748b; }
.dos-pin-species { font-size:0.92rem; font-weight:700; color:#f1f5f9; }
.dos-pin-name { font-size:0.72rem; color:rgb(var(--cat-rgb,0,180,255)); opacity:0.8; font-style:italic; }
.dos-pin-stats { display:flex; gap:10px; font-size:0.72rem; color:#64748b; margin-top:4px; }
.dos-pin-muts { color:#a78bfa; font-weight:600; }

.dos-pin-picker { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; max-height:380px; overflow-y:auto; padding:2px; }
.dos-pick-btn { background:none; border:none; cursor:pointer; text-align:left; width:100%; }
.dos-pick-btn:disabled { opacity:.4; cursor:not-allowed; }
.dos-pick-btn.selected .dos-pick-inner { background:rgba(34,197,94,0.1); border-left-color:rgba(34,197,94,0.5) !important; }
.dos-pick-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px; position:relative; }
.dos-pick-species { font-size:0.85rem; font-weight:600; color:#f1f5f9; }
.dos-pick-name { font-size:0.72rem; color:#64748b; margin-top:2px; }
.dos-pick-check { position:absolute; top:8px; right:10px; color:#4ade80; font-weight:700; font-size:0.9rem; }
</style>
