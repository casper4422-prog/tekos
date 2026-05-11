<script lang="ts">
	import { Sword, Wrench, Zap, Skull, Gem, Hexagon, Leaf, PawPrint } from 'lucide-svelte';

	let { category = '', size = 14, strokeWidth = 1.75 }: { category: string; size?: number; strokeWidth?: number } = $props();

	const MAP: Record<string, typeof Sword> = {
		combat:     Sword,
		utility:    Wrench,
		transport:  PawPrint,
		harvesting: Leaf,
		boss:       Skull,
		resource:   Gem,
		flyer:      Zap,
		water:      Zap,
		mount:      PawPrint,
	};

	const Icon = $derived(MAP[category] ?? Hexagon);
</script>

<Icon {size} {strokeWidth} />
