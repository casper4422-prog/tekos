import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const PUT: RequestHandler = async ({ params, locals }) => {
	const id = parseInt(params.id);
	const session = await db.arenaSession.findFirst({ where: { id, creatorUserId: locals.user!.id } });
	if (!session) return json({ error: 'Unauthorized' }, { status: 403 });
	await db.arenaSession.update({ where: { id }, data: { status: 'closed' } });
	return json({ ok: true });
};
