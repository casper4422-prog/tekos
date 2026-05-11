<script lang="ts">
	import { Bell } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Notif = { id:number; type:string; payload:Record<string,unknown>; read:boolean; createdAt:string };
	let notifs = $state<Notif[]>(data.notifs as Notif[]);
	const unread = $derived(notifs.filter(n => !n.read).length);

	async function markRead(id: number) {
		await fetch(`/api/notifications/${id}/read`, { method:'PUT' });
		notifs = notifs.map(n => n.id === id ? { ...n, read:true } : n);
	}

	async function markAll() {
		await fetch('/api/notifications/read-all', { method:'PUT' });
		notifs = notifs.map(n => ({ ...n, read:true }));
	}

	function ago(dt: string) {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff/60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m/60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h/24)}d ago`;
	}

	const TYPE_ICON: Record<string,string> = {
		friend_request:'ðŸ‘¥', friend_accept:'ðŸ‘¥', trade_offer:'ðŸ”', offer_accepted:'âœ…', tribe_invite:'ðŸ›¡ï¸', default:'ðŸ””'
	};
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Notifications</h1>
			{#if unread > 0}<div class="page-subtitle">{unread} unread</div>{/if}
		</div>
		{#if unread > 0}<button class="btn btn-secondary" onclick={markAll}>Mark all read</button>{/if}
	</div>

	{#if notifs.length === 0}
		<div class="notif-empty">No notifications yet.</div>
	{:else}
		<div class="notif-list">
			{#each notifs as n}
				<div class="cham-shell notif-row" class:unread={!n.read} style="--cut:6px" onclick={() => markRead(n.id)} role="button" tabindex="0">
					<div class="notif-inner">
						<div class="notif-icon">{TYPE_ICON[n.type] ?? TYPE_ICON.default}</div>
						<div class="notif-content">
							<div class="notif-type">{n.type.replace(/_/g,' ')}</div>
							{#if n.payload?.message}<div class="notif-msg">{String(n.payload.message)}</div>{/if}
							<div class="notif-time">{ago(n.createdAt)}</div>
						</div>
						{#if !n.read}<div class="notif-dot"></div>{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.notif-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.88rem; }
.notif-list { display:flex; flex-direction:column; gap:4px; max-width:640px; }
.notif-row { cursor:pointer; }
.notif-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 14px; display:flex; align-items:flex-start; gap:12px; transition:background .15s; }
.notif-row.unread .notif-inner { background:linear-gradient(160deg,rgba(14,26,54,0.97),rgba(6,12,32,1)); border-left:2px solid rgba(0,180,255,0.4); }
.notif-icon { font-size:1.1rem; flex-shrink:0; margin-top:2px; }
.notif-content { flex:1; min-width:0; }
.notif-type { font-size:0.82rem; font-weight:600; color:#f1f5f9; text-transform:capitalize; }
.notif-msg { font-size:0.78rem; color:#64748b; margin-top:2px; }
.notif-time { font-size:0.68rem; color:#334155; margin-top:4px; }
.notif-dot { width:7px; height:7px; border-radius:50%; background:#00b4ff; flex-shrink:0; margin-top:6px; box-shadow:0 0 6px rgba(0,180,255,0.6); }
</style>

