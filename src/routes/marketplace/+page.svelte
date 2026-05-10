<script lang="ts">
	import { Repeat2, Plus, X, Check } from 'lucide-svelte';
	import CategoryIcon from '$lib/components/CategoryIcon.svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Trade = Record<string,unknown>;
	type Creature = Record<string,unknown> & { id:number };

	let tab        = $state<'browse'|'mine'|'offers'>('browse');
	let trades     = $state<Trade[]>(data.trades as Trade[]);
	let myTrades   = $state<Trade[]>(data.myTrades as Trade[]);
	let offers     = $state<Trade[]>(data.offers as Trade[]);
	let myCreatures = data.myCreatures as Creature[];

	let listOpen   = $state(false);
	let offerOpen  = $state<Trade|null>(null);
	let saving     = $state(false);

	// List form
	let lCreatureId = $state<number|null>(null);
	let lWanted     = $state('');
	let lPrice      = $state('');

	// Offer form
	let oCreatureId = $state<number|null>(null);
	let oMessage    = $state('');

	function display(u: Record<string,unknown>) { return (u.nickname ?? u.email ?? 'Unknown') as string; }
	function creatureName(c: Creature) { return `${String((c as Record<string,unknown>).species ?? '?')} — ${String((c as Record<string,unknown>).name ?? 'Unnamed')} (Lvl ${Number((c as Record<string,unknown>).level ?? 1)})`; }

	function getCategory(c: Creature): string {
		if (typeof window === 'undefined') return 'default';
		const db = (window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>> | undefined;
		return String(db?.[String((c as Record<string,unknown>).species ?? '')]?.category ?? 'default');
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

	async function respondOffer(offerId: number, action: 'accept'|'reject') {
		await fetch('/api/offers', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ offerId, action }) });
		location.reload();
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Marketplace</h1>
			<div class="page-subtitle">Trade specimens with survivors</div>
		</div>
		<button class="btn btn-primary" onclick={() => listOpen = true}><Plus size={14} /> List Specimen</button>
	</div>

	<div class="mkt-tabs">
		{#each [['browse','Browse'],['mine','My Listings'],['offers','Incoming Offers']] as [t, label]}
			<button class="mkt-tab" class:active={tab === t} onclick={() => tab = t as 'browse'|'mine'|'offers'}>{label}</button>
		{/each}
	</div>

	{#if tab === 'browse'}
		{#if trades.length === 0}
			<div class="mkt-empty">No open listings right now. Check back soon.</div>
		{:else}
			<div class="mkt-grid">
				{#each trades as t}
					{@const td = t as Record<string,unknown>}
					{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
					{@const cat = typeof window !== 'undefined' ? String(((window as Record<string,unknown>).EXPANDED_SPECIES_DATABASE as Record<string,Record<string,unknown>>)?.[String(cd.species ?? '')]?.category ?? 'default') : 'default'}
					{@const rgb = ({combat:'239,68,68',flyer:'6,182,212',utility:'34,197,94',water:'59,130,246',boss:'245,158,11',mount:'249,115,22',resource:'167,139,250'})[cat] ?? '0,180,255'}
					<div class="cham-shell mkt-card {cat}" style="--cat-rgb:{rgb}">
						<div class="mkt-card-inner">
							<div class="mkt-card-header">
								<div class="cat-badge-v3" style="--cat-rgb:{rgb}"><CategoryIcon category={cat} size={11} />{cat.slice(0,3).toUpperCase()}</div>
								<div class="mkt-species">{String(cd.species ?? '?')}</div>
								<div class="mkt-seller">by {display(td.user as Record<string,unknown>)}</div>
							</div>
							<div class="mkt-name">{String(cd.name ?? 'Unnamed')} · Lvl {Number(cd.level ?? 1)} · {String(cd.gender ?? '?')}</div>
							{#if td.wanted}<div class="mkt-wanted">Looking for: <strong>{String(td.wanted)}</strong></div>{/if}
							{#if td.price}<div class="mkt-price">Price: <strong>{String(td.price)}</strong></div>{/if}
							<button class="btn btn-primary btn-sm mkt-offer-btn" onclick={() => { offerOpen = t; oCreatureId = null; oMessage = ''; }}>Make Offer</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

	{:else if tab === 'mine'}
		{#if myTrades.length === 0}
			<div class="mkt-empty">No active listings. Click "List Specimen" to post one.</div>
		{:else}
			{#each myTrades as t}
				{@const td = t as Record<string,unknown>}
				{@const cd = (td.creatureData ?? {}) as Record<string,unknown>}
				<div class="cham-shell mkt-row" style="--cut:6px">
					<div class="mkt-row-inner">
						<div class="mkt-row-info">
							<div class="mkt-species">{String(cd.species ?? '?')} — {String(cd.name ?? 'Unnamed')}</div>
							<div class="mkt-meta">{String(td.status)} · {(td.offerCount as number) ?? 0} offer{(td.offerCount as number) !== 1 ? 's' : ''}</div>
							{#if td.wanted}<div class="mkt-meta">Wants: {String(td.wanted)}</div>{/if}
						</div>
						<button class="btn btn-danger btn-sm" onclick={() => removeTrade(td.id as number)}><X size={13} /></button>
					</div>
				</div>
			{/each}
		{/if}

	{:else}
		{#if offers.length === 0}
			<div class="mkt-empty">No incoming offers.</div>
		{:else}
			{#each offers as o}
				{@const od = o as Record<string,unknown>}
				{@const offerCd = (od.offeredCreatureData ?? {}) as Record<string,unknown>}
				<div class="cham-shell mkt-row" style="--cut:6px">
					<div class="mkt-row-inner">
						<div class="mkt-row-info">
							<div class="mkt-species">{display(od.fromUser as Record<string,unknown>)} offered: {String(offerCd.species ?? '?')} — {String(offerCd.name ?? 'No specimen')}</div>
							{#if od.offeredPrice}<div class="mkt-meta">Price: {String(od.offeredPrice)}</div>{/if}
							{#if od.message}<div class="mkt-meta">"{String(od.message)}"</div>{/if}
						</div>
						<div class="mkt-offer-actions">
							<button class="btn btn-primary btn-sm" onclick={() => respondOffer(od.id as number, 'accept')}><Check size={13} /></button>
							<button class="btn btn-danger  btn-sm" onclick={() => respondOffer(od.id as number, 'reject')}><X size={13} /></button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	{/if}
</div>

<!-- List modal -->
{#if listOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header">
			<h2 class="modal-title">List a Specimen</h2>
			<button class="close-btn" onclick={() => listOpen=false}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field">
				<label class="form-label" for="l-c">Select Specimen *</label>
				<select id="l-c" class="form-control" bind:value={lCreatureId}>
					<option value={null}>Choose...</option>
					{#each myCreatures as c}<option value={c.id}>{creatureName(c)}</option>{/each}
				</select>
			</div>
			<div class="plan-field">
				<label class="form-label" for="l-w">What are you looking for?</label>
				<input id="l-w" class="form-control" bind:value={lWanted} placeholder="e.g. High melee Rex female" />
			</div>
			<div class="plan-field">
				<label class="form-label" for="l-p">Price / notes</label>
				<input id="l-p" class="form-control" bind:value={lPrice} placeholder="e.g. Open to offers" />
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => listOpen=false}>Cancel</button>
			<button class="btn btn-primary" onclick={listCreature} disabled={saving || !lCreatureId}>{saving ? 'Listing...' : 'List'}</button>
		</div>
	</div>
</div>
{/if}

<!-- Offer modal -->
{#if offerOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:480px">
		<div class="modal-header">
			<h2 class="modal-title">Make an Offer</h2>
			<button class="close-btn" onclick={() => offerOpen=null}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:12px">
			<div class="plan-field">
				<label class="form-label" for="o-c">Offer a Specimen (optional)</label>
				<select id="o-c" class="form-control" bind:value={oCreatureId}>
					<option value={null}>None — offer text only</option>
					{#each myCreatures as c}<option value={c.id}>{creatureName(c)}</option>{/each}
				</select>
			</div>
			<div class="plan-field">
				<label class="form-label" for="o-m">Message</label>
				<textarea id="o-m" class="form-control" rows="2" bind:value={oMessage} placeholder="Tell them about your offer..."></textarea>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => offerOpen=null}>Cancel</button>
			<button class="btn btn-primary" onclick={makeOffer} disabled={saving}>{saving ? 'Sending...' : 'Send Offer'}</button>
		</div>
	</div>
</div>
{/if}

<style>
.mkt-tabs { display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.06); }
.mkt-tab { background:none; border:none; border-bottom:2px solid transparent; color:#64748b; font-size:0.82rem; font-weight:500; padding:8px 14px; cursor:pointer; margin-bottom:-1px; font-family:inherit; transition:color .15s,border-color .15s; }
.mkt-tab:hover { color:#94a3b8; }
.mkt-tab.active { color:#f1f5f9; border-bottom-color:#00b4ff; }
.mkt-empty { color:#475569; padding:40px 0; text-align:center; font-size:0.88rem; }

.mkt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.mkt-card { --cut:9px; }
.mkt-card-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:16px 18px; display:flex; flex-direction:column; gap:8px; }
.mkt-card-header { display:flex; align-items:center; gap:8px; }
.mkt-species { font-size:0.95rem; font-weight:700; color:#f1f5f9; flex:1; }
.mkt-seller { font-size:0.7rem; color:#475569; }
.mkt-name { font-size:0.8rem; color:#94a3b8; }
.mkt-wanted,.mkt-price { font-size:0.78rem; color:#64748b; }
.mkt-wanted strong,.mkt-price strong { color:#94a3b8; }
.mkt-offer-btn { align-self:flex-start; margin-top:4px; }

.mkt-row { margin-bottom:5px; }
.mkt-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:center; gap:12px; }
.mkt-row-info { flex:1; min-width:0; }
.mkt-meta { font-size:0.72rem; color:#64748b; margin-top:2px; }
.mkt-offer-actions { display:flex; gap:6px; flex-shrink:0; }
</style>
