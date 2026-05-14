import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';
import { requireUser } from '$lib/auth';

export const GET: RequestHandler = async ({ locals }) => {
	const uid = requireUser(locals).id;
	const offers = await db.offer.findMany({
		where: { OR: [{ fromUserId: uid }, { toUserId: uid }] },
		orderBy: { createdAt: 'desc' },
		include: {
			trade: { include: { user: { select: { nickname:true } } } },
			fromUser: { select: { id:true, nickname:true } }
		}
	});
	return json(offers);
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const uid = requireUser(locals).id;
	const { offerId, action } = await request.json();
	const offer = await db.offer.findFirst({ where: { id: offerId, toUserId: uid } });
	if (!offer) return json({ error: 'Not found' }, { status: 404 });
	await db.offer.update({ where: { id: offerId }, data: { status: action === 'accept' ? 'accepted' : 'rejected' } });
	if (action === 'accept') {
		await db.trade.update({ where: { id: offer.tradeId }, data: { status: 'closed' } });
		const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
		await notify(offer.fromUserId, uid, 'offer_accepted', { acceptedBy: me?.nickname ?? me?.discordName ?? 'Unknown survivor' });
	} else {
		const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, discordName:true } });
		await notify(offer.fromUserId, uid, 'offer_rejected', { rejectedBy: me?.nickname ?? me?.discordName ?? 'Unknown survivor' });
	}
	return json({ ok: true });
};
