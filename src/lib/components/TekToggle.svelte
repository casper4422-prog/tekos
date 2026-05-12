<!--
    TekToggle — simple on/off toggle with two-way binding.
-->
<script lang="ts">
    let {
        checked = $bindable(false),
        onchange
    }: {
        checked?: boolean;
        onchange?: (v: boolean) => void;
    } = $props();

    function toggle() {
        checked = !checked;
        onchange?.(checked);
    }
</script>

<button
    type="button"
    class="tek-toggle"
    class:on={checked}
    onclick={toggle}
    aria-pressed={checked}
></button>

<style>
button.tek-toggle {
    border-style: solid;
    padding: 0;
}
</style>
