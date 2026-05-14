import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { intParam } from '$lib/params';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = intParam(params.id);
	const rows = await db.creature.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
	return json(rows.map(r => ({ ...r.data as object, id: r.id })));
};
