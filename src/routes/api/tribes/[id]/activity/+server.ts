import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// List recent tribal activity. Any tribe member can read.
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const uid = locals.user!.id;
	const tribeId = parseInt(params.id);

	const member = await db.tribeMembership.findFirst({ where: { tribeId, userId: uid } });
	if (!member) return json({ error: 'Not in tribe' }, { status: 403 });

	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '30'), 100);
	const events = await db.tribalActivity.findMany({
		where: { tribeId },
		orderBy: { createdAt: 'desc' },
		take: limit,
		include: { user: { select: { id: true, nickname: true, email: true } } }
	});
	return json(events);
};
