<script lang="ts">
	import { Repeat2, Plus, X, Check, Search, Star, BookMarked } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Trade    = Record<string,unknown>;
	type Creature = Record<string,unknown> & { id:number };
	type Wishlist = Record<string,unknown>;

	let tab        = $state<'browse'|'mine'|'offers'|'wishlist'>('browse');
	let trades     = $state<Trade[]>(data.trades as Trade[]);
	let myTrades   = $state<Trade[]>(data.myTrades as Trade[]);
	let offers     = $state<Trade[]>(data.offers as Trade[]);
	let myCreatures = data.myCreatures as Creature[];
	let wishlist   = $state<Wishlist[]>(data.wishlist as Wishlist[]);
	let networkWl  = $state<Wishlist[]>(data.networkWishlists as Wishlist[]);

	let listOpen   = $state(false);
	let offerOpen  = $state<Trade|null>(null);
	let ratingOpen = $state<{tradeId:number; userId:number; name:string}|null>(null);
	let wlOpen     = $state(false);
	let saving     = $state(false);

	let browseSearch = $state('');
	let browseFilter = $state<string>('all');

	// List form
	let lCreatureId = $state<number|null>(null);
	let lWanted     = $state('');
	let lPrice      = $state('');

	// Offer form
	let oCreatureId = $state<number|null>(null);
	let oMessage    = $state('');

	// Rating form
	let ratingVal     = $state(5);
	let ratingComment = $state('');

	// Wishlist form
	let wlSpecies = $state('');
	let wlNotes   = $state('');
	let speciesList = $state<string[]>([]);

	import { onMount } from 'svelte';
	onMount(() => {
		const db = window.EXPANDED_SPECIES_DATABASE;
		if (db) speciesList = Object.keys(db).sort();
	});

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.email ?? 'Unknown') as string; }
	function creatureName(c: Creature) { return `${String((c as Record<string,unknown>).species ?? '?')} â€” ${String((c as Record<string,unknown>).name ?? 'Unnamed')} (Lvl ${Number((c as Record<string,unknown>).level ?? 1)})`; }
	function getCategory(speciesName: string) {
		const db = window.EXPANDED_SPECIES_DATABASE;
		return String(db?.[speciesName]?.category ?? 'default');
	}

	const CAT_RGB: Record<string,string> = { combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250' };
	const CAT_LABEL: Record<string,string> = { combat:'CMB',flyer:'FLY',utility:'UTL',water:'AQU',mount:'MNT',boss:'BSS',resource:'RES' };
	const CATEGORIES = ['all','combat','flyer','utility','water','mount','boss','resource'];

	function getFiltered() {
		let list = trades;
		if (browseSearch) {
			const q = browseSearch.toLowerCase();
			list = list.filter(t => {
				const cd = (t.creatureData ?? {}) as Record<string,unknown>;
				return String(cd.species ?? '').toLowerCase().includes(q) || String(cd.name ?? '').toLowerCase().includes(q) || String(t.wanted ?? '').toLowerCase().includes(q);
			});
		}
		if (browseFilter !== 'all') {
			list = list.filter(t => {
				const cd = (t.creatureData ?? {}) as Record<string,unknown>;
				return getCategory(String(cd.species ?? '')) === browseFilter;
			});
		}
		return list;
	}

	async function listCreature() {
		if (!lCreatureId) return;
		saving = true;
		const c = myCreatures.find(x => x.id === lCreatureId);
		await fetch('/api/trades', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ creatureId:lCreatureId, creatureData:c, wanted:lWanted||null, price:lPrice||null }) });
		listOpen = false; saving = false; location.reload();
	}

	async function removeTrade(id: number) {
		if (!confirm('Remove this listing?')) return;
		await fetch(`/api/trades/${id}`, { method:'DELETE' });
		myTrades = myTrades.filter((t:Trade) => (t.id as number) !== id);
	}

	async function makeOffer() {
		if (!offerOpen) return;
		saving = true;
		const c = myCreatures.find(x => x.id === oCreatureId);
		await fetch(`/api/trades/${(offerOpen as Record<string,unknown>).id}/offers`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ offeredCreatureId:oCreatureId, offeredCreatureData:c, message:oMessage||null }) });
		offerOpen = null; saving = false; alert('Offer sent!');
	}

	async function respondOffer(offerId: number, tradeId: number, fromUserId: number, fromName: string, action: 'accept'|'reject') {
		await fetch('/api/offers', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ offerId, action }) });
		if (action === 'accept') {
			ratingOpen = { tradeId, userId: fromUserId, name: fromName };
			offers = offers.filter((o:Trade) => (o.id as number) !== offerId);
		} else {
			offers = offers.filter((o:Trade) => (o.id as number) !== offerId);
		}
	}

	async function submitRating() {
		if (!ratingOpen) return;
		await fetch('/api/ratings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ratedUserId:ratingOpen.userId, tradeId:ratingOpen.tradeId, rating:ratingVal, comment:ratingComment||null }) });
		ratingOpen = null;
	}

	async function addToWishlist() {
		if (!wlSpecies.trim()) return;
		saving = true;
		const res = await fetch('/api/wishlists', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ species:wlSpecies.trim(), notes:wlNotes||null }) });
		if (res.ok) { const item = await res.json(); wishlist = [item, ...wishlist]; wlSpecies=''; wlNotes=''; }
		saving = false;
	}

	async function removeFromWishlist(species: string) {
		await fetch(`/api/wishlists?species=${encodeURIComponent(species)}`, { method:'DELETE' });
		wishlist = wishlist.filter((w:Wishlist) => (w.species as string) !== species);
	}
</script>

<div class="tek-stage">
	<div class="mkt-header">
		<PageHeader
			title="Marketplace"
			crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Marketplace' }]}
			sub="Trade specimens with the Survivor network."
		/>
		<button class="tek-btn-v2 solid" onclick={() => listOpen = true}>
			<Plus size={14} strokeWidth={2.5} /> List Specimen
		</button>
	</div>

	<div class="tek-tabs">
		<button class="tek-tab" class:active={tab === 'browse'}    onclick={() => tab = 'browse'}>Browse <span class="count">{trades.length}</span></button>
		<button class="tek-tab" class:active={tab === 'mine'}      onclick={() => tab = 'mine'}>My Listings <span class="count">{myTrades.length}</span></button>
		<button class="tek-tab" class:active={tab === 'offers'}    onclick={() => tab = 'offers'}>Offers <span class="count">{offers.length}</span></button>
		<button class="tek-tab" class:active={tab === 'wishlist'}  onclick={() => tab = 'wishlist'}>Wishlist <span class="count">{wishlist.length}</span></button>
	</div>

	{#if tab === 'browse'}
		<!-- Filters -->
		<div class="mkt-filters">
			<input class="tek-input-v2" placeholder="Search species, name, or wanted…" bind:value={browseSearch} style="flex: 1; min-width: 220px;" />
			<div class="mkt-cat-filters">
				{#each CATEGORIES as cat}
					<button class="tek-chip" class:on={browseFilter === cat} onclick={() => browseFilter = cat}>
						{cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
					</button>
				{/each}
			</div>
		</div>

		{#if getFiltered().length === 0}
			<div class="mkt-empty">No listings match your search.</div>
		{:else}
			<div class="mkt-grid">
				{#each getFiltered() as t}
					{@const td = t as Record<string,unknown>}
					{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
					{@const cat = typeof window !== 'undefined' ? getCategory(String(cd.species ?? '')) : 'default'}
					{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
					<div class="cham-shell mkt-card {cat}" style="--cat-rgb:{rgb}">
						<div class="mkt-card-inner">
							<div class="mkt-card-header">
								<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={11} />{CAT_LABEL[cat]??cat.slice(0,3).toUpperCase()}</div>
								<div class="mkt-species">{String(cd.species ?? '?')}</div>
								<a href="/survivors/{(td.user as Record<string,unknown>).id}" class="mkt-seller">{display(td.user as Record<string,unknown>)}</a>
							</div>
							<div class="mkt-name">{String(cd.name ?? 'Unnamed')} Â· Lvl {Number(cd.level ?? 1)} Â· {String(cd.gender ?? '?')}</div>
							{#if td.wanted}<div class="mkt-wanted">Wants: <strong>{String(td.wanted)}</strong></div>{/if}
							{#if td.price}<div class="mkt-price">Price: <strong>{String(td.price)}</strong></div>{/if}
							<button class="btn btn-primary mkt-offer-btn" onclick={() => { offerOpen = t; oCreatureId = null; oMessage = ''; }}>Make Offer</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if tab === 'mine'}
		{#if myTrades.length === 0}
			<div class="mkt-empty">No active listings.</div>
		{:else}
			{#each myTrades as t}
				{@const td = t as Record<string,unknown>}
				{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
				<div class="cham-shell mkt-row" style="--cut:6px">
					<div class="mkt-row-inner">
						<div class="mkt-row-info">
							<div class="mkt-species">{String(cd.species ?? '?')} â€” {String(cd.name ?? 'Unnamed')}</div>
							<div class="mkt-meta">{String(td.status)} Â· {td.offerCount ?? 0} offer{(td.offerCount as number) !== 1 ? 's' : ''}</div>
							{#if td.wanted}<div class="mkt-meta">Wants: {String(td.wanted)}</div>{/if}
						</div>
						<button class="btn btn-danger btn-sm" onclick={() => removeTrade(td.id as number)}><X size={13} /></button>
					</div>
				</div>
			{/each}
		{/if}

	{:else if tab === 'offers'}
		{#if offers.length === 0}
			<div class="mkt-empty">No incoming offers.</div>
		{:else}
			{#each offers as o}
				{@const od = o as Record<string,unknown>}
				{@const offerCd = (od.offeredCreatureData ?? {}) as Record<string,unknown>}
				{@const fromU = od.fromUser as Record<string,unknown>}
				<div class="cham-shell mkt-row" style="--cut:6px">
					<div class="mkt-row-inner">
						<div class="mkt-row-info">
							<div class="mkt-species"><a href="/survivors/{fromU.id}" class="mkt-link">{display(fromU)}</a> offered: {String(offerCd.species ?? '?')} â€” {String(offerCd.name ?? 'No specimen')}</div>
							{#if od.offeredPrice}<div class="mkt-meta">Price: {String(od.offeredPrice)}</div>{/if}
							{#if od.message}<div class="mkt-meta">"{String(od.message)}"</div>{/if}
						</div>
						<div class="mkt-offer-actions">
							<button class="btn btn-primary btn-sm" onclick={() => respondOffer(od.id as number, od.tradeId as number, fromU.id as number, display(fromU), 'accept')}><Check size={13} /></button>
							<button class="btn btn-danger  btn-sm" onclick={() => respondOffer(od.id as number, od.tradeId as number, fromU.id as number, display(fromU), 'reject')}><X size={13} /></button>
						</div>
					</div>
				</div>
			{/each}
		{/if}

	{:else}
		<!-- My wishlist -->
		<div class="wl-add-row">
			<input class="form-control" list="wl-species-list" placeholder="Add species to wishlist..." bind:value={wlSpecies} style="flex:1" />
			<datalist id="wl-species-list">{#each speciesList as s}<option value={s}>{s}</option>{/each}</datalist>
			<input class="form-control" placeholder="Notes (optional)" bind:value={wlNotes} style="max-width:200px" />
			<button class="btn btn-primary" onclick={addToWishlist} disabled={saving || !wlSpecies.trim()}><Plus size={14} /> Add</button>
		</div>

		{#if wishlist.length > 0}
			<div class="wl-section-title">My Wishlist</div>
			<div class="wl-list">
				{#each wishlist as w}
					{@const wd = w as Record<string,unknown>}
					{@const cat = typeof window !== 'undefined' ? getCategory(String(wd.species ?? '')) : 'default'}
					{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
					<div class="cham-shell wl-row" style="--cut:5px;--cat-rgb:{rgb}">
						<div class="wl-row-inner">
							<div class="cat-badge-v3" style="--cat-rgb:{rgb};font-size:0.52rem;padding:2px 5px"><CategoryIcon category={cat} size={9} /></div>
							<div class="wl-info">
								<div class="wl-species">{String(wd.species)}</div>
								{#if wd.notes}<div class="wl-notes">{String(wd.notes)}</div>{/if}
							</div>
							<button class="btn btn-danger btn-sm" onclick={() => removeFromWishlist(String(wd.species))}><X size={12} /></button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Network wishlists -->
		{#if networkWl.length > 0}
			<div class="wl-section-title" style="margin-top:24px">Network Wishlists {networkWl.filter((w:Wishlist) => w.iHaveIt).length > 0 ? `Â· ${networkWl.filter((w:Wishlist) => w.iHaveIt).length} you can fill` : ''}</div>
			<div class="wl-list">
				{#each networkWl as w}
					{@const wd = w as Record<string,unknown>}
					{@const cat = typeof window !== 'undefined' ? getCategory(String(wd.species ?? '')) : 'default'}
					{@const rgb = CAT_RGB[cat] ?? '0,180,255'}
					<div class="cham-shell wl-row" class:wl-match={wd.iHaveIt} style="--cut:5px;--cat-rgb:{wd.iHaveIt ? '34,197,94' : rgb}">
						<div class="wl-row-inner">
							<div class="cat-badge-v3" style="--cat-rgb:{wd.iHaveIt ? '34,197,94' : rgb};font-size:0.52rem;padding:2px 5px"><CategoryIcon category={cat} size={9} /></div>
							<div class="wl-info">
								<div class="wl-species">{String(wd.species)} {wd.iHaveIt ? 'Â· You have this!' : ''}</div>
								<div class="wl-owner"><a href="/survivors/{(wd.user as Record<string,unknown>).id}" class="mkt-link">{display(wd.user as Record<string,unknown>)}</a> wants this</div>
								{#if wd.notes}<div class="wl-notes">{String(wd.notes)}</div>{/if}
							</div>
							{#if wd.iHaveIt}
								<button class="btn btn-primary btn-sm" onclick={() => { lWanted = String(wd.species); listOpen = true; }}>List Now</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- List modal -->
{#if listOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header"><h2 class="modal-title">List a Specimen</h2><button class="close-btn" onclick={() => listOpen=false}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="l-c">Select Specimen *</label>
				<select id="l-c" class="form-control" bind:value={lCreatureId}>
					<option value={null}>Choose...</option>
					{#each myCreatures as c}<option value={c.id}>{creatureName(c)}</option>{/each}
				</select>
			</div>
			<div class="plan-field"><label class="form-label" for="l-w">What are you looking for?</label><input id="l-w" class="form-control" bind:value={lWanted} placeholder="e.g. High melee Rex female" /></div>
			<div class="plan-field"><label class="form-label" for="l-p">Price / notes</label><input id="l-p" class="form-control" bind:value={lPrice} placeholder="e.g. Open to offers" /></div>
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => listOpen=false}>Cancel</button><button class="btn btn-primary" onclick={listCreature} disabled={saving || !lCreatureId}>{saving?'Listing...':'List'}</button></div>
	</div>
</div>
{/if}

<!-- Offer modal -->
{#if offerOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header"><h2 class="modal-title">Make an Offer</h2><button class="close-btn" onclick={() => offerOpen=null}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field"><label class="form-label" for="o-c">Offer a Specimen (optional)</label>
				<select id="o-c" class="form-control" bind:value={oCreatureId}>
					<option value={null}>None â€” offer text only</option>
					{#each myCreatures as c}<option value={c.id}>{creatureName(c)}</option>{/each}
				</select>
			</div>
			<div class="plan-field"><label class="form-label" for="o-m">Message</label><textarea id="o-m" class="form-control" rows="2" bind:value={oMessage}></textarea></div>
		</div>
		<div class="modal-footer"><button class="btn btn-secondary" onclick={() => offerOpen=null}>Cancel</button><button class="btn btn-primary" onclick={makeOffer} disabled={saving}>{saving?'Sending...':'Send Offer'}</button></div>
	</div>
</div>
{/if}

<!-- Rating modal -->
{#if ratingOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:400px">
		<div class="modal-header"><h2 class="modal-title">Rate this Trade</h2><button class="close-btn" onclick={() => ratingOpen=null}>&times;</button></div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div style="color:#94a3b8;font-size:0.88rem">How was your trade with <strong>{ratingOpen.name}</strong>?</div>
			<div class="rating-stars">
				{#each [1,2,3,4,5] as n}
					<button class="star-btn" class:filled={n <= ratingVal} onclick={() => ratingVal = n}><Star size={24} /></button>
				{/each}
			</div>
			<div class="plan-field"><label class="form-label" for="r-c">Comment (optional)</label><textarea id="r-c" class="form-control" rows="2" bind:value={ratingComment}></textarea></div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => ratingOpen=null}>Skip</button>
			<button class="btn btn-primary" onclick={submitRating}>Submit Rating</button>
		</div>
	</div>
</div>
{/if}

<style>
.mkt-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
}
.mkt-header :global(.tek-page-header) { margin-bottom: 0; }
.mkt-empty {
    color: var(--tek-text-faint);
    padding: 60px 0;
    text-align: center;
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.95rem;
}
.mkt-filters { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; align-items: center; }
.mkt-cat-filters { display: flex; gap: 5px; flex-wrap: wrap; }

.mkt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.mkt-card { --cut: 10px; position: relative; }
.mkt-card::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: rgb(var(--cat-rgb, 0,180,255));
    box-shadow: 0 0 5px rgba(var(--cat-rgb, 0,180,255), 0.5);
}
.mkt-card-inner {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid rgba(var(--cat-rgb, 0,180,255), 0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s;
}
.mkt-card:hover .mkt-card-inner {
    border-color: rgba(var(--cat-rgb), 0.50);
}
.mkt-card-header { display:flex; align-items:center; gap:8px; }
.mkt-species { font-size:0.95rem; font-weight:700; color:#f1f5f9; flex:1; }
.mkt-seller { font-size:0.7rem; color:#475569; text-decoration:none; }
.mkt-seller:hover,.mkt-link:hover { color:#00b4ff; }
.mkt-link { color:#64748b; text-decoration:none; }
.mkt-name { font-size:0.8rem; color:#94a3b8; }
.mkt-wanted,.mkt-price { font-size:0.78rem; color:#64748b; }
.mkt-wanted strong,.mkt-price strong { color:#94a3b8; }
.mkt-offer-btn { align-self:flex-start; }

.mkt-row { margin-bottom:5px; }
.mkt-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:center; gap:12px; }
.mkt-row-info { flex:1; min-width:0; }
.mkt-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }
.mkt-offer-actions { display:flex; gap:6px; }

/* Wishlist */
.wl-add-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
.wl-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.wl-list { display:flex; flex-direction:column; gap:4px; max-width:640px; }
.wl-row { }
.wl-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:10px 14px; display:flex; align-items:center; gap:10px; }
.wl-info { flex:1; min-width:0; }
.wl-species { font-size:0.88rem; font-weight:600; color:#f1f5f9; }
.wl-owner { font-size:0.72rem; color:#64748b; margin-top:1px; }
.wl-notes { font-size:0.72rem; color:#475569; font-style:italic; }
.wl-match .wl-species { color:#4ade80; }

/* Rating */
.rating-stars { display:flex; gap:6px; }
.star-btn { background:none; border:none; cursor:pointer; color:#334155; transition:color .1s; padding:2px; }
.star-btn.filled { color:#f59e0b; }
.star-btn:hover { color:#fbbf24; }
</style>

