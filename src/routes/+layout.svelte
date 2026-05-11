<script lang="ts">
	import {
		User, Dna, BookOpen,
		Users, Shield, Rss,
		Repeat2, Sword, Bell, Hexagon,
		Power, Award, Palette, Lock, AlertTriangle
	} from 'lucide-svelte';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const NAV = [
		{ section:'Personal', color:'beta', items:[
			{ page:'dossier',   Icon:User,     label:'Dossier'   },
			{ page:'specimens', Icon:Dna,      label:'Specimens' },
			{ page:'dex',       Icon:BookOpen, label:'Dex'       },
		]},
		{ section:'Social', color:'gamma', items:[
			{ page:'feed',      Icon:Rss,     label:'Feed'      },
			{ page:'friends',   Icon:Users,   label:'Network'   },
			{ page:'tribe',     Icon:Shield,  label:'Tribe'     },
			{ page:'settings',  Icon:Palette, label:'Theme'     },
		]},
		{ section:'Operations', color:'alpha', items:[
			{ page:'marketplace',   Icon:Repeat2, label:'Marketplace'   },
			{ page:'overseer',      Icon:Sword,   label:'Overseer'      },
			{ page:'notifications', Icon:Bell,    label:'Notifications' },
			{ page:'badges',        Icon:Award,   label:'Badges'        },
		]},
	];

	let sidebarOpen   = $state(false);
	let isGuest       = $state(false);
	let accountOpen   = $state(false);

	// Account settings modal state
	let curPwd    = $state('');
	let newPwd    = $state('');
	let pwdSaving = $state(false);
	let pwdMsg    = $state('');
	let pwdErr    = $state(false);
	let delConfirm = $state(false);
	let delPwd    = $state('');
	let delSaving = $state(false);

	function isActive(p: string) { return $page.url.pathname.startsWith(`/${p}`); }

	onMount(async () => {
		isGuest = localStorage.getItem('tekos_guest') === '1';
		if (!data.user) return;
		const res = await fetch('/api/settings');
		if (!res.ok) return;
		const { theme } = await res.json();
		if (!theme) return;
		const hexToRgb = (h: string) => {
			const r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
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

	const SOCIAL_OPS = ['feed','friends','tribe','settings','marketplace','overseer','notifications','badges','survivors','messages'];
	function isLocked(p: string) { return !data.user && SOCIAL_OPS.includes(p); }

	function openAccount() { accountOpen = true; sidebarOpen = false; curPwd=''; newPwd=''; pwdMsg=''; pwdErr=false; delConfirm=false; delPwd=''; }
	function exitGuest() { localStorage.removeItem('tekos_guest'); window.location.href = '/login'; }

	async function changePassword() {
		if (!curPwd || !newPwd) return;
		pwdSaving = true; pwdMsg = ''; pwdErr = false;
		const res = await fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ currentPassword:curPwd, newPassword:newPwd }) });
		const body = await res.json();
		if (res.ok) { pwdMsg = 'Password updated successfully.'; curPwd=''; newPwd=''; }
		else { pwdMsg = body.error ?? 'Failed'; pwdErr = true; }
		pwdSaving = false;
	}

	async function deleteAccount() {
		if (!delPwd) return;
		delSaving = true;
		const res = await fetch('/api/profile', { method:'DELETE' });
		if (res.ok) { await fetch('/api/auth/logout'); window.location.href = '/login'; }
		else { alert('Failed to delete account'); delSaving = false; }
	}
</script>

{#if !data.user && !isGuest}
	{@render children()}
{:else}
	<button class="tek-mobile-menu" onclick={() => sidebarOpen = !sidebarOpen} aria-label="Menu">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
			<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
		</svg>
	</button>

	<nav id="tekSidebar" class:open={sidebarOpen}>
		<a class="tek-logo" href="/dossier">
			<div class="tek-logo-mark"><Hexagon size={26} strokeWidth={1.5} /></div>
			<div>
				<div class="tek-logo-name">TekOS</div>
				<span class="tek-logo-ver">{isGuest ? '⚠ Guest Mode' : 'v3.0 · Online'}</span>
			</div>
		</a>

		{#if isGuest}
			<div class="guest-banner">Guest access — <a href="/login" onclick={() => localStorage.removeItem('tekos_guest')}>Sign in</a> for full features</div>
		{/if}

		<div class="tek-nav">
			{#each NAV as group}
				<div class="tek-nav-label {group.color}">{group.section}</div>
				<div class="tek-nav-group-items {group.color}">
					{#each group.items as item}
						{@const locked = isLocked(item.page)}
						<a class="tek-nav-item" class:active={isActive(item.page)} class:nav-locked={locked}
							href={locked ? '/login' : `/${item.page}`} onclick={() => sidebarOpen=false}
							title={locked ? 'Sign in to access' : undefined}>
							<span class="nav-icon-wrap" style={locked ? 'opacity:0.3' : ''}><item.Icon size={15} strokeWidth={1.75} /></span>
							<span class="tek-nav-label-text" style={locked ? 'opacity:0.35' : ''}>{item.label}</span>
							{#if locked}
								<span style="font-size:0.65rem;margin-left:auto;opacity:0.4">🔒</span>
							{:else if item.page === 'notifications' && data.unreadCount > 0}
								<span class="notif-nav-badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>
							{/if}
						</a>
					{/each}
				</div>
				<div class="tek-nav-divider"></div>
			{/each}

			<div class="tek-nav-label settings">Account</div>
			<div class="tek-nav-group-items settings">
				{#if data.user}
					<!-- Clicking username opens account settings modal -->
					<button class="tek-nav-item profile-item" onclick={openAccount} title="Account settings" style="width:100%;text-align:left;font-family:inherit">
						<span class="nav-icon-wrap"><User size={15} strokeWidth={1.75} /></span>
						<span class="tek-nav-label-text profile-name">{data.user.nickname ?? data.user.email}</span>
					</button>
					<a class="tek-nav-item disconnect-item" href="/api/auth/logout">
						<span class="nav-icon-wrap"><Power size={15} strokeWidth={1.75} /></span>
						<span class="tek-nav-label-text">Disconnect</span>
					</a>
				{:else}
					<button class="tek-nav-item disconnect-item" onclick={exitGuest} style="width:100%;text-align:left;font-family:inherit">
						<span class="nav-icon-wrap"><Power size={15} strokeWidth={1.75} /></span>
						<span class="tek-nav-label-text">Exit Guest Mode</span>
					</button>
				{/if}
			</div>
		</div>
	</nav>

	<main id="appMainContent">
		{@render children()}
	</main>
{/if}

<!-- Account settings modal — triggered by clicking username -->
{#if accountOpen}
<div class="modal active" role="dialog" aria-modal="true">
	<div class="modal-content" style="max-width:460px">
		<div class="modal-header">
			<h2 class="modal-title">Account Settings</h2>
			<button class="close-btn" onclick={() => { accountOpen=false; delConfirm=false; }}>&times;</button>
		</div>
		<div class="modal-body" style="display:flex;flex-direction:column;gap:20px">

			<!-- Change password -->
			<div>
				<div class="acc-section-title"><Lock size={13} /> Change Password</div>
				<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
					<div class="plan-field">
						<label class="form-label" for="acc-cur">Current Password</label>
						<input id="acc-cur" class="form-control" type="password" bind:value={curPwd} autocomplete="current-password" />
					</div>
					<div class="plan-field">
						<label class="form-label" for="acc-new">New Password</label>
						<input id="acc-new" class="form-control" type="password" bind:value={newPwd} autocomplete="new-password" />
					</div>
					{#if pwdMsg}
						<div class="acc-msg" class:acc-err={pwdErr}>{pwdMsg}</div>
					{/if}
					<button class="btn btn-secondary" onclick={changePassword} disabled={pwdSaving || !curPwd || !newPwd}>
						{pwdSaving ? 'Updating...' : 'Update Password'}
					</button>
				</div>
			</div>

			<!-- Divider -->
			<div class="tek-divider"></div>

			<!-- Delete account -->
			<div>
				<div class="acc-section-title" style="color:#f87171"><AlertTriangle size={13} /> Danger Zone</div>
				{#if !delConfirm}
					<div class="acc-danger-desc">Permanently delete your account, all specimens, tribe memberships, and connections. Cannot be undone.</div>
					<button class="btn btn-danger" style="margin-top:10px" onclick={() => delConfirm=true}>Delete My Account</button>
				{:else}
					<div class="acc-danger-desc">Enter your password to permanently delete your account.</div>
					<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
						<div class="plan-field">
							<label class="form-label" for="acc-del">Password confirmation</label>
							<input id="acc-del" class="form-control" type="password" bind:value={delPwd} />
						</div>
						<div style="display:flex;gap:8px">
							<button class="btn btn-secondary" onclick={() => { delConfirm=false; delPwd=''; }}>Cancel</button>
							<button class="btn btn-danger" onclick={deleteAccount} disabled={delSaving || !delPwd}>{delSaving ? 'Deleting...' : 'Permanently Delete'}</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={() => { accountOpen=false; delConfirm=false; }}>Close</button>
		</div>
	</div>
</div>
{/if}

<style>
.guest-banner { margin:6px 10px 2px; padding:8px 12px; background:rgba(245,158,11,0.07); border-left:2px solid #f59e0b; font-size:0.71rem; color:#fbbf24; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.guest-banner a { color:#fcd34d; }

/* Account modal styles */
.acc-section-title { font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#475569; display:flex; align-items:center; gap:6px; }
.acc-msg { font-size:0.8rem; padding:8px 12px; background:rgba(34,197,94,0.08); border-left:2px solid #22c55e; color:#4ade80; clip-path:polygon(4px 0%,100% 0%,calc(100% - 4px) 100%,0% 100%); }
.acc-msg.acc-err { background:rgba(239,68,68,0.08); border-left-color:#ef4444; color:#fca5a5; }
.acc-danger-desc { font-size:0.8rem; color:#64748b; margin-top:6px; line-height:1.5; }

:global(.tek-nav-label.beta)     { color:#60a5fa; border-left:2px solid #3b82f6; background:rgba(59,130,246,0.08); padding-left:8px; border-radius:3px; }
:global(.tek-nav-label.gamma)    { color:#4ade80; border-left:2px solid #22c55e; background:rgba(34,197,94,0.08);  padding-left:8px; border-radius:3px; }
:global(.tek-nav-label.alpha)    { color:#f87171; border-left:2px solid #ef4444; background:rgba(239,68,68,0.08);  padding-left:8px; border-radius:3px; }
:global(.tek-nav-label.settings) { color:#c084fc; border-left:2px solid #8b5cf6; background:rgba(139,92,246,0.08); padding-left:8px; border-radius:3px; }

:global(.tek-nav-group-items)          { position:relative; padding-left:10px; }
:global(.tek-nav-group-items::before)  { content:''; position:absolute; left:13px; top:4px; bottom:4px; width:1px; }
:global(.tek-nav-group-items.beta::before)     { background:rgba(59,130,246,0.35); }
:global(.tek-nav-group-items.gamma::before)    { background:rgba(34,197,94,0.35); }
:global(.tek-nav-group-items.alpha::before)    { background:rgba(239,68,68,0.35); }
:global(.tek-nav-group-items.settings::before) { background:rgba(139,92,246,0.35); }

:global(.tek-nav-group-items.beta     .tek-nav-item) { background:rgba(59,130,246,0.04);  padding-left:22px; }
:global(.tek-nav-group-items.gamma    .tek-nav-item) { background:rgba(34,197,94,0.04);   padding-left:22px; }
:global(.tek-nav-group-items.alpha    .tek-nav-item) { background:rgba(239,68,68,0.04);   padding-left:22px; }
:global(.tek-nav-group-items.settings .tek-nav-item) { background:rgba(139,92,246,0.04);  padding-left:22px; }

:global(.tek-nav-group-items.beta     .tek-nav-item:hover), :global(.tek-nav-group-items.beta     .tek-nav-item.active) { background:rgba(59,130,246,0.13); color:#93c5fd; }
:global(.tek-nav-group-items.gamma    .tek-nav-item:hover), :global(.tek-nav-group-items.gamma    .tek-nav-item.active) { background:rgba(34,197,94,0.13);  color:#86efac; }
:global(.tek-nav-group-items.alpha    .tek-nav-item:hover), :global(.tek-nav-group-items.alpha    .tek-nav-item.active) { background:rgba(239,68,68,0.13);  color:#fca5a5; }
:global(.tek-nav-group-items.settings .tek-nav-item:hover), :global(.tek-nav-group-items.settings .tek-nav-item.active) { background:rgba(139,92,246,0.13); color:#d8b4fe; }

:global(.profile-name)     { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
:global(.disconnect-item)  { color:#f87171 !important; }
:global(.disconnect-item:hover) { background:rgba(239,68,68,0.12) !important; }
:global(.notif-nav-badge)  { background:#ef4444; color:#fff; border-radius:99px; padding:1px 6px; font-size:0.62rem; font-weight:800; margin-left:auto; flex-shrink:0; }
</style>
