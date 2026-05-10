<script lang="ts">
	import { Send } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Msg = { id:number; fromUserId:number; toUserId:number; message:string; createdAt:string; read:boolean };

	const other = data.other as { id:number; nickname:string|null; email:string } | null;
	const otherName = other?.nickname ?? other?.email ?? 'Unknown';

	let messages = $state<Msg[]>(data.messages as Msg[]);
	let draft    = $state('');
	let sending  = $state(false);
	let bottom: HTMLDivElement;

	function ago(dt: string): string {
		const d = new Date(dt);
		return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
	}

	async function send() {
		if (!draft.trim() || sending) return;
		sending = true;
		const res = await fetch(`/api/dms/${other?.id}`, {
			method: 'POST', headers: {'Content-Type':'application/json'},
			body: JSON.stringify({ message: draft.trim() })
		});
		if (res.ok) {
			const msg = await res.json();
			messages = [...messages, msg];
			draft = '';
			setTimeout(() => bottom?.scrollIntoView({ behavior: 'smooth' }), 50);
		}
		sending = false;
	}
</script>

<div class="std-page thread-page">
	<div class="thread-header">
		<a href="/messages" class="btn btn-secondary btn-sm">← Back</a>
		<div class="thread-title">{otherName}</div>
	</div>

	<div class="thread-messages">
		{#if messages.length === 0}
			<div class="thread-empty">No messages yet. Say hello!</div>
		{:else}
			{#each messages as m}
				{@const mine = m.fromUserId === data.myId}
				<div class="msg-row" class:mine>
					<div class="msg-bubble" class:mine>
						{m.message}
						<span class="msg-time">{ago(m.createdAt)}</span>
					</div>
				</div>
			{/each}
		{/if}
		<div bind:this={bottom}></div>
	</div>

	<div class="thread-input-row">
		<input class="form-control thread-input" placeholder="Type a message..."
			bind:value={draft}
			onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
		<button class="btn btn-primary thread-send" onclick={send} disabled={sending || !draft.trim()}>
			<Send size={15} />
		</button>
	</div>
</div>

<style>
.thread-page { display:flex; flex-direction:column; height:calc(100vh - 40px); padding-bottom:0; max-width:700px; }
.thread-header { display:flex; align-items:center; gap:14px; padding-bottom:16px; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
.thread-title { font-size:1rem; font-weight:600; color:#f1f5f9; }

.thread-messages { flex:1; overflow-y:auto; padding:20px 0; display:flex; flex-direction:column; gap:10px; }
.thread-empty { color:#475569; text-align:center; padding:40px 0; font-size:0.88rem; }

.msg-row { display:flex; }
.msg-row.mine { justify-content:flex-end; }

.msg-bubble { max-width:72%; padding:10px 14px; font-size:0.88rem; line-height:1.5; color:#e2e8f0; position:relative;
	background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1));
	clip-path:polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%);
	border-left:2px solid rgba(0,180,255,0.2);
}
.msg-bubble.mine {
	background:linear-gradient(160deg,rgba(0,60,120,0.7),rgba(0,30,80,0.85));
	border-left:none; border-right:2px solid rgba(0,180,255,0.5);
	clip-path:polygon(0% 0%,calc(100% - 8px) 0%,100% 100%,8px 100%);
}
.msg-time { display:block; font-size:0.62rem; color:#475569; margin-top:4px; text-align:right; }

.thread-input-row { display:flex; gap:8px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0; padding-bottom:16px; }
.thread-input { flex:1; }
.thread-send { display:flex; align-items:center; justify-content:center; width:42px; flex-shrink:0; }
</style>
