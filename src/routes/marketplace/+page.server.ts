import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [trades, myTrades, completed, offers, creatures, wishlist, networkWishlists] = await Promise.all([
		db.trade.findMany({ where: { status:'open', userId:{ not:uid } }, orderBy:{ createdAt:'desc' }, include:{ user:{ select:{ id:true, nickname:true, email:true } } } }),
		db.trade.findMany({ where: { userId:uid }, orderBy:{ createdAt:'desc' }, include:{ _count:{ select:{ offers:true } } } }),
		db.trade.findMany({ where: { status:'completed' }, orderBy:{ createdAt:'desc' }, take: 30, include:{ user:{ select:{ id:true, nickname:true, email:true } } } }),
		db.offer.findMany({ where:{ toUserId:uid, status:'pending' }, include:{ fromUser:{ select:{ id:true, nickname:true, email:true } }, trade:true } }),
		db.creature.findMany({ where:{ userId:uid }, select:{ id:true, data:true } }),
		db.wishlist.findMany({ where:{ userId:uid }, orderBy:{ createdAt:'desc' } }),
		db.wishlist.findMany({
			where: { userId:{ not:uid } },
			orderBy: { createdAt:'desc' },
			take: 100,
			include: { user: { select:{ id:true, nickname:true, email:true } } }
		})
	]);

	// Aggregate seller ratings for every seller appearing in open or completed trades.
	const sellerIds = Array.from(new Set([...trades, ...completed].map(t => t.userId)));
	const ratings = sellerIds.length
		? await db.tradeRating.groupBy({
			by: ['ratedUserId'],
			where: { ratedUserId: { in: sellerIds } },
			_avg: { rating: true },
			_count: { rating: true }
		})
		: [];
	const sellerRatings: Record<number, { avg: number; count: number }> = {};
	for (const r of ratings) sellerRatings[r.ratedUserId] = { avg: r._avg.rating ?? 0, count: r._count.rating };

	const mySpecies = new Set(creatures.map(c => String((c.data as Record<string,unknown>).species ?? '')));

	return {
		trades,
		myTrades: myTrades.map(t => ({ ...t, offerCount: t._count.offers })),
		completed,
		offers,
		myCreatures: creatures.map(c => ({ ...c.data as object, id: c.id })),
		wishlist,
		networkWishlists: networkWishlists.map(w => ({ ...w, iHaveIt: mySpecies.has(w.species) })),
		sellerRatings
	};
};
