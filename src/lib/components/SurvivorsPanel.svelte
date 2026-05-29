<script lang="ts">
    import { onMount } from 'svelte';

    type Survivor = {
        id: number; nickname: string | null; bio: string | null;
        online: boolean; lastSeen?: string | Date | null;
        specimens: number; tribe: { name: string } | null;
    };

    let survivors = $state<Survivor[]>([]);
    let total       = $state(0);
    let onlineCount = $state(0);
    let tribeCount     = $state(0);
    let bloodlineCount = $state(0);
    let page      = $state(1);
    let pages     = $state(1);
    let loading   = $state(false);
    let q         = $state('');
    let activeFilter = $state<'all' | 'online' | 'tribe'>('all');
    let sortMode = $state<'active' | 'specimens' | 'joined'>('active');

    async function load(reset = false) {
        if (reset) { page = 1; survivors = []; }
        loading = true;
        const params = new URLSearchParams({ page: String(page) });
        if (q.trim()) params.set('q', q.trim());
        if (activeFilter === 'online') params.set('online', 'true');
        if (activeFilter === 'tribe')  params.set('inTribe', 'true');
        params.set('sort', sortMode);
        const res = await fetch(`/api/survivors?${params}`);
        if (res.ok) {
            const data = await res.json();
            survivors = reset ? data.users : [...survivors, ...data.users];
            total = data.total;
            pages = data.pages;
            tribeCount = data.tribeCount ?? 0;
            bloodlineCount = data.bloodlineCount ?? 0;
            if (activeFilter === 'online') onlineCount = data.total;
        }
        loading = false;
    }

    async function refreshOnlineCount() {
        try {
            const r = await fetch('/api/survivors?online=true&page=1');
            if (r.ok) { const d = await r.json(); onlineCount = d.total; }
        } catch {}
    }

    function statusLabel(s: Survivor): string {
        if (s.online) return 'ACTIVE NOW';
        if (!s.lastSeen) return 'OFFLINE';
        const dt = new Date(s.lastSeen).getTime();
        const diff = Date.now() - dt;
        const m = Math.floor(diff / 60000);
        if (m < 60) return `OFFLINE · ${m}M AGO`;
        const h = Math.floor(m / 60);
        if (h < 24) return `OFFLINE · ${h}H AGO`;
        const d = Math.floor(h / 24);
        if (d < 7) return `OFFLINE · ${d}D AGO`;
        return `OFFLINE · ${Math.floor(d/7)}W AGO`;
    }

    function displayName(s: Survivor) { return s.nickname ?? 'Unknown survivor'; }
    function initial(s: Survivor) { return displayName(s).charAt(0).toUpperCase(); }
    function handle(s: Survivor) { return displayName(s); }

    function setFilter(f: 'all' | 'online' | 'tribe') {
        activeFilter = f;
        load(true);
    }
    function onSearchInput() { load(true); }
    function onSortChange(e: Event) {
        const v = (e.target as HTMLSelectElement).value as 'active' | 'specimens' | 'joined';
        sortMode = v;
        load(true);
    }

    onMount(() => {
        load();
        refreshOnlineCount();
    });
</script>

<!-- Telemetry strip -->
<div class="telemetry-strip">
    <div class="tel-cell">
        <div class="tel-label">Total Survivors</div>
        <div class="tel-value blue">{total.toLocaleString()}</div>
        <div class="tel-sub">REGISTERED ON TEKOS</div>
    </div>
    <div class="tel-cell green">
        <div class="tel-label">Online Now</div>
        <div class="tel-value green">{onlineCount.toLocaleString()}</div>
        <div class="tel-sub"><span class="pip"></span>LIVE COUNT</div>
    </div>
    <div class="tel-cell purple">
        <div class="tel-label">Active Tribes</div>
        <div class="tel-value purple">{tribeCount.toLocaleString()}</div>
        <div class="tel-sub">FORMED ACROSS NETWORK</div>
    </div>
    <div class="tel-cell amber">
        <div class="tel-label">Bloodlines Logged</div>
        <div class="tel-value amber">{bloodlineCount.toLocaleString()}</div>
        <div class="tel-sub">SPECIMENS LOGGED TOTAL</div>
    </div>
</div>

<!-- Filter bar -->
<div class="filter-bar">
    <input type="text" class="search-input"
        bind:value={q}
        oninput={onSearchInput}
        placeholder="Search by name, handle, tribe, or bio…" />
    <button type="button" class="filter-chip" class:on={activeFilter === 'all'} onclick={() => setFilter('all')}>All <span class="num">{total.toLocaleString()}</span></button>
    <button type="button" class="filter-chip" class:on={activeFilter === 'online'} onclick={() => setFilter('online')}><span class="dot"></span>Online <span class="num">{onlineCount.toLocaleString()}</span></button>
    <button type="button" class="filter-chip" class:on={activeFilter === 'tribe'} onclick={() => setFilter('tribe')}>In a tribe <span class="num">{tribeCount.toLocaleString()}</span></button>
    <select class="sort-select" value={sortMode} onchange={onSortChange}>
        <option value="active">Sort: Most active</option>
        <option value="specimens">Sort: Most specimens</option>
        <option value="joined">Sort: Recently joined</option>
    </select>
</div>

<!-- DIRECTORY GRID -->
<div class="directory-block">
    <div class="section-head">
        <div class="section-title-wrap">
            <div class="section-title">All Survivors</div>
        </div>
        <div class="section-meta">SHOWING {survivors.length.toLocaleString()} OF {total.toLocaleString()}</div>
    </div>

    <div class="dir-grid">
        {#each survivors as s (s.id)}
            <a href="/survivors/{s.id}" class="dir-card" class:online={s.online}>
                <div class="dir-card-head">
                    <div class="dir-avatar">
                        <svg viewBox="0 0 44 50"><defs><linearGradient id="a-{s.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00b4ff"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs><polygon points="22,3 40,13 40,37 22,47 4,37 4,13" fill="rgba(10,18,44,0.85)" stroke="url(#a-{s.id})" stroke-width="2"/><text x="22" y="30" font-family="Orbitron" font-size="14" font-weight="900" fill="url(#a-{s.id})" text-anchor="middle">{initial(s)}</text></svg>
                        <div class="dir-avatar-pip" class:online={s.online}></div>
                    </div>
                    <div class="dir-meta">
                        <div class="dir-name">{displayName(s)}</div>
                        <div class="dir-handle">@{handle(s)}</div>
                        <div class="dir-status" class:online={s.online} class:offline={!s.online}><span class="pip"></span>{statusLabel(s)}</div>
                    </div>
                </div>
                {#if s.tribe}
                    <div class="dir-tribe">
                        <div class="sigil"></div>
                        <div class="name">{s.tribe.name}</div>
                    </div>
                {:else}
                    <div class="dir-no-tribe">— No tribe —</div>
                {/if}
                <div class="dir-bio">{s.bio ?? '"No bio yet."'}</div>
                <div class="dir-stats">
                    <div class="dir-stat"><div class="dir-stat-val">{s.specimens}</div><div class="dir-stat-label">Specimens</div></div>
                    <div class="dir-stat"><div class="dir-stat-val rep">—</div><div class="dir-stat-label">Trade Rep</div></div>
                    <div class="dir-stat"><div class="dir-stat-val">—</div><div class="dir-stat-label">Badges</div></div>
                    <div class="dir-stat"><div class="dir-stat-val">—</div><div class="dir-stat-label">Friends</div></div>
                </div>
            </a>
        {/each}
    </div>

    <div class="empty-state" class:show={!loading && survivors.length === 0}>
        <div class="empty-icon">⬡</div>
        <div class="empty-title">No Survivors Found</div>
        <div class="empty-flavor">"The wild is quiet."</div>
    </div>

    {#if survivors.length > 0 && page < pages}
        <div class="dir-footer">
            <div class="dir-footer-info">SHOWING <span class="accent">{survivors.length.toLocaleString()}</span> OF {total.toLocaleString()} SURVIVORS</div>
            <button class="btn-load" onclick={() => { page++; load(false); }} disabled={loading}>{loading ? 'LOADING…' : '▾ LOAD MORE SURVIVORS'}</button>
        </div>
    {:else if survivors.length > 0}
        <div class="dir-footer">
            <div class="dir-footer-info">SHOWING <span class="accent">{survivors.length.toLocaleString()}</span> OF {total.toLocaleString()} SURVIVORS</div>
        </div>
    {/if}
</div>

<style>
.telemetry-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
@media (max-width: 720px) { .telemetry-strip { grid-template-columns: repeat(2, 1fr); } }
.tel-cell {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.15);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 18px; overflow: hidden;
}
.tel-cell::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 0; width: 2px; background: var(--tek-blue); box-shadow: 0 0 6px var(--tek-blue-glow); }
.tel-cell.green::before { background: var(--tek-green); box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.tel-cell.purple::before { background: var(--tek-purple); box-shadow: 0 0 6px rgba(139,92,246,0.5); }
.tel-cell.amber::before { background: var(--tek-amber); box-shadow: 0 0 6px rgba(245,158,11,0.5); }
.tel-label { font-family: var(--tek-mono); font-size: 0.6rem; letter-spacing: 0.20em; color: var(--tek-text-faint); text-transform: uppercase; margin-bottom: 4px; }
.tel-value { font-family: var(--tek-display); font-size: 1.5rem; font-weight: 800; color: var(--tek-text); line-height: 1.1; margin-bottom: 2px; }
.tel-value.green  { color: var(--tek-green);  text-shadow: 0 0 8px rgba(16,185,129,0.40); }
.tel-value.blue   { color: var(--tek-blue);   text-shadow: 0 0 8px var(--tek-blue-glow); }
.tel-value.purple { color: var(--tek-purple); text-shadow: 0 0 8px rgba(139,92,246,0.40); }
.tel-value.amber  { color: var(--tek-amber);  text-shadow: 0 0 8px rgba(245,158,11,0.40); }
.tel-sub { font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.10em; color: var(--tek-text-dim); text-transform: uppercase; }
.tel-sub .pip { display: inline-block; width: 5px; height: 5px; border-radius: 50%; margin-right: 5px; background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.6); animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.filter-bar { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; align-items: center; }
.search-input {
    flex: 1; min-width: 240px; background: rgba(5,8,18,0.7);
    border: 1px solid var(--tek-blue-border); color: var(--tek-text);
    font-family: var(--tek-mono); font-size: 0.84rem;
    padding: 11px 14px 11px 38px;
    clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
    transition: all 0.15s;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2300b4ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: 14px center;
}
.search-input::placeholder { color: var(--tek-text-faint); }
.search-input:focus { outline: none; border-color: var(--tek-blue); box-shadow: 0 0 0 1px var(--tek-blue), 0 0 12px rgba(0,180,255,0.25); background-color: rgba(5,8,18,0.9); }

.filter-chip { background: rgba(5,8,18,0.6); border: 1px solid rgba(100,116,139,0.25); color: var(--tek-text-dim); font-family: var(--tek-mono); font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 9px 14px; cursor: pointer; clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%); transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
.filter-chip:hover { border-color: var(--tek-blue-border); color: var(--tek-text); }
.filter-chip.on { background: rgba(0,180,255,0.10); border-color: var(--tek-blue); color: var(--tek-blue); box-shadow: 0 0 8px rgba(0,180,255,0.20); }
.filter-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.filter-chip .num { color: var(--tek-text-faint); font-size: 0.62rem; margin-left: 4px; }
.filter-chip.on .num { color: var(--tek-blue); }

.sort-select { background: rgba(5,8,18,0.6); border: 1px solid rgba(100,116,139,0.25); color: var(--tek-text); font-family: var(--tek-mono); font-size: 0.74rem; letter-spacing: 0.10em; padding: 9px 30px 9px 14px; clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%); appearance: none; -webkit-appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%); background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%; background-size: 5px 5px; background-repeat: no-repeat; cursor: pointer; text-transform: uppercase; }
.sort-select:focus { outline: none; border-color: var(--tek-blue); }

.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,180,255,0.10); }
.section-title-wrap { display: flex; align-items: center; gap: 10px; }
.section-title { font-family: var(--tek-display); font-size: 0.9rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tek-text); display: flex; align-items: center; gap: 8px; }
.section-title::before { content: '◈'; color: var(--tek-blue); }
.section-meta { font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.14em; color: var(--tek-text-dim); text-transform: uppercase; }

.directory-block { margin-bottom: 24px; }
.dir-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(295px, 1fr)); gap: 12px; }

.dir-card { position: relative; background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%); border: 1px solid rgba(100,116,139,0.18); clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px); padding: 14px 16px; cursor: pointer; transition: all 0.2s; overflow: hidden; text-decoration: none; color: inherit; display: block; }
.dir-card:hover { transform: translateY(-2px); border-color: var(--tek-blue-border); box-shadow: 0 6px 18px rgba(0,180,255,0.10); }
.dir-card.online::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 0; width: 2px; background: var(--tek-green); box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.dir-card-head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
.dir-avatar { width: 44px; height: 50px; flex-shrink: 0; position: relative; }
.dir-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 6px rgba(0,180,255,0.30)); }
.dir-avatar-pip { position: absolute; bottom: 2px; right: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--tek-text-faint); border: 2px solid var(--tek-bg); }
.dir-avatar-pip.online { background: var(--tek-green); box-shadow: 0 0 5px rgba(16,185,129,0.6); }
.dir-meta { flex: 1; min-width: 0; }
.dir-name { font-family: var(--tek-display); font-size: 0.96rem; font-weight: 700; letter-spacing: 0.03em; color: var(--tek-text); line-height: 1.15; margin-bottom: 3px; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dir-handle { font-family: var(--tek-mono); font-size: 0.66rem; letter-spacing: 0.08em; color: var(--tek-text-dim); margin-bottom: 4px; }
.dir-status { display: flex; align-items: center; gap: 5px; font-family: var(--tek-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; }
.dir-status.online { color: var(--tek-green); }
.dir-status.offline { color: var(--tek-text-faint); }
.dir-status .pip { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.dir-status.online .pip { box-shadow: 0 0 4px rgba(16,185,129,0.5); }

.dir-tribe { display: inline-flex; align-items: center; gap: 6px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.30); padding: 3px 8px 3px 4px; margin-bottom: 8px; clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%); font-family: var(--tek-mono); font-size: 0.66rem; color: var(--tek-purple); letter-spacing: 0.08em; max-width: 100%; overflow: hidden; }
.dir-tribe .sigil { width: 14px; height: 14px; background: linear-gradient(135deg, var(--tek-purple), var(--tek-blue)); clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); flex-shrink: 0; }
.dir-tribe .name { text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.dir-bio { font-family: var(--tek-serif, Georgia, serif); font-style: italic; font-size: 0.82rem; color: var(--tek-text-dim); line-height: 1.4; margin-bottom: 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 2.3em; }

.dir-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding-top: 10px; border-top: 1px solid rgba(0,180,255,0.08); }
.dir-stat { text-align: center; }
.dir-stat-val { font-family: var(--tek-mono); font-size: 0.84rem; font-weight: 700; color: var(--tek-text); }
.dir-stat-val.rep { color: var(--tek-amber); }
.dir-stat-label { font-family: var(--tek-mono); font-size: 0.52rem; letter-spacing: 0.16em; color: var(--tek-text-faint); text-transform: uppercase; margin-top: 2px; }
.dir-no-tribe { font-family: var(--tek-mono); font-size: 0.66rem; color: var(--tek-text-faint); letter-spacing: 0.10em; text-transform: uppercase; padding: 3px 8px; margin-bottom: 8px; display: inline-block; font-style: italic; }

.dir-footer { margin-top: 22px; text-align: center; padding: 16px 0; }
.dir-footer-info { font-family: var(--tek-mono); font-size: 0.7rem; letter-spacing: 0.12em; color: var(--tek-text-dim); text-transform: uppercase; margin-bottom: 12px; }
.dir-footer-info .accent { color: var(--tek-blue); }
.btn-load { background: rgba(0,180,255,0.08); border: 1px solid var(--tek-blue-border); color: var(--tek-blue); font-family: var(--tek-mono); font-size: 0.74rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 12px 28px; cursor: pointer; clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%); transition: all 0.15s; }
.btn-load:hover { background: rgba(0,180,255,0.18); box-shadow: 0 0 14px rgba(0,180,255,0.30); }

.empty-state { text-align: center; padding: 80px 20px; display: none; }
.empty-state.show { display: block; }
.empty-icon { width: 60px; height: 60px; margin: 0 auto 16px; border: 1px solid rgba(100,116,139,0.30); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--tek-text-faint); font-size: 1.6rem; }
.empty-title { font-family: var(--tek-display); font-size: 1.05rem; font-weight: 700; letter-spacing: 0.10em; color: var(--tek-text-dim); text-transform: uppercase; margin-bottom: 8px; }
.empty-flavor { font-family: var(--tek-serif, Georgia, serif); font-style: italic; color: var(--tek-text-faint); font-size: 0.95rem; }
</style>
