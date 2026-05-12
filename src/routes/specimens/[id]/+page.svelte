<script lang="ts">
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import BloodlineBadge from '$lib/components/BloodlineBadge.svelte';
    import { computeBadges, getStat } from '$lib/badges';
    import { Edit2, Trash2, Pin } from 'lucide-svelte';

    let { data }: { data: PageData } = $props();
    const c = $derived(data.creature);

    const STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'] as const;

    const badges = $derived(computeBadges(c.baseStats, c.mutations));

    function totalLevel(s: typeof STATS[number]) {
        return getStat(c.baseStats, s) + getStat(c.mutations, s) * 2;
    }

    const totalMuts = $derived(STATS.reduce((sum, s) => sum + getStat(c.mutations, s), 0));
    const grandTotal = $derived(STATS.reduce((sum, s) => sum + totalLevel(s), 0));

    const ownerName = $derived(data.owner.nickname ?? data.owner.email);

    async function deleteSpecimen() {
        if (!confirm(`Delete "${c.name}" from your vault? This cannot be undone.`)) return;
        const res = await fetch(`/api/creatures/${c.id}`, { method: 'DELETE' });
        if (res.ok) window.location.href = '/specimens';
    }
</script>

<svelte:head>
    <title>⬡ TekOS — {c.name} · {c.species}</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title={c.name}
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Vault', href: '/specimens' },
            { label: c.name }
        ]}
        sub={`${c.species} · level ${c.level} · ${c.gender}`}
    />

    <!-- Action row (owner only) -->
    {#if data.isOwner}
        <div class="action-row">
            <a class="tek-btn-v2" href="/specimens/{c.id}/edit">
                <Edit2 size={12} strokeWidth={2.5} />
                EDIT
            </a>
            <a class="tek-btn-v2 ghost" href="/specimens/{c.id}/edit?pin=1">
                <Pin size={12} strokeWidth={2.5} />
                PIN AS PROJECT
            </a>
            <div class="spacer"></div>
            <button class="tek-btn-v2 danger" onclick={deleteSpecimen}>
                <Trash2 size={12} strokeWidth={2.5} />
                DELETE
            </button>
        </div>
    {:else}
        <div class="owner-note">
            Logged by <a href="/survivors/{data.owner.id}">{ownerName}</a> · {new Date(c.createdAt).toLocaleDateString()}
        </div>
    {/if}

    <!-- ═════════════ HERO ═════════════ -->
    <div class="hero-card">
        <div class="hero-head">
            <div class="hero-species">{c.species.toUpperCase()}</div>
            <div class="hero-meta">
                <span class="gender" class:m={c.gender === 'Male'} class:f={c.gender === 'Female'}>
                    {c.gender === 'Female' ? '♀' : c.gender === 'Male' ? '♂' : '?'}
                </span>
                <span>LVL {c.level}</span>
                {#if c.server}<span>·</span><span class="server">{c.server}</span>{/if}
            </div>
        </div>
        <h2 class="hero-name">{c.name}</h2>

        <!-- Bragging numbers -->
        <div class="brag-row">
            <div class="brag">
                <div class="brag-val">{grandTotal}</div>
                <div class="brag-label">Total Level</div>
            </div>
            <div class="brag">
                <div class="brag-val mut">{totalMuts}</div>
                <div class="brag-label">Mutations</div>
            </div>
            <div class="brag">
                <BloodlineBadge base={c.baseStats} size="md" />
            </div>
            {#if badges.bossReady}
                <div class="brag">
                    <span class="tier-pill {badges.bossReady}" style="font-size: 0.7rem; padding: 4px 10px;">
                        {badges.bossReady === 'titan' ? '◆ TITAN SLAYER' :
                         badges.bossReady === 'alpha' ? 'α ALPHA READY' :
                         badges.bossReady === 'beta'  ? 'β BETA READY'  :
                         'γ GAMMA READY'}
                    </span>
                </div>
            {/if}
        </div>

        <!-- Stat table -->
        <div class="stat-table">
            <div class="stat-header">
                <div>Stat</div>
                <div class="r">Base</div>
                <div class="r">Mutations</div>
                <div class="r">Total</div>
            </div>
            {#each STATS as s}
                {@const base = getStat(c.baseStats, s)}
                {@const mut  = getStat(c.mutations, s)}
                <div class="stat-row">
                    <span class="sr-label">{s}</span>
                    <span class="sr-base">{base}</span>
                    <span class="sr-mut" class:has-mut={mut > 0}>{mut > 0 ? `+${mut}` : '·'}</span>
                    <span class="sr-total" class:bumped={mut > 0}>{base + mut * 2}</span>
                </div>
            {/each}
        </div>

        {#if badges.roles.length > 0}
            <div class="role-badges">
                <div class="role-badges-label">Specialist roles</div>
                <div class="role-badges-list">
                    {#each badges.roles as r}
                        <span class="tier-pill role">
                            {r === 'tank' ? '▣ BOSS TANK' :
                             r === 'dps' ? '⚔ BOSS DPS' :
                             r === 'bruiser' ? '⚒ BOSS BRUISER' : '⤳ BOSS RUNNER'}
                        </span>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- ═════════════ NOTES ═════════════ -->
    {#if c.notes}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Notes</div>
            </div>
            <div class="notes-block">{c.notes}</div>
        </section>
    {/if}

    <!-- ═════════════ INFO ═════════════ -->
    <section class="section-block">
        <div class="tek-section-head">
            <div class="tek-section-title">Bloodline Record</div>
        </div>
        <div class="info-grid">
            <div class="info-cell">
                <div class="info-label">Logged</div>
                <div class="info-val">{new Date(c.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
            <div class="info-cell">
                <div class="info-label">Logged by</div>
                <div class="info-val"><a href="/survivors/{data.owner.id}">{ownerName}</a></div>
            </div>
            {#if c.server}
                <div class="info-cell">
                    <div class="info-label">Home server</div>
                    <div class="info-val">{c.server}</div>
                </div>
            {/if}
            <div class="info-cell">
                <div class="info-label">Specimen ID</div>
                <div class="info-val mono">#{c.id}</div>
            </div>
        </div>
    </section>
</div>

<style>
.action-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.action-row .spacer { flex: 1; }
.owner-note {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    color: var(--tek-text-dim);
    margin-bottom: 18px;
}
.owner-note a { color: var(--tek-blue); text-decoration: none; }
.owner-note a:hover { text-shadow: 0 0 6px var(--tek-blue-glow); }

/* Hero */
.hero-card {
    position: relative;
    background:
        radial-gradient(ellipse 60% 80% at 30% 20%, rgba(0,180,255,0.08) 0%, transparent 65%),
        linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid rgba(0,180,255,0.30);
    clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
    padding: 24px 28px 26px;
    margin-bottom: 28px;
    overflow: hidden;
}
.hero-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 22px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 22px);
    pointer-events: none;
    opacity: 0.6;
}
.hero-card > * { position: relative; z-index: 1; }

.hero-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
.hero-species {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.20em;
    color: var(--tek-blue);
    text-transform: uppercase;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.hero-meta {
    display: flex; gap: 10px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.hero-meta .gender { font-size: 0.96rem; }
.hero-meta .gender.m { color: var(--tek-blue); }
.hero-meta .gender.f { color: var(--tek-pink); }
.hero-meta .server { color: var(--tek-blue); }

.hero-name {
    font-family: var(--tek-display);
    font-size: clamp(1.8rem, 4.5vw, 2.8rem);
    font-weight: 900;
    letter-spacing: 0.04em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 65%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.35));
    text-transform: uppercase;
    margin: 8px 0 18px;
    word-break: break-word;
}

.brag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 28px;
    align-items: center;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.brag { display: flex; flex-direction: column; align-items: flex-start; }
.brag-val {
    font-family: var(--tek-display);
    font-size: 1.8rem;
    font-weight: 800;
    line-height: 1;
    color: var(--tek-blue);
    text-shadow: 0 0 10px var(--tek-blue-glow);
}
.brag-val.mut { color: var(--tek-purple); text-shadow: 0 0 10px rgba(139,92,246,0.4); }
.brag-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 4px;
}

/* Stat table */
.stat-table { display: grid; grid-template-columns: 70px 1fr 1fr 1fr; gap: 4px 16px; }
.stat-header { display: contents; }
.stat-header > div {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.stat-header > .r { text-align: right; }
.stat-row { display: contents; }
.stat-row > * {
    padding: 8px 0;
    border-bottom: 1px solid rgba(100,116,139,0.10);
    align-self: baseline;
}
.stat-row:last-of-type > * { border-bottom: none; }
.sr-label {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.sr-base, .sr-mut, .sr-total {
    font-family: var(--tek-mono);
    font-size: 1rem;
    text-align: right;
}
.sr-base { color: var(--tek-text); }
.sr-mut { color: var(--tek-text-faint); }
.sr-mut.has-mut { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); font-weight: 700; }
.sr-total { color: var(--tek-text); font-weight: 600; }
.sr-total.bumped { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); font-weight: 700; }

.role-badges { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(0,180,255,0.10); }
.role-badges-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 10px;
}
.role-badges-list { display: flex; flex-wrap: wrap; gap: 6px; }

.section-block { margin-bottom: 26px; }
.notes-block {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    border-left: 2px solid var(--tek-purple);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 14px 18px;
    font-family: var(--tek-serif);
    font-size: 0.96rem;
    color: var(--tek-text);
    line-height: 1.55;
    white-space: pre-wrap;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
}
.info-cell {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.15);
    padding: 12px 14px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.info-label {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.info-val { font-size: 0.86rem; color: var(--tek-text); }
.info-val.mono { font-family: var(--tek-mono); }
.info-val a { color: var(--tek-blue); text-decoration: none; }
.info-val a:hover { text-shadow: 0 0 6px var(--tek-blue-glow); }
</style>
