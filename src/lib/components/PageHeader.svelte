<!--
    PageHeader — the standard top-of-page header.

    Renders breadcrumb (optional) + title + subtitle (optional), using the
    global `.page-header` block defined in static/tekos.css so every page
    lands its title at the same Y position.

    Props:
      title         — page heading text
      crumbs        — breadcrumb trail [{ label, href? }]
      sub           — plain-string subtitle (alternative to subContent)
      subContent    — snippet for rich subtitle content (counters, pips,
                      colored spans). Takes precedence over `sub` if both
                      are passed.
      subStyle      — 'mono' (default, uppercase JetBrains Mono) or 'serif'
                      (Crimson Pro italic, used for narrative pages)
      variant       — color tint on the title gradient.
                      'default' cyan · 'red' · 'gold' · 'green' · 'purple'
                      'category' reads --cat-rgb off the closest ancestor
                      (used on species-tinted pages like /specimens/[id]).
      actions       — optional snippet rendered on the right side of the
                      header (toolbar buttons, "+ Add" CTAs, etc.). If
                      supplied, the header switches to a two-column layout.
-->
<script lang="ts">
    import type { Snippet } from 'svelte';

    type Crumb = { label: string; href?: string };
    type Variant = 'default' | 'red' | 'gold' | 'green' | 'purple' | 'category';
    type SubStyle = 'mono' | 'serif';

    let {
        title,
        crumbs = [],
        sub = '',
        subContent,
        subStyle = 'mono',
        variant = 'default',
        actions
    }: {
        title: string;
        crumbs?: Crumb[];
        sub?: string;
        subContent?: Snippet;
        subStyle?: SubStyle;
        variant?: Variant;
        actions?: Snippet;
    } = $props();
</script>

<div class="page-header" class:with-actions={!!actions} data-variant={variant}>
    <div class="page-header-text">
        {#if crumbs.length}
            <div class="breadcrumb">
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
        <h1 class="page-title">{title}</h1>
        {#if subContent}
            <div class="page-sub" class:serif={subStyle === 'serif'}>{@render subContent()}</div>
        {:else if sub}
            <div class="page-sub" class:serif={subStyle === 'serif'}>{sub}</div>
        {/if}
    </div>
    {#if actions}
        <div class="page-header-actions">
            {@render actions()}
        </div>
    {/if}
</div>
