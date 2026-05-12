<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';
    import { Pause, Play, SkipForward, X } from 'lucide-svelte';

    let { data }: { data: PageData } = $props();

    type Scene = {
        id: 'awaken' | 'codex' | 'vault' | 'cluster' | 'tribe' | 'begin';
        title: string;
        eyebrow: string;
        body: string;          // AI Companion line (Crimson Pro italic)
        bullets?: string[];
        cta?: string;
    };

    const SCENES: Scene[] = [
        {
            id: 'awaken',
            title: 'AWAKEN',
            eyebrow: 'SURVIVOR SIGNAL DETECTED',
            body: '"Implant link established. Initializing TekOS uplink. Bloodline registry coming online."',
            bullets: ['◐ Identity verified', '◐ Network synchronized', '◐ Obelisk handshake complete']
        },
        {
            id: 'codex',
            title: 'THE CODEX',
            eyebrow: 'YOUR IDENTITY',
            body: '"Every Survivor begins with a Codex. Your name, your face, your story. The wild remembers what you build."',
            bullets: [
                '✓ Handle  ·  set from your sign-in',
                '◇ Avatar  ·  customize in Settings → Account',
                '◇ Bio     ·  tell other Survivors who you are'
            ],
            cta: 'Continue →'
        },
        {
            id: 'vault',
            title: 'THE VAULT',
            eyebrow: 'YOUR BLOODLINES',
            body: '"Your bloodlines live here. Log them, breed them, watch them surpass their founders. Every mutation, every stat — tracked."',
            bullets: [
                'Save your first specimen',
                'Stats auto-compute Bloodline + Boss Ready badges',
                'Stack mutations across generations'
            ],
            cta: 'Continue →'
        },
        {
            id: 'cluster',
            title: 'THE CLUSTER',
            eyebrow: 'YOUR HOME SERVERS',
            body: '"TekOS bonds to your home cluster. The Obelisks pulse. You will know when they fall, when admins speak, when bosses stir."',
            bullets: [
                'Add the maps you play on',
                'Optional RCON unlocks rich event streams',
                'Live status pings every 30-60 seconds'
            ],
            cta: 'Continue →'
        },
        {
            id: 'tribe',
            title: 'TRIBE & OVERSEER',
            eyebrow: 'YOU ARE NOT ALONE',
            body: '"No Survivor walks alone for long. Your tribe coordinates. The Overseer tracks every boss the wild remembers — and what your line needs to bring it down."',
            bullets: [
                'Join an existing tribe or forge your own',
                'Overseer catalogs every boss across every map',
                'Coordinate war rooms with your tribe'
            ],
            cta: 'Continue →'
        },
        {
            id: 'begin',
            title: 'BEGIN',
            eyebrow: 'THE BLOODLINES WAIT',
            body: '"The implant is alive. The bloodlines wait. Begin."',
            cta: 'ENTER TEKOS'
        }
    ];

    let idx       = $state(0);
    let paused    = $state(false);
    let timer     = $state<ReturnType<typeof setTimeout> | null>(null);
    const SCENE_MS = 10000;

    const current = $derived(SCENES[idx]);
    const isFinal = $derived(idx === SCENES.length - 1);

    function advance() {
        if (idx < SCENES.length - 1) idx++;
        scheduleNext();
    }

    function back() {
        if (idx > 0) idx--;
        scheduleNext();
    }

    function scheduleNext() {
        if (timer) clearTimeout(timer);
        if (paused || isFinal) return;
        timer = setTimeout(() => advance(), SCENE_MS);
    }

    function togglePause() {
        paused = !paused;
        scheduleNext();
    }

    function skipToEnd() {
        if (timer) clearTimeout(timer);
        idx = SCENES.length - 1;
    }

    function enterTekos() {
        if (timer) clearTimeout(timer);
        goto('/dossier');
    }

    onMount(() => {
        scheduleNext();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advance(); }
            else if (e.key === 'ArrowLeft') { back(); }
            else if (e.key === 'Escape') { skipToEnd(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    onDestroy(() => { if (timer) clearTimeout(timer); });
</script>

<svelte:head>
    <title>⬡ TekOS — First Awakening</title>
</svelte:head>

<div class="awk-stage">

    <!-- Progress + controls bar -->
    <div class="awk-topbar">
        <div class="awk-progress">
            {#each SCENES as _, i}
                <div class="progress-dot" class:passed={i < idx} class:current={i === idx}></div>
            {/each}
        </div>
        <div class="awk-controls">
            <button class="ctrl-btn" onclick={togglePause} title={paused ? 'Resume' : 'Pause'}>
                {#if paused}<Play size={14} strokeWidth={2.5} />{:else}<Pause size={14} strokeWidth={2.5} />{/if}
            </button>
            <button class="ctrl-btn skip" onclick={skipToEnd} title="Skip to end">
                <SkipForward size={14} strokeWidth={2.5} />
                <span>SKIP</span>
            </button>
            <button class="ctrl-btn close" onclick={enterTekos} title="Exit">
                <X size={14} strokeWidth={2.5} />
            </button>
        </div>
    </div>

    <!-- Scene -->
    {#key current.id}
        <div class="awk-scene" class:final={current.id === 'begin'}>

            <div class="scene-eyebrow">
                <span class="pip"></span>
                {current.eyebrow}
                {#if current.id !== 'awaken' && current.id !== 'begin'}
                    <span class="scene-no">· SCENE {idx + 1} / {SCENES.length}</span>
                {/if}
            </div>

            {#if current.id === 'awaken'}
                <div class="implant-mark">
                    <svg viewBox="0 0 100 100" width="100" height="100" aria-hidden="true">
                        <defs>
                            <linearGradient id="awkImplant" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#a5d8ff"/>
                                <stop offset="100%" stop-color="#00b4ff"/>
                            </linearGradient>
                        </defs>
                        <polygon points="50,8 86,30 86,70 50,92 14,70 14,30" fill="none" stroke="url(#awkImplant)" stroke-width="2"/>
                        <polygon points="50,22 72,34 72,66 50,78 28,66 28,34" fill="rgba(0,180,255,0.12)" stroke="rgba(0,180,255,0.50)" stroke-width="1"/>
                        <circle cx="50" cy="50" r="6" fill="#a5d8ff"/>
                    </svg>
                </div>
                <h1 class="scene-greeting">
                    WELCOME, <span class="greeting-name">{data.displayName.toUpperCase()}</span>
                </h1>
            {/if}

            {#if current.id !== 'awaken'}
                <h1 class="scene-title">{current.title}</h1>
            {/if}

            <p class="scene-body">{current.body}</p>

            {#if current.bullets}
                <ul class="scene-bullets">
                    {#each current.bullets as b}<li>{b}</li>{/each}
                </ul>
            {/if}

            {#if current.id === 'begin'}
                <div class="checklist-card">
                    <div class="checklist-label">STARTER CHECKLIST</div>
                    <ul class="checklist">
                        <li>☐ <a href="/settings">Complete your Codex</a> (avatar, bio)</li>
                        <li>☐ <a href="/specimens/add">Save your first specimen</a></li>
                        <li>☐ <a href="/settings">Follow your servers</a></li>
                        <li>☐ <a href="/tribe">Choose your tribe path</a></li>
                    </ul>
                </div>
            {/if}

            {#if isFinal}
                <button class="scene-cta solid" onclick={enterTekos}>
                    ENTER TEKOS  ▸
                </button>
            {:else if current.cta}
                <button class="scene-cta" onclick={advance}>
                    {current.cta}
                </button>
            {/if}
        </div>
    {/key}

    <div class="awk-foot">
        ◐ Arrow keys to navigate · Space to advance · Esc to skip
    </div>
</div>

<style>
.awk-stage {
    position: relative;
    z-index: 2;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 24px clamp(20px, 4vw, 60px);
    max-width: 1080px;
    margin: 0 auto;
}

/* Top bar */
.awk-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 40px;
}
.awk-progress {
    display: flex;
    gap: 8px;
    align-items: center;
}
.progress-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tek-text-faint);
    transition: all 0.3s;
}
.progress-dot.passed { background: var(--tek-blue); box-shadow: 0 0 6px var(--tek-blue-glow); }
.progress-dot.current {
    background: var(--tek-blue);
    box-shadow: 0 0 10px var(--tek-blue-glow);
    width: 24px;
    border-radius: 4px;
}
.awk-controls { display: flex; gap: 8px; }
.ctrl-btn {
    background: rgba(5,8,18,0.6);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 7px 12px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.ctrl-btn:hover { color: var(--tek-blue); border-color: var(--tek-blue-border); }
.ctrl-btn.skip { color: var(--tek-amber); border-color: rgba(245,158,11,0.40); }
.ctrl-btn.skip:hover { background: rgba(245,158,11,0.10); }
.ctrl-btn.close:hover { color: var(--tek-red); border-color: rgba(239,68,68,0.40); }

/* Scene */
.awk-scene {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    text-align: left;
    max-width: 760px;
    animation: sceneIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    padding: 20px 0;
}
@keyframes sceneIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
}

.scene-eyebrow {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.24em;
    color: var(--tek-blue);
    text-transform: uppercase;
    margin-bottom: 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.scene-eyebrow .pip {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--tek-blue);
    box-shadow: 0 0 8px var(--tek-blue-glow);
    animation: blink 1.6s ease-in-out infinite;
}
.scene-eyebrow .scene-no {
    color: var(--tek-text-faint);
    text-shadow: none;
}
@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* Opening implant mark */
.implant-mark {
    margin-bottom: 20px;
    filter: drop-shadow(0 0 18px rgba(0, 180, 255, 0.40));
    animation: implantFlicker 2s ease-out;
}
@keyframes implantFlicker {
    0%   { opacity: 0; transform: scale(0.5); filter: brightness(2) drop-shadow(0 0 0 transparent); }
    50%  { opacity: 1; }
    65%  { opacity: 0.5; }
    100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 18px rgba(0, 180, 255, 0.40)); }
}

.scene-greeting {
    font-family: var(--tek-display);
    font-size: clamp(2rem, 5vw, 3.4rem);
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1.1;
    color: var(--tek-text);
    margin-bottom: 26px;
}
.greeting-name {
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 60%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 16px rgba(0,180,255,0.40));
}

.scene-title {
    font-family: var(--tek-display);
    font-size: clamp(2.4rem, 6vw, 4rem);
    font-weight: 900;
    letter-spacing: 0.10em;
    line-height: 1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 60%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 18px rgba(0,180,255,0.40));
    text-transform: uppercase;
    margin-bottom: 22px;
}

.scene-body {
    font-family: var(--tek-serif);
    font-style: italic;
    font-size: clamp(1.05rem, 2vw, 1.4rem);
    line-height: 1.55;
    color: var(--tek-text);
    max-width: 640px;
    margin-bottom: 26px;
}

.scene-bullets {
    list-style: none;
    padding: 0;
    margin: 0 0 32px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.scene-bullets li {
    font-family: var(--tek-mono);
    font-size: 0.92rem;
    letter-spacing: 0.06em;
    color: var(--tek-text-dim);
    padding-left: 18px;
    position: relative;
}
.scene-bullets li::before {
    content: '';
    position: absolute;
    left: 0; top: 11px;
    width: 8px;
    height: 1px;
    background: var(--tek-blue);
    box-shadow: 0 0 4px var(--tek-blue-glow);
}

/* Final-scene starter checklist */
.checklist-card {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.97) 100%);
    border: 1px solid var(--tek-blue-border);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 18px 22px;
    margin-bottom: 28px;
    max-width: 500px;
    position: relative;
}
.checklist-card::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.checklist-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.22em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 12px;
}
.checklist {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.checklist li {
    font-family: var(--tek-mono);
    font-size: 0.88rem;
    color: var(--tek-text);
    letter-spacing: 0.04em;
}
.checklist li a {
    color: var(--tek-blue);
    text-decoration: none;
    transition: color 0.15s;
}
.checklist li a:hover { text-shadow: 0 0 8px var(--tek-blue-glow); }

/* CTA */
.scene-cta {
    background: rgba(0,180,255,0.10);
    border: 1px solid var(--tek-blue);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    font-weight: 700;
    letter-spacing: 0.20em;
    padding: 13px 28px;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all 0.2s;
    text-transform: uppercase;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.scene-cta:hover {
    background: rgba(0,180,255,0.20);
    box-shadow: 0 0 16px rgba(0,180,255,0.40);
    transform: translateY(-1px);
}
.scene-cta.solid {
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    text-shadow: none;
    font-weight: 800;
    padding: 15px 36px;
    font-size: 0.95rem;
}
.scene-cta.solid:hover { box-shadow: 0 0 24px rgba(0,180,255,0.55); }

.awk-foot {
    margin-top: 24px;
    text-align: center;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

.awk-scene.final {
    align-items: center;
    text-align: center;
}
.awk-scene.final .scene-eyebrow,
.awk-scene.final .scene-body,
.awk-scene.final .scene-bullets,
.awk-scene.final .checklist-card {
    margin-left: auto;
    margin-right: auto;
}
</style>
