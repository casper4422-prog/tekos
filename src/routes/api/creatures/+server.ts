import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const rows = await db.creature.findMany({
		where: { userId: locals.user.id },
		orderBy: { createdAt: 'desc' }
	});
	return json(rows.map(r => ({ ...r.data as object, id: r.id, createdAt: r.createdAt })));
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const data = await request.json();
	const creature = await db.creature.create({ data: { userId: locals.user.id, data } });
	return json({ ...data, id: creature.id, createdAt: creature.createdAt }, { status: 201 });
};
