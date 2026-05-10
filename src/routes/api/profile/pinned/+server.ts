import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const { ids } = await request.json();
	if (!Array.isArray(ids)) return json({ error: 'ids must be an array' }, { status: 400 });
	const pinnedCreatures = ids.slice(0, 6).map(Number).filter(n => !isNaN(n));
	await db.user.update({ where: { id: locals.user.id }, data: { pinnedCreatures } });
	return json({ ok: true, pinnedCreatures });
};
