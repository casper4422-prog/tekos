<!--
    HexAvatar — hex-shaped avatar SVG with initial letter and gradient outline.
    Used throughout TekOS (Dossier, Friends, Survivors, Messages, etc.).
    Accepts: name (string) to derive initial, size (default 88px), online indicator,
    and optional gradient colors.
-->
<script lang="ts">
    let {
        name,
        size = 88,
        online = false,
        from = '#00b4ff',
        to = '#8b5cf6',
        showPip = true
    }: {
        name: string;
        size?: number;
        online?: boolean;
        from?: string;
        to?: string;
        showPip?: boolean;
    } = $props();

    const initial = $derived((name?.charAt(0) ?? '?').toUpperCase());
    const gradientId = `hexavGrad-${Math.random().toString(36).slice(2, 9)}`;

    // Hex height ratio
    const w = size;
    const h = Math.round(size * (100 / 88));
    const pipSize = Math.max(8, Math.round(size * 0.13));
</script>

<div class="hex-av" style="width: {w}px; height: {h}px;">
    <svg viewBox="0 0 88 100" preserveAspectRatio="xMidYMid meet">
        <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color={from} />
                <stop offset="100%" stop-color={to} />
            </linearGradient>
        </defs>
        <polygon
            points="44,4 84,26 84,74 44,96 4,74 4,26"
            fill="rgba(10,18,44,0.9)"
            stroke="url(#{gradientId})"
            stroke-width="2"
        />
        <text
            x="44" y="62"
            font-family="Orbitron"
            font-size="32"
            font-weight="900"
            fill="url(#{gradientId})"
            text-anchor="middle"
        >{initial}</text>
    </svg>
    {#if showPip}
        <div class="hex-av-pip" class:online style="width: {pipSize}px; height: {pipSize}px;"></div>
    {/if}
</div>

<style>
.hex-av {
    position: relative;
    flex-shrink: 0;
}
.hex-av :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
    filter: drop-shadow(0 0 12px rgba(0, 180, 255, 0.5));
}
.hex-av-pip {
    position: absolute;
    bottom: 8%;
    right: 4%;
    border-radius: 50%;
    background: #475569;
    border: 2px solid #050812;
    box-sizing: content-box;
}
.hex-av-pip.online {
    background: #10b981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}
</style>
