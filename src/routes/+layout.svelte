<script lang="ts">
	import {
		User, Dna, BookOpen, Users, UserPlus, MessageSquare, Shield,
		Repeat2, Sword, Trophy, Bell, Power, Hexagon, Rss, Settings
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const NAV = [
		{ section: 'Personal', color: 'beta', items: [
			{ page: 'dossier',   Icon: User,          label: 'Dossier' },
			{ page: 'specimens', Icon: Dna,           label: 'Specimens' },
			{ page: 'dex',       Icon: BookOpen,       label: 'Dex' },
		]},
		{ section: 'Social', color: 'gamma', items: [
			{ page: 'feed',      Icon: Rss,           label: 'Feed' },
			{ page: 'survivors', Icon: Users,         label: 'Survivors' },
			{ page: 'friends',   Icon: UserPlus,      label: 'Network' },
			{ page: 'messages',  Icon: MessageSquare, label: 'Comms' },
			{ page: 'tribe',     Icon: Shield,        label: 'Tribe' },
		]},
		{ section: 'Operations', color: 'alpha', items: [
			{ page: 'marketplace',  Icon: Repeat2,   label: 'Marketplace' },
			{ page: 'overseer',     Icon: Sword,     label: 'Overseer' },
			{ page: 'leaderboards', Icon: Trophy,    label: 'Rankings' },
		]},
	];

	let sidebarOpen = $state(false);

	// Apply saved color theme on load
	onMount(async () => {
		const res = await fetch('/api/settings');
		if (!res.ok) return;
		const { theme } = await res.json();
		if (!theme) return;
		const hexToRgb = (hex: string) => {
			const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
			return `${r},${g},${b}`;
		};
		const root = document.documentElement;
		if (theme.primary) {
			root.style.setProperty('--tek-blue', theme.primary);
			root.style.setProperty('--tek-blue-dim',    `rgba(${hexToRgb(theme.primary)},0.12)`);
			root.style.setProperty('--tek-blue-border', `rgba(${hexToRgb(theme.primary)},0.22)`);
			root.style.setProperty('--tek-blue-glow',   `rgba(${hexToRgb(theme.primary)},0.35)`);
		}
		if (theme.accent) root.style.setProperty('--tek-purple', theme.accent);
		if (theme.bg)     root.style.setProperty('--tek-bg', theme.bg);
	});

	function isActive(p: string) {
		return $page.url.pathname.startsWith(`/${p}`);
	}
</script>

{#if !data.user}
	{@render children()}
{:else}
	<button class="tek-mobile-menu" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	<nav id="tekSidebar" class:open={sidebarOpen} aria-label="Main navigation">
		<!-- Logo -->
		<a class="tek-logo" href="/dossier">
			<div class="tek-logo-mark">
				<Hexagon size={26} strokeWidth={1.5} />
			</div>
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
							<span class="nav-icon-wrap"><item.Icon size={15} strokeWidth={1.75} /></span>
							<span class="tek-nav-label-text">{item.label}</span>
						</a>
					{/each}
				</div>
				<div class="tek-nav-divider"></div>
			{/each}

			<!-- Settings -->
			<div class="tek-nav-label settings">Settings</div>
			<div class="tek-nav-group-items settings">
				<a class="tek-nav-item" class:active={isActive('settings')} href="/settings" onclick={() => sidebarOpen = false}>
					<span class="nav-icon-wrap"><Settings size={15} strokeWidth={1.75} /></span>
					<span class="tek-nav-label-text">Theme</span>
				</a>
				<a class="tek-nav-item" class:active={isActive('notifications')} href="/notifications" onclick={() => sidebarOpen = false}>
					<span class="nav-icon-wrap"><Bell size={15} strokeWidth={1.75} /></span>
					<span class="tek-nav-label-text">Notifications</span>
					{#if data.unreadCount > 0}
						<span class="notif-nav-badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>
					{/if}
				</a>
				<a class="tek-nav-item profile-item" href="/dossier" onclick={() => sidebarOpen = false} title={data.user.nickname ?? data.user.email}>
					<span class="nav-icon-wrap"><User size={15} strokeWidth={1.75} /></span>
					<span class="tek-nav-label-text profile-name">{data.user.nickname ?? data.user.email}</span>
				</a>
				<a class="tek-nav-item disconnect-item" href="/api/auth/logout">
					<span class="nav-icon-wrap"><Power size={15} strokeWidth={1.75} /></span>
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
	/* ── Section label colours ──────────────────────────────────────────────── */
	:global(.tek-nav-label.beta)     { color:#60a5fa; border-left:2px solid #3b82f6; background:rgba(59,130,246,0.08); padding-left:8px; border-radius:3px; }
	:global(.tek-nav-label.gamma)    { color:#4ade80; border-left:2px solid #22c55e; background:rgba(34,197,94,0.08);  padding-left:8px; border-radius:3px; }
	:global(.tek-nav-label.alpha)    { color:#f87171; border-left:2px solid #ef4444; background:rgba(239,68,68,0.08);  padding-left:8px; border-radius:3px; }
	:global(.tek-nav-label.settings) { color:#c084fc; border-left:2px solid #8b5cf6; background:rgba(139,92,246,0.08); padding-left:8px; border-radius:3px; }

	/* ── Group item containers (connecting line) ────────────────────────────── */
	:global(.tek-nav-group-items)          { position:relative; padding-left:10px; }
	:global(.tek-nav-group-items::before)  { content:''; position:absolute; left:13px; top:4px; bottom:4px; width:1px; }
	:global(.tek-nav-group-items.beta::before)     { background:rgba(59,130,246,0.35); }
	:global(.tek-nav-group-items.gamma::before)    { background:rgba(34,197,94,0.35); }
	:global(.tek-nav-group-items.alpha::before)    { background:rgba(239,68,68,0.35); }
	:global(.tek-nav-group-items.settings::before) { background:rgba(139,92,246,0.35); }

	/* ── Item tinted backgrounds ────────────────────────────────────────────── */
	:global(.tek-nav-group-items.beta     .tek-nav-item) { background:rgba(59,130,246,0.04);  padding-left:22px; }
	:global(.tek-nav-group-items.gamma    .tek-nav-item) { background:rgba(34,197,94,0.04);   padding-left:22px; }
	:global(.tek-nav-group-items.alpha    .tek-nav-item) { background:rgba(239,68,68,0.04);   padding-left:22px; }
	:global(.tek-nav-group-items.settings .tek-nav-item) { background:rgba(139,92,246,0.04);  padding-left:22px; }

	:global(.tek-nav-group-items.beta     .tek-nav-item:hover),
	:global(.tek-nav-group-items.beta     .tek-nav-item.active) { background:rgba(59,130,246,0.13); color:#93c5fd; }
	:global(.tek-nav-group-items.gamma    .tek-nav-item:hover),
	:global(.tek-nav-group-items.gamma    .tek-nav-item.active) { background:rgba(34,197,94,0.13);  color:#86efac; }
	:global(.tek-nav-group-items.alpha    .tek-nav-item:hover),
	:global(.tek-nav-group-items.alpha    .tek-nav-item.active) { background:rgba(239,68,68,0.13);  color:#fca5a5; }
	:global(.tek-nav-group-items.settings .tek-nav-item:hover),
	:global(.tek-nav-group-items.settings .tek-nav-item.active) { background:rgba(139,92,246,0.13); color:#d8b4fe; }

	:global(.profile-name) { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
	:global(.disconnect-item) { color:#f87171 !important; }
	:global(.disconnect-item:hover) { background:rgba(239,68,68,0.12) !important; }
	:global(.notif-nav-badge) { background:#ef4444; color:#fff; border-radius:99px; padding:1px 6px; font-size:0.62rem; font-weight:800; margin-left:auto; flex-shrink:0; }
</style>
