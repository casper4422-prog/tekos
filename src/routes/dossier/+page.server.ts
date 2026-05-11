import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { profile:null, creatures:[], friendCount:0, tribe:null, bossRecords:[], bossWins:0, recentTrades:[] };
	}
	const userId = locals.user.id;

	const [user, creatureRows, friendCount, membership, bossRecords, recentTrades] = await Promise.all([
		db.user.findUnique({
			where: { id: userId },
			select: { id:true, email:true, nickname:true, discordName:true, bio:true, lookingFor:true, createdAt:true }
		}),
		db.creature.findMany({ where: { userId }, select: { id:true, data:true } }),
		db.friendship.count({ where: { OR: [{ userId, status:'accepted' }, { friendUserId:userId, status:'accepted' }] } }),
		db.tribeMembership.findFirst({ where: { userId }, include: { tribe: { select: { id:true, name:true, mainMap:true } } } }),
		db.bossRecord.findMany({ where: { userId }, orderBy: { createdAt:'desc' }, take: 6 }),
		db.trade.findMany({ where: { userId }, orderBy: { createdAt:'desc' }, take: 4, select: { id:true, creatureData:true, status:true, wanted:true, _count:{ select:{ offers:true } } } })
	]);

	const creatures = creatureRows.map(r => ({ ...r.data as Record<string,unknown>, id: r.id }));
	const speciesOwned = new Set(creatures.map(c => String((c as Record<string,unknown>).species ?? ''))).size;
	const totalMuts = creatures.reduce((sum, c) => {
		const m = ((c as Record<string,unknown>).mutations as Record<string,number>) ?? {};
		return sum + Object.values(m).reduce((a,b) => a+b, 0);
	}, 0);
	const wins = bossRecords.filter(r => r.outcome === 'success').length;

	return {
		profile: user,
		creatures,
		friendCount,
		speciesOwned,
		totalMuts,
		tribe: membership?.tribe ?? null,
		bossRecords,
		bossWins: wins,
		recentTrades: recentTrades.map(t => ({ ...t, offerCount: t._count.offers }))
	};
};
