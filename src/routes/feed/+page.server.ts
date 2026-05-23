import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

type Json = Record<string, unknown>;

function pickServers(pinned: unknown): Json[] {
	if (!pinned || typeof pinned !== 'object' || Array.isArray(pinned)) return [];
	const raw = (pinned as Json).servers;
	return Array.isArray(raw) ? (raw as Json[]) : [];
}

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const uid = locals.user!.id;

	const friendships = await db.friendship.findMany({
		where: { OR: [{ userId: uid, status: 'accepted' }, { friendUserId: uid, status: 'accepted' }] }
	});
	const friendIds = friendships.map(f => f.userId === uid ? f.friendUserId : f.userId);
	const networkIds = [...new Set([uid, ...friendIds])];

	// Tribe membership → tribeMate ids
	const myMemberships = await db.tribeMembership.findMany({ where: { userId: uid }, select: { tribeId: true } });
	const myTribeIds = myMemberships.map(m => m.tribeId);
	const tribeMates = myTribeIds.length
		? await db.tribeMembership.findMany({ where: { tribeId: { in: myTribeIds } }, select: { userId: true } })
		: [];
	const tribeMateIds = [...new Set(tribeMates.map(m => m.userId))];

	// User's joined servers — Settings stores them under settings.cluster.servers.
	// Fall back to legacy pinnedCreatures.servers for accounts that pre-date the move.
	const me = await db.user.findUnique({
		where: { id: uid },
		select: { settings: true, pinnedCreatures: true }
	});
	const settingsObj = (me?.settings && typeof me.settings === 'object' && !Array.isArray(me.settings))
		? (me.settings as Record<string, unknown>)
		: {};
	const clusterObj = (settingsObj.cluster && typeof settingsObj.cluster === 'object' && !Array.isArray(settingsObj.cluster))
		? (settingsObj.cluster as Record<string, unknown>)
		: {};
	const clusterServers = Array.isArray(clusterObj.servers) ? (clusterObj.servers as Json[]) : [];
	const joinedServers = clusterServers.length > 0 ? clusterServers : pickServers(me?.pinnedCreatures);
	// derive a primary serverCode (first server) for scope=server filtering
	const myServerCode = (joinedServers[0]?.code ?? joinedServers[0]?.name ?? null) as string | null;

	// since timestamp for "today"
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	// Load network events (for All/Following/Tribe/Server) AND a wider global pool
	// (for the Global tab). Merge & dedup client-side via id.
	const [networkEvents, globalEvents, networkBossRecords, globalBossRecords, networkTrades, globalTrades, eventsTodayCount, survivorsActive] = await Promise.all([
		db.activityEvent.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 60,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.activityEvent.findMany({
			orderBy: { createdAt: 'desc' },
			take: 60,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.bossRecord.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 20,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.bossRecord.findMany({
			orderBy: { createdAt: 'desc' },
			take: 20,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.trade.findMany({
			where: { userId: { in: networkIds }, status: 'open' },
			orderBy: { createdAt: 'desc' },
			take: 15,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.trade.findMany({
			where: { status: 'open' },
			orderBy: { createdAt: 'desc' },
			take: 15,
			include: { user: { select: { id: true, nickname: true, discordName: true } } }
		}),
		db.activityEvent.count({ where: { createdAt: { gte: startOfToday } } }),
		db.user.count({ where: { lastSeen: { gte: startOfToday } } })
	]);

	// Merge & dedup by id, keep network rows first (they may have richer fields in future)
	const eventById = new Map<number, typeof networkEvents[number]>();
	for (const e of networkEvents) eventById.set(e.id, e);
	for (const e of globalEvents)  if (!eventById.has(e.id)) eventById.set(e.id, e);
	const events = [...eventById.values()];

	const bossById = new Map<number, typeof networkBossRecords[number]>();
	for (const b of networkBossRecords) bossById.set(b.id, b);
	for (const b of globalBossRecords)  if (!bossById.has(b.id)) bossById.set(b.id, b);
	const bossRecords = [...bossById.values()];

	const tradeById = new Map<number, typeof networkTrades[number]>();
	for (const t of networkTrades) tradeById.set(t.id, t);
	for (const t of globalTrades)  if (!tradeById.has(t.id)) tradeById.set(t.id, t);
	const recentTrades = [...tradeById.values()];

	// News items (ark-news endpoint returns []-shaped JSON; tolerate failure)
	let newsItems: Json[] = [];
	try {
		const r = await fetch('/api/ark-news');
		if (r.ok) {
			const data = await r.json();
			if (Array.isArray(data)) newsItems = data as Json[];
		}
	} catch { /* empty */ }

	// YouTube items — endpoint requires a ?url=, so loop over saved feedSources of type 'youtube'
	const rawPinned = (me?.pinnedCreatures ?? {}) as Json;
	const feedSources = Array.isArray((rawPinned as Json).feedSources)
		? ((rawPinned as Json).feedSources as Json[])
		: [];
	const ytSources = feedSources.filter(s => s.type === 'youtube' && typeof s.url === 'string');
	let youtubeItems: Json[] = [];
	for (const src of ytSources.slice(0, 4)) {
		try {
			const r = await fetch(`/api/youtube-feed?url=${encodeURIComponent(String(src.url))}`);
			if (!r.ok) continue;
			const data = await r.json();
			const vids = Array.isArray((data as Json).videos) ? ((data as Json).videos as Json[]) : [];
			for (const v of vids) youtubeItems.push({ ...v, channelName: (data as Json).channelName ?? src.label ?? '' });
		} catch { /* skip */ }
	}

	// Steam items — single API hit (ASA app feed). If the user has ANY steam
	// source saved, we fetch the Steam News feed once and surface it. v1
	// ignores the actual URL; v2 can parse appids / group ids per source.
	const hasSteamSource = feedSources.some(s => s.type === 'steam');
	let steamItems: Json[] = [];
	if (hasSteamSource) {
		try {
			const r = await fetch('/api/steam-feed');
			if (r.ok) {
				const data = await r.json();
				if (Array.isArray((data as Json).items)) steamItems = (data as Json).items as Json[];
			}
		} catch { /* skip */ }
	}

	return {
		events,
		bossRecords,
		recentTrades,
		friendCount: friendIds.length,
		friendIds,
		tribeMateIds,
		joinedServers,
		myServerCode,
		myUserId: uid,
		feedSources,
		eventsToday: eventsTodayCount,
		survivorsActive,
		newsItems,
		youtubeItems,
		steamItems
	};
};
