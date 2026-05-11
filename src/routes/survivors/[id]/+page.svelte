<script lang="ts">
	import { User, Dna, Users, Shield, MessageSquare, UserPlus, Wifi, WifiOff } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const p         = data.profile as Record<string,unknown>;
	const creatures = data.creatures as Record<string,unknown>[];
	const pinned    = data.pinned as Record<string,unknown>[];
	const tribe     = data.tribe as Record<string,unknown> | null;
	const friendship = data.friendship as Record<string,unknown> | null;

	const displayName = (p.nickname ?? p.email ?? 'Survivor') as string;
	const joined = p.createdAt ? new Date(p.createdAt as string).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : '';

	const CAT_RGB:   Record<string,string> = { combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250' };
	const CAT_LABEL: Record<string,string> = { combat:'CMB',flyer:'FLY',utility:'UTL',water:'AQU',mount:'MNT',boss:'BSS',resource:'RES' };

	function getCat(sp: string): string {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[sp]?.category ?? 'default');
	}

	let sending  = $state(false);
	let rating   = $state<{ average:number|null; count:number } | null>(null);

	import { onMount } from 'svelte';
	onMount(async () => {
		const res = await fetch(`/api/ratings?userId=${p.id}`);
		if (res.ok) { const d = await res.json(); rating = { average: d.average, count: d.count }; }
	});

	async function sendRequest() {
		sending = true;
		await fetch('/api/friends', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ friendUserId: p.id }) });
		location.reload();
	}
</script>

<div class="std-page">
	<div style="margin-bottom:16px">
		<button class="btn btn-secondary btn-sm" onclick={() => history.back()}>← Back</button>
	</div>

	<!-- Hero -->
	<div class="cham-shell sur-hero" style="--cut:12px">
		<div class="sur-hero-inner">
			<div class="sur-avatar" class:online={data.isOnline}>
				<User size={28} />
				<div class="sur-online-dot" title={data.isOnline ? 'Online' : 'Offline'}>
					{#if data.isOnline}<Wifi size={9} />{:else}<WifiOff size={9} />{/if}
				</div>
			</div>
			<div class="sur-info">
				<div class="sur-name">{displayName}</div>
				<div class="sur-sub">ARK Survivor · Joined {joined}</div>
				{#if tribe}<div class="sur-tribe"><Shield size={12} /> {tribe.name}</div>{/if}
				{#if p.discordName}<div class="sur-discord">Discord: {String(p.discordName)}</div>{/if}
				{#if p.bio}<p class="sur-bio">{String(p.bio)}</p>{/if}
				{#if p.lookingFor}<div class="sur-looking">Looking for: {String(p.lookingFor)}</div>{/if}
			</div>
			{#if !data.isSelf}
				<div class="sur-actions">
					<a href="/messages/{p.id}" class="btn btn-secondary"><MessageSquare size={13} /> Message</a>
					{#if !friendship}
						<button class="btn btn-primary" onclick={sendRequest} disabled={sending}>
							<UserPlus size={13} /> {sending ? 'Sending...' : 'Add Friend'}
						</button>
					{:else if (friendship.status as string) === 'accepted'}
						<span class="sur-friend-tag">Connected</span>
					{:else}
						<span class="sur-friend-tag pending">Request Pending</span>
					{/if}
				</div>
			{:else}
				<a href="/dossier" class="btn btn-secondary">Edit Profile</a>
			{/if}
		</div>
	</div>

	<!-- Trade rating -->
	{#if rating && rating.count > 0}
		<div class="sur-rating">
			<span class="sur-rating-stars">{'★'.repeat(Math.round(rating.average ?? 0))}{'☆'.repeat(5 - Math.round(rating.average ?? 0))}</span>
			<span class="sur-rating-val">{rating.average?.toFixed(1)} / 5</span>
			<span class="sur-rating-count">({rating.count} trade rating{rating.count !== 1 ? 's' : ''})</span>
		</div>
	{/if}

	<!-- Stats -->
	<div class="sur-stats">
		<div class="cham-shell sur-stat" style="--cut:7px">
			<div class="sur-stat-inner"><Dna size={14} /><span class="sur-stat-val">{creatures.length}</span><span class="sur-stat-lbl">Specimens</span></div>
		</div>
		<div class="cham-shell sur-stat" style="--cut:7px">
			<div class="sur-stat-inner"><Users size={14} /><span class="sur-stat-val">{data.friendCount}</span><span class="sur-stat-lbl">Friends</span></div>
		</div>
		<div class="cham-shell sur-stat" style="--cut:7px">
			<div class="sur-stat-inner"><span class="sur-stat-val">{data.speciesOwned}</span><span class="sur-stat-lbl">Species</span></div>
		</div>
	</div>

	<!-- Pinned specimens -->
	{#if pinned.length > 0}
		<div class="sur-section-title">Pinned Specimens</div>
		<div class="sur-pinned-grid">
			{#each pinned as c}
				{@const cd = c as Record<string,unknown>}
				{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
				{@const muts = (cd.mutations as Record<string,number>) ?? {}}
				{@const tm = Object.values(muts).reduce((a,b)=>a+b,0)}
				{@const cat = getCat(String(cd.species ?? ''))}
				{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
				<div class="cham-shell sur-pin-card {cat}" style="--cut:8px;--cat-rgb:{rgb}">
					<div class="sur-pin-inner">
						<div class="sur-pin-head">
							<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={10} />{CAT_LABEL[cat]??'GEN'}</div>
							<span class="sur-pin-lvl">Lvl {Number(cd.level??1)}</span>
						</div>
						<div class="sur-pin-species">{String(cd.species??'?')}</div>
						<div class="sur-pin-name">{String(cd.name??'Unnamed')}</div>
						<div class="sur-pin-stats">
							<span>HP {(bs.Health??0).toLocaleString()}</span>
							<span>Mel {bs.Melee??0}%</span>
							{#if tm > 0}<span class="sur-pin-muts">{tm}m</span>{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- All specimens preview -->
	{#if creatures.length > 0}
		<div class="sur-section-title" style="margin-top:24px">All Specimens ({creatures.length})</div>
		<div class="sur-creature-list">
			{#each creatures.slice(0, 20) as c}
				{@const cd = c as Record<string,unknown>}
				{@const bs = (cd.baseStats as Record<string,number>) ?? {}}
				{@const cat = getCat(String(cd.species ?? ''))}
				{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
				<div class="cham-shell sur-creature-row {cat}" style="--cut:5px;--cat-rgb:{rgb}">
					<div class="sur-creature-inner">
						<div class="cat-badge-v3" style="--cat-rgb:{rgb};font-size:0.52rem;padding:2px 5px"><CategoryIcon category={cat} size={9} />{CAT_LABEL[cat]??'GEN'}</div>
						<div class="sur-cr-name">{String(cd.species??'?')} — {String(cd.name??'Unnamed')}</div>
						<div class="sur-cr-meta">Lvl {Number(cd.level??1)} · {String(cd.gender??'?')}</div>
						<div class="sur-cr-stats">
							<span>HP {(bs.Health??0).toLocaleString()}</span>
							<span>Mel {bs.Melee??0}%</span>
						</div>
					</div>
				</div>
			{/each}
			{#if creatures.length > 20}
				<div class="sur-more">+{creatures.length - 20} more specimens</div>
			{/if}
		</div>
	{/if}
</div>

<style>
.sur-hero { --cut:12px; margin-bottom:20px; }
.sur-hero-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:24px; display:flex; align-items:flex-start; gap:18px; flex-wrap:wrap; }
.sur-avatar { width:56px; height:56px; border-radius:50%; background:rgba(0,180,255,0.1); border:1px solid rgba(0,180,255,0.2); display:flex; align-items:center; justify-content:center; color:rgba(0,180,255,0.7); flex-shrink:0; position:relative; }
.sur-avatar.online { background:rgba(34,197,94,0.1); border-color:rgba(34,197,94,0.3); color:rgba(34,197,94,0.8); }
.sur-online-dot { position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; border-radius:50%; background:#0d1424; display:flex; align-items:center; justify-content:center; color:#64748b; border:1px solid rgba(255,255,255,0.08); }
.sur-avatar.online .sur-online-dot { color:#4ade80; }
.sur-info { flex:1; min-width:200px; }
.sur-name { font-size:1.5rem; font-weight:700; color:#f1f5f9; letter-spacing:-0.02em; }
.sur-sub { font-size:0.75rem; color:#64748b; margin-top:3px; }
.sur-tribe { display:flex; align-items:center; gap:5px; font-size:0.78rem; color:#a78bfa; margin-top:5px; }
.sur-discord { font-size:0.75rem; color:#5865f2; margin-top:4px; }
.sur-bio { font-size:0.86rem; color:#94a3b8; margin-top:8px; line-height:1.6; }
.sur-looking { font-size:0.78rem; color:#60a5fa; margin-top:6px; }
.sur-actions { display:flex; flex-direction:column; gap:6px; flex-shrink:0; align-items:flex-end; }
.sur-actions .btn { display:flex; align-items:center; gap:5px; }
.sur-friend-tag { font-size:0.7rem; font-weight:600; padding:4px 10px; border-radius:3px; background:rgba(34,197,94,0.1); color:#4ade80; border:1px solid rgba(34,197,94,0.25); }
.sur-friend-tag.pending { background:rgba(245,158,11,0.1); color:#fbbf24; border-color:rgba(245,158,11,0.25); }

.sur-stats { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; }
.sur-stat { min-width:90px; }
.sur-stat-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 16px; display:flex; flex-direction:column; align-items:center; gap:4px; }
.sur-stat-val { font-size:1.3rem; font-weight:700; color:#f1f5f9; }
.sur-stat-lbl { font-size:0.6rem; color:#475569; text-transform:uppercase; letter-spacing:.06em; }

.sur-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:12px; }
.sur-pinned-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-bottom:8px; }
.sur-pin-card { --cut:8px; }
.sur-pin-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:13px; display:flex; flex-direction:column; gap:4px; }
.sur-pin-head { display:flex; align-items:center; justify-content:space-between; }
.sur-pin-lvl { font-size:0.66rem; color:#64748b; }
.sur-pin-species { font-size:0.9rem; font-weight:700; color:#f1f5f9; }
.sur-pin-name { font-size:0.72rem; color:rgb(var(--cat-rgb,0,180,255)); opacity:0.8; font-style:italic; }
.sur-pin-stats { display:flex; gap:10px; font-size:0.7rem; color:#64748b; margin-top:3px; }
.sur-pin-muts { color:#a78bfa; font-weight:600; }

.sur-creature-list { display:flex; flex-direction:column; gap:4px; }
.sur-creature-row { }
.sur-creature-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:9px 13px; display:flex; align-items:center; gap:10px; }
.sur-cr-name { flex:1; font-size:0.86rem; font-weight:600; color:#f1f5f9; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sur-cr-meta { font-size:0.7rem; color:#64748b; white-space:nowrap; }
.sur-cr-stats { display:flex; gap:8px; font-size:0.7rem; color:#475569; white-space:nowrap; }
.sur-more { text-align:center; color:#334155; font-size:0.78rem; padding:10px; }
.sur-rating { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
.sur-rating-stars { color:#f59e0b; font-size:1rem; letter-spacing:1px; }
.sur-rating-val { font-size:0.86rem; font-weight:600; color:#f1f5f9; }
.sur-rating-count { font-size:0.74rem; color:#64748b; }
</style>
