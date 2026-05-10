import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load: PageServerLoad = async ({ locals }) => {
	const uid = locals.user!.id;
	const [trades, myTrades, offers, creatures] = await Promise.all([
		db.trade.findMany({ where: { status:'open', userId:{ not:uid } }, orderBy:{ createdAt:'desc' }, include:{ user:{ select:{ id:true, nickname:true, email:true } } } }),
		db.trade.findMany({ where: { userId:uid }, orderBy:{ createdAt:'desc' }, include:{ _count:{ select:{ offers:true } } } }),
		db.offer.findMany({ where:{ toUserId:uid, status:'pending' }, include:{ fromUser:{ select:{ nickname:true, email:true } }, trade:true } }),
		db.creature.findMany({ where:{ userId:uid }, select:{ id:true, data:true } })
	]);
	return {
		trades,
		myTrades: myTrades.map(t => ({ ...t, offerCount: t._count.offers })),
		offers,
		myCreatures: creatures.map(c => ({ ...c.data as object, id: c.id }))
	};
};
