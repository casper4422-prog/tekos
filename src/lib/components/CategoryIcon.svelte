<script lang="ts">
	import { Sword, Wrench, Zap, Skull, Gem, Hexagon, Leaf, PawPrint } from 'lucide-svelte';

	let { category = '', size = 14, strokeWidth = 1.75 }: { category: string; size?: number; strokeWidth?: number } = $props();

	// Maps actual species-database.js category values to icons
	// combat, utility, transport (Companions), harvesting, boss
	const MAP: Record<string, typeof Sword> = {
		combat:     Sword,
		utility:    Wrench,
		transport:  PawPrint,  // Companions — rideable/companion creatures
		harvesting: Leaf,
		boss:       Skull,
		resource:   Gem,
		// Legacy V2 names (kept for any remaining references)
		flyer:      Zap,
		water:      Zap,
		mount:      PawPrint,
	};

	const Icon = MAP[category] ?? Hexagon;
</script>

<Icon {size} {strokeWidth} />
