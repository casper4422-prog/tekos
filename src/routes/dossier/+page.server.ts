import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	// Guest mode — return empty shell, page handles everything client-side via localStorage
	if (!locals.user) {
		return {
			profile:null, creatures:[], pinned:[], friendCount:0,
			speciesOwned:0, topSpecies:[], tribe:null,
			bossRecords:[], bossWins:0, bossLosses:0,
			recentTrades:[], offersSent:0
		};
	}

	const userId = locals.user.id;

	const [user, creatureRows, friendCount, membership, bossRecords, recentTrades] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id:true, email:true, nickname:true, discordName:true, bio:true, lookingFor:true, pinnedCreatures:true, createdAt:true }
		}),
		db.creature.findMany({ where: { userId }, select: { id:true, data:true } }),
		db.friendship.count({ where: { OR: [{ userId, status:'accepted' }, { friendUserId:userId, status:'accepted' }] } }),
		db.tribeMembership.findFirst({ where: { userId }, include: { tribe: { select: { id:true, name:true, mainMap:true } } } }),
		db.bossRecord.findMany({ where: { userId }, orderBy: { createdAt:'desc' }, take: 5 }),
		db.trade.findMany({ where: { userId }, orderBy: { createdAt:'desc' }, take: 5, select: { id:true, creatureData:true, status:true, wanted:true, createdAt:true, _count:{ select:{ offers:true } } } })
	]);

	const creatures = creatureRows.map(r => ({ ...r.data as Record<string,unknown>, id: r.id }));
	const pinnedIds = Array.isArray(user?.pinnedCreatures) ? user.pinnedCreatures as number[] : [];
	const pinned = pinnedIds.map(id => creatures.find(c => (c as Record<string,unknown>).id === id)).filter(Boolean);

	const speciesMap: Record<string, number> = {};
	for (const c of creatures) {
		const sp = String((c as Record<string,unknown>).species ?? '');
		if (sp) speciesMap[sp] = (speciesMap[sp] ?? 0) + 1;
	}
	const topSpecies = Object.entries(speciesMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
	const wins = bossRecords.filter(r => r.outcome === 'success').length;
	const losses = bossRecords.filter(r => r.outcome !== 'success').length;

	return {
		profile: user,
		creatures,
		pinned,
		friendCount,
		speciesOwned: Object.keys(speciesMap).length,
		topSpecies,
		tribe: membership?.tribe ?? null,
		bossRecords,
		bossWins: wins,
		bossLosses: losses,
		recentTrades: recentTrades.map(t => ({ ...t, offerCount: t._count.offers })),
		offersSent: 0
	};
};
