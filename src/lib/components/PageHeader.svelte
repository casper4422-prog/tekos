<!--
    PageHeader — standardized Tek-style header for top of every page.
    Slots: title is the page title. crumbs is an array of {label, href?} for breadcrumb.
    sub is the optional flavor subtitle (Crimson Pro italic).
-->
<script lang="ts">
    type Crumb = { label: string; href?: string };

    let {
        title,
        crumbs = [],
        sub = '',
        subMono = false
    }: {
        title: string;
        crumbs?: Crumb[];
        sub?: string;
        subMono?: boolean;
    } = $props();
</script>

<div class="tek-page-header">
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
