import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

// DELETE /api/creatures/all — wipe every creature owned by the signed-in survivor
export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const result = await db.creature.deleteMany({ where: { userId: locals.user.id } });
	return json({ ok: true, deleted: result.count });
};
