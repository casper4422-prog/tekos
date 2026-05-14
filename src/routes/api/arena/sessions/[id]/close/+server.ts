import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { requireUser } from '$lib/auth';
import { intParam } from '$lib/params';

export const PUT: RequestHandler = async ({ params, locals }) => {
	const id = intParam(params.id);
	const session = await db.arenaSession.findFirst({ where: { id, creatorUserId: requireUser(locals).id } });
	if (!session) return json({ error: 'Unauthorized' }, { status: 403 });
	await db.arenaSession.update({ where: { id }, data: { status: 'closed' } });
	return json({ ok: true });
};
