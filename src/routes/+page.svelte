<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	if (data.user) goto('/dossier');
	else goto('/login');
</script>
