import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { notify } from '$lib/notify';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const uid = locals.user!.id;
	const tradeId = parseInt(params.id);
	const trade = await db.trade.findUnique({ where: { id: tradeId } });
	if (!trade || trade.status !== 'open') return json({ error: 'Trade not available' }, { status: 400 });
	if (trade.userId === uid) return json({ error: 'Cannot offer on your own trade' }, { status: 400 });
	const { offeredCreatureId, offeredCreatureData, offeredPrice, message } = await request.json();
	const offer = await db.offer.create({ data: { tradeId, fromUserId: uid, toUserId: trade.userId, offeredCreatureId: offeredCreatureId ?? null, offeredCreatureData: offeredCreatureData ?? null, offeredPrice: offeredPrice ?? null, message: message ?? null } });
	const me = await db.user.findUnique({ where: { id: uid }, select: { nickname:true, email:true } });
	const cd = (offeredCreatureData ?? {}) as Record<string,unknown>;
	await notify(trade.userId, uid, 'trade_offer', { fromName: me?.nickname ?? me?.email, species: String(cd.species ?? '?'), message });
	return json(offer, { status: 201 });
};
