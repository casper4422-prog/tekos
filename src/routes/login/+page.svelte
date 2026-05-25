<script lang="ts">
    import { onMount } from 'svelte';

    type Mode = 'signin' | 'register';

    let activeTab = $state<Mode>('signin');
    let statusText = $state('AWAITING SURVIVOR');
    let statusMode = $state<'' | 'active' | 'error'>('');
    let statusUsePulse = $state(false);

    // Sign in form fields
    let signinId = $state('');
    let signinKey = $state('');
    let signinBtnDisabled = $state(false);
    let signinBtnLabel = $state('Enter the ARK');

    // Register form fields
    let regEmail = $state('');
    let regCallsign = $state('');
    let regKey = $state('');
    let registerBtnDisabled = $state(false);
    let registerBtnLabel = $state('Awaken');


    function setStatus(text: string, mode: '' | 'active' | 'error' = '') {
        statusText = text;
        statusMode = mode;
        statusUsePulse = mode === 'active';
    }

    function selectTab(target: Mode) {
        activeTab = target;
        setStatus(target === 'register' ? 'AWAITING NEW SURVIVOR' : 'AWAITING SURVIVOR');
    }

    function handleFieldFocus() {
        setStatus('SURVIVOR DETECTED', 'active');
    }

    function handleFieldBlur() {
        setStatus(activeTab === 'register' ? 'AWAITING NEW SURVIVOR' : 'AWAITING SURVIVOR');
    }

    async function handleSigninSubmit(e: Event) {
        e.preventDefault();
        signinBtnDisabled = true;
        signinBtnLabel = 'Linking implant…';
        setStatus('LINKING IMPLANT', 'active');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: signinId, password: signinKey })
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                setStatus('Uplink established. Redirecting…', 'active');
                window.location.href = '/dossier';
            } else {
                const msg = (body && body.error) ? String(body.error).toUpperCase() : 'IMPLANT NOT RECOGNIZED · CHECK PASSCODE';
                setStatus(msg, 'error');
                signinBtnDisabled = false;
                signinBtnLabel = 'Enter the ARK';
            }
        } catch {
            setStatus('NETWORK CONNECTION UNSTABLE', 'error');
            signinBtnDisabled = false;
            signinBtnLabel = 'Enter the ARK';
        }
    }

    async function handleRegisterSubmit(e: Event) {
        e.preventDefault();
        registerBtnDisabled = true;
        registerBtnLabel = 'Awakening…';
        setStatus('AWAKENING NEW SURVIVOR', 'active');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regEmail, password: regKey, nickname: regCallsign })
            });
            const body = await res.json().catch(() => ({}));
            if (res.ok) {
                setStatus('Uplink established. Redirecting…', 'active');
                window.location.href = '/dossier';
            } else {
                const msg = (body && body.error) ? String(body.error).toUpperCase() : 'AWAKENING FAILED';
                setStatus(msg, 'error');
                registerBtnDisabled = false;
                registerBtnLabel = 'Awaken';
            }
        } catch {
            setStatus('NETWORK CONNECTION UNSTABLE', 'error');
            registerBtnDisabled = false;
            registerBtnLabel = 'Awaken';
        }
    }

    function browseAsGuest() {
        try { localStorage.setItem('tekos_guest', '1'); } catch {}
        window.location.href = '/dossier';
    }

</script>

<svelte:head>
    <title>⬡ TEKOS — Survivor Access</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />
</svelte:head>

<div class="stage">

    <!-- ═══════════ HERO ═══════════ -->
    <div class="hero">
        <div class="hero-mark">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
        </div>

        <div class="hero-wordmark">TEKOS</div>

        <div class="hero-version">
            <span class="status-dot"></span>
            V3.0 · ONLINE
        </div>

        <div class="hero-greeting">
            <span class="prefix">›</span>SURVIVOR ACCESS
        </div>

        <p class="hero-tagline">
            Sign in to continue building your <span class="accent">bloodlines</span>,
            tracking <span class="accent">boss runs</span>, and displaying your <span class="accent">badges</span>.
        </p>
    </div>

    <!-- ═══════════ ACTIONS ═══════════ -->
    <div class="actions">
        <!-- Discord primary CTA — same endpoint as landing -->
        <a class="cta cta-discord" href="/api/auth/discord/start">
            <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1 4.9A58.6 58.6 0 0045.6.5a.2.2 0 00-.2.1 40.9 40.9 0 00-1.8 3.7 54.1 54.1 0 00-16.3 0 37.2 37.2 0 00-1.9-3.7.2.2 0 00-.2-.1A58.4 58.4 0 0010.6 4.9a.2.2 0 00-.1.1C1.5 18.4-.9 31.5.3 44.5a.2.2 0 00.1.1 58.9 58.9 0 0017.7 9 .2.2 0 00.2-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.1 36.1 0 01-5.6 2.6.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.2.1A58.7 58.7 0 0070.6 44.6a.2.2 0 00.1-.1c1.4-14.9-2.4-27.9-10.5-39.5a.2.2 0 00-.1-.1zM23.7 36.7c-3.5 0-6.4-3.2-6.4-7.2s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.3 6.4 7.2 0 3.9-2.9 7.2-6.4 7.2z"/>
            </svg>
            Continue with Discord
        </a>

        <div class="divider"><span>OR SIGN IN WITH EMAIL</span></div>

        <!-- Tabs -->
        <div class="tabs" role="tablist">
            <button class="tab" class:active={activeTab === 'signin'} role="tab" aria-selected={activeTab === 'signin'} onclick={() => selectTab('signin')}>ENTER</button>
            <button class="tab" class:active={activeTab === 'register'} role="tab" aria-selected={activeTab === 'register'} onclick={() => selectTab('register')}>AWAKEN</button>
        </div>

        <!-- SIGN IN TAB -->
        <div class="tab-content" class:active={activeTab === 'signin'}>
            <form onsubmit={handleSigninSubmit}>
                <div class="field">
                    <label class="field-label" for="signinId">Survivor or Email</label>
                    <input class="field-input" id="signinId" type="text" autocomplete="username" placeholder="survivor@theark" bind:value={signinId} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                </div>
                <div class="field">
                    <label class="field-label" for="signinKey">Passcode</label>
                    <input class="field-input" id="signinKey" type="password" autocomplete="current-password" placeholder="••••••••••" bind:value={signinKey} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                </div>
                <button class="submit-btn" type="submit" disabled={signinBtnDisabled}>
                    {signinBtnLabel} {#if signinBtnLabel === 'Enter the ARK'}<span aria-hidden="true">▸</span>{/if}
                </button>
            </form>
        </div>

        <!-- REGISTER TAB -->
        <div class="tab-content" class:active={activeTab === 'register'}>
            <form onsubmit={handleRegisterSubmit}>
                <div class="field">
                    <label class="field-label" for="regEmail">Email</label>
                    <input class="field-input" id="regEmail" type="email" autocomplete="email" placeholder="survivor@theark" bind:value={regEmail} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                </div>
                <div class="field">
                    <label class="field-label" for="regCallsign">Survivor Name</label>
                    <input class="field-input" id="regCallsign" type="text" placeholder="What should the tribes call you?" bind:value={regCallsign} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                </div>
                <div class="field">
                    <label class="field-label" for="regKey">Passcode</label>
                    <input class="field-input" id="regKey" type="password" autocomplete="new-password" placeholder="Minimum 8 characters" bind:value={regKey} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                </div>
                <button class="submit-btn" type="submit" disabled={registerBtnDisabled}>
                    {registerBtnLabel} {#if registerBtnLabel === 'Awaken'}<span aria-hidden="true">▸</span>{/if}
                </button>
            </form>
        </div>

        <!-- AI status line -->
        <div class="status-line {statusMode}">
            {#if statusUsePulse}
                <span class="pulse-dot"></span>{statusText}
            {:else}
                <span class="prefix">›</span>{statusText}
            {/if}
        </div>

        <!-- Guest link -->
        <div class="cta-alts">
            <button class="cta-alt" type="button" onclick={browseAsGuest}>
                Browse as guest <span class="arrow">▸</span>
            </button>
        </div>
    </div>

    <!-- ═══════════ TELEMETRY ═══════════ -->
    <div class="telemetry">
        <div class="telemetry-item">
            <span class="telemetry-pip"></span>
            NETWORK · <span class="telemetry-val">OPERATIONAL</span>
        </div>
        <div class="telemetry-item">
            <span class="telemetry-pip blue"></span>
            OBELISK · <span class="telemetry-val">LINKED</span>
        </div>
        <div class="telemetry-item">
            <span class="telemetry-pip purple"></span>
            DOSSIERS · <span class="telemetry-val">SYNCHRONIZED</span>
        </div>
    </div>
</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:root {
    --tek-bg:           #050812;
    --tek-blue:         #00b4ff;
    --tek-blue-dim:     rgba(0, 180, 255, 0.12);
    --tek-blue-border:  rgba(0, 180, 255, 0.22);
    --tek-blue-glow:    rgba(0, 180, 255, 0.35);
    --tek-purple:       #8b5cf6;
    --tek-amber:        #f59e0b;
    --tek-green:        #10b981;
    --tek-red:          #ef4444;
    --tek-discord:      #5865f2;
    --tek-text:         #e2e8f0;
    --tek-text-dim:     #64748b;
    --tek-text-faint:   #334155;
    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

:global(*), :global(*::before), :global(*::after) { box-sizing: border-box; margin: 0; padding: 0; }
:global(html), :global(body) {
    background: var(--tek-bg);
    color: var(--tek-text);
    font-family: var(--tek-font);
    min-height: 100vh;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
}

/* Atmospheric drop-glow — matches landing */
:global(body::before) {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(ellipse 70% 50% at 15% 8%,  rgba(0,180,255,0.07) 0%, transparent 55%),
        radial-gradient(ellipse 55% 45% at 85% 85%, rgba(139,92,246,0.06) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
}

.stage {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 24px 96px;
}

/* ── HERO ──────────────────────────────────────────────────────── */
.hero {
    text-align: center;
    max-width: 580px;
    opacity: 0;
    animation: hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    margin-bottom: 28px;
}
@keyframes hero-in {
    from { opacity: 0; transform: translateY(12px); filter: blur(2px); }
    to   { opacity: 1; transform: none; filter: blur(0); }
}

.hero-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 88px;
    margin-bottom: 14px;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 14px rgba(0,180,255,0.35)) drop-shadow(0 0 32px rgba(0,180,255,0.20));
    animation: mark-pulse 3.2s ease-in-out infinite;
}
@keyframes mark-pulse {
    0%, 100% { filter: drop-shadow(0 0 14px rgba(0,180,255,0.35)) drop-shadow(0 0 32px rgba(0,180,255,0.20)); }
    50%      { filter: drop-shadow(0 0 22px rgba(0,180,255,0.55)) drop-shadow(0 0 48px rgba(0,180,255,0.30)); }
}

.hero-wordmark {
    font-family: var(--tek-font);
    font-size: clamp(2.6rem, 8vw, 4rem);
    font-weight: 800;
    letter-spacing: 0.18em;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #00b4ff 45%, #8b5cf6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 24px rgba(0,180,255,0.30));
    margin-bottom: 4px;
}

.hero-version {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
    margin-bottom: 20px;
}
.hero-version .status-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 6px rgba(16,185,129,0.6);
    margin-right: 6px;
    vertical-align: middle;
    animation: pip-pulse 2s ease-in-out infinite;
}
@keyframes pip-pulse {
    0%, 100% { box-shadow: 0 0 6px rgba(16,185,129,0.6); }
    50%      { box-shadow: 0 0 12px rgba(16,185,129,0.9); }
}

.hero-greeting {
    font-family: var(--tek-mono);
    font-size: 0.80rem;
    color: var(--tek-blue);
    letter-spacing: 0.18em;
    margin-bottom: 12px;
    text-shadow: 0 0 8px rgba(0,180,255,0.30);
}
.hero-greeting .prefix { opacity: 0.5; margin-right: 4px; }

.hero-tagline {
    font-size: 0.96rem;
    color: var(--tek-text);
    line-height: 1.65;
    max-width: 480px;
    margin: 0 auto;
}
.hero-tagline .accent { color: var(--tek-blue); }

/* ── ACTIONS / FORMS ───────────────────────────────────────────── */
.actions {
    width: 100%;
    max-width: 440px;
    opacity: 0;
    animation: hero-in 0.7s 0.20s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.cta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 13px 22px;
    font-family: inherit;
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-decoration: none;
    cursor: pointer;
    border: none;
    text-transform: uppercase;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    transition: filter 0.18s, transform 0.18s;
    width: 100%;
}
.cta-discord {
    background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
    color: #fff;
    filter: drop-shadow(0 0 12px rgba(88,101,242,0.45));
}
.cta-discord:hover {
    filter: drop-shadow(0 0 22px rgba(88,101,242,0.80));
    transform: translateY(-1px);
}

.divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0 16px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
}
.divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
}

/* Tabs */
.tabs {
    display: flex;
    margin-bottom: 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tab {
    flex: 1;
    background: none;
    border: none;
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.16em;
    padding: 10px 0;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.2s, border-color 0.2s;
}
.tab:hover { color: var(--tek-text-dim); }
.tab.active {
    color: var(--tek-blue);
    border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 8px rgba(0,180,255,0.35);
}

/* Form */
.field { margin-bottom: 12px; }
.field-label {
    display: block;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    margin-bottom: 5px;
}
.field-input {
    display: block;
    width: 100%;
    background: rgba(4,8,20,0.7);
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 14px;
    font-family: inherit;
    font-size: 0.92rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.field-input::placeholder { color: var(--tek-text-faint); }
.field-input:hover {
    border-color: rgba(255,255,255,0.12);
    border-bottom-color: rgba(0,180,255,0.32);
}
.field-input:focus {
    border-color: rgba(0,180,255,0.40);
    border-bottom-color: var(--tek-blue);
    box-shadow: 0 1px 0 rgba(0,180,255,0.45), 0 0 0 3px rgba(0,180,255,0.07);
    background: rgba(0,15,35,0.85);
}

.submit-btn {
    width: 100%;
    padding: 13px;
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    font-family: inherit;
    font-size: 0.86rem;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    filter: drop-shadow(0 0 12px rgba(0,180,255,0.50));
    transition: filter 0.18s, transform 0.18s;
    margin-top: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.submit-btn:hover {
    filter: drop-shadow(0 0 22px rgba(0,180,255,0.80));
    transform: translateY(-1px);
}
.submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

/* Tab content swap */
.tab-content { display: none; }
.tab-content.active { display: block; animation: tab-in 0.3s ease-out; }
@keyframes tab-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: none; }
}

/* AI status line */
.status-line {
    margin-top: 14px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-align: center;
    min-height: 18px;
    transition: color 0.3s;
}
.status-line.active { color: var(--tek-blue); }
.status-line.error  { color: var(--tek-red); }
.status-line .prefix { opacity: 0.6; margin-right: 4px; }
.status-line .pulse-dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: currentColor;
    margin-right: 6px;
    vertical-align: middle;
    animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
}

/* Guest link */
.cta-alts {
    display: flex;
    justify-content: center;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.04);
}
.cta-alt {
    background: transparent;
    color: var(--tek-text-dim);
    font-family: inherit;
    font-size: 0.80rem;
    letter-spacing: 0.04em;
    padding: 6px 4px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: color 0.18s;
}
.cta-alt:hover { color: var(--tek-text); }
.cta-alt .arrow { color: var(--tek-blue); margin-left: 3px; }

/* ── TELEMETRY ─────────────────────────────────────────────────── */
.telemetry {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    font-family: var(--tek-mono);
    font-size: 0.64rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    margin-top: 32px;
    opacity: 0;
    animation: hero-in 0.7s 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.telemetry-item { display: flex; align-items: center; gap: 6px; }
.telemetry-pip {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
}
.telemetry-pip.blue   { background: var(--tek-blue);   box-shadow: 0 0 5px rgba(0,180,255,0.35); }
.telemetry-pip.purple { background: var(--tek-purple); box-shadow: 0 0 5px rgba(139,92,246,0.6); }
.telemetry-val { color: var(--tek-blue); font-weight: 600; }

/* Footer note */
.bottom-note {
    position: fixed;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-align: center;
    white-space: nowrap;
}

/* Mobile */
@media (max-width: 520px) {
    .stage { padding: 32px 18px 96px; }
    .hero-wordmark { font-size: 2.4rem; }
    .hero-tagline { font-size: 0.88rem; }
    .telemetry { gap: 12px; font-size: 0.58rem; }
    .bottom-note { font-size: 0.55rem; white-space: normal; padding: 0 12px; }
}
</style>
