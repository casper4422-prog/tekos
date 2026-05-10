import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	const userId = parseInt(params.id);
	const rows = await db.creature.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
	return json(rows.map(r => ({ ...r.data as object, id: r.id })));
};
