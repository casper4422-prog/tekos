<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const NAV = [
		{ section: 'Personal', color: 'beta', items: [
			{ page: 'dossier',   icon: '👤', label: 'Dossier' },
			{ page: 'specimens', icon: '🧬', label: 'Specimens' },
			{ page: 'dex',       icon: '🦖', label: 'Dex' },
		]},
		{ section: 'Social', color: 'gamma', items: [
			{ page: 'friends',   icon: '👥', label: 'Network' },
			{ page: 'messages',  icon: '💬', label: 'Comms' },
			{ page: 'tribe',     icon: '🛡️', label: 'Tribe' },
		]},
		{ section: 'Operations', color: 'alpha', items: [
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
				<div class="tek-nav-group-items {group.color}">
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
				</div>
				<div class="tek-nav-divider"></div>
			{/each}

			<!-- Settings section -->
			<div class="tek-nav-label settings">Settings</div>
			<div class="tek-nav-group-items settings">
				<a class="tek-nav-item"
					class:active={isActive('notifications')}
					href="/notifications"
					onclick={() => sidebarOpen = false}
				>
					<span class="tek-nav-icon">🔔</span>
					<span class="tek-nav-label-text">Notifications</span>
				</a>

				<a class="tek-nav-item profile-item"
					href="/dossier"
					onclick={() => sidebarOpen = false}
					title={data.user.nickname ?? data.user.email}
				>
					<span class="tek-nav-icon">⬡</span>
					<span class="tek-nav-label-text profile-name">{data.user.nickname ?? data.user.email}</span>
				</a>

				<a class="tek-nav-item disconnect-item" href="/api/auth/logout">
					<span class="tek-nav-icon">⏻</span>
					<span class="tek-nav-label-text">Disconnect</span>
				</a>
			</div>
		</div>
	</nav>

	<main id="appMainContent">
		{@render children()}
	</main>
{/if}

<style>
	/* ── Section label colors ───────────────────────── */
	:global(.tek-nav-label.beta)     { color: #60a5fa; border-left: 2px solid #3b82f6; background: rgba(59,130,246,0.10); padding-left: 8px; border-radius: 3px; }
	:global(.tek-nav-label.gamma)    { color: #4ade80; border-left: 2px solid #22c55e; background: rgba(34,197,94,0.10);  padding-left: 8px; border-radius: 3px; }
	:global(.tek-nav-label.alpha)    { color: #f87171; border-left: 2px solid #ef4444; background: rgba(239,68,68,0.10);  padding-left: 8px; border-radius: 3px; }
	:global(.tek-nav-label.settings) { color: #c084fc; border-left: 2px solid #8b5cf6; background: rgba(139,92,246,0.10); padding-left: 8px; border-radius: 3px; }

	/* ── Group item containers (connecting line) ────── */
	:global(.tek-nav-group-items) {
		position: relative;
		padding-left: 10px;
	}
	:global(.tek-nav-group-items::before) {
		content: '';
		position: absolute;
		left: 13px;
		top: 4px;
		bottom: 4px;
		width: 1px;
	}
	:global(.tek-nav-group-items.beta::before)     { background: rgba(59,130,246,0.40); }
	:global(.tek-nav-group-items.gamma::before)    { background: rgba(34,197,94,0.40); }
	:global(.tek-nav-group-items.alpha::before)    { background: rgba(239,68,68,0.40); }
	:global(.tek-nav-group-items.settings::before) { background: rgba(139,92,246,0.40); }

	/* ── Item tinted backgrounds ────────────────────── */
	:global(.tek-nav-group-items.beta     .tek-nav-item) { background: rgba(59,130,246,0.05);  padding-left: 22px; }
	:global(.tek-nav-group-items.gamma    .tek-nav-item) { background: rgba(34,197,94,0.05);   padding-left: 22px; }
	:global(.tek-nav-group-items.alpha    .tek-nav-item) { background: rgba(239,68,68,0.05);   padding-left: 22px; }
	:global(.tek-nav-group-items.settings .tek-nav-item) { background: rgba(139,92,246,0.05);  padding-left: 22px; }

	:global(.tek-nav-group-items.beta     .tek-nav-item:hover),
	:global(.tek-nav-group-items.beta     .tek-nav-item.active) { background: rgba(59,130,246,0.14); color: #93c5fd; }
	:global(.tek-nav-group-items.gamma    .tek-nav-item:hover),
	:global(.tek-nav-group-items.gamma    .tek-nav-item.active) { background: rgba(34,197,94,0.14);  color: #86efac; }
	:global(.tek-nav-group-items.alpha    .tek-nav-item:hover),
	:global(.tek-nav-group-items.alpha    .tek-nav-item.active) { background: rgba(239,68,68,0.14);  color: #fca5a5; }
	:global(.tek-nav-group-items.settings .tek-nav-item:hover),
	:global(.tek-nav-group-items.settings .tek-nav-item.active) { background: rgba(139,92,246,0.14); color: #d8b4fe; }

	/* ── Profile name truncation ────────────────────── */
	:global(.profile-name) {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	/* ── Disconnect red tint ────────────────────────── */
	:global(.disconnect-item) { color: #f87171 !important; }
	:global(.disconnect-item:hover) { background: rgba(239,68,68,0.14) !important; }
</style>
