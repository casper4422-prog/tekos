<script lang="ts">
    import { Shield, MessageSquare, UserPlus, Sword, Award } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import HexAvatar from '$lib/components/HexAvatar.svelte';

    let { data }: { data: PageData } = $props();

    const displayName = $derived(data.profile.nickname ?? data.profile.discordName ?? 'Unknown survivor');
    const memberSince = $derived(
        new Date(data.profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    );

    const friendshipStatus = $derived(() => {
        if (data.isSelf) return 'self';
        if (!data.friendship) return 'none';
        if (data.friendship.status === 'accepted') return 'friends';
        return 'pending';
    });

    let actionLoading = $state(false);

    async function sendFriendRequest() {
        actionLoading = true;
        await fetch('/api/friends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ friendId: data.profile.id })
        });
        actionLoading = false;
        window.location.reload();
    }

    const tierGlyph: Record<string, string> = {
        diamond: '✦', gold: '◈', silver: '⬢', bronze: '⬢',
        titan: '◆',   alpha: 'α', beta: 'β', gamma: 'γ'
    };
</script>

<svelte:head>
    <title>⬡ TekOS — {displayName}</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title={displayName}
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Survivors', href: '/survivors' },
            { label: displayName }
        ]}
    />

    <!-- ═════════════ IDENTITY BANNER ═════════════ -->
    <section class="identity-banner">
        <div class="banner-image"></div>

        <div class="identity-card">
            <HexAvatar name={displayName} size={88} online={data.isOnline} />

            <div class="identity-info">
                <div class="callsign">{displayName}</div>
                <div class="identity-meta">
                    {#if data.isOnline}
                        <span class="meta-chip online"><span class="tek-pip green pulse"></span>ONLINE</span>
                    {:else}
                        <span class="meta-chip"><span class="tek-pip"></span>OFFLINE</span>
                    {/if}
                    {#if data.tribe}
                        <span class="meta-chip tribe">
                            <Shield size={11} strokeWidth={2} />
                            {data.tribe.name}
                        </span>
                    {/if}
                    <span class="meta-chip">SURVIVOR SINCE {memberSince.toUpperCase()}</span>
                    {#if data.profile.discordName}
                        <span class="meta-chip">⌬ {data.profile.discordName}</span>
                    {/if}
                </div>
                {#if data.profile.bio}
                    <p class="identity-bio">{data.profile.bio}</p>
                {/if}
                {#if data.profile.lookingFor}
                    <p class="identity-bio looking">Looking for: <span>{data.profile.lookingFor}</span></p>
                {/if}
            </div>

            <div class="identity-actions">
                {#if friendshipStatus() === 'self'}
                    <a class="tek-btn-v2 ghost sm" href="/settings">EDIT PROFILE</a>
                {:else if friendshipStatus() === 'friends'}
                    <a class="tek-btn-v2 sm" href="/messages/{data.profile.id}">
                        <MessageSquare size={12} strokeWidth={2.5} /> MESSAGE
                    </a>
                    <span class="friend-pill"><span class="tek-pip green"></span>FRIEND</span>
                {:else if friendshipStatus() === 'pending'}
                    <span class="friend-pill amber">REQUEST PENDING</span>
                {:else}
                    <button class="tek-btn-v2 sm" onclick={sendFriendRequest} disabled={actionLoading}>
                        <UserPlus size={12} strokeWidth={2.5} /> {actionLoading ? '…' : 'ADD FRIEND'}
                    </button>
                    <a class="tek-btn-v2 ghost sm" href="/messages/{data.profile.id}">
                        <MessageSquare size={12} strokeWidth={2.5} /> MESSAGE
                    </a>
                {/if}
            </div>
        </div>
    </section>

    <!-- ═════════════ STATS ROW ═════════════ -->
    <div class="stats-row">
        <div class="stat-cell">
            <div class="stat-val">{data.stats.specimens}</div>
            <div class="stat-label">Specimens</div>
        </div>
        <div class="stat-cell">
            <div class="stat-val amber">
                {#if data.stats.tradeRep !== null}
                    {data.stats.tradeRep}<span class="star">★</span>
                {:else}
                    <span class="muted">—</span>
                {/if}
            </div>
            <div class="stat-label">Trade Rep</div>
        </div>
        <div class="stat-cell">
            <div class="stat-val gold">{data.stats.badges}</div>
            <div class="stat-label">Badges</div>
        </div>
        <div class="stat-cell">
            <div class="stat-val green">{data.stats.friends}</div>
            <div class="stat-label">Friends</div>
        </div>
    </div>

    <!-- ═════════════ BADGE WALL ═════════════ -->
    {#if data.stats.badges > 0}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Badge Wall</div>
                <div class="tek-section-meta"><span class="accent">{data.stats.badges} EARNED</span></div>
            </div>

            <div class="badge-cats">
                {#if data.badgeWall.bossReady.length > 0}
                    <div class="badge-cat">
                        <div class="badge-cat-head">
                            <Sword size={14} strokeWidth={2} />
                            <span class="badge-cat-name">Boss Ready</span>
                            <span class="badge-cat-count">{data.badgeWall.bossReady.length} earned</span>
                        </div>
                        <div class="badge-chips">
                            {#each data.badgeWall.bossReady as b}
                                <div class="badge-chip {b.tier}">
                                    <span class="chip-glyph">{tierGlyph[b.tier!]}</span>
                                    <div class="chip-body">
                                        <div class="chip-tier">{b.tier?.toUpperCase()}</div>
                                        <div class="chip-species">{b.species}</div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if data.badgeWall.bloodline.length > 0}
                    <div class="badge-cat">
                        <div class="badge-cat-head">
                            <Award size={14} strokeWidth={2} />
                            <span class="badge-cat-name">Prize Bloodline</span>
                            <span class="badge-cat-count">{data.badgeWall.bloodline.length} earned</span>
                        </div>
                        <div class="badge-chips">
                            {#each data.badgeWall.bloodline as b}
                                <div class="badge-chip {b.tier}">
                                    <span class="chip-glyph">{tierGlyph[b.tier!]}</span>
                                    <div class="chip-body">
                                        <div class="chip-tier">{b.tier?.toUpperCase()}</div>
                                        <div class="chip-species">{b.species}</div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        </section>
    {/if}

    <!-- ═════════════ RECENT SPECIMENS ═════════════ -->
    {#if data.creatures.length > 0}
        <section class="section-block">
            <div class="tek-section-head">
                <div class="tek-section-title">Recent Specimens</div>
                <div class="tek-section-meta">{data.creatures.length} TOTAL · {data.speciesOwned} SPECIES</div>
            </div>
            <div class="rec-grid">
                {#each data.creatures.slice(0, 6) as c}
                    <a class="rec-card" href="/specimens/{c.id}">
                        <div class="rec-species">{c.species.toUpperCase()}</div>
                        <div class="rec-name">{c.name}</div>
                        <div class="rec-meta">
                            <span class="gender" class:m={c.gender === 'Male'} class:f={c.gender === 'Female'}>
                                {c.gender === 'Female' ? '♀' : c.gender === 'Male' ? '♂' : '?'}
                            </span>
                            <span>LVL {c.level}</span>
                        </div>
                    </a>
                {/each}
            </div>
        </section>
    {/if}
</div>

<style>
.section-block { margin-bottom: 28px; }

/* Identity banner — same treatment as Dossier */
.identity-banner { position: relative; margin-bottom: 32px; }
.banner-image {
    height: 160px;
    background:
        linear-gradient(135deg, rgba(0,180,255,0.18) 0%, rgba(139,92,246,0.16) 50%, rgba(0,180,255,0.10) 100%),
        radial-gradient(circle 200px at 20% 50%, rgba(0,180,255,0.20), transparent 70%),
        radial-gradient(circle 240px at 80% 60%, rgba(139,92,246,0.20), transparent 70%),
        #0a1228;
    clip-path: polygon(16px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 16px);
    position: relative;
    overflow: hidden;
}
.banner-image::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 24px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.05) 0 1px, transparent 1px 24px);
    opacity: 0.6;
}
.banner-image::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 0%, transparent 50%, rgba(5,8,18,0.85) 100%);
}

.identity-card {
    position: relative;
    margin: -68px 24px 0;
    background: linear-gradient(160deg, rgba(10,18,44,0.96) 0%, rgba(4,8,20,0.99) 100%);
    backdrop-filter: blur(16px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 22px 28px;
    display: flex;
    align-items: flex-start;
    gap: 22px;
    z-index: 2;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.30)) drop-shadow(0 18px 50px rgba(0,0,0,0.55));
}
.identity-card::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.identity-info { flex: 1; min-width: 0; }
.callsign {
    font-family: var(--tek-display);
    font-size: clamp(1.5rem, 4vw, 2.2rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
    margin-bottom: 10px;
    text-transform: uppercase;
}
.identity-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.meta-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    padding: 3px 8px;
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.meta-chip.online { color: var(--tek-green); border-color: rgba(16,185,129,0.40); background: rgba(16,185,129,0.06); }
.meta-chip.tribe { color: var(--tek-purple); border-color: rgba(139,92,246,0.30); background: rgba(139,92,246,0.06); }
.identity-bio {
    font-family: var(--tek-serif);
    font-style: italic;
    color: var(--tek-text-dim);
    font-size: 0.94rem;
    line-height: 1.4;
    max-width: 560px;
}
.identity-bio.looking { font-style: normal; font-size: 0.78rem; color: var(--tek-text-faint); margin-top: 4px; }
.identity-bio.looking span { color: var(--tek-blue); font-family: var(--tek-mono); letter-spacing: 0.06em; }

.identity-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: flex-start; flex-wrap: wrap; }
.friend-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(16,185,129,0.10);
    border: 1px solid rgba(16,185,129,0.40);
    color: var(--tek-green);
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    padding: 5px 10px;
    text-transform: uppercase;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.friend-pill.amber { background: rgba(245,158,11,0.10); border-color: rgba(245,158,11,0.40); color: var(--tek-amber); }

/* Stats row */
.stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 32px;
}
@media (max-width: 600px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
.stat-cell {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 18px;
}
.stat-cell::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}
.stat-val {
    font-family: var(--tek-display);
    font-size: 1.7rem;
    font-weight: 800;
    line-height: 1;
    color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
    margin-bottom: 5px;
}
.stat-val.amber  { color: var(--tek-amber); text-shadow: 0 0 8px rgba(245,158,11,0.4); }
.stat-val.green  { color: var(--tek-green); text-shadow: 0 0 8px rgba(16,185,129,0.4); }
.stat-val.gold   { color: var(--tier-gold); text-shadow: 0 0 8px rgba(255,215,0,0.4); }
.stat-val .star  { font-size: 0.9rem; margin-left: 3px; }
.stat-val .muted { color: var(--tek-text-faint); }
.stat-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

/* Badge wall */
.badge-cats { display: flex; flex-direction: column; gap: 16px; }
.badge-cat {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.92) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 18px 16px;
}
.badge-cat::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.badge-cat-head {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 12px; padding-bottom: 8px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
    color: var(--tek-blue);
}
.badge-cat-name {
    font-family: var(--tek-display);
    font-size: 0.84rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--tek-text);
    flex: 1;
}
.badge-cat-count {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.badge-chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
}
.badge-chip {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(var(--tier-rgb, 0, 180, 255), 0.06);
    border: 1px solid rgba(var(--tier-rgb, 0, 180, 255), 0.30);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.badge-chip.bronze  { --tier-rgb: 205, 127, 50; }
.badge-chip.silver  { --tier-rgb: 200, 200, 210; }
.badge-chip.gold    { --tier-rgb: 255, 215, 0; }
.badge-chip.diamond { --tier-rgb: 0, 180, 255; box-shadow: 0 0 8px rgba(0, 180, 255, 0.20); }
.badge-chip.gamma   { --tier-rgb: 16, 185, 129; }
.badge-chip.beta    { --tier-rgb: 0, 180, 255; }
.badge-chip.alpha   { --tier-rgb: 244, 114, 182; }
.badge-chip.titan   { --tier-rgb: 0, 180, 255; box-shadow: 0 0 8px rgba(0, 180, 255, 0.20); }
.chip-glyph {
    font-family: var(--tek-display);
    font-size: 1.1rem;
    color: rgb(var(--tier-rgb));
    text-shadow: 0 0 6px rgba(var(--tier-rgb), 0.4);
    width: 22px;
    text-align: center;
}
.chip-body { line-height: 1.25; min-width: 0; }
.chip-tier {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: rgb(var(--tier-rgb));
    text-transform: uppercase;
    font-weight: 700;
}
.chip-species {
    font-size: 0.78rem;
    color: var(--tek-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Recent specimens grid */
.rec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
}
.rec-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 12px 14px;
    text-decoration: none;
    color: inherit;
    transition: all 0.15s;
}
.rec-card:hover {
    transform: translateY(-2px);
    border-color: var(--tek-blue);
}
.rec-card::before {
    content: '';
    position: absolute;
    left: 0; top: 10px; bottom: 0;
    width: 2px;
    background: var(--tek-blue);
    box-shadow: 0 0 5px var(--tek-blue-glow);
}
.rec-species {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.16em;
    color: var(--tek-blue);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.rec-name {
    font-family: var(--tek-display);
    font-size: 0.92rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.rec-meta {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    display: flex;
    gap: 8px;
    text-transform: uppercase;
}
.rec-meta .gender { color: var(--tek-text-dim); }
.rec-meta .gender.m { color: var(--tek-blue); }
.rec-meta .gender.f { color: var(--tek-pink); }
</style>
