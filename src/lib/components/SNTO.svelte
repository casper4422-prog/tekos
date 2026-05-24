<!--
  src/lib/components/SNTO.svelte
  ------------------------------
  The TekOS guide drone. Mount once globally from +layout.svelte.
  v1 is scripted-only — no LLM backend. The component walks
  SNTO_ROOT from src/lib/sntoTopics.ts: clicking a chip drills into
  children or shows a pre-written answer in SNTO's mentor voice.

  Original AI-chat scaffold was kept for the visual shell (drone, panel,
  bubble layout, chip styling, animations); the fetch('/api/snto') call
  and the text composer are replaced with a topic-tree picker.

  Add to layout:
    import SNTO from '$lib/components/SNTO.svelte';
    {#if data.user}<SNTO />{/if}
-->
<script lang="ts">
    import { X, ArrowLeft, RotateCcw } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { SNTO_ROOT, type SntoTopic } from '$lib/sntoTopics';

    type Bubble =
        | { kind: 'snto'; text: string }
        | { kind: 'survivor'; text: string };

    let open = $state(false);
    let booted = $state(false);
    let pinged = $state(false); // hydrated from localStorage in onMount
    let thinking = $state(false);
    let bubbles = $state<Bubble[]>([]);
    let logEl = $state<HTMLDivElement | null>(null);

    // Topic-tree nav state
    let currentTopics = $state<SntoTopic[]>([...SNTO_ROOT]);
    let topicPath = $state<SntoTopic[]>([]); // breadcrumb for the Back button

    const GREETED_KEY = 'tekos_snto_greeted';

    function scrollDown() {
        queueMicrotask(() => { if (logEl) logEl.scrollTop = logEl.scrollHeight; });
    }

    function toggle() {
        open = !open;
        if (open && !booted) {
            booted = true;
            // Once they've opened SNTO, the attention ping is done for good.
            try { localStorage.setItem(GREETED_KEY, '1'); } catch { /* private mode */ }
            pinged = false;
            bubbles = [{
                kind: 'snto',
                text: "SNTO online. I'm your guide aboard TekOS — specimens, breeding, trades, boss runs. Pick a topic below and I'll point the way."
            }];
            scrollDown();
        }
    }

    async function pickTopic(topic: SntoTopic) {
        // Echo the user's pick as a survivor bubble
        bubbles = [...bubbles, { kind: 'survivor', text: topic.label }];
        thinking = true;
        scrollDown();
        // Brief beat to sell the "drone is processing" feel — typing dots.
        await new Promise(r => setTimeout(r, 520 + Math.random() * 260));
        thinking = false;

        if (topic.answer) {
            bubbles = [...bubbles, { kind: 'snto', text: topic.answer }];
        }

        // Navigate the tree
        if (topic.children && topic.children.length > 0) {
            topicPath = [...topicPath, topic];
            currentTopics = topic.children;
        }
        // Leaf topic — stay at the current level so the user can pick a sibling
        scrollDown();
    }

    function goBack() {
        if (topicPath.length === 0) return;
        const newPath = topicPath.slice(0, -1);
        topicPath = newPath;
        currentTopics = newPath.length === 0
            ? [...SNTO_ROOT]
            : (newPath[newPath.length - 1].children ?? [...SNTO_ROOT]);
    }

    function startOver() {
        topicPath = [];
        currentTopics = [...SNTO_ROOT];
        bubbles = bubbles.length > 0
            ? [bubbles[0], { kind: 'snto', text: "Back to the top. What do you need?" }]
            : bubbles;
        scrollDown();
    }

    onMount(() => {
        // Pulse the attention ring exactly once per browser — clears the first
        // time SNTO is opened. After that the drone just floats quietly.
        try {
            pinged = localStorage.getItem(GREETED_KEY) !== '1';
        } catch {
            pinged = true; // localStorage blocked → show the ping anyway
        }
    });
</script>

<!-- Comms panel -->
{#if open}
    <div class="snto-panel">
        <header class="snto-head">
            <div class="snto-head-id">
                <span class="snto-orb" class:thinking></span>
                <div>
                    <div class="snto-name">SNTO</div>
                    <div class="snto-status"><span class="snto-dot"></span>{thinking ? 'Processing…' : 'Online · Guide Drone'}</div>
                </div>
            </div>
            <button class="snto-x" onclick={() => (open = false)} aria-label="Minimize"><X size={14} /></button>
        </header>

        <div class="snto-log" bind:this={logEl}>
            {#each bubbles as b, i (i)}
                <div class="snto-row {b.kind}">
                    <div class="snto-bubble {b.kind}">{b.text}</div>
                </div>
            {/each}
            {#if thinking}
                <div class="snto-row snto"><div class="snto-bubble snto snto-typing"><i></i><i></i><i></i></div></div>
            {/if}
            {#if !thinking}
                <div class="snto-chips">
                    {#each currentTopics as t (t.id)}
                        <button class="snto-chip" onclick={() => pickTopic(t)}>{t.label}</button>
                    {/each}
                </div>
            {/if}
        </div>

        {#if topicPath.length > 0}
            <div class="snto-nav">
                <button class="snto-nav-btn" onclick={goBack} aria-label="Back">
                    <ArrowLeft size={12} /> Back
                </button>
                <button class="snto-nav-btn" onclick={startOver} aria-label="Start over">
                    <RotateCcw size={12} /> Start over
                </button>
            </div>
        {/if}
    </div>
{/if}

<!-- Floating drone trigger -->
<button class="snto-fab" class:open onclick={toggle} aria-label="Open SNTO guide">
    {#if pinged && !open}<span class="snto-ping"></span>{/if}
    <span class="snto-drone" class:thinking>
        <span class="snto-ring"></span>
        <span class="snto-core"></span>
    </span>
</button>

<style>
    /* All colors lean on TekOS tokens (--tek-blue etc.) with safe fallbacks. */
    .snto-fab {
        position: fixed; bottom: 22px; right: 22px; z-index: 900;
        width: 64px; height: 64px; display: grid; place-items: center;
        background: none; border: none; cursor: pointer; padding: 0;
        animation: snto-drift 4.5s ease-in-out infinite;
        filter: drop-shadow(0 0 10px var(--tek-blue-glow, rgba(0,180,255,0.45)));
    }
    .snto-fab:hover { filter: brightness(1.15) drop-shadow(0 0 14px var(--tek-blue-glow, rgba(0,180,255,0.55))); }

    .snto-drone { position: relative; width: 56px; height: 56px; display: block; }
    .snto-ring {
        position: absolute; inset: 0; border-radius: 50%;
        border: 2px dashed var(--tek-blue, #00b4ff); opacity: 0.55;
        animation: snto-spin 9s linear infinite;
        clip-path: polygon(50% 2%,93% 25%,93% 75%,50% 98%,7% 75%,7% 25%);
    }
    .snto-drone.thinking .snto-ring { animation-duration: 2.4s; }
    .snto-core {
        position: absolute; inset: 14px; border-radius: 50%;
        background: radial-gradient(circle at 50% 40%, #bff0ff 0%, var(--tek-blue, #00b4ff) 50%, #0a3a52 100%);
        box-shadow: 0 0 14px var(--tek-blue, #00b4ff);
        animation: snto-pulse 2.8s ease-in-out infinite;
    }
    .snto-drone.thinking .snto-core { animation-duration: 0.7s; }

    .snto-ping {
        position: absolute; inset: 8px; border-radius: 50%;
        border: 2px solid var(--tek-blue, #00b4ff);
        animation: snto-pingfx 1.8s ease-out infinite; pointer-events: none;
    }

    .snto-panel {
        position: fixed; bottom: 100px; right: 22px; z-index: 901;
        width: min(360px, calc(100vw - 44px)); height: 460px;
        display: flex; flex-direction: column;
        background: rgba(7,13,28,0.94); backdrop-filter: blur(10px);
        border: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28));
        clip-path: polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);
        box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 40px rgba(0,180,255,0.12);
        animation: snto-rise 0.28s cubic-bezier(.2,.9,.3,1) both;
        font-family: var(--tek-font, 'Inter', sans-serif);
    }
    .snto-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 14px; border-bottom: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28));
        background: rgba(0,180,255,0.05);
    }
    .snto-head-id { display: flex; align-items: center; gap: 10px; }
    .snto-orb {
        width: 22px; height: 22px; border-radius: 50%;
        background: radial-gradient(circle at 50% 40%, #bff0ff, var(--tek-blue, #00b4ff) 55%, #0a3a52);
        box-shadow: 0 0 8px var(--tek-blue, #00b4ff); animation: snto-pulse 2.8s ease-in-out infinite;
    }
    .snto-orb.thinking { animation-duration: 0.7s; }
    .snto-name { font-family: var(--tek-display, 'Orbitron', sans-serif); font-weight: 900; letter-spacing: 0.22em; color: #eaf7ff; font-size: 14px; }
    .snto-status { font-family: var(--tek-mono, 'JetBrains Mono', monospace); font-size: 10px; color: var(--tek-text-dim, #6b8497); display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    .snto-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 6px #22c55e; }
    .snto-x { background: none; border: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28)); color: #cbe6f5; width: 26px; height: 26px; cursor: pointer; display: grid; place-items: center; }

    .snto-log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .snto-row { display: flex; }
    .snto-row.survivor { justify-content: flex-end; }
    .snto-bubble { max-width: 88%; padding: 9px 12px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-wrap: break-word; }
    .snto-bubble.snto { background: rgba(0,180,255,0.09); border: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28)); color: #cbe6f5; clip-path: polygon(0 0,100% 0,100% 100%,8px 100%,0 calc(100% - 8px)); }
    .snto-bubble.survivor { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #e9f1f7; clip-path: polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%); }

    .snto-typing { display: inline-flex; gap: 4px; }
    .snto-typing i { width: 6px; height: 6px; border-radius: 50%; background: var(--tek-blue, #00b4ff); animation: snto-bounce 1.1s ease-in-out infinite; }
    .snto-typing i:nth-child(2) { animation-delay: 0.16s; }
    .snto-typing i:nth-child(3) { animation-delay: 0.32s; }

    .snto-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 4px; }
    .snto-chip {
        background: none; border: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28));
        color: var(--tek-blue, #00b4ff);
        font-family: var(--tek-mono, 'JetBrains Mono', monospace);
        font-size: 11px; padding: 7px 11px; cursor: pointer;
        clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
        transition: background 0.15s, border-color 0.15s;
    }
    .snto-chip:hover { background: rgba(0,180,255,0.12); border-color: var(--tek-blue, #00b4ff); }

    .snto-nav {
        display: flex; gap: 8px; padding: 10px 12px;
        border-top: 1px solid var(--tek-blue-border, rgba(0,180,255,0.28));
        background: rgba(0,180,255,0.03);
    }
    .snto-nav-btn {
        background: rgba(0,0,0,0.30); border: 1px solid rgba(255,255,255,0.08);
        color: var(--tek-text-dim, #94a3b8);
        font-family: var(--tek-mono, 'JetBrains Mono', monospace);
        font-size: 10.5px; letter-spacing: 0.10em; text-transform: uppercase;
        padding: 6px 10px; cursor: pointer;
        clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
        display: inline-flex; align-items: center; gap: 5px;
        transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .snto-nav-btn:hover {
        color: var(--tek-blue, #00b4ff);
        border-color: var(--tek-blue-border, rgba(0,180,255,0.28));
        background: rgba(0,180,255,0.08);
    }

    @keyframes snto-spin { to { transform: rotate(360deg); } }
    @keyframes snto-pulse { 0%,100% { transform: scale(0.85); opacity: 0.85; } 50% { transform: scale(1.12); opacity: 1; } }
    @keyframes snto-bounce { 0%,100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
    @keyframes snto-drift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    @keyframes snto-pingfx { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
    @keyframes snto-rise { from { transform: translateY(16px) scale(0.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
</style>
