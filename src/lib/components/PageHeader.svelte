<!--
    PageHeader — standardized Tek-style header for top of every page.
    Slots: title is the page title. crumbs is an array of {label, href?} for breadcrumb.
    sub is the optional flavor subtitle (Crimson Pro italic).
-->
<script lang="ts">
    type Crumb = { label: string; href?: string };
    type Variant = 'default' | 'red' | 'gold' | 'green' | 'purple';

    let {
        title,
        crumbs = [],
        sub = '',
        subMono = false,
        variant = 'default'
    }: {
        title: string;
        crumbs?: Crumb[];
        sub?: string;
        subMono?: boolean;
        variant?: Variant;
    } = $props();
</script>

<div class="tek-page-header" data-variant={variant}>
    {#if crumbs.length}
        <div class="tek-breadcrumb">
            {#each crumbs as c, i}
                {#if c.href}
                    <a href={c.href}>{c.label}</a>
                {:else}
                    <span>{c.label}</span>
                {/if}
                {#if i < crumbs.length - 1}<span class="sep">/</span>{/if}
            {/each}
        </div>
    {/if}
    <h1 class="t-page-title">{title}</h1>
    {#if sub}
        <div class={subMono ? 'tek-page-sub-mono' : 'tek-page-sub'}>{sub}</div>
    {/if}
</div>

<style>
    /* Variant gradients override the default cyan on t-page-title */
    :global(.tek-page-header[data-variant="red"] .t-page-title) {
        background: linear-gradient(180deg, #ffffff 0%, #fca5a5 70%, rgba(239,68,68,0.5) 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 14px rgba(239,68,68,0.30));
    }
    :global(.tek-page-header[data-variant="gold"] .t-page-title) {
        background: linear-gradient(180deg, #ffffff 0%, #fde68a 60%, rgba(245,158,11,0.55) 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 14px rgba(245,158,11,0.32));
    }
    :global(.tek-page-header[data-variant="green"] .t-page-title) {
        background: linear-gradient(180deg, #ffffff 0%, #86efac 60%, rgba(34,197,94,0.55) 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 14px rgba(34,197,94,0.30));
    }
    :global(.tek-page-header[data-variant="purple"] .t-page-title) {
        background: linear-gradient(180deg, #ffffff 0%, #d8b4fe 60%, rgba(168,85,247,0.55) 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        filter: drop-shadow(0 0 14px rgba(168,85,247,0.30));
    }
</style>
