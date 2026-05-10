<script lang="ts">
	import { Sword, Wind, Wrench, Waves, Zap, Skull, Gem, Hexagon } from 'lucide-svelte';

	let { category = '', size = 14, strokeWidth = 1.75 }: { category: string; size?: number; strokeWidth?: number } = $props();

	const MAP: Record<string, typeof Sword> = {
		combat:   Sword,
		flyer:    Wind,
		utility:  Wrench,
		water:    Waves,
		mount:    Zap,
		boss:     Skull,
		resource: Gem,
	};

	const Icon = MAP[category] ?? Hexagon;
</script>

<Icon {size} {strokeWidth} />
