<script lang="ts">
    import { onMount } from 'svelte';
    import {
        User, Lock, Bell, Palette, Server, Database, Plug, AlertTriangle, Check, Loader
    } from 'lucide-svelte';
    import type { PageData } from './$types';
    import PageHeader from '$lib/components/PageHeader.svelte';

    let { data }: { data: PageData } = $props();

    type SectionId = 'account' | 'privacy' | 'notifications' | 'themes' | 'cluster' | 'data' | 'integrations';

    let activeSection = $state<SectionId>('account');

    // ── Account form state ──────────────────────────────────────────────────
    let nickname   = $state(data.profile?.nickname ?? '');
    let bio        = $state(data.profile?.bio ?? '');
    let lookingFor = $state(data.profile?.lookingFor ?? '');
    let profSaving = $state(false);
    let profMsg    = $state('');
    let profErr    = $state(false);

    let curPwd    = $state('');
    let newPwd    = $state('');
    let pwdSaving = $state(false);
    let pwdMsg    = $state('');
    let pwdErr    = $state(false);

    async function saveProfile() {
        profSaving = true; profMsg = ''; profErr = false;
        const res = await fetch('/api/profile', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname:   nickname.trim() || null,
                bio:        bio.trim() || null,
                lookingFor: lookingFor.trim() || null
            })
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
            profMsg = '✓ Codex updated.';
            setTimeout(() => profMsg = '', 2500);
        } else {
            profMsg = body.error ?? 'Failed to save'; profErr = true;
        }
        profSaving = false;
    }

    async function changePassword() {
        if (!curPwd || !newPwd) return;
        pwdSaving = true; pwdMsg = ''; pwdErr = false;
        const res = await fetch('/api/profile', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd })
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
            pwdMsg = '✓ Passcode updated.';
            curPwd = ''; newPwd = '';
            setTimeout(() => pwdMsg = '', 2500);
        } else {
            pwdMsg = body.error ?? 'Failed'; pwdErr = true;
        }
        pwdSaving = false;
    }

    // ── Theme palettes ──────────────────────────────────────────────────────
    type MapPalette = {
        id: string; name: string; tag: string;
        primary: string; accent: string; bg: string;
        locked?: boolean; unlockReq?: string;
    };
    const PALETTES: MapPalette[] = [
        { id: 'island',     name: 'The Island',      tag: 'CYAN · DEFAULT',         primary: '#00b4ff', accent: '#8b5cf6', bg: '#050812' },
        { id: 'aberration', name: 'Aberration',      tag: 'BIO · PURPLE/GREEN',     primary: '#a855f7', accent: '#10b981', bg: '#0c0418' },
        { id: 'scorched',   name: 'Scorched Earth',  tag: 'DESERT · AMBER/RED',     primary: '#f59e0b', accent: '#ef4444', bg: '#1a0a04' },
        { id: 'genesis',    name: 'Genesis',         tag: 'SIM · TEAL/MAGENTA',     primary: '#22d3ee', accent: '#d946ef', bg: '#040818' },
        { id: 'extinction', name: 'Extinction',      tag: 'RUIN · ORANGE/TEAL',     primary: '#fb923c', accent: '#14b8a6', bg: '#180a04' },
        { id: 'ragnarok',   name: 'Ragnarok',        tag: 'NORDIC · BLUE/GOLD',     primary: '#60a5fa', accent: '#fcd34d', bg: '#040818' }
    ];
    let activePaletteId = $state('island');
    let themeSaving = $state(false);
    let themeMsg = $state('');

    function hexToRgb(h: string) {
        const r = parseInt(h.slice(1,3),16), g = parseInt(h.slice(3,5),16), b = parseInt(h.slice(5,7),16);
        return `${r},${g},${b}`;
    }
    function applyThemeToDom(p: MapPalette) {
        const root = document.documentElement;
        root.style.setProperty('--tek-blue', p.primary);
        root.style.setProperty('--tek-blue-dim',    `rgba(${hexToRgb(p.primary)},0.12)`);
        root.style.setProperty('--tek-blue-border', `rgba(${hexToRgb(p.primary)},0.30)`);
        root.style.setProperty('--tek-blue-glow',   `rgba(${hexToRgb(p.primary)},0.50)`);
        root.style.setProperty('--tek-purple', p.accent);
        root.style.setProperty('--tek-bg',     p.bg);
    }
    async function selectPalette(p: MapPalette) {
        if (p.locked) return;
        activePaletteId = p.id;
        applyThemeToDom(p);
        themeSaving = true;
        try {
            await fetch('/api/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: { primary: p.primary, accent: p.accent, bg: p.bg } })
            });
            themeMsg = '✓ Palette saved';
            setTimeout(() => themeMsg = '', 2000);
        } catch {}
        themeSaving = false;
    }

    // AI Companion voice (stored locally; future server endpoint optional)
    type Voice = { id: string; name: string; sample: string; meta: string };
    const VOICES: Voice[] = [
        { id: 'stoic',     name: 'Stoic Tek',     sample: '"Implant link established. 47 specimens catalogued. No anomalies detected."', meta: 'FORMAL · MINIMAL' },
        { id: 'wry',       name: 'Wry Survivor',  sample: '"Welcome back. Your Yutyrannus still hasn\'t slept. Neither have you."',     meta: 'FRIENDLY · DRY' },
        { id: 'lore',      name: 'Lore-Keeper',   sample: '"The Obelisk hums. Bloodlines stir. Long is the road of the Survivor."',    meta: 'FLOWERY · LORE-HEAVY' },
        { id: 'mute',      name: 'Mute',          sample: '— No flavor text. Just the data.', meta: 'SILENT · DATA-ONLY' }
    ];
    let activeVoiceId = $state('wry');

    onMount(async () => {
        // Hydrate current palette + voice from /api/settings
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const body = await res.json();
                if (body.theme?.primary) {
                    const matched = PALETTES.find(p => p.primary.toLowerCase() === body.theme.primary.toLowerCase());
                    if (matched) activePaletteId = matched.id;
                }
                if (body.voiceId) activeVoiceId = body.voiceId;
            }
        } catch {}
    });
</script>

<svelte:head>
    <title>⬡ TekOS — Settings</title>
</svelte:head>

<div class="tek-stage">
    <PageHeader
        title="Settings"
        crumbs={[{ label: 'Dashboard', href: '/dossier' }, { label: 'Settings' }]}
        sub="Survivor identity, privacy, themes and cluster configuration."
    />

    <div class="settings-shell">

        <!-- LEFT NAV -->
        <nav class="side-nav">
            <div class="side-nav-label">Configure</div>
            <button class="nav-item" class:active={activeSection === 'account'} onclick={() => activeSection = 'account'}>
                <User size={14} strokeWidth={2} />
                <span>Account</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'privacy'} onclick={() => activeSection = 'privacy'}>
                <Lock size={14} strokeWidth={2} />
                <span>Privacy</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'notifications'} onclick={() => activeSection = 'notifications'}>
                <Bell size={14} strokeWidth={2} />
                <span>Notifications</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'themes'} onclick={() => activeSection = 'themes'}>
                <Palette size={14} strokeWidth={2} />
                <span>Themes</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'cluster'} onclick={() => activeSection = 'cluster'}>
                <Server size={14} strokeWidth={2} />
                <span>Cluster</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'data'} onclick={() => activeSection = 'data'}>
                <Database size={14} strokeWidth={2} />
                <span>Data</span>
            </button>
            <button class="nav-item" class:active={activeSection === 'integrations'} onclick={() => activeSection = 'integrations'}>
                <Plug size={14} strokeWidth={2} />
                <span>Integrations</span>
            </button>
        </nav>

        <!-- RIGHT PANEL -->
        <div class="panel">

            {#if activeSection === 'account'}
                <div class="section-header">
                    <div class="section-title">Account</div>
                    <div class="section-desc">Survivor identity, authentication, active sessions</div>
                </div>

                <div class="group">
                    <div class="group-label">Identity</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Survivor name</div>
                            <div class="row-hint">Shown on your Dossier, in trades, and across the network.</div>
                        </div>
                        <input class="tek-input-v2" bind:value={nickname} placeholder="The name the wild remembers" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Email</div>
                            <div class="row-hint">Used for sign-in and account recovery.</div>
                        </div>
                        <input class="tek-input-v2" value={data.profile?.email ?? ''} disabled />
                    </div>
                    <div class="row col">
                        <div class="row-info">
                            <div class="row-label">Bio</div>
                            <div class="row-hint">Up to 280 characters. Crimson Pro italic on your Dossier.</div>
                        </div>
                        <textarea class="tek-input-v2" rows="3" bind:value={bio}
                            placeholder="Hardcore breeder. Loaded Crysis cluster. Boss prep — gear, tames, gameplan."></textarea>
                    </div>
                    <div class="row col">
                        <div class="row-info">
                            <div class="row-label">Looking for</div>
                            <div class="row-hint">What you're seeking in trades or partnerships.</div>
                        </div>
                        <input class="tek-input-v2" bind:value={lookingFor}
                            placeholder="High-melee Yuty lines, Alpha Boss runs, etc." />
                    </div>
                    <div class="row">
                        <div></div>
                        <button class="tek-btn-v2 solid" onclick={saveProfile} disabled={profSaving}>
                            {#if profSaving}<Loader size={12} class="spin" />{/if}
                            {profSaving ? 'SAVING…' : 'SAVE CHANGES'}
                        </button>
                    </div>
                    {#if profMsg}
                        <div class="result-msg" class:error={profErr}>{profMsg}</div>
                    {/if}
                </div>

                <div class="group">
                    <div class="group-label">Linked accounts</div>
                    <div class="linked-row">
                        <div class="linked-icon discord">D</div>
                        <div class="linked-info">
                            <div class="linked-name">Discord</div>
                            <div class="linked-handle">
                                {data.profile?.discordName ?? 'Not linked'}
                            </div>
                        </div>
                        {#if data.profile?.discordName}
                            <div class="linked-status"><span class="dot"></span>LINKED</div>
                        {:else}
                            <a class="tek-btn-v2 sm" href="/api/auth/discord/start">LINK DISCORD</a>
                        {/if}
                    </div>
                    <div class="linked-row">
                        <div class="linked-icon email">@</div>
                        <div class="linked-info">
                            <div class="linked-name">Email</div>
                            <div class="linked-handle">{data.profile?.email ?? ''}</div>
                        </div>
                        <div class="linked-status verified"><span class="dot"></span>VERIFIED</div>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Change passcode</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Current passcode</div>
                        </div>
                        <input class="tek-input-v2" type="password" bind:value={curPwd} autocomplete="current-password" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">New passcode</div>
                            <div class="row-hint">At least 8 characters.</div>
                        </div>
                        <input class="tek-input-v2" type="password" bind:value={newPwd} autocomplete="new-password" />
                    </div>
                    <div class="row">
                        <div></div>
                        <button class="tek-btn-v2" onclick={changePassword} disabled={pwdSaving || !curPwd || !newPwd}>
                            {pwdSaving ? 'SAVING…' : 'UPDATE PASSCODE'}
                        </button>
                    </div>
                    {#if pwdMsg}
                        <div class="result-msg" class:error={pwdErr}>{pwdMsg}</div>
                    {/if}
                </div>
            {/if}

            {#if activeSection === 'privacy'}
                <div class="section-header">
                    <div class="section-title">Privacy</div>
                    <div class="section-desc">Control what the rest of the Survivor network can see</div>
                </div>
                <div class="placeholder-note">
                    <AlertTriangle size={14} />
                    Privacy controls are being wired to backend permissions in an upcoming update. For now, your Dossier and Vault are visible to signed-in Survivors.
                </div>
            {/if}

            {#if activeSection === 'notifications'}
                <div class="section-header">
                    <div class="section-title">Notifications</div>
                    <div class="section-desc">Pick which alerts reach you, and through which channel</div>
                </div>
                <div class="placeholder-note">
                    <AlertTriangle size={14} />
                    Per-category notification preferences are being wired to backend channels in an upcoming update. All in-app notifications are currently enabled.
                </div>
            {/if}

            {#if activeSection === 'themes'}
                <div class="section-header">
                    <div class="section-title">Themes</div>
                    <div class="section-desc">Recolor your TekOS instance · unlock more by earning badges</div>
                </div>

                <div class="group">
                    <div class="group-label">Map palettes</div>
                    <div class="themes-grid">
                        {#each PALETTES as p}
                            <button class="theme-card"
                                    class:active={activePaletteId === p.id}
                                    style:--prv-bg={p.bg}
                                    style:--prv-line={`rgba(${hexToRgb(p.primary)},0.20)`}
                                    style:--prv-glow1={`rgba(${hexToRgb(p.primary)},0.45)`}
                                    style:--prv-glow2={`rgba(${hexToRgb(p.accent)},0.35)`}
                                    onclick={() => selectPalette(p)}>
                                <div class="theme-preview"></div>
                                <div class="theme-name">{p.name}</div>
                                <div class="theme-tag">{p.tag}</div>
                                <div class="theme-swatches">
                                    <div class="swatch" style:background={p.primary}></div>
                                    <div class="swatch" style:background={p.accent}></div>
                                    <div class="swatch" style:background={p.bg}></div>
                                </div>
                            </button>
                        {/each}
                    </div>
                    {#if themeMsg}
                        <div class="result-msg" style="margin-top: 10px;">{themeMsg}</div>
                    {/if}
                </div>

                <div class="group">
                    <div class="group-label">AI Companion voice</div>
                    <div class="voice-grid">
                        {#each VOICES as v}
                            <button class="voice-card" class:active={activeVoiceId === v.id} onclick={() => activeVoiceId = v.id}>
                                <div class="voice-name">{v.name}</div>
                                <div class="voice-sample">{v.sample}</div>
                                <div class="voice-meta">{v.meta}</div>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            {#if activeSection === 'cluster'}
                <div class="section-header">
                    <div class="section-title">Cluster</div>
                    <div class="section-desc">Servers you follow and how TekOS reads their data</div>
                </div>
                <div class="placeholder-note">
                    <AlertTriangle size={14} />
                    Cluster configuration (server polling via Steam A2S + optional RCON event stream) is on the build roadmap. See <code>tekos_build_decisions.md</code> for the locked spec.
                </div>
            {/if}

            {#if activeSection === 'data'}
                <div class="section-header">
                    <div class="section-title">Data</div>
                    <div class="section-desc">Export your Vault, import from saves, manage what TekOS stores</div>
                </div>
                <div class="group">
                    <div class="group-label">Export</div>
                    <div class="action-card">
                        <div class="action-info">
                            <div class="action-title">Export Vault</div>
                            <div class="action-desc">All your specimens with stat lines, mutations, parents, genealogy and badges. Download as JSON.</div>
                        </div>
                        <a class="tek-btn-v2" href="/api/creatures?format=json" download="vault.json">DOWNLOAD JSON</a>
                    </div>
                </div>
                <div class="danger-zone">
                    <div class="danger-title">⚠ Danger Zone</div>
                    <div class="danger-desc">These actions cannot be undone. Export your archive before proceeding.</div>
                    <div class="danger-actions">
                        <button class="tek-btn-v2 danger" disabled>DELETE ACCOUNT</button>
                    </div>
                </div>
            {/if}

            {#if activeSection === 'integrations'}
                <div class="section-header">
                    <div class="section-title">Integrations</div>
                    <div class="section-desc">Connect TekOS to the rest of your survivor toolkit</div>
                </div>
                <div class="placeholder-note">
                    <AlertTriangle size={14} />
                    Outbound webhooks (Discord pings, Twitch link, YouTube link) and personal API tokens are coming soon.
                </div>
            {/if}

        </div>
    </div>
</div>

<style>
.settings-shell {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 24px;
    align-items: start;
}
@media (max-width: 880px) {
    .settings-shell { grid-template-columns: 1fr; }
}

/* Left nav */
.side-nav {
    position: sticky;
    top: 24px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px 8px;
}
.side-nav-label {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding: 6px 12px 10px;
}
.nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 12px;
    cursor: pointer;
    border: none;
    border-left: 2px solid transparent;
    background: transparent;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    transition: all 0.15s;
    width: 100%;
    text-align: left;
}
.nav-item:hover {
    color: var(--tek-text);
    background: rgba(0,180,255,0.05);
}
.nav-item.active {
    color: var(--tek-blue);
    border-left-color: var(--tek-blue);
    background: linear-gradient(90deg, rgba(0,180,255,0.10) 0%, rgba(0,180,255,0) 100%);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}

/* Right panel */
.panel {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 28px 32px 32px;
    min-height: 600px;
}
.panel::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}

.section-header {
    margin-bottom: 22px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(0,180,255,0.12);
}
.section-title {
    font-family: var(--tek-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 4px;
}
.section-desc {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

.group { margin-bottom: 28px; }
.group:last-child { margin-bottom: 0; }
.group-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 10px;
    padding-left: 2px;
}
.row {
    display: grid;
    grid-template-columns: 1fr 280px;
    align-items: center;
    gap: 20px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(100,116,139,0.10);
}
.row.col { grid-template-columns: 1fr; }
.row.col textarea { resize: vertical; min-height: 70px; }
.row:last-child { border-bottom: none; }
.row-info { min-width: 0; }
.row-label { font-size: 0.88rem; font-weight: 600; color: var(--tek-text); margin-bottom: 3px; }
.row-hint { font-size: 0.78rem; color: var(--tek-text-dim); line-height: 1.4; }

.result-msg {
    margin-top: 8px;
    padding: 8px 12px;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    background: rgba(16,185,129,0.08);
    border-left: 2px solid var(--tek-green);
    color: var(--tek-green);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.result-msg.error {
    background: rgba(239,68,68,0.08);
    border-left-color: var(--tek-red);
    color: var(--tek-red);
}

/* Linked account row */
.linked-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(5,8,18,0.4);
    border: 1px solid rgba(100,116,139,0.15);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    margin-bottom: 10px;
}
.linked-icon {
    width: 36px; height: 36px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--tek-mono);
    font-weight: 700;
    flex-shrink: 0;
}
.linked-icon.discord { background: rgba(88,101,242,0.15); color: #5865f2; border: 1px solid rgba(88,101,242,0.4); }
.linked-icon.email { background: rgba(0,180,255,0.10); color: var(--tek-blue); border: 1px solid var(--tek-blue-border); }
.linked-info { flex: 1; min-width: 0; }
.linked-name { font-size: 0.86rem; font-weight: 600; color: var(--tek-text); margin-bottom: 2px; }
.linked-handle { font-family: var(--tek-mono); font-size: 0.74rem; color: var(--tek-text-dim); }
.linked-status {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-green);
    flex-shrink: 0;
}
.linked-status .dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    margin-right: 5px;
}
.linked-status.verified { color: var(--tek-blue); }
.linked-status.verified .dot { background: var(--tek-blue); box-shadow: 0 0 5px var(--tek-blue-glow); }

/* Themes grid */
.themes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
}
.theme-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.6) 0%, rgba(4,8,20,0.85) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
    padding: 14px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: inherit;
    overflow: hidden;
}
.theme-card:hover { border-color: var(--tek-blue-border); transform: translateY(-2px); }
.theme-card.active {
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 18px rgba(0,180,255,0.30);
}
.theme-card.active::before {
    content: 'ACTIVE';
    position: absolute;
    top: 8px; right: 8px;
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    color: var(--tek-blue);
    background: rgba(0,180,255,0.15);
    border: 1px solid var(--tek-blue);
    padding: 2px 6px;
    z-index: 2;
}
.theme-preview {
    position: relative;
    height: 80px;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 12px;
    background-image:
        repeating-linear-gradient(60deg, var(--prv-line) 0 1px, transparent 1px 16px),
        repeating-linear-gradient(-60deg, var(--prv-line) 0 1px, transparent 1px 16px),
        radial-gradient(ellipse at 30% 40%, var(--prv-glow1) 0%, transparent 60%),
        radial-gradient(ellipse at 75% 65%, var(--prv-glow2) 0%, transparent 60%),
        var(--prv-bg);
}
.theme-name {
    font-family: var(--tek-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 2px;
}
.theme-tag {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 10px;
}
.theme-swatches { display: flex; gap: 4px; }
.swatch {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2);
}

/* Voice picker */
.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
}
.voice-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.5) 0%, rgba(4,8,20,0.85) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    color: inherit;
}
.voice-card:hover { border-color: var(--tek-purple); }
.voice-card.active {
    border-color: var(--tek-purple);
    background: linear-gradient(160deg, rgba(139,92,246,0.10) 0%, rgba(4,8,20,0.85) 100%);
    box-shadow: 0 0 0 1px var(--tek-purple), 0 0 14px rgba(139,92,246,0.30);
}
.voice-name {
    font-family: var(--tek-display);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 6px;
}
.voice-sample {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: 0.86rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}
.voice-card.active .voice-sample { color: var(--tek-text); }
.voice-meta {
    margin-top: 8px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

/* Action card */
.action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    background: rgba(5,8,18,0.4);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}
.action-info { flex: 1; }
.action-title { font-size: 0.88rem; font-weight: 600; color: var(--tek-text); margin-bottom: 3px; }
.action-desc { font-size: 0.78rem; color: var(--tek-text-dim); line-height: 1.4; }

/* Danger zone */
.danger-zone {
    margin-top: 24px;
    padding: 16px 20px 18px;
    background: rgba(239,68,68,0.04);
    border: 1px solid rgba(239,68,68,0.25);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
}
.danger-title {
    font-family: var(--tek-display);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--tek-red);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.danger-desc {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    margin-bottom: 14px;
}
.danger-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.placeholder-note {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 18px;
    background: rgba(245,158,11,0.06);
    border: 1px solid rgba(245,158,11,0.30);
    border-left-width: 2px;
    color: var(--tek-amber);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    line-height: 1.5;
    letter-spacing: 0.04em;
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
}
.placeholder-note :global(svg) { flex-shrink: 0; margin-top: 2px; }
.placeholder-note code {
    font-family: var(--tek-mono);
    background: rgba(245,158,11,0.08);
    padding: 1px 5px;
    border-radius: 2px;
}

:global(.spin) { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
</style>
