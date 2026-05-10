import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ url }) => {
	const mine = url.searchParams.get('mine');
	const where = mine ? { userId: parseInt(mine), status: 'open' } : { status: 'open' };
	const trades = await db.trade.findMany({
		where, orderBy: { createdAt: 'desc' },
		include: { user: { select: { id:true, nickname:true, email:true } } }
	});
	return json(trades);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const uid = locals.user!.id;
	const { creatureId, creatureData, wanted, price } = await request.json();
	const trade = await db.trade.create({ data: { userId: uid, creatureId: creatureId ?? null, creatureData: creatureData ?? null, wanted: wanted ?? null, price: price ?? null } });
	return json(trade, { status: 201 });
};
