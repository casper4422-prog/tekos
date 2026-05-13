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

    let canvasEl: HTMLCanvasElement | null = $state(null);

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
                body: JSON.stringify({ email: signinId, password: signinKey })
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
        window.location.href = '/dex';
    }

    onMount(() => {
        /* Hex grid background — same as live site */
        const canvas = canvasEl;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let rafId = 0;

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
            rafId = requestAnimationFrame(draw);
        }
        function resize() {
            canvas!.width = window.innerWidth;
            canvas!.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
        };
    });
</script>

<svelte:head>
    <title>⬡ TEKOS — Codex</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">
    <div class="panel-shell">
        <div class="panel">

            <div class="panel-header">
                <div class="panel-mark">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                </div>
                <div class="panel-title">CODEX</div>
                <div class="panel-subtitle">
                    <span class="prefix">›</span>SURVIVOR ACCESS
                </div>
            </div>

            <div class="tabs" role="tablist">
                <button class="tab" class:active={activeTab === 'signin'} data-tab="signin" role="tab" aria-selected={activeTab === 'signin'} onclick={() => selectTab('signin')}>ENTER</button>
                <button class="tab" class:active={activeTab === 'register'} data-tab="register" role="tab" aria-selected={activeTab === 'register'} onclick={() => selectTab('register')}>AWAKEN</button>
            </div>

            <!-- SIGN IN TAB -->
            <div class="tab-content" class:active={activeTab === 'signin'} data-tab-content="signin">
                <form id="signinForm" onsubmit={handleSigninSubmit}>
                    <div class="field">
                        <label class="field-label" for="signinId">Survivor or Email</label>
                        <input class="field-input" id="signinId" type="text" autocomplete="username" placeholder="survivor@theark" bind:value={signinId} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                    </div>
                    <div class="field">
                        <label class="field-label" for="signinKey">Passcode</label>
                        <input class="field-input" id="signinKey" type="password" autocomplete="current-password" placeholder="••••••••••" bind:value={signinKey} onfocus={handleFieldFocus} onblur={handleFieldBlur} />
                    </div>
                    <button class="submit-btn" type="submit" id="signinBtn" disabled={signinBtnDisabled}>
                        {signinBtnLabel} {#if signinBtnLabel === 'Enter the ARK'}<span aria-hidden="true">▸</span>{/if}
                    </button>
                </form>
            </div>

            <!-- REGISTER TAB -->
            <div class="tab-content" class:active={activeTab === 'register'} data-tab-content="register">
                <form id="registerForm" onsubmit={handleRegisterSubmit}>
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
                    <button class="submit-btn" type="submit" id="registerBtn" disabled={registerBtnDisabled}>
                        {registerBtnLabel} {#if registerBtnLabel === 'Awaken'}<span aria-hidden="true">▸</span>{/if}
                    </button>
                </form>
            </div>

            <!-- AI status line -->
            <div class="status-line {statusMode}" id="statusLine">
                {#if statusUsePulse}
                    <span class="pulse-dot"></span>{statusText}
                {:else}
                    <span class="prefix">›</span>{statusText}
                {/if}
            </div>

            <div class="guest-row">
                <button class="guest-link" type="button" onclick={browseAsGuest}>
                    Browse as guest <span class="arrow">▸</span>
                </button>
            </div>

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

#tekHexCanvas {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
}

/* ── Stage ──────────────────────────────────────────────────────────────── */
.stage {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 24px 80px;
}

/* ── Login panel ────────────────────────────────────────────────────────── */
.panel {
    position: relative;
    width: 100%;
    max-width: 460px;
    background: linear-gradient(160deg, rgba(10,18,44,0.92) 0%, rgba(4,8,20,0.96) 100%);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 36px 34px 28px;
    overflow: hidden;
    animation: panel-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* The panel sits inside a slightly larger drop-shadow wrapper to keep glow visible */
.panel-shell {
    position: relative;
    filter:
        drop-shadow(0 0 1px rgba(0,180,255,0.30))
        drop-shadow(0 0 40px rgba(0,180,255,0.08))
        drop-shadow(0 0 100px rgba(139,92,246,0.05))
        drop-shadow(0 28px 80px rgba(0,0,0,0.65));
}

@keyframes panel-in {
    from { opacity: 0; transform: translateY(14px) scale(0.97); filter: blur(2px); }
    to   { opacity: 1; transform: none; filter: blur(0); }
}

/* Initial scanner sweep across the panel */
.panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(0,180,255,0.18) 50%, transparent 100%);
    height: 60px;
    top: -60px;
    pointer-events: none;
    animation: scanner-sweep 1.4s 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}
@keyframes scanner-sweep {
    0%   { top: -60px; opacity: 0; }
    20%  { opacity: 1; }
    100% { top: calc(100% + 20px); opacity: 0; }
}

/* Left accent rail */
.panel::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue) 0%, var(--tek-purple) 100%);
    box-shadow: 0 0 8px var(--tek-blue-glow);
    z-index: 2;
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.panel-header {
    text-align: center;
    margin-bottom: 24px;
}
.panel-mark {
    display: inline-flex;
    color: var(--tek-blue);
    filter: drop-shadow(0 0 10px var(--tek-blue-glow));
    margin-bottom: 12px;
    animation: mark-pulse 3s ease-in-out infinite;
}
@keyframes mark-pulse {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(0,180,255,0.35)); }
    50%      { filter: drop-shadow(0 0 18px rgba(0,180,255,0.65)); }
}
.panel-title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    line-height: 1;
    background: linear-gradient(135deg, #00d4ff 0%, #00b4ff 60%, #8b5cf6 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 6px;
}
.panel-subtitle {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-dim);
}
.panel-subtitle .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }

/* ── Tabs ───────────────────────────────────────────────────────────────── */
.tabs {
    display: flex;
    margin-bottom: 22px;
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
    padding: 11px 0;
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

/* ── Discord button (primary) ───────────────────────────────────────────── */
.discord-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 13px;
    background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%);
    color: #fff;
    font-family: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    text-decoration: none;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    filter: drop-shadow(0 0 10px rgba(88,101,242,0.40));
    transition: filter 0.18s, transform 0.18s;
    margin-bottom: 18px;
}
.discord-btn:hover {
    filter: drop-shadow(0 0 20px rgba(88,101,242,0.80));
    transform: translateY(-1px);
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
.divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0 0 18px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.2em;
    color: var(--tek-text-faint);
}
.divider::before, .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
}

/* ── Form ───────────────────────────────────────────────────────────────── */
.field { margin-bottom: 14px; }
.field-label {
    display: block;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    margin-bottom: 6px;
}
.field-input {
    display: block;
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.07);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 11px 14px;
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
    background: rgba(0,15,35,0.92);
}

/* ── Submit button ──────────────────────────────────────────────────────── */
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

/* ── AI status line ─────────────────────────────────────────────────────── */
.status-line {
    margin-top: 16px;
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

/* ── Guest link ─────────────────────────────────────────────────────────── */
.guest-row {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.04);
    text-align: center;
}
.guest-link {
    background: none;
    border: none;
    color: var(--tek-text-faint);
    font-family: inherit;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    text-decoration: none;
    transition: color 0.2s;
}
.guest-link:hover { color: var(--tek-text-dim); }
.guest-link .arrow { color: var(--tek-blue); margin-left: 4px; }

/* ── Footer ─────────────────────────────────────────────────────────────── */
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

/* ── Tab content swap ───────────────────────────────────────────────────── */
.tab-content { display: none; }
.tab-content.active { display: block; animation: tab-in 0.3s ease-out; }
@keyframes tab-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: none; }
}

/* ── Mobile ─────────────────────────────────────────────────────────────── */
@media (max-width: 520px) {
    .panel { padding: 28px 22px 22px; }
    .panel-title { font-size: 1.25rem; }
    .bottom-note { font-size: 0.55rem; }
}
</style>
