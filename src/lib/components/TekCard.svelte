<!--
    TekCard — chamfered Tek card with optional gradient stripe down the left edge.
    Use this for ALL primary content panels.
-->
<script lang="ts">
    type Stripe = 'blue' | 'amber' | 'green' | 'purple' | 'gold' | 'none';
    let {
        stripe = 'blue',
        size = 'md',
        children
    }: {
        stripe?: Stripe;
        size?: 'sm' | 'md';
        children: import('svelte').Snippet;
    } = $props();
</script>

<div
    class="tek-card-v2"
    class:has-stripe={stripe !== 'none'}
    class:stripe-amber={stripe === 'amber'}
    class:stripe-green={stripe === 'green'}
    class:stripe-purple={stripe === 'purple'}
    class:stripe-gold={stripe === 'gold'}
    class:sm={size === 'sm'}
>
    {@render children()}
</div>
