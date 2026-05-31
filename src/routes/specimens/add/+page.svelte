<script lang="ts">
    import { onMount } from 'svelte';
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
    //  SCREENSHOT OCR — Tek Binoculars, u+Binoculars, Super Spyglass
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Flow: drop image → (auto-detect panel OR full-image) crop box → user
    // adjusts crop → preprocess (cut → upscale → blur → Otsu threshold) →
    // Tesseract.js → fingerprint detection → positional parser → review grid.
    //
    // Two source UIs supported:
    //
    //   Tek Binoculars / u+Binoculars (single column)
    //     Row format: "current / max  (base | mut | dom)"   ←  parens + pipes
    //     Top-to-bottom: HP, STA, OXY, FOOD, WGT, MEL, CRA
    //
    //   Super Spyglass (2-column grid)
    //     Row format: "base/mut/dom"                         ← slashes, no parens
    //     Left/right column pairs, OCR reads row-by-row:
    //       HP|WGT · STA|MEL · OXY|SPD(skip) · FOOD|CRA · Imp|Total · ♀|♂
    //
    // Cryopods (vanilla or modded) are not a usable source — they don't surface
    // base wild levels — the dropzone copy says so explicitly.

    type ShotSource = 'tek' | 'spyglass';
    type CropBox = { x: number; y: number; w: number; h: number };

    let shotFile     = $state<File | null>(null);
    let shotImage    = $state<HTMLImageElement | null>(null);
    let shotProcUrl  = $state<string | null>(null);
    let shotRunning  = $state(false);
    let shotProgress = $state(0);
    let shotPhase    = $state<'idle' | 'preprocessing' | 'recognizing'>('idle');
    let shotRawText  = $state('');
    let shotParsed   = $state<Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number }>({});
    let shotError    = $state('');
    let shotSource   = $state<ShotSource | null>(null);
    let shotAutoDetected = $state(false);

    // Cropper — coords held in IMAGE space so they survive canvas resize.
    let cropBox      = $state<CropBox | null>(null);
    let cropCanvasEl = $state<HTMLCanvasElement | null>(null);
    let cropPointerMode = 'idle' as
        | 'idle' | 'move'
        | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
        | 'resize-t'  | 'resize-b'  | 'resize-l'  | 'resize-r';
    let cropPointerStart = { x: 0, y: 0 };
    let cropBoxStart: CropBox = { x: 0, y: 0, w: 0, h: 0 };
    // Pinch-to-zoom (touch): two-finger gesture scales cropBox around the pinch midpoint
    let pinchPrevDist = 0;
    let pinchPrevMid  = { x: 0, y: 0 };
    const activePointers = new Map<number, { x: number; y: number }>();

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
        if (shotProcUrl) { URL.revokeObjectURL(shotProcUrl); shotProcUrl = null; }

        const url = URL.createObjectURL(f);
        try {
            const img = await new Promise<HTMLImageElement>((res, rej) => {
                const i = new Image();
                i.onload  = () => res(i);
                i.onerror = () => rej(new Error('Failed to load image'));
                i.src = url;
            });
            shotImage = img;
            const detected = autoDetectPanel(img);
            if (detected) {
                cropBox = detected;
                shotAutoDetected = true;
            } else {
                cropBox = { x: 0, y: 0, w: img.width, h: img.height };
                shotAutoDetected = false;
            }
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Auto-locate the stat panel via the teal/blue UI background signature.
     *
     * Both Tek/u+ and Super Spyglass paint their panel on a dark teal-blue
     * background. We downsample the image to 256px wide, mask pixels that fall
     * in that color signature, find the largest connected region, and return
     * its bounding box (padded slightly) in source-image coords.
     *
     * Returns null when the signature region is < 5% of the image (panel
     * couldn't be confidently located — fall back to full-image bounds).
     */
    function autoDetectPanel(img: HTMLImageElement): CropBox | null {
        const W = 256;
        const H = Math.max(1, Math.round((img.height / img.width) * W));
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        // Panel signature: hue 175–235, sat 0.08–0.65, value 0.04–0.34.
        // Loose enough to tolerate phone-photo white-balance shift.
        const mask = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) {
            const r = data[i*4] / 255;
            const g = data[i*4+1] / 255;
            const b = data[i*4+2] / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const delta = max - min;
            const v = max;
            const s = max === 0 ? 0 : delta / max;
            let h: number;
            if (delta === 0) h = 0;
            else if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
            h *= 60; if (h < 0) h += 360;
            if (h >= 175 && h <= 235 && s >= 0.08 && s <= 0.65 && v >= 0.04 && v <= 0.34) {
                mask[i] = 1;
            }
        }

        // Largest connected component via iterative BFS.
        const visited = new Uint8Array(W * H);
        let bestBox: { x: number; y: number; w: number; h: number; area: number } | null = null;
        for (let seed = 0; seed < W * H; seed++) {
            if (!mask[seed] || visited[seed]) continue;
            const queue: number[] = [seed];
            let minX = W, minY = H, maxX = 0, maxY = 0, area = 0;
            while (queue.length) {
                const idx = queue.pop()!;
                if (visited[idx] || !mask[idx]) continue;
                visited[idx] = 1;
                const x = idx % W, y = (idx - x) / W;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                area++;
                if (x > 0)     queue.push(idx - 1);
                if (x < W - 1) queue.push(idx + 1);
                if (y > 0)     queue.push(idx - W);
                if (y < H - 1) queue.push(idx + W);
            }
            if (!bestBox || area > bestBox.area) {
                bestBox = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area };
            }
        }
        // Require the panel to occupy ≥ 5% of the image, otherwise our match is
        // probably a tiny UI sliver / noise, not the real panel.
        if (!bestBox || bestBox.area < W * H * 0.05) return null;

        // Pad by 4% so we don't shave the panel's border or external icons.
        const padX = Math.round(W * 0.04);
        const padY = Math.round(H * 0.04);
        const x = Math.max(0, bestBox.x - padX);
        const y = Math.max(0, bestBox.y - padY);
        const w = Math.min(W - x, bestBox.w + padX * 2);
        const h = Math.min(H - y, bestBox.h + padY * 2);
        const sx = img.width / W;
        const sy = img.height / H;
        return {
            x: Math.round(x * sx),
            y: Math.round(y * sy),
            w: Math.round(w * sx),
            h: Math.round(h * sy)
        };
    }

    // ── Cropper rendering ────────────────────────────────────────────────
    function drawCropper() {
        if (!shotImage || !cropCanvasEl || !cropBox) return;
        const ctx = cropCanvasEl.getContext('2d');
        if (!ctx) return;
        // Fit canvas to its CSS width, but cap the display height at 70vh so
        // tall portrait phone photos don't blow past the viewport. When the
        // aspect ratio pushes us past the ceiling we shrink the displayed
        // width to maintain it — preserves image aspect, keeps cropper usable.
        const dpr  = window.devicePixelRatio || 1;
        const containerW = cropCanvasEl.clientWidth || 600;
        const aspect = shotImage.width / shotImage.height;
        const maxDisplayH = Math.max(420, window.innerHeight * 0.70);
        let displayW = containerW;
        let displayH = displayW / aspect;
        if (displayH > maxDisplayH) {
            displayH = maxDisplayH;
            displayW = displayH * aspect;
        }
        const pixW = Math.round(displayW * dpr);
        const pixH = Math.round(displayH * dpr);
        if (cropCanvasEl.width !== pixW || cropCanvasEl.height !== pixH) {
            cropCanvasEl.width = pixW;
            cropCanvasEl.height = pixH;
            cropCanvasEl.style.width  = `${displayW}px`;
            cropCanvasEl.style.height = `${displayH}px`;
        }
        const scale = pixW / shotImage.width;
        ctx.drawImage(shotImage, 0, 0, pixW, pixH);

        const bx = cropBox.x * scale;
        const by = cropBox.y * scale;
        const bw = cropBox.w * scale;
        const bh = cropBox.h * scale;

        // Dim everything outside the crop
        ctx.fillStyle = 'rgba(2, 6, 16, 0.72)';
        ctx.fillRect(0, 0, pixW, by);
        ctx.fillRect(0, by + bh, pixW, pixH - (by + bh));
        ctx.fillRect(0, by, bx, bh);
        ctx.fillRect(bx + bw, by, pixW - (bx + bw), bh);

        // Crop border
        ctx.strokeStyle = '#00b4ff';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(bx, by, bw, bh);

        // Rule-of-thirds guides (subtle)
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.18)';
        ctx.lineWidth = 1 * dpr;
        for (let i = 1; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + (bw * i) / 3, by);
            ctx.lineTo(bx + (bw * i) / 3, by + bh);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx, by + (bh * i) / 3);
            ctx.lineTo(bx + bw, by + (bh * i) / 3);
            ctx.stroke();
        }

        // Handles
        const hs = 12 * dpr;
        const half = hs / 2;
        ctx.fillStyle = '#00b4ff';
        for (const h of cropHandlePositions(bx, by, bw, bh, half)) {
            ctx.fillRect(h.x, h.y, hs, hs);
        }
    }

    function cropHandlePositions(bx: number, by: number, bw: number, bh: number, half: number) {
        return [
            { id: 'resize-tl' as const, x: bx - half,         y: by - half },
            { id: 'resize-tr' as const, x: bx + bw - half,    y: by - half },
            { id: 'resize-bl' as const, x: bx - half,         y: by + bh - half },
            { id: 'resize-br' as const, x: bx + bw - half,    y: by + bh - half },
            { id: 'resize-t'  as const, x: bx + bw / 2 - half, y: by - half },
            { id: 'resize-b'  as const, x: bx + bw / 2 - half, y: by + bh - half },
            { id: 'resize-l'  as const, x: bx - half,         y: by + bh / 2 - half },
            { id: 'resize-r'  as const, x: bx + bw - half,    y: by + bh / 2 - half }
        ];
    }

    // Redraw whenever the image or crop box changes
    $effect(() => {
        if (shotImage && cropCanvasEl && cropBox) drawCropper();
    });

    function getPointerCoords(e: PointerEvent): { x: number; y: number } {
        if (!cropCanvasEl) return { x: 0, y: 0 };
        const r = cropCanvasEl.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (cropCanvasEl.width / r.width),
            y: (e.clientY - r.top)  * (cropCanvasEl.height / r.height)
        };
    }

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

    function onCropPointerDown(e: PointerEvent) {
        if (!shotImage || !cropBox || !cropCanvasEl) return;
        cropCanvasEl.setPointerCapture(e.pointerId);
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Two-finger gesture → enter pinch-zoom mode
        if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            pinchPrevDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            pinchPrevMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            cropPointerMode = 'idle';
            return;
        }

        const pt = getPointerCoords(e);
        const dpr = window.devicePixelRatio || 1;
        const scale = (cropCanvasEl.width || 1) / shotImage.width;
        const bx = cropBox.x * scale, by = cropBox.y * scale;
        const bw = cropBox.w * scale, bh = cropBox.h * scale;

        // Bigger hit area than visual (touch-friendly)
        const hitSize = Math.max(20, 18 * dpr);
        const half = hitSize / 2;
        for (const h of cropHandlePositions(bx, by, bw, bh, half)) {
            if (pt.x >= h.x && pt.x <= h.x + hitSize && pt.y >= h.y && pt.y <= h.y + hitSize) {
                cropPointerMode = h.id;
                cropPointerStart = pt;
                cropBoxStart = { ...cropBox };
                return;
            }
        }
        if (pt.x >= bx && pt.x <= bx + bw && pt.y >= by && pt.y <= by + bh) {
            cropPointerMode = 'move';
            cropPointerStart = pt;
            cropBoxStart = { ...cropBox };
            return;
        }

        // Click outside → start a fresh box at this point (drag-to-define)
        const imgX = pt.x / scale;
        const imgY = pt.y / scale;
        cropBox = clampBox({ x: imgX, y: imgY, w: 16, h: 16 });
        cropPointerMode = 'resize-br';
        cropPointerStart = pt;
        cropBoxStart = { ...cropBox };
    }

    function onCropPointerMove(e: PointerEvent) {
        if (!shotImage || !cropBox || !cropCanvasEl) return;
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        // Pinch-zoom while two fingers down
        if (activePointers.size === 2) {
            const pts = [...activePointers.values()];
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            if (pinchPrevDist > 0) {
                const factor = dist / pinchPrevDist;
                // Pinch midpoint in IMAGE coords
                const r = cropCanvasEl.getBoundingClientRect();
                const midCanvasX = (pinchPrevMid.x - r.left) * (cropCanvasEl.width  / r.width);
                const midCanvasY = (pinchPrevMid.y - r.top)  * (cropCanvasEl.height / r.height);
                const scale = (cropCanvasEl.width || 1) / shotImage.width;
                const midImgX = midCanvasX / scale;
                const midImgY = midCanvasY / scale;
                const nw = cropBox.w / factor;
                const nh = cropBox.h / factor;
                const nx = midImgX - (midImgX - cropBox.x) / factor;
                const ny = midImgY - (midImgY - cropBox.y) / factor;
                cropBox = clampBox({ x: nx, y: ny, w: nw, h: nh });
            }
            pinchPrevDist = dist;
            pinchPrevMid  = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
            return;
        }

        if (cropPointerMode === 'idle') return;
        const pt = getPointerCoords(e);
        const scale = (cropCanvasEl.width || 1) / shotImage.width;
        const dx = (pt.x - cropPointerStart.x) / scale;
        const dy = (pt.y - cropPointerStart.y) / scale;
        const s = cropBoxStart;
        let { x, y, w, h } = s;

        if (cropPointerMode === 'move') {
            x = s.x + dx; y = s.y + dy;
        } else {
            if (cropPointerMode.includes('l')) { x = s.x + dx; w = s.w - dx; }
            if (cropPointerMode.includes('r')) { w = s.w + dx; }
            if (cropPointerMode.includes('t')) { y = s.y + dy; h = s.h - dy; }
            if (cropPointerMode.includes('b')) { h = s.h + dy; }
            // If we drag past the opposing edge, the box would invert — clamp.
            if (w < 16) { if (cropPointerMode.includes('l')) x = s.x + s.w - 16; w = 16; }
            if (h < 16) { if (cropPointerMode.includes('t')) y = s.y + s.h - 16; h = 16; }
        }
        cropBox = clampBox({ x, y, w, h });
    }

    function onCropPointerUp(e: PointerEvent) {
        if (cropCanvasEl?.hasPointerCapture(e.pointerId)) {
            cropCanvasEl.releasePointerCapture(e.pointerId);
        }
        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) pinchPrevDist = 0;
        if (activePointers.size === 0) cropPointerMode = 'idle';
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
            cropBox = d;
            shotAutoDetected = true;
        }
    }

    /**
     * Cut the cropped region out of the source image, upscale it, blur slightly
     * to thicken thin font strokes (slashes / pipes / 1s), then threshold to
     * pure black-on-white via Otsu's method (adaptive — copes with phone-photo
     * lighting variance that breaks a fixed cutoff).
     */
    async function preprocessShot(): Promise<Blob> {
        if (!shotImage || !cropBox) throw new Error('No image cropped');

        // Cut the cropped region
        const cut = document.createElement('canvas');
        cut.width = Math.max(1, Math.round(cropBox.w));
        cut.height = Math.max(1, Math.round(cropBox.h));
        const cutCtx = cut.getContext('2d');
        if (!cutCtx) throw new Error('Canvas 2D unavailable');
        cutCtx.drawImage(
            shotImage,
            cropBox.x, cropBox.y, cropBox.w, cropBox.h,
            0, 0, cut.width, cut.height
        );

        // Upscale to ≥ 1800px on the long edge
        const targetMin = 1800;
        const longest = Math.max(cut.width, cut.height);
        const scale = Math.max(1, targetMin / longest);
        const w = Math.round(cut.width * scale);
        const h = Math.round(cut.height * scale);
        const out = document.createElement('canvas');
        out.width = w; out.height = h;
        const ctx = out.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.filter = 'blur(0.8px)';
        ctx.drawImage(cut, 0, 0, w, h);
        ctx.filter = 'none';

        // Adaptive threshold (Otsu) → pure black on white
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        const threshold = otsuThreshold(d);
        for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
            const v = lum > threshold ? 0 : 255;
            d[i] = v; d[i+1] = v; d[i+2] = v;
        }
        ctx.putImageData(id, 0, 0);
        return await new Promise<Blob>((resolve, reject) => {
            out.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
        });
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

    async function runOcr() {
        if (!shotImage || !cropBox) { shotError = 'Drop a screenshot first.'; return; }
        shotRunning = true; shotError = ''; shotProgress = 0; shotPhase = 'preprocessing';
        if (shotProcUrl) { URL.revokeObjectURL(shotProcUrl); shotProcUrl = null; }
        try {
            const preprocessed = await preprocessShot();
            shotProcUrl = URL.createObjectURL(preprocessed);

            shotPhase = 'recognizing';
            const Tesseract = await import('tesseract.js');
            const worker = await Tesseract.createWorker('eng', 1, {
                workerPath: '/tesseract/worker.min.js',
                corePath:   '/tesseract',
                langPath:   '/tesseract',
                workerBlobURL: false,
                logger: (m: { status: string; progress: number }) => {
                    if (m.status === 'recognizing text') shotProgress = Math.round(m.progress * 100);
                }
            });
            await worker.setParameters({ tessedit_pageseg_mode: '6' as never });
            const { data: ocr } = await worker.recognize(preprocessed);
            await worker.terminate();

            shotRawText = ocr.text;
            parseStatPanel(ocr.text);
        } catch (err) {
            shotError = (err as Error).message || 'OCR failed';
        } finally {
            shotRunning = false;
            shotPhase = 'idle';
        }
    }

    /**
     * Route to the right parser by fingerprinting the OCR text:
     *   - Tek/u+ → contains "(NN | NN | NN)" parenthesized triples
     *   - Spyglass → any line has TWO "NN/NN/NN" slash triples (2-col grid)
     * Both match → user cropped over both panels → reject with message.
     * Neither matches → unsupported source → reject with message.
     */
    function parseStatPanel(raw: string) {
        const parenTriple = /\(\s*\d{1,3}\s*[|Il1\]\[]\s*\d{1,3}\s*[|Il1\]\[]\s*\d{1,3}\s*\)/;
        const hasTek = parenTriple.test(raw);

        const slashTriple = /\d{1,3}\s*\/\s*\d{1,3}\s*\/\s*\d{1,3}/g;
        let hasSpyglass = false;
        for (const line of raw.split(/\r?\n/)) {
            const matches = line.match(slashTriple) ?? [];
            if (matches.length >= 2) { hasSpyglass = true; break; }
        }

        if (hasTek && hasSpyglass) {
            shotError = 'Your crop includes two stat panels. Re-crop to just one (Tek/u+ OR Super Spyglass) and run OCR again.';
            shotParsed = {};
            shotSource = null;
            return;
        }
        if (!hasTek && !hasSpyglass) {
            shotError = 'Couldn\'t find base stats in this image. Make sure you cropped to a Tek Binoculars, u+Binoculars, or Super Spyglass panel.';
            shotParsed = {};
            shotSource = null;
            return;
        }
        if (hasTek) {
            shotSource = 'tek';
            parseTekUplus(raw);
        } else {
            shotSource = 'spyglass';
            parseSuperSpyglass(raw);
        }
    }

    /**
     * Tek Binoculars / u+Binoculars — one stat per row.
     * Row format: "<icon> current / max (base | mut | dom)"
     * Top-to-bottom order: HP, STA, OXY, FOOD, WGT, MEL, CRA
     */
    function parseTekUplus(raw: string) {
        const out: Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number } = {};
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        extractNameAndLevel(lines, out);

        const bases: number[] = [];
        for (const line of lines) {
            // Permissive on pipe-vs-1-vs-I confusion that Tesseract loves to make
            const m = line.match(/\(\s*(\d{1,3})\s*[|Il1\]\[]\s*(\d{1,3})\s*[|Il1\]\[]\s*(\d{1,3})\s*\)/);
            if (m) bases.push(parseInt(m[1], 10));
        }

        const order: StatKey[] = ['HP', 'STA', 'OXY', 'FOOD', 'WGT', 'MEL', 'CRA'];
        for (let i = 0; i < Math.min(bases.length, order.length); i++) {
            if (bases[i] >= 0 && bases[i] <= 999) out[order[i]] = bases[i];
        }
        shotParsed = out;
    }

    /**
     * Super Spyglass — 2-column grid, OCR reads row-by-row.
     * Document order of base-triples: HP, WGT, STA, MEL, OXY, SPD(skip), FOOD, CRA
     */
    function parseSuperSpyglass(raw: string) {
        const out: Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number } = {};
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        extractNameAndLevel(lines, out);

        const bases: number[] = [];
        // Skip lines that are obviously top-panel current/max bars (single decimal,
        // "K"-suffixed totals, color region rows of plain 2-digit numbers).
        // Those don't contain slash triples so the regex naturally skips them, but
        // we add a guard so a noisy bar line can't smuggle in a fake triple.
        const colorRegionLine = /^[\d\s]{4,}$/;
        const slashAllowed    = /\d\s*\/\s*\d/;

        for (const line of lines) {
            if (!slashAllowed.test(line)) continue;
            if (colorRegionLine.test(line)) continue;
            // Skip "current / max" style HP bar lines (only ONE slash, big numbers,
            // typical 4-5 digits each side)
            const slashCount = (line.match(/\//g) ?? []).length;
            if (slashCount === 1 && /\d{3,}/.test(line)) continue;

            for (const m of line.matchAll(/(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})/g)) {
                bases.push(parseInt(m[1], 10));
            }
        }

        // Mapping with SPD skip at position 5
        const order: (StatKey | null)[] = ['HP', 'WGT', 'STA', 'MEL', 'OXY', null, 'FOOD', 'CRA'];
        for (let i = 0; i < Math.min(bases.length, order.length); i++) {
            const k = order[i];
            if (k && bases[i] >= 0 && bases[i] <= 999) out[k] = bases[i];
        }
        shotParsed = out;
    }

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
        // Pattern B (Super Spyglass): name on line N, "Level: 243" on line N+1
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

            <!-- Screenshot OCR — Tek Binoculars / u+Binoculars / Super Spyglass -->
            <div class="dropzone" class:visible={mode === 'screenshot'} id="dropzoneShot" style={mode === 'screenshot' ? 'min-height:auto; padding:24px' : ''}>
                {#if !shotFile}
                    <div class="dropzone-icon">⊡</div>
                    <div class="dropzone-title">Import stats from a screenshot</div>
                    <div class="shot-sources">
                        <div class="ss-col">
                            <div class="ss-head ok">Supported</div>
                            <div class="ss-row"><span class="ss-mark ok">✓</span> Tek Binoculars</div>
                            <div class="ss-row"><span class="ss-mark ok">✓</span> u+Binoculars</div>
                            <div class="ss-row"><span class="ss-mark ok">✓</span> Super Spyglass</div>
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
                        <!-- ░░░ LEFT: cropper ░░░ -->
                        <div class="shot-pane">
                            <div class="shot-step-label">Step 1 · Crop to the stat panel</div>
                            <div class="shot-actions">
                                <button type="button" class="ghost-btn" onclick={reAutoDetect} title="Re-snap the box to the detected panel">⊕ Auto-detect</button>
                                <button type="button" class="ghost-btn" onclick={resetCrop}>↺ Reset</button>
                                <label class="ghost-btn" style="cursor:pointer">
                                    ↻ Replace
                                    <input type="file" accept="image/*" onchange={pickScreenshot} style="display:none" />
                                </label>
                            </div>
                            <div class="cropper-wrap">
                                <canvas
                                    bind:this={cropCanvasEl}
                                    class="cropper-canvas"
                                    onpointerdown={onCropPointerDown}
                                    onpointermove={onCropPointerMove}
                                    onpointerup={onCropPointerUp}
                                    onpointercancel={onCropPointerUp}
                                    onpointerleave={onCropPointerUp}
                                ></canvas>
                            </div>
                            <div class="shot-hint">
                                {#if shotAutoDetected}
                                    ⊕ Auto-snapped to the detected panel. Drag corners or center to adjust.
                                {:else}
                                    Drag corners to resize, drag the box to move. Pinch on touch to zoom.
                                {/if}
                            </div>
                            <button class="btn shot-run-btn" disabled={shotRunning} onclick={runOcr}>
                                {#if shotRunning && shotPhase === 'preprocessing'}Preparing image…
                                {:else if shotRunning}Reading text… {shotProgress}%
                                {:else}Step 2 · Run OCR ➜{/if}
                            </button>
                        </div>

                        <!-- ░░░ BELOW: review ░░░ -->
                        <div class="shot-pane review">
                            <div class="shot-step-label">Step 3 · Review &amp; correct</div>

                            {#if shotError}
                                <div class="form-error">{shotError}</div>
                            {/if}

                            {#if !shotRawText && !shotRunning && !shotError}
                                <div class="shot-hint">
                                    Click <strong>Run OCR</strong> when you're happy with the crop.
                                </div>
                            {/if}

                            {#if Object.keys(shotParsed).length > 0 && shotSource}
                                <div class="shot-source-banner">
                                    <span class="ss-mark ok">✓</span>
                                    Detected as <strong>{shotSource === 'spyglass' ? 'Super Spyglass' : 'Tek Binoculars / u+Binoculars'}</strong>
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
                                <div class="shot-preview-stack">
                                    {#if shotProcUrl}
                                        <details open>
                                            <summary class="shot-details-summary">Preprocessed image (what Tesseract sees)</summary>
                                            <img src={shotProcUrl} alt="Preprocessed" style="width:100%; max-height:280px; object-fit:contain; margin-top:6px; border:1px solid rgba(245,158,11,0.30); background:#fff" />
                                        </details>
                                    {/if}
                                    {#if shotRawText}
                                        <details style="margin-top:10px">
                                            <summary class="shot-details-summary">Raw OCR text</summary>
                                            <pre class="shot-raw-text">{shotRawText}</pre>
                                        </details>
                                    {/if}
                                </div>
                                <button class="btn shot-apply-btn" onclick={applyOcrToForm}>
                                    ✓ Apply to form
                                </button>
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
.cropper-wrap {
    position: relative;
    width: 100%;
    background: #02060e;
    border: 1px solid rgba(0, 180, 255, 0.22);
    clip-path: polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
    overflow: hidden;
    /* Disable browser default touch gestures so we own pinch/drag */
    touch-action: none;
}
.cropper-canvas {
    display: block;
    width: 100%;
    height: auto;
    cursor: crosshair;
    user-select: none;
    -webkit-user-select: none;
}
.shot-hint {
    font-family: var(--tek-mono);
    font-size: 0.68rem;
    color: var(--tek-text-faint);
    line-height: 1.5;
    letter-spacing: 0.04em;
}
.shot-run-btn { margin-top: 4px; }

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
