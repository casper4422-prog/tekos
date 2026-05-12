<script lang="ts">
    type Mode = 'enter' | 'awaken';

    let mode      = $state<Mode>('enter');
    let survivor  = $state('');
    let passcode  = $state('');
    let nickname  = $state('');
    let error     = $state('');
    let status    = $state('');
    let loading   = $state(false);

    async function enterCodex(e: Event) {
        e.preventDefault();
        loading = true; error = ''; status = 'Linking implant…';
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: survivor, password: passcode })
            });
            const body = await res.json();
            if (res.ok) {
                status = 'Uplink established. Redirecting…';
                window.location.href = '/dossier';
            } else {
                error = body.error ?? 'Identity rejected. Try again.';
                status = '';
                loading = false;
            }
        } catch {
            error = 'Network connection unstable.';
            status = '';
            loading = false;
        }
    }

    async function awaken(e: Event) {
        e.preventDefault();
        loading = true; error = ''; status = 'Initializing new survivor…';
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: survivor, password: passcode, nickname })
            });
            const body = await res.json();
            if (res.ok) {
                status = 'Awakening complete. Redirecting…';
                window.location.href = '/dossier';
            } else {
                error = body.error ?? 'Awakening failed.';
                status = '';
                loading = false;
            }
        } catch {
            error = 'Network connection unstable.';
            status = '';
            loading = false;
        }
    }

    function browseAsGuest() {
        try { localStorage.setItem('tekos_guest', '1'); } catch {}
        window.location.href = '/dex';
    }

    function setMode(m: Mode) {
        mode = m;
        error = ''; status = '';
    }
</script>

<svelte:head>
    <title>⬡ TekOS — Codex</title>
</svelte:head>

<div id="tekLoginWrap">
    <div class="tek-login-panel">

        <!-- Logo -->
        <div class="tek-login-logo">
            <div class="tek-login-hex">⬡</div>
            <div class="tek-login-title">CODEX</div>
            <div class="tek-login-sub">Identity uplink · TekOS Survivor Network</div>
        </div>

        <!-- Mode tabs -->
        <div class="codex-tabs">
            <button class="codex-tab" class:active={mode === 'enter'}  onclick={() => setMode('enter')}>
                <span class="t-glyph">▸</span>
                ENTER
            </button>
            <button class="codex-tab" class:active={mode === 'awaken'} onclick={() => setMode('awaken')}>
                <span class="t-glyph">✦</span>
                AWAKEN
            </button>
        </div>

        {#if mode === 'enter'}
            <form onsubmit={enterCodex}>
                <div class="codex-field">
                    <label class="codex-label" for="loginSurvivor">SURVIVOR</label>
                    <input class="codex-input" id="loginSurvivor" type="text"
                        bind:value={survivor} required autocomplete="username"
                        placeholder="Email or Survivor handle" />
                </div>
                <div class="codex-field">
                    <label class="codex-label" for="loginPasscode">PASSCODE</label>
                    <input class="codex-input" id="loginPasscode" type="password"
                        bind:value={passcode} required autocomplete="current-password"
                        placeholder="••••••••" />
                </div>
                <button type="submit" class="codex-submit" disabled={loading}>
                    {loading ? 'LINKING IMPLANT…' : 'AWAKEN ▸'}
                </button>
            </form>

            <div class="codex-divider"><span>or</span></div>

            <button class="codex-discord" onclick={() => window.location.href = '/api/auth/discord/start'}>
                <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
                    <path d="M60.1 4.9A58.6 58.6 0 0045.6.5a.2.2 0 00-.2.1 40.9 40.9 0 00-1.8 3.7 54.1 54.1 0 00-16.3 0 37.2 37.2 0 00-1.9-3.7.2.2 0 00-.2-.1A58.4 58.4 0 0010.6 4.9a.2.2 0 00-.1.1C1.5 18.4-.9 31.5.3 44.5a.2.2 0 00.1.1 58.9 58.9 0 0017.7 9 .2.2 0 00.2-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.1 36.1 0 01-5.6 2.6.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.2.1A58.7 58.7 0 0070.6 44.6a.2.2 0 00.1-.1c1.4-14.9-2.4-27.9-10.5-39.5a.2.2 0 00-.1-.1zM23.7 36.7c-3.5 0-6.4-3.2-6.4-7.2s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.3 6.4 7.2 0 3.9-2.9 7.2-6.4 7.2z"/>
                </svg>
                Continue with Discord
            </button>

        {:else}
            <form onsubmit={awaken}>
                <div class="codex-field">
                    <label class="codex-label" for="regSurvivor">EMAIL <span class="req">*</span></label>
                    <input class="codex-input" id="regSurvivor" type="email"
                        bind:value={survivor} required autocomplete="email"
                        placeholder="your@email.com" />
                </div>
                <div class="codex-field">
                    <label class="codex-label" for="regNickname">SURVIVOR NAME</label>
                    <input class="codex-input" id="regNickname" type="text"
                        bind:value={nickname} autocomplete="nickname"
                        placeholder="The name the wild will remember" />
                </div>
                <div class="codex-field">
                    <label class="codex-label" for="regPasscode">PASSCODE <span class="req">*</span></label>
                    <input class="codex-input" id="regPasscode" type="password"
                        bind:value={passcode} required autocomplete="new-password"
                        placeholder="At least 8 characters" />
                </div>
                <button type="submit" class="codex-submit" disabled={loading}>
                    {loading ? 'INITIALIZING IMPLANT…' : 'BEGIN AWAKENING ▸'}
                </button>
            </form>
        {/if}

        {#if status && !error}
            <div class="codex-status" role="status">
                <span class="dot"></span>{status}
            </div>
        {/if}
        {#if error}
            <div class="tek-login-error" role="alert">{error}</div>
        {/if}

        <!-- Guest access -->
        <div class="codex-guest">
            <button type="button" class="codex-guest-btn" onclick={browseAsGuest}>
                <span class="t-glyph">›</span>
                Browse as guest — Dex &amp; Specimens, no implant required
            </button>
        </div>

    </div>
</div>

<style>
.codex-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 22px;
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
}
.codex-tab {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    padding: 13px 8px;
    cursor: pointer;
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-transform: uppercase;
}
.codex-tab:hover { color: var(--tek-text); }
.codex-tab.active {
    background: rgba(0,180,255,0.14);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.codex-tab .t-glyph {
    color: var(--tek-blue);
    text-shadow: 0 0 5px var(--tek-blue-glow);
}

.codex-field { margin-bottom: 14px; }
.codex-label {
    display: block;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.20em;
    color: var(--tek-blue);
    margin-bottom: 6px;
    text-transform: uppercase;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.codex-label .req { color: var(--tek-amber); margin-left: 3px; }
.codex-input {
    width: 100%;
    background: rgba(5,8,18,0.7);
    border: 1px solid rgba(100,116,139,0.30);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.88rem;
    padding: 11px 14px;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.15s;
    letter-spacing: 0.04em;
}
.codex-input::placeholder { color: var(--tek-text-faint); }
.codex-input:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 14px rgba(0,180,255,0.20);
    background: rgba(5,8,18,0.9);
}

.codex-submit {
    width: 100%;
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    border: none;
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    padding: 13px;
    margin-top: 4px;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all 0.2s;
    text-transform: uppercase;
}
.codex-submit:hover:not(:disabled) {
    box-shadow: 0 0 18px rgba(0,180,255,0.45);
}
.codex-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.codex-divider {
    text-align: center;
    margin: 18px 0;
    position: relative;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.codex-divider span {
    background: var(--tek-bg);
    padding: 0 14px;
    position: relative;
    z-index: 1;
}
.codex-divider::before {
    content: '';
    position: absolute;
    top: 50%; left: 0; right: 0;
    height: 1px;
    background: rgba(100,116,139,0.20);
}

.codex-discord {
    width: 100%;
    background: #5865f2;
    color: #fff;
    border: none;
    font-family: var(--tek-font);
    font-weight: 600;
    font-size: 0.92rem;
    padding: 11px;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s;
}
.codex-discord:hover {
    background: #4752d4;
    box-shadow: 0 0 18px rgba(88,101,242,0.45);
}

.codex-status {
    margin-top: 14px;
    padding: 9px 12px;
    background: rgba(0,180,255,0.06);
    border-left: 2px solid var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    letter-spacing: 0.10em;
    color: var(--tek-blue);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.codex-status .dot {
    display: inline-block;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
    margin-right: 8px;
    animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.codex-guest {
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid rgba(100,116,139,0.12);
    text-align: center;
}
.codex-guest-btn {
    background: none;
    border: none;
    color: var(--tek-text-faint);
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.10em;
    cursor: pointer;
    padding: 6px 4px;
    transition: color 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.codex-guest-btn:hover {
    color: var(--tek-blue);
}
.codex-guest-btn .t-glyph { color: var(--tek-blue); }
</style>
