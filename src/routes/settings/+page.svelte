<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type SectionId = 'account' | 'privacy' | 'notifications' | 'themes' | 'cluster' | 'data' | 'integrations';
    let activeSection = $state<SectionId>('account');

    // ── Account form state ──────────────────────────────────────────────────
    let nickname    = $state(data.profile?.nickname ?? '');
    let bio         = $state(data.profile?.bio ?? '');
    let lookingFor  = $state(data.profile?.lookingFor ?? '');
    let bannerImage = $state((data.profile as any)?.bannerImage ?? '');
    let profSaving  = $state(false);
    let profMsg     = $state('');
    let profErr     = $state(false);

    async function saveProfile() {
        profSaving = true; profMsg = ''; profErr = false;
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname:    nickname.trim() || null,
                bio:         bio.trim() || null,
                lookingFor:  lookingFor.trim() || null,
                bannerImage: bannerImage.trim() || null
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

    // ── Theme palettes ──────────────────────────────────────────────────────
    type MapPalette = {
        id: string; name: string; tag: string;
        primary: string; accent: string; bg: string;
        prvBg: string; prvLine: string; prvGlow1: string; prvGlow2: string;
        sw1: string; sw2: string; sw3: string;
        locked?: boolean;
        unlockReq?: string;
        unlockPct?: number;
    };
    const PALETTES: MapPalette[] = [
        { id: 'island',     name: 'The Island',     tag: 'CYAN · DEFAULT',
          primary: '#00b4ff', accent: '#8b5cf6', bg: '#050812',
          prvBg: '#050812', prvLine: 'rgba(0,180,255,0.18)',
          prvGlow1: 'rgba(0,180,255,0.40)', prvGlow2: 'rgba(139,92,246,0.30)',
          sw1: '#00b4ff', sw2: '#8b5cf6', sw3: '#0a1228' },
        { id: 'aberration', name: 'Aberration',     tag: 'BIO · PURPLE/GREEN',
          primary: '#a855f7', accent: '#10b981', bg: '#0c0418',
          prvBg: '#0c0418', prvLine: 'rgba(168,85,247,0.20)',
          prvGlow1: 'rgba(168,85,247,0.45)', prvGlow2: 'rgba(16,185,129,0.35)',
          sw1: '#a855f7', sw2: '#10b981', sw3: '#180a28' },
        { id: 'scorched',   name: 'Scorched Earth', tag: 'DESERT · AMBER/RED',
          primary: '#f59e0b', accent: '#ef4444', bg: '#1a0a04',
          prvBg: '#1a0a04', prvLine: 'rgba(245,158,11,0.20)',
          prvGlow1: 'rgba(245,158,11,0.45)', prvGlow2: 'rgba(239,68,68,0.35)',
          sw1: '#f59e0b', sw2: '#ef4444', sw3: '#2a1408' },
        { id: 'genesis',    name: 'Genesis',        tag: 'SIM · TEAL/MAGENTA',
          primary: '#22d3ee', accent: '#d946ef', bg: '#040818',
          prvBg: '#040818', prvLine: 'rgba(34,211,238,0.20)',
          prvGlow1: 'rgba(34,211,238,0.45)', prvGlow2: 'rgba(217,70,239,0.30)',
          sw1: '#22d3ee', sw2: '#d946ef', sw3: '#091230' },
        { id: 'extinction', name: 'Extinction',     tag: 'RUIN · ORANGE/TEAL',
          primary: '#fb923c', accent: '#14b8a6', bg: '#180a04',
          prvBg: '#180a04', prvLine: 'rgba(251,146,60,0.20)',
          prvGlow1: 'rgba(251,146,60,0.45)', prvGlow2: 'rgba(20,184,166,0.35)',
          sw1: '#fb923c', sw2: '#14b8a6', sw3: '#2a1208' },
        { id: 'ragnarok',   name: 'Ragnarok',       tag: 'NORDIC · BLUE/GOLD',
          primary: '#60a5fa', accent: '#fcd34d', bg: '#040818',
          prvBg: '#040818', prvLine: 'rgba(96,165,250,0.20)',
          prvGlow1: 'rgba(96,165,250,0.45)', prvGlow2: 'rgba(252,211,77,0.30)',
          sw1: '#60a5fa', sw2: '#fcd34d', sw3: '#08142d' }
    ];
    const LOCKED_PALETTES: MapPalette[] = [
        { id: 'alpha', name: 'Alpha Survivor', tag: 'REWARD · GOLD',
          primary: '#fcd34d', accent: '#ffffff', bg: '#0c0a02',
          prvBg: '#0c0a02', prvLine: 'rgba(250,204,21,0.20)',
          prvGlow1: 'rgba(250,204,21,0.45)', prvGlow2: 'rgba(255,255,255,0.20)',
          sw1: '#fcd34d', sw2: '#ffffff', sw3: '#1a1408',
          locked: true, unlockReq: 'Defeat every Alpha boss across all maps · 6 / 11', unlockPct: 54 },
        { id: 'tek-proto', name: 'Tek Prototype', tag: 'REWARD · BLUEPRINT',
          primary: '#2dd4bf', accent: '#a5f3fc', bg: '#020c0c',
          prvBg: '#020c0c', prvLine: 'rgba(45,212,191,0.25)',
          prvGlow1: 'rgba(45,212,191,0.50)', prvGlow2: 'rgba(165,243,252,0.30)',
          sw1: '#2dd4bf', sw2: '#a5f3fc', sw3: '#021818',
          locked: true, unlockReq: 'Collect 25 Prize Bloodline badges · 8 / 25', unlockPct: 32 },
        { id: 'corrupted', name: 'Element Corrupted', tag: 'REWARD · CORRUPTION',
          primary: '#d946ef', accent: '#f472b6', bg: '#100214',
          prvBg: '#100214', prvLine: 'rgba(217,70,239,0.25)',
          prvGlow1: 'rgba(217,70,239,0.50)', prvGlow2: 'rgba(244,114,182,0.30)',
          sw1: '#d946ef', sw2: '#f472b6', sw3: '#200628',
          locked: true, unlockReq: 'Earn the Underdog badge on any Alpha boss · 0 / 1', unlockPct: 0 }
    ];

    let activePaletteId = $state('island');
    let themeMsg = $state('');
    let themeErr = $state(false);

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
        themeMsg = ''; themeErr = false;
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapPalette: p.id, theme: { primary: p.primary, accent: p.accent, bg: p.bg } })
            });
            if (res.ok) {
                themeMsg = '✓ Palette saved';
            } else {
                themeMsg = 'Failed to save palette'; themeErr = true;
            }
            setTimeout(() => themeMsg = '', 2000);
        } catch {
            themeMsg = 'Network error'; themeErr = true;
        }
    }

    // AI Companion voice
    type Voice = { id: string; name: string; sample: string; meta: string };
    const VOICES: Voice[] = [
        { id: 'stoic', name: 'Stoic Tek',
          sample: '"Implant link established. 47 specimens catalogued. No anomalies detected."',
          meta: 'FORMAL · MINIMAL' },
        { id: 'wry', name: 'Wry Survivor',
          sample: '"Welcome back. Your Yutyrannus still hasn\'t slept. Neither have you."',
          meta: 'FRIENDLY · DRY' },
        { id: 'lore', name: 'Lore-Keeper',
          sample: '"The Obelisk hums. Bloodlines stir. Long is the road of the Survivor."',
          meta: 'FLOWERY · LORE-HEAVY' },
        { id: 'mute', name: 'Mute',
          sample: '— No flavor text. Just the data.',
          meta: 'SILENT · DATA-ONLY' }
    ];
    let activeVoiceId = $state('wry');

    async function selectVoice(v: Voice) {
        activeVoiceId = v.id;
        try {
            await fetch('/api/settings', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ voiceId: v.id })
            });
        } catch {}
    }

    // ── Hex canvas ──────────────────────────────────────────────────────────
    let hexCanvas: HTMLCanvasElement;

    onMount(() => {
        // Hex canvas background
        const canvas = hexCanvas;
        if (canvas) {
            const ctx = canvas.getContext('2d')!;
            let w: number, h: number;
            let hexes: { x: number; y: number; size: number; glow: number }[] = [];
            let rafId: number;
            function resize() {
                w = canvas.width = window.innerWidth;
                h = canvas.height = window.innerHeight;
                hexes = [];
                const size = 36, hSpace = size * 1.5, vSpace = size * Math.sqrt(3);
                for (let y = -size; y < h + size; y += vSpace) {
                    for (let x = -size; x < w + size; x += hSpace) {
                        const offsetY = (Math.floor(x / hSpace) % 2) * vSpace / 2;
                        hexes.push({ x, y: y + offsetY, size, glow: Math.random() });
                    }
                }
            }
            function draw() {
                ctx.clearRect(0, 0, w, h);
                ctx.lineWidth = 1;
                const t = Date.now() / 4000;
                hexes.forEach((hex, i) => {
                    const phase = (Math.sin(t + i * 0.3) + 1) / 2;
                    ctx.strokeStyle = `rgba(0,180,255,${0.03 + phase * 0.04})`;
                    ctx.beginPath();
                    for (let a = 0; a < 6; a++) {
                        const angle = (Math.PI / 3) * a;
                        const px = hex.x + hex.size * Math.cos(angle);
                        const py = hex.y + hex.size * Math.sin(angle);
                        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.stroke();
                });
                rafId = requestAnimationFrame(draw);
            }
            window.addEventListener('resize', resize);
            resize(); draw();
        }

        // Hydrate palette + voice from /api/settings
        (async () => {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const body = await res.json();
                    if (body.mapPalette) {
                        const matched = PALETTES.find(p => p.id === body.mapPalette);
                        if (matched) activePaletteId = matched.id;
                    } else if (body.theme?.primary) {
                        const matched = PALETTES.find(p => p.primary.toLowerCase() === body.theme.primary.toLowerCase());
                        if (matched) activePaletteId = matched.id;
                    }
                    if (body.voiceId) activeVoiceId = body.voiceId;
                }
            } catch {}
        })();
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Settings</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

    <!-- Header -->
    <div class="page-header">
        <div class="breadcrumb">
            <a href="/dossier">DASHBOARD</a><span class="sep">/</span><span>SETTINGS</span>
        </div>
        <h1 class="page-title">Settings</h1>
        <div class="page-sub">
            Signed in as <span class="signed">{(data.profile?.nickname ?? data.profile?.email ?? 'SURVIVOR').toString().toUpperCase()}</span>
        </div>
    </div>

    <!-- Shell -->
    <div class="settings-shell">

        <!-- LEFT NAV -->
        <nav class="side-nav">
            <div class="side-nav-label">Configure</div>
            <div class="nav-item" class:active={activeSection === 'account'} onclick={() => activeSection = 'account'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
                Account
            </div>
            <div class="nav-item" class:active={activeSection === 'privacy'} onclick={() => activeSection = 'privacy'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4z"/></svg>
                Privacy
            </div>
            <div class="nav-item" class:active={activeSection === 'notifications'} onclick={() => activeSection = 'notifications'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0112 0v5l2 3H4l2-3V8z"/><path d="M10 19a2 2 0 004 0"/></svg>
                Notifications
            </div>
            <div class="nav-item" class:active={activeSection === 'themes'} onclick={() => activeSection = 'themes'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>
                Themes
            </div>
            <div class="nav-item" class:active={activeSection === 'cluster'} onclick={() => activeSection = 'cluster'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="17" r="1" fill="currentColor"/></svg>
                Cluster
            </div>
            <div class="nav-item" class:active={activeSection === 'data'} onclick={() => activeSection = 'data'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v6c0 1.7 4 3 9 3s9-1.3 9-3V5M3 11v6c0 1.7 4 3 9 3s9-1.3 9-3v-6"/></svg>
                Data
            </div>
            <div class="nav-item" class:active={activeSection === 'integrations'} onclick={() => activeSection = 'integrations'}>
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>
                Integrations
            </div>
        </nav>

        <!-- RIGHT PANEL -->
        <div class="panel">

            <!-- ============ ACCOUNT ============ -->
            <div class="panel-section" class:active={activeSection === 'account'} id="section-account">
                <div class="section-header">
                    <div class="section-title">Account</div>
                    <div class="section-desc">Survivor identity, authentication, active sessions</div>
                </div>

                <!-- Identity strip -->
                <div class="identity-strip">
                    <div class="id-avatar">
                        <svg viewBox="0 0 88 100">
                            <defs>
                                <linearGradient id="avGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#00b4ff"/>
                                    <stop offset="100%" stop-color="#8b5cf6"/>
                                </linearGradient>
                            </defs>
                            <polygon points="44,4 84,26 84,74 44,96 4,74 4,26" fill="rgba(10,18,44,0.9)" stroke="url(#avGrad)" stroke-width="2"/>
                            <text x="44" y="62" font-family="Orbitron" font-size="32" font-weight="900" fill="url(#avGrad)" text-anchor="middle">{(data.profile?.nickname?.[0] ?? data.profile?.email?.[0] ?? 'S').toUpperCase()}</text>
                        </svg>
                    </div>
                    <div class="id-info">
                        <div class="id-name">{data.profile?.nickname ?? 'Survivor'}</div>
                        <div class="id-meta">SURVIVOR-ID · {(data.profile?.id ?? '').toString().slice(0,8).toUpperCase()} <span class="badge">FOUNDER</span></div>
                    </div>
                    <div class="id-actions">
                        <button class="btn ghost">CHANGE AVATAR</button>
                        <button class="btn ghost">CHANGE BANNER</button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Identity</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Display name</div>
                            <div class="row-hint">Shown on your Dossier, in trades, and across the feed.</div>
                        </div>
                        <input class="input" bind:value={nickname} placeholder="The name the wild remembers" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Email</div>
                            <div class="row-hint">Used for sign-in and account recovery. Locked.</div>
                        </div>
                        <input class="input" value={data.profile?.email ?? ''} disabled style="opacity:0.6;" />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Bio</div>
                            <div class="row-hint">Up to 280 characters. Crimson Pro italic on your Dossier.</div>
                        </div>
                        <input class="input wide" bind:value={bio} placeholder="Hardcore breeder. Loaded Crysis cluster. Boss prep — gear, tames, gameplan." />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Looking for</div>
                            <div class="row-hint">What you're seeking in trades or partnerships.</div>
                        </div>
                        <input class="input wide" bind:value={lookingFor} placeholder="High-melee Yuty lines, Alpha Boss runs, etc." />
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Banner image URL</div>
                            <div class="row-hint">Background banner on your Dossier.</div>
                        </div>
                        <input class="input wide" bind:value={bannerImage} placeholder="https://…" />
                    </div>
                    <div class="row">
                        <div></div>
                        <button class="btn solid" onclick={saveProfile} disabled={profSaving}>
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
                            <div class="linked-handle">{data.profile?.discordName ?? 'Not linked'}</div>
                        </div>
                        {#if data.profile?.discordName}
                            <div class="linked-status"><span class="dot"></span>LINKED</div>
                            <button class="btn ghost">Unlink</button>
                        {:else}
                            <a class="btn" href="/api/auth/discord/start">LINK DISCORD</a>
                        {/if}
                    </div>
                    <div class="linked-row">
                        <div class="linked-icon email">@</div>
                        <div class="linked-info">
                            <div class="linked-name">Email</div>
                            <div class="linked-handle">{data.profile?.email ?? ''}</div>
                        </div>
                        <div class="linked-status"><span class="dot"></span>VERIFIED</div>
                        <button class="btn ghost">Change</button>
                    </div>
                </div>

                <div class="group">
                    <div class="group-label">Security</div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Password</div>
                            <div class="row-hint">Change your sign-in passcode.</div>
                        </div>
                        <button class="btn">CHANGE PASSWORD</button>
                    </div>
                    <div class="row">
                        <div class="row-info">
                            <div class="row-label">Two-factor authentication</div>
                            <div class="row-hint">Require a code from your authenticator app on sign-in.</div>
                        </div>
                        <div class="toggle" data-toggle></div>
                    </div>
                </div>
            </div>

            <!-- ============ PRIVACY ============ -->
            <div class="panel-section" class:active={activeSection === 'privacy'} id="section-privacy">
                <div class="section-header">
                    <div class="section-title">Privacy</div>
                    <div class="section-desc">Control what the rest of the Survivor network can see</div>
                </div>
                <div class="placeholder-note">
                    ⚠ Privacy controls are being wired to backend permissions in an upcoming update. For now, your Dossier and Vault are visible to signed-in Survivors.
                </div>
            </div>

            <!-- ============ NOTIFICATIONS ============ -->
            <div class="panel-section" class:active={activeSection === 'notifications'} id="section-notifications">
                <div class="section-header">
                    <div class="section-title">Notifications</div>
                    <div class="section-desc">Pick which alerts reach you, and through which channel</div>
                </div>
                <div class="placeholder-note">
                    ⚠ Per-category notification preferences are being wired to backend channels in an upcoming update. All in-app notifications are currently enabled.
                </div>
            </div>

            <!-- ============ THEMES ============ -->
            <div class="panel-section" class:active={activeSection === 'themes'} id="section-themes">
                <div class="section-header">
                    <div class="section-title">Themes</div>
                    <div class="section-desc">Recolor your TekOS instance to match your home map · unlock more by earning badges</div>
                </div>

                <div class="group">
                    <div class="group-label">Map palettes <span style="color: var(--tek-text-dim); text-transform: none; letter-spacing: 0.05em;">— 6 available · 3 locked</span></div>
                    <div class="themes-grid">
                        {#each PALETTES as p}
                            <div class="theme-card"
                                 class:active={activePaletteId === p.id}
                                 style:--prv-bg={p.prvBg}
                                 style:--prv-line={p.prvLine}
                                 style:--prv-glow1={p.prvGlow1}
                                 style:--prv-glow2={p.prvGlow2}
                                 onclick={() => selectPalette(p)}>
                                <div class="theme-preview"></div>
                                <div class="theme-name">{p.name}</div>
                                <div class="theme-tag">{p.tag}</div>
                                <div class="theme-swatches">
                                    <div class="swatch" style:background={p.sw1}></div>
                                    <div class="swatch" style:background={p.sw2}></div>
                                    <div class="swatch" style:background={p.sw3}></div>
                                </div>
                            </div>
                        {/each}

                        {#each LOCKED_PALETTES as p}
                            <div class="theme-card locked"
                                 style:--prv-bg={p.prvBg}
                                 style:--prv-line={p.prvLine}
                                 style:--prv-glow1={p.prvGlow1}
                                 style:--prv-glow2={p.prvGlow2}>
                                <div class="lock-overlay">🔒 LOCKED</div>
                                <div class="theme-preview"></div>
                                <div class="theme-name">{p.name}</div>
                                <div class="theme-tag">{p.tag}</div>
                                <div class="theme-swatches">
                                    <div class="swatch" style:background={p.sw1}></div>
                                    <div class="swatch" style:background={p.sw2}></div>
                                    <div class="swatch" style:background={p.sw3}></div>
                                </div>
                                <div class="unlock-req">{p.unlockReq}</div>
                                <div class="unlock-progress"><div class="unlock-progress-bar" style:width="{p.unlockPct}%"></div></div>
                            </div>
                        {/each}
                    </div>
                    {#if themeMsg}
                        <div class="result-msg" class:error={themeErr} style="margin-top: 10px;">{themeMsg}</div>
                    {/if}
                </div>

                <div class="group">
                    <div class="group-label">AI Companion voice</div>
                    <div style="font-size: 0.8rem; color: var(--tek-text-dim); line-height: 1.5; margin-bottom: 6px;">
                        Sets the tone of boot messages, the Landing greeting, and flavor text throughout TekOS. The information is the same — only the voice changes.
                    </div>
                    <div class="voice-grid">
                        {#each VOICES as v}
                            <div class="voice-card" class:active={activeVoiceId === v.id} onclick={() => selectVoice(v)}>
                                <div class="voice-name">{v.name}</div>
                                <div class="voice-sample">{v.sample}</div>
                                <div class="voice-meta">{v.meta}</div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- ============ CLUSTER ============ -->
            <div class="panel-section" class:active={activeSection === 'cluster'} id="section-cluster">
                <div class="section-header">
                    <div class="section-title">Cluster</div>
                    <div class="section-desc">Servers you follow and how TekOS reads their data</div>
                </div>
                <div class="placeholder-note">
                    ⚠ Cluster configuration (server polling via Steam A2S + optional RCON event stream) is on the build roadmap. See <code>tekos_build_decisions.md</code> for the locked spec.
                </div>
            </div>

            <!-- ============ DATA ============ -->
            <div class="panel-section" class:active={activeSection === 'data'} id="section-data">
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
                        <div style="display:flex; gap:8px;">
                            <a class="btn" href="/api/creatures?format=json" download="vault.json">JSON</a>
                        </div>
                    </div>
                </div>

                <div class="danger-zone">
                    <div class="danger-title">⚠ Danger Zone</div>
                    <div class="danger-desc">
                        These actions cannot be undone. We strongly recommend exporting your archive first.
                    </div>
                    <div class="danger-actions">
                        <button class="btn danger" disabled>DELETE ACCOUNT</button>
                    </div>
                </div>
            </div>

            <!-- ============ INTEGRATIONS ============ -->
            <div class="panel-section" class:active={activeSection === 'integrations'} id="section-integrations">
                <div class="section-header">
                    <div class="section-title">Integrations</div>
                    <div class="section-desc">Connect TekOS to the rest of your survivor toolkit</div>
                </div>
                <div class="placeholder-note">
                    ⚠ Outbound webhooks (Discord pings, Twitch link, YouTube link) and personal API tokens are coming soon.
                </div>
            </div>

        </div>

    </div>

</div>

<style>
:global(#tekHexCanvas) { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1240px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header { margin-bottom: 28px; }
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; transition: color 0.15s; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 6px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.8rem, 3.6vw, 2.5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
}
.page-sub {
    font-family: var(--tek-mono); font-size: 0.72rem;
    letter-spacing: 0.14em; color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 6px;
}
.page-sub .signed {
    color: var(--tek-blue);
}

/* ═════════════════════════════════════════════════════════════════════════
   LAYOUT — LEFT NAV + RIGHT PANEL
   ═════════════════════════════════════════════════════════════════════════ */
.settings-shell {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 28px;
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
    backdrop-filter: blur(8px);
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
    border-left: 2px solid transparent;
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    transition: all 0.15s;
    user-select: none;
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
.nav-item .icon {
    width: 14px; height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
}
.nav-item.active .icon { opacity: 1; }
.nav-item .nav-pip {
    margin-left: auto;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-amber);
    box-shadow: 0 0 5px rgba(245,158,11,0.6);
    flex-shrink: 0;
    display: none;
}
.nav-item.unsaved .nav-pip { display: block; }

/* Right panel */
.panel {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.95) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 28px 32px 32px;
    backdrop-filter: blur(8px);
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
.panel-section { display: none; }
.panel-section.active { display: block; animation: panelFade 0.35s ease; }
@keyframes panelFade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
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

/* ═════════════════════════════════════════════════════════════════════════
   SETTING ROWS / CONTROLS
   ═════════════════════════════════════════════════════════════════════════ */
.group {
    margin-bottom: 28px;
}
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
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 20px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(100,116,139,0.10);
}
.row:last-child { border-bottom: none; }
.row-info { min-width: 0; }
.row-label {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 3px;
}
.row-hint {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}
.row-hint code {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    color: var(--tek-blue);
    background: rgba(0,180,255,0.07);
    padding: 1px 6px;
    border-radius: 2px;
}

/* Toggle switch */
.toggle {
    position: relative;
    width: 44px; height: 24px;
    background: rgba(15,23,42,0.9);
    border: 1px solid rgba(100,116,139,0.30);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}
.toggle::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px;
    width: 18px; height: 18px;
    background: var(--tek-text-dim);
    border-radius: 50%;
    transition: all 0.2s;
}
.toggle.on {
    background: rgba(0,180,255,0.20);
    border-color: var(--tek-blue);
    box-shadow: 0 0 8px rgba(0,180,255,0.30);
}
.toggle.on::after {
    transform: translateX(20px);
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* Text input */
.input {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.82rem;
    padding: 9px 12px;
    min-width: 220px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
}
.input:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 10px rgba(0,180,255,0.20);
}
.input.wide { min-width: 320px; }

/* Select dropdown styled */
.select {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    padding: 9px 32px 9px 12px;
    min-width: 200px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    appearance: none;
    -webkit-appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
}
.select:focus {
    outline: none;
    border-color: var(--tek-blue);
}

/* Button */
.btn {
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 16px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
    text-decoration: none;
    display: inline-block;
}
.btn:hover {
    background: rgba(0,180,255,0.18);
    box-shadow: 0 0 12px rgba(0,180,255,0.30);
}
.btn.ghost {
    background: transparent;
    border-color: rgba(100,116,139,0.30);
    color: var(--tek-text-dim);
}
.btn.ghost:hover {
    border-color: var(--tek-text);
    color: var(--tek-text);
    background: rgba(100,116,139,0.10);
    box-shadow: none;
}
.btn.danger {
    background: rgba(239,68,68,0.08);
    border-color: rgba(239,68,68,0.40);
    color: var(--tek-red);
}
.btn.danger:hover {
    background: rgba(239,68,68,0.18);
    box-shadow: 0 0 12px rgba(239,68,68,0.30);
}
.btn.solid {
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    border: none;
    font-weight: 700;
    padding: 10px 18px;
}
.btn.solid:hover {
    box-shadow: 0 0 16px rgba(0,180,255,0.45);
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Result message */
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

.placeholder-note {
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
.placeholder-note code {
    font-family: var(--tek-mono);
    background: rgba(245,158,11,0.08);
    padding: 1px 5px;
    border-radius: 2px;
}

/* ═════════════════════════════════════════════════════════════════════════
   ACCOUNT — avatar uploader / linked accounts
   ═════════════════════════════════════════════════════════════════════════ */
.identity-strip {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(0,180,255,0.06) 0%, rgba(139,92,246,0.04) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    margin-bottom: 22px;
}
.id-avatar {
    width: 72px; height: 80px;
    flex-shrink: 0;
    position: relative;
}
.id-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 10px var(--tek-blue-glow)); }
.id-info { flex: 1; min-width: 0; }
.id-name {
    font-family: var(--tek-display);
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tek-text);
    margin-bottom: 4px;
}
.id-meta {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.id-meta .badge {
    display: inline-block;
    padding: 2px 7px;
    background: rgba(0,180,255,0.10);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    font-size: 0.62rem;
    margin-left: 8px;
}
.id-actions { display: flex; gap: 8px; }

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
.linked-name {
    font-size: 0.86rem; font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 2px;
}
.linked-handle {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.08em;
}
.linked-status {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-green);
}
.linked-status .dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    margin-right: 5px;
}

/* ═════════════════════════════════════════════════════════════════════════
   THEMES — map palette grid + unlockables + AI companion voice
   ═════════════════════════════════════════════════════════════════════════ */
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
    overflow: hidden;
}
.theme-card:hover {
    border-color: var(--tek-blue-border);
    transform: translateY(-2px);
}
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
    height: 90px;
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
.theme-preview::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%);
}
.theme-swatches {
    position: absolute;
    bottom: 6px; left: 6px;
    display: flex; gap: 4px;
    z-index: 2;
}
.swatch {
    width: 14px; height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2);
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
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}

/* Locked / unlockable theme */
.theme-card.locked {
    cursor: default;
    opacity: 0.78;
}
.theme-card.locked .theme-preview {
    filter: grayscale(0.5) brightness(0.55);
}
.theme-card.locked::after {
    content: '';
    position: absolute; inset: 0;
    background:
        repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0 8px, transparent 8px 16px);
    pointer-events: none;
}
.lock-overlay {
    position: absolute;
    top: 8px; right: 8px;
    background: rgba(245,158,11,0.15);
    border: 1px solid rgba(245,158,11,0.4);
    color: var(--tek-amber);
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.16em;
    padding: 2px 6px;
    z-index: 3;
    display: flex; align-items: center; gap: 4px;
}
.unlock-req {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-amber);
    letter-spacing: 0.06em;
    margin-top: 4px;
    line-height: 1.3;
}
.unlock-progress {
    height: 3px;
    background: rgba(245,158,11,0.15);
    margin-top: 8px;
    overflow: hidden;
}
.unlock-progress-bar {
    height: 100%;
    background: var(--tek-amber);
    box-shadow: 0 0 5px rgba(245,158,11,0.6);
}

/* AI Companion voice picker */
.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
    margin-top: 14px;
}
.voice-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.5) 0%, rgba(4,8,20,0.85) 100%);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 14px 16px;
    cursor: pointer;
    transition: all 0.2s;
}
.voice-card:hover {
    border-color: var(--tek-purple);
}
.voice-card.active {
    border-color: var(--tek-purple);
    background: linear-gradient(160deg, rgba(139,92,246,0.10) 0%, rgba(4,8,20,0.85) 100%);
    box-shadow: 0 0 0 1px var(--tek-purple), 0 0 14px rgba(139,92,246,0.30);
}
.voice-card.active::after {
    content: '●';
    position: absolute;
    top: 10px; right: 12px;
    color: var(--tek-purple);
    font-size: 0.7rem;
    text-shadow: 0 0 6px var(--tek-purple);
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

/* ═════════════════════════════════════════════════════════════════════════
   DATA / INTEGRATIONS / DANGER ZONE
   ═════════════════════════════════════════════════════════════════════════ */
.action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    background: rgba(5,8,18,0.4);
    border: 1px solid rgba(100,116,139,0.18);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    margin-bottom: 10px;
}
.action-info { flex: 1; min-width: 0; }
.action-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--tek-text);
    margin-bottom: 3px;
}
.action-desc {
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.4;
}

.danger-zone {
    margin-top: 24px;
    padding: 16px 20px 18px;
    background: rgba(239,68,68,0.04);
    border: 1px solid rgba(239,68,68,0.25);
    border-left-width: 2px;
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
    line-height: 1.4;
}
.danger-actions { display: flex; gap: 10px; flex-wrap: wrap; }

/* tiny chip for inline badges */
.chip {
    display: inline-block;
    padding: 2px 7px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid rgba(100,116,139,0.3);
    color: var(--tek-text-dim);
    margin-left: 6px;
}
.chip.blue { color: var(--tek-blue); border-color: var(--tek-blue-border); }
.chip.purple { color: var(--tek-purple); border-color: rgba(139,92,246,0.4); }
.chip.green { color: var(--tek-green); border-color: rgba(16,185,129,0.4); }
.chip.amber { color: var(--tek-amber); border-color: rgba(245,158,11,0.4); }
</style>
