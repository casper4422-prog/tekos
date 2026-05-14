import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const GET: RequestHandler = async ({ params }) => {
	const trade = await db.trade.findUnique({
		where: { id: intParam(params.id) },
		include: {
			user: { select: { id:true, nickname:true } },
			offers: { include: { fromUser: { select: { id:true, nickname:true } } }, orderBy: { createdAt: 'desc' } }
		}
	});
	if (!trade) return json({ error: 'Not found' }, { status: 404 });
	return json(trade);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const uid = requireUser(locals).id;
	const id = intParam(params.id);
	const trade = await db.trade.findFirst({ where: { id, userId: uid } });
	if (!trade) return json({ error: 'Not found' }, { status: 404 });
	await db.trade.delete({ where: { id } });
	return json({ ok: true });
};
