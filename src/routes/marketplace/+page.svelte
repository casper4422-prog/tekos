<script lang="ts">
	import { onMount } from 'svelte';
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

	let hexCanvas: HTMLCanvasElement | null = $state(null);

	onMount(() => {
		const db = window.EXPANDED_SPECIES_DATABASE;
		if (db) speciesList = Object.keys(db).sort();

		// Hex canvas animation (verbatim from preview)
		const canvas = hexCanvas;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const R = 32, W = R * Math.sqrt(3), H = R * 2;
		let phase = 0;
		let raf = 0;
		function drawHex(x: number, y: number, opacity: number) {
			ctx!.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (Math.PI / 3) * i - Math.PI / 6;
				const px = x + (R - 1) * Math.cos(a);
				const py = y + (R - 1) * Math.sin(a);
				i === 0 ? ctx!.moveTo(px, py) : ctx!.lineTo(px, py);
			}
			ctx!.closePath();
			ctx!.strokeStyle = `rgba(0,180,255,${opacity})`;
			ctx!.lineWidth = 1;
			ctx!.stroke();
		}
		function draw() {
			ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
			const cw = canvas!.width, ch = canvas!.height;
			const cols = Math.ceil(cw / W) + 3;
			const rows = Math.ceil(ch / (H * 0.75)) + 3;
			for (let row = -1; row < rows; row++) {
				for (let col = -1; col < cols; col++) {
					const x = col * W + (row % 2 !== 0 ? W / 2 : 0);
					const y = row * H * 0.75;
					const dx = x - cw * 0.5, dy = y - ch * 0.5;
					const dist = Math.sqrt(dx * dx + dy * dy);
					const wave = Math.sin(phase - dist * 0.01) * 0.5 + 0.5;
					drawHex(x, y, 0.07 + wave * 0.09);
				}
			}
			phase += 0.005;
			raf = requestAnimationFrame(draw);
		}
		function resize() {
			canvas!.width = window.innerWidth;
			canvas!.height = window.innerHeight;
		}
		window.addEventListener('resize', resize);
		resize(); draw();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', resize);
		};
	});

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.email ?? 'Unknown') as string; }
	function creatureName(c: Creature) { return `${String((c as Record<string,unknown>).species ?? '?')} — ${String((c as Record<string,unknown>).name ?? 'Unnamed')} (Lvl ${Number((c as Record<string,unknown>).level ?? 1)})`; }

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
			// All listings are specimens for now (schema only supports specimens)
			list = browseFilter === 'specimen' ? list : [];
		}
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

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

	<!-- ═══════════ HEADER ═══════════ -->
	<div class="page-header">
		<div>
			<div class="page-title">Marketplace</div>
			<div class="page-sub">
				<span class="prefix">›</span>
				<span class="stat-num">{trades.length}</span> ACTIVE LISTINGS · <span class="stat-num">{myTrades.length}</span> MY LISTINGS · <span class="stat-num">{wishlist.length}</span> WISHLIST
			</div>
		</div>
		<button class="btn-create" onclick={() => listOpen = true}>⬡ Create Listing</button>
	</div>

	<!-- ═══════════ TABS ═══════════ -->
	<div class="tab-bar">
		<button class="tab" class:active={tab === 'browse'} onclick={() => tab = 'browse'}>Browse <span class="tab-count">{trades.length}</span></button>
		<button class="tab" class:active={tab === 'mine'} onclick={() => tab = 'mine'}>My Listings <span class="tab-count">{myTrades.length}</span></button>
		<button class="tab" class:active={tab === 'offers'} onclick={() => tab = 'offers'}>Incoming Offers <span class="tab-count" class:alert={offers.length > 0}>{offers.length}</span></button>
		<button class="tab" class:active={tab === 'wishlist'} onclick={() => tab = 'wishlist'}>Wishlist <span class="tab-count">{wishlist.length}</span></button>
		<button class="tab" class:active={tab === 'completed'} onclick={() => tab = 'completed'}>Completed <span class="tab-count">{completed.length}</span></button>
	</div>

	{#if tab === 'browse'}
		<!-- ═══════════ TOOLBAR ═══════════ -->
		<div class="toolbar">
			<div class="toolbar-row">
				<div class="tb-search">
					<svg class="tb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
					<input type="text" class="tb-search-input" placeholder="Search listings — species, item, seller, or what they want…" bind:value={browseSearch} />
				</div>
				<select class="sort-select" bind:value={sortBy}>
					<option value="newest">Newest first</option>
					<option value="rated">Highest rated</option>
					<option value="muts">Most muts</option>
					<option value="level">Highest level</option>
				</select>
			</div>
			<div class="toolbar-row">
				<div class="filter-chips" id="filterChips">
					<button class="chip" class:active={browseFilter === 'all'} onclick={() => browseFilter = 'all'}>All <span class="count">{trades.length}</span></button>
					<button class="chip" class:active={browseFilter === 'specimen'} onclick={() => browseFilter = 'specimen'}>⬡ Specimens <span class="count">{trades.length}</span></button>
					<button class="chip" class:active={browseFilter === 'egg'} onclick={() => browseFilter = 'egg'}>◇ Eggs <span class="count">0</span></button>
					<button class="chip" class:active={browseFilter === 'resource'} onclick={() => browseFilter = 'resource'}>◊ Resources <span class="count">0</span></button>
					<button class="chip" class:active={browseFilter === 'service'} onclick={() => browseFilter = 'service'}>◎ Services <span class="count">0</span></button>
				</div>
			</div>
		</div>

		<!-- Results -->
		<div class="results-count">
			Showing <span class="num" id="resultsNum">{getFiltered().length}</span> of <span class="num">{trades.length}</span> · sorted by <span class="num">{sortBy}</span>
		</div>

		<!-- ═══════════ LISTING GRID ═══════════ -->
		<div class="listing-grid" id="listingGrid">
			{#each getFiltered() as t}
				{@const td = t as Record<string,unknown>}
				{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
				{@const seller = td.user as Record<string,unknown>}
				{@const tier = tierFor(cd)}
				{@const muts = mutCount(cd)}
				{@const rating = sellerRatings[seller.id as number]}
				{@const gender = String(cd.gender ?? '').toLowerCase()}
				<a class="listing specimen" data-cat="specimen" onclick={() => { offerOpen = t; oCreatureId = null; oMessage = ''; }}>
					<div class="listing-top">
						<span class="type-chip">⬡ Specimen</span>
						<span class="posted">{relTime(td.createdAt)}</span>
					</div>
					<div class="listing-content specimen-content">
						<div class="item-name">{String(cd.species ?? '?')}</div>
						<div class="item-nick">"{String(cd.name ?? 'Unnamed')}" · <span class="gender {gender}">{gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?'}</span>{#if tier} · <span class="tier-pill {tier}">{tier}</span>{/if}</div>
						<div class="item-stats">
							<div class="item-lvl">{Number(cd.level ?? 1)}</div>
							<div class="item-side">
								<div class="item-lbl">Total Lvl</div>
								<div class="item-muts">{muts} muts</div>
							</div>
						</div>
					</div>
					{#if td.wanted}
						<div class="listing-wanted">
							<span class="wanted-label">Wanted</span>
							<p class="wanted-text">"{String(td.wanted)}"</p>
						</div>
					{/if}
					<div class="listing-footer">
						<span class="seller-block"><span class="name">{display(seller)}</span></span>
						{#if rating && rating.count > 0}
							<span class="seller-rating"><span class="star full">★</span>{rating.avg.toFixed(1)}</span>
						{/if}
						<button class="offer-btn">Make Offer ▸</button>
					</div>
				</a>
			{/each}

			<!-- Create listing placeholder -->
			<div class="listing-create" role="button" tabindex="0" onclick={() => listOpen = true} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') listOpen = true; }}>
				<div class="listing-create-glyph">+</div>
				<div class="listing-create-label">List Something</div>
			</div>
		</div>

	{:else if tab === 'mine'}
		{#if myTrades.length === 0}
			<div class="mkt-empty">No active listings.</div>
		{:else}
			<div class="listing-grid">
				{#each myTrades as t}
					{@const td = t as Record<string,unknown>}
					{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
					{@const tier = tierFor(cd)}
					{@const muts = mutCount(cd)}
					{@const gender = String(cd.gender ?? '').toLowerCase()}
					<a class="listing specimen" data-cat="specimen">
						<div class="listing-top">
							<span class="type-chip">⬡ Specimen</span>
							<span class="posted">{relTime(td.createdAt)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(cd.species ?? '?')}</div>
							<div class="item-nick">"{String(cd.name ?? 'Unnamed')}" · <span class="gender {gender}">{gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?'}</span>{#if tier} · <span class="tier-pill {tier}">{tier}</span>{/if}</div>
							<div class="item-stats">
								<div class="item-lvl">{Number(cd.level ?? 1)}</div>
								<div class="item-side">
									<div class="item-lbl">Total Lvl</div>
									<div class="item-muts">{muts} muts</div>
								</div>
							</div>
						</div>
						{#if td.wanted}
							<div class="listing-wanted">
								<span class="wanted-label">Wanted</span>
								<p class="wanted-text">"{String(td.wanted)}"</p>
							</div>
						{/if}
						<div class="listing-footer">
							<span class="seller-block"><span class="name">{String(td.status)} · {td.offerCount ?? 0} offer{(td.offerCount as number) !== 1 ? 's' : ''}</span></span>
							<button class="offer-btn" onclick={() => removeTrade(td.id as number)}>Remove ✕</button>
						</div>
					</a>
				{/each}
			</div>
		{/if}

	{:else if tab === 'offers'}
		{#if offers.length === 0}
			<div class="mkt-empty">No incoming offers.</div>
		{:else}
			<div class="listing-grid">
				{#each offers as o}
					{@const od = o as Record<string,unknown>}
					{@const offerCd = (od.offeredCreatureData ?? {}) as Record<string,unknown>}
					{@const fromU = od.fromUser as Record<string,unknown>}
					{@const tier = tierFor(offerCd)}
					{@const muts = mutCount(offerCd)}
					{@const gender = String(offerCd.gender ?? '').toLowerCase()}
					<div class="listing specimen" data-cat="specimen">
						<div class="listing-top">
							<span class="type-chip">⬡ Offer</span>
							<span class="posted">FROM {display(fromU)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(offerCd.species ?? '?')}</div>
							<div class="item-nick">"{String(offerCd.name ?? 'No specimen')}" · <span class="gender {gender}">{gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?'}</span>{#if tier} · <span class="tier-pill {tier}">{tier}</span>{/if}</div>
							<div class="item-stats">
								<div class="item-lvl">{Number(offerCd.level ?? 0)}</div>
								<div class="item-side">
									<div class="item-lbl">Total Lvl</div>
									<div class="item-muts">{muts} muts</div>
								</div>
							</div>
						</div>
						{#if od.message}
							<div class="listing-wanted">
								<span class="wanted-label">Message</span>
								<p class="wanted-text">"{String(od.message)}"</p>
							</div>
						{/if}
						<div class="listing-footer">
							<button class="offer-btn" onclick={() => respondOffer(od.id as number, od.tradeId as number, fromU.id as number, display(fromU), 'accept')}>Accept ✓</button>
							<button class="offer-btn" onclick={() => respondOffer(od.id as number, od.tradeId as number, fromU.id as number, display(fromU), 'reject')}>Reject ✕</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if tab === 'completed'}
		{#if completed.length === 0}
			<div class="mkt-empty">No completed trades yet.</div>
		{:else}
			<div class="listing-grid">
				{#each completed as t}
					{@const td = t as Record<string,unknown>}
					{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
					{@const seller = td.user as Record<string,unknown>}
					{@const tier = tierFor(cd)}
					{@const muts = mutCount(cd)}
					{@const gender = String(cd.gender ?? '').toLowerCase()}
					<div class="listing specimen" data-cat="specimen">
						<div class="listing-top">
							<span class="type-chip">⬡ Traded</span>
							<span class="posted">{relTime(td.createdAt)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(cd.species ?? '?')}</div>
							<div class="item-nick">"{String(cd.name ?? 'Unnamed')}" · <span class="gender {gender}">{gender === 'female' ? '♀' : gender === 'male' ? '♂' : '?'}</span>{#if tier} · <span class="tier-pill {tier}">{tier}</span>{/if}</div>
							<div class="item-stats">
								<div class="item-lvl">{Number(cd.level ?? 1)}</div>
								<div class="item-side">
									<div class="item-lbl">Total Lvl</div>
									<div class="item-muts">{muts} muts</div>
								</div>
							</div>
						</div>
						{#if td.wanted}
							<div class="listing-wanted">
								<span class="wanted-label">Wanted</span>
								<p class="wanted-text">"{String(td.wanted)}"</p>
							</div>
						{/if}
						<div class="listing-footer">
							<span class="seller-block"><span class="name">{display(seller)}</span></span>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else}
		<!-- Wishlist tab -->
		<div class="toolbar">
			<div class="toolbar-row">
				<div class="tb-search">
					<svg class="tb-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
					<input type="text" class="tb-search-input" list="wl-species-list" placeholder="Add species to wishlist…" bind:value={wlSpecies} />
					<datalist id="wl-species-list">{#each speciesList as s}<option value={s}>{s}</option>{/each}</datalist>
				</div>
				<input type="text" class="tb-search-input" placeholder="Notes (optional)" bind:value={wlNotes} style="flex:1;min-width:160px;padding-left:14px" />
				<button class="btn-create" onclick={addToWishlist} disabled={saving || !wlSpecies.trim()}>+ Add</button>
			</div>
		</div>

		{#if wishlist.length > 0}
			<div class="results-count">My Wishlist · <span class="num">{wishlist.length}</span></div>
			<div class="listing-grid">
				{#each wishlist as w}
					{@const wd = w as Record<string,unknown>}
					<div class="listing specimen" data-cat="specimen">
						<div class="listing-top">
							<span class="type-chip">⬡ Wishlist</span>
							<span class="posted">{relTime(wd.createdAt)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(wd.species ?? '?')}</div>
							{#if wd.notes}<div class="item-nick">"{String(wd.notes)}"</div>{/if}
						</div>
						<div class="listing-footer">
							<span class="seller-block"><span class="name">Looking for…</span></span>
							<button class="offer-btn" onclick={() => removeFromWishlist(String(wd.species))}>Remove ✕</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if networkWl.length > 0}
			<div class="results-count" style="margin-top:24px">Network Wishlists · <span class="num">{networkWl.length}</span>{#if networkWl.filter((w:Wishlist) => w.iHaveIt).length > 0} · <span class="num">{networkWl.filter((w:Wishlist) => w.iHaveIt).length}</span> you can fill{/if}</div>
			<div class="listing-grid">
				{#each networkWl as w}
					{@const wd = w as Record<string,unknown>}
					<div class="listing specimen" data-cat="specimen">
						<div class="listing-top">
							<span class="type-chip">⬡ {wd.iHaveIt ? 'You Have It' : 'Network'}</span>
							<span class="posted">{relTime(wd.createdAt)}</span>
						</div>
						<div class="listing-content specimen-content">
							<div class="item-name">{String(wd.species ?? '?')}</div>
							<div class="item-nick">{display(wd.user as Record<string,unknown>)} wants this</div>
							{#if wd.notes}<div class="item-nick">"{String(wd.notes)}"</div>{/if}
						</div>
						<div class="listing-footer">
							<span class="seller-block"><span class="name">{display(wd.user as Record<string,unknown>)}</span></span>
							{#if wd.iHaveIt}
								<button class="offer-btn" onclick={() => { lWanted = String(wd.species); listOpen = true; }}>List Now ▸</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

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
					<option value={null}>None — offer text only</option>
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
					<button class="star-btn" class:filled={n <= ratingVal} onclick={() => ratingVal = n}>★</button>
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
:global(body)::before {
	content: '';
	position: fixed;
	inset: 0;
	background-image:
		radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.08) 0%, transparent 50%),
		radial-gradient(ellipse 55% 50% at 85% 90%, rgba(245,158,11,0.08) 0%, transparent 55%);
	pointer-events: none;
	z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
	position: relative; z-index: 2;
	min-height: 100vh;
	padding: 70px 24px 80px;
	max-width: 1280px;
	margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 18px;
	margin-bottom: 22px;
	flex-wrap: wrap;
}
.page-title {
	font-family: var(--tek-display);
	font-size: clamp(1.5rem, 4vw, 2rem);
	font-weight: 900;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
	-webkit-background-clip: text;
	background-clip: text;
	-webkit-text-fill-color: transparent;
	filter: drop-shadow(0 0 12px rgba(0,180,255,0.30));
	line-height: 1;
	margin-bottom: 4px;
}
.page-sub {
	font-family: var(--tek-mono);
	font-size: 0.72rem;
	letter-spacing: 0.22em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .stat-num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

.btn-create {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-family: inherit;
	font-size: 0.78rem;
	font-weight: 700;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	padding: 11px 22px;
	background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
	color: #001a2e;
	border: none;
	cursor: pointer;
	clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
	filter: drop-shadow(0 0 12px rgba(0,180,255,0.45));
	transition: filter 0.18s, transform 0.18s;
}
.btn-create:hover { filter: drop-shadow(0 0 22px rgba(0,180,255,0.80)); transform: translateY(-1px); }
.btn-create:disabled { opacity: 0.5; cursor: not-allowed; }

/* ═════════════════════════════════════════════════════════════════════════
   TAB BAR (Browse / My Listings / Offers / Wishlist)
   ═════════════════════════════════════════════════════════════════════════ */
.tab-bar {
	display: flex;
	gap: 0;
	margin-bottom: 24px;
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
.tab .tab-count {
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
.tab .tab-count.alert { background: rgba(239,68,68,0.18); color: #fca5a5; border-color: rgba(239,68,68,0.40); animation: amber-pulse 2s ease-in-out infinite; }
@keyframes amber-pulse { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }

/* ═════════════════════════════════════════════════════════════════════════
   TOOLBAR (search + type filters + sort)
   ═════════════════════════════════════════════════════════════════════════ */
.toolbar {
	background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.94) 100%);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
	padding: 14px 18px;
	margin-bottom: 22px;
	position: relative;
}
.toolbar::before {
	content: '';
	position: absolute;
	left: 0; top: 12px; bottom: 0;
	width: 2px;
	background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
	box-shadow: 0 0 7px var(--tek-blue-glow);
}
.toolbar-row {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
}
.toolbar-row + .toolbar-row { margin-top: 10px; }

.tb-search {
	flex: 1;
	min-width: 220px;
	position: relative;
}
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
.tb-search-input:focus {
	border-color: rgba(0,180,255,0.40);
	border-bottom-color: var(--tek-blue);
	background: rgba(0,15,35,0.92);
}
.tb-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--tek-text-faint); pointer-events: none; }

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
.chip .count { font-family: var(--tek-mono); font-size: 0.58rem; opacity: 0.65; background: rgba(0,0,0,0.30); padding: 1px 6px; border-radius: 6px; }
.chip.active .count { background: rgba(0,0,0,0.25); opacity: 0.85; }

.results-count {
	margin-bottom: 14px;
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.16em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
}
.results-count .num { color: var(--tek-blue); font-weight: 700; text-shadow: 0 0 5px var(--tek-blue-glow); }

/* ═════════════════════════════════════════════════════════════════════════
   LISTING GRID
   ═════════════════════════════════════════════════════════════════════════ */
.listing-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
}
@media (max-width: 980px) { .listing-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .listing-grid { grid-template-columns: 1fr; } }

/* ── Listing card (base) ───────────────────────────────────────────────── */
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
	text-decoration: none;
	color: inherit;
	display: flex;
	flex-direction: column;
	min-height: 320px;
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

/* Top row: type chip + posted time */
.listing-top {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12px;
}
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
.type-chip svg { width: 11px; height: 11px; }
.posted {
	font-family: var(--tek-mono);
	font-size: 0.56rem;
	letter-spacing: 0.16em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
}

/* Item content area (varies by type) */
.listing-content {
	flex: 1;
	margin-bottom: 12px;
}

/* SPECIMEN content */
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
.listing-content.specimen-content .item-nick .gender { font-style: normal; }
.listing-content.specimen-content .item-nick .gender.female { color: var(--tek-pink); }
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

/* Bloodline tier pill (auto-computed) */
.tier-pill {
	display: inline-block;
	font-family: var(--tek-mono);
	font-size: 0.55rem;
	font-weight: 700;
	letter-spacing: 0.18em;
	text-transform: uppercase;
	padding: 1px 7px;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
	font-style: normal;
}
.tier-pill.bronze  { background: rgba(205,127,50,0.18);  border: 1px solid rgba(205,127,50,0.50);  color: #fbbf24; }
.tier-pill.silver  { background: rgba(200,200,210,0.18); border: 1px solid rgba(200,200,210,0.50); color: #f3f4f6; }
.tier-pill.gold    { background: rgba(255,215,0,0.18);   border: 1px solid rgba(255,215,0,0.55);   color: #fde047; }
.tier-pill.diamond { background: rgba(0,180,255,0.18);   border: 1px solid rgba(0,180,255,0.55);   color: #7dd3fc; text-shadow: 0 0 6px var(--tek-blue-glow); }

/* EGG content */
.listing-content.egg-content .egg-icon-wrap {
	width: 60px;
	height: 76px;
	margin: 4px auto 10px;
	position: relative;
}
.listing-content.egg-content .egg-icon-wrap svg { width: 100%; height: 100%; filter: drop-shadow(0 0 8px rgba(245,158,11,0.45)); animation: egg-glow 3s ease-in-out infinite; }
@keyframes egg-glow {
	0%, 100% { filter: drop-shadow(0 0 8px rgba(245,158,11,0.45)); }
	50%      { filter: drop-shadow(0 0 14px rgba(245,158,11,0.70)); }
}
.listing-content.egg-content .item-name {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	color: var(--tek-text);
	text-transform: uppercase;
	text-align: center;
	line-height: 1.1;
	margin-bottom: 4px;
}
.listing-content.egg-content .item-sub {
	font-family: var(--tek-mono);
	font-size: 0.68rem;
	color: var(--tek-text-dim);
	text-align: center;
	margin-bottom: 8px;
}
.listing-content.egg-content .egg-parents {
	background: rgba(0,0,0,0.20);
	padding: 8px 10px;
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: var(--tek-text-dim);
	line-height: 1.55;
	clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.listing-content.egg-content .egg-parents .label {
	font-size: 0.54rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-faint);
	text-transform: uppercase;
	margin-bottom: 3px;
	display: block;
}
.listing-content.egg-content .egg-parents .male   { color: #60a5fa; }
.listing-content.egg-content .egg-parents .female { color: var(--tek-pink); }
.listing-content.egg-content .egg-qty {
	text-align: right;
	margin-top: 8px;
	font-family: var(--tek-display);
	font-size: 1.1rem;
	font-weight: 800;
	color: var(--tek-amber);
	text-shadow: 0 0 6px rgba(245,158,11,0.50);
}
.listing-content.egg-content .egg-qty .lbl { font-family: var(--tek-mono); font-size: 0.55rem; letter-spacing: 0.20em; color: var(--tek-text-faint); text-transform: uppercase; font-weight: 600; }

/* RESOURCE content */
.listing-content.resource-content {
	display: flex;
	align-items: center;
	gap: 14px;
	padding-bottom: 10px;
}
.listing-content.resource-content .resource-glyph {
	width: 52px;
	height: 58px;
	flex-shrink: 0;
	color: var(--tek-purple);
	filter: drop-shadow(0 0 8px rgba(139,92,246,0.55));
}
.listing-content.resource-content .resource-info { min-width: 0; flex: 1; }
.listing-content.resource-content .item-name {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	color: var(--tek-text);
	text-transform: uppercase;
	line-height: 1.1;
	margin-bottom: 4px;
}
.listing-content.resource-content .quality {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	color: #c4b5fd;
	letter-spacing: 0.06em;
}
.listing-content.resource-content .resource-qty {
	font-family: var(--tek-display);
	font-size: 1.6rem;
	font-weight: 900;
	color: var(--tek-purple);
	text-shadow: 0 0 8px rgba(139,92,246,0.55);
	margin-top: 6px;
}
.listing-content.resource-content .resource-qty .lbl { font-family: var(--tek-mono); font-size: 0.55rem; letter-spacing: 0.18em; color: var(--tek-text-faint); text-transform: uppercase; font-weight: 600; margin-left: 5px; }

/* SERVICE content */
.listing-content.service-content {
	display: flex;
	flex-direction: column;
}
.listing-content.service-content .item-name {
	font-family: var(--tek-display);
	font-size: 1rem;
	font-weight: 800;
	letter-spacing: 0.05em;
	color: var(--tek-text);
	text-transform: uppercase;
	line-height: 1.2;
	margin-bottom: 4px;
}
.listing-content.service-content .item-sub {
	font-family: var(--tek-mono);
	font-size: 0.64rem;
	letter-spacing: 0.10em;
	color: var(--tek-green);
	text-transform: uppercase;
	margin-bottom: 10px;
}
.listing-content.service-content .service-desc {
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 0.92rem;
	line-height: 1.45;
	color: #94a3b8;
	padding-left: 10px;
	border-left: 1px solid rgba(16,185,129,0.25);
	flex: 1;
}

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
.wanted-text {
	font-family: var(--tek-mono);
	font-size: 0.74rem;
	line-height: 1.45;
	color: var(--tek-text-dim);
	font-style: italic;
}

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
}
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
.seller-rating .star { font-size: 0.78rem; color: #fbbf24; filter: drop-shadow(0 0 4px rgba(251,191,36,0.50)); }
.seller-rating .star.full { color: #fde047; }
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
	cursor: pointer;
	clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
	transition: all 0.18s;
	white-space: nowrap;
}
.offer-btn:hover {
	background: rgba(var(--type-rgb), 0.22);
	filter: drop-shadow(0 0 8px rgba(var(--type-rgb), 0.55));
}
.listing.bookmarked .bookmark { color: var(--tek-amber); }

/* "+ Create listing" placeholder card */
.listing-create {
	background: linear-gradient(160deg, rgba(10,18,44,0.40) 0%, rgba(4,8,20,0.55) 100%);
	border: 1.5px dashed rgba(0,180,255,0.30);
	clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	cursor: pointer;
	transition: all 0.2s;
	min-height: 320px;
}
.listing-create:hover {
	background: linear-gradient(160deg, rgba(0,180,255,0.06) 0%, rgba(4,8,20,0.55) 100%);
	border-color: rgba(0,180,255,0.60);
}
.listing-create-glyph {
	font-family: var(--tek-display);
	font-size: 2.4rem;
	color: var(--tek-blue);
	filter: drop-shadow(0 0 10px var(--tek-blue-glow));
	line-height: 1;
}
.listing-create-label {
	font-family: var(--tek-mono);
	font-size: 0.66rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-dim);
	text-transform: uppercase;
	text-align: center;
}
.listing-create:hover .listing-create-label { color: var(--tek-blue); }

.bottom-note {
	position: fixed;
	bottom: 14px;
	left: 50%;
	transform: translateX(-50%);
	font-family: var(--tek-mono);
	font-size: 0.6rem;
	letter-spacing: 0.18em;
	color: var(--tek-text-faint);
	white-space: nowrap;
	z-index: 2;
}

@media (max-width: 720px) {
	.stage { padding: 60px 14px 80px; }
}

/* Empty state */
.mkt-empty {
	color: var(--tek-text-faint);
	padding: 60px 0;
	text-align: center;
	font-family: var(--tek-serif);
	font-style: italic;
	font-size: 0.95rem;
}

/* Rating modal star buttons */
.rating-stars { display:flex; gap:6px; }
.star-btn { background:none; border:none; cursor:pointer; color:#334155; transition:color .1s; padding:2px; font-size:1.5rem; line-height:1; }
.star-btn.filled { color:#f59e0b; }
.star-btn:hover { color:#fbbf24; }
</style>
