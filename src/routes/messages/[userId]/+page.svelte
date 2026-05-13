<script lang="ts">
    import { onMount, tick } from 'svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type Message = { id: number; fromUserId: number; toUserId: number; message: string; createdAt: string | Date; read: boolean };

    let messages = $state<Message[]>(data.messages as unknown as Message[]);
    let input = $state('');
    let sending = $state(false);
    let threadEl: HTMLDivElement;
    let hexCanvas: HTMLCanvasElement;

    const partner = $derived(data.other);
    const partnerName = $derived(partner?.nickname ?? partner?.email?.split('@')[0] ?? 'Survivor');
    const partnerInitial = $derived((partnerName.charAt(0) ?? '?').toUpperCase());
    const myInitial = 'C';

    async function send() {
        const text = input.trim();
        if (!text || sending) return;
        sending = true;
        const tempId = Date.now();
        messages = [...messages, {
            id: tempId,
            fromUserId: data.myId,
            toUserId: partner!.id,
            message: text,
            createdAt: new Date().toISOString(),
            read: false
        }];
        input = '';
        await tick();
        scrollToBottom();
        try {
            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ toUserId: partner!.id, message: text })
            });
            if (res.ok) {
                const body = await res.json();
                messages = messages.map(m => m.id === tempId ? body.message : m);
            }
        } catch {}
        sending = false;
    }

    function scrollToBottom() {
        if (threadEl) threadEl.scrollTop = threadEl.scrollHeight;
    }

    function timeOf(d: string | Date) {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const isToday = date.toDateString() === today.toDateString();
        const isYesterday = date.toDateString() === yesterday.toDateString();
        const t = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toUpperCase();
        if (isToday) return `TODAY · ${t}`;
        if (isYesterday) return `YESTERDAY · ${t}`;
        return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()} · ${t}`;
    }

    function dayLabel(d: string | Date): string {
        const date = new Date(d);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    type Group = { label: string; key: string; msgs: Message[] };
    const grouped = $derived.by(() => {
        const out: Group[] = [];
        for (const m of messages) {
            const key = new Date(m.createdAt).toDateString();
            const label = dayLabel(m.createdAt);
            if (!out.length || out[out.length - 1].key !== key) out.push({ label, key, msgs: [m] });
            else out[out.length - 1].msgs.push(m);
        }
        return out;
    });

    onMount(() => {
        scrollToBottom();

        // Hex canvas animation
        if (!hexCanvas) return;
        const ctx = hexCanvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let rafId: number;
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
            ctx!.clearRect(0, 0, hexCanvas.width, hexCanvas.height);
            const cw = hexCanvas.width, ch = hexCanvas.height;
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
            hexCanvas.width = window.innerWidth;
            hexCanvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();
        draw();
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('resize', resize);
        };
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }
</script>

<svelte:head>
    <title>⬡ TEKOS — {partnerName}</title>
</svelte:head>

<canvas id="tekHexCanvas" bind:this={hexCanvas}></canvas>

<div class="stage">

    <div class="page-header">
        <div>
            <div class="page-title">Messages</div>
            <div class="page-sub">
                <span class="prefix">›</span>
                <span class="num">{messages.length}</span> MESSAGES · <span class="num green">●</span> THREAD
            </div>
        </div>
    </div>

    <div class="messages-app">

        <section class="pane thread-pane">

            <div class="thread-head">
                <div class="thread-head-avatar">
                    <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="2"/><text x="50" y="74" font-family="Orbitron" font-size="44" font-weight="900" text-anchor="middle" fill="#7dd3fc">{partnerInitial}</text></svg>
                    <div class="pip"></div>
                </div>
                <div class="thread-head-info">
                    <div class="thread-head-name">{partnerName}</div>
                    <div class="thread-head-meta"><span class="tribe">⌬ Survivor</span><span class="status">● Direct Message</span></div>
                </div>
                <div class="thread-head-actions">
                    <a class="head-btn" href="/survivors/{partner?.id}" title="View Dossier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>
                    <button class="head-btn" title="Search in thread"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></button>
                    <button class="head-btn" title="Pin thread"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg></button>
                    <button class="head-btn" title="More"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                </div>
            </div>

            <div class="thread-messages" bind:this={threadEl}>
                {#if messages.length === 0}
                    <div class="msg system">
                        <div class="msg-body">
                            <div class="msg-text">— No messages yet. Send the first one below. —</div>
                        </div>
                    </div>
                {:else}
                    {#each grouped as g}
                        <div class="date-divider">{g.label}</div>
                        {#each g.msgs as m (m.id)}
                            {@const mine = m.fromUserId === data.myId}
                            <div class="msg">
                                <div class="msg-avatar">
                                    {#if mine}
                                        <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(255,215,0,0.18)" stroke="#ffd700" stroke-width="3"/><text x="50" y="76" font-family="Orbitron" font-size="56" font-weight="900" text-anchor="middle" fill="#fde047">{myInitial}</text></svg>
                                    {:else}
                                        <svg viewBox="0 0 100 110"><polygon points="50,2 96,28 96,82 50,108 4,82 4,28" fill="rgba(0,180,255,0.18)" stroke="#00b4ff" stroke-width="3"/><text x="50" y="76" font-family="Orbitron" font-size="56" font-weight="900" text-anchor="middle" fill="#7dd3fc">{partnerInitial}</text></svg>
                                    {/if}
                                </div>
                                <div class="msg-body">
                                    <div class="msg-meta">
                                        <span class="who" class:me={mine}>{mine ? 'You' : partnerName}</span>
                                        <span class="time">{timeOf(m.createdAt)}</span>
                                    </div>
                                    <div class="msg-text">{m.message}</div>
                                </div>
                                <div class="msg-actions">
                                    <button class="msg-action" title="React">☺</button>
                                    <button class="msg-action" title="Reply">↩</button>
                                    {#if mine}<button class="msg-action" title="Edit">✎</button>{/if}
                                    <button class="msg-action" title="More">⋮</button>
                                </div>
                            </div>
                        {/each}
                    {/each}
                {/if}
            </div>

            <!-- COMPOSER -->
            <div class="composer">
                <div class="composer-toolbar">
                    <button class="tool-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>Share Specimen</button>
                    <button class="tool-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>Listing</button>
                    <button class="tool-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>War Room</button>
                    <button class="tool-btn">@ Mention</button>
                    <button class="tool-btn">☺ React</button>
                </div>
                <div class="composer-row">
                    <textarea class="composer-input" placeholder="Message {partnerName}…" rows="1"
                        bind:value={input}
                        onkeydown={onKeydown}></textarea>
                    <button class="composer-send" onclick={send} disabled={!input.trim() || sending}>Send <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                </div>
            </div>

        </section>

    </div>
</div>

<div class="bottom-note">⬡ ARK SURVIVAL ASCENDED · COMMUNITY PROJECT · NOT AFFILIATED WITH STUDIO WILDCARD</div>

<style>
:global(html), :global(body) {
    overflow-x: hidden;
}
:global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.08) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

.stage {
    position: relative; z-index: 2;
    height: 100vh;
    padding: 56px 24px 24px;
    max-width: 1380px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
.page-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;
    flex-shrink: 0;
}
.page-title {
    font-family: var(--tek-display);
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
    line-height: 1;
}
.page-sub {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.page-sub .prefix { color: var(--tek-blue); opacity: 0.6; margin-right: 4px; }
.page-sub .num { color: var(--tek-blue); font-weight: 700; }
.page-sub .num.green { color: var(--tek-green); }

/* ═════════════════════════════════════════════════════════════════════════
   MAIN — messages layout
   ═════════════════════════════════════════════════════════════════════════ */
.messages-app {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
    min-height: 0;
}

.pane {
    background: linear-gradient(160deg, rgba(10,18,44,0.88) 0%, rgba(4,8,20,0.96) 100%);
    backdrop-filter: blur(14px);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    filter: drop-shadow(0 0 1px rgba(0,180,255,0.20)) drop-shadow(0 12px 30px rgba(0,0,0,0.50));
}
.pane::before {
    content: '';
    position: absolute;
    left: 0; top: 14px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 6px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   THREAD PANE
   ═════════════════════════════════════════════════════════════════════════ */
.thread-head {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
}
.thread-head-avatar { width: 36px; height: 40px; position: relative; flex-shrink: 0; }
.thread-head-avatar svg { width: 100%; height: 100%; filter: drop-shadow(0 0 5px rgba(0,180,255,0.40)); }
.thread-head-avatar .pip {
    position: absolute; bottom: 2px; right: -1px;
    width: 9px; height: 9px;
    border-radius: 50%;
    background: var(--tek-green);
    border: 2px solid #050812;
    box-shadow: 0 0 5px rgba(16,185,129,0.65);
}
.thread-head-info { flex: 1; min-width: 0; line-height: 1.3; }
.thread-head-name {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: var(--tek-text);
    text-transform: uppercase;
}
.thread-head-meta {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.10em;
    margin-top: 2px;
}
.thread-head-meta .tribe { color: var(--tek-amber); font-weight: 600; }
.thread-head-meta .status { color: var(--tek-green); margin-left: 6px; }
.thread-head-actions { display: flex; gap: 6px; }
.head-btn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: var(--tek-text-dim);
    cursor: pointer;
    transition: all 0.18s;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    text-decoration: none;
}
.head-btn:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.30); background: rgba(0,180,255,0.06); }
.head-btn svg { width: 14px; height: 14px; }

.thread-messages {
    flex: 1;
    overflow-y: auto;
    padding: 18px 24px 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.thread-messages::-webkit-scrollbar { width: 5px; }
.thread-messages::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.date-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 6px 0;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.date-divider::before, .date-divider::after {
    content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
}

.msg {
    display: grid;
    grid-template-columns: 32px 1fr;
    gap: 11px;
    align-items: flex-start;
    position: relative;
}
.msg-avatar { width: 32px; height: 36px; flex-shrink: 0; margin-top: 2px; }
.msg-avatar svg { width: 100%; height: 100%; }
.msg-body { min-width: 0; }
.msg-meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
}
.msg-meta .who    { color: #fcd34d; font-weight: 700; letter-spacing: 0.06em; }
.msg-meta .who.me { color: #7dd3fc; }
.msg-meta .time   { color: var(--tek-text-faint); letter-spacing: 0.06em; }
.msg-text {
    font-size: 0.86rem;
    color: var(--tek-text);
    line-height: 1.55;
    word-wrap: break-word;
    white-space: pre-wrap;
}

/* Hover-revealed message actions */
.msg-actions {
    position: absolute;
    top: -10px; right: 8px;
    background: linear-gradient(160deg, rgba(20,28,52,0.96), rgba(8,14,28,0.99));
    border: 1px solid rgba(0,180,255,0.25);
    display: flex;
    gap: 2px;
    padding: 3px;
    opacity: 0;
    transition: opacity 0.15s;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    z-index: 4;
}
.msg:hover .msg-actions { opacity: 1; }
.msg-action {
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    padding: 4px 6px;
    cursor: pointer;
    font-size: 0.78rem;
    transition: all 0.18s;
}
.msg-action:hover { color: var(--tek-blue); background: rgba(0,180,255,0.10); }

/* System messages */
.msg.system {
    grid-template-columns: 1fr;
    text-align: center;
}
.msg.system .msg-text {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-faint);
    font-style: italic;
}

/* ═════════════════════════════════════════════════════════════════════════
   COMPOSER (input area)
   ═════════════════════════════════════════════════════════════════════════ */
.composer {
    padding: 14px 22px 16px;
    border-top: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
}
.composer-toolbar {
    display: flex;
    gap: 5px;
    margin-bottom: 8px;
}
.tool-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.06);
    color: var(--tek-text-faint);
    padding: 5px 9px;
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
    display: inline-flex;
    align-items: center;
    gap: 5px;
}
.tool-btn:hover { color: var(--tek-blue); border-color: rgba(0,180,255,0.30); background: rgba(0,180,255,0.05); }
.tool-btn svg { width: 11px; height: 11px; }

.composer-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 8px;
    align-items: stretch;
}
.composer-input {
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 10px 14px;
    font-family: inherit;
    font-size: 0.88rem;
    outline: none;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: border-color 0.2s, background 0.2s;
    resize: none;
    line-height: 1.4;
    min-height: 42px;
    max-height: 120px;
}
.composer-input::placeholder { color: var(--tek-text-faint); }
.composer-input:focus { border-color: rgba(0,180,255,0.40); border-bottom-color: var(--tek-blue); background: rgba(0,15,35,0.92); }
.composer-send {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 18px;
    border: none;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.40));
    transition: filter 0.18s, transform 0.18s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.composer-send:hover:not(:disabled) { filter: drop-shadow(0 0 16px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.composer-send:disabled { opacity: 0.4; cursor: not-allowed; }

.bottom-note {
    position: fixed;
    bottom: 6px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    white-space: nowrap;
}

@media (max-width: 720px) {
    .stage { padding: 50px 12px 16px; }
}
</style>
