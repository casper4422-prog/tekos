<script lang="ts">
	import { MessageSquare, ChevronRight } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Convo = { userId:number; nickname:string|null; email:string; lastMessage:string; lastAt:string; unread:number };
	const convos = data.convos as Convo[];

	function display(c: Convo) { return c.nickname ?? c.email; }

	function ago(dt: string): string {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff / 60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.floor(h / 24)}d ago`;
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Comms</h1>
			<div class="page-subtitle">Direct messages</div>
		</div>
	</div>

	{#if convos.length === 0}
		<div class="comms-empty">No messages yet. Start a conversation from the Network page.</div>
	{:else}
		<div class="comms-list">
			{#each convos as c}
				<a class="cham-shell comms-row" href="/messages/{c.userId}" style="--cut:7px">
					<div class="comms-row-inner">
						<div class="comms-avatar">
							<MessageSquare size={16} />
						</div>
						<div class="comms-info">
							<div class="comms-name">{display(c)}</div>
							<div class="comms-preview">{c.lastMessage}</div>
						</div>
						<div class="comms-meta">
							<div class="comms-time">{ago(c.lastAt)}</div>
							{#if c.unread > 0}
								<div class="comms-unread">{c.unread}</div>
							{/if}
						</div>
						<ChevronRight size={14} class="comms-chevron" />
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
.comms-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.9rem; }
.comms-list { display:flex; flex-direction:column; gap:5px; }
.comms-row { display:block; text-decoration:none; color:inherit; max-width:640px; }
.comms-row-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:14px 16px; display:flex; align-items:center; gap:14px; transition:background .15s; }
.comms-row:hover .comms-row-inner { background:rgba(14,26,54,0.98); }
.comms-avatar { width:34px; height:34px; border-radius:50%; background:rgba(0,180,255,0.1); border:1px solid rgba(0,180,255,0.2); display:flex; align-items:center; justify-content:center; color:rgba(0,180,255,0.7); flex-shrink:0; }
.comms-info { flex:1; min-width:0; }
.comms-name { font-size:0.9rem; font-weight:600; color:#f1f5f9; }
.comms-preview { font-size:0.78rem; color:#64748b; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.comms-meta { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }
.comms-time { font-size:0.68rem; color:#475569; }
.comms-unread { background:#00b4ff; color:#050812; border-radius:99px; padding:1px 7px; font-size:0.65rem; font-weight:800; min-width:20px; text-align:center; }
:global(.comms-chevron) { color:#334155; flex-shrink:0; }
</style>
