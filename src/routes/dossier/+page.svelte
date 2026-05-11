<script lang="ts">
	import { User, Dna, Users, Shield, Edit2, Sword, Repeat2, ChevronRight, Star } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const profile      = data.profile as Record<string,unknown> | null;
	const creatures    = data.creatures as Record<string,unknown>[];
	const tribe        = data.tribe as Record<string,unknown> | null;
	const bossRecords  = data.bossRecords as Record<string,unknown>[];
	const recentTrades = data.recentTrades as Record<string,unknown>[];

	let isGuest  = $state(false);
	let editOpen = $state(false);
	let saving   = $state(false);
	let err      = $state('');

	// Guest state
	let guestName      = $state('Survivor');
	let guestBio       = $state('');
	let guestCreatures = $state<Record<string,unknown>[]>([]);

	// Authenticated edit fields
	let nickname   = $state(String(profile?.nickname ?? ''));
	let bio        = $state(String(profile?.bio ?? ''));
	let lookingFor = $state(String(profile?.lookingFor ?? ''));

	const joined      = profile?.createdAt ? new Date(profile.createdAt as string).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '';
	const displayName = (profile?.nickname ?? profile?.email ?? 'Survivor') as string;

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

	async function saveProfile() {
		saving = true; err = '';
		const res = await fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ nickname:nickname||null, bio:bio||null, lookingFor:lookingFor||null }) });
		if (res.ok) { editOpen = false; location.reload(); }
		else { err = (await res.json()).error ?? 'Failed'; saving = false; }
	}
</script>

<div class="std-page dos-page">

	{#if isGuest}
		<div class="dos-guest-banner">
			Guest Mode — data saved locally only.
			<a href="/login" onclick={() => localStorage.removeItem('tekos_guest')}>Sign in</a> for full access.
		</div>
		<div class="dos-sheet-header">
			<div class="dos-avatar"><User size={30} /></div>
			<div class="dos-identity">
				<div class="dos-callsign">{guestName || 'Survivor'}</div>
				<div class="dos-joined">Local Guest Profile</div>
				{#if guestBio}<div class="dos-bio">"{guestBio}"</div>{/if}
			</div>
			<button class="btn btn-secondary btn-sm" onclick={() => editOpen=true}><Edit2 size={13} /> Edit</button>
		</div>
		<div class="dos-stats-row">
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><Dna size={14} /><div class="dos-stat-val">{guestCreatures.length}</div><div class="dos-stat-lbl">Specimens</div></div>
			</div>
		</div>
		<div style="color:#475569;font-size:0.86rem"><a href="/specimens" style="color:#7dd3fc">Open Specimens</a> to manage your local vault.</div>

	{:else}
		<!-- Hero -->
		<div class="dos-sheet-header">
			<div class="dos-avatar-wrap">
				<div class="dos-avatar"><User size={30} /></div>
				<div class="dos-online-pip"></div>
			</div>
			<div class="dos-identity">
				<div class="dos-callsign">{displayName}</div>
				{#if profile?.nickname && profile?.email}<div class="dos-email-line">{String(profile.email)}</div>{/if}
				{#if tribe}<div class="dos-tribe-line"><Shield size={12} /> {String(tribe.name)}{tribe.mainMap ? ' — ' + String(tribe.mainMap) : ''}</div>{/if}
				{#if profile?.discordName}<div class="dos-discord-line">Discord: {String(profile.discordName)}</div>{/if}
				<div class="dos-joined">Survivor since {joined}</div>
				{#if profile?.bio}<div class="dos-bio">"{String(profile.bio)}"</div>{/if}
				{#if profile?.lookingFor}<div class="dos-looking">Looking for: {String(profile.lookingFor)}</div>{/if}
			</div>
			<a href="/account" class="btn btn-secondary btn-sm"><Edit2 size={13} /> Edit</a>
		</div>

		<!-- Stats -->
		<div class="dos-stats-row">
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><Dna size={14} /><div class="dos-stat-val">{creatures.length}</div><div class="dos-stat-lbl">Specimens</div></div>
			</div>
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><span class="dos-stat-icon-text">Spc</span><div class="dos-stat-val">{data.speciesOwned}</div><div class="dos-stat-lbl">Species</div></div>
			</div>
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><Users size={14} /><div class="dos-stat-val">{data.friendCount}</div><div class="dos-stat-lbl">Friends</div></div>
			</div>
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><Sword size={14} /><div class="dos-stat-val">{data.bossWins}</div><div class="dos-stat-lbl">Boss Wins</div></div>
			</div>
			<div class="cham-shell dos-stat" style="--cut:7px">
				<div class="dos-stat-inner"><Star size={14} /><div class="dos-stat-val">{data.totalMuts}</div><div class="dos-stat-lbl">Total Muts</div></div>
			</div>
		</div>

		<!-- Two-column body -->
		<div class="dos-body">
			<!-- Boss history -->
			<div>
				<div class="dos-section-row">
					<div class="dos-section-lbl"><Sword size={12} /> Boss Fights</div>
					<a href="/overseer" class="btn btn-ghost btn-sm">Overseer <ChevronRight size={11} /></a>
				</div>
				{#if bossRecords.length === 0}
					<div class="dos-empty">No boss fights yet. Log them from a War Room.</div>
				{:else}
					<div class="dos-boss-list">
						{#each bossRecords as r}
							{@const rd = r as Record<string,unknown>}
							{@const win = rd.outcome === 'success'}
							<div class="cham-shell dos-boss-row" style="--cut:5px">
								<div class="dos-boss-inner">
									<div class="dos-boss-dot" class:win></div>
									<div class="dos-boss-info">
										<div class="dos-boss-name">{String(rd.bossName)}</div>
										<div class="dos-boss-meta">{String(rd.difficulty ?? '').toUpperCase()}</div>
									</div>
									<span class="dos-boss-result" class:win>{win ? 'Victory' : 'Defeat'}</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Recent listings -->
			<div>
				<div class="dos-section-row">
					<div class="dos-section-lbl"><Repeat2 size={12} /> Active Listings</div>
					<a href="/marketplace" class="btn btn-ghost btn-sm">View <ChevronRight size={11} /></a>
				</div>
				{#if recentTrades.length === 0}
					<div class="dos-empty">No active listings.</div>
				{:else}
					<div class="dos-trade-list">
						{#each recentTrades as t}
							{@const td = t as Record<string,unknown>}
							{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
							<div class="cham-shell dos-trade-row" style="--cut:5px">
								<div class="dos-trade-inner">
									<div class="dos-trade-species">{String(cd.species ?? '?')} — {String(cd.name ?? 'Unnamed')}</div>
									<div class="dos-trade-meta">{String(td.status)} · {(td.offerCount as number) ?? 0} offer{(td.offerCount as number) !== 1 ? 's' : ''}{td.wanted ? ' · Wants: ' + td.wanted : ''}</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Edit modal for guests -->
{#if editOpen && isGuest}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:420px">
		<div class="modal-header"><h2 class="modal-title">Edit Profile</h2><button class="close-btn" onclick={() => editOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="g-name">Callsign</label><input id="g-name" class="form-control" bind:value={guestName} /></div>
			<div class="plan-field"><label class="form-label" for="g-bio">Bio</label><textarea id="g-bio" class="form-control" rows="2" bind:value={guestBio}></textarea></div>
			<div style="font-size:0.75rem;color:#64748b">Guest profile is stored locally only.</div>
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => editOpen=false}>Cancel</button><button class="btn btn-primary" onclick={saveGuestProfile}>Save</button></div>
	</div>
</div>
{/if}

<style>
.dos-page { max-width:760px; display:flex; flex-direction:column; gap:16px; }

.dos-guest-banner { background:rgba(245,158,11,0.07); border-left:2px solid #f59e0b; padding:8px 12px; font-size:0.78rem; color:#fbbf24; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.dos-guest-banner a { color:#fcd34d; }

/* Header */
.dos-sheet-header { display:flex; align-items:flex-start; gap:18px; background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:22px 24px; clip-path:polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%); border-left:3px solid rgba(0,180,255,0.5); flex-wrap:wrap; }
.dos-avatar-wrap { position:relative; flex-shrink:0; }
.dos-avatar { width:56px; height:56px; border-radius:50%; background:rgba(0,180,255,0.09); border:1px solid rgba(0,180,255,0.22); display:flex; align-items:center; justify-content:center; color:rgba(0,180,255,0.75); }
.dos-online-pip { position:absolute; bottom:2px; right:2px; width:11px; height:11px; border-radius:50%; background:#4ade80; border:2px solid #050812; box-shadow:0 0 5px rgba(74,222,128,0.55); }
.dos-identity { flex:1; min-width:160px; }
.dos-callsign { font-size:1.6rem; font-weight:800; color:#f1f5f9; letter-spacing:-0.03em; line-height:1; margin-bottom:6px; }
.dos-email-line { font-size:0.72rem; color:#334155; margin-bottom:3px; }
.dos-tribe-line { display:flex; align-items:center; gap:5px; font-size:0.78rem; color:#a78bfa; margin-bottom:3px; }
.dos-discord-line { font-size:0.72rem; color:#5865f2; margin-bottom:3px; }
.dos-joined { font-size:0.68rem; color:#334155; letter-spacing:0.03em; margin-bottom:6px; }
.dos-bio { font-size:0.84rem; color:#94a3b8; font-style:italic; line-height:1.55; margin-top:4px; }
.dos-looking { font-size:0.76rem; color:#60a5fa; margin-top:4px; }

/* Stats */
.dos-stats-row { display:flex; gap:8px; flex-wrap:wrap; }
.dos-stat { flex:1; min-width:80px; }
.dos-stat-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:11px 10px; display:flex; flex-direction:column; align-items:center; gap:3px; }
:global(.dos-stat-inner svg) { color:#475569; }
.dos-stat-icon-text { font-size:0.65rem; font-weight:700; letter-spacing:0.08em; color:#475569; text-transform:uppercase; }
.dos-stat-val { font-size:1.4rem; font-weight:800; color:#f1f5f9; line-height:1; }
.dos-stat-lbl { font-size:0.58rem; color:#475569; text-transform:uppercase; letter-spacing:.07em; }

/* Two-column body */
.dos-body { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:580px) { .dos-body { grid-template-columns:1fr; } }
.dos-section-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.dos-section-lbl { font-size:0.62rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#334155; display:flex; align-items:center; gap:6px; }
.dos-empty { font-size:0.82rem; color:#334155; padding:8px 0; }

/* Boss */
.dos-boss-list { display:flex; flex-direction:column; gap:4px; }
.dos-boss-row { }
.dos-boss-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:8px 12px; display:flex; align-items:center; gap:9px; }
.dos-boss-dot { width:7px; height:7px; border-radius:50%; background:#ef4444; flex-shrink:0; }
.dos-boss-dot.win { background:#4ade80; box-shadow:0 0 4px rgba(74,222,128,0.5); }
.dos-boss-info { flex:1; }
.dos-boss-name { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.dos-boss-meta { font-size:0.65rem; color:#475569; margin-top:1px; }
.dos-boss-result { font-size:0.67rem; font-weight:700; color:#ef4444; flex-shrink:0; }
.dos-boss-result.win { color:#4ade80; }

/* Trades */
.dos-trade-list { display:flex; flex-direction:column; gap:4px; }
.dos-trade-row { }
.dos-trade-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:8px 12px; }
.dos-trade-species { font-size:0.84rem; font-weight:600; color:#f1f5f9; }
.dos-trade-meta { font-size:0.7rem; color:#64748b; margin-top:2px; }
</style>
