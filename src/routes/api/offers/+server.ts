import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	const uid = locals.user!.id;
	const offers = await db.offer.findMany({
		where: { OR: [{ fromUserId: uid }, { toUserId: uid }] },
		orderBy: { createdAt: 'desc' },
		include: {
			trade: { include: { user: { select: { nickname:true, email:true } } } },
			fromUser: { select: { id:true, nickname:true, email:true } }
		}
	});
	return json(offers);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { offerId, action } = await request.json();
	const offer = await db.offer.findFirst({ where: { id: offerId, toUserId: uid } });
	if (!offer) return json({ error: 'Not found' }, { status: 404 });
	await db.offer.update({ where: { id: offerId }, data: { status: action === 'accept' ? 'accepted' : 'rejected' } });
	if (action === 'accept') await db.trade.update({ where: { id: offer.tradeId }, data: { status: 'closed' } });
	return json({ ok: true });
};
