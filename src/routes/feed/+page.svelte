<script lang="ts">
	import { Dna, Repeat2, Sword, UserPlus, Shield } from 'lucide-svelte';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	type Event = {
		id: number;
		type: string;
		data: Record<string,unknown>;
		createdAt: string;
		user: { id:number; nickname:string|null; email:string };
	};

	const events = data.events as Event[];

	const TYPE_CONFIG: Record<string, { label:string; icon: typeof Dna; color:string }> = {
		creature_add: { label:'added a new specimen',   icon: Dna,      color:'34,197,94'  },
		trade_list:   { label:'listed a specimen',      icon: Repeat2,  color:'59,130,246' },
		boss_fight:   { label:'completed a boss fight', icon: Sword,    color:'239,68,68'  },
		friend_add:   { label:'made a new connection',  icon: UserPlus, color:'139,92,246' },
		tribe_join:   { label:'joined a tribe',         icon: Shield,   color:'245,158,11' },
	};

	function display(u: { nickname?:string|null; email?:string }) { return u.nickname ?? u.email ?? 'Unknown'; }

	function ago(dt: string): string {
		const diff = Date.now() - new Date(dt).getTime();
		const m = Math.floor(diff/60000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m/60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h/24);
		return d === 1 ? 'yesterday' : `${d}d ago`;
	}

	function getConfig(type: string) {
		return TYPE_CONFIG[type] ?? { label: type.replace(/_/g,' '), icon: Dna, color: '0,180,255' };
	}

	function getDetail(e: Event): string {
		const d = e.data;
		if (e.type === 'creature_add') return `${String(d.species ?? '?')} — ${String(d.name ?? 'Unnamed')} (Lvl ${Number(d.level ?? 1)})`;
		if (e.type === 'trade_list')   return `${String(d.species ?? '?')} — ${String(d.name ?? 'Unnamed')}`;
		if (e.type === 'boss_fight')   return `${String(d.bossName ?? '?')} · ${String(d.difficulty ?? '?')} · ${String(d.outcome ?? '?')}`;
		if (e.type === 'tribe_join')   return String(d.tribeName ?? '');
		return '';
	}
</script>

<div class="std-page">
	<div class="std-page-header">
		<div class="page-title">
			<h1>Activity Feed</h1>
			<div class="page-subtitle">What your network has been up to</div>
		</div>
	</div>

	{#if events.length === 0}
		<div class="feed-empty">
			No activity yet. Add friends from the Network page to see their activity here.
		</div>
	{:else}
		<div class="feed-list">
			{#each events as e}
				{@const cfg = getConfig(e.type)}
				{@const detail = getDetail(e)}
				<div class="cham-shell feed-event" style="--cut:7px;--cat-rgb:{cfg.color}">
					<div class="feed-event-inner">
						<div class="feed-icon" style="--cat-rgb:{cfg.color}">
							<cfg.icon size={15} />
						</div>
						<div class="feed-content">
							<div class="feed-text">
								<a href="/survivors/{e.user.id}" class="feed-name">{display(e.user)}</a>
								<span class="feed-action"> {cfg.label}</span>
							</div>
							{#if detail}
								<div class="feed-detail">{detail}</div>
							{/if}
						</div>
						<div class="feed-time">{ago(e.createdAt)}</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
.feed-empty { color:#475569; padding:48px 0; text-align:center; font-size:0.88rem; max-width:480px; line-height:1.6; }
.feed-list { display:flex; flex-direction:column; gap:5px; max-width:680px; }
.feed-event { }
.feed-event-inner { background:linear-gradient(160deg,rgba(10,18,40,0.97),rgba(4,8,20,1)); padding:12px 15px; display:flex; align-items:flex-start; gap:12px; }
.feed-icon { width:32px; height:32px; border-radius:50%; background:rgba(var(--cat-rgb,0,180,255),0.1); border:1px solid rgba(var(--cat-rgb,0,180,255),0.25); display:flex; align-items:center; justify-content:center; color:rgb(var(--cat-rgb,0,180,255)); flex-shrink:0; margin-top:1px; }
.feed-content { flex:1; min-width:0; }
.feed-text { font-size:0.86rem; line-height:1.4; color:#94a3b8; }
.feed-name { color:#f1f5f9; font-weight:600; text-decoration:none; }
.feed-name:hover { color:#00b4ff; }
.feed-action { color:#64748b; }
.feed-detail { font-size:0.78rem; color:#475569; margin-top:3px; font-style:italic; }
.feed-time { font-size:0.68rem; color:#334155; white-space:nowrap; flex-shrink:0; margin-top:2px; }
</style>
