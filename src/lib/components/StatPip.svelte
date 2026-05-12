<!--
    StatPip — small colored dot for status indicators (online/offline/etc).
    Optional pulse animation.
-->
<script lang="ts">
    type Color = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'faint';
    let {
        color = 'green',
        pulse = false
    }: {
        color?: Color;
        pulse?: boolean;
    } = $props();
</script>

<span class="tek-pip {color === 'faint' ? '' : color}" class:pulse></span>
