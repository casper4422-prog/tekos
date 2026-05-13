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

	// User's joined servers (stored under pinnedCreatures.servers as { id, name, map, cluster? })
	const me = await db.user.findUnique({ where: { id: uid }, select: { pinnedCreatures: true } });
	const joinedServers = pickServers(me?.pinnedCreatures);
	// derive a primary serverCode (first server) for scope=server filtering
	const myServerCode = (joinedServers[0]?.code ?? joinedServers[0]?.name ?? null) as string | null;

	// since timestamp for "today"
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);

	const [events, bossRecords, recentTrades, eventsTodayCount, survivorsActive] = await Promise.all([
		db.activityEvent.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 60,
			include: { user: { select: { id: true, nickname: true, email: true } } }
		}),
		db.bossRecord.findMany({
			where: { userId: { in: networkIds } },
			orderBy: { createdAt: 'desc' },
			take: 20,
			include: { user: { select: { id: true, nickname: true, email: true } } }
		}),
		db.trade.findMany({
			where: { userId: { in: networkIds }, status: 'open' },
			orderBy: { createdAt: 'desc' },
			take: 15,
			include: { user: { select: { id: true, nickname: true, email: true } } }
		}),
		db.activityEvent.count({ where: { createdAt: { gte: startOfToday } } }),
		db.user.count({ where: { lastSeen: { gte: startOfToday } } })
	]);

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

	return {
		events,
		bossRecords,
		recentTrades,
		friendCount: friendIds.length,
		friendIds,
		tribeMateIds,
		joinedServers,
		myServerCode,
		eventsToday: eventsTodayCount,
		survivorsActive,
		newsItems,
		youtubeItems
	};
};
