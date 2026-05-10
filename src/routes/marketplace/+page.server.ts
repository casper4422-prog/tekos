import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [trades, myTrades, offers, creatures, wishlist, networkWishlists] = await Promise.all([
		db.trade.findMany({ where: { status:'open', userId:{ not:uid } }, orderBy:{ createdAt:'desc' }, include:{ user:{ select:{ id:true, nickname:true, email:true } } } }),
		db.trade.findMany({ where: { userId:uid }, orderBy:{ createdAt:'desc' }, include:{ _count:{ select:{ offers:true } } } }),
		db.offer.findMany({ where:{ toUserId:uid, status:'pending' }, include:{ fromUser:{ select:{ id:true, nickname:true, email:true } }, trade:true } }),
		db.creature.findMany({ where:{ userId:uid }, select:{ id:true, data:true } }),
		db.wishlist.findMany({ where:{ userId:uid }, orderBy:{ createdAt:'desc' } }),
		// Other people's wishlists with whether we have matching specimens
		db.wishlist.findMany({
			where: { userId:{ not:uid } },
			orderBy: { createdAt:'desc' },
			take: 100,
			include: { user: { select:{ id:true, nickname:true, email:true } } }
		})
	]);

	const mySpecies = new Set(creatures.map(c => String((c.data as Record<string,unknown>).species ?? '')));

	return {
		trades,
		myTrades: myTrades.map(t => ({ ...t, offerCount: t._count.offers })),
		offers,
		myCreatures: creatures.map(c => ({ ...c.data as object, id: c.id })),
		wishlist,
		networkWishlists: networkWishlists.map(w => ({ ...w, iHaveIt: mySpecies.has(w.species) }))
	};
};
