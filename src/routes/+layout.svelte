<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const NAV = [
		{ section: 'Beta', color: 'beta', items: [
			{ page: 'dossier',   icon: '👤', label: 'Dossier' },
			{ page: 'specimens', icon: '🧬', label: 'Specimens' },
			{ page: 'dex',       icon: '🦖', label: 'Dex' },
		]},
		{ section: 'Gamma', color: 'gamma', items: [
			{ page: 'friends',   icon: '👥', label: 'Network' },
			{ page: 'messages',  icon: '💬', label: 'Comms' },
			{ page: 'tribe',     icon: '🛡️', label: 'Tribe' },
		]},
		{ section: 'Alpha', color: 'alpha', items: [
			{ page: 'marketplace',  icon: '🔁', label: 'Marketplace' },
			{ page: 'overseer',     icon: '👑', label: 'Overseer' },
			{ page: 'leaderboards', icon: '🏆', label: 'Rankings' },
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
				<div class="tek-nav-label {group.color}">{group.section}</div>
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

			<!-- Implant section -->
			<div class="tek-nav-label implant">Implant</div>

			<a class="tek-nav-item implant-item"
				class:active={isActive('dossier') || isActive('specimens') || isActive('dex')}
				href="/dossier"
				onclick={() => sidebarOpen = false}
				title={data.user.nickname ?? data.user.email}
			>
				<span class="tek-nav-icon">⬡</span>
				<span class="tek-nav-label-text implant-name">{data.user.nickname ?? data.user.email}</span>
			</a>

			<a class="tek-nav-item"
				class:active={isActive('notifications')}
				href="/notifications"
				onclick={() => sidebarOpen = false}
			>
				<span class="tek-nav-icon">🔔</span>
				<span class="tek-nav-label-text">Notifications</span>
			</a>

			<a class="tek-nav-item disconnect-item" href="/api/auth/logout">
				<span class="tek-nav-icon">⏻</span>
				<span class="tek-nav-label-text">Disconnect</span>
			</a>
		</div>
	</nav>

	<main id="appMainContent" role="main">
		{@render children()}
	</main>
{/if}

<style>
	:global(.tek-nav-label.beta) {
		color: #60a5fa;
		border-left: 2px solid #3b82f6;
		background: rgba(59, 130, 246, 0.08);
		padding-left: 8px;
		border-radius: 3px;
	}
	:global(.tek-nav-label.gamma) {
		color: #4ade80;
		border-left: 2px solid #22c55e;
		background: rgba(34, 197, 94, 0.08);
		padding-left: 8px;
		border-radius: 3px;
	}
	:global(.tek-nav-label.alpha) {
		color: #f87171;
		border-left: 2px solid #ef4444;
		background: rgba(239, 68, 68, 0.08);
		padding-left: 8px;
		border-radius: 3px;
	}
	:global(.tek-nav-label.implant) {
		color: #c084fc;
		border-left: 2px solid #8b5cf6;
		background: rgba(139, 92, 246, 0.08);
		padding-left: 8px;
		border-radius: 3px;
	}
	:global(.implant-name) {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}
	:global(.disconnect-item) {
		color: #f87171 !important;
		opacity: 0.8;
	}
	:global(.disconnect-item:hover) {
		opacity: 1;
		background: rgba(239, 68, 68, 0.08) !important;
	}
</style>
