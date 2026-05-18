<!--
    PinModal — dual-mode modal for the TekOS dossier / specimens vault.

    MODES
    ─────
    project  (default) — "Pin Breeding Project" picker per pin-modal-preview.html.
                         Single-select creature + focus stat + target mutations.
                         onSave({ creatureId, focusStat, targetMutations })
    featured           — legacy multi-select (up to 4) for dossier "Featured Specimens"
                         showcase. onSave({ creatureIds })

    Layout, classes, and CSS hooks (`.pm-overlay`, `.pm-card`, `.pm-head`,
    `.pm-step`, `.stat-pick`, `.stat-pick-cell`, `.mut-counter`) match the
    static preview at static/pin-modal-preview.html.
-->
<script lang="ts">
    import { onMount } from 'svelte';
    import HexAvatar from './HexAvatar.svelte';
    import type { CreatureRow } from '$lib/types';

    // The 8 ARK stats per spec (preview shows 7; spec requires SPD too).
    const STATS = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA', 'SPD'] as const;
    type StatKey = (typeof STATS)[number];

    type ProjectSavePayload = {
        creatureId: number;
        focusStat: StatKey | null;
        targetMutations: number;
    };
    type FeaturedSavePayload = { creatureIds: number[] };

    // Accepts either nested CreatureRow (id + data:{...}) or flat VaultCreature
    // (id + name/species/baseStats/... at root). `normCreatures` reconciles both.
    type PinModalCreature = CreatureRow | {
        id: number;
        createdAt?: Date;
        name?: string;
        species?: string;
        level?: number;
        gender?: string;
        baseStats?: Record<string, number>;
        mutations?: Record<string, number>;
        domesticLevels?: Record<string, number>;
    };

    type Props = {
        open?: boolean;
        creatures: PinModalCreature[];
        mode?: 'project' | 'featured';
        /** featured-mode: currently pinned creature ids (multi-select prefill). */
        pinned?: number[];
        /** project-mode: edit an existing pinned project — pre-selects the creature. */
        existingProjectId?: number | null;
        /** project-mode: existing project being edited (focusStat + targetMutations prefill). */
        existingProject?: { creatureId: number; focusStat: StatKey | null; targetMutations: number } | null;
        /** project-mode: max active projects. Default 3. */
        maxProjects?: number;
        /** featured-mode: max selections. Default 4. */
        maxFeatured?: number;
        onSave: (payload: ProjectSavePayload | FeaturedSavePayload) => Promise<void> | void;
    };

    let {
        open = $bindable(false),
        creatures,
        mode = 'project',
        pinned = [],
        existingProjectId = null,
        existingProject = null,
        maxProjects = 3,
        maxFeatured = 4,
        onSave
    }: Props = $props();

    // Normalize incoming creatures so callers can pass either:
    //   nested CreatureRow ({ id, data: { name, species, ... } }) — used by /specimens/[id]
    //   flat VaultCreature ({ id, name, species, ... }) — used by /dossier and /specimens vault
    // Without this normalization, accessing c.data.name on a flat row crashes at render.
    const normCreatures = $derived(
        (creatures ?? []).map((c) => {
            const anyC = c as unknown as Record<string, unknown>;
            const inner = (anyC.data && typeof anyC.data === 'object')
                ? (anyC.data as Record<string, unknown>)
                : anyC;
            return {
                id: Number(anyC.id),
                userId: Number(anyC.userId ?? 0),
                createdAt: (anyC.createdAt as Date) ?? new Date(),
                data: {
                    name:           String(inner.name ?? ''),
                    species:        String(inner.species ?? ''),
                    level:          inner.level as number,
                    gender:         inner.gender as string,
                    baseStats:      (inner.baseStats ?? {}) as Record<string, number>,
                    mutations:      (inner.mutations ?? {}) as Record<string, number>,
                    domesticLevels: (inner.domesticLevels ?? {}) as Record<string, number>
                }
            } as CreatureRow;
        })
    );

    // ────────────────────────── State ──────────────────────────
    let search = $state('');
    let closing = $state(false);
    let saving = $state(false);

    // featured-mode: multi-select
    let selectedIds = $state<number[]>([...pinned]);

    // project-mode: single-select + focus stat + counter
    let selectedCreatureId = $state<number | null>(existingProjectId ?? null);
    let focusStat = $state<StatKey | null>(existingProject?.focusStat ?? null);
    let targetMutations = $state<number>(existingProject?.targetMutations ?? 0);

    // When the caller pre-selects a creature (clicking "Pin Project" from a specific
    // creature card), the picker is locked to that creature. User can unlock with the
    // "Change" link if they want to pick a different one.
    let pickerLocked = $state(mode === 'project' && existingProjectId != null);

    // Re-sync on (re)open — `lastOpen` is a plain (non-reactive) closure variable.
    // If it were $state, reading + writing it inside this effect would form a
    // self-feeding update loop (Svelte 5 error: effect_update_depth_exceeded).
    let lastOpen = false;
    $effect(() => {
        const isOpen = open;
        if (isOpen && !lastOpen) {
            search = '';
            if (mode === 'featured') {
                selectedIds = [...pinned];
            } else {
                selectedCreatureId = existingProjectId ?? null;
                focusStat = existingProject?.focusStat ?? null;
                targetMutations = existingProject?.targetMutations ?? 0;
                pickerLocked = existingProjectId != null;
            }
        }
        lastOpen = isOpen;
    });

    // ────────────────────────── Helpers ──────────────────────────
    function rowClass(c: CreatureRow): string {
        const sp = (c.data.species || '').toLowerCase();
        if (/wyvern|argent|ptera|quetzal|griffin|tropeo|tapejara/.test(sp)) return 'flyer';
        if (/megalo|mosa|tuso|baryo|sarco|basilo|ichthyo|manta/.test(sp)) return 'water';
        if (/rex|yuty|giga|theri|allo|spino|carno|raptor|deinon|carcha/.test(sp)) return 'combat';
        if (/anky|doed|beaver|mammoth|thorny|moscho|gacha/.test(sp)) return 'resource';
        if (/equus|paracer|para|stego|trike/.test(sp)) return 'mount';
        return 'utility';
    }
    function sexGlyph(g: string | undefined): string {
        if (!g) return '';
        const lower = g.toLowerCase();
        if (lower.startsWith('m')) return '♂';
        if (lower.startsWith('f')) return '♀';
        return '';
    }
    function mutTotal(c: CreatureRow): number {
        const m = c.data.mutations || {};
        return Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
    }
    function mutsForStat(c: CreatureRow | null | undefined, stat: StatKey): number {
        if (!c) return 0;
        const m = c.data.mutations || {};
        // The schema may key by lowercase or by full name. Try a few common shapes.
        const candidates = [stat, stat.toLowerCase(), STAT_FULL_KEY[stat], STAT_FULL_KEY[stat].toLowerCase()];
        for (const k of candidates) {
            const v = (m as Record<string, unknown>)[k];
            if (typeof v === 'number') return v;
        }
        return 0;
    }
    const STAT_FULL_KEY: Record<StatKey, string> = {
        HP: 'health',
        STA: 'stamina',
        OXY: 'oxygen',
        FOOD: 'food',
        WGT: 'weight',
        MEL: 'melee',
        CRA: 'crafting',
        SPD: 'speed'
    };

    const filtered = $derived(
        normCreatures.filter((c) => {
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            return (
                (c.data.name || '').toLowerCase().includes(q) ||
                (c.data.species || '').toLowerCase().includes(q)
            );
        })
    );

    const selectedCreature = $derived(
        mode === 'project' && selectedCreatureId != null
            ? normCreatures.find((c) => c.id === selectedCreatureId) ?? null
            : null
    );

    // ────────────────────────── Actions ──────────────────────────
    function toggleFeatured(id: number) {
        if (mode !== 'featured') return;
        if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter((x) => x !== id);
        } else if (selectedIds.length < maxFeatured) {
            selectedIds = [...selectedIds, id];
        }
    }
    function pickProjectCreature(id: number) {
        if (mode !== 'project') return;
        selectedCreatureId = id;
    }
    function pickStat(s: StatKey) {
        focusStat = s;
        // Pre-fill counter from creature's mutations for that stat
        const c = selectedCreature;
        if (c) targetMutations = mutsForStat(c, s);
    }
    function bumpCounter(delta: number) {
        targetMutations = Math.max(0, Math.min(99, targetMutations + delta));
    }

    function close() {
        if (saving) return;
        closing = true;
        setTimeout(() => {
            open = false;
            closing = false;
        }, 300);
    }
    function onBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) close();
    }

    async function save() {
        if (saving) return;
        saving = true;
        try {
            if (mode === 'featured') {
                await onSave({ creatureIds: selectedIds });
            } else {
                if (selectedCreatureId == null) return;
                await onSave({
                    creatureId: selectedCreatureId,
                    focusStat: focusStat,
                    targetMutations
                });
            }
            close();
        } finally {
            saving = false;
        }
    }

    const canSave = $derived(
        mode === 'featured'
            ? selectedIds.length > 0
            : (selectedCreatureId != null && focusStat != null)
    );

    // ────────────────────────── Hex canvas backdrop ──────────────────────────
    let canvasEl: HTMLCanvasElement | null = $state(null);
    onMount(() => {
        if (!canvasEl) return;
        const canvas = canvasEl;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const R = 32, W = R * Math.sqrt(3), H = R * 2;
        let phase = 0;
        let raf = 0;
        let alive = true;
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
            if (!alive) return;
            ctx!.clearRect(0, 0, canvas.width, canvas.height);
            const cw = canvas.width, ch = canvas.height;
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
            raf = requestAnimationFrame(draw);
        }
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize(); draw();
        return () => {
            alive = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    });
</script>

{#if open}
    <canvas bind:this={canvasEl} id="tekHexCanvas"></canvas>

    <div
        class="pm-overlay modal-overlay"
        class:closing
        onclick={onBackdropClick}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        <div class="modal-panel-wrap">
            <div class="pm-card modal-panel">
                <div class="modal-scanner"></div>
                <div class="bracket tl"></div>
                <div class="bracket tr"></div>
                <div class="bracket bl"></div>
                <div class="bracket br"></div>

                <!-- ── Header ────────────────────────────────────────── -->
                <div class="pm-head modal-header">
                    <div>
                        <div class="modal-header-title">
                            {mode === 'featured' ? 'Pin Featured Specimens' : 'Pin Breeding Project'}
                        </div>
                        <div class="modal-header-sub">
                            <span class="prefix">›</span>
                            {#if mode === 'featured'}
                                SHOWCASE UP TO {maxFeatured} ON DOSSIER
                            {:else}
                                TRACK A NEW BLOODLINE
                            {/if}
                        </div>
                    </div>
                    <button class="modal-close" aria-label="Close" onclick={close}>✕</button>
                </div>

                <!-- ── Body ──────────────────────────────────────────── -->
                <div class="modal-body">

                    <!-- Step 1: Specimen — locked single-creature view if pre-selected,
                         otherwise the search/pick list. -->
                    <div class="pm-step modal-section">
                        <div class="modal-section-label">
                            <span class="num">1</span>Specimen
                            {#if mode === 'featured'}
                                <span class="opt">{selectedIds.length} / {maxFeatured}</span>
                            {:else if pickerLocked && selectedCreature}
                                <button type="button" class="opt-link" onclick={() => pickerLocked = false}>Change</button>
                            {:else}
                                <span class="opt">SELECT ONE</span>
                            {/if}
                        </div>

                        {#if mode === 'project' && pickerLocked && selectedCreature}
                            <!-- Locked: show only the selected creature, no picker -->
                            <div class="specimen-row {rowClass(selectedCreature)} selected locked">
                                <HexAvatar name={selectedCreature.data.name || selectedCreature.data.species} size={36} showPip={false} />
                                <div class="spec-info">
                                    <div class="spec-name">
                                        {(selectedCreature.data.species || '').toUpperCase()} — "{selectedCreature.data.name || 'Unnamed'}"
                                    </div>
                                    <div class="spec-meta">
                                        {sexGlyph(selectedCreature.data.gender)} · Lvl {selectedCreature.data.level ?? '—'} · {mutTotal(selectedCreature)} muts
                                    </div>
                                </div>
                                <svg class="spec-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        {:else}
                            <div class="specimen-search">
                                <svg class="specimen-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="M21 21l-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    class="specimen-search-input"
                                    placeholder="Search your vault…"
                                    bind:value={search}
                                />
                            </div>
                            <div class="specimen-picker">
                                {#each filtered as c (c.id)}
                                    {@const isSel = mode === 'featured'
                                        ? selectedIds.includes(c.id)
                                        : selectedCreatureId === c.id}
                                    {@const atMax = mode === 'featured'
                                        && !isSel
                                        && selectedIds.length >= maxFeatured}
                                    <div
                                        class="specimen-row {rowClass(c)}"
                                        class:selected={isSel}
                                        class:disabled={atMax}
                                        role="button"
                                        tabindex="0"
                                        onclick={() => mode === 'featured' ? toggleFeatured(c.id) : pickProjectCreature(c.id)}
                                        onkeydown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (mode === 'featured') toggleFeatured(c.id);
                                                else pickProjectCreature(c.id);
                                            }
                                        }}
                                    >
                                        <HexAvatar name={c.data.name || c.data.species} size={36} showPip={false} />
                                        <div class="spec-info">
                                            <div class="spec-name">
                                                {(c.data.species || '').toUpperCase()} — "{c.data.name || 'Unnamed'}"
                                            </div>
                                            <div class="spec-meta">
                                                {sexGlyph(c.data.gender)} · Lvl {c.data.level ?? '—'} · {mutTotal(c)} muts
                                            </div>
                                        </div>
                                        <svg class="spec-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                {/each}
                                {#if filtered.length === 0}
                                    <div class="spec-empty">No specimens match your search.</div>
                                {/if}
                            </div>
                        {/if}
                    </div>

                    {#if mode === 'project'}
                        <!-- Step 2: Focus Stat picker -->
                        <div class="pm-step modal-section">
                            <div class="modal-section-label">
                                <span class="num">2</span>Focus Stat
                                <span class="opt" class:opt-required={selectedCreatureId != null && focusStat == null}>
                                    {selectedCreatureId != null && focusStat == null ? 'REQUIRED' : 'PICK ONE'}
                                </span>
                            </div>
                            <div class="stat-pick stat-picker">
                                {#each STATS as s}
                                    {@const m = mutsForStat(selectedCreature, s)}
                                    <button
                                        type="button"
                                        class="stat-pick-cell stat-btn"
                                        class:selected={focusStat === s}
                                        onclick={() => pickStat(s)}
                                    >
                                        <div class="stat-btn-label">{s}</div>
                                        <div class="stat-btn-muts" class:has={m > 0}>
                                            {m > 0 ? `${m} muts` : '—'}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Step 3: Target mutations counter -->
                        <div class="pm-step modal-section">
                            <div class="modal-section-label">
                                <span class="num">3</span>Target Mutations
                            </div>
                            <div class="mut-counter counter">
                                <button class="counter-btn minus" aria-label="Decrement" onclick={() => bumpCounter(-1)}>−</button>
                                <div class="counter-num">{targetMutations}</div>
                                <button class="counter-btn plus" aria-label="Increment" onclick={() => bumpCounter(1)}>+</button>
                            </div>
                            <div class="counter-hint">
                                {#if selectedCreature && focusStat}
                                    Pre-filled from "{selectedCreature.data.name || 'Unnamed'}" · {focusStat} — adjust if needed
                                {:else if selectedCreature}
                                    Pick a focus stat to pre-fill from "{selectedCreature.data.name || 'Unnamed'}"
                                {:else}
                                    Max 99 · default 0
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>

                <!-- ── Footer ────────────────────────────────────────── -->
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick={close} disabled={saving}>Cancel</button>
                    <button class="btn btn-primary" onclick={save} disabled={saving || !canSave}>
                        <span class="glyph">⬢</span>
                        {#if saving}
                            Saving…
                        {:else if mode === 'featured'}
                            Pin Selection
                        {:else}
                            Pin Project
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
:global(:root) {
    --tek-bg:           #050812;
    --tek-blue:         #00b4ff;
    --tek-blue-dim:     rgba(0, 180, 255, 0.12);
    --tek-blue-border:  rgba(0, 180, 255, 0.30);
    --tek-blue-glow:    rgba(0, 180, 255, 0.50);
    --tek-purple:       #8b5cf6;
    --tek-amber:        #f59e0b;
    --tek-green:        #10b981;
    --tek-red:          #ef4444;
    --tek-pink:         #f472b6;
    --tek-text:         #e2e8f0;
    --tek-text-dim:     #64748b;
    --tek-text-faint:   #334155;
    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

#tekHexCanvas { position: fixed; inset: 0; z-index: 99; pointer-events: none; }

/* ═════════════════════════════════════════════════════════════════════════
   MODAL OVERLAY + PANEL
   ═════════════════════════════════════════════════════════════════════════ */
.modal-overlay,
.pm-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    animation: overlay-in 0.32s ease-out;
}
.modal-overlay.closing { animation: overlay-out 0.30s ease-in forwards; }

@keyframes overlay-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes overlay-out {
    from { opacity: 1; }
    to   { opacity: 0; }
}

.modal-panel-wrap {
    position: relative;
    width: 100%;
    max-width: 560px;
    max-height: calc(100vh - 64px);
    filter:
        drop-shadow(0 0 1px rgba(0,180,255,0.40))
        drop-shadow(0 0 60px rgba(0,180,255,0.10))
        drop-shadow(0 30px 80px rgba(0,0,0,0.72));
    animation: panel-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.modal-overlay.closing .modal-panel-wrap {
    animation: panel-out 0.30s ease-in forwards;
}

@keyframes panel-in {
    from { opacity: 0; transform: translateY(24px) scale(0.94); filter: drop-shadow(0 30px 80px rgba(0,0,0,0.5)) blur(3px); }
    to   { opacity: 1; transform: none; }
}
@keyframes panel-out {
    from { opacity: 1; transform: none; }
    to   { opacity: 0; transform: translateY(14px) scale(0.97); }
}

.modal-panel,
.pm-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.97) 0%, rgba(4,8,20,0.99) 100%);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    clip-path: polygon(16px 0%, 100% 0%, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0% 100%, 0% 16px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
}
.modal-panel::before {
    content: '';
    position: absolute;
    left: 0; top: 16px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
    z-index: 2;
}
.modal-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(180deg, transparent 0 3px, rgba(0,180,255,0.018) 3px 4px);
    pointer-events: none;
    z-index: 1;
}

/* Scanner sweep on open */
.modal-scanner {
    position: absolute;
    left: 0; right: 0;
    height: 80px;
    top: -80px;
    background: linear-gradient(180deg, transparent 0%, rgba(0,180,255,0.22) 50%, transparent 100%);
    pointer-events: none;
    z-index: 3;
    animation: modal-scan 1.4s 0.3s cubic-bezier(0.4, 0, 0.6, 1) forwards;
}
@keyframes modal-scan {
    0%   { top: -80px; opacity: 0; }
    20%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
}

/* Corner brackets */
.modal-panel .bracket {
    position: absolute;
    width: 18px; height: 18px;
    border: 1.3px solid rgba(0,180,255,0.55);
    filter: drop-shadow(0 0 4px var(--tek-blue-glow));
    z-index: 4;
}
.modal-panel .bracket.tl { top: 9px; left: 9px; border-right: none; border-bottom: none; }
.modal-panel .bracket.tr { top: 9px; right: 9px; border-left: none; border-bottom: none; }
.modal-panel .bracket.bl { bottom: 9px; left: 9px; border-right: none; border-top: none; }
.modal-panel .bracket.br { bottom: 9px; right: 9px; border-left: none; border-top: none; }

/* ── Header ───────────────────────────────────────────────────────────── */
.modal-header,
.pm-head {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 28px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
}
.modal-header-title {
    font-family: var(--tek-display);
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    background: linear-gradient(135deg, #00d4ff 0%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
    line-height: 1.1;
    margin-bottom: 3px;
}
.modal-header-sub {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}
.modal-header-sub .prefix { color: var(--tek-blue); margin-right: 4px; opacity: 0.6; }
.modal-close {
    width: 28px; height: 28px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    color: var(--tek-text-dim);
    font-family: inherit;
    font-size: 1.1rem;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: all 0.18s;
}
.modal-close:hover {
    background: rgba(239,68,68,0.10);
    border-color: rgba(239,68,68,0.35);
    color: #fca5a5;
}

/* ── Body — scrollable ─────────────────────────────────────────────────── */
.modal-body {
    position: relative;
    z-index: 5;
    flex: 1;
    overflow-y: auto;
    padding: 8px 0 4px;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,180,255,0.30) transparent;
}
.modal-body::-webkit-scrollbar { width: 4px; }
.modal-body::-webkit-scrollbar-thumb { background: rgba(0,180,255,0.25); border-radius: 2px; }

.modal-section,
.pm-step {
    padding: 14px 28px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
}
.modal-section:last-child,
.pm-step:last-child { border-bottom: none; }

.modal-section-label {
    display: flex;
    align-items: center;
    gap: 9px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--tek-text-dim);
    margin-bottom: 11px;
}
.modal-section-label .num {
    width: 18px; height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,180,255,0.14);
    border: 1px solid rgba(0,180,255,0.45);
    color: var(--tek-blue);
    font-family: var(--tek-display);
    font-size: 0.62rem;
    font-weight: 800;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.modal-section-label .opt {
    margin-left: auto;
    font-size: 0.55rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.18em;
}
.modal-section-label .opt.opt-required {
    color: var(--tek-amber);
    text-shadow: 0 0 6px rgba(245, 158, 11, 0.5);
}
.modal-section-label .opt-link {
    margin-left: auto;
    background: none;
    border: none;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: var(--tek-blue);
    text-transform: uppercase;
    cursor: pointer;
    padding: 2px 6px;
    transition: text-shadow 0.18s;
}
.modal-section-label .opt-link:hover { text-shadow: 0 0 6px var(--tek-blue-glow); }
.specimen-row.locked { cursor: default; }
.specimen-row.locked:hover { background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%); }

/* ── Specimen picker ──────────────────────────────────────────────────── */
.specimen-search {
    position: relative;
    margin-bottom: 8px;
}
.specimen-search-input {
    width: 100%;
    background: rgba(4,8,20,0.85);
    border: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(0,180,255,0.18);
    color: var(--tek-text);
    padding: 9px 12px 9px 34px;
    font-family: inherit;
    font-size: 0.8rem;
    outline: none;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: border-color 0.2s;
}
.specimen-search-input::placeholder { color: var(--tek-text-faint); }
.specimen-search-input:focus {
    border-color: rgba(0,180,255,0.40);
    border-bottom-color: var(--tek-blue);
}
.specimen-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--tek-text-faint);
    pointer-events: none;
}

.specimen-picker { display: flex; flex-direction: column; gap: 5px; max-height: 280px; overflow-y: auto; }
.specimen-row {
    --cat-rgb: 0,180,255;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
    padding: 10px 14px 10px 12px;
    background: linear-gradient(160deg, rgba(10,18,44,0.50) 0%, rgba(4,8,20,0.80) 100%);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    cursor: pointer;
    transition: background 0.18s, box-shadow 0.18s;
    border-left: 2px solid transparent;
}
.specimen-row:hover {
    background: linear-gradient(160deg, rgba(14,22,52,0.85) 0%, rgba(6,12,28,0.95) 100%);
}
.specimen-row.selected {
    border-left-color: rgb(var(--cat-rgb));
    background:
        radial-gradient(ellipse at 0% 50%, rgba(0,180,255,0.15) 0%, transparent 70%),
        linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    box-shadow: -3px 0 12px rgba(var(--cat-rgb), 0.30);
}
.specimen-row.disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.specimen-row.combat   { --cat-rgb: 239,68,68; }
.specimen-row.flyer    { --cat-rgb: 6,182,212; }
.specimen-row.utility  { --cat-rgb: 34,197,94; }
.specimen-row.water    { --cat-rgb: 59,130,246; }
.specimen-row.mount    { --cat-rgb: 249,115,22; }
.specimen-row.resource { --cat-rgb: 167,139,250; }

.spec-info { line-height: 1.3; min-width: 0; }
.spec-name {
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--tek-text);
    letter-spacing: 0.02em;
}
.spec-meta {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-text-dim);
    font-style: italic;
    margin-top: 1px;
}
.spec-check {
    width: 18px; height: 18px;
    color: var(--tek-blue);
    opacity: 0;
    filter: drop-shadow(0 0 4px var(--tek-blue-glow));
    transition: opacity 0.18s;
}
.specimen-row.selected .spec-check { opacity: 1; }

.spec-empty {
    padding: 24px 8px;
    text-align: center;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
}

/* ── Stat picker — 8 buttons, 4×2 grid ────────────────────────────────── */
.stat-picker,
.stat-pick {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
}
.stat-btn,
.stat-pick-cell {
    background: rgba(0,180,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
    padding: 9px 8px;
    text-align: center;
    cursor: pointer;
    transition: all 0.18s;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    font-family: inherit;
}
.stat-btn:hover {
    background: rgba(0,180,255,0.10);
    border-color: rgba(0,180,255,0.30);
}
.stat-btn.selected {
    background: linear-gradient(135deg, rgba(0,180,255,0.20) 0%, rgba(139,92,246,0.20) 100%);
    border-color: var(--tek-blue);
    box-shadow: 0 0 12px rgba(0,180,255,0.35);
}
.stat-btn-label {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.stat-btn.selected .stat-btn-label { color: var(--tek-text); }
.stat-btn-muts {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    color: var(--tek-text-faint);
    font-weight: 600;
}
.stat-btn-muts.has { color: var(--tek-blue); text-shadow: 0 0 4px var(--tek-blue-glow); }
.stat-btn.selected .stat-btn-muts.has { color: #c4b5fd; text-shadow: 0 0 5px rgba(196,181,253,0.5); }

/* ── Counter ──────────────────────────────────────────────────────────── */
.counter,
.mut-counter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
}
.counter-btn {
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,180,255,0.08);
    border: 1px solid rgba(0,180,255,0.30);
    color: var(--tek-blue);
    cursor: pointer;
    font-family: var(--tek-display);
    font-size: 1.1rem;
    font-weight: 800;
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    transition: all 0.18s;
    line-height: 1;
}
.counter-btn:hover {
    background: rgba(0,180,255,0.22);
    border-color: var(--tek-blue);
    filter: drop-shadow(0 0 8px var(--tek-blue-glow));
    transform: translateY(-1px);
}
.counter-btn.minus {
    background: rgba(255,255,255,0.02);
    border-color: rgba(255,255,255,0.10);
    color: var(--tek-text-faint);
}
.counter-btn.minus:hover { color: var(--tek-text-dim); border-color: rgba(255,255,255,0.20); }
.counter-num {
    font-family: var(--tek-display);
    font-size: 2.4rem;
    font-weight: 900;
    line-height: 1;
    color: var(--tek-text);
    text-shadow: 0 0 14px rgba(0,180,255,0.35);
    min-width: 84px;
    text-align: center;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), text-shadow 0.5s ease;
}
.counter-hint {
    font-family: var(--tek-mono);
    font-size: 0.6rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    text-align: center;
    margin-top: 6px;
}

/* ── Footer ───────────────────────────────────────────────────────────── */
.modal-footer {
    position: relative;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 16px 28px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(4,8,20,0.50);
    flex-shrink: 0;
}
.btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 18px;
    border: none;
    cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: filter 0.18s, transform 0.18s;
    line-height: 1;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
    background: transparent;
    color: var(--tek-text-dim);
}
.btn-ghost:hover { color: var(--tek-text); background: rgba(255,255,255,0.04); }
.btn-primary {
    background: linear-gradient(135deg, #00c6ff 0%, #0086d4 100%);
    color: #001a2e;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.45));
}
.btn-primary:hover:not(:disabled) { filter: drop-shadow(0 0 18px rgba(0,180,255,0.75)); transform: translateY(-1px); }
.btn-primary .glyph { color: #001a2e; }

@media (max-width: 540px) {
    .stat-picker,
    .stat-pick { grid-template-columns: repeat(3, 1fr); }
    .modal-section,
    .pm-step { padding: 12px 18px; }
    .modal-header,
    .pm-head { padding: 18px 18px 12px; }
    .modal-footer { padding: 14px 18px; }
}
</style>
