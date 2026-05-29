<!--
  Shared availability + color-regions field set used by both
  /specimens/add and /specimens/[id]/edit. Keeps the two forms symmetric:
  any field added here automatically lands in both flows.
-->
<script lang="ts">
    type Props = {
        availableForBreeding: boolean;
        availableForTrade: boolean;
        colorRegions: string[];
        onChange?: () => void;
    };
    let {
        availableForBreeding = $bindable(false),
        availableForTrade = $bindable(false),
        colorRegions = $bindable<string[]>(['','','','','','']),
        onChange
    }: Props = $props();

    function fire() { onChange?.(); }

    // Defensive: callers may pass a shorter or missing array — pad to length 6 once.
    if (!Array.isArray(colorRegions)) colorRegions = ['','','','','',''];
    while (colorRegions.length < 6) colorRegions.push('');
</script>

<div class="cnf">
    <div class="cnf-field">
        <div class="cnf-label">Availability</div>
        <div class="cnf-toggles">
            <button class="cnf-toggle" class:on={availableForBreeding} type="button"
                    onclick={() => { availableForBreeding = !availableForBreeding; fire(); }}>
                <span class="check">{availableForBreeding ? '✓' : '○'}</span> Breeding
            </button>
            <button class="cnf-toggle" class:on={availableForTrade} type="button"
                    onclick={() => { availableForTrade = !availableForTrade; fire(); }}>
                <span class="check">{availableForTrade ? '✓' : '○'}</span> Trade
            </button>
        </div>
    </div>

    <div class="cnf-field">
        <div class="cnf-label">Color regions <span class="dim">— 6 regions per species</span></div>
        <div class="cnf-color-grid">
            {#each [0,1,2,3,4,5] as i}
                <div class="cnf-color-row">
                    <span class="cnf-color-num">R{i}</span>
                    <input class="cnf-color-input" type="text" placeholder="—"
                           bind:value={colorRegions[i]} oninput={fire} />
                </div>
            {/each}
        </div>
        <div class="cnf-hint">Use the color name shown in-game ("Magenta", "Lime", "Light Blue", etc.). Region map varies by species.</div>
    </div>
</div>

<style>
.cnf { display: flex; flex-direction: column; gap: 16px; }

.cnf-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cnf-label {
    font-family: var(--tek-mono);
    font-size: 0.62rem;
    letter-spacing: 0.18em;
    color: var(--tek-text-dim);
    text-transform: uppercase;
}
.cnf-label .dim { color: var(--tek-text-faint); letter-spacing: 0.06em; text-transform: none; }
.cnf-hint {
    font-family: var(--tek-mono);
    font-size: 0.64rem;
    color: var(--tek-text-faint);
    letter-spacing: 0.04em;
    margin-top: 4px;
    line-height: 1.45;
}

.cnf-toggles { display: flex; gap: 6px; }
.cnf-toggle {
    flex: 1;
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text-dim);
    font-family: var(--tek-mono);
    font-size: 0.74rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    padding: 10px 12px;
    cursor: pointer;
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    transition: all 0.15s;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
}
.cnf-toggle .check { font-size: 0.9em; opacity: 0.85; }
.cnf-toggle:hover { color: var(--tek-text); }
.cnf-toggle.on {
    background: rgba(0,180,255,0.12);
    border-color: var(--tek-blue);
    color: var(--tek-blue);
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.cnf-toggle.on .check { opacity: 1; }

.cnf-color-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}
@media (max-width: 540px) { .cnf-color-grid { grid-template-columns: 1fr; } }

.cnf-color-row {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 8px;
    align-items: center;
}
.cnf-color-num {
    font-family: var(--tek-mono);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.10em;
    color: var(--tek-blue);
    text-align: center;
    padding: 10px 0;
    background: rgba(0,180,255,0.08);
    border: 1px solid var(--tek-blue-border);
    clip-path: polygon(5px 0%, 100% 0%, calc(100% - 5px) 100%, 0% 100%);
    text-transform: uppercase;
    text-shadow: 0 0 6px var(--tek-blue-glow);
}
.cnf-color-input {
    background: rgba(5,8,18,0.65);
    border: 1px solid rgba(100,116,139,0.25);
    color: var(--tek-text);
    font-family: var(--tek-font);
    font-size: 0.88rem;
    padding: 10px 12px;
    clip-path: polygon(4px 0%, 100% 0%, calc(100% - 4px) 100%, 0% 100%);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
}
.cnf-color-input:focus { border-color: var(--tek-blue); box-shadow: 0 0 0 1px var(--tek-blue); }
</style>
