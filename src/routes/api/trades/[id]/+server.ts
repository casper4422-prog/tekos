import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	const trade = await db.trade.findUnique({
		where: { id: parseInt(params.id) },
		include: {
			user: { select: { id:true, nickname:true, email:true } },
			offers: { include: { fromUser: { select: { id:true, nickname:true, email:true } } }, orderBy: { createdAt: 'desc' } }
		}
	});
	if (!trade) return json({ error: 'Not found' }, { status: 404 });
	return json(trade);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = locals.user!.id;
	const trade = await db.trade.findFirst({ where: { id: parseInt(params.id), userId: uid } });
	if (!trade) return json({ error: 'Not found' }, { status: 404 });
	await db.trade.delete({ where: { id: parseInt(params.id) } });
	return json({ ok: true });
};
