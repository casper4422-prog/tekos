import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';

export const PUT: RequestHandler = async ({ params, locals }) => {
	await db.notification.updateMany({ where: { id: parseInt(params.id), userId: locals.user!.id }, data: { read: true } });
	return json({ ok: true });
};
