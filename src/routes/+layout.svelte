<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const NAV = [
		{ section: 'Personal', items: [
			{ page: 'dossier',   icon: '👤', label: 'Dossier' },
			{ page: 'specimens', icon: '🧬', label: 'Specimens' },
			{ page: 'dex',       icon: '🦖', label: 'Dex' },
		]},
		{ section: 'Social', items: [
			{ page: 'friends',   icon: '👥', label: 'Network' },
			{ page: 'messages',  icon: '💬', label: 'Comms' },
			{ page: 'tribe',     icon: '🛡️', label: 'Tribe' },
		]},
		{ section: 'Overseer', items: [
			{ page: 'marketplace',  icon: '🔁', label: 'Marketplace' },
			{ page: 'overseer',     icon: '👑', label: 'Overseer' },
			{ page: 'leaderboards', icon: '🏆', label: 'Rankings' },
			{ page: 'notifications',icon: '🔔', label: 'Alerts' },
		]},
	];

	let sidebarOpen = $state(false);

	function isActive(p: string) {
		return $page.url.pathname.startsWith(`/${p}`);
	}
</script>

{#if !data.user}
	{@render children()}
{:else}
	<button class="tek-mobile-menu" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">☰</button>

	<nav id="tekSidebar" class:open={sidebarOpen} aria-label="Main navigation">
		<a class="tek-logo" href="/dossier">
			<span class="tek-logo-hex">⬡</span>
			<div>
				<div class="tek-logo-name">TekOS</div>
				<span class="tek-logo-ver">v3.0 · Online</span>
			</div>
		</a>

		<div class="tek-nav">
			{#each NAV as group}
				<div class="tek-nav-label">{group.section}</div>
				{#each group.items as item}
					<a
						class="tek-nav-item"
						class:active={isActive(item.page)}
						href="/{item.page}"
						onclick={() => sidebarOpen = false}
					>
						<span class="tek-nav-icon">{item.icon}</span>
						<span class="tek-nav-label-text">{item.label}</span>
					</a>
				{/each}
				<div class="tek-nav-divider"></div>
			{/each}
		</div>

		<div class="tek-sidebar-footer">
			<div class="tek-user-card">
				<div class="tek-user-avatar">⬡</div>
				<div>
					<div class="tek-user-name">{data.user.nickname ?? data.user.email}</div>
					<div class="tek-user-status">● Online</div>
				</div>
			</div>
			<a class="tek-disconnect-btn" href="/api/auth/logout">Disconnect</a>
		</div>
	</nav>

	<main id="appMainContent" role="main">
		{@render children()}
	</main>
{/if}
