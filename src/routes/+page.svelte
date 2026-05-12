<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    type BootLine = { text: string; at: number; final?: boolean };

    const BOOT_LINES: BootLine[] = [
        { text: 'INITIALIZING TEK CORE',       at: 150  },
        { text: 'LINKING ▸ THE ARK NETWORK',   at: 550  },
        { text: 'LOADING SURVIVOR DOSSIERS',   at: 950  },
        { text: 'IMPLANT ▸ AWAITING SURVIVOR', at: 1350 },
        { text: 'TEKOS ONLINE',                at: 1850, final: true }
    ];
    const BOOT_END = 2350;

    let bootLines = $state<{ text: string; final?: boolean }[]>([]);
    let showCursor = $state(false);
    let bootExiting = $state(false);
    let heroVisible = $state(false);

    function revealHero() {
        if (heroVisible) return;
        bootExiting = true;
        setTimeout(() => { heroVisible = true; }, 400);
    }

    function browseAsGuest() {
        try { localStorage.setItem('tekos_guest', '1'); } catch {}
        goto('/dossier');
    }

    onMount(() => {
        // Returning visitors within this session skip the boot
        let alreadySeen = false;
        try { alreadySeen = sessionStorage.getItem('tekos_seen_boot') === '1'; } catch {}

        if (alreadySeen) {
            heroVisible = true;
            return;
        }
        try { sessionStorage.setItem('tekos_seen_boot', '1'); } catch {}

        const timeouts: ReturnType<typeof setTimeout>[] = [];
        BOOT_LINES.forEach((line) => {
            timeouts.push(setTimeout(() => {
                bootLines = [...bootLines, { text: line.text, final: line.final }];
            }, line.at));
        });
        timeouts.push(setTimeout(() => { showCursor = true; }, BOOT_LINES[BOOT_LINES.length - 1].at + 200));
        timeouts.push(setTimeout(revealHero, BOOT_END));

        return () => timeouts.forEach(clearTimeout);
    });
</script>

<svelte:head>
    <title>⬡ TekOS — The Survivor Network</title>
</svelte:head>

<div class="stage">

    {#if !heroVisible}
        <button class="skip-btn" class:hidden={bootExiting} onclick={revealHero}>SKIP ▸</button>

        <div class="boot" class:exit={bootExiting}>
            {#each bootLines as line}
                <div class="boot-line">
                    <span class="prefix">›</span>
                    <span class="text">{line.text}</span>
                    <span class="ok">{line.final ? '[ONLINE]' : '[OK]'}</span>
                </div>
            {/each}
            {#if showCursor}<span class="boot-cursor"></span>{/if}
        </div>
    {:else}

        <div class="hero">
            <div class="hero-mark" aria-hidden="true">
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
                <span class="prefix">›</span>WELCOME, SURVIVOR.
            </div>

            <p class="hero-tagline">
                Built for the survivors of ARK: Survival Ascended.<br/>
                Track your <span class="accent">bloodlines</span>. Log your <span class="accent">boss runs</span>.
                Display your <span class="accent">badges</span>.
            </p>

            <div class="cta-stack">
                <a class="cta cta-discord" href="/api/auth/discord/start">
                    <svg width="18" height="18" viewBox="0 0 71 55" fill="currentColor" aria-hidden="true">
                        <path d="M60.1 4.9A58.6 58.6 0 0045.6.5a.2.2 0 00-.2.1 40.9 40.9 0 00-1.8 3.7 54.1 54.1 0 00-16.3 0 37.2 37.2 0 00-1.9-3.7.2.2 0 00-.2-.1A58.4 58.4 0 0010.6 4.9a.2.2 0 00-.1.1C1.5 18.4-.9 31.5.3 44.5a.2.2 0 00.1.1 58.9 58.9 0 0017.7 9 .2.2 0 00.2-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.6.2.2 0 010-.4l1.1-.8a.2.2 0 01.2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 01.2 0l1.1.8a.2.2 0 010 .4 36.1 36.1 0 01-5.6 2.6.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.2.1A58.7 58.7 0 0070.6 44.6a.2.2 0 00.1-.1c1.4-14.9-2.4-27.9-10.5-39.5a.2.2 0 00-.1-.1zM23.7 36.7c-3.5 0-6.4-3.2-6.4-7.2s2.9-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 3.9-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.5 0 6.4 3.3 6.4 7.2 0 3.9-2.9 7.2-6.4 7.2z"/>
                    </svg>
                    Continue with Discord
                </a>
                <div class="cta-alts">
                    <a class="cta-alt" href="/login">
                        Sign in with email <span class="arrow">▸</span>
                    </a>
                    <span class="cta-alt-sep">·</span>
                    <button class="cta-alt" type="button" onclick={browseAsGuest}>
                        Browse as guest <span class="arrow">▸</span>
                    </button>
                </div>
            </div>

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

    {/if}

    <div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>
</div>

<style>
.stage {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
}

/* Skip button (boot phase only) */
.skip-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 50;
    background: transparent;
    border: 1px solid rgba(0,180,255,0.20);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    padding: 7px 14px;
    cursor: pointer;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: background 0.2s, border-color 0.2s, opacity 0.3s;
}
.skip-btn:hover {
    background: var(--tek-blue-dim);
    border-color: var(--tek-blue);
}
.skip-btn.hidden { opacity: 0; pointer-events: none; }

/* Boot sequence */
.boot {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 320px;
    transition: opacity 0.4s, transform 0.4s;
}
.boot.exit {
    opacity: 0;
    transform: translate(-50%, -54%);
    pointer-events: none;
}
.boot-line {
    display: flex;
    align-items: baseline;
    gap: 10px;
    animation: bootIn 0.3s cubic-bezier(0.16,1,0.3,1) backwards;
}
@keyframes bootIn {
    from { opacity: 0; transform: translateX(-8px); }
    to   { opacity: 1; transform: translateX(0); }
}
.boot-line .prefix { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); }
.boot-line .text   { color: var(--tek-text); flex: 1; }
.boot-line .ok     { color: var(--tek-green); font-size: 0.7rem; }
.boot-line:last-child .ok { color: var(--tek-blue); text-shadow: 0 0 6px var(--tek-blue-glow); }
.boot-cursor {
    display: inline-block;
    width: 8px;
    height: 14px;
    background: var(--tek-blue);
    box-shadow: 0 0 6px var(--tek-blue-glow);
    margin-left: 4px;
    animation: blink 1s steps(2) infinite;
}
@keyframes blink {
    50% { opacity: 0; }
}

/* Hero */
.hero {
    position: relative;
    text-align: center;
    max-width: 560px;
    width: 100%;
    animation: heroIn 0.6s cubic-bezier(0.16,1,0.3,1);
}
@keyframes heroIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
.hero-mark {
    display: inline-flex;
    color: var(--tek-blue);
    margin-bottom: 14px;
    filter: drop-shadow(0 0 18px rgba(0,180,255,0.5));
}
.hero-wordmark {
    font-family: var(--tek-display);
    font-size: clamp(3rem, 8vw, 5.5rem);
    font-weight: 900;
    letter-spacing: 0.10em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 55%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 18px rgba(0,180,255,0.45));
    margin-bottom: 10px;
}
.hero-version {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-blue);
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    padding: 4px 10px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 6px rgba(16,185,129,0.6);
    animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.hero-greeting {
    font-family: var(--tek-mono);
    font-size: 0.9rem;
    letter-spacing: 0.14em;
    color: var(--tek-text);
    margin: 28px 0 14px;
}
.hero-greeting .prefix { color: var(--tek-blue); margin-right: 10px; text-shadow: 0 0 6px var(--tek-blue-glow); }
.hero-tagline {
    font-family: var(--tek-font);
    font-size: 1rem;
    color: var(--tek-text-dim);
    line-height: 1.6;
    margin: 0 auto 32px;
    max-width: 480px;
}
.hero-tagline .accent {
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}

/* CTA stack */
.cta-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    margin-bottom: 36px;
}
.cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 13px 28px;
    font-family: var(--tek-font);
    font-size: 0.94rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
    min-width: 280px;
}
.cta-discord {
    background: #5865f2;
    color: #fff;
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    box-shadow: 0 0 18px rgba(88,101,242,0.45), inset 0 1px 0 rgba(255,255,255,0.15);
}
.cta-discord:hover {
    background: #4752d4;
    box-shadow: 0 0 24px rgba(88,101,242,0.6), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-1px);
}
.cta-alts {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 0.78rem;
    font-family: var(--tek-mono);
    letter-spacing: 0.10em;
}
.cta-alt {
    background: none;
    border: none;
    color: var(--tek-text-dim);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    letter-spacing: inherit;
    padding: 6px 4px;
    transition: color 0.15s;
}
.cta-alt:hover {
    color: var(--tek-blue);
}
.cta-alt .arrow { transition: transform 0.15s; display: inline-block; }
.cta-alt:hover .arrow { transform: translateX(3px); color: var(--tek-blue); }
.cta-alt-sep { color: var(--tek-text-faint); }

/* Telemetry strip */
.telemetry {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 8px;
    padding-top: 22px;
    border-top: 1px solid rgba(255,255,255,0.05);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
}
.telemetry-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
.telemetry-pip {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
}
.telemetry-pip.blue   { background: var(--tek-blue);   box-shadow: 0 0 5px var(--tek-blue-glow); }
.telemetry-pip.purple { background: var(--tek-purple); box-shadow: 0 0 5px rgba(139,92,246,0.6); }
.telemetry-val { color: var(--tek-text); letter-spacing: 0.10em; }

.bottom-note {
    position: absolute;
    bottom: 16px;
    left: 0; right: 0;
    text-align: center;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
}
</style>
