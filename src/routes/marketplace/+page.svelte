<script lang="ts">
	import { Plus, X, Check, Search, Star, Dna } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { computeBadges } from '$lib/badges';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Trade    = Record<string,unknown>;
	type Creature = Record<string,unknown> & { id:number };
	type Wishlist = Record<string,unknown>;

	let tab        = $state<'browse'|'mine'|'offers'|'completed'|'wishlist'>('browse');
	let trades     = $state<Trade[]>(data.trades as Trade[]);
	let myTrades   = $state<Trade[]>(data.myTrades as Trade[]);
	let offers     = $state<Trade[]>(data.offers as Trade[]);
	let completed  = $state<Trade[]>(data.completed as Trade[]);
	let myCreatures = data.myCreatures as Creature[];
	let wishlist   = $state<Wishlist[]>(data.wishlist as Wishlist[]);
	let networkWl  = $state<Wishlist[]>(data.networkWishlists as Wishlist[]);
	const sellerRatings = (data.sellerRatings ?? {}) as Record<number, { avg: number; count: number }>;

	let listOpen   = $state(false);
	let offerOpen  = $state<Trade|null>(null);
	let ratingOpen = $state<{tradeId:number; userId:number; name:string}|null>(null);
	let saving     = $state(false);

	let browseSearch = $state('');
	let browseFilter = $state<string>('all');
	let sortBy       = $state<'newest'|'level'|'muts'|'rated'>('newest');

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

	function mutCount(cd: Record<string,unknown>) {
		const m = (cd.mutations ?? {}) as Record<string,number>;
		return Object.values(m).reduce((a,b) => a + (Number(b) || 0), 0);
	}
	function tierFor(cd: Record<string,unknown>) {
		const b = computeBadges(cd.baseStats as Record<string,number>|undefined, cd.mutations as Record<string,number>|undefined);
		return b.bloodline;
	}
	function relTime(iso: unknown) {
		if (!iso) return '';
		const t = new Date(String(iso)).getTime();
		const s = (Date.now() - t) / 1000;
		if (s < 60) return 'JUST NOW';
		if (s < 3600) return `${Math.floor(s/60)}M AGO`;
		if (s < 86400) return `${Math.floor(s/3600)}H AGO`;
		return `${Math.floor(s/86400)}D AGO`;
	}

	function getFiltered() {
		let list = trades;
		if (browseSearch) {
			const q = browseSearch.toLowerCase();
			list = list.filter(t => {
				const cd = (t.creatureData ?? {}) as Record<string,unknown>;
				return String(cd.species ?? '').toLowerCase().includes(q)
					|| String(cd.name ?? '').toLowerCase().includes(q)
					|| String(t.wanted ?? '').toLowerCase().includes(q)
					|| display(t.user as Record<string,unknown>).toLowerCase().includes(q);
			});
		}
		if (browseFilter !== 'all') {
			list = list.filter(t => {
				const cd = (t.creatureData ?? {}) as Record<string,unknown>;
				return getCategory(String(cd.species ?? '')) === browseFilter;
			});
		}
		// Sort
		const sorted = [...list];
		if (sortBy === 'level') {
			sorted.sort((a, b) => {
				const al = Number((((a as Record<string,unknown>).creatureData ?? {}) as Record<string,unknown>).level ?? 0);
				const bl = Number((((b as Record<string,unknown>).creatureData ?? {}) as Record<string,unknown>).level ?? 0);
				return bl - al;
			});
		} else if (sortBy === 'muts') {
			sorted.sort((a, b) => {
				const am = mutCount(((a as Record<string,unknown>).creatureData ?? {}) as Record<string,unknown>);
				const bm = mutCount(((b as Record<string,unknown>).creatureData ?? {}) as Record<string,unknown>);
				return bm - am;
			});
		} else if (sortBy === 'rated') {
			sorted.sort((a, b) => {
				const ar = sellerRatings[(a as Record<string,unknown>).userId as number]?.avg ?? 0;
				const br = sellerRatings[(b as Record<string,unknown>).userId as number]?.avg ?? 0;
				return br - ar;
			});
		}
		// newest is the default order (already createdAt:desc from server)
		return sorted;
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

	<div class="tab-bar">
		<button class="tab" class:active={tab === 'browse'}    onclick={() => tab = 'browse'}>Browse <span class="tab-count">{trades.length}</span></button>
		<button class="tab" class:active={tab === 'mine'}      onclick={() => tab = 'mine'}>My Listings <span class="tab-count">{myTrades.length}</span></button>
		<button class="tab" class:active={tab === 'offers'}    onclick={() => tab = 'offers'}>Offers <span class="tab-count" class:alert={offers.length > 0}>{offers.length}</span></button>
		<button class="tab" class:active={tab === 'completed'} onclick={() => tab = 'completed'}>Completed <span class="tab-count">{completed.length}</span></button>
		<button class="tab" class:active={tab === 'wishlist'}  onclick={() => tab = 'wishlist'}>Wishlist <span class="tab-count">{wishlist.length}</span></button>
	</div>

	{#if tab === 'browse'}
		<!-- Toolbar -->
		<div class="toolbar">
			<div class="toolbar-row">
				<div class="tb-search">
					<Search size={14} class="tb-search-icon" />
					<input class="tb-search-input" placeholder="Search listings — species, name, seller, or what they want…" bind:value={browseSearch} />
				</div>
				<select class="sort-select" bind:value={sortBy}>
					<option value="newest">Newest first</option>
					<option value="level">Highest level</option>
					<option value="muts">Most mutations</option>
					<option value="rated">Highest rated seller</option>
				</select>
			</div>
			<div class="toolbar-row">
				<div class="filter-chips">
					{#each CATEGORIES as cat}
						<button class="chip" class:active={browseFilter === cat} onclick={() => browseFilter = cat}>
							{cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
						</button>
					{/each}
				</div>
			</div>
		</div>

		{#if getFiltered().length === 0}
			<div class="mkt-empty">No listings match your search.</div>
		{:else}
			<div class="results-count">SHOWING <span class="num">{getFiltered().length}</span> OF <span class="num">{trades.length}</span></div>
			<div class="listing-grid">
				{#each getFiltered() as t}
					{@const td = t as Record<string,unknown>}
					{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
					{@const seller = td.user as Record<string,unknown>}
					{@const tier = tierFor(cd)}
					{@const muts = mutCount(cd)}
					{@const rating = sellerRatings[seller.id as number]}
					{@const gender = String(cd.gender ?? '').toLowerCase()}
					<button class="listing specimen" onclick={() => { offerOpen = t; oCreatureId = null; oMessage = ''; }}>
						<div class="listing-top">
							<span class="type-chip"><Dna size={11} /> Specimen</span>
							<span class="posted">{relTime(td.createdAt)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(cd.species ?? '?')}</div>
							<div class="item-nick">"{String(cd.name ?? 'Unnamed')}" · <span class="gender {gender}">{gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?'}</span></div>
							{#if tier}<span class="tier-pill {tier}">{tier}</span>{/if}
							<div class="item-stats">
								<div class="item-lvl">{Number(cd.level ?? 1)}</div>
								<div class="item-side">
									<div class="item-lbl">Mutations</div>
									<div class="item-muts">{muts}</div>
								</div>
							</div>
						</div>
						{#if td.wanted}
							<div class="listing-wanted">
								<span class="wanted-label">Looking for</span>
								<span class="wanted-text">{String(td.wanted)}</span>
							</div>
						{/if}
						<div class="listing-footer">
							<a class="seller-block" href="/survivors/{seller.id}" onclick={(e) => e.stopPropagation()}>
								<span class="name">{display(seller)}</span>
								{#if rating && rating.count > 0}
									<span class="seller-rating"><span class="star">★</span>{rating.avg.toFixed(1)}<span style="opacity:0.6">({rating.count})</span></span>
								{/if}
							</a>
							<span class="offer-btn">Make Offer</span>
						</div>
					</button>
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

	{:else if tab === 'completed'}
		{#if completed.length === 0}
			<div class="mkt-empty">No completed trades yet.</div>
		{:else}
			{#each completed as t}
				{@const td = t as Record<string,unknown>}
				{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
				{@const seller = td.user as Record<string,unknown>}
				<div class="cham-shell mkt-row" style="--cut:6px">
					<div class="mkt-row-inner">
						<div class="mkt-row-info">
							<div class="mkt-species">{String(cd.species ?? '?')} — {String(cd.name ?? 'Unnamed')} <span style="color:#10b981;font-size:0.7rem;margin-left:8px">✓ TRADED</span></div>
							<div class="mkt-meta">By <a href="/survivors/{seller.id}" class="mkt-link">{display(seller)}</a> · {relTime(td.createdAt)}</div>
							{#if td.wanted}<div class="mkt-meta">Wanted: {String(td.wanted)}</div>{/if}
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

/* ── Tab bar (preview parity) ───────────────────────────────────────── */
.tab-bar {
    display: flex;
    gap: 0;
    margin-bottom: 22px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-wrap: wrap;
}
.tab {
    background: none;
    border: none;
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    padding: 11px 22px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.18s, border-color 0.18s;
    display: flex;
    align-items: center;
    gap: 7px;
    text-transform: uppercase;
}
.tab:hover { color: var(--tek-text-dim); }
.tab.active {
    color: var(--tek-blue);
    border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.tab-count {
    background: rgba(0,180,255,0.12);
    color: #7dd3fc;
    border: 1px solid rgba(0,180,255,0.28);
    font-size: 0.58rem;
    font-weight: 800;
    border-radius: 99px;
    padding: 1px 7px;
    min-width: 22px;
    text-align: center;
}
.tab.active .tab-count { background: rgba(0,180,255,0.20); color: #fff; }
.tab-count.alert { background: rgba(239,68,68,0.18); color: #fca5a5; border-color: rgba(239,68,68,0.40); animation: amber-pulse 2s ease-in-out infinite; }
@keyframes amber-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }

/* ── Toolbar ─────────────────────────────────────────────────────────── */
.toolbar {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 14px 18px;
    margin-bottom: 16px;
    position: relative;
}
.toolbar::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), #a855f7);
    box-shadow: 0 0 7px var(--tek-blue-glow);
}
.toolbar-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar-row + .toolbar-row { margin-top: 10px; }

.tb-search { flex: 1; min-width: 220px; position: relative; }
.tb-search-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 14px 10px 38px;
    font-family: inherit;
    font-size: 0.86rem;
    outline: none;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    transition: border-color 0.2s, background 0.2s;
}
.tb-search-input::placeholder { color: var(--tek-text-faint); }
.tb-search-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); background: rgba(0,15,35,0.92); }
.tb-search :global(.tb-search-icon) { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--tek-text-faint); pointer-events: none; }

.sort-select {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 38px 10px 14px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    outline: none;
    cursor: pointer;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2300b4ff' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    text-transform: uppercase;
}
.sort-select option { background: #0a1228; color: var(--tek-text); }

.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 6px 11px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
}
.chip:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.40); }
.chip.active { background: var(--tek-blue); color: #001a2e; border-color: var(--tek-blue); }

.results-count { margin-bottom: 14px; font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.16em; color: var(--tek-text-faint); text-transform: uppercase; }
.results-count .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

/* ── Listing card (preview specimen layout) ──────────────────────────── */
.listing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 980px) { .listing-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .listing-grid { grid-template-columns: 1fr; } }

.listing {
    --type-rgb: 0,180,255;
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.98) 100%);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 14px 18px 14px 20px;
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.22s ease, filter 0.25s ease;
    filter: drop-shadow(0 0 1px rgba(var(--type-rgb), 0.30)) drop-shadow(0 8px 22px rgba(0,0,0,0.42));
    color: inherit;
    display: flex;
    flex-direction: column;
    min-height: 320px;
    border: none;
    text-align: left;
    font-family: inherit;
    width: 100%;
}
.listing:hover {
    transform: translateY(-2px);
    filter: drop-shadow(0 0 2px rgba(var(--type-rgb), 0.70)) drop-shadow(0 12px 30px rgba(0,0,0,0.55));
}
.listing::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: rgb(var(--type-rgb));
    box-shadow: 0 0 6px rgba(var(--type-rgb), 0.7);
}
.listing.specimen { --type-rgb: 0,180,255;   }
.listing.egg      { --type-rgb: 245,158,11;  }
.listing.resource { --type-rgb: 139,92,246;  }
.listing.service  { --type-rgb: 16,185,129;  }

.listing-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.type-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(var(--type-rgb), 0.10);
    border: 1px solid rgba(var(--type-rgb), 0.32);
    color: rgb(var(--type-rgb));
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 3px 9px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.posted { font-family: var(--tek-mono); font-size: 0.56rem; letter-spacing: 0.16em; color: var(--tek-text-faint); text-transform: uppercase; }

.listing-content { flex: 1; margin-bottom: 12px; }
.listing-content.specimen-content .item-name {
    font-family: var(--tek-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--tek-text);
    text-transform: uppercase;
    line-height: 1;
    margin-bottom: 4px;
}
.listing-content.specimen-content .item-nick {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-bottom: 10px;
}
.listing-content.specimen-content .item-nick .gender { font-style: normal; font-weight: 700; }
.listing-content.specimen-content .item-nick .gender.female { color: #f472b6; }
.listing-content.specimen-content .item-nick .gender.male   { color: #60a5fa; }
.listing-content.specimen-content .item-stats {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.listing-content.specimen-content .item-lvl {
    font-family: var(--tek-display);
    font-size: 1.7rem;
    font-weight: 900;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 6px rgba(0,180,255,0.30));
}
.listing-content.specimen-content .item-side { text-align: right; line-height: 1.3; }
.listing-content.specimen-content .item-lbl {
    font-family: var(--tek-mono);
    font-size: 0.55rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.listing-content.specimen-content .item-muts {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-shadow: 0 0 5px var(--tek-blue-glow);
}

/* Tier pill (auto-bloodline) */
.tier-pill {
    display: inline-block;
    font-family: var(--tek-mono);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 2px 8px;
    margin-bottom: 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.tier-pill.bronze  { background: rgba(205,127,50,0.18);  border: 1px solid rgba(205,127,50,0.50);  color: #fbbf24; }
.tier-pill.silver  { background: rgba(200,200,210,0.18); border: 1px solid rgba(200,200,210,0.50); color: #f3f4f6; }
.tier-pill.gold    { background: rgba(255,215,0,0.18);   border: 1px solid rgba(255,215,0,0.55);   color: #fde047; }
.tier-pill.diamond { background: rgba(0,180,255,0.18);   border: 1px solid rgba(0,180,255,0.55);   color: #7dd3fc; text-shadow: 0 0 6px var(--tek-blue-glow); }

/* Wanted block */
.listing-wanted {
    background: rgba(0,0,0,0.25);
    border: 1px solid rgba(255,255,255,0.03);
    padding: 9px 12px;
    margin-bottom: 12px;
    clip-path: polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px);
}
.wanted-label {
    display: block;
    font-family: var(--tek-mono);
    font-size: 0.54rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-faint);
    margin-bottom: 3px;
}
.wanted-text { font-family: var(--tek-mono); font-size: 0.74rem; line-height: 1.45; color: var(--tek-text-dim); font-style: italic; }

/* Footer */
.listing-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.05);
}
.seller-block {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-dim);
    min-width: 0;
    text-decoration: none;
}
.seller-block:hover { color: var(--tek-text); }
.seller-block .name { color: var(--tek-text); font-weight: 600; letter-spacing: 0.04em; }
.seller-rating {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    font-weight: 700;
    color: #fcd34d;
}
.seller-rating .star { font-size: 0.78rem; color: #fde047; filter: drop-shadow(0 0 4px rgba(251,191,36,0.50)); }
.offer-btn {
    background: rgba(var(--type-rgb), 0.10);
    border: 1px solid rgba(var(--type-rgb), 0.40);
    color: rgb(var(--type-rgb));
    font-family: inherit;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 7px 12px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.18s;
    white-space: nowrap;
}
.listing:hover .offer-btn { background: rgba(var(--type-rgb), 0.22); filter: drop-shadow(0 0 8px rgba(var(--type-rgb), 0.55)); }

/* ── Row layout (mine / offers / completed tabs) ─────────────────────── */
.mkt-row { margin-bottom:5px; }
.mkt-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:center; gap:12px; }
.mkt-row-info { flex:1; min-width:0; }
.mkt-species { font-size:0.95rem; font-weight:700; color:#f1f5f9; }
.mkt-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }
.mkt-link { color:#64748b; text-decoration:none; }
.mkt-link:hover { color:#00b4ff; }
.mkt-offer-actions { display:flex; gap:6px; }

/* Wishlist */
.wl-add-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; align-items:center; }
.wl-section-title { font-size:0.65rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569; margin-bottom:10px; }
.wl-list { display:flex; flex-direction:column; gap:4px; max-width:640px; }
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

