<!--
    BloodlineBadge — computes a bloodline tier from base stats and renders the chip.
    Bloodline rules (from achievements_system.md): min of HP/STA/FOOD/WGT/MEL (base only).
    >= 60: Diamond, >= 55: Gold, >= 50: Silver, >= 45: Bronze, else null.
-->
<script lang="ts">
    type BaseStats = { HP?: number; STA?: number; FOOD?: number; WGT?: number; MEL?: number; [k: string]: number | undefined };

    let {
        base,
        size = 'sm'
    }: {
        base: BaseStats;
        size?: 'sm' | 'md';
    } = $props();

    const minCore = $derived(
        Math.min(
            base?.HP ?? 0,
            base?.STA ?? 0,
            base?.FOOD ?? 0,
            base?.WGT ?? 0,
            base?.MEL ?? 0
        )
    );

    const tier = $derived(
        minCore >= 60 ? { cls: 'diamond', label: '✦ DIAMOND' }
        : minCore >= 55 ? { cls: 'gold', label: '◈ GOLD' }
        : minCore >= 50 ? { cls: 'silver', label: '⬢ SILVER' }
        : minCore >= 45 ? { cls: 'bronze', label: '⬢ BRONZE' }
        : null
    );
</script>

{#if tier}
    <span class="tier-pill {tier.cls}" class:md={size === 'md'}>{tier.label} BLOODLINE</span>
{/if}

<style>
.tier-pill.md { font-size: 0.7rem; padding: 4px 10px; }
</style>
