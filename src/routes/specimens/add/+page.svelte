<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { computeBadges } from '$lib/badges';
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

    // ── Screenshot OCR state ───────────────────────────────────────────────
    let shotFile     = $state<File | null>(null);
    let shotPreview  = $state<string | null>(null);
    let shotProcUrl  = $state<string | null>(null);
    let shotRunning  = $state(false);
    let shotProgress = $state(0);
    let shotPhase    = $state<'idle' | 'preprocessing' | 'recognizing'>('idle');
    let shotRawText  = $state('');
    let shotParsed   = $state<Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number }>({});
    let shotError    = $state('');

    function pickScreenshot(e: Event) {
        const inp = e.target as HTMLInputElement;
        const f = inp.files?.[0];
        if (!f) return;
        shotFile = f;
        shotError = '';
        shotRawText = '';
        shotParsed = {};
        const reader = new FileReader();
        reader.onload = () => { shotPreview = String(reader.result); };
        reader.readAsDataURL(f);
    }

    // Preprocess: upscale → slight blur (thickens thin lines like the / between values
    // in stat triples so they survive thresholding) → high-contrast threshold to
    // black-on-white. ARK UI is light-cyan-on-dark-blue at native res, which Tesseract
    // reads very poorly; this pipeline makes it readable.
    async function preprocessShot(file: File): Promise<Blob> {
        const url = URL.createObjectURL(file);
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = () => reject(new Error('Failed to load image'));
                i.src = url;
            });
            // Scale so the longest dimension is at least 1800px
            const targetMin = 1800;
            const longest = Math.max(img.width, img.height);
            const scale = Math.max(1, targetMin / longest);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas 2D unavailable');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Small blur thickens 1-pixel diagonal strokes (slashes) so they don't
            // disappear in the threshold step. 0.8px is enough to preserve "/", "1",
            // and small punctuation without losing character separation.
            ctx.filter = 'blur(0.8px)';
            ctx.drawImage(img, 0, 0, w, h);
            ctx.filter = 'none';

            // Threshold: light pixels (UI text) → black; dark pixels (background) → white.
            // Threshold raised slightly (140 from 130) to leave a wider tolerance after
            // the blur step lightens edge pixels.
            const id = ctx.getImageData(0, 0, w, h);
            const d = id.data;
            const TH = 120;
            for (let i = 0; i < d.length; i += 4) {
                const lum = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
                const v = lum > TH ? 0 : 255;
                d[i] = v; d[i+1] = v; d[i+2] = v;
                // keep alpha
            }
            ctx.putImageData(id, 0, 0);
            return await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
            });
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    async function runOcr() {
        if (!shotFile) { shotError = 'Drop a screenshot first.'; return; }
        shotRunning = true; shotError = ''; shotProgress = 0; shotPhase = 'preprocessing';
        if (shotProcUrl) URL.revokeObjectURL(shotProcUrl);
        try {
            const preprocessed = await preprocessShot(shotFile);
            shotProcUrl = URL.createObjectURL(preprocessed);

            shotPhase = 'recognizing';
            const Tesseract = await import('tesseract.js');
            // All Tesseract assets are served from /static/tesseract so the strict CSP
            // doesn't need to allow third-party CDNs.
            const worker = await Tesseract.createWorker('eng', 1, {
                workerPath: '/tesseract/worker.min.js',
                corePath:   '/tesseract',
                langPath:   '/tesseract',
                workerBlobURL: false,
                logger: (m: { status: string; progress: number }) => {
                    if (m.status === 'recognizing text') shotProgress = Math.round(m.progress * 100);
                }
            });
            // PSM 6 = "single uniform block of text" — best fit for the panel layout.
            await worker.setParameters({ tessedit_pageseg_mode: '6' as never });
            const { data: ocr } = await worker.recognize(preprocessed);
            await worker.terminate();

            shotRawText = ocr.text;
            parseTekBinocularsText(ocr.text);
        } catch (err) {
            shotError = (err as Error).message || 'OCR failed';
        } finally {
            shotRunning = false;
            shotPhase = 'idle';
        }
    }

    function parseTekBinocularsText(raw: string) {
        // Two source UIs are supported, auto-detected from text markers:
        //
        // 1) Tek Binoculars wild-scan view — "Lvl 239" / "Tamed" / "Wild"; stats are a
        //    single column of "(base | mut | dom)" triples.
        //
        // 2) Creature Inventory view (press F on a tame) — "Tribe:" / "Level: N" / "Can
        //    Mate"; stats are a 2-column grid of "base/mut/dom" triples laid out as:
        //         HP  / WGT
        //         STA / MEL
        //         OXY / SPD (skip — Movement Speed is never wild-levelable on tames)
        //         FOOD/ CRA
        //         IMP%/ TotalLvl
        //         ♀mut/ ♂mut
        //
        // Auto-detect — markers OR layout fingerprint.
        // Markers (clean OCR): "Tribe:", "Can Mate", "Level:"
        // Layout fingerprint (mangled OCR): the Inventory grid puts TWO triples on one
        // visible line; the Binoculars view never does.
        function hasMultiTriplePerLine(text: string): boolean {
            for (const line of text.split(/\r?\n/)) {
                const tripleCount = (line.match(/\d{1,3}\s*[\/|]\s*\d{1,3}\s*[\/|]\s*\d{1,3}/g) ?? []).length;
                if (tripleCount >= 2) return true;
            }
            return false;
        }
        const isInventory = /\b(?:Tribe\s*:|Can\s*Mate|Level\s*:)/i.test(raw)
                          || hasMultiTriplePerLine(raw);
        if (isInventory) {
            parseInventoryUI(raw);
            return;
        }
        // Otherwise fall through to the binoculars parser below.
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const out: Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number } = {};

        // ── Header parsing: first 3 lines ──
        for (const line of lines.slice(0, 3)) {
            // Level: "Lvl 239", "Lv 239", "Level 239"
            const lvMatch = line.match(/\b(?:lv|lvl|level)\s*[:\-]?\s*(\d{1,4})\b/i);
            if (lvMatch && !out.level) out.level = Math.min(9999, parseInt(lvMatch[1]));

            // Species / specimen name: capitalized word(s) before "Lv" or hyphen
            if (!out.species) {
                const headerMatch = line.match(/^([A-Z][A-Za-z][A-Za-z\s'-]+?)(?:\s*[-–—]|\s+Lv|\s+Lvl|\s+Level)/i);
                if (headerMatch) {
                    const cand = headerMatch[1].trim();
                    if (cand.length > 2 && !/^(?:Tamed|Wild|Sleeping|Awake|Sleeping|Aggressive|Passive)$/i.test(cand)) {
                        out.species = cand;
                    }
                }
            }
        }

        // ── Extract every triple in document order. The ASA Tek Binoculars layout puts
        // exactly one stat triple per visible row. OCR variants we have to handle:
        //   (43 | 0 | 0)     — clean
        //   (45]0]0)         — pipes misread as ] or [
        //   (45 1 0 1 0)     — pipes misread as 1 (collide with neighbors)
        //   (451010)         — spaces lost + pipes→1, three values run together
        //   ...4310]0)       — opening paren dropped, mangled
        //   (X|X|0)          — placeholder row (skip)
        //
        // Strategy: scan line-by-line. For each line that contains a closing `)` somewhere
        // after a number+separator pattern, try to extract three numbers via a series of
        // increasingly forgiving regex patterns. Skip rows where any token is X/x.
        const triples: Array<{ base: number | null }> = [];

        for (const line of lines) {
            // Skip lines without any digits in parens-ish neighborhood
            if (!/\)/.test(line) && !/\d/.test(line)) continue;
            // X-placeholder check: if the line has an X near the closing paren, treat as null
            if (/[Xx]\s*[|I1l\]\/]\s*[Xx]/.test(line) || /\([^)]*[Xx][^)]*\)/.test(line)) {
                triples.push({ base: null });
                continue;
            }

            // Try clean (a | b | c) with flexible separators including ]
            let m = line.match(/\(\s*(\d{1,4})\s*[|I1l\]\[\/\\:]\s*(\d{1,4})\s*[|I1l\]\[\/\\:]\s*(\d{1,4})\s*\)/);
            if (m) { triples.push({ base: parseInt(m[1]) }); continue; }

            // Try opening-paren-dropped: number+separator+number+separator+number ending in )
            m = line.match(/(\d{1,3})\s*[|I1l\]\[\/\\:]\s*(\d{1,3})\s*[|I1l\]\[\/\\:]\s*(\d{1,3})\s*\)/);
            if (m) { triples.push({ base: parseInt(m[1]) }); continue; }

            // Try parens with all digits run together (`(451010)` was originally `(45|0|0)`).
            // Pipes were dropped AND read as 1s combining with adjacent 0s → "451010".
            // Pattern guess: base (1-3 digits) + "10" + "10" or similar artifacts.
            m = line.match(/\((\d{1,3})(?:10|0)(?:10|0)\)/);
            if (m) { triples.push({ base: parseInt(m[1]) }); continue; }

            // Last-ditch: ANY parenthesized group with at least one number, take first number
            m = line.match(/\(([^)]*\d[^)]*)\)/);
            if (m) {
                const nm = m[1].match(/\d+/);
                triples.push({ base: nm ? parseInt(nm[0]) : null });
                continue;
            }
        }

        const bases = triples.map(t => t.base);
        const setStat = (k: StatKey, v: number | null) => { if (typeof v === 'number' && v >= 0) out[k] = v; };

        // Positional mapping based on triple count.
        //   8 triples: HP, STA, FOOD, WGT, OXY, Speed-skip, MEL, CRA
        //   7 triples: HP, STA, FOOD, WGT, OXY, Speed-skip, MEL
        //   6 triples: ambiguous — either OXY present + no Speed, or Speed present + OXY=N/A
        //              Disambiguate via "N/A" substring check in OCR.
        //   5 triples: HP, STA, FOOD, WGT, MEL (no OXY, no Speed)
        const n = bases.length;
        if (n >= 4) {
            setStat('HP',   bases[0]);
            setStat('STA',  bases[1]);
            setStat('FOOD', bases[2]);
            setStat('WGT',  bases[3]);
        }
        if (n === 5) {
            setStat('MEL', bases[4]);
        } else if (n === 6) {
            const oxyIsNA = /\bn\s*\/\s*a\b/i.test(raw);
            if (oxyIsNA) {
                // bases[4] is Speed (skip), bases[5] is MEL
                setStat('MEL', bases[5]);
            } else {
                setStat('OXY', bases[4]);
                setStat('MEL', bases[5]);
            }
        } else if (n === 7) {
            setStat('OXY', bases[4]);
            // bases[5] = Speed → skip
            setStat('MEL', bases[6]);
        } else if (n >= 8) {
            setStat('OXY', bases[4]);
            // bases[5] = Speed → skip
            setStat('MEL', bases[6]);
            setStat('CRA', bases[7]);
        }

        shotParsed = out;
    }

    function parseInventoryUI(raw: string) {
        // Creature Inventory layout — 8-stat grid in document order (PSM 6 reads rows
        // left-to-right):  HP WGT  STA MEL  OXY SPD  FOOD CRA
        // SPD is at position 5 and always 0/0/0 (Movement Speed never wild-levels on
        // tames); we skip it.
        //
        // OCR of ARK's UI font frequently confuses digits with letters that have
        // similar glyphs (5↔s, 7↔r, 0↔o, 1↔i, 8↔B). It also drops the thin "/"
        // separator. The parser below applies aggressive letter→digit substitution
        // before extracting base values from each row.
        const out: Partial<Record<StatKey, number>> & { name?: string; species?: string; level?: number } = {};
        const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        // ── Header parsing FIRST on the raw text (substitution would mangle "Level") ──
        for (let i = 0; i < lines.length; i++) {
            const lvMatch = lines[i].match(/\blevel\s*:?\s*(\d{1,4})/i);
            if (lvMatch) {
                if (!out.level) out.level = Math.min(9999, parseInt(lvMatch[1]));
                if (!out.name && i > 0) {
                    const cand = lines[i - 1].trim();
                    if (cand && cand.length >= 1 && !/^(?:tribe|level|tamed|wild|can\s*mate)/i.test(cand)) {
                        out.name = cand.replace(/[^\w\s'\-]/g, '').trim();
                    }
                }
                break;
            }
        }

        // ── Letter→digit substitution for stat-value tokens only ──
        // (Header was already parsed; from here we treat the rest as numeric.)
        function letterToDigit(s: string): string {
            return s
                .replace(/[oOQD]/g, '0')
                .replace(/[iIlL!|]/g, '1')
                .replace(/[zZ]/g, '2')
                .replace(/[sS]/g, '5')
                .replace(/[bG]/g, '6')
                .replace(/[rRtT]/g, '7')  // ARK font's 7 has a serif that reads as r/t
                .replace(/[B&]/g, '8')
                .replace(/[gq]/g, '9');
        }

        // Base wild levels in ASA can't realistically exceed ~99. If we extract a 3-digit
        // base, the leading digit is almost always an OCR artifact (e.g. "s77" was "57"
        // with an extra noise pixel) — cap by taking the first 2 digits.
        function cap99(s: string): number {
            return s.length >= 3 ? parseInt(s.slice(0, 2)) : parseInt(s);
        }

        function extractBase(tok: string): number | null {
            // Clean triple first (in case some OCRs are clean)
            const clean = tok.match(/^(\d{1,3})\/(\d{1,3})\/(\d{1,3})$/);
            if (clean) return cap99(clean[1]);

            // Apply substitutions and strip everything except digits and /
            const norm = letterToDigit(tok).replace(/[^\d\/]/g, '');
            if (!norm) return null;

            // Try clean triple again after substitution
            const cleanNorm = norm.match(/^(\d{1,3})\/(\d{1,3})\/(\d{1,3})$/);
            if (cleanNorm) return cap99(cleanNorm[1]);

            // Partial slash survived ("28/070" pattern — first slash kept, rest merged)
            const partial = norm.match(/^(\d{1,3})\//);
            if (partial) return cap99(partial[1]);

            // No slashes at all — split a digit blob into a probable base.
            const digits = norm.replace(/\//g, '');
            const len = digits.length;
            // Reject single-digit residues — these are usually fragments of a
            // partially-recognized icon (e.g. "RN" reduces to "7"), not real stats.
            if (len < 2) return null;
            if (len === 2) return parseInt(digits);
            if (len === 3) {
                // If it starts with 0, the whole thing is probably "0/X/0" → base is 0
                if (digits[0] === '0') return 0;
                // Otherwise "AB0" → base AB, or "A00" → base A.
                return parseInt(digits.slice(0, 2));
            }
            if (len === 4) {
                // Most common: base is first 2 digits ("57/0/0" → "5700" → 57)
                return parseInt(digits.slice(0, 2));
            }
            if (len >= 5 && len <= 6) {
                return parseInt(digits.slice(0, 2));
            }
            return null;
        }

        // ── Identify stat-row lines and pull two values per row ──
        // The Creature-Inventory stat grid in the OCR output is bracketed by:
        //   TOP   — header (Level: N), HP/Stam bar values, tribe name, color regions
        //   GRID  — 4 rows × 2 stat triples each, each row punctuated by icon chars
        //           that Tesseract renders as §, ®, ¥, &, +, * etc.
        //   BOTTOM — Imprint%, Total Lvl, mutation counts ♀ ♂
        // Strategy: skip lines until we hit one that looks like a grid row (≥2 icon
        // chars OR contains the / separator and an icon char), then extract bases
        // until we either hit a "%" line (imprint) or have collected 8 bases.
        const bases: number[] = [];
        const headerPat = /level\s*:?|tribe\s*:?|can\s*mate|tamed|wild/i;
        // Post-grid signal: imprint shows as "100%" (digit + %). The Stamina icon
        // (lightning bolt) often OCRs to a bare "%" at line start — don't break on
        // that. Require a digit immediately preceding the % to identify imprint.
        const postGridPat = /\d\s*%|\blvl\b|\bmutation/i;
        const iconPat = /[§®¥&+*#@]/;

        let inStatGrid = false;
        for (const line of lines) {
            if (headerPat.test(line)) continue;
            if (inStatGrid && postGridPat.test(line)) break;

            // Pure-numeric / punctuation-only lines (HP-bar values, color regions)
            if (/^[\s\d:.,\-—|]+$/.test(line)) continue;

            // Enter the stat grid: a line with ≥2 slashes (one or more clean triples)
            // OR ≥2 icon chars (icon-prefixed stat row with mangled slashes).
            // Single icon + single slash matches the stat-bar line at the top, so we
            // require 2 of one kind, not a mix.
            if (!inStatGrid) {
                const iconCount  = (line.match(/[§®¥&+*#@]/g) ?? []).length;
                const slashCount = (line.match(/\//g) ?? []).length;
                if (slashCount >= 2 || iconCount >= 2) {
                    inStatGrid = true;
                } else {
                    continue;
                }
            }

            // Tokenize and extract bases — cap at 2 per row since the Inventory grid
            // is fixed 2-stats-per-row. This prevents spurious mid-line fragments
            // (e.g. an icon misread between two real values) from sneaking in as a
            // third base and displacing the next row.
            const tokens = line.split(/[\s|§®¥&+*#@{}()_—:,»«\[\]]+/)
                .map(t => t.trim())
                .filter(t => t.length >= 2 && t.length <= 8);

            let basesThisRow = 0;
            for (const tok of tokens) {
                if (basesThisRow >= 2) break;
                if (!/[\d]/.test(tok) && !/[oOiIlLsSrRbBzZ]/.test(tok)) continue;
                const base = extractBase(tok);
                if (base !== null && base >= 0 && base <= 200) {
                    bases.push(base);
                    basesThisRow++;
                    if (bases.length >= 8) break;
                }
            }
            if (bases.length >= 8) break;
        }

        const setStat = (k: StatKey, v: number | undefined) => {
            if (typeof v === 'number' && v >= 0 && v <= 999) out[k] = v;
        };
        // Row-major mapping: HP WGT  STA MEL  OXY SPD  FOOD CRA
        if (bases.length >= 1) setStat('HP',   bases[0]);
        if (bases.length >= 2) setStat('WGT',  bases[1]);
        if (bases.length >= 3) setStat('STA',  bases[2]);
        if (bases.length >= 4) setStat('MEL',  bases[3]);
        if (bases.length >= 5) setStat('OXY',  bases[4]);
        // bases[5] = Movement Speed → always 0/0/0 on tames, skip
        if (bases.length >= 7) setStat('FOOD', bases[6]);
        if (bases.length >= 8) setStat('CRA',  bases[7]);

        shotParsed = out;
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

    let canvasEl: HTMLCanvasElement | null = $state(null);

    onMount(() => {
        // Species autocomplete from global DB
        // @ts-expect-error global from external script
        const db = window.EXPANDED_SPECIES_DATABASE;
        if (db) speciesList = Object.keys(db).sort();

        // Hex canvas background
        const canvas = canvasEl;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let w = 0, h = 0, hexes: { x: number; y: number; size: number }[] = [];
        let raf = 0;
        function resize() {
            w = canvas!.width = window.innerWidth;
            h = canvas!.height = window.innerHeight;
            hexes = [];
            const size = 36, hSpace = size * 1.5, vSpace = size * Math.sqrt(3);
            for (let y = -size; y < h + size; y += vSpace) {
                for (let x = -size; x < w + size; x += hSpace) {
                    const offsetY = (Math.floor(x / hSpace) % 2) * vSpace / 2;
                    hexes.push({ x, y: y + offsetY, size });
                }
            }
        }
        function draw() {
            ctx!.clearRect(0, 0, w, h);
            const t = Date.now() / 4000;
            hexes.forEach((hex, i) => {
                const phase = (Math.sin(t + i * 0.3) + 1) / 2;
                ctx!.strokeStyle = `rgba(0,180,255,${0.03 + phase * 0.04})`;
                ctx!.lineWidth = 1;
                ctx!.beginPath();
                for (let a = 0; a < 6; a++) {
                    const angle = (Math.PI / 3) * a;
                    const px = hex.x + hex.size * Math.cos(angle);
                    const py = hex.y + hex.size * Math.sin(angle);
                    if (a === 0) ctx!.moveTo(px, py); else ctx!.lineTo(px, py);
                }
                ctx!.closePath();
                ctx!.stroke();
            });
            raf = requestAnimationFrame(draw);
        }
        window.addEventListener('resize', resize);
        resize(); draw();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(raf);
        };
    });

    // ── Live preview derived ────────────────────────────────────────────────
    const badges = $derived(computeBadges(
        { Health: fStats.HP, Stamina: fStats.STA, Oxygen: fStats.OXY, Food: fStats.FOOD, Weight: fStats.WGT, Melee: fStats.MEL, Crafting: fStats.CRA },
        { Health: fMuts.HP, Stamina: fMuts.STA, Oxygen: fMuts.OXY, Food: fMuts.FOOD, Weight: fMuts.WGT, Melee: fMuts.MEL, Crafting: fMuts.CRA }
    ));

    function totalLevel(s: StatKey) {
        return (fStats[s] || 0) + (fMuts[s] || 0) * 2;
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
            statGenealogy: founderSources
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

<canvas id="tekHexCanvas" bind:this={canvasEl}></canvas>

<div class="stage">

    <!-- Header -->
    <div class="page-header">
        <div class="breadcrumb">
            <a href="/dossier">DASHBOARD</a><span class="sep">/</span><a href="/specimens">VAULT</a><span class="sep">/</span><span>ADD SPECIMEN</span>
        </div>
        <h1 class="page-title">Add Specimen</h1>
        <div class="page-sub">Record a new bloodline into your vault</div>
    </div>

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
                    We'll extract every tame from your save and stage them as Vault entries — stats only. Supports <code style="font-family:var(--tek-mono); color:var(--tek-blue);">.ark</code> files up to 200MB.
                </div>
                <button class="btn">CHOOSE FILE</button>
                <div class="dropzone-coming-soon">⏳ FEATURE COMING SOON</div>
            </div>

            <!-- Screenshot OCR dropzone — Tek Binoculars UI -->
            <div class="dropzone" class:visible={mode === 'screenshot'} id="dropzoneShot" style={mode === 'screenshot' ? 'min-height:auto; padding:24px' : ''}>
                {#if !shotPreview}
                    <div class="dropzone-icon">⊡</div>
                    <div class="dropzone-title">Screenshot the Tek Binoculars stat panel</div>
                    <div class="dropzone-desc">
                        Aim your <strong>Tek Binoculars</strong> at the tame and hold the zoom button until the stats panel appears, then take a screenshot.
                        TekOS reads the values via on-device OCR (no upload). You confirm before saving. Works best with the default ARK UI scale and no overlays.
                    </div>
                    <label class="btn" style="cursor:pointer; display:inline-block">
                        CHOOSE IMAGE
                        <input type="file" accept="image/*" onchange={pickScreenshot} style="display:none" />
                    </label>
                {:else}
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; text-align:left">
                        <div>
                            <div style="font-family:var(--tek-mono); font-size:0.62rem; letter-spacing:0.16em; color:var(--tek-text-faint); margin-bottom:6px; text-transform:uppercase">Original</div>
                            <img src={shotPreview} alt="Tek Binoculars screenshot" style="width:100%; max-height:280px; object-fit:contain; border:1px solid rgba(0,180,255,0.20); border-radius:4px; background:#000" />
                            {#if shotProcUrl}
                                <div style="font-family:var(--tek-mono); font-size:0.62rem; letter-spacing:0.16em; color:var(--tek-text-faint); margin:10px 0 6px; text-transform:uppercase">Preprocessed (what Tesseract sees)</div>
                                <img src={shotProcUrl} alt="Preprocessed" style="width:100%; max-height:280px; object-fit:contain; border:1px solid rgba(245,158,11,0.30); border-radius:4px; background:#fff" />
                            {/if}
                            <div style="display:flex; gap:8px; margin-top:10px">
                                <label class="btn" style="cursor:pointer; flex:1; text-align:center">
                                    REPLACE
                                    <input type="file" accept="image/*" onchange={pickScreenshot} style="display:none" />
                                </label>
                                <button class="btn" disabled={shotRunning} onclick={runOcr} style="flex:1">
                                    {#if shotRunning && shotPhase === 'preprocessing'}Preparing…{:else if shotRunning}Reading… {shotProgress}%{:else}Run OCR{/if}
                                </button>
                            </div>
                        </div>
                        <div>
                            <div class="form-section-title" style="margin-bottom:8px">Detected values</div>
                            {#if shotError}
                                <div class="form-error" style="margin-bottom:8px">{shotError}</div>
                            {/if}
                            {#if !shotRawText && !shotRunning}
                                <div class="form-section-hint">Click <strong>Run OCR</strong> to scan this image.</div>
                            {/if}
                            {#if shotParsed && Object.keys(shotParsed).length > 0}
                                <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap:6px; padding:0; background:transparent">
                                    {#if shotParsed.name}<div class="stats-stat-label">Name</div><div class="stats-total"><span class="t" style="font-size:0.8rem">{shotParsed.name}</span></div>{/if}
                                    {#if shotParsed.species}<div class="stats-stat-label">Species</div><div class="stats-total"><span class="t" style="font-size:0.8rem">{shotParsed.species}</span></div>{/if}
                                    {#if shotParsed.level}<div class="stats-stat-label">Level</div><div class="stats-total"><span class="t">{shotParsed.level}</span></div>{/if}
                                    {#each STATS as s}
                                        {#if shotParsed[s] !== undefined}
                                            <div class="stats-stat-label">{s}</div>
                                            <div class="stats-total"><span class="t">{shotParsed[s]}</span></div>
                                        {/if}
                                    {/each}
                                </div>
                                <button class="btn" onclick={applyOcrToForm} style="margin-top:12px; width:100%">
                                    ✓ Apply to form
                                </button>
                            {/if}
                            {#if shotRawText}
                                <details style="margin-top:14px" open>
                                    <summary style="font-family:var(--tek-mono); font-size:0.65rem; letter-spacing:0.16em; color:var(--tek-text-faint); cursor:pointer; text-transform:uppercase">Raw OCR text</summary>
                                    <pre style="margin-top:6px; padding:10px; background:rgba(0,0,0,0.4); font-size:0.7rem; max-height:200px; overflow:auto; white-space:pre-wrap; color:var(--tek-text-dim)">{shotRawText}</pre>
                                </details>
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
                        Enter base stat levels (at tame) and current mutation count per stat. Each mutation adds <code>+2 levels</code> to that stat — Total updates live.
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

                <!-- STAT GENEALOGY (optional) -->
                <div class="form-section optional">
                    <div class="form-section-head">
                        <div class="form-section-title">Stat Genealogy</div>
                        <div class="optional-tag">Optional</div>
                    </div>
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

                <!-- NOTES -->
                <div class="form-section optional">
                    <div class="form-section-head">
                        <div class="form-section-title">Notes</div>
                        <div class="optional-tag">Optional</div>
                    </div>
                    <textarea class="notes-area" bind:value={fNotes} placeholder="Color mutations, behavioral quirks, breeding plans, where you tamed them, who you bought from…"></textarea>
                </div>

                {#if error}
                    <div class="form-error">{error}</div>
                {/if}

                <!-- Action bar -->
                <div class="action-bar">
                    <a class="btn ghost" href="/specimens">Cancel</a>
                    <div class="spacer"></div>
                    <button class="btn" onclick={() => save(true)} disabled={saving}>Save & Add Another</button>
                    <button class="btn solid" onclick={() => save(false)} disabled={saving}>{saving ? 'SAVING…' : 'Save to Vault'}</button>
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
                        {#each badges.roles as role}
                            <div class="pv-badge role">
                                {role === 'tank' ? '▣ BOSS TANK' :
                                 role === 'dps' ? '⚔ BOSS DPS' :
                                 role === 'bruiser' ? '⚒ BOSS BRUISER' : '⤳ BOSS RUNNER'}
                            </div>
                        {/each}
                        {#if !badges.bloodline && !badges.bossReady && badges.roles.length === 0}
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
#tekHexCanvas { position: fixed; inset: 0; z-index: 1; pointer-events: none; }

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
.page-header { margin-bottom: 18px; }
.breadcrumb {
    font-family: var(--tek-mono);
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-bottom: 8px;
}
.breadcrumb a { color: var(--tek-text-dim); text-decoration: none; }
.breadcrumb a:hover { color: var(--tek-blue); }
.breadcrumb .sep { color: var(--tek-text-faint); margin: 0 6px; }
.page-title {
    font-family: var(--tek-display);
    font-size: clamp(1.7rem, 3.4vw, 2.3rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: linear-gradient(180deg, #ffffff 0%, #a5d8ff 70%, rgba(0,180,255,0.5) 100%);
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 0 10px rgba(0,180,255,0.30));
}
.page-sub {
    font-family: var(--tek-mono); font-size: 0.72rem;
    letter-spacing: 0.14em; color: var(--tek-text-dim);
    text-transform: uppercase;
    margin-top: 6px;
}

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
.mode-tab .soon {
    font-size: 0.56rem;
    color: var(--tek-amber);
    border: 1px solid rgba(245,158,11,0.40);
    padding: 1px 5px;
    letter-spacing: 0.16em;
    margin-left: 4px;
}

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
.stats-help code {
    color: var(--tek-blue);
    background: rgba(0,180,255,0.08);
    padding: 1px 5px;
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
.parent-selected .name { color: var(--tek-text); flex: 1; }
.parent-selected .species { color: var(--tek-text-dim); }
.parent-selected .x { color: var(--tek-text-faint); cursor: pointer; }
.parent-selected .x:hover { color: var(--tek-red); }

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
