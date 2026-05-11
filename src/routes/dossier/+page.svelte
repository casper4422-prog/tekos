<script lang="ts">
	import { User, Dna, Users, Shield, Pin, Edit2, Sword, Repeat2, ChevronRight, Star } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const profile      = data.profile as Record<string,unknown> | null;
	const creatures    = data.creatures as Record<string,unknown>[];
	const pinned       = data.pinned as Record<string,unknown>[];
	const tribe        = data.tribe as Record<string,unknown> | null;
	const bossRecords  = data.bossRecords as Record<string,unknown>[];
	const recentTrades = data.recentTrades as Record<string,unknown>[];
	const topSpecies   = data.topSpecies as [string,number][];

	let editOpen  = $state(false);
	let pinOpen   = $state(false);
	let saving    = $state(false);
	let err       = $state('');
	let isGuest   = $state(false);

	// Guest local profile (stored in localStorage)
	let guestName  = $state('Survivor');
	let guestBio   = $state('');
	let guestCreatures = $state<Record<string,unknown>[]>([]);

	import { onMount } from 'svelte';
	onMount(() => {
		isGuest = localStorage.getItem('tekos_guest') === '1';
		if (isGuest) {
			guestName = localStorage.getItem('tekos_guest_name') ?? 'Survivor';
			guestBio  = localStorage.getItem('tekos_guest_bio') ?? '';
			const saved = localStorage.getItem('tekos_specimens');
			if (saved) { try { guestCreatures = JSON.parse(saved); } catch {} }
		}
	});

	function saveGuestProfile() {
		localStorage.setItem('tekos_guest_name', guestName);
		localStorage.setItem('tekos_guest_bio', guestBio);
		editOpen = false;
	}

	let nickname   = $state(String(profile?.nickname ?? ''));
	let bio        = $state(String(profile?.bio ?? ''));
	let lookingFor = $state(String(profile?.lookingFor ?? ''));
	let pinnedIds  = $state<number[]>(Array.isArray(profile?.pinnedCreatures) ? profile.pinnedCreatures as number[] : []);

	const joined      = profile?.createdAt ? new Date(profile.createdAt as string).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }) : '';
	const displayName = (profile?.nickname ?? profile?.email ?? 'Survivor') as string;
	const wins        = bossRecords.filter((r:Record<string,unknown>) => r.outcome === 'success').length;
	const totalMuts   = creatures.reduce((sum:number, c:Record<string,unknown>) => {
		const m = (c.mutations as Record<string,number>) ?? {};
		return sum + Object.values(m).reduce((a,b) => a+b, 0);
	}, 0);

	const CAT_RGB:   Record<string,string> = { combat:'239,68,68', flyer:'6,182,212', utility:'34,197,94', water:'59,130,246', boss:'245,158,11', mount:'249,115,22', resource:'167,139,250', transport:'59,130,246', harvesting:'245,158,11' };
	const CAT_LABEL: Record<string,string> = { combat:'CMB', flyer:'FLY', utility:'UTL', water:'AQU', boss:'BSS', transport:'MNT', harvesting:'HRV' };

	function getCat(sp: string) {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[sp]?.category ?? 'default');
	}


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

<div class="std-page dos-page">

	{#if isGuest}
		<!-- â”€â”€ Guest Mode Dossier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
		<div class="dos-guest-banner">
			Guest Mode â€” your data is saved locally on this device only.
			<a href="/login" onclick={() => localStorage.removeItem('tekos_guest')}>Sign in</a> to sync across devices and unlock all features.
		</div>

		<div class="dos-sheet-header">
			<div class="dos-avatar-col"><div class="dos-avatar"><User size={32} /></div></div>
			<div class="dos-identity">
				<div class="dos-callsign">{guestName || 'Survivor'}</div>
				<div class="dos-joined">Local Guest Profile</div>
				{#if guestBio}<p class="dos-bio-text" style="margin-top:8px;font-size:0.86rem;color:#94a3b8">"{guestBio}"</p>{/if}
			</div>
			<div class="dos-header-actions">
				<button class="btn btn-secondary" onclick={() => editOpen=true}><Edit2 size={13} /> Edit</button>
			</div>
		</div>

		<div class="dos-stats-row">
			<div class="cham-shell dos-stat-tile" style="--cut:7px">
				<div class="dos-stat-inner"><Dna size={15} class="dos-stat-icon" /><div class="dos-stat-val">{guestCreatures.length}</div><div class="dos-stat-lbl">Specimens</div></div>
			</div>
		</div>

		<div class="dos-section-row">
			<div class="dos-section-label"><a href="/specimens" style="color:inherit;text-decoration:none">â†’ Go to Specimens to manage your local vault</a></div>
		</div>

	{:else}
	<!-- â”€â”€ Character sheet header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	<div class="dos-sheet-header">
		<div class="dos-avatar-col">
			<div class="dos-avatar"><User size={32} /></div>
			<div class="dos-online-pip" title="Online"></div>
		</div>

		<div class="dos-identity">
			<div class="dos-callsign">{displayName}</div>
			{#if profile?.nickname && profile?.email}<div class="dos-email">{String(profile.email)}</div>{/if}
			{#if tribe}
				<div class="dos-tribe-line"><Shield size={13} /> {String(tribe.name)}{tribe.mainMap ? ` â€” ${String(tribe.mainMap)}` : ''}</div>
			{/if}
			{#if profile?.discordName}
				<div class="dos-discord-line">Discord: {String(profile.discordName)}</div>
			{/if}
			<div class="dos-joined">Survivor since {joined}</div>
		</div>

		<div class="dos-header-actions">
			<button class="btn btn-secondary" onclick={() => editOpen=true}><Edit2 size={13} /> Edit</button>
		</div>
	</div>

	<!-- â”€â”€ Bio + Looking For â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	{#if profile?.bio || profile?.lookingFor}
		<div class="dos-bio-row">
			{#if profile?.bio}<div class="dos-bio-text">"{String(profile.bio)}"</div>{/if}
			{#if profile?.lookingFor}<div class="dos-lf">Looking for: <span>{String(profile.lookingFor)}</span></div>{/if}
		</div>
	{/if}

	<!-- â”€â”€ Stat tiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	<div class="dos-stats-row">
		<div class="cham-shell dos-stat-tile" style="--cut:7px">
			<div class="dos-stat-inner"><Dna size={15} class="dos-stat-icon" /><div class="dos-stat-val">{creatures.length}</div><div class="dos-stat-lbl">Specimens</div></div>
		</div>
		<div class="cham-shell dos-stat-tile" style="--cut:7px">
			<div class="dos-stat-inner"><span class="dos-stat-icon" style="font-size:0.9rem">ðŸ¦•</span><div class="dos-stat-val">{data.speciesOwned}</div><div class="dos-stat-lbl">Species</div></div>
		</div>
		<div class="cham-shell dos-stat-tile" style="--cut:7px">
			<div class="dos-stat-inner"><Users size={15} class="dos-stat-icon" /><div class="dos-stat-val">{data.friendCount}</div><div class="dos-stat-lbl">Friends</div></div>
		</div>
		<div class="cham-shell dos-stat-tile" style="--cut:7px">
			<div class="dos-stat-inner"><Sword size={15} class="dos-stat-icon" /><div class="dos-stat-val">{wins}</div><div class="dos-stat-lbl">Boss Wins</div></div>
		</div>
		<div class="cham-shell dos-stat-tile" style="--cut:7px">
			<div class="dos-stat-inner"><Star size={15} class="dos-stat-icon" /><div class="dos-stat-val">{totalMuts}</div><div class="dos-stat-lbl">Total Muts</div></div>
		</div>
		{#if recentTrades.length > 0}
			<div class="cham-shell dos-stat-tile" style="--cut:7px">
				<div class="dos-stat-inner"><Repeat2 size={15} class="dos-stat-icon" /><div class="dos-stat-val">{recentTrades.length}</div><div class="dos-stat-lbl">Listings</div></div>
			</div>
		{/if}
	</div>

	<!-- â”€â”€ Achievements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->

	<!-- â”€â”€ Main two-column body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
	<div class="dos-body">

		<!-- Left: Pinned + Species -->
		<div class="dos-left-col">
			<div class="dos-section-row">
				<div class="dos-section-label"><Pin size={13} /> Pinned Specimens</div>
				<button class="btn btn-ghost btn-sm" onclick={() => { pinnedIds = Array.isArray(profile?.pinnedCreatures) ? profile.pinnedCreatures as number[] : []; pinOpen=true; }}>Edit</button>
			</div>

			{#if pinned.length === 0}
				<div class="dos-empty">No pinned specimens â€” click Edit to feature up to 6.</div>
			{:else}
				<div class="dos-pinned-grid">
					{#each pinned as c}
						{@const cd = c as Record<string,unknown>}
						{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
						{@const muts = (cd.mutations as Record<string,number>) ?? {}}
						{@const tm = Object.values(muts).reduce((a,b)=>a+b,0)}
						{@const cat = getCat(String(cd.species ?? ''))}
						{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
						<div class="cham-shell dos-pin-card {cat}" style="--cut:7px;--cat-rgb:{rgb}">
							<div class="dos-pin-inner">
								<div class="dos-pin-top">
									<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={9} />{CAT_LABEL[cat]??'GEN'}</div>
									<span class="dos-pin-lvl">Lvl {Number(cd.level??1)}</span>
								</div>
								<div class="dos-pin-species">{String(cd.species??'?')}</div>
								<div class="dos-pin-name">{String(cd.name??'Unnamed')}</div>
								<div class="dos-pin-stats">
									<span>HP {(bs.Health??0).toLocaleString()}</span>
									<span>Mel {bs.Melee??0}</span>
									{#if tm > 0}<span class="dos-pin-muts">{tm}m</span>{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if topSpecies.length > 0}
				<div class="dos-section-row" style="margin-top:20px">
					<div class="dos-section-label">Species Vault</div>
					<span class="dos-section-sub">{data.speciesOwned} species</span>
				</div>
				<div class="dos-species-bars">
					{#each topSpecies as [sp, count]}
						{@const cat = getCat(sp)}
						{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
						{@const maxCount = topSpecies[0][1]}
						<div class="dos-sp-row">
							<div class="dos-sp-name">{sp}</div>
							<div class="dos-sp-bar-wrap">
								<div class="dos-sp-bar" style="width:{Math.round((count/maxCount)*100)}%;background:rgba({rgb},0.6)"></div>
							</div>
							<div class="dos-sp-count">{count}</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right: Boss history + Trades -->
		<div class="dos-right-col">
			{#if bossRecords.length > 0}
				<div class="dos-section-row">
					<div class="dos-section-label"><Sword size={13} /> Boss Fights</div>
					<a href="/overseer" class="btn btn-ghost btn-sm">Overseer <ChevronRight size={11} /></a>
				</div>
				<div class="dos-boss-list">
					{#each bossRecords as r}
						{@const rd = r as Record<string,unknown>}
						{@const win = rd.outcome === 'success'}
						<div class="cham-shell dos-boss-row" style="--cut:5px;--cat-rgb:{win?'34,197,94':'239,68,68'}">
							<div class="dos-boss-inner">
								<div class="dos-boss-outcome-dot" class:win></div>
								<div class="dos-boss-info">
									<div class="dos-boss-name">{String(rd.bossName)}</div>
									<div class="dos-boss-meta">{String(rd.difficulty??'').toUpperCase()}</div>
								</div>
								<span class="dos-boss-result" class:win>{win?'Victory':'Defeat'}</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="dos-section-row">
					<div class="dos-section-label"><Sword size={13} /> Boss Fights</div>
				</div>
				<div class="dos-empty">No boss fights recorded yet. Log them from a War Room.</div>
			{/if}

			{#if recentTrades.length > 0}
				<div class="dos-section-row" style="margin-top:20px">
					<div class="dos-section-label"><Repeat2 size={13} /> Active Listings</div>
					<a href="/marketplace" class="btn btn-ghost btn-sm">View <ChevronRight size={11} /></a>
				</div>
				<div class="dos-trade-list">
					{#each recentTrades as t}
						{@const td = t as Record<string,unknown>}
						{@const cd = (td.creatureData??{}) as Record<string,unknown>}
						<div class="cham-shell dos-trade-row" style="--cut:5px">
							<div class="dos-trade-inner">
								<div class="dos-trade-info">
									<div class="dos-trade-species">{String(cd.species??'?')} â€” {String(cd.name??'Unnamed')}</div>
									<div class="dos-trade-meta">{String(td.status)} Â· {(td.offerCount as number)??0} offer{(td.offerCount as number)!==1?'s':''}{td.wanted ? ` Â· Wants: ${td.wanted}` : ''}</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
	{/if}<!-- end of authenticated/guest split -->
</div>

<!-- Edit modal â€” works for both guest and authenticated -->
{#if editOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header"><h2 class="modal-title">Edit Profile</h2><button class="close-btn" onclick={() => editOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			{#if isGuest}
				<div class="plan-field"><label class="form-label" for="e-gname">Callsign</label><input id="e-gname" class="form-control" bind:value={guestName} placeholder="What should survivors call you?" /></div>
				<div class="plan-field"><label class="form-label" for="e-gbio">Bio</label><textarea id="e-gbio" class="form-control" rows="3" bind:value={guestBio} placeholder="Tell survivors about yourself..."></textarea></div>
				<div class="tek-login-error" style="background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.3);color:#fbbf24">Guest profile is stored locally on this device only.</div>
			{:else}
				<div class="plan-field"><label class="form-label" for="e-nick">Callsign</label><input id="e-nick" class="form-control" bind:value={nickname} placeholder="Leave blank to use email" /></div>
				<div class="plan-field"><label class="form-label" for="e-bio">Bio</label><textarea id="e-bio" class="form-control" rows="3" bind:value={bio}></textarea></div>
				<div class="plan-field"><label class="form-label" for="e-lf">Looking For</label><input id="e-lf" class="form-control" bind:value={lookingFor} placeholder="e.g. Mutation breeding partner, boss tribe..." /></div>
				{#if err}<div class="tek-login-error">{err}</div>{/if}
			{/if}
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => editOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={isGuest ? saveGuestProfile : saveProfile} disabled={saving}>{saving?'Saving...':'Save'}</button>
		</div>
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
							<div class="dos-pick-name">{String(cd.name??'Unnamed')} Â· Lvl {Number(cd.level??1)}</div>
							{#if sel}<span class="dos-pick-check">âœ“</span>{/if}
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
.dos-page { max-width:900px; }
.dos-guest-banner { background:rgba(245,158,11,0.07); border-left:2px solid #f59e0b; padding:10px 14px; font-size:0.78rem; color:#fbbf24; margin-bottom:16px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.dos-guest-banner a { color:#fcd34d; font-weight:600; }

/* â”€â”€ Character sheet header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.dos-sheet-header {
	display:flex; align-items:flex-start; gap:20px;
	background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1));
	padding:24px; margin-bottom:16px;
	clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%);
	border-left:3px solid rgba(0,180,255,0.5);
	position:relative;
}
.dos-avatar-col { position:relative; flex-shrink:0; }
.dos-avatar {
	width:64px; height:64px; border-radius:50%;
	background:rgba(0,180,255,0.08); border:1px solid rgba(0,180,255,0.2);
	display:flex; align-items:center; justify-content:center;
	color:rgba(0,180,255,0.7);
}
.dos-online-pip {
	position:absolute; bottom:2px; right:2px;
	width:12px; height:12px; border-radius:50%;
	background:#4ade80; border:2px solid #050812;
	box-shadow:0 0 6px rgba(74,222,128,0.6);
}
.dos-identity { flex:1; min-width:0; }
.dos-callsign { font-size:1.7rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.03em; line-height:1; margin-bottom:6px; }
.dos-email { font-size:0.74rem; color:#334155; margin-bottom:4px; }
.dos-tribe-line { display:flex; align-items:center; gap:6px; font-size:0.8rem; color:#a78bfa; margin-bottom:4px; }
.dos-discord-line { font-size:0.74rem; color:#5865f2; margin-bottom:4px; }
.dos-joined { font-size:0.7rem; color:#334155; letter-spacing:0.02em; }
.dos-header-actions { flex-shrink:0; }
.dos-header-actions .btn { display:flex; align-items:center; gap:5px; }

/* Bio strip */
.dos-bio-row { background:rgba(255,255,255,0.02); border-left:2px solid rgba(255,255,255,0.06); padding:10px 16px; margin-bottom:16px; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.dos-bio-text { font-size:0.86rem; color:#94a3b8; font-style:italic; line-height:1.55; }
.dos-lf { font-size:0.78rem; color:#64748b; margin-top:4px; }
.dos-lf span { color:#60a5fa; }

/* Stat tiles */
.dos-stats-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.dos-stat-tile { flex:1; min-width:80px; }
.dos-stat-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 10px; display:flex; flex-direction:column; align-items:center; gap:3px; }
:global(.dos-stat-icon) { color:#475569; }
.dos-stat-val { font-size:1.4rem; font-weight:800; color:#f1f5f9; line-height:1; }
.dos-stat-lbl { font-size:0.58rem; color:#475569; text-transform:uppercase; letter-spacing:.07em; }

/* Section label */
.dos-section-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.dos-section-label { font-size:0.62rem; font-weight:700; letter-spacing:0.13em; text-transform:uppercase; color:#334155; display:flex; align-items:center; gap:6px; }
.dos-section-sub { font-size:0.68rem; color:#334155; }
.dos-empty { color:#334155; font-size:0.82rem; padding:12px 0; }
.dos-badges { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px; }

/* Two-column body */
.dos-body { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
@media (max-width:640px) { .dos-body { grid-template-columns:1fr; } }

/* Pinned grid */
.dos-pinned-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
.dos-pin-card { --cut:7px; }
.dos-pin-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 13px; display:flex; flex-direction:column; gap:4px; }
.dos-pin-top { display:flex; align-items:center; justify-content:space-between; }
.dos-pin-lvl { font-size:0.64rem; color:#475569; }
.dos-pin-species { font-size:0.88rem; font-weight:700; color:#f1f5f9; }
.dos-pin-name { font-size:0.7rem; color:rgb(var(--cat-rgb,0,180,255)); opacity:0.8; font-style:italic; }
.dos-pin-stats { display:flex; gap:8px; font-size:0.68rem; color:#64748b; margin-top:2px; }
.dos-pin-muts { color:#a78bfa; font-weight:600; }

/* Species bars */
.dos-species-bars { display:flex; flex-direction:column; gap:5px; }
.dos-sp-row { display:grid; grid-template-columns:110px 1fr 28px; gap:8px; align-items:center; }
.dos-sp-name { font-size:0.76rem; color:#94a3b8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dos-sp-bar-wrap { height:4px; background:rgba(255,255,255,0.04); border-radius:0; overflow:hidden; }
.dos-sp-bar { height:100%; border-radius:0; transition:width .3s; }
.dos-sp-count { font-size:0.7rem; color:#475569; text-align:right; }

/* Boss history */
.dos-boss-list { display:flex; flex-direction:column; gap:4px; }
.dos-boss-row { }
.dos-boss-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; display:flex; align-items:center; gap:10px; }
.dos-boss-outcome-dot { width:7px; height:7px; border-radius:50%; background:#ef4444; flex-shrink:0; }
.dos-boss-outcome-dot.win { background:#4ade80; box-shadow:0 0 5px rgba(74,222,128,0.5); }
.dos-boss-info { flex:1; }
.dos-boss-name { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.dos-boss-meta { font-size:0.66rem; color:#475569; margin-top:1px; }
.dos-boss-result { font-size:0.68rem; font-weight:700; color:#ef4444; }
.dos-boss-result.win { color:#4ade80; }

/* Trades */
.dos-trade-list { display:flex; flex-direction:column; gap:4px; }
.dos-trade-row { }
.dos-trade-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; }
.dos-trade-species { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.dos-trade-meta { font-size:0.7rem; color:#64748b; margin-top:2px; }

/* Pin picker */
.dos-pin-picker { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; max-height:380px; overflow-y:auto; padding:2px; }
.dos-pick-btn { background:none; border:none; cursor:pointer; text-align:left; width:100%; }
.dos-pick-btn:disabled { opacity:.4; cursor:not-allowed; }
.dos-pick-btn.selected .dos-pick-inner { background:rgba(34,197,94,0.08); }
.dos-pick-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px; position:relative; }
.dos-pick-species { font-size:0.85rem; font-weight:600; color:#f1f5f9; }
.dos-pick-name { font-size:0.72rem; color:#64748b; margin-top:2px; }
.dos-pick-check { position:absolute; top:8px; right:10px; color:#4ade80; font-weight:700; }
</style>

