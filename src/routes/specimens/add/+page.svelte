<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { computeBadges } from '$lib/badges';
    import CreatureNotesFields from '$lib/components/CreatureNotesFields.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    type StatKey = 'HP' | 'STA' | 'OXY' | 'FOOD' | 'WGT' | 'MEL' | 'CRA';
    const STATS: StatKey[] = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'];

    type Mode = 'manual' | 'save' | 'screenshot';
    let mode = $state<Mode>('manual');

    // ── Form state ──────────────────────────────────────────────────────────
    let fSpecies = $state($page.url.searchParams.get('species') ?? '');
    let fName    = $state('');
    let fLevel   = $state(1);
    let fGender  = $state<'M' | 'F' | '?'>('M');
    let fServer  = $state('');
    let fNotes   = $state('');
    let fStats   = $state<Record<StatKey, number>>({ HP:0, STA:0, OXY:0, FOOD:0, WGT:0, MEL:0, CRA:0 });
    let fMuts    = $state<Record<StatKey, number>>({ HP:0, STA:0, OXY:0, FOOD:0, WGT:0, MEL:0, CRA:0 });

    let founderOn = $state(false);

    // Advanced fields — Color regions + Stat Genealogy live behind a collapsed
    // section by default. Most logs don't need them; serious breeders expand.
    let advancedOpen = $state(false);

    // Specimen availability + cosmetic fields (parity with Edit form).
    let fAvailBreed    = $state(false);
    let fAvailTrade    = $state(false);
    let fColorRegions  = $state<string[]>(['','','','','','']);

    // ── Stat genealogy: per-stat founder attribution ────────────────────────
    let founderSources = $state<Record<StatKey, number | null>>({ HP:null, STA:null, OXY:null, FOOD:null, WGT:null, MEL:null, CRA:null });

    // Stat key → the long-form key stored on a founder's baseStats JSON (matches POST shape)
    const STAT_LONG: Record<StatKey, string> = {
        HP: 'Health', STA: 'Stamina', OXY: 'Oxygen',
        FOOD: 'Food', WGT: 'Weight', MEL: 'Melee', CRA: 'Crafting'
    };

    function onFounderPick(s: StatKey, e: Event) {
        const sel = e.target as HTMLSelectElement;
        const raw = sel.value;
        const id = raw === '' || raw === 'null' ? null : Number(raw);
        founderSources[s] = id;
        if (id === null) return;
        const founder = (data?.founders ?? []).find(f => f.id === id);
        if (!founder) return;
        const long = STAT_LONG[s];
        // Try long key (Health) then short (HP) then lowercase
        const bs = founder.baseStats ?? {};
        const v = (bs as Record<string, number>)[long]
            ?? (bs as Record<string, number>)[s]
            ?? (bs as Record<string, number>)[long.toLowerCase()];
        if (typeof v === 'number') fStats[s] = v;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  SCREENSHOT OCR — Tek Binoculars / u+Binoculars only
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Single source UI supported (Tek Binoculars and u+Binoculars are the
    // SAME format — the mod just re-skins the panel):
    //
    //   Row format: "current / max  (base | mut | dom)"  ← parens + pipes
    //   Top-to-bottom: HP, STA, OXY, FOOD, WGT, [TORPOR], SPD%, MEL%, CRA%
    //
    // Cryopods (vanilla or modded) are NOT a usable source — they don't
    // surface base wild levels — the dropzone copy says so explicitly.
    //
    // Super Spyglass was dropped — its layout was a constant source of
    // mis-detection and the parsers complicated everything. Users wanting
    // OCR of a Spyglass screenshot can hit pause, open u+Binoculars, and
    // shoot a fresh screenshot.

    type ShotSource = 'tek';
    type CropBox = { x: number; y: number; w: number; h: number };
    type DragMode =
        | 'idle' | 'move'
        | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
        | 'resize-t'  | 'resize-b'  | 'resize-l'  | 'resize-r';

    let shotFile     = $state<File | null>(null);
    let shotImage    = $state<HTMLImageElement | null>(null);
    let shotImageUrl = $state<string | null>(null);
    let shotProcUrl  = $state<string | null>(null);
    let shotRunning  = $state(false);
    let shotProgress = $state(0);
    let shotPhase    = $state<'idle' | 'preprocessing' | 'recognizing'>('idle');
    let shotRawText  = $state('');
    let shotParsed   = $state<Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number }>({});
    let shotParsedMuts = $state<Partial<Record<StatKey, number>>>({});
    let shotError    = $state('');
    let shotSource   = $state<ShotSource | null>(null);
    let shotAutoDetected = $state(false);

    // Cropper — DOM-based overlay on top of an <img> element.
    // cropBox coords are in IMAGE pixel space; the overlay positions itself
    // proportionally based on `imgZoom` (1.0 = source pixel size).
    let cropBox          = $state<CropBox | null>(null);
    let imgZoom          = $state(1.0);
    let stageContainerEl = $state<HTMLDivElement | null>(null);
    let stageEl          = $state<HTMLDivElement | null>(null);
    let stageContainerW  = $state(800);
    // Streamlined flow: cropper hidden by default; only shown when the user
    // explicitly asks to adjust (auto-detect was wrong) or auto-detect failed.
    let cropperVisible   = $state(false);
    // Two-pointer pinch zoom on the stage (touch only).
    const stagePointers  = new Map<number, { x: number; y: number }>();
    let pinchPrevDist    = 0;

    function pickScreenshot(e: Event) {
        const inp = e.target as HTMLInputElement;
        const f = inp.files?.[0];
        if (!f) return;
        void loadShotFile(f);
    }

    async function loadShotFile(f: File) {
        shotFile = f;
        shotError = '';
        shotRawText = '';
        shotParsed = {};
        shotSource = null;
        shotAutoDetected = false;
        if (shotProcUrl)   { URL.revokeObjectURL(shotProcUrl);   shotProcUrl = null; }
        if (shotImageUrl)  { URL.revokeObjectURL(shotImageUrl);  shotImageUrl = null; }

        // Persistent URL — survives for the lifetime of the <img> element.
        // Revoked on next file load / replace.
        const url = URL.createObjectURL(f);
        const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image();
            i.onload  = () => res(i);
            i.onerror = () => rej(new Error('Failed to load image'));
            i.src = url;
        });
        shotImageUrl = url;
        shotImage = img;

        const detected = autoDetectPanel(img);
        let autoRun = false;
        if (detected) {
            cropBox = detected.box;
            shotAutoDetected = true;
            // High confidence → trust the auto-crop and run OCR immediately.
            // The cropper UI stays hidden; user only sees the review pane.
            // Threshold 0.18 is calibrated from testing — anything below it
            // tended to misfire on game-world clutter.
            if (detected.confidence >= 0.18) {
                cropperVisible = false;
                autoRun = true;
            } else {
                // Low-confidence detection: cropper opens so the user can
                // tighten it before running OCR.
                cropperVisible = true;
            }
        } else {
            // No panel found at all — use full image, show cropper for manual.
            cropBox = { x: 0, y: 0, w: img.width, h: img.height };
            shotAutoDetected = false;
            cropperVisible = true;
        }

        // Wait for the DOM to render the cropper-scroll container so we can
        // read its real dimensions before computing fit-zoom.
        await tick();
        imgZoom = computeFitZoom(img.width, img.height);

        // Streamlined flow: if auto-detect was confident, run OCR immediately
        // so the user just sees results — no manual crop step required.
        if (autoRun) {
            void runOcr();
        }
    }

    // Manual override — exposed via "Adjust crop" button in the review pane.
    function showCropperManual() {
        cropperVisible = true;
    }

    function computeFitZoom(imgW: number, imgH: number): number {
        const containerW = stageContainerEl?.clientWidth  || stageContainerW;
        const containerH = stageContainerEl?.clientHeight || 600;
        if (!containerW || !imgW || !imgH) return 1;
        // Fit to BOTH dimensions so a landscape screenshot uses the available
        // vertical space too — picks the smaller scale that keeps the whole
        // image visible. User can zoom in afterward.
        const padded = 0.96; // tiny breathing room so handles aren't clipped
        return Math.min(containerW / imgW, containerH / imgH) * padded;
    }

    // Keep stageContainerW in sync with the actual DOM dimension so subsequent
    // fit-zoom calls (e.g., after a window resize) use the real value.
    $effect(() => {
        if (!stageContainerEl) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                stageContainerW = entry.contentRect.width;
            }
        });
        ro.observe(stageContainerEl);
        return () => ro.disconnect();
    });

    /**
     * Auto-locate the stat panel via STRUCTURAL features — no color.
     *
     * The Tek/u+ Binoculars panel has a very dense pattern of horizontal
     * edges: header line, current/max bar, "Ready to Mate" strip, 7-9 stat
     * rows, mutation line, etc. The
     * game world around them (wyverns, sky, terrain) has organic textures
     * with far less per-column horizontal-edge density. We exploit that.
     *
     * Algorithm:
     *   1. Downscale to 256-wide and convert to luminance.
     *   2. Compute |L[y+1] − L[y-1]| per pixel (a horizontal-edge magnitude).
     *   3. Sum the edge map per column → 1D density profile across X.
     *   4. Box-smooth to suppress single-column noise.
     *   5. Threshold based on (mean + k·std). Columns above threshold belong
     *      to a "panel candidate".
     *   6. Pick the longest contiguous run anchored to the LEFT 35% or the
     *      RIGHT 35% of the image (the panel is always at an edge, per user).
     *   7. Within that column range, repeat for rows → vertical extent.
     *   8. Sanity-check aspect ratio: panels are taller than wide (>= 1:1).
     *
     * Returns null if no plausible panel can be located. Includes a
     * confidence score [0, 1] so the caller can decide whether to auto-run
     * OCR or show the manual cropper as an escape hatch.
     */
    function autoDetectPanel(img: HTMLImageElement): { box: CropBox; confidence: number } | null {
        const W = 256;
        const H = Math.max(1, Math.round((img.height / img.width) * W));
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        // Luminance per pixel
        const lum = new Float32Array(W * H);
        for (let i = 0; i < W * H; i++) {
            lum[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
        }

        // Horizontal-edge magnitude: vertical gradient, picks up text row tops
        // and bottoms, icon edges, divider lines.
        const edges = new Float32Array(W * H);
        for (let y = 1; y < H - 1; y++) {
            const rowU = (y - 1) * W;
            const rowD = (y + 1) * W;
            for (let x = 0; x < W; x++) {
                edges[y * W + x] = Math.abs(lum[rowD + x] - lum[rowU + x]);
            }
        }

        // Per-column edge sum → 1D density profile
        const colE = new Float32Array(W);
        for (let x = 0; x < W; x++) {
            let s = 0;
            for (let y = 0; y < H; y++) s += edges[y * W + x];
            colE[x] = s;
        }

        // Box-smooth ±5 columns to suppress single-column noise
        const colS = new Float32Array(W);
        const win = 5;
        for (let x = 0; x < W; x++) {
            let s = 0, n = 0;
            for (let dx = -win; dx <= win; dx++) {
                const xx = x + dx;
                if (xx >= 0 && xx < W) { s += colE[xx]; n++; }
            }
            colS[x] = s / n;
        }

        // Statistics for adaptive threshold
        let mean = 0;
        for (let x = 0; x < W; x++) mean += colS[x];
        mean /= W;
        let varSum = 0;
        for (let x = 0; x < W; x++) varSum += (colS[x] - mean) ** 2;
        const std = Math.sqrt(varSum / W);
        // Threshold ~0.5σ above mean catches dense-edge columns without
        // requiring extreme contrast (handles tight crops where most columns
        // are high-density)
        const threshold = mean + 0.5 * std;

        // Find contiguous runs above threshold, with their average density
        type Run = { start: number; end: number; mean: number };
        const runs: Run[] = [];
        let rs = -1;
        for (let x = 0; x <= W; x++) {
            const inRun = x < W && colS[x] > threshold;
            if (inRun && rs < 0) rs = x;
            else if (!inRun && rs >= 0) {
                const end = x - 1;
                const wRun = end - rs + 1;
                if (wRun >= Math.max(8, W * 0.04)) {
                    let sum = 0;
                    for (let xx = rs; xx <= end; xx++) sum += colS[xx];
                    runs.push({ start: rs, end, mean: sum / wRun });
                }
                rs = -1;
            }
        }
        if (runs.length === 0) return null;

        // Score = density × edge-anchored bonus. Panels live on the FAR
        // LEFT or FAR RIGHT of full screenshots — bias hard toward those.
        // (For a tight crop where the entire image is the panel, this still
        // picks the one big run that spans the whole width.)
        function score(r: Run): number {
            const leftAnchored  = r.start < W * 0.05;
            const rightAnchored = r.end   > W * 0.95;
            const spansMost     = (r.end - r.start) > W * 0.7;
            let bonus = 1;
            if (leftAnchored || rightAnchored) bonus = 1.6;
            if (spansMost) bonus = 1.4; // tight-crop case
            return r.mean * bonus;
        }
        const best = runs.reduce((a, b) => score(a) >= score(b) ? a : b);

        // Vertical extent: row-edge density within the chosen column range
        const xs = best.start, xe = best.end;
        const rowE = new Float32Array(H);
        for (let y = 0; y < H; y++) {
            let s = 0;
            for (let x = xs; x <= xe; x++) s += edges[y * W + x];
            rowE[y] = s;
        }
        const rowS = new Float32Array(H);
        for (let y = 0; y < H; y++) {
            let s = 0, n = 0;
            for (let dy = -win; dy <= win; dy++) {
                const yy = y + dy;
                if (yy >= 0 && yy < H) { s += rowE[yy]; n++; }
            }
            rowS[y] = s / n;
        }
        let rMean = 0;
        for (let y = 0; y < H; y++) rMean += rowS[y];
        rMean /= H;
        const rThresh = rMean * 0.45;
        let yStart = 0, yEnd = H - 1;
        for (let y = 0; y < H; y++) {
            if (rowS[y] > rThresh) { yStart = y; break; }
        }
        for (let y = H - 1; y >= 0; y--) {
            if (rowS[y] > rThresh) { yEnd = y; break; }
        }

        const panelW = xe - xs + 1;
        const panelH = yEnd - yStart + 1;
        if (panelH < H * 0.15 || panelW < W * 0.04) return null; // too small

        // Sanity: stat panels are taller than wide. Reject anything strongly
        // landscape — that's not a panel, that's the whole game frame.
        const aspect = panelH / panelW;
        if (aspect < 0.9) return null;

        // Confidence — higher mean relative to overall mean = clearer panel
        const confidenceRaw = (best.mean - mean) / (std + 1);
        const confidence = Math.max(0, Math.min(1, confidenceRaw * 0.4));

        // Pad slightly and convert back to source-image coordinates
        const padX = Math.round(W * 0.015);
        const padY = Math.round(H * 0.015);
        const x0 = Math.max(0, xs - padX);
        const y0 = Math.max(0, yStart - padY);
        const x1 = Math.min(W - 1, xe + padX);
        const y1 = Math.min(H - 1, yEnd + padY);
        const sx = img.width / W;
        const sy = img.height / H;
        return {
            box: {
                x: Math.round(x0 * sx),
                y: Math.round(y0 * sy),
                w: Math.round((x1 - x0 + 1) * sx),
                h: Math.round((y1 - y0 + 1) * sy)
            },
            confidence
        };
    }

    // ── Cropper helpers ─────────────────────────────────────────────────
    function clampBox(b: CropBox): CropBox {
        if (!shotImage) return b;
        const MIN = 16;
        let { x, y, w, h } = b;
        w = Math.max(MIN, Math.min(shotImage.width,  w));
        h = Math.max(MIN, Math.min(shotImage.height, h));
        x = Math.max(0, Math.min(shotImage.width  - w, x));
        y = Math.max(0, Math.min(shotImage.height - h, y));
        return { x, y, w, h };
    }

    // ── Drag: per-handle pointerdown starts a typed drag, captures the
    //         pointer to the handle element, listens for move/up on the same
    //         element. Each handle is its own DOM node with its own CSS
    //         cursor — no hit testing, no fragile zone math, the browser
    //         handles which element the pointer is over. ─────────────────
    function startCropDrag(e: PointerEvent, mode: DragMode) {
        if (!cropBox || !shotImage) return;
        // Stop the parent crop-box's 'move' pointerdown from also firing when
        // the user grabs an edge/corner. Without this, every edge drag would
        // also enter move mode and the two would race.
        // NOTE: we intentionally do NOT preventDefault — on some pointer
        // implementations preventDefault on pointerdown can prevent subsequent
        // pointermove events from arriving with the expected timestamps.
        e.stopPropagation();

        const target = e.currentTarget as HTMLElement;
        try { target.setPointerCapture(e.pointerId); } catch { /* ignore */ }

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const startBox = { ...cropBox };

        function onMove(ev: PointerEvent) {
            if (ev.pointerId !== e.pointerId || !cropBox || !shotImage) return;
            // Translate client-pixel delta into IMAGE-pixel delta via the
            // current zoom factor. `imgZoom` is the multiplier from source
            // pixel → CSS pixel.
            const dx = (ev.clientX - startClientX) / imgZoom;
            const dy = (ev.clientY - startClientY) / imgZoom;
            const s = startBox;
            let { x, y, w, h } = s;

            if (mode === 'move') {
                x = s.x + dx; y = s.y + dy;
            } else {
                if (mode.includes('l')) { x = s.x + dx; w = s.w - dx; }
                if (mode.includes('r')) { w = s.w + dx; }
                if (mode.includes('t')) { y = s.y + dy; h = s.h - dy; }
                if (mode.includes('b')) { h = s.h + dy; }
                // Clamp if we'd flip the box past its opposing edge.
                if (w < 16) { if (mode.includes('l')) x = s.x + s.w - 16; w = 16; }
                if (h < 16) { if (mode.includes('t')) y = s.y + s.h - 16; h = 16; }
            }
            cropBox = clampBox({ x, y, w, h });
        }
        function onUp(ev: PointerEvent) {
            if (ev.pointerId !== e.pointerId) return;
            target.removeEventListener('pointermove',   onMove);
            target.removeEventListener('pointerup',     onUp);
            target.removeEventListener('pointercancel', onUp);
            try { target.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
        }
        target.addEventListener('pointermove',   onMove);
        target.addEventListener('pointerup',     onUp);
        target.addEventListener('pointercancel', onUp);
    }

    // ── Zoom controls ──────────────────────────────────────────────────
    function zoomIn()    { imgZoom = Math.min(8,    imgZoom * 1.25); }
    function zoomOut()   { imgZoom = Math.max(0.05, imgZoom / 1.25); }
    function zoomActual(){ imgZoom = 1.0; }
    function zoomFit() {
        if (!shotImage || !stageContainerEl) return;
        imgZoom = computeFitZoom(shotImage.width, shotImage.height);
    }

    // Ctrl-wheel on the stage zooms around the cursor.
    function onStageWheel(e: WheelEvent) {
        if (!e.ctrlKey || !shotImage || !stageContainerEl) return;
        e.preventDefault();
        const factor = e.deltaY > 0 ? (1 / 1.15) : 1.15;
        const next = Math.max(0.05, Math.min(8, imgZoom * factor));
        // Keep the point under the cursor stable: shift scroll position so
        // the image coordinate the cursor was hovering stays under it.
        const containerRect = stageContainerEl.getBoundingClientRect();
        const cursorX = e.clientX - containerRect.left + stageContainerEl.scrollLeft;
        const cursorY = e.clientY - containerRect.top  + stageContainerEl.scrollTop;
        const ratio = next / imgZoom;
        imgZoom = next;
        // After Svelte re-renders the stage to its new size, adjust scroll.
        requestAnimationFrame(() => {
            if (!stageContainerEl) return;
            stageContainerEl.scrollLeft = cursorX * ratio - (e.clientX - containerRect.left);
            stageContainerEl.scrollTop  = cursorY * ratio - (e.clientY - containerRect.top);
        });
    }

    // ── Pinch zoom on touch: two pointers on the stage container.
    //    Tracked separately from the crop-drag pointers so they don't fight.
    function onStagePointerDown(e: PointerEvent) {
        if (e.pointerType !== 'touch') return;
        stagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (stagePointers.size === 2) {
            const pts = [...stagePointers.values()];
            pinchPrevDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        }
    }
    function onStagePointerMove(e: PointerEvent) {
        if (e.pointerType !== 'touch' || !stagePointers.has(e.pointerId)) return;
        stagePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (stagePointers.size === 2 && pinchPrevDist > 0) {
            const pts = [...stagePointers.values()];
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const factor = dist / pinchPrevDist;
            imgZoom = Math.max(0.05, Math.min(8, imgZoom * factor));
            pinchPrevDist = dist;
        }
    }
    function onStagePointerUp(e: PointerEvent) {
        stagePointers.delete(e.pointerId);
        if (stagePointers.size < 2) pinchPrevDist = 0;
    }

    function resetCrop() {
        if (!shotImage) return;
        cropBox = { x: 0, y: 0, w: shotImage.width, h: shotImage.height };
        shotAutoDetected = false;
    }

    function reAutoDetect() {
        if (!shotImage) return;
        const d = autoDetectPanel(shotImage);
        if (d) {
            cropBox = d.box;
            shotAutoDetected = true;
        }
    }

    /** Otsu's method — pick a luminance threshold that maximises between-class variance. */
    function otsuThreshold(data: Uint8ClampedArray): number {
        const hist = new Array<number>(256).fill(0);
        const px = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
            const lum = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
            hist[lum]++;
        }
        let sum = 0;
        for (let t = 0; t < 256; t++) sum += t * hist[t];
        let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
        for (let t = 0; t < 256; t++) {
            wB += hist[t];
            if (wB === 0) continue;
            const wF = px - wB;
            if (wF === 0) break;
            sumB += t * hist[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const variance = wB * wF * (mB - mF) * (mB - mF);
            if (variance > maxVar) { maxVar = variance; threshold = t; }
        }
        return threshold;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ROW-ANCHORED OCR PIPELINE
    //
    // Why this design exists: trying to OCR the entire panel as one image
    // and then parse the text salad with regexes turned out to be hopeless
    // on ARK's stylized UI font. Separators (|, /, [, ], parens) get
    // mangled and the text-soup regex can't lock onto triples.
    //
    // The key insight from the user: regardless of font or background,
    //   "the + sign is still HP, and the numbers next to it are HP's."
    //
    // So we anchor on the panel's STRUCTURE — its rows. Each stat lives on
    // its own row. We:
    //   1. Detect the rows of the panel using per-row pixel variance
    //      (text rows have high variance, blank gaps have low variance).
    //   2. For each row, run a tiny, focused OCR pass on JUST that row
    //      with PSM 7 (single-line) and a digit-friendly whitelist.
    //   3. Extract the first plausible triple from each row's text.
    //   4. Map triples to stats by canonical order (HP, STA, OXY, FOOD,
    //      WGT, MEL, CRA), choosing the layout (1-col vs 2-col) based on
    //      how many triples each row contains.
    //
    // This is dramatically more reliable than whole-panel OCR because each
    // OCR call has tiny context (one line of digits + maybe a separator
    // pattern) — Tesseract's actual wheelhouse.
    // ─────────────────────────────────────────────────────────────────────

    type RowBox = { y0: number; y1: number }; // panel-relative pixel rows (downsampled space)

    // ─────────────────────────────────────────────────────────────────────
    //  TEMPLATE-MATCHED PANEL OCR
    //  We bundle a clean PNG of the u+/Tek Binoculars panel at
    //  /panel-templates/uplus.png. On each OCR run we:
    //    1. Multi-scale slide the template across the uploaded screenshot
    //       computing sum-of-squared-differences in grayscale-downsampled
    //       space → find best (scale, x, y) match for where the panel sits.
    //    2. Translate the match back to source-image coordinates.
    //    3. For each stat we want, look up its row's normalized Y position
    //       within the template; compute the OCR rectangle in source coords.
    //    4. OCR each tiny rectangle (one stat row, full-width OCR strip).
    //    5. Pull the first triple from each OCR text and map to TekOS schema.
    //
    //  ROW ORDER in the u+/Tek panel (confirmed by user):
    //    1. HP            (+ icon, has triple)
    //    2. Stam          (⚡, has triple)
    //    3. Torpor        (sparkles, has triple — we ignore, not in schema)
    //    4. Food          (drumstick, has triple)
    //    5. Weight        (weight icon, has triple)
    //    6. Oxygen        (spray bottle, has triple)
    //    7. Speed         (boot, % only — we ignore)
    //    8. Melee         (fist, has triple)
    //    9. Imprint       (footprint, % only — we ignore)
    //
    //  Crafting Skill is NOT shown on u+/Tek for dinos; left blank.
    // ─────────────────────────────────────────────────────────────────────

    let cachedTemplate: HTMLImageElement | null = null;
    async function loadTemplate(): Promise<HTMLImageElement> {
        if (cachedTemplate) return cachedTemplate;
        const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image();
            i.onload  = () => res(i);
            i.onerror = () => rej(new Error('Failed to load panel template (/panel-templates/uplus.png)'));
            i.src = '/panel-templates/uplus.png';
        });
        cachedTemplate = img;
        return img;
    }

    /**
     * Multi-scale template matching. Tries the template at several candidate
     * widths (as a fraction of the uploaded screenshot's width), slides it
     * across the screenshot computing grayscale SSD per position, returns
     * the best (scale, x, y) match in source-image coordinates.
     *
     * To keep this tractable in JS:
     *   - We work in a DOWNSAMPLED haystack (haystack scaled to ~300px wide)
     *   - For each candidate scale, the template is also downsampled to the
     *     equivalent size in haystack-downsampled space
     *   - SSD is computed on grayscale luminance only (1 channel)
     *   - Sliding uses a stride of 2 pixels to halve the work
     *
     * Returns null if no scale produced a clearly-better-than-noise match.
     */
    async function matchTemplate(
        haystack: HTMLImageElement,
        template: HTMLImageElement
    ): Promise<{ x: number; y: number; w: number; h: number; score: number } | null> {
        // Downsampled haystack size — aim for ~320 wide for speed
        const HAYSTACK_W = 320;
        const hAspect = haystack.height / haystack.width;
        const HAYSTACK_H = Math.round(HAYSTACK_W * hAspect);

        // Get grayscale luminance for the haystack
        const hCanvas = document.createElement('canvas');
        hCanvas.width = HAYSTACK_W; hCanvas.height = HAYSTACK_H;
        const hCtx = hCanvas.getContext('2d');
        if (!hCtx) return null;
        hCtx.drawImage(haystack, 0, 0, HAYSTACK_W, HAYSTACK_H);
        const hRgba = hCtx.getImageData(0, 0, HAYSTACK_W, HAYSTACK_H).data;
        const hLum = new Float32Array(HAYSTACK_W * HAYSTACK_H);
        for (let i = 0; i < HAYSTACK_W * HAYSTACK_H; i++) {
            hLum[i] = 0.299*hRgba[i*4] + 0.587*hRgba[i*4+1] + 0.114*hRgba[i*4+2];
        }

        const templateAspect = template.height / template.width;
        // Candidate panel widths as a fraction of haystack width. The floor
        // must reach small panels: on a high-res direct screenshot the panel
        // can be ~12-16% of width (a real user panel measured 16.4%) — the
        // old 0.18 floor forced a too-big match that misframed everything.
        // The match is only a COARSE locator now (bar detection refines it),
        // so a generous spread is safe.
        const candidates = [0.12, 0.14, 0.16, 0.18, 0.21, 0.24, 0.27, 0.30, 0.35, 0.40];

        let best: { x: number; y: number; w: number; h: number; score: number; scale: number } | null = null;

        for (const widthFrac of candidates) {
            const tW = Math.max(20, Math.round(HAYSTACK_W * widthFrac));
            const tH = Math.max(20, Math.round(tW * templateAspect));
            if (tW >= HAYSTACK_W || tH >= HAYSTACK_H) continue;

            // Downsample template to (tW × tH)
            const tCanvas = document.createElement('canvas');
            tCanvas.width = tW; tCanvas.height = tH;
            const tCtx = tCanvas.getContext('2d');
            if (!tCtx) continue;
            tCtx.imageSmoothingEnabled = true;
            tCtx.imageSmoothingQuality = 'high';
            tCtx.drawImage(template, 0, 0, tW, tH);
            const tRgba = tCtx.getImageData(0, 0, tW, tH).data;
            const tLum = new Float32Array(tW * tH);
            for (let i = 0; i < tW * tH; i++) {
                tLum[i] = 0.299*tRgba[i*4] + 0.587*tRgba[i*4+1] + 0.114*tRgba[i*4+2];
            }

            // Count of comparisons per slot (we sample every-other pixel)
            const sampledPixels = Math.ceil(tW / 2) * Math.ceil(tH / 2);

            // Slide across haystack with stride 2
            const stride = 2;
            for (let y = 0; y <= HAYSTACK_H - tH; y += stride) {
                for (let x = 0; x <= HAYSTACK_W - tW; x += stride) {
                    let ssd = 0;
                    for (let ty = 0; ty < tH; ty += 2) {
                        const hRow = (y + ty) * HAYSTACK_W + x;
                        const tRow = ty * tW;
                        for (let tx = 0; tx < tW; tx += 2) {
                            const d = hLum[hRow + tx] - tLum[tRow + tx];
                            ssd += d * d;
                        }
                    }
                    // NORMALIZE by pixel count so smaller templates don't win
                    // by default just for having fewer pixels to differ on.
                    const normScore = ssd / sampledPixels;
                    if (!best || normScore < best.score) {
                        best = { x, y, w: tW, h: tH, score: normScore, scale: widthFrac };
                    }
                }
            }
        }
        if (!best) return null;

        // Translate from downsampled-haystack coords to source coords
        const scale = haystack.width / HAYSTACK_W;
        return {
            x: Math.round(best.x * scale),
            y: Math.round(best.y * scale),
            w: Math.round(best.w * scale),
            h: Math.round(best.h * scale),
            score: best.score
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    //  BAR-ANCHORED PANEL STRUCTURE
    //
    //  The u+ panel's colored stat bars are the most reliable landmarks in
    //  any screenshot: the HP bar is the only long saturated GREEN
    //  horizontal run, and the blue bars below share its x-extent. From
    //  the green bar top + measured bar pitch we generate the row bands
    //  directly on the USER's panel — no template-fraction guessing, and
    //  layout variants (8-row vs 9-row panels, per-creature rows) don't
    //  break alignment. Bars are FILL bars (empty stat = no color), so
    //  bars only anchor the grid; text rows are OCR'd regardless of fill.
    // ─────────────────────────────────────────────────────────────────────

    type PanelStructure = {
        greenTop: number;   // y of the HP bar top (source px)
        pitch: number;      // row-to-row distance (source px)
        barX0: number;      // bar column left edge (source px)
        barX1: number;      // bar column right edge (source px)
        rows: Array<{ y: number; h: number }>; // 9 bands in source coords
        greenH: number;
    };

    function isGreenBarPx(r: number, g: number, b: number): boolean {
        return g > 80 && g > 1.8 * r && g > 1.8 * b;
    }
    function isBlueBarPx(r: number, g: number, b: number): boolean {
        return b > 80 && b > 2.0 * Math.max(r, 8) && g > 0.5 * b && g < 0.95 * b;
    }

    function detectPanelStructure(
        img: HTMLImageElement,
        region: { x: number; y: number; w: number; h: number }
    ): PanelStructure | null {
        const rx = Math.max(0, Math.round(region.x));
        const ry = Math.max(0, Math.round(region.y));
        const rw = Math.min(img.width - rx, Math.round(region.w));
        const rh = Math.min(img.height - ry, Math.round(region.h));
        if (rw < 40 || rh < 40) return null;
        const c = document.createElement('canvas');
        c.width = rw; c.height = rh;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(img, rx, ry, rw, rh, 0, 0, rw, rh);
        const d = ctx.getImageData(0, 0, rw, rh).data;

        type Pred = (r: number, g: number, b: number) => boolean;
        type Band = { yStart: number; yEnd: number; xMin: number; xMax: number };

        // Per-row PIXEL COUNTS (not runs) — white text overlaid on a bar
        // splits runs but barely dents the count.
        const rowCounts = (x0: number, x1: number, y0: number, y1: number, pred: Pred) => {
            const out: Array<{ y: number; count: number; xMin: number; xMax: number }> = [];
            for (let y = Math.max(0, y0); y < Math.min(rh, y1); y++) {
                let count = 0, xMin = -1, xMax = -1;
                for (let x = Math.max(0, x0); x < Math.min(rw, x1); x++) {
                    const i = (y * rw + x) * 4;
                    if (pred(d[i], d[i + 1], d[i + 2])) { count++; if (xMin < 0) xMin = x; xMax = x; }
                }
                out.push({ y, count, xMin, xMax });
            }
            return out;
        };
        const groupRows = (rows: ReturnType<typeof rowCounts>, minCount: number): Band[] => {
            const bands: Band[] = [];
            let cur: Band | null = null;
            for (const r of rows) {
                if (r.count < minCount) continue;
                if (!cur || r.y - cur.yEnd > 3) {
                    cur = { yStart: r.y, yEnd: r.y, xMin: r.xMin, xMax: r.xMax };
                    bands.push(cur);
                } else {
                    cur.yEnd = r.y;
                    cur.xMin = Math.min(cur.xMin, r.xMin);
                    cur.xMax = Math.max(cur.xMax, r.xMax);
                }
            }
            return bands;
        };

        const minCount = Math.max(30, Math.round(rw * 0.18));

        // 1. Green HP bar = the anchor
        const greenBands = groupRows(rowCounts(0, rw, 0, rh, isGreenBarPx), minCount);
        const green = greenBands.find(b => b.yEnd - b.yStart + 1 >= 6);
        if (!green) return null;
        const greenH = green.yEnd - green.yStart + 1;

        // 2. Blue bars below → row pitch. Gaps may span multiple rows
        //    (empty fill bars are invisible), so normalize each gap by the
        //    row count it plausibly spans.
        const blueBands = groupRows(
            rowCounts(green.xMin - 10, green.xMax + 10, green.yEnd + 2, green.yEnd + 2 + greenH * 14, isBlueBarPx),
            Math.round(minCount * 0.5)
        ).filter(b => b.yEnd - b.yStart + 1 >= Math.max(4, greenH * 0.5));

        const rowEstimate = greenH * 1.4;
        let pitch = rowEstimate;
        const tops = [green.yStart, ...blueBands.map(b => b.yStart)];
        const pitches: number[] = [];
        for (let i = 1; i < tops.length; i++) {
            const gap = tops[i] - tops[i - 1];
            const k = Math.max(1, Math.round(gap / rowEstimate));
            pitches.push(gap / k);
        }
        if (pitches.length) {
            pitches.sort((a, b) => a - b);
            pitch = pitches[Math.floor(pitches.length / 2)];
        }

        // 3. Bar x-extent: longest contiguous column segment (stray scene
        //    pixels — e.g. a teal creature — can't form one).
        const bandXExtent = (band: Band, pred: Pred): { x0: number; x1: number } | null => {
            const counts = new Map<number, number>();
            for (let y = band.yStart; y <= band.yEnd; y++)
                for (let x = 0; x < rw; x++) {
                    const i = (y * rw + x) * 4;
                    if (pred(d[i], d[i + 1], d[i + 2])) counts.set(x, (counts.get(x) || 0) + 1);
                }
            const need = Math.max(2, Math.round((band.yEnd - band.yStart + 1) * 0.4));
            let best: { x0: number; x1: number } | null = null;
            let segStart = -1, lastGood = -10;
            for (let x = 0; x < rw; x++) {
                if ((counts.get(x) || 0) >= need) {
                    if (x - lastGood > 6) segStart = x;
                    lastGood = x;
                    if (!best || lastGood - segStart > best.x1 - best.x0) best = { x0: segStart, x1: lastGood };
                }
            }
            return best;
        };
        const greenExt = bandXExtent(green, isGreenBarPx);
        if (!greenExt) return null;
        let barX0 = greenExt.x0, barX1 = greenExt.x1;
        for (const b of blueBands) {
            const e = bandXExtent(b, isBlueBarPx);
            if (e && e.x1 - e.x0 > (barX1 - barX0) * 0.6) {
                barX0 = Math.min(barX0, e.x0);
                barX1 = Math.max(barX1, e.x1);
            }
        }

        // 4. 9 row bands generated downward from the anchor
        const rows: Array<{ y: number; h: number }> = [];
        for (let i = 0; i < 9; i++) {
            rows.push({
                y: Math.round(ry + green.yStart - 2 + i * pitch),
                h: Math.round(pitch * 0.95)
            });
        }
        return {
            greenTop: ry + green.yStart,
            pitch,
            barX0: rx + barX0,
            barX1: rx + barX1,
            rows,
            greenH
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    //  PREPROCESSING — min-channel binarization
    //
    //  min(R,G,B) is high only for white-ish text: colored bars always
    //  have one near-zero channel (green bar b≈0, blue bar r≈0) and the
    //  dark bg is low everywhere. Anti-aliased text blended into a bar
    //  keeps a clearly-higher min than the bar itself, so tiny text
    //  survives where a saturation gate would eat it.
    //
    //  Order matters: smooth-upscale the COLOR crop first (keeps sub-pixel
    //  gradients), threshold last → smooth glyph edges, no blocky fusion.
    // ─────────────────────────────────────────────────────────────────────

    type BinRegion = { bin: Uint8Array; w: number; h: number };

    type TessWorker = {
        recognize: (
            image: HTMLCanvasElement | Blob,
            opts?: Record<string, unknown>,
            output?: Record<string, boolean>
        ) => Promise<{ data: TessData }>;
        setParameters: (p: Record<string, unknown>) => Promise<unknown>;
        terminate: () => Promise<unknown>;
    };
    type TessBBox = { x0: number; y0: number; x1: number; y1: number };
    type TessData = {
        text: string;
        blocks?: Array<{
            paragraphs: Array<{
                lines: Array<{
                    words: Array<{
                        text: string;
                        bbox: TessBBox;
                        symbols?: Array<{ text: string; bbox: TessBBox }>;
                    }>;
                }>;
            }>;
        }> | null;
    };

    function binarizeRegion(img: HTMLImageElement, bbox: CropBox, bias: number, targetH: number): BinRegion | null {
        const scale = Math.max(2, Math.min(24, targetH / Math.max(1, bbox.h)));
        const w = Math.max(1, Math.round(bbox.w * scale));
        const h = Math.max(1, Math.round(bbox.h * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        const pixels = w * h;
        const hist = new Array<number>(256).fill(0);
        const mBuf = new Uint8Array(pixels);
        for (let p = 0, i = 0; p < pixels; p++, i += 4) {
            const mn = Math.min(d[i], d[i + 1], d[i + 2]);
            mBuf[p] = mn;
            hist[mn]++;
        }
        let threshold = 90;
        {
            let sum = 0;
            for (let t = 0; t < 256; t++) sum += t * hist[t];
            let sumB = 0, wB = 0, maxVar = 0;
            for (let t = 0; t < 256; t++) {
                wB += hist[t];
                if (wB === 0) continue;
                const wF = pixels - wB;
                if (wF === 0) break;
                sumB += t * hist[t];
                const mB = sumB / wB, mF = (sum - sumB) / wF;
                const v = wB * wF * (mB - mF) * (mB - mF);
                if (v > maxVar) { maxVar = v; threshold = t; }
            }
        }
        // Clamp to a sane window: bars/bg min-channel sits well under 60,
        // pure text min sits 140+. Otsu drifting outside that window means
        // a degenerate crop.
        threshold = Math.max(60, Math.min(160, threshold)) + bias;
        const bin = new Uint8Array(pixels);
        for (let p = 0; p < pixels; p++) bin[p] = mBuf[p] > threshold ? 1 : 0;
        return { bin, w, h };
    }

    /** Binary buffer (1 = text) → black-on-white canvas for Tesseract/debug. */
    function binToCanvas(bin: Uint8Array, w: number, h: number): HTMLCanvasElement {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) return c;
        const id = ctx.createImageData(w, h);
        for (let p = 0; p < w * h; p++) {
            const v = bin[p] ? 0 : 255;
            id.data[p * 4] = v; id.data[p * 4 + 1] = v; id.data[p * 4 + 2] = v; id.data[p * 4 + 3] = 255;
        }
        ctx.putImageData(id, 0, 0);
        return c;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  CLOSE-UP 2-COLUMN READER  (phone-photo path)
    //
    //  A close-up phone photo of the lower stat block: a 2-column grid of
    //  "base /mut/ dom" triples, fixed icon order. Unlike the vertical u+
    //  panel, the background is the TRANSLUCENT panel (game scene bleeds
    //  through) so a single global threshold fails. We threshold LOCALLY
    //  (each pixel vs the mean of its neighbourhood) so bright-text-on-
    //  varying-bg survives everywhere.
    //
    //  Fixed grid (first four rows are the breeding stats):
    //     row 0:  HP   | WGT
    //     row 1:  STA  | MEL
    //     row 2:  OXY  | (Speed — not a breeding stat)
    //     row 3:  FOOD | CRA
    // ─────────────────────────────────────────────────────────────────────

    /** Min-channel buffer + dims for a crop, upscaled to ~targetH tall. */
    function minChannelRegion(img: HTMLImageElement, box: CropBox, targetH: number): { mn: Uint8Array; w: number; h: number } | null {
        const scale = Math.max(2, Math.min(20, targetH / Math.max(1, box.h)));
        const w = Math.max(1, Math.round(box.w * scale));
        const h = Math.max(1, Math.round(box.h * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        const mn = new Uint8Array(w * h);
        for (let p = 0, i = 0; p < w * h; p++, i += 4) mn[p] = Math.min(d[i], d[i + 1], d[i + 2]);
        return { mn, w, h };
    }

    /** Local-mean (Bradley) adaptive threshold over a min-channel buffer.
     *  White text reads 1 where it sits clearly above its neighbourhood,
     *  which survives the translucent panel's scene bleed-through. */
    function adaptiveBin(mn: Uint8Array, w: number, h: number): Uint8Array {
        // Integral image for O(1) window means.
        const ii = new Float64Array((w + 1) * (h + 1));
        for (let y = 0; y < h; y++) {
            let rowSum = 0;
            for (let x = 0; x < w; x++) {
                rowSum += mn[y * w + x];
                ii[(y + 1) * (w + 1) + (x + 1)] = ii[y * (w + 1) + (x + 1)] + rowSum;
            }
        }
        const rad = Math.max(6, Math.round(h * 0.07));   // ~ row-height window
        const C = 9;                                     // bias above local mean
        const bin = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) {
            const y0 = Math.max(0, y - rad), y1 = Math.min(h - 1, y + rad);
            for (let x = 0; x < w; x++) {
                const x0 = Math.max(0, x - rad), x1 = Math.min(w - 1, x + rad);
                const area = (x1 - x0 + 1) * (y1 - y0 + 1);
                const sum = ii[(y1 + 1) * (w + 1) + (x1 + 1)] - ii[y0 * (w + 1) + (x1 + 1)]
                          - ii[(y1 + 1) * (w + 1) + x0] + ii[y0 * (w + 1) + x0];
                const mean = sum / area;
                const v = mn[y * w + x];
                bin[y * w + x] = (v > mean + C && v > 55) ? 1 : 0;
            }
        }
        return bin;
    }

    /** Extract a sub-rectangle from a binary buffer. */
    function subBin(bin: Uint8Array, w: number, x0: number, y0: number, cw: number, ch: number): Uint8Array {
        const out = new Uint8Array(cw * ch);
        for (let y = 0; y < ch; y++)
            for (let x = 0; x < cw; x++)
                out[y * cw + x] = bin[(y0 + y) * w + (x0 + x)];
        return out;
    }

    /** Parse a cell's OCR text into a [base, mut, dom] triple, or null. */
    function parseGridTriple(text: string): [number, number, number] | null {
        const nums = (text.match(/\d+/g) ?? []).map(n => parseInt(n, 10)).filter(n => n <= 999);
        if (nums.length < 3) return null;
        const t: [number, number, number] = [nums[0], nums[1], nums[2]];
        if (t[0] > 255) return null;             // base wild level sanity
        return t;
    }

    type GridReadResult = {
        stats: Partial<Record<StatKey, number>>;
        muts: Partial<Record<StatKey, number>>;
        debug: HTMLCanvasElement[];
        log: string[];
    };

    async function readCloseupGrid(worker: TessWorker, img: HTMLImageElement, box: CropBox): Promise<GridReadResult> {
        const log: string[] = [];
        const debug: HTMLCanvasElement[] = [];
        const stats: Partial<Record<StatKey, number>> = {};
        const muts: Partial<Record<StatKey, number>> = {};

        const mc = minChannelRegion(img, box, 560);
        if (!mc) return { stats, muts, debug, log: ['minChannel failed'] };
        const { w, h } = mc;
        const bin = adaptiveBin(mc.mn, w, h);
        log.push(`── CLOSE-UP 2-COLUMN ──`, `region ${w}×${h}px (adaptive threshold)`);

        // Row bands: horizontal ink projection → contiguous runs of "enough" ink.
        const rowInk = new Float32Array(h);
        let maxInk = 1;
        for (let y = 0; y < h; y++) {
            let s = 0;
            for (let x = 0; x < w; x++) s += bin[y * w + x];
            rowInk[y] = s;
            if (s > maxInk) maxInk = s;
        }
        const inkThresh = maxInk * 0.06;
        const minBandH = Math.max(6, Math.round(h * 0.04));
        const bands: Array<{ y0: number; y1: number }> = [];
        let bs = -1;
        for (let y = 0; y <= h; y++) {
            const on = y < h && rowInk[y] > inkThresh;
            if (on && bs < 0) bs = y;
            else if (!on && bs >= 0) {
                if (y - 1 - bs + 1 >= minBandH) bands.push({ y0: bs, y1: y - 1 });
                bs = -1;
            }
        }
        log.push(`detected ${bands.length} row band(s)`);

        await worker.setParameters({ tessedit_char_whitelist: '0123456789/', tessedit_pageseg_mode: '7' });

        // The numeric text sits to the RIGHT of the stat icon in each half.
        const mid = Math.round(w / 2);
        const leftStats: Array<StatKey | null>  = ['HP', 'STA', 'OXY', 'FOOD'];
        const rightStats: Array<StatKey | null> = ['WGT', 'MEL', null, 'CRA'];

        let statRow = 0;
        for (const band of bands) {
            if (statRow >= 4) break;
            const by = band.y0, bh = band.y1 - band.y0 + 1;
            const halves: Array<{ x0: number; x1: number; side: 'L' | 'R' }> = [
                { x0: 0,   x1: mid, side: 'L' },
                { x0: mid, x1: w,   side: 'R' }
            ];
            let rowTriples: Record<'L' | 'R', [number, number, number] | null> = { L: null, R: null };
            for (const half of halves) {
                const hw = half.x1 - half.x0;
                const iconSkip = Math.round(hw * 0.22);          // drop the icon glyph
                const cx0 = half.x0 + iconSkip;
                const cw = half.x1 - cx0;
                if (cw < 8) continue;
                const cell = subBin(bin, w, cx0, by, cw, bh);
                const canvas = binToCanvas(cell, cw, bh);
                debug.push(canvas);
                const res = await worker.recognize(canvas);
                const t = parseGridTriple(res.data.text.trim());
                rowTriples[half.side] = t;
            }
            // Only count rows that look like a stat row (left cell parsed).
            if (!rowTriples.L && !rowTriples.R) continue;
            const lstat = leftStats[statRow], rstat = rightStats[statRow];
            if (lstat && rowTriples.L) { stats[lstat] = rowTriples.L[0]; muts[lstat] = rowTriples.L[1]; }
            if (rstat && rowTriples.R) { stats[rstat] = rowTriples.R[0]; muts[rstat] = rowTriples.R[1]; }
            log.push(`row ${statRow}: ${lstat ?? '—'}=${rowTriples.L ? rowTriples.L.join('|') : '?'}  ${rstat ?? '—'}=${rowTriples.R ? rowTriples.R.join('|') : '?'}`);
            statRow++;
        }
        return { stats, muts, debug, log };
    }

    async function runCloseupOcr() {
        if (!shotImage) { shotError = 'Take a close-up photo first.'; return; }
        shotRunning = true; shotError = ''; shotProgress = 0; shotPhase = 'recognizing';
        shotRawText = ''; shotParsed = {}; shotParsedMuts = {}; shotSource = null;
        if (shotProcUrl) { URL.revokeObjectURL(shotProcUrl); shotProcUrl = null; }
        try {
            const box: CropBox = cropBox ?? { x: 0, y: 0, w: shotImage.width, h: shotImage.height };
            const Tesseract = await import('tesseract.js');
            const worker = (await Tesseract.createWorker('eng', 1, {
                workerPath: '/tesseract/worker.min.js',
                corePath:   '/tesseract',
                langPath:   '/tesseract',
                workerBlobURL: false
            })) as unknown as TessWorker;
            shotProgress = 30;
            const r = await readCloseupGrid(worker, shotImage, box);
            await worker.terminate();
            shotProgress = 95;

            shotParsed = { ...r.stats };
            shotParsedMuts = { ...r.muts };
            shotSource = 'tek';
            shotRawText = r.log.join('\n');
            renderDebugStrip(r.debug);
            shotProgress = 100;
            if (Object.keys(r.stats).length === 0) {
                shotError = 'No stats read from the close-up. Frame just the 2-column stat block, hold the phone flat, and try again.';
            }
        } catch (err) {
            shotError = 'Close-up read failed: ' + (err instanceof Error ? err.message : String(err));
        } finally {
            shotRunning = false; shotPhase = 'idle';
        }
    }

    /** Stack the per-cell debug canvases into one strip for review. */
    function renderDebugStrip(canvases: HTMLCanvasElement[]) {
        if (!canvases.length) return;
        const pad = 4;
        const w = Math.max(...canvases.map(c => c.width)) + pad * 2;
        const h = canvases.reduce((a, c) => a + c.height + pad, pad);
        const strip = document.createElement('canvas');
        strip.width = w; strip.height = h;
        const ctx = strip.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#888'; ctx.fillRect(0, 0, w, h);
        let y = pad;
        for (const c of canvases) { ctx.drawImage(c, pad, y); y += c.height + pad; }
        strip.toBlob(b => { if (b) shotProcUrl = URL.createObjectURL(b); });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  SEGMENT-BASED TRIPLE EXTRACTION
    //
    //  Tesseract chronically misreads the thin pipes in "(base|mut|dom)" —
    //  they vanish, merge into digits, or read as 1/l/(/). So we stop
    //  asking it to read separators: split the binarized row at column
    //  gaps, classify narrow segments as separators GEOMETRICALLY, drop
    //  them, and reassemble only the digit clusters with wide gaps. The
    //  LAST THREE digit groups in a stat row are always base|mut|dom.
    // ─────────────────────────────────────────────────────────────────────

    type Seg = { x0: number; x1: number; w: number; hExt: number; yMax: number; xRender?: number; dead?: boolean };
    type TripleCandidate = { method: string; triple: [number, number, number] };

    function segmentRow(bin: Uint8Array, w: number, h: number): Seg[] {
        const col = new Array<number>(w).fill(0);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) col[x] += bin[y * w + x];
        const segs: Seg[] = [];
        let start = -1, gap = 0;
        for (let x = 0; x < w; x++) {
            if (col[x] > 0) { if (start < 0) start = x; gap = 0; }
            else if (start >= 0) {
                gap++;
                if (gap > 2) { segs.push({ x0: start, x1: x - gap, w: 0, hExt: 0, yMax: 0 }); start = -1; gap = 0; }
            }
        }
        if (start >= 0) segs.push({ x0: start, x1: w - 1, w: 0, hExt: 0, yMax: 0 });
        for (const s of segs) {
            let yMin = h, yMax = 0;
            for (let y = 0; y < h; y++) for (let x = s.x0; x <= s.x1; x++)
                if (bin[y * w + x]) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
            s.w = s.x1 - s.x0 + 1; s.hExt = yMax - yMin + 1; s.yMax = yMax;
        }
        return segs;
    }

    /** Parens dip below the digit baseline somewhere in their span (their
     *  curves taper at the edges), so find a "deep" column run near a group
     *  edge and cut the whole edge region off. */
    function parenTrim(bin: Uint8Array, w: number, h: number, groups: Seg[]): Seg[] {
        if (!groups.length) return groups;
        const bottoms = groups.map(g => g.yMax).slice().sort((a, b) => a - b);
        const baseline = bottoms[Math.floor(bottoms.length / 2)];
        const tol = h * 0.035;
        const colBottom = (x: number) => {
            let m = -1;
            for (let y = 0; y < h; y++) if (bin[y * w + x]) m = y;
            return m;
        };
        for (const g of groups) {
            const edge = Math.max(4, Math.round(h * 0.16)); // paren width budget
            for (let x = g.x1; x >= Math.max(g.x0, g.x1 - edge); x--) {
                if (colBottom(x) > baseline + tol) {
                    let xs = x;
                    while (xs > g.x0 && colBottom(xs - 1) > baseline + tol) xs--;
                    g.x1 = xs - 1;
                    break;
                }
            }
            for (let x = g.x0; x <= Math.min(g.x1, g.x0 + edge); x++) {
                if (colBottom(x) > baseline + tol) {
                    let xe = x;
                    while (xe < g.x1 && colBottom(xe + 1) > baseline + tol) xe++;
                    g.x0 = xe + 1;
                    break;
                }
            }
            if (g.x1 < g.x0) { g.x1 = g.x0; g.dead = true; }
        }
        return groups.filter(g => !g.dead && g.x1 - g.x0 + 1 >= h * 0.14);
    }

    /** OCR one binarized row via segment reassembly. Returns triple
     *  candidates plus the reassembled canvas for the debug strip. */
    async function ocrRowSegments(
        worker: TessWorker,
        bin: Uint8Array,
        w: number,
        h: number
    ): Promise<{ candidates: TripleCandidate[]; text: string; canvas: HTMLCanvasElement | null }> {
        const segs = segmentRow(bin, w, h);
        const minDigitW = h * 0.16;
        let groups = segs.filter(g => g.w >= minDigitW && g.hExt > h * 0.22);
        groups = parenTrim(bin, w, h, groups);
        if (!groups.length) return { candidates: [], text: '', canvas: null };

        // Adjacency-preserving reassembly: digits of the same number keep a
        // small gap; where a separator was dropped, insert a big gap.
        const SMALL = Math.max(2, Math.round(h * 0.06));
        const BIG = Math.round(h * 0.5);
        const PAD = Math.round(h * 0.25);
        const gaps: number[] = [];
        for (let gi = 1; gi < groups.length; gi++) {
            const prev = groups[gi - 1], cur = groups[gi];
            const separatorBetween = segs.some(s => s.x0 > prev.x1 && s.x1 < cur.x0);
            const wideGap = (cur.x0 - prev.x1) > h * 0.28;
            gaps.push(separatorBetween || wideGap ? BIG : SMALL);
        }
        const totalW = groups.reduce((a, g) => a + (g.x1 - g.x0 + 1), 0) + gaps.reduce((a, b) => a + b, 0) + PAD * 2;
        const lineC = document.createElement('canvas');
        lineC.width = totalW; lineC.height = h + PAD * 2;
        const lctx = lineC.getContext('2d');
        if (!lctx) return { candidates: [], text: '', canvas: null };
        lctx.fillStyle = '#fff';
        lctx.fillRect(0, 0, totalW, h + PAD * 2);
        lctx.fillStyle = '#000';
        let xOff = PAD;
        for (let gi = 0; gi < groups.length; gi++) {
            const g = groups[gi];
            const gw = g.x1 - g.x0 + 1;
            g.xRender = xOff;
            for (let y = 0; y < h; y++) for (let x = 0; x < gw; x++)
                if (bin[y * w + g.x0 + x]) lctx.fillRect(xOff + x, PAD + y, 1, 1);
            xOff += gw + (gi < gaps.length ? gaps[gi] : 0);
        }
        const res = await worker.recognize(lineC, {}, { blocks: true, text: true });
        const text = res.data.text.trim();

        // SYMBOL-level mapping: assign each recognized character to the
        // group its bbox center falls in — word merging across gaps
        // becomes irrelevant.
        const groupTexts = new Array<string>(groups.length).fill('');
        for (const b of res.data.blocks ?? []) for (const par of b.paragraphs)
            for (const ln of par.lines) for (const wd of ln.words)
                for (const sym of wd.symbols ?? []) {
                    const chr = sym.text.replace(/[^0-9]/g, '');
                    if (!chr) continue;
                    const cx = (sym.bbox.x0 + sym.bbox.x1) / 2;
                    for (let gi = 0; gi < groups.length; gi++) {
                        const g = groups[gi];
                        if (cx >= (g.xRender ?? 0) - 4 && cx <= (g.xRender ?? 0) + (g.x1 - g.x0) + 4) {
                            groupTexts[gi] += chr;
                            break;
                        }
                    }
                }

        // PSM 10 single-char retry for empty groups among the last three —
        // Tesseract chronically drops trailing isolated digits in line mode.
        for (let gi = Math.max(0, groups.length - 3); gi < groups.length; gi++) {
            if (groupTexts[gi]) continue;
            const g = groups[gi];
            const gw = g.x1 - g.x0 + 1;
            if (gw > h * 0.8) continue; // multi-char group; PSM 10 won't help
            const pad = Math.round(h * 0.3);
            const cc = document.createElement('canvas');
            cc.width = gw + pad * 2; cc.height = h + pad * 2;
            const cctx = cc.getContext('2d');
            if (!cctx) continue;
            cctx.fillStyle = '#fff';
            cctx.fillRect(0, 0, cc.width, cc.height);
            cctx.fillStyle = '#000';
            for (let y = 0; y < h; y++) for (let x = 0; x < gw; x++)
                if (bin[y * w + g.x0 + x]) cctx.fillRect(pad + x, pad + y, 1, 1);
            await worker.setParameters({ tessedit_pageseg_mode: '10' });
            const cres = await worker.recognize(cc);
            await worker.setParameters({ tessedit_pageseg_mode: '7' });
            const t = cres.data.text.trim().replace(/[^0-9]/g, '');
            if (t.length >= 1 && t.length <= 2) groupTexts[gi] = t;
        }

        const candidates: TripleCandidate[] = [];

        // SLOT extraction: partition digit groups into the numbers between
        // the pipe separators. A BIG gap (a dropped "|" or a wide space)
        // starts a new slot; a SMALL gap means the segmenter split ONE
        // number across columns, so those digits belong to the same slot.
        // The last three slots are base|mut|dom. This fixes the multi-digit
        // drop the "last three GROUPS" heuristic suffers (e.g. "55" splitting
        // into [5,5] used to push the leading 5 out of the window).
        if (groups.length >= 3) {
            const slots: string[] = [];
            let acc = groupTexts[0] ?? '';
            for (let gi = 1; gi < groups.length; gi++) {
                if (gaps[gi - 1] >= BIG) { slots.push(acc); acc = groupTexts[gi] ?? ''; }
                else acc += groupTexts[gi] ?? '';
            }
            slots.push(acc);
            const digitSlots = slots.filter(s => /^\d{1,3}$/.test(s));
            if (digitSlots.length >= 3) {
                candidates.push({
                    method: 'slots',
                    triple: digitSlots.slice(-3).map(s => parseInt(s, 10)) as [number, number, number]
                });
            }
        }

        if (groups.length >= 3) {
            const lastThree = groupTexts.slice(-3);
            if (lastThree.every(t => /^\d{1,3}$/.test(t))) {
                // Consistency: recognized char count must match the group's
                // pixel width (digit ≈ 0.24×rowH wide). Dropped digits →
                // low confidence.
                const charW = h * 0.24;
                const lastGroups = groups.slice(-3);
                const consistent = lastThree.every((t, k) => {
                    const gw = lastGroups[k].x1 - lastGroups[k].x0 + 1;
                    const expected = Math.max(1, Math.min(3, Math.round(gw / charW)));
                    return t.length >= expected;
                });
                candidates.push({
                    method: consistent ? 'wordmap' : 'wordmap-low',
                    triple: lastThree.map(t => parseInt(t, 10)) as [number, number, number]
                });
            }
            const all = text.split(/[()\s]+/).filter(t => /^\d{1,3}$/.test(t)).map(t => parseInt(t, 10));
            if (all.length >= 3) {
                candidates.push({ method: 'tokens', triple: all.slice(-3) as [number, number, number] });
            }
        }
        return { candidates, text, canvas: lineC };
    }

    /** Constraint-split rescue for fused pipes in OCR text, e.g.
     *  "(5910 | 21)" → numbers [5910, 21]. Enumerate ways to split the
     *  fused run into parts ≤255 and accept only a UNIQUE valid split. */
    function constraintSplit(bracketContent: string): [number, number, number] | null {
        const nums = bracketContent.match(/\d+/g);
        if (!nums) return null;
        if (nums.length === 3 && nums.every(n => n.length <= 3)) {
            const t = nums.map(n => parseInt(n, 10)) as [number, number, number];
            return t.every(v => v <= 255) ? t : null;
        }
        if (nums.length === 2) {
            const valid: Array<[number, number, number]> = [];
            for (let target = 0; target < 2; target++) {
                const fixed = parseInt(nums[1 - target], 10);
                if (fixed > 255) continue;
                const run = nums[target];
                if (run.length < 2 || run.length > 6) continue;
                for (let cut = 1; cut < run.length; cut++) {
                    if (run[cut] === '0' && run.length - cut > 1) continue; // no leading-zero parts
                    const a = parseInt(run.slice(0, cut), 10), b = parseInt(run.slice(cut), 10);
                    if (a <= 255 && b <= 255) {
                        valid.push(target === 0 ? [a, b, fixed] : [fixed, a, b]);
                    }
                }
            }
            return valid.length === 1 ? valid[0] : null;
        }
        return null;
    }

    async function runOcr() {
        if (!shotImage) { shotError = 'Drop a screenshot first.'; return; }
        shotRunning = true; shotError = ''; shotProgress = 0; shotPhase = 'preprocessing';
        shotRawText = ''; shotParsed = {}; shotParsedMuts = {}; shotSource = null;
        if (shotProcUrl) { URL.revokeObjectURL(shotProcUrl); shotProcUrl = null; }
        const dbg: string[] = [];

        try {
            // 1. Find the panel STRUCTURE (green HP bar + blue bars). The
            //    search region comes from, in order: the user's manual crop,
            //    the template match (coarse locator), the whole image.
            let struct: PanelStructure | null = null;
            if (cropperVisible && cropBox) {
                const pad = Math.round(Math.max(cropBox.w, cropBox.h) * 0.15);
                struct = detectPanelStructure(shotImage, {
                    x: cropBox.x - pad, y: cropBox.y - pad,
                    w: cropBox.w + pad * 2, h: cropBox.h + pad * 2
                });
                dbg.push(`── PANEL SEARCH ──`, `Manual crop region: structure ${struct ? 'FOUND' : 'not found'}`);
            } else {
                dbg.push(`── PANEL SEARCH ──`);
            }
            if (!struct) {
                const template = await loadTemplate();
                shotProgress = 5;
                const match = await matchTemplate(shotImage, template);
                if (match) {
                    dbg.push(`Template match: x=${match.x} y=${match.y} w=${match.w} h=${match.h} (SSD=${match.score.toFixed(0)})`);
                    struct = detectPanelStructure(shotImage, {
                        x: match.x - match.w * 0.4, y: match.y - match.h * 0.4,
                        w: match.w * 1.8, h: match.h * 1.8
                    });
                    dbg.push(`Bar structure near match: ${struct ? 'FOUND' : 'not found'}`);
                } else {
                    dbg.push(`Template match: none`);
                }
            }
            if (!struct) {
                struct = detectPanelStructure(shotImage, { x: 0, y: 0, w: shotImage.width, h: shotImage.height });
                dbg.push(`Whole-image bar scan: ${struct ? 'FOUND' : 'not found'}`);
            }
            if (!struct) {
                shotRawText = dbg.join('\n');
                shotError = 'Could not find the stat panel (no green HP bar detected). Crop closer to the panel and try again.';
                showCropperManual();
                return;
            }
            dbg.push(
                `Structure: HP bar top y=${struct.greenTop}, row pitch=${struct.pitch.toFixed(1)}px, ` +
                `bars x=${struct.barX0}..${struct.barX1}, bar h=${struct.greenH}px`
            );
            shotProgress = 15;

            shotPhase = 'recognizing';
            const Tesseract = await import('tesseract.js');
            const worker = (await Tesseract.createWorker('eng', 1, {
                workerPath: '/tesseract/worker.min.js',
                corePath:   '/tesseract',
                langPath:   '/tesseract',
                workerBlobURL: false
            })) as unknown as TessWorker;

            // 2. Header: the name/level strip sits ~3 rows above the HP bar
            //    (inside the panel's own header section). PSM 6, full charset.
            const headerX = Math.max(0, Math.round(struct.barX0 - struct.pitch));
            const headerW = Math.min(shotImage.width, Math.round(struct.barX1 + struct.pitch * 0.5)) - headerX;
            const headerY = Math.max(0, Math.round(struct.greenTop - struct.pitch * 3.6));
            const headerHpx = struct.greenTop - 2 - headerY;
            let headerText = '';
            if (headerHpx > 8 && headerW > 20) {
                await worker.setParameters({
                    tessedit_pageseg_mode: '6',
                    tessedit_char_whitelist: '',
                    classify_bln_numeric_mode: '0'
                });
                const hb = binarizeRegion(shotImage, { x: headerX, y: headerY, w: headerW, h: headerHpx }, 0, 220);
                if (hb) {
                    const hres = await worker.recognize(binToCanvas(hb.bin, hb.w, hb.h));
                    headerText = hres.data.text.trim();
                }
            }
            shotProgress = 25;

            // 3. Per-row OCR: numeric PSM 7 over each bar-anchored band.
            await worker.setParameters({
                tessedit_pageseg_mode: '7',
                tessedit_char_whitelist: '0123456789()|/.,% ',
                classify_bln_numeric_mode: '1',
                preserve_interword_spaces: '1',
                user_defined_dpi: '300'
            });

            const rowX = Math.max(0, struct.barX0 - 3);
            const rowW = Math.min(shotImage.width, struct.barX1 + 4) - rowX;
            const rowResults: Array<{
                i: number;
                triple: [number, number, number] | null;
                pct: boolean;
                full: string;
                method: string;
            }> = [];
            const debugCanvases: HTMLCanvasElement[] = [];

            for (let i = 0; i < struct.rows.length; i++) {
                const band = struct.rows[i];
                const bbox: CropBox = { x: rowX, y: Math.max(0, band.y), w: rowW, h: band.h };
                if (bbox.y + bbox.h > shotImage.height || bbox.h <= 4 || bbox.w <= 20) continue;

                // Full-row pass: row classification (% / slash) + split rescue
                const b0 = binarizeRegion(shotImage, bbox, 0, 110);
                if (!b0) continue;
                const fullC = binToCanvas(b0.bin, b0.w, b0.h);
                debugCanvases.push(fullC);
                const fres = await worker.recognize(fullC);
                const full = fres.data.text.trim();
                const pct = full.includes('%');

                // Candidates: segment OCR at two thresholds (early-exit on a
                // high-confidence geometric read) + constraint-split rescue.
                const cands: TripleCandidate[] = [];
                for (const bias of [0, 15]) {
                    const bb = bias === 0 ? b0 : binarizeRegion(shotImage, bbox, bias, 110);
                    if (!bb) continue;
                    const seg = await ocrRowSegments(worker, bb.bin, bb.w, bb.h);
                    cands.push(...seg.candidates.map(c => ({ ...c, method: c.method + '@' + bias })));
                    if (cands.some(c => c.method.startsWith('wordmap@'))) break;
                }
                {
                    const lastParen = full.lastIndexOf('(');
                    if (lastParen >= 0) {
                        const t = constraintSplit(full.slice(lastParen + 1));
                        if (t) cands.push({ method: 'split', triple: t });
                    }
                }
                // Dense rows (HP) sometimes need a smoother, larger render to
                // recover the bracket at all. Cheap because it's rare.
                if (!cands.some(c => c.method.startsWith('wordmap@') || c.method.startsWith('tokens'))) {
                    for (const bias of [0, 15]) {
                        const big = binarizeRegion(shotImage, bbox, bias, 300);
                        if (!big) continue;
                        const bres = await worker.recognize(binToCanvas(big.bin, big.w, big.h));
                        const bigText = bres.data.text.trim();
                        const lastParen = bigText.lastIndexOf('(');
                        if (lastParen >= 0) {
                            const t = constraintSplit(bigText.slice(lastParen + 1));
                            if (t) cands.push({ method: 'split300@' + bias, triple: t });
                        }
                    }
                }

                // Score: sanity filter → shift detection → truncation merge
                // → vote by method family → method rank.
                let valid = cands.filter(c =>
                    c.triple.every(v => v >= 0 && v <= 500) && c.triple[0] <= 255);
                const wordmaps = valid.filter(c => c.method.startsWith('wordmap'));
                valid = valid.filter(c => {
                    if (!c.method.startsWith('tokens')) return true;
                    // tokens = wordmap shifted right by one means the text
                    // pass missed the trailing digit; geometry wins.
                    return !wordmaps.some(wm =>
                        c.triple[1] === wm.triple[0] && c.triple[2] === wm.triple[1]);
                });
                for (const c of valid) {
                    for (const o of valid) {
                        if (c === o) continue;
                        // Two components agree, third is a digit-truncation
                        // of the other's → digit-drop; promote the longer.
                        for (const [k1, k2, vary] of [[1, 2, 0], [0, 1, 2]] as Array<[number, number, number]>) {
                            if (c.triple[k1] === o.triple[k1] && c.triple[k2] === o.triple[k2]) {
                                const cs = String(c.triple[vary]), os = String(o.triple[vary]);
                                if (cs.length < os.length && (os.endsWith(cs) || os.startsWith(cs))) {
                                    c.triple = o.triple.slice() as [number, number, number];
                                }
                            }
                        }
                    }
                }
                let chosen: TripleCandidate | null = null;
                if (valid.length) {
                    const key = (t: number[]) => t.join('|');
                    const fams = new Map<string, Set<string>>();
                    for (const c of valid) {
                        const fam = c.method.replace(/@\d+$/, '');
                        if (!fams.has(key(c.triple))) fams.set(key(c.triple), new Set());
                        fams.get(key(c.triple))!.add(fam);
                    }
                    const rank = (m: string) =>
                        m.startsWith('slots') ? 0 :     // pipe-partitioned: most reliable
                        m.startsWith('wordmap@') ? 1 :
                        m.startsWith('tokens') ? 2 :
                        m.startsWith('split') ? 3 : 4;  // wordmap-low last
                    valid.sort((a, b) =>
                        (fams.get(key(b.triple))!.size - fams.get(key(a.triple))!.size) ||
                        (rank(a.method) - rank(b.method)));
                    chosen = valid[0];
                }

                rowResults.push({
                    i,
                    triple: chosen ? chosen.triple : null,
                    pct,
                    full,
                    method: chosen ? chosen.method : '—'
                });
                shotProgress = Math.min(89, 25 + Math.round(((i + 1) / struct.rows.length) * 60));
            }
            shotProgress = 90;
            await worker.terminate();

            shotSource = 'tek';

            // 4. Semantic mapping. Row positions are anchored to the HP bar,
            //    and the first six rows are identical across panel variants:
            //    0=HP, 1=STA, 2=Torpor (never a stat), 3=Food, 4=Weight,
            //    5=Oxygen. Variants differ AFTER that (optional rows), so
            //    Melee/Crafting are found by content: %-rows with a triple.
            //    An absolute-position stat row that reads as % (e.g. aquatic
            //    creatures without an Oxygen row) is skipped positionally
            //    and picked up by the % scan instead.
            const out: Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number } = {};
            const muts: Partial<Record<StatKey, number>> = {};
            const POSITIONAL: Partial<Record<number, StatKey>> = { 0: 'HP', 1: 'STA', 3: 'FOOD', 4: 'WGT', 5: 'OXY' };
            const pctOrder: StatKey[] = ['MEL', 'CRA'];
            let pctIdx = 0;
            const assigned: string[] = [];
            for (const r of rowResults) {
                if (!r.triple || r.i === 2) continue;
                let stat: StatKey | null = null;
                if (!r.pct && POSITIONAL[r.i] !== undefined) {
                    stat = POSITIONAL[r.i]!;
                } else if (r.pct && r.i >= 4 && pctIdx < pctOrder.length) {
                    stat = pctOrder[pctIdx++];
                }
                if (!stat) continue;
                out[stat] = r.triple[0];
                muts[stat] = r.triple[1];
                assigned.push(`  ${stat.padEnd(5)} ← row ${r.i} (${r.triple.join('|')}) via ${r.method}`);
            }

            // Debug image: stitch the per-row binarized strips vertically.
            if (debugCanvases.length > 0) {
                const maxRowW = Math.max(...debugCanvases.map(c => c.width));
                const totalRowH = debugCanvases.reduce((sum, c) => sum + c.height, 0);
                if (maxRowW > 0 && totalRowH > 0) {
                    const debugCanvas = document.createElement('canvas');
                    debugCanvas.width = maxRowW;
                    debugCanvas.height = totalRowH;
                    const debugCtx = debugCanvas.getContext('2d');
                    if (debugCtx) {
                        debugCtx.fillStyle = '#000';
                        debugCtx.fillRect(0, 0, maxRowW, totalRowH);
                        let yOff = 0;
                        for (const c of debugCanvases) {
                            debugCtx.drawImage(c, 0, yOff);
                            yOff += c.height;
                        }
                    }
                    shotProcUrl = URL.createObjectURL(await new Promise<Blob>((resolve, reject) => {
                        debugCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
                    }));
                }
            }

            // 5. Name + level from the header strip
            extractNameAndLevel(
                headerText.split(/\r?\n/).map(l => l.trim()).filter(Boolean),
                out
            );
            shotParsed = out;
            shotParsedMuts = muts;

            dbg.push(
                ``,
                `── HEADER ──`,
                headerText || '(empty)',
                ``,
                `── PER-ROW OCR ──`,
                rowResults.length === 0
                    ? '(no rows)'
                    : rowResults.map(r =>
                        `  Row ${r.i}: "${r.full.replace(/\n/g, ' ')}" → ` +
                        `${r.triple ? `(${r.triple.join('|')}) via ${r.method}` : 'no triple'}${r.pct ? ' [%]' : ''}`
                      ).join('\n'),
                ``,
                `── ASSIGNED STATS (base|mut|dom) ──`,
                assigned.length === 0 ? '(none)' : assigned.join('\n')
            );
            shotRawText = dbg.join('\n');

            const populatedCount = Object.keys(out).filter(k => k !== 'name' && k !== 'species' && k !== 'level').length;
            if (populatedCount === 0) {
                shotError = 'Found the panel but no stat triples were readable. Check the panel OCR text below to see what Tesseract produced.';
            }
        } catch (err) {
            shotError = (err as Error).message || 'OCR failed';
        } finally {
            shotRunning = false;
            shotPhase = 'idle';
        }
    }

    // Old whole-panel parsers (parseStatPanel, parseTekUplus,
    // parseSuperSpyglass) were removed when we switched to row-anchored OCR
    // above. The row pipeline handles both layouts naturally — see runOcr().

    /**
     * Pull the creature's name + level from the first 5 lines of OCR. Both
     * sources put the name immediately before or alongside the level marker.
     *
     * If the extracted name matches a known species (from /static/species-
     * database.js) we treat it as an unnamed creature and pre-fill BOTH the
     * Name and Species fields with the canonical species name. Otherwise we
     * pre-fill only the Name, and leave Species blank for the user to pick.
     */
    function extractNameAndLevel(
        lines: string[],
        out: { name?: string; species?: string; level?: number }
    ) {
        const BLACKLIST = /^(?:tamed|wild|tribe(?:\s*of)?|can\s*mate|ready\s*to\s*mate|sleeping|awake|aggressive|passive|level)/i;

        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const m = lines[i].match(/\b(?:lv|lvl|level)\s*[:\-]?\s*(\d{1,4})\b/i);
            if (m && out.level === undefined) out.level = Math.min(9999, parseInt(m[1], 10));
        }

        let headerName: string | null = null;
        // Pattern A: "Name - Lvl N" / "Name Lvl N" on one line
        for (let i = 0; i < Math.min(5, lines.length); i++) {
            const m = lines[i].match(/^(.+?)\s*[-–—]?\s*(?:Lv|Lvl|Level)\s*[:\-]?\s*\d+/i);
            if (m) {
                const cand = m[1].trim();
                if (cand.length > 0 && !BLACKLIST.test(cand)) {
                    headerName = cand;
                    break;
                }
            }
        }
        // Pattern B: name on line N, "Level: 243" on line N+1
        if (!headerName) {
            for (let i = 1; i < Math.min(5, lines.length); i++) {
                if (/\blevel\s*:?\s*\d/i.test(lines[i])) {
                    const cand = lines[i - 1].trim();
                    if (cand.length > 0 && !BLACKLIST.test(cand)) {
                        headerName = cand;
                        break;
                    }
                }
            }
        }
        // Pattern C: fallback — first non-blacklisted alphabetic line in the top 3
        if (!headerName) {
            for (let i = 0; i < Math.min(3, lines.length); i++) {
                const cand = lines[i].trim();
                if (cand.length >= 2 && !BLACKLIST.test(cand) && /[A-Za-z]/.test(cand)) {
                    headerName = cand;
                    break;
                }
            }
        }
        if (!headerName) return;

        // Clean up: strip stray punctuation but keep apostrophes, hyphens, spaces
        headerName = headerName.replace(/[^\w\s'\-]/g, '').replace(/\s+/g, ' ').trim();
        if (!headerName) return;

        // Cross-reference the species DB to detect unnamed creatures
        const dbMatch = matchSpecies(headerName);
        if (dbMatch) {
            out.name = dbMatch;
            out.species = dbMatch;
        } else {
            out.name = headerName;
        }
    }

    /** Case-insensitive species lookup with OCR-tolerant near-matching. */
    function matchSpecies(text: string): string | null {
        if (!speciesList.length) return null;
        const lc = text.toLowerCase();
        for (const sp of speciesList) {
            if (sp.toLowerCase() === lc) return sp;
        }
        // Whitespace-insensitive (handles "RockDrake" ↔ "Rock Drake")
        const compact = lc.replace(/\s+/g, '');
        for (const sp of speciesList) {
            const spc = sp.toLowerCase().replace(/\s+/g, '');
            if (spc === compact) return sp;
            // Allow either-direction prefix match for 5+ char names (catches OCR
            // dropping the last char or two: "Therizinosaur" ↔ "Therizinosa")
            if (compact.length >= 5) {
                if (spc.startsWith(compact) || compact.startsWith(spc)) return sp;
            }
        }
        return null;
    }

    function applyOcrToForm() {
        if (shotParsed.level)   fLevel = shotParsed.level;
        if (shotParsed.name && !fName) fName = shotParsed.name;
        if (shotParsed.species && !fSpecies) fSpecies = shotParsed.species;
        for (const k of STATS) {
            const v = shotParsed[k];
            if (typeof v === 'number') fStats[k] = v;
            const m = shotParsedMuts[k];
            if (typeof m === 'number') fMuts[k] = m;
        }
        // Switch back to manual so the user can review/correct before saving
        mode = 'manual';
    }

    let speciesList = $state<string[]>([]);
    let saving = $state(false);
    let error  = $state('');


    onMount(() => {
        // Species autocomplete from global DB
        const db = (window as unknown as { EXPANDED_SPECIES_DATABASE?: Record<string, unknown> }).EXPANDED_SPECIES_DATABASE;
        if (db) speciesList = Object.keys(db).sort();
    });

    // ── Live preview derived ────────────────────────────────────────────────
    const badges = $derived(computeBadges(
        { Health: fStats.HP, Stamina: fStats.STA, Oxygen: fStats.OXY, Food: fStats.FOOD, Weight: fStats.WGT, Melee: fStats.MEL, Crafting: fStats.CRA },
        { Health: fMuts.HP, Stamina: fMuts.STA, Oxygen: fMuts.OXY, Food: fMuts.FOOD, Weight: fMuts.WGT, Melee: fMuts.MEL, Crafting: fMuts.CRA },
        fSpecies.trim()
    ));

    function totalLevel(s: StatKey) {
        // Mutations store TOTAL mutation levels, not events — no ×2 multiplier.
        return (fStats[s] || 0) + (fMuts[s] || 0);
    }

    function tradeBump(): string {
        if (badges.bloodline === 'diamond') return 'PRICELESS · AUCTION-ONLY';
        if (badges.bloodline === 'gold')    return '+100% TRADE VALUE';
        if (badges.bloodline === 'silver')  return '+50% TRADE VALUE';
        if (badges.bloodline === 'bronze')  return '+25% TRADE VALUE';
        return '';
    }

    function genderGlyph(g: 'M' | 'F' | '?'): string {
        return g === 'M' ? '♂' : g === 'F' ? '♀' : '?';
    }

    async function save(saveAndAddAnother = false) {
        if (!fName.trim()) { error = 'Specimen name required.'; return; }
        if (!fSpecies.trim()) { error = 'Species required.'; return; }
        saving = true; error = '';

        const genderLong = fGender === 'M' ? 'Male' : fGender === 'F' ? 'Female' : 'Unknown';

        const body = {
            name: fName.trim(),
            species: fSpecies.trim(),
            level: fLevel,
            gender: genderLong,
            server: fServer.trim() || undefined,
            notes: fNotes.trim() || undefined,
            baseStats: {
                Health: fStats.HP, Stamina: fStats.STA, Oxygen: fStats.OXY,
                Food: fStats.FOOD, Weight: fStats.WGT, Melee: fStats.MEL, Crafting: fStats.CRA
            },
            mutations: {
                Health: fMuts.HP, Stamina: fMuts.STA, Oxygen: fMuts.OXY,
                Food: fMuts.FOOD, Weight: fMuts.WGT, Melee: fMuts.MEL, Crafting: fMuts.CRA
            },
            isFounder: founderOn,
            statGenealogy: founderSources,
            availableForBreeding: fAvailBreed,
            availableForTrade: fAvailTrade,
            colorRegions: fColorRegions.some(s => s.trim()) ? fColorRegions : undefined
        };

        const res = await fetch('/api/creatures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            if (saveAndAddAnother) {
                // Reset all but species
                fName = '';
                fLevel = 1;
                fNotes = '';
                fStats = { HP:0, STA:0, OXY:0, FOOD:0, WGT:0, MEL:0, CRA:0 };
                fMuts  = { HP:0, STA:0, OXY:0, FOOD:0, WGT:0, MEL:0, CRA:0 };
                fAvailBreed = false;
                fAvailTrade = false;
                fColorRegions = ['','','','','',''];
                saving = false;
                error = '';
            } else {
                goto('/specimens');
            }
        } else {
            const errBody = await res.json().catch(() => ({}));
            error = errBody.error ?? 'Failed to save';
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>⬡ TEKOS — Add Specimen</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&family=Orbitron:wght@500;700;900&family=Crimson+Pro:ital,wght@1,400&display=swap" rel="stylesheet" />
</svelte:head>

<div class="stage">

    <PageHeader
        title="Add Specimen"
        crumbs={[
            { label: 'Dashboard', href: '/dossier' },
            { label: 'Specimens', href: '/specimens' },
            { label: 'Add Specimen' }
        ]}
        sub="Record a new bloodline into your specimens"
    />

    <!-- Mode tabs -->
    <div class="mode-tabs">
        <button class="mode-tab" class:active={mode === 'manual'} onclick={() => mode = 'manual'} data-mode="manual">
            <svg class="mt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Manual Entry
        </button>
        <button class="mode-tab" class:active={mode === 'save'} onclick={() => mode = 'save'} data-mode="save">
            <svg class="mt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Import from ARK Save
        </button>
        <button class="mode-tab" class:active={mode === 'screenshot'} onclick={() => mode = 'screenshot'} data-mode="screenshot">
            <svg class="mt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Import from Screenshot
        </button>
    </div>

    <!-- Shell -->
    <div class="builder-shell">

        <!-- ═══════════════ FORM COLUMN ═══════════════ -->
        <div class="form-col">

            <!-- Save-file dropzone (still TODO — single-player only when built) -->
            <div class="dropzone" class:visible={mode === 'save'} id="dropzoneSave">
                <div class="dropzone-icon">⬡</div>
                <div class="dropzone-title">Drop your ARK save file</div>
                <div class="dropzone-desc">
                    <strong style="color: var(--tek-amber)">Single-player only.</strong>
                    Dedicated / Nitrado / Wildcard servers don't expose their save files to clients, so this importer is for local single-player worlds only.
                    We'll extract every tame from your save and stage them as Specimen entries — stats only. Supports <code style="font-family:var(--tek-mono); color:var(--tek-blue);">.ark</code> files up to 200MB.
                </div>
                <button class="btn">CHOOSE FILE</button>
                <div class="dropzone-coming-soon">⏳ FEATURE COMING SOON</div>
            </div>

            <!-- Screenshot OCR — Tek Binoculars / u+Binoculars only -->
            <div class="dropzone" class:visible={mode === 'screenshot'} id="dropzoneShot" style={mode === 'screenshot' ? 'min-height:auto; padding:24px' : ''}>
                {#if !shotFile}
                    <div class="dropzone-icon">⊡</div>
                    <div class="dropzone-title">Import stats from a screenshot</div>
                    <div class="shot-sources">
                        <div class="ss-col">
                            <div class="ss-head ok">Supported</div>
                            <div class="ss-row"><span class="ss-mark ok">✓</span> Tek Binoculars</div>
                            <div class="ss-row"><span class="ss-mark ok">✓</span> u+Binoculars</div>
                        </div>
                        <div class="ss-col">
                            <div class="ss-head no">Not Supported</div>
                            <div class="ss-row"><span class="ss-mark no">✕</span> Cryopod (Vanilla or Mod)</div>
                        </div>
                    </div>
                    <div class="dropzone-desc" style="margin-top:14px">
                        OCR runs entirely in your browser — nothing uploads. Phone photos of your monitor are fine; you'll crop to the panel in the next step.
                    </div>
                    <label class="btn" style="cursor:pointer; display:inline-block">
                        CHOOSE IMAGE
                        <input type="file" accept="image/*" onchange={pickScreenshot} style="display:none" />
                    </label>
                {:else}
                    <div class="shot-flow">
                        <!-- Top action strip — always visible regardless of cropper state.
                             Lets the user swap the image without diving into manual crop. -->
                        <div class="shot-top-actions">
                            <label class="ghost-btn" style="cursor:pointer">
                                ↻ Replace image
                                <input type="file" accept="image/*" onchange={pickScreenshot} style="display:none" />
                            </label>
                            {#if !cropperVisible}
                                <button type="button" class="ghost-btn" onclick={showCropperManual} title="Auto-detect missed the panel? Adjust the crop yourself">
                                    ✂ Adjust crop manually
                                </button>
                            {/if}
                        </div>

                        {#if cropperVisible}
                        <!-- ░░░ Cropper — only shown if auto-detect was low-confidence or user explicitly opened it ░░░ -->
                        <div class="shot-pane">
                            <div class="shot-step-label">Crop to the stat panel</div>
                            <div class="shot-actions">
                                <button type="button" class="ghost-btn" onclick={reAutoDetect} title="Re-snap the box to the detected panel">⊕ Auto-detect</button>
                                <button type="button" class="ghost-btn" onclick={resetCrop}>↺ Reset</button>
                                <span class="zoom-bar">
                                    <button type="button" class="ghost-btn" onclick={zoomOut} title="Zoom out">−</button>
                                    <span class="zoom-val">{Math.round(imgZoom * 100)}%</span>
                                    <button type="button" class="ghost-btn" onclick={zoomIn} title="Zoom in">+</button>
                                    <button type="button" class="ghost-btn" onclick={zoomFit} title="Fit width">⤢</button>
                                    <button type="button" class="ghost-btn" onclick={zoomActual} title="Actual size (100%)">1:1</button>
                                </span>
                            </div>
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="cropper-scroll"
                                bind:this={stageContainerEl}
                                onwheel={onStageWheel}
                                onpointerdown={onStagePointerDown}
                                onpointermove={onStagePointerMove}
                                onpointerup={onStagePointerUp}
                                onpointercancel={onStagePointerUp}
                            >
                                {#if shotImage && shotImageUrl && cropBox}
                                    {@const sw = shotImage.width  * imgZoom}
                                    {@const sh = shotImage.height * imgZoom}
                                    {@const cx = cropBox.x * imgZoom}
                                    {@const cy = cropBox.y * imgZoom}
                                    {@const cw = cropBox.w * imgZoom}
                                    {@const ch = cropBox.h * imgZoom}
                                    <div
                                        class="cropper-stage"
                                        bind:this={stageEl}
                                        style="width: {sw}px; height: {sh}px"
                                    >
                                        <img
                                            class="cropper-img"
                                            src={shotImageUrl}
                                            alt=""
                                            draggable="false"
                                            style="width: {sw}px; height: {sh}px"
                                        />
                                        <!-- Four dimmed-mask quadrants outside the crop. pointer-events
                                             disabled so clicks pass through to handles below. -->
                                        <div class="cmask" style="left:0; top:0; width:{sw}px; height:{cy}px"></div>
                                        <div class="cmask" style="left:0; top:{cy + ch}px; width:{sw}px; height:{sh - cy - ch}px"></div>
                                        <div class="cmask" style="left:0; top:{cy}px; width:{cx}px; height:{ch}px"></div>
                                        <div class="cmask" style="left:{cx + cw}px; top:{cy}px; width:{sw - cx - cw}px; height:{ch}px"></div>

                                        <!-- The crop box itself: border + rule-of-thirds + handles.
                                             pointerdown on the box (not a handle) = move.
                                             svelte-ignore a11y_no_static_element_interactions: cropper is
                                             inherently pointer-only; keyboard adjustment isn't supported. -->
                                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                                        <div
                                            class="crop-box"
                                            style="left:{cx}px; top:{cy}px; width:{cw}px; height:{ch}px"
                                            onpointerdown={(e) => startCropDrag(e, 'move')}
                                        >
                                            <div class="rule v" style="left:33.333%"></div>
                                            <div class="rule v" style="left:66.667%"></div>
                                            <div class="rule h" style="top:33.333%"></div>
                                            <div class="rule h" style="top:66.667%"></div>

                                            <!-- Edge handles: whole edge is the hit zone (CSS handles this) -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="edge edge-t" onpointerdown={(e) => startCropDrag(e, 'resize-t')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="edge edge-b" onpointerdown={(e) => startCropDrag(e, 'resize-b')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="edge edge-l" onpointerdown={(e) => startCropDrag(e, 'resize-l')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="edge edge-r" onpointerdown={(e) => startCropDrag(e, 'resize-r')}></div>

                                            <!-- Corner handles -->
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="corner corner-tl" onpointerdown={(e) => startCropDrag(e, 'resize-tl')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="corner corner-tr" onpointerdown={(e) => startCropDrag(e, 'resize-tr')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="corner corner-bl" onpointerdown={(e) => startCropDrag(e, 'resize-bl')}></div>
                                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                                            <div class="corner corner-br" onpointerdown={(e) => startCropDrag(e, 'resize-br')}></div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                            <div class="shot-hint">
                                {#if shotAutoDetected}
                                    ⊕ Auto-snapped to the detected panel. Drag a corner / edge / inside the box to adjust. Ctrl+scroll or pinch to zoom; the bar above also has +/−/fit/1:1.
                                {:else}
                                    Drag a corner / edge / inside the box to adjust. Ctrl+scroll or pinch to zoom; the bar above also has +/−/fit/1:1.
                                {/if}
                            </div>
                            <button class="btn shot-run-btn" disabled={shotRunning} onclick={runOcr}>
                                {#if shotRunning && shotPhase === 'preprocessing'}Preparing image…
                                {:else if shotRunning}Reading text… {shotProgress}%
                                {:else}Run OCR ➜{/if}
                            </button>
                            <button class="btn shot-run-btn closeup" disabled={shotRunning} onclick={runCloseupOcr}>
                                {#if shotRunning}Reading… {shotProgress}%
                                {:else}📷 Read close-up (2-column block){/if}
                            </button>
                            <div class="shot-hint" style="margin-top:6px">
                                <strong>Close-up?</strong> Walk your phone up to the screen and frame just the lower
                                <em>2-column stats block</em> (HP/STA/OXY/FOOD on the left, WGT/MEL/Speed/Craft on the right).
                                Hold the phone flat to the screen to avoid skew, crop tight, then use the 📷 button.
                            </div>
                        </div>
                        {/if}

                        <!-- ░░░ BELOW: review ░░░ -->
                        <div class="shot-pane review">
                            <div class="shot-step-label">Review &amp; correct</div>

                            {#if shotError}
                                <div class="form-error">{shotError}</div>
                            {/if}

                            {#if shotRunning}
                                <div class="shot-hint">
                                    {shotPhase === 'preprocessing' ? 'Preparing image…' : `Reading text… ${shotProgress}%`}
                                </div>
                            {:else if !shotRawText && !shotError}
                                <div class="shot-hint">
                                    {#if cropperVisible}
                                        Adjust the crop above, then click <strong>Run OCR</strong>.
                                    {:else}
                                        Reading the panel automatically — results will appear here.
                                    {/if}
                                </div>
                            {/if}

                            {#if Object.keys(shotParsed).length > 0 && shotSource}
                                <div class="shot-source-banner">
                                    <span class="ss-mark ok">✓</span>
                                    Detected as <strong>Tek Binoculars / u+Binoculars</strong>
                                    · Adjust anything OCR got wrong below, then apply to the form.
                                </div>
                                <div class="ocr-edit-grid">
                                    <div class="stats-stat-label">Name</div>
                                    <input class="ocr-edit-input" type="text" bind:value={shotParsed.name} placeholder="—" />
                                    <div class="stats-stat-label">Species</div>
                                    <input class="ocr-edit-input" type="text" bind:value={shotParsed.species} placeholder="(pick from dropdown)" list="speciesList" />
                                    <div class="stats-stat-label">Level</div>
                                    <input class="ocr-edit-input" type="number" min="1" max="9999" bind:value={shotParsed.level} />
                                    {#each STATS as s}
                                        <div class="stats-stat-label">{s}</div>
                                        <input class="ocr-edit-input" type="number" min="0" max="999" bind:value={shotParsed[s]} placeholder="0" />
                                    {/each}
                                </div>
                                <button class="btn shot-apply-btn" onclick={applyOcrToForm}>
                                    ✓ Apply to form
                                </button>
                            {/if}

                            <!-- Debug surface — ALWAYS visible after OCR runs (success OR failure)
                                 so the user can see exactly what Tesseract read and adjust crop -->
                            {#if shotRawText || shotProcUrl}
                                <div class="shot-preview-stack">
                                    {#if shotProcUrl}
                                        <details open={!shotSource}>
                                            <summary class="shot-details-summary">Preprocessed image (what Tesseract sees)</summary>
                                            <img src={shotProcUrl} alt="Preprocessed" style="width:100%; max-height:700px; object-fit:contain; margin-top:6px; border:1px solid rgba(245,158,11,0.30); background:#fff" />
                                        </details>
                                    {/if}
                                    {#if shotRawText}
                                        <details open={!shotSource} style="margin-top:10px">
                                            <summary class="shot-details-summary">Raw OCR text</summary>
                                            <pre class="shot-raw-text">{shotRawText}</pre>
                                        </details>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Manual form -->
            <div class="manual-area" class:hidden={mode !== 'manual'} id="manualArea">

                <!-- IDENTITY -->
                <div class="form-section">
                    <div class="form-section-head">
                        <div class="form-section-title">Identity</div>
                    </div>
                    <div class="field-grid">
                        <div class="field">
                            <div class="field-label">Species <span class="req">*</span></div>
                            <input class="field-input" id="fSpecies" list="speciesList" placeholder="e.g. Yutyrannus" bind:value={fSpecies} />
                            <datalist id="speciesList">
                                {#each speciesList as s}<option value={s}></option>{/each}
                            </datalist>
                        </div>
                        <div class="field">
                            <div class="field-label">Specimen name <span class="req">*</span></div>
                            <input class="field-input" id="fName" placeholder="e.g. Roar" bind:value={fName} />
                        </div>
                        <div class="field">
                            <div class="field-label">Level</div>
                            <input class="field-input" id="fLevel" type="number" min="1" max="999" bind:value={fLevel} />
                        </div>
                    </div>
                    <div class="field-grid cols-2" style="margin-top: 12px;">
                        <div class="field">
                            <div class="field-label">Gender</div>
                            <div class="gender-toggle" id="genderToggle">
                                <button class="gender-opt" class:active={fGender === 'M'} onclick={() => fGender = 'M'} data-g="M">♂ Male</button>
                                <button class="gender-opt" class:active={fGender === 'F'} onclick={() => fGender = 'F'} data-g="F">♀ Female</button>
                                <button class="gender-opt" class:active={fGender === '?'} onclick={() => fGender = '?'} data-g="?">? Unknown</button>
                            </div>
                        </div>
                        <div class="field">
                            <div class="field-label">Home server</div>
                            <select class="field-select" id="fServer" bind:value={fServer}>
                                <option value="">— Not assigned —</option>
                                {#each (data?.servers ?? []) as srv}
                                    <option value={srv.name}>{srv.map ? `${srv.name} · ${srv.map}` : srv.name}</option>
                                {/each}
                            </select>
                            {#if (data?.servers ?? []).length === 0}
                                <div class="form-section-hint" style="margin-top:4px">
                                    No servers linked. Add servers in <a href="/settings#cluster" style="color:var(--tek-blue)">Settings → Cluster</a>.
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- BASE STATS + MUTATIONS -->
                <div class="form-section">
                    <div class="form-section-head">
                        <div class="form-section-title">Base Stats & Mutations</div>
                    </div>
                    <div class="form-section-hint">
                        Enter base stat levels (at tame) and total mutation levels per stat (as shown in your in-game UI). Total = base + mutations.
                    </div>
                    <div class="stats-grid">
                        <div class="stats-head">Stat</div>
                        <div class="stats-head r">Base</div>
                        <div class="stats-head r">Mutations</div>
                        <div class="stats-head r">Total</div>

                        {#each STATS as s}
                            <div class="stats-input-row" data-stat={s}>
                                <div class="stats-stat-label">{s}</div>
                                <input class="stats-input base" type="number" min="0" bind:value={fStats[s]} />
                                <input class="stats-input mut" class:has-val={fMuts[s] > 0} type="number" min="0" bind:value={fMuts[s]} />
                                <div class="stats-total"><span class="arrow">→</span><span class="t">{totalLevel(s)}</span></div>
                            </div>
                        {/each}
                    </div>
                    <div class="stats-help">
                        ⓘ As you type, watch the right panel — TekOS auto-calculates which Bloodline tier and Boss Ready badges this specimen will unlock.
                    </div>
                </div>

                <!-- FREEFORM NOTES -->
                <div class="form-section optional">
                    <div class="form-section-head">
                        <div class="form-section-title">Notes</div>
                        <div class="optional-tag">Optional</div>
                    </div>
                    <textarea class="notes-area" bind:value={fNotes} placeholder="Color mutations, behavioral quirks, breeding plans, anything else worth recording…"></textarea>
                </div>

                <!-- ADVANCED — Stat Genealogy + Availability + Color regions (collapsed by default) -->
                <div class="form-section optional">
                    <button
                        type="button"
                        class="advanced-toggle"
                        class:open={advancedOpen}
                        onclick={() => advancedOpen = !advancedOpen}
                        aria-expanded={advancedOpen}
                    >
                        <span class="adv-caret">{advancedOpen ? '▾' : '▸'}</span>
                        <span class="adv-label">Advanced</span>
                        <span class="adv-sub">Stat Genealogy · Availability · Color regions</span>
                    </button>

                    {#if advancedOpen}
                        <div class="advanced-body">
                            <!-- Stat Genealogy -->
                            <div class="advanced-sub-section">
                                <div class="advanced-sub-title">Stat Genealogy</div>
                                <div class="form-section-hint">
                                    For consolidation breeding — track which high stat came from which tame. This populates from the tames marked as Founders on the specimen's detail page.
                                </div>
                                <div class="genealogy-grid">
                                    {#each STATS as s}
                                        <div class="gen-stat-label">{s}</div>
                                        <select class="gen-select" value={founderSources[s] ?? ''} onchange={(e) => onFounderPick(s, e)}>
                                            <option value="">— No founder —</option>
                                            {#each (data?.founders ?? []) as f (f.id)}
                                                <option value={f.id}>{f.name || '(unnamed)'} · {f.species}</option>
                                            {/each}
                                        </select>
                                    {/each}
                                </div>
                                {#if (data?.founders ?? []).length === 0}
                                    <div class="form-section-hint" style="margin-top:8px">
                                        No founders yet. Mark a tame as a founder via the toggle below or from any specimen's detail page.
                                    </div>
                                {/if}
                                <div class="founder-toggle-row">
                                    <div class="toggle" class:on={founderOn} id="founderToggle" onclick={() => founderOn = !founderOn} role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { founderOn = !founderOn; } }}></div>
                                    <div class="founder-toggle-label">
                                        <span class="t">Mark this specimen as a founder</span>
                                        <span class="d">Adds it to the Founders Index — its base stats can then be cited as origin for future descendants.</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Availability + Color regions -->
                            <div class="advanced-sub-section">
                                <div class="advanced-sub-title">Availability & Colors</div>
                                <CreatureNotesFields
                                    bind:availableForBreeding={fAvailBreed}
                                    bind:availableForTrade={fAvailTrade}
                                    bind:colorRegions={fColorRegions}
                                />
                            </div>
                        </div>
                    {/if}
                </div>

                {#if error}
                    <div class="form-error">{error}</div>
                {/if}

                <!-- Action bar -->
                <div class="action-bar">
                    <a class="btn ghost" href="/specimens">Cancel</a>
                    <div class="spacer"></div>
                    <button class="btn" onclick={() => save(true)} disabled={saving}>Save & Add Another</button>
                    <button class="btn solid" onclick={() => save(false)} disabled={saving}>{saving ? 'SAVING…' : 'Save Specimen'}</button>
                </div>

            </div>
        </div>

        <!-- ═══════════════ LIVE PREVIEW COLUMN ═══════════════ -->
        <div class="preview-col">
            <div class="preview-header"><span class="live-pip"></span>Live Preview</div>
            <div class="preview-card">
                <div class="pv-species" id="pvSpecies">{(fSpecies || '—').toUpperCase()}</div>
                <div class="pv-name" class:placeholder={!fName.trim()} id="pvName">{fName.trim() || 'Unnamed'}</div>
                <div class="pv-meta">
                    <div class="item"><span>LVL</span><span class="v" id="pvLevel">{fLevel || '—'}</span></div>
                    <div class="item"><span class="gender" class:m={fGender === 'M'} class:f={fGender === 'F'} id="pvGender">{genderGlyph(fGender)}</span></div>
                    {#if fServer.trim()}
                        <div class="item"><span>HOME</span><span class="v" id="pvServer">{fServer.trim()}</span></div>
                    {/if}
                </div>

                <div class="pv-stats">
                    <div class="pv-stats-head">
                        <div>Stat</div>
                        <div class="r">Base</div>
                        <div class="r">Mut</div>
                    </div>
                    <div id="pvStatsList">
                        {#each STATS as s}
                            <div class="pv-stat-row">
                                <span class="pv-stat-label">{s}</span>
                                <span class="pv-stat-base">{fStats[s]}</span>
                                <span class="pv-stat-mut" class:has-mut={fMuts[s] > 0}>{fMuts[s] > 0 ? `+${fMuts[s]}` : '·'}</span>
                            </div>
                        {/each}
                    </div>
                </div>

                <div class="pv-badges-block">
                    <div class="pv-badges-label">Auto-Computed Badges</div>
                    <div class="pv-badges" id="pvBadges">
                        {#if badges.bloodline}
                            <div class="pv-badge {badges.bloodline}">
                                {badges.bloodline === 'diamond' ? '✦' : badges.bloodline === 'gold' ? '◈' : '⬢'} {badges.bloodline.toUpperCase()} BLOODLINE
                            </div>
                        {/if}
                        {#if badges.bossReady}
                            <div class="pv-badge {badges.bossReady}">
                                {badges.bossReady === 'titan' ? '◆ TITAN SLAYER' :
                                 badges.bossReady === 'alpha' ? 'α ALPHA READY' :
                                 badges.bossReady === 'beta'  ? 'β BETA READY'  :
                                 'γ GAMMA READY'}
                            </div>
                        {/if}
                        {#each Object.entries(badges.roles) as [role, tier]}
                            <div class="pv-badge role">
                                {role === 'tank' ? '▣ TANK' :
                                 role === 'dps' ? '⚔ DPS' :
                                 role === 'bruiser' ? '⚒ BRUISER' :
                                 role === 'vanguard' ? '⤳ VANGUARD' :
                                 role === 'packmaster' ? '⚖ PACKMASTER' :
                                 role === 'endurance' ? '⟁ ENDURANCE' :
                                 role.toUpperCase()} · {tier?.toUpperCase()}
                            </div>
                        {/each}
                        {#if badges.underdog}
                            <div class="pv-badge {badges.underdog}">
                                ⬡ {badges.underdog.toUpperCase()} UNDERDOG
                            </div>
                        {/if}
                        {#if !badges.bloodline && !badges.bossReady && Object.keys(badges.roles).length === 0 && !badges.underdog}
                            <div class="pv-badges-empty">No badges yet — keep breeding.</div>
                        {/if}
                    </div>
                    {#if tradeBump()}
                        <div class="pv-value-bump" id="pvValue"><span class="x">✦</span>{tradeBump()}</div>
                    {/if}
                </div>
            </div>
        </div>

    </div>

</div>

<style>
:root {
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

    --tier-bronze:      #cd7f32;
    --tier-silver:      #c8c8d2;
    --tier-gold:        #ffd700;
    --tier-diamond:     #00b4ff;

    --tek-font:         'Inter', system-ui, sans-serif;
    --tek-display:      'Orbitron', 'Inter', system-ui, sans-serif;
    --tek-mono:         'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    --tek-serif:        'Crimson Pro', Georgia, serif;
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
        radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,180,255,0.10) 0%, transparent 50%),
        radial-gradient(ellipse 55% 50% at 85% 90%, rgba(139,92,246,0.08) 0%, transparent 55%);
    pointer-events: none;
    z-index: 0;
}

.stage {
    position: relative; z-index: 2;
    min-height: 100vh;
    padding: 60px 24px 80px;
    max-width: 1320px;
    margin: 0 auto;
}

/* ═════════════════════════════════════════════════════════════════════════
   PAGE HEADER
   ═════════════════════════════════════════════════════════════════════════ */
/* page-header / page-title / page-sub / breadcrumb styles now live in static/tekos.css */

/* ═════════════════════════════════════════════════════════════════════════
   IMPORT MODE TABS
   ═════════════════════════════════════════════════════════════════════════ */
.mode-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 22px;
    border-bottom: 1px solid rgba(0,180,255,0.15);
}
.mode-tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 12px 18px;
    cursor: pointer;
    transition: all 0.15s;
    display: flex; align-items: center; gap: 8px;
}
.mode-tab:hover { color: var(--tek-text); }
.mode-tab.active {
    color: var(--tek-blue);
    border-bottom-color: var(--tek-blue);
    text-shadow: 0 0 8px var(--tek-blue-glow);
}
.mode-tab .mt-icon {
    width: 14px; height: 14px;
    opacity: 0.7;
}
.mode-tab.active .mt-icon { opacity: 1; }

/* ═════════════════════════════════════════════════════════════════════════
   TWO-COLUMN LAYOUT — FORM + LIVE PREVIEW
   ═════════════════════════════════════════════════════════════════════════ */
.builder-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 24px;
    align-items: start;
}
@media (max-width: 1000px) {
    .builder-shell { grid-template-columns: 1fr; }
}

/* Form column */
.form-col { min-width: 0; }
.form-section {
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(12px 0%, 100% 0%, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0% 100%, 0% 12px);
    padding: 20px 24px 22px;
    margin-bottom: 14px;
    position: relative;
    backdrop-filter: blur(8px);
}
.form-section::before {
    content: '';
    position: absolute;
    left: 0; top: 12px; bottom: 0;
    width: 2px;
    background: linear-gradient(180deg, var(--tek-blue), var(--tek-purple));
    box-shadow: 0 0 8px var(--tek-blue-glow);
}
.form-section.optional::before {
    background: linear-gradient(180deg, var(--tek-purple), rgba(139,92,246,0.3));
}
.form-section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.form-section-title {
    font-family: var(--tek-display);
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--tek-text);
    display: flex; align-items: center; gap: 8px;
}
.form-section-title::before {
    content: '▸';
    color: var(--tek-blue);
}
.form-section.optional .form-section-title::before { color: var(--tek-purple); }
.optional-tag {
    font-family: var(--tek-mono);
    font-size: 0.60rem;
    letter-spacing: 0.18em;
    color: var(--tek-purple);
    border: 1px solid rgba(139,92,246,0.40);
    padding: 2px 7px;
    text-transform: uppercase;
}

/* Advanced collapse — Stat Genealogy + Availability + Color regions */
.advanced-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    background: transparent;
    border: none;
    padding: 6px 0;
    cursor: pointer;
    text-align: left;
    font-family: var(--tek-mono);
    color: var(--tek-text);
    transition: color 0.15s;
}
.advanced-toggle:hover { color: var(--tek-blue); }
.advanced-toggle .adv-caret {
    color: var(--tek-purple);
    font-size: 0.9rem;
    width: 12px;
}
.advanced-toggle .adv-label {
    font-size: 0.82rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
}
.advanced-toggle .adv-sub {
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    color: var(--tek-text-faint);
    text-transform: none;
}
.advanced-body {
    margin-top: 14px;
    padding: 16px;
    background: rgba(139,92,246,0.04);
    border: 1px dashed rgba(139,92,246,0.22);
    display: flex;
    flex-direction: column;
    gap: 22px;
}
.advanced-sub-section { display: flex; flex-direction: column; gap: 10px; }
.advanced-sub-title {
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--tek-purple);
    font-weight: 700;
}
.form-section-hint {
    font-family: var(--tek-mono);
    font-size: 0.70rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.06em;
    margin-bottom: 12px;
    line-height: 1.5;
}

/* Form rows / fields */
.field-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 12px;
}
.field-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
}
.field-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.field-label .req { color: var(--tek-amber); margin-left: 3px; }
.field-input,
.field-select {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    padding: 9px 12px;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.15s;
    width: 100%;
    min-width: 0;
}
.field-input::placeholder { color: var(--tek-text-faint); }
.field-input:focus,
.field-select:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue), 0 0 10px rgba(0,180,255,0.20);
    background: rgba(5,8,18,0.85);
}
.field-select {
    appearance: none;
    -webkit-appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-blue) 50%), linear-gradient(135deg, var(--tek-blue) 50%, transparent 50%);
    background-position: calc(100% - 16px) 50%, calc(100% - 11px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
    padding-right: 30px;
}
.gender-toggle {
    display: flex;
    gap: 2px;
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    padding: 2px;
}
.gender-opt {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.12em;
    padding: 7px 0;
    cursor: pointer;
    text-transform: uppercase;
    transition: all 0.15s;
}
.gender-opt.active {
    background: rgba(0,180,255,0.15);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}

/* ═════════════════════════════════════════════════════════════════════════
   STATS GRID — Base + Mutations
   ═════════════════════════════════════════════════════════════════════════ */
.stats-grid {
    display: grid;
    grid-template-columns: 70px 1fr 1fr 60px;
    gap: 8px 14px;
    align-items: center;
}
.ocr-edit-grid {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 6px 12px;
    align-items: center;
}
.ocr-edit-input {
    background: rgba(0, 180, 255, 0.06);
    border: 1px solid rgba(0, 180, 255, 0.22);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.9rem;
    padding: 6px 10px;
    outline: none;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: border-color 0.18s, background 0.18s;
    width: 100%;
}
.ocr-edit-input:focus {
    background: rgba(0, 180, 255, 0.12);
    border-color: rgba(0, 180, 255, 0.55);
}
.ocr-edit-input[type=number] {
    font-weight: 700;
    color: var(--tek-blue);
}

/* ── Screenshot reader: supported / not-supported lists ─────────────────── */
.shot-sources {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 520px;
    margin: 12px auto 6px;
    text-align: left;
}
@media (max-width: 540px) {
    .shot-sources { grid-template-columns: 1fr; gap: 12px; }
}
.ss-col {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.ss-head {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    margin-bottom: 4px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ss-head.ok { color: var(--tek-green); }
.ss-head.no { color: var(--tek-red, #ef4444); }
.ss-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    padding: 2px 0;
}
.ss-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px; height: 18px;
    font-weight: 800;
    font-size: 0.78rem;
    clip-path: polygon(3px 0%, 100% 0%, calc(100% - 3px) 100%, 0% 100%);
}
.ss-mark.ok {
    background: rgba(34, 197, 94, 0.12);
    color: var(--tek-green);
    border: 1px solid rgba(34, 197, 94, 0.45);
}
.ss-mark.no {
    background: rgba(239, 68, 68, 0.10);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.40);
}

/* ── Screenshot reader: cropper on top (full-width), review below ──────── */
.shot-flow {
    display: flex;
    flex-direction: column;
    gap: 24px;
    text-align: left;
}
.shot-pane {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
}
/* The review pane, once populated, uses a 2-col internal layout so the
   editable inputs spread across the full available width without forcing
   single-column scroll on wide screens. */
.shot-pane.review {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
    align-items: start;
}
.shot-pane.review > .shot-step-label,
.shot-pane.review > .shot-source-banner,
.shot-pane.review > .form-error,
.shot-pane.review > .shot-hint {
    grid-column: 1 / -1;
}
.shot-pane.review > .ocr-edit-grid {
    grid-column: 1 / 2;
}
.shot-pane.review > .shot-apply-btn {
    grid-column: 1 / -1;
}
.shot-pane.review > .shot-preview-stack {
    grid-column: 2 / 3;
}
@media (max-width: 900px) {
    .shot-pane.review { grid-template-columns: 1fr; }
    .shot-pane.review > .ocr-edit-grid,
    .shot-pane.review > .shot-preview-stack { grid-column: 1 / -1; }
}
.shot-step-label {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--tek-blue);
    text-shadow: 0 0 6px rgba(0, 180, 255, 0.30);
    margin-bottom: 2px;
}
.shot-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}
.ghost-btn {
    background: rgba(0, 180, 255, 0.06);
    border: 1px solid rgba(0, 180, 255, 0.22);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    padding: 5px 10px;
    cursor: pointer;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    transition: background 0.15s, color 0.15s, border-color 0.15s;
    text-transform: uppercase;
}
.ghost-btn:hover {
    background: rgba(0, 180, 255, 0.14);
    color: var(--tek-text);
    border-color: rgba(0, 180, 255, 0.50);
}
/* ═════ Cropper (DOM-based) ═════════════════════════════════════════ */
.shot-top-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
}
.zoom-bar {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    padding-left: 8px;
    border-left: 1px solid rgba(0, 180, 255, 0.20);
}
.zoom-val {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-text-dim);
    min-width: 44px;
    text-align: center;
    letter-spacing: 0.04em;
}
.cropper-scroll {
    position: relative;
    width: 100%;
    max-height: 72vh;
    overflow: auto;
    background: #02060e;
    border: 1px solid rgba(0, 180, 255, 0.22);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    /* Own pinch/scroll-with-ctrl gestures */
    touch-action: pan-x pan-y;
    /* Slight inner padding so the crop handles at image edges aren't cut off */
    padding: 14px;
    box-sizing: border-box;
}
.cropper-stage {
    position: relative;
    user-select: none;
    -webkit-user-select: none;
}
.cropper-img {
    display: block;
    /* Width/height set INLINE via style="" to match the stage exactly —
       relying on width:100% was producing layout glitches where the image
       and the stage drifted out of sync. */
    pointer-events: none;     /* clicks go to overlays/handles below */
    user-select: none;
    -webkit-user-drag: none;
    /* Crisp pixel scaling when zoomed past 100% so the user can see exactly
       which pixels they're cropping. Browsers normally smear at high zoom. */
    image-rendering: pixelated;
}
.cmask {
    position: absolute;
    background: rgba(2, 6, 16, 0.72);
    pointer-events: none;
}
.crop-box {
    position: absolute;
    border: 2px solid #00b4ff;
    box-sizing: border-box;
    cursor: move;
    touch-action: none;
    /* Subtle inner glow so the box reads on any image */
    box-shadow:
        inset 0 0 0 1px rgba(2, 6, 16, 0.6),
        0 0 0 1px rgba(0, 180, 255, 0.35);
}
.rule {
    position: absolute;
    background: rgba(0, 180, 255, 0.22);
    pointer-events: none;
}
.rule.v { width: 1px; top: 0; bottom: 0; }
.rule.h { height: 1px; left: 0; right: 0; }

/* Edge handles span the entire edge, sitting half outside the box so they're
   easy to grab even when the crop is right against the image edge. */
.edge {
    position: absolute;
    touch-action: none;
}
.edge-t { top: -10px;    left: 16px;  right: 16px; height: 20px; cursor: ns-resize; }
.edge-b { bottom: -10px; left: 16px;  right: 16px; height: 20px; cursor: ns-resize; }
.edge-l { left: -10px;   top: 16px;   bottom: 16px; width: 20px; cursor: ew-resize; }
.edge-r { right: -10px;  top: 16px;   bottom: 16px; width: 20px; cursor: ew-resize; }

/* Visible cyan corner handles. Big enough to be unmissable, with a chunky
   dark outline so they stand out on any image. The hit area extends slightly
   past the visible square via offset positioning. */
.corner {
    position: absolute;
    width: 24px;
    height: 24px;
    background: #00d4ff;
    border: 3px solid #02060e;
    box-sizing: border-box;
    touch-action: none;
    box-shadow:
        0 0 0 1px rgba(0, 180, 255, 0.7),
        0 0 10px rgba(0, 180, 255, 0.60);
    z-index: 2;
    transition: background 0.12s, transform 0.12s;
}
.corner-tl { top: -12px;    left: -12px;   cursor: nwse-resize; }
.corner-tr { top: -12px;    right: -12px;  cursor: nesw-resize; }
.corner-bl { bottom: -12px; left: -12px;   cursor: nesw-resize; }
.corner-br { bottom: -12px; right: -12px;  cursor: nwse-resize; }
.corner:hover {
    background: #66e8ff;
    transform: scale(1.15);
}
.shot-hint {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-faint);
    line-height: 1.5;
    letter-spacing: 0.04em;
}
.shot-run-btn { margin-top: 4px; }
.shot-run-btn.closeup {
    background: transparent;
    border: 1px solid var(--tek-blue);
    color: var(--tek-blue);
}
.shot-run-btn.closeup:hover:not(:disabled) {
    background: rgba(56, 189, 248, 0.12);
}

.shot-source-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 8px;
    font-family: var(--tek-mono);
    font-size: 0.72rem;
    background: rgba(34, 197, 94, 0.08);
    border: 1px solid rgba(34, 197, 94, 0.30);
    border-left-width: 3px;
    color: var(--tek-text);
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.shot-source-banner strong { color: var(--tek-green); }

.shot-details-summary {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-faint);
    cursor: pointer;
    text-transform: uppercase;
}
.shot-details-summary:hover { color: var(--tek-text-dim); }
.shot-raw-text {
    margin-top: 6px;
    padding: 10px;
    background: rgba(0,0,0,0.4);
    font-size: 0.7rem;
    max-height: 200px;
    overflow: auto;
    white-space: pre-wrap;
    color: var(--tek-text-dim);
    border: 1px solid rgba(255,255,255,0.04);
}
.stats-head {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.stats-head.r { text-align: center; }
.stats-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text);
    text-transform: uppercase;
    padding: 4px 0;
}
.stats-input-row {
    display: contents;
}
.stats-input {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.92rem;
    padding: 7px 10px;
    text-align: right;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    width: 100%;
    transition: all 0.15s;
    min-width: 0;
}
.stats-input:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue);
    background: rgba(5,8,18,0.85);
}
.stats-input.mut.has-val {
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
    border-color: rgba(0,180,255,0.40);
}
.stats-total {
    font-family: var(--tek-mono);
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--tek-blue);
    text-align: right;
    padding: 4px 8px 4px 0;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.stats-total .arrow {
    color: var(--tek-text-faint);
    font-weight: 400;
    margin-right: 4px;
}
.stats-help {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    color: var(--tek-text-dim);
    letter-spacing: 0.08em;
    margin-top: 10px;
    padding: 8px 12px;
    background: rgba(139,92,246,0.05);
    border-left: 2px solid rgba(139,92,246,0.40);
    line-height: 1.5;
}
/* ═════════════════════════════════════════════════════════════════════════
   LINEAGE — Parent pickers
   ═════════════════════════════════════════════════════════════════════════ */
.lineage-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
@media (max-width: 700px) {
    .lineage-grid { grid-template-columns: 1fr; }
}
.parent-picker {
    background: rgba(5,8,18,0.5);
    border: 1px solid rgba(100,116,139,0.20);
    clip-path: polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px);
    padding: 12px 14px;
}
.parent-picker-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}
.parent-icon {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.parent-icon.mother { color: var(--tek-pink); }
.parent-icon.father { color: var(--tek-blue); }
.parent-input {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.84rem;
    padding: 8px 12px;
    width: 100%;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
.parent-input::placeholder { color: var(--tek-text-faint); }
.parent-input:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue);
}
.parent-selected {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(0,180,255,0.06);
    border: 1px solid var(--tek-blue-border);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
}
/* ═════════════════════════════════════════════════════════════════════════
   STAT GENEALOGY — Founder per stat
   ═════════════════════════════════════════════════════════════════════════ */
.genealogy-grid {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 6px 14px;
    align-items: center;
}
.gen-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.gen-select {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    padding: 7px 30px 7px 12px;
    width: 100%;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    appearance: none;
    -webkit-appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, var(--tek-purple) 50%), linear-gradient(135deg, var(--tek-purple) 50%, transparent 50%);
    background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
    background-size: 5px 5px;
    background-repeat: no-repeat;
}
.gen-select:focus { outline: none; border-color: var(--tek-purple); }
.gen-select option { background: var(--tek-bg); color: var(--tek-text); }
.founder-toggle-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 14px;
    padding: 10px 14px;
    background: rgba(139,92,246,0.05);
    border: 1px solid rgba(139,92,246,0.25);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}
.toggle {
    position: relative;
    width: 38px; height: 20px;
    background: rgba(15,23,42,0.9);
    border: 1px solid rgba(100,116,139,0.30);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}
.toggle::after {
    content: '';
    position: absolute;
    top: 2px; left: 2px;
    width: 14px; height: 14px;
    background: var(--tek-text-dim);
    border-radius: 50%;
    transition: all 0.2s;
}
.toggle.on {
    background: rgba(139,92,246,0.25);
    border-color: var(--tek-purple);
}
.toggle.on::after {
    transform: translateX(18px);
    background: var(--tek-purple);
    box-shadow: 0 0 5px rgba(139,92,246,0.5);
}
.founder-toggle-label {
    flex: 1;
    font-size: 0.86rem;
}
.founder-toggle-label .t {
    color: var(--tek-text);
    font-weight: 600;
    display: block;
    margin-bottom: 2px;
}
.founder-toggle-label .d {
    color: var(--tek-text-dim);
    font-size: 0.74rem;
    line-height: 1.4;
}

/* Notes textarea */
.notes-area {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-font);
    font-size: 0.86rem;
    padding: 10px 14px;
    width: 100%;
    min-height: 80px;
    resize: vertical;
    clip-path: polygon(6px 0%, 100% 0%, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0% 100%, 0% 6px);
    line-height: 1.5;
}
.notes-area:focus {
    outline: none;
    border-color: var(--tek-blue);
    box-shadow: 0 0 0 1px var(--tek-blue);
}

.form-error {
    margin: 10px 0;
    padding: 10px 14px;
    background: rgba(239,68,68,0.08);
    border-left: 2px solid var(--tek-red);
    color: var(--tek-red);
    font-family: var(--tek-mono);
    font-size: 0.78rem;
}

/* ═════════════════════════════════════════════════════════════════════════
   ACTION BAR (bottom of form)
   ═════════════════════════════════════════════════════════════════════════ */
.action-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px;
    background: linear-gradient(160deg, rgba(10,18,44,0.85) 0%, rgba(4,8,20,0.96) 100%);
    border: 1px solid rgba(0,180,255,0.18);
    clip-path: polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px);
}
.action-bar .spacer { flex: 1; }
.btn {
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    color: var(--tek-blue);
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 10px 16px;
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
    box-shadow: none;
}
.btn.solid {
    background: linear-gradient(90deg, var(--tek-blue), var(--tek-purple));
    color: #050812;
    border: none;
    font-weight: 700;
    padding: 11px 22px;
}
.btn.solid:hover {
    box-shadow: 0 0 16px rgba(0,180,255,0.45);
}

/* ═════════════════════════════════════════════════════════════════════════
   LIVE PREVIEW CARD (right column, sticky)
   ═════════════════════════════════════════════════════════════════════════ */
.preview-col {
    position: sticky;
    top: 24px;
}
.preview-header {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 8px;
    padding-left: 4px;
    display: flex; align-items: center; gap: 6px;
}
.preview-header .live-pip {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--tek-green);
    box-shadow: 0 0 5px rgba(16,185,129,0.6);
    animation: livePulse 1.6s ease-in-out infinite;
}
@keyframes livePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
}

.preview-card {
    position: relative;
    background: linear-gradient(160deg, rgba(10,18,44,0.95) 0%, rgba(4,8,20,0.99) 100%);
    border: 1px solid var(--tek-blue-border);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 18px 20px 16px;
    overflow: hidden;
    backdrop-filter: blur(8px);
    box-shadow: 0 0 32px rgba(0,180,255,0.10);
}
.preview-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
        repeating-linear-gradient(60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px),
        repeating-linear-gradient(-60deg, rgba(0,180,255,0.04) 0 1px, transparent 1px 20px);
    pointer-events: none;
    opacity: 0.6;
}
.preview-card > * { position: relative; z-index: 1; }

.pv-species {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.20em;
    color: var(--tek-blue);
    text-transform: uppercase;
    margin-bottom: 4px;
}
.pv-name {
    font-family: var(--tek-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    line-height: 1.1;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 8px rgba(0,180,255,0.30));
    text-transform: uppercase;
    margin-bottom: 8px;
    word-break: break-word;
    min-height: 1.4rem;
}
.pv-name.placeholder {
    color: var(--tek-text-faint);
    -webkit-text-fill-color: var(--tek-text-faint);
    font-style: italic;
    filter: none;
    background: none;
}
.pv-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.10em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0,180,255,0.10);
}
.pv-meta .item { display: flex; align-items: center; gap: 4px; }
.pv-meta .item .v { color: var(--tek-text); }
.pv-meta .gender.m { color: var(--tek-blue); }
.pv-meta .gender.f { color: var(--tek-pink); }

/* Stat rows in preview */
.pv-stats {
    display: flex;
    flex-direction: column;
    margin-bottom: 14px;
}
.pv-stats-head {
    display: grid;
    grid-template-columns: 55px 1fr 1fr;
    gap: 10px;
    font-family: var(--tek-mono);
    font-size: 0.56rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    padding-bottom: 5px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(0,180,255,0.06);
}
.pv-stats-head .r { text-align: right; }
.pv-stat-row {
    display: grid;
    grid-template-columns: 55px 1fr 1fr;
    gap: 10px;
    padding: 4px 0;
    align-items: baseline;
    border-bottom: 1px dashed rgba(100,116,139,0.10);
}
.pv-stat-row:last-child { border-bottom: none; }
.pv-stat-label {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.pv-stat-base {
    font-family: var(--tek-mono);
    font-size: 0.9rem;
    color: var(--tek-text);
    text-align: right;
}
.pv-stat-mut {
    font-family: var(--tek-mono);
    font-size: 0.86rem;
    text-align: right;
    color: var(--tek-text-faint);
}
.pv-stat-mut.has-mut {
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
    font-weight: 700;
}

/* Computed-badges block under stats */
.pv-badges-block {
    padding-top: 12px;
    border-top: 1px solid rgba(0,180,255,0.10);
}
.pv-badges-label {
    font-family: var(--tek-mono);
    font-size: 0.58rem;
    letter-spacing: 0.20em;
    color: var(--tek-text-faint);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.pv-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.pv-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 8px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
}
.pv-badge.bronze  { background: rgba(205,127,50,0.10);  color: var(--tier-bronze); border: 1px solid rgba(205,127,50,0.40); }
.pv-badge.silver  { background: rgba(200,200,210,0.10); color: var(--tier-silver); border: 1px solid rgba(200,200,210,0.40); }
.pv-badge.gold    { background: rgba(255,215,0,0.10);   color: var(--tier-gold);   border: 1px solid rgba(255,215,0,0.40); }
.pv-badge.diamond { background: rgba(0,180,255,0.12);   color: var(--tier-diamond);border: 1px solid var(--tek-blue);   box-shadow: 0 0 8px rgba(0,180,255,0.30); }
.pv-badge.gamma   { background: rgba(16,185,129,0.10);  color: var(--tek-green);   border: 1px solid rgba(16,185,129,0.40); }
.pv-badge.beta    { background: rgba(0,180,255,0.10);   color: var(--tek-blue);    border: 1px solid var(--tek-blue-border); }
.pv-badge.alpha   { background: rgba(244,114,182,0.10); color: var(--tek-pink);    border: 1px solid rgba(244,114,182,0.40); }
.pv-badge.titan   { background: rgba(0,180,255,0.15);   color: var(--tier-diamond);border: 1px solid var(--tek-blue);    box-shadow: 0 0 6px var(--tek-blue-glow); }
.pv-badge.role    { background: rgba(139,92,246,0.10);  color: var(--tek-purple);  border: 1px solid rgba(139,92,246,0.40); }
.pv-badges-empty {
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    color: var(--tek-text-faint);
    font-style: italic;
    letter-spacing: 0.05em;
}

/* Trade-value bump */
.pv-value-bump {
    margin-top: 10px;
    font-family: var(--tek-mono);
    font-size: 0.7rem;
    letter-spacing: 0.10em;
    color: var(--tek-amber);
    text-transform: uppercase;
}
.pv-value-bump .x { color: var(--tek-text-faint); margin-right: 4px; }

/* Reset card while empty */
.pv-empty-message {
    padding: 20px 0 4px;
    font-family: var(--tek-serif);
    font-style: italic;
    color: var(--tek-text-faint);
    font-size: 0.9rem;
    text-align: center;
    line-height: 1.5;
}

/* Drop zone (import mode) */
.dropzone {
    background: linear-gradient(160deg, rgba(10,18,44,0.6) 0%, rgba(4,8,20,0.88) 100%);
    border: 2px dashed rgba(0,180,255,0.35);
    clip-path: polygon(14px 0%, 100% 0%, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0% 100%, 0% 14px);
    padding: 42px 30px;
    text-align: center;
    transition: all 0.2s;
    cursor: pointer;
    display: none;
}
.dropzone.visible { display: block; }
.dropzone:hover {
    border-color: var(--tek-blue);
    background: linear-gradient(160deg, rgba(10,18,44,0.7) 0%, rgba(4,8,20,0.95) 100%);
}
.dropzone-icon {
    width: 56px; height: 56px;
    margin: 0 auto 14px;
    border: 2px solid var(--tek-blue-border);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: var(--tek-blue);
    font-size: 1.6rem;
}
.dropzone-title {
    font-family: var(--tek-display);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--tek-text);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.dropzone-desc {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    color: var(--tek-text-dim);
    line-height: 1.5;
    max-width: 460px;
    margin: 0 auto 16px;
}
.dropzone-coming-soon {
    margin-top: 14px;
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    color: var(--tek-amber);
    text-transform: uppercase;
    padding: 5px 10px;
    border: 1px solid rgba(245,158,11,0.40);
    background: rgba(245,158,11,0.08);
    display: inline-block;
}

/* Hide manual form when in import modes */
.manual-area { display: block; }
.manual-area.hidden { display: none; }
</style>
