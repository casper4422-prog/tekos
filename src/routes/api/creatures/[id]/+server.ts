import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { intParam } from '$lib/params';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = intParam(params.id);
	const existing = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const data = await request.json();
	await db.creature.update({ where: { id }, data: { data } });
	return json({ ...data, id });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = intParam(params.id);
	const existing = await db.creature.findFirst({ where: { id, userId: locals.user.id } });
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.creature.delete({ where: { id } });
	return json({ ok: true });
};
